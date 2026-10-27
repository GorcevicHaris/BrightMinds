"use client";

// Igra „Vaga”: na stolu stoji drvena vaga sa dva tasa. Prvo dete čita već nagnutu vagu („Šta je
// teže?”), pa pogađa dok vaga stoji na kockicama (kockice se izmaknu i vaga pokaže), pa samo
// pravi ravnotežu: kocke ili tegove prevlači na tas (ili ih dodirne), a dodir na tegove na tasu
// vraća poslednji. Previše nagne vagu na drugu stranu — glas mirno kaže da jedna kocka može
// nazad. Kasnije: grupe kocaka, jednaka grupa (=), tegovi sa brojevima, više vaga (ko je
// najteži) i zamena (1 ananas = 3 jabuke). Nema žurbe ni tajmera. Nivoi: data/scaleLevels.ts,
// crteži: scale/.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
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
    type ChoiceState,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import { DragDemo } from "@/app/components/games/kit/DragDemo";
import { useDragSnap, type DragSnap } from "@/app/components/games/kit/useDragSnap";
import {
    buildScaleLevel,
    choiceLabel,
    emptyScaleView,
    groupTokens,
    MAX_ON_PAN,
    MAX_TILT,
    mergeScaleMonitor,
    nextBalanceStep,
    NOT_YET,
    overSentence,
    panLoads,
    panName,
    placedSum,
    ruleSentence,
    scaleAnswer,
    scaleLevel,
    scaleMistake,
    scaleQuestion,
    scaleResult,
    scaleRoundView,
    solveScaleView,
    viewTilt,
    weightValue,
    type ScaleRound,
    type ScaleView,
} from "@/app/components/games/data/scaleLevels";
import { BalanceScale, GroupIcon, ItemIcon, ScaleStyles, WeightIcon, type PanSide } from "@/app/components/games/scale/ScaleArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("scale");
const WRONG_FEEDBACK_MS = 2600;
/** Probni izbor (grupa, teg, voće) stoji na vagi malo duže, da dete vidi kako se nagnula */
const TRIAL_FEEDBACK_MS = 3000;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
const PAN_SLOT = "pan";
/** Nizak ekran: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

/** Zadaci u kojima se bira tas (levo / desno) */
const PAN_TASKS = new Set<ScaleView["task"]>(["read", "predict", "groups"]);
/** Zadaci u kojima se izbor probno stavi na vagu */
const TRIAL_TASKS = new Set<ScaleView["task"]>(["pick", "equation", "swap"]);

/** Prva ravnoteža (nivo 5, prvi zadatak): ruka pokaže kako kocka ide na tas, dok se ne stavi prva */
function showsDragDemo(level: number, view: ScaleView): boolean {
    return view.task === "balance" && level === 5 && view.round === 1 && view.placed.length === 0 && view.wrong.length === 0 && view.feedback !== "correct";
}

function choiceState(view: ScaleView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.selected === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.answer) return "hint";
    return "idle";
}

