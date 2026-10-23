// Glatke proceduralne površine: sve što lik ima (telo, glava, kosa, odeća) pravi se od
// parametarskih površina P(u, v). Normale se računaju analitički (konačne razlike po samoj
// funkciji), pa šav na mestu gde se krug zatvara ne pravi vidljivu ivicu u osvetljenju.

import * as THREE from "three";

export type SurfaceFn = (u: number, v: number, out: THREE.Vector3) => THREE.Vector3;

/** Kost i njena težina za jedno teme (najviše četiri po temenu) */
export type BoneWeights = [number, number][];

export interface SurfaceOptions {
    /** Broj podela po u (oko) i po v (duž) */
    nu: number;
    nv: number;
    /** u se zatvara u krug (poslednja kolona je isto što i prva) */
    closedU?: boolean;
    /** Tačka „unutra” za proveru smera normala (podrazumevano središte svih temena) */
    inside?: (u: number, v: number, out: THREE.Vector3) => THREE.Vector3;
    /** Koordinate teksture; podrazumevano (u, v) */
    uv?: (u: number, v: number) => [number, number];
    /** Težine kostiju po temenu (za SkinnedMesh) */
    weights?: (u: number, v: number, p: THREE.Vector3) => BoneWeights;
    /** Raspodela parametra v (npr. gušće na krajevima) */
    vMap?: (t: number) => number;
    uMap?: (t: number) => number;
}

const EPS = 1e-3;
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const tmpP = new THREE.Vector3();

/** Normala u tački (u, v) iz parcijalnih izvoda; na polovima (izvod nula) uzima susednu tačku */
function normalAt(fn: SurfaceFn, u: number, v: number, out: THREE.Vector3): THREE.Vector3 {
    for (const shift of [0, 0.01, -0.01, 0.03, -0.03]) {
        const vv = Math.min(1, Math.max(0, v + shift));
        const u0 = u - EPS;
        const u1 = u + EPS;
        const v0 = Math.max(0, vv - EPS);
        const v1 = Math.min(1, vv + EPS);
        fn(u1, vv, tmpA).sub(fn(u0, vv, tmpB));
        fn(u, v1, tmpC).sub(fn(u, v0, tmpD));
        out.crossVectors(tmpA, tmpC);
        // Prag je relativan: male površine (džep, sočivo) imaju male izvode, ali ispravnu normalu
        const scale = tmpA.lengthSq() * tmpC.lengthSq();
        if (scale > 0 && out.lengthSq() > scale * 1e-6) return out.normalize();
    }
    return out.set(0, 1, 0);
}

/**
 * Pravi geometriju od površine. Trouglovi su (00, 10, 01), pa je prednja strana u smeru
 * Pu × Pv; ako ta normala gleda ka unutra (proverava se po tački `inside`), sve se okreće.
 */
