// lib/progress.ts — `buildProgress` pretvara redove iz `progress_logs` (i posete iz
// `play_sessions`) u statistiku. Svi primeri su mali i ručno napisani.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAMES, type GameId } from "@/lib/games";
import {
    ACTIVITY_WINDOW_DAYS,
    MASTERY_MIN_DAYS,
    MASTERY_RATIO,
    MASTERY_SESSIONS,
    PROGRESS_TIME_ZONE,
    SUPPORT_RATIO,
    SUPPORT_SESSIONS,
    TIERS,
    buildProgress,
    dayKeyToDate,
    tierForLevel,
    type GameProgress,
    type ProgressResponse,
} from "@/lib/progress";

type Row = Record<string, unknown>;

/** „Sada” u svim primerima: nedelja 15. mart 2026, 13:00 u Beogradu (zimsko vreme, UTC+1). */
const NOW = new Date("2026-03-15T12:00:00Z");

const SHAPES = 1;
const MEMORY = 3;
const EMOTIONS = 8;

let nextId = 1;

/** Partija u novom obliku (kolone iz migracija); podrazumevano „Pogodi oblik”, nivo 1, 4 od 5 samostalno. */
function log(overrides: Row = {}): Row {
    return {
        id: (nextId += 1),
        activity_id: SHAPES,
        completed_at: "2026-03-10T10:00:00Z",
        level: 1,
        stars: 3,
        score: 100,
        correct_count: 4,
        total_count: 5,
        prompted_count: 1,
        duration_seconds: 60,
        ...overrides,
    };
}

/** Partija kakvu je čuvala baza pre migracija: sve je u belešci. */
function legacyLog(notes: string | null, overrides: Row = {}): Row {
    return { id: (nextId += 1), activity_id: SHAPES, completed_at: "2026-03-10T10:00:00Z", notes, ...overrides };
}

function gameOf(response: ProgressResponse, gameId: GameId): GameProgress {
    const game = response.games.find((item) => item.gameId === gameId);
    assert.ok(game, gameId);
    return game;
}

const shapes = (rows: Row[], sessions: Row[] = []) => gameOf(buildProgress(rows, NOW, sessions), "shapes");

describe("buildProgress with no data", () => {
    const empty = buildProgress([], NOW);

    it("lists every game in registry order, on level 1 of the easy tier", () => {
        assert.deepEqual(
            empty.games.map((game) => game.gameId),
            GAMES.map((game) => game.id)
        );
        for (const game of empty.games) {
            assert.equal(game.plays, 0);
            assert.equal(game.highestLevelCompleted, 0);
            assert.equal(game.currentLevel, 1);
            assert.equal(game.tier, "easy");
            assert.equal(game.bestScore, null);
            assert.equal(game.needsSupport, false);
            assert.deepEqual(game.trend, []);
        }
    });

    it("reports graded games as not started and emotions as ungraded", () => {
        for (const game of empty.games) {
            assert.equal(game.mastery, game.gameId === "emotions" ? "ungraded" : "not_started", game.gameId);
        }
    });

    it("uses null, not zero, for averages and rates that do not exist yet", () => {
        assert.equal(empty.totals.plays, 0);
        assert.equal(empty.totals.averageStars, null);
        assert.equal(empty.totals.independentRate30d, null);
        assert.equal(empty.totals.promptedRate30d, null);
        assert.equal(empty.totals.lastPlayedAt, null);
        assert.equal(empty.totals.gamesTried, 0);
        assert.equal(empty.totals.levelsAvailable, 7 * 15);
        assert.deepEqual(empty.recentSessions, []);
    });

    it("returns one empty entry for each of the last 30 Belgrade days, oldest first, ending today", () => {
        assert.equal(empty.windowDays, ACTIVITY_WINDOW_DAYS);
        assert.equal(empty.timeZone, PROGRESS_TIME_ZONE);
        assert.equal(empty.daily.length, 30);
        assert.equal(empty.daily[0].date, "2026-02-14");
        assert.equal(empty.daily[29].date, "2026-03-15");
        for (const [index, day] of empty.daily.entries()) {
            assert.deepEqual({ plays: day.plays, minutes: day.minutes, games: day.games }, { plays: 0, minutes: 0, games: {} });
            if (index > 0) assert.equal(dayKeyToDate(day.date).getTime() - dayKeyToDate(empty.daily[index - 1].date).getTime(), 86_400_000);
        }
    });

    it("ignores rows that are not usable", () => {
        const rows = [
            null,
            "x",
            log({ activity_id: 2 }),
            log({ activity_id: 999 }),
            log({ completed_at: "yesterday" }),
            log({ completed_at: null }),
            log({ id: "abc" }),
            legacyLog("bez nivoa i zvezdica"),
        ];
        assert.equal(buildProgress(rows, NOW).totals.plays, 0);
    });
});

