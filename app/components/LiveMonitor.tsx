"use client";

// Praćenje uživo: roditelj/terapeut vidi isti ekran koji dete trenutno igra.
// Igra šalje svoje stanje (view) preko lib/realtime.ts, a ovde se ista komponenta
// igre iscrtava u režimu `isMonitor` sa tim stanjem.
// Praćenje je zajednička pažnja, a ne nadzor: dete na svom ekranu vidi znak da ga
// odrasli gleda, ništa se ne snima i odavde se igrom ne upravlja.
import { useCallback, useReducer, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { Radio, Users } from "lucide-react";
import type { BaseView, GameProps } from "@/app/components/games/kit/types";
import { Spinner } from "@/app/components/ui/Button";
import { Alert, Card } from "@/app/components/ui/Card";
import { cn } from "@/lib/cn";
import { MAX_LEVEL, getGameByType, type GameDefinition, type GameType } from "@/lib/games";
import { tierForLevel } from "@/lib/progress";
import { useGameMonitor, useTogetherWatch } from "@/lib/realtime";
import type { GameUpdate } from "@/lib/types";

interface LiveMonitorProps {
    childId: number;
    childName: string;
    /** Pol deteta: prikaz koristi iste oblike reči („gladna”, „pročitala”) koje vidi dete */
    gender?: string;
    /** Tajna tema kanala koju je napravio server; null u probnom prikazu bez praćenja */
    topic: string | null;
}

// ── Komponente igara ──────────────────────────────────────────────────────────

function MirrorLoading() {
    return (
        <div className="flex min-h-64 flex-1 items-center justify-center gap-2 text-sm font-bold text-ink-soft">
            <Spinner className="h-4 w-4" />
            Učitavanje igre…
        </div>
    );
}

// Svaka igra ima sopstveni tip stanja (GameProps<V extends BaseView>) i uklapa se u opšti
// GameProps bez kastovanja; igra koja odstupi od ugovora iz kit/types.ts ovde prijavljuje grešku.
// (next/dynamic traži da opcije budu objekat napisan na licu mesta, zato se ponavljaju.)
export const GAME_COMPONENTS: Record<GameType, ComponentType<GameProps>> = {
    shape_matching: dynamic(() => import("@/app/components/games/ShapeMatchingGame"), { ssr: false, loading: MirrorLoading }),
    memory: dynamic(() => import("@/app/components/games/MemoryGame"), { ssr: false, loading: MirrorLoading }),
    coloring: dynamic(() => import("@/app/components/games/ColoringGame"), { ssr: false, loading: MirrorLoading }),
    "sound-to-image": dynamic(() => import("@/app/components/games/SoundToImageGame"), { ssr: false, loading: MirrorLoading }),
    social: dynamic(() => import("@/app/components/games/SocialCommunicationGame"), { ssr: false, loading: MirrorLoading }),
    "social-story": dynamic(() => import("@/app/components/games/SocialStoryGame"), { ssr: false, loading: MirrorLoading }),
    emotions: dynamic(() => import("@/app/components/games/EmotionsGame"), { ssr: false, loading: MirrorLoading }),
    sorting: dynamic(() => import("@/app/components/games/SortingGame"), { ssr: false, loading: MirrorLoading }),
    sequence: dynamic(() => import("@/app/components/games/SequenceGame"), { ssr: false, loading: MirrorLoading }),
    where: dynamic(() => import("@/app/components/games/WhereGame"), { ssr: false, loading: MirrorLoading }),
    uses: dynamic(() => import("@/app/components/games/UsesGame"), { ssr: false, loading: MirrorLoading }),
    counting: dynamic(() => import("@/app/components/games/CountingGame"), { ssr: false, loading: MirrorLoading }),
    gaze: dynamic(() => import("@/app/components/games/GazeGame"), { ssr: false, loading: MirrorLoading }),
    letters: dynamic(() => import("@/app/components/games/LettersGame"), { ssr: false, loading: MirrorLoading }),
    numbers: dynamic(() => import("@/app/components/games/NumbersGame"), { ssr: false, loading: MirrorLoading }),
    food: dynamic(() => import("@/app/components/games/FoodGame"), { ssr: false, loading: MirrorLoading }),
    puzzle: dynamic(() => import("@/app/components/games/PuzzleGame"), { ssr: false, loading: MirrorLoading }),
    inset: dynamic(() => import("@/app/components/games/InsetGame"), { ssr: false, loading: MirrorLoading }),
    clock: dynamic(() => import("@/app/components/games/ClockGame"), { ssr: false, loading: MirrorLoading }),
    maze: dynamic(() => import("@/app/components/games/MazeGame"), { ssr: false, loading: MirrorLoading }),
    differences: dynamic(() => import("@/app/components/games/DifferencesGame"), { ssr: false, loading: MirrorLoading }),
    weather: dynamic(() => import("@/app/components/games/WeatherGame"), { ssr: false, loading: MirrorLoading }),
    market: dynamic(() => import("@/app/components/games/MarketGame"), { ssr: false, loading: MirrorLoading }),
    families: dynamic(() => import("@/app/components/games/FamilyGame"), { ssr: false, loading: MirrorLoading }),
    backpack: dynamic(() => import("@/app/components/games/BackpackGame"), { ssr: false, loading: MirrorLoading }),
    missing: dynamic(() => import("@/app/components/games/MissingGame"), { ssr: false, loading: MirrorLoading }),
    words: dynamic(() => import("@/app/components/games/WordsGame"), { ssr: false, loading: MirrorLoading }),
    breathing: dynamic(() => import("@/app/components/games/BreathingGame"), { ssr: false, loading: MirrorLoading }),
    simon: dynamic(() => import("@/app/components/games/SimonGame"), { ssr: false, loading: MirrorLoading }),
    rhythm: dynamic(() => import("@/app/components/games/RhythmGame"), { ssr: false, loading: MirrorLoading }),
    mixcolors: dynamic(() => import("@/app/components/games/MixColorsGame"), { ssr: false, loading: MirrorLoading }),
    plant: dynamic(() => import("@/app/components/games/PlantGame"), { ssr: false, loading: MirrorLoading }),
    hygiene: dynamic(() => import("@/app/components/games/HygieneGame"), { ssr: false, loading: MirrorLoading }),
};

const noop = () => {};

// ── Stanje monitora ───────────────────────────────────────────────────────────

/**
 * Stanje igre kako ga šalje dete: polja iz BaseView + nivo + sve što je specifično za igru.
 * `correctCount` su zadaci rešeni samostalno iz prvog pokušaja, `promptedCount` zadaci rešeni
 * tek uz pomoć (igra ga možda ne šalje), a `incorrectCount` pogrešni pokušaji.
 */
interface MonitorView extends Partial<BaseView> {
    level?: number;
    [key: string]: unknown;
}

export interface ActiveGame {
    game: GameDefinition;
    view: MonitorView;
    /** Menja se sa svakim novim početkom nivoa, da se ekran igre iscrta iz početka */
    session: number;
    phase: "playing" | "finished";
    updatedAt: string;
}

type FeedTone = "start" | "progress" | "finish" | "exit";

interface FeedEntry {
    id: number;
    at: string;
    text: string;
    tone: FeedTone;
}

interface MonitorState {
    active: ActiveGame | null;
    /** Najnovije prvo */
    feed: FeedEntry[];
    nextEntryId: number;
}

interface MonitorAction {
    update: GameUpdate;
    /** Vreme prijema — koristi se ako poruka nema ispravan `timestamp` */
    receivedAt: string;
}

const MAX_FEED_ENTRIES = 30;
const MAX_LOG_LENGTH = 240;
const INITIAL_STATE: MonitorState = { active: null, feed: [], nextEntryId: 1 };

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function levelOf(view: MonitorView | undefined): number {
    const level = asNumber(view?.level);
    return level === null ? 1 : Math.min(Math.max(Math.round(level), 1), MAX_LEVEL);
}

function withEntry(state: MonitorState, at: string, text: string, tone: FeedTone): Pick<MonitorState, "feed" | "nextEntryId"> {
    return {
        feed: [{ id: state.nextEntryId, at, text, tone }, ...state.feed].slice(0, MAX_FEED_ENTRIES),
        nextEntryId: state.nextEntryId + 1,
    };
}

function monitorReducer(state: MonitorState, { update, receivedAt }: MonitorAction): MonitorState {
    const data: MonitorView = isRecord(update.data) ? update.data : {};
    const at = Number.isNaN(Date.parse(update.timestamp)) ? receivedAt : update.timestamp;
    const active = state.active;

    if (update.event === "completed") {
        if (data.reason === "manual_exit") {
            return { ...withEntry(state, at, "Dete je izašlo iz igre", "exit"), active: null };
        }
        const game = getGameByType(update.gameType) ?? active?.game;
        const view: MonitorView = active && active.game.id === game?.id ? { ...active.view, ...data } : data;
        const finalScore = asNumber(data.finalScore) ?? asNumber(view.score) ?? 0;
        return {
            ...withEntry(state, at, `Završen nivo ${levelOf(view)} — ${finalScore} poena`, "finish"),
            active: game ? { game, view, session: active?.session ?? 1, phase: "finished", updatedAt: at } : null,
        };
    }

    const game = getGameByType(update.gameType);
    if (!game) return state;
    // Dete je zatražilo pauzu (ili se vratilo): samo zapis u toku aktivnosti, prikaz igre ostaje isti
    if (update.event === "progress" && (data.pause === "start" || data.pause === "end")) {
        return { ...state, ...withEntry(state, at, data.pause === "start" ? "Dete je uzelo pauzu" : "Dete nastavlja igru", "progress") };
    }
    const continues = active !== null && active.phase === "playing" && active.game.id === game.id;

    if (update.event === "started") {
        // Snimak stanja posle (ponovnog) povezivanja monitora: ista partija, samo osvežavamo sliku.
        if (update.isSync && continues && levelOf(active.view) === levelOf(data)) {
            return { ...state, active: { ...active, view: data, updatedAt: at } };
        }
        const text = update.isSync
            ? `Igra „${game.title}” je već u toku — nivo ${levelOf(data)}`
            : `Započeta igra „${game.title}” — nivo ${levelOf(data)}`;
        return {
            ...withEntry(state, at, text, "start"),
            active: { game, view: data, session: (active?.session ?? 0) + 1, phase: "playing", updatedAt: at },
        };
    }

    const log = typeof data.log === "string" ? data.log.trim().slice(0, MAX_LOG_LENGTH) : "";
    return {
        ...(log ? withEntry(state, at, log, "progress") : state),
        active: continues
            ? { ...active, view: { ...active.view, ...data }, updatedAt: at }
            : { game, view: data, session: (active?.session ?? 0) + 1, phase: "playing", updatedAt: at },
    };
}

// ── Komponenta ────────────────────────────────────────────────────────────────

export default function LiveMonitor({ childId, childName, gender, topic }: LiveMonitorProps) {
    // `key` garantuje čisto stanje ako se promeni dete koje se prati
    return <MonitorSession key={childId} childId={childId} childName={childName} gender={gender} topic={topic} />;
}

function MonitorSession({ childId, childName, gender, topic }: LiveMonitorProps) {
    const [state, dispatch] = useReducer(monitorReducer, INITIAL_STATE);

    const handleUpdate = useCallback(
        (update: GameUpdate) => {
            if (Number(update.childId) !== childId) return;
            dispatch({ update, receivedAt: new Date().toISOString() });
        },
        [childId]
    );
    const { isConnected, isConfigured } = useGameMonitor(childId, handleUpdate, topic);
    // Igra sa drugom na drugom uređaju: dete javlja samo ime druga
    const friend = useTogetherWatch(topic);
    const { active, feed } = state;

    return (
        <div className="space-y-6">
            <div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <ConnectionStatus isConnected={isConnected} isConfigured={isConfigured} />
                    {friend && (
                        <p role="status" className="inline-flex min-h-9 items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 text-sm font-extrabold text-orange-800">
                            <Users className="h-4 w-4" aria-hidden="true" />
                            Igra sa drugom: {friend}
                        </p>
                    )}
                    {isConfigured && (
                        <p className="text-sm text-ink-soft">Prikaz se osvežava sam, čim {childName} napravi potez u igri.</p>
                    )}
                </div>
                <p className="mt-2 text-sm text-ink-soft">Dete na svom ekranu vidi znak da ga odrasli gleda.</p>
            </div>

            {!isConfigured && (
                <Alert tone="info">
                    Za praćenje uživo potrebno je podesiti promenljive <code>NEXT_PUBLIC_SUPABASE_URL</code> i{" "}
                    <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
                </Alert>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                <div className="min-w-0 space-y-6">
                    {active ? (
                        <>
                            <NowPlaying active={active} />
                            <GameMirror active={active} childId={childId} gender={gender} />
                        </>
                    ) : (
                        <IdleCard childName={childName} isWaitingForConnection={isConfigured && !isConnected} />
                    )}
                </div>
                <ActivityFeed feed={feed} />
            </div>
        </div>
    );
}

// ── Status veze ───────────────────────────────────────────────────────────────

function ConnectionStatus({ isConnected, isConfigured }: { isConnected: boolean; isConfigured: boolean }) {
    const status = !isConfigured
        ? { label: "Realtime nije podešen", pill: "border-line bg-surface text-ink-soft", dot: "bg-slate-400" }
        : isConnected
          ? { label: "Povezano", pill: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" }
          : { label: "Povezivanje…", pill: "border-sun-200 bg-sun-50 text-sun-700", dot: "bg-sun-500 animate-pulse" };
    return (
        <p role="status" className={cn("inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-extrabold", status.pill)}>
            <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", status.dot)} />
            {status.label}
        </p>
    );
}

// ── Trenutna igra ─────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-canvas px-3 py-2.5">
            <dt className="text-xs font-bold text-ink-soft">{label}</dt>
            <dd className="mt-0.5 text-xl font-extrabold leading-tight text-ink">{value}</dd>
        </div>
    );
}

function NowPlaying({ active }: { active: ActiveGame }) {
    const { game, view, phase } = active;
    const level = levelOf(view);
    const show = (value: unknown) => String(asNumber(value) ?? "—");
    const round = asNumber(view.round);
    const totalRounds = asNumber(view.totalRounds);

    return (
        <Card aria-labelledby="monitor-now-playing" role="region">
            <div className="flex flex-wrap items-center gap-3">
                <span aria-hidden="true" className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl", game.accent.soft)}>
                    {game.icon}
                </span>
                <div className="min-w-40 flex-1">
                    <p className="text-xs font-bold text-ink-soft">{phase === "playing" ? "Trenutno igra" : "Nivo je završen"}</p>
                    <h2 id="monitor-now-playing" className="break-words text-xl font-extrabold text-ink">
                        {game.title}
                    </h2>
                </div>
                <span className={cn("rounded-full border px-3 py-1 text-xs font-extrabold", game.accent.soft, game.accent.text, game.accent.border)}>
                    Težina: {tierForLevel(level).label}
                </span>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Nivo" value={`${level} / ${MAX_LEVEL}`} />
                <Stat label="Zadatak" value={round === null || totalRounds === null ? "—" : `${round} / ${totalRounds}`} />
                <Stat label="Poeni" value={show(view.score)} />
                <Stat label="Samostalno" value={show(view.correctCount)} />
                <Stat label="Uz pomoć" value={show(view.promptedCount)} />
                <Stat label="Pokušaji" value={show(view.incorrectCount)} />
            </dl>

            <p className="mt-4 text-xs font-semibold text-ink-soft">
                Poslednja promena: <time dateTime={active.updatedAt}>{formatTime(active.updatedAt)}</time>
            </p>
        </Card>
    );
}

export function GameMirror({ active, childId, gender }: { active: ActiveGame; childId: number; gender?: string }) {
    const Game = GAME_COMPONENTS[active.game.gameType];
    const finished = active.phase === "finished";

    return (
        <Card padded={false} className="overflow-hidden" aria-labelledby="monitor-mirror" role="region">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3">
                <h2 id="monitor-mirror" className="text-base font-extrabold text-ink">
                    Ekran deteta (uživo)
                </h2>
                <p className="text-xs font-semibold text-ink-soft">
                    {finished ? "Nivo je završen — čeka se sledeći" : "Samo prikaz, bez upravljanja igrom"}
                </p>
            </div>
            {/* contain-content: sve što igra iscrta (i fiksirani slojevi) ostaje unutar okvira.
                Okvir je bar visok kao ekran deteta: igre koje tablu mere prema mestu koje imaju
                (Umetaljka, Sat, Složi sliku) bez stalne visine ne bi imale gde da nacrtaju tablu, a
                igra kojoj treba više mesta okvir i dalje produži (red mreže: najmanje — koliko treba). */}
            <div
                aria-hidden="true"
                inert
                className={cn(
                    "pointer-events-none grid select-none grid-cols-[minmax(0,1fr)] grid-rows-[minmax(clamp(30rem,72dvh,44rem),auto)] bg-canvas p-3 contain-content transition-opacity duration-300 sm:p-5",
                    finished && "opacity-50"
                )}
            >
                <Game
                    key={`${active.game.id}:${active.session}`}
                    childId={childId}
                    gender={gender}
                    level={levelOf(active.view)}
                    onComplete={noop}
                    isMonitor
                    monitorState={active.view}
                />
            </div>
        </Card>
    );
}

function IdleCard({ childName, isWaitingForConnection }: { childName: string; isWaitingForConnection: boolean }) {
    const steps = [
        `${childName} otvori igru na svom uređaju (telefon, tablet ili računar).`,
        "Ovde se odmah pojavi isti ekran igre, bez upravljanja.",
        "Sa strane pratite tok: tačne odgovore, pomoć i pauze.",
    ];
    return (
        <Card className="py-10 sm:py-14">
            <div className="mx-auto max-w-md text-center">
                <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600" aria-hidden="true">
                    <span className="absolute inset-0 animate-ping rounded-full bg-brand-100 opacity-60 motion-reduce:hidden" />
                    <Radio className="relative h-7 w-7" />
                </span>
                <h2 className="mt-4 text-xl font-extrabold text-ink">
                    {isWaitingForConnection ? "Povezivanje…" : `Čekamo da ${childName} pokrene igru`}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">Stranica može da ostane otvorena — sve se osvežava samo.</p>
            </div>
            <ol className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
                {steps.map((step, i) => (
                    <li key={step} className="rounded-xl bg-canvas p-3 text-sm font-semibold text-ink-soft">
                        <span className="mb-1 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs font-extrabold text-white">{i + 1}</span>
                        {step}
                    </li>
                ))}
            </ol>
        </Card>
    );
}

// ── Tok aktivnosti ────────────────────────────────────────────────────────────

const FEED_DOT: Record<FeedTone, string> = {
    start: "bg-brand-500",
    progress: "bg-slate-300",
    finish: "bg-emerald-500",
    exit: "bg-slate-500",
};

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("sr-Latn-RS");
}

function ActivityFeed({ feed }: { feed: FeedEntry[] }) {
    return (
        <Card padded={false} className="overflow-hidden lg:sticky lg:top-6" aria-labelledby="monitor-feed" role="region">
            <div className="border-b border-line px-5 py-3">
                <h2 id="monitor-feed" className="text-base font-extrabold text-ink">
                    Tok aktivnosti
                </h2>
            </div>
            {feed.length === 0 && <p className="px-5 py-10 text-center text-sm text-ink-soft">Događaji iz igre pojaviće se ovde.</p>}
            <ol aria-live="polite" aria-relevant="additions" className="scroll-soft max-h-[30rem] divide-y divide-line overflow-y-auto">
                {feed.map((entry) => (
                    <li key={entry.id} className="flex animate-fade items-start gap-3 px-5 py-3">
                        <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", FEED_DOT[entry.tone])} />
                        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-ink">{entry.text}</p>
                        <time dateTime={entry.at} className="shrink-0 pt-0.5 text-xs font-bold tabular-nums text-ink-soft">
                            {formatTime(entry.at)}
                        </time>
                    </li>
                ))}
            </ol>
        </Card>
    );
}
