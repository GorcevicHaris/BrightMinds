// Glava životinje kao jedna glatka površina bez šavova: osnovni elipsoid + glatko spojeni
// elipsoidi (njuška, obrazi, brada) + meke izbočine i udubljenja (jastučići brkova, očne
// duplje, čelo). Svaki deo sadrži središte glave, pa zrak iz središta seče površinu tačno
// jednom (glava je „zvezdasta”) — parametarski oblik (u, v) radi kao kod ljudske glave.
// Prelaz između delova je mek (glatki maksimum), a mesto prelaza je i nabor: tu je senka (AO).
// Koordinate: kost glave (0, 0, 0 = vrh vrata), lice gleda ka +z.

import * as THREE from "three";
import type { BodyShape, HeadSurface } from "../contract";
import { buildSurface, clamp01, type SurfaceFn } from "../engine/surface";

/** Elipsoid koji se glatko spaja sa glavom (mora da sadrži središte glave) */
export interface Blob {
    /** Središte u odnosu na središte glave (m) */
    c: [number, number, number];
    /** Poluose (m) */
    r: [number, number, number];
    /** Širina glatkog prelaza (m) */
    k: number;
    /** Deo njuške (svetlija boja njuške) */
    muzzle?: boolean;
}

/** Meka izbočina (amp > 0) ili udubljenje (amp < 0) po pravcu iz središta */
export interface Bump {
    dir: [number, number, number];
    /** Širina (rad) */
    sigma: number;
    amp: number;
    muzzle?: boolean;
    /** Ogledalo po x (par: levo i desno) */
    mirror?: boolean;
}

export interface HeadSpec {
    blobs?: Blob[];
    bumps?: Bump[];
    /** Ravnije lice (0–1) */
    flat?: number;
    /** Spljošteno teme (0–1) */
    flatTop?: number;
    /** Uža brada (0–1) */
    chin?: number;
    /** Oči: ugao od sredine (u), visina (v), poluprečnik (m), koliko su utisnute (udeo poluprečnika) */
    eye: { u: number; v: number; r: number; inset: number; yaw?: number };
    /** Nos (v na sredini lica) i usta */
    noseV: number;
    mouthV: number;
}

export interface HeadSample {
    /** Udeo njuške (0–1): svetlija boja */
    muzzle: number;
    /** Nabor između delova (0–1): senka */
    crease: number;
}

export interface AnimalHead extends HeadSurface {
    spec: HeadSpec;
    shape: BodyShape;
    fn: SurfaceFn;
    sample: (u: number, v: number) => HeadSample;
    /** Iznad površine za `offset` po normali */
    offsetPoint: (u: number, v: number, offset: number, out?: THREE.Vector3) => THREE.Vector3;
    /** Poluose osnovnog elipsoida */
    radii: THREE.Vector3;
    /** (u, v) tačke površine najbliže pravcu iz središta */
    uvOf: (dir: THREE.Vector3) => [number, number];
}

/** Glatki maksimum (polinomski): isti kao max daleko od prelaza, mek u prelazu */
function smax(a: number, b: number, k: number): [number, number] {
    const h = clamp01(0.5 + (0.5 * (b - a)) / k);
    const m = a + (b - a) * h + k * h * (1 - h);
    return [m, h];
}

/** Udaljenost od tačke o (unutra) do površine elipsoida duž jediničnog pravca d */
function rayEllipsoid(o: THREE.Vector3, d: THREE.Vector3, c: readonly number[], r: readonly number[]): number {
    const ox = (o.x - c[0]) / r[0];
    const oy = (o.y - c[1]) / r[1];
    const oz = (o.z - c[2]) / r[2];
    const dx = d.x / r[0];
    const dy = d.y / r[1];
    const dz = d.z / r[2];
    const A = dx * dx + dy * dy + dz * dz;
    const B = 2 * (ox * dx + oy * dy + oz * dz);
    const C = ox * ox + oy * oy + oz * oz - 1;
    const disc = Math.max(0, B * B - 4 * A * C);
    return (-B + Math.sqrt(disc)) / (2 * A);
}

const ZERO = new THREE.Vector3();

