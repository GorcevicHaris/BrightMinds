// Gornji delovi (kroj): majica, duks, džemper, košulja, dres, majica bez rukava, jakna,
// kabanica. Svaki ima pravu debljinu na rubovima (porubi, rebrasti okovratnik, manžetne),
// štepove i bočne šavove, meke nabore (struk, laktovi) i šaru ili nalepnicu na grudima.
// Sve se kroji po telu koje nosi (dete, odrasli, životinja) — preko Tailor-a.

import * as THREE from "three";
import { patternedFabric } from "../../engine/materials";
import { torsoWeights } from "../../engine/rig";
import { buildSurface, smoothstep } from "../../engine/surface";
import { cloth, darker, decal, fabric, gauss, lighter, metal, plastic, SIDES, type Side } from "./common";
import { LAYER, Tailor, type LimbExtra, type TorsoExtra } from "./tailor";
import type { FabricKind } from "../../engine/textures";

/** Šara ili boja tkanine */
export interface Cloth {
    color: string;
    kind?: FabricKind;
    /** Ponavljajuća šara (pruge, kocke, tufne…) — boja tada dolazi iz mape */
    map?: THREE.Texture;
}

export function clothMaterial(c: Cloth, double = true): THREE.Material {
    const kind = c.kind ?? "cotton";
    if (c.map) return patternedFabric(c.map, kind, "#FFFFFF", { side: double ? THREE.DoubleSide : THREE.FrontSide });
    return double ? cloth(c.color, kind) : fabric(c.color, kind);
}

/** Nalepnica na grudima: tekstura i veličina (udeo visine grudi) */
export interface Print {
    map: THREE.Texture;
    /** 1 = uobičajena veličina */
    size?: number;
    /** Pomeraj gore/dole (udeo visine trupa) */
    lift?: number;
    /** Na leđima umesto napred */
    back?: boolean;
}

// ── Pomoćni krojevi ─────────────────────────────────────────────────────────

/** Okrugli izrez (napred malo niže) */
export const crewNeck = (t: Tailor, drop = 0.012) => (a: number) => t.s.neckBaseY - 0.003 - drop * Math.pow(Math.max(0, Math.cos(a)), 2);

/** V-izrez dubine `depth` */
export const vNeck = (t: Tailor, depth = 0.045, width = 0.3) => (a: number) => t.s.neckBaseY - 0.003 - depth * Math.exp(-((a / width) ** 2));

/** Porub gornjeg dela ne sme niže od početka međunožja (tu se trup sužava) */
export const safeHem = (t: Tailor, y: number) => Math.max(y, t.s.crotchY + 0.03);

/** Visina „struka” trupa u metrima (razmera za šare i džepove) */
export const torsoSpan = (t: Tailor) => t.s.shoulderY - t.s.waistY;

/** Meki nabori: blago skupljanje na struku i pod pazuhom (dodatak poluprečniku) */
export function softFolds(t: Tailor, amount = 1, loose = 0.004): TorsoExtra {
    const s = t.s;
    return (a, y) => {
        const below = 1 - smoothstep(s.hipY, s.waistY, y);
        const waist = gauss(y, s.waistY - 0.015, 0.035) * (0.0012 * Math.sin(a * 9 + y * 70) + 0.0008 * Math.sin(a * 17 - y * 40));
        const side = Math.abs(Math.sin(a));
        const pit = gauss(y, s.chestY + 0.02, 0.03) * Math.pow(side, 6) * 0.0016 * Math.sin(y * 260);
        return loose * below + amount * (waist + pit);
    };
}

/** Nabori rukava: na laktu (dugi rukav) i blago na ramenu */
export function sleeveFolds(amount = 1, base = 0.002): LimbExtra {
    return (t, a) => base * Math.sin(Math.min(1, t) * Math.PI) + amount * gauss(t, 0.5, 0.07) * 0.0018 * Math.sin(a * 3 + t * 50);
}

/** Bočni šavovi (od poruba do pazuha) i štep iznad poruba */
export function seams(t: Tailor, hem: number, offset: number, color: string, extra?: TorsoExtra, top?: number) {
    const stitch = fabric(darker(color, 0.12), "cotton");
    const upTo = top ?? t.s.chestY + 0.025;
    for (const side of SIDES) {
        const a = side * Math.PI / 2;
        t.stitch([[a, hem + 0.004], [a, (hem + upTo) / 2], [a, upTo]], offset + 0.0008, stitch, 0.0009, extra);
    }
    t.stitchRing(hem + 0.009, offset + 0.0009, stitch, 0.0007, extra);
}

/** Nalepnica na grudima (ili leđima) */
export function chestPrint(t: Tailor, print: Print, offset: number, extra?: TorsoExtra) {
    const s = t.s;
    const span = torsoSpan(t);
    const size = print.size ?? 1;
    const h = span * 0.6 * size;
    const center = s.chestY - span * 0.16 + (print.lift ?? 0) * span;
    const w = 0.52 * size;
    const a0 = print.back ? Math.PI - w : -w;
    const a1 = print.back ? Math.PI + w : w;
    t.patch(a0, a1, center - h / 2, center + h / 2, offset + 0.0012 + (extra ? extra(0, center) : 0), decal(print.map), { nu: 18, nv: 18 });
}

