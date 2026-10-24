// Igra „Brojevi”: cifre, nivoi, tekstovi, monitor.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    DIGIT_GLYPHS,
    NUMBERS_MAX_LEVEL,
    answerFor,
    answerShort,
    buildNumbersLevel,
    dotsPhrase,
    emptyNumbersView,
    mergeNumbersMonitor,
    numberGlyph,
    pickedSentence,
    questionFor,
    validNumberTask,
    type NumberTask,
} from "@/app/components/games/data/numbersItems";
import { BAND_PRESETS } from "@/lib/childSettings";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: NUMBERS_MAX_LEVEL }, (_, i) => i + 1);
const task = (extra: Partial<NumberTask>): NumberTask => ({ kind: "trace", answer: 5, guide: "thick", demo: true, choices: [], sequence: [], gap: 0, less: false, ...extra });
const build = (level: number, seed: number, preset = BAND_PRESETS.older) => buildNumbersLevel(level, { maxChoices: preset.maxChoices, maxRounds: preset.maxRounds, random: seeded(seed * 17 + level) });

describe("digits", () => {
    it("has strokes for 0–9 and for every number up to 20", () => {
        assert.deepEqual(Object.keys(DIGIT_GLYPHS).sort(), ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]);
        for (let n = 0; n <= 20; n += 1) assert.ok(numberGlyph(n)!.strokes.length >= 1, String(n));
        assert.equal(numberGlyph(15)!.strokes.length, DIGIT_GLYPHS["1"].strokes.length + DIGIT_GLYPHS["5"].strokes.length);
    });

    it("says the dots with the right word form", () => {
        assert.equal(dotsPhrase(1), "jedna tačkica");
        assert.equal(dotsPhrase(2), "dve tačkice");
        assert.equal(dotsPhrase(4), "četiri tačkice");
        assert.equal(dotsPhrase(5), "pet tačkica");
        assert.equal(dotsPhrase(12), "dvanaest tačkica");
    });
});

describe("numbers texts", () => {
    it("asks and answers in words, and never says where to tap", () => {
        assert.equal(questionFor(task({})), "Piši broj pet.");
        assert.equal(questionFor(task({ guide: "copy" })), "Prepiši broj pet.");
        assert.equal(questionFor(task({ kind: "find", choices: [5, 6] })), "Gde je broj pet?");
        assert.equal(questionFor(task({ kind: "match", answer: 3, choices: [3, 4] })), "Gde ima tri tačkice?");
        assert.equal(questionFor(task({ kind: "compare", answer: 7, choices: [3, 7] })), "Koji broj je veći?");
        assert.equal(questionFor(task({ kind: "compare", answer: 3, choices: [3, 7], less: true })), "Koji broj je manji?");
        assert.equal(answerFor(task({ kind: "compare", answer: 7, choices: [3, 7] })), "Sedam je više od tri.");
        assert.equal(answerShort(task({ kind: "compare", answer: 3, choices: [3, 7], less: true })), "3 < 7");
        assert.equal(answerFor(task({ kind: "missing", answer: 3, sequence: [1, 2, 3, 4], gap: 2, choices: [3, 5] })), "Tri. Jedan, dva, tri, četiri.");
        assert.equal(pickedSentence(task({ kind: "match", answer: 3, choices: [3, 4] }), 4), "Ovde ima četiri tačkice.");
        for (const level of LEVELS) {
            for (const t of build(level, 1)) assert.doesNotMatch(questionFor(t), /dodirni|klikni|levo|desno|ovde/i);
        }
    });
});

