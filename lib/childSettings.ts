// lib/childSettings.ts
// Podešavanja po detetu: šta dete vidi, čuje i koliko pomoći dobija.
// Podrazumevane vrednosti zavise od uzrasta (videti docs/istrazivanje.md), a
// roditelj ili terapeut može da promeni svaku. Modul je čist (radi i na serveru).

import { GAMES, type GameId } from "./games";

/** Najviše igara u dnevnom planu „prvo–zatim” */
export const MAX_PLAN_GAMES = 4;

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
    /** Učitelj (crtani lik) na početnom ekranu i u igrama */
    avatar: boolean;
    /** Najviše ponuđenih odgovora; 0 = prema uzrastu */
    maxChoices: 0 | 2 | 3 | 4 | 6;
    hintAfter: HintAfter;
    /**
     * Pomoć posle čekanja: kad dete dugo ništa ne dodirne, tačan odgovor blago zasvetli —
     * pre greške, a ne posle nje (učenje bez grešaka, „pomoć sa odlaganjem”)
     */
    waitHint: boolean;
    /** Dnevno ograničenje igre u minutima; 0 = bez ograničenja */
    sessionMinutes: 0 | 10 | 15 | 20 | 30;
    moodCheck: MoodCheck;
    /**
     * Dnevni plan „prvo–zatim”: igre redom kojim ih dete igra. Prazno = dete bira samo.
     * Vizuelni raspored čini igru predvidljivom: šta radim, koliko i šta je posle.
     */
    plan: GameId[];
    /**
     * Igre koje roditelj nije uključio (dete ih ne vidi). Čuva se spisak ISKLJUČENIH, a ne
     * uključenih: igra dodata kasnije je tako podrazumevano dostupna. Prazno = sve igre.
     */
    disabledGames: GameId[];
    /**
     * „Otključavanje redom”: igre se otvaraju jedna za drugom, redom učenja za uzrast
     * deteta — sledeća kad dete završi 3. nivo prethodne (videti lib/gameAccess.ts).
     */
    unlockInOrder: boolean;
    /**
     * „Sve mape otvorene (bez ključeva)”: sve mape igara su otvorene, bez kapija i zvezdica za
     * ključ (videti lib/gameWorlds.ts) — za decu kojoj katanci i čekanje stvaraju nemir.
     */
    openAllMaps: boolean;
    /** Blag dnevni podsetnik na početnom ekranu (bez obaveštenja i mejlova) */
    reminder: ReminderSettings;
    /**
     * „Ulog u dvoboju”: koliko novčića dete daje pobedniku kad izgubi dvoboj sa drugom
     * (lib/duelStakes.ts). 0 = bez prenosa, samo ime pobednika. Ujedno je i gornja granica
     * onoga što dete može da izgubi (sa drugom iz druge porodice važi manji od dva uloga).
     */
    duelStake: 0 | 3 | 5;
}

/** Dani u nedelji kao u ISO kalendaru: 1 = ponedeljak … 7 = nedelja */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export interface ReminderSettings {
    /** Podrazumevano isključeno */
    enabled: boolean;
    /** Vreme dana „HH:MM” (Beograd) posle kog se podsetnik prikazuje ako dete danas nije igralo */
    time: string;
    /** Dani u kojima važi; prazno se ne čuva (tada podsetnik ne bi imao smisla) */
    days: Weekday[];
}

export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, time: "17:00", days: [...WEEKDAYS] };

export interface BandPreset {
    label: string;
    ages: string;
    maxChoices: 2 | 3 | 4 | 6;
    memoryMaxPairs: number;
    /** Koliko emocija se nudi: srećno, tužno, ljuto → + uplašeno, iznenađeno → + ponosno */
    /**
     * Koliko osećanja dete upoznaje u igri „Emocije”. Najmlađi imaju četiri: prvih pet nivoa
     * su srećno, tužno i ljuto, a od šestog dolazi i „uplašeno” — da i oni dalje napreduju.
     */
    emotionCount: 4 | 5 | 6;
    maxRounds: number;
    /** Poeni i brojevi se prikazuju detetu (mlađoj deci brojevi ne znače mnogo) */
    showPoints: boolean;
}

