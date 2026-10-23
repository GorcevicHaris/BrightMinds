// Ježić: svetlo lice sa šiljatom njuškom i okruglim crnim nosićem, male okrugle uši, bodlje
// (tamne pri korenu, svetli vrhovi) po temenu i potiljku — kapa ih sakriva kao kosu — i niz leđa
// do repića; svetao stomak i šape.

import * as THREE from "three";
import { registerCompanion, shade, type BoneName } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { furMaterial } from "../materials";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES, mergeWithColor } from "../parts";
import { asKind, bellyMask, col, goldCoat, headLocal, isHead, rainbowAt, scaleOf, smoothstep, torsoAngle } from "./common";
import { rand } from "./kit/util";
import { EXTRA_SKINS } from "./skins.data";

function hedgehog(spines: string, tips: string, face: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur: shade(spines, 0.25),
        light: face,
        muzzle: face,
        inner: "#F2B8B8",
        nose: "#2A2228",
        brow: shade(spines, -0.1),
        iris: ["#7A5A3A", "#24140A"],
        pattern: "none",
        marks: [spines, tips],
        ...extra,
    };
}

export const HEDGEHOG_COATS: Record<string, Coat> = {
    braon: hedgehog("#6A4A38", "#F2E2CC", "#F4DEC4"),
    svetli: hedgehog("#A8866A", "#FFF4E4", "#FBEBDA"),
    beli: hedgehog("#E8E2DA", "#FFFFFF", "#FFF6F0", { nose: "#E08A9A", iris: ["#B07A8A", "#5A2A3A"] }),
    roze: hedgehog("#E886AE", "#FFF0F6", "#FFE8F0", { nose: "#B04A6E" }),
    zlatni: goldCoat({ pattern: "none", marks: ["#C9921C", "#FFF4C8"], light: "#FFF4D0", muzzle: "#FFF4D0", fur: "#E8B84A", shimmer: true }),
    dugin: hedgehog("#B79CFF", "#FFFFFF", "#FFF6FA", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], iris: ["#C9A6F2", "#6A3FB0"] }),
};

function paintHedgehog(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat, shape } = ctx;
    const p = pp.p;
    const light = col(coat.light);
    switch (pp.region) {
        case "torso": {
            // Leđa tamnija (koža ispod bodlji), stomak svetao
            const back = smoothstep(1.2, 2.2, Math.abs(torsoAngle(p)));
            out.lerp(col(coat.marks?.[0] ?? coat.fur), back * 0.6);
            out.lerp(light, bellyMask(ctx, p, 0.2, shape.neckBaseY + 0.04));
            return;
        }
        case "hand":
        case "foot":
            out.copy(light).multiplyScalar(0.92);
            return;
        case "ear":
            if (pp.inner) out.lerp(col(coat.inner), 0.85);
            else out.copy(light);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Lice svetlo; teme i potiljak tamni (tu rastu bodlje), granica kao kapuljača
    const cap = smoothstep(0.0, 0.25, q.y + (0.5 - Math.max(0, q.z)) * 0.55 - 0.18);
    out.copy(light).lerp(col(coat.marks?.[0] ?? coat.fur), cap * 0.85);
}

/** Bodlje: kupe u gustom rasporedu (zlatni ugao), boje od korena (tamno) ka vrhu (svetlo) */
function spineMesh(b: AnimalBuild, points: { at: THREE.Vector3; dir: THREE.Vector3; len: number }[], bone: BoneName | "head"): THREE.Mesh {
    const k = scaleOf(b);
    const hi = b.quality === "high";
    const parts: THREE.BufferGeometry[] = [];
    const marks = b.coat.marks ?? [b.coat.fur, "#FFFFFF"];
    const rainbow = marks.length > 2;
    const root = col(rainbow ? "#8A6AAA" : marks[0]);
    const tip = col(rainbow ? "#FFFFFF" : marks[1] ?? "#FFFFFF");
    const rb = new THREE.Color();
    const c = new THREE.Color();
    points.forEach((s, i) => {
        const g = new THREE.ConeGeometry(0.0135 * k, s.len, hi ? 6 : 4, 1);
        g.translate(0, s.len / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.dir));
        g.translate(s.at.x, s.at.y, s.at.z);
        const pos = g.getAttribute("position");
        const colors = new Float32Array(pos.count * 3);
        if (rainbow) rainbowAt(marks, i * 0.071, rb);
        for (let v = 0; v < pos.count; v++) {
            const t = new THREE.Vector3(pos.getX(v), pos.getY(v), pos.getZ(v)).sub(s.at).dot(s.dir) / s.len;
            c.copy(rainbow ? rb : root).lerp(tip, smoothstep(0.55, 0.9, t));
            colors.set([c.r, c.g, c.b], v * 3);
        }
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        parts.push(g);
    });
    const mesh = new THREE.Mesh(mergeWithColor(parts), furMaterial({ sheen: b.coat.light, sleek: true }));
    mesh.name = "bodlje";
    if (bone !== "head") {
        mesh.position.copy(b.boneAt(bone)).negate();
        b.bone(bone)!.add(mesh);
    } else {
        b.headGroup.add(mesh);
    }
    return mesh;
}

