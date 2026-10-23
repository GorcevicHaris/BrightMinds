// Mačka: široki obrazi, kratka njuška sa jastučićima brkova, šiljate uši sa čupercima,
// dug rep koji se polako njiše. Oči krupne, sa kapcima i trepavicama.

import { registerCompanion } from "../contract";
import { profile } from "../engine/surface";
import { companionFrom, type AnimalSpec } from "./figure";
import { EAR_PROFILES } from "./parts";
import { ANIMAL_SKINS } from "./skins.data";

export const CAT: AnimalSpec = {
    kind: "cat",
    skins: ANIMAL_SKINS.cat,
    shape: { kind: "cat", girth: 0.95, belly: 1, head: { w: 0.46, h: 0.39, d: 0.39 } },
    head: {
        flat: 0.16,
        flatTop: 0.3,
        chin: 0.14,
        blobs: [{ c: [0, -0.045, 0.005], r: [0.25, 0.155, 0.19], k: 0.05 }],
        bumps: [
            { dir: [0.3, -0.42, 0.86], sigma: 0.2, amp: 0.017, muzzle: true, mirror: true },
            { dir: [0, -0.72, 0.69], sigma: 0.15, amp: 0.007, muzzle: true },
            { dir: [0.37, -0.03, 0.93], sigma: 0.13, amp: -0.006, mirror: true },
        ],
        eye: { u: 0.085, v: 0.515, r: 0.057, inset: 0.46, yaw: 0.14 },
        noseV: 0.628,
        mouthV: 0.69,
    },
    face: (coat) => ({
        eye: { upper: 0.6, lower: -0.8, lashes: 2, iris: 0.8, pupil: 0.4 },
        brow: { dv: 0.118, len: 0.07, thick: 0.0085 },
        nose: { kind: "button", w: 0.021, h: 0.014, d: 0.012, lift: 0.3 },
        mouth: { w: 0.03, h: 0.042, curve: "w", teeth: "fangs", wrap: 0.06, philtrum: 0.014, line: 0.0024 },
        whiskers: { count: 3, len: 0.1, v: 0.665, u: 0.072, color: coat.pattern === "tuxedo" || coat.fur === "#34303C" ? "#F4F0F6" : "#FFFFFF" },
    }),
    ears: {
        kind: "pointy",
        shape: { len: 0.15, width: 0.135, depth: 0.05, profile: EAR_PROFILES.pointy, bend: 0.01, cup: 0.6, inner: 0.68, tufts: 3 },
        u: 0.615,
        v: 0.17,
        sink: 0.012,
        tilt: [-0.18, 0.32, 0.42],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0.05, -0.035, -0.07], [0.13, 0, -0.11], [0.19, 0.11, -0.1], [0.2, 0.24, -0.06], [0.16, 0.32, -0.02]],
        radius: profile([[0, 0.03], [0.4, 0.027], [0.85, 0.024], [0.97, 0.016], [1, 0.004]]),
        motion: "sway",
    },
    hands: "paw",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
};

registerCompanion(companionFrom(CAT));
