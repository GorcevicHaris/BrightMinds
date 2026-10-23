// Dugačko i u kompletu: haljine (zvono, letnja na bretele, balska), kombinezon na tregere,
// trenerka (jakna + donji deo), pidžama, kupaći, odelo, kaput (dugi, mantil), abaja i
// plašt (ogrtač koji se blago njiše). Sve od delova iz tops.ts i bottoms.ts, iste debljine slojeva.

import * as THREE from "three";
import type { ItemBuild } from "../../contract";
import { printTexture } from "../../engine/textures";
import { buildSurface, polyPath, smoothstep, taperedTube } from "../../engine/surface";
import { cloth, darker, decal, fabric, gauss, gold, lighter, metal, plastic, SIDES, torsoLayer, weighArm, weighTorso } from "./common";
import { bowAt, denim, pants, tailHole, type PantsOptions } from "./bottoms";
import { LAYER, Tailor, type LimbExtra, type TorsoExtra } from "./tailor";
import { safeHem, chestPrint, clothMaterial, collarFlap, crewNeck, hoodRing, seams, sleeveFolds, softFolds, tee, torsoSpan, vNeck, type Cloth, type Print } from "./tops";

// ── Haljine ────────────────────────────────────────────────────────────────

export interface DressOptions {
    body: Cloth;
    /** Pojas, rub i mašna */
    accent?: string;
    sleeve?: "puff" | "short" | "long" | "straps" | "none";
    length?: "knee" | "midi" | "maxi";
    /** Bela kragna (Petar Pan) */
    collar?: string;
    print?: Print;
    /** Širina zvona (1 = obično) */
    flare?: number;
    /** Mašna pozadi na struku */
    bow?: boolean;
    /** Sloj tila ispod (svečano) */
    petticoat?: string;
}

export function dress(t: Tailor, o: DressOptions) {
    const s = t.s;
    const accent = o.accent ?? "#FFFFFF";
    const main = clothMaterial({ kind: "cotton", ...o.body });
    const sash = fabric(accent, "satin");
    const off = LAYER.top - 0.002;
    const straps = o.sleeve === "straps";
    const neck = straps
        ? (a: number) => s.chestY + 0.035 + 0.01 * Math.cos(a * 2)
        : (a: number) => s.neckBaseY - 0.006 - 0.028 * Math.pow(Math.max(0, Math.cos(a)), 2);
    const waist = s.waistY - 0.01;
    const bodice: TorsoExtra = (a, y) => softFolds(t, 0.6, 0)(a, y);
    t.torso(waist - 0.012, neck, off, main, bodice, 30);
    t.ring(neck, off, 0.0035, 0.006, straps ? main : sash);
    if (straps) {
        for (const side of SIDES) {
            t.strap([[side * 0.45, neck(side * 0.45) - 0.004], [side * 0.55, s.shoulderY + 0.005], [side * 0.95, s.neckBaseY - 0.006], [side * (Math.PI - 0.55), s.shoulderY + 0.005], [side * (Math.PI - 0.45), neck(Math.PI) - 0.004]], off + 0.001, main, 0.011 * Math.min(1.3, s.height / 1.19), 0.003);
        }
    } else if (o.sleeve !== "none") {
        for (const side of SIDES) {
            if (o.sleeve === "long") {
                t.sleeve(side, 0, 0.93, off, main, sleeveFolds(1, 0.003));
                t.armRing(side, 0.93, off + 0.001, 0.0035, 0.008, sash);
            } else if (o.sleeve === "short") {
                const flare: LimbExtra = (tt) => 0.006 * smoothstep(0.05, 0.28, tt);
                t.sleeve(side, 0, 0.28, off, main, flare);
                t.armRing(side, 0.28, off + 0.006, 0.0032, 0.006, sash);
            } else {
                const puff: LimbExtra = (tt) => 0.017 * Math.pow(Math.max(0, Math.sin(Math.min(1, Math.max(0, tt) / 0.22) * Math.PI)), 0.7) + 0.002;
                t.sleeve(side, 0, 0.22, off, main, puff);
                t.armRing(side, 0.22, off + 0.003, 0.0035, 0.006, sash);
            }
        }
    }
    if (o.collar) {
        const white = fabric(o.collar, "cotton", { side: THREE.DoubleSide });
        for (const side of SIDES) collarFlap(t, side, white, { offset: off, frontA: 0.1, height: 0.024, tip: 0.004, yNeck: neck, lift: 0.004 });
    }
    const knee = s.hipY - s.thigh;
    const scale = s.height / 1.19;
    const bottomY = o.length === "maxi" ? s.ankleY + 0.03 * scale : o.length === "midi" ? knee - 0.1 * scale : knee - 0.035 * scale;
    const flare = o.flare ?? 1;
    const legOuter = s.hipX + s.legR(0.15) + 0.03 * scale;
    const folds = (a: number, v: number) => 0.009 * v * Math.sin(a * 9) + 0.003 * v * Math.sin(a * 23);
    if (o.petticoat) {
        const tulle = cloth(o.petticoat, "mesh", { sheen: 1, sheenLift: 0.6 });
        const wave = (a: number, v: number) => 0.008 * v * Math.sin(a * 13);
        const p = t.skirt(waist, bottomY - 0.012, off - 0.001, { rx: Math.max(legOuter, 0.21 * scale * flare), rz: Math.max(legOuter * 0.85, 0.18 * scale * flare) }, tulle, wave, 18);
        t.edgeRing(p.edge, 0.003, 0.004, tulle);
    }
    const { edge, fn } = t.skirt(waist, bottomY, off + (o.petticoat ? 0.006 : 0), { rx: Math.max(legOuter, 0.2 * scale * flare), rz: Math.max(legOuter * 0.85, 0.17 * scale * flare) }, main, folds, o.length === "maxi" ? 46 : 34);
    t.edgeRing(edge, 0.004, 0.006, sash);
    // Štep iznad poruba
    t.kit.strip(fn, 0, 1, 0.0006, fabric(darker(o.body.color, 0.15), "cotton"), 0.955, 0.962);
    t.ring(waist, off + 0.002, 0.006, 0.014, sash);
    if (o.print) chestPrint(t, { ...o.print, size: (o.print.size ?? 1) * 0.6, lift: 0.06 }, off);
    if (o.bow !== false) bowAt(t, waist, off + 0.012, sash, 1.15, Math.PI);
    tailHole(t, off + 0.02, main);
}

