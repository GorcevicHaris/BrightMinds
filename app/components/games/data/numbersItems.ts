// Sadržaj igre „Brojevi”: pisanje cifara (precrtavanje i prepisivanje), prepoznavanje broja,
// broj ↔ tačkice, „Koji broj nedostaje?” na brojevnoj pravoj i „Koji broj je veći / manji?”.
//
// Igra dopunjuje „Brojimo” (tamo dete broji predmete): ovde je težište na ZNAKU broja —
// kako se piše i kako se čita — pa se poređenje i niz rade sa samim ciframa. Pisanje ide
// istim putem kao slova: model → precrtaj → prepiši (numerisane strelice za redosled poteza),
// prvo cifre od pravih linija (1, 7, 4), pa oble; brojevi do 10, pa do 20.
//
// Pravila pisanja:
//  • Brojevi se izgovaraju rečima iz igre „Brojimo” (`numberWord`), oblik „tačkica” uz broj
//    bira `nounForm` (jedna tačkica, dve tačkice, pet tačkica).
//  • Glas kaže broj, nikad ne kaže gde treba dodirnuti.

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";
import { nounForm, numberWord } from "@/app/components/games/data/countingItems";
import { arc, joinGlyphs, line, quad, stroke, TRACE_GUIDES, type Glyph, type Pt, type TraceGuide } from "@/app/components/games/data/tracing";

// ── Cifre ─────────────────────────────────────────────────────────────────────

const g = (...strokes: Pt[][]): Glyph => ({ strokes });

/** Cifre 0–9: visina 0–100, redosled poteza kao u prvom razredu */
export const DIGIT_GLYPHS: Readonly<Record<string, Glyph>> = {
    "0": g(arc(36, 50, 28, 50, -90, -450)),
    "1": g(stroke(line(14, 24, 42, 0), line(42, 0, 42, 100))),
    "2": g(stroke(arc(36, 28, 27, 27, -165, 20), line(61.4, 37.2, 10, 100), line(10, 100, 66, 100))),
    "3": g(stroke(arc(34, 25, 25, 25, -160, 90), arc(34, 75, 28, 25, -90, 160))),
    "4": g(stroke(line(46, 0, 8, 66), line(8, 66, 70, 66)), line(52, 30, 52, 100)),
    "5": g(stroke(line(18, 0, 14, 46), arc(36, 68, 28, 30, -140, 150)), line(18, 0, 60, 0)),
    "6": g(stroke(quad(54, 2, 12, 22, 12, 70), arc(36, 70, 24, 28, 180, -180))),
    "7": g(stroke(line(10, 0, 64, 0), line(64, 0, 28, 100))),
    "8": g(stroke(arc(36, 25, 22, 25, -90, -270), arc(36, 75, 27, 25, -90, 270), arc(36, 25, 22, 25, 90, -90))),
    "9": g(stroke(arc(36, 30, 25, 30, -10, -370), line(60.6, 24.8, 58, 100))),
};

export const NUMBERS_MAX = 20;

/** Potezi broja 0–20 (višecifreni broj: cifre jedna do druge) */
export function numberGlyph(value: number): Glyph | undefined {
    if (!Number.isInteger(value) || value < 0 || value > NUMBERS_MAX) return undefined;
    const digits = String(value).split("");
    return digits.slice(1).reduce((glyph, digit) => joinGlyphs(glyph, DIGIT_GLYPHS[digit], 14), DIGIT_GLYPHS[digits[0]]);
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);

/** „pet tačkica”, „dve tačkice”, „jedna tačkica” */
export function dotsPhrase(count: number): string {
    const form = nounForm(count);
    return `${numberWord(count, "f")} ${form === "one" ? "tačkica" : form === "few" ? "tačkice" : "tačkica"}`;
}

// ── Zadaci ────────────────────────────────────────────────────────────────────

