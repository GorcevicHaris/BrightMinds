// Majmun: okrugla glava sa svetlim licem u obliku srca (dva režnja oko očiju i njuška), uši
// sa strane u visini očiju, šake sa prstima, svetli dlanovi i stopala, dug rep koji se na
// kraju uvija u spiralu.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asKind, bellyMask, col, goldCoat, headLocal, isHead, rainbowAt, smoothstep } from "./common";
import { fingerHand } from "./hands";
import { EXTRA_SKINS } from "./skins.data";

function monkey(fur: string, face: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: face,
        muzzle: face,
        inner: shade(face, -0.12),
        nose: shade(fur, -0.45),
        brow: shade(fur, -0.25),
        iris: ["#9A6A3A", "#3A200C"],
        pattern: "none",
        mouth: shade(fur, -0.55),
        ...extra,
    };
}

export const MONKEY_COATS: Record<string, Coat> = {
    braon: monkey("#8A5A3A", "#F3D3B1"),
    svetli: monkey("#B88458", "#FAE2C6"),
    sivi: monkey("#8C8A94", "#EBDCD2", { iris: ["#8A7A6A", "#2A2018"] }),
    narandzasti: monkey("#D9772E", "#FFE2C2", { iris: ["#7A5A2A", "#2A180C"] }),
    ljubicasti: monkey("#9A72C8", "#F6E2F2", { iris: ["#7A5A9A", "#2A1A3A"] }),
    zlatni: goldCoat({ pattern: "none", light: "#FFF0CC", muzzle: "#FFF0CC", inner: "#F6D6A6", shimmer: true }),
    dugin: monkey("#F7F0FA", "#FFFFFF", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], iris: ["#C9A6F2", "#6A3FB0"], mouth: "#6A4A8A", nose: "#8A6AAA" }),
};

const tmp = new THREE.Color();

function paintMonkey(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.4, tmp), 0.75);
    const light = col(coat.light);
    switch (pp.region) {
        case "torso":
            out.lerp(light, bellyMask(ctx, p, -0.1) * 0.9);
            return;
        case "hand":
        case "foot":
            out.lerp(light, 0.85);
            return;
        case "ear":
            if (pp.inner) out.lerp(col(coat.inner), 0.9);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Lice kao srce: dva kruga oko očiju + donji deo sa njuškom
    let mask = 0;
    for (const e of ctx.eyes) {
        const d = Math.hypot((p.x - e.x) / (ctx.eyeR * 2.0), (p.y - e.y - ctx.eyeR * 0.25) / (ctx.eyeR * 2.0), (p.z - e.z) / (ctx.eyeR * 3.4));
        mask = Math.max(mask, 1 - smoothstep(0.82, 1.02, d));
    }
    const lower = (1 - smoothstep(-0.2, 0.02, q.y + Math.abs(q.x) * 0.5)) * (1 - smoothstep(0.55, 0.75, Math.abs(q.x)));
    mask = Math.max(mask, lower, smoothstep(0.1, 0.5, pp.muzzle ?? 0));
    out.lerp(light, mask * smoothstep(-0.1, 0.3, q.z));
}

export const MONKEY: AnimalSpec = {
    kind: "monkey",
    skins: EXTRA_SKINS.monkey,
    coats: MONKEY_COATS,
    shape: { kind: asKind("monkey"), girth: 0.96, belly: 1.05, limb: 0.98, arm: 0.23, head: { w: 0.44, h: 0.4, d: 0.39 } },
    head: {
        flat: 0.14,
        flatTop: 0.1,
        chin: 0.1,
        blobs: [
            // Njuška: ispupčen donji deo lica
            { c: [0, -0.08, 0.1], r: [0.12, 0.085, 0.11], k: 0.05, muzzle: true },
        ],
        bumps: [
            { dir: [0.35, 0.05, 0.94], sigma: 0.15, amp: -0.007, mirror: true },
            // Blag greben iznad očiju
            { dir: [0.3, 0.32, 0.9], sigma: 0.14, amp: 0.006, mirror: true },
        ],
        eye: { u: 0.08, v: 0.49, r: 0.05, inset: 0.48, yaw: 0.14 },
        noseV: 0.6,
        mouthV: 0.7,
    },
    face: {
        eye: { upper: 0.66, lower: -0.82, lashes: 1, iris: 0.84, pupil: 0.44 },
        brow: { dv: 0.1, len: 0.06, thick: 0.008 },
        nose: { kind: "nostrils", w: 0.006, h: 0.004, d: 0.004 },
        mouth: { w: 0.045, h: 0.05, curve: "smile", teeth: "row", wrap: 0.075, philtrum: 0.012, line: 0.0028 },
    },
    ears: {
        kind: "round",
        shape: { len: 0.085, width: 0.1, depth: 0.035, profile: EAR_PROFILES.round, cup: 0.65, inner: 0.7 },
        u: 0.74,
        v: 0.47,
        sink: 0.01,
        tilt: [0, 0.6, 1.45],
        inner: "pad",
    },
    tail: {
        // Dug rep: diže se iza leđa i završava spiralom
        points: [[0, 0, 0], [0.04, -0.03, -0.09], [0.12, 0.03, -0.16], [0.17, 0.16, -0.17], [0.18, 0.3, -0.13], [0.13, 0.37, -0.1], [0.09, 0.33, -0.1], [0.11, 0.29, -0.11]],
        radius: profile([[0, 0.022], [0.5, 0.019], [0.9, 0.017], [1, 0.012]]),
        motion: "sway",
    },
    hands: "hand",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
    customHand: (b, side) => fingerHand(b, side, { fingers: 4, len: 0.72, thick: 0.21 }),
    paint: paintMonkey,
};

registerCompanion(companionFrom(MONKEY));
