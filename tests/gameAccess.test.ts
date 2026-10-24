// lib/gameAccess.ts — koje igre dete vidi i koje su mu otvorene.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { availableGames, gameAccess, isGameAvailable, nextLockedGame, pickerGames, UNLOCK_AFTER_LEVEL, type GameAccessSettings } from "@/lib/gameAccess";
import { GAMES, sortGamesForChild, type GameId } from "@/lib/games";

const all: GameAccessSettings = { disabledGames: [], unlockInOrder: false, plan: [], playAge: 4 };
const inOrder: GameAccessSettings = { ...all, unlockInOrder: true };
const ids = (games: { id: string }[]) => games.map((game) => game.id);
/** Redosled igara za dete od 4 godine */
const ORDER = sortGamesForChild(GAMES, 4).map((game) => game.id);
/** Napredak: igra je stigla do nivoa (prvi nepoložen) */
const reached = (entries: [GameId, number][]) => Object.fromEntries(entries);

describe("availableGames", () => {
    it("by default offers every game, sorted for the child's age", () => {
        assert.deepEqual(ids(availableGames(all, {}, GAMES)), ORDER);
        assert.deepEqual(ids(pickerGames(all, {})), ORDER);
    });

    it("hides the games the parent switched off, but never all of them", () => {
        const shown = ids(availableGames({ ...all, disabledGames: ["shapes", "memory"] }, {}, GAMES));
        assert.equal(shown.length, GAMES.length - 2);
        assert.ok(!shown.includes("shapes") && !shown.includes("memory"));
        assert.deepEqual(ids(availableGames({ ...all, disabledGames: GAMES.map((game) => game.id) }, {}, GAMES)), ORDER);
    });

    it("unlocking in order: only the first game is open at the start", () => {
        assert.deepEqual(ids(availableGames(inOrder, {}, GAMES)), [ORDER[0]]);
        assert.deepEqual(ids(availableGames(inOrder, reached([[ORDER[0] as GameId, 1]]), GAMES)), [ORDER[0]]);
    });

    it(`opens the next game once level ${UNLOCK_AFTER_LEVEL} of the previous one is passed`, () => {
        const first = ORDER[0] as GameId;
        assert.deepEqual(ids(availableGames(inOrder, reached([[first, UNLOCK_AFTER_LEVEL]]), GAMES)), [first]);
        assert.deepEqual(ids(availableGames(inOrder, reached([[first, UNLOCK_AFTER_LEVEL + 1]]), GAMES)), [first, ORDER[1]]);
        const chain = reached([
            [first, 16],
            [ORDER[1] as GameId, UNLOCK_AFTER_LEVEL + 1],
        ]);
        assert.deepEqual(ids(availableGames(inOrder, chain, GAMES)), ORDER.slice(0, 3));
    });

    it("keeps open what the child already played and what the parent put in the plan", () => {
        const played = ORDER[5] as GameId;
        const planned = ORDER[8] as GameId;
        const shown = ids(availableGames({ ...inOrder, plan: [planned] }, reached([[played, 2]]), GAMES));
        assert.deepEqual(shown, [ORDER[0], played, planned]);
    });

    it("skips switched-off games in the chain", () => {
        const settings = { ...inOrder, disabledGames: [ORDER[1] as GameId] };
        const shown = ids(availableGames(settings, reached([[ORDER[0] as GameId, UNLOCK_AFTER_LEVEL + 1]]), GAMES));
        assert.deepEqual(shown, [ORDER[0], ORDER[2]]);
    });

    it("follows the order for the child's age", () => {
        const older = { ...inOrder, playAge: 9 };
        const first = sortGamesForChild(GAMES, 9)[0];
        assert.deepEqual(ids(availableGames(older, {}, GAMES)), [first.id]);
        assert.notEqual(first.id, ORDER[0]);
    });
});

describe("gameAccess and nextLockedGame", () => {
    it("says after which game a locked game opens", () => {
        const entries = gameAccess(inOrder, {}, GAMES);
        assert.equal(entries.length, GAMES.length);
        assert.deepEqual(entries[0], { game: GAMES.find((game) => game.id === ORDER[0]), state: "open" });
        const second = entries[1];
        assert.equal(second.state, "locked");
        assert.equal(second.state === "locked" && second.after.id, ORDER[0]);
    });

    it("names only the next game to open, and nothing when everything is open", () => {
        const next = nextLockedGame(inOrder, reached([[ORDER[0] as GameId, UNLOCK_AFTER_LEVEL + 1]]), GAMES);
        assert.equal(next?.game.id, ORDER[2]);
        assert.equal(next?.after.id, ORDER[1]);
        assert.equal(nextLockedGame(all, {}, GAMES), null);
    });
});

describe("isGameAvailable", () => {
    it("is what the server checks before saving a result", () => {
        assert.equal(isGameAvailable(inOrder, {}, ORDER[0] as GameId), true);
        assert.equal(isGameAvailable(inOrder, {}, ORDER[1] as GameId), false);
        assert.equal(isGameAvailable({ ...all, disabledGames: ["emotions"] }, {}, "emotions"), false);
        assert.equal(isGameAvailable(all, {}, "emotions"), true);
    });
});
