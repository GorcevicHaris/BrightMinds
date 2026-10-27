"use client";

// Igra „Vodi robota”: na tabli stoji Robotić, a negde dalje cilj (baterija, cvet, raketa,
// blago). Dete PRVO složi program od strelica (gore, dole, levo, desno — prema tabli), pa tek
// onda pusti Robotića („Kreni”) da ga izvede korak po korak. Ispred prepreke ili ivice Robotić
// mirno stane, a glas kaže zašto („Robotić je stao: ispred je kamen.”); program ostaje, pa dete
// popravi samo ono što treba. Kasnije: zvezde usput, ispravljanje jedne pogrešne strelice i
// petlja „Ponovi N puta”. Nema žurbe ni tajmera. Nivoi: data/codingLevels.ts, crteži: coding/.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Delete, Play, Trash2 } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    DemoHand,
    demoRounds,
    Feedback,
    FEEDBACK_MIN_MS,
    GameHud,
    GamePrompt,
    GameStage,
    hintDue,
    PlayArea,
    playSfx,
    useGameRandom,
    useGameSync,
    useInputGuard,
    usePraise,
    useSayThen,
    useTimers,
    useWaitHint,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import {
    addCmd,
    boardOf,
    buildCodingLevel,
    canRun,
    cellX,
    cellY,
    chipOf,
    clearCmds,
    CMD_WORDS,
    codingLevel,
    codingQuestion,
    codingResult,
    codingTitle,
    codingRoundView,
    doneSentence,
    emptyCodingView,
    hintSentence,
    hintTarget,
    mergeCodingMonitor,
    mistakeSentence,
    nextZone,
    OBSTACLE_NAMES,
    programOf,
    resetRun,
    selectFix,
    selectZone,
    simulate,
    solveCodingView,
    THEMES,
    timesWord,
    undoCmd,
    type Cmd,
    type CodingRound,
    type CodingView,
    type HintTarget,
    type Simulation,
    type Zone,
} from "@/app/components/games/data/codingLevels";
import {
    ArrowGlyph,
    BOARD_PAD,
    CELL,
    CodingStyles,
    GoalArt,
    GoalIcon,
    LoopGlyph,
    ObstacleArt,
    RobotFigure,
    Sparkles,
    StarArt,
    StarIcon,
    StartPad,
    THEME_LOOK,
    Tiles,
} from "@/app/components/games/coding/CodingArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("coding");
/** Jedan korak Robotića (mirno); uz „Manje animacija” kraći, bez klizanja */
const STEP_MS = 680;
const CALM_STEP_MS = 420;
/** Kratak predah pre prvog koraka (dete vidi da je program krenuo) */
const START_MS = 380;
/** Koliko dugo stoji poruka posle neuspelog izvođenja */
const NOTE_MS = 4500;
/** Ples na cilju pre sledećeg zadatka */
const DANCE_MS = 2600;
/** Nizak ekran: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

const ARROW_LABEL: Record<Cmd, string> = { up: "Strelica gore", right: "Strelica desno", down: "Strelica dole", left: "Strelica levo" };

export default function CodingGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<CodingView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<CodingView>({ childId, gameId: "coding", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Na lakim nivoima pomoć stiže već posle prve greške i posle čekanja (osim kad je isključena)
    const rule = codingLevel(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<CodingRound[]>(() =>
        isMonitor ? [] : buildCodingLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })
    );
    const [view, setView] = useState<CodingView>(() => ({ ...emptyCodingView(plan.length), ...(plan[0] ? codingRoundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const runRef = useRef<{ sim: Simulation; program: Cmd[]; timer: TimerId | null } | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: CodingView, log?: string) => {
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
        if (viewRef.current.arrows.length > 0) say(codingQuestion(viewRef.current));
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: CodingView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(codingResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: CodingView = { ...viewRef.current, ...codingRoundView(round), round: index + 1 };
        const question = codingQuestion(next);
        commit(next, `Zadatak ${index + 1} (${THEMES[next.theme].place}): ${question}`);
        say(question);
    };

    /** Izmena programa: posle izvođenja Robotić se prvo vrati na start */
    const edit = (patch: Partial<CodingView> | null, log?: string) => {
        const current = viewRef.current;
        if (isMonitor || finishedRef.current || current.running || current.feedback === "correct" || guard.blocked() || !patch) return;
        playSfx("tap");
        commit({ ...current, ...resetRun(current.start), ...patch }, log);
    };

    const onCmd = (cmd: Cmd) => edit(addCmd(viewRef.current, cmd), `Strelica: ${CMD_WORDS[cmd]}`);
    const onUndo = () => edit(undoCmd(viewRef.current));
    const onClear = () => edit(clearCmds(viewRef.current), "Program obrisan");
    const onFix = (index: number) => edit(selectFix(viewRef.current, index));
    const onZone = (zone: Zone) => edit(selectZone(viewRef.current, zone));

    /** Robotić je stigao: poeni, pohvala, ples, pa sledeći zadatak */
    const succeed = () => {
        const current = viewRef.current;
        const { next, firstTry, modeled } = solveCodingView(current, level, { running: false, feedback: "correct", mistake: null, step: -1 });
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Stigao ${how}: ${programOf(current).map((cmd) => CMD_WORDS[cmd]).join(", ")}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(doneSentence(current), firstTry), isLast ? finish : () => startRound(current.round), {
            min: calm ? FEEDBACK_MIN_MS + 600 : DANCE_MS,
            max: calm ? undefined : DANCE_MS + 2200,
            emotion: "happy",
        });
    };

    /** Robotić nije stigao: mirna činjenica, program ostaje */
    const fail = (sim: Simulation, program: Cmd[]) => {
        const current = viewRef.current;
        // Ispravljanje: dete sme da pogleda kako ide nepromenjen (pogrešan) program — to nije promašaj
        const watching = current.kind === "debug" && current.pre.join() === current.program.join();
        const misses = current.misses + (watching ? 0 : 1);
        const hint = current.hint || (!watching && hintDue(hintAfter, misses, 99));
        const outcome = sim.outcome === "goal" ? "short" : sim.outcome;
        const mistake = { outcome, obstacle: sim.obstacle, missing: current.stars.length - sim.got.length };
        const blocked = outcome === "edge" || outcome === "blocked";
        const next: CodingView = {
            ...current,
            running: false,
            step: -1,
            failAt: blocked ? sim.at : null,
            bump: blocked ? program[sim.at] : null,
            bumpKey: current.bumpKey + (blocked ? 1 : 0),
            mistake,
            feedback: "wrong",
            misses,
            hint,
            incorrectCount: current.incorrectCount + (watching ? 0 : 1),
        };
        const text = mistakeSentence(mistake, current.theme);
        commit(next, `${watching ? "Pogledao pogrešan program" : "Nije stigao"}: ${text}`);
        playSfx("wrong");
        const tip = hint && !current.hint ? hintSentence(next) : "";
        say(`${text}${tip ? ` ${tip}` : ""}`, undefined, "gentle");
        // Poruka se posle nekoliko sekundi skloni (izgovorena je, a strelica na kojoj je stao ostaje
        // označena) — na niskom ekranu lebdi preko polja i ne sme dugo da pokriva dugmad
        after(NOTE_MS, () => {
            const later = viewRef.current;
            if (later.feedback === "wrong" && later.runs === next.runs) commit({ ...later, feedback: null });
        });
    };

    /** Korak izvođenja: `i` je redni broj koraka u razvijenom programu */
    const tick = (i: number) => {
        const run = runRef.current;
        const current = viewRef.current;
        if (!run || !current.running) return;
        const { sim, program } = run;
        const moves = sim.cells.length - 1;
        if (i < moves) {
            const cell = sim.cells[i + 1];
            const star = current.stars.indexOf(cell);
            const got = star >= 0 && !current.got.includes(star) ? [...current.got, star] : current.got;
            if (got !== current.got) playSfx("flip");
            commit({ ...current, robot: cell, facing: program[i], step: i, trail: sim.cells.slice(0, i + 2), got });
            const done = sim.outcome === "goal" && i === sim.at;
            run.timer = after(calm ? CALM_STEP_MS : STEP_MS, done ? succeed : () => tick(i + 1));
            return;
        }
        // Prepreka ili ivica: korak koji nije mogao — Robotić blago udari i stane
        if (sim.outcome === "edge" || sim.outcome === "blocked") commit({ ...current, facing: program[sim.at], step: sim.at });
        run.timer = after(calm ? 200 : 260, () => fail(sim, program));
    };

    const onRun = () => {
        const current = viewRef.current;
        if (isMonitor || finishedRef.current || guard.blocked() || !canRun(current)) return;
        const program = programOf(current);
        const sim = simulate(boardOf(current), program);
        cancel(runRef.current?.timer ?? null);
        runRef.current = { sim, program, timer: null };
        playSfx("tap");
        commit(
            { ...current, ...resetRun(current.start), running: true, runs: current.runs + 1, fixAt: null },
            `Kreni: ${program.map((cmd) => CMD_WORDS[cmd]).join(", ")}`
        );
        runRef.current.timer = after(START_MS, () => tick(0));
    };

    // Pomoć posle čekanja: sledeća prava strelica i sledeće polje blago zasvetle
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.pre.join()}:${view.body.join()}:${view.runs}:${view.fixAt}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.running || current.feedback === "correct" || current.hint) return;
        if (modeledRound(current) && current.misses === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct" || current.arrows.length === 0) return;
        say(codingQuestion(current));
    };

    const shown = isMonitor ? mergeCodingMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (shown.arrows.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = solved ? doneSentence(shown) : shown.mistake ? mistakeSentence(shown.mistake, shown.theme) : "";
    const demo = !isMonitor && modeledRound(shown) && shown.misses === 0 && !solved && !shown.running;
    const target = (shown.hint || demo) && !solved && !shown.running ? hintTarget(shown) : null;
    const stars = shown.stars.length;

    const counters =
        stars > 0 ? (
            <div className="hidden shrink-0 items-center gap-0.5 rounded-xl bg-sun-50 px-2 py-1.5 ring-1 ring-sun-200 sm:flex" aria-label={`Zvezde: ${shown.got.length} od ${stars}`}>
                {shown.stars.map((_, i) => (
                    <StarIcon key={i} filled={i < shown.got.length} className={cn("h-6 w-6 sm:h-7 sm:w-7", i === shown.got.length - 1 && !calm && "animate-pop")} />
                ))}
            </div>
        ) : undefined;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} extra={counters} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: pitanje samo glasom (dugme „Ponovi”), da tabla i dugmad budu krupni */}
            <GamePrompt
                key={`prompt-${shown.round}`}
                className="animate-fade-up [@media(max-height:37.5rem)]:hidden"
                compact
                title={codingTitle(shown)}
                visual={<GoalIcon theme={shown.theme} className="h-full w-full p-1.5" />}
            />
            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-3">
                <CodingBoard
                    key={`board-${shown.round}`}
                    view={shown}
                    calm={calm}
                    target={target}
                    demo={demo}
                    disabled={isMonitor || solved}
                    onCmd={onCmd}
                    onUndo={onUndo}
                    onClear={onClear}
                    onRun={onRun}
                    onFix={onFix}
                    onZone={onZone}
                />
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Tabla, program i dugmad ───────────────────────────────────────────────────

