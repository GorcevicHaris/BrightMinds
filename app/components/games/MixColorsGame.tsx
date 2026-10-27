"use client";

// Igra „Mešaj boje”: dve boje se sipaju u činiju i nastaje nova (uzrok i posledica).
// Dve vrste zadataka: „Šta će nastati?” (dete vidi dve tegle i bira boju koja nastaje) i
// „Napravi boju” (predmet čeka boju, a dete sipa dve tegle u činiju). I pogrešno mešanje
// pokaže i kaže šta je nastalo, pa dete uči i iz pokušaja. Nivoi 1–5: osnovne boje,
// 6–10: sa belom (svetle nijanse), 11–15: sa crnom i pomešane boje (tamne nijanse, braon).

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
    buildMixLevel,
    emptyMixView,
    getPaint,
    getThing,
    mergeMixMonitor,
    mixOf,
    mixSentence,
    type MixRound,
    type MixView,
    type PaintId,
} from "@/app/components/games/data/mixColorsLevels";
import { MixBowl, PaintBlob, PaintPot, ThingArt } from "@/app/components/games/mixcolors/MixArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("mixcolors");
/** Koliko se boje mešaju u činiji pre nego što se vidi nova boja */
const MIX_MS = 1100;
/** Koliko pogrešna mešavina ostaje u činiji (dete vidi šta je nastalo), pa se činija isprazni */
const WRONG_MS = 2600;
const WRONG_CHOICE_MS = 1400;

function cap(text: string): string {
    return text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);
}

/** Natpis boje na kartici: dugačke složenice („svetloljubičasta”) mogu da se prelome posle „svetlo”/„tamno” */
function label(text: string): string {
    return cap(text).replace(/^(Svetlo|Tamno)/, "$1\u00AD");
}

/** Pitanje koje se izgovara i piše */
function question(view: Pick<MixView, "kind" | "target" | "pair" | "thing">): { title: string; subtitle: string; voice: string } {
    const target = getPaint(view.target);
    if (view.kind === "predict") {
        const [a, b] = view.pair.map(getPaint);
        if (!a || !b) return { title: "", subtitle: "", voice: "" };
        return {
            title: "Koja boja će nastati?",
            subtitle: `${cap(a.name)} i ${b.name}`,
            voice: `Koja boja nastaje kad pomešamo ${a.acc} i ${b.acc}?`,
        };
    }
    const thing = getThing(view.thing);
    if (!target) return { title: "", subtitle: "", voice: "" };
    return {
        title: `Napravi ${target.acc} boju`,
        subtitle: thing ? cap(thing.forWhat) : "",
        voice: `Napravi ${target.acc} boju${thing ? ` ${thing.forWhat}` : ""}. Koje dve boje treba pomešati?`,
    };
}

/** „Za zelenu treba žuta i plava.” */
function needSentence(target: string, pair: readonly string[]): string {
    const t = getPaint(target);
    const [a, b] = pair.map(getPaint);
    if (!t || !a || !b) return "";
    return `Za ${t.acc} treba ${a.name} i ${b.name}.`;
}