// ── Kombinezon na tregere (preko majice) ───────────────────────────────────

export interface OverallsOptions {
    tee: Cloth;
    denim: string;
    /** Džep na grudima (srce na džepu) */
    heart?: string;
    shorts?: boolean;
}

export function overalls(t: Tailor, o: OverallsOptions) {
    const s = t.s;
    tee(t, { body: o.tee, offset: LAYER.top - 0.004, length: -0.05 });
    pants(t, { cloth: { color: o.denim }, denim: true, cuff: true, length: o.shorts ? 0.36 : 0.94, offset: LAYER.top + 0.002 });
    const bibMat = denim(o.denim);
    const off = LAYER.top + 0.006;
    const top = s.chestY + 0.02;
    const bib = t.patch(-0.62, 0.62, s.waistY - 0.04, top, off, bibMat, { nu: 14, nv: 10 });
    colorFlat(bib);
    const stitch = fabric("#E3A54A", "cotton");
    t.stitch([[-0.6, s.waistY - 0.03], [-0.6, top - 0.004], [0.6, top - 0.004], [0.6, s.waistY - 0.03]], off + 0.0016, stitch, 0.0009);
    // Džep sa srcem
    const pocket = t.patch(-0.3, 0.3, s.chestY - 0.035, s.chestY + 0.005, off + 0.0015, bibMat, { puff: 0.0015, soft: 0.12, nu: 8, nv: 6 });
    colorFlat(pocket);
    if (o.heart) chestPrint(t, { map: heartTexture(o.heart), size: 0.3, lift: 0.02 }, off + 0.003);
    // Tregeri preko ramena (pozadi se ukrštaju) i dugmad
    const scale = Math.min(1.3, s.height / 1.19);
    for (const side of SIDES) {
        const strap = t.strap([[side * 0.52, top - 0.006], [side * 0.62, s.shoulderY - 0.005], [side * 1.2, s.neckBaseY - 0.004], [side * 2.2, s.shoulderY - 0.012], [-side * (Math.PI - 0.5), s.chestY - 0.01], [-side * (Math.PI - 0.35), s.waistY - 0.02]], off - 0.004, bibMat, 0.016 * scale, 0.003);
        colorFlat(strap);
        t.button(side * 0.52, top - 0.012, off + 0.003, metal("#E3B754"), 0.0055);
    }
}

