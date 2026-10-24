// Dabar: okrugla glava sa punačkim obrazima, dva velika prednja zuba, krupan taman nos,
// sitne okrugle uši, svetlija njuška, šake sa prstima i noktićima, i širok ravan rep-lopata sa
// šarom krljušti (kratak koren na kostima repa, lopata prati vrh repa).

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { fingerHand, toeFoot } from "../extra/hands";
import { asMore, bellyMask, coat, col, finGeometry, goldCoat, headLocal, isHead, onBone, rainbowAt, RAINBOW, scales, smoothstep, tailFrame } from "./common";
import { MORE_SKINS } from "./skins.data";

function beaver(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: light, inner: shade(fur, -0.2), nose: "#2A2024", brow: shade(fur, -0.35), iris: ["#9A6A3A", "#2A180C"], tail: "#5A4A4E", hoof: "#3A3034", ...extra });
}

export const BEAVER_COATS: Record<string, Coat> = {
    braon: beaver("#9A6440", "#D8B494"),
    tamni: beaver("#6A4430", "#B48C70", { iris: ["#B88A4A", "#4A2A0C"] }),
    svetli: beaver("#C08E62", "#F0D8BE"),
    plavi: beaver("#7A9AD0", "#DCE8FF", { tail: "#4A5A7E", iris: ["#3A5A8A", "#0E1A2E"] }),
    zlatni: goldCoat({ tail: "#B07A1E", nose: "#6A4A1E", hoof: "#8A5A10" }),
    dugin: beaver("#FFF6FA", "#FFFFFF", { marks: RAINBOW, tail: "#B79CFF", iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintBeaver(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    if ((c.marks ?? []).length > 2) out.lerp(rainbowAt(RAINBOW, p.y * 2.2 + p.x * 0.5, tmp), 0.3);
    if (pp.region === "torso") out.lerp(col(c.light), bellyMask(ctx, p, 0.05) * 0.5);
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        out.lerp(col(c.light), (1 - smoothstep(-0.45, -0.2, q.y)) * smoothstep(-0.2, 0.3, q.z) * 0.6);
    }
}

/** Rep-lopata: spljošten oval sa šarom krljušti, na vrhu kratkog repa */
function addPaddle(b: AnimalBuild) {
    const k = b.k;
    const f = tailFrame(b, 1);
    const len = 0.2 * k;
    const w = 0.075 * k;
    const g = finGeometry((t) => {
        const a = t * Math.PI * 2;
        // Oval, malo uži pri korenu
        const y = (1 - Math.cos(a)) / 2;
        const side = Math.sin(a) >= 0 ? 1 : -1;
        return [side * w * Math.sqrt(Math.max(0, Math.sin(Math.PI * y))) * (0.75 + 0.25 * y), y * len];
    }, 0.012 * k, b.quality);
    // Lopata leži uz pravac repa, ravna (lice nagore)
    g.rotateX(-Math.PI / 2);
    const dir = f.tangent.clone();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    g.applyQuaternion(q);
    g.translate(f.at.x, f.at.y, f.at.z);
    const base = col(b.coat.tail ?? "#5A4A4E");
    const edge = base.clone().multiplyScalar(0.7);
    const pos = g.getAttribute("position");
    const arr = new Float32Array(pos.count * 3);
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        const [line] = scales(p, 90, 13);
        c.copy(base).lerp(edge, line * 0.7);
        arr.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    const mesh = new THREE.Mesh(g, b.fur);
    mesh.name = "rep-lopata";
    onBone(b, "tail3", mesh);
    b.part("tail", mesh);
}

export const BEAVER: AnimalSpec = {
    kind: "beaver",
    skins: MORE_SKINS.beaver,
    coats: BEAVER_COATS,
    shape: { kind: asMore("beaver"), girth: 1.12, belly: 1.15, pear: 0.3, limb: 1.04, legK: 0.85, head: { w: 0.36, h: 0.34, d: 0.34 } },
    ref: 0.46,
    head: {
        flat: 0.1,
        flatTop: 0.15,
        chin: 0.05,
        blobs: [
            { c: [0, -0.05, 0.0], r: [0.24, 0.16, 0.19], k: 0.07 },
            { c: [0.05, -0.075, 0.12], r: [0.08, 0.065, 0.09], k: 0.035, muzzle: true },
            { c: [-0.05, -0.075, 0.12], r: [0.08, 0.065, 0.09], k: 0.035, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.098, v: 0.44, r: 0.058, inset: 0.68, yaw: 0.2 },
        noseV: 0.56,
        mouthV: 0.67,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 1, iris: 0.94, pupil: 0.48 },
        brow: { dv: 0.115, len: 0.05, thick: 0.009 },
        nose: { kind: "oval", w: 0.034, h: 0.022, d: 0.02, lift: 0.3, tilt: -0.2 },
        mouth: { w: 0.04, h: 0.055, curve: "w", teeth: "buck", wrap: 0.06, philtrum: 0.012, line: 0.0026 },
        whiskers: { count: 2, len: 0.07, v: 0.62, u: 0.06, color: "#2A2024" },
    },
    ears: {
        kind: "round",
        shape: { len: 0.05, width: 0.055, depth: 0.025, profile: EAR_PROFILES.round, cup: 0.6, inner: 0.6 },
        u: 0.66,
        v: 0.22,
        sink: 0.008,
        tilt: [-0.1, 0.4, 0.8],
        inner: "fur",
    },
    tail: {
        points: [[0, 0, 0], [0, -0.04, -0.05], [0, -0.07, -0.09]],
        radius: profile([[0, 0.03], [1, 0.022]]),
        motion: "flick",
        height: 0.04,
        sleek: true,
    },
    hands: "hand",
    feet: "paw",
    belly: 0.3,
    cheeks: 0.3,
    customHand: (b, side) => fingerHand(b, side, { fingers: 4, len: 0.55, thick: 0.2, claws: b.coat.hoof ?? "#3A3034", palm: shade(b.coat.fur, -0.3) }),
    customFoot: (b, side) => toeFoot(b, side, { toes: 4, claws: b.coat.hoof ?? "#3A3034", thick: 0.15 }),
    extras: addPaddle,
    paint: paintBeaver,
};

registerCompanion(companionFrom(BEAVER));
