// app/dashboard/child/[id]/GameContainer.tsx
"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowLeft, Eye, Lock, X } from "lucide-react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { Button } from "@/app/components/ui/Button";
import { SoundToggle } from "@/app/components/ui/SoundToggle";
import { playSfx, type GameProps, type GameResult } from "@/app/components/games/kit";
import { cn } from "@/lib/cn";
import {
    ADVANCE_RATIO,
    GAMES,
    LEVELS_PER_TIER,
    MAX_LEVEL,
    MOODS_THREE,
    getGame,
    starsFor,
    type GameDefinition,
    type GameId,
    type Mood,
} from "@/lib/games";
import { useGameBroadcast } from "@/lib/realtime";
import { useSpeech } from "@/lib/speech";
import { useSessionClock } from "./sessionClock";

// Svaka igra se učitava tek kada je dete izabere
const GameLoading = () => (
    <div className="grid flex-1 place-items-center" role="status" aria-label="Učitavanje igre">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
);

const GAME_COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
    shapes: dynamic(() => import("@/app/components/games/ShapeMatchingGame"), { ssr: false, loading: GameLoading }),
    memory: dynamic(() => import("@/app/components/games/MemoryGame"), { ssr: false, loading: GameLoading }),
    coloring: dynamic(() => import("@/app/components/games/ColoringGame"), { ssr: false, loading: GameLoading }),
    "sound-to-image": dynamic(() => import("@/app/components/games/SoundToImageGame"), { ssr: false, loading: GameLoading }),
    social: dynamic(() => import("@/app/components/games/SocialCommunicationGame"), { ssr: false, loading: GameLoading }),
    "social-story": dynamic(() => import("@/app/components/games/SocialStoryGame"), { ssr: false, loading: GameLoading }),
    emotions: dynamic(() => import("@/app/components/games/EmotionsGame"), { ssr: false, loading: GameLoading }),
};

type Tier = "easy" | "medium" | "hard";
type Screen = "picker" | "tiers" | "mood-before" | "playing" | "mood-after";

interface TierConfig {
    id: Tier;
    label: string;
    hint: string;
    emoji: string;
    min: number;
    lockedHint: string | null;
    dot: string;
    badge: string;
}

