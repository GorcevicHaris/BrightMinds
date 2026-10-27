"use client";

// Igra „Posadi cvet”: baštovanka Emina neguje biljku, a dete bira šta biljci sada treba
// (seme, voda, sunce, lopatica, rukavice, veća saksija). Posle tačnog izbora biljka vidljivo
// poraste; svaka biljka se završi cvetom i ode u baštu na vrhu. Nivoi 1–5: potreba u oblačiću
// i dve stvari; 6–10: potreba se vidi samo po biljci; 11–15: različite biljke i potrebe.

import { useCallback, useEffect, useRef, useState } from "react";
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
    buildPlantLevel,
    emptyPlantView,
    getTool,
    mergePlantMonitor,
    whyNot,
    type PlantKind,
    type PlantStep,
    type PlantView,
    type ToolId,
} from "@/app/components/games/data/plantLevels";
import { GardenSprout, PlantScene, ToolArt } from "@/app/components/games/plant/PlantArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("plant");
const WRONG_FEEDBACK_MS = 1600;

/** Akuzativ biljke: „Emina neguje lalu.” */
const PLANT_ACC: Record<PlantKind, string> = { flower: "cvet", tulip: "lalu", sunflower: "suncokret", tomato: "paradajz", cactus: "kaktus" };

function prompt(view: Pick<PlantView, "bubble" | "plant">): { title: string; subtitle: string } {
    return {
        title: view.bubble ? "Šta treba biljci?" : "Pogledaj biljku. Šta joj treba?",
        subtitle: `Emina neguje ${PLANT_ACC[view.plant]}.`,
    };
}