interface BoardProps {
    view: CodingView;
    calm: boolean;
    target: HintTarget | null;
    demo: boolean;
    disabled: boolean;
    onCmd: (cmd: Cmd) => void;
    onUndo: () => void;
    onClear: () => void;
    onRun: () => void;
    onFix: (index: number) => void;
    onZone: (zone: Zone) => void;
}

/**
 * Raspored bira igra prema veličini polja za igru i obliku table — onaj u kome su polja table
 * veća: „uspravan” (tabla gore, ispod krst strelica, a pored njega program i „Obriši”/„Očisti”)
 * ili „položen” (tabla levo, program i krst desno). Dugmad su najmanje 48 px (container query),
 * a tabla dobija sav ostali prostor, pa sve stane bez skrolovanja.
 */
const LAYOUT_CSS = `
.cr-root { container-type: size; }
.cr-layout { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%; height: 100%;
  --key: clamp(3rem, min(14cqw, 10.5cqh), 5rem); --col: calc(100cqw - var(--key) * 3 - 1.5rem); }
.cr-board { position: relative; display: flex; align-items: center; justify-content: center; flex: 1 1 0%; min-height: 0; width: 100%; }
.cr-controls { display: grid; flex-shrink: 0; width: 100%; gap: 0.5rem; align-items: center;
  grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "pad strip" "pad tools"; }
.cr-strip { grid-area: strip; align-self: end; }
.cr-pad { grid-area: pad; }
.cr-tools { grid-area: tools; align-self: start; display: flex; justify-content: center; gap: 0.5rem; }
.cr-undo { grid-area: undo; }
/* Uska kolona pored krsta: kod petlje glava Robotića ne staje u isti red sa okvirom, pa se ne crta */
.cr-root:not([data-wide="true"]) .cr-loop-head { display: none; }
.cr-clear { grid-area: clear; }
.cr-root[data-wide="true"] .cr-layout { flex-direction: row; gap: 0.75rem;
  --col: max(46cqw, 17rem); --key: clamp(3rem, min(calc((var(--col) - 2.5rem) / 5), 17cqh), 5.5rem); }
.cr-root[data-wide="true"] .cr-board { height: 100%; min-width: 0; }
.cr-root[data-wide="true"] .cr-controls { width: var(--col); height: 100%; align-content: center; justify-content: center; row-gap: 0.75rem;
  grid-template-columns: auto auto auto; grid-template-areas: "strip strip strip" "undo pad clear"; }
.cr-root[data-wide="true"] .cr-strip { align-self: center; }
.cr-root[data-wide="true"] .cr-tools { display: contents; }
`;

