// lib/sharedPlay.ts — zajednička tabla na dva uređaja: smena, rezultati poteza, ključevi radnji i redosled poruka.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pairsForSize } from "@/app/components/games/MemoryGame";
import { GAMES } from "@/lib/games";
import { parseRemoteState } from "@/lib/invite";
import {
    SHARED_END_WAIT_MS,
    SHARED_FALLBACK,
    boardScreen,
    finishedKey,
    parseScreen,
    rememberFinished,
    actionKeyOf,
    finishTurns,
    hasSharedBoard,
    initialTurnState,
    isNewer,
    judgeAction,
    mayTouch,
    onSharedTurn,
    parseAction,
    parseMirror,
    parsePointKey,
    pickHit,
    playerResult,
    pointKey,
    publishSharedTurns,
    resetSharedTurns,
    selectorFor,
    sharedBoardFor,
    sharedScores,
    stepTurn,
    takeTurn,
    turnMarker,
    turnRuleFor,
    type ActionMessage,
    type SharedTurnResult,
    type SharedTurnState,
} from "@/lib/sharedPlay";

const base = { score: 0, correctCount: 0, incorrectCount: 0, promptedCount: 0, round: 1, totalRounds: 4 };

/** Stanje „Spoji parove”: `moves` dve okrenute kartice, `matched` pronađeni parovi */
function pairs(moves: number, matched: string[], extra: Record<string, unknown> = {}) {
    return { ...base, cards: ["a", "b", "a", "b", "c", "c"], flipped: [], moves, matched, round: matched.length + 1, totalRounds: 3, ...extra };
}

function play(game: Parameters<typeof stepTurn>[0], views: Record<string, unknown>[], solo = false): SharedTurnState {
    let state = initialTurnState(game, views[0]);
    for (const view of views.slice(1)) state = stepTurn(game, state, view, solo);
    return state;
}

describe("which games share one board", () => {
    it("every game except finger writing (and the sound game) has a shared board", () => {
        const without = GAMES.filter((g) => !hasSharedBoard(g.id)).map((g) => g.id);
        assert.deepEqual(without.sort(), ["letters", "numbers", "sound-to-image"]);
        for (const id of without) assert.ok(SHARED_FALLBACK[id]?.length, id);
    });

    it("together always uses the board; a duel only in the turn-based format", () => {
        assert.ok(sharedBoardFor("memory", "together"));
        assert.ok(!sharedBoardFor("memory", "versus"));
        assert.ok(!sharedBoardFor("memory", "versus", "race"));
        assert.ok(sharedBoardFor("memory", "versus", "turns"));
        assert.ok(!sharedBoardFor("letters", "together"));
        assert.ok(!sharedBoardFor(null, "together"));
    });

    it("picks the turn rule per game", () => {
        assert.equal(turnRuleFor("memory", pairs(0, [])), "pairs");
        // „Zapamti gde je šta bilo” (nivoi 11–15) nema kartice: jedan predmet — jedan potez
        assert.equal(turnRuleFor("memory", { ...base, shelf: 1 }), "round");
        assert.equal(turnRuleFor("backpack", base), "pieces");
        assert.equal(turnRuleFor("puzzle", base), "round");
    });
});

