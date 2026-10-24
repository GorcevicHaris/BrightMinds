// Ko sme šta: svaka ruta sa svakom vrstom sesije (bez sesije, roditelj deteta, tuđ roditelj,
// dečja sesija istog i drugog deteta). Sesija je kolačić potpisan test-ključem.
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import * as complete from "@/app/api/activities/complete/route";
import * as me from "@/app/api/auth/me/route";
import * as logout from "@/app/api/auth/logout/route";
import * as progress from "@/app/api/children/[id]/progress/route";
import * as child from "@/app/api/children/[id]/route";
import * as settings from "@/app/api/children/[id]/settings/route";
import * as story from "@/app/api/children/[id]/stories/[storyId]/route";
import * as stories from "@/app/api/children/[id]/stories/route";
import * as unlockedLevels from "@/app/api/children/[id]/unlocked-levels/route";
import * as children from "@/app/api/children/route";
import {
    CHILD_ID,
    OTHER_CHILD_ID,
    PARENT,
    STRANGER,
    db,
    idParams,
    jsonRequest,
    readJson,
    resetWorld,
    seedFamily,
    setSessionToken,
    signInAsChild,
    signInAsParent,
} from "../setup/api";

const STORY_ID = 5;
const TABLES = ["users", "children", "user_children", "progress_logs", "custom_stories", "play_sessions"];

const childBody = { first_name: "Ana", last_name: "Test", date_of_birth: "2020-02-02", gender: "female" };
const storyBody = { title: "Park", emoji: "🌳", steps: [{ text: "Idemo u park." }, { text: "Vraćamo se kući." }] };
const resultBody = (childId: number) => ({ childId, activityId: 1, level: 1, score: 10, correct: 3, total: 4, durationSec: 30 });
const storyParams = (childId: number) => ({ params: Promise.resolve({ id: String(childId), storyId: String(STORY_ID) }) });

interface Endpoint {
    name: string;
    /** Poziva rutu za dato dete */
    call: (childId: number) => Promise<Response>;
    /** false = ruta nije vezana za jedno dete (spisak dece, dodavanje deteta) */
    perChild?: boolean;
}

/** Rute samo za roditelja/terapeuta. */
const PARENT_ONLY: Endpoint[] = [
    { name: "GET /api/children", call: () => children.GET(), perChild: false },
    { name: "POST /api/children", call: () => children.POST(jsonRequest("POST", childBody)), perChild: false },
    { name: "PUT /api/children/[id]", call: (id) => child.PUT(jsonRequest("PUT", childBody), idParams(id)) },
    { name: "DELETE /api/children/[id]", call: (id) => child.DELETE(jsonRequest("DELETE"), idParams(id)) },
    { name: "PUT /api/children/[id]/settings", call: (id) => settings.PUT(jsonRequest("PUT", { settings: { script: "cyrillic" } }), idParams(id)) },
    { name: "DELETE /api/children/[id]/progress", call: (id) => progress.DELETE(jsonRequest("DELETE"), idParams(id)) },
    { name: "POST /api/children/[id]/stories", call: (id) => stories.POST(jsonRequest("POST", storyBody), idParams(id)) },
    { name: "PUT /api/children/[id]/stories/[storyId]", call: (id) => story.PUT(jsonRequest("PUT", storyBody), storyParams(id)) },
    { name: "DELETE /api/children/[id]/stories/[storyId]", call: (id) => story.DELETE(jsonRequest("DELETE"), storyParams(id)) },
];

