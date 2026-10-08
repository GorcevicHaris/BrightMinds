// app/api/_lib/children.ts
// Zajednički deo ruta za decu: oblik odgovora, provera ulaza, jedinstvenost PIN-a
// i čitanje zapisa partija (progress_logs) koje dele rute za nivoe i izvoz.
import { ADVANCE_RATIO } from "@/lib/games";
import { isUniqueViolation, supabaseAdmin } from "@/lib/supabase";
import {
    asTrimmedString,
    dateOnlyInTimeZone,
    isBlank,
    isRecord,
    normalizeVisualPin,
    oneOf,
    parseDateOnly,
    shiftDateOnly,
} from "@/lib/validation";
import { HttpError } from "./http";

export const GENDERS = ["male", "female", "other"] as const;
export type Gender = (typeof GENDERS)[number];

export const PIN_TAKEN = "Ovaj tajni kod već koristi drugo dete. Izaberite druge sličice.";
export const CHILD_NOT_FOUND = "Dete nije pronađeno";

const MAX_AGE_YEARS = 25;

/** Dete onako kako ga vidi roditeljski panel. */
export interface Child {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth: string | null;
    gender: string | null;
    notes: string | null;
    pin_code: string | null;
    streak: number;
    experience_points: number;
    created_at: string | null;
    /**
     * Sirova podešavanja kako su sačuvana (ili `{}`). Klijent ih tumači preko
     * `resolveSettings` iz lib/childSettings.ts, koji popunjava ono što nedostaje.
     */
    settings: unknown;
}

/** Red tabele `children` (kolone dodate migracijom mogu da nedostaju u starijoj bazi). */
export interface ChildRow {
    id: number;
    first_name: string;
    last_name: string;
    date_of_birth?: string | null;
    gender?: string | null;
    notes?: string | null;
    pin_code?: string | null;
    streak?: number | null;
    experience_points?: number | null;
    last_login_at?: string | null;
    created_at?: string | null;
    /** jsonb; kolonu dodaje migracija 0002 */
    settings?: unknown;
}

/** Sačuvana podešavanja kao objekat; `{}` ako kolona ne postoji ili vrednost nije objekat. */
export function storedSettings(row: Pick<ChildRow, "settings">): Record<string, unknown> {
    return isRecord(row.settings) ? row.settings : {};
}

/** Eksplicitno mapiranje — interne kolone (npr. last_login_at) ne izlaze iz API-ja. */
export function toChild(row: ChildRow): Child {
    return {
        id: row.id,
        first_name: row.first_name,
        last_name: row.last_name,
        date_of_birth: row.date_of_birth ?? null,
        gender: row.gender ?? null,
        notes: row.notes ?? null,
        pin_code: row.pin_code || null,
        streak: row.streak ?? 0,
        experience_points: row.experience_points ?? 0,
        created_at: row.created_at ?? null,
        settings: storedSettings(row),
    };
}

export interface ChildInput {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: Gender;
    /** `undefined` = polje nije poslato; `null` = obriši */
    notes: string | null | undefined;
    /** `undefined` = polje nije poslato; `null` = dete nema tajni kod */
    pin_code: string | null | undefined;
}

/** Proverava telo zahteva za dodavanje/izmenu deteta; baca 400 sa porukom za korisnika. */
export function parseChildInput(body: Record<string, unknown>): ChildInput {
    const first_name = asTrimmedString(body.first_name, { min: 1, max: 60 });
    if (!first_name) throw new HttpError(400, "Unesite ime deteta (najviše 60 karaktera)");

    const last_name = asTrimmedString(body.last_name, { min: 1, max: 60 });
    if (!last_name) throw new HttpError(400, "Unesite prezime deteta (najviše 60 karaktera)");

    const date_of_birth = parseDateOnly(body.date_of_birth);
    if (!date_of_birth) throw new HttpError(400, "Unesite ispravan datum rođenja");
    const today = dateOnlyInTimeZone(new Date());
    if (date_of_birth > today) throw new HttpError(400, "Datum rođenja ne može biti u budućnosti");
    if (date_of_birth < shiftDateOnly(today, { years: -MAX_AGE_YEARS })) {
        throw new HttpError(400, `Dete ne može biti starije od ${MAX_AGE_YEARS} godina`);
    }

    const gender = oneOf(body.gender, GENDERS);
    if (!gender) throw new HttpError(400, "Izaberite pol deteta");

    let notes: string | null | undefined;
    if (body.notes === undefined) notes = undefined;
    else if (isBlank(body.notes)) notes = null;
    else {
        notes = asTrimmedString(body.notes, { max: 500 });
        if (notes === null) throw new HttpError(400, "Napomena može imati najviše 500 karaktera");
    }

    let pin_code: string | null | undefined;
    if (body.pin_code === undefined) pin_code = undefined;
    else if (isBlank(body.pin_code)) pin_code = null;
    else {
        pin_code = normalizeVisualPin(body.pin_code);
        if (pin_code === null) {
            throw new HttpError(400, "Tajni kod nije ispravan. Izaberite po jednu sličicu iz svake grupe.");
        }
    }

    return { first_name, last_name, date_of_birth, gender, notes, pin_code };
}

