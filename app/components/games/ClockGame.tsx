"use client";

// Igra „Sat”: drvena tabla sa brojevima 0–9 (ispod svake rupe toliko životinja), pa drveni sat
// sa pingvinom koji dete slaže broj po broj, pa čitanje vremena („Koliko je sati?”, „Pokaži tri
// sata.”, „Koji sat pokazuje pola četiri?”). Komad se prevlači do svoje rupe (ili dodirne, pa
// dodirne rupa); komad koji ne pripada rupi mirno se vrati u korpu. Nema žurbe ni tajmera;
// pomoć (rupa i komad zasvetle) se na težim nivoima povlači. Sadržaj i nivoi: data/clockLevels.ts.

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    demoRounds,
    Feedback,
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
import { isWideBoard, trayGrid, trayPieceSize } from "@/app/components/games/kit/InsetArt";
import { useDragSnap, type DragSnap } from "@/app/components/games/kit/useDragSnap";
import {
    boardIntro,
    boardView,
    buildClockLevel,
    CLOCK_DONE,
    CLOCK_NUMBERS,
    CLOCK_PIECES,
    BOARD_DONE,
    BOARD_TITLE,
    CLOCK_TITLE,
    clockAngle,
    clockResult,
    digitSentence,
    emptyClockView,
    fits,
    handAngles,
    mergeClockMonitor,
    numberSentence,
    parseTime,
    planRounds,
    solveClockView,
    taskAnswer,
    taskAnswerKey,
    taskMistake,
    taskQuestion,
    taskView,
    timePhrase,
    type ClockPlan,
    type ClockView,
} from "@/app/components/games/data/clockLevels";
import { numberWord } from "@/app/components/games/data/countingItems";
import {
    boardSize,
    CELL_W,
    ClockFaceArt,
    ClockPieceSvg,
    DigitBoardArt,
    DigitPieceSvg,
    digitFrame,
    FACE,
    MiniClock,
    numberPoint,
    PIECE_SIZE,
} from "@/app/components/games/clock/ClockArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("clock");
const WRONG_FEEDBACK_MS = 1400;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
const MISFIT = "Ne uklapa se.";
/** Nizak ekran: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red */
const FEEDBACK_CLASS = "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

function initialView(plan: ClockPlan | null): ClockView {
    if (!plan) return emptyClockView(1);
    const base = emptyClockView(planRounds(plan));
    if (plan.mode === "time") return { ...base, ...taskView(plan.tasks[0]) };
    return { ...base, ...boardView(plan.boards[0], 0, plan.mode) };
}

/** Rečenica posle komada koji nije za to mesto: oblik ne ulazi, ili (okrugle rupe) koji je to broj */
function misfitSentence(view: ClockView, piece: number): string {
    if (view.holes === "round") return `To je broj ${numberWord(piece)}.`;
    return MISFIT;
}

