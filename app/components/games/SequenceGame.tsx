"use client";

// Igra „Šta je prvo?”: gore su numerisana prazna mesta (1, 2, 3…), dole izmešani koraci.
// Dete dodiruje korak koji dolazi sledeći (bez prevlačenja), a on prelazi na svoje mesto.
// Kad je niz složen, glas ga pročita redom: „Prvo…, zatim…, na kraju…” — isti obrazac
// „prvo–zatim” koji deca iz spektra poznaju iz vizuelnih rasporeda.

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
    listenLimitFor,
    PlayArea,
    playSfx,
    shuffle,
    toCount,
    toIndexList,
    useGameSync,
    useInputGuard,
    usePraise,
    useSayThen,
    useTimers,
    useWaitHint,
    type BaseView,
    type ChoiceState,
    type FeedbackKind,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import { buildSequenceLevel, getSequence, type Sequence } from "@/app/components/games/data/sequences";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

export interface SequenceView extends BaseView {
    sequenceId: string;
    /** Redosled kojim su koraci izmešani na ekranu (indeksi koraka) */
    order: number[];
    /** Koliko je koraka već na svom mestu (uvek prvih `placed`) */
    placed: number;
    /** Koraci probani pogrešno za trenutno mesto */
    wrong: number[];
    picked: number | null;
    feedback: FeedbackKind;
    hint: boolean;
    /** Da li je u ovom nizu bilo greške ili pomoći (za ocenu niza) */
    missed: boolean;
    helped: boolean;
    promptedCount: number;
}

const GAME = getGame("sequence");
const WRONG_FEEDBACK_MS = 1400;

/** Reč za mesto u nizu: prvo, zatim, na kraju (u nizu od dva koraka: prvo, posle) */
function positionWord(index: number, total: number): string {
    if (index === 0) return "prvo";
    if (total === 2) return "posle";
    return index === total - 1 ? "na kraju" : "zatim";
}

function questionFor(index: number, total: number): string {
    if (index === 0) return "Šta je prvo?";
    if (total === 2) return "Šta je posle?";
    return index === total - 1 ? "Šta je na kraju?" : "Šta je zatim?";
}

function lowerFirst(text: string): string {
    return text.charAt(0).toLocaleLowerCase("sr") + text.slice(1);
}

/** „Prvo obučem čarape, posle obujem patike.” — reči se/ga/mu/me/je ostaju na drugom mestu (`retell`) */
function retell(sequence: Sequence): string {
    const parts = sequence.steps.map((step, i) => `${positionWord(i, sequence.steps.length)} ${step.retell ?? lowerFirst(step.text.replace(/\.$/, ""))}`);
    const sentence = parts.join(", ");
    return `${sentence.charAt(0).toLocaleUpperCase("sr")}${sentence.slice(1)}.`;
}

function emptyView(totalRounds: number): SequenceView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        sequenceId: "",
        order: [],
        placed: 0,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        missed: false,
        helped: false,
    };
}

/** Izmešani koraci, ali nikad već složeni redom (inače bi zadatak bio rešen pre početka) */
function scrambled(count: number): number[] {
    const ordered = Array.from({ length: count }, (_, i) => i);
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const mixed = shuffle(ordered);
        if (mixed.some((value, i) => value !== i)) return mixed;
    }
    return [...ordered].reverse();
}

function mergeMonitor(state: Partial<SequenceView> | null | undefined): SequenceView {
    const base = emptyView(1);
    if (!state) return base;
    const sequence = typeof state.sequenceId === "string" ? getSequence(state.sequenceId) : undefined;
    const count = sequence?.steps.length ?? 0;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const order = toIndexList(state.order, count);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        sequenceId: sequence && order.length === count ? sequence.id : "",
        order: order.length === count ? order : [],
        placed: Math.min(toCount(state.placed, 0), count),
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((i) => order.includes(i)) : [],
        picked: typeof state.picked === "number" && order.includes(state.picked) ? state.picked : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
    };
}

function cardState(view: SequenceView, step: number): ChoiceState {
    if (view.feedback === "wrong" && view.picked === step) return "wrong";
    if (view.wrong.includes(step)) return "dimmed";
    if (view.hint && step === view.placed) return "hint";
    return "idle";
}

