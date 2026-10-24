// Ocenjivanje u igrama sa precrtavanjem („Slova”, „Brojevi”) — isto pravilo kao u svim igrama:
//  • pokazni zadatak (prvi zadatak prvog nivoa) se ne ocenjuje;
//  • samostalno tačno = iz prvog pokušaja i bez pomoći (kod precrtavanja: ceo znak u hodniku,
//    bez izlaženja i bez pokazivanja poteza koje je pokrenula pomoć);
//  • uz pomoć = pomoć je bila na ekranu, a zadatak nije pokazni;
//  • correct + prompted ≤ total.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import { demoRounds } from "@/app/components/games/kit/utils";

export interface ScoredView extends BaseView {
    promptedCount: number;
}

export interface Outcome {
    /** Samostalno, iz prvog pokušaja */
    firstTry: boolean;
    /** Pokazni zadatak (ne ocenjuje se) */
    modeled: boolean;
    /** Rešeno uz pomoć */
    prompted: boolean;
}

/** Kako se računa rešen zadatak: `mistakes` = pogrešni izbori ili izlaženja iz hodnika */
export function outcomeFor(level: number, round: number, totalRounds: number, mistakes: number, hint: boolean): Outcome {
    const modeled = demoRounds(level, totalRounds) > 0 && round === 1;
    return { modeled, firstTry: !modeled && mistakes === 0 && !hint, prompted: !modeled && hint };
}

/** Novi poeni i brojači posle rešenog zadatka */
export function scoreSolved<V extends ScoredView>(view: V, outcome: Outcome): V {
    return {
        ...view,
        score: view.score + (outcome.firstTry ? 10 : 5),
        correctCount: view.correctCount + (outcome.firstTry ? 1 : 0),
        promptedCount: view.promptedCount + (outcome.prompted ? 1 : 0),
    };
}

/** Rezultat nivoa: total = zadaci bez pokaznog */
export function traceResult(final: ScoredView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return {
        score: final.score,
        durationSec,
        correct,
        total,
        prompted: Math.min(final.promptedCount, total - correct),
    };
}
