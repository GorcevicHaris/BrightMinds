// Čiste pomoćne funkcije API ruta (app/api/_lib) i rad sa bazom koja nema sve migracije
// (`withSchemaFallback` iz lib/supabase.ts).
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { isLevelPassed, parseDbTimestamp, parseLegacyNotes, storedSettings, toChild } from "@/app/api/_lib/children";
import { HttpError, errorResponse, parseIdParam } from "@/app/api/_lib/http";
import { AuthError, getSession, signSession } from "@/lib/auth";
import {
    DbNotConfiguredError,
    isForeignKeyViolation,
    isMissingColumnError,
    isMissingRelationError,
    isSchemaMismatchError,
    isUniqueViolation,
    noResult,
    withSchemaFallback,
    type DbAttempt,
} from "@/lib/supabase";
import { advanceClock, readJson, resetWorld, setSessionToken } from "../setup/api";

beforeEach(resetWorld);

describe("parseIdParam", () => {
    it("accepts positive whole numbers of up to 15 digits", () => {
        assert.equal(parseIdParam("1"), 1);
        assert.equal(parseIdParam("42"), 42);
        assert.equal(parseIdParam("999999999999999"), 999_999_999_999_999);
    });

    it("returns NaN for everything else", () => {
        for (const raw of ["", "0", "01", "-1", "1.5", "1e3", " 1", "1 ", "abc", "1;drop", "9999999999999999"]) {
            assert.ok(Number.isNaN(parseIdParam(raw)), `"${raw}"`);
        }
    });
});

describe("isLevelPassed", () => {
    const row = (overrides: Record<string, unknown> = {}) => ({ correct_count: null, total_count: null, stars: null, success_level: null, notes: null, ...overrides });

    it("passes from 50% independently correct when the row has answer counts", () => {
        assert.equal(isLevelPassed(row({ correct_count: 2, total_count: 4 })), true);
        assert.equal(isLevelPassed(row({ correct_count: 1, total_count: 4 })), false);
        assert.equal(isLevelPassed(row({ correct_count: 49, total_count: 100 })), false);
    });

    it("lets the answer counts decide even when stars or success level say otherwise", () => {
        assert.equal(isLevelPassed(row({ correct_count: 1, total_count: 4, stars: 3, success_level: "excellent" })), false);
        assert.equal(isLevelPassed(row({ correct_count: 4, total_count: 4, stars: 0, success_level: "struggled" })), true);
    });

    it("passes a level without tasks (a story that was only read)", () => {
        assert.equal(isLevelPassed(row({ correct_count: 0, total_count: 0, stars: 1 })), true);
    });

    it("uses stars from the column, then from the old note, when there are no counts", () => {
        assert.equal(isLevelPassed(row({ stars: 1 })), true);
        assert.equal(isLevelPassed(row({ stars: 0 })), false);
        assert.equal(isLevelPassed(row({ notes: "Nivo 3, Zvezdice: 2, Rezultat: 10" })), true);
        assert.equal(isLevelPassed(row({ notes: "Nivo 3, Zvezdice: 0, Rezultat: 0" })), false);
    });

    it("uses the success level when there are neither counts nor stars", () => {
        assert.equal(isLevelPassed(row({ success_level: "partial" })), true);
        assert.equal(isLevelPassed(row({ success_level: "struggled" })), false);
    });

    it("always passes in a game without wrong answers", () => {
        assert.equal(isLevelPassed(row({ correct_count: 0, total_count: 4, stars: 0, success_level: "struggled" }), false), true);
    });
});

