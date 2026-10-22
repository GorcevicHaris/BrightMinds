// GET /api/children/[id]/unlocked-levels — (najviši položen nivo + 1) po igri, iz tri
// izvora: pogled (migracija 0004), kolone (migracija 0001) i stara beleška (baza bez migracija).
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GET } from "@/app/api/children/[id]/unlocked-levels/route";
import { GAMES } from "@/lib/games";
import { CHILD_ID, OTHER_CHILD_ID, db, idParams, jsonRequest, readJson, resetWorld, seedFamily, signInAsChild, signInAsParent } from "../setup/api";
import type { Row } from "../setup/fakeSupabase";

const SHAPES = 1;
const MEMORY = 3;
const EMOTIONS = 8;

const EVERYTHING_LOCKED = { shapes: 1, memory: 1, coloring: 1, "sound-to-image": 1, social: 1, "social-story": 1, emotions: 1, sorting: 1 };

async function unlocked(childId = CHILD_ID): Promise<Record<string, number>> {
    const response = await GET(jsonRequest("GET"), idParams(childId));
    assert.equal(response.status, 200);
    return (await readJson(response)).unlockedLevels as Record<string, number>;
}

/** Partija sa kolonama iz migracije 0001. */
const played = (level: number, correct: number, total: number, overrides: Row = {}): Row => ({
    child_id: CHILD_ID,
    activity_id: SHAPES,
    level,
    correct_count: correct,
    total_count: total,
    stars: null,
    success_level: null,
    ...overrides,
});

/** Partija iz baze bez migracija: sve je u belešci. */
const legacy = (notes: string | null, overrides: Row = {}): Row => ({ child_id: CHILD_ID, activity_id: SHAPES, notes, success_level: null, ...overrides });

/** Baza sa migracijom 0001, bez pogleda iz 0004. */
function withoutView(): void {
    db.dropTable("child_game_progress");
}

/** Baza bez ijedne migracije: nema pogleda ni kolona za nivo i odgovore. */
function withoutMigrations(): void {
    withoutView();
    db.dropColumns("progress_logs", "level", "stars", "score", "correct_count", "total_count", "duration_seconds", "prompted_count", "session_id", "passed");
}

beforeEach(() => {
    resetWorld();
    seedFamily();
    signInAsParent();
});

describe("GET /api/children/[id]/unlocked-levels", () => {
    it("returns level 1 for every game of a child who has not played yet", async () => {
        assert.deepEqual(await unlocked(), EVERYTHING_LOCKED);
        assert.deepEqual(Object.keys(await unlocked()), GAMES.map((game) => game.id));
    });

    it("gives the same answer from all three sources for a child who has not played", async () => {
        withoutView();
        assert.deepEqual(await unlocked(), EVERYTHING_LOCKED);
        resetWorld();
        seedFamily();
        signInAsParent();
        withoutMigrations();
        assert.deepEqual(await unlocked(), EVERYTHING_LOCKED);
    });

    it("is available to the child's own session", async () => {
        signInAsChild(CHILD_ID);
        assert.deepEqual(await unlocked(), EVERYTHING_LOCKED);
    });
});

describe("unlocked levels from the progress view (migration 0004)", () => {
    it("unlock the level after the highest passed one, per game", async () => {
        db.seed("child_game_progress", [
            { child_id: CHILD_ID, activity_id: SHAPES, highest_level_passed: 4 },
            { child_id: CHILD_ID, activity_id: MEMORY, highest_level_passed: 0 },
            { child_id: CHILD_ID, activity_id: EMOTIONS, highest_level_passed: null },
        ]);
        assert.deepEqual(await unlocked(), { ...EVERYTHING_LOCKED, shapes: 5 });
    });

    it("read the view once and do not read the session rows", async () => {
        db.seed("child_game_progress", [{ child_id: CHILD_ID, activity_id: SHAPES, highest_level_passed: 2 }]);
        await unlocked();
        assert.equal(db.count("child_game_progress", "select"), 1);
        assert.equal(db.count("progress_logs", "select"), 0);
    });

    it("ignore rows of other children", async () => {
        db.seed("child_game_progress", [{ child_id: OTHER_CHILD_ID, activity_id: SHAPES, highest_level_passed: 9 }]);
        assert.deepEqual(await unlocked(), EVERYTHING_LOCKED);
    });

    it("report 16 when all 15 levels are passed and never go outside 1–16", async () => {
        db.seed("child_game_progress", [
            { child_id: CHILD_ID, activity_id: SHAPES, highest_level_passed: 15 },
            { child_id: CHILD_ID, activity_id: MEMORY, highest_level_passed: 40 },
            { child_id: CHILD_ID, activity_id: EMOTIONS, highest_level_passed: -3 },
        ]);
        assert.deepEqual(await unlocked(), { ...EVERYTHING_LOCKED, shapes: 16, memory: 16 });
    });
});

