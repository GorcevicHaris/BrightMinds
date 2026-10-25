// Vanzemaljac (drugarski, okrugao): velika okrugla glava koja se blago sužava ka bradi, krupne
// sjajne oči, mali nosić i širok osmeh, rumeni obrazi, dva pipka sa svetlećim kuglicama (kapa
// im pravi otvor), svetlije pege po temenu i leđima, svetao stomak, glatka koža i šake sa
// tri prsta sa jastučićima na vrhovima. Bez ušiju i bez repa.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { fingerHand } from "../extra/hands";
import { antennaEars, antennaTips, asFriend, bellyMask, brimRadiusAt, cells3, coat, col, headLocal, isHead, smoothstep } from "./common";
import { FRIEND_SKINS } from "./skins.data";

/** fur = koža; light = stomak; marks = [pege]; horn = kuglice na pipcima */
function alien(skin: string, light: string, spots: string, ball: string, extra: Partial<Coat> = {}): Coat {
    return coat(skin, light, {
        muzzle: skin,
        inner: light,
        nose: shade(skin, -0.4),
        brow: shade(skin, -0.32),
        iris: ["#6A58C8", "#1C1440"],
        mouth: shade(skin, -0.62),
        marks: [spots],
        horn: ball,
        ...extra,
    });
}

export const ALIEN_COATS: Record<string, Coat> = {
    zeleni: alien("#86D46A", "#E4F8C8", "#B6EC92", "#FFE066"),
    plavi: alien("#6CC2F0", "#E2F4FF", "#A8DEFF", "#FF9AC8", { iris: ["#4A6AD8", "#141A48"] }),
    ljubicasti: alien("#B394EE", "#F2EAFF", "#D4C2FF", "#9CF0C8", { iris: ["#D06AB8", "#3A1036"] }),
    zvezdani: alien("#424A9A", "#6A72C2", "#FFF4B8", "#FFE066", { iris: ["#7AD8F8", "#123A5A"], brow: "#2A3070", mouth: "#1E2250", nose: "#2A3070", shimmer: true }),
};

function paintAlien(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const spot = col(c.marks?.[0] ?? c.light);
    const stars = !!c.shimmer;
    if (pp.region === "torso") out.lerp(col(c.light), bellyMask(ctx, p, 0.05, shape.neckBaseY + 0.02) * (stars ? 0.5 : 1));
    // Pege: okrugle, svetlije, po temenu, leđima i ramenima (ne po licu i stomaku); zvezdani: sitne zvezdice svuda
    const [d1, , id] = cells3(p.x * (stars ? 46 : 18), p.y * (stars ? 46 : 18), p.z * (stars ? 46 : 18), 23, 0.8);
    let where = 1;
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        where = stars ? smoothstep(-0.1, 0.3, q.y) + smoothstep(0.1, -0.3, q.z) : smoothstep(0.15, 0.45, q.y) * smoothstep(0.75, 0.2, q.z);
    } else if (pp.region === "torso") where = 1 - bellyMask(ctx, p, 0.2);
    else if (pp.region === "hand" || pp.region === "foot") where = 0;
    const r = stars ? 0.07 + 0.08 * id : 0.16 + 0.1 * id;
    const dot = (1 - smoothstep(r * 0.8, r, d1)) * Math.min(1, where) * (stars ? (id > 0.55 ? 1 : 0) : id > 0.35 ? 1 : 0);
    out.lerp(spot, dot * (stars ? 0.95 : 0.75));
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        // Svetlija brada i obrazi, rumeni obrazi ispod očiju
        out.lerp(col(c.light), (1 - smoothstep(-0.7, -0.45, q.y)) * smoothstep(-0.2, 0.3, q.z) * 0.55);
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.28) / 0.036) ** 2 + ((p.y - e.y + 0.082) / 0.024) ** 2))));
        out.lerp(col("#FF8FA8"), cheek * 0.38);
    }
}

export const ALIEN: AnimalSpec = {
    kind: "alien",
    skins: FRIEND_SKINS.alien,
    coats: ALIEN_COATS,
    shape: { kind: asFriend("alien"), girth: 0.98, belly: 1.1, pear: 0.22, limb: 0.9, legK: 0.88, armK: 1.02, head: { w: 0.45, h: 0.41, d: 0.39 } },
    ref: 0.45,
    head: {
        flat: 0.1,
        flatTop: 0.05,
        chin: 0.3,
        blobs: [
            // Veće teme (glava kao sijalica, malo uža brada)
            { c: [0, 0.035, -0.01], r: [0.232, 0.205, 0.2], k: 0.06 },
        ],
        bumps: [{ dir: [0, -0.35, 1], sigma: 0.2, amp: 0.006, muzzle: true }],
        eye: { u: 0.098, v: 0.5, r: 0.078, inset: 0.62, yaw: 0.22 },
        noseV: 0.6,
        mouthV: 0.68,
    },
    face: {
        eye: { upper: 0.88, lower: -0.9, lashes: 2, iris: 0.96, pupil: 0.52 },
        brow: { dv: 0.12, len: 0.06, thick: 0.009 },
        nose: { kind: "nostrils", w: 0.007, h: 0.005, d: 0.004, v: 0.6 },
        mouth: { w: 0.064, h: 0.05, curve: "smile", teeth: "none", wrap: 0.12, philtrum: 0, line: 0.0036 },
    },
    ears: antennaEars({ len: 0.17, thick: 0.02, u: 0.585, v: 0.1, back: 0.05, out: 0.36, bend: 0.025 }),
    earMotion: "twitch",
    hands: "hand",
    feet: "paw",
    belly: 0.6,
    cheeks: 0,
    sleek: true,
    customHand: (b, side) => fingerHand(b, side, { fingers: 3, len: 0.7, thick: 0.2, bulbs: true }),
    extras: (b) => antennaTips(b, { r: 0.034, color: b.coat.horn ?? "#FFE066", glow: true }),
    anchors: (a, b) => {
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintAlien,
};

registerCompanion(companionFrom(ALIEN));
