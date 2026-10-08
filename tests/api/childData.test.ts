// Podaci jednog deteta: statistika (GET/DELETE progress), izvoz u CSV, „Moje priče” i brisanje profila.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GET as exportCsv } from "@/app/api/children/[id]/export/route";
import { DELETE as deleteProgress, GET as getProgress } from "@/app/api/children/[id]/progress/route";
import { DELETE as deleteChild } from "@/app/api/children/[id]/route";
import { DELETE as deleteStory, PUT as putStory } from "@/app/api/children/[id]/stories/[storyId]/route";
import { GET as getStories, POST as postStory } from "@/app/api/children/[id]/stories/route";
import { MAX_STORIES_PER_CHILD } from "@/lib/customStories";
import type { ProgressResponse } from "@/lib/progress";
import { CHILD_ID, OTHER_CHILD_ID, PARENT, belgradeDay, db, idParams, jsonRequest, readJson, resetWorld, seedFamily, signInAsChild, signInAsParent } from "../setup/api";
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

describe("GET /api/children/[id]/export", () => {
    const download = async () => {
        const response = await exportCsv(jsonRequest("GET"), idParams(CHILD_ID));
        assert.equal(response.status, 200);
        // `response.text()` bi sam uklonio BOM, pa se čitaju bajtovi
        const bytes = new Uint8Array(await response.arrayBuffer());
        const hasBom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
        const text = new TextDecoder().decode(bytes);
        return { response, hasBom, text, lines: text.trimEnd().split("\r\n") };
    };

    it("returns a CSV file named after the child and the Belgrade date", async () => {
        db.rows("children")[0].first_name = "Đorđe";
        const { response } = await download();
        assert.equal(response.headers.get("content-type"), "text/csv; charset=utf-8");
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal(
            response.headers.get("content-disposition"),
            `attachment; filename="bright-minds-Djordje-${belgradeDay()}.csv"; filename*=UTF-8''${encodeURIComponent(`bright-minds-Đorđe-${belgradeDay()}.csv`)}`
        );
    });

    it("writes one header line and one line per session, newest first, in Belgrade time", async () => {
        db.seed("play_sessions", [{ id: 7, child_id: CHILD_ID, mood_before: "happy", mood_after: "neutral" }]);
        db.seed("progress_logs", [
            logRow({ completed_at: "2026-03-10T23:30:05Z", session_id: 7 }),
            logRow({ completed_at: "2026-03-12T08:00:00Z", activity_id: 8, level: 1, stars: 1, correct_count: 0, total_count: 4, prompted_count: 0 }),
            logRow({ child_id: OTHER_CHILD_ID }),
        ]);
        const { lines, text, hasBom } = await download();
        assert.ok(hasBom, "starts with a UTF-8 byte order mark so Excel reads š, đ, č, ć, ž");
        assert.ok(text.endsWith("\r\n"));
        assert.deepEqual(lines, [
            "Datum;Vreme;Igra;Nivo;Zvezdice;Samostalno tačno;Uz pomoć;Ukupno zadataka;Trajanje (s);Raspoloženje pre;Raspoloženje posle",
            "2026-03-12;09:00:00;Emocije;1;1;0;0;4;90;;",
            "2026-03-11;00:30:05;Pogodi oblik;2;3;4;1;5;90;Dobro;Okej",
        ]);
    });

    it("fills old rows from the note and the minutes column", async () => {
        db.seed("progress_logs", [
            { child_id: CHILD_ID, activity_id: SHAPES, completed_at: "2026-03-10 10:00:00", notes: "Nivo 3, Zvezdice: 2, Rezultat: 150", duration_minutes: 2, mood_before: "upset" },
        ]);
        const { lines } = await download();
        assert.equal(lines[1], "2026-03-10;11:00:00;Pogodi oblik;3;2;;;;120;Umorno;");
    });

    it("returns only the header for a child who has not played", async () => {
        const { lines } = await download();
        assert.equal(lines.length, 1);
    });

    it("answers 404 when the child row no longer exists", async () => {
        db.seed("user_children", [{ user_id: PARENT.id, child_id: 77 }]);
        assert.equal((await exportCsv(jsonRequest("GET"), idParams(77))).status, 404);
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