/**
 *  trace   — precrtaj (ili prepiši) broj
 *  find    — „Gde je broj pet?”: kartice sa brojevima
 *  match   — veliki broj gore, dete bira karticu sa toliko tačkica
 *  missing — „Koji broj nedostaje?”: niz brojeva sa praznim mestom
 *  compare — „Koji broj je veći?” (ili „manji”): dve kartice sa brojevima
 */
export type NumberKind = "trace" | "find" | "match" | "missing" | "compare";
export const NUMBER_KINDS: readonly NumberKind[] = ["trace", "find", "match", "missing", "compare"];

export interface NumberTask {
    kind: NumberKind;
    /** Tačan broj */
    answer: number;
    guide: TraceGuide;
    /** Učitelj prvo pokaže poteze (lak nivo) */
    demo: boolean;
    /** Kartice (brojevi ili broj tačkica); prazno za precrtavanje */
    choices: number[];
    /** Za „missing”: niz na brojevnoj pravoj (tačan broj je na mestu `gap`) */
    sequence: number[];
    gap: number;
    /** Za „compare”: traži se manji broj */
    less: boolean;
}

export function questionFor(task: NumberTask): string {
    const word = numberWord(task.answer);
    switch (task.kind) {
        case "trace":
            return task.guide === "copy" ? `Prepiši broj ${word}.` : `Piši broj ${word}.`;
        case "find":
            return `Gde je broj ${word}?`;
        case "match":
            return `Gde ima ${dotsPhrase(task.answer)}?`;
        case "missing":
            return "Koji broj nedostaje?";
        case "compare":
            return `Koji broj je ${task.less ? "manji" : "veći"}?`;
    }
}

/** Natpis na ekranu (broj ciframa) */
export function promptTitle(task: NumberTask): string {
    switch (task.kind) {
        case "trace":
            return `${task.guide === "copy" ? "Prepiši" : "Piši"} broj ${task.answer}`;
        case "find":
            return `Gde je broj ${task.answer}?`;
        case "match":
            return "Gde ima toliko tačkica?";
        case "missing":
            return "Koji broj nedostaje?";
        case "compare":
            return `Koji broj je ${task.less ? "manji" : "veći"}?`;
    }
}

/** Rečenica posle tačnog odgovora */
export function answerFor(task: NumberTask): string {
    const word = capitalize(numberWord(task.answer));
    switch (task.kind) {
        case "trace":
        case "find":
            return `${word}.`;
        case "match":
            return `${capitalize(dotsPhrase(task.answer))}.`;
        case "missing":
            return `${word}. ${capitalize(task.sequence.map((value) => numberWord(value)).join(", "))}.`;
        case "compare": {
            const other = task.choices.find((value) => value !== task.answer) ?? 0;
            return `${word} je ${task.less ? "manje" : "više"} od ${numberWord(other)}.`;
        }
    }
}

/** Kratak natpis posle tačnog odgovora (na ekranu) */
export function answerShort(task: NumberTask): string {
    if (task.kind === "compare") {
        const other = task.choices.find((value) => value !== task.answer) ?? 0;
        return task.less ? `${task.answer} < ${other}` : `${task.answer} > ${other}`;
    }
    if (task.kind === "missing") return task.sequence.join(" ");
    return String(task.answer);
}

/** Šta je na kartici koju je dete pogrešno izabralo */
export function pickedSentence(task: NumberTask, picked: number): string {
    return task.kind === "match" ? `Ovde ima ${dotsPhrase(picked)}.` : `To je broj ${numberWord(picked)}.`;
}

export function choiceLabel(task: NumberTask, value: number): string {
    return task.kind === "match" ? capitalize(dotsPhrase(value)) : `Broj ${numberWord(value)}`;
}

