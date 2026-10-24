// Sadržaj igre „Sat”: drvena tabla sa brojevima, pa drveni sat koji dete slaže, pa čitanje
// vremena. Bez Reacta, da bi se nivoi proveravali u testovima; crteži su u games/clock/.
//
// Igra prati dve igračke koje deca znaju iz vrtića:
//  • tabla sa brojevima 0–9: svaki broj ima svoju rupu u obliku cifre, a ispod rupe je
//    nacrtano toliko životinja (jedna žirafa, dve mačke, tri slona…);
//  • drveni sat sa pingvinom u sredini: dvanaest debelih brojeva, svaki drugog oblika i boje
//    (12 žuti kvadrat, 1 roze cvet, 2 crveno srce, 3 narandžasti trougao…), i dve kazaljke.
//
// Zašto ovim redom (uzrast 3–10, i deca sa autizmom):
//  • Učenje bez greške (errorless learning): prvo se pokaže (ruka prevuče prvi broj na prvom
//    nivou — pokazni zadatak se ne ocenjuje), zadaci počinju sa malo komada (1–3), a pomoć
//    (rupa i komad zasvetle) na lakim nivoima stiže već posle prve greške i posle čekanja.
//  • Podrška se povlači postepeno (stimulus fading): rupa u obliku cifre + boja komada →
//    rupa bez boje → sat sa rupama u obliku komada → okrugle rupe (dete mora da zna redosled)
//    → svi komadi isti (ostaje samo broj). Na satu prvo idu 12, 3, 6 i 9 — „sidra” po kojima
//    se ostali brojevi lakše nađu.
//  • Tabla sa rupama je vizuelna struktura kakvu koristi TEACCH: rešenje se vidi samo od sebe
//    (komad ili uđe ili ne uđe), raspored je uvek isti, nema žurbe ni tajmera.
//  • Količine su složene kao na kocki (do 4 u jednom redu ili kvadratu), da ih dete „vidi”
//    bez brojanja (subitizacija), a uz svaki broj glas kaže i količinu („Tri. Tri slona.”).
//  • Čitanje sata dolazi tek na teškim nivoima (oko 6–7 godina): prvo pun sat (samo mala
//    kazaljka se pomera, velika stoji na 12), pa pola sata. Prvo se prepoznaje („Koliko je
//    sati?”, tri izbora), pa se pokazuje („Pokaži tri sata.”). Izbori su prvo međusobno daleki,
//    a na kraju bliski (pola četiri – četiri sata – pola pet).
//  • Vreme se kaže kako se kaže kod nas: „jedan sat”, „dva sata”, „pet sati”, „pola četiri”
//    (= 3 i 30). Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";
import type { PieceColor, ShapeKey } from "@/app/components/games/kit/shapePaths";
import type { AnimalId } from "@/app/components/games/data/foodItems";
import { numberWord } from "@/app/components/games/data/countingItems";

// ── Komadi sata ───────────────────────────────────────────────────────────────

/** Brojevi na satu, redom kako stoje (od vrha, u smeru kazaljke) */
export const CLOCK_NUMBERS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export interface ClockPiece {
    shape: ShapeKey;
    color: PieceColor;
    /** Opis za čitač ekrana („žuti kvadrat”) */
    label: string;
}

/** Komadi kao na drvenom satu sa fotografije: svaki broj ima svoj oblik i boju */
export const CLOCK_PIECES: Readonly<Record<number, ClockPiece>> = {
    12: { shape: "square", color: "yellow", label: "žuti kvadrat" },
    1: { shape: "flower", color: "pink", label: "roze cvet" },
    2: { shape: "heart", color: "red", label: "crveno srce" },
    3: { shape: "triangle", color: "orange", label: "narandžasti trougao" },
    4: { shape: "trapezoid", color: "blue", label: "plavi trapez" },
    5: { shape: "pentagon", color: "green", label: "zeleni petougao" },
    6: { shape: "halfCircle", color: "yellow", label: "žuti polukrug" },
    7: { shape: "star", color: "pink", label: "roze zvezda" },
    8: { shape: "octagon", color: "red", label: "crveni osmougao" },
    9: { shape: "crescent", color: "orange", label: "narandžasti polumesec" },
    10: { shape: "circle", color: "blue", label: "plavi krug" },
    11: { shape: "oval", color: "green", label: "zeleni oval" },
};

