// Delovi životinja koji se ponavljaju među vrstama (koriste ih i dodatne vrste u extra/):
// uši (šiljate, visoke, okrugle, klempave, kovrdžave), šape sa jastučićima, kopita, peraja,
// stopala, repovi (dugi, čupavi, pufnasti, sa kićankom, od vlasi), čuperci grive i rog.
// Sve geometrije su u lokalnim koordinatama kosti za koju se kače; boje se računaju u
// prostoru tela (paint.ts), pa šara prelazi preko granica delova.

import * as THREE from "three";
import type { BodyShape, Rig } from "../contract";
import { footFn } from "../engine/body";
import { B } from "../engine/rig";
import { buildSurface, clamp01, merge, polyPath, smoothstep, sweepFn, type BoneWeights, type SweepSpec } from "../engine/surface";
import { FUR_TILE } from "./materials";
import { col, paintGeometry, type PaintContext, type PaintPoint } from "./paint";

export type Side = 1 | -1;

/** Koordinate teksture krzna u „pločicama” (metri / FUR_TILE) */
export function furUv(around: number, along: number): (u: number, v: number) => [number, number] {
    return (u, v) => [(u * around) / FUR_TILE, (v * along) / FUR_TILE];
}

/** Cev sa težinama kostiju (rep, griva na kostima) */
export function weightedTube(path: (s: number, out: THREE.Vector3) => THREE.Vector3, radius: (s: number) => number, segments: number, sides: number, weights?: (s: number) => BoneWeights, flatten = 1, forward?: THREE.Vector3): THREE.BufferGeometry {
    const spec: SweepSpec = {
        path,
        forward,
        section: (s, a) => {
            const r = radius(s);
            return [Math.sin(a) * r, Math.cos(a) * r * flatten];
        },
    };
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    let length = 0;
    let rMax = 0;
    for (let i = 0; i < 24; i++) {
        length += path(i / 24, a).distanceTo(path((i + 1) / 24, b));
        rMax = Math.max(rMax, radius(i / 24));
    }
    return buildSurface(sweepFn(spec), {
        nu: sides,
        nv: segments,
        closedU: true,
        inside: (_u, v, out) => path(v, out),
        uv: furUv(Math.PI * 2 * rMax, length),
        weights: weights ? (_u, v) => weights(v) : undefined,
    });
}

/** Parametar duž cevi (v) iz uv koordinate (furUv) — za bojenje */
function tubeT(geometry: THREE.BufferGeometry, i: number, along: number): number {
    return clamp01((geometry.getAttribute("uv").getY(i) * FUR_TILE) / along);
}

function pathLength(path: (s: number, out: THREE.Vector3) => THREE.Vector3): number {
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    let length = 0;
    for (let i = 0; i < 24; i++) length += path(i / 24, a).distanceTo(path((i + 1) / 24, b));
    return length;
}

// ── Uši ───────────────────────────────────────────────────────────────────────

export interface EarShape {
    /** Dužina, širina i debljina (m) */
    len: number;
    width: number;
    depth: number;
    /** Širina duž uha (t = 0 koren, 1 vrh) */
    profile: (t: number) => number;
    /** Savijanje unazad (m na vrhu) i napolje */
    bend?: number;
    /** Udubljenje spreda (0–1) */
    cup?: number;
    /** Unutrašnjost: udeo širine i dužine */
    inner?: number;
    /** Čuperci krzna u uhu */
    tufts?: number;
    /** Kovrdže (pudla): visina neravnina */
    curls?: number;
}

export const EAR_PROFILES = {
    pointy: (t: number) => Math.pow(1 - t, 0.85) * (0.86 + 0.14 * Math.sin(Math.PI * Math.min(1, t * 1.6))) * (1 - Math.pow(t, 10)) + 0.08 * Math.sin(Math.PI * t),
    tall: (t: number) => (0.72 + 0.28 * Math.sin(Math.PI * Math.min(1, t * 1.2 + 0.1))) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 3))),
    round: (t: number) => Math.sqrt(Math.max(0, 1 - Math.pow(t * 1.9 - 0.9, 2))) * 0.98 + 0.02,
    floppy: (t: number) => (0.62 + 0.38 * Math.sin(Math.PI * Math.min(1, t * 0.95 + 0.2))) * Math.sqrt(Math.max(0, 1 - Math.pow(t, 4))),
};

