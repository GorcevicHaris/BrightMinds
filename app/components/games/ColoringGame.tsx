"use client";

// Bojanka — dete bira boju i dodirom boji deo slike (dodir je jedini potreban pokret).
// Podrška se povlači od nivoa do nivoa (videti data/coloringLevels.ts): prvo se boji po primeru
// u boji, uz označen deo i boju; zatim primer bez oznaka, pa primer samo na zahtev; zatim po
// brojevima i „druga polovina” (simetrična slika čija je leva polovina obojena); na težim
// nivoima samo po izgovorenom uputstvu; poslednji nivo je slobodno bojenje.

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    DEMO_MS,
    demoRounds,
    DemoHand,
    Feedback,
    finiteOr,
    GameHud,
    GamePrompt,
    GameStage,
    hintDue,
    playSfx,
    PULSE_ONCE,
    useDemo,
    useGameSync,
    useInputGuard,
    useSayThen,
    useTimers,
    useWaitHint,
    usePraise,
    useGameRandom,
} from "@/app/components/games/kit";
import type { BaseView, FeedbackKind, GameProps, TimerId } from "@/app/components/games/kit";
import { buildColoringPlan, colorNumber, mirrorPartner, type ColoringPlan, type ColoringTask } from "@/app/components/games/data/coloringLevels";
import { COLOR_BY_ID, colorSentence, PAPER, VERB, type PaintColor, type Picture, type Zone } from "@/app/components/games/data/coloringPictures";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const ERASER = "eraser";
const OUTLINE = "#2B2647";
const HIGHLIGHT = "#6C61F0";

// ── Stanje ────────────────────────────────────────────────────────────────────

type Fills = Record<string, string>;
/** correct: tačno obojeno · zone/color: pogrešan deo ili boja (po uputstvu) · mismatch: boja nije kao na primeru · pick: prvo boja · side: ta polovina je već obojena */
type ColoringFeedback = "correct" | "zone" | "color" | "mismatch" | "pick" | "side" | null;

/**
 * Po primeru: `correctCount` = delovi obojeni kao na primeru iz prvog pokušaja (bez pomoći),
 * `incorrectCount` = boje koje nisu kao na primeru (ista pogrešna boja na istom delu broji se jednom).
 * Po uputstvu: `correctCount` = zadaci rešeni samostalno iz prvog pokušaja, `incorrectCount` = pogrešni pokušaji.
 * Slobodno bojenje: `correctCount` = obojeni delovi, a na "Gotovo" svi delovi — svaka slika je tačna.
 */
export interface ColoringView extends BaseView {
    /** Slika nivoa (monitor je crta po ovom id-ju) */
    pictureId: string;
    /** id dela → id boje (i delovi obojeni od početka) */
    fills: Fills;
    /** Izabrana boja (id), "eraser" ili null dok dete još nije izabralo */
    color: string | null;
    /** Ponuđene boje (id-jevi, redom palete) */
    options: string[];
    /** Po primeru: deo koji se predlaže (označen na nižim nivoima i kao pomoć) */
    suggest: string | null;
    /** Po primeru: delovi koji su već bili obojeni kao na primeru (svaki se boduje jednom) */
    resolved: string[];
    /** Po primeru: pogrešni pokušaji od poslednjeg tačno obojenog dela ("deo:boja") */
    tries: string[];
    /** Po uputstvu: boje probane pogrešno u tekućem zadatku (ostaju zatamnjene) */
    wrongColors: string[];
    /** Po uputstvu: delovi probani pogrešno u tekućem zadatku (ostaju zatamnjeni) */
    wrongZones: string[];
    /** Traženi (predloženi) deo i boja su blago istaknuti — pomoć posle grešaka ili čekanja */
    hint: boolean;
    /** Zadaci rešeni tek pošto su deo i boja istaknuti */
    promptedCount: number;
    /** Primer je otvoren (nivoi gde se primer vidi samo na zahtev) */
    peek: boolean;
    feedback: ColoringFeedback;
    done: boolean;
}

function zonesMatching(plan: ColoringPlan, fills: Fills): number {
    return plan.zones.filter((zone) => fills[zone.id] === zone.c).length;
}

/** Prvi deo (redom predloga) koji još nije obojen kao na primeru */
function nextSuggestion(plan: ColoringPlan, fills: Fills): string | null {
    return plan.zones.find((zone) => fills[zone.id] !== zone.c)?.id ?? null;
}

function initialView(plan: ColoringPlan): ColoringView {
    const { mode } = plan.level;
    const fills: Fills = { ...plan.prefilled };
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: mode === "verbal" ? plan.tasks.length : plan.zones.length,
        pictureId: plan.picture.id,
        fills,
        color: mode === "free" ? plan.palette[0] : null,
        options: mode === "verbal" ? (plan.tasks[0]?.options ?? []) : plan.palette,
        suggest: mode === "copy" || mode === "number" || mode === "mirror" ? nextSuggestion(plan, fills) : null,
        resolved: [],
        tries: [],
        wrongColors: [],
        wrongZones: [],
        hint: false,
        promptedCount: 0,
        peek: false,
        feedback: null,
        done: false,
    };
}

function countColored(picture: Picture, fills: Fills): number {
    return picture.zones.filter((zone) => fills[zone.id]).length;
}

/** Slobodno bojenje: brojači se uvek računaju iz obojenih delova. */
function withFreeFills(view: ColoringView, picture: Picture, fills: Fills): ColoringView {
    const colored = countColored(picture, fills);
    return {
        ...view,
        fills,
        correctCount: colored,
        score: colored * 10,
        round: Math.min(colored + 1, picture.zones.length),
    };
}