/** Ugao broja na satu (stepeni, 0 = gore, u smeru kazaljke) */
export function clockAngle(hour: number): number {
    return (((hour % 12) + 12) % 12) * 30;
}

// ── Tabla sa brojevima 0–9 ────────────────────────────────────────────────────

export const BOARD_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/** Boja drvene cifre na tabli */
export const DIGIT_COLORS: Readonly<Record<number, PieceColor>> = {
    0: "purple",
    1: "red",
    2: "orange",
    3: "yellow",
    4: "green",
    5: "teal",
    6: "sky",
    7: "blue",
    8: "pink",
    9: "brown",
};

export interface CountAnimal {
    animal: AnimalId;
    /** Rod (za „jedna žirafa”, „dve mačke”) */
    gender: "m" | "f";
    one: string;
    few: string;
    many: string;
}

/** Životinje ispod rupa: koliko ih je, toliki je broj (kao na drvenoj tabli) */
export const COUNT_ANIMALS: Readonly<Record<number, CountAnimal>> = {
    1: { animal: "giraffe", gender: "f", one: "žirafa", few: "žirafe", many: "žirafa" },
    2: { animal: "cat", gender: "f", one: "mačka", few: "mačke", many: "mačaka" },
    3: { animal: "elephant", gender: "m", one: "slon", few: "slona", many: "slonova" },
    4: { animal: "rabbit", gender: "m", one: "zec", few: "zeca", many: "zečeva" },
    5: { animal: "bird", gender: "f", one: "ptica", few: "ptice", many: "ptica" },
    6: { animal: "frog", gender: "f", one: "žaba", few: "žabe", many: "žaba" },
    7: { animal: "bee", gender: "f", one: "pčela", few: "pčele", many: "pčela" },
    8: { animal: "mouse", gender: "m", one: "miš", few: "miša", many: "miševa" },
    9: { animal: "penguin", gender: "m", one: "pingvin", few: "pingvina", many: "pingvina" },
};

/**
 * Raspored životinja kao na kocki: broj u svakom redu (odozgo). Do četiri u jednom redu ili
 * kvadratu, veće količine su dva-tri reda koja se lako „vide” bez brojanja.
 */
export function countRows(count: number): number[] {
    const rows: Record<number, number[]> = { 0: [], 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [3, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3] };
    return rows[count] ?? [];
}

const capital = (text: string) => text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);

/** „tri slona”, „jedna žirafa”, „dve mačke”, „pet ptica” */
export function animalPhrase(count: number): string {
    const animal = COUNT_ANIMALS[count];
    if (!animal) return "";
    const last = count % 10;
    const form = last === 1 && count !== 11 ? animal.one : last >= 2 && last <= 4 && (count < 12 || count > 14) ? animal.few : animal.many;
    return `${numberWord(count, animal.gender)} ${form}`;
}

/** Šta glas kaže kad cifra legne na tablu: „Tri. Tri slona.” / „Nula. Nema nikoga.” */
export function digitSentence(digit: number): string {
    if (digit === 0) return "Nula. Nema nikoga.";
    return `${capital(numberWord(digit))}. ${capital(animalPhrase(digit))}.`;
}

/** Broj rečima, velikim slovom („Tri.”) — kad komad legne na sat */
export function numberSentence(value: number): string {
    return `${capital(numberWord(value))}.`;
}

// ── Vreme ─────────────────────────────────────────────────────────────────────

export interface ClockTime {
    /** 1–12 */
    h: number;
    /** 0 ili 30 */
    m: 0 | 30;
}

/** „3:00”, „3:30” — ključ vremena (izbori, stanje za monitor) */
export function timeKey(time: ClockTime): string {
    return `${time.h}:${time.m === 30 ? "30" : "00"}`;
}

export function parseTime(key: unknown): ClockTime | null {
    if (typeof key !== "string") return null;
    const match = /^(\d{1,2}):(00|30)$/.exec(key);
    if (!match) return null;
    const h = Number(match[1]);
    if (h < 1 || h > 12) return null;
    return { h, m: match[2] === "30" ? 30 : 0 };
}

