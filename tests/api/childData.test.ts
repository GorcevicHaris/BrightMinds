// Podaci jednog deteta: statistika (GET/DELETE progress), „Moje priče” i brisanje profila.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DELETE as deleteProgress, GET as getProgress } from "@/app/api/children/[id]/progress/route";
import { DELETE as deleteChild } from "@/app/api/children/[id]/route";
import { DELETE as deleteStory, PUT as putStory } from "@/app/api/children/[id]/stories/[storyId]/route";
import { GET as getStories, POST as postStory } from "@/app/api/children/[id]/stories/route";
import { MAX_STORIES_PER_CHILD } from "@/lib/customStories";
import type { ProgressResponse } from "@/lib/progress";
import { CHILD_ID, OTHER_CHILD_ID, PARENT, db, idParams, jsonRequest, readJson, resetWorld, seedFamily, signInAsChild, signInAsParent } from "../setup/api";
import type { Row } from "../setup/fakeSupabase";

const SHAPES = 1;

const logRow = (overrides: Row = {}): Row => ({
    child_id: CHILD_ID,
    activity_id: SHAPES,
    completed_at: "2026-03-10T10:00:00Z",
    level: 2,
    stars: 3,
    score: 100,
    correct_count: 4,
    total_count: 5,
    prompted_count: 1,
    duration_seconds: 90,
    ...overrides,
});

const storyBody = (title = "Idemo u park") => ({ title, emoji: "🌳", steps: [{ text: "Obuvam patike." }, { text: "Idemo u park.", emoji: "🛝" }] });
const storyParams = (storyId: number | string, childId = CHILD_ID) => ({ params: Promise.resolve({ id: String(childId), storyId: String(storyId) }) });
const stories = () => db.rows("custom_stories");

beforeEach(() => {
    resetWorld();
    seedFamily();
    signInAsParent();
});

describe("GET /api/children/[id]/progress", () => {
    const progress = async (): Promise<ProgressResponse> => {
        const response = await getProgress(jsonRequest("GET"), idParams(CHILD_ID));
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        return (await response.json()) as ProgressResponse;
    };

    it("builds the statistics from this child's sessions only", async () => {
        db.seed("progress_logs", [logRow(), logRow({ level: 3 }), logRow({ child_id: OTHER_CHILD_ID, level: 9 })]);
        const body = await progress();
        assert.equal(body.totals.plays, 2);
        assert.equal(body.games[0].highestLevelCompleted, 3);
        assert.equal(body.generatedAt, new Date().toISOString());
    });

    it("takes the mood from the visit, once per visit", async () => {
        db.seed("play_sessions", [{ id: 7, child_id: CHILD_ID, mood_before: "happy", mood_after: "neutral", started_at: "2026-03-10T09:59:00Z" }]);
        db.seed("progress_logs", [logRow({ session_id: 7 }), logRow({ session_id: 7 })]);
        const body = await progress();
        assert.equal(body.mood.before.happy, 1);
        assert.equal(body.mood.after.neutral, 1);
    });

    it("still works before migration 0004, with the mood stored on each session", async () => {
        db.dropTable("play_sessions");
        db.dropColumns("progress_logs", "session_id", "passed");
        db.seed("progress_logs", [logRow({ mood_before: "upset" }), logRow({ mood_before: "upset" })]);
        const body = await progress();
        assert.equal(body.totals.plays, 2);
        assert.equal(body.mood.before.upset, 2);
    });

    it("ignores rows of activities that are not games of this app", async () => {
        db.seed("progress_logs", [logRow(), logRow({ activity_id: 2 })]);
        assert.equal((await progress()).totals.plays, 1);
    });

    it("is available to the child's own session", async () => {
        signInAsChild(CHILD_ID);
        assert.equal((await progress()).totals.plays, 0);
    });
});

describe("DELETE /api/children/[id]/progress", () => {
    it("deletes the child's sessions and visits, resets the points and keeps the profile", async () => {
        Object.assign(db.rows("children")[0], { experience_points: 80, settings: { script: "cyrillic" } });
        db.seed("progress_logs", [logRow(), logRow(), logRow({ child_id: OTHER_CHILD_ID })]);
        db.seed("play_sessions", [
            { child_id: CHILD_ID, mood_before: "happy" },
            { child_id: OTHER_CHILD_ID, mood_before: "upset" },
        ]);

        const response = await deleteProgress(jsonRequest("DELETE"), idParams(CHILD_ID));
        assert.equal(response.status, 200);
        assert.deepEqual(
            db.rows("progress_logs").map((row) => row.child_id),
            [OTHER_CHILD_ID]
        );
        assert.deepEqual(
            db.rows("play_sessions").map((row) => row.child_id),
            [OTHER_CHILD_ID]
        );
        const [mila, luka] = db.rows("children");
        assert.equal(mila.experience_points, 0);
        assert.equal(mila.first_name, "Mila");
        assert.deepEqual(mila.settings, { script: "cyrillic" });
        assert.equal(luka.experience_points, 40);
    });

    it("works before migration 0004, when there is no table of visits", async () => {
        db.dropTable("play_sessions");
        db.seed("progress_logs", [logRow()]);
        const response = await deleteProgress(jsonRequest("DELETE"), idParams(CHILD_ID));
        assert.equal(response.status, 200);
        assert.deepEqual(db.rows("progress_logs"), []);
    });
});