function strings(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

const FEEDBACKS: ColoringFeedback[] = ["correct", "zone", "color", "mismatch", "pick", "side"];

/** Monitor dobija delimično (ili prazno) stanje — sve što fali ili je pogrešnog tipa menja podrazumevana vrednost. */
function mergeMonitor(base: ColoringView, incoming: Partial<ColoringView> | null | undefined): ColoringView {
    if (!incoming) return base;
    const fills: Fills = {};
    if (incoming.fills && typeof incoming.fills === "object") {
        for (const [zone, color] of Object.entries(incoming.fills)) {
            if (typeof color === "string") fills[zone] = color;
        }
    }
    const options = strings(incoming.options).filter((id) => COLOR_BY_ID[id] !== undefined);
    return {
        score: finiteOr(incoming.score, base.score),
        correctCount: finiteOr(incoming.correctCount, base.correctCount),
        incorrectCount: finiteOr(incoming.incorrectCount, base.incorrectCount),
        round: finiteOr(incoming.round, base.round),
        totalRounds: finiteOr(incoming.totalRounds, base.totalRounds),
        pictureId: base.pictureId,
        fills,
        color: typeof incoming.color === "string" ? incoming.color : base.color,
        options: options.length > 0 ? options : base.options,
        suggest: typeof incoming.suggest === "string" ? incoming.suggest : null,
        resolved: strings(incoming.resolved),
        tries: strings(incoming.tries),
        wrongColors: strings(incoming.wrongColors),
        wrongZones: strings(incoming.wrongZones),
        hint: incoming.hint === true,
        promptedCount: finiteOr(incoming.promptedCount, base.promptedCount),
        peek: incoming.peek === true,
        feedback: FEEDBACKS.includes(incoming.feedback ?? null) ? (incoming.feedback ?? null) : null,
        done: incoming.done === true,
    };
}

// ── Tekstovi ──────────────────────────────────────────────────────────────────
// Kratko, doslovno i mirno: jedna rečenica po poruci, bez pohvala ličnosti i bez roda.
// Glas imenuje deo i boju, a nikad ne kaže gde treba dodirnuti.

const TEXT_PICK = "Izaberi boju.";
const TEXT_WRONG_FIRST = "Nije to. Probaj opet.";
const TEXT_DONE = "Slika je gotova.";
const TEXT_ALL_COLORED = "Sve je obojeno. Baš je lepo!";
const TEXT_FREE_STEPS = "Izaberi boju i oboji sliku.";
const TEXT_COPY = "Oboji sliku kao na primeru.";
const TEXT_COPY_REQUEST = "Pogledaj primer, pa oboji sliku isto.";
const TEXT_OTHER_COLOR = "Na primeru je druga boja.";
const TEXT_NUMBERS = "Svaki broj je jedna boja. Oboji sliku po brojevima.";
const TEXT_LOOK_NUMBER = "Pogledaj broj i nađi tu boju.";
const TEXT_MIRROR = "Jedna polovina je obojena. Oboji drugu polovinu isto, kao u ogledalu.";
const TEXT_MIRROR_OTHER = "Na drugoj strani je druga boja.";
const TEXT_SIDE = "Ova polovina je već obojena.";

/** "Na drugoj strani je krilo crveno." */
function mirrorSentence(zone: Zone): string {
    const color = COLOR_BY_ID[zone.c];
    return color ? `Na drugoj strani ${VERB[zone.g]} ${zone.name} ${color.adj[zone.g]}.` : TEXT_MIRROR_OTHER;
}

/** Pokazni deo: "Na obe strane je krilo crveno." */
function bothSidesSentence(zone: Zone): string {
    const color = COLOR_BY_ID[zone.c];
    return color ? `Na obe strane ${VERB[zone.g]} ${zone.name} ${color.adj[zone.g]}.` : TEXT_DONE;
}

/** "Broj 2 je plava boja." */
function numberSentence(plan: ColoringPlan, zone: Zone): string {
    const color = COLOR_BY_ID[zone.c];
    const number = colorNumber(plan, zone.c);
    return color && number ? `Broj ${number} je ${color.nom} boja.` : TEXT_LOOK_NUMBER;
}

/** "Na primeru je krov crven." */
function modelSentence(zone: Zone): string {
    const color = COLOR_BY_ID[zone.c];
    return color ? `Na primeru ${VERB[zone.g]} ${zone.name} ${color.adj[zone.g]}.` : TEXT_OTHER_COLOR;
}

/** Tačno: imenuje se obojeni deo. Prva greška: poziv na novi pokušaj. Svaka sledeća: ponavlja se šta tražimo. */
function feedbackText(view: ColoringView, plan: ColoringPlan, task: ColoringTask | undefined, lastZone: Zone | undefined): string {
    if (view.feedback === "pick") return TEXT_PICK;
    if (view.feedback === "side") return TEXT_SIDE;
    if (plan.level.mode === "copy" || plan.level.mode === "number" || plan.level.mode === "mirror") {
        if (view.feedback === "correct" && lastZone) {
            // Pokazni deo druge polovine: natpis je isti kao rečenica koju drugar kaže
            if (plan.level.mode === "mirror" && plan.level.demo && view.resolved.length === 1 && view.resolved[0] === lastZone.id) return bothSidesSentence(lastZone);
            const color = COLOR_BY_ID[lastZone.c];
            return color ? colorSentence(lastZone, color) : TEXT_DONE;
        }
        if (view.feedback === "mismatch" && lastZone) {
            if (plan.level.mode === "number") return view.tries.length < 2 ? TEXT_LOOK_NUMBER : numberSentence(plan, lastZone);
            if (plan.level.mode === "mirror") return view.tries.length < 2 ? TEXT_MIRROR_OTHER : mirrorSentence(lastZone);
            return view.tries.length < 2 ? TEXT_OTHER_COLOR : modelSentence(lastZone);
        }
        return TEXT_DONE;
    }
    const zone = task ? plan.picture.zones.find((z) => z.id === task.zone) : undefined;
    const color = task ? COLOR_BY_ID[task.color] : undefined;
    if (!zone || !color || view.done) return TEXT_DONE;
    if (view.feedback === "correct") return colorSentence(zone, color);
    if (view.wrongColors.length + view.wrongZones.length < 2) return TEXT_WRONG_FIRST;
    return view.feedback === "color" ? `Tražimo ${color.acc} boju.` : `Tražimo ${zone.acc}.`;
}

// ── Nizak ekran (položen telefon) ────────────────────────────────────────────
// Na položenom telefonu i niskom laptopu (`flat`, npr. 844 × 390, 1000 × 560) slika, natpis i paleta se zbijaju, da bojenje stane
// bez pomeranja: manji razmaci, niže pločice boja (i dalje ≥ 48 px, cela pločica je dugme), bez
// naziva boja ispod pločica (naziv se čuje pri dodiru). Klase sa `!` jer pobeđuju sm:/short: veličine.

const SHORT = {
    stage: "flat:pb-0",
    card: "flat:p-2!",
    captionRow: "flat:mb-1!",
    caption: "flat:text-lg! flat:min-h-6",
    palette: "flat:gap-2 flat:p-2!",
    hide: "flat:hidden!",
    swatch: "flat:h-12!",
    tool: "flat:min-h-12 flat:flex-row flat:gap-2",
    art: "[@media(max-height:30rem)]:max-h-[calc(100dvh-13.25rem)]! [@media(orientation:landscape)_and_(min-height:30.01rem)_and_(max-height:37.5rem)]:max-h-[calc(100dvh-17rem)]!",
};

// ── Pokazivanje ───────────────────────────────────────────────────────────────

/** Uz `animate-fade` (SVG nema senku): oznaka se jednom polako pojavi i nestane */
const FADE_IN_OUT: CSSProperties = {
    animationDuration: `${DEMO_MS / 2}ms`,
    animationIterationCount: 2,
    animationDirection: "alternate",
    animationTimingFunction: "ease-in-out",
};

// ── Igra ──────────────────────────────────────────────────────────────────────

const GAME = getGame("coloring");
/** Gotova slika ostaje na ekranu bar ovoliko pre rezultata — dete stigne da je pogleda */
const FINISH_MIN_MS = 2600;
/** Poruka „Tražimo svetlozelenu boju.” stoji dovoljno dugo da se pročita */
const FEEDBACK_MS = 2600;
const SPEAK_DELAY_MS = 600;

/** Broj kolona palete na telefonu prema broju ponuđenih boja (od ≥sm boje stoje u bočnoj koloni) */
const PALETTE_COLS: Record<number, string> = {
    1: "grid-cols-2",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    7: "grid-cols-4",
    8: "grid-cols-4",
};

/*
 * Rezultat (correct / total / prompted):
 *  • Po primeru (nivoi 1–8): total = delovi koje dete boji (bez pokaznog prvog dela na nivou 1),
 *    correct = delovi obojeni kao na primeru iz prvog pokušaja, prompted = delovi obojeni tek pošto
 *    su deo i boja istaknuti kao pomoć. Stalne oznake nižih nivoa su deo nivoa, a ne pomoć.
 *  • Po uputstvu (nivoi 9–14): total = broj zadataka, correct = rešeni samostalno iz prvog pokušaja,
 *    prompted = rešeni tek pošto su traženi deo i boja istaknuti.
 *  • Druga polovina (nivoi 10–11): kao po primeru, ali primer je leva polovina slike; pogrešna boja
 *    se ne nanosi. Prvi deo na 10. nivou oboji drugar (pokazni deo, ne ocenjuje se).
 *  • Slobodno bojenje (nivo 15): svaka slika je tačna — total = delovi slike, correct = total.
 *    "Gotovo" se otključava kad je obojena bar polovina slike.
 * Nivo se ne može "pasti": dete uvek stigne do kraja, a završen nivo donosi bar jednu zvezdicu.
 */
export default function ColoringGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<ColoringView>) {
    const settings = useChildSettings();
    // Monitor nema podešavanja deteta: crta sliku koju je igra izabrala, sa svim delovima
    const monitorPicture = isMonitor && typeof monitorState?.pictureId === "string" ? monitorState.pictureId : undefined;
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [ownPlan] = useState<ColoringPlan>(() =>
        buildColoringPlan(level, isMonitor ? null : { rounds: settings.preset.maxRounds, choices: settings.choiceLimit }, undefined, random)
    );
    const monitorPlan = useMemo(() => (isMonitor ? buildColoringPlan(level, null, monitorPicture) : null), [isMonitor, level, monitorPicture]);
    const plan = monitorPlan ?? ownPlan;
    const { picture } = plan;
    const mode = plan.level.mode;
    const accent = GAME.accent;

    const { say } = useSpeech(gender);
    const sync = useGameSync<ColoringView>({ childId, gameId: "coloring", level, isMonitor });
    const { after, cancel } = useTimers();
    const guard = useInputGuard();
    const sayThen = useSayThen(say, after);
    const demo = useDemo(!isMonitor);
    const showDemo = demo.show;
    const praise = usePraise();

    const [view, setView] = useState<ColoringView>(() => initialView(plan));
    const [history, setHistory] = useState<Fills[]>([]);
    /** Poslednji obojeni deo (natpis iznad slike i poruka posle bojenja) */
    const [lastZoneId, setLastZoneId] = useState<string | null>(null);

    const viewRef = useRef(view);
    const startedRef = useRef(false);
    const mirrorDemoPending = useRef(!isMonitor && mode === "mirror" && Boolean(plan.level.demo) && plan.zones.length > 1);
    const finishedRef = useRef(false);
    const lockedRef = useRef(false);
    const announcedRef = useRef(false);
    const feedbackTimerRef = useRef<TimerId | null>(null);

    const shown = isMonitor ? mergeMonitor(initialView(plan), monitorState) : view;
    const zoneById = (id: string | null | undefined) => (id ? picture.zones.find((zone) => zone.id === id) : undefined);

    const task = mode === "verbal" && plan.tasks.length > 0 ? plan.tasks[Math.min(Math.max(shown.round, 1), plan.tasks.length) - 1] : undefined;
    const taskZone = zoneById(task?.zone);
    const taskColor = task ? COLOR_BY_ID[task.color] : undefined;
    /** Po primeru, po brojevima i druga polovina: boji se slobodnim redom, a jedan deo se predlaže */
    const copyLike = mode === "copy" || mode === "number" || mode === "mirror";
    const suggestZone = copyLike ? zoneById(shown.suggest) : undefined;
    const suggestColor = suggestZone ? COLOR_BY_ID[suggestZone.c] : undefined;
    const lastZone = zoneById(lastZoneId);

    const modelOnRequest = plan.level.model === "request";
    let instruction: string;
    if (mode === "verbal") instruction = taskZone && taskColor ? `Oboji ${taskZone.acc} ${taskColor.inst} bojom` : `Oboji ${picture.acc}`;
    else if (mode === "copy") instruction = "Oboji kao na primeru";
    else if (mode === "number") instruction = "Oboji po brojevima";
    else if (mode === "mirror") instruction = "Oboji drugu polovinu isto";
    else instruction = `Oboji ${picture.acc} kako želiš`;
    /** Ono što se izgovara na početku i na dugme „Ponovi” */
    const prompt =
        mode === "verbal"
            ? `${instruction}.`
            : mode === "copy"
              ? modelOnRequest
                  ? TEXT_COPY_REQUEST
                  : TEXT_COPY
              : mode === "number"
                ? TEXT_NUMBERS
                : mode === "mirror"
                  ? TEXT_MIRROR
                  : `${instruction}. ${TEXT_FREE_STEPS}`;
    /** Jedan korak po korak: prvo boja, pa deo slike */
    const step =
        mode === "verbal" && taskZone && taskColor
            ? shown.color
                ? `Oboji ${taskZone.acc}.`
                : `Izaberi ${taskColor.acc} boju.`
            : TEXT_FREE_STEPS;

    const swatches = shown.options.flatMap((id) => COLOR_BY_ID[id] ?? []);
    const colored = countColored(picture, shown.fills);
    const allColored = colored === picture.zones.length;
    const neededForDone = Math.ceil(picture.zones.length / 2);
    const interactive = !isMonitor && !shown.done;
    // Poeni su broj: mlađoj deci se ne prikazuju (roditelj ih na monitoru vidi)
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    /** Na ranim nivoima isticanje stiže već posle prve greške (osim kad ga je roditelj isključio) */
    const hintAfter = plan.level.earlyHint && settings.hintAfter > 0 ? 1 : settings.hintAfter;
    // Pokazni deo: na prvom nivou ga pokazuje ruka (po primeru), na prvom nivou „druga polovina” ga oboji drugar
    const demoCount = mode === "copy" ? demoRounds(level, plan.zones.length) : mode === "mirror" && plan.level.demo && plan.zones.length > 1 ? 1 : 0;
    /** Druga polovina, pokazni deo: prvo se istakne odraz („look”), pa se izabere boja i ruka je na delu („pick”) */
    const [mirrorDemo, setMirrorDemo] = useState<"look" | "pick" | null>(null);
    const mirrorDemoStarted = useRef(false);

    // ── Pomoćne funkcije ──────────────────────────────────────────────────────

    const commit = (next: ColoringView, log?: string) => {
        viewRef.current = next;
        setView(next);
        sync.update(next, log);
    };

    const cancelFeedbackTimer = () => {
        cancel(feedbackTimerRef.current);
        feedbackTimerRef.current = null;
    };

    const clearFeedbackSoon = () => {
        cancelFeedbackTimer();
        feedbackTimerRef.current = after(FEEDBACK_MS, () => {
            feedbackTimerRef.current = null;
            const current = viewRef.current;
            if (current.done || !current.feedback) return;
            commit({ ...current, feedback: null });
        });
    };

    // ── Početak ───────────────────────────────────────────────────────────────

    useEffect(() => {
        if (isMonitor || startedRef.current) return;
        startedRef.current = true;
        guard.hold();
        sync.start(viewRef.current);
    }, [isMonitor, sync, guard]);

    // Uputstvo se izgovara na početku nivoa i svaki put kada stigne novi zadatak.
    const runMirrorDemo = useRef<() => void>(() => {});
    useEffect(() => {
        if (isMonitor) return;
        // Traženi deo zasvetli u trenutku kad se izgovori, a ne pre toga
        const id = setTimeout(() => {
            showDemo();
            // Druga polovina (prvi put): kad se uputstvo izgovori, drugar oboji prvi deo
            if (mirrorDemoPending.current) sayThen(prompt, () => runMirrorDemo.current(), { min: 1800, max: 7000 });
            else say(prompt);
        }, SPEAK_DELAY_MS);
        return () => clearTimeout(id);
    }, [isMonitor, say, sayThen, prompt, showDemo]);

    // ── Potezi ────────────────────────────────────────────────────────────────

    /** `lead` je rečenica o poslednjem obojenom delu („Krov je crven.”), izgovara se pre „Slika je gotova.” */
    const finish = (current: ColoringView, lead?: string) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        lockedRef.current = true;
        cancelFeedbackTimer();

        const final: ColoringView =
            mode === "free"
                ? // Slobodno bojenje nema pogrešnog ishoda: svaka slika se računa kao potpuno tačna
                  { ...current, correctCount: current.totalRounds, feedback: "correct", peek: false, done: true }
                : { ...current, hint: false, feedback: "correct", peek: false, done: true };
        commit(final, `Slika je gotova: ${picture.name.toLowerCase()}`);
        // Zvuk kraja nivoa pušta strana koja prikazuje rezultat — ovde samo potvrda
        playSfx("correct");
        sayThen(
            lead ? `${lead} ${TEXT_DONE}` : TEXT_DONE,
            () => {
                sync.complete(final);
                onComplete({
                    score: final.score,
                    durationSec: sync.elapsedSec(),
                    correct: final.correctCount,
                    total: Math.max(final.totalRounds - demoCount, 1),
                    prompted: final.promptedCount,
                });
            },
            { min: FINISH_MIN_MS, max: FINISH_MIN_MS + 3500, emotion: "happy" }
        );
    };

    const pickColor = (id: string) => {
        // Dok se potvrđuje tačan deo, paleta miruje: izbor bi važio za stari zadatak i presekao rečenicu
        if (!interactive || lockedRef.current) return;
        const current = viewRef.current;
        const color = COLOR_BY_ID[id];
        // Boja se uvek i izgovori: naziv ne zavisi od toga da li dete razlikuje nijanse.
        // Kad je to tražena (ili istaknuta) boja, glas odmah kaže i drugi korak — mlađa deca teško
        // pamte uputstvo u dva koraka.
        const nextZone = mode === "verbal" ? (task && id === task.color ? taskZone : undefined) : copyLike && (plan.level.showZone || current.hint) && suggestZone?.c === id ? suggestZone : undefined;
        const number = mode === "number" ? colorNumber(plan, id) : 0;
        if (color && nextZone) say(`${color.nom} boja. Sada oboji ${nextZone.acc}.`);
        else if (color && number) say(`Broj ${number}, ${color.nom} boja.`);
        else if (color) say(`${color.nom} boja.`);
        if (current.color === id) return;
        playSfx("tap");
        commit(
            { ...current, color: id, feedback: current.feedback === "pick" ? null : current.feedback },
            color ? `Izabrana boja: ${color.nom}` : "Izabrana gumica"
        );
    };

    const paintFree = (zone: Zone) => {
        const current = viewRef.current;
        const selected = current.color;
        if (!selected) return;

        if (selected === ERASER) {
            if (!current.fills[zone.id]) return;
            const fills = { ...current.fills };
            delete fills[zone.id];
            setHistory((prev) => [...prev.slice(-29), current.fills]);
            playSfx("tap");
            commit(withFreeFills(current, picture, fills), `Obrisano: ${zone.name}`);
            setLastZoneId(null);
            return;
        }

        const color = COLOR_BY_ID[selected];
        if (!color || current.fills[zone.id] === selected) return;
        const next = withFreeFills(current, picture, { ...current.fills, [zone.id]: selected });
        setHistory((prev) => [...prev.slice(-29), current.fills]);
        playSfx("flip");
        commit(next, `Obojeno: ${colorSentence(zone, color)}`);
        setLastZoneId(zone.id);

        if (next.correctCount === picture.zones.length && !announcedRef.current) {
            announcedRef.current = true;
            say(TEXT_ALL_COLORED, undefined, "happy");
        }
    };

    /**
     * Po primeru: boja se nanosi uvek (to je bojenje); ako nije kao na primeru, dete mirno čuje šta je na primeru i može da preboji.
     * Druga polovina: boji se samo desna polovina, a pogrešna boja se ne nanosi (deo ostaje beo). `shown` = pokazni deo (boji drugar).
     */
    const paintCopy = (zone: Zone, shownByCompanion = false) => {
        const current = viewRef.current;
        const mirrored = mode === "mirror";
        if (mirrored && !plan.zones.some((z) => z.id === zone.id)) {
            // Leva polovina (ili deo koji je već obojen od početka): ništa se ne menja, to nije greška
            commit({ ...current, feedback: "side" });
            clearFeedbackSoon();
            say(TEXT_SIDE);
            return;
        }
        const picked = current.color ? COLOR_BY_ID[current.color] : undefined;
        if (!picked) {
            commit({ ...current, feedback: "pick" });
            clearFeedbackSoon();
            say(TEXT_PICK);
            return;
        }
        if (current.fills[zone.id] === picked.id) return;

        const matches = picked.id === zone.c;
        // Druga polovina: pogrešna boja se ne nanosi
        const fills = mirrored && !matches ? current.fills : { ...current.fills, [zone.id]: picked.id };
        if (fills !== current.fills) setHistory((prev) => [...prev.slice(-29), current.fills]);
        setLastZoneId(zone.id);
        cancelFeedbackTimer();

        if (matches) {
            const isNew = !current.resolved.includes(zone.id) && plan.zones.some((z) => z.id === zone.id);
            // Prvi deo na prvom nivou pokazuje ruka: to je pokazivanje, ne zadatak (ne boduje se)
            const modeled = isNew && demoCount > 0 && current.resolved.length === 0;
            const firstTry = isNew && !modeled && current.tries.length === 0 && !current.hint;
            const prompted = isNew && !modeled && current.hint;
            const resolved = isNew ? [...current.resolved, zone.id] : current.resolved;
            const matched: ColoringView = {
                ...current,
                fills,
                resolved,
                round: Math.min(resolved.length + 1, current.totalRounds),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (prompted ? 1 : 0),
                score: current.score + (isNew ? (firstTry ? 10 : 5) : 0),
                tries: isNew ? [] : current.tries,
                hint: isNew ? false : current.hint,
                suggest: nextSuggestion(plan, fills),
                peek: false,
                feedback: "correct",
            };
            const how = !isNew ? "ponovo" : modeled ? "pokazni deo" : firstTry ? "iz prvog pokušaja" : prompted ? "uz pomoć" : "posle više pokušaja";
            const sentence = shownByCompanion ? bothSidesSentence(zone) : colorSentence(zone, picked);
            if (zonesMatching(plan, fills) === plan.zones.length) {
                viewRef.current = matched;
                sync.update(matched, `Kao na primeru (${how}): ${sentence}`);
                finish(matched, praise(sentence, firstTry));
                return;
            }
            commit(matched, `Kao na primeru (${how}): ${sentence}`);
            playSfx(shownByCompanion ? "flip" : "correct");
            say(isNew && !shownByCompanion ? praise(sentence, firstTry) : sentence, undefined, "happy");
            clearFeedbackSoon();
            // Dodir koji je ostao od prethodnog dela ne sme odmah da oboji sledeći
            guard.hold();
            return;
        }

        // Boja nije kao na primeru: deo ostaje obojen (dete ga može prebojiti ili vratiti), greška se broji jednom
        const key = `${zone.id}:${picked.id}`;
        const repeated = current.tries.includes(key);
        const tries = repeated ? current.tries : [...current.tries, key];
        const hint = current.hint || hintDue(hintAfter, tries.length, Math.max(1, current.options.length - 1));
        const missed: ColoringView = {
            ...current,
            fills,
            tries,
            hint,
            suggest: plan.zones.some((z) => z.id === zone.id) ? zone.id : nextSuggestion(plan, fills),
            incorrectCount: current.incorrectCount + (repeated ? 0 : 1),
            peek: false,
            feedback: "mismatch",
        };
        playSfx("wrong");
        commit(missed, `Nije kao na primeru: ${zone.name} (${picked.nom}, na primeru ${COLOR_BY_ID[zone.c]?.nom ?? "?"})${hint && !current.hint ? " (prikazana pomoć)" : ""}`);
        clearFeedbackSoon();
        say(mirrored ? (tries.length < 2 ? TEXT_MIRROR_OTHER : mirrorSentence(zone)) : tries.length < 2 ? TEXT_OTHER_COLOR : modelSentence(zone), undefined, "gentle");
        guard.hold();
    };

    /** Druga polovina, prvi put: drugar pokaže odraz, izabere njegovu boju i oboji prvi deo (dete gleda) */
    const mirrorDemoSteps = () => {
        const zone = plan.zones[0];
        if (!mirrorDemoPending.current || mirrorDemoStarted.current || finishedRef.current || !zone) return;
        mirrorDemoStarted.current = true;
        lockedRef.current = true;
        setMirrorDemo("look");
        after(1400, () => {
            const color = COLOR_BY_ID[zone.c];
            commit({ ...viewRef.current, color: zone.c }, `Pokazni deo: ${color?.nom ?? ""} boja`);
            playSfx("tap");
            setMirrorDemo("pick");
            after(1300, () => {
                setMirrorDemo(null);
                lockedRef.current = false;
                mirrorDemoPending.current = false;
                paintCopy(zone, true);
            });
        });
    };
    useEffect(() => {
        runMirrorDemo.current = mirrorDemoSteps;
    });

    const paintVerbal = (zone: Zone) => {
        if (lockedRef.current || !task || !taskZone) return;
        const current = viewRef.current;
        const picked = current.color ? COLOR_BY_ID[current.color] : undefined;

        if (!picked) {
            commit({ ...current, feedback: "pick" });
            clearFeedbackSoon();
            say(TEXT_PICK);
            return;
        }

        const rightZone = zone.id === task.zone;

        if (rightZone && picked.id === task.color) {
            lockedRef.current = true;
            cancelFeedbackTimer();
            const firstTry = current.wrongColors.length + current.wrongZones.length === 0 && !current.hint;
            const prompted = current.hint;
            const solved: ColoringView = {
                ...current,
                fills: { ...current.fills, [zone.id]: picked.id },
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (prompted ? 1 : 0),
                score: current.score + (firstTry ? 10 : 5),
                hint: false,
                feedback: "correct",
            };
            const how = firstTry ? "iz prvog pokušaja" : prompted ? "uz pomoć" : "posle više pokušaja";
            const log = `Tačno ${how}: ${colorSentence(zone, picked)}`;
            const upcoming = plan.tasks[current.round];

            if (!upcoming) {
                viewRef.current = solved;
                sync.update(solved, log);
                finish(solved, praise(feedbackText(solved, plan, task, lastZone), firstTry));
                return;
            }

            commit(solved, log);
            playSfx("correct");
            // Sledeći zadatak čeka da glas izgovori „Krov je crven.”
            sayThen(
                praise(feedbackText(solved, plan, task, lastZone), firstTry),
                () => {
                    const latest = viewRef.current;
                    // Dodir koji je ostao od prethodnog zadatka ne sme da odgovori na novi
                    guard.hold();
                    commit({
                        ...latest,
                        round: current.round + 1,
                        options: upcoming.options,
                        // Stara boja ostaje izabrana samo ako je baš ona tražena; inače bi uputstvo
                        // „Dodirni deo” važilo uz pogrešnu boju
                        color: latest.color === upcoming.color ? latest.color : null,
                        wrongColors: [],
                        wrongZones: [],
                        feedback: null,
                    });
                    lockedRef.current = false;
                },
                { emotion: "happy" }
            );
            return;
        }

        // Deo koji je već bio pogrešan ostaje zatamnjen: ponovljeni dodir se ne broji kao nova greška
        if (!rightZone && current.wrongZones.includes(zone.id)) return;

        const wrongColors = rightZone ? [...current.wrongColors, picked.id] : current.wrongColors;
        const wrongZones = rightZone ? current.wrongZones : [...current.wrongZones, zone.id];
        // Pomoć stiže posle zadatog broja grešaka, a najkasnije kad ostane samo tražena boja
        const hint = hintDue(hintAfter, wrongColors.length + wrongZones.length, Math.max(1, task.options.length - 1));
        const missed: ColoringView = {
            ...current,
            // Pogrešna boja se odlaže (i ostaje zatamnjena), pa je sledeći korak jasan: izaberi drugu boju
            color: rightZone ? null : current.color,
            wrongColors,
            wrongZones,
            hint,
            incorrectCount: current.incorrectCount + 1,
            feedback: rightZone ? "color" : "zone",
        };
        playSfx("wrong");
        commit(
            missed,
            `${rightZone ? `Pogrešna boja (${picked.nom}) — traži se ${taskColor?.nom}` : `Pogrešan deo (${zone.name}) — traži se ${taskZone.name}`}${
                hint && !current.hint ? " (prikazana pomoć)" : ""
            }`
        );
        clearFeedbackSoon();
        say(feedbackText(missed, plan, task, lastZone), undefined, "gentle");
        // Kratka pauza: nekoliko brzih dodira zaredom ne postaje nekoliko grešaka
        guard.hold();
    };

    const tapZone = (zone: Zone) => {
        if (!interactive || guard.blocked() || lockedRef.current) return;
        if (mode === "verbal") paintVerbal(zone);
        else if (copyLike) paintCopy(zone);
        else paintFree(zone);
    };

    const undo = () => {
        if (!interactive || lockedRef.current || history.length === 0) return;
        const previous = history[history.length - 1];
        setHistory(history.slice(0, -1));
        playSfx("tap");
        const current = viewRef.current;
        if (mode === "free") commit(withFreeFills(current, picture, previous), "Vraćen poslednji potez");
        else commit({ ...current, fills: previous, suggest: nextSuggestion(plan, previous), feedback: null }, "Vraćen poslednji potez");
        // Natpis iznad slike ne sme da opisuje boju koje više nema
        setLastZoneId(null);
    };

    const togglePeek = () => {
        if (!interactive) return;
        const current = viewRef.current;
        playSfx("tap");
        commit({ ...current, peek: !current.peek }, current.peek ? "Primer je sklonjen" : "Pogledan primer");
    };

    // Pomoć posle čekanja: predloženi (traženi) deo i boja blago zasvetle
    useWaitHint(!isMonitor && mode !== "free" && settings.waitHint, `${view.round}:${view.resolved.length}`, () => {
        const current = viewRef.current;
        if (lockedRef.current || current.done || current.hint || current.feedback === "correct") return;
        // Prvi deo prvog nivoa već pokazuje ruka
        if (demoCount > 0 && current.resolved.length === 0) return;
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        demo.show();
        say(prompt);
    };

    // ── Prikaz ────────────────────────────────────────────────────────────────

    const zoneProps = (zone: Zone) =>
        interactive
            ? {
                  role: "button",
                  tabIndex: 0,
                  onClick: () => tapZone(zone),
                  onKeyDown: (event: KeyboardEvent<SVGPathElement>) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      tapZone(zone);
                  },
              }
            : {};

    const playing = !shown.done;
    /** Deo koji je označen tačkastom linijom: stalno (niži nivoi) ili kao pomoć */
    const outlined = !playing
        ? undefined
        : mode === "verbal"
          ? plan.level.showZone || shown.hint
              ? taskZone
              : undefined
          : copyLike && (plan.level.showZone || shown.hint)
            ? suggestZone
            : undefined;
    /** Druga polovina: uz predloženi deo označen je i njegov odraz (i dok drugar pokazuje prvi deo) */
    const partnerId = mode === "mirror" && playing ? mirrorPartner(picture, mirrorDemo ? plan.zones[0]?.id : outlined?.id) : undefined;
    /** Boja koja je istaknuta u paleti */
    const hintedColor = !playing ? undefined : mode === "verbal" ? (shown.hint ? task?.color : undefined) : copyLike && (plan.level.showColor || shown.hint) ? suggestZone?.c : undefined;
    /** Po brojevima (najlakši nivo): kad je boja izabrana, označeni su svi još neobojeni delovi sa njenim brojem */
    const matchesOf = playing && mode === "number" && plan.level.showMatches && shown.color ? shown.color : null;
    /** Kratko pokazivanje traženog dela kad se izgovori uputstvo (po uputstvu) */
    const demoZone = playing && demo.on && mode === "verbal" && plan.level.pulseZone ? taskZone : undefined;
    /** Ruka (prvi deo prvog nivoa): prvo na boju, pa na deo */
    const handOn = !isMonitor && playing && mode === "copy" && demoCount > 0 && shown.resolved.length === 0 && shown.tries.length === 0 && suggestZone ? (shown.color === suggestZone.c ? "zone" : "color") : null;
    const feedbackKind: FeedbackKind = shown.feedback === null ? null : shown.feedback === "correct" ? "correct" : "wrong";
    const message = feedbackText(shown, plan, task, lastZone);
    const showModel = plan.level.model === "shown" || (modelOnRequest && (shown.peek || shown.done));
    const hasModel = plan.level.model !== "none";
    /** Visoka slika: primer stoji levo od nje, a ne iznad (tako je slika na telefonu najveća) */
    const [, , boxW, boxH] = picture.viewBox.split(/\s+/).map(Number);
    const tall = boxW / boxH < 0.8;
    const modelMark = playing && mode === "copy" && (plan.level.showZone || shown.hint) ? shown.suggest : null;

    /** Natpis iznad slike: šta se boji ili šta je upravo obojeno */
    let caption: ReactNode;
    if (mode === "verbal" && taskZone && taskColor) {
        caption = (
            <>
                {plan.level.showSwatch && (
                    <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border-2 border-white shadow-soft ring-1 ring-line sm:h-7 sm:w-7" style={{ background: taskColor.hex }} />
                )}
                <span>
                    Bojimo: {taskZone.name}
                    {plan.level.showSwatch && <span className="text-ink-soft"> ({taskColor.nom})</span>}
                </span>
            </>
        );
    } else {
        // Po primeru i po brojevima natpis potvrđuje samo deo obojen kako treba (pogrešnu boju ne imenuje kao gotovu)
        const lastColor = lastZone && (!copyLike || shown.fills[lastZone.id] === lastZone.c) ? COLOR_BY_ID[shown.fills[lastZone.id]] : undefined;
        const text = lastZone && lastColor ? colorSentence(lastZone, lastColor) : `${instruction}.`;
        caption = (
            <span key={text} className="animate-fade-up">
                {text}
            </span>
        );
    }

    const art = (
        <svg
            viewBox={picture.viewBox}
            role="group"
            aria-label={`Bojanka: ${picture.name}`}
            className={cn(
                // Slika staje u visinu ekrana zajedno sa paletom — bojenje bez skrolovanja
                "mx-auto block h-auto w-full touch-manipulation select-none",
                // Na telefonu ispod slike stoje boje: jedan red (do šest boja) ili dva reda
                mode === "verbal"
                    ? "max-h-[max(11rem,calc(100dvh-31rem))]"
                    : mode === "free"
                      ? // Slobodno bojenje: ispod slike su dva reda boja i alati
                        "max-h-[max(11rem,calc(100dvh-32.5rem))]"
                      : // Široka slika ima primer iznad sebe (viši red natpisa)
                        !tall && hasModel
                        ? swatches.length > 6
                            ? "max-h-[max(10rem,calc(100dvh-39rem))]"
                            : "max-h-[max(10rem,calc(100dvh-35.5rem))]"
                        : swatches.length > 6
                          ? "max-h-[max(11rem,calc(100dvh-33rem))]"
                          : "max-h-[max(11rem,calc(100dvh-29.5rem))]",
                // Tablet: boje su u koloni pored slike; iznad slike je uputstvo (po uputstvu, slobodno) ili ništa (po primeru)
                mode !== "verbal"
                    ? "sm:max-h-[max(13rem,calc(100dvh-31rem))] lg:max-h-[max(13rem,calc(100dvh-24rem))] short:sm:max-h-[max(13rem,calc(100dvh-27rem))] short:lg:max-h-[max(13rem,calc(100dvh-22rem))]"
                    : "sm:max-h-[max(13rem,calc(100dvh-32.5rem))] short:sm:max-h-[max(13rem,calc(100dvh-29rem))]",
                SHORT.art,
                shown.done && "animate-wiggle"
            )}
        >
            {picture.zones.map((zone) => {
                const paint = COLOR_BY_ID[shown.fills[zone.id]];
                return (
                    <Fragment key={zone.id}>
                        <path
                            d={zone.d}
                            fill={paint?.hex ?? PAPER}
                            stroke={OUTLINE}
                            strokeWidth={plan.level.showZone ? 4 : 3}
                            strokeLinejoin="round"
                            aria-label={paint ? colorSentence(zone, paint) : `${zone.name}: bez boje`}
                            className={cn("transition-[fill] duration-200", interactive && "cursor-pointer")}
                            {...zoneProps(zone)}
                        />
                        {/* Oznake i nevidljiva šira ivica (mali deo se lakše pogađa prstom) crtaju se
                            odmah iznad svog dela, pa ih delovi koji ga prekrivaju i dalje prekrivaju. */}
                        {playing && mode === "verbal" && shown.wrongZones.includes(zone.id) && <path d={zone.d} fill={OUTLINE} fillOpacity={0.16} pointerEvents="none" />}
                        {(outlined?.id === zone.id || partnerId === zone.id || (mirrorDemo === "pick" && plan.zones[0]?.id === zone.id) || (matchesOf !== null && zone.c === matchesOf && shown.fills[zone.id] !== zone.c && !(zone.id in plan.prefilled))) && (
                            <path
                                d={zone.d}
                                fill="none"
                                stroke={HIGHLIGHT}
                                strokeWidth={7}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray="1 13"
                                pointerEvents="none"
                                // Stalna oznaka miruje; blago pulsira samo kad je pomoć
                                className={shown.hint || mirrorDemo === "look" ? "animate-pulse" : undefined}
                            />
                        )}
                        {demoZone?.id === zone.id && (
                            <path
                                key={demo.run}
                                d={zone.d}
                                fill={HIGHLIGHT}
                                fillOpacity={0.22}
                                stroke={HIGHLIGHT}
                                strokeWidth={8}
                                strokeLinejoin="round"
                                pointerEvents="none"
                                className="animate-fade"
                                style={FADE_IN_OUT}
                            />
                        )}
                        {/* U zadatku šira ivica pripada samo traženom delu: tuđa ne sme da „pojede” dodir namenjen njemu */}
                        {interactive && zone.hit && (!task || zone.id === task.zone) && (
                            <path
                                d={zone.d}
                                fill="none"
                                stroke="transparent"
                                strokeWidth={zone.hit * 2}
                                pointerEvents="stroke"
                                aria-hidden="true"
                                className="cursor-pointer"
                                onClick={() => tapZone(zone)}
                            />
                        )}
                    </Fragment>
                );
            })}
            <PictureExtras picture={picture} />
            {picture.mirror && <MirrorLine picture={picture} />}
            {mode === "number" && <ZoneNumbers plan={plan} fills={shown.fills} />}
            {handOn === "zone" && suggestZone && <ZoneHand zoneId={suggestZone.id} picture={picture} />}
            {mirrorDemo === "pick" && plan.zones[0] && <ZoneHand zoneId={plan.zones[0].id} picture={picture} />}
        </svg>
    );

    return (
        <GameStage width="wide" className={`pb-6 ${SHORT.stage}`}>
            <GameHud
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={score}
                unit={mode === "verbal" ? "Zadatak" : "Deo"}
                onSpeak={isMonitor ? undefined : repeatInstruction}
            />

            {mode === "verbal" && taskZone && taskColor && (
                <GamePrompt
                    title={instruction}
                    subtitle={step}
                    compact
                    visual={
                        plan.level.showSwatch ? (
                            <span
                                key={demo.run}
                                className={cn("flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl", demo.on && "animate-soft-pulse ring-4 ring-brand-300")}
                                style={demo.on ? PULSE_ONCE : undefined}
                            >
                                <span
                                    aria-hidden="true"
                                    className="block h-10 w-10 rounded-full border-4 border-white shadow-soft ring-1 ring-line sm:h-14 sm:w-14"
                                    style={{ background: taskColor.hex }}
                                />
                                {/* Duga imena (npr. „svetlozelena” velikim slovima) prelaze u drugi red na mestu spoja reči */}
                                <span className="max-w-full text-center text-xs font-extrabold leading-tight tracking-tight text-ink sm:text-sm sm:tracking-normal">
                                    {taskColor.nom.replace(/^(svetlo|tamno)(?=.)/, "$1­")}
                                </span>
                            </span>
                        ) : undefined
                    }
                />
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 lg:gap-5">
                {/* Primer: na velikom ekranu u svojoj koloni levo od slike (od 1280 px; uže bi slika uz
                    drugara pored igre ostala sitna — tada je primer mala kartica uz natpis) */}
                {hasModel && (
                    <div className="hidden w-52 shrink-0 xl:block xl:w-60">
                        <ModelCard
                            picture={picture}
                            open={showModel}
                            onRequest={modelOnRequest && interactive ? togglePeek : undefined}
                            mark={modelMark}
                            large
                        />
                    </div>
                )}

                {/* Slika */}
                <div className={cn("relative min-w-0 flex-1 rounded-card border-2 bg-surface p-3 shadow-soft sm:p-4", SHORT.card, accent.border)}>
                    {mode !== "verbal" && demo.on && (
                        <span
                            key={demo.run}
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 animate-soft-pulse rounded-card ring-4 ring-brand-300"
                            style={PULSE_ONCE}
                        />
                    )}
                    <div className={cn("mb-2 flex items-center gap-3 sm:mb-3", SHORT.captionRow)}>
                        {/* Primer na telefonu i manjem tabletu, uz široku sliku: mala kartica levo od natpisa */}
                        {hasModel && !tall && (
                            <div className="w-28 shrink-0 sm:w-32 xl:hidden flat:hidden">
                                <ModelCard
                                    picture={picture}
                                    open={showModel}
                                    onRequest={modelOnRequest && interactive ? togglePeek : undefined}
                                    mark={modelMark}
                                />
                            </div>
                        )}
                        {/* Uvek piše šta se boji: tražen deo slike ili šta je upravo obojeno.
                            U bojenju po uputstvu isto piše odmah iznad, pa se na telefonu natpis ne ponavlja (mesto za boje). */}
                        <p
                            className={cn(
                                "min-h-8 flex-1 items-center justify-center gap-2 text-center text-lg font-extrabold leading-tight text-ink sm:text-2xl",
                                SHORT.caption,
                                mode === "verbal" ? "hidden sm:flex" : "flex"
                            )}
                            aria-live="polite"
                        >
                            {caption}
                        </p>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                        {/* Uz visoku sliku (i na položenom telefonu uz svaku) primer stoji levo od nje: tako slika ostaje velika */}
                        {hasModel && (
                            <div className={cn("w-28 shrink-0 sm:w-32 xl:hidden", !tall && "hidden flat:block")}>
                                <ModelCard
                                    picture={picture}
                                    open={showModel}
                                    onRequest={modelOnRequest && interactive ? togglePeek : undefined}
                                    mark={modelMark}
                                />
                            </div>
                        )}
                        <div className="min-w-0 flex-1">{art}</div>
                    </div>

                    <Feedback kind={feedbackKind} correctText={message} wrongText={message} className="absolute inset-x-2 bottom-2" />
                </div>

                {/* Boje i alat */}
                {/* Na uskom telefonu manji razmaci, da šest boja u redu budu dovoljno široke za dodir (48 px) */}
                <div className={cn("flex shrink-0 flex-col gap-3 rounded-card border border-line bg-surface p-2 shadow-soft sm:p-3", SHORT.palette, mode === "free" ? "sm:w-72 flat:sm:w-80" : "sm:w-60 lg:w-64")}>
                    <p className={cn("hidden px-1 font-display text-base font-extrabold sm:block", SHORT.hide, accent.text)}>{mode === "number" ? "Brojevi i boje" : "Boje"}</p>
                    <div
                        className={cn(
                            "grid gap-1.5 sm:gap-3",
                            mode === "free" ? "grid-cols-6 sm:grid-cols-4 flat:sm:grid-cols-6 flat:sm:gap-1.5" : cn(PALETTE_COLS[swatches.length] ?? "grid-cols-6", swatches.length > 8 ? "sm:grid-cols-3" : "sm:grid-cols-2")
                        )}
                    >
                        {swatches.map((color) => (
                            <Swatch
                                key={color.id}
                                color={color}
                                count={swatches.length}
                                named={mode !== "free"}
                                selected={shown.color === color.id}
                                tried={playing && mode === "verbal" && shown.wrongColors.includes(color.id)}
                                hinted={hintedColor === color.id && shown.color !== color.id}
                                hand={handOn === "color" && suggestZone?.c === color.id}
                                number={mode === "number" ? colorNumber(plan, color.id) : 0}
                                disabled={!interactive}
                                onPick={() => pickColor(color.id)}
                            />
                        ))}
                    </div>

                    {mode !== "verbal" && (
                        <div className={cn("grid gap-3 flat:gap-2", mode === "free" ? "grid-cols-3 sm:grid-cols-2 flat:sm:grid-cols-3" : "grid-cols-1")}>
                            {mode === "free" && (
                                <ToolButton
                                    label="Gumica"
                                    selected={shown.color === ERASER}
                                    disabled={!interactive}
                                    onClick={() => pickColor(ERASER)}
                                    icon={<path d="M4 15.5 13.5 6a2 2 0 0 1 2.8 0l2.7 2.7a2 2 0 0 1 0 2.8L12.5 18H7.5L4 15.5zM9 10.5l5 5M12.5 18H20" />}
                                />
                            )}
                            <ToolButton
                                label="Vrati"
                                disabled={!interactive || history.length === 0}
                                onClick={undo}
                                icon={<path d="M8 5 4 9l4 4M4 9h10a5 5 0 0 1 0 10h-3" />}
                            />
                            {mode === "free" && (
                                <button
                                    type="button"
                                    disabled={!interactive || colored < neededForDone}
                                    onClick={() => finish(viewRef.current)}
                                    className={cn(
                                        "min-h-14 w-full rounded-2xl border-2 border-b-[5px] border-emerald-900 bg-emerald-700 px-4 text-lg font-extrabold text-white transition-[transform,background-color,border-width,opacity] hover:bg-emerald-600 active:translate-y-[3px] active:border-b-2 disabled:cursor-default disabled:opacity-45 disabled:hover:bg-emerald-500 sm:col-span-2 sm:min-h-16 sm:text-xl flat:sm:col-span-1 flat:sm:min-h-12 flat:sm:px-2 flat:sm:text-base",
                                        interactive && allColored && "animate-soft-pulse"
                                    )}
                                >
                                    Gotovo ✓
                                </button>
                            )}
                        </div>
                    )}
                    {mode === "free" && !shown.done && colored < neededForDone && (
                        <p className="text-center text-base font-bold text-ink-soft">
                            Oboji još {neededForDone - colored} {plural(neededForDone - colored)}
                        </p>
                    )}
                </div>
            </div>
        </GameStage>
    );
}

/** "još 1 deo", "još 2 dela", "još 5 delova" */
function plural(count: number): string {
    const lastTwo = count % 100;
    const last = count % 10;
    if (last === 1 && lastTwo !== 11) return "deo";
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "dela";
    return "delova";
}

// ── Delovi prikaza ────────────────────────────────────────────────────────────

/** Unapred obojeni ukrasi i linije, iznad delova slike */
function PictureExtras({ picture }: { picture: Picture }) {
    return (
        <>
            {picture.details?.map((detail, index) => (
                <path key={index} d={detail.d} fill={detail.fill} stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
            ))}
            {picture.lines && <path d={picture.lines} fill="none" stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
        </>
    );
}

/** Linija ogledala na simetričnoj slici (isprekidana, ne može se dodirnuti) */
function MirrorLine({ picture }: { picture: Picture }) {
    const [, y, , h] = picture.viewBox.split(/\s+/).map(Number);
    const axis = picture.mirror?.axis ?? 0;
    return (
        <path d={`M${axis},${y + 4} L${axis},${y + h - 4}`} stroke={HIGHLIGHT} strokeOpacity={0.7} strokeWidth={4} strokeDasharray="10 9" strokeLinecap="round" pointerEvents="none" aria-hidden="true" />
    );
}

interface ModelCardProps {
    picture: Picture;
    /** Primer je vidljiv (inače stoji dugme „Pogledaj primer”) */
    open: boolean;
    /** Primer na zahtev: dodir otvara ili sklanja primer */
    onRequest?: () => void;
    /** Deo koji je označen i na primeru (isti kao na slici) */
    mark: string | null;
    large?: boolean;
}

/** Obojen primer iste slike. Na nivoima „primer na zahtev” na njegovom mestu stoji dugme. */
function ModelCard({ picture, open, onRequest, mark, large = false }: ModelCardProps) {
    const marked = mark ? picture.zones.find((zone) => zone.id === mark) : undefined;
    const body = open ? (
        <>
            <span className={cn("block text-center font-display font-extrabold text-ink-soft", large ? "mb-2 text-base" : "mb-1 text-xs")}>Primer</span>
            <svg viewBox={picture.viewBox} aria-hidden="true" className={cn("mx-auto block h-auto w-full", large ? "max-h-56" : "max-h-24")}>
                {picture.zones.map((zone) => (
                    <path key={zone.id} d={zone.d} fill={COLOR_BY_ID[zone.c]?.hex ?? PAPER} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
                ))}
                {marked && (
                    <path d={marked.d} fill="none" stroke={HIGHLIGHT} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 15" />
                )}
                <PictureExtras picture={picture} />
            </svg>
        </>
    ) : (
        <span className={cn("flex flex-col items-center justify-center gap-1 text-center font-extrabold text-brand-700", large ? "min-h-40 text-lg" : "min-h-24 text-sm")}>
            <svg viewBox="0 0 24 24" className={large ? "h-10 w-10" : "h-8 w-8"} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
            Pogledaj primer
        </span>
    );
    const frame = cn("block w-full rounded-2xl border-2 bg-surface shadow-soft", large ? "p-3" : "p-1.5", open ? "border-brand-200" : "border-dashed border-brand-300 bg-brand-50");
    if (onRequest) {
        return (
            <button
                type="button"
                onClick={onRequest}
                aria-pressed={open}
                aria-label={open ? "Skloni primer" : "Pogledaj primer"}
                className={cn(frame, "transition-[transform,background-color] active:translate-y-[2px]")}
            >
                {body}
            </button>
        );
    }
    return (
        <div role="img" aria-label={`Obojen primer: ${picture.name.toLowerCase()}`} className={frame}>
            {body}
        </div>
    );
}

interface SwatchProps {
    color: PaintColor;
    /** Broj ponuđenih boja (određuje visinu pločice na telefonu) */
    count: number;
    /** Ispod pločice piše naziv boje (od ≥sm) */
    named: boolean;
    selected: boolean;
    tried: boolean;
    hinted: boolean;
    /** Ruka pokazuje ovu boju (prvi deo prvog nivoa) */
    hand: boolean;
    /** Po brojevima: broj ove boje (0 = bez broja) */
    number: number;
    disabled: boolean;
    onPick: () => void;
}

function Swatch({ color, count, named, selected, tried, hinted, hand, number, disabled, onPick }: SwatchProps) {
    return (
        <button
            type="button"
            disabled={disabled || tried}
            onClick={onPick}
            aria-label={number ? `Broj ${number}: ${color.nom} boja` : `${color.nom} boja`}
            aria-pressed={selected}
            title={color.nom}
            className="relative flex flex-col items-center gap-1.5 rounded-2xl disabled:cursor-default"
        >
            <span
                className={cn(
                    "relative grid w-full place-items-center rounded-2xl border-2 border-black/15 transition-opacity duration-150",
                    // Do četiri boje u jednom redu su visoke pločice; više boja staje u jedan ili dva niža reda
                    count <= 4 ? "h-16" : count <= 6 ? "h-12 sm:h-14" : "h-11 sm:h-14",
                    SHORT.swatch,
                    selected && "ring-4 ring-ink ring-offset-2 ring-offset-surface",
                    // Istaknuta boja: stalni prsten (vidi se i bez animacija) i blag puls
                    // (obris, a ne prsten: puls i prsten oba crtaju senku, pa bi puls „pojeo” prsten)
                    hinted && "animate-soft-pulse outline-4 outline-offset-2 outline-brand-500",
                    tried && "opacity-30"
                )}
                style={{ background: color.hex }}
            >
                {number > 0 && (
                    <span aria-hidden="true" className={cn("font-display text-3xl font-extrabold leading-none", color.light ? "text-ink" : "text-white")}>
                        {number}
                    </span>
                )}
                {selected && (
                    <svg
                        viewBox="0 0 24 24"
                        className={cn(
                            "animate-pop",
                            number > 0 ? "absolute right-1 top-1 h-5 w-5" : "h-7 w-7",
                            color.light ? "text-ink" : "text-white"
                        )}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                    >
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                )}
            </span>
            {/* Naziv boje: boja nikad nije jedini znak (na telefonu naziv se čuje pri dodiru) */}
            {named && (
                <span aria-hidden="true" className={cn("hidden text-sm font-extrabold leading-tight text-ink-soft sm:block", SHORT.hide)}>
                    {color.nom}
                </span>
            )}
            {hand && <DemoHand />}
        </button>
    );
}

interface NumberSpot {
    zone: string;
    x: number;
    y: number;
    size: number;
}

/**
 * Brojevi u delovima slike (po brojevima). Mesto za broj traži se jednom po slici: u svakom
 * zasebnom komadu dela (npr. svaki prozor) tačka koja je unutar tog dela, nije pokrivena delom
 * nacrtanim preko njega i ima najviše mesta oko sebe. Obojen deo (tačnom bojom) više nema broj.
 */
function ZoneNumbers({ plan, fills }: { plan: ColoringPlan; fills: Fills }) {
    const ref = useRef<SVGGElement>(null);
    const [spots, setSpots] = useState<NumberSpot[]>([]);
    const { picture } = plan;
    const width = Number(picture.viewBox.split(/\s+/)[2]) || 300;
    const base = width * plan.level.numberSize;

    useLayoutEffect(() => {
        const group = ref.current;
        if (!group) return;
        setSpots(findNumberSpots(group, picture, plan.zones.map((zone) => zone.id), base));
    }, [picture, plan.zones, base]);

    return (
        <g ref={ref} pointerEvents="none" aria-hidden="true">
            {spots.map((spot, index) => {
                const zone = picture.zones.find((z) => z.id === spot.zone);
                if (!zone || fills[zone.id] === zone.c) return null;
                return (
                    <text
                        key={index}
                        x={spot.x}
                        y={spot.y}
                        fontSize={spot.size}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontWeight={800}
                        fill={OUTLINE}
                        stroke="#ffffff"
                        strokeWidth={spot.size * 0.2}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                        className="select-none font-display"
                    >
                        {colorNumber(plan, zone.c)}
                    </text>
                );
            })}
        </g>
    );
}

const SVG_NS = "http://www.w3.org/2000/svg";

function findNumberSpots(group: SVGGElement, picture: Picture, numbered: string[], size: number): NumberSpot[] {
    const make = (d: string) => {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        group.appendChild(path);
        return path;
    };
    const temp: SVGPathElement[] = [];
    const whole = picture.zones.map((zone) => {
        const path = make(zone.d);
        temp.push(path);
        return path;
    });
    const inside = (path: SVGPathElement, x: number, y: number) => {
        try {
            return path.isPointInFill(new DOMPoint(x, y));
        } catch {
            return false;
        }
    };
    const spots: NumberSpot[] = [];
    picture.zones.forEach((zone, index) => {
        if (!numbered.includes(zone.id)) return;
        const later = whole.slice(index + 1);
        const free = (x: number, y: number) => inside(whole[index], x, y) && !later.some((path) => inside(path, x, y));
        const pieces = zone.d.split(/(?=M)/).filter((piece) => piece.trim());
        const found: NumberSpot[] = [];
        for (const piece of pieces) {
            const path = make(piece);
            temp.push(path);
            const box = path.getBBox();
            if (Math.min(box.width, box.height) < size * 0.45 && pieces.length > 1) continue;
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            let best: { x: number; y: number; room: number; dist: number } | null = null;
            const steps = 12;
            for (let i = 0; i <= steps; i += 1) {
                for (let j = 0; j <= steps; j += 1) {
                    const x = box.x + (box.width * i) / steps;
                    const y = box.y + (box.height * j) / steps;
                    if (!inside(path, x, y) || !free(x, y)) continue;
                    // Koliko mesta ima oko tačke: najveći poluprečnik na kom je ceo krug tačaka i dalje u delu
                    let room = 0;
                    for (const r of [0.8, 0.6, 0.45, 0.3, 0.18]) {
                        const radius = size * r;
                        const ring = Array.from({ length: 8 }, (_, k) => [x + radius * Math.cos((k * Math.PI) / 4), y + radius * Math.sin((k * Math.PI) / 4)]);
                        if (ring.every(([px, py]) => inside(path, px, py) && free(px, py))) {
                            room = r;
                            break;
                        }
                    }
                    const dist = Math.hypot(x - cx, y - cy);
                    if (!best || room > best.room || (room === best.room && dist < best.dist)) best = { x, y, room, dist };
                }
            }
            if (best) found.push({ zone: zone.id, x: best.x, y: best.y, size: best.room >= 0.6 ? size : size * Math.max(best.room * 1.5, 0.45) });
        }
        if (found.length === 0) {
            const box = whole[index].getBBox();
            found.push({ zone: zone.id, x: box.x + box.width / 2, y: box.y + box.height / 2, size: size * 0.6 });
        }
        spots.push(...found);
    });
    temp.forEach((path) => path.remove());
    return spots;
}

/** Ruka nad delom slike (unutar SVG-a, u središtu dela) */
function ZoneHand({ zoneId, picture }: { zoneId: string; picture: Picture }) {
    const ref = useRef<SVGPathElement>(null);
    const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
    const zone = picture.zones.find((z) => z.id === zoneId);
    useLayoutEffect(() => {
        const box = ref.current?.getBBox();
        if (box) setCenter({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    }, [zoneId]);
    if (!zone) return null;
    // Veličina ruke prati veličinu slike (širina viewBox-a)
    const width = Number(picture.viewBox.split(/\s+/)[2]) || 300;
    const scale = width / 140;
    return (
        <g pointerEvents="none" aria-hidden="true">
            <path ref={ref} d={zone.d} fill="none" stroke="none" />
            {center && (
                <g transform={`translate(${center.x - 8 * scale} ${center.y - 2 * scale}) scale(${scale})`}>
                    <g className="animate-demo-tap" style={{ transformBox: "fill-box" }} fill="#ffffff" stroke="#1f1b3a" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 14a8 8 0 0 1-8 8" />
                        <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                        <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
                        <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
                        <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                    </g>
                </g>
            )}
        </g>
    );
}

// ── Dugme alata (gumica, vrati) — nema ga u zajedničkom kitu ───────────────────

interface ToolButtonProps {
    label: string;
    icon: ReactNode;
    onClick: () => void;
    selected?: boolean;
    disabled?: boolean;
}

function ToolButton({ label, icon, onClick, selected = false, disabled = false }: ToolButtonProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-pressed={selected}
            className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-b-4 px-2 py-1.5 text-base font-extrabold transition-[transform,background-color,border-color,opacity] disabled:cursor-default disabled:opacity-45",
                SHORT.tool,
                selected ? "border-ink bg-brand-50 text-ink" : "border-line bg-surface text-ink-soft",
                !disabled && !selected && "hover:border-brand-300 hover:bg-brand-50 active:translate-y-[2px]"
            )}
        >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {icon}
            </svg>
            {label}
        </button>
    );
}