/** Pun sat: „jedan sat”, „dva sata”, „pet sati”, „dvanaest sati” */
export function hourPhrase(h: number): string {
    const word = numberWord(h);
    if (h === 1) return `${word} sat`;
    if (h >= 2 && h <= 4) return `${word} sata`;
    return `${word} sati`;
}

/** Vreme kako se kaže: „tri sata”, „pola četiri” (= 3 i 30), „pola jedan” (= 12 i 30) */
export function timePhrase(time: ClockTime): string {
    if (time.m === 30) return `pola ${numberWord((time.h % 12) + 1)}`;
    return hourPhrase(time.h);
}

/** Uglovi kazaljki (stepeni od vrha, u smeru kazaljke): mala ide pola puta do sledećeg broja */
export function handAngles(time: ClockTime): { hour: number; minute: number } {
    return { hour: clockAngle(time.h) + (time.m === 30 ? 15 : 0), minute: time.m === 30 ? 180 : 0 };
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export type ClockMode = "board" | "clock" | "time";
export type TimeTaskKind = "read" | "set" | "which";
/** digit: rupa u obliku cifre · shaped: rupa u obliku komada · round: sve rupe iste (okrugle) */
export type HoleStyle = "digit" | "shaped" | "round";
/** far: izbori daleko jedan od drugog · near: susedni sati (3 – 4 – pola četiri) */
type Spread = "far" | "near";

interface BoardLevel {
    mode: "board";
    /** Table jedna za drugom: cifre na svakoj */
    boards: number[][];
    /** Rupa je obojena bojom svoje cifre (više podrške) */
    tint: boolean;
    earlyHint: boolean;
}

interface ClockLevelRule {
    mode: "clock";
    /** Brojevi koje dete umeće (ostali već stoje na satu) */
    missing: number[];
    holes: "shaped" | "round";
    /** Svi komadi isti: okrugli, boje drveta — ostaje samo broj */
    plain: boolean;
    earlyHint: boolean;
}

interface TimeLevel {
    mode: "time";
    /** Vrste zadataka, smenjuju se redom */
    kinds: TimeTaskKind[];
    /** Pola sata: nikad, samo pola, ili pomešano sa punim satom */
    half: "none" | "only" | "mixed";
    spread: Spread;
    rounds: number;
    earlyHint: boolean;
}

export type ClockLevel = BoardLevel | ClockLevelRule | TimeLevel;

const ANCHORS = [12, 3, 6, 9];
const BETWEEN = [1, 2, 4, 5, 7, 8, 10, 11];
const ALL = [...CLOCK_NUMBERS];

export const CLOCK_LEVELS: readonly ClockLevel[] = [
    // Lako: tabla sa brojevima. Prvo 1–3 (dvaput, prvi broj pokazuje ruka), pa 1–5, pa nula, pa 0–9
    { mode: "board", boards: [[1, 2, 3], [1, 2, 3]], tint: true, earlyHint: true },
    { mode: "board", boards: [[1, 2, 3, 4, 5]], tint: true, earlyHint: true },
    { mode: "board", boards: [[0, 1, 2, 3, 4, 5]], tint: false, earlyHint: true },
    { mode: "board", boards: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]], tint: true, earlyHint: true },
    { mode: "board", boards: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]], tint: false, earlyHint: true },
    // Srednje: sat. Oblik i boja vode (prvo samo 12, 3, 6, 9), pa okrugle rupe, pa isti komadi
    { mode: "clock", missing: ANCHORS, holes: "shaped", plain: false, earlyHint: true },
    { mode: "clock", missing: BETWEEN, holes: "shaped", plain: false, earlyHint: false },
    { mode: "clock", missing: ALL, holes: "shaped", plain: false, earlyHint: false },
    { mode: "clock", missing: BETWEEN, holes: "round", plain: false, earlyHint: false },
    { mode: "clock", missing: ALL, holes: "round", plain: true, earlyHint: false },
    // Teško: koliko je sati. Pun sat (prepoznaj, pa pokaži), pa pola sata
    { mode: "time", kinds: ["read"], half: "none", spread: "far", rounds: 6, earlyHint: false },
    { mode: "time", kinds: ["set"], half: "none", spread: "far", rounds: 6, earlyHint: false },
    { mode: "time", kinds: ["which", "set", "read"], half: "none", spread: "near", rounds: 6, earlyHint: false },
    { mode: "time", kinds: ["which"], half: "only", spread: "far", rounds: 6, earlyHint: false },
    { mode: "time", kinds: ["which", "read", "set", "which"], half: "mixed", spread: "near", rounds: 8, earlyHint: false },
];

