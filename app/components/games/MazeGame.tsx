"use client";

// Igra „Lavirint”: dete prstom vodi lik (Amar, Lejla, zeka…) kroz vrt sa živom ogradom do
// cilja (kuća, mama, šargarepa). Ograda zaustavlja lik; kad se prst podigne, lik ostaje gde je
// stao. Lik se može voditi i dodirom (ide pravo dok ne naiđe na ogradu) i strelicama. Na lakim
// nivoima isprekidana linija pokazuje put, a prvi put vodi ruka; kasnije linija bledi i nestaje,
// dolaze zvezdice usput, pa ključ i vrata. Nema žurbe ni tajmera. Nivoi: data/mazeLevels.ts.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
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
} from "@/app/components/games/kit";
import { DragDemo } from "@/app/components/games/kit/DragDemo";
import {
    buildMaze,
    buildMazeLevel,
    canStep,
    cellPx,
    cellX,
    cellY,
    closedDoorOf,
    DEAD_END,
    DEAD_END_RETRY,
    directionToward,
    emptyMazeView,
    extendTrail,
    getTrip,
    isEmptyDeadEnd,
    KEY_TAKEN,
    LOCKED,
    mazeDone,
    mazeIntro,
    mazeLevel,
    mazeResult,
    mazeRoundView,
    mazeTitle,
    mergeMazeMonitor,
    neighborIn,
    solveMazeView,
    STARS_LEFT,
    walkToward,
    type MazePlan,
    type MazeView,
} from "@/app/components/games/data/mazeLevels";
import { CELL, GoalIcon, KeyIcon, MazeBoardArt, StarIcon } from "@/app/components/games/maze/MazeArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("maze");
/** Lik mora biti uhvaćen ovoliko blizu (u ćelijama od svoje sredine) da bi ga prst vodio */
const GRAB_CELLS = 1.3;
/** Pomeranje (px) posle kog dodir postaje prevlačenje */
const DRAG_START_PX = 10;
/** Najređe slanje stanja monitoru dok lik ide (ms) */
const SYNC_MS = 300;
const BUMP_MS = 700;
/** Ista rečenica (zaključana vrata, zvezdice) ne ponavlja se češće od ovoga */
const REPEAT_MS = 4000;
/** Razmak oko table u polju za igru (px) — ista vrednost kao `p-1` u MazePlay */
const BOARD_PAD = 8;

type Dir = "N" | "E" | "S" | "W";

