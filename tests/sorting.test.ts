import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
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
            assert.ok(item.color || item.category || item.shape || item.size || item.use || item.eat !== undefined || item.season || item.where, item.id);
            assert.equal(item.name, item.name.toLocaleLowerCase("sr"), `${item.id}: name is lowercase`);
        }
    });

    it("describes items in correct Serbian: color agrees with gender, category is a noun", () => {
        assert.equal(basketFor("color:yellow").describe(getSortItem("banana")!), "žuta");
        assert.equal(basketFor("color:red").describe(getSortItem("tomato")!), "crven");
        assert.equal(basketFor("color:green").describe(getSortItem("leaf")!), "zelena");
        assert.equal(basketFor("color:blue").describe(getSortItem("heart-blue")!), "plavo");
        assert.equal(basketFor("category:animals").describe(getSortItem("dog")!), "životinja");
        // Veliko i malo se slaže sa rodom predmeta
        const yes = (basket: BasketId, id: string) => basketFor(basket).yes(getSortItem(id)!);
        assert.equal(yes("size:big", "size-ball-big"), "Lopta je velika.");
        assert.equal(yes("size:small", "size-car-small"), "Auto je mali.");
        assert.equal(yes("size:small", "size-egg-small"), "Jaje je malo.");
        assert.equal(yes("size:big", "size-teddy-big"), "Meda je veliki.");
        assert.equal(basketFor("size:big").no(getSortItem("size-egg-small")!), "Jaje nije veliko.");
        assert.equal(basketFor("size:small").no(getSortItem("size-house-big")!), "Kuća nije mala.");
        assert.equal(yes("same:apple-red", "apple-red"), "Ista slika: jabuka.");
        assert.equal(basketFor("same:apple-red").no(getSortItem("ball")!), "To nije ista slika.");
        assert.equal(basketFor("same:ball").label, "Lopta");
        assert.equal(basketFor("same:ball").emoji, "⚽");
    });

    it("follows the planned level table: same picture first, then color, shape, size, kinds and rules", () => {
        const table = LEVELS.map((level) => {
            const { kind, baskets, support, hard, group } = ruleForLevel(level);
            return [kind === "rule" ? `rule:${group}` : kind, baskets, support, hard ? "hard" : ""].join(" ").trim();
        });
        assert.deepEqual(table, [
            "same 2 model",
            "color 2 model",
            "shape 2 model",
            "size 2 model",
            "color 3 label",
            "shape 3 label",
            "category 2 model",
            "category 3 label",
            "color 4 label",
            "category 4 label",
            "category 3 label hard",
            "rule:eat 2 model",
            "rule:use 3 model",
            "rule:where 3 text",
            "category 4 text hard",
        ]);
        // Tri stepena po pet nivoa; broj zadataka raste blago (5–8)
        for (const level of LEVELS) assert.ok(ruleForLevel(level).rounds >= 5 && ruleForLevel(level).rounds <= 8, `level ${level}`);
        assert.ok(ruleForLevel(1).rounds <= ruleForLevel(15).rounds);
    });

    it("matches identical pictures: the answer is the basket with the same picture, a copy waits there as a model", () => {
        for (const seed of [1, 7, 42]) {
            const built = buildSortLevel(1, { maxBaskets: 3, maxRounds: 5, random: seeded(seed) });
            assert.equal(built.kind, "same");
            assert.equal(built.baskets.length, 2);
            assert.notEqual(built.baskets[0], built.baskets[1]);
            for (const round of built.rounds) {
                const item = getSortItem(round.itemId)!;
                assert.equal(built.baskets.filter((basket) => belongsTo(item, basket))[0], `same:${item.id}`);
                assert.ok(item.emoji, item.id);
            }
            for (const [basket, itemId] of Object.entries(built.models) as [BasketId, string][]) assert.equal(basket, `same:${itemId}`);
            assert.equal(Object.keys(built.models).length, 2);
        }
        assert.ok(isBasketId("same:apple-red") && !isBasketId("same:nothing") && !isBasketId("same:shape-circle-red"));
    });

    it("shows the same object both big and small, and size levels use only those pictures", () => {
        const sized = SORT_ITEMS.filter((item) => item.size);
        const names = new Set(sized.map((item) => item.name));
        assert.ok(names.size >= 6, "enough objects");
        for (const name of names) {
            const both = sized.filter((item) => item.name === name);
            assert.deepEqual(both.map((item) => item.size).sort(), ["big", "small"], name);
            assert.equal(new Set(both.map((item) => item.emoji)).size, 1, `${name}: same picture`);
            // Bez boje i vrste: ovi predmeti ne dolaze u druge nivoe
            for (const item of both) assert.ok(!item.color && !item.category && !item.shape, item.id);
        }
        for (const seed of [2, 5, 11]) {
            const built = buildSortLevel(4, { maxBaskets: 3, maxRounds: 6, random: seeded(seed) });
            assert.deepEqual([...built.baskets].sort(), ["size:big", "size:small"]);
            assert.ok(built.rounds.every((round) => getSortItem(round.itemId)!.size));
        }
    });

    it("starts with the same picture, then one visible property, then kinds, with more baskets later (VB-MAPP order)", () => {
        assert.equal(ruleForLevel(1).kind, "same");
        assert.deepEqual([2, 3, 4].map((level) => ruleForLevel(level).kind), ["color", "shape", "size"]);
        // Prvih pet nivoa: samo ono što se vidi; pravila tek u poslednjem stepenu
        for (const level of LEVELS) if (ruleForLevel(level).kind === "rule") assert.ok(level >= 11, `level ${level}`);
        assert.ok(ruleForLevel(14).baskets > ruleForLevel(1).baskets);
    });

    it("makes shape levels about shape, not color: each shape basket gets shapes of different colors", () => {
        for (const seed of [3, 9, 27]) {
            const built = buildSortLevel(6, { maxBaskets: 3, maxRounds: 6, random: seeded(seed) });
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
                    // Kod iste slike se isti predmet namerno ponavlja
                    if (built.kind !== "same") assert.equal(new Set(ids).size, ids.length, `level ${level}: repeated item`);
                    for (const round of built.rounds) {
                        const item = getSortItem(round.itemId)!;
                        assert.equal(built.baskets.filter((basket) => belongsTo(item, basket)).length, 1, `level ${level}: ${item.id}`);
                        if (level <= 10) assert.ok(!item.hard, `level ${level}: ${item.id} is too hard`);
                    }
                    // Primer u korpi pripada toj korpi i ne ponavlja se kao zadatak
                    for (const [basket, itemId] of Object.entries(built.models) as [BasketId, string][]) {
                        assert.ok(built.baskets.includes(basket), `level ${level}: model outside`);
                        assert.ok(belongsTo(getSortItem(itemId)!, basket), `level ${level}: ${itemId} is not ${basket}`);
                        if (built.kind !== "same") assert.ok(!ids.includes(itemId), `level ${level}: model ${itemId} repeats as a task`);
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
        // Svaka nova vrsta razvrstavanja počinje primerom u korpi (pravila: prvo „šta se jede”)
        const firstOfKind = new Map<string, number>();
        for (const level of LEVELS) {
            const { kind } = ruleForLevel(level);
            if (!firstOfKind.has(kind)) firstOfKind.set(kind, level);
        }
        for (const [key, level] of firstOfKind) assert.equal(ruleForLevel(level).support, "model", `${key} starts with a model (level ${level})`);
        assert.equal(ruleForLevel(5).support, "label");
        assert.equal(ruleForLevel(14).support, "text");
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

    it("sorts by rules that are not seen at a glance: eat or not, what it is for, air, water or land", () => {
        assert.deepEqual(buildSortLevel(12, { maxBaskets: 4, maxRounds: 8, random: seeded(3) }).baskets, ["rule:eat", "rule:noEat"]);
        assert.deepEqual(buildSortLevel(13, { maxBaskets: 4, maxRounds: 8, random: seeded(3) }).baskets, ["rule:meal", "rule:wash", "rule:draw"]);
        assert.equal(buildSortLevel(13, { maxBaskets: 4, maxRounds: 8, random: seeded(3) }).intro, "Čime jedemo, čime se peremo, a čime crtamo?");
        assert.deepEqual(buildSortLevel(14, { maxBaskets: 4, maxRounds: 8, random: seeded(3) }).baskets, ["rule:air", "rule:water", "rule:land"]);
        assert.equal(buildSortLevel(14, { maxBaskets: 4, maxRounds: 8, random: seeded(3) }).intro, "Šta leti u vazduhu, šta je u vodi, a šta ide po zemlji?");
        assert.equal(ruleIntro(["rule:summer", "rule:winter"]), "Šta je za leto, a šta za zimu?");
        const yes = (basket: BasketId, id: string) => basketFor(basket).yes(getSortItem(id)!);
        const no = (basket: BasketId, id: string) => basketFor(basket).no(getSortItem(id)!);
        assert.equal(yes("rule:eat", "apple-red"), "Jabuka se jede.");
        assert.equal(yes("rule:noEat", "ball"), "Lopta se ne jede.");
        assert.equal(no("rule:eat", "ball"), "Lopta se ne jede.");
        assert.equal(yes("rule:summer", "ice-cream"), "Sladoled je za leto.");
        assert.equal(yes("rule:meal", "spoon"), "Kašika je za jelo.");
        assert.equal(yes("rule:wash", "toothbrush"), "Četkica za zube je za pranje.");
        assert.equal(yes("rule:draw", "pencil"), "Olovka je za crtanje.");
        assert.equal(no("rule:meal", "soap"), "Sapun nije za jelo.");
        assert.equal(ruleIntro(["rule:meal", "rule:wash", "rule:draw"]), "Čime jedemo, čime se peremo, a čime crtamo?");
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
        // Namena: primer i bar tri zadatka u svakoj korpi; nijedan predmet nije u dve korpe
        for (const use of ["meal", "wash", "draw"] as const) {
            const items = SORT_ITEMS.filter((item) => item.use === use);
            assert.ok(items.length >= 4, use);
            assert.ok(items.every((item) => !item.hard && item.emoji), use);
        }
        const names = SORT_ITEMS.filter((item) => item.use).map((item) => item.name);
        assert.equal(new Set(names).size, names.length, "no two use items share a name");
        // Predmet za namenu nosi ime koje drugi predmet sa drugim emodžijem nema (npr. lenjir ostaje školski pribor)
        for (const item of SORT_ITEMS.filter((it) => it.use)) {
            for (const other of SORT_ITEMS) if (other.name === item.name && !other.size) assert.equal(other.emoji, item.emoji, `${item.id} / ${other.id}`);
        }
    });

    it("says every sentence in Ekavian and never tells where to tap", () => {
        for (const level of LEVELS) {
            const built = buildSortLevel(level, { maxBaskets: 4, maxRounds: 8, random: seeded(level + 5) });
            for (const round of built.rounds) {
                const item = getSortItem(round.itemId)!;
                for (const basket of built.baskets) {
                    for (const text of [basketFor(basket).yes(item), basketFor(basket).no(item)]) {
                        assert.doesNotMatch(text, /(^|\s)(levo|desno|gore|dole|dodirni|pritisni|klikni|prevuci)(\s|[.,!?]|$)/iu, text);
                        assert.match(text, /^[A-ZČĆŽŠĐ].*\.$/u, text);
                    }
                }
            }
        }
    });
});

describe("veliko / malo ima sa čim da se poredi", () => {
    it("pored predmeta stoji isti predmet u drugoj veličini (bledo, nije za dodir)", () => {
        const source = readFileSync(path.join(process.cwd(), "app/components/games/SortingGame.tsx"), "utf8");
        const ghost = source.slice(source.indexOf('shown.kind === "size" && item.size && ('), source.indexOf("key={`${shown.round}-${item.id}`}"));
        assert.match(ghost, /aria-hidden="true"/);
        assert.match(ghost, /pointer-events-none/);
        assert.match(ghost, /size: item\.size === "big" \? "small" : "big"/);
    });
});
