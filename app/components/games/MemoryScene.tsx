"use client";

// Spoji parove, nivoi 11–15: „Zapamti gde je šta bilo”.
// Na polici stoje predmeti. Dete gleda koliko želi i samo kaže kad je zapamtilo (dugme, bez
// vremena i odbrojavanja). Tada se predmeti sklone u korpu ispod police, a dete ih vraća na
// mesta: dodirne predmet, pa mesto na polici. Pogrešno mesto se mirno odbije; posle onoliko
// pogrešnih mesta koliko je zadato u podešavanjima deteta pravo mesto blago zasvetli.

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    Feedback,
    finiteOr,
    GameHud,
    GameStage,
    genderText,
    hintDue,
    isFemale,
    PlayArea,
    playSfx,
    shuffle,
    toIndexList,
    useBubbleTail,
    useGameSync,
    useInputGuard,
    usePraise,
    useSayThen,
    useTimers,
    useWaitHint,
    type BaseView,
    type FeedbackKind,
    type GameProps,
} from "@/app/components/games/kit";
import { buildShelves, cardArt, memoryLevel, type MemoryCardArt, type SceneLevel, type ShapeKind, type ShelfScene } from "@/app/components/games/data/memoryLevels";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

// ── Lice kartice (deli se sa parovima) ────────────────────────────────────────

const SHAPE_PATHS: Record<ShapeKind, string> = {
    circle: "M50,14 a36,36 0 1,0 0.1,0 Z",
    square: "M18,18 h64 v64 h-64 Z",
    triangle: "M50,12 L88,84 L12,84 Z",
    star: "M50,8 L61,38 L93,38 L67,57 L77,88 L50,69 L23,88 L33,57 L7,38 L39,38 Z",
    heart: "M50,86 C50,86 12,60 12,36 C12,22 23,14 34,16 C41,17 46,22 50,28 C54,22 59,17 66,16 C77,14 88,22 88,36 C88,60 50,86 50,86 Z",
    moon: "M66,10 A40,40 0 1,0 66,90 A44,44 0 0,1 66,10 Z",
    diamond: "M50,8 L88,50 L50,92 L12,50 Z",
    drop: "M50,8 C50,8 18,48 18,64 A32,32 0 0,0 82,64 C82,48 50,8 50,8 Z",
};

interface CardFaceProps {
    art: MemoryCardArt;
    /** `sizes` za sliku (koliko je kartica široka na ekranu) */
    sizes: string;
    onSettled?: () => void;
}

/** Slika na kartici: fotografija/crtež iz /public ili oblik u boji */
export function CardFace({ art, sizes, onSettled }: CardFaceProps) {
    // Oblik se crta odmah — za zavirivanje je „učitan” čim se pojavi
    useEffect(() => {
        if (art.shape) onSettled?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- jednom po kartici
    }, [art.id]);
    if (art.shape) {
        return (
            <span className="absolute inset-0 grid place-items-center bg-[#fdfbf4]">
                <svg viewBox="0 0 100 100" role="img" aria-label={art.name} className="h-[78%] w-[78%]">
                    <path d={SHAPE_PATHS[art.shape.kind]} fill={art.shape.color} stroke="#1f1b3a" strokeWidth={4} strokeLinejoin="round" />
                </svg>
            </span>
        );
    }
    if (!art.src) return null;
    return (
        <Image
            src={art.src}
            alt={art.name}
            fill
            sizes={sizes}
            loading="eager"
            draggable={false}
            onLoad={onSettled}
            onError={onSettled}
            className="select-none object-cover"
        />
    );
}

// ── Stanje ────────────────────────────────────────────────────────────────────

type Phase = "look" | "place";

/**
 * Jedan zadatak je jedan predmet vraćen na mesto.
 *   correctCount   = predmeti vraćeni na pravo mesto iz prvog pokušaja, bez pomoći
 *   promptedCount  = predmeti vraćeni tek pošto je pravo mesto zasvetlelo
 *   incorrectCount = pogrešna mesta (isto pogrešno mesto za isti predmet broji se jednom)
 */