/** Ljuska uha duž +y (koren u 0), lice ka +z; vraća krzno i unutrašnjost */
export function earGeometry(shape: EarShape, quality: "high" | "low"): { shell: THREE.BufferGeometry; inner: THREE.BufferGeometry | null; tufts: THREE.BufferGeometry | null } {
    const { len, width, depth } = shape;
    const bend = shape.bend ?? 0;
    const cup = shape.cup ?? 0.5;
    const curls = shape.curls ?? 0;
    const center = (t: number, out: THREE.Vector3) => out.set(0, len * t, -bend * t * t);
    const c = new THREE.Vector3();
    const fn = (u: number, t: number, out: THREE.Vector3) => {
        const a = u * Math.PI * 2;
        const w = (width / 2) * shape.profile(t);
        const d = (depth / 2) * Math.max(0.08, shape.profile(t));
        const ca = Math.cos(a);
        // Napred plitko udubljenje (obod viši od sredine), pozadi zaobljeno
        let z = ca >= 0 ? d * (0.45 * ca * (1 - cup)) + d * 0.5 * (1 - Math.abs(ca)) * cup : d * 0.9 * ca;
        z += d * 0.25 * cup;
        let x = Math.sin(a) * w;
        if (curls > 0) {
            const k = 1 + curls * (Math.sin(a * 6 + t * 18) * 0.5 + Math.sin(t * 31 + a * 3) * 0.5);
            x *= k;
            z *= k;
        }
        center(t, c);
        return out.set(c.x + x, c.y, c.z + z);
    };
    const hi = quality === "high";
    const shell = buildSurface(fn, { nu: hi ? 36 : 20, nv: hi ? 28 : 14, closedU: true, inside: (_u, v, out) => center(v, out), uv: furUv(width * 2, len) });
    let inner: THREE.BufferGeometry | null = null;
    if (shape.inner) {
        const k = shape.inner;
        inner = buildSurface((s, t, out) => {
            const tt = t * (0.55 + 0.38 * k) + 0.03;
            // Na prednjoj (udubljenoj) strani ljuske, uže od nje, malo ispred
            const a = Math.asin(Math.max(-1, Math.min(1, (s - 0.5) * 2 * k)));
            fn(a / (Math.PI * 2), tt, out);
            return out.add(new THREE.Vector3(0, 0, 0.0016));
        }, { nu: hi ? 16 : 10, nv: hi ? 18 : 10, inside: (_s, t, out) => center(t, out).add(new THREE.Vector3(0, 0, -depth)) });
    }
    let tufts: THREE.BufferGeometry | null = null;
    if (shape.tufts) {
        const parts: THREE.BufferGeometry[] = [];
        for (let i = 0; i < shape.tufts; i++) {
            const x = (i / Math.max(1, shape.tufts - 1) - 0.5) * width * 0.35;
            const a = new THREE.Vector3(x, len * 0.06, depth * 0.2);
            const b = new THREE.Vector3(x * 1.3, len * (0.2 + 0.05 * (i % 2)), depth * 0.42);
            const e = new THREE.Vector3(x * 1.8, len * (0.3 + 0.06 * (i % 2)), depth * 0.36);
            const path = polyPath([a, b, e]);
            const g = weightedTube(path, (s) => width * 0.045 * Math.pow(1 - s, 0.8) + 0.0005, 8, 6);
            g.deleteAttribute("uv");
            parts.push(g);
        }
        tufts = merge(parts);
    }
    return { shell, inner, tufts };
}

// ── Šape i kopita (kost šake: −y niz ruku) ─────────────────────────────────────

/** Okret iz „uspravnog” (−y niz šaku) u smer podlaktice, dlan blago unazad */
export function handFrame(rig: Rig, side: Side): THREE.Quaternion {
    const j = side === 1 ? rig.left : rig.right;
    const dir = new THREE.Vector3().subVectors(j.wrist, j.elbow).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    const twist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.3 * side);
    return twist.premultiply(q);
}

