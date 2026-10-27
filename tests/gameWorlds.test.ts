// lib/gameWorlds.ts — mape igara: raspored po mapama, zvezdice, kapije i reči.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAMES, MAX_LEVEL, type GameId } from "@/lib/games";
import { gameAccess } from "@/lib/gameAccess";
import { FALLBACK_SETTINGS, sanitizeSettings } from "@/lib/childSettings";
import {
    MAX_WORLDS,
    WORLD_IDS,
    buildWorlds,
    byDifficulty,
    chooseWorld,
    defaultWorld,
    gameStars,
    gateOpenedPraise,
    gateState,
    levelsDone,
    lockedByWorld,
    lockedWorldMessage,
    parseOpened,
    splitIntoWorlds,
    starsPhrase,
    starsToOpen,
    starsWord,
} from "@/lib/gameWorlds";

/** Izmišljene igre (broj igara ne zavisi od toga koliko ih je trenutno u GAMES) */
const fake = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `g${i}` as GameId }));
const ids = Array.from({ length: 60 }, (_, i) => `g${i}` as GameId);
const games = fake;
/** Napredak: prvi nepoložen nivo za prve igre redom */
const progressOf = (levels: number[]) => Object.fromEntries(levels.map((next, i) => [ids[i], next])) as Partial<Record<GameId, number>>;

describe("splitIntoWorlds", () => {
    it("has seven worlds in order of difficulty, ending in space", () => {
        assert.deepEqual(WORLD_IDS, ["meadow", "forest", "desert", "ocean", "volcano", "ice", "space"]);
        assert.equal(MAX_WORLDS, 7);
    });

    // Agenti dodaju igre paralelno: raspored mora da radi za bilo koji broj (33 … 47 i dalje)
    const expected: Record<number, number[]> = {
        27: [4, 4, 4, 4, 4, 4, 3],
        33: [5, 5, 5, 5, 5, 4, 4],
        36: [6, 5, 5, 5, 5, 5, 5],
        40: [6, 6, 6, 6, 6, 5, 5],
        43: [7, 6, 6, 6, 6, 6, 6],
        47: [7, 7, 7, 7, 7, 6, 6],
    };
    for (const [n, sizes] of Object.entries(expected)) {
        it(`splits ${n} games into ${sizes.join(" / ")}, in order`, () => {
            const worlds = splitIntoWorlds(Array.from({ length: Number(n) }, (_, i) => i));
            assert.deepEqual(worlds.map((w) => w.length), sizes);
            assert.deepEqual(worlds.flat(), Array.from({ length: Number(n) }, (_, i) => i));
        });
    }

    for (let n = 1; n <= 60; n += 1) {
        it(`never leaves an empty world and keeps worlds even for ${n} games`, () => {
            const worlds = splitIntoWorlds(Array.from({ length: n }, (_, i) => i));
            const sizes = worlds.map((w) => w.length);
            assert.ok(worlds.length >= 1 && worlds.length <= MAX_WORLDS);
            assert.equal(worlds.flat().length, n);
            // Najviše ceil(n / 7) igara na mapi kad su sve mape tu; mape se razlikuju najviše za jednu igru, veće su prve
            if (n >= 14) {
                assert.equal(worlds.length, MAX_WORLDS, "all seven worlds (the goal is always in space)");
                assert.equal(Math.max(...sizes), Math.ceil(n / MAX_WORLDS));
            }
            assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
            sizes.slice(1).forEach((size, i) => assert.ok(size <= sizes[i]));
            // Nijedna mapa nema samo jednu igru (osim kad je ukupno jedna igra)
            if (n > 1) assert.ok(sizes.every((size) => size >= 2), sizes.join(","));
        });
    }

    it("uses fewer worlds with few games (at least two games per world)", () => {
        assert.deepEqual(splitIntoWorlds([1]).map((w) => w.length), [1]);
        assert.deepEqual(splitIntoWorlds([1, 2, 3]).map((w) => w.length), [3]);
        assert.deepEqual(splitIntoWorlds([1, 2, 3, 4, 5]).map((w) => w.length), [3, 2]);
        assert.deepEqual(splitIntoWorlds(Array.from({ length: 13 }, (_, i) => i)).map((w) => w.length), [3, 2, 2, 2, 2, 2]);
        assert.deepEqual(splitIntoWorlds([]), []);
        assert.deepEqual(splitIntoWorlds(Array.from({ length: 10 }, (_, i) => i), 2).map((w) => w.length), [5, 5]);
    });

    it("keeps the child's order (easiest games for the age first)", () => {
        const sorted = gameAccess({ ...FALLBACK_SETTINGS, playAge: 4 }, {}, GAMES).map((a) => a.game);
        const worlds = buildWorlds(sorted, {});
        assert.deepEqual(worlds.flatMap((w) => w.games.map((g) => g.id)), sorted.map((g) => g.id));
        assert.deepEqual(worlds.map((w) => w.id), WORLD_IDS.slice(0, worlds.length));
    });

    it("puts the real games on all seven maps, the last one is space", () => {
        const worlds = buildWorlds(byDifficulty(GAMES), {});
        assert.equal(worlds.length, MAX_WORLDS);
        assert.equal(worlds[worlds.length - 1].id, "space");
        assert.equal(worlds[worlds.length - 1].final, true);
    });
});

