// Sadržaj igre „Složi sliku”: slika je isečena na delove, a dete prevlači delove (ili dodirne
// deo, pa mesto na tabli) i tako ponovo sastavlja sliku. Deo „sedne” samo na svoje mesto.
//
// Zašto ovako (istraživanja o slagalicama i učenju dece od 3 do 10 godina, i dece sa autizmom):
//  • Učenje bez grešaka (errorless learning): prvi deo prve slike prvog nivoa pokazuje ruka
//    (model), a podrška se zatim postepeno povlači — bleda slika ispod table (vodilja) postoji
//    samo na lakim nivoima, pa nestaje; pomoć (tačno mesto zasvetli) na lakim nivoima stiže već
//    posle prve greške, a kasnije tek posle onoliko grešaka koliko je roditelj podesio.
//  • Malo delova na početku: dvogodišnjaci i trogodišnjaci slažu slagalice od 2–4 dela, a tek
//    deca od 5–6 godina od 9–12 delova; 16 delova sa „ušicama” je za najstariju decu. Zato se
//    ide 2 polovine → 3 trake → 2×2 → 3×2 → 3×3 → 4×3 → 4×4.
//  • „Pola slike” (nivo 5): jedna polovina je već na mestu, a druga se bira među polovinama sa
//    drugih slika — tačno ono što su roditelji tražili („ima pola slike pa spoji”). Deo koji nije
//    sa slike (uljez, nivoi 5, 9 i 10) uči dete da gleda sadržaj, a ne samo oblik dela.
//  • Ušice (klasična slagalica) dolaze tek na teškom nivou: oblik dela je dodatni znak, ali i
//    dodatno vizuelno opterećenje.
//  • Mirna i predvidljiva tabla: delovi stoje uvek u istoj korpi (izvađen deo ostavlja prazno
//    mesto, ostali se ne pomeraju), greška se ne kažnjava — deo se mirno vrati, bez zvuka greške.
//  • Svaki deo je veliki cilj za dodir (najmanje 48 px; raspored se računa iz veličine ekrana).
//  • Ocena: svaki deo je jedan zadatak. „Tačno” = deo stavljen na svoje mesto iz prvog pokušaja,
//    bez pomoći; „uz pomoć” = posle isticanja mesta. Pokazni deo (nivo 1) se ne ocenjuje.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

// ── Slike ─────────────────────────────────────────────────────────────────────

/** Sve slike se crtaju u istom okviru (puzzle/pictures.tsx) */
export const PUZZLE_W = 400;
export const PUZZLE_H = 300;

export const PUZZLE_PICTURE_IDS = ["sunce", "kuca", "riba", "auto", "macka", "drvo", "brod", "leptir", "voz", "duga", "amar", "lejla"] as const;
export type PuzzlePictureId = (typeof PUZZLE_PICTURE_IDS)[number];

export interface PuzzlePicture {
    id: PuzzlePictureId;
    /** Natpis („Mačka”) */
    name: string;
    /** Rečenica kad je slika složena („Mačka sedi na tepihu.”) */
    about: string;
    /** 1 = krupni, jasni oblici (laki nivoi), 2 = više sitnih delova */
    detail: 1 | 2;
}

export const PUZZLE_PICTURES: readonly PuzzlePicture[] = [
    { id: "sunce", name: "Sunce iznad brda", about: "Sunce sija iznad brda.", detail: 1 },
    { id: "kuca", name: "Kuća", about: "Kuća ima crveni krov.", detail: 1 },
    { id: "riba", name: "Riba", about: "Riba pliva u moru.", detail: 1 },
    { id: "auto", name: "Auto", about: "Crveni auto vozi putem.", detail: 1 },
    { id: "macka", name: "Mačka", about: "Mačka sedi na tepihu.", detail: 1 },
    { id: "drvo", name: "Drvo sa jabukama", about: "Na drvetu su crvene jabuke.", detail: 1 },
    { id: "brod", name: "Brod", about: "Brod plovi po moru.", detail: 2 },
    { id: "leptir", name: "Leptir", about: "Leptir leti iznad cveća.", detail: 2 },
    { id: "voz", name: "Voz", about: "Voz vozi po šinama.", detail: 2 },
    { id: "duga", name: "Duga", about: "Duga je na nebu posle kiše.", detail: 2 },
    { id: "amar", name: "Amar i lopta", about: "Amar se igra loptom.", detail: 2 },
    { id: "lejla", name: "Lejla i zmaj", about: "Lejla pušta zmaja.", detail: 2 },
];

