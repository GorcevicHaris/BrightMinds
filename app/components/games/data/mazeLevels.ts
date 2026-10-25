// Sadržaj igre „Lavirint”: dete vodi lik (Amar, Lejla, zeka…) prstom kroz lavirint do cilja
// (kuća, mama, šargarepa). Zidovi (živa ograda) zaustavljaju lik, a kad se prst podigne, lik
// ostaje gde je stao. Bez Reacta, da bi se lavirinti proveravali u testovima; crteži su u
// games/maze/.
//
// Zašto ovim redom (uzrast 3–10, i deca sa autizmom):
//  • Fina motorika i planiranje pokreta: vođenje prsta po stazi je ista veština kao
//    praćenje linije olovkom pre pisanja (predgrafomotorika), a lavirint dodaje planiranje
//    unapred i vizuelno praćenje (oči idu ispred prsta).
//  • Učenje bez greške (errorless learning): prvo samo širok, prav hodnik bez ijednog
//    skretanja, a prvi put pokazuje ruka (pokazni zadatak se ne ocenjuje). Zatim jedno
//    skretanje, pa dva-tri, i sve vreme isprekidana linija pokazuje put.
//  • Podrška se povlači postepeno (stimulus fading): mali lavirinti 4 × 4 i 5 × 5 sa samo
//    jednim ćorsokakom, linija prvo cela, pa bleda, pa samo na početku, pa je nema; onda
//    zvezdice usput (pažnja na više ciljeva). Na teškim nivoima veći lavirinti sa više
//    ćorsokaka, bez linije, i na kraju ključ i vrata (redosled koraka: prvo ključ, pa vrata).
//  • Ćorsokak nije kazna: glas mirno kaže da tu nema prolaza; posle onoliko ćorsokaka koliko
//    je roditelj podesio (na lakim nivoima i posle čekanja) linija pokaže put dalje.
//  • Nema žurbe ni sata; ćelija je najmanje 44 px i na telefonu (veličina lavirinta se
//    prilagođava ekranu), lik se može i dodirom pomerati (za decu kojoj je prevlačenje teško).
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak („Amar ide kući.”).
//  • Ocena: jedan lavirint je jedan zadatak. „Tačno” = stigao do cilja bez pomoći (linije
//    koja se pojavi kao pomoć); „uz pomoć” = posle te pomoći. Pokazni lavirint se ne ocenjuje.
//  • Lavirinti se prave iz broja (seme) algoritmom „rekurzivnog povratka” (recursive
//    backtracker): isti broj uvek daje isti lavirint, pa roditelj na monitoru vidi isto.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

// ── Pravci i ćelije ───────────────────────────────────────────────────────────

/** Otvoren prolaz na strani ćelije (bitovi) */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

const STEPS: readonly { bit: number; back: number; dx: number; dy: number }[] = [
    { bit: N, back: S, dx: 0, dy: -1 },
    { bit: E, back: W, dx: 1, dy: 0 },
    { bit: S, back: N, dx: 0, dy: 1 },
    { bit: W, back: E, dx: -1, dy: 0 },
];

export interface MazeGrid {
    cols: number;
    rows: number;
    /** Za svaku ćeliju (red po red) otvoreni prolazi; 0 = tu nema staze (trava) */
    open: number[];
}

export interface Maze extends MazeGrid {
    start: number;
    goal: number;
    /** Put od starta do cilja (ćelije redom) */
    solution: number[];
    /** Zvezdice koje se skupljaju usput */
    stars: number[];
    key: number | null;
    /** Vrata između dve susedne ćelije na putu do cilja */
    door: [number, number] | null;
}

export const cellX = (grid: { cols: number }, cell: number) => cell % grid.cols;
export const cellY = (grid: { cols: number }, cell: number) => Math.floor(cell / grid.cols);

/** Bit prolaza iz ćelije `a` u susednu `b` (0 kad nisu susedne) */
function sideTo(grid: MazeGrid, a: number, b: number): number {
    const dx = cellX(grid, b) - cellX(grid, a);
    const dy = cellY(grid, b) - cellY(grid, a);
    return STEPS.find((step) => step.dx === dx && step.dy === dy)?.bit ?? 0;
}

const sameEdge = (door: readonly [number, number] | null, a: number, b: number) => door !== null && ((door[0] === a && door[1] === b) || (door[0] === b && door[1] === a));

