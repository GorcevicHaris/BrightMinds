// Zajednički „motor” za precrtavanje slova i brojeva (igre „Slova” i „Brojevi”).
//
// Svaki znak je niz poteza (redosled je redosled pisanja), a svaki potez je izlomljena linija
// tačaka u koordinatama znaka: visina velikog slova i cifre je 0–100 (0 = gore, 100 = linija
// na kojoj slovo stoji), malo slovo je visoko 40–100, a repovi (g, j, p, у, ф) idu do 135.
// Ugao luka se meri kao na ekranu: 0° = desno, 90° = dole, −90° = gore; luk od većeg ka
// manjem uglu ide suprotno kazaljci na satu (kao kad se piše O).
//
// Praćenje prsta je tolerantno: oko poteza je „hodnik” širine `tol`; napredak ide samo
// napred, korak po korak, pa dete ne može da „preskoči” potez, a vraćanje unazad ili kratko
// podrhtavanje ruke se ne kažnjava. Sve funkcije su čiste (testovi ih proveravaju bez ekrana).

export type Pt = readonly [number, number];
export type Stroke = readonly Pt[];

export interface Glyph {
    /** Potezi redom kojim se pišu */
    strokes: readonly Stroke[];
}

// ── Crtanje poteza ────────────────────────────────────────────────────────────

/** Duž od (x1, y1) do (x2, y2) */
export function line(x1: number, y1: number, x2: number, y2: number): Pt[] {
    return [
        [x1, y1],
        [x2, y2],
    ];
}

/** Luk elipse sa centrom (cx, cy), od ugla `from` do ugla `to` (u stepenima, kao na ekranu) */
export function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number): Pt[] {
    const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 6));
    return Array.from({ length: steps + 1 }, (_, i) => {
        const angle = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
        return [round2(cx + rx * Math.cos(angle)), round2(cy + ry * Math.sin(angle))] as const;
    });
}

/** Kvadratna kriva od (x0, y0) do (x1, y1) sa kontrolnom tačkom (cx, cy) */
export function quad(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): Pt[] {
    const steps = 14;
    return Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps;
        const u = 1 - t;
        return [round2(u * u * x0 + 2 * u * t * cx + t * t * x1), round2(u * u * y0 + 2 * u * t * cy + t * t * y1)] as const;
    });
}

/** Tačka (za tačku na i i j): kratak potez koji se završava jednim dodirom */
export function dot(x: number, y: number): Pt[] {
    return [
        [x, y - 1],
        [x, y + 1],
    ];
}

/** Spaja delove u jedan potez (kraj jednog dela je početak sledećeg) */
export function stroke(...parts: Pt[][]): Pt[] {
    const out: Pt[] = [];
    for (const part of parts) {
        for (const point of part) {
            const last = out[out.length - 1];
            if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 0.5) continue;
            out.push(point);
        }
    }
    return out;
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Pomera ceo znak */
export function shiftGlyph(glyph: Glyph, dx: number, dy = 0): Glyph {
    return { strokes: glyph.strokes.map((s) => s.map(([x, y]) => [round2(x + dx), round2(y + dy)] as const)) };
}

/** Menja veličinu znaka (x' = x·sx, y' = oy + y·sy) — npr. malo ćirilično slovo od velikog */
export function scaleGlyph(glyph: Glyph, sx: number, sy: number, oy = 0): Glyph {
    return { strokes: glyph.strokes.map((s) => s.map(([x, y]) => [round2(x * sx), round2(oy + y * sy)] as const)) };
}

/** Dva znaka jedan do drugog (DŽ, LJ, NJ, 10, 15…); potezi drugog idu posle poteza prvog */
export function joinGlyphs(first: Glyph, second: Glyph, gap = 12): Glyph {
    const a = glyphBox(first);
    const b = glyphBox(second);
    const moved = shiftGlyph(second, a.maxX + gap - b.minX);
    return { strokes: [...first.strokes, ...moved.strokes] };
}

/** Dodaje poteze (kvačicu, crticu) posle poteza znaka */
export function withStrokes(glyph: Glyph, ...extra: Pt[][]): Glyph {
    return { strokes: [...glyph.strokes, ...extra] };
}

export interface Box {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export function glyphBox(glyph: Glyph): Box {
    const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const s of glyph.strokes) {
        for (const [x, y] of s) {
            box.minX = Math.min(box.minX, x);
            box.minY = Math.min(box.minY, y);
            box.maxX = Math.max(box.maxX, x);
            box.maxY = Math.max(box.maxY, y);
        }
    }
    return box;
}

