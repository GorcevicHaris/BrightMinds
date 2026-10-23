// GET/PUT /api/children/[id]/settings — podešavanja po detetu u koloni `children.settings`.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GET, PUT } from "@/app/api/children/[id]/settings/route";
import { defaultSettings, sanitizeSettings } from "@/lib/childSettings";
import { CHILD_ID, OTHER_CHILD_ID, PARENT, db, idParams, jsonRequest, readJson, resetWorld, seedFamily, signInAsChild, signInAsParent } from "../setup/api";

const put = (body: unknown, childId = CHILD_ID, headers: Record<string, string> = {}) => PUT(jsonRequest("PUT", body, headers), idParams(childId));
const get = (childId = CHILD_ID) => GET(jsonRequest("GET"), idParams(childId));
const childRow = (id = CHILD_ID) => db.rows("children").find((row) => row.id === id);

beforeEach(() => {
    resetWorld();
    // Dete rođeno 1. 1. 2020; lažni sat je u martu 2026 → 6 godina, srednja uzrasna grupa
    seedFamily();
    signInAsParent();
});

describe("PUT /api/children/[id]/settings", () => {
    it("returns the full sanitised settings and stores only what differs from the age recommendation", async () => {
        const raw = { script: "cyrillic", volume: 5, maxChoices: 7, plan: ["shapes", "nope", "shapes", "emotions"], isAdmin: true };
        const response = await put({ settings: raw });
        assert.equal(response.status, 200);

        const expected = { ...defaultSettings("middle"), script: "cyrillic", volume: 1, plan: ["shapes", "emotions"] };
        assert.deepEqual(await readJson(response), { settings: expected });
        assert.deepEqual(expected, sanitizeSettings(raw, "middle"));
        // U bazi su samo odstupanja, pa ostale preporuke nastavljaju da prate uzrast deteta
        assert.deepEqual(childRow()?.settings, { script: "cyrillic", volume: 1, plan: ["shapes", "emotions"] });
    });

    it("keeps the child's companion and bought clothes when the parent saves settings", async () => {
        const companion = { kind: "cat", owned: ["crown"], wear: { hat: "crown" }, spent: 10, v: 3 };
        db.rows("children")[0].settings = { volume: 0.5, companion };
        const response = await put({ settings: { script: "cyrillic" } });
        assert.equal(response.status, 200);
        assert.deepEqual(childRow()?.settings, { script: "cyrillic", companion });
    });

    it("stores nothing for invalid values, so the child's age defaults apply", async () => {
        db.rows("children")[0].date_of_birth = "2022-06-01";
        const body = await readJson(await put({ settings: { sessionMinutes: 999, moodCheck: "always" } }));
        assert.deepEqual(body.settings, defaultSettings("young"));
        assert.deepEqual(childRow()?.settings, {});
    });

    it("uses the middle band when the child has no date of birth", async () => {
        db.rows("children")[0].date_of_birth = null;
        const body = await readJson(await put({ settings: {} }));
        assert.deepEqual(body.settings, defaultSettings("middle"));
        assert.deepEqual(childRow()?.settings, {});
    });

    it("keeps following the child's age for settings the adult never changed", async () => {
        // Sačuvano dok je dete u srednjoj grupi; menjamo samo pismo
        await put({ settings: { ...defaultSettings("middle"), script: "cyrillic" } });
        assert.deepEqual(childRow()?.settings, { script: "cyrillic" });
        // Kad dete poraste u stariju grupu, velika slova i vreme igre prate novu preporuku
        const later = sanitizeSettings(childRow()?.settings, "older");
        assert.equal(later.script, "cyrillic");
        assert.equal(later.uppercase, defaultSettings("older").uppercase);
        assert.equal(later.sessionMinutes, defaultSettings("older").sessionMinutes);
    });

    it("replaces the stored settings as a whole", async () => {
        db.rows("children")[0].settings = { script: "cyrillic", loudSounds: true };
        await put({ settings: { reduceMotion: true } });
        assert.deepEqual(childRow()?.settings, { reduceMotion: true });
    });

    it("changes nothing else on the child and nothing on other children", async () => {
        const before = structuredClone({ ...childRow(), settings: null });
        const otherBefore = structuredClone(childRow(OTHER_CHILD_ID));
        await put({ settings: { script: "cyrillic" } });
        assert.deepEqual({ ...childRow(), settings: null }, before);
        assert.deepEqual(childRow(OTHER_CHILD_ID), otherBefore);
    });

    it("answers 409 with a migration hint when the settings column is missing", async () => {
        db.dropColumns("children", "settings");
        const response = await put({ settings: { script: "cyrillic" } });
        assert.equal(response.status, 409);
        assert.match(String((await readJson(response)).error), /migracij/i);
        assert.deepEqual(childRow()?.settings, {});
    });

    it("answers 400 for a body that is not JSON or has no settings object", async () => {
        for (const body of ["{oops", "", [], { settings: null }, { settings: "cyrillic" }, { settings: ["cyrillic"] }, { script: "cyrillic" }]) {
            const response = await put(body);
            assert.equal(response.status, 400, JSON.stringify(body));
        }
        assert.deepEqual(childRow()?.settings, {});
        assert.equal(db.count("children", "update"), 0);
    });

    it("answers 400 for a body larger than 4 KB, declared or not", async () => {
        const large = { settings: { script: "cyrillic", padding: "x".repeat(5000) } };
        assert.equal((await put(large)).status, 400);
        assert.equal((await put({ settings: {} }, CHILD_ID, { "content-length": "5000" })).status, 400);
        assert.equal(db.count("children", "update"), 0);
    });

    it("answers 404 when the child row no longer exists", async () => {
        db.seed("user_children", [{ user_id: PARENT.id, child_id: 77 }]);
        assert.equal((await put({ settings: {} }, 77)).status, 404);
    });

    it("answers 500 with a generic message for another database error", async (t) => {
        const logged = t.mock.method(console, "error", () => undefined);
        db.failNext("children", "update", { code: "XX000", message: "disk full: internal detail" });
        const response = await put({ settings: {} });
        assert.equal(response.status, 500);
        assert.doesNotMatch(String((await readJson(response)).error), /internal detail/);
        assert.equal(logged.mock.callCount(), 1);
    });
});

