// Zaključan profil: niko ne sme da uđe u profil tuđeg deteta.
//  • stranice o detetu proveravaju pristup na serveru, pre prikaza;
//  • dečja sesija prestaje da važi kad roditelj promeni ili ukloni sličice ili odveže dete;
//  • odgovor „kod je zauzet” ne sme da postane način da se saznaju tuđi kodovi;
//  • zahtevi koji menjaju podatke sa tuđeg sajta se odbijaju.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import * as child from "@/app/api/children/[id]/route";
import * as settings from "@/app/api/children/[id]/settings/route";
import * as children from "@/app/api/children/route";
import * as complete from "@/app/api/activities/complete/route";
import { PIN_TAKEN_RULE } from "@/app/api/_lib/children";
import { childPageAccess, ownerPageAccess, parseChildIdParam } from "@/app/dashboard/_shared/access";
import { pinFingerprint } from "@/lib/auth";
import { resetRateLimit } from "@/lib/rateLimit";
import { realtimeTopicFor } from "@/lib/realtimeTopic";
import { isCrossSiteMutation } from "@/lib/requestOrigin";
import {
    CHILD_ID,
    CHILD_PIN,
    OTHER_CHILD_ID,
    PARENT,
    STRANGER,
    db,
    idParams,
    jsonRequest,
    resetWorld,
    seedFamily,
    setSessionToken,
    signInAsChild,
    signInAsParent,
} from "../setup/api";

const NEW_PIN = "lion,eggs,ball,cedevita";
const OTHER_PIN = "cat,burger,book,sprite";
const childBody = { first_name: "Mila", last_name: "Test", date_of_birth: "2020-01-01", gender: "female" };

const readSettings = (id = CHILD_ID) => settings.GET(jsonRequest("GET"), idParams(id));
const mila = () => db.rows("children").find((row) => row.id === CHILD_ID)!;

beforeEach(() => {
    resetWorld();
    seedFamily();
    resetRateLimit(`pin-taken:user:${PARENT.id}`);
    resetRateLimit(`pin-taken:user:${STRANGER.id}`);
    resetRateLimit("pin-taken:ip:unknown");
});

describe("child pages are checked on the server before anything is rendered", () => {
    it("sends a visitor without a session to the sign-in page", async () => {
        assert.deepEqual(await childPageAccess(String(CHILD_ID)), { kind: "login" });
        assert.deepEqual(await ownerPageAccess(String(CHILD_ID)), { kind: "login" });
    });

    it("lets the child in only to its own games, never to statistics or live view", async () => {
        signInAsChild(CHILD_ID);
        assert.deepEqual(await childPageAccess(String(CHILD_ID)), { kind: "ok", childId: CHILD_ID, viewer: "child" });
        assert.deepEqual(await childPageAccess(String(OTHER_CHILD_ID)), { kind: "denied" });
        assert.deepEqual(await ownerPageAccess(String(CHILD_ID)), { kind: "denied" });
    });

    it("lets a parent in only to linked children", async () => {
        signInAsParent(PARENT);
        assert.deepEqual(await childPageAccess(String(CHILD_ID)), { kind: "ok", childId: CHILD_ID, viewer: "parent" });
        assert.deepEqual(await ownerPageAccess(String(CHILD_ID)), { kind: "ok", childId: CHILD_ID, viewer: "parent" });
        assert.deepEqual(await childPageAccess(String(OTHER_CHILD_ID)), { kind: "denied" });
        assert.deepEqual(await ownerPageAccess(String(OTHER_CHILD_ID)), { kind: "denied" });
        assert.deepEqual(await childPageAccess("999"), { kind: "denied" });
    });

    it("refuses ids that only look like numbers, without asking the database", async () => {
        signInAsParent(PARENT);
        for (const raw of ["0", "-1", "1.0", "1e0", "0x1", " 1", "01", "abc", "", "9999999999999999"]) {
            assert.equal(parseChildIdParam(raw), null, raw);
            assert.deepEqual(await childPageAccess(raw), { kind: "denied" }, raw);
            assert.deepEqual(await ownerPageAccess(raw), { kind: "denied" }, raw);
        }
        assert.equal(db.count("user_children", "select"), 0);
    });

    it("reports a database failure as unavailable, not as access", async () => {
        signInAsParent(PARENT);
        db.failNext("user_children", "select", { code: "57P01" });
        assert.deepEqual(await childPageAccess(String(CHILD_ID)), { kind: "unavailable" });
    });

    it("gives every child its own live channel that cannot be derived from the id alone", () => {
        const mine = realtimeTopicFor(CHILD_ID);
        assert.notEqual(mine, realtimeTopicFor(OTHER_CHILD_ID));
        assert.match(mine, new RegExp(`^bm-${CHILD_ID}-[0-9a-f]{32}$`));
        const guessed = createHmac("sha256", "").update(`realtime-topic:${CHILD_ID}`).digest("hex").slice(0, 32);
        assert.notEqual(mine, `bm-${CHILD_ID}-${guessed}`);
    });
});