/** Susedne ćelije u koje se iz `cell` može preći (zatvorena vrata se ne prolaze) */
export function openNeighbors(grid: MazeGrid, cell: number, closedDoor: readonly [number, number] | null = null): number[] {
    const x = cellX(grid, cell);
    const y = cellY(grid, cell);
    const result: number[] = [];
    for (const step of STEPS) {
        if (!(grid.open[cell] & step.bit)) continue;
        const nx = x + step.dx;
        const ny = y + step.dy;
        if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
        const next = ny * grid.cols + nx;
        if (!(grid.open[next] & step.back) || sameEdge(closedDoor, cell, next)) continue;
        result.push(next);
    }
    return result;
}

export function canStep(grid: MazeGrid, a: number, b: number, closedDoor: readonly [number, number] | null = null): boolean {
    return openNeighbors(grid, a, closedDoor).includes(b);
}

/** Najkraći put od `from` do `to` (obe ćelije uključene), ili null kad puta nema */
export function findPath(grid: MazeGrid, from: number, to: number, closedDoor: readonly [number, number] | null = null): number[] | null {
    if (from === to) return [from];
    const previous = new Map<number, number>([[from, -1]]);
    const queue = [from];
    while (queue.length > 0) {
        const cell = queue.shift()!;
        for (const next of openNeighbors(grid, cell, closedDoor)) {
            if (previous.has(next)) continue;
            previous.set(next, cell);
            if (next === to) {
                const path = [to];
                let back = cell;
                while (back !== -1) {
                    path.unshift(back);
                    back = previous.get(back)!;
                }
                return path;
            }
            queue.push(next);
        }
    }
    return null;
}

/** Ćelije sa samo jednim prolazom (kraj staze) */
export function leafCells(grid: MazeGrid): number[] {
    const result: number[] = [];
    grid.open.forEach((bits, cell) => {
        if (bits !== 0 && openNeighbors(grid, cell).length === 1) result.push(cell);
    });
    return result;
}

/** Ćorsokaci: krajevi staze koji nisu ni start ni cilj */
export function deadEnds(maze: Pick<Maze, "cols" | "rows" | "open" | "start" | "goal">): number[] {
    return leafCells(maze).filter((cell) => cell !== maze.start && cell !== maze.goal);
}

// ── Slučajni brojevi iz semena ────────────────────────────────────────────────

