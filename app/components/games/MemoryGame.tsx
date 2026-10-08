"use client";

// Spoji parove — dete okreće po dve kartice i traži iste životinje.
// Nema vremena ni neuspeha: promašen par se sam vrati, a posle više promašaja zaredom par blago svetli.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
    Feedback,
    GameHud,
    GameStage,
    isFemale,
    playSfx,
    shuffle,
    useGameSync,
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

interface LevelConfig {
    pairs: number;
    /** Koliko dugo su sve kartice otkrivene na početku (0 = bez zavirivanja) */
    peekMs: number;
    /** Posle koliko promašaja zaredom par otvorene kartice počinje da svetli */
    hintAfter: number;
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

/** Lako / srednje / teško: pomoć stiže kasnije, a promašen par se brže vraća. */
const TIERS = [
    { hintAfter: 2, flipBackMs: 1300 },
    { hintAfter: 3, flipBackMs: 1100 },
    { hintAfter: 4, flipBackMs: 900 },
];

const LEVELS: LevelConfig[] = BOARDS.map(({ pairs, peek }, index) => ({
    pairs,
    peekMs: peek ? 2000 + pairs * 400 : 0,
    ...TIERS[Math.min(Math.floor(index / LEVELS_PER_TIER), TIERS.length - 1)],
}));

function configFor(level: number): LevelConfig {
    const index = Math.min(Math.max(Math.round(level) || 1, 1), LEVELS.length) - 1;
    return LEVELS[index];
}

// ── View ──────────────────────────────────────────────────────────────────────

export interface MemoryView extends BaseView {
    /** ID životinje na svakom mestu table (indeks = mesto kartice) */
    cards: string[];
    /** Mesta otvorenih, još nespojenih kartica (najviše dva) */
    flipped: number[];
    /** ID-jevi pronađenih životinja, redom kojim su pronađene */
    matched: string[];
    /** Broj pokušaja (dve okrenute kartice = jedan potez) */
    moves: number;
    /** Promašaji zaredom od poslednjeg pronađenog para */
    streak: number;
    /** Mesto kartice koja blago svetli kao pomoć */
    hint: number | null;
    /** Sve kartice su nakratko otkrivene na početku nivoa */
    peek: boolean;
    feedback: FeedbackKind;
}

/** Prazna tabla sa zatvorenim karticama — početno stanje monitora dok ne stigne prva poruka. */
function emptyView(cfg: LevelConfig): MemoryView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: cfg.pairs,
        cards: Array.from({ length: cfg.pairs * 2 }, () => ""),
        flipped: [],
        matched: [],
        moves: 0,
        streak: 0,
        hint: null,
        peek: false,
        feedback: null,
    };
}

function dealCards(cfg: LevelConfig): MemoryView {
    const chosen = shuffle(ANIMAL_IDS).slice(0, cfg.pairs);
    return { ...emptyView(cfg), cards: shuffle([...chosen, ...chosen]), peek: cfg.peekMs > 0 };
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
    };
}

// ── Raspored ──────────────────────────────────────────────────────────────────
// Uspravno najviše 4 kolone (kartica ostaje dovoljno velika za prst), položeno više kolona i manje redova.
// Kartica se smanjuje da cela tabla stane u visinu ekrana — kod pamćenja je važno videti sve odjednom.

interface BoardLayout {
    vars: string;
    /** Poslednje dve kartice se uspravno centriraju u svom redu */
    centerTail?: boolean;
}

const DEFAULT_LAYOUT: BoardLayout = { vars: "[--cols:4] [--rows:5]" };
const LAYOUT: Record<number, BoardLayout> = {
    4: { vars: "[--cols:2] [--rows:2] landscape:[--cols:4] landscape:[--rows:1]" },
    6: { vars: "[--cols:3] [--rows:2] [@media(max-height:480px)]:[--cols:6] [@media(max-height:480px)]:[--rows:1]" },
    8: { vars: "[--cols:4] [--rows:2] [@media(max-height:480px)]:[--cols:8] [@media(max-height:480px)]:[--rows:1]" },
    10: { vars: "[--cols:4] [--rows:3] landscape:[--cols:5] landscape:[--rows:2]", centerTail: true },
    12: { vars: "[--cols:4] [--rows:3] landscape:[--cols:6] landscape:[--rows:2]" },
    14: { vars: "[--cols:4] [--rows:4] landscape:[--cols:7] landscape:[--rows:2]", centerTail: true },
    16: { vars: "[--cols:4] [--rows:4] landscape:[--cols:8] landscape:[--rows:2]" },
    18: { vars: "[--cols:4] [--rows:5] landscape:[--cols:6] landscape:[--rows:3]", centerTail: true },
    20: { vars: "[--cols:4] [--rows:5] landscape:[--cols:5] landscape:[--rows:4]" },
};
const TAIL_START = "col-start-2 landscape:col-start-auto";

