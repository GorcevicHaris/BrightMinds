// Lisica: šiljata njuška, široki beli obrazi, velike šiljate uši sa tamnim
// vrhovima i belim krznom unutra, čupav rep sa belim vrhom, tamne „čarape”.

import { registerCompanion } from "../contract";
import { profile } from "../engine/surface";
import { companionFrom, type AnimalSpec } from "./figure";
import { EAR_PROFILES } from "./parts";
import { ANIMAL_SKINS } from "./skins.data";

export const FOX: AnimalSpec = {
    kind: "fox",
    skins: ANIMAL_SKINS.fox,
    shape: { kind: "fox", girth: 0.95, belly: 1, head: { w: 0.338, h: 0.302, d: 0.306 } },
    ref: 0.44,
    head: {
        flat: 0.12,
        flatTop: 0.15,
        chin: 0.16,
        blobs: [
            { c: [0, -0.05, 0.0], r: [0.25, 0.14, 0.18], k: 0.06 },
            { c: [0, -0.07, 0.085], r: [0.088, 0.072, 0.232], k: 0.055, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, -0.02, 0.92], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0.86, -0.42, 0.28], sigma: 0.2, amp: 0.012, mirror: true },
        ],
        eye: { u: 0.093, v: 0.49, r: 0.06, inset: 0.68, yaw: 0.18 },
        noseV: 0.565,
        mouthV: 0.655,
    },
    face: {
        eye: { upper: 0.8, lower: -0.84, lashes: 2, iris: 0.92, pupil: 0.42, almond: 1.22 },
        brow: { dv: 0.115, len: 0.05, thick: 0.0085 },
        nose: { kind: "oval", w: 0.025, h: 0.018, d: 0.017, lift: 0.3, tilt: -0.3 },
        mouth: { w: 0.034, h: 0.06, curve: "smile", teeth: "fangs", wrap: 0.05, philtrum: 0.016, line: 0.0024 },
        whiskers: { count: 2, len: 0.08, v: 0.62, u: 0.05, color: "#3A2A2A" },
    },
    ears: {
        kind: "pointy",
        shape: { len: 0.2, width: 0.16, depth: 0.05, profile: EAR_PROFILES.pointy, bend: 0.015, cup: 0.62, inner: 0.74 },
        u: 0.62,
        v: 0.16,
        sink: 0.012,
        tilt: [-0.12, 0.2, 0.3],
        inner: "fur",
    },
    tail: {
        points: [[0, 0, 0], [0.06, -0.06, -0.08], [0.16, -0.04, -0.16], [0.25, 0.08, -0.16], [0.28, 0.24, -0.1]],
        radius: profile([[0, 0.028], [0.22, 0.058], [0.55, 0.074], [0.85, 0.06], [1, 0.014]]),
        clumps: 8,
        motion: "sway",
    },
    hands: "paw",
    feet: "paw",
    belly: 0.4,
    cheeks: 0.65,
};

registerCompanion(companionFrom(FOX));
