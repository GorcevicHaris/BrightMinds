import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    buildWhereLevel,
    FIGURES,
    getFigure,
    getPlaceObject,
    mergeWhereMonitor,
    PLACE_OBJECTS,
    placeSentence,
    RELATIONS,
    shownSentence,
    WHERE_MAX_LEVEL,
    whereRule,
    type Relation,
} from "@/app/components/games/data/whereScenes";
import { BAND_PRESETS } from "@/lib/childSettings";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: WHERE_MAX_LEVEL }, (_, i) => i + 1);
const box = getPlaceObject("box")!;
const table = getPlaceObject("table")!;
const basket = getPlaceObject("basket")!;
const chair = getPlaceObject("chair")!;
const cat = getFigure("cat")!;

describe("where game content", () => {
    it("puts each preposition with its case: u/na + locative, the rest + genitive, između + dve/dva", () => {
        assert.equal(placeSentence(cat, "in", box), "Mače je u kutiji.");
        assert.equal(placeSentence(cat, "on", table), "Mače je na stolu.");
        assert.equal(placeSentence(cat, "under", table), "Mače je ispod stola.");
        assert.equal(placeSentence(cat, "under", chair), "Mače je ispod stolice.");
        assert.equal(placeSentence(cat, "next", basket), "Mače je pored korpe.");
        assert.equal(placeSentence(cat, "behind", box), "Mače je iza kutije.");
        assert.equal(placeSentence(cat, "front", basket), "Mače je ispred korpe.");
        assert.equal(placeSentence(cat, "above", table), "Mače je iznad stola.");
        assert.equal(placeSentence(cat, "between", box), "Mače je između dve kutije.");
        assert.equal(placeSentence(getFigure("teddy")!, "in", basket), "Meda je u korpi.");
        assert.equal(placeSentence(getFigure("ball")!, "on", chair), "Lopta je na stolici.");
    });

    it("keeps „je” in second place when describing a wrong picture", () => {
        assert.equal(shownSentence(cat, "on", box), "Ovde je mače na kutiji.");
        assert.equal(shownSentence(getFigure("duck")!, "between", basket), "Ovde je patka između dve korpe.");
    });

    it("writes every object form by hand, in Ekavian, with the endings the cases need", () => {
        for (const object of PLACE_OBJECTS) {
            assert.match(object.loc, /i$|u$/, `${object.id}: locative ${object.loc}`);
            assert.match(object.gen, /e$|a$/, `${object.id}: genitive ${object.gen}`);
            assert.match(object.pair, /^(dve|dva) /, `${object.id}: ${object.pair}`);
            assert.ok(object.relations.length >= 3, `${object.id}: relations`);
            for (const relation of object.relations) assert.ok(RELATIONS.includes(relation));
        }
        // Ekavica: „dve”, a ne „dvije”
        for (const object of PLACE_OBJECTS) assert.doesNotMatch(object.pair, /dvije/u, object.id);
    });

    it("gives every figure a distinct emoji and a capitalized name", () => {
        assert.equal(new Set(FIGURES.map((figure) => figure.emoji)).size, FIGURES.length);
        for (const figure of FIGURES) assert.match(figure.name, /^[A-ZČĆŽŠĐ][a-zčćžšđ]+$/u, figure.id);
    });

    it("grows from in/on with two pictures to all eight prepositions with four", () => {
        assert.deepEqual([...whereRule(1).targets], ["in", "on"]);
        assert.equal(whereRule(1).choices, 2);
        assert.ok(whereRule(6).targets.includes("next"));
        assert.ok(whereRule(8).targets.includes("behind") && whereRule(8).targets.includes("front"));
        assert.equal(whereRule(8).choices, 3);
        assert.ok(whereRule(11).targets.includes("between") && whereRule(11).targets.includes("above"));
        assert.equal(whereRule(15).targets.length, RELATIONS.length);
        assert.equal(whereRule(15).choices, 4);
        // Ništa iz kasnijih nivoa se ne traži u lakim nivoima
        for (const level of [1, 2, 3, 4, 5]) for (const relation of whereRule(level).targets) assert.ok(["in", "on", "under"].includes(relation), `${level}: ${relation}`);
    });

    for (const band of ["young", "middle", "older"] as const) {
        const { maxChoices, maxRounds } = BAND_PRESETS[band];
        it(`builds every level for the ${band} band: one right picture, only positions the object can show`, () => {
            for (const level of LEVELS) {
                const rule = whereRule(level);
                for (const seed of [1, 7, 42, 99]) {
                    const rounds = buildWhereLevel(level, { maxChoices, maxRounds, random: seeded(seed + level) });
                    assert.equal(rounds.length, Math.min(rule.rounds, maxRounds), `level ${level}: rounds`);
                    const expectedChoices = Math.min(rule.choices, Math.max(2, maxChoices));
                    rounds.forEach((round, i) => {
                        const object = getPlaceObject(round.object)!;
                        assert.ok(getFigure(round.figure), `level ${level}: figure`);
                        assert.ok(rule.targets.includes(round.target), `level ${level}: target ${round.target}`);
                        assert.equal(round.choices.filter((relation) => relation === round.target).length, 1, `level ${level}: target once`);
                        assert.equal(new Set(round.choices).size, round.choices.length, `level ${level}: repeated picture`);
                        assert.equal(round.choices.length, expectedChoices, `level ${level} (${band}): ${round.choices.join(",")} on ${object.id}`);
                        for (const relation of round.choices) assert.ok(object.relations.includes(relation), `level ${level}: ${object.id} cannot show ${relation}`);
                        if (i > 0) {
                            assert.notEqual(round.target, rounds[i - 1].target, `level ${level}: same preposition twice in a row`);
                            assert.notEqual(round.figure, rounds[i - 1].figure, `level ${level}: same toy twice in a row`);
                        }
                    });
                    // Svaki predlog nivoa dođe na red (koliko zadataka dozvoljava)
                    const asked = new Set<Relation>(rounds.map((round) => round.target));
                    assert.ok(asked.size >= Math.min(rule.targets.length, rounds.length), `level ${level}: ${[...asked].join(",")}`);
                }
            }
        });
    }

    it("only offers pictures of positions the child has already met (easy levels: no „iza” among the pictures)", () => {
        for (const level of [1, 2, 3, 4, 5]) {
            for (const seed of [3, 5, 8]) {
                for (const round of buildWhereLevel(level, { maxChoices: 4, maxRounds: 8, random: seeded(seed) })) {
                    for (const relation of round.choices) assert.ok(["in", "on", "under"].includes(relation), `level ${level}: ${relation}`);
                }
            }
        }
    });
});