export function isTraceTask(task: Pick<NumberTask, "kind">): boolean {
    return task.kind === "trace";
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface Slot {
    kind: NumberKind;
    /** Opseg broja (za trace: brojevi redom iz `values`, ako su dati) */
    min: number;
    max: number;
    /** Brojevi za precrtavanje redom (uvođenje) */
    values?: readonly number[];
    less?: boolean;
}

interface LevelRule {
    guide: TraceGuide;
    slots: readonly Slot[];
    choices: number;
}

const tr = (values: readonly number[]): Slot => ({ kind: "trace", min: 0, max: 9, values });
const any = (kind: NumberKind, min: number, max: number, less = false): Slot => ({ kind, min, max, less });

const RULES: readonly LevelRule[] = [
    // Lako: cifre debelo isprekidane, učitelj pokaže poteze; „Gde je broj…?”, broj ↔ tačkice do 5
    { guide: "thick", choices: 2, slots: [tr([1, 7, 4, 0]), any("find", 0, 9)] },
    { guide: "thick", choices: 3, slots: [tr([2, 3, 5, 7]), any("find", 0, 9)] },
    { guide: "thick", choices: 3, slots: [tr([6, 8, 9, 0]), any("find", 0, 9)] },
    { guide: "thick", choices: 3, slots: [any("trace", 1, 5), any("match", 1, 5), any("trace", 1, 5), any("match", 1, 5), any("trace", 1, 5)] },
    { guide: "thick", choices: 3, slots: [any("trace", 0, 9), any("missing", 1, 5), any("match", 1, 5), any("trace", 0, 9), any("missing", 1, 5)] },
    // Srednje: tanka linija; nedostaje u nizu do 10, broj ↔ tačkice do 10, veći i manji
    { guide: "thin", choices: 3, slots: [any("trace", 0, 9), any("missing", 1, 10), any("trace", 0, 9), any("trace", 0, 9), any("missing", 1, 10), any("trace", 0, 9)] },
    { guide: "thin", choices: 3, slots: [tr([10]), any("match", 1, 10), any("trace", 0, 9), any("match", 1, 10), any("trace", 0, 9), any("match", 1, 10)] },
    { guide: "thin", choices: 3, slots: [any("trace", 0, 10), any("missing", 1, 10), any("trace", 0, 10), any("missing", 1, 10), any("trace", 0, 10), any("missing", 1, 10)] },
    { guide: "thin", choices: 2, slots: [any("trace", 0, 10), any("compare", 1, 10), any("trace", 0, 10), any("compare", 1, 10), any("trace", 0, 10), any("compare", 1, 10)] },
    { guide: "thin", choices: 3, slots: [any("trace", 0, 10), any("compare", 1, 10, true), any("missing", 1, 10), any("trace", 0, 10), any("compare", 1, 10, true), any("missing", 1, 10)] },
    // Teško: prepisivanje po uzoru (samo početna tačka), brojevi do 20
    { guide: "copy", choices: 4, slots: [any("trace", 0, 9), any("trace", 0, 9), any("find", 0, 20), any("trace", 0, 9), any("trace", 0, 9), any("trace", 0, 9)] },
    { guide: "copy", choices: 4, slots: [any("trace", 10, 15), any("missing", 5, 15), any("trace", 10, 15), any("missing", 5, 15), any("trace", 10, 15), any("missing", 5, 15)] },
    { guide: "copy", choices: 3, slots: [any("missing", 8, 20), any("compare", 1, 20), any("missing", 8, 20), any("compare", 1, 20, true), any("missing", 8, 20), any("compare", 1, 20)] },
    { guide: "copy", choices: 3, slots: [any("trace", 11, 20), any("match", 6, 20), any("trace", 11, 20), any("match", 6, 20), any("trace", 11, 20), any("match", 6, 20)] },
    { guide: "copy", choices: 4, slots: [any("trace", 0, 20), any("missing", 1, 20), any("compare", 1, 20), any("trace", 0, 20), any("missing", 1, 20), any("compare", 1, 20, true)] },
];

export const NUMBERS_MAX_LEVEL = 15;

export function numbersRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), NUMBERS_MAX_LEVEL);
    return RULES[safe - 1];
}

