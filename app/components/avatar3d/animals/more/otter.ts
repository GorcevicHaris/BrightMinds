// Vidra: vitka, glatko krzno, široka spljoštena glava sa svetlim licem i grlom, punački
// jastučići brkova sa dugim brkovima, krupan nos, sitne okrugle uši, šake sa prstićima i dug
// debeo rep koji se sužava (njiše se).

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { fingerHand, toeFoot } from "../extra/hands";
import { asMore, bellyMask, coat, col, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function otter(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: light, inner: shade(fur, -0.2), nose: "#2A2024", brow: shade(fur, -0.35), iris: ["#8A5A3A", "#24140A"], ...extra });
}

export const OTTER_COATS: Record<string, Coat> = {
    braon: otter("#8A5E3E", "#E8D2B8"),
    svetla: otter("#B88A62", "#F6E6D2"),
    siva: otter("#8A8690", "#E6E4EA", { iris: ["#6A7A9A", "#1E2A3E"] }),
    roze: otter("#E8A2BE", "#FFE6F0", { iris: ["#7A4A8A", "#2A1030"] }),
    zlatna: goldCoat({ nose: "#6A4A1E" }),
    duga: otter("#FFF6FA", "#FFFFFF", { marks: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintOtter(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    if ((c.marks ?? []).length > 2) out.lerp(rainbowAt(RAINBOW, p.y * 2.2 + p.x * 0.5, tmp), 0.25);
    const light = col(c.light);
    if (pp.region === "torso") out.lerp(light, bellyMask(ctx, p, 0.05) * smoothstep(shape.waistY, shape.chestY + 0.02, p.y));
    if (pp.region === "hand" || pp.region === "foot") out.multiplyScalar(0.82);
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        // Svetlo lice ispod očiju i grlo
        out.lerp(light, (1 - smoothstep(-0.2, 0.05, q.y + Math.abs(q.x) * 0.15)) * smoothstep(-0.25, 0.2, q.z));
    }
}

export const OTTER: AnimalSpec = {
    kind: "otter",
    skins: MORE_SKINS.otter,
    coats: OTTER_COATS,
    shape: { kind: asMore("otter"), girth: 0.96, belly: 1.02, limb: 0.95, legK: 0.9, torsoK: 1.06, head: { w: 0.36, h: 0.3, d: 0.32 } },
    ref: 0.46,
    head: {
        flat: 0.12,
        flatTop: 0.3,
        chin: 0.05,
        blobs: [
            { c: [0, -0.05, 0.0], r: [0.25, 0.14, 0.19], k: 0.07 },
            { c: [0.05, -0.075, 0.12], r: [0.085, 0.06, 0.085], k: 0.035, muzzle: true },
            { c: [-0.05, -0.075, 0.12], r: [0.085, 0.06, 0.085], k: 0.035, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.1, v: 0.45, r: 0.058, inset: 0.68, yaw: 0.2 },
        noseV: 0.56,
        mouthV: 0.69,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 2, iris: 0.96, pupil: 0.52 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "oval", w: 0.036, h: 0.024, d: 0.02, lift: 0.3, tilt: -0.2 },
        mouth: { w: 0.035, h: 0.055, curve: "w", teeth: "none", wrap: 0.06, philtrum: 0.012, line: 0.0024 },
        whiskers: { count: 3, len: 0.1, v: 0.63, u: 0.065, color: "#F4F0EA" },
    },
    ears: {
        kind: "round",
        shape: { len: 0.045, width: 0.05, depth: 0.022, profile: EAR_PROFILES.round, cup: 0.6, inner: 0.6 },
        u: 0.69,
        v: 0.3,
        sink: 0.008,
        tilt: [-0.1, 0.5, 1.0],
        inner: "fur",
    },
    tail: {
        points: [[0, 0, 0], [0.02, -0.08, -0.08], [0.08, -0.16, -0.15], [0.17, -0.2, -0.18], [0.26, -0.18, -0.16]],
        radius: (s) => 0.055 * Math.pow(1 - s, 0.8) + 0.008,
        motion: "sway",
        sleek: true,
    },
    hands: "hand",
    feet: "paw",
    belly: 0.2,
    cheeks: 0,
    sleek: true,
    customHand: (b, side) => fingerHand(b, side, { fingers: 4, len: 0.5, thick: 0.19, palm: "#4A3A3A" }),
    customFoot: (b, side) => toeFoot(b, side, { toes: 4, thick: 0.15, webbed: true }),
    paint: paintOtter,
};

registerCompanion(companionFrom(OTTER));
