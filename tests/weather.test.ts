// Igra „Obuci se” (app/components/games/data/weatherLevels.ts): odeća i vreme, kompleti,
// nivoi, redosled oblačenja, rečenice, bodovanje i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    buildWeatherLevel,
    CLOTHES,
    CLOTHING_IDS,
    DRESS_BEFORE,
    dressingOrder,
    dressQuestion,
    emptyWeatherView,
    fitsScene,
    getClothing,
    kitBase,
    mergeWeatherMonitor,
    mustComeFirst,
    nextNeeded,
    orderSentence,
    readySentence,
    refusalSentence,
    SCENES,
    solveWeatherView,
    tryWear,
    weatherResult,
    WEATHER_LEVELS,
    WEATHER_MAX_LEVEL,
    WEEKDAYS,
    whenAnswer,
    whenMistake,
    whenQuestion,
    WHEN_ITEMS,
    wornSentence,
    type ClothingId,
    type DressRound,
    type Kit,
    type SceneId,
    type WeatherView,
    type WhenRound,
} from "@/app/components/games/data/weatherLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde|tamo gore|levo|desno/i;

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

function allKits(scene: (typeof SCENES)[number]): Kit[] {
    return [...scene.one.map((id) => ({ add: [id] })), ...scene.two.map((add) => ({ add })), ...scene.outfit, ...scene.order];
}

function plans(level: number) {
    const result: { where: string; rounds: ReturnType<typeof buildWeatherLevel>; maxChoices: number }[] = [];
    for (const preset of Object.values(BAND_PRESETS)) {
        for (let seed = 1; seed <= 6; seed += 1) {
            result.push({ where: `L${level} ${preset.label} s${seed}`, rounds: buildWeatherLevel(level, { maxRounds: preset.maxRounds, maxChoices: preset.maxChoices, random: seeded(seed * 31 + level) }), maxChoices: preset.maxChoices });
        }
    }
    return result;
}

describe("weather clothes", () => {
    it("has a name, a label, a reason and its own picture slot for every item", () => {
        assert.equal(new Set(CLOTHES.map((item) => item.id)).size, CLOTHES.length);
        assert.deepEqual(CLOTHES.map((item) => item.id).sort(), [...CLOTHING_IDS].sort());
        for (const item of CLOTHES) {
            assert.ok(item.name && item.label && item.acc && item.why, item.id);
            assert.ok(item.for.length > 0, `${item.id}: za šta je`);
            assert.ok(!item.for.some((condition) => item.against.includes(condition)), `${item.id}: i za i protiv istog vremena`);
            assert.doesNotMatch(toCyrillic(item.why), /\p{Script=Latin}/u, item.id);
        }
    });

    it("dresses in a sensible order (socks before shoes, t-shirt before jacket)", () => {
        assert.deepEqual(mustComeFirst("snowBoots", ["snowBoots", "socks", "jacket"]), ["socks"]);
        assert.deepEqual(mustComeFirst("jacket", ["jacket", "tshirt", "sweater"]).sort(), ["sweater", "tshirt"]);
        assert.deepEqual(mustComeFirst("jacket", ["jacket", "beanie"]), []);
        for (const [first, then] of DRESS_BEFORE) assert.ok(getClothing(first) && getClothing(then) && first !== then);
        const order = dressingOrder(["jacket", "snowBoots", "tshirt", "socks", "sweater"]);
        for (const [first, then] of DRESS_BEFORE) {
            if (order.includes(first) && order.includes(then)) assert.ok(order.indexOf(first) < order.indexOf(then), `${first} pre ${then}`);
        }
    });
});

