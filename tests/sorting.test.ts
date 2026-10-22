import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { basketFor, belongsTo, buildSortLevel, getSortItem, ruleForLevel, SORT_ITEMS, SORT_MAX_LEVEL } from "@/app/components/games/data/sortingItems";
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
            assert.ok(item.emoji && item.name.trim(), item.id);
            assert.ok(item.color || item.category, item.id);
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
        assert.equal(ruleForLevel(5).kind, "color");
        assert.equal(ruleForLevel(6).kind, "category");
        assert.ok(ruleForLevel(14).baskets > ruleForLevel(1).baskets);
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
                    // Svaka korpa dobije bar jedan predmet
                    for (const basket of built.baskets) assert.ok(built.rounds.some((round) => belongsTo(getSortItem(round.itemId)!, basket)), `level ${level}: empty ${basket}`);
                }
            }
        });
    }
});