/** Rute koje sme i dečja sesija — ali samo za svoje dete. */
const CHILD_OR_PARENT: Endpoint[] = [
    { name: "GET /api/children/[id]/settings", call: (id) => settings.GET(jsonRequest("GET"), idParams(id)) },
    { name: "GET /api/children/[id]/progress", call: (id) => progress.GET(jsonRequest("GET"), idParams(id)) },
    { name: "GET /api/children/[id]/stories", call: (id) => stories.GET(jsonRequest("GET"), idParams(id)) },
    { name: "GET /api/children/[id]/unlocked-levels", call: (id) => unlockedLevels.GET(jsonRequest("GET"), idParams(id)) },
    { name: "POST /api/activities/complete", call: (id) => complete.POST(jsonRequest("POST", resultBody(id))) },
    { name: "PATCH /api/activities/complete", call: (id) => complete.PATCH(jsonRequest("PATCH", { childId: id, logIds: [1], moodAfter: "happy" })) },
];

const ALL = [...PARENT_ONLY, ...CHILD_OR_PARENT];
const PER_CHILD = ALL.filter((endpoint) => endpoint.perChild !== false);

function seed(): void {
    seedFamily();
    db.seed("progress_logs", [{ id: 1, child_id: CHILD_ID, activity_id: 1, level: 1, stars: 3, correct_count: 4, total_count: 4, completed_at: "2026-03-10T10:00:00Z" }]);
    db.seed("custom_stories", [{ id: STORY_ID, child_id: CHILD_ID, title: "Stara priča", emoji: null, steps: [{ text: "Prvi." }, { text: "Drugi." }], updated_at: "2026-03-01T10:00:00Z" }]);
}

const snapshot = () => JSON.stringify(TABLES.map((table) => db.rows(table)));

/** Poziva rutu u sveže pripremljenoj bazi i proverava status, poruku i da ništa nije upisano. */
async function expectRefused(endpoint: Endpoint, status: 401 | 403, signIn: () => void, childId = CHILD_ID): Promise<void> {
    resetWorld();
    seed();
    signIn();
    const before = snapshot();

    const response = await endpoint.call(childId);
    assert.equal(response.status, status, endpoint.name);
    const body = await readJson(response);
    assert.ok(typeof body.error === "string" && body.error.length > 0, `${endpoint.name}: error message`);
    assert.deepEqual(Object.keys(body), ["error"], `${endpoint.name}: nothing but the error is returned`);
    assert.equal(snapshot(), before, `${endpoint.name}: the database was changed`);
}

async function expectAllowed(endpoint: Endpoint, signIn: () => void): Promise<void> {
    resetWorld();
    seed();
    signIn();
    const response = await endpoint.call(CHILD_ID);
    assert.ok(response.status >= 200 && response.status < 300, `${endpoint.name}: ${response.status}`);
}

describe("without a valid session", () => {
    it("every route answers 401 when there is no session cookie", async () => {
        for (const endpoint of ALL) await expectRefused(endpoint, 401, () => undefined);
    });

    it("every route answers 401 for a token signed with a different secret", async () => {
        const forged = jwt.sign({ id: PARENT.id, email: PARENT.email, role: PARENT.role }, "some-other-secret", { expiresIn: "1h" });
        for (const endpoint of ALL) await expectRefused(endpoint, 401, () => setSessionToken(forged));
    });

    it("every route answers 401 for an expired token", async () => {
        for (const endpoint of ALL) {
            await expectRefused(endpoint, 401, () => {
                const secret = process.env.JWT_SECRET ?? "";
                setSessionToken(jwt.sign({ id: PARENT.id, email: PARENT.email, role: PARENT.role }, secret, { expiresIn: -60 }));
            });
        }
    });

    it("a token that is not a JWT, or has no numeric user id, is not a session", async () => {
        const secret = process.env.JWT_SECRET ?? "";
        for (const token of ["garbage", "", jwt.sign({ id: "10", email: PARENT.email, role: "parent" }, secret), jwt.sign({ email: PARENT.email }, secret)]) {
            await expectRefused(CHILD_OR_PARENT[0], 401, () => setSessionToken(token));
            await expectRefused(PARENT_ONLY[0], 401, () => setSessionToken(token));
        }
    });

    it("a token with algorithm none is not a session", async () => {
        const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
        const unsigned = `${encode({ alg: "none", typ: "JWT" })}.${encode({ id: PARENT.id, email: PARENT.email, role: "parent" })}.`;
        await expectRefused(PARENT_ONLY[0], 401, () => setSessionToken(unsigned));
    });
});