export default function MazeGame({ childId, level, gender, childName, onComplete, isMonitor = false, monitorState }: GameProps<MazeView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<MazeView>({ childId, gameId: "maze", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    const rule = mazeLevel(level);
    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde
    const [plan] = useState<MazePlan | null>(() => (isMonitor ? null : buildMazeLevel(level, { maxRounds: settings.preset.maxRounds, childName })));
    // Na lakim nivoima pomoć stiže već posle prvog ćorsokaka i posle čekanja (osim kad je isključena)
    const early = (plan?.earlyHint ?? false) && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Lik prvog lavirinta je u uputstvu odmah (pre nego što se lavirint napravi za ovaj ekran)
    const [view, setView] = useState<MazeView>(() => ({ ...emptyMazeView(plan?.rounds.length ?? 1), ...(plan?.rounds[0] ? { hero: plan.rounds[0].hero, goal: getTrip(plan.rounds[0].hero)?.goal ?? "house" } : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const startedRef = useRef(false);
    const boxRef = useRef<{ w: number; h: number } | null>(null);
    const lastSync = useRef(0);
    const lastSaid = useRef<Record<string, number>>({});
    const [bump, setBump] = useState<{ dir: Dir; key: number } | null>(null);
    const lastBump = useRef(0);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    /** `log` = važan događaj (odmah monitoru); bez njega se kretanje šalje najviše svakih SYNC_MS */
    const commit = useCallback(
        (next: MazeView, log?: string) => {
            viewRef.current = next;
            setView(next);
            const now = Date.now();
            if (log || now - lastSync.current >= SYNC_MS) {
                lastSync.current = now;
                sync.update(next, log);
            }
        },
        [sync]
    );

    /** Kratka rečenica, ali ne ista više puta zaredom (dete koje gura lik u vrata) */
    const sayOnce = (text: string) => {
        const now = Date.now();
        if (now - (lastSaid.current[text] ?? 0) < REPEAT_MS) return;
        lastSaid.current[text] = now;
        say(text, undefined, "gentle");
    };

    const modeledRound = (current: MazeView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(mazeResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan?.rounds[index];
        if (!round || finishedRef.current) return;
        const box = boxRef.current;
        const maze = buildMaze(rule, index, round.seed, box ? { width: box.w - BOARD_PAD, height: box.h - BOARD_PAD } : {});
        guard.hold();
        const current = viewRef.current;
        const next: MazeView = { ...current, ...mazeRoundView(maze, round, index, rule.guide), round: index + 1 };
        commit(next, `Lavirint ${index + 1}: ${maze.cols} × ${maze.rows}, ${mazeTitle(round.hero)}`);
        if (!startedRef.current) {
            startedRef.current = true;
            sync.start(next);
        }
        say(mazeIntro(round.hero, maze));
    };

    /** Polje za igru je izmereno: prvi lavirint se pravi tek tad, da stane na ekran */
    const onBox = (w: number, h: number) => {
        boxRef.current = { w, h };
        if (!isMonitor && !startedRef.current && !finishedRef.current && viewRef.current.maze === null) startRound(0);
    };

    // Bez merenja (stari pregledač) prvi lavirint ipak kreće, u zadatoj veličini
    useEffect(() => {
        if (isMonitor) return;
        const id = window.setTimeout(() => {
            if (!startedRef.current) startRound(0);
        }, 600);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMonitor]);

    const solved = () => {
        const current = viewRef.current;
        const { next, firstTry, modeled } = solveMazeView(current, level, { feedback: "correct", hint: false });
        const how = modeled ? "(pokazni lavirint)" : firstTry ? "samostalno" : "uz pomoć";
        commit(next, `Stigao do cilja ${how}`);
        playSfx("correct");
        guard.hold();
        const last = current.index >= (plan?.rounds.length ?? 1) - 1;
        sayThen(praise(mazeDone(current.hero), firstTry), last ? finish : () => startRound(current.index + 1), { min: 1800, emotion: "happy" });
    };

    /** Lik prelazi ćeliju po ćeliju; vraća stanje posle svih koraka i poruke za glas i monitor */
    const applySteps = (start: MazeView, steps: number[]) => {
        let current = start;
        const logs: string[] = [];
        let speech: string | null = null;
        let arrived = false;
        const maze = current.maze!;
        for (const cell of steps) {
            const from = current.pos;
            const throughDoor = maze.door !== null && ((maze.door[0] === from && maze.door[1] === cell) || (maze.door[1] === from && maze.door[0] === cell));
            current = { ...current, pos: cell, trail: extendTrail(current.trail, cell), doorOpen: current.doorOpen || throughDoor };
            if (throughDoor && !start.doorOpen) logs.push("Prošao kroz vrata");
            if (maze.stars.includes(cell) && !current.starsGot.includes(cell)) {
                current = { ...current, starsGot: [...current.starsGot, cell] };
                playSfx("flip");
                logs.push(`Zvezdica ${current.starsGot.length} od ${maze.stars.length}`);
            }
            if (maze.key === cell && !current.hasKey) {
                current = { ...current, hasKey: true };
                playSfx("flip");
                speech = KEY_TAKEN;
                logs.push("Uzeo ključ");
            }
            if (isEmptyDeadEnd(maze, cell) && !current.deadVisited.includes(cell)) {
                const deadVisited = [...current.deadVisited, cell];
                const hint = current.hint || (!modeledRound(current) && hintDue(hintAfter, deadVisited.length, deadVisited.length));
                current = { ...current, deadVisited, incorrectCount: current.incorrectCount + 1, hint, helped: current.helped || hint };
                speech = hint && !start.hint ? DEAD_END : DEAD_END_RETRY;
                logs.push(hint && !start.hint ? "Ćorsokak — pomoć: linija do cilja" : "Ćorsokak");
            }
            if (cell === maze.goal) {
                if (current.starsGot.length < maze.stars.length) {
                    speech = STARS_LEFT;
                    logs.push("Na cilju, ali nisu sve zvezdice");
                } else {
                    arrived = true;
                    break;
                }
            }
        }
        return { next: current, logs, speech, arrived };
    };

    const showBump = (dir: Dir, locked: boolean) => {
        const now = Date.now();
        if (now - lastBump.current < BUMP_MS) return;
        lastBump.current = now;
        setBump((previous) => ({ dir, key: (previous?.key ?? 0) + 1 }));
        if (locked) sayOnce(LOCKED);
    };

    /** Prst (ili dodir) je na tački (x, y) table, u ćelijama: lik ide ka njemu koliko može */
    const walk = (x: number, y: number) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        const maze = current.maze;
        if (!maze || current.feedback === "correct" || guard.blocked()) return;
        const door = closedDoorOf(current);
        const steps = walkToward(maze, current.pos, x, y, door);
        if (steps.length === 0) {
            const dir = directionToward(maze, current.pos, x, y);
            if (dir) {
                const next = neighborIn(maze, current.pos, dir);
                const locked = next !== null && door !== null && !canStep(maze, current.pos, next, door) && canStep(maze, current.pos, next);
                showBump(dir, locked);
            }
            return;
        }
        const { next, logs, speech, arrived } = applySteps(current, steps);
        commit(next, logs.length > 0 ? logs.join(", ") : undefined);
        if (arrived) {
            solved();
            return;
        }
        if (speech === STARS_LEFT) sayOnce(speech);
        else if (speech) say(speech, undefined, "gentle");
    };

    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.index}:${view.maze ? 1 : 0}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || !current.maze || current.feedback || current.hint) return;
        if (modeledRound(current) && current.trail.length <= 1) return; // tu pokazuje ruka
        commit({ ...current, hint: true, helped: true }, "Pomoć posle čekanja: linija do cilja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct" || !current.maze) return;
        say(mazeIntro(current.hero, current.maze));
    };

    const shown = isMonitor ? mergeMazeMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const maze = shown.maze;
    const stars = maze?.stars.length ?? 0;

    const counters =
        maze && (stars > 0 || maze.key !== null) ? (
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-sun-50 px-2 py-1.5 ring-1 ring-sun-200" aria-label={stars > 0 ? `Zvezdice: ${shown.starsGot.length} od ${stars}` : shown.hasKey ? "Ključ je uzet" : "Ključ još nije uzet"}>
                {Array.from({ length: stars }, (_, i) => (
                    <StarIcon key={i} filled={i < shown.starsGot.length} className={cn("h-6 w-6 sm:h-7 sm:w-7", i === shown.starsGot.length - 1 && !calm && "animate-pop")} />
                ))}
                {maze.key !== null && <KeyIcon className={cn("h-6 w-9 transition-opacity sm:h-7 sm:w-10", shown.hasKey ? "opacity-100" : "opacity-30 grayscale")} />}
            </div>
        ) : undefined;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Lavirint" score={score} extra={counters} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: uputstvo samo glasom (dugme „Ponovi”), da lavirint bude krupan; pravi lavirinti (ne hodnici) ga i na
                laptopu i telefonu prepuštaju glasu i tabli, gde se lik i cilj ionako vide */}
            {(maze || !isMonitor) && (
                <GamePrompt
                    key={`prompt-${shown.index}`}
                    className={cn("animate-fade-up [@media(max-height:37.5rem)]:hidden", rule.size && "short:hidden")}
                    compact
                    title={mazeTitle(shown.hero)}
                    visual={<GoalIcon goal={shown.goal} className="h-full w-full p-1" />}
                />
            )}
            <PlayArea accent={GAME.accent} className="p-1.5 sm:p-3">
                <MazePlay
                    view={shown}
                    calm={calm}
                    bump={bump}
                    disabled={isMonitor || shown.feedback === "correct"}
                    demo={!isMonitor && modeledRound(shown) && shown.trail.length <= 1 && shown.feedback === null}
                    onBox={onBox}
                    onWalk={walk}
                />
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={mazeDone(shown.hero)} className="-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0" />
        </GameStage>
    );
}

// ── Tabla ─────────────────────────────────────────────────────────────────────

interface PlayProps {
    view: MazeView;
    calm: boolean;
    bump: { dir: Dir; key: number } | null;
    disabled: boolean;
    demo: boolean;
    onBox: (w: number, h: number) => void;
    onWalk: (x: number, y: number) => void;
}

interface Touch {
    pointerId: number;
    startX: number;
    startY: number;
    /** Prst je uhvatio lik (vodi ga), a ne samo dodirnuo tablu */
    grab: boolean;
    moved: boolean;
    /** Lavirint u kome je prst spušten: u sledećem lavirintu isti prst više ne vodi lik */
    index: number;
}

function MazePlay({ view, calm, bump, disabled, demo, onBox, onWalk }: PlayProps) {
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const [box, setBox] = useState({ w: 0, h: 0 });
    const boardRef = useRef<HTMLDivElement | null>(null);
    const touch = useRef<Touch | null>(null);
    const [held, setHeld] = useState(false);
    const onBoxRef = useRef(onBox);
    useEffect(() => {
        onBoxRef.current = onBox;
    });

    useEffect(() => {
        if (!root || typeof ResizeObserver === "undefined") return;
        const measure = () => {
            const rect = root.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;
            setBox((previous) => (Math.abs(previous.w - rect.width) < 1 && Math.abs(previous.h - rect.height) < 1 ? previous : { w: rect.width, h: rect.height }));
            onBoxRef.current(rect.width, rect.height);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(root);
        return () => observer.disconnect();
    }, [root]);

    const maze = view.maze;

    /** Tačka ekrana → položaj na tabli u ćelijama */
    const toCells = (clientX: number, clientY: number) => {
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect || !maze || rect.width === 0) return null;
        const x = ((clientX - rect.left) / rect.width) * maze.cols;
        const y = ((clientY - rect.top) / rect.height) * maze.rows;
        return { x: Math.min(Math.max(x, 0), maze.cols - 0.001), y: Math.min(Math.max(y, 0), maze.rows - 0.001) };
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled || !maze || touch.current || (event.pointerType === "mouse" && event.button !== 0)) return;
        const point = toCells(event.clientX, event.clientY);
        if (!point) return;
        try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
            /* bez hvatanja */
        }
        const near = Math.hypot(point.x - (cellX(maze, view.pos) + 0.5), point.y - (cellY(maze, view.pos) + 0.5)) <= GRAB_CELLS;
        touch.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, grab: near, moved: false, index: view.index };
        if (near) setHeld(true);
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        const current = touch.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (disabled || current.index !== view.index) {
            touch.current = null;
            return;
        }
        if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >= DRAG_START_PX) current.moved = true;
        if (!current.grab || !current.moved) return;
        const point = toCells(event.clientX, event.clientY);
        if (point) onWalk(point.x, point.y);
    };

    const release = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
        const current = touch.current;
        setHeld(false);
        if (!current || current.pointerId !== event.pointerId) return;
        touch.current = null;
        // Dodir bez prevlačenja: lik ide ka tom mestu (pravo, dok ga ograda ne zaustavi)
        if (!cancelled && !current.moved && !disabled && current.index === view.index) {
            const point = toCells(event.clientX, event.clientY);
            if (point) onWalk(point.x, point.y);
        }
    };

    /** Strelice na tastaturi: korak po korak */
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (disabled || !maze) return;
        const dirs: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0] };
        const d = dirs[event.key];
        if (!d) return;
        event.preventDefault();
        onWalk(cellX(maze, view.pos) + 0.5 + d[0], cellY(maze, view.pos) + 0.5 + d[1]);
    };

    // Tabla je što veća, ali ćelija nije veća od MAX_CELL_PX (širok ekran, mali lavirint)
    const size = maze ? cellPx(maze, box.w - BOARD_PAD, box.h - BOARD_PAD) : 0;

    return (
        // Tabla stoji preko polja (apsolutno): veličinu polja određuje raspored, a ne tabla, pa se mere ne vrte u krug
        <div ref={setRoot} className="relative min-h-0 w-full flex-1 self-stretch">
            <div className="absolute inset-0 flex items-center justify-center p-1">
                {maze && size > 0 && (
                    <div
                        ref={boardRef}
                        role="application"
                        tabIndex={disabled ? -1 : 0}
                        aria-label={`Lavirint ${maze.cols} × ${maze.rows}. Strelice pomeraju lik.`}
                        // Zajednička tabla (lib/sharedPlay.ts): dodir drugog deteta stiže kao tačka na tabli
                        data-action-point="lavirint"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={(event) => release(event, false)}
                        onPointerCancel={(event) => release(event, true)}
                        onKeyDown={onKeyDown}
                        className={cn("relative touch-none select-none rounded-[1.4rem] shadow-soft outline-none ring-4 ring-white/80 focus-visible:ring-brand-400", disabled ? "cursor-default" : held ? "cursor-grabbing" : "cursor-grab")}
                        style={{ width: size * maze.cols, height: size * maze.rows }}
                    >
                        <svg viewBox={`0 0 ${maze.cols * CELL} ${maze.rows * CELL}`} className="block h-full w-full" aria-hidden="true">
                            <MazeBoardArt view={view} calm={calm} bump={bump} held={held && !disabled} />
                        </svg>
                    </div>
                )}
            </div>
            {demo && maze && <DragDemo root={root} from={`[data-maze="hero"]`} to={`[data-maze="goal"]`} calm={calm} />}
        </div>
    );
}