export const BAND_PRESETS: Record<AgeBand, BandPreset> = {
    young: { label: "Mlađi", ages: "3–4 godine", maxChoices: 3, memoryMaxPairs: 4, emotionCount: 4, maxRounds: 5, showPoints: false },
    middle: { label: "Srednji", ages: "5–6 godina", maxChoices: 4, memoryMaxPairs: 6, emotionCount: 5, maxRounds: 6, showPoints: false },
    older: { label: "Stariji", ages: "7–10 godina", maxChoices: 6, memoryMaxPairs: 10, emotionCount: 6, maxRounds: 8, showPoints: true },
};

export const AGE_BANDS: AgeBand[] = ["young", "middle", "older"];

/** Kalendar po kome se računa uzrast — isti na serveru i na uređaju, ma gde se nalazili */
const AGE_TIME_ZONE = "Europe/Belgrade";

function calendarDate(date: Date): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: AGE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return { year: part("year"), month: part("month"), day: part("day") };
}

/**
 * Navršene godine na današnji dan; null ako datum nije poznat ili ispravan.
 * Datum rođenja je kalendarski datum (YYYY-MM-DD), pa se poredi sa današnjim kalendarskim
 * datumom, a ne kao trenutak u vremenu — inače bi dete u nekim vremenskim zonama
 * „napunilo” godinu dan ranije ili kasnije.
 */