export default function SequenceGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<SequenceView>) {
    const settings = useChildSettings();
    const sync = useGameSync<SequenceView>({ childId, gameId: "sequence", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Najmlađi slažu najviše tri koraka (choiceLimit: 3), stariji četiri ili pet
    const [plan] = useState<Sequence[]>(() => (isMonitor ? [] : buildSequenceLevel(level, { maxSteps: Math.max(2, settings.choiceLimit) })));
    const [view, setView] = useState<SequenceView>(() => ({
        ...emptyView(plan.length),
        sequenceId: plan[0]?.id ?? "",
        order: plan[0] ? scrambled(plan[0].steps.length) : [],
    }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: SequenceView, log?: string) => {
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
        const sequence = getSequence(viewRef.current.sequenceId);
        if (sequence) say(`Složi redom. ${sequence.title}. Šta je prvo?`);
    }, [isMonitor, sync, guard, say]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        // total = nizovi bez pokaznog (prvi u prvom nivou); correct = složeni bez greške i bez pomoći
        onCompleteRef.current({
            score: final.score,
            durationSec: sync.elapsedSec(),
            correct: final.correctCount,
            total: Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1),
            prompted: final.promptedCount,
        });
    };

    const startRound = (index: number) => {
        const sequence = plan[index];
        if (!sequence) return;
        guard.hold();
        commit(
            { ...viewRef.current, sequenceId: sequence.id, order: scrambled(sequence.steps.length), round: index + 1, placed: 0, wrong: [], picked: null, feedback: null, hint: false, missed: false, helped: false },
            `Niz ${index + 1}: ${sequence.title}`
        );
        say(`${sequence.title}. Šta je prvo?`);
    };

    const handlePick = (step: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const sequence = getSequence(current.sequenceId);
        if (!sequence || current.feedback === "correct" || step < current.placed || current.wrong.includes(step)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const total = sequence.steps.length;

        if (step === current.placed) {
            const placed = current.placed + 1;
            const helped = current.helped || current.hint;
            if (placed < total) {
                // Korak je na mestu: kratko se imenuje, pa pitanje za sledeće mesto
                commit({ ...current, placed, wrong: [], picked: null, feedback: null, hint: false, helped }, `Na mestu ${placed}: ${sequence.steps[step].text}`);
                playSfx("tap");
                say(`${sequence.steps[step].text} ${questionFor(placed, total)}`);
                return;
            }
            // Ceo niz je složen
            const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
            const firstTry = !current.missed && !helped && !modeled;
            const solved: SequenceView = {
                ...current,
                placed,
                wrong: [],
                picked: null,
                feedback: "correct",
                hint: false,
                helped,
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
            };
            const how = modeled ? "(pokazni niz)" : firstTry ? "bez greške" : helped ? "uz pomoć" : "posle pokušaja";
            commit(solved, `Niz složen ${how}: ${sequence.title}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            // Dug niz se prepričava i do petnaestak sekundi: sledeći niz ne sme da ga preseče
            const told = praise(retell(sequence), firstTry);
            sayThen(told, isLast ? finish : () => startRound(current.round), { emotion: "happy", max: Math.max(9000, listenLimitFor(told)) });
            return;
        }

        const wrong = [...current.wrong, step];
        const remaining = total - current.placed;
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, remaining - 1);
        commit(
            { ...current, picked: step, feedback: "wrong", wrong, hint, missed: true, incorrectCount: current.incorrectCount + 1 },
            `Netačno za mesto ${current.placed + 1}: ${sequence.steps[step].text}`
        );
        playSfx("wrong");
        say(`Netačno. To dolazi kasnije. ${questionFor(current.placed, total)}`, undefined, "gentle");
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    // Pomoć posle čekanja: korak koji dolazi sledeći blago zasvetli
    useWaitHint(!isMonitor && settings.waitHint, `${view.round}:${view.placed}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (demoRounds(level, current.totalRounds) > 0 && current.round === 1 && !current.missed) return; // tu pokazuje ruka
        // Ostao je samo jedan korak: nema šta da se bira, pa ni pomoć ne sme da „pokvari” niz
        const sequence = getSequence(current.sequenceId);
        if (!sequence || sequence.steps.length - current.placed <= 1) return;
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        const sequence = getSequence(current.sequenceId);
        // Složen niz: ništa se ne pita (i ne prekida se pohvala koja upravo teče)
        if (!sequence || current.feedback === "correct") return;
        say(`${sequence.title}. ${questionFor(current.placed, sequence.steps.length)}`);
    };

    const shown = isMonitor ? mergeMonitor(monitorState) : view;
    const sequence = getSequence(shown.sequenceId);
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (!sequence || shown.order.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const total = sequence.steps.length;
    const solved = shown.feedback === "correct";
    const showHand = !isMonitor && demoRounds(level, shown.totalRounds) > 0 && shown.round === 1 && !shown.missed && !solved;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Niz" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt
                key={`prompt-${sequence.id}`}
                className="animate-fade-up"
                compact
                title={sequence.title}
                subtitle={solved ? "Složeno!" : questionFor(shown.placed, total)}
            />

            <PlayArea accent={GAME.accent}>
                {/* Mesta u nizu: složeni koraci sa brojem, prazna mesta isprekidana */}
                <ol aria-label="Redosled" className={cn("mb-4 grid w-full max-w-4xl gap-1.5 sm:mb-6 sm:gap-3", SLOT_COLUMNS[total] ?? SLOT_COLUMNS[5])}>
                    {sequence.steps.map((step, index) => {
                        const filled = index < shown.placed;
                        const next = index === shown.placed && !solved;
                        return (
                            <li
                                key={index}
                                className={cn(
                                    "relative flex min-h-[4.5rem] flex-col items-center justify-center gap-0.5 rounded-2xl border-2 p-1.5 text-center sm:min-h-28 sm:gap-1 sm:p-2",
                                    filled ? "border-emerald-300 bg-white shadow-soft" : "border-dashed bg-white/60",
                                    next ? "border-brand-300" : !filled && "border-line"
                                )}
                            >
                                <span className="absolute left-1.5 top-1 text-sm font-extrabold text-ink-soft">{index + 1}</span>
                                {filled ? (
                                    <>
                                        <span key={`placed-${index}`} className="animate-pop text-3xl leading-none sm:text-5xl" aria-hidden="true">
                                            {step.emoji}
                                        </span>
                                        {/* Na telefonu su mesta uska: sličica i broj su dovoljni, rečenica je na kartici i u glasu */}
                                        <span className="hidden text-sm font-bold leading-tight text-ink sm:line-clamp-2">{step.text}</span>
                                    </>
                                ) : (
                                    <span className="text-2xl font-extrabold text-ink-faint" aria-label={`Mesto ${index + 1}, prazno`}>
                                        ?
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ol>

                {/* Koraci koji još čekaju svoje mesto */}
                <div role="group" aria-label="Koraci" className={cn("grid w-full max-w-4xl gap-3", COLUMNS[total] ?? COLUMNS[5], isMonitor && "pointer-events-none")}>
                    {shown.order.map((stepIndex) => {
                        if (stepIndex < shown.placed) return <span key={stepIndex} aria-hidden="true" />;
                        const step = sequence.steps[stepIndex];
                        const state = cardState(shown, stepIndex);
                        return (
                            <ChoiceCard
                                key={stepIndex}
                                state={state}
                                disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(stepIndex)}
                                aria-label={`${step.text}${state === "wrong" ? ", netačno" : ""}`}
                                className="min-h-24 flex-col gap-1 px-2 py-2 sm:min-h-32 sm:gap-1.5"
                            >
                                <span className="text-4xl leading-none sm:text-5xl" aria-hidden="true">
                                    {step.emoji}
                                </span>
                                <span className="text-sm font-bold leading-tight sm:text-base">{step.text}</span>
                                {showHand && stepIndex === shown.placed && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>

            {/* Kratko, da se raspored ne pomeri; ceo niz se čuje i vidi u mestima iznad */}
            <Feedback kind={shown.feedback} correctText="Složeno!" wrongText="Netačno. To dolazi kasnije." />
        </GameStage>
    );
}

/** Mesta u nizu su uvek u jednom redu, i na telefonu (pune klase, bez sastavljanja u hodu) */
const SLOT_COLUMNS: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
};

/** Kolone koraka za biranje prema broju koraka */
const COLUMNS: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-3 sm:grid-cols-5",
};