const TIERS: TierConfig[] = [
    { id: "easy", label: "Lako", hint: "Za početak", emoji: "🌱", min: 1, lockedHint: null, dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800" },
    { id: "medium", label: "Srednje", hint: "Malo teže", emoji: "⚡", min: 6, lockedHint: "Prvo završi lake nivoe", dot: "bg-sun-500", badge: "bg-sun-100 text-sun-700" },
    { id: "hard", label: "Teško", hint: "Najteže", emoji: "🚀", min: 11, lockedHint: "Prvo završi srednje nivoe", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-700" },
];

const tierOf = (id: Tier) => TIERS.find((t) => t.id === id)!;
const tierMax = (tier: TierConfig) => tier.min + LEVELS_PER_TIER - 1;

/** Koliko je nivoa u ovom rangu završeno (0–5), ako je `unlocked` sledeći otključani nivo. */
function completedInTier(tier: TierConfig, unlocked: number): number {
    return Math.min(Math.max(unlocked - tier.min, 0), LEVELS_PER_TIER);
}

function isTierUnlocked(tier: TierConfig, unlocked: number): boolean {
    return unlocked >= tier.min;
}

/** Sledeći nezavršeni nivo u rangu; ako je ceo rang završen, kreće se ispočetka. */
function startLevelFor(tier: TierConfig, unlocked: number): number {
    const done = completedInTier(tier, unlocked);
    return done < LEVELS_PER_TIER ? tier.min + done : tier.min;
}

/** Pre isteka dnevnog vremena dete dobija najavu na kraju nivoa, da prelaz ne bude nagao */
const LAST_LEVEL_WARNING_SEC = 180;
const ADULT_EXTRA_MINUTES = 10;

interface LevelOutcome {
    stars: 1 | 2 | 3;
    /** Zadaci rešeni samostalno, iz prvog pokušaja */
    correct: number;
    total: number;
    score: number;
    /** Dovoljno samostalnih odgovora da se predloži sledeći nivo */
    advance: boolean;
    saved: "saving" | "ok" | "failed";
}

interface GameContainerProps {
    childId: number;
    childName: string;
    gender?: string;
    /** Odrasli trenutno prati igru uživo — detetu se prikazuje stalan znak */
    watched?: boolean;
    /** Javlja roditeljskoj komponenti novi zbir poena posle sačuvanog nivoa */
    onExperienceChange?: (points: number) => void;
    /** Probni režim (razvoj): bez mreže, svi nivoi otključani, bez dnevnog ograničenja */
    preview?: boolean;
}

export default function GameContainer({ childId, childName, gender, watched = false, onExperienceChange, preview = false }: GameContainerProps) {
    const settings = useChildSettings();
    const { say } = useSpeech(gender);
    const publish = useGameBroadcast(childId, !preview);

    const [screen, setScreen] = useState<Screen>("picker");
    const [gameId, setGameId] = useState<GameId | null>(null);
    const [tierId, setTierId] = useState<Tier>("easy");
    const [level, setLevel] = useState(1);
    /** Menja se pri ponavljanju istog nivoa da bi se igra ponovo montirala */
    const [attempt, setAttempt] = useState(0);
    const [outcome, setOutcome] = useState<LevelOutcome | null>(null);

    const [unlocked, setUnlocked] = useState<Record<string, number>>(() =>
        preview ? Object.fromEntries(GAMES.map((g) => [g.id, MAX_LEVEL + 1])) : {}
    );
    const [levelsLoading, setLevelsLoading] = useState(!preview);

    // Raspoloženje (ako je uključeno) pitamo jednom po poseti i posle odigrane igre; uvek može da se preskoči
    const askMood = settings.moodCheck !== "off" && !preview;
    const [moodBefore, setMoodBefore] = useState<Mood | null>(null);
    const [moodAsked, setMoodAsked] = useState(false);
    const sessionLogIds = useRef<number[]>([]);
    const completingRef = useRef(false);

    const clock = useSessionClock(childId, preview ? 0 : settings.sessionMinutes, screen === "playing" && !outcome);

    const game = gameId ? getGame(gameId) : null;
    const tier = tierOf(tierId);
    const unlockedFor = (id: GameId) => unlocked[id] ?? 1;

    useEffect(() => {
        if (preview) return;
        const controller = new AbortController();
        fetch(`/api/children/${childId}/unlocked-levels`, { cache: "no-store", signal: controller.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.unlockedLevels) setUnlocked(data.unlockedLevels);
            })
            .catch(() => {})
            .finally(() => {
                if (!controller.signal.aborted) setLevelsLoading(false);
            });
        return () => controller.abort();
    }, [childId, preview]);

    // Dok je igra otvorena, stranica ispod se ne skroluje
    useEffect(() => {
        if (screen === "picker") return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [screen]);

    // ── Navigacija ─────────────────────────────────────────────────────────────

    const openGame = (id: GameId) => {
        if (clock.limitReached) return;
        playSfx("tap");
        setGameId(id);
        setOutcome(null);
        setScreen("tiers");
    };

    const startLevel = (nextTier: Tier, nextLevel: number) => {
        completingRef.current = false;
        setTierId(nextTier);
        setLevel(nextLevel);
        setAttempt((a) => a + 1);
        setOutcome(null);
        setScreen("playing");
    };

    const chooseTier = (next: TierConfig) => {
        if (!gameId || !isTierUnlocked(next, unlockedFor(gameId))) return;
        playSfx("tap");
        const nextLevel = startLevelFor(next, unlockedFor(gameId));
        if (askMood && !moodAsked) {
            setTierId(next.id);
            setLevel(nextLevel);
            setScreen("mood-before");
        } else {
            startLevel(next.id, nextLevel);
        }
    };

    const backToPicker = useCallback(() => {
        setScreen("picker");
        setGameId(null);
        setOutcome(null);
    }, []);

    /** Izlaz iz igre: ako je nešto odigrano (i pitanje je uključeno), pitamo kako se dete sada oseća. */
    const leaveGame = () => {
        if (screen === "playing" && game && !outcome) {
            publish({
                childId,
                activityId: game.activityId,
                gameType: game.gameType,
                event: "completed",
                data: { reason: "manual_exit", level },
                timestamp: new Date().toISOString(),
            });
        }
        if (askMood && sessionLogIds.current.length > 0) {
            setOutcome(null);
            setScreen("mood-after");
        } else {
            sessionLogIds.current = [];
            backToPicker();
        }
    };

    const handleMoodAfter = (mood: Mood | null) => {
        const logIds = sessionLogIds.current;
        sessionLogIds.current = [];
        if (mood && logIds.length > 0) {
            void fetch("/api/activities/complete", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ childId, logIds, moodAfter: mood }),
            }).catch(() => {});
        }
        backToPicker();
    };

    // ── Kraj nivoa ─────────────────────────────────────────────────────────────

    const handleComplete = useCallback(
        async (result: GameResult) => {
            if (completingRef.current || !game) return;
            completingRef.current = true;

            // Završen nivo uvek donosi bar jednu zvezdicu; sledeći nivo se predlaže
            // kada je bar polovina zadataka rešena samostalno
            const stars = Math.max(1, starsFor(result.correct, result.total)) as 1 | 2 | 3;
            // U igrama bez pogrešnih odgovora (osećanja) svaki završen nivo vodi dalje
            const advance = !game.graded || (result.total > 0 && result.correct / result.total >= ADVANCE_RATIO);
            setOutcome({
                stars,
                correct: result.correct,
                total: result.total,
                score: result.score,
                advance,
                saved: preview ? "ok" : "saving",
            });
            playSfx("win");

            if (advance) {
                setUnlocked((prev) => ({
                    ...prev,
                    [game.id]: Math.min(Math.max(prev[game.id] ?? 1, level + 1), MAX_LEVEL + 1),
                }));
            }
            const starWords = stars === 1 ? "Jedna zvezdica" : stars === 2 ? "Dve zvezdice" : "Tri zvezdice";
            void say(advance ? `Nivo je završen. ${starWords}.` : `Nivo je završen. ${starWords}. Hajde još jednom.`);

            if (preview) return;
            try {
                const res = await fetch("/api/activities/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        childId,
                        activityId: game.activityId,
                        level,
                        score: result.score,
                        correct: result.correct,
                        total: result.total,
                        prompted: result.prompted ?? 0,
                        durationSec: result.durationSec,
                        moodBefore,
                    }),
                });
                if (!res.ok) throw new Error("save_failed");
                const data = await res.json();
                if (typeof data.logId === "number") sessionLogIds.current.push(data.logId);
                if (typeof data.experiencePoints === "number") onExperienceChange?.(data.experiencePoints);
                setOutcome((prev) => (prev ? { ...prev, saved: "ok" } : prev));
            } catch {
                setOutcome((prev) => (prev ? { ...prev, saved: "failed" } : prev));
            }
        },
        [game, level, childId, moodBefore, onExperienceChange, preview, say]
    );

    // ── Ekrani ─────────────────────────────────────────────────────────────────

    if (screen === "picker" || !game) {
        if (clock.limitReached) {
            return <RestCard childName={childName} onExtend={() => clock.addMinutes(ADULT_EXTRA_MINUTES)} />;
        }
        return (
            <section aria-labelledby="games-heading">
                <h2 id="games-heading" className="mb-4 text-xl font-extrabold text-ink sm:mb-5 sm:text-2xl">
                    Izaberi igru
                </h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                    {GAMES.map((g, index) => (
                        <li key={g.id}>
                            <GameCard game={g} unlocked={unlockedFor(g.id)} loading={levelsLoading} priority={index < 3} onOpen={() => openGame(g.id)} />
                        </li>
                    ))}
                </ul>
            </section>
        );
    }

    const maxUnlocked = unlockedFor(game.id);
    const lastLevelSoon = clock.remainingSec !== null && clock.remainingSec <= LAST_LEVEL_WARNING_SEC;

    return (
        <div className="fixed inset-0 z-[6000] flex flex-col bg-canvas" role="dialog" aria-modal="true" aria-label={game.title}>
            {/* Zaglavlje igre — ista mesta dugmadi u svim igrama */}
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:h-18 sm:gap-3 sm:px-5">
                {screen === "playing" ? (
                    <button
                        type="button"
                        onClick={() => {
                            setOutcome(null);
                            setScreen("tiers");
                        }}
                        aria-label="Nazad na izbor težine"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-brand-50 hover:text-ink"
                    >
                        <ArrowLeft className="h-6 w-6" aria-hidden="true" />
                    </button>
                ) : (
                    <span className="w-1 shrink-0 sm:w-2" />
                )}
                <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-2xl", game.accent.gradient)} aria-hidden="true">
                    {game.icon}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-extrabold leading-tight text-ink sm:text-lg">{game.title}</p>
                    {screen === "playing" && (
                        <p className="flex items-center gap-2 whitespace-nowrap text-xs font-bold text-ink-soft sm:text-sm">
                            <span className={cn("rounded-full px-2 py-0.5", tier.badge)}>{tier.label}</span>
                            <span aria-label={`Nivo ${level - tier.min + 1} od ${LEVELS_PER_TIER}`}>
                                Nivo {level - tier.min + 1}/{LEVELS_PER_TIER}
                            </span>
                        </p>
                    )}
                </div>
                {watched && <WatchedBadge />}
                <SoundToggle />
                <button
                    type="button"
                    onClick={leaveGame}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border-2 border-line bg-surface px-3 text-sm font-extrabold text-ink-soft transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:px-4"
                >
                    <X className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden sm:inline">Zatvori</span>
                    <span className="sr-only sm:hidden">Zatvori</span>
                </button>
            </header>

            <div className="scroll-soft relative flex flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
                {screen === "tiers" && <TierPicker game={game} unlocked={maxUnlocked} onChoose={chooseTier} />}

                {screen === "mood-before" && (
                    <MoodPicker
                        title="Kako si danas?"
                        subtitle="Dodirni lice"
                        onSelect={(mood) => {
                            setMoodBefore(mood);
                            setMoodAsked(true);
                            startLevel(tierId, level);
                        }}
                    />
                )}

                {screen === "mood-after" && <MoodPicker title="Kako si sada?" subtitle="Dodirni lice" onSelect={handleMoodAfter} />}

                {screen === "playing" && (
                    <GameSlot key={`${game.id}-${level}-${attempt}`} gameId={game.id} childId={childId} level={level} gender={gender} onComplete={handleComplete} />
                )}
            </div>

            {screen === "playing" && outcome && (
                <LevelResult
                    outcome={outcome}
                    childName={childName}
                    game={game}
                    tier={tier}
                    level={level}
                    showNumbers={settings.preset.showPoints}
                    limitReached={clock.limitReached}
                    lastLevelSoon={lastLevelSoon}
                    onNext={() => startLevel(tierId, level + 1)}
                    onNextTier={(next) => startLevel(next.id, next.min)}
                    onRetry={() => startLevel(tierId, level)}
                    onLeave={leaveGame}
                />
            )}
        </div>
    );
}

