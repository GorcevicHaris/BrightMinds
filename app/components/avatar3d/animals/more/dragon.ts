// Zmaj (sladak, drugarski): okrugla glava sa kratkom zaobljenom njuškom i nozdrvama, dva
// zaobljena roga unazad (kapa ih zaobilazi), krupne oči, svetao stomak sa trakama, krljušt,
// zaobljeni šiljci od temena niz leđa do repa, mala krila na leđima (prolaze kroz odeću kao
// rep, blago mašu), rep sa vrhom u obliku srca-strelice, šake i stopala sa kandžicama.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { fingerHand, toeFoot } from "../extra/hands";
import {
    addHorns, asMore, bellyMask, brimRadiusAt, coat, col, finGeometry, goldCoat, headLocal, isHead, onBone, placePlate, rainbowAt, RAINBOW,
    scales, smoothstep, tailBone, tailFrame, torsoBone,
} from "./common";
import { MORE_SKINS } from "./skins.data";

/** fur = krljušt; light = stomak; marks = [šiljci i krila] */
function dragon(fur: string, belly: string, spikes: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, belly, { muzzle: shade(fur, 0.1), inner: belly, nose: shade(fur, -0.45), brow: shade(fur, -0.3), iris: ["#F2C44A", "#9A5A10"], mouth: shade(fur, -0.6), marks: [spikes], horn: "#FFF2D6", hoof: "#FFF6E6", ...extra });
}

export const DRAGON_COATS: Record<string, Coat> = {
    zeleni: dragon("#62B86A", "#F6EAA6", "#F2A23A"),
    crveni: dragon("#E85A4A", "#FFE0A6", "#FFC23A", { iris: ["#FFE48A", "#C08A1A"] }),
    plavi: dragon("#5A92E0", "#E2F0FF", "#9ADCF2", { iris: ["#FFE48A", "#C08A1A"] }),
    ljubicasti: dragon("#9A72D8", "#F6E6FF", "#FF9ACB"),
    zlatni: goldCoat({ light: "#FFF6D0", marks: ["#E8902A"], horn: "#FFF6E0", hoof: "#FFF6D8", mouth: "#6A4A10", nose: "#8A5A10" }),
    dugin: dragon("#F6F2FA", "#FFFFFF", "#FFB3C7", { marks: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"], mouth: "#6A4A8A" }),
};

const tmp = new THREE.Color();

function paintDragon(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    const rainbow = marks.length > 2;
    if (rainbow) out.lerp(rainbowAt(marks, p.y * 2.2 + p.z, tmp), 0.6);
    const light = col(c.light);
    const [line, id] = scales(p, isHead(pp) ? 34 : 24, 19);
    out.multiplyScalar(0.94 + id * 0.1);
    let keep = 1;
    if (pp.region === "torso") {
        const m = bellyMask(ctx, p, 0.05, shape.neckBaseY + 0.04);
        const bands = 0.5 + 0.5 * Math.cos(p.y * 90);
        out.lerp(light, m);
        out.multiplyScalar(1 - m * smoothstep(0.85, 1, bands) * 0.14);
        keep = 1 - m;
    }
    if (pp.region === "tail") out.lerp(light, smoothstep(-0.2, -0.8, (p.y - shape.crotchY) * 6) * 0.35);
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        const jaw = (1 - smoothstep(-0.55, -0.32, q.y)) * smoothstep(-0.3, 0.2, q.z);
        out.lerp(light, jaw);
        keep = 1 - jaw;
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.35) / 0.04) ** 2 + ((p.y - e.y + 0.07) / 0.03) ** 2))));
        out.lerp(col("#FF9C9C"), cheek * 0.3);
    }
    out.multiplyScalar(1 - line * keep * 0.12);
}

