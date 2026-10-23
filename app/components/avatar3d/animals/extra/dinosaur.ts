// Dinosaurus (dobroćudan): okrugla glava sa kratkom zaobljenom njuškom i širokim osmehom,
// krupne vesele oči, svetao stomak sa poprečnim pločicama, niz zaobljenih šiljaka od temena
// preko leđa do vrha debelog repa, šake sa tri prsta i stopala sa tri prsta i kandžicama.

import * as THREE from "three";
import { registerCompanion, shade, type BoneName } from "../../contract";
import { polyPath } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { asKind, bellyMask, col, goldCoat, headLocal, isHead, rainbowAt, smoothstep } from "./common";
import { fingerHand, toeFoot } from "./hands";
import { cells3 } from "./kit/util";
import { EXTRA_SKINS } from "./skins.data";

function dino(fur: string, belly: string, spikes: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: belly,
        muzzle: shade(fur, 0.12),
        inner: belly,
        nose: shade(fur, -0.4),
        brow: shade(fur, -0.3),
        iris: ["#8A5A2A", "#2A180C"],
        pattern: "none",
        marks: [spikes],
        mouth: shade(fur, -0.6),
        hoof: "#FFF6E6",
        ...extra,
    };
}

export const DINO_COATS: Record<string, Coat> = {
    zeleni: dino("#6CC46A", "#F4EBA6", "#F6A93A"),
    plavi: dino("#5AA8E6", "#E6F4FF", "#FFD24A", { iris: ["#7A5A2A", "#2A180C"] }),
    narandzasti: dino("#F29A44", "#FFF0C8", "#6CC46A"),
    ljubicasti: dino("#A88AE6", "#F6E8FF", "#FF9DC8", { iris: ["#6A4A9A", "#24143A"] }),
    tufnasti: dino("#7CCB8A", "#FFF4C8", "#FF8FA8", { pattern: "none", earTips: "#3E9A5E" }),
    zlatni: goldCoat({ pattern: "gold", light: "#FFF6D0", marks: ["#FFFFFF"], hoof: "#FFF6D8", mouth: "#8A5A10" }),
    dugin: dino("#F6F2FA", "#FFFFFF", "#FFB3C7", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], iris: ["#C9A6F2", "#6A3FB0"] }),
};

const tmp = new THREE.Color();

function paintDino(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat, shape } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.2 + p.z, tmp), 0.65);
    // Tufnasti: krupne tamnije mrlje po leđima, glavi i repu
    if (coat.earTips) {
        const [d1] = cells3(p.x * 16, p.y * 16, p.z * 16, 7, 0.9);
        out.lerp(col(coat.earTips), (1 - smoothstep(0.26, 0.32, d1)) * 0.9);
    }
    const light = col(coat.light);
    switch (pp.region) {
        case "torso": {
            const m = bellyMask(ctx, p, 0.05, shape.neckBaseY + 0.04);
            // Pločice stomaka: svetle trake sa blagim žljebom između
            const bands = 0.5 + 0.5 * Math.cos(p.y * 95);
            out.lerp(light, m);
            out.multiplyScalar(1 - m * smoothstep(0.85, 1, bands) * 0.12);
            return;
        }
        case "hand":
        case "foot":
            out.multiplyScalar(0.94);
            return;
        case "tail":
            out.lerp(light, smoothstep(0.2, -0.6, (p.y - shape.crotchY) * 8) * 0.3);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Svetla donja vilica i grlo (nastavak stomaka), rumeni obrazi
    out.lerp(light, (1 - smoothstep(-0.62, -0.42, q.y)) * smoothstep(-0.3, 0.2, q.z));
    const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.04) ** 2 + ((p.y - e.y + 0.06) / 0.03) ** 2))));
    out.lerp(col("#FF9C9C"), cheek * 0.3);
}

/** Zaobljena trouglasta pločica (šiljak na leđima): osnova na y = 0, raste po +y */
function plateGeometry(h: number, l: number, quality: "high" | "low"): THREE.BufferGeometry {
    const g = new THREE.SphereGeometry(1, quality === "high" ? 18 : 10, quality === "high" ? 12 : 7);
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const t = Math.max(0, y);
        // Šiljasto gore, debelo dole; vrh blago povijen unazad
        pos.setXYZ(i, x * 0.22 * (1 - 0.6 * t), y, z * (1 - 0.72 * Math.pow(t, 1.3)) - t * t * 0.18);
    }
    g.scale(h * 0.55, h, l * 0.5);
    g.translate(0, h * 0.2, 0);
    g.computeVertexNormals();
    return g;
}

