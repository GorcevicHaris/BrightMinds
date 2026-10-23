// Hrčak: okrugao i punačak, krupni puni obrazi (kesice), male okrugle uši sa roze
// unutrašnjošću, ružičast nosić, dva zubića, bela njuška, grudi i stomak, ružičaste šapice sa
// prstićima i sićušan repić.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asKind, bellyMask, col, goldCoat, headLocal, isHead, muzzleOf, rainbowAt, smoothstep } from "./common";
import { fingerHand } from "./hands";
import { fbm3 } from "./kit/util";
import { EXTRA_SKINS } from "./skins.data";

function hamster(fur: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: "#FFFAF2",
        muzzle: "#FFFFFF",
        inner: "#F7B3BE",
        nose: "#F08AA0",
        brow: shade(fur, -0.25),
        iris: ["#5A3A2A", "#140A06"],
        pattern: "none",
        paws: "#F7C6CC",
        ...extra,
    };
}

export const HAMSTER_COATS: Record<string, Coat> = {
    zlatni: hamster("#E9A85A"),
    beli: hamster("#FAF6F0", { iris: ["#B04A5A", "#4A0A1A"] }),
    sivi: hamster("#A6A2A8"),
    pegavi: hamster("#FFFFFF", { marks: ["#D9924A"] }),
    roze: hamster("#F9C4D8", { iris: ["#8A5A9A", "#2A1A3A"] }),
    sjajni: goldCoat({ pattern: "gold", paws: "#F7C6CC", nose: "#F08AA0", light: "#FFF6D8", muzzle: "#FFFFFF" }),
    dugin: hamster("#FFF6FA", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], iris: ["#8A5A9A", "#2A1A3A"] }),
};

const tmp = new THREE.Color();

function paintHamster(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat, shape } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.4, tmp), 0.6);
    else if (marks.length) {
        // Pegavi: krupne zlatne mrlje
        const n = fbm3(p.x * 8, p.y * 8, p.z * 8, 3, 17);
        out.lerp(col(marks[0]), smoothstep(0.5, 0.54, n) * (isHead(pp) ? 1 - muzzleOf(pp, 0.05, 0.4) : 1));
    }
    const light = col(coat.light);
    switch (pp.region) {
        case "torso":
            out.lerp(light, bellyMask(ctx, p, 0.3, shape.neckBaseY + 0.04));
            return;
        case "hand":
        case "foot":
            out.copy(col(coat.paws ?? coat.inner));
            return;
        case "ear":
            if (pp.inner) out.lerp(col(coat.inner), 0.9);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Bela njuška i obrazi odozdo, svetla tačka iznad očiju
    out.lerp(light, Math.max(muzzleOf(pp, 0.1, 0.5), (1 - smoothstep(-0.5, -0.25, q.y)) * smoothstep(-0.4, 0.2, q.z)));
    const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.35) / 0.035) ** 2 + ((p.y - e.y + 0.05) / 0.025) ** 2))));
    out.lerp(col("#FF9AA8"), cheek * 0.3);
}

export const HAMSTER: AnimalSpec = {
    kind: "hamster",
    skins: EXTRA_SKINS.hamster,
    coats: HAMSTER_COATS,
    shape: { kind: asKind("hamster"), girth: 1.18, belly: 1.2, pear: 0.35, limb: 0.95, legK: 0.8, armK: 0.9, head: { w: 0.4, h: 0.34, d: 0.35 } },
    ref: 0.47,
    head: {
        flat: 0.12,
        flatTop: 0.15,
        chin: 0.0,
        blobs: [
            // Pune kesice u obrazima
            { c: [0.1, -0.075, 0.04], r: [0.13, 0.11, 0.13], k: 0.05 },
            { c: [-0.1, -0.075, 0.04], r: [0.13, 0.11, 0.13], k: 0.05 },
            { c: [0, -0.06, 0.12], r: [0.08, 0.06, 0.1], k: 0.04, muzzle: true },
        ],
        bumps: [{ dir: [0.36, 0.05, 0.93], sigma: 0.12, amp: -0.005, mirror: true }],
        eye: { u: 0.088, v: 0.45, r: 0.056, inset: 0.68, yaw: 0.16 },
        noseV: 0.57,
        mouthV: 0.65,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 1, iris: 1.0, pupil: 0.56 },
        brow: { dv: 0.11, len: 0.045, thick: 0.0075 },
        nose: { kind: "button", w: 0.018, h: 0.013, d: 0.011, lift: 0.3 },
        mouth: { w: 0.03, h: 0.05, curve: "w", teeth: "buck", wrap: 0.055, philtrum: 0.012, line: 0.0024 },
        whiskers: { count: 2, len: 0.07, v: 0.63, u: 0.066, color: "#FFFFFF" },
    },
    ears: {
        kind: "round",
        shape: { len: 0.07, width: 0.08, depth: 0.03, profile: EAR_PROFILES.round, cup: 0.65, inner: 0.66 },
        u: 0.64,
        v: 0.2,
        sink: 0.01,
        tilt: [-0.1, 0.25, 0.55],
        inner: "pad",
    },
    tail: { points: [[0, 0, 0], [0, 0, -0.015], [0, -0.005, -0.03]], radius: profile([[0, 0.014], [1, 0.01]]), motion: "flick", height: 0.04 },
    hands: "hand",
    feet: "paw",
    belly: 0.7,
    cheeks: 0,
    customHand: (b, side) => fingerHand(b, side, { fingers: 4, len: 0.5, thick: 0.17 }),
    paint: paintHamster,
};

registerCompanion(companionFrom(HAMSTER));