export const CLOCK_MAX_LEVEL = CLOCK_LEVELS.length;

export function clockLevel(level: number): ClockLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), CLOCK_MAX_LEVEL);
    return CLOCK_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

/** Jedna tabla ili jedan sat: mesta, šta već stoji i šta je u korpi */
export interface ClockBoard {
    /** Brojevi koji imaju mesto (tabla: cifre; sat: svih 12) */
    slots: number[];
    /** Brojevi koji su već na mestu */
    prefilled: number[];
    /** Komadi u korpi, redom */
    tray: number[];
    holes: HoleStyle;
    tint: boolean;
    plain: boolean;
}

/** Jedan zadatak sa vremenom */
export interface TimeTask {
    kind: TimeTaskKind;
    /** Traženo vreme („3:00”) */
    time: string;
    /** read: sat kao broj („3”); which: vreme („3:30”) — ključevi izbora */
    choices: string[];
    /** set: gde mala kazaljka stoji na početku (sat) */
    start: number;
}

export interface ClockPlan {
    mode: ClockMode;
    boards: ClockBoard[];
    tasks: TimeTask[];
    earlyHint: boolean;
}

interface BuildOptions {
    /** Iz podešavanja uzrasta: najviše zadataka */
    maxRounds: number;
    /** Iz podešavanja: najviše izbora */
    maxChoices: number;
    random?: () => number;
}

/** Ukupno zadataka u planu (jedan komad = jedan zadatak; jedno pitanje = jedan zadatak) */
export function planRounds(plan: ClockPlan): number {
    return plan.mode === "time" ? plan.tasks.length : plan.boards.reduce((sum, board) => sum + board.tray.length, 0);
}

/**
 * Plan nivoa. Table se ne seku (sat ima svih 12 brojeva); druga tabla se dodaje samo kad
 * stane u broj zadataka za uzrast (najmanje 6, da ponavljanje 1–3 ostane i za najmlađe).
 * `random` daje broj u [0, 1) (igra koristi Math.random, testovi stalan niz).
 */