export interface PawResult {
    fur: THREE.BufferGeometry;
    pads: THREE.BufferGeometry | null;
    /** Poluprečnik šape i tačka hvata (lokalno u kosti) */
    radius: number;
    grip: THREE.Vector3;
}

/**
 * Šapa kao meka rukavica: zaobljena, sa tri prsta na kraju (meke izbočine) i jastučićima na
 * dlanu (vide se kad maše). `R` = poluprečnik šape.
 */
export function pawHand(rig: Rig, side: Side, R: number, quality: "high" | "low", options: { pads?: boolean; toes?: number } = {}): PawResult {
    const hi = quality === "high";
    const cy = -R * 0.95;
    const toes = options.toes ?? 3;
    const dir = new THREE.Vector3();
    const palm = new THREE.Vector3(-side, 0, 0);
    const fn = (u: number, v: number, out: THREE.Vector3) => {
        const th = u * Math.PI * 2;
        const ph = v * Math.PI;
        dir.set(Math.sin(th) * Math.sin(ph), Math.cos(ph), Math.cos(th) * Math.sin(ph));
        // Rukavica: malo duža nego šira, spljoštena po dlanu
        let r = 1 / Math.sqrt((dir.x / 0.84) ** 2 + (dir.y / 1.08) ** 2 + (dir.z / 1.0) ** 2);
        // Prsti: izbočine na kraju šape
        for (let k = 0; k < toes; k++) {
            const zt = (k - (toes - 1) / 2) * 0.52;
            const d = Math.hypot(dir.x * 0.9 - palm.x * 0.05, dir.y + 0.86, dir.z - zt);
            r += 0.12 * Math.exp(-(d * d) / 0.07);
        }
        // Blago udubljenje dlana
        r -= 0.05 * Math.exp(-((dir.x - palm.x) ** 2 + (dir.y + 0.2) ** 2 + dir.z * dir.z) / 0.25);
        return out.set(dir.x * r * R, cy + dir.y * r * R, dir.z * r * R);
    };
    const fur = buildSurface(fn, { nu: hi ? 36 : 22, nv: hi ? 28 : 16, closedU: true, inside: (_u, _v, out) => out.set(0, cy, 0), uv: furUv(R * 6, R * 3) });
    // Zglob: kratak valjak ka podlaktici (bez praznine između ruke i šape)
    const wrist = new THREE.CylinderGeometry(R * 0.72, R * 0.82, R * 0.9, hi ? 24 : 14, 1, true);
    wrist.translate(0, -R * 0.05, 0);
    wrist.setAttribute("uv", wrist.getAttribute("uv"));
    const q = handFrame(rig, side);
    const furAll = merge([fur, wrist]);
    furAll.applyQuaternion(q);
    let pads: THREE.BufferGeometry | null = null;
    if (options.pads ?? true) {
        const list: THREE.BufferGeometry[] = [];
        const main = new THREE.SphereGeometry(1, 18, 12);
        main.scale(R * 0.12, R * 0.38, R * 0.42);
        main.translate(-side * R * 0.8, cy - R * 0.12, 0);
        list.push(main);
        for (let k = 0; k < toes; k++) {
            const zt = (k - (toes - 1) / 2) * 0.48;
            const bean = new THREE.SphereGeometry(1, 14, 10);
            bean.scale(R * 0.09, R * 0.17, R * 0.16);
            const p = new THREE.Vector3(-side * 0.62, -0.78, zt).normalize().multiplyScalar(R * 1.02);
            bean.translate(p.x, cy + p.y * 1.05, p.z);
            list.push(bean);
        }
        for (const g of list) g.deleteAttribute("uv");
        pads = merge(list);
        pads.applyQuaternion(q);
    }
    const grip = new THREE.Vector3(-side * R * 0.35, cy - R * 0.1, R * 0.1).applyQuaternion(q);
    return { fur: furAll, pads, radius: R, grip };
}

