"use client";

// Spoji parove — dete okreće po dve kartice i traži iste životinje.
// Nema vremena ni neuspeha: promašen par se sam vrati (bez komentara), a posle onoliko grešaka pamćenja
// koliko je zadato u podešavanjima deteta par otvorene kartice blago svetli.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    Feedback,
    GameHud,
    GameStage,
    playSfx,
    shuffle,
    useGameSync,
    useInputGuard,
    useTimers,
    type BaseView,
    type FeedbackKind,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import { cn } from "@/lib/cn";
import { getGame, LEVELS_PER_TIER } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

// ── Sličice ───────────────────────────────────────────────────────────────────

interface Animal {
    name: string;
    src: string;
}

const ANIMALS: Record<string, Animal> = {
    kokoska: { name: "Kokoška", src: "/memoryGameImages/kokoska.webp" },
    krava: { name: "Krava", src: "/memoryGameImages/kravaa.webp" },
    krokodil: { name: "Krokodil", src: "/memoryGameImages/krokodill.webp" },
    lav: { name: "Lav", src: "/memoryGameImages/lavv.webp" },
    lisica: { name: "Lisica", src: "/memoryGameImages/lisica.webp" },
    macka: { name: "Mačka", src: "/memoryGameImages/mackaa.webp" },
    mis: { name: "Miš", src: "/memoryGameImages/miss.webp" },
    morskikonj: { name: "Morski konj", src: "/memoryGameImages/morskikonj.webp" },
    panda: { name: "Panda", src: "/memoryGameImages/panda.webp" },
    pas: { name: "Pas", src: "/memoryGameImages/pass.webp" },
    sova: { name: "Sova", src: "/memoryGameImages/sovaa.webp" },
    tigar: { name: "Tigar", src: "/memoryGameImages/tigar.webp" },
};

const ANIMAL_IDS = Object.keys(ANIMALS);

