"use client";

// Igra „Obuci se”: kroz prozor se vidi vreme, a pored stoji Amar ili Lejla. Dete prevlači odeću
// iz korpe na lik (ili je dodirne, pa dodirne lik). Stvar koja ne ide uz to vreme se zaljulja i
// mirno vrati, a glas kaže zašto („Napolju pada sneg. Sandale nisu za sneg.”); kad treba drugi
// redosled, kaže šta ide prvo („Prvo čarape, pa čizme.”). Kad je lik spreman, veselo izađe
// napolje. Kasnije: „Kada nosimo čizme?”, mešano vreme, nedeljna prognoza i mesto (bazen,
// škola, park). Nema žurbe ni tajmera. Nivoi: data/weatherLevels.ts, crteži: weather/.

import { useCallback, useEffect, useRef, useState } from "react";
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
import { DragDemo } from "@/app/components/games/kit/DragDemo";
import { useDragSnap, type DragSnap } from "@/app/components/games/kit/useDragSnap";
import {
    buildWeatherLevel,
    dressingOrder,
    dressQuestion,
    emptyWeatherView,
    forecastSentence,
    getClothing,
    getScene,
    HEROES,
    mergeWeatherMonitor,
    nextNeeded,
    orderSentence,
    readySentence,
    refusalSentence,
    solveWeatherView,
    tryWear,
    weatherLevel,
    weatherResult,
    weatherRoundView,
    WEEKDAYS,
    whenAnswer,
    whenMistake,
    whenQuestion,
    wornSentence,
    type ClothingId,
    type SceneId,
    type WeatherRound,
    type WeatherView,
    type WeatherId,
} from "@/app/components/games/data/weatherLevels";
import { CHAR_VIEW, ClothingIcon, DressFigure, FigureStyles, WeatherIcon, WeatherWindow } from "@/app/components/games/weather/WeatherArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("weather");
const WRONG_FEEDBACK_MS = 1600;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
/** Koliko traje veseo izlazak napolje (pre sledećeg zadatka) */
const WALK_MS = 2700;
/** Nizak ekran: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";
const HERO_SLOT = "hero";

function roundQuestion(view: WeatherView): string {
    if (view.task === "when") return view.item ? whenQuestion(view.item as ClothingId) : "";
    if (!getScene(view.scene)) return "";
    return dressQuestion({ scene: view.scene as SceneId, hero: view.hero, base: view.base as ClothingId[], forecast: view.forecast, sequence: view.sequence });
}

/** Šta se kaže i piše posle poslednje greške */
function mistakeText(view: WeatherView): string {
    const mistake = view.mistake;
    if (!mistake) return "";
    if (mistake.reason === "when") return view.item ? whenMistake(view.item as ClothingId, mistake.item as WeatherId) : "";
    if (mistake.reason === "order" && mistake.first) return orderSentence(mistake.first as ClothingId, mistake.item as ClothingId);
    if (!getScene(view.scene)) return "";
    return refusalSentence({ scene: view.scene as SceneId, hero: view.hero, forecast: view.forecast }, mistake.item as ClothingId);
}

function doneText(view: WeatherView): string {
    if (view.task === "when") return view.item && view.answer ? whenAnswer(view.item as ClothingId, view.answer as WeatherId) : "";
    if (!getScene(view.scene)) return "";
    return readySentence({ scene: view.scene as SceneId, hero: view.hero });
}

