// Meda: krupna okrugla glava, okrugla svetla njuška sa ovalnim nosom, okrugle uši (koala:
// velike čupave uši i krupan nos), punački trup, mali pufnast rep.

import { registerCompanion } from "../contract";
import { companionFrom, type AnimalSpec } from "./figure";
import { EAR_PROFILES } from "./parts";
import { ANIMAL_SKINS } from "./skins.data";

export const BEAR: AnimalSpec = {
    kind: "bear",
    skins: ANIMAL_SKINS.bear,
    shape: { kind: "bear", girth: 1.14, belly: 1.14, limb: 1.1, legK: 0.95, head: { w: 0.351, h: 0.328, d: 0.32 } },
    ref: 0.45,
    head: {
        flat: 0.12,
        flatTop: 0.1,
        chin: 0.08,
        blobs: [
            { c: [0, -0.04, 0], r: [0.24, 0.165, 0.2], k: 0.07 },
            { c: [0, -0.075, 0.06], r: [0.112, 0.085, 0.19], k: 0.045, muzzle: true },
        ],
        bumps: [{ dir: [0.38, -0.02, 0.92], sigma: 0.13, amp: -0.006, mirror: true }],
        eye: { u: 0.09, v: 0.475, r: 0.054, inset: 0.68, yaw: 0.15 },
        noseV: 0.575,
        mouthV: 0.665,
    },
    face: (coat) => ({
        eye: { upper: 0.88, lower: -0.86, lashes: 0, iris: 1.0, pupil: 0.42 },
        brow: { dv: 0.11, len: 0.046, thick: 0.0085 },
        nose: coat.bigNose
            ? { kind: "oval", w: 0.036, h: 0.04, d: 0.026, lift: 0.2, v: 0.56 }
            : { kind: "oval", w: 0.032, h: 0.022, d: 0.02, lift: 0.28, tilt: -0.15 },
        mouth: { w: 0.036, h: 0.068, curve: "smile", teeth: "none", wrap: 0.065, philtrum: 0.018, line: 0.0026 },
    }),
    ears: (coat) => coat.earShape === "fluffy"
        ? { kind: "round", shape: { len: 0.13, width: 0.16, depth: 0.05, profile: EAR_PROFILES.round, cup: 0.7, inner: 0.72, tufts: 5 }, u: 0.68, v: 0.2, sink: 0.014, tilt: [0, -0.15, 0.62], inner: "fur" }
        : { kind: "round", shape: { len: 0.09, width: 0.105, depth: 0.045, profile: EAR_PROFILES.round, cup: 0.7, inner: 0.66 }, u: 0.665, v: 0.17, sink: 0.012, tilt: [0, -0.1, 0.52], inner: "pad" },
    tail: { points: [[0, 0, 0], [0, 0.005, -0.02], [0, 0.01, -0.04]], radius: () => 0.035, pom: 0.042, motion: "none", height: 0.045 },
    hands: "paw",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
};

registerCompanion(companionFrom(BEAR));