/** Mulberry32: brz generator koji za isto seme uvek daje isti niz brojeva u [0, 1) */
export function seededRandom(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Novo seme iz semena i broja pokušaja (da drugi pokušaj ne liči na prvi) */
const mixSeed = (seed: number, attempt: number) => (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(attempt + 1, 0xc2b2ae35)) >>> 0;

// ── Pravljenje lavirinta ──────────────────────────────────────────────────────

/**
 * Rekurzivni povratak (recursive backtracker): od početne ćelije staza ide u nasumičnu
 * neposećenu susednu ćeliju; kad nema kuda, vraća se nazad. Nastaje „savršen” lavirint:
 * između svake dve ćelije postoji tačno jedan put (nema krugova), pa je uvek rešiv.
 */
export function carveMaze(cols: number, rows: number, random: () => number, from = 0): MazeGrid {
    const open = new Array<number>(cols * rows).fill(0);
    const seen = new Array<boolean>(cols * rows).fill(false);
    const stack = [from];
    seen[from] = true;
    while (stack.length > 0) {
        const cell = stack[stack.length - 1];
        const x = cell % cols;
        const y = Math.floor(cell / cols);
        const options: { next: number; bit: number; back: number }[] = [];
        for (const step of STEPS) {
            const nx = x + step.dx;
            const ny = y + step.dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const next = ny * cols + nx;
            if (!seen[next]) options.push({ next, bit: step.bit, back: step.back });
        }
        if (options.length === 0) {
            stack.pop();
            continue;
        }
        const pick = options[Math.floor(random() * options.length)];
        open[cell] |= pick.bit;
        open[pick.next] |= pick.back;
        seen[pick.next] = true;
        stack.push(pick.next);
    }
    return { cols, rows, open };
}

/** Hodnik zadat pravcima („EES” = desno, desno, dole); start je prva ćelija, cilj poslednja */
export function corridorMaze(shape: string, transpose = false): Maze {
    const letters = [...shape.toUpperCase()].map((ch) => (transpose ? ({ E: "S", S: "E", W: "N", N: "W" } as Record<string, string>)[ch] : ch) ?? ch);
    const points: [number, number][] = [[0, 0]];
    for (const ch of letters) {
        const step = STEPS[["N", "E", "S", "W"].indexOf(ch)];
        if (!step) continue;
        const [x, y] = points[points.length - 1];
        points.push([x + step.dx, y + step.dy]);
    }
    const minX = Math.min(...points.map((p) => p[0]));
    const minY = Math.min(...points.map((p) => p[1]));
    const cols = Math.max(...points.map((p) => p[0])) - minX + 1;
    const rows = Math.max(...points.map((p) => p[1])) - minY + 1;
    const cells = points.map(([x, y]) => (y - minY) * cols + (x - minX));
    const grid: MazeGrid = { cols, rows, open: new Array<number>(cols * rows).fill(0) };
    for (let i = 1; i < cells.length; i += 1) {
        const bit = sideTo(grid, cells[i - 1], cells[i]);
        const back = STEPS.find((step) => step.bit === bit)?.back ?? 0;
        grid.open[cells[i - 1]] |= bit;
        grid.open[cells[i]] |= back;
    }
    return { ...grid, start: cells[0], goal: cells[cells.length - 1], solution: cells, stars: [], key: null, door: null };
}

/** Broj skretanja na putu */
export function turnsOf(maze: Pick<Maze, "cols" | "solution">): number {
    let turns = 0;
    for (let i = 2; i < maze.solution.length; i += 1) {
        const [a, b, c] = [maze.solution[i - 2], maze.solution[i - 1], maze.solution[i]];
        const d1 = [cellX(maze, b) - cellX(maze, a), cellY(maze, b) - cellY(maze, a)];
        const d2 = [cellX(maze, c) - cellX(maze, b), cellY(maze, c) - cellY(maze, b)];
        if (d1[0] !== d2[0] || d1[1] !== d2[1]) turns += 1;
    }
    return turns;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export type GuideMode = "full" | "faint" | "start" | "none";

export interface MazeLevel {
    /** Lavirinti jedan za drugim */
    mazes: number;
    /** Hodnici (laki nivoi): oblik puta, jedan po lavirintu */
    shapes?: readonly string[];
    /** Lavirint iz semena: kolone × redovi (na malom ekranu se prilagođava) */
    size?: readonly [number, number];
    /** Koliko ćorsokaka sme da ima (najmanje, najviše) */
    deadEnds?: readonly [number, number];
    /** Isprekidana linija koja pokazuje put */
    guide: GuideMode;
    /** Zvezdice usput: na putu, ili jedna od njih u ćorsokaku */
    stars: "none" | "path" | "branch";
    /** Ključ pa vrata: ključ na putu, ili u bočnom hodniku */
    key: "none" | "path" | "branch";
    earlyHint: boolean;
}

const corridor = (shapes: string[]): MazeLevel => ({ mazes: shapes.length, shapes, guide: "full", stars: "none", key: "none", earlyHint: true });
const grid = (mazes: number, size: [number, number], dead: [number, number], guide: GuideMode, extra: Partial<MazeLevel> = {}): MazeLevel => ({
    mazes,
    size,
    deadEnds: dead,
    guide,
    stars: "none",
    key: "none",
    earlyHint: false,
    ...extra,
});

export const MAZE_LEVELS: readonly MazeLevel[] = [
    // Lako: širok prav hodnik, pa jedno skretanje, pa dva-tri — sve vreme uz liniju
    corridor(["EE", "EEE", "EEEE"]),
    corridor(["EES", "EESS", "EEEN"]),
    corridor(["EESEE", "ESSE", "EENNE"]),
    corridor(["EESSWW", "ESSEE", "EESEEN"]),
    corridor(["EESSEENN", "SSEENNEE", "EESSWWSS"]),
    // Srednje: mali lavirinti sa jednim ćorsokakom, linija bledi; pa zvezdice usput
    grid(3, [4, 4], [1, 1], "full"),
    grid(3, [4, 4], [1, 1], "faint"),
    grid(3, [5, 5], [1, 1], "start"),
    grid(3, [5, 5], [1, 1], "none", { stars: "path" }),
    grid(3, [5, 5], [1, 1], "none", { stars: "branch" }),
    // Teško: veći lavirinti sa više ćorsokaka, bez linije; pa ključ, pa vrata
    grid(3, [6, 6], [3, 99], "none"),
    grid(3, [7, 7], [3, 99], "none"),
    grid(2, [8, 8], [4, 99], "none"),
    grid(2, [7, 7], [3, 99], "none", { key: "path" }),
    grid(2, [8, 8], [4, 99], "none", { key: "branch" }),
];

export const MAZE_MAX_LEVEL = MAZE_LEVELS.length;

export function mazeLevel(level: number): MazeLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), MAZE_MAX_LEVEL);
    return MAZE_LEVELS[safe - 1];
}

