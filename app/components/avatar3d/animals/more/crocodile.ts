// Krokodil (drugarski, nasmejan): duga zaobljena njuška sa nozdrvama na vrhu i širokim osmehom
// sa redom zubića, krupne oči na „kupolama” na vrhu glave, krljušt (tamne ivice pločica), svetao
// stomak sa poprečnim trakama, niz zaobljenih pločica od potiljka niz leđa do vrha debelog repa,
// šake sa četiri prsta i stopala sa kandžicama. Bez ušiju.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { fingerHand, toeFoot } from "../extra/hands";
import {
    asMore, bellyMask, brimRadiusAt, coat, col, goldCoat, headLocal, isHead, placePlate, rainbowAt, RAINBOW, scales, smoothstep, tailBone,
    tailFrame, torsoAngle, torsoBone,
} from "./common";
import { MORE_SKINS } from "./skins.data";

function croc(fur: string, belly: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, belly, { muzzle: fur, inner: belly, nose: shade(fur, -0.5), brow: shade(fur, -0.35), iris: ["#E8D04A", "#7A6A10"], mouth: shade(fur, -0.65), marks: [shade(fur, -0.3)], hoof: "#FFF6E6", ...extra });
}

export const CROC_COATS: Record<string, Coat> = {
    zeleni: croc("#5EAE5A", "#F2EAA8"),
    maslinasti: croc("#8A9A4E", "#EEE2B0", { iris: ["#F2C44A", "#8A5A10"] }),
    plavi: croc("#4E9AD8", "#E2F2FF", { iris: ["#FFE48A", "#C08A1A"] }),
    ljubicasti: croc("#9A7AD8", "#F6E8FF", { iris: ["#FFD0E8", "#B04A8A"] }),
    zlatni: goldCoat({ light: "#FFF6D0", marks: ["#C08A1E"], mouth: "#6A4A10", hoof: "#FFF6D8", nose: "#8A5A10" }),
    dugin: croc("#F6F2FA", "#FFFFFF", { marks: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"], mouth: "#6A4A8A" }),
};

const tmp = new THREE.Color();

function paintCroc(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    const rainbow = marks.length > 2;
    if (rainbow) out.lerp(rainbowAt(marks, p.y * 2.2 + p.z, tmp), 0.65);
    const edge = col(rainbow ? "#9A86C0" : marks[0]);
    const light = col(c.light);
    // Krljušt: tamne linije između pločica (krupnije na leđima i repu, sitnije na glavi)
    const [line, id] = scales(p, isHead(pp) ? 30 : 20, 9);
    out.multiplyScalar(0.93 + id * 0.12);
    let keep = 1;
    switch (pp.region) {
        case "torso": {
            const m = bellyMask(ctx, p, 0.12, shape.neckBaseY + 0.04);
            // Stomak: svetle poprečne trake (krupne pločice)
            const bands = 0.5 + 0.5 * Math.cos(p.y * 90);
            out.lerp(light, m);
            out.multiplyScalar(1 - m * smoothstep(0.82, 1, bands) * 0.14);
            keep = 1 - m;
            // Tamnija leđa
            out.multiplyScalar(1 - smoothstep(1.6, 2.8, Math.abs(torsoAngle(p))) * 0.12);
            break;
        }
        case "tail":
            out.lerp(light, smoothstep(-0.2, -0.85, (p.y - shape.crotchY) * 6) * 0.4);
            out.multiplyScalar(1 - smoothstep(0, 0.9, pp.t ?? 0) * 0.08);
            break;
        case "hand":
        case "foot":
            out.multiplyScalar(0.94);
            break;
        case "arm":
        case "leg": {
            const side = pp.side ?? 1;
            const inner = smoothstep(0.2, -0.6, ((p.x - side * 0.09) * side) / 0.05);
            out.lerp(light, inner * 0.5);
            keep = 1 - inner * 0.6;
            break;
        }
        default:
            break;
    }
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        // Svetla donja vilica i grlo
        const jaw = (1 - smoothstep(-0.42, -0.22, q.y)) * smoothstep(-0.3, 0.1, q.z);
        out.lerp(light, jaw);
        keep = 1 - jaw;
    }
    out.lerp(edge, line * keep * 0.5);
}

/** Pločice: dva reda od potiljka niz leđa, pa jedan red do vrha repa */
function addScutes(b: AnimalBuild) {
    const { shape } = b;
    const k = b.k;
    const marks = b.coat.marks ?? [];
    const color = new THREE.Color();
    const pick = (y: number) => (marks.length > 2 ? rainbowAt(marks, y * 2.6, color) : color.copy(col(shade(b.coat.fur, -0.12))));
    const n = 6;
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = shape.neckBaseY - 0.03 - t * (shape.neckBaseY - shape.crotchY - 0.04);
        for (const side of [1, -1]) {
            const x = side * 0.022 * k;
            const at = new THREE.Vector3(x, y, -shape.torsoBack(y) + 0.006);
            const up = new THREE.Vector3(side * 0.25, 0.15, -1).normalize();
            b.part("tail", placePlate(b, torsoBone(b, y), at, up, new THREE.Vector3(0, -1, -0.1).normalize(), 0.026 * k, pick(y), 0.4));
        }
    }
    for (let i = 0; i < 6; i++) {
        const s = 0.12 + i * 0.15;
        const f = tailFrame(b, s);
        const at = f.at.clone().addScaledVector(f.up, b.spec.tail!.radius(s) * k * 0.85);
        b.part("tail", placePlate(b, tailBone(s), at, f.up, f.tangent, (0.032 - i * 0.003) * k, pick(at.y), 0.5));
    }
}

