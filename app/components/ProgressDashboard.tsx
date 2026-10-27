"use client";

// Statistika napretka. Dva prikaza istih podataka:
//  • "parent" — analitika za roditelja/terapeuta: samostalno naspram „uz pomoć”, savladanost
//    po igri, trend i predlog za vežbu van ekrana. Zvezdice su ovde sporedne (nagrada za dete),
//    a raspoloženje se prikazuje isključivo kao detetov izbor, nikad kao ishod igre.
//  • "child"  — kratak, ohrabrujući pregled za dete: samo zvezdice i nivoi.
// Aplikacija je vežbanka, ne terapija: nijedan tekst ovde ne sme da tvrdi suprotno.
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, Circle, CircleCheck, CircleDashed, Clock3, Gamepad2, Info, Lightbulb, RefreshCw, Star, Target, type LucideIcon } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Alert, Card } from "@/app/components/ui/Card";
import { Select } from "@/app/components/ui/Field";
import { cn } from "@/lib/cn";
import { GAMES, MAX_LEVEL, MOODS, MOODS_THREE, ageLabel, getGame, getMood, type GameDefinition, type GameId, type Mood, type SuccessLevel } from "@/lib/games";
import {
    MASTERY_MIN_DAYS,
    MASTERY_RATIO,
    MASTERY_SESSIONS,
    RECENT_SESSIONS_LIMIT,
    TIERS,
    dayKeyToDate,
    tierForLevel,
    type DailyActivity,
    type GameProgress,
    type MasteryStatus,
    type MoodChoices,
    type MoodCounts,
    type ProgressResponse,
    type ProgressSession,
    type ProgressSummary,
    type SuccessDistribution,
    type TrendPoint,
} from "@/lib/progress";

interface ProgressDashboardProps {
    childId: number;
    childName: string;
    /** Kome je prikaz namenjen (podrazumevano roditelju/terapeutu) */
    audience?: "parent" | "child";
}

type GameFilter = GameId | "all";
type Metric = "plays" | "minutes";

// ── Formatiranje ──────────────────────────────────────────────────────────────

const LOCALE = "sr-Latn-RS";
const numberFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const pluralRules = new Intl.PluralRules("sr");

const formatNumber = (value: number) => numberFormat.format(value);

function plural(count: number, one: string, few: string, many: string): string {
    const rule = pluralRules.select(count);
    return rule === "one" ? one : rule === "few" ? few : many;
}

const gamesWord = (count: number) => plural(count, "igra", "igre", "igara");