export function buildClockLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): ClockPlan {
    const rule = clockLevel(level);
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    if (rule.mode === "board") {
        const cap = Math.max(6, Number.isFinite(maxRounds) ? maxRounds : 6);
        const boards: ClockBoard[] = [];
        let used = 0;
        for (const digits of rule.boards) {
            if (boards.length > 0 && used + digits.length > cap) break;
            used += digits.length;
            // Na prvoj tabli prvog nivoa prvi komad je jedinica (nju pokazuje ruka)
            const tray = level === 1 && boards.length === 0 ? [1, ...shuffle(digits.filter((d) => d !== 1))] : shuffle(digits);
            boards.push({ slots: [...digits], prefilled: [], tray, holes: "digit", tint: rule.tint, plain: false });
        }
        return { mode: "board", boards, tasks: [], earlyHint: rule.earlyHint };
    }

    if (rule.mode === "clock") {
        const prefilled = ALL.filter((value) => !rule.missing.includes(value));
        return {
            mode: "clock",
            boards: [{ slots: [...ALL], prefilled, tray: shuffle(rule.missing), holes: rule.holes, tint: false, plain: rule.plain }],
            tasks: [],
            earlyHint: rule.earlyHint,
        };
    }

    const count = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? Math.max(maxRounds, 4) : rule.rounds));
    const choiceCount = Math.max(2, Math.min(3, Number.isFinite(maxChoices) ? maxChoices : 3));
    const hours = shuffle(ALL);
    const tasks: TimeTask[] = [];
    for (let i = 0; i < count; i += 1) {
        const kind = rule.kinds[i % rule.kinds.length];
        // „Pokaži” je uvek pun sat: pomera se samo mala kazaljka
        const half = kind !== "set" && (rule.half === "only" || (rule.half === "mixed" && i % 2 === 0));
        const h = hours[i % hours.length];
        const time: ClockTime = { h, m: half ? 30 : 0 };
        if (kind === "set") {
            // Kazaljka kreće sa broja koji je daleko od traženog
            tasks.push({ kind, time: timeKey(time), choices: [], start: ((h + 5) % 12) + 1 });
            continue;
        }
        if (kind === "read") {
            const others = hourDistractors(h, rule.spread, shuffle).slice(0, choiceCount - 1);
            tasks.push({ kind, time: timeKey(time), choices: shuffle([String(h), ...others.map(String)]), start: 12 });
            continue;
        }
        const others = timeDistractors(time, rule.spread, shuffle).slice(0, choiceCount - 1);
        tasks.push({ kind, time: timeKey(time), choices: shuffle([timeKey(time), ...others.map(timeKey)]), start: 12 });
    }
    // „Koliko je sati?” sa pola sata nema smisla kao izbor broja: takav zadatak postaje „Koji sat pokazuje…?”
    return { mode: "time", boards: [], tasks: tasks.map((task) => (task.kind === "read" && task.time.endsWith(":30") ? toWhich(task, rule.spread, choiceCount, shuffle) : task)), earlyHint: rule.earlyHint };
}

function toWhich(task: TimeTask, spread: Spread, choiceCount: number, shuffle: <T>(list: readonly T[]) => T[]): TimeTask {
    const time = parseTime(task.time)!;
    const others = timeDistractors(time, spread, shuffle).slice(0, choiceCount - 1);
    return { ...task, kind: "which", choices: shuffle([task.time, ...others.map(timeKey)]) };
}

/** Razlika dva sata na brojčaniku (0–6) */
function hourGap(a: number, b: number): number {
    const d = Math.abs(a - b) % 12;
    return Math.min(d, 12 - d);
}

/** Pogrešni sati za „Koliko je sati?”: daleki (bar 3 sata razlike) ili susedni */
function hourDistractors(h: number, spread: Spread, shuffle: <T>(list: readonly T[]) => T[]): number[] {
    const others = ALL.filter((other) => other !== h);
    if (spread === "near") {
        const near = shuffle(others.filter((other) => hourGap(other, h) === 1));
        return [...near, ...shuffle(others.filter((other) => hourGap(other, h) > 1))];
    }
    return shuffle(others.filter((other) => hourGap(other, h) >= 3));
}

/** Pogrešna vremena za „Koji sat pokazuje…?” */
function timeDistractors(time: ClockTime, spread: Spread, shuffle: <T>(list: readonly T[]) => T[]): ClockTime[] {
    const key = timeKey(time);
    const all: ClockTime[] = ALL.flatMap((h) => [{ h, m: 0 as const }, { h, m: 30 as const }]).filter((other) => timeKey(other) !== key);
    if (spread === "near") {
        // Najčešća zabuna: „pola četiri” (3:30) sa tri sata, četiri sata i pola pet
        const next = (time.h % 12) + 1;
        const close: ClockTime[] =
            time.m === 30
                ? [{ h: next, m: 0 }, { h: time.h, m: 0 }, { h: next, m: 30 }]
                : [{ h: time.h, m: 30 }, { h: ((time.h + 10) % 12) + 1, m: 30 }, { h: next, m: 0 }];
        const picked = shuffle(close).filter((other) => timeKey(other) !== key);
        return [...picked, ...shuffle(all.filter((other) => !picked.some((p) => timeKey(p) === timeKey(other))))];
    }
    // Daleko: druga mala kazaljka (bar 3 sata razlike); kod pola sata i velika kazaljka je ista
    return shuffle(all.filter((other) => other.m === time.m && hourGap(other.h, time.h) >= 3));
}

// ── Pitanja i rečenice ────────────────────────────────────────────────────────

