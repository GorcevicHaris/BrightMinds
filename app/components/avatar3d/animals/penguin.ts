// Pingvin: telo kao kruška sa glatkim perjem (crna leđa, beli stomak i maska lica), sjajan
// kljun koji se otvara dok govori, peraja umesto šaka i narandžasta stopala sa plovnom kožicom.
// „Čupavi” ima žute čuperke iznad očiju; carski ima zlatne mrlje na obrazima.

import * as THREE from "three";
import { registerCompanion } from "../contract";
import { buildSurface, profile } from "../engine/surface";
import { companionFrom, type AnimalSpec } from "./figure";
import { furMaterial, hornyMaterial } from "./materials";
import { clumpGeometry, type Clump } from "./parts";
import { ANIMAL_SKINS } from "./skins.data";

/** Polovina kljuna (gornja ili donja) duž +z: zaobljena, sužava se ka vrhu */
function beakHalf(len: number, w: number, h: number, upper: boolean, quality: "high" | "low"): THREE.BufferGeometry {
    const hi = quality === "high";
    return buildSurface((u, v, out) => {
        const a = u * Math.PI; // pola preseka (gore ili dole)
        const t = v;
        const taper = Math.pow(1 - t, 0.75) * (1 - Math.pow(t, 8) * 0.3) + 0.04;
        const x = Math.cos(a) * w * taper;
        const yy = Math.sin(a) * h * taper * (upper ? 1 : -0.75);
        // Gornji kljun se blago povija nadole ka vrhu
        const droop = upper ? -h * 0.5 * t * t : -h * 0.25 * t * t;
        return out.set(x, yy + droop, len * t);
    }, { nu: hi ? 24 : 12, nv: hi ? 18 : 10, inside: (_u, v, out) => out.set(0, 0, len * v) });
}

export const PENGUIN: AnimalSpec = {
    kind: "penguin",
    skins: ANIMAL_SKINS.penguin,
    shape: { kind: "penguin", girth: 1.16, belly: 1.15, pear: 0.75, legK: 0.62, armK: 0.95, torsoK: 1.08, head: { w: 0.324, h: 0.31, d: 0.31 }, foot: { len: 0.17, w: 0.11, h: 0.042, back: 0.035 } },
    ref: 0.36,
    head: {
        flat: 0.1,
        flatTop: 0.05,
        chin: 0.04,
        blobs: [{ c: [0, -0.04, 0], r: [0.19, 0.15, 0.18], k: 0.06 }],
        bumps: [{ dir: [0.38, -0.02, 0.92], sigma: 0.13, amp: -0.005, mirror: true }],
        eye: { u: 0.094, v: 0.47, r: 0.052, inset: 0.68, yaw: 0.16 },
        noseV: 0.6,
        mouthV: 0.6,
    },
    face: {
        eye: { upper: 0.86, lower: -0.84, lashes: 2, iris: 0.98, pupil: 0.5, almond: 1.08 },
        brow: { dv: 0.11, len: 0.045, thick: 0.0075 },
        nose: { kind: "none", w: 0, h: 0, d: 0 },
        mouth: { w: 0.03, h: 0.04, curve: "smile", teeth: "none", wrap: 0.06, philtrum: 0, line: 0.002 },
    },
    tail: { points: [[0, 0, 0], [0, -0.02, -0.04], [0, -0.04, -0.07]], radius: profile([[0, 0.03], [0.6, 0.02], [1, 0.004]]), motion: "sway", height: 0.03 },
    hands: "flipper",
    feet: "webbed",
    pawR: 0.03,
    flatArms: 0.42,
    belly: 0.75,
    cheeks: 0,
    sleek: true,
    extras: (b) => {
        // Kljun: gornji deo miruje, donji se otvara (govor, izrazi)
        const beakHex = b.coat.beak ?? "#F29A2E";
        const mat = hornyMaterial(beakHex, 0.38);
        const v = 0.585;
        const base = b.head.offsetPoint(0.5, v, -0.012);
        const n = b.head.normal(0.5, v);
        const beak = new THREE.Group();
        beak.name = "kljun";
        beak.position.copy(base);
        beak.lookAt(base.clone().add(n.clone().add(new THREE.Vector3(0, -0.25, 0)).normalize()));
        const len = 0.085 * b.k;
        const upper = new THREE.Mesh(beakHalf(len, 0.036 * b.k, 0.024 * b.k, true, b.quality), mat);
        const jaw = new THREE.Group();
        const lower = new THREE.Mesh(beakHalf(len * 0.86, 0.032 * b.k, 0.017 * b.k, false, b.quality), mat);
        lower.position.y = -0.002;
        jaw.add(lower);
        // Tamna unutrašnjost kljuna (vidi se kad je otvoren)
        const inside = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), hornyMaterial("#6A2A30", 0.6));
        inside.scale.set(0.022 * b.k, 0.006 * b.k, 0.03 * b.k);
        inside.position.set(0, -0.003 * b.k, 0.02 * b.k);
        beak.add(upper, jaw, inside);
        b.face = {
            mouth: beak,
            setJaw: (open, smile) => {
                jaw.rotation.x = open * 0.42 + Math.max(0, smile) * 0.04;
            },
        };
        // Čupavi pingvin: žuti čuperci iznad očiju i crn perčin
        if (b.coat.topknot) {
            const clumps: Clump[] = [];
            const yellow = b.coat.marks?.[0] ?? "#FFD23A";
            for (const side of [1, -1]) {
                for (let i = 0; i < 5; i++) {
                    const u = 0.5 + side * (0.07 + i * 0.022);
                    const base2 = b.head.offsetPoint(u, 0.36 - i * 0.012, -0.004);
                    clumps.push({ base: base2, dir: new THREE.Vector3(side * 0.75, 0.35 + i * 0.05, -0.5).normalize(), len: (0.06 + i * 0.006) * b.k, r: 0.007 * b.k, color: yellow, flat: 0.5, curl: new THREE.Vector3(0, -0.3, 0) });
                }
            }
            for (let i = 0; i < 7; i++) {
                const a = (i / 6 - 0.5) * 0.9;
                const base2 = b.head.offsetPoint(0.5 + a * 0.12, 0.06, -0.006);
                clumps.push({ base: base2, dir: new THREE.Vector3(a * 0.6, 1, -0.35).normalize(), len: 0.05 * b.k, r: 0.008 * b.k, color: b.coat.fur, flat: 0.6 });
            }
            const crest = new THREE.Mesh(clumpGeometry(clumps, b.quality), furMaterial({ sheen: yellow, sleek: true }));
            b.headGroup.add(crest);
            b.part("hair", crest);
        }
    },
};

registerCompanion(companionFrom(PENGUIN));
