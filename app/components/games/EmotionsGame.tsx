"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import {
    ChoiceCard,
    ExplainPanel,
    Feedback,
    GameHud,
    GamePrompt,
    GameStage,
    genderText,
    isFemale,
    playSfx,
    shuffle,
    useGameSync,
    type BaseView,
    type ChoiceState,
    type FeedbackKind,
    type GameProps,
} from "@/app/components/games/kit";
import {
    EMOTIONS,
    EMOTION_ORDER,
    distractorsFor,
    getEmotionLevel,
    getScenario,
    inEmotionOrder,
    type EmotionId,
} from "./data/emotionScenarios";

// ── Stanje ────────────────────────────────────────────────────────────────────
// Sve što utiče na prikaz je u jednom JSON objektu koji se šalje live monitoru.
// `correctCount` broji zadatke rešene iz PRVOG pokušaja (iz toga se računaju
// zvezdice), a `incorrectCount` sve pogrešne pokušaje.

export interface EmotionsView extends BaseView {
    /** Scenario koji je na tabli */
    scenarioId: number;
    /** Ponuđena osećanja, u redosledu prikaza */
    options: EmotionId[];
    /** Pogrešni pokušaji u ovom zadatku */
    tried: EmotionId[];
    /** Poslednji pogrešan izbor dok traje blaga animacija */
    lastWrong: EmotionId | null;
    /** Tačan odgovor je pronađen; čeka se "Dalje" */
    answered: boolean;
    /** Nivo je završen (kratka proslava pre zvezdica) */
    finished: boolean;
}

interface Round {
    scenarioId: number;
    options: EmotionId[];
}

const ACCENT = getGame("emotions").accent;
const ASK = "Kako se osećaš?";
const RETRY_SPEECH = "Probaj još jednom.";
const HINT_SPEECH = "Pogledaj karticu koja svetli.";
const SPEAK_DELAY_MS = 400;
const WRONG_MS = 1100;
const CELEBRATE_MS = 1000;
/** Poeni prema broju pogrešnih pokušaja pre tačnog odgovora */
const POINTS = [100, 60, 30];

/** Podloga iza emodžija — pune klase, bez sastavljanja naziva u hodu */
const EMOTION_TINT: Record<EmotionId, string> = {
    happy: "bg-amber-100",
    sad: "bg-sky-100",
    angry: "bg-rose-100",
    scared: "bg-violet-100",
    surprised: "bg-orange-100",
    proud: "bg-emerald-100",
};

/**
 * Širina kartice prema broju ponuđenih osećanja (razmak je gap-3). Kartice su za
 * dlaku uže od tačne mere da zaokruživanje ne prelomi red; nepotpun red ostaje centriran.
 */
const OPTION_BASIS: Record<number, string> = {
    2: "basis-[calc(50%-0.4rem)]",
    3: "basis-[calc(33.333%-0.52rem)]",
    4: "basis-[calc(50%-0.4rem)] sm:basis-[calc(25%-0.58rem)]",
    5: "basis-[calc(50%-0.4rem)] sm:basis-[calc(33.333%-0.52rem)]",
};

/** Zadaci nivoa. `randomize` meša redosled i bira pogrešne odgovore; bez njega je rezultat uvek isti. */
function buildRounds(level: number, randomize: boolean): Round[] {
    const { scenarios, choices, palette } = getEmotionLevel(level);
    return (randomize ? shuffle(scenarios) : scenarios).map((scenario) => {
        const pool = distractorsFor(scenario, palette);
        const distractors = (randomize ? shuffle(pool) : pool).slice(0, choices - 1);
        return { scenarioId: scenario.id, options: inEmotionOrder([scenario.correct, ...distractors]) };
    });
}

function initialView(rounds: Round[]): EmotionsView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: rounds.length,
        scenarioId: rounds[0].scenarioId,
        options: rounds[0].options,
        tried: [],
        lastWrong: null,
        answered: false,
        finished: false,
    };
}

