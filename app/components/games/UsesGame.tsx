"use client";

// Igra „Čemu služi?”: glas postavi pitanje („Čime pišemo?”), a dete među dve do četiri slike
// izabere pravu. Predmet se ne imenuje u pitanju — dete ga prepoznaje po tome čemu služi ili
// kakav je (slušalačko reagovanje po funkciji, osobini i vrsti iz programa rane podrške).
// Nivoi 1–5: svakodnevni predmeti, 6–10: delovi tela i manje česti predmeti,
// 11–15: osobine životinja i stvari, pa sve izmešano.

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
    useGameSync,
    useInputGuard,
    usePraise,
    useSayThen,
    useTimers,
    useWaitHint,
    type ChoiceState,
    type FeedbackKind,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import { buildUsesLevel, emptyUsesView, getUseItem, itIs, mergeUsesMonitor, type UseItem, type UsesRound, type UsesView } from "@/app/components/games/data/usesItems";
import { usesScene } from "@/app/components/games/data/usesScenes";
import { storyHero } from "@/app/components/games/scene/heroes";
import { SceneArt } from "@/app/components/games/scene/SceneArt";
import { Picture } from "@/app/components/games/pictures";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("uses");
const WRONG_FEEDBACK_MS = 1400;
const INSTRUCTION = "Slušaj pitanje i pronađi pravu sliku.";

function wrongText(picked: UseItem, hint: boolean): string {
    return `Netačno. ${itIs(picked)} ${hint ? "Probaj još jednom, polako." : "Probaj ponovo."}`;
}

function choiceState(view: UsesView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.itemId ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.itemId) return "hint";
    return "idle";
}

export default function UsesGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<UsesView>) {
    const settings = useChildSettings();
    const sync = useGameSync<UsesView>({ childId, gameId: "uses", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju samo jednom, ovde
    const [plan] = useState<UsesRound[]>(() => (isMonitor ? [] : buildUsesLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds })));
    const [view, setView] = useState<UsesView>(() => ({
        ...emptyUsesView(plan.length),
        itemId: plan[0]?.itemId ?? "",
        choices: plan[0]?.choices ?? [],
    }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: UsesView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    // Početak nivoa: uputstvo jednom, pa prvo pitanje
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const item = getUseItem(viewRef.current.itemId);
        if (item) say(`${INSTRUCTION} ${item.question}`);
    }, [isMonitor, sync, guard, say]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        // total = zadaci bez pokaznog (prvi u prvom nivou); correct = iz prvog pokušaja; prompted = uz pomoć
        onCompleteRef.current({
            score: final.score,
            durationSec: sync.elapsedSec(),
            correct: final.correctCount,
            total: Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1),
            prompted: final.promptedCount,
        });
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        const item = getUseItem(round.itemId);
        guard.hold();
        commit({ ...viewRef.current, itemId: round.itemId, choices: round.choices, round: index + 1, wrong: [], picked: null, feedback: null, hint: false }, `Pitanje ${index + 1}: ${item?.question ?? ""}`);
        if (item) say(item.question);
    };

    const handlePick = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const item = getUseItem(current.itemId);
        const picked = getUseItem(id);
        if (!item || !picked || current.feedback === "correct" || current.wrong.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;

        if (id === item.id) {
            // Prvo pitanje prvog nivoa pokazuje ruka: pokazivanje, a ne zadatak — ne ocenjuje se
            const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
            const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
            const solved: UsesView = {
                ...current,
                picked: id,
                feedback: "correct",
                hint: false,
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
            };
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
            commit(solved, `Tačno ${how}: ${item.question} → ${item.name}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            sayThen(praise(item.answer, firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy" });
            return;
        }

        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, current.choices.length - 1);
        commit({ ...current, picked: id, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${item.question} → ${picked.name}`);
        playSfx("wrong");
        say(`${wrongText(picked, hint)} ${item.question}`, undefined, "gentle");
        // Kratka pauza: nekoliko brzih dodira zaredom ne postaje nekoliko grešaka
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    // Pomoć posle čekanja: prava slika blago zasvetli (pre greške, ne posle nje)
    useWaitHint(!isMonitor && settings.waitHint, view.round, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (demoRounds(level, current.totalRounds) > 0 && current.round === 1 && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        const item = getUseItem(current.itemId);
        // Odgovor je već dat: ništa se ne ponavlja (i ne prekida se pohvala)
        if (!item || current.feedback === "correct") return;
        say(item.question);
    };

    const shown = isMonitor ? mergeUsesMonitor(monitorState) : view;
    const item = getUseItem(shown.itemId);
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (!item || shown.choices.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Pitanje" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvo pitanje" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const showHand = !isMonitor && demoRounds(level, shown.totalRounds) > 0 && shown.round === 1 && shown.wrong.length === 0 && !solved;
    const pickedItem = shown.picked ? getUseItem(shown.picked) : undefined;
    const message = solved ? item.answer : shown.feedback === "wrong" && pickedItem ? wrongText(pickedItem, shown.hint) : "";
    const count = shown.choices.length;
    const picture = usesScene(item.id);

    return (
        <GameStage split>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Pitanje" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt
                key={`prompt-${shown.round}-${item.id}`}
                className="animate-fade-up"
                compact
                // Mala slika situacije iz pitanja (nikad sam odgovor)
                illustration={picture && <SceneArt spec={picture} hero={storyHero(isFemale(gender))} className="h-auto w-full" />}
                title={item.question}
            />

            <PlayArea accent={GAME.accent}>
                <div
                    role="group"
                    aria-label="Slike"
                    className={cn("grid w-full max-w-3xl gap-3 sm:gap-4", count === 2 ? "grid-cols-2" : count === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4 flat:sm:grid-cols-2", isMonitor && "pointer-events-none")}
                >
                    {shown.choices.map((id) => {
                        const choice = getUseItem(id);
                        if (!choice) return null;
                        const state = choiceState(shown, id);
                        return (
                            <ChoiceCard
                                key={`${shown.round}-${id}`}
                                state={state}
                                disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(id)}
                                aria-label={`${choice.name}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className={cn("animate-pop flex-col gap-1.5 px-1.5 sm:gap-2", count <= 3 ? "min-h-36 sm:min-h-52" : "min-h-28 sm:min-h-48", "flat:min-h-0 flat:sm:min-h-0 flat:py-2")}
                            >
                                <Picture id={choice.pic} className={cn("shrink-0", count <= 3 ? "h-[clamp(4rem,15dvh,7.5rem)] w-[clamp(4rem,15dvh,7.5rem)]" : "h-[clamp(3.5rem,11dvh,6.75rem)] w-[clamp(3.5rem,11dvh,6.75rem)]")} />
                                {/* Natpis je za odrasle i decu koja čitaju; pitanje nikad ne sadrži naziv, pa ne odaje odgovor */}
                                <span className="text-base leading-tight sm:text-xl flat:sm:text-base">{choice.name}</span>
                                {showHand && id === item.id && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}
