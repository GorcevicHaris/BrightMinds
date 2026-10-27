"use client";

// Igra „Operi ruke i zube”: svakodnevna rutina korak po korak. Na slici je dete samo kod
// lavaboa; dete bira sledeći korak (voda, sapun, trljanje, ispiranje, peškir; pasta, četkanje,
// čaša vode…). Posle sapuna dete zaista „trlja” ruke (ili četka zube): mehurići rastu dok se
// broji, bez žurbe. Traka koraka „prvo — zatim” na lakim nivoima pokazuje sledeći korak, na
// srednjim je umesto njega „?”, na teškim je nema; teški nivoi pitaju i „Kada peremo ruke?”.
// Sadržaj i nivoi: data/hygieneLevels.ts.

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check } from "lucide-react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useCalmMotion } from "@/app/components/avatar/motion";
import {
    ChoiceCard,
    DemoHand,
    demoRounds,
    Feedback,
    GameHud,
    GamePrompt,
    GameStage,
    hintDue,
    isFemale,
    PlayArea,
    playSfx,
    useGameRandom,
    useGameSync,
    useIdle,
    useInputGuard,
    usePraise,
    useSayThen,
    useTimers,
    useWaitHint,
    type ChoiceState,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import { StepArt } from "@/app/components/games/sequence/StepArt";
import { RubBubbles, RubMeter, StepIcon } from "@/app/components/games/hygiene/HygieneArt";
import {
    buildHygieneLevel,
    emptyHygieneView,
    getStep,
    HANDS_START,
    hygieneResult,
    hygieneRule,
    introText,
    mergeHygieneMonitor,
    ROUTINES,
    rubDoneText,
    rubPrompt,
    rubStep,
    SITUATIONS,
    stepQuestion,
    TEETH_START,
    viewForRound,
    WHEN_QUESTION,
    wrongStepText,
    wrongWhenText,
    type HygieneRound,
    type HygieneView,
    type SituationId,
    type StepId,
} from "@/app/components/games/data/hygieneLevels";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("hygiene");
const WRONG_FEEDBACK_MS = 1400;
/** Trljanje: novi mehurić posle ovoliko px pokreta prsta (i ne češće od RUB_MIN_MS) */
const RUB_DISTANCE = 36;
const RUB_MIN_MS = 220;

function choiceState(view: HygieneView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.answer) return "hint";
    return "idle";
}

function wrongText(view: HygieneView, picked: string): string {
    return view.kind === "when" ? wrongWhenText(picked as SituationId) : wrongStepText(view.routine, view.index, picked as StepId);
}

function questionText(view: HygieneView): string {
    return view.kind === "when" ? WHEN_QUESTION : stepQuestion(view.index);
}