describe("independent and prompted rates", () => {
    it("divide independently solved and prompted tasks by all tasks of the last 30 days", () => {
        const game = shapes([
            log({ correct_count: 3, total_count: 4, prompted_count: 1 }),
            log({ correct_count: 1, total_count: 4, prompted_count: 2 }),
        ]);
        assert.equal(game.independentRate30d, 0.5);
        assert.equal(game.promptedRate30d, 0.375);
    });

    it("weigh sessions by their number of tasks, not equally", () => {
        const game = shapes([log({ correct_count: 1, total_count: 1, prompted_count: 0 }), log({ correct_count: 0, total_count: 9, prompted_count: 9 })]);
        assert.equal(game.independentRate30d, 0.1);
        assert.equal(game.promptedRate30d, 0.9);
    });

    it("leave out sessions older than 30 days but still count them as plays", () => {
        const game = shapes([
            log({ correct_count: 4, total_count: 4, prompted_count: 0 }),
            log({ correct_count: 0, total_count: 4, prompted_count: 4, completed_at: "2026-01-01T10:00:00Z" }),
        ]);
        assert.equal(game.plays, 2);
        assert.equal(game.independentRate30d, 1);
        assert.equal(game.promptedRate30d, 0);
    });

    it("are null when no session in the window has answer counts", () => {
        const game = shapes([legacyLog("Nivo 1, Zvezdice: 3, Rezultat: 50")]);
        assert.equal(game.plays, 1);
        assert.equal(game.independentRate30d, null);
        assert.equal(game.promptedRate30d, null);
    });

    it("report the prompted rate as null while help was never recorded", () => {
        const game = shapes([log({ prompted_count: undefined }), log({ prompted_count: null })]);
        assert.equal(game.independentRate30d, 0.8);
        assert.equal(game.promptedRate30d, null);
    });

    it("never let independent plus prompted exceed 100%, even for a corrupt row", () => {
        const response = buildProgress([log({ correct_count: 9, total_count: 5, prompted_count: 7 }), log({ correct_count: 2, total_count: 5, prompted_count: 7 })], NOW);
        const game = gameOf(response, "shapes");
        assert.equal(game.independentRate30d, 0.7);
        assert.equal(game.promptedRate30d, 0.3);
        assert.deepEqual(
            response.recentSessions.map((session) => [session.independentCount, session.promptedCount, session.totalCount]),
            [
                [2, 3, 5],
                [5, 0, 5],
            ]
        );
    });

    it("add up across games in the totals", () => {
        const { totals } = buildProgress(
            [log({ correct_count: 4, total_count: 4, prompted_count: 0 }), log({ activity_id: MEMORY, correct_count: 0, total_count: 4, prompted_count: 2 })],
            NOW
        );
        assert.equal(totals.independentRate30d, 0.5);
        assert.equal(totals.promptedRate30d, 0.25);
    });
});

