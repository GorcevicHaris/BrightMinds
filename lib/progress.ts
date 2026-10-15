// lib/progress.ts
// Statistika napretka: zajednički tipovi za API (/api/children/[id]/progress) i
// ProgressDashboard, plus čista funkcija koja redove iz `progress_logs` (i posete iz
// `play_sessions`) pretvara u odgovor.
//
// VREMENSKA ZONA: svi "dani" (aktivni dani, grafikon za 30 dana) računaju se u zoni
// Europe/Belgrade, bez obzira na zonu servera ili pregledača. Ranije su se datumi
// poredili kao UTC ISO stringovi, pa je igra odigrana uveče mogla da "pređe" u pogrešan dan.
import {
    ADVANCE_RATIO,
    GAMES,
    LEVELS_PER_TIER,
    MAX_LEVEL,
    MOODS,
    getGameByActivityId,
    starsFor,
    successLevelFor,
    type GameId,
    type Mood,
    type SuccessLevel,
} from "./games";
import { APP_TIME_ZONE, dateOnlyInTimeZone, isRecord, shiftDateOnly } from "./validation";

export const PROGRESS_TIME_ZONE = APP_TIME_ZONE;
/** Koliko dana unazad pokriva `daily` (uključujući današnji dan). */
export const ACTIVITY_WINDOW_DAYS = 30;
/** Koliko poslednjih igara ukupno vraća `recentSessions`. */
export const RECENT_SESSIONS_LIMIT = 30;
/** Za svaku igru posebno garantujemo bar ovoliko poslednjih sesija (zbog filtera po igri). */
const RECENT_SESSIONS_PER_GAME = 10;

// ── Savladanost ───────────────────────────────────────────────────────────────
// Zvezdice su nagrada za dete; savladanost je pomoć odraslom pri odluci šta dalje.
// Kriterijum ispod (bar 80% SAMOSTALNO tačnih odgovora u 3 uzastopne partije koje nisu
// sve odigrane istog dana) je uobičajena klinička konvencija, a ne dokazani optimum:
// služi kao orijentir, a odluku o sledećem koraku donosi odrasla osoba.

/** Najmanji udeo samostalno tačnih odgovora u partiji da bi se računala u savladanost. */
export const MASTERY_RATIO = 0.8;
/** Koliko poslednjih partija (sa brojem odgovora, na trenutnoj težini) mora da ispuni `MASTERY_RATIO`. */
export const MASTERY_SESSIONS = 3;
/** Na koliko najmanje različitih kalendarskih dana (zona `PROGRESS_TIME_ZONE`) te partije moraju pasti. */
export const MASTERY_MIN_DAYS = 2;
/** `needsSupport`: toliko poslednjih partija zaredom je ispod `SUPPORT_RATIO`. */
export const SUPPORT_SESSIONS = 3;
/** Isti prag ispod kog igra ne predlaže sledeći nivo. */
export const SUPPORT_RATIO = ADVANCE_RATIO;
/** Koliko poslednjih partija (sa brojem odgovora) ulazi u `trend`. */
export const TREND_SESSIONS = 10;

// ── Tipovi odgovora ───────────────────────────────────────────────────────────

export type Stars = 0 | 1 | 2 | 3;
export type TierId = "easy" | "medium" | "hard";

export interface Tier {
    id: TierId;
    label: string;
    /** Prvi i poslednji nivo u težini (uključivo) */
    from: number;
    to: number;
}

export type SuccessDistribution = Record<SuccessLevel, number>;
export type MoodCounts = Record<Mood, number>;

/**
 * Lica koja je dete samo izabralo pre i posle igre. Namerno samo raspodela izbora:
 * kod male dece skala sa licima nije pouzdano merenje, pa se pre i posle ne porede
 * i ništa se ne tumači kao ishod igre. Kraća skala (tri lica) koristi podskup istih vrednosti.
 *
 * Broji se jedan izbor po POSETI (`play_sessions`), ma koliko nivoa dete u njoj odigralo;
 * u zbiru po igri poseta se broji jednom za svaku igru igranu u toj poseti. Stariji zapisi
 * bez posete nose izbor uz svaku partiju i broje se po partiji, kao i ranije.
 */