function animalOf(id: string | undefined): Animal | undefined {
    return id !== undefined && Object.prototype.hasOwnProperty.call(ANIMALS, id) ? ANIMALS[id] : undefined;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────
// Raste broj parova; svaka nova veličina table se na lakšim nivoima prvo igra uz kratko "zavirivanje".
// Stvarni broj parova dodatno ograničavaju podešavanja deteta (uzrast) i veličina ekrana.

interface LevelConfig {
    pairs: number;
    /** Sve kartice su na početku nakratko otkrivene (mlađoj deci uvek, bez obzira na nivo) */
    peek: boolean;
    /** Koliko dugo promašen par ostaje otkriven */
    flipBackMs: number;
}

const BOARDS: { pairs: number; peek: boolean }[] = [
    { pairs: 2, peek: true },
    { pairs: 3, peek: true },
    { pairs: 3, peek: false },
    { pairs: 4, peek: true },
    { pairs: 4, peek: false },
    { pairs: 5, peek: true },
    { pairs: 5, peek: false },
    { pairs: 6, peek: true },
    { pairs: 6, peek: false },
    { pairs: 7, peek: false },
    { pairs: 8, peek: true },
    { pairs: 8, peek: false },
    { pairs: 9, peek: false },
    { pairs: 10, peek: true },
    { pairs: 10, peek: false },
];

/** Lako / srednje / teško: promašen par se brže vraća. */
const FLIP_BACK_MS = [1300, 1100, 900];

const LEVELS: LevelConfig[] = BOARDS.map((board, index) => ({
    ...board,
    flipBackMs: FLIP_BACK_MS[Math.min(Math.floor(index / LEVELS_PER_TIER), FLIP_BACK_MS.length - 1)],
}));

function configFor(level: number): LevelConfig {
    const index = Math.min(Math.max(Math.round(level) || 1, 1), LEVELS.length) - 1;
    return LEVELS[index];
}

/** Koliko dugo traje zavirivanje: više kartica, više vremena */
function peekMsFor(pairs: number): number {
    return 2000 + pairs * 400;
}

// ── Raspored ──────────────────────────────────────────────────────────────────
// Uspravno najviše 4 kolone (kartica ostaje dovoljno velika za prst), položeno više kolona i manje redova.
// Kartica se smanjuje da cela tabla stane u visinu ekrana — kod pamćenja je važno videti sve odjednom —
// ali nikad ispod 4rem (64 px), sa razmakom od 12 px.

interface BoardLayout {
    vars: string;
    /** Broj kolona iz `vars`, za proveru da li tabla staje na ekran: uspravno, položeno i (ako se razlikuje) na niskom ekranu */
    cols: { portrait: number; landscape: number; short?: number };
    /** Poslednje dve kartice se uspravno centriraju u svom redu */
    centerTail?: boolean;
}

/** Visina do koje važi `short` raspored (isti prag kao u `vars`) */
const SHORT_SCREEN_PX = 480;

const DEFAULT_LAYOUT: BoardLayout = { vars: "[--cols:4] [--rows:5]", cols: { portrait: 4, landscape: 4 } };
const LAYOUT: Record<number, BoardLayout> = {
    4: { vars: "[--cols:2] [--rows:2] landscape:[--cols:4] landscape:[--rows:1]", cols: { portrait: 2, landscape: 4 } },
    6: {
        vars: "[--cols:3] [--rows:2] [@media(max-height:480px)]:[--cols:6] [@media(max-height:480px)]:[--rows:1]",
        cols: { portrait: 3, landscape: 3, short: 6 },
    },
    8: {
        vars: "[--cols:4] [--rows:2] [@media(max-height:480px)]:[--cols:8] [@media(max-height:480px)]:[--rows:1]",
        cols: { portrait: 4, landscape: 4, short: 8 },
    },
    10: { vars: "[--cols:4] [--rows:3] landscape:[--cols:5] landscape:[--rows:2]", cols: { portrait: 4, landscape: 5 }, centerTail: true },
    12: { vars: "[--cols:4] [--rows:3] landscape:[--cols:6] landscape:[--rows:2]", cols: { portrait: 4, landscape: 6 } },
    14: { vars: "[--cols:4] [--rows:4] landscape:[--cols:7] landscape:[--rows:2]", cols: { portrait: 4, landscape: 7 }, centerTail: true },
    16: { vars: "[--cols:4] [--rows:4] landscape:[--cols:8] landscape:[--rows:2]", cols: { portrait: 4, landscape: 8 } },
    18: { vars: "[--cols:4] [--rows:5] landscape:[--cols:6] landscape:[--rows:3]", cols: { portrait: 4, landscape: 6 }, centerTail: true },
    20: { vars: "[--cols:4] [--rows:5] landscape:[--cols:5] landscape:[--rows:4]", cols: { portrait: 4, landscape: 5 } },
};
const TAIL_START = "col-start-2 landscape:col-start-auto";

const BOARD_STYLE = {
    // ≈17rem zauzimaju zaglavlje, traka napretka i uputstvo
    "--card": "clamp(4rem, calc((100dvh - 17rem) / var(--rows) - var(--gap)), 10rem)",
    gap: "var(--gap)",
    gridTemplateColumns: "repeat(var(--cols), minmax(0, 1fr))",
    maxWidth: "calc(var(--cols) * var(--card) + (var(--cols) - 1) * var(--gap))",
} as CSSProperties;

// Iste mere kao u BOARD_STYLE, u pikselima
const MIN_CARD_PX = 64;
const GAP_PX = 12;
const CHROME_PX = 272;
/** Telefon: kraća strana ekrana ispod ove širine */
const PHONE_SHORT_SIDE_PX = 480;
/** Na telefonu najviše 4 × 4 kartice */
const PHONE_MAX_PAIRS = 8;
/** Kad ni najmanja tabla ne staje u visinu (vrlo nizak ekran): jedan red od najviše 8 kartica */
const TINY_SCREEN_PAIRS = 4;

function fitsScreen(pairs: number, width: number, height: number): boolean {
    const cards = pairs * 2;
    const { cols } = LAYOUT[cards] ?? DEFAULT_LAYOUT;
    const columns = height <= SHORT_SCREEN_PX && cols.short ? cols.short : width > height ? cols.landscape : cols.portrait;
    const rows = Math.ceil(cards / columns);
    return rows * (MIN_CARD_PX + GAP_PX) - GAP_PX <= height - CHROME_PX;
}

/**
 * Najviše parova (do `wanted`) uz koje cela tabla staje na ekran, a kartica ostaje bar 64 px.
 * Meri se jednom, kad se karte dele; čita veličinu prozora, pa se zove samo iz početnog stanja.
 */
function pairsForScreen(wanted: number): number {
    if (typeof window === "undefined") return wanted;
    const { innerWidth: width, innerHeight: height } = window;
    const most = Math.min(width, height) < PHONE_SHORT_SIDE_PX ? Math.min(wanted, PHONE_MAX_PAIRS) : wanted;
    for (let pairs = most; pairs > TINY_SCREEN_PAIRS; pairs -= 1) {
        if (fitsScreen(pairs, width, height)) return pairs;
    }
    return Math.min(most, TINY_SCREEN_PAIRS);
}

// ── View ──────────────────────────────────────────────────────────────────────

/**
 * Jedan "zadatak" je jedan par. Otvaranje kartica koje dete još nije videlo je istraživanje, ne greška.
 * Greška pamćenja je promašaj koji se mogao izbeći: par prve kartice je već bio viđen, druga kartica je
 * već bila viđena, ili je par u tom trenutku svetleo kao pomoć.
 *
 *   correctCount   = parovi pronađeni samostalno iz prve prilike (bez greške pamćenja od prethodnog para, bez pomoći)
 *   promptedCount  = parovi pronađeni dok je par otvorene kartice svetleo (pomoć)
 *   incorrectCount = greške pamćenja
 */
export interface MemoryView extends BaseView {
    /** ID životinje na svakom mestu table (indeks = mesto kartice) */
    cards: string[];
    /** Mesta otvorenih, još nespojenih kartica (najviše dva) */
    flipped: number[];
    /** ID-jevi pronađenih životinja, redom kojim su pronađene */
    matched: string[];
    /** Mesta kartica koje je dete već videlo otvorene */
    seen: number[];
    /** Broj pokušaja (dve okrenute kartice = jedan potez) */
    moves: number;
    /** Greške pamćenja od poslednjeg pronađenog para */
    streak: number;
    /** Mesto kartice koja blago svetli kao pomoć */
    hint: number | null;
    /** Sve kartice su nakratko otkrivene na početku nivoa */
    peek: boolean;
    /** Upravo je pronađen par (promašaj se ne komentariše) */
    feedback: FeedbackKind;
    promptedCount: number;
}

/** Prazna tabla sa zatvorenim karticama — početno stanje monitora dok ne stigne prva poruka. */
function emptyView(pairs: number): MemoryView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: pairs,
        cards: Array.from({ length: pairs * 2 }, () => ""),
        flipped: [],
        matched: [],
        seen: [],
        moves: 0,
        streak: 0,
        hint: null,
        peek: false,
        feedback: null,
        promptedCount: 0,
    };
}

