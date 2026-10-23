// Sova: telo kao jaje, krupna glava sa svetlim „tanjirima” oko ogromnih očiju (lice je malo
// udubljeno), mali kljun koji se otvara dok govori, čuperci perja na temenu, krila umesto ruku
// (pera-prsti na kraju), svetle grudi sa šarom „strelica”, kratke noge sa narandžastim prstima
// i lepeza perja kao rep.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { merge } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { hornyMaterial } from "../materials";
import { paintGeometry, type PaintContext, type PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asKind, bellyMask, col, goldCoat, headLocal, isHead, rainbowAt, smoothstep, torsoAngle } from "./common";
import { toeFoot, wingHand } from "./hands";
import { EXTRA_SKINS } from "./skins.data";

function owl(fur: string, disc: string, chest: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: chest,
        muzzle: disc,
        inner: shade(fur, -0.2),
        nose: "#F2B33A",
        brow: shade(fur, -0.3),
        iris: ["#FFC93A", "#D9791A"],
        pattern: "none",
        beak: "#F2B33A",
        paws: "#F2A43A",
        marks: [shade(fur, -0.35)],
        ...extra,
    };
}

export const OWL_COATS: Record<string, Coat> = {
    braon: owl("#9A6A44", "#F6E2C6", "#F2DDBE"),
    siva: owl("#8E8E98", "#EEEEF2", "#E6E4EA", { iris: ["#FFD24A", "#D98A1A"] }),
    snezna: owl("#F6F6F8", "#FFFFFF", "#FFFFFF", { marks: ["#3A3A44"], iris: ["#FFD24A", "#D98A1A"], beak: "#3A3A44", nose: "#3A3A44", paws: "#E6E2DA" }),
    roze: owl("#E98AB0", "#FFE6F0", "#FFDCEA", { iris: ["#9AD6FF", "#2A74C0"] }),
    nocna: owl("#3E4A7A", "#C9D2F2", "#B9C4EE", { marks: ["#FFF6C8"], iris: ["#FFE48A", "#C08A1A"], shimmer: true }),
    zlatna: goldCoat({ pattern: "none", muzzle: "#FFF4CC", light: "#FFF0B8", beak: "#E8902A", paws: "#E8902A", marks: ["#C08A1E"] }),
    duga: owl("#F6F0FA", "#FFFFFF", "#FFFFFF", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], iris: ["#C9A6F2", "#6A3FB0"] }),
};

const tmp = new THREE.Color();

/** Šara „strelica” na grudima: redovi malih tamnih lukova */
function chevrons(p: THREE.Vector3): number {
    const row = p.y * 42;
    const fy = row - Math.floor(row);
    const col0 = p.x * 30 + (Math.floor(row) % 2) * 0.5;
    const fx = col0 - Math.floor(col0) - 0.5;
    const arc = Math.abs(fy - 0.45 - fx * fx * 1.6);
    return (1 - smoothstep(0.06, 0.14, arc)) * (1 - smoothstep(0.3, 0.45, Math.abs(fx)));
}

function paintOwl(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat, shape } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    const rainbow = marks.length > 2;
    if (rainbow) out.lerp(rainbowAt(marks, p.y * 2.4, tmp), 0.7);
    const mark = rainbow ? col("#B59AD0") : col(marks[0] ?? coat.fur);
    switch (pp.region) {
        case "torso": {
            const chest = bellyMask(ctx, p, 0.25, shape.neckBaseY + 0.03);
            out.lerp(col(coat.light), chest);
            out.lerp(mark, chevrons(p) * chest * 0.55 * smoothstep(shape.crotchY + 0.04, shape.waistY, p.y));
            // Leđa: svetle tačkice
            const back = smoothstep(1.8, 2.6, Math.abs(torsoAngle(p)));
            out.lerp(col(coat.light), chevrons(p.clone().multiplyScalar(0.7)) * back * 0.5);
            return;
        }
        case "arm":
        case "hand": {
            // Krila: tamnija, sa svetlim prugama pri kraju (vrh krila je perje, ne šapa)
            if (pp.region === "hand") out.copy(col(coat.fur));
            if (rainbow) out.lerp(tmp, 0.7);
            out.multiplyScalar(0.84);
            const bars = 0.5 + 0.5 * Math.sin(p.y * 90);
            out.lerp(col(coat.light), smoothstep(0.75, 0.95, bars) * smoothstep(0.4, 1, pp.t ?? 1) * 0.45);
            return;
        }
        case "leg":
        case "foot":
            out.lerp(col(coat.light), 0.6);
            return;
        case "ear":
            out.multiplyScalar(0.85);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Tanjiri lica: svetao krug oko svakog oka sa tamnijim obodom
    let disc = 0;
    let rim = 0;
    for (const e of ctx.eyes) {
        const d = Math.hypot((p.x - e.x) / (ctx.eyeR * 2.05), (p.y - e.y + ctx.eyeR * 0.1) / (ctx.eyeR * 2.25), (p.z - e.z) / (ctx.eyeR * 4));
        disc = Math.max(disc, 1 - smoothstep(0.86, 1.0, d));
        rim = Math.max(rim, Math.exp(-(((d - 1.06) / 0.07) ** 2)));
    }
    const front = smoothstep(0, 0.35, q.z);
    out.lerp(col(coat.muzzle), disc * front);
    out.lerp(mark, rim * front * (1 - disc) * 0.6);
    // „Obrve” perja: svetao V iznad kljuna
    const v = Math.exp(-(((q.y - 0.25 + Math.abs(q.x) * 0.9) / 0.06) ** 2)) * (1 - smoothstep(0.2, 0.45, Math.abs(q.x)));
    out.lerp(col(coat.muzzle), v * front * 0.6);
}