describe("weather scenes and kits", () => {
    it("asks only for clothes that fit the weather, and offers only clothes that clearly do not", () => {
        for (const scene of SCENES) {
            for (const id of scene.wear) assert.ok(fitsScene(id, scene.id), `${scene.id}: ${id} ide uz ovo vreme`);
            assert.ok(scene.distractors.length >= 3, `${scene.id}: dovoljno pogrešnih stvari`);
            for (const id of scene.distractors) {
                assert.ok(!fitsScene(id, scene.id), `${scene.id}: ${id} ne sme da odgovara`);
                assert.ok(!scene.wear.includes(id), `${scene.id}: ${id} je i u odeći`);
            }
            // Ključne stvari sa prvog nivoa: kapa za sunce, kišobran za kišu, rukavice za sneg
            assert.equal(scene.one.length > 0, true);
        }
        const key = (id: SceneId) => SCENES.find((scene) => scene.id === id)!.one[0];
        assert.equal(key("sun"), "sunCap");
        assert.equal(key("rain"), "umbrella");
        assert.equal(key("snow"), "gloves");
    });

    it("builds every kit from one body: no two items on the same spot, nothing worn too early", () => {
        for (const scene of SCENES) {
            for (const kit of allKits(scene)) {
                const where = `${scene.id}: ${kit.add.join(", ")}`;
                const base = kitBase(scene.id, kit);
                const all = [...base, ...kit.add];
                assert.equal(new Set(all).size, all.length, `${where}: dvaput ista stvar`);
                const slots = all.map((id) => getClothing(id)!.slot);
                assert.equal(new Set(slots).size, slots.length, `${where}: dve stvari na istom mestu`);
                for (const id of all) assert.ok(fitsScene(id, scene.id), `${where}: ${id}`);
                // Već obučeno ne sme da bude nešto što ide posle stvari koju dete tek oblači
                for (const [first, then] of DRESS_BEFORE) assert.ok(!(kit.add.includes(first) && base.includes(then)), `${where}: ${then} je već obučen, a ${first} ide pre`);
            }
            for (const kit of scene.order) {
                assert.ok(
                    DRESS_BEFORE.some(([first, then]) => kit.add.includes(first) && kit.add.includes(then)),
                    `${scene.id}: komplet za redosled mora da ima bar jedan par (${kit.add.join(", ")})`
                );
            }
        }
    });
});

describe("weather levels", () => {
    it("has fifteen levels in three tiers", () => {
        assert.equal(WEATHER_MAX_LEVEL, 15);
        assert.equal(WEATHER_LEVELS.length, MAX_LEVEL);
        assert.ok(WEATHER_LEVELS.slice(0, 5).every((rule) => rule.earlyHint));
        assert.ok(WEATHER_LEVELS.slice(5).every((rule) => !rule.earlyHint));
    });

    it("builds every level for every age band: solvable, with at least one wrong item, within the choice limit", () => {
        for (const level of LEVELS) {
            const rule = WEATHER_LEVELS[level - 1];
            for (const { where, rounds, maxChoices } of plans(level)) {
                assert.ok(rounds.length >= 2, where);
                rounds.forEach((round, index) => {
                    const at = `${where} z${index + 1}`;
                    if (round.task === "when") {
                        const entry = WHEN_ITEMS.find((item) => item.item === round.item)!;
                        assert.equal(round.answer, entry.answer, at);
                        assert.ok(round.choices.includes(round.answer), at);
                        assert.equal(new Set(round.choices).size, round.choices.length, at);
                        assert.ok(round.choices.length >= 2 && round.choices.length <= Math.max(2, maxChoices), at);
                        // Samo jedno vreme je tačno
                        for (const choice of round.choices) if (choice !== round.answer) assert.ok(!getClothing(round.item)!.for.includes(choice), `${at}: ${choice}`);
                        return;
                    }
                    assert.ok(rule.scenes.includes(round.scene), at);
                    const misses = round.tray.filter((id) => !round.need.includes(id));
                    assert.ok(misses.length >= 1, `${at}: bar jedna pogrešna stvar`);
                    assert.ok(round.tray.length <= Math.max(maxChoices, round.need.length + 1), `${at}: previše izbora (${round.tray.length})`);
                    assert.deepEqual([...round.need].sort(), round.tray.filter((id) => round.need.includes(id)).sort(), `${at}: sve prave stvari su u korpi`);
                    for (const id of misses) assert.ok(!fitsScene(id, round.scene), `${at}: ${id} ne sme da odgovara`);
                    for (const id of round.need) assert.ok(fitsScene(id, round.scene), `${at}: ${id}`);
                    assert.equal(round.order, rule.order, at);
                    // Prava odeća može da se obuče do kraja (redom), pogrešna nikad
                    let view = { need: round.need, worn: [] as string[], order: round.order };
                    for (const id of dressingOrder(round.need)) {
                        assert.equal(tryWear(view, id).result, "ok", `${at}: ${id}`);
                        view = { ...view, worn: [...view.worn, id] };
                    }
                    for (const id of misses) assert.equal(tryWear(view, id).result, "weather", `${at}: ${id}`);
                });
                if (rule.task === "dress") {
                    const scenes = rounds.map((round) => (round as DressRound).scene);
                    for (let i = 1; i < scenes.length; i += 1) if (rule.scenes.length > 1) assert.notEqual(scenes[i], scenes[i - 1], `${where}: isto vreme zaredom`);
                }
            }
        }
    });

    it("starts with the sun and the cap, shown by the hand, against a clearly different item", () => {
        for (let seed = 1; seed <= 10; seed += 1) {
            const [first] = buildWeatherLevel(1, { maxRounds: 5, maxChoices: 3, random: seeded(seed) }) as DressRound[];
            assert.equal(first.scene, "sun");
            assert.deepEqual(first.need, ["sunCap"]);
            assert.equal(first.tray[0], "sunCap");
            assert.equal(first.tray.length, 2);
            assert.ok(["umbrella", "gloves"].includes(first.tray[1]));
        }
    });

    it("moves from one item to whole outfits, dressing order, mixed weather, the forecast and places", () => {
        assert.deepEqual(
            WEATHER_LEVELS.map((rule) => rule.kit),
            ["one", "one", "two", "two", "one", "outfit", "outfit", "order", "order", "outfit", "outfit", "order", "outfit", "outfit", "outfit"]
        );
        assert.equal(WEATHER_LEVELS[4].task, "when");
        assert.ok(WEATHER_LEVELS[7].strip && !WEATHER_LEVELS[8].strip);
        assert.ok(WEATHER_LEVELS.slice(10, 12).every((rule) => rule.scenes.every((id) => SCENES.find((scene) => scene.id === id)!.conditions.length === 2)));
        assert.equal(WEATHER_LEVELS[12].forecast, "tomorrow");
        assert.equal(WEATHER_LEVELS[13].forecast, "day");
        assert.deepEqual([...WEATHER_LEVELS[14].scenes], ["pool", "school", "park"]);
    });

    it("plans the forecast so that the day to dress for is after today and has the asked weather", () => {
        for (const level of [13, 14]) {
            for (const { where, rounds } of plans(level)) {
                for (const round of rounds as DressRound[]) {
                    const forecast = round.forecast!;
                    assert.ok(forecast, where);
                    assert.equal(forecast.days.length, WEEKDAYS.length);
                    assert.equal(forecast.days[forecast.target], round.scene, where);
                    assert.ok(forecast.today < forecast.target, `${where}: danas pre ciljnog dana`);
                    assert.notEqual(forecast.days[forecast.today], round.scene, `${where}: danas je drugačije vreme`);
                    if (level === 13) assert.equal(forecast.target, forecast.today + 1, `${where}: sutra`);
                    assert.equal(forecast.mark, level === 13);
                }
            }
        }
    });
});

