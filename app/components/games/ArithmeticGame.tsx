"use client";

// Igra „Računanje”: mala živa scena — na grani su dve ptice, doleti još jedna — i glas pita
// „Koliko je sada ptica na grani?”. Dete bira broj. Glas priča rečenicu po rečenicu, a scena
// prati: ptice doleću i odleću, ribe doplivaju, auta izlaze iz garaže, iz jaja se izlegu
// dinosaurusi. Od 4. nivoa ispod scene stoji brojevna rečenica (2 + 1 = ?), kasnije kutija
// za jaja sa deset mesta, broj u kutiji, priče sa imenima i računanje do 20. Pogrešan broj se
// blago označi, a glas kaže činjenicu i kako da računa; pomoć je tačan broj koji svetli i
// predmeti sa rednim brojevima dok glas broji zajedno sa detetom. Nema žurbe ni tajmera.
// Nivoi: data/arithmeticLevels.ts, crteži: arithmetic/.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import {
    arithmeticLevel,
    arithmeticResult,
    arithmeticRoundView,
    buildArithmeticLevel,
    correctSentence,
    countSentence,
    emptyArithmeticView,
    mergeArithmeticMonitor,
    mistakeSentence,
    moveCount,
    objectsShown,
    questionParts,
    questionText,
    RETRY,
    RETRY_SLOW,
    sentenceParts,
    solveArithmeticView,
    splitText,
    taskAnswer,
    tipSentence,
    type ArithmeticTask,
    type ArithmeticView,
} from "@/app/components/games/data/arithmeticLevels";
import { FrameBoards, SceneBoard, StoryCard } from "@/app/components/games/arithmetic/ArithmeticArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("arithmetic");
const WRONG_FEEDBACK_MS = 1600;
/** Koliko najmanje traje jedan pokret scene (da se vidi ceo dolazak ili odlazak) */
const MOVE_MS = 1500;
/** Nizak ekran: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

export default function ArithmeticGame({ childId, level, gender, childName, onComplete, isMonitor = false, monitorState }: GameProps<ArithmeticView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<ArithmeticView>({ childId, gameId: "arithmetic", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Na lakim nivoima pomoć stiže već posle prve greške i posle čekanja (osim kad je isključena)
    const rule = arithmeticLevel(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde.
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<ArithmeticTask[]>(() =>
        isMonitor ? [] : buildArithmeticLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random, childName })
    );
    const [view, setView] = useState<ArithmeticView>(() => ({ ...emptyArithmeticView(plan.length), ...(plan[0] ? arithmeticRoundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    /** Redni broj pričanja scene: stariji niz rečenica (pre „Ponovi” ili novog zadatka) se tiho prekida */
    const tellingRef = useRef(0);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: ArithmeticView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    /**
     * Ispričaj zadatak: uvod, pa svaki pokret scene uz svoju rečenicu (ptica doleti dok glas
     * kaže „Doletela je još jedna.”), pa pitanje. Zadatak bez pokreta se kaže odjednom.
     */
    const tell = useCallback(
        (task: ArithmeticTask) => {
            const run = ++tellingRef.current;
            const parts = questionParts(task, true);
            const moves = moveCount(task);
            if (moves === 0) {
                say(parts.join(" "));
                return;
            }
            const part = (index: number) => {
                if (run !== tellingRef.current || finishedRef.current) return;
                if (index > moves) {
                    say(parts.slice(index).join(" "));
                    return;
                }
                if (index > 0) {
                    const current = viewRef.current;
                    commit({ ...current, step: index });
                }
                sayThen(parts[index], () => part(index + 1), { min: index === 0 ? FEEDBACK_MIN_MS : MOVE_MS });
            };
            part(0);
        },
        [say, sayThen, commit]
    );

    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        if (viewRef.current.task) tell(viewRef.current.task);
        return () => {
            tellingRef.current += 1;
        };
    }, [isMonitor, sync, guard, tell]);

    const modeledRound = (current: ArithmeticView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(arithmeticResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const task = plan[index];
        if (!task) return;
        guard.hold();
        const next: ArithmeticView = { ...viewRef.current, ...arithmeticRoundView(task), round: index + 1 };
        commit(next, `Zadatak ${index + 1}: ${questionText(task)}`);
        tell(task);
    };

    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, feedback: null, selected: null });
        });
    };

    const pick = (value: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const task = current.task;
        if (!task || current.feedback === "correct" || current.wrong.includes(value) || !task.choices.includes(value)) return;
        if (current.step < moveCount(task)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        tellingRef.current += 1;
        const answer = taskAnswer(task);

        if (value === answer) {
            const { next, firstTry, modeled } = solveArithmeticView(current, level, { selected: value, feedback: "correct" });
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
            commit(next, `Tačno ${how}: ${questionText(task)} → ${value}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            sayThen(praise(correctSentence(task, true), firstTry), isLast ? finish : () => startRound(current.round), { min: FEEDBACK_MIN_MS + 1200, emotion: "happy" });
            return;
        }

        const wrong = [...current.wrong, value];
        const hint = current.hint || hintDue(hintAfter, wrong.length, task.choices.length - 1);
        const next: ArithmeticView = { ...current, wrong, hint, selected: value, feedback: "wrong", incorrectCount: current.incorrectCount + 1 };
        commit(next, `Netačno: ${questionText(task)} → ${value}`);
        playSfx("wrong");
        // Lako: posle greške brojimo zajedno. Kasnije prvo savet kako da računa, a brojanje tek uz pomoć.
        const help = hint ? `${countSentence(task, true)} ${RETRY_SLOW}` : `${tipSentence(task, true)} ${RETRY}`;
        say(`${mistakeSentence(task, value, true)} ${help}`, undefined, "gentle");
        settleAfterWrong();
    };

    // Pomoć posle čekanja: tačan broj blago zasvetli, a predmeti dobiju redne brojeve
    const ready = view.task !== null && view.step >= moveCount(view.task);
    useWaitHint(!isMonitor && ready && (settings.waitHint || early), `${view.round}:${ready}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hint) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (!current.task || current.feedback === "correct") return;
        // Scena sa pokretima se ispriča još jednom od početka (predmeti se vrate na mesta)
        if (moveCount(current.task) > 0 && current.wrong.length === 0) {
            commit({ ...current, step: 0, replay: current.replay + 1 });
            tell(current.task);
            return;
        }
        say(questionText(current.task, true));
    };

    const shown = isMonitor ? mergeArithmeticMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const task = shown.task;

    if (!task) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const canPick = !isMonitor && !solved && shown.step >= moveCount(task);
    const message = solved ? correctSentence(task, false, false) : shown.feedback === "wrong" && shown.selected !== null ? mistakeSentence(task, shown.selected) : "";
    const demo = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved && canPick;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: pitanje samo glasom (i u polju za igru), da scena i brojevi budu krupni */}
            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up [@media(max-height:37.5rem)]:hidden" compact title={questionText(task)} />
            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-4">
                <Board key={`board-${shown.round}-${shown.replay}`} view={shown} calm={calm} demo={demo} canPick={canPick} disabled={isMonitor || solved} onPick={pick} />
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Tabla ─────────────────────────────────────────────────────────────────────

interface BoardProps {
    view: ArithmeticView;
    calm: boolean;
    demo: boolean;
    canPick: boolean;
    disabled: boolean;
    onPick: (value: number) => void;
}

function Board({ view, calm, demo, canPick, disabled, onPick }: BoardProps) {
    const task = view.task!;
    const solved = view.feedback === "correct";
    const visible = objectsShown(view);
    // Uz pomoć predmeti dobiju redne brojeve (i kod tačnog odgovora posle pomoći)
    const numbered = view.hint;
    const boxOpen = view.hint || solved;
    const card = !visible && (task.kind === "story" || task.kind === "change");
    return (
        <div className="flex min-h-0 w-full flex-1 self-stretch" style={{ containerType: "size" }}>
            <ArithStyles />
            <div className="flex h-full w-full flex-col items-stretch gap-2 sm:gap-3 landscape:flex-row">
                {/* Slika: scena, okviri ili kartica priče (samo rečenica: bez slike, dok ne zatreba pomoć) */}
                {(visible || card) && (
                    <div className="relative grid min-h-0 min-w-0 flex-1 place-items-center" style={{ containerType: "size" }}>
                        {visible ? (
                            task.draw === "frames" ? (
                                <FrameBoards task={task} step={view.step} numbered={numbered} calm={calm} />
                            ) : (
                                <div className="absolute inset-0 animate-fade overflow-hidden rounded-[1.4rem] shadow-soft ring-1 ring-black/5">
                                    <SceneBoard task={task} step={view.step} numbered={numbered} calm={calm} boxOpen={boxOpen} className="h-full w-full" />
                                </div>
                            )
                        ) : (
                            <StoryCard task={task} className="ar-card animate-fade" />
                        )}
                    </div>
                )}

                {/* Rečenica i brojevi */}
                <div className={cn("flex w-full shrink-0 flex-col items-center justify-center gap-2 self-center sm:gap-3 landscape:w-[min(40cqw,28rem)]", !visible && !card && "flex-1 landscape:w-full")}>
                    {task.sentence && <NumberSentence task={task} solved={solved} big={!visible} />}
                    {task.split && <p className="rounded-full bg-surface px-3 py-0.5 text-[clamp(0.95rem,4.2cqmin,1.5rem)] font-extrabold text-ember-700 ring-1 ring-ember-200">{splitText(task)}</p>}
                    <Choices view={view} demo={demo} canPick={canPick} disabled={disabled} onPick={onPick} />
                </div>
            </div>
        </div>
    );
}

/** „2 + 1 = ?”: broj koji se traži je prazno polje sa upitnikom, a posle tačnog odgovora broj */
function NumberSentence({ task, solved, big }: { task: ArithmeticTask; solved: boolean; big: boolean }) {
    const { values, signs, result } = sentenceParts(task);
    const answer = taskAnswer(task);
    const cell = (value: number | null, key: string) =>
        value === null ? (
            <span
                key={key}
                className={cn(
                    "grid min-w-[1.6em] place-items-center rounded-xl border-[3px] px-1 leading-none",
                    solved ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-dashed border-ember-400 bg-surface text-ember-600"
                )}
            >
                {solved ? answer : "?"}
            </span>
        ) : (
            <span key={key}>{value}</span>
        );
    const parts: ReactNode[] = [];
    values.forEach((value, i) => {
        if (i > 0) parts.push(<span key={`s${i}`} className="text-ember-600">{signs[i - 1]}</span>);
        parts.push(cell(value, `v${i}`));
    });
    parts.push(<span key="eq" className="text-ember-600">=</span>);
    parts.push(cell(result, "r"));
    return (
        <p
            aria-label={`${values.map((v, i) => `${i > 0 ? `${signs[i - 1] === "+" ? "plus" : "minus"} ` : ""}${v ?? "koliko"}`).join(" ")} je ${result ?? "koliko"}`}
            className={cn(
                "flex items-center gap-[0.3em] rounded-2xl bg-surface px-[0.5em] py-[0.15em] font-display font-black tabular-nums text-ink shadow-soft ring-1 ring-line",
                big ? "text-[clamp(2.2rem,11cqmin,5rem)]" : "text-[clamp(1.6rem,7.5cqmin,3.25rem)]"
            )}
        >
            {parts}
        </p>
    );
}

function choiceState(view: ArithmeticView, value: number, answer: number): ChoiceState {
    if (view.feedback === "correct") return value === answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.selected === value) return "wrong";
    if (view.wrong.includes(value)) return "dimmed";
    if (view.hint && value === answer) return "hint";
    return "idle";
}