/** Kljun: gornji (zakrivljena kupa naniže) i donji (mali, otvara se pri govoru) */
function buildBeak(b: AnimalBuild): { group: THREE.Group; setJaw: (open: number, smile: number) => void } {
    const head = b.head;
    const v = head.spec.noseV;
    const at = head.point(0.5, v);
    const n = head.normal(0.5, v);
    const group = new THREE.Group();
    group.position.copy(at).addScaledVector(n, -0.004);
    group.lookAt(group.position.clone().add(n));
    const mat = hornyMaterial(b.coat.beak ?? "#F2B33A", 0.35);
    const hi = b.quality === "high";
    // Gornji kljun: kupa po z (napred), savijena naniže ka vrhu
    const upper = new THREE.ConeGeometry(0.024, 0.05, hi ? 24 : 12, hi ? 10 : 5);
    upper.rotateX(Math.PI / 2);
    upper.translate(0, 0, 0.025);
    const pos = upper.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const t = Math.max(0, z / 0.05);
        pos.setY(i, pos.getY(i) * (1 - 0.25 * t) - t * t * 0.022);
        pos.setX(i, pos.getX(i) * 1.15);
    }
    upper.computeVertexNormals();
    const upperMesh = new THREE.Mesh(upper, mat);
    const lowerPivot = new THREE.Group();
    lowerPivot.position.set(0, -0.012, 0.004);
    const lower = new THREE.SphereGeometry(1, hi ? 18 : 10, hi ? 10 : 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    lower.scale(0.016, 0.01, 0.026);
    lower.translate(0, 0, 0.012);
    lowerPivot.add(new THREE.Mesh(lower, hornyMaterial(shade(b.coat.beak ?? "#F2B33A", -0.12), 0.4)));
    group.add(upperMesh, lowerPivot);
    return {
        group,
        setJaw: (open) => {
            lowerPivot.rotation.x = open * 0.55;
        },
    };
}

export const OWL: AnimalSpec = {
    kind: "owl",
    skins: EXTRA_SKINS.owl,
    coats: OWL_COATS,
    shape: { kind: asKind("owl"), girth: 1.14, belly: 1.12, pear: 0.45, leg: 0.17, arm: 0.21, limb: 1.04, head: { w: 0.5, h: 0.42, d: 0.42 } },
    head: {
        flat: 0.3,
        flatTop: 0.25,
        chin: 0.04,
        blobs: [{ c: [0, -0.05, 0], r: [0.25, 0.17, 0.2], k: 0.07 }],
        bumps: [
            // Tanjiri lica: plitka udubljenja oko očiju (perje se diže po obodu)
            { dir: [0.38, 0.0, 0.92], sigma: 0.24, amp: -0.012, mirror: true },
            { dir: [0, -0.15, 1], sigma: 0.1, amp: 0.008 },
        ],
        eye: { u: 0.088, v: 0.5, r: 0.064, inset: 0.48, yaw: 0.16 },
        noseV: 0.58,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.6, lower: -0.82, lashes: 2, iris: 0.86, pupil: 0.46 },
        brow: { dv: 0.13, len: 0.07, thick: 0.009 },
        nose: { kind: "none", w: 0, h: 0, d: 0 },
        mouth: { w: 0.02, h: 0.02, curve: "smile", teeth: "none", wrap: 0.06, philtrum: 0, line: 0.002 },
    },
    ears: {
        kind: "pointy",
        shape: { len: 0.1, width: 0.075, depth: 0.03, profile: EAR_PROFILES.pointy, cup: 0.2, bend: 0.02, tufts: 4 },
        u: 0.62,
        v: 0.13,
        sink: 0.012,
        tilt: [-0.15, 0.1, 0.55],
        inner: "fur",
    },
    hands: "flipper",
    feet: "paw",
    belly: 0.6,
    cheeks: 0,
    sleek: true,
    earMotion: "twitch",
    customHand: (b, side) => wingHand(b, side),
    customFoot: (b, side) => toeFoot(b, side, { toes: 3, color: b.coat.paws ?? "#F2A43A", claws: "#3A2A24", thick: 0.16, back: true }),
    extras: (b) => {
        const beak = buildBeak(b);
        b.face = { mouth: beak.group, setJaw: beak.setJaw };
        // Rep: lepeza od pet pera na kostima kukova
        const hips = b.bone("hips")!;
        const shape = b.shape;
        const y = shape.crotchY + 0.03;
        const base = new THREE.Vector3(0, y, -shape.torsoBack(y) + 0.02);
        const parts: THREE.BufferGeometry[] = [];
        for (let k = 0; k < 5; k++) {
            const a = (k - 2) * 0.28;
            const f = new THREE.SphereGeometry(1, 14, 10);
            f.scale(0.028, 0.008, 0.075);
            f.translate(0, 0, -0.06);
            f.rotateX(0.55);
            f.rotateY(a);
            f.translate(base.x, base.y, base.z);
            parts.push(f);
        }
        const tail = merge(parts);
        paintGeometry(tail, b.paint, (_i, p) => ({ p, region: "arm", t: 1 }));
        const mesh = new THREE.Mesh(tail, b.fur);
        mesh.position.copy(b.boneAt("hips")).negate();
        hips.add(mesh);
        b.part("tail", mesh);
    },
    anchors: (a) => {
        // Kljun je „nos” (naočare sede iznad njega)
        a.nose.snout = 0.04;
    },
    paint: paintOwl,
};

registerCompanion(companionFrom(OWL));
