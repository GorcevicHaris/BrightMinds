"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    ExplainPanel,
    GameHud,
    GamePrompt,
    GameStage,
    playSfx,
    shuffle,
    toCount,
    useGameSync,
    useInputGuard,
    useTimers,
    WaitingNote,
    type BaseView,
    type ChoiceState,
    type GameProps,
} from "@/app/components/games/kit";
import {
    EMOTIONS,
    getEmotionLevel,
    getScenario,
    inEmotionOrder,
    isNamesake,
    questionFor,
    type EmotionId,
    type EmotionScenario,
} from "./data/emotionScenarios";
import { EmotionFace } from "./EmotionFace";

// ── Stanje ────────────────────────────────────────────────────────────────────
// Sve što utiče na prikaz je u jednom JSON objektu koji se šalje live monitoru.
//
// U ovoj igri nema pogrešnih osećanja. Scenario govori o drugom detetu (treće lice),
// a dete bira jedno osećanje i zadatak se time završava. `correctCount` broji zadatke
// u kojima je izabrano osećanje koje većina ljudi tada ima (iz toga odrasli vide
// napredak i računaju se zvezdice); drugačiji izbor se ne broji kao greška, pa
// `incorrectCount` i `promptedCount` ostaju 0.

export interface EmotionsView extends BaseView {
    /** Scenario koji je na tabli; 0 dok monitor ne dobije prvo stanje */
    scenarioId: number;
    /** Ponuđena osećanja, u redosledu prikaza */
    options: EmotionId[];
    /** Lik iz scenarija se zove kao dete, pa se scenario priča o zamenskom liku istog roda */
    standIn: boolean;
    /** Osećanje koje je dete izabralo u ovom zadatku; null dok bira */
    picked: EmotionId | null;
    /** Zadaci rešeni uz pomoć — u ovoj igri uvek 0 */
    promptedCount: number;
    /** Nivo je završen (kratka pauza pre zvezdica) */
    finished: boolean;
}

interface Round {
    scenarioId: number;
    options: EmotionId[];
    standIn: boolean;
}

const ACCENT = getGame("emotions").accent;
const CLOSING = "Sva osećanja su u redu.";
const SPEAK_DELAY_MS = 400;
const FINISH_MS = 1000;
/** Svaki odgovoren zadatak nosi iste poene, jer nijedno osećanje nije pogrešno */
const POINTS_PER_ROUND = 10;

/** Podloga iza lica — pune klase, bez sastavljanja naziva u hodu */
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
    6: "basis-[calc(50%-0.4rem)] sm:basis-[calc(33.333%-0.52rem)]",
};

const EMPTY_VIEW: EmotionsView = {
    score: 0,
    correctCount: 0,
    incorrectCount: 0,
    round: 1,
    totalRounds: 1,
    scenarioId: 0,
    options: [],
    standIn: false,
    picked: null,
    promptedCount: 0,
    finished: false,
};

interface RoundLimits {
    emotionCount: number;
    maxRounds: number;
    choiceLimit: number;
    /** Ime deteta: scenario o liku koji se isto zove priča se o zamenskom liku */
    childName: string | undefined;
}

/**
 * Zadaci nivoa za ovo dete. Nude se samo osećanja koja dete poznaje, najviše onoliko
 * koliko dozvoljavaju nivo i podešavanja. Najčešća osećanja su uvek među ponuđenim;
 * drugo najčešće se izostavlja samo kad bi inače sve ponuđeno bilo „najčešće”.
 */
function buildRounds(level: number, { emotionCount, maxRounds, choiceLimit, childName }: RoundLimits): Round[] {
    const { scenarios, choices, palette } = getEmotionLevel(level, { emotionCount, maxRounds });
    const size = Math.min(choices, choiceLimit, palette.length);
    return shuffle(scenarios).map((scenario) => {
        const common = scenario.common.length < size ? scenario.common : scenario.common.slice(0, 1);
        const others = shuffle(palette.filter((id) => !scenario.common.includes(id))).slice(0, size - common.length);
        return { scenarioId: scenario.id, options: inEmotionOrder([...common, ...others]), standIn: isNamesake(scenario, childName) };
    });
}

function initialView(rounds: Round[]): EmotionsView {
    return { ...EMPTY_VIEW, ...rounds[0], totalRounds: Math.max(rounds.length, 1) };
}

/** Stanje sa monitora može biti prazno ili nepotpuno — sve što fali ili nema smisla menja se podrazumevanim. */
function mergeMonitorView(state: Partial<EmotionsView> | null | undefined): EmotionsView {
    if (!state) return EMPTY_VIEW;
    const scenario = typeof state.scenarioId === "number" ? getScenario(state.scenarioId) : undefined;
    const options = Array.isArray(state.options) ? inEmotionOrder(state.options) : [];
    const onBoard = scenario !== undefined && options.includes(scenario.common[0]);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    return {
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        scenarioId: onBoard ? scenario.id : 0,
        options: onBoard ? options : [],
        standIn: onBoard && state.standIn === true,
        picked: (onBoard && options.find((id) => id === state.picked)) || null,
        promptedCount: toCount(state.promptedCount, 0),
        finished: state.finished === true,
    };
}

