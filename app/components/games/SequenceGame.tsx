"use client";

// Igra „Šta je prvo?”: gore su numerisana mesta (1, 2, 3…), dole izmešani koraci sa slikom.
// Dete dodiruje korak koji dolazi sledeći (bez prevlačenja), a on prelazi na svoje mesto.
// Kad je niz složen, glas ga prepriča redom („Prvo…, zatim…, na kraju…”) i uz svaki deo
// zasvetli njegovo mesto — isti obrazac „prvo–zatim” koji deca iz spektra poznaju iz
// vizuelnih rasporeda.
//
// Pomoć se povlači iz nivoa u nivo (data/sequences.ts): bleda senka tačne slike na praznom
// mestu → prvi korak je već na mestu kao primer → bez pomoći → kartice bez natpisa.

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
    isFemale,
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
import { buildSequenceLevel, getSequence, sequenceRule, type Sequence } from "@/app/components/games/data/sequences";
import { StepArt } from "@/app/components/games/sequence/StepArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

export interface SequenceView extends BaseView {
    sequenceId: string;
    /** Kartice koje dete slaže, redom na ekranu (indeksi koraka; bez koraka koji je dat kao primer) */
    order: number[];
    /** Koliko je koraka već na svom mestu (uvek prvih `placed`) */
    placed: number;
    /** Koliko je koraka na početku već bilo na mestu kao primer (0 ili 1) */
    model: number;
    /** Koraci probani pogrešno za trenutno mesto */
    wrong: number[];
    picked: number | null;
    feedback: FeedbackKind;
    hint: boolean;
    /** Da li je u ovom nizu bilo greške ili pomoći (za ocenu niza) */
    missed: boolean;
    helped: boolean;
    promptedCount: number;
    /** Prepričavanje posle složenog niza: koje mesto upravo svetli (−1 = nijedno) */
    told: number;
}

const GAME = getGame("sequence");
const WRONG_FEEDBACK_MS = 1400;
/** Jedan deo prepričavanja: najmanje ovoliko (i bez glasa), najviše dok glas ne završi */
const TELL_MIN_MS = 1100;
const TELL_MAX_MS = 5000;

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

function upperFirst(text: string): string {
    return text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);
}

/** „Prvo obučem čarape.” — reči se/ga/mu/me/je ostaju na drugom mestu (`retell`); rečenica sa navodnicima ostaje cela */
export function retellPart(sequence: Sequence, index: number): string {
    const step = sequence.steps[index];
    const body = step.retell ?? lowerFirst(step.text.replace(/\.$/, ""));
    return `${upperFirst(positionWord(index, sequence.steps.length))} ${body}${/[.!?”]$/.test(body) ? "" : "."}`;
}

/** Kad dete složi korak u kome nešto kaže: glas pročita korak i blago ponudi da i dete kaže rečenicu */
function placedText(step: Sequence["steps"][number]): string {
    return step.say ? `${step.text} Možeš i ti da kažeš: ${step.say}` : step.text;
}

/** Uputstvo za novi niz; kad je prvi korak dat kao primer, glas ga i imenuje */
function introFor(sequence: Sequence, model: number): string {
    if (model > 0) return `${sequence.title}. ${retellPart(sequence, 0)} ${questionFor(1, sequence.steps.length)}`;
    return `${sequence.title}. ${questionFor(0, sequence.steps.length)}`;
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
        model: 0,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        missed: false,
        helped: false,
        told: -1,
    };
}

/** Kartice za slaganje: koraci posle primera, izmešani */
function scrambled(count: number, model: number): number[] {
    const ordered = Array.from({ length: count - model }, (_, i) => i + model);
    // Dve kartice smeju i redom (pola–pola); duži niz nikad nije već složen
    if (ordered.length <= 2) return shuffle(ordered);
    for (let attempt = 0; attempt < 10; attempt += 1) {
        const mixed = shuffle(ordered);
        if (mixed.some((value, i) => value !== ordered[i])) return mixed;
    }
    return [...ordered].reverse();
}

/** Polja novog niza */
function roundStart(sequence: Sequence, model: number) {
    const given = Math.min(model, sequence.steps.length - 2);
    return { sequenceId: sequence.id, order: scrambled(sequence.steps.length, given), placed: given, model: given };
}

