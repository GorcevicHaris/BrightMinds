// app/api/children/[id]/duel/route.ts
// Dvoboj na istom uređaju („na smenu”, playTogether.tsx) između brata i sestre sa istog
// roditeljskog naloga. `[id]` je dete koje je prijavljeno; sesiju odobrava nalog roditelja
// (requireChildAccess + siblingIdsOf: samo nalog roditelja, kao spisak /friends).
//
// POST { friend } → { session, seed, stake }: nova sesija dvoboja (stara prestaje da važi):
//   ključ sesije, seme zadataka i ulog (manji od dva podešavanja „Ulog u dvoboju”). Rezultat
//   partije ide na /duel/result. Sa drugom bez naloga (ime upisano na uređaju) nema sesije ni
//   uloga — samo ime pobednika.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { siblingIdsOf, newChannelKey } from "../../../_lib/invites";
import { currentStake, loadDuelRow, writeLocalDuel } from "../../../_lib/duels";
import { errorResponse, HttpError, parseIdParam, readJsonObject } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

const FRIEND_NOT_SIBLING = "Ovaj drug nije sa istog naloga.";

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        const session = await requireChildAccess(childId);
        const body = await readJsonObject(request);
        const friendId = body.friend;
        if (typeof friendId !== "number" || !Number.isSafeInteger(friendId) || friendId <= 0) throw new HttpError(400, "Neispravan zahtev");
        if (!(await siblingIdsOf(session, childId)).includes(friendId)) throw new HttpError(404, FRIEND_NOT_SIBLING);

        const [me, friend] = await Promise.all([loadDuelRow(childId), loadDuelRow(friendId)]);
        const duel = { id: newChannelKey(), friendId, seed: newChannelKey(), createdAt: new Date().toISOString() };
        await writeLocalDuel(childId, duel);
        return NextResponse.json({ session: duel.id, seed: duel.seed, stake: currentStake(me, friend) }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        return errorResponse(error, "POST /api/children/[id]/duel");
    }
}
