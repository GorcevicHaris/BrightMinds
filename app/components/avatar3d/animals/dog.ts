// Pas (štene): okrugla glava, kratka njuška sa krupnim sjajnim nosom, klempave uši (haski:
// uspravne; pudla: kovrdžave, sa čuperkom na temenu), rep koji maše.

import * as THREE from "three";
import { registerCompanion } from "../contract";
import { profile } from "../engine/surface";
import type { Coat } from "./coats";
import { companionFrom, type AnimalSpec, type EarSpec } from "./figure";
import { furMaterial } from "./materials";
import { EAR_PROFILES, clumpGeometry, type Clump } from "./parts";
import { ANIMAL_SKINS } from "./skins.data";

function dogEars(coat: Coat): EarSpec {
    if (coat.earShape === "pointy") {
        return {
            kind: "pointy",
            shape: { len: 0.14, width: 0.13, depth: 0.05, profile: EAR_PROFILES.pointy, bend: 0.01, cup: 0.55, inner: 0.74 },
            u: 0.63,
            v: 0.18,
            sink: 0.012,
            tilt: [-0.12, 0.2, 0.36],
            inner: "pad",
        };
    }
    const curly = coat.earShape === "curly";
    return {
        kind: "floppy",
        shape: { len: curly ? 0.2 : 0.19, width: curly ? 0.12 : 0.11, depth: curly ? 0.05 : 0.032, profile: EAR_PROFILES.floppy, bend: 0.045, cup: 0.2, curls: curly ? 0.12 : 0 },
        u: 0.72,
        v: 0.21,
        sink: 0.01,
        tilt: [0.1, 1.3, 2.25],
    };
}

export const DOG: AnimalSpec = {
    kind: "dog",
    skins: ANIMAL_SKINS.dog,
    shape: { kind: "dog", girth: 1.02, belly: 1.05, leg: 0.19, head: { w: 0.43, h: 0.41, d: 0.41 } },
    head: {
        flat: 0.1,
        flatTop: 0.12,
        chin: 0.1,
        blobs: [
            { c: [0, -0.04, 0.0], r: [0.225, 0.16, 0.2], k: 0.06 },
            { c: [0, -0.072, 0.085], r: [0.12, 0.095, 0.212], k: 0.05, muzzle: true },
        ],
        bumps: [
            { dir: [0.38, -0.02, 0.92], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0.0, 0.3, 0.95], sigma: 0.22, amp: 0.006 },
        ],
        eye: { u: 0.09, v: 0.485, r: 0.055, inset: 0.55, yaw: 0.16 },
        noseV: 0.565,
        mouthV: 0.665,
    },
    face: {
        eye: { upper: 0.88, lower: -0.86, lashes: 0, iris: 0.98, pupil: 0.5 },
        brow: { dv: 0.118, len: 0.05, thick: 0.0085 },
        nose: { kind: "oval", w: 0.034, h: 0.024, d: 0.022, lift: 0.28, tilt: -0.2 },
        mouth: { w: 0.04, h: 0.052, curve: "smile", teeth: "none", wrap: 0.07, philtrum: 0.02, line: 0.0026 },
    },
    ears: dogEars,
    tail: {
        points: [[0, 0, 0], [0, 0.035, -0.06], [0.01, 0.1, -0.1], [0.015, 0.17, -0.095]],
        radius: profile([[0, 0.028], [0.5, 0.024], [0.88, 0.018], [1, 0.005]]),
        motion: "wag",
    },
    hands: "paw",
    feet: "paw",
    belly: 0.45,
    cheeks: 0,
    extras: (b) => {
        if (!b.coat.topknot) return;
        // Pudla: kovrdžav čuperak na temenu (zaobljeni pramenovi u krug)
        const clumps: Clump[] = [];
        const top = b.head.point(0.5, 0.05);
        for (let i = 0; i < 18; i++) {
            const a = i * 2.399963;
            const r = 0.05 * Math.sqrt((i + 0.5) / 18);
            const base = top.clone().add(new THREE.Vector3(Math.cos(a) * r, -0.012, Math.sin(a) * r * 0.8 - 0.01));
            const dir = new THREE.Vector3(Math.cos(a) * 0.6, 1, Math.sin(a) * 0.5).normalize();
            clumps.push({ base, dir, len: 0.045, r: 0.02, curl: new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), color: b.coat.light });
        }
        const mesh = new THREE.Mesh(clumpGeometry(clumps, b.quality), furMaterial({ sheen: b.coat.light }));
        b.headGroup.add(mesh);
        b.part("hair", mesh);
    },
};

registerCompanion(companionFrom(DOG));
