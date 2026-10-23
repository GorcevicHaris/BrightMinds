// Ovčica: telo u mekoj vuni (grudvasta ljuska preko trupa, nadlaktica i butina — ispupčenja su
// manja od debljine odeće, pa duks i dalje pristaje), kovrdžava kapica vune na temenu (kapa je
// sakriva kao kosu), glatko lice druge boje, male klempave uši, tanke noge i kopita.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { armPath, legPath, limbSurface, torsoPoint, torsoSurface } from "../../engine/body";
import { armWeights, legWeights, torsoWeights } from "../../engine/rig";
import { buildSurface, profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { furMaterial } from "../materials";
import { paintGeometry, type PaintContext, type PaintPoint } from "../paint";
import { clumpGeometry, EAR_PROFILES, furUv, type Clump } from "../parts";
import { asKind, col, goldCoat, headLocal, isHead, rainbowAt, scaleOf, smoothstep } from "./common";
import { cells3 } from "./kit/util";
import { EXTRA_SKINS } from "./skins.data";

function sheep(wool: string, face: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur: wool,
        light: shade(wool, 0.2),
        muzzle: face,
        inner: "#F2B8C0",
        nose: shade(face, -0.45),
        brow: shade(face, -0.25),
        iris: ["#8A6446", "#2A180C"],
        pattern: "none",
        paws: face,
        hoof: shade(face, -0.5),
        ...extra,
    };
}

export const SHEEP_COATS: Record<string, Coat> = {
    bela: sheep("#FBF8F2", "#F2DCCB", { nose: "#C9909A" }),
    crna: sheep("#4A454E", "#2A262C", { light: "#6A646E", iris: ["#B08A5A", "#4A2A12"], nose: "#141014" }),
    smedja: sheep("#C29670", "#6E4E3C"),
    roze: sheep("#FFD2E4", "#FFF0F4", { nose: "#D98AA4", iris: ["#B57A9A", "#5A1E3E"], hoof: "#C2537E" }),
    plava: sheep("#C6DCFF", "#FFFFFF", { nose: "#8AA6D6", iris: ["#6A8AC8", "#1E345E"], hoof: "#5E7EB6" }),
    zlatna: goldCoat({ pattern: "gold", muzzle: "#FFF4D6", paws: "#FFF4D6", hoof: "#9A6A1E", nose: "#B07A3A" }),
    duga: sheep("#FFFFFF", "#FFF6FA", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], nose: "#C99AB0", iris: ["#C9A6F2", "#6A3FB0"], hoof: "#8A6AAA" }),
};

const tmp = new THREE.Color();

/** Grudvice vune: 0 u udubljenju između grudvica, 1 na vrhu grudvice */
function woolLump(p: THREE.Vector3): number {
    const [d1] = cells3(p.x * 30, p.y * 30, p.z * 30, 61, 0.8);
    return Math.sqrt(Math.max(0, 1 - d1 * d1 * 2.2));
}

function paintSheep(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    const face = col(coat.muzzle);
    switch (pp.region) {
        case "torso":
        case "tail":
            if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 3 + p.x, tmp), 0.65);
            return;
        case "arm":
        case "leg": {
            // Vuna gore, tanka noga u boji lica dole
            const t = pp.t ?? 0;
            const wool = 1 - smoothstep(pp.region === "arm" ? 0.42 : 0.3, pp.region === "arm" ? 0.55 : 0.42, t);
            if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 3 + p.x, tmp), 0.65 * wool);
            out.lerp(col(coat.paws ?? coat.muzzle), 1 - wool);
            return;
        }
        case "hand":
        case "foot":
            out.copy(col(coat.paws ?? coat.muzzle));
            return;
        case "ear":
            out.copy(face).lerp(col(coat.inner), (pp.inner ?? 0) * 0.85);
            return;
        default:
            if (!isHead(pp)) return;
    }
    // Lice glatko u svojoj boji, teme i potiljak u vuni
    const q = headLocal(ctx, p);
    const woolCap = smoothstep(0.25, 0.5, q.y + Math.max(0, -q.z) * 0.6);
    out.copy(face).lerp(col(coat.fur), woolCap);
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 3, tmp), woolCap * 0.6);
}