// ── Majica ──────────────────────────────────────────────────────────────────

export interface TeeOptions {
    body: Cloth;
    /** Boja rebrastog okovratnika i rubova rukava (podrazumevano kao majica) */
    trim?: string;
    sleeve?: "short" | "long" | "none" | "cap";
    /** Boja rukava ako je drugačija (raglan, dres) */
    sleeveCloth?: Cloth;
    neck?: "crew" | "v" | "scoop";
    print?: Print;
    /** Dužina: 0 = do kukova, > 0 duža (tunika), < 0 kraća */
    length?: number;
    offset?: number;
    loose?: number;
    /** Široka (oversized): spušteno rame, rukav do lakta, duža, mekši veći nabori */
    oversized?: boolean;
}

export function tee(t: Tailor, o: TeeOptions) {
    const s = t.s;
    const off = o.offset ?? LAYER.top;
    const main = clothMaterial(o.body);
    const trimHex = o.trim ?? o.body.color;
    const rib = fabric(trimHex, "rib");
    const neck = o.neck === "v" ? vNeck(t) : o.neck === "scoop" ? crewNeck(t, 0.03) : crewNeck(t);
    const big = o.oversized ?? false;
    const extra = softFolds(t, big ? 1.8 : 1, o.loose ?? (big ? 0.013 : 0.005));
    const want = s.hipY - 0.012 - ((o.length ?? 0) + (big ? 0.16 : 0)) * torsoSpan(t);
    // Trup se ispod kukova sužava (međunožje): duža majica dalje pada ravno, kao tunika
    const minY = s.crotchY + 0.035;
    const hem = Math.max(want, minY);
    t.torso(hem, neck, off, main, extra, 44);
    if (want < minY - 0.005) {
        const scale = s.height / 1.19;
        const r = extra(0, hem) + off;
        const { edge } = t.skirt(hem + 0.004, want, r - 0.002, { rx: s.torsoW(hem) + r + 0.012 * scale, rz: s.torsoFront(hem) + r + 0.008 * scale }, main, (a, v) => 0.003 * v * Math.sin(a * 7), 10, 1.2);
        t.edgeRing(edge, 0.003, 0.006, main);
    } else {
        t.ring(hem, off + extra(0, hem) + 0.001, 0.0032, 0.0065, main, undefined, 64, 6);
    }
    t.ring(neck, off - 0.001, 0.0042, 0.0078, rib);
    seams(t, hem, off, o.body.color, extra);
    const sleeveMat = o.sleeveCloth ? clothMaterial(o.sleeveCloth) : main;
    for (const side of SIDES) {
        if (o.sleeve === "none") {
            sleevelessTrim(t, side, off + 0.002, rib);
            continue;
        }
        const len = o.sleeve === "long" ? 0.94 : o.sleeve === "cap" ? 0.16 : big ? 0.44 : 0.3;
        const flare: LimbExtra = o.sleeve === "long"
            ? (big ? (tt, a) => sleeveFolds(1.6, 0.005)(tt, a) + 0.004 * smoothstep(0.75, 0.9, tt) * Math.sin(a * 3 + tt * 60) : sleeveFolds(1, 0.0022))
            : big ? (tt, a) => 0.006 + 0.01 * smoothstep(0.02, 0.4, tt) + 0.0015 * Math.sin(a * 3 + tt * 30) : (tt) => 0.007 * smoothstep(0.05, 0.3, tt);
        t.sleeve(side, 0, len, off, sleeveMat, flare);
        if (o.sleeve === "long") t.armRing(side, len, off - 0.001, 0.0042, 0.013, fabric(trimHex, "rib"));
        else t.armRing(side, len, off + flare(len, 0) + 0.0005, 0.003, 0.0058, sleeveMat);
    }
    if (o.print) chestPrint(t, o.print, off, extra);
}

// ── Duks sa kapuljačom ──────────────────────────────────────────────────────

export interface HoodieOptions {
    body: Cloth;
    rib?: string;
    print?: Print;
    zip?: boolean;
    /** Pertle */
    strings?: string;
    /** Uši na kapuljači (meda, zeka) — samo ukras na spuštenoj kapuljači */
    pocket?: boolean;
    offset?: number;
}

