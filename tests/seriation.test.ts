// Igra „Poređaj po veličini” (app/components/games/data/seriationLevels.ts): nivoi, plan,
// postavljanje i umetanje, rečenice, bodovanje, monitor i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    ANIMALS,
    buildSeriationLevel,
    correctGap,
    doneSentence,
    emptySeriationView,
    gapId,
    mergeSeriationMonitor,
    missesOffered,
    mistakeSentence,
    nextPiece,
    orderOf,
    pieceFrom,
    pieceLabel,
    rowOrder,
    seriationCaption,
    seriationQuestion,
    seriationResult,
    seriationRoundView,
    SERIATION_LEVELS,
    SERIATION_MAX_LEVEL,
    slotId,
    solveSeriationView,
    stepSentence,
    THEMES,
    trayLeft,
    tryPlace,
    VALUE_RANGE,
    type SeriationRound,
    type SeriationView,
} from "@/app/components/games/data/seriationLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { turnMarker } from "@/lib/sharedPlay";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde|tamo gore|tu dole|levo|desno/i;
const LIMITS = [...new Set(Object.values(BAND_PRESETS).map((preset) => preset.maxChoices))];
const ROUND_LIMITS = [...new Set(Object.values(BAND_PRESETS).map((preset) => preset.maxRounds))];

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

function viewOf(round: SeriationRound, extra: Partial<SeriationView> = {}): SeriationView {
    return { ...emptySeriationView(4), ...seriationRoundView(round), ...extra };
}

/** Sve kombinacije uzrasta i mnogo semena */
function* plans(): Generator<{ level: number; limit: number; rounds: number; plan: SeriationRound[] }> {
    for (const level of LEVELS)
        for (const limit of LIMITS)
            for (const rounds of ROUND_LIMITS)
                for (let seed = 1; seed <= 12; seed += 1) yield { level, limit, rounds, plan: buildSeriationLevel(level, { maxRounds: rounds, maxChoices: limit, random: seeded(seed * 97 + level) }) };
}

