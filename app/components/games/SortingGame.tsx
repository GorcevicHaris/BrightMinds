"use client";

// Igra „Razvrstaj”: jedan predmet je u sredini, ispod su dve do četiri korpe. Dete dodirne
// pravu korpu (bez prevlačenja — lakše za malu decu i slabiju motoriku), a predmet „uskoči”
// u nju; u korpi ostaje sve što je već razvrstano, pa dete vidi kako se korpe pune.
// Nivoi 1–5: po boji, 6–10: po vrsti, 11–15: tri ili četiri vrste i manje tipični predmeti.

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
    toCount,
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
import { basketFor, belongsTo, buildSortLevel, getSortItem, isBasketId, type BasketId, type SortItem, type SortRound } from "@/app/components/games/data/sortingItems";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

export interface SortingView extends BaseView {
    kind: "color" | "category";
    itemId: string;
    baskets: BasketId[];
    /** Korpe probane pogrešno u ovom zadatku */
    wrong: BasketId[];
    /** Poslednja dodirnuta korpa dok traje povratna poruka */
    picked: BasketId | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
    /** Šta je već razvrstano: korpa → predmeti */
    placed: Partial<Record<BasketId, string[]>>;
}

const GAME = getGame("sorting");
const WRONG_FEEDBACK_MS = 1400;

function capitalized(text: string): string {
    return text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);
}

function instructionFor(kind: SortingView["kind"]): string {
    return kind === "color" ? "Stavi u korpu iste boje." : "Stavi u pravu korpu.";
}

function correctText(item: SortItem, basket: BasketId): string {
    return `${capitalized(item.name)} je ${basketFor(basket).describe(item)}.`;
}

function wrongText(item: SortItem, basket: BasketId, hint: boolean): string {
    return `Netačno. ${capitalized(item.name)} nije ${basketFor(basket).describe(item)}. ${hint ? "Probaj još jednom, polako." : "Probaj ponovo."}`;
}

function emptyView(kind: SortingView["kind"], totalRounds: number): SortingView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind,
        itemId: "",
        baskets: [],
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        placed: {},
    };
}

/** Stanje sa monitora može biti nepotpuno — sve što fali ili nema smisla menja se podrazumevanim. */
function mergeMonitor(state: Partial<SortingView> | null | undefined): SortingView {
    const base = emptyView("color", 1);
    if (!state) return base;
    const baskets = Array.isArray(state.baskets) ? state.baskets.filter(isBasketId) : [];
    // U korpi su samo poznati predmeti, kao niz — stanje sa monitora može biti iz druge verzije
    const placed: SortingView["placed"] = {};
    if (state.placed && typeof state.placed === "object") {
        for (const id of baskets) {
            const list = (state.placed as Record<string, unknown>)[id];
            if (Array.isArray(list)) placed[id] = list.filter((itemId): itemId is string => typeof itemId === "string" && getSortItem(itemId) !== undefined);
        }
    }
    const item = typeof state.itemId === "string" ? getSortItem(state.itemId) : undefined;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind: state.kind === "category" ? "category" : "color",
        itemId: item ? item.id : "",
        baskets,
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((id) => baskets.includes(id)) : [],
        picked: baskets.find((id) => id === state.picked) ?? null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
        placed,
    };
}

function basketState(view: SortingView, item: SortItem, basket: BasketId): ChoiceState {
    if (view.feedback === "correct") return view.picked === basket ? "correct" : "idle";
    if (view.feedback === "wrong" && view.picked === basket) return "wrong";
    if (view.wrong.includes(basket)) return "dimmed";
    if (view.hint && belongsTo(item, basket)) return "hint";
    return "idle";
}

