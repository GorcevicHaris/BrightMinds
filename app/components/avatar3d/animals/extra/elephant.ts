// Slon: krupna okrugla glava sa visokim čelom, velike klempave uši (ružičaste iznutra), surla
// koja visi i na vrhu se veselo uvija napred (dve kosti: trunk1, trunk2 — njiše se), koža sa
// blagim borama, debele noge sa tri svetla nokta na stopalu i tanak rep sa čupercem.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { B, type ExtraBone } from "../../engine/rig";
import { polyPath, profile, type BoneWeights } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { AnimalHead } from "../head";
import { hornyMaterial } from "../materials";
import { paintGeometry, type PaintContext, type PaintPoint } from "../paint";
import { EAR_PROFILES, pawFoot, weightedTube } from "../parts";
import { asKind, col, goldCoat, headLocal, isHead, rainbowAt, scaleOf, smoothstep } from "./common";
import { EXTRA_SKINS } from "./skins.data";

function elephant(fur: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: shade(fur, 0.25),
        muzzle: shade(fur, 0.08),
        inner: "#F4B6C4",
        nose: shade(fur, -0.45),
        brow: shade(fur, -0.25),
        iris: ["#8A6446", "#2A180C"],
        pattern: "none",
        hoof: "#F4EEE2",
        ...extra,
    };
}

export const ELEPHANT_COATS: Record<string, Coat> = {
    sivi: elephant("#9EA6B2"),
    svetli: elephant("#C2C8D0", { iris: ["#7A8AA8", "#2A3450"] }),
    roze: elephant("#F2B4C8", { inner: "#FFDCE6", iris: ["#B57A9A", "#5A1E3E"] }),
    plavi: elephant("#8FB6E6", { inner: "#F6C6D6", iris: ["#6A8AC8", "#1E345E"] }),
    zlatni: goldCoat({ pattern: "gold", inner: "#FFD6A0", hoof: "#FFF6D8", nose: "#9A6A1E", brow: "#B07A1E" }),
    dugin: elephant("#F4F0FA", { pattern: "none", marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], inner: "#FFE0EC", iris: ["#C9A6F2", "#6A3FB0"] }),
};

/** Putanja surle u prostoru kosti glave: visi, pa se vrh uvija napred i gore */
function trunkPoints(head: AnimalHead, k: number): THREE.Vector3[] {
    const v = head.spec.noseV;
    const root = head.point(0.5, v).addScaledVector(head.normal(0.5, v), -0.03 * k);
    const at = (x: number, y: number, z: number) => root.clone().add(new THREE.Vector3(x, y, z).multiplyScalar(k));
    return [root, at(0, -0.05, 0.055), at(0, -0.125, 0.082), at(0, -0.19, 0.078), at(0, -0.232, 0.105), at(0, -0.226, 0.15)];
}

/** Glava je napisana za širinu 0,5 m */
const REF = 0.5;

const TRUNK_R = profile([[0, 0.058], [0.12, 0.046], [0.45, 0.034], [0.8, 0.028], [0.95, 0.029], [1, 0.026]]);

const tmp = new THREE.Color();

function paintElephant(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat } = ctx;
    const marks = coat.marks ?? [];
    if (marks.length > 2 && pp.region !== "foot") out.lerp(rainbowAt(marks, pp.p.y * 2.2 + pp.p.x, tmp), pp.region === "head" ? 0.4 : 0.6);
    if (pp.region === "ear") {
        // Unutra roze, obod u boji kože
        if (pp.inner) out.lerp(col(coat.inner), 0.9);
        return;
    }
    if (isHead(pp)) {
        const q = headLocal(ctx, pp.p);
        // Rumeni obrazi
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((pp.p.x - e.x * 1.25) / 0.045) ** 2 + ((pp.p.y - e.y + 0.065) / 0.035) ** 2))));
        out.lerp(col("#F4A6B4"), cheek * 0.35 * smoothstep(0, 0.4, q.z));
    }
}