describe("DELETE /api/children/[id]", () => {
    it("deletes the child with its sessions, visits and links, and nothing of other children", async () => {
        db.seed("progress_logs", [logRow(), logRow({ child_id: OTHER_CHILD_ID })]);
        db.seed("play_sessions", [{ child_id: CHILD_ID }, { child_id: OTHER_CHILD_ID }]);

        const response = await deleteChild(jsonRequest("DELETE"), idParams(CHILD_ID));
        assert.equal(response.status, 200);
        for (const table of ["children", "user_children", "progress_logs", "play_sessions"]) {
            const owners = db.rows(table).map((row) => row.child_id ?? row.id);
            assert.deepEqual(owners, [OTHER_CHILD_ID], table);
        }
    });

    it("removes dependent rows first when the database has foreign keys without cascade", async () => {
        db.seed("progress_logs", [logRow()]);
        db.failNext("children", "delete", { code: "23503" });
        const response = await deleteChild(jsonRequest("DELETE"), idParams(CHILD_ID));
        assert.equal(response.status, 200);
        assert.equal(db.rows("children").length, 1);
        assert.deepEqual(db.rows("progress_logs"), []);
    });
});

describe("custom stories", () => {
    const create = (body: unknown = storyBody()) => postStory(jsonRequest("POST", body), idParams(CHILD_ID));
    const list = async () => (await readJson(await getStories(jsonRequest("GET"), idParams(CHILD_ID)))).stories as { id: number; title: string }[];

    it("stores a story for the child and returns it without internal columns", async () => {
        const response = await create({ ...storyBody("  Idemo   u park "), created_by: 999, child_id: OTHER_CHILD_ID });
        assert.equal(response.status, 201);
        const [stored] = stories();
        assert.deepEqual(stored, {
            id: stored.id,
            child_id: CHILD_ID,
            title: "Idemo u park",
            emoji: "🌳",
            steps: [
                { text: "Obuvam patike.", emoji: null },
                { text: "Idemo u park.", emoji: "🛝" },
            ],
            created_by: PARENT.id,
        });
        assert.deepEqual(await readJson(response), {
            story: { id: stored.id, title: "Idemo u park", emoji: "🌳", steps: stored.steps, updatedAt: null },
        });
    });

    it("answers 400 with the validation message for an invalid story", async () => {
        const response = await create({ title: "Park", steps: [{ text: "Samo jedan korak." }] });
        assert.equal(response.status, 400);
        assert.match(String((await readJson(response)).error), /od 2 do 8 koraka/);
        assert.deepEqual(stories(), []);
    });

    it("answers 409 once the child has 20 stories", async () => {
        db.seed("custom_stories", Array.from({ length: MAX_STORIES_PER_CHILD }, (_, index) => ({ child_id: CHILD_ID, ...storyBody(`Priča ${index + 1}`) })));
        const response = await create();
        assert.equal(response.status, 409);
        assert.equal(stories().length, MAX_STORIES_PER_CHILD);
    });

    it("does not count stories of other children towards the limit", async () => {
        db.seed("custom_stories", Array.from({ length: MAX_STORIES_PER_CHILD }, () => ({ child_id: OTHER_CHILD_ID, ...storyBody() })));
        assert.equal((await create()).status, 201);
    });

    it("lists only this child's stories, most recently updated first, also for the child's session", async () => {
        db.seed("custom_stories", [
            { child_id: CHILD_ID, ...storyBody("Starija"), updated_at: "2026-03-01T10:00:00Z" },
            { child_id: CHILD_ID, ...storyBody("Novija"), updated_at: "2026-03-05T10:00:00Z" },
            { child_id: OTHER_CHILD_ID, ...storyBody("Tuđa"), updated_at: "2026-03-09T10:00:00Z" },
        ]);
        assert.deepEqual((await list()).map((story) => story.title), ["Novija", "Starija"]);
        signInAsChild(CHILD_ID);
        assert.deepEqual((await list()).map((story) => story.title), ["Novija", "Starija"]);
    });

    it("shows an empty list, and refuses writes with a migration hint, before migration 0003", async () => {
        db.dropTable("custom_stories");
        assert.deepEqual(await list(), []);
        const response = await create();
        assert.equal(response.status, 409);
        assert.match(String((await readJson(response)).error), /migracij/i);
    });

    it("replaces title, picture and steps of the child's story", async () => {
        db.seed("custom_stories", [{ id: 5, child_id: CHILD_ID, ...storyBody("Stara"), created_by: PARENT.id }]);
        const response = await putStory(jsonRequest("PUT", { title: "Nova", steps: [{ text: "Prvi." }, { text: "Drugi." }] }), storyParams(5));
        assert.equal(response.status, 200);
        assert.deepEqual(stories()[0], {
            id: 5,
            child_id: CHILD_ID,
            title: "Nova",
            emoji: null,
            steps: [
                { text: "Prvi.", emoji: null },
                { text: "Drugi.", emoji: null },
            ],
            created_by: PARENT.id,
        });
    });

    it("answers 404 and changes nothing for a story of another child or an unknown story", async () => {
        db.seed("custom_stories", [{ id: 5, child_id: OTHER_CHILD_ID, ...storyBody("Tuđa") }]);
        assert.equal((await putStory(jsonRequest("PUT", storyBody("Moja")), storyParams(5))).status, 404);
        assert.equal((await deleteStory(jsonRequest("DELETE"), storyParams(5))).status, 404);
        assert.equal((await deleteStory(jsonRequest("DELETE"), storyParams(6))).status, 404);
        assert.equal((await deleteStory(jsonRequest("DELETE"), storyParams("abc"))).status, 404);
        assert.equal(stories()[0].title, "Tuđa");
    });

    it("deletes only the requested story", async () => {
        db.seed("custom_stories", [
            { id: 5, child_id: CHILD_ID, ...storyBody("Prva") },
            { id: 6, child_id: CHILD_ID, ...storyBody("Druga") },
        ]);
        const response = await deleteStory(jsonRequest("DELETE"), storyParams(5));
        assert.equal(response.status, 200);
        assert.deepEqual(
            stories().map((story) => story.id),
            [6]
        );
    });
});
