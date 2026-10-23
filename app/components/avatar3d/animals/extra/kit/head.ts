// Glava dodatne životinje kao jedna glatka površina bez šavova: osnovni elipsoid, glatko
// spojeni elipsoidi (njuška, obrazi, vilica, čelo) i meke izbočine/udubljenja po pravcu
// (očne duplje, jastučići brkova). Površina je „zvezdasta”: za svaki pravac iz središta glave
// postoji tačno jedna tačka, pa (u, v) radi kao kod ljudske glave (u = 0,5 napred, v = 0 teme).
// Mesto glatkog spoja delova je i nabor — tu se slika senka (AO) i menja boja njuške.
// Koordinate: kost glave (0, 0, 0 = vrh vrata), lice gleda ka +z.

import * as THREE from "three";
import type { BodyShape, HeadSurface } from "../../../contract";
import { buildSurface, type SurfaceFn } from "../../../engine/surface";
import { clamp01, smax } from "./util";

/** Oznake delova glave (boja i senka zavise od njih) */
export type HeadTag = "muzzle" | "cheek" | "jaw" | "brow" | "crest" | "beak";
export const HEAD_TAGS: readonly HeadTag[] = ["muzzle", "cheek", "jaw", "brow", "crest", "beak"];

/** Elipsoid koji se glatko spaja sa glavom; središte u odnosu na središte glave (m) */
export interface Blob {
    c: [number, number, number];
    r: [number, number, number];
    /** Širina glatkog prelaza (m) */
    k: number;
    tag?: HeadTag;
    /** Ogledalo po x (par: levo i desno) */
    mirror?: boolean;
}

/** Meka izbočina (amp > 0) ili udubljenje (amp < 0) po pravcu iz središta */
export interface Bump {
    dir: [number, number, number];
    /** Širina (rad) */
    sigma: number;
    amp: number;
    mirror?: boolean;
    tag?: HeadTag;
}

export interface HeadSpec {
    blobs?: Blob[];
    bumps?: Bump[];
    /** Ravnije lice (0–1), spljošteno teme (0–1), uža brada (0–1) */
    flat?: number;
    flatTop?: number;
    chin?: number;
    /** Oči: pomeraj od sredine (u), visina (v), poluprečnik (m), koliko su utisnute (udeo poluprečnika) */
    eye: { u: number; v: number; r: number; inset: number; yaw?: number; roll?: number };
    /** Vrh nosa: v na sredini lica (u = 0,5) */
    noseV: number;
    /** Usta: v na sredini lica i pola širine (m) */
    mouthV: number;
    mouthW: number;
}

/** Uzorak glave za bojenje: udeo svakog dela (0–1) i nabor između delova */
export interface HeadSample {
    tags: Record<HeadTag, number>;
    crease: number;
}

export interface AnimalHead extends HeadSurface {
    spec: HeadSpec;
    shape: BodyShape;
    fn: SurfaceFn;
    /** Pravac (jedinični) za (u, v) */
    direction: (u: number, v: number, out: THREE.Vector3) => THREE.Vector3;
    /** Uzorak za (u, v), bez stvaranja novih objekata (out se ponovo koristi) */
    sample: (u: number, v: number, out: HeadSample) => HeadSample;
    /** Iznad površine za `offset` po normali */
    offsetPoint: (u: number, v: number, offset: number, out?: THREE.Vector3) => THREE.Vector3;
    /** (u, v) za pravac iz središta */
    uvOf: (dir: THREE.Vector3) => [number, number];
    radii: THREE.Vector3;
}

export function newSample(): HeadSample {
    return { tags: { muzzle: 0, cheek: 0, jaw: 0, brow: 0, crest: 0, beak: 0 }, crease: 0 };
}

/** Udaljenost od središta do izlaza iz elipsoida duž pravca d (−∞ ako ga ne seče) */
function rayExit(dx: number, dy: number, dz: number, c: readonly number[], r: readonly number[]): number {
    const ox = -c[0] / r[0];
    const oy = -c[1] / r[1];
    const oz = -c[2] / r[2];
    const ex = dx / r[0];
    const ey = dy / r[1];
    const ez = dz / r[2];
    const A = ex * ex + ey * ey + ez * ez;
    const B = 2 * (ox * ex + oy * ey + oz * ez);
    const C = ox * ox + oy * oy + oz * oz - 1;
    const disc = B * B - 4 * A * C;
    if (disc < 0) return Number.NEGATIVE_INFINITY;
    const t = (-B + Math.sqrt(disc)) / (2 * A);
    return t > 0 ? t : Number.NEGATIVE_INFINITY;
}