function dealCards(pairs: number, peek: boolean): MemoryView {
    const chosen = shuffle(ANIMAL_IDS).slice(0, pairs);
    const cards = shuffle([...chosen, ...chosen]);
    // Posle zavirivanja dete je videlo sve kartice
    return { ...emptyView(pairs), cards, peek, seen: peek ? cards.map((_, index) => index) : [] };
}

function partnerOf(cards: string[], index: number): number {
    return cards.findIndex((id, other) => id === cards[index] && other !== index);
}

function listOf<T extends string | number>(value: unknown, type: "string" | "number"): T[] {
    return Array.isArray(value) ? value.filter((item): item is T => typeof item === type) : [];
}

/** Stanje za monitor: podrazumevane vrednosti + ono što je stiglo, uz proveru nizova od kojih zavisi crtanje. */
function toShown(fallback: MemoryView, state: Partial<MemoryView> | null | undefined): MemoryView {
    const merged = { ...fallback, ...state };
    const cards = listOf<string>(merged.cards, "string");
    return {
        ...merged,
        cards: cards.length > 0 ? cards : fallback.cards,
        flipped: listOf<number>(merged.flipped, "number"),
        matched: listOf<string>(merged.matched, "string"),
        seen: listOf<number>(merged.seen, "number"),
    };
}

