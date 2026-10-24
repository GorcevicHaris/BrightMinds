"use client";

// Igra „Razvrstaj”: jedan predmet je u sredini, ispod su dve do četiri korpe. Dete dodirne
// pravu korpu (bez prevlačenja — lakše za malu decu i slabiju motoriku), a predmet „uskoči”
// u nju; u korpi ostaje sve što je već razvrstano, pa dete vidi kako se korpe pune.
// Nivoi 1–5: po boji i obliku, 6–10: po vrsti, 11–15: manje tipični predmeti i pravila
// („šta se jede”, „leto ili zima”, „gde živi”). Pomoć na korpama se povlači: primer u korpi →
// slika i natpis → samo natpis (pravilo se kaže jednom, na početku).

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
import {
    basketFor,
    belongsTo,
    buildSortLevel,
    colorHex,
    ruleIntro,
    getSortItem,
    isBasketId,
    type BasketId,
    type SortItem,
    type SortKind,
    type SortLevel,
    type SortShape,
    type SortSupport,
} from "@/app/components/games/data/sortingItems";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

export interface SortingView extends BaseView {
    kind: SortKind;
    /** Pomoć na korpama: primer u korpi, slika i natpis, samo natpis */
    support: SortSupport;
    /** Predmeti koji su od početka u korpama kao primer */
    modelIds: string[];
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

function instructionFor(kind: SortingView["kind"], intro?: string): string {
    if (kind === "color") return "Stavi u korpu iste boje.";
    if (kind === "rule" && intro) return intro;
    return kind === "shape" ? "Stavi u korpu istog oblika." : "Stavi u pravu korpu.";
}

/** Natpis uputstva na ekranu (pravilo nije na ekranu kad se kaže samo jednom) */
function titleFor(kind: SortingView["kind"], support: SortSupport, intro?: string): string {
    if (kind === "rule") return support === "text" ? "Razvrstaj po pravilu" : (intro ?? "Stavi u pravu korpu.").replace(/[.?]$/, "");
    return instructionFor(kind).replace(/\.$/, "");
}

/** Kad su u korpama primeri, uputstvo na početku nivoa to i kaže */
const MODEL_NOTE = "Pogledaj šta je već u korpama.";

/** U nivoima oblika naziv bi odao odgovor („Krug.”), pa se predmet ne imenuje */
function namesAnswer(kind: SortingView["kind"], item: SortItem): boolean {
    return kind === "shape" && item.shape !== undefined;
}

/** Šta glas kaže kad se pojavi predmet */
function itemPrompt(kind: SortingView["kind"], item: SortItem): string {
    return namesAnswer(kind, item) ? "Gde ide ovaj oblik?" : `${capitalized(item.name)}.`;
}

function correctText(item: SortItem, basket: BasketId): string {
    return basketFor(basket).yes(item);
}

function wrongText(item: SortItem, basket: BasketId, hint: boolean): string {
    const retry = hint ? "Probaj još jednom, polako." : "Probaj ponovo.";
    return `Netačno. ${basketFor(basket).no(item)} ${retry}`;
}

/** Geometrijski oblik (krug, kvadrat, trougao, zvezda) u zadatoj boji */
function ShapeGlyph({ shape, fill, className }: { shape: SortShape; fill: string; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
            <g fill={fill} stroke="rgba(0,0,0,0.18)" strokeWidth="4" strokeLinejoin="round">
                {shape === "circle" && <circle cx="50" cy="50" r="42" />}
                {shape === "square" && <rect x="10" y="10" width="80" height="80" rx="10" />}
                {shape === "triangle" && <path d="M50 8 L93 88 H7 Z" />}
                {shape === "star" && <path d="M50 6 L62 37 L95 38 L69 58 L78 91 L50 72 L22 91 L31 58 L5 38 L38 37 Z" />}
            </g>
        </svg>
    );
}

/** Predmet: emodži ili nacrtan oblik */
function ItemPicture({ item, className }: { item: SortItem; className: string }) {
    if (item.shape && item.color) return <ShapeGlyph shape={item.shape} fill={colorHex(item.color)} className={className} />;
    return (
        <span className={className} aria-hidden="true">
            {item.emoji}
        </span>
    );
}

function emptyView(kind: SortingView["kind"], totalRounds: number): SortingView {
    return {
        support: "label",
        modelIds: [],
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
        kind: state.kind === "category" || state.kind === "shape" || state.kind === "rule" ? state.kind : "color",
        support: state.support === "model" || state.support === "text" ? state.support : "label",
        modelIds: Array.isArray(state.modelIds) ? state.modelIds.filter((id): id is string => typeof id === "string" && Object.values(placed).some((list) => list?.includes(id))) : [],
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
    const [plan] = useState<SortLevel>(() =>
        isMonitor ? { kind: "color", support: "label", baskets: [], rounds: [], models: {} } : buildSortLevel(level, { maxBaskets: settings.choiceLimit, maxRounds: settings.preset.maxRounds })
    );
    const [view, setView] = useState<SortingView>(() => {
        // Primeri su od početka u svojim korpama
        const placed: SortingView["placed"] = {};
        for (const [basket, itemId] of Object.entries(plan.models) as [BasketId, string][]) placed[basket] = [itemId];
        return {
            ...emptyView(plan.kind, plan.rounds.length),
            support: plan.support,
            modelIds: Object.values(plan.models).filter((id): id is string => typeof id === "string"),
            placed,
            itemId: plan.rounds[0]?.itemId ?? "",
            baskets: plan.baskets,
        };
    });
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
        const note = viewRef.current.modelIds.length > 0 ? ` ${MODEL_NOTE}` : "";
        if (item) say(`${instructionFor(viewRef.current.kind, plan.intro)}${note} ${itemPrompt(viewRef.current.kind, item)}`);
    }, [isMonitor, sync, guard, say, plan.intro]);

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
        if (item) say(itemPrompt(viewRef.current.kind, item));
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
        say(`${instructionFor(current.kind, plan.intro)} ${itemPrompt(current.kind, item)}`);
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
                title={titleFor(shown.kind, shown.support, plan.intro ?? ruleIntro(shown.baskets))}
            />

