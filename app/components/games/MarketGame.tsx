"use client";

// Igra „Prodavnica”: spisak sa slikama, police, korpa i kasa kod prodavačice Emine. Dete
// prevlači robu sa police u korpu, a na kasi prevlači novčiće (i novčanice) iz novčanika na
// pult, dok ne plati tačno (ili dodirne, pa dodirne pult). Novčić koji bi bio previše se vrati,
// a glas kaže koliko još treba; novčić sa pulta se dodirom vraća u novčanik. Kasnije: koji
// novčić je koliko, šta može da se kupi za 10 dinara, sabiranje cena, kusur i budžet. Nema
// žurbe ni tajmera. Nivoi i račun: data/marketLevels.ts, crteži: market/.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
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
    type GameProps,
    type TimerId,
    useGameRandom,
} from "@/app/components/games/kit";
import { DragDemo } from "@/app/components/games/kit/DragDemo";
import { useDragSnap, type DragSnap } from "@/app/components/games/kit/useDragSnap";
import {
    affordAnswer,
    affordMistake,
    alreadySentence,
    basketSum,
    BUDGET_DONE,
    buildMarketLevel,
    changeAnswer,
    coinIndex,
    coinKey,
    countSentence,
    dinars,
    dinarWord,
    emptyMarketView,
    goodLabel,
    greedy,
    inBasketSentence,
    LIST_DONE,
    listHint,
    marketLevel,
    marketQuestion,
    marketResult,
    marketRoundView,
    matchAnswer,
    mergeMarketMonitor,
    needMoreSentence,
    notOnListSentence,
    overBudgetSentence,
    paidSentence,
    paidSum,
    payHint,
    solveMarketView,
    spoken,
    sumAnswer,
    type GoodId,
    type MarketRound,
    type MarketView,
    type Ware,
} from "@/app/components/games/data/marketLevels";
import { BasketArt, CashierArt, CounterGoods, GoodPicture, MoneyArt } from "@/app/components/games/market/MarketArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("market");
const WRONG_FEEDBACK_MS = 1600;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
const BASKET = "basket";
const TRAY = "tray";
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

const isDrag = (task: MarketView["task"]) => task === "list" || task === "budget" || task === "pay";

function wareOf(view: Pick<MarketView, "wares">, key: string): Ware | undefined {
    return view.wares.find((w) => w.key === key);
}

function solvedText(view: MarketView, female: boolean): string {
    switch (view.task) {
        case "list":
            return LIST_DONE;
        case "budget":
            return `${BUDGET_DONE} Ostalo ti je ${dinars(view.budget - basketSum(view))}.`;
        case "pay":
            return paidSentence(view, female);
        case "match":
            return matchAnswer(Number(view.answer));
        case "afford": {
            const ware = wareOf(view, view.answer);
            return ware ? affordAnswer(ware, view.budget) : "";
        }
        case "sum":
            return sumAnswer(view);
        case "change":
            return changeAnswer(view);
    }
}

