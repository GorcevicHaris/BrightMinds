// Krtica: baršunasto tamno krzno, okrugla glava sa izduženom ružičastom njuškom i krupnim
// ružičastim nosem, krupne vesele oči (crtana krtica vidi!), bez spoljnih ušiju, velike
// ružičaste šake-lopate sa pet prstiju i belim noktima i kratak ružičast repić.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { fingerHand, toeFoot } from "../extra/hands";
import { asMore, brimRadiusAt, coat, col, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function mole(fur: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, shade(fur, 0.2), { muzzle: "#F6B2C2", inner: "#F6B2C2", nose: "#F07A9A", brow: shade(fur, 0.25), iris: ["#6A5A7A", "#1A1424"], tail: "#F6B2C2", paws: "#F6B2C2", hoof: "#FFF6EE", ...extra });
}

export const MOLE_COATS: Record<string, Coat> = {
    crna: mole("#3E3A46"),
    siva: mole("#7A7884"),
    braon: mole("#6A5244", { iris: ["#9A6A3A", "#2A180C"] }),
    ljubicasta: mole("#7A62B0", { iris: ["#FFD0E8", "#B04A8A"] }),
    zlatna: goldCoat({ muzzle: "#F6B2C2", nose: "#F07A9A", tail: "#F6B2C2", paws: "#F6B2C2", hoof: "#FFF6EE" }),
    duga: mole("#F2EEF6", { marks: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintMole(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    if ((c.marks ?? []).length > 2 && pp.region !== "hand" && pp.region !== "foot") out.lerp(rainbowAt(RAINBOW, p.y * 2.2 + p.x * 0.5, tmp), 0.3);
    if (pp.region === "arm" || pp.region === "leg") out.lerp(col(c.paws ?? c.fur), smoothstep(0.85, 0.97, pp.t ?? 0));
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        // Svetliji obrazi oko njuške
        out.lerp(col(c.light), (1 - smoothstep(-0.35, -0.1, q.y)) * smoothstep(0, 0.4, q.z) * 0.6);
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.04) ** 2 + ((p.y - e.y + 0.07) / 0.03) ** 2))));
        out.lerp(col("#FF9CB0"), cheek * 0.35);
    }
}

export const MOLE: AnimalSpec = {
    kind: "mole",
    skins: MORE_SKINS.mole,
    coats: MOLE_COATS,
    shape: { kind: asMore("mole"), girth: 1.12, belly: 1.15, pear: 0.35, limb: 1.04, legK: 0.84, armK: 0.95, head: { w: 0.35, h: 0.32, d: 0.33 } },
    ref: 0.45,
    head: {
        flat: 0.1,
        flatTop: 0.12,
        chin: 0.08,
        blobs: [
            { c: [0, -0.04, 0.0], r: [0.23, 0.16, 0.19], k: 0.07 },
            // Izdužena ružičasta njuška
            { c: [0, -0.06, 0.12], r: [0.065, 0.055, 0.2], k: 0.04, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.1, v: 0.44, r: 0.055, inset: 0.68, yaw: 0.22 },
        noseV: 0.55,
        mouthV: 0.67,
    },
    face: {
        eye: { upper: 0.8, lower: -0.86, lashes: 2, iris: 0.92, pupil: 0.52 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "oval", w: 0.04, h: 0.03, d: 0.026, lift: 0.3, tilt: -0.1 },
        mouth: { w: 0.034, h: 0.05, curve: "w", teeth: "buck", wrap: 0.05, philtrum: 0.01, line: 0.0024 },
        whiskers: { count: 2, len: 0.07, v: 0.6, u: 0.04, color: "#F4E8EE" },
    },
    tail: {
        points: [[0, 0, 0], [0, -0.01, -0.04], [0, 0.0, -0.07]],
        radius: profile([[0, 0.016], [1, 0.008]]),
        motion: "wag",
        height: 0.04,
        sleek: true,
    },
    hands: "hand",
    feet: "paw",
    pawR: 0.05,
    belly: 0,
    cheeks: 0,
    customHand: (b, side) => fingerHand(b, side, { fingers: 5, len: 0.42, thick: 0.18, claws: b.coat.hoof ?? "#FFF6EE", palm: shade(b.coat.paws ?? "#F6B2C2", -0.1) }),
    customFoot: (b, side) => toeFoot(b, side, { toes: 4, color: b.coat.paws ?? "#F6B2C2", claws: b.coat.hoof ?? "#FFF6EE", thick: 0.15 }),
    anchors: (a, b) => {
        a.ears.kind = "none";
        a.head.brimY = Math.max(a.head.brimY, a.eyes.left.y + a.eyes.radius * 1.3);
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintMole,
};

registerCompanion(companionFrom(MOLE));