function colorFlat(mesh: THREE.Mesh, k = 0.86) {
    const n = mesh.geometry.getAttribute("position").count;
    mesh.geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3).fill(k), 3));
}

function heartTexture(color: string): THREE.Texture {
    return printTexture(`srce-dzep-${color}`, (ctx, w, h) => {
        ctx.translate(w / 2, h / 2);
        const r = w * 0.36;
        ctx.beginPath();
        ctx.moveTo(0, r * 0.85);
        ctx.bezierCurveTo(-r * 1.25, r * 0.05, -r * 0.85, -r * 0.95, 0, -r * 0.38);
        ctx.bezierCurveTo(r * 0.85, -r * 0.95, r * 1.25, r * 0.05, 0, r * 0.85);
        ctx.fillStyle = color;
        ctx.fill();
    }, 64, 64);
}

// ── Trenerka (jakna sa rajsferšlusom + donji deo) ──────────────────────────

export function tracksuit(t: Tailor, o: { color: string; stripe: string }) {
    tracksuitTop(t, o);
    pants(t, { cloth: { color: o.color, kind: "satin" }, fit: "jogger", stripe: o.stripe, offset: LAYER.bottom + 0.002 });
}

/** Sportska jakna sa rajsferšlusom, kragnom koja stoji i trakama niz rukave */
export function tracksuitTop(t: Tailor, o: { color: string; stripe: string }) {
    const s = t.s;
    const shell = cloth(o.color, "satin", { roughness: 0.5, sheen: 0.6 });
    const rib = fabric(o.color, "rib");
    const off = LAYER.top + 0.002;
    const neckY = s.neckBaseY + 0.004;
    const extra = softFolds(t, 1, 0.004);
    const hem = safeHem(t, s.hipY - 0.02);
    t.torso(hem + 0.012, neckY, off, shell, extra, 40);
    t.ring(hem + 0.012, off + 0.004, 0.0055, 0.014, rib);
    // Kragna koja stoji
    const collarH = 0.026 * Math.min(1.3, s.height / 1.19);
    t.torso(neckY - 0.004, neckY + collarH, off - 0.008, rib, () => 0.006, 6, 44);
    t.ring(neckY + collarH, off - 0.003, 0.0035, 0.004, rib);
    const stripe = fabric(o.stripe, "cotton");
    for (const side of SIDES) {
        t.sleeve(side, 0, 0.92, off - 0.002, shell, sleeveFolds(1.1, 0.003));
        t.armRing(side, 0.93, off - 0.004, 0.0055, 0.015, rib);
        // Dve trake niz rukav (spolja)
        stripeAlongArm(t, side, off + 0.0012, stripe);
    }
    t.zipper(hem + 0.01, neckY + collarH - 0.002, off + extra(0, s.chestY) + 0.001, fabric(darker(o.color, 0.2), "cotton"), metal("#E8E8EC"), extra);
    seams(t, hem + 0.02, off + 0.003, o.color, extra);
}

/** Traka duž rukava spolja (od ramena do manžetne) */
export function stripeAlongArm(t: Tailor, side: 1 | -1, offset: number, material: THREE.Material, width = 0.012) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) pts.push(t.armPoint(side, 0.02 + (i / 14) * 0.86, Math.PI / 2, offset));
    const path = polyPath(pts);
    const tmp = new THREE.Vector3();
    const j = side === 1 ? t.rig.left : t.rig.right;
    const outward = (q: number, out: THREE.Vector3) => {
        path(q, tmp);
        const axis = j.shoulder.clone().lerp(j.wrist, q);
        return out.subVectors(tmp, axis).normalize();
    };
    const geometry = taperedTube(path, () => width / 2, Math.max(12, Math.round(30 * t.r)), 6, outward, 0.18);
    t.kit.skinned(weighArm(t.rig, side, geometry), material, "traka-rukav");
}


