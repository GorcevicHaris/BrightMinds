// lib/playTogether.ts — igra na smenu: čiji je red, ime druga, zajednička pohvala.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAMES } from "@/lib/games";
import {
    FRIEND_KINDS,
    TOGETHER_GAMES,
    cleanFriendName,
    isTogetherGame,
    parseSavedFriends,
    rememberFriend,
    starsPhrase,
    togetherPraise,
    turnIndexFor,
} from "@/lib/playTogether";
import { isCompanionKindId } from "@/lib/companion";

describe("TOGETHER_GAMES", () => {
    it("lists only existing games, without duplicates", () => {
        assert.equal(new Set(TOGETHER_GAMES).size, TOGETHER_GAMES.length);
        for (const id of TOGETHER_GAMES) assert.ok(GAMES.some((g) => g.id === id), id);
        assert.ok(isTogetherGame("memory"));
        assert.ok(!isTogetherGame("coloring"));
        assert.ok(!isTogetherGame(null));
    });

    it("takes turns in every game except free coloring, the listened story and writing with a finger", () => {
        const without = GAMES.filter((g) => !isTogetherGame(g.id)).map((g) => g.id);
        assert.deepEqual(without.sort(), ["coloring", "letters", "numbers", "social-story"]);
    });

    it("offers friend companions that really exist", () => {
        for (const kind of FRIEND_KINDS) assert.ok(isCompanionKindId(kind), kind);
    });
});

describe("turnIndexFor", () => {
    it("alternates players task by task (round starts at 1)", () => {
        assert.deepEqual([1, 2, 3, 4, 5].map((round) => turnIndexFor("counting", { round })), [0, 1, 0, 1, 0]);
        assert.equal(turnIndexFor("where", { round: 2 }), 1);
        assert.equal(turnIndexFor("gaze", { round: 3 }), 0);
    });

    it("in memory, the turn passes after every try of two cards", () => {
        assert.deepEqual([0, 1, 2, 3].map((moves) => turnIndexFor("memory", { moves, round: 1 })), [0, 1, 0, 1]);
    });

    it("says nothing for unusable state", () => {
        assert.equal(turnIndexFor("counting", null), null);
        assert.equal(turnIndexFor("counting", {}), null);
        assert.equal(turnIndexFor("counting", { round: 0 }), null);
        assert.equal(turnIndexFor("counting", { round: "2" }), null);
        assert.equal(turnIndexFor("memory", { round: 2 }), null);
        assert.equal(turnIndexFor("memory", { moves: Number.NaN }), null);
    });
});

describe("friend names", () => {
    it("keeps only letters and capitalises the first one", () => {
        assert.equal(cleanFriendName("  amar "), "Amar");
        assert.equal(cleanFriendName("đorđe"), "Đorđe");
        assert.equal(cleanFriendName("Ana-Marija"), "Ana-Marija");
        assert.equal(cleanFriendName("<b>Mia</b>123"), "BMiab");
    });

    it("refuses empty, too short or non-text names and limits the length", () => {
        assert.equal(cleanFriendName(""), null);
        assert.equal(cleanFriendName("1"), null);
        assert.equal(cleanFriendName("A"), null);
        assert.equal(cleanFriendName(42), null);
        assert.ok((cleanFriendName("Aleksandraaaaaaaaaaaaaaa") ?? "").length <= 16);
    });

    it("reads saved friends defensively and remembers the newest first", () => {
        assert.deepEqual(parseSavedFriends(null), []);
        assert.deepEqual(parseSavedFriends("not json"), []);
        assert.deepEqual(
            parseSavedFriends(JSON.stringify([{ name: "amar", kind: "dog" }, { name: "Amar", kind: "cat" }, { name: "X", kind: "dog" }, { name: "Mia", kind: "dragon" }])),
            [{ name: "Amar", kind: "dog" }]
        );
        const list = rememberFriend([{ name: "Amar", kind: "dog" }, { name: "Mia", kind: "cat" }], { name: "mia", kind: "fox" });
        assert.deepEqual(list, [{ name: "mia", kind: "fox" }, { name: "Amar", kind: "dog" }]);
    });
});

describe("cooperative praise", () => {
    it("uses the right Serbian form for the number of stars", () => {
        assert.equal(starsPhrase(1), "1 zvezdicu");
        assert.equal(starsPhrase(2), "2 zvezdice");
        assert.equal(starsPhrase(5), "5 zvezdica");
        assert.equal(starsPhrase(12), "12 zvezdica");
        assert.equal(starsPhrase(21), "21 zvezdicu");
        assert.equal(starsPhrase(23), "23 zvezdice");
    });

    it("praises both children together, never comparing them", () => {
        const praise = togetherPraise(["Lejla", "Amar"], 12);
        assert.equal(praise.title, "Bravo, Lejla i Amar!");
        assert.equal(praise.text, "Zajedno ste skupili 12 zvezdica!");
        assert.doesNotMatch(praise.title + praise.text, /pobed|izgub|bolj/i);
    });
});
