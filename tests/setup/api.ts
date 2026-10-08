// tests/setup/api.ts
// Zajednički deo testova API ruta: sesije, zahtevi, početni podaci i sat.
// Rute se pozivaju direktno kao funkcije (`POST(request)`), bez servera.
import jwt from "jsonwebtoken";
import { mock } from "node:test";
import { dateOnlyInTimeZone, shiftDateOnly } from "@/lib/validation";
import { db, type Row } from "./fakeSupabase";
import { cookieJar } from "./nextHeaders";

export { db, cookieJar };

/** Isto ime kolačića kao `SESSION_COOKIE` u lib/auth.ts. */
const SESSION_COOKIE = "token";

export interface TestUser {
    id: number;
    email: string;
    role: string;
}

/** Roditelj deteta `CHILD_ID`. */
export const PARENT: TestUser = { id: 10, email: "roditelj@example.com", role: "parent" };
/** Drugi nalog: roditelj deteta `OTHER_CHILD_ID`, nije povezan sa `CHILD_ID`. */
export const STRANGER: TestUser = { id: 20, email: "drugi@example.com", role: "parent" };

export const CHILD_ID = 1;
export const OTHER_CHILD_ID = 2;
export const CHILD_PIN = "dog,pizza,car,pepsi";

function testSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET postavlja tests/setup/register.mjs");
    return secret;
}

// ── Sat ───────────────────────────────────────────────────────────────────────
// `Date` je lažan (tajmeri nisu): svaki test počinje dva minuta posle prethodnog, pa ističe
// ono što lib/supabase.ts pamti na minut („baza nema novije kolone”) i testovi ne zavise
// od redosleda. Početak je podne u Beogradu, da nijedan test ne pređe ponoć.
const CLOCK_START = Date.UTC(2026, 2, 15, 11, 0, 0);
const CLOCK_STEP_MS = 2 * 60_000;
let clock = CLOCK_START;

/** Pomera lažni sat unapred (npr. da istekne prozor ograničavača pokušaja). */
export function advanceClock(ms: number): void {
    clock += ms;
    mock.timers.setTime(clock);
}

/**
 * Dan u Beogradu po lažnom satu (YYYY-MM-DD), pomeren za `offsetDays`. Testovi datume
 * računaju odavde umesto da ih zakucaju, pa ne zavise od toga koliko je sat odmakao.
 */
export function belgradeDay(offsetDays = 0): string {
    return shiftDateOnly(dateOnlyInTimeZone(new Date()), { days: offsetDays });
}

/** Pre svakog testa: prazna baza, bez kolačića, sat pomeren unapred. */
export function resetWorld(): void {
    db.reset();
    cookieJar.clear();
    clock += CLOCK_STEP_MS;
    mock.timers.reset();
    mock.timers.enable({ apis: ["Date"], now: clock });
}

// ── Sesije ────────────────────────────────────────────────────────────────────

/** Roditeljska sesija: kolačić potpisan test-ključem, istog oblika kao u lib/auth.ts. */
export function signInAsParent(user: TestUser = PARENT): void {
    cookieJar.set(SESSION_COOKIE, jwt.sign({ id: user.id, email: user.email, role: user.role }, testSecret(), { expiresIn: "1h" }));
}

/** Dečja sesija (prijava PIN-om): nosi `childId` i nalog roditelja. */
export function signInAsChild(childId: number = CHILD_ID, owner: TestUser = PARENT): void {
    const payload = { id: owner.id, email: owner.email, role: owner.role, childId };
    cookieJar.set(SESSION_COOKIE, jwt.sign(payload, testSecret(), { expiresIn: "1h" }));
}

/** Kolačić sa proizvoljnom vrednošću (istekao, tuđi ključ, besmislica). */
export function setSessionToken(token: string): void {
    cookieJar.set(SESSION_COOKIE, token);
}

/** Sadržaj sesije koju je ruta postavila u odgovoru (`Set-Cookie`), ili null. */
export function sessionFromResponse(response: Response): Record<string, unknown> | null {
    const header = response.headers.getSetCookie().find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
    const token = header?.slice(SESSION_COOKIE.length + 1).split(";")[0];
    if (!token) return null;
    const payload = jwt.verify(decodeURIComponent(token), testSecret());
    return typeof payload === "string" ? null : { ...payload };
}

// ── Zahtevi i odgovori ────────────────────────────────────────────────────────

/** Zahtev sa JSON telom; `body` tipa string se šalje kakav jeste (za neispravan JSON). */
export function jsonRequest(method: string, body?: unknown, headers: Record<string, string> = {}): Request {
    return new Request("http://localhost/api/test", {
        method,
        headers: { "content-type": "application/json", ...headers },
        body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
}

/** Drugi argument rute sa dinamičkim segmentom: `{ params: Promise<{ id }> }`. */
export function idParams(id: number | string): { params: Promise<{ id: string }> } {
    return { params: Promise.resolve({ id: String(id) }) };
}

export async function readJson(response: Response): Promise<Record<string, unknown>> {
    return (await response.json()) as Record<string, unknown>;
}

// ── Početni podaci ────────────────────────────────────────────────────────────

/** Dva naloga i dva deteta: `PARENT` → `CHILD_ID`, `STRANGER` → `OTHER_CHILD_ID`. */
export function seedFamily(child: Row = {}): void {
    db.seed("users", [
        { ...PARENT, full_name: "Roditelj Test" },
        { ...STRANGER, full_name: "Drugi Roditelj" },
    ]);
    db.seed("children", [
        {
            id: CHILD_ID,
            first_name: "Mila",
            last_name: "Test",
            date_of_birth: "2020-01-01",
            gender: "female",
            notes: null,
            pin_code: CHILD_PIN,
            streak: 0,
            experience_points: 0,
            last_login_at: null,
            created_at: "2026-01-01T10:00:00Z",
            settings: {},
            ...child,
        },
        {
            id: OTHER_CHILD_ID,
            first_name: "Luka",
            last_name: "Drugi",
            date_of_birth: "2018-05-05",
            gender: "male",
            notes: null,
            pin_code: "cat,burger,book,sprite",
            streak: 3,
            experience_points: 40,
            last_login_at: null,
            created_at: "2026-01-02T10:00:00Z",
            settings: {},
        },
    ]);
    db.seed("user_children", [
        { user_id: PARENT.id, child_id: CHILD_ID, relationship: "parent", is_primary: true },
        { user_id: STRANGER.id, child_id: OTHER_CHILD_ID, relationship: "parent", is_primary: true },
    ]);
}
