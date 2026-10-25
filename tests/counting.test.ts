import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    answerFor,
    modelFor,
    modelSteps,
    boardCount,
    buildCountingLevel,
    choosesGroup,
    COUNT_NOUNS,
    COUNTING_MAX_LEVEL,
    countingResult,
    countingRule,
    countPhrase,
    emptyCountingView,
    getCountNoun,
    GROUP_MAX,
    hintSteps,
    mergeCountingMonitor,
    nounForm,
    numberWord,
    pickedSentence,
    questionFor,
    solveView,
    validRound,
    type CountingView,
    type CountRound,
} from "@/app/components/games/data/countingItems";
import { isPictureId } from "@/app/components/games/pictures";
import { BAND_PRESETS } from "@/lib/childSettings";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: COUNTING_MAX_LEVEL }, (_, i) => i + 1);
const noun = (id: string) => getCountNoun(id)!;
const round = (extra: Partial<CountRound>): CountRound => ({ kind: "count", noun: "apple", layout: "row", a: 3, b: 0, answer: 3, choices: [2, 3, 4], dots: false, ...extra });

describe("counting game grammar", () => {
    it("names the numbers 0–20 and agrees one and two with the noun's gender", () => {
        assert.deepEqual(
            Array.from({ length: 21 }, (_, i) => numberWord(i)),
            ["nula", "jedan", "dva", "tri", "četiri", "pet", "šest", "sedam", "osam", "devet", "deset", "jedanaest", "dvanaest", "trinaest", "četrnaest", "petnaest", "šesnaest", "sedamnaest", "osamnaest", "devetnaest", "dvadeset"]
        );
        assert.equal(numberWord(1, "f"), "jedna");
        assert.equal(numberWord(1, "n"), "jedno");
        assert.equal(numberWord(2, "f"), "dve");
        assert.equal(numberWord(2, "n"), "dva");
        assert.equal(numberWord(21, "f"), "dvadeset jedna");
        assert.equal(numberWord(22, "f"), "dvadeset dve");
        // 11 i 12 se ne menjaju po rodu
        assert.equal(numberWord(11, "f"), "jedanaest");
        assert.equal(numberWord(12, "f"), "dvanaest");
    });

    it("picks the noun form the number asks for: 1, 2–4, 5+ (and 11–14 like 5+)", () => {
        assert.deepEqual([1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 20, 21, 22, 24, 25].map(nounForm), ["one", "few", "few", "few", "many", "many", "many", "many", "many", "many", "many", "many", "one", "few", "few", "many"]);
    });

    it("says counts in correct Serbian for every gender and irregular plural", () => {
        const cases: [string, number, string][] = [
            ["apple", 1, "jedna jabuka"],
            ["apple", 2, "dve jabuke"],
            ["apple", 4, "četiri jabuke"],
            ["apple", 5, "pet jabuka"],
            ["balloon", 1, "jedan balon"],
            ["balloon", 2, "dva balona"],
            ["balloon", 5, "pet balona"],
            ["egg", 1, "jedno jaje"],
            ["egg", 3, "tri jajeta"],
            ["egg", 7, "sedam jaja"],
            ["dog", 1, "jedan pas"],
            ["dog", 3, "tri psa"],
            ["dog", 6, "šest pasa"],
            ["flower", 4, "četiri cveta"],
            ["flower", 9, "devet cvetova"],
            ["duck", 2, "dve patke"],
            ["duck", 8, "osam pataka"],
            ["pear", 10, "deset krušaka"],
            ["ball", 5, "pet lopti"],
            ["star", 12, "dvanaest zvezda"],
            ["fish", 13, "trinaest riba"],
            ["car", 2, "dva auta"],
            ["star", 20, "dvadeset zvezda"],
            // Nove imenice: nepravilne množine i srednji rod
            ["chick", 1, "jedno pile"],
            ["chick", 2, "dva pileta"],
            ["chick", 5, "pet pilića"],
            ["rabbit", 3, "tri zeca"],
            ["rabbit", 6, "šest zečeva"],
            ["sheep", 2, "dve ovce"],
            ["sheep", 5, "pet ovaca"],
            ["mouse", 7, "sedam miševa"],
            ["snail", 4, "četiri puža"],
            ["snail", 9, "devet puževa"],
            ["heart", 1, "jedno srce"],
            ["heart", 3, "tri srca"],
            ["heart", 8, "osam srca"],
            ["bell", 2, "dva zvona"],
            ["cherry", 5, "pet trešanja"],
            ["mushroom", 6, "šest pečuraka"],
            ["mushroom", 2, "dve pečurke"],
            ["lemon", 2, "dva limuna"],
            ["gift", 11, "jedanaest poklona"],
            ["bee", 1, "jedna pčela"],
            ["frog", 12, "dvanaest žaba"],
            ["carrot", 3, "tri šargarepe"],
        ];
        for (const [id, count, expected] of cases) assert.equal(countPhrase(count, noun(id)), expected);
    });

    it("asks and answers in short literal sentences with the right verb and case", () => {
        assert.equal(questionFor(round({ kind: "count", noun: "apple" })), "Koliko ima jabuka?");
        assert.equal(questionFor(round({ kind: "count", noun: "dog" })), "Koliko ima pasa?");
        assert.equal(questionFor(round({ kind: "match", noun: "apple", answer: 1, choices: [1, 2, 3] })), "Gde je jedna jabuka?");
        assert.equal(questionFor(round({ kind: "match", noun: "apple", answer: 3, choices: [2, 3, 4] })), "Gde su tri jabuke?");
        assert.equal(questionFor(round({ kind: "match", noun: "balloon", answer: 2, choices: [1, 2, 3] })), "Gde su dva balona?");
        assert.equal(questionFor(round({ kind: "match", noun: "apple", answer: 6, choices: [5, 6, 7] })), "Gde je šest jabuka?");
        assert.equal(questionFor(round({ kind: "most", noun: "ball", answer: 5, choices: [3, 5] })), "Gde ima više lopti?");
        assert.equal(questionFor(round({ kind: "least", noun: "duck", answer: 3, choices: [3, 5] })), "Gde ima manje pataka?");
        assert.equal(questionFor(round({ kind: "plus1", noun: "fish", a: 4, answer: 5, choices: [4, 5, 6] })), "Dolazi još jedna riba. Koliko je sada riba?");
        assert.equal(questionFor(round({ kind: "plus1", noun: "dog", a: 4, answer: 5, choices: [4, 5, 6] })), "Dolazi još jedan pas. Koliko je sada pasa?");
        assert.equal(questionFor(round({ kind: "minus1", noun: "balloon", a: 4, answer: 3, choices: [2, 3, 4] })), "Jedan balon odlazi. Koliko je sada balona?");
        assert.equal(questionFor(round({ kind: "add", noun: "apple", a: 2, b: 1, answer: 3, choices: [2, 3, 4] })), "Koliko je jabuka zajedno?");
        assert.equal(questionFor(round({ kind: "plus1", noun: "chick", a: 4, answer: 5, choices: [4, 5, 6] })), "Dolazi još jedno pile. Koliko je sada pilića?");
        assert.equal(questionFor(round({ kind: "minus1", noun: "sheep", a: 4, answer: 3, choices: [2, 3, 4] })), "Jedna ovca odlazi. Koliko je sada ovaca?");
        assert.equal(questionFor(round({ kind: "match", noun: "heart", answer: 2, choices: [1, 2, 3] })), "Gde su dva srca?");

        assert.equal(answerFor(round({ kind: "count", noun: "apple", a: 3, answer: 3 })), "Tri jabuke.");
        assert.equal(answerFor(round({ kind: "count", noun: "egg", a: 1, answer: 1, choices: [1, 2] })), "Jedno jaje.");
        assert.equal(answerFor(round({ kind: "count", noun: "star", a: 14, answer: 14, choices: [13, 14, 15], layout: "frame" })), "Četrnaest zvezda.");
        assert.equal(answerFor(round({ kind: "match", noun: "apple", answer: 3, choices: [2, 3, 4] })), "Ovde su tri jabuke.");
        assert.equal(answerFor(round({ kind: "most", noun: "apple", answer: 5, choices: [3, 5] })), "Ovde ima pet jabuka. Pet je više nego tri.");
        assert.equal(answerFor(round({ kind: "least", noun: "dog", answer: 1, choices: [4, 1] })), "Ovde ima jedan pas. Jedan je manje nego četiri.");
        assert.equal(answerFor(round({ kind: "plus1", noun: "fish", a: 1, answer: 2, choices: [1, 2, 3] })), "Sada ima dve ribe.");
        assert.equal(answerFor(round({ kind: "minus1", noun: "dog", a: 2, answer: 1, choices: [1, 2, 3] })), "Sada ima jedan pas.");
        assert.equal(answerFor(round({ kind: "add", noun: "apple", a: 2, b: 1, answer: 3, choices: [2, 3, 4] })), "Dva i jedan je tri.");

        assert.equal(pickedSentence(round({ kind: "count" }), 4), "To je broj četiri.");
        assert.equal(pickedSentence(round({ kind: "most", answer: 5, choices: [3, 5] }), 3), "Ovde ima tri jabuke.");
        assert.equal(pickedSentence(round({ kind: "match", answer: 6, choices: [5, 6, 7] }), 2), "Ovde su dve jabuke.");
    });

    it("never tells the child where to tap and writes everything in Ekavian", () => {
        for (const level of LEVELS) {
            for (const task of buildCountingLevel(level, { maxChoices: 4, maxRounds: 8, random: seeded(level) })) {
                for (const text of [questionFor(task), answerFor(task), ...task.choices.map((value) => pickedSentence(task, value))]) {
                    assert.doesNotMatch(text, /levo|desno|gore|dole|dodirni|klikni|pritisni/iu, text);
                    assert.doesNotMatch(text, /ije|dvije|cvije|mjes|lijep/u, text);
                    assert.match(text, /^[A-ZČĆŽŠĐ][^.?!]*[.?!]( [A-ZČĆŽŠĐ][^.?!]*[.?!])*$/u, text);
                }
            }
        }
    });
});

