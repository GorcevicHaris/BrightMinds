// app/dashboard/child/[id]/GameContainer.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type SyntheticEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, Eye, Lock, Pause, Play, RotateCcw, SkipForward, Star, X } from "lucide-react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { CoinIcon } from "@/app/components/ui/CoinIcon";
import { Button } from "@/app/components/ui/Button";
import { SoundToggle } from "@/app/components/ui/SoundToggle";
import {
    CelebrationLayer,
    celebrateBigWhenSettled,
    CompanionPanelContext,
    flyItems,
    FLY_MS,
    GamePauseContext,
    GameTeacherContext,
    HypeBubble,
    HypePlus,
    playSfx,
    useCompanionHype,
    useInputGuard,
    useWideScreen,
    type GameProps,
    type GameResult,
} from "@/app/components/games/kit";
import { useSpeakingLock, useVoiceState } from "@/lib/voice";
import CompanionPicture from "@/app/components/avatar3d/CompanionPicture";
import CompanionStage from "@/app/components/avatar3d/CompanionStage";
import type { CompanionAction as CompanionMove } from "@/app/components/avatar/Companion";
import { useCalmMotion } from "@/app/components/avatar/motion";
import TeacherAvatar from "@/app/components/avatar/TeacherAvatar";
import type { VoiceEmotion as TeacherEmotion } from "@/lib/emotion";
import { COINS_PER_STAR } from "@/lib/companion";
import { chosenSkin, useCompanion } from "./companionState";
import { coinWord, GoalChip } from "./companionUi";
import { MoodFace, type MoodFaceKind } from "@/app/components/games/MoodFace";
import { cn } from "@/lib/cn";
import {
    ADVANCE_RATIO,
    GAMES,
    LEVELS_PER_TIER,
    MAX_LEVEL,
    MOODS_THREE,
    getGame,
    starsForGame,
    type GameDefinition,
    type GameId,
    type Mood,
} from "@/lib/games";
import { pickerGames } from "@/lib/gameAccess";
import { useGameBroadcast } from "@/lib/realtime";
import { useSpeech } from "@/lib/speech";
import type { VoiceEmotion } from "@/lib/emotion";
import { usePlanProgress } from "./planProgress";
// Mapa igara i „Igraj sa drugom” (GameMap.tsx, playTogether.tsx)
import { GamePicker } from "./GameMap";
import { TogetherEnd, TurnTakingLayer, useTogetherEnd } from "./playTogether";
import { useSessionClock } from "./sessionClock";

// Svaka igra se učitava tek kada je dete izabere
const GameLoading = () => (
    <div className="grid flex-1 place-items-center" role="status" aria-label="Učitavanje igre">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
    </div>
);

// Svaka igra je zaseban deo koda: preuzima se tek kad zatreba, a počinje da se
// preuzima čim dete otvori igru (dok bira težinu), pa nivo kreće bez čekanja.
const GAME_LOADERS = {
    shapes: () => import("@/app/components/games/ShapeMatchingGame"),
    memory: () => import("@/app/components/games/MemoryGame"),
    coloring: () => import("@/app/components/games/ColoringGame"),
    "sound-to-image": () => import("@/app/components/games/SoundToImageGame"),
    social: () => import("@/app/components/games/SocialCommunicationGame"),
    "social-story": () => import("@/app/components/games/SocialStoryGame"),
    emotions: () => import("@/app/components/games/EmotionsGame"),
    sorting: () => import("@/app/components/games/SortingGame"),
    sequence: () => import("@/app/components/games/SequenceGame"),
    where: () => import("@/app/components/games/WhereGame"),
    uses: () => import("@/app/components/games/UsesGame"),
    counting: () => import("@/app/components/games/CountingGame"),
    gaze: () => import("@/app/components/games/GazeGame"),
    letters: () => import("@/app/components/games/LettersGame"),
    numbers: () => import("@/app/components/games/NumbersGame"),
} satisfies Record<GameId, () => Promise<{ default: ComponentType<GameProps> }>>;

const GAME_COMPONENTS: Record<GameId, ComponentType<GameProps>> = {
    shapes: dynamic(GAME_LOADERS["shapes"], { ssr: false, loading: GameLoading }),
    memory: dynamic(GAME_LOADERS["memory"], { ssr: false, loading: GameLoading }),
    coloring: dynamic(GAME_LOADERS["coloring"], { ssr: false, loading: GameLoading }),
    "sound-to-image": dynamic(GAME_LOADERS["sound-to-image"], { ssr: false, loading: GameLoading }),
    social: dynamic(GAME_LOADERS["social"], { ssr: false, loading: GameLoading }),
    "social-story": dynamic(GAME_LOADERS["social-story"], { ssr: false, loading: GameLoading }),
    emotions: dynamic(GAME_LOADERS["emotions"], { ssr: false, loading: GameLoading }),
    sorting: dynamic(GAME_LOADERS["sorting"], { ssr: false, loading: GameLoading }),
    sequence: dynamic(GAME_LOADERS["sequence"], { ssr: false, loading: GameLoading }),
    where: dynamic(GAME_LOADERS["where"], { ssr: false, loading: GameLoading }),
    uses: dynamic(GAME_LOADERS["uses"], { ssr: false, loading: GameLoading }),
    counting: dynamic(GAME_LOADERS["counting"], { ssr: false, loading: GameLoading }),
    gaze: dynamic(GAME_LOADERS["gaze"], { ssr: false, loading: GameLoading }),
    letters: dynamic(GAME_LOADERS["letters"], { ssr: false, loading: GameLoading }),
    numbers: dynamic(GAME_LOADERS["numbers"], { ssr: false, loading: GameLoading }),
};

function preloadGame(id: GameId) {
    void GAME_LOADERS[id]().catch(() => {
        /* bez mreže: igra će pokušati ponovo kad se otvori nivo */
    });
}

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
    /** Broj zvezdica na znački težine (1–3) */
    stars: 1 | 2 | 3;
    /** Boje težine na mapi nivoa */
    look: { solid: string; edge: string; ring: string; text: string; soft: string; track: string };
}

const TIERS: TierConfig[] = [
    {
        id: "easy",
        label: "Lako",
        hint: "Za početak",
        emoji: "🌱",
        min: 1,
        lockedHint: null,
        dot: "bg-emerald-500",
        badge: "bg-emerald-100 text-emerald-800",
        stars: 1,
        look: { solid: "bg-emerald-500", edge: "border-emerald-700", ring: "ring-emerald-200", text: "text-emerald-700", soft: "bg-emerald-50", track: "bg-emerald-400" },
    },
    {
        id: "medium",
        label: "Srednje",
        hint: "Malo teže",
        emoji: "⚡",
        min: 6,
        lockedHint: "Prvo završi lake nivoe",
        dot: "bg-sun-500",
        badge: "bg-sun-100 text-sun-700",
        stars: 2,
        look: { solid: "bg-sun-400", edge: "border-sun-600", ring: "ring-sun-200", text: "text-sun-700", soft: "bg-sun-50", track: "bg-sun-400" },
    },
    {
        id: "hard",
        label: "Teško",
        hint: "Najteže",
        emoji: "🚀",
        min: 11,
        lockedHint: "Prvo završi srednje nivoe",
        dot: "bg-rose-500",
        badge: "bg-rose-100 text-rose-700",
        stars: 3,
        look: { solid: "bg-rose-500", edge: "border-rose-700", ring: "ring-rose-200", text: "text-rose-700", soft: "bg-rose-50", track: "bg-rose-400" },
    },
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
    /** Aktivnost bez ocenjivanih zadataka (npr. priča u režimu samo čitanja) */
    practice: boolean;
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
    /** Javlja stranici da je otvoren ekran igre preko cele strane (ostatak postaje neaktivan) */
    onOverlayChange?: (open: boolean) => void;
    /** Probni režim (razvoj): bez mreže, svi nivoi otključani, bez dnevnog ograničenja */
    preview?: boolean;
    /** Samo u probnom prikazu: sledeći otključani nivo u svim igrama (podrazumevano je sve otključano) */
    previewUnlocked?: number;
    /** Uzrast u godinama (mapa je podrazumevana do 7 godina); null = nepoznat */
    ageYears?: number | null;
}

