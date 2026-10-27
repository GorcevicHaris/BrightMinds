// Igra „Šta dolazi sledeće?” (app/components/games/data/patternLevels.ts): stvari u nizu,
// nivoi i plan, rečenice, bodovanje, roditeljski prikaz i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    buildPatternLevel,
    COLORS,
    currentAnswer,
    describeUnit,
    DINO_IDS,
    emptyPatternView,
    isPatternItem,
    itemNoun,
    mergePatternMonitor,
    mistakeSentence,
    parseItem,
    PATTERN_LEVELS,
    PATTERN_MAX_LEVEL,
    PATTERN_PICTURE_IDS,
    patternQuestion,
    patternResult,
    patternRoundView,
    patternVoiceQuestion,
    repeatUnit,
    solvedSentence,
    solvePatternView,
    unitOf,
    type PatternRound,
    type PatternView,
} from "@/app/components/games/data/patternLevels";
import { PICTURE_IDS } from "@/app/components/games/pictures";
import { DINO_ART } from "@/app/components/games/pattern/PatternArt";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|klikni|prevuci|ovde/i;

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

const viewOf = (round: PatternRound, total = 5): PatternView => ({ ...emptyPatternView(total), ...patternRoundView(round) });

/** Tačni odgovori zadatka redom (za prenošenje pravila: pravilo uzora) */
function answersOf(round: PatternRound): string[] {
    return round.kind === "transfer" ? [round.structure as string] : round.gaps.map((g) => round.items[g]);
}

/** Svi planovi za mnogo semena i sva ograničenja izbora i zadataka */
function* allPlans(): Generator<{ level: number; plan: PatternRound[]; maxChoices: number; maxRounds: number }> {
    for (const level of LEVELS) {
        for (const preset of Object.values(BAND_PRESETS)) {
            for (const maxChoices of [2, preset.maxChoices]) {
                for (let seed = 1; seed <= 25; seed += 1) {
                    yield { level, plan: buildPatternLevel(level, { maxRounds: preset.maxRounds, maxChoices, random: seeded(seed * 97 + level) }), maxChoices, maxRounds: preset.maxRounds };
                }
            }
        }
    }
}

describe("pattern items", () => {
    it("parses every kind of item and rejects junk", () => {
        for (const id of ["c:red", "s:star:blue", "p:cat", "p:bronto", "n:25", "d:4", "t:6", "a:3", "k:0"]) assert.ok(isPatternItem(id), id);
        for (const id of ["c:pink", "s:star", "s:moon:red", "p:zorro", "n:-1", "n:100", "d:0", "d:10", "a:4", "x:1", "c:red:1", 7, null]) assert.ok(!isPatternItem(id), String(id));
    });

    it("draws every picture: shared pictures by id, dinosaurs in this game", () => {
        for (const id of PATTERN_PICTURE_IDS) {
            if ((DINO_IDS as readonly string[]).includes(id)) assert.ok(DINO_ART[id], id);
            else assert.ok((PICTURE_IDS as readonly string[]).includes(id), id);
        }
    });

    it("names items with correct Serbian grammar", () => {
        assert.equal(itemNoun("s:circle:red").name, "crveni krug");
        assert.equal(itemNoun("s:star:blue").gen, "plave zvezde");
        assert.equal(itemNoun("s:heart:green").name, "zeleno srce");
        assert.equal(itemNoun("s:heart:green", true).name, "srce");
        assert.equal(describeUnit(unitOf("aab", ["c:red", "c:blue"])), "dve crvene, pa plava");
        assert.equal(describeUnit(unitOf("abb", ["p:cat", "p:dog"])), "mačka, pa dva psa");
        assert.equal(describeUnit(unitOf("aabb", ["s:heart:red", "s:circle:red"]), true), "dva srca, pa dva kruga");
        assert.equal(describeUnit(unitOf("abc", ["p:cat", "p:dog", "p:fish"])), "mačka, pas, pa riba");
        assert.deepEqual(repeatUnit(["a", "b"], 5), ["a", "b", "a", "b", "a"]);
    });

    it("gives every colour its own sign (for children who see colours less well)", () => {
        const glyphs = Object.values(COLORS).map((color) => color.glyph);
        assert.equal(new Set(glyphs).size, glyphs.length);
    });
});