describe("counting game content", () => {
    it("has unique nouns with distinct drawn pictures and lowercase forms", () => {
        assert.equal(new Set(COUNT_NOUNS.map((item) => item.id)).size, COUNT_NOUNS.length);
        assert.equal(new Set(COUNT_NOUNS.map((item) => item.pic)).size, COUNT_NOUNS.length);
        for (const item of COUNT_NOUNS) {
            for (const form of [item.one, item.few, item.many]) assert.match(form, /^[a-zčćžšđ]+$/u, item.id);
            assert.ok(isPictureId(item.pic), `${item.id}: ${item.pic}`);
        }
        assert.ok(COUNT_NOUNS.filter((item) => item.moves).length >= 5, "enough things that can come and go");
        assert.ok(new Set(COUNT_NOUNS.map((item) => item.gender)).size === 3, "all three genders are covered");
    });

    it("follows the early-number trajectory: small sets, to 5, to 10, then to 20, one more / less and adding", () => {
        assert.equal(countingRule(1).max, 3);
        assert.equal(countingRule(1).choices, 2);
        assert.ok(countingRule(3).max === 5 && countingRule(3).dots);
        assert.equal(countingRule(4).layout, "dice");
        assert.ok(countingRule(5).kinds.includes("most"));
        assert.ok(LEVELS.slice(0, 5).every((level) => countingRule(level).dots && countingRule(level).max <= 5));
        assert.ok(LEVELS.slice(5, 10).every((level) => !countingRule(level).dots && countingRule(level).max <= 10));
        assert.equal(countingRule(7).layout, "frame");
        assert.deepEqual([...countingRule(8).kinds], ["match"]);
        assert.ok(countingRule(10).kinds.includes("least"));
        assert.equal(countingRule(12).max, 20);
        assert.deepEqual([...countingRule(13).kinds], ["plus1", "minus1"]);
        assert.deepEqual([...countingRule(14).kinds], ["add"]);
        assert.ok(countingRule(15).kinds.length >= 4);
    });

    for (const band of ["young", "middle", "older"] as const) {
        const { maxChoices, maxRounds } = BAND_PRESETS[band];
        it(`builds every level for the ${band} band: valid tasks, one right card, tidy numbers`, () => {
            for (const level of LEVELS) {
                const rule = countingRule(level);
                for (const seed of [1, 7, 42, 99, 123]) {
                    const rounds = buildCountingLevel(level, { maxChoices, maxRounds, random: seeded(seed + level) });
                    assert.equal(rounds.length, Math.min(rule.rounds, maxRounds), `level ${level}: rounds`);
                    rounds.forEach((task, i) => {
                        const label = `level ${level}, task ${i + 1}: ${JSON.stringify(task)}`;
                        assert.ok(validRound(task), label);
                        assert.ok(rule.kinds.includes(task.kind), label);
                        assert.equal(task.choices.filter((value) => value === task.answer).length, 1, label);
                        if (task.kind === "most" || task.kind === "least") assert.equal(task.choices.length, 2, label);
                        else assert.equal(task.choices.length, Math.min(rule.choices, Math.max(2, maxChoices)), label);
                        if (choosesGroup(task.kind)) assert.ok(task.choices.every((value) => value <= GROUP_MAX), label);
                        else {
                            // Brojevi na karticama su uzastopni i poređani kao na brojevnoj pravoj
                            task.choices.forEach((value, j) => j > 0 && assert.equal(value, task.choices[j - 1] + 1, label));
                        }
                        if (task.kind === "count") assert.ok(task.answer >= rule.min && task.answer <= rule.max, label);
                        if (task.kind === "most" || task.kind === "least") assert.ok(Math.abs(task.choices[0] - task.choices[1]) >= rule.gap, label);
                        if (task.kind === "plus1" || task.kind === "minus1") assert.ok(getCountNoun(task.noun)!.moves, label);
                        if (task.layout === "dice") assert.ok(task.a <= 6, label);
                        if (task.layout !== "row") assert.equal(task.kind, "count", label);
                        assert.equal(task.dots, rule.dots && !choosesGroup(task.kind), label);
                        // Na tabli najviše šest predmeta u širinu kad su dve grupe jedna do druge
                        if (task.kind === "add") assert.ok(task.a <= 5 && task.b <= 3, label);
                        if (i > 0) {
                            assert.notEqual(task.noun, rounds[i - 1].noun, `${label}: same picture twice in a row`);
                            if (task.kind === "count" && rounds[i - 1].kind === "count" && rule.max > rule.min) assert.notEqual(task.answer, rounds[i - 1].answer, `${label}: same answer twice in a row`);
                        }
                    });
                    if (rule.kinds.length > 1 && rounds.length >= rule.kinds.length) assert.ok(new Set(rounds.map((task) => task.kind)).size > 1, `level ${level}: one kind only`);
                }
            }
        });
    }

    it("puts the right number in different places on the cards, not always first or last", () => {
        for (const level of [3, 7, 12, 14]) {
            const places = new Set<number>();
            for (let seed = 1; seed < 30; seed += 1) {
                for (const task of buildCountingLevel(level, { maxChoices: 4, maxRounds: 8, random: seeded(seed) })) places.add(task.choices.indexOf(task.answer));
            }
            assert.ok(places.size >= 3, `level ${level}: ${[...places]}`);
        }
    });
});