const BOARD_STYLE = {
    // ≈17rem zauzimaju zaglavlje, traka napretka i uputstvo
    "--card": "clamp(3.75rem, calc((100dvh - 17rem) / var(--rows) - var(--gap)), 10rem)",
    gap: "var(--gap)",
    gridTemplateColumns: "repeat(var(--cols), minmax(0, 1fr))",
    maxWidth: "calc(var(--cols) * var(--card) + (var(--cols) - 1) * var(--gap))",
} as CSSProperties;

// ── Kartica ───────────────────────────────────────────────────────────────────

const GAME = getGame("memory");

interface MemoryCardProps {
    /** Redni broj na tabli, od 1 */
    position: number;
    animal: Animal | undefined;
    open: boolean;
    matched: boolean;
    missed: boolean;
    hinted: boolean;
    disabled: boolean;
    className?: string;
    onFlip: () => void;
    onImageSettled: () => void;
}

function MemoryCard({ position, animal, open, matched, missed, hinted, disabled, className, onFlip, onImageSettled }: MemoryCardProps) {
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
                        matched ? "border-emerald-400" : missed ? "border-rose-300" : "border-brand-300"
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
                            className="absolute right-1 top-1 grid h-6 w-6 animate-pop place-items-center rounded-full bg-emerald-500 text-sm font-black text-white ring-2 ring-white sm:h-7 sm:w-7 sm:text-base"
                        >
                            ✓
                        </span>
                    )}
                </span>
            </span>
        </button>
    );
}

// ── Igra ──────────────────────────────────────────────────────────────────────

const SPEECH_PEEK = "Dobro pogledaj slike i zapamti gde su.";
const SPEECH_FIND = "Pronađi dve iste slike.";
/** Ako se slike sporo učitavaju, zavirivanje se ipak završava posle ovoliko dodatnog čekanja */
const PEEK_GRACE_MS = 3000;
const MATCH_FEEDBACK_MS = 1400;
const CELEBRATE_MS = 1100;

