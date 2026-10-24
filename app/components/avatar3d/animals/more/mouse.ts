// Mišić: okrugla glava sa kratkom šiljatom njuškom i ružičastim nosićem, OGROMNE okrugle uši
// sa ružičastom unutrašnjošću, dugi brkovi, dva prednja zubića, svetao stomak, šake sa prstićima
// i dug tanak ružičast rep koji se uvija.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { fingerHand } from "../extra/hands";
import { asMore, bellyMask, coat, col, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function mouse(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: light, inner: "#F7A8BC", nose: "#F07A9A", brow: shade(fur, -0.3), iris: ["#5A4A5A", "#140C14"], tail: "#F4B4C4", paws: "#F6C2CE", ...extra });
}

export const MOUSE_COATS: Record<string, Coat> = {
    sivi: mouse("#A8AAB6", "#EEEEF2"),
    beli: mouse("#FAF8FA", "#FFFFFF", { brow: "#D2CCD4", iris: ["#E86A8A", "#7A1A3A"] }),
    braon: mouse("#A8805E", "#F2DCC6"),
    roze: mouse("#F6C2D6", "#FFF0F6", { iris: ["#7A4A8A", "#2A1030"] }),
    zlatni: goldCoat({ inner: "#F7A8BC", nose: "#F07A9A", tail: "#F4B4C4", paws: "#F6C2CE" }),
    dugin: mouse("#FFF8FC", "#FFFFFF", { marks: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintMouse(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    if ((c.marks ?? []).length > 2 && pp.region !== "tail" && pp.region !== "hand") out.lerp(rainbowAt(RAINBOW, p.y * 2.2 + p.x * 0.5, tmp), 0.25);
    const light = col(c.light);
    if (pp.region === "torso") out.lerp(light, bellyMask(ctx, p, 0.15));
    if (pp.region === "ear" && pp.inner) out.copy(col(c.inner));
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        out.lerp(light, (1 - smoothstep(-0.35, -0.1, q.y)) * smoothstep(-0.2, 0.3, q.z));
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.35) / 0.035) ** 2 + ((p.y - e.y + 0.07) / 0.026) ** 2))));
        out.lerp(col("#FF9CB0"), cheek * 0.35);
    }
}

export const MOUSE: AnimalSpec = {
    kind: "mouse",
    skins: MORE_SKINS.mouse,
    coats: MOUSE_COATS,
    shape: { kind: asMore("mouse"), girth: 0.96, belly: 1.08, pear: 0.3, limb: 0.92, legK: 0.88, head: { w: 0.35, h: 0.32, d: 0.33 } },
    ref: 0.46,
    head: {
        flat: 0.1,
        flatTop: 0.1,
        chin: 0.15,
        blobs: [
            { c: [0, -0.04, 0.0], r: [0.24, 0.16, 0.19], k: 0.07 },
            { c: [0, -0.07, 0.1], r: [0.075, 0.06, 0.19], k: 0.05, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.095, v: 0.46, r: 0.062, inset: 0.68, yaw: 0.2 },
        noseV: 0.57,
        mouthV: 0.67,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 2, iris: 0.98, pupil: 0.58 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "button", w: 0.022, h: 0.016, d: 0.014, lift: 0.3 },
        mouth: { w: 0.03, h: 0.05, curve: "w", teeth: "buck", wrap: 0.05, philtrum: 0.012, line: 0.0024 },
        whiskers: { count: 3, len: 0.11, v: 0.62, u: 0.05, color: "#5A4A5A" },
    },
    ears: {
        kind: "round",
        shape: { len: 0.17, width: 0.18, depth: 0.03, profile: EAR_PROFILES.round, cup: 0.65, inner: 0.72 },
        u: 0.64,
        v: 0.18,
        sink: 0.01,
        tilt: [-0.12, 0.25, 0.62],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0.04, -0.08, -0.06], [0.12, -0.16, -0.1], [0.22, -0.18, -0.06], [0.3, -0.12, -0.02], [0.32, -0.02, -0.05], [0.28, 0.04, -0.1]],
        radius: (s) => 0.013 * (1 - s * 0.6),
        motion: "sway",
        sleek: true,
    },
    hands: "hand",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
    customHand: (b, side) => fingerHand(b, side, { fingers: 4, len: 0.6, thick: 0.15, palm: b.coat.paws ?? "#F6C2CE" }),
    paint: paintMouse,
};

registerCompanion(companionFrom(MOUSE));
