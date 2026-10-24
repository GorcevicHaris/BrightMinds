// POST/PATCH /api/activities/complete — čuvanje završene partije i raspoloženja posle igre.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GAME_LOCKED, PATCH, POST } from "@/app/api/activities/complete/route";
import { resolveSettings } from "@/lib/childSettings";
import { GAMES, sortGamesForChild } from "@/lib/games";
import {
    CHILD_ID,
    OTHER_CHILD_ID,
    PARENT,
    advanceClock,
    db,
    jsonRequest,
    readJson,
    resetWorld,
    seedFamily,
    signInAsChild,
    signInAsParent,
} from "../setup/api";

const EMOTIONS = 8;

/** Ispravan rezultat: „Pogodi oblik”, nivo 3, 4 od 5 samostalno i 1 uz pomoć. */
const result = (overrides: Record<string, unknown> = {}) => ({
    childId: CHILD_ID,
    activityId: 1,
    level: 3,
    score: 120,
    correct: 4,
    total: 5,
    prompted: 1,
    durationSec: 95,
    ...overrides,
});

const post = (body: unknown) => POST(jsonRequest("POST", body));
const patch = (body: unknown) => PATCH(jsonRequest("PATCH", body));
const logs = () => db.rows("progress_logs");
const visits = () => db.rows("play_sessions");
const childRow = (id = CHILD_ID) => db.rows("children").find((row) => row.id === id);

/** Baza pre migracije 0004: nema posete ni kolona `session_id` i `passed`. */
function withoutMigration4(): void {
    db.dropTable("play_sessions");
    db.dropColumns("progress_logs", "session_id", "passed");
}

beforeEach(() => {
    resetWorld();
    seedFamily();
    signInAsParent();
});

describe("POST /api/activities/complete — validation", () => {
    const invalid: [string, unknown][] = [
        ["a body that is not JSON", "{oops"],
        ["a body that is a list", [result()]],
        ["a missing child id", result({ childId: undefined })],
        ["a child id that is not a positive whole number", result({ childId: "abc" })],
        ["an activity that is not one of the games", result({ activityId: 2 })],
        ["a missing activity", result({ activityId: undefined })],
        ["level 0", result({ level: 0 })],
        ["level 16", result({ level: 16 })],
        ["a fractional level", result({ level: 2.5 })],
        ["more correct answers than tasks", result({ correct: 6, total: 5, prompted: 0 })],
        ["a negative number of correct answers", result({ correct: -1 })],
        ["a missing total", result({ total: undefined })],
        ["more than 1000 tasks", result({ correct: 0, total: 1001, prompted: 0 })],
        ["a negative score", result({ score: -1 })],
        ["a score above one million", result({ score: 1_000_001 })],
        ["a score that is not a number", result({ score: "lots" })],
        ["a duration of zero seconds", result({ durationSec: 0 })],
        ["a duration above two hours", result({ durationSec: 7201 })],
        ["independent plus prompted answers above the number of tasks", result({ correct: 4, prompted: 2, total: 5 })],
        ["a prompted count that is not a whole number", result({ prompted: "one" })],
        ["an unknown mood", result({ moodBefore: "ecstatic" })],
    ];

    for (const [name, body] of invalid) {
        it(`answers 400 and stores nothing for ${name}`, async () => {
            const response = await post(body);
            assert.equal(response.status, 400);
            assert.equal(typeof (await readJson(response)).error, "string");
            assert.deepEqual(logs(), []);
            assert.deepEqual(visits(), []);
            assert.equal(childRow()?.experience_points, 0);
        });
    }
});