// ── Igra (izdvojeno da se ne renderuje ponovo kad se promeni overlay) ─────────

function GameSlot({ gameId, ...props }: { gameId: GameId } & GameProps) {
    const Game = GAME_COMPONENTS[gameId];
    return <Game {...props} />;
}

/** Stalan znak detetu da ga odrasli gleda uživo (dete ima pravo da to zna). */
export function WatchedBadge() {
    return (
        <span
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-sun-100 px-2.5 text-xs font-extrabold text-sun-700 ring-1 ring-sun-300 sm:px-3 sm:text-sm"
            role="status"
        >
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Odrasli gleda</span>
            <span className="sr-only sm:hidden">Odrasli gleda tvoju igru</span>
        </span>
    );
}

// ── Kartica igre ──────────────────────────────────────────────────────────────

function GameCard({ game, unlocked, loading, priority, onOpen }: { game: GameDefinition; unlocked: number; loading: boolean; priority: boolean; onOpen: () => void }) {
    // `unlocked` = poslednji položeni nivo + 1 (16 znači da je položeno svih 15)
    const done = Math.min(Math.max(unlocked - 1, 0), MAX_LEVEL);
    const allDone = done >= MAX_LEVEL;
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group flex w-full flex-col overflow-hidden rounded-card border-2 border-b-[6px] border-line bg-surface text-left shadow-soft transition-[transform,border-color,box-shadow] hover:border-brand-300 hover:shadow-lift active:translate-y-[3px] active:border-b-2"
        >
            <span className="relative block aspect-[16/9] w-full overflow-hidden bg-brand-50">
                <Image
                    src={game.image}
                    alt=""
                    fill
                    priority={priority}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                />
            </span>
            <span className="flex items-center gap-3 p-4">
                <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-2xl", game.accent.gradient)} aria-hidden="true">
                    {game.icon}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-lg font-extrabold text-ink sm:text-xl">{game.title}</span>
                    <span className="block truncate text-sm font-semibold text-ink-soft">{game.description}</span>
                </span>
            </span>
            <span className="flex items-center gap-3 border-t border-line px-4 py-3">
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-100" aria-hidden="true">
                    <span
                        className={cn("block h-full rounded-full transition-[width] duration-500", game.accent.solid, loading && "opacity-0")}
                        style={{ width: `${(done / MAX_LEVEL) * 100}%` }}
                    />
                </span>
                <span className="shrink-0 text-xs font-extrabold text-ink-soft">
                    {loading ? "…" : allDone ? "Sve završeno 🏆" : `${done} / ${MAX_LEVEL} nivoa`}
                </span>
            </span>
        </button>
    );
}

