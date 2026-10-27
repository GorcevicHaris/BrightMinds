"use client";

// Zajednički izgled i tok sedam igara o svetu oko nas (data/…Levels.ts sastavlja nivo, a
// world/worldPlay.ts drži pravila i bodovanje). Raspored je uvek isti: traka napretka, pitanje,
// polje za igru i kratka poruka ispod — dete zna gde šta stoji (predvidljivo, TEACCH). Igra
// daje svoje crteže (`art`), a za svoje posebne zadatke i svoj crtež deteta (telo) ili ulice
// (saobraćaj). Nema žurbe ni tajmera: i čekanje zelenog svetla je mirno — svetlo se samo menja,
// a dete bira kada će krenuti.

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RotateCcw } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    DemoHand,
    Feedback,
    FEEDBACK_MIN_MS,
    GameHud,
    GamePrompt,
    GameStage,
    hintDue,
    PlayArea,
    playSfx,
    useGameSync,
    useInputGuard,
    usePraise,
    useSayThen,
    useTimers,
    useWaitHint,
    type ChoiceState,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import { DragDemo } from "@/app/components/games/kit/DragDemo";
import { useDragSnap, type DragSnap } from "@/app/components/games/kit/useDragSnap";
import { cn } from "@/lib/cn";
import { getGame, type GameId } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import {
    boardDone,
    emptyWorldView,
    fitsBin,
    mergeWorldMonitor,
    modeledCount,
    nextPiece,
    solveWorldView,
    worldRoundView,
    type WorldCard,
    type WorldRound,
    type WorldView,
} from "./worldPlay";

// ── Crteži koje daje igra ──────────────────────────────────────────────────────

export interface PointFigureProps {
    view: WorldView;
    /** Deo koji treba da zasvetli (pomoć) */
    glow: string | null;
    /** Ruka pokazuje ovaj deo (pokazni zadatak) */
    demo: string | null;
    calm: boolean;
    disabled: boolean;
    onPart: (part: string) => void;
}

export interface CrossingProps {
    view: WorldView;
    calm: boolean;
    /** Lik upravo prelazi ulicu (zadatak je rešen) */
    crossing: boolean;
    className?: string;
}

export interface WorldArt {
    /** Slika kartice (kvadrat) */
    pic: (pic: string, className?: string) => ReactNode;
    /** Široka slika pitanja (3 : 2) */
    scene?: (pic: string, className?: string) => ReactNode;
    Figure?: ComponentType<PointFigureProps>;
    Crossing?: ComponentType<CrossingProps>;
}

interface WorldGameProps extends GameProps<WorldView> {
    gameId: GameId;
    plan: WorldRound[];
    art: WorldArt;
    /** Laki nivoi: pomoć već posle prve greške i posle čekanja */
    earlyHint: boolean;
    /** Kraj nivoa: igra javlja rezultat okviru (onComplete) */
    onFinish: (final: WorldView, modeled: number, seconds: number) => void;
    /** Naziv jedinice napretka u traci („Zadatak”, „Reč”…) */
    unit?: string;
}

const WRONG_FEEDBACK_MS = 1700;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
/** Lik prelazi ulicu pre sledećeg zadatka */
const CROSS_MS = 2600;
/** Semafor: koliko traje crveno (po krugu) i zeleno */
const STOP_MS = 5200;
const GO_MS = 6500;
/** Poruka lebdi preko donje ivice polja za igru na niskom ekranu */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";
const SHORT_HIDDEN = "[@media(max-height:37.5rem)]:hidden";
const NEXT_SLOT = "next";

/** Šta se izgovara na početku zadatka (zagonetka: prvo tragovi, pa pitanje) */
function introText(view: Pick<WorldView, "clues" | "prompt" | "say">): string {
    return [...view.clues, view.prompt, view.say].filter(Boolean).join(" ");
}