describe("seriation levels", () => {
    it("has 15 levels in three tiers with a ramp", () => {
        assert.equal(SERIATION_MAX_LEVEL, 15);
        assert.equal(SERIATION_LEVELS.length, MAX_LEVEL);
        const easy = SERIATION_LEVELS.slice(0, 5);
        const hard = SERIATION_LEVELS.slice(10);
        // Lako: najviše 4 predmeta, senke na svim mestima, pomoć rano
        for (const rule of easy) {
            assert.ok(rule.count <= 4 && rule.guide === "all" && rule.earlyHint && !rule.insert);
            assert.ok(rule.themes.every((id) => THEMES[id].measure === "size" || THEMES[id].measure === "height"));
        }
        // Srednje i teško: bez rane pomoći, senka samo na početku srednjeg dela
        for (const rule of SERIATION_LEVELS.slice(5)) assert.ok(!rule.earlyHint && rule.guide !== "all");
        assert.ok(SERIATION_LEVELS.slice(7).every((rule) => rule.guide === "none"));
        // Smer se prvi put menja na 4. nivou; prvih 3 nivoa je od najmanjeg
        assert.ok(SERIATION_LEVELS.slice(0, 3).every((rule) => rule.dir === "up"));
        assert.equal(SERIATION_LEVELS[3].dir, "down");
        // Teško: stvarna veličina, male razlike, brojevi, umetanje, oba smera
        assert.equal(THEMES[hard[0].themes[0]].measure, "real");
        assert.ok((hard[1].smallest ?? 0) > (SERIATION_LEVELS[0].smallest ?? 100));
        assert.ok(hard[3].insert);
        assert.equal(hard[4].dir, "mixed");
        // Vrste merenja idu redom: veličina → visina → dužina → količina → stvarnost → brojevi
        const measures = SERIATION_LEVELS.map((rule) => THEMES[rule.themes[0]].measure);
        assert.deepEqual(measures.slice(4, 13), ["height", "size", "length", "size", "count", "count", "real", "size", "number"]);
    });

    it("builds a valid, solvable plan for every level, age band and seed", () => {
        for (const { level, limit, rounds, plan } of plans()) {
            const rule = SERIATION_LEVELS[level - 1];
            assert.equal(plan.length, Math.max(2, Math.min(rule.rounds, rounds)), `L${level}`);
            for (const round of plan) {
                const info = THEMES[round.theme];
                assert.ok(rule.themes.includes(round.theme));
                const ids = round.pieces.map((piece) => piece.id);
                const values = round.pieces.map((piece) => piece.value);
                assert.equal(new Set(ids).size, ids.length, "id-ovi su različiti");
                assert.equal(new Set(values).size, values.length, "vrednosti su različite — red je jasan");
                assert.ok(round.pieces.length >= 2 && round.pieces.length <= Math.max(2, limit), `L${level} ${round.pieces.length} > ${limit}`);
                for (const piece of round.pieces) {
                    assert.deepEqual(pieceFrom(round.theme, piece.id), piece, piece.id);
                    const [min, max] = VALUE_RANGE[info.measure];
                    assert.ok(piece.value >= min && piece.value <= max);
                }
                if (info.dir) assert.equal(round.dir, info.dir);
                if (round.insert) {
                    // Jedan predmet fali; red bez njega je poređan, a razmaka je koliko i izbora
                    assert.equal(round.given.length, round.pieces.length - 1);
                    assert.deepEqual(round.given, orderOf(round.pieces, round.dir).filter((id) => round.given.includes(id)));
                    assert.ok(round.given.length + 1 <= Math.max(2, limit));
                } else {
                    assert.equal(round.given.length, 0);
                    assert.notDeepEqual(ids, orderOf(round.pieces, round.dir), "korpa nije već poređana");
                }
                if (rule.apart && info.measure === "number") {
                    const sorted = [...values].sort((x, y) => x - y);
                    for (let i = 1; i < sorted.length; i += 1) assert.ok(sorted[i] - sorted[i - 1] >= 2, `${sorted}`);
                }
                // Rešivo: redom postavljamo pravi predmet na pravo mesto
                let view = viewOf(round);
                while (trayLeft(view).length > 0) {
                    const id = nextPiece(view)!;
                    const slot = view.insert ? gapId(correctGap(view, id)) : slotId(view.placed.length);
                    assert.deepEqual(tryPlace(view, id, slot), { result: "ok" });
                    view = { ...view, placed: [...view.placed, id] };
                }
                assert.equal(view.placed.length + view.given.length, round.pieces.length);
            }
        }
    });

    it("starts level 1 with the same demonstrated round: three orange fish, smallest first", () => {
        for (let seed = 1; seed < 30; seed += 1) {
            const [first] = buildSeriationLevel(1, { maxRounds: 5, maxChoices: 3, random: seeded(seed) });
            assert.equal(first.theme, "fish");
            assert.equal(first.tone, 0);
            assert.equal(first.dir, "up");
            assert.equal(first.pieces.length, 3);
        }
    });

    it("is deterministic for the same seed and differs for another", () => {
        const a = buildSeriationLevel(13, { maxRounds: 6, maxChoices: 6, random: seeded(5) });
        const b = buildSeriationLevel(13, { maxRounds: 6, maxChoices: 6, random: seeded(5) });
        const c = buildSeriationLevel(13, { maxRounds: 6, maxChoices: 6, random: seeded(6) });
        assert.deepEqual(a, b);
        assert.notDeepEqual(a, c);
        assert.equal(JSON.stringify(JSON.parse(JSON.stringify(a))), JSON.stringify(a));
    });

    it("never puts two animals of similar size in one row", () => {
        for (const { plan } of plans())
            for (const round of plan) {
                if (THEMES[round.theme].measure !== "real") continue;
                const ranks = round.pieces.map((piece) => ANIMALS.find((animal) => animal.id === piece.id)!.rank);
                assert.equal(new Set(ranks).size, ranks.length);
            }
    });
});