export default function ScaleGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<ScaleView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<ScaleView>({ childId, gameId: "scale", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Na lakim nivoima pomoć stiže već posle prve greške i posle čekanja (osim kad je isključena)
    const rule = scaleLevel(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde.
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<ScaleRound[]>(() => (isMonitor ? [] : buildScaleLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    const [view, setView] = useState<ScaleView>(() => ({ ...emptyScaleView(plan.length), ...(plan[0] ? scaleRoundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: ScaleView, log?: string) => {
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
        const question = scaleQuestion(viewRef.current);
        if (question) say(question);
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: ScaleView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(scaleResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: ScaleView = { ...viewRef.current, ...scaleRoundView(round), round: index + 1 };
        const question = scaleQuestion(next);
        commit(next, `Zadatak ${index + 1}: ${question}`);
        say(question);
    };

    const settleAfterWrong = (ms: number) => {
        guard.hold();
        feedbackTimer.current = after(ms, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, feedback: null, selected: null, trial: null });
        });
    };

    /** Zadatak rešen: poeni, pohvala, pa sledeći zadatak (vaga stigne da se smiri) */
    const solve = (current: ScaleView, solved: Partial<ScaleView>, log: string) => {
        const { next, firstTry, modeled } = solveScaleView(current, level, solved);
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Tačno ${how}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        const settle = calm ? FEEDBACK_MIN_MS + 600 : FEEDBACK_MIN_MS + 1200;
        sayThen(praise(scaleAnswer(next), firstTry), isLast ? finish : () => startRound(current.round), { min: settle, emotion: "happy" });
    };

    /** Izbor tasa ili kartice */
    const choose = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.task === "balance" || current.feedback === "correct" || !current.choices.includes(id) || current.wrong.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const trial = TRIAL_TASKS.has(current.task) ? id : null;
        const label = choiceLabel(current, id);
        if (id === current.answer) {
            solve(current, { selected: id, trial, peg: false, feedback: "correct" }, `${scaleQuestion(current)} → ${label}`);
            return;
        }
        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(hintAfter, wrong.length, current.choices.length - 1);
        // Vaga sa kockicama se pusti i posle pogrešnog izbora: sama pokaže šta je teže
        const next: ScaleView = { ...current, wrong, hint, selected: id, trial, peg: false, feedback: "wrong", incorrectCount: current.incorrectCount + 1 };
        commit(next, `Netačno: ${scaleQuestion(current)} → ${label}`);
        playSfx("wrong");
        say(`${scaleMistake(next, id)} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong(trial ? TRIAL_FEEDBACK_MS : WRONG_FEEDBACK_MS);
    };

    /** Teg je stavljen na tas. Vraća true kad je prihvaćen. */
    const addWeight = (token: string): boolean => {
        if (isMonitor || finishedRef.current || guard.blocked()) return false;
        const current = viewRef.current;
        if (current.task !== "balance" || current.feedback === "correct" || !current.tray.includes(token) || current.placed.length >= MAX_ON_PAN) return false;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const placed = [...current.placed, token];
        const sum = placedSum({ placed });
        if (sum === current.target) {
            solve(current, { placed, over: false, feedback: "correct" }, `Ravnoteža: ${placed.map(weightValue).join(" + ")} = ${current.target}`);
            return true;
        }
        if (sum > current.target) {
            // Previše: vaga se nagne na drugu stranu. Promašaj se broji kad vaga pređe na drugu stranu.
            const crossing = !current.over;
            const wrong = crossing ? [...current.wrong, `${placed.length}:${token}`] : current.wrong;
            const hint = current.hint || (crossing && hintDue(hintAfter, wrong.length, Math.max(1, hintAfter)));
            const next: ScaleView = { ...current, placed, over: true, wrong, hint, feedback: "wrong", incorrectCount: current.incorrectCount + (crossing ? 1 : 0) };
            commit(next, `Previše: ${sum} (treba ${current.target})`);
            playSfx("wrong");
            say(overSentence(next), undefined, "gentle");
            return true;
        }
        commit({ ...current, placed, over: false, feedback: null }, `Stavljeno: ${weightValue(token)} (ukupno ${sum} od ${current.target})`);
        playSfx("tap");
        if (current.placed.length === 0) say(NOT_YET);
        return true;
    };

    /** Poslednji teg sa tasa ide nazad u korpu */
    const takeBack = () => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.task !== "balance" || current.feedback === "correct" || current.placed.length === 0) return;
        const placed = current.placed.slice(0, -1);
        const sum = placedSum({ placed });
        playSfx("tap");
        if (sum === current.target) {
            solve(current, { placed, over: false, feedback: "correct" }, `Ravnoteža posle vraćanja: ${current.target}`);
            return;
        }
        commit({ ...current, placed, over: sum > current.target, feedback: sum > current.target ? "wrong" : null }, `Vraćeno (ukupno ${sum} od ${current.target})`);
    };

    // Pomoć posle čekanja: tačan odgovor (ili sledeći teg) blago zasvetli
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.placed.length}:${view.wrong.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback === "correct" || current.hint) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        if (showsDragDemo(level, current)) return; // ruka pokazuje kako kocka ide na tas
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        const question = scaleQuestion(current);
        if (question) say(question);
    };

    // Teg koji prati prst je iste veličine kao dugme iz koga je uzet
    const [ghostPx, setGhostPx] = useState(72);
    const drag = useDragSnap({
        enabled: !isMonitor && view.task === "balance" && view.feedback !== "correct",
        calm,
        onDrop: (piece, slot) => (slot === PAN_SLOT ? addWeight(piece) : false),
        onTap: (piece) => {
            addWeight(piece);
        },
        onGrab: (piece) => {
            const card = document.querySelector<HTMLElement>(`[data-piece="${piece}"]`);
            if (card) setGhostPx(card.getBoundingClientRect().width);
        },
    });

    const shown = isMonitor ? mergeScaleMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const question = scaleQuestion(shown);

    if (!question) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = solved ? scaleAnswer(shown) : shown.feedback === "wrong" ? (shown.task === "balance" ? overSentence(shown) : shown.selected ? scaleMistake(shown, shown.selected) : "") : "";
    const demo = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved;
    const disabled = isMonitor || solved;
    const balancing = shown.task === "balance" && !solved && !shown.over && shown.placed.length > 0;

    return (
        <GameStage>
            <ScaleStyles />
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: pitanje je u polju za igru (manji natpis), da vaga bude krupna */}
            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up [@media(max-height:37.5rem)]:hidden" compact title={question} />
            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-4">
                <Board key={`board-${shown.round}`} view={shown} question={question} drag={drag} ghostPx={ghostPx} calm={calm} demo={demo} disabled={disabled} onChoose={choose} onTakeBack={takeBack} level={level} />
            </PlayArea>
            {balancing ? (
                // Nizak ekran: samo glas (natpis bi pokrio vagu)
                <div className={cn("pointer-events-none flex items-center justify-center [@media(max-height:37.5rem)]:hidden", FEEDBACK_CLASS)}>
                    <span key={shown.placed.length} className="inline-flex animate-fade-up items-center rounded-full bg-surface px-5 py-2 text-base font-extrabold text-ink-soft shadow-soft ring-1 ring-line sm:text-lg">
                        {NOT_YET}
                    </span>
                </div>
            ) : (
                <Feedback kind={shown.feedback} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
            )}
        </GameStage>
    );
}

// ── Tabla ─────────────────────────────────────────────────────────────────────

interface BoardProps {
    view: ScaleView;
    question: string;
    drag: DragSnap;
    ghostPx: number;
    calm: boolean;
    demo: boolean;
    disabled: boolean;
    onChoose: (id: string) => void;
    onTakeBack: () => void;
    level: number;
}

function Board({ view, question, drag, ghostPx, calm, demo, disabled, onChoose, onTakeBack, level }: BoardProps) {
    const { rootRef, ghostRef, active, wobble } = drag;
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const setRootRef = (el: HTMLDivElement | null) => {
        rootRef(el);
        setRoot((previous) => (previous === el ? previous : el));
    };
    const balance = view.task === "balance";
    const solved = view.feedback === "correct";
    const dragDemo = !disabled && showsDragDemo(level, view);
    const side = balance ? "tray" : PAN_TASKS.has(view.task) ? null : "cards";

    return (
        <div ref={setRootRef} className={cn("relative flex min-h-0 w-full flex-1 flex-col gap-1.5 self-stretch", disabled && "pointer-events-none")} style={{ containerType: "size" }}>
            <p className="hidden shrink-0 self-center rounded-full bg-surface/90 px-3 py-1 text-center text-sm font-extrabold leading-tight text-ink shadow-soft ring-1 ring-line [@media(max-height:37.5rem)]:block">{question}</p>
            <div className="flex min-h-0 w-full flex-1 flex-col items-stretch gap-2 sm:gap-3 landscape:flex-row">
                <div className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center" style={{ containerType: "size" }}>
                    <Scene view={view} calm={calm} demo={demo} disabled={disabled} onChoose={onChoose} onTakeBack={onTakeBack} drag={drag} />
                </div>
                {side === "tray" && <Tray view={view} drag={drag} calm={calm} disabled={disabled || solved} />}
                {side === "cards" && <Cards view={view} demo={demo} disabled={disabled} onChoose={onChoose} />}
            </div>

            {dragDemo && <DragDemo root={root} from={`[data-piece="${view.tray[0]}"]`} to={`[data-slot="${PAN_SLOT}"]`} calm={calm} />}

            {/* Teg koji prati prst: iznad celog ekrana igre (z 6500), da ga ništa ne pokrije */}
            {active !== null &&
                typeof document !== "undefined" &&
                createPortal(
                    <div ref={ghostRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[6500] grid place-items-center drop-shadow-xl" style={{ width: ghostPx, height: ghostPx }}>
                        <div className={cn("grid h-full w-full place-items-center", wobble && "animate-wiggle")}>
                            <WeightIcon token={active} className="h-[70%] w-[70%]" />
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

// ── Scena: jedna vaga, više malih vaga ili vaga sa pravilom ───────────────────

interface SceneProps {
    view: ScaleView;
    calm: boolean;
    demo: boolean;
    disabled: boolean;
    onChoose: (id: string) => void;
    onTakeBack: () => void;
    drag: DragSnap;
}

function Scene({ view, calm, demo, disabled, onChoose, onTakeBack, drag }: SceneProps) {
    const solved = view.feedback === "correct";
    if (view.task === "chain") return <ChainScene view={view} calm={calm} />;

    const { left, right } = panLoads(view);
    const angle = viewTilt(view);
    const numeral = view.marks === "numerals";
    const balancedNow = !view.peg && view.task !== "read" && view.task !== "predict" && view.task !== "groups" && angle === 0 && (solved || (view.task === "balance" && view.placed.length > 0));

    // Natpisi ispod tasova
    let labels: Partial<Record<PanSide, string>> | undefined;
    if (view.task === "read" || view.task === "predict") labels = { left: panName(view, "left"), right: panName(view, "right") };
    else if (view.task === "balance" && numeral) {
        const values = view.placed.map(weightValue);
        labels = { left: String(view.target), right: values.length > 1 ? `${values.join(" + ")} = ${placedSum(view)}` : values.length === 1 ? String(values[0]) : undefined };
    } else if (view.task === "balance") labels = { left: panName(view, "left") };
    else if (view.task === "equation") {
        const missing = view.trial ?? "?";
        labels = { left: view.left.map(weightValue).join(" + "), right: `${weightValue(view.right[0] ?? "")} + ${missing}` };
    }

    const tags: Partial<Record<PanSide, string>> = {};
    if (view.task === "balance" && (view.tag || solved)) tags.left = String(view.target);

    const overlay = (sideName: PanSide, style: CSSProperties) => {
        if (PAN_TASKS.has(view.task)) return <PanChoice key={sideName} view={view} id={sideName} style={style} demo={demo} disabled={disabled} onChoose={onChoose} />;
        if (view.task === "balance" && sideName === "right") return <PanSlot key={sideName} view={view} style={style} drag={drag} disabled={disabled} onTakeBack={onTakeBack} />;
        return null;
    };

    const main = (
        <BalanceScale
            left={left}
            right={right}
            angle={angle}
            peg={view.peg}
            balanced={balancedNow}
            calm={calm}
            numeral={numeral}
            minSize={view.task === "balance" ? 0.78 : 0}
            tags={tags}
            labels={labels}
            overlay={overlay}
            className="max-w-[46rem]"
            label={scaleLabel(view, angle)}
        />
    );

    if (view.task === "swap" && view.ref) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 landscape:flex-row landscape:gap-3">
                <figure className="flex h-[34%] w-full shrink-0 flex-col items-center justify-center rounded-3xl bg-surface/60 p-1 ring-1 ring-cocoa-200 landscape:h-full landscape:w-[38%]" style={{ containerType: "size" }}>
                    <BalanceScale left={view.ref.left} right={view.ref.right} angle={0} balanced calm={calm} label={ruleSentence(view)} />
                </figure>
                <div className="flex min-h-0 w-full flex-1 items-center justify-center landscape:h-full" style={{ containerType: "size" }}>
                    {main}
                </div>
            </div>
        );
    }
    return main;
}

function scaleLabel(view: ScaleView, angle: number): string {
    if (view.peg) return "Vaga stoji na kockicama";
    if (angle === 0) return "Vaga je ravna";
    return angle > 0 ? "Desna strana vage je dole" : "Leva strana vage je dole";
}

/** Tas kao izbor (šta je teže / lakše, koja strana) */
function PanChoice({ view, id, style, demo, disabled, onChoose }: { view: ScaleView; id: PanSide; style: CSSProperties; demo: boolean; disabled: boolean; onChoose: (id: string) => void }) {
    const state = choiceState(view, id);
    const label = choiceLabel(view, id);
    return (
        <button
            type="button"
            data-action={`choice:${id}`}
            disabled={disabled || (state !== "idle" && state !== "hint")}
            onClick={() => onChoose(id)}
            aria-label={`${label}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
            style={style}
            className={cn(
                "z-10 rounded-[1.6rem] outline-none transition-[background-color,box-shadow] duration-200 focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default",
                state === "idle" && "hover:bg-white/25",
                state === "hint" && "animate-soft-pulse bg-brand-50/40 ring-4 ring-brand-300",
                state === "correct" && "bg-emerald-50/30 ring-4 ring-emerald-400",
                state === "wrong" && "bg-rose-50/30 ring-4 ring-rose-200",
                state === "dimmed" && view.wrong.includes(id) && "bg-cocoa-50/45"
            )}
        >
            {state === "correct" && <Badge className="bg-emerald-600">✓</Badge>}
            {state === "wrong" && <Badge className="bg-rose-500">✗</Badge>}
            {demo && id === view.answer && <DemoHand className="bottom-[22%] right-[8%]" />}
        </button>
    );
}

function Badge({ children, className }: { children: string; className: string }) {
    return (
        <span aria-hidden="true" className={cn("absolute -right-1 -top-1 grid h-8 w-8 animate-pop place-items-center rounded-full text-base font-black text-white shadow-soft ring-2 ring-white", className)}>
            {children}
        </span>
    );
}

/** Desni tas u ravnoteži: mesto za teg, a dodir na tegove vraća poslednji */
function PanSlot({ view, style, drag, disabled, onTakeBack }: { view: ScaleView; style: CSSProperties; drag: DragSnap; disabled: boolean; onTakeBack: () => void }) {
    const solved = view.feedback === "correct";
    const open = !solved && view.placed.length < MAX_ON_PAN;
    const hinted = view.hint && !solved ? nextBalanceStep(view) : null;
    const over = drag.over === PAN_SLOT;
    const glow = over || (drag.dragging && open);
    return (
        <div
            data-slot={PAN_SLOT}
            {...(open ? { "data-open": "" } : {})}
            style={style}
            aria-label="Desni tas"
            className={cn("z-10 rounded-[1.6rem] transition-[background-color,box-shadow] duration-200", glow && "bg-brand-50/40 ring-4 ring-brand-200", over && "ring-brand-400")}
        >
            {view.placed.length > 0 && (
                <button
                    type="button"
                    data-action="takeback"
                    disabled={disabled}
                    onClick={onTakeBack}
                    aria-label={`Vrati poslednji teg (${weightValue(view.placed[view.placed.length - 1])})`}
                    className={cn(
                        "absolute inset-x-[6%] bottom-0 top-[30%] rounded-[1.4rem] outline-none focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default",
                        hinted === "takeback" && "animate-soft-pulse bg-brand-50/40 ring-4 ring-brand-300"
                    )}
                >
                    {!solved && (
                        <span aria-hidden="true" className="absolute -right-2 -top-3 grid h-8 w-8 place-items-center rounded-full bg-surface text-cocoa-700 shadow-soft ring-2 ring-cocoa-200">
                            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 14 4 9l5-5" />
                                <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
                            </svg>
                        </span>
                    )}
                </button>
            )}
        </div>
    );
}

/**
 * Raspored malih vaga: broj kolona u kome je svaka vaga najveća (vaga je široka 1,6 : 1).
 * Uspravan telefon: jedna ispod druge; tablet i položen telefon: dve u redu ili sve u redu.
 */
function useBestColumns(count: number) {
    const [el, setEl] = useState<HTMLOListElement | null>(null);
    const [cols, setCols] = useState(1);
    useEffect(() => {
        if (!el || typeof ResizeObserver === "undefined") return;
        const measure = () => {
            const { width, height } = el.getBoundingClientRect();
            if (width === 0 || height === 0) return;
            let best = 1;
            let bestSize = 0;
            for (let c = 1; c <= count; c += 1) {
                const rows = Math.ceil(count / c);
                const size = Math.min(width / c, (height / rows) * 1.6);
                if (size > bestSize * 1.02) {
                    best = c;
                    bestSize = size;
                }
            }
            setCols(best);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [el, count]);
    return [setEl, cols] as const;
}

/** Male vage za zaključivanje (ko je najteži / najlakši) */
function ChainScene({ view, calm }: { view: ScaleView; calm: boolean }) {
    const count = view.chain.length;
    const [setGrid, cols] = useBestColumns(count);
    const rows = Math.ceil(count / cols);
    return (
        <ol
            ref={setGrid}
            aria-label="Vage"
            className="grid h-full w-full gap-1.5 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
        >
            {view.chain.map((scale, i) => {
                const left = scale.heavyLeft ? scale.heavy : scale.light;
                const right = scale.heavyLeft ? scale.light : scale.heavy;
                const heavyName = choiceLabel({ ...view, task: "chain" }, scale.heavy);
                const lightName = choiceLabel({ ...view, task: "chain" }, scale.light);
                // Poslednja vaga sama u redu zauzme ceo red (stoji na sredini)
                const lonely = cols > 1 && i === count - 1 && count % cols !== 0;
                return (
                    <li
                        key={i}
                        className="flex min-h-0 min-w-0 items-center justify-center rounded-3xl bg-surface/55 p-1 ring-1 ring-cocoa-200"
                        style={{ containerType: "size", gridColumn: lonely ? `span ${cols - (count % cols) + 1}` : undefined }}
                    >
                        <BalanceScale
                            left={[left]}
                            right={[right]}
                            angle={scale.heavyLeft ? -MAX_TILT : MAX_TILT}
                            calm={calm}
                            compact
                            uniform
                            labels={{ left: choiceLabel({ ...view, task: "chain" }, left), right: choiceLabel({ ...view, task: "chain" }, right) }}
                            label={`${heavyName} je teži od: ${lightName}`}
                        />
                    </li>
                );
            })}
        </ol>
    );
}

// ── Izbori na karticama ───────────────────────────────────────────────────────

function Cards({ view, demo, disabled, onChoose }: { view: ScaleView; demo: boolean; disabled: boolean; onChoose: (id: string) => void }) {
    const count = view.choices.length;
    const cols = count <= 4 ? count : Math.ceil(count / 2);
    return (
        <div
            role="group"
            aria-label="Izbori"
            className="grid w-full shrink-0 gap-2 self-center sm:gap-3 landscape:w-[34%] landscape:max-w-sm landscape:self-stretch landscape:content-center [grid-template-columns:repeat(var(--cols),minmax(0,1fr))] landscape:[grid-template-columns:repeat(var(--side),minmax(0,1fr))]"
            style={{ ["--cols" as string]: cols, ["--side" as string]: count > 3 ? 2 : 1, ["--rows" as string]: count > 3 ? Math.ceil(count / 2) : count }}
        >
            {view.choices.map((id) => {
                const state = choiceState(view, id);
                const label = choiceLabel(view, id);
                return (
                    <ChoiceCard
                        key={id}
                        data-action={`choice:${id}`}
                        state={state}
                        disabled={disabled || (state !== "idle" && state !== "hint")}
                        onClick={() => onChoose(id)}
                        aria-label={`${label}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                        className="animate-pop min-h-0 h-[clamp(3.5rem,19cqh,8.5rem)] flex-col gap-0.5 p-1.5 sm:p-2 landscape:h-[clamp(3.25rem,calc((100cqh-2.5rem)/var(--rows)-0.5rem),7.5rem)]"
                    >
                        <CardFace view={view} id={id} />
                        {demo && id === view.answer && <DemoHand />}
                    </ChoiceCard>
                );
            })}
        </div>
    );
}

function CardFace({ view, id }: { view: ScaleView; id: string }) {
    switch (view.task) {
        case "pick":
            return <GroupIcon tokens={groupTokens(id)} className="pointer-events-none h-[78%] w-auto max-w-[92%]" />;
        case "equation":
            return <WeightIcon token={`n${id}`} className="pointer-events-none h-[82%] w-auto" />;
        case "swap":
            return (
                <span className="pointer-events-none flex h-full items-center justify-center gap-1">
                    <span className="font-display text-[clamp(1.6rem,9cqh,3rem)] font-black leading-none text-ink">{id}</span>
                    {view.fill && <ItemIcon id={view.fill} className="h-[60%] w-auto" />}
                </span>
            );
        case "chain":
            return (
                <span className="pointer-events-none flex h-full w-full min-h-0 flex-col items-center justify-center gap-0.5">
                    <ItemIcon id={id} className="aspect-square h-auto min-h-0 w-auto max-w-full flex-1" />
                    <span className="text-sm leading-tight sm:text-base">{choiceLabel(view, id)}</span>
                </span>
            );
        default:
            return null;
    }
}

// ── Korpa sa tegovima (ravnoteža) ─────────────────────────────────────────────

function Tray({ view, drag, calm, disabled }: { view: ScaleView; drag: DragSnap; calm: boolean; disabled: boolean }) {
    const { active, pieceProps } = drag;
    const hinted = view.hint ? nextBalanceStep(view) : null;
    const full = view.placed.length >= MAX_ON_PAN;
    // Položen ekran: korpa je kolona pored vage (više tegova — dve kolone)
    const sideCols = view.tray.length > 2 ? 2 : 1;
    return (
        <div
            role="group"
            aria-label={view.marks === "numerals" ? "Tegovi" : "Kocke"}
            className="flex shrink-0 items-center justify-center gap-2 self-center rounded-card border-2 border-dashed border-cocoa-200 bg-surface/70 p-1.5 sm:gap-3 sm:p-2 landscape:grid landscape:self-center landscape:[grid-template-columns:repeat(var(--side),auto)]"
            style={{ ["--side" as string]: sideCols, ["--rows" as string]: Math.ceil(view.tray.length / sideCols) }}
        >
            {view.tray.map((token) => {
                const glow = hinted === token;
                return (
                    <button
                        key={token}
                        type="button"
                        data-piece={token}
                        disabled={disabled || full}
                        aria-label={view.marks === "numerals" ? `Teg ${weightValue(token)}` : token === "d2" ? "Dve kocke zajedno" : "Kocka"}
                        {...pieceProps(token)}
                        className={cn(
                            "relative grid aspect-square w-[clamp(3.25rem,17cqh,6rem)] touch-none select-none place-items-center rounded-2xl border-2 border-b-4 bg-surface shadow-soft transition-[transform,border-color,opacity] duration-150 disabled:cursor-default landscape:w-[clamp(3rem,min(calc((100cqh-2.5rem)/var(--rows)-0.5rem),13cqw),6rem)]",
                            glow ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-300",
                            glow && !calm && "animate-soft-pulse",
                            active === token && "opacity-40"
                        )}
                    >
                        {/* Gomilica: tegova ima koliko treba */}
                        <span aria-hidden="true" className="pointer-events-none absolute inset-[16%] translate-x-[7%] -translate-y-[7%] opacity-35">
                            <WeightIcon token={token} className="h-full w-full" />
                        </span>
                        <WeightIcon token={token} className="pointer-events-none relative h-[68%] w-[68%]" />
                    </button>
                );
            })}
        </div>
    );
}
