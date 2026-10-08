// lib/childSettings.ts
// Podešavanja po detetu: šta dete vidi, čuje i koliko pomoći dobija.
// Podrazumevane vrednosti zavise od uzrasta (videti docs/istrazivanje.md), a
// roditelj ili terapeut može da promeni svaku. Modul je čist (radi i na serveru).

export type AgeBand = "young" | "middle" | "older";
export type Script = "latin" | "cyrillic";
export type MoodCheck = "off" | "three";
/** Posle koliko grešaka se tačan odgovor blago istakne; 0 = bez isticanja */
export type HintAfter = 0 | 1 | 2;

export interface ChildSettings {
    /** Uzrasna grupa: određuje složenost zadataka. null = prema datumu rođenja */
    band: AgeBand | null;
    script: Script;
    /** SVA SLOVA VELIKA — za decu koja tek uče slova */
    uppercase: boolean;
    /** Glas koji čita uputstva */
    voice: boolean;
    /** Kratki zvučni efekti (dodir, tačno) */
    effects: boolean;
    /** Zvuci u igri „Slušaj i spoji” */
    gameSounds: boolean;
    /** Nagli i glasni zvuci: sirena, grmljavina, lavež, zvono */
    loudSounds: boolean;
    /** 0.2–1 */
    volume: number;
    /** Manje animacija (dodatno uz sistemsko podešavanje) */
    reduceMotion: boolean;
    /** 3D učitelj na početnom ekranu */
    avatar: boolean;
    /** Najviše ponuđenih odgovora; 0 = prema uzrastu */
    maxChoices: 0 | 2 | 3 | 4 | 6;
    hintAfter: HintAfter;
    /** Dnevno ograničenje igre u minutima; 0 = bez ograničenja */
    sessionMinutes: 0 | 10 | 15 | 20 | 30;
    moodCheck: MoodCheck;
}

export interface BandPreset {
    label: string;
    ages: string;
    maxChoices: 2 | 3 | 4 | 6;
    memoryMaxPairs: number;
    /** Koliko emocija se nudi: srećno, tužno, ljuto → + uplašeno, iznenađeno → + ponosno */
    emotionCount: 3 | 5 | 6;
    maxRounds: number;
    /** Poeni i brojevi se prikazuju detetu (mlađoj deci brojevi ne znače mnogo) */
    showPoints: boolean;
}

export const BAND_PRESETS: Record<AgeBand, BandPreset> = {
    young: { label: "Mlađi", ages: "3–4 godine", maxChoices: 3, memoryMaxPairs: 4, emotionCount: 3, maxRounds: 5, showPoints: false },
    middle: { label: "Srednji", ages: "5–6 godina", maxChoices: 4, memoryMaxPairs: 6, emotionCount: 5, maxRounds: 6, showPoints: false },
    older: { label: "Stariji", ages: "7–8 godina", maxChoices: 6, memoryMaxPairs: 10, emotionCount: 6, maxRounds: 8, showPoints: true },
};

export const AGE_BANDS: AgeBand[] = ["young", "middle", "older"];

/** Navršene godine na današnji dan; null ako datum nije poznat ili ispravan. */
export function ageInYears(dateOfBirth: string | null | undefined, now: Date = new Date()): number | null {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    if (Number.isNaN(birth.getTime())) return null;
    let years = now.getFullYear() - birth.getFullYear();
    const hadBirthday =
        now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
    if (!hadBirthday) years -= 1;
    return years >= 0 ? years : null;
}

export function bandForAge(age: number | null): AgeBand {
    if (age === null) return "middle";
    if (age <= 4) return "young";
    if (age <= 6) return "middle";
    return "older";
}

/** Preporučena podešavanja za uzrasnu grupu. */
export function defaultSettings(band: AgeBand): ChildSettings {
    return {
        band: null,
        // Latinica ostaje podrazumevana kao do sada; u Srbiji se prvo uči ćirilica, pa roditelj bira pismo
        script: "latin",
        uppercase: band !== "older",
        voice: true,
        effects: true,
        gameSounds: true,
        loudSounds: false,
        volume: 0.7,
        reduceMotion: false,
        avatar: true,
        maxChoices: 0,
        hintAfter: band === "young" ? 1 : 2,
        sessionMinutes: band === "young" ? 10 : band === "middle" ? 15 : 20,
        // Deca mlađa od ~5–6 godina ne mogu pouzdano da ocene svoje raspoloženje na skali
        moodCheck: band === "young" ? "off" : "three",
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
    return (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback;
}

/**
 * Čisti sačuvana podešavanja: nepoznata polja se odbacuju, neispravne vrednosti
 * zamenjuju preporukom za uzrast. Bezbedno za podatke iz baze i iz zahteva.
 */
export function sanitizeSettings(raw: unknown, ageBand: AgeBand): ChildSettings {
    const source = isRecord(raw) ? raw : {};
    const band = pick<AgeBand | null>(source.band, [...AGE_BANDS, null], null);
    const base = defaultSettings(band ?? ageBand);
    const volume = typeof source.volume === "number" && Number.isFinite(source.volume) ? source.volume : base.volume;
    return {
        band,
        script: pick<Script>(source.script, ["latin", "cyrillic"], base.script),
        uppercase: bool(source.uppercase, base.uppercase),
        voice: bool(source.voice, base.voice),
        effects: bool(source.effects, base.effects),
        gameSounds: bool(source.gameSounds, base.gameSounds),
        loudSounds: bool(source.loudSounds, base.loudSounds),
        volume: Math.min(1, Math.max(0.2, Math.round(volume * 10) / 10)),
        reduceMotion: bool(source.reduceMotion, base.reduceMotion),
        avatar: bool(source.avatar, base.avatar),
        maxChoices: pick<ChildSettings["maxChoices"]>(source.maxChoices, [0, 2, 3, 4, 6], base.maxChoices),
        hintAfter: pick<HintAfter>(source.hintAfter, [0, 1, 2], base.hintAfter),
        sessionMinutes: pick<ChildSettings["sessionMinutes"]>(source.sessionMinutes, [0, 10, 15, 20, 30], base.sessionMinutes),
        moodCheck: pick<MoodCheck>(source.moodCheck, ["off", "three"], base.moodCheck),
    };
}

/** Podešavanja spremna za igru: uz sirova podešavanja nosi i izvedene granice za uzrast. */
export interface ResolvedSettings extends ChildSettings {
    activeBand: AgeBand;
    preset: BandPreset;
    /** Najviše ponuđenih odgovora posle primene uzrasta i izbora roditelja */
    choiceLimit: number;
}

export function resolveSettings(raw: unknown, dateOfBirth: string | null | undefined): ResolvedSettings {
    const ageBand = bandForAge(ageInYears(dateOfBirth));
    const settings = sanitizeSettings(raw, ageBand);
    const activeBand = settings.band ?? ageBand;
    const preset = BAND_PRESETS[activeBand];
    return {
        ...settings,
        activeBand,
        preset,
        choiceLimit: settings.maxChoices === 0 ? preset.maxChoices : settings.maxChoices,
    };
}

/** Kada podešavanja nisu poznata (npr. prikaz za roditelja ili probni režim). */
export const FALLBACK_SETTINGS: ResolvedSettings = resolveSettings(null, null);
