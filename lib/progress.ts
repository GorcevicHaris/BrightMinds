// lib/progress.ts
// Statistika napretka: zajednički tipovi za API (/api/children/[id]/progress) i
// ProgressDashboard, plus čista funkcija koja redove iz `progress_logs` pretvara u odgovor.
//
// VREMENSKA ZONA: svi "dani" (aktivni dani, grafikon za 30 dana) računaju se u zoni
// Europe/Belgrade, bez obzira na zonu servera ili pregledača. Ranije su se datumi
// poredili kao UTC ISO stringovi, pa je igra odigrana uveče mogla da "pređe" u pogrešan dan.
import {
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

export interface MoodInsights {
    /** Koliko puta je zabeleženo svako raspoloženje pre igre */
    before: MoodCounts;
    /** Koliko puta je zabeleženo svako raspoloženje posle igre */
    after: MoodCounts;
    /** Igre u kojima postoje oba podatka; `improved + same + dropped === paired` */
    paired: number;
    improved: number;
    same: number;
    dropped: number;
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
    /** Isto, ali samo u poslednjih `ACTIVITY_WINDOW_DAYS` dana */
    activeDaysInWindow: number;
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
    /** 0–15; nivo se računa kao završen kada donese bar jednu zvezdicu */
    highestLevelCompleted: number;
    /** Nivo na kome je dete sada (sledeći posle najvišeg završenog, najviše 15) */
    currentLevel: number;
    /** Težina kojoj pripada `currentLevel` */
    tier: TierId;
    success: SuccessDistribution;
    mood: MoodInsights;
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
    correctCount: number | null;
    totalCount: number | null;
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
    mood: MoodInsights;
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
    correctCount: number | null;
    totalCount: number | null;
    durationSeconds: number | null;
    moodBefore: Mood | null;
    moodAfter: Mood | null;
}

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
    const iso = value.replace(" ", "T");
    const hasZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(iso);
    const ms = Date.parse(hasZone ? iso : `${iso}Z`);
    return Number.isNaN(ms) ? null : ms;
}

/**
 * Jedan red iz `progress_logs`. Nove kolone (level, stars, score, correct_count,
 * total_count, duration_seconds) imaju prednost; ako ih nema u bazi ili su prazne,
 * vrednosti se čitaju iz stare beleške, a zvezdice i iz `success_level`.
 * Vraća `null` za red koji ne pripada nijednoj igri ili nema upotrebljiv datum/rezultat.
 */
function normalizeLog(row: unknown): NormalizedLog | null {
    if (!isRecord(row)) return null;

    const id = toNumber(row.id);
    const game = getGameByActivityId(toNumber(row.activity_id) ?? -1);
    const completedAtMs = parseTimestamp(row.completed_at);
    if (id === null || !game || completedAtMs === null) return null;

    const notes = typeof row.notes === "string" ? row.notes : null;
    const correctCount = toCount(row.correct_count);
    const totalCount = toCount(row.total_count);

    const starsColumn = toCount(row.stars);
    const starsNote = fromNotes(notes, LEGACY_NOTES.stars);
    let stars: Stars;
    if (isStars(starsColumn)) stars = starsColumn;
    else if (isStars(starsNote)) stars = starsNote;
    else if (isSuccessLevel(row.success_level)) stars = SUCCESS_STARS[row.success_level];
    else if (correctCount !== null && totalCount !== null && totalCount > 0) stars = starsFor(correctCount, totalCount);
    else return null;

    const level = toLevel(toCount(row.level)) ?? toLevel(fromNotes(notes, LEGACY_NOTES.level));
    const durationSeconds = toCount(row.duration_seconds);
    const durationMinutes = toNumber(row.duration_minutes);

    return {
        id,
        gameId: game.id,
        completedAtMs,
        day: dateOnlyInTimeZone(new Date(completedAtMs), PROGRESS_TIME_ZONE),
        level,
        stars,
        successLevel: isSuccessLevel(row.success_level) ? row.success_level : successLevelFor(stars),
        score: toCount(row.score) ?? fromNotes(notes, LEGACY_NOTES.score),
        correctCount,
        totalCount,
        durationSeconds:
            durationSeconds ?? (durationMinutes !== null && durationMinutes >= 0 ? Math.round(durationMinutes * 60) : null),
        moodBefore: toMood(row.mood_before),
        moodAfter: toMood(row.mood_after),
    };
}

