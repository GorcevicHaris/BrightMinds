"use client";

// Igra „Šta dolazi sledeće?”: niz boja, oblika, slika ili brojeva vozi se na vozu, gusenici,
// perlama, balonima ili karticama na konopcu, a jedno mesto je prazno („?”). Dete bira šta ide
// na prazno mesto; tačan izbor doleti na svoje mesto, voz zatrubi i krene, gusenica se zatalasa.
// Pogrešan izbor se mirno utiša, a glas kaže pravilo („Posle plave uvek dolazi crvena.”).
// Kasnije: prazno mesto u sredini, dve osobine, rastući niz, brojevi, dva prazna mesta,
// okretanje i isto pravilo u drugom nizu. Nema žurbe ni tajmera.
// Nivoi: data/patternLevels.ts, crteži: pattern/.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    boxOf,
    ChoiceCard,
    DemoHand,
    demoRounds,
    Feedback,
    FEEDBACK_MIN_MS,
    flyIn,
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
    type Box as ScreenBox,
    type ChoiceState,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import {
    buildPatternLevel,
    CARRIER_NAMES,
    currentAnswer,
    currentGap,
    emptyPatternView,
    itemLabel,
    itemSpoken,
    mergePatternMonitor,
    mistakeSentence,
    NEXT_GAP,
    parseItem,
    patternLevel,
    patternQuestion,
    patternResult,
    patternRoundView,
    patternVoiceQuestion,
    plainShapes,
    RETRY,
    RETRY_SLOW,
    rowSpoken,
    solvedSentence,
    solvePatternView,
    describeUnit,
    type CarrierId,
    type PatternRound,
    type PatternView,
    type TransferRow,
} from "@/app/components/games/data/patternLevels";
import {
    BeadClasp,
    CARRIER_ENDS,
    CaterpillarHead,
    GapMark,
    ItemArt,
    itemBox,
    Locomotive,
    PATTERN_STYLES,
    Post,
    SLOT_HEIGHT,
    SlotBase,
} from "@/app/components/games/pattern/PatternArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("pattern");
const WRONG_FEEDBACK_MS = 1600;
/** Koliko traje veselje niza (voz krene, gusenica se zatalasa) pre sledećeg zadatka */
const PARTY_MS = 2600;
/** Nizak ekran: poruka se vidi u polju za igru (umesto pitanja), a ovde ostaje samo za čitače ekrana */
const FEEDBACK_CLASS = "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:sr-only";

interface PendingFly {
    key: string;
    from: ScreenBox | null;
}