function mergeMonitor(state: Partial<SequenceView> | null | undefined): SequenceView {
    const base = emptyView(1);
    if (!state) return base;
    const sequence = typeof state.sequenceId === "string" ? getSequence(state.sequenceId) : undefined;
    const count = sequence?.steps.length ?? 0;
    const model = Math.min(toCount(state.model, 0), 1);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const order = toIndexList(state.order, count).filter((i) => i >= model);
    const valid = sequence !== undefined && order.length === count - model;
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        sequenceId: valid ? sequence.id : "",
        order: valid ? order : [],
        placed: Math.max(Math.min(toCount(state.placed, 0), count), model),
        model,
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((i) => order.includes(i)) : [],
        picked: typeof state.picked === "number" && order.includes(state.picked) ? state.picked : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
        told: typeof state.told === "number" && Number.isInteger(state.told) && state.told >= 0 && state.told < count ? state.told : -1,
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
    const rule = sequenceRule(level);
    const female = isFemale(gender);

    // Najmlađi slažu najviše tri koraka (choiceLimit: 3), stariji četiri ili pet
    const [plan] = useState<Sequence[]>(() => (isMonitor ? [] : buildSequenceLevel(level, { maxSteps: Math.max(2, settings.choiceLimit) })));
    const [view, setView] = useState<SequenceView>(() => ({
        ...emptyView(plan.length),
        ...(plan[0] ? roundStart(plan[0], rule.model ? 1 : 0) : {}),
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
        if (sequence) say(`Složi redom. ${introFor(sequence, viewRef.current.model)}`);
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
        const fields = roundStart(sequence, rule.model ? 1 : 0);
        commit(
            { ...viewRef.current, ...fields, round: index + 1, wrong: [], picked: null, feedback: null, hint: false, missed: false, helped: false, told: -1 },
            `Niz ${index + 1}: ${sequence.title}`
        );
        say(introFor(sequence, fields.model));
    };

    /** Prepričavanje: pohvala, pa deo po deo („Prvo …”, „Zatim …”), uz svaki zasvetli njegovo mesto */
    const tellBack = (sequence: Sequence, lead: string, done: () => void) => {
        const parts = sequence.steps.map((_, i) => retellPart(sequence, i));
        const step = (i: number) => {
            if (finishedRef.current) return;
            if (i >= parts.length) {
                commit({ ...viewRef.current, told: -1 });
                done();
                return;
            }
            commit({ ...viewRef.current, told: i });
            sayThen(i === 0 && lead ? `${lead} ${parts[i]}` : parts[i], () => step(i + 1), { emotion: "happy", min: TELL_MIN_MS, max: TELL_MAX_MS + (i === 0 && lead ? 2000 : 0) });
        };
        step(0);
    };

    const handlePick = (step: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const sequence = getSequence(current.sequenceId);
        if (!sequence || current.feedback === "correct" || step < current.placed || current.wrong.includes(step) || !current.order.includes(step)) return;
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
                say(`${placedText(sequence.steps[step])} ${questionFor(placed, total)}`);
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
            tellBack(sequence, praise("", firstTry).trim(), isLast ? finish : () => startRound(current.round));
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
        // Složen niz: ništa se ne pita (i ne prekida se prepričavanje)
        if (!sequence || current.feedback === "correct") return;
        say(current.placed === current.model ? introFor(sequence, current.model) : `${sequence.title}. ${questionFor(current.placed, sequence.steps.length)}`);
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
    // Na monitoru nivo nije poznat iz plana, ali pravilo zavisi samo od nivoa
    const ghost = rule.ghost;
    const captions = rule.captions;
    const cards = shown.order.length;

    return (
        <GameStage className="gap-3 sm:gap-4">
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Niz" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            {/* Položen telefon: uputstvo je jedan red u polju za igru, da niz i kartice budu krupni */}
            <GamePrompt
                key={`prompt-${sequence.id}`}
                className="animate-fade-up flat:hidden"
                compact
                title={sequence.title}
                subtitle={solved ? "Složeno!" : questionFor(shown.placed, total)}
            />

            <PlayArea accent={GAME.accent} className="gap-3 p-2.5 sm:gap-5 sm:p-4 flat:gap-2.5 flat:sm:gap-3">
                <p className="hidden text-center font-display text-lg font-extrabold leading-tight text-ink flat:block">
                    {sequence.title}
                    <span className="text-ink-soft"> · {solved ? "Složeno!" : questionFor(shown.placed, total)}</span>
                </p>
                {/* Mesta u nizu: složeni koraci sa slikom i brojem; prazna mesta isprekidana (uz senku tačne slike na lakim nivoima) */}
                <ol aria-label="Redosled" className={cn("grid w-full gap-1.5 sm:gap-3", SLOT_COLUMNS[total] ?? SLOT_COLUMNS[5], SLOT_WIDTH[total] ?? SLOT_WIDTH[5])}>
                    {sequence.steps.map((step, index) => {
                        const filled = index < shown.placed;
                        const next = index === shown.placed && !solved;
                        const telling = shown.told === index;
                        const given = index < shown.model;
                        return (
                            <li
                                key={index}
                                aria-label={filled ? `${index + 1}. ${step.text}${given ? " (primer)" : ""}` : `Mesto ${index + 1}, prazno`}
                                className={cn(
                                    "relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border-2 bg-white/60 p-1 text-center transition-[box-shadow,border-color] sm:p-1.5",
                                    filled ? "border-emerald-300 bg-white shadow-soft" : "border-dashed",
                                    next ? "border-brand-400" : !filled && "border-line",
                                    telling && "border-sun-400 ring-4 ring-sun-300"
                                )}
                            >
                                <span className="absolute left-1 top-0.5 z-10 grid h-5 min-w-5 place-items-center rounded-full bg-white/90 px-1 text-xs font-extrabold text-ink-soft sm:left-1.5 sm:top-1 sm:h-6 sm:min-w-6 sm:text-sm">{index + 1}</span>
                                <span className="relative block aspect-[3/2] w-full">
                                    {filled ? (
                                        <span key={`placed-${index}`} className={cn("absolute inset-0", !given && "animate-pop")}>
                                            <StepArt spec={step.art} female={female} className="h-full w-full rounded-xl" />
                                        </span>
                                    ) : ghost ? (
                                        // Senka: bleda slika tačnog koraka — dete uparuje karticu sa njom
                                        <span className="absolute inset-0 opacity-30 grayscale-[60%]">
                                            <StepArt spec={step.art} female={female} className="h-full w-full rounded-xl" />
                                        </span>
                                    ) : (
                                        <span className="absolute inset-0 grid place-items-center text-2xl font-extrabold text-ink-faint sm:text-3xl" aria-hidden="true">
                                            ?
                                        </span>
                                    )}
                                </span>
                                {/* Natpis složenog koraka: na telefonu su mesta uska, a na niskom ekranu nema mesta — tada samo slika i broj */}
                                {filled && <span className="mt-1 hidden text-xs font-bold leading-tight text-ink sm:line-clamp-2 sm:text-sm short:sm:hidden">{step.text}</span>}
                            </li>
                        );
                    })}
                </ol>

                {/* Koraci koji još čekaju svoje mesto */}
                <div role="group" aria-label="Koraci" className={cn("flex w-full flex-wrap justify-center gap-2 sm:gap-3", CARD_WIDTH[cards] ?? CARD_WIDTH[5], isMonitor && "pointer-events-none")}>
                    {shown.order.map((stepIndex) => {
                        // Složena kartica ostavlja prazno mesto iste širine: ostale kartice se ne pomeraju
                        if (stepIndex < shown.placed) return <span key={stepIndex} aria-hidden="true" className={CARD_BASIS[cards] ?? CARD_BASIS[5]} />;
                        const step = sequence.steps[stepIndex];
                        const state = cardState(shown, stepIndex);
                        return (
                            <ChoiceCard
                                key={stepIndex}
                                state={state}
                                disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(stepIndex)}
                                // Ključ poteza za zajedničku tablu: indeks koraka u nizu
                                data-action={`step:${stepIndex}`}
                                aria-label={`${step.text}${state === "wrong" ? ", netačno" : ""}`}
                                className={cn("min-h-0 flex-col justify-start gap-1 p-1.5 sm:gap-1.5 sm:p-2", CARD_BASIS[cards] ?? CARD_BASIS[5])}
                            >
                                <span className="block w-full max-w-[min(100%,28dvh)] short:max-w-[min(100%,20dvh)]">
                                    <StepArt spec={step.art} female={female} className="aspect-[3/2] w-full rounded-xl" />
                                </span>
                                {captions && <span className="line-clamp-2 text-xs font-bold leading-tight sm:text-base short:sm:text-sm">{step.text}</span>}
                                {/* Korak u kome dete nešto kaže: oznaka oblačića u uglu */}
                                {step.say && <TalkBadge />}
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

/** Mala oznaka „ovde se nešto kaže” na kartici koraka sa rečenicom */
function TalkBadge() {
    return (
        <span aria-hidden="true" className="absolute -left-1.5 -top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-white shadow-soft ring-2 ring-white sm:h-8 sm:w-8">
            <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor">
                <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
            </svg>
        </span>
    );
}

/** Mesta u nizu su uvek u jednom redu, i na telefonu (pune klase, bez sastavljanja u hodu) */
const SLOT_COLUMNS: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
};

/** Mesta su manja od kartica: ne smeju da odnesu visinu koju trebaju kartice */
const SLOT_WIDTH: Record<number, string> = {
    2: "max-w-[min(100%,46dvh)] short:max-w-[min(100%,38dvh)]",
    3: "max-w-[min(100%,66dvh)] short:max-w-[min(100%,54dvh)]",
    4: "max-w-[min(100%,84dvh)] short:max-w-[min(100%,70dvh)]",
    5: "max-w-[min(100%,100dvh)] short:max-w-[min(100%,86dvh)]",
};

/**
 * Širina kartice prema broju kartica (u redu sa razmakom 0,5 rem, od sm 0,75 rem). Na telefonu su
 * tri kartice dve pa jedna u sredini — veće slike; od sm sve u jednom redu. Uz `!`, jer ChoiceCard već ima `w-full`.
 */
const CARD_BASIS: Record<number, string> = {
    1: "w-full!",
    2: "w-[calc(50%-0.25rem)]! sm:w-[calc(50%-0.375rem)]!",
    3: "w-[calc(50%-0.25rem)]! sm:w-[calc(33.333%-0.5rem)]!",
    4: "w-[calc(50%-0.25rem)]! sm:w-[calc(25%-0.5625rem)]!",
    5: "w-[calc(33.333%-0.334rem)]! sm:w-[calc(20%-0.6rem)]!",
};

const CARD_WIDTH: Record<number, string> = {
    1: "max-w-xs",
    2: "max-w-xl",
    3: "max-w-3xl",
    4: "max-w-5xl",
    5: "max-w-6xl",
};