export function hoodie(t: Tailor, o: HoodieOptions) {
    const s = t.s;
    const fleece = clothMaterial({ kind: "fleece", ...o.body });
    const ribHex = o.rib ?? o.body.color;
    const rib = fabric(ribHex, "rib");
    const off = o.offset ?? 0.0145;
    const neck = crewNeck(t, 0.008);
    const puff: TorsoExtra = (a, y) => 0.003 + 0.003 * gauss(y, s.waistY, 0.06) + softFolds(t, 1.2, 0)(a, y);
    const hem = safeHem(t, s.hipY - 0.03);
    t.torso(hem + 0.013, neck, off, fleece, puff, 44);
    t.ring(hem + 0.013, off + 0.003, 0.0058, 0.015, rib);
    seams(t, hem + 0.03, off + 0.003, o.body.color, puff);
    for (const side of SIDES) {
        const baggy: LimbExtra = (tt, a) => 0.004 + 0.004 * Math.sin(Math.min(1, tt / 0.92) * Math.PI) + sleeveFolds(1.2, 0)(tt, a);
        t.sleeve(side, 0, 0.9, off - 0.002, fleece, baggy);
        t.armRing(side, 0.92, off - 0.004, 0.0062, 0.017, rib);
    }
    // Spuštena kapuljača je ispod hidžaba (ne viri kroz tkaninu preko ramena)
    if (!t.ctx.hijab) hoodRing(t, neck, off, fleece);
    if (o.pocket !== false) {
        // Kengur-džep: meko ispupčenje sa kosim otvorima i porubljenim ivicama
        const top = s.waistY;
        const bot = hem + 0.032;
        const shapeA = (v: number): [number, number] => [-0.72 + v * 0.22, 0.72 - v * 0.22];
        t.patch(-0.7, 0.7, bot, top, off + puff(0, s.waistY) - 0.001, fleece, { puff: 0.005, soft: 0.1, shapeA, nu: 24, nv: 12 });
        const stitch = fabric(darker(o.body.color, 0.15), "cotton");
        for (const side of SIDES) {
            t.stitch([[side * 0.5, top - 0.002], [side * 0.62, (top + bot) / 2], [side * 0.72, bot + 0.004]], off + puff(0, s.waistY) + 0.004, stitch, 0.0012);
        }
    }
    if (o.zip) {
        t.zipper(hem + 0.02, neck(0) - 0.004, off + puff(0, s.waistY), fabric(darker(o.body.color, 0.2), "cotton"), metal("#C9CCD3"), puff);
    } else {
        // Pertle sa metalnim krajevima
        const string = plastic(o.strings ?? "#F4F4F2", 0.6);
        for (const side of SIDES) {
            const a = side * 0.22;
            t.stitch([[a, neck(a) - 0.004], [a * 1.15, neck(a) - 0.045], [a * 1.3, neck(a) - 0.085]], off + 0.009, string, 0.0022);
        }
    }
    if (o.print) chestPrint(t, { ...o.print, lift: (o.print.lift ?? 0) + 0.08, size: (o.print.size ?? 1) * 0.85 }, off + 0.004, puff);
}

/** Spuštena kapuljača: debeo prsten oko vrata, najdeblji pozadi */
export function hoodRing(t: Tailor, neck: (a: number) => number, off: number, material: THREE.Material) {
    const s = t.s;
    const r = t.r;
    const loop = (q: number, out: THREE.Vector3) => {
        const a = q * Math.PI * 2;
        const back = Math.max(0, -Math.cos(a));
        return t.point(a, neck(a) - 0.004 - 0.02 * Math.pow(back, 1.5), off + 0.008 + 0.012 * Math.pow(back, 1.2), undefined, out);
    };
    const center = new THREE.Vector3();
    const p = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const outward = new THREE.Vector3();
    const up = new THREE.Vector3();
    const scale = s.height / 1.19;
    const fn = (u: number, v: number, out: THREE.Vector3) => {
        const a = u * Math.PI * 2;
        const back = Math.max(0, -Math.cos(a));
        loop(u, p);
        loop((u + 0.002) % 1, p1);
        tangent.subVectors(p1, p).normalize();
        center.set(0, p.y, 0);
        outward.subVectors(p, center).setY(0).normalize();
        up.crossVectors(tangent, outward).normalize();
        if (up.y < 0) up.negate();
        const r1 = (0.007 + 0.016 * Math.pow(back, 1.3)) * Math.min(1.3, scale);
        const r2 = (0.01 + 0.03 * Math.pow(back, 1.1)) * Math.min(1.3, scale);
        const ang = v * Math.PI * 2;
        return out.copy(p).addScaledVector(outward, Math.cos(ang) * r1).addScaledVector(up, Math.sin(ang) * r2);
    };
    t.kit.skinned(hoodGeometry(fn, Math.round(64 * r), Math.max(6, Math.round(12 * r)), loop, t), material, "kapuljaca");
}

function hoodGeometry(fn: (u: number, v: number, out: THREE.Vector3) => THREE.Vector3, nu: number, nv: number, loop: (q: number, out: THREE.Vector3) => THREE.Vector3, t: Tailor) {
    return buildSurface(fn, { nu, nv, closedU: true, inside: (u, _v, out) => loop(u, out), weights: (_u, _v, q) => torsoWeights(t.s, q), uv: (u, v) => [u * 0.6, v * 0.1] });
}

// ── Pleteni džemper ─────────────────────────────────────────────────────────

export interface SweaterOptions {
    body: Cloth;
    rib?: string;
    print?: Print;
    /** Pletenice napred */
    cable?: boolean;
}

