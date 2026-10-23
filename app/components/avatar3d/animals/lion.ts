// Lav: okrugla glava sa širokom njuškom (jastučići brkova), mala okrugla uši u grivi,
// bujna griva — debela, talasasta krznena „kapuljača” od oboda lica do potiljka (pramenovi
// su ispupčenja na njoj, tamniji kod korena, svetliji na vrhovima) — i rep sa kićankom.

import * as THREE from "three";
import { registerCompanion } from "../contract";
import { buildSurface, profile, smoothstep } from "../engine/surface";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "./figure";
import { furMaterial } from "./materials";
import { col } from "./paint";
import { EAR_PROFILES, furUv } from "./parts";
import { ANIMAL_SKINS } from "./skins.data";

/**
 * Griva kao debela krznena „kapuljača” oko lica: površina glave pomerena napolje (od oboda
 * lica do potiljka), sa talasastim pramenovima po obodu i u redovima ka potiljku. Na obodu
 * lica debljina pada na nulu, pa griva bez šava izrasta iz glave. θ = oko ose lica, β = ugao
 * od napred (β0 = obod lica, π = potiljak). Teme (θ ≈ gore) je poseban deo — sakriva se pod kapom.
 */
function maneGeometry(b: AnimalBuild, th0: number, th1: number): THREE.BufferGeometry {
    const head = b.head;
    const R = head.radii;
    const k = b.k;
    const mane = b.coat.mane ?? [b.coat.fur, b.coat.fur];
    const inner = col(mane[mane.length - 1]).clone();
    const outer = col(mane[0]).clone().lerp(new THREE.Color("#FFFFFF"), 0.1);
    const beta0 = (58 * Math.PI) / 180;
    const N = 12;
    const P = new THREE.Vector3();
    const n = new THREE.Vector3();
    const d = new THREE.Vector3();
    const thickness = (th: number, beta: number) => {
        const s = Math.sin(th);
        // Ispod brade i na potiljku pri dnu tanje (lice i kragne ostaju slobodni)
        const size = 0.35 + 0.65 * smoothstep(-0.95, 0.05, s);
        const ramp = smoothstep(beta0, beta0 + 0.42, beta);
        const back = 1 - 0.35 * smoothstep(2.2, Math.PI, beta);
        // Pramenovi: talas po obodu i redovi ka potiljku (svaki red pomeren za pola koraka)
        const row = (beta - beta0) / 0.38;
        const shift = Math.floor(row) % 2 === 0 ? 0 : Math.PI;
        // Ka potiljku pramenovi se smiruju (bez „zvezde” na temenu potiljka)
        const calm = 1 - smoothstep(1.9, 2.9, beta);
        const lobes = Math.pow(0.5 + 0.5 * Math.cos(N * th + shift), 1.5) * Math.pow(Math.sin(Math.PI * (row % 1)), 0.6) * (0.25 + 0.75 * calm);
        return 0.07 * k * size * ramp * back * (0.72 + 0.55 * lobes);
    };
    const fn = (u: number, v: number, out: THREE.Vector3) => {
        const th = th0 + (th1 - th0) * u;
        const beta = beta0 + (Math.PI - 0.02 - beta0) * v;
        d.set(Math.sin(beta) * Math.cos(th) * R.x, Math.sin(beta) * Math.sin(th) * R.y, Math.cos(beta) * R.z);
        const [hu, hv] = head.uvOf(d);
        head.point(hu, hv, P);
        head.normal(hu, hv, n);
        return out.copy(P).addScaledVector(n, thickness(th, beta) - 0.002);
    };
    const hi = b.quality === "high";
    const span = (th1 - th0) / (Math.PI * 2);
    const g = buildSurface(fn, {
        nu: Math.max(8, Math.round((hi ? 150 : 72) * span)),
        nv: hi ? 40 : 22,
        inside: () => head.center.clone(),
        uv: furUv(Math.PI * 2 * R.x * span * 1.2, Math.PI * R.z),
    });
    const pos = g.getAttribute("position");
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const nu = Math.max(8, Math.round((hi ? 150 : 72) * span));
    const nv = hi ? 40 : 22;
    for (let j = 0; j <= nv; j++) {
        for (let i = 0; i <= nu; i++) {
            const th = th0 + (th1 - th0) * (i / nu);
            const beta = beta0 + (Math.PI - 0.02 - beta0) * (j / nv);
            const t = thickness(th, beta) / (0.07 * k * 1.27);
            c.copy(inner).lerp(outer, Math.min(1, t * 1.1)).multiplyScalar(0.8 + 0.25 * Math.min(1, t * 1.2));
            colors.set([c.r, c.g, c.b], (j * (nu + 1) + i) * 3);
        }
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
}

export const LION: AnimalSpec = {
    kind: "lion",
    skins: ANIMAL_SKINS.lion,
    shape: { kind: "lion", girth: 1.08, belly: 1.06, limb: 1.05, head: { w: 0.338, h: 0.315, d: 0.31 } },
    ref: 0.44,
    head: {
        flat: 0.14,
        flatTop: 0.12,
        chin: 0.1,
        blobs: [{ c: [0, -0.045, 0.01], r: [0.235, 0.155, 0.19], k: 0.06 }],
        bumps: [
            { dir: [0.3, -0.42, 0.86], sigma: 0.21, amp: 0.02, muzzle: true, mirror: true },
            { dir: [0, -0.7, 0.71], sigma: 0.15, amp: 0.008, muzzle: true },
            { dir: [0, -0.15, 0.99], sigma: 0.12, amp: 0.01, muzzle: true },
            { dir: [0.37, -0.03, 0.93], sigma: 0.13, amp: -0.006, mirror: true },
        ],
        eye: { u: 0.088, v: 0.5, r: 0.058, inset: 0.68, yaw: 0.15 },
        noseV: 0.6,
        mouthV: 0.685,
    },
    face: {
        eye: { upper: 0.84, lower: -0.84, lashes: 0, iris: 0.92, pupil: 0.42, almond: 1.12 },
        brow: { dv: 0.12, len: 0.052, thick: 0.009 },
        nose: { kind: "button", w: 0.03, h: 0.02, d: 0.016, lift: 0.3 },
        mouth: { w: 0.034, h: 0.06, curve: "w", teeth: "fangs", wrap: 0.06, philtrum: 0.016, line: 0.0026 },
        whiskers: { count: 2, len: 0.07, v: 0.655, u: 0.075, color: "#FFF6E8" },
    },
    ears: {
        kind: "round",
        shape: { len: 0.105, width: 0.118, depth: 0.045, profile: EAR_PROFILES.round, cup: 0.7, inner: 0.66 },
        u: 0.615,
        v: 0.17,
        sink: 0.004,
        tilt: [-0.1, -0.1, 0.5],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0.04, -0.08, -0.08], [0.12, -0.12, -0.16], [0.22, -0.06, -0.2], [0.27, 0.06, -0.18]],
        radius: profile([[0, 0.022], [0.5, 0.017], [0.9, 0.015], [1, 0.01]]),
        tuft: 0.04,
        motion: "flick",
    },
    hands: "paw",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
    ruff: 0,
    extras: (b) => {
        const mane = b.coat.mane ?? [b.coat.fur, b.coat.fur];
        const material = furMaterial({ sheen: mane[0] });
        // Teme grive (između ušiju) je poseban deo: pod kapom koja pokriva kosu se ne crta
        const t0 = 0.6;
        const t1 = Math.PI - 0.6;
        const crown = new THREE.Mesh(maneGeometry(b, t0, t1), material);
        crown.name = "griva-teme";
        const rest = new THREE.Mesh(maneGeometry(b, t1, t0 + Math.PI * 2), material);
        rest.name = "griva";
        b.headGroup.add(crown, rest);
        b.part("hair", crown);
    },
};

registerCompanion(companionFrom(LION));