export function getPuzzlePicture(id: unknown): PuzzlePicture | undefined {
    return PUZZLE_PICTURES.find((picture) => picture.id === id);
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export interface PuzzleLevel {
    cols: number;
    rows: number;
    /** Bleda cela slika ispod table (vodilja) */
    guide: boolean;
    /** Delovi sa ušicama (klasična slagalica) */
    tabs: boolean;
    /** Delovi sa drugih slika koji se ne uklapaju (ostaju u korpi) */
    decoys: number;
    /** Koliko delova je od početka na mestu („pola slike”) */
    given: number;
    /** Koliko slika ima nivo */
    rounds: number;
    /** Pomoć (tačno mesto zasvetli) već posle prve greške */
    earlyHint: boolean;
    /** Slike nivoa (bira se redom iz izmešanog spiska) */
    pictures: readonly PuzzlePictureId[];
}

const EASY: readonly PuzzlePictureId[] = ["sunce", "kuca", "riba", "auto", "macka", "drvo"];
const ALL: readonly PuzzlePictureId[] = PUZZLE_PICTURE_IDS;
const RICH: readonly PuzzlePictureId[] = ["brod", "leptir", "voz", "duga", "amar", "lejla", "macka", "drvo"];

const lvl = (cols: number, rows: number, extra: Partial<PuzzleLevel> = {}): PuzzleLevel => ({
    cols,
    rows,
    guide: false,
    tabs: false,
    decoys: 0,
    given: 0,
    rounds: 3,
    earlyHint: false,
    pictures: ALL,
    ...extra,
});

export const PUZZLE_LEVELS: readonly PuzzleLevel[] = [
    // Lako: pola slike, trake i 2×2, uvek uz bledu sliku ispod
    lvl(2, 1, { guide: true, earlyHint: true, pictures: EASY }),
    lvl(1, 2, { guide: true, earlyHint: true, pictures: EASY }),
    lvl(3, 1, { guide: true, earlyHint: true, pictures: EASY }),
    lvl(2, 2, { guide: true, earlyHint: true, pictures: EASY }),
    // „Pola slike”: jedna polovina je na mestu, druga se bira među tri polovine
    lvl(2, 1, { given: 1, decoys: 2, earlyHint: true, pictures: EASY }),
    // Srednje: bez vodilje, više delova, pa deo sa druge slike
    lvl(2, 2),
    lvl(3, 2),
    lvl(3, 3, { guide: true, rounds: 2 }),
    lvl(3, 2, { decoys: 1 }),
    lvl(3, 3, { guide: true, decoys: 1, rounds: 2 }),
    // Teško: bez vodilje, ušice, najviše 16 delova
    lvl(3, 3, { rounds: 2, pictures: RICH }),
    lvl(4, 3, { rounds: 2, pictures: RICH }),
    lvl(3, 3, { tabs: true, rounds: 2, pictures: RICH }),
    lvl(4, 3, { tabs: true, rounds: 2, pictures: RICH }),
    lvl(4, 4, { tabs: true, rounds: 1, pictures: RICH }),
];

export const PUZZLE_MAX_LEVEL = PUZZLE_LEVELS.length;

export function puzzleLevel(level: number): PuzzleLevel {
    const safe = Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), PUZZLE_MAX_LEVEL) : 1;
    return PUZZLE_LEVELS[safe - 1];
}

// ── Isecanje slike ────────────────────────────────────────────────────────────

/**
 * Ušice: `h[r][c]` je ivica ispod polja (r, c), `v[r][c]` ivica desno od polja (r, c);
 * +1 = ušica ide dole (desno), −1 = gore (levo). Bez ušica — prave ivice.
 */
export interface PuzzleEdges {
    h: number[][];
    v: number[][];
}

export interface PuzzleCut {
    cols: number;
    rows: number;
    edges: PuzzleEdges | null;
}

export interface PieceShape {
    /** Redni broj polja (red po red, od 0) */
    cell: number;
    col: number;
    row: number;
    /** Polje na slici */
    x: number;
    y: number;
    w: number;
    h: number;
    /** Obris dela (SVG putanja u koordinatama slike) */
    d: string;
    /** Isti obris kao niz tačaka (za proveru da delovi tačno pokrivaju sliku) */
    outline: [number, number][];
}

/** Koliko ušica viri iz polja (deo slike oko polja koji se crta uz deo) */
export function tabMargin(cut: Pick<PuzzleCut, "cols" | "rows" | "edges">): number {
    return cut.edges ? Math.round(knobUnit(cut) * 0.36 * 100) / 100 : 0;
}