export function ageInYears(dateOfBirth: string | null | undefined, now: Date = new Date()): number | null {
    const match = dateOfBirth ? /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth) : null;
    if (!match) return null;
    const [birthYear, birthMonth, birthDay] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) return null;

    const today = calendarDate(now);
    let years = today.year - birthYear;
    const hadBirthday = today.month > birthMonth || (today.month === birthMonth && today.day >= birthDay);
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
        waitHint: band === "young",
        sessionMinutes: band === "young" ? 10 : band === "middle" ? 15 : 20,
        // Deca mlađa od ~5–6 godina ne mogu pouzdano da ocene svoje raspoloženje na skali
        moodCheck: band === "young" ? "off" : "three",
        plan: [],
        disabledGames: [],
        unlockInOrder: false,
        openAllMaps: false,
        reminder: { ...DEFAULT_REMINDER, days: [...DEFAULT_REMINDER.days] },
        // Mali ulog (lib/duelStakes.ts: DUEL_STAKE); roditelj bira 0, 3 ili 5
        duelStake: 3,
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick<T>(value: unknown, allowed: readonly T[], fallback: T): T {
    return (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function sanitizePlan(value: unknown): GameId[] {
    if (!Array.isArray(value)) return [];
    const valid = new Set<string>(GAMES.map((g) => g.id));
    const plan: GameId[] = [];
    for (const item of value) {
        if (typeof item === "string" && valid.has(item) && !plan.includes(item as GameId)) plan.push(item as GameId);
        if (plan.length === MAX_PLAN_GAMES) break;
    }
    return plan;
}

/** Isključene igre: samo poznate, bez ponavljanja. Ako bi bile isključene sve, ne isključuje se nijedna. */
function sanitizeDisabledGames(value: unknown): GameId[] {
    if (!Array.isArray(value)) return [];
    const valid = new Set<string>(GAMES.map((g) => g.id));
    const disabled: GameId[] = [];
    for (const item of value) {
        if (typeof item === "string" && valid.has(item) && !disabled.includes(item as GameId)) disabled.push(item as GameId);
    }
    return disabled.length >= GAMES.length ? [] : disabled;
}

const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/;

function sanitizeReminder(value: unknown): ReminderSettings {
    const source = isRecord(value) ? value : {};
    const days = Array.isArray(source.days)
        ? WEEKDAYS.filter((day) => (source.days as unknown[]).includes(day))
        : [...DEFAULT_REMINDER.days];
    return {
        enabled: bool(source.enabled, DEFAULT_REMINDER.enabled) && days.length > 0,
        time: typeof source.time === "string" && TIME_OF_DAY.test(source.time) ? source.time : DEFAULT_REMINDER.time,
        days: days.length > 0 ? days : [...DEFAULT_REMINDER.days],
    };
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
        waitHint: bool(source.waitHint, base.waitHint),
        sessionMinutes: pick<ChildSettings["sessionMinutes"]>(source.sessionMinutes, [0, 10, 15, 20, 30], base.sessionMinutes),
        moodCheck: pick<MoodCheck>(source.moodCheck, ["off", "three"], base.moodCheck),
        // Isključena igra ne može biti u planu: plan bi inače čekao igru koju dete ne vidi
        ...withoutDisabledInPlan(sanitizePlan(source.plan), sanitizeDisabledGames(source.disabledGames)),
        unlockInOrder: bool(source.unlockInOrder, base.unlockInOrder),
        openAllMaps: bool(source.openAllMaps, base.openAllMaps),
        reminder: sanitizeReminder(source.reminder),
        duelStake: pick<ChildSettings["duelStake"]>(source.duelStake, [0, 3, 5], base.duelStake),
    };
}

function withoutDisabledInPlan(plan: GameId[], disabledGames: GameId[]): { plan: GameId[]; disabledGames: GameId[] } {
    return { plan: plan.filter((id) => !disabledGames.includes(id)), disabledGames };
}

/**
 * Samo ono što je odrasli zaista promenio u odnosu na preporuku za uzrast. Čuva se ovo,
 * a ne ceo objekat — inače bi se preporuke „zamrzle” pri prvom čuvanju i ne bi pratile
 * dete kako raste (npr. velika slova, dnevno vreme igre).
 */
export function settingsOverrides(settings: ChildSettings, ageBand: AgeBand): Partial<ChildSettings> {
    const base = defaultSettings(settings.band ?? ageBand);
    const overrides: Partial<Record<keyof ChildSettings, unknown>> = {};
    for (const key of Object.keys(settings) as (keyof ChildSettings)[]) {
        const value = settings[key];
        // Nizovi i objekti (plan, isključene igre, podsetnik) se porede po sadržaju
        const same = typeof value === "object" && value !== null ? JSON.stringify(value) === JSON.stringify(base[key]) : value === base[key];
        if (!same) overrides[key] = settings[key];
    }
    return overrides as Partial<ChildSettings>;
}

/** Podešavanja spremna za igru: uz sirova podešavanja nosi i izvedene granice za uzrast. */
export interface ResolvedSettings extends ChildSettings {
    activeBand: AgeBand;
    preset: BandPreset;
    /** Najviše ponuđenih odgovora posle primene uzrasta i izbora roditelja */
    choiceLimit: number;
    /**
     * Uzrast po kome se ređaju igre: navršene godine, ali u granicama uzrasne grupe koju je
     * roditelj izabrao (dete od 7 godina u grupi „Mlađi” dobija igre kao dete od 4).
     * null = uzrast nije poznat i grupa nije izabrana.
     */
    playAge: number | null;
}

/** Granice uzrasnih grupa u godinama (isto kao u `bandForAge` i `BAND_PRESETS`). */
const BAND_AGES: Record<AgeBand, { min: number; max: number }> = {
    young: { min: 3, max: 4 },
    middle: { min: 5, max: 6 },
    older: { min: 7, max: 10 },
};

/** Uzrast za redosled igara: godine deteta, svedene na izabranu grupu kad je roditelj izabrao drugu. */
export function playAgeFor(age: number | null, band: AgeBand | null): number | null {
    if (!band) return age;
    const range = BAND_AGES[band];
    if (age === null) return range.min;
    return Math.min(Math.max(age, range.min), range.max);
}

export function resolveSettings(raw: unknown, dateOfBirth: string | null | undefined): ResolvedSettings {
    const age = ageInYears(dateOfBirth);
    const ageBand = bandForAge(age);
    const settings = sanitizeSettings(raw, ageBand);
    const activeBand = settings.band ?? ageBand;
    const preset = BAND_PRESETS[activeBand];
    return {
        ...settings,
        activeBand,
        preset,
        choiceLimit: settings.maxChoices === 0 ? preset.maxChoices : settings.maxChoices,
        playAge: playAgeFor(age, settings.band),
    };
}

/** Kada podešavanja nisu poznata (npr. prikaz za roditelja ili probni režim). */
export const FALLBACK_SETTINGS: ResolvedSettings = resolveSettings(null, null);
