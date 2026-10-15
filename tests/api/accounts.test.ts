// POST /api/auth/register i /api/auth/login — nalozi odraslih (roditelj, učitelj, terapeut).
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import bcrypt from "bcryptjs";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { db, jsonRequest, readJson, resetWorld, sessionFromResponse } from "../setup/api";

const PASSWORD = "tajna-lozinka-1";

let lastIp = 0;
/** Svaki test dolazi sa svoje adrese: ograničavač pamti pokušaje po IP adresi za ceo proces. */
const freshIp = () => `203.0.113.${(lastIp += 1)}`;

const account = (overrides: Record<string, unknown> = {}) => ({
    email: "ana@example.com",
    password: PASSWORD,
    full_name: "Ana Petrović",
    ...overrides,
});

const signUp = (body: unknown, ip = freshIp()) => register(jsonRequest("POST", body, { "x-forwarded-for": ip }));
const signIn = (body: unknown, ip = freshIp()) => login(jsonRequest("POST", body, { "x-forwarded-for": ip }));
const users = () => db.rows("users");

/** Postojeći nalog; heš se pravi sa malim brojem rundi da test ne troši procesor. */
function seedUser(overrides: Record<string, unknown> = {}): void {
    db.seed("users", [
        { id: 10, email: "ana@example.com", full_name: "Ana Petrović", role: "parent", password_hash: bcrypt.hashSync(PASSWORD, 4), ...overrides },
    ]);
}

beforeEach(resetWorld);

describe("POST /api/auth/register", () => {
    it("creates the account with a hashed password and signs the adult in", async () => {
        const response = await signUp(account({ email: "  Ana@Example.COM ", phone: "+381 64 123-45-67", role: "therapist" }));
        assert.equal(response.status, 201);

        const [stored] = users();
        assert.deepEqual(await readJson(response), {
            success: true,
            user: { id: stored.id, full_name: "Ana Petrović", email: "ana@example.com", role: "therapist" },
        });
        assert.equal(stored.email, "ana@example.com");
        assert.equal(stored.phone, "+381 64 123-45-67");
        assert.notEqual(stored.password_hash, PASSWORD);
        assert.equal(await bcrypt.compare(PASSWORD, String(stored.password_hash)), true);

        const session = sessionFromResponse(response);
        assert.deepEqual(
            { id: session?.id, email: session?.email, role: session?.role, childId: session?.childId },
            { id: stored.id, email: "ana@example.com", role: "therapist", childId: undefined }
        );
    });

    it("registers a parent when no role is chosen", async () => {
        await signUp(account());
        assert.equal(users()[0].role, "parent");
        assert.equal(users()[0].phone, null);
    });

    it("never lets anyone register as admin", async () => {
        const response = await signUp(account({ role: "admin" }));
        assert.equal(response.status, 400);
        assert.deepEqual(users(), []);
    });

    it("answers 409 when the email is already registered, in any letter case", async () => {
        seedUser({ email: "Ana@Example.com" });
        const response = await signUp(account({ email: "ana@example.com" }));
        assert.equal(response.status, 409);
        assert.equal(users().length, 1);
        assert.equal(sessionFromResponse(response), null);
    });

    it("answers 409 when the unique index catches an email registered in the same moment", async () => {
        db.failNext("users", "insert", { code: "23505" });
        assert.equal((await signUp(account())).status, 409);
    });

    const invalid: [string, Record<string, unknown>][] = [
        ["an invalid email", account({ email: "ana@" })],
        ["a missing email", account({ email: undefined })],
        ["a password shorter than 8 characters", account({ password: "kratka1" })],
        ["a password longer than 72 bytes", account({ password: "š".repeat(37) })],
        ["a one-letter name", account({ full_name: " A " })],
        ["a phone number with letters", account({ phone: "pozovi me" })],
        ["an unknown role", account({ role: "wizard" })],
    ];

    for (const [name, body] of invalid) {
        it(`answers 400 and creates nothing for ${name}`, async () => {
            const response = await signUp(body);
            assert.equal(response.status, 400);
            assert.deepEqual(users(), []);
        });
    }
});

describe("POST /api/auth/login", () => {
    beforeEach(() => seedUser());

    it("signs in with the right password and returns the user without the hash", async () => {
        const response = await signIn({ email: "ana@example.com", password: PASSWORD });
        assert.equal(response.status, 200);
        assert.deepEqual(await readJson(response), {
            success: true,
            user: { id: 10, full_name: "Ana Petrović", email: "ana@example.com", role: "parent" },
        });
        const session = sessionFromResponse(response);
        assert.equal(session?.id, 10);
        assert.equal(session?.childId, undefined);
    });

    it("ignores letter case and spaces around the email", async () => {
        assert.equal((await signIn({ email: "  ANA@example.COM ", password: PASSWORD })).status, 200);
    });

    it("finds an older account that was stored with capital letters", async () => {
        users()[0].email = "Ana@Example.com";
        assert.equal((await signIn({ email: "ana@example.com", password: PASSWORD })).status, 200);
    });

    it("gives the same 401 for a wrong password and for an unknown email", async () => {
        const wrongPassword = await signIn({ email: "ana@example.com", password: "pogresna-lozinka" });
        const unknownEmail = await signIn({ email: "niko@example.com", password: PASSWORD });
        assert.equal(wrongPassword.status, 401);
        assert.equal(unknownEmail.status, 401);
        assert.deepEqual(await readJson(wrongPassword), await readJson(unknownEmail));
        assert.equal(sessionFromResponse(wrongPassword), null);
    });

    it("does not treat % and _ in the email as wildcards", async () => {
        assert.equal((await signIn({ email: "a%@example.com", password: PASSWORD })).status, 401);
        assert.equal((await signIn({ email: "an_@example.com", password: PASSWORD })).status, 401);
    });

    it("answers 401 for an account without a password", async () => {
        users()[0].password_hash = null;
        assert.equal((await signIn({ email: "ana@example.com", password: PASSWORD })).status, 401);
    });

    it("answers 400 when the email or the password is missing", async () => {
        assert.equal((await signIn({ email: "ana@example.com" })).status, 400);
        assert.equal((await signIn({ password: PASSWORD })).status, 400);
        assert.equal((await signIn({ email: "ana@example.com", password: 12345678 })).status, 400);
    });

    it("answers 429 with Retry-After after ten wrong passwords for one account from one address", async () => {
        const ip = freshIp();
        for (let attempt = 1; attempt <= 10; attempt += 1) {
            assert.equal((await signIn({ email: "ana@example.com", password: "pogresna" }, ip)).status, 401, `attempt ${attempt}`);
        }
        const blocked = await signIn({ email: "ana@example.com", password: "pogresna" }, ip);
        assert.equal(blocked.status, 429);
        assert.equal(blocked.headers.get("retry-after"), "600");
        assert.equal((await signIn({ email: "ana@example.com", password: "pogresna" }, freshIp())).status, 401);
    });

    it("does not count successful sign-ins towards the limit", async () => {
        const ip = freshIp();
        for (let attempt = 1; attempt <= 12; attempt += 1) {
            assert.equal((await signIn({ email: "ana@example.com", password: PASSWORD }, ip)).status, 200, `sign-in ${attempt}`);
        }
    });
});
