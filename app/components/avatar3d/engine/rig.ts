// Mere tela i kostur. Sve je u metrima (dete ≈ 1,2 m), lik gleda ka +z, gore je +y,
// a levo od lika je +x (gledaocu desno). Kosti u mirovanju nemaju rotaciju (samo položaj),
// pa pokret jedne kosti = rotacija oko svetskih osa iz njenog zgloba.

import * as THREE from "three";
import { BONES, type BodyShape, type BoneName, type ExtraBoneName, type Joints, type Rig } from "../contract";
import type { HumanKind } from "../data";
import { profile, smoothstep, type BoneWeights } from "./surface";

export { BONES, type BodyShape, type BoneName, type Joints, type Rig } from "../contract";
export const B = Object.fromEntries(BONES.map((name, i) => [name, i])) as Record<BoneName, number>;

/** Ljudska tela (motor); životinje prave svoj BodyShape u animals/ */
export type HumanBodyKind = HumanKind;

/**
 * Odrasli u stilu „Bitmoji 3D”: stilizovano, ali bliže stvarnim proporcijama — glava ≈ 1/5,7
 * visine, duge noge, prirodna ramena, vitki udovi sa blagim mišićima.
 */
function adultShape(kind: "woman" | "man"): BodyShape {
    const man = kind === "man";
    const s = man ? 1.06 : 1;
    const w = man ? 1.12 : 1;
    const y = (v: number) => v * s;
    return {
        kind,
        proportion: "adult",
        crotchY: y(0.8),
        hipY: y(0.86),
        waistY: y(1.02),
        chestY: y(1.15),
        shoulderY: y(1.255),
        neckBaseY: y(1.3),
        headBoneY: y(1.338),
        // Uže lice (Bitmoji): manji obrazi i vilica, sitna brada
        head: { w: 0.245, h: 0.296, d: 0.266, up: 0.134, fwd: 0.014, chin: man ? 0.84 : 0.77, cheeks: 0.38 },
        torsoW: profile([
            [y(0.78), 0.07], [y(0.82), 0.118], [y(0.88), man ? 0.142 : 0.156], [y(0.95), man ? 0.136 : 0.132], [y(1.02), man ? 0.132 : 0.108],
            [y(1.1), 0.128 * w], [y(1.19), 0.146 * w], [y(1.245), 0.154 * w], [y(1.27), 0.136 * w], [y(1.295), man ? 0.088 : 0.078], [y(1.315), man ? 0.056 : 0.05], [y(1.4), man ? 0.052 : 0.046],
        ]),
        torsoFront: profile([
            [y(0.78), 0.05], [y(0.82), 0.078], [y(0.9), 0.084], [y(0.98), man ? 0.084 : 0.076], [y(1.07), 0.082], [y(1.16), man ? 0.094 : 0.086],
            [y(1.245), 0.074], [y(1.29), 0.058], [y(1.31), 0.046], [y(1.4), 0.044],
        ]),
        torsoBack: profile([
            [y(0.78), 0.055], [y(0.84), man ? 0.086 : 0.098], [y(0.9), man ? 0.086 : 0.094], [y(0.99), 0.07], [y(1.08), 0.074], [y(1.18), 0.084],
            [y(1.245), 0.077], [y(1.29), 0.06], [y(1.31), 0.046], [y(1.4), 0.044],
        ]),
        bust: man ? 0 : 1,
        neckR: man ? 0.053 : 0.044,
        shoulderX: 0.146 * w,
        armAngle: 0.1,
        upperArm: y(0.275),
        forearm: y(0.24),
        // Rame (deltoid), biceps, lakat, mišić podlaktice, tanak zglob — vitko
        armR: man
            ? profile([[0, 0.05], [0.1, 0.048], [0.3, 0.041], [0.5, 0.034], [0.6, 0.037], [0.7, 0.036], [0.88, 0.029], [1, 0.026]])
            : profile([[0, 0.041], [0.1, 0.039], [0.3, 0.033], [0.5, 0.028], [0.6, 0.03], [0.7, 0.029], [0.88, 0.024], [1, 0.022]]),
        hand: man ? 1.5 : 1.38,
        hipX: man ? 0.074 : 0.077,
        thigh: y(0.395),
        shin: y(0.39),
        legR: man
            ? profile([[0, 0.075], [0.2, 0.066], [0.43, 0.051], [0.5, 0.046], [0.6, 0.05], [0.68, 0.051], [0.86, 0.037], [1, 0.031]])
            : profile([[0, 0.075], [0.2, 0.064], [0.43, 0.047], [0.5, 0.042], [0.6, 0.046], [0.68, 0.046], [0.86, 0.033], [1, 0.027]]),
        ankleY: 0.072,
        foot: { len: man ? 0.21 : 0.19, w: man ? 0.08 : 0.07, h: 0.072, back: 0.05 },
        height: y(1.74),
    };
}

/**
 * Deca: ista građa kao odrasli, umanjena (≈ 1,3 m), sa većom glavom (≈ 1/4,7 visine),
 * punijim vratom i bez grudi — kao Bitmoji tinejdžer, prilagođeno uzrastu.
 */