export default function PatternGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<PatternView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<PatternView>({ childId, gameId: "pattern", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Na lakim nivoima pomoć stiže već posle prve greške i posle čekanja (osim kad je isključena)
    const rule = patternLevel(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<PatternRound[]>(() =>
        isMonitor ? [] : buildPatternLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })
    );
    const [view, setView] = useState<PatternView>(() => ({ ...emptyPatternView(plan.length), ...(plan[0] ? patternRoundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const pendingFly = useRef<PendingFly | null>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: PatternView, log?: string) => {
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
        if (viewRef.current.items.length > 0) say(patternVoiceQuestion(viewRef.current));
    }, [isMonitor, sync, guard, say]);

    // Izabrana stvar doleti iz kartice na prazno mesto (kad je novo stanje već nacrtano)
    useLayoutEffect(() => {
        const pending = pendingFly.current;
        if (!pending) return;
        pendingFly.current = null;
        if (calm) return;
        const element = boardRef.current?.querySelector(`[data-fly="${pending.key}"]`);
        flyIn(element, pending.from, boxOf(element?.querySelector("[data-fly-box]")));
    }, [view, calm]);

    const modeledRound = (current: PatternView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(patternResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: PatternView = { ...viewRef.current, ...patternRoundView(round), round: index + 1 };
        commit(next, `Zadatak ${index + 1}: ${patternQuestion(next)} (${rowSpoken(next)})`);
        say(patternVoiceQuestion(next));
    };

    const pick = (id: string, event?: MouseEvent<HTMLElement>) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.feedback === "correct" || current.wrong.includes(id) || !current.choices.includes(id)) return;
        const answer = currentAnswer(current);
        if (!answer) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const spoken = current.kind === "transfer" ? describeUnit(current.rows.find((row) => row.id === id)?.items.slice(0, id.length) ?? []) : itemSpoken(id, plainShapes(current.items));

        if (id === answer) {
            if (current.kind !== "transfer") {
                pendingFly.current = { key: `gap-${currentGap(current)}`, from: boxOf(event?.currentTarget.querySelector("[data-pic]")) };
            }
            // Dva prazna mesta: posle prvog niz čeka i drugo (bez bodova u međuvremenu)
            if (current.filled + 1 < current.gaps.length) {
                guard.hold();
                const next: PatternView = { ...current, filled: current.filled + 1, wrong: [], picked: null, helped: current.helped || current.hint, hint: false, feedback: null };
                commit(next, `Tačno (prvo prazno mesto): ${spoken}`);
                playSfx("flip");
                say(NEXT_GAP, undefined, "happy");
                return;
            }
            const { next, firstTry, modeled } = solvePatternView(current, level, { filled: current.gaps.length, picked: id, feedback: "correct" });
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint || current.helped ? "uz pomoć" : "posle više pokušaja";
            commit(next, `Tačno ${how}: ${spoken}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            sayThen(praise(solvedSentence(current), firstTry), isLast ? finish : () => startRound(current.round), {
                min: calm ? FEEDBACK_MIN_MS + 600 : PARTY_MS,
                emotion: "happy",
            });
            return;
        }

        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(hintAfter, wrong.length, current.choices.length - 1);
        const next: PatternView = { ...current, wrong, hint, picked: id, misses: current.misses + 1, feedback: "wrong", incorrectCount: current.incorrectCount + 1 };
        commit(next, `Netačno: ${spoken}`);
        playSfx("wrong");
        say(`${mistakeSentence(current, id)} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, feedback: null, picked: null });
        });
    };

    // Pomoć posle čekanja: tačan izbor blago zasvetli (i jedinica niza se uokviri)
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.filled}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hint) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct" || current.items.length === 0) return;
        say(patternVoiceQuestion(current));
    };

    const shown = isMonitor ? mergePatternMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (shown.items.length === 0 || (shown.kind !== "transfer" && shown.gaps.length === 0)) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const question = patternQuestion(shown);
    const solved = shown.feedback === "correct";
    const message = solved ? solvedSentence(shown) : shown.feedback === "wrong" && shown.picked ? mistakeSentence(shown, shown.picked) : "";
    const demo = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved;
    const disabled = isMonitor || solved;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: pitanje stoji u polju za igru, da niz i izbori budu krupni */}
            <GamePrompt key={`prompt-${shown.round}-${shown.filled}`} className="animate-fade-up [@media(max-height:37.5rem)]:hidden" compact title={question} />
            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-4">
                <div
                    ref={boardRef}
                    className={cn("relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(0.35rem,4cqh,2.25rem)] self-stretch", isMonitor && "pointer-events-none")}
                    style={{ containerType: "size" }}
                >
                    <style>{PATTERN_STYLES}</style>
                    <div aria-hidden="true" className="hidden min-h-7 shrink-0 items-center justify-center text-center [@media(max-height:37.5rem)]:flex">
                        {message ? (
                            <span
                                key={`${shown.feedback}-${message}`}
                                className={cn(
                                    "animate-pop rounded-full px-4 py-1 text-sm font-extrabold leading-snug shadow-soft",
                                    solved ? "bg-emerald-700 text-white" : "bg-sun-100 text-sun-700 ring-1 ring-sun-300"
                                )}
                            >
                                {solved ? `✓ ${message}` : message}
                            </span>
                        ) : (
                            <span className="font-display text-base font-extrabold leading-tight text-ink">{question}</span>
                        )}
                    </div>
                    {shown.kind === "transfer" ? (
                        // Položen ekran: uzor levo, nizovi za izbor desno (širine i visine su promenljive za oba rasporeda)
                        <div className="flex min-h-0 w-full flex-col items-center justify-center gap-[clamp(0.35rem,4cqh,2.25rem)] [--choice-h:52cqh] [--choice-w:100cqw] [--row-h:20cqh] [--row-w:100cqw] landscape:flex-row landscape:gap-3 landscape:[--choice-h:64cqh] landscape:[--choice-w:48cqw] landscape:[--row-h:56cqh] landscape:[--row-w:48cqw]">
                            <PatternRow key={`row-${shown.round}`} view={shown} calm={calm} early={rule.earlyHint} transfer />
                            <TransferChoices view={shown} demo={demo} disabled={disabled} onPick={pick} />
                        </div>
                    ) : (
                        <>
                            <PatternRow key={`row-${shown.round}`} view={shown} calm={calm} early={rule.earlyHint} transfer={false} />
                            <ItemChoices key={`choices-${shown.round}`} view={shown} demo={demo} disabled={disabled} onPick={pick} />
                        </>
                    )}
                </div>
            </PlayArea>
            <Feedback kind={message ? shown.feedback : null} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Niz na nosaču ─────────────────────────────────────────────────────────────