describe("seriation placing", () => {
    const fish = (): SeriationRound => ({ theme: "fish", dir: "up", tone: 0, pieces: [{ id: "fish-70", value: 70 }, { id: "fish-100", value: 100 }, { id: "fish-40", value: 40 }], given: [], insert: false, guide: "all" });

    it("accepts only the next piece in order, on the open place (or by tap)", () => {
        const view = viewOf(fish());
        assert.deepEqual(rowOrder(view), ["fish-40", "fish-70", "fish-100"]);
        assert.deepEqual(tryPlace(view, "fish-100", null), { result: "wrong", expected: "fish-40" });
        assert.deepEqual(tryPlace(view, "fish-40", null), { result: "ok" });
        assert.deepEqual(tryPlace(view, "fish-40", slotId(1)), { result: "invalid" });
        const after = { ...view, placed: ["fish-40"] };
        assert.deepEqual(tryPlace(after, "fish-40", null), { result: "invalid" });
        assert.equal(nextPiece(after), "fish-70");
        assert.equal(missesOffered(after), 1);
    });

    it("descending rows start with the biggest", () => {
        const view = viewOf({ ...fish(), dir: "down" });
        assert.equal(nextPiece(view), "fish-100");
        assert.match(mistakeSentence({ ...view, mistake: { piece: "fish-40", expected: "fish-100" } }), /^Ova riba je manja\. Prvo ide najveća\.$/);
    });

    it("insertion: the missing piece goes into the right gap only", () => {
        const round: SeriationRound = {
            theme: "number",
            dir: "up",
            tone: 0,
            pieces: [3, 7, 9, 12, 15].map((value) => ({ id: `number-${value}`, value })),
            given: ["number-3", "number-7", "number-12", "number-15"],
            insert: true,
            guide: "none",
        };
        const view = viewOf(round);
        assert.deepEqual(trayLeft(view), ["number-9"]);
        assert.equal(correctGap(view, "number-9"), 2);
        assert.deepEqual(tryPlace(view, "number-9", gapId(2)), { result: "ok" });
        assert.deepEqual(tryPlace(view, "number-9", gapId(0)), { result: "wrong", gap: 0 });
        assert.deepEqual(tryPlace(view, "number-9", gapId(9)), { result: "invalid" });
        assert.deepEqual(tryPlace(view, "number-9", null), { result: "invalid" });
        assert.equal(missesOffered(view), 4);
        assert.equal(seriationQuestion(view), "Broj 9 fali u redu. Gde je njegovo mesto?");
        assert.equal(mistakeSentence({ ...view, mistake: { piece: "number-9", gap: 1 } }), "Broj 9 je veći od broja 7, pa ide posle njega.");
        assert.equal(mistakeSentence({ ...view, mistake: { piece: "number-9", gap: 3 } }), "Broj 9 je manji od broja 12, pa ide pre njega.");
        assert.equal(mistakeSentence({ ...view, mistake: { piece: "number-9", gap: 4 } }), "Broj 9 je manji od broja 15, pa ide pre njega.");
        assert.equal(doneSentence(view), "Broj 9 ide između 7 i 12.");
    });

    it("counts one shared-board turn per placed piece (given pieces are not turns)", () => {
        const view = viewOf(fish());
        assert.equal(turnMarker("seriation", view as unknown as Record<string, unknown>), 0);
        assert.equal(turnMarker("seriation", { ...view, placed: ["fish-40"] } as unknown as Record<string, unknown>), 1);
        const insert = viewOf({ theme: "fish", dir: "up", tone: 1, pieces: fish().pieces, given: ["fish-40", "fish-100"], insert: true, guide: "none" });
        assert.equal(turnMarker("seriation", insert as unknown as Record<string, unknown>), 0);
    });
});