const REM = 16;

/** Položen raspored (tabla levo) daje veća polja table nego uspravan? Iste formule kao LAYOUT_CSS. */
function wideLayout(width: number, height: number, cols: number, rows: number): boolean {
    if (width <= 0 || height <= 0) return width > height;
    const across = cols + 0.3;
    const down = rows + 0.3;
    const keyTall = Math.min(5 * REM, Math.max(3 * REM, Math.min(0.14 * width, 0.105 * height)));
    const tall = Math.min(width / across, (height - 3 * keyTall - 2 * 0.375 * REM - 0.5 * REM) / down);
    const side = Math.max(0.46 * width, 17 * REM);
    const keyWide = Math.min(5.5 * REM, Math.max(3 * REM, Math.min((side - 2.5 * REM) / 5, 0.17 * height)));
    // Položen raspored traži visinu za traku programa i krst (širinu dobija: kolona je bar 17rem)
    if (3 * keyWide + 4.5 * REM > height) return false;
    const wide = Math.min((width - side - 0.75 * REM) / across, height / down);
    return wide > tall;
}

function CodingBoard(props: BoardProps) {
    const { view } = props;
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [wide, setWide] = useState<boolean | null>(null);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const measure = () => {
            const rect = root.getBoundingClientRect();
            if (rect.width < 1 || rect.height < 1) return;
            const next = wideLayout(rect.width, rect.height, view.cols, view.rows);
            setWide((previous) => (previous === next ? previous : next));
        };
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(root);
        return () => observer.disconnect();
    }, [view.cols, view.rows]);

    return (
        <div ref={rootRef} data-wide={wide === true ? "true" : "false"} className={cn("cr-root relative flex min-h-0 w-full flex-1 self-stretch", wide === null && "invisible")}>
            <style>{LAYOUT_CSS}</style>
            <CodingStyles />
            <div className="cr-layout">
                <div className="cr-board">
                    <BoardArt view={view} calm={props.calm} hintCell={props.target?.cell ?? null} />
                </div>
                <div className="cr-controls">
                    <ProgramStrip {...props} />
                    <ControlPad {...props} />
                </div>
            </div>
        </div>
    );
}