// ── Pidžama (košulja sa paspulom + široke pantalone) ───────────────────────

export function pajamas(t: Tailor, o: { body: Cloth; piping: string }) {
    const s = t.s;
    const main = clothMaterial({ kind: "cotton", ...o.body });
    const pipe = fabric(o.piping, "satin");
    const off = LAYER.top;
    const neck = (a: number) => s.neckBaseY - 0.003 - 0.03 * Math.pow(Math.max(0, Math.cos(a)), 3);
    const extra = softFolds(t, 1.3, 0.006);
    const hem = safeHem(t, s.hipY - 0.025);
    t.torso(hem, neck, off, main, extra, 40);
    t.ring(hem, off + extra(0, hem) + 0.001, 0.0032, 0.005, pipe);
    for (const side of SIDES) {
        collarFlap(t, side, main, { offset: off, frontA: 0.2, height: 0.024, tip: 0.01, yNeck: neck, lift: 0.006 });
        t.sleeve(side, 0, 0.9, off, main, sleeveFolds(1.3, 0.005));
        t.armRing(side, 0.9, off + 0.003, 0.0032, 0.006, pipe);
    }
    // Paspul niz prednji preklop i dugmad
    const pts: [number, number][] = [];
    for (let i = 0; i <= 10; i++) pts.push([0.06, hem + 0.002 + ((neck(0.06) - hem - 0.006) * i) / 10]);
    t.stitch(pts, off + extra(0, s.waistY) + 0.001, pipe, 0.0018, extra);
    const btn = plastic("#FFFFFF", 0.3);
    for (let i = 0; i < 4; i++) t.button(0.0, neck(0) - 0.012 - i * ((neck(0) - hem - 0.04) / 3), off + extra(0, s.waistY) + 0.002, btn, 0.005);
    // Džep na grudima
    t.patch(0.32, 0.7, s.chestY - 0.03, s.chestY + 0.015, off + 0.0015, main, { puff: 0.002, soft: 0.12, nu: 8, nv: 8 });
    pants(t, { cloth: { kind: "cotton", ...o.body }, fit: "wide", elastic: true, pockets: false, offset: LAYER.bottom });
    for (const side of SIDES) t.legRing(side, 0.94, LAYER.bottom + 0.002, 0.0028, 0.005, pipe, (tt) => 0.003 + 0.026 * smoothstep(0.08, 1, tt));
}

// ── Kupaći (majica sa UV zaštitom + šorc do kolena) ────────────────────────

export function swimwear(t: Tailor, o: { top: Cloth; shorts: Cloth; print?: Print }) {
    const lycra = { kind: "satin" as const, ...o.top };
    tee(t, { body: lycra, sleeve: "short", offset: LAYER.under + 0.004, loose: 0.001, print: o.print, trim: darker(o.top.color, 0.1) });
    pants(t, { cloth: { kind: "satin", ...o.shorts }, length: 0.42, elastic: true, pockets: false, offset: LAYER.bottom });
}

// ── Odelo (sako, košulja, kravata, pantalone) ──────────────────────────────

export function suit(t: Tailor, o: { color: string; shirt?: string; tie?: string; trousers?: string; pocket?: string }) {
    const off = LAYER.top + 0.004;
    const shirtNeck = shirtFront(t, o.shirt ?? "#FFFFFF", off - 0.006);
    blazer(t, o.color, o.pocket);
    if (o.tie) tie(t, o.tie, off - 0.004, shirtNeck);
    pants(t, { cloth: { color: o.trousers ?? darker(o.color, 0.08), kind: "felt" }, offset: LAYER.bottom });
}

/** Košulja koja se vidi samo u izrezu sakoa/kaputa: prednji deo i kragna (štedi trouglove) */
export function shirtFront(t: Tailor, hex: string, offset: number): (a: number) => number {
    const s = t.s;
    const shirtMat = fabric(hex, "cotton");
    const shirtNeck = (a: number) => s.neckBaseY - 0.002 - 0.014 * Math.pow(Math.max(0, Math.cos(a)), 6);
    t.patch(-0.6, 0.6, s.waistY - 0.02, shirtNeck(0) - 0.001, offset, shirtMat, { nu: 10, nv: 12 });
    for (const side of SIDES) collarFlap(t, side, shirtMat, { offset, frontA: 0.14, height: 0.018, tip: 0.012, yNeck: shirtNeck, lift: 0.002 });
    return shirtNeck;
}

