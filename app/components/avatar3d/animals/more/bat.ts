// Slepi miš (sladak): okrugla pahuljasta glava sa kratkom prćastom njuškicom, ogromne šiljate
// uši (kapa ih propušta), mali zubići-očnjaci, pahuljasta ogrlica od krzna, i krila-šake: tri
// duga prsta raširena napolje sa opnom između (šaka vrste „flipper”; predmet se drži u krilu).

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { merge } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { paintGeometry } from "../paint";
import { EAR_PROFILES, handFrame, type Side } from "../parts";
import { asMore, bellyMask, boxUv, coat, col, finGeometry, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function bat(fur: string, wing: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, shade(fur, 0.3), { muzzle: shade(fur, 0.15), inner: "#F2A6B8", nose: shade(wing, -0.2), brow: shade(fur, -0.3), iris: ["#9A6A4A", "#2A1A0E"], paws: wing, marks: [wing], ...extra });
}

export const BAT_COATS: Record<string, Coat> = {
    braon: bat("#8A6A54", "#5A4440"),
    sivi: bat("#9A9AA6", "#5E5E6E", { iris: ["#7A8AAA", "#1E2A3E"] }),
    crni: bat("#4A4652", "#2E2A36", { light: "#7A7484", iris: ["#E8C24A", "#8A6A10"], mouth: "#16131A" }),
    ljubicasti: bat("#A28AD8", "#6A4AA8", { iris: ["#FFD0E8", "#B04A8A"] }),
    zlatni: goldCoat({ paws: "#C08A1E", marks: ["#C08A1E"], nose: "#8A5A10" }),
    dugin: bat("#FFF6FA", "#C7AEFF", { marks: RAINBOW, paws: "#C7AEFF", iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintBat(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    if ((c.marks ?? []).length > 2 && pp.region !== "hand") out.lerp(rainbowAt(RAINBOW, p.y * 2.2 + p.x * 0.5, tmp), 0.3);
    if (pp.region === "torso") out.lerp(col(c.light), bellyMask(ctx, p, 0.1) * 0.6);
    if (pp.region === "ear") {
        if (pp.inner) out.copy(col(c.inner));
        else out.lerp(col(c.paws ?? c.fur), 0.5);
    }
    if (pp.region === "arm") out.lerp(col(c.paws ?? c.fur), smoothstep(0.7, 0.95, pp.t ?? 0) * 0.6);
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        out.lerp(col(c.light), (1 - smoothstep(-0.4, -0.15, q.y)) * smoothstep(-0.2, 0.3, q.z) * 0.7);
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.35) / 0.035) ** 2 + ((p.y - e.y + 0.07) / 0.026) ** 2))));
        out.lerp(col("#FF9CB0"), cheek * 0.35);
    }
}

function capsule(r: number, a: THREE.Vector3, b: THREE.Vector3, seg: number): THREE.BufferGeometry {
    const g = new THREE.CapsuleGeometry(r, a.distanceTo(b), 4, seg);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    const mid = a.clone().lerp(b, 0.5);
    g.translate(mid.x, mid.y, mid.z);
    g.deleteAttribute("uv");
    return g;
}