describe("POST /api/activities/complete — saving a result", () => {
    it("stores the session with stars computed on the server and returns the summary", async () => {
        const response = await post(result({ score: 120.6, durationSec: 95.4, moodBefore: "happy" }));
        assert.equal(response.status, 200);

        const [visit] = visits();
        const [stored] = logs();
        assert.deepEqual(await readJson(response), {
            success: true,
            logId: stored.id,
            stars: 3,
            experiencePoints: 15,
            sessionId: visit.id,
        });
        assert.deepEqual(stored, {
            id: stored.id,
            child_id: CHILD_ID,
            activity_id: 1,
            success_level: "excellent",
            duration_minutes: 2,
            notes: "Nivo 3, Zvezdice: 3, Rezultat: 121",
            recorded_by: PARENT.id,
            level: 3,
            stars: 3,
            score: 121,
            correct_count: 4,
            total_count: 5,
            duration_seconds: 95,
            prompted_count: 1,
            session_id: visit.id,
            passed: true,
        });
        assert.equal(logs().length, 1);
    });

    it("keeps the mood before play once, on the visit, not on the session row", async () => {
        await post(result({ moodBefore: "upset" }));
        assert.deepEqual(visits(), [{ id: visits()[0].id, child_id: CHILD_ID, mood_before: "upset", created_by: PARENT.id }]);
        assert.equal("mood_before" in logs()[0], false);
    });

    it("ignores stars, success level and pass decision sent by the client", async () => {
        const response = await post(result({ correct: 1, total: 4, prompted: 3, stars: 3, passed: true, success_level: "excellent", successLevel: "excellent" }));
        const body = await readJson(response);
        assert.equal(body.stars, 1);
        assert.equal(body.experiencePoints, 5);
        const [stored] = logs();
        assert.equal(stored.stars, 1);
        assert.equal(stored.success_level, "partial");
        assert.equal(stored.passed, false);
    });

    it("gives 1 star below 50%, 2 stars from 50% and 3 stars from 80% independently correct", async () => {
        const cases: [correct: number, total: number, stars: number, passed: boolean][] = [
            [0, 5, 1, false],
            [2, 5, 1, false],
            [5, 10, 2, true],
            [7, 10, 2, true],
            [8, 10, 3, true],
        ];
        for (const [correct, total, stars, passed] of cases) {
            const body = await readJson(await post(result({ correct, total, prompted: 0 })));
            assert.equal(body.stars, stars, `${correct}/${total}`);
            assert.equal(logs().at(-1)?.passed, passed, `${correct}/${total}`);
        }
    });

    it("does not count prompted answers towards stars or passing", async () => {
        const body = await readJson(await post(result({ correct: 1, prompted: 4, total: 5 })));
        assert.equal(body.stars, 1);
        assert.equal(logs()[0].passed, false);
        assert.equal(logs()[0].prompted_count, 4);
    });

    it("gives one star for a finished activity with no graded tasks and passes the level", async () => {
        // Npr. priča u režimu samo čitanja: čitanje je cilj, pa otključava sledeću priču
        const body = await readJson(await post(result({ correct: 0, total: 0, prompted: 0 })));
        assert.equal(body.stars, 1);
        assert.equal(logs()[0].stars, 1);
        assert.equal(logs()[0].success_level, "partial");
        assert.equal(logs()[0].passed, true);
    });

    it("grades an emotions level like every other game", async () => {
        await post(result({ activityId: EMOTIONS, correct: 0, total: 4, prompted: 0 }));
        await post(result({ correct: 0, total: 4, prompted: 0 }));
        assert.equal(logs()[0].passed, logs()[1].passed);
        assert.equal(logs()[0].stars, logs()[1].stars);
    });

    it("leaves the prompted column out when the client did not send it", async () => {
        await post(result({ prompted: undefined }));
        assert.equal("prompted_count" in logs()[0], false);
        await post(result({ prompted: null }));
        assert.equal("prompted_count" in logs()[1], false);
    });

    it("rounds the play time up to whole minutes for the old minutes column", async () => {
        await post(result({ durationSec: 1 }));
        await post(result({ durationSec: 60 }));
        await post(result({ durationSec: 61 }));
        assert.deepEqual(
            logs().map((row) => [row.duration_seconds, row.duration_minutes]),
            [
                [1, 1],
                [60, 1],
                [61, 2],
            ]
        );
    });

    it("adds 5 points per star to the child's points", async () => {
        db.rows("children")[0].experience_points = 40;
        const body = await readJson(await post(result({ correct: 5, total: 10, prompted: 0 })));
        assert.equal(body.experiencePoints, 50);
        assert.equal(childRow()?.experience_points, 50);
        assert.equal(childRow(OTHER_CHILD_ID)?.experience_points, 40);
    });

    it("starts from zero when the child's points were never set", async () => {
        db.rows("children")[0].experience_points = null;
        const body = await readJson(await post(result()));
        assert.equal(body.experiencePoints, 15);
        assert.equal(childRow()?.experience_points, 15);
    });

    it("records the parent account as the recorder when the child itself is signed in", async () => {
        signInAsChild(CHILD_ID);
        const response = await post(result());
        assert.equal(response.status, 200);
        assert.equal(logs()[0].recorded_by, PARENT.id);
        assert.equal(logs()[0].child_id, CHILD_ID);
    });

    it("accepts numbers sent as numeric strings", async () => {
        const response = await post(result({ childId: "1", activityId: "1", level: "3", correct: "4", total: "5", prompted: "1", score: "120", durationSec: "95" }));
        assert.equal(response.status, 200);
        assert.equal(logs()[0].level, 3);
    });
});

