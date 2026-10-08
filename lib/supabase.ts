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

/**
 * Tabela ili pogled ne postoji (Postgres 42P01) ili ih PostgREST ne vidi u šemi
 * (PGRST205). Dešava se dok migracija koja ih pravi još nije primenjena.
 */
export function isMissingRelationError(error: unknown): boolean {
    const code = errorCode(error);
    return code === "42P01" || code === "PGRST205";
}

/** Baza je starija od koda: nedostaje kolona, tabela ili pogled iz neke migracije. */
export function isSchemaMismatchError(error: unknown): boolean {
    return isMissingColumnError(error) || isMissingRelationError(error);
}

// ── Rad sa bazom koja još nema sve migracije ───────────────────────────────────

/** Ishod jednog pokušaja — isti oblik koji vraćaju upiti supabase-js klijenta. */
export interface DbAttemptResult<T> {
    data: T;
    error: unknown;
}

/** Jedan pokušaj: upit supabase-js klijenta ili funkcija koja vraća `{ data, error }` (sme i da baci grešku). */
export type DbAttempt<T> = () => PromiseLike<DbAttemptResult<T>>;

/** Poslednji pokušaj za opcione stvari: „nema toga u ovoj bazi”, bez greške. */
export const noResult: DbAttempt<null> = async () => ({ data: null, error: null });

/** Koliko dugo se pamti da baza nema novije kolone/tabele (posle migracije se same „otkriju”). */
const SCHEMA_MEMO_MS = 60_000;
const schemaMemo = new Map<string, { variant: number; until: number }>();

type Settled<T> = { ok: true; data: T } | { ok: false; error: unknown };

/** Pokušaj koji je vratio `error` i pokušaj koji je bacio grešku svode se na isto. */
async function settle<T>(attempt: DbAttempt<T>): Promise<Settled<T>> {
    try {
        const { data, error } = await attempt();
        return error ? { ok: false, error } : { ok: true, data };
    } catch (error) {
        return { ok: false, error };
    }
}

/**
 * Izvršava isti upis ili čitanje nad bazom koja možda još nema sve migracije.
 * `attempts` su poređani od najnovijeg oblika (sve kolone/tabele) ka najstarijem.
 * Ako pokušaj padne zato što kolona, tabela ili pogled ne postoje, prelazi se na
 * sledeći; svaka druga greška — i ista takva na poslednjem pokušaju — se baca.
 * Vraća podatke i redni broj pokušaja koji je uspeo (0 = najnoviji oblik).
 *
 * Ponavljanje upisa je bezbedno: PostgREST svaki zahtev izvršava u transakciji,
 * pa neuspeli pokušaj ne ostavlja ništa za sobom.
 *
 * `memoKey`: kada je prosleđen, pamti se (na minut, po instanci servera) da
 * noviji oblici ne postoje, pa baza bez migracije ne plaća neuspeli upit pri
 * svakom zahtevu. Svi pozivi sa istim ključem moraju imati isti broj pokušaja.
 */
export async function withSchemaFallback<T>(
    attempts: readonly DbAttempt<T>[],
    memoKey?: string
): Promise<{ data: T; variant: number }> {
    const memo = memoKey ? schemaMemo.get(memoKey) : undefined;
    const start = memo && memo.until > Date.now() ? Math.min(memo.variant, attempts.length - 1) : 0;

    for (let variant = start; variant < attempts.length; variant++) {
        const result = await settle(attempts[variant]);
        if (result.ok) {
            // Pamti se samo ono što je otkriveno od početka (start = 0), da zapis
            // istekne i noviji oblik se ponovo proba čim migracija bude primenjena.
            if (memoKey && start === 0) {
                if (variant > 0) schemaMemo.set(memoKey, { variant, until: Date.now() + SCHEMA_MEMO_MS });
                else schemaMemo.delete(memoKey);
            }
            return { data: result.data, variant };
        }
        if (!isSchemaMismatchError(result.error) || variant === attempts.length - 1) throw result.error;
    }
    throw new Error("withSchemaFallback: nema nijednog pokušaja");
}