describe("turn alternation", () => {
    it("one task each: the turn passes when the round advances", () => {
        let state = initialTurnState("shapes", base);
        assert.equal(state.turn, "host");
        state = stepTurn("shapes", state, { ...base, correctCount: 1, score: 10 });
        assert.equal(state.turn, "host", "the round has not advanced yet (praise is still on screen)");
        state = stepTurn("shapes", state, { ...base, correctCount: 1, round: 2 });
        assert.equal(state.turn, "guest");
        assert.equal(state.turnNo, 2);
        state = stepTurn("shapes", state, { ...base, correctCount: 1, incorrectCount: 1, round: 3 });
        assert.equal(state.turn, "host");
        assert.deepEqual(state.results, [
            { player: "host", correct: true, round: 1 },
            { player: "guest", correct: false, round: 2 },
        ]);
    });

    it("memory: a mismatch passes the turn, a found pair lets the same child go again", () => {
        const state = play("memory", [
            pairs(0, []),
            pairs(1, []), // domaćin promaši
            pairs(2, ["a"]), // gost nađe par — igra opet
            pairs(3, ["a", "b"]), // gost nađe još jedan — opet
            pairs(4, ["a", "b"]), // gost promaši — red prelazi
        ]);
        assert.equal(state.turn, "host");
        assert.deepEqual(
            state.results.map((r) => [r.player, r.correct]),
            [
                ["host", false],
                ["guest", true],
                ["guest", true],
                ["guest", false],
            ]
        );
        assert.deepEqual(sharedScores(state.results), { host: 0, guest: 2 });
    });

    it("memory marker counts only mismatches", () => {
        assert.equal(turnMarker("memory", pairs(5, ["a", "b"])), 3);
        assert.equal(turnMarker("memory", pairs(2, ["a", "b"])), 0);
    });

    it("drag boards: one placed piece is one turn, even inside one round", () => {
        const view = (round: number, packed: string[], incorrect = 0) => ({ ...base, round, packed, incorrectCount: incorrect });
        const state = play("backpack", [view(1, []), view(1, ["olovka"]), view(1, ["olovka"], 1), view(1, ["olovka", "knjiga"], 1), view(2, [], 1)]);
        // Novi ranac (prazan) nije novi komad: red se ne pomera unazad ni unapred
        assert.equal(state.turn, "host");
        assert.deepEqual(
            state.results.map((r) => [r.player, r.correct]),
            [
                ["host", true],
                ["guest", false],
            ]
        );
    });

    it("the turn never moves back (story „Nazad”, eraser)", () => {
        const state = play("social-story", [base, { ...base, round: 2 }, { ...base, round: 1 }, { ...base, round: 2 }]);
        assert.equal(state.turn, "guest");
        assert.equal(state.turnNo, 2);
    });

    it("an unscored (demo) round passes the turn without a result", () => {
        const state = play("puzzle", [base, { ...base, round: 2 }]);
        assert.equal(state.turn, "guest");
        assert.equal(state.results.length, 0);
    });

    it("solo: when the friend is away the host keeps the turn, and takes it back", () => {
        const state = play("where", [base, { ...base, correctCount: 1, round: 2 }], true);
        assert.equal(state.turn, "host");
        const guestTurn = play("where", [base, { ...base, correctCount: 1, round: 2 }]);
        assert.equal(guestTurn.turn, "guest");
        const back = takeTurn(guestTurn, "host");
        assert.equal(back.turn, "host");
        assert.equal(back.turnNo, guestTurn.turnNo + 1, "old guest actions stop being valid");
    });

    it("the last task has no next round: finishing records it", () => {
        let state = play("uses", [base, { ...base, correctCount: 1, round: 2 }]);
        state = finishTurns("uses", state, { ...base, correctCount: 2, round: 2 });
        assert.ok(state.finished);
        assert.deepEqual(state.results.at(-1), { player: "guest", correct: true, round: 2 });
        assert.equal(stepTurn("uses", state, { ...base, round: 9 }), state, "nothing changes after the end");
    });
});

describe("rewards per child", () => {
    const team = { score: 40, durationSec: 60, correct: 3, total: 4, prompted: 1 };

    it("together: both children get the whole board's result", () => {
        assert.deepEqual(playerResult(team, null, "guest", "together"), team);
    });

    it("duel: each child gets their own turns", () => {
        const state = play("shapes", [
            base,
            { ...base, correctCount: 1, round: 2 },
            { ...base, correctCount: 1, incorrectCount: 1, promptedCount: 1, round: 3 },
            { ...base, correctCount: 2, incorrectCount: 1, promptedCount: 1, round: 4 },
        ]);
        const host = playerResult(team, state, "host", "duel");
        const guest = playerResult(team, state, "guest", "duel");
        assert.deepEqual([host.correct, host.total], [2, 2]);
        assert.deepEqual([guest.correct, guest.total, guest.prompted], [0, 1, 1]);
        assert.ok(host.correct + (host.prompted ?? 0) <= host.total);
        assert.equal(host.score + guest.score, 40);
    });

    it("a child that never played still has a valid result (no practice level)", () => {
        const state = initialTurnState("shapes", base);
        const result = playerResult(team, state, "guest", "duel");
        assert.deepEqual([result.correct, result.total], [0, 1]);
    });
});

