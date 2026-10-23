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

/** Dete 6–9 godina: velika glava (≈ ¼ visine), kratki udovi, mekan trup */
function childShape(kind: "girl" | "boy"): BodyShape {
    const girl = kind === "girl";
    const k = girl ? 1 : 1.02;
    return {
        kind,
        proportion: "child",
        crotchY: 0.455,
        hipY: 0.5,
        waistY: 0.615,
        chestY: 0.715,
        shoulderY: 0.79,
        neckBaseY: 0.83,
        headBoneY: 0.875,
        head: { w: 0.268, h: 0.28, d: 0.266, up: 0.118, fwd: 0.01, chin: girl ? 0.84 : 0.86, cheeks: 1 },
        torsoW: profile([
            [0.44, 0.06], [0.47, 0.095], [0.52, 0.106 * k], [0.58, 0.1 * k], [0.63, 0.094 * k], [0.7, 0.098 * k],
            [0.76, 0.108 * k], [0.79, 0.112 * k], [0.81, 0.1], [0.828, 0.066], [0.845, 0.042], [0.9, 0.039],
        ]),
        torsoFront: profile([
            [0.44, 0.04], [0.47, 0.062], [0.53, 0.072], [0.6, 0.076], [0.66, 0.074], [0.72, 0.07], [0.78, 0.062],
            [0.815, 0.054], [0.835, 0.041], [0.9, 0.038],
        ]),
        torsoBack: profile([
            [0.44, 0.045], [0.48, 0.072], [0.52, 0.076], [0.58, 0.064], [0.64, 0.06], [0.72, 0.064], [0.78, 0.062],
            [0.815, 0.056], [0.835, 0.041], [0.9, 0.038],
        ]),
        bust: 0,
        neckR: 0.039,
        shoulderX: 0.098 * k,
        armAngle: 0.13,
        upperArm: 0.165,
        forearm: 0.145,
        armR: profile([[0, 0.04], [0.15, 0.038], [0.45, 0.033], [0.55, 0.032], [0.75, 0.03], [1, 0.025]]),
        hand: 1.45,
        hipX: 0.058,
        thigh: 0.215,
        shin: 0.215,
        legR: profile([[0, 0.058], [0.2, 0.053], [0.45, 0.043], [0.5, 0.041], [0.65, 0.042], [0.85, 0.034], [1, 0.029]]),
        ankleY: 0.062,
        foot: { len: 0.15, w: 0.066, h: 0.064, back: 0.036 },
        height: 1.19,
    };
}

/** Odrasli: duži udovi i trup, glava i dalje krupna (stilizovano) */
function adultShape(kind: "woman" | "man"): BodyShape {
    const man = kind === "man";
    const s = man ? 1.06 : 1;
    const w = man ? 1.12 : 1;
    const y = (v: number) => v * s;
    return {
        kind,
        proportion: "adult",
        crotchY: y(0.74),
        hipY: y(0.8),
        waistY: y(0.98),
        chestY: y(1.13),
        shoulderY: y(1.245),
        neckBaseY: y(1.3),
        headBoneY: y(1.36),
        head: { w: 0.27, h: 0.315, d: 0.285, up: 0.14, fwd: 0.015, chin: man ? 0.9 : 0.84, cheeks: 0.6 },
        torsoW: profile([
            [y(0.72), 0.07], [y(0.76), 0.12], [y(0.83), man ? 0.15 : 0.165], [y(0.92), man ? 0.142 : 0.14], [y(0.99), man ? 0.14 : 0.118],
            [y(1.08), 0.135 * w], [y(1.18), 0.152 * w], [y(1.24), 0.16 * w], [y(1.27), 0.14 * w], [y(1.295), 0.08], [y(1.315), 0.05], [y(1.4), 0.046],
        ]),
        torsoFront: profile([
            [y(0.72), 0.05], [y(0.76), 0.08], [y(0.85), 0.088], [y(0.95), man ? 0.088 : 0.082], [y(1.05), 0.088], [y(1.15), man ? 0.098 : 0.09],
            [y(1.24), 0.078], [y(1.29), 0.06], [y(1.31), 0.048], [y(1.4), 0.046],
        ]),
        torsoBack: profile([
            [y(0.72), 0.055], [y(0.78), man ? 0.088 : 0.1], [y(0.84), man ? 0.09 : 0.1], [y(0.95), 0.074], [y(1.05), 0.078], [y(1.17), 0.088],
            [y(1.24), 0.08], [y(1.29), 0.062], [y(1.31), 0.048], [y(1.4), 0.046],
        ]),
        bust: man ? 0 : 1,
        neckR: man ? 0.05 : 0.044,
        shoulderX: 0.148 * w,
        armAngle: 0.1,
        upperArm: y(0.27),
        forearm: y(0.235),
        armR: man
            ? profile([[0, 0.052], [0.15, 0.048], [0.45, 0.04], [0.55, 0.038], [0.75, 0.036], [1, 0.029]])
            : profile([[0, 0.044], [0.15, 0.041], [0.45, 0.034], [0.55, 0.032], [0.75, 0.03], [1, 0.024]]),
        hand: man ? 1.45 : 1.3,
        hipX: man ? 0.078 : 0.082,
        thigh: y(0.36),
        shin: y(0.355),
        legR: man
            ? profile([[0, 0.078], [0.2, 0.07], [0.45, 0.054], [0.5, 0.05], [0.65, 0.054], [0.85, 0.042], [1, 0.034]])
            : profile([[0, 0.08], [0.2, 0.07], [0.45, 0.05], [0.5, 0.046], [0.65, 0.05], [0.85, 0.038], [1, 0.03]]),
        ankleY: 0.075,
        foot: { len: man ? 0.21 : 0.19, w: man ? 0.082 : 0.07, h: 0.075, back: 0.05 },
        height: y(1.73),
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
    return { shape, bones, skeleton, root: bones[0], bone: (name) => bones[B[name]], left, right };
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