describe("numbers levels", () => {
    it("builds valid tasks for every level and age band", () => {
        for (const level of LEVELS) {
            for (const preset of Object.values(BAND_PRESETS)) {
                for (let seed = 1; seed <= 8; seed += 1) {
                    const plan = build(level, seed, preset);
                    const where = `nivo ${level} ${preset.label} seme ${seed}`;
                    assert.ok(plan.length >= 2 && plan.length <= preset.maxRounds, `${where}: ${plan.length}`);
                    assert.ok(plan.some((t) => t.kind !== "trace"), `${where}: bar jedan izbor`);
                    for (const t of plan) {
                        assert.ok(validNumberTask(t), `${where}: ${JSON.stringify(t)}`);
                        assert.ok(t.choices.length <= preset.maxChoices, where);
                        assert.ok(numberGlyph(t.answer), where);
                        if (t.kind === "missing") {
                            const visible = t.sequence.filter((_, i) => i !== t.gap);
                            assert.ok(t.choices.every((c) => c === t.answer || !visible.includes(c)), `${where}: kartica je već u nizu`);
                        }
                        if (t.kind === "compare") assert.notEqual(t.choices[0], t.choices[1]);
                    }
                    for (let i = 1; i < plan.length; i += 1) {
                        if (plan[i].kind === plan[i - 1].kind && plan[i].kind === "trace") assert.notEqual(plan[i].answer, plan[i - 1].answer, `${where}: isti broj zaredom`);
                    }
                }
            }
        }
    });

    it("starts with straight digits and a model, then thin guides, then copying up to 20", () => {
        assert.deepEqual(
            build(1, 1).filter((t) => t.kind === "trace").map((t) => t.answer),
            [1, 7, 4, 0]
        );
        for (const level of LEVELS) {
            const traces = build(level, 2).filter((t) => t.kind === "trace");
            for (const t of traces) {
                assert.equal(t.guide, level <= 5 ? "thick" : level <= 10 ? "thin" : "copy", `nivo ${level}`);
                assert.equal(t.demo, level <= 5, `nivo ${level}`);
                assert.ok(t.answer <= (level <= 5 ? 9 : level <= 10 ? 10 : 20), `nivo ${level}: ${t.answer}`);
            }
        }
        assert.ok(build(12, 3).some((t) => t.kind === "trace" && t.answer >= 10));
        assert.ok(build(13, 3).every((t) => t.kind !== "missing" || t.sequence.every((v) => v <= 20)));
    });

    it("leaves a gap inside the line in the easy tier (1 2 _ 4), anywhere later", () => {
        for (let seed = 1; seed <= 20; seed += 1) {
            for (const t of build(5, seed).filter((x) => x.kind === "missing")) {
                assert.ok(t.gap > 0 && t.gap < t.sequence.length - 1, JSON.stringify(t));
                assert.ok(t.sequence.every((v) => v >= 1 && v <= 5));
            }
        }
    });
});

describe("numbers monitor state", () => {
    it("keeps a valid state and drops anything the game could not have made", () => {
        const view = { ...emptyNumbersView(6), task: task({ answer: 8 }), strokesDone: 1, round: 3, score: 20 };
        assert.deepEqual(mergeNumbersMonitor(JSON.parse(JSON.stringify(view))), view);
        assert.equal(mergeNumbersMonitor({ ...view, strokesDone: 7 }).strokesDone, 1);
        assert.equal(mergeNumbersMonitor({ ...view, task: { ...view.task, answer: 21 } }).task, null);
        const missing = task({ kind: "missing", answer: 3, sequence: [1, 2, 3, 4], gap: 2, choices: [3, 6, 7] });
        assert.ok(mergeNumbersMonitor({ ...view, task: missing }).task);
        assert.equal(mergeNumbersMonitor({ ...view, task: { ...missing, gap: 1 } }).task, null);
        assert.equal(mergeNumbersMonitor({ ...view, task: { ...missing, sequence: [1, 3, 3, 4] } }).task, null);
        const compare = task({ kind: "compare", answer: 3, choices: [3, 7] });
        assert.equal(mergeNumbersMonitor({ ...view, task: compare }).task, null);
        assert.ok(mergeNumbersMonitor({ ...view, task: { ...compare, less: true } }).task);
        assert.deepEqual(mergeNumbersMonitor(undefined), emptyNumbersView(1));
    });
});