export default function MarketGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<MarketView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<MarketView>({ childId, gameId: "market", level, isMonitor });
    const { say: sayRaw } = useSpeech(gender);
    // Brojevi se izgovaraju rečima („35 dinara” → „trideset pet dinara”)
    const say = useCallback((text: string, onEnd?: () => void, emotion?: Parameters<typeof sayRaw>[2]) => sayRaw(spoken(text), onEnd, emotion), [sayRaw]);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();
    const female = isFemale(gender);

    const rule = marketLevel(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<MarketRound[]>(() => (isMonitor ? [] : buildMarketLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    const [view, setView] = useState<MarketView>(() => ({ ...emptyMarketView(plan.length), ...(plan[0] ? marketRoundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    const [wiggle, setWiggle] = useState<string | null>(null);

    const commit = useCallback(
        (next: MarketView, log?: string) => {
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
        if (viewRef.current.wares.length > 0) say(marketQuestion(viewRef.current));
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: MarketView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(marketResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: MarketView = { ...viewRef.current, ...marketRoundView(round), round: index + 1 };
        const question = marketQuestion(next);
        commit(next, `Zadatak ${index + 1}: ${question}`);
        say(question);
    };

    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, feedback: null, picked: null, selected: null });
        });
    };

    const solve = (current: MarketView, solved: Partial<MarketView>, log: string) => {
        const { next, firstTry, modeled } = solveMarketView(current, level, { ...solved, feedback: "correct", selected: null, note: null });
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Tačno ${how}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(solvedText(next, female), firstTry), isLast ? finish : () => startRound(current.round), { min: FEEDBACK_MIN_MS + 1200, max: 7000, emotion: "happy" });
    };

    /** Greška: poruka, pomoć posle podešenog broja promašaja, pa smirivanje */
    const miss = (current: MarketView, key: string, note: string, missesOffered: number, log: string) => {
        const wrong = [...current.wrong, key];
        const hint = current.hint || hintDue(hintAfter, wrong.length, Math.max(1, missesOffered));
        commit({ ...current, wrong, hint, note, picked: key, selected: null, feedback: "wrong", incorrectCount: current.incorrectCount + 1 }, log);
        playSfx("wrong");
        say(`${note}${hint ? ` ${RETRY_SLOW}` : ""}`, undefined, "gentle");
        settleAfterWrong();
    };

    // ── Korpa (spisak, budžet) ─────────────────────────────────────────────────

    const putInBasket = (key: string): boolean => {
        if (isMonitor || finishedRef.current || guard.blocked()) return false;
        const current = viewRef.current;
        if ((current.task !== "list" && current.task !== "budget") || current.feedback === "correct" || current.basket.includes(key)) return false;
        const ware = wareOf(current, key);
        if (!ware) return false;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const others = current.wares.filter((w) => !current.list.includes(w.good)).length;
        if (!current.list.includes(ware.good)) {
            miss(current, key, notOnListSentence(ware.good), others, `Nije na spisku: ${ware.good}`);
            return false;
        }
        if (current.basket.some((other) => wareOf(current, other)?.good === ware.good)) {
            miss(current, key, alreadySentence(ware.good), 1, `Već u korpi: ${ware.good}`);
            return false;
        }
        if (current.task === "budget") {
            const left = current.budget - basketSum(current);
            if (ware.price > left) {
                miss(current, key, overBudgetSentence(left), 1, `Previše: ${ware.key} ${ware.price} (ostalo ${left})`);
                return false;
            }
        }
        const basket = [...current.basket, key];
        const done = current.list.every((id) => basket.some((other) => wareOf(current, other)?.good === id));
        if (done) {
            solve(current, { basket }, `korpa: ${basket.join(", ")}`);
            return true;
        }
        commit({ ...current, basket, selected: null, note: null, feedback: null }, `U korpi: ${ware.key}`);
        playSfx("correct");
        const left = current.budget - basketSum({ wares: current.wares, basket });
        say(current.task === "budget" ? `${goodLabel(ware.good, ware.size)}. Ostalo ti je ${dinars(left)}.` : inBasketSentence(ware.good), undefined, "happy");
        return true;
    };

    /** Budžet: stvar iz korpe se vraća na policu (bez kazne) */
    const takeOut = (key: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.task !== "budget" || current.feedback === "correct" || !current.basket.includes(key)) return;
        playSfx("tap");
        commit({ ...current, basket: current.basket.filter((other) => other !== key) }, `Vraćeno na policu: ${key}`);
    };

    // ── Plaćanje ───────────────────────────────────────────────────────────────

    const payCoin = (key: string): boolean => {
        if (isMonitor || finishedRef.current || guard.blocked()) return false;
        const current = viewRef.current;
        const index = coinIndex(key);
        if (current.task !== "pay" || current.feedback === "correct" || index === null || current.paid.includes(index)) return false;
        const value = current.wallet[index];
        if (value === undefined) return false;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const sum = paidSum(current);
        if (sum + value > current.price) {
            const free = current.wallet.filter((_, i) => !current.paid.includes(i) && i !== index && sum + current.wallet[i] > current.price).length;
            miss(current, key, needMoreSentence(current.price - sum), free + 1, `Previše: ${value} din (plaćeno ${sum} od ${current.price})`);
            return false;
        }
        const paid = [...current.paid, index];
        if (sum + value === current.price) {
            solve(current, { paid }, `plaćeno ${current.price} din (${paid.map((i) => current.wallet[i]).join(" + ")})`);
            return true;
        }
        commit({ ...current, paid, selected: null, note: null, feedback: null }, `Na pultu: ${value} din (ukupno ${sum + value})`);
        playSfx("tap");
        say(countSentence(sum + value));
        return true;
    };

    const takeBack = (index: number) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.task !== "pay" || current.feedback === "correct" || !current.paid.includes(index)) return;
        playSfx("tap");
        commit({ ...current, paid: current.paid.filter((other) => other !== index) }, `Vraćeno u novčanik: ${current.wallet[index]} din`);
    };

    // ── Izbori ─────────────────────────────────────────────────────────────────

    const pick = (choice: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (isDrag(current.task) || current.feedback === "correct" || current.wrong.includes(choice) || !current.choices.includes(choice)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        if (choice === current.answer) {
            solve(current, { picked: choice }, `${marketQuestion(current)} → ${choice}`);
            return;
        }
        let note = RETRY;
        if (current.task === "afford") {
            const ware = wareOf(current, choice);
            if (ware) note = `${affordMistake(ware, current.budget)} ${RETRY}`;
        } else if (current.task === "match") {
            note = `To je ${dinars(Number(choice))}. ${RETRY}`;
        }
        miss(current, choice, note, current.choices.length - 1, `Netačno: ${marketQuestion(current)} → ${choice}`);
    };

    // ── Prevlačenje, dodir, pomoć ──────────────────────────────────────────────

    const drop = (piece: string, slot: string | null): boolean => {
        if (slot === null) return false;
        return viewRef.current.task === "pay" ? payCoin(piece) : putInBasket(piece);
    };

    const tapPiece = (piece: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        playSfx("tap");
        commit({ ...current, selected: current.selected === piece ? null : piece });
    };

    const tapTarget = () => {
        const selected = viewRef.current.selected;
        if (selected === null) return;
        if (!drop(selected, viewRef.current.task === "pay" ? TRAY : BASKET) && !calm) {
            setWiggle(selected);
            after(520, () => setWiggle(null));
        }
    };

    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.basket.length}:${view.paid.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hint) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct" || current.wares.length === 0) return;
        say(marketQuestion(current));
    };

    // Komad koji prati prst je iste veličine kao kartica iz koje je uzet
    const [ghost, setGhost] = useState({ w: 80, h: 80 });
    const drag = useDragSnap({
        enabled: !isMonitor && isDrag(view.task) && view.feedback !== "correct",
        calm,
        onDrop: drop,
        onTap: tapPiece,
        onGrab: (piece) => {
            const card = document.querySelector<HTMLElement>(`[data-piece="${piece}"]`);
            if (!card) return;
            const rect = card.getBoundingClientRect();
            setGhost({ w: rect.width * 1.05, h: rect.height * 1.05 });
        },
    });

    const shown = isMonitor ? mergeMarketMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (shown.wares.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Kupovina" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvu kupovinu" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = solved ? solvedText(shown, female) : (shown.note ?? "");
    const demo = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved;
    const disabled = isMonitor || solved;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Kupovina" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up [@media(max-height:37.5rem)]:hidden" compact title={marketQuestion(shown)} />
            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-4">
                {shown.task === "list" || shown.task === "budget" ? (
                    <ShopBoard key={`shop-${shown.round}`} view={shown} drag={drag} ghost={ghost} calm={calm} wiggle={wiggle} demo={demo} disabled={disabled} onBasket={tapTarget} onTakeOut={takeOut} />
                ) : shown.task === "pay" ? (
                    <PayBoard key={`pay-${shown.round}`} view={shown} drag={drag} ghost={ghost} calm={calm} wiggle={wiggle} disabled={disabled} onTray={tapTarget} onTakeBack={takeBack} />
                ) : (
                    <ChoiceBoard key={`choice-${shown.round}`} view={shown} demo={demo} disabled={disabled} onPick={pick} />
                )}
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Zajedničko ────────────────────────────────────────────────────────────────

function PriceTag({ price, className }: { price: number; className?: string }) {
    return (
        <span className={cn("inline-flex items-center rounded-md bg-white px-1.5 py-0.5 font-black leading-none text-ink ring-2 ring-honey-500", className)}>
            {price} din
        </span>
    );
}

/** Komad koji prati prst (roba ili novac), iznad celog ekrana igre */
function Ghost({ ghostRef, active, wobble, size, children }: { ghostRef: DragSnap["ghostRef"]; active: string | null; wobble: boolean; size: { w: number; h: number }; children: ReactNode }) {
    if (active === null || typeof document === "undefined") return null;
    return createPortal(
        <div ref={ghostRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[6500] drop-shadow-xl" style={{ width: size.w, height: size.h }}>
            <div className={cn("h-full w-full", wobble && "animate-wiggle")}>{children}</div>
        </div>,
        document.body
    );
}

function pieceClass(selected: boolean, glow: boolean, calm: boolean, lifted: boolean, wiggling: boolean) {
    return cn(
        "relative flex touch-none select-none flex-col items-center justify-center rounded-2xl border-2 border-b-4 bg-surface p-1 shadow-soft transition-[transform,border-color,opacity] duration-150 @container",
        selected ? "-translate-y-1 border-brand-500 bg-brand-50" : glow ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-300",
        glow && !calm && "animate-soft-pulse",
        lifted && "opacity-30",
        wiggling && "animate-wiggle"
    );
}

// ── Spisak i budžet: police i korpa ──────────────────────────────────────────

interface ShopProps {
    view: MarketView;
    drag: DragSnap;
    ghost: { w: number; h: number };
    calm: boolean;
    wiggle: string | null;
    demo: boolean;
    disabled: boolean;
    onBasket: () => void;
    onTakeOut: (key: string) => void;
}

/** Slika robe u spisku i u korpi: krupnija na uspravnom ekranu, sitnija na položenom */
const LIST_PIC = "h-[clamp(2.5rem,10cqh,4.5rem)] w-[clamp(2.5rem,10cqh,4.5rem)] landscape:h-[clamp(2rem,21cqh,4.5rem)] landscape:w-[clamp(2rem,21cqh,4.5rem)]";
const BASKET_PIC = "h-[clamp(2rem,9cqh,3.5rem)] w-[clamp(2rem,9cqh,3.5rem)] landscape:h-[clamp(1.75rem,14cqh,3.5rem)] landscape:w-[clamp(1.75rem,14cqh,3.5rem)]";

function ShopBoard({ view, drag, ghost, calm, wiggle, demo, disabled, onBasket, onTakeOut }: ShopProps) {
    const { rootRef, ghostRef, active, wobble, over, pieceProps } = drag;
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const solved = view.feedback === "correct";
    const hinted = view.hint && !solved ? listHint(view) : null;
    const budget = view.task === "budget";
    const bought = (id: string) => view.basket.some((key) => wareOf(view, key)?.good === id);
    const count = view.wares.length;
    const cols = count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    const demoKey = demo ? (view.wares.find((w) => w.good === view.list[0])?.key ?? null) : null;
    const left = view.budget - basketSum(view);
    // Kartica na polici: što veća, a da police, spisak i korpa stanu (uspravno: polica je oko pola visine)
    const card = {
        ["--card" as string]: `min(calc((100cqw - ${cols + 1}rem) / ${cols}), calc((${budget ? 46 : 52}cqh - ${rows + 1}rem) / ${rows}), 8rem)`,
        ["--side-card" as string]: `min(calc((46cqw - ${cols + 1}rem) / ${cols}), calc((100cqh - ${rows + 1.5}rem) / ${rows}), 8rem)`,
    };

    const setRootRef = (el: HTMLDivElement | null) => {
        rootRef(el);
        setRoot((previous) => (previous === el ? previous : el));
    };

    return (
        <div ref={setRootRef} className={cn("relative flex min-h-0 w-full flex-1 self-stretch", disabled && "pointer-events-none")} style={{ containerType: "size" }}>
            <div className="flex h-full w-full flex-col items-stretch gap-2 sm:gap-3 landscape:flex-row">
                {/* Spisak */}
                <section
                    aria-label="Spisak"
                    className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-[#e8dcc0] bg-[#fffdf6] p-1.5 shadow-soft sm:p-2 landscape:w-[24%] landscape:flex-col landscape:gap-1"
                >
                    <ul className={cn("flex items-center justify-center gap-1.5 sm:gap-2 landscape:flex-col landscape:items-start landscape:gap-0.5", budget ? "flex-col items-start gap-0.5" : "flex-wrap")}>
                        {view.list.map((id) => {
                            const done = bought(id);
                            return (
                                <li key={id} className="relative flex items-center gap-1">
                                    <GoodPicture id={id as GoodId} className={cn(LIST_PIC, done && "opacity-40")} />
                                    {budget && <span className="text-sm font-extrabold leading-tight text-ink sm:text-base landscape:text-xs landscape:sm:text-sm">{goodLabel(id)}</span>}
                                    {done && <Check aria-hidden="true" strokeWidth={4} className="absolute -left-1 -top-1 h-5 w-5 rounded-full bg-emerald-600 p-0.5 text-white" />}
                                    <span className="sr-only">{`${goodLabel(id)}${done ? ", u korpi" : ""}`}</span>
                                </li>
                            );
                        })}
                    </ul>
                    {budget && (
                        <p className="flex shrink-0 flex-col items-center rounded-xl bg-honey-50 px-2 py-1 text-center font-extrabold leading-tight text-honey-700 ring-1 ring-honey-200">
                            <span className="text-xs sm:text-sm">Imaš {view.budget} din</span>
                            <span className="text-base text-ink sm:text-lg landscape:text-sm landscape:sm:text-base">Ostalo: {left} din</span>
                        </p>
                    )}
                </section>

                {/* Polica */}
                <div
                    role="group"
                    aria-label="Polica"
                    className="grid min-h-0 min-w-0 flex-1 place-content-center gap-2 rounded-card bg-[#f4e6cf] p-2 ring-1 ring-[#e2cfa8] [grid-template-columns:repeat(var(--cols),var(--card))] sm:gap-3 landscape:[grid-template-columns:repeat(var(--cols),var(--side-card))]"
                    style={{ ["--cols" as string]: cols, ...card }}
                >
                    {view.wares.map((w) => {
                        if (view.basket.includes(w.key)) return <span key={w.key} aria-hidden="true" className="aspect-square rounded-2xl border-2 border-dashed border-[#d9c39c]" />;
                        const selected = view.selected === w.key;
                        return (
                            <button
                                key={w.key}
                                type="button"
                                data-piece={w.key}
                                disabled={disabled}
                                aria-pressed={selected}
                                aria-label={`${goodLabel(w.good, w.size)}${budget ? `, ${dinars(w.price)}` : ""}`}
                                {...pieceProps(w.key)}
                                className={cn("aspect-square", pieceClass(selected, hinted === w.key, calm, active === w.key, wiggle === w.key))}
                            >
                                <GoodPicture id={w.good} small={w.size === "small"} className="pointer-events-none min-h-0 w-[80%] flex-1" />
                                {budget ? (
                                    <PriceTag price={w.price} className="pointer-events-none text-[clamp(0.6rem,13cqi,0.95rem)]" />
                                ) : (
                                    <span className="pointer-events-none max-w-full truncate pt-[0.12em] text-[clamp(0.6rem,13cqi,0.95rem)] font-extrabold leading-tight text-ink-soft @max-[4rem]:hidden">
                                        {goodLabel(w.good)}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Korpa */}
                <button
                    type="button"
                    data-slot={BASKET}
                    data-open=""
                    disabled={disabled || view.selected === null}
                    onClick={onBasket}
                    aria-label="Korpa"
                    className={cn(
                        "relative flex h-[22%] shrink-0 flex-col items-center justify-end rounded-card outline-none transition-[background-color,box-shadow] focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default landscape:h-auto landscape:w-[26%]",
                        over === BASKET || view.selected !== null ? "bg-brand-50/80 ring-4 ring-brand-200" : "bg-surface/50"
                    )}
                >
                    <div className="pointer-events-none relative flex min-h-0 w-full flex-1 items-end justify-center">
                        <div className="absolute inset-x-[10%] bottom-[30%] z-0 flex flex-wrap items-end justify-center gap-0.5 landscape:bottom-[34%]">
                            {view.basket.map((key) => {
                                const w = wareOf(view, key);
                                if (!w) return null;
                                return budget ? (
                                    <span
                                        key={key}
                                        role="button"
                                        tabIndex={disabled ? -1 : 0}
                                        aria-label={`${goodLabel(w.good, w.size)}, vrati na policu`}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            onTakeOut(key);
                                        }}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                onTakeOut(key);
                                            }
                                        }}
                                        className="pointer-events-auto flex flex-col items-center rounded-xl bg-white/70 p-0.5"
                                    >
                                        <GoodPicture id={w.good} small={w.size === "small"} className={BASKET_PIC} />
                                        <PriceTag price={w.price} className="text-[0.65rem]" />
                                    </span>
                                ) : (
                                    <GoodPicture key={key} id={w.good} className={BASKET_PIC} />
                                );
                            })}
                        </div>
                        <BasketArt className="relative z-10 h-[62%] max-h-32 w-full" />
                    </div>
                    {budget && <span className="pointer-events-none pb-1 text-sm font-extrabold leading-tight text-ink sm:text-base">U korpi: {basketSum(view)} din</span>}
                </button>
            </div>

            {demoKey && !view.basket.includes(demoKey) && <DragDemo root={root} from={`[data-piece="${demoKey}"]`} to={`[data-slot="${BASKET}"]`} calm={calm} />}
            <Ghost ghostRef={ghostRef} active={active} wobble={wobble} size={ghost}>
                {active && wareOf(view, active) && <GoodPicture id={wareOf(view, active)!.good} small={wareOf(view, active)!.size === "small"} className="h-full w-full" />}
            </Ghost>
        </div>
    );
}

// ── Kasa: plaćanje ────────────────────────────────────────────────────────────

interface PayProps {
    view: MarketView;
    drag: DragSnap;
    ghost: { w: number; h: number };
    calm: boolean;
    wiggle: string | null;
    disabled: boolean;
    onTray: () => void;
    onTakeBack: (index: number) => void;
}

/** Novčić ili novčanica na pultu */
const PAID_COIN = "h-[clamp(2.25rem,9cqh,4rem)] w-[clamp(2.25rem,9cqh,4rem)] landscape:h-[clamp(1.75rem,13cqh,3.5rem)] landscape:w-[clamp(1.75rem,13cqh,3.5rem)]";
const PAID_NOTE = "h-[clamp(2.25rem,9cqh,4rem)] w-[clamp(4rem,16cqh,7.1rem)] landscape:h-[clamp(1.75rem,13cqh,3.5rem)] landscape:w-[clamp(3.1rem,23cqh,6.2rem)]";

function PayBoard({ view, drag, ghost, calm, wiggle, disabled, onTray, onTakeBack }: PayProps) {
    const { rootRef, ghostRef, active, wobble, over, pieceProps } = drag;
    const solved = view.feedback === "correct";
    const sum = paidSum(view);
    const hint = view.hint && !solved ? payHint(view) : null;
    const notes = view.wallet.filter((value) => value >= 50).length;
    // Novčanica zauzima dva polja (široka je); polja su kvadratna
    const cells = view.wallet.length + notes;
    const cols = Math.min(4, cells);
    const rows = Math.ceil(cells / cols);
    const sideCols = cells <= 4 ? 2 : cells <= 9 ? 3 : 4;
    const sideRows = Math.ceil(cells / sideCols);
    const openSlots = view.slots ? Math.max(0, view.price - view.paid.length) : 0;
    const sizes = {
        ["--cols" as string]: cols,
        ["--side-cols" as string]: sideCols,
        ["--coin" as string]: `min(calc((100cqw - ${cols + 1}rem) / ${cols}), calc((42cqh - ${rows + 1}rem) / ${rows}), 6.5rem)`,
        ["--side-coin" as string]: `min(calc((44cqw - ${sideCols + 1}rem) / ${sideCols}), calc((100cqh - ${sideRows + 1.5}rem) / ${sideRows}), 6rem)`,
    };

    return (
        <div ref={rootRef} className={cn("relative flex min-h-0 w-full flex-1 self-stretch", disabled && "pointer-events-none")} style={{ containerType: "size" }}>
            <div className="flex h-full w-full flex-col items-stretch justify-center gap-2 sm:gap-3 landscape:flex-row">
                <div className="flex min-h-0 min-w-0 flex-col items-center justify-center gap-2 landscape:flex-1">
                    <CashierArt happy={solved} className="block h-auto w-[min(100%,62cqh)] shrink-0 rounded-2xl shadow-soft landscape:w-[min(100%,108cqh)]">
                        <CounterGoods goods={view.wares} />
                    </CashierArt>
                    {/* Pult: ovde ide novac */}
                    <button
                        type="button"
                        data-slot={TRAY}
                        data-open=""
                        disabled={disabled || view.selected === null}
                        onClick={onTray}
                        aria-label={view.wares.length === 1 ? `Pult, plaćeno ${dinars(sum)} od ${dinars(view.price)}` : `Pult, plaćeno ${dinars(sum)}`}
                        className={cn(
                            "flex min-h-[clamp(4.5rem,18cqh,8rem)] w-full flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed p-1.5 outline-none transition-[background-color,box-shadow] focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default landscape:min-h-0 landscape:flex-1",
                            over === TRAY || view.selected !== null ? "border-brand-300 bg-brand-50/80 ring-4 ring-brand-200" : "border-[#d9c39c] bg-[#fbf3e3]"
                        )}
                    >
                        <span className="flex flex-wrap items-center justify-center gap-1">
                            {view.paid.map((index) => (
                                <span
                                    key={index}
                                    role="button"
                                    tabIndex={disabled ? -1 : 0}
                                    aria-label={`${dinars(view.wallet[index])}, vrati u novčanik`}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onTakeBack(index);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            onTakeBack(index);
                                        }
                                    }}
                                    className={cn("pointer-events-auto rounded-xl", hint && "back" in hint && hint.back === index && "animate-soft-pulse ring-4 ring-brand-300")}
                                >
                                    <MoneyArt value={view.wallet[index]} className={view.wallet[index] >= 50 ? PAID_NOTE : PAID_COIN} />
                                </span>
                            ))}
                            {Array.from({ length: openSlots }, (_, i) => (
                                <span key={`slot-${i}`} aria-hidden="true" className={cn(PAID_COIN, "rounded-full border-2 border-dashed border-honey-500/60 bg-white/60")} />
                            ))}
                        </span>
                        <span className="pointer-events-none text-center text-sm font-extrabold leading-tight text-ink sm:text-lg landscape:text-xs landscape:sm:text-base">
                            Plaćeno: {sum} din
                            {/* Za dve stvari zbir se ne piše: to dete sabira samo */}
                            {view.wares.length === 1 && <span className="text-ink-soft"> · cena {view.price} din</span>}
                        </span>
                    </button>
                </div>

                {/* Novčanik */}
                <div
                    role="group"
                    aria-label="Novčanik"
                    className="grid shrink-0 grid-flow-dense place-content-center gap-1.5 self-center rounded-card border-2 border-[#8a5a3a] bg-[#a8714a] p-2 shadow-soft [grid-template-columns:repeat(var(--cols),var(--coin))] sm:gap-2 landscape:[grid-template-columns:repeat(var(--side-cols),var(--side-coin))]"
                    style={sizes}
                >
                    {view.wallet.map((value, index) => {
                        const key = coinKey(index);
                        const note = value >= 50;
                        const shape = note ? "col-span-2 aspect-[16/9] self-center" : "aspect-square";
                        if (view.paid.includes(index)) return <span key={key} aria-hidden="true" className={cn("rounded-2xl border-2 border-dashed border-[#d9b08a]/60", shape)} />;
                        const selected = view.selected === key;
                        const glow = Boolean(hint && "give" in hint && hint.give === index);
                        return (
                            <button
                                key={key}
                                type="button"
                                data-piece={key}
                                disabled={disabled}
                                aria-pressed={selected}
                                aria-label={dinars(value)}
                                {...pieceProps(key)}
                                className={cn(shape, "!border-transparent !bg-transparent !p-0 !shadow-none", pieceClass(selected, glow, calm, active === key, wiggle === key), (selected || glow) && "!bg-white/30 ring-4 ring-brand-200")}
                            >
                                <MoneyArt value={value} className="pointer-events-none h-full w-full" />
                            </button>
                        );
                    })}
                </div>
            </div>
            <Ghost ghostRef={ghostRef} active={active} wobble={wobble} size={ghost}>
                {active && coinIndex(active) !== null && <MoneyArt value={view.wallet[coinIndex(active)!]} className="h-full w-full" />}
            </Ghost>
        </div>
    );
}