export const CROCODILE: AnimalSpec = {
    kind: "crocodile",
    skins: MORE_SKINS.crocodile,
    coats: CROC_COATS,
    shape: { kind: asMore("crocodile"), girth: 1.06, belly: 1.1, pear: 0.2, limb: 1.08, legK: 0.9, head: { w: 0.36, h: 0.3, d: 0.36 } },
    ref: 0.46,
    head: {
        flat: 0.0,
        flatTop: 0.2,
        chin: 0.0,
        blobs: [
            // Kupole očiju na vrhu glave
            { c: [0.085, 0.1, 0.04], r: [0.085, 0.08, 0.085], k: 0.045 },
            { c: [-0.085, 0.1, 0.04], r: [0.085, 0.08, 0.085], k: 0.045 },
            // Duga zaobljena njuška (malo šira na vrhu) i široka vilica
            { c: [0, -0.065, 0.17], r: [0.13, 0.072, 0.31], k: 0.07, muzzle: true },
            { c: [0, -0.05, 0.34], r: [0.11, 0.058, 0.13], k: 0.04, muzzle: true },
        ],
        bumps: [
            // Nozdrve na vrhu njuške
            { dir: [0.06, 0.05, 1], sigma: 0.07, amp: 0.006, muzzle: true, mirror: true },
        ],
        eye: { u: 0.083, v: 0.27, r: 0.062, inset: 0.6, yaw: 0.22 },
        noseV: 0.44,
        mouthV: 0.58,
    },
    face: {
        eye: { upper: 0.82, lower: -0.86, lashes: 1, iris: 0.94, pupil: 0.44, almond: 1.05 },
        brow: { dv: 0.115, len: 0.06, thick: 0.009 },
        nose: { kind: "nostrils", w: 0.009, h: 0.006, d: 0.005, v: 0.44 },
        mouth: { w: 0.12, h: 0.05, curve: "smile", teeth: "row", wrap: 0.14, philtrum: 0, line: 0.0034 },
    },
    tail: {
        points: [[0, 0, 0], [0.02, -0.06, -0.12], [0.09, -0.1, -0.24], [0.2, -0.115, -0.32], [0.32, -0.1, -0.34]],
        radius: (s) => 0.085 * Math.pow(1 - s, 0.85) + 0.01,
        motion: "sway",
        height: 0.07,
    },
    hands: "hand",
    feet: "paw",
    belly: 0.6,
    cheeks: 0,
    sleek: true,
    customHand: (b, side) => fingerHand(b, side, { fingers: 4, len: 0.6, thick: 0.24, claws: b.coat.hoof ?? "#FFF6E6" }),
    customFoot: (b, side) => toeFoot(b, side, { toes: 4, claws: b.coat.hoof ?? "#FFF6E6", thick: 0.17 }),
    extras: addScutes,
    anchors: (a, b) => {
        // Bez ušiju; oči su na vrhu glave — kapa naleže iznad njih; dugačka njuška
        a.ears.kind = "none";
        a.head.brimY = Math.min(a.head.top.y - 0.02, a.eyes.left.y + a.eyes.radius * 0.35);
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintCroc,
};

registerCompanion(companionFrom(CROCODILE));
