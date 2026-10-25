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

const ids = GAMES.map((g) => g.id);
const games = (n: number) => GAMES.slice(0, n);
/** Napredak: prvi nepoložen nivo za prve igre redom */
const progressOf = (levels: number[]) => Object.fromEntries(levels.map((next, i) => [ids[i], next])) as Partial<Record<GameId, number>>;

describe("splitIntoWorlds", () => {
    it("splits 27 games into 7 / 7 / 7 / 6, in order", () => {
        const worlds = splitIntoWorlds(Array.from({ length: 27 }, (_, i) => i));
        assert.deepEqual(worlds.map((w) => w.length), [7, 7, 7, 6]);
        assert.deepEqual(worlds.flat(), Array.from({ length: 27 }, (_, i) => i));
    });

    for (let n = 1; n <= 27; n += 1) {
        it(`never leaves an empty world and uses at most ${MAX_WORLDS} worlds for ${n} games`, () => {
            const worlds = splitIntoWorlds(Array.from({ length: n }, (_, i) => i));
            const size = Math.ceil(n / MAX_WORLDS);
            assert.ok(worlds.length >= 1 && worlds.length <= MAX_WORLDS);
            assert.ok(worlds.every((w) => w.length >= 1 && w.length <= size));
            assert.equal(worlds.flat().length, n);
            // Sve mape osim poslednje su pune
            worlds.slice(0, -1).forEach((w) => assert.equal(w.length, size));
        });
    }

    it("uses fewer worlds with few games", () => {
        assert.deepEqual(splitIntoWorlds([1]).map((w) => w.length), [1]);
        assert.deepEqual(splitIntoWorlds([1, 2, 3]).map((w) => w.length), [1, 1, 1]);
        assert.deepEqual(splitIntoWorlds([1, 2, 3, 4, 5]).map((w) => w.length), [2, 2, 1]);
        assert.deepEqual(splitIntoWorlds([]), []);
    });

    it("keeps the child's order (easiest games for the age first)", () => {
        const sorted = gameAccess({ ...FALLBACK_SETTINGS, playAge: 4 }, {}, GAMES).map((a) => a.game);
        const worlds = buildWorlds(sorted, {});
        assert.deepEqual(worlds.flatMap((w) => w.games.map((g) => g.id)), sorted.map((g) => g.id));
        assert.deepEqual(worlds.map((w) => w.id), WORLD_IDS.slice(0, worlds.length));
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
        // 8 igara → mape po 2: [3+1], [2+0], [0+0], [0+0]
        const worlds = buildWorlds(games(8), progressOf([16, 6, 11, 3]));
        assert.deepEqual(worlds.map((w) => w.stars), [4, 2, 0, 0]);
        assert.deepEqual(worlds.map((w) => w.maxStars), [6, 6, 6, 6]);
    });

    it("needs as many stars as there are games (one difficulty per game on average)", () => {
        assert.equal(starsToOpen(7), 7);
        assert.equal(starsToOpen(1), 1);
        assert.equal(starsToOpen(0), 1);
        assert.deepEqual(buildWorlds(games(27), {}).map((w) => w.need), [7, 7, 7, 6]);
    });
});

describe("unlock chain", () => {
    it("always opens the first world and nothing else for a new child", () => {
        const worlds = buildWorlds(games(27), {});
        assert.deepEqual(worlds.map((w) => w.open), [true, false, false, false]);
        assert.equal(worlds[3].final, true);
        assert.equal(worlds[0].final, false);
    });

    it("opens the next world when the previous has enough stars", () => {
        // Prva mapa: 7 igara; 6 zvezdica nije dosta, 7 jeste
        const six = buildWorlds(games(27), progressOf([16, 16, 1, 1, 1, 1, 1]));
        assert.equal(six[0].stars, 6);
        assert.deepEqual(six.map((w) => w.open), [true, false, false, false]);
        const seven = buildWorlds(games(27), progressOf([16, 16, 6, 1, 1, 1, 1]));
        assert.equal(seven[0].earned, true);
        assert.deepEqual(seven.map((w) => w.open), [true, true, false, false]);
    });

    it("opens worlds one after another", () => {
        const levels = [...Array(7).fill(6), ...Array(7).fill(6)];
        assert.deepEqual(buildWorlds(games(27), progressOf(levels)).map((w) => w.open), [true, true, true, false]);
    });

    it("keeps a world open when the child already played there (progress is never lost)", () => {
        const progress = { [ids[15]]: 2 } as Partial<Record<GameId, number>>;
        assert.deepEqual(buildWorlds(games(27), progress).map((w) => w.open), [true, false, true, false]);
    });

    it("gates: locked → key → open (remembered on the device; opens by itself without storage)", () => {
        const [world] = buildWorlds(games(27), progressOf(Array(7).fill(6)));
        assert.equal(gateState({ ...world, earned: false }, []), "locked");
        assert.equal(gateState(world, []), "key");
        assert.equal(gateState(world, ["meadow"]), "open");
        assert.equal(gateState(world, null), "open");
        assert.equal(gateState({ ...world, earned: false }, null), "locked");
    });
});