export default function ClockGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<ClockView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<ClockView>({ childId, gameId: "clock", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde
    const [plan] = useState<ClockPlan | null>(() => (isMonitor ? null : buildClockLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit })));
    // Podrška se povlači: na lakim nivoima pomoć stiže već posle prve greške i posle čekanja
    // (osim kad je roditelj isključio pomoć); kasnije važi ono što je podešeno.
    const early = (plan?.earlyHint ?? false) && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    const [view, setView] = useState<ClockView>(() => initialView(plan));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: ClockView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    const introFor = (current: ClockView) => (current.mode === "time" ? taskQuestion({ kind: current.task ?? "read", time: current.time }) : boardIntro(current, current.mode));

    // Početak nivoa: uputstvo jednom
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        say(introFor(viewRef.current));
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: ClockView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(clockResult(final, level, sync.elapsedSec()));
    };

    const startBoard = (index: number) => {
        const board = plan?.boards[index];
        if (!plan || !board) return;
        guard.hold();
        const current = viewRef.current;
        const next: ClockView = { ...current, ...boardView(board, index, plan.mode), round: Math.min(current.round + 1, current.totalRounds) };
        commit(next, `Tabla ${index + 1}: ${board.tray.join(", ")}`);
        say(boardIntro(board, plan.mode));
    };

    const startTask = (index: number) => {
        const task = plan?.tasks[index];
        if (!task) return;
        guard.hold();
        const next: ClockView = { ...viewRef.current, ...taskView(task), round: index + 1 };
        const question = taskQuestion(task);
        commit(next, `Zadatak ${index + 1}: ${question}`);
        say(question);
    };

    /** Posle greške: kratka poruka, pa se sve smiruje (nekoliko brzih pokušaja nije nekoliko grešaka) */
    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    const howSolved = (firstTry: boolean, modeled: boolean, current: ClockView) =>
        modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint || current.hintPiece !== null ? "uz pomoć" : "posle više pokušaja";

    // ── Slaganje (tabla i sat) ────────────────────────────────────────────────

    /** Komad je spušten na mesto. Vraća true kad je prihvaćen (inače se vraća u korpu). */
    const placePiece = (piece: number, slot: number): boolean => {
        if (isMonitor || finishedRef.current || guard.blocked() || !plan) return false;
        const current = viewRef.current;
        if (current.mode === "time" || current.feedback === "correct") return false;
        if (!current.tray.includes(piece) || current.filled.includes(piece) || !current.slots.includes(slot) || current.filled.includes(slot)) return false;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;

        if (fits(piece, slot)) {
            const filled = [...current.filled, piece];
            const boardDone = current.tray.every((value) => filled.includes(value));
            const lastBoard = current.board >= plan.boards.length - 1;
            const { next, firstTry, modeled } = solveClockView(current, level, {
                filled,
                last: piece,
                selected: null,
                hintPiece: null,
                hint: false,
                wrong: [],
                picked: null,
                feedback: boardDone ? "correct" : null,
                round: boardDone ? current.round : Math.min(current.round + 1, current.totalRounds),
            });
            const sentence = current.mode === "board" ? digitSentence(piece) : numberSentence(piece);
            commit(next, `Tačno ${howSolved(firstTry, modeled, current)}: ${piece}`);
            playSfx("correct");
            if (boardDone) {
                const done = `${sentence} ${current.mode === "board" ? BOARD_DONE : CLOCK_DONE}`;
                sayThen(praise(done, firstTry), lastBoard ? finish : () => startBoard(current.board + 1), { min: 1800, emotion: "happy" });
            } else {
                say(praise(sentence, firstTry), undefined, "happy");
            }
            return true;
        }

        const wrong = [...current.wrong, `${piece}>${slot}`];
        const open = current.slots.filter((value) => !current.filled.includes(value)).length;
        const hint = current.hintPiece !== null || hintDue(hintAfter, wrong.length, Math.max(1, open - 1));
        commit(
            { ...current, wrong, selected: null, picked: String(piece), feedback: "wrong", hintPiece: hint ? (current.hintPiece ?? piece) : null, incorrectCount: current.incorrectCount + 1 },
            `Netačno: ${piece} → mesto ${slot}`
        );
        playSfx("wrong");
        say(`${misfitSentence(current, piece)} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong();
        return false;
    };

    const selectPiece = (piece: number) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.mode === "time" || current.feedback === "correct" || current.filled.includes(piece)) return;
        playSfx("tap");
        commit({ ...current, selected: current.selected === piece ? null : piece });
    };

    const tapSlot = (slot: number) => {
        const selected = viewRef.current.selected;
        if (selected !== null) placePiece(selected, slot);
    };

    // ── Vreme ─────────────────────────────────────────────────────────────────

    const solveTask = (current: ClockView, solved: Partial<ClockView>, log: string) => {
        const { next, firstTry, modeled } = solveClockView(current, level, { ...solved, feedback: "correct" });
        commit(next, `Tačno ${howSolved(firstTry, modeled, current)}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(taskAnswer({ kind: current.task ?? "read", time: current.time }), firstTry), isLast ? finish : () => startTask(current.round), { min: 1800, emotion: "happy" });
    };

    const missTask = (current: ClockView, picked: string, extra: Partial<ClockView> = {}) => {
        const task = { kind: current.task ?? "read", time: current.time };
        const wrong = [...current.wrong, picked];
        const offered = current.task === "set" ? 11 : Math.max(1, current.choices.length - 1);
        const hint = current.hint || hintDue(hintAfter, wrong.length, offered);
        commit({ ...current, ...extra, wrong, picked, feedback: "wrong", hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${taskQuestion(task)} → ${picked}`);
        playSfx("wrong");
        say(`${taskMistake(task, picked)} ${hint ? RETRY_SLOW : RETRY} ${taskQuestion(task)}`.trim(), undefined, "gentle");
        settleAfterWrong();
    };

    const pickChoice = (key: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.mode !== "time" || current.task === "set" || current.feedback === "correct" || current.wrong.includes(key) || !current.choices.includes(key)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const task = { kind: current.task ?? "read", time: current.time };
        if (key === taskAnswerKey(task)) {
            solveTask(current, { picked: key, hint: false }, `${taskQuestion(task)} → ${key}`);
            return;
        }
        missTask(current, key);
    };

    /** „Pokaži”: mala kazaljka je puštena na broj `hour` */
    const setHour = (hour: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.mode !== "time" || current.task !== "set" || current.feedback === "correct") return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const task = { kind: current.task, time: current.time };
        if (String(hour) === taskAnswerKey(task)) {
            solveTask(current, { hand: hour, hint: false }, `${taskQuestion(task)} → ${hour}`);
            return;
        }
        missTask(current, String(hour), { hand: hour });
    };

    // Pomoć posle čekanja: komad i njegovo mesto (ili tačan odgovor) blago zasvetle
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.board}:${view.round}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hint || current.hintPiece !== null) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        if (current.mode === "time") {
            commit({ ...current, hint: true }, "Pomoć posle čekanja");
            return;
        }
        const target = current.selected ?? current.tray.find((value) => !current.filled.includes(value));
        if (target !== undefined) commit({ ...current, hintPiece: target }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        say(introFor(current));
    };

    const drag = useDragSnap({
        enabled: !isMonitor && view.mode !== "time" && view.feedback !== "correct",
        calm,
        onDrop: (piece, slot) => (slot === null ? false : placePiece(Number(piece), Number(slot))),
        onTap: (piece) => selectPiece(Number(piece)),
    });

    const shown = isMonitor ? mergeClockMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const placing = shown.mode !== "time";
    const hud = <GameHud round={shown.round} totalRounds={shown.totalRounds} unit={placing ? "Broj" : "Pitanje"} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />;

    if (placing ? shown.slots.length === 0 : !parseTime(shown.time) || (shown.task !== "set" && shown.choices.length === 0)) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const task = { kind: shown.task ?? "read", time: shown.time };
    const wrongText = shown.feedback === "wrong" ? lastMistake(shown) : "";
    const correctText = placing ? (shown.mode === "board" ? BOARD_DONE : CLOCK_DONE) : taskAnswer(task);
    const title = placing ? (shown.mode === "board" ? BOARD_TITLE : CLOCK_TITLE) : taskQuestion(task);

    return (
        <GameStage>
            {hud}
            {/* Nizak ekran: kod slaganja uputstvo samo glasom (dugme „Ponovi”), da tabla i komadi budu krupni;
                pitanje o vremenu tada stoji u polju za igru, pored sata */}
            <GamePrompt key={`prompt-${shown.board}-${placing ? "" : shown.round}`} className={cn("animate-fade-up [@media(max-height:30rem)]:hidden", placing && "[@media(max-height:37.5rem)]:hidden")} compact title={title} />
            <PlayArea accent={GAME.accent} className="p-2 sm:p-4">
                {placing ? (
                    <PlaceBoard
                        key={`board-${shown.board}`}
                        view={shown}
                        drag={drag}
                        calm={calm}
                        disabled={isMonitor || solved}
                        demo={!isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved}
                        onSlot={tapSlot}
                    />
                ) : (
                    <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 landscape:flex-row">
                        <p className="hidden shrink-0 text-center font-display text-xl font-extrabold leading-snug text-ink [@media(max-height:30rem)]:block landscape:w-40">{title}</p>
                        <TimeBoard key={`task-${shown.round}`} view={shown} calm={calm} disabled={isMonitor || solved} onPick={pickChoice} onSet={setHour} />
                    </div>
                )}
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={correctText} wrongText={wrongText} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

/** Poruka uz poslednju grešku na ekranu: samo kratka činjenica (jedan red i na uskom telefonu); glas kaže i „Probaj ponovo.” */
function lastMistake(view: ClockView): string {
    if (view.mode === "time") return taskMistake({ kind: view.task ?? "read", time: view.time }, view.picked ?? "") || RETRY;
    const piece = Number(view.picked);
    return Number.isInteger(piece) ? misfitSentence(view, piece) : MISFIT;
}

// ── Tabla ili sat sa rupama i korpa sa komadima ──────────────────────────────



interface PlaceBoardProps {
    view: ClockView;
    drag: DragSnap;
    calm: boolean;
    disabled: boolean;
    /** Prvi komad prvog nivoa: ruka pokazuje prevlačenje */
    demo: boolean;
    onSlot: (slot: number) => void;
}

/** Mesto za dugme preko slike, u procentima slike */
function slotBox(view: ClockView, slot: number, width: number, height: number): { left: string; top: string; width: string; height: string } {
    const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(3)}%`;
    if (view.mode === "board") {
        const frame = digitFrame(view.slots.indexOf(slot), view.slots.length);
        return { left: pct(frame.x, width), top: pct(frame.y, height), width: pct(frame.w, width), height: pct(frame.h, height) };
    }
    const p = numberPoint(slot);
    const size = PIECE_SIZE + 10;
    return { left: pct(p.x - size / 2, FACE), top: pct(p.y - size / 2, FACE), width: pct(size, FACE), height: pct(size, FACE) };
}

/**
 * Tabla (ili sat) i korpa. Na uspravnom ekranu korpa je ispod, na položenom pored table.
 * Tabla zauzima sav preostali prostor i ostaje cela vidljiva (veličina po manjoj stranici).
 */
function PlaceBoard({ view, drag, calm, disabled, demo, onSlot }: PlaceBoardProps) {
    // Odvojene vrednosti: samo `ghostRef` i `rootRef` su ref-ovi, ostalo je obično stanje prevlačenja
    const { rootRef, ghostRef, active, wobble, over, pieceProps } = drag;
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const [boardPx, setBoardPx] = useState(0);
    const boardEl = useRef<HTMLDivElement | null>(null);
    const isBoard = view.mode === "board";
    const size = isBoard ? boardSize(view.slots.length) : { width: FACE, height: FACE };
    const remaining = view.tray.filter((value) => !view.filled.includes(value));
    const glow = view.hintPiece ?? (demo ? 1 : null);

    useEffect(() => {
        const el = boardEl.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(() => setBoardPx(el.getBoundingClientRect().width));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const setRootRef = (el: HTMLDivElement | null) => {
        rootRef(el);
        setRoot((previous) => (previous === el ? previous : el));
    };

    // Komad koji prati prst je iste veličine kao rupa na tabli
    const ghostPx = Math.max(48, (boardPx * (isBoard ? CELL_W : PIECE_SIZE)) / size.width);
    const trayCount = view.tray.length;
    const wide = isWideBoard(size.width, size.height);
    const piece = trayPieceSize(trayCount, wide);

    return (
        <div
            ref={setRootRef}
            className={cn("relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 sm:gap-3", !wide && "landscape:flex-row", disabled && "pointer-events-none")}
            // Tabla nije viša nego što joj treba (uspravan ekran, široka tabla), pa tabla i korpa stoje zajedno u sredini
            style={{ containerType: "size", ["--board-max" as string]: `calc(100cqw * ${(size.height / size.width).toFixed(4)})` }}
        >
            <div className={cn("flex min-h-0 w-full min-w-0 flex-1 items-center justify-center self-stretch", wide ? "max-h-[var(--board-max)]" : "portrait:max-h-[var(--board-max)]")} style={{ containerType: "size" }}>
                <div ref={boardEl} className="relative" style={{ width: `min(100cqw, calc(100cqh * ${(size.width / size.height).toFixed(4)}))`, aspectRatio: `${size.width} / ${size.height}` }}>
                    <svg viewBox={`0 0 ${size.width} ${size.height}`} className="absolute inset-0 h-full w-full" role="img" aria-label={isBoard ? "Drvena tabla sa brojevima" : "Drveni sat"}>
                        {isBoard ? (
                            <DigitBoardArt digits={view.slots} filled={view.filled} tint={view.tint} glow={glow} over={over === null ? null : Number(over)} last={view.last} calm={calm} />
                        ) : (
                            <ClockFaceArt
                                filled={view.filled}
                                roundHoles={view.holes === "round"}
                                plain={view.plain}
                                glow={glow}
                                over={over === null ? null : Number(over)}
                                last={view.last}
                                hands={{ hour: clockAngle(3), minute: 0 }}
                                calm={calm}
                            />
                        )}
                    </svg>
                    {view.slots.map((slot) => {
                        const open = !view.filled.includes(slot);
                        if (!open) return null;
                        return (
                            <button
                                key={slot}
                                type="button"
                                data-slot={slot}
                                data-open=""
                                disabled={disabled || view.selected === null}
                                onClick={() => onSlot(slot)}
                                aria-label={isBoard ? `Rupa, ${slotName(view, slot)}` : `Rupa na satu, ${slotName(view, slot)}`}
                                className="absolute rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default"
                                style={slotBox(view, slot, size.width, size.height)}
                            />
                        );
                    })}
                </div>
            </div>

            <div
                role="group"
                aria-label="Komadi"
                className={cn(
                    "grid shrink-0 place-items-center gap-1.5 rounded-card border-2 border-dashed border-line bg-surface/70 p-1.5 sm:gap-2 sm:p-2",
                    trayGrid(trayCount, wide)
                )}
            >
                {view.tray.map((value) => {
                    const placed = view.filled.includes(value);
                    const lifted = active === String(value);
                    const selected = view.selected === value;
                    const hinted = view.hintPiece === value;
                    if (placed) return <span key={value} aria-hidden="true" className={cn("aspect-square rounded-2xl border-2 border-dashed border-line/70", piece)} />;
                    return (
                        <button
                            key={value}
                            type="button"
                            data-piece={value}
                            disabled={disabled}
                            aria-pressed={selected}
                            aria-label={isBoard ? `Broj ${value}` : `Broj ${value}, ${view.plain ? "drveni krug" : CLOCK_PIECES[value].label}`}
                            {...pieceProps(String(value))}
                            className={cn(
                                "relative grid aspect-square touch-none select-none place-items-center rounded-2xl border-2 border-b-4 bg-surface p-0.5 shadow-soft transition-[transform,border-color,opacity] duration-150",
                                piece,
                                selected ? "-translate-y-1 border-brand-500 bg-brand-50" : hinted ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-300",
                                hinted && !calm && "animate-soft-pulse",
                                lifted && "opacity-30"
                            )}
                        >
                            {isBoard ? <DigitPieceSvg digit={value} className="pointer-events-none h-full w-full" /> : <ClockPieceSvg value={value} plain={view.plain} className="pointer-events-none h-full w-full" />}
                        </button>
                    );
                })}
            </div>

            {demo && remaining.includes(1) && <DragDemo root={root} from='[data-piece="1"]' to='[data-slot="1"]' calm={calm} />}

            {/* Komad koji prati prst: iznad celog ekrana igre (z 6000), da ga ništa ne pokrije */}
            {active !== null &&
                typeof document !== "undefined" &&
                createPortal(
                    <div ref={ghostRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[6500] drop-shadow-xl" style={{ width: ghostPx * (isBoard ? 1 : 1.12), height: ghostPx * (isBoard ? 1.16 : 1.12) }}>
                        <div className={cn("h-full w-full", wobble && "animate-wiggle")}>
                            {isBoard ? <DigitPieceSvg digit={Number(active)} className="h-full w-full" /> : <ClockPieceSvg value={Number(active)} plain={view.plain} className="h-full w-full" />}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

/** Opis rupe za čitač ekrana: oblik (ne broj — broj je ono što dete traži) */
function slotName(view: ClockView, slot: number): string {
    if (view.mode === "board") return `${view.slots.indexOf(slot) + 1}. po redu`;
    if (view.holes === "round") return "okrugla";
    return CLOCK_PIECES[slot].label.split(" ").slice(1).join(" ");
}

// ── Vreme: sat i izbori ───────────────────────────────────────────────────────

interface TimeBoardProps {
    view: ClockView;
    calm: boolean;
    disabled: boolean;
    onPick: (key: string) => void;
    onSet: (hour: number) => void;
}

function choiceState(view: ClockView, key: string): ChoiceState {
    const answer = taskAnswerKey({ kind: view.task ?? "read", time: view.time });
    if (view.feedback === "correct") return key === answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === key) return "wrong";
    if (view.wrong.includes(key)) return "dimmed";
    if (view.hint && key === answer) return "hint";
    return "idle";
}

function TimeBoard({ view, calm, disabled, onPick, onSet }: TimeBoardProps) {
    const time = parseTime(view.time);
    if (!time) return null;
    if (view.task === "which") {
        return (
            // Tri sata u redu, što veća: širina po visini polja (nizak ekran) ili po širini (telefon)
            <div className="flex min-h-0 w-full flex-1 items-center justify-center self-stretch" style={{ containerType: "size" }}>
                <div role="group" aria-label="Satovi" className={cn("grid w-full grid-cols-3 gap-2 sm:gap-4", disabled && "pointer-events-none")} style={{ maxWidth: "min(100cqw, calc(300cqh - 0.5rem), 52rem)" }}>
                    {view.choices.map((key) => {
                        const choice = parseTime(key);
                        if (!choice) return null;
                        const state = choiceState(view, key);
                        return (
                            <ChoiceCard
                                key={key}
                                state={state}
                                disabled={disabled || (state !== "idle" && state !== "hint")}
                                onClick={() => onPick(key)}
                                aria-label={`Sat koji pokazuje ${timePhrase(choice)}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className="animate-pop min-h-0 p-1 sm:p-2"
                            >
                                <MiniClock time={choice} className="pointer-events-none aspect-square h-auto w-full" />
                            </ChoiceCard>
                        );
                    })}
                </div>
            </div>
        );
    }

    const angles = handAngles(time);
    if (view.task === "read") {
        return (
            <div className={cn("flex min-h-0 w-full flex-1 flex-col items-center gap-3 landscape:flex-row landscape:justify-center", disabled && "pointer-events-none")}>
                <div className="flex min-h-0 w-full min-w-0 flex-1 items-center justify-center self-stretch" style={{ containerType: "size" }}>
                    <svg viewBox={`0 0 ${FACE} ${FACE}`} role="img" aria-label="Sat" style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}>
                        <ClockFaceArt filled={CLOCK_NUMBERS} hands={angles} calm={calm} />
                    </svg>
                </div>
                <div role="group" aria-label="Koliko je sati" className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3 landscape:grid-cols-1">
                    {view.choices.map((key) => {
                        const state = choiceState(view, key);
                        const hour = Number(key);
                        return (
                            <ChoiceCard
                                key={key}
                                state={state}
                                disabled={disabled || (state !== "idle" && state !== "hint")}
                                onClick={() => onPick(key)}
                                aria-label={`${timePhrase({ h: hour, m: 0 })}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className="animate-pop min-h-0 p-1.5 sm:p-2"
                            >
                                <ClockPieceSvg value={hour} className="pointer-events-none h-[clamp(3.5rem,11dvh,6rem)] w-[clamp(3.5rem,11dvh,6rem)]" />
                            </ChoiceCard>
                        );
                    })}
                </div>
            </div>
        );
    }

    return <SetClock view={view} calm={calm} disabled={disabled} onSet={onSet} />;
}

/** Ugao (stepeni od vrha, u smeru kazaljke) tačke u odnosu na sredinu elementa; null blizu sredine */
function pointerAngle(el: Element, x: number, y: number): number | null {
    const rect = el.getBoundingClientRect();
    const dx = x - (rect.left + rect.width / 2);
    const dy = y - (rect.top + rect.height / 2);
    if (Math.hypot(dx, dy) < rect.width * 0.1) return null;
    return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
}

const nearestHour = (angle: number) => Math.round(angle / 30) % 12 || 12;

/**
 * „Pokaži tri sata”: mala kazaljka se okreće prstom (prati prst, pa stane na najbliži broj),
 * ili se dodirne broj. Velika kazaljka stoji na 12. Tastaturom: brojevi su dugmad.
 */
function SetClock({ view, calm, disabled, onSet }: { view: ClockView; calm: boolean; disabled: boolean; onSet: (hour: number) => void }) {
    const [live, setLive] = useState<number | null>(null);
    const turning = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(null);
    const target = Number(taskAnswerKey({ kind: "set", time: view.time }));
    const hourAngle = live ?? clockAngle(view.hand);

    const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
        try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
            /* bez hvatanja */
        }
        turning.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    };
    const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const current = turning.current;
        if (!current || current.id !== event.pointerId) return;
        if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 8) return;
        current.moved = true;
        const angle = pointerAngle(event.currentTarget, event.clientX, event.clientY);
        if (angle !== null) setLive(angle);
    };
    const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        const current = turning.current;
        if (!current || current.id !== event.pointerId) return;
        turning.current = null;
        const angle = pointerAngle(event.currentTarget, event.clientX, event.clientY);
        setLive(null);
        if (angle !== null) onSet(nearestHour(angle));
    };

    return (
        <div className={cn("flex min-h-0 w-full flex-1 items-center justify-center self-stretch", disabled && "pointer-events-none")} style={{ containerType: "size" }}>
            <div
                className="relative touch-none select-none"
                style={{ width: "min(100cqw, 100cqh)", height: "min(100cqw, 100cqh)" }}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => {
                    turning.current = null;
                    setLive(null);
                }}
            >
                <svg viewBox={`0 0 ${FACE} ${FACE}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`Sat, mala kazaljka pokazuje ${numberWord(view.hand)}`}>
                    <ClockFaceArt filled={CLOCK_NUMBERS} mark={view.hint ? target : null} hands={{ hour: hourAngle, minute: 0 }} calm={calm || live !== null} />
                </svg>
                {CLOCK_NUMBERS.map((hour) => {
                    const p = numberPoint(hour);
                    const box = PIECE_SIZE + 10;
                    return (
                        <button
                            key={hour}
                            type="button"
                            disabled={disabled}
                            // Mišem i prstom radi ceo sat (pokret iznad); ovde samo tastatura (detail = 0)
                            onClick={(event) => event.detail === 0 && onSet(hour)}
                            aria-label={`Broj ${hour}`}
                            className="absolute rounded-full outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
                            style={{ left: `${((p.x - box / 2) / FACE) * 100}%`, top: `${((p.y - box / 2) / FACE) * 100}%`, width: `${(box / FACE) * 100}%`, height: `${(box / FACE) * 100}%` }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