describe("mastery of the current tier", () => {
    const strong = { correct_count: 4, total_count: 5 };
    const weak = { correct_count: 3, total_count: 4 };

    it("uses the documented thresholds", () => {
        assert.equal(MASTERY_RATIO, 0.8);
        assert.equal(MASTERY_SESSIONS, 3);
        assert.equal(MASTERY_MIN_DAYS, 2);
    });

    it("is mastered after three sessions at 80% or more that fall on two different days", () => {
        const game = shapes([
            log({ ...strong, completed_at: "2026-03-10T09:00:00Z" }),
            log({ ...strong, completed_at: "2026-03-10T10:00:00Z" }),
            log({ ...strong, completed_at: "2026-03-11T10:00:00Z" }),
        ]);
        assert.equal(game.mastery, "mastered");
    });

    it("is only progressing when the three sessions were all played on one day", () => {
        const game = shapes([
            log({ ...strong, completed_at: "2026-03-10T09:00:00Z" }),
            log({ ...strong, completed_at: "2026-03-10T10:00:00Z" }),
            log({ ...strong, completed_at: "2026-03-10T11:00:00Z" }),
        ]);
        assert.equal(game.mastery, "progressing");
    });

    it("is only progressing when one of the last three sessions is below 80%", () => {
        const game = shapes([
            log({ ...strong, completed_at: "2026-03-10T09:00:00Z" }),
            log({ ...weak, completed_at: "2026-03-11T10:00:00Z" }),
            log({ ...strong, completed_at: "2026-03-12T10:00:00Z" }),
        ]);
        assert.equal(game.mastery, "progressing");
    });

    it("is only progressing with fewer than three sessions", () => {
        const game = shapes([log({ ...strong, completed_at: "2026-03-10T09:00:00Z" }), log({ ...strong, completed_at: "2026-03-11T10:00:00Z" })]);
        assert.equal(game.mastery, "progressing");
    });

    it("looks only at the three most recent sessions", () => {
        const older = log({ correct_count: 0, total_count: 5, completed_at: "2026-03-08T10:00:00Z" });
        const recent = [
            log({ ...strong, completed_at: "2026-03-10T09:00:00Z" }),
            log({ ...strong, completed_at: "2026-03-11T10:00:00Z" }),
            log({ ...strong, completed_at: "2026-03-12T10:00:00Z" }),
        ];
        assert.equal(shapes([older, ...recent]).mastery, "mastered");

        const newerWeak = log({ ...weak, completed_at: "2026-03-13T10:00:00Z" });
        assert.equal(shapes([...recent, newerWeak]).mastery, "progressing");
    });

    it("does not count sessions from a tier the child has already left", () => {
        const easyTier = [
            log({ level: 5, correct_count: 5, total_count: 5, completed_at: "2026-03-08T10:00:00Z" }),
            log({ level: 5, correct_count: 5, total_count: 5, completed_at: "2026-03-09T10:00:00Z" }),
            log({ level: 5, correct_count: 5, total_count: 5, completed_at: "2026-03-10T10:00:00Z" }),
        ];
        const afterEasy = shapes(easyTier);
        assert.equal(afterEasy.currentLevel, 6);
        assert.equal(afterEasy.tier, "medium");
        assert.equal(afterEasy.mastery, "progressing");

        const mediumTier = [
            log({ level: 6, ...strong, completed_at: "2026-03-11T10:00:00Z" }),
            log({ level: 6, ...strong, completed_at: "2026-03-12T10:00:00Z" }),
            log({ level: 7, ...strong, completed_at: "2026-03-12T11:00:00Z" }),
        ];
        const afterMedium = shapes([...easyTier, ...mediumTier]);
        assert.equal(afterMedium.tier, "medium");
        assert.equal(afterMedium.mastery, "mastered");
    });

    it("counts days in Belgrade: 23:30 and 00:30 local time are two days although one UTC day", () => {
        const game = shapes([
            log({ ...strong, completed_at: "2026-03-10T22:20:00Z" }),
            log({ ...strong, completed_at: "2026-03-10T22:30:00Z" }),
            log({ ...strong, completed_at: "2026-03-10T23:30:00Z" }),
        ]);
        assert.equal(game.mastery, "mastered");
    });

    it("counts days in Belgrade: 00:30 and 11:00 local time are one day although two UTC days", () => {
        const game = shapes([
            log({ ...strong, completed_at: "2026-03-10T23:30:00Z" }),
            log({ ...strong, completed_at: "2026-03-11T09:00:00Z" }),
            log({ ...strong, completed_at: "2026-03-11T10:00:00Z" }),
        ]);
        assert.equal(game.mastery, "progressing");
    });

    it("is not started while the game has only old records without answer counts", () => {
        const game = shapes([legacyLog("Nivo 1, Zvezdice: 3, Rezultat: 50"), legacyLog("Nivo 2, Zvezdice: 3, Rezultat: 50")]);
        assert.equal(game.plays, 2);
        assert.equal(game.mastery, "not_started");
    });

    it("is never assessed for emotions, the game without wrong answers", () => {
        const response = buildProgress(
            [
                log({ activity_id: EMOTIONS, correct_count: 5, total_count: 5, completed_at: "2026-03-10T10:00:00Z" }),
                log({ activity_id: EMOTIONS, correct_count: 5, total_count: 5, completed_at: "2026-03-11T10:00:00Z" }),
                log({ activity_id: EMOTIONS, correct_count: 5, total_count: 5, completed_at: "2026-03-12T10:00:00Z" }),
            ],
            NOW
        );
        assert.equal(gameOf(response, "emotions").mastery, "ungraded");
    });
});

