"use client";

// Igra „Šta jede?”: na velikoj slici je životinja, glas pita „Šta jede zeka?”, a dete bira hranu.
// Posle tačnog izbora životinja kratko i veselo pojede hranu, a glas kaže doslovnu rečenicu
// („Zeka jede šargarepu.”). Kasnije se pita obrnuto („Ko jede bambus?”), pa „Šta ne jede…?”,
// „Ko još jede travu?” i hranjenje: hrana se prevlači (ili dodirne, pa dodirne životinja) do
// prave životinje. Nema žurbe ni tajmera; posle greške glas mirno kaže tačnu činjenicu
// („Mačka ne jede bambus.”), a pomoć (tačna slika zasvetli) se na težim nivoima povlači.

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    DemoHand,
    demoRounds,
    Feedback,
    FEEDBACK_MIN_MS,
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
    answerSentence,
    buildFoodLevel,
    eatsSentence,
    emptyFoodView,
    foodResult,
    foodRule,
    getAnimal,
    getFood,
    mergeFoodMonitor,
    notSentence,
    roundQuestion,
    roundView,
    solvedPair,
    solveFoodView,
    wrongSentence,
    type AnimalId,
    type FeedPair,
    type FoodId,
    type FoodRound,
    type FoodView,
} from "@/app/components/games/data/foodItems";
import { AnimalPicture } from "@/app/components/games/food/animals";
import { AnimalEating, EAT_MS, EatStyles, FoodScene, type SceneMode } from "@/app/components/games/food/FoodScene";
import { FoodPicture } from "@/app/components/games/food/foods";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("food");
const WRONG_FEEDBACK_MS = 1400;
const INSTRUCTION = "Slušaj pitanje i pronađi pravu sliku.";
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
const FEED_DONE = "Sve životinje jedu.";
/** Pomeranje (px) posle kog dodir postaje prevlačenje */
const DRAG_START_PX = 8;

const animalChoices = (kind: FoodView["kind"]) => kind === "who" || kind === "also";

function choiceState(view: FoodView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.answer) return "hint";
    return "idle";
}

/** Hranjenje: hrana koja sledeća zasvetli kao pomoć (prva još nedata) i njena životinja */
function feedHint(view: FoodView): FeedPair | null {
    if (!view.hint) return null;
    const food = view.choices.find((id) => !view.fed.includes(id));
    return view.pairs.find((pair) => pair.food === food) ?? null;
}

/** Slika na vrhu: šta se vidi pre odgovora i ko šta jede posle tačnog odgovora */
function sceneFor(view: FoodView): { animal?: AnimalId; food?: FoodId; mode: SceneMode } {
    if (view.feedback === "correct") {
        const pair = solvedPair(view);
        if (pair) return { animal: pair.animal, food: pair.food, mode: "eat" };
    }
    const animal = getAnimal(view.animal)?.id;
    const food = getFood(view.food)?.id;
    if (view.kind === "who") return { food, mode: "food" };
    if (view.kind === "also") return { animal, food, mode: "beside" };
    return { animal, mode: "alone" };
}