/** Kopito na kraju ruke (jednorog): krzneni „čarapa” deo i sjajno kopito */
export function hoofHand(rig: Rig, side: Side, R: number, quality: "high" | "low"): { fur: THREE.BufferGeometry; hoof: THREE.BufferGeometry; grip: THREE.Vector3; radius: number } {
    const hi = quality === "high";
    const seg = hi ? 32 : 18;
    const cuff = buildSurface((u, v, out) => {
        const a = u * Math.PI * 2;
        const y = -v * R * 1.1;
        const r = R * (0.82 + 0.2 * Math.sin(Math.PI * v));
        return out.set(Math.sin(a) * r, y, Math.cos(a) * r);
    }, { nu: seg, nv: 10, closedU: true, inside: (_u, v, out) => out.set(0, -v * R * 1.1, 0), uv: furUv(R * 6, R) });
    const hoof = buildSurface((u, v, out) => {
        const a = u * Math.PI * 2;
        const top = -R * 1.0;
        const h = R * 0.85;
        const y = top - v * h;
        // Zaobljeno dno, malo šire napred
        const bottom = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, v - 0.7) / 0.3, 2)));
        const r = R * (0.92 + 0.1 * v) * (0.25 + 0.75 * bottom) * (1 + 0.08 * Math.cos(a));
        return out.set(Math.sin(a) * r, y, Math.cos(a) * r);
    }, { nu: seg, nv: 14, closedU: true, inside: (_u, v, out) => out.set(0, -R - v * R * 0.85, 0) });
    const q = handFrame(rig, side);
    cuff.applyQuaternion(q);
    hoof.applyQuaternion(q);
    const grip = new THREE.Vector3(-side * R * 0.3, -R * 1.2, 0).applyQuaternion(q);
    return { fur: cuff, hoof, grip, radius: R };
}

/** Peraje (pingvin): ravna, zaobljena lopatica koja nastavlja ruku */
export function flipperHand(rig: Rig, side: Side, R: number, quality: "high" | "low"): { fur: THREE.BufferGeometry; grip: THREE.Vector3; radius: number } {
    const hi = quality === "high";
    const len = R * 3.2;
    const fn = (u: number, v: number, out: THREE.Vector3) => {
        const th = u * Math.PI * 2;
        const ph = v * Math.PI;
        const dx = Math.sin(th) * Math.sin(ph);
        const dy = Math.cos(ph);
        const dz = Math.cos(th) * Math.sin(ph);
        const t = (1 - dy) / 2;
        // Šire pri vrhu nego kod zgloba, tanko
        const wz = R * (0.95 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.3)));
        const curve = -0.18 * R * t * t * side;
        return out.set(dx * R * 0.38 + curve, -t * len, dz * wz);
    };
    const fur = buildSurface(fn, { nu: hi ? 32 : 18, nv: hi ? 26 : 14, closedU: true, inside: (_u, v, out) => out.set(0, -((1 - Math.cos(v * Math.PI)) / 2) * len, 0), uv: furUv(R * 4, len) });
    const q = handFrame(rig, side);
    fur.applyQuaternion(q);
    const grip = new THREE.Vector3(-side * R * 0.3, -len * 0.45, 0).applyQuaternion(q);
    return { fur, grip, radius: R * 1.1 };
}

/** Stopalo-šapa (kost stopala; pod je na y = −ankleY): oblik kalupa za obuću + meki prsti */
export function pawFoot(shape: BodyShape, quality: "high" | "low", toes = 3, kind: "paw" | "webbed" = "paw"): THREE.BufferGeometry {
    const base = footFn(shape, 0);
    const { len, w } = shape.foot;
    const zc = len / 2 - shape.foot.back;
    const floorY = -shape.ankleY;
    const hi = quality === "high";
    const c = new THREE.Vector3();
    return buildSurface((u, v, out) => {
        base(u, v, out);
        const th = u * Math.PI * 2;
        const ph = v * Math.PI;
        const dx = Math.sin(th) * Math.sin(ph);
        const dy = Math.cos(ph);
        const dz = Math.cos(th) * Math.sin(ph);
        let lobes = 0;
        for (let k = 0; k < toes; k++) {
            const xk = (k - (toes - 1) / 2) * (kind === "webbed" ? 0.62 : 0.48);
            lobes += Math.exp(-(((dx - xk) / (kind === "webbed" ? 0.2 : 0.17)) ** 2));
        }
        const front = smoothstep(0.45, 0.95, dz);
        const top = smoothstep(-0.4, 0.2, dy);
        c.set(0, floorY + 0.02, zc);
        const k = (kind === "webbed" ? 0.06 : 0.045) * lobes * front * top - (kind === "webbed" ? 0.05 * front * (1 - Math.min(1, lobes)) : 0);
        out.sub(c).multiplyScalar(1 + k).add(c);
        // Mekši, okrugliji vrh (šapa, ne stopalo)
        out.x *= 1 + 0.06 * front * (kind === "webbed" ? 2 : 1);
        if (kind === "webbed") out.y = floorY + (out.y - floorY) * (1 - 0.35 * front);
        return out;
    }, { nu: hi ? 40 : 24, nv: hi ? 24 : 14, closedU: true, uv: furUv(w * 3, len) });
}