export interface MoodChoices {
    before: MoodCounts;
    after: MoodCounts;
}

/**
 * Savladanost trenutne težine igre (videti konstante `MASTERY_*`):
 *  • "mastered"    — poslednjih `MASTERY_SESSIONS` partija sa brojem odgovora na trenutnoj težini
 *                    palo je na bar `MASTERY_MIN_DAYS` različita dana i svaka ima bar
 *                    `MASTERY_RATIO` samostalno tačnih;
 *  • "progressing" — igra ima partije sa brojem odgovora, ali kriterijum (još) nije ispunjen;
 *  • "not_started" — nema nijedne partije sa brojem odgovora.
 */
/** "ungraded": igra bez pogrešnih odgovora (osećanja) — savladanost se ne procenjuje */
export type MasteryStatus = "mastered" | "progressing" | "not_started" | "ungraded";

export interface TrendPoint {
    /** Dan u zoni `PROGRESS_TIME_ZONE`, format YYYY-MM-DD */
    date: string;
    /** 0–1 */
    independentRatio: number;
    /** 0–1, `null` kada pomoć nije beležena */
    promptedRatio: number | null;
    level: number | null;
}

/** Zbirni brojevi — isti oblik za sve igre zajedno i za svaku igru posebno. */
export interface ProgressSummary {
    plays: number;
    totalMinutes: number;
    totalStars: number;
    /** 0–3, `null` dok nema odigranih igara */
    averageStars: number | null;
    /** Broj različitih dana sa bar jednom igrom (od početka) */
    activeDays: number;
    /** Isto, ali samo u poslednjih `ACTIVITY_WINDOW_DAYS` dana (neutralan broj dana, ne niz koji se „čuva”) */
    daysPlayed30d: number;
    /**
     * Udeo zadataka rešenih samostalno iz prvog pokušaja (0–1) u partijama iz poslednjih
     * `ACTIVITY_WINDOW_DAYS` dana koje imaju broj odgovora; `null` kada takvih partija nema.
     */
    independentRate30d: number | null;
    /**
     * Udeo zadataka rešenih tek uz pomoć, nad ISTIM zadacima kao `independentRate30d`
     * (zato zbir nikad ne prelazi 1). `null` dok pomoć nije zabeležena ni u jednoj od tih
     * partija; partije bez tog podatka ne doprinose brojiocu, pa je udeo tada donja granica.
     */
    promptedRate30d: number | null;
    /** ISO 8601 (UTC) */
    lastPlayedAt: string | null;
}

export interface ProgressTotals extends ProgressSummary {
    /** Koliko različitih igara je dete probalo */
    gamesTried: number;
    /** Zbir najviših završenih nivoa po igrama */
    levelsCompleted: number;
    /** Ukupan broj nivoa u svim igrama */
    levelsAvailable: number;
}

export interface GameProgress extends ProgressSummary {
    gameId: GameId;
    activityId: number;
    bestScore: number | null;
    /**
     * 0–15; nivo je završen po istom pravilu po kom se otključava sledeći: bar `ADVANCE_RATIO`
     * samostalno tačnih, a za starije zapise bez broja odgovora bar jedna zvezdica.
     */
    highestLevelCompleted: number;
    /** Nivo na kome je dete sada (sledeći posle najvišeg završenog, najviše 15) */
    currentLevel: number;
    /** Težina kojoj pripada `currentLevel` */
    tier: TierId;
    success: SuccessDistribution;
    mood: MoodChoices;
    /** Odnosi se na težinu `tier` */
    mastery: MasteryStatus;
    /** Poslednjih `SUPPORT_SESSIONS` partija sa brojem odgovora sve su ispod `SUPPORT_RATIO` samostalno tačnih */
    needsSupport: boolean;
    /** Do `TREND_SESSIONS` poslednjih partija sa brojem odgovora, od najstarije ka najnovijoj */
    trend: TrendPoint[];
}

export interface DailyGameActivity {
    plays: number;
    /** Zaokruženo na jednu decimalu */
    minutes: number;
}

export interface DailyActivity extends DailyGameActivity {
    /** Dan u zoni `PROGRESS_TIME_ZONE`, format YYYY-MM-DD */
    date: string;
    /** Samo igre koje su igrane tog dana */
    games: Partial<Record<GameId, DailyGameActivity>>;
}

