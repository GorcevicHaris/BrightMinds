"use client";

// Igra „Umetaljka”: drvena tabla sa rupama, pored nje komadi. Dete prevlači komad do rupe
// istog oblika (ili ga dodirne, pa dodirne rupu); komad koji ne ulazi kratko se zaljulja i
// mirno vrati u korpu, bez oštrog zvuka. Kasnije dolaze slični oblici, predmeti kao siluete
// i okrenuti komadi (okreću se dugmetom „Okreni” ili još jednim dodirom izabranog komada).
// Nema žurbe ni tajmera; pomoć se na težim nivoima povlači. Nivoi: data/insetLevels.ts.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCw } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
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
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import { DragDemo } from "@/app/components/games/kit/DragDemo";
import { HOLE_HIT, isWideBoard, trayGrid, trayPieceSize } from "@/app/components/games/kit/InsetArt";
import { useDragSnap, type DragSnap } from "@/app/components/games/kit/useDragSnap";
import {
    buildInsetLevel,
    emptyInsetView,
    fitsHole,
    getInsetShape,
    INSET_DONE,
    insetBoardView,
    insetIntro,
    insetResult,
    insetRounds,
    insetTitle,
    mergeInsetMonitor,
    MISFIT,
    placedSentence,
    solveInsetView,
    TURN_IT,
    type InsetPlan,
    type InsetView,
} from "@/app/components/games/data/insetLevels";
import { holeOrigin, INSET_HOLE, insetBoardSize, InsetBoardArt, InsetPieceSvg } from "@/app/components/games/inset/InsetBoardArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("inset");
const WRONG_FEEDBACK_MS = 1400;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
const WIGGLE_MS = 520;
/** Nizak ekran: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red */
const FEEDBACK_CLASS = "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

function initialView(plan: InsetPlan | null): InsetView {
    if (!plan || plan.boards.length === 0) return emptyInsetView(1);
    return { ...emptyInsetView(insetRounds(plan)), ...insetBoardView(plan.boards[0], 0) };
}

