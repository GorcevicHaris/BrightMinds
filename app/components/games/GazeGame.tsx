"use client";

// Igra „Šta gleda?”: dete na slici gleda u jedan od predmeta oko sebe, a dete koje igra
// pronađe taj predmet među karticama. Vežba se praćenje tuđeg pogleda (zajednička pažnja) na
// crtežu — nikad se ne traži da dete nekoga gleda u oči. Na vrhu se pogled povezuje sa mislima:
// u šta neko gleda, to i želi („Šta Amina želi?”), i ko je video, taj zna („Ko zna šta je u kutiji?”).
// Nivoi 1–5: dva predmeta, lik okreće glavu (prvo i pokazuje rukom); 6–10: tri i četiri predmeta;
// 11–15: samo oči, pa želja i znanje. Pomoć su tačkice od očiju lika do onoga u šta gleda.

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
    buildGazeLevel,
    emptyGazeView,
    gazeAnswer,
    gazeQuestion,
    gazeWrong,
    getGazeCharacter,
    getGazeObject,
    mergeGazeMonitor,
    roundFields,
    type GazeObject,
    type GazeRound,
    type GazeView,
} from "@/app/components/games/data/gazeRounds";
import { gazeScene } from "@/app/components/games/data/gazeScenes";
import { Figure } from "@/app/components/games/scene/figures";
import { Prop } from "@/app/components/games/scene/props";
import { SceneArt } from "@/app/components/games/scene/SceneArt";
import type { LookId } from "@/app/components/games/scene/types";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("gaze");
const WRONG_FEEDBACK_MS = 1400;
const INSTRUCTION = "Pogledaj sliku.";

function choiceState(view: GazeView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.target ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    // Pomoć je na slici (tačkice od očiju), a ne na kartici: dete i dalje samo prati pogled
    return "idle";
}

/** Isti crtež predmeta kao na slici, sam na kartici */
function ObjectPicture({ object, className }: { object: GazeObject; className?: string }) {
    const [x0, y0, x1, y1] = object.box;
    const pad = 3;
    return (
        <svg viewBox={`${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`} className={className} aria-hidden="true" focusable="false">
            <Prop id={object.prop} tone={object.tone} />
        </svg>
    );
}

/** Glava i ramena deteta sa slike (gleda pravo), za kartice u zadatku „Ko zna?” */
function PersonPicture({ look, className }: { look: LookId; className?: string }) {
    return (
        <svg viewBox="-30 -88 60 56" className={className} aria-hidden="true" focusable="false">
            <Figure id={look} face="calm" />
        </svg>
    );
}

