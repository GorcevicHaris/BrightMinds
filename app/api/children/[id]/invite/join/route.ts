// app/api/children/[id]/invite/join/route.ts
// „Uđi kod druga”: dete (gost) na SVOM uređaju unosi kod od četiri sličice. `[id]` je gost —
// pristup traži sesiju baš tog deteta ili njegovog roditelja (requireChildAccess), pa se
// ulazi samo u svoj profil, i to dok dečja sesija važi (promenjen tajni kod je gasi).
//
// POST { code, ask: true } → kartica poziva { request: { key, friend: { firstName, companion },
// game, level[, mode: "versus"] } }: drug PRE ulaska vidi ko ga zove, igru, nivo i način igre,
// a domaćin „Čekamo da Amar prihvati…”. Odgovor („Prihvati” / „Ne sada”) ide na /invite/answer.
// POST { code } (stari klijenti) → odmah ulazi: { channel, friend, game, level[, mode] }.
// Ništa više: bez ID-ja, prezimena, uzrasta i napretka domaćina. Kod je jednokratan (briše se
// pri unosu), važi 10 minuta, sopstveni poziv se ne prihvata, a pogađanje je ograničeno po
// adresi, po detetu i ukupno. Svaki neuspeh (nepoznat, istekao, iskorišćen kod) ima isti odgovor.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { inviteStatus, normalizeInviteCode, parseStoredInvite, type InviteRequest, type StoredInvite } from "@/lib/invite";
import { getClientIp, takeAttempts } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";
import {
    INVITE_GAME_LOCKED,
    INVITE_GONE,
    INVITE_LIMITED,
    INVITE_OWN,
    JOIN_GLOBAL_RULE,
    JOIN_RULE,
    clearIfExpired,
    companionOf,
    firstNameOf,
    gameOpenFor,
    isLoginPin,
    joinedAnswer,
    loadInviteRow,
    newChannelKey,
    newDuel,
    rememberPair,
    requestCard,
    updateInvite,
    writeInvite,
    type InviteRow,
} from "../../../../_lib/invites";
import { notifyInbox } from "../../../../_lib/inbox";
import { enforceRateLimit, errorResponse, HttpError, parseIdParam, readJsonObject } from "../../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const guestId = parseIdParam((await params).id);
        await requireChildAccess(guestId);

        // Pokušaj se rezerviše pre svakog čitanja baze; uspešan ulazak se ne broji
        const attempt = takeAttempts([
            { key: `invite-join:ip:${getClientIp(request)}`, rule: JOIN_RULE },
            { key: `invite-join:child:${guestId}`, rule: JOIN_RULE },
            { key: "invite-join:all", rule: JOIN_GLOBAL_RULE },
        ]);
        enforceRateLimit(attempt, INVITE_LIMITED);

        const body = await readJsonObject(request);
        const ask = body.ask === true;
        const code = normalizeInviteCode(body.code);
        if (!code) throw new HttpError(404, INVITE_GONE);

        const { data, error } = await supabaseAdmin.from("children").select("id, first_name, gender, date_of_birth, settings").eq("settings->invite->>code", code).limit(5);
        if (error) throw error;
        const now = Date.now();
        const waiting: { row: InviteRow; invite: StoredInvite }[] = [];
        for (const row of (data ?? []) as InviteRow[]) {
            const invite = parseStoredInvite((row.settings as Record<string, unknown> | null)?.invite);
            if (!invite || invite.code !== code) continue;
            if (inviteStatus(invite, now) === "waiting") waiting.push({ row, invite });
            else await clearIfExpired(row.id, row, invite, now);
        }
        // Isti kod u dva poziva (dva istovremena pravljenja) — ne pogađa se ko je ko: oba odbijena
        if (waiting.length !== 1) throw new HttpError(404, INVITE_GONE);
        const host = waiting[0];
        if (host.row.id === guestId) throw new HttpError(400, INVITE_OWN);

        // Kod koji je u međuvremenu postao nečiji tajni kod za prijavu ne sme dalje da se deli
        if (await isLoginPin(code)) {
            await writeInvite(host.row.id, host.row, host.invite, null).catch(() => false);
            throw new HttpError(404, INVITE_GONE);
        }

        const guestRow = await loadInviteRow(guestId);
        if (!(await gameOpenFor(guestRow, host.invite.game))) throw new HttpError(409, INVITE_GAME_LOCKED);
        const guest = { firstName: firstNameOf(guestRow), companion: companionOf(guestRow) };

        if (ask) {
            // Kartica poziva: kod se troši istim upisom kojim se beleži ko gleda poziv (samo ako je i dalje isti)
            const pending: InviteRequest = { key: newChannelKey(), guestId, ...guest, via: "code", at: new Date(now).toISOString() };
            const result = await updateInvite(host.row.id, (_row, current) => {
                if (!current || current.channelKey !== host.invite.channelKey || current.code !== code || inviteStatus(current, now) !== "waiting") {
                    throw new HttpError(404, INVITE_GONE);
                }
                return { ...current, code: null, request: pending };
            });
            if (!result.invite?.request) throw new HttpError(404, INVITE_GONE);
            attempt.refund();
            await notifyInbox(host.row.id, "answer");
            return NextResponse.json({ request: requestCard(result.row, result.invite, result.invite.request) }, { headers: { "Cache-Control": "no-store" } });
        }

        // Stari put: jednokratno, kod se briše istim upisom kojim se beleži drug (samo ako je i dalje isti)
        const joinedAt = new Date(now).toISOString();
        const result = await updateInvite(host.row.id, (row, current) => {
            if (!current || current.channelKey !== host.invite.channelKey || current.code !== code || inviteStatus(current, now) !== "waiting") {
                throw new HttpError(404, INVITE_GONE);
            }
            const duel = current.mode === "versus" ? { duel: newDuel(row, guestRow) } : {};
            return { ...current, code: null, guest, joinedAt, guestId, ...duel };
        });
        const joined = result.invite;
        if (!joined) throw new HttpError(404, INVITE_GONE);
        attempt.refund();
        await rememberPair(result.row, guestRow, now);

        return NextResponse.json(joinedAnswer(host.row.id, result.row, joined), { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        return errorResponse(error, "POST /api/children/[id]/invite/join");
    }
}