function addSpines(b: AnimalBuild) {
    const k = scaleOf(b);
    const head = b.head;
    const shape = b.shape;
    // Glava: teme i potiljak (iza linije lica)
    const onHead: { at: THREE.Vector3; dir: THREE.Vector3; len: number }[] = [];
    const n = b.quality === "high" ? 260 : 140;
    for (let i = 0; i < n; i++) {
        const y = 1 - (2 * (i + 0.5)) / n;
        const r = Math.sqrt(1 - y * y);
        const phi = i * 2.399963;
        const d = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
        // Samo iza i iznad lica: ne na licu, ne ispod potiljka
        const face = d.z > 0.1 && d.y < 0.55 - d.z * 0.3;
        if (face || d.y < -0.35 || (d.z > 0.45 && d.y < 0.75)) continue;
        const [u, v] = head.uvOf(d);
        const at = head.point(u, v);
        const nn = head.normal(u, v);
        const dir = nn.clone().add(new THREE.Vector3(0, 0.1, -0.75)).normalize();
        onHead.push({ at: at.addScaledVector(nn, -0.004 * k), dir, len: (0.045 + 0.018 * rand(i, 3)) * k });
    }
    b.part("hair", spineMesh(b, onHead, "head"));
    // Leđa: od ramena do krsta, po kostima trupa
    const byBone: Record<"chest" | "spine" | "hips", { at: THREE.Vector3; dir: THREE.Vector3; len: number }[]> = { chest: [], spine: [], hips: [] };
    const rows = b.quality === "high" ? 12 : 8;
    for (let r = 0; r < rows; r++) {
        const y = shape.shoulderY + 0.01 - (r / (rows - 1)) * (shape.shoulderY - shape.crotchY - 0.02);
        const count = 9;
        for (let c = 0; c < count; c++) {
            const a = Math.PI + (c - (count - 1) / 2) * 0.27 + (r % 2) * 0.135;
            const x = Math.sin(a) * shape.torsoW(y) * 0.98;
            const z = a > Math.PI / 2 && a < Math.PI * 1.5 ? -shape.torsoBack(y) * Math.abs(Math.cos(a)) * 0.98 : 0;
            const at = new THREE.Vector3(x, y, z);
            const dir = new THREE.Vector3(Math.sin(a) * 0.7, 0.35, -0.9).normalize();
            const bone = y > shape.chestY - 0.02 ? "chest" : y > shape.waistY - 0.02 ? "spine" : "hips";
            byBone[bone].push({ at, dir, len: (0.05 + 0.015 * rand(r * 10 + c, 5)) * k });
        }
    }
    for (const bone of ["chest", "spine", "hips"] as const) b.part("tail", spineMesh(b, byBone[bone], bone));
}

export const HEDGEHOG: AnimalSpec = {
    kind: "hedgehog",
    skins: EXTRA_SKINS.hedgehog,
    coats: HEDGEHOG_COATS,
    shape: { kind: asKind("hedgehog"), girth: 1.08, belly: 1.14, pear: 0.2, limb: 0.96, legK: 0.85, head: { w: 0.36, h: 0.33, d: 0.36 } },
    ref: 0.43,
    head: {
        flat: 0.0,
        flatTop: 0.1,
        chin: 0.1,
        blobs: [
            // Šiljata njuška napred
            { c: [0, -0.075, 0.16], r: [0.075, 0.065, 0.18], k: 0.06, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.0, 0.93], sigma: 0.12, amp: -0.006, mirror: true }],
        eye: { u: 0.095, v: 0.46, r: 0.054, inset: 0.68, yaw: 0.2 },
        noseV: 0.6,
        mouthV: 0.68,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 1, iris: 0.98, pupil: 0.52 },
        brow: { dv: 0.11, len: 0.05, thick: 0.008 },
        nose: { kind: "button", w: 0.021, h: 0.018, d: 0.018, lift: 0.35, v: 0.59 },
        mouth: { w: 0.036, h: 0.05, curve: "smile", teeth: "none", wrap: 0.06, philtrum: 0.01, line: 0.0024 },
    },
    ears: {
        kind: "round",
        shape: { len: 0.06, width: 0.065, depth: 0.03, profile: EAR_PROFILES.round, cup: 0.6, inner: 0.62 },
        u: 0.66,
        v: 0.3,
        sink: 0.008,
        tilt: [0, 0.2, 0.9],
        inner: "pad",
    },
    tail: { points: [[0, 0, 0], [0, 0.0, -0.02], [0, -0.005, -0.035]], radius: profile([[0, 0.02], [1, 0.012]]), motion: "flick", height: 0.04 },
    hands: "paw",
    feet: "paw",
    belly: 0.7,
    cheeks: 0,
    extras: addSpines,
    paint: paintHedgehog,
};

registerCompanion(companionFrom(HEDGEHOG));