function childShape(kind: "girl" | "boy"): BodyShape {
    const base = adultShape(kind === "girl" ? "woman" : "man");
    const k = kind === "girl" ? 0.76 : 0.72;
    const headK = 1.24;
    const limb = 0.98;
    const sy = (f: (y: number) => number, r = k) => (y: number) => f(y / k) * r;
    const h = base.head;
    return {
        ...base,
        kind,
        proportion: "child",
        crotchY: base.crotchY * k,
        hipY: base.hipY * k,
        waistY: base.waistY * k,
        chestY: base.chestY * k,
        shoulderY: base.shoulderY * k,
        neckBaseY: base.neckBaseY * k,
        headBoneY: base.headBoneY * k,
        head: { w: h.w * k * headK, h: h.h * k * headK, d: h.d * k * headK, up: h.up * k * headK, fwd: h.fwd * k, chin: kind === "girl" ? 0.82 : 0.85, cheeks: 0.85 },
        torsoW: (y: number) => {
            const v = base.torsoW(y / k) * k;
            // Vrat malo puniji nego kod umanjenog odraslog
            return y > base.neckBaseY * k - 0.01 ? Math.max(v, base.neckR * k * 1.12) : v;
        },
        torsoFront: sy(base.torsoFront),
        torsoBack: sy(base.torsoBack),
        bust: 0,
        neckR: base.neckR * k * 1.12,
        shoulderX: base.shoulderX * k,
        upperArm: base.upperArm * k,
        forearm: base.forearm * k,
        armR: (t: number) => base.armR(t) * k * limb,
        hand: base.hand * k * 1.12,
        hipX: base.hipX * k,
        thigh: base.thigh * k,
        shin: base.shin * k,
        legR: (t: number) => base.legR(t) * k * limb,
        ankleY: base.ankleY * k,
        foot: { len: base.foot.len * k * 1.05, w: base.foot.w * k * 1.05, h: base.foot.h * k, back: base.foot.back * k },
        height: base.height * k,
    };
}

const SHAPES = new Map<HumanKind, BodyShape>();

export function bodyShape(kind: HumanKind): BodyShape {
    let shape = SHAPES.get(kind);
    if (!shape) {
        shape = kind === "girl" || kind === "boy" ? childShape(kind) : adultShape(kind);
        SHAPES.set(kind, shape);
    }
    return shape;
}

// ── Zglobovi u mirovanju (svetske koordinate) ───────────────────────────────────

/** Zglobovi leve (+x) strane; desna je ogledalo (x → −x) */
export function joints(shape: BodyShape, side: 1 | -1): Joints {
    const shoulder = new THREE.Vector3(shape.shoulderX * side, shape.shoulderY - 0.012, -0.004);
    const dir = new THREE.Vector3(Math.sin(shape.armAngle) * side, -Math.cos(shape.armAngle), 0);
    const elbow = shoulder.clone().addScaledVector(dir, shape.upperArm);
    // Podlaktica je malo savijena napred, kao kod opuštenog stajanja
    const dir2 = new THREE.Vector3(Math.sin(shape.armAngle * 0.7) * side, -Math.cos(0.1), Math.sin(0.1)).normalize();
    const wrist = elbow.clone().addScaledVector(dir2, shape.forearm);
    const hip = new THREE.Vector3(shape.hipX * side, shape.hipY, 0);
    const knee = new THREE.Vector3(shape.hipX * side, shape.hipY - shape.thigh, 0.004);
    const ankle = new THREE.Vector3(shape.hipX * side, shape.ankleY, -0.004);
    return { shoulder, elbow, wrist, hip, knee, ankle };
}

/** Dodatna kost životinje (rep, uši): roditelj i položaj zgloba u prostoru tela */
export interface ExtraBone {
    name: ExtraBoneName;
    parent: BoneName | ExtraBoneName;
    at: THREE.Vector3;
}

/**
 * Pravi kostur u mirovanju; posle ovoga se SkinnedMesh vezuje za njega. Zglobovi 18 obaveznih
 * kostiju slede iz mera tela (shape); dodatne kosti (životinje) idu posle njih, istim redom.
 * Indeks kosti u težinama (skinIndex) je njen redni broj u `rig.bones`.
 */