export default function GazeGame({ childId, level, gender, childName, onComplete, isMonitor = false, monitorState }: GameProps<GazeView>) {
    const settings = useChildSettings();
    const sync = useGameSync<GazeView>({ childId, gameId: "gaze", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju samo jednom, ovde
    const [plan] = useState<GazeRound[]>(() => (isMonitor ? [] : buildGazeLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds, childName })));
    const [view, setView] = useState<GazeView>(() => ({ ...emptyGazeView(plan.length), ...(plan[0] ? roundFields(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: GazeView, log?: string) => {
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
        if (viewRef.current.hero) say(`${INSTRUCTION} ${gazeQuestion(viewRef.current)}`);
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
        const question = gazeQuestion(round);
        commit({ ...viewRef.current, ...roundFields(round), round: index + 1, wrong: [], picked: null, feedback: null, hint: false }, `Zadatak ${index + 1}: ${question}`);
        say(question);
    };

    const handlePick = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (!current.hero || current.feedback === "correct" || current.wrong.includes(id) || !current.choices.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const question = gazeQuestion(current);

        if (id === current.target) {
            // Prvi zadatak prvog nivoa pokazuje ruka: pokazivanje, a ne zadatak — ne ocenjuje se
            const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
            const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
            const solved: GazeView = {
                ...current,
                picked: id,
                feedback: "correct",
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
            };
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
            const answer = gazeAnswer(current);
            commit(solved, `Tačno ${how}: ${question} → ${answer}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            sayThen(praise(answer, firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy" });
            return;
        }

        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, current.choices.length - 1);
        const shown = current.kind === "know" ? getGazeCharacter(id)?.name : getGazeObject(id)?.name;
        commit({ ...current, picked: id, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${question} → ${shown ?? id}`);
        playSfx("wrong");
        say(`${gazeWrong(current, id, hint)} ${question}`, undefined, "gentle");
        // Kratka pauza: nekoliko brzih dodira zaredom ne postaje nekoliko grešaka
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    // Pomoć posle čekanja: tačkice od očiju lika (pre greške, ne posle nje)
    useWaitHint(!isMonitor && settings.waitHint, view.round, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (demoRounds(level, current.totalRounds) > 0 && current.round === 1 && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        // Odgovor je već dat: ništa se ne ponavlja (i ne prekida se pohvala)
        if (!current.hero || current.feedback === "correct") return;
        say(gazeQuestion(current));
    };

    const shown = isMonitor ? mergeGazeMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const solved = shown.feedback === "correct";
    const demo = !isMonitor && demoRounds(level, shown.totalRounds) > 0 && shown.round === 1 && shown.wrong.length === 0 && !solved;
    // Tačkice: uz pomoć, u pokaznom zadatku i posle tačnog odgovora (potvrda: „gleda loptu”)
    const picture = shown.hero ? gazeScene(shown, shown.hint || solved || demo) : null;

    if (!picture || shown.choices.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const question = gazeQuestion(shown);
    const message = solved ? gazeAnswer(shown) : shown.feedback === "wrong" && shown.picked ? gazeWrong(shown, shown.picked, shown.hint) : "";
    const count = shown.choices.length;
    const know = shown.kind === "know";

    return (
        <GameStage className="gap-3 sm:gap-4">
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up" compact title={question} />

            <PlayArea accent={GAME.accent} className="p-2.5 sm:p-4">
                {/* Slika je glavni deo zadatka: što veća. Na položenom tabletu kartice su desno od nje, inače ispod. */}
                <div className="flex w-full flex-col items-center justify-center gap-3 sm:gap-4 md:landscape:flex-row md:landscape:gap-5">
                    <div
                        key={`scene-${shown.round}`}
                        className="w-full max-w-[min(100%,50dvh)] animate-fade-up overflow-hidden rounded-2xl bg-surface ring-1 ring-blue-100 short:max-w-[min(100%,40dvh)] md:landscape:max-w-[min(64%,calc(max(12rem,100dvh-28.5rem)*1.5))]!"
                    >
                        <SceneArt spec={picture} className="h-auto w-full" />
                    </div>

                    <div
                        role="group"
                        aria-label={know ? "Deca" : "Predmeti"}
                        className={cn(
                            "grid w-full gap-2 sm:gap-3",
                            count === 2 ? "max-w-md grid-cols-2" : count === 3 ? "max-w-xl grid-cols-3" : "max-w-2xl grid-cols-4",
                            // Položen tablet: kartice pored slike — dve jedna ispod druge, tri i četiri u dve kolone
                            count === 2 ? "md:landscape:w-48 md:landscape:shrink-0 md:landscape:grid-cols-1" : "md:landscape:w-72 md:landscape:shrink-0 md:landscape:grid-cols-2",
                            isMonitor && "pointer-events-none"
                        )}
                    >
                        {shown.choices.map((id) => {
                            const state = choiceState(shown, id);
                            const object = know ? undefined : getGazeObject(id);
                            const person = know ? getGazeCharacter(id) : undefined;
                            const label = object?.name ?? person?.name ?? "";
                            if (!label) return null;
                            return (
                                <ChoiceCard
                                    key={`${shown.round}-${id}`}
                                    state={state}
                                    disabled={isMonitor || solved || state !== "idle"}
                                    onClick={() => handlePick(id)}
                                    aria-label={`${label}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                    className="animate-pop min-h-0 flex-col gap-1 px-1 py-2 sm:gap-1.5 sm:p-3"
                                >
                                    {object && <ObjectPicture object={object} className="h-[clamp(2.75rem,9dvh,5.5rem)] w-auto max-w-full" />}
                                    {person && <PersonPicture look={person.id} className="h-[clamp(3rem,10dvh,6rem)] w-auto max-w-full" />}
                                    {/* Natpis je za odrasle i decu koja čitaju; pitanje ne imenuje predmet */}
                                    <span className="text-sm leading-tight sm:text-lg">{label}</span>
                                    {demo && id === shown.target && <DemoHand />}
                                </ChoiceCard>
                            );
                        })}
                    </div>
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}
