// Kengur: izdužena glava sa mekom njuškom i krupnim nosom, visoke uske uši (kapa ih propušta),
// svetao stomak sa torbicom (luk i senka), širi kukovi, kraće ruke i dug debeo rep koji se
// oslanja na tlo iza lika.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asMore, bellyMask, coat, col, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function roo(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: light, inner: "#F2C2BE", nose: "#3A2A2A", brow: shade(fur, -0.3), iris: ["#A8763E", "#3A200C"], paws: shade(fur, -0.25), earTips: shade(fur, -0.25), ...extra });
}

export const KANGAROO_COATS: Record<string, Coat> = {
    ridji: roo("#D08A54", "#F8E4CC"),
    sivi: roo("#A69C9A", "#EEE8E4", { iris: ["#9A7A5A", "#2A1A0E"] }),
    svetli: roo("#E2BC8C", "#FFF4E2"),
    roze: roo("#F2A6C2", "#FFEAF2", { nose: "#B04A7A", iris: ["#B57AD6", "#4A1E6A"] }),
    zlatni: goldCoat({ paws: "#C08A1E", earTips: "#C08A1E", nose: "#6A4A1E" }),
    dugin: roo("#FFF4F8", "#FFFFFF", { marks: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"], nose: "#6A4A8A", paws: "#C7AEFF", earTips: "#C7AEFF" }),
};

const tmp = new THREE.Color();

function paintRoo(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.2 + p.x * 0.5, tmp), 0.6);
    const light = col(c.light);
    switch (pp.region) {
        case "torso": {
            out.lerp(light, bellyMask(ctx, p, 0.2));
            // Torbica: luk preko donjeg stomaka sa senkom ispod ruba
            if (p.z > 0) {
                const yRim = shape.waistY - 0.005 + Math.pow(p.x / 0.09, 2) * 0.03;
                const rim = Math.exp(-(((p.y - yRim) / 0.007) ** 2)) * (1 - smoothstep(0.07, 0.095, Math.abs(p.x)));
                const inside = smoothstep(yRim, yRim - 0.02, p.y) * (1 - smoothstep(0.06, 0.09, Math.abs(p.x))) * smoothstep(shape.crotchY + 0.01, shape.crotchY + 0.05, p.y);
                out.multiplyScalar(1 - rim * 0.32 - inside * 0.06);
            }
            return;
        }
        case "arm":
            out.lerp(col(c.paws ?? c.fur), smoothstep(0.75, 0.95, pp.t ?? 0) * 0.6);
            return;
        case "leg": {
            const side = pp.side ?? 1;
            out.lerp(light, smoothstep(0.2, -0.6, ((p.x - side * 0.09) * side) / 0.05) * 0.4);
            return;
        }
        case "tail":
            out.lerp(col(c.paws ?? c.fur), smoothstep(0.7, 0.95, pp.t ?? 0) * 0.6);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    out.lerp(light, (1 - smoothstep(-0.42, -0.2, q.y)) * smoothstep(-0.3, 0.2, q.z));
}

export const KANGAROO: AnimalSpec = {
    kind: "kangaroo",
    skins: MORE_SKINS.kangaroo,
    coats: KANGAROO_COATS,
    shape: { kind: asMore("kangaroo"), girth: 1.0, belly: 1.06, pear: 0.42, limb: 1.0, armK: 0.86, legK: 1.02, foot: { len: 0.19, w: 0.08, h: 0.066, back: 0.045 }, head: { w: 0.32, h: 0.32, d: 0.34 } },
    ref: 0.44,
    head: {
        flat: 0.08,
        flatTop: 0.12,
        chin: 0.12,
        blobs: [
            { c: [0, -0.07, 0.1], r: [0.11, 0.09, 0.21], k: 0.06, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, 0.0, 0.9], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0.75, -0.4, 0.45], sigma: 0.2, amp: 0.01, mirror: true },
        ],
        eye: { u: 0.104, v: 0.45, r: 0.06, inset: 0.68, yaw: 0.26 },
        noseV: 0.585,
        mouthV: 0.69,
    },
    face: {
        eye: { upper: 0.82, lower: -0.86, lashes: 3, iris: 0.96, pupil: 0.48 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "oval", w: 0.03, h: 0.022, d: 0.018, lift: 0.3, tilt: -0.3 },
        mouth: { w: 0.034, h: 0.055, curve: "w", teeth: "none", wrap: 0.06, philtrum: 0.014, line: 0.0024 },
    },
    ears: {
        kind: "tall",
        shape: { len: 0.17, width: 0.085, depth: 0.04, profile: EAR_PROFILES.tall, cup: 0.65, inner: 0.7, bend: 0.014 },
        u: 0.6,
        v: 0.13,
        sink: 0.012,
        tilt: [-0.12, 0.25, 0.3],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0, -0.14, -0.12], [0, -0.32, -0.26], [0, -0.48, -0.42], [0, -0.53, -0.6]],
        radius: (s) => 0.072 * Math.pow(1 - s, 0.75) + 0.016,
        motion: "none",
        height: 0.07,
    },
    hands: "paw",
    feet: "paw",
    belly: 0.62,
    cheeks: 0.2,
    earMotion: "twitch",
    paint: paintRoo,
};

registerCompanion(companionFrom(KANGAROO));
