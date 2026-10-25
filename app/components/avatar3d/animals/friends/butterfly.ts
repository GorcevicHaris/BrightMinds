// Leptirić: okrugla glava, krupne oči sa trepavicama, rumeni obrazi i osmeh, dva tanka pipka
// sa uvijenim vrhom (kapa im pravi otvor), vitko telo i dva para velikih šarenih krila na
// leđima — prelaz boja od tela ka ivici, taman obod sa belim tačkicama i svetla „okca” — koja
// polako mašu (prolaze kroz odeću kao rep). Bez ušiju i bez repa.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { antennaEars, antennaTips, asFriend, backWings, bellyMask, brimRadiusAt, coat, col, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { FRIEND_SKINS } from "./skins.data";

/** fur = telo; light = stomak i njuška; marks = [krilo uz telo, krilo spolja, obod, tačkice] */
function butterfly(body: string, light: string, wings: [string, string, string, string], extra: Partial<Coat> = {}): Coat {
    return coat(body, light, {
        muzzle: light,
        inner: light,
        nose: shade(body, -0.45),
        brow: shade(body, -0.35),
        iris: ["#6A4AA8", "#1E1238"],
        mouth: shade(body, -0.62),
        marks: wings,
        ears: shade(body, -0.3),
        horn: shade(body, -0.3),
        ...extra,
    });
}

export const BUTTERFLY_COATS: Record<string, Coat> = {
    plavi: butterfly("#93ADF0", "#EAF0FF", ["#7FE0F6", "#3E6CE2", "#24306A", "#FFFFFF"]),
    roze: butterfly("#F4AED2", "#FFF2F8", ["#FFD0E6", "#E05EA8", "#76285C", "#FFFFFF"], { iris: ["#9A4A8A", "#2A1028"] }),
    narandzasti: butterfly("#EDAA72", "#FFF1E2", ["#FFC45A", "#F27A1E", "#3E2A2A", "#FFFFFF"], { iris: ["#8A5A2A", "#2A160A"] }),
    dugin: butterfly("#E6DCF6", "#FFFFFF", ["#FFFFFF", "#FFFFFF", "#7A5AA8", "#FFFFFF"], { mane: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

/** Krilo kao elipsa: središte, poluose i okret (rad) — obris i udeo do ivice (0 središte, 1 ivica) */
interface Lobe {
    c: [number, number];
    r: [number, number];
    rot: number;
    /** Svetlo „okce” (udeo poluosa od središta ka spolja) */
    eye: number;
}

const UPPER: Lobe = { c: [0.15, 0.12], r: [0.18, 0.13], rot: 0.62, eye: 0.42 };
const LOWER: Lobe = { c: [0.105, -0.085], r: [0.125, 0.092], rot: -0.7, eye: 0.38 };

function lobeOutline(l: Lobe): (t: number) => [number, number] {
    const c = Math.cos(l.rot);
    const s = Math.sin(l.rot);
    return (t) => {
        const a = t * Math.PI * 2;
        // Malo talasast obod (kao pravo krilo)
        const wave = 1 + 0.035 * Math.sin(a * 5);
        const x = Math.cos(a) * l.r[0] * wave;
        const y = Math.sin(a) * l.r[1] * wave;
        return [l.c[0] + x * c - y * s, l.c[1] + x * s + y * c];
    };
}

function lobeLocal(l: Lobe, x: number, y: number): [number, number, number] {
    const c = Math.cos(l.rot);
    const s = Math.sin(l.rot);
    const dx = x - l.c[0];
    const dy = y - l.c[1];
    const lx = (dx * c + dy * s) / l.r[0];
    const ly = (-dx * s + dy * c) / l.r[1];
    return [Math.hypot(lx, ly), Math.atan2(ly, lx), lx];
}

function wingPaint(coatOf: Coat, l: Lobe) {
    const [inner, outer, rim, dots] = coatOf.marks ?? ["#FFFFFF", "#CCCCCC", "#333333", "#FFFFFF"];
    const rainbow = (coatOf.mane ?? []).length > 2;
    const tmp = new THREE.Color();
    return (x: number, y: number, _d: number, out: THREE.Color): THREE.Color => {
        const [e, angle, along] = lobeLocal(l, x, y);
        if (rainbow) rainbowAt(coatOf.mane!, angle / (Math.PI * 2) + 0.1, out).lerp(col("#FFFFFF"), (1 - smoothstep(0.1, 0.7, e)) * 0.5);
        else out.copy(col(inner)).lerp(col(outer), smoothstep(0.15, 0.85, e));
        // Taman obod sa belim tačkicama
        const band = smoothstep(0.8, 0.86, e);
        out.lerp(col(rim), band);
        const n = 14;
        const k = ((angle / (Math.PI * 2)) * n + n) % 1;
        const dot = (1 - smoothstep(0.18, 0.28, Math.abs(k - 0.5))) * (1 - smoothstep(0.02, 0.05, Math.abs(e - 0.92)));
        out.lerp(col(dots), dot * 0.95);
        // Svetlo okce spolja
        const eye = Math.hypot(along - l.eye, e * Math.sin(angle) * 1.0);
        out.lerp(tmp.copy(col(dots)), (1 - smoothstep(0.17, 0.22, eye)) * 0.85);
        out.lerp(col(rim), (1 - smoothstep(0.22, 0.26, eye)) * smoothstep(0.17, 0.2, eye) * 0.9);
        return out;
    };
}

function paintButterfly(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    if (pp.region === "torso") out.lerp(col(c.light), bellyMask(ctx, p, 0, shape.neckBaseY + 0.01) * 0.85);
    if ((c.mane ?? []).length > 2 && pp.region !== "ear") out.lerp(rainbowAt(c.mane!, p.y * 1.6, new THREE.Color()), 0.22);
    if (isHead(pp)) {
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.034) ** 2 + ((p.y - e.y + 0.075) / 0.022) ** 2))));
        out.lerp(col("#FF8CA8"), cheek * 0.42);
    }
}