describe("stars", () => {
    it("gives one star per finished difficulty", () => {
        assert.deepEqual([0, 4, 5, 9, 10, 14, 15, 99, -3].map(gameStars), [0, 0, 1, 1, 2, 2, 3, 3, 0]);
    });

    it("reads finished levels from server progress (first not yet passed level)", () => {
        const progress = progressOf([1, 6, 16, 40]);
        assert.deepEqual([0, 1, 2, 3, 4].map((i) => levelsDone(progress, ids[i])), [0, 5, MAX_LEVEL, MAX_LEVEL, 0]);
    });

    it("sums the stars of the games on a world", () => {
        // 14 igara → sedam mapa po 2: [3+1], [2+0], [0+0] …
        const worlds = buildWorlds(games(14), progressOf([16, 6, 11, 3]));
        assert.deepEqual(worlds.map((w) => w.stars), [4, 2, 0, 0, 0, 0, 0]);
        assert.deepEqual(worlds.map((w) => w.maxStars), [6, 6, 6, 6, 6, 6, 6]);
    });

    it("needs as many stars as there are games (one difficulty per game on average)", () => {
        assert.equal(starsToOpen(7), 7);
        assert.equal(starsToOpen(1), 1);
        assert.equal(starsToOpen(0), 1);
        assert.deepEqual(buildWorlds(games(33), {}).map((w) => w.need), [5, 5, 5, 5, 5, 4, 4]);
        assert.deepEqual(buildWorlds(games(47), {}).map((w) => w.need), [7, 7, 7, 7, 7, 6, 6]);
    });
});

describe("unlock chain", () => {
    for (const n of [33, 47]) {
        it(`always opens the first world and nothing else for a new child (${n} games)`, () => {
            const worlds = buildWorlds(games(n), {});
            assert.deepEqual(worlds.map((w) => w.open), [true, false, false, false, false, false, false]);
            assert.equal(worlds[6].final, true);
            assert.equal(worlds[6].id, "space");
            assert.ok(worlds.slice(0, 6).every((w) => !w.final));
        });
    }

    it("opens the next world when the previous has enough stars", () => {
        // 33 igre: prva mapa ima 5 igara; 4 zvezdice nije dosta, 5 jeste
        const four = buildWorlds(games(33), progressOf([16, 6, 1, 1, 1]));
        assert.equal(four[0].stars, 4);
        assert.deepEqual(four.map((w) => w.open), [true, false, false, false, false, false, false]);
        const five = buildWorlds(games(33), progressOf([16, 6, 6, 1, 1]));
        assert.equal(five[0].earned, true);
        assert.deepEqual(five.map((w) => w.open), [true, true, false, false, false, false, false]);
    });

    it("opens worlds one after another", () => {
        const levels = [...Array(5).fill(6), ...Array(5).fill(6)];
        assert.deepEqual(buildWorlds(games(33), progressOf(levels)).map((w) => w.open), [true, true, true, false, false, false, false]);
    });

    it("keeps a world open when the child already played there (progress is never lost)", () => {
        const progress = { [ids[15]]: 2 } as Partial<Record<GameId, number>>;
        // 33 igre: igra 15 je na četvrtoj mapi (0–4, 5–9, 10–14, 15–19)
        assert.deepEqual(buildWorlds(games(33), progress).map((w) => w.open), [true, false, false, true, false, false, false]);
    });

    it("gates: locked → key → open (remembered on the device; opens by itself without storage)", () => {
        const [world] = buildWorlds(games(33), progressOf(Array(5).fill(6)));
        assert.equal(gateState({ ...world, earned: false }, []), "locked");
        assert.equal(gateState(world, []), "key");
        assert.equal(gateState(world, ["meadow"]), "open");
        assert.equal(gateState(world, null), "open");
        assert.equal(gateState({ ...world, earned: false }, null), "locked");
    });

    it("keeps gates opened with the old four maps (same IDs in localStorage)", () => {
        // Stari zapis sa četiri mape: livada i pustinja otvorene
        const opened = parseOpened('["meadow","desert"]');
        assert.deepEqual(opened, ["meadow", "desert"]);
        const worlds = buildWorlds(games(33), progressOf(Array(15).fill(6)));
        assert.deepEqual(worlds.slice(0, 3).map((w) => gateState(w, opened)), ["open", "key", "open"]);
    });
});

