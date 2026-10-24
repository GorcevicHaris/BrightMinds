// Igra „Šta jede?” (app/components/games/data/foodItems.ts): činjenice, rečenice, nivoi i bodovanje.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    alsoQuestion,
    ANIMAL_IDS,
    ANIMALS,
    answerSentence,
    buildFoodLevel,
    clearlyNot,
    eatsSentence,
    emptyFoodView,
    FOOD_IDS,
    FOOD_MAX_LEVEL,
    foodResult,
    foodRule,
    FOODS,
    getAnimal,
    getFood,
    mergeFoodMonitor,
    notQuestion,
    notSentence,
    roundQuestion,
    roundView,
    solvedPair,
    solveFoodView,
    whatQuestion,
    whoQuestion,
    wrongSentence,
    type AnimalId,
    type FoodId,
    type FoodRound,
    type FoodView,
} from "@/app/components/games/data/foodItems";
import { ANIMAL_ART } from "@/app/components/games/food/animals";
import { FOOD_ART } from "@/app/components/games/food/foods";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, sortGamesForChild } from "@/lib/games";
import { toCyrillic } from "@/lib/script";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: FOOD_MAX_LEVEL }, (_, i) => i + 1);
const animal = (id: AnimalId) => getAnimal(id)!;
const food = (id: FoodId) => getFood(id)!;

/** Činjenice koje dete uči (glavna hrana svake životinje) — tabela iz izveštaja */
const FACTS: Record<AnimalId, FoodId> = {
    rabbit: "carrot",
    cat: "fish",
    dog: "bone",
    cow: "grass",
    monkey: "banana",
    bird: "seeds",
    bee: "flower",
    horse: "hay",
    panda: "bamboo",
    squirrel: "nut",
    chicken: "corn",
    frog: "fly",
    mouse: "seeds",
    sheep: "grass",
    bear: "honey",
    goat: "leaves",
    hedgehog: "worm",
    penguin: "fish",
    giraffe: "leaves",
    turtle: "lettuce",
    elephant: "hay",
};

describe("food game facts", () => {
    it("teaches the simple, true main food of every animal", () => {
        assert.deepEqual(Object.fromEntries(ANIMALS.map((a) => [a.id, a.eats[0]])), FACTS);
    });

    it("has unique animals and foods, and every one has its own drawing", () => {
        assert.deepEqual(ANIMALS.map((a) => a.id), [...ANIMAL_IDS]);
        assert.deepEqual(FOODS.map((f) => f.id), [...FOOD_IDS]);
        for (const id of ANIMAL_IDS) {
            assert.ok(ANIMAL_ART[id], `${id}: drawing`);
            assert.ok(ANIMAL_ART[id].draw(false) && ANIMAL_ART[id].draw(true), `${id}: draws`);
            const [x, y] = ANIMAL_ART[id].mouth;
            assert.ok(x > 0 && x < 100 && y > 0 && y < 100, `${id}: mouth inside the picture`);
        }
        for (const id of FOOD_IDS) assert.ok(FOOD_ART[id]?.(), `${id}: drawing`);
        assert.equal(Object.keys(ANIMAL_ART).length, ANIMAL_IDS.length);
        assert.equal(Object.keys(FOOD_ART).length, FOOD_IDS.length);
    });

    it("never lists a food both as eaten and as „maybe”, and every food is someone's food", () => {
        for (const a of ANIMALS) {
            assert.ok(a.eats.length >= 1, a.id);
            assert.equal(new Set([...a.eats, ...a.maybe]).size, a.eats.length + a.maybe.length, `${a.id}: repeated food`);
        }
        for (const f of FOODS) assert.ok(ANIMALS.some((a) => a.eats.includes(f.id)), `${f.id}: nobody eats it`);
    });

    it("keeps the myths and disputed facts out of the wrong answers", () => {
        // Miš i sir: sira nema; jež i jabuka, mačka i trava, pas i šargarepa, konj i šargarepa: nikad „pogrešno”
        assert.ok(!(FOOD_IDS as readonly string[]).includes("cheese"));
        assert.ok(!(FOOD_IDS as readonly string[]).includes("milk"));
        for (const [a, f] of [
            ["hedgehog", "apple"],
            ["cat", "grass"],
            ["dog", "carrot"],
            ["horse", "carrot"],
            ["bee", "honey"],
            ["bear", "fish"],
            ["chicken", "worm"],
            ["monkey", "fly"],
            ["elephant", "bamboo"],
        ] as const) {
            assert.ok(!clearlyNot(animal(a), f), `${a} – ${f} must never be offered as wrong`);
        }
        // A ovo su jasno pogrešni odgovori
        for (const [a, f] of [
            ["rabbit", "bone"],
            ["cow", "fish"],
            ["panda", "bone"],
            ["penguin", "carrot"],
            ["frog", "banana"],
            ["giraffe", "fish"],
        ] as const) {
            assert.ok(clearlyNot(animal(a), f), `${a} – ${f}`);
        }
    });

    it("has the names a child knows, in Ekavian, that can be shown in Cyrillic", () => {
        for (const item of [...ANIMALS, ...FOODS]) {
            assert.match(item.name, /^[A-ZČĆŽŠĐ][a-zčćžšđ]+$/u, item.id);
            assert.doesNotMatch(toCyrillic(item.name), /\p{Script=Latin}/u, item.id);
        }
        for (const f of FOODS) assert.doesNotMatch(`${f.name} ${f.acc} ${f.phrase ?? ""}`, /ije|cvje|mlije|lje[sš]/u, f.id);
        assert.equal(food("flower").name, "Cvet");
        assert.equal(food("leaves").name, "Lišće");
    });
});