export function sweater(t: Tailor, o: SweaterOptions) {
    const s = t.s;
    const knit = clothMaterial({ kind: "knit", ...o.body });
    const rib = fabric(o.rib ?? o.body.color, "rib");
    const off = 0.0125;
    const neck = crewNeck(t, 0.01);
    const cable: TorsoExtra = (a, y) => {
        const base = 0.001 + softFolds(t, 0.8, 0)(a, y);
        if (!o.cable || Math.abs(a) > 1.25) return base;
        const col = Math.pow(Math.max(0, Math.cos(a * 5.2)), 4);
        const twist = 0.5 + 0.5 * Math.sin(y * 150 + Math.sign(Math.sin(a * 5.2)) * 1.5);
        return base + 0.0032 * col * (0.55 + 0.45 * twist);
    };
    const hem = safeHem(t, s.hipY - 0.02);
    t.torso(hem + 0.012, neck, off, knit, cable, o.cable ? 64 : 44, o.cable ? 80 : 60);
    t.ring(hem + 0.012, off + 0.002, 0.005, 0.016, rib);
    t.ring(neck, off - 0.001, 0.006, 0.011, rib);
    for (const side of SIDES) {
        t.sleeve(side, 0, 0.93, off - 0.002, knit, sleeveFolds(1, 0.003));
        t.armRing(side, 0.94, off - 0.004, 0.0052, 0.016, rib);
    }
    if (o.print) chestPrint(t, o.print, off + 0.0015);
}

// ── Košulja ────────────────────────────────────────────────────────────────

export interface ShirtOptions {
    body: Cloth;
    buttons?: string;
    pocket?: boolean;
    sleeve?: "short" | "long";
    collar?: string;
    /** Bez okovratnika (kuvar, doktor imaju svoj) */
    noCollar?: boolean;
    offset?: number;
}

export function shirt(t: Tailor, o: ShirtOptions) {
    const s = t.s;
    const main = clothMaterial(o.body);
    const off = o.offset ?? LAYER.top;
    const neck = (a: number) => s.neckBaseY - 0.002 - 0.016 * Math.pow(Math.max(0, Math.cos(a)), 6);
    const extra = softFolds(t, 1, 0.004);
    const hem = safeHem(t, s.hipY - 0.018);
    t.torso(hem, neck, off, main, extra, 44);
    t.ring(hem, off + 0.004, 0.0025, 0.004, main);
    seams(t, hem, off, o.body.color, extra);
    // Lajsna i dugmad
    t.patch(-0.075, 0.075, hem + 0.002, neck(0) - 0.002, off + 0.0016, main, { puff: 0.0012, soft: 0.25, nu: 6, nv: 16 });
    const btn = plastic(o.buttons ?? "#F6F2EA", 0.3);
    for (let i = 0; i < 4; i++) {
        const y = neck(0) - 0.022 - i * ((neck(0) - hem - 0.05) / 3);
        t.button(0, y, off + 0.003, btn, 0.0048 * Math.min(1.25, s.height / 1.19));
    }
    if (o.pocket !== false) {
        t.patch(0.32, 0.72, s.chestY - 0.035, s.chestY + 0.02, off + 0.001, main, { puff: 0.002, soft: 0.12, nu: 10, nv: 10 });
    }
    if (!o.noCollar) {
        const collarMat = o.collar ? fabric(o.collar, "cotton", { side: THREE.DoubleSide }) : main;
        for (const side of SIDES) collarFlap(t, side, collarMat, { offset: off, frontA: 0.14, height: 0.022, tip: 0.014, yNeck: neck });
    }
    for (const side of SIDES) {
        if (o.sleeve === "short") {
            const flare: LimbExtra = (tt) => 0.006 * smoothstep(0.05, 0.3, tt);
            t.sleeve(side, 0, 0.32, off, main, flare);
            t.armRing(side, 0.32, off + 0.006, 0.003, 0.008, main);
        } else {
            t.sleeve(side, 0, 0.92, off, main, sleeveFolds(1, 0.002));
            t.armRing(side, 0.92, off, 0.0035, 0.016, main);
        }
    }
}

/** Okovratnik (košulja, kaput): preklopljen list od potiljka do vrha napred */
export function collarFlap(t: Tailor, side: Side, material: THREE.Material, options: { offset: number; frontA: number; height: number; tip: number; frontDrop?: number; yNeck: (a: number) => number; lift?: number }) {
    const scale = Math.min(1.3, t.s.height / 1.19);
    const fn = (u: number, w: number, out: THREE.Vector3) => {
        const a = side * (Math.PI - u * (Math.PI - options.frontA));
        const drop = (options.frontDrop ?? 0) * Math.pow(u, 2.5);
        const y0 = options.yNeck(a) + 0.006 - drop;
        const h = (options.height + options.tip * Math.pow(u, 4)) * scale;
        const lift = (options.lift ?? 0.007) * (1 - w) * (1 - u * 0.6);
        return t.point(a, y0 - w * h, options.offset + 0.003 + lift + w * 0.002, undefined, out);
    };
    const geometry = buildSurface(fn, {
        nu: Math.max(10, Math.round(24 * t.r)),
        nv: 5,
        inside: (u, w, out) => {
            fn(u, w, out);
            return out.set(0, out.y, 0);
        },
        weights: (_u, _v, p) => torsoWeights(t.s, p),
        uv: (u, v) => [u * 0.3, v * 0.05],
    });
    t.kit.skinned(geometry, material, "okovratnik");
    // Ivica okovratnika (debljina)
    const edge: [number, number][] = [];
    const tmp = new THREE.Vector3();
    for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        fn(u, 1, tmp);
        edge.push([side * (Math.PI - u * (Math.PI - options.frontA)), tmp.y]);
    }
    t.stitch(edge, options.offset + 0.005, material, 0.0016);
}