// ── Kraj za danas (isteklo dnevno vreme) ──────────────────────────────────────

function RestCard({ childName, onExtend }: { childName: string; onExtend: () => void }) {
    return (
        <section className="mx-auto max-w-xl rounded-card border border-line bg-surface p-6 text-center shadow-soft sm:p-10" aria-labelledby="rest-heading">
            <p className="text-6xl" aria-hidden="true">🌙</p>
            <h2 id="rest-heading" className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">
                Za danas smo završili
            </h2>
            <p className="mt-2 text-lg font-semibold text-ink-soft">Lepo je bilo igrati, {childName}. Vidimo se sledeći put.</p>
            <div className="mt-8 border-t border-line pt-5 normal-case">
                <p className="mb-3 text-sm font-semibold text-ink-faint">Za odrasle: dnevno vreme igre je isteklo.</p>
                <HoldButton label={`Držite 2 sekunde za još ${ADULT_EXTRA_MINUTES} minuta`} onConfirm={onExtend} />
            </div>
        </section>
    );
}

/** Dugme koje se aktivira tek posle držanja — malo dete ga neće slučajno pritisnuti. */
function HoldButton({ label, onConfirm, holdMs = 2000 }: { label: string; onConfirm: () => void; holdMs?: number }) {
    const [holding, setHolding] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancel = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        setHolding(false);
    };
    const start = () => {
        cancel();
        setHolding(true);
        timer.current = setTimeout(() => {
            timer.current = null;
            setHolding(false);
            onConfirm();
        }, holdMs);
    };

    useEffect(() => () => {
        if (timer.current) clearTimeout(timer.current);
    }, []);

    return (
        <button
            type="button"
            onPointerDown={start}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
            onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !e.repeat) start();
            }}
            onKeyUp={cancel}
            onContextMenu={(e) => e.preventDefault()}
            className="relative inline-flex min-h-11 select-none items-center overflow-hidden rounded-xl border border-line bg-canvas px-4 text-sm font-extrabold text-ink-soft"
        >
            <span
                className="absolute inset-y-0 left-0 bg-brand-200"
                style={{ width: holding ? "100%" : "0%", transition: holding ? `width ${holdMs}ms linear` : "none" }}
                aria-hidden="true"
            />
            <span className="relative">{label}</span>
        </button>
    );
}