export default function MemoryGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<MemoryView>) {
    const cfg = configFor(level);
    const female = isFemale(gender);

    const sync = useGameSync<MemoryView>({ childId, gameId: "memory", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();

    const [view, setView] = useState<MemoryView>(() => (isMonitor ? emptyView(cfg) : dealCards(cfg)));

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

    const endPeek = useCallback(() => {
        peekTimer.current = null;
        const current = viewRef.current;
        if (!current.peek) return;
        commit({ ...current, peek: false }, "Kartice su sakrivene, traženje parova počinje");
        say(SPEECH_FIND);
    }, [commit, say]);

    useEffect(() => {
        if (!isMonitor) sync.start(viewRef.current);
    }, [isMonitor, sync]);

    useEffect(() => {
        if (!isMonitor) say(viewRef.current.peek ? SPEECH_PEEK : SPEECH_FIND);
    }, [isMonitor, say]);

    // Rezervni kraj zavirivanja; čim se sve slike učitaju, zamenjuje ga tačno odmereni tajmer (handleImageSettled)
    useEffect(() => {
        if (isMonitor || !viewRef.current.peek || peekArmed.current) return;
        const id = after(cfg.peekMs + PEEK_GRACE_MS, endPeek);
        peekTimer.current = id;
        return () => cancel(id);
    }, [isMonitor, after, cancel, cfg, endPeek]);

    /** Zavirivanje se meri tek kad su sve slike na ekranu, da dete ne gleda prazne kartice. */
    const handleImageSettled = (index: number) => {
        if (isMonitor) return;
        settledImages.current.add(index);
        const current = viewRef.current;
        if (!current.peek || peekArmed.current || settledImages.current.size < current.cards.length) return;
        peekArmed.current = true;
        cancel(peekTimer.current);
        peekTimer.current = after(cfg.peekMs, endPeek);
    };

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        const pairs = final.totalRounds;
        // Zvezdice: total = broj parova. Jedan promašaj po paru je deo igre i ne kažnjava se;
        // svakih `hintAfter` promašaja preko toga oduzima jedan par (lako 2, srednje 3, teško 4).
        // Dete koje prati pomoć ima najviše hintAfter promašaja po paru, pa uvek dobija bar jednu zvezdicu.
        const penalty = Math.floor(Math.max(0, final.incorrectCount - pairs) / cfg.hintAfter);
        sync.complete(final);
        onCompleteRef.current({
            score: final.score,
            durationSec: sync.elapsedSec(),
            correct: Math.max(0, pairs - penalty),
            total: pairs,
        });
    };

    const handleFlip = (index: number) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        const id = current.cards[index];
        const animal = animalOf(id);
        // Zaključano: zavirivanje, dve otvorene kartice koje čekaju da se vrate, već otvorena ili spojena kartica
        if (!animal || current.peek || current.flipped.length >= 2 || current.flipped.includes(index) || current.matched.includes(id)) {
            return;
        }

        cancel(feedbackTimer.current);
        feedbackTimer.current = null;

        if (current.flipped.length === 0) {
            const partner = current.cards.findIndex((other, i) => other === id && i !== index);
            const hint = current.streak >= cfg.hintAfter && partner >= 0 ? partner : null;
            playSfx("flip");
            commit(
                { ...current, flipped: [index], feedback: null, hint },
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
            commit(
                {
                    ...current,
                    flipped: [],
                    matched,
                    moves,
                    streak: 0,
                    hint: null,
                    feedback: "correct",
                    // Par pronađen uz najviše jedan promašaj vredi više
                    score: current.score + (current.streak <= 1 ? 10 : 5),
                    correctCount: matched.length,
                    round: Math.min(matched.length + 1, pairs),
                },
                `Pronađen par: ${animal.name} (${matched.length} od ${pairs})`
            );
            if (allFound) {
                playSfx("win");
                after(CELEBRATE_MS, finish);
                return;
            }
            playSfx("correct");
            say(animal.name);
            feedbackTimer.current = after(MATCH_FEEDBACK_MS, () => {
                feedbackTimer.current = null;
                commit({ ...viewRef.current, feedback: null });
            });
            return;
        }

        playSfx("flip");
        commit(
            {
                ...current,
                flipped: [firstIndex, index],
                moves,
                streak: current.streak + 1,
                hint: null,
                feedback: "wrong",
                incorrectCount: current.incorrectCount + 1,
            },
            `Nije par: ${animalOf(firstId)?.name ?? "kartica"} i ${animal.name}`
        );
        after(cfg.flipBackMs, () => commit({ ...viewRef.current, flipped: [], feedback: null }));
    };

    const shown = isMonitor ? toShown(emptyView(cfg), monitorState) : view;
    const pairs = Math.max(shown.totalRounds, 1);
    const allFound = shown.matched.length >= pairs;
    const lastFound = animalOf(shown.matched[shown.matched.length - 1]);
    const layout = LAYOUT[shown.cards.length] ?? DEFAULT_LAYOUT;

    let instruction = "Pronađi dve iste slike";
    if (shown.peek) instruction = "Dobro pogledaj i zapamti slike";
    else if (shown.hint !== null) instruction = "Pogledaj karticu koja svetli";

    let correctText = lastFound ? `${lastFound.name}! Bravo!` : "Bravo!";
    if (allFound) correctText = female ? "Pronašla si sve parove! Bravo!" : "Pronašao si sve parove! Bravo!";

    return (
        <GameStage width="wide">
            <GameHud
                round={shown.round}
                totalRounds={pairs}
                score={shown.score}
                unit="Par"
                onSpeak={isMonitor ? undefined : () => say(view.peek ? SPEECH_PEEK : SPEECH_FIND)}
                extra={
                    <div className="hidden shrink-0 rounded-xl bg-brand-50 px-3 py-2 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100 sm:block sm:text-base">
                        Potezi: {shown.moves}
                    </div>
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
                <Feedback kind={shown.feedback} correctText={correctText} wrongText="Nisu iste. Probaj ponovo" />
            </div>

            <div className={cn("rounded-card border p-3 sm:p-5", GAME.accent.border, GAME.accent.soft)}>
                <div
                    role="group"
                    aria-label="Kartice"
                    className={cn("mx-auto grid w-full [--gap:0.5rem] sm:[--gap:0.75rem]", layout.vars, isMonitor && "pointer-events-none")}
                    style={BOARD_STYLE}
                >
                    {shown.cards.map((id, index) => {
                        const matched = shown.matched.includes(id);
                        const flipped = shown.flipped.includes(index);
                        const open = shown.peek || flipped || matched;
                        return (
                            <MemoryCard
                                key={index}
                                position={index + 1}
                                animal={animalOf(id)}
                                open={open}
                                matched={matched}
                                missed={flipped && shown.feedback === "wrong"}
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