describe("POST /api/activities/complete — visits", () => {
    it("keeps later levels in the visit the client sends back", async () => {
        const first = await readJson(await post(result({ moodBefore: "happy" })));
        const second = await readJson(await post(result({ level: 4, sessionId: first.sessionId, moodBefore: "upset" })));
        assert.equal(second.sessionId, first.sessionId);
        assert.equal(visits().length, 1);
        assert.equal(visits()[0].mood_before, "happy");
        assert.deepEqual(
            logs().map((row) => row.session_id),
            [first.sessionId, first.sessionId]
        );
    });

    it("opens a new visit instead of joining a visit of another child", async () => {
        db.seed("play_sessions", [{ id: 50, child_id: OTHER_CHILD_ID, mood_before: "happy", created_by: 20 }]);
        const body = await readJson(await post(result({ sessionId: 50 })));
        assert.notEqual(body.sessionId, 50);
        assert.equal(logs()[0].session_id, body.sessionId);
        assert.equal(visits().find((row) => row.id === body.sessionId)?.child_id, CHILD_ID);
    });

    it("opens a new visit when the visit id is unusable", async () => {
        const body = await readJson(await post(result({ sessionId: "abc" })));
        assert.equal(typeof body.sessionId, "number");
        assert.equal(visits().length, 1);
    });

    it("still saves the result when the visit cannot be written", async (t) => {
        const logged = t.mock.method(console, "error", () => undefined);
        db.failNext("play_sessions", "insert", { code: "XX000" });
        const response = await post(result({ moodBefore: "happy" }));
        assert.equal(response.status, 200);
        assert.equal((await readJson(response)).sessionId, null);
        assert.equal(logs().length, 1);
        assert.equal(logs()[0].mood_before, "happy");
        assert.equal(logged.mock.callCount(), 1);
    });
});

