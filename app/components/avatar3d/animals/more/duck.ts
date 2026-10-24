// Patka: okrugla glava sa širokim pljosnatim kljunom (otvara se dok priča), čuperak perja na
// temenu, krila umesto šaka, punački trup, kratka lepeza repa podignuta nagore i narandžasta
// stopala sa plivaćom kožicom. Divlja patka ima zelenu glavu, belu ogrlicu i smeđe grudi.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { addBeak, beakAnchors, birdParts } from "./birds";
import { addCrest, addFeatherTail, asMore, bellyMask, coat, col, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function duck(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: fur, brow: shade(fur, -0.3), iris: ["#5A4A3A", "#1E140C"], beak: "#F2861E", hoof: "#F2861E", ...extra });
}

export const DUCK_COATS: Record<string, Coat> = {
    zuta: duck("#FFD84A", "#FFF0A6"),
    bela: duck("#FAFAF8", "#FFFFFF", { brow: "#C9C6C2" }),
    // Divlja: zelena glava (ears = boja glave), bela ogrlica, smeđe grudi, sivo telo
    divlja: duck("#9A9AA2", "#C8BDB0", { ears: "#2E8A5A", marks: ["#7A4A30", "#FFFFFF"], beak: "#E8C24A", brow: "#1E5A3A", iris: ["#4A3A2A", "#140C06"] }),
    plava: duck("#8EC2F2", "#DDEEFF", { beak: "#F2A63A", iris: ["#3A5A8A", "#0E1A2E"] }),
    roze: duck("#F9B8D2", "#FFE6F0", { iris: ["#7A4A8A", "#2A1030"] }),
    zlatna: goldCoat({ beak: "#E8902A", hoof: "#E8902A", pattern: "gold" }),
    duga: duck("#FFF6FA", "#FFFFFF", { marks: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintDuck(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    const light = col(c.light);
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.4 + p.x * 0.5, tmp), isHead(pp) ? 0.3 : 0.6);
    const wild = !!c.ears;
    if (pp.region === "torso") {
        out.lerp(light, bellyMask(ctx, p, 0.2) * 0.8);
        if (wild) {
            // Smeđe grudi, bela ogrlica pri vrhu, zelen vrat iznad nje
            const chest = bellyMask(ctx, p, 0.25) * smoothstep(shape.chestY - 0.06, shape.chestY, p.y);
            out.lerp(col(marks[0]), chest);
            const ringY = shape.shoulderY + 0.01;
            out.lerp(col(marks[1]), Math.exp(-(((p.y - ringY) / 0.007) ** 2)));
            out.lerp(col(c.ears!), smoothstep(ringY + 0.004, ringY + 0.012, p.y));
        }
        return;
    }
    if (pp.region === "hand" || pp.region === "arm") {
        // Krila: malo tamnija, svetla pruga pri vrhu; divlja ima plavo „ogledalo”
        out.multiplyScalar(0.92);
        if (wild) out.lerp(col("#3A5AC0"), Math.exp(-((((pp.t ?? 0) - 0.7) / 0.08) ** 2)) * 0.8);
        return;
    }
    if (!isHead(pp)) return;
    const q = headLocal(ctx, p);
    if (wild) out.copy(col(c.ears!)).lerp(col("#5AC08A"), smoothstep(0.2, 0.9, q.y) * 0.25);
    // Svetli obrazi ispod očiju, rumenilo
    const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.25) / 0.04) ** 2 + ((p.y - e.y + 0.07) / 0.03) ** 2))));
    out.lerp(col("#FF9CA8"), cheek * 0.28);
}

export const DUCK: AnimalSpec = {
    kind: "duck",
    skins: MORE_SKINS.duck,
    coats: DUCK_COATS,
    shape: { kind: asMore("duck"), girth: 1.12, belly: 1.18, pear: 0.42, limb: 1.0, legK: 0.8, armK: 0.95, head: { w: 0.37, h: 0.35, d: 0.35 } },
    ref: 0.46,
    head: {
        flat: 0.12,
        flatTop: 0.1,
        chin: 0.05,
        blobs: [{ c: [0, -0.04, 0.0], r: [0.24, 0.16, 0.2], k: 0.07 }],
        bumps: [
            { dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true },
            { dir: [0.7, -0.45, 0.55], sigma: 0.22, amp: 0.008, mirror: true },
        ],
        eye: { u: 0.1, v: 0.44, r: 0.06, inset: 0.68, yaw: 0.2 },
        noseV: 0.6,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 2, iris: 0.94, pupil: 0.5 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "none", w: 0, h: 0, d: 0 },
        mouth: { w: 0.03, h: 0.03, curve: "smile", teeth: "none", wrap: 0.06, philtrum: 0, line: 0.002 },
    },
    ...birdParts("webbed"),
    belly: 0.55,
    cheeks: 0,
    extras: (b) => {
        addBeak(b, { len: 0.15, w: 0.072, h: 0.034, flat: true, color: b.coat.beak ?? "#F29A2E", lower: shade(b.coat.beak ?? "#F29A2E", -0.12), open: 0.45 });
        addCrest(b, { count: 3, len: 0.065, r: 0.02, colors: [b.coat.ears ?? b.coat.fur], v: 0.02, spread: 0.03, forward: 0.4, up: 0.6 });
        addFeatherTail(b, { count: 5, len: 0.15, w: 0.085, spread: 1.1, tilt: 2.2, colors: [shade(b.coat.fur, -0.05)], height: 0.04 });
    },
    anchors: beakAnchors,
    paint: paintDuck,
};

registerCompanion(companionFrom(DUCK));