export default function WeatherGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<WeatherView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<WeatherView>({ childId, gameId: "weather", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Na lakim nivoima pomoć stiže već posle prve greške i posle čekanja (osim kad je isključena)
    const rule = weatherLevel(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde
    const [plan] = useState<WeatherRound[]>(() =>
        isMonitor ? [] : buildWeatherLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit })
    );
    const [view, setView] = useState<WeatherView>(() => ({ ...emptyWeatherView(plan.length), ...(plan[0] ? weatherRoundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    // Stvar koja je dodirom spuštena na lik, a ne ide: kratko se zaljulja u korpi
    const [wiggle, setWiggle] = useState<string | null>(null);

    const commit = useCallback(
        (next: WeatherView, log?: string) => {
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
        const question = roundQuestion(viewRef.current);
        if (question) say(question);
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: WeatherView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(weatherResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: WeatherView = { ...viewRef.current, ...weatherRoundView(round), round: index + 1 };
        const question = roundQuestion(next);
        commit(next, `Zadatak ${index + 1}: ${question}`);
        say(question);
    };

    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, feedback: null, selected: null });
        });
    };

    /** Zadatak rešen: poeni, pohvala, pa sledeći zadatak (posle izlaska napolje) */
    const solve = (current: WeatherView, solved: Partial<WeatherView>, sentence: string, log: string) => {
        const { next, firstTry, modeled } = solveWeatherView(current, level, solved);
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Tačno ${how}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        const walk = current.task === "dress" && !calm;
        sayThen(praise(sentence, firstTry), isLast ? finish : () => startRound(current.round), { min: walk ? WALK_MS : FEEDBACK_MIN_MS + 600, max: walk ? WALK_MS + 900 : undefined, emotion: "happy" });
    };

    /** Stvar je spuštena na lik. Vraća true kad je obučena (inače se vraća u korpu). */
    const wear = (id: string): boolean => {
        if (isMonitor || finishedRef.current || guard.blocked()) return false;
        const current = viewRef.current;
        if (current.task !== "dress" || current.feedback === "correct" || !current.tray.includes(id) || current.worn.includes(id)) return false;
        const item = getClothing(id);
        if (!item) return false;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const attempt = tryWear(current, id);

        if (attempt.result === "ok") {
            const worn = [...current.worn, id];
            if (current.need.every((other) => worn.includes(other))) {
                const lead = current.forecast ? `${forecastSentence(current.forecast)} ` : "";
                solve(current, { worn, last: id, selected: null, mistake: null, feedback: "correct" }, `${lead}${doneText(current)}`, `${HEROES[current.hero].name}: ${worn.join(", ")}`);
                return true;
            }
            commit({ ...current, worn, last: id, selected: null, mistake: null, feedback: null }, `Obučeno: ${item.name}`);
            playSfx("correct");
            say(wornSentence(item.id), undefined, "happy");
            return true;
        }

        const order = attempt.result === "order";
        const wrong = [...current.wrong, order ? `${id}>${attempt.first}` : id];
        const misses = current.tray.filter((other) => !current.need.includes(other)).length;
        const hint = current.hint || hintDue(hintAfter, wrong.length, Math.max(1, misses));
        const mistake = order ? { item: id, reason: "order" as const, first: attempt.first } : { item: id, reason: "weather" as const };
        const next: WeatherView = {
            ...current,
            wrong,
            hint,
            mistake,
            selected: null,
            // Posle greške u redosledu pojavi se traka koraka (pomoć)
            strip: current.strip || order,
            feedback: "wrong",
            incorrectCount: current.incorrectCount + 1,
        };
        commit(next, order ? `Redosled: ${orderSentence(attempt.first as ClothingId, id as ClothingId)}` : `Ne ide uz vreme: ${item.name}`);
        playSfx("wrong");
        say(`${mistakeText(next)}${hint && !order ? ` ${RETRY_SLOW}` : ""}`, undefined, "gentle");
        settleAfterWrong();
        return false;
    };

    const tapItem = (id: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.feedback === "correct" || current.worn.includes(id)) return;
        playSfx("tap");
        commit({ ...current, selected: current.selected === id ? null : id });
    };

    const tapHero = () => {
        const selected = viewRef.current.selected;
        if (selected === null) return;
        if (!wear(selected) && !calm) {
            setWiggle(selected);
            after(520, () => setWiggle(null));
        }
    };

    const pickWeather = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.task !== "when" || current.feedback === "correct" || current.wrong.includes(id) || !current.choices.includes(id) || !current.item) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        if (id === current.answer) {
            solve(current, { selected: id, mistake: null, feedback: "correct" }, doneText(current), `${whenQuestion(current.item as ClothingId)} → ${id}`);
            return;
        }
        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(hintAfter, wrong.length, current.choices.length - 1);
        const next: WeatherView = { ...current, wrong, hint, selected: id, mistake: { item: id, reason: "when" }, feedback: "wrong", incorrectCount: current.incorrectCount + 1 };
        commit(next, `Netačno: ${whenQuestion(current.item as ClothingId)} → ${id}`);
        playSfx("wrong");
        say(`${mistakeText(next)} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong();
    };

    // Pomoć posle čekanja: sledeća prava stvar (ili pravo vreme) blago zasvetli
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.worn.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hint) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        const question = roundQuestion(current);
        if (question) say(question);
    };

    // Stvar koja prati prst je iste veličine kao kartica iz koje je uzeta
    const [ghostPx, setGhostPx] = useState(88);
    const drag = useDragSnap({
        enabled: !isMonitor && view.task === "dress" && view.feedback !== "correct",
        calm,
        onDrop: (piece, slot) => (slot === null ? false : wear(piece)),
        onTap: tapItem,
        onGrab: (piece) => {
            const card = document.querySelector<HTMLElement>(`[data-piece="${piece}"]`);
            if (card) setGhostPx(card.getBoundingClientRect().width);
        },
    });

    const shown = isMonitor ? mergeWeatherMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const question = roundQuestion(shown);

    if (!question) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = solved ? doneText(shown) : shown.feedback === "wrong" ? mistakeText(shown) : "";
    const demo = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: pitanje samo glasom (i natpis ispod prozora), da lik i odeća budu krupni */}
            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up [@media(max-height:37.5rem)]:hidden" compact title={question} />
            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-4">
                {shown.task === "when" ? (
                    <WhenBoard key={`when-${shown.round}`} view={shown} calm={calm} demo={demo} disabled={isMonitor || solved} onPick={pickWeather} />
                ) : (
                    <DressBoard
                        key={`dress-${shown.round}`}
                        view={shown}
                        drag={drag}
                        ghostPx={ghostPx}
                        calm={calm}
                        wiggle={wiggle}
                        demo={demo}
                        disabled={isMonitor || solved}
                        onHero={tapHero}
                    />
                )}
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Oblačenje ─────────────────────────────────────────────────────────────────

interface DressProps {
    view: WeatherView;
    drag: DragSnap;
    ghostPx: number;
    calm: boolean;
    wiggle: string | null;
    demo: boolean;
    disabled: boolean;
    onHero: () => void;
}

/** Veličina kartice u korpi: što veća, a da sve stane (u odnosu na polje za igru) */
function traySize(count: number, side: boolean): { cols: number; size: string } {
    if (side) {
        const cols = count > 3 ? 2 : 1;
        const rows = Math.ceil(count / cols);
        return { cols, size: `min(calc((100cqh - ${(rows - 1) * 0.5}rem) / ${rows}), 15cqw, 7.5rem)` };
    }
    const cols = count <= 4 ? count : Math.ceil(count / 2);
    const rows = Math.ceil(count / cols);
    return { cols, size: `min(calc((100cqw - ${(cols - 1) * 0.5}rem) / ${cols}), calc(${rows === 1 ? 24 : 15}cqh), 7rem)` };
}

function DressBoard({ view, drag, ghostPx, calm, wiggle, demo, disabled, onHero }: DressProps) {
    const { rootRef, ghostRef, active, wobble, over } = drag;
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const sceneId = view.scene as SceneId;
    const solved = view.feedback === "correct";
    const hinted = view.hint && !solved ? nextNeeded(view) : null;
    const demoItem = demo ? view.need[0] : null;
    const glow = over === HERO_SLOT || (view.selected !== null && !disabled) || hinted !== null;
    const worn = [...view.base, ...view.worn];
    const hero = HEROES[view.hero];
    const count = view.tray.length;

    const setRootRef = (el: HTMLDivElement | null) => {
        rootRef(el);
        setRoot((previous) => (previous === el ? previous : el));
    };

    const walking = solved && !calm;

    return (
        <div ref={setRootRef} className={cn("relative flex min-h-0 w-full flex-1 self-stretch", disabled && "pointer-events-none")} style={{ containerType: "size" }}>
            <FigureStyles />
            <div className="flex h-full w-full flex-col gap-2 sm:gap-3 landscape:flex-row">
                {/* Vreme (prozor, mesto ili prognoza) i lik */}
                <div className="flex min-h-0 min-w-0 flex-1 items-stretch gap-2 sm:gap-3">
                    <div className="flex min-h-0 w-[46%] shrink-0 flex-col items-center justify-center gap-1.5 sm:gap-2 landscape:w-auto landscape:min-w-0 landscape:flex-1">
                        {view.forecast ? (
                            <ForecastStrip forecast={view.forecast} hint={view.hint} solved={solved} />
                        ) : (
                            <>
                                <WeatherWindow scene={sceneId} calm={calm} className="h-auto max-h-full w-full min-h-0" />
                                <p className="rounded-full bg-surface px-3 py-1 text-center text-sm font-extrabold leading-tight text-ink shadow-soft ring-1 ring-line sm:text-lg [@media(max-height:30rem)]:text-xs">
                                    {getScene(sceneId)?.caption}
                                </p>
                            </>
                        )}
                        {view.strip && <OrderStrip view={view} />}
                    </div>
                    <button
                        type="button"
                        data-slot={HERO_SLOT}
                        data-open=""
                        disabled={disabled || view.selected === null}
                        onClick={onHero}
                        aria-label={hero.name}
                        className={cn(
                            "relative flex min-h-0 min-w-0 flex-1 items-center justify-center rounded-card outline-none transition-[background-color,box-shadow] duration-200 focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default landscape:aspect-[3/4] landscape:max-w-[42%] landscape:flex-none",
                            glow ? "bg-brand-50/80 ring-4 ring-brand-200" : "bg-surface/50",
                            hinted !== null && !calm && "animate-soft-pulse"
                        )}
                    >
                        <svg viewBox={`${CHAR_VIEW.x} ${CHAR_VIEW.y} ${CHAR_VIEW.w} ${CHAR_VIEW.h}`} className="pointer-events-none h-full w-full" role="img" aria-label={`${hero.name}`}>
                            <ellipse cx={100} cy={333} rx={56} ry={8} fill="#1f1b3a" opacity={0.08} />
                            <g className={walking ? "wx-walking" : undefined}>
                                <g className={walking ? "wx-bobbing" : undefined}>
                                    <DressFigure hero={view.hero} worn={worn} happy={solved} fresh={view.last} calm={calm} />
                                </g>
                            </g>
                        </svg>
                    </button>
                </div>

                {/* Korpa sa odećom */}
                <Tray view={view} drag={drag} calm={calm} wiggle={wiggle} hinted={hinted} disabled={disabled} count={count} />
            </div>

            {demoItem && !view.worn.includes(demoItem) && <DragDemo root={root} from={`[data-piece="${demoItem}"]`} to={`[data-slot="${HERO_SLOT}"]`} calm={calm} />}

            {/* Stvar koja prati prst: iznad celog ekrana igre (z 6000), da je ništa ne pokrije */}
            {active !== null &&
                getClothing(active) &&
                typeof document !== "undefined" &&
                createPortal(
                    <div ref={ghostRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[6500] drop-shadow-xl" style={{ width: ghostPx * 1.1, height: ghostPx * 1.1 }}>
                        <div className={cn("h-full w-full", wobble && "animate-wiggle")}>
                            <ClothingIcon id={active as ClothingId} hero={view.hero} className="h-full w-full" />
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

interface TrayProps {
    view: WeatherView;
    drag: DragSnap;
    calm: boolean;
    wiggle: string | null;
    hinted: string | null;
    disabled: boolean;
    count: number;
}

function Tray({ view, drag, calm, wiggle, hinted, disabled, count }: TrayProps) {
    const { active, pieceProps } = drag;
    const portrait = traySize(count, false);
    const side = traySize(count, true);
    return (
        <div
            role="group"
            aria-label="Odeća"
            className="grid shrink-0 place-content-center gap-2 self-center rounded-card border-2 border-dashed border-line bg-surface/70 p-1.5 sm:p-2 [grid-template-columns:repeat(var(--cols),var(--card))] landscape:[grid-template-columns:repeat(var(--side-cols),var(--side-card))]"
            style={{ ["--cols" as string]: portrait.cols, ["--card" as string]: portrait.size, ["--side-cols" as string]: side.cols, ["--side-card" as string]: side.size }}
        >
            {view.tray.map((id) => {
                const item = getClothing(id);
                if (!item) return null;
                if (view.worn.includes(id)) return <span key={id} aria-hidden="true" className="aspect-square rounded-2xl border-2 border-dashed border-line/70" />;
                const selected = view.selected === id;
                const glow = hinted === id;
                return (
                    <button
                        key={id}
                        type="button"
                        data-piece={id}
                        disabled={disabled}
                        aria-pressed={selected}
                        aria-label={item.label}
                        {...pieceProps(id)}
                        className={cn(
                            "relative flex aspect-square touch-none select-none flex-col items-center justify-center rounded-2xl border-2 border-b-4 bg-surface p-1 shadow-soft transition-[transform,border-color,opacity] duration-150 @container",
                            selected ? "-translate-y-1 border-brand-500 bg-brand-50" : glow ? "border-brand-400 bg-brand-50" : "border-line hover:border-brand-300",
                            glow && !calm && "animate-soft-pulse",
                            active === id && "opacity-30",
                            wiggle === id && "animate-wiggle"
                        )}
                    >
                        <ClothingIcon id={item.id} hero={view.hero} className="pointer-events-none min-h-0 w-[78%] flex-1" />
                        {/* Natpis je za odrasle i decu koja čitaju */}
                        <span className="pointer-events-none line-clamp-2 max-w-full px-0.5 pt-[0.12em] text-center @max-[4.25rem]:hidden text-[clamp(0.55rem,11.5cqi,0.95rem)] font-extrabold leading-[1.15] text-ink-soft">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

/** Koraci oblačenja redom (pomoć za redosled): obučene stvari dobijaju kvačicu */
function OrderStrip({ view }: { view: WeatherView }) {
    const steps = dressingOrder(view.need);
    return (
        <ol aria-label="Redosled oblačenja" className="flex w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-surface/90 p-1.5 ring-1 ring-line">
            {steps.map((id, index) => {
                const done = view.worn.includes(id);
                return (
                    <li key={id} className={cn("relative grid h-[clamp(1.9rem,7cqh,3.5rem)] w-[clamp(1.9rem,7cqh,3.5rem)] place-items-center rounded-xl bg-surface ring-1 ring-line", done && "opacity-50")}>
                        <ClothingIcon id={id as ClothingId} hero={view.hero} className="h-[82%] w-[82%]" />
                        <span className="absolute -left-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-[0.6rem] font-black text-white sm:h-5 sm:w-5 sm:text-xs">{index + 1}</span>
                        {done && <Check aria-hidden="true" strokeWidth={4} className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-600 p-0.5 text-white sm:h-5 sm:w-5" />}
                        <span className="sr-only">{`${index + 1}. ${getClothing(id)?.label ?? ""}${done ? ", obučeno" : ""}`}</span>
                    </li>
                );
            })}
        </ol>
    );
}

/** Nedeljna prognoza: dani jedan ispod drugog, danas i ciljni dan su označeni */
function ForecastStrip({ forecast, hint, solved }: { forecast: NonNullable<WeatherView["forecast"]>; hint: boolean; solved: boolean }) {
    return (
        <ol aria-label="Prognoza za nedelju" className="flex min-h-0 w-full flex-1 flex-col justify-center gap-1 sm:gap-1.5">
            {forecast.days.map((sceneId, day) => {
                const target = day === forecast.target;
                const marked = target && (forecast.mark || hint || solved);
                const label = WEEKDAYS[day];
                return (
                    <li
                        key={day}
                        className={cn(
                            "flex min-h-0 flex-1 items-center gap-1.5 rounded-xl bg-surface px-1.5 ring-1 ring-line sm:gap-2 sm:px-2",
                            marked && "ring-4 ring-brand-300",
                            day < forecast.today && "opacity-50"
                        )}
                    >
                        <span className="w-[2.6em] shrink-0 text-sm font-extrabold text-ink sm:text-lg">{label.short}</span>
                        <WeatherIcon scene={sceneId} className="aspect-square h-full max-h-14 min-h-0 w-auto shrink" />
                        {day === forecast.today && <span className="ml-auto rounded-full bg-sun-100 px-1.5 py-0.5 text-[0.65rem] font-extrabold text-sun-700 sm:text-xs">danas</span>}
                        {target && forecast.mark && <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[0.65rem] font-extrabold text-white sm:text-xs">sutra</span>}
                        <span className="sr-only">{`${label.name}: ${getScene(sceneId)?.caption ?? ""}`}</span>
                    </li>
                );
            })}
        </ol>
    );
}

// ── „Kada nosimo …?” ──────────────────────────────────────────────────────────

function whenState(view: WeatherView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.selected === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.answer) return "hint";
    return "idle";
}

function WhenBoard({ view, calm, demo, disabled, onPick }: { view: WeatherView; calm: boolean; demo: boolean; disabled: boolean; onPick: (id: string) => void }) {
    const item = getClothing(view.item);
    if (!item) return null;
    return (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 self-stretch landscape:flex-row sm:gap-5" style={{ containerType: "size" }}>
            <div className="flex aspect-square w-[min(48cqw,38cqh,16rem)] shrink-0 flex-col items-center justify-center rounded-card border-2 border-line bg-surface p-2 shadow-soft landscape:w-[min(28cqw,62cqh,16rem)]">
                <ClothingIcon id={item.id} hero={view.hero} className="min-h-0 w-full flex-1" />
                <span className="text-base font-extrabold leading-tight text-ink sm:text-xl">{item.label}</span>
            </div>
            <div role="group" aria-label="Vreme" className={cn("grid w-full max-w-3xl gap-2 sm:gap-4", view.choices.length === 2 ? "grid-cols-2" : "grid-cols-3", disabled && "pointer-events-none")}>
                {view.choices.map((id) => {
                    const sceneInfo = getScene(id);
                    if (!sceneInfo) return null;
                    const state = whenState(view, id);
                    return (
                        <ChoiceCard
                            key={id}
                            data-action={`choice:${id}`}
                            state={state}
                            disabled={disabled || (state !== "idle" && state !== "hint")}
                            onClick={() => onPick(id)}
                            aria-label={`${sceneInfo.caption}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                            className="animate-pop min-h-0 flex-col gap-1 p-1.5 sm:p-2"
                        >
                            <WeatherWindow scene={id as SceneId} calm={calm} className="pointer-events-none h-auto w-full max-w-[min(100%,36cqh)]" />
                            <span className="text-sm leading-tight sm:text-lg">{sceneInfo.caption}</span>
                            {demo && id === view.answer && <DemoHand />}
                        </ChoiceCard>
                    );
                })}
            </div>
        </div>
    );
}