describe("POST /api/activities/complete — database without newer migrations", () => {
    it("saves the result without a visit when migration 0004 is missing", async () => {
        withoutMigration4();
        const response = await post(result({ moodBefore: "happy" }));
        assert.equal(response.status, 200);
        const body = await readJson(response);
        assert.deepEqual({ success: body.success, stars: body.stars, sessionId: body.sessionId }, { success: true, stars: 3, sessionId: null });

        const [stored] = logs();
        assert.equal(body.logId, stored.id);
        assert.equal(stored.mood_before, "happy");
        assert.equal(stored.level, 3);
        assert.equal(stored.correct_count, 4);
        assert.equal(stored.prompted_count, 1);
        assert.equal("session_id" in stored, false);
        assert.equal("passed" in stored, false);
    });

    it("saves the result without the prompted count when migration 0002 is missing too", async () => {
        withoutMigration4();
        db.dropColumns("progress_logs", "prompted_count");
        const response = await post(result());
        assert.equal(response.status, 200);
        const [stored] = logs();
        assert.equal(stored.stars, 3);
        assert.equal(stored.total_count, 5);
        assert.equal("prompted_count" in stored, false);
    });

    it("saves the result in the original columns when no migration was applied", async () => {
        withoutMigration4();
        db.dropColumns("progress_logs", "prompted_count", "level", "stars", "score", "correct_count", "total_count", "duration_seconds");
        const response = await post(result({ moodBefore: "neutral" }));
        assert.equal(response.status, 200);
        assert.equal((await readJson(response)).stars, 3);
        assert.deepEqual(logs(), [
            {
                id: logs()[0].id,
                child_id: CHILD_ID,
                activity_id: 1,
                success_level: "excellent",
                duration_minutes: 2,
                notes: "Nivo 3, Zvezdice: 3, Rezultat: 120",
                recorded_by: PARENT.id,
                mood_before: "neutral",
            },
        ]);
    });

    it("still awards points when the result was saved in an older shape", async () => {
        withoutMigration4();
        const body = await readJson(await post(result()));
        assert.equal(body.experiencePoints, 15);
        assert.equal(childRow()?.experience_points, 15);
    });

    it("remembers for a minute that the newer columns are missing, then tries them again", async () => {
        withoutMigration4();
        await post(result());
        assert.equal(db.count("progress_logs", "insert"), 2, "first save: newest shape fails, older shape succeeds");

        await post(result());
        assert.equal(db.count("progress_logs", "insert"), 3, "second save goes straight to the shape that worked");

        advanceClock(61_000);
        await post(result());
        assert.equal(db.count("progress_logs", "insert"), 5, "after a minute the newest shape is tried again");
        assert.equal(logs().length, 3);
    });

    it("uses the full shape again once the migration has been applied", async () => {
        withoutMigration4();
        await post(result());
        resetWorld();
        seedFamily();
        signInAsParent();
        const body = await readJson(await post(result()));
        assert.equal(typeof body.sessionId, "number");
        assert.equal(logs()[0].passed, true);
    });

    it("answers 500 without retrying when the database fails for another reason", async (t) => {
        const logged = t.mock.method(console, "error", () => undefined);
        db.failNext("progress_logs", "insert", { code: "23503", message: "foreign key violation: secret detail" });
        const response = await post(result());
        assert.equal(response.status, 500);
        const body = await readJson(response);
        assert.equal(typeof body.error, "string");
        assert.doesNotMatch(String(body.error), /secret detail|23503/);
        assert.equal(db.count("progress_logs", "insert"), 1);
        assert.equal(logs().length, 0);
        assert.equal(logged.mock.callCount(), 1);
    });

    it("keeps the saved result when awarding points fails", async (t) => {
        const logged = t.mock.method(console, "error", () => undefined);
        // Prvo čitanje deteta je provera da li je igra otključana; nagrada je upis poena
        db.failNext("children", "update", { code: "XX000" });
        const response = await post(result());
        assert.equal(response.status, 200);
        const body = await readJson(response);
        assert.equal(body.success, true);
        assert.equal(body.experiencePoints, null);
        assert.equal(logs().length, 1);
        assert.equal(logged.mock.callCount(), 1);
    });
});

describe("PATCH /api/activities/complete — mood after play", () => {
    const invalid: [string, Record<string, unknown>][] = [
        ["neither a visit nor a list of sessions", { childId: CHILD_ID, moodAfter: "happy" }],
        ["an unknown mood", { childId: CHILD_ID, sessionId: 1, moodAfter: "ecstatic" }],
        ["a missing mood", { childId: CHILD_ID, sessionId: 1 }],
        ["a visit id that is not a positive whole number", { childId: CHILD_ID, sessionId: "x", moodAfter: "happy" }],
        ["an empty list of sessions", { childId: CHILD_ID, logIds: [], moodAfter: "happy" }],
        ["more than 50 sessions", { childId: CHILD_ID, logIds: Array.from({ length: 51 }, (_, index) => index + 1), moodAfter: "happy" }],
        ["a session id that is not a whole number", { childId: CHILD_ID, logIds: [1, "x"], moodAfter: "happy" }],
        ["a missing child id", { sessionId: 1, moodAfter: "happy" }],
    ];

    for (const [name, body] of invalid) {
        it(`answers 400 for ${name}`, async () => {
            assert.equal((await patch(body)).status, 400);
        });
    }

    it("stores the mood and the end time on the child's visit", async () => {
        const saved = await readJson(await post(result({ moodBefore: "upset" })));
        const response = await patch({ childId: CHILD_ID, sessionId: saved.sessionId, moodAfter: "very_happy" });
        assert.equal(response.status, 200);
        assert.deepEqual(await readJson(response), { success: true });
        assert.equal(visits()[0].mood_after, "very_happy");
        assert.equal(visits()[0].mood_before, "upset");
        assert.equal(visits()[0].ended_at, new Date().toISOString());
        assert.equal("mood_after" in logs()[0], false);
    });

    it("answers 404 and changes nothing for a visit of another child", async () => {
        db.seed("play_sessions", [{ id: 50, child_id: OTHER_CHILD_ID, mood_before: "happy", mood_after: null }]);
        const response = await patch({ childId: CHILD_ID, sessionId: 50, moodAfter: "upset" });
        assert.equal(response.status, 404);
        assert.equal(visits()[0].mood_after, null);
    });

    it("stores the mood on the listed sessions when the database has no visits", async () => {
        withoutMigration4();
        const first = await readJson(await post(result()));
        const second = await readJson(await post(result({ level: 4 })));
        const response = await patch({ childId: CHILD_ID, sessionId: 123, logIds: [first.logId, second.logId], moodAfter: "happy" });
        assert.equal(response.status, 200);
        assert.deepEqual(
            logs().map((row) => row.mood_after),
            ["happy", "happy"]
        );
    });

    it("never changes sessions of another child, even when their ids are listed", async () => {
        db.seed("progress_logs", [
            { id: 1, child_id: CHILD_ID, activity_id: 1, mood_after: null },
            { id: 2, child_id: OTHER_CHILD_ID, activity_id: 1, mood_after: null },
        ]);
        const response = await patch({ childId: CHILD_ID, logIds: [1, 2], moodAfter: "happy" });
        assert.equal(response.status, 200);
        assert.deepEqual(
            logs().map((row) => row.mood_after),
            ["happy", null]
        );
    });

    it("writes the mood only on the visit when both a visit and sessions are sent", async () => {
        const saved = await readJson(await post(result()));
        await patch({ childId: CHILD_ID, sessionId: saved.sessionId, logIds: [saved.logId], moodAfter: "neutral" });
        assert.equal(visits()[0].mood_after, "neutral");
        assert.equal("mood_after" in logs()[0], false);
    });
});