/** Sako: duboki V, revers, dva dugmeta, džepovi, maramica */
export function blazer(t: Tailor, color: string, pocket?: string) {
    const s = t.s;
    const wool = cloth(color, "felt", { sheen: 0.6, sheenLift: 0.2, roughness: 0.75 });
    const shirtMat = fabric("#FFFFFF", "cotton");
    const off = LAYER.top + 0.004;
    const o = { color, pocket };
    const vDepth = s.neckBaseY - s.chestY + 0.05;
    const neck = vNeck(t, vDepth, 0.42);
    const hem = safeHem(t, s.hipY - 0.04);
    const extra = softFolds(t, 0.8, 0.004);
    t.torso(hem, neck, off, wool, extra, 40);
    t.ring(hem, off + extra(0, hem) + 0.001, 0.0028, 0.005, wool);
    for (const side of SIDES) {
        collarFlap(t, side, wool, { offset: off, frontA: 0.32, height: 0.026, tip: 0.018, frontDrop: vDepth - 0.012, yNeck: neck, lift: 0.006 });
        t.sleeve(side, 0, 0.9, off - 0.002, wool, sleeveFolds(0.8, 0.002));
        t.armRing(side, 0.9, off - 0.002, 0.0028, 0.012, wool);
        t.armRing(side, 0.955, off - 0.01, 0.0025, 0.006, shirtMat);
        t.patch(side * 0.62, side * 1.02, s.hipY + 0.005, s.hipY + 0.022, off + extra(0, s.hipY) + 0.002, wool, { puff: 0.0015, soft: 0.15, nu: 8, nv: 3 });
    }
    const btn = plastic(darker(o.color, 0.45), 0.35);
    for (let i = 0; i < 2; i++) t.button(0, s.chestY - 0.05 - vDepth * 0.08 - i * 0.042 * (s.height / 1.19), off + extra(0, s.waistY) + 0.002, btn, 0.0052);
    if (o.pocket) t.patch(0.48, 0.72, s.chestY - 0.012, s.chestY + 0.008, off + 0.0016, fabric(o.pocket, "satin"), { nu: 6, nv: 4 });
}

/** Kravata: čvor ispod kragne, list niz grudi (prati trup) */
export function tie(t: Tailor, color: string, offset: number, neck: (a: number) => number) {
    const s = t.s;
    const silk = fabric(color, "satin");
    const scale = Math.min(1.3, s.height / 1.19);
    const top = neck(0) - 0.004;
    const bottom = s.waistY + 0.01;
    const w = (y: number) => {
        const k = (top - y) / (top - bottom);
        return (0.008 + 0.012 * smoothstep(0.08, 0.9, k) - 0.02 * smoothstep(0.93, 1, k)) * scale;
    };
    const fn = (u: number, v: number, out: THREE.Vector3) => {
        const y = top - (top - bottom) * v;
        const across = (u - 0.5) * 2;
        const half = Math.max(0.0015, w(y));
        const a = (across * half) / Math.max(0.05, s.torsoFront(y));
        return t.point(a, y, offset + 0.003 + 0.002 * (1 - Math.abs(across)), undefined, out);
    };
    const geometry = buildSurface(fn, { nu: 6, nv: Math.max(8, Math.round(20 * t.r)), inside: (_u, v, out) => out.set(0, top - (top - bottom) * v, 0), weights: undefined });
    t.kit.skinned(weighTorso(t.rig, geometry), silk, "kravata");
    const knot = new THREE.SphereGeometry(0.009 * scale, 12, 8);
    knot.scale(1, 0.85, 0.6);
    const p = t.point(0, top + 0.002, offset + 0.006);
    knot.translate(p.x, p.y, p.z);
    t.kit.skinned(weighTorso(t.rig, knot), silk, "cvor");
}