// ── Tekstovi ──────────────────────────────────────────────────────────────────

function word(id: EmotionId): string {
    return EMOTIONS[id].label.toLowerCase();
}

/** Najčešća osećanja scenarija koja su ponuđena na tabli. */
function offeredCommon(scenario: EmotionScenario, options: readonly EmotionId[]): EmotionId[] {
    return scenario.common.filter((id) => options.includes(id));
}

/**
 * Osećanja koja se pominju posle izbora. Kad dete izabere najčešće osećanje, potvrđuje se samo ono.
 * Inače se pominju sva ponuđena najčešća osećanja (izabrano prvo, ako je među njima),
 * jer razlog koji sledi govori o najčešćem.
 */
function mentionedEmotions(scenario: EmotionScenario, options: readonly EmotionId[], picked: EmotionId): EmotionId[] {
    if (picked === scenario.common[0]) return [picked];
    const offered = offeredCommon(scenario, options);
    return offered.includes(picked) ? [picked, ...offered.filter((id) => id !== picked)] : offered;
}

/**
 * Rečenice posle izbora: mirna potvrda (bez „tačno/netačno”), doslovan razlog i,
 * na kraju nivoa, podsetnik da su sva osećanja u redu.
 */
function explanation(scenario: EmotionScenario, options: readonly EmotionId[], picked: EmotionId, lastRound: boolean): string[] {
    const words = mentionedEmotions(scenario, options, picked).map(word).join(" ili ");
    const acknowledgement = scenario.common.includes(picked) ? `Da. Mnogi se tada osećaju ${words}.` : `Može i tako. Mnoga deca se tada osećaju ${words}.`;
    return lastRound ? [acknowledgement, scenario.why, CLOSING] : [acknowledgement, scenario.why];
}

/** Izabrana kartica se samo označi; najčešće osećanje koje dete nije izabralo blago zasvetli. */
function choiceState(id: EmotionId, picked: EmotionId | null, scenario: EmotionScenario, mentioned: readonly EmotionId[]): ChoiceState {
    if (picked === null) return "idle";
    if (id === picked) return scenario.common.includes(picked) ? "correct" : "selected";
    return mentioned.includes(id) ? "hint" : "idle";
}

// ── Igra ──────────────────────────────────────────────────────────────────────

