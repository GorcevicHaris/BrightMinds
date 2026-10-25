// Pčelica (plišana): okrugla žuta glava sa svetlijim licem, krupne oči sa trepavicama, rumeni
// obrazi i osmeh, dva tamna pipka sa kuglicama (kapa im pravi otvor), meko čupavo telo sa
// širokim tamnim prugama oko stomaka, tamne ručice i nožice i dva para providnih krilaca na
// leđima koja lepršaju (prolaze kroz odeću kao rep). Bez žaoke, bez ušiju i bez repa.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import {
    antennaEars, antennaTips, asFriend, backWings, brimRadiusAt, coat, col, isHead, leafOutline, rainbowAt, RAINBOW, rotated, smoothstep, wingMaterial,
} from "./common";
import { FRIEND_SKINS } from "./skins.data";

/** fur = telo; light = lice; marks = [pruge, ručice i nožice] */
function bee(body: string, light: string, stripes: string, extra: Partial<Coat> = {}): Coat {
    return coat(body, light, {
        muzzle: light,
        inner: light,
        nose: shade(stripes, 0.1),
        brow: shade(body, -0.38),
        iris: ["#7A5030", "#22120A"],
        mouth: "#5A2A1A",
        marks: [stripes],
        ears: stripes,
        paws: stripes,
        horn: stripes,
        ...extra,
    });
}

export const BEE_COATS: Record<string, Coat> = {
    zuta: bee("#F9C93C", "#FFF2C2", "#3A2E2A"),
    medena: bee("#F2A23E", "#FFE6C2", "#4A2E1E", { brow: "#A85A14" }),
    roze: bee("#F8AACB", "#FFEFF6", "#6E3A64", { iris: ["#8A4A8A", "#2A102A"], mouth: "#6A2040" }),
    dugina: bee("#FFF4C8", "#FFFFFF", "#5A4A6A", { mane: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

function paintBee(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const stripe = col(c.marks?.[0] ?? "#3A2E2A");
    const rainbow = (c.mane ?? []).length > 2;
    if (isHead(pp)) {
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.036) ** 2 + ((p.y - e.y + 0.078) / 0.024) ** 2))));
        out.lerp(col("#FF8C8C"), cheek * 0.38);
        return;
    }
    switch (pp.region) {
        case "torso": {
            // Široke pruge od grudi do kukova (vrat i ramena ostaju u boji tela)
            const y = (p.y - shape.crotchY) / (shape.chestY - shape.crotchY);
            const band = 0.5 + 0.5 * Math.cos(y * Math.PI * 3.2 + 0.4);
            const on = smoothstep(0.42, 0.58, band) * smoothstep(-0.05, 0.05, y) * (1 - smoothstep(0.92, 1.0, y));
            if (rainbow) out.lerp(rainbowAt(c.mane!, y * 0.8, new THREE.Color()), (1 - on) * 0.75);
            out.lerp(stripe, on);
            return;
        }
        case "arm":
        case "leg":
            out.lerp(stripe, smoothstep(pp.region === "arm" ? 0.16 : 0.1, pp.region === "arm" ? 0.3 : 0.22, pp.t ?? 0));
            return;
    }
}

/** Krilce: providno, belo-plavičasto, sa tankim žilicama i belim obodom */
function wingColor(x: number, y: number, d: number, out: THREE.Color): THREE.Color {
    out.copy(col("#B8DCFF")).lerp(col("#FFFFFF"), smoothstep(0.8, 0.97, d));
    const vein = 1 - smoothstep(0.004, 0.008, Math.abs(Math.sin(Math.atan2(y, x) * 5)) * Math.hypot(x, y));
    return out.multiplyScalar(1 - vein * 0.18);
}

export const BEE: AnimalSpec = {
    kind: "bee",
    skins: FRIEND_SKINS.bee,
    coats: BEE_COATS,
    shape: { kind: asFriend("bee"), girth: 1.14, belly: 1.16, pear: 0.3, limb: 0.84, legK: 0.84, armK: 0.96, head: { w: 0.41, h: 0.37, d: 0.37 } },
    ref: 0.41,
    head: {
        flat: 0.12,
        flatTop: 0.04,
        chin: 0.06,
        eye: { u: 0.092, v: 0.47, r: 0.066, inset: 0.64, yaw: 0.2 },
        noseV: 0.58,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.86, lower: -0.88, lashes: 3, iris: 0.96, pupil: 0.52 },
        brow: { dv: 0.115, len: 0.055, thick: 0.0085 },
        nose: { kind: "none", w: 0.01, h: 0.01, d: 0.01 },
        mouth: { w: 0.052, h: 0.045, curve: "smile", teeth: "none", wrap: 0.1, philtrum: 0, line: 0.0034 },
    },
    ears: antennaEars({ len: 0.14, thick: 0.014, u: 0.58, v: 0.1, back: 0.1, out: 0.4, bend: 0.035 }),
    hands: "paw",
    feet: "paw",
    belly: 0,
    cheeks: 0,
    extras: (b) => {
        antennaTips(b, { r: 0.022, color: b.coat.horn ?? "#3A2E2A" });
        const glass = wingMaterial(0.82);
        backWings(b, [
            { outline: rotated(leafOutline(0.26, 0.085, 0.5), 0.85), at: 0.85, yaw: 0.22, thick: 0.003, color: wingColor, material: glass, flap: [4.5, 0.22] },
            { outline: rotated(leafOutline(0.18, 0.065, 0.5), 1.95), at: 0.85, yaw: 0.22, thick: 0.003, color: wingColor, material: glass },
        ]);
    },
    anchors: (a, b) => {
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintBee,
};

registerCompanion(companionFrom(BEE));