// ── Veličina prema ekranu ─────────────────────────────────────────────────────

/** Najmanja ćelija na telefonu (px): veći cilj od ovoga prst pogađa bez muke */
export const MIN_CELL_PX = 44;
/** Najveća ćelija (px): na računaru lavirint ne treba da bude ogroman */
export const MAX_CELL_PX = 150;

/**
 * Koliko kolona i redova staje u polje `width` × `height` (px), a da ćelija ne bude manja od
 * MIN_CELL_PX. Lavirint ne postaje veći od zadatog; kad ne staje, ćelija ostaje ista, a
 * lavirint se „preokrene” (više kolona, manje redova ili obrnuto), da ćelija bude približno
 * isto koliko u zadatom. Bez poznate veličine polja ostaje zadata veličina.
 */
export function fitMazeSize(size: readonly [number, number], width: number, height: number, minCell = MIN_CELL_PX): [number, number] {
    const [cols, rows] = size;
    if (!(width > 0) || !(height > 0)) return [cols, rows];
    const maxCols = Math.max(2, Math.floor(width / minCell));
    const maxRows = Math.max(2, Math.floor(height / minCell));
    if (cols <= maxCols && rows <= maxRows) return [cols, rows];
    const area = cols * rows;
    if (cols > maxCols) {
        const c = maxCols;
        return [c, Math.max(2, Math.min(maxRows, Math.round(area / c)))];
    }
    const r = maxRows;
    return [Math.max(2, Math.min(maxCols, Math.round(area / r))), r];
}

/** Veličina ćelije (px) za lavirint u polju datih dimenzija */
export function cellPx(maze: { cols: number; rows: number }, width: number, height: number): number {
    if (!(width > 0) || !(height > 0)) return MIN_CELL_PX;
    return Math.max(1, Math.min(MAX_CELL_PX, width / maze.cols, height / maze.rows));
}

// ── Lavirint jednog zadatka ───────────────────────────────────────────────────

interface BuildMazeOptions {
    /** Polje za lavirint (px); bez njega zadata veličina */
    width?: number;
    height?: number;
    minCell?: number;
}

const ATTEMPTS = 600;

function placeOnPath(path: readonly number[], fractions: readonly number[]): number[] {
    const inner = path.slice(1, -1);
    if (inner.length === 0) return [];
    const picks: number[] = [];
    for (const f of fractions) {
        const cell = inner[Math.min(inner.length - 1, Math.max(0, Math.round(f * (inner.length - 1))))];
        if (!picks.includes(cell)) picks.push(cell);
    }
    return picks;
}

/** Hodnik okrenut tako da ćelije budu što veće u datom polju */
function corridorFor(shape: string, width?: number, height?: number): Maze {
    const plain = corridorMaze(shape);
    if (!width || !height) return plain;
    const turned = corridorMaze(shape, true);
    return cellPx(turned, width, height) > cellPx(plain, width, height) + 0.5 ? turned : plain;
}

/**
 * Lavirint za zadatak `index` nivoa: hodnik (laki nivoi) ili lavirint iz semena, sa
 * zvezdicama, ključem i vratima po pravilu nivoa. Isto seme i isto polje uvek daju isti
 * lavirint. Start je gore levo, cilj dole desno (uvek isto mesto: predvidljivo).
 */
export function buildMaze(rule: MazeLevel, index: number, seed: number, { width, height, minCell = MIN_CELL_PX }: BuildMazeOptions = {}): Maze {
    if (rule.shapes) return corridorFor(rule.shapes[index % rule.shapes.length], width, height);
    const [cols, rows] = fitMazeSize(rule.size ?? [4, 4], width ?? 0, height ?? 0, minCell);
    const [minDead, maxDead] = rule.deadEnds ?? [0, 99];
    const start = 0;
    const goal = cols * rows - 1;
    let fallback: Maze | null = null;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
        const random = seededRandom(mixSeed(seed, attempt));
        const carved = carveMaze(cols, rows, random, start);
        const solution = findPath(carved, start, goal)!;
        const base: Maze = { ...carved, start, goal, solution, stars: [], key: null, door: null };
        fallback ??= base;
        const dead = deadEnds(base);
        if (dead.length < minDead || dead.length > maxDead) continue;
        // Put ne sme da bude najkraći mogući (samo dole pa desno): bar jedno vijuganje
        if (solution.length < cols + rows + 1) continue;
        const maze = withFeatures(base, rule, dead, random);
        if (maze) return maze;
    }
    return fallback ?? corridorMaze("EE");
}