// ── Kartica ───────────────────────────────────────────────────────────────────

const GAME = getGame("memory");

interface MemoryCardProps {
    /** Redni broj na tabli, od 1 */
    position: number;
    animal: Animal | undefined;
    open: boolean;
    matched: boolean;
    hinted: boolean;
    disabled: boolean;
    className?: string;
    onFlip: () => void;
    onImageSettled: () => void;
}

function MemoryCard({ position, animal, open, matched, hinted, disabled, className, onFlip, onImageSettled }: MemoryCardProps) {
    const name = animal?.name ?? "Kartica";
    const label = matched ? `${name}, pronađen par` : open ? name : `Zatvorena kartica ${position}`;

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onFlip}
            aria-label={label}
            className={cn(
                "relative aspect-square w-full rounded-tile perspective-midrange transition-transform duration-150 enabled:active:scale-95 disabled:cursor-default",
                hinted && "animate-soft-pulse outline-4 outline-offset-2 outline-sun-400",
                className
            )}
        >
            {/* Okreće se unutrašnji sloj; kad sistem traži manje pokreta, kartica se menja bez animacije */}
            <span
                className={cn(
                    "absolute inset-0 block transition-transform duration-500 ease-out transform-3d motion-reduce:transition-none",
                    open && "rotate-y-180"
                )}
            >
                <span
                    className={cn(
                        "absolute inset-0 grid place-items-center rounded-tile border-2 border-b-[5px] bg-gradient-to-br shadow-soft backface-hidden",
                        GAME.accent.edge,
                        GAME.accent.gradient
                    )}
                >
                    <span aria-hidden="true" className="font-display text-3xl font-extrabold text-white/90 sm:text-4xl">
                        ?
                    </span>
                </span>

                <span
                    className={cn(
                        "absolute inset-0 rotate-y-180 overflow-hidden rounded-tile border-[3px] bg-surface shadow-soft backface-hidden",
                        matched ? "border-emerald-400" : "border-brand-300"
                    )}
                >
                    {animal && (
                        <Image
                            src={animal.src}
                            alt={animal.name}
                            fill
                            // Slika je položena (≈1,8:1) i iseca se na kvadrat, pa je šira od same kartice
                            sizes="(min-width: 640px) 320px, 50vw"
                            loading="eager"
                            draggable={false}
                            onLoad={onImageSettled}
                            onError={onImageSettled}
                            className="select-none object-cover"
                        />
                    )}
                    {matched && (
                        <span
                            aria-hidden="true"
                            className="absolute right-1 top-1 grid h-6 w-6 animate-pop place-items-center rounded-full bg-emerald-600 text-sm font-black text-white ring-2 ring-white sm:h-7 sm:w-7 sm:text-base"
                        >
                            ✓
                        </span>
                    )}
                </span>
            </span>
        </button>
    );
}

// ── Pokazivanje ───────────────────────────────────────────────────────────────
// Uz svako uputstvo kratko se istakne ono o čemu uputstvo govori (ovde: tabla sa karticama):
// jedan miran puls, pa mir. Zajednički kit ovo još nema, pa je kuka lokalna.