function percent(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Udeo 0–1 kao ceo procenat. */
const toPercent = (ratio: number) => Math.round(ratio * 100);

function formatDate(iso: string, timeZone: string): string {
    return new Date(iso).toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric", timeZone });
}

function formatTime(iso: string, timeZone: string): string {
    return new Date(iso).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit", timeZone });
}

function formatDay(dayKey: string, style: "short" | "long"): string {
    return dayKeyToDate(dayKey).toLocaleDateString(
        LOCALE,
        style === "short"
            ? { day: "numeric", month: "short", timeZone: "UTC" }
            : { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }
    );
}

function formatDuration(seconds: number | null): string {
    if (seconds === null) return "—";
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest > 0 ? `${minutes} min ${rest} s` : `${minutes} min`;
}

// ── Boje serija na grafikonima ────────────────────────────────────────────────
// `swatch` (klasa) i `color` (CSS promenljiva) uvek idu u paru: Tailwind v4 emituje
// `--color-*` samo za boje koje se negde koriste kao klasa.

interface Series {
    swatch: string;
    color: string;
}

/** Igre redom učenja (kao na početnom ekranu deteta i u podešavanjima), ne redom u kodu */
const GAMES_IN_ORDER = [...GAMES].sort((a, b) => a.order - b.order);

const ALL_GAMES_SERIES: Series = { swatch: "bg-brand-600", color: "var(--color-brand-600)" };

const GAME_SERIES: Record<GameId, Series> = {
    shapes: { swatch: "bg-emerald-600", color: "var(--color-emerald-600)" },
    memory: { swatch: "bg-violet-600", color: "var(--color-violet-600)" },
    coloring: { swatch: "bg-orange-600", color: "var(--color-orange-600)" },
    "sound-to-image": { swatch: "bg-sky-600", color: "var(--color-sky-600)" },
    social: { swatch: "bg-indigo-600", color: "var(--color-indigo-600)" },
    "social-story": { swatch: "bg-teal-600", color: "var(--color-teal-600)" },
    emotions: { swatch: "bg-pink-600", color: "var(--color-pink-600)" },
    sorting: { swatch: "bg-amber-500", color: "var(--color-amber-500)" },
    sequence: { swatch: "bg-lime-600", color: "var(--color-lime-600)" },
    where: { swatch: "bg-cyan-500", color: "var(--color-cyan-500)" },
    uses: { swatch: "bg-fuchsia-600", color: "var(--color-fuchsia-600)" },
    counting: { swatch: "bg-yellow-500", color: "var(--color-yellow-500)" },
    gaze: { swatch: "bg-blue-600", color: "var(--color-blue-600)" },
    letters: { swatch: "bg-rose-600", color: "var(--color-rose-600)" },
    numbers: { swatch: "bg-green-600", color: "var(--color-green-600)" },
    food: { swatch: "bg-red-600", color: "var(--color-red-600)" },
    puzzle: { swatch: "bg-purple-600", color: "var(--color-purple-600)" },
    inset: { swatch: "bg-slate-600", color: "var(--color-slate-600)" },
    clock: { swatch: "bg-stone-600", color: "var(--color-stone-600)" },
    maze: { swatch: "bg-moss-600", color: "var(--color-moss-600)" },
    differences: { swatch: "bg-coral-600", color: "var(--color-coral-600)" },
    weather: { swatch: "bg-storm-600", color: "var(--color-storm-600)" },
    market: { swatch: "bg-honey-600", color: "var(--color-honey-600)" },
    families: { swatch: "bg-[#a8653a]", color: "#a8653a" },
    backpack: { swatch: "bg-[#246f8f]", color: "#246f8f" },
    missing: { swatch: "bg-berry-600", color: "var(--color-berry-600)" },
    words: { swatch: "bg-pine-600", color: "var(--color-pine-600)" },
    opposites: { swatch: "bg-orchid-600", color: "var(--color-orchid-600)" },
    syllables: { swatch: "bg-saffron-600", color: "var(--color-saffron-600)" },
    jobs: { swatch: "bg-cobalt-600", color: "var(--color-cobalt-600)" },
    habitats: { swatch: "bg-fern-600", color: "var(--color-fern-600)" },
    seasons: { swatch: "bg-rust-600", color: "var(--color-rust-600)" },
    body: { swatch: "bg-peach-600", color: "var(--color-peach-600)" },
    traffic: { swatch: "bg-denim-600", color: "var(--color-denim-600)" },
};

/** Samostalno → uz pomoć → ostalo: jedna nijansa od tamne ka svetloj, ostatak je neutralno siv. */
const SUPPORT_SERIES = {
    independent: { label: "Samostalno", swatch: "bg-brand-700" },
    prompted: { label: "Uz pomoć", swatch: "bg-brand-400" },
    other: { label: "Ostalo", swatch: "bg-slate-300" },
} as const;

/** Zvezdice su uređena skala u boji zvezdice (nagrada za dete, ne mera savladanosti). */
const STAR_LEVELS: { id: SuccessLevel; label: string; swatch: string }[] = [
    { id: "excellent", label: "3 zvezdice", swatch: "bg-sun-600" },
    { id: "successful", label: "2 zvezdice", swatch: "bg-sun-400" },
    { id: "partial", label: "1 zvezdica", swatch: "bg-sun-200" },
    { id: "struggled", label: "Bez zvezdica", swatch: "bg-slate-300" },
];

const AXIS_TICK = { fill: "var(--color-ink-soft)", fontSize: 12 };
const GRID_STROKE = "var(--color-line)";
/** Veličina pre prvog merenja kontejnera (bez nje Recharts prvi kadar crta sa širinom -1). */
const CHART_INITIAL_SIZE = { width: 320, height: 240 };

// ── Učitavanje ────────────────────────────────────────────────────────────────

const LOAD_ERROR = "Statistika trenutno nije dostupna. Proverite internet vezu i pokušajte ponovo.";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function isProgressResponse(value: unknown): value is ProgressResponse {
    return (
        isRecord(value) &&
        isRecord(value.totals) &&
        isRecord(value.mood) &&
        Array.isArray(value.games) &&
        Array.isArray(value.daily) &&
        Array.isArray(value.recentSessions)
    );
}

async function fetchProgress(childId: number, signal: AbortSignal): Promise<ProgressResponse> {
    const response = await fetch(`/api/children/${childId}/progress`, { signal, cache: "no-store" });
    const body: unknown = await response.json().catch(() => null);
    if (response.ok && isProgressResponse(body)) return body;
    // Poruke servera su već na srpskom; sve ostalo (mreža, neočekivan odgovor) dobija opštu poruku.
    throw new Error(isRecord(body) && typeof body.error === "string" ? body.error : LOAD_ERROR);
}

interface ProgressState {
    data: ProgressResponse | null;
    error: string | null;
    isLoading: boolean;
    reload: () => void;
}

/**
 * Učitava statistiku i prekida zahtev pri demontiranju. Tokom osvežavanja zadržava
 * prethodne podatke (prikaz ih samo priguši) da stranica ne bi "skakala".
 */
function useProgress(childId: number): ProgressState {
    const [attempt, setAttempt] = useState(0);
    const [loaded, setLoaded] = useState<{ childId: number; data: ProgressResponse } | null>(null);
    const [settled, setSettled] = useState<{ requestKey: string; error: string | null } | null>(null);
    const requestKey = `${childId}:${attempt}`;

    useEffect(() => {
        const controller = new AbortController();
        fetchProgress(childId, controller.signal)
            .then((data) => {
                setLoaded({ childId, data });
                setSettled({ requestKey, error: null });
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return;
                setSettled({ requestKey, error: error instanceof Error ? error.message : LOAD_ERROR });
            });
        return () => controller.abort();
    }, [childId, requestKey]);

    const isLoading = settled?.requestKey !== requestKey;
    return {
        data: loaded?.childId === childId ? loaded.data : null,
        error: isLoading ? null : (settled?.error ?? null),
        isLoading,
        reload: () => setAttempt((value) => value + 1),
    };
}

// ── Komponenta ────────────────────────────────────────────────────────────────

export default function ProgressDashboard({ childId, childName, audience = "parent" }: ProgressDashboardProps) {
    const { data, error, isLoading, reload } = useProgress(childId);
    const isChild = audience === "child";

    if (!data) {
        if (error) return <ErrorState message={error} onRetry={reload} isChild={isChild} />;
        return isChild ? <ChildSkeleton /> : <ParentSkeleton />;
    }

    return (
        <div className="space-y-6">
            {error && (
                <Alert className="flex flex-wrap items-center justify-between gap-3">
                    <span>Osvežavanje nije uspelo. Prikazani su ranije učitani podaci.</span>
                    <Button variant="secondary" size="sm" onClick={reload}>
                        Pokušaj ponovo
                    </Button>
                </Alert>
            )}
            <div aria-busy={isLoading} className={cn("transition-opacity duration-200", isLoading && "opacity-60")}>
                {data.totals.plays === 0 ? (
                    <EmptyState childName={childName} isChild={isChild} onRefresh={reload} isRefreshing={isLoading} />
                ) : isChild ? (
                    <ChildView data={data} childName={childName} />
                ) : (
                    <ParentView data={data} onRefresh={reload} isRefreshing={isLoading} />
                )}
            </div>
            {!isChild && (
                <p className="text-xs font-semibold text-ink-soft">
                    Bright Minds je vežbanka uz podršku odraslih. Nije terapija ni dijagnostički alat i ne zamenjuje logopeda, defektologa ili
                    psihologa.
                </p>
            )}
        </div>
    );
}

// ── Stanja: greška, prazno, učitavanje ────────────────────────────────────────

function ErrorState({ message, onRetry, isChild }: { message: string; onRetry: () => void; isChild: boolean }) {
    return (
        <Card className="mx-auto max-w-lg text-center" role="alert">
            <h2 className="text-xl font-extrabold text-ink">{isChild ? "Ups! Nešto nije u redu" : "Statistika nije učitana"}</h2>
            <p className="mt-2 text-sm text-ink-soft">{isChild ? "Ne možemo da prikažemo tvoj napredak. Probaj ponovo." : message}</p>
            <Button className="mt-5" variant={isChild ? "sun" : "primary"} chunky={isChild} onClick={onRetry}>
                Pokušaj ponovo
            </Button>
        </Card>
    );
}

interface EmptyStateProps {
    childName: string;
    isChild: boolean;
    onRefresh: () => void;
    isRefreshing: boolean;
}

function EmptyState({ childName, isChild, onRefresh, isRefreshing }: EmptyStateProps) {
    if (isChild) {
        return (
            <Card className="mx-auto max-w-lg text-center">
                <p className="text-5xl" aria-hidden="true">
                    ⭐
                </p>
                <h2 className="mt-3 text-2xl font-extrabold text-ink">Ovde će biti tvoje zvezdice</h2>
                <p className="mt-2 text-base text-ink-soft">Odigraj prvu igru i vrati se da vidiš svoj napredak!</p>
            </Card>
        );
    }
    return (
        <Card className="mx-auto max-w-xl text-center">
            <h2 className="text-xl font-extrabold text-ink">Još nema odigranih igara</h2>
            <p className="mt-2 text-sm text-ink-soft">
                Kada {childName} završi prvi nivo neke igre, ovde će se pojaviti aktivnost po danima, napredak po igrama i predlozi za
                vežbu van ekrana.
            </p>
            <Button className="mt-5" variant="secondary" onClick={onRefresh} isLoading={isRefreshing}>
                Osveži
            </Button>
        </Card>
    );
}

function SkeletonBlock({ className }: { className?: string }) {
    return <div className={cn("animate-pulse rounded-card bg-line/70", className)} />;
}

function ParentSkeleton() {
    return (
        <div role="status" className="space-y-6">
            <span className="sr-only">Učitavanje statistike…</span>
            <SkeletonBlock className="h-10 max-w-md rounded-xl" />
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                    <SkeletonBlock key={i} className="h-28" />
                ))}
            </div>
            <SkeletonBlock className="h-80" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                    <SkeletonBlock key={i} className="h-80" />
                ))}
            </div>
        </div>
    );
}

function ChildSkeleton() {
    return (
        <div role="status" className="space-y-5">
            <span className="sr-only">Učitavanje…</span>
            <SkeletonBlock className="h-9 max-w-xs rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 2 }, (_, i) => (
                    <SkeletonBlock key={i} className="h-28" />
                ))}
            </div>
            <SkeletonBlock className="h-96" />
        </div>
    );
}

// ── Zajednički delovi ─────────────────────────────────────────────────────────