// ── Tabla ─────────────────────────────────────────────────────────────────────

function BoardArt({ view, calm, hintCell }: { view: CodingView; calm: boolean; hintCell: number | null }) {
    const { cols, rows, theme } = view;
    const look = THEME_LOOK[theme];
    const board = boardOf(view);
    const solved = view.feedback === "correct";
    const at = (cell: number) => ({ x: cellX(board, cell) * CELL, y: cellY(board, cell) * CELL });
    // Bledi tragovi plana (lake table): kuda će Robotić proći, dok se program slaže
    const planned = view.preview && !view.running && view.feedback === null && view.trail.length === 0 ? simulate(board, programOf(view)).cells : [];
    const robot = at(view.robot);
    const mood = solved ? "happy" : view.bump && view.mistake ? "oops" : "idle";
    const center = (cell: number) => ({ x: at(cell).x + CELL / 2, y: at(cell).y + CELL / 2 });
    const goalName = THEMES[theme].goal;
    const label = `Tabla ${cols} × ${rows}. Cilj: ${goalName}.${view.obstacles.length ? ` Prepreke: ${view.obstacles.map((o) => OBSTACLE_NAMES[o.kind]).join(", ")}.` : ""}${view.stars.length ? ` Zvezde: ${view.stars.length}.` : ""}`;

    return (
        <svg
            viewBox={`${-BOARD_PAD - 3} ${-BOARD_PAD - 3} ${cols * CELL + BOARD_PAD * 2 + 6} ${rows * CELL + BOARD_PAD * 2 + 6}`}
            className="h-full w-full drop-shadow-sm"
            role="img"
            aria-label={label}
        >
            <Tiles theme={theme} cols={cols} rows={rows} />
            <g transform={`translate(${at(view.start).x} ${at(view.start).y})`}>
                <StartPad theme={theme} />
            </g>
            {/* Plan (bledo) */}
            {planned.length > 1 && (
                <g opacity={0.55}>
                    <polyline
                        points={planned.map((cell) => `${center(cell).x},${center(cell).y}`).join(" ")}
                        fill="none"
                        stroke={look.plan}
                        strokeWidth={6}
                        strokeDasharray="2 14"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    {planned.slice(1).map((cell, i) => (
                        <circle key={`${cell}-${i}`} cx={center(cell).x} cy={center(cell).y} r={10} fill={look.plan} opacity={0.5} />
                    ))}
                </g>
            )}
            {/* Tragovi točkića */}
            {view.trail.slice(1).map((cell, i) => {
                const a = center(view.trail[i]);
                const b = center(cell);
                const vertical = a.x === b.x;
                const dx = vertical ? 11 : 0;
                const dy = vertical ? 0 : 11;
                return (
                    <g key={`${cell}-${i}`} stroke={look.track} strokeWidth={6} strokeLinecap="round" strokeDasharray="7 9" opacity={0.5}>
                        <line x1={a.x - dx} y1={a.y - dy} x2={b.x - dx} y2={b.y - dy} />
                        <line x1={a.x + dx} y1={a.y + dy} x2={b.x + dx} y2={b.y + dy} />
                    </g>
                );
            })}
            {/* Pomoć: sledeće polje */}
            {hintCell !== null && hintCell >= 0 && hintCell < cols * rows && (
                <rect
                    x={at(hintCell).x + 7}
                    y={at(hintCell).y + 7}
                    width={CELL - 14}
                    height={CELL - 14}
                    rx={18}
                    fill="#ffe27a"
                    fillOpacity={0.4}
                    stroke="#f2b705"
                    strokeWidth={5}
                    className={calm ? undefined : "cr-glow"}
                />
            )}
            {view.obstacles.map((o) => (
                <g key={`o-${o.cell}`} transform={`translate(${at(o.cell).x} ${at(o.cell).y})`}>
                    <ObstacleArt kind={o.kind} theme={theme} />
                </g>
            ))}
            {view.stars.map((cell, i) => {
                const got = view.got.includes(i);
                return (
                    <g key={`s-${cell}`} transform={`translate(${at(cell).x} ${at(cell).y})`}>
                        <g
                            style={{ opacity: got ? 0 : 1, transform: got ? "scale(0.3)" : "scale(1)", transformOrigin: "50px 50px", transition: calm ? undefined : "opacity 320ms ease-out, transform 320ms ease-out" }}
                        >
                            <g transform="translate(14 14) scale(0.72)">
                                <StarArt />
                            </g>
                        </g>
                    </g>
                );
            })}
            <g transform={`translate(${at(view.goal).x} ${at(view.goal).y})`}>
                <g transform="translate(9 6) scale(0.82)">
                    <GoalArt theme={theme} />
                </g>
                {solved && <Sparkles calm={calm} />}
            </g>
            {/* Robotić: klizi sa polja na polje (uz „Manje animacija” kratak korak bez ublažavanja) */}
            <g
                style={{
                    transform: `translate(${robot.x}px, ${robot.y}px)`,
                    transition: `transform ${calm ? 140 : 480}ms ${calm ? "linear" : "ease-in-out"}`,
                }}
            >
                <g key={`${view.bumpKey}-${solved}`} className={view.bump && view.feedback === "wrong" && !calm ? `cr-bump-${view.bump}` : solved && !calm ? "cr-dance" : undefined}>
                    <g transform="translate(4 2) scale(0.92)">
                        <RobotFigure facing={view.facing} mood={mood} calm={calm} />
                    </g>
                    {/* Stigao: cilj je kod njega (mala sličica iznad ramena), a ne sakriven iza njega */}
                    {solved && view.robot === view.goal && (
                        <g transform="translate(58 -6) scale(0.46)">
                            <circle cx={50} cy={50} r={50} fill="#ffffff" opacity={0.9} />
                            <GoalArt theme={theme} />
                        </g>
                    )}
                </g>
            </g>
        </svg>
    );
}