export default function FoodGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<FoodView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<FoodView>({ childId, gameId: "food", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Podrška se povlači: na lakim nivoima tačna slika zasvetli već posle prve greške i posle
    // čekanja (osim kad je roditelj isključio pomoć); kasnije važi ono što je podešeno.
    const rule = foodRule(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju samo jednom, ovde
    const [plan] = useState<FoodRound[]>(() => (isMonitor ? [] : buildFoodLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds })));
    const [view, setView] = useState<FoodView>(() => ({ ...emptyFoodView(plan.length), ...(plan[0] ? roundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: FoodView, log?: string) => {
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
        const question = roundQuestion(viewRef.current);
        if (question) say(viewRef.current.kind === "feed" ? question : `${INSTRUCTION} ${question}`);
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: FoodView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(foodResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: FoodView = { ...viewRef.current, ...roundView(round), round: index + 1, fed: [], selected: null, wrong: [], picked: null, feedback: null, hint: false };
        const question = roundQuestion(next);
        commit(next, `Zadatak ${index + 1}: ${question}`);
        say(question);
    };

    /** Zadatak je rešen: poeni, pohvala sa doslovnom rečenicom, pa sledeći zadatak posle jedenja */
    const solve = (current: FoodView, solved: Partial<FoodView>, sentence: string, log: string) => {
        const { next, firstTry, modeled } = solveFoodView(current, level, solved);
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Tačno ${how}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        // Jedenje se vidi do kraja pre sledećeg pitanja (uz mirnu sliku dovoljno je kraće)
        sayThen(praise(sentence, firstTry), isLast ? finish : () => startRound(current.round), { min: calm ? FEEDBACK_MIN_MS : EAT_MS + 300, emotion: "happy" });
    };

    /** Posle greške: kratka poruka, pa se izbori smiruju (nekoliko brzih dodira nije nekoliko grešaka) */
    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    const handlePick = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.kind === "feed" || current.feedback === "correct" || current.wrong.includes(id) || !current.choices.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const question = roundQuestion(current);

        if (id === current.answer) {
            solve(current, { picked: id, hint: false }, answerSentence(current), `${question} → ${pictureName(current, id)}`);
            return;
        }

        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(hintAfter, wrong.length, current.choices.length - 1);
        commit({ ...current, picked: id, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${question} → ${pictureName(current, id)}`);
        playSfx("wrong");
        say(`${wrongSentence(current, id)} ${hint ? RETRY_SLOW : RETRY} ${question}`, undefined, "gentle");
        settleAfterWrong();
    };

    // ── Hranjenje ─────────────────────────────────────────────────────────────

    const selectFood = (food: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.kind !== "feed" || current.feedback === "correct" || current.fed.includes(food)) return;
        playSfx("tap");
        commit({ ...current, selected: current.selected === food ? null : food });
    };

    const giveFood = (foodId: string, animalId: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.kind !== "feed" || current.feedback === "correct" || current.fed.includes(foodId)) return;
        const animal = getAnimal(animalId);
        const food = getFood(foodId);
        const pair = current.pairs.find((candidate) => candidate.food === foodId);
        if (!animal || !food || !pair || !current.pairs.some((candidate) => candidate.animal === animalId)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;

        if (pair.animal === animalId) {
            const fed = [...current.fed, foodId];
            const sentence = eatsSentence(animal, food);
            if (fed.length >= current.pairs.length) {
                solve(current, { fed, selected: null, picked: null }, `${sentence} ${FEED_DONE}`, `hranjenje (${current.pairs.map((p) => `${p.animal}–${p.food}`).join(", ")})`);
                return;
            }
            commit({ ...current, fed, selected: null, picked: null, feedback: null }, `Nahranjeno: ${sentence}`);
            playSfx("correct");
            say(sentence, undefined, "happy");
            return;
        }

        const wrong = [...current.wrong, `${foodId}>${animalId}`];
        const hint = current.hint || hintDue(hintAfter, wrong.length, current.pairs.length - 1);
        commit({ ...current, wrong, hint, selected: null, picked: null, feedback: "wrong", incorrectCount: current.incorrectCount + 1 }, `Netačno: ${food.name} → ${animal.name}`);
        playSfx("wrong");
        say(`${notSentence(animal, food)} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong();
    };

    // Pomoć posle čekanja: prava slika blago zasvetli (pre greške, ne posle nje)
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.fed.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        // Odgovor je već dat: ništa se ne ponavlja (i ne prekida se pohvala)
        if (current.feedback === "correct") return;
        const question = roundQuestion(current);
        if (question) say(question);
    };

    const shown = isMonitor ? mergeFoodMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const question = roundQuestion(shown);

    if (shown.choices.length === 0 || !question) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Pitanje" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvo pitanje" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = solved ? (shown.kind === "feed" ? FEED_DONE : answerSentence(shown)) : shown.feedback === "wrong" ? `${lastMistake(shown)} ${shown.hint ? RETRY_SLOW : RETRY}`.trim() : "";
    const hud = <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Pitanje" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />;

    if (shown.kind === "feed") {
        const hinted = feedHint(shown);
        return (
            <GameStage>
                {hud}
                {/* Položen telefon: pitanje je jedan red u polju za igru, da životinje i hrana budu krupni */}
                <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up flat:hidden" compact visual={<span aria-hidden="true">🧺</span>} title={question} />
                <PlayArea accent={GAME.accent} className="flat:gap-2">
                    <p className="hidden text-center font-display text-lg font-extrabold leading-tight text-ink flat:block">{question}</p>
                    <FeedBoard
                        key={shown.round}
                        view={shown}
                        hinted={hinted}
                        calm={calm}
                        disabled={isMonitor || solved}
                        onSelect={selectFood}
                        onGive={giveFood}
                    />
                </PlayArea>
                <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
            </GameStage>
        );
    }

    const picture = sceneFor(shown);
    const showHand = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved;
    const count = shown.choices.length;
    const animals = animalChoices(shown.kind);

    return (
        <GameStage split>
            {hud}

            <GamePrompt
                key={`prompt-${shown.round}`}
                className="animate-fade-up"
                // Uz četiri slike (dva reda na telefonu) slika je manja, da sve stane bez pomeranja
                compact={count > 3}
                illustration={<FoodScene key={solved ? "eat" : "ask"} animal={picture.animal} food={picture.food} mode={picture.mode} calm={calm} className="block h-auto w-full" />}
                title={question}
            />

            <PlayArea accent={GAME.accent}>
                <div
                    role="group"
                    aria-label={animals ? "Životinje" : "Hrana"}
                    className={cn("grid w-full max-w-3xl gap-3 sm:gap-4 flat:gap-2 flat:sm:gap-2", count === 2 ? "grid-cols-2" : count === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4 flat:sm:grid-cols-2", isMonitor && "pointer-events-none")}
                >
                    {shown.choices.map((id) => {
                        const name = pictureName(shown, id);
                        if (!name) return null;
                        const state = choiceState(shown, id);
                        return (
                            <ChoiceCard
                                key={`${shown.round}-${id}`}
                                state={state}
                                disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(id)}
                                aria-label={`${name}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className={cn("animate-pop flex-col gap-1 px-1.5 sm:gap-2", count <= 3 ? "min-h-32 sm:min-h-52 short:sm:min-h-36" : "min-h-28 sm:min-h-48 short:sm:min-h-28", "flat:min-h-0 flat:sm:min-h-0 flat:gap-0.5 flat:py-1.5 flat:sm:gap-0.5")}
                            >
                                {animals ? (
                                    <AnimalPicture id={id as AnimalId} className={cn("aspect-square w-auto", count <= 3 ? "h-[clamp(4.5rem,15dvh,9.5rem)] short:sm:h-[clamp(4.5rem,12.5dvh,9rem)]" : "h-[clamp(3.5rem,11.5dvh,8rem)]")} />
                                ) : (
                                    <FoodPicture id={id as FoodId} className={cn("aspect-square w-auto", count <= 3 ? "h-[clamp(4.5rem,14dvh,9rem)] short:sm:h-[clamp(4.5rem,12.5dvh,9rem)]" : "h-[clamp(3.25rem,10.5dvh,7.5rem)]")} />
                                )}
                                {/* Natpis je za odrasle i decu koja čitaju */}
                                <span className="text-base leading-tight sm:text-xl flat:sm:text-base">{name}</span>
                                {showHand && id === shown.answer && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}

/** Činjenica uz poslednju grešku („Mačka ne jede bambus.”); u hranjenju je greška „hrana>životinja” */
function lastMistake(view: FoodView): string {
    if (view.kind !== "feed") return wrongSentence(view, view.picked ?? "");
    const [food, animal] = (view.wrong[view.wrong.length - 1] ?? "").split(">");
    const a = getAnimal(animal);
    const f = getFood(food);
    return a && f ? notSentence(a, f) : "";
}

/** Natpis slike: ime životinje ili hrane, zavisno od vrste zadatka */
function pictureName(view: Pick<FoodView, "kind">, id: string): string {
    return (animalChoices(view.kind) ? getAnimal(id)?.name : getFood(id)?.name) ?? "";
}

// ── Hranjenje: tabla sa životinjama i korpom ──────────────────────────────────

interface FeedBoardProps {
    view: FoodView;
    hinted: FeedPair | null;
    calm: boolean;
    disabled: boolean;
    onSelect: (food: string) => void;
    onGive: (food: string, animal: string) => void;
}

interface DragState {
    food: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
}

/**
 * Životinje u redu (svaka je i mesto za spuštanje i dugme), ispod korpa sa hranom. Hrana se
 * prevlači prstom do životinje; može i dodir na hranu, pa dodir na životinju (i tastaturom),
 * za decu kojoj je prevlačenje teško.
 */
function FeedBoard({ view, hinted, calm, disabled, onSelect, onGive }: FeedBoardProps) {
    const drag = useRef<DragState | null>(null);
    const point = useRef({ x: 0, y: 0 });
    const ghost = useRef<HTMLDivElement | null>(null);
    const skipClick = useRef(false);
    const [dragging, setDragging] = useState<string | null>(null);
    const [over, setOver] = useState<string | null>(null);
    const count = view.pairs.length;

    const placeGhost = (el: HTMLDivElement | null) => {
        ghost.current = el;
        if (el) el.style.transform = `translate(${point.current.x}px, ${point.current.y}px) translate(-50%, -60%)`;
    };

    const animalAt = (x: number, y: number): string | null => {
        const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-feed-animal]");
        return el?.dataset.feedAnimal ?? null;
    };

    const reset = () => {
        drag.current = null;
        setDragging(null);
        setOver(null);
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, food: string) => {
        if (disabled || view.fed.includes(food) || (event.pointerType === "mouse" && event.button !== 0)) return;
        // Prst „drži” hranu i kad izađe iz kartice (na nekim pregledačima hvatanje nije moguće — tada bez njega)
        try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
            /* bez hvatanja: događaji i dalje stižu dok je prst nad karticom */
        }
        drag.current = { food, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
        point.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        point.current = { x: event.clientX, y: event.clientY };
        if (!current.moved) {
            if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_START_PX) return;
            current.moved = true;
            setDragging(current.food);
        }
        placeGhost(ghost.current);
        const target = animalAt(event.clientX, event.clientY);
        setOver((previous) => (previous === target ? previous : target));
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (current.moved) {
            // Spuštena hrana: dodir koji sledi (click) ne bira je ponovo
            skipClick.current = true;
            const target = animalAt(event.clientX, event.clientY);
            if (target) onGive(current.food, target);
        }
        reset();
    };

    const onFoodClick = (food: string) => {
        if (skipClick.current) {
            skipClick.current = false;
            return;
        }
        onSelect(food);
    };

    const pictureSize = count <= 2 ? "h-[clamp(5rem,17dvh,10rem)]" : "h-[clamp(4.25rem,13dvh,8.5rem)]";

    return (
        <div className={cn("flex w-full max-w-3xl flex-col gap-4 sm:gap-6", disabled && "pointer-events-none")}>
            <div role="group" aria-label="Životinje" className={cn("grid gap-3 sm:gap-4", count === 2 ? "grid-cols-2" : "grid-cols-3")}>
                {view.pairs.map((pair) => {
                    const animal = getAnimal(pair.animal);
                    if (!animal) return null;
                    const fed = view.fed.includes(pair.food);
                    const state: ChoiceState = fed ? "correct" : over === pair.animal ? "selected" : hinted?.animal === pair.animal ? "hint" : "idle";
                    return (
                        <ChoiceCard
                            key={pair.animal}
                            data-feed-animal={pair.animal}
                            state={state}
                            disabled={disabled || fed}
                            onClick={() => view.selected && onGive(view.selected, pair.animal)}
                            aria-label={`${animal.name}${fed ? `, ${eatsSentence(animal, getFood(pair.food)!).toLocaleLowerCase("sr")}` : ""}`}
                            className="animate-pop flex-col gap-1 px-1.5 sm:gap-2"
                        >
                            <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={cn("pointer-events-none aspect-square w-auto", pictureSize)}>
                                <EatStyles />
                                <AnimalEating key={fed ? "eat" : "wait"} animal={pair.animal} food={pair.food} mode={fed ? "eat" : "alone"} calm={calm} />
                            </svg>
                            <span className="pointer-events-none text-base leading-tight sm:text-xl">{animal.name}</span>
                        </ChoiceCard>
                    );
                })}
            </div>

            <div
                role="group"
                aria-label="Hrana"
                className={cn("mx-auto grid w-full gap-3 rounded-card border-2 border-dashed border-line bg-surface/70 p-2 sm:gap-5 sm:p-3", count === 2 ? "max-w-xs grid-cols-2 sm:max-w-sm" : "max-w-sm grid-cols-3 sm:max-w-md")}
            >
                {view.choices.map((id) => {
                    const food = getFood(id);
                    if (!food) return null;
                    const fed = view.fed.includes(id);
                    // Prazno mesto u korpi: ostale hrane ostaju gde su bile
                    if (fed) return <span key={id} aria-hidden="true" className="min-h-20 rounded-tile border-2 border-dashed border-line/70" />;
                    const selected = view.selected === id;
                    const state: ChoiceState = selected ? "selected" : hinted?.food === id ? "hint" : "idle";
                    return (
                        <ChoiceCard
                            key={id}
                            state={state}
                            disabled={disabled}
                            aria-pressed={selected}
                            aria-label={food.name}
                            onClick={() => onFoodClick(id)}
                            onPointerDown={(event) => onPointerDown(event, id)}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                            onPointerCancel={reset}
                            className={cn("touch-none flex-col gap-0.5 p-1.5 sm:p-2", dragging === id && "opacity-40")}
                        >
                            <FoodPicture id={food.id} className="pointer-events-none h-[clamp(3rem,8.5dvh,6rem)] w-[clamp(3rem,8.5dvh,6rem)]" />
                            <span className="pointer-events-none text-sm leading-tight sm:text-base">{food.name}</span>
                        </ChoiceCard>
                    );
                })}
            </div>

            {dragging && (
                <div ref={placeGhost} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-50 drop-shadow-xl">
                    <FoodPicture id={dragging as FoodId} className="h-[clamp(4rem,11dvh,7rem)] w-[clamp(4rem,11dvh,7rem)]" />
                </div>
            )}
        </div>
    );
}