describe("turn results for the duel screen", () => {
    it("reports each new result once, with both scores", () => {
        resetSharedTurns();
        const seen: [SharedTurnResult, number, number][] = [];
        const off = onSharedTurn((result, scores) => seen.push([result, scores.host, scores.guest]));
        const a: SharedTurnResult = { player: "host", correct: true, round: 1 };
        const b: SharedTurnResult = { player: "guest", correct: true, round: 2 };
        publishSharedTurns([a]);
        publishSharedTurns([a]);
        publishSharedTurns([a, b]);
        off();
        publishSharedTurns([a, b, a]);
        assert.deepEqual(seen, [
            [a, 1, 0],
            [b, 1, 1],
        ]);
        resetSharedTurns();
    });
});

describe("action keys", () => {
    const el = (attrs: Record<string, string>) => ({ getAttribute: (name: string) => attrs[name] ?? null });

    it("reads data-action, then the drag attributes", () => {
        assert.equal(actionKeyOf(el({ "data-action": "choice:mačka" })), "choice:mačka");
        assert.equal(actionKeyOf(el({ "data-piece": "kvadrat" })), "piece:kvadrat");
        assert.equal(actionKeyOf(el({ "data-slot": "3" })), "slot:3");
        assert.equal(actionKeyOf(el({ "data-drop": "ranac" })), "drop:ranac");
        assert.equal(actionKeyOf(el({ "data-action": "card:2", "data-piece": "x" })), "card:2");
        assert.equal(actionKeyOf(el({})), null);
    });

    it("rejects keys that could break a selector", () => {
        assert.equal(actionKeyOf(el({ "data-action": 'x"] , *' })), null);
        assert.equal(actionKeyOf(el({ "data-piece": "a b" })), null);
        assert.equal(selectorFor('a"]'), null);
    });

    it("builds the host selector for each kind of key", () => {
        assert.equal(selectorFor("choice:DŽ"), '[data-action="choice:DŽ"]');
        assert.equal(selectorFor("piece:c3"), '[data-action="piece:c3"], [data-piece="c3"]');
        assert.equal(selectorFor("slot:basket"), '[data-action="slot:basket"], [data-slot="basket"]');
        assert.equal(selectorFor("pt:lavirint:0.250,0.750"), '[data-action-point="lavirint"]');
    });

    it("point keys are fractions of the element (same spot on any screen size)", () => {
        const key = pointKey("slika-a", 0.41234, 1.2);
        assert.equal(key, "pt:slika-a:0.412,1.000");
        assert.deepEqual(parsePointKey(key), { name: "slika-a", fx: 0.412, fy: 1 });
        assert.equal(parsePointKey("pt:x:2,0"), null);
        assert.equal(parsePointKey("choice:1"), null);
    });

    it("resolves the innermost element, exact SVG shapes first, places on drag release", () => {
        const hits = [
            { key: "slot:basket", area: 40000, order: 1 },
            { key: "takeout:apple", area: 2500, order: 2 },
        ];
        assert.equal(pickHit(hits), "takeout:apple");
        assert.equal(pickHit(hits, true), "slot:basket");
        assert.equal(
            pickHit([
                { key: "zone:wall", area: 9000, order: 1, exact: true },
                { key: "zone:window", area: 800, order: 2 },
            ]),
            "zone:wall"
        );
        assert.equal(pickHit([{ key: "pt:slika-a:0.100,0.100", area: 90000, order: 0, point: true }]), "pt:slika-a:0.100,0.100");
        assert.equal(pickHit([{ key: "pt:slika-a:0.1,0.1", area: 90000, order: 0, point: true }, { key: "tool:hint", area: 2000, order: 3 }]), "tool:hint");
        assert.equal(pickHit([]), null);
    });
});