// ── Traka programa ────────────────────────────────────────────────────────────

type ChipState = "idle" | "current" | "done" | "fail" | "selected" | "hint";

const CHIP_STATES: Record<ChipState, string> = {
    idle: "border-azure-700 bg-azure-500 text-white",
    current: "z-10 scale-110 border-sun-600 bg-sun-400 text-white",
    done: "border-azure-700 bg-azure-500 text-white opacity-55",
    // Tu je Robotić stao: topla boja, bez sjaja (sjaj je samo za pomoć)
    fail: "border-sun-600 bg-sun-100 text-sun-700 outline-dashed outline-2 outline-offset-2 outline-sun-500",
    selected: "-translate-y-1 border-brand-700 bg-brand-500 text-white ring-4 ring-brand-200",
    hint: "animate-soft-pulse border-azure-700 bg-azure-500 text-white ring-4 ring-sun-300",
};

const CHIP = "relative grid aspect-square w-[var(--chip)] shrink-0 place-items-center rounded-[28%] border-2 border-b-4 transition-[transform,background-color,opacity] duration-200";

function Chip({ cmd, state, label, action, disabled, onClick, demo, step }: { cmd: Cmd; state: ChipState; label: string; action?: string; disabled?: boolean; onClick?: () => void; demo?: boolean; step?: number }) {
    // Redni broj koraka (kad traka pređe u drugi red, redosled ostaje jasan; i brojanje koraka)
    const glyph = (
        <>
            <ArrowGlyph dir={cmd} className="pointer-events-none h-[62%] w-[62%]" />
            {step !== undefined && (
                <span aria-hidden="true" className="pointer-events-none absolute -left-1.5 -top-1.5 grid h-[1.05rem] min-w-[1.05rem] place-items-center rounded-full bg-white px-0.5 text-[0.62rem] font-black leading-none text-azure-700 shadow-sm ring-1 ring-azure-200">
                    {step}
                </span>
            )}
        </>
    );
    if (action) {
        return (
            <button type="button" data-action={action} disabled={disabled} onClick={onClick} aria-label={label} aria-pressed={state === "selected"} className={cn(CHIP, CHIP_STATES[state], "disabled:cursor-default enabled:active:translate-y-[2px]")}>
                {glyph}
                {demo && <DemoHand className="-bottom-5 -right-5 sm:-bottom-5 sm:-right-5" />}
            </button>
        );
    }
    return (
        <span role="img" aria-label={label} className={cn(CHIP, CHIP_STATES[state])}>
            {glyph}
        </span>
    );
}