describe("small readers of database values", () => {
    it("parseLegacyNotes reads level and stars from the old note format", () => {
        assert.deepEqual(parseLegacyNotes("Nivo 3, Zvezdice: 2, Rezultat: 150"), { level: 3, stars: 2 });
        assert.deepEqual(parseLegacyNotes("Nivo 12"), { level: 12, stars: null });
        assert.deepEqual(parseLegacyNotes("nešto drugo"), { level: null, stars: null });
        assert.deepEqual(parseLegacyNotes(null), { level: null, stars: null });
    });

    it("parseDbTimestamp reads a time without a zone as UTC and keeps an explicit zone", () => {
        assert.equal(parseDbTimestamp("2026-03-10 10:00:00")?.toISOString(), "2026-03-10T10:00:00.000Z");
        assert.equal(parseDbTimestamp("2026-03-10T10:00:00.123456")?.toISOString(), "2026-03-10T10:00:00.123Z");
        assert.equal(parseDbTimestamp("2026-03-10T10:00:00Z")?.toISOString(), "2026-03-10T10:00:00.000Z");
        assert.equal(parseDbTimestamp("2026-03-10T12:00:00+02:00")?.toISOString(), "2026-03-10T10:00:00.000Z");
        assert.equal(parseDbTimestamp("2026-03-10 12:00:00+02")?.toISOString(), "2026-03-10T10:00:00.000Z");
    });

    it("parseDbTimestamp returns null for a missing or unreadable value", () => {
        assert.equal(parseDbTimestamp(null), null);
        assert.equal(parseDbTimestamp(""), null);
        assert.equal(parseDbTimestamp("juče"), null);
    });

    it("toChild fills defaults and leaves out columns the browser must not see", () => {
        const child = toChild({ id: 1, first_name: "Mila", last_name: "Test", pin_code: "", last_login_at: "2026-03-10T10:00:00Z", settings: "broken" });
        assert.deepEqual(child, {
            id: 1,
            first_name: "Mila",
            last_name: "Test",
            date_of_birth: null,
            gender: null,
            notes: null,
            pin_code: null,
            streak: 0,
            experience_points: 0,
            created_at: null,
            settings: {},
        });
        assert.deepEqual(storedSettings({ settings: { script: "cyrillic" } }), { script: "cyrillic" });
    });
});

describe("errorResponse", () => {
    it("turns known errors into their status and message", async () => {
        const http = errorResponse(new HttpError(429, "Previše pokušaja", { "Retry-After": "30" }), "test");
        assert.equal(http.status, 429);
        assert.equal(http.headers.get("retry-after"), "30");
        assert.deepEqual(await readJson(http), { error: "Previše pokušaja" });

        assert.equal(errorResponse(new AuthError(403, "Nemate pristup"), "test").status, 403);
        assert.equal(errorResponse(new DbNotConfiguredError(), "test").status, 503);
    });

    it("hides the details of unexpected errors behind a generic 500", async (t) => {
        const logged = t.mock.method(console, "error", () => undefined);
        const response = errorResponse(new Error("password=hunter2 at 10.0.0.5"), "GET /api/test");
        assert.equal(response.status, 500);
        assert.doesNotMatch(JSON.stringify(await readJson(response)), /hunter2|10\.0\.0\.5/);
        assert.equal(logged.mock.callCount(), 1);
    });
});

describe("session tokens", () => {
    it("round-trip a parent session without a child id", async () => {
        setSessionToken(signSession({ userId: 10, email: "roditelj@example.com", role: "parent" }));
        assert.deepEqual(await getSession(), { userId: 10, email: "roditelj@example.com", role: "parent", childId: undefined });
    });

    it("round-trip a child session with its child id and PIN fingerprint", async () => {
        setSessionToken(signSession({ userId: 10, email: "roditelj@example.com", role: "parent", childId: 3, pinTag: "abc" }));
        const session = await getSession();
        assert.equal(session?.childId, 3);
        assert.equal(session?.pinTag, "abc");
    });

    it("never put a PIN fingerprint into a parent session", async () => {
        setSessionToken(signSession({ userId: 10, email: "roditelj@example.com", role: "parent", pinTag: "abc" }));
        assert.equal((await getSession())?.pinTag, undefined);
    });

    it("expire after seven days", async () => {
        setSessionToken(signSession({ userId: 10, email: "roditelj@example.com", role: "parent" }));
        advanceClock(7 * 24 * 60 * 60_000 - 60_000);
        assert.equal((await getSession())?.userId, 10);
        advanceClock(2 * 60_000);
        assert.equal(await getSession(), null);
    });
});