export interface SceneView extends BaseView {
    /** Redni broj police (od 0) i broj polica na nivou */
    shelf: number;
    shelves: number;
    cols: number;
    rows: number;
    /** Gde je šta bilo: id predmeta po mestu (null = prazno mesto) */
    slots: (string | null)[];
    /** Šta je dete već vratilo na mesto */
    placed: (string | null)[];
    /** Predmeti u korpi, redom kojim stoje */
    tray: string[];
    phase: Phase;
    /** Predmet koji dete drži (izabran u korpi) */
    selected: string | null;
    /** Pogrešni pokušaji na ovoj polici: "predmet:mesto" */
    tries: string[];
    /** Predmet čije pravo mesto svetli kao pomoć */
    hint: string | null;
    /** Mesto koje je upravo bilo pogrešno (kratko označeno) */
    wrongSlot: number | null;
    feedback: FeedbackKind;
    promptedCount: number;
    done: boolean;
}

function viewForShelf(base: SceneView, shelves: ShelfScene[], index: number): SceneView {
    const shelf = shelves[index];
    return {
        ...base,
        shelf: index,
        cols: shelf.cols,
        rows: shelf.rows,
        slots: shelf.slots,
        placed: shelf.slots.map(() => null),
        tray: [],
        phase: "look",
        selected: null,
        tries: [],
        hint: null,
        wrongSlot: null,
        feedback: null,
    };
}

function initialView(shelves: ShelfScene[], cfg: SceneLevel): SceneView {
    const total = shelves.reduce((sum, shelf) => sum + shelf.slots.filter(Boolean).length, 0);
    const empty: SceneView = {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: Math.max(total, 1),
        shelf: 0,
        shelves: Math.max(shelves.length, 1),
        cols: cfg.cols,
        rows: cfg.rows,
        slots: Array.from({ length: cfg.cols * cfg.rows }, () => null),
        placed: Array.from({ length: cfg.cols * cfg.rows }, () => null),
        tray: [],
        phase: "look",
        selected: null,
        tries: [],
        hint: null,
        wrongSlot: null,
        feedback: null,
        promptedCount: 0,
        done: false,
    };
    return shelves.length > 0 ? viewForShelf(empty, shelves, 0) : empty;
}

function idList(value: unknown, size: number): (string | null)[] {
    const list = Array.isArray(value) ? value : [];
    return Array.from({ length: size }, (_, i) => (typeof list[i] === "string" && cardArt(list[i]) ? list[i] : null));
}

/** Monitor dobija delimično stanje — sve što fali ili je pogrešnog tipa menja podrazumevana vrednost. */
function mergeMonitor(base: SceneView, incoming: Partial<SceneView> | null | undefined): SceneView {
    if (!incoming) return base;
    const cols = Math.min(Math.max(Math.round(finiteOr(incoming.cols, base.cols)), 1), 4);
    const rows = Math.min(Math.max(Math.round(finiteOr(incoming.rows, base.rows)), 1), 4);
    const size = cols * rows;
    const ids = (value: unknown) => (Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && cardArt(id) !== undefined) : []);
    return {
        ...base,
        score: finiteOr(incoming.score, base.score),
        correctCount: finiteOr(incoming.correctCount, base.correctCount),
        incorrectCount: finiteOr(incoming.incorrectCount, base.incorrectCount),
        promptedCount: finiteOr(incoming.promptedCount, base.promptedCount),
        round: finiteOr(incoming.round, base.round),
        totalRounds: finiteOr(incoming.totalRounds, base.totalRounds),
        shelf: finiteOr(incoming.shelf, base.shelf),
        shelves: finiteOr(incoming.shelves, base.shelves),
        cols,
        rows,
        slots: idList(incoming.slots, size),
        placed: idList(incoming.placed, size),
        tray: ids(incoming.tray),
        phase: incoming.phase === "place" ? "place" : "look",
        selected: typeof incoming.selected === "string" ? incoming.selected : null,
        tries: [],
        hint: typeof incoming.hint === "string" ? incoming.hint : null,
        wrongSlot: toIndexList([incoming.wrongSlot], size)[0] ?? null,
        feedback: incoming.feedback === "correct" || incoming.feedback === "wrong" ? incoming.feedback : null,
        done: incoming.done === true,
    };
}

// ── Tekstovi ──────────────────────────────────────────────────────────────────
// Glas kaže šta se radi i imenuje predmet, a nikad ne kaže na koje mesto treba dodirnuti.