describe("pattern levels", () => {
    it("has 15 levels in three tiers with a ramp", () => {
        assert.equal(PATTERN_MAX_LEVEL, 15);
        assert.equal(PATTERN_LEVELS.length, MAX_LEVEL);
        // Lako: podrška (luk ispod jedinice, čitanje niza, rana pomoć); kasnije je nema
        PATTERN_LEVELS.forEach((rule, i) => {
            const easy = i < 5;
            assert.equal(rule.grouped, easy, `nivo ${i + 1}`);
            assert.equal(rule.earlyHint, easy, `nivo ${i + 1}`);
        });
        // Izbori rastu: 2 → 3 → 4
        assert.equal(PATTERN_LEVELS[0].choices, 2);
        assert.equal(PATTERN_LEVELS[2].choices, 3);
        assert.equal(PATTERN_LEVELS[7].choices, 4);
        // Teško: rastući niz, brojevi, dva prazna mesta, okretanje, prenošenje pravila
        assert.deepEqual(PATTERN_LEVELS.slice(10).map((rule) => rule.kind), ["grow", "count", "repeat", "turn", "transfer"]);
        assert.equal(PATTERN_LEVELS[12].gap, "two");
        assert.equal(PATTERN_LEVELS[8].gap, "middle");
    });

    it("builds a valid, solvable plan for every level, seed and setting", () => {
        for (const { level, plan, maxChoices, maxRounds } of allPlans()) {
            const rule = PATTERN_LEVELS[level - 1];
            assert.equal(plan.length, Math.max(2, Math.min(rule.rounds, maxRounds)), `nivo ${level}`);
            for (const round of plan) {
                const where = `nivo ${level}: ${round.items.join(" ")} | ${round.choices.join(" ")}`;
                assert.equal(round.kind, rule.kind, where);
                assert.ok(round.items.length >= 5 && round.items.length <= 7, where);
                assert.ok(round.items.every(isPatternItem), where);
                // Izbori: različiti, 2 … ograničenje (ili tačno dva tačna odgovora kad je ograničenje 2)
                assert.equal(new Set(round.choices).size, round.choices.length, where);
                assert.ok(round.choices.length >= 2, where);
                assert.ok(round.choices.length <= Math.max(2, Math.min(rule.choices, maxChoices)), where);
                const answers = answersOf(round);
                for (const answer of answers) assert.equal(round.choices.filter((id) => id === answer).length, 1, where);
                if (round.kind === "transfer") {
                    // Samo jedan red ima isto pravilo kao uzor
                    assert.equal(round.gaps.length, 0, where);
                    assert.equal(round.rows.filter((row) => row.id === round.structure).length, 1, where);
                    assert.deepEqual(round.rows.map((row) => row.id), round.choices, where);
                    for (const row of round.rows) assert.deepEqual(row.items, repeatUnit(unitOf(row.id, Array.from(new Set(row.items))), row.items.length), where);
                    assert.ok(round.items.every((id) => parseItem(id)?.kind === "color"), where);
                    continue;
                }
                assert.ok(round.gaps.length >= 1 && round.gaps.every((g) => g >= 1 && g < round.items.length), where);
                assert.equal(round.gaps.length, rule.gap === "two" ? 2 : 1, where);
                if (rule.gap === "end") assert.equal(round.gaps[0], round.items.length - 1, where);
                if (rule.gap === "middle") assert.ok(round.gaps[0] < round.items.length - 1, where);
                if (round.kind === "repeat") {
                    // Niz zaista ponavlja jedinicu, a pre prvog praznog mesta je bar jedna cela jedinica
                    assert.ok(round.unit >= 2, where);
                    assert.deepEqual(round.items, repeatUnit(round.items.slice(0, round.unit), round.items.length), where);
                    assert.ok(round.gaps[0] >= round.unit, where);
                    // Svaki promašaj se razlikuje od tačnog odgovora (nema dva tačna)
                    for (const id of round.choices) if (!answers.includes(id)) assert.notEqual(id, round.items[round.gaps[0]], where);
                } else if (round.kind === "grow" || round.kind === "count") {
                    const values = round.items.map((id) => parseItem(id)?.value ?? NaN);
                    values.slice(1).forEach((value, i) => assert.equal(value - values[i], round.step, where));
                } else {
                    const values = round.items.map((id) => parseItem(id)?.value ?? NaN);
                    values.slice(1).forEach((value, i) => assert.equal((((value - values[i]) % 4) + 4) % 4, (round.step + 4) % 4, where));
                }
            }
        }
    });

    it("starts level 1 with an easy demonstrated round: two colours on the caterpillar", () => {
        for (let seed = 1; seed <= 20; seed += 1) {
            const [first] = buildPatternLevel(1, { maxRounds: 5, maxChoices: 3, random: seeded(seed) });
            assert.equal(first.carrier, "caterpillar");
            assert.deepEqual(first.items, ["c:red", "c:blue", "c:red", "c:blue", "c:red"]);
            assert.equal(first.choices.length, 2);
        }
    });

    it("level 10 offers near misses that share one attribute with the answer", () => {
        for (let seed = 1; seed <= 30; seed += 1) {
            for (const round of buildPatternLevel(10, { maxRounds: 6, maxChoices: 4, random: seeded(seed) })) {
                const answer = parseItem(round.items[round.gaps[0]]);
                const others = round.choices.map(parseItem).filter((item) => item && !(item.shape === answer?.shape && item.color === answer?.color));
                assert.ok(others.some((item) => item?.color === answer?.color && item?.shape !== answer?.shape));
                assert.ok(others.some((item) => item?.shape === answer?.shape && item?.color !== answer?.color));
            }
        }
    });

    it("never repeats the same carrier twice in a row and keeps long rows off the narrow balloons", () => {
        for (const { plan } of allPlans()) {
            plan.slice(1).forEach((round, i) => assert.notEqual(round.carrier, plan[i].carrier));
            for (const round of plan) if (round.items.length >= 7) assert.notEqual(round.carrier, "balloons");
        }
    });

    it("is deterministic for the same random source", () => {
        for (const level of LEVELS) {
            const a = buildPatternLevel(level, { maxRounds: 8, maxChoices: 6, random: seeded(42) });
            const b = buildPatternLevel(level, { maxRounds: 8, maxChoices: 6, random: seeded(42) });
            assert.deepEqual(a, b);
            assert.doesNotThrow(() => JSON.stringify(a));
        }
    });
});