describe("out-of-turn input", () => {
    const ctx = { session: "memory-2-1", turn: "guest" as const, turnNo: 4, solo: false, finished: false, last: null };
    const action = (patch: Partial<ActionMessage> = {}): ActionMessage => ({ epoch: 100, seq: 1, session: "memory-2-1", turnNo: 4, keys: ["card:3"], ...patch });

    it("applies a guest action only on the guest's turn, in that turn", () => {
        assert.equal(judgeAction(ctx, action()), "apply");
        assert.equal(judgeAction({ ...ctx, turn: "host" }, action()), "not-your-turn");
        assert.equal(judgeAction({ ...ctx, solo: true }, action()), "not-your-turn");
        assert.equal(judgeAction(ctx, action({ turnNo: 3 })), "stale");
        assert.equal(judgeAction(ctx, action({ session: "memory-3-1" })), "other-session");
        assert.equal(judgeAction({ ...ctx, finished: true }, action()), "finished");
    });

    it("applies each action at most once", () => {
        assert.equal(judgeAction({ ...ctx, last: { epoch: 100, seq: 1 } }, action()), "duplicate");
        assert.equal(judgeAction({ ...ctx, last: { epoch: 100, seq: 2 } }, action()), "duplicate");
        assert.equal(judgeAction({ ...ctx, last: { epoch: 100, seq: 1 } }, action({ seq: 2 })), "apply");
        // Gost je osvežio stranicu: nova epoha, brojanje kreće ispočetka
        assert.equal(judgeAction({ ...ctx, last: { epoch: 100, seq: 9 } }, action({ epoch: 200, seq: 1 })), "apply");
    });

    it("each device may touch the board only on its own turn", () => {
        assert.ok(mayTouch("host", "host", false));
        assert.ok(!mayTouch("host", "guest", false));
        assert.ok(mayTouch("guest", "guest", false));
        assert.ok(!mayTouch("guest", "host", false));
        // Drug nije tu: domaćin igra sam, gost ne
        assert.ok(mayTouch("host", "guest", true));
        assert.ok(!mayTouch("guest", "guest", true));
    });
});

describe("message order and validation", () => {
    it("drops older and repeated snapshots, accepts a new epoch", () => {
        assert.ok(isNewer({ epoch: 5, seq: 2 }, null));
        assert.ok(isNewer({ epoch: 5, seq: 3 }, { epoch: 5, seq: 2 }));
        assert.ok(!isNewer({ epoch: 5, seq: 2 }, { epoch: 5, seq: 2 }));
        assert.ok(!isNewer({ epoch: 5, seq: 1 }, { epoch: 5, seq: 2 }));
        assert.ok(isNewer({ epoch: 6, seq: 1 }, { epoch: 5, seq: 90 }));
        assert.ok(!isNewer({ epoch: 4, seq: 99 }, { epoch: 5, seq: 1 }));
    });

    it("parses a mirror snapshot and limits what it trusts", () => {
        const raw = {
            epoch: 1700000000000,
            seq: 7,
            session: "memory-2-3",
            game: "memory",
            level: 2,
            view: { round: 2 },
            turn: "guest",
            turnNo: 3,
            solo: false,
            listening: true,
            tap: { by: "host", key: "card:1", n: 4 },
            ack: { epoch: 1700000000001, seq: 2 },
            results: [{ player: "host", correct: true, round: 1 }, { player: "nobody" }],
            final: { host: { score: 10, durationSec: 30, correct: 9, total: 2, prompted: 5 }, guest: { score: 5, durationSec: 30, correct: 1, total: 2 } },
            say: { n: 3, text: "Pronađi dve iste slike.", emotion: "calm" },
        };
        const mirror = parseMirror(raw);
        assert.ok(mirror);
        assert.equal(mirror.turn, "guest");
        assert.deepEqual(mirror.tap, { by: "host", key: "card:1", n: 4 });
        assert.equal(mirror.results.length, 1);
        assert.deepEqual(mirror.final?.host, { score: 10, durationSec: 30, correct: 2, total: 2, prompted: 0 });
        assert.equal(mirror.say?.text, "Pronađi dve iste slike.");
        assert.equal(parseMirror({ ...raw, game: "nope" }), null);
        assert.equal(parseMirror({ ...raw, session: "x y" }), null);
        assert.equal(parseMirror({ ...raw, turn: "admin" }), null);
        assert.equal(parseMirror({ ...raw, level: 99 }), null);
        assert.equal(parseMirror({ ...raw, tap: { by: "host", key: '"]' } })?.tap, null);
    });

    it("parses a guest action: one key, or two for a drag", () => {
        const raw = { epoch: 1700000000000, seq: 1, session: "puzzle-4-1", turnNo: 2, keys: ["piece:p1", "cell:3"] };
        assert.deepEqual(parseAction(raw), raw);
        assert.equal(parseAction({ ...raw, keys: [] }), null);
        assert.equal(parseAction({ ...raw, keys: ["a:1", "b:2", "c:3"] }), null);
        assert.equal(parseAction({ ...raw, keys: ["a b"] }), null);
        assert.equal(parseAction({ ...raw, turnNo: 0 }), null);
        assert.equal(parseAction({ ...raw, epoch: -1 }), null);
    });
});