/** Mesta u nizu kojima se veselje pokreće malo jedno za drugim (talas) */
const WAVE_STEP_S = 0.09;

function PatternRow({ view, calm, early, transfer }: { view: PatternView; calm: boolean; early: boolean; transfer: boolean }) {
    const carrier = view.carrier;
    const n = view.items.length;
    const ends = CARRIER_ENDS[carrier];
    const height = SLOT_HEIGHT[carrier];
    const aspect = height / 100;
    const units = n + ends.left + ends.right;
    const solved = view.feedback === "correct";
    const party = solved && !calm;
    const open = new Set(view.gaps.slice(view.filled));
    const box = itemBox(carrier);
    const plain = plainShapes(view.items);
    // Jedinica niza blago uokvirena lukom: na lakim nivoima od početka, inače kao pomoć
    const arcs = view.kind === "repeat" && view.unit > 1 && (view.grouped || view.hint);
    // Visina niza: deo polja (ostatak je za izbore); kod prenošenja pravila izbori su veći
    const rowWidth = transfer ? "var(--row-w)" : "100cqw";
    const rowHeight = transfer ? "var(--row-h)" : "28cqh";
    const u = `min(calc((${rowWidth} - 1.25rem) / ${units}), calc(${rowHeight} / ${aspect}), 8rem)`;
    const slotStyle: CSSProperties = { width: "var(--u)", height: `calc(var(--u) * ${aspect})` };
    const endStyle = (k: number): CSSProperties => ({ width: `calc(var(--u) * ${k})`, height: `calc(var(--u) * ${aspect})` });
    const wave = (i: number): CSSProperties => (party ? { animationDelay: `${(i * WAVE_STEP_S).toFixed(2)}s` } : {});

    const slotMotion = party && (carrier === "caterpillar" || carrier === "balloons") ? "pt-wave" : party && carrier === "line" ? "pt-sway" : undefined;

    return (
        <div
            className={cn("relative flex shrink-0 flex-col items-center overflow-hidden rounded-card bg-surface/80 px-2 ring-1 ring-lilac-100", transfer ? "w-full landscape:w-[48cqw]" : "w-full")}
            style={{ ["--u" as string]: u, paddingTop: carrier === "caterpillar" ? "calc(var(--u) * 0.32)" : "calc(var(--u) * 0.14)", paddingBottom: "calc(var(--u) * 0.08)" }}
        >
            <div
                role="img"
                aria-label={`${CARRIER_NAMES[carrier]}: ${rowSpoken(view)}`}
                className={cn("relative flex items-end", party && carrier === "train" && "pt-roll")}
            >
                {/* Glava (levo) */}
                {ends.left > 0 && (
                    <div className={cn("relative shrink-0", slotMotion)} style={{ ...endStyle(ends.left), ...wave(0), zIndex: n + 2 }}>
                        {carrier === "train" ? (
                            <Locomotive happy={solved} moving={party} />
                        ) : carrier === "caterpillar" ? (
                            <CaterpillarHead happy={solved} />
                        ) : carrier === "beads" ? (
                            <BeadClasp side="left" />
                        ) : (
                            <Post carrier={carrier} side="left" />
                        )}
                        {party && carrier === "train" && (
                            <span className="absolute -top-[18%] left-[38%] animate-pop rounded-full bg-surface px-2 py-0.5 font-display text-[clamp(0.7rem,calc(var(--u)*0.22),1.1rem)] font-extrabold text-lilac-700 shadow-soft ring-1 ring-lilac-200">
                                Tu-tuuu!
                            </span>
                        )}
                    </div>
                )}
                {view.items.map((id, i) => {
                    const isOpen = open.has(i);
                    const isGap = view.gaps.includes(i);
                    const gapKind = parseItem(id)?.kind;
                    return (
                        <div key={i} className={cn("relative shrink-0", slotMotion)} style={{ ...slotStyle, ...wave(i + 1), zIndex: n - i }}>
                            <svg viewBox={`0 0 100 ${height}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                                <SlotBase carrier={carrier} spin={party} open={isOpen} />
                            </svg>
                            {isOpen ? (
                                <svg viewBox={`0 0 100 ${height}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                                    <GapMark carrier={carrier} kind={gapKind} box={box} className={early && !calm ? "pt-gap" : undefined} />
                                </svg>
                            ) : (
                                <svg
                                    viewBox={`0 0 100 ${height}`}
                                    data-fly={isGap ? `gap-${i}` : undefined}
                                    className={cn("absolute inset-0 h-full w-full overflow-visible", party && carrier === "beads" && "pt-land")}
                                    style={party && carrier === "beads" ? { animationDelay: `${(i * WAVE_STEP_S).toFixed(2)}s` } : undefined}
                                    aria-hidden="true"
                                >
                                    <rect data-fly-box="" x={box.x} y={box.y} width={box.s} height={box.s} fill="none" />
                                    <ItemArt id={id} carrier={carrier} box={box} />
                                </svg>
                            )}
                            <span className="sr-only">{isOpen ? "prazno mesto" : itemSpoken(id, plain)}</span>
                        </div>
                    );
                })}
                {ends.right > 0 && (
                    <div className="relative shrink-0" style={endStyle(ends.right)}>
                        {carrier === "beads" ? <BeadClasp side="right" /> : <Post carrier={carrier} side="right" />}
                    </div>
                )}
            </div>
            <Ground carrier={carrier} />
            {/* Lukovi ispod jedinica koje se ponavljaju */}
            {arcs && (
                <div aria-hidden="true" className="flex animate-fade" style={{ height: "calc(var(--u) * 0.22)" }}>
                    <span className="shrink-0" style={{ width: `calc(var(--u) * ${ends.left})` }} />
                    {Array.from({ length: Math.ceil(n / view.unit) }, (_, g) => {
                        const size = Math.min(view.unit, n - g * view.unit);
                        return (
                            <svg key={g} viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full shrink-0" style={{ width: `calc(var(--u) * ${size})` }}>
                                <path
                                    d="M6 3 Q6 16 20 16 H80 Q94 16 94 3"
                                    fill="none"
                                    stroke="#a782e2"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                    vectorEffect="non-scaling-stroke"
                                    strokeDasharray={size < view.unit ? "6 6" : undefined}
                                />
                            </svg>
                        );
                    })}
                    <span className="shrink-0" style={{ width: `calc(var(--u) * ${ends.right})` }} />
                </div>
            )}
        </div>
    );
}