function EmptySlot({ active, plus }: { active: boolean; plus?: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "grid aspect-square w-[var(--chip)] shrink-0 place-items-center rounded-[28%] border-2 border-dashed text-lg font-black",
                active ? "border-azure-400 bg-azure-50 text-azure-400" : "border-azure-200 bg-white/60 text-azure-200"
            )}
        >
            {plus ? "+" : null}
        </span>
    );
}

/** Mala glava Robotića na početku trake: ovo je njegov program */
function RobotHead({ className }: { className?: string }) {
    return (
        <svg viewBox="16 6 68 80" className={cn("h-[calc(var(--chip)*0.95)] w-[calc(var(--chip)*0.8)] shrink-0", className)} aria-hidden="true" focusable="false">
            <RobotFigure facing="right" />
        </svg>
    );
}

function chipLabel(index: number, cmd: Cmd, state: ChipState): string {
    const extra = state === "fail" ? ", tu je Robotić stao" : state === "selected" ? ", izabrana" : state === "current" ? ", sada" : "";
    return `${index + 1}. ${CMD_WORDS[cmd]}${extra}`;
}

function ProgramStrip({ view, target, demo, disabled, onFix, onZone }: BoardProps) {
    const current = chipOf(view, view.running ? view.step : -1);
    const failed = view.failAt !== null && !view.running ? chipOf(view, view.failAt) : null;
    // Isto i na monitoru (drugo dete na zajedničkoj tabli vidi gde ide sledeća strelica)
    const zoneNext = view.running || view.feedback === "correct" ? null : nextZone(view);
    const loop = view.kind === "loop";
    const free = view.limit > 0;

    const stateOf = (zone: Zone, index: number): ChipState => {
        if (current) {
            if (current.zone === zone && current.index === index) return "current";
            if (zone === "pre" && current.zone === "pre" && index < current.index) return "done";
            if (zone === "pre" && current.zone === "loop") return "done";
        }
        if (failed && failed.zone === zone && failed.index === index) return "fail";
        if (view.kind === "debug" && view.fixAt === index) return "selected";
        if (target && view.kind === "debug" && target.action === `fix:${index}`) return "hint";
        return "idle";
    };

    // Veličina pločice: koliko ih staje u red trake (sa glavom Robotića i okvirom petlje); duži
    // program prelazi u drugi red. Pločice koje se dodiruju (ispravljanje) su najmanje 44 px.
    const items = loop ? 1 + (free ? view.limit + 2 : view.preSlots + view.bodySlots) + 1.8 + (free ? 1.6 : 0) : view.kind === "debug" ? view.preSlots : 1 + Math.max(view.preSlots + 1, 3);
    const perRow = Math.min(items, view.kind === "debug" ? 8 : 7);
    const fit = `calc((var(--col) - 1rem - ${(perRow - 1) * 0.3}rem) / ${perRow})`;
    const style = { ["--chip" as string]: view.kind === "debug" ? `clamp(2.75rem, ${fit}, 3.4rem)` : `clamp(1.9rem, ${fit}, 3.4rem)` } as CSSProperties;

    const preChips = view.pre.map((cmd, i) =>
        view.kind === "debug" ? (
            <Chip
                key={`p-${i}`}
                cmd={cmd}
                state={stateOf("pre", i)}
                label={chipLabel(i, cmd, stateOf("pre", i))}
                action={`fix:${i}`}
                disabled={disabled || view.running}
                onClick={() => onFix(i)}
                demo={demo && target?.action === `fix:${i}`}
                step={i + 1}
            />
        ) : (
            <Chip key={`p-${i}`} cmd={cmd} state={stateOf("pre", i)} label={chipLabel(i, cmd, stateOf("pre", i))} step={loop ? undefined : i + 1} />
        )
    );

    if (!loop) {
        return (
            <div role="group" aria-label="Program" className="cr-strip flex w-full flex-wrap items-center justify-center gap-[0.3rem] rounded-2xl bg-surface/95 p-1.5 shadow-soft ring-1 ring-line" style={style}>
                {/* Ispravljanje: gotov program bez glave Robotića, da sve strelice (dodiruju se) stanu u red */}
                {view.kind !== "debug" && <RobotHead />}
                {preChips}
                {zoneNext === "pre" && <EmptySlot active plus={view.pre.length === 0} />}
            </div>
        );
    }

    // Petlja: koraci pre petlje, pa okvir „Ponovi N puta” sa telom
    const preSlots = free ? [] : Array.from({ length: Math.max(0, view.preSlots - view.pre.length) }, (_, i) => <EmptySlot key={`pe-${i}`} active={zoneNext === "pre" && i === 0} />);
    const bodyChips = view.body.map((cmd, i) => {
        const state = stateOf("loop", i);
        return <Chip key={`b-${i}`} cmd={cmd} state={state} label={chipLabel(view.pre.length + i, cmd, state)} />;
    });
    const bodySlots = free ? [] : Array.from({ length: Math.max(0, view.bodySlots - view.body.length) }, (_, i) => <EmptySlot key={`be-${i}`} active={zoneNext === "loop" && i === 0} />);
    const rep = current?.zone === "loop" ? current.rep : solvedReps(view);
    const zoneGlow = (zone: Zone) => target?.action === `zone:${zone}`;

    const preZone =
        free ? (
            <ZoneBox zone="pre" active={view.zone === "pre"} glow={zoneGlow("pre")} disabled={disabled || view.running} onZone={onZone} demo={demo && zoneGlow("pre")}>
                {preChips}
                {zoneNext === "pre" && <EmptySlot active plus />}
                {view.pre.length === 0 && zoneNext !== "pre" && <EmptySlot active={false} />}
            </ZoneBox>
        ) : (
            <>
                {preChips}
                {preSlots}
            </>
        );

    const frameInner = (
        <>
            <span className="flex shrink-0 flex-col items-center justify-center gap-0.5 self-stretch rounded-xl bg-azure-600 px-1 text-white" aria-hidden="true">
                <span className="flex items-center font-display text-[calc(var(--chip)*0.42)] font-black leading-none">
                    <LoopGlyph className="h-[calc(var(--chip)*0.42)] w-[calc(var(--chip)*0.42)]" />
                    {view.times}
                </span>
                <span className="flex gap-[2px]">
                    {Array.from({ length: view.times }, (_, i) => (
                        <span key={i} className={cn("h-1.5 w-1.5 rounded-full", rep !== null && i <= rep ? "bg-sun-300" : "bg-white/45")} />
                    ))}
                </span>
            </span>
            {bodyChips}
            {bodySlots}
            {free && zoneNext === "loop" && <EmptySlot active plus />}
            {free && view.body.length === 0 && zoneNext !== "loop" && <EmptySlot active={false} />}
        </>
    );
    const frameClass = "flex items-center gap-[0.3rem] rounded-2xl border-[3px] border-azure-400 bg-azure-50 p-1";

    return (
        <div role="group" aria-label="Program" className="cr-strip flex w-full flex-wrap items-center justify-center gap-[0.3rem] rounded-2xl bg-surface/95 p-1.5 shadow-soft ring-1 ring-line" style={style}>
            <RobotHead className="cr-loop-head" />
            {preZone}
            {free ? (
                <ZoneBox zone="loop" active={view.zone === "loop"} glow={zoneGlow("loop")} disabled={disabled || view.running} onZone={onZone} demo={demo && zoneGlow("loop")} frame times={view.times}>
                    {frameInner}
                </ZoneBox>
            ) : (
                <div role="group" aria-label={`Ponovi ${timesWord(view.times)}`} className={frameClass}>
                    {frameInner}
                </div>
            )}
            {free && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-azure-100 px-2 py-1 text-sm font-extrabold text-azure-700" aria-label={`Strelice: ${view.pre.length + view.body.length} od ${view.limit}`}>
                    <ArrowGlyph dir="up" className="h-3.5 w-3.5" />
                    {view.pre.length + view.body.length}/{view.limit}
                </span>
            )}
        </div>
    );
}

