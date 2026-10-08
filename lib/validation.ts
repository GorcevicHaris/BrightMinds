// lib/validation.ts
// Mali, tipizirani pomoćnici za proveru ulaza. Bez zavisnosti i bez serverskog
// koda, pa se isti pomoćnici mogu koristiti i u API rutama i u formama.
// Svi "as*" i "parse*" pomoćnici vraćaju `null` kada vrednost nije ispravna.
import { VISUAL_PIN_CATEGORIES } from "./visualPinData";

export const APP_TIME_ZONE = "Europe/Belgrade";

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `true` za `undefined`, `null` i prazan/beli string — "polje nije popunjeno". */
export function isBlank(value: unknown): boolean {
    return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

// ── Tekst ──────────────────────────────────────────────────────────────────────

interface LengthRange {
    min?: number;
    max: number;
}

/** String bez razmaka na krajevima čija je dužina u zadatom opsegu. */
export function asTrimmedString(value: unknown, { min = 0, max }: LengthRange): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length >= min && trimmed.length <= max ? trimmed : null;
}

/** Vrednost iz zatvorenog skupa stringova. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
    return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

// Namerno uži skup znakova od RFC-a: bez razmaka, navodnika, `%`, `*` i `\`,
// pa je adresu bezbedno koristiti i u ILIKE obrascu (videti escapeLikePattern).
const EMAIL_PATTERN = /^[a-z0-9.!#$&'+/=?^_`{|}~-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export function isEmail(value: string): boolean {
    return value.length <= 254 && EMAIL_PATTERN.test(value) && !value.includes("..");
}

/** Email bez razmaka, malim slovima; `null` ako nije ispravna adresa. */
export function normalizeEmail(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const email = value.trim().toLowerCase();
    return isEmail(email) ? email : null;
}

/** Labav obrazac za telefon: cifre, razmaci i uobičajeni znaci, 6–20 cifara. */
export function isPhone(value: string): boolean {
    if (!/^\+?[0-9\s\-()/.]{6,30}$/.test(value)) return false;
    const digits = value.replace(/\D/g, "").length;
    return digits >= 6 && digits <= 20;
}

/** Pretvara tekst u doslovni LIKE/ILIKE obrazac (bez džoker znakova). */
export function escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// ── Brojevi ────────────────────────────────────────────────────────────────────

interface NumberRange {
    min?: number;
    max?: number;
}

function inRange(value: number, { min = -Infinity, max = Infinity }: NumberRange): boolean {
    return value >= min && value <= max;
}

/** Konačan broj u opsegu (prihvata i numerički string). */
export function asNumber(value: unknown, range: NumberRange = {}): number | null {
    let parsed: number;
    if (typeof value === "number") parsed = value;
    else if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) parsed = Number(value);
    else return null;
    return Number.isFinite(parsed) && inRange(parsed, range) ? parsed : null;
}

/** Ceo broj u opsegu (prihvata i string sastavljen samo od cifara). */
export function asInt(value: unknown, range: NumberRange = {}): number | null {
    const parsed = asNumber(value, range);
    return parsed !== null && Number.isSafeInteger(parsed) ? parsed : null;
}

/** Niz celih brojeva (bez duplikata) čija je dužina u zadatom opsegu. */
export function asIntArray(
    value: unknown,
    { minItems = 0, maxItems, ...range }: NumberRange & { minItems?: number; maxItems: number }
): number[] | null {
    if (!Array.isArray(value) || value.length < minItems || value.length > maxItems) return null;
    const result = new Set<number>();
    for (const item of value) {
        const parsed = asInt(item, range);
        if (parsed === null) return null;
        result.add(parsed);
    }
    return [...result];
}

// ── Datumi ─────────────────────────────────────────────────────────────────────

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Stvaran kalendarski datum u obliku YYYY-MM-DD (npr. odbija 2024-02-31). */
export function parseDateOnly(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const match = DATE_ONLY_PATTERN.exec(value.trim());
    if (!match) return null;
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(year, month - 1, day));
    const isReal =
        date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    return isReal ? match[0] : null;
}

/** Kalendarski dan (YYYY-MM-DD) u kome se trenutak `date` nalazi u datoj vremenskoj zoni. */
export function dateOnlyInTimeZone(date: Date, timeZone: string = APP_TIME_ZONE): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Pomera YYYY-MM-DD za dati broj dana i godina (kalendarski, bez vremenskih zona). */
export function shiftDateOnly(dateOnly: string, { days = 0, years = 0 }: { days?: number; years?: number }): string {
    const [year, month, day] = dateOnly.split("-").map(Number);
    const shifted = new Date(Date.UTC(year + years, month - 1, day + days));
    return shifted.toISOString().slice(0, 10);
}

// ── Vizuelni PIN ───────────────────────────────────────────────────────────────

/**
 * Vizuelni PIN u kanonskom obliku ("dog,pizza,car,pepsi"): po jedna sličica iz
 * svake kategorije, redom kojim su kategorije navedene u lib/visualPinData.ts.
 * Vraća `null` ako vrednost nije ispravan PIN.
 */
export function normalizeVisualPin(value: unknown): string | null {
    if (typeof value !== "string" || value.length > 200) return null;
    const ids = value.split(",").map((id) => id.trim());
    if (ids.length !== VISUAL_PIN_CATEGORIES.length) return null;
    const valid = VISUAL_PIN_CATEGORIES.every((category, index) =>
        category.items.some((item) => item.id === ids[index])
    );
    return valid ? ids.join(",") : null;
}

export function isValidVisualPin(value: unknown): value is string {
    return normalizeVisualPin(value) !== null;
}
