// Pustinjska lisica (fenek): sitna glava sa kratkom šiljatom njuškom, OGROMNE uši sa svetlim
// krznom unutra (kapa ih propušta), krupne tamne oči sa tamnom linijom ka njušci, peščano krzno sa
// svetlim stomakom i čupav rep sa tamnim vrhom.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asMore, bellyMask, coat, col, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function fennec(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: light, inner: "#FFE6DC", nose: "#2A2228", brow: shade(fur, -0.25), iris: ["#7A5A3A", "#1E1208"], tailTip: "#3A2A24", marks: [shade(fur, -0.35)], ...extra });
}

export const FENNEC_COATS: Record<string, Coat> = {
    pescana: fennec("#EAC48E", "#FFF6E8"),
    svetla: fennec("#F6E2C2", "#FFFFFF", { tailTip: "#8A6A4A" }),
    rida: fennec("#E09A5A", "#FFF0E0"),
    roze: fennec("#F6B8CE", "#FFF0F6", { tailTip: "#C8558A", iris: ["#7A4A8A", "#2A1030"] }),
    zlatna: goldCoat({ tailTip: "#B07A1E", nose: "#3A2A24", inner: "#FFF0C8", marks: ["#C08A1E"] }),
    duga: fennec("#FFF8FC", "#FFFFFF", { marks: RAINBOW, tailTip: "#C7AEFF", iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintFennec(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.2 + p.x * 0.5, tmp), 0.25);
    const light = col(c.light);
    if (pp.region === "torso") out.lerp(light, bellyMask(ctx, p, 0.15));
    if (pp.region === "ear") {
        if (pp.inner) out.copy(light);
        else out.lerp(col(c.fur), 0.5);
    }
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        out.lerp(light, (1 - smoothstep(-0.3, -0.05, q.y - Math.abs(q.x) * 0.3)) * smoothstep(-0.3, 0.2, q.z));
        // Tamna „suza” od unutrašnjeg ugla oka ka njušci
        if (marks.length <= 2) {
            for (const e of ctx.eyes) {
                const s = Math.sign(e.x);
                const dx = p.x - (e.x - s * ctx.eyeR * 0.75);
                const dy = p.y - (e.y - ctx.eyeR * 1.0);
                const along = smoothstep(-ctx.eyeR * 0.3, ctx.eyeR * 0.6, -dy);
                const line = 1 - smoothstep(ctx.eyeR * 0.12, ctx.eyeR * 0.24, Math.abs(dx + dy * s * 0.35));
                out.lerp(col(marks[0] ?? c.fur), line * (1 - along) * smoothstep(-ctx.eyeR * 1.1, -ctx.eyeR * 0.2, dy) * 0.55 * smoothstep(0.2, 0.5, q.z));
            }
        }
    }
}

export const FENNEC: AnimalSpec = {
    kind: "fennec",
    skins: MORE_SKINS.fennec,
    coats: FENNEC_COATS,
    shape: { kind: asMore("fennec"), girth: 0.92, belly: 1.0, limb: 0.94, head: { w: 0.32, h: 0.29, d: 0.3 } },
    ref: 0.44,
    head: {
        flat: 0.12,
        flatTop: 0.15,
        chin: 0.16,
        blobs: [
            { c: [0, -0.05, 0.0], r: [0.24, 0.15, 0.18], k: 0.06 },
            { c: [0, -0.07, 0.085], r: [0.08, 0.065, 0.2], k: 0.055, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, -0.02, 0.92], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0.86, -0.42, 0.28], sigma: 0.2, amp: 0.01, mirror: true },
        ],
        eye: { u: 0.093, v: 0.49, r: 0.066, inset: 0.68, yaw: 0.18 },
        noseV: 0.57,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 2, iris: 0.98, pupil: 0.56, almond: 1.15 },
        brow: { dv: 0.115, len: 0.05, thick: 0.0085 },
        nose: { kind: "oval", w: 0.024, h: 0.017, d: 0.016, lift: 0.3, tilt: -0.3 },
        mouth: { w: 0.032, h: 0.056, curve: "smile", teeth: "fangs", wrap: 0.05, philtrum: 0.015, line: 0.0024 },
        whiskers: { count: 2, len: 0.08, v: 0.62, u: 0.05, color: "#3A2A2A" },
    },
    ears: {
        kind: "pointy",
        shape: { len: 0.3, width: 0.2, depth: 0.05, profile: EAR_PROFILES.pointy, bend: 0.02, cup: 0.7, inner: 0.76, tufts: 4 },
        u: 0.63,
        v: 0.17,
        sink: 0.012,
        tilt: [-0.12, 0.25, 0.48],
        inner: "fur",
    },
    tail: {
        points: [[0, 0, 0], [0.06, -0.06, -0.08], [0.16, -0.04, -0.16], [0.25, 0.08, -0.16], [0.28, 0.24, -0.1]],
        radius: profile([[0, 0.026], [0.22, 0.052], [0.55, 0.066], [0.85, 0.054], [1, 0.012]]),
        clumps: 8,
        motion: "sway",
    },
    hands: "paw",
    feet: "paw",
    belly: 0.45,
    cheeks: 0.55,
    paint: paintFennec,
};

registerCompanion(companionFrom(FENNEC));