export default function HygieneGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<HygieneView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<HygieneView>({ childId, gameId: "hygiene", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();
    const female = isFemale(gender);

    const random = useGameRandom();
    const rule = hygieneRule(level);
    const [plan] = useState<HygieneRound[]>(() => (isMonitor ? [] : buildHygieneLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds, random })));
    const [view, setView] = useState<HygieneView>(() => (plan[0] ? viewForRound(emptyHygieneView(plan.length, rule), plan[0], 1) : emptyHygieneView(1, rule)));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const rubTrack = useRef<{ down: boolean; x: number; y: number; dist: number; last: number }>({ down: false, x: 0, y: 0, dist: 0, last: 0 });
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: HygieneView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    const demo = demoRounds(level, plan.length);

    // Početak nivoa: koju rutinu radimo, pa prvo pitanje
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const first = viewRef.current;
        say(first.kind === "when" ? `${WHEN_QUESTION}` : `${introText(first.routine)} ${questionText(first)}`);
    }, [isMonitor, sync, guard, say]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(hygieneResult(final, demo, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return finish();
        guard.hold();
        const next = viewForRound(viewRef.current, round, index + 1);
        const routineChanged = round.kind === "step" && viewRef.current.kind === "when";
        commit(next, `Zadatak ${index + 1}: ${round.kind === "when" ? WHEN_QUESTION : (getStep(round.step)?.label ?? "")}`);
        say(routineChanged ? `${introText(next.routine)} ${questionText(next)}` : questionText(next));
    };

    const nextOrFinish = () => {
        const current = viewRef.current;
        if (current.round >= current.totalRounds) finish();
        else startRound(current.round);
    };

    const startRub = () => {
        const current = viewRef.current;
        guard.hold();
        rubTrack.current = { down: false, x: 0, y: 0, dist: 0, last: 0 };
        commit({ ...current, rubbing: true, rub: 0 }, current.answer === "brush" ? "Četkanje počinje" : "Trljanje počinje");
        say(rubPrompt(current.answer as StepId), undefined, "gentle");
    };

    const handlePick = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.feedback === "correct" || current.wrong.includes(id) || current.rubbing) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;

        if (id === current.answer) {
            const modeled = demo > 0 && current.round === 1;
            const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
            const solved: HygieneView = {
                ...current,
                picked: id,
                feedback: "correct",
                hint: false,
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
            };
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
            const text = current.kind === "when" ? SITUATIONS[id as SituationId].text : (getStep(id)?.text ?? "");
            commit(solved, `Tačno ${how}: ${current.kind === "when" ? SITUATIONS[id as SituationId].label : (getStep(id)?.label ?? "")}`);
            playSfx("correct");
            const rub = current.kind === "step" && rubStep(id as StepId);
            sayThen(praise(text, firstTry), rub ? startRub : nextOrFinish, { emotion: "happy" });
            return;
        }

        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, current.choices.length - 1);
        const message = wrongText(current, id);
        commit({ ...current, picked: id, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${message}`);
        playSfx("wrong");
        say(message, undefined, "gentle");
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    /** Jedan mehurić više; kad ih je dovoljno, pohvala i dalje */
    const rubOnce = () => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (!current.rubbing || current.rub >= current.rubTarget) return;
        const rub = current.rub + 1;
        if (rub < current.rubTarget) {
            if (rub % 5 === 0) playSfx("tap");
            commit({ ...current, rub });
            return;
        }
        commit({ ...current, rub, rubbing: false }, current.answer === "brush" ? "Četkanje dovršeno" : "Trljanje dovršeno");
        playSfx("correct");
        sayThen(rubDoneText(current.answer as StepId, current.rubTarget), nextOrFinish, { emotion: "happy" });
    };

    const onRubDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
        rubTrack.current = { down: true, x: event.clientX, y: event.clientY, dist: 0, last: event.timeStamp };
        rubOnce();
    };
    const onRubMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const track = rubTrack.current;
        if (!track.down) return;
        track.dist += Math.hypot(event.clientX - track.x, event.clientY - track.y);
        track.x = event.clientX;
        track.y = event.clientY;
        if (track.dist >= RUB_DISTANCE && event.timeStamp - track.last >= RUB_MIN_MS) {
            track.dist = 0;
            track.last = event.timeStamp;
            rubOnce();
        }
    };
    const onRubUp = () => {
        rubTrack.current.down = false;
    };

    // Pomoć posle čekanja: pravi korak blago zasvetli (ne dok se trlja)
    useWaitHint(!isMonitor && settings.waitHint, view.round, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback || current.rubbing) return;
        if (demo > 0 && current.round === 1 && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const shown = isMonitor ? mergeHygieneMonitor(monitorState) : view;
    const rubIdle = useIdle(7000, `${shown.round}-${shown.rubbing}-${shown.rub}`);

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.rubbing) say(rubPrompt(current.answer as StepId), undefined, "gentle");
        else if (current.feedback !== "correct") say(questionText(current));
    };

    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    if (!shown.answer || shown.choices.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Korak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi korak" />
            </GameStage>
        );
    }

    const steps = ROUTINES[shown.routine];
    const solved = shown.feedback === "correct";
    const isStep = shown.kind === "step";
    // Slika: stanje posle poslednjeg urađenog koraka (posle tačnog izbora — posle ovog koraka)
    const doneIndex = isStep ? shown.index - (solved || shown.rubbing ? 0 : 1) : -1;
    const sceneSpec = doneIndex >= 0 ? getStep(steps[doneIndex])!.scene() : shown.routine === "teeth" ? TEETH_START() : HANDS_START();
    const showHand = !isMonitor && demo > 0 && shown.round === 1 && shown.wrong.length === 0 && !solved;
    const message = solved ? (isStep ? (getStep(shown.answer)?.text ?? "") : SITUATIONS[shown.answer as SituationId].text) : shown.feedback === "wrong" && shown.picked ? wrongText(shown, shown.picked) : "";
    const count = shown.choices.length;
    const unit = isStep ? "Korak" : "Pitanje";

    // ── Trljanje / četkanje ──
    if (isStep && (shown.rubbing || (shown.rub > 0 && solved))) {
        const target = shown.rubTarget;
        return (
            <GameStage split>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit={unit} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />
                <GamePrompt compact title={shown.answer === "brush" ? "Četkamo zube" : "Trljamo ruke"} subtitle={shown.answer === "brush" ? "Gore, dole i unutra" : "Dlanove, između prstiju i palčeve"} />
                <PlayArea accent={GAME.accent} className="gap-2 sm:gap-3">
                    <button
                        type="button"
                        // Ključ poteza za zajedničku tablu: jedan pokret trljanja
                        data-action="rub"
                        aria-label={shown.answer === "brush" ? "Četkaj zube" : "Trljaj ruke"}
                        disabled={!isMonitor && !shown.rubbing}
                        onPointerDown={isMonitor ? undefined : onRubDown}
                        onPointerMove={isMonitor ? undefined : onRubMove}
                        onPointerUp={onRubUp}
                        onPointerLeave={onRubUp}
                        onPointerCancel={onRubUp}
                        onClick={(event) => {
                            // Tastatura i zajednička tabla (dodir drugog deteta) — po jedan mehurić
                            if (event.detail === 0) rubOnce();
                        }}
                        className={cn(
                            "relative aspect-[3/2] w-full max-w-[min(100%,62dvh)] touch-none select-none overflow-hidden rounded-card ring-2 ring-mint-200 short:max-w-[min(100%,52dvh)] flat:max-w-[min(100%,52dvh)]",
                            shown.rubbing && rubIdle && !calm && "animate-soft-pulse",
                            isMonitor && "pointer-events-none"
                        )}
                    >
                        <StepArt spec={getStep(shown.answer)!.scene()} female={female} className="absolute inset-0 h-full w-full" />
                        <RubBubbles count={shown.rub} target={target} calm={calm} mouth={shown.answer === "brush"} className="absolute inset-0 h-full w-full" />
                    </button>
                    <RubMeter count={shown.rub} target={target} className="max-w-sm" />
                </PlayArea>
                <Feedback kind={shown.rubbing ? null : "correct"} correctText={rubDoneText(shown.answer as StepId, target)} />
            </GameStage>
        );
    }

    return (
        <GameStage split>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit={unit} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt
                key={`prompt-${shown.round}`}
                className="animate-fade-up"
                // Četiri izbora: manja slika, da sve stane bez skrolovanja
                compact={count >= 4}
                illustration={isStep ? <StepArt spec={sceneSpec} female={female} className="aspect-[3/2] h-auto w-full" /> : undefined}
                title={questionText(shown)}
            />

            <PlayArea accent={GAME.accent} className="gap-3">
                {isStep && shown.strip !== "none" && <StepStrip steps={steps} index={shown.index} mode={shown.strip} solved={solved} />}
                <div
                    role="group"
                    aria-label={isStep ? "Koraci" : "Slike"}
                    className={cn("grid w-full max-w-3xl gap-3 sm:gap-4", count === 2 ? "grid-cols-2" : count === 3 ? "grid-cols-3" : isStep ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4 flat:sm:grid-cols-2", isMonitor && "pointer-events-none")}
                >
                    {shown.choices.map((id) => {
                        const state = choiceState(shown, id);
                        const label = isStep ? (getStep(id)?.label ?? "") : SITUATIONS[id as SituationId].label;
                        return (
                            <ChoiceCard
                                key={`${shown.round}-${id}`}
                                state={state}
                                disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(id)}
                                // Ključ poteza za zajedničku tablu: korak ili situacija
                                data-action={isStep ? `step:${id}` : `when:${id}`}
                                aria-label={`${label}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className={cn("animate-pop flex-col gap-1.5 px-1.5 sm:gap-2", isStep ? (count <= 3 ? "min-h-32 sm:min-h-44" : "min-h-28 sm:min-h-40") : "min-h-0 p-2 sm:p-3", "flat:min-h-0 flat:sm:min-h-0 flat:py-2")}
                            >
                                {isStep ? (
                                    <StepIcon id={id as StepId} className={cn("shrink-0", count <= 3 ? "h-[clamp(4rem,14dvh,7rem)] w-[clamp(4rem,14dvh,7rem)]" : "h-[clamp(3.5rem,11dvh,6rem)] w-[clamp(3.5rem,11dvh,6rem)]")} />
                                ) : (
                                    <span className="block w-full overflow-hidden rounded-xl ring-1 ring-line">
                                        <StepArt spec={SITUATIONS[id as SituationId].scene} female={female} className="aspect-[3/2] h-auto max-h-[22dvh] w-full" />
                                    </span>
                                )}
                                <span className="text-base leading-tight sm:text-xl flat:sm:text-base">{label}</span>
                                {showHand && id === shown.answer && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}

/** Traka „prvo — zatim”: urađeni koraci (sa kvačicom), sledeći (svetli ili „?”), ostali prazni */
function StepStrip({ steps, index, mode, solved }: { steps: readonly StepId[]; index: number; mode: "next" | "mystery"; solved: boolean }) {
    return (
        <ol aria-label="Koraci" className="flex w-full max-w-xl items-center justify-center gap-1.5 sm:gap-2">
            {steps.map((id, i) => {
                const done = i < index || (i === index && solved);
                const current = i === index && !solved;
                const label = getStep(id)?.label ?? "";
                return (
                    <li
                        key={id}
                        aria-label={done ? `${label}, urađeno` : current ? (mode === "next" ? `${label}, sledeće` : "Sledeći korak") : "Kasnije"}
                        className={cn(
                            "relative grid aspect-square w-full max-w-16 place-items-center rounded-xl border-2 bg-white",
                            done && "border-mint-300 bg-mint-50",
                            current && "border-mint-500 ring-2 ring-mint-300",
                            !done && !current && (mode === "next" ? "border-line" : "border-dashed border-line")
                        )}
                    >
                        {/* Lako: ceo raspored se vidi (kasniji koraci bledo); srednje: kasniji koraci su prazni */}
                        {(done || mode === "next") && <StepIcon id={id} className={cn("h-[80%] w-[80%]", done && "opacity-60", !done && !current && "opacity-30")} />}
                        {current && mode === "mystery" && <span className="font-display text-2xl font-extrabold text-mint-700">?</span>}
                        {done && (
                            <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white ring-2 ring-white" aria-hidden="true">
                                <Check className="h-3 w-3" strokeWidth={3.5} />
                            </span>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