/** Kopito na nozi (jednorog): krzno do članka, sjajno kopito do poda */
export function hoofFoot(shape: BodyShape, quality: "high" | "low"): { fur: THREE.BufferGeometry; hoof: THREE.BufferGeometry } {
    const hi = quality === "high";
    const seg = hi ? 36 : 20;
    const floorY = -shape.ankleY;
    const R = Math.min(shape.foot.w / 2, shape.foot.len / 2) * 1.05;
    const zc = shape.foot.len / 2 - shape.foot.back - 0.012;
    const hoofH = shape.ankleY * 0.75;
    const fur = buildSurface((u, v, out) => {
        const a = u * Math.PI * 2;
        const y = 0.01 - v * (shape.ankleY - hoofH + 0.012);
        const r = R * (0.75 + 0.3 * v) * (1 + 0.06 * Math.cos(a));
        return out.set(Math.sin(a) * r, y, Math.cos(a) * r * 1.05 + zc * v * 0.8);
    }, { nu: seg, nv: 10, closedU: true, inside: (_u, v, out) => out.set(0, 0.01 - v * 0.03, zc * v * 0.8), uv: furUv(R * 6, 0.05) });
    const hoof = buildSurface((u, v, out) => {
        const a = u * Math.PI * 2;
        const y = floorY + hoofH * (1 - v);
        const bottom = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, v - 0.82) / 0.18, 2)));
        const r = R * (0.98 + 0.14 * v) * (0.3 + 0.7 * bottom) * (1 + 0.1 * Math.cos(a));
        return out.set(Math.sin(a) * r, Math.max(floorY + 0.001, y), Math.cos(a) * r * 1.1 + zc * 0.8);
    }, { nu: seg, nv: 14, closedU: true, inside: (_u, v, out) => out.set(0, floorY + hoofH * (1 - v), zc * 0.8) });
    return { fur, hoof };
}

/** Jastučići na tabanu (vide se samo kad lik podigne nogu) — preskaču se radi budžeta */

// ── Rep ───────────────────────────────────────────────────────────────────────

export interface TailSpec {
    /** Tačke putanje od korena (prostor tela, u odnosu na koren repa) */
    points: [number, number, number][];
    radius: (s: number) => number;
    /** Čuperci oko jezgra (čupav rep lisice) */
    clumps?: number;
    /** Kićanka na vrhu (lav) */
    tuft?: number;
    /** Pufnast rep (zeka, meda) */
    pom?: number;
    /** Rep od vlasi (jednorog): broj pramenova */
    locks?: number;
    /** Glatko (pingvin) */
    sleek?: boolean;
}

/** Težine duž repa: tail1 → tail2 → tail3, koren malo na kukovima */
export function tailWeights(rig: Rig): (s: number) => BoneWeights {
    const t1 = rig.bones.findIndex((b) => b.name === "tail1");
    const t2 = rig.bones.findIndex((b) => b.name === "tail2");
    const t3 = rig.bones.findIndex((b) => b.name === "tail3");
    return (s) => {
        const a = smoothstep(0.18, 0.42, s);
        const b = smoothstep(0.55, 0.8, s);
        const hips = 1 - smoothstep(0, 0.06, s);
        return [[B.hips, hips], [t1, (1 - a) * (1 - hips)], [t2, a * (1 - b)], [t3, b]];
    };
}

