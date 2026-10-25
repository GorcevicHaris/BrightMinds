// Bubamara: okrugla crvena (žuta, roze) glava sa tufnama na temenu i svetlim licem, krupne
// oči, rumeni obrazi i mali osmeh, dva tamna pipka sa kuglicama (kapa im pravi otvor), leđa
// kao pokrilca — tufne i tamna linija po sredini, svetao stomak i tamne ručice i nožice
// (kao kod prave bubamare). Bez ušiju i bez repa.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { antennaEars, antennaTips, asFriend, bellyMask, brimRadiusAt, coat, col, headLocal, isHead, smoothstep } from "./common";
import { FRIEND_SKINS } from "./skins.data";

/** fur = pokrilca i glava; light = lice i stomak; marks = [tufne, ručice i nožice] */
function ladybug(shell: string, light: string, dots: string, limbs: string, extra: Partial<Coat> = {}): Coat {
    return coat(shell, light, {
        muzzle: light,
        inner: light,
        nose: shade(shell, -0.5),
        brow: shade(limbs, 0.1),
        iris: ["#7A5040", "#22120C"],
        mouth: "#5A1E24",
        marks: [dots, limbs],
        ears: limbs,
        paws: limbs,
        horn: limbs,
        ...extra,
    });
}

export const LADYBUG_COATS: Record<string, Coat> = {
    crvena: ladybug("#E8473F", "#FFF1E2", "#2E2A33", "#3A3542"),
    zuta: ladybug("#F6C437", "#FFF7DC", "#2E2A33", "#3A3542", { mouth: "#6A3A14" }),
    roze: ladybug("#F58DB6", "#FFF0F6", "#7A3060", "#6A3A62", { iris: ["#8A4A8A", "#2A102A"], mouth: "#6A2040" }),
    zlatna: ladybug("#ECC04C", "#FFF6D6", "#5A3A1A", "#5A4230", { shimmer: true, mouth: "#6A3A14" }),
};

/** Tufne na pokrilcima: stalna mesta (levo i desno isto), kao prava bubamara */
const BACK_DOTS: [number, number, number][] = [
    // x (napolje), visina (udeo od struka do ramena), poluprečnik
    [0.05, 0.72, 0.034], [0.09, 0.28, 0.036], [0.045, -0.12, 0.034], [0.095, -0.45, 0.03],
];
const FRONT_DOTS: [number, number, number][] = [[0.0, 0.6, 0.034], [0.078, 0.18, 0.034], [0.0, -0.3, 0.032]];
const HEAD_DOTS: [number, number, number, number][] = [
    // u, v (pravac na glavi: x napolje, y gore, z napred), poluprečnik (lokalno)
    [0, 0.98, 0.1, 0.17], [0.5, 0.8, -0.2, 0.15], [-0.5, 0.8, -0.2, 0.15], [0.68, 0.3, -0.62, 0.15], [-0.68, 0.3, -0.62, 0.15], [0, 0.6, -0.8, 0.16], [0.8, 0.25, 0.2, 0.11], [-0.8, 0.25, 0.2, 0.11],
];

function paintLadybug(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const [dotHex, limbHex] = c.marks ?? ["#2E2A33", "#3A3542"];
    const dot = col(dotHex);
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        // Tufne na temenu i potiljku (lice ostaje čisto)
        const n = q.clone().normalize();
        let d = 0;
        for (const [x, y, z, r] of HEAD_DOTS) d = Math.max(d, 1 - smoothstep(r * 0.86, r, n.distanceTo(new THREE.Vector3(x, y, z).normalize())));
        out.lerp(dot, d);
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.034) ** 2 + ((p.y - e.y + 0.075) / 0.022) ** 2))));
        out.lerp(col("#FF8C9A"), cheek * 0.45);
        return;
    }
    switch (pp.region) {
        case "torso": {
            if (p.z >= 0) {
                // Spreda: tufne kao i pozadi (bubamara je tufnasta svuda), svetliji stomačić dole
                const yF = (p.y - shape.waistY) / (shape.shoulderY - shape.waistY);
                let d = 0;
                for (const [x, y, r] of FRONT_DOTS) d = Math.max(d, 1 - smoothstep(r * 0.85, r, Math.hypot(Math.abs(p.x) - x, (yF - y) * (shape.shoulderY - shape.waistY))));
                out.lerp(dot, d);
                out.lerp(col(limbHex), smoothstep(1.0, 1.1, yF));
                return;
            }
            // Pokrilca: tamna linija po sredini leđa, tamni „vratić” pri ramenima i tufne
            const yN = (p.y - shape.waistY) / (shape.shoulderY - shape.waistY);
            const seam = 1 - smoothstep(0.004, 0.009, Math.abs(p.x));
            const collar = smoothstep(0.98, 1.08, yN);
            let d = 0;
            for (const [x, y, r] of BACK_DOTS) d = Math.max(d, 1 - smoothstep(r * 0.85, r, Math.hypot(Math.abs(p.x) - x, (yN - y) * (shape.shoulderY - shape.waistY))));
            out.lerp(dot, Math.max(seam * (yN < 1 ? 1 : 0), d * (1 - bellyMask(ctx, p, 0.12))));
            out.lerp(col(limbHex), collar);
            return;
        }
        case "arm":
        case "leg": {
            // Ručice i nožice tamne; nadlaktica i butina još u boji pokrilaca (prelaz)
            const t = pp.t ?? 0;
            out.lerp(col(limbHex), smoothstep(pp.region === "arm" ? 0.18 : 0.12, pp.region === "arm" ? 0.3 : 0.24, t));
            return;
        }
    }
}

export const LADYBUG: AnimalSpec = {
    kind: "ladybug",
    skins: FRIEND_SKINS.ladybug,
    coats: LADYBUG_COATS,
    shape: { kind: asFriend("ladybug"), girth: 1.12, belly: 1.14, pear: 0.24, limb: 0.86, legK: 0.84, armK: 0.96, head: { w: 0.41, h: 0.37, d: 0.37 } },
    ref: 0.41,
    head: {
        flat: 0.14,
        flatTop: 0.06,
        chin: 0.08,
        eye: { u: 0.09, v: 0.47, r: 0.066, inset: 0.64, yaw: 0.2 },
        noseV: 0.58,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.86, lower: -0.88, lashes: 3, iris: 0.96, pupil: 0.52 },
        brow: { dv: 0.115, len: 0.055, thick: 0.0085 },
        nose: { kind: "none", w: 0.01, h: 0.01, d: 0.01 },
        mouth: { w: 0.05, h: 0.045, curve: "smile", teeth: "none", wrap: 0.1, philtrum: 0, line: 0.0034 },
    },
    ears: antennaEars({ len: 0.13, thick: 0.014, u: 0.575, v: 0.1, back: 0.12, out: 0.42, bend: 0.03 }),
    hands: "paw",
    feet: "paw",
    belly: 0,
    cheeks: 0,
    sleek: true,
    extras: (b) => antennaTips(b, { r: 0.022, color: b.coat.horn ?? "#3A3542" }),
    anchors: (a, b) => {
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintLadybug,
};

registerCompanion(companionFrom(LADYBUG));
