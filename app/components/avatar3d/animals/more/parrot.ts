// Papagaj (ara): krupan kukast kljun (svetao gore, taman dole), belo lice oko očiju sa
// tankim linijama perja, mali čuperak, šarena krila (traka žute i plave pri kraju), dug rep od
// dva-tri pera i sive noge sa prstima. Kakadu (beli) ima žutu krestu.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { addBeak, beakAnchors, birdParts } from "./birds";
import { addCrest, addFeatherTail, asMore, coat, col, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

/** fur = telo; marks = [traka krila 1, traka krila 2 (vrh), rep] */
function parrot(fur: string, band: string, tip: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, shade(fur, 0.15), { muzzle: "#FFFFFF", brow: shade(fur, -0.3), iris: ["#F2E07A", "#8A7A1A"], beak: "#F4EEE6", hoof: "#8A8A92", marks: [band, tip], mane: [fur, band], ...extra });
}

export const PARROT_COATS: Record<string, Coat> = {
    crveni: parrot("#E8402E", "#FFD23A", "#2E6AD8"),
    zeleni: parrot("#4EBE4A", "#FFE04A", "#2E6AD8", { iris: ["#FFB04A", "#8A4A0C"] }),
    plavi: parrot("#3A8AE8", "#FFD23A", "#2E3E9A", { muzzle: "#FFFFFF", beak: "#3A3438" }),
    beli: parrot("#FAFAF6", "#FFF2B0", "#FFFFFF", { brow: "#C9C6C2", beak: "#3A3438", mane: ["#FFD84A", "#FFE88A"], iris: ["#3A2A2A", "#0E0808"] }),
    ljubicasti: parrot("#9A6AE0", "#FF9ACB", "#5ACBE8", { iris: ["#FFD0E8", "#B04A8A"] }),
    zlatni: goldCoat({ muzzle: "#FFFFFF", beak: "#F4EEE6", hoof: "#8A8A92", marks: ["#FFFFFF", "#E8902A"], mane: ["#F2C443", "#FFFFFF"] }),
    dugin: parrot("#FFF6FA", "#FFE68A", "#9CCCFF", { marks: RAINBOW, mane: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintParrot(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    const rainbow = marks.length > 2;
    if (rainbow) out.lerp(rainbowAt(marks, p.y * 2.6 + p.x, tmp), 0.65);
    if (pp.region === "hand" || pp.region === "arm") {
        // Krila: traka boje pri sredini, druga boja na vrhu (perje-prsti)
        const t = pp.region === "hand" ? 0.85 + 0.15 * smoothstep(-0.2, 0.2, -p.y + ctx.shape.waistY) : pp.t ?? 0;
        if (!rainbow) {
            out.lerp(col(marks[0]), smoothstep(0.45, 0.55, t) * (1 - smoothstep(0.78, 0.86, t)));
            out.lerp(col(marks[1]), smoothstep(0.8, 0.88, t));
        }
        return;
    }
    if (!isHead(pp)) return;
    const q = headLocal(ctx, p);
    // Belo lice oko očiju i kljuna (ara), sa tankim linijama perja
    let face = 0;
    for (const e of ctx.eyes) {
        const d = Math.hypot((p.x - e.x) / (ctx.eyeR * 1.9), (p.y - e.y + ctx.eyeR * 0.5) / (ctx.eyeR * 2.0), (p.z - e.z) / (ctx.eyeR * 3));
        face = Math.max(face, 1 - smoothstep(0.85, 1, d));
    }
    face *= smoothstep(0.05, 0.35, q.z);
    out.lerp(col(c.muzzle), face);
    const lines = (1 - smoothstep(0.1, 0.3, Math.abs(Math.sin(p.y * 260)))) * smoothstep(0.3, 0.9, face) * (1 - smoothstep(0.05, 0.12, Math.abs(q.x) - 0.25));
    out.lerp(col(shade(c.fur, -0.2)), lines * 0.45);
}

export const PARROT: AnimalSpec = {
    kind: "parrot",
    skins: MORE_SKINS.parrot,
    coats: PARROT_COATS,
    shape: { kind: asMore("parrot"), girth: 1.02, belly: 1.08, pear: 0.3, limb: 0.94, legK: 0.85, armK: 1.0, head: { w: 0.35, h: 0.36, d: 0.35 } },
    ref: 0.45,
    head: {
        flat: 0.06,
        flatTop: 0.05,
        chin: 0.1,
        blobs: [{ c: [0, -0.04, 0.0], r: [0.22, 0.18, 0.2], k: 0.07 }],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.105, v: 0.42, r: 0.058, inset: 0.68, yaw: 0.26 },
        noseV: 0.54,
        mouthV: 0.64,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 2, iris: 0.9, pupil: 0.48 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "none", w: 0, h: 0, d: 0 },
        mouth: { w: 0.03, h: 0.03, curve: "smile", teeth: "none", wrap: 0.06, philtrum: 0, line: 0.002 },
    },
    ...birdParts("toes"),
    belly: 0.1,
    cheeks: 0,
    extras: (b) => {
        addBeak(b, { len: 0.095, w: 0.044, h: 0.066, hook: 0.75, color: b.coat.beak ?? "#F4EEE6", lower: "#2A2428", open: 0.4 });
        const mane = b.coat.mane ?? [b.coat.fur];
        const white = b.coat.fur === "#FAFAF6";
        addCrest(b, { count: white ? 6 : 4, len: white ? 0.1 : 0.05, r: 0.018, colors: white ? mane : [mane[0]], v: 0.06, spread: 0.04, forward: white ? -0.2 : 0.3, up: white ? 0.9 : 0.4 });
        const m = b.coat.marks ?? [b.coat.fur];
        const tail = m.length > 2 ? RAINBOW.slice(0, 3) : [b.coat.fur, m[1] ?? b.coat.fur, b.coat.fur];
        addFeatherTail(b, { count: 3, len: 0.3, w: 0.065, spread: 0.35, tilt: 0.4, colors: tail, tip: m.length > 2 ? undefined : m[1], height: 0.02, middle: 0.35 });
    },
    anchors: beakAnchors,
    paint: paintParrot,
};

registerCompanion(companionFrom(PARROT));