function Choices({ view, demo, canPick, disabled, onPick }: { view: ArithmeticView; demo: boolean; canPick: boolean; disabled: boolean; onPick: (value: number) => void }) {
    const task = view.task!;
    // Brojevi se pojave kad scena završi pokret (i na monitoru, po stanju igre)
    const ready = view.step >= moveCount(task);
    const answer = taskAnswer(task);
    const count = task.choices.length;
    return (
        <div
            role="group"
            aria-label="Brojevi"
            data-count={count}
            className={cn("ar-choices grid w-full gap-2 sm:gap-3", count === 2 ? "max-w-[24rem] grid-cols-2" : count === 3 ? "max-w-[34rem] grid-cols-3" : "max-w-[42rem] grid-cols-4", !ready && "invisible")}
        >
            {task.choices.map((value) => {
                const state = choiceState(view, value, answer);
                return (
                    <ChoiceCard
                        key={value}
                        data-action={`choice:${value}`}
                        state={state}
                        disabled={disabled || !canPick || (state !== "idle" && state !== "hint")}
                        onClick={() => onPick(value)}
                        aria-label={`${value}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                        className="ar-card-number animate-pop min-h-0 flex-col gap-1 p-1 sm:p-2"
                    >
                        <span aria-hidden="true" className="font-display font-black leading-none text-ink" style={{ fontSize: "var(--ar-digit)" }}>
                            {value}
                        </span>
                        {task.dots && (
                            <span aria-hidden="true" className="flex max-w-[4.6rem] flex-wrap justify-center gap-1">
                                {Array.from({ length: value }, (_, i) => (
                                    <span key={i} className="h-2.5 w-2.5 rounded-full bg-ember-500 sm:h-3 sm:w-3" />
                                ))}
                            </span>
                        )}
                        {demo && value === answer && <DemoHand />}
                    </ChoiceCard>
                );
            })}
        </div>
    );
}

/**
 * Veličine u odnosu na polje za igru (container query jedinice): scena 5 : 3, okviri jedan pored
 * drugog na širokom polju i jedan ispod drugog na uskom, kartice sa brojevima što veće.
 */
function ArithStyles() {
    return (
        <style>{`
.ar-card { width: min(100cqw, 100cqh * 1.5, 26rem); height: auto; }
.ar-frames { flex-direction: column; }
.ar-frame { width: min(100cqw, (100cqh - 2cqmin) / 2 * 540 / 236); height: auto; }
@container (min-aspect-ratio: 2/1) {
  .ar-frames { flex-direction: row; }
  .ar-frame { width: min((100cqw - 2cqmin) / 2, 100cqh * 540 / 236); }
}
.ar-choices { --ar-digit: clamp(1.9rem, min(11cqw, 9cqh), 4rem); }
.ar-card-number { height: clamp(4rem, min(22cqw, 17cqh), 7.5rem); }
@media (orientation: landscape) {
  .ar-choices { --ar-digit: clamp(1.9rem, min(7cqw, 13cqh), 4rem); }
  .ar-choices[data-count="4"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ar-card-number { height: clamp(3.5rem, min(14cqw, 24cqh), 7.5rem); }
}
`}</style>
    );
}