// ── Sportski dres i majica bez rukava ───────────────────────────────────────

export interface JerseyOptions {
    body: Cloth;
    trim: string;
    number?: THREE.Texture;
    front?: THREE.Texture;
    sleeve?: "short" | "none";
    neck?: "v" | "crew";
}

export function jersey(t: Tailor, o: JerseyOptions) {
    const s = t.s;
    const mesh = clothMaterial({ kind: "mesh", ...o.body });
    const trim = fabric(o.trim, "rib");
    const off = 0.0125;
    const neck = o.neck === "crew" ? crewNeck(t, 0.02) : vNeck(t, 0.045);
    const loose: TorsoExtra = (a, y) => 0.004 + 0.004 * (1 - smoothstep(s.hipY, s.waistY, y)) + softFolds(t, 0.8, 0)(a, y);
    const hem = safeHem(t, s.hipY - 0.03);
    t.torso(hem, neck, off, mesh, loose, 44);
    t.ring(hem, off + 0.006, 0.003, 0.006, mesh);
    t.ring(neck, off + 0.001, 0.0042, 0.0095, trim);
    for (const side of SIDES) {
        if (o.sleeve === "none") {
            sleevelessTrim(t, side, off + 0.004, trim);
        } else {
            const wide: LimbExtra = (tt) => 0.006 + 0.008 * smoothstep(0.05, 0.32, tt);
            t.sleeve(side, 0, 0.32, off - 0.002, mesh, wide);
            t.armRing(side, 0.32, off + 0.012, 0.0035, 0.0075, trim);
        }
        // Bočna traka
        t.patch(side * Math.PI / 2 - 0.11, side * Math.PI / 2 + 0.11, hem + 0.004, s.chestY + 0.02, off + loose(0, s.chestY) + 0.0006, trim, { nu: 4, nv: 14 });
    }
    if (o.number) {
        t.patch(Math.PI - 0.62, Math.PI + 0.62, s.waistY - 0.06, s.chestY + 0.035, off + loose(0, s.waistY) + 0.0012, decal(o.number), { nu: 16, nv: 16 });
        if (!o.front) t.patch(0.14, 0.52, s.chestY - 0.035, s.chestY + 0.014, off + loose(0, s.chestY) + 0.0012, decal(o.number), { nu: 8, nv: 8 });
    }
    if (o.front) chestPrint(t, { map: o.front, size: 0.9, lift: -0.02 }, off + loose(0, s.chestY));
}

/** Rub otvora za ruku bez rukava: prsten oko ramena (prati ruku i trup) */
export function sleevelessTrim(t: Tailor, side: Side, offset: number, material: THREE.Material) {
    t.sleeve(side, 0, 0.035, offset - 0.004, material, () => 0.004);
    t.armRing(side, 0.035, offset, 0.0035, 0.007, material);
}

// ── Prsluk (otvoren napred) ─────────────────────────────────────────────────

export function vest(t: Tailor, o: { body: Cloth; offset?: number; buttons?: string; open?: number; length?: number; trim?: string }) {
    const s = t.s;
    const main = clothMaterial({ kind: "felt", ...o.body });
    const off = o.offset ?? LAYER.top + 0.008;
    const open = o.open ?? 0.32;
    const hem = safeHem(t, s.hipY - 0.005 - (o.length ?? 0));
    // Ljuska bez prednjeg dela: ugao preko leđa (u ∈ (open, 2π − open))
    const neck = (a: number) => s.neckBaseY - 0.004 - 0.075 * Math.pow(Math.max(0, Math.cos(a)), 2);
    const fn = (u: number, v: number, out: THREE.Vector3) => {
        const a = open + u * (Math.PI * 2 - 2 * open);
        const y = hem + (neck(a) - hem) * v;
        return t.point(a, y, off, undefined, out);
    };
    const geometry = buildSurface(fn, {
        nu: Math.round(48 * t.r),
        nv: Math.round(30 * t.r),
        inside: (u, v, out) => {
            fn(u, v, out);
            return out.set(0, out.y, 0);
        },
        weights: (_u, _v, p) => torsoWeights(s, p),
        uv: (u, v) => [u * 0.6, v * 0.3],
    });
    t.kit.skinned(geometry, main, "prsluk");
    const edge = fabric(o.trim ?? darker(o.body.color, 0.15), "felt");
    const pts: [number, number][] = [];
    for (let i = 0; i <= 10; i++) pts.push([open, hem + ((neck(open) - hem) * i) / 10]);
    t.stitch(pts, off + 0.0015, edge, 0.0025);
    t.stitch(pts.map(([a, y]) => [-a, y]), off + 0.0015, edge, 0.0025);
    const hemPts: [number, number][] = [];
    for (let i = 0; i <= 24; i++) hemPts.push([open + (i / 24) * (Math.PI * 2 - 2 * open), hem]);
    t.stitch(hemPts, off + 0.0015, edge, 0.0028);
    for (const side of SIDES) armholeRim(t, side, off, edge);
    if (o.buttons) for (let i = 0; i < 3; i++) t.button(open + 0.06, s.chestY - 0.01 - i * 0.04 * (s.height / 1.19), off + 0.002, plastic(o.buttons), 0.0045);
}

