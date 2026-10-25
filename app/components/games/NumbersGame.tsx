"use client";

// Igra „Brojevi”: dete piše cifre prstom (isti „motor” kao u igri „Slova”: tačka, numerisane
// strelice, gotov potez postaje obojena linija), prepoznaje broj, spaja broj sa tačkicama,
// popunjava prazno mesto u nizu („1 2 _ 4”) i poredi dva broja. Dopuna igri „Brojimo”:
// tamo se broje predmeti, ovde se uči znak broja.
// Nivoi 1–5: cifre debelo isprekidane, učitelj prvo pokaže poteze, broj ↔ tačkice do 5;
// 6–10: tanka linija, niz do 10, veći / manji; 11–15: prepisivanje po uzoru, brojevi do 20.

import { useCallback, useEffect, useRef, useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    DemoHand,
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
import {
    answerFor,
    answerShort,
    buildNumbersLevel,
    choiceLabel,
    emptyNumbersView,
    isTraceTask,
    mergeNumbersMonitor,
    numberGlyph,
    pickedSentence,
    promptTitle,
    questionFor,
    type NumberTask,
    type NumbersView,
} from "@/app/components/games/data/numbersItems";
import { outcomeFor, scoreSolved, traceResult } from "@/app/components/games/data/traceScore";
import { GlyphPicture, TracePad } from "@/app/components/games/TracePad";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("numbers");
const WRONG_FEEDBACK_MS = 1400;
const HINT_TEXT = "Gledaj kako ide.";

function choiceState(view: NumbersView, value: number): ChoiceState {
    const answer = view.task?.answer;
    if (view.feedback === "correct") return value === answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === value) return "wrong";
    if (view.wrong.includes(value)) return "dimmed";
    if (view.hint && value === answer) return "hint";
    return "idle";
}

/** Tačkice u okviru od deset (dva reda po pet); preko deset — dva okvira */
function DotFrames({ count, className }: { count: number; className?: string }) {
    const frames = count > 10 ? [10, count - 10] : [count];
    return (
        <span aria-hidden="true" className={cn("flex flex-col items-center gap-1.5", className)}>
            {frames.map((filled, f) => (
                <span key={f} className="grid w-full grid-cols-5 gap-[6%] rounded-xl border-2 border-blue-200 bg-white p-[6%]">
                    {Array.from({ length: 10 }, (_, i) => (
                        <span key={i} className={cn("aspect-square rounded-full", i < filled ? "bg-blue-500" : "bg-blue-50 ring-1 ring-inset ring-blue-100")} />
                    ))}
                </span>
            ))}
        </span>
    );
}

/** Niz brojeva sa praznim mestom („1 2 _ 4”); posle tačnog odgovora prazno mesto se popuni */
function NumberLine({ task, solved }: { task: NumberTask; solved: boolean }) {
    return (
        <div className="flex w-full max-w-2xl items-center justify-center gap-1.5 sm:gap-3" role="img" aria-label={`Niz: ${task.sequence.map((v, i) => (i === task.gap && !solved ? "prazno" : v)).join(", ")}`}>
            {task.sequence.map((value, i) => {
                const gap = i === task.gap;
                return (
                    <span
                        key={i}
                        className={cn(
                            "grid aspect-square w-[17%] max-w-24 place-items-center rounded-2xl border-2 font-display text-3xl font-black sm:text-5xl",
                            gap ? (solved ? "animate-pop border-emerald-500 bg-emerald-50 text-emerald-700" : "border-dashed border-brand-400 bg-brand-50 text-brand-300") : "border-line bg-surface text-ink shadow-soft"
                        )}
                    >
                        {gap && !solved ? "?" : value}
                    </span>
                );
            })}
        </div>
    );
}