function knobUnit(cut: Pick<PuzzleCut, "cols" | "rows">): number {
    return Math.min(PUZZLE_W / cut.cols, PUZZLE_H / cut.rows);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Ušica u jedinicama veličine polja: [duž ivice od sredine, ka spolja]; simetrična je, pa se ivica dva suseda poklapa */
const KNOB: readonly (readonly [number, number])[][] = [
    [
        [-0.11, 0],
        [-0.06, 0.05],
        [-0.11, 0.11],
    ],
    [
        [-0.2, 0.24],
        [-0.11, 0.35],
        [0, 0.35],
    ],
    [
        [0.11, 0.35],
        [0.2, 0.24],
        [0.11, 0.11],
    ],
    [
        [0.06, 0.05],
        [0.11, 0],
        [0.17, 0],
    ],
];

type Pt = [number, number];

function cubicPoints(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 8): Pt[] {
    const out: Pt[] = [];
    for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        const m = 1 - t;
        out.push([
            m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
            m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
        ]);
    }
    return out;
}

/** Jedna ivica dela, od `from` do `to`; `out` je smer ka spolja, `sign` da li ušica viri (+1), ulazi (−1) ili je nema (0) */
function edgePath(from: Pt, to: Pt, out: Pt, sign: number, unit: number): { d: string; points: Pt[] } {
    if (sign === 0) return { d: `L${r2(to[0])},${r2(to[1])}`, points: [to] };
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const u: Pt = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
    const mid: Pt = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    const at = ([a, b]: readonly [number, number]): Pt => [mid[0] + u[0] * a * unit + out[0] * sign * b * unit, mid[1] + u[1] * a * unit + out[1] * sign * b * unit];
    const start = at([-0.17, 0]);
    let d = `L${r2(start[0])},${r2(start[1])}`;
    const points: Pt[] = [start];
    let last = start;
    for (const segment of KNOB) {
        const [c1, c2, end] = segment.map(at);
        d += ` C${r2(c1[0])},${r2(c1[1])} ${r2(c2[0])},${r2(c2[1])} ${r2(end[0])},${r2(end[1])}`;
        points.push(...cubicPoints(last, c1, c2, end));
        last = end;
    }
    d += ` L${r2(to[0])},${r2(to[1])}`;
    points.push(to);
    return { d, points };
}

/** Svi delovi slike, red po red. Delovi bez ušica su pravougaonici; sa ušicama se susedi tačno poklapaju. */
export function pieceShapes(cut: PuzzleCut): PieceShape[] {
    const cw = PUZZLE_W / cut.cols;
    const ch = PUZZLE_H / cut.rows;
    const unit = knobUnit(cut);
    const shapes: PieceShape[] = [];
    for (let row = 0; row < cut.rows; row += 1) {
        for (let col = 0; col < cut.cols; col += 1) {
            const x = r2(col * cw);
            const y = r2(row * ch);
            const x1 = r2((col + 1) * cw);
            const y1 = r2((row + 1) * ch);
            const e = cut.edges;
            const top = e && row > 0 ? -e.h[row - 1][col] : 0;
            const right = e && col < cut.cols - 1 ? e.v[row][col] : 0;
            const bottom = e && row < cut.rows - 1 ? e.h[row][col] : 0;
            const left = e && col > 0 ? -e.v[row][col - 1] : 0;
            const sides = [
                edgePath([x, y], [x1, y], [0, -1], top, unit),
                edgePath([x1, y], [x1, y1], [1, 0], right, unit),
                edgePath([x1, y1], [x, y1], [0, 1], bottom, unit),
                edgePath([x, y1], [x, y], [-1, 0], left, unit),
            ];
            const d = `M${x},${y} ${sides.map((side) => side.d).join(" ")} Z`;
            const outline: Pt[] = [[x, y], ...sides.flatMap((side) => side.points)];
            outline.pop(); // poslednja tačka je ponovo početak
            shapes.push({ cell: row * cut.cols + col, col, row, x, y, w: r2(x1 - x), h: r2(y1 - y), d, outline });
        }
    }
    return shapes;
}

/** Nasumične ušice za sliku (svaka unutrašnja ivica dobija smer) */
export function randomEdges(cols: number, rows: number, random: () => number = Math.random): PuzzleEdges {
    const sign = () => (random() < 0.5 ? 1 : -1);
    return {
        h: Array.from({ length: Math.max(rows - 1, 0) }, () => Array.from({ length: cols }, sign)),
        v: Array.from({ length: rows }, () => Array.from({ length: Math.max(cols - 1, 0) }, sign)),
    };
}