export default function SortingGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<SortingView>) {
    const settings = useChildSettings();
    const sync = useGameSync<SortingView>({ childId, gameId: "sorting", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju samo jednom, ovde
    const [plan] = useState(() =>
        isMonitor ? { kind: "color" as const, baskets: [], rounds: [] as SortRound[] } : buildSortLevel(level, { maxBaskets: settings.choiceLimit, maxRounds: settings.preset.maxRounds })
    );
    const [view, setView] = useState<SortingView>(() => ({
        ...emptyView(plan.kind, plan.rounds.length),
        itemId: plan.rounds[0]?.itemId ?? "",
        baskets: plan.baskets,
    }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: SortingView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    // Početak nivoa: uputstvo jednom, pa naziv prvog predmeta
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const item = getSortItem(viewRef.current.itemId);
        if (item) say(`${instructionFor(viewRef.current.kind)} ${capitalized(item.name)}.`);
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
        const round = plan.rounds[index];
        if (!round) return;
        const item = getSortItem(round.itemId);
        guard.hold();
        commit({ ...viewRef.current, itemId: round.itemId, round: index + 1, wrong: [], picked: null, feedback: null, hint: false }, `Zadatak ${index + 1}: ${item?.name ?? ""}`);
        // Posle prvog zadatka dete zna šta se radi: dovoljan je naziv predmeta
        if (item) say(`${capitalized(item.name)}.`);
    };

    const handlePick = (basket: BasketId) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const item = getSortItem(current.itemId);
        if (!item || current.feedback === "correct" || current.wrong.includes(basket)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;

        if (belongsTo(item, basket)) {
            // Prvi zadatak prvog nivoa pokazuje ruka: pokazivanje, a ne zadatak — ne ocenjuje se
            const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
            const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
            const solved: SortingView = {
                ...current,
                picked: basket,
                feedback: "correct",
                hint: false,
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
                placed: { ...current.placed, [basket]: [...(current.placed[basket] ?? []), item.id] },
            };
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
            commit(solved, `Tačno ${how}: ${item.name} → ${basketFor(basket).label}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            sayThen(praise(correctText(item, basket), firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy" });
            return;
        }

        const wrong = [...current.wrong, basket];
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, current.baskets.length - 1);
        commit({ ...current, picked: basket, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${item.name} → ${basketFor(basket).label}`);
        playSfx("wrong");
        say(wrongText(item, basket, hint), undefined, "gentle");
        // Kratka pauza: nekoliko brzih dodira zaredom ne postaje nekoliko grešaka
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    // Pomoć posle čekanja: prava korpa blago zasvetli (pre greške, ne posle nje)
    useWaitHint(!isMonitor && settings.waitHint, view.round, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (demoRounds(level, current.totalRounds) > 0 && current.round === 1 && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        const item = getSortItem(current.itemId);
        // Predmet je već u korpi: ništa se ne ponavlja (i ne prekida se pohvala)
        if (!item || current.feedback === "correct") return;
        say(`${instructionFor(current.kind)} ${capitalized(item.name)}.`);
    };

    const shown = isMonitor ? mergeMonitor(monitorState) : view;
    const item = getSortItem(shown.itemId);
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (!item || shown.baskets.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const showHand = !isMonitor && demoRounds(level, shown.totalRounds) > 0 && shown.round === 1 && shown.wrong.length === 0 && !solved;
    const message =
        shown.feedback === "correct" && shown.picked ? correctText(item, shown.picked) : shown.feedback === "wrong" && shown.picked ? wrongText(item, shown.picked, shown.hint) : "";

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt
                key={`prompt-${shown.kind}`}
                className="animate-fade-up"
                title={instructionFor(shown.kind).replace(/\.$/, "")}
            />

            <PlayArea accent={GAME.accent}>
                {/* Predmet koji se razvrstava: veliki, u sredini; posle tačnog odgovora „uskoči” u korpu */}
                <div
                    key={`${shown.round}-${item.id}`}
                    className={cn(
                        "mb-4 grid shrink-0 place-items-center rounded-3xl border-4 border-dashed border-brand-200 bg-white/80 sm:mb-6",
                        solved ? "animate-fade" : "animate-pop"
                    )}
                    style={{ width: "clamp(6rem, 18dvh, 10rem)", height: "clamp(6rem, 18dvh, 10rem)" }}
                >
                    <span className={cn("text-[clamp(3.5rem,11dvh,6.5rem)] leading-none", solved && "opacity-30")} aria-hidden="true">
                        {item.emoji}
                    </span>
                </div>
                <p className="-mt-2 mb-4 text-center font-display text-xl font-extrabold text-ink sm:mb-6 sm:text-2xl" aria-live="polite">
                    {capitalized(item.name)}
                </p>

                <div
                    role="group"
                    aria-label="Korpe"
                    className={cn("grid w-full max-w-3xl gap-3 sm:gap-4", shown.baskets.length === 2 ? "grid-cols-2" : shown.baskets.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4", isMonitor && "pointer-events-none")}
                >
                    {shown.baskets.map((id) => {
                        const basket = basketFor(id);
                        const state = basketState(shown, item, id);
                        const placed = (shown.placed[id] ?? []).map((placedId) => getSortItem(placedId)?.emoji).filter(Boolean);
                        return (
                            <ChoiceCard
                                key={id}
                                state={state}
                                disabled={isMonitor || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(id)}
                                aria-label={`Korpa: ${basket.label}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className="min-h-28 flex-col gap-1.5 px-1.5 sm:min-h-44 sm:gap-2 sm:px-3"
                            >
                                {/* Na telefonu je sličica iznad naziva, da i „Životinje” stanu u uzanu korpu */}
                                <span className="flex flex-col items-center gap-1 text-base leading-tight sm:flex-row sm:gap-2 sm:text-xl">
                                    {basket.swatch ? (
                                        <span aria-hidden="true" className="h-7 w-7 shrink-0 rounded-full border-2 border-white shadow-soft ring-1 ring-line sm:h-8 sm:w-8" style={{ background: basket.swatch }} />
                                    ) : (
                                        <span aria-hidden="true" className="text-2xl sm:text-3xl">
                                            {basket.emoji}
                                        </span>
                                    )}
                                    {basket.label}
                                </span>
                                {/* Korpa: ono što je već razvrstano */}
                                <span aria-hidden="true" className="flex min-h-10 w-full flex-wrap content-end items-end justify-center gap-0.5 rounded-b-2xl border-x-4 border-b-4 border-amber-700/60 bg-amber-100/70 px-1 pb-1 pt-2 text-xl leading-none sm:min-h-12 sm:text-2xl">
                                    {placed.map((emoji, i) => (
                                        <span key={`${emoji}-${i}`} className={cn(i === placed.length - 1 && solved && shown.picked === id && "animate-pop")}>
                                            {emoji}
                                        </span>
                                    ))}
                                </span>
                                {showHand && belongsTo(item, id) && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}