// ── Izbor težine ──────────────────────────────────────────────────────────────

function TierPicker({ game, unlocked, onChoose }: { game: GameDefinition; unlocked: number; onChoose: (tier: TierConfig) => void }) {
    return (
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center">
            <div className="mb-6 text-center sm:mb-10">
                <h2 className="text-2xl font-extrabold text-ink sm:text-4xl">Izaberi težinu</h2>
                <p className="mt-1 text-base font-semibold text-ink-soft sm:text-lg">{game.description}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-3 sm:gap-5">
                {TIERS.map((t) => {
                    const open = isTierUnlocked(t, unlocked);
                    const done = completedInTier(t, unlocked);
                    const complete = done === LEVELS_PER_TIER;
                    return (
                        <li key={t.id}>
                            <button
                                type="button"
                                disabled={!open}
                                onClick={() => onChoose(t)}
                                className={cn(
                                    "flex w-full items-center gap-4 rounded-card border-2 border-b-[6px] p-4 text-left transition-[transform,border-color,box-shadow] sm:flex-col sm:gap-3 sm:p-7 sm:text-center",
                                    open
                                        ? "border-line bg-surface shadow-soft hover:border-brand-300 hover:shadow-lift active:translate-y-[3px] active:border-b-2"
                                        : "cursor-not-allowed border-line bg-canvas"
                                )}
                            >
                                <span
                                    className={cn("grid h-16 w-16 shrink-0 place-items-center rounded-full text-4xl sm:h-24 sm:w-24 sm:text-5xl", open ? "bg-brand-50" : "bg-line/60")}
                                    aria-hidden="true"
                                >
                                    {open ? t.emoji : <Lock className="h-7 w-7 text-ink-faint sm:h-9 sm:w-9" />}
                                </span>
                                <span className="min-w-0 flex-1 sm:flex-none">
                                    <span className={cn("block font-display text-xl font-extrabold sm:text-2xl", open ? "text-ink" : "text-ink-faint")}>{t.label}</span>
                                    <span className="block text-sm font-semibold text-ink-soft">
                                        {open ? (complete ? "Sve završeno. Igraj ponovo." : t.hint) : t.lockedHint}
                                    </span>
                                    <span className="mt-2.5 flex gap-1.5 sm:justify-center" aria-label={`Završeno ${done} od ${LEVELS_PER_TIER} nivoa`}>
                                        {Array.from({ length: LEVELS_PER_TIER }, (_, i) => (
                                            <span key={i} className={cn("h-3 w-3 rounded-full sm:h-3.5 sm:w-3.5", i < done ? t.dot : "bg-brand-100")} />
                                        ))}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// ── Raspoloženje ──────────────────────────────────────────────────────────────
// Tri lica (mlađa deca ne razlikuju pouzdano više stupnjeva); uvek može da se preskoči.

function MoodPicker({ title, subtitle, onSelect }: { title: string; subtitle: string; onSelect: (mood: Mood | null) => void }) {
    return (
        <div className="mx-auto flex w-full max-w-2xl flex-1 animate-fade-up flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-extrabold text-ink sm:text-4xl">{title}</h2>
            <p className="mt-1 text-base font-semibold text-ink-soft sm:text-lg">{subtitle}</p>
            <ul className="mt-6 grid w-full grid-cols-3 gap-3 sm:mt-10 sm:gap-5">
                {MOODS_THREE.map((mood) => (
                    <li key={mood.value}>
                        <button
                            type="button"
                            onClick={() => {
                                playSfx("tap");
                                onSelect(mood.value);
                            }}
                            className="flex w-full flex-col items-center gap-2 rounded-tile border-2 border-b-[5px] border-line bg-surface px-2 py-5 shadow-soft transition-[transform,border-color] hover:border-brand-300 hover:bg-brand-50 active:translate-y-[3px] active:border-b-2 sm:py-8"
                        >
                            <span className="text-6xl sm:text-7xl" aria-hidden="true">{mood.emoji}</span>
                            <span className="text-lg font-extrabold text-ink sm:text-xl">{mood.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
            <button
                type="button"
                onClick={() => onSelect(null)}
                className="mt-6 min-h-12 rounded-xl px-5 text-base font-extrabold text-ink-soft hover:bg-brand-50 hover:text-ink"
            >
                Preskoči
            </button>
        </div>
    );
}

// ── Rezultat nivoa ────────────────────────────────────────────────────────────
// Nema ishoda „nisi uspeo”: svaki završen nivo donosi zvezdicu. Kada je bilo mnogo
// pomoći, prvo se nudi ista vežba još jednom. „Gotovo” je uvek jednako vidljivo.

interface LevelResultProps {
    outcome: LevelOutcome;
    childName: string;
    game: GameDefinition;
    tier: TierConfig;
    level: number;
    showNumbers: boolean;
    limitReached: boolean;
    lastLevelSoon: boolean;
    onNext: () => void;
    onNextTier: (tier: TierConfig) => void;
    onRetry: () => void;
    onLeave: () => void;
}

function LevelResult({ outcome, childName, game, tier, level, showNumbers, limitReached, lastLevelSoon, onNext, onNextTier, onRetry, onLeave }: LevelResultProps) {
    const lastInTier = level >= tierMax(tier);
    const nextTier = TIERS[TIERS.findIndex((t) => t.id === tier.id) + 1] ?? null;
    const champion = outcome.advance && lastInTier && !nextTier;

    let title = "Nivo je završen";
    let text = "";
    if (champion) {
        title = `Svi nivoi su završeni, ${childName}`;
        text = `Igra „${game.title}” je cela pređena.`;
    } else if (outcome.advance && lastInTier) {
        text = `Svi nivoi na težini „${tier.label}” su završeni.`;
    } else if (!outcome.advance) {
        text = "Ovaj nivo vežbamo još malo.";
    }
    if (limitReached) text = "Za danas smo završili. Vidimo se sledeći put.";

    return (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="alertdialog" aria-modal="true" aria-label={title}>
            <div className="max-h-full w-full max-w-md animate-fade-up overflow-y-auto rounded-t-[2rem] bg-surface p-6 text-center shadow-pop sm:rounded-[2rem] sm:p-9">
                <div className="mb-4 flex justify-center gap-2 sm:gap-3" aria-label={`${outcome.stars} od 3 zvezdice`}>
                    {[1, 2, 3].map((s) => (
                        <span key={s} className={cn("text-5xl sm:text-6xl", s <= outcome.stars ? "animate-pop" : "opacity-20 grayscale")} aria-hidden="true">
                            ⭐
                        </span>
                    ))}
                </div>
                <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
                    {champion ? "🏆 " : ""}
                    {title}
                </h2>
                {showNumbers && !limitReached && game.graded && (
                    <p className="mt-1 text-base font-bold text-ink-soft">
                        Iz prvog pokušaja: {outcome.correct} od {outcome.total}
                    </p>
                )}
                {text && <p className="mt-2 text-base font-semibold text-ink-soft sm:text-lg">{text}</p>}
                {lastLevelSoon && !limitReached && (
                    <p className="mt-3 rounded-xl bg-sun-50 px-3 py-2 text-base font-extrabold text-sun-700">Još jedan nivo, pa pauza.</p>
                )}

                <div className="mt-6 flex flex-col gap-3">
                    {!limitReached && !outcome.advance && (
                        <Button chunky size="xl" variant="sun" block onClick={onRetry}>
                            Igraj još jednom
                        </Button>
                    )}
                    {!limitReached && outcome.advance && !lastInTier && (
                        <Button chunky size="xl" variant="success" block onClick={onNext}>
                            Sledeći nivo →
                        </Button>
                    )}
                    {!limitReached && outcome.advance && lastInTier && nextTier && (
                        <Button chunky size="xl" variant="success" block onClick={() => onNextTier(nextTier)}>
                            Igraj „{nextTier.label}” →
                        </Button>
                    )}
                    {/* „Gotovo” je jednako veliko kao nastavak: prestanak igre je dobar izbor */}
                    <Button chunky size="xl" variant="secondary" block onClick={onLeave}>
                        {limitReached ? "Gotovo za danas" : "Gotovo"}
                    </Button>
                    {!limitReached && outcome.advance && (
                        <Button size="lg" variant="ghost" block onClick={onRetry}>
                            Igraj ovaj nivo ponovo
                        </Button>
                    )}
                </div>

                <p className="mt-4 border-t border-line pt-3 text-sm font-semibold normal-case text-ink-faint">
                    <span className="font-extrabold text-ink-soft">Za odrasle:</span> {game.offscreenTip}
                </p>
                <p className="mt-1 min-h-5 text-xs font-bold normal-case text-ink-faint" aria-live="polite">
                    {outcome.saved === "failed" && "Rezultat nije sačuvan (nema veze sa serverom)."}
                </p>
            </div>
        </div>
    );
}
