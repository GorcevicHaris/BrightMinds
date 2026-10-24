"use client";

// Igra „Slova”: dete precrtava slovo prstom ili mišem, potez po potez, prateći tačku i
// numerisane strelice. Gotov potez postaje obojena linija, a gotovo slovo „oživi”: pojavi se
// slika reči koja tim slovom počinje („A kao auto”). Između precrtavanja: „Gde je slovo…?”,
// a na vrhu „Koje slovo čuješ na početku reči…?” i prvo slovo detetovog imena.
// Nivoi 1–5: velika slova, debelo isprekidano slovo, učitelj prvo pokaže poteze;
// 6–10: tanka linija, slova sa kvačicama, dvoslovi i mala slova;
// 11–15: prepisivanje po uzoru samo sa početnom tačkom, prvi glas u reči, ime.
// Pomoć (posle izlaska iz linije ili čekanja): tačka ponovo polako napiše potez.

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
    buildLettersLevel,
    choiceLabel,
    emptyLettersView,
    getLetter,
    glyphForLetter,
    isTraceKind,
    letterAndWord,
    letterChar,
    mergeLettersMonitor,
    pickedSentence,
    promptTitle,
    questionFor,
    wordRest,
    type LetterTask,
    type LettersView,
} from "@/app/components/games/data/lettersItems";
import { outcomeFor, scoreSolved, traceResult } from "@/app/components/games/data/traceScore";
import { GlyphPicture, TracePad } from "@/app/components/games/TracePad";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("letters");
const WRONG_FEEDBACK_MS = 1400;
const HINT_TEXT = "Gledaj kako ide.";

function choiceState(view: LettersView, id: string): ChoiceState {
    const answer = view.task?.letter;
    if (view.feedback === "correct") return id === answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === answer) return "hint";
    return "idle";
}

/** Natpis zadatka: slovo ostaje malo i uz „SVA SLOVA VELIKA” */
function TaskTitle({ task }: { task: LetterTask }) {
    const { lead, letter, tail } = promptTitle(task);
    return (
        <>
            {lead}
            {letter && (
                <>
                    {" "}
                    <span className="normal-case text-brand-700">{letter}</span>
                </>
            )}
            {tail}
        </>
    );
}

