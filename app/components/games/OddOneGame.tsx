"use client";

// Igra „Šta ne pripada?”: na polici stoji 3–5 slika (oblici u bojama, životinje, voće, vozila,
// brojevi…), a jedna ne ide uz ostale. Dete je pronađe; ona veselo iskoči iz grupe, a ostale se
// okupe u okviru koji kaže šta ih spaja („Sve je voće.”). Na teškim nivoima posle toga dete bira
// i ZAŠTO (boja, oblik, veličina, broj, vrsta, prvi glas), a na nivou „promena pravila” iste
// slike ostaju na polici, a pravilo se menja („Sada gledaj boju.”). Posle promašaja glas mirno
// kaže činjenicu o izabranoj slici; nema žurbe ni tajmera. Nivoi: data/oddoneLevels.ts,
// crteži: oddone/.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
    listenLimitFor,
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
    buildOddoneLevel,
    cardName,
    emptyOddView,
    focusReason,
    FOUND_SENTENCE,
    groupLabel,
    mergeOddoneMonitor,
    mistakeSentence,
    oddoneLevel,
    oddoneResult,
    oddQuestion,
    oddRoundView,
    oddSentence,
    reasonMistake,
    REASONS,
    solveOddView,
    stepMisses,
    WHY_QUESTION,
    type OddCard,
    type OddRound,
    type OddView,
    type ReasonId,
} from "@/app/components/games/data/oddoneLevels";
import { CountArt, Detective, ReasonIcon, SHAPE_COLORS, ShapeArt, ThingArt } from "@/app/components/games/oddone/OddOneArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("oddone");
const WRONG_FEEDBACK_MS = 1600;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
/** Koliko najmanje stoji okupljena grupa (da dete vidi ko je iskočio i šta spaja ostale) */
const GROUPED_MS = 2600;
/** Nizak ekran: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

/** Šta se kaže i piše posle poslednje greške */
function mistakeText(view: OddView): string {
    if (!view.picked) return "";
    if (view.picked.startsWith("reason:")) return reasonMistake(view, view.picked.slice(7) as ReasonId);
    return mistakeSentence(view, view.picked.slice(5));
}