// ── Sabiranje ─────────────────────────────────────────────────────────────────

function emptyMoodCounts(): MoodCounts {
    return { very_upset: 0, upset: 0, neutral: 0, happy: 0, very_happy: 0 };
}

function emptyMoodInsights(): MoodInsights {
    return { before: emptyMoodCounts(), after: emptyMoodCounts(), paired: 0, improved: 0, same: 0, dropped: 0 };
}

const MOOD_RANK: Record<Mood, number> = { very_upset: 0, upset: 1, neutral: 2, happy: 3, very_happy: 4 };

interface Tally {
    plays: number;
    seconds: number;
    stars: number;
    days: Set<string>;
    lastPlayedMs: number | null;
    mood: MoodInsights;
}

function emptyTally(): Tally {
    return { plays: 0, seconds: 0, stars: 0, days: new Set(), lastPlayedMs: null, mood: emptyMoodInsights() };
}

function addToTally(tally: Tally, log: NormalizedLog): void {
    tally.plays += 1;
    tally.seconds += log.durationSeconds ?? 0;
    tally.stars += log.stars;
    tally.days.add(log.day);
    tally.lastPlayedMs = Math.max(tally.lastPlayedMs ?? 0, log.completedAtMs);

    if (log.moodBefore) tally.mood.before[log.moodBefore] += 1;
    if (log.moodAfter) tally.mood.after[log.moodAfter] += 1;
    if (log.moodBefore && log.moodAfter) {
        const change = MOOD_RANK[log.moodAfter] - MOOD_RANK[log.moodBefore];
        tally.mood.paired += 1;
        if (change > 0) tally.mood.improved += 1;
        else if (change < 0) tally.mood.dropped += 1;
        else tally.mood.same += 1;
    }
}

function summarize(tally: Tally, windowStart: string): ProgressSummary {
    let activeDaysInWindow = 0;
    tally.days.forEach((day) => {
        if (day >= windowStart) activeDaysInWindow += 1;
    });
    return {
        plays: tally.plays,
        totalMinutes: Math.round(tally.seconds / 60),
        totalStars: tally.stars,
        averageStars: tally.plays > 0 ? Math.round((tally.stars / tally.plays) * 100) / 100 : null,
        activeDays: tally.days.size,
        activeDaysInWindow,
        lastPlayedAt: tally.lastPlayedMs === null ? null : new Date(tally.lastPlayedMs).toISOString(),
    };
}

interface GameTally {
    tally: Tally;
    bestScore: number | null;
    highestLevelCompleted: number;
    success: SuccessDistribution;
    /** Koliko je sesija ove igre već obrađeno (za `recentSessions`) */
    seen: number;
}

function emptyGameTally(): GameTally {
    return {
        tally: emptyTally(),
        bestScore: null,
        highestLevelCompleted: 0,
        success: { struggled: 0, partial: 0, successful: 0, excellent: 0 },
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
 * Pretvara sirove redove iz `progress_logs` (rezultat `select('*')`) u odgovor API-ja.
 * Čista funkcija: `now` se prosleđuje da bi rezultat bio predvidljiv.
 */
export function buildProgress(rows: readonly unknown[], now: Date = new Date()): ProgressResponse {
    const logs = rows
        .map(normalizeLog)
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

        addToTally(overall, log);
        addToTally(game.tally, log);
        game.success[log.successLevel] += 1;
        if (log.score !== null) game.bestScore = Math.max(game.bestScore ?? 0, log.score);
        if (log.level !== null && log.stars > 0) game.highestLevelCompleted = Math.max(game.highestLevelCompleted, log.level);

        if (log.day >= windowStart && log.day <= today) {
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
                correctCount: log.correctCount,
                totalCount: log.totalCount,
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
        return {
            ...summarize(game.tally, windowStart),
            gameId: definition.id,
            activityId: definition.activityId,
            bestScore: game.bestScore,
            highestLevelCompleted: game.highestLevelCompleted,
            currentLevel,
            tier: tierForLevel(currentLevel).id,
            success: game.success,
            mood: game.tally.mood,
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