describe("needsSupport", () => {
    const low = { correct_count: 1, total_count: 4 };

    it("uses the same threshold as the suggestion to move on", () => {
        assert.equal(SUPPORT_RATIO, 0.5);
        assert.equal(SUPPORT_SESSIONS, 3);
    });

    it("is true when the last three sessions were all below 50% independent", () => {
        assert.equal(shapes([log(low), log(low), log(low)]).needsSupport, true);
    });

    it("is false when one of the last three reached exactly 50%", () => {
        assert.equal(shapes([log(low), log({ correct_count: 2, total_count: 4 }), log(low)]).needsSupport, false);
    });

    it("is false with fewer than three sessions", () => {
        assert.equal(shapes([log(low), log(low)]).needsSupport, false);
    });

    it("looks only at the three most recent sessions", () => {
        const good = log({ correct_count: 4, total_count: 4, completed_at: "2026-03-01T10:00:00Z" });
        const recentLow = ["2026-03-10", "2026-03-11", "2026-03-12"].map((day) => log({ ...low, completed_at: `${day}T10:00:00Z` }));
        assert.equal(shapes([good, ...recentLow]).needsSupport, true);

        const newerGood = log({ correct_count: 4, total_count: 4, completed_at: "2026-03-13T10:00:00Z" });
        assert.equal(shapes([...recentLow, newerGood]).needsSupport, false);
    });

    it("is never raised for emotions, where a different answer is not a mistake", () => {
        const rows = [1, 2, 3].map(() => log({ activity_id: EMOTIONS, correct_count: 0, total_count: 4 }));
        assert.equal(gameOf(buildProgress(rows, NOW), "emotions").needsSupport, false);
    });
});

describe("levels and tiers", () => {
    it("splits the 15 levels into easy 1–5, medium 6–10 and hard 11–15", () => {
        assert.deepEqual(
            TIERS.map((tier) => [tier.id, tier.from, tier.to]),
            [
                ["easy", 1, 5],
                ["medium", 6, 10],
                ["hard", 11, 15],
            ]
        );
        assert.equal(tierForLevel(5).id, "easy");
        assert.equal(tierForLevel(6).id, "medium");
        assert.equal(tierForLevel(10).id, "medium");
        assert.equal(tierForLevel(11).id, "hard");
        assert.equal(tierForLevel(99).id, "hard");
    });

    it("counts a level as completed from 50% independently correct", () => {
        assert.equal(shapes([log({ level: 3, correct_count: 2, total_count: 4 })]).highestLevelCompleted, 3);
        assert.equal(shapes([log({ level: 3, correct_count: 1, total_count: 4 })]).highestLevelCompleted, 0);
    });

    it("puts the child on the level after the highest completed one", () => {
        const game = shapes([log({ level: 4 }), log({ level: 7 }), log({ level: 9, correct_count: 0, total_count: 5 })]);
        assert.equal(game.highestLevelCompleted, 7);
        assert.equal(game.currentLevel, 8);
        assert.equal(game.tier, "medium");
    });

    it("keeps the child on level 15 once every level is completed", () => {
        const game = shapes([log({ level: 15 })]);
        assert.equal(game.highestLevelCompleted, 15);
        assert.equal(game.currentLevel, 15);
        assert.equal(game.tier, "hard");
    });

    it("trusts the pass decision stored with the session over the answer counts", () => {
        assert.equal(shapes([log({ level: 3, correct_count: 5, total_count: 5, passed: false })]).highestLevelCompleted, 0);
        assert.equal(shapes([log({ level: 3, correct_count: 0, total_count: 5, passed: true })]).highestLevelCompleted, 3);
    });

    it("completes any finished emotions level, whatever was answered", () => {
        const response = buildProgress([log({ activity_id: EMOTIONS, level: 4, correct_count: 0, total_count: 5 })], NOW);
        assert.equal(gameOf(response, "emotions").highestLevelCompleted, 4);
    });

    it("ignores a level outside 1–15", () => {
        const game = shapes([log({ level: 16 }), log({ level: 0 })]);
        assert.equal(game.plays, 2);
        assert.equal(game.highestLevelCompleted, 0);
    });
});

