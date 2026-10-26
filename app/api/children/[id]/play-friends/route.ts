// app/api/children/[id]/play-friends/route.ts
// „Drugovi za igru” (lib/playFriends.ts): deca sa kojom je dete već igralo na dva uređaja,
// povezana kodom od sličica. Samo njih dete može da pozove bez koda.
//
// GET    — roditelj ili dečja sesija tog deteta → { friends: [{ key, firstName, companion }] }.
//          Ključ je izveden iz serverske tajne (bez ID-ja drugog deteta).
// DELETE — samo roditelj/terapeut deteta, { key }: drug se briše sa spiska, a dete i sa spiska
//          tog druga — posle toga se mogu povezati samo novim kodom.
import { NextResponse } from "next/server";
import { requireChildAccess, requireChildOwner } from "@/lib/auth";
import { forgetPlayFriend, hasPlayFriend } from "@/lib/playFriends";
import { friendKeyFor } from "@/lib/realtimeTopic";
import { friendByKey, loadInviteRow, playFriendsOf, updatePlayFriends } from "../../../_lib/invites";
import { errorResponse, HttpError, parseIdParam, readJsonObject } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);
        const friends = playFriendsOf(await loadInviteRow(childId)).list.map((friend) => ({
            key: friendKeyFor(childId, friend.id),
            firstName: friend.firstName,
            companion: friend.companion,
        }));
        return NextResponse.json({ friends }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/play-friends");
    }
}

export async function DELETE(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildOwner(childId);
        const { key } = await readJsonObject(request);
        const friend = friendByKey(childId, playFriendsOf(await loadInviteRow(childId)), key);
        if (!friend) throw new HttpError(404, "Ovog druga nema na spisku.");
        await updatePlayFriends(childId, (_row, current) => (hasPlayFriend(current, friend.id) ? forgetPlayFriend(current, friend.id) : null));
        // I drug zaboravlja ovo dete (dete druga je možda obrisano — tada nema šta da se briše)
        try {
            await updatePlayFriends(friend.id, (_row, current) => (hasPlayFriend(current, childId) ? forgetPlayFriend(current, childId) : null));
        } catch (error) {
            if (!(error instanceof HttpError && error.status === 404)) throw error;
        }
        return NextResponse.json({ ok: true }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "DELETE /api/children/[id]/play-friends");
    }
}