describe("counting along as the hint", () => {
    it("lights the objects one by one while the voice counts, ending on the answer", () => {
        assert.deepEqual(
            hintSteps(round({ a: 3, answer: 3 })).map((step) => [step.key, step.lit, step.word]),
            [
                ["board", 1, "Jedan."],
                ["board", 2, "Dva."],
                ["board", 3, "Tri."],
            ]
        );
    });

    it("says a full ten-frame at once and counts on from ten", () => {
        const steps = hintSteps(round({ layout: "frame", a: 13, answer: 13, choices: [12, 13, 14, 15] }));
        assert.deepEqual(
            steps.map((step) => step.word),
            ["Deset.", "Jedanaest.", "Dvanaest.", "Trinaest."]
        );
        assert.equal(steps[0].lit, 10);
    });

    it("counts only what stays, all of both groups when adding, and both groups when comparing", () => {
        const minus = round({ kind: "minus1", noun: "dog", a: 5, answer: 4, choices: [3, 4, 5, 6] });
        assert.equal(hintSteps(minus).length, 4);
        assert.equal(boardCount(minus), 4);
        assert.equal(hintSteps(round({ kind: "plus1", noun: "dog", a: 5, answer: 6, choices: [5, 6, 7, 8] })).at(-1)!.word, "Šest.");
        assert.equal(hintSteps(round({ kind: "add", a: 2, b: 3, answer: 5, choices: [4, 5, 6, 7] })).length, 5);
        const compare = hintSteps(round({ kind: "most", answer: 4, choices: [4, 2] }));
        assert.deepEqual(
            compare.map((step) => `${step.key}:${step.lit}`),
            ["g4:1", "g4:2", "g4:3", "g4:4", "g2:1", "g2:2"]
        );
        assert.deepEqual(
            hintSteps(round({ kind: "match", answer: 2, choices: [3, 2, 1] })).map((step) => step.key),
            ["g2", "g2"]
        );
    });
});

