// Foka: okrugla glatka glava bez spoljnih ušiju, krupne sjajne oči, punački obrazi-jastučići sa
// dugim brkovima, mali taman nos, telo kao kruška (šire dole), peraja umesto šaka (šaka vrste
// „flipper”), plivaća stopala i kratak repić. Bela foka je beba sa pahuljastim krznom.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { asMore, bellyMask, brimRadiusAt, coat, col, dots, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function seal(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: shade(light, 0.05), nose: "#2A2428", brow: shade(fur, -0.3), iris: ["#5A4A3A", "#140C06"], paws: shade(fur, -0.15), ...extra });
}

export const SEAL_COATS: Record<string, Coat> = {
    siva: seal("#8E96A4", "#D8DCE4"),
    bela: seal("#F6F6F4", "#FFFFFF", { brow: "#C8C8CC", paws: "#E2E2E6" }),
    pegava: seal("#A8A49A", "#E6E2D8", { marks: ["#5A564E"] }),
    plava: seal("#7AA6E0", "#DCEBFF", { iris: ["#3A5A8A", "#0E1A2E"] }),
    roze: seal("#F2B2CC", "#FFE6F0", { iris: ["#7A4A8A", "#2A1030"] }),
    zlatna: goldCoat({ nose: "#6A4A1E", paws: "#D9A21E" }),
    duga: seal("#FFF6FA", "#FFFFFF", { marks: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintSeal(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.2 + p.x * 0.5, tmp), 0.3);
    else if (marks.length) {
        // Pegava: sitne tamne pege po leđima i glavi
        const keep = pp.region === "torso" ? 1 - bellyMask(ctx, p, 0.1) : isHead(pp) ? 1 - smoothstep(0.05, 0.3, pp.muzzle ?? 0) : 1;
        out.lerp(col(marks[0]), dots(p, 26, 0.24, 41) * keep * 0.8);
    }
    if (pp.region === "torso") out.lerp(col(c.light), bellyMask(ctx, p, 0.2) * 0.7);
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        out.lerp(col(c.light), (1 - smoothstep(-0.5, -0.25, q.y)) * smoothstep(-0.2, 0.3, q.z) * 0.6);
        // Tačkice na jastučićima brkova
        for (const s of [1, -1]) {
            const pad = Math.hypot((q.x - s * 0.22) / 0.14, (q.y + 0.22) / 0.11);
            if (pad < 1 && q.z > 0.5) out.multiplyScalar(1 - (1 - smoothstep(0.35, 0.6, Math.abs(Math.sin(q.x * 70) * Math.sin(q.y * 70)))) * 0.15 * (1 - pad));
        }
    }
}

export const SEAL: AnimalSpec = {
    kind: "seal",
    skins: MORE_SKINS.seal,
    coats: SEAL_COATS,
    shape: { kind: asMore("seal"), girth: 1.12, belly: 1.18, pear: 0.55, limb: 1.0, legK: 0.78, armK: 0.82, head: { w: 0.37, h: 0.35, d: 0.35 } },
    ref: 0.46,
    head: {
        flat: 0.12,
        flatTop: 0.1,
        chin: 0.0,
        blobs: [
            { c: [0, -0.05, 0.0], r: [0.24, 0.16, 0.2], k: 0.07 },
            // Jastučići brkova (dva režnja) i mala brada
            { c: [0.05, -0.085, 0.13], r: [0.075, 0.06, 0.08], k: 0.035, muzzle: true },
            { c: [-0.05, -0.085, 0.13], r: [0.075, 0.06, 0.08], k: 0.035, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.1, v: 0.44, r: 0.068, inset: 0.66, yaw: 0.2 },
        noseV: 0.56,
        mouthV: 0.7,
    },
    face: {
        eye: { upper: 0.88, lower: -0.88, lashes: 2, iris: 1.0, pupil: 0.6 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "button", w: 0.026, h: 0.017, d: 0.014, lift: 0.3 },
        mouth: { w: 0.032, h: 0.05, curve: "w", teeth: "none", wrap: 0.06, philtrum: 0.012, line: 0.0024 },
        whiskers: { count: 3, len: 0.1, v: 0.64, u: 0.07, color: "#F4F0EA" },
    },
    tail: {
        points: [[0, 0, 0], [0, -0.02, -0.04], [0, -0.03, -0.07]],
        radius: profile([[0, 0.022], [1, 0.012]]),
        motion: "wag",
        height: 0.04,
        sleek: true,
    },
    hands: "flipper",
    feet: "webbed",
    pawR: 0.042,
    belly: 0.6,
    cheeks: 0,
    sleek: true,
    anchors: (a, b) => {
        // Bez ušiju (kapa naleže malo iznad očiju)
        a.ears.kind = "none";
        a.head.brimY = Math.max(a.head.brimY, a.eyes.left.y + a.eyes.radius * 1.3);
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintSeal,
};

registerCompanion(companionFrom(SEAL));