export default function EmotionsGame({ childId, level, gender, childName, onComplete, isMonitor = false, monitorState }: GameProps<EmotionsView>) {
    const settings = useChildSettings();
    const sync = useGameSync<EmotionsView>({ childId, gameId: "emotions", level, isMonitor });
    const { say, stop } = useSpeech(gender);
    const guard = useInputGuard();
    const { after } = useTimers();

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju i mešaju samo jednom, ovde.
    // Monitor ne poznaje podešavanja deteta: crta isključivo ono što stigne u `monitorState`.
    const [rounds] = useState<Round[]>(() =>
        isMonitor
            ? []
            : buildRounds(level, {
                  emotionCount: settings.preset.emotionCount,
                  maxRounds: settings.preset.maxRounds,
                  choiceLimit: settings.choiceLimit,
                  childName,
              })
    );
    const [view, setView] = useState(() => initialView(rounds));
    const viewRef = useRef(view);
    const startedRef = useRef(false);
    const completedRef = useRef(false);
    const nextButtonRef = useRef<HTMLButtonElement>(null);

    const shown = isMonitor ? mergeMonitorView(monitorState) : view;
    // Tekst, pitanje i objašnjenje dolaze iz istog (po potrebi preimenovanog) scenarija — i za prikaz i za govor
    const scenario = getScenario(shown.scenarioId, shown.standIn);
    const question = scenario ? questionFor(scenario) : "";
    // Glas čita situaciju pa pitanje; ponuđena osećanja se ne čitaju sama
    const prompt = scenario ? `${scenario.text} ${question}` : "";
    const lines = scenario && shown.picked ? explanation(scenario, shown.options, shown.picked, shown.round >= shown.totalRounds) : [];
    const mentioned = scenario && shown.picked ? mentionedEmotions(scenario, shown.options, shown.picked) : [];

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
        guard.hold();
        sync.start(viewRef.current);
    }, [isMonitor, guard, sync]);

    useEffect(() => {
        if (isMonitor || !prompt) return;
        const timer = window.setTimeout(() => void say(prompt), SPEAK_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [isMonitor, say, prompt]);

    // Posle izbora fokus ide na "Dalje" (tastatura, čitači ekrana, mali ekrani)
    useEffect(() => {
        if (!isMonitor && view.picked !== null && !view.finished) nextButtonRef.current?.focus();
    }, [isMonitor, view.picked, view.finished]);

    const handlePick = (id: EmotionId) => {
        const current = viewRef.current;
        if (isMonitor || guard.blocked() || current.picked !== null || current.finished) return;
        const target = getScenario(current.scenarioId, current.standIn);
        if (!target || !current.options.includes(id)) return;

        const pickedCommon = target.common.includes(id);
        const next: EmotionsView = {
            ...current,
            picked: id,
            score: current.score + POINTS_PER_ROUND,
            correctCount: current.correctCount + (pickedCommon ? 1 : 0),
        };
        commit(
            next,
            pickedCommon
                ? `Izabrano: „${word(id)}” — često osećanje u ovoj situaciji`
                : `Izabrano: „${word(id)}” — najčešće: ${offeredCommon(target, current.options).map(word).join(" ili ")}`
        );
        // Kratka pauza da uzastopni dodiri (ili držanje tastera) ne preskoče objašnjenje
        guard.hold();
        playSfx(pickedCommon ? "correct" : "tap");
        void say(explanation(target, current.options, id, current.round >= current.totalRounds).join(" "));
    };

    const handleNext = () => {
        const current = viewRef.current;
        if (isMonitor || guard.blocked() || current.picked === null || current.finished || completedRef.current) return;
        stop();

        if (current.round >= rounds.length) {
            // Kraj nivoa: kratka pauza, pa rezultat ide roditeljskom okviru tačno jednom.
            completedRef.current = true;
            const done: EmotionsView = { ...current, finished: true };
            commit(done, `Nivo završen: ${done.correctCount} od ${done.totalRounds} sa najčešćim osećanjem`);
            playSfx("tap");
            after(FINISH_MS, () => {
                sync.complete(done);
                onComplete({
                    score: done.score,
                    durationSec: sync.elapsedSec(),
                    correct: done.correctCount,
                    total: done.totalRounds,
                    prompted: done.promptedCount,
                });
            });
            return;
        }

        const upcoming = rounds[current.round];
        const next: EmotionsView = {
            ...current,
            round: current.round + 1,
            ...upcoming,
            picked: null,
        };
        guard.hold();
        commit(next, `Zadatak ${next.round} od ${next.totalRounds}`);
        playSfx("tap");
    };

    return (
        <GameStage width="narrow">
            <GameHud
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={isMonitor || settings.preset.showPoints ? shown.score : undefined}
                onSpeak={isMonitor || !prompt ? undefined : () => void say(prompt)}
            />

            {scenario ? (
                <>
                    <GamePrompt
                        key={scenario.id}
                        className="animate-fade-up"
                        visual={<span aria-hidden="true">{scenario.scene}</span>}
                        title={scenario.text}
                        subtitle={<span className="text-ink">{question}</span>}
                    />

                    <div
                        key={shown.round}
                        role="group"
                        aria-label="Izaberi osećanje"
                        className={cn("flex animate-fade flex-wrap justify-center gap-3", (isMonitor || shown.picked !== null) && "pointer-events-none")}
                    >
                        {shown.options.map((id) => {
                            const emotion = EMOTIONS[id];
                            const state = choiceState(id, shown.picked, scenario, mentioned);
                            return (
                                <ChoiceCard
                                    key={id}
                                    state={state}
                                    disabled={isMonitor}
                                    aria-disabled={shown.picked !== null || undefined}
                                    aria-label={state === "correct" || state === "selected" ? `${emotion.label}, izabrano` : emotion.label}
                                    onClick={() => handlePick(id)}
                                    className={cn("grow-0 flex-col gap-1.5 px-1.5", OPTION_BASIS[shown.options.length] ?? OPTION_BASIS[4])}
                                >
                                    <span className={cn("block h-16 w-16 rounded-2xl p-1 sm:h-20 sm:w-20", EMOTION_TINT[id])}>
                                        <EmotionFace emotion={id} className="h-full w-full" />
                                    </span>
                                    <span className="text-base leading-tight sm:text-lg">{emotion.label}</span>
                                    {/* Neutralna oznaka „ovo je tvoj izbor” — bez znaka za tačno ili netačno */}
                                    {state === "selected" && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute -right-2 -top-2 grid h-8 w-8 animate-pop place-items-center rounded-full bg-brand-500 shadow-soft ring-2 ring-white"
                                        >
                                            <span className="h-3 w-3 rounded-full bg-white" />
                                        </span>
                                    )}
                                </ChoiceCard>
                            );
                        })}
                    </div>

                    <div aria-live="polite">
                        {shown.picked !== null && (
                            <ExplainPanel
                                accent={ACCENT}
                                icon={<EmotionFace emotion={scenario.common[0]} className="block h-14 w-14 shrink-0" />}
                                text={
                                    <span className="flex flex-col gap-1">
                                        {lines.map((line) => (
                                            <span key={line}>{line}</span>
                                        ))}
                                    </span>
                                }
                                done={shown.finished}
                                doneText="Nivo je završen."
                                onNext={isMonitor ? undefined : handleNext}
                                nextRef={nextButtonRef}
                            />
                        )}
                    </div>
                </>
            ) : (
                <WaitingNote>Čekamo sledeći zadatak…</WaitingNote>
            )}
        </GameStage>
    );
}