export function createRig(shape: BodyShape, extras: readonly ExtraBone[] = []): Rig {
    const left = joints(shape, 1);
    const right = joints(shape, -1);
    const world: Record<BoneName, THREE.Vector3> = {
        root: new THREE.Vector3(0, 0, 0),
        hips: new THREE.Vector3(0, shape.hipY + 0.02, 0),
        spine: new THREE.Vector3(0, shape.waistY - 0.02, 0),
        chest: new THREE.Vector3(0, shape.chestY - 0.02, 0),
        neck: new THREE.Vector3(0, shape.neckBaseY - 0.005, 0),
        head: new THREE.Vector3(0, shape.headBoneY, 0),
        upperArmL: left.shoulder, forearmL: left.elbow, handL: left.wrist,
        upperArmR: right.shoulder, forearmR: right.elbow, handR: right.wrist,
        thighL: left.hip, shinL: left.knee, footL: left.ankle,
        thighR: right.hip, shinR: right.knee, footR: right.ankle,
    };
    const parent: Partial<Record<BoneName, BoneName>> = {
        hips: "root", spine: "hips", chest: "spine", neck: "chest", head: "neck",
        upperArmL: "chest", forearmL: "upperArmL", handL: "forearmL",
        upperArmR: "chest", forearmR: "upperArmR", handR: "forearmR",
        thighL: "hips", shinL: "thighL", footL: "shinL",
        thighR: "hips", shinR: "thighR", footR: "shinR",
    };
    const bones = BONES.map((name) => {
        const bone = new THREE.Bone();
        bone.name = name;
        return bone;
    });
    BONES.forEach((name, i) => {
        const p = parent[name];
        const bone = bones[i];
        if (p) {
            bones[B[p]].add(bone);
            bone.position.copy(world[name]).sub(world[p]);
        } else {
            bone.position.copy(world[name]);
        }
    });
    const at = new Map<string, THREE.Vector3>(BONES.map((name) => [name, world[name]]));
    const byName = new Map<string, THREE.Bone>(BONES.map((name, i) => [name, bones[i]]));
    for (const extra of extras) {
        const bone = new THREE.Bone();
        bone.name = extra.name;
        const parentBone = byName.get(extra.parent);
        const parentAt = at.get(extra.parent);
        if (!parentBone || !parentAt) throw new Error(`Nepoznata roditeljska kost: ${extra.parent}`);
        parentBone.add(bone);
        bone.position.copy(extra.at).sub(parentAt);
        at.set(extra.name, extra.at);
        byName.set(extra.name, bone);
        bones.push(bone);
    }
    bones[0].updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(bones);
    const rest = Object.fromEntries([...at.entries()].map(([name, p]) => [name, p.clone()]));
    return { shape, bones, skeleton, root: bones[0], bone: (name) => bones[B[name]], left, right, rest };
}

// ── Težine kostiju po položaju (telo i odeća koriste iste, pa se pomeraju zajedno) ─

export function torsoWeights(shape: BodyShape, p: THREE.Vector3): BoneWeights {
    const y = p.y;
    const toSpine = smoothstep(shape.waistY - 0.06, shape.waistY + 0.02, y);
    const toChest = smoothstep(shape.chestY - 0.08, shape.chestY + 0.01, y);
    const toNeck = smoothstep(shape.neckBaseY - 0.012, shape.neckBaseY + 0.012, y);
    const toHead = smoothstep(shape.headBoneY - 0.012, shape.headBoneY + 0.004, y);
    const w: BoneWeights = [
        [B.hips, 1 - toSpine],
        [B.spine, toSpine * (1 - toChest)],
        [B.chest, toChest * (1 - toNeck)],
        [B.neck, toNeck * (1 - toHead)],
        [B.head, toHead],
    ];
    return w;
}

/** Projekcija tačke na duž a–b: 0 u a, 1 u b */
function along(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
    const ab = tmp1.subVectors(b, a);
    return tmp2.subVectors(p, a).dot(ab) / ab.lengthSq();
}
const tmp1 = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

export function armWeights(rig: Rig, side: 1 | -1, p: THREE.Vector3): BoneWeights {
    const j = side === 1 ? rig.left : rig.right;
    const upper = side === 1 ? B.upperArmL : B.upperArmR;
    const fore = side === 1 ? B.forearmL : B.forearmR;
    const hand = side === 1 ? B.handL : B.handR;
    const t1 = along(p, j.shoulder, j.elbow);
    const t2 = along(p, j.elbow, j.wrist);
    const toChest = 1 - smoothstep(-0.25, 0.12, t1);
    const toFore = smoothstep(0.82, 1.18, t1);
    const toHand = smoothstep(0.9, 1.05, t2);
    return [
        [B.chest, toChest],
        [upper, (1 - toChest) * (1 - toFore)],
        [fore, toFore * (1 - toHand)],
        [hand, toHand],
    ];
}

export function legWeights(rig: Rig, side: 1 | -1, p: THREE.Vector3): BoneWeights {
    const j = side === 1 ? rig.left : rig.right;
    const thigh = side === 1 ? B.thighL : B.thighR;
    const shin = side === 1 ? B.shinL : B.shinR;
    const foot = side === 1 ? B.footL : B.footR;
    const t1 = along(p, j.hip, j.knee);
    const t2 = along(p, j.knee, j.ankle);
    const toHips = 1 - smoothstep(-0.1, 0.12, t1);
    const toShin = smoothstep(0.86, 1.12, t1);
    const toFoot = smoothstep(0.96, 1.04, t2);
    return [
        [B.hips, toHips],
        [thigh, (1 - toHips) * (1 - toShin)],
        [shin, toShin * (1 - toFoot)],
        [foot, toFoot],
    ];
}