describe("a child session stops working when the parent locks the profile", () => {
    it("works while the code and the link to the parent are unchanged", async () => {
        signInAsChild(CHILD_ID);
        assert.equal((await readSettings()).status, 200);
    });

    it("stops after the parent picks new pictures", async () => {
        signInAsChild(CHILD_ID);
        signInAsParent(PARENT);
        const changed = await child.PUT(jsonRequest("PUT", { ...childBody, pin_code: NEW_PIN }), idParams(CHILD_ID));
        assert.equal(changed.status, 200);

        signInAsChild(CHILD_ID, PARENT, CHILD_PIN);
        assert.equal((await readSettings()).status, 401);
        assert.deepEqual(await childPageAccess(String(CHILD_ID)), { kind: "login" });
        const saved = await complete.POST(jsonRequest("POST", { childId: CHILD_ID, activityId: 1, level: 1, score: 1, correct: 1, total: 1, durationSec: 10 }));
        assert.equal(saved.status, 401);
        assert.equal(db.rows("progress_logs").length, 0);

        // Nove sličice otvaraju profil
        signInAsChild(CHILD_ID, PARENT, NEW_PIN);
        assert.equal((await readSettings()).status, 200);
    });

    it("stops after the parent removes the code", async () => {
        signInAsChild(CHILD_ID);
        mila().pin_code = null;
        assert.equal((await readSettings()).status, 401);
    });

    it("stops when the child is no longer linked to the account in the session", async () => {
        signInAsChild(CHILD_ID);
        // Veza roditelj–dete više ne postoji (redovi iz `db.rows` su živi objekti)
        db.rows("user_children").find((row) => row.child_id === CHILD_ID)!.child_id = 99;
        assert.equal((await readSettings()).status, 401);
    });

    it("is refused when it names an account that is not the child's parent", async () => {
        signInAsChild(CHILD_ID, STRANGER);
        assert.equal((await readSettings()).status, 401);
    });

    it("is refused without a code fingerprint (an old session) or with a forged one", async () => {
        signInAsChild(CHILD_ID, PARENT, null);
        assert.equal((await readSettings()).status, 401);

        const secret = process.env.JWT_SECRET ?? "";
        setSessionToken(jwt.sign({ id: PARENT.id, email: PARENT.email, role: "parent", childId: CHILD_ID, pv: "x".repeat(22) }, secret));
        assert.equal((await readSettings()).status, 401);

        // Otisak tuđeg deteta ne otvara ovo dete
        setSessionToken(jwt.sign({ id: PARENT.id, email: PARENT.email, role: "parent", childId: CHILD_ID, pv: pinFingerprint(OTHER_CHILD_ID, OTHER_PIN) }, secret));
        assert.equal((await readSettings()).status, 401);
    });

    it("cannot be moved to another child by changing the child id, even with that child's code", async () => {
        const secret = process.env.JWT_SECRET ?? "";
        setSessionToken(jwt.sign({ id: PARENT.id, email: PARENT.email, role: "parent", childId: OTHER_CHILD_ID, pv: pinFingerprint(OTHER_CHILD_ID, OTHER_PIN) }, secret));
        assert.equal((await readSettings(OTHER_CHILD_ID)).status, 401);
        assert.equal((await readSettings(CHILD_ID)).status, 403);
    });
});