export default function NumbersGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<NumbersView>) {
    const settings = useChildSettings();
    const sync = useGameSync<NumbersView>({ childId, gameId: "numbers", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    const [plan] = useState<NumberTask[]>(() => (isMonitor ? [] : buildNumbersLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds })));
    const [view, setView] = useState<NumbersView>(() => ({ ...emptyNumbersView(plan.length), task: plan[0] ?? null }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const [demoRun, setDemoRun] = useState(0);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: NumbersView, log?: string) => {
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
        const task = viewRef.current.task;
        if (!task) return;
        say(questionFor(task));
        if (isTraceTask(task) && task.demo) setDemoRun((run) => run + 1);
    }, [isMonitor, sync, guard, say]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(traceResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const task = plan[index];
        if (!task) return;
        guard.hold();
        commit({ ...viewRef.current, task, round: index + 1, strokesDone: 0, slips: 0, wrong: [], picked: null, feedback: null, hint: false, hintRun: 0 }, `Zadatak ${index + 1}: ${questionFor(task)}`);
        say(questionFor(task));
        if (isTraceTask(task) && task.demo) setDemoRun((run) => run + 1);
    };

    const solve = (current: NumbersView, mistakes: number, how: string) => {
        const task = current.task;
        if (!task) return;
        const outcome = outcomeFor(level, current.round, current.totalRounds, mistakes, current.hint);
        const label = outcome.modeled ? "(pokazni zadatak)" : outcome.firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(scoreSolved({ ...current, feedback: "correct" as const, picked: task.answer, hint: false }, outcome), `${how} ${label}: ${promptTitle(task)} → ${answerShort(task)}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(answerFor(task), outcome.firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy", min: 2200 });
    };

    const handleStrokeDone = () => {
        const current = viewRef.current;
        const task = current.task;
        if (isMonitor || finishedRef.current || !task || current.feedback === "correct") return;
        const strokes = numberGlyph(task.answer)?.strokes.length ?? 0;
        const strokesDone = current.strokesDone + 1;
        if (strokesDone >= strokes) {
            solve({ ...current, strokesDone }, current.slips, "Napisano");
            return;
        }
        playSfx("tap");
        commit({ ...current, strokesDone }, `Potez ${strokesDone} od ${strokes}`);
    };

    const showHint = (current: NumbersView, log: string, spoken = true) => {
        commit({ ...current, hint: true, hintRun: current.hintRun + 1 }, log);
        if (spoken) say(HINT_TEXT, undefined, "gentle");
    };

    const handleSlip = () => {
        const current = viewRef.current;
        if (isMonitor || finishedRef.current || !current.task || current.feedback === "correct") return;
        const slips = current.slips + 1;
        const next = { ...current, slips, incorrectCount: current.incorrectCount + 1 };
        if (hintDue(settings.hintAfter, slips, Number.POSITIVE_INFINITY)) showHint(next, "Izašlo iz linije — pomoć: tačka pokazuje potez");
        else commit(next, "Izašlo iz linije");
    };

    const handlePick = (value: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const task = current.task;
        if (!task || isTraceTask(task) || current.feedback === "correct" || current.wrong.includes(value) || !task.choices.includes(value)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        if (value === task.answer) {
            solve(current, current.wrong.length, "Tačno");
            return;
        }
        const wrong = [...current.wrong, value];
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, task.choices.length - 1);
        commit({ ...current, picked: value, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${promptTitle(task)} → ${value}`);
        playSfx("wrong");
        say(`Netačno. ${pickedSentence(task, value)} ${hint ? "" : "Probaj ponovo."}`.trim(), undefined, "gentle");
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    useWaitHint(!isMonitor && settings.waitHint, `${view.round}-${view.strokesDone}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || !current.task) return;
        if (isTraceTask(current.task)) {
            showHint(current, "Pomoć posle čekanja: tačka pokazuje potez", false);
            return;
        }
        if (current.hint) return;
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (!current.task || current.feedback === "correct") return;
        say(questionFor(current.task));
        if (isTraceTask(current.task) && current.task.demo) setDemoRun((run) => run + 1);
    };

    const shown = isMonitor ? mergeNumbersMonitor(monitorState) : view;
    const task = shown.task;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (!task) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const tracing = isTraceTask(task);
    const glyph = numberGlyph(task.answer);
    const message = solved ? answerShort(task) : shown.feedback === "wrong" && shown.picked !== null ? pickedSentence(task, shown.picked) : "";
    const showHand = !isMonitor && !tracing && demoRounds(level, shown.totalRounds) > 0 && shown.round === 1 && shown.wrong.length === 0 && !solved;
    // Uz pisanje i „Gde ima toliko tačkica?”: količina ili broj u kartici sa uputstvom
    const visual =
        task.kind === "match" && glyph ? (
            <GlyphPicture glyph={glyph} color="#1d4ed8" className="h-[80%] w-[80%]" />
        ) : tracing && task.answer > 0 && task.answer <= 10 ? (
            <DotFrames count={task.answer} className="w-[86%]" />
        ) : undefined;

    return (
        <GameStage split>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up" compact visual={visual} title={promptTitle(task)} />

            <PlayArea accent={GAME.accent} className="relative gap-4 p-2 sm:gap-6 sm:p-4">
                {tracing && glyph ? (
                    // Nizak ekran: tabla dobija ono što ostane posle zaglavlja, uputstva i poruke (bar 12rem)
                    <div className="flex h-[min(48dvh,34rem)] w-full max-w-3xl items-stretch justify-center gap-2 sm:gap-4 short:h-[max(12rem,calc(100dvh-29rem))] flat:h-[calc(60dvh-2rem)]">
                        {task.guide === "copy" && (
                            <div className="flex w-[26%] max-w-44 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-line bg-surface p-2 shadow-soft">
                                <GlyphPicture glyph={glyph} className="h-full max-h-40 w-full" />
                                <span className="text-sm font-extrabold text-ink-soft">Uzor</span>
                            </div>
                        )}
                        <div className="relative flex min-w-0 flex-1 rounded-3xl border-2 border-line bg-surface shadow-soft">
                            <TracePad
                                key={`pad-${shown.round}`}
                                glyph={glyph}
                                guide={task.guide}
                                strokesDone={shown.strokesDone}
                                demoRun={task.demo && !isMonitor ? demoRun : 0}
                                hintRun={shown.hintRun}
                                disabled={isMonitor || solved}
                                onStrokeDone={handleStrokeDone}
                                onSlip={handleSlip}
                                label={`Tabla za pisanje: broj ${task.answer}`}
                                className="h-full"
                            />
                            {solved && task.answer > 0 && task.answer <= 10 && (
                                // Broj „oživi”: pojavi se toliko tačkica
                                <div aria-hidden="true" className="pointer-events-none absolute right-2 top-2 w-24 animate-pop sm:right-4 sm:top-4 sm:w-36">
                                    <DotFrames count={task.answer} />
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {task.kind === "missing" && <NumberLine task={task} solved={solved} />}
                        <div
                            role="group"
                            aria-label={task.kind === "match" ? "Tačkice" : "Brojevi"}
                            className={cn(
                                "grid w-full gap-3 sm:gap-4",
                                task.choices.length <= 2 ? "max-w-md grid-cols-2" : task.choices.length === 3 ? "max-w-xl grid-cols-3" : "max-w-3xl grid-cols-4",
                                isMonitor && "pointer-events-none"
                            )}
                        >
                            {task.choices.map((value) => {
                                const state = choiceState(shown, value);
                                const choiceGlyph = numberGlyph(value);
                                return (
                                    <ChoiceCard
                                        key={`${shown.round}-${value}`}
                                        state={state}
                                        disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                        onClick={() => handlePick(value)}
                                        aria-label={`${choiceLabel(task, value)}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                        className={cn("min-h-0 animate-pop p-2 sm:p-3", task.kind === "match" ? "" : "aspect-square short:sm:max-h-[30dvh]")}
                                    >
                                        {task.kind === "match" ? (
                                            <DotFrames count={value} className="w-full max-w-56 py-1 sm:py-3" />
                                        ) : (
                                            choiceGlyph && <GlyphPicture glyph={choiceGlyph} color={state === "correct" ? "#047857" : "#2b2552"} className="h-full max-h-36 w-full" />
                                        )}
                                        {showHand && value === task.answer && <DemoHand />}
                                    </ChoiceCard>
                                );
                            })}
                        </div>
                    </>
                )}
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}