describe("food game sentences", () => {
    it("puts the food in the accusative", () => {
        const acc: Record<FoodId, string> = {
            carrot: "šargarepu",
            lettuce: "salatu",
            grass: "travu",
            hay: "seno",
            leaves: "lišće",
            banana: "bananu",
            apple: "jabuku",
            bamboo: "bambus",
            nut: "orah",
            flower: "cvet",
            honey: "med",
            seeds: "seme",
            corn: "kukuruz",
            fish: "ribu",
            bone: "kost",
            fly: "muvu",
            worm: "crva",
        };
        assert.deepEqual(Object.fromEntries(FOODS.map((f) => [f.id, f.acc])), acc);
        // Ženski rod na -a → -u; muški neživo = nominativ; živo (crv) = genitiv; srednji rod = nominativ
        for (const f of FOODS) {
            const nom = f.name.toLocaleLowerCase("sr");
            if (nom.endsWith("a")) assert.equal(f.acc, `${nom.slice(0, -1)}u`, f.id);
            else if (f.id !== "worm") assert.equal(f.acc, nom, f.id);
        }
    });

    it("says literal sentences after a correct answer", () => {
        assert.equal(eatsSentence(animal("rabbit"), food("carrot")), "Zeka jede šargarepu.");
        assert.equal(eatsSentence(animal("cow"), food("grass")), "Krava jede travu.");
        assert.equal(eatsSentence(animal("panda"), food("bamboo")), "Panda jede bambus.");
        assert.equal(eatsSentence(animal("squirrel"), food("nut")), "Veverica jede orah.");
        assert.equal(eatsSentence(animal("monkey"), food("banana")), "Majmun jede bananu.");
        assert.equal(eatsSentence(animal("hedgehog"), food("worm")), "Jež jede crva.");
        assert.equal(eatsSentence(animal("frog"), food("fly")), "Žaba jede muvu.");
        assert.equal(eatsSentence(animal("dog"), food("bone")), "Pas glođe kost.");
        assert.equal(eatsSentence(animal("bee"), food("flower")), "Pčela jede polen iz cveta.");
        assert.equal(notSentence(animal("cat"), food("bamboo")), "Mačka ne jede bambus.");
    });

    it("asks short questions that never name the answer", () => {
        assert.equal(whatQuestion(animal("rabbit")), "Šta jede zeka?");
        assert.equal(whoQuestion(food("bamboo")), "Ko jede bambus?");
        assert.equal(whoQuestion(food("bone")), "Ko glođe kost?");
        assert.equal(notQuestion(animal("cow")), "Šta ne jede krava?");
        assert.equal(alsoQuestion(food("grass")), "Ko još jede travu?");
        assert.equal(roundQuestion({ kind: "also", animal: "cow", food: "grass" }), "Krava jede travu. Ko još jede travu?");
        assert.equal(roundQuestion({ kind: "feed", animal: "", food: "" }), "Daj svakoj životinji njenu hranu.");
        // Glas ne kaže gde da dete dodirne
        for (const level of LEVELS) {
            for (const round of buildFoodLevel(level, { maxChoices: 4, maxRounds: 8, random: seeded(level) })) {
                const question = roundQuestion(round);
                assert.doesNotMatch(question, /dodirni|klikni|levo|desno|gore|dole|ovde/iu, question);
                if (round.kind === "what" || round.kind === "not") {
                    // Cele reči („meda” nije „med”)
                    const words = question.toLocaleLowerCase("sr").replace(/[?.]/g, "").split(/\s+/);
                    for (const id of round.choices) assert.ok(!words.includes(getFood(id)!.acc), `${question} names ${id}`);
                }
            }
        }
    });

    it("answers with the pair that is eating, and wrong picks with a true fact", () => {
        const what = { kind: "what" as const, animal: "rabbit", food: "", answer: "carrot" };
        assert.deepEqual(solvedPair(what), { animal: "rabbit", food: "carrot" });
        assert.equal(answerSentence(what), "Zeka jede šargarepu.");
        assert.equal(wrongSentence(what, "bone"), "Zeka ne glođe kost.");
        const who = { kind: "who" as const, animal: "", food: "bamboo", answer: "panda" };
        assert.equal(answerSentence(who), "Panda jede bambus.");
        assert.equal(wrongSentence(who, "cat"), "Mačka ne jede bambus.");
        const not = { kind: "not" as const, animal: "cow", food: "", answer: "fish" };
        assert.deepEqual(solvedPair(not), { animal: "cow", food: "grass" });
        assert.equal(answerSentence(not), "Krava ne jede ribu. Krava jede travu.");
        assert.equal(wrongSentence(not, "hay"), "Krava jede seno.");
        const also = { kind: "also" as const, animal: "cow", food: "grass", answer: "sheep" };
        assert.equal(answerSentence(also), "Ovca jede travu.");
    });
});