/** Okvir za crtanje (viewBox): uvek obuhvata visinu 0–100, pa velika i mala slova stoje na istoj liniji */
export function glyphFrame(glyph: Glyph, pad = 16): { x: number; y: number; w: number; h: number } {
    const box = glyphBox(glyph);
    const top = Math.min(0, box.minY) - pad;
    const bottom = Math.max(100, box.maxY) + pad;
    // Usko slovo (I, l, 1) dobija širi okvir, da ne bude samo uska traka na ekranu
    const width = Math.max(box.maxX - box.minX + 2 * pad, 70);
    const center = (box.minX + box.maxX) / 2;
    return { x: round2(center - width / 2), y: top, w: round2(width), h: bottom - top };
}

// ── Uzorkovanje i praćenje prsta ──────────────────────────────────────────────

export interface SampledStroke {
    /** Tačke na podjednakom razmaku (oko 2 jedinice) */
    pts: Pt[];
    /** Pređeni put do svake tačke */
    at: number[];
    length: number;
}

/** Korak uzorkovanja u jedinicama znaka */
export const SAMPLE_STEP = 2;
/** Potez kraći od ovoga je tačka: završava se jednim dodirom */
export const DOT_LENGTH = 6;

export function sampleStroke(points: Stroke, step = SAMPLE_STEP): SampledStroke {
    const pts: Pt[] = [];
    const at: number[] = [];
    if (points.length === 0) return { pts: [[0, 0]], at: [0], length: 0 };
    let total = 0;
    pts.push(points[0]);
    at.push(0);
    for (let i = 1; i < points.length; i += 1) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        const length = Math.hypot(x1 - x0, y1 - y0);
        if (length === 0) continue;
        const parts = Math.max(1, Math.ceil(length / step));
        for (let k = 1; k <= parts; k += 1) {
            const t = k / parts;
            pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
            at.push(total + length * t);
        }
        total += length;
    }
    return { pts, at, length: total };
}