export interface TailResult {
    fur: THREE.BufferGeometry[];
    /** Pramenovi (jednorog): boje se boje bojama grive */
    locks: { geometry: THREE.BufferGeometry; color: string }[];
    path: (s: number, out: THREE.Vector3) => THREE.Vector3;
}

/** Rep u prostoru tela (SkinnedMesh na kostima repa) */
export function tailGeometry(rig: Rig, base: THREE.Vector3, spec: TailSpec, ctx: PaintContext, quality: "high" | "low", maneColors: readonly string[] = []): TailResult {
    const hi = quality === "high";
    const pts = spec.points.map(([x, y, z]) => new THREE.Vector3(x, y, z).add(base));
    const path = polyPath(pts);
    const weights = tailWeights(rig);
    const fur: THREE.BufferGeometry[] = [];
    const locks: { geometry: THREE.BufferGeometry; color: string }[] = [];
    const length = pathLength(path);
    const paintTail = (g: THREE.BufferGeometry, along: number, tOffset = 0, tScale = 1) => {
        paintGeometry(g, ctx, (i, p): PaintPoint => ({ p, region: "tail", t: tOffset + tubeT(g, i, along) * tScale, ao: (1 - smoothstep(0, 0.12, tOffset + tubeT(g, i, along) * tScale)) * 0.35 }));
    };
    if (spec.pom) {
        // Pufnasta loptica: mnogo kratkih čuperaka oko središta
        const center = path(0.5, new THREE.Vector3());
        const parts: THREE.BufferGeometry[] = [];
        const core = new THREE.SphereGeometry(spec.pom * 0.8, hi ? 24 : 14, hi ? 16 : 10);
        core.translate(center.x, center.y, center.z);
        parts.push(core);
        const n = hi ? 26 : 14;
        for (let i = 0; i < n; i++) {
            const y = 1 - (2 * (i + 0.5)) / n;
            const r = Math.sqrt(1 - y * y);
            const phi = i * 2.399963;
            const d = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
            if (d.z > 0.75) continue;
            const a = center.clone().addScaledVector(d, spec.pom * 0.45);
            const b = center.clone().addScaledVector(d, spec.pom * 1.05).add(new THREE.Vector3(0, -spec.pom * 0.1, 0));
            const g = weightedTube(polyPath([a, a.clone().lerp(b, 0.5).addScaledVector(d, spec.pom * 0.05), b]), (s) => spec.pom! * 0.42 * Math.pow(1 - s, 0.6) + 0.002, 6, 8);
            parts.push(g);
        }
        for (const g of parts) g.deleteAttribute("uv");
        const pom = merge(parts);
        const w = weights(0.5);
        const uv = new Float32Array(pom.getAttribute("position").count * 2);
        const pos = pom.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
            uv[i * 2] = (pos.getX(i) + pos.getZ(i)) / FUR_TILE;
            uv[i * 2 + 1] = pos.getY(i) / FUR_TILE;
        }
        pom.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        setWeights(pom, w);
        paintGeometry(pom, ctx, (_i, p) => ({ p, region: "tail", t: 0.95 }));
        fur.push(pom);
        return { fur, locks, path };
    }
    if (spec.locks) {
        // Rep od pramenova (jednorog): talasasti pramenovi koji se šire ka vrhu
        for (let k = 0; k < spec.locks; k++) {
            const ang = (k / spec.locks) * Math.PI * 2;
            const spread = 0.018 + 0.006 * (k % 2);
            const lockPath = (s: number, out: THREE.Vector3) => {
                path(s, out);
                const wave = Math.sin(s * 7 + k) * 0.012 * s;
                return out.add(new THREE.Vector3(Math.cos(ang) * spread * (0.4 + s * 1.6) + wave, Math.sin(ang) * spread * 0.6 * s, Math.sin(ang) * spread * (0.3 + s)));
            };
            const g = weightedTube(lockPath, (s) => spec.radius(s) * 0.55 * (1 - Math.pow(s, 3) * 0.85), hi ? 30 : 16, hi ? 10 : 6, weights, 0.75);
            locks.push({ geometry: g, color: maneColors[k % Math.max(1, maneColors.length)] ?? ctx.coat.fur });
        }
        return { fur, locks, path };
    }
    const core = weightedTube(path, spec.radius, hi ? 40 : 20, hi ? 18 : 10, weights);
    paintTail(core, length);
    fur.push(core);
    if (spec.clumps) {
        // Čuperci: jezgro okruženo zaobljenim pramenovima koji se završavaju na različitim mestima
        for (let k = 0; k < spec.clumps; k++) {
            const ang = (k / spec.clumps) * Math.PI * 2 + (k % 2) * 0.4;
            const start = 0.12 + (k % 3) * 0.05;
            const end = 0.88 + ((k * 37) % 10) / 100;
            const lift = 0.55 + 0.15 * ((k * 13) % 3);
            const tangent = new THREE.Vector3();
            const side = new THREE.Vector3();
            const up = new THREE.Vector3(0, 1, 0);
            const clumpPath = (s: number, out: THREE.Vector3) => {
                const ss = start + (end - start) * s;
                path(Math.min(1, ss), out);
                path(Math.min(1, ss + 0.01), tangent).sub(out).normalize();
                side.crossVectors(tangent, up).normalize();
                const n = new THREE.Vector3().crossVectors(side, tangent).normalize();
                const r = spec.radius(ss) * lift;
                return out.addScaledVector(side, Math.cos(ang) * r).addScaledVector(n, Math.sin(ang) * r);
            };
            const g = weightedTube(clumpPath, (s) => spec.radius(start + (end - start) * s) * 0.55 * Math.pow(Math.sin(Math.PI * Math.min(1, s * 0.85 + 0.15)), 0.5) * (1 - Math.pow(s, 4) * 0.8) + 0.0015, hi ? 28 : 14, hi ? 10 : 7, (s) => weights(start + (end - start) * s));
            paintTail(g, pathLength(clumpPath), start, end - start);
            fur.push(g);
        }
    }
    if (spec.tuft) {
        const tip = path(1, new THREE.Vector3());
        const before = path(0.94, new THREE.Vector3());
        const dir = tip.clone().sub(before).normalize();
        const parts: THREE.BufferGeometry[] = [];
        const n = hi ? 16 : 9;
        for (let i = 0; i < n; i++) {
            const y = 1 - (2 * (i + 0.5)) / n;
            const r = Math.sqrt(1 - y * y);
            const phi = i * 2.399963;
            const d = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r).addScaledVector(dir, 0.9).normalize();
            const a = tip.clone().addScaledVector(dir, -spec.tuft * 0.5);
            const b = tip.clone().addScaledVector(d, spec.tuft * 1.1);
            parts.push(weightedTube(polyPath([a, a.clone().lerp(b, 0.55).addScaledVector(d, spec.tuft * 0.15), b]), (s) => spec.tuft! * 0.36 * Math.pow(1 - s, 0.7) + 0.0015, 8, 7));
        }
        for (const g of parts) g.deleteAttribute("uv");
        const tuft = merge(parts);
        const uv = new Float32Array(tuft.getAttribute("position").count * 2);
        tuft.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        setWeights(tuft, weights(1));
        locks.push({ geometry: tuft, color: maneColors[0] ?? ctx.coat.tailTip ?? ctx.coat.fur });
    }
    return { fur, locks, path };
}