const DEMO_MS = 1500;
/** Uz `animate-soft-pulse`: jedan krug umesto beskonačnog ponavljanja */
const PULSE_ONCE: CSSProperties = { animationDuration: `${DEMO_MS}ms`, animationIterationCount: 1 };

function useDemo(enabled: boolean) {
    const [demo, setDemo] = useState({ on: enabled, run: 0 });
    const timer = useRef<TimerId | null>(null);

    const arm = useCallback(() => {
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            timer.current = null;
            setDemo((current) => ({ ...current, on: false }));
        }, DEMO_MS);
    }, []);

    useEffect(() => {
        if (enabled) arm();
        return () => {
            if (timer.current !== null) clearTimeout(timer.current);
        };
    }, [enabled, arm]);

    /** Ponovo pokazuje (novo uputstvo ili dugme „Ponovi”); `run` se menja da bi puls krenuo iz početka */
    const show = useCallback(() => {
        setDemo((current) => ({ on: true, run: current.run + 1 }));
        arm();
    }, [arm]);

    return { on: demo.on, run: demo.run, show };
}

// ── Igra ──────────────────────────────────────────────────────────────────────
// Tekstovi su kratki, doslovni i bez roda. Promašaj se ne komentariše: kartice se samo vrate.

const TEXT_PEEK = "Pogledaj slike i zapamti gde su.";
const TEXT_FIND = "Pronađi dve iste slike.";
const TEXT_HINT = "Dodirni karticu koja svetli.";
/** Ako se slike sporo učitavaju, zavirivanje se ipak završava posle ovoliko dodatnog čekanja */
const PEEK_GRACE_MS = 3000;
const MATCH_FEEDBACK_MS = 1600;
const CELEBRATE_MS = 1400;

