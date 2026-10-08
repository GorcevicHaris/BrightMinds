// lib/supabase.ts
// Supabase klijent — ISKLJUČIVO za server (API rute i serverske komponente).
//
// Koristi service-role ključ, koji zaobilazi Row Level Security. Zato se ovaj
// modul nikada ne sme uvoziti u klijentske ("use client") komponente; pregledač
// koristi samo Realtime kanal iz lib/realtime.ts (anon ključ, bez pristupa tabelama).
//
// Uvoz modula nikada ne baca grešku: klijent se pravi tek pri prvom upitu. Ako
// ključevi nedostaju, prvi upit baca `DbNotConfiguredError`, koji rute pretvaraju
// u 503 preko `dbUnavailableResponse()`.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

/** Da li su podešeni URL i service-role ključ. */
export const supabaseConfigured: boolean = Boolean(supabaseUrl && serviceRoleKey);

export const DB_NOT_CONFIGURED_MESSAGE =
    "Baza podataka nije podešena. Dodajte Supabase ključeve u .env.local.";

export class DbNotConfiguredError extends Error {
    constructor() {
        super(DB_NOT_CONFIGURED_MESSAGE);
        this.name = "DbNotConfiguredError";
    }
}

/** Baca `DbNotConfiguredError` ako Supabase nije podešen. */
export function assertDbConfigured(): void {
    if (!supabaseConfigured) throw new DbNotConfiguredError();
}

/** Odgovor 503 za rute kada baza nije podešena. */
export function dbUnavailableResponse(): NextResponse {
    return NextResponse.json({ error: DB_NOT_CONFIGURED_MESSAGE }, { status: 503 });
}

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
    assertDbConfigured();
    if (!client) {
        client = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });
    }
    return client;
}

/**
 * Administratorski klijent (service role). Objekat je uvek dostupan za uvoz;
 * pravi klijent nastaje pri prvom pristupu (npr. `supabaseAdmin.from(...)`).
 */
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, property) {
        const target = getClient();
        const value: unknown = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
    },
});

// ── Greške baze ────────────────────────────────────────────────────────────────

interface DbErrorLike {
    code?: unknown;
}

function errorCode(error: unknown): string | null {
    if (typeof error !== "object" || error === null) return null;
    const code = (error as DbErrorLike).code;
    return typeof code === "string" ? code : null;
}

/** Postgres 23505 — prekršen jedinstveni indeks. */
export function isUniqueViolation(error: unknown): boolean {
    return errorCode(error) === "23505";
}

/** Postgres 23503 — prekršen strani ključ. */
export function isForeignKeyViolation(error: unknown): boolean {
    return errorCode(error) === "23503";
}

/**
 * Kolona ne postoji (Postgres 42703) ili je PostgREST ne vidi u šemi (PGRST204).
 * Dešava se dok migracija iz supabase/migrations još nije primenjena.
 */
export function isMissingColumnError(error: unknown): boolean {
    const code = errorCode(error);
    return code === "42703" || code === "PGRST204";
}
