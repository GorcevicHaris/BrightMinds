// app/api/children/[id]/invite/route.ts
// „Igraj sa drugom na drugom uređaju” — poziv deteta domaćina (model: lib/invite.ts).
// Sve tri radnje traže pristup detetu domaćinu (roditelj ili dečja sesija tog deteta koja i
// dalje važi — requireChildAccess).
// GET    — stanje poziva: čeka se drug (sa kodom), drug je ušao (ime i drugar druga) ili ga nema
// POST   — novi poziv za igru, nivo i način igre (`mode`: "together" ili "versus"; bez njega
//          „zajedno”, kao stari klijenti): kod od četiri sličice (važi 10 minuta) i tajni kanal;
//          stari poziv (ako postoji) prestaje da važi
// DELETE — „Završi igru sa drugom”: poziv se briše
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { MAX_LEVEL } from "@/lib/games";
import { INVITE_CODE_TTL_MS, inviteStatus, isRemoteGame, type StoredInvite } from "@/lib/invite";
import { getClientIp, takeAttempts } from "@/lib/rateLimit";
import { parsePlayMode } from "@/lib/versus";
import {
    CREATE_IP_RULE,
    CREATE_RULE,
    INVITE_GAME_LOCKED,
    INVITE_LIMITED,
    clearIfExpired,
    firstNameOf,
    freshInviteCode,
    gameOpenFor,
    hostView,
    loadInviteRow,
    inviteOf,
    newChannelKey,
    settingsOf,
    updateInvite,
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
        if (inviteStatus(invite, now) === "expired") {
            await clearIfExpired(childId, row, invite, now);
            return NextResponse.json({ invite: null, expired: true }, { headers: NO_STORE });
        }
        return NextResponse.json({ invite: hostView(childId, invite, now) }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/invite");
    }
}

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);
        const body = await readJsonObject(request);
        const level = body.level;
        const mode = parsePlayMode(body.mode);
        if (!isRemoteGame(body.game) || typeof level !== "number" || !Number.isInteger(level) || level < 1 || level > MAX_LEVEL || !mode) {
            throw new HttpError(400, "Neispravan zahtev");
        }
        const game = body.game;

        const attempt = takeAttempts([
            { key: `invite-create:child:${childId}`, rule: CREATE_RULE },
            { key: `invite-create:ip:${getClientIp(request)}`, rule: CREATE_IP_RULE },
        ]);
        enforceRateLimit(attempt, INVITE_LIMITED);

        if (!(await gameOpenFor(await loadInviteRow(childId), game))) throw new HttpError(403, INVITE_GAME_LOCKED);

        const code = await freshInviteCode();
        const now = Date.now();
        const { invite } = await updateInvite(childId, (row): StoredInvite => ({
            code,
            channelKey: newChannelKey(),
            expiresAt: new Date(now + INVITE_CODE_TTL_MS).toISOString(),
            hostFirstName: firstNameOf(row),
            game,
            level,
            mode,
            createdAt: new Date(now).toISOString(),
        }));
        return NextResponse.json({ invite: invite ? hostView(childId, invite, now) : null }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "POST /api/children/[id]/invite");
    }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);
        await updateInvite(childId, (row, invite) => (invite || settingsOf(row).invite !== undefined ? null : undefined));
        return NextResponse.json({ ok: true }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "DELETE /api/children/[id]/invite");
    }
}
