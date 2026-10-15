// Sitne pomoćne funkcije koje dele sve igre.

/** Nepristrasno mešanje (Fisher–Yates). Vraća novi niz; original ostaje netaknut. */
export function shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

const GENDER_PAIR = /\{([^{}|]*)\|([^{}|]*)\}/g;

/**
 * Razrešava parove `{muški|ženski}` u tekstu:
 * genderText("Dobi{o|la} si poklon", true) → "Dobila si poklon".
 * Bilo koja strana para sme da bude prazna, npr. `{|a}`.
 */
export function genderText(text: string, female: boolean): string {
    return text.replace(GENDER_PAIR, (_pair, male: string, femaleForm: string) => (female ? femaleForm : male));
}

/** Da li se detetu obraćamo u ženskom rodu (`gender` iz profila deteta). */
export function isFemale(gender?: string): boolean {
    return gender?.toLowerCase() === "female";
}

// ── Izbori i pomoć ────────────────────────────────────────────────────────────

/**
 * Indeksi izbora koji se nude kad dete sme da vidi najviše `limit` izbora.
 * Ostaju svi izbori koji pomažu a staju, i uvek bar jedan koji manje pomaže.
 */
export function offeredOptions(source: { options: readonly unknown[]; acceptable: readonly number[] }, limit: number): number[] {
    const all = source.options.map((_, i) => i);
    const size = Math.max(2, Math.min(all.length, limit));
    if (size >= all.length) return all;
    const good = all.filter((i) => source.acceptable.includes(i));
    const other = all.filter((i) => !source.acceptable.includes(i));
    const keptOther = other.slice(0, Math.max(1, size - good.length));
    const keptGood = good.slice(0, size - keptOther.length);
    return [...keptGood, ...keptOther].sort((a, b) => a - b);
}

/**
 * Pomoć (isticanje odgovora) stiže posle onoliko promašaja koliko je roditelj podesio
 * (`hintAfter`, 0 = nikad), a najkasnije kad su svi ponuđeni promašaji već probani.
 */
export function hintDue(hintAfter: number, missCount: number, missesOffered: number): boolean {
    return hintAfter > 0 && missCount >= Math.min(hintAfter, missesOffered);
}

// ── Stanje sa monitora ────────────────────────────────────────────────────────
// Monitor dobija delimično ili zastarelo stanje, pa se svaka vrednost proverava pre crtanja.

/** Konačan broj ili `fallback`. */
export function finiteOr(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Ceo nenegativan broj (brojači, poeni) ili `fallback`. */
export function toCount(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

/** Različiti celi indeksi iz opsega 0…size−1, redom kojim su stigli. */
export function toIndexList(value: unknown, size: number): number[] {
    if (!Array.isArray(value)) return [];
    const valid = value.filter((v): v is number => Number.isInteger(v) && v >= 0 && v < size);
    return Array.from(new Set(valid));
}

/**
 * Koliko zadataka na početku nivoa je „pokazano” rukom (DemoHand) i zato se ne ocenjuje:
 * prvi zadatak prvog nivoa, ako nivo ima još bar jedan zadatak.
 */
export function demoRounds(level: number, totalRounds: number): number {
    return level === 1 && totalRounds > 1 ? 1 : 0;
}