describe("weather order of dressing", () => {
    const view = (need: ClothingId[], worn: ClothingId[] = []) => ({ need, worn, order: true });

    it("refuses shoes before socks and a jacket before the t-shirt, naming what goes first", () => {
        assert.deepEqual(tryWear(view(["socks", "snowBoots", "jacket"]), "snowBoots"), { result: "order", first: "socks" });
        assert.deepEqual(tryWear(view(["socks", "snowBoots", "jacket"], ["socks"]), "snowBoots"), { result: "ok" });
        assert.deepEqual(tryWear(view(["tshirt", "jacket"]), "jacket"), { result: "order", first: "tshirt" });
        assert.deepEqual(tryWear({ need: ["tshirt", "jacket"], worn: [], order: false }, "jacket"), { result: "ok" });
        assert.equal(orderSentence("socks", "snowBoots"), "Prvo čarape, pa čizme.");
        assert.equal(orderSentence("tshirt", "jacket"), "Prvo majica, pa jakna.");
    });

    it("hints the next item that may be worn now", () => {
        assert.equal(nextNeeded({ need: ["snowBoots", "socks"], worn: [], order: true, selected: null }), "socks");
        assert.equal(nextNeeded({ need: ["snowBoots", "socks"], worn: ["socks"], order: true, selected: null }), "snowBoots");
        assert.equal(nextNeeded({ need: ["gloves"], worn: ["gloves"], order: false, selected: null }), null);
    });
});