/** Koliko ponavljanja je već prošlo (posle izvođenja: sva; inače nijedno) */
function solvedReps(view: CodingView): number | null {
    return view.feedback === "correct" ? view.times - 1 : null;
}

function ZoneBox({
    zone,
    active,
    glow,
    disabled,
    onZone,
    demo,
    frame = false,
    times = 0,
    children,
}: {
    zone: Zone;
    active: boolean;
    glow: boolean;
    disabled: boolean;
    onZone: (zone: Zone) => void;
    demo: boolean;
    frame?: boolean;
    times?: number;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            data-action={`zone:${zone}`}
            disabled={disabled}
            onClick={() => onZone(zone)}
            aria-pressed={active}
            aria-label={frame ? `Ponovi ${timesWord(times)}${active ? ", nove strelice idu ovde" : ""}` : `Pre petlje${active ? ", nove strelice idu ovde" : ""}`}
            className={cn(
                "relative flex items-center gap-[0.3rem] rounded-2xl p-1 transition-[box-shadow,background-color] disabled:cursor-default",
                frame ? "border-[3px] border-azure-400 bg-azure-50" : "border-2 border-dashed border-line bg-surface",
                active && "ring-4 ring-azure-300",
                glow && "animate-soft-pulse ring-4 ring-sun-300"
            )}
        >
            {children}
            {demo && <DemoHand />}
        </button>
    );
}

// ── Dugmad: krst strelica sa „Kreni” u sredini, „Obriši” i „Očisti” ──────────────