describe("unlocked levels from the session columns (migration 0001, no view)", () => {
    beforeEach(withoutView);

    it("unlock the level after the highest passed one", async () => {
        db.seed("progress_logs", [played(1, 3, 4), played(2, 2, 4), played(3, 4, 4)]);
        assert.deepEqual(await unlocked(), { ...EVERYTHING_LOCKED, shapes: 4 });
    });

    it("pass a level from exactly 50% independently correct, not below", async () => {
        db.seed("progress_logs", [played(1, 2, 4), played(2, 1, 4), played(2, 49, 100)]);
        assert.equal((await unlocked()).shapes, 2);
    });

    it("do not let a higher level that was played but not passed unlock anything", async () => {
        db.seed("progress_logs", [played(2, 4, 4), played(7, 0, 4), played(9, 1, 4)]);
        assert.equal((await unlocked()).shapes, 3);
    });

    it("do not count answers given with help", async () => {
        db.seed("progress_logs", [played(1, 1, 4, { prompted_count: 3, stars: 1, success_level: "partial" })]);
        assert.equal((await unlocked()).shapes, 1);
    });

    it("pass a level read without tasks (a story read in read-only mode)", async () => {
        db.seed("progress_logs", [played(1, 0, 0, { stars: 1 })]);
        assert.equal((await unlocked()).shapes, 2);
    });

    it("unlock emotions levels by the same rule as other games", async () => {
        db.seed("progress_logs", [played(2, 0, 4, { activity_id: EMOTIONS }), played(2, 0, 4)]);
        const result = await unlocked();
        assert.equal(result.emotions, result.shapes);
    });

    it("use the stars for rows that have no answer counts", async () => {
        db.seed("progress_logs", [
            played(3, 0, 0, { correct_count: null, total_count: null, stars: 1 }),
            played(5, 0, 0, { correct_count: null, total_count: null, stars: 0 }),
        ]);
        assert.equal((await unlocked()).shapes, 4);
    });

    it("use the success level for rows that have neither counts nor stars", async () => {
        db.seed("progress_logs", [
            played(2, 0, 0, { correct_count: null, total_count: null, success_level: "partial" }),
            played(6, 0, 0, { correct_count: null, total_count: null, success_level: "struggled" }),
        ]);
        assert.equal((await unlocked()).shapes, 3);
    });

    it("keep games and children apart", async () => {
        db.seed("progress_logs", [
            played(4, 4, 4, { activity_id: MEMORY }),
            played(9, 4, 4, { child_id: OTHER_CHILD_ID }),
            played(2, 4, 4),
        ]);
        assert.deepEqual(await unlocked(), { ...EVERYTHING_LOCKED, shapes: 3, memory: 5 });
    });

    it("find a passed level behind more than one page of unpassed attempts", async () => {
        const manyFailed = Array.from({ length: 201 }, () => played(5, 0, 4));
        db.seed("progress_logs", [played(3, 4, 4), ...manyFailed]);
        assert.equal((await unlocked()).shapes, 4);
    });

    it("report 16 when level 15 is passed", async () => {
        db.seed("progress_logs", [played(15, 4, 4)]);
        assert.equal((await unlocked()).shapes, 16);
    });
});

describe("unlocked levels from old notes (no migration applied)", () => {
    beforeEach(withoutMigrations);

    it("read the level and stars from the note and pass with at least one star", async () => {
        db.seed("progress_logs", [
            legacy("Nivo 4, Zvezdice: 2, Rezultat: 150"),
            legacy("Nivo 6, Zvezdice: 0, Rezultat: 0"),
            legacy("Nivo 2, Zvezdice: 3, Rezultat: 90", { activity_id: MEMORY }),
        ]);
        assert.deepEqual(await unlocked(), { ...EVERYTHING_LOCKED, shapes: 5, memory: 3 });
    });

    it("use the success level when the note has no stars", async () => {
        db.seed("progress_logs", [legacy("Nivo 7", { success_level: "partial" }), legacy("Nivo 9", { success_level: "struggled" })]);
        assert.equal((await unlocked()).shapes, 8);
    });

    it("unlock emotions levels from old notes by the same rule as other games", async () => {
        db.seed("progress_logs", [
            legacy("Nivo 3, Zvezdice: 0, Rezultat: 0", { activity_id: EMOTIONS, success_level: "struggled" }),
            legacy("Nivo 3, Zvezdice: 0, Rezultat: 0", { success_level: "struggled" }),
        ]);
        const result = await unlocked();
        assert.equal(result.emotions, result.shapes);
    });

    it("ignore notes without a level and rows of other children", async () => {
        db.seed("progress_logs", [
            legacy("Dete je bilo umorno."),
            legacy(null),
            legacy("Nivo 12, Zvezdice: 3, Rezultat: 500", { child_id: OTHER_CHILD_ID }),
        ]);
        assert.deepEqual(await unlocked(), EVERYTHING_LOCKED);
    });

    it("never report more than 16, whatever level the note claims", async () => {
        db.seed("progress_logs", [legacy("Nivo 99, Zvezdice: 3, Rezultat: 1")]);
        assert.equal((await unlocked()).shapes, 16);
    });
});

describe("unlocked levels when the database fails", () => {
    it("answer 500 with a generic message instead of pretending nothing is unlocked", async (t) => {
        const logged = t.mock.method(console, "error", () => undefined);
        db.failNext("child_game_progress", "select", { code: "XX000", message: "connection reset: internal detail" });
        const response = await GET(jsonRequest("GET"), idParams(CHILD_ID));
        assert.equal(response.status, 500);
        assert.doesNotMatch(String((await readJson(response)).error), /internal detail/);
        assert.equal(logged.mock.callCount(), 1);
    });
});