// ── Kaput, mantil, abaja ───────────────────────────────────────────────────

export interface CoatOptions {
    body: Cloth;
    accent?: string;
    /** Dužina: "hip" do kukova, "knee", "calf" (do pola lista), "ankle" */
    length?: "hip" | "knee" | "calf" | "ankle";
    /** Otvoren napred (mantil doktora, naučnika) */
    open?: boolean;
    belt?: boolean;
    buttons?: "double" | "single" | "none";
    collar?: "lapel" | "stand" | "none";
    hood?: boolean;
    pockets?: boolean;
    offset?: number;
}

export function coat(t: Tailor, o: CoatOptions) {
    const s = t.s;
    const accent = o.accent ?? "#5A4A3A";
    const main = clothMaterial({ kind: "felt", ...o.body });
    const off = o.offset ?? LAYER.outer;
    const deep = o.collar === "lapel" ? 0.07 : 0.02;
    const neck = (a: number) => s.neckBaseY - 0.0 - deep * Math.pow(Math.max(0, Math.cos(a)), 3);
    const hip = s.hipY;
    const extra: TorsoExtra = (a, y) => 0.002 * (1 - smoothstep(s.hipY, s.waistY, y)) + softFolds(t, 0.7, 0)(a, y);
    t.torso(hip - 0.012, neck, off, main, extra, 40);
    for (const side of SIDES) {
        t.sleeve(side, 0, 0.93, off - 0.004, main, (tt, a) => 0.003 + 0.002 * tt + sleeveFolds(1, 0)(tt, a));
        t.armRing(side, 0.9, off - 0.001, 0.0045, 0.022, main, (tt) => 0.003 + 0.002 * tt);
    }
    const knee = s.hipY - s.thigh;
    const scale = s.height / 1.19;
    const legOuter = s.hipX + s.legR(0.1) + 0.03;
    const len = o.length ?? "calf";
    const bottomY = len === "hip" ? hip - 0.03 : len === "knee" ? knee - 0.02 * scale : len === "calf" ? knee - 0.1 * scale : s.ankleY + 0.04 * scale;
    const openGap = o.open ? 0.035 : 0;
    const { edge, fn } = t.skirt(hip, bottomY, off + 0.002, {
        // Dug kaput je A-kroja i širi od duge suknje ispod (da se suknja ne probija)
        rx: Math.max(legOuter + 0.03 * scale + (len === "ankle" ? 0.03 * scale : 0), len === "calf" || len === "ankle" ? 0.205 * scale : 0),
        rz: Math.max(Math.max(0.1 * scale, s.legR(0.2) + 0.05) + (len === "ankle" ? 0.03 : 0), len === "calf" || len === "ankle" ? 0.175 * scale : 0),
    }, main, (a, v) => 0.003 * v * Math.sin(a * 6) + (o.open ? openGap * v * gauss(a, 0, 0.12) : 0), len === "ankle" ? 30 : 22);
    t.edgeRing(edge, 0.004, 0.006, main);
    // Prednja ivica (preklop) niz kaput
    const edgeMat = fabric(darker(o.body.color, 0.15), o.body.kind ?? "felt");
    t.patch(0.14, 0.17, hip - 0.01, neck(0.15) - 0.004, off + 0.0012, edgeMat, { nu: 2, nv: 16 });
    t.kit.strip(fn, 0.022, 0.027, 0.0012, edgeMat, 0, 0.995);
    if (o.collar !== "none") {
        for (const side of SIDES) {
            if (o.collar === "stand") collarFlap(t, side, main, { offset: off, frontA: 0.2, height: 0.024, tip: 0.008, yNeck: neck, lift: 0.01 });
            else collarFlap(t, side, main, { offset: off, frontA: 0.38, height: 0.03, tip: 0.02, frontDrop: s.neckBaseY - s.chestY - 0.01, yNeck: neck, lift: 0.009 });
        }
    }
    if (o.hood) hoodRing(t, neck, off, main);
    if (o.belt) {
        const belt = fabric(o.body.color, o.body.kind ?? "felt", { sheen: 0.8 });
        t.ring(s.waistY - 0.01, off + 0.0015, 0.004, 0.016, belt);
        const buckle = new THREE.TorusGeometry(0.014 * scale, 0.0028, 8, 4);
        buckle.rotateZ(Math.PI / 4);
        buckle.scale(1.2, 0.9, 1);
        const p = t.point(0, s.waistY - 0.01, off + 0.008);
        buckle.translate(p.x, p.y, p.z);
        t.kit.skinned(weighTorso(t.rig, buckle), metal("#C9A661"), "kopca");
    }
    const btn = plastic(accent, 0.35);
    if (o.buttons === "double" || o.buttons === undefined) {
        for (const row of [s.chestY - 0.035, s.waistY + 0.035, s.hipY + 0.035]) for (const a of [-0.32, 0.32]) t.button(a, row, off + 0.002, btn, 0.006);
    } else if (o.buttons === "single") {
        for (const row of [s.chestY - 0.02, s.waistY + 0.02, s.hipY + 0.03]) t.button(0.2, row, off + 0.002, btn, 0.0058);
    }
    if (o.pockets !== false) for (const side of SIDES) t.patch(side * 0.75, side * 1.25, hip + 0.008, hip + 0.03, off + 0.002, main, { puff: 0.002, soft: 0.1, nu: 8, nv: 4 });
    tailHole(t, off + 0.012, main);
}

