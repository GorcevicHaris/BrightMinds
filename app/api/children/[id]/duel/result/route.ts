// app/api/children/[id]/duel/result/route.ts
// Rezultat partije dvoboja na istom uređaju (brat i sestra sa istog roditeljskog naloga) i ulog
// (pravila: lib/duelStakes.ts; prenos: app/api/_lib/duels.ts). `[id]` je dete koje je prijavljeno.
//
// POST { session, level, round, format, mine: {correct,total,secs}, theirs: {…} }
//   `mine` je prijavljeno dete, `theirs` brat ili sestra. Oba rezultata stižu sa jednog uređaja,
//   pa sesiju odobrava nalog roditelja (oba deteta su njegova); sesija mora biti ona koju je
//   server napravio (/duel), ne starija od tri sata, a drug i dalje sa istog naloga. Partija
//   (nivo + redni broj u sesiji) se obračunava jednom — ponovljen zahtev vraća isti ishod.
// Odgovor: { status: "settled", outcome: "you" | "friend" | "tie", amount, coins: { you, friend } }.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { duelWinner, parseDuelReport, settlementId } from "@/lib/duelStakes";
import { MAX_LEVEL } from "@/lib/games";
import { takeAttempts, type RateLimitRule } from "@/lib/rateLimit";
import { INVITE_LIMITED, settingsOf, siblingIdsOf } from "../../../../_lib/invites";
import { DUEL_GONE, coinsOfRow, currentStake, loadDuelRow, localDuelActive, parseLocalDuel, transferDuelCoins } from "../../../../_lib/duels";
import { enforceRateLimit, errorResponse, HttpError, parseIdParam, readJsonObject } from "../../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

const RESULT_RULE: RateLimitRule = { limit: 60, windowMs: 10 * 60 * 1000 };

export async function POST(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        const session = await requireChildAccess(childId);
        enforceRateLimit(takeAttempts([{ key: `duel-local:child:${childId}`, rule: RESULT_RULE }]), INVITE_LIMITED);
        const body = await readJsonObject(request);
        const report = parseDuelReport(body, MAX_LEVEL);
        if (!report || typeof body.session !== "string") throw new HttpError(400, "Neispravan zahtev");

        const me = await loadDuelRow(childId);
        const duel = parseLocalDuel(settingsOf(me).localDuel);
        if (!duel || duel.id !== body.session || !localDuelActive(duel)) throw new HttpError(404, DUEL_GONE);
        if (!(await siblingIdsOf(session, childId)).includes(duel.friendId)) throw new HttpError(404, DUEL_GONE);

        const friend = await loadDuelRow(duel.friendId);
        const winner = duelWinner(report.format, report.mine, report.theirs);
        let amount = 0;
        if (winner !== null) {
            const [winnerId, loserId] = winner === 0 ? [childId, duel.friendId] : [duel.friendId, childId];
            amount = await transferDuelCoins({ id: settlementId("l", duel.id, report.level, report.round), winnerId, loserId, stake: currentStake(me, friend) });
        }
        const [meAfter, friendAfter] = await Promise.all([loadDuelRow(childId), loadDuelRow(duel.friendId)]);
        return NextResponse.json(
            { status: "settled", outcome: winner === null ? "tie" : winner === 0 ? "you" : "friend", amount, coins: { you: coinsOfRow(meAfter), friend: coinsOfRow(friendAfter) } },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        return errorResponse(error, "POST /api/children/[id]/duel/result");
    }
}
