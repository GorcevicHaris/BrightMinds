// Pramenovi kose (Bitmoji): spljošteni, zašiljeni „čuperci” koji leže preko kape kose i teku
// od temena ka liniji kose — šiške koje padaju na čelo, pramenovi začešljani u stranu, podignut
// talas napred, poneka odvojena vlas. Svi pramenovi jedne frizure su jedna geometrija (jedan
// poziv crtanja). Raspored je stalan (pseudo-slučajan iz rednog broja), isti pri svakoj izgradnji.
// Sve je u koordinatama kosti glave.

import * as THREE from "three";
import type { HeadInfo } from "./head";
import { buildSurface, merge, smoothstep, sweepFn, type SweepSpec } from "./surface";

/** Jedan pramen u koordinatama glave (u oko glave, 0,5 = napred; v od temena) */
export interface Lock {
    u0: number;
    v0: number;
    u1: number;
    v1: number;
    /** Pomeraj sredine putanje po u (kriva pramena) */
    bend?: number;
    /** Širina pri korenu (m) */
    width: number;
    /** Debljina (m) */
    thick?: number;
    /** Koliko se pramen sredinom diže iznad kape (volumen), m */
    lift?: number;
    /** Kraj se odvaja od glave (vlas koja štrči), m */
    flick?: number;
}

/** Deterministički „slučajan” broj 0–1 */
export function rand(i: number, seed: number): number {
    const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
}

/**
 * Pravi geometriju pramenova. `base(u, v)` je visina kape kose iznad kože na tom mestu
 * (van kose — 0), pa pramen leži tačno na kosi, a vrh mu pada na kožu (šiške na čelu).
 */
export function lockGeometry(head: HeadInfo, base: (u: number, v: number) => number, locks: Lock[], detail = 1): THREE.BufferGeometry | null {
    const parts: THREE.BufferGeometry[] = [];
    const n = new THREE.Vector3();
    for (const lock of locks) {
        const bend = lock.bend ?? 0;
        const thick = lock.thick ?? 0.0042;
        const lift = lock.lift ?? 0;
        const flick = lock.flick ?? 0;
        // Putanja u (u, v): kvadratna kriva preko pomerene sredine
        const uv = (t: number): [number, number] => {
            const mu = (lock.u0 + lock.u1) / 2 + bend;
            const mv = (lock.v0 + lock.v1) / 2;
            const a = (1 - t) * (1 - t);
            const b = 2 * (1 - t) * t;
            const c = t * t;
            return [a * lock.u0 + b * mu + c * lock.u1, a * lock.v0 + b * mv + c * lock.v1];
        };
        const path = (t: number, out: THREE.Vector3) => {
            const [u, v] = uv(t);
            head.point(u, v, out);
            head.normal(u, v, n);
            const h = Math.max(0, base(u, v)) + 0.0016 + lift * Math.sin(Math.PI * Math.min(1, t * 1.15)) + flick * smoothstep(0.6, 1, t) ** 2;
            return out.addScaledVector(n, h);
        };
        const spec: SweepSpec = {
            path,
            forwardAt: (t, out) => {
                const [u, v] = uv(t);
                return head.normal(u, v, out);
            },
            section: (t, a) => {
                // Koren širok i tanak (utapa se u kapu), sredina puna, vrh zašiljen
                // Širok mek čuperak sa zaobljenim (ne igličastim) vrhom
                const w = lock.width * Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.4))) * (0.8 + 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.6)));
                const d = thick * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, 0.15 + t))) * (1 - 0.6 * t * t);
                // Presek je spljošten luk: spolja zaobljen, iznutra skoro ravan (leži na kosi)
                const out = Math.cos(a);
                return [Math.sin(a) * w, out >= 0 ? out * d : out * d * 0.3];
            },
        };
        const geometry = buildSurface(sweepFn(spec), {
            nu: Math.max(6, Math.round(8 * detail)),
            nv: Math.max(8, Math.round(14 * detail)),
            closedU: true,
            inside: (_u, t, out) => {
                const [u, v] = uv(t);
                return head.point(u, v, out).sub(head.center).multiplyScalar(0.5).add(head.center);
            },
            // u oko pramena, v duž njega (anizotropni odsjaj ide duž vlasi)
            uv: (q, t) => [q * 0.5, t * 2],
        });
        parts.push(geometry);
    }
    if (parts.length === 0) return null;
    const merged = merge(parts);
    for (const g of parts) g.dispose();
    return merged;
}

