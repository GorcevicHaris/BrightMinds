"use client";

// Spoji parove — dete okreće po dve kartice i traži iste slike (životinje, igračke, oblici u boji).
// Nema vremena ni neuspeha: promašen par se sam vrati (bez komentara), a posle onoliko grešaka pamćenja
// koliko je zadato u podešavanjima deteta par otvorene kartice blago svetli (na lakim nivoima već
// posle prve). Nivoi 11–15 su „Zapamti gde je šta bilo” (MemoryScene.tsx). Nivoi: data/memoryLevels.ts.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    Feedback,
    GameHud,
    GameStage,
    PlayArea,
    playSfx,
    PULSE_ONCE,
    shuffle,
    useDemo,
    useGameSync,
    useInputGuard,
    useBubbleTail,
    useSayThen,
    useTimers,
    type BaseView,
    type FeedbackKind,
    type GameProps,
    type TimerId,
    useWaitHint,
    usePraise,
    useGameRandom,
} from "@/app/components/games/kit";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { cardArt, DECKS, memoryLevel, PAIR_LEVELS, poolSize, type DeckId, type MemoryCardArt, type PairsLevel } from "@/app/components/games/data/memoryLevels";
import MemoryScene, { CardFace } from "./MemoryScene";
import { useSpeech } from "@/lib/speech";

// ── Sličice ───────────────────────────────────────────────────────────────────
// Male table koriste samo početak špila (najrazličitije slike), a slične slike stižu tek na
// većim tablama, gde otežavaju pamćenje.

const animalOf = cardArt;

// ── Nivoi ─────────────────────────────────────────────────────────────────────
// Raste broj parova; svaka nova veličina table se na lakšim nivoima prvo igra uz kratko "zavirivanje".
// Stvarni broj parova dodatno ograničavaju podešavanja deteta (uzrast) i veličina ekrana.

/**
 * Promašen par ostaje otkriven dovoljno dugo da se obe slike stvarno vide (okretanje traje pola
 * sekunde). Isto na svim nivoima: težinu čini broj kartica, a ne brzina. Dete koje je već
 * zapamtilo ne mora da čeka — sledeći dodir odmah vraća par.
 */
const FLIP_BACK_MS = 2000;
/** Toliko posle promašaja dodir još ne vraća par (druga kartica se tek okreće) */
const MISMATCH_MIN_MS = 800;

/** Indeks među nivoima sa parovima (nivoi 1–10) */
function levelIndex(level: number): number {
    const cfg = memoryLevel(level);
    return cfg.kind === "pairs" ? PAIR_LEVELS.indexOf(cfg) : PAIR_LEVELS.length - 1;
}

function configFor(level: number): PairsLevel {
    return PAIR_LEVELS[levelIndex(level)];
}

interface Deal {
    pairs: number;
    peek: boolean;
    /** Trajanje zavirivanja u odnosu na puno (1 = puno) */
    peekScale: number;
}

/**
 * Šta se stvarno deli detetu. Broj parova ograničava uzrast (`maxPairs`), pa kad se on dostigne
 * nivoi i dalje moraju da se razlikuju:
 *  • mlađi uvek zaviruju, ali sve kraće — svaki nivo sa istim brojem parova skraćuje gledanje;
 *  • ostali zaviruju samo dok tabla još raste; kad je najveća, zavirivanja više nema
 *    (nivo sa zavirivanjem nikad ne dolazi posle istog bez njega).
 */
function dealFor(level: number, maxPairs: number, young: boolean): Deal {
    const index = levelIndex(level);
    const pairs = Math.min(PAIR_LEVELS[index].pairs, maxPairs);
    if (young) {
        const first = PAIR_LEVELS.findIndex((cfg) => Math.min(cfg.pairs, maxPairs) === pairs);
        return { pairs, peek: true, peekScale: Math.max(0.4, 1 - 0.08 * (index - first)) };
    }
    const capped = PAIR_LEVELS[index].pairs > maxPairs;
    return { pairs, peek: PAIR_LEVELS[index].peek && !capped, peekScale: 1 };
}