describe("food game levels", () => {
    it("goes from two pictures of familiar animals to reverse questions, odd one out and feeding", () => {
        for (const level of [1, 2, 3, 4, 5]) {
            assert.deepEqual([...foodRule(level).kinds], ["what"], `level ${level}`);
            assert.equal(foodRule(level).choices.what, 2);
            assert.ok(foodRule(level).earlyHint);
        }
        assert.equal(foodRule(1).familiar, 1);
        for (const level of [6, 7, 8, 9, 10]) {
            assert.ok(Object.values(foodRule(level).choices).every((n) => n === 3), `level ${level}: three pictures`);
            assert.ok(!foodRule(level).earlyHint);
        }
        assert.ok(foodRule(7).kinds.includes("who"));
        assert.ok(foodRule(11).kinds.includes("not"));
        assert.ok(foodRule(12).kinds.includes("also"));
        assert.ok(foodRule(13).kinds.includes("feed"));
        assert.equal(foodRule(14).choices.feed, 3);
        assert.deepEqual(new Set(foodRule(15).kinds), new Set(["what", "who", "not", "also", "feed"]));
        assert.equal(foodRule(0), foodRule(1));
        assert.equal(foodRule(99), foodRule(15));
        assert.equal(foodRule(Number.NaN), foodRule(1));
    });

    for (const band of ["young", "middle", "older"] as const) {
        const { maxChoices, maxRounds } = BAND_PRESETS[band];
        it(`builds every level for the ${band} band with exactly one right answer and only clearly wrong distractors`, () => {
            for (const level of LEVELS) {
                const rule = foodRule(level);
                for (const seed of [1, 7, 42, 99, 123]) {
                    const rounds = buildFoodLevel(level, { maxChoices, maxRounds, random: seeded(seed * 31 + level) });
                    assert.equal(rounds.length, Math.min(rule.rounds, maxRounds), `level ${level}: rounds`);
                    const keys = rounds.map((round) => `${round.kind}:${round.kind === "who" || round.kind === "also" ? round.food : round.kind === "feed" ? round.pairs.map((p) => p.animal).sort().join(",") : round.animal}`);
                    assert.equal(new Set(keys).size, keys.length, `level ${level}: repeated question ${keys}`);
                    rounds.forEach((round, i) => {
                        checkRound(round, level, Math.min(rule.choices[round.kind] ?? 2, maxChoices));
                        assert.ok(rule.kinds.includes(round.kind), `level ${level}: ${round.kind}`);
                        // Ista životinja ne dolazi dvaput zaredom
                        if (i > 0 && round.kind !== "feed" && rounds[i - 1].kind !== "feed") {
                            const shownNow = round.kind === "who" ? round.answer : round.animal;
                            const shownBefore = rounds[i - 1].kind === "who" ? rounds[i - 1].answer : rounds[i - 1].animal;
                            assert.notEqual(shownNow, shownBefore, `level ${level}: ${shownNow} twice in a row`);
                        }
                    });
                    // Mešani nivoi: zastupljena je više od jedne vrste zadatka
                    if (rule.kinds.length > 1) assert.ok(new Set(rounds.map((round) => round.kind)).size > 1, `level ${level}: one kind only`);
                }
            }
        });
    }

    it("uses only the most familiar animals and their main food on the first levels", () => {
        for (let seed = 1; seed < 30; seed += 1) {
            for (const round of buildFoodLevel(1, { maxChoices: 3, maxRounds: 5, random: seeded(seed) })) {
                const a = animal(round.animal as AnimalId);
                assert.equal(a.familiar, 1, a.id);
                assert.equal(round.answer, a.eats[0], a.id);
                assert.equal(round.choices.length, 2);
            }
        }
    });

    function checkRound(round: FoodRound, level: number, choices: number) {
        const where = `level ${level} ${round.kind} ${round.animal}${round.food}`;
        assert.equal(new Set(round.choices).size, round.choices.length, `${where}: repeated picture`);
        if (round.kind === "feed") {
            assert.equal(round.pairs.length, Math.max(2, choices), where);
            assert.deepEqual([...round.choices].sort(), round.pairs.map((p) => p.food).sort(), where);
            for (const pair of round.pairs) {
                assert.ok(animal(pair.animal).eats.includes(pair.food), `${where}: ${pair.animal} eats ${pair.food}`);
                // Svaka hrana pripada samo jednoj životinji sa table
                for (const other of round.pairs) if (other !== pair) assert.ok(clearlyNot(animal(other.animal), pair.food), `${where}: ${other.animal} could eat ${pair.food}`);
            }
            return;
        }
        assert.ok(round.choices.includes(round.answer), `${where}: answer shown`);
        if (round.kind === "not") assert.ok(round.choices.length >= Math.min(choices, 3) && round.choices.length <= choices, `${where}: ${round.choices.length} choices`);
        else assert.equal(round.choices.length, Math.max(2, choices), `${where}: choices`);
        if (round.kind === "what") {
            const a = animal(round.animal as AnimalId);
            assert.ok(a.eats.includes(round.answer as FoodId), where);
            for (const id of round.choices) if (id !== round.answer) assert.ok(clearlyNot(a, id as FoodId), `${where}: ${a.id} could eat ${id}`);
        }
        if (round.kind === "not") {
            const a = animal(round.animal as AnimalId);
            assert.ok(clearlyNot(a, round.answer as FoodId), `${where}: odd one`);
            for (const id of round.choices) if (id !== round.answer) assert.ok(a.eats.includes(id as FoodId), `${where}: ${a.id} eats ${id}`);
        }
        if (round.kind === "who" || round.kind === "also") {
            const f = round.food as FoodId;
            assert.ok(animal(round.answer as AnimalId).eats.includes(f), where);
            for (const id of round.choices) if (id !== round.answer) assert.ok(clearlyNot(animal(id as AnimalId), f), `${where}: ${id} could eat ${f}`);
            if (round.kind === "also") {
                assert.ok(animal(round.animal as AnimalId).eats.includes(f), `${where}: shown animal eats it`);
                assert.ok(!round.choices.includes(round.animal), `${where}: shown animal is not a choice`);
            }
        }
    }
});