export interface ProgressSession {
    id: number;
    gameId: GameId;
    level: number | null;
    stars: Stars;
    score: number | null;
    /** Zadaci rešeni samostalno iz prvog pokušaja; `null` (kao i `totalCount`) za zapise bez broja odgovora */
    independentCount: number | null;
    /** Zadaci rešeni tek pošto je igra istakla odgovor; `null` kada to nije beleženo */
    promptedCount: number | null;
    totalCount: number | null;
    /** `independentCount / totalCount` (0–1) */
    independentRatio: number | null;
    durationSeconds: number | null;
    moodBefore: Mood | null;
    moodAfter: Mood | null;
    /** ISO 8601 (UTC) */
    completedAt: string;
}

export interface ProgressResponse {
    /** ISO 8601 (UTC) */
    generatedAt: string;
    /** Zona u kojoj su računati dani — koristi je i UI za prikaz datuma */
    timeZone: string;
    windowDays: number;
    totals: ProgressTotals;
    /** Po jedna stavka za svaku igru iz lib/games.ts, istim redosledom (i kad nije igrana) */
    games: GameProgress[];
    /** Tačno `windowDays` stavki, od najstarijeg dana do danas */
    daily: DailyActivity[];
    /** Najnovije prvo: poslednjih 30 igara ukupno + do 10 poslednjih za svaku igru */
    recentSessions: ProgressSession[];
    mood: MoodChoices;
}

// ── Težine ────────────────────────────────────────────────────────────────────

export const TIERS: Tier[] = [
    { id: "easy", label: "Lako", from: 1, to: LEVELS_PER_TIER },
    { id: "medium", label: "Srednje", from: LEVELS_PER_TIER + 1, to: LEVELS_PER_TIER * 2 },
    { id: "hard", label: "Teško", from: LEVELS_PER_TIER * 2 + 1, to: MAX_LEVEL },
];

export function tierForLevel(level: number): Tier {
    return TIERS.find((tier) => level <= tier.to) ?? TIERS[TIERS.length - 1];
}

// ── Dani ──────────────────────────────────────────────────────────────────────

/** `Date` za prikaz ključa dana: podne po UTC, formatirati sa `timeZone: "UTC"`. */
export function dayKeyToDate(key: string): Date {
    return new Date(`${key}T12:00:00Z`);
}

// ── Čitanje reda iz baze ──────────────────────────────────────────────────────

interface NormalizedLog {
    id: number;
    gameId: GameId;
    completedAtMs: number;
    day: string;
    level: number | null;
    stars: Stars;
    successLevel: SuccessLevel;
    score: number | null;
    /** `null` kada zapis nema upotrebljiv broj odgovora */
    counts: RoundCounts | null;
    /** Da li partija računa nivo kao završen */
    passed: boolean;
    durationSeconds: number | null;
    /** Poseta čije raspoloženje partija deli; `null` za zapis bez (poznate) posete */
    sessionId: number | null;
    /** Raspoloženje posete ako partija pripada poseti, inače ono iz samog zapisa */
    moodBefore: Mood | null;
    moodAfter: Mood | null;
}

/** Raspoloženje jedne posete (red iz `play_sessions`). */
interface SessionMood {
    before: Mood | null;
    after: Mood | null;
}

/** Zadaci jedne partije: uvek `independent + (prompted ?? 0) <= total` i `total > 0`. */
interface RoundCounts {
    independent: number;
    prompted: number | null;
    total: number;
}

type CountedLog = NormalizedLog & { counts: RoundCounts };

const SUCCESS_STARS: Record<SuccessLevel, Stars> = { struggled: 0, partial: 1, successful: 2, excellent: 3 };

/** Stari format beleške: "Nivo 3, Zvezdice: 2, Rezultat: 150". */
const LEGACY_NOTES = {
    level: /\bNivo\s+(\d{1,2})\b/i,
    stars: /\bZvezdice:\s*([0-3])\b/i,
    score: /\bRezultat:\s*(\d{1,9})\b/i,
};