// ── Zadaci ────────────────────────────────────────────────────────────────────

/** Deo u korpi: deo ove slike (`picture` je slika zadatka) ili uljez sa druge slike */
export interface TrayPiece {
    id: string;
    picture: PuzzlePictureId;
    cell: number;
}

export interface PuzzleRound {
    picture: PuzzlePictureId;
    cols: number;
    rows: number;
    edges: PuzzleEdges | null;
    guide: boolean;
    /** Polja koja su od početka na mestu */
    given: number[];
    /** Delovi u korpi, redom kojim stoje (pravi delovi i uljezi) */
    tray: TrayPiece[];
}

export const pieceId = (cell: number) => `p${cell}`;
const decoyId = (picture: string, cell: number) => `d-${picture}-${cell}`;

interface BuildOptions {
    maxRounds: number;
    random?: () => number;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/** Korpa ne sme da stoji baš redom slike (tada nema šta da se slaže) — osim kad je deo samo jedan */
function mixedOrder<T extends { cell: number }>(items: T[], random: () => number): T[] {
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const order = shuffled(items, random);
        if (order.length < 2 || order.some((item, index) => index > 0 && item.cell < order[index - 1].cell)) return order;
    }
    return [...items].reverse();
}

export function buildPuzzleLevel(level: number, { maxRounds, random = Math.random }: BuildOptions): PuzzleRound[] {
    const rule = puzzleLevel(level);
    const count = Math.max(1, Math.min(rule.rounds, Math.max(1, Math.floor(maxRounds))));
    const pictures = shuffled(rule.pictures, random).slice(0, count);
    const cells = rule.cols * rule.rows;

    return pictures.map((picture) => {
        const edges = rule.tabs ? randomEdges(rule.cols, rule.rows, random) : null;
        // „Pola slike”: na mestu je nasumično leva ili desna polovina
        const given = shuffled(
            Array.from({ length: cells }, (_, cell) => cell),
            random
        ).slice(0, Math.min(rule.given, cells - 1));
        const open = Array.from({ length: cells }, (_, cell) => cell).filter((cell) => !given.includes(cell));
        const own: TrayPiece[] = open.map((cell) => ({ id: pieceId(cell), picture, cell }));
        // Uljez: isti deo (isto polje, isti oblik) sa druge slike — razlikuje se samo po sadržaju
        const others = shuffled(
            PUZZLE_PICTURE_IDS.filter((id) => id !== picture),
            random
        );
        const decoys: TrayPiece[] = others.slice(0, rule.decoys).map((other) => {
            const cell = open[Math.floor(random() * open.length)];
            return { id: decoyId(other, cell), picture: other, cell };
        });
        return { picture, cols: rule.cols, rows: rule.rows, edges, guide: rule.guide, given, tray: mixedOrder([...own, ...decoys], random) };
    });
}

/** Delovi koje dete slaže u zadatku (bez uljeza i bez delova koji su već na mestu) */
export function roundPieces(round: Pick<PuzzleRound, "tray" | "picture">): TrayPiece[] {
    return round.tray.filter((piece) => piece.picture === round.picture);
}

export function isDecoy(round: Pick<PuzzleRound, "picture">, piece: TrayPiece): boolean {
    return piece.picture !== round.picture;
}

// ── Tekstovi ──────────────────────────────────────────────────────────────────
// Glas kaže šta je zadatak i šta se desilo, a nikad gde treba dodirnuti.

export const TEXT_INTRO = "Složi sliku.";
export const TEXT_HALF = "Pola slike je na mestu. Nađi drugu polovinu.";
export const TEXT_DECOY_INTRO = "Jedan deo nije sa ove slike.";
export const TEXT_WRONG_PLACE = "Taj deo je sa drugog mesta na slici.";
export const TEXT_DECOY = "Ovaj deo nije sa ove slike.";
export const TEXT_RETRY = "Probaj ponovo.";
export const TEXT_RETRY_SLOW = "Probaj još jednom, polako.";
export const TEXT_DEMO = "Pogledaj. Deo ide na svoje mesto.";

