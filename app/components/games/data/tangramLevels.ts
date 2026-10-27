// Sadržaj igre „Tangram”: od geometrijskih delova (dva velika trougla, srednji, dva mala,
// kvadrat i paralelogram — klasičan komplet od sedam delova) dete slaže oblik: kućicu, ribu,
// raketu, mačku, zeku, dinosaurusa… Deo se prevlači na njegovo mesto u obliku i, ako treba,
// okreće dugmetom „Okreni”. Kad je oblik složen, oživi (riba zapliva, raketa poleti, mačka
// trepne). Bez Reacta, da bi se nivoi i geometrija proveravali u testovima; crteži su u
// games/tangram/.
//
// Zašto ovako (uzrast 4–10, i deca sa autizmom):
//  • Slaganje oblika od delova (tangram, „pattern blocks”) razvija prostorno mišljenje:
//    deca vide da se veći oblik sastoji od manjih, upoređuju veličine i uglove i u glavi
//    okreću deo (mentalna rotacija). Istraživanja povezuju ove igre sa kasnijim uspehom u
//    geometriji i matematici. Deca od 4–6 godina prvo slažu delove po obrisima u boji, a
//    stariji po senci bez linija.
//  • Deca vole poznate i „žive” teme: životinje, kuće, vozila, dinosaurusi, svemir. Složen
//    oblik oživi — jasna posledica truda i mala nagrada na kraju svakog oblika.
//  • Učenje bez greške (errorless learning): prvi oblik je kvadrat od samo dva trougla, prvi
//    deo prevuče ruka (pokazni zadatak se ne ocenjuje), a mesto svakog dela je obojeno bojom
//    tog dela. Deo pušten blizu svog mesta sam „legne”; pomoć (mesto zasvetli, a dugme
//    „Okreni” zasvetli kad deo treba okrenuti) na lakim nivoima stiže već posle prve greške
//    i posle čekanja.
//  • Podrška se povlači postepeno (stimulus fading): obrisi u boji → samo linije → samo
//    neke linije → blede linije → samo senka. Delova ima sve više (2 → 7), a okretanje
//    dolazi tek na srednjim nivoima: prvo jedan okrenut deo uz pokazano dugme, pa više njih.
//  • Predvidljiv raspored (TEACCH): oblik je uvek na istom mestu, delovi uvek pored njega.
//    Pogrešan deo nije kazna: zaljulja se i mirno vrati, a glas kaže kratku činjenicu
//    („Skoro! Okreni ga.”). Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.
//
// Nivoi: Lako 1–5 — dva do četiri dela, obrisi u boji, bez okretanja (kvadrat, kućica, riba,
// jelka, lisica, brod, sova…); Srednje 6–10 — četiri do šest delova, samo linije, pa samo neke,
// prvi okrenuti delovi (pas, auto, raketa, ptica, kornjača, mačka, zeka, dinosaurus); Teško
// 11–15 — svih sedam delova: veliki kvadrat i trougao sa linijama, kuća, mačka i raketa, pa
// blede linije, pa samo senka i delovi koji stižu okrenuti (zeka, patka, dinosaurus).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import type { PieceColor } from "@/app/components/games/kit/shapePaths";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

// ── Delovi ────────────────────────────────────────────────────────────────────

/** √2 i √2/2: dužine kod delova položenih „ukoso” */
const R = Math.SQRT2;
const H = R / 2;

export type Pt = readonly [number, number];

export const PIECE_IDS = ["lgA", "lgB", "md", "smA", "smB", "sq", "pa"] as const;
export type PieceId = (typeof PIECE_IDS)[number];
export type PieceKind = "lg" | "md" | "sm" | "sq" | "pa";

export interface PieceInfo {
    id: PieceId;
    kind: PieceKind;
    color: PieceColor;
}

/** Svaki deo ima svoju boju (ista je i u obrisu u boji na lakim nivoima) */
export const PIECES: Readonly<Record<PieceId, PieceInfo>> = {
    lgA: { id: "lgA", kind: "lg", color: "red" },
    lgB: { id: "lgB", kind: "lg", color: "blue" },
    md: { id: "md", kind: "md", color: "yellow" },
    smA: { id: "smA", kind: "sm", color: "green" },
    smB: { id: "smB", kind: "sm", color: "purple" },
    sq: { id: "sq", kind: "sq", color: "orange" },
    pa: { id: "pa", kind: "pa", color: "pink" },
};

/** Naziv dela (za čitač ekrana i natpis): veličina, boja i oblik */
export const PIECE_LABEL: Readonly<Record<PieceId, string>> = {
    lgA: "Veliki crveni trougao",
    lgB: "Veliki plavi trougao",
    md: "Srednji žuti trougao",
    smA: "Mali zeleni trougao",
    smB: "Mali ljubičasti trougao",
    sq: "Narandžasti kvadrat",
    pa: "Ružičasti paralelogram",
};

export function isPieceId(value: unknown): value is PieceId {
    return typeof value === "string" && (PIECE_IDS as readonly string[]).includes(value);
}

/**
 * Osnovni položaj svakog dela (jedinica = kraća stranica malog trougla). Veliki trougao ima
 * katete 2, srednji √2, mali 1; kvadrat stranicu 1, a paralelogram stranice 1 i √2 — kao u
 * klasičnom tangramu, gde ceo komplet pokriva kvadrat stranice 2√2.
 */
const CANON: Readonly<Record<PieceKind, readonly Pt[]>> = {
    lg: [[0, 0], [2, 0], [0, 2]],
    md: [[0, 0], [R, 0], [0, R]],
    sm: [[0, 0], [1, 0], [0, 1]],
    sq: [[0, 0], [1, 0], [1, 1], [0, 1]],
    pa: [[0, 0], [1, 0], [2, 1], [1, 1]],
};

/** Posle koliko okreta od 45° deo opet izgleda isto: trougao 8, kvadrat 2, paralelogram 4 */
export const TURNS: Readonly<Record<PieceKind, number>> = { lg: 8, md: 8, sm: 8, sq: 2, pa: 4 };

const EPS = 1e-6;
const mod = (value: number, by: number) => ((value % by) + by) % by;