export default function PlantGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<PlantView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<PlantView>({ childId, gameId: "plant", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<PlantStep[]>(() => (isMonitor ? [] : buildPlantLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds, random })));
    const [view, setView] = useState<PlantView>(() => ({
        ...emptyPlantView(plan.length),
        plantsTotal: Math.max(1, new Set(plan.map((s) => s.plantIndex)).size),
        ...stepFields(plan[0]),
    }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: PlantView, log?: string) => {
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
        const first = prompt(viewRef.current);
        say(`${first.subtitle} ${first.title}`);
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: PlantView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current({
            score: final.score,
            durationSec: sync.elapsedSec(),
            correct: final.correctCount,
            total: Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1),
            prompted: final.promptedCount,
        });
    };

    const startRound = (index: number) => {
        const step = plan[index];
        if (!step) return;
        guard.hold();
        const newPlant = step.plantIndex !== viewRef.current.plantIndex;
        const next: PlantView = { ...viewRef.current, ...stepFields(step), round: index + 1 };
        const p = prompt(next);
        commit(next, `Korak ${index + 1}: biljci treba ${getTool(step.need)?.name ?? ""}`);
        say(newPlant ? `${p.subtitle} ${p.title}` : step.bubble ? "Šta treba biljci sada?" : "Šta joj treba sada?");
    };

    const handleTool = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const tool = getTool(id);
        if (!tool || current.feedback === "correct" || current.wrong.includes(id) || !current.tools.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const step = plan[current.round - 1];

        if (id === current.need && step) {
            const modeled = modeledRound(current);
            const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
            const nextStep = plan[current.round];
            const plantDone = !nextStep || nextStep.plantIndex !== step.plantIndex;
            const solved: PlantView = {
                ...current,
                picked: id,
                feedback: "correct",
                hint: false,
                stage: step.next,
                cond: "none",
                garden: plantDone ? [...current.garden, { plant: step.plant, petal: step.petal }] : current.garden,
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
            };
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
            commit(solved, `Tačno ${how}: ${tool.name}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            const text = plantDone && step.next >= 6 ? `${step.explain} ${step.plant === "tomato" ? "Paradajz je sazreo!" : "Biljka je procvetala!"}` : step.explain;
            sayThen(praise(text, firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy", min: 1800 });
            return;
        }

        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, current.tools.length - 1);
        const why = whyNot({ need: current.need as ToolId, stage: current.stage as PlantStep["stage"], cond: current.cond, plant: current.plant }, id as ToolId);
        commit({ ...current, picked: id, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${tool.name} (${why})`);
        playSfx("wrong");
        say(`${why} ${hint ? "Pogledaj šta svetli." : "Probaj ponovo."}`, undefined, "gentle");
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    useWaitHint(!isMonitor && settings.waitHint, view.round, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        const p = prompt(current);
        say(`${p.subtitle} ${p.title}`);
    };

    const shown = isMonitor ? mergePlantMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (!shown.need || shown.tools.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Korak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi korak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const showHand = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved;
    const p = prompt(shown);
    const pickedTool = shown.picked ? (shown.picked as ToolId) : null;
    const step = { need: shown.need as ToolId, stage: shown.stage as PlantStep["stage"], cond: shown.cond, plant: shown.plant };
    const message = solved ? shown.explain : shown.feedback === "wrong" && pickedTool ? `${whyNot(step, pickedTool)} Probaj ponovo.` : "";
    const count = shown.tools.length;
    const slots = Math.max(shown.plantsTotal, shown.garden.length);

    return (
        <GameStage split>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Korak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up" compact title={p.title} subtitle={p.subtitle} />

            <PlayArea accent={GAME.accent} className="justify-between gap-2 sm:gap-4 flat:gap-1.5">
                {/* Bašta: završene biljke i prazna mesta za ostale */}
                {slots > 1 && (
                    <div role="img" aria-label={`Bašta: ${shown.garden.length} od ${slots} biljaka`} className="flex h-[clamp(2rem,5dvh,3.25rem)] shrink-0 items-end justify-center gap-2 sm:gap-3">
                        {Array.from({ length: slots }, (_, i) => {
                            const g = shown.garden[i];
                            return g ? (
                                <span key={i} className={cn("h-full", !calm && "animate-pop")}>
                                    <GardenSprout plant={g.plant} petal={g.petal} />
                                </span>
                            ) : (
                                <span key={i} className="h-[70%] w-7 rounded-b-xl rounded-t-md border-2 border-dashed border-clay-300 sm:w-9" aria-hidden="true" />
                            );
                        })}
                    </div>
                )}

                {/* Scena zauzima sav prostor koji ostane (pa sve staje bez skrolovanja na svakom ekranu) */}
                <div className="relative min-h-[clamp(7rem,28dvh,19rem)] w-full max-w-xl flex-1 short:min-h-[clamp(6.5rem,24dvh,15rem)]">
                    <PlantScene
                        plant={shown.plant}
                        stage={shown.stage}
                        cond={shown.cond}
                        petal={shown.petal}
                        bubble={shown.bubble && !solved ? (shown.need as ToolId) : null}
                        just={solved ? (shown.need as ToolId) : null}
                        calm={calm}
                        className="absolute inset-0 h-full w-full"
                    />
                </div>

                <div
                    role="group"
                    aria-label="Stvari za negu biljke"
                    className={cn(
                        "grid w-full max-w-3xl shrink-0 gap-2 sm:gap-3",
                        count === 2 ? "max-w-sm grid-cols-2" : count === 3 ? "max-w-md grid-cols-3" : count === 4 ? "max-w-xl grid-cols-4" : "grid-cols-3 sm:grid-cols-6 flat:grid-cols-6",
                        isMonitor && "pointer-events-none"
                    )}
                >
                    {shown.tools.map((id) => {
                        const tool = getTool(id);
                        if (!tool) return null;
                        const state = toolState(shown, id);
                        return (
                            <ChoiceCard
                                key={`${shown.round}-${id}`}
                                state={state}
                                disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                onClick={() => handleTool(id)}
                                data-action={`tool:${id}`}
                                aria-label={`${tool.name}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className="animate-pop min-h-0 flex-col gap-0.5 p-1.5 sm:gap-1 sm:p-2"
                            >
                                <ToolArt id={tool.id} className="h-[clamp(2.5rem,8dvh,4.75rem)] w-auto" />
                                <span className="text-sm leading-tight sm:text-lg flat:text-sm">{tool.name}</span>
                                {showHand && id === shown.need && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}

function stepFields(step: PlantStep | undefined): Partial<PlantView> {
    if (!step) return {};
    return {
        plant: step.plant,
        plantIndex: step.plantIndex,
        need: step.need,
        stage: step.stage,
        cond: step.cond,
        bubble: step.bubble,
        tools: [...step.tools],
        petal: step.petal,
        explain: step.explain,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

function toolState(view: PlantView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.need ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.need) return "hint";
    return "idle";
}