export function buildSurface(fn: SurfaceFn, options: SurfaceOptions): THREE.BufferGeometry {
    const { nu, nv, closedU = false } = options;
    const cols = nu + 1;
    const rows = nv + 1;
    const positions = new Float32Array(cols * rows * 3);
    const normals = new Float32Array(cols * rows * 3);
    const uvs = new Float32Array(cols * rows * 2);
    const skinIndex = options.weights ? new Uint16Array(cols * rows * 4) : null;
    const skinWeight = options.weights ? new Float32Array(cols * rows * 4) : null;
    const n = new THREE.Vector3();
    const params: [number, number][] = [];

    for (let j = 0; j < rows; j++) {
        const tv = j / nv;
        const v = options.vMap ? options.vMap(tv) : tv;
        for (let i = 0; i < cols; i++) {
            const tu = closedU && i === nu ? 0 : i / nu;
            const u = options.uMap ? options.uMap(tu) : tu;
            const k = j * cols + i;
            params.push([u, v]);
            fn(u, v, tmpP);
            positions.set([tmpP.x, tmpP.y, tmpP.z], k * 3);
            normalAt(fn, u, v, n);
            normals.set([n.x, n.y, n.z], k * 3);
            const [tu2, tv2] = options.uv ? options.uv(closedU && i === nu ? 1 : u, v) : [closedU && i === nu ? 1 : u, v];
            uvs.set([tu2, tv2], k * 2);
            if (options.weights && skinIndex && skinWeight) writeWeights(options.weights(u, v, tmpP), skinIndex, skinWeight, k);
        }
    }

    // Smer normala: većina treba da gleda od tačke „unutra”
    let score = 0;
    const center = new THREE.Vector3();
    if (!options.inside) {
        for (let k = 0; k < cols * rows; k++) center.x += positions[k * 3], center.y += positions[k * 3 + 1], center.z += positions[k * 3 + 2];
        center.divideScalar(cols * rows);
    }
    for (let k = 0; k < cols * rows; k += 7) {
        const [u, v] = params[k];
        const c = options.inside ? options.inside(u, v, tmpA) : center;
        tmpB.set(positions[k * 3] - c.x, positions[k * 3 + 1] - c.y, positions[k * 3 + 2] - c.z);
        score += Math.sign(tmpB.x * normals[k * 3] + tmpB.y * normals[k * 3 + 1] + tmpB.z * normals[k * 3 + 2]);
    }
    const flip = score < 0;
    if (flip) for (let k = 0; k < normals.length; k++) normals[k] = -normals[k];

    const indices: number[] = [];
    for (let j = 0; j < nv; j++) {
        for (let i = 0; i < nu; i++) {
            const a = j * cols + i;
            const b = a + 1;
            const c = a + cols;
            const d = c + 1;
            if (flip) indices.push(a, c, b, b, c, d);
            else indices.push(a, b, c, b, d, c);
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    if (skinIndex && skinWeight) {
        geometry.setAttribute("skinIndex", new THREE.BufferAttribute(skinIndex, 4));
        geometry.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeight, 4));
    }
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
}