/** Šiške: pramenovi od temena ka čelu, vrhovi na čelu ispod linije kose */
export function fringe(options: {
    count: number;
    /** Raspon po u oko sredine (0,5 ± span) */
    span: number;
    /** Gde pramen počinje (v) i dokle pada (v vrha, na sredini čela) */
    from: number;
    to: number;
    /** Pomeranje vrha u stranu (začešljano) */
    sweep?: number;
    width: number;
    lift?: number;
    /** Neuredno: različite dužine i smerovi */
    messy?: number;
    seed?: number;
    center?: number;
}): Lock[] {
    const locks: Lock[] = [];
    const seed = options.seed ?? 1;
    const messy = options.messy ?? 0;
    const c = options.center ?? 0.5;
    for (let i = 0; i < options.count; i++) {
        const k = options.count === 1 ? 0 : (i / (options.count - 1)) * 2 - 1;
        const r1 = rand(i, seed);
        const r2 = rand(i, seed + 1);
        const r3 = rand(i, seed + 2);
        const u1 = c + k * options.span + (options.sweep ?? 0) + (r1 - 0.5) * 0.02 * messy;
        // Bočni pramenovi su kraći (prate liniju kose ka slepoočnicama)
        const edge = Math.abs(k);
        const to = options.to - edge * edge * 0.05 - r2 * 0.03 * messy;
        locks.push({
            u0: c + k * options.span * 0.35 + (r3 - 0.5) * 0.02,
            v0: options.from + r2 * 0.03,
            u1,
            v1: to,
            bend: (options.sweep ?? 0) * 0.35 + (r3 - 0.5) * 0.03 * messy,
            width: options.width * (0.8 + 0.4 * r1),
            lift: (options.lift ?? 0) * (0.6 + 0.4 * r2),
            thick: 0.0045,
        });
    }
    return locks;
}

/** Pramenovi koji teku od temena (ili razdeljka) niz glavu, po u od u0 do u1 */
export function flow(options: {
    count: number;
    uFrom: number;
    uTo: number;
    from: number;
    to: number;
    /** Krajevi pramenova: pomeraj u ka (+) ili od (−) sredine lica */
    drift?: number;
    width: number;
    lift?: number;
    seed?: number;
    /** Pramenovi kreću iz jedne tačke (teme) ili iz linije (razdeljak) */
    root?: { u: number; v: number };
}): Lock[] {
    const locks: Lock[] = [];
    const seed = options.seed ?? 7;
    for (let i = 0; i < options.count; i++) {
        const t = options.count === 1 ? 0.5 : i / (options.count - 1);
        const u = options.uFrom + (options.uTo - options.uFrom) * t;
        const r1 = rand(i, seed);
        const r2 = rand(i, seed + 1);
        const root = options.root;
        locks.push({
            u0: root ? root.u + (u - root.u) * 0.15 : u,
            v0: (root ? root.v : options.from) + r1 * 0.02,
            u1: u + (options.drift ?? 0) * Math.sign(u - 0.5),
            v1: options.to - r2 * 0.04,
            bend: (r1 - 0.5) * 0.02,
            width: options.width * (0.85 + 0.3 * r2),
            lift: (options.lift ?? 0) * (0.5 + 0.5 * r1),
            thick: 0.004,
        });
    }
    return locks;
}

/** Nekoliko tankih vlasi koje štrče sa temena (neuredna, živa kosa) */
export function flyaways(count: number, seed: number, around = 0.5): Lock[] {
    const locks: Lock[] = [];
    for (let i = 0; i < count; i++) {
        const r1 = rand(i, seed);
        const r2 = rand(i, seed + 1);
        const u = around + (r1 - 0.5) * 0.3;
        locks.push({ u0: u, v0: 0.06 + r2 * 0.06, u1: u + (r2 - 0.5) * 0.06, v1: 0.2 + r1 * 0.08, width: 0.0045, thick: 0.0018, lift: 0.004, flick: 0.012 + r2 * 0.008 });
    }
    return locks;
}