// ── Izbori: novčić, šta možeš da kupiš, zbir, kusur ──────────────────────────

function choiceState(view: MarketView, choice: string): ChoiceState {
    if (view.feedback === "correct") return choice === view.answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === choice) return "wrong";
    if (view.wrong.includes(choice)) return "dimmed";
    if (view.hint && choice === view.answer) return "hint";
    return "idle";
}

/** Iznos u novcu (najmanje novčića/novčanica), za kusur */
function MoneyRow({ amount }: { amount: number }) {
    const pieces = greedy(amount, [1, 2, 5, 10, 20, 50, 100]);
    if (pieces.length === 0 || pieces.length > 4) return null;
    return (
        <span className="pointer-events-none flex flex-wrap items-center justify-center gap-0.5">
            {pieces.map((value, i) => (
                <MoneyArt
                    key={i}
                    value={value}
                    className={value >= 50 ? "h-[clamp(1.4rem,7.5cqh,2.75rem)] w-[clamp(2.5rem,13cqh,4.9rem)]" : "h-[clamp(1.4rem,7.5cqh,2.75rem)] w-[clamp(1.4rem,7.5cqh,2.75rem)]"}
                />
            ))}
        </span>
    );
}

function ChoiceBoard({ view, demo, disabled, onPick }: { view: MarketView; demo: boolean; disabled: boolean; onPick: (choice: string) => void }) {
    const solved = view.feedback === "correct";
    const showPrice = view.task !== "afford";
    const money = view.task === "afford" ? view.budget : view.given;
    return (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 self-stretch landscape:flex-row sm:gap-5" style={{ containerType: "size" }}>
            {/* Kasa sa robom; novac koji dete ima (ili daje) stoji u uglu slike */}
            <div className="relative shrink-0">
                <CashierArt happy={solved} className="block h-auto w-[min(92cqw,66cqh)] rounded-2xl shadow-soft landscape:w-[min(46cqw,104cqh)]">
                    {view.task !== "afford" && <CounterGoods goods={view.wares} showPrice={showPrice} />}
                </CashierArt>
                {(view.task === "afford" || view.task === "change") && (
                    <div className="absolute left-2 top-2 flex flex-col items-center gap-0.5 rounded-2xl bg-surface/95 p-1.5 shadow-soft ring-1 ring-line sm:p-2">
                        <span className="text-xs font-extrabold text-ink-soft sm:text-sm">{view.task === "afford" ? "Imaš" : "Daješ"}</span>
                        <MoneyArt
                            value={money}
                            className={money >= 50 ? "h-[clamp(2rem,9cqh,4rem)] w-[clamp(3.6rem,16cqh,7.1rem)]" : "h-[clamp(2.25rem,10cqh,4.5rem)] w-[clamp(2.25rem,10cqh,4.5rem)]"}
                        />
                    </div>
                )}
            </div>
            <div role="group" aria-label="Izbori" className={cn("grid w-full max-w-3xl gap-2 sm:gap-4 landscape:max-w-[50cqw]", view.choices.length === 2 ? "grid-cols-2" : "grid-cols-3", disabled && "pointer-events-none")}>
                {view.choices.map((choice) => {
                    const state = choiceState(view, choice);
                    const ware = view.task === "afford" ? wareOf(view, choice) : undefined;
                    const amount = Number(choice);
                    const label = ware ? `${goodLabel(ware.good)}, ${dinars(ware.price)}` : dinars(amount);
                    return (
                        <ChoiceCard
                            key={choice}
                            state={state}
                            disabled={disabled || (state !== "idle" && state !== "hint")}
                            onClick={() => onPick(choice)}
                            aria-label={`${label}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                            className="animate-pop min-h-0 flex-col gap-1 p-1.5 sm:p-2"
                        >
                            {view.task === "match" ? (
                                <MoneyArt value={amount} className="pointer-events-none aspect-square h-[clamp(3.25rem,22cqh,7rem)] w-auto" />
                            ) : ware ? (
                                <>
                                    <GoodPicture id={ware.good} className="pointer-events-none aspect-square h-[clamp(2.75rem,18cqh,6rem)] w-auto" />
                                    <PriceTag price={ware.price} className="text-sm sm:text-lg" />
                                </>
                            ) : (
                                <>
                                    <span className="flex flex-col items-center leading-none">
                                        <span className="font-display text-[clamp(1.5rem,10cqh,3rem)] font-extrabold text-ink">{amount}</span>
                                        <span className="text-[clamp(0.75rem,4cqh,1.25rem)] font-extrabold text-ink-soft">{dinarWord(amount)}</span>
                                    </span>
                                    {view.task === "change" && <MoneyRow amount={amount} />}
                                </>
                            )}
                            {demo && choice === view.answer && <DemoHand />}
                        </ChoiceCard>
                    );
                })}
            </div>
        </div>
    );
}