/** Uputstvo na početku slike („Složi sliku. Na slici je mačka.”) */
export function roundIntro(round: Pick<PuzzleRound, "picture" | "given" | "tray">): string {
    const picture = getPuzzlePicture(round.picture);
    if (round.given.length > 0) return TEXT_HALF;
    const decoys = round.tray.some((piece) => piece.picture !== round.picture);
    const what = picture ? ` Na slici je: ${picture.name.toLocaleLowerCase("sr")}.` : "";
    return `${TEXT_INTRO}${what}${decoys ? ` ${TEXT_DECOY_INTRO}` : ""}`;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

/**
 * `round` / `totalRounds` broje DELOVE (svaki deo je jedan zadatak, kao u ostalim igrama), a
 * `picture` / `pictures` slike. Tako traka napretka, igra sa drugom i zvezdice uživo rade isto
 * kao u ostalim igrama.
 */
export interface PuzzleView extends BaseView {
    /** Slika nivoa (od 1) i broj slika */
    picture: number;
    pictures: number;
    /** Tekući zadatak (slika, isečak, korpa) — monitor ga crta isto */
    current: PuzzleRound | null;
    /** Delovi na mestu (id-jevi; i delovi koji su bili na mestu od početka su u `given`) */
    placed: string[];
    /** Uljezi koje je dete probalo (ostaju u korpi, zatamnjeni) */
    rejected: string[];
    /** Izabran deo (dodir na deo, pa dodir na mesto) */
    selected: string | null;
    /** Deo čije mesto je istaknuto (pomoć) */
    hint: string | null;
    /** Delovi koji su u ovoj slici dobili pomoć */
    hinted: string[];
    /** Delovi koji su probani na pogrešnom mestu (nisu više „iz prvog pokušaja”) */
    tried: string[];
    /** Broj promašaja po delu (za pomoć) */
    misses: Record<string, number>;
    /** Pokazni deo (nivo 1) je postavljen — ruka ga je stavila */
    modeled: string | null;
    feedback: FeedbackKind;
    /** Uz poslednju grešku: deo je bio uljez */
    lastDecoy: boolean;
    promptedCount: number;
    /** Slika je složena (kratko slavlje pre sledeće) */
    solved: boolean;
}

/** Broj delova koje dete slaže na celom nivou (bez uljeza i bez delova na mestu od početka) */
export function levelPieceCount(rounds: readonly PuzzleRound[]): number {
    return rounds.reduce((sum, round) => sum + roundPieces(round).length, 0);
}

export function emptyPuzzleView(rounds: readonly PuzzleRound[]): PuzzleView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(levelPieceCount(rounds), 1),
        picture: 1,
        pictures: Math.max(rounds.length, 1),
        current: rounds[0] ?? null,
        placed: [],
        rejected: [],
        selected: null,
        hint: null,
        hinted: [],
        tried: [],
        misses: {},
        modeled: null,
        feedback: null,
        lastDecoy: false,
        solved: false,
    };
}

/** Sledeća slika: delovi i pomoć kreću ispočetka, brojači i poeni ostaju */
export function nextPictureView(view: PuzzleView, rounds: readonly PuzzleRound[]): PuzzleView {
    const index = view.picture; // sledeća (od 0)
    return {
        ...view,
        picture: index + 1,
        current: rounds[index] ?? null,
        placed: [],
        rejected: [],
        selected: null,
        hint: null,
        hinted: [],
        tried: [],
        misses: {},
        feedback: null,
        lastDecoy: false,
        solved: false,
    };
}