/** Tlo ispod niza: šine za voz, trava za gusenicu, balone i konopac (perle lebde bez tla) */
function Ground({ carrier }: { carrier: CarrierId }) {
    if (carrier === "beads") return null;
    if (carrier === "train") {
        return (
            <span
                aria-hidden="true"
                className="-mx-2 block w-[calc(100%+1rem)] shrink-0 border-t-[3px] border-[#8a8fa0]"
                style={{
                    height: "calc(var(--u) * 0.1)",
                    backgroundImage: "repeating-linear-gradient(90deg, #c9a27a 0 6px, transparent 6px 18px)",
                }}
            />
        );
    }
    return <span aria-hidden="true" className="-mx-2 -mt-[2px] block w-[calc(100%+1rem)] shrink-0 rounded-full bg-[#cfe9b4]" style={{ height: "calc(var(--u) * 0.08)" }} />;
}

// ── Izbori ────────────────────────────────────────────────────────────────────

function choiceState(view: PatternView, id: string): ChoiceState {
    const answer = currentAnswer(view);
    if (view.feedback === "correct") return id === answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === answer) return "hint";
    return "idle";
}

/** Natpis staje u karticu: najduža reč u jednom redu (sitnije za „Tiranosaurus”), najviše dva reda */
function labelSize(label: string): string {
    const longest = Math.max(6, ...label.split(" ").map((word) => word.length));
    return `max(0.5rem, min(calc(var(--card) * 0.105), calc(var(--card) * 0.8 / ${(longest * 0.74).toFixed(2)}), 1.05rem))`;
}

const stateText = (state: ChoiceState) => (state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : "");

interface ChoicesProps {
    view: PatternView;
    demo: boolean;
    disabled: boolean;
    onPick: (id: string, event?: MouseEvent<HTMLElement>) => void;
}