/** Svaki slot sa `values` daje onoliko precrtavanja koliko ima brojeva */
function expand(rule: LevelRule): Slot[] {
    return rule.slots.flatMap((slot) => (slot.values ? slot.values.map((value) => ({ ...slot, min: value, max: value, values: undefined })) : [slot]));
}

/**
 * Zadaci jednog nivoa. Prvi zadatak je uvek precrtavanje (ako ga nivo ima), isti broj se ne
 * ponavlja dvaput zaredom. Kad uzrast traži manje zadataka, slotovi se seku s kraja, a bar
 * jedan zadatak sa izborom ostaje (ako ga nivo ima).
 */
export function buildNumbersLevel(level: number, { maxChoices, maxRounds, random = Math.random }: { maxChoices: number; maxRounds: number; random?: () => number }): NumberTask[] {
    const rule = numbersRule(level);
    const all = expand(rule);
    const roundCount = Math.max(2, Math.min(all.length, Number.isFinite(maxRounds) ? maxRounds : all.length));
    const choiceCount = Math.max(2, Math.min(rule.choices, Number.isFinite(maxChoices) ? maxChoices : rule.choices));
    const between = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    let slots = all.slice(0, roundCount);
    if (!slots.some((slot) => slot.kind !== "trace")) {
        const choice = all.find((slot) => slot.kind !== "trace");
        if (choice) slots = [...slots.slice(0, roundCount - 1), choice];
    }

    const guide = rule.guide;
    const demo = guide === "thick";
    /** Kartice: tačan broj + susedni brojevi (koji nisu `except`), u opsegu 0–20 */
    const numeralChoices = (answer: number, lo: number, hi: number, except: readonly number[] = []) => {
        const pool = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((value) => value !== answer && !except.includes(value));
        const near = shuffle(pool.filter((value) => Math.abs(value - answer) <= 3));
        const far = shuffle(pool.filter((value) => Math.abs(value - answer) > 3));
        return shuffle([answer, ...[...near, ...far].slice(0, choiceCount - 1)]);
    };

    let last: number | null = null;
    const fresh = (lo: number, hi: number) => {
        let value = between(lo, hi);
        for (let tries = 0; value === last && hi > lo && tries < 8; tries += 1) value = between(lo, hi);
        return value;
    };
    const tasks = slots.map((slot): NumberTask => {
        const base = { guide, demo: false, choices: [] as number[], sequence: [] as number[], gap: 0, less: false };
        let task: NumberTask;
        if (slot.kind === "trace") {
            task = { ...base, kind: "trace", answer: fresh(slot.min, slot.max), demo };
        } else if (slot.kind === "find") {
            const answer = fresh(slot.min, slot.max);
            task = { ...base, kind: "find", answer, choices: numeralChoices(answer, slot.min, slot.max) };
        } else if (slot.kind === "match") {
            const answer = fresh(slot.min, slot.max);
            task = { ...base, kind: "match", answer, choices: numeralChoices(answer, Math.max(1, slot.min - 3), slot.max) };
        } else if (slot.kind === "missing") {
            // Četiri broja zaredom (pet od srednjeg nivoa), prazno mesto nije uvek na istom kraju
            const length = slot.max > 5 ? 5 : 4;
            const start = between(slot.min, Math.max(slot.min, slot.max - length + 1));
            const sequence = Array.from({ length }, (_, i) => start + i);
            const gap = between(level <= 5 ? 1 : 0, length - (level <= 5 ? 2 : 1));
            const answer = sequence[gap];
            const visible = sequence.filter((value) => value !== answer);
            task = { ...base, kind: "missing", answer, sequence, gap, choices: numeralChoices(answer, Math.max(0, slot.min - 2), Math.min(NUMBERS_MAX, slot.max + 2), visible) };
        } else {
            // Poređenje: dva broja sa razlikom bar 2 (u teškom nivou bar 1)
            const minGap = level >= 11 ? 1 : 2;
            let a = between(slot.min, slot.max);
            let b = between(slot.min, slot.max);
            for (let tries = 0; Math.abs(a - b) < minGap && tries < 40; tries += 1) b = between(slot.min, slot.max);
            if (Math.abs(a - b) < minGap) [a, b] = [slot.min, slot.min + minGap];
            const less = slot.less === true;
            task = { ...base, kind: "compare", answer: less ? Math.min(a, b) : Math.max(a, b), choices: [a, b], less };
        }
        last = task.answer;
        return task;
    });
    return tasks;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface NumbersView extends BaseView {
    task: NumberTask | null;
    strokesDone: number;
    slips: number;
    wrong: number[];
    picked: number | null;
    feedback: FeedbackKind;
    hint: boolean;
    hintRun: number;
    promptedCount: number;
}

export function emptyNumbersView(totalRounds: number): NumbersView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        task: null,
        strokesDone: 0,
        slips: 0,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        hintRun: 0,
    };
}