describe("food game scoring", () => {
    const plan = buildFoodLevel(3, { maxChoices: 3, maxRounds: 5, random: seeded(5) });
    const view = (extra: Partial<FoodView>): FoodView => ({ ...emptyFoodView(5), ...roundView(plan[0]), ...extra });
    const pick = (next: FoodView) => ({ correct: next.correctCount, prompted: next.promptedCount, score: next.score });

    it("does not score the demonstrated first task of level 1", () => {
        const { next, modeled, firstTry } = solveFoodView(view({ round: 1 }), 1);
        assert.ok(modeled && !firstTry);
        assert.deepEqual(pick(next), { correct: 0, prompted: 0, score: 5 });
        assert.equal(solveFoodView(view({ round: 1, hint: true }), 1).next.promptedCount, 0);
        assert.equal(solveFoodView(view({ round: 1 }), 2).next.correctCount, 1);
    });

    it("counts first-try answers as correct, hinted ones as prompted, and neither after a plain miss", () => {
        assert.deepEqual(pick(solveFoodView(view({ round: 2 }), 1).next), { correct: 1, prompted: 0, score: 10 });
        assert.deepEqual(pick(solveFoodView(view({ round: 2, hint: true }), 1).next), { correct: 0, prompted: 1, score: 5 });
        assert.deepEqual(pick(solveFoodView(view({ round: 2, wrong: ["bone"] }), 1).next), { correct: 0, prompted: 0, score: 5 });
        assert.deepEqual(pick(solveFoodView(view({ round: 2, wrong: ["fish>rabbit"], hint: true }), 13).next), { correct: 0, prompted: 1, score: 5 });
    });

    it("never reports more correct and prompted answers than scored tasks", () => {
        for (const level of [1, 2, 13, 15]) {
            for (const pattern of [
                [false, false, false, false, false],
                [true, true, true, true, true],
                [false, true, false, true, false],
            ]) {
                let current = view({});
                pattern.forEach((hint, i) => {
                    current = solveFoodView({ ...current, round: i + 1, hint, wrong: [], feedback: null }, level).next;
                });
                const result = foodResult(current, level, 30);
                assert.equal(result.total, level === 1 ? 4 : 5);
                assert.ok(result.correct + (result.prompted ?? 0) <= result.total, `level ${level}: ${JSON.stringify(result)}`);
            }
        }
    });
});