export default function MixColorsGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<MixView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<MixView>({ childId, gameId: "mixcolors", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<MixRound[]>(() => (isMonitor ? [] : buildMixLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds, random })));
    const [view, setView] = useState<MixView>(() => ({ ...emptyMixView(plan.length), ...roundFields(plan[0]) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const timer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: MixView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    // Početak nivoa: prvo pitanje
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        say(question(viewRef.current).voice);
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: MixView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

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
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: MixView = { ...viewRef.current, ...roundFields(round), round: index + 1 };
        commit(next, `Zadatak ${index + 1}: ${question(next).title} ${question(next).subtitle}`);
        say(question(next).voice);
    };

    /** Tačno: pohvala sa rečenicom šta je nastalo, pa sledeći zadatak */
    const solve = (current: MixView, extra: Partial<MixView>) => {
        const modeled = modeledRound(current);
        const firstTry = current.misses === 0 && !current.hint && !modeled;
        const solved: MixView = {
            ...current,
            ...extra,
            feedback: "correct",
            hint: false,
            painted: true,
            score: current.score + (firstTry ? 10 : 5),
            correctCount: current.correctCount + (firstTry ? 1 : 0),
            promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
        };
        const [a, b] = (extra.bowl ?? current.pair) as PaintId[];
        const sentence = mixSentence(a, b);
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(solved, `Tačno ${how}: ${sentence}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(sentence, firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy", min: 1600 });
    };

    // ── „Šta će nastati?” ─────────────────────────────────────────────────────
    const handleChoice = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.kind !== "predict" || current.feedback === "correct" || current.wrong.includes(id) || !getPaint(id)) return;
        cancel(timer.current);
        timer.current = null;
        if (id === current.target) {
            // Činija pokazuje mešanje: dve boje se vrte, pa nastaje nova
            solve({ ...current, picked: id, bowl: current.pair, mixed: null }, { picked: id, bowl: current.pair, mixed: null });
            timer.current = after(calm ? 0 : MIX_MS, () => {
                timer.current = null;
                commit({ ...viewRef.current, mixed: current.target });
            });
            return;
        }
        const wrong = [...current.wrong, id];
        const misses = current.misses + 1;
        const hint = current.hint || hintDue(settings.hintAfter, misses, current.choices.length - 1);
        commit({ ...current, picked: id, feedback: "wrong", wrong, misses, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${getPaint(id)?.name}`);
        playSfx("wrong");
        say(`Ne nastaje ${getPaint(id)?.name}. ${hint ? "Pogledaj boju koja svetli." : "Probaj ponovo."}`, undefined, "gentle");
        guard.hold();
        timer.current = after(WRONG_CHOICE_MS, () => {
            timer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    // ── „Napravi boju” ────────────────────────────────────────────────────────
    const handlePot = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.kind !== "make" || current.feedback || current.bowl.length >= 2 || current.bowl.includes(id) || !current.pots.includes(id)) return;
        const bowl = [...current.bowl, id];
        if (bowl.length < 2) {
            playSfx("tap");
            commit({ ...current, bowl }, `Sipano: ${getPaint(id)?.name}`);
            return;
        }
        // Druga tegla: boje se mešaju, pa se vidi šta je nastalo
        playSfx("tap");
        commit({ ...current, bowl, mixed: null }, `Sipano: ${getPaint(id)?.name}`);
        guard.hold();
        timer.current = after(calm ? 200 : MIX_MS, () => {
            timer.current = null;
            const now = viewRef.current;
            const result = mixOf(bowl[0] as PaintId, bowl[1] as PaintId);
            if (result === now.target) {
                solve(now, { bowl, mixed: result });
                return;
            }
            const misses = now.misses + 1;
            const hint = now.hint || hintDue(settings.hintAfter, misses, 2);
            const sentence = mixSentence(bowl[0] as PaintId, bowl[1] as PaintId);
            commit(
                { ...now, mixed: result, feedback: "wrong", misses, hint, incorrectCount: now.incorrectCount + 1 },
                `Netačno: ${sentence}`
            );
            playSfx("wrong");
            // Šta je nastalo (uzrok i posledica), a uz pomoć i koje dve boje trebaju
            say(`${sentence} ${hint ? needSentence(now.target, now.pair) : "Probaj ponovo."}`, undefined, "gentle");
            timer.current = after(WRONG_MS, () => {
                timer.current = null;
                commit({ ...viewRef.current, bowl: [], mixed: null, feedback: null });
            });
        });
    };

    // Pomoć posle čekanja: prave tegle (ili prava boja) blago zasvetle
    useWaitHint(!isMonitor && settings.waitHint, view.round, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback || current.bowl.length > 0) return;
        if (modeledRound(current) && current.misses === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        say(question(current).voice);
    };

    const shown = isMonitor ? mergeMixMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const target = getPaint(shown.target);

    if (!target) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const q = question(shown);
    const solved = shown.feedback === "correct";
    const showHand = !isMonitor && modeledRound(shown) && shown.misses === 0 && !solved;
    const mixing = shown.bowl.length === 2 && !shown.mixed;
    const message =
        solved && shown.bowl.length === 2
            ? mixSentence(shown.bowl[0] as PaintId, shown.bowl[1] as PaintId)
            : shown.feedback === "wrong"
              ? shown.kind === "make" && shown.bowl.length === 2
                  ? `${mixSentence(shown.bowl[0] as PaintId, shown.bowl[1] as PaintId)} ${shown.hint ? needSentence(shown.target, shown.pair) : "Probaj ponovo."}`
                  : `Ne nastaje ${getPaint(shown.picked)?.name ?? "ta boja"}. Probaj ponovo.`
              : "";

    return (
        <GameStage split>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up" compact title={q.title} subtitle={q.subtitle} />

            <PlayArea accent={GAME.accent} className="gap-3 sm:gap-5 flat:gap-2">
                {/* Gornji red: u „Šta će nastati?” dve tegle = činija; u „Napravi boju” predmet i činija */}
                {shown.kind === "predict" ? (
                    <div className="grid w-full max-w-xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.5fr)] items-center gap-1 sm:gap-3" aria-hidden="true">
                        <PaintPot color={shown.pair[0]} className="mx-auto h-auto max-h-[clamp(4.5rem,19dvh,10rem)] w-full" />
                        <span className="font-display text-3xl font-extrabold text-ink-soft sm:text-5xl">+</span>
                        <PaintPot color={shown.pair[1]} className="mx-auto h-auto max-h-[clamp(4.5rem,19dvh,10rem)] w-full" />
                        <span className="font-display text-3xl font-extrabold text-ink-soft sm:text-5xl">=</span>
                        <MixBowl colors={shown.bowl} mixed={shown.mixed} mixing={mixing} calm={calm} question className="mx-auto h-auto max-h-[clamp(4rem,15dvh,8.5rem)] w-full" />
                    </div>
                ) : (
                    <div className="grid w-full max-w-xl grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 sm:gap-6">
                        <figure className="flex min-w-0 flex-col items-center">
                            <ThingArt
                                key={shown.painted ? "painted" : "plain"}
                                id={getThing(shown.thing)?.id ?? "orange"}
                                color={shown.painted ? shown.target : null}
                                className={cn("h-auto max-h-[clamp(5rem,20dvh,11rem)] w-full", shown.painted && !calm && "animate-pop")}
                            />
                            <figcaption className="text-sm font-extrabold text-ink-soft sm:text-base">{getThing(shown.thing)?.name}</figcaption>
                        </figure>
                        <MixBowl colors={shown.bowl} mixed={shown.mixed} mixing={mixing} calm={calm} className="h-auto max-h-[clamp(4.5rem,17dvh,9.5rem)] w-full" />
                    </div>
                )}

                {shown.kind === "predict" ? (
                    <div
                        role="group"
                        aria-label="Boje"
                        className={cn("grid w-full max-w-2xl gap-2.5 sm:gap-4", shown.choices.length === 2 ? "max-w-md grid-cols-2" : shown.choices.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4 flat:grid-cols-4", isMonitor && "pointer-events-none")}
                    >
                        {shown.choices.map((id) => {
                            const paint = getPaint(id);
                            if (!paint) return null;
                            const state = predictState(shown, id);
                            return (
                                <ChoiceCard
                                    key={`${shown.round}-${id}`}
                                    state={state}
                                    disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                    onClick={() => handleChoice(id)}
                                    data-action={`choice:${id}`}
                                    aria-label={`${cap(paint.name)}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                    className="animate-pop min-h-0 flex-col gap-0.5 p-1.5 sm:gap-1 sm:p-2"
                                >
                                    <PaintBlob color={id} className="h-[clamp(3rem,12dvh,6.5rem)] w-auto" />
                                    <span className="max-w-full text-sm leading-tight hyphens-manual sm:text-lg flat:text-sm">{label(paint.name)}</span>
                                    {showHand && id === shown.target && <DemoHand />}
                                </ChoiceCard>
                            );
                        })}
                    </div>
                ) : (
                    <div
                        role="group"
                        aria-label="Tegle sa bojom"
                        // Do četiri tegle u jednom redu; pet na telefonu ide 3 + 2, a drugi red je u sredini
                        className={cn(
                            "w-full max-w-3xl gap-2 sm:gap-3",
                            shown.pots.length <= 3
                                ? "grid max-w-md grid-cols-3"
                                : shown.pots.length === 4
                                  ? "grid max-w-xl grid-cols-4"
                                  : "flex flex-wrap justify-center *:basis-[calc((100%-1rem)/3-1px)] sm:*:basis-[calc((100%-3.75rem)/6-1px)] flat:*:basis-[calc((100%-3.75rem)/6-1px)]",
                            isMonitor && "pointer-events-none"
                        )}
                    >
                        {shown.pots.map((id) => {
                            const paint = getPaint(id);
                            if (!paint) return null;
                            const poured = shown.bowl.includes(id);
                            const state: ChoiceState = poured ? "selected" : shown.hint && shown.pair.includes(id) && !solved ? "hint" : solved ? "dimmed" : "idle";
                            return (
                                <ChoiceCard
                                    key={`${shown.round}-${id}`}
                                    state={state}
                                    disabled={isMonitor || Boolean(shown.feedback) || poured || shown.bowl.length >= 2}
                                    onClick={() => handlePot(id)}
                                    data-action={`pot:${id}`}
                                    aria-pressed={poured}
                                    aria-label={`${cap(paint.name)}${poured ? ", sipano u činiju" : ""}`}
                                    className="animate-pop min-h-0 flex-col gap-0.5 p-1 sm:p-2"
                                >
                                    <PaintPot color={id} empty={poured} className="h-[clamp(3rem,10dvh,6rem)] w-auto" />
                                    <span className="max-w-full text-xs leading-tight hyphens-manual sm:text-base flat:text-xs">{label(paint.name)}</span>
                                </ChoiceCard>
                            );
                        })}
                    </div>
                )}
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}

function roundFields(round: MixRound | undefined): Partial<MixView> {
    if (!round) return {};
    return {
        kind: round.kind,
        target: round.target,
        pair: [...round.pair],
        thing: round.thing,
        pots: [...round.pots],
        choices: [...round.choices],
        bowl: [],
        mixed: null,
        wrong: [],
        misses: 0,
        picked: null,
        feedback: null,
        hint: false,
        painted: false,
    };
}

function predictState(view: MixView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.target ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.target) return "hint";
    return "idle";
}