describe("old records without the newer columns", () => {
    it("reads level, stars and score from the note", () => {
        const response = buildProgress([legacyLog("Nivo 3, Zvezdice: 2, Rezultat: 150", { success_level: "successful", duration_minutes: 2 })], NOW);
        const [session] = response.recentSessions;
        assert.equal(session.level, 3);
        assert.equal(session.stars, 2);
        assert.equal(session.score, 150);
        assert.equal(session.durationSeconds, 120);
        assert.equal(session.totalCount, null);
        assert.equal(session.independentCount, null);
        assert.equal(session.independentRatio, null);

        const game = gameOf(response, "shapes");
        assert.equal(game.highestLevelCompleted, 3);
        assert.equal(game.bestScore, 150);
        assert.equal(game.totalMinutes, 2);
        assert.deepEqual(game.success, { struggled: 0, partial: 0, successful: 1, excellent: 0 });
    });

    it("completes a level with at least one star and not with zero stars", () => {
        assert.equal(shapes([legacyLog("Nivo 4, Zvezdice: 1, Rezultat: 10")]).highestLevelCompleted, 4);
        assert.equal(shapes([legacyLog("Nivo 4, Zvezdice: 0, Rezultat: 0")]).highestLevelCompleted, 0);
    });

    it("derives stars from the success level when the note has none", () => {
        const response = buildProgress(
            [
                legacyLog(null, { success_level: "excellent" }),
                legacyLog("Nivo 2", { success_level: "partial" }),
                legacyLog("", { success_level: "struggled" }),
            ],
            NOW
        );
        assert.deepEqual(response.recentSessions.map((session) => session.stars).sort(), [0, 1, 3]);
        assert.equal(response.totals.totalStars, 4);
    });

    it("prefers the columns over the note when both exist", () => {
        const [session] = buildProgress([log({ level: 6, stars: 1, score: 20, notes: "Nivo 3, Zvezdice: 3, Rezultat: 999" })], NOW).recentSessions;
        assert.deepEqual([session.level, session.stars, session.score], [6, 1, 20]);
    });

    it("computes stars from the answer counts when nothing else says how it went", () => {
        const [session] = buildProgress([log({ stars: null, correct_count: 2, total_count: 4 })], NOW).recentSessions;
        assert.equal(session.stars, 2);
    });

    it("reads a timestamp without a zone as UTC", () => {
        const [session] = buildProgress([log({ completed_at: "2026-03-10 10:00:00" })], NOW).recentSessions;
        assert.equal(session.completedAt, "2026-03-10T10:00:00.000Z");
    });

    it("reads a timestamp with a full zone offset, as the API returns it", () => {
        const [session] = buildProgress([log({ completed_at: "2026-03-10T12:00:00.123456+02:00" })], NOW).recentSessions;
        assert.equal(session.completedAt, "2026-03-10T10:00:00.123Z");
    });

    it(
        "reads a timestamp with an hours-only zone offset, as Postgres prints it",
        () => {
            assert.equal(buildProgress([log({ completed_at: "2026-03-10 10:00:00+00" })], NOW).totals.plays, 1);
        }
    );

    it("reads numbers that arrive as strings", () => {
        const [session] = buildProgress([log({ id: "77", activity_id: "1", level: "4", stars: "2", correct_count: "3", total_count: "4" })], NOW).recentSessions;
        assert.deepEqual([session.id, session.level, session.stars, session.independentRatio], [77, 4, 2, 0.75]);
    });
});