/** Vunena ljuska: trup + nadlaktice + butine, grudvasta, na kostima tela */
function addWool(b: AnimalBuild) {
    const { shape, rig } = b;
    const hi = b.quality === "high";
    const amp = 0.0075 * scaleOf(b);
    const q = new THREE.Vector3();
    const lump = (a: number, y: number) => {
        torsoPoint(shape, a, y, 0, q);
        return amp * (woolLump(q) - 0.25);
    };
    const y0 = shape.crotchY - 0.012;
    const y1 = shape.neckBaseY + 0.012;
    const fn = torsoSurface(shape, y0, y1, 0.002, lump);
    const torso = buildSurface(fn, {
        nu: hi ? 56 : 36,
        nv: hi ? 48 : 28,
        closedU: true,
        inside: (_u, v, out) => out.set(0, y0 + (y1 - y0) * v, 0),
        weights: (_u, _v, p) => torsoWeights(shape, p),
        uv: furUv(Math.PI * 2 * shape.torsoW(shape.waistY), y1 - y0),
    });
    const ao = (p: THREE.Vector3) => (1 - woolLump(p)) * 0.45;
    paintGeometry(torso, b.paint, (_i, p) => ({ p, region: "torso", ao: ao(p) }));
    const meshes: THREE.SkinnedMesh[] = [new THREE.SkinnedMesh(torso, b.fur)];
    for (const side of [1, -1] as const) {
        // Grudvice na rukavu vune: šum po uglu i dužini ruke (tačka „na valjku”)
        const arm = armPath(rig, side, 0.002, (t, a) => {
            q.set(side + Math.sin(a) * 0.045, t * shape.upperArm * 2, Math.cos(a) * 0.045);
            return amp * (woolLump(q) - 0.25) * (1 - smoothstep(0.4, 0.5, t));
        });
        const armGeo = buildSurface(limbSurface(arm, 0, 0.5), {
            nu: hi ? 24 : 16,
            nv: hi ? 14 : 10,
            closedU: true,
            inside: (_u, v, out) => arm.spec.path(arm.sAt(v * 0.5), out),
            weights: (_u, _v, p) => armWeights(rig, side, p),
            uv: furUv(Math.PI * 2 * shape.armR(0.3), shape.upperArm),
        });
        paintGeometry(armGeo, b.paint, (_i, p) => ({ p, region: "torso", ao: ao(p) }));
        meshes.push(new THREE.SkinnedMesh(armGeo, b.fur));
        const leg = legPath(rig, side, 0.002);
        const legGeo = buildSurface(limbSurface(leg, 0, 0.36), {
            nu: hi ? 24 : 16,
            nv: hi ? 12 : 8,
            closedU: true,
            inside: (_u, v, out) => leg.spec.path(leg.sAt(v * 0.36), out),
            weights: (_u, _v, p) => legWeights(rig, side, p),
            uv: furUv(Math.PI * 2 * shape.legR(0.2), shape.thigh),
        });
        paintGeometry(legGeo, b.paint, (_i, p) => ({ p, region: "torso", ao: ao(p) }));
        meshes.push(new THREE.SkinnedMesh(legGeo, b.fur));
    }
    const root = b.rig.root.parent ?? b.headGroup;
    for (const mesh of meshes) {
        mesh.name = "vuna";
        mesh.frustumCulled = false;
        root.add(mesh);
        mesh.bind(b.rig.skeleton, new THREE.Matrix4());
    }
    // Kovrdžava kapica na temenu (i čuperak preko čela)
    const head = b.head;
    const k = scaleOf(b);
    const clumps: Clump[] = [];
    const n = hi ? 34 : 20;
    for (let i = 0; i < n; i++) {
        const y = 1 - (i + 0.5) / n;
        const r = Math.sqrt(1 - y * y);
        const phi = i * 2.399963;
        const d = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
        if (d.y < 0.35 - Math.max(0, -d.z) * 0.6 || (d.z > 0.55 && d.y < 0.6)) continue;
        const [u, v] = head.uvOf(d);
        const base = head.point(u, v);
        const nn = head.normal(u, v);
        clumps.push({ base: base.addScaledVector(nn, -0.006 * k), dir: nn, len: 0.03 * k, r: 0.026 * k, curl: new THREE.Vector3(-d.z, 0, d.x).normalize(), color: b.coat.fur, flat: 0.9 });
    }
    const cap = new THREE.Mesh(clumpGeometry(clumps, b.quality), furMaterial({ sheen: b.coat.light }));
    b.headGroup.add(cap);
    b.part("hair", cap);
}

export const SHEEP: AnimalSpec = {
    kind: "sheep",
    skins: EXTRA_SKINS.sheep,
    coats: SHEEP_COATS,
    shape: { kind: asKind("sheep"), girth: 1.14, belly: 1.1, limb: 0.9, legK: 0.95, head: { w: 0.35, h: 0.34, d: 0.35 } },
    ref: 0.43,
    head: {
        flat: 0.06,
        flatTop: 0.05,
        chin: 0.12,
        blobs: [
            // Duguljasto lice sa mekom njuškom
            { c: [0, -0.075, 0.1], r: [0.11, 0.1, 0.14], k: 0.06, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.0, 0.93], sigma: 0.12, amp: -0.006, mirror: true }],
        eye: { u: 0.092, v: 0.47, r: 0.058, inset: 0.68, yaw: 0.18 },
        noseV: 0.6,
        mouthV: 0.69,
    },
    face: {
        eye: { upper: 0.8, lower: -0.86, lashes: 2, iris: 0.98, pupil: 0.48 },
        brow: { dv: 0.115, len: 0.045, thick: 0.007 },
        nose: { kind: "button", w: 0.022, h: 0.015, d: 0.012, lift: 0.3, v: 0.6 },
        mouth: { w: 0.032, h: 0.05, curve: "w", teeth: "none", wrap: 0.06, philtrum: 0.012, line: 0.0024 },
    },
    ears: {
        kind: "floppy",
        shape: { len: 0.1, width: 0.06, depth: 0.025, profile: EAR_PROFILES.floppy, bend: -0.01, cup: 0.4, inner: 0.6 },
        u: 0.74,
        v: 0.36,
        sink: 0.006,
        tilt: [-0.1, 0.9, 1.9],
        inner: "pad",
    },
    tail: { points: [[0, 0, 0], [0, 0.01, -0.03], [0, 0.02, -0.05]], radius: profile([[0, 0.03], [1, 0.03]]), pom: 0.045, motion: "flick", height: 0.06 },
    hands: "hoof",
    feet: "hoof",
    belly: 0,
    cheeks: 0,
    earMotion: "swing",
    extras: addWool,
    paint: paintSheep,
};

registerCompanion(companionFrom(SHEEP));