/** Zvezdice, ključ i vrata; null kad ih u ovom lavirintu nije moguće dobro rasporediti */
function withFeatures(maze: Maze, rule: MazeLevel, dead: number[], random: () => number): Maze | null {
    const path = maze.solution;
    if (rule.stars === "path") return { ...maze, stars: placeOnPath(path, [0.25, 0.5, 0.75]) };
    if (rule.stars === "branch") {
        const branch = dead[Math.floor(random() * dead.length)];
        if (branch === undefined) return null;
        const onPath = placeOnPath(path, [0.33, 0.67]);
        return onPath.length === 2 ? { ...maze, stars: [...onPath, branch] } : null;
    }
    if (rule.key === "none") return maze;
    // Vrata stoje na putu, posle više od pola puta
    const doorAt = Math.round(path.length * (rule.key === "path" ? 0.62 : 0.68));
    if (doorAt < 3 || doorAt >= path.length - 1) return null;
    const door: [number, number] = [path[doorAt - 1], path[doorAt]];
    if (rule.key === "path") {
        const key = path[Math.max(1, Math.round(doorAt * 0.4))];
        return { ...maze, key, door };
    }
    // Ključ u bočnom hodniku: ćorsokak sa strane starta (pre vrata), što dalje od puta
    const reachable = (cell: number) => findPath(maze, maze.start, cell, door) !== null;
    let best: { cell: number; depth: number } | null = null;
    for (const cell of dead) {
        if (!reachable(cell)) continue;
        const route = findPath(maze, maze.start, cell)!;
        const branchFrom = route.findIndex((c) => !path.includes(c));
        const depth = branchFrom < 0 ? 0 : route.length - branchFrom;
        // Bočni hodnik od bar dve ćelije, a ne predaleko (mala deca gube cilj iz vida)
        if (depth >= 2 && depth <= 8 && (!best || depth > best.depth)) best = { cell, depth };
    }
    return best ? { ...maze, key: best.cell, door } : null;
}

// ── Kretanje lika ─────────────────────────────────────────────────────────────

/** Sva mesta do kojih se stiže u najviše `depth` koraka, sa putem do njih */
function reachWithin(maze: MazeGrid, from: number, depth: number, closedDoor: readonly [number, number] | null): Map<number, number[]> {
    const routes = new Map<number, number[]>([[from, []]]);
    let frontier = [from];
    for (let d = 0; d < depth; d += 1) {
        const next: number[] = [];
        for (const cell of frontier) {
            for (const n of openNeighbors(maze, cell, closedDoor)) {
                if (routes.has(n)) continue;
                routes.set(n, [...routes.get(cell)!, n]);
                next.push(n);
            }
        }
        frontier = next;
    }
    return routes;
}

/** Koliko bliže (u ćelijama) prst mora da bude da bi lik krenuo — da ne „preskače” preko zida */
const STEP_GAIN = 0.35;

/**
 * Koraci kojima lik prati prst: (x, y) je položaj prsta u ćelijama (0,0 = gornji levi ugao).
 * Lik ide samo otvorenim prolazima, najviše dva koraka odjednom ka prstu (tako sme da „seče”
 * ugao, ali nikad ne prolazi kroz zid — zaobilazak do susedne ćelije iza zida je bar tri
 * koraka). Kad prst brzo ode daleko niz hodnik, ponavlja se dok lik ne stigne ili ne stane.
 */
export function walkToward(maze: MazeGrid, from: number, x: number, y: number, closedDoor: readonly [number, number] | null = null): number[] {
    const dist = (cell: number) => Math.hypot(cellX(maze, cell) + 0.5 - x, cellY(maze, cell) + 0.5 - y);
    const steps: number[] = [];
    let current = from;
    for (let guard = 0; guard < maze.cols * maze.rows; guard += 1) {
        let best: { cell: number; route: number[]; d: number } | null = null;
        for (const [cell, route] of reachWithin(maze, current, 2, closedDoor)) {
            if (cell === current) continue;
            const d = dist(cell);
            if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) < 1e-9 && route.length < best.route.length)) best = { cell, route, d };
        }
        if (!best || best.d > dist(current) - STEP_GAIN) break;
        // Samo prvi korak, pa ponovo: lik ide ćeliju po ćeliju i uvek bira najkraći smer
        const step = best.route[0];
        steps.push(step);
        current = step;
        if (best.route.length === 1 && dist(current) < 0.5) break;
    }
    return steps;
}