function toCount(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

/** Stanje sa monitora može biti prazno ili nepotpuno — sve što fali ili nema smisla menja se podrazumevanim. */
function mergeMonitorView(fallback: EmotionsView, state: Partial<EmotionsView> | null | undefined): EmotionsView {
    if (!state) return fallback;
    const scenario = typeof state.scenarioId === "number" ? getScenario(state.scenarioId) : undefined;
    const options = Array.isArray(state.options) ? inEmotionOrder(state.options) : [];
    const board = scenario && options.includes(scenario.correct) ? scenario : undefined;
    const totalRounds = Math.max(toCount(state.totalRounds, fallback.totalRounds), 1);
    return {
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        scenarioId: board ? board.id : fallback.scenarioId,
        options: board ? options : fallback.options,
        tried: board && Array.isArray(state.tried) ? inEmotionOrder(state.tried) : [],
        lastWrong: (board && EMOTION_ORDER.find((id) => id === state.lastWrong)) || null,
        answered: Boolean(board) && state.answered === true,
        finished: state.finished === true,
    };
}

/** Posle dva pogrešna pokušaja (ili jednog, kad su ponuđena samo dva odgovora) tačna kartica blago zasvetli. */
function hintReady(wrongAttempts: number, optionCount: number): boolean {
    return wrongAttempts >= Math.min(2, optionCount - 1);
}

function choiceState(id: EmotionId, view: EmotionsView, correct: EmotionId, hint: boolean): ChoiceState {
    if (view.answered) return id === correct ? "correct" : "dimmed";
    if (id === view.lastWrong) return "wrong";
    if (view.tried.includes(id)) return "dimmed";
    return hint && id === correct ? "hint" : "idle";
}

// ── Igra ──────────────────────────────────────────────────────────────────────

export default function EmotionsGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<EmotionsView>) {
    const female = isFemale(gender);
    const sync = useGameSync<EmotionsView>({ childId, gameId: "emotions", level, isMonitor });
    const { say, stop } = useSpeech(gender);

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci mešaju samo jednom, ovde.
    const [rounds] = useState(() => buildRounds(level, !isMonitor));
    const [view, setView] = useState(() => initialView(rounds));
    const viewRef = useRef(view);
    const wrongTimer = useRef<number | null>(null);
    const finishTimer = useRef<number | null>(null);
    const startedRef = useRef(false);
    const completedRef = useRef(false);
    const nextButtonRef = useRef<HTMLButtonElement>(null);

    // Monitor se ne pravi iznova kad se nivo promeni, pa podrazumevano stanje prati `level`.
    const fallbackView = useMemo(() => initialView(buildRounds(level, false)), [level]);
    const shown = isMonitor ? mergeMonitorView(fallbackView, monitorState) : view;
    const scenario = getScenario(shown.scenarioId) ?? getEmotionLevel(level).scenarios[0];
    const sceneText = genderText(scenario.text, female);
    const question = `${sceneText} ${ASK}`;
    const hint = !shown.answered && hintReady(shown.tried.length, shown.options.length);
    const feedback: FeedbackKind = shown.answered ? "correct" : shown.lastWrong || hint ? "wrong" : null;

    const commit = useCallback(
        (next: EmotionsView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    useEffect(() => {
        if (isMonitor || startedRef.current) return;
        startedRef.current = true;
        sync.start(viewRef.current);
    }, [isMonitor, sync]);

    useEffect(
        () => () => {
            if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
            if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
        },
        []
    );

    // Pitanje se čita naglas na početku svakog zadatka
    useEffect(() => {
        if (isMonitor) return;
        const timer = window.setTimeout(() => void say(question), SPEAK_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [isMonitor, say, question, view.round]);

    // Posle tačnog odgovora fokus ide na "Dalje" (tastatura, čitači ekrana, mali ekrani)
    useEffect(() => {
        if (!isMonitor && view.answered && !view.finished) nextButtonRef.current?.focus();
    }, [isMonitor, view.answered, view.finished]);

    const handlePick = (id: EmotionId) => {
        const current = viewRef.current;
        if (isMonitor || current.answered || current.finished || current.tried.includes(id)) return;
        const target = getScenario(current.scenarioId);
        if (!target) return;
        const label = EMOTIONS[id].label;
        if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
        wrongTimer.current = null;

        if (id === target.correct) {
            const attempt = current.tried.length + 1;
            const next: EmotionsView = {
                ...current,
                answered: true,
                lastWrong: null,
                score: current.score + POINTS[Math.min(current.tried.length, POINTS.length - 1)],
                correctCount: current.correctCount + (attempt === 1 ? 1 : 0),
            };
            commit(next, attempt === 1 ? `Tačan odgovor: „${label}”` : `Tačan odgovor iz ${attempt}. pokušaja: „${label}”`);
            playSfx("correct");
            void say(`Bravo! ${genderText(target.why, female)}`);
            return;
        }

        const tried = [...current.tried, id];
        const showsHint = hintReady(tried.length, current.options.length);
        const next: EmotionsView = { ...current, tried, lastWrong: id, incorrectCount: current.incorrectCount + 1 };
        commit(next, `Pogrešan pokušaj: „${label}”${showsHint ? " (prikazana pomoć)" : ""}`);
        playSfx("wrong");
        void say(showsHint ? HINT_SPEECH : RETRY_SPEECH);
        // Pogrešna kartica se kratko zatrese, pa ostaje zatamnjena
        wrongTimer.current = window.setTimeout(() => {
            wrongTimer.current = null;
            const latest = viewRef.current;
            if (latest.lastWrong === id && !latest.answered) commit({ ...latest, lastWrong: null });
        }, WRONG_MS);
    };

    const handleNext = () => {
        const current = viewRef.current;
        if (isMonitor || !current.answered || current.finished || completedRef.current) return;
        stop();

        if (current.round >= rounds.length) {
            // Kraj nivoa: kratka proslava, pa rezultat ide roditeljskom okviru tačno jednom.
            // Zvezdice: total = broj zadataka, correct = zadaci rešeni iz prvog pokušaja.
            completedRef.current = true;
            const done: EmotionsView = { ...current, finished: true };
            commit(done, `Nivo završen: ${done.correctCount} od ${done.totalRounds} iz prvog pokušaja`);
            playSfx("win");
            finishTimer.current = window.setTimeout(() => {
                finishTimer.current = null;
                sync.complete(done);
                onComplete({ score: done.score, durationSec: sync.elapsedSec(), correct: done.correctCount, total: done.totalRounds });
            }, CELEBRATE_MS);
            return;
        }

        const upcoming = rounds[current.round];
        const next: EmotionsView = {
            ...current,
            round: current.round + 1,
            scenarioId: upcoming.scenarioId,
            options: upcoming.options,
            tried: [],
            lastWrong: null,
            answered: false,
        };
        commit(next, `Zadatak ${next.round} od ${next.totalRounds}`);
        playSfx("tap");
    };

    return (
        <GameStage width="narrow">
            <GameHud
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={shown.score}
                onSpeak={isMonitor ? undefined : () => void say(question)}
            />

            <GamePrompt
                key={scenario.id}
                className="animate-fade-up"
                visual={<span aria-hidden="true">{scenario.scene}</span>}
                title={sceneText}
                subtitle={ASK}
            />

            <div
                key={shown.round}
                role="group"
                aria-label="Izaberi osećanje"
                className={cn("flex animate-fade flex-wrap justify-center gap-3", isMonitor && "pointer-events-none")}
            >
                {shown.options.map((id) => {
                    const emotion = EMOTIONS[id];
                    const state = choiceState(id, shown, scenario.correct, hint);
                    const inactive = shown.answered || shown.finished || shown.tried.includes(id);
                    return (
                        <ChoiceCard
                            key={id}
                            state={state}
                            disabled={isMonitor}
                            aria-disabled={inactive || undefined}
                            aria-label={state === "correct" ? `${emotion.label}, tačan odgovor` : emotion.label}
                            onClick={() => handlePick(id)}
                            className={cn(
                                "grow-0 flex-col gap-1.5 px-1.5",
                                OPTION_BASIS[shown.options.length] ?? OPTION_BASIS[4],
                                inactive && "cursor-default"
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "grid h-14 w-14 place-items-center rounded-full text-4xl sm:h-16 sm:w-16 sm:text-5xl",
                                    EMOTION_TINT[id]
                                )}
                            >
                                {emotion.emoji}
                            </span>
                            <span className="text-base leading-tight sm:text-lg">{emotion.label}</span>
                        </ChoiceCard>
                    );
                })}
            </div>

            <Feedback kind={feedback} wrongText={hint ? "Pogledaj karticu koja svetli" : "Probaj još jednom"} />

            {shown.answered && (
                <ExplainPanel
                    accent={ACCENT}
                    icon={EMOTIONS[scenario.correct].emoji}
                    text={genderText(scenario.why, female)}
                    done={shown.finished}
                    onNext={isMonitor ? undefined : handleNext}
                    nextRef={nextButtonRef}
                />
            )}
        </GameStage>
    );
}