/** Indeks poslednje tačke do pređenog puta `distance` */
export function indexAt(s: SampledStroke, distance: number): number {
    let lo = 0;
    let hi = s.at.length - 1;
    if (distance <= 0) return 0;
    if (distance >= s.length) return hi;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (s.at[mid] <= distance) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

/** Tačka na potezu posle pređenog puta `distance` */
export function pointAt(s: SampledStroke, distance: number): Pt {
    const i = indexAt(s, distance);
    if (i >= s.pts.length - 1) return s.pts[s.pts.length - 1];
    const span = s.at[i + 1] - s.at[i];
    const t = span > 0 ? (distance - s.at[i]) / span : 0;
    const [x0, y0] = s.pts[i];
    const [x1, y1] = s.pts[i + 1];
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
}

/** Smer poteza (jedinični vektor) oko pređenog puta `distance` — za strelicu */
export function directionAt(s: SampledStroke, distance: number): Pt {
    const a = pointAt(s, Math.max(0, distance - 3));
    const b = pointAt(s, Math.min(s.length, distance + 3));
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return length > 0 ? [(b[0] - a[0]) / length, (b[1] - a[1]) / length] : [0, 1];
}

/** Tačke poteza od početka do pređenog puta `distance` (obojeni deo) */
export function pointsUpTo(s: SampledStroke, distance: number): Pt[] {
    const i = indexAt(s, distance);
    return [...s.pts.slice(0, i + 1), pointAt(s, distance)];
}

/** Tačke poteza između dva pređena puta (strelica za smer) */
export function pointsBetween(s: SampledStroke, from: number, to: number): Pt[] {
    const start = Math.max(0, Math.min(from, to));
    const inner = s.pts.filter((_, i) => s.at[i] > start && s.at[i] < to);
    return [pointAt(s, start), ...inner, pointAt(s, to)];
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export interface FollowResult {
    /** Novi pređeni put (nikad manji od starog) */
    progress: number;
    /** Prst je u hodniku oko poteza (ispred ili malo iza dosadašnjeg napretka) */
    onPath: boolean;
}

/**
 * Jedan položaj prsta. Napredak ide do najbliže tačke poteza ispred dosadašnjeg napretka —
 * do PRVE takve (prvi lokalni minimum udaljenosti), a najviše `ahead` napred. Zato se prst
 * ne „zalepi” za kasniji deo poteza koji prolazi blizu (sredina slova B, kraj slova O), a
 * skok prsta preko pola slova ne završava potez.
 */
export function followFinger(s: SampledStroke, progress: number, finger: Pt, tol: number, ahead = tol * 2.5): FollowResult {
    const start = indexAt(s, progress);
    let best = -1;
    let bestDistance = Infinity;
    for (let i = start; i < s.pts.length && s.at[i] <= progress + ahead; i += 1) {
        const d = dist(s.pts[i], finger);
        if (best < 0) {
            if (d <= tol) {
                best = i;
                bestDistance = d;
            }
        } else if (d < bestDistance) {
            best = i;
            bestDistance = d;
        } else if (d > bestDistance + 3) {
            break;
        }
    }
    if (best >= 0) return { progress: Math.max(progress, s.at[best]), onPath: true };
    // Malo iza napretka (dete se vratilo unazad): i dalje je na potezu, samo bez napretka
    for (let i = indexAt(s, progress - tol * 1.5); i <= start; i += 1) {
        if (dist(s.pts[i], finger) <= tol) return { progress, onPath: true };
    }
    return { progress, onPath: false };
}

export interface SegmentResult {
    progress: number;
    /** Koliki deo pokreta (u jedinicama znaka) je bio van hodnika */
    offPath: number;
}

/**
 * Pokret prsta od `from` do `to`. Brz pokret ume da preskoči mnogo tačaka između dva
 * događaja, pa se put deli na male korake i svaki se prati posebno.
 */
export function followSegment(s: SampledStroke, progress: number, from: Pt, to: Pt, tol: number): SegmentResult {
    const length = dist(from, to);
    const steps = Math.max(1, Math.ceil(length / SAMPLE_STEP));
    let current = progress;
    let offPath = 0;
    for (let k = 1; k <= steps; k += 1) {
        const t = k / steps;
        const point: Pt = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
        const result = followFinger(s, current, point, tol);
        current = result.progress;
        if (!result.onPath) offPath += length / steps;
    }
    return { progress: current, offPath };
}

/** Potez je gotov kad je napredak stigao skoro do kraja (poslednji delić ne mora tačno) */
export function strokeDone(s: SampledStroke, progress: number, tol: number): boolean {
    if (s.length <= DOT_LENGTH) return progress >= s.length;
    return progress >= s.length - Math.min(tol * 0.5, s.length * 0.12);
}

/** Dodir je dovoljno blizu mesta gde potez treba nastaviti (tačka „prati me”) */
export function nearProgress(s: SampledStroke, progress: number, finger: Pt, tol: number): boolean {
    return dist(pointAt(s, progress), finger) <= tol * 1.4;
}

/** Ceo pokret prsta od početka do kraja: koliko je potez napredovao i koliko je bilo van hodnika */
export function tracePath(s: SampledStroke, path: readonly Pt[], tol: number, from = 0): SegmentResult {
    if (path.length === 0 || !nearProgress(s, from, path[0], tol)) return { progress: from, offPath: 0 };
    let progress = s.length <= DOT_LENGTH ? s.length : from;
    let offPath = 0;
    for (let i = 1; i < path.length; i += 1) {
        const result = followSegment(s, progress, path[i - 1], path[i], tol);
        progress = result.progress;
        offPath += result.offPath;
    }
    return { progress, offPath };
}

// ── Hodnik po težini ──────────────────────────────────────────────────────────

/**
 *  thick — debelo isprekidano slovo sa svetlim hodnikom, sve strelice sa brojevima, učitelj
 *          prvo pokaže sve poteze (model → precrtaj)
 *  thin  — tanka isprekidana linija, strelica samo za potez koji je na redu
 *  copy  — slovo je samo uzor sa strane; na tabli je samo početna tačka (prepiši)
 */
export type TraceGuide = "thick" | "thin" | "copy";
export const TRACE_GUIDES: readonly TraceGuide[] = ["thick", "thin", "copy"];

/** Širina hodnika (pola širine, u jedinicama znaka visine 100). Bez linije dete dobija malo više mesta. */
export const TOLERANCE: Record<TraceGuide, number> = { thick: 20, thin: 15, copy: 18 };

/** Koliko pokreta van hodnika (zaredom, u jedinicama) se računa kao jedno „izlaženje” — kraće je drhtaj ruke */
export const SLIP_LENGTH = 14;