/** Pravac od ćelije ka tački (prst): za „udarac” u zid */
export function directionToward(maze: { cols: number }, from: number, x: number, y: number): "N" | "E" | "S" | "W" | null {
    const dx = x - (cellX(maze, from) + 0.5);
    const dy = y - (cellY(maze, from) + 0.5);
    if (Math.hypot(dx, dy) < 0.75) return null;
    if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "E" : "W";
    return dy > 0 ? "S" : "N";
}

/** Susedna ćelija u datom pravcu (ili null kad je van table) */
export function neighborIn(maze: { cols: number; rows: number }, cell: number, dir: "N" | "E" | "S" | "W"): number | null {
    const step = STEPS[["N", "E", "S", "W"].indexOf(dir)];
    const nx = (cell % maze.cols) + step.dx;
    const ny = Math.floor(cell / maze.cols) + step.dy;
    if (nx < 0 || ny < 0 || nx >= maze.cols || ny >= maze.rows) return null;
    return ny * maze.cols + nx;
}

/** Novi trag kad lik pređe u ćeliju `cell`: vraćanje unazad briše poslednji korak traga */
export function extendTrail(trail: readonly number[], cell: number): number[] {
    if (trail.length >= 2 && trail[trail.length - 2] === cell) return trail.slice(0, -1);
    const at = trail.indexOf(cell);
    if (at >= 0) return trail.slice(0, at + 1);
    return [...trail, cell];
}

// ── Likovi i ciljevi ──────────────────────────────────────────────────────────

export const MAZE_HERO_IDS = ["amar", "lejla", "haris", "ajla", "rabbit", "dog", "bear", "squirrel", "cat", "monkey"] as const;
export type MazeHeroId = (typeof MAZE_HERO_IDS)[number];

export const MAZE_GOAL_IDS = ["house", "mama", "baka", "carrot", "bone", "honey", "nut", "fish", "banana"] as const;
export type MazeGoalId = (typeof MAZE_GOAL_IDS)[number];

export interface MazeTrip {
    hero: MazeHeroId;
    goal: MazeGoalId;
    /** Ime lika (i za poređenje sa imenom deteta) */
    name: string;
    /** „Amar ide kući.” */
    intro: string;
    /** „Amar je stigao kući.” */
    done: string;
}

const trip = (hero: MazeHeroId, goal: MazeGoalId, name: string, intro: string, done: string): MazeTrip => ({ hero, goal, name, intro, done });

/** Ko kuda ide. Deca su iz igara (Amar, Lejla, Haris, Ajla), životinje idu do svoje hrane. */
export const MAZE_TRIPS: readonly MazeTrip[] = [
    trip("amar", "house", "Amar", "Amar ide kući.", "Amar je stigao kući."),
    trip("rabbit", "carrot", "Zeka", "Zeka ide do šargarepe.", "Zeka je stigao do šargarepe."),
    trip("lejla", "mama", "Lejla", "Lejla ide kod mame.", "Lejla je stigla kod mame."),
    trip("dog", "bone", "Kuca", "Kuca ide do koske.", "Kuca je stigla do koske."),
    trip("haris", "baka", "Haris", "Haris ide kod bake.", "Haris je stigao kod bake."),
    trip("bear", "honey", "Meda", "Meda ide do meda.", "Meda je stigao do meda."),
    trip("ajla", "house", "Ajla", "Ajla ide kući.", "Ajla je stigla kući."),
    trip("squirrel", "nut", "Veverica", "Veverica ide do oraha.", "Veverica je stigla do oraha."),
    trip("cat", "fish", "Maca", "Maca ide do ribice.", "Maca je stigla do ribice."),
    trip("monkey", "banana", "Majmunče", "Majmunče ide do banane.", "Majmunče je stiglo do banane."),
];

