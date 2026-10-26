// app/api/children/[id]/invite/answer/route.ts
// Drug odgovara na karticu poziva: „Prihvati” ili „Ne sada”. `[id]` je drug (gost) — pristup
// traži sesiju baš tog deteta ili njegovog roditelja (requireChildAccess).
//
// POST { key, accept: true }  → ulazi u igru sa drugom: { channel, friend, game, level[, mode] }
//                               (isti odgovor kao stari ulazak kodom); deca se pamte jedno drugom
//                               kao „drugovi” (lib/playFriends.ts) za sledeći put.
// POST { key, accept: false } → { ok: true }; domaćin mirno vidi „Amar sada ne može”.
// Odgovara samo dete kome je poziv namenjen, samo dok poziv važi, i samo jednom.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { inviteStatus, isRequestKey, parseStoredInvite, type StoredInvite } from "@/lib/invite";
import { takeAttempts } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";
import { notifyInbox } from "../../../../_lib/inbox";
import {
    ANSWER_RULE,
    INVITE_GAME_LOCKED,
    INVITE_LIMITED,
    REQUEST_GONE,
    companionOf,
    firstNameOf,
    gameOpenFor,
    joinedAnswer,
    loadInviteRow,
    newDuel,
    rememberPair,
    updateInvite,
    type InviteRow,
} from "../../../../_lib/invites";
import { enforceRateLimit, errorResponse, HttpError, parseIdParam, readJsonObject } from "../../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

const NO_STORE = { "Cache-Control": "no-store" };

/** Poziv bez zahteva (ono što ostaje posle odgovora). */
function withoutRequest(invite: StoredInvite): StoredInvite {
    const { request: _request, ...rest } = invite;
    void _request;
    return rest;
}

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const guestId = parseIdParam((await params).id);
        await requireChildAccess(guestId);
        enforceRateLimit(takeAttempts([{ key: `invite-answer:child:${guestId}`, rule: ANSWER_RULE }]), INVITE_LIMITED);

        const body = await readJsonObject(request);
        if (typeof body.accept !== "boolean") throw new HttpError(400, "Neispravan zahtev");
        const accept = body.accept;
        const key = body.key;
        if (!isRequestKey(key)) throw new HttpError(404, REQUEST_GONE);

        const { data, error } = await supabaseAdmin.from("children").select("id, first_name, gender, date_of_birth, settings").eq("settings->invite->request->>key", key).limit(2);
        if (error) throw error;
        const now = Date.now();
        const hosts = ((data ?? []) as InviteRow[]).filter((row) => {
            const invite = parseStoredInvite((row.settings as Record<string, unknown> | null)?.invite);
            return invite?.request?.key === key && invite.request.guestId === guestId && inviteStatus(invite, now) === "asking";
        });
        if (hosts.length !== 1 || hosts[0].id === guestId) throw new HttpError(404, REQUEST_GONE);
        const hostId = hosts[0].id;

        const guestRow = await loadInviteRow(guestId);
        const guest = { firstName: firstNameOf(guestRow), companion: companionOf(guestRow) };
        const at = new Date(now).toISOString();
        // Samo ako je poziv i dalje baš ovaj (domaćin nije odustao, niko nije odgovorio pre)
        const stillAsking = (current: StoredInvite | null): current is StoredInvite =>
            Boolean(current?.request && current.request.key === key && current.request.guestId === guestId && inviteStatus(current, now) === "asking");

        if (!accept) {
            await updateInvite(hostId, (_row, current) => {
                if (!stillAsking(current)) throw new HttpError(404, REQUEST_GONE);
                return { ...withoutRequest(current), code: null, declined: { ...guest, at } };
            });
            await notifyInbox(hostId, "answer");
            return NextResponse.json({ ok: true }, { headers: NO_STORE });
        }

        const pendingGame = parseStoredInvite((hosts[0].settings as Record<string, unknown> | null)?.invite)!.game;
        if (!(await gameOpenFor(guestRow, pendingGame))) throw new HttpError(409, INVITE_GAME_LOCKED);
        const result = await updateInvite(hostId, (row, current) => {
            if (!stillAsking(current)) throw new HttpError(404, REQUEST_GONE);
            // Dvoboj: server pravi zajedničko seme zadataka i ulog; ID druga ostaje samo na serveru
            const duel = current.mode === "versus" ? { duel: newDuel(row, guestRow) } : {};
            return { ...withoutRequest(current), code: null, guest, joinedAt: at, guestId, ...duel };
        });
        const joined = result.invite;
        if (!joined) throw new HttpError(404, REQUEST_GONE);
        await rememberPair(result.row, guestRow, now);
        await notifyInbox(hostId, "answer");
        return NextResponse.json(joinedAnswer(hostId, result.row, joined), { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "POST /api/children/[id]/invite/answer");
    }
}