/** Krilo-šaka: dlan, tri duga prsta raširena napolje-dole i opna sa lukovima između vrhova */
function wingHand(b: AnimalBuild, side: Side): { objects: THREE.Object3D[]; grip: THREE.Vector3; radius: number } {
    const R = b.spec.pawR ? b.spec.pawR * b.k : b.shape.armR(1) * 1.2;
    const hi = b.quality === "high";
    const seg = hi ? 10 : 6;
    const wrist = new THREE.Vector3(0, -R * 0.7, 0);
    // Prsti u ravni (napolje = +x·strana, niz ruku = −y)
    const fingers = [
        { a: 0.3, len: 5.2 },
        { a: 0.95, len: 5.8 },
        { a: 1.6, len: 4.6 },
    ];
    const tips = fingers.map((f) => wrist.clone().add(new THREE.Vector3(Math.sin(f.a) * side, -Math.cos(f.a), 0).multiplyScalar(f.len * R)));
    const bones: THREE.BufferGeometry[] = [];
    const palm = new THREE.SphereGeometry(R * 0.75, hi ? 20 : 12, hi ? 14 : 8);
    palm.scale(1, 1.1, 0.75);
    palm.translate(0, -R * 0.75, 0);
    palm.deleteAttribute("uv");
    bones.push(palm);
    for (const tip of tips) bones.push(capsule(R * 0.12, wrist, tip, seg));
    // Palac (kandžica) gore
    bones.push(capsule(R * 0.16, wrist, wrist.clone().add(new THREE.Vector3(side * R * 0.3, R * 0.5, R * 0.25)), seg));
    // Opna: obris od zgloba preko vrhova prstiju (lukovi između) nazad uz podlakticu
    const pts: [number, number][] = [];
    const start = new THREE.Vector3(side * R * 0.3, R * 1.4, 0);
    const outline: THREE.Vector3[] = [wrist.clone().add(new THREE.Vector3(-side * R * 0.2, -R * 0.4, 0)), tips[0], tips[1], tips[2], start];
    for (let i = 0; i < outline.length - 1; i++) {
        const a = outline[i];
        const c = outline[i + 1];
        const steps = i === 0 || i === outline.length - 2 ? 2 : 8;
        for (let s = 0; s < steps; s++) {
            const t = s / steps;
            const p = a.clone().lerp(c, t);
            // Lukovi opne između prstiju (udubljeno ka zglobu)
            if (i > 0 && i < outline.length - 2) p.lerp(wrist, Math.sin(Math.PI * t) * 0.22);
            pts.push([p.x, p.y]);
        }
    }
    const membrane = finGeometry((t) => {
        const x = t * pts.length;
        const i = Math.floor(x) % pts.length;
        const j = (i + 1) % pts.length;
        const f = x - Math.floor(x);
        return [pts[i][0] + (pts[j][0] - pts[i][0]) * f, pts[i][1] + (pts[j][1] - pts[i][1]) * f];
    }, R * 0.05, b.quality);
    const q = handFrame(b.rig, side);
    const at = b.boneAt(side === 1 ? "handL" : "handR");
    const fingersGeo = boxUv(merge(bones));
    fingersGeo.applyQuaternion(q);
    paintGeometry(fingersGeo, b.paint, (_i, p) => ({ p: p.clone().add(at), region: "hand", side, t: 1 }));
    membrane.applyQuaternion(q);
    const wingColor = col(b.coat.paws ?? b.coat.fur);
    const pos = membrane.getAttribute("position");
    const arr = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const tp = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        tp.fromBufferAttribute(pos, i);
        // Svetlije ka ivici, „žilice” prema prstima
        c.copy(wingColor).multiplyScalar(0.9 + 0.25 * smoothstep(R, R * 3.5, tp.length()));
        if ((b.coat.marks ?? []).length > 2) rainbowAt(RAINBOW, tp.length() * 6, c).multiplyScalar(0.9);
        arr.set([c.r, c.g, c.b], i * 3);
    }
    membrane.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    const grip = new THREE.Vector3(-side * R * 0.35, -R * 1.1, R * 0.1).applyQuaternion(q);
    return { objects: [new THREE.Mesh(fingersGeo, b.fur), new THREE.Mesh(membrane, b.fur)], grip, radius: R };
}

export const BAT: AnimalSpec = {
    kind: "bat",
    skins: MORE_SKINS.bat,
    coats: BAT_COATS,
    shape: { kind: asMore("bat"), girth: 1.0, belly: 1.1, pear: 0.25, limb: 0.92, legK: 0.86, head: { w: 0.36, h: 0.33, d: 0.33 } },
    ref: 0.46,
    head: {
        flat: 0.14,
        flatTop: 0.1,
        chin: 0.1,
        blobs: [
            { c: [0, -0.04, 0.0], r: [0.24, 0.16, 0.19], k: 0.07 },
            { c: [0, -0.06, 0.09], r: [0.07, 0.055, 0.15], k: 0.045, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.096, v: 0.46, r: 0.064, inset: 0.68, yaw: 0.2 },
        noseV: 0.57,
        mouthV: 0.67,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 2, iris: 0.98, pupil: 0.56 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "oval", w: 0.026, h: 0.018, d: 0.016, lift: 0.3, tilt: 0.25 },
        mouth: { w: 0.034, h: 0.05, curve: "smile", teeth: "fangs", wrap: 0.05, philtrum: 0.012, line: 0.0024 },
    },
    ears: {
        kind: "pointy",
        shape: { len: 0.24, width: 0.17, depth: 0.04, profile: EAR_PROFILES.pointy, bend: 0.015, cup: 0.72, inner: 0.76 },
        u: 0.635,
        v: 0.17,
        sink: 0.012,
        tilt: [-0.1, 0.25, 0.55],
        inner: "pad",
    },
    hands: "flipper",
    feet: "paw",
    belly: 0.3,
    cheeks: 0,
    customHand: wingHand,
    paint: paintBat,
};

registerCompanion(companionFrom(BAT));