export const ELEPHANT: AnimalSpec = {
    kind: "elephant",
    skins: EXTRA_SKINS.elephant,
    coats: ELEPHANT_COATS,
    shape: { kind: asKind("elephant"), girth: 1.18, belly: 1.15, limb: 1.22, legK: 0.92, foot: { len: 0.17, w: 0.105, h: 0.072, back: 0.048 }, head: { w: 0.43, h: 0.387, d: 0.378 } },
    ref: 0.5,
    head: {
        flat: 0.05,
        flatTop: 0.05,
        chin: 0.16,
        blobs: [
            // Visoko, zaobljeno čelo i puni obrazi
            { c: [0, 0.03, 0.04], r: [0.22, 0.2, 0.2], k: 0.06 },
            { c: [0, -0.08, 0.08], r: [0.14, 0.1, 0.15], k: 0.05, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.05, 0.92], sigma: 0.12, amp: -0.006, mirror: true }],
        eye: { u: 0.095, v: 0.5, r: 0.045, inset: 0.68, yaw: 0.18 },
        noseV: 0.6,
        mouthV: 0.735,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 2, iris: 0.86, pupil: 0.46 },
        brow: { dv: 0.105, len: 0.055, thick: 0.008 },
        nose: { kind: "none", w: 0, h: 0, d: 0 },
        mouth: { w: 0.05, h: 0.05, curve: "smile", teeth: "none", wrap: 0.08, philtrum: 0, line: 0.0028 },
    },
    ears: {
        kind: "floppy",
        shape: { len: 0.2, width: 0.25, depth: 0.03, profile: EAR_PROFILES.round, cup: 0.35, inner: 0.78, bend: 0.03 },
        u: 0.75,
        v: 0.4,
        sink: 0.02,
        tilt: [0.1, 0.5, 2.0],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0.01, -0.06, -0.035], [0.02, -0.14, -0.035]],
        radius: profile([[0, 0.014], [1, 0.009]]),
        tuft: 0.03,
        motion: "flick",
        height: 0.06,
    },
    hands: "paw",
    feet: "paw",
    belly: 0.25,
    cheeks: 0,
    sleek: true,
    earMotion: "swing",
    bones: (shape, head, headBone): ExtraBone[] => {
        const pts = trunkPoints(head, shape.head.w / REF);
        const path = polyPath(pts);
        return [
            { name: "trunk1", parent: "head", at: pts[0].clone().add(headBone) },
            { name: "trunk2", parent: "trunk1", at: path(0.5, new THREE.Vector3()).add(headBone) },
        ];
    },
    customFoot: (b, side) => {
        // Stub noge: oblik kalupa za obuću, bez prstiju; tri svetla nokta spreda
        const g = pawFoot(b.shape, b.quality, 0, "paw");
        const at = b.boneAt(side === 1 ? "footL" : "footR");
        paintGeometry(g, b.paint, (_i, p) => ({ p: p.clone().add(at), region: "foot", side, t: 1 }));
        const foot = new THREE.Mesh(g, b.fur);
        foot.name = "stopalo";
        const nails = new THREE.Group();
        const { len, w, back } = b.shape.foot;
        for (let k = -1; k <= 1; k++) {
            const nail = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), hornyMaterial(b.coat.hoof ?? "#F4EEE2", 0.4));
            nail.scale.set(w * 0.16, 0.022, w * 0.12);
            nail.rotation.x = Math.PI / 2 - 0.35;
            nail.position.set(k * w * 0.3, -b.shape.ankleY + 0.016, len - back - 0.012 - Math.abs(k) * 0.012);
            nail.rotation.y = -k * 0.35;
            nails.add(nail);
        }
        return [foot, nails];
    },
    extras: (b: AnimalBuild) => {
        // Surla: SkinnedMesh na kostima head → trunk1 → trunk2 (savija se glatko)
        const headBone = b.boneAt("head");
        const k = scaleOf(b);
        const pts = trunkPoints(b.head, k).map((p) => p.clone().add(headBone));
        const path = polyPath(pts);
        const i1 = b.rig.bones.findIndex((x) => x.name === "trunk1");
        const i2 = b.rig.bones.findIndex((x) => x.name === "trunk2");
        const weights = (s: number): BoneWeights => {
            const a = smoothstep(0.05, 0.25, s);
            const c = smoothstep(0.4, 0.62, s);
            return [[B.head as number, 1 - a], [i1, a * (1 - c)], [i2, c]];
        };
        const hi = b.quality === "high";
        const g = weightedTube(path, (s) => TRUNK_R(s) * k, hi ? 44 : 22, hi ? 22 : 12, weights);
        const uv = g.getAttribute("uv");
        const n = g.getAttribute("position").count;
        const sAt = new Float32Array(n);
        let maxV = 0;
        for (let i = 0; i < n; i++) maxV = Math.max(maxV, uv.getY(i));
        for (let i = 0; i < n; i++) sAt[i] = uv.getY(i) / Math.max(1e-6, maxV);
        // Bore na surli: tamniji prstenovi (gušći ka vrhu), koren u boji glave
        paintGeometry(g, b.paint, (i, p) => ({ p, region: "head", muzzle: 1 - smoothstep(0, 0.2, sAt[i]), ao: (0.5 + 0.5 * Math.sin(sAt[i] * 70)) ** 6 * 0.35 * smoothstep(0.1, 0.25, sAt[i]) }));
        const trunk = new THREE.SkinnedMesh(g, b.fur);
        trunk.name = "surla";
        trunk.frustumCulled = false;
        const root = b.rig.root.parent ?? b.headGroup;
        root.add(trunk);
        trunk.bind(b.rig.skeleton);
        b.part("head", trunk);
        // Nozdrve na vrhu surle
        const tip = path(1, new THREE.Vector3());
        const before = path(0.97, new THREE.Vector3());
        const dir = tip.clone().sub(before).normalize();
        const cap = new THREE.Group();
        for (const sx of [1, -1]) {
            const hole = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), hornyMaterial(shade(b.coat.fur, -0.6), 0.6));
            hole.scale.set(0.007 * k, 0.0095 * k, 0.004 * k);
            hole.position.set(sx * 0.0095 * k, 0, 0);
            cap.add(hole);
        }
        const tipLocal = b.bone("trunk2")!.worldToLocal(tip.clone().addScaledVector(dir, -0.002));
        cap.position.copy(tipLocal);
        cap.lookAt(b.bone("trunk2")!.localToWorld(tipLocal.clone().add(dir)));
        b.bone("trunk2")!.add(cap);
        b.part("head", cap);
        // Surla se polako njiše (vrh kasni za korenom)
        const t1 = b.bone("trunk1")!;
        const t2 = b.bone("trunk2")!;
        b.onAnimate((time, _dt, live) => {
            if (!live) {
                t1.rotation.set(0, 0, 0);
                t2.rotation.set(0, 0, 0);
                return;
            }
            t1.rotation.z = Math.sin(time * 0.9) * 0.05;
            t1.rotation.x = Math.sin(time * 0.6) * 0.03;
            t2.rotation.z = Math.sin(time * 0.9 - 0.8) * 0.09;
            t2.rotation.x = -0.04 + Math.sin(time * 0.7 - 0.6) * 0.06;
        });
    },
    anchors: (a, b) => {
        // Vrh nosa = vrh surle (naočare i dalje sede na mostu između očiju)
        const pts = trunkPoints(b.head, scaleOf(b));
        const headBone = b.boneAt("head");
        a.nose.tip = pts[pts.length - 1].clone().add(headBone);
        a.nose.snout = Math.max(0, pts[pts.length - 1].z - pts[0].z) + 0.06 * scaleOf(b);
    },
    paint: paintElephant,
};

registerCompanion(companionFrom(ELEPHANT));