/** Rub oko otvora za ruku na prsluku (cev oko ramena) */
function armholeRim(t: Tailor, side: Side, offset: number, material: THREE.Material) {
    const s = t.s;
    const pts: [number, number][] = [];
    const ry = s.shoulderY - s.chestY + 0.01;
    for (let i = 0; i <= 16; i++) {
        const q = (i / 16) * Math.PI * 2;
        pts.push([side * (Math.PI / 2 + Math.cos(q) * 0.42), s.shoulderY - 0.02 + Math.sin(q) * ry * 0.5 - ry * 0.25]);
    }
    t.stitch(pts, offset + 0.0015, material, 0.0024);
}

// ── Jakna (pernata) i kabanica ──────────────────────────────────────────────

export interface PufferOptions {
    body: Cloth;
    trim?: string;
    /** Krzneni rub kapuljače */
    fur?: boolean;
}

export function puffer(t: Tailor, o: PufferOptions) {
    const s = t.s;
    const shell = cloth(o.body.color, "satin", { roughness: 0.42, sheen: 0.5 });
    const off = LAYER.outer;
    const span = torsoSpan(t);
    const band = span * 0.24;
    const quilt: TorsoExtra = (a, y) => {
        const k = ((y - s.hipY) / band) % 1;
        const puff = Math.pow(Math.sin(Math.max(0, k) * Math.PI), 0.6);
        return 0.004 + 0.009 * puff + 0.002 * (1 - smoothstep(s.hipY, s.waistY, y)) + 0.001 * Math.sin(a * 8) * puff;
    };
    const hem = safeHem(t, s.hipY - 0.035);
    const neckY = s.neckBaseY + 0.008;
    t.torso(hem, neckY, off, shell, quilt, 50, 56);
    // Visoka kragna (stoji uz vrat); uz hidžab je kragna ispod tkanine, pa se ne diže uz vrat
    const collarH = t.ctx.hijab ? 0 : 0.03 * Math.min(1.3, s.height / 1.19);
    if (collarH > 0) {
        t.torso(neckY - 0.004, neckY + collarH, off - 0.006, shell, () => 0.004, 8, 48);
        t.ring(neckY + collarH, off - 0.002, 0.004, 0.005, shell);
    }
    t.ring(hem, off + 0.006, 0.006, 0.01, fabric(o.trim ?? darker(o.body.color, 0.2), "rib"));
    for (const side of SIDES) {
        const puffArm: LimbExtra = (tt) => 0.006 + 0.007 * Math.pow(Math.abs(Math.sin(tt * Math.PI * 4.5)), 0.6) * smoothstep(0, 0.1, tt) * (1 - smoothstep(0.85, 0.92, tt));
        t.sleeve(side, 0, 0.9, off - 0.006, shell, puffArm, 32);
        t.armRing(side, 0.91, off - 0.008, 0.006, 0.016, fabric(o.trim ?? darker(o.body.color, 0.2), "rib"));
    }
    t.zipper(hem + 0.01, collarH > 0 ? neckY + collarH - 0.005 : s.shoulderY - 0.03, off + quilt(0, s.chestY) + 0.002, fabric(darker(o.body.color, 0.25), "cotton"), metal("#C9CCD3"), quilt);
    // Džepovi sa poklopcem
    for (const side of SIDES) t.patch(side * 0.6, side * 1.0, s.waistY - 0.03, s.waistY - 0.005, off + 0.012, shell, { puff: 0.002, soft: 0.15, nu: 8, nv: 4 });
}

export interface RaincoatOptions {
    body: Cloth;
    trim?: string;
}

/** Kabanica: sjajna, malo zvonasta do pola butina, kragna, dugmad-palidrvca, džepovi */
export function raincoat(t: Tailor, o: RaincoatOptions) {
    const s = t.s;
    const shell = cloth(o.body.color, "satin", { roughness: 0.22, sheen: 0.25 });
    const off = LAYER.outer;
    const neck = (a: number) => s.neckBaseY - 0.004 - 0.014 * Math.pow(Math.max(0, Math.cos(a)), 4);
    t.torso(s.hipY + 0.01, neck, off, shell, (a, y) => softFolds(t, 1, 0)(a, y) + 0.002, 34);
    const scale = s.height / 1.19;
    const knee = s.hipY - s.thigh * 0.55;
    const legOuter = s.hipX + s.legR(0.1) + 0.03;
    const { edge, fn } = t.skirt(s.hipY + 0.012, knee, off + 0.002, { rx: Math.max(legOuter + 0.03 * scale, 0.15 * scale), rz: 0.13 * scale }, shell, (a, v) => 0.004 * v * Math.sin(a * 7), 18, 1.4);
    t.edgeRing(edge, 0.004, 0.007, shell);
    const trim = fabric(o.trim ?? darker(o.body.color, 0.15), "satin", { roughness: 0.3 });
    t.kit.strip(fn, 0.0, 0.012, 0.0014, trim, 0, 0.99);
    t.patch(-0.03, 0.03, s.hipY + 0.008, neck(0) - 0.004, off + 0.0016, trim, { nu: 2, nv: 12 });
    for (const side of SIDES) {
        collarFlap(t, side, shell, { offset: off, frontA: 0.2, height: 0.026, tip: 0.012, yNeck: neck, lift: 0.009 });
        t.sleeve(side, 0, 0.92, off - 0.004, shell, (tt, a) => 0.004 + 0.003 * tt + sleeveFolds(1.3, 0)(tt, a));
        t.armRing(side, 0.92, off - 0.002, 0.0042, 0.012, shell, (tt) => 0.004 + 0.003 * tt);
        t.patch(side * 0.55, side * 1.05, s.hipY + 0.015, s.hipY + 0.045, off + 0.003, shell, { puff: 0.002, soft: 0.12, nu: 8, nv: 4 });
    }
    const toggle = plastic("#3A3546", 0.4);
    const n = 4;
    for (let i = 0; i < n; i++) {
        const y = neck(0) - 0.03 - i * ((neck(0) - s.hipY - 0.04) / (n - 1));
        t.button(0.07, y, off + 0.003, toggle, 0.0055 * Math.min(1.3, scale));
    }
}