describe("seriation sentences", () => {
    it("are Serbian, grammatical, never say where to tap", () => {
        const lines: string[] = [];
        for (const { plan } of plans()) {
            for (const round of plan) {
                const view = viewOf(round);
                const order = rowOrder(view);
                lines.push(seriationQuestion(view), seriationCaption(view), doneSentence(view));
                for (const piece of round.pieces) lines.push(pieceLabel(round.theme, piece, round.pieces));
                if (round.insert) {
                    const id = trayLeft(view)[0];
                    for (let gap = 0; gap <= view.given.length; gap += 1) if (gap !== correctGap(view, id)) lines.push(mistakeSentence({ ...view, mistake: { piece: id, gap } }));
                    continue;
                }
                for (let k = 0; k < order.length - 1; k += 1) {
                    const placed = order.slice(0, k);
                    lines.push(stepSentence({ ...view, placed }, order[k]));
                    for (const wrong of order.slice(k + 1)) lines.push(mistakeSentence({ ...view, placed, mistake: { piece: wrong, expected: order[k] } }));
                }
            }
        }
        assert.ok(lines.length > 1000);
        for (const text of new Set(lines)) {
            assert.ok(text.length > 0, "prazna rečenica");
            assert.doesNotMatch(text, TAP_WORDS, text);
            assert.doesNotMatch(text, /undefined|null|NaN|\s{2}|\s[.,]/, text);
            assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
        }
    });

    it("uses the right grammar for gender and numbers", () => {
        const round = (theme: SeriationRound["theme"], values: number[], dir: SeriationRound["dir"] = "up"): SeriationView =>
            viewOf({ theme, dir, tone: 0, pieces: values.map((value) => ({ id: `${theme}-${value}`, value })), given: [], insert: false, guide: "none" });
        assert.equal(seriationQuestion(round("fish", [40, 70, 100])), "Poređaj ribe od najmanje do najveće.");
        assert.equal(seriationQuestion(round("teddy", [40, 70, 100])), "Poređaj medvediće od najmanjeg do najvećeg.");
        assert.equal(seriationQuestion(round("dino", [40, 70, 100], "down")), "Poređaj dinosauruse od najvećeg do najmanjeg.");
        assert.equal(seriationQuestion(round("tower", [1, 2, 3])), "Poređaj kule od najniže do najviše.");
        assert.equal(seriationQuestion(round("snake", [2, 3, 4])), "Poređaj zmije od najkraće do najduže.");
        assert.equal(seriationQuestion(round("apples", [1, 2, 5])), "Poređaj korpe od najmanje do najviše jabuka.");
        assert.equal(stepSentence(round("teddy", [40, 70, 100]), "teddy-40"), "Sada ide malo veći.");
        assert.equal(stepSentence({ ...round("fish", [40, 70, 100]), placed: ["fish-40"] }, "fish-70"), "Na kraju ide najveća.");
        assert.equal(stepSentence(round("apples", [1, 2, 5]), "apples-1"), "Jedna jabuka. Sada ide korpa sa više jabuka.");
        assert.equal(stepSentence(round("apples", [1, 2, 5]), "apples-2"), "Dve jabuke. Sada ide korpa sa više jabuka.");
        assert.equal(stepSentence(round("dots", [1, 5, 7]), "dots-5"), "Pet tačkica. Sada ide kartica sa više tačkica.");
        assert.equal(pieceLabel("tower", { id: "tower-3", value: 3 }, []), "Kula od 3 kocke");
        assert.equal(pieceLabel("tower", { id: "tower-5", value: 5 }, []), "Kula od 5 kocaka");
        const animals = viewOf({ theme: "animal", dir: "up", tone: 0, pieces: [{ id: "cat", value: 4 }, { id: "dog", value: 5 }, { id: "mouse", value: 2 }], given: [], insert: false, guide: "none" });
        assert.equal(mistakeSentence({ ...animals, mistake: { piece: "dog", expected: "mouse" } }), "Pas je veći od miša. Prvo ide miš.");
        assert.equal(mistakeSentence({ ...animals, placed: ["mouse"], mistake: { piece: "dog", expected: "cat" } }), "Pas je veći od mačke. Prvo ide mačka.");
        assert.equal(doneSentence(animals), "Od miša do psa, kao u stvarnom životu.");
    });
});