export function animalHead(shape: BodyShape, spec: HeadSpec): AnimalHead {
    const { w, h, d, up, fwd } = shape.head;
    const center = new THREE.Vector3(0, up, fwd);
    const radii = new THREE.Vector3(w / 2, h / 2, d / 2);
    const blobs: Blob[] = [];
    for (const b of spec.blobs ?? []) {
        blobs.push(b);
        if (b.mirror) blobs.push({ ...b, c: [-b.c[0], b.c[1], b.c[2]], mirror: false });
    }
    const bumps: Bump[] = [];
    for (const b of spec.bumps ?? []) {
        const v = new THREE.Vector3(...b.dir).normalize();
        bumps.push({ ...b, dir: [v.x, v.y, v.z] });
        if (b.mirror) bumps.push({ ...b, dir: [-v.x, v.y, v.z] });
    }
    const flat = spec.flat ?? 0.1;
    const flatTop = spec.flatTop ?? 0;
    const chin = spec.chin ?? 0.08;
    const base = [radii.x, radii.y, radii.z];
    const zero = [0, 0, 0];

    const direction = (u: number, v: number, out: THREE.Vector3) => {
        const th = (u - 0.5) * Math.PI * 2;
        const ph = Math.min(Math.PI, Math.max(0, v * Math.PI));
        return out.set(Math.sin(th) * Math.sin(ph), Math.cos(ph), Math.cos(th) * Math.sin(ph));
    };

    /** Udaljenost površine od središta u pravcu (dx, dy, dz); po želji i uzorak */
    const radius = (dx: number, dy: number, dz: number, sample?: HeadSample): number => {
        let r = rayExit(dx, dy, dz, zero, base);
        if (dz > 0) r *= 1 - flat * dz * dz * dz * (1 - Math.abs(dy) * 0.5);
        if (dy > 0) r *= 1 - flatTop * dy * dy * dy * dy * 0.5;
        if (dy < 0) r *= 1 - chin * dy * dy * (0.6 + 0.4 * Math.max(0, dz));
        if (sample) {
            for (const tag of HEAD_TAGS) sample.tags[tag] = 0;
            sample.crease = 0;
        }
        for (const blob of blobs) {
            const t = rayExit(dx, dy, dz, blob.c, blob.r);
            if (t === Number.NEGATIVE_INFINITY) continue;
            const [m, hh] = smax(r, t, blob.k);
            r = m;
            if (sample) {
                if (blob.tag) {
                    // Novi deo „preuzima” površinu; ostali delovi se smanjuju srazmerno
                    for (const tag of HEAD_TAGS) sample.tags[tag] *= 1 - hh;
                    sample.tags[blob.tag] = Math.max(sample.tags[blob.tag], hh);
                }
                // Nabor: sredina prelaza (najviše kad je udeo ≈ 0,5); bez nabora gde je deo „spolja”
                sample.crease = Math.max(sample.crease * (1 - hh), 4 * hh * (1 - hh));
            }
        }
        for (const b of bumps) {
            const cos = dx * b.dir[0] + dy * b.dir[1] + dz * b.dir[2];
            const ang = Math.acos(cos > 1 ? 1 : cos < -1 ? -1 : cos);
            const gg = Math.exp(-(ang * ang) / (2 * b.sigma * b.sigma));
            r += b.amp * gg;
            if (sample && b.tag) sample.tags[b.tag] = Math.max(sample.tags[b.tag], clamp01(gg * 1.5 - 0.2));
            if (sample && b.amp < 0) sample.crease = Math.max(sample.crease, gg * Math.min(1, -b.amp / 0.012) * 0.6);
        }
        return r;
    };

    const dir = new THREE.Vector3();
    const fn: SurfaceFn = (u, v, out) => {
        direction(u, v, dir);
        const r = radius(dir.x, dir.y, dir.z);
        return out.copy(center).addScaledVector(dir, r);
    };

    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const normal = (u: number, v: number, out = new THREE.Vector3()) => {
        const e = 1e-3;
        const vv = Math.min(1 - e, Math.max(e, v));
        fn(u + e, vv, p0).sub(fn(u - e, vv, p1));
        fn(u, vv + e, p2).sub(fn(u, vv - e, p3));
        return out.crossVectors(p2, p0).normalize();
    };
    const point = (u: number, v: number, out = new THREE.Vector3()) => fn(u, v, out);
    const n = new THREE.Vector3();
    const offsetPoint = (u: number, v: number, offset: number, out = new THREE.Vector3()) => {
        fn(u, v, out);
        normal(u, v, n);
        return out.addScaledVector(n, offset);
    };
    const sdir = new THREE.Vector3();
    const sample = (u: number, v: number, out: HeadSample) => {
        direction(u, v, sdir);
        radius(sdir.x, sdir.y, sdir.z, out);
        return out;
    };
    const uvOf = (dv: THREE.Vector3): [number, number] => {
        const nd = dv.clone().normalize();
        const v = Math.acos(Math.max(-1, Math.min(1, nd.y))) / Math.PI;
        const u = Math.atan2(nd.x, nd.z) / (Math.PI * 2) + 0.5;
        return [u, v];
    };
    return { center, point, normal, spec, shape, fn, direction, sample, offsetPoint, uvOf, radii };
}

/** Geometrija glave (uv = (u, v) površine — naslikana boja se računa po njima) */
export function headGeometry(head: AnimalHead, quality: "high" | "low"): THREE.BufferGeometry {
    const hi = quality === "high";
    return buildSurface(head.fn, { nu: hi ? 104 : 60, nv: hi ? 80 : 46, closedU: true, inside: () => head.center.clone() });
}