const TEXT_LOOK = "Pogledaj gde je šta na polici. Kad zapamtiš, javi mi.";
const TEXT_LOOK_NEXT = "Evo nove police. Pogledaj gde je šta.";
const TEXT_PLACE = "Vrati svaku stvar na njeno mesto.";
const TEXT_PICK_FIRST = "Prvo izaberi stvar iz korpe.";
const TEXT_WRONG_FIRST = "Nije bilo tu. Probaj opet.";

const TEXT_WRONG_AGAIN = "Ni tu nije bilo. Seti se gde je šta stajalo.";

const GAME = getGame("memory");
/** Mesto na polici: što veće, a da polica (i korpa) stanu na ekran po visini i po širini */
const SHELF_STYLE = {
    "--cell": "max(4.25rem, min(9.5rem, calc((100dvh - var(--chrome)) / var(--rows) - 1.5rem), calc((100vw - 7rem) / var(--cols))))",
} as CSSProperties;

export default function MemoryScene({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps) {
    const cfg = memoryLevel(level) as SceneLevel;
    const settings = useChildSettings();
    const sync = useGameSync<SceneView>({ childId, gameId: "memory", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();
    const tail = useBubbleTail();
    const female = isFemale(gender);

    // Monitor nema podešavanja deteta: police stižu u stanju igre
    const [shelves] = useState<ShelfScene[]>(() => (isMonitor ? [] : buildShelves(cfg, settings.preset.memoryMaxPairs)));
    const [view, setView] = useState<SceneView>(() => initialView(shelves, cfg));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const lockedRef = useRef(false);

    const shown = isMonitor ? mergeMonitor(initialView([], cfg), monitorState as Partial<SceneView> | null | undefined) : view;
    const interactive = !isMonitor && !shown.done;

    const commit = (next: SceneView, log?: string) => {
        viewRef.current = next;
        setView(next);
        sync.update(next, log);
    };

    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
    }, [isMonitor, sync, guard]);

    useEffect(() => {
        if (!isMonitor) say(TEXT_LOOK);
    }, [isMonitor, say]);

    const remembered = () => {
        const current = viewRef.current;
        if (!interactive || current.phase !== "look" || lockedRef.current) return;
        guard.hold();
        playSfx("flip");
        const tray = shuffle(current.slots.filter((id): id is string => id !== null));
        commit({ ...current, phase: "place", tray, selected: null }, "Dete je zapamtilo policu — predmeti su u korpi");
        say(TEXT_PLACE);
    };

    const select = (id: string) => {
        const current = viewRef.current;
        if (!interactive || current.phase !== "place" || lockedRef.current || guard.blocked()) return;
        if (!current.tray.includes(id)) return;
        const art = cardArt(id);
        playSfx("tap");
        commit({ ...current, selected: id, wrongSlot: null, feedback: null }, `Izabrano: ${art?.name ?? id}`);
        if (art) say(`${art.name}.`);
    };

    const finish = (final: SceneView) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        sync.complete(final);
        onComplete({
            score: final.score,
            durationSec: sync.elapsedSec(),
            correct: final.correctCount,
            total: Math.max(final.totalRounds, 1),
            prompted: final.promptedCount,
        });
    };

    const place = (slot: number) => {
        const current = viewRef.current;
        if (!interactive || current.phase !== "place" || lockedRef.current || guard.blocked()) return;
        if (current.placed[slot] !== null) return;
        const id = current.selected;
        if (!id) {
            say(TEXT_PICK_FIRST);
            return;
        }
        const art = cardArt(id);
        const name = art?.name ?? "Stvar";
        const mine = current.tries.filter((key) => key.startsWith(`${id}:`));

        if (current.slots[slot] === id) {
            const firstTry = mine.length === 0 && current.hint !== id;
            const prompted = current.hint === id;
            const placed = current.placed.map((p, i) => (i === slot ? id : p));
            const tray = current.tray.filter((t) => t !== id);
            const solved: SceneView = {
                ...current,
                placed,
                tray,
                selected: null,
                hint: null,
                wrongSlot: null,
                feedback: "correct",
                round: Math.min(current.round + 1, current.totalRounds),
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (prompted ? 1 : 0),
            };
            const how = firstTry ? "iz prvog pokušaja" : prompted ? "uz pomoć" : "posle greške";
            commit(solved, `Na mestu ${how}: ${name}`);
            playSfx("correct");
            const sentence = praise(`${name} je na svom mestu.`, firstTry);
            if (tray.length > 0) {
                say(sentence, undefined, "happy");
                guard.hold();
                after(1200, () => {
                    if (viewRef.current.feedback === "correct") commit({ ...viewRef.current, feedback: null });
                });
                return;
            }
            // Polica je složena: sledeća polica ili kraj nivoa
            lockedRef.current = true;
            const nextShelf = current.shelf + 1;
            if (nextShelf < shelves.length) {
                sayThen(sentence, () => {
                    const latest = viewForShelf(viewRef.current, shelves, nextShelf);
                    guard.hold();
                    commit(latest, `Polica ${nextShelf + 1} od ${shelves.length}`);
                    lockedRef.current = false;
                    say(TEXT_LOOK_NEXT);
                }, { emotion: "happy" });
                return;
            }
            const final: SceneView = { ...solved, done: true };
            viewRef.current = final;
            setView(final);
            sayThen(sentence, () => finish(final), { emotion: "happy" });
            return;
        }

        // Pogrešno mesto: predmet ostaje u ruci, mesto se kratko označi, greška se broji jednom
        const key = `${id}:${slot}`;
        const repeated = current.tries.includes(key);
        const tries = repeated ? current.tries : [...current.tries, key];
        const count = mine.length + (repeated ? 0 : 1);
        const emptySlots = current.placed.filter((p) => p === null).length;
        const hint = current.hint === id || hintDue(settings.hintAfter, count, Math.max(1, emptySlots - 1)) ? id : current.hint;
        commit(
            { ...current, tries, hint, wrongSlot: slot, feedback: "wrong", incorrectCount: current.incorrectCount + (repeated ? 0 : 1) },
            `Pogrešno mesto: ${name}${hint === id && current.hint !== id ? " (prikazana pomoć)" : ""}`
        );
        playSfx("wrong");
        say(count < 2 ? TEXT_WRONG_FIRST : TEXT_WRONG_AGAIN, undefined, "gentle");
        guard.hold();
        after(1400, () => {
            const latest = viewRef.current;
            if (latest.wrongSlot === slot) commit({ ...latest, wrongSlot: null, feedback: null });
        });
    };

    // Pomoć posle čekanja: dete drži predmet i dugo ne zna gde je bio — pravo mesto blago zasvetli
    useWaitHint(!isMonitor && settings.waitHint && view.phase === "place" && view.selected !== null, `${view.selected}:${view.tray.length}`, () => {
        const current = viewRef.current;
        if (lockedRef.current || current.done || !current.selected || current.hint === current.selected) return;
        commit({ ...current, hint: current.selected }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => say(viewRef.current.phase === "look" ? TEXT_LOOK : TEXT_PLACE);

    const look = shown.phase === "look";
    const hintSlot = shown.hint ? shown.slots.indexOf(shown.hint) : -1;
    const selectedArt = cardArt(shown.selected ?? undefined);
    let instruction = look ? "Zapamti gde je šta." : selectedArt ? `Kuda ide ${selectedArt.name.toLowerCase()}?` : "Izaberi stvar iz korpe.";
    if (shown.done) instruction = "Sve je na svom mestu.";

    return (
        <GameStage width="normal">
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={isMonitor || settings.preset.showPoints ? shown.score : undefined} unit="Stvar" onSpeak={isMonitor ? undefined : repeatInstruction} />

            <div className={cn("grid min-h-14 place-items-center rounded-2xl border border-line bg-surface px-4 py-2 shadow-soft *:col-start-1 *:row-start-1", tail)}>
                <p aria-hidden={shown.feedback ? true : undefined} className={cn("text-center font-display text-lg font-extrabold text-ink transition-opacity duration-200 sm:text-2xl", shown.feedback && "opacity-0")}>
                    {instruction}
                </p>
                <Feedback kind={shown.feedback} correctText="Na svom je mestu." wrongText={TEXT_WRONG_FIRST} />
            </div>

            <PlayArea accent={GAME.accent}>
                {/* Položen ekran: korpa (ili dugme) stoji desno od police, da sve stane bez skrolovanja */}
                <div className="flex w-full flex-col items-center justify-center gap-3 sm:gap-4 landscape:flex-row landscape:items-center">
                {/* Polica: drveni okvir, svaki red ima svoju dasku */}
                <div
                    role="group"
                    aria-label={look ? "Polica sa stvarima" : "Polica"}
                    className={cn(
                        "shrink-0 rounded-2xl border-4 border-amber-800 bg-amber-50 p-2 shadow-soft [--chrome:27rem] sm:p-3 landscape:[--chrome:23rem]",
                        isMonitor && "pointer-events-none"
                    )}
                    style={{ ...SHELF_STYLE, "--rows": shown.rows, "--cols": shown.cols } as CSSProperties}
                >
                    {Array.from({ length: shown.rows }, (_, row) => (
                        <div key={row} className="flex gap-2 border-b-8 border-amber-700 px-1 pt-2 sm:gap-3 sm:px-2">
                            {Array.from({ length: shown.cols }, (_, col) => {
                                const slot = row * shown.cols + col;
                                const id = look ? shown.slots[slot] : shown.placed[slot];
                                const art = cardArt(id ?? undefined);
                                const empty = !look && shown.placed[slot] === null;
                                const hinted = !look && slot === hintSlot && empty;
                                const wrong = shown.wrongSlot === slot;
                                return (
                                    <button
                                        key={col}
                                        type="button"
                                        disabled={!interactive || look || !empty}
                                        onClick={() => place(slot)}
                                        aria-label={art ? `${art.name}, mesto ${slot + 1}` : `Prazno mesto ${slot + 1}`}
                                        className={cn(
                                            "relative mb-1 aspect-square w-[var(--cell)] shrink-0 overflow-hidden rounded-xl transition-[transform,background-color,outline-color] disabled:cursor-default",
                                            art ? "bg-surface shadow-soft ring-2 ring-amber-200" : "border-2 border-dashed",
                                            !art && (selectedArt ? "border-brand-300 bg-white/70 enabled:active:scale-95" : "border-amber-300 bg-white/40"),
                                            hinted && "animate-soft-pulse outline-4 outline-offset-2 outline-sun-400",
                                            wrong && "border-rose-300 bg-rose-50"
                                        )}
                                    >
                                        {art && <CardFace art={art} sizes="150px" />}
                                        {!look && art && (
                                            <span aria-hidden="true" className="absolute right-1 top-1 grid h-6 w-6 animate-pop place-items-center rounded-full bg-emerald-600 text-sm font-black text-white ring-2 ring-white">
                                                ✓
                                            </span>
                                        )}
                                        {wrong && (
                                            <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-3xl font-black text-rose-400">
                                                ✗
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {look ? (
                    !isMonitor && (
                        <button
                            type="button"
                            onClick={remembered}
                            disabled={!interactive}
                            className={cn(
                                "inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] px-8 font-display text-xl font-extrabold text-white transition-[transform,border-width] active:translate-y-[3px] active:border-b-2 sm:text-2xl",
                                GAME.accent.solid,
                                GAME.accent.edge
                            )}
                        >
                            <span aria-hidden="true">👍</span>
                            {genderText("Zapamti{o|la} sam", female)}
                        </button>
                    )
                ) : (
                    // Korpa: predmeti koje treba vratiti. Položen ekran: dva predmeta u redu (u jednom stupcu
                    // pet predmeta ne bi stalo po visini)
                    <div
                        role="group"
                        aria-label="Korpa"
                        className="flex min-h-20 w-full max-w-xl flex-wrap items-center justify-center gap-1.5 rounded-2xl border-2 border-amber-300 bg-amber-100/70 p-1.5 sm:gap-3 sm:p-3 landscape:w-60 landscape:max-w-60"
                    >
                        {shown.tray.length === 0 && <span className="text-base font-bold text-ink-soft">Korpa je prazna.</span>}
                        {shown.tray.map((id) => {
                            const art = cardArt(id);
                            if (!art) return null;
                            const selected = shown.selected === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    disabled={!interactive}
                                    onClick={() => select(id)}
                                    aria-pressed={selected}
                                    aria-label={art.name}
                                    className={cn(
                                        "relative aspect-square w-14 shrink-0 overflow-hidden rounded-xl bg-surface shadow-soft transition-transform sm:w-24",
                                        selected ? "-translate-y-1 ring-4 ring-brand-500 ring-offset-2 ring-offset-amber-100" : "ring-2 ring-amber-200 enabled:active:scale-95"
                                    )}
                                >
                                    <CardFace art={art} sizes="96px" />
                                </button>
                            );
                        })}
                    </div>
                )}
                </div>
            </PlayArea>
        </GameStage>
    );
}