describe("counting along as a model before the answer", () => {
    it("counts together on the first levels and fades: voice → lights only → none", () => {
        assert.deepEqual(
            LEVELS.map((level) => countingRule(level).model),
            ["voice", "voice", "lights", "lights", ...Array(11).fill("none")]
        );
        // Model je samo kad se broji na tabli
        assert.equal(modelFor(1, round({})), "voice");
        assert.equal(modelFor(3, round({})), "lights");
        assert.equal(modelFor(2, round({ kind: "most", answer: 4, choices: [2, 4] })), "none");
        assert.equal(modelFor(6, round({})), "none");
    });

    it("lights every object but leaves the last number to the child (cardinality)", () => {
        const steps = modelSteps(round({ a: 3, answer: 3 }), "voice");
        assert.deepEqual(
            steps.map((step) => [step.lit, step.word]),
            [
                [1, "Jedan."],
                [2, "Dva."],
                [3, ""],
            ]
        );
        assert.ok(modelSteps(round({ a: 4, answer: 4, choices: [3, 4, 5] }), "lights").every((step) => step.word === ""));
        assert.equal(modelSteps(round({ a: 4, answer: 4, choices: [3, 4, 5] }), "lights").length, 4);
        assert.deepEqual(modelSteps(round({}), "none"), []);
    });
});