describe("overrides", () => {
    it("opens every world and gate with „Sve mape otvorene”", () => {
        const worlds = buildWorlds(games(33), {}, { openAll: true });
        assert.ok(worlds.every((w) => w.open));
        assert.ok(worlds.every((w) => gateState(w, [], { openAll: true }) === "open"));
    });

    it("opens everything in the preview with all levels (unlocked=16)", () => {
        const progress = Object.fromEntries(ids.map((id) => [id, MAX_LEVEL + 1]));
        const worlds = buildWorlds(games(33), progress);
        assert.ok(worlds.every((w) => w.open && w.earned && w.complete));
    });

    it("keeps plan games reachable inside a locked world", () => {
        const worlds = buildWorlds(games(33), {});
        const locked = worlds[2];
        assert.equal(lockedByWorld(locked, locked.games[0].id), true);
        assert.equal(lockedByWorld(locked, locked.games[0].id, [locked.games[0].id]), false);
        assert.equal(lockedByWorld(worlds[0], worlds[0].games[0].id), false);
    });

    it("is off by default and kept when the parent changes it", () => {
        assert.equal(FALLBACK_SETTINGS.openAllMaps, false);
        assert.equal(sanitizeSettings({ openAllMaps: true }, "middle").openAllMaps, true);
        assert.equal(sanitizeSettings({ openAllMaps: "da" }, "middle").openAllMaps, false);
    });
});

describe("words", () => {
    it("agrees the number of stars in Serbian (accusative)", () => {
        const cases: [number, string][] = [
            [1, "zvezdicu"],
            [2, "zvezdice"],
            [3, "zvezdice"],
            [4, "zvezdice"],
            [5, "zvezdica"],
            [7, "zvezdica"],
            [11, "zvezdica"],
            [12, "zvezdica"],
            [14, "zvezdica"],
            [21, "zvezdicu"],
            [22, "zvezdice"],
            [25, "zvezdica"],
            [0, "zvezdica"],
        ];
        for (const [n, word] of cases) assert.equal(starsWord(n), word, String(n));
        assert.equal(starsPhrase(21), "21 zvezdicu");
    });

    it("tells calmly what a locked world needs", () => {
        // 33 igre: pet igara na livadi → treba 5 zvezdica
        const worlds = buildWorlds(games(33), progressOf([6]));
        assert.equal(lockedWorldMessage(worlds, "forest"), "Skupi još 4 zvezdice na livadi da otključaš šumu.");
        assert.equal(lockedWorldMessage(worlds, "desert"), "Prvo treba otključati šumu.");
        const almost = buildWorlds(games(33), progressOf([16, 6]));
        assert.equal(lockedWorldMessage(almost, "forest"), "Skupi još 1 zvezdicu na livadi da otključaš šumu.");
        assert.equal(lockedWorldMessage(almost, "meadow"), "");
        // Šuma otvorena: šta treba u šumi za pustinju, pa redom do svemira
        const forest = buildWorlds(games(33), progressOf([16, 16, 1, 1, 1, 6, 6]));
        assert.equal(lockedWorldMessage(forest, "desert"), "Skupi još 3 zvezdice u šumi da otključaš pustinju.");
        const deep = buildWorlds(games(33), progressOf([...Array(10).fill(6), 16, 1, 1, 1, 1]));
        assert.equal(lockedWorldMessage(deep, "ocean"), "Skupi još 2 zvezdice u pustinji da otključaš podvodni svet.");
        const sea = buildWorlds(games(33), progressOf([...Array(15).fill(6), 6]));
        assert.equal(lockedWorldMessage(sea, "volcano"), "Skupi još 4 zvezdice pod morem da otključaš vulkan.");
        const ice = buildWorlds(games(33), progressOf([...Array(25).fill(6), 6, 6]));
        assert.equal(lockedWorldMessage(ice, "space"), "Skupi još 2 zvezdice na ledenim vrhovima da otključaš svemir.");
    });

    it("praises the opened gate by gender", () => {
        assert.equal(gateOpenedPraise({ id: "meadow", final: false }, "desert", true), "Bravo! Otvorila si Peščanu pustinju!");
        assert.equal(gateOpenedPraise({ id: "meadow", final: false }, "desert", false), "Bravo! Otvorio si Peščanu pustinju!");
        assert.equal(gateOpenedPraise({ id: "meadow", final: false }, "forest", true), "Bravo! Otvorila si Čarobnu šumu!");
        assert.equal(gateOpenedPraise({ id: "desert", final: false }, "ocean", false), "Bravo! Otvorio si Podvodni svet!");
        assert.equal(gateOpenedPraise({ id: "ocean", final: false }, "volcano", true), "Bravo! Otvorila si Vatreni vulkan!");
        assert.equal(gateOpenedPraise({ id: "ice", final: false }, "space", true), "Bravo! Otvorila si Svemir!");
        assert.equal(gateOpenedPraise({ id: "space", final: true }, null, true), "Bravo! Prešla si sve mape!");
        assert.equal(gateOpenedPraise({ id: "space", final: true }, null, false), "Bravo! Prešao si sve mape!");
    });
});