/** Šiljci od temena niz leđa do repa */
function addSpikes(b: AnimalBuild) {
    const { shape } = b;
    const k = b.k;
    const marks = b.coat.marks ?? [];
    const pick = (y: number) => (marks.length > 2 ? rainbowAt(marks, y * 2.6, new THREE.Color()) : col(marks[0] ?? b.coat.fur).clone());
    const n = 5;
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = shape.neckBaseY - 0.02 - t * (shape.neckBaseY - shape.crotchY - 0.06);
        const at = new THREE.Vector3(0, y, -shape.torsoBack(y) + 0.008);
        const h = (0.04 + 0.016 * Math.sin(Math.PI * (0.25 + t * 0.6))) * k;
        b.part("tail", placePlate(b, torsoBone(b, y), at, new THREE.Vector3(0, 0.25, -1).normalize(), new THREE.Vector3(0, -1, -0.15).normalize(), h, pick(y), 0.6));
    }
    for (let i = 0; i < 4; i++) {
        const s = 0.18 + i * 0.2;
        const f = tailFrame(b, s);
        const at = f.at.clone().addScaledVector(f.up, b.spec.tail!.radius(s) * k * 0.85);
        b.part("tail", placePlate(b, tailBone(s), at, f.up, f.tangent, (0.036 - i * 0.005) * k, pick(at.y), 0.6));
    }
    // Teme: tri male pločice (kapa ih sakriva kao kosu)
    const head = b.head;
    const hb = b.boneAt("head");
    for (let i = 0; i < 3; i++) {
        const v = 0.12 + i * 0.12;
        const at = head.point(0, v).add(hb);
        const up = head.normal(0, v);
        const back = new THREE.Vector3(0, -Math.sin(Math.PI * v), -Math.cos(Math.PI * v)).normalize();
        b.part("hair", placePlate(b, "head", at.addScaledVector(up, -0.006), up, back, (0.03 + 0.006 * (1 - Math.abs(i - 1))) * k, pick(at.y), 0.6));
    }
}

/** Srce-strelica na vrhu repa */
function addTailTip(b: AnimalBuild) {
    const k = b.k;
    const f = tailFrame(b, 1);
    const w = 0.05 * k;
    const g = finGeometry((t) => {
        // Srce: dva režnja pozadi, šiljak napred (duž repa)
        const a = t * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(a), 3);
        const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        return [(x / 17) * w, (-y / 17) * w + w * 0.6];
    }, 0.007 * k, b.quality);
    // Ravan srca: uspravna, šiljak u pravcu repa
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), f.tangent));
    g.translate(f.at.x, f.at.y, f.at.z);
    const marks = b.coat.marks ?? [];
    const c = marks.length > 2 ? rainbowAt(marks, 0.3, new THREE.Color()) : col(marks[0] ?? b.coat.fur);
    const arr = new Float32Array(g.getAttribute("position").count * 3);
    for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    const mesh = new THREE.Mesh(g, b.fur);
    mesh.name = "vrh-repa";
    onBone(b, "tail3", mesh);
    b.part("tail", mesh);
}

/** Mala krila na leđima: opna sa tri luka između „prstiju”, blago mašu */
function addWings(b: AnimalBuild) {
    const { shape } = b;
    const k = b.k;
    const marks = b.coat.marks ?? [];
    for (const side of [1, -1] as const) {
        const span = 0.2 * k;
        const pts: [number, number][] = [];
        const tips = [[0.0, 0.0], [span * 0.55, span * 0.75], [span, span * 0.5], [span * 0.95, span * 0.05], [span * 0.6, -span * 0.25], [span * 0.25, -span * 0.2]] as [number, number][];
        for (let i = 0; i < tips.length; i++) {
            const [x0, y0] = tips[i];
            const [x1, y1] = tips[(i + 1) % tips.length];
            for (let s = 0; s < 6; s++) {
                const t = s / 6;
                let x = x0 + (x1 - x0) * t;
                let y = y0 + (y1 - y0) * t;
                // Lukovi opne na donjoj ivici
                if (i >= 2 && i <= 4) {
                    const sag = Math.sin(Math.PI * t) * span * 0.08;
                    x -= sag * 0.6;
                    y += sag;
                }
                pts.push([x, y]);
            }
        }
        const g = finGeometry((t) => {
            const x = t * pts.length;
            const i = Math.floor(x) % pts.length;
            const j = (i + 1) % pts.length;
            const f = x - Math.floor(x);
            return [(pts[i][0] + (pts[j][0] - pts[i][0]) * f) * side, pts[i][1] + (pts[j][1] - pts[i][1]) * f];
        }, 0.006 * k, b.quality);
        // Krilo raste iz lopatice napolje-nazad (malo ka gore)
        g.rotateY(side * 0.55);
        const y = shape.chestY + 0.02;
        const root = new THREE.Vector3(side * 0.035 * k, y, -shape.torsoBack(y) + 0.004);
        const colors = new Float32Array(g.getAttribute("position").count * 3);
        const pos = g.getAttribute("position");
        const c = new THREE.Color();
        const base = col(marks.length > 2 ? "#C7AEFF" : marks[0] ?? b.coat.fur);
        for (let i = 0; i < pos.count; i++) {
            const d = Math.hypot(pos.getX(i), pos.getY(i)) / span;
            if (marks.length > 2) rainbowAt(marks, d * 0.8, c);
            else c.copy(base).multiplyScalar(0.85 + 0.2 * smoothstep(0.2, 1, d));
            colors.set([c.r, c.g, c.b], i * 3);
        }
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const mesh = new THREE.Mesh(g, b.fur);
        mesh.name = "krilo";
        const pivot = new THREE.Group();
        pivot.position.copy(root);
        pivot.add(mesh);
        onBone(b, "chest", pivot);
        b.part("tail", pivot);
        b.onAnimate((time, _dt, live) => {
            pivot.rotation.y = live ? side * Math.sin(time * 2.2) * 0.12 : 0;
        });
    }
}

