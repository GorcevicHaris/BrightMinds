// Potezi slova za igru „Slova”: velika i mala slova srpske latinice i ćirilice (po 30).
// Oblik je štampano slovo kakvo se uči u prvom razredu; redosled poteza ide odozgo nadole
// i sleva nadesno (prvo uspravna linija, pa ono što se na nju naslanja), a kvačica, crtica
// i tačka dolaze na kraju. Koordinate su objašnjene u tracing.ts (veliko slovo 0–100,
// malo 40–100, rep do 135).

import { arc, dot, joinGlyphs, line, quad, scaleGlyph, stroke, withStrokes, type Glyph, type Pt } from "./tracing";

const g = (...strokes: Pt[][]): Glyph => ({ strokes });

/** Kvačica (Č, Š, Ž) sa sredinom na `x`, iznad visine `top` */
const caron = (x: number, top: number) => stroke(line(x - 12, top - 22, x, top - 8), line(x, top - 8, x + 12, top - 22));
/** Akcenat (Ć) */
const acute = (x: number, top: number) => line(x + 8, top - 24, x - 6, top - 8);

// ── Velika latinica ───────────────────────────────────────────────────────────

const A = g(line(40, 0, 8, 100), line(40, 0, 72, 100), line(21, 62, 59, 62));
const B = g(line(12, 0, 12, 100), stroke(line(12, 0, 38, 0), arc(38, 24, 24, 24, -90, 90), line(38, 48, 12, 48)), stroke(line(12, 48, 42, 48), arc(42, 74, 26, 26, -90, 90), line(42, 100, 12, 100)));
const C = g(arc(44, 50, 34, 50, -40, -320));
const D = g(line(12, 0, 12, 100), stroke(line(12, 0, 30, 0), arc(30, 50, 38, 50, -90, 90), line(30, 100, 12, 100)));
const E = g(line(14, 0, 14, 100), line(14, 0, 64, 0), line(14, 50, 56, 50), line(14, 100, 64, 100));
const F = g(line(14, 0, 14, 100), line(14, 0, 64, 0), line(14, 50, 56, 50));
const G = g(stroke(arc(44, 50, 34, 50, -40, -360), line(78, 50, 50, 50)));
const H = g(line(12, 0, 12, 100), line(66, 0, 66, 100), line(12, 50, 66, 50));
const I = g(line(30, 0, 30, 100));
const J = g(stroke(line(56, 0, 56, 72), arc(34, 72, 22, 28, 0, 170)));
const K = g(line(12, 0, 12, 100), stroke(line(62, 0, 14, 54), line(14, 54, 66, 100)));
const L = g(stroke(line(14, 0, 14, 100), line(14, 100, 62, 100)));
const M = g(line(10, 0, 10, 100), stroke(line(10, 0, 40, 64), line(40, 64, 70, 0), line(70, 0, 70, 100)));
const N = g(line(12, 0, 12, 100), stroke(line(12, 0, 66, 100), line(66, 100, 66, 0)));
const O = g(arc(40, 50, 32, 50, -90, -450));
const P = g(line(12, 0, 12, 100), stroke(line(12, 0, 38, 0), arc(38, 26, 26, 26, -90, 90), line(38, 52, 12, 52)));
const R = withStrokes(P, line(34, 52, 66, 100));
const S = g(stroke(arc(40, 26, 27, 26, -20, -270), arc(40, 76, 29, 24, -90, 160)));
const T = g(line(8, 0, 70, 0), line(39, 0, 39, 100));
const U = g(stroke(line(12, 0, 12, 64), arc(40, 64, 28, 36, 180, 0), line(68, 64, 68, 0)));
const V = g(stroke(line(8, 0, 40, 100), line(40, 100, 72, 0)));
const Z = g(stroke(line(10, 0, 66, 0), line(66, 0, 10, 100), line(10, 100, 68, 100)));

const LATIN_UPPER: Record<string, Glyph> = {
    A,
    B,
    C,
    Č: withStrokes(C, caron(44, 0)),
    Ć: withStrokes(C, acute(44, 0)),
    D,
    DŽ: joinGlyphs(D, withStrokes(Z, caron(38, 0))),
    Đ: withStrokes(D, line(0, 50, 30, 50)),
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    L,
    LJ: joinGlyphs(L, J, 8),
    M,
    N,
    NJ: joinGlyphs(N, J),
    O,
    P,
    R,
    S,
    Š: withStrokes(S, caron(40, 0)),
    T,
    U,
    V,
    Z,
    Ž: withStrokes(Z, caron(38, 0)),
};

// ── Mala latinica ─────────────────────────────────────────────────────────────

