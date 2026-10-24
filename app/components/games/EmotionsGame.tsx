"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    DemoHand,
    demoRounds,
    ExplainPanel,
    GameHud,
    GamePrompt,
    GameStage,
    hintDue,
    playSfx,
    shuffle,
    toCount,
    useGameSync,
    useInputGuard,
    usePraise,
    useTimers,
    useWaitHint,
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
import { emotionScene } from "./data/emotionScenes";
import { emotionHero } from "./scene/heroes";
import { SceneArt } from "./scene/SceneArt";

// ── Stanje ────────────────────────────────────────────────────────────────────
// Sve što utiče na prikaz je u jednom JSON objektu koji se šalje live monitoru.
//
// Scenario govori o drugom detetu (treće lice), a dete bira kako se ono oseća. Tačno je
// osećanje koje većina ljudi tada ima (`common`); ostala ponuđena osećanja tu nisu
// uobičajena. Pogrešan izbor se blago označi i dete pokušava ponovo; posle onoliko grešaka
// koliko je zadato u podešavanjima (ili posle dugog čekanja) tačno lice blago zasvetli.
// `correctCount` = tačno iz prvog pokušaja, `promptedCount` = tačno tek uz pomoć.

export interface EmotionsView extends BaseView {
    /** Scenario koji je na tabli; 0 dok monitor ne dobije prvo stanje */
    scenarioId: number;
    /** Ponuđena osećanja, u redosledu prikaza */
    options: EmotionId[];
    /** Lik iz scenarija se zove kao dete, pa se scenario priča o zamenskom liku istog roda */
    standIn: boolean;
    /** Tačno osećanje koje je dete izabralo; null dok bira */
    picked: EmotionId | null;
    /** Pogrešno probana osećanja u ovom zadatku (ostaju zatamnjena) */
    tried: EmotionId[];
    /** Tačno lice blago svetli */
    hint: boolean;
    /** Zadaci rešeni tek uz pomoć */
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
/** Poeni po pokušaju: prvi, drugi, treći i kasnije */
const POINTS = [10, 5, 3];

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
    // Pet i šest lica i na telefonu idu u tri kolone: u dva reda staju na ekran bez skrolovanja
    5: "basis-[calc(33.333%-0.52rem)]",
    6: "basis-[calc(33.333%-0.52rem)]",
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
    tried: [],
    hint: false,
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
    // Nasumičan pomeraj: ponovljen nivo ne donosi iste priče
    const shift = Math.floor(Math.random() * 1000);
    const { scenarios, choices, palette } = getEmotionLevel(level, { emotionCount, maxRounds, shift });
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
        picked: (onBoard && options.find((id) => id === state.picked && scenario.common.includes(id))) || null,
        tried: onBoard && Array.isArray(state.tried) ? options.filter((id) => state.tried!.includes(id) && !scenario.common.includes(id)) : [],
        hint: onBoard && state.hint === true,
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

/** Potvrda posle tačnog izbora: koje osećanje je uobičajeno i doslovan razlog. */
function explanation(scenario: EmotionScenario, picked: EmotionId, lastRound: boolean): string[] {
    const acknowledgement = `Mnogi se tada osećaju ${word(picked)}.`;
    return lastRound ? [acknowledgement, scenario.why, CLOSING] : [acknowledgement, scenario.why];
}

/** Posle pogrešnog izbora: blago, bez „netačno”, uz ponovljenu situaciju da dete razmisli. */
function retryText(scenario: EmotionScenario, tried: EmotionId, hint: boolean): string {
    return hint
        ? `Netačno, nije ${word(tried)}. Probaj još jednom, polako.`
        : `Netačno, nije ${word(tried)}. ${scenario.text} Probaj ponovo.`;
}

/** Tačno osećanje koje svetli kao pomoć: prvo ponuđeno uobičajeno osećanje. */
function hintTarget(scenario: EmotionScenario, options: readonly EmotionId[]): EmotionId | undefined {
    return offeredCommon(scenario, options)[0];
}

function choiceState(id: EmotionId, view: EmotionsView, scenario: EmotionScenario): ChoiceState {
    if (view.picked !== null) return id === view.picked ? "correct" : "idle";
    // Poslednji pogrešan izbor je jasno označen kao netačan; ranije probani su samo utišani
    if (view.tried[view.tried.length - 1] === id) return "wrong";
    if (view.tried.includes(id)) return "dimmed";
    if (view.hint && id === hintTarget(scenario, view.options)) return "hint";
    return "idle";
}

// ── Igra ──────────────────────────────────────────────────────────────────────

export default function EmotionsGame({ childId, level, gender, childName, onComplete, isMonitor = false, monitorState }: GameProps<EmotionsView>) {
    const settings = useChildSettings();
    const sync = useGameSync<EmotionsView>({ childId, gameId: "emotions", level, isMonitor });
    const { say, stop } = useSpeech(gender);
    const guard = useInputGuard();
    const { after } = useTimers();
    const praise = usePraise();

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
    const promptTimer = useRef<number | null>(null);
    const completedRef = useRef(false);
    const nextButtonRef = useRef<HTMLButtonElement>(null);

    const shown = isMonitor ? mergeMonitorView(monitorState) : view;
    // Tekst, pitanje i objašnjenje dolaze iz istog (po potrebi preimenovanog) scenarija — i za prikaz i za govor
    const scenario = getScenario(shown.scenarioId, shown.standIn);
    const question = scenario ? questionFor(scenario) : "";
    // Glas čita situaciju pa pitanje; ponuđena osećanja se ne čitaju sama
    const prompt = scenario ? `${scenario.text} ${question}` : "";
    const lines = scenario && shown.picked ? explanation(scenario, shown.picked, shown.round >= shown.totalRounds) : [];
    const lastTried = shown.picked === null && shown.tried.length > 0 ? shown.tried[shown.tried.length - 1] : null;
    // Slika situacije (emodži ostaje samo kao rezerva ako slika ne postoji)
    const picture = scenario ? emotionScene(scenario.id) : undefined;

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
        const timer = window.setTimeout(() => {
            promptTimer.current = null;
            void say(prompt);
        }, SPEAK_DELAY_MS);
        promptTimer.current = timer;
        return () => window.clearTimeout(timer);
    }, [isMonitor, say, prompt]);

    // Posle izbora fokus ide na "Dalje" (tastatura, čitači ekrana, mali ekrani)
    useEffect(() => {
        if (!isMonitor && view.picked !== null && !view.finished) nextButtonRef.current?.focus();
    }, [isMonitor, view.picked, view.finished]);

    // Pomoć posle čekanja: kad dete dugo ništa ne dodirne, tačno lice blago zasvetli
    useWaitHint(!isMonitor && settings.waitHint && view.picked === null && !view.finished, `${view.round}:${view.tried.length}`, () => {
        const current = viewRef.current;
        if (current.picked !== null || current.finished || current.hint) return;
        if (demoRounds(level, current.totalRounds) > 0 && current.round === 1 && current.tried.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const handlePick = (id: EmotionId) => {
        const current = viewRef.current;
        if (isMonitor || guard.blocked() || current.picked !== null || current.finished || current.tried.includes(id)) return;
        const target = getScenario(current.scenarioId, current.standIn);
        if (!target || !current.options.includes(id)) return;
        // Uputstvo koje tek treba da krene ne sme da preseče odgovor
        if (promptTimer.current !== null) window.clearTimeout(promptTimer.current);
        promptTimer.current = null;
        // Kratka pauza da uzastopni dodiri (ili držanje tastera) ne preskoče odgovor
        guard.hold();

        if (target.common.includes(id)) {
            // Prvi zadatak prvog nivoa pokazuje ruka: to je pokazivanje, a ne zadatak — ne ocenjuje se
            const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
            const firstTry = current.tried.length === 0 && !current.hint && !modeled;
            const next: EmotionsView = {
                ...current,
                picked: id,
                score: current.score + POINTS[Math.min(current.tried.length, POINTS.length - 1)],
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
            };
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
            commit(next, `Tačno ${how}: „${word(id)}”`);
            playSfx("correct");
            void say(praise(explanation(target, id, current.round >= current.totalRounds).join(" "), firstTry), undefined, "happy");
            return;
        }

        const tried = [...current.tried, id];
        const wrongOffered = current.options.filter((option) => !target.common.includes(option)).length;
        const hint = current.hint || hintDue(settings.hintAfter, tried.length, wrongOffered);
        commit({ ...current, tried, hint, incorrectCount: current.incorrectCount + 1 }, `Probano: „${word(id)}”`);
        playSfx("wrong");
        void say(retryText(target, id, hint), undefined, "gentle");
    };

    const handleNext = () => {
        const current = viewRef.current;
        if (isMonitor || guard.blocked() || current.picked === null || current.finished || completedRef.current) return;
        stop();

        if (current.round >= rounds.length) {
            // Kraj nivoa: kratka pauza, pa rezultat ide roditeljskom okviru tačno jednom.
            completedRef.current = true;
            const done: EmotionsView = { ...current, finished: true };
            commit(done, `Nivo završen: ${done.correctCount} od ${done.totalRounds} iz prvog pokušaja`);
            playSfx("tap");
            after(FINISH_MS, () => {
                sync.complete(done);
                onComplete({
                    score: done.score,
                    durationSec: sync.elapsedSec(),
                    correct: done.correctCount,
                    total: Math.max(done.totalRounds - demoRounds(level, done.totalRounds), 1),
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
            tried: [],
            hint: false,
        };
        guard.hold();
        commit(next, `Zadatak ${next.round} od ${next.totalRounds}`);
        playSfx("tap");
    };

    /** Pet ili šest ponuđenih lica (teži nivoi): zbijeniji raspored izbora */
    const many = shown.options.length >= 5;

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
                        compact={shown.options.length >= 4}
                        visual={<span aria-hidden="true">{scenario.scene}</span>}
                        illustration={
                            picture && (
                                // Na lakim nivoima lik pokazuje tačno osećanje; na težim je okrenut leđima,
                                // a lice se vidi tek uz pomoć ili posle tačnog odgovora
                                <SceneArt spec={picture} hero={emotionHero(scenario, shown.hint || shown.picked !== null)} className="h-auto w-full" />
                            )
                        }
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
                            // Prvi zadatak prvog nivoa: ruka pokazuje tačno lice; nestaje posle prvog dodira
                            const showHand =
                                !isMonitor &&
                                demoRounds(level, shown.totalRounds) > 0 &&
                                shown.round === 1 &&
                                shown.picked === null &&
                                shown.tried.length === 0 &&
                                id === hintTarget(scenario, shown.options);
                            const state = choiceState(id, shown, scenario);
                            const inactive = shown.picked !== null || shown.tried.includes(id);
                            return (
                                <ChoiceCard
                                    key={id}
                                    state={state}
                                    disabled={isMonitor}
                                    aria-disabled={inactive || undefined}
                                    aria-label={state === "correct" ? `${emotion.label}, tačno` : state === "wrong" ? `${emotion.label}, netačno` : state === "dimmed" ? `${emotion.label}, već probano` : emotion.label}
                                    onClick={() => handlePick(id)}
                                    className={cn(
                                        "grow-0 flex-col gap-1.5 px-1.5",
                                        OPTION_BASIS[shown.options.length] ?? OPTION_BASIS[4],
                                        // Pet i šest lica na niskom tabletu i računaru: zbijenije kartice, da oba reda stanu bez skrolovanja
                                        many && "short:sm:gap-1 short:sm:py-2"
                                    )}
                                >
                                    <span className={cn("block h-20 w-20 shrink-0 rounded-2xl p-1 sm:h-28 sm:w-28", many ? "short:sm:h-16 short:sm:w-16" : "short:sm:h-24 short:sm:w-24", EMOTION_TINT[id])}>
                                        <EmotionFace emotion={id} className="h-full w-full" />
                                    </span>
                                    {/* U tri kolone na uskom telefonu i „Iznenađeno” staje u jedan red */}
                                    <span className={cn("leading-tight sm:text-lg", many ? "text-sm min-[400px]:text-base short:sm:text-base" : "text-base")}>{emotion.label}</span>
                                    {showHand && <DemoHand />}
                                </ChoiceCard>
                            );
                        })}
                    </div>

                    <div aria-live="polite">
                        {lastTried && (
                            <p
                                key={`${shown.round}-${shown.tried.length}`}
                                className="flex animate-fade-up items-center justify-center gap-2 rounded-card border-2 border-rose-200 bg-rose-50 px-4 py-3 text-center text-base font-bold text-ink sm:text-lg"
                            >
                                <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-500 text-sm font-black text-white">
                                    ✗
                                </span>
                                <span>
                                    <span className="font-extrabold text-rose-700">Netačno.</span> Nije {word(lastTried)}. Probaj ponovo.
                                </span>
                            </p>
                        )}
                        {shown.picked !== null && (
                            <ExplainPanel
                                accent={ACCENT}
                                icon={<EmotionFace emotion={shown.picked} className="block h-14 w-14 shrink-0" />}
                                text={
                                    <span className="flex flex-col gap-1">
                                        <span className="font-extrabold text-emerald-700">✓ Tačno!</span>
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