export const DRAGON: AnimalSpec = {
    kind: "dragon",
    skins: MORE_SKINS.dragon,
    coats: DRAGON_COATS,
    shape: { kind: asMore("dragon"), girth: 1.08, belly: 1.14, pear: 0.22, limb: 1.06, legK: 0.92, head: { w: 0.38, h: 0.35, d: 0.37 } },
    ref: 0.46,
    head: {
        flat: 0.0,
        flatTop: 0.12,
        chin: 0.02,
        blobs: [
            { c: [0, -0.065, 0.1], r: [0.16, 0.11, 0.18], k: 0.06, muzzle: true },
        ],
        bumps: [
            { dir: [0.3, 0.12, 0.95], sigma: 0.12, amp: 0.008, mirror: true },
            { dir: [0.12, -0.15, 0.98], sigma: 0.06, amp: 0.006, muzzle: true, mirror: true },
        ],
        eye: { u: 0.092, v: 0.42, r: 0.06, inset: 0.68, yaw: 0.2 },
        noseV: 0.58,
        mouthV: 0.7,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 2, iris: 0.86, pupil: 0.42 },
        brow: { dv: 0.11, len: 0.065, thick: 0.009 },
        nose: { kind: "nostrils", w: 0.009, h: 0.006, d: 0.006, v: 0.575 },
        mouth: { w: 0.072, h: 0.05, curve: "smile", teeth: "fangs", wrap: 0.1, philtrum: 0, line: 0.003 },
    },
    tail: {
        points: [[0, 0, 0], [0, -0.06, -0.11], [0.04, -0.09, -0.23], [0.12, -0.08, -0.33], [0.22, -0.03, -0.38]],
        radius: (s) => 0.07 * Math.pow(1 - s, 0.9) + 0.012,
        motion: "sway",
        height: 0.07,
        sleek: true,
    },
    hands: "hand",
    feet: "paw",
    belly: 0.62,
    cheeks: 0,
    sleek: true,
    customHand: (b, side) => fingerHand(b, side, { fingers: 3, len: 0.62, thick: 0.27, claws: b.coat.hoof ?? "#FFF6E6" }),
    customFoot: (b, side) => toeFoot(b, side, { toes: 3, claws: b.coat.hoof ?? "#FFF6E6", thick: 0.2 }),
    extras: (b) => {
        addHorns(b, { u: 0.585, v: 0.14, points: [[0, 0, 0], [0.01, 0.05, -0.03], [0.02, 0.08, -0.08], [0.025, 0.09, -0.12]], r0: 0.024, r1: 0.006, color: b.coat.horn ?? "#FFF2D6" });
        addSpikes(b);
        addTailTip(b);
        addWings(b);
    },
    anchors: (a, b) => {
        // Bez spoljnih ušiju
        a.ears.kind = "none";
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintDragon,
};

registerCompanion(companionFrom(DRAGON));