export function abaya(t: Tailor, o: { body: Cloth; accent?: string }) {
    const s = t.s;
    const accent = o.accent ?? "#C9A55A";
    const satin = clothMaterial({ kind: "satin", ...o.body });
    const trim = printTexture(`vez-${accent}-${o.body.color}`, (ctx, w, h) => {
        ctx.fillStyle = accent;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = o.body.color;
        ctx.lineWidth = w * 0.08;
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) {
            const y = (i / 8) * h;
            ctx.moveTo(w * 0.2, y);
            ctx.lineTo(w * 0.5, y + h / 16);
            ctx.lineTo(w * 0.8, y);
        }
        ctx.stroke();
        ctx.fillStyle = o.body.color;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(w * 0.5, (i + 0.5) * (h / 8) + h / 32, w * 0.07, 0, Math.PI * 2);
            ctx.fill();
        }
    }, 64, 256);
    trim.wrapS = trim.wrapT = THREE.RepeatWrapping;
    const trimMat = decal(trim, { roughness: 0.4, metal: 0.35, side: THREE.DoubleSide });
    const plainTrim = metal(accent);
    const off = LAYER.top + 0.002;
    const neck = crewNeck(t, 0.012);
    const waist = s.waistY - 0.03;
    t.torso(waist - 0.01, neck, off, satin, softFolds(t, 0.6, 0), 34);
    t.ring(neck, off, 0.0035, 0.008, plainTrim);
    const bell: LimbExtra = (tt) => 0.004 + 0.026 * Math.pow(smoothstep(0.35, 1, tt), 1.4);
    for (const side of SIDES) {
        t.sleeve(side, 0, 1, off, satin, bell);
        t.armRing(side, 0.985, off + 0.002, 0.004, 0.012, plainTrim, bell);
    }
    const scale = s.height / 1.19;
    const legOuter = s.hipX + s.legR(0.15) + 0.04 * scale;
    const folds = (a: number, v: number) => 0.01 * v * Math.sin(a * 7 + 0.4) + 0.004 * v * Math.sin(a * 17);
    const { edge, fn } = t.skirt(waist, s.ankleY * 0.55, off, { rx: Math.max(legOuter, 0.19 * scale), rz: Math.max(legOuter * 0.85, 0.17 * scale) }, satin, folds, 50);
    t.edgeRing(edge, 0.004, 0.009, plainTrim);
    t.patch(-0.06, 0.06, waist - 0.01, neck(0) - 0.004, off + 0.0012, trimMat, { nu: 2, nv: 14 });
    t.kit.strip(fn, 0.99, 1.0, 0.0012, trimMat, 0, 0.985);
    t.kit.strip(fn, 0.0, 0.01, 0.0012, trimMat, 0, 0.985);
    tailHole(t, off + 0.02, satin);
}

// ── Plašt (ogrtač) na ramenima: kruto na grudima, blago se njiše ────────────