describe("GET /api/children/[id]/settings", () => {
    it("returns the stored settings and the date of birth, uncached", async () => {
        db.rows("children")[0].settings = { script: "cyrillic", plan: ["memory"] };
        const response = await get();
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(await readJson(response), { settings: { script: "cyrillic", plan: ["memory"] }, date_of_birth: "2020-01-01" });
    });

    it("returns the overrides a PUT stored, which resolve to the same settings", async () => {
        const saved = await readJson(await put({ settings: { script: "cyrillic", hintAfter: 0 } }));
        const stored = (await readJson(await get())).settings;
        assert.deepEqual(stored, { script: "cyrillic", hintAfter: 0 });
        assert.deepEqual(sanitizeSettings(stored, "middle"), saved.settings);
    });

    it("returns an empty object when nothing usable is stored", async () => {
        for (const stored of [null, undefined, "latin", ["latin"], 5]) {
            db.rows("children")[0].settings = stored;
            assert.deepEqual((await readJson(await get())).settings, {}, String(stored));
        }
    });

    it("works before migration 0002, when the settings column does not exist", async () => {
        db.dropColumns("children", "settings");
        delete db.rows("children")[0].settings;
        const response = await get();
        assert.equal(response.status, 200);
        assert.deepEqual(await readJson(response), { settings: {}, date_of_birth: "2020-01-01" });
    });

    it("lets the child's own session read them, so the game can apply them", async () => {
        db.rows("children")[0].settings = { uppercase: false };
        signInAsChild(CHILD_ID);
        assert.deepEqual((await readJson(await get())).settings, { uppercase: false });
    });

    it("answers 404 when the child row no longer exists", async () => {
        db.seed("user_children", [{ user_id: PARENT.id, child_id: 77 }]);
        assert.equal((await get(77)).status, 404);
    });
});