/** Čuva rezultat nivoa; kod prekida mreže ili greške servera pokušava još dva puta. */
async function saveResult(payload: Record<string, unknown>): Promise<{ logId?: unknown; sessionId?: unknown; experiencePoints?: unknown }> {
    const delays = [0, 1500, 4000];
    let lastError: unknown = new Error("save_failed");
    for (const delay of delays) {
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        try {
            const res = await fetch("/api/activities/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true,
            });
            if (res.ok) return await res.json();
            // Greška u zahtevu (4xx) se ponavljanjem ne popravlja
            if (res.status < 500) throw new Error(`save_rejected_${res.status}`);
            lastError = new Error(`save_failed_${res.status}`);
        } catch (error) {
            if (error instanceof Error && error.message.startsWith("save_rejected")) throw error;
            lastError = error;
        }
    }
    throw lastError;
}

export default function GameContainer({ childId, childName, gender, watched = false, onExperienceChange, onOverlayChange, preview = false, previewUnlocked = MAX_LEVEL + 1, ageYears = null }: GameContainerProps) {
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
    /**
     * Pauza važi za tačno jednu partiju (igra–nivo–pokušaj): kraj nivoa, novi pokušaj ili izlazak
     * je sami završavaju, bez posebnog brisanja stanja
     */
    const [breakFor, setBreakFor] = useState<string | null>(null);

    const [unlocked, setUnlocked] = useState<Record<string, number>>(() =>
        preview ? Object.fromEntries(GAMES.map((g) => [g.id, previewUnlocked])) : {}
    );
    const [levelsLoading, setLevelsLoading] = useState(!preview);
    const [levelsError, setLevelsError] = useState(false);
    const [levelsAttempt, setLevelsAttempt] = useState(0);

    // Raspoloženje (ako je uključeno) pitamo jednom po poseti i posle odigrane igre; uvek može da se preskoči
    // Probni prikaz pita samo uz `?mood=1` (da se ekran može pogledati bez prijave)
    const [previewMood] = useState(() => preview && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mood") === "1");
    const askMood = settings.moodCheck !== "off" && (!preview || previewMood);
    const [moodBefore, setMoodBefore] = useState<Mood | null>(null);
    const [moodAsked, setMoodAsked] = useState(false);
    const sessionLogIds = useRef<number[]>([]);
    /** Jedna poseta = jedna sesija igre u bazi (raspoloženje se čuva jednom, ne uz svaki nivo) */
    const sessionIdRef = useRef<number | null>(null);
    const completingRef = useRef(false);
    /** Čuvanja koja još traju — da izlazak iz igre ne preskoči pitanje o raspoloženju */
    const pendingSaves = useRef(0);
    const overlayRef = useRef<HTMLDivElement>(null);

    // Dnevni plan „prvo–zatim”: igre se otvaraju redom; igra je odigrana kad dete završi bar jedan nivo
    // Igra zvukova ne može da se igra kad su zvuci u igri isključeni — u planu bi zaključala sve ostalo
    const plan = useMemo(
        () => settings.plan.filter((id) => id !== "sound-to-image" || settings.gameSounds),
        [settings.plan, settings.gameSounds]
    );
    const [planDone, markPlanDone] = usePlanProgress(childId);
    const nextPlanned = plan.find((id) => !planDone.includes(id)) ?? null;
    const planActive = plan.length > 0 && nextPlanned !== null;

    const playKey = `${gameId}-${level}-${attempt}`;
    // Položen tablet i računar: drugar stoji u velikom panelu pored igre (inače je portret u traci)
    const wide = useWideScreen();
    const hasCompanion = useCompanion() !== null;
    const panel = wide && settings.avatar && hasCompanion;
    const listening = useSpeakingLock();
    // Dodir dok učitelj govori se ne prihvata, ali dete to vidi: kratko „Slušaj do kraja”
    const [listenNote, setListenNote] = useState(0);
    useEffect(() => {
        if (!listenNote) return;
        const timer = setTimeout(() => setListenNote(0), 1400);
        return () => clearTimeout(timer);
    }, [listenNote]);
    const holdWhileSpeaking = (event: SyntheticEvent) => {
        if (!listening) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.type === "pointerdown") setListenNote(Date.now());
    };
    const onBreak = breakFor === playKey && screen === "playing" && !outcome;
    // Pauza se ne računa u dnevno vreme igre
    const clock = useSessionClock(childId, preview ? 0 : settings.sessionMinutes, screen === "playing" && !outcome && !onBreak);

    const game = gameId ? getGame(gameId) : null;
    const togetherEnd = useTogetherEnd(gameId);
    const tier = tierOf(tierId);
    const unlockedFor = (id: GameId) => unlocked[id] ?? 1;

    useEffect(() => {
        if (preview) return;
        const controller = new AbortController();
        fetch(`/api/children/${childId}/unlocked-levels`, { cache: "no-store", signal: controller.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.unlockedLevels) setUnlocked(data.unlockedLevels);
                else setLevelsError(true);
            })
            .catch(() => {
                if (!controller.signal.aborted) setLevelsError(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLevelsLoading(false);
            });
        return () => controller.abort();
    }, [childId, preview, levelsAttempt]);

    const retryLevels = () => {
        setLevelsError(false);
        setLevelsLoading(true);
        setLevelsAttempt((n) => n + 1);
    };

    // Dok je igra otvorena, stranica ispod se ne skroluje
    useEffect(() => {
        if (screen === "picker") return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = previous;
        };
    }, [screen]);

    // Ekran igre je preko cele strane: fokus ulazi u njega, a stranica ispod postaje neaktivna
    const overlayOpen = screen !== "picker" && gameId !== null;
    useEffect(() => {
        onOverlayChange?.(overlayOpen);
        if (overlayOpen) overlayRef.current?.focus();
        return () => {
            if (overlayOpen) onOverlayChange?.(false);
        };
    }, [overlayOpen, onOverlayChange]);

    // ── Navigacija ─────────────────────────────────────────────────────────────

    const openGame = (id: GameId) => {
        // Dok se ne zna dokle je dete stiglo, igra bi krenula od prvog nivoa
        if (clock.limitReached || levelsLoading || levelsError) return;
        // Dok plan traje, otvaraju se odigrane igre i ona koja je na redu
        if (planActive && id !== nextPlanned && !planDone.includes(id)) return;
        playSfx("tap");
        preloadGame(id);
        setGameId(id);
        setOutcome(null);
        setScreen("tiers");
    };

    const startLevel = (nextTier: Tier, nextLevel: number) => {
        // Kad dnevno vreme istekne, novi nivo ne kreće ni kroz strelicu „nazad”
        if (clock.limitReached) {
            setScreen("picker");
            setGameId(null);
            setOutcome(null);
            return;
        }
        completingRef.current = false;
        setTierId(nextTier);
        setLevel(nextLevel);
        setAttempt((a) => a + 1);
        setOutcome(null);
        setScreen("playing");
    };

    const gameTitle = game?.title ?? null;
    // Ekrani između igara se i izgovaraju, jer većina dece mlađe od 5 godina ne čita. Glas kaže
    // samo o čemu se radi, nikad gde da se dodirne: dugmad i lica su velika i dete ih samo vidi.
    useEffect(() => {
        const line =
            screen === "tiers"
                ? gameTitle && `${gameTitle}.`
                : screen === "mood-before"
                  ? "Kako se osećaš danas?"
                  : screen === "mood-after"
                    ? "Kako se osećaš sada?"
                    : null;
        if (!line) return;
        const timer = setTimeout(() => void say(line, undefined, line.startsWith("Kako") ? "curious" : "neutral"), 500);
        return () => clearTimeout(timer);
    }, [screen, say, gameTitle]);

    /** Pokreće izabrani nivo. Bez `wanted` kreće sledeći nezavršeni nivo te težine. */
    const chooseTier = (next: TierConfig, wanted?: number) => {
        if (!gameId || !isTierUnlocked(next, unlockedFor(gameId))) return;
        // Nivo koji još nije otključan ne može da se izabere ni sa mape
        if (wanted !== undefined && (wanted < next.min || wanted > tierMax(next) || wanted > unlockedFor(gameId))) return;
        playSfx("tap");
        const nextLevel = wanted ?? startLevelFor(next, unlockedFor(gameId));
        if (clock.limitReached) {
            startLevel(next.id, nextLevel); // vraća na početni ekran sa porukom o kraju za danas
        } else if (askMood && !moodAsked) {
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

    /** Roditelju koji prati uživo javljamo da dete više nije u igri. */
    const announceExit = () => {
        if (screen !== "playing" || !game) return;
        publish({
            childId,
            activityId: game.activityId,
            gameType: game.gameType,
            event: "completed",
            data: { reason: "manual_exit", level },
            timestamp: new Date().toISOString(),
        });
    };

    /** Roditelju koji prati uživo javljamo kad dete uzme pauzu i kad nastavi. */
    const announcePause = (pause: "start" | "end") => {
        if (!game) return;
        publish({
            childId,
            activityId: game.activityId,
            gameType: game.gameType,
            event: "progress",
            data: { pause },
            timestamp: new Date().toISOString(),
        });
    };

    /** Izlaz iz igre: ako je nešto odigrano (i pitanje je uključeno), pitamo kako se dete sada oseća. */
    const leaveGame = () => {
        // „Zatvori” na pitanju o raspoloženju znači: preskoči
        if (screen === "mood-after") {
            handleMoodAfter(null);
            return;
        }
        announceExit();
        if (askMood && (sessionLogIds.current.length > 0 || pendingSaves.current > 0)) {
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
            // Sa sesijom se odgovor čuva na njoj; bez nje (starija baza) uz svaki zapis posebno
            const target = sessionIdRef.current !== null ? { sessionId: sessionIdRef.current } : { logIds };
            void fetch("/api/activities/complete", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ childId, moodAfter: mood, ...target }),
            }).catch(() => {});
        }
        // Sledeća igra dobija novu posetu, da njen odgovor ne prepiše ovaj
        sessionIdRef.current = null;
        backToPicker();
    };

    // ── Kraj nivoa ─────────────────────────────────────────────────────────────

    const companionRefresh = useCompanion()?.refresh;
    const handleComplete = useCallback(
        async (result: GameResult) => {
            if (completingRef.current || !game) return;
            completingRef.current = true;
            // Plan se beleži odmah: rezultat je sačuvan i ako se stranica zatvori na ekranu sa zvezdicama
            if (plan.includes(game.id)) markPlanDone(game.id);

            // Završen nivo uvek donosi bar jednu zvezdicu; sledeći nivo se predlaže
            // kada je bar polovina zadataka rešena samostalno
            const stars = Math.max(1, starsForGame(game.graded, result.correct, result.total)) as 1 | 2 | 3;
            // Nivo bez ocenjivanih zadataka (priča samo pročitana) uvek vodi dalje: čitanje je cilj
            const practice = result.total === 0;
            const advance = practice || !game.graded || result.correct / result.total >= ADVANCE_RATIO;
            setOutcome({
                practice,
                stars,
                correct: result.correct,
                total: result.total,
                score: result.score,
                advance,
                saved: preview ? "ok" : "saving",
            });
            playSfx("win");
            // Kraj nivoa je uvek uspeh: zvezdice preko celog ekrana (sloj ih ne crta kad je „Manje animacija”),
            // kad se ekran sa rezultatom iscrta — inače ih na sporijem tabletu „pojede” crtanje drugara
            celebrateBigWhenSettled();

            if (advance) {
                setUnlocked((prev) => ({
                    ...prev,
                    [game.id]: Math.min(Math.max(prev[game.id] ?? 1, level + 1), MAX_LEVEL + 1),
                }));
            }
            const starWords = stars === 1 ? "Jedna zvezdica" : stars === 2 ? "Dve zvezdice" : "Tri zvezdice";
            void say(
                practice ? "Pročitano." : advance ? `Nivo je završen. ${starWords}.` : `Nivo je završen. ${starWords}. Hajde još jednom.`,
                undefined,
                practice ? "happy" : "proud"
            );

            if (preview) return;
            pendingSaves.current += 1;
            try {
                const data = await saveResult({
                    childId,
                    activityId: game.activityId,
                    level,
                    score: result.score,
                    correct: result.correct,
                    total: result.total,
                    // Zaštita: samostalni i potpomognuti zajedno nikad ne premašuju broj zadataka (server bi odbio rezultat)
                    prompted: Math.max(0, Math.min(result.prompted ?? 0, result.total - result.correct)),
                    durationSec: result.durationSec,
                    moodBefore,
                    sessionId: sessionIdRef.current,
                });
                if (typeof data.logId === "number") sessionLogIds.current.push(data.logId);
                if (typeof data.sessionId === "number") sessionIdRef.current = data.sessionId;
                if (typeof data.experiencePoints === "number") onExperienceChange?.(data.experiencePoints);
                // Zvezdice su novčići za drugara: novo stanje za ekran „Moj drugar”
                companionRefresh?.();
                setOutcome((prev) => (prev ? { ...prev, saved: "ok" } : prev));
            } catch {
                setOutcome((prev) => (prev ? { ...prev, saved: "failed" } : prev));
            } finally {
                pendingSaves.current -= 1;
            }
        },
        [game, level, childId, moodBefore, onExperienceChange, preview, say, plan, markPlanDone, companionRefresh]
    );

    // ── Ekrani ─────────────────────────────────────────────────────────────────

    if (screen === "picker" || !game) {
        if (clock.limitReached) {
            return <RestCard childName={childName} onExtend={() => clock.addMinutes(ADULT_EXTRA_MINUTES)} />;
        }
        // Sa planom: prikazujemo samo igre iz plana, redom. Kad je plan završen, dete bira samo.
        const shown = planActive ? plan.map((id) => getGame(id)) : pickerGames(settings, unlocked);
        return (
            <section aria-labelledby="games-heading" className="space-y-4 sm:space-y-5">
                {plan.length > 0 && <PlanStrip plan={plan} done={planDone} current={nextPlanned} />}
                <h2 id="games-heading" className="text-xl font-extrabold text-ink sm:text-2xl">
                    {planActive ? "Tvoj plan za danas" : plan.length > 0 ? "Plan je završen. Izaberi igru." : "Izaberi igru"}
                </h2>
                {levelsError && (
                    <div className="flex flex-wrap items-center gap-3 rounded-card border border-sun-300 bg-sun-50 p-4" role="alert">
                        <p className="min-w-0 flex-1 text-base font-extrabold text-sun-700">Igre se nisu učitale. Probaj ponovo.</p>
                        <Button chunky variant="sun" onClick={retryLevels}>
                            Probaj ponovo
                        </Button>
                    </div>
                )}
                {/* Mapa ili kartice (GameMap.tsx); igre su već poređane po uzrastu i bez zaključanih (pickerGames) */}
                <GamePicker
                    ageYears={ageYears}
                    games={shown}
                    unlockedFor={unlockedFor}
                    statusFor={planActive ? (id) => (planDone.includes(id) ? "done" : id === nextPlanned ? "now" : "later") : undefined}
                    pending={levelsLoading}
                    unavailable={levelsError}
                    planActive={planActive}
                    onOpen={openGame}
                    grid={
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                    {shown.map((g, index) => {
                        const status = !planActive ? undefined : planDone.includes(g.id) ? "done" : g.id === nextPlanned ? "now" : "later";
                        return (
                            <li key={g.id}>
                                <GameCard
                                    game={g}
                                    unlocked={unlockedFor(g.id)}
                                    loading={levelsLoading}
                                    pending={levelsLoading}
                                    unavailable={levelsError}
                                    priority={index < 3}
                                    status={status}
                                    onOpen={() => openGame(g.id)}
                                />
                            </li>
                        );
                    })}
                </ul>
                    }
                />
            </section>
        );
    }

    const maxUnlocked = unlockedFor(game.id);
    const lastLevelSoon = clock.remainingSec !== null && clock.remainingSec <= LAST_LEVEL_WARNING_SEC;

    return (
        <div
            ref={overlayRef}
            tabIndex={-1}
            className="fixed inset-0 z-[6000] flex flex-col bg-canvas outline-none"
            role="dialog"
            aria-modal="true"
            aria-label={game.title}
        >
            <GameBackdrop game={game} />
            <CelebrationLayer disabled={settings.reduceMotion} />
            {/* Zaglavlje igre — ista mesta dugmadi u svim igrama */}
            <header className="relative flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:h-18 sm:gap-3 sm:px-5">
                {screen === "playing" ? (
                    <button
                        type="button"
                        onClick={() => {
                            if (!outcome) announceExit();
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
                {/* Na telefonu ikonica ustupa mesto nazivu igre, da se naziv ne seče */}
                <span
                    className={cn("hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-2xl min-[420px]:grid", game.accent.gradient)}
                    aria-hidden="true"
                >
                    {game.icon}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-display text-base font-extrabold leading-tight text-ink sm:text-lg">{game.title}</p>
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
                {screen === "playing" && !outcome && (
                    // Kartica „Treba mi pauza”: dete samo traži odmor, bez izlaska iz igre
                    <button
                        type="button"
                        onClick={() => {
                            playSfx("tap");
                            setBreakFor(playKey);
                            announcePause("start");
                        }}
                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border-2 border-sun-200 bg-sun-50 px-3 text-sm font-extrabold text-sun-700 transition-colors hover:bg-sun-100 sm:px-4"
                    >
                        <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
                        <span className="hidden sm:inline">Pauza</span>
                        <span className="sr-only sm:hidden">Pauza</span>
                    </button>
                )}
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

            <div className="scroll-soft relative isolate flex flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
                {screen === "tiers" && <LevelMap game={game} unlocked={maxUnlocked} teacher={settings.avatar ? gender : null} onChoose={chooseTier} />}

                {screen === "mood-before" && (
                    <MoodPicker
                        title="Kako se osećaš danas?"
                        teacher={settings.avatar ? (gender ?? undefined) : null}
                        onSelect={(mood) => {
                            setMoodBefore(mood);
                            setMoodAsked(true);
                            startLevel(tierId, level);
                        }}
                    />
                )}

                {screen === "mood-after" && (
                    <MoodPicker title="Kako se osećaš sada?" teacher={settings.avatar ? (gender ?? undefined) : null} onSelect={handleMoodAfter} />
                )}

                {screen === "playing" && (
                    <CompanionPanelContext value={panel}>
                    <div className={cn("relative flex flex-1", panel ? "flex-row gap-4 xl:gap-6" : "flex-col")}>
                    {/* Drugar pored igre: navija, hvata zvezdice i kaže pohvalu */}
                    {panel && <CompanionPanel />}
                    {/* Dok učitelj govori, igra ne prima dodire: rečenica se ne prekida, a dete ne bira pre
                        nego što čuje šta se traži. Dugmad u zaglavlju (pauza, zvuk, zatvori) i dalje rade. */}
                    <div
                        className="relative flex min-w-0 flex-1 flex-col"
                        aria-busy={listening || undefined}
                        onPointerDownCapture={holdWhileSpeaking}
                        onClickCapture={holdWhileSpeaking}
                        onKeyDownCapture={holdWhileSpeaking}
                    >
                        {listenNote > 0 && (
                            <p
                                key={listenNote}
                                role="status"
                                className="pointer-events-none absolute inset-x-0 top-2 z-20 mx-auto w-fit animate-fade-up rounded-full bg-ink/85 px-4 py-2 text-base font-extrabold text-white shadow-pop"
                            >
                                <span aria-hidden="true">👂 </span>Slušaj do kraja
                            </p>
                        )}
                        {/* Za vreme pauze igra stoji: tajmeri čekaju, pomoć i govor igre ne kreću */}
                        <GamePauseContext.Provider value={onBreak}>
                            {/* Igra sa drugom: traka „Sada igra …” (playTogether.tsx); inače samo igra */}
                            <TurnTakingLayer key={playKey} gameId={game.id}>
                            <GameSlot
                                key={`${game.id}-${level}-${attempt}`}
                                gameId={game.id}
                                childId={childId}
                                level={level}
                                gender={gender}
                                childName={childName}
                                onComplete={handleComplete}
                            />
                            </TurnTakingLayer>
                        </GamePauseContext.Provider>
                    </div>
                    </div>
                    </CompanionPanelContext>
                )}
            </div>

            {screen === "playing" && onBreak && (
                <BreakScreen
                    teacher={settings.avatar ? (gender ?? undefined) : null}
                    female={gender?.toLowerCase() === "female"}
                    say={say}
                    onDone={() => {
                        setBreakFor(null);
                        announcePause("end");
                    }}
                />
            )}

            {/* Igra sa drugom: zajednička pohvala umesto uobičajenog kraja nivoa (playTogether.tsx) */}
            {screen === "playing" && outcome && togetherEnd && (
                <TogetherEnd
                    gameId={game.id}
                    playKey={playKey}
                    stars={outcome.stars}
                    level={level}
                    advance={outcome.advance}
                    limitReached={clock.limitReached}
                    saved={outcome.saved}
                    onNext={() => startLevel(tierId, level + 1)}
                    onRetry={() => startLevel(tierId, level)}
                    onLeave={leaveGame}
                />
            )}
            {screen === "playing" && outcome && !togetherEnd && (
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
                    teacher={settings.avatar ? gender : null}
                />
            )}
        </div>
    );
}

// ── Igra (izdvojeno da se ne renderuje ponovo kad se promeni overlay) ─────────

/**
 * Pozadina u bojama igre: dva meka, nepomična oblaka boje iza sadržaja. Svaka igra
 * tako ima svoj prepoznatljiv prostor, a ništa se ne kreće i ne odvlači pažnju.
 */
function GameBackdrop({ game }: { game: GameDefinition }) {
    const cloud = "absolute rounded-full bg-gradient-to-br [mask-image:radial-gradient(closest-side,black,transparent)]";
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className={cn(cloud, "-left-40 top-0 h-[34rem] w-[34rem] opacity-25", game.accent.gradient)} />
            <div className={cn(cloud, "-bottom-48 -right-40 h-[40rem] w-[40rem] opacity-20", game.accent.gradient)} />
        </div>
    );
}

function GameSlot({ gameId, ...props }: { gameId: GameId } & GameProps) {
    const Game = GAME_COMPONENTS[gameId];
    // Učitelj istog pola kao glas koji čita zadatke
    const companion = useCompanion();
    const companionKind = companion?.kind;
    const companionWear = companion?.wear;
    const companionSkin = chosenSkin(companion);
    const teacher = useMemo(
        () => ({ gender: props.gender, kind: companionKind, wear: companionWear, skin: companionSkin }),
        [props.gender, companionKind, companionWear, companionSkin]
    );
    return (
        <GameTeacherContext value={teacher}>
            <Game {...props} />
        </GameTeacherContext>
    );
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

type PlanStatus = "done" | "now" | "later";

const PLAN_STATUS_LABEL: Record<PlanStatus, string> = { done: "Odigrano", now: "Sada", later: "Zatim" };

interface GameCardProps {
    game: GameDefinition;
    unlocked: number;
    loading: boolean;
    priority: boolean;
    /** Mesto igre u dnevnom planu (bez plana: undefined) */
    status?: PlanStatus;
    /** Učitavanje napretka nije uspelo — igra se ne otvara dok se ne pokuša ponovo */
    unavailable?: boolean;
    /** Napredak se još učitava: kartica izgleda uobičajeno (nije „zaključana”), samo se još ne otvara */
    pending?: boolean;
    onOpen: () => void;
}

function GameCard({ game, unlocked, loading, priority, status, unavailable = false, pending = false, onOpen }: GameCardProps) {
    // `unlocked` = poslednji položeni nivo + 1 (16 znači da je položeno svih 15)
    const done = Math.min(Math.max(unlocked - 1, 0), MAX_LEVEL);
    const allDone = done >= MAX_LEVEL;
    const waiting = status === "later" || unavailable;
    return (
        <button
            type="button"
            onClick={onOpen}
            disabled={waiting || pending}
            className={cn(
                "group relative flex w-full flex-col overflow-hidden rounded-card border-2 border-b-[6px] bg-surface text-left shadow-soft transition-[transform,border-color,box-shadow]",
                waiting
                    ? "cursor-not-allowed border-line"
                    : pending
                      ? "cursor-progress"
                      : "hover:border-brand-300 hover:shadow-lift active:translate-y-[3px] active:border-b-2",
                status === "now" ? "border-brand-500" : "border-line"
            )}
        >
            {status && (
                <span
                    className={cn(
                        "absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold shadow-soft",
                        status === "done" ? "bg-emerald-700 text-white" : status === "now" ? "bg-brand-600 text-white" : "bg-surface text-ink-soft"
                    )}
                >
                    {status === "done" && <Check className="h-4 w-4" aria-hidden="true" />}
                    {status === "later" && <Lock className="h-4 w-4" aria-hidden="true" />}
                    {PLAN_STATUS_LABEL[status]}
                </span>
            )}
            <span className={cn("relative block aspect-[16/9] w-full overflow-hidden bg-brand-50", waiting && "opacity-50 grayscale")}>
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

// ── Plan „prvo–zatim” ─────────────────────────────────────────────────────────
// Vizuelni raspored: šta radim sada, šta je posle i kada je kraj.

function PlanStrip({ plan, done, current }: { plan: GameId[]; done: GameId[]; current: GameId | null }) {
    return (
        <ol className="flex items-stretch gap-2 overflow-x-auto rounded-card border border-line bg-surface p-3 shadow-soft sm:gap-3 sm:p-4" aria-label="Plan igre za danas">
            {plan.map((id, index) => {
                const g = getGame(id);
                const isDone = done.includes(id);
                const isCurrent = id === current;
                return (
                    <li
                        key={id}
                        aria-current={isCurrent ? "step" : undefined}
                        className={cn(
                            "flex min-w-24 flex-1 flex-col items-center gap-1 rounded-tile border-2 px-2 py-3 text-center",
                            isCurrent ? "border-brand-500 bg-brand-50" : "border-line bg-canvas"
                        )}
                    >
                        <span className="text-xs font-extrabold text-ink-soft">{index === 0 ? "Prvo" : "Zatim"}</span>
                        <span className={cn("relative grid h-12 w-12 place-items-center rounded-2xl text-2xl", isDone ? "bg-emerald-100" : "bg-surface")} aria-hidden="true">
                            {g.icon}
                            {isDone && (
                                <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-emerald-700 text-white ring-2 ring-white">
                                    <Check className="h-3.5 w-3.5" />
                                </span>
                            )}
                        </span>
                        <span className="text-sm font-extrabold leading-tight text-ink">{g.title}</span>
                        {isDone && <span className="sr-only">odigrano</span>}
                    </li>
                );
            })}
            <li
                className={cn(
                    "flex min-w-20 flex-col items-center justify-center gap-1 rounded-tile border-2 px-2 py-3 text-center",
                    current === null ? "border-emerald-500 bg-emerald-50" : "border-line bg-canvas"
                )}
            >
                <span className="text-2xl" aria-hidden="true">🏁</span>
                <span className="text-sm font-extrabold text-ink">Kraj</span>
            </li>
        </ol>
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
    // Čitači ekrana i prekidači šalju samo „klik” bez držanja: tada se potvrda traži u dva koraka
    const [armed, setArmed] = useState(false);
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
            onClick={(e) => {
                if (e.detail !== 0) return; // pravi dodir ili miš: važi samo držanje
                if (armed) {
                    setArmed(false);
                    onConfirm();
                } else {
                    setArmed(true);
                }
            }}
            onBlur={() => setArmed(false)}
            onContextMenu={(e) => e.preventDefault()}
            className="relative inline-flex min-h-11 select-none items-center overflow-hidden rounded-xl border border-line bg-canvas px-4 text-sm font-extrabold text-ink-soft"
        >
            <span
                className="absolute inset-y-0 left-0 bg-brand-200"
                style={{ width: holding ? "100%" : "0%", transition: holding ? `width ${holdMs}ms linear` : "none" }}
                aria-hidden="true"
            />
            <span className="relative">{armed ? "Pritisnite još jednom za potvrdu" : label}</span>
        </button>
    );
}

// ── Pauza ─────────────────────────────────────────────────────────────────────
// „Treba mi pauza”: miran ekran preko igre. Krug polako raste i smanjuje se (udah 4 s, izdah 4 s),
// učitelj tiho kaže šta da radi, a igra čeka tačno tamo gde je dete stalo. Nema zvukova ni žurbe.

interface BreakScreenProps {
    teacher: string | undefined | null;
    /** Rod deteta za „spreman/spremna” — ne zavisi od toga da li je učitelj na ekranu */
    female: boolean;
    say: (text: string, onEnd?: () => void, emotion?: VoiceEmotion) => unknown;
    onDone: () => void;
}

function BreakScreen({ teacher, female, say, onDone }: BreakScreenProps) {
    const [inhale, setInhale] = useState(true);
    // Drugi dodir dvostrukog dodira ne sme odmah da zatvori pauzu
    const guard = useInputGuard(800);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        guard.hold();
        panelRef.current?.focus();
        void say("Odmorimo se. Polako udahni, pa izdahni.", undefined, "gentle");
        const timer = setInterval(() => setInhale((value) => !value), 4000);
        return () => clearInterval(timer);
    }, [guard, say]);

    return (
        <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Pauza"
            className="absolute inset-0 z-20 flex animate-fade flex-col items-center justify-center gap-6 bg-gradient-to-b from-sky-50 to-brand-50 p-6 text-center outline-none"
        >
            {teacher !== null && (
                <span className="grid h-40 w-32 place-items-end overflow-hidden rounded-3xl bg-white/70 ring-2 ring-white sm:h-52 sm:w-40">
                    <Teacher gender={teacher ?? undefined} variant="scene" emotion="gentle" className="h-full w-full" />
                </span>
            )}
            <h2 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">Pauza</h2>
            <div className="relative grid h-56 w-56 place-items-center sm:h-72 sm:w-72" aria-hidden="true">
                <span className="absolute inset-0 animate-breathe rounded-full bg-sky-200/70" />
                <span className="absolute inset-[18%] animate-breathe rounded-full bg-sky-300/60 [animation-delay:150ms]" />
                <span className="relative font-display text-2xl font-extrabold text-sky-900 sm:text-3xl">{inhale ? "Udahni…" : "Izdahni…"}</span>
            </div>
            <p className="text-lg font-bold text-ink-soft">Kad budeš {female ? "spremna" : "spreman"}, nastavi igru.</p>
            <Button
                chunky
                size="xl"
                variant="success"
                onClick={() => {
                    if (guard.blocked()) return;
                    playSfx("tap");
                    onDone();
                }}
            >
                <Play className="h-6 w-6" fill="currentColor" aria-hidden="true" />
                Nastavi igru
            </Button>
        </div>
    );
}

// ── Mapa nivoa ────────────────────────────────────────────────────────────────
// Ulaz u igru: drugar je glavni — veliki, živ, u svom svetu, maše detetu na pozdrav. Pored njega
// (na telefonu ispod) slika i naziv igre, jedno veliko dugme „Igraj” (nastavlja tamo gde je dete
// stalo) i put od 15 nivoa u tri težine. Završeni nivoi su obojeni, sledeći svetli, ostali su
// zaključani. Svaki otključan nivo može da se dodirne — dete vidi dokle je stiglo i šta je sledeće.

interface LevelMapProps {
    game: GameDefinition;
    /** Sledeći otključani nivo (1–16; 16 = sve je završeno) */
    unlocked: number;
    /** Pol učitelja; null = bez učitelja */
    teacher: string | undefined | null;
    onChoose: (tier: TierConfig, level?: number) => void;
}

/** Svet drugara: ista meka siva kao u prodavnici dok se kupljena pozadina ne učita */
const STAGE_BG = "bg-[#E4E6EB]";

function LevelMap({ game, unlocked, teacher, onChoose }: LevelMapProps) {
    const allDone = unlocked > MAX_LEVEL;
    // Gde dete nastavlja: sledeći nezavršeni nivo; kad je sve završeno, najteža težina ispočetka
    const nextTier = allDone ? TIERS[TIERS.length - 1] : (TIERS.find((t) => unlocked <= tierMax(t)) ?? TIERS[0]);
    const nextLevel = startLevelFor(nextTier, unlocked);
    const started = unlocked > 1;

    return (
        <div className="mx-auto grid w-full max-w-6xl flex-1 animate-fade-up content-center gap-3 sm:gap-5 md:landscape:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:landscape:content-stretch 2xl:max-w-7xl">
            {/* Drugar u svom svetu (bez drugara: velika slika igre) */}
            <section
                aria-label={teacher !== null ? "Tvoj drugar" : undefined}
                className={cn(
                    "relative h-[34dvh] min-h-52 overflow-hidden rounded-card shadow-lift ring-1 ring-line sm:h-[40dvh] md:landscape:h-auto md:landscape:min-h-0",
                    teacher !== null ? STAGE_BG : game.accent.soft
                )}
            >
                {teacher !== null ? (
                    <>
                        <Teacher gender={teacher} variant="full" action="wave" className="absolute inset-0 h-full w-full" />
                        <CoinCount className="absolute left-3 top-3 sm:left-4 sm:top-4" />
                        {/* Za šta dete skuplja novčiće */}
                        <GoalChip className="absolute inset-x-3 bottom-3 mx-auto w-fit max-w-[calc(100%-1.5rem)] sm:bottom-4" />
                    </>
                ) : (
                    <Image src={game.image} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" priority />
                )}
            </section>

            <div className="flex min-w-0 flex-col justify-center gap-3 sm:gap-4">
                {/* Igra + veliko dugme */}
                <section className="relative overflow-hidden rounded-card border border-line bg-surface p-3 pt-4 shadow-soft sm:p-5 sm:pt-6">
                    <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", game.accent.gradient)} aria-hidden="true" />
                    <div className="flex items-center gap-3 sm:gap-4">
                        {teacher !== null && (
                            <div className="relative aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-line sm:w-36 lg:w-44">
                                <Image src={game.image} alt="" fill sizes="176px" className="object-cover" priority />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h2 className="font-display text-xl font-extrabold leading-tight text-ink sm:text-3xl lg:text-4xl">{game.title}</h2>
                            <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-ink-soft sm:text-base lg:text-lg">{game.description}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChoose(nextTier, nextLevel)}
                        className="mt-3 flex min-h-16 w-full items-center gap-4 rounded-2xl border-2 border-b-[6px] border-emerald-900 bg-emerald-700 px-5 text-left text-white shadow-soft transition-[transform,background-color,border-width] hover:bg-emerald-600 active:translate-y-[3px] active:border-b-2 sm:mt-5 sm:min-h-20 sm:px-7"
                    >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 sm:h-12 sm:w-12" aria-hidden="true">
                            <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5 sm:h-6 sm:w-6" fill="currentColor">
                                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z" />
                            </svg>
                        </span>
                        <span className="min-w-0">
                            <span className="block font-display text-xl font-extrabold leading-tight sm:text-2xl">{allDone ? "Igraj ponovo" : started ? "Nastavi" : "Igraj"}</span>
                            <span className="block text-sm font-bold text-emerald-50 sm:text-base">
                                {nextTier.label} · nivo {nextLevel - nextTier.min + 1} od {LEVELS_PER_TIER}
                            </span>
                        </span>
                    </button>
                </section>

                {/* Put kroz nivoe */}
                <section aria-label="Svi nivoi" className="rounded-card border border-line bg-surface p-2 shadow-soft sm:p-3">
                    <ul className="grid gap-2">
                        {TIERS.map((tier) => (
                            <TierRow key={tier.id} tier={tier} unlocked={unlocked} next={allDone ? null : unlocked} onChoose={onChoose} />
                        ))}
                    </ul>
                </section>
            </div>
        </div>
    );
}

/** Novčići koje dete ima (skuplja ih za drugara) — mali znak u uglu drugarovog sveta */
function CoinCount({ value, className, countRef }: { value?: number; className?: string; countRef?: React.Ref<HTMLSpanElement> }) {
    const companion = useCompanion();
    if (!companion) return null;
    const coins = value ?? companion.coins;
    return (
        <span
            ref={countRef}
            className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 font-display text-lg font-extrabold text-sun-700 shadow-soft ring-2 ring-sun-200 sm:text-xl", className)}
        >
            <CoinIcon className="h-6 w-6" />
            <span className="tabular-nums">{coins}</span>
            <span className="sr-only"> {coinWord(coins)}</span>
        </span>
    );
}

interface TierRowProps {
    tier: TierConfig;
    unlocked: number;
    /** Nivo koji je sledeći na redu (svetli); null kad je sve završeno */
    next: number | null;
    onChoose: (tier: TierConfig, level?: number) => void;
}

/**
 * Jedna težina: znak sa zvezdicama i pet nivoa na traci. Prilagođava se širini svog mesta
 * (container upiti): usko — znak sa kratkim nazivom ispod; šire — naziv i stanje pored znaka.
 */
function TierRow({ tier, unlocked, next, onChoose }: TierRowProps) {
    const open = isTierUnlocked(tier, unlocked);
    const done = completedInTier(tier, unlocked);
    const status = !open ? tier.lockedHint : done === LEVELS_PER_TIER ? "Sve završeno" : done === 0 ? tier.hint : `Završeno ${done} od ${LEVELS_PER_TIER}`;

    return (
        <li className={cn("@container rounded-2xl px-2 py-2 @sm:p-3", open ? tier.look.soft : "bg-canvas")}>
            <div className="flex items-center gap-2 @sm:gap-4">
                <div className="flex w-14 shrink-0 flex-col items-center gap-0.5 @sm:w-40 @sm:flex-row @sm:gap-3 @xl:w-48">
                    <span
                        className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center gap-px rounded-xl border-2 border-b-4 @sm:h-12 @sm:w-12 @sm:rounded-2xl @xl:h-14 @xl:w-14",
                            open ? cn(tier.look.solid, tier.look.edge, "text-white") : "border-line bg-surface text-ink-faint"
                        )}
                        aria-hidden="true"
                    >
                        {open ? (
                            Array.from({ length: tier.stars }, (_, i) => <Star key={i} className={tier.stars === 3 ? "h-3 w-3 @sm:h-3.5 @sm:w-3.5" : "h-3.5 w-3.5 @sm:h-4 @sm:w-4"} fill="currentColor" strokeWidth={0} />)
                        ) : (
                            <Lock className="h-5 w-5" />
                        )}
                    </span>
                    <div className="min-w-0 text-center @sm:text-left">
                        <h3 className={cn("font-display text-xs font-extrabold leading-tight @sm:text-lg @xl:text-xl", open ? "text-ink" : "text-ink-faint")}>{tier.label}</h3>
                        <p className={cn("hidden text-sm font-bold leading-tight @sm:block", open ? tier.look.text : "text-ink-faint")}>{status}</p>
                    </div>
                </div>

                {/* Pet nivoa na traci; popunjeni deo trake pokazuje dokle je dete stiglo */}
                <ol className="relative grid flex-1 grid-cols-5 items-center">
                    <span className="absolute inset-x-[10%] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-line/70" aria-hidden="true" />
                    <span
                        className={cn("absolute left-[10%] top-1/2 h-1.5 -translate-y-1/2 rounded-full", tier.look.track)}
                        style={{ width: `${Math.max(0, Math.min(done, LEVELS_PER_TIER - 1)) * 20}%` }}
                        aria-hidden="true"
                    />
                    {Array.from({ length: LEVELS_PER_TIER }, (_, i) => {
                        const level = tier.min + i;
                        const isDone = level < unlocked;
                        const isNext = level === next;
                        const locked = !isDone && !isNext;
                        return (
                            <li key={level} className="relative grid place-items-center">
                                <button
                                    type="button"
                                    disabled={locked}
                                    onClick={() => onChoose(tier, level)}
                                    aria-label={`${tier.label}, nivo ${i + 1}${isDone ? ", završen" : isNext ? ", sledeći" : ", zaključan"}`}
                                    className={cn(
                                        "relative grid h-11 w-11 place-items-center rounded-full border-2 border-b-4 font-display text-lg font-extrabold transition-[transform,border-width] @sm:h-12 @sm:w-12 @xl:h-14 @xl:w-14 @xl:text-xl",
                                        isDone && cn(tier.look.solid, tier.look.edge, "text-white active:translate-y-[2px] active:border-b-2"),
                                        isNext && cn("bg-surface ring-4 active:translate-y-[2px] active:border-b-2", tier.look.edge, tier.look.text, tier.look.ring, "animate-soft-pulse"),
                                        locked && "cursor-not-allowed border-line bg-surface text-ink-faint"
                                    )}
                                >
                                    {locked ? <Lock className="h-4 w-4 @xl:h-5 @xl:w-5" aria-hidden="true" /> : i + 1}
                                    {isDone && (
                                        <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-white text-emerald-700 shadow-soft ring-1 ring-line" aria-hidden="true">
                                            <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </li>
    );
}

// ── Drugar pored igre ─────────────────────────────────────────────────────────
// Položen tablet i računar: veliki živi drugar u svom svetu, pored polja za igru. Zvezdice za
// tačan odgovor doleću do njega, on skoči i pokaže „+1”, a u oblačiću je pohvala koju glas kaže.
// Dok govori, svetli mu okvir. Na grešku ne reaguje — greška nije kazna.

function CompanionPanel() {
    const companion = useCompanion();
    const calm = useCalmMotion();
    const hype = useCompanionHype(calm);
    const { speaking } = useVoiceState();
    if (!companion) return null;
    return (
        <aside aria-label="Tvoj drugar" className="relative w-[clamp(12rem,26vw,26rem)] shrink-0">
            <div
                data-hype-target=""
                className={cn(
                    "relative h-full min-h-48 overflow-hidden rounded-card shadow-lift ring-2 transition-shadow duration-200",
                    STAGE_BG,
                    speaking ? "ring-brand-400 shadow-[0_0_0_5px_var(--color-brand-100)]" : "ring-line"
                )}
            >
                <CompanionStage
                    kind={companion.kind}
                    skin={chosenSkin(companion)}
                    wear={companion.wear}
                    // Uzak i visok panel: krupniji kadar; sa ljubimcem lik malo levo, da i ljubimac stane
                    framing="wide"
                    align={companion.wear.pet ? -0.4 : 0}
                    background
                    action={hype.action}
                    actionKey={hype.actionKey}
                    className="absolute inset-0"
                />
                <CoinCount className="absolute left-2.5 top-2.5 px-2.5 py-1 text-base sm:text-lg" />
            </div>
            {/* Pohvala iznad glave, „+1” u uglu */}
            <div className="pointer-events-none absolute inset-x-2 top-12 flex justify-center">
                <HypeBubble hype={hype} calm={calm} className="relative" />
            </div>
            <HypePlus hype={hype} calm={calm} className="absolute right-2.5 top-2.5" />
        </aside>
    );
}

// ── Raspoloženje ──────────────────────────────────────────────────────────────
// Tri lica (mlađa deca ne razlikuju pouzdano više stupnjeva); uvek može da se preskoči.
// Pitanje postavlja drugar: veliki, radoznao, iznad pitanja (na položenom ekranu pored njega).

const MOOD_FACE: Partial<Record<Mood, MoodFaceKind>> = { upset: "upset", neutral: "neutral", happy: "happy" };

interface MoodPickerProps {
    title: string;
    /** Pol učitelja koji postavlja pitanje; null = bez učitelja */
    teacher?: string | null;
    onSelect: (mood: Mood | null) => void;
}

function MoodPicker({ title, teacher = null, onSelect }: MoodPickerProps) {
    // Drugi dodir dvostrukog dodira sa prethodnog ekrana ne sme da odgovori na pitanje
    const guard = useInputGuard(600);
    useEffect(() => {
        guard.hold();
    }, [guard]);
    const choose = (mood: Mood | null) => {
        if (guard.blocked()) return;
        if (mood) playSfx("tap");
        onSelect(mood);
    };
    const hero = teacher !== null;
    return (
        <div
            className={cn(
                "mx-auto grid w-full max-w-2xl flex-1 animate-fade-up content-center items-center gap-4 sm:gap-6 xl:max-w-4xl",
                hero && "md:landscape:max-w-6xl md:landscape:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:landscape:gap-8"
            )}
        >
            {hero && (
                <div className={cn("relative h-[44dvh] min-h-52 overflow-hidden rounded-card shadow-lift ring-1 ring-line sm:h-[44dvh] short:h-[36dvh] md:landscape:h-[min(72dvh,38rem)]", STAGE_BG)}>
                    <Teacher gender={teacher ?? undefined} variant="full" emotion="curious" className="absolute inset-0 h-full w-full" />
                </div>
            )}
            <div className="flex flex-col items-center text-center">
                <h2 className="text-2xl font-extrabold text-ink sm:text-4xl">{title}</h2>
                <ul className="mt-5 grid w-full grid-cols-3 gap-3 sm:mt-8 sm:gap-5">
                    {MOODS_THREE.map((mood) => (
                        <li key={mood.value}>
                            <button
                                type="button"
                                onClick={() => choose(mood.value)}
                                className="flex w-full flex-col items-center gap-2 rounded-tile border-2 border-b-[5px] border-line bg-surface px-2 py-5 shadow-soft transition-[transform,border-color] hover:border-brand-300 hover:bg-brand-50 active:translate-y-[3px] active:border-b-2 sm:py-8 short:py-4"
                            >
                                {/* Crtano lice: isto na svakom uređaju (emodži se razlikuju od telefona do telefona) */}
                                {MOOD_FACE[mood.value] ? (
                                    <MoodFace mood={MOOD_FACE[mood.value]!} className="h-20 w-20 sm:h-28 sm:w-28 short:sm:h-24 short:sm:w-24" />
                                ) : (
                                    <span className="text-6xl sm:text-7xl" aria-hidden="true">{mood.emoji}</span>
                                )}
                                <span className="text-lg font-extrabold text-ink sm:text-xl">{mood.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                <button
                    type="button"
                    onClick={() => choose(null)}
                    className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl px-5 text-base font-extrabold text-ink-soft hover:bg-brand-50 hover:text-ink sm:mt-6"
                >
                    <SkipForward className="h-5 w-5" aria-hidden="true" />
                    Preskoči
                </button>
            </div>
        </div>
    );
}

// ── Rezultat nivoa ────────────────────────────────────────────────────────────
// Nema ishoda „nisi uspeo”: svaki završen nivo donosi zvezdicu. Kada je bilo mnogo
// pomoći, prvo se nudi ista vežba još jednom. „Gotovo” je uvek jednako vidljivo.
// Drugar je glavni: veliki, u svom svetu, aplaudira; novčići odlete do njega, a brojač
// novčića u njegovom uglu naraste. Uz „Manje animacija” brojač odmah pokaže novi zbir.

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
    /** Pol učitelja koji se raduje sa detetom; null = bez učitelja */
    teacher: string | undefined | null;
}

/** Kada novčići krenu ka drugaru (posle zvezdica, ms) */
const COINS_START_MS = 900;
/** Najviše novčića u letu (ostatak se samo doda brojaču) */
const COINS_FLYING = 6;
const COIN_STEP_MS = 110;

/** Brojač novčića: od zbira pre nivoa do novog zbira, u koracima dok novčići sleću */
function useCoinTicker(earned: number, enabled: boolean, calm: boolean, from: React.RefObject<HTMLElement | null>, to: React.RefObject<HTMLElement | null>) {
    const companion = useCompanion();
    // Zbir pre ovog nivoa (čuvanje rezultata stiže kasnije i ne menja prikaz)
    const [base] = useState(() => companion?.coins ?? 0);
    const [added, setAdded] = useState(0);
    useEffect(() => {
        if (!enabled || earned <= 0) return;
        if (calm) {
            queueMicrotask(() => setAdded(earned));
            return;
        }
        const flying = Math.min(earned, COINS_FLYING);
        const timers = [
            setTimeout(() => {
                if (from.current && to.current) flyItems(from.current, to.current, flying, "coin");
            }, COINS_START_MS),
            ...Array.from({ length: flying }, (_, i) =>
                setTimeout(() => setAdded(Math.round((earned * (i + 1)) / flying)), COINS_START_MS + FLY_MS + i * COIN_STEP_MS - 80)
            ),
        ];
        return () => timers.forEach(clearTimeout);
    }, [earned, enabled, calm, from, to]);
    return { coins: base + added, landing: added > 0 && added < earned };
}

function LevelResult({ outcome, childName, game, tier, level, showNumbers, limitReached, lastLevelSoon, onNext, onNextTier, onRetry, onLeave, teacher }: LevelResultProps) {
    const lastInTier = level >= tierMax(tier);
    const nextTier = TIERS[TIERS.findIndex((t) => t.id === tier.id) + 1] ?? null;
    const champion = outcome.advance && lastInTier && !nextTier;
    const hero = teacher !== null;
    const calm = useCalmMotion();
    const earned = outcome.stars * COINS_PER_STAR;
    const chipRef = useRef<HTMLParagraphElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const hasCompanion = useCompanion() !== null;
    const ticker = useCoinTicker(earned, hero && hasCompanion, calm, chipRef, stageRef);

    let title = "Nivo je završen";
    let text = "";
    if (champion) {
        title = `Svi nivoi su završeni, ${childName}`;
        text = `Igra „${game.title}” je cela pređena.`;
    } else if (outcome.advance && lastInTier) {
        text = `Svi nivoi na težini „${tier.label}” su završeni.`;
    } else if (outcome.practice) {
        title = "Pročitano";
    } else if (!outcome.advance) {
        text = "Ovaj nivo vežbamo još malo.";
    }
    if (limitReached) text = "Za danas smo završili. Vidimo se sledeći put.";

    // Fokus ulazi u prozor sa rezultatom (tastatura i čitači ekrana)
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        panelRef.current?.focus();
    }, []);

    return (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="alertdialog" aria-modal="true" aria-label={title}>
            <div
                ref={panelRef}
                tabIndex={-1}
                className={cn(
                    "flex max-h-full w-full animate-fade-up flex-col overflow-hidden rounded-t-[2rem] bg-surface shadow-pop outline-none sm:rounded-[2rem]",
                    hero ? "sm:max-w-xl md:landscape:max-w-5xl md:landscape:flex-row" : "max-w-md"
                )}
            >
                {/* Ceo drugar sa svim što je dete kupilo, u svom svetu: kraj nivoa je trenutak nagrade */}
                {hero && (
                    <div ref={stageRef} className={cn("relative h-[32dvh] min-h-44 shrink-0 sm:h-[38dvh] md:landscape:h-auto md:landscape:min-h-[24rem] md:landscape:w-[46%]", STAGE_BG)}>
                        {/* Kad se pojave zvezdice drugar navija (pročitana priča: mali skok) */}
                        <Teacher gender={teacher} variant="full" action={outcome.practice ? "hop" : "cheer"} className="absolute inset-0 h-full w-full" />
                        <CoinCount
                            value={hasCompanion ? ticker.coins : undefined}
                            className={cn("absolute right-3 top-3 sm:right-4 sm:top-4", !calm && "transition-transform duration-200", ticker.landing && !calm && "scale-110")}
                        />
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-4 text-center sm:p-8 md:landscape:flex md:landscape:flex-col md:landscape:justify-center">
                    {outcome.practice ? (
                        // Pročitana priča nije „rezultat”: bez zvezdica koje bi izgledale kao slaba ocena
                        <p className="mb-3 text-6xl animate-pop" aria-hidden="true">
                            📖
                        </p>
                    ) : (
                        <div className="mb-3 flex justify-center gap-2 sm:gap-3" aria-label={`${outcome.stars} od 3 zvezdice`}>
                            {[1, 2, 3].map((s) => (
                                <span key={s} className={cn("text-5xl sm:text-6xl", s <= outcome.stars ? "animate-pop" : "opacity-20 grayscale")} aria-hidden="true">
                                    ⭐
                                </span>
                            ))}
                        </div>
                    )}
                    <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">
                        {champion ? "🏆 " : ""}
                        {title}
                    </h2>
                    {/* Svaka zvezdica donosi novčiće za drugara (odatle odlete do njega) */}
                    <p ref={chipRef} className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full bg-sun-100 px-4 py-1.5 text-lg font-extrabold text-sun-700 ring-1 ring-sun-300">
                        + {earned} <CoinIcon className="h-6 w-6" />
                        <span className="sr-only">{coinWord(earned)}</span>
                    </p>
                    {/* Cilj deteta: koliko je još do predmeta za koji skuplja (samo kad je izabran) */}
                    <GoalChip className="mx-auto mt-2 flex w-fit bg-sun-50 ring-1 ring-sun-200" />
                    {showNumbers && !limitReached && game.graded && !outcome.practice && (
                        <p className="mt-1 text-base font-bold text-ink-soft">
                            Iz prvog pokušaja: {outcome.correct} od {outcome.total}
                        </p>
                    )}
                    {text && <p className="mt-2 text-base font-semibold text-ink-soft sm:text-lg">{text}</p>}
                    {lastLevelSoon && !limitReached && (
                        <p className="mt-3 rounded-xl bg-sun-50 px-3 py-2 text-base font-extrabold text-sun-700">Još jedan nivo, pa pauza.</p>
                    )}

                    <div className="mt-5 flex flex-col gap-3">
                        {!limitReached && !outcome.advance && (
                            <Button chunky size="xl" variant="sun" block onClick={onRetry}>
                                <RotateCcw className="h-6 w-6" aria-hidden="true" />
                                {outcome.practice ? "Čitaj ponovo" : "Igraj još jednom"}
                            </Button>
                        )}
                        {!limitReached && outcome.advance && !lastInTier && (
                            <Button chunky size="xl" variant="success" block onClick={onNext}>
                                Sledeći nivo
                                <ArrowRight className="h-6 w-6" aria-hidden="true" />
                            </Button>
                        )}
                        {!limitReached && outcome.advance && lastInTier && nextTier && (
                            <Button chunky size="xl" variant="success" block onClick={() => onNextTier(nextTier)}>
                                Igraj „{nextTier.label}”
                                <ArrowRight className="h-6 w-6" aria-hidden="true" />
                            </Button>
                        )}
                        {/* „Gotovo” je jednako veliko kao nastavak: prestanak igre je dobar izbor */}
                        <Button chunky size="xl" variant="secondary" block onClick={onLeave}>
                            <Check className="h-6 w-6" aria-hidden="true" />
                            {limitReached ? "Gotovo za danas" : "Gotovo"}
                        </Button>
                        {!limitReached && outcome.advance && (
                            <Button size="lg" variant="ghost" block onClick={onRetry}>
                                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                                Igraj ovaj nivo ponovo
                            </Button>
                        )}
                    </div>

                    <p className="mt-4 border-t border-line pt-3 text-sm font-semibold normal-case text-ink-faint">
                        <span className="font-extrabold text-ink-soft">Za odrasle:</span> {game.offscreenTip}
                    </p>
                    <p className="mt-1 min-h-5 text-xs font-bold normal-case text-ink-faint" aria-live="polite">
                        {outcome.saved === "failed" && "Nema interneta. Rezultat nije sačuvan."}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Pratilac ──────────────────────────────────────────────────────────────────

/** Lik koji govori: pratilac koga je dete izabralo (sa odećom i izgledom), a bez njega dosadašnji učitelj */
function Teacher({
    gender,
    variant,
    emotion,
    action,
    background = true,
    className,
}: {
    gender?: string;
    variant?: "bust" | "face" | "full" | "portrait" | "scene";
    emotion?: TeacherEmotion;
    /** Jednokratni pokret; „wave” (mahanje na pozdrav) samo za živog 3D drugara */
    action?: CompanionMove | "wave";
    /** false: bez pozadine iz prodavnice (crta je mesto oko drugara, preko cele širine) */
    background?: boolean;
    className?: string;
}) {
    const companion = useCompanion();
    if (companion) {
        // Ceo lik (ulaz u igru, pitanje, kraj nivoa) je živ 3D prikaz u svom svetu; mali portreti su 3D slike
        if (variant === "full") {
            return <CompanionStage kind={companion.kind} skin={chosenSkin(companion)} wear={companion.wear} framing="full" background={background} emotion={emotion} action={action} actionKey={action} className={className} />;
        }
        const picture = variant === "face" ? "face" : variant === "bust" ? "bust" : variant === "scene" ? "full" : "portrait";
        return <CompanionPicture kind={companion.kind} skin={chosenSkin(companion)} wear={companion.wear} variant={picture} background={background} emotion={emotion} className={className} eager />;
    }
    return <TeacherAvatar gender={gender} variant={variant === "scene" ? "full" : variant} emotion={emotion} action={action === "wave" ? undefined : action} className={className} />;
}