function addSpikes(b: AnimalBuild) {
    const { shape } = b;
    const mat = b.fur;
    const spikes = new THREE.Color();
    const place = (bone: BoneName | string, at: THREE.Vector3, up: THREE.Vector3, h: number, back: THREE.Vector3) => {
        const g = plateGeometry(h, h * 1.15, b.quality);
        // Orijentacija: +y pločice → napolje, +z pločice → napred duž kičme (naspram `back`)
        const fwd = back.clone().negate();
        fwd.addScaledVector(up, -fwd.dot(up)).normalize();
        const m = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(up, fwd).normalize(), up, fwd);
        g.applyMatrix4(m);
        g.translate(at.x, at.y, at.z);
        const colors = new Float32Array(g.getAttribute("position").count * 3);
        const marks = b.coat.marks ?? [];
        if (marks.length > 2) rainbowAt(marks, at.y * 2.6, spikes);
        else spikes.copy(col(marks[0] ?? b.coat.fur));
        const pos = g.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
            const d = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(at).dot(up) / h;
            const k = 0.78 + 0.22 * smoothstep(0, 0.9, d);
            colors.set([spikes.r * k, spikes.g * k, spikes.b * k], i * 3);
        }
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const boneObj = b.bone(bone as string)!;
        const mesh = new THREE.Mesh(g, mat);
        mesh.position.copy(b.boneAt(bone as string)).negate();
        boneObj.add(mesh);
        return mesh;
    };
    // Leđa: od vrata do krsta
    const n = 5;
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = shape.neckBaseY - 0.02 - t * (shape.neckBaseY - shape.crotchY - 0.06);
        const at = new THREE.Vector3(0, y, -shape.torsoBack(y) + 0.01);
        const bone: BoneName = y > shape.chestY - 0.02 ? "chest" : y > shape.waistY - 0.02 ? "spine" : "hips";
        const h = 0.034 + 0.016 * Math.sin(Math.PI * (0.25 + t * 0.6));
        b.part("tail", place(bone, at, new THREE.Vector3(0, 0.25, -1).normalize(), h, new THREE.Vector3(0, -1, -0.15).normalize()));
    }
    // Rep: pločice duž putanje, sve manje ka vrhu
    const pts = b.spec.tail!.points.map(([x, yy, z]) => new THREE.Vector3(x, yy, z));
    const y0 = shape.crotchY + (b.spec.tail!.height ?? 0.06);
    const base = new THREE.Vector3(0, y0, -shape.torsoBack(y0) + 0.014);
    const path = polyPath(pts.map((p) => p.clone().add(base)));
    const tail = b.spec.tail!;
    for (let i = 0; i < 4; i++) {
        const s = 0.18 + i * 0.22;
        const at = path(s, new THREE.Vector3());
        const tangent = path(Math.min(1, s + 0.02), new THREE.Vector3()).sub(at).normalize();
        const up = new THREE.Vector3(0, 1, 0).addScaledVector(tangent, -tangent.y).normalize();
        at.addScaledVector(up, tail.radius(s) * 0.85);
        const bone = s < 0.35 ? "tail1" : s < 0.7 ? "tail2" : "tail3";
        b.part("tail", place(bone, at, up, 0.032 - i * 0.005, tangent));
    }
    // Teme: tri male pločice (kapa ih sakriva kao kosu)
    const head = b.head;
    const headBone = b.boneAt("head");
    for (let i = 0; i < 3; i++) {
        const v = 0.04 + i * 0.12;
        const at = head.point(0, v).add(headBone);
        const up = head.normal(0, v);
        const back = new THREE.Vector3(0, -Math.sin(Math.PI * v), -Math.cos(Math.PI * v)).normalize();
        const mesh = place("head", at.addScaledVector(up, -0.008), up, 0.026 + 0.006 * (1 - Math.abs(i - 1)), back);
        b.part("hair", mesh);
    }
}

export const DINOSAUR: AnimalSpec = {
    kind: "dinosaur",
    skins: EXTRA_SKINS.dinosaur,
    coats: DINO_COATS,
    shape: { kind: asKind("dinosaur"), girth: 1.1, belly: 1.15, pear: 0.25, limb: 1.1, head: { w: 0.46, h: 0.41, d: 0.44 } },
    head: {
        flat: 0.0,
        flatTop: 0.12,
        chin: 0.0,
        blobs: [
            // Zaobljena njuška napred i široka donja vilica
            { c: [0, -0.06, 0.09], r: [0.17, 0.12, 0.17], k: 0.06, muzzle: true },
        ],
        bumps: [
            { dir: [0.3, 0.12, 0.95], sigma: 0.12, amp: 0.008, mirror: true },
            { dir: [0.36, 0.0, 0.93], sigma: 0.11, amp: -0.005, mirror: true },
        ],
        eye: { u: 0.09, v: 0.42, r: 0.055, inset: 0.45, yaw: 0.2 },
        noseV: 0.6,
        mouthV: 0.7,
    },
    face: {
        eye: { upper: 0.62, lower: -0.8, lashes: 1, iris: 0.86, pupil: 0.46 },
        brow: { dv: 0.105, len: 0.065, thick: 0.009 },
        nose: { kind: "nostrils", w: 0.007, h: 0.005, d: 0.005, v: 0.585 },
        mouth: { w: 0.07, h: 0.05, curve: "smile", teeth: "row", wrap: 0.1, philtrum: 0, line: 0.003 },
    },
    tail: {
        points: [[0, 0, 0], [0, -0.05, -0.11], [0.02, -0.09, -0.24], [0.06, -0.1, -0.37], [0.11, -0.085, -0.47]],
        radius: (s) => 0.075 * Math.pow(1 - s, 0.9) + 0.012,
        motion: "sway",
        height: 0.07,
    },
    hands: "paw",
    feet: "paw",
    belly: 0.62,
    cheeks: 0,
    sleek: true,
    customHand: (b, side) => fingerHand(b, side, { fingers: 3, len: 0.62, thick: 0.28, claws: b.coat.hoof ?? "#FFF6E6" }),
    customFoot: (b, side) => toeFoot(b, side, { toes: 3, claws: b.coat.hoof ?? "#FFF6E6", thick: 0.2 }),
    extras: addSpikes,
    paint: paintDino,
};

registerCompanion(companionFrom(DINOSAUR));