describe("seriation scoring", () => {
    const view = (extra: Partial<SeriationView> = {}): SeriationView => ({ ...emptySeriationView(4), theme: "fish", ...extra });

    it("does not score the demonstrated first round of level 1", () => {
        const { next, modeled } = solveSeriationView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts a clean row as correct, a helped row as prompted, a row with mistakes as neither", () => {
        assert.equal(solveSeriationView(view({ round: 2 }), 1).next.correctCount, 1);
        assert.equal(solveSeriationView(view({ round: 2, helped: true }), 3).next.promptedCount, 1);
        // Pomoć koja je već ugašena (posle tačnog predmeta) i dalje se računa
        const helped = solveSeriationView(view({ round: 2, hint: false, helped: true }), 3).next;
        assert.equal(helped.correctCount, 0);
        const missed = solveSeriationView(view({ round: 2, wrong: ["fish-100"] }), 3).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
        assert.equal(missed.score, 5);
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = seriationResult(view({ totalRounds: 4, correctCount: 4, promptedCount: 4 }), 1, 30);
        assert.equal(result.total, 3);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });
});

describe("seriation monitor", () => {
    it("drops anything unknown and keeps the row consistent", () => {
        const merged = mergeSeriationMonitor({
            theme: "fish",
            dir: "up",
            tone: 9,
            pieces: [{ id: "fish-40", value: 40 }, { id: "fish-70", value: 70 }, { id: "fish-100", value: 99 }, { id: "cat", value: 4 }, { id: "fish-70", value: 70 }, { id: "fish-999", value: 999 }],
            placed: ["fish-70", "fish-40"],
            selected: "x",
            last: "fish-70",
            mistake: { piece: "nope" },
            score: -5,
            round: 9,
            totalRounds: 3,
        } as unknown as Partial<SeriationView>);
        assert.deepEqual(merged.pieces, [{ id: "fish-40", value: 40 }, { id: "fish-70", value: 70 }]);
        // Postavljeni predmeti su uvek početak tačnog reda
        assert.deepEqual(merged.placed, []);
        assert.equal(merged.tone, 2);
        assert.equal(merged.selected, null);
        assert.equal(merged.last, null);
        assert.equal(merged.mistake, null);
        assert.equal(merged.score, 0);
        assert.equal(merged.round, 3);
    });

    it("keeps a valid state as it is", () => {
        const [round] = buildSeriationLevel(14, { maxRounds: 5, maxChoices: 6, random: seeded(3) });
        const state = viewOf(round, { selected: trayLeft(viewOf(round))[0], hint: true, helped: true, wrong: ["x>1"], stepWrong: 1, feedback: "wrong", mistake: { piece: trayLeft(viewOf(round))[0], gap: 0 } });
        assert.deepEqual(mergeSeriationMonitor(JSON.parse(JSON.stringify(state))), { ...state, mistake: { ...state.mistake!, expected: undefined } });
        assert.equal(mergeSeriationMonitor({ theme: "volcano" } as unknown as Partial<SeriationView>).theme, "");
        assert.equal(mergeSeriationMonitor(null).pieces.length, 0);
    });
});

describe("seriation game file", () => {
    const source = readFileSync(path.join(process.cwd(), "app/components/games/SeriationGame.tsx"), "utf8");

    it("takes tasks only from the game random and reports the result through onComplete", () => {
        assert.doesNotMatch(source, /Math\.random/);
        assert.match(source, /useGameRandom\(\)/);
        assert.match(source, /onCompleteRef\.current\(seriationResult\(/);
    });

    it("marks pieces and places for the shared board", () => {
        assert.match(source, /data-piece=\{piece\.id\}/);
        assert.match(source, /data-slot=\{/);
        assert.match(source, /data-open=\{open \? "" : undefined\}/);
    });
});

describe("seriation game registry entry", () => {
    const game = getGame("seriation");

    it("is activity 30, graded, cognitive, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 30);
        assert.equal(game.gameType, "seriation");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0024_logic_games.sql"), "utf8");
        assert.match(sql, /\(30, 'Poređaj po veličini', '[^']+', 'cognitive'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("seriation"));
        assert.ok(isRemoteGame("seriation"));
    });
});