describe("board size for both screens", () => {
    it("reads a screen from the friend's state and rejects nonsense", () => {
        assert.deepEqual(parseScreen({ w: 390.4, h: 844 }), { w: 390, h: 844 });
        assert.equal(parseScreen({ w: 10, h: 844 }), null);
        assert.equal(parseScreen({ w: "390", h: 844 }), null);
        assert.equal(parseScreen(null), null);
        const state = parseRemoteState({ phase: "playing", screen: { w: 1024, h: 768 } });
        assert.deepEqual(state?.screen, { w: 1024, h: 768 });
        // Stari klijent bez ekrana: polja nema (tabla se bira samo po ovom ekranu)
        assert.equal(parseRemoteState({ phase: "playing" })?.screen, undefined);
    });

    it("leaves room for the turn strip (bar above on a phone, column beside on a tablet)", () => {
        assert.deepEqual(boardScreen({ w: 390, h: 844 }), { w: 390, h: 768 });
        assert.deepEqual(boardScreen({ w: 1024, h: 768 }), { w: 872, h: 768 });
        assert.deepEqual(boardScreen({ w: 844, h: 390 }), { w: 692, h: 390 });
    });

    it("a phone guest gets a board that fits the phone, not the host's tablet", () => {
        const tablet = boardScreen({ w: 1024, h: 768 });
        const phone = boardScreen({ w: 390, h: 844 });
        const forTablet = pairsForSize(10, tablet.w, tablet.h);
        const forPhone = pairsForSize(10, phone.w, phone.h);
        assert.ok(forPhone <= 8, `phone ${forPhone}`);
        assert.ok(forPhone < forTablet, `phone ${forPhone} < tablet ${forTablet}`);
        // Tabla na zajedničkoj tabli: najmanji od dva ekrana
        assert.equal(Math.min(forTablet, forPhone), forPhone);
    });
});

describe("level end after a guest reload", () => {
    it("remembers saved levels once, newest last, with a limit", () => {
        const key = finishedKey("bm-inv-abc", 1700000000000);
        assert.equal(key, "bm-inv-abc:1700000000000");
        let list = rememberFinished([], key);
        list = rememberFinished(list, key);
        assert.deepEqual(list, [key], "the same level is never stored twice");
        for (let i = 0; i < 20; i++) list = rememberFinished(list, `k${i}`, 12);
        assert.equal(list.length, 12);
        assert.equal(list.at(-1), "k19");
        assert.ok(!list.includes(key), "oldest entries drop out");
    });

    it("the host never waits forever for the guest at the end of a level", () => {
        assert.ok(SHARED_END_WAIT_MS >= 15_000 && SHARED_END_WAIT_MS <= 30_000);
    });
});