describe("where game live monitor state", () => {
    it("returns an empty board for missing or garbage state", () => {
        for (const state of [null, undefined, {}, { figure: "dragon", object: "box", target: "in", choices: ["in"] }, { choices: "nope" }] as const) {
            const view = mergeWhereMonitor(state as never);
            assert.equal(view.figure, "");
            assert.deepEqual(view.choices, []);
            assert.equal(view.round, 1);
            assert.equal(view.totalRounds, 1);
        }
    });

    it("keeps a valid round and drops positions the object cannot show or that are not on the board", () => {
        const view = mergeWhereMonitor({
            figure: "cat",
            object: "table",
            target: "under",
            choices: ["under", "on", "in", "under", "nope" as Relation],
            wrong: ["on", "behind", "under"],
            picked: "on",
            feedback: "wrong",
            hint: true,
            round: 9,
            totalRounds: 6,
            score: -3,
            correctCount: 2.7,
        });
        assert.deepEqual(view.choices, ["under", "on"]);
        assert.deepEqual(view.wrong, ["on"]);
        assert.equal(view.picked, "on");
        assert.equal(view.feedback, "wrong");
        assert.equal(view.hint, true);
        assert.equal(view.round, 6);
        assert.equal(view.score, 0);
        assert.equal(view.correctCount, 2);
    });

    it("drops a round whose answer is not among the pictures", () => {
        const view = mergeWhereMonitor({ figure: "cat", object: "box", target: "under", choices: ["in", "on"] });
        assert.equal(view.target, "");
        assert.deepEqual(view.choices, []);
    });
});