describe("mood", () => {
    const visit = { id: 7, mood_before: "happy", mood_after: "neutral" };

    it("is counted once per visit, however many levels were played in it", () => {
        const rows = [log({ session_id: 7 }), log({ session_id: 7 }), log({ session_id: 7 })];
        const response = buildProgress(rows, NOW, [visit]);
        assert.equal(response.mood.before.happy, 1);
        assert.equal(response.mood.after.neutral, 1);
        assert.equal(gameOf(response, "shapes").mood.before.happy, 1);
        assert.equal(response.totals.plays, 3);
    });

    it("is counted once for each game played in the visit, and once overall", () => {
        const rows = [log({ session_id: 7 }), log({ session_id: 7 }), log({ session_id: 7, activity_id: MEMORY })];
        const response = buildProgress(rows, NOW, [visit]);
        assert.equal(response.mood.before.happy, 1);
        assert.equal(gameOf(response, "shapes").mood.before.happy, 1);
        assert.equal(gameOf(response, "memory").mood.before.happy, 1);
        assert.equal(gameOf(response, "emotions").mood.before.happy, 0);
    });

    it("comes from the visit, not from the session row, when the visit is known", () => {
        const response = buildProgress([log({ session_id: 7, mood_before: "upset", mood_after: "upset" })], NOW, [visit]);
        assert.equal(response.mood.before.happy, 1);
        assert.equal(response.mood.before.upset, 0);
        assert.deepEqual([response.recentSessions[0].moodBefore, response.recentSessions[0].moodAfter], ["happy", "neutral"]);
    });

    it("counts separate visits separately", () => {
        const rows = [log({ session_id: 7 }), log({ session_id: 8 })];
        const response = buildProgress(rows, NOW, [visit, { id: 8, mood_before: "happy", mood_after: null }]);
        assert.equal(response.mood.before.happy, 2);
        assert.equal(response.mood.after.neutral, 1);
    });

    it("is counted per session row for old records that have no visit", () => {
        const rows = [log({ mood_before: "happy" }), log({ mood_before: "happy" }), log({ mood_before: "upset", mood_after: "very_happy" })];
        const response = buildProgress(rows, NOW);
        assert.equal(response.mood.before.happy, 2);
        assert.equal(response.mood.before.upset, 1);
        assert.equal(response.mood.after.very_happy, 1);
    });

    it("falls back to the session row when the visit it points to was not supplied", () => {
        const rows = [log({ session_id: 99, mood_before: "neutral" }), log({ session_id: 99, mood_before: "neutral" })];
        assert.equal(buildProgress(rows, NOW, [visit]).mood.before.neutral, 2);
    });

    it("ignores values that are not one of the five moods", () => {
        const response = buildProgress([log({ mood_before: "ecstatic", mood_after: 5 })], NOW);
        assert.deepEqual(response.mood.before, { very_upset: 0, upset: 0, neutral: 0, happy: 0, very_happy: 0 });
        assert.deepEqual(response.mood.after, response.mood.before);
    });
});

describe("days are Belgrade days", () => {
    it("puts a session played at 00:30 Belgrade time on that day, not on the previous UTC day", () => {
        const response = buildProgress([log({ completed_at: "2026-03-14T23:30:00Z", duration_seconds: 90 })], NOW);
        const today = response.daily[29];
        assert.equal(today.date, "2026-03-15");
        assert.equal(today.plays, 1);
        assert.equal(today.minutes, 1.5);
        assert.deepEqual(today.games, { shapes: { plays: 1, minutes: 1.5 } });
        assert.equal(response.daily[28].plays, 0);
    });

    it("splits two sessions around Belgrade midnight into two active days", () => {
        const response = buildProgress([log({ completed_at: "2026-03-10T22:59:00Z" }), log({ completed_at: "2026-03-10T23:01:00Z" })], NOW);
        assert.equal(response.totals.activeDays, 2);
        assert.deepEqual(
            response.daily.filter((day) => day.plays > 0).map((day) => day.date),
            ["2026-03-10", "2026-03-11"]
        );
        assert.deepEqual(
            gameOf(response, "shapes").trend.map((point) => point.date),
            ["2026-03-10", "2026-03-11"]
        );
    });

    it("uses summer time (UTC+2) in July", () => {
        const july = new Date("2026-07-15T12:00:00Z");
        const response = buildProgress([log({ completed_at: "2026-07-10T22:30:00Z" })], july);
        assert.deepEqual(
            response.daily.filter((day) => day.plays > 0).map((day) => day.date),
            ["2026-07-11"]
        );
    });

    it("takes today from Belgrade too: at 23:30 UTC it is already tomorrow", () => {
        const lateEvening = new Date("2026-03-15T23:30:00Z");
        const response = buildProgress([log({ completed_at: "2026-03-15T23:10:00Z" })], lateEvening);
        assert.equal(response.daily[29].date, "2026-03-16");
        assert.equal(response.daily[29].plays, 1);
        assert.equal(response.generatedAt, "2026-03-15T23:30:00.000Z");
    });

    it("counts the 30-day window including today: 29 days ago is in, 30 days ago is out", () => {
        const response = buildProgress(
            [log({ completed_at: "2026-02-14T10:00:00Z" }), log({ completed_at: "2026-02-13T10:00:00Z" }), log({ completed_at: "2026-03-15T08:00:00Z" })],
            NOW
        );
        assert.equal(response.totals.activeDays, 3);
        assert.equal(response.totals.daysPlayed30d, 2);
        assert.equal(response.daily[0].plays, 1);
        assert.equal(
            response.daily.reduce((sum, day) => sum + day.plays, 0),
            2
        );
    });
});

