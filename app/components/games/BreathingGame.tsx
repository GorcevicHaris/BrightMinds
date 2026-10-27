"use client";

// Igra „Balon disanja”: vođeno mirno disanje. Dete samo krene (kad je spremno), a slika vodi
// udah, zadržavanje i izdah — balon raste i smanjuje se, tačkice broje sekunde, glas tiho kaže
// „Udahni…”, „Izdahni…”. Nema greške ni žurbe: svaki dovršen udah je uspeh.
// Nivoi 1–5: balon; 6–10: cvet i svećica, vetrenjača, mehur; 11–15: zadržavanje, kvadrat i
// pet prstiju (data/breathingLevels.ts).

import { useCallback, useEffect, useRef, useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useCalmMotion } from "@/app/components/avatar/motion";
import {
    announcePraise,
    DemoHand,
    demoRounds,
    GameHud,
    GameStage,
    genderText,
    isFemale,
    PlayArea,
    playSfx,
    useGamePaused,
    useGameRandom,
    useGameSync,
    useIdle,
    useInputGuard,
    useTimers,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import { BreathScene } from "@/app/components/games/breathing/BreathArt";
import {
    BREATH_PRAISE,
    breathingResult,
    breathSteps,
    buildBreathingLevel,
    emptyBreathingView,
    introText,
    mergeBreathingMonitor,
    phaseCue,
    phaseSeconds,
    phaseVoice,
    READY_TEXT,
    type BreathingView,
    type BreathRound,
} from "@/app/components/games/data/breathingLevels";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("breathing");
/** Posle izdaha: kratak mir pre pohvale i sledećeg udaha */
const AFTER_MS = 900;

export default function BreathingGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<BreathingView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const paused = useGamePaused();
    const sync = useGameSync<BreathingView>({ childId, gameId: "breathing", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const guard = useInputGuard(600);
    const female = isFemale(gender);

    const random = useGameRandom();
    const [plan] = useState<BreathRound[]>(() => (isMonitor ? [] : buildBreathingLevel(level, { maxRounds: settings.preset.maxRounds, random })));
    const [view, setView] = useState<BreathingView>(() => emptyBreathingView(plan.length, plan[0]));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const timers = useRef<TimerId[]>([]);
    const praiseIndex = useRef(0);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: BreathingView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    const demo = demoRounds(level, plan.length);

    // Početak nivoa: šta slika pokazuje, pa „kad budeš spreman, kreni”
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        say(`${introText(viewRef.current.picture)} ${genderText(READY_TEXT, female)}`, undefined, "gentle");
    }, [isMonitor, sync, guard, say, female]);

    const clearTimers = () => {
        timers.current.forEach((id) => cancel(id));
        timers.current = [];
    };

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(breathingResult(final, demo, sync.elapsedSec()));
    };

    /** Dovršen udah: pohvala, pa sledeći udah (dete opet samo krene) ili kraj nivoa */
    const breathDone = () => {
        const current = viewRef.current;
        const modeled = demo > 0 && current.round === 1;
        const done: BreathingView = {
            ...current,
            phase: "ready",
            phaseMs: 0,
            phaseKey: current.phaseKey + 1,
            breaths: current.breaths + 1,
            score: current.score + (modeled ? 0 : 10),
            correctCount: current.correctCount + (modeled ? 0 : 1),
        };
        const isLast = current.round >= current.totalRounds;
        const praise = genderText(BREATH_PRAISE[praiseIndex.current % BREATH_PRAISE.length], female);
        praiseIndex.current += 1;
        announcePraise(praise.split(/[.,]/)[0] + ".", true);
        if (isLast) {
            commit(done, `Udah ${current.round} dovršen${modeled ? " (pokazni)" : ""}; kraj nivoa`);
            playSfx("correct");
            say(praise, undefined, "gentle");
            timers.current.push(after(1600, finish));
            return;
        }
        const next = plan[current.round];
        commit(
            { ...done, round: current.round + 1, picture: next.picture, pattern: next.pattern, color: next.color, finger: next.finger },
            `Udah ${current.round} dovršen${modeled ? " (pokazni)" : ""}`
        );
        playSfx("correct");
        guard.hold();
        say(praise, undefined, "gentle");
    };

    /** Jedan udah: delovi redom (udah, zadrži, izdah, zadrži), svaki sa svojim trajanjem */
    const runStep = (index: number) => {
        const steps = breathSteps(viewRef.current.pattern);
        const step = steps[index];
        if (!step) {
            timers.current.push(after(AFTER_MS, breathDone));
            return;
        }
        const current = viewRef.current;
        commit({ ...current, phase: step.phase, phaseMs: step.ms, phaseKey: current.phaseKey + 1 });
        say(phaseVoice(step.phase, current.picture), undefined, "gentle");
        timers.current.push(after(step.ms, () => runStep(index + 1)));
    };

    const start = () => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        if (viewRef.current.phase !== "ready") return;
        clearTimers();
        playSfx("tap");
        commit(viewRef.current, `Udah ${viewRef.current.round}: počinje`);
        runStep(0);
    };

    // Pauza usred udaha: udah se ne nastavlja napola, nego počinje ispočetka kad dete bude spremno
    useEffect(() => {
        if (isMonitor || !paused) return;
        if (viewRef.current.phase === "ready") return;
        clearTimers();
        commit({ ...viewRef.current, phase: "ready", phaseMs: 0, phaseKey: viewRef.current.phaseKey + 1 }, "Pauza: udah počinje ispočetka");
        // eslint-disable-next-line react-hooks/exhaustive-deps -- samo kad pauza počne
    }, [paused, isMonitor]);

    const shown = isMonitor ? mergeBreathingMonitor(monitorState) : view;
    const seconds = phaseSeconds(shown);

    // Sekunde u tekućem delu (tačkice): broje se na svakom ekranu od trenutka kad je deo počeo
    const [tick, setTick] = useState({ key: -1, n: 0 });
    useEffect(() => {
        if (shown.phase === "ready" || paused) return;
        const key = shown.phaseKey;
        const id = window.setInterval(() => setTick((t) => (t.key === key ? { key, n: t.n + 1 } : { key, n: 1 })), 1000);
        return () => window.clearInterval(id);
    }, [shown.phaseKey, shown.phase, seconds, paused]);
    // Prva tačkica svetli čim deo počne (sekunda koja teče), pa po jedna svake sekunde
    const elapsed = shown.phase === "ready" ? 0 : Math.min((tick.key === shown.phaseKey ? tick.n : 0) + 1, seconds);

    // Dete dugo ne kreće: dugme „Kreni” blago zasvetli (bez glasa, bez požurivanja)
    const idle = useIdle(9000, `${shown.round}-${shown.phase}`);

    const ready = shown.phase === "ready";
    const finished = shown.breaths >= shown.totalRounds;
    const showHand = !isMonitor && demo > 0 && shown.round === 1 && ready && shown.breaths === 0;
    const cue = ready ? (finished ? "Bravo!" : genderText("Kad budeš {spreman|spremna}", female)) : phaseCue(shown.phase, shown.picture);
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const fingersDone = shown.picture === "fingers" ? shown.finger : 0;

    return (
        <GameStage width="narrow">
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Udah" score={score} onSpeak={isMonitor ? undefined : () => say(ready ? genderText(READY_TEXT, female) : phaseVoice(shown.phase, shown.picture), undefined, "gentle")} />

            <PlayArea accent={GAME.accent} className="relative gap-2 overflow-hidden sm:gap-3 flat:gap-1 flat:sm:gap-1">
                {/* Znak za tekući deo udaha: krupno i mirno */}
                <p aria-live="polite" className="min-h-9 text-center font-display text-2xl font-extrabold text-seafoam-700 sm:min-h-11 sm:text-4xl flat:min-h-0 flat:text-xl flat:sm:text-2xl">
                    {cue}
                </p>

                <button
                    type="button"
                    onClick={start}
                    disabled={isMonitor ? false : !ready || finished}
                    // Ključ poteza za zajedničku tablu: početak udaha
                    data-action="breathe"
                    aria-label={ready ? "Kreni" : cue}
                    className={cn(
                        "relative flex min-h-0 w-full max-w-md flex-1 items-center justify-center rounded-card outline-none transition-[background-color] focus-visible:ring-4 focus-visible:ring-seafoam-300",
                        ready && !finished && "cursor-pointer hover:bg-white/50",
                        isMonitor && "pointer-events-none"
                    )}
                >
                    <BreathScene
                        picture={shown.picture}
                        phase={shown.phase}
                        ms={shown.phaseMs}
                        tick={elapsed}
                        seconds={seconds}
                        color={shown.color}
                        finger={shown.finger}
                        fingersDone={fingersDone}
                        calm={calm}
                        className="aspect-square h-full max-h-[min(50dvh,calc(100dvh-16rem))] w-auto max-w-full flat:max-h-[min(45dvh,calc(100dvh-14.5rem))]"
                    />
                    {ready && !finished && (
                        <span
                            className={cn(
                                "absolute bottom-2 left-1/2 inline-flex min-h-14 -translate-x-1/2 items-center gap-2 rounded-2xl border-2 border-b-[5px] border-seafoam-700 bg-seafoam-500 px-8 font-display text-xl font-extrabold text-white shadow-soft sm:text-2xl flat:min-h-12 flat:px-6",
                                idle && !calm && "animate-soft-pulse"
                            )}
                        >
                            Kreni
                        </span>
                    )}
                    {showHand && <DemoHand className="bottom-0 right-[18%]" />}
                </button>

                {/* Tačkice: sekunde tekućeg dela (bez brojeva naglas) */}
                <div className="flex min-h-6 items-center justify-center gap-2.5" aria-hidden="true">
                    {!ready &&
                        Array.from({ length: seconds }, (_, i) => (
                            <span
                                key={`${shown.phaseKey}-${i}`}
                                className={cn("h-4 w-4 rounded-full border-2 border-seafoam-500 sm:h-5 sm:w-5", i < elapsed ? "bg-seafoam-500" : "bg-white", !calm && "transition-colors duration-500")}
                            />
                        ))}
                </div>
            </PlayArea>
        </GameStage>
    );
}