const isInt = (value: unknown, lo: number, hi: number): value is number => Number.isInteger(value) && (value as number) >= lo && (value as number) <= hi;

/** Zadatak sa monitora je ispravan samo ako ga je igra mogla da napravi */
export function validNumberTask(value: unknown): value is NumberTask {
    if (!value || typeof value !== "object") return false;
    const task = value as Partial<NumberTask>;
    if (!NUMBER_KINDS.includes(task.kind as NumberKind) || !isInt(task.answer, 0, NUMBERS_MAX)) return false;
    if (!TRACE_GUIDES.includes(task.guide as TraceGuide) || typeof task.demo !== "boolean" || typeof task.less !== "boolean") return false;
    if (!Array.isArray(task.choices) || task.choices.length > 6 || !task.choices.every((v) => isInt(v, 0, NUMBERS_MAX)) || new Set(task.choices).size !== task.choices.length) return false;
    if (!Array.isArray(task.sequence) || task.sequence.length > 6 || !task.sequence.every((v) => isInt(v, 0, NUMBERS_MAX)) || !isInt(task.gap, 0, 5)) return false;
    const kind = task.kind as NumberKind;
    if (kind === "trace") return task.choices.length === 0;
    if (task.choices.length < 2 || !task.choices.includes(task.answer as number)) return false;
    if (kind === "missing") return task.sequence[task.gap as number] === task.answer && task.sequence.every((v, i, all) => i === 0 || v === all[i - 1] + 1);
    if (kind === "compare") return task.choices.length === 2 && task.answer === (task.less ? Math.min(...task.choices) : Math.max(...task.choices));
    if (kind === "match") return task.choices.every((v) => v >= 1);
    return true;
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeNumbersMonitor(state: Partial<NumbersView> | null | undefined): NumbersView {
    const base = emptyNumbersView(1);
    if (!state) return base;
    const task = validNumberTask(state.task) ? { ...state.task, choices: [...state.task.choices], sequence: [...state.task.sequence] } : null;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const choices = task?.choices ?? [];
    const strokes = task ? (numberGlyph(task.answer)?.strokes.length ?? 0) : 0;
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        task,
        strokesDone: task?.kind === "trace" ? Math.min(toCount(state.strokesDone, 0), strokes) : 0,
        slips: toCount(state.slips, 0),
        wrong: task && Array.isArray(state.wrong) ? Array.from(new Set(state.wrong.filter((v) => choices.includes(v) && v !== task.answer))) : [],
        picked: task ? (choices.find((v) => v === state.picked) ?? null) : null,
        feedback: task && (state.feedback === "correct" || state.feedback === "wrong") ? state.feedback : null,
        hint: task !== null && state.hint === true,
        hintRun: toCount(state.hintRun, 0),
    };
}
