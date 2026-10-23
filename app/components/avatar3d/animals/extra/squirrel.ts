// Veverica: riđe krzno sa belim stomakom i bradom, šiljate uši sa čupercima na vrhu, dva
// zubića, prstići sa kandžicama i veliki čupavi rep u obliku slova S koji se diže iza leđa.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asKind, bellyMask, col, goldCoat, headLocal, isHead, muzzleOf, rainbowAt, smoothstep } from "./common";
import { fingerHand } from "./hands";
import { EXTRA_SKINS } from "./skins.data";

function squirrel(fur: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: "#FFF6EC",
        muzzle: "#FFF8F0",
        inner: "#F6C2B4",
        nose: "#3A2422",
        brow: shade(fur, -0.25),
        iris: ["#5A3A2A", "#140A06"],
        pattern: "none",
        tail: shade(fur, 0.05),
        tailTip: shade(fur, 0.35),
        earTips: shade(fur, -0.2),
        ...extra,
    };
}

export const SQUIRREL_COATS: Record<string, Coat> = {
    rida: squirrel("#D9702E"),
    siva: squirrel("#9A9AA4", { light: "#FFFFFF", muzzle: "#FFFFFF" }),
    crna: squirrel("#3A3438", { light: "#5A5258", muzzle: "#6A6268", iris: ["#B08A5A", "#4A2A12"], tailTip: "#5A5258" }),
    bela: squirrel("#F8F4EE", { iris: ["#7AA6D6", "#2A4A7E"], nose: "#D9909E", tailTip: "#FFFFFF", earTips: "#E8DCD0" }),
    zlatna: goldCoat({ pattern: "gold", tail: "#F2C443", tailTip: "#FFF6D8", earTips: "#C08A1E", nose: "#6E4424" }),
    duga: squirrel("#FFF2F6", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], iris: ["#C9A6F2", "#6A3FB0"], nose: "#8A6AAA" }),
};

const tmp = new THREE.Color();

function paintSquirrel(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat, shape } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, pp.region === "tail" ? (pp.t ?? 0) : p.y * 2.4, tmp), 0.7);
    const light = col(coat.light);
    switch (pp.region) {
        case "torso":
            out.lerp(light, bellyMask(ctx, p, 0.0, shape.neckBaseY + 0.04));
            return;
        case "ear":
            if (pp.inner) out.lerp(col(coat.inner), 0.85);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    out.lerp(light, Math.max(muzzleOf(pp, 0.1, 0.5), (1 - smoothstep(-0.52, -0.34, q.y)) * smoothstep(-0.2, 0.3, q.z)));
    // Svetao kolutić oko očiju
    for (const e of ctx.eyes) {
        const d = Math.hypot((p.x - e.x) / (ctx.eyeR * 1.35), (p.y - e.y) / (ctx.eyeR * 1.35), (p.z - e.z) / (ctx.eyeR * 3));
        out.lerp(light, (1 - smoothstep(0.85, 1.05, d)) * 0.7);
    }
}

export const SQUIRREL: AnimalSpec = {
    kind: "squirrel",
    skins: EXTRA_SKINS.squirrel,
    coats: SQUIRREL_COATS,
    shape: { kind: asKind("squirrel"), girth: 0.98, belly: 1.06, limb: 0.94, legK: 0.95, head: { w: 0.37, h: 0.34, d: 0.35 } },
    ref: 0.44,
    head: {
        flat: 0.1,
        flatTop: 0.12,
        chin: 0.1,
        blobs: [
            { c: [0, -0.06, 0.02], r: [0.23, 0.13, 0.18], k: 0.06 },
            { c: [0, -0.065, 0.12], r: [0.085, 0.07, 0.12], k: 0.05, muzzle: true },
        ],
        bumps: [
            { dir: [0.38, 0.0, 0.93], sigma: 0.12, amp: -0.006, mirror: true },
            { dir: [0.25, -0.42, 0.88], sigma: 0.15, amp: 0.008, muzzle: true, mirror: true },
        ],
        eye: { u: 0.092, v: 0.47, r: 0.06, inset: 0.68, yaw: 0.18 },
        noseV: 0.59,
        mouthV: 0.67,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 2, iris: 1.0, pupil: 0.56 },
        brow: { dv: 0.115, len: 0.048, thick: 0.0075 },
        nose: { kind: "button", w: 0.02, h: 0.014, d: 0.012, lift: 0.3 },
        mouth: { w: 0.03, h: 0.05, curve: "w", teeth: "buck", wrap: 0.055, philtrum: 0.012, line: 0.0024 },
        whiskers: { count: 2, len: 0.07, v: 0.645, u: 0.068, color: "#FFFFFF" },
    },
    ears: {
        kind: "pointy",
        shape: { len: 0.12, width: 0.085, depth: 0.035, profile: EAR_PROFILES.pointy, bend: 0.012, cup: 0.6, inner: 0.66, tufts: 6 },
        u: 0.625,
        v: 0.17,
        sink: 0.012,
        tilt: [-0.12, 0.2, 0.32],
        inner: "pad",
    },
    tail: {
        // Veliki čupavi rep: diže se iza leđa u obliku slova S, vrh se povija unazad
        points: [[0, 0, 0], [0, -0.01, -0.09], [0, 0.08, -0.17], [0, 0.22, -0.18], [0, 0.36, -0.13], [0, 0.46, -0.16], [0, 0.5, -0.24]],
        radius: profile([[0, 0.035], [0.18, 0.06], [0.5, 0.075], [0.8, 0.07], [0.95, 0.05], [1, 0.02]]),
        clumps: 10,
        motion: "sway",
    },
    hands: "hand",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
    customHand: (b, side) => fingerHand(b, side, { fingers: 4, len: 0.55, thick: 0.17, claws: "#3A2A24" }),
    paint: paintSquirrel,
};

registerCompanion(companionFrom(SQUIRREL));