export default function LettersGame({ childId, level, gender, childName, onComplete, isMonitor = false, monitorState }: GameProps<LettersView>) {
    const settings = useChildSettings();
    const sync = useGameSync<LettersView>({ childId, gameId: "letters", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju samo jednom, ovde
    const [plan] = useState<LetterTask[]>(() =>
        isMonitor ? [] : buildLettersLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds, script: settings.script, childName })
    );
    const [view, setView] = useState<LettersView>(() => ({ ...emptyLettersView(plan.length), task: plan[0] ?? null }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    /** Model (učitelj pokaže sve poteze): menja se na početku zadatka u lakom nivou i na „Ponovi” */
    const [demoRun, setDemoRun] = useState(0);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: LettersView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    // Početak nivoa: prvo uputstvo; u lakom nivou učitelj odmah pokaže poteze
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const task = viewRef.current.task;
        if (!task) return;
        say(questionFor(task));
        if (isTraceKind(task.kind) && task.demo) setDemoRun((run) => run + 1);
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
        commit(
            { ...viewRef.current, task, round: index + 1, strokesDone: 0, slips: 0, wrong: [], picked: null, feedback: null, hint: false, hintRun: 0 },
            `Zadatak ${index + 1}: ${questionFor(task)}`
        );
        say(questionFor(task));
        if (isTraceKind(task.kind) && task.demo) setDemoRun((run) => run + 1);
    };

    /** Rešen zadatak: slovo „oživi” (slika i reč), pohvala, pa sledeći zadatak */
    const solve = (current: LettersView, mistakes: number, how: string) => {
        const task = current.task;
        if (!task) return;
        const outcome = outcomeFor(level, current.round, current.totalRounds, mistakes, current.hint);
        const label = outcome.modeled ? "(pokazni zadatak)" : outcome.firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        const next = scoreSolved({ ...current, feedback: "correct" as const, picked: task.letter, hint: false }, outcome);
        commit(next, `${how} ${label}: ${letterAndWord(task)}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(answerFor(task), outcome.firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy", min: 2200 });
    };

    const handleStrokeDone = () => {
        const current = viewRef.current;
        const task = current.task;
        if (isMonitor || finishedRef.current || !task || current.feedback === "correct") return;
        const strokes = glyphForLetter(task.letter, task.script, task.lower)?.strokes.length ?? 0;
        const strokesDone = current.strokesDone + 1;
        if (strokesDone >= strokes) {
            solve({ ...current, strokesDone }, current.slips, "Napisano");
            return;
        }
        playSfx("tap");
        commit({ ...current, strokesDone }, `Potez ${strokesDone} od ${strokes}`);
    };

    const showHint = (current: LettersView, log: string, spoken = true) => {
        commit({ ...current, hint: true, hintRun: current.hintRun + 1 }, log);
        if (spoken) say(HINT_TEXT, undefined, "gentle");
    };

    const handleSlip = () => {
        const current = viewRef.current;
        if (isMonitor || finishedRef.current || !current.task || current.feedback === "correct") return;
        const slips = current.slips + 1;
        const next = { ...current, slips, incorrectCount: current.incorrectCount + 1 };
        // Pomoć stiže posle onoliko izlazaka koliko je roditelj podesio (pa opet posle svakog sledećeg)
        if (hintDue(settings.hintAfter, slips, Number.POSITIVE_INFINITY)) showHint(next, "Izašlo iz linije — pomoć: tačka pokazuje potez");
        else commit(next, "Izašlo iz linije");
    };

    const handlePick = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const task = current.task;
        if (!task || isTraceKind(task.kind) || current.feedback === "correct" || current.wrong.includes(id) || !task.choices.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        if (id === task.letter) {
            solve(current, current.wrong.length, "Tačno");
            return;
        }
        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, task.choices.length - 1);
        commit({ ...current, picked: id, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${getLetter(id)?.name ?? id}`);
        playSfx("wrong");
        say(`Netačno. ${pickedSentence(task, id)} ${hint ? "" : "Probaj ponovo."}`.trim(), undefined, "gentle");
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    // Pomoć posle čekanja: tačka pokaže potez (ili tačna kartica blago zasvetli)
    useWaitHint(!isMonitor && settings.waitHint, `${view.round}-${view.strokesDone}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || !current.task) return;
        if (isTraceKind(current.task.kind)) {
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
        // U lakim nivoima „Ponovi” ponovo pokaže i poteze (to je deo nivoa, ne pomoć)
        if (isTraceKind(current.task.kind) && current.task.demo) setDemoRun((run) => run + 1);
    };

    const shown = isMonitor ? mergeLettersMonitor(monitorState) : view;
    const task = shown.task;
    const item = task ? getLetter(task.letter) : undefined;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (!task || !item) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const tracing = isTraceKind(task.kind);
    const glyph = glyphForLetter(task.letter, task.script, task.lower);
    const message = solved ? letterAndWord(task) : shown.feedback === "wrong" && shown.picked ? pickedSentence(task, shown.picked) : "";
    const showHand = !isMonitor && !tracing && demoRounds(level, shown.totalRounds) > 0 && shown.round === 1 && shown.wrong.length === 0 && !solved;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt
                key={`prompt-${shown.round}`}
                className="animate-fade-up"
                compact
                visual={<span aria-hidden="true">{item.emoji}</span>}
                title={<TaskTitle task={task} />}
                subtitle={
                    task.kind === "first" ? (
                        <span className="inline-flex items-center gap-1 font-display text-2xl font-extrabold tracking-wider text-ink sm:text-3xl" aria-label={`Reč bez prvog slova: ${wordRest(task)}`}>
                            <span
                                className={cn(
                                    "inline-grid h-[1.15em] min-w-[1.15em] place-items-center rounded-lg border-[3px] px-0.5 align-middle leading-none",
                                    solved ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-dashed border-brand-400 bg-brand-50"
                                )}
                            >
                                {solved ? letterChar(task.letter, task.script, false) : ""}
                            </span>
                            {wordRest(task)}
                        </span>
                    ) : undefined
                }
            />

            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-4">
                {tracing && glyph ? (
                    <div className="flex h-[min(50dvh,34rem)] w-full max-w-3xl items-stretch justify-center gap-2 sm:gap-4 short:h-[44dvh]">
                        {task.guide === "copy" && (
                            // Uzor za prepisivanje: slovo sa strane, na tabli je samo početna tačka
                            <div className="flex w-[26%] max-w-44 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-line bg-surface p-2 shadow-soft">
                                <GlyphPicture glyph={glyph} className="h-full max-h-40 w-full" />
                                <span className="text-xs font-extrabold text-ink-soft sm:text-sm">Uzor</span>
                            </div>
                        )}
                        <div className="relative flex min-w-0 flex-1 rounded-3xl border-2 border-line bg-surface shadow-soft">
                            <TracePad
                                key={`pad-${shown.round}`}
                                glyph={glyph}
                                guide={task.guide}
                                lines={task.lower ? "lower" : "upper"}
                                strokesDone={shown.strokesDone}
                                demoRun={task.demo && !isMonitor ? demoRun : 0}
                                hintRun={shown.hintRun}
                                disabled={isMonitor || solved}
                                onStrokeDone={handleStrokeDone}
                                onSlip={handleSlip}
                                label={`Tabla za pisanje: ${letterAndWord(task)}`}
                                className="h-full"
                            />
                            {solved && (
                                // Slovo „oživi”: slika reči koja počinje ovim slovom
                                <div aria-hidden="true" className="pointer-events-none absolute right-2 top-2 grid animate-pop place-items-center rounded-2xl bg-sun-50 px-3 py-2 text-5xl shadow-soft ring-2 ring-sun-200 sm:right-4 sm:top-4 sm:text-7xl">
                                    {item.emoji}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div
                        role="group"
                        aria-label="Slova"
                        className={cn("grid w-full gap-3 sm:gap-4", task.choices.length <= 2 ? "max-w-md grid-cols-2" : task.choices.length === 3 ? "max-w-xl grid-cols-3" : "max-w-3xl grid-cols-4", isMonitor && "pointer-events-none")}
                    >
                        {task.choices.map((id) => {
                            const state = choiceState(shown, id);
                            const choiceGlyph = glyphForLetter(id, task.script, task.lower);
                            return (
                                <ChoiceCard
                                    key={`${shown.round}-${id}`}
                                    state={state}
                                    disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                    onClick={() => handlePick(id)}
                                    aria-label={`${choiceLabel(task, id)}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                    className="aspect-square min-h-0 animate-pop p-2 sm:p-3 short:sm:max-h-[30dvh]"
                                >
                                    {choiceGlyph && <GlyphPicture glyph={choiceGlyph} color={state === "correct" ? "#047857" : "#2b2552"} className="h-full max-h-36 w-full" />}
                                    {showHand && id === task.letter && <DemoHand />}
                                </ChoiceCard>
                            );
                        })}
                    </div>
                )}
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}
