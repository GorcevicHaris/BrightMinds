// Poze ruku (kao kod Bitmoji likova): opušteno, ruke na kukovima, prekrštene ruke, šake na
// ustima (iznenađenje), ruke iza leđa. Svaka poza zadaje gde su zglobovi šaka i na koju stranu
// gledaju laktovi; uglovi kostiju se računaju (IK sa dve kosti), pa poza važi za svako telo
// (dete, odrasli, životinja) — iz mera tela (BodyShape) i zglobova kostura.

import * as THREE from "three";
import type { Rig } from "../contract";

export const POSES = ["relaxed", "hips", "crossed", "mouth", "behind"] as const;
export type PoseName = (typeof POSES)[number];

export interface ArmPose {
    upper: THREE.Quaternion;
    fore: THREE.Quaternion;
    hand: THREE.Quaternion;
}

export interface PoseSolution {
    left: ArmPose | null;
    right: ArmPose | null;
}

interface ArmTarget {
    wrist: THREE.Vector3;
    /** Smer u koji lakat „gleda” */
    elbow: THREE.Vector3;
    /** Savijanje šake u zglobu (rad, + ka dlanu) i okret podlaktice */
    bend?: number;
    twist?: number;
}

const basis = (dir: THREE.Vector3, pole: THREE.Vector3) => {
    const x = dir.clone().normalize();
    const y = pole.clone().addScaledVector(x, -pole.dot(x));
    if (y.lengthSq() < 1e-8) y.set(0, 0, 1).addScaledVector(x, -x.z);
    y.normalize();
    const z = new THREE.Vector3().crossVectors(x, y);
    return new THREE.Matrix4().makeBasis(x, y, z);
};

/** Rotacija koja prevodi (dir0, pole0) u (dir1, pole1) */
function rotationBetween(dir0: THREE.Vector3, pole0: THREE.Vector3, dir1: THREE.Vector3, pole1: THREE.Vector3): THREE.Quaternion {
    const m0 = basis(dir0, pole0);
    const m1 = basis(dir1, pole1);
    const m = m1.multiply(m0.clone().invert());
    return new THREE.Quaternion().setFromRotationMatrix(m);
}

/** IK za jednu ruku: lokalne rotacije nadlaktice, podlaktice i šake */
function solveArm(rig: Rig, side: 1 | -1, target: ArmTarget): ArmPose {
    const j = side === 1 ? rig.left : rig.right;
    const S = j.shoulder;
    const a = j.elbow.distanceTo(S);
    const b = j.wrist.distanceTo(j.elbow);
    const toT = target.wrist.clone().sub(S);
    const d = THREE.MathUtils.clamp(toT.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
    const dir = toT.normalize();
    const pole = target.elbow.clone().addScaledVector(dir, -target.elbow.dot(dir)).normalize();
    const x = (a * a - b * b + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, a * a - x * x));
    const E = S.clone().addScaledVector(dir, x).addScaledVector(pole, h);
    const W = S.clone().addScaledVector(dir, d);
    // U mirovanju lakat gleda unazad (podlaktica se savija napred)
    const restPole = new THREE.Vector3(side * 0.15, 0, -1);
    const restUpper = j.elbow.clone().sub(S);
    const restFore = j.wrist.clone().sub(j.elbow);
    const q1 = rotationBetween(restUpper, restPole, E.clone().sub(S), pole);
    const q2 = rotationBetween(restFore, restPole, W.clone().sub(E), pole);
    const fore = q1.clone().invert().multiply(q2);
    const hand = new THREE.Quaternion().setFromEuler(new THREE.Euler(target.bend ?? 0, target.twist ?? 0, 0));
    return { upper: q1, fore, hand };
}

/** Zglobovi šaka i laktovi za pozu, iz mera tela */
export function solvePose(rig: Rig, name: PoseName): PoseSolution {
    const s = rig.shape;
    const front = (y: number) => s.torsoFront(y);
    const armR = s.armR(0.5);
    const scale = s.height / 1.3;
    switch (name) {
        case "relaxed":
            return { left: null, right: null };
        case "hips": {
            // Šake na kukovima, laktovi u stranu
            const y = s.waistY - 0.01 * scale;
            const arm = (side: 1 | -1): ArmTarget => ({
                wrist: new THREE.Vector3(side * (s.torsoW(y) + 0.028 * scale), y, 0.012 * scale),
                elbow: new THREE.Vector3(side, 0.05, -0.5),
                bend: 0.35,
                twist: side * 0.6,
            });
            return { left: solveArm(rig, 1, arm(1)), right: solveArm(rig, -1, arm(-1)) };
        }
        case "crossed": {
            // Prekrštene ruke: leva podlaktica preko desne, šake pod suprotnom nadlakticom
            const y = s.chestY - 0.035 * scale;
            const z = front(y) + armR + 0.03 * scale;
            const reach = s.shoulderX * 0.55;
            return {
                left: solveArm(rig, 1, { wrist: new THREE.Vector3(-reach, y + 0.014 * scale, z + 0.02 * scale), elbow: new THREE.Vector3(0.9, -0.55, 0.1), bend: 0.9, twist: 0.3 }),
                right: solveArm(rig, -1, { wrist: new THREE.Vector3(reach, y - 0.01 * scale, z - 0.006 * scale), elbow: new THREE.Vector3(-0.9, -0.55, 0.1), bend: 0.9, twist: -0.3 }),
            };
        }
        case "mouth": {
            // Obe šake na ustima (iznenađenje, kikot)
            const headY = s.headBoneY + s.head.up;
            const y = headY - s.head.h * 0.34;
            const z = s.head.fwd + s.head.d * 0.5 + 0.02 * scale;
            const arm = (side: 1 | -1): ArmTarget => ({
                wrist: new THREE.Vector3(side * 0.028 * scale, y - 0.03 * scale, z),
                elbow: new THREE.Vector3(side * 0.7, -1, 0.15),
                bend: 0.1,
                twist: side * 1.6,
            });
            return { left: solveArm(rig, 1, arm(1)), right: solveArm(rig, -1, arm(-1)) };
        }
        case "behind": {
            // Ruke iza leđa (stidljivo, mirno)
            const y = s.hipY + 0.03 * scale;
            const z = -s.torsoBack(y) - 0.04 * scale;
            const arm = (side: 1 | -1): ArmTarget => ({
                wrist: new THREE.Vector3(side * 0.035 * scale, y, z),
                elbow: new THREE.Vector3(side, -0.4, -0.3),
                bend: 0.2,
            });
            return { left: solveArm(rig, 1, arm(1)), right: solveArm(rig, -1, arm(-1)) };
        }
    }
}