describe("a taken code does not reveal other children's codes", () => {
    const addChild = (pin: string) => children.POST(jsonRequest("POST", { ...childBody, first_name: "Ana", pin_code: pin }));

    it("answers 409 for a few taken codes, then 429 for an hour", async () => {
        signInAsParent(PARENT);
        for (let attempt = 1; attempt <= PIN_TAKEN_RULE.limit; attempt += 1) {
            assert.equal((await addChild(OTHER_PIN)).status, 409, `attempt ${attempt}`);
        }
        const blocked = await addChild(OTHER_PIN);
        assert.equal(blocked.status, 429);
        assert.ok(Number(blocked.headers.get("retry-after")) > 0);
        // Ni slobodan kod se više ne proverava, pa odgovor ne otkriva ništa
        assert.equal((await addChild(NEW_PIN)).status, 429);
        assert.equal(db.rows("children").length, 2);
    });

    it("does not count free codes or the child's own code", async () => {
        signInAsParent(PARENT);
        for (let attempt = 1; attempt <= PIN_TAKEN_RULE.limit * 2; attempt += 1) {
            const response = await child.PUT(jsonRequest("PUT", { ...childBody, pin_code: CHILD_PIN }), idParams(CHILD_ID));
            assert.equal(response.status, 200, `attempt ${attempt}`);
        }
        assert.equal((await addChild(OTHER_PIN)).status, 409);
    });

    it("counts taken codes on edits too", async () => {
        signInAsParent(PARENT);
        for (let attempt = 1; attempt <= PIN_TAKEN_RULE.limit; attempt += 1) {
            assert.equal((await child.PUT(jsonRequest("PUT", { ...childBody, pin_code: OTHER_PIN }), idParams(CHILD_ID))).status, 409);
        }
        assert.equal((await child.PUT(jsonRequest("PUT", { ...childBody, pin_code: OTHER_PIN }), idParams(CHILD_ID))).status, 429);
        assert.equal(mila().pin_code, CHILD_PIN);
    });
});

describe("requests from another site", () => {
    const headers = (values: Record<string, string>) => new Headers(values);

    it("are refused when they would change data", () => {
        assert.equal(isCrossSiteMutation("POST", headers({ host: "app.example", origin: "https://evil.example" })), true);
        assert.equal(isCrossSiteMutation("PUT", headers({ host: "app.example", "sec-fetch-site": "cross-site" })), true);
        assert.equal(isCrossSiteMutation("DELETE", headers({ host: "app.example", origin: "null" })), true);
        assert.equal(isCrossSiteMutation("POST", headers({ host: "app.example:3000", origin: "http://app.example:4000" })), true);
        assert.equal(isCrossSiteMutation("POST", headers({ host: "app.example", origin: "not a url" })), true);
    });

    it("are allowed from the app itself, for reading, and from tools without browser headers", () => {
        assert.equal(isCrossSiteMutation("POST", headers({ host: "localhost:3215", origin: "http://localhost:3215", "sec-fetch-site": "same-origin" })), false);
        assert.equal(isCrossSiteMutation("POST", headers({ host: "internal:3000", "x-forwarded-host": "app.example", origin: "https://app.example" })), false);
        assert.equal(isCrossSiteMutation("GET", headers({ host: "app.example", origin: "https://evil.example", "sec-fetch-site": "cross-site" })), false);
        assert.equal(isCrossSiteMutation("POST", headers({ host: "app.example" })), false);
    });
});
