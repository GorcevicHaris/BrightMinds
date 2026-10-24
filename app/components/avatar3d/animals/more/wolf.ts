// Vuk (drugarski, ne strašan): široka glava sa svetlom „maskom” (obrazi, njuška, tačke iznad
// očiju), duža njuška sa krupnim nosom, uspravne šiljate uši sa svetlim krznom unutra, gusto
// krzno oko vrata (griva-ogrlica ispod brade), tamnije sedlo na leđima i čupav rep.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asMore, bellyMask, coat, col, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep, torsoAngle } from "./common";
import { MORE_SKINS } from "./skins.data";

function wolf(fur: string, light: string, saddle: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: light, inner: shade(light, -0.05), nose: "#2A2428", brow: shade(saddle, -0.1), iris: ["#E8B84A", "#8A5410"], marks: [saddle], tailTip: saddle, ...extra });
}

export const WOLF_COATS: Record<string, Coat> = {
    sivi: wolf("#9AA0AC", "#F4F4F6", "#5E6270"),
    polarni: wolf("#F2F2F4", "#FFFFFF", "#D2D4DC", { iris: ["#8CC8F0", "#2A6AA8"], nose: "#3A3640" }),
    crni: wolf("#4A4650", "#A8A4AE", "#2A262E", { iris: ["#F2C44A", "#9A6A10"], mouth: "#16131A" }),
    smedji: wolf("#A88462", "#F2E6D6", "#6A4C36"),
    plavi: wolf("#8EA8D6", "#EEF4FF", "#4E6496", { iris: ["#BFE8FF", "#3A7AC0"], nose: "#2E3A5A" }),
    zlatni: goldCoat({ marks: ["#C08A1E"], tailTip: "#C08A1E", nose: "#6A4A1E" }),
    dugin: wolf("#F8F4FA", "#FFFFFF", "#C7AEFF", { marks: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"], nose: "#6A4A8A" }),
};

const tmp = new THREE.Color();

function paintWolf(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    const saddle = marks.length > 2 ? rainbowAt(marks, p.y * 2.2 + p.x, tmp) : tmp.copy(col(marks[0] ?? c.fur));
    const light = col(c.light);
    switch (pp.region) {
        case "torso": {
            // Tamnije sedlo preko leđa i ramena, svetle grudi i stomak
            const back = smoothstep(1.4, 2.4, Math.abs(torsoAngle(p))) * smoothstep(shape.crotchY + 0.04, shape.waistY, p.y);
            out.lerp(saddle, back * 0.75);
            out.lerp(light, bellyMask(ctx, p, 0.15));
            return;
        }
        case "arm":
        case "leg": {
            const side = pp.side ?? 1;
            const inner = smoothstep(0.3, -0.6, ((p.x - side * 0.09) * side) / 0.05);
            out.lerp(light, inner * 0.5 + smoothstep(0.75, 0.95, pp.t ?? 0) * 0.4);
            return;
        }
        case "hand":
        case "foot":
            out.lerp(light, 0.55);
            return;
        case "tail":
            out.lerp(saddle, smoothstep(0.05, 0.4, pp.t ?? 0) * 0.55 * (1 - smoothstep(0.75, 0.9, pp.t ?? 0)));
            out.lerp(saddle, smoothstep(0.86, 0.94, pp.t ?? 0) * 0.9);
            return;
        case "ear":
            if (pp.inner) out.copy(light);
            else out.lerp(saddle, smoothstep(0.5, 0.85, pp.t ?? 0) * 0.7);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Maska: svetli obrazi, njuška i brada; tačke iznad očiju; tamnije teme
    const cheeks = (1 - smoothstep(-0.38, -0.12, q.y - Math.abs(q.x) * 0.25)) * smoothstep(-0.35, 0.1, q.z);
    out.lerp(light, Math.max(cheeks, smoothstep(0.1, 0.55, pp.muzzle ?? 0)));
    for (const e of ctx.eyes) {
        const d = Math.hypot((p.x - e.x - Math.sign(e.x) * ctx.eyeR * 0.15) / (ctx.eyeR * 0.6), (p.y - e.y - ctx.eyeR * 1.7) / (ctx.eyeR * 0.4), (p.z - e.z) / (ctx.eyeR * 2.4));
        out.lerp(light, (1 - smoothstep(0.7, 1, d)) * 0.9);
    }
    const crown = smoothstep(0.2, 0.7, q.y) * (1 - smoothstep(0.35, 0.8, q.z));
    out.lerp(saddle, crown * 0.45);
}

export const WOLF: AnimalSpec = {
    kind: "wolf",
    skins: MORE_SKINS.wolf,
    coats: WOLF_COATS,
    shape: { kind: asMore("wolf"), girth: 1.0, belly: 1.0, limb: 1.04, head: { w: 0.35, h: 0.31, d: 0.32 } },
    ref: 0.44,
    head: {
        flat: 0.1,
        flatTop: 0.18,
        chin: 0.12,
        blobs: [
            // Široki obrazi sa krznom i duža njuška
            { c: [0, -0.05, 0.0], r: [0.25, 0.15, 0.19], k: 0.06 },
            { c: [0, -0.075, 0.09], r: [0.1, 0.08, 0.235], k: 0.055, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, -0.02, 0.92], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0.9, -0.38, 0.2], sigma: 0.2, amp: 0.014, mirror: true },
            { dir: [0, 0.35, 0.94], sigma: 0.18, amp: 0.006 },
        ],
        eye: { u: 0.094, v: 0.48, r: 0.058, inset: 0.68, yaw: 0.17 },
        noseV: 0.565,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.82, lower: -0.84, lashes: 1, iris: 0.9, pupil: 0.42, almond: 1.18 },
        brow: { dv: 0.115, len: 0.055, thick: 0.009 },
        nose: { kind: "oval", w: 0.03, h: 0.021, d: 0.019, lift: 0.3, tilt: -0.25 },
        mouth: { w: 0.038, h: 0.064, curve: "smile", teeth: "fangs", wrap: 0.055, philtrum: 0.017, line: 0.0025 },
    },
    ears: {
        kind: "pointy",
        shape: { len: 0.17, width: 0.13, depth: 0.05, profile: EAR_PROFILES.pointy, bend: 0.012, cup: 0.6, inner: 0.72, tufts: 3 },
        u: 0.625,
        v: 0.15,
        sink: 0.012,
        tilt: [-0.1, 0.2, 0.26],
        inner: "fur",
    },
    tail: {
        points: [[0, 0, 0], [0.05, -0.06, -0.08], [0.15, -0.07, -0.15], [0.24, 0.0, -0.17], [0.29, 0.12, -0.13]],
        radius: profile([[0, 0.028], [0.25, 0.056], [0.6, 0.07], [0.88, 0.052], [1, 0.012]]),
        clumps: 8,
        motion: "wag",
    },
    hands: "paw",
    feet: "paw",
    belly: 0.45,
    cheeks: 0.5,
    ruff: 0,
    paint: paintWolf,
};

registerCompanion(companionFrom(WOLF));