describe("food game live monitor state", () => {
    it("returns an empty board for missing or garbage state", () => {
        for (const state of [null, undefined, {}, { kind: "what", animal: "unicorn", answer: "carrot", choices: ["carrot"] }, { kind: "who", food: "carrot", answer: "rabbit", choices: "rabbit" }] as const) {
            const shown = mergeFoodMonitor(state as never);
            assert.deepEqual(shown.choices, []);
            assert.equal(shown.answer, "");
            assert.equal(shown.totalRounds, 1);
        }
    });

    it("keeps known pictures only, wrong picks only from the board, and a valid feeding board", () => {
        const shown = mergeFoodMonitor({ kind: "what", animal: "rabbit", answer: "carrot", choices: ["carrot", "bone", "pizza", "bone"], wrong: ["bone", "fish", "carrot"], picked: "bone", feedback: "wrong", round: 3, totalRounds: 5, promptedCount: Number.NaN });
        assert.deepEqual(shown.choices, ["carrot", "bone"]);
        assert.deepEqual(shown.wrong, ["bone"]);
        assert.equal(shown.picked, "bone");
        assert.equal(shown.round, 3);
        assert.equal(shown.promptedCount, 0);

        const feed = mergeFoodMonitor({
            kind: "feed",
            choices: ["bamboo", "carrot"],
            pairs: [
                { animal: "panda", food: "bamboo" },
                { animal: "rabbit", food: "carrot" },
            ],
            fed: ["carrot", "carrot", "pizza"],
            selected: "bamboo",
            wrong: ["bamboo>rabbit", "<script>"],
        });
        assert.equal(feed.kind, "feed");
        assert.equal(feed.pairs.length, 2);
        assert.deepEqual(feed.fed, ["carrot"]);
        assert.equal(feed.selected, "bamboo");
        assert.deepEqual(feed.wrong, ["bamboo>rabbit"]);
        // Pitanje se ponovo gradi iz podataka, pa monitor prikazuje isti tekst kao dete
        assert.equal(roundQuestion(feed), "Daj svakoj životinji njenu hranu.");
    });
});

describe("food game registry entry", () => {
    const game = getGame("food");

    it("is activity 17, for ages 3–7, with its own colour, cover and tip for the adult", () => {
        assert.equal(game.id, "food");
        assert.equal(game.activityId, 17);
        assert.equal(game.title, "Šta jede?");
        assert.equal(game.skill, "Razumevanje govora i svet oko nas");
        assert.equal(game.icon, "🥕");
        assert.deepEqual(game.ages, { min: 3, max: 7 });
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        assert.match(readFileSync(path.join(process.cwd(), "public", game.image), "utf8"), /^<svg[^>]+viewBox="0 0 1380 752"/);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        assert.match(game.offscreenTip, /Šta jede/);
    });

    it("comes before „Čemu služi?” (it is the easier listening game)", () => {
        const order = sortGamesForChild(GAMES, null).map((g) => g.id);
        assert.ok(order.indexOf("food") < order.indexOf("uses"));
        assert.ok(order.indexOf("food") > order.indexOf("shapes"));
    });

    it("has a migration that adds activity 17 in the cognitive category", () => {
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0012_food_game.sql"), "utf8");
        assert.match(sql, /\(17, 'Šta jede\?', '[^']+', 'cognitive'/);
        assert.match(sql, /on conflict \(id\) do update/);
    });
});
