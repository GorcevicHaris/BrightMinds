// lib/games.ts — spisak igara, zvezdice i pravilo „nivo se polaže”.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    ACTIVITY_IDS,
    ADVANCE_RATIO,
    GAMES,
    LEVELS_PER_TIER,
    MAX_LEVEL,
    MOODS,
    MOODS_THREE,
    getGame,
    getGameByActivityId,
    getGameByType,
    getMood,
    isGradedActivity,
    starsFor,
    successLevelFor,
    starsForGame,
} from "@/lib/games";
import { toCyrillic } from "@/lib/script";

describe("starsFor", () => {
    it("gives 0 stars only when the level was not played at all (total ≤ 0)", () => {
        assert.equal(starsFor(0, 0), 0);
        assert.equal(starsFor(5, 0), 0);
        assert.equal(starsFor(3, -1), 0);
    });

    it("gives at least one star for any finished level, even with nothing correct", () => {
        assert.equal(starsFor(0, 4), 1);
        assert.equal(starsFor(1, 10), 1);
        for (let total = 1; total <= 12; total += 1) {
            for (let correct = 0; correct <= total; correct += 1) {
                assert.ok(starsFor(correct, total) >= 1, `${correct}/${total}`);
            }
        }
    });

    it("gives 2 stars from exactly 50% independently correct", () => {
        assert.equal(starsFor(49, 100), 1);
        assert.equal(starsFor(50, 100), 2);
        assert.equal(starsFor(2, 4), 2);
        assert.equal(starsFor(79, 100), 2);
    });

    it("gives 3 stars from exactly 80% independently correct", () => {
        assert.equal(starsFor(80, 100), 3);
        assert.equal(starsFor(4, 5), 3);
        assert.equal(starsFor(5, 5), 3);
        assert.equal(starsFor(3, 4), 2);
    });

    it("never goes down when one more answer is correct", () => {
        for (let total = 1; total <= 12; total += 1) {
            for (let correct = 1; correct <= total; correct += 1) {
                assert.ok(starsFor(correct, total) >= starsFor(correct - 1, total), `${correct}/${total}`);
            }
        }
    });
});

describe("successLevelFor", () => {
    it("maps 0, 1, 2 and 3 stars to struggled, partial, successful and excellent", () => {
        assert.equal(successLevelFor(0), "struggled");
        assert.equal(successLevelFor(1), "partial");
        assert.equal(successLevelFor(2), "successful");
        assert.equal(successLevelFor(3), "excellent");
    });

    it("treats anything above 3 stars as excellent and anything else as struggled", () => {
        assert.equal(successLevelFor(4), "excellent");
        assert.equal(successLevelFor(-1), "struggled");
        assert.equal(successLevelFor(Number.NaN), "struggled");
    });
});

describe("isGradedActivity", () => {
    it("is true for every game, emotions included (they have a right answer)", () => {
        for (const game of GAMES) {
            assert.equal(isGradedActivity(game.activityId), true, game.id);
        }
    });

    it("gives all three stars for a finished level of a game with no wrong answers", () => {
        assert.equal(starsForGame(false, 0, 4), 3);
        assert.equal(starsForGame(false, 4, 4), 3);
        assert.equal(starsForGame(false, 0, 0), 0);
        assert.equal(starsForGame(true, 1, 4), 1);
        assert.equal(starsForGame(true, 4, 4), 3);
    });

    it("treats an unknown activity as graded", () => {
        assert.equal(isGradedActivity(999), true);
        assert.equal(isGradedActivity(2), true);
    });
});

describe("game registry", () => {
    const unique = (values: readonly unknown[]) => new Set(values).size === values.length;

    it("has twelve games with unique ids, activity ids and game types", () => {
        assert.equal(GAMES.length, 12);
        assert.ok(unique(GAMES.map((game) => game.id)));
        assert.ok(unique(GAMES.map((game) => game.activityId)));
        assert.ok(unique(GAMES.map((game) => game.gameType)));
    });

    it("keeps the activity ids that are already stored in the database", () => {
        assert.deepEqual(
            Object.fromEntries(GAMES.map((game) => [game.id, game.activityId])),
            { shapes: 1, memory: 3, coloring: 4, "sound-to-image": 5, social: 6, "social-story": 7, emotions: 8, sorting: 9, sequence: 10, where: 11, uses: 12, counting: 13 }
        );
        assert.deepEqual(ACTIVITY_IDS, [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    });

    it("gives every game a title, a skill, an image and an off-screen tip for the adult", () => {
        for (const game of GAMES) {
            assert.ok(game.title.trim().length > 0, `${game.id}: title`);
            assert.ok(game.skill.trim().length > 0, `${game.id}: skill`);
            assert.match(game.image, /^\/images\/.+\.(webp|svg)$/, `${game.id}: image`);
            assert.ok(game.offscreenTip.trim().length >= 20, `${game.id}: offscreenTip`);
        }
    });

    it("gives every game a complete set of accent classes", () => {
        for (const game of GAMES) {
            for (const [key, value] of Object.entries(game.accent)) {
                assert.ok(value.trim().length > 0, `${game.id}: accent.${key}`);
            }
            assert.deepEqual(Object.keys(game.accent).sort(), ["border", "edge", "gradient", "ring", "soft", "solid", "text"]);
        }
    });

    it("uses titles and descriptions that can be shown fully in Cyrillic", () => {
        for (const game of GAMES) {
            for (const text of [game.title, game.description]) {
                assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, `${game.id}: "${text}"`);
            }
        }
        for (const mood of [...MOODS, ...MOODS_THREE]) assert.doesNotMatch(toCyrillic(mood.label), /\p{Script=Latin}/u, mood.label);
    });

    it("grades every game", () => {
        assert.deepEqual(
            GAMES.filter((game) => !game.graded).map((game) => game.id),
            []
        );
    });

    it("finds a game by id, by live-monitor game type and by activity id", () => {
        for (const game of GAMES) {
            assert.equal(getGame(game.id), game);
            assert.equal(getGameByType(game.gameType), game);
            assert.equal(getGameByActivityId(game.activityId), game);
        }
        assert.equal(getGameByType("nope"), undefined);
        assert.equal(getGameByActivityId(2), undefined);
    });

    it("has 15 levels in three tiers of five", () => {
        assert.equal(MAX_LEVEL, 15);
        assert.equal(LEVELS_PER_TIER * 3, MAX_LEVEL);
    });

    it("suggests the next level from the same share that earns two stars", () => {
        assert.equal(ADVANCE_RATIO, 0.5);
        assert.equal(starsFor(ADVANCE_RATIO * 10, 10), 2);
    });
});

describe("moods", () => {
    it("offers five distinct moods, and the short child scale uses three of the same values", () => {
        const values = MOODS.map((mood) => mood.value);
        assert.equal(new Set(values).size, 5);
        assert.equal(MOODS_THREE.length, 3);
        for (const mood of MOODS_THREE) assert.ok(values.includes(mood.value), mood.value);
    });

    it("looks a mood up by value and returns undefined for unknown or missing values", () => {
        assert.equal(getMood("happy")?.value, "happy");
        assert.equal(getMood("ecstatic"), undefined);
        assert.equal(getMood(null), undefined);
        assert.equal(getMood(undefined), undefined);
    });
});