/** Tačke okrenute za `k` × 45° u smeru kazaljke (y raste naniže, kao na ekranu) */
export function rotatePoints(points: readonly Pt[], k: number): Pt[] {
    const angle = (mod(k, 8) * Math.PI) / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return points.map(([x, y]) => [x * cos - y * sin, x * sin + y * cos] as const);
}

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export function boxOf(points: readonly Pt[]): Box {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Deo u okretu `rot`, pomeren tako da mu je sredina okvira u (0, 0) */
export function pieceShape(kind: PieceKind, rot: number): Pt[] {
    const turned = rotatePoints(CANON[kind], rot);
    const box = boxOf(turned);
    return turned.map(([x, y]) => [x - box.x - box.w / 2, y - box.y - box.h / 2] as const);
}

/** Najveća širina ili visina dela u bilo kom okretu (mesto za deo u korpi) */
export const PIECE_SPAN: Readonly<Record<PieceKind, number>> = Object.fromEntries(
    (Object.keys(CANON) as PieceKind[]).map((kind) => [kind, Math.max(...Array.from({ length: 8 }, (_, k) => boxOf(rotatePoints(CANON[kind], k))).map((b) => Math.max(b.w, b.h)))])
) as Record<PieceKind, number>;

/** Deo u okretu `rot` ulazi u mesto okrenuto `target` (do na simetriju dela) */
export function fitsTurn(kind: PieceKind, rot: number, target: number): boolean {
    return mod(rot - target, TURNS[kind]) === 0;
}

/** Okret osnovnog oblika koji daje baš ove tačke (do na pomeranje), ili -1 (npr. ogledalo) */
export function orientationOf(kind: PieceKind, points: readonly Pt[]): number {
    const norm = (list: readonly Pt[]) => {
        const box = boxOf(list);
        return list.map(([x, y]) => [x - box.x, y - box.y] as const);
    };
    const wanted = norm(points);
    for (let k = 0; k < 8; k += 1) {
        const candidate = norm(rotatePoints(CANON[kind], k));
        if (candidate.length === wanted.length && candidate.every((p) => wanted.some((q) => Math.abs(p[0] - q[0]) < EPS && Math.abs(p[1] - q[1]) < EPS))) return k;
    }
    return -1;
}

// ── Oblici ────────────────────────────────────────────────────────────────────

/** Kako oblik oživi kad je složen */
export type Alive = "pop" | "glow" | "swim" | "sail" | "sway" | "blink" | "wag" | "drive" | "lift" | "hop" | "crawl" | "nod" | "shine";

/** Ukrasi oblika (oči, vrata, plamen…). `done`: vidi se tek kad je oblik složen. */
export type Deco = (
    | { k: "eye"; x: number; y: number; r: number }
    | { k: "nose"; x: number; y: number; r: number }
    | { k: "smile"; x: number; y: number; w: number }
    | { k: "cheek"; x: number; y: number; r: number }
    | { k: "whiskers"; x: number; y: number; w: number }
    /** Kljun koji gleda ulevo ili nadole */
    | { k: "beak"; x: number; y: number; r: number; down?: boolean }
    | { k: "line"; x1: number; y1: number; x2: number; y2: number }
    | { k: "flag"; x: number; y: number; s: number }
    | { k: "wheel"; x: number; y: number; r: number }
    | { k: "door"; x: number; y: number; w: number; h: number }
    | { k: "window"; x: number; y: number; r: number }
    | { k: "lights"; pts: Pt[] }
    | { k: "star"; x: number; y: number; r: number }
    | { k: "flame"; x: number; y: number; w: number }
    | { k: "bubbles"; x: number; y: number }
    | { k: "water"; y: number }
    | { k: "smoke"; x: number; y: number }
) & { done?: boolean };

export interface TargetDef {
    piece: PieceId;
    pts: readonly Pt[];
    /** Šta je ovaj deo u obliku („krov”) — glas na lakim nivoima: „Ovaj trougao je krov.” */
    part?: string;
}

export interface FigureDef {
    id: string;
    /** Nominativ („riba”) */
    name: string;
    /** Akuzativ („ribu”) — „Složi ribu od četiri dela.” */
    acc: string;
    /** Šta se kaže kad je složen („Riba pliva.”) */
    done: string;
    alive: Alive;
    targets: readonly TargetDef[];
    deco?: readonly Deco[];
    /** Vrh i rep se dodiruju samo u tački (rep ribe, rep mačke) */
    touch?: boolean;
}

const t = (piece: PieceId, pts: readonly Pt[], part?: string): TargetDef => (part ? { piece, pts, part } : { piece, pts });
const sq = (x: number, y: number): Pt[] => [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
/** Oblik zadat u jedinicama klasičnog kvadrata 8 × 8 (stranica 8 = 2√2) */
const e = (pts: readonly Pt[]): Pt[] => pts.map(([x, y]) => [(x * R) / 4, (y * R) / 4] as const);
const face = (x1: number, x2: number, y: number, r: number, mouth: number): Deco[] => [
    { k: "eye", x: x1, y, r },
    { k: "eye", x: x2, y, r },
    { k: "smile", x: (x1 + x2) / 2, y: y + mouth, w: (x2 - x1) * 0.28, done: true },
    { k: "cheek", x: x1 - r * 0.6, y: y + mouth * 0.7, r: r * 1.1, done: true },
    { k: "cheek", x: x2 + r * 0.6, y: y + mouth * 0.7, r: r * 1.1, done: true },
];

// Glava mačke: kvadrat „na vrhu” sa dva mala trougla kao ušima (vrh u Tv, levo Lv, dole B, desno Rv)
const head = (Tv: Pt) => {
    const Rv: Pt = [Tv[0] + H, Tv[1] + H];
    const B: Pt = [Tv[0], Tv[1] + R];
    const Lv: Pt = [Tv[0] - H, Tv[1] + H];
    return { Tv, Rv, B, Lv };
};

// Mačka koja sedi (gleda udesno): telo od dva velika trougla, glava i uši, vrat srednji, rep paralelogram
const CAT_HEAD = head([R + H, -H]);
const CAT: TargetDef[] = [
    t("lgA", [[2 * R, 0], [2 * R, 2 * R], [R, R]]),
    t("lgB", [[0, 2 * R], [R, R], [2 * R, 2 * R]]),
    t("sq", [CAT_HEAD.Tv, CAT_HEAD.Rv, CAT_HEAD.B, CAT_HEAD.Lv]),
    t("smA", [CAT_HEAD.Tv, CAT_HEAD.Lv, [R, -R]]),
    t("smB", [CAT_HEAD.Tv, CAT_HEAD.Rv, [2 * R, -R]]),
    t("md", [[R + H, H], [R + H - 1, H - 1], [R + H - 1, H + 1]]),
];
const CAT_TAIL = t("pa", [[-2, 2 * R - 1], [-1, 2 * R - 1], [0, 2 * R], [-1, 2 * R]]);
const CAT_DECO: Deco[] = [
    { k: "eye", x: R + 0.42, y: 0.02, r: 0.085 },
    { k: "eye", x: 2 * R - 0.42, y: 0.02, r: 0.085 },
    { k: "nose", x: R + H, y: 0.32, r: 0.07 },
    { k: "whiskers", x: R + H, y: 0.4, w: 0.55 },
];

// Zeka (gleda ulevo): grba od dva velika, glava kvadrat na prednjoj strani, uši paralelogram i mali
const BUN = head([3 - H, 2 - H]);
const RABBIT: TargetDef[] = [
    t("lgA", [[1, 4], [3, 2], [3, 4]]),
    t("lgB", [[3, 2], [5, 4], [3, 4]]),
    t("sq", [BUN.Tv, BUN.Rv, BUN.B, BUN.Lv]),
    t("pa", [BUN.Tv, BUN.Rv, [3, 2 - R], [3 - H, 2 - H - R]]),
    t("smA", [BUN.Tv, BUN.Lv, [3 - R, 2 - R]]),
    t("smB", [[4, 3], [5, 4], [5, 3]]),
];
const RABBIT_PAW = t("md", [[1, 4], [2, 3], [0, 3]]);
const RABBIT_DECO: Deco[] = [
    { k: "eye", x: 2.05, y: 1.95, r: 0.085 },
    { k: "nose", x: 3 - R + 0.12, y: 2.05, r: 0.06 },
];

// Patka na vodi (gleda ulevo): grudi kvadrat, vrat paralelogram, glava mali, telo dva velika
const DUCK: TargetDef[] = [
    t("sq", sq(0, 2)),
    t("pa", [[-1, 1], [0, 1], [1, 2], [0, 2]]),
    t("smA", [[-1, 1], [0, 1], [0, 0]]),
    t("smB", [[1, 2], [1, 3], [2, 2]]),
    t("lgA", [[1, 3], [3, 3], [3, 1]]),
    t("lgB", [[3, 1], [3, 3], [5, 3]]),
];
const DUCK_TAIL = t("md", [[5, 3], [4, 2], [6, 2]]);
const DUCK_DECO: Deco[] = [
    { k: "eye", x: -0.22, y: 0.72, r: 0.08 },
    { k: "beak", x: -1, y: 1, r: 0.22 },
    { k: "water", y: 2.8 },
];

// Dinosaurus (gleda ulevo): grba od dva velika, vrat kvadrat + paralelogram, glava mali, rep srednji
const DINO_NECK = head([1 + H, 4 - R - H]);
const DINO_TOP: Pt = [1 + H, 4 - R - H - R];
const DINO_TOP_R: Pt = [1 + R, 4 - 2 * R];
const DINO: TargetDef[] = [
    t("lgA", [[1, 4], [3, 2], [3, 4]]),
    t("lgB", [[3, 2], [5, 4], [3, 4]]),
    t("sq", [DINO_NECK.Tv, DINO_NECK.Rv, DINO_NECK.B, DINO_NECK.Lv]),
    t("pa", [DINO_NECK.Tv, DINO_NECK.Rv, DINO_TOP_R, DINO_TOP]),
    t("smA", [DINO_TOP, DINO_TOP_R, [DINO_TOP[0] + H, DINO_TOP[1] - H]]),
    t("md", [[5, 4], [7, 4], [6, 3]]),
];
const DINO_LEG = t("smB", [[2.2, 4], [3.2, 4], [2.2, 5]]);
const DINO_DECO: Deco[] = [{ k: "eye", x: DINO_TOP[0] + 0.42, y: DINO_TOP[1] - 0.05, r: 0.075 }];

// Raketa: vrh srednji, telo dva velika, donji deo paralelogram i dva mala, motor kvadrat
const ROCKET_TOP: TargetDef[] = [
    t("md", [[0, 1], [2, 1], [1, 0]]),
    t("lgA", [[0, 1], [2, 1], [0, 3]]),
    t("lgB", [[2, 1], [2, 3], [0, 3]]),
];
const ROCKET_LOW: TargetDef[] = [
    t("pa", [[0, 3], [1, 3], [2, 4], [1, 4]]),
    t("smA", [[0, 3], [1, 4], [0, 4]]),
    t("smB", [[1, 3], [2, 3], [2, 4]]),
];

// Klasičan kvadrat od sedam delova (jedinice 8 × 8)
const SQUARE7: TargetDef[] = [
    t("lgA", e([[0, 0], [8, 0], [4, 4]])),
    t("lgB", e([[0, 0], [4, 4], [0, 8]])),
    t("md", e([[8, 4], [8, 8], [4, 8]])),
    t("smA", e([[8, 0], [8, 4], [6, 2]])),
    t("sq", e([[4, 4], [6, 2], [8, 4], [6, 6]])),
    t("smB", e([[4, 4], [6, 6], [2, 6]])),
    t("pa", e([[0, 8], [2, 6], [6, 6], [4, 8]])),
];

const turnFigure = (targets: readonly TargetDef[]): TargetDef[] => targets.map((target) => ({ ...target, pts: rotatePoints(target.pts, 2) }));

const HOUSE_DOOR = (x: number, y: number, w: number, h: number): Deco => ({ k: "door", x, y, w, h });

export const FIGURE_DEFS: readonly FigureDef[] = [
    // ── Dva dela ──
    {
        id: "square-a",
        name: "kvadrat",
        acc: "kvadrat",
        done: "Kvadrat se smeje.",
        alive: "pop",
        targets: [
            t("lgA", [[0, 0], [2, 0], [0, 2]]),
            t("lgB", [[2, 0], [2, 2], [0, 2]]),
        ],
        deco: face(0.62, 1.38, 0.82, 0.12, 0.42).map((d) => ({ ...d, done: true })),
    },
    {
        id: "square-b",
        name: "kvadrat",
        acc: "kvadrat",
        done: "Kvadrat se smeje.",
        alive: "pop",
        targets: [
            t("lgA", [[0, 0], [2, 0], [2, 2]]),
            t("lgB", [[0, 0], [2, 2], [0, 2]]),
        ],
        deco: face(0.62, 1.38, 0.82, 0.12, 0.42).map((d) => ({ ...d, done: true })),
    },
    {
        id: "square-c",
        name: "kvadrat",
        acc: "kvadrat",
        done: "Kvadrat se smeje.",
        alive: "pop",
        targets: [
            t("smA", [[0, 0], [1, 0], [0, 1]]),
            t("smB", [[1, 0], [1, 1], [0, 1]]),
        ],
        deco: face(0.31, 0.69, 0.41, 0.06, 0.21).map((d) => ({ ...d, done: true })),
    },
    {
        id: "square-d",
        name: "kvadrat",
        acc: "kvadrat",
        done: "Kvadrat se smeje.",
        alive: "pop",
        targets: [
            t("smA", [[0, 0], [1, 0], [1, 1]]),
            t("smB", [[0, 0], [1, 1], [0, 1]]),
        ],
        deco: face(0.31, 0.69, 0.41, 0.06, 0.21).map((d) => ({ ...d, done: true })),
    },
    {
        id: "house-2",
        name: "kućica",
        acc: "kućicu",
        done: "Kućica je gotova.",
        alive: "glow",
        targets: [
            t("md", [[0, 1], [2, 1], [1, 0]], "krov"),
            t("sq", sq(0.5, 1), "zid"),
        ],
        deco: [HOUSE_DOOR(0.85, 1.42, 0.3, 0.58), { k: "window", x: 1, y: 0.62, r: 0.15 }, { k: "smoke", x: 1.55, y: 0.25 }],
    },
    {
        id: "fish-2",
        name: "riba",
        acc: "ribu",
        done: "Riba pliva.",
        alive: "swim",
        touch: true,
        targets: [
            t("sq", [[0, H], [H, 0], [R, H], [H, R]], "telo"),
            t("smA", [[R, H], [R + H, 0], [R + H, R]], "rep"),
        ],
        deco: [{ k: "eye", x: 0.42, y: 0.6, r: 0.08 }, { k: "smile", x: 0.3, y: 0.86, w: 0.08, done: true }, { k: "bubbles", x: -0.15, y: 0.3 }],
    },
    {
        id: "boat-2",
        name: "čamac",
        acc: "čamac",
        done: "Čamac plovi.",
        alive: "sail",
        targets: [
            t("md", [[0, 1], [2, 1], [1, 2]]),
            t("smA", [[1, 0], [1, 1], [0, 1]], "jedro"),
        ],
        deco: [{ k: "line", x1: 1, y1: 1, x2: 1, y2: -0.25 }, { k: "flag", x: 1, y: -0.25, s: 0.3 }, { k: "water", y: 1.75 }],
    },
    // ── Tri dela ──
    {
        id: "tree-3",
        name: "jelka",
        acc: "jelku",
        done: "Jelka svetli.",
        alive: "shine",
        targets: [
            t("lgA", [[0, 2], [2, 0], [2, 2]], "krošnja"),
            t("lgB", [[2, 0], [4, 2], [2, 2]], "krošnja"),
            t("sq", sq(1.5, 2), "stablo"),
        ],
        deco: [
            {
                k: "lights",
                pts: [[1.2, 1.55], [2.0, 1.05], [2.8, 1.55], [1.75, 1.7], [2.45, 0.95], [2.25, 1.6]],
            },
            { k: "star", x: 2, y: -0.05, r: 0.3 },
        ],
    },
    {
        id: "fox-3",
        name: "lisica",
        acc: "lisicu",
        done: "Lisica trepće.",
        alive: "blink",
        targets: [
            t("md", [[0, 0], [2, 0], [1, 1]], "glava"),
            t("smA", [[0, -1], [0, 0], [1, 0]], "uvo"),
            t("smB", [[2, -1], [2, 0], [1, 0]], "uvo"),
        ],
        deco: [
            { k: "eye", x: 0.62, y: 0.26, r: 0.08 },
            { k: "eye", x: 1.38, y: 0.26, r: 0.08 },
            { k: "nose", x: 1, y: 0.74, r: 0.08 },
        ],
    },
    {
        id: "kitten-3",
        name: "mače",
        acc: "mače",
        done: "Mače trepće.",
        alive: "blink",
        targets: [
            t("sq", [[H, 0], [R, H], [H, R], [0, H]], "glava"),
            t("smA", [[H, 0], [0, H], [0, -H]], "uvo"),
            t("smB", [[H, 0], [R, H], [R, -H]], "uvo"),
        ],
        deco: [
            { k: "eye", x: 0.43, y: 0.6, r: 0.075 },
            { k: "eye", x: 0.99, y: 0.6, r: 0.075 },
            { k: "nose", x: H, y: 0.86, r: 0.06 },
            { k: "whiskers", x: H, y: 0.92, w: 0.5 },
        ],
    },
    {
        id: "boat-3",
        name: "brod",
        acc: "brod",
        done: "Brod plovi.",
        alive: "sail",
        targets: [
            t("lgA", [[0, 0], [2 * R, 0], [R, R]]),
            t("md", [[R, -R], [R, 0], [0, 0]], "jedro"),
            t("smA", [[R, -1], [R, 0], [R + 1, 0]], "jedro"),
        ],
        deco: [{ k: "line", x1: R, y1: 0, x2: R, y2: -R - 0.3 }, { k: "flag", x: R, y: -R - 0.3, s: 0.35 }, { k: "water", y: R - 0.25 }],
    },
    {
        id: "house-3",
        name: "kućica",
        acc: "kućicu",
        done: "Kućica je gotova.",
        alive: "glow",
        targets: [
            t("md", [[0, 1], [2, 1], [1, 0]], "krov"),
            t("smA", [[0.5, 1], [1.5, 1], [0.5, 2]], "zid"),
            t("smB", [[1.5, 1], [1.5, 2], [0.5, 2]], "zid"),
        ],
        deco: [HOUSE_DOOR(0.85, 1.42, 0.3, 0.58), { k: "window", x: 1, y: 0.62, r: 0.15 }, { k: "smoke", x: 1.55, y: 0.25 }],
    },
    {
        id: "fish-3",
        name: "riba",
        acc: "ribu",
        done: "Riba pliva.",
        alive: "swim",
        targets: [
            t("lgA", [[0, R], [R, 0], [R, 2 * R]], "telo"),
            t("smA", [[R, R - 1], [R, R], [R + 1, R - 1]], "rep"),
            t("smB", [[R, R], [R, R + 1], [R + 1, R + 1]], "rep"),
        ],
        deco: [{ k: "eye", x: 0.52, y: R - 0.16, r: 0.1 }, { k: "smile", x: 0.3, y: R + 0.2, w: 0.1, done: true }, { k: "bubbles", x: -0.2, y: R - 0.6 }],
    },
    // ── Četiri dela ──
    {
        id: "fish-4",
        name: "riba",
        acc: "ribu",
        done: "Riba pliva.",
        alive: "swim",
        touch: true,
        targets: [
            t("lgA", [[0, R], [R, 0], [R, 2 * R]], "telo"),
            t("lgB", [[R, 0], [2 * R, R], [R, 2 * R]], "telo"),
            t("md", [[2 * R, R], [2 * R + 1, R - 1], [2 * R + 1, R + 1]], "rep"),
            t("smA", [[R, 0], [R + 1, 1], [R + 1, 0]], "peraje"),
        ],
        deco: [{ k: "eye", x: 0.72, y: R - 0.22, r: 0.12 }, { k: "smile", x: 0.4, y: R + 0.22, w: 0.12, done: true }, { k: "bubbles", x: -0.25, y: R - 0.7 }],
    },
    {
        id: "owl-4",
        name: "sova",
        acc: "sovu",
        done: "Sova trepće.",
        alive: "blink",
        targets: [
            t("lgA", [[0, 1], [2, 1], [0, 3]], "telo"),
            t("lgB", [[2, 1], [2, 3], [0, 3]], "telo"),
            t("smA", [[0, 0], [0, 1], [1, 1]], "uvo"),
            t("smB", [[2, 0], [2, 1], [1, 1]], "uvo"),
        ],
        deco: [
            { k: "eye", x: 0.62, y: 1.55, r: 0.17 },
            { k: "eye", x: 1.38, y: 1.55, r: 0.17 },
            { k: "beak", x: 1, y: 1.85, r: 0.17, down: true },
        ],
    },
    {
        id: "sail-4",
        name: "jedrilica",
        acc: "jedrilicu",
        done: "Jedrilica plovi.",
        alive: "sail",
        targets: [
            t("smA", [[0, 2], [1, 2], [1, 3]]),
            t("sq", sq(1, 2)),
            t("smB", [[2, 2], [3, 2], [2, 3]]),
            t("lgA", [[2, 0], [2, 2], [0, 2]], "jedro"),
        ],
        deco: [{ k: "line", x1: 2, y1: 2, x2: 2, y2: -0.3 }, { k: "flag", x: 2, y: -0.3, s: 0.35 }, { k: "water", y: 2.8 }],
    },
    {
        id: "dog-4",
        name: "pas",
        acc: "psa",
        done: "Pas maše ušima.",
        alive: "wag",
        targets: [
            t("lgA", [[0, 0], [2, 0], [0, 2]], "glava"),
            t("lgB", [[2, 0], [2, 2], [0, 2]], "glava"),
            t("smA", [[-1, 0], [0, 0], [0, 1]], "uvo"),
            t("smB", [[3, 0], [2, 0], [2, 1]], "uvo"),
        ],
        deco: [
            { k: "eye", x: 0.62, y: 0.72, r: 0.12 },
            { k: "eye", x: 1.38, y: 0.72, r: 0.12 },
            { k: "nose", x: 1, y: 1.12, r: 0.15 },
            { k: "smile", x: 1, y: 1.42, w: 0.22, done: true },
        ],
    },
    {
        id: "house-4",
        name: "kuća",
        acc: "kuću",
        done: "Kuća je gotova.",
        alive: "glow",
        targets: [
            t("md", [[0, 1], [2, 1], [1, 0]]),
            t("lgA", [[0, 1], [2, 1], [0, 3]]),
            t("lgB", [[2, 1], [2, 3], [0, 3]]),
            t("smA", [[2, 2], [2, 3], [3, 3]]),
        ],
        deco: [HOUSE_DOOR(0.75, 2.05, 0.5, 0.95), { k: "window", x: 1, y: 0.62, r: 0.15 }, { k: "smoke", x: 1.55, y: 0.25 }],
    },
    {
        id: "car-4",
        name: "auto",
        acc: "auto",
        done: "Auto se vozi.",
        alive: "drive",
        targets: [
            t("pa", [[0, 1], [1, 1], [2, 2], [1, 2]]),
            t("smA", [[0, 1], [1, 2], [0, 2]]),
            t("smB", [[1, 1], [2, 1], [2, 2]]),
            t("sq", sq(0.5, 0)),
        ],
        deco: [
            { k: "wheel", x: 0.45, y: 2.02, r: 0.28 },
            { k: "wheel", x: 1.55, y: 2.02, r: 0.28 },
        ],
    },
    // ── Pet delova ──
    {
        id: "rocket-5",
        name: "raketa",
        acc: "raketu",
        done: "Raketa leti.",
        alive: "lift",
        targets: [
            ...ROCKET_TOP,
            t("smA", [[0, 2], [0, 3], [-1, 3]]),
            t("smB", [[2, 2], [2, 3], [3, 3]]),
        ],
        deco: [
            { k: "window", x: 1, y: 1.75, r: 0.32 },
            { k: "flame", x: 1, y: 3, w: 1.3 },
        ],
    },
    {
        id: "bird-5",
        name: "ptica",
        acc: "pticu",
        done: "Ptica skakuće.",
        alive: "hop",
        targets: [
            t("lgA", [[0, R], [R, 0], [R, 2 * R]]),
            t("lgB", [[R, 0], [2 * R, R], [R, 2 * R]]),
            t("sq", [[H, H], [R, 0], [H, -H], [0, 0]]),
            t("smA", [[0, 0], [H, -H], [-H, -H]]),
            t("smB", [[2 * R - 1, R - 1], [2 * R, R], [2 * R, R - 1]]),
        ],
        deco: [
            { k: "eye", x: 0.62, y: -0.08, r: 0.085 },
            { k: "line", x1: R - 0.25, y1: 2 * R - 0.25, x2: R - 0.35, y2: 2 * R + 0.3 },
            { k: "line", x1: R + 0.25, y1: 2 * R - 0.25, x2: R + 0.35, y2: 2 * R + 0.3 },
        ],
    },
    {
        id: "turtle-5",
        name: "kornjača",
        acc: "kornjaču",
        done: "Kornjača polako ide.",
        alive: "crawl",
        targets: [
            t("lgA", [[0, 2], [2, 0], [2, 2]]),
            t("lgB", [[2, 0], [4, 2], [2, 2]]),
            t("sq", sq(3.5, 2)),
            t("smA", [[0.5, 2], [1.5, 2], [0.5, 3]]),
            t("smB", [[2.5, 2], [3.5, 2], [2.5, 3]]),
        ],
        deco: [{ k: "eye", x: 4.18, y: 2.35, r: 0.09 }, { k: "smile", x: 4.22, y: 2.62, w: 0.12, done: true }],
    },
    {
        id: "car-5",
        name: "auto",
        acc: "auto",
        done: "Auto se vozi.",
        alive: "drive",
        targets: [
            t("pa", [[1, 1], [2, 1], [3, 2], [2, 2]]),
            t("smA", [[1, 1], [2, 2], [1, 2]]),
            t("smB", [[2, 1], [3, 1], [3, 2]]),
            t("sq", sq(0, 1)),
            t("md", [[0.5, 1], [2.5, 1], [1.5, 0]]),
        ],
        deco: [
            { k: "wheel", x: 0.6, y: 2.02, r: 0.32 },
            { k: "wheel", x: 2.4, y: 2.02, r: 0.32 },
        ],
    },
    {
        id: "fish-5",
        name: "riba",
        acc: "ribu",
        done: "Riba pliva.",
        alive: "swim",
        touch: true,
        targets: [
            t("lgA", [[0, R], [R, 0], [R, 2 * R]]),
            t("lgB", [[R, 0], [2 * R, R], [R, 2 * R]]),
            t("md", [[2 * R, R], [2 * R + 1, R - 1], [2 * R + 1, R + 1]]),
            t("smA", [[R, 0], [R + 1, 1], [R + 1, 0]]),
            t("smB", [[R, 2 * R], [R + 1, 2 * R - 1], [R + 1, 2 * R]]),
        ],
        deco: [{ k: "eye", x: 0.72, y: R - 0.22, r: 0.12 }, { k: "smile", x: 0.4, y: R + 0.22, w: 0.12, done: true }, { k: "bubbles", x: -0.25, y: R - 0.7 }],
    },
    {
        id: "house-5",
        name: "kuća",
        acc: "kuću",
        done: "Kuća je gotova.",
        alive: "glow",
        targets: [
            t("md", [[0, 1], [2, 1], [1, 0]]),
            t("lgA", [[0, 1], [2, 1], [0, 3]]),
            t("lgB", [[2, 1], [2, 3], [0, 3]]),
            t("smA", [[2, 2], [2, 3], [3, 3]]),
            t("smB", [[0, 2], [0, 3], [-1, 3]]),
        ],
        deco: [HOUSE_DOOR(0.75, 2.05, 0.5, 0.95), { k: "window", x: 1, y: 0.62, r: 0.15 }, { k: "smoke", x: 1.55, y: 0.25 }],
    },
    // ── Šest delova ──
    { id: "cat-6", name: "mačka", acc: "mačku", done: "Mačka trepće.", alive: "blink", targets: CAT, deco: CAT_DECO },
    { id: "rabbit-6", name: "zeka", acc: "zeku", done: "Zeka skače.", alive: "hop", targets: RABBIT, deco: RABBIT_DECO },
    { id: "rocket-6", name: "raketa", acc: "raketu", done: "Raketa leti.", alive: "lift", targets: [...ROCKET_TOP, ...ROCKET_LOW], deco: [{ k: "window", x: 1, y: 1.75, r: 0.32 }, { k: "flame", x: 1, y: 4, w: 1.4 }] },
    { id: "duck-6", name: "patka", acc: "patku", done: "Patka pliva.", alive: "sail", targets: DUCK, deco: DUCK_DECO },
    { id: "dino-6", name: "dinosaurus", acc: "dinosaurusa", done: "Dinosaurus klima glavom.", alive: "nod", touch: true, targets: DINO, deco: DINO_DECO },
    // ── Sedam delova ──
    { id: "square-7", name: "kvadrat", acc: "veliki kvadrat", done: "Veliki kvadrat je gotov.", alive: "pop", targets: SQUARE7 },
    { id: "square-7r", name: "kvadrat", acc: "veliki kvadrat", done: "Veliki kvadrat je gotov.", alive: "pop", targets: turnFigure(SQUARE7) },
    {
        id: "triangle-7",
        name: "trougao",
        acc: "veliki trougao",
        done: "Veliki trougao je gotov.",
        alive: "pop",
        targets: [
            t("lgA", e([[0, 8], [8, 8], [4, 4]])),
            t("lgB", e([[8, 8], [16, 8], [12, 4]])),
            t("md", e([[8, 8], [12, 4], [8, 4]])),
            t("sq", e([[6, 2], [8, 0], [10, 2], [8, 4]])),
            t("smA", e([[4, 4], [6, 2], [6, 6]])),
            t("pa", e([[6, 2], [8, 4], [8, 8], [6, 6]])),
            t("smB", e([[8, 4], [10, 2], [12, 4]])),
        ],
    },
    {
        id: "house-7",
        name: "kuća",
        acc: "kuću",
        done: "Kuća je gotova.",
        alive: "glow",
        targets: [
            t("lgA", [[0, 2], [2, 0], [2, 2]]),
            t("lgB", [[2, 0], [4, 2], [2, 2]]),
            t("md", [[1, 4], [3, 4], [2, 3]]),
            t("sq", sq(2, 2)),
            t("smA", [[1, 2], [2, 2], [1, 3]]),
            t("pa", [[2, 2], [2, 3], [1, 4], [1, 3]]),
            t("smB", [[2, 3], [3, 3], [3, 4]]),
        ],
        deco: [HOUSE_DOOR(1.78, 3.35, 0.44, 0.65), { k: "window", x: 2, y: 1.15, r: 0.25 }, { k: "smoke", x: 3, y: 0.5 }],
    },
    { id: "cat-7", name: "mačka", acc: "mačku", done: "Mačka trepće.", alive: "blink", touch: true, targets: [...CAT, CAT_TAIL], deco: CAT_DECO },
    {
        id: "rocket-7",
        name: "raketa",
        acc: "raketu",
        done: "Raketa leti.",
        alive: "lift",
        targets: [...ROCKET_TOP, ...ROCKET_LOW, t("sq", sq(0.5, 4))],
        deco: [
            { k: "window", x: 1, y: 1.75, r: 0.32 },
            { k: "flame", x: 1, y: 5, w: 0.95 },
        ],
    },
    { id: "rabbit-7", name: "zeka", acc: "zeku", done: "Zeka skače.", alive: "hop", targets: [...RABBIT, RABBIT_PAW], deco: RABBIT_DECO },
    { id: "duck-7", name: "patka", acc: "patku", done: "Patka pliva.", alive: "sail", targets: [...DUCK, DUCK_TAIL], deco: DUCK_DECO },
    { id: "dino-7", name: "dinosaurus", acc: "dinosaurusa", done: "Dinosaurus klima glavom.", alive: "nod", touch: true, targets: [...DINO, DINO_LEG], deco: DINO_DECO },
];

// ── Izračunat oblik (za crtanje i proveru) ───────────────────────────────────

export interface Target {
    index: number;
    piece: PieceId;
    kind: PieceKind;
    /** Okret dela koji tu ulazi (0–7) */
    rot: number;
    pts: Pt[];
    /** Sredina okvira mesta */
    cx: number;
    cy: number;
    part?: string;
}

export interface Figure extends Omit<FigureDef, "targets" | "deco"> {
    targets: Target[];
    deco: Deco[];
    /** Okvir svih mesta (od 0, 0) */
    size: { w: number; h: number };
    /** Okvir crteža (mesta + vazduh oko njih + ukrasi) */
    view: Box;
}

const shiftDeco = (deco: Deco, dx: number, dy: number): Deco => {
    if (deco.k === "lights") return { ...deco, pts: deco.pts.map(([x, y]) => [x + dx, y + dy] as const) };
    if (deco.k === "line") return { ...deco, x1: deco.x1 + dx, y1: deco.y1 + dy, x2: deco.x2 + dx, y2: deco.y2 + dy };
    if (deco.k === "water") return { ...deco, y: deco.y + dy };
    return { ...deco, x: deco.x + dx, y: deco.y + dy };
};

function buildFigure(def: FigureDef): Figure {
    const all = def.targets.flatMap((target) => target.pts);
    const box = boxOf(all);
    const targets: Target[] = def.targets.map((target, index) => {
        const pts = target.pts.map(([x, y]) => [x - box.x, y - box.y] as const);
        const own = boxOf(pts);
        const kind = PIECES[target.piece].kind;
        return { index, piece: target.piece, kind, rot: orientationOf(kind, pts), pts, cx: own.x + own.w / 2, cy: own.y + own.h / 2, ...(target.part ? { part: target.part } : {}) };
    });
    const deco = (def.deco ?? []).map((item) => shiftDeco(item, -box.x, -box.y));
    // Vazduh oko oblika, i mesto za ukrase koji vire (zastavica, plamen, voda, točkovi)
    const pad = Math.max(0.28, 0.08 * Math.max(box.w, box.h));
    let top = -pad;
    let bottom = box.h + pad;
    let left = -pad;
    const right = box.w + pad;
    for (const item of deco) {
        if (item.k === "flag") top = Math.min(top, item.y - 0.1);
        if (item.k === "line") top = Math.min(top, Math.min(item.y1, item.y2) - 0.1);
        if (item.k === "star") top = Math.min(top, item.y - item.r - 0.05);
        if (item.k === "flame") bottom = Math.max(bottom, item.y + item.w * 0.9);
        if (item.k === "wheel") bottom = Math.max(bottom, item.y + item.r + 0.12);
        if (item.k === "water") bottom = Math.max(bottom, item.y + 0.45);
        if (item.k === "bubbles") left = Math.min(left, item.x - 0.3);
        if (item.k === "smoke") top = Math.min(top, item.y - 0.55);
    }
    const { id, name, acc, done, alive, touch } = def;
    return { id, name, acc, done, alive, touch, targets, deco, size: { w: box.w, h: box.h }, view: { x: left, y: top, w: right - left, h: bottom - top } };
}

export const FIGURES: readonly Figure[] = FIGURE_DEFS.map(buildFigure);

export function getFigure(id: unknown): Figure | undefined {
    return typeof id === "string" ? FIGURES.find((figure) => figure.id === id) : undefined;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 * Koliko pomoći daje sam oblik: obrisi u boji delova → linije → samo neke linije (velikih
 * trouglova) → blede linije → samo senka.
 */
export type Support = "tint" | "lines" | "some" | "faint" | "outline";
export const SUPPORTS: readonly Support[] = ["tint", "lines", "some", "faint", "outline"];

export interface TangramLevel {
    /** Iz kojih oblika se biraju zadaci (prvi ide prvi kad je `first`) */
    pool: readonly string[];
    first?: boolean;
    rounds: number;
    support: Support;
    /** Koliko delova stiže okrenuto (`all` = svi) */
    rotated: number | "all";
    /** Najviše okreta (po 45°) do pravog položaja */
    maxTurns: number;
    /** Prvi oblik nivoa pokazuje dugme „Okreni” (ruka na dugmetu) */
    introRotate?: boolean;
    /** Glas kaže šta je koji deo („Ovaj trougao je krov.”) */
    parts: boolean;
    earlyHint: boolean;
}

const lv = (pool: readonly string[], rounds: number, support: Support, extra: Partial<TangramLevel> = {}): TangramLevel => ({
    pool,
    rounds,
    support,
    rotated: 0,
    maxTurns: 0,
    parts: false,
    earlyHint: false,
    ...extra,
});

export const TANGRAM_LEVELS: readonly TangramLevel[] = [
    // Lako: dva do četiri dela, obrisi u boji, bez okretanja; prvi deo prevuče ruka
    lv(["square-a", "square-b", "square-c", "square-d"], 4, "tint", { first: true, parts: true, earlyHint: true }),
    lv(["house-2", "fish-2", "boat-2"], 3, "tint", { first: true, parts: true, earlyHint: true }),
    lv(["tree-3", "fox-3", "kitten-3"], 3, "tint", { parts: true, earlyHint: true }),
    lv(["boat-3", "house-3", "fish-3"], 3, "tint", { parts: true, earlyHint: true }),
    lv(["fish-4", "owl-4", "sail-4"], 3, "tint", { first: true, parts: true, earlyHint: true }),
    // Srednje: samo linije, pa samo neke; prvi okrenuti delovi (prvo jedan, uz pokazano dugme)
    lv(["dog-4", "house-4", "car-4"], 3, "lines", { rotated: 1, maxTurns: 1, introRotate: true }),
    lv(["rocket-5", "bird-5", "turtle-5"], 3, "lines", { first: true, rotated: 1, maxTurns: 2 }),
    lv(["car-5", "fish-5", "house-5"], 3, "lines", { rotated: 2, maxTurns: 2 }),
    lv(["cat-6", "rabbit-6", "fish-5"], 3, "some", { rotated: 2, maxTurns: 3 }),
    lv(["dino-6", "duck-6", "rocket-6"], 3, "some", { first: true, rotated: 3, maxTurns: 3 }),
    // Teško: svih sedam delova — linije, blede linije, pa samo senka i okrenuti delovi
    lv(["square-7", "square-7r", "triangle-7"], 2, "lines", { rotated: 2, maxTurns: 3 }),
    lv(["house-7", "cat-7", "rocket-7"], 2, "lines", { rotated: 3, maxTurns: 3 }),
    lv(["rabbit-7", "duck-7", "dino-7"], 2, "faint", { rotated: 3, maxTurns: 4 }),
    lv(["cat-7", "rabbit-7", "duck-7", "house-7"], 2, "outline", { rotated: 4, maxTurns: 4 }),
    lv(["rabbit-7", "duck-7", "cat-7", "dino-7"], 2, "outline", { rotated: "all", maxTurns: 4 }),
];

export const TANGRAM_MAX_LEVEL = TANGRAM_LEVELS.length;

export function tangramLevel(level: number): TangramLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), TANGRAM_MAX_LEVEL);
    return TANGRAM_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

export interface TangramRound {
    figure: string;
    /** Delovi redom u korpi */
    tray: PieceId[];
    /** Okret svakog dela na početku (0–7) */
    rot: Record<string, number>;
    support: Support;
    /** Ima okrenutih delova: vidi se dugme „Okreni” */
    rotate: boolean;
    /** Prvi oblik sa okretanjem: deo je već izabran, a ruka pokazuje dugme */
    intro: boolean;
    /** Glas kaže šta je koji deo */
    parts: boolean;
}

export interface TangramPlan {
    rounds: TangramRound[];
    earlyHint: boolean;
}

interface BuildOptions {
    maxRounds: number;
    /**
     * Broj izbora za uzrast. Tangram ga ne koristi: u korpi su uvek tačno delovi oblika (nijedan
     * suvišan), a broj delova raste sa nivoom.
     */
    maxChoices: number;
    random?: () => number;
}

/** Okret pod kojim deo ulazi u neko mesto istog oblika (ili -1) */
function fitsSomewhere(figure: Figure, piece: PieceId, rot: number): boolean {
    const kind = PIECES[piece].kind;
    return figure.targets.some((target) => target.kind === kind && fitsTurn(kind, rot, target.rot));
}

/**
 * Plan nivoa: oblici jedan za drugim (bez ponavljanja), delovi izmešani u korpi. Okrenut deo
 * je zaista okrenut: ni u jedno mesto svog oblika ne ulazi dok se ne okrene (najviše
 * `maxTurns` okreta od 45° u smeru kazaljke). `random` daje broj u [0, 1).
 */
export function buildTangramLevel(level: number, { maxRounds, random = Math.random }: BuildOptions): TangramPlan {
    const rule = tangramLevel(level);
    const shuffle = <T,>(list: readonly T[]): T[] => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const count = Math.max(2, Math.min(rule.rounds, rule.pool.length, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const order = rule.first ? [rule.pool[0], ...shuffle(rule.pool.slice(1))] : shuffle(rule.pool);

    const rounds = order.slice(0, count).map((id, index): TangramRound => {
        const figure = getFigure(id)!;
        const pieces = figure.targets.map((target) => target.piece);
        const rot: Record<string, number> = {};
        for (const target of figure.targets) rot[target.piece] = target.rot;
        const intro = Boolean(rule.introRotate) && index === 0;
        const wanted = rule.rotated === "all" ? pieces.length : Math.min(rule.rotated, pieces.length);
        // Uvod u okretanje: okreće se trougao (najjasnije se vidi da je „nakrivo”)
        const candidates = intro ? [...shuffle(pieces.filter((p) => PIECES[p].kind !== "sq" && PIECES[p].kind !== "pa")), ...shuffle(pieces.filter((p) => PIECES[p].kind === "sq" || PIECES[p].kind === "pa"))] : shuffle(pieces);
        let turned = 0;
        for (const piece of candidates) {
            if (turned >= wanted) break;
            const options = Array.from({ length: Math.max(1, rule.maxTurns) }, (_, i) => i + 1).filter((turns) => !fitsSomewhere(figure, piece, rot[piece] - turns));
            if (options.length === 0) continue;
            const turns = options[Math.floor(random() * options.length)];
            rot[piece] = (((rot[piece] - turns) % 8) + 8) % 8;
            turned += 1;
        }
        // Prvi oblik prvog nivoa: deo koji pokazuje ruka je prvi u korpi
        const tray = level === 1 && index === 0 ? [pieces[0], ...shuffle(pieces.slice(1))] : shuffle(pieces);
        return { figure: id, tray, rot, support: rule.support, rotate: turned > 0, intro: intro && turned > 0, parts: rule.parts };
    });
    return { rounds, earlyHint: rule.earlyHint };
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

const COUNT_WORDS = ["", "jednog dela", "dva dela", "tri dela", "četiri dela", "pet delova", "šest delova", "sedam delova"];

/** Uputstvo na početku oblika (o čemu je zadatak, nikad gde dodirnuti) */
export function figureIntro(round: { figure: string; support: Support; rotate: boolean; intro: boolean }): string {
    const figure = getFigure(round.figure);
    if (!figure) return "";
    const lead = round.support === "outline" ? "Pogledaj senku. " : "";
    const turn = round.intro ? " Jedan deo treba okrenuti." : round.rotate ? " Neke delove treba okrenuti." : "";
    return `${lead}Složi ${figure.acc} od ${COUNT_WORDS[figure.targets.length]}.${turn}`;
}

export function figureTitle(id: string): string {
    const figure = getFigure(id);
    return figure ? `Složi ${figure.acc}.` : "";
}

const KIND_NOUN: Readonly<Record<PieceKind, string>> = { lg: "trougao", md: "trougao", sm: "trougao", sq: "kvadrat", pa: "paralelogram" };

/** Šta je deo u obliku („Ovaj trougao je krov.”) ili prazno */
export function partSentence(figureId: string, targetIndex: number): string {
    const target = getFigure(figureId)?.targets[targetIndex];
    return target?.part ? `Ovaj ${KIND_NOUN[target.kind]} je ${target.part}.` : "";
}

export function doneSentence(figureId: string): string {
    return getFigure(figureId)?.done ?? "";
}

export const TURN_IT = "Skoro! Okreni ga.";
export const OTHER_SHAPE = "Ovaj deo ima drugi oblik.";
export const OTHER_WAY = "Ovaj deo stoji drugačije.";

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export type MistakeReason = "turn" | "shape" | "way";

export interface TangramView extends BaseView {
    figure: string;
    tray: string[];
    /** Okret svakog dela (0–7) */
    rot: Record<string, number>;
    /** Delovi koji su već na svom mestu (redom) — zajednička tabla broji poteze po njima */
    placed: string[];
    /** Na kom mestu (indeks) je koji postavljen deo */
    at: Record<string, number>;
    support: Support;
    rotate: boolean;
    intro: boolean;
    parts: boolean;
    selected: string | null;
    /** Pomoć se sada vidi (mesto i deo svetle); posle postavljenog dela se gasi */
    hint: boolean;
    /** U ovom obliku je bilo pomoći (bodovanje: „uz pomoć”) */
    helped: boolean;
    /** Uvod u okretanje: deo koji treba okrenuti (dok ne legne) */
    introPiece: string | null;
    last: string | null;
    wrong: string[];
    mistake: { piece: string; reason: MistakeReason } | null;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyTangramView(totalRounds: number): TangramView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        figure: "",
        tray: [],
        rot: {},
        placed: [],
        at: {},
        support: "tint",
        rotate: false,
        intro: false,
        parts: false,
        selected: null,
        hint: false,
        helped: false,
        introPiece: null,
        last: null,
        wrong: [],
        mistake: null,
        feedback: null,
    };
}

export function tangramRoundView(round: TangramRound): Partial<TangramView> {
    // Uvod u okretanje: okrenut deo je već izabran, da dugme „Okreni” odmah deluje
    const turned = round.intro ? (round.tray.find((piece) => !fitsSomewhere(getFigure(round.figure)!, piece, round.rot[piece])) ?? null) : null;
    return {
        figure: round.figure,
        tray: [...round.tray],
        rot: { ...round.rot },
        placed: [],
        at: {},
        support: round.support,
        rotate: round.rotate,
        intro: round.intro,
        parts: round.parts,
        selected: turned,
        hint: false,
        helped: false,
        introPiece: turned,
        last: null,
        wrong: [],
        mistake: null,
        feedback: null,
    };
}

/** Otvorena mesta (bez postavljenog dela) */
export function openTargets(view: Pick<TangramView, "figure" | "at">): Target[] {
    const figure = getFigure(view.figure);
    if (!figure) return [];
    const taken = new Set(Object.values(view.at));
    return figure.targets.filter((target) => !taken.has(target.index));
}

/** Šta bi se desilo kad bi deo pao na mesto: legne, treba ga okrenuti, ili je drugi oblik */
export function tryPlace(view: Pick<TangramView, "figure" | "at" | "rot">, piece: string, targetIndex: number): "ok" | "turn" | "shape" | "taken" {
    const target = getFigure(view.figure)?.targets[targetIndex];
    if (!target || !isPieceId(piece)) return "shape";
    if (Object.values(view.at).includes(targetIndex)) return "taken";
    const kind = PIECES[piece].kind;
    if (kind !== target.kind) return "shape";
    return fitsTurn(kind, view.rot[piece] ?? 0, target.rot) ? "ok" : "turn";
}

/** Otvoreno mesto u koje deo (u ovom okretu) ulazi, ili null */
export function fittingTargets(view: Pick<TangramView, "figure" | "at" | "rot">, piece: string): Target[] {
    if (!isPieceId(piece)) return [];
    const kind = PIECES[piece].kind;
    return openTargets(view).filter((target) => target.kind === kind && fitsTurn(kind, view.rot[piece] ?? 0, target.rot));
}

export interface HintInfo {
    piece: string;
    target: number;
    /** Deo treba okrenuti pre nego što legne */
    turn: boolean;
}

/**
 * Pomoć: izabran deo (ili prvi deo iz korpe koji nije postavljen) i mesto za njega — mesto
 * u koje ulazi baš ovako okrenut, inače prvo mesto istog oblika (tada treba okrenuti).
 */
export function hintFor(view: Pick<TangramView, "figure" | "at" | "rot" | "tray" | "placed" | "selected">): HintInfo | null {
    const piece = view.selected && !view.placed.includes(view.selected) ? view.selected : view.tray.find((id) => !view.placed.includes(id));
    if (!piece || !isPieceId(piece)) return null;
    const fit = fittingTargets(view, piece)[0];
    if (fit) return { piece, target: fit.index, turn: false };
    const same = openTargets(view).find((target) => target.kind === PIECES[piece].kind);
    return same ? { piece, target: same.index, turn: true } : null;
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Oblik je složen. Prvi oblik prvog nivoa pokazuje ruka (pokazni, ne ocenjuje se);
 * „correct” = nijedan deo nije pao na pogrešno mesto i nije bilo pomoći; „prompted” = uz
 * pomoć (osim pokaznog).
 */
export function solveTangramView(current: TangramView, level: number, solved: Partial<TangramView> = {}): { next: TangramView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.helped || current.hint;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: TangramView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function tangramResult(final: TangramView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeTangramMonitor(state: Partial<TangramView> | null | undefined): TangramView {
    const base = emptyTangramView(1);
    if (!state) return base;
    const figure = getFigure(state.figure);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const own = new Set<string>(figure?.targets.map((target) => target.piece) ?? []);
    const pieces = (value: unknown, allowed: (id: string) => boolean) =>
        Array.isArray(value) ? Array.from(new Set(value.filter((id): id is string => typeof id === "string" && allowed(id)))) : [];
    const tray = figure ? pieces(state.tray, (id) => own.has(id)) : [];
    const rot: Record<string, number> = {};
    const rawRot = state.rot && typeof state.rot === "object" ? (state.rot as Record<string, unknown>) : {};
    for (const id of tray) {
        const value = rawRot[id];
        rot[id] = Number.isInteger(value) && (value as number) >= 0 && (value as number) < 8 ? (value as number) : 0;
    }
    // Postavljeni delovi: samo oni čije mesto postoji, istog je oblika i nije zauzeto
    const at: Record<string, number> = {};
    const placed: string[] = [];
    const rawAt = state.at && typeof state.at === "object" ? (state.at as Record<string, unknown>) : {};
    for (const id of pieces(state.placed, (id) => tray.includes(id))) {
        const index = rawAt[id];
        const target = Number.isInteger(index) ? figure?.targets[index as number] : undefined;
        if (!target || target.kind !== PIECES[id as PieceId].kind || Object.values(at).includes(target.index)) continue;
        at[id] = target.index;
        placed.push(id);
    }
    const loose = (value: unknown) => (typeof value === "string" && tray.includes(value) && !placed.includes(value) ? value : null);
    const support = SUPPORTS.includes(state.support as Support) ? (state.support as Support) : "tint";
    const mistake = state.mistake && typeof state.mistake === "object" && tray.includes(state.mistake.piece) ? state.mistake : null;
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        figure: figure?.id ?? "",
        tray,
        rot,
        placed,
        at,
        support,
        rotate: state.rotate === true,
        intro: state.intro === true,
        parts: state.parts === true,
        selected: loose(state.selected),
        hint: state.hint === true,
        helped: state.helped === true,
        introPiece: loose(state.introPiece),
        last: typeof state.last === "string" && placed.includes(state.last) ? state.last : null,
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((item): item is string => typeof item === "string" && item.length <= 40).slice(0, 24) : [],
        mistake: mistake ? { piece: mistake.piece, reason: mistake.reason === "turn" ? "turn" : mistake.reason === "way" ? "way" : "shape" } : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