function toNumber(value: unknown): number | null {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function toCount(value: unknown): number | null {
    const parsed = toNumber(value);
    return parsed !== null && parsed >= 0 ? Math.round(parsed) : null;
}

function fromNotes(notes: string | null, pattern: RegExp): number | null {
    const match = notes?.match(pattern);
    return match ? Number(match[1]) : null;
}

function isStars(value: number | null): value is Stars {
    return value === 0 || value === 1 || value === 2 || value === 3;
}

function toLevel(value: number | null): number | null {
    return value !== null && value >= 1 && value <= MAX_LEVEL ? value : null;
}

function isSuccessLevel(value: unknown): value is SuccessLevel {
    return typeof value === "string" && value in SUCCESS_STARS;
}

function toMood(value: unknown): Mood | null {
    return MOODS.find((mood) => mood.value === value)?.value ?? null;
}

/**
 * Vreme iz baze u milisekunde. Kolona može biti `timestamp` bez zone (tada Postgres
 * vraća "2025-01-01T12:00:00" — tumačimo ga kao UTC, što je podrazumevano na Supabase-u)
 * ili `timestamptz` (sa oznakom zone).
 */
function parseTimestamp(value: unknown): number | null {
    if (typeof value !== "string" || value === "") return null;
    // Postgres ume da ispiše zonu samo satima ("+00"); JavaScript traži i minute ("+00:00")
    const iso = value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
    const hasZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(iso);
    const ms = Date.parse(hasZone ? iso : `${iso}Z`);
    return Number.isNaN(ms) ? null : ms;
}

/**
 * Broj odgovora iz kolona `correct_count` (samostalno, iz prvog pokušaja), `prompted_count`
 * (tek uz pomoć; kolona može i da ne postoji) i `total_count`. Vrednosti se svode na
 * moguće granice da jedan neispravan red ne bi dao udeo veći od 100%.
 */
function toRoundCounts(row: Record<string, unknown>): RoundCounts | null {
    const correct = toCount(row.correct_count);
    const total = toCount(row.total_count);
    if (correct === null || total === null || total === 0) return null;

    const independent = Math.min(correct, total);
    const prompted = toCount(row.prompted_count);
    return { independent, prompted: prompted === null ? null : Math.min(prompted, total - independent), total };
}

/** Posete po ID-ju; redovi bez upotrebljivog ID-ja se preskaču. */
function indexSessions(sessions: readonly unknown[]): Map<number, SessionMood> {
    const byId = new Map<number, SessionMood>();
    for (const row of sessions) {
        if (!isRecord(row)) continue;
        const id = toNumber(row.id);
        if (id !== null) byId.set(id, { before: toMood(row.mood_before), after: toMood(row.mood_after) });
    }
    return byId;
}

/**
 * Jedan red iz `progress_logs`. Nove kolone (level, stars, score, correct_count,
 * total_count, prompted_count, duration_seconds) imaju prednost; ako ih nema u bazi ili
 * su prazne, vrednosti se čitaju iz stare beleške, a zvezdice i iz `success_level`.
 * Raspoloženje dolazi iz posete (`session_id`) kada je ona poznata, inače iz samog zapisa.
 * Vraća `null` za red koji ne pripada nijednoj igri ili nema upotrebljiv datum/rezultat.
 */
function normalizeLog(row: unknown, sessions: ReadonlyMap<number, SessionMood>): NormalizedLog | null {
    if (!isRecord(row)) return null;

    const id = toNumber(row.id);
    const game = getGameByActivityId(toNumber(row.activity_id) ?? -1);
    const completedAtMs = parseTimestamp(row.completed_at);
    if (id === null || !game || completedAtMs === null) return null;

    const notes = typeof row.notes === "string" ? row.notes : null;
    const counts = toRoundCounts(row);

    const starsColumn = toCount(row.stars);
    const starsNote = fromNotes(notes, LEGACY_NOTES.stars);
    let stars: Stars;
    if (isStars(starsColumn)) stars = starsColumn;
    else if (isStars(starsNote)) stars = starsNote;
    else if (isSuccessLevel(row.success_level)) stars = SUCCESS_STARS[row.success_level];
    else if (counts) stars = starsFor(counts.independent, counts.total);
    else return null;

    const level = toLevel(toCount(row.level)) ?? toLevel(fromNotes(notes, LEGACY_NOTES.level));
    const durationSeconds = toCount(row.duration_seconds);
    const durationMinutes = toNumber(row.duration_minutes);

    const sessionId = toNumber(row.session_id);
    const session = sessionId === null ? undefined : sessions.get(sessionId);

    return {
        id,
        gameId: game.id,
        completedAtMs,
        day: dateOnlyInTimeZone(new Date(completedAtMs), PROGRESS_TIME_ZONE),
        level,
        stars,
        successLevel: isSuccessLevel(row.success_level) ? row.success_level : successLevelFor(stars),
        score: toCount(row.score) ?? fromNotes(notes, LEGACY_NOTES.score),
        counts,
        // Odluka sačuvana pri upisu (`progress_logs.passed`, migracija 0004) ima prednost; za zapise
        // bez nje važi isto pravilo kao pri otključavanju nivoa (`isLevelPassed` u app/api/_lib/children.ts)
        passed:
            typeof row.passed === "boolean"
                ? row.passed
                : !game.graded || (counts ? counts.independent / counts.total >= ADVANCE_RATIO : stars > 0),
        durationSeconds:
            durationSeconds ?? (durationMinutes !== null && durationMinutes >= 0 ? Math.round(durationMinutes * 60) : null),
        sessionId: session ? sessionId : null,
        // Posle naknadnog upisa uz partije (logIds) izbor može biti samo u zapisu, pa je on rezerva
        moodBefore: session?.before ?? toMood(row.mood_before),
        moodAfter: session?.after ?? toMood(row.mood_after),
    };
}

// ── Sabiranje ─────────────────────────────────────────────────────────────────

function emptyMoodCounts(): MoodCounts {
    return { very_upset: 0, upset: 0, neutral: 0, happy: 0, very_happy: 0 };
}

/** Udeo zaokružen na četiri decimale (za odgovor API-ja; pragovi se porede sa nezaokruženim vrednostima). */
function toRatio(part: number, total: number): number {
    return Math.round((part / total) * 10_000) / 10_000;
}

/** Zbir zadataka u partijama sa brojem odgovora iz poslednjih `ACTIVITY_WINDOW_DAYS` dana. */
interface WindowRounds {
    independent: number;
    prompted: number;
    /** Da li je bar jedna od tih partija imala zabeleženu pomoć */
    promptedKnown: boolean;
    total: number;
}

interface Tally {
    plays: number;
    seconds: number;
    stars: number;
    days: Set<string>;
    lastPlayedMs: number | null;
    mood: MoodChoices;
    /** Posete čiji je izbor već ubrojan u `mood` (da se poseta ne broji po partiji) */
    moodSessions: { before: Set<number>; after: Set<number> };
    rounds: WindowRounds;
}

function emptyTally(): Tally {
    return {
        plays: 0,
        seconds: 0,
        stars: 0,
        days: new Set(),
        lastPlayedMs: null,
        mood: { before: emptyMoodCounts(), after: emptyMoodCounts() },
        moodSessions: { before: new Set(), after: new Set() },
        rounds: { independent: 0, prompted: 0, promptedKnown: false, total: 0 },
    };
}

/** Jedan izbor po poseti; zapis bez posete (stariji) broji se sam za sebe. */
function countMood(counts: MoodCounts, counted: Set<number>, mood: Mood | null, sessionId: number | null): void {
    if (!mood) return;
    if (sessionId !== null) {
        if (counted.has(sessionId)) return;
        counted.add(sessionId);
    }
    counts[mood] += 1;
}

function addToTally(tally: Tally, log: NormalizedLog, inWindow: boolean): void {
    tally.plays += 1;
    tally.seconds += log.durationSeconds ?? 0;
    tally.stars += log.stars;
    tally.days.add(log.day);
    tally.lastPlayedMs = Math.max(tally.lastPlayedMs ?? 0, log.completedAtMs);

    countMood(tally.mood.before, tally.moodSessions.before, log.moodBefore, log.sessionId);
    countMood(tally.mood.after, tally.moodSessions.after, log.moodAfter, log.sessionId);

    if (inWindow && log.counts) {
        tally.rounds.independent += log.counts.independent;
        tally.rounds.total += log.counts.total;
        if (log.counts.prompted !== null) {
            tally.rounds.prompted += log.counts.prompted;
            tally.rounds.promptedKnown = true;
        }
    }
}

function summarize(tally: Tally, windowStart: string): ProgressSummary {
    let daysPlayed30d = 0;
    tally.days.forEach((day) => {
        if (day >= windowStart) daysPlayed30d += 1;
    });
    const { independent, prompted, promptedKnown, total } = tally.rounds;
    return {
        plays: tally.plays,
        totalMinutes: Math.round(tally.seconds / 60),
        totalStars: tally.stars,
        averageStars: tally.plays > 0 ? Math.round((tally.stars / tally.plays) * 100) / 100 : null,
        activeDays: tally.days.size,
        daysPlayed30d,
        independentRate30d: total > 0 ? toRatio(independent, total) : null,
        promptedRate30d: total > 0 && promptedKnown ? toRatio(prompted, total) : null,
        lastPlayedAt: tally.lastPlayedMs === null ? null : new Date(tally.lastPlayedMs).toISOString(),
    };
}

// ── Savladanost i trend ───────────────────────────────────────────────────────

const independentRatio = (log: CountedLog) => log.counts.independent / log.counts.total;

/** `counted`: partije igre sa brojem odgovora, najnovije prvo. */
function masteryFor(counted: readonly CountedLog[], tier: Tier): MasteryStatus {
    if (counted.length === 0) return "not_started";

    const recent = counted
        .filter((log) => log.level !== null && log.level >= tier.from && log.level <= tier.to)
        .slice(0, MASTERY_SESSIONS);
    const mastered =
        recent.length === MASTERY_SESSIONS &&
        recent.every((log) => independentRatio(log) >= MASTERY_RATIO) &&
        new Set(recent.map((log) => log.day)).size >= MASTERY_MIN_DAYS;
    return mastered ? "mastered" : "progressing";
}

function needsSupportFor(counted: readonly CountedLog[]): boolean {
    const recent = counted.slice(0, SUPPORT_SESSIONS);
    return recent.length === SUPPORT_SESSIONS && recent.every((log) => independentRatio(log) < SUPPORT_RATIO);
}

function trendFor(counted: readonly CountedLog[]): TrendPoint[] {
    return counted
        .slice(0, TREND_SESSIONS)
        .reverse()
        .map((log) => ({
            date: log.day,
            independentRatio: toRatio(log.counts.independent, log.counts.total),
            promptedRatio: log.counts.prompted === null ? null : toRatio(log.counts.prompted, log.counts.total),
            level: log.level,
        }));
}

interface GameTally {
    tally: Tally;
    bestScore: number | null;
    highestLevelCompleted: number;
    success: SuccessDistribution;
    /** Partije sa brojem odgovora, najnovije prvo */
    counted: CountedLog[];
    /** Koliko je sesija ove igre već obrađeno (za `recentSessions`) */
    seen: number;
}

function emptyGameTally(): GameTally {
    return {
        tally: emptyTally(),
        bestScore: null,
        highestLevelCompleted: 0,
        success: { struggled: 0, partial: 0, successful: 0, excellent: 0 },
        counted: [],
        seen: 0,
    };
}

interface DayTally {
    plays: number;
    seconds: number;
    games: Map<GameId, { plays: number; seconds: number }>;
}

/** Sekunde u minute, na jednu decimalu. */
const toMinutes = (seconds: number) => Math.round(seconds / 6) / 10;

/**
 * Pretvara sirove redove iz `progress_logs` u odgovor API-ja.
 * Čista funkcija: `now` se prosleđuje da bi rezultat bio predvidljiv.
 *
 * `sessions` su redovi iz `play_sessions` (id, mood_before, mood_after) istog deteta. Zapis
 * koji pokazuje na neku od njih (`session_id`) uzima raspoloženje iz posete i u zbiru se
 * broji jednom po poseti; bez `sessions` (ili za starije zapise) važi raspoloženje iz zapisa.
 */
export function buildProgress(
    rows: readonly unknown[],
    now: Date = new Date(),
    sessions: readonly unknown[] = []
): ProgressResponse {
    const sessionMoods = indexSessions(sessions);
    const logs = rows
        .map((row) => normalizeLog(row, sessionMoods))
        .filter((log): log is NormalizedLog => log !== null)
        .sort((a, b) => b.completedAtMs - a.completedAtMs || b.id - a.id);

    const today = dateOnlyInTimeZone(now, PROGRESS_TIME_ZONE);
    const windowStart = shiftDateOnly(today, { days: -(ACTIVITY_WINDOW_DAYS - 1) });

    const overall = emptyTally();
    const perGame = new Map<GameId, GameTally>(GAMES.map((game) => [game.id, emptyGameTally()]));
    const byDay = new Map<string, DayTally>();
    const recentSessions: ProgressSession[] = [];

    logs.forEach((log, index) => {
        const game = perGame.get(log.gameId);
        if (!game) return;

        const inWindow = log.day >= windowStart && log.day <= today;
        const { counts } = log;
        addToTally(overall, log, inWindow);
        addToTally(game.tally, log, inWindow);
        game.success[log.successLevel] += 1;
        if (counts) game.counted.push({ ...log, counts });
        if (log.score !== null) game.bestScore = Math.max(game.bestScore ?? 0, log.score);
        if (log.level !== null && log.passed) game.highestLevelCompleted = Math.max(game.highestLevelCompleted, log.level);

        if (inWindow) {
            const day: DayTally = byDay.get(log.day) ?? { plays: 0, seconds: 0, games: new Map() };
            const dayGame = day.games.get(log.gameId) ?? { plays: 0, seconds: 0 };
            day.plays += 1;
            day.seconds += log.durationSeconds ?? 0;
            dayGame.plays += 1;
            dayGame.seconds += log.durationSeconds ?? 0;
            day.games.set(log.gameId, dayGame);
            byDay.set(log.day, day);
        }

        if (index < RECENT_SESSIONS_LIMIT || game.seen < RECENT_SESSIONS_PER_GAME) {
            recentSessions.push({
                id: log.id,
                gameId: log.gameId,
                level: log.level,
                stars: log.stars,
                score: log.score,
                independentCount: counts?.independent ?? null,
                promptedCount: counts?.prompted ?? null,
                totalCount: counts?.total ?? null,
                independentRatio: counts ? toRatio(counts.independent, counts.total) : null,
                durationSeconds: log.durationSeconds,
                moodBefore: log.moodBefore,
                moodAfter: log.moodAfter,
                completedAt: new Date(log.completedAtMs).toISOString(),
            });
        }
        game.seen += 1;
    });

    const games: GameProgress[] = GAMES.map((definition) => {
        const game = perGame.get(definition.id) ?? emptyGameTally();
        const currentLevel = Math.min(game.highestLevelCompleted + 1, MAX_LEVEL);
        const tier = tierForLevel(currentLevel);
        return {
            ...summarize(game.tally, windowStart),
            gameId: definition.id,
            activityId: definition.activityId,
            bestScore: game.bestScore,
            highestLevelCompleted: game.highestLevelCompleted,
            currentLevel,
            tier: tier.id,
            success: game.success,
            mood: game.tally.mood,
            mastery: definition.graded ? masteryFor(game.counted, tier) : "ungraded",
            needsSupport: definition.graded && needsSupportFor(game.counted),
            trend: trendFor(game.counted),
        };
    });

    const daily: DailyActivity[] = Array.from({ length: ACTIVITY_WINDOW_DAYS }, (_, offset) => {
        const date = shiftDateOnly(windowStart, { days: offset });
        const day = byDay.get(date);
        const dayGames: DailyActivity["games"] = {};
        day?.games.forEach((value, gameId) => {
            dayGames[gameId] = { plays: value.plays, minutes: toMinutes(value.seconds) };
        });
        return { date, plays: day?.plays ?? 0, minutes: toMinutes(day?.seconds ?? 0), games: dayGames };
    });

    return {
        generatedAt: now.toISOString(),
        timeZone: PROGRESS_TIME_ZONE,
        windowDays: ACTIVITY_WINDOW_DAYS,
        totals: {
            ...summarize(overall, windowStart),
            gamesTried: games.filter((game) => game.plays > 0).length,
            levelsCompleted: games.reduce((sum, game) => sum + game.highestLevelCompleted, 0),
            levelsAvailable: GAMES.length * MAX_LEVEL,
        },
        games,
        daily,
        recentSessions,
        mood: overall.mood,
    };
}
