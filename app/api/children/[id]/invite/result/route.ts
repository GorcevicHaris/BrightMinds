// app/api/children/[id]/invite/result/route.ts
// Rezultat partije dvoboja na dva uređaja i ulog (pravila: lib/duelStakes.ts). `[id]` je dete
// koje javlja (domaćin ili drug) — pristup traži sesiju baš tog deteta ili njegovog roditelja.
//
// POST { channel, level, round, format, mine: {correct,total,secs}, theirs: {…} }
//   Svaki uređaj javlja svoj rezultat i rezultat druga kako ga je video (preko kanala). Server
//   obračunava tek kad stignu oba izveštaja i kad se slažu oko pobednika; tada poražen daje
//   pobedniku ulog (manji od dva podešavanja, nikad više nego što ima). Partija (nivo + redni
//   broj u sesiji) se obračunava jednom: ponovljen zahtev samo vraća isti ishod, pa ga uređaj
//   koristi i za proveru („čekamo druga”). Prvi izveštaj uređaja važi (ne menja se posle).
//   Odbija se poziv koji ne postoji, nije prihvaćen, istekao je ili nije dvoboj.
// Odgovor: { status: "pending" | "disagree" | "settled", outcome?: "you" | "friend" | "tie",
//   amount?: broj novčića koji je preneo poražen, coins: novčići ovog deteta posle obračuna }.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { agreedOutcome, duelKey, parseDuelReport, settlementId, type DuelReport, type DuelRole } from "@/lib/duelStakes";
import { MAX_LEVEL } from "@/lib/games";
import { DUEL_KEYS_KEPT, inviteStatus, parseStoredInvite, type DuelSettled, type InviteDuel, type StoredInvite } from "@/lib/invite";
import { takeAttempts, type RateLimitRule } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";
import { DUEL_GONE, coinsOfRow, currentStake, loadDuelRow, transferDuelCoins } from "../../../../_lib/duels";
import { INVITE_LIMITED, channelOf, inviteOf, loadInviteRow, updateInvite, type InviteRow } from "../../../../_lib/invites";
import { enforceRateLimit, errorResponse, HttpError, parseIdParam, readJsonObject } from "../../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

const NO_STORE = { "Cache-Control": "no-store" };
/** Izveštaj i provera čekanja: najviše 120 za 10 minuta po detetu (uređaj proverava na par sekundi) */
const RESULT_RULE: RateLimitRule = { limit: 120, windowMs: 10 * 60 * 1000 };
const CHANNEL_PATTERN = /^bm-inv-[0-9a-f]{40}$/;

function trim<T>(record: Record<string, T>): Record<string, T> {
    return Object.fromEntries(Object.entries(record).slice(-DUEL_KEYS_KEPT));
}

/** Poziv u kome dete igra dvoboj na kanalu `channel`: kao domaćin (svoj poziv) ili kao drug */
async function findDuel(childId: number, channel: string): Promise<{ hostId: number; role: DuelRole } | null> {
    const own = await loadInviteRow(childId);
    const mine = inviteOf(own);
    if (mine && channelOf(childId, mine) === channel) return { hostId: childId, role: "host" };
    const { data, error } = await supabaseAdmin.from("children").select("id, settings").eq("settings->invite->>guestId", String(childId)).limit(5);
    if (error) throw error;
    for (const row of (data ?? []) as Pick<InviteRow, "id" | "settings">[]) {
        const invite = parseStoredInvite((row.settings as Record<string, unknown> | null)?.invite);
        if (invite && invite.guestId === childId && row.id !== childId && channelOf(row.id, invite) === channel) return { hostId: row.id, role: "guest" };
    }
    return null;
}