describe("counting game scoring", () => {
    const view = (extra: Partial<CountingView>): CountingView => ({ ...emptyCountingView(5), task: round({}), ...extra });

    it("does not score the demonstrated first task of level 1", () => {
        const { next, modeled, firstTry } = solveView(view({ round: 1 }), 1);
        assert.ok(modeled && !firstTry);
        assert.equal(next.correctCount, 0);
        assert.equal(next.promptedCount, 0);
        // Ni uz pomoć: pokazni zadatak se ne broji ni kao „uz pomoć”
        assert.equal(solveView(view({ round: 1, hint: true }), 1).next.promptedCount, 0);
        // Na drugim nivoima prvi zadatak je pravi zadatak
        assert.equal(solveView(view({ round: 1 }), 2).next.correctCount, 1);
    });

    it("counts first-try answers as correct, hinted ones as prompted, and neither after a plain miss", () => {
        assert.deepEqual(pick(solveView(view({ round: 2 }), 1).next), { correct: 1, prompted: 0, score: 10 });
        assert.deepEqual(pick(solveView(view({ round: 2, hint: true }), 1).next), { correct: 0, prompted: 1, score: 5 });
        assert.deepEqual(pick(solveView(view({ round: 2, wrong: [4] }), 1).next), { correct: 0, prompted: 0, score: 5 });
        assert.deepEqual(pick(solveView(view({ round: 2, wrong: [4], hint: true }), 1).next), { correct: 0, prompted: 1, score: 5 });
    });

    it("never reports more correct and prompted answers than scored tasks", () => {
        for (const level of [1, 2, 15]) {
            for (const pattern of [
                [false, false, false, false, false],
                [true, true, true, true, true],
                [false, true, false, true, false],
            ]) {
                let current = view({});
                pattern.forEach((hint, i) => {
                    current = solveView({ ...current, round: i + 1, hint, wrong: [], feedback: null }, level).next;
                });
                const result = countingResult(current, level, 30);
                assert.equal(result.total, level === 1 ? 4 : 5);
                assert.ok(result.correct + (result.prompted ?? 0) <= result.total, `level ${level}: ${JSON.stringify(result)}`);
            }
        }
    });

    function pick(next: CountingView) {
        return { correct: next.correctCount, prompted: next.promptedCount, score: next.score };
    }
});

describe("counting game live monitor state", () => {
    it("returns an empty board for missing or garbage state", () => {
        for (const state of [null, undefined, {}, { task: "x" }, { task: { kind: "count", noun: "unicorn", layout: "row", a: 3, b: 0, answer: 3, choices: [2, 3], dots: false } }] as const) {
            const shown = mergeCountingMonitor(state as never);
            assert.equal(shown.task, null);
            assert.deepEqual(shown.wrong, []);
            assert.deepEqual(shown.lit, {});
            assert.equal(shown.totalRounds, 1);
        }
    });

    it("rejects tasks the game could not have made", () => {
        assert.ok(!validRound(round({ answer: 9 })), "answer not on the cards");
        assert.ok(!validRound(round({ a: 2 })), "board does not match the answer");
        assert.ok(!validRound(round({ kind: "most", answer: 3, choices: [3, 5] })), "„više” with the smaller group");
        assert.ok(!validRound(round({ kind: "match", answer: 12, choices: [11, 12, 13] })), "group too big for a card");
        assert.ok(!validRound(round({ choices: [3, 3] })), "repeated card");
        assert.ok(validRound(round({})));
    });

    it("keeps only wrong picks and lit counts that belong to the board", () => {
        const shown = mergeCountingMonitor({
            task: round({ kind: "most", answer: 5, choices: [3, 5] }),
            wrong: [3, 5, 7, 3],
            picked: 3,
            feedback: "wrong",
            hint: true,
            lit: { g3: 3, g5: 2, g9: 1, board: Number.NaN, other: 4 } as Record<string, number>,
            round: 2,
            totalRounds: 6,
            promptedCount: -1,
        });
        assert.deepEqual(shown.wrong, [3]);
        assert.equal(shown.picked, 3);
        assert.deepEqual(shown.lit, { g3: 3, g5: 2 });
        assert.equal(shown.round, 2);
        assert.equal(shown.promptedCount, 0);
        assert.ok(shown.hint);
    });
});
