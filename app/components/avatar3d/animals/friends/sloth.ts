// Lenjivac: okrugla glava sa svetlom „maskom” oko lica i tamnim prugama oko očiju koje se
// spuštaju ka obrazima (izgleda kao da se stalno smeška), krupan tamni nos, blag osmeh,
// čupavo krzno ispod brade, svetliji stomak, duge ruke sa tri zaobljene kandžice i stopala
// sa kandžicama. Bez ušiju i sa sasvim malim repićem.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { fingerHand, toeFoot } from "../extra/hands";
import { asFriend, bellyMask, brimRadiusAt, coat, col, eyePatch, headLocal, isHead, smoothstep } from "./common";
import { FRIEND_SKINS } from "./skins.data";

/** fur = krzno; light = maska lica i stomak; marks = [pruge oko očiju] */
function sloth(fur: string, light: string, mask: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, {
        muzzle: light,
        inner: light,
        nose: "#3A2A24",
        brow: shade(fur, -0.32),
        iris: ["#6A4A2A", "#1E1208"],
        mouth: "#3A2220",
        marks: [mask],
        hoof: "#F4EAD6",
        ...extra,
    });
}

export const SLOTH_COATS: Record<string, Coat> = {
    braon: sloth("#A98C6E", "#EADCC6", "#5A4434"),
    sivi: sloth("#A8A49C", "#ECE8E0", "#4E4A46", { iris: ["#5A4A3A", "#1A120C"] }),
    svetli: sloth("#D6BE9C", "#FBF2E2", "#7A5E44"),
    roze: sloth("#E6B2C2", "#FFF0F4", "#8A4A66", { nose: "#5A2A3A", iris: ["#7A4A6A", "#24101C"] }),
};

function paintSloth(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const light = col(c.light);
    if (pp.region === "torso") out.lerp(light, bellyMask(ctx, p, 0.05, shape.neckBaseY) * 0.7);
    if (!isHead(pp)) return;
    const q = headLocal(ctx, p);
    // Svetla maska: široki oval spreda (čelo, obrazi, njuška)
    const mx = q.x / 0.86;
    const my = (q.y + 0.08) / 0.72;
    const mask = (1 - smoothstep(0.82, 1.0, Math.hypot(mx, my))) * smoothstep(0.0, 0.32, q.z);
    out.lerp(light, mask);
    // Tamne pruge oko očiju, spuštaju se napolje i naniže (osmeh)
    const stripe = eyePatch(ctx, p, { rx: 2.0, ry: 1.12, dx: 0.62, dy: -0.32, tilt: 0.42, soft: 0.16 });
    out.lerp(col(c.marks?.[0] ?? "#5A4434"), stripe * 0.95);
    // Tamnije čelo (kapa krzna) iznad maske
    out.lerp(col(shade(c.fur, -0.12)), smoothstep(0.55, 0.85, q.y) * smoothstep(0.1, 0.5, q.z) * 0.5);
}

export const SLOTH: AnimalSpec = {
    kind: "sloth",
    skins: FRIEND_SKINS.sloth,
    coats: SLOTH_COATS,
    shape: { kind: asFriend("sloth"), girth: 1.06, belly: 1.14, pear: 0.24, limb: 0.96, legK: 0.84, armK: 1.12, head: { w: 0.4, h: 0.36, d: 0.36 } },
    ref: 0.4,
    head: {
        flat: 0.2,
        flatTop: 0.08,
        chin: 0.06,
        blobs: [{ c: [0, -0.07, 0.07], r: [0.12, 0.085, 0.15], k: 0.05, muzzle: true }],
        bumps: [{ dir: [0.36, 0.06, 0.93], sigma: 0.12, amp: -0.004, mirror: true }],
        eye: { u: 0.088, v: 0.47, r: 0.054, inset: 0.66, yaw: 0.18 },
        noseV: 0.58,
        mouthV: 0.67,
    },
    face: {
        eye: { upper: 0.8, lower: -0.86, lashes: 1, iris: 0.98, pupil: 0.56 },
        brow: { dv: 0.11, len: 0.05, thick: 0.008 },
        nose: { kind: "oval", w: 0.034, h: 0.022, d: 0.016, lift: 0.2 },
        mouth: { w: 0.048, h: 0.042, curve: "smile", teeth: "none", wrap: 0.08, philtrum: 0.008, line: 0.0032 },
    },
    tail: {
        points: [[0, 0, 0], [0, -0.01, -0.03], [0, -0.025, -0.05]],
        radius: (s) => 0.028 * (1 - s * 0.5),
        motion: "none",
        pom: 0.03,
    },
    hands: "hand",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
    ruff: 1,
    customHand: (b, side) => fingerHand(b, side, { fingers: 3, len: 0.75, thick: 0.24, claws: b.coat.hoof ?? "#F4EAD6" }),
    customFoot: (b, side) => toeFoot(b, side, { toes: 3, claws: b.coat.hoof ?? "#F4EAD6", thick: 0.19 }),
    anchors: (a, b) => {
        a.ears.kind = "none";
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintSloth,
};

registerCompanion(companionFrom(SLOTH));