            <PlayArea accent={GAME.accent}>
                {/* Predmet koji se razvrstava: veliki, u sredini; posle tačnog odgovora „uskoči” u korpu */}
                <div
                    key={`${shown.round}-${item.id}`}
                    className={cn(
                        "mb-4 grid shrink-0 place-items-center rounded-3xl border-4 border-dashed border-brand-200 bg-white/80 sm:mb-6 short:sm:mb-3",
                        solved ? "animate-fade" : "animate-pop"
                    )}
                    style={{ width: "clamp(5.5rem, 16dvh, 10rem)", height: "clamp(5.5rem, 16dvh, 10rem)" }}
                >
                    <ItemPicture
                        item={item}
                        className={cn(
                            item.shape ? "h-[70%] w-[70%]" : "text-[clamp(3.5rem,11dvh,6.5rem)] leading-none",
                            solved && "opacity-30"
                        )}
                    />
                </div>
                {/* U nivoima oblika naziv bi odao odgovor, pa se ne prikazuje (mesto ostaje, da se ništa ne pomera) */}
                <p className="-mt-2 mb-4 min-h-7 text-center font-display text-xl font-extrabold text-ink sm:mb-6 sm:min-h-8 sm:text-2xl short:sm:mb-3" aria-live="polite">
                    {namesAnswer(shown.kind, item) ? "" : capitalized(item.name)}
                </p>

                <div
                    role="group"
                    aria-label="Korpe"
                    className={cn("grid w-full max-w-3xl gap-3 sm:gap-4", shown.baskets.length === 2 ? "grid-cols-2" : shown.baskets.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4", isMonitor && "pointer-events-none")}
                >
                    {shown.baskets.map((id) => {
                        const basket = basketFor(id);
                        const state = basketState(shown, item, id);
                        const placed = (shown.placed[id] ?? []).map((placedId) => getSortItem(placedId)).filter((placedItem): placedItem is SortItem => placedItem !== undefined);
                        return (
                            <ChoiceCard
                                key={id}
                                state={state}
                                disabled={isMonitor || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(id)}
                                aria-label={`Korpa: ${basket.label}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className="min-h-28 flex-col gap-1.5 px-1.5 sm:min-h-44 sm:gap-2 sm:px-3 short:sm:min-h-32"
                            >
                                {/* Na telefonu je sličica iznad naziva, da i „Životinje” stanu u uzanu korpu */}
                                <span className={cn("flex flex-col items-center gap-1 leading-tight sm:flex-row sm:gap-2", shown.support === "text" ? "text-lg sm:text-2xl" : "text-base sm:text-xl")}>
                                    {/* Na najtežim nivoima korpa ima samo natpis: pravilo je rečeno jednom, na početku */}
                                    {shown.support === "text" ? null : basket.swatch ? (
                                        <span aria-hidden="true" className="h-7 w-7 shrink-0 rounded-full border-2 border-white shadow-soft ring-1 ring-line sm:h-8 sm:w-8" style={{ background: basket.swatch }} />
                                    ) : basket.shape ? (
                                        // Oblik na korpi je siv: korpa traži oblik, a ne boju
                                        <ShapeGlyph shape={basket.shape} fill="#94a3b8" className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
                                    ) : (
                                        <span aria-hidden="true" className="text-2xl sm:text-3xl">
                                            {basket.emoji}
                                        </span>
                                    )}
                                    {basket.label}
                                </span>
                                {/* Korpa: ono što je već razvrstano */}
                                <span aria-hidden="true" className="flex min-h-10 w-full flex-wrap content-end items-end justify-center gap-0.5 rounded-b-2xl border-x-4 border-b-4 border-amber-700/60 bg-amber-100/70 px-1 pb-1 pt-2 text-xl leading-none sm:min-h-12 sm:text-2xl">
                                    {placed.map((placedItem, i) => (
                                        <span
                                            key={placedItem.id}
                                            title={shown.modelIds.includes(placedItem.id) ? "Primer" : undefined}
                                            className={cn(
                                                "inline-grid place-items-center",
                                                // Primer je uokviren isprekidano: to je stavio učitelj, ne dete
                                                shown.modelIds.includes(placedItem.id) && "rounded-lg bg-white/80 outline-2 outline-offset-1 outline-dashed outline-amber-500",
                                                i === placed.length - 1 && solved && shown.picked === id && "animate-pop"
                                            )}
                                        >
                                            <ItemPicture item={placedItem} className={placedItem.shape ? "h-6 w-6 sm:h-7 sm:w-7" : ""} />
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