export interface CapeOptions {
    color: string;
    lining: string;
    /** Dužina do (udeo visine od ramena ka podu) */
    length?: number;
    /** Kragna i kopče */
    clasp?: string;
    /** Šara (zvezdice) */
    map?: THREE.Texture;
    trim?: string;
}

export function cape(t: Tailor, o: CapeOptions, layer: number): ItemBuild {
    const s = t.s;
    const ctx = t.ctx;
    const scale = s.height / 1.19;
    const top = s.shoulderY + 0.004;
    const len = (s.shoulderY - 0.06) * (o.length ?? 0.8);
    const outer = o.map ? decalCloth(o.map) : cloth(o.color, "satin", { roughness: 0.5, sheen: 0.7 });
    const inner = cloth(o.lining, "satin", { roughness: 0.45 });
    const chest = ctx.body.rig.bone("chest");
    chest.updateMatrixWorld(true);
    const origin = new THREE.Vector3(0, top, -s.torsoBack(top) * 0.3);
    const tail = ctx.body.anchors.tail;
    // Površina: u preko leđa (od levog ramena do desnog), v od ramena nadole
    const fn = (u: number, v: number, out: THREE.Vector3) => {
        const a = Math.PI / 2 + u * Math.PI; // od +x preko leđa do −x
        const y = top - len * v;
        const yy = Math.max(y, s.waistY - 0.02);
        const w = s.torsoW(Math.min(yy, s.shoulderY - 0.01)) + layer + 0.01 + 0.06 * scale * smoothstep(0, 1, v);
        const d = s.torsoBack(Math.min(yy, s.shoulderY - 0.01)) + layer + 0.012 + 0.05 * scale * v + (tail ? 0.05 * scale * smoothstep(0.4, 0.8, v) : 0);
        const wave = 0.006 * v * Math.sin(u * Math.PI * 7);
        const shoulderWrap = 1 - 0.25 * (1 - smoothstep(0, 0.12, v));
        return out.set(Math.sin(a) * (w + wave) * shoulderWrap, y, Math.cos(a) * (d + wave) - 0.004);
    };
    const geometry = buildSurface(fn, { nu: Math.round(40 * t.r), nv: Math.round(28 * t.r), inside: (_u, v, out) => out.set(0, top - len * v, 0.05), uv: (u, v) => [u * 0.6, v * 0.6] });
    const group = new THREE.Group();
    const outerMesh = new THREE.Mesh(geometry, outer);
    const innerGeo = geometry.clone();
    const innerMesh = new THREE.Mesh(innerGeo, inner);
    innerMesh.scale.setScalar(0.995);
    group.add(innerMesh, outerMesh);
    if (o.trim) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 30; i++) pts.push(fn(i / 30, 1, new THREE.Vector3()));
        group.add(new THREE.Mesh(taperedTube(polyPath(pts), () => 0.005 * scale, 60, 8), fabric(o.trim, "fleece")));
    }
    // Kopče na ramenima
    if (o.clasp) {
        for (const side of SIDES) {
            const p = fn(side === 1 ? 0.02 : 0.98, 0.01, new THREE.Vector3());
            const c = new THREE.Mesh(new THREE.SphereGeometry(0.01 * scale, 14, 10), gold());
            c.position.copy(p).add(new THREE.Vector3(0, 0, 0.012));
            group.add(c);
        }
    }
    // Grupa se okreće oko ramena (origin): prevedi geometriju u lokalno
    for (const child of group.children) (child as THREE.Mesh).geometry.translate(-origin.x, -origin.y, -origin.z);
    group.position.copy(ctx.toBone("chest", origin));
    ctx.attach("chest", group);
    return {
        animate: (time, _dt, live) => {
            if (!live) {
                group.rotation.set(0, 0, 0);
                return;
            }
            group.rotation.x = -0.04 - 0.035 * Math.sin(time * 1.3);
            group.rotation.z = 0.02 * Math.sin(time * 0.9);
        },
    };
}

function decalCloth(map: THREE.Texture): THREE.Material {
    return clothMaterial({ color: "#FFFFFF", kind: "satin", map });
}

export { lighter, LAYER, torsoSpan, torsoLayer, type PantsOptions };