describe("pattern sentences", () => {
    it("never tells the child where to tap and always says something", () => {
        for (const { plan } of allPlans()) {
            for (const round of plan) {
                const view = viewOf(round);
                const texts = [patternQuestion(view), patternVoiceQuestion(view), solvedSentence(view)];
                for (const id of round.choices) if (id !== currentAnswer(view)) texts.push(mistakeSentence(view, id));
                for (const text of texts) {
                    assert.ok(text.trim().length > 0, round.items.join(" "));
                    assert.doesNotMatch(text, TAP_WORDS, text);
                    assert.doesNotMatch(text, /undefined|NaN|\s{2}/, text);
                }
            }
        }
    });

    it("reads the pattern rhythmically on easy levels and states the rule", () => {
        const round: PatternRound = buildPatternLevel(1, { maxRounds: 5, maxChoices: 2, random: seeded(3) })[0];
        const view = viewOf(round);
        assert.equal(patternVoiceQuestion(view), "Crvena, plava, crvena, plava… Šta dolazi sledeće?");
        assert.equal(mistakeSentence(view, "c:blue"), "Posle plave uvek dolazi crvena.");
        assert.equal(solvedSentence(view), "Crvena, plava, crvena, plava, crvena.");
        // Kad „posle X” nije uvek isto, kaže se cela jedinica
        const aab = { ...view, items: repeatUnit(unitOf("aab", ["c:red", "c:blue"]), 6), unit: 3, gaps: [4], read: false };
        assert.equal(mistakeSentence(aab, "c:blue"), "Dve crvene, plava, pa opet ispočetka.");
        assert.equal(patternQuestion(aab), "Šta fali u nizu?");
    });

    it("explains numbers, growth, turns and the rule transfer", () => {
        const count = viewOf({ ...buildPatternLevel(12, { maxRounds: 6, maxChoices: 4, random: seeded(1) })[0], items: ["n:2", "n:4", "n:6", "n:8", "n:10"], step: 2 });
        assert.equal(mistakeSentence(count, "n:9"), "Svaki put je dva više.");
        assert.equal(solvedSentence(count), "2, 4, 6, 8, 10. Svaki put je dva više.");
        const down = { ...count, items: ["n:10", "n:9", "n:8", "n:7", "n:6"], step: -1 };
        assert.equal(mistakeSentence(down, "n:5"), "Svaki put je jedan manje.");
        const transfer = viewOf(buildPatternLevel(15, { maxRounds: 6, maxChoices: 3, random: seeded(5) })[0]);
        assert.match(solvedSentence(transfer), /^Isto pravilo: .+ — .+\.$/);
        const other = transfer.rows.find((row) => row.id !== transfer.structure);
        assert.ok(other);
        assert.match(mistakeSentence(transfer, other.id), /^Taj niz ide: .+\. Naš niz ide: .+\.$/);
    });
});