export default function WorldGame({ childId, level, gender, isMonitor = false, monitorState, gameId, plan, art, earlyHint, onFinish, unit = "Zadatak" }: WorldGameProps) {
    const game = getGame(gameId);
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<WorldView>({ childId, gameId, level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    const early = earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    const [view, setView] = useState<WorldView>(() => ({ ...emptyWorldView(plan.length), ...(plan[0] ? worldRoundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const phaseTimer = useRef<TimerId | null>(null);
    const onFinishRef = useRef(onFinish);
    useEffect(() => {
        onFinishRef.current = onFinish;
    }, [onFinish]);
    const [wiggle, setWiggle] = useState<string | null>(null);
    const [crossing, setCrossing] = useState(false);

    const commit = useCallback(
        (next: WorldView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
            // Samo u razvoju: stanje table za proveru igre u pregledaču (automatsko igranje nivoa)
            if (process.env.NODE_ENV === "development") (window as unknown as { __worldView?: WorldView }).__worldView = next;
        },
        [sync]
    );

    // ── Semafor (zadatak „čekaj”) ──
    const runPhases = useCallback(
        (roundNo: number) => {
            const schedule = (phase: "stop" | "go", ms: number) => {
                phaseTimer.current = after(ms, () => {
                    const current = viewRef.current;
                    if (current.round !== roundNo || current.kind !== "wait" || current.feedback === "correct" || finishedRef.current) return;
                    const next: WorldView = { ...current, phase, cycle: phase === "go" ? current.cycle + 1 : current.cycle };
                    commit(next, phase === "go" ? (current.scene === "light" ? "Zeleno svetlo" : "Put je prazan") : current.scene === "light" ? "Crveno svetlo" : "Ide auto");
                    // Uz pomoć glas kaže kad je bezbedno; inače dete samo gleda svetlo
                    if (phase === "go" && current.hint) say(current.scene === "light" ? "Sada je zeleno." : "Sada je put prazan.", undefined, "happy");
                    schedule(phase === "go" ? "stop" : "go", phase === "go" ? GO_MS : STOP_MS);
                });
            };
            const first = viewRef.current.cycles;
            schedule("go", STOP_MS * Math.max(1, first) - (first > 1 ? 1200 : 0));
        },
        [after, commit, say]
    );

    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        if (process.env.NODE_ENV === "development") (window as unknown as { __worldView?: WorldView }).__worldView = viewRef.current;
        const intro = introText(viewRef.current);
        if (intro) say(intro);
        if (viewRef.current.kind === "wait") runPhases(viewRef.current.round);
    }, [isMonitor, sync, guard, say, runPhases]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onFinishRef.current(final, modeledCount(plan), sync.elapsedSec());
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        cancel(phaseTimer.current);
        phaseTimer.current = null;
        setCrossing(false);
        const next: WorldView = { ...viewRef.current, ...worldRoundView(round), round: index + 1 };
        const intro = introText(next);
        commit(next, `Zadatak ${index + 1}: ${intro}`);
        say(intro);
        if (next.kind === "wait") runPhases(index + 1);
    };

    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, feedback: null, selected: null });
        });
    };

    const clearFeedbackTimer = () => {
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
    };

    /** Zadatak rešen: poeni, pohvala sa razlogom, pa sledeći zadatak */
    const solve = (current: WorldView, solved: Partial<WorldView>, log: string, wait = FEEDBACK_MIN_MS + 500) => {
        const round = plan[current.round - 1];
        const sentence = round?.why ?? "";
        const { next, firstTry } = solveWorldView(current, { ...solved, message: sentence, feedback: "correct" });
        const how = current.modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Tačno ${how}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(sentence, firstTry), isLast ? finish : () => startRound(current.round), { min: wait, emotion: "happy" });
    };

    /** Pogrešan potez: mirna rečenica šta je izabrano, pa pokušaj ponovo (pomoć posle `hintAfter` grešaka) */
    const miss = (current: WorldView, attempt: string, message: string, offered: number, patch: Partial<WorldView> = {}, log = attempt) => {
        const wrong = [...current.wrong, attempt];
        const hint = patch.hint === true || current.hint || hintDue(hintAfter, wrong.length, Math.max(1, offered));
        const next: WorldView = { ...current, ...patch, wrong, hint, message, feedback: "wrong", incorrectCount: current.incorrectCount + 1 };
        commit(next, `Netačno: ${log}`);
        playSfx("wrong");
        say(`${message} ${hint ? RETRY_SLOW : RETRY}`.trim(), undefined, "gentle");
        settleAfterWrong();
    };

    const ready = (kind: WorldView["kind"]) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return null;
        const current = viewRef.current;
        if (current.kind !== kind || current.feedback === "correct") return null;
        clearFeedbackTimer();
        return current;
    };

    // ── Izbor slike ──
    const pickChoice = (id: string) => {
        const current = ready("pick");
        if (!current || current.wrong.includes(id) || !current.choices.some((choice) => choice.id === id)) return;
        const round = plan[current.round - 1];
        if (id === current.answer) {
            solve(current, { selected: id }, `${current.prompt} → ${id}`);
            return;
        }
        const note = round?.kind === "pick" ? (round.notes[id] ?? "") : "";
        miss(current, id, note, current.choices.length - 1, { selected: id });
    };

    // ── Korpe i redosled ──
    const place = (item: string, bin: string | null): boolean => {
        const current = viewRef.current;
        if ((current.kind !== "sort" && current.kind !== "order") || !ready(current.kind)) return false;
        const card = current.items.find((entry) => entry.id === item);
        if (!card || current.placed.includes(item)) return false;
        const round = plan[current.round - 1];
        if (fitsBin(current, item, bin)) {
            const placed = [...current.placed, item];
            const patch: Partial<WorldView> = { placed, last: item, selected: null };
            if (boardDone({ ...current, placed })) {
                solve(current, patch, `${current.prompt} (${placed.join(", ")})`);
                return true;
            }
            const sentence = round?.kind === "sort" ? (round.says[item] ?? card.label) : card.label;
            commit({ ...current, ...patch, feedback: null, message: sentence }, `Na mestu: ${card.label}`);
            playSfx("correct");
            say(sentence, undefined, "happy");
            return true;
        }
        if (current.kind === "order") {
            const expected = current.sequence[current.placed.length];
            const note = round?.kind === "order" ? (round.notes[expected] ?? "") : "";
            miss(current, `${item}>${expected}`, note, current.items.length - current.placed.length - 1, { selected: null }, `${card.label} nije sledeće`);
            return false;
        }
        const note = round?.kind === "sort" ? (round.notes[item] ?? "") : "";
        const others = current.bins.length - 1;
        miss(current, `${item}>${bin}`, note, others, { selected: null }, `${card.label} → ${bin}`);
        return false;
    };

    const tapItem = (item: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.feedback === "correct" || current.placed.includes(item)) return;
        if (current.kind === "order") {
            if (!place(item, NEXT_SLOT) && !calm) {
                setWiggle(item);
                after(520, () => setWiggle(null));
            }
            return;
        }
        playSfx("tap");
        commit({ ...current, selected: current.selected === item ? null : item });
    };

    const tapBin = (bin: string) => {
        const selected = viewRef.current.selected;
        if (selected === null) return;
        if (!place(selected, bin) && !calm) {
            setWiggle(selected);
            after(520, () => setWiggle(null));
        }
    };

    // ── Tapšanje slogova ──
    const drum = () => {
        const current = ready("clap");
        if (!current) return;
        const count = current.syllables.length;
        if (current.mode === "along") {
            if (current.taps >= count) return;
            const taps = current.taps + 1;
            const syllable = current.syllables[taps - 1] ?? "";
            if (taps >= count) {
                solve({ ...current, taps }, { taps }, `${current.word?.label ?? ""}: ${current.syllables.join("-")}`);
                return;
            }
            commit({ ...current, taps, feedback: null, message: "" }, `Slog ${taps}: ${syllable}`);
            playSfx("tap");
            say(syllable.toLowerCase());
            return;
        }
        if (current.taps >= 8) return;
        commit({ ...current, taps: current.taps + 1, feedback: null, message: "" });
        playSfx("tap");
    };

    const clapAgain = () => {
        const current = ready("clap");
        if (!current || current.taps === 0) return;
        playSfx("flip");
        commit({ ...current, taps: 0, feedback: null, message: "" }, "Ispočetka");
    };

    const clapDone = () => {
        const current = ready("clap");
        if (!current || current.mode !== "count" || current.taps === 0) return;
        const count = current.syllables.length;
        if (current.taps === count) {
            solve(current, {}, `${current.word?.label ?? ""}: ${current.taps} udarca`);
            return;
        }
        // Netačan broj: slogovi se pokažu, pa dete tapše uz njih (to je pomoć)
        const round = plan[current.round - 1];
        const note = round?.kind === "clap" ? round.why : "";
        miss(current, `taps:${current.taps}`, `${current.taps > count ? "Ima manje." : "Ima više."} ${note}`, 1, { mode: "along", taps: 0, hint: true }, `${current.taps} udaraca, a treba ${count}`);
    };

    // ── Deo tela ──
    const pickPart = (part: string) => {
        const current = ready("point");
        if (!current || !current.parts.includes(part) || current.wrong.includes(part)) return;
        if (part === current.answer) {
            solve(current, { selected: part }, `${current.prompt} → ${part}`);
            return;
        }
        const round = plan[current.round - 1];
        const note = round?.kind === "point" ? (round.notes[part] ?? "") : "";
        miss(current, part, note, current.parts.length - 1, { selected: part });
    };

    // ── Čekanje i prelazak ulice ──
    const go = () => {
        const current = ready("wait");
        if (!current) return;
        if (current.phase === "go") {
            cancel(phaseTimer.current);
            phaseTimer.current = null;
            if (!calm) setCrossing(true);
            solve(current, {}, current.scene === "light" ? "krenuo na zeleno" : "krenuo kad je put prazan", calm ? FEEDBACK_MIN_MS + 500 : CROSS_MS);
            return;
        }
        const message = current.scene === "light" ? "Crveno je. Čekamo zeleno svetlo." : "Ide auto. Čekamo da put bude prazan.";
        miss(current, `go:${current.cycle}`, message, 1);
    };

    // Pomoć posle čekanja: tačan odgovor (ili sledeća slika) blago zasvetli — ne kod semafora,
    // gde je čekanje baš ono što dete uči
    useWaitHint(!isMonitor && (settings.waitHint || early) && view.kind !== "wait", `${view.round}:${view.placed.length}:${view.taps}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hint || current.kind === "wait") return;
        if (current.modeled && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        const intro = introText(current);
        if (intro) say(intro);
    };

    const [ghostPx, setGhostPx] = useState(88);
    const drag = useDragSnap({
        enabled: !isMonitor && (view.kind === "sort" || view.kind === "order") && view.feedback !== "correct",
        calm,
        onDrop: (piece, slot) => (slot === null ? false : place(piece, slot)),
        onTap: tapItem,
        onGrab: (piece) => {
            const card = document.querySelector<HTMLElement>(`[data-piece="${piece}"]`);
            if (card) setGhostPx(card.getBoundingClientRect().width);
        },
    });

    const shown = isMonitor ? mergeWorldMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (!shown.prompt) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit={unit} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const demo = !isMonitor && shown.modeled && shown.wrong.length === 0 && !solved;
    const disabled = isMonitor || solved;
    const boardProps = { view: shown, art, calm, demo, disabled };

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit={unit} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            <GamePrompt
                key={`prompt-${shown.round}`}
                className={cn("animate-fade-up", SHORT_HIDDEN)}
                compact
                title={shown.prompt}
                subtitle={shown.clues.length > 0 ? <Clues clues={shown.clues} /> : undefined}
            />
            <PlayArea accent={game.accent} className="relative gap-1.5 p-2 sm:p-4">
                {/* Nizak ekran: pitanje je ovde, jednim redom, da polje za igru bude veliko */}
                <p className="hidden w-full text-center font-display text-base font-extrabold leading-tight text-ink [@media(max-height:37.5rem)]:block">
                    {shown.clues.length > 0 ? `${shown.clues.join(" ")} ${shown.prompt}` : shown.prompt}
                </p>
                {shown.kind === "pick" && <PickBoard key={`pick-${shown.round}`} {...boardProps} onPick={pickChoice} />}
                {(shown.kind === "sort" || shown.kind === "order") && (
                    <SortBoard key={`sort-${shown.round}`} {...boardProps} drag={drag} ghostPx={ghostPx} wiggle={wiggle} onBin={tapBin} />
                )}
                {shown.kind === "clap" && <ClapBoard key={`clap-${shown.round}`} {...boardProps} accent={game.accent} onDrum={drum} onDone={clapDone} onAgain={clapAgain} />}
                {shown.kind === "point" && art.Figure && <PointBoard key={`point-${shown.round}`} {...boardProps} Figure={art.Figure} onPart={pickPart} />}
                {shown.kind === "wait" && art.Crossing && (
                    <WaitBoard key={`wait-${shown.round}`} {...boardProps} accent={game.accent} Crossing={art.Crossing} crossing={crossing} onGo={go} />
                )}
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={shown.message} wrongText={shown.message || "Probaj ponovo."} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

function Clues({ clues }: { clues: string[] }) {
    return (
        <span className="mt-1 flex flex-wrap justify-center gap-1.5 sm:justify-start flat:justify-center">
            {clues.map((clue, i) => (
                <span key={i} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100 sm:text-base">
                    {clue}
                </span>
            ))}
        </span>
    );
}

// ── Zajednički delovi ─────────────────────────────────────────────────────────

interface BoardProps {
    view: WorldView;
    art: WorldArt;
    calm: boolean;
    demo: boolean;
    disabled: boolean;
}

/** Tačkice broja (kao na kocki), da i dete koje ne zna cifru vidi koliko je */
function Dots({ count, className }: { count: number; className?: string }) {
    return (
        <span aria-hidden="true" className={cn("flex flex-wrap items-center justify-center gap-[0.18em]", className)}>
            {Array.from({ length: count }, (_, i) => (
                <span key={i} className="h-[0.42em] w-[0.42em] rounded-full bg-current" />
            ))}
        </span>
    );
}

/** Sadržaj kartice: slika i natpis, krupna reč ili krupan broj */
function CardFace({ card, art, style = "pic", size = "normal" }: { card: WorldCard; art: WorldArt; style?: WorldView["style"]; size?: "normal" | "small" }) {
    if (style === "number") {
        const n = Number(card.label);
        return (
            <span className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-[6cqi] text-brand-700">
                <span className="font-display text-[min(46cqi,4.5rem)] font-extrabold leading-none">{card.label}</span>
                {Number.isInteger(n) && n > 0 && n <= 10 && <Dots count={n} className="max-w-[80%] text-[min(22cqi,2.2rem)] text-sun-500" />}
            </span>
        );
    }
    if (style === "word") {
        return (
            <span className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-[3cqi]">
                {art.pic(card.pic, "min-h-0 w-[64%] flex-1")}
                <span className="font-display text-[clamp(0.8rem,16cqi,1.6rem)] font-extrabold leading-none text-ink">{card.label}</span>
            </span>
        );
    }
    return (
        <span className="pointer-events-none flex h-full w-full flex-col items-center justify-center">
            {art.pic(card.pic, cn("min-h-0 w-[86%] flex-1", size === "small" && "w-[90%]"))}
            {card.label && !card.quiet && (
                // Duga reč („poljoprivrednik”) dobija sitnija slova, da stane cela
                <span
                    className="line-clamp-2 max-w-full px-0.5 pt-[0.15em] text-center font-extrabold leading-[1.12] text-ink-soft @max-[4.5rem]:hidden"
                    style={{ fontSize: `clamp(0.55rem, ${Math.min(12, 120 / Math.max(...card.label.split(" ").map((word) => word.length), 1))}cqi, 1.05rem)` }}
                >
                    {card.label}
                </span>
            )}
        </span>
    );
}

// ── Izbor slike ───────────────────────────────────────────────────────────────

function choiceState(view: WorldView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.selected === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.answer) return "hint";
    return "idle";
}

/** Veličina elementa (ResizeObserver): raspored kartica se računa iz stvarnog prostora */
function useBox<T extends HTMLElement>(): [(el: T | null) => void, { w: number; h: number }] {
    const [box, setBox] = useState({ w: 0, h: 0 });
    const observer = useRef<ResizeObserver | null>(null);
    const ref = useCallback((el: T | null) => {
        observer.current?.disconnect();
        observer.current = null;
        if (!el) return;
        const measure = () => {
            const rect = el.getBoundingClientRect();
            setBox((old) => (Math.abs(old.w - rect.width) < 1 && Math.abs(old.h - rect.height) < 1 ? old : { w: rect.width, h: rect.height }));
        };
        measure();
        if (typeof ResizeObserver !== "undefined") {
            observer.current = new ResizeObserver(measure);
            observer.current.observe(el);
        }
    }, []);
    useEffect(() => () => observer.current?.disconnect(), []);
    return [ref, box];
}

const GAP = 10;
const MAX_CARD = 280;

/** Najveća kartica za n izbora u prostoru w × h (bira broj kolona) */
function bestGrid(n: number, w: number, h: number): { cols: number; side: number } {
    let best = { cols: n, side: 0 };
    for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const side = Math.min((w - GAP * (cols - 1)) / cols, (h - GAP * (rows - 1)) / rows, MAX_CARD);
        if (side > best.side + 0.5) best = { cols, side };
    }
    return { cols: best.cols, side: Math.max(0, Math.floor(best.side)) };
}

interface PickLayout {
    row: boolean;
    cueW: number;
    cueH: number;
    cols: number;
    side: number;
}

/**
 * Raspored pitanja i izbora: slika pitanja iznad ili levo od izbora, a kolone tako da kartice
 * budu što veće (ali i slika pitanja dovoljno velika) — na svakom ekranu bez skrolovanja.
 */
function pickLayout(w: number, h: number, n: number, cue: "none" | "square" | "wide"): PickLayout {
    if (cue === "none") return { row: false, cueW: 0, cueH: 0, ...bestGrid(n, w, h) };
    const ratio = cue === "wide" ? 1.5 : 1;
    const maxCue = cue === "wide" ? 440 : 250;
    let best: (PickLayout & { score: number }) | null = null;
    const consider = (row: boolean, cueW: number, cueH: number) => {
        const grid = row ? bestGrid(n, w - cueW - GAP * 1.6, h) : bestGrid(n, w, h - cueH - GAP * 1.2);
        const cueSide = Math.min(cueW, cueH);
        const score = grid.side + 0.6 * Math.min(cueSide, grid.side * 1.4);
        if (grid.side > 40 && (!best || score > best.score)) best = { row, cueW, cueH, ...grid, score };
    };
    for (const f of [0.3, 0.36, 0.42, 0.48]) {
        let ch = h * f;
        let cw = Math.min(ch * ratio, w, maxCue);
        ch = cw / ratio;
        consider(false, cw, ch);
        cw = Math.min(w * (f + 0.06), h * ratio, maxCue);
        ch = cw / ratio;
        consider(true, cw, ch);
    }
    const chosen = best as (PickLayout & { score: number }) | null;
    return chosen ?? { row: false, cueW: Math.min(w, 120), cueH: Math.min(w, 120) / ratio, ...bestGrid(n, w, h / 2) };
}

function PickBoard({ view, art, calm, demo, disabled, onPick }: BoardProps & { onPick: (id: string) => void }) {
    const [ref, box] = useBox<HTMLDivElement>();
    const cue = view.cue;
    const wide = view.cueWide && art.scene !== undefined;
    const layout = pickLayout(box.w, box.h, view.choices.length, cue ? (wide ? "wide" : "square") : "none");
    return (
        <div ref={ref} className={cn("flex min-h-0 w-full flex-1 items-center justify-center self-stretch", layout.row ? "flex-row gap-4" : "flex-col gap-3")}>
            {box.w > 0 && cue && (
                <div
                    className={cn("relative grid shrink-0 animate-pop place-items-center overflow-hidden rounded-card border-2 border-line bg-surface shadow-soft @container", !wide && "p-1.5")}
                    style={{ width: layout.cueW, height: layout.cueH }}
                >
                    {wide ? art.scene?.(cue.pic, "h-full w-full") : <CardFace card={cue} art={art} />}
                    {wide && cue.label && (
                        <span className="absolute inset-x-0 bottom-1.5 mx-auto w-fit max-w-[90%] rounded-full bg-surface/95 px-3 py-0.5 text-center text-[clamp(0.7rem,5cqi,1.1rem)] font-extrabold text-ink shadow-soft ring-1 ring-line">
                            {cue.label}
                        </span>
                    )}
                </div>
            )}
            {box.w > 0 && (
                <div
                    role="group"
                    aria-label="Izbori"
                    className={cn("grid place-content-center", disabled && "pointer-events-none")}
                    style={{ gap: GAP, gridTemplateColumns: `repeat(${layout.cols}, ${layout.side}px)`, gridAutoRows: `${layout.side}px` }}
                >
                    {view.choices.map((choice) => {
                        const state = choiceState(view, choice.id);
                        return (
                            <ChoiceCard
                                key={choice.id}
                                data-action={`choice:${choice.id}`}
                                state={state}
                                disabled={disabled || (state !== "idle" && state !== "hint")}
                                onClick={() => onPick(choice.id)}
                                aria-label={`${choice.label}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className={cn("h-full min-h-0 p-1.5 @container sm:p-2", !calm && "animate-pop")}
                            >
                                <CardFace card={choice} art={art} style={view.style} />
                                {demo && choice.id === view.answer && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Korpe i redosled ──────────────────────────────────────────────────────────

interface SortProps extends BoardProps {
    drag: DragSnap;
    ghostPx: number;
    wiggle: string | null;
    onBin: (bin: string) => void;
}

interface SortLayout {
    /** Korpa sa slikama stoji desno (položen ekran), inače ispod */
    row: boolean;
    trayCols: number;
    card: number;
    binCols: number;
    binW: number;
    binH: number;
    /** Redosled: veličina mesta */
    slot: number;
}

const TRAY_PAD = 14;
const MAX_TRAY_CARD = 124;

/**
 * Raspored korpi (ili mesta za redosled) i slika: slike što veće, a korpe dovoljno velike da se
 * u njima vidi šta je već stavljeno. Bira između „slike ispod” i „slike desno”.
 */
function sortLayout(w: number, h: number, bins: number, items: number, order: boolean): SortLayout {
    let best: (SortLayout & { score: number }) | null = null;
    const slots = items;
    for (const row of [false, true]) {
        for (let cols = 1; cols <= items; cols++) {
            const rows = Math.ceil(items / cols);
            let card: number;
            let restW = w;
            let restH = h;
            // Korpa sa slikama zauzima najviše oko polovine prostora; kartica je što veća u tom delu
            if (row) {
                card = Math.min((h - TRAY_PAD - GAP * (rows - 1)) / rows, (w * 0.48 - TRAY_PAD - GAP * (cols - 1)) / cols, MAX_TRAY_CARD);
                restW = w - (cols * card + GAP * (cols - 1) + TRAY_PAD) - GAP;
            } else {
                card = Math.min((w - TRAY_PAD - GAP * (cols - 1)) / cols, (h * 0.5 - TRAY_PAD - GAP * (rows - 1)) / rows, MAX_TRAY_CARD);
                restH = h - (rows * card + GAP * (rows - 1) + TRAY_PAD) - GAP;
            }
            if (card < 44) continue;
            // Prazna mesta u poslednjem redu izgledaju neuredno (3 + 1): mala kazna
            const penalty = (cols * rows - items) * 5;
            if (order) {
                // Mesta za redosled u jednom redu, a na uskom ekranu u dva (1 2 / 3 4)
                for (const slotRows of slots > 2 ? [1, 2] : [1]) {
                    const slotCols = Math.ceil(slots / slotRows);
                    const slot = Math.min((restW - (slotCols - 1) * 22) / slotCols, (restH - (slotRows - 1) * GAP) / slotRows, 150);
                    const score = card - penalty + slot * 0.6 - (slotRows - 1) * 6;
                    if (slot > 40 && (!best || score > best.score)) best = { row, trayCols: cols, card, binCols: slotCols, binW: slot, binH: slot, slot, score };
                }
                continue;
            }
            const binCols = bins === 4 && restW < restH * 1.6 ? 2 : bins;
            const binRows = Math.ceil(bins / binCols);
            const binW = (restW - GAP * (binCols - 1)) / binCols;
            const binH = (restH - GAP * (binRows - 1)) / binRows;
            const score = card - penalty + 0.35 * Math.min(binW, binH * 1.2);
            if (binW > 60 && binH > 70 && (!best || score > best.score)) best = { row, trayCols: cols, card, binCols, binW, binH, slot: 0, score };
        }
    }
    const fallback = Math.max(44, Math.min(w / Math.max(items, 1) - GAP, 90));
    return best ?? { row: false, trayCols: items, card: fallback, binCols: bins, binW: w / Math.max(bins, 1), binH: h / 2, slot: Math.min(w / Math.max(items, 1) - 22, 120) };
}

function SortBoard({ view, art, calm, demo, disabled, drag, ghostPx, wiggle, onBin }: SortProps) {
    const { rootRef, ghostRef, active, wobble } = drag;
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const [boxRef, box] = useBox<HTMLDivElement>();
    const solved = view.feedback === "correct";
    const order = view.kind === "order";
    const next = nextPiece(view);
    const hinted = view.hint && !solved ? next : null;
    const demoItem = demo ? next : null;
    const demoTarget = demoItem ? (order ? NEXT_SLOT : view.homes[demoItem]) : null;
    const layout = sortLayout(box.w, box.h, view.bins.length, view.items.length, order);

    const setRootRef = (el: HTMLDivElement | null) => {
        rootRef(el);
        boxRef(el);
        setRoot((previous) => (previous === el ? previous : el));
    };

    const activeCard = active !== null ? view.items.find((item) => item.id === active) : undefined;

    return (
        <div ref={setRootRef} className={cn("relative flex min-h-0 w-full flex-1 self-stretch", disabled && "pointer-events-none")}>
            {box.w > 0 && (
                <div className={cn("flex h-full w-full items-center justify-center", layout.row ? "flex-row" : "flex-col")} style={{ gap: GAP }}>
                    {order ? <OrderSlots view={view} art={art} drag={drag} hinted={hinted !== null} size={layout.slot} cols={layout.binCols} /> : <Bins view={view} art={art} drag={drag} hinted={hinted} onBin={onBin} layout={layout} />}
                    <Tray view={view} art={art} drag={drag} calm={calm} wiggle={wiggle} hinted={hinted} disabled={disabled} cols={layout.trayCols} card={layout.card} />
                </div>
            )}

            {demoItem && demoTarget && <DragDemo root={root} from={`[data-piece="${demoItem}"]`} to={`[data-slot="${demoTarget}"]`} calm={calm} />}

            {activeCard &&
                typeof document !== "undefined" &&
                createPortal(
                    <div ref={ghostRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[6500] drop-shadow-xl" style={{ width: ghostPx * 1.08, height: ghostPx * 1.08 }}>
                        <div className={cn("h-full w-full rounded-2xl border-2 border-brand-400 bg-surface p-1 @container", wobble && "animate-wiggle")}>
                            <CardFace card={activeCard} art={art} />
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

function Bins({ view, art, drag, hinted, onBin, layout }: { view: WorldView; art: WorldArt; drag: DragSnap; hinted: string | null; onBin: (bin: string) => void; layout: SortLayout }) {
    const solved = view.feedback === "correct";
    const { binW, binH } = layout;
    // Slika korpe: kvadrat u gornjem delu; ispod nje natpis, pa mesto za stavljene slike
    const pic = Math.max(28, Math.min(binW * 0.62, binH * 0.42, 150));
    const thumb = Math.max(26, Math.min(binW / 3 - 6, (binH - pic - 34) / 1.6, layout.card * 0.72, 70));
    // Natpis korpe: što krupniji, a da i duža reč („zatvoreno”, „nije bezbedno”) stane u dva reda
    const longest = Math.max(...view.bins.map((bin) => Math.max(...bin.label.split(" ").map((word) => word.length))), 4);
    const labelPx = Math.round(Math.max(11, Math.min(21, (binW - 14) / (longest * 0.8))));
    return (
        <div role="group" aria-label="Korpe" className="grid shrink-0" style={{ gap: GAP, gridTemplateColumns: `repeat(${layout.binCols}, ${Math.floor(binW)}px)`, gridAutoRows: `${Math.floor(binH)}px` }}>
            {view.bins.map((bin) => {
                const inside = view.items.filter((item) => view.placed.includes(item.id) && view.homes[item.id] === bin.id);
                const glowing = drag.over === bin.id || (hinted !== null && view.homes[hinted] === bin.id);
                const armed = view.selected !== null;
                return (
                    <button
                        key={bin.id}
                        type="button"
                        data-slot={bin.id}
                        data-open=""
                        disabled={solved || !armed}
                        onClick={() => onBin(bin.id)}
                        aria-label={`${bin.label}${inside.length ? `: ${inside.map((item) => item.label).join(", ")}` : ""}`}
                        className={cn(
                            "relative flex min-h-0 min-w-0 flex-col items-center gap-1 overflow-hidden rounded-card border-2 border-dashed bg-surface/85 p-1.5 transition-[background-color,border-color,box-shadow] duration-200 disabled:cursor-default sm:p-2",
                            glowing ? "border-brand-400 bg-brand-50 ring-4 ring-brand-200" : armed ? "border-brand-300" : "border-line",
                            hinted !== null && view.homes[hinted] === bin.id && "animate-soft-pulse"
                        )}
                    >
                        <span className="pointer-events-none grid shrink-0 place-items-center rounded-2xl bg-surface shadow-soft ring-1 ring-line" style={{ width: pic, height: pic }}>
                            {art.pic(bin.pic, "h-[90%] w-[90%]")}
                        </span>
                        <span className="pointer-events-none line-clamp-2 max-w-full shrink-0 px-0.5 text-center font-display font-extrabold leading-[1.05] text-ink" style={{ fontSize: labelPx }}>
                            {bin.label}
                        </span>
                        <span className="pointer-events-none flex min-h-0 w-full flex-1 flex-wrap content-center items-center justify-center gap-1 overflow-hidden">
                            {inside.map((item) => (
                                <span
                                    key={item.id}
                                    className={cn("grid place-items-center rounded-xl bg-surface p-0.5 ring-1 ring-line", view.last === item.id && "animate-pop ring-2 ring-emerald-400")}
                                    style={{ width: thumb, height: thumb }}
                                >
                                    {art.pic(item.pic, "h-full w-full")}
                                </span>
                            ))}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function OrderSlots({ view, art, drag, hinted, size, cols }: { view: WorldView; art: WorldArt; drag: DragSnap; hinted: boolean; size: number; cols: number }) {
    const n = view.sequence.length;
    const solved = view.feedback === "correct";
    return (
        <ol aria-label="Redosled" className="grid shrink-0 items-center justify-center gap-x-1" style={{ rowGap: GAP, gridTemplateColumns: `repeat(${cols}, auto)` }}>
            {view.sequence.map((id, index) => {
                const filled = index < view.placed.length;
                const card = filled ? view.items.find((item) => item.id === view.placed[index]) : undefined;
                const isNext = index === view.placed.length && !solved;
                return (
                    <li key={id} className="flex items-center gap-1">
                        <span
                            data-slot={isNext ? NEXT_SLOT : undefined}
                            data-open={isNext ? "" : undefined}
                            style={{ width: Math.floor(size), height: Math.floor(size) }}
                            className={cn(
                                "relative grid place-items-center rounded-2xl border-2 bg-surface p-1 @container",
                                filled ? "border-emerald-300" : isNext ? (drag.over === NEXT_SLOT ? "border-brand-500 bg-brand-50 ring-4 ring-brand-200" : "border-dashed border-brand-300") : "border-dashed border-line",
                                isNext && hinted && "animate-soft-pulse",
                                card && view.last === card.id && "animate-pop"
                            )}
                        >
                            {card ? <CardFace card={card} art={art} size="small" /> : <span className="font-display text-[min(30cqi,2rem)] font-extrabold text-brand-200">{index + 1}</span>}
                            <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[0.65rem] font-black text-white shadow-soft sm:h-6 sm:w-6 sm:text-xs">{index + 1}</span>
                        </span>
                        {index < n - 1 && (
                            <svg viewBox="0 0 10 16" aria-hidden="true" className={cn("h-4 w-[14px] shrink-0 text-brand-300", index % cols === cols - 1 && "invisible")}>
                                <path d="M2 2 L8 8 L2 14" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

interface TrayProps {
    view: WorldView;
    art: WorldArt;
    drag: DragSnap;
    calm: boolean;
    wiggle: string | null;
    hinted: string | null;
    disabled: boolean;
    cols: number;
    card: number;
}

function Tray({ view, art, drag, calm, wiggle, hinted, disabled, cols, card }: TrayProps) {
    const { active, pieceProps } = drag;
    const side = Math.floor(card);
    return (
        <div
            role="group"
            aria-label="Slike"
            className="grid shrink-0 place-content-center rounded-card border-2 border-dashed border-line bg-surface/70"
            style={{ gap: GAP, padding: TRAY_PAD / 2 - 2, gridTemplateColumns: `repeat(${cols}, ${side}px)`, gridAutoRows: `${side}px` }}
        >
            {view.items.map((item) => {
                if (view.placed.includes(item.id)) return <span key={item.id} aria-hidden="true" className="rounded-2xl border-2 border-dashed border-line/70" />;
                const selected = view.selected === item.id;
                const glow = hinted === item.id;
                return (
                    <button
                        key={item.id}
                        type="button"
                        data-piece={item.id}
                        disabled={disabled}
                        aria-pressed={view.kind === "sort" ? selected : undefined}
                        aria-label={item.label}
                        {...pieceProps(item.id)}
                        className={cn(
                            "relative flex touch-none select-none flex-col items-center justify-center rounded-2xl border-2 border-b-4 bg-surface p-1 shadow-soft transition-[transform,border-color,opacity] duration-150 @container",
                            selected ? "-translate-y-1 border-brand-500 bg-brand-50" : glow ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-300",
                            glow && !calm && "animate-soft-pulse",
                            active === item.id && "opacity-30",
                            wiggle === item.id && "animate-wiggle"
                        )}
                    >
                        <CardFace card={item} art={art} />
                    </button>
                );
            })}
        </div>
    );
}

// ── Tapšanje slogova ──────────────────────────────────────────────────────────

interface ClapProps extends BoardProps {
    accent: ReturnType<typeof getGame>["accent"];
    onDrum: () => void;
    onDone: () => void;
    onAgain: () => void;
}

function ClapBoard({ view, art, calm, demo, disabled, accent, onDrum, onDone, onAgain }: ClapProps) {
    const word = view.word;
    const [hit, setHit] = useState(0);
    if (!word) return null;
    const n = view.syllables.length;
    const along = view.mode === "along";
    const solved = view.feedback === "correct";
    const lit = solved ? n : view.taps;
    const showSyllables = along || solved;
    const drumGlow = view.hint && !solved && (along || view.taps < n);
    const doneGlow = view.hint && !solved && !along && view.taps === n;
    const tap = () => {
        if (!calm) setHit((value) => value + 1);
        onDrum();
    };
    return (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 self-stretch sm:gap-3 landscape:flex-row landscape:gap-5" style={{ containerType: "size" }}>
            {/* Reč: slika i reč (u tapšanju uz slogove — reč podeljena na slogove) */}
            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-1.5 landscape:w-auto landscape:flex-[1.1]">
                <div className="flex aspect-square w-[min(58cqw,36cqh,16rem)] shrink-0 items-center justify-center rounded-card border-2 border-line bg-surface p-2 shadow-soft landscape:w-[min(34cqw,62cqh,16rem)]">
                    {art.pic(word.pic, "h-full w-full")}
                </div>
                <p aria-label={showSyllables ? view.syllables.join("-") : word.label} className="flex flex-wrap items-center justify-center gap-x-1 font-display text-[clamp(1.4rem,8cqw,2.6rem)] font-extrabold leading-none text-ink landscape:text-[clamp(1.2rem,5cqw,2.4rem)]">
                    {showSyllables
                        ? view.syllables.map((syllable, i) => (
                              <span key={i} className="flex items-center gap-x-1">
                                  <span className={cn("rounded-xl px-1.5 py-0.5 transition-colors duration-200", i < lit ? cn(accent.solid, "text-white") : "text-ink")}>{syllable}</span>
                                  {i < n - 1 && <span className="text-ink-faint">-</span>}
                              </span>
                          ))
                        : word.label}
                </p>
            </div>
            {/* Udarci: kružići (uz slogove — po jedan za svaki slog), bubanj i dugmad */}
            <div className="flex w-full shrink-0 flex-col items-center gap-2 landscape:w-auto landscape:flex-1 sm:gap-3">
                <div aria-label={`Udarci: ${view.taps}`} className="flex min-h-9 flex-wrap items-center justify-center gap-1.5 sm:min-h-11 sm:gap-2">
                    {along || solved
                        ? view.syllables.map((_, i) => (
                              <span key={i} className={cn("h-7 w-7 rounded-full border-2 transition-colors duration-200 sm:h-9 sm:w-9", i < lit ? "border-sun-600 bg-sun-400" : "border-dashed border-sun-300 bg-surface")} />
                          ))
                        : Array.from({ length: Math.max(view.taps, 1) }, (_, i) => (
                              <span key={i} className={cn("h-7 w-7 rounded-full border-2 sm:h-9 sm:w-9", i < view.taps ? "border-sun-600 bg-sun-400" : "border-dashed border-sun-300 bg-surface")} />
                          ))}
                </div>
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                    {!along && (
                        <button
                            type="button"
                            data-action="again"
                            disabled={disabled || view.taps === 0}
                            onClick={onAgain}
                            aria-label="Ispočetka"
                            className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-b-4 border-line bg-surface text-ink-soft shadow-soft transition-transform active:translate-y-[2px] disabled:opacity-40 sm:h-16 sm:w-16"
                        >
                            <RotateCcw aria-hidden="true" className="h-6 w-6" strokeWidth={2.6} />
                        </button>
                    )}
                    <button
                        type="button"
                        data-action="drum"
                        disabled={disabled}
                        onClick={tap}
                        aria-label="Bubanj"
                        className={cn(
                            "relative grid aspect-square w-[min(42cqw,27cqh,11rem)] min-w-16 place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-400 landscape:w-[min(24cqw,44cqh,11rem)]",
                            drumGlow && "animate-soft-pulse"
                        )}
                    >
                        <span key={hit} className={cn("block h-full w-full", hit > 0 && "animate-pop")}>
                            <DrumArt />
                        </span>
                        {demo && !solved && (along || view.taps < n) && <DemoHand className="bottom-0 right-0" />}
                    </button>
                    {!along && (
                        <button
                            type="button"
                            data-action="done"
                            disabled={disabled || view.taps === 0}
                            onClick={onDone}
                            className={cn(
                                "relative inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-b-[5px] px-4 font-display text-lg font-extrabold text-white transition-[transform,border-width] active:translate-y-[3px] active:border-b-2 disabled:opacity-40 sm:min-h-16 sm:px-6 sm:text-xl",
                                accent.solid,
                                accent.edge,
                                doneGlow && "animate-soft-pulse"
                            )}
                        >
                            Gotovo
                            {demo && !solved && view.taps === n && <DemoHand className="-bottom-2 -right-3" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/** Bubanj: drveni obruč, napeta koža i dva štapića */
function DrumArt() {
    return (
        <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-md" aria-hidden="true">
            <ellipse cx={60} cy={106} rx={40} ry={6} fill="#1f1b3a" opacity={0.1} />
            <path d="M18 46 L18 88 C18 100 102 100 102 88 L102 46Z" fill="#e8604a" stroke="#a8392b" strokeWidth={3} strokeLinejoin="round" />
            <path d="M18 54 L102 54 M18 80 C30 90 90 90 102 80" fill="none" stroke="#f7c94b" strokeWidth={4} />
            <path d="M30 56 L45 86 L60 56 L75 86 L90 56" fill="none" stroke="#fff3d6" strokeWidth={2.4} strokeLinejoin="round" />
            <ellipse cx={60} cy={46} rx={42} ry={14} fill="#fbf1dc" stroke="#a8392b" strokeWidth={3} />
            <ellipse cx={60} cy={44} rx={30} ry={8} fill="#ffffff" opacity={0.5} />
            <g stroke="#8a5a2b" strokeWidth={5} strokeLinecap="round">
                <path d="M86 10 L66 38" />
                <path d="M104 22 L74 42" />
            </g>
            <circle cx={66} cy={38} r={5} fill="#c98a4b" />
            <circle cx={74} cy={42} r={5} fill="#c98a4b" />
        </svg>
    );
}

// ── Deo tela ──────────────────────────────────────────────────────────────────

function PointBoard({ view, art, calm, demo, disabled, Figure, onPart }: BoardProps & { Figure: ComponentType<PointFigureProps>; onPart: (part: string) => void }) {
    const solved = view.feedback === "correct";
    const glow = view.hint && !solved ? view.answer : null;
    return (
        <div className="relative flex min-h-0 w-full flex-1 items-center justify-center self-stretch" style={{ containerType: "size" }}>
            <Figure view={view} glow={glow} demo={demo && !solved ? view.answer : null} calm={calm} disabled={disabled} onPart={onPart} />
            {view.cue && (
                <div className="absolute left-0 top-0 flex aspect-square w-[min(26cqw,22cqh,8.5rem)] animate-pop flex-col items-center justify-center rounded-2xl border-2 border-line bg-surface p-1 shadow-soft @container">
                    <CardFace card={view.cue} art={art} />
                </div>
            )}
        </div>
    );
}

// ── Čekanje i prelazak ulice ──────────────────────────────────────────────────

function WaitBoard({ view, calm, demo, disabled, accent, Crossing, crossing, onGo }: BoardProps & { accent: ReturnType<typeof getGame>["accent"]; Crossing: ComponentType<CrossingProps>; crossing: boolean; onGo: () => void }) {
    const solved = view.feedback === "correct";
    const glow = view.hint && !solved && view.phase === "go";
    return (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 self-stretch landscape:flex-row landscape:gap-5" style={{ containerType: "size" }}>
            <div className="aspect-[3/2] w-[min(100cqw,66cqh*1.5)] shrink-0 overflow-hidden rounded-card border-2 border-line bg-surface shadow-soft landscape:w-[min(70cqw,96cqh*1.5)]">
                <Crossing view={view} calm={calm} crossing={crossing} className="h-full w-full" />
            </div>
            <button
                type="button"
                data-action="go"
                disabled={disabled}
                onClick={onGo}
                className={cn(
                    "relative inline-flex min-h-16 shrink-0 items-center justify-center gap-3 rounded-2xl border-2 border-b-[6px] px-7 font-display text-2xl font-extrabold text-white transition-[transform,border-width] active:translate-y-[3px] active:border-b-2 disabled:opacity-60 sm:min-h-20 sm:px-10 sm:text-3xl landscape:flex-col landscape:px-5",
                    accent.solid,
                    accent.edge,
                    glow && "animate-soft-pulse"
                )}
            >
                <WalkIcon />
                Kreni
                {demo && view.phase === "go" && <DemoHand className="-bottom-3 -right-3" />}
            </button>
        </div>
    );
}

/** Pešak koji korača (kao na semaforu) */
function WalkIcon() {
    return (
        <svg viewBox="0 0 40 40" aria-hidden="true" className="h-9 w-9 sm:h-11 sm:w-11">
            <circle cx={22} cy={6.5} r={4.5} fill="currentColor" />
            <path d="M20 13 L16 24 L22 27 L20 37 M16 24 L10 36 M18 15 L11 19 L9 25 M21 14 L27 20 L32 21" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