/** Koliko dugo traje zavirivanje: više kartica, više vremena */
function peekMsFor(pairs: number, scale = 1): number {
    return Math.round((2400 + pairs * 450) * scale);
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
        // Uspravno dve kolone: šest kartica tada popuni ekran telefona umesto da ostanu male u dva reda
        vars: "[--cols:2] [--rows:3] landscape:[--cols:3] landscape:[--rows:2] [@media(max-height:480px)]:[--cols:6] [@media(max-height:480px)]:[--rows:1]",
        cols: { portrait: 2, landscape: 3, short: 6 },
    },
    8: {
        // Uspravno dve kolone i četiri reda: na telefonu su kartice tako znatno veće
        vars: "[--cols:2] [--rows:4] landscape:[--cols:4] landscape:[--rows:2] [@media(max-height:480px)]:[--cols:8] [@media(max-height:480px)]:[--rows:1]",
        cols: { portrait: 2, landscape: 4, short: 8 },
    },
    10: { vars: "[--cols:4] [--rows:3] landscape:[--cols:5] landscape:[--rows:2]", cols: { portrait: 4, landscape: 5 }, centerTail: true },
    12: { vars: "[--cols:3] [--rows:4] landscape:[--cols:6] landscape:[--rows:2]", cols: { portrait: 3, landscape: 6 } },
    14: { vars: "[--cols:4] [--rows:4] landscape:[--cols:7] landscape:[--rows:2]", cols: { portrait: 4, landscape: 7 }, centerTail: true },
    16: { vars: "[--cols:4] [--rows:4] landscape:[--cols:8] landscape:[--rows:2]", cols: { portrait: 4, landscape: 8 } },
    18: { vars: "[--cols:4] [--rows:5] landscape:[--cols:6] landscape:[--rows:3]", cols: { portrait: 4, landscape: 6 }, centerTail: true },
    20: { vars: "[--cols:4] [--rows:5] landscape:[--cols:5] landscape:[--rows:4]", cols: { portrait: 4, landscape: 5 } },
};
const TAIL_START = "col-start-2 landscape:col-start-auto";

const BOARD_STYLE = {
    // ≈22rem zauzimaju zaglavlje, traka napretka (sa učiteljem) i uputstvo; na niskom ekranu (`short`) i razmaci oko table
    "--card": "clamp(4rem, calc((100dvh - var(--chrome)) / var(--rows) - var(--gap)), 14rem)",
    gap: "var(--gap)",
    gridTemplateColumns: "repeat(var(--cols), minmax(0, 1fr))",
    maxWidth: "calc(var(--cols) * var(--card) + (var(--cols) - 1) * var(--gap))",
} as CSSProperties;

// Iste mere kao u BOARD_STYLE, u pikselima
const MIN_CARD_PX = 64;
const GAP_PX = 12;
const CHROME_PX = 352;
/** Na niskom ekranu (do 820 px, kao `short`) */
const CHROME_SHORT_PX = 368;
const SHORT_VARIANT_PX = 820;
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
    return rows * (MIN_CARD_PX + GAP_PX) - GAP_PX <= height - (height <= SHORT_VARIANT_PX ? CHROME_SHORT_PX : CHROME_PX);
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

function dealCards(pairs: number, peek: boolean, deckId: DeckId, random: () => number): MemoryView {
    const deck = DECKS[deckId];
    const chosen = shuffle(deck.slice(0, poolSize(deck, pairs)).map((card) => card.id), random).slice(0, pairs);
    const cards = shuffle([...chosen, ...chosen], random);
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
    /** Ključ poteza za zajedničku tablu (`card:<mesto u view.cards>`) */
    action: string;
    animal: MemoryCardArt | undefined;
    open: boolean;
    matched: boolean;
    hinted: boolean;
    disabled: boolean;
    className?: string;
    onFlip: () => void;
    onImageSettled: () => void;
}

function MemoryCard({ position, action, animal, open, matched, hinted, disabled, className, onFlip, onImageSettled }: MemoryCardProps) {
    const name = animal?.name ?? "Kartica";
    const label = matched ? `${name}, pronađen par` : open ? name : `Zatvorena kartica ${position}`;

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onFlip}
            data-action={action}
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
                    {/* Poleđina: unutrašnji okvir i znak u krugu — kartica izgleda kao prava, a ne kao prazno polje */}
                    <span aria-hidden="true" className="absolute inset-[7%] rounded-[1rem] border-2 border-white/25" />
                    <span
                        aria-hidden="true"
                        className="grid aspect-square w-[42%] place-items-center rounded-full bg-white/20 font-display text-[clamp(1.5rem,6cqw,3rem)] font-extrabold text-white ring-2 ring-white/30"
                    >
                        ?
                    </span>
                </span>

                <span
                    className={cn(
                        "absolute inset-0 rotate-y-180 overflow-hidden rounded-tile border-[3px] bg-surface shadow-soft backface-hidden",
                        matched ? "border-emerald-400" : "border-brand-300"
                    )}
                >
                    {animal && <CardFace art={animal} sizes="(min-width: 640px) 224px, 45vw" onSettled={onImageSettled} />}
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

// ── Igra ──────────────────────────────────────────────────────────────────────
// Tekstovi su kratki, doslovni i bez roda. Promašaj se ne komentariše: kartice se samo vrate.

