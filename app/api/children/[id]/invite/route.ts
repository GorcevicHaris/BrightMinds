// app/api/children/[id]/invite/route.ts
// „Igraj sa drugom na drugom uređaju” — poziv deteta domaćina (model: lib/invite.ts).
// Sve tri radnje traže pristup detetu domaćinu (roditelj ili dečja sesija tog deteta koja i
// dalje važi — requireChildAccess).
// GET    — stanje poziva: čeka se drug (sa kodom), drug gleda karticu poziva („Čekamo da Amar
//          prihvati…”), drug je prihvatio (ime i drugar druga) ili ga nema. Odgovor „Ne sada” i
//          „nije tu” domaćin dobija jednom (`declined` / `missed`), pa se poziv briše.
// POST   — novi poziv za igru, nivo i način igre (`mode`: "together" ili "versus"; bez njega
//          „zajedno”, kao stari klijenti): kod od četiri sličice (važi 10 minuta) i tajni kanal.
//          Sa `friend` (ključ druga sa spiska „Drugovi”, lib/playFriends.ts) poziv bez koda ide
//          pravo tom drugu — samo ako se deca pamte jedno drugom (igrala su zajedno preko koda)
//          ili su braća i sestre na istom roditeljskom nalogu (isti skup kao /friends).
//          Stari poziv (ako postoji) prestaje da važi.
// DELETE — „Odustani” / „Završi igru sa drugom”: poziv se briše
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { MAX_LEVEL } from "@/lib/games";
import { INVITE_CODE_TTL_MS, inviteStatus, isRemoteGame, type StoredInvite } from "@/lib/invite";
import { hasPlayFriend } from "@/lib/playFriends";
import { getClientIp, takeAttempts } from "@/lib/rateLimit";
import { parsePlayMode } from "@/lib/versus";
import { notifyInbox } from "../../../_lib/inbox";
import {
    CREATE_IP_RULE,
    CREATE_RULE,
    DIRECT_PAIR_RULE,
    FRIEND_GAME_LOCKED,
    FRIEND_GONE,
    INVITE_GAME_LOCKED,
    INVITE_LIMITED,
    clearIfExpired,
    companionOf,
    firstNameOf,
    freshInviteCode,
    friendByKey,
    gameOpenFor,
    hostView,
    loadInviteRow,
    inviteOf,
    newChannelKey,
    playFriendsOf,
    settingsOf,
    siblingByKey,
    siblingIdsOf,
    updateInvite,
    writeInvite,
    type InviteRow,
} from "../../../_lib/invites";
import { enforceRateLimit, errorResponse, HttpError, parseIdParam, readJsonObject } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);
        const row = await loadInviteRow(childId);
        const invite = inviteOf(row);
        if (!invite) return NextResponse.json({ invite: null }, { headers: NO_STORE });
        const now = Date.now();
        const status = inviteStatus(invite, now);
        if (status === "expired") {
            await clearIfExpired(childId, row, invite, now);
            return NextResponse.json({ invite: null, expired: true }, { headers: NO_STORE });
        }
        if (status === "declined" || status === "missed") {
            // Odgovor se javlja jednom i poziv se briše; domaćin zatim bira dalje (druga igra, kod)
            const person = status === "declined" ? invite.declined : invite.request;
            await writeInvite(childId, row, invite, null).catch(() => false);
            return NextResponse.json(
                {
                    invite: null,
                    [status]: person ? { firstName: person.firstName, companion: person.companion } : null,
                    game: invite.game,
                    level: invite.level,
                    ...(invite.mode === "versus" ? { mode: invite.mode } : {}),
                    ...(invite.request ? { via: invite.request.via } : {}),
                },
                { headers: NO_STORE }
            );
        }
        return NextResponse.json({ invite: hostView(childId, invite, now) }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/invite");
    }
}

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        const session = await requireChildAccess(childId);
        const body = await readJsonObject(request);
        const level = body.level;
        const mode = parsePlayMode(body.mode);
        if (!isRemoteGame(body.game) || typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > MAX_LEVEL || !mode) {
            throw new HttpError(400, "Neispravan zahtev");
        }
        const game = body.game;
        const direct = body.friend !== undefined && body.friend !== null;

        const attempt = takeAttempts([
            { key: `invite-create:child:${childId}`, rule: CREATE_RULE },
            { key: `invite-create:ip:${getClientIp(request)}`, rule: CREATE_IP_RULE },
        ]);
        enforceRateLimit(attempt, INVITE_LIMITED);

        const hostRow = await loadInviteRow(childId);
        if (!(await gameOpenFor(hostRow, game))) throw new HttpError(403, INVITE_GAME_LOCKED);

        // Poziv bez koda: brat ili sestra sa istog roditeljskog naloga, ili drug koji se pamti na
        // OBA spiska (roditelj koji je obrisao druga sa spiska svog deteta time gasi i pozive u oba smera)
        let friendRow: InviteRow | null = null;
        if (direct) {
            const sibling = siblingByKey(childId, await siblingIdsOf(session, childId), body.friend);
            const friendId = sibling ?? friendByKey(childId, playFriendsOf(hostRow), body.friend)?.id ?? null;
            if (friendId === null) throw new HttpError(404, FRIEND_GONE);
            friendRow = await loadInviteRow(friendId).catch(() => null);
            if (!friendRow || (sibling === null && !hasPlayFriend(playFriendsOf(friendRow), childId))) throw new HttpError(404, FRIEND_GONE);
            const pair = takeAttempts([{ key: `invite-direct:${childId}:${friendId}`, rule: DIRECT_PAIR_RULE }]);
            enforceRateLimit(pair, INVITE_LIMITED);
            if (!(await gameOpenFor(friendRow, game))) throw new HttpError(409, FRIEND_GAME_LOCKED);
        }

        const code = direct ? null : await freshInviteCode();
        const now = Date.now();
        let replaced: StoredInvite | null = null;
        const { invite } = await updateInvite(childId, (row, current): StoredInvite => {
            replaced = current;
            return {
                code,
                channelKey: newChannelKey(),
                expiresAt: new Date(now + INVITE_CODE_TTL_MS).toISOString(),
                hostFirstName: firstNameOf(row),
                game,
                level,
                mode,
                createdAt: new Date(now).toISOString(),
                ...(friendRow
                    ? {
                          request: {
                              key: newChannelKey(),
                              guestId: friendRow.id,
                              firstName: firstNameOf(friendRow),
                              companion: companionOf(friendRow),
                              via: "direct" as const,
                              at: new Date(now).toISOString(),
                          },
                      }
                    : {}),
            };
        });
        // Stari poziv koji je čekao odgovor nekog druga: njegova kartica nestaje
        const previous = replaced as StoredInvite | null;
        if (previous?.request && previous.request.guestId !== friendRow?.id) await notifyInbox(previous.request.guestId, "cancel");
        if (friendRow) await notifyInbox(friendRow.id, "request");
        return NextResponse.json({ invite: invite ? hostView(childId, invite, now) : null }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "POST /api/children/[id]/invite");
    }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);
        let asked: number | null = null;
        await updateInvite(childId, (row, invite) => {
            asked = invite?.request?.guestId ?? null;
            return invite || settingsOf(row).invite !== undefined ? null : undefined;
        });
        // Drug koji još gleda karticu poziva: kartica nestaje (bez poruke — ništa se nije desilo)
        if (asked !== null) await notifyInbox(asked, "cancel");
        return NextResponse.json({ ok: true }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "DELETE /api/children/[id]/invite");
    }
}