export const BUTTERFLY: AnimalSpec = {
    kind: "butterfly",
    skins: FRIEND_SKINS.butterfly,
    coats: BUTTERFLY_COATS,
    shape: { kind: asFriend("butterfly"), girth: 0.94, belly: 1.04, pear: 0.12, limb: 0.84, legK: 0.9, head: { w: 0.4, h: 0.36, d: 0.36 } },
    ref: 0.4,
    head: {
        flat: 0.12,
        flatTop: 0.05,
        chin: 0.1,
        eye: { u: 0.09, v: 0.47, r: 0.066, inset: 0.64, yaw: 0.2 },
        noseV: 0.58,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.86, lower: -0.88, lashes: 3, iris: 0.96, pupil: 0.5 },
        brow: { dv: 0.115, len: 0.055, thick: 0.0085 },
        nose: { kind: "none", w: 0.01, h: 0.01, d: 0.01 },
        mouth: { w: 0.05, h: 0.045, curve: "smile", teeth: "none", wrap: 0.1, philtrum: 0, line: 0.0034 },
    },
    ears: antennaEars({ len: 0.16, thick: 0.012, u: 0.575, v: 0.1, back: 0.12, out: 0.4, bend: 0.03 }),
    hands: "paw",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
    sleek: true,
    extras: (b) => {
        antennaTips(b, { r: 0.016, color: b.coat.horn ?? "#3A3040", shape: "curl" });
        backWings(b, [
            { outline: lobeOutline(UPPER), at: 0.78, yaw: 0.35, roll: 0, thick: 0.004, color: wingPaint(b.coat, UPPER), flap: [1.6, 0.3] },
            { outline: lobeOutline(LOWER), at: 0.78, yaw: 0.35, thick: 0.004, color: wingPaint(b.coat, LOWER) },
        ]);
    },
    anchors: (a, b) => {
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintButterfly,
};

registerCompanion(companionFrom(BUTTERFLY));