export default function MemoryGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<MemoryView>) {
    const cfg = configFor(level);
    const settings = useChildSettings();

    const sync = useGameSync<MemoryView>({ childId, gameId: "memory", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const guard = useInputGuard();
    const demo = useDemo(!isMonitor);

    // Monitor nema podešavanja deteta ni njegov ekran: tabla stiže u `monitorState`
    const [view, setView] = useState<MemoryView>(() => {
        if (isMonitor) return emptyView(cfg.pairs);
        const pairs = pairsForScreen(Math.min(cfg.pairs, settings.preset.memoryMaxPairs));
        return dealCards(pairs, cfg.peek || settings.activeBand === "young");
    });

    // Poslednje stanje za rukovaoce i tajmere (dva brza dodira ne vide zastarelo stanje)
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const peekTimer = useRef<TimerId | null>(null);
    const peekArmed = useRef(false);
    const settledImages = useRef(new Set<number>());
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: MemoryView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    const showDemo = demo.show;
    const endPeek = useCallback(() => {
        peekTimer.current = null;
        const current = viewRef.current;
        if (!current.peek) return;
        // Kartice se zatvaraju: dodir koji je ostao od gledanja ne sme da otvori karticu
        guard.hold();
        commit({ ...current, peek: false }, "Kartice su sakrivene, traženje parova počinje");
        showDemo();
        say(TEXT_FIND);
    }, [commit, guard, say, showDemo]);

    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
    }, [isMonitor, sync, guard]);

    useEffect(() => {
        if (!isMonitor) say(viewRef.current.peek ? TEXT_PEEK : TEXT_FIND);
    }, [isMonitor, say]);

    // Rezervni kraj zavirivanja; čim se sve slike učitaju, zamenjuje ga tačno odmereni tajmer (handleImageSettled)
    useEffect(() => {
        const current = viewRef.current;
        if (isMonitor || !current.peek || peekArmed.current) return;
        const id = after(peekMsFor(current.totalRounds) + PEEK_GRACE_MS, endPeek);
        peekTimer.current = id;
        return () => cancel(id);
    }, [isMonitor, after, cancel, endPeek]);

    /** Zavirivanje se meri tek kad su sve slike na ekranu, da dete ne gleda prazne kartice. */
    const handleImageSettled = (index: number) => {
        if (isMonitor) return;
        settledImages.current.add(index);
        const current = viewRef.current;
        if (!current.peek || peekArmed.current || settledImages.current.size < current.cards.length) return;
        peekArmed.current = true;
        cancel(peekTimer.current);
        peekTimer.current = after(peekMsFor(current.totalRounds), endPeek);
    };

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        // total    = broj parova
        // correct  = parovi pronađeni samostalno iz prve prilike: bez pomoći i bez greške pamćenja od
        //            prethodnog para (otvaranje još neviđenih kartica se ne računa kao greška)
        // prompted = parovi pronađeni dok je par otvorene kartice svetleo kao pomoć
        // Ostatak (total − correct − prompted) su parovi pronađeni posle greške, ali bez pomoći.
        onCompleteRef.current({
            score: final.score,
            durationSec: sync.elapsedSec(),
            correct: final.correctCount,
            total: final.totalRounds,
            prompted: final.promptedCount,
        });
    };

    const handleFlip = (index: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const id = current.cards[index];
        const animal = animalOf(id);
        // Zaključano: zavirivanje, dve otvorene kartice koje čekaju da se vrate, već otvorena ili spojena kartica
        // (zato se ni ponovljeni dodir iste kartice nikad ne računa kao potez)
        if (!animal || current.peek || current.flipped.length >= 2 || current.flipped.includes(index) || current.matched.includes(id)) {
            return;
        }

        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const seen = current.seen.includes(index) ? current.seen : [...current.seen, index];

        if (current.flipped.length === 0) {
            const partner = partnerOf(current.cards, index);
            // Pomoć: posle zadatog broja grešaka pamćenja par otvorene kartice blago svetli (0 = nikad)
            const hint = settings.hintAfter > 0 && current.streak >= settings.hintAfter && partner >= 0 ? partner : null;
            playSfx("flip");
            commit(
                { ...current, flipped: [index], seen, feedback: null, hint },
                `Otvorena kartica: ${animal.name}${hint !== null ? " (prikazana pomoć)" : ""}`
            );
            return;
        }

        const firstIndex = current.flipped[0];
        const firstId = current.cards[firstIndex];
        const moves = current.moves + 1;

        if (firstId === id) {
            const matched = [...current.matched, id];
            const pairs = current.totalRounds;
            const allFound = matched.length >= pairs;
            const prompted = current.hint !== null;
            const firstTry = !prompted && current.streak === 0;
            const how = firstTry ? "iz prve prilike" : prompted ? "uz pomoć" : "posle greške";
            commit(
                {
                    ...current,
                    flipped: [],
                    matched,
                    seen,
                    moves,
                    streak: 0,
                    hint: null,
                    feedback: "correct",
                    score: current.score + (firstTry ? 10 : 5),
                    correctCount: current.correctCount + (firstTry ? 1 : 0),
                    promptedCount: current.promptedCount + (prompted ? 1 : 0),
                    round: Math.min(matched.length + 1, pairs),
                },
                `Pronađen par ${how}: ${animal.name} (${matched.length} od ${pairs})`
            );
            playSfx(allFound ? "win" : "correct");
            say(`${animal.name}.`);
            if (allFound) {
                after(CELEBRATE_MS, finish);
                return;
            }
            feedbackTimer.current = after(MATCH_FEEDBACK_MS, () => {
                feedbackTimer.current = null;
                commit({ ...viewRef.current, feedback: null });
            });
            return;
        }

        // Nije par. Bez poruke i bez zvuka greške: kartice se same vrate.
        const avoidable = current.hint !== null || current.seen.includes(partnerOf(current.cards, firstIndex)) || current.seen.includes(index);
        playSfx("flip");
        commit(
            {
                ...current,
                flipped: [firstIndex, index],
                seen,
                moves,
                streak: current.streak + (avoidable ? 1 : 0),
                hint: null,
                feedback: null,
                incorrectCount: current.incorrectCount + (avoidable ? 1 : 0),
            },
            `Nije par: ${animalOf(firstId)?.name ?? "kartica"} i ${animal.name}${avoidable ? "" : " (istraživanje)"}`
        );
        after(cfg.flipBackMs, () => commit({ ...viewRef.current, flipped: [] }));
    };

    const repeatInstruction = () => {
        demo.show();
        say(viewRef.current.peek ? TEXT_PEEK : TEXT_FIND);
    };

    const shown = isMonitor ? toShown(emptyView(cfg.pairs), monitorState) : view;
    const pairs = Math.max(shown.totalRounds, 1);
    const lastFound = animalOf(shown.matched[shown.matched.length - 1]);
    const layout = LAYOUT[shown.cards.length] ?? DEFAULT_LAYOUT;
    // Brojevi (poeni, potezi) se mlađoj deci ne prikazuju; roditelj ih na monitoru vidi
    const showNumbers = isMonitor || settings.preset.showPoints;

    let instruction = TEXT_FIND;
    if (shown.peek) instruction = TEXT_PEEK;
    else if (shown.hint !== null) instruction = TEXT_HINT;

    const foundName = lastFound?.name.toLowerCase();
    const correctText = foundName ? `Par: ${foundName} i ${foundName}.` : "Par je pronađen.";

    return (
        <GameStage width="wide">
            <GameHud
                round={shown.round}
                totalRounds={pairs}
                score={showNumbers ? shown.score : undefined}
                unit="Par"
                onSpeak={isMonitor ? undefined : repeatInstruction}
                extra={
                    showNumbers && (
                        <div className="hidden shrink-0 rounded-xl bg-brand-50 px-3 py-2 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100 sm:block sm:text-base">
                            Potezi: {shown.moves}
                        </div>
                    )
                }
            />

            {/* Uputstvo i povratna poruka dele isto mesto, da tabla ne skače */}
            <div className="grid min-h-12 place-items-center *:col-start-1 *:row-start-1">
                <p
                    aria-hidden={shown.feedback ? true : undefined}
                    className={cn(
                        "text-center font-display text-lg font-extrabold text-ink transition-opacity duration-200 sm:text-2xl",
                        shown.feedback && "opacity-0"
                    )}
                >
                    {instruction}
                </p>
                <Feedback kind={shown.feedback} correctText={correctText} />
            </div>

            <div className={cn("relative rounded-card border p-3 sm:p-5", GAME.accent.border, GAME.accent.soft)}>
                {demo.on && (
                    <span
                        key={demo.run}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 animate-soft-pulse rounded-card ring-4 ring-brand-300"
                        style={PULSE_ONCE}
                    />
                )}
                <div
                    role="group"
                    aria-label="Kartice"
                    className={cn("mx-auto grid w-full [--gap:0.75rem]", layout.vars, isMonitor && "pointer-events-none")}
                    style={BOARD_STYLE}
                >
                    {shown.cards.map((id, index) => {
                        const matched = shown.matched.includes(id);
                        const open = shown.peek || shown.flipped.includes(index) || matched;
                        return (
                            <MemoryCard
                                key={index}
                                position={index + 1}
                                animal={animalOf(id)}
                                open={open}
                                matched={matched}
                                hinted={shown.hint === index && !open}
                                disabled={isMonitor || open}
                                className={layout.centerTail && index === shown.cards.length - 2 ? TAIL_START : undefined}
                                onFlip={() => handleFlip(index)}
                                onImageSettled={() => handleImageSettled(index)}
                            />
                        );
                    })}
                </div>
            </div>
        </GameStage>
    );
}