/** Ime za ugao (radi čitljivosti u predmetima) */
export const FRONT = 0;
export const BACK = Math.PI;
export { lighter };

// ── Polo majica ─────────────────────────────────────────────────────────────

export function polo(t: Tailor, o: { body: Cloth; collar?: string; buttons?: string; print?: Print }) {
    const s = t.s;
    const main = clothMaterial({ kind: "cotton", ...o.body });
    const off = LAYER.top;
    const neck = (a: number) => s.neckBaseY - 0.002 - 0.012 * Math.pow(Math.max(0, Math.cos(a)), 6);
    const extra = softFolds(t, 1.1, 0.006);
    const hem = safeHem(t, s.hipY - 0.02);
    t.torso(hem, neck, off, main, extra, 44);
    t.ring(hem, off + extra(0, hem) + 0.001, 0.0032, 0.0065, main);
    seams(t, hem, off, o.body.color, extra);
    // Lajsna sa dva dugmeta
    const placketBot = s.chestY - 0.01;
    t.patch(-0.06, 0.06, placketBot, neck(0) - 0.002, off + 0.0015, main, { puff: 0.001, soft: 0.25, nu: 4, nv: 8 });
    t.stitch([[-0.06, placketBot], [0.06, placketBot]], off + 0.002, fabric(darker(o.body.color, 0.15), "cotton"), 0.0009);
    const btn = plastic(o.buttons ?? lighter(o.body.color, 0.5), 0.3);
    for (let i = 0; i < 2; i++) t.button(0, neck(0) - 0.016 - i * 0.02 * Math.min(1.3, s.height / 1.19), off + 0.003, btn, 0.0042);
    const collarMat = fabric(o.collar ?? o.body.color, "rib", { side: THREE.DoubleSide });
    for (const side of SIDES) {
        collarFlap(t, side, collarMat, { offset: off, frontA: 0.1, height: 0.022, tip: 0.012, yNeck: neck, lift: 0.008 });
        const flare: LimbExtra = (tt, a) => 0.005 + 0.007 * smoothstep(0.02, 0.32, tt) + 0.001 * Math.sin(a * 3);
        t.sleeve(side, 0, 0.33, off, main, flare);
        t.armRing(side, 0.33, off + flare(0.33, 0) - 0.001, 0.0035, 0.009, fabric(o.collar ?? o.body.color, "rib"), flare);
    }
    if (o.print) chestPrint(t, { ...o.print, size: (o.print.size ?? 1) * 0.3, lift: 0.1 }, off, extra);
}

// ── Kardigan (pleteni džemper na kopčanje, otvoren preko majice) ───────────