function ControlPad({ view, target, demo, disabled, onCmd, onUndo, onClear, onRun }: BoardProps) {
    const busy = disabled || view.running;
    const full = view.kind !== "debug" && nextZone(view) === null;
    const debugIdle = view.kind === "debug" && view.fixAt === null;
    const empty = view.pre.length + view.body.length === 0;
    const glow = (action: string) => target?.action === action;
    const hand = (action: string) => demo && glow(action);

    const arrow = (cmd: Cmd) => {
        if (!view.arrows.includes(cmd)) return <span key={cmd} aria-hidden="true" />;
        const action = `cmd:${cmd}`;
        // Bleda je samo strelica koja sada ne može (pun program, ispravljanje bez izabrane strelice),
        // ne i ona koja je isključena zato što je ovo prikaz kod drugog deteta
        const off = busy || full || debugIdle;
        const faded = (full || debugIdle) && !view.running;
        return (
            <button
                key={cmd}
                type="button"
                data-action={action}
                disabled={off}
                onClick={() => onCmd(cmd)}
                aria-label={ARROW_LABEL[cmd]}
                className={cn(
                    "relative grid place-items-center rounded-2xl border-2 border-b-[5px] border-azure-700 bg-azure-500 text-white shadow-soft transition-[transform,background-color,border-width,opacity] enabled:hover:bg-azure-600 enabled:active:translate-y-[3px] enabled:active:border-b-2 disabled:cursor-default",
                    faded && "opacity-45",
                    glow(action) && "animate-soft-pulse ring-4 ring-sun-300"
                )}
            >
                <ArrowGlyph dir={cmd} className="pointer-events-none h-[56%] w-[56%]" />
                {hand(action) && <DemoHand />}
            </button>
        );
    };

    const runnable = canRun(view) && !disabled;
    return (
        <>
            <div role="group" aria-label="Strelice" className="cr-pad grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, var(--key))", gridTemplateRows: "repeat(3, var(--key))" }}>
                <span aria-hidden="true" />
                {arrow("up")}
                <span aria-hidden="true" />
                {arrow("left")}
                <button
                    type="button"
                    data-action="run"
                    disabled={!runnable}
                    onClick={onRun}
                    aria-label="Kreni"
                    className={cn(
                        "relative flex flex-col items-center justify-center gap-0.5 rounded-full border-2 border-b-[5px] border-emerald-800 bg-emerald-500 text-white shadow-soft transition-[transform,background-color,border-width,opacity] enabled:hover:bg-emerald-600 enabled:active:translate-y-[3px] enabled:active:border-b-2 disabled:cursor-default",
                        !canRun(view) && !view.running && view.feedback !== "correct" && "opacity-45",
                        view.running && "bg-emerald-600",
                        glow("run") && "animate-soft-pulse ring-4 ring-sun-300"
                    )}
                >
                    <Play className="pointer-events-none h-[38%] w-[38%] fill-current" strokeWidth={2.4} />
                    <span className="pointer-events-none text-[clamp(0.6rem,calc(var(--key)*0.2),0.95rem)] font-extrabold leading-none">Kreni</span>
                    {hand("run") && <DemoHand />}
                </button>
                {arrow("right")}
                <span aria-hidden="true" />
                {arrow("down")}
                <span aria-hidden="true" />
            </div>
            {view.kind !== "debug" && (
                <div className="cr-tools">
                    <ToolButton action="undo" label="Obriši" aria="Obriši poslednju strelicu" className="cr-undo" disabled={busy || empty} faded={empty} glow={glow("undo")} demo={hand("undo")} onClick={onUndo}>
                        <Delete className="h-[42%] w-[42%]" strokeWidth={2.6} />
                    </ToolButton>
                    <ToolButton action="clear" label="Očisti" aria="Obriši ceo program" className="cr-clear" disabled={busy || empty} faded={empty} glow={glow("clear")} demo={false} onClick={onClear}>
                        <Trash2 className="h-[40%] w-[40%]" strokeWidth={2.4} />
                    </ToolButton>
                </div>
            )}
        </>
    );
}

function ToolButton({ action, label, aria, className, disabled, faded, glow, demo, onClick, children }: { action: string; label: string; aria: string; className: string; disabled: boolean; faded: boolean; glow: boolean; demo: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            data-action={action}
            disabled={disabled}
            onClick={onClick}
            aria-label={aria}
            className={cn(
                className,
                "relative flex h-[var(--key)] w-[var(--key)] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-b-[5px] border-line bg-surface text-ink shadow-soft transition-[transform,border-width,opacity] enabled:hover:border-azure-300 enabled:active:translate-y-[3px] enabled:active:border-b-2 disabled:cursor-default",
                faded && "opacity-40",
                glow && "animate-soft-pulse ring-4 ring-sun-300"
            )}
        >
            {children}
            <span className="pointer-events-none text-[clamp(0.6rem,calc(var(--key)*0.19),0.9rem)] font-extrabold leading-none text-ink-soft">{label}</span>
            {demo && <DemoHand />}
        </button>
    );
}
