// app/dashboard/child/[id]/gameMapLayout.ts
// Geometrija „Mape” igara (čist modul, bez Reacta): gde stoji koja stanica, kuda vijuga put,
// gde reka seče put (most), gde rastu drveća. Sve zavisi samo od broja stanica i širine
// ekrana, pa se ista mapa uvek iscrta isto (bez nasumičnosti između dva crtanja).
//
// Telefon: jedna vijugava traka odozgo nadole (skrol). Tablet i računar: zmijasti put sa
// 3–5 stanica u redu, koji se na kraju reda okreće u sledeći red.

import { LEVELS_PER_TIER, MAX_LEVEL } from "@/lib/games";

export interface MapPoint {
    x: number;
    y: number;
}

/** Jedan deo puta: kubna Bezijeova kriva od `from` do `to` */
export interface MapCurve {
    from: MapPoint;
    c1: MapPoint;
    c2: MapPoint;
    to: MapPoint;
}

export interface MapTree {
    x: number;
    y: number;
    /** Poluprečnik krošnje */
    r: number;
    /** 0–2: nijansa zelene */
    tone: number;
}

export interface MapHill {
    x: number;
    y: number;
    rx: number;
    ry: number;
    tone: number;
}

export interface MapLayout {
    width: number;
    height: number;
    /** Stanica u redu (1 = telefon) */
    lanes: number;
    /** Prečnik kruga stanice */
    nodeSize: number;
    /** Središta stanica, redom */
    nodes: MapPoint[];
    /** Selo na početku puta */
    start: MapPoint;
    /** Zamak na kraju puta */
    end: MapPoint;
    /** Delovi puta: početak → stanice (i okreti) → zamak */
    curves: MapCurve[];
    /** Za svaku stanicu: koliko prvih delova puta (`curves`) vodi do nje; od tog indeksa kreće dalje */
    nodeCurve: number[];
    /** Reka preko cele širine; most stoji na `cross`, okrenut po putu (`angle`, stepeni) */
    river: { y: number; cross: MapPoint; angle: number } | null;
    trees: MapTree[];
    hills: MapHill[];
}

/** Koliko stanica staje u red za datu širinu (px) */
export function lanesFor(width: number): number {
    if (width < 600) return 1;
    if (width < 900) return 3;
    if (width < 1300) return 4;
    return 5;
}