export function animalHead(shape: BodyShape, spec: HeadSpec): AnimalHead {
    const { w, h, d, up, fwd } = shape.head;
    const center = new THREE.Vector3(0, up, fwd);
    const radii = new THREE.Vector3(w / 2, h / 2, d / 2);
    const base: [number, number, number] = [radii.x, radii.y, radii.z];
    const blobs = spec.blobs ?? [];
    const bumps: Bump[] = [];
    for (const b of spec.bumps ?? []) {
        const dir = new THREE.Vector3(...b.dir).normalize();
        bumps.push({ ...b, dir: [dir.x, dir.y, dir.z] });
        if (b.mirror) bumps.push({ ...b, dir: [-dir.x, dir.y, dir.z] });
    }
    const flat = spec.flat ?? 0.12;
    const flatTop = spec.flatTop ?? 0;
    const chin = spec.chin ?? 0.1;
    const dir = new THREE.Vector3();

    const direction = (u: number, v: number, out: THREE.Vector3) => {
        const th = (u - 0.5) * Math.PI * 2;
        const ph = Math.min(Math.PI, Math.max(0, v * Math.PI));
        return out.set(Math.sin(th) * Math.sin(ph), Math.cos(ph), Math.cos(th) * Math.sin(ph));
    };

    /** Udaljenost površine od središta u pravcu `dir` (+ uzorak boje) */
    const radius = (dv: THREE.Vector3, sample?: HeadSample): number => {
        // Osnovni elipsoid, ravnije lice, spljošteno teme, uža brada
        let r = rayEllipsoid(ZERO, dv, [0, 0, 0], base);
        if (dv.z > 0) r *= 1 - flat * Math.pow(dv.z, 3) * (1 - Math.abs(dv.y) * 0.5);
        if (dv.y > 0) r *= 1 - flatTop * Math.pow(dv.y, 4) * 0.5;
        if (dv.y < 0) r *= 1 - chin * Math.pow(-dv.y, 2) * (0.6 + 0.4 * Math.max(0, dv.z));
        let muzzle = 0;
        let crease = 0;
        for (const blob of blobs) {
            const t = rayEllipsoid(ZERO, dv, blob.c, blob.r);
            const [m, hh] = smax(r, t, blob.k);
            r = m;
            if (blob.muzzle) muzzle = Math.max(muzzle * (1 - hh), hh);
            crease = Math.max(crease, 4 * hh * (1 - hh) * (hh < 0.98 ? 1 : 0));
        }
        for (const b of bumps) {
            const cos = dv.x * b.dir[0] + dv.y * b.dir[1] + dv.z * b.dir[2];
            const ang = Math.acos(Math.max(-1, Math.min(1, cos)));
            const g = Math.exp(-(ang * ang) / (2 * b.sigma * b.sigma));
            r += b.amp * g;
            if (b.muzzle && b.amp > 0) muzzle = Math.max(muzzle, clamp01(g * 1.6 - 0.25));
            if (b.amp > 0) crease = Math.max(crease, Math.exp(-((ang - b.sigma * 1.4) ** 2) / (2 * (b.sigma * 0.35) ** 2)) * 0.5 * (muzzle > 0.3 ? 1 : 0.6));
        }
        if (sample) {
            sample.muzzle = clamp01(muzzle);
            sample.crease = clamp01(crease);
        }
        return r;
    };

    const fn: SurfaceFn = (u, v, out) => {
        direction(u, v, dir);
        const r = radius(dir);
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
    const sampleDir = new THREE.Vector3();
    const sample = (u: number, v: number): HeadSample => {
        const s: HeadSample = { muzzle: 0, crease: 0 };
        direction(u, v, sampleDir);
        radius(sampleDir, s);
        return s;
    };
    const uvOf = (dv: THREE.Vector3): [number, number] => {
        const nd = dv.clone().normalize();
        const v = Math.acos(Math.max(-1, Math.min(1, nd.y))) / Math.PI;
        const u = Math.atan2(nd.x, nd.z) / (Math.PI * 2) + 0.5;
        return [u, v];
    };
    return { center, point, normal, spec, shape, fn, sample, offsetPoint, radii, uvOf };
}

/** Geometrija glave; uv = (u, v) površine (boja se računa po njima, posle se menjaju u metre) */
export function headGeometry(head: AnimalHead, quality: "high" | "low"): THREE.BufferGeometry {
    const hi = quality === "high";
    return buildSurface(head.fn, { nu: hi ? 112 : 64, nv: hi ? 84 : 48, closedU: true, inside: () => head.center.clone() });
}