function ItemChoices({ view, demo, disabled, onPick }: ChoicesProps) {
    const carrier: CarrierId = view.carrier;
    const box = itemBox(carrier);
    const count = view.choices.length;
    const answer = currentAnswer(view);
    const plain = plainShapes(view.items);
    // Natpis samo uz boje, oblike i slike (broj ili tačkice bi otkrili odgovor bez brojanja)
    const named = (id: string) => ["color", "shape", "picture"].includes(parseItem(id)?.kind ?? "");
    const labelled = view.choices.some(named);
    // Kartica: što veća, a da sve stane u jedan red ispod niza
    const card = `min(calc((100cqw - ${(count - 1) * 0.75}rem) / ${count}), ${labelled ? 36 : 31}cqh, 9.5rem)`;
    // Slika na kartici: ostatak je za natpis (ako ga ima)
    const pic = `calc(var(--card) * ${labelled ? 0.58 : 0.8})`;
    return (
        <div
            role="group"
            aria-label="Izbori"
            className="grid shrink-0 justify-center gap-3"
            style={{ gridTemplateColumns: `repeat(${count}, var(--card))`, ["--card" as string]: card }}
        >
            {view.choices.map((id) => {
                const state = choiceState(view, id);
                const label = named(id) ? itemLabel(id, plain) : "";
                // Tačna stvar je odletela na svoje mesto: na kartici ostaje samo bled trag
                const flown = state === "correct";
                return (
                    <ChoiceCard
                        key={id}
                        data-action={`choice:${id}`}
                        state={state}
                        disabled={disabled || (state !== "idle" && state !== "hint")}
                        onClick={(event) => onPick(id, event)}
                        aria-label={`${itemSpoken(id, plain)}${stateText(state)}`}
                        className="min-h-0 flex-col gap-0.5 p-[5%]"
                        style={{ minHeight: "var(--card)" }}
                    >
                        <svg
                            data-pic=""
                            viewBox={`${box.x} ${box.y} ${box.s} ${box.s}`}
                            className={cn("pointer-events-none shrink-0 overflow-visible transition-opacity", flown && "opacity-25")}
                            style={{ width: pic, height: pic }}
                            aria-hidden="true"
                        >
                            <ItemArt id={id} carrier={carrier} box={box} />
                        </svg>
                        {labelled && (
                            <span className="pointer-events-none line-clamp-2 max-w-full leading-[1.22]" style={{ fontSize: labelSize(label) }}>
                                {label}
                            </span>
                        )}
                        {demo && id === answer && <DemoHand />}
                    </ChoiceCard>
                );
            })}
        </div>
    );
}

/** Prenošenje pravila: izbori su celi nizovi drugih stvari */
function TransferChoices({ view, demo, disabled, onPick }: ChoicesProps) {
    const count = view.rows.length;
    const length = Math.max(...view.rows.map((row) => row.items.length), 1);
    const tile = `min(calc((var(--choice-w) - 2.5rem) / ${length + 0.4}), calc((var(--choice-h) - ${count - 1} * 0.5rem) / ${count} - 1.4rem), 4.75rem)`;
    return (
        <div role="group" aria-label="Nizovi" className="flex shrink-0 flex-col items-center gap-2" style={{ ["--tile" as string]: tile }}>
            {view.rows.map((row: TransferRow) => {
                const state = choiceState(view, row.id);
                const plain = plainShapes(row.items);
                return (
                    <ChoiceCard
                        key={row.id}
                        data-action={`choice:${row.id}`}
                        state={state}
                        disabled={disabled || (state !== "idle" && state !== "hint")}
                        onClick={(event) => onPick(row.id, event)}
                        aria-label={`${row.items.map((id) => itemSpoken(id, plain)).join(", ")}${stateText(state)}`}
                        className="min-h-0 w-auto gap-0 px-2 py-1"
                    >
                        {row.items.map((id, i) => (
                            <svg key={i} viewBox="0 0 100 100" className="pointer-events-none shrink-0" style={{ width: "var(--tile)", height: "var(--tile)" }} aria-hidden="true">
                                <ItemArt id={id} carrier="line" box={{ x: 6, y: 6, s: 88 }} />
                            </svg>
                        ))}
                        {demo && row.id === view.structure && <DemoHand />}
                    </ChoiceCard>
                );
            })}
        </div>
    );
}