/** Deterministički „slučajan” broj 0–1 iz celog broja (isti ulaz → isti izlaz) */
function noise(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

/** Catmull-Rom kroz tačke → kubne krive (glatko vijuganje kroz svaku tačku) */
export function smoothCurves(points: MapPoint[]): MapCurve[] {
    const curves: MapCurve[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
        const p0 = points[Math.max(i - 1, 0)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(i + 2, points.length - 1)];
        curves.push({
            from: p1,
            c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
            c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
            to: p2,
        });
    }
    return curves;
}

export function curvePoint(c: MapCurve, t: number): MapPoint {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const d = 3 * u * t * t;
    const e = t * t * t;
    return { x: a * c.from.x + b * c.c1.x + d * c.c2.x + e * c.to.x, y: a * c.from.y + b * c.c1.y + d * c.c2.y + e * c.to.y };
}

function curveTangent(c: MapCurve, t: number): MapPoint {
    const u = 1 - t;
    return {
        x: 3 * u * u * (c.c1.x - c.from.x) + 6 * u * t * (c.c2.x - c.c1.x) + 3 * t * t * (c.to.x - c.c2.x),
        y: 3 * u * u * (c.c1.y - c.from.y) + 6 * u * t * (c.c2.y - c.c1.y) + 3 * t * t * (c.to.y - c.c2.y),
    };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** SVG `d` za delove puta [from, to) */
export function curvesPath(curves: MapCurve[], from = 0, to = curves.length): string {
    const part = curves.slice(Math.max(from, 0), Math.max(to, 0));
    if (part.length === 0) return "";
    const head = `M${r1(part[0].from.x)} ${r1(part[0].from.y)}`;
    return head + part.map((c) => ` C${r1(c.c1.x)} ${r1(c.c1.y)} ${r1(c.c2.x)} ${r1(c.c2.y)} ${r1(c.to.x)} ${r1(c.to.y)}`).join("");
}

/**
 * Raspored mape za `count` stanica na širini `width` (px). Visina sledi iz broja redova.
 */
export function mapLayout(count: number, width: number): MapLayout {
    const w = Math.max(Math.round(width), 280);
    const lanes = lanesFor(w);
    const nodeSize = lanes === 1 ? (w < 400 ? 80 : 88) : 96;
    const slots = Math.max(count, 0) + 1; // + zamak na kraju
    const top = lanes === 1 ? 190 : 200;

    /** Tačke kroz koje put prolazi: stanice (i zamak) i okreti na krajevima redova */
    const route: { p: MapPoint; turn: boolean }[] = [];
    // Reka teče kroz poseban razmak između dva reda (ne ispod natpisa stanica)
    const RIVER_GAP = 96;
    /** Natpis ispod stanice: od središta stanice do donje ivice natpisa */
    const labelBottom = nodeSize / 2 + 70;
    let riverY: number | null = null;
    let riverTurn: MapPoint | null = null;
    /** Telefon: posle koje stanice teče reka */
    let riverAfter = -1;

    if (lanes === 1) {
        const rowH = 152;
        const amp = Math.min(w * 0.24, 130);
        riverAfter = count >= 4 ? Math.floor(count * 0.45) : -1;
        for (let i = 0; i < slots; i += 1) {
            const castle = i === slots - 1;
            const x = castle ? w / 2 : w / 2 + amp * Math.sin((i * Math.PI) / 2);
            const y = top + i * rowH + (riverAfter >= 0 && i > riverAfter ? RIVER_GAP : 0) + (castle ? 40 : 0);
            route.push({ p: { x, y }, turn: false });
        }
        if (riverAfter >= 0) {
            const above = route[riverAfter].p.y + labelBottom;
            const below = route[riverAfter + 1].p.y - nodeSize / 2;
            riverY = (above + below) / 2;
        }
    } else {
        const margin = 92;
        const rowH = 214;
        const step = (w - 2 * margin) / (lanes - 1);
        const rows = Math.ceil(slots / lanes);
        const riverRow = rows >= 2 ? Math.max(Math.floor(rows / 2) - 1, 0) : -1;
        const rowY = (row: number) => top + row * rowH + (riverRow >= 0 && row > riverRow ? RIVER_GAP : 0);
        if (riverRow >= 0) riverY = (rowY(riverRow) + 20 + labelBottom + rowY(riverRow + 1) - 16 - nodeSize / 2) / 2;
        for (let i = 0; i < slots; i += 1) {
            const row = Math.floor(i / lanes);
            const col = i % lanes;
            const j = row % 2 === 0 ? col : lanes - 1 - col;
            // Blago talasanje po visini (najviše ±16 px), da red ne izgleda kao lenjir
            const wobble = (j % 2 === 0 ? -12 : 11) + (noise(i + 3) - 0.5) * 8;
            const castle = i === slots - 1;
            route.push({ p: { x: margin + j * step, y: rowY(row) + wobble + (castle ? 24 : 0) }, turn: false });
            if (col === lanes - 1 && i < slots - 1) {
                // Okret na kraju reda: put zaobiđe ivicu i vrati se u sledeći red (kod reke — preko mosta)
                const side = row % 2 === 0 ? w - margin * 0.32 : margin * 0.32;
                const t = { x: side, y: row === riverRow && riverY !== null ? riverY : (rowY(row) + rowY(row + 1)) / 2 };
                route.push({ p: t, turn: true });
                if (row === riverRow) riverTurn = t;
            }
        }
    }
    const turn = riverTurn as MapPoint | null;

    const nodesAndCastle: MapPoint[] = [];
    /** Indeks tačke svake stanice u nizu `points` (na početku je selo) */
    const slotRoute: number[] = [];
    route.forEach((entry, index) => {
        if (entry.turn) return;
        nodesAndCastle.push(entry.p);
        slotRoute.push(index + 1);
    });
    const nodes = nodesAndCastle.slice(0, count);
    const end = nodesAndCastle[nodesAndCastle.length - 1] ?? { x: w / 2, y: top };
    const first = nodes[0] ?? end;
    // Selo: put kreće od srednje kuće
    const start: MapPoint = lanes === 1 ? { x: w / 2 - Math.min(w * 0.18, 90), y: first.y - 118 } : { x: first.x + 70, y: first.y - 128 };
    const points = [start, ...route.map((entry) => entry.p)];
    const curves = smoothCurves(points);
    const nodeCurve = slotRoute.slice(0, count);

    // Reka: telefon — u razmaku posle srednje stanice; šire — kroz okret na kraju srednjeg reda
    let river: MapLayout["river"] = null;
    const angleOf = (tan: MapPoint) => (Math.atan2(tan.y, tan.x) * 180) / Math.PI;
    if (turn) {
        const c = curves[points.indexOf(turn) - 1];
        river = { y: turn.y, cross: turn, angle: angleOf(c ? curveTangent(c, 1) : { x: 0, y: 1 }) };
    } else if (riverAfter >= 0 && riverY !== null) {
        const c = curves[nodeCurve[riverAfter]];
        if (c) {
            // Mesto gde put seče reku (put na tom delu ide stalno nadole): polovljenjem po t
            let lo = 0;
            let hi = 1;
            for (let step = 0; step < 24; step += 1) {
                const mid = (lo + hi) / 2;
                if (curvePoint(c, mid).y < riverY) lo = mid;
                else hi = mid;
            }
            const t = (lo + hi) / 2;
            river = { y: riverY, cross: curvePoint(c, t), angle: angleOf(curveTangent(c, t)) };
        }
    }

    const height = Math.round(end.y + (lanes === 1 ? 150 : 170));

    // Uzorci puta: drveće i brda ne rastu na putu, oko stanica ni u reci
    const samples: MapPoint[] = [];
    for (const c of curves) for (let t = 0; t <= 1; t += 1 / 14) samples.push(curvePoint(c, t));
    const clear = (x: number, y: number, room: number) => {
        if (river && Math.abs(y - river.y) < 44) return false;
        if (Math.hypot(x - start.x, y - start.y) < 120) return false;
        if (Math.hypot(x - end.x, y - end.y) < 130) return false;
        for (const n of nodes) if (Math.abs(x - n.x) < nodeSize * 0.9 + room && y > n.y - nodeSize * 0.75 - room && y < n.y + nodeSize * 1.2 + room) return false;
        for (const s of samples) if (Math.hypot(x - s.x, y - s.y) < 34 + room) return false;
        return true;
    };

    const trees: MapTree[] = [];
    const cell = lanes === 1 ? 64 : 78;
    let seed = 1;
    for (let y = 40; y < height - 20; y += cell) {
        for (let x = 24; x < w - 16; x += cell) {
            seed += 1;
            if (noise(seed) < 0.42) continue;
            const tx = x + (noise(seed * 7) - 0.5) * cell * 0.7;
            const ty = y + (noise(seed * 13) - 0.5) * cell * 0.7;
            const r = 13 + noise(seed * 17) * 8;
            if (tx < 12 || tx > w - 12) continue;
            if (!clear(tx, ty, r)) continue;
            trees.push({ x: r1(tx), y: r1(ty), r: r1(r), tone: Math.floor(noise(seed * 29) * 3) });
        }
    }

    const hills: MapHill[] = [];
    const hillStep = lanes === 1 ? 300 : 340;
    for (let i = 0, y = 120; y < height; i += 1, y += hillStep) {
        const left = i % 2 === 0;
        hills.push({ x: left ? -30 : w + 30, y, rx: lanes === 1 ? 120 : 190, ry: lanes === 1 ? 90 : 120, tone: i % 3 });
    }

    return { width: w, height, lanes, nodeSize, nodes, start, end, curves, nodeCurve, river, trees, hills };
}

// ── Napredak na mapi ───────────────────────────────────────────────────────────

export interface MapStopState {
    /** Završeni nivoi (0–15) */
    done: number;
    locked: boolean;
}

/**
 * Stanica na kojoj stoji drugar: prva otključana igra kojoj nije završena laka težina;
 * kad su sve lake završene — prva sa nezavršenom srednjom, pa teškom. Kad je sve
 * pređeno, poslednja otključana. −1 kad nijedna nije otključana.
 */
export function currentStop(stops: MapStopState[]): number {
    for (const limit of [LEVELS_PER_TIER, LEVELS_PER_TIER * 2, MAX_LEVEL]) {
        const index = stops.findIndex((s) => !s.locked && s.done < limit);
        if (index >= 0) return index;
    }
    for (let i = stops.length - 1; i >= 0; i -= 1) if (!stops[i].locked) return i;
    return -1;
}

/** Zvezdice stanice: po jedna za svaku pređenu težinu (lako, srednje, teško) */
export function stopStars(done: number): 0 | 1 | 2 | 3 {
    return Math.min(Math.floor(Math.max(done, 0) / LEVELS_PER_TIER), 3) as 0 | 1 | 2 | 3;
}

// ── Prikaz: mapa ili kartice ─────────────────────────────────────────────────────

export type PickerView = "map" | "grid";

/** Ključ u localStorage — izbor važi za ovaj uređaj */
export const PICKER_VIEW_KEY = "bm-games-view";

export function parsePickerView(raw: unknown): PickerView | null {
    return raw === "map" || raw === "grid" ? raw : null;
}

/** Mapa je podrazumevana do 7 godina; nepoznat uzrast → mapa (mlađa deca je lakše prate) */
export function defaultPickerView(ageYears: number | null | undefined): PickerView {
    if (typeof ageYears !== "number" || !Number.isFinite(ageYears)) return "map";
    return ageYears <= 7 ? "map" : "grid";
}