export const BOARD_TITLE = "Složi brojeve.";
export const CLOCK_TITLE = "Složi sat.";
export const BOARD_DONE = "Svi brojevi su na svom mestu.";
export const CLOCK_DONE = "Sat je složen.";
export const READ_QUESTION = "Koliko je sati?";

/** Uputstvo na početku table ili sata (bez „gde dodirni” — samo o čemu je zadatak) */
export function boardIntro(board: Pick<ClockBoard, "slots" | "holes">, mode: ClockMode): string {
    if (mode === "board") {
        const sorted = [...board.slots].sort((a, b) => a - b);
        return `${BOARD_TITLE} Svaki broj ima svoje mesto. Od ${numberWord(sorted[0])} do ${numberWord(sorted[sorted.length - 1])}.`;
    }
    return board.holes === "round" ? `${CLOCK_TITLE} Brojevi na satu idu redom.` : `${CLOCK_TITLE} Svaki broj ima svoj oblik.`;
}

/** Pitanje zadatka sa vremenom */
export function taskQuestion(task: Pick<TimeTask, "kind" | "time">): string {
    const time = parseTime(task.time);
    if (!time) return "";
    if (task.kind === "read") return READ_QUESTION;
    if (task.kind === "set") return `Pokaži ${timePhrase(time)}.`;
    return `Koji sat pokazuje ${timePhrase(time)}?`;
}

/** Rečenica posle tačnog odgovora */
export function taskAnswer(task: Pick<TimeTask, "kind" | "time">): string {
    const time = parseTime(task.time);
    if (!time) return "";
    if (time.m === 30) {
        const next = (time.h % 12) + 1;
        return `${capital(timePhrase(time))}. Mala kazaljka je između ${numberWord(time.h)} i ${numberWord(next)}, a velika na šest.`;
    }
    if (task.kind === "set") return `${capital(timePhrase(time))}. Mala kazaljka pokazuje ${numberWord(time.h)}.`;
    return `Sada je ${timePhrase(time)}.`;
}