/** Poziv je dvoboj koji traje: prihvaćen, nije istekao, ima seme i zna se ko je drug */
function liveDuel(invite: StoredInvite | null, now: number): invite is StoredInvite & { duel: InviteDuel; guestId: number } {
    return Boolean(invite && invite.mode === "versus" && invite.duel && invite.guestId && inviteStatus(invite, now) === "joined");
}

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);
        enforceRateLimit(takeAttempts([{ key: `duel-result:child:${childId}`, rule: RESULT_RULE }]), INVITE_LIMITED);

        const body = await readJsonObject(request);
        const report = parseDuelReport(body, MAX_LEVEL);
        if (!report || typeof body.channel !== "string" || !CHANNEL_PATTERN.test(body.channel)) throw new HttpError(400, "Neispravan zahtev");

        const found = await findDuel(childId, body.channel);
        if (!found) throw new HttpError(404, DUEL_GONE);
        const { hostId, role } = found;
        const key = duelKey(report.level, report.round);
        const now = Date.now();

        // Izveštaj ide u poziv domaćina; ishod se beleži istim upisom kad se oba izveštaja slože
        let channelKey = "";
        const { invite } = await updateInvite(hostId, (_row, current) => {
            if (!liveDuel(current, now) || channelOf(hostId, current) !== body.channel) throw new HttpError(404, DUEL_GONE);
            channelKey = current.channelKey;
            const duel = current.duel;
            if (duel.settled[key]) return undefined;
            const reports = { ...duel.reports[key] };
            // Prvi izveštaj uređaja važi: posle se ne menja (ni kad drug javi svoj)
            if (reports[role]) return undefined;
            reports[role] = report as DuelReport;
            const outcome = agreedOutcome(reports.host, reports.guest);
            const settled: Record<string, DuelSettled> =
                outcome === "pending" || outcome === "disagree" ? duel.settled : { ...duel.settled, [key]: { o: outcome, amount: outcome === "tie" ? 0 : null } };
            return { ...current, duel: { ...duel, v: duel.v + 1, reports: trim({ ...duel.reports, [key]: reports }), settled: trim(settled) } };
        });
        if (!liveDuel(invite, now)) throw new HttpError(404, DUEL_GONE);

        let decision = invite.duel.settled[key];
        const reports = invite.duel.reports[key] ?? {};
        if (!decision) {
            const state = agreedOutcome(reports.host, reports.guest);
            const me = await loadDuelRow(childId);
            return NextResponse.json({ status: state === "disagree" ? "disagree" : "pending", coins: coinsOfRow(me) }, { headers: NO_STORE });
        }

        // Prenos (ili dovršavanje prenosa koji je prekinut): idempotentno, po oznaci partije
        if (decision.amount === null && decision.o !== "tie") {
            const [hostRow, guestRow] = await Promise.all([loadDuelRow(hostId), loadDuelRow(invite.guestId)]);
            const winnerId = decision.o === "host" ? hostId : invite.guestId;
            const loserId = decision.o === "host" ? invite.guestId : hostId;
            // Ulog sada: manji od dva podešavanja (roditelj ga je možda u međuvremenu promenio)
            const amount = await transferDuelCoins({ id: settlementId("r", channelKey, report.level, report.round), winnerId, loserId, stake: currentStake(hostRow, guestRow) });
            decision = { o: decision.o, amount };
            await updateInvite(hostId, (_row, current) => {
                if (!liveDuel(current, now) || current.channelKey !== channelKey) return undefined;
                const known = current.duel.settled[key];
                if (!known || known.amount !== null) return undefined;
                return { ...current, duel: { ...current.duel, v: current.duel.v + 1, settled: { ...current.duel.settled, [key]: { o: known.o, amount } } } };
            }).catch(() => undefined);
        }

        const me = await loadDuelRow(childId);
        const outcome = decision.o === "tie" ? "tie" : decision.o === role ? "you" : "friend";
        return NextResponse.json({ status: "settled", outcome, amount: decision.amount ?? 0, coins: coinsOfRow(me) }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "POST /api/children/[id]/invite/result");
    }
}