describe("default world", () => {
    it("shows the highest open world that still has unfinished games", () => {
        const worlds = buildWorlds(games(33), progressOf(Array(10).fill(6)));
        assert.equal(defaultWorld(worlds), "desert");
        assert.equal(defaultWorld(buildWorlds(games(33), {})), "meadow");
        // „Sve mape otvorene”: novo dete ipak kreće od livade, a dete koje je stiglo do pustinje — od pustinje
        assert.equal(defaultWorld(buildWorlds(games(33), {}, { openAll: true })), "meadow");
        assert.equal(defaultWorld(buildWorlds(games(33), progressOf(Array(5).fill(6)), { openAll: true })), "forest");
    });

    it("falls back to the last open world when everything is finished", () => {
        const all = Object.fromEntries(ids.map((id) => [id, MAX_LEVEL + 1]));
        assert.equal(defaultWorld(buildWorlds(games(33), all)), "space");
        assert.equal(defaultWorld([]), null);
    });

    it("uses the remembered world only while it is open", () => {
        const worlds = buildWorlds(games(33), progressOf(Array(5).fill(6)));
        assert.equal(chooseWorld(worlds, "meadow"), "meadow");
        assert.equal(chooseWorld(worlds, "ice"), "forest");
        assert.equal(chooseWorld(worlds, "planeta"), "forest");
        assert.equal(chooseWorld(worlds, null), "forest");
        // Ključ čeka na kapiji livade: prvo se prikazuje livada
        assert.equal(chooseWorld(worlds, "forest", "meadow"), "meadow");
    });

    it("reads opened gates safely", () => {
        assert.deepEqual(parseOpened('["desert","meadow","x"]'), ["meadow", "desert"]);
        assert.deepEqual(parseOpened('["space","ocean","forest"]'), ["forest", "ocean", "space"]);
        assert.deepEqual(parseOpened("{"), []);
        assert.deepEqual(parseOpened(null), []);
    });
});

describe("mape po težini igre", () => {
    it("livada ima najlakše igre, svemir najteže — za dete bilo kog uzrasta", () => {
        const worlds = splitIntoWorlds(byDifficulty(GAMES));
        const first = worlds[0].map((g) => g.id);
        const last = worlds[worlds.length - 1].map((g) => g.id);
        assert.ok(first.includes("shapes") || first.includes("sound-to-image"), "najlakše igre su na livadi");
        assert.ok(!last.includes("shapes") && !last.includes("sound-to-image"), "najlakše igre nisu u svemiru");
        for (const world of worlds.slice(1)) {
            const prevMax = Math.max(...worlds[worlds.indexOf(world) - 1].map((g) => g.ages.min));
            assert.ok(Math.min(...world.map((g) => g.ages.min)) >= prevMax, "svaka sledeća mapa počinje bar od istog uzrasta");
        }
    });
});