const TEXT_PEEK = "Pogledaj slike i zapamti gde su.";
const TEXT_FIND = "Pronađi dve iste slike.";
const TEXT_HINT = "Seti se gde je bila ista slika.";
/** Ako se slike sporo učitavaju, zavirivanje se ipak završava posle ovoliko dodatnog čekanja */
const PEEK_GRACE_MS = 5000;
const MATCH_FEEDBACK_MS = 1600;

export default function MemoryGame(props: GameProps<MemoryView>) {
    // Nivoi 11–15: „Zapamti gde je šta bilo” — posebna igra sa policom
    if (memoryLevel(props.level).kind === "scene") return <MemoryScene {...(props as GameProps)} />;
    return <PairsGame {...props} />;
}

function PairsGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<MemoryView>) {
    const cfg = configFor(level);
    const settings = useChildSettings();

    const sync = useGameSync<MemoryView>({ childId, gameId: "memory", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();
    const demo = useDemo(!isMonitor);

    /** Na lakim nivoima par zasvetli već posle prve greške pamćenja (osim kad je roditelj isključio pomoć) */
    const hintAfter = cfg.earlyHint && settings.hintAfter > 0 ? 1 : settings.hintAfter;
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [deal] = useState<Deal>(() => dealFor(level, settings.preset.memoryMaxPairs, settings.activeBand === "young"));
    // Monitor nema podešavanja deteta ni njegov ekran: tabla stiže u `monitorState`
    const [view, setView] = useState<MemoryView>(() => {
        if (isMonitor) return emptyView(cfg.pairs);
        return dealCards(pairsForScreen(deal.pairs), deal.peek, cfg.deck, random);
    });

    // Poslednje stanje za rukovaoce i tajmere (dva brza dodira ne vide zastarelo stanje)
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const peekTimer = useRef<TimerId | null>(null);
    const peekArmed = useRef(false);
    /** Zavirivanje se meri tek kad je uputstvo izgovoreno — dok glas govori, dete još ne gleda kartice */
    const peekSpoken = useRef(false);
    const settledImages = useRef(new Set<number>());
    const flipBackTimer = useRef<TimerId | null>(null);
    /** Promašen par sme da se vrati dodirom tek kad se druga kartica okrenula do kraja */
    const mismatchSettled = useRef(false);
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

    /** Zavirivanje se meri tek kad su sve slike na ekranu i uputstvo izgovoreno: dete ne gleda prazne kartice ni dok još sluša. */
    const armPeek = useCallback(() => {
        const current = viewRef.current;
        if (!current.peek || peekArmed.current) return;
        if (!peekSpoken.current || settledImages.current.size < current.cards.length) return;
        peekArmed.current = true;
        cancel(peekTimer.current);
        peekTimer.current = after(peekMsFor(current.totalRounds, deal.peekScale), endPeek);
    }, [after, cancel, deal.peekScale, endPeek]);

    useEffect(() => {
        if (isMonitor) return;
        if (!viewRef.current.peek) {
            say(TEXT_FIND);
            return;
        }
        say(TEXT_PEEK, () => {
            peekSpoken.current = true;
            armPeek();
        });
    }, [isMonitor, say, armPeek]);

    // Rezervni kraj zavirivanja (slike ili glas se ne jave); inače ga zamenjuje tačno odmereni tajmer iz `armPeek`
    useEffect(() => {
        const current = viewRef.current;
        if (isMonitor || !current.peek || peekArmed.current) return;
        const id = after(peekMsFor(current.totalRounds, deal.peekScale) + PEEK_GRACE_MS, endPeek);
        peekTimer.current = id;
        return () => cancel(id);
    }, [isMonitor, after, cancel, deal.peekScale, endPeek]);

    const handleImageSettled = (index: number) => {
        if (isMonitor) return;
        settledImages.current.add(index);
        armPeek();
    };

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        // total    = broj parova bez poslednjeg (kad ostanu dve kartice, par se ne može promašiti,
        //            pa nije mera pamćenja i ne broji se ni kao samostalan ni kao uz pomoć)
        // correct  = parovi pronađeni samostalno iz prve prilike: bez pomoći i bez greške pamćenja od
        //            prethodnog para (otvaranje još neviđenih kartica se ne računa kao greška)
        // prompted = parovi pronađeni dok je par otvorene kartice svetleo kao pomoć
        // Ostatak (total − correct − prompted) su parovi pronađeni posle greške, ali bez pomoći.
        onCompleteRef.current({
            score: final.score,
            durationSec: sync.elapsedSec(),
            correct: final.correctCount,
            total: Math.max(final.totalRounds - 1, 1),
            prompted: final.promptedCount,
        });
    };

    const handleFlip = (index: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        let current = viewRef.current;
        const id = current.cards[index];
        const animal = animalOf(id);
        if (!animal || current.peek || current.matched.includes(id)) return;

        // Promašen par još stoji otkriven: dodir ga odmah vraća (dete koje je zapamtilo ne čeka),
        // ali ne pre nego što se druga kartica okrenula do kraja
        if (current.flipped.length >= 2) {
            if (!mismatchSettled.current) return;
            cancel(flipBackTimer.current);
            flipBackTimer.current = null;
            const wasOpen = current.flipped.includes(index);
            current = { ...current, flipped: [] };
            if (wasOpen) {
                commit(current);
                return;
            }
        }
        // Već otvorena kartica: ponovljeni dodir se nikad ne računa kao potez
        if (current.flipped.includes(index)) return;

        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const seen = current.seen.includes(index) ? current.seen : [...current.seen, index];

        if (current.flipped.length === 0) {
            const partner = partnerOf(current.cards, index);
            // Pomoć: posle zadatog broja grešaka pamćenja par otvorene kartice blago svetli (0 = nikad)
            const hint = settings.hintAfter > 0 && current.streak >= hintAfter && partner >= 0 ? partner : null;
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
            // Poslednji par se ne može promašiti, pa se ne boduje kao pamćenje
            const forced = allFound;
            const prompted = !forced && current.hint !== null;
            const firstTry = !forced && !prompted && current.streak === 0;
            const how = forced ? "poslednji" : firstTry ? "iz prve prilike" : prompted ? "uz pomoć" : "posle greške";
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
            // Zvuk kraja nivoa pušta strana koja prikazuje rezultat — ovde samo potvrda para
            playSfx("correct");
            if (allFound) {
                sayThen(praise(`${animal.plural ? "To su" : "To je"} ${animal.name.toLowerCase()}.`, firstTry), finish, { emotion: "happy" });
                return;
            }
            // Ime u rečenici: samu reč („Krokodil.”) glas ume da pročita kao englesku
            say(praise(`${animal.plural ? "To su" : "To je"} ${animal.name.toLowerCase()}.`, firstTry), undefined, "happy");
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
        mismatchSettled.current = false;
        after(MISMATCH_MIN_MS, () => {
            mismatchSettled.current = true;
        });
        flipBackTimer.current = after(FLIP_BACK_MS, () => {
            flipBackTimer.current = null;
            commit({ ...viewRef.current, flipped: [] });
        });
    };

    // Pomoć posle čekanja: jedna kartica je otvorena, a dete dugo ne zna gde je njen par — par blago zasvetli
    useWaitHint(!isMonitor && settings.waitHint && view.flipped.length === 1, `${view.flipped.join(",")}:${view.matched.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.peek || current.flipped.length !== 1 || current.hint !== null) return;
        const partner = partnerOf(current.cards, current.flipped[0]);
        if (partner < 0) return;
        commit({ ...current, hint: partner }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        demo.show();
        say(viewRef.current.peek ? TEXT_PEEK : TEXT_FIND);
    };

    const tail = useBubbleTail();
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
    const correctText = foundName ? `Par: ${foundName}.` : "Par je pronađen.";

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
            <div className={cn("grid min-h-14 place-items-center rounded-2xl border border-line bg-surface px-4 py-2 shadow-soft *:col-start-1 *:row-start-1", tail)}>
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

            <PlayArea accent={GAME.accent} className="relative">
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
                    className={cn("mx-auto grid w-full [--chrome:22rem] [--gap:0.75rem] short:[--chrome:23rem]", layout.vars, isMonitor && "pointer-events-none")}
                    style={BOARD_STYLE}
                >
                    {shown.cards.map((id, index) => {
                        const matched = shown.matched.includes(id);
                        const open = shown.peek || shown.flipped.includes(index) || matched;
                        return (
                            <MemoryCard
                                key={index}
                                position={index + 1}
                                action={`card:${index}`}
                                animal={animalOf(id)}
                                open={open}
                                matched={matched}
                                hinted={shown.hint === index && !open}
                                // Otvoren promašen par ostaje dodirljiv: dodir na njega odmah vraća obe kartice
                                disabled={isMonitor || matched || shown.peek || (open && shown.flipped.length < 2)}
                                className={layout.centerTail && index === shown.cards.length - 2 ? TAIL_START : undefined}
                                onFlip={() => handleFlip(index)}
                                onImageSettled={() => handleImageSettled(index)}
                            />
                        );
                    })}
                </div>
            </PlayArea>
        </GameStage>
    );
}