describe("overrides", () => {
    it("opens every world and gate with „Sve mape otvorene”", () => {
        const worlds = buildWorlds(games(27), {}, { openAll: true });
        assert.ok(worlds.every((w) => w.open));
        assert.ok(worlds.every((w) => gateState(w, [], { openAll: true }) === "open"));
    });

    it("opens everything in the preview with all levels (unlocked=16)", () => {
        const progress = Object.fromEntries(ids.map((id) => [id, MAX_LEVEL + 1]));
        const worlds = buildWorlds(games(27), progress);
        assert.ok(worlds.every((w) => w.open && w.earned && w.complete));
    });

    it("keeps plan games reachable inside a locked world", () => {
        const worlds = buildWorlds(games(27), {});
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
        const worlds = buildWorlds(games(27), progressOf([16, 6]));
        assert.equal(lockedWorldMessage(worlds, "desert"), "Skupi još 3 zvezdice na livadi da otključaš pustinju.");
        assert.equal(lockedWorldMessage(worlds, "volcano"), "Prvo treba otključati pustinju.");
        const almost = buildWorlds(games(27), progressOf([16, 11]));
        assert.equal(lockedWorldMessage(almost, "desert"), "Skupi još 2 zvezdice na livadi da otključaš pustinju.");
        const one = buildWorlds(games(27), progressOf([16, 16]));
        assert.equal(lockedWorldMessage(one, "desert"), "Skupi još 1 zvezdicu na livadi da otključaš pustinju.");
        assert.equal(lockedWorldMessage(one, "meadow"), "");
    });

    it("praises the opened gate by gender", () => {
        assert.equal(gateOpenedPraise({ id: "meadow", final: false }, "desert", true), "Bravo! Otvorila si Peščanu pustinju!");
        assert.equal(gateOpenedPraise({ id: "meadow", final: false }, "desert", false), "Bravo! Otvorio si Peščanu pustinju!");
        assert.equal(gateOpenedPraise({ id: "desert", final: false }, "volcano", true), "Bravo! Otvorila si Vatreni vulkan!");
        assert.equal(gateOpenedPraise({ id: "ice", final: true }, null, true), "Bravo! Prešla si sve mape!");
    });
});

describe("default world", () => {
    it("shows the highest open world that still has unfinished games", () => {
        const worlds = buildWorlds(games(27), progressOf(Array(14).fill(6)));
        assert.equal(defaultWorld(worlds), "volcano");
        assert.equal(defaultWorld(buildWorlds(games(27), {})), "meadow");
        // „Sve mape otvorene”: novo dete ipak kreće od livade, a dete koje je stiglo do pustinje — od pustinje
        assert.equal(defaultWorld(buildWorlds(games(27), {}, { openAll: true })), "meadow");
        assert.equal(defaultWorld(buildWorlds(games(27), progressOf(Array(7).fill(6)), { openAll: true })), "desert");
    });

    it("falls back to the last open world when everything is finished", () => {
        const all = Object.fromEntries(ids.map((id) => [id, MAX_LEVEL + 1]));
        assert.equal(defaultWorld(buildWorlds(games(27), all)), "ice");
        assert.equal(defaultWorld([]), null);
    });

    it("uses the remembered world only while it is open", () => {
        const worlds = buildWorlds(games(27), progressOf(Array(7).fill(6)));
        assert.equal(chooseWorld(worlds, "meadow"), "meadow");
        assert.equal(chooseWorld(worlds, "ice"), "desert");
        assert.equal(chooseWorld(worlds, "planeta"), "desert");
        assert.equal(chooseWorld(worlds, null), "desert");
        // Ključ čeka na kapiji livade: prvo se prikazuje livada
        assert.equal(chooseWorld(worlds, "desert", "meadow"), "meadow");
    });

    it("reads opened gates safely", () => {
        assert.deepEqual(parseOpened('["desert","meadow","x"]'), ["meadow", "desert"]);
        assert.deepEqual(parseOpened("{"), []);
        assert.deepEqual(parseOpened(null), []);
    });
});
