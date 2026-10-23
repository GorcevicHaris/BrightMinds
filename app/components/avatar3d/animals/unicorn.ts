// Jednorog: glava ponija sa izduženom mekom njuškom i nozdrvama, krupne oči sa trepavicama,
// male šiljate uši, sedefasti uvijeni rog, griva od pramenova (perčin preko čela, pramenovi
// niz teme i potiljak), rep od pramenova i kopita.

import * as THREE from "three";
import { registerCompanion } from "../contract";
import { profile } from "../engine/surface";
import { companionFrom, type AnimalSpec } from "./figure";
import { furMaterial, pearlMaterial } from "./materials";
import { EAR_PROFILES, clumpGeometry, hornGeometry, type Clump } from "./parts";
import { ANIMAL_SKINS } from "./skins.data";

export const UNICORN: AnimalSpec = {
    kind: "unicorn",
    skins: ANIMAL_SKINS.unicorn,
    shape: { kind: "unicorn", girth: 1, belly: 1.02, legK: 1.04, head: { w: 0.315, h: 0.31, d: 0.31 } },
    ref: 0.35,
    head: {
        flat: 0.08,
        flatTop: 0.1,
        chin: 0.08,
        blobs: [
            { c: [0, -0.03, 0], r: [0.18, 0.15, 0.175], k: 0.05 },
            { c: [0, -0.075, 0.075], r: [0.098, 0.088, 0.2], k: 0.05, muzzle: true },
        ],
        bumps: [{ dir: [0.4, 0.02, 0.92], sigma: 0.13, amp: -0.005, mirror: true }],
        eye: { u: 0.098, v: 0.47, r: 0.055, inset: 0.68, yaw: 0.2 },
        noseV: 0.6,
        mouthV: 0.69,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 3, iris: 0.95, pupil: 0.44, almond: 1.15, liner: 1.4 },
        brow: { dv: 0.11, len: 0.045, thick: 0.0068 },
        nose: { kind: "nostrils", w: 0.008, h: 0.012, d: 0.005, v: 0.6 },
        mouth: { w: 0.034, h: 0.055, curve: "smile", teeth: "row", wrap: 0.05, philtrum: 0, line: 0.0024 },
    },
    ears: {
        kind: "pointy",
        shape: { len: 0.11, width: 0.075, depth: 0.035, profile: EAR_PROFILES.pointy, bend: 0.01, cup: 0.6, inner: 0.72 },
        u: 0.6,
        v: 0.15,
        sink: 0.01,
        tilt: [-0.2, 0.3, 0.42],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0, -0.03, -0.05], [0.02, -0.12, -0.11], [0.04, -0.24, -0.13], [0.05, -0.34, -0.12]],
        radius: profile([[0, 0.03], [0.4, 0.036], [1, 0.03]]),
        locks: 6,
        motion: "sway",
    },
    hands: "hoof",
    feet: "hoof",
    belly: 0.25,
    cheeks: 0,
    extras: (b) => {
        const head = b.head;
        // Rog: na čelu, iznad očiju, malo nagnut napred
        const hv = 0.17;
        const base = head.offsetPoint(0.5, hv, -0.006);
        const n = head.normal(0.5, hv).add(new THREE.Vector3(0, 0, 0.35)).normalize();
        const len = 0.13 * b.k;
        const r = 0.021 * b.k;
        const horn = new THREE.Mesh(hornGeometry(len, r, b.quality), pearlMaterial(b.coat.horn ?? "#FFE7A8"));
        horn.name = "rog";
        horn.position.copy(base);
        horn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        b.headGroup.add(horn);
        b.part("horn", horn);
        const headBone = b.boneAt("head");
        b.setHorn({ base: base.clone().add(headBone), tip: base.clone().addScaledVector(n, len).add(headBone), radius: r });

        // Griva od pramenova: perčin (preko čela, u stranu), teme i potiljak
        const colors = b.coat.mane ?? [b.coat.fur];
        const forelock: Clump[] = [];
        const crown: Clump[] = [];
        const back: Clump[] = [];
        for (let i = 0; i < 3; i++) {
            const u = 0.5 + 0.018 * (i - 1) - 0.02;
            const v = 0.2 + i * 0.012;
            forelock.push({ base: head.offsetPoint(u, v, -0.006), dir: new THREE.Vector3(-0.55, -0.55, 0.62).normalize(), len: (0.1 - i * 0.01) * b.k, r: 0.028 * b.k, flat: 0.5, taper: 0.5, color: colors[i % colors.length], curl: new THREE.Vector3(0.3, -0.3, 0.1) });
        }
        // Niz sredinu temena i potiljka, naizmenično u levu i desnu stranu
        const steps = b.quality === "high" ? 16 : 10;
        for (let i = 0; i < steps; i++) {
            const t = i / (steps - 1);
            // Napred od temena (u = 0,5) preko vrha (v = 0) do potiljka (u = 0)
            const front = t < 0.25;
            const u = front ? 0.5 : 0.0;
            const v = front ? 0.16 * (1 - t / 0.25) : 0.02 + ((t - 0.25) / 0.75) * 0.55;
            // Griva pada uglavnom na jednu stranu (kao kod ponija), poneki pramen na drugu
            const side = i % 4 === 3 ? 1 : -1;
            const nn = head.normal(u, Math.max(0.01, v));
            const dir = nn.clone().multiplyScalar(0.55).add(new THREE.Vector3(side * 0.75, -0.7, -0.3)).normalize();
            const clump: Clump = { base: head.offsetPoint(u, Math.max(0.01, v), -0.006), dir, len: (0.13 + 0.07 * Math.sin(Math.PI * t)) * b.k, r: 0.034 * b.k, flat: 0.45, taper: 0.5, color: colors[i % colors.length], curl: new THREE.Vector3(-side * 0.4, -0.5, 0) };
            (t < 0.5 ? crown : back).push(clump);
        }
        const mat = furMaterial({ sheen: colors[0], shimmer: b.coat.shimmer });
        const fore = new THREE.Mesh(clumpGeometry([...forelock, ...crown], b.quality), mat);
        fore.name = "griva-perchin";
        const nape = new THREE.Mesh(clumpGeometry(back, b.quality), mat);
        nape.name = "griva-potiljak";
        b.headGroup.add(fore, nape);
        b.part("hair", fore);
    },
};

registerCompanion(companionFrom(UNICORN));