function writeWeights(list: BoneWeights, skinIndex: Uint16Array, skinWeight: Float32Array, k: number) {
    const sorted = list.filter(([, w]) => w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = sorted.reduce((sum, [, w]) => sum + w, 0) || 1;
    for (let q = 0; q < 4; q++) {
        skinIndex[k * 4 + q] = sorted[q]?.[0] ?? 0;
        skinWeight[k * 4 + q] = sorted[q] ? sorted[q][1] / total : 0;
    }
}

/** Kruta težina: sve na jednoj kosti */
export function rigid(bone: number): (u: number, v: number) => BoneWeights {
    return () => [[bone, 1]];
}

// ── Prevlačenje preseka duž putanje (udovi, trup, rukavi, nogavice) ─────────────

export interface SweepSpec {
    /** Tačka putanje za s ∈ [0, 1] */
    path: (s: number, out: THREE.Vector3) => THREE.Vector3;
    /**
     * Presek u ravni okomitoj na putanju: za ugao a (0 = napred, π/2 = spolja) vraća
     * [bočno, napred] pomeraj. Bočna osa je +x za trup; za levi ud spolja je +x, za desni −x.
     */
    section: (s: number, a: number) => [number, number];
    /** Smer „napred” od kog se gradi okvir preseka (podrazumevano +z) */
    forward?: THREE.Vector3;
    /** Smer „napred” koji zavisi od mesta na putanji (traka preko ramena) */
    forwardAt?: (s: number, out: THREE.Vector3) => THREE.Vector3;
    /** Znak bočne ose (1 = +x, −1 = −x; desni ud je ogledalo levog) */
    sideSign?: number;
}

const fwdDefault = new THREE.Vector3(0, 0, 1);
const fwdTmp = new THREE.Vector3();

/** Okvir preseka u tački s: tangenta, bočna i prednja osa */
export function sweepFrame(spec: SweepSpec, s: number, side: THREE.Vector3, fwd: THREE.Vector3, tangent: THREE.Vector3) {
    const p0 = spec.path(Math.max(0, s - 0.004), new THREE.Vector3());
    const p1 = spec.path(Math.min(1, s + 0.004), new THREE.Vector3());
    tangent.subVectors(p1, p0).normalize();
    const f = spec.forwardAt ? spec.forwardAt(s, fwdTmp) : (spec.forward ?? fwdDefault);
    fwd.copy(f).addScaledVector(tangent, -f.dot(tangent)).normalize();
    side.crossVectors(tangent, fwd).normalize();
    // Bočna osa uvek ka +x (ili −x za desnu stranu), bez obzira da li putanja ide gore ili dole
    if (side.x * (spec.sideSign ?? 1) < 0) side.negate();
}

/** Površina od preseka prevučenog duž putanje: u = ugao oko, v = s duž putanje */
export function sweepFn(spec: SweepSpec): SurfaceFn {
    const side = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    return (u, v, out) => {
        sweepFrame(spec, v, side, fwd, tangent);
        const a = u * Math.PI * 2;
        const [x, y] = spec.section(v, a);
        spec.path(v, out);
        return out.addScaledVector(side, x).addScaledVector(fwd, y);
    };
}

/** Superelipsa: presek sa poluosama w (bočno) i d (napred); e > 2 je „kockastije” */
export function superEllipse(a: number, w: number, d: number, e = 2): [number, number] {
    const s = Math.sin(a);
    const c = Math.cos(a);
    const sx = Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
    const cy = Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
    return [w * sx, d * cy];
}

// ── Pomoćne funkcije ───────────────────────────────────────────────────────────

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smoothstep = (a: number, b: number, x: number) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Glatka kriva kroz tačke (y, vrednost): Catmull-Rom po delovima, za profile poluprečnika */
export function profile(points: [number, number][]): (x: number) => number {
    const pts = [...points].sort((a, b) => a[0] - b[0]);
    return (x: number) => {
        if (x <= pts[0][0]) return pts[0][1];
        if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
        let i = 0;
        while (i < pts.length - 2 && x > pts[i + 1][0]) i++;
        const p0 = pts[Math.max(0, i - 1)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(pts.length - 1, i + 2)];
        const t = (x - p1[0]) / (p2[0] - p1[0]);
        // Monotoni Hermite (bez prebačaja), nagibi iz susednih tačaka
        const m1 = slope(p0, p1, p2);
        const m2 = slope(p1, p2, p3);
        const h = p2[0] - p1[0];
        const t2 = t * t;
        const t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * h * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * h * m2;
    };
}

function slope(a: [number, number], b: [number, number], c: [number, number]): number {
    const d1 = (b[1] - a[1]) / Math.max(1e-6, b[0] - a[0]);
    const d2 = (c[1] - b[1]) / Math.max(1e-6, c[0] - b[0]);
    if (a === b) return d2;
    if (b === c) return d1;
    if (d1 * d2 <= 0) return 0;
    return (2 * d1 * d2) / (d1 + d2);
}

/** Kriva kroz tačke u prostoru (glatka), parametar s ∈ [0, 1] */
export function polyPath(points: THREE.Vector3[]): (s: number, out: THREE.Vector3) => THREE.Vector3 {
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    return (s, out) => out.copy(curve.getPointAt(clamp01(s)));
}

/** Prsten (cev oko zatvorene petlje) — rub rukava, okovratnik, porub */
export function ringTube(loop: (t: number, out: THREE.Vector3) => THREE.Vector3, radius: number | ((t: number, a: number) => [number, number]), segments = 64, sides = 10, weights?: SurfaceOptions["weights"]): THREE.BufferGeometry {
    const p = new THREE.Vector3();
    const p0 = new THREE.Vector3();
    const p1 = new THREE.Vector3();
    const center = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const outward = new THREE.Vector3();
    const up = new THREE.Vector3();
    // Središte petlje (za smer „napolje”) i obim (za razmeru teksture)
    let perimeter = 0;
    for (let i = 0; i < 32; i++) {
        center.add(loop(i / 32, p));
        perimeter += p.distanceTo(loop((i + 1) / 32, p1));
    }
    center.divideScalar(32);
    const tubeR = typeof radius === "number" ? radius : radius(0, 0)[0];
    const fn: SurfaceFn = (u, v, out) => {
        loop(u, p);
        loop((u + 0.002) % 1, p1);
        loop((u + 0.998) % 1, p0);
        tangent.subVectors(p1, p0).normalize();
        outward.subVectors(p, center).addScaledVector(tangent, -tangent.dot(outward.subVectors(p, center))).normalize();
        up.crossVectors(tangent, outward).normalize();
        const a = v * Math.PI * 2;
        const [r1, r2] = typeof radius === "number" ? [radius, radius] : radius(u, a);
        return out.copy(p).addScaledVector(outward, Math.cos(a) * r1).addScaledVector(up, Math.sin(a) * r2);
    };
    return buildSurface(
        (u, v, out) => fn(u, v, out),
        {
            nu: segments,
            nv: sides,
            closedU: true,
            inside: (u, _v, out) => loop(u, out),
            weights,
            uv: (u, v) => [u * perimeter, v * Math.PI * 2 * tubeR],
        },
    );
}

/** Cev duž otvorene krive sa promenljivim poluprečnikom; krajevi se zaobljavaju */
export function taperedTube(path: (s: number, out: THREE.Vector3) => THREE.Vector3, radius: (s: number) => number, segments = 32, sides = 10, forward?: THREE.Vector3 | ((s: number, out: THREE.Vector3) => THREE.Vector3), flatten = 1): THREE.BufferGeometry {
    const spec: SweepSpec = {
        path,
        forward: forward instanceof THREE.Vector3 ? forward : undefined,
        forwardAt: typeof forward === "function" ? forward : undefined,
        section: (s, a) => {
            const r = radius(s);
            return [Math.sin(a) * r, Math.cos(a) * r * flatten];
        },
    };
    // Koordinate teksture u metrima (obim × dužina), da šara tkanine ima pravu veličinu
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    let length = 0;
    let rMax = 0;
    for (let i = 0; i < 24; i++) {
        length += path(i / 24, a).distanceTo(path((i + 1) / 24, b));
        rMax = Math.max(rMax, radius(i / 24));
    }
    const around = Math.PI * 2 * rMax;
    return buildSurface(sweepFn(spec), {
        nu: sides,
        nv: segments,
        closedU: true,
        inside: (_u, v, out) => path(v, out),
        uv: (u, v) => [u * around, v * length],
    });
}

/** Spaja više geometrija u jednu (isti atributi) */
export function merge(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const attrs = ["position", "normal", "uv", "color", "skinIndex", "skinWeight"].filter((name) => geometries.every((g) => g.getAttribute(name)));
    const result = new THREE.BufferGeometry();
    let offset = 0;
    const index: number[] = [];
    for (const name of attrs) {
        const first = geometries[0].getAttribute(name) as THREE.BufferAttribute;
        const total = geometries.reduce((sum, g) => sum + g.getAttribute(name).count, 0);
        const ArrayType = first.array.constructor as new (n: number) => THREE.TypedArray;
        const array = new ArrayType(total * first.itemSize);
        let at = 0;
        for (const g of geometries) {
            const a = g.getAttribute(name) as THREE.BufferAttribute;
            array.set(a.array as ArrayLike<number>, at);
            at += a.array.length;
        }
        result.setAttribute(name, new THREE.BufferAttribute(array, first.itemSize));
    }
    for (const g of geometries) {
        const gi = g.getIndex();
        const count = g.getAttribute("position").count;
        if (gi) for (let k = 0; k < gi.count; k++) index.push(gi.getX(k) + offset);
        else for (let k = 0; k < count; k++) index.push(k + offset);
        offset += count;
    }
    result.setIndex(index);
    result.computeBoundingSphere();
    return result;
}