export default function OddOneGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<OddView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<OddView>({ childId, gameId: "oddone", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Na lakim nivoima pomoć stiže već posle prve greške i posle čekanja (osim kad je isključena)
    const rule = oddoneLevel(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<OddRound[]>(() => (isMonitor ? [] : buildOddoneLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    const [view, setView] = useState<OddView>(() => ({ ...emptyOddView(plan.length), ...(plan[0] ? oddRoundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: OddView, log?: string) => {
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
        if (viewRef.current.cards.length > 0) say(oddQuestion(viewRef.current));
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: OddView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(oddoneResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: OddView = { ...viewRef.current, ...oddRoundView(round), round: index + 1 };
        const question = oddQuestion(next);
        commit(next, `Zadatak ${index + 1}: ${question}`);
        say(question);
    };

    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, feedback: null, picked: null });
        });
    };

    /** Zadatak rešen: grupa se okupi, pohvala i objašnjenje, pa sledeći zadatak */
    const solve = (current: OddView, solved: Partial<OddView>, log: string) => {
        const { next, firstTry, modeled } = solveOddView(current, level, solved);
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.helped || current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Tačno ${how}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        const text = praise(oddSentence(current), firstTry);
        sayThen(text, isLast ? finish : () => startRound(current.round), { min: calm ? FEEDBACK_MIN_MS + 600 : GROUPED_MS, max: listenLimitFor(text), emotion: "happy" });
    };

    const pickCard = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.ask !== "find" || current.found || current.feedback === "correct") return;
        const card = current.cards.find((other) => other.id === id);
        if (!card || current.wrong.includes(`card:${id}`)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;

        if (id === current.odd) {
            if (current.reasons.length > 0) {
                // Uljez je pronađen; sad se bira razlog (pomoć za ovaj korak počinje iznova)
                const next: OddView = { ...current, ask: "why", found: true, picked: null, feedback: null, helped: current.helped || current.hint, hint: false };
                commit(next, `Pronađen uljez: ${cardName(card)}. Zašto?`);
                playSfx("correct");
                guard.hold();
                say(FOUND_SENTENCE, undefined, "happy");
                return;
            }
            solve(current, { found: true, picked: null, feedback: "correct" }, cardName(card));
            return;
        }

        const wrong = [...current.wrong, `card:${id}`];
        const hint = current.hint || hintDue(hintAfter, stepMisses({ wrong, ask: "find" }), current.cards.length - 1);
        const next: OddView = { ...current, wrong, hint, helped: current.helped || hint, picked: `card:${id}`, feedback: "wrong", incorrectCount: current.incorrectCount + 1 };
        commit(next, `Netačno: ${cardName(card)}`);
        playSfx("wrong");
        say(`${mistakeSentence(current, id)} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong();
    };

    const pickReason = (id: ReasonId) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.ask !== "why" || current.feedback === "correct" || !current.reasons.includes(id) || current.wrong.includes(`reason:${id}`)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        if (id === current.reason) {
            solve(current, { picked: null, feedback: "correct" }, `razlog: ${REASONS[id].label}`);
            return;
        }
        const wrong = [...current.wrong, `reason:${id}`];
        const hint = current.hint || hintDue(hintAfter, stepMisses({ wrong, ask: "why" }), current.reasons.length - 1);
        const next: OddView = { ...current, wrong, hint, helped: current.helped || hint, picked: `reason:${id}`, feedback: "wrong", incorrectCount: current.incorrectCount + 1 };
        commit(next, `Netačan razlog: ${REASONS[id].label}`);
        playSfx("wrong");
        say(`${reasonMistake(current, id)}${hint ? ` ${RETRY_SLOW}` : ""}`, undefined, "gentle");
        settleAfterWrong();
    };

    // Pomoć posle čekanja: uljez (ili pravi razlog) blago zasvetli
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.ask}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hint) return;
        if (modeledRound(current) && current.wrong.length === 0 && current.ask === "find") return; // tu pokazuje ruka
        commit({ ...current, hint: true, helped: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct" || current.cards.length === 0) return;
        say(current.ask === "why" ? WHY_QUESTION : oddQuestion(current));
    };

    const shown = isMonitor ? mergeOddoneMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (shown.cards.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = solved ? oddSentence(shown) : shown.feedback === "wrong" ? mistakeText(shown) : "";
    const demo = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved && shown.ask === "find";
    // Uz oznaku „šta se gleda” pitanje je kratko; oznaka kaže ostalo
    const title = shown.ask === "why" && !solved ? WHY_QUESTION : shown.legend ? "Šta ne pripada?" : oddQuestion(shown);

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: pitanje samo glasom (oznake na tabli ostaju), da slike budu krupne */}
            <GamePrompt
                key={`prompt-${shown.round}-${shown.ask}`}
                className="animate-fade-up [@media(max-height:37.5rem)]:hidden"
                compact
                title={title}
                subtitle={shown.legend && shown.ask === "find" ? <LegendChip id={shown.legend} lead="Gledaj:" /> : undefined}
                visual={<Detective className="h-full w-full p-0.5" />}
            />
            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-4">
                <OddBoard key={`board-${shown.pair}`} view={shown} calm={calm} demo={demo} disabled={isMonitor || solved} onPick={pickCard} onReason={pickReason} />
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Oznaka „šta se gleda” ─────────────────────────────────────────────────────

function LegendChip({ id, lead, className }: { id: ReasonId; lead?: string; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-mulberry-50 py-0.5 pl-1.5 pr-3 text-sm font-extrabold text-mulberry-700 ring-1 ring-mulberry-200 sm:text-base", className)}>
            <ReasonIcon id={id} className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
            {lead && <span className="font-bold text-ink-soft">{lead}</span>}
            {REASONS[id].label.toLocaleLowerCase("sr")}
        </span>
    );
}

// ── Raspored police ───────────────────────────────────────────────────────────

interface Spot {
    x: number;
    y: number;
}

interface Layout {
    s: number;
    spots: Record<string, Spot>;
    /** Daske police ispod redova (dok je grupa na okupu, police nema) */
    shelves: { x: number; y: number; w: number }[];
    group: { x: number; y: number; w: number; h: number } | null;
}

const MAX_CARD = 216;
/** Visina reda: kartica i daska ispod nje */
const ROW = 1.12;
/** Unutrašnji razmak okvira grupe (deo veličine kartice) */
const PAD = 0.1;
/** Prostor iznad okvira grupe za natpis */
const LABEL = 20;

/** n kartica u `rows` redova, ravnomerno (5 → 3 + 2) */
function rowsOf(n: number, rows: number): number[] {
    const base = Math.floor(n / rows);
    const extra = n % rows;
    return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Sve kartice na polici: broj redova bira se tako da kartice budu što veće */
function shelfLayout(ids: readonly string[], w: number, h: number, top: number): Layout {
    const n = ids.length;
    const gap = clamp(w * 0.035, 8, 22);
    let best = { s: 0, rows: [n] };
    for (let r = 1; r <= n; r += 1) {
        const rows = rowsOf(n, r);
        const cols = rows[0];
        // Daska police viri malo levo i desno od kartica, pa i ona mora da stane
        const s = Math.min((w - (cols - 1) * gap) / (cols + 0.24), (h - (r - 1) * gap) / (r * ROW), MAX_CARD);
        if (s > best.s + 1) best = { s, rows };
    }
    const { s, rows } = best;
    const blockH = rows.length * s * ROW + (rows.length - 1) * gap;
    let y = top + (h - blockH) / 2;
    let index = 0;
    const spots: Record<string, Spot> = {};
    const shelves: Layout["shelves"] = [];
    for (const count of rows) {
        const rowW = count * s + (count - 1) * gap;
        const x0 = (w - rowW) / 2;
        for (let k = 0; k < count; k += 1) spots[ids[index++]] = { x: x0 + k * (s + gap), y };
        shelves.push({ x: x0 - s * 0.12, y: y + s * 0.97, w: rowW + s * 0.24 });
        y += s * ROW + gap;
    }
    return { s, spots, shelves, group: null };
}

/** Grupa u okviru i uljez pored nje (desno na širokom polju, ispod na uskom) */
function groupLayout(group: readonly string[], odd: string, w: number, h: number, top: number): Layout {
    const m = group.length;
    const gap = clamp(w * 0.03, 8, 18);
    const apart = clamp(w * 0.05, 16, 44);
    let best = { s: 0, rows: [m], side: true };
    for (let r = 1; r <= m; r += 1) {
        const rows = rowsOf(m, r);
        const c = rows[0];
        const side = Math.min((w - (c - 1) * gap - apart) / (c + 2 * PAD + 1), (h - LABEL - (r - 1) * gap) / (r + 2 * PAD), MAX_CARD);
        const below = Math.min((w - (c - 1) * gap) / (c + 2 * PAD), (h - LABEL - (r - 1) * gap - apart) / (r + 2 * PAD + 1), MAX_CARD);
        if (side > best.s + 1) best = { s: side, rows, side: true };
        if (below > best.s + 1) best = { s: below, rows, side: false };
    }
    const { s, rows, side } = best;
    const c = rows[0];
    const boxW = c * s + (c - 1) * gap + 2 * PAD * s;
    const boxH = rows.length * s + (rows.length - 1) * gap + 2 * PAD * s;
    let box: Layout["group"];
    let oddSpot: Spot;
    if (side) {
        const x0 = (w - (boxW + apart + s)) / 2;
        const y0 = top + LABEL + (h - LABEL - boxH) / 2;
        box = { x: x0, y: y0, w: boxW, h: boxH };
        oddSpot = { x: x0 + boxW + apart, y: y0 + (boxH - s) / 2 };
    } else {
        const y0 = top + (h - (LABEL + boxH + apart + s)) / 2 + LABEL;
        box = { x: (w - boxW) / 2, y: y0, w: boxW, h: boxH };
        oddSpot = { x: (w - s) / 2, y: y0 + boxH + apart };
    }
    const spots: Record<string, Spot> = { [odd]: oddSpot };
    let index = 0;
    let y = box.y + PAD * s;
    for (const count of rows) {
        const rowW = count * s + (count - 1) * gap;
        const x0 = box.x + (boxW - rowW) / 2;
        for (let k = 0; k < count; k += 1) spots[group[index++]] = { x: x0 + k * (s + gap), y };
        y += s + gap;
    }
    return { s, spots, shelves: [], group: box };
}

// ── Tabla ─────────────────────────────────────────────────────────────────────

function cardState(view: OddView, id: string): ChoiceState {
    if (view.found || view.feedback === "correct") return id === view.odd ? "correct" : "idle";
    if (view.feedback === "wrong" && view.picked === `card:${id}`) return "wrong";
    if (view.wrong.includes(`card:${id}`)) return "dimmed";
    if (view.hint && id === view.odd) return "hint";
    return "idle";
}

function reasonState(view: OddView, id: ReasonId): ChoiceState {
    if (view.feedback === "correct") return id === view.reason ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === `reason:${id}`) return "wrong";
    if (view.wrong.includes(`reason:${id}`)) return "dimmed";
    if (view.hint && id === view.reason) return "hint";
    return "idle";
}

const STATE_WORD: Partial<Record<ChoiceState, string>> = { correct: ", tačno", wrong: ", netačno" };

interface BoardProps {
    view: OddView;
    calm: boolean;
    demo: boolean;
    disabled: boolean;
    onPick: (id: string) => void;
    onReason: (id: ReasonId) => void;
}

/** Skok uljeza iz grupe (jednom, kad je pronađen) */
const HOP_STYLES = `
@keyframes odd-hop {
  0% { transform: translateY(0) rotate(0deg); }
  40% { transform: translateY(-20%) rotate(-5deg); }
  72% { transform: translateY(0) rotate(4deg); }
  100% { transform: translateY(0) rotate(3deg); }
}
.odd-hop { animation: odd-hop 720ms cubic-bezier(0.3, 0.7, 0.3, 1) both; }
`;

function OddBoard({ view, calm, demo, disabled, onPick, onReason }: BoardProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<{ w: number; h: number } | null>(null);
    // Posle promene veličine kartice kratko ne klize (vidi `animate`)
    const [glide, setGlide] = useState(false);
    useLayoutEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        let timer = 0;
        const measure = () => {
            const w = el.clientWidth;
            const h = el.clientHeight;
            setBox((old) => (old && Math.abs(old.w - w) < 1 && Math.abs(old.h - h) < 1 ? old : { w, h }));
            setGlide(false);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setGlide(true), 150);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => {
            observer.disconnect();
            window.clearTimeout(timer);
        };
    }, []);

    const solved = view.feedback === "correct";
    const grouped = view.found || solved;
    const showReasons = view.reasons.length > 0 && grouped;
    const focus = focusReason(view);
    const asking = view.ask === "why" && !solved;

    let layout: Layout | null = null;
    let reasonsH = 0;
    if (box && box.w > 0 && box.h > 0) {
        const top = focus ? 44 : 0;
        reasonsH = showReasons ? clamp(box.h * 0.24, 64, 108) : 0;
        // Nizak ekran: poruka posle tačnog odgovora lebdi preko dna table, pa joj grupa ostavlja mesta
        const message = solved && !showReasons && typeof window !== "undefined" && window.innerHeight <= 600 ? 64 : 0;
        const h = box.h - top - (showReasons ? reasonsH + 10 : message);
        const ids = view.cards.map((card) => card.id);
        layout = grouped ? groupLayout(ids.filter((id) => id !== view.odd), view.odd, box.w, h, top) : shelfLayout(ids, box.w, h, top);
    }
    // Kartice klize samo kad se promeni igra (grupa se okupi, stigne „Zašto?”), ne kad se promeni
    // veličina ekrana (okretanje telefona) — tada odmah stoje na novom mestu
    const animate = !calm && glide;
    const move = animate ? "transform 560ms cubic-bezier(0.3, 0.8, 0.3, 1), width 560ms cubic-bezier(0.3, 0.8, 0.3, 1), height 560ms cubic-bezier(0.3, 0.8, 0.3, 1)" : undefined;

    return (
        <div ref={rootRef} className="relative min-h-0 w-full flex-1 self-stretch">
            <style>{HOP_STYLES}</style>
            {focus && (
                <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
                    <LegendChip key={`${view.round}`} id={focus} lead={view.prompt === "focusNext" ? "Sada gledaj:" : "Gledaj:"} className="animate-pop bg-surface py-1 shadow-soft" />
                </div>
            )}
            {layout && (
                <>
                    {layout.shelves.map((shelf, i) => {
                        const thick = Math.max(10, layout.s * 0.11);
                        return (
                            <span key={`shelf-${i}`} aria-hidden="true" className="absolute animate-fade" style={{ left: shelf.x, top: shelf.y, width: shelf.w, height: thick * 2 }}>
                                {/* Nosači ispod daske */}
                                <span className="absolute top-[40%] h-[60%] w-[6%] rounded-b-lg bg-[#c79562]" style={{ left: "9%" }} />
                                <span className="absolute top-[40%] h-[60%] w-[6%] rounded-b-lg bg-[#c79562]" style={{ right: "9%" }} />
                                <span className="absolute inset-x-0 top-0 h-1/2 rounded-full border-b-4 border-[#b98552] bg-[#e2b47c] shadow-soft" />
                            </span>
                        );
                    })}
                    {layout.group && (
                        <div
                            aria-hidden="true"
                            className="absolute animate-fade rounded-[1.4rem] border-[3px] border-dashed border-mulberry-300 bg-white/55"
                            style={{ left: layout.group.x, top: layout.group.y, width: layout.group.w, height: layout.group.h, transition: animate ? "all 560ms cubic-bezier(0.3, 0.8, 0.3, 1)" : undefined }}
                        />
                    )}
                    {/* Natpis grupe stoji iznad kartica (na niskom polju kartice su blizu ivice okvira) */}
                    {layout.group && (
                        <span
                            key={asking ? "why" : "label"}
                            className={cn(
                                "absolute z-10 -translate-x-1/2 -translate-y-1/2 animate-pop truncate rounded-full px-3 py-1 text-sm font-extrabold shadow-soft sm:text-base",
                                asking ? "bg-surface text-mulberry-700 ring-2 ring-mulberry-300" : "bg-mulberry-600 text-white"
                            )}
                            style={{ left: layout.group.x + layout.group.w / 2, top: layout.group.y, maxWidth: layout.group.w + 32 }}
                        >
                            {asking ? "Zašto?" : groupLabel(view)}
                        </span>
                    )}
                    <div role="group" aria-label="Slike" className={cn(disabled && "pointer-events-none")}>
                        {view.cards.map((card) => {
                            const spot = layout.spots[card.id];
                            if (!spot) return null;
                            const odd = card.id === view.odd;
                            const state = cardState(view, card.id);
                            const out = odd && grouped;
                            return (
                                <div
                                    key={card.id}
                                    className="absolute left-0 top-0"
                                    style={{ width: layout.s, height: layout.s, transform: `translate(${spot.x}px, ${spot.y}px)`, transition: move, zIndex: out ? 3 : 2 }}
                                >
                                    <div className={cn("h-full w-full", out ? (calm ? "rotate-3" : "odd-hop") : "animate-pop")}>
                                        <ChoiceCard
                                            data-action={`choice:${card.id}`}
                                            state={state}
                                            disabled={disabled || grouped || state === "dimmed"}
                                            onClick={() => onPick(card.id)}
                                            aria-label={`${cardName(card)}${STATE_WORD[state] ?? ""}`}
                                            className="h-full min-h-0 flex-col gap-0 overflow-visible p-1 sm:p-1.5"
                                        >
                                            <CardFace card={card} s={layout.s} />
                                            {demo && odd && <DemoHand />}
                                        </ChoiceCard>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
            {showReasons && (
                <div
                    role="group"
                    aria-label="Zašto ne pripada?"
                    className={cn("absolute inset-x-0 bottom-0 flex animate-fade-up items-stretch justify-center gap-2 sm:gap-3", disabled && "pointer-events-none")}
                    style={{ height: reasonsH }}
                >
                    {view.reasons.map((id) => {
                        const state = reasonState(view, id);
                        // Nisko polje (položen telefon): sličica levo od reči, da ostane krupna
                        const flat = reasonsH < 90;
                        return (
                            <ChoiceCard
                                key={id}
                                data-action={`reason:${id}`}
                                state={state}
                                disabled={disabled || view.ask !== "why" || state === "dimmed"}
                                onClick={() => onReason(id)}
                                aria-label={`${REASONS[id].label}${STATE_WORD[state] ?? ""}`}
                                className={cn("h-full min-h-0 w-auto max-w-48 flex-1 gap-1 p-1.5 sm:p-2", flat ? "flex-row gap-2" : "flex-col")}
                            >
                                <ReasonIcon id={id} className={cn("pointer-events-none min-h-0", flat ? "aspect-square h-full w-auto shrink-0" : "w-auto flex-1")} />
                                <span className="text-sm leading-tight sm:text-lg">{REASONS[id].label}</span>
                            </ChoiceCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Kartica ───────────────────────────────────────────────────────────────────

const ART_SIZE = { small: 46, mid: 78, big: 96 } as const;

function CardFace({ card, s }: { card: OddCard; s: number }) {
    const labelled = card.look === "pic" && s >= 96;
    let art: ReactNode = null;
    // Slike sa natpisom su malo krupnije (natpis već uzima deo kartice)
    const pct = card.look === "pic" && card.size === "mid" ? 88 : (ART_SIZE[card.size] ?? ART_SIZE.mid);
    if (card.look === "shape" && card.shape && card.color) {
        art = <ShapeArt shape={card.shape} color={card.color} className="aspect-square max-h-full max-w-full" />;
    } else if (card.look === "pic" && card.pic) {
        art = <ThingArt id={card.pic} className="aspect-square max-h-full max-w-full" />;
    } else if (card.look === "count" && card.pic && card.count) {
        art = <CountArt pic={card.pic} count={card.count} className="aspect-square h-full max-w-full" />;
    } else if (card.look === "number" && card.num !== undefined && card.color) {
        return <NumberFace num={card.num} color={card.color} s={s} />;
    }
    return (
        <span className="pointer-events-none flex h-full w-full min-h-0 flex-col items-center justify-center">
            <span className="flex min-h-0 w-full flex-1 items-center justify-center">
                <span className="flex items-center justify-center" style={{ height: `${card.look === "count" ? 100 : pct}%`, width: `${card.look === "count" ? 100 : pct}%` }}>
                    {art}
                </span>
            </span>
            {labelled && (
                <span className="max-w-full truncate px-0.5 font-extrabold leading-tight text-ink-soft" style={{ fontSize: clamp(s * 0.095, 11, 17) }}>
                    {cardName(card)}
                </span>
            )}
        </span>
    );
}

/** Broj sa tačkicama u parovima (par po par — neparan broj ima jednu tačku bez para) */
function NumberFace({ num, color, s }: { num: number; color: OddCard["color"] & string; s: number }) {
    const tone = SHAPE_COLORS[color];
    const columns = Math.ceil(num / 2);
    const dot = clamp(s * 0.06, 5, 12);
    return (
        <span className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-[6%]">
            <span className="font-display font-extrabold leading-none" style={{ fontSize: s * 0.42, color: tone.edge }}>
                {num}
            </span>
            <span className="flex items-start gap-[3px]" aria-hidden="true">
                {Array.from({ length: columns }, (_, column) => (
                    <span key={column} className="flex flex-col gap-[3px]">
                        {Array.from({ length: Math.min(2, num - column * 2) }, (_, row) => (
                            <span key={row} className="rounded-full" style={{ width: dot, height: dot, background: tone.fill, boxShadow: `inset 0 0 0 1.5px ${tone.edge}` }} />
                        ))}
                    </span>
                ))}
            </span>
        </span>
    );
}
