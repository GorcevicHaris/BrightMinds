import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { basketFor, belongsTo, buildSortLevel, getSortItem, isBasketId, ruleForLevel, ruleIntro, SORT_ITEMS, SORT_MAX_LEVEL, type BasketId } from "@/app/components/games/data/sortingItems";
import { BAND_PRESETS } from "@/lib/childSettings";

/** Stalan „slučajan” niz, da testovi uvek dobiju isti raspored */
function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: SORT_MAX_LEVEL }, (_, i) => i + 1);

describe("sorting game content", () => {
    it("has unique items, each with a name, an emoji and something to sort by", () => {
        const ids = SORT_ITEMS.map((item) => item.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const item of SORT_ITEMS) {
            assert.ok((item.emoji || item.shape) && item.name.trim(), item.id);
            assert.ok(item.color || item.category || item.shape || item.eat !== undefined || item.season || item.where, item.id);
            assert.equal(item.name, item.name.toLocaleLowerCase("sr"), `${item.id}: name is lowercase`);
        }
    });

    it("describes items in correct Serbian: color agrees with gender, category is a noun", () => {
        assert.equal(basketFor("color:yellow").describe(getSortItem("banana")!), "žuta");
        assert.equal(basketFor("color:red").describe(getSortItem("tomato")!), "crven");
        assert.equal(basketFor("color:green").describe(getSortItem("leaf")!), "zelena");
        assert.equal(basketFor("color:blue").describe(getSortItem("heart-blue")!), "plavo");
        assert.equal(basketFor("category:animals").describe(getSortItem("dog")!), "životinja");
    });

    it("sorts by color first, then by kind, with more baskets later (VB-MAPP order)", () => {
        assert.equal(ruleForLevel(1).kind, "color");
        assert.equal(ruleForLevel(2).kind, "shape");
        assert.equal(ruleForLevel(4).kind, "shape");
        assert.equal(ruleForLevel(5).kind, "color");
        assert.equal(ruleForLevel(6).kind, "category");
        assert.ok(ruleForLevel(14).baskets > ruleForLevel(1).baskets);
    });

    it("makes shape levels about shape, not color: each shape basket gets shapes of different colors", () => {
        for (const seed of [3, 9, 27]) {
            const built = buildSortLevel(4, { maxBaskets: 3, maxRounds: 6, random: seeded(seed) });
            assert.ok(built.baskets.every((basket) => basket.startsWith("shape:")));
            const items = built.rounds.map((round) => getSortItem(round.itemId)!);
            assert.ok(items.every((item) => item.shape), "only drawn shapes");
            assert.ok(new Set(items.map((item) => item.color)).size >= 2, `seed ${seed}: colors vary`);
        }
        assert.equal(basketFor("shape:star").describe(getSortItem("shape-star-red")!), "zvezda");
        assert.equal(basketFor("color:red").describe(getSortItem("shape-circle-red")!), "crven");
    });

    for (const band of ["young", "middle", "older"] as const) {
        const { maxChoices, maxRounds } = BAND_PRESETS[band];
        it(`builds every level for the ${band} band: each item fits exactly one basket, no repeats`, () => {
            for (const level of LEVELS) {
                for (const seed of [1, 7, 42]) {
                    const built = buildSortLevel(level, { maxBaskets: maxChoices, maxRounds, random: seeded(seed + level) });
                    assert.ok(built.baskets.length >= 2 && built.baskets.length <= Math.max(2, maxChoices), `level ${level}: baskets`);
                    assert.ok(built.rounds.length >= built.baskets.length, `level ${level}: rounds ${built.rounds.length}`);
                    assert.ok(built.rounds.length <= maxRounds, `level ${level}: too many rounds`);
                    const ids = built.rounds.map((round) => round.itemId);
                    assert.equal(new Set(ids).size, ids.length, `level ${level}: repeated item`);
                    for (const round of built.rounds) {
                        const item = getSortItem(round.itemId)!;
                        assert.equal(built.baskets.filter((basket) => belongsTo(item, basket)).length, 1, `level ${level}: ${item.id}`);
                        if (level <= 10) assert.ok(!item.hard, `level ${level}: ${item.id} is too hard`);
                    }
                    // Primer u korpi pripada toj korpi i ne ponavlja se kao zadatak
                    for (const [basket, itemId] of Object.entries(built.models) as [BasketId, string][]) {
                        assert.ok(built.baskets.includes(basket), `level ${level}: model outside`);
                        assert.ok(belongsTo(getSortItem(itemId)!, basket), `level ${level}: ${itemId} is not ${basket}`);
                        assert.ok(!ids.includes(itemId), `level ${level}: model ${itemId} repeats as a task`);
                    }
                    if (built.support === "model") assert.equal(Object.keys(built.models).length, built.baskets.length, `level ${level}: every basket has a model`);
                    else assert.deepEqual(built.models, {}, `level ${level}: no models`);
                    // Svaka korpa dobije bar jedan predmet
                    for (const basket of built.baskets) assert.ok(built.rounds.some((round) => belongsTo(getSortItem(round.itemId)!, basket)), `level ${level}: empty ${basket}`);
                }
            }
        });
    }

    it("fades the help on the baskets: a model in each basket → picture and name → name only", () => {
        assert.equal(ruleForLevel(1).support, "model");
        assert.equal(ruleForLevel(2).support, "model");
        assert.equal(ruleForLevel(3).support, "label");
        assert.equal(ruleForLevel(6).support, "model", "a new way of sorting starts with a model");
        assert.equal(ruleForLevel(7).support, "label");
        assert.equal(ruleForLevel(12).support, "model");
        assert.equal(ruleForLevel(13).support, "text");
        assert.equal(ruleForLevel(15).support, "text");
        // Samo natpis tek na teškim nivoima, i nikad za boje i oblike
        for (const level of LEVELS) {
            const rule = ruleForLevel(level);
            if (rule.support === "text") assert.ok(level >= 11 && (rule.kind === "rule" || rule.kind === "category"), `level ${level}`);
        }
        // Svaki nivo je drugačiji od prethodnog
        for (const level of LEVELS.slice(1)) assert.notDeepEqual({ ...ruleForLevel(level), level: 0 }, { ...ruleForLevel(level - 1), level: 0 }, `level ${level}`);
        assert.equal(ruleForLevel(0), ruleForLevel(1));
        assert.equal(ruleForLevel(99), ruleForLevel(15));
    });

    it("sorts by rules that are not seen at a glance: eat or not, summer or winter, air, water or land", () => {
        assert.deepEqual(buildSortLevel(12, { maxBaskets: 4, maxRounds: 8, random: seeded(3) }).baskets, ["rule:eat", "rule:noEat"]);
        assert.deepEqual(buildSortLevel(13, { maxBaskets: 4, maxRounds: 8, random: seeded(3) }).baskets, ["rule:summer", "rule:winter"]);
        assert.deepEqual(buildSortLevel(14, { maxBaskets: 4, maxRounds: 8, random: seeded(3) }).baskets, ["rule:air", "rule:water", "rule:land"]);
        assert.equal(buildSortLevel(14, { maxBaskets: 4, maxRounds: 8, random: seeded(3) }).intro, "Šta leti u vazduhu, šta je u vodi, a šta ide po zemlji?");
        assert.equal(ruleIntro(["rule:summer", "rule:winter"]), "Šta je za leto, a šta za zimu?");
        const yes = (basket: BasketId, id: string) => basketFor(basket).yes(getSortItem(id)!);
        const no = (basket: BasketId, id: string) => basketFor(basket).no(getSortItem(id)!);
        assert.equal(yes("rule:eat", "apple-red"), "Jabuka se jede.");
        assert.equal(yes("rule:noEat", "ball"), "Lopta se ne jede.");
        assert.equal(no("rule:eat", "ball"), "Lopta se ne jede.");
        assert.equal(yes("rule:summer", "ice-cream"), "Sladoled je za leto.");
        assert.equal(no("rule:summer", "scarf"), "Šal nije za leto.");
        assert.equal(yes("rule:air", "plane"), "Avion leti.");
        assert.equal(yes("rule:water", "boat"), "Brod plovi po vodi.");
        assert.equal(yes("rule:land", "dog"), "Pas ide po zemlji.");
        assert.equal(no("rule:air", "boat"), "Brod ne leti.");
        assert.equal(yes("color:yellow", "banana"), "Banana je žuta.");
        assert.equal(no("category:fruit", "dog"), "Pas nije voće.");
        assert.equal(yes("shape:star", "shape-star-red"), "To je zvezda.");
        assert.equal(yes("category:music", "guitar"), "Gitara je muzički instrument.");
        // Uz „šta se jede” nema životinja
        for (const item of SORT_ITEMS) if (item.eat !== undefined) assert.notEqual(item.category, "animals", item.id);
        assert.ok(isBasketId("rule:water") && !isBasketId("rule:fire"));
    });

    it("has enough typical items in every category and rule for a model plus the tasks", () => {
        for (const level of LEVELS) {
            const built = buildSortLevel(level, { maxBaskets: 4, maxRounds: 8, random: seeded(level) });
            assert.ok(built.rounds.length >= Math.min(ruleForLevel(level).rounds, 8) - 1, `level ${level}: only ${built.rounds.length} tasks`);
        }
        for (const category of ["fruit", "animals", "vehicles", "clothes", "toys", "music", "school"]) {
            assert.ok(SORT_ITEMS.filter((item) => item.category === category && !item.hard).length >= 4, category);
        }
    });

    it("says every sentence in Ekavian and never tells where to tap", () => {
        for (const level of LEVELS) {
            const built = buildSortLevel(level, { maxBaskets: 4, maxRounds: 8, random: seeded(level + 5) });
            for (const round of built.rounds) {
                const item = getSortItem(round.itemId)!;
                for (const basket of built.baskets) {
                    for (const text of [basketFor(basket).yes(item), basketFor(basket).no(item)]) {
                        assert.doesNotMatch(text, /\b(levo|desno|gore|dole|dodirni|klikni)\b/iu, text);
                        assert.match(text, /^[A-ZČĆŽŠĐ].*\.$/u, text);
                    }
                }
            }
        }
    });
});