function SectionHeading({ id, title, description }: { id: string; title: string; description?: string }) {
    return (
        <div>
            <h2 id={id} className="text-lg font-extrabold text-ink sm:text-xl">
                {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
        </div>
    );
}

interface StarsProps {
    value: number;
    /** Samo osvojene zvezdice, bez sivih mesta za neosvojene (prikaz za dete) */
    earnedOnly?: boolean;
    className?: string;
}

function Stars({ value, earnedOnly = false, className }: StarsProps) {
    const label = earnedOnly ? `${value} ${plural(value, "zvezdica", "zvezdice", "zvezdica")}` : `${value} od 3 zvezdice`;
    return (
        <span role="img" aria-label={label} className={cn("inline-flex gap-0.5 leading-none", className)}>
            {(earnedOnly ? [1, 2, 3].slice(0, value) : [1, 2, 3]).map((star) => (
                <span key={star} aria-hidden="true" className={star <= value ? "text-sun-400" : "text-slate-300"}>
                    ★
                </span>
            ))}
        </span>
    );
}

function GameIcon({ game, size = "md" }: { game: GameDefinition; size?: "sm" | "md" | "lg" }) {
    const sizes = { sm: "h-8 w-8 text-base rounded-lg", md: "h-11 w-11 text-xl rounded-xl", lg: "h-14 w-14 text-3xl rounded-2xl" };
    return (
        <span aria-hidden="true" className={cn("grid shrink-0 place-items-center", game.accent.soft, sizes[size])}>
            {game.icon}
        </span>
    );
}

/** Napredak kroz 15 nivoa, podeljen na tri težine. */
function LevelProgress({ game, completed }: { game: GameDefinition; completed: number }) {
    const currentTier = tierForLevel(Math.min(completed + 1, MAX_LEVEL)).id;
    return (
        <div>
            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={MAX_LEVEL}
                aria-valuenow={completed}
                aria-label={`${game.title}: završeno ${completed} od ${MAX_LEVEL} nivoa`}
                className="grid grid-cols-3 gap-2"
            >
                {TIERS.map((tier) => (
                    <div key={tier.id} className="flex gap-0.5">
                        {Array.from({ length: tier.to - tier.from + 1 }, (_, i) => (
                            <span
                                key={i}
                                className={cn("h-2.5 flex-1 rounded-full", tier.from + i <= completed ? game.accent.solid : "bg-line")}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div aria-hidden="true" className="mt-1.5 grid grid-cols-3 gap-2 text-xs font-bold">
                {TIERS.map((tier) => (
                    <span key={tier.id} className={tier.id === currentTier ? "text-ink" : "text-ink-faint"}>
                        {tier.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

interface SegmentedProps<T extends string> {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}

function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
    return (
        <div role="group" aria-label={label} className="inline-flex shrink-0 rounded-xl border border-line bg-canvas p-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={option.value === value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "min-h-11 rounded-lg px-3 text-sm font-bold transition-colors",
                        option.value === value ? "bg-surface text-ink shadow-soft" : "text-ink-soft hover:text-ink"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function ChartNote({ children }: { children: ReactNode }) {
    return <p className="rounded-xl bg-canvas px-4 py-8 text-center text-sm font-semibold text-ink-soft">{children}</p>;
}

// ── Prikaz za roditelja ───────────────────────────────────────────────────────

type MoodOption = (typeof MOODS)[number];

/**
 * Skala lica za prikaz: baza čuva samo vrednost, a kraća skala (tri lica) koristi podskup
 * istih vrednosti. Pet lica prikazujemo tek kada je zabeležen bar jedan krajnji izbor.
 */
function moodScaleFor(mood: MoodChoices): MoodOption[] {
    const extremes = mood.before.very_upset + mood.before.very_happy + mood.after.very_upset + mood.after.very_happy;
    return extremes > 0 ? MOODS : MOODS_THREE;
}

const countChoices = (counts: MoodCounts) => MOODS.reduce((sum, mood) => sum + counts[mood.value], 0);

interface ParentViewProps {
    data: ProgressResponse;
    onRefresh: () => void;
    isRefreshing: boolean;
}

function ParentView({ data, onRefresh, isRefreshing }: ParentViewProps) {
    const [filter, setFilter] = useState<GameFilter>("all");
    const selected = filter === "all" ? undefined : data.games.find((game) => game.gameId === filter);
    const sessions =
        filter === "all"
            ? data.recentSessions.slice(0, RECENT_SESSIONS_LIMIT)
            : data.recentSessions.filter((session) => session.gameId === filter);
    // Ista skala u svim delovima prikaza, bez obzira na izabranu igru
    const moodScale = moodScaleFor(data.mood);
    const mood = selected ? selected.mood : data.mood;
    const updatedAt = new Date(data.generatedAt).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="space-y-8">
            <div className="flex flex-col-reverse gap-3">
                <GameFilterControl value={filter} onChange={setFilter} />
                <div className="flex shrink-0 items-center gap-2">
                    <p className="mr-auto text-xs font-semibold text-ink-faint">Ažurirano u {updatedAt}</p>
                    <Button variant="secondary" size="sm" className="min-w-11" onClick={onRefresh} isLoading={isRefreshing} aria-label="Osveži podatke" title={`Ažurirano u ${updatedAt}. Osveži podatke.`}>
                        {!isRefreshing && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                        <span className="hidden sm:inline">Osveži</span>
                    </Button>
                </div>
            </div>

            <Overview summary={selected ?? data.totals} data={data} selected={selected} />

            <ActivityChart daily={data.daily} filter={filter} windowDays={data.windowDays} />

            {selected ? (
                <GameDetail game={selected} timeZone={data.timeZone} windowDays={data.windowDays} onShowAll={() => setFilter("all")} />
            ) : (
                <section aria-labelledby="progress-games" className="space-y-4">
                    <SectionHeading
                        id="progress-games"
                        title="Napredak po igrama"
                        description="Samostalno: tačno iz prvog pokušaja. Uz pomoć: tačno tek kada igra istakne odgovor."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {data.games.map((game) => (
                            <GameCard
                                key={game.gameId}
                                game={game}
                                timeZone={data.timeZone}
                                windowDays={data.windowDays}
                                onSelect={() => setFilter(game.gameId)}
                            />
                        ))}
                    </div>
                </section>
            )}

            <SessionsSection sessions={sessions} timeZone={data.timeZone} moodScale={moodScale} />

            {countChoices(mood.before) + countChoices(mood.after) > 0 && <MoodSection mood={mood} scale={moodScale} />}
        </div>
    );
}

function GameFilterControl({ value, onChange }: { value: GameFilter; onChange: (value: GameFilter) => void }) {
    const options: { value: GameFilter; label: string; icon?: string }[] = [
        { value: "all", label: "Sve igre" },
        ...GAMES_IN_ORDER.map((game) => ({ value: game.id, label: game.title, icon: game.icon })),
    ];
    return (
        <>
            <div className="md:hidden">
                <Select
                    label="Prikaži"
                    value={value}
                    onChange={(event) => onChange(options.find((option) => option.value === event.target.value)?.value ?? "all")}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </div>
            {/* Sve igre su uvek vidljive: kad ih ima više nego što staje u red, prelaze u drugi red */}
            <div role="group" aria-label="Filter po igri" className="hidden min-w-0 flex-wrap gap-1 rounded-2xl bg-surface p-1 shadow-soft ring-1 ring-line md:flex">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={option.value === value}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-sm font-bold transition-colors",
                            option.value === value ? "bg-brand-600 text-white shadow-soft" : "text-ink-soft hover:bg-brand-50 hover:text-ink"
                        )}
                    >
                        {option.icon && <span aria-hidden="true">{option.icon}</span>}
                        {option.label}
                    </button>
                ))}
            </div>
        </>
    );
}

// ── Pregled (kartice sa brojevima) ────────────────────────────────────────────

interface StatPart {
    value: string;
    unit?: string;
}

const TILE_TONES = {
    brand: "bg-brand-50 text-brand-600",
    sky: "bg-sky-50 text-sky-600",
    emerald: "bg-emerald-50 text-emerald-600",
    sun: "bg-sun-50 text-sun-600",
} as const;

interface StatTileProps {
    label: string;
    parts: StatPart[];
    detail: string;
    Icon: LucideIcon;
    tone: keyof typeof TILE_TONES;
}

function StatTile({ label, parts, detail, Icon, tone }: StatTileProps) {
    return (
        <Card className="p-4 sm:p-5">
            <dt className="flex items-center gap-2 text-sm font-bold text-ink-soft">
                <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", TILE_TONES[tone])} aria-hidden="true">
                    <Icon className="h-4 w-4" />
                </span>
                {label}
            </dt>
            <dd className="mt-3">
                <span className="flex flex-wrap items-baseline gap-x-1.5 text-ink">
                    {parts.map((part, i) => (
                        <span key={i} className="whitespace-nowrap">
                            <span className="text-2xl font-extrabold leading-none sm:text-3xl">{part.value}</span>
                            {part.unit && <span className="ml-1 text-sm font-bold text-ink-soft">{part.unit}</span>}
                        </span>
                    ))}
                </span>
                <span className="mt-2 block text-xs font-semibold text-ink-soft">{detail}</span>
            </dd>
        </Card>
    );
}

function minutesParts(totalMinutes: number): StatPart[] {
    if (totalMinutes < 60) return [{ value: formatNumber(totalMinutes), unit: "min" }];
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0
        ? [
              { value: formatNumber(hours), unit: "h" },
              { value: formatNumber(minutes), unit: "min" },
          ]
        : [{ value: formatNumber(hours), unit: "h" }];
}

function Overview({ summary, data, selected }: { summary: ProgressSummary; data: ProgressResponse; selected?: GameProgress }) {
    const averageMinutes = summary.plays > 0 ? summary.totalMinutes / summary.plays : 0;
    const { independentRate30d: independent, promptedRate30d: prompted } = summary;
    const period = `poslednjih ${data.windowDays} dana`;
    const independentDetail =
        independent === null
            ? `Nema partija sa brojem odgovora u ${period}`
            : prompted === null
              ? `Iz prvog pokušaja, ${period}`
              : `Uz pomoć: ${toPercent(prompted)}% · ${period}`;

    return (
        <section aria-label="Pregled" className="space-y-3">
            <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatTile
                    Icon={Gamepad2}
                    tone="brand"
                    label="Odigrane igre"
                    parts={[{ value: formatNumber(summary.plays) }]}
                    detail={
                        selected
                            ? `Trenutno na nivou ${selected.currentLevel} od ${MAX_LEVEL}`
                            : `Isprobano ${data.totals.gamesTried} od ${GAMES.length} igara`
                    }
                />
                <StatTile
                    Icon={Clock3}
                    tone="sky"
                    label="Vreme igre"
                    parts={minutesParts(summary.totalMinutes)}
                    detail={summary.plays > 0 ? `Prosečno ${formatNumber(averageMinutes)} min po igri` : "Još nije igrano"}
                />
                <StatTile
                    Icon={Target}
                    tone="emerald"
                    label="Samostalno tačno"
                    parts={[{ value: independent === null ? "—" : `${toPercent(independent)}%` }]}
                    detail={independentDetail}
                />
                <StatTile
                    Icon={CalendarDays}
                    tone="sun"
                    label={`Dana igranja (${data.windowDays} dana)`}
                    parts={[{ value: formatNumber(summary.daysPlayed30d), unit: `od ${data.windowDays}` }]}
                    detail={`Od početka: ${formatNumber(summary.activeDays)} ${plural(summary.activeDays, "dan", "dana", "dana")}`}
                />
            </dl>
            <p className="inline-flex flex-wrap items-center gap-x-1 rounded-xl bg-sun-50 px-3 py-2 text-sm text-ink-soft">
                <Star className="h-4 w-4 fill-sun-300 text-sun-500" aria-hidden="true" />
                Zvezdice: <strong className="font-extrabold text-ink">{formatNumber(summary.totalStars)}</strong>
                {summary.averageStars !== null && <> (prosečno {formatNumber(summary.averageStars)} po igri)</>}. Zvezdice su nagrada za dete,
                a ne mera savladanosti.
            </p>
        </section>
    );
}

// ── Aktivnost po danima ───────────────────────────────────────────────────────

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
    { value: "plays", label: "Igre" },
    { value: "minutes", label: "Minuti" },
];

interface DayPoint {
    date: string;
    plays: number;
    minutes: number;
}

function ActivityChart({ daily, filter, windowDays }: { daily: DailyActivity[]; filter: GameFilter; windowDays: number }) {
    const [metric, setMetric] = useState<Metric>("plays");
    const game = filter === "all" ? undefined : getGame(filter);
    const series = filter === "all" ? ALL_GAMES_SERIES : GAME_SERIES[filter];

    const points = useMemo<DayPoint[]>(
        () =>
            daily.map((day) => {
                const source = filter === "all" ? day : (day.games[filter] ?? { plays: 0, minutes: 0 });
                return { date: day.date, plays: source.plays, minutes: source.minutes };
            }),
        [daily, filter]
    );
    const dayByDate = useMemo(() => new Map(daily.map((day) => [day.date, day])), [daily]);
    const activeDays = points.filter((point) => point.plays > 0);
    const subject = game ? `igra „${game.title}”` : "sve igre";
    const title = `${metric === "plays" ? "Broj odigranih igara" : "Minuti igre"} po danima, ${subject}`;

    return (
        <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-extrabold text-ink sm:text-xl">Aktivnost po danima</h2>
                    <p className="mt-0.5 flex items-center gap-2 text-sm text-ink-soft">
                        <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-sm", series.swatch)} />
                        Poslednjih {windowDays} dana · {game ? game.title : "sve igre"}
                    </p>
                </div>
                <Segmented label="Mera na grafikonu" value={metric} options={METRIC_OPTIONS} onChange={setMetric} />
            </div>

            {activeDays.length === 0 ? (
                <div className="mt-5">
                    <ChartNote>Nema odigranih igara u poslednjih {windowDays} dana.</ChartNote>
                </div>
            ) : (
                <figure className="mt-5 min-w-0">
                    <div className="h-60 w-full sm:h-72">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={CHART_INITIAL_SIZE}>
                            <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} title={title}>
                                <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(value: string) => formatDay(value, "short")}
                                    tick={AXIS_TICK}
                                    tickLine={false}
                                    axisLine={{ stroke: GRID_STROKE }}
                                    tickMargin={8}
                                    minTickGap={24}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    width={36}
                                    allowDecimals={metric === "minutes"}
                                    tickFormatter={formatNumber}
                                    tick={AXIS_TICK}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: "var(--color-canvas)" }}
                                    wrapperStyle={{ outline: "none" }}
                                    content={({ active, label }) => {
                                        const day = active && typeof label === "string" ? dayByDate.get(label) : undefined;
                                        return day ? <DayTooltip day={day} filter={filter} /> : null;
                                    }}
                                />
                                <Bar dataKey={metric} fill={series.color} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="sr-only">
                        <table>
                            <caption>{title} (samo dani sa aktivnošću)</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Dan</th>
                                    <th scope="col">Igre</th>
                                    <th scope="col">Minuti</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeDays.map((point) => (
                                    <tr key={point.date}>
                                        <th scope="row">{formatDay(point.date, "long")}</th>
                                        <td>{point.plays}</td>
                                        <td>{formatNumber(point.minutes)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </figure>
            )}
        </Card>
    );
}

function DayTooltip({ day, filter }: { day: DailyActivity; filter: GameFilter }) {
    const shown = filter === "all" ? day : (day.games[filter] ?? { plays: 0, minutes: 0 });
    const breakdown = filter === "all" ? GAMES_IN_ORDER.filter((game) => day.games[game.id]) : [];
    return (
        <div className="max-w-60 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm shadow-lift">
            <p className="text-xs font-bold text-ink-soft">{formatDay(day.date, "long")}</p>
            <p className="mt-1 font-extrabold text-ink">
                {shown.plays} {gamesWord(shown.plays)} · {formatNumber(shown.minutes)} min
            </p>
            {breakdown.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-line pt-2">
                    {breakdown.map((game) => (
                        <li key={game.id} className="flex items-center gap-2 text-xs text-ink-soft">
                            <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", GAME_SERIES[game.id].swatch)} />
                            <span className="min-w-0 flex-1 truncate font-semibold">{game.title}</span>
                            <span className="font-extrabold text-ink">{day.games[game.id]?.plays ?? 0}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ── Igre ──────────────────────────────────────────────────────────────────────

const MASTERY_PERCENT = toPercent(MASTERY_RATIO);

const MASTERY_BADGES: Record<MasteryStatus, { label: string; badge: string; Icon: LucideIcon }> = {
    mastered: { label: "Savladano", badge: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CircleCheck },
    progressing: { label: "U toku", badge: "border-brand-200 bg-brand-50 text-brand-800", Icon: CircleDashed },
    not_started: { label: "Nije započeto", badge: "border-line bg-canvas text-ink-soft", Icon: Circle },
    ungraded: { label: "Bez ocene", badge: "border-line bg-canvas text-ink-soft", Icon: Circle },
};

const UNGRADED_NOTE =
    "U ovoj igri nema pogrešnih odgovora — sva osećanja su u redu. „Samostalno” ovde znači da je dete izabralo osećanje koje u toj situaciji ima većina dece.";

/** Kriterijum iz lib/progress.ts rečima; brojevi dolaze iz istih konstanti. */
const MASTERY_CRITERION =
    `„Savladano” znači: poslednje ${MASTERY_SESSIONS} ${plural(MASTERY_SESSIONS, "partija", "partije", "partija")} na trenutnoj težini, ` +
    `odigrane u najmanje ${MASTERY_MIN_DAYS} različita dana, i u svakoj bar ${MASTERY_PERCENT}% zadataka rešeno samostalno. ` +
    "To je uobičajen dogovor iz prakse, a ne strogo pravilo — o sledećem koraku odlučujete vi.";

/** Oznaka savladanosti trenutne težine, sa objašnjenjem kriterijuma na dugme „i”. */
function MasteryStatusLine({ game, progress }: { game: GameDefinition; progress: GameProgress }) {
    const [isExplained, setIsExplained] = useState(false);
    const noteId = useId();
    const { label, badge, Icon } = MASTERY_BADGES[progress.mastery];

    return (
        <div>
            <div className="flex items-center gap-2">
                <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-extrabold", badge)}>
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {label}
                    </span>
                    <span className="text-xs font-bold text-ink-soft">Težina: {tierForLevel(progress.currentLevel).label}</span>
                </p>
                <button
                    type="button"
                    aria-expanded={isExplained}
                    aria-controls={noteId}
                    aria-label={`${game.title}: šta znači oznaka „Savladano”?`}
                    onClick={() => setIsExplained((value) => !value)}
                    className="-my-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-brand-50 hover:text-ink"
                >
                    <Info className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
            <p id={noteId} hidden={!isExplained} className="mt-2 rounded-xl bg-canvas px-3 py-2.5 text-xs font-semibold text-ink-soft">
                {progress.mastery === "ungraded" ? UNGRADED_NOTE : MASTERY_CRITERION}
            </p>
        </div>
    );
}

interface SupportSplitProps {
    /** Udeli 0–1 nad istim zadacima; `prompted` je `null` kada pomoć nije beležena */
    independent: number | null;
    prompted: number | null;
    windowDays: number;
}

/** Samostalno / uz pomoć / ostalo kao traka od 100%, sa brojevima ispisanim ispod. */
function SupportSplit({ independent, prompted, windowDays }: SupportSplitProps) {
    const heading = <p className="text-sm font-bold text-ink">Samostalnost ({windowDays} dana)</p>;
    if (independent === null) {
        return (
            <div>
                {heading}
                <p className="mt-1 text-xs font-semibold text-ink-soft">Nema partija sa brojem odgovora u ovom periodu.</p>
            </div>
        );
    }

    const independentPercent = toPercent(independent);
    const promptedPercent = prompted === null ? null : Math.min(toPercent(prompted), 100 - independentPercent);
    const parts = [
        { ...SUPPORT_SERIES.independent, value: independentPercent },
        ...(promptedPercent === null ? [] : [{ ...SUPPORT_SERIES.prompted, value: promptedPercent }]),
        { ...SUPPORT_SERIES.other, value: 100 - independentPercent - (promptedPercent ?? 0) },
    ];

    return (
        <div>
            {heading}
            <div aria-hidden="true" className="mt-2 flex h-3 gap-0.5">
                {parts
                    .filter((part) => part.value > 0)
                    .map((part) => (
                        <span
                            key={part.label}
                            className={cn("min-w-1 rounded-sm first:rounded-l-full last:rounded-r-full", part.swatch)}
                            style={{ flexGrow: part.value, flexBasis: 0 }}
                        />
                    ))}
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {parts.map((part) => (
                    <div key={part.label} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", part.swatch)} />
                        <dt className="font-semibold text-ink-soft">{part.label}</dt>
                        <dd className="font-extrabold text-ink">{part.value}%</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function TrendTooltip({ point }: { point: TrendPoint }) {
    return (
        <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
            <p className="font-bold text-ink-soft">
                {formatDay(point.date, "short")}
                {point.level !== null && ` · nivo ${point.level}`}
            </p>
            <p className="mt-1 whitespace-nowrap font-extrabold text-ink">Samostalno {toPercent(point.independentRatio)}%</p>
            {point.promptedRatio !== null && (
                <p className="whitespace-nowrap font-semibold text-ink-soft">Uz pomoć {toPercent(point.promptedRatio)}%</p>
            )}
        </div>
    );
}

interface TrendChartProps {
    game: GameDefinition;
    /** Od najstarije ka najnovijoj partiji */
    trend: TrendPoint[];
    /** Veći grafikon sa osama (detalji igre) umesto male linije u kartici */
    detailed?: boolean;
}

/** Udeo samostalno tačnih odgovora po partijama; isprekidana linija je prag savladanosti. */
function TrendChart({ game, trend, detailed = false }: TrendChartProps) {
    const points = useMemo(() => trend.map((point, index) => ({ index, independent: toPercent(point.independentRatio) })), [trend]);
    if (trend.length === 0) return null;

    const color = GAME_SERIES[game.id].color;
    const title = `${game.title}: udeo samostalno tačnih odgovora po partijama`;

    return (
        <figure className="min-w-0">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-bold text-ink">
                Samostalno po partijama
                <span className="text-xs font-semibold text-ink-soft">
                    {trend.length === 1 ? "poslednja partija" : `poslednjih ${trend.length}`} · crta: {MASTERY_PERCENT}%
                </span>
            </figcaption>
            <div className={cn("mt-2 w-full", detailed ? "h-52" : "h-16")}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={CHART_INITIAL_SIZE}>
                    <LineChart data={points} margin={{ top: 8, right: 12, bottom: detailed ? 0 : 6, left: detailed ? 0 : 12 }} title={title}>
                        {detailed && <CartesianGrid vertical={false} stroke={GRID_STROKE} />}
                        <XAxis
                            dataKey="index"
                            hide={!detailed}
                            tickFormatter={(value: number) => (trend[value] ? formatDay(trend[value].date, "short") : "")}
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={{ stroke: GRID_STROKE }}
                            tickMargin={8}
                            minTickGap={16}
                            interval="preserveStartEnd"
                            padding={{ left: 8, right: 8 }}
                        />
                        <YAxis
                            hide={!detailed}
                            width={44}
                            domain={[0, 100]}
                            ticks={[0, 50, 100]}
                            tickFormatter={(value: number) => `${value}%`}
                            tick={AXIS_TICK}
                            tickLine={false}
                            axisLine={false}
                        />
                        <ReferenceLine y={MASTERY_PERCENT} stroke="var(--color-ink-faint)" strokeDasharray="4 4" />
                        <Tooltip
                            cursor={{ stroke: GRID_STROKE }}
                            wrapperStyle={{ outline: "none", zIndex: 10 }}
                            allowEscapeViewBox={{ x: false, y: true }}
                            content={({ active, label }) => {
                                const point = active ? trend[Number(label)] : undefined;
                                return point ? <TrendTooltip point={point} /> : null;
                            }}
                        />
                        <Line
                            type="linear"
                            dataKey="independent"
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: 3.5, fill: color, stroke: "var(--color-surface)", strokeWidth: 1.5 }}
                            activeDot={{ r: 5, fill: color, stroke: "var(--color-surface)", strokeWidth: 2 }}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="sr-only">
                <table>
                    <caption>{title} (od najstarije ka najnovijoj)</caption>
                    <thead>
                        <tr>
                            <th scope="col">Dan</th>
                            <th scope="col">Nivo</th>
                            <th scope="col">Samostalno</th>
                            <th scope="col">Uz pomoć</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trend.map((point, index) => (
                            <tr key={index}>
                                <th scope="row">{formatDay(point.date, "long")}</th>
                                <td>{point.level ?? "nije zabeležen"}</td>
                                <td>{toPercent(point.independentRatio)}%</td>
                                <td>{point.promptedRatio === null ? "nije zabeleženo" : `${toPercent(point.promptedRatio)}%`}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </figure>
    );
}

function SupportSuggestion() {
    return (
        <p className="flex gap-2 rounded-xl border border-sun-200 bg-sun-50 px-3 py-2.5 text-sm text-ink">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sun-700" aria-hidden="true" />
            <span>
                <strong className="font-extrabold">Predlog:</strong> Poslednje tri partije su bile teške. Probajte lakši uzrast u podešavanjima ili
                igrajte zajedno.
            </span>
        </p>
    );
}

/** Veštine iz aplikacije slabo se prenose same od sebe — zato uz svaku igru ide vežba van ekrana. */
function OffscreenTip({ game, heading: Heading }: { game: GameDefinition; heading: "h3" | "h4" }) {
    return (
        <div>
            <Heading className="font-sans text-xs font-extrabold tracking-normal text-ink-soft">Vežbajte i van ekrana</Heading>
            <p className="mt-0.5 text-sm text-ink">{game.offscreenTip}</p>
        </div>
    );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
            <dd className="mt-0.5 text-base font-extrabold text-ink">{children}</dd>
        </div>
    );
}

function LevelSummary({ game, progress }: { game: GameDefinition; progress: GameProgress }) {
    return (
        <div>
            <p className="mb-2 text-sm font-bold text-ink">
                Završeno {progress.highestLevelCompleted} od {MAX_LEVEL} nivoa
            </p>
            <LevelProgress game={game} completed={progress.highestLevelCompleted} />
        </div>
    );
}

interface GameCardProps {
    game: GameProgress;
    timeZone: string;
    windowDays: number;
    onSelect: () => void;
}

function GameCard({ game: progress, timeZone, windowDays, onSelect }: GameCardProps) {
    const game = getGame(progress.gameId);
    const played = progress.plays > 0;
    // Na telefonu kartica prvo pokazuje samo najvažnije (status i nivoe); ostalo se otvara dodirom,
    // da devet igara ne bude devet ekrana skrolovanja. Na širem ekranu je sve odmah vidljivo.
    const [open, setOpen] = useState(false);
    const moreId = useId();
    return (
        <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
                <GameIcon game={game} />
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold text-ink">{game.title}</h3>
                    <p className="text-sm text-ink-soft">{game.skill}</p>
                </div>
                {/* Uzrast za koji je igra namenjena — diskretno, samo za roditelja */}
                <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-xs font-bold text-ink-faint" title="Uzrast za koji je igra namenjena">
                    {ageLabel(game)}
                </span>
            </div>

            <MasteryStatusLine game={game} progress={progress} />
            <LevelSummary game={game} progress={progress} />

            {played ? (
                <>
                    {progress.needsSupport && <SupportSuggestion />}
                    <div id={moreId} className={cn("flex-col gap-4", open ? "flex" : "hidden sm:flex")}>
                        <SupportSplit independent={progress.independentRate30d} prompted={progress.promptedRate30d} windowDays={windowDays} />
                        <TrendChart game={game} trend={progress.trend} />
                        <OffscreenTip game={game} heading="h4" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen((value) => !value)}
                        aria-expanded={open}
                        aria-controls={moreId}
                        className="-my-1 inline-flex min-h-11 items-center justify-center gap-1.5 self-start rounded-xl px-2 text-sm font-extrabold text-brand-700 hover:bg-brand-50 sm:hidden"
                    >
                        {open ? "Prikaži manje" : "Samostalnost i predlog za vežbu"}
                        <span aria-hidden="true" className={cn("transition-transform duration-200", open && "rotate-180")}>
                            ▾
                        </span>
                    </button>
                </>
            ) : (
                <OffscreenTip game={game} heading="h4" />
            )}

            {played ? (
                <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
                    <p className="text-xs font-semibold text-ink-soft">
                        {formatNumber(progress.plays)} {gamesWord(progress.plays)} · poslednji put{" "}
                        {progress.lastPlayedAt ? formatDate(progress.lastPlayedAt, timeZone) : "—"}
                    </p>
                    <Button variant="ghost" size="sm" onClick={onSelect} aria-label={`Detalji za igru ${game.title}`}>
                        Detalji
                    </Button>
                </div>
            ) : (
                <p className="mt-auto border-t border-line pt-3 text-sm font-semibold text-ink-soft">Još nije igrano.</p>
            )}
        </Card>
    );
}

interface GameDetailProps {
    game: GameProgress;
    timeZone: string;
    windowDays: number;
    onShowAll: () => void;
}

function GameDetail({ game: progress, timeZone, windowDays, onShowAll }: GameDetailProps) {
    const game = getGame(progress.gameId);
    return (
        <Card aria-labelledby="progress-game-detail" role="region" className="space-y-6">
            <div className="flex flex-wrap items-start gap-3">
                <GameIcon game={game} />
                <div className="min-w-0 flex-1">
                    <h2 id="progress-game-detail" className="text-lg font-extrabold text-ink sm:text-xl">
                        {game.title}
                    </h2>
                    <p className="text-sm text-ink-soft">{game.skill}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={onShowAll}>
                    Sve igre
                </Button>
            </div>

            {progress.plays === 0 ? (
                <>
                    <ChartNote>Ova igra još nije igrana.</ChartNote>
                    <OffscreenTip game={game} heading="h3" />
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        <div className="min-w-0 space-y-5">
                            <MasteryStatusLine game={game} progress={progress} />
                            <LevelSummary game={game} progress={progress} />
                            <SupportSplit independent={progress.independentRate30d} prompted={progress.promptedRate30d} windowDays={windowDays} />
                            <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4">
                                <Fact label="Trenutni nivo">{progress.currentLevel}</Fact>
                                <Fact label="Poslednji put">
                                    <span className="text-sm">{progress.lastPlayedAt ? formatDate(progress.lastPlayedAt, timeZone) : "—"}</span>
                                </Fact>
                            </dl>
                        </div>
                        <div className="min-w-0 space-y-5">
                            <TrendChart game={game} trend={progress.trend} detailed />
                            {progress.needsSupport && <SupportSuggestion />}
                            <OffscreenTip game={game} heading="h3" />
                        </div>
                    </div>
                    <RewardBreakdown progress={progress} />
                </>
            )}
        </Card>
    );
}

/** Zvezdice i poeni: sporedan prikaz, jer su nagrada za dete, a ne podatak o savladanosti. */
function RewardBreakdown({ progress }: { progress: GameProgress }) {
    const success: SuccessDistribution = progress.success;
    const levels = STAR_LEVELS.filter((level) => level.id !== "struggled" || success[level.id] > 0);
    return (
        <div className="border-t border-line pt-5">
            <h3 className="text-sm font-bold text-ink">Zvezdice i poeni</h3>
            <p className="mt-0.5 text-xs font-semibold text-ink-soft">Nagrada za dete — ne pokazuju koliko je veština savladana.</p>
            <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-2">
                <div>
                    <div aria-hidden="true" className="flex h-3 gap-0.5">
                        {levels
                            .filter((level) => success[level.id] > 0)
                            .map((level) => (
                                <span
                                    key={level.id}
                                    className={cn("min-w-1 rounded-sm first:rounded-l-full last:rounded-r-full", level.swatch)}
                                    style={{ flexGrow: success[level.id], flexBasis: 0 }}
                                />
                            ))}
                    </div>
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {levels.map((level) => (
                            <div key={level.id} className="flex items-center gap-1.5">
                                <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", level.swatch)} />
                                <dt className="font-semibold text-ink-soft">{level.label}</dt>
                                <dd className="font-extrabold text-ink">
                                    {success[level.id]} <span className="font-semibold text-ink-soft">({percent(success[level.id], progress.plays)}%)</span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
                <dl className="grid grid-cols-3 gap-3">
                    <Fact label="Zvezdica ukupno">{formatNumber(progress.totalStars)}</Fact>
                    <Fact label="Prosek po igri">{progress.averageStars === null ? "—" : formatNumber(progress.averageStars)}</Fact>
                    <Fact label="Najviše poena">{progress.bestScore === null ? "—" : formatNumber(progress.bestScore)}</Fact>
                </dl>
            </div>
        </div>
    );
}

// ── Poslednje igre ────────────────────────────────────────────────────────────

const SESSIONS_COLLAPSED = 8;

function findMood(scale: MoodOption[], value: Mood | null): MoodOption | undefined {
    return scale.find((mood) => mood.value === value) ?? getMood(value);
}

/** Lica koja je dete izabralo pre i posle partije — samo zapis izbora, bez poređenja. */
function MoodChoice({ session, scale }: { session: ProgressSession; scale: MoodOption[] }) {
    const before = findMood(scale, session.moodBefore);
    const after = findMood(scale, session.moodAfter);
    if (!before && !after) return <span className="text-ink-faint">—</span>;
    return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="sr-only">
                Pre: {before?.label ?? "nije izabrano"}, posle: {after?.label ?? "nije izabrano"}
            </span>
            <span aria-hidden="true" title={before ? `Pre: ${before.label}` : undefined}>
                {before?.emoji ?? "–"}
            </span>
            <span aria-hidden="true" className="text-ink-faint">
                ·
            </span>
            <span aria-hidden="true" title={after ? `Posle: ${after.label}` : undefined}>
                {after?.emoji ?? "–"}
            </span>
        </span>
    );
}

function independentText(session: ProgressSession): string {
    return session.independentCount !== null && session.totalCount !== null ? `${session.independentCount}/${session.totalCount}` : "—";
}

const promptedText = (session: ProgressSession) => (session.promptedCount === null ? "—" : String(session.promptedCount));

interface SessionsSectionProps {
    sessions: ProgressSession[];
    timeZone: string;
    moodScale: MoodOption[];
}

function SessionsSection({ sessions, timeZone, moodScale }: SessionsSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? sessions : sessions.slice(0, SESSIONS_COLLAPSED);

    return (
        <section aria-labelledby="progress-sessions" className="space-y-4">
            <SectionHeading
                id="progress-sessions"
                title="Poslednje igre"
                description="Svaka odigrana partija, od najnovije. „Samostalno” je broj zadataka rešenih iz prvog pokušaja od ukupnog broja."
            />

            {sessions.length === 0 ? (
                <Card>
                    <ChartNote>Nema odigranih igara za ovaj prikaz.</ChartNote>
                </Card>
            ) : (
                <>
                    <ul className="space-y-3 md:hidden">
                        {visible.map((session) => {
                            const game = getGame(session.gameId);
                            return (
                                <li key={session.id}>
                                    <Card className="p-4">
                                        <div className="flex items-center gap-3">
                                            <GameIcon game={game} size="sm" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-extrabold text-ink">{game.title}</p>
                                                <p className="text-xs font-semibold text-ink-soft">
                                                    {session.level === null ? "Nivo —" : `Nivo ${session.level}`} · {formatDate(session.completedAt, timeZone)} ·{" "}
                                                    {formatTime(session.completedAt, timeZone)}
                                                </p>
                                            </div>
                                            <Stars value={session.stars} className="text-lg" />
                                        </div>
                                        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-3 border-t border-line pt-3 text-sm min-[480px]:grid-cols-4">
                                            <div>
                                                <dt className="text-xs font-semibold text-ink-soft">Samostalno</dt>
                                                <dd className="font-extrabold tabular-nums text-ink">{independentText(session)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs font-semibold text-ink-soft">Uz pomoć</dt>
                                                <dd className="font-extrabold tabular-nums text-ink">{promptedText(session)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs font-semibold text-ink-soft">Trajanje</dt>
                                                <dd className="font-extrabold text-ink">{formatDuration(session.durationSeconds)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs font-semibold text-ink-soft">Raspoloženje (izbor deteta)</dt>
                                                <dd className="text-base">
                                                    <MoodChoice session={session} scale={moodScale} />
                                                </dd>
                                            </div>
                                        </dl>
                                    </Card>
                                </li>
                            );
                        })}
                    </ul>

                    <Card padded={false} className="hidden overflow-hidden md:block">
                        <div className="scroll-soft overflow-x-auto">
                            <table className="w-full min-w-[46rem] text-left text-sm">
                                <caption className="sr-only">Poslednje odigrane igre</caption>
                                <thead className="border-b border-line bg-canvas text-xs font-bold text-ink-soft">
                                    <tr>
                                        <th scope="col" className="px-5 py-3">Datum</th>
                                        <th scope="col" className="px-3 py-3">Igra</th>
                                        <th scope="col" className="px-3 py-3 text-right">Nivo</th>
                                        <th scope="col" className="px-3 py-3 text-right">Samostalno</th>
                                        <th scope="col" className="px-3 py-3 text-right">Uz pomoć</th>
                                        <th scope="col" className="px-3 py-3 text-right">Trajanje</th>
                                        <th scope="col" className="px-3 py-3">Zvezdice</th>
                                        <th scope="col" className="px-5 py-3">
                                            Raspoloženje <span className="font-semibold">(izbor deteta)</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {visible.map((session) => {
                                        const game = getGame(session.gameId);
                                        return (
                                            <tr key={session.id}>
                                                <td className="whitespace-nowrap px-5 py-3 text-ink">
                                                    {formatDate(session.completedAt, timeZone)}
                                                    <span className="ml-2 text-xs text-ink-soft">{formatTime(session.completedAt, timeZone)}</span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className="flex items-center gap-2 font-bold text-ink">
                                                        <span aria-hidden="true">{game.icon}</span>
                                                        {game.title}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-right tabular-nums text-ink">{session.level ?? "—"}</td>
                                                <td className="px-3 py-3 text-right font-bold tabular-nums text-ink">{independentText(session)}</td>
                                                <td className="px-3 py-3 text-right tabular-nums text-ink">{promptedText(session)}</td>
                                                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-ink">
                                                    {formatDuration(session.durationSeconds)}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <Stars value={session.stars} className="text-base" />
                                                </td>
                                                <td className="px-5 py-3 text-base">
                                                    <MoodChoice session={session} scale={moodScale} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {sessions.length > SESSIONS_COLLAPSED && (
                        <div className="text-center">
                            <Button variant="secondary" size="sm" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                                {expanded ? "Prikaži manje" : `Prikaži sve (${sessions.length})`}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

// ── Raspoloženje (izbor deteta) ───────────────────────────────────────────────

/** Koliko puta je dete izabralo svako lice; traka pokazuje udeo u toj koloni (pre ili posle). */
function MoodDistribution({ id, title, counts, scale }: { id: string; title: string; counts: MoodCounts; scale: MoodOption[] }) {
    const total = countChoices(counts);
    return (
        <div className="min-w-0">
            <h3 id={id} className="flex items-baseline justify-between gap-2 text-sm font-bold text-ink">
                {title}
                <span className="font-sans text-xs font-semibold tracking-normal text-ink-soft">
                    {total} {plural(total, "izbor", "izbora", "izbora")}
                </span>
            </h3>
            {total === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">Nije zabeleženo.</p>
            ) : (
                <ul aria-labelledby={id} className="mt-3 space-y-2">
                    {scale.map((mood) => (
                        <li key={mood.value} className="flex items-center gap-2 text-sm">
                            <span aria-hidden="true" className="w-6 shrink-0 text-center text-base">
                                {mood.emoji}
                            </span>
                            <span className="w-16 shrink-0 font-semibold text-ink-soft">{mood.label}</span>
                            <span aria-hidden="true" className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                                <span className="block h-full rounded-full bg-brand-500" style={{ width: `${percent(counts[mood.value], total)}%` }} />
                            </span>
                            <span className="w-8 shrink-0 text-right font-extrabold tabular-nums text-ink">{counts[mood.value]}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function MoodSection({ mood, scale }: { mood: MoodChoices; scale: MoodOption[] }) {
    return (
        <Card aria-labelledby="progress-mood" role="region">
            <SectionHeading id="progress-mood" title="Raspoloženje (izbor deteta)" />
            <p className="mt-2 max-w-3xl rounded-xl bg-canvas px-4 py-3 text-sm text-ink-soft">
                Ovo je detetov izbor lica pre i posle igre. Kod male dece to nije pouzdano merenje i ne pokazuje da li igra „popravlja”
                raspoloženje.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                <MoodDistribution id="progress-mood-before" title="Pre igre" counts={mood.before} scale={scale} />
                <MoodDistribution id="progress-mood-after" title="Posle igre" counts={mood.after} scale={scale} />
            </div>
        </Card>
    );
}

// ── Prikaz za dete ────────────────────────────────────────────────────────────

const CHILD_WINS = 5;

function ChildView({ data, childName }: { data: ProgressResponse; childName: string }) {
    const wins = data.recentSessions.filter((session) => session.stars > 0).slice(0, CHILD_WINS);
    // Samo ono što dete može da skuplja: zvezdice i nivoi. Bez procenata, ocena i poređenja.
    const tiles = [
        { emoji: "⭐", value: data.totals.totalStars, label: "Zvezdice", tone: "bg-sun-50 border-sun-200" },
        { emoji: "🏆", value: data.totals.levelsCompleted, label: "Nivoi", tone: "bg-emerald-50 border-emerald-200" },
    ];

    return (
        <div className="space-y-6">
            <div className="animate-fade-up">
                <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Bravo, {childName}!</h2>
                <p className="mt-1 text-base font-semibold text-ink-soft">Ovo je tvoj napredak.</p>
            </div>

            <dl className="grid grid-cols-2 gap-3 sm:gap-4">
                {tiles.map((tile) => (
                    <div key={tile.label} className={cn("flex flex-col-reverse items-center rounded-card border-2 px-2 py-4 text-center sm:py-6", tile.tone)}>
                        <dt className="mt-1 text-sm font-extrabold text-ink-soft sm:text-base">{tile.label}</dt>
                        <dd className="text-3xl font-extrabold leading-tight text-ink sm:text-5xl">
                            <span aria-hidden="true" className="block text-2xl sm:text-4xl">
                                {tile.emoji}
                            </span>
                            {formatNumber(tile.value)}
                        </dd>
                    </div>
                ))}
            </dl>

            <Card>
                <h3 className="text-xl font-extrabold text-ink">Tvoje igre</h3>
                <ul className="mt-4 space-y-5">
                    {data.games.map((progress) => {
                        const game = getGame(progress.gameId);
                        const completed = progress.highestLevelCompleted;
                        return (
                            <li key={progress.gameId} className="flex items-center gap-3 sm:gap-4">
                                <GameIcon game={game} size="lg" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                                        <p className="min-w-0 break-words text-base font-extrabold text-ink sm:text-lg">{game.title}</p>
                                        <p className="shrink-0 text-sm font-extrabold text-ink-soft">
                                            {completed > 0 ? `Nivo ${completed} od ${MAX_LEVEL}` : "Probaj!"}
                                        </p>
                                    </div>
                                    <div
                                        role="progressbar"
                                        aria-valuemin={0}
                                        aria-valuemax={MAX_LEVEL}
                                        aria-valuenow={completed}
                                        aria-label={`${game.title}: nivo ${completed} od ${MAX_LEVEL}`}
                                        className={cn("mt-2 h-4 overflow-hidden rounded-full border", game.accent.soft, game.accent.border)}
                                    >
                                        <div
                                            className={cn("h-full rounded-full transition-[width] duration-500", game.accent.solid)}
                                            style={{ width: `${(completed / MAX_LEVEL) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </Card>

            {wins.length > 0 && (
                <Card>
                    <h3 className="text-xl font-extrabold text-ink">Poslednje zvezdice</h3>
                    <ul className="mt-3 divide-y divide-line">
                        {wins.map((session) => {
                            const game = getGame(session.gameId);
                            return (
                                <li key={session.id} className="flex items-center gap-3 py-3">
                                    <GameIcon game={game} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-base font-extrabold text-ink">{game.title}</p>
                                        {session.level !== null && <p className="text-sm font-bold text-ink-soft">Nivo {session.level}</p>}
                                    </div>
                                    <Stars value={session.stars} earnedOnly className="text-2xl sm:text-3xl" />
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            )}
        </div>
    );
}