describe("totals and recent sessions", () => {
    it("sum plays, minutes and stars and average the stars to two decimals", () => {
        const { totals } = buildProgress(
            [
                log({ stars: 3, duration_seconds: 100 }),
                log({ stars: 2, duration_seconds: 100 }),
                log({ stars: 2, duration_seconds: 40, activity_id: MEMORY, level: 2 }),
            ],
            NOW
        );
        assert.equal(totals.plays, 3);
        assert.equal(totals.totalMinutes, 4);
        assert.equal(totals.totalStars, 7);
        assert.equal(totals.averageStars, 2.33);
        assert.equal(totals.gamesTried, 2);
        assert.equal(totals.levelsCompleted, 1 + 2);
    });

    it("report the most recent play and the best score per game", () => {
        const response = buildProgress(
            [log({ score: 80, completed_at: "2026-03-12T10:00:00Z" }), log({ score: 120, completed_at: "2026-03-09T10:00:00Z" })],
            NOW
        );
        assert.equal(response.totals.lastPlayedAt, "2026-03-12T10:00:00.000Z");
        assert.equal(gameOf(response, "shapes").bestScore, 120);
        assert.equal(gameOf(response, "memory").lastPlayedAt, null);
    });

    it("list sessions newest first, with the higher id first when the time is equal", () => {
        const rows = [
            log({ id: 501, completed_at: "2026-03-10T10:00:00Z" }),
            log({ id: 503, completed_at: "2026-03-11T10:00:00Z" }),
            log({ id: 502, completed_at: "2026-03-10T10:00:00Z" }),
        ];
        assert.deepEqual(
            buildProgress(rows, NOW).recentSessions.map((session) => session.id),
            [503, 502, 501]
        );
    });

    it("keep the 30 newest sessions overall plus up to 10 per game beyond that", () => {
        const minute = (index: number) => new Date(Date.UTC(2026, 2, 10, 10, index)).toISOString();
        const newerShapes = Array.from({ length: 35 }, (_, index) => log({ completed_at: minute(100 + index) }));
        const olderMemory = Array.from({ length: 12 }, (_, index) => log({ activity_id: MEMORY, completed_at: minute(index) }));
        const { recentSessions } = buildProgress([...olderMemory, ...newerShapes], NOW);

        assert.equal(recentSessions.filter((session) => session.gameId === "shapes").length, 30);
        assert.equal(recentSessions.filter((session) => session.gameId === "memory").length, 10);
        assert.equal(recentSessions[0].completedAt, minute(134));
    });

    it("show the last ten sessions with answer counts as a trend, oldest first", () => {
        const rows = Array.from({ length: 12 }, (_, index) =>
            log({ completed_at: `2026-03-${String(index + 1).padStart(2, "0")}T10:00:00Z`, level: 2, correct_count: index % 5, total_count: 4 + (index % 5), prompted_count: null })
        );
        const { trend } = shapes(rows);
        assert.equal(trend.length, 10);
        assert.equal(trend[0].date, "2026-03-03");
        assert.equal(trend[9].date, "2026-03-12");
        assert.deepEqual(trend[9], { date: "2026-03-12", independentRatio: 0.2, promptedRatio: null, level: 2 });
    });

    it("count how sessions went by success level", () => {
        const game = shapes([log({ stars: 3 }), log({ stars: 3 }), log({ stars: 1 }), log({ stars: 0, success_level: "struggled" })]);
        assert.deepEqual(game.success, { struggled: 1, partial: 1, successful: 0, excellent: 2 });
    });
});
