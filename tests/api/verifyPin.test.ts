// POST /api/children/verify-pin — prijava deteta vizuelnim PIN-om: dečja sesija, dnevna
// nagrada i ograničenje broja pokušaja po IP adresi.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { POST } from "@/app/api/children/verify-pin/route";
import { CHILD_ID, CHILD_PIN, OTHER_CHILD_ID, PARENT, advanceClock, belgradeDay, db, jsonRequest, readJson, resetWorld, seedFamily, sessionFromResponse } from "../setup/api";

const WRONG_PIN = "cat,pizza,car,pepsi";
const PIN_LIMIT = 8;
const PIN_WINDOW_MS = 5 * 60_000;

let lastIp = 0;
/** Svaki test dolazi sa svoje adrese: ograničavač pamti pokušaje po IP adresi za ceo proces. */
const freshIp = () => `198.51.100.${(lastIp += 1)}`;

const verify = (pin: unknown, ip: string) => POST(jsonRequest("POST", { pin_code: pin }, { "x-forwarded-for": ip }));
const mila = () => db.rows("children").find((row) => row.id === CHILD_ID);

beforeEach(() => {
    resetWorld();
    seedFamily();
});

describe("POST /api/children/verify-pin — signing in", () => {
    it("answers 401 for a wrong PIN and sets no cookie", async () => {
        const response = await verify(WRONG_PIN, freshIp());
        assert.equal(response.status, 401);
        assert.deepEqual(Object.keys(await readJson(response)), ["error"]);
        assert.deepEqual(response.headers.getSetCookie(), []);
        assert.equal(mila()?.experience_points, 0);
    });

    it("answers 400 when no pictures were sent", async () => {
        const ip = freshIp();
        for (const pin of [undefined, null, "", "   ", 1234, ["dog", "pizza", "car", "pepsi"]]) {
            assert.equal((await verify(pin, ip)).status, 400, String(pin));
        }
        assert.equal((await POST(jsonRequest("POST", "{oops", { "x-forwarded-for": ip }))).status, 400);
    });

    it("returns the child for the right PIN, without streak, PIN or date of birth", async () => {
        const response = await verify(CHILD_PIN, freshIp());
        assert.equal(response.status, 200);
        const body = await readJson(response);
        assert.deepEqual(body, {
            success: true,
            child: { id: CHILD_ID, first_name: "Mila", last_name: "Test", gender: "female", experiencePoints: 10 },
        });
        assert.doesNotMatch(JSON.stringify(body), /streak/i);
    });

    it("sets a child-scoped session cookie that carries the parent account and the child id", async () => {
        const response = await verify(CHILD_PIN, freshIp());
        const session = sessionFromResponse(response);
        assert.ok(session, "session cookie");
        assert.deepEqual(
            { id: session.id, email: session.email, role: session.role, childId: session.childId },
            { id: PARENT.id, email: PARENT.email, role: PARENT.role, childId: CHILD_ID }
        );
        const cookie = response.headers.getSetCookie()[0];
        assert.match(cookie, /HttpOnly/i);
        assert.match(cookie, /SameSite=lax/i);
        assert.match(cookie, /Path=\//);
        assert.match(cookie, /Max-Age=604800/);
    });

    it("accepts the PIN with spaces around the pictures", async () => {
        const response = await verify(" dog , pizza,car ,pepsi ", freshIp());
        assert.equal(response.status, 200);
    });

    it("signs in the child that owns the PIN, not another child", async () => {
        const response = await verify("cat,burger,book,sprite", freshIp());
        const body = await readJson(response);
        assert.equal((body.child as { id: number }).id, OTHER_CHILD_ID);
        assert.equal(sessionFromResponse(response)?.childId, OTHER_CHILD_ID);
    });

    it("answers 409 when two profiles share the PIN, instead of guessing", async () => {
        db.seed("children", [{ id: 3, first_name: "Duplikat", last_name: "Test", pin_code: CHILD_PIN }]);
        const response = await verify(CHILD_PIN, freshIp());
        assert.equal(response.status, 409);
        assert.equal(sessionFromResponse(response), null);
    });

    it("answers 403 for a profile that is not linked to any adult", async () => {
        db.seed("children", [{ id: 3, first_name: "Siroče", last_name: "Test", pin_code: "lion,eggs,ball,cedevita" }]);
        const response = await verify("lion,eggs,ball,cedevita", freshIp());
        assert.equal(response.status, 403);
        assert.equal(sessionFromResponse(response), null);
    });
});

describe("POST /api/children/verify-pin — daily sign-in reward", () => {
    it("adds 10 points and starts the streak on the first sign-in", async () => {
        await verify(CHILD_PIN, freshIp());
        assert.equal(mila()?.experience_points, 10);
        assert.equal(mila()?.streak, 1);
        assert.equal(mila()?.last_login_at, new Date().toISOString());
    });

    it("changes nothing on a second sign-in on the same day", async () => {
        const ip = freshIp();
        await verify(CHILD_PIN, ip);
        const firstLogin = mila()?.last_login_at;
        advanceClock(60 * 60_000);
        const body = await readJson(await verify(CHILD_PIN, ip));
        assert.equal((body.child as { experiencePoints: number }).experiencePoints, 10);
        assert.equal(mila()?.experience_points, 10);
        assert.equal(mila()?.streak, 1);
        assert.equal(mila()?.last_login_at, firstLogin);
    });

    it("extends the streak when the previous sign-in was yesterday in Belgrade", async () => {
        // Juče u 23:30 po beogradskom (zimskom) vremenu = 22:30 UTC
        Object.assign(db.rows("children")[0], { streak: 4, experience_points: 30, last_login_at: `${belgradeDay(-1)}T22:30:00Z` });
        await verify(CHILD_PIN, freshIp());
        assert.equal(mila()?.streak, 5);
        assert.equal(mila()?.experience_points, 40);
    });

    it("treats a sign-in after midnight in Belgrade as today, although it was yesterday in UTC", async () => {
        // Danas u 00:30 po beogradskom (zimskom) vremenu = juče u 23:30 UTC
        Object.assign(db.rows("children")[0], { streak: 4, experience_points: 30, last_login_at: `${belgradeDay(-1)}T23:30:00Z` });
        await verify(CHILD_PIN, freshIp());
        assert.equal(mila()?.streak, 4);
        assert.equal(mila()?.experience_points, 30);
    });

    it("restarts the streak at 1 after a missed day", async () => {
        Object.assign(db.rows("children")[0], { streak: 9, experience_points: 30, last_login_at: `${belgradeDay(-3)}T10:00:00Z` });
        await verify(CHILD_PIN, freshIp());
        assert.equal(mila()?.streak, 1);
        assert.equal(mila()?.experience_points, 40);
    });

    it("reads a stored sign-in time without a zone as UTC", async () => {
        Object.assign(db.rows("children")[0], { streak: 2, experience_points: 30, last_login_at: `${belgradeDay(-1)} 10:00:00` });
        await verify(CHILD_PIN, freshIp());
        assert.equal(mila()?.streak, 3);
    });

    it("starts from zero when points and streak were never set", async () => {
        Object.assign(db.rows("children")[0], { streak: null, experience_points: null });
        const body = await readJson(await verify(CHILD_PIN, freshIp()));
        assert.equal((body.child as { experiencePoints: number }).experiencePoints, 10);
        assert.equal(mila()?.streak, 1);
    });
});

describe("POST /api/children/verify-pin — rate limit", () => {
    it("answers 429 with Retry-After after eight wrong PINs from one address", async () => {
        const ip = freshIp();
        for (let attempt = 1; attempt <= PIN_LIMIT; attempt += 1) {
            assert.equal((await verify(WRONG_PIN, ip)).status, 401, `attempt ${attempt}`);
        }
        const blocked = await verify(WRONG_PIN, ip);
        assert.equal(blocked.status, 429);
        assert.equal(blocked.headers.get("retry-after"), "300");
        assert.deepEqual(Object.keys(await readJson(blocked)), ["error"]);
    });

    it("refuses even the right PIN while the address is blocked, without touching the database", async () => {
        const ip = freshIp();
        for (let attempt = 1; attempt <= PIN_LIMIT; attempt += 1) await verify(WRONG_PIN, ip);
        const queriesBefore = db.queries.length;
        const response = await verify(CHILD_PIN, ip);
        assert.equal(response.status, 429);
        assert.equal(sessionFromResponse(response), null);
        assert.equal(db.queries.length, queriesBefore);
    });

    it("does not block other addresses", async () => {
        const blockedIp = freshIp();
        for (let attempt = 1; attempt <= PIN_LIMIT + 1; attempt += 1) await verify(WRONG_PIN, blockedIp);
        assert.equal((await verify(CHILD_PIN, freshIp())).status, 200);
    });

    it("does not count successful sign-ins", async () => {
        const ip = freshIp();
        for (let attempt = 1; attempt <= PIN_LIMIT * 2; attempt += 1) {
            assert.equal((await verify(CHILD_PIN, ip)).status, 200, `sign-in ${attempt}`);
        }
        assert.equal((await verify(WRONG_PIN, ip)).status, 401);
    });

    it("does not count requests that were refused as invalid before the PIN was checked", async () => {
        const ip = freshIp();
        for (let attempt = 1; attempt <= PIN_LIMIT * 2; attempt += 1) await verify("", ip);
        assert.equal((await verify(WRONG_PIN, ip)).status, 401);
    });

    it("lets the address try again once the five-minute window has passed", async () => {
        const ip = freshIp();
        for (let attempt = 1; attempt <= PIN_LIMIT; attempt += 1) await verify(WRONG_PIN, ip);
        advanceClock(PIN_WINDOW_MS - 1000);
        const blocked = await verify(CHILD_PIN, ip);
        assert.equal(blocked.status, 429);
        assert.equal(blocked.headers.get("retry-after"), "1");

        advanceClock(1000);
        assert.equal((await verify(CHILD_PIN, ip)).status, 200);
    });
});
