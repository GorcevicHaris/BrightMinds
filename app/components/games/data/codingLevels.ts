// Sadržaj igre „Vodi robota”: na tabli od polja stoji Robotić, a negde dalje cilj (baterija,
// cvet, raketa, blago) i prepreke (kamen, barica, krater…). Dete PRVO složi niz strelica
// (gore, dole, levo, desno — uvek prema tabli, bez okretanja), pa tek onda pusti Robotića
// („Kreni”) da ga izvede korak po korak. Bez Reacta, da bi se table proveravale u testovima;
// crteži su u games/coding/.
//
// Zašto ovako (uzrast 5–10, i deca sa autizmom):
//  • „Programiranje bez računara” (Bee-Bot, ScratchJr, Code-a-pillar): deca od 5–6 godina
//    mogu da planiraju niz koraka unapred kad su koraci konkretni (jedno polje = jedna
//    strelica) i kad odmah VIDE šta je program uradio. Razvija planiranje i radnu memoriju
//    (izvršne funkcije), prostorne pojmove (gore/dole/levo/desno), brojanje koraka i rano
//    računarsko mišljenje: niz → ispravljanje greške (debugging) → ponavljanje (petlja).
//  • Apsolutne strelice (strelica gore uvek vodi ka vrhu table): bez okretanja u mestu,
//    koje mlađoj deci traži da se stave na mesto robota (mentalna rotacija) — to bi bio
//    drugi zadatak.
//  • Učenje bez greške: prvi nivo je jedan korak na tabli 3 × 3 sa samo dve strelice, a prvi
//    zadatak pokazuje ruka (prvo na strelici, pa na „Kreni”; ne ocenjuje se). Na lakim
//    nivoima bledi tragovi pokazuju kuda će Robotić proći dok se program slaže (vizuelna
//    podrška), pa se ta podrška povlači (stimulus fading): bez tragova, veća tabla, prepreke,
//    zvezde usput, pa ispravljanje tuđeg programa i petlja „Ponovi N puta”.
//  • Pomoć posle greške (na lakim nivoima već posle prve i posle čekanja): sledeća prava
//    strelica i sledeće polje na tabli blago zasvetle — nikad se ne reši samo.
//  • Greška nije kazna: Robotić mirno stane ispred prepreke, a glas kaže činjenicu („Robotić
//    je stao: ispred je kamen.”). Program ostaje, pa dete popravi samo ono što treba.
//  • Predvidljiv raspored (TEACCH): tabla, traka programa i dugmad su uvek na istom mestu;
//    strelice su raspoređene kao na tabli (gore je gore), a „Kreni” je u sredini, kao na
//    Bee-Botu. Nema žurbe ni sata; Robotić ide mirno, a uz „Manje animacija” bez klizanja.
//  • Teme koje deca vole (robot, svemir, more, vrt, grad) menjaju se iz zadatka u zadatak,
//    a pravila ostaju ista (novina u predvidljivom okviru).
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak („Robotić želi do
//    baterije. Kojim putem?”).
//
// Nivoi: 1–5 lako (jedan korak → dva u istom pravcu → put sa jednim skretanjem → prepreka →
// 4 × 4), 6–10 srednje (5 × 5 sa preprekama, zvezde usput, duži put, ispravi jednu pogrešnu
// strelicu), 11–15 teško (petlja: stepenice, cik-cak telo od tri strelice, korak pre petlje,
// najkraći program sa ograničenim brojem strelica).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

// ── Strelice ──────────────────────────────────────────────────────────────────

export const CMDS = ["up", "right", "down", "left"] as const;
export type Cmd = (typeof CMDS)[number];

export function isCmd(value: unknown): value is Cmd {
    return typeof value === "string" && (CMDS as readonly string[]).includes(value);
}

const DELTA: Readonly<Record<Cmd, readonly [number, number]>> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
const OPPOSITE: Readonly<Record<Cmd, Cmd>> = { up: "down", down: "up", left: "right", right: "left" };

/** Kako se strelica kaže („Prvo gore, pa desno.”) */
export const CMD_WORDS: Readonly<Record<Cmd, string>> = { up: "gore", right: "desno", down: "dole", left: "levo" };

// ── Teme ──────────────────────────────────────────────────────────────────────

export const THEME_IDS = ["city", "garden", "space", "sea"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const OBSTACLE_IDS = ["cone", "puddle", "rock", "bush", "crater", "coral"] as const;
export type ObstacleId = (typeof OBSTACLE_IDS)[number];

export interface Theme {
    id: ThemeId;
    /** Naziv mesta (za roditelje u dnevniku) */
    place: string;
    /** Cilj: nominativ i genitiv („do baterije”) */
    goal: string;
    goalGen: string;
    obstacles: readonly ObstacleId[];
}

export const THEMES: Readonly<Record<ThemeId, Theme>> = {
    city: { id: "city", place: "Grad", goal: "baterija", goalGen: "baterije", obstacles: ["cone", "puddle"] },
    garden: { id: "garden", place: "Vrt", goal: "cvet", goalGen: "cveta", obstacles: ["rock", "bush"] },
    space: { id: "space", place: "Svemir", goal: "raketa", goalGen: "rakete", obstacles: ["crater", "rock"] },
    sea: { id: "sea", place: "Morsko dno", goal: "blago", goalGen: "blaga", obstacles: ["rock", "coral"] },
};

/** Prepreka (nominativ): „Robotić je stao: ispred je kamen.” */
export const OBSTACLE_NAMES: Readonly<Record<ObstacleId, string>> = {
    cone: "čunj",
    puddle: "barica",
    rock: "kamen",
    bush: "žbun",
    crater: "krater",
    coral: "koral",
};

export function isTheme(value: unknown): value is ThemeId {
    return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

function isObstacle(value: unknown): value is ObstacleId {
    return typeof value === "string" && (OBSTACLE_IDS as readonly string[]).includes(value);
}

// ── Tabla ─────────────────────────────────────────────────────────────────────

/** Najveća tabla (stane i na položen telefon) */
export const MAX_SIDE = 6;

export interface Obstacle {
    cell: number;
    kind: ObstacleId;
}

export interface Board {
    cols: number;
    rows: number;
    start: number;
    goal: number;
    obstacles: Obstacle[];
    /** Zvezde koje Robotić skuplja usput (ćelije) */
    stars: number[];
}

export const cellX = (board: Pick<Board, "cols">, cell: number) => cell % board.cols;
export const cellY = (board: Pick<Board, "cols">, cell: number) => Math.floor(cell / board.cols);

/** Susedna ćelija u pravcu strelice ili null (ivica table) */
export function moveFrom(board: Pick<Board, "cols" | "rows">, cell: number, cmd: Cmd): number | null {
    const x = (cell % board.cols) + DELTA[cmd][0];
    const y = Math.floor(cell / board.cols) + DELTA[cmd][1];
    if (x < 0 || y < 0 || x >= board.cols || y >= board.rows) return null;
    return y * board.cols + x;
}

function obstacleAt(board: Board, cell: number): Obstacle | undefined {
    return board.obstacles.find((o) => o.cell === cell);
}

// ── Izvođenje programa ────────────────────────────────────────────────────────

/**
 * goal: stigao (sa svim zvezdama) · edge: ivica table · blocked: prepreka ·
 * stars: na cilju je, ali bez svih zvezda · short: strelice su potrošene pre cilja
 */
export type Outcome = "goal" | "edge" | "blocked" | "stars" | "short";

export interface Simulation {
    outcome: Outcome;
    /** Ćelije redom, od starta (posle svakog izvedenog koraka po jedna) */
    cells: number[];
    /** Posle koliko izvedenih koraka je pokupljena koja zvezda (indeks u `stars`) */
    got: number[];
    /** Indeks koraka (u razvijenom programu) na kome je stao (prepreka, ivica) ili poslednji izveden */
    at: number;
    /** Gde je Robotić na kraju */
    pos: number;
    obstacle: ObstacleId | null;
}

/**
 * Izvodi program od starta: Robotić staje ispred prepreke ili ivice, a čim stigne do cilja sa
 * svim zvezdama, program je uspeo (ostatak se ne izvodi). Preko cilja sme da pređe dok zvezde
 * nisu pokupljene.
 */
export function simulate(board: Board, program: readonly Cmd[]): Simulation {
    let pos = board.start;
    const cells = [pos];
    const got: number[] = [];
    const finish = (outcome: Outcome, at: number, obstacle: ObstacleId | null = null): Simulation => ({ outcome, cells, got, at, pos, obstacle });
    if (board.goal === pos && board.stars.length === 0) return finish("goal", -1);
    for (let i = 0; i < program.length; i += 1) {
        const next = moveFrom(board, pos, program[i]);
        if (next === null) return finish("edge", i);
        const block = obstacleAt(board, next);
        if (block) return finish("blocked", i, block.kind);
        pos = next;
        cells.push(pos);
        const star = board.stars.indexOf(pos);
        if (star >= 0 && !got.includes(star)) got.push(star);
        if (pos === board.goal && got.length === board.stars.length) return finish("goal", i);
    }
    return finish(pos === board.goal ? "stars" : "short", program.length - 1);
}

/** Razvijen program: koraci pre petlje, pa telo petlje onoliko puta koliko piše */
export function expand(pre: readonly Cmd[], body: readonly Cmd[], times: number): Cmd[] {
    const out = [...pre];
    for (let i = 0; i < times; i += 1) out.push(...body);
    return out;
}

/** Gde u traci stoji korak razvijenog programa (za isticanje strelice dok Robotić ide) */
export function chipOf(view: Pick<CodingView, "pre" | "body" | "times">, step: number): { zone: Zone; index: number; rep: number } | null {
    if (step < 0) return null;
    if (step < view.pre.length) return { zone: "pre", index: step, rep: 0 };
    const rest = step - view.pre.length;
    if (view.body.length === 0 || view.times <= 0) return null;
    const rep = Math.floor(rest / view.body.length);
    if (rep >= view.times) return null;
    return { zone: "loop", index: rest % view.body.length, rep };
}

// ── Najkraći put (pomoć i provera tabli) ──────────────────────────────────────

/** Udaljenosti (broj koraka) od ćelije `from` do svih ćelija, samo ponuđenim strelicama; -1 = ne može */
function distances(board: Board, from: number, arrows: readonly Cmd[]): number[] {
    const size = board.cols * board.rows;
    const dist = new Array<number>(size).fill(-1);
    dist[from] = 0;
    const queue = [from];
    while (queue.length) {
        const cell = queue.shift() as number;
        for (const cmd of arrows) {
            const next = moveFrom(board, cell, cmd);
            if (next === null || dist[next] >= 0 || obstacleAt(board, next)) continue;
            dist[next] = dist[cell] + 1;
            queue.push(next);
        }
    }
    return dist;
}

function permutations<T>(items: readonly T[]): T[][] {
    if (items.length <= 1) return [items.slice()];
    const out: T[][] = [];
    items.forEach((item, i) => {
        for (const rest of permutations([...items.slice(0, i), ...items.slice(i + 1)])) out.push([item, ...rest]);
    });
    return out;
}

/** Dužina najkraćeg obilaska od `from` preko preostalih zvezda do cilja i prvi cilj na tom putu (null = ne može) */
function tour(board: Board, from: number, got: readonly number[], arrows: readonly Cmd[]): { length: number; first: number } | null {
    const left = board.stars.map((cell, i) => (got.includes(i) ? -1 : cell)).filter((cell) => cell >= 0);
    let best: { length: number; first: number } | null = null;
    for (const order of permutations(left)) {
        const stops = [...order, board.goal];
        let length = 0;
        let at = from;
        let ok = true;
        for (const stop of stops) {
            const d = distances(board, at, arrows)[stop];
            if (d < 0) {
                ok = false;
                break;
            }
            length += d;
            at = stop;
        }
        if (ok && (!best || length < best.length)) best = { length, first: stops[0] };
    }
    return best;
}

/**
 * Sledeći korak najkraćim putem (preko zvezda do cilja) iz `pos`; prednost ima isti pravac kao
 * prethodni korak (manje skretanja — lakše za dete). null = nema puta.
 */
export function nextStep(board: Board, pos: number, got: readonly number[], arrows: readonly Cmd[], last: Cmd | null): Cmd | null {
    const plan = tour(board, pos, got, arrows);
    if (!plan || plan.length === 0) return null;
    // Udaljenost DO prvog cilja: pretraga od cilja unazad (suprotnim strelicama)
    const toFirst = distances(board, plan.first, arrows.map((cmd) => OPPOSITE[cmd]));
    const order = last ? [last, ...arrows.filter((cmd) => cmd !== last)] : [...arrows];
    for (const cmd of order) {
        const next = moveFrom(board, pos, cmd);
        if (next === null || obstacleAt(board, next)) continue;
        // Korak mora da skrati put do prvog cilja (dalji deo puta se time ne produžava)
        if (toFirst[next] >= 0 && toFirst[next] === toFirst[pos] - 1) return cmd;
    }
    return null;
}

/** Najkraći program (sa najmanje skretanja usput) */
export function shortestProgram(board: Board, arrows: readonly Cmd[]): Cmd[] | null {
    const program: Cmd[] = [];
    let sim = simulate(board, program);
    while (sim.outcome !== "goal") {
        if (program.length > board.cols * board.rows * 3) return null;
        const step = nextStep(board, sim.pos, sim.got, arrows, program[program.length - 1] ?? null);
        if (!step) return null;
        program.push(step);
        sim = simulate(board, program);
        if (sim.outcome === "edge" || sim.outcome === "blocked") return null;
    }
    return program;
}

function turnsOf(program: readonly Cmd[]): number {
    let turns = 0;
    for (let i = 1; i < program.length; i += 1) if (program[i] !== program[i - 1]) turns += 1;
    return turns;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/** plan: dete slaže ceo put · debug: ispravi jednu pogrešnu strelicu · loop: petlja „Ponovi N puta” */
export type CodingKind = "plan" | "debug" | "loop";
/** Deo programa: pre petlje ili telo petlje */
export type Zone = "pre" | "loop";

export interface CodingLevel {
    kind: CodingKind;
    cols: number;
    rows: number;
    /** Dužina najkraćeg puta (najmanje, najviše) */
    steps: readonly [number, number];
    /** Broj skretanja na najkraćem putu (plan i debug) */
    turns?: readonly [number, number];
    obstacles: number;
    /** Koliko prepreka mora da stoji „na putu” (između starta i cilja) */
    inWay?: number;
    stars: number;
    /** Koliko strelica je ponuđeno (2–4; najviše koliko dete sme da vidi izbora) */
    arrows: number;
    /** Bledi tragovi pokazuju kuda će Robotić proći dok se program slaže */
    preview: boolean;
    rounds: number;
    earlyHint: boolean;
    /** Petlja: koliko strelica ima telo, koliko puta se ponavlja, koliko koraka ide pre petlje */
    body?: number;
    times?: readonly [number, number];
    pre?: readonly [number, number];
    /** Najkraći program: dete samo bira šta ide pre petlje, a šta u petlju (ograničen broj strelica) */
    free?: boolean;
}

export const CODING_LEVELS: readonly CodingLevel[] = [
    // Lako: jedan korak → dva u istom pravcu → jedno skretanje → prepreka → veća tabla (uz tragove)
    { kind: "plan", cols: 3, rows: 3, steps: [1, 1], turns: [0, 0], obstacles: 0, stars: 0, arrows: 2, preview: true, rounds: 4, earlyHint: true },
    { kind: "plan", cols: 3, rows: 3, steps: [2, 2], turns: [0, 0], obstacles: 0, stars: 0, arrows: 2, preview: true, rounds: 4, earlyHint: true },
    { kind: "plan", cols: 3, rows: 3, steps: [2, 3], turns: [1, 1], obstacles: 0, stars: 0, arrows: 3, preview: true, rounds: 4, earlyHint: true },
    { kind: "plan", cols: 3, rows: 4, steps: [3, 4], turns: [1, 2], obstacles: 1, inWay: 1, stars: 0, arrows: 4, preview: true, rounds: 4, earlyHint: true },
    { kind: "plan", cols: 4, rows: 4, steps: [4, 4], turns: [1, 3], obstacles: 2, inWay: 1, stars: 0, arrows: 4, preview: false, rounds: 4, earlyHint: true },
    // Srednje: 5 × 5 sa preprekama, zvezde usput, duži put, ispravi jednu pogrešnu strelicu
    { kind: "plan", cols: 5, rows: 5, steps: [5, 5], turns: [1, 3], obstacles: 3, inWay: 2, stars: 0, arrows: 4, preview: false, rounds: 3, earlyHint: false },
    { kind: "plan", cols: 5, rows: 5, steps: [4, 6], turns: [1, 4], obstacles: 2, inWay: 1, stars: 1, arrows: 4, preview: false, rounds: 3, earlyHint: false },
    { kind: "plan", cols: 6, rows: 5, steps: [6, 7], turns: [2, 5], obstacles: 3, inWay: 1, stars: 2, arrows: 4, preview: false, rounds: 3, earlyHint: false },
    { kind: "debug", cols: 4, rows: 4, steps: [3, 4], turns: [1, 2], obstacles: 2, inWay: 1, stars: 0, arrows: 4, preview: false, rounds: 3, earlyHint: false },
    { kind: "debug", cols: 5, rows: 5, steps: [6, 6], turns: [2, 4], obstacles: 3, inWay: 1, stars: 1, arrows: 4, preview: false, rounds: 3, earlyHint: false },
    // Teško: petlja „Ponovi N puta” — stepenice, cik-cak, korak pre petlje, najkraći program
    { kind: "loop", cols: 0, rows: 0, steps: [4, 4], obstacles: 2, stars: 0, arrows: 4, preview: false, rounds: 3, earlyHint: false, body: 2, times: [2, 2], pre: [0, 0] },
    { kind: "loop", cols: 0, rows: 0, steps: [6, 6], obstacles: 3, stars: 0, arrows: 4, preview: false, rounds: 3, earlyHint: false, body: 2, times: [3, 3], pre: [0, 0] },
    { kind: "loop", cols: 0, rows: 0, steps: [6, 6], obstacles: 3, stars: 0, arrows: 4, preview: false, rounds: 3, earlyHint: false, body: 3, times: [2, 2], pre: [0, 0] },
    { kind: "loop", cols: 0, rows: 0, steps: [5, 7], obstacles: 3, stars: 0, arrows: 4, preview: false, rounds: 3, earlyHint: false, body: 2, times: [2, 3], pre: [1, 1] },
    { kind: "loop", cols: 0, rows: 0, steps: [6, 7], obstacles: 3, stars: 2, arrows: 4, preview: false, rounds: 3, earlyHint: false, body: 2, times: [3, 3], pre: [0, 1], free: true },
];

export const CODING_MAX_LEVEL = CODING_LEVELS.length;

export function codingLevel(level: number): CodingLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), CODING_MAX_LEVEL);
    return CODING_LEVELS[safe - 1];
}

/** Najduži program bez petlje (traka staje i na uzak telefon) */
export const MAX_PROGRAM = 9;

// ── Plan nivoa ────────────────────────────────────────────────────────────────

export interface CodingRound extends Board {
    kind: CodingKind;
    theme: ThemeId;
    /** Ponuđene strelice (redom gore, desno, dole, levo) */
    arrows: Cmd[];
    preview: boolean;
    /** Koliko strelica staje pre petlje (bez petlje: ceo program) */
    preSlots: number;
    /** Koliko strelica staje u telo petlje (0 = nema petlje) */
    bodySlots: number;
    /** Koliko puta se telo ponavlja (0 = nema petlje) */
    times: number;
    /** Najkraći program: najviše ovoliko strelica ukupno, a dete bira gde idu (0 = nema ograničenja) */
    limit: number;
    /** Gotov program na početku (ispravljanje greške), inače prazno */
    program: Cmd[];
    /** Rešenje (za pomoć): koraci pre petlje i telo petlje */
    solution: { pre: Cmd[]; body: Cmd[] };
}

interface BuildOptions {
    maxRounds: number;
    maxChoices: number;
    random?: () => number;
}

type Random = () => number;

function pickFrom<T>(random: Random, list: readonly T[]): T {
    return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

function intIn(random: Random, [min, max]: readonly [number, number]): number {
    return min + Math.min(max - min, Math.floor(random() * (max - min + 1)));
}

function shuffled<T>(random: Random, list: readonly T[]): T[] {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** Ponuđene strelice: sve potrebne, pa još nasumičnih do `count`, redom kao na krstu */
function offerArrows(random: Random, needed: readonly Cmd[], count: number): Cmd[] {
    const size = Math.max(count, needed.length);
    const set = new Set<Cmd>(needed);
    for (const cmd of shuffled(random, CMDS)) if (set.size < size) set.add(cmd);
    return CMDS.filter((cmd) => set.has(cmd));
}

function inBox(board: Board, cell: number, corners: readonly number[]): boolean {
    const xs = corners.map((c) => cellX(board, c));
    const ys = corners.map((c) => cellY(board, c));
    const x = cellX(board, cell);
    const y = cellY(board, cell);
    return x >= Math.min(...xs) && x <= Math.max(...xs) && y >= Math.min(...ys) && y <= Math.max(...ys);
}

/** Tabla za „plan” i „debug”: nasumični start, cilj, prepreke i zvezde dok ne ispune pravila nivoa */
function planBoard(rule: CodingLevel, theme: ThemeId, arrowCount: number, random: Random, demo: boolean): { board: Board; solution: Cmd[] } | null {
    const { cols, rows } = rule;
    const size = cols * rows;
    for (let attempt = 0; attempt < 800; attempt += 1) {
        const free = shuffled(
            random,
            Array.from({ length: size }, (_, i) => i)
        );
        const start = demo ? cols + 0 : free.pop() as number;
        const goal = demo ? cols + 1 : (free.pop() as number);
        const rest = free.filter((cell) => cell !== start && cell !== goal);
        const obstacles: Obstacle[] = rest.slice(0, rule.obstacles).map((cell) => ({ cell, kind: pickFrom(random, THEMES[theme].obstacles) }));
        const stars = rest.slice(rule.obstacles, rule.obstacles + rule.stars);
        const board: Board = { cols, rows, start, goal, obstacles, stars };
        const solution = shortestProgram(board, CMDS);
        if (!solution) continue;
        if (solution.length < rule.steps[0] || solution.length > rule.steps[1]) continue;
        const turns = turnsOf(solution);
        if (rule.turns && (turns < rule.turns[0] || turns > rule.turns[1])) continue;
        // Ravan put (bez skretanja) ide pravo, a „jedno skretanje” traži pomak u oba pravca
        if (rule.turns && rule.turns[1] === 0 && cellX(board, start) !== cellX(board, goal) && cellY(board, start) !== cellY(board, goal)) continue;
        const needed = Array.from(new Set(solution));
        if (needed.length > arrowCount) continue;
        // Prepreke treba da budu na putu (između starta, zvezda i cilja), a ne samo ukras po ivici
        const corners = [start, goal, ...stars];
        if (rule.inWay && obstacles.filter((o) => inBox(board, o.cell, corners)).length < rule.inWay) continue;
        // Zvezda usput ne sme da bude na pravom putu do cilja (inače je „usput” bez razmišljanja)
        if (stars.length > 0) {
            const direct = shortestProgram({ ...board, stars: [] }, CMDS);
            if (direct && simulate(board, direct).outcome === "goal") continue;
        }
        return { board, solution };
    }
    return null;
}

/** Rezervna tabla kad slučaj ne nađe dobru (ne bi trebalo da se desi): prava staza */
function fallbackBoard(rule: CodingLevel): { board: Board; solution: Cmd[] } {
    const cols = Math.max(rule.cols, 3);
    const rows = Math.max(rule.rows, 3);
    const length = Math.min(rule.steps[0], cols - 1);
    const y = rows - 1;
    const board: Board = { cols, rows, start: y * cols, goal: y * cols + length, obstacles: [], stars: [] };
    return { board, solution: Array.from({ length }, () => "right" as Cmd) };
}

/** Rezerva za ispravljanje: prva strelica okrenuta na suprotnu stranu (Robotić odmah skrene) */
function fallbackBug(solution: readonly Cmd[]): Cmd[] {
    const program = [...solution];
    if (program.length > 0) program[0] = OPPOSITE[program[0]];
    return program;
}

/** Program sa jednom pogrešnom strelicom: samo jedna izmena (baš ta strelica) ga popravlja */
function buggyProgram(board: Board, solution: readonly Cmd[], arrows: readonly Cmd[], random: Random, middle: boolean): { program: Cmd[]; bug: number } | null {
    const indices = shuffled(
        random,
        solution.map((_, i) => i)
    ).filter((i) => !middle || (i > 0 && i < solution.length - 1));
    for (const i of indices) {
        for (const wrong of shuffled(
            random,
            arrows.filter((cmd) => cmd !== solution[i])
        )) {
            const program = [...solution];
            program[i] = wrong;
            if (simulate(board, program).outcome === "goal") continue;
            let unique = true;
            for (let j = 0; j < program.length && unique; j += 1) {
                for (const cmd of arrows) {
                    if (cmd === program[j]) continue;
                    const fixed = [...program];
                    fixed[j] = cmd;
                    const ok = simulate(board, fixed).outcome === "goal";
                    if (ok !== (j === i && cmd === solution[i])) {
                        unique = false;
                        break;
                    }
                }
            }
            if (unique) return { program, bug: i };
        }
    }
    return null;
}

/** Telo petlje: stepenice (vodoravno + uspravno), a od tri strelice cik-cak (bez vraćanja nazad) */
function loopBody(random: Random, length: number): Cmd[] {
    const h = pickFrom<Cmd>(random, ["right", "left"]);
    const v = pickFrom<Cmd>(random, ["up", "down"]);
    if (length === 2) return random() < 0.5 ? [h, v] : [v, h];
    const shapes: Cmd[][] = [
        [h, h, v],
        [v, v, h],
        [h, v, h],
        [v, h, v],
        [h, v, v],
        [v, h, h],
    ];
    return pickFrom(random, shapes);
}

/** Tabla za petlju: put se gradi iz tela, a tabla je tek malo veća od puta */
function loopBoard(rule: CodingLevel, theme: ThemeId, random: Random): { board: Board; pre: Cmd[]; body: Cmd[]; times: number } | null {
    for (let attempt = 0; attempt < 400; attempt += 1) {
        const body = loopBody(random, rule.body ?? 2);
        const times = intIn(random, rule.times ?? [2, 2]);
        const preCount = intIn(random, rule.pre ?? [0, 0]);
        // Korak pre petlje: ne vraća se nazad i ne ide istim pravcem kao prvi korak tela (tada bi bio deo stepenika)
        const pre: Cmd[] = [];
        for (let i = 0; i < preCount; i += 1) {
            const options = CMDS.filter((cmd) => cmd !== OPPOSITE[body[0]] && !body.includes(OPPOSITE[cmd]) && cmd !== body[0]);
            if (options.length === 0) break;
            pre.push(pickFrom(random, options));
        }
        if (pre.length !== preCount) continue;
        const program = expand(pre, body, times);
        if (program.length < rule.steps[0] || program.length > rule.steps[1]) continue;
        // Mere puta
        let x = 0;
        let y = 0;
        const points = [[0, 0]];
        for (const cmd of program) {
            x += DELTA[cmd][0];
            y += DELTA[cmd][1];
            points.push([x, y]);
        }
        const xs = points.map((p) => p[0]);
        const ys = points.map((p) => p[1]);
        const width = Math.max(...xs) - Math.min(...xs) + 1;
        const height = Math.max(...ys) - Math.min(...ys) + 1;
        const cols = Math.min(MAX_SIDE, Math.max(3, width + (random() < 0.6 ? 1 : 0)));
        const rows = Math.min(MAX_SIDE, Math.max(3, height + (random() < 0.6 ? 1 : 0)));
        if (width > cols || height > rows) continue;
        const offX = -Math.min(...xs) + Math.floor(random() * (cols - width + 1));
        const offY = -Math.min(...ys) + Math.floor(random() * (rows - height + 1));
        const cells = points.map(([px, py]) => (py + offY) * cols + px + offX);
        if (new Set(cells).size !== cells.length) continue;
        const start = cells[0];
        const goal = cells[cells.length - 1];
        // Prepreke pored puta (kao zid ispod stepenica): zatvaraju prečice i daju tabli izgled
        const near = new Set<number>();
        const probe: Board = { cols, rows, start, goal, obstacles: [], stars: [] };
        for (const cell of cells) for (const cmd of CMDS) {
            const next = moveFrom(probe, cell, cmd);
            if (next !== null && !cells.includes(next)) near.add(next);
        }
        const spots = shuffled(random, [...near]).slice(0, rule.obstacles);
        const obstacles: Obstacle[] = spots.map((cell) => ({ cell, kind: pickFrom(random, THEMES[theme].obstacles) }));
        // Zvezde na uglovima stepenica (posle svakog ponavljanja tela)
        const corners: number[] = [];
        for (let rep = 1; rep < times; rep += 1) corners.push(cells[pre.length + rep * body.length]);
        const stars = shuffled(random, corners).slice(0, rule.stars).sort((a, b) => cells.indexOf(a) - cells.indexOf(b));
        if (stars.length < Math.min(rule.stars, corners.length)) continue;
        const board: Board = { cols, rows, start, goal, obstacles, stars };
        if (simulate(board, program).outcome !== "goal") continue;
        return { board, pre, body, times };
    }
    return null;
}

/**
 * Plan nivoa: zadaci jedan za drugim, teme se smenjuju (grad, vrt, svemir, more). Prvi zadatak
 * prvog nivoa (pokazni) je jedan korak desno do baterije. `random` daje [0, 1).
 */
export function buildCodingLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): CodingRound[] {
    const rule = codingLevel(level);
    const count = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    // Najviše koliko izbora dete sme da vidi, ali nikad manje od dve strelice
    const limit = Math.max(2, Math.min(rule.arrows, 4, Number.isFinite(maxChoices) ? maxChoices : 4));
    const first = (Math.max(1, Math.round(level)) - 1) % THEME_IDS.length;
    const rounds: CodingRound[] = [];
    let lastStart = -1;
    for (let index = 0; index < count; index += 1) {
        const theme = THEME_IDS[(first + index) % THEME_IDS.length];
        const demo = level === 1 && index === 0;
        if (rule.kind === "loop") {
            // Rezerva (ne bi trebalo da zatreba): stepenice gore-desno na tabli 4 × 4
            const built = loopBoard(rule, theme, random) ?? { board: { cols: 4, rows: 4, start: 12, goal: 6, obstacles: [], stars: [] }, pre: [], body: ["up", "right"] as Cmd[], times: 2 };
            const { board, pre, body, times } = built;
            const needed = Array.from(new Set([...pre, ...body]));
            const free = rule.free === true;
            rounds.push({
                ...board,
                kind: "loop",
                theme,
                arrows: offerArrows(random, needed, limit),
                preview: false,
                preSlots: free ? pre.length + body.length : pre.length,
                bodySlots: free ? pre.length + body.length : body.length,
                times,
                limit: free ? pre.length + body.length : 0,
                program: [],
                solution: { pre, body },
            });
            continue;
        }
        // Isti start dva puta zaredom bi izgledao kao isti zadatak
        let built = planBoard(rule, theme, limit, random, demo);
        if (built && built.board.start === lastStart && !demo) built = planBoard(rule, theme, limit, random, false) ?? built;
        let { board, solution } = built ?? fallbackBoard(rule);
        let arrows = offerArrows(random, Array.from(new Set(solution)), limit);
        let program: Cmd[] = [];
        if (rule.kind === "debug") {
            let bug = buggyProgram(board, solution, arrows, random, level >= 10);
            // Retko: tabla na kojoj nijedna greška nije jednoznačna — nova tabla
            for (let tries = 0; !bug && tries < 40; tries += 1) {
                const again = planBoard(rule, theme, limit, random, false) ?? fallbackBoard(rule);
                board = again.board;
                solution = again.solution;
                arrows = offerArrows(random, Array.from(new Set(solution)), limit);
                bug = buggyProgram(board, solution, arrows, random, level >= 10);
            }
            program = bug ? bug.program : fallbackBug(solution);
        }
        lastStart = board.start;
        rounds.push({
            ...board,
            kind: rule.kind,
            theme,
            arrows,
            preview: rule.preview,
            preSlots: rule.kind === "debug" ? solution.length : Math.min(MAX_PROGRAM, solution.length + 3),
            bodySlots: 0,
            times: 0,
            limit: 0,
            program,
            solution: { pre: solution, body: [] },
        });
    }
    return rounds;
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

/** Broj sa imenicom u pravom obliku: 1 korak, 2 koraka, 5 koraka */
export function countWord(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
    return `${n} ${many}`;
}

const STAR_WORDS = ["", "zvezdu", "obe zvezde", "sve tri zvezde", "sve četiri zvezde"];
const TIMES_WORDS = ["", "jednom", "dva puta", "tri puta", "četiri puta", "pet puta", "šest puta"];

export function timesWord(times: number): string {
    return TIMES_WORDS[times] ?? `${times} puta`;
}

type QuestionView = Pick<CodingView, "kind" | "theme" | "stars" | "times" | "limit" | "preSlots" | "solution">;

/** Pitanje na početku zadatka */
export function codingQuestion(view: QuestionView): string {
    const theme = THEMES[view.theme];
    const goal = `Robotić želi do ${theme.goalGen}.`;
    const stars = view.stars.length > 0 ? ` Usput neka pokupi ${STAR_WORDS[view.stars.length] ?? "sve zvezde"}.` : "";
    if (view.kind === "debug") return `${goal}${stars} Jedna strelica je pogrešna. Koja?`;
    if (view.kind === "loop") {
        if (view.limit > 0) return `${goal}${stars} Ima samo ${countWord(view.limit, "strelicu", "strelice", "strelica")}. Šta se ponavlja?`;
        const first = view.solution.pre.length > 0 ? ` Prvo ${countWord(view.solution.pre.length, "korak", "koraka", "koraka")}, pa šta se ponavlja?` : ` Šta se ponavlja ${timesWord(view.times)}?`;
        return `${goal}${first}`;
    }
    return `${goal}${stars} Kojim putem?`;
}

const STAR_GEN = ["", "zvezde", "obe zvezde", "sve tri zvezde", "sve četiri zvezde"];

/** Kratak natpis na kartici (glas čita celo pitanje): staje u dva reda i na uzak telefon */
export function codingTitle(view: QuestionView): string {
    const theme = THEMES[view.theme];
    if (view.kind === "debug") return "Jedna strelica je pogrešna. Koja?";
    if (view.kind === "loop") {
        if (view.limit > 0) return `Samo ${countWord(view.limit, "strelica", "strelice", "strelica")}. Šta se ponavlja?`;
        if (view.solution.pre.length > 0) return `Prvo ${countWord(view.solution.pre.length, "korak", "koraka", "koraka")}, pa šta se ponavlja?`;
        return `Šta se ponavlja ${timesWord(view.times)}?`;
    }
    if (view.stars.length > 0) return `Robotić ide do ${theme.goalGen} preko ${STAR_GEN[view.stars.length] ?? "zvezda"}.`;
    return `Robotić želi do ${theme.goalGen}. Kojim putem?`;
}

/** Put rečima: „Prvo gore, pa 2 koraka desno.” (najviše tri dela) */
export function pathTip(program: readonly Cmd[]): string {
    const parts: string[] = [];
    let i = 0;
    while (i < program.length && parts.length < 3) {
        let n = 1;
        while (i + n < program.length && program[i + n] === program[i]) n += 1;
        parts.push(n === 1 ? CMD_WORDS[program[i]] : `${countWord(n, "korak", "koraka", "koraka")} ${CMD_WORDS[program[i]]}`);
        i += n;
    }
    if (parts.length === 0) return "";
    const more = i < program.length ? ", pa dalje" : "";
    return `Prvo ${parts.join(", pa ")}${more}.`;
}

/** Savet uz pomoć (posle greške): šta treba, bez reči o dodirivanju */
export function hintSentence(view: Pick<CodingView, "kind" | "solution" | "pre" | "program">): string {
    if (view.kind === "debug") {
        const wrong = view.pre.findIndex((cmd, i) => cmd !== view.solution.pre[i]);
        return wrong >= 0 ? `Pogrešna je ${wrong + 1}. strelica.` : "";
    }
    if (view.kind === "loop") {
        const body = view.solution.body.map((cmd) => CMD_WORDS[cmd]).join(", pa ");
        return view.solution.pre.length > 0 ? `${pathTip(view.solution.pre).replace(/\.$/, "")}, a u okviru: ${body}.` : `U okviru: ${body}.`;
    }
    return pathTip(view.solution.pre);
}

export interface CodingMistake {
    outcome: Exclude<Outcome, "goal">;
    obstacle: ObstacleId | null;
    /** Koliko zvezda je ostalo */
    missing: number;
}

/** Zašto Robotić nije stigao — mirna činjenica */
export function mistakeSentence(mistake: CodingMistake, theme: ThemeId): string {
    switch (mistake.outcome) {
        case "blocked":
            return `Robotić je stao: ispred je ${OBSTACLE_NAMES[mistake.obstacle ?? "rock"]}.`;
        case "edge":
            return "Robotić je stao: dalje nema puta.";
        case "stars":
            return mistake.missing > 1 ? "Robotić je stigao, ali zvezde su ostale." : "Robotić je stigao, ali jedna zvezda je ostala.";
        default:
            return `Robotić nije stigao do ${THEMES[theme].goalGen}.`;
    }
}

export function doneSentence(view: Pick<CodingView, "theme" | "stars">): string {
    const theme = THEMES[view.theme];
    return view.stars.length > 0 ? `Robotić je pokupio ${view.stars.length > 1 ? "zvezde" : "zvezdu"} i stigao do ${theme.goalGen}.` : `Robotić je stigao do ${theme.goalGen}.`;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface CodingView extends BaseView {
    promptedCount: number;
    kind: CodingKind;
    theme: ThemeId;
    cols: number;
    rows: number;
    start: number;
    goal: number;
    obstacles: Obstacle[];
    stars: number[];
    arrows: Cmd[];
    preview: boolean;
    preSlots: number;
    bodySlots: number;
    times: number;
    limit: number;
    /** Gotov program sa početka zadatka (ispravljanje greške) */
    program: Cmd[];
    solution: { pre: Cmd[]; body: Cmd[] };
    /** Program koji dete slaže: pre petlje (bez petlje: ceo program) i telo petlje */
    pre: Cmd[];
    body: Cmd[];
    /** Najkraći program: deo u koji idu nove strelice */
    zone: Zone;
    /** Ispravljanje: izabrana strelica u traci koja se menja */
    fixAt: number | null;
    /** Izvođenje: Robotić ide, gde je, kuda gleda, koji korak izvodi */
    running: boolean;
    robot: number;
    facing: Cmd | null;
    step: number;
    /** Ćelije kroz koje je Robotić prošao u ovom izvođenju */
    trail: number[];
    /** Pokupljene zvezde (indeksi u `stars`) */
    got: number[];
    /** Robotić je udario u prepreku ili ivicu (pravac) — `bumpKey` ponovo pokreće pokret */
    bump: Cmd | null;
    bumpKey: number;
    /** Korak na kome je stao (isticanje strelice u traci) */
    failAt: number | null;
    mistake: CodingMistake | null;
    feedback: FeedbackKind;
    hint: boolean;
    /** Neuspela izvođenja u ovom zadatku */
    misses: number;
    /** Koliko puta je Robotić krenuo u ovom zadatku */
    runs: number;
}

export function emptyCodingView(totalRounds: number): CodingView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "plan",
        theme: "city",
        cols: 3,
        rows: 3,
        start: 0,
        goal: 0,
        obstacles: [],
        stars: [],
        arrows: [],
        preview: false,
        preSlots: 0,
        bodySlots: 0,
        times: 0,
        limit: 0,
        program: [],
        solution: { pre: [], body: [] },
        pre: [],
        body: [],
        zone: "pre",
        fixAt: null,
        running: false,
        robot: 0,
        facing: null,
        step: -1,
        trail: [],
        got: [],
        bump: null,
        bumpKey: 0,
        failAt: null,
        mistake: null,
        feedback: null,
        hint: false,
        misses: 0,
        runs: 0,
    };
}

/** Stanje izvođenja na početku (Robotić na startu, bez tragova) */
export function resetRun(start: number): Partial<CodingView> {
    return { running: false, robot: start, facing: null, step: -1, trail: [], got: [], bump: null, failAt: null, mistake: null, feedback: null };
}

export function codingRoundView(round: CodingRound): Partial<CodingView> {
    return {
        ...resetRun(round.start),
        kind: round.kind,
        theme: round.theme,
        cols: round.cols,
        rows: round.rows,
        start: round.start,
        goal: round.goal,
        obstacles: round.obstacles.map((o) => ({ ...o })),
        stars: [...round.stars],
        arrows: [...round.arrows],
        preview: round.preview,
        preSlots: round.preSlots,
        bodySlots: round.bodySlots,
        times: round.times,
        limit: round.limit,
        program: [...round.program],
        solution: { pre: [...round.solution.pre], body: [...round.solution.body] },
        pre: [...round.program],
        body: [],
        zone: "pre",
        fixAt: null,
        hint: false,
        misses: 0,
        runs: 0,
    };
}

export function boardOf(view: Pick<CodingView, "cols" | "rows" | "start" | "goal" | "obstacles" | "stars">): Board {
    return { cols: view.cols, rows: view.rows, start: view.start, goal: view.goal, obstacles: view.obstacles, stars: view.stars };
}

/** Razvijen program iz stanja */
export function programOf(view: Pick<CodingView, "pre" | "body" | "times">): Cmd[] {
    return expand(view.pre, view.body, view.body.length > 0 ? view.times : 0);
}

/** Koliko strelica je u programu */
export function arrowCount(view: Pick<CodingView, "pre" | "body">): number {
    return view.pre.length + view.body.length;
}

/** Gde ide sledeća strelica (null = program je pun) */
export function nextZone(view: Pick<CodingView, "kind" | "pre" | "body" | "preSlots" | "bodySlots" | "limit" | "zone">): Zone | null {
    if (view.kind === "debug") return null;
    if (view.limit > 0) return arrowCount(view) < view.limit ? view.zone : null;
    if (view.pre.length < view.preSlots) return "pre";
    if (view.bodySlots > 0 && view.body.length < view.bodySlots) return "loop";
    return null;
}

/** Program može da krene: bar jedna strelica (a petlja nije prazna kad je ima) */
export function canRun(view: Pick<CodingView, "pre" | "body" | "running" | "feedback">): boolean {
    if (view.running || view.feedback === "correct") return false;
    return view.pre.length + view.body.length > 0;
}

// ── Izmene programa (čiste funkcije; igra ih samo poziva) ─────────────────────

type Editable = Pick<CodingView, "kind" | "pre" | "body" | "preSlots" | "bodySlots" | "limit" | "zone" | "fixAt" | "arrows">;

/** Nova strelica: na kraj dela programa u koji ide (ili umesto izabrane strelice kod ispravljanja) */
export function addCmd(view: Editable, cmd: Cmd): Partial<CodingView> | null {
    if (!view.arrows.includes(cmd)) return null;
    if (view.kind === "debug") {
        if (view.fixAt === null || view.fixAt >= view.pre.length) return null;
        const pre = [...view.pre];
        pre[view.fixAt] = cmd;
        return { pre, fixAt: null };
    }
    const zone = nextZone(view);
    if (zone === "pre") return { pre: [...view.pre, cmd] };
    if (zone === "loop") return { body: [...view.body, cmd] };
    return null;
}

/** „Obriši”: poslednja strelica (u najkraćem programu iz dela u kome se radi) */
export function undoCmd(view: Editable): Partial<CodingView> | null {
    if (view.kind === "debug") return null;
    const fromBody = view.limit > 0 ? (view.zone === "loop" ? view.body.length > 0 : view.pre.length === 0) : view.body.length > 0;
    if (fromBody && view.body.length > 0) return { body: view.body.slice(0, -1) };
    if (view.pre.length > 0) return { pre: view.pre.slice(0, -1) };
    if (view.body.length > 0) return { body: view.body.slice(0, -1) };
    return null;
}

export function clearCmds(view: Editable): Partial<CodingView> | null {
    if (view.kind === "debug" || view.pre.length + view.body.length === 0) return null;
    return { pre: [], body: [], zone: "pre" };
}

/** Ispravljanje: izbor strelice u traci (ponovni izbor iste je poništava) */
export function selectFix(view: Editable, index: number): Partial<CodingView> | null {
    if (view.kind !== "debug" || !Number.isInteger(index) || index < 0 || index >= view.pre.length) return null;
    return { fixAt: view.fixAt === index ? null : index };
}

export function selectZone(view: Editable, zone: Zone): Partial<CodingView> | null {
    if (view.limit <= 0 || view.zone === zone) return null;
    return { zone };
}

// ── Pomoć ─────────────────────────────────────────────────────────────────────

export interface HintTarget {
    /** Ključ radnje koju treba istaći (`cmd:up`, `undo`, `run`, `fix:2`, `zone:loop`) */
    action: string;
    /** Polje na tabli koje sledeće treba da zasvetli */
    cell: number | null;
}

const solutionCache = new Map<string, { pre: Cmd[]; body: Cmd[] }[]>();

/** Svi programi sa petljom koji stižu do cilja u okviru ovog zadatka (malo ih je: tabla je mala) */
function loopSolutions(view: CodingView): { pre: Cmd[]; body: Cmd[] }[] {
    const board = boardOf(view);
    const key = JSON.stringify([board, view.arrows, view.preSlots, view.bodySlots, view.times, view.limit]);
    const cached = solutionCache.get(key);
    if (cached) return cached;
    const all = (length: number): Cmd[][] => {
        let out: Cmd[][] = [[]];
        for (let i = 0; i < length; i += 1) out = out.flatMap((seq) => view.arrows.map((cmd) => [...seq, cmd]));
        return out;
    };
    const splits: [number, number][] = [];
    if (view.limit > 0) {
        for (let total = 1; total <= view.limit; total += 1) for (let b = 1; b <= total; b += 1) splits.push([total - b, b]);
    } else splits.push([view.preSlots, view.bodySlots]);
    const found: { pre: Cmd[]; body: Cmd[] }[] = [];
    for (const [p, b] of splits) {
        for (const pre of all(p)) for (const body of all(b)) if (simulate(board, expand(pre, body, view.times)).outcome === "goal") found.push({ pre, body });
    }
    // Rešenje iz plana ide prvo (njega pomoć pokazuje kad dete još nije počelo)
    found.sort((a, b) => Number(sameSolution(b, view.solution)) - Number(sameSolution(a, view.solution)) || a.pre.length + a.body.length - (b.pre.length + b.body.length));
    if (solutionCache.size > 50) solutionCache.clear();
    solutionCache.set(key, found);
    return found;
}

function sameSolution(a: { pre: Cmd[]; body: Cmd[] }, b: { pre: Cmd[]; body: Cmd[] }): boolean {
    return a.pre.join() === b.pre.join() && a.body.join() === b.body.join();
}

const startsWith = (list: readonly Cmd[], prefix: readonly Cmd[]) => prefix.length <= list.length && prefix.every((cmd, i) => list[i] === cmd);

/**
 * Šta sledeće treba (za pomoć i za ruku u pokaznom zadatku): sledeća prava strelica i polje
 * na tabli, „Kreni” kad je program dobar, „Obriši” kad je program skrenuo sa svakog dobrog puta.
 */
export function hintTarget(view: CodingView): HintTarget {
    const board = boardOf(view);
    const program = programOf(view);
    const sim = simulate(board, program);
    if (sim.outcome === "goal") return { action: "run", cell: null };

    if (view.kind === "debug") {
        const wrong = view.pre.findIndex((cmd, i) => cmd !== view.solution.pre[i]);
        if (wrong < 0) return { action: "run", cell: null };
        const path = simulate(board, view.solution.pre).cells;
        if (view.fixAt === wrong) return { action: `cmd:${view.solution.pre[wrong]}`, cell: path[wrong + 1] ?? null };
        return { action: `fix:${wrong}`, cell: path[wrong + 1] ?? null };
    }

    if (view.kind === "loop") {
        const match = loopSolutions(view).find((s) => startsWith(s.pre, view.pre) && startsWith(s.body, view.body) && (view.body.length === 0 || s.pre.length === view.pre.length));
        if (!match) return { action: "undo", cell: null };
        const zone: Zone = view.pre.length < match.pre.length ? "pre" : "loop";
        const index = zone === "pre" ? view.pre.length : view.pre.length + view.body.length;
        const cmd = zone === "pre" ? match.pre[view.pre.length] : match.body[view.body.length];
        if (!cmd) return { action: "run", cell: null };
        const cells = simulate(board, expand(match.pre, match.body, view.times)).cells;
        if (view.limit > 0 && view.zone !== zone) return { action: `zone:${zone}`, cell: null };
        return { action: `cmd:${cmd}`, cell: cells[index + 1] ?? null };
    }

    if (sim.outcome === "edge" || sim.outcome === "blocked") return { action: "undo", cell: null };
    const left = view.preSlots - view.pre.length;
    const plan = tour(board, sim.pos, sim.got, view.arrows);
    if (!plan || plan.length > left) return { action: "undo", cell: null };
    const step = nextStep(board, sim.pos, sim.got, view.arrows, program[program.length - 1] ?? null);
    if (!step) return { action: "undo", cell: null };
    return { action: `cmd:${step}`, cell: moveFrom(board, sim.pos, step) };
}

// ── Bodovanje (isto kao u ostalim igrama) ─────────────────────────────────────

/**
 * Robotić je stigao. Prvi zadatak prvog nivoa pokazuje ruka (ne ocenjuje se); „correct” = uspeo
 * iz prvog izvođenja, bez pomoći; „prompted” = uz pomoć (osim pokaznog).
 */
export function solveCodingView(current: CodingView, level: number, solved: Partial<CodingView> = {}): { next: CodingView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hint;
    const firstTry = current.misses === 0 && !helped && !modeled;
    const next: CodingView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function codingResult(final: CodingView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

const MAX_CMDS = 12;

function cmdList(value: unknown, max = MAX_CMDS): Cmd[] {
    return Array.isArray(value) ? value.filter(isCmd).slice(0, max) : [];
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeCodingMonitor(state: Partial<CodingView> | null | undefined): CodingView {
    const base = emptyCodingView(1);
    if (!state) return base;
    const cols = clampInt(state.cols, 2, MAX_SIDE, 3);
    const rows = clampInt(state.rows, 2, MAX_SIDE, 3);
    const size = cols * rows;
    const cell = (value: unknown, fallback: number) => (Number.isInteger(value) && (value as number) >= 0 && (value as number) < size ? (value as number) : fallback);
    const start = cell(state.start, 0);
    const goal = cell(state.goal, start);
    const used = new Set([start, goal]);
    const obstacles: Obstacle[] = [];
    if (Array.isArray(state.obstacles)) {
        for (const raw of state.obstacles.slice(0, size)) {
            const o = raw as Partial<Obstacle> | null;
            if (!o || typeof o !== "object" || !isObstacle(o.kind)) continue;
            const at = cell(o.cell, -1);
            if (at < 0 || used.has(at)) continue;
            used.add(at);
            obstacles.push({ cell: at, kind: o.kind });
        }
    }
    const stars: number[] = [];
    if (Array.isArray(state.stars)) {
        for (const raw of state.stars.slice(0, 8)) {
            const at = cell(raw, -1);
            if (at < 0 || used.has(at)) continue;
            used.add(at);
            stars.push(at);
        }
    }
    const kind: CodingKind = state.kind === "debug" || state.kind === "loop" ? state.kind : "plan";
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const pre = cmdList(state.pre);
    const body = cmdList(state.body);
    const solution = state.solution && typeof state.solution === "object" ? { pre: cmdList(state.solution.pre), body: cmdList(state.solution.body) } : { pre: [], body: [] };
    const indexList = (value: unknown, limit: number) => (Array.isArray(value) ? Array.from(new Set(value.filter((v): v is number => Number.isInteger(v) && v >= 0 && v < limit))) : []);
    const mistake = state.mistake && typeof state.mistake === "object" ? (state.mistake as Partial<CodingMistake>) : null;
    const outcomes: CodingMistake["outcome"][] = ["edge", "blocked", "stars", "short"];
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind,
        theme: isTheme(state.theme) ? state.theme : "city",
        cols,
        rows,
        start,
        goal,
        obstacles,
        stars,
        arrows: CMDS.filter((cmd) => cmdList(state.arrows).includes(cmd)),
        preview: state.preview === true,
        preSlots: clampInt(state.preSlots, 0, MAX_CMDS, 0),
        bodySlots: clampInt(state.bodySlots, 0, MAX_CMDS, 0),
        times: clampInt(state.times, 0, 9, 0),
        limit: clampInt(state.limit, 0, MAX_CMDS, 0),
        program: cmdList(state.program),
        solution,
        pre,
        body,
        zone: state.zone === "loop" ? "loop" : "pre",
        fixAt: Number.isInteger(state.fixAt) && (state.fixAt as number) >= 0 && (state.fixAt as number) < pre.length ? (state.fixAt as number) : null,
        running: state.running === true,
        robot: cell(state.robot, start),
        facing: isCmd(state.facing) ? state.facing : null,
        step: clampInt(state.step, -1, 99, -1),
        trail: Array.isArray(state.trail) ? state.trail.filter((v): v is number => Number.isInteger(v) && v >= 0 && v < size).slice(0, 64) : [],
        got: indexList(state.got, stars.length),
        bump: isCmd(state.bump) ? state.bump : null,
        bumpKey: toCount(state.bumpKey, 0),
        failAt: Number.isInteger(state.failAt) && (state.failAt as number) >= 0 && (state.failAt as number) < 99 ? (state.failAt as number) : null,
        mistake:
            mistake && outcomes.includes(mistake.outcome as CodingMistake["outcome"])
                ? { outcome: mistake.outcome as CodingMistake["outcome"], obstacle: isObstacle(mistake.obstacle) ? mistake.obstacle : null, missing: clampInt(mistake.missing, 0, 8, 0) }
                : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
        misses: toCount(state.misses, 0),
        runs: toCount(state.runs, 0),
    };
}
