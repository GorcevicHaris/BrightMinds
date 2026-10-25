"use client";

// Igra „Gde je?”: glas kaže rečenicu („Mače je ispod stola.”), a dete među dve do četiri slike
// izabere onu na kojoj je tako. Na svim slikama su ista igračka i isti predmet — razlikuje se
// samo položaj, pa dete vežba razumevanje predloga (u, na, ispod, pored, iza, ispred, iznad, između).
// Nivoi 1–5: dve slike (u, na, ispod), 6–10: tri slike (+ pored, iza, ispred),
// 11–15: četiri slike (+ iznad, između) i slični položaji jedan uz drugi.

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
    buildWhereLevel,
    emptyWhereView,
    getFigure,
    getPlaceObject,
    mergeWhereMonitor,
    placeSentence,
    shownSentence,
    type Figure,
    type PlaceObject,
    type Relation,
    type WhereRound,
    type WhereView,
} from "@/app/components/games/data/whereScenes";
import { WhereScene } from "@/app/components/games/WhereScene";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("where");
const WRONG_FEEDBACK_MS = 1400;
const INSTRUCTION = "Slušaj i pronađi pravu sliku.";

function wrongText(figure: Figure, picked: Relation, object: PlaceObject, hint: boolean): string {
    return `Netačno. ${shownSentence(figure, picked, object)} ${hint ? "Probaj još jednom, polako." : "Probaj ponovo."}`;
}

function choiceState(view: WhereView, relation: Relation): ChoiceState {
    if (view.feedback === "correct") return relation === view.target ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === relation) return "wrong";
    if (view.wrong.includes(relation)) return "dimmed";
    if (view.hint && relation === view.target) return "hint";
    return "idle";
}

/** Rečenica tekućeg zadatka, ako je stanje potpuno */
function sentenceOf(view: WhereView): string | null {
    const figure = getFigure(view.figure);
    const object = getPlaceObject(view.object);
    return figure && object && view.target ? placeSentence(figure, view.target, object) : null;
}

export default function WhereGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<WhereView>) {
    const settings = useChildSettings();
    const sync = useGameSync<WhereView>({ childId, gameId: "where", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju samo jednom, ovde
    const [plan] = useState<WhereRound[]>(() => (isMonitor ? [] : buildWhereLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds })));
    const [view, setView] = useState<WhereView>(() => ({
        ...emptyWhereView(plan.length),
        ...(plan[0] ? { figure: plan[0].figure, object: plan[0].object, target: plan[0].target, choices: plan[0].choices } : {}),
    }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: WhereView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    // Početak nivoa: uputstvo jednom, pa prva rečenica
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const sentence = sentenceOf(viewRef.current);
        if (sentence) say(`${INSTRUCTION} ${sentence}`);
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
        guard.hold();
        const next: WhereView = {
            ...viewRef.current,
            figure: round.figure,
            object: round.object,
            target: round.target,
            choices: round.choices,
            round: index + 1,
            wrong: [],
            picked: null,
            feedback: null,
            hint: false,
        };
        const sentence = sentenceOf(next);
        commit(next, `Zadatak ${index + 1}: ${sentence ?? ""}`);
        if (sentence) say(sentence);
    };

    const handlePick = (relation: Relation) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const figure = getFigure(current.figure);
        const object = getPlaceObject(current.object);
        if (!figure || !object || !current.target || current.feedback === "correct" || current.wrong.includes(relation)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const sentence = placeSentence(figure, current.target, object);

        if (relation === current.target) {
            // Prvi zadatak prvog nivoa pokazuje ruka: pokazivanje, a ne zadatak — ne ocenjuje se
            const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
            const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
            const solved: WhereView = {
                ...current,
                picked: relation,
                feedback: "correct",
                hint: false,
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
            };
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
            commit(solved, `Tačno ${how}: ${sentence}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            sayThen(praise(sentence, firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy" });
            return;
        }

        const wrong = [...current.wrong, relation];
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, current.choices.length - 1);
        commit(
            { ...current, picked: relation, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 },
            `Netačno: ${sentence} → ${shownSentence(figure, relation, object)}`
        );
        playSfx("wrong");
        // Šta je na izabranoj slici, pa ponovo rečenica koju treba naći
        say(`${wrongText(figure, relation, object, hint)} ${sentence}`, undefined, "gentle");
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
        const sentence = sentenceOf(current);
        // Odgovor je već dat: ništa se ne ponavlja (i ne prekida se pohvala)
        if (!sentence || current.feedback === "correct") return;
        say(sentence);
    };

    const shown = isMonitor ? mergeWhereMonitor(monitorState) : view;
    const figure = getFigure(shown.figure);
    const object = getPlaceObject(shown.object);
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (!figure || !object || !shown.target || shown.choices.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const target = shown.target;
    const sentence = placeSentence(figure, target, object);
    const solved = shown.feedback === "correct";
    const showHand = !isMonitor && demoRounds(level, shown.totalRounds) > 0 && shown.round === 1 && shown.wrong.length === 0 && !solved;
    const message = solved ? sentence : shown.feedback === "wrong" && shown.picked ? wrongText(figure, shown.picked, object, shown.hint) : "";
    const count = shown.choices.length;

    return (
        <GameStage split>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up" compact title={sentence} />

            <PlayArea accent={GAME.accent}>
                <div
                    role="group"
                    aria-label="Slike"
                    className={cn("grid w-full gap-3 sm:gap-4 flat:gap-2 flat:sm:gap-2", count === 3 ? "max-w-4xl grid-cols-2 sm:grid-cols-3" : count === 2 ? "max-w-3xl grid-cols-2" : "max-w-3xl grid-cols-2 lg:max-w-5xl lg:grid-cols-4", isMonitor && "pointer-events-none")}
                >
                    {shown.choices.map((relation, index) => {
                        const state = choiceState(shown, relation);
                        return (
                            <ChoiceCard
                                key={`${shown.round}-${relation}`}
                                state={state}
                                disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(relation)}
                                aria-label={`${shownSentence(figure, relation, object)}${state === "correct" ? " Tačno." : state === "wrong" ? " Netačno." : ""}`}
                                className={cn(
                                    "animate-pop p-1.5 sm:p-2 flat:min-h-0",
                                    // Tri slike na telefonu: dve gore, treća ispod u sredini — veće slike nego tri u redu
                                    count === 3 && index === 2 && "col-span-2 mx-auto max-w-[calc(50%-0.375rem)] sm:col-span-1 sm:max-w-none"
                                )}
                            >
                                <WhereScene figure={figure.id} object={object.id} relation={relation} className="max-h-[min(19dvh,15rem)] w-full flat:max-h-[min(15dvh,15rem)]" />
                                {showHand && relation === target && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}