export function cardigan(t: Tailor, o: { body: Cloth; under: Cloth; buttons?: string }) {
    const s = t.s;
    tee(t, { body: o.under, neck: "scoop", offset: LAYER.top - 0.003, length: 0.05, sleeve: "cap" });
    const knit = clothMaterial({ kind: "knit", ...o.body });
    const rib = fabric(o.body.color, "rib", { side: THREE.DoubleSide });
    const off = LAYER.top + 0.008;
    const open = 0.22;
    const neck = (a: number) => s.neckBaseY - 0.004 - (s.neckBaseY - s.chestY + 0.02) * Math.pow(Math.max(0, Math.cos(a)), 3);
    const hem = safeHem(t, s.hipY - 0.03);
    const cable: TorsoExtra = (a, y) => {
        const col = Math.abs(a) < 0.95 && Math.abs(a) > open + 0.1 ? Math.pow(Math.max(0, Math.cos((Math.abs(a) - 0.6) * 9)), 4) : 0;
        return 0.004 + 0.003 * col * (0.6 + 0.4 * Math.sin(y * 140)) + softFolds(t, 1.4, 0.004)(a, y);
    };
    const fn = (u: number, v: number, out: THREE.Vector3) => {
        const a = open + u * (Math.PI * 2 - 2 * open);
        const y = hem + (neck(a) - hem) * v;
        return t.point(a, y, off, cable, out);
    };
    const geometry = buildSurface(fn, {
        nu: Math.round(64 * t.r),
        nv: Math.round(44 * t.r),
        inside: (u, v, out) => {
            fn(u, v, out);
            return out.set(0, out.y, 0);
        },
        weights: (_u, _v, p) => torsoWeights(s, p),
        uv: (u, v) => [u * 0.6, v * 0.3],
    });
    t.kit.skinned(geometry, knit, "kardigan");
    // Rebrasti rubovi napred (lajsne) i porub
    const edge: [number, number][] = [];
    for (let i = 0; i <= 14; i++) edge.push([open, hem + ((neck(open) - hem) * i) / 14]);
    t.strap(edge, off + cable(open, s.waistY) + 0.002, rib, 0.012 * Math.min(1.3, s.height / 1.19), 0.004);
    t.strap(edge.map(([a, y]) => [-a, y]), off + cable(open, s.waistY) + 0.002, rib, 0.012 * Math.min(1.3, s.height / 1.19), 0.004);
    const hemPts: [number, number][] = [];
    for (let i = 0; i <= 30; i++) hemPts.push([open + (i / 30) * (Math.PI * 2 - 2 * open), hem + 0.006]);
    t.strap(hemPts, off + 0.006, rib, 0.016, 0.005);
    const btn = plastic(o.buttons ?? "#F6F2EA", 0.3);
    for (let i = 0; i < 4; i++) t.button(open + 0.02, s.chestY - 0.02 - i * ((s.chestY - hem - 0.03) / 3.2), off + cable(open, s.waistY) + 0.005, btn, 0.0045);
    for (const side of SIDES) {
        t.sleeve(side, 0, 0.92, off - 0.003, knit, (tt, a) => 0.004 + sleeveFolds(1.5, 0.004)(tt, a));
        t.armRing(side, 0.93, off - 0.004, 0.0052, 0.016, rib);
    }
}

// ── Pernati prsluk ──────────────────────────────────────────────────────────

export function pufferVest(t: Tailor, o: { body: Cloth; under: Cloth; longSleeve?: boolean }) {
    const s = t.s;
    tee(t, { body: o.under, sleeve: o.longSleeve ? "long" : "short", offset: LAYER.top - 0.002, oversized: !o.longSleeve });
    const shell = cloth(o.body.color, "satin", { roughness: 0.38, sheen: 0.55 });
    const off = LAYER.outer + 0.004;
    const span = torsoSpan(t);
    const band = span * 0.22;
    const quilt: TorsoExtra = (a, y) => {
        const k = (((y - s.hipY) / band) % 1 + 1) % 1;
        const puff = Math.pow(Math.sin(k * Math.PI), 0.55);
        return 0.006 + 0.012 * puff + 0.002 * Math.sin(a * 6) * puff;
    };
    const hem = safeHem(t, s.hipY - 0.03);
    const neckY = s.neckBaseY + 0.004;
    // Bez rukava: ljuska se sužava oko ramena (otvor za ruku)
    const armhole: TorsoExtra = (a, y) => quilt(a, y) - 0.014 * Math.pow(Math.abs(Math.sin(a)), 8) * smoothstep(s.chestY - 0.01, s.shoulderY - 0.02, y);
    t.torso(hem, neckY, off, shell, armhole, 44, 52);
    // Uz hidžab kragna ne stoji uz vrat (ispod je tkanine)
    const collarH = t.ctx.hijab ? 0 : 0.034 * Math.min(1.3, s.height / 1.19);
    if (collarH > 0) t.torso(neckY - 0.006, neckY + collarH, off - 0.008, shell, (a, y) => 0.008 + 0.004 * Math.sin(Math.PI * (y - neckY + 0.006) / (collarH + 0.006)), 10, 48);
    if (collarH > 0) t.ring(neckY + collarH, off - 0.0, 0.004, 0.005, shell);
    t.ring(hem, off + 0.006, 0.006, 0.01, fabric(darker(o.body.color, 0.08), "rib"));
    for (const side of SIDES) {
        t.sleeve(side, 0, 0.05, off - 0.008, shell, () => 0.008);
        t.armRing(side, 0.05, off - 0.004, 0.006, 0.01, fabric(darker(o.body.color, 0.08), "rib"));
    }
    t.zipper(hem + 0.01, collarH > 0 ? neckY + collarH - 0.003 : s.shoulderY - 0.03, off + quilt(0, s.chestY) + 0.002, fabric(darker(o.body.color, 0.2), "cotton"), metal("#C9CCD3"), quilt);
    // Šavovi kanala (prošiveni)
    const seam = fabric(darker(o.body.color, 0.12), "cotton");
    for (let i = 1; i < 5; i++) {
        const y = s.hipY + band * i;
        if (y > s.shoulderY - 0.015) break;
        t.stitchRing(y, off + 0.006, seam, 0.0012);
    }
}

/** Pernata jakna sa širokim kanalima (moderna) — boja i sjaj najlona */
export function pufferJacket(t: Tailor, o: { body: Cloth; under?: Cloth }) {
    if (o.under) tee(t, { body: o.under, offset: LAYER.top - 0.003 });
    puffer(t, { body: o.body, trim: darker(o.body.color, 0.1) });
}