describe("weather sentences", () => {
    it("says the weather fact gently, in Serbian, with the right verb form", () => {
        assert.equal(refusalSentence({ scene: "snow", hero: "amar", forecast: null }, "sandals"), "Napolju pada sneg. Sandale nisu za sneg.");
        assert.equal(refusalSentence({ scene: "wind", hero: "amar", forecast: null }, "umbrella"), "Napolju duva jak vetar. Kišobran nije za vetar.");
        assert.equal(refusalSentence({ scene: "pool", hero: "lejla", forecast: null }, "jacket"), "Jakna nije za bazen.");
        assert.equal(readySentence({ scene: "rain", hero: "lejla" }), "Lejla je spremna za kišu.");
        assert.equal(readySentence({ scene: "coldRain", hero: "amar" }), "Amar je spreman za hladnu kišu.");
        assert.equal(whenQuestion("snowBoots"), "Kada nosimo čizme?");
        assert.equal(whenQuestion("sunCap"), "Kada nosimo kapu?");
        assert.equal(whenAnswer("snowBoots", "snow"), "Čizme nosimo kad pada sneg.");
        assert.equal(whenMistake("sandals", "rain"), "Sandale ne nosimo kad pada kiša.");
        assert.equal(dressQuestion({ scene: "snow", hero: "lejla", base: ["tshirt"], forecast: null }), "Napolju pada sneg. Šta još treba Lejli?");
        assert.equal(dressQuestion({ scene: "sun", hero: "amar", base: [], forecast: null }), "Napolju je sunčano i toplo. Šta treba Amaru?");
        assert.equal(dressQuestion({ scene: "school", hero: "lejla", base: [], forecast: null }), "Lejla ide u školu. Šta joj treba?");
        assert.equal(
            dressQuestion({ scene: "rain", hero: "amar", base: [], forecast: { days: ["sun", "rain", "snow", "wind", "cold"], today: 0, target: 1, mark: true } }),
            "Danas je ponedeljak. Šta Amar nosi sutra?"
        );
        assert.equal(
            refusalSentence({ scene: "rain", hero: "amar", forecast: { days: ["sun", "snow", "wind", "rain", "cold"], today: 1, target: 3, mark: false } }, "sandals"),
            "U četvrtak pada kiša. Sandale nisu za kišu."
        );
    });

    it("never tells the child where to tap, and every line can be shown in Cyrillic", () => {
        const lines: string[] = [];
        for (const level of LEVELS) {
            for (const round of buildWeatherLevel(level, { maxRounds: 8, maxChoices: 6, random: seeded(level) })) {
                if (round.task === "when") {
                    const when = round as WhenRound;
                    lines.push(whenQuestion(when.item), whenAnswer(when.item, when.answer), ...when.choices.filter((c) => c !== when.answer).map((c) => whenMistake(when.item, c)));
                    continue;
                }
                lines.push(dressQuestion(round), readySentence(round));
                for (const id of round.tray) lines.push(round.need.includes(id) ? wornSentence(id) : refusalSentence(round, id));
            }
        }
        for (const text of lines) {
            assert.doesNotMatch(text, TAP_WORDS, text);
            assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
            assert.doesNotMatch(text, /undefined|null|\s{2}/, text);
        }
    });
});

describe("weather scoring", () => {
    const view = (extra: Partial<WeatherView> = {}): WeatherView => ({ ...emptyWeatherView(4), need: ["gloves"], ...extra });

    it("does not score the demonstrated first round of level 1", () => {
        const { next, modeled } = solveWeatherView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts a clean round as correct, a helped round as prompted, a round with mistakes as neither", () => {
        assert.equal(solveWeatherView(view({ round: 2 }), 1).next.correctCount, 1);
        assert.equal(solveWeatherView(view({ round: 2, hint: true }), 3).next.promptedCount, 1);
        const missed = solveWeatherView(view({ round: 2, wrong: ["sandals"] }), 3).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = weatherResult(view({ totalRounds: 4, correctCount: 4, promptedCount: 4 }), 1, 30);
        assert.equal(result.total, 3);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeWeatherMonitor({
            scene: "volcano",
            need: ["gloves", "cape"],
            tray: ["gloves", "sandals", "x"],
            worn: ["sandals", "gloves"],
            hero: "zorro",
            forecast: { days: ["sun"], today: 9, target: 2, mark: true },
            selected: "x",
        } as unknown as Partial<WeatherView>);
        assert.equal(merged.scene, "");
        assert.deepEqual(merged.need, ["gloves"]);
        assert.deepEqual(merged.tray, ["gloves", "sandals"]);
        assert.deepEqual(merged.worn, ["gloves"]);
        assert.equal(merged.hero, "amar");
        assert.equal(merged.forecast, null);
        assert.equal(merged.selected, null);
    });
});

describe("weather game registry entry", () => {
    const game = getGame("weather");

    it("is activity 27, graded, social, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 27);
        assert.equal(game.gameType, "weather");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0022_weather_game.sql"), "utf8");
        assert.match(sql, /\(27, 'Obuci se', '[^']+', 'social'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("weather"));
        assert.ok(isRemoteGame("weather"));
    });
});