const a = g(arc(38, 70, 25, 30, -20, -380), line(64, 40, 64, 100));
const b = g(line(14, 0, 14, 100), arc(38, 70, 24, 30, 180, 540));
const c = g(arc(40, 70, 26, 30, -40, -320));
const d = g(arc(36, 70, 25, 30, -20, -380), line(62, 0, 62, 100));
const e = g(stroke(line(14, 70, 66, 70), arc(40, 70, 26, 30, 0, -320)));
const f = g(stroke(arc(52, 20, 16, 20, -20, -180), line(36, 20, 36, 100)), line(18, 42, 56, 42));
const gg = g(arc(36, 70, 24, 30, -20, -380), stroke(line(60, 40, 60, 112), arc(36, 112, 24, 22, 0, 165)));
const h = g(line(14, 0, 14, 100), stroke(arc(38, 64, 24, 22, 180, 360), line(62, 64, 62, 100)));
const i = g(line(30, 42, 30, 100), dot(30, 20));
const j = g(stroke(line(40, 42, 40, 114), arc(24, 114, 16, 20, 0, 165)), dot(40, 20));
const k = g(line(14, 0, 14, 100), stroke(line(56, 40, 16, 72), line(16, 72, 58, 100)));
const l = g(line(26, 0, 26, 100));
const m = g(line(12, 40, 12, 100), stroke(arc(29, 60, 17, 20, 180, 360), line(46, 60, 46, 100)), stroke(arc(63, 60, 17, 20, 180, 360), line(80, 60, 80, 100)));
const n = g(line(14, 40, 14, 100), stroke(arc(38, 62, 24, 22, 180, 360), line(62, 62, 62, 100)));
const o = g(arc(40, 70, 26, 30, -90, -450));
const p = g(line(14, 40, 14, 135), arc(38, 70, 24, 30, 180, 540));
const r = g(line(14, 40, 14, 100), arc(38, 64, 24, 22, 180, 300));
const s = g(stroke(arc(40, 55, 21, 15, -20, -270), arc(40, 85, 24, 15, -90, 160)));
const t = g(stroke(line(30, 12, 30, 88), arc(44, 88, 14, 12, 180, 90)), line(14, 42, 52, 42));
const u = g(stroke(line(14, 40, 14, 72), arc(38, 72, 24, 28, 180, 0), line(62, 72, 62, 40)), line(62, 40, 62, 100));
const v = g(stroke(line(10, 40, 38, 100), line(38, 100, 66, 40)));
const z = g(stroke(line(12, 40, 62, 40), line(62, 40, 12, 100), line(12, 100, 64, 100)));

const LATIN_LOWER: Record<string, Glyph> = {
    a,
    b,
    c,
    č: withStrokes(c, caron(42, 42)),
    ć: withStrokes(c, acute(42, 42)),
    d,
    dž: joinGlyphs(d, withStrokes(z, caron(37, 42))),
    đ: withStrokes(d, line(46, 14, 76, 14)),
    e,
    f,
    g: gg,
    h,
    i,
    j,
    k,
    l,
    lj: joinGlyphs(l, j, 4),
    m,
    n,
    nj: joinGlyphs(n, j, 4),
    o,
    p,
    r,
    s,
    š: withStrokes(s, caron(40, 42)),
    t,
    u,
    v,
    z,
    ž: withStrokes(z, caron(37, 42)),
};

// ── Velika ćirilica ───────────────────────────────────────────────────────────
// А, В, Е, Ј, К, М, Н, О, Р, С, Т pišu se isto kao latinična A, B, E, J, K, M, H, O, P, C, T.

