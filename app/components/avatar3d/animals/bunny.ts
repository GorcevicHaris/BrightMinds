// Zeka: glava kao jaje sa punačkim obrazima, duge uši koje se blago njišu, sitan roze nos,
// dva zuba, pufnast rep i krupnija stopala.

import { registerCompanion } from "../contract";
import { companionFrom, type AnimalSpec } from "./figure";
import { EAR_PROFILES } from "./parts";
import { ANIMAL_SKINS } from "./skins.data";

export const BUNNY: AnimalSpec = {
    kind: "bunny",
    skins: ANIMAL_SKINS.bunny,
    shape: { kind: "bunny", girth: 0.97, belly: 1.04, head: { w: 0.321, h: 0.314, d: 0.299 }, foot: { len: 0.178, w: 0.084, h: 0.066, back: 0.042 } },
    ref: 0.42,
    head: {
        flat: 0.12,
        flatTop: 0.05,
        chin: 0.12,
        blobs: [{ c: [0, -0.06, 0.01], r: [0.23, 0.145, 0.185], k: 0.07 }],
        bumps: [
            { dir: [0.24, -0.4, 0.88], sigma: 0.17, amp: 0.016, muzzle: true, mirror: true },
            { dir: [0, -0.66, 0.75], sigma: 0.13, amp: 0.006, muzzle: true },
            { dir: [0.38, -0.02, 0.92], sigma: 0.13, amp: -0.006, mirror: true },
        ],
        eye: { u: 0.094, v: 0.5, r: 0.062, inset: 0.68, yaw: 0.16 },
        noseV: 0.61,
        mouthV: 0.665,
    },
    face: (coat) => ({
        eye: { upper: 0.86, lower: -0.86, lashes: 3, iris: 0.96, pupil: 0.46 },
        brow: { dv: 0.12, len: 0.044, thick: 0.007 },
        nose: { kind: "button", w: 0.017, h: 0.012, d: 0.011, lift: 0.3 },
        mouth: { w: 0.026, h: 0.05, curve: "w", teeth: "buck", wrap: 0.055, philtrum: 0.012, line: 0.0022 },
        whiskers: { count: 2, len: 0.075, v: 0.64, u: 0.06, color: coat.fur === "#F8F6FB" || coat.pattern === "dutch" ? "#C9C2D6" : "#FFFFFF" },
    }),
    ears: {
        kind: "tall",
        shape: { len: 0.3, width: 0.108, depth: 0.048, profile: (t) => EAR_PROFILES.tall(t) * (1 + 0.18 * (1 - t) * (1 - t)), bend: 0.035, cup: 0.65, inner: 0.72 },
        u: 0.565,
        v: 0.1,
        sink: 0.014,
        tilt: [-0.1, 0.12, 0.2],
        inner: "pad",
    },
    earMotion: "swing",
    tail: { points: [[0, 0, 0], [0, 0.01, -0.03], [0, 0.015, -0.05]], radius: () => 0.04, pom: 0.066, motion: "none", height: 0.05 },
    hands: "paw",
    feet: "paw",
    belly: 0.55,
    cheeks: 0.15,
};

registerCompanion(companionFrom(BUNNY));