/** Mirna rečenica posle pogrešnog izbora — uvek tačna činjenica, bez „ne valja” */
export function taskMistake(task: Pick<TimeTask, "kind" | "time">, picked: string): string {
    if (task.kind === "read") return "Pogledaj malu kazaljku.";
    if (task.kind === "set") {
        const hour = Number(picked);
        return Number.isInteger(hour) && hour >= 1 && hour <= 12 ? `Ovo je ${hourPhrase(hour)}.` : "";
    }
    const time = parseTime(picked);
    return time ? `Ovaj sat pokazuje ${timePhrase(time)}.` : "";
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface ClockView extends BaseView {
    mode: ClockMode;
    /** Tabla ili sat: koja je po redu (od 0) */
    board: number;
    slots: number[];
    /** Brojevi koji su na mestu (i oni koji su stajali od početka) */
    filled: number[];
    /** Komadi u korpi redom (i postavljeni — njihovo mesto u korpi ostaje prazno) */
    tray: number[];
    holes: HoleStyle;
    tint: boolean;
    plain: boolean;
    /** Izabran komad (dodir, pa dodir na mesto) */
    selected: number | null;
    /** Pomoć: ovaj komad i njegovo mesto zasvetle */
    hintPiece: number | null;
    /** Upravo postavljen komad (kratko „legne”) */
    last: number | null;
    /** Zadatak sa vremenom */
    task: TimeTaskKind | null;
    time: string;
    choices: string[];
    /** set: gde je mala kazaljka sada (sat 1–12) */
    hand: number;
    /** Pogrešni pokušaji u ovom zadatku */
    wrong: string[];
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
}

export function emptyClockView(totalRounds: number): ClockView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        mode: "board",
        board: 0,
        slots: [],
        filled: [],
        tray: [],
        holes: "digit",
        tint: false,
        plain: false,
        selected: null,
        hintPiece: null,
        last: null,
        task: null,
        time: "",
        choices: [],
        hand: 12,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

/** Polja table u stanju igre */
export function boardView(board: ClockBoard, index: number, mode: ClockMode): Partial<ClockView> {
    return {
        mode,
        board: index,
        slots: [...board.slots],
        filled: [...board.prefilled],
        tray: [...board.tray],
        holes: board.holes,
        tint: board.tint,
        plain: board.plain,
        selected: null,
        hintPiece: null,
        last: null,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

/** Polja zadatka sa vremenom u stanju igre */
export function taskView(task: TimeTask): Partial<ClockView> {
    return {
        mode: "time",
        task: task.kind,
        time: task.time,
        choices: [...task.choices],
        hand: task.start,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        hintPiece: null,
        selected: null,
    };
}

/** Odgovara li komad mestu: na satu i tabli svaki broj ima tačno jedno mesto */
export function fits(piece: number, slot: number): boolean {
    return piece === slot;
}

/** Tačan odgovor zadatka sa vremenom (ključ izbora; za „Pokaži” sat kao broj) */
export function taskAnswerKey(task: Pick<TimeTask, "kind" | "time">): string {
    const time = parseTime(task.time);
    if (!time) return "";
    return task.kind === "which" ? timeKey(time) : String(time.h);
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen. Prvi zadatak prvog nivoa pokazuje ruka (pokazni, ne ocenjuje se);
 * „correct” = iz prvog pokušaja i bez pomoći, „prompted” = uz pomoć (osim pokaznog).
 * Kod slaganja je zadatak jedan komad: „iz prvog pokušaja” znači da od prethodnog komada
 * nijedan komad nije pao na pogrešno mesto i nije bilo pomoći.
 */
export function solveClockView(current: ClockView, level: number, solved: Partial<ClockView> = {}): { next: ClockView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hint || current.hintPiece !== null;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: ClockView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

/** Rezultat nivoa: total = zadaci bez pokaznog; correct = iz prvog pokušaja; prompted = uz pomoć */
export function clockResult(final: ClockView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return {
        score: final.score,
        durationSec,
        correct,
        total,
        prompted: Math.min(final.promptedCount, total - correct),
    };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

const MODES: readonly ClockMode[] = ["board", "clock", "time"];
const KINDS: readonly TimeTaskKind[] = ["read", "set", "which"];
const HOLES: readonly HoleStyle[] = ["digit", "shaped", "round"];

const isClockNumber = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12;
const isDigit = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 9;

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeClockMonitor(state: Partial<ClockView> | null | undefined): ClockView {
    const base = emptyClockView(1);
    if (!state) return base;
    const mode = MODES.includes(state.mode as ClockMode) ? (state.mode as ClockMode) : "board";
    const valid = mode === "board" ? isDigit : isClockNumber;
    const list = (value: unknown, allowed?: number[]) =>
        Array.isArray(value) ? Array.from(new Set(value.filter((item): item is number => valid(item) && (!allowed || allowed.includes(item))))) : [];
    const slots = mode === "time" ? [] : list(state.slots);
    const tray = list(state.tray, slots);
    const filled = list(state.filled, slots);
    const task = mode === "time" && KINDS.includes(state.task as TimeTaskKind) ? (state.task as TimeTaskKind) : null;
    const time = task && parseTime(state.time) ? String(state.time) : "";
    const choices =
        task && time && Array.isArray(state.choices)
            ? Array.from(new Set(state.choices.filter((key): key is string => (task === "which" ? parseTime(key) !== null : isClockNumber(Number(key)) && /^\d{1,2}$/.test(String(key))))))
            : [];
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const piece = (value: unknown) => (valid(value) && slots.includes(value as number) ? (value as number) : null);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        mode,
        board: toCount(state.board, 0),
        slots,
        filled,
        tray,
        holes: HOLES.includes(state.holes as HoleStyle) ? (state.holes as HoleStyle) : mode === "board" ? "digit" : "shaped",
        tint: state.tint === true,
        plain: state.plain === true,
        selected: piece(state.selected),
        hintPiece: piece(state.hintPiece),
        last: piece(state.last),
        task,
        time,
        choices,
        hand: isClockNumber(state.hand) ? state.hand : 12,
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((item): item is string => typeof item === "string" && item.length <= 8).slice(0, 24) : [],
        picked: typeof state.picked === "string" && choices.includes(state.picked) ? state.picked : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
    };
}