/** Koliko delova je dete već stavilo na mesto na celom nivou (pre tekuće slike + na tekućoj) */
function placedBefore(rounds: readonly PuzzleRound[], picture: number): number {
    return rounds.slice(0, Math.max(picture - 1, 0)).reduce((sum, round) => sum + roundPieces(round).length, 0);
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Deo je stavljen na svoje mesto. Prvi deo prvog nivoa stavlja ruka (pokazni, ne ocenjuje se);
 * „correct” = iz prvog pokušaja i bez pomoći, „prompted” = posle isticanja mesta.
 */
export function placePiece(current: PuzzleView, rounds: readonly PuzzleRound[], id: string, level: number, modeled = false): { next: PuzzleView; firstTry: boolean; done: boolean } {
    const round = current.current;
    const placed = [...current.placed, id];
    const demo = modeled && demoRounds(level, current.totalRounds) > 0;
    const firstTry = !demo && !current.tried.includes(id) && !current.hinted.includes(id) && current.hint !== id;
    const prompted = !demo && !firstTry && (current.hinted.includes(id) || current.hint === id);
    const done = round ? roundPieces(round).every((piece) => placed.includes(piece.id)) : true;
    const order = placedBefore(rounds, current.picture) + placed.length;
    const next: PuzzleView = {
        ...current,
        placed,
        selected: null,
        hint: current.hint === id ? null : current.hint,
        modeled: demo ? id : current.modeled,
        feedback: done ? "correct" : null,
        lastDecoy: false,
        solved: done,
        round: Math.min(order + 1, current.totalRounds),
        score: current.score + (demo ? 0 : firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (prompted ? 1 : 0),
    };
    return { next, firstTry, done };
}

/** Da li su svi delovi slike stavljeni iz prvog pokušaja (za veću pohvalu na kraju slike) */
export function pictureFirstTry(view: PuzzleView): boolean {
    return view.tried.length === 0 && view.hinted.length === 0;
}

/** Rezultat nivoa: total = delovi bez pokaznog; correct = iz prvog pokušaja; prompted = uz pomoć */
export function puzzleResult(final: PuzzleView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return {
        score: final.score,
        durationSec,
        correct,
        total,
        prompted: Math.max(0, Math.min(final.promptedCount, total - correct)),
    };
}

// ── Stanje sa monitora ────────────────────────────────────────────────────────

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);
const isPictureId = (value: unknown): value is PuzzlePictureId => typeof value === "string" && (PUZZLE_PICTURE_IDS as readonly string[]).includes(value);

function signs(value: unknown, rows: number, cols: number): number[][] | null {
    if (!Array.isArray(value) || value.length !== rows) return null;
    const out = value.map((row) => (Array.isArray(row) && row.length === cols && row.every((s) => s === 1 || s === -1) ? (row as number[]) : null));
    return out.every(Boolean) ? (out as number[][]) : null;
}

/** Zadatak sa monitora: sve što ne odgovara obliku (druga verzija, delimična poruka) se odbacuje */
export function cleanRound(value: unknown): PuzzleRound | null {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    const cols = toCount(raw.cols, 0);
    const rows = toCount(raw.rows, 0);
    if (!isPictureId(raw.picture) || cols < 1 || rows < 1 || cols > 6 || rows > 6) return null;
    const cells = cols * rows;
    let edges: PuzzleEdges | null = null;
    if (raw.edges && typeof raw.edges === "object") {
        const h = signs((raw.edges as Record<string, unknown>).h, rows - 1, cols);
        const v = signs((raw.edges as Record<string, unknown>).v, rows, cols - 1);
        if (h && v) edges = { h, v };
    }
    const given = Array.isArray(raw.given) ? raw.given.filter((cell): cell is number => Number.isInteger(cell) && cell >= 0 && cell < cells) : [];
    const tray = Array.isArray(raw.tray)
        ? raw.tray.flatMap((item): TrayPiece[] => {
              if (!item || typeof item !== "object") return [];
              const piece = item as Record<string, unknown>;
              const cell = piece.cell;
              if (typeof piece.id !== "string" || !isPictureId(piece.picture) || !Number.isInteger(cell) || (cell as number) < 0 || (cell as number) >= cells) return [];
              return [{ id: piece.id, picture: piece.picture, cell: cell as number }];
          })
        : [];
    return { picture: raw.picture, cols, rows, edges, guide: raw.guide === true, given, tray };
}

export function mergePuzzleMonitor(state: Partial<PuzzleView> | null | undefined): PuzzleView {
    const base = emptyPuzzleView([]);
    if (!state) return base;
    const current = cleanRound(state.current);
    const ids = new Set(current?.tray.map((piece) => piece.id) ?? []);
    const misses: Record<string, number> = {};
    if (state.misses && typeof state.misses === "object") {
        for (const [id, count] of Object.entries(state.misses)) if (ids.has(id)) misses[id] = toCount(count, 0);
    }
    const known = (list: unknown) => strings(list).filter((id) => ids.has(id));
    const pick = (id: unknown) => (typeof id === "string" && ids.has(id) ? id : null);
    return {
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.max(1, toCount(state.round, 1)),
        totalRounds: Math.max(1, toCount(state.totalRounds, 1)),
        picture: Math.max(1, toCount(state.picture, 1)),
        pictures: Math.max(1, toCount(state.pictures, 1)),
        current,
        placed: known(state.placed),
        rejected: known(state.rejected),
        selected: pick(state.selected),
        hint: pick(state.hint),
        hinted: known(state.hinted),
        tried: known(state.tried),
        misses,
        modeled: pick(state.modeled),
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        lastDecoy: state.lastDecoy === true,
        solved: state.solved === true,
    };
}