/** Iste težine za celu geometriju */
export function setWeights(g: THREE.BufferGeometry, w: BoneWeights): void {
    const n = g.getAttribute("position").count;
    const si = new Uint16Array(n * 4);
    const sw = new Float32Array(n * 4);
    const sorted = w.filter(([, x]) => x > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = sorted.reduce((s, [, x]) => s + x, 0) || 1;
    for (let i = 0; i < n; i++) {
        for (let k = 0; k < 4; k++) {
            si[i * 4 + k] = sorted[k]?.[0] ?? 0;
            sw[i * 4 + k] = sorted[k] ? sorted[k][1] / total : 0;
        }
    }
    g.setAttribute("skinIndex", new THREE.BufferAttribute(si, 4));
    g.setAttribute("skinWeight", new THREE.BufferAttribute(sw, 4));
}

// ── Čuperci (griva, perčin, kovrdže) ──────────────────────────────────────────

export interface Clump {
    base: THREE.Vector3;
    /** Smer rasta (jedinični) i dužina */
    dir: THREE.Vector3;
    len: number;
    /** Debljina u korenu */
    r: number;
    /** Uvijanje vrha (vektor savijanja) */
    curl?: THREE.Vector3;
    color: string;
    /** Spljoštenost preseka (pramen) */
    flat?: number;
}

/**
 * Čuperci kao zaobljeni, suženi pramenovi (ne „loptice”): koren širok, sredina puna, vrh
 * zaobljen; boja tamnija u korenu, svetlija pri vrhu. Spaja se u jednu geometriju sa bojama.
 */
export function clumpGeometry(clumps: readonly Clump[], quality: "high" | "low"): THREE.BufferGeometry {
    const hi = quality === "high";
    const parts: THREE.BufferGeometry[] = [];
    const c = new THREE.Color();
    const dark = new THREE.Color();
    for (const cl of clumps) {
        const end = cl.base.clone().addScaledVector(cl.dir, cl.len);
        const mid = cl.base.clone().addScaledVector(cl.dir, cl.len * 0.55);
        if (cl.curl) {
            mid.addScaledVector(cl.curl, cl.len * 0.12);
            end.addScaledVector(cl.curl, cl.len * 0.4);
        }
        const path = polyPath([cl.base, mid, end]);
        const g = weightedTube(path, (s) => cl.r * (0.75 + 0.45 * Math.sin(Math.PI * Math.min(1, s * 0.9 + 0.12))) * Math.pow(1 - s, 0.55) + cl.r * 0.06, hi ? 16 : 9, hi ? 12 : 7, undefined, cl.flat ?? 0.8);
        const n = g.getAttribute("position").count;
        const colors = new Float32Array(n * 3);
        const base = col(cl.color);
        dark.copy(base).multiplyScalar(0.72);
        const light = base.clone().lerp(new THREE.Color("#FFFFFF"), 0.16);
        const len = cl.len;
        for (let i = 0; i < n; i++) {
            const t = tubeT(g, i, len * 1.1);
            c.copy(dark).lerp(base, smoothstep(0, 0.35, t)).lerp(light, smoothstep(0.6, 1, t));
            colors.set([c.r, c.g, c.b], i * 3);
        }
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        parts.push(g);
    }
    return mergeWithColor(parts);
}

/** Spaja geometrije zadržavajući boje temena */
export function mergeWithColor(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const merged = merge(parts);
    if (parts.every((g) => g.getAttribute("color"))) {
        const total = parts.reduce((s, g) => s + g.getAttribute("color").count, 0);
        const arr = new Float32Array(total * 3);
        let at = 0;
        for (const g of parts) {
            arr.set(g.getAttribute("color").array as Float32Array, at);
            at += g.getAttribute("color").count * 3;
        }
        merged.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    }
    return merged;
}

// ── Rog ───────────────────────────────────────────────────────────────────────

/** Rog jednoroga duž +y: uvijen (dve spiralne ivice), zaobljen vrh */
export function hornGeometry(len: number, r: number, quality: "high" | "low"): THREE.BufferGeometry {
    const hi = quality === "high";
    return buildSurface((u, v, out) => {
        const a = u * Math.PI * 2;
        const t = v;
        const taper = Math.pow(1 - t, 0.95) * (1 - Math.pow(t, 18) * 0.2) + 0.03 * Math.sqrt(Math.max(0, 1 - t));
        const ridge = 1 + 0.12 * Math.pow(Math.max(0, Math.sin(2 * a - t * 26)), 2) * (1 - t * 0.6);
        const rr = r * taper * ridge;
        return out.set(Math.sin(a) * rr, len * t + (t > 0.97 ? (t - 0.97) * len * 0.3 : 0), Math.cos(a) * rr);
    }, { nu: hi ? 40 : 20, nv: hi ? 48 : 24, closedU: true, inside: (_u, v, out) => out.set(0, len * v, 0) });
}