describe("database error codes", () => {
    it("are recognised from Postgres and from PostgREST", () => {
        assert.equal(isUniqueViolation({ code: "23505" }), true);
        assert.equal(isForeignKeyViolation({ code: "23503" }), true);
        assert.equal(isMissingColumnError({ code: "42703" }), true);
        assert.equal(isMissingColumnError({ code: "PGRST204" }), true);
        assert.equal(isMissingRelationError({ code: "42P01" }), true);
        assert.equal(isMissingRelationError({ code: "PGRST205" }), true);
        assert.equal(isSchemaMismatchError({ code: "PGRST204" }), true);
        assert.equal(isSchemaMismatchError({ code: "PGRST205" }), true);
    });

    it("are not confused with each other or with values that are not errors", () => {
        assert.equal(isSchemaMismatchError({ code: "23505" }), false);
        assert.equal(isUniqueViolation({ code: "23503" }), false);
        assert.equal(isMissingColumnError({ code: 42703 }), false);
        assert.equal(isMissingColumnError(null), false);
        assert.equal(isMissingColumnError("PGRST204"), false);
    });
});

describe("withSchemaFallback", () => {
    const missingColumn = { code: "PGRST204", message: "no column" };
    const missingTable = { code: "PGRST205", message: "no table" };

    /** Pokušaj koji broji pozive i vraća zadati ishod. */
    function attempt(outcome: { data?: string; error?: unknown; throws?: unknown }) {
        const calls = { count: 0 };
        const run: DbAttempt<string | null> = async () => {
            calls.count += 1;
            if (outcome.throws !== undefined) throw outcome.throws;
            return { data: outcome.data ?? null, error: outcome.error ?? null };
        };
        return { run, calls };
    }

    it("returns the first attempt when it works and does not try the others", async () => {
        const newest = attempt({ data: "new" });
        const oldest = attempt({ data: "old" });
        assert.deepEqual(await withSchemaFallback([newest.run, oldest.run]), { data: "new", variant: 0 });
        assert.equal(oldest.calls.count, 0);
    });

    it("moves to the next attempt when a column or a table is missing", async () => {
        const first = attempt({ error: missingColumn });
        const second = attempt({ throws: missingTable });
        const third = attempt({ data: "old" });
        assert.deepEqual(await withSchemaFallback([first.run, second.run, third.run]), { data: "old", variant: 2 });
    });

    it("throws any other error at once, without trying older shapes", async () => {
        const failing = attempt({ error: { code: "23505" } });
        const older = attempt({ data: "old" });
        await assert.rejects(withSchemaFallback([failing.run, older.run]), { code: "23505" });
        assert.equal(older.calls.count, 0);
    });

    it("throws the schema error when even the oldest shape does not fit", async () => {
        await assert.rejects(withSchemaFallback([attempt({ error: missingColumn }).run, attempt({ error: missingTable }).run]), missingTable);
    });

    it("ends optional reads with noResult instead of an error", async () => {
        assert.deepEqual(await withSchemaFallback<unknown>([attempt({ error: missingTable }).run, noResult]), { data: null, variant: 1 });
    });

    it("remembers under a key that the newest shape is missing, for one minute", async () => {
        const newest = attempt({ error: missingColumn });
        const older = attempt({ data: "old" });
        const run = () => withSchemaFallback([newest.run, older.run], "test.memo");

        await run();
        await run();
        advanceClock(59_000);
        await run();
        assert.equal(newest.calls.count, 1, "the failing shape is not retried within the minute");
        assert.equal(older.calls.count, 3);

        advanceClock(2_000);
        await run();
        assert.equal(newest.calls.count, 2, "after a minute the newest shape is tried again");
    });

    it("does not remember anything without a key", async () => {
        const newest = attempt({ error: missingColumn });
        const older = attempt({ data: "old" });
        await withSchemaFallback([newest.run, older.run]);
        await withSchemaFallback([newest.run, older.run]);
        assert.equal(newest.calls.count, 2);
    });

    it("keeps separate memories for separate keys", async () => {
        const newest = attempt({ error: missingColumn });
        const older = attempt({ data: "old" });
        await withSchemaFallback([newest.run, older.run], "test.keyA");
        await withSchemaFallback([newest.run, older.run], "test.keyB");
        assert.equal(newest.calls.count, 2);
    });
});