/** Baca 409 ako PIN već koristi neko drugo dete. */
export async function assertPinAvailable(pinCode: string, exceptChildId?: number): Promise<void> {
    let query = supabaseAdmin.from("children").select("id").eq("pin_code", pinCode);
    if (exceptChildId !== undefined) query = query.neq("id", exceptChildId);
    const { data, error } = await query.limit(1);
    if (error) throw error;
    if (data && data.length > 0) throw new HttpError(409, PIN_TAKEN);
}

/**
 * Greška upisa u `children`: prekršen jedinstveni indeks nad pin_code (dva
 * zahteva u isto vreme) postaje 409, ostalo se prosleđuje dalje.
 */
export function childWriteError(error: unknown, pinCode: string | null | undefined): unknown {
    return pinCode && isUniqueViolation(error) ? new HttpError(409, PIN_TAKEN) : error;
}

// ── Zapisi partija (progress_logs) ─────────────────────────────────────────────

/**
 * Red tabele `progress_logs` kako ga vraća `select('*')`. Kolone iz migracija
 * (0001: level … duration_seconds, 0002: prompted_count) mogu da nedostaju.
 */
export interface ProgressLogRow {
    id: number;
    activity_id: number;
    success_level?: string | null;
    duration_minutes?: number | null;
    notes?: string | null;
    mood_before?: string | null;
    mood_after?: string | null;
    completed_at?: string | null;
    level?: number | null;
    stars?: number | null;
    score?: number | null;
    correct_count?: number | null;
    total_count?: number | null;
    duration_seconds?: number | null;
    prompted_count?: number | null;
}

/** Nivo i zvezdice iz stare beleške "Nivo 3, Zvezdice: 2, Rezultat: 150". */
export function parseLegacyNotes(notes: string | null | undefined): { level: number | null; stars: number | null } {
    const level = notes?.match(/Nivo\s+(\d{1,3})/);
    const stars = notes?.match(/Zvezdice:\s*(\d+)/);
    return { level: level ? Number(level[1]) : null, stars: stars ? Number(stars[1]) : null };
}

/**
 * Da li partija otključava sledeći nivo.
 *  • Zapis sa brojem odgovora: dete je bar polovinu zadataka (`ADVANCE_RATIO`)
 *    rešilo SAMOSTALNO. Odgovori uz pomoć se ne računaju.
 *  • Stariji zapis bez tih kolona: staro pravilo — bar jedna zvezdica (iz kolone
 *    ili beleške), a bez zvezdica sve osim uspešnosti "struggled".
 * Nema ishoda "nisi uspeo": partija koja nije položena samo ne otključava dalje.
 */
export function isLevelPassed(
    row: Pick<ProgressLogRow, "correct_count" | "total_count" | "stars" | "success_level" | "notes">,
    /** false za igre bez pogrešnih odgovora: svaki završen nivo je položen */
    graded = true
): boolean {
    if (!graded) return true;
    if (typeof row.correct_count === "number" && typeof row.total_count === "number") {
        return row.total_count > 0 && row.correct_count / row.total_count >= ADVANCE_RATIO;
    }
    const stars = typeof row.stars === "number" ? row.stars : parseLegacyNotes(row.notes).stars;
    return stars !== null ? stars >= 1 : row.success_level !== "struggled";
}

/** Vreme iz baze kao Date; vrednost bez vremenske zone tumači se kao UTC. */
export function parseDbTimestamp(value: string | null | undefined): Date | null {
    if (!value) return null;
    const hasZone = /(Z|[+-]\d{2}(:?\d{2})?)$/i.test(value);
    const date = new Date(hasZone ? value : `${value.replace(" ", "T")}Z`);
    return Number.isNaN(date.getTime()) ? null : date;
}
