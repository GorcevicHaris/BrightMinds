// Flamingo: dug vitak vrat (kragna i ogrlica ostaju na ramenima), manja okrugla glava sa
// kljunom savijenim nadole i crnim vrhom, ružičasto perje (tamnije na krilima, crni vrhovi
// pera), tanke duge noge, kratak rep i plivaća stopala.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { addBeak, beakAnchors, birdParts } from "./birds";
import { addFeatherTail, asMore, bellyMask, coat, col, goldCoat, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function flamingo(fur: string, wing: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, shade(fur, 0.25), { muzzle: shade(fur, 0.3), brow: shade(fur, -0.3), iris: ["#F2D04A", "#8A6A10"], beak: "#F8E8E2", hoof: shade(fur, -0.1), marks: [wing, "#2A2428"], ...extra });
}

export const FLAMINGO_COATS: Record<string, Coat> = {
    roze: flamingo("#F7A0BC", "#EE6A96"),
    svetli: flamingo("#FBD2DE", "#F4A2BC", { iris: ["#7AB6E8", "#1E4A7E"] }),
    narandzasti: flamingo("#F8A27A", "#F06A4E", { beak: "#FFF0DE" }),
    plavi: flamingo("#A6CCF4", "#5E92E0", { hoof: "#7AA6DA" }),
    zlatni: goldCoat({ beak: "#FFF6E6", hoof: "#E0A82A", marks: ["#E0A82A", "#6A4A1E"] }),
    dugin: flamingo("#FFF2F8", "#FFC08A", { marks: RAINBOW, iris: ["#6A4A9A", "#24143A"], hoof: "#F7A0BC" }),
};

const tmp = new THREE.Color();

function paintFlamingo(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    const rainbow = marks.length > 2;
    if (rainbow) out.lerp(rainbowAt(marks, p.y * 2.2 + p.x, tmp), 0.6);
    if (pp.region === "torso") {
        out.lerp(col(c.light), bellyMask(ctx, p, 0.1) * 0.45);
        // Vrat svetliji
        out.lerp(col(c.light), smoothstep(shape.shoulderY, shape.neckBaseY + 0.04, p.y) * 0.4);
        return;
    }
    if (pp.region === "arm" || pp.region === "hand") {
        // Krila tamnija ružičasta, crni vrhovi pera
        const t = pp.region === "hand" ? 0.9 + 0.1 * smoothstep(-0.1, 0.1, shape.waistY - p.y) : pp.t ?? 0;
        if (!rainbow) out.lerp(col(marks[0]), smoothstep(0.2, 0.6, t) * 0.8);
        out.lerp(col(marks[1]), smoothstep(0.93, 0.98, t) * 0.85);
        return;
    }
    if (pp.region === "leg") {
        // Tanke noge: boja nogu (svetlija ružičasta), kolena malo tamnija
        out.copy(col(c.hoof ?? c.fur)).multiplyScalar(1 - Math.exp(-((((pp.t ?? 0) - 0.5) / 0.06) ** 2)) * 0.12);
        if (rainbow) out.lerp(tmp, 0.4);
        out.lerp(col(c.fur), 1 - smoothstep(0.12, 0.3, pp.t ?? 0));
        return;
    }
    if (isHead(pp)) {
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.03) ** 2 + ((p.y - e.y + 0.05) / 0.025) ** 2))));
        out.lerp(col("#FF7A9A"), cheek * 0.3);
    }
}

export const FLAMINGO: AnimalSpec = {
    kind: "flamingo",
    skins: MORE_SKINS.flamingo,
    coats: FLAMINGO_COATS,
    shape: { kind: asMore("flamingo"), girth: 0.98, belly: 1.06, pear: 0.3, limb: 0.74, legK: 1.12, armK: 0.95, neck: 0.14, neckR: 0.042, head: { w: 0.33, h: 0.32, d: 0.32 } },
    ref: 0.42,
    head: {
        flat: 0.08,
        flatTop: 0.05,
        chin: 0.1,
        blobs: [{ c: [0, -0.03, 0.0], r: [0.21, 0.17, 0.19], k: 0.07 }],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.105, v: 0.42, r: 0.062, inset: 0.68, yaw: 0.24 },
        noseV: 0.56,
        mouthV: 0.64,
    },
    face: {
        eye: { upper: 0.82, lower: -0.86, lashes: 3, iris: 0.86, pupil: 0.46 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "none", w: 0, h: 0, d: 0 },
        mouth: { w: 0.03, h: 0.03, curve: "smile", teeth: "none", wrap: 0.06, philtrum: 0, line: 0.002 },
    },
    ...birdParts("webbed"),
    belly: 0.3,
    cheeks: 0,
    extras: (b) => {
        addBeak(b, { len: 0.17, w: 0.042, h: 0.046, bend: 0.95, color: b.coat.beak ?? "#F8E8E2", tip: "#2A2428", open: 0.35 });
        const m = b.coat.marks ?? [b.coat.fur];
        addFeatherTail(b, { count: 5, len: 0.13, w: 0.07, spread: 0.9, tilt: 1.5, colors: [m.length > 2 ? b.coat.fur : m[0]], tip: m.length > 2 ? undefined : "#2A2428", height: 0.05 });
    },
    anchors: beakAnchors,
    paint: paintFlamingo,
};

registerCompanion(companionFrom(FLAMINGO));