describe("pattern scoring", () => {
    const view = (extra: Partial<PatternView> = {}): PatternView => ({ ...emptyPatternView(5), items: ["c:red", "c:blue", "c:red"], gaps: [2], unit: 2, choices: ["c:red", "c:blue"], ...extra });

    it("does not score the demonstrated first round of level 1", () => {
        const { next, modeled } = solvePatternView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts a clean round as correct, a helped round as prompted, a round with mistakes as neither", () => {
        assert.equal(solvePatternView(view({ round: 2 }), 1).next.correctCount, 1);
        assert.equal(solvePatternView(view({ round: 2, hint: true }), 3).next.promptedCount, 1);
        // Pomoć na prvom od dva prazna mesta se računa za ceo zadatak
        assert.equal(solvePatternView(view({ round: 2, helped: true }), 13).next.promptedCount, 1);
        const missed = solvePatternView(view({ round: 2, misses: 1 }), 3).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = patternResult(view({ totalRounds: 5, correctCount: 5, promptedCount: 5 }), 1, 30);
        assert.equal(result.total, 4);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergePatternMonitor({
            kind: "magic",
            carrier: "rocket",
            items: ["c:red", "c:blue", "x:1", "p:zorro", "c:red"],
            gaps: [2, 9, -1, 2.5],
            filled: 7,
            choices: ["c:red", "c:pink", "c:red", "c:blue"],
            picked: "c:pink",
            wrong: ["c:blue", "zzz"],
            round: 99,
            totalRounds: 4,
            score: -5,
        } as unknown as Partial<PatternView>);
        assert.equal(merged.kind, "repeat");
        assert.equal(merged.carrier, "train");
        assert.deepEqual(merged.items, ["c:red", "c:blue", "c:red"]);
        assert.deepEqual(merged.gaps, [2]);
        assert.equal(merged.filled, 1);
        assert.deepEqual(merged.choices, ["c:red", "c:blue"]);
        assert.equal(merged.picked, null);
        assert.deepEqual(merged.wrong, ["c:blue"]);
        assert.equal(merged.round, 4);
        assert.equal(merged.score, 0);
        assert.deepEqual(mergePatternMonitor(null), emptyPatternView(1));
        const transfer = mergePatternMonitor({ kind: "transfer", items: ["c:red"], rows: [{ id: "ab", items: ["p:cat"] }, { id: "zz", items: ["p:dog"] }, null], structure: "ab" } as unknown as Partial<PatternView>);
        assert.deepEqual(transfer.choices, ["ab"]);
        assert.equal(transfer.structure, "ab");
    });
});

describe("pattern game file", () => {
    const source = readFileSync(path.join(process.cwd(), "app/components/games/PatternGame.tsx"), "utf8");

    it("uses only the game random source and reports through onComplete", () => {
        assert.doesNotMatch(source, /Math\.random/);
        assert.match(source, /onCompleteRef\.current\(patternResult\(/);
        assert.match(source, /data-action=\{`choice:\$\{/);
    });
});

describe("pattern game registry entry", () => {
    const game = getGame("pattern");

    it("is activity 29, graded, cognitive, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 29);
        assert.equal(game.gameType, "pattern");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0024_logic_games.sql"), "utf8");
        assert.match(sql, /\(29, 'Šta dolazi sledeće\?', '[^']+', 'cognitive'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("pattern"));
        assert.ok(isRemoteGame("pattern"));
    });
});