describe("POST /api/activities/complete — games the parent locked", () => {
    /** Igre redom za Milu (uzrast iz datuma rođenja, kao na serveru) */
    const order = () => {
        const mila = childRow()!;
        return sortGamesForChild(GAMES, resolveSettings(mila.settings, mila.date_of_birth as string).playAge);
    };
    /** Pogled `child_game_progress` (u lažnoj bazi je to obična tabela) */
    const passedLevels = (activityId: number, upTo: number) =>
        db.seed("child_game_progress", [{ child_id: CHILD_ID, activity_id: activityId, highest_level_passed: upTo }]);

    it("refuses a game the parent switched off, for the child and the parent alike, and stores nothing", async () => {
        childRow()!.settings = { disabledGames: ["shapes"] };
        for (const signIn of [() => signInAsChild(CHILD_ID), () => signInAsParent()]) {
            signIn();
            const response = await post(result({ activityId: 1 }));
            assert.equal(response.status, 403);
            assert.deepEqual(await readJson(response), { error: GAME_LOCKED });
        }
        assert.equal(logs().length, 0);
        assert.equal(visits().length, 0);
        assert.equal(childRow()?.experience_points, 0);
        assert.equal((await post(result({ activityId: 3 }))).status, 200);
    });

    it("with unlocking in order, saves only the first game until its level 3 is passed", async () => {
        childRow()!.settings = { unlockInOrder: true };
        signInAsChild(CHILD_ID);
        const [first, second, third] = order();
        assert.equal((await post(result({ activityId: second.activityId, level: 1 }))).status, 403);
        assert.equal((await post(result({ activityId: first.activityId, level: 1 }))).status, 200);

        passedLevels(first.activityId, 3);
        assert.equal((await post(result({ activityId: second.activityId, level: 1 }))).status, 200);
        assert.equal((await post(result({ activityId: third.activityId, level: 1 }))).status, 403);
    });

    it("with unlocking in order, still saves games from the parent's plan and games already played", async () => {
        const [, second, third] = order();
        childRow()!.settings = { unlockInOrder: true, plan: [third.id] };
        passedLevels(second.activityId, 1);
        signInAsChild(CHILD_ID);
        assert.equal((await post(result({ activityId: third.activityId, level: 1 }))).status, 200);
        assert.equal((await post(result({ activityId: second.activityId, level: 2 }))).status, 200);
    });

    it("saves every game when nothing is locked, also in a database without the settings column", async () => {
        db.dropColumns("children", "settings");
        for (const game of GAMES.slice(0, 3)) assert.equal((await post(result({ activityId: game.activityId }))).status, 200, game.id);
    });
});
