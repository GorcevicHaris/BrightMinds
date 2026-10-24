// Delfin (uspravan crtani lik): zaobljeno čelo i kratak „kljun” sa urođenim osmehom, bez ušiju,
// tamnija leđa i svetao stomak, peraja umesto šaka (šaka vrste „flipper”), leđno peraje (prolazi
// kroz odeću kao rep) i rep sa dva repna peraja, plivaća stopala.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import {
    asMore, bellyMask, brimRadiusAt, coat, col, finGeometry, goldCoat, headLocal, isHead, leafOutline, onBone, paintPart, rainbowAt, RAINBOW,
    smoothstep, tailFrame, torsoAngle,
} from "./common";
import { MORE_SKINS } from "./skins.data";

function dolphin(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: fur, nose: shade(fur, -0.4), brow: shade(fur, -0.35), iris: ["#5A4A3A", "#140C06"], paws: shade(fur, -0.1), marks: [shade(fur, -0.18)], ...extra });
}

export const DOLPHIN_COATS: Record<string, Coat> = {
    plavi: dolphin("#6E9ED6", "#E6F2FF"),
    sivi: dolphin("#98A2B0", "#EEF0F4"),
    roze: dolphin("#F2A6C2", "#FFE8F0", { iris: ["#7A4A8A", "#2A1030"] }),
    ljubicasti: dolphin("#A68AE0", "#F2EAFF", { iris: ["#3A2A6A", "#100A24"] }),
    zlatni: goldCoat({ marks: ["#D9A21E"], paws: "#D9A21E", nose: "#6A4A1E" }),
    dugin: dolphin("#FFF6FA", "#FFFFFF", { marks: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintDolphin(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    const rainbow = marks.length > 2;
    if (rainbow) out.lerp(rainbowAt(marks, p.y * 2.2 + p.x, tmp), 0.5);
    const dark = col(rainbow ? shade(c.fur, -0.1) : marks[0]);
    const light = col(c.light);
    switch (pp.region) {
        case "torso": {
            // Tamna leđa, svetao stomak sa talasastom granicom
            const a = Math.abs(torsoAngle(p));
            out.lerp(dark, smoothstep(1.7, 2.6, a) * 0.8);
            out.lerp(light, bellyMask(ctx, p, 0.3 + 0.08 * Math.sin(p.y * 30)));
            return;
        }
        case "tail":
            out.lerp(dark, 0.6);
            out.lerp(light, smoothstep(-0.2, -0.9, (p.y - shape.crotchY) * 7) * 0.5);
            return;
        case "arm":
        case "hand":
            out.lerp(dark, 0.45);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Tamno teme, svetla donja vilica i grlo
    out.lerp(dark, smoothstep(0.2, 0.8, q.y) * (1 - smoothstep(0.4, 0.9, q.z)) * 0.7);
    out.lerp(light, (1 - smoothstep(-0.45, -0.25, q.y + Math.abs(q.x) * 0.15)) * smoothstep(-0.3, 0.1, q.z));
    const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.04) ** 2 + ((p.y - e.y + 0.07) / 0.03) ** 2))));
    out.lerp(col("#FF9CB0"), cheek * 0.3);
}

/** Leđno peraje i repna peraja (boje krzna, prate kosti) */
function addFins(b: AnimalBuild) {
    const { shape } = b;
    const k = b.k;
    // Leđno: srp u ravni simetrije, nagnut unazad
    const dorsal = finGeometry(leafOutline(0.17 * k, 0.07 * k, 0.3, -0.05 * k), 0.009 * k, b.quality);
    dorsal.rotateY(Math.PI / 2);
    dorsal.rotateX(-0.75);
    const y = shape.chestY - 0.01;
    dorsal.translate(0, y, -shape.torsoBack(y) + 0.008);
    paintPart(b, dorsal, "tail", { t: 0.5 });
    const d = new THREE.Mesh(dorsal, b.fur);
    d.name = "ledjno-peraje";
    onBone(b, "chest", d);
    b.part("tail", d);
    // Repna peraja: dva režnja vodoravno na vrhu repa
    const f = tailFrame(b, 1);
    const parts: THREE.BufferGeometry[] = [];
    for (const side of [1, -1]) {
        const g = finGeometry(leafOutline(0.13 * k, 0.05 * k, 0.45, side * 0.035 * k), 0.008 * k, b.quality);
        g.rotateX(-Math.PI / 2);
        g.rotateY(side * 0.95);
        parts.push(g);
    }
    for (const g of parts) {
        // Vodoravna peraja na vrhu repa, okrenuta u pravcu repa (bez nagiba)
        g.rotateY(Math.atan2(-f.tangent.x, -f.tangent.z));
        g.translate(f.at.x, f.at.y, f.at.z);
        paintPart(b, g, "tail", { t: 0.95 });
        const m = new THREE.Mesh(g, b.fur);
        m.name = "repno-peraje";
        onBone(b, "tail3", m);
        b.part("tail", m);
    }
}

export const DOLPHIN: AnimalSpec = {
    kind: "dolphin",
    skins: MORE_SKINS.dolphin,
    coats: DOLPHIN_COATS,
    shape: { kind: asMore("dolphin"), girth: 1.04, belly: 1.1, pear: 0.35, limb: 1.0, legK: 0.85, armK: 0.85, head: { w: 0.34, h: 0.36, d: 0.36 } },
    ref: 0.44,
    head: {
        flat: 0.0,
        flatTop: 0.0,
        chin: 0.1,
        blobs: [
            // Okruglo čelo („dinja”) i kratak zaobljen kljun
            { c: [0, 0.03, 0.04], r: [0.2, 0.17, 0.19], k: 0.06 },
            { c: [0, -0.085, 0.16], r: [0.075, 0.055, 0.17], k: 0.06, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.0, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.11, v: 0.47, r: 0.06, inset: 0.66, yaw: 0.28 },
        noseV: 0.6,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 2, iris: 0.96, pupil: 0.5 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "none", w: 0, h: 0, d: 0 },
        mouth: { w: 0.08, h: 0.045, curve: "smile", teeth: "row", wrap: 0.1, philtrum: 0, line: 0.003 },
    },
    tail: {
        points: [[0, 0, 0], [0, -0.07, -0.08], [0.02, -0.11, -0.2], [0.06, -0.08, -0.3], [0.1, 0.0, -0.36]],
        radius: (s) => 0.075 * Math.pow(1 - s, 0.9) + 0.012,
        motion: "sway",
        height: 0.06,
        sleek: true,
    },
    hands: "flipper",
    feet: "webbed",
    pawR: 0.042,
    belly: 0.6,
    cheeks: 0,
    sleek: true,
    extras: addFins,
    anchors: (a, b) => {
        a.ears.kind = "none";
        a.head.brimY = Math.max(a.head.brimY, a.eyes.left.y + a.eyes.radius * 1.4);
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintDolphin,
};

registerCompanion(companionFrom(DOLPHIN));