export default function InsetGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<InsetView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<InsetView>({ childId, gameId: "inset", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde
    const [plan] = useState<InsetPlan | null>(() => (isMonitor ? null : buildInsetLevel(level, { maxRounds: settings.preset.maxRounds })));
    // Na lakim nivoima pomoć stiže već posle prve greške i posle čekanja (osim kad je isključena)
    const early = (plan?.earlyHint ?? false) && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    const [view, setView] = useState<InsetView>(() => initialView(plan));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    // Komad koji je dodirom spušten na pogrešnu rupu kratko se zaljulja u korpi
    const [wiggle, setWiggle] = useState<string | null>(null);

    const commit = useCallback(
        (next: InsetView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const current = viewRef.current;
        if (current.holes.length > 0) say(insetIntro(current));
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: InsetView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(insetResult(final, level, sync.elapsedSec()));
    };

    const startBoard = (index: number) => {
        const board = plan?.boards[index];
        if (!board) return;
        guard.hold();
        const current = viewRef.current;
        commit({ ...current, ...insetBoardView(board, index), round: Math.min(current.round + 1, current.totalRounds) }, `Tabla ${index + 1}: ${board.holes.join(", ")}`);
        say(insetIntro(board));
    };

    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null, turnNote: false });
        });
    };

    /** Komad je spušten na rupu. Vraća true kad je legao (inače se vraća u korpu). */
    const placePiece = (id: string, hole: string): boolean => {
        if (isMonitor || finishedRef.current || guard.blocked() || !plan) return false;
        const current = viewRef.current;
        if (current.feedback === "correct" || !current.tray.includes(id) || current.filled.includes(id) || !current.holes.includes(id) || current.filled.includes(hole) || !current.holes.includes(hole)) return false;
        const piece = getInsetShape(id);
        const target = getInsetShape(hole);
        if (!piece || !target) return false;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const rot = current.rot[id] ?? 0;

        if (fitsHole(piece.id, rot, target.id)) {
            const filled = [...current.filled, id];
            const boardDone = current.tray.every((other) => filled.includes(other));
            const lastBoard = current.board >= plan.boards.length - 1;
            const { next, firstTry, modeled } = solveInsetView(current, level, {
                filled,
                last: id,
                selected: null,
                hintPiece: null,
                turnNote: false,
                wrong: [],
                picked: null,
                feedback: boardDone ? "correct" : null,
                round: boardDone ? current.round : Math.min(current.round + 1, current.totalRounds),
            });
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hintPiece !== null ? "uz pomoć" : "posle više pokušaja";
            commit(next, `Tačno ${how}: ${piece.name.toLowerCase()}`);
            playSfx("correct");
            const sentence = placedSentence(piece.id);
            if (boardDone) sayThen(praise(`${sentence} ${INSET_DONE}`, firstTry), lastBoard ? finish : () => startBoard(current.board + 1), { min: 1800, emotion: "happy" });
            else say(praise(sentence, firstTry), undefined, "happy");
            return true;
        }

        // Prava rupa, ali komad nije okrenut kako treba: ostaje izabran, da ga dugme „Okreni” okrene
        const turn = piece.id === target.id;
        const wrong = [...current.wrong, `${id}>${hole}`];
        const open = current.holes.filter((other) => !current.filled.includes(other)).length;
        const hint = current.hintPiece !== null || hintDue(hintAfter, wrong.length, Math.max(1, open - 1));
        commit(
            {
                ...current,
                wrong,
                selected: turn ? id : null,
                picked: id,
                turnNote: turn,
                feedback: "wrong",
                hintPiece: hint ? (current.hintPiece ?? id) : null,
                incorrectCount: current.incorrectCount + 1,
            },
            turn ? `Prava rupa, komad nije okrenut: ${piece.name.toLowerCase()} (${rot}°)` : `Netačno: ${piece.name.toLowerCase()} → ${target.name.toLowerCase()}`
        );
        playSfx("wrong");
        say(turn ? TURN_IT : `${MISFIT} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong();
        return false;
    };

    const rotatePiece = (id: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (!current.rotate || current.feedback === "correct" || current.filled.includes(id) || !current.tray.includes(id)) return;
        playSfx("tap");
        commit({ ...current, selected: id, rot: { ...current.rot, [id]: ((current.rot[id] ?? 0) + 90) % 360 } }, `Okrenut komad: ${getInsetShape(id)?.name.toLowerCase() ?? id}`);
    };

    /** Dodir komada: izbor; na nivoima sa okretanjem drugi dodir izabranog komada ga okreće */
    const tapPiece = (id: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.feedback === "correct" || current.filled.includes(id)) return;
        if (current.rotate && current.selected === id) {
            rotatePiece(id);
            return;
        }
        playSfx("tap");
        commit({ ...current, selected: current.selected === id ? null : id });
    };

    const tapHole = (hole: string) => {
        const selected = viewRef.current.selected;
        if (selected === null) return;
        if (!placePiece(selected, hole) && !calm) {
            setWiggle(selected);
            after(WIGGLE_MS, () => setWiggle(null));
        }
    };

    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.board}:${view.round}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hintPiece !== null) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        const target = current.selected ?? current.tray.find((id) => !current.filled.includes(id));
        if (target) commit({ ...current, hintPiece: target }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct" || current.holes.length === 0) return;
        say(insetIntro(current));
    };

    const drag = useDragSnap({
        enabled: !isMonitor && view.feedback !== "correct",
        calm,
        onDrop: (piece, hole) => (hole === null ? false : placePiece(piece, hole)),
        onTap: tapPiece,
        // Uhvaćen komad postaje izabran: dugme „Okreni” deluje na njega
        onGrab: (piece) => {
            const current = viewRef.current;
            if (current.rotate && current.selected !== piece) commit({ ...current, selected: piece });
        },
    });

    const shown = isMonitor ? mergeInsetMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (shown.holes.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Oblik" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvu tablu" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    // Na ekranu samo kratka činjenica (jedan red i na uskom telefonu); glas kaže i „Probaj ponovo.”
    const wrongText = shown.turnNote ? "Okreni oblik." : MISFIT;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Oblik" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: uputstvo samo glasom (dugme „Ponovi”), da tabla i komadi budu krupni */}
            <GamePrompt key={`prompt-${shown.board}`} className="animate-fade-up [@media(max-height:37.5rem)]:hidden" compact title={insetTitle(shown)} />
            <PlayArea accent={GAME.accent} className="p-2 sm:p-4">
                <InsetPlay
                    key={`board-${shown.board}`}
                    view={shown}
                    drag={drag}
                    calm={calm}
                    wiggle={wiggle}
                    disabled={isMonitor || solved}
                    demo={!isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved}
                    onHole={tapHole}
                    onRotate={rotatePiece}
                />
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={INSET_DONE} wrongText={wrongText} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Tabla i korpa ─────────────────────────────────────────────────────────────


interface PlayProps {
    view: InsetView;
    drag: DragSnap;
    calm: boolean;
    wiggle: string | null;
    disabled: boolean;
    demo: boolean;
    onHole: (hole: string) => void;
    onRotate: (id: string) => void;
}

function InsetPlay({ view, drag, calm, wiggle, disabled, demo, onHole, onRotate }: PlayProps) {
    // Odvojene vrednosti: samo `ghostRef` i `rootRef` su ref-ovi, ostalo je obično stanje prevlačenja
    const { rootRef, ghostRef, active, wobble, over, pieceProps } = drag;
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const [boardPx, setBoardPx] = useState(0);
    const boardEl = useRef<HTMLDivElement | null>(null);
    const size = insetBoardSize(view.holes.length);
    const demoPiece = view.tray[0];
    const glow = view.hintPiece ?? (demo ? demoPiece : null);

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
    const ghostPx = Math.max(52, (boardPx * INSET_HOLE) / size.width);
    const count = view.tray.length;
    const wide = isWideBoard(size.width, size.height);
    const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(3)}%`;
    const selected = view.selected;

    return (
        <div
            ref={setRootRef}
            className={cn("relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 sm:gap-3", !wide && "landscape:flex-row", disabled && "pointer-events-none")}
            // Tabla nije viša nego što joj treba (uspravan ekran, široka tabla), pa tabla i korpa stoje zajedno u sredini
            style={{ containerType: "size", ["--board-max" as string]: `calc(100cqw * ${(size.height / size.width).toFixed(4)})` }}
        >
            <div className={cn("flex min-h-0 w-full min-w-0 flex-1 items-center justify-center self-stretch", wide ? "max-h-[var(--board-max)]" : "portrait:max-h-[var(--board-max)]")} style={{ containerType: "size" }}>
                <div ref={boardEl} className="relative" style={{ width: `min(100cqw, calc(100cqh * ${(size.width / size.height).toFixed(4)}))`, aspectRatio: `${size.width} / ${size.height}` }}>
                    <svg viewBox={`0 0 ${size.width} ${size.height}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Drvena tabla sa rupama">
                        <InsetBoardArt holes={view.holes} filled={view.filled} tint={view.tint} plain={view.plain} glow={glow} over={over} last={view.last} calm={calm} />
                    </svg>
                    {view.holes.map((id, index) => {
                        if (view.filled.includes(id)) return null;
                        const o = holeOrigin(index, view.holes.length);
                        const pad = 6;
                        return (
                            <button
                                key={id}
                                type="button"
                                data-slot={id}
                                data-open=""
                                disabled={disabled || selected === null}
                                onClick={() => onHole(id)}
                                aria-label={`Rupa: ${getInsetShape(id)?.name.toLowerCase() ?? ""}`}
                                className={cn("absolute rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default", HOLE_HIT)}
                                style={{ left: pct(o.x - pad, size.width), top: pct(o.y - pad, size.height), width: pct(INSET_HOLE + pad * 2, size.width), height: pct(INSET_HOLE + pad * 2, size.height) }}
                            />
                        );
                    })}
                </div>
            </div>

            <div className={cn("flex shrink-0 flex-col items-center gap-2", wide && "landscape:flex-row")}>
                <div
                    role="group"
                    aria-label="Komadi"
                    className={cn("grid shrink-0 place-items-center gap-1.5 rounded-card border-2 border-dashed border-line bg-surface/70 p-1.5 sm:gap-2 sm:p-2", trayGrid(count, wide))}
                >
                    {view.tray.map((id) => {
                        const shape = getInsetShape(id);
                        if (!shape) return null;
                        const piece = trayPieceSize(count, wide);
                        if (view.filled.includes(id)) return <span key={id} aria-hidden="true" className={cn("aspect-square rounded-2xl border-2 border-dashed border-line/70", piece)} />;
                        const isSelected = selected === id;
                        const hinted = view.hintPiece === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                data-piece={id}
                                disabled={disabled}
                                aria-pressed={isSelected}
                                aria-label={`${shape.name}${view.rotate && (view.rot[id] ?? 0) !== 0 ? ", okrenut" : ""}`}
                                {...pieceProps(id)}
                                className={cn(
                                    "relative grid aspect-square touch-none select-none place-items-center rounded-2xl border-2 border-b-4 bg-surface p-1 shadow-soft transition-[transform,border-color,opacity] duration-150",
                                    piece,
                                    isSelected ? "-translate-y-1 border-brand-500 bg-brand-50" : hinted ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-300",
                                    hinted && !calm && "animate-soft-pulse",
                                    active === id && "opacity-30",
                                    wiggle === id && "animate-wiggle"
                                )}
                            >
                                <InsetPieceSvg id={id} rot={view.rot[id] ?? 0} plain={view.plain} calm={calm} className="pointer-events-none h-full w-full" />
                            </button>
                        );
                    })}
                </div>
                {view.rotate && (
                    <button
                        type="button"
                        onClick={() => selected && onRotate(selected)}
                        disabled={disabled || selected === null}
                        className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] border-purple-700 bg-purple-500 px-5 font-display [@media(max-height:30rem)]:px-2.5 text-lg font-extrabold text-white transition-[transform,border-width,opacity] active:translate-y-[3px] active:border-b-2 disabled:opacity-40"
                    >
                        <RotateCw className="h-6 w-6" aria-hidden="true" strokeWidth={3} />
                        {/* Položen telefon: samo strelica, da korpa stane u jedan red */}
                        <span className="[@media(max-height:30rem)]:sr-only">Okreni</span>
                    </button>
                )}
            </div>

            {demo && demoPiece && !view.filled.includes(demoPiece) && <DragDemo root={root} from={`[data-piece="${demoPiece}"]`} to={`[data-slot="${demoPiece}"]`} calm={calm} />}

            {/* Komad koji prati prst: iznad celog ekrana igre (z 6000), da ga ništa ne pokrije */}
            {active !== null &&
                typeof document !== "undefined" &&
                createPortal(
                    <div ref={ghostRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[6500] drop-shadow-xl" style={{ width: ghostPx * 1.12, height: ghostPx * 1.12 }}>
                        <div className={cn("h-full w-full", wobble && "animate-wiggle")}>
                            <InsetPieceSvg id={active} rot={view.rot[active] ?? 0} plain={view.plain} className="h-full w-full" />
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