describe("a child session (signed in with the picture PIN)", () => {
    it("gets 403 on every parent-only route, even for the child's own profile", async () => {
        for (const endpoint of PARENT_ONLY) await expectRefused(endpoint, 403, () => signInAsChild(CHILD_ID));
    });

    it("gets 403 on every route when it asks for another child", async () => {
        for (const endpoint of PER_CHILD) {
            await expectRefused(endpoint, 403, () => signInAsChild(OTHER_CHILD_ID, STRANGER));
        }
    });

    it("may read its own settings, progress, stories and levels and save its own results", async () => {
        for (const endpoint of CHILD_OR_PARENT) await expectAllowed(endpoint, () => signInAsChild(CHILD_ID));
    });

    it("is not a user for GET /api/auth/me", async () => {
        resetWorld();
        seed();
        signInAsChild(CHILD_ID);
        assert.equal((await me.GET()).status, 401);
    });
});

describe("a parent session", () => {
    it("is allowed on every route for a child linked to the account", async () => {
        for (const endpoint of ALL) await expectAllowed(endpoint, () => signInAsParent(PARENT));
    });

    it("gets 403 on every route for a child that is not linked to the account", async () => {
        for (const endpoint of PER_CHILD) await expectRefused(endpoint, 403, () => signInAsParent(STRANGER));
    });

    it("gets 403 for a child that does not exist", async () => {
        for (const endpoint of PER_CHILD) await expectRefused(endpoint, 403, () => signInAsParent(PARENT), 999);
    });

    it("gets 403, not a database error, for a child id that is not a positive whole number", async () => {
        for (const id of ["abc", "0", "-1", "1.5", "1e3", " 1", "9999999999999999"]) {
            resetWorld();
            seed();
            signInAsParent(PARENT);
            assert.equal((await settings.GET(jsonRequest("GET"), idParams(id))).status, 403, `GET settings, id "${id}"`);
            assert.equal((await child.DELETE(jsonRequest("DELETE"), idParams(id))).status, 403, `DELETE child, id "${id}"`);
            assert.equal(db.count("user_children", "select"), 0, `id "${id}" reached the database`);
        }
    });

    it("sees only its own children in GET /api/children", async () => {
        resetWorld();
        seed();
        signInAsParent(STRANGER);
        const body = await readJson(await children.GET());
        assert.deepEqual(
            (body.children as { id: number }[]).map((item) => item.id),
            [OTHER_CHILD_ID]
        );
    });
});

describe("GET /api/auth/me", () => {
    beforeEach(() => {
        resetWorld();
        seed();
    });

    it("returns the signed-in adult without the password hash", async () => {
        db.rows("users")[0].password_hash = "$2a$10$secret";
        signInAsParent(PARENT);
        const response = await me.GET();
        assert.equal(response.status, 200);
        assert.deepEqual(await readJson(response), {
            user: { id: PARENT.id, full_name: "Roditelj Test", email: PARENT.email, role: "parent" },
        });
    });

    it("answers 401 and clears the cookie when the account no longer exists", async () => {
        signInAsParent({ id: 77, email: "obrisan@example.com", role: "parent" });
        const response = await me.GET();
        assert.equal(response.status, 401);
        const cookie = response.headers.getSetCookie().find((value) => value.startsWith("token="));
        assert.ok(cookie, "the session cookie is reset");
        assert.match(cookie, /^token=;/);
        assert.match(cookie, /Expires=Thu, 01 Jan 1970/);
    });
});

describe("POST /api/auth/logout", () => {
    it("clears the session cookie", async () => {
        const response = await logout.POST();
        assert.equal(response.status, 200);
        assert.match(response.headers.getSetCookie().join("\n"), /^token=;.*Expires=Thu, 01 Jan 1970/);
    });
});