export function getTrip(hero: unknown): MazeTrip | undefined {
    return MAZE_TRIPS.find((t) => t.hero === hero);
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

export interface MazeRound {
    /** Seme lavirinta (isti broj = isti lavirint) */
    seed: number;
    hero: MazeHeroId;
}

export interface MazePlan {
    rounds: MazeRound[];
    earlyHint: boolean;
}

interface PlanOptions {
    maxRounds: number;
    random?: () => number;
    /** Ime deteta: lik sa istim imenom se ne bira (dete ne vodi „sebe”) */
    childName?: string;
}

/**
 * Plan nivoa: koliko lavirinata i ko u kom ide. Broj lavirinata je onoliki koliki je zadat
 * u nivou (najviše koliko podnosi uzrast, a bar dva); lik se ne ponavlja zaredom.
 */
export function buildMazeLevel(level: number, { maxRounds, random = Math.random, childName }: PlanOptions): MazePlan {
    const rule = mazeLevel(level);
    const cap = Math.max(2, Number.isFinite(maxRounds) ? maxRounds : rule.mazes);
    const count = Math.min(rule.mazes, cap);
    const own = childName?.trim().toLocaleLowerCase("sr");
    const pool = MAZE_TRIPS.filter((t) => t.name.toLocaleLowerCase("sr") !== own);
    // Prvi lavirint prvog nivoa pokazuje ruka: tada kreće prvi lik iz spiska (Amar)
    const start = level === 1 ? 0 : Math.floor(random() * pool.length);
    const rounds: MazeRound[] = [];
    for (let i = 0; i < count; i += 1) {
        // Svaki sledeći lik je dalje u spisku (deca i životinje se smenjuju)
        const hero = pool[(start + i * 3) % pool.length].hero;
        rounds.push({ seed: Math.floor(random() * 2 ** 31), hero });
    }
    return { rounds, earlyHint: rule.earlyHint };
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

export const STARS_TEXT = "Usput skupi tri zvezdice.";
export const KEY_TEXT = "Vrata su zaključana. Prvo uzmi ključ.";
export const DEAD_END = "Ovuda nema prolaza.";
export const DEAD_END_RETRY = "Ovuda nema prolaza. Probaj drugim putem.";
export const LOCKED = "Vrata su zaključana. Treba ti ključ.";
export const STARS_LEFT = "Još nisu sve zvezdice skupljene.";
export const KEY_TAKEN = "Imaš ključ. Sad mogu da se otvore vrata.";

/** Uputstvo na početku lavirinta (o čemu je zadatak, nikad gde dodirnuti) */
export function mazeIntro(hero: unknown, maze: Pick<Maze, "stars" | "key"> | null): string {
    const t = getTrip(hero) ?? MAZE_TRIPS[0];
    const parts = [`${t.intro} Pomozi da pronađe put.`];
    if (maze && maze.stars.length > 0) parts.push(STARS_TEXT);
    if (maze && maze.key !== null) parts.push(KEY_TEXT);
    return parts.join(" ");
}

/** Naslov na ekranu: kratko, jedan red */
export function mazeTitle(hero: unknown): string {
    return (getTrip(hero) ?? MAZE_TRIPS[0]).intro;
}

export function mazeDone(hero: unknown): string {
    return (getTrip(hero) ?? MAZE_TRIPS[0]).done;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface MazeView extends BaseView {
    /** Redni broj lavirinta u nivou (od 0) */
    index: number;
    hero: MazeHeroId;
    goal: MazeGoalId;
    /** Ceo lavirint (monitor ga crta isto, bez ponovnog pravljenja) */
    maze: Maze | null;
    guide: GuideMode;
    pos: number;
    /** Put od starta do lika */
    trail: number[];
    starsGot: number[];
    hasKey: boolean;
    doorOpen: boolean;
    /** Pomoć: linija od lika do sledećeg cilja (ključ, zvezdica ili cilj) */
    hint: boolean;
    /** Ćorsokaci u koje je lik ušao u ovom lavirintu */
    deadVisited: number[];
    /** Lik je u ovom lavirintu bar jednom dobio pomoć */
    helped: boolean;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyMazeView(totalRounds: number): MazeView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        index: 0,
        hero: MAZE_TRIPS[0].hero,
        goal: MAZE_TRIPS[0].goal,
        maze: null,
        guide: "none",
        pos: 0,
        trail: [],
        starsGot: [],
        hasKey: false,
        doorOpen: false,
        hint: false,
        deadVisited: [],
        helped: false,
        feedback: null,
    };
}

/** Stanje na početku lavirinta `index` */
export function mazeRoundView(maze: Maze, round: MazeRound, index: number, guide: GuideMode): Partial<MazeView> {
    const t = getTrip(round.hero) ?? MAZE_TRIPS[0];
    return {
        index,
        hero: t.hero,
        goal: t.goal,
        maze,
        guide,
        pos: maze.start,
        trail: [maze.start],
        starsGot: [],
        hasKey: false,
        doorOpen: false,
        hint: false,
        deadVisited: [],
        helped: false,
        feedback: null,
    };
}

/** Zatvorena vrata (dok lik nema ključ) */
export function closedDoorOf(view: Pick<MazeView, "maze" | "hasKey">): [number, number] | null {
    return view.maze?.door && !view.hasKey ? view.maze.door : null;
}

/** Sledeći cilj lika: ključ, pa zvezdice koje nedostaju (najbliža), pa cilj */
export function nextTarget(view: Pick<MazeView, "maze" | "hasKey" | "starsGot" | "pos">): number | null {
    const maze = view.maze;
    if (!maze) return null;
    if (maze.key !== null && !view.hasKey) return maze.key;
    const left = maze.stars.filter((star) => !view.starsGot.includes(star));
    if (left.length > 0) {
        const door = closedDoorOf(view);
        let best: { cell: number; length: number } | null = null;
        for (const star of left) {
            const length = findPath(maze, view.pos, star, door)?.length ?? Infinity;
            if (!best || length < best.length) best = { cell: star, length };
        }
        return best?.cell ?? left[0];
    }
    return maze.goal;
}

/** Linija pomoći: put od lika do sledećeg cilja */
export function hintPath(view: Pick<MazeView, "maze" | "hasKey" | "starsGot" | "pos">): number[] {
    const maze = view.maze;
    const target = nextTarget(view);
    if (!maze || target === null) return [];
    return findPath(maze, view.pos, target, closedDoorOf(view)) ?? [];
}

/** Da li je lik upravo ušao u ćorsokak (kraj staze bez zvezdice i ključa) */
export function isEmptyDeadEnd(maze: Maze, cell: number): boolean {
    if (cell === maze.start || cell === maze.goal || maze.stars.includes(cell) || maze.key === cell) return false;
    return openNeighbors(maze, cell).length === 1;
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Lik je stigao do cilja. Prvi lavirint prvog nivoa pokazuje ruka (pokazni, ne ocenjuje se);
 * „correct” = bez pomoći (linije koja se pojavi kao pomoć); „prompted” = uz pomoć (osim pokaznog).
 */
export function solveMazeView(current: MazeView, level: number, solved: Partial<MazeView> = {}): { next: MazeView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.helped;
    const firstTry = !helped && !modeled;
    const next: MazeView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function mazeResult(final: MazeView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

/** Najveći lavirint koji monitor prihvata (veći ne postoji u igri) */
const MAX_SIDE = 20;

function mergeMaze(value: unknown): Maze | null {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const cols = toCount(raw.cols, 0);
    const rows = toCount(raw.rows, 0);
    if (cols < 1 || rows < 1 || cols > MAX_SIDE || rows > MAX_SIDE) return null;
    const size = cols * rows;
    if (!Array.isArray(raw.open) || raw.open.length !== size) return null;
    const open = raw.open.map((bits) => (Number.isInteger(bits) && (bits as number) >= 0 && (bits as number) < 16 ? (bits as number) : 0));
    const cell = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < size ? (v as number) : null);
    const cells = (v: unknown) => (Array.isArray(v) ? Array.from(new Set(v.map(cell).filter((c): c is number => c !== null))) : []);
    const start = cell(raw.start);
    const goal = cell(raw.goal);
    if (start === null || goal === null) return null;
    const door = Array.isArray(raw.door) && raw.door.length === 2 ? [cell(raw.door[0]), cell(raw.door[1])] : null;
    return {
        cols,
        rows,
        open,
        start,
        goal,
        solution: Array.isArray(raw.solution) ? raw.solution.map(cell).filter((c): c is number => c !== null) : [],
        stars: cells(raw.stars).slice(0, 6),
        key: cell(raw.key),
        door: door && door[0] !== null && door[1] !== null ? [door[0], door[1]] : null,
    };
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeMazeMonitor(state: Partial<MazeView> | null | undefined): MazeView {
    const base = emptyMazeView(1);
    if (!state) return base;
    const maze = mergeMaze(state.maze);
    const size = maze ? maze.cols * maze.rows : 0;
    const cell = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < size ? (v as number) : null);
    const cells = (v: unknown) => (Array.isArray(v) ? v.map(cell).filter((c): c is number => c !== null) : []);
    const t = getTrip(state.hero) ?? MAZE_TRIPS[0];
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const guide: GuideMode = state.guide === "full" || state.guide === "faint" || state.guide === "start" ? state.guide : "none";
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        index: toCount(state.index, 0),
        hero: t.hero,
        goal: t.goal,
        maze,
        guide,
        pos: cell(state.pos) ?? maze?.start ?? 0,
        trail: cells(state.trail).slice(0, size),
        starsGot: cells(state.starsGot).filter((c) => maze?.stars.includes(c)),
        hasKey: state.hasKey === true,
        doorOpen: state.doorOpen === true,
        hint: state.hint === true,
        deadVisited: cells(state.deadVisited),
        helped: state.helped === true,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