const CB = g(line(14, 0, 14, 100), line(14, 0, 62, 0), stroke(line(14, 46, 40, 46), arc(40, 73, 27, 27, -90, 90), line(40, 100, 14, 100)));
const CG = g(line(14, 0, 14, 100), line(14, 0, 62, 0));
const CD = g(line(26, 0, 12, 84), stroke(line(26, 0, 62, 0), line(62, 0, 62, 84)), stroke(line(2, 100, 2, 84), line(2, 84, 72, 84), line(72, 84, 72, 100)));
const CDJ = g(line(22, 0, 22, 100), line(0, 0, 50, 0), stroke(line(22, 42, 44, 42), arc(44, 66, 22, 24, -90, 90), line(44, 90, 36, 90)));
const CZH = g(line(40, 0, 40, 100), stroke(line(4, 0, 40, 50), line(40, 50, 4, 100)), stroke(line(76, 0, 40, 50), line(40, 50, 76, 100)));
const CZ = g(stroke(arc(36, 26, 26, 24, -160, 90), arc(36, 75, 28, 25, -90, 160)));
const CI = g(line(12, 0, 12, 100), stroke(line(12, 100, 66, 0), line(66, 0, 66, 100)));
const CL = g(line(26, 0, 6, 100), stroke(line(26, 0, 64, 0), line(64, 0, 64, 100)));
const CLJ = g(line(22, 0, 4, 100), stroke(line(22, 0, 54, 0), line(54, 0, 54, 100)), stroke(line(54, 46, 72, 46), arc(72, 73, 26, 27, -90, 90), line(72, 100, 54, 100)));
const CNJ = g(line(10, 0, 10, 100), line(52, 0, 52, 100), stroke(line(10, 46, 72, 46), arc(72, 73, 26, 27, -90, 90), line(72, 100, 52, 100)));
const CP = g(line(12, 0, 12, 100), stroke(line(12, 0, 66, 0), line(66, 0, 66, 100)));
const CTJ = g(line(22, 0, 22, 100), line(0, 0, 50, 0), stroke(line(22, 44, 44, 44), arc(44, 66, 22, 22, -90, 0), line(66, 66, 66, 100)));
const CU = g(line(8, 0, 47, 60), line(72, 0, 30, 100));
const CF = g(arc(40, 45, 34, 26, -90, -450), line(40, 0, 40, 100));
const CH = g(line(10, 0, 66, 100), line(66, 0, 10, 100));
const CC = g(line(12, 0, 12, 86), line(60, 0, 60, 86), stroke(line(12, 86, 72, 86), line(72, 86, 72, 100)));
const CCH = g(stroke(line(12, 0, 12, 34), arc(36, 34, 24, 20, 180, 90), line(36, 54, 62, 54)), line(62, 0, 62, 100));
const CDZ = g(stroke(line(12, 0, 12, 84), line(12, 84, 62, 84), line(62, 84, 62, 0)), line(37, 84, 37, 104));
const CSH = g(stroke(line(10, 0, 10, 100), line(10, 100, 80, 100), line(80, 100, 80, 0)), line(45, 0, 45, 100));

const CYRILLIC_UPPER: Record<string, Glyph> = {
    А: A,
    Б: CB,
    В: B,
    Г: CG,
    Д: CD,
    Ђ: CDJ,
    Е: E,
    Ж: CZH,
    З: CZ,
    И: CI,
    Ј: J,
    К: K,
    Л: CL,
    Љ: CLJ,
    М: M,
    Н: H,
    Њ: CNJ,
    О: O,
    П: CP,
    Р: P,
    С: C,
    Т: T,
    Ћ: CTJ,
    У: CU,
    Ф: CF,
    Х: CH,
    Ц: CC,
    Ч: CCH,
    Џ: CDZ,
    Ш: CSH,
};

// ── Mala ćirilica ─────────────────────────────────────────────────────────────
// Većina malih ćiriličnih slova je umanjeno veliko slovo (visina 40–100).

const small = (glyph: Glyph) => scaleGlyph(glyph, 0.78, 0.6, 40);

const cb = g(stroke(quad(58, 2, 16, 6, 14, 64), arc(38, 72, 24, 28, 180, -170)));
const cdj = g(line(20, 0, 20, 100), line(6, 16, 40, 16), stroke(arc(42, 62, 22, 20, 180, 360), line(64, 62, 64, 114), arc(52, 114, 12, 16, 0, 150)));
const ctj = g(line(20, 0, 20, 100), line(6, 16, 40, 16), stroke(arc(42, 62, 22, 20, 180, 360), line(64, 62, 64, 100)));
const cu = g(line(10, 40, 38, 98), line(66, 40, 26, 135));
const cf = g(arc(40, 70, 32, 26, -90, -450), line(40, 0, 40, 135));
const ch = g(line(12, 40, 62, 100), line(62, 40, 12, 100));

const CYRILLIC_LOWER: Record<string, Glyph> = {
    а: a,
    б: cb,
    в: small(B),
    г: small(CG),
    д: small(CD),
    ђ: cdj,
    е: e,
    ж: small(CZH),
    з: small(CZ),
    и: small(CI),
    ј: j,
    к: small(K),
    л: small(CL),
    љ: small(CLJ),
    м: small(M),
    н: small(H),
    њ: small(CNJ),
    о: o,
    п: small(CP),
    р: p,
    с: c,
    т: small(T),
    ћ: ctj,
    у: cu,
    ф: cf,
    х: ch,
    ц: small(CC),
    ч: small(CCH),
    џ: small(CDZ),
    ш: small(CSH),
};

/** Svi znakovi: ključ je slovo kako se piše (latinica i ćirilica imaju različite znakove) */
export const LETTER_GLYPHS: Readonly<Record<string, Glyph>> = { ...LATIN_UPPER, ...LATIN_LOWER, ...CYRILLIC_UPPER, ...CYRILLIC_LOWER };

export function letterGlyph(letter: string): Glyph | undefined {
    return Object.prototype.hasOwnProperty.call(LETTER_GLYPHS, letter) ? LETTER_GLYPHS[letter] : undefined;
}
