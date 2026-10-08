"use client";

// Statistika napretka. Dva prikaza istih podataka:
//  • "parent" — puna analitika za roditelja/terapeuta
//  • "child"  — kratak, ohrabrujući pregled za dete (bez raspoloženja i bez neuspeha)
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Minus, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import { Alert, Card } from "@/app/components/ui/Card";
import { Select } from "@/app/components/ui/Field";
import { cn } from "@/lib/cn";
import { GAMES, MAX_LEVEL, MOODS, getGame, getMood, type GameDefinition, type GameId, type Mood, type SuccessLevel } from "@/lib/games";
import {
    RECENT_SESSIONS_LIMIT,
    TIERS,
    dayKeyToDate,
    tierForLevel,
    type DailyActivity,
    type GameProgress,
    type MoodInsights,
    type ProgressResponse,
    type ProgressSession,
    type ProgressSummary,
    type SuccessDistribution,
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

const ALL_GAMES_SERIES: Series = { swatch: "bg-brand-600", color: "var(--color-brand-600)" };

const GAME_SERIES: Record<GameId, Series> = {
    shapes: { swatch: "bg-emerald-600", color: "var(--color-emerald-600)" },
    memory: { swatch: "bg-violet-600", color: "var(--color-violet-600)" },
    coloring: { swatch: "bg-orange-600", color: "var(--color-orange-600)" },
    "sound-to-image": { swatch: "bg-sky-600", color: "var(--color-sky-600)" },
    social: { swatch: "bg-indigo-600", color: "var(--color-indigo-600)" },
    "social-story": { swatch: "bg-teal-600", color: "var(--color-teal-600)" },
    emotions: { swatch: "bg-pink-600", color: "var(--color-pink-600)" },
};

const MOOD_SERIES: Record<"before" | "after", Series & { label: string }> = {
    before: { label: "Pre igre", swatch: "bg-brand-300", color: "var(--color-brand-300)" },
    after: { label: "Posle igre", swatch: "bg-brand-700", color: "var(--color-brand-700)" },
};

/** Uspešnost je uređena skala, pa koristi jednu nijansu od svetle ka tamnoj. */
const SUCCESS_LEVELS: { id: SuccessLevel; label: string; stars: number; swatch: string }[] = [
    { id: "excellent", label: "Odlično", stars: 3, swatch: "bg-brand-900" },
    { id: "successful", label: "Uspešno", stars: 2, swatch: "bg-brand-700" },
    { id: "partial", label: "Delimično", stars: 1, swatch: "bg-brand-500" },
    { id: "struggled", label: "Uz teškoće", stars: 0, swatch: "bg-brand-300" },
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
                    <ParentView data={data} childName={childName} onRefresh={reload} isRefreshing={isLoading} />
                )}
            </div>
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
                Kada {childName} završi prvi nivo neke igre, ovde će se pojaviti aktivnost po danima, napredak po igrama i
                raspoloženje pre i posle igre.
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
                    <SkeletonBlock key={i} className="h-52" />
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
            <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 3 }, (_, i) => (
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
                        "min-h-9 rounded-lg px-3 text-sm font-bold transition-colors",
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

interface ParentViewProps {
    data: ProgressResponse;
    childName: string;
    onRefresh: () => void;
    isRefreshing: boolean;
}

function ParentView({ data, childName, onRefresh, isRefreshing }: ParentViewProps) {
    const [filter, setFilter] = useState<GameFilter>("all");
    const selected = filter === "all" ? undefined : data.games.find((game) => game.gameId === filter);
    const sessions =
        filter === "all"
            ? data.recentSessions.slice(0, RECENT_SESSIONS_LIMIT)
            : data.recentSessions.filter((session) => session.gameId === filter);

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <GameFilterControl value={filter} onChange={setFilter} />
                <div className="flex shrink-0 items-center justify-between gap-3 md:justify-end">
                    <p className="text-xs font-semibold text-ink-soft">
                        Ažurirano u {new Date(data.generatedAt).toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <Button variant="secondary" size="sm" onClick={onRefresh} isLoading={isRefreshing}>
                        {!isRefreshing && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                        Osveži
                    </Button>
                </div>
            </div>

            <Overview summary={selected ?? data.totals} data={data} selected={selected} />

            <ActivityChart daily={data.daily} filter={filter} windowDays={data.windowDays} />

            {selected ? (
                <GameDetail game={selected} timeZone={data.timeZone} onShowAll={() => setFilter("all")} />
            ) : (
                <section aria-labelledby="progress-games" className="space-y-4">
                    <SectionHeading id="progress-games" title="Napredak po igrama" description={`Svaka igra ima ${MAX_LEVEL} nivoa u tri težine.`} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {data.games.map((game) => (
                            <GameCard key={game.gameId} game={game} timeZone={data.timeZone} onSelect={() => setFilter(game.gameId)} />
                        ))}
                    </div>
                </section>
            )}

            <MoodSection mood={selected ? selected.mood : data.mood} childName={childName} />

            <SessionsSection sessions={sessions} timeZone={data.timeZone} />
        </div>
    );
}

function GameFilterControl({ value, onChange }: { value: GameFilter; onChange: (value: GameFilter) => void }) {
    const options: { value: GameFilter; label: string; icon?: string }[] = [
        { value: "all", label: "Sve igre" },
        ...GAMES.map((game) => ({ value: game.id, label: game.title, icon: game.icon })),
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
            <div role="group" aria-label="Filter po igri" className="hidden min-w-0 flex-1 flex-wrap gap-2 md:flex">
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={option.value === value}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-bold transition-colors",
                            option.value === value
                                ? "border-brand-600 bg-brand-600 text-white"
                                : "border-line bg-surface text-ink-soft hover:border-brand-200 hover:bg-brand-50 hover:text-ink"
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

function StatTile({ label, parts, detail }: { label: string; parts: StatPart[]; detail: string }) {
    return (
        <Card className="p-4 sm:p-5">
            <dt className="text-sm font-bold text-ink-soft">{label}</dt>
            <dd className="mt-2">
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
    return (
        <section aria-label="Pregled">
            <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatTile
                    label="Odigrane igre"
                    parts={[{ value: formatNumber(summary.plays) }]}
                    detail={
                        selected
                            ? `Trenutno na nivou ${selected.currentLevel} od ${MAX_LEVEL}`
                            : `Isprobano ${data.totals.gamesTried} od ${GAMES.length} igara`
                    }
                />
                <StatTile
                    label="Vreme igre"
                    parts={minutesParts(summary.totalMinutes)}
                    detail={summary.plays > 0 ? `Prosečno ${formatNumber(averageMinutes)} min po igri` : "Još nije igrano"}
                />
                <StatTile
                    label="Prosek zvezdica"
                    parts={[{ value: summary.averageStars === null ? "—" : formatNumber(summary.averageStars), unit: "od 3" }]}
                    detail={`Ukupno osvojeno: ${formatNumber(summary.totalStars)}`}
                />
                <StatTile
                    label="Aktivni dani"
                    parts={[{ value: formatNumber(summary.activeDaysInWindow), unit: `od ${data.windowDays}` }]}
                    detail={`Od početka: ${formatNumber(summary.activeDays)} ${plural(summary.activeDays, "dan", "dana", "dana")}`}
                />
            </dl>
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
    const breakdown = filter === "all" ? GAMES.filter((game) => day.games[game.id]) : [];
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

function TierBadge({ game, progress }: { game: GameDefinition; progress: GameProgress }) {
    return (
        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-extrabold", game.accent.soft, game.accent.text, game.accent.border)}>
            {tierForLevel(progress.currentLevel).label}
        </span>
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

function AverageStars({ value }: { value: number | null }) {
    if (value === null) return <>—</>;
    return (
        <span className="inline-flex items-center gap-1">
            {formatNumber(value)}
            <span aria-hidden="true" className="text-sun-400">
                ★
            </span>
        </span>
    );
}

function GameCard({ game: progress, timeZone, onSelect }: { game: GameProgress; timeZone: string; onSelect: () => void }) {
    const game = getGame(progress.gameId);
    const played = progress.plays > 0;
    return (
        <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-start gap-3">
                <GameIcon game={game} />
                <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold text-ink">{game.title}</h3>
                    <p className="text-sm text-ink-soft">{game.skill}</p>
                </div>
                {played && <TierBadge game={game} progress={progress} />}
            </div>

            <div>
                <p className="mb-2 text-sm font-bold text-ink">
                    Završeno {progress.highestLevelCompleted} od {MAX_LEVEL} nivoa
                </p>
                <LevelProgress game={game} completed={progress.highestLevelCompleted} />
            </div>

            {played ? (
                <>
                    <dl className="grid grid-cols-3 gap-3">
                        <Fact label="Odigrano">{formatNumber(progress.plays)}</Fact>
                        <Fact label="Prosek">
                            <AverageStars value={progress.averageStars} />
                        </Fact>
                        <Fact label="Rekord">{progress.bestScore === null ? "—" : formatNumber(progress.bestScore)}</Fact>
                    </dl>
                    <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-3">
                        <p className="text-xs font-semibold text-ink-soft">
                            Poslednji put: {progress.lastPlayedAt ? formatDate(progress.lastPlayedAt, timeZone) : "—"}
                        </p>
                        <Button variant="ghost" size="sm" onClick={onSelect} aria-label={`Detalji za igru ${game.title}`}>
                            Detalji
                        </Button>
                    </div>
                </>
            ) : (
                <p className="mt-auto border-t border-line pt-3 text-sm font-semibold text-ink-soft">Još nije igrano.</p>
            )}
        </Card>
    );
}

function GameDetail({ game: progress, timeZone, onShowAll }: { game: GameProgress; timeZone: string; onShowAll: () => void }) {
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
                <ChartNote>Ova igra još nije igrana.</ChartNote>
            ) : (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-ink">
                                Završeno {progress.highestLevelCompleted} od {MAX_LEVEL} nivoa
                            </p>
                            <TierBadge game={game} progress={progress} />
                        </div>
                        <LevelProgress game={game} completed={progress.highestLevelCompleted} />
                        <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4">
                            <Fact label="Trenutni nivo">{progress.currentLevel}</Fact>
                            <Fact label="Rekord">{progress.bestScore === null ? "—" : formatNumber(progress.bestScore)}</Fact>
                            <Fact label="Poslednji put">
                                <span className="text-sm">{progress.lastPlayedAt ? formatDate(progress.lastPlayedAt, timeZone) : "—"}</span>
                            </Fact>
                        </dl>
                    </div>
                    <SuccessBreakdown success={progress.success} total={progress.plays} />
                </div>
            )}
        </Card>
    );
}

function SuccessBreakdown({ success, total }: { success: SuccessDistribution; total: number }) {
    return (
        <div>
            <h3 className="text-sm font-bold text-ink">Raspodela uspešnosti</h3>
            <div aria-hidden="true" className="mt-3 flex h-3 gap-0.5">
                {SUCCESS_LEVELS.filter((level) => success[level.id] > 0).map((level) => (
                    <span
                        key={level.id}
                        className={cn("min-w-1 rounded-sm first:rounded-l-full last:rounded-r-full", level.swatch)}
                        style={{ flexGrow: success[level.id], flexBasis: 0 }}
                    />
                ))}
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                {SUCCESS_LEVELS.map((level) => (
                    <div key={level.id} className="flex items-center gap-2 text-sm">
                        <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", level.swatch)} />
                        <dt className="min-w-0 flex-1 text-ink-soft">
                            {level.label} <span className="text-xs">({level.stars}★)</span>
                        </dt>
                        <dd className="font-extrabold text-ink">
                            {success[level.id]} <span className="text-xs font-semibold text-ink-soft">· {percent(success[level.id], total)}%</span>
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

// ── Raspoloženje ──────────────────────────────────────────────────────────────

const MOOD_CHANGES = [
    { id: "improved", label: "Bolje", swatch: "bg-teal-600", Icon: TrendingUp },
    { id: "same", label: "Isto", swatch: "bg-slate-300", Icon: Minus },
    { id: "dropped", label: "Slabije", swatch: "bg-sun-600", Icon: TrendingDown },
] as const;

interface MoodTickProps {
    x?: number;
    y?: number;
    payload?: { value?: string };
}

function renderMoodTick({ x = 0, y = 0, payload }: MoodTickProps) {
    const mood = getMood(payload?.value);
    return (
        <g transform={`translate(${x},${y})`}>
            <text textAnchor="middle" dy={16} fontSize={16}>
                {mood?.emoji}
            </text>
            {/* Na najužim ekranima (ispod 360px) nazivi se preklapaju — ostaju u oblačiću i tabeli */}
            <text textAnchor="middle" dy={34} fontSize={12} fontWeight={700} fill="var(--color-ink-soft)" className="hidden min-[360px]:inline">
                {mood?.label}
            </text>
        </g>
    );
}

function MoodSection({ mood, childName }: { mood: MoodInsights; childName: string }) {
    const points = MOODS.map((item) => ({ mood: item.value, before: mood.before[item.value], after: mood.after[item.value] }));
    const hasData = points.some((point) => point.before > 0 || point.after > 0);
    const chartTitle = "Raspoloženje pre i posle igre, broj igara po raspoloženju";

    return (
        <Card aria-labelledby="progress-mood" role="region">
            <SectionHeading
                id="progress-mood"
                title="Raspoloženje pre i posle igre"
                description={`Kako se ${childName} oseća kada počne i kada završi igru.`}
            />

            {!hasData ? (
                <div className="mt-5">
                    <ChartNote>Raspoloženje još nije zabeleženo.</ChartNote>
                </div>
            ) : (
                <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2">
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-ink">Promena tokom igre</h3>
                        {mood.paired === 0 ? (
                            <p className="mt-2 text-sm text-ink-soft">Još nema igara u kojima je raspoloženje zabeleženo i pre i posle.</p>
                        ) : (
                            <>
                                <p className="mt-1 text-sm text-ink-soft">
                                    Na osnovu {mood.paired} {gamesWord(mood.paired)} sa oba podatka. Posle igre raspoloženje je bilo isto ili bolje u{" "}
                                    <strong className="font-extrabold text-ink">{percent(mood.improved + mood.same, mood.paired)}%</strong> slučajeva.
                                </p>
                                <div aria-hidden="true" className="mt-4 flex h-3 gap-0.5">
                                    {MOOD_CHANGES.filter((change) => mood[change.id] > 0).map((change) => (
                                        <span
                                            key={change.id}
                                            className={cn("min-w-1 rounded-sm first:rounded-l-full last:rounded-r-full", change.swatch)}
                                            style={{ flexGrow: mood[change.id], flexBasis: 0 }}
                                        />
                                    ))}
                                </div>
                                <dl className="mt-4 grid grid-cols-3 gap-3">
                                    {MOOD_CHANGES.map(({ id, label, swatch, Icon }) => (
                                        <div key={id} className="min-w-0">
                                            <dt className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
                                                <span aria-hidden="true" className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", swatch)} />
                                                {label}
                                                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                            </dt>
                                            <dd className="mt-1 text-2xl font-extrabold leading-none text-ink">
                                                {mood[id]}
                                                <span className="ml-1.5 text-xs font-semibold text-ink-soft">{percent(mood[id], mood.paired)}%</span>
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </>
                        )}
                    </div>

                    <figure className="min-w-0">
                        <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                            <span className="text-sm font-bold text-ink">Zabeležena raspoloženja</span>
                            <span className="flex gap-4 text-xs font-bold text-ink-soft">
                                {(["before", "after"] as const).map((key) => (
                                    <span key={key} className="inline-flex items-center gap-1.5">
                                        <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-sm", MOOD_SERIES[key].swatch)} />
                                        {MOOD_SERIES[key].label}
                                    </span>
                                ))}
                            </span>
                        </figcaption>
                        <div className="mt-3 h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={CHART_INITIAL_SIZE}>
                                <BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barGap={2} title={chartTitle}>
                                    <CartesianGrid vertical={false} stroke={GRID_STROKE} />
                                    <XAxis dataKey="mood" tick={renderMoodTick} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval={0} height={48} />
                                    <YAxis width={36} allowDecimals={false} tickFormatter={formatNumber} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: "var(--color-canvas)" }}
                                        wrapperStyle={{ outline: "none" }}
                                        content={({ active, label }) => {
                                            const value = active && typeof label === "string" ? getMood(label)?.value : undefined;
                                            return value ? <MoodTooltip mood={value} insights={mood} /> : null;
                                        }}
                                    />
                                    <Bar dataKey="before" name={MOOD_SERIES.before.label} fill={MOOD_SERIES.before.color} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                                    <Bar dataKey="after" name={MOOD_SERIES.after.label} fill={MOOD_SERIES.after.color} radius={[4, 4, 0, 0]} maxBarSize={20} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="sr-only">
                            <table>
                                <caption>{chartTitle}</caption>
                                <thead>
                                    <tr>
                                        <th scope="col">Raspoloženje</th>
                                        <th scope="col">{MOOD_SERIES.before.label}</th>
                                        <th scope="col">{MOOD_SERIES.after.label}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {points.map((point) => (
                                        <tr key={point.mood}>
                                            <th scope="row">{getMood(point.mood)?.label}</th>
                                            <td>{point.before}</td>
                                            <td>{point.after}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </figure>
                </div>
            )}
        </Card>
    );
}

function MoodTooltip({ mood, insights }: { mood: Mood; insights: MoodInsights }) {
    const item = getMood(mood);
    return (
        <div className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm shadow-lift">
            <p className="text-xs font-bold text-ink-soft">
                {item?.emoji} {item?.label}
            </p>
            <ul className="mt-1.5 space-y-1">
                {(["before", "after"] as const).map((key) => (
                    <li key={key} className="flex items-center gap-2 text-xs text-ink-soft">
                        <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", MOOD_SERIES[key].swatch)} />
                        <span className="flex-1 font-semibold">{MOOD_SERIES[key].label}</span>
                        <span className="text-sm font-extrabold text-ink">{insights[key][mood]}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Poslednje igre ────────────────────────────────────────────────────────────

const SESSIONS_COLLAPSED = 8;

function MoodChange({ session }: { session: ProgressSession }) {
    const before = getMood(session.moodBefore);
    const after = getMood(session.moodAfter);
    if (!before && !after) return <span className="text-ink-faint">—</span>;
    return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span className="sr-only">
                Pre: {before?.label ?? "nije zabeleženo"}, posle: {after?.label ?? "nije zabeleženo"}
            </span>
            <span aria-hidden="true" title={before ? `Pre: ${before.label}` : undefined}>
                {before?.emoji ?? "–"}
            </span>
            <span aria-hidden="true" className="text-ink-faint">
                →
            </span>
            <span aria-hidden="true" title={after ? `Posle: ${after.label}` : undefined}>
                {after?.emoji ?? "–"}
            </span>
        </span>
    );
}

function correctText(session: ProgressSession): string {
    return session.correctCount !== null && session.totalCount !== null ? `${session.correctCount}/${session.totalCount}` : "—";
}

function SessionsSection({ sessions, timeZone }: { sessions: ProgressSession[]; timeZone: string }) {
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? sessions : sessions.slice(0, SESSIONS_COLLAPSED);

    return (
        <section aria-labelledby="progress-sessions" className="space-y-4">
            <SectionHeading id="progress-sessions" title="Poslednje igre" description="Svaka odigrana partija, od najnovije." />

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
                                        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-sm">
                                            <div>
                                                <dt className="text-xs font-semibold text-ink-soft">Rezultat</dt>
                                                <dd className="font-extrabold text-ink">{session.score === null ? "—" : formatNumber(session.score)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs font-semibold text-ink-soft">Trajanje</dt>
                                                <dd className="font-extrabold text-ink">{formatDuration(session.durationSeconds)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs font-semibold text-ink-soft">Raspoloženje</dt>
                                                <dd className="text-base">
                                                    <MoodChange session={session} />
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
                            <table className="w-full min-w-[44rem] text-left text-sm">
                                <caption className="sr-only">Poslednje odigrane igre</caption>
                                <thead className="border-b border-line bg-canvas text-xs font-bold text-ink-soft">
                                    <tr>
                                        <th scope="col" className="px-5 py-3">Datum</th>
                                        <th scope="col" className="px-3 py-3">Igra</th>
                                        <th scope="col" className="px-3 py-3 text-right">Nivo</th>
                                        <th scope="col" className="px-3 py-3">Zvezdice</th>
                                        <th scope="col" className="px-3 py-3 text-right">Tačno</th>
                                        <th scope="col" className="px-3 py-3 text-right">Rezultat</th>
                                        <th scope="col" className="px-3 py-3 text-right">Trajanje</th>
                                        <th scope="col" className="px-5 py-3">Raspoloženje</th>
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
                                                <td className="px-3 py-3">
                                                    <Stars value={session.stars} className="text-base" />
                                                </td>
                                                <td className="px-3 py-3 text-right tabular-nums text-ink">{correctText(session)}</td>
                                                <td className="px-3 py-3 text-right font-bold tabular-nums text-ink">
                                                    {session.score === null ? "—" : formatNumber(session.score)}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-ink">
                                                    {formatDuration(session.durationSeconds)}
                                                </td>
                                                <td className="px-5 py-3 text-base">
                                                    <MoodChange session={session} />
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

// ── Prikaz za dete ────────────────────────────────────────────────────────────

const CHILD_WINS = 5;

function ChildView({ data, childName }: { data: ProgressResponse; childName: string }) {
    const wins = data.recentSessions.filter((session) => session.stars > 0).slice(0, CHILD_WINS);
    const tiles = [
        { emoji: "⭐", value: data.totals.totalStars, label: "Zvezdice", tone: "bg-sun-50 border-sun-200" },
        { emoji: "🎮", value: data.totals.plays, label: "Igre", tone: "bg-brand-50 border-brand-200" },
        { emoji: "🏆", value: data.totals.levelsCompleted, label: "Nivoi", tone: "bg-emerald-50 border-emerald-200" },
    ];

    return (
        <div className="space-y-6">
            <div className="animate-fade-up">
                <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Bravo, {childName}!</h2>
                <p className="mt-1 text-base font-semibold text-ink-soft">Ovo je tvoj napredak.</p>
            </div>

            <dl className="grid grid-cols-3 gap-3 sm:gap-4">
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
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className="truncate text-base font-extrabold text-ink sm:text-lg">{game.title}</p>
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
