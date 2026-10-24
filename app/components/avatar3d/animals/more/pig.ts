// Prase: okrugla punačka glava sa ravnom okruglom njuškicom (dve nozdrve), uši koje padaju
// napred, rumeni obrazi, okruglo telo, kopitca i kovrdžav repić koji se vrti.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { noseMaterial } from "../materials";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asMore, bellyMask, coat, col, dots, fillColor, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function pig(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: shade(fur, -0.04), inner: shade(fur, -0.1), nose: shade(fur, -0.18), brow: shade(fur, -0.25), iris: ["#7A9AC8", "#1E345E"], hoof: shade(fur, -0.45), mouth: "#7A2E44", ...extra });
}

export const PIG_COATS: Record<string, Coat> = {
    roze: pig("#F9B8C8", "#FFE0E8"),
    pegavo: pig("#FBD6DC", "#FFF0F2", { marks: ["#4A3A40"], iris: ["#9A6A3A", "#3A200C"] }),
    braon: pig("#B07A58", "#D8B094", { nose: "#8A5A44", inner: "#E8A8A0", iris: ["#C8904F", "#5A3212"], mouth: "#4A2420" }),
    plavo: pig("#A8C6F2", "#E2EEFF", { inner: "#F6B8C8", nose: "#7A9AD8" }),
    zlatno: goldCoat({ muzzle: "#F2C443", nose: "#D9A21E", hoof: "#8A5A10", inner: "#F7A9B6", mouth: "#7A2E44" }),
    dugino: pig("#FFEAF2", "#FFFFFF", { marks: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"] }),
};

const tmp = new THREE.Color();

function paintPig(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.2 + p.x * 0.5, tmp), 0.55);
    else if (marks.length && pp.region !== "hand" && pp.region !== "foot") {
        // Pegavo: nekoliko krupnih tamnih mrlja
        const keep = isHead(pp) ? 1 - smoothstep(0.05, 0.4, pp.muzzle ?? 0) : 1;
        out.lerp(col(marks[0]), dots(p, 7, 0.32, 3) * keep * 0.9);
    }
    if (pp.region === "torso") out.lerp(col(c.light), bellyMask(ctx, p, 0.1) * 0.6);
    if (pp.region === "ear" && pp.inner) out.copy(col(c.inner));
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.4) / 0.04) ** 2 + ((p.y - e.y + 0.075) / 0.03) ** 2))));
        out.lerp(col("#FF7F9C"), cheek * 0.35 * smoothstep(-0.2, 0.2, q.z));
    }
}

/** Njuškica: ravan okrugli disk ispred njuške sa dve nozdrve */
function addSnout(b: AnimalBuild) {
    const head = b.head;
    const v = head.spec.noseV;
    const k = b.k;
    const n = head.normal(0.5, v);
    const at = head.point(0.5, v);
    const hi = b.quality === "high";
    const disc = new THREE.CylinderGeometry(0.052 * k, 0.058 * k, 0.03 * k, hi ? 40 : 20, 3);
    // Zaobljena ivica diska
    const pos = disc.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const r = Math.hypot(pos.getX(i), pos.getZ(i));
        if (r > 0.04 * k && y > 0) pos.setY(i, y - (r - 0.04 * k) * 0.6);
    }
    disc.computeVertexNormals();
    disc.rotateX(Math.PI / 2);
    disc.scale(1.12, 0.86, 1);
    disc.deleteAttribute("uv");
    fillColor(disc, b.coat.nose, (p) => 0.92 + 0.08 * smoothstep(-0.01 * k, 0.015 * k, p.z));
    const snout = new THREE.Group();
    snout.name = "njuskica";
    const mesh = new THREE.Mesh(disc, b.fur);
    snout.add(mesh);
    for (const side of [1, -1]) {
        const hole = new THREE.Mesh(new THREE.SphereGeometry(0.012 * k, 14, 10), noseMaterial(shade(b.coat.nose, -0.55)));
        hole.scale.set(0.65, 1, 0.4);
        hole.position.set(side * 0.019 * k, 0, 0.0148 * k);
        snout.add(hole);
    }
    snout.position.copy(at).addScaledVector(n, 0.006 * k);
    snout.lookAt(snout.position.clone().add(new THREE.Vector3(0, n.y * 0.5, 1).normalize()));
    b.headGroup.add(snout);
}

export const PIG: AnimalSpec = {
    kind: "pig",
    skins: MORE_SKINS.pig,
    coats: PIG_COATS,
    shape: { kind: asMore("pig"), girth: 1.16, belly: 1.2, pear: 0.15, limb: 1.08, legK: 0.9, head: { w: 0.37, h: 0.34, d: 0.34 } },
    ref: 0.46,
    head: {
        flat: 0.1,
        flatTop: 0.15,
        chin: 0.0,
        blobs: [
            { c: [0, -0.06, 0.02], r: [0.24, 0.16, 0.19], k: 0.07 },
            { c: [0, -0.06, 0.1], r: [0.085, 0.075, 0.15], k: 0.05, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, 0.02, 0.9], sigma: 0.13, amp: -0.005, mirror: true },
            { dir: [0.7, -0.45, 0.55], sigma: 0.22, amp: 0.012, mirror: true },
        ],
        eye: { u: 0.096, v: 0.44, r: 0.058, inset: 0.68, yaw: 0.2 },
        noseV: 0.57,
        mouthV: 0.7,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 3, iris: 0.94, pupil: 0.46 },
        brow: { dv: 0.11, len: 0.05, thick: 0.008 },
        nose: { kind: "none", w: 0, h: 0, d: 0 },
        mouth: { w: 0.045, h: 0.055, curve: "smile", teeth: "none", wrap: 0.08, philtrum: 0, line: 0.0028 },
    },
    ears: {
        kind: "floppy",
        shape: { len: 0.12, width: 0.11, depth: 0.03, profile: EAR_PROFILES.pointy, cup: 0.5, inner: 0.65, bend: -0.05 },
        u: 0.64,
        v: 0.17,
        sink: 0.008,
        tilt: [0.55, 0.3, 0.55],
        inner: "pad",
    },
    tail: {
        // Kovrdža: spirala iza
        points: [[0, 0, 0], [0, 0.02, -0.03], [0.02, 0.045, -0.035], [0.03, 0.03, -0.02], [0.015, 0.012, -0.03], [0, 0.03, -0.055], [0.015, 0.06, -0.06]],
        radius: (s) => 0.011 * (1 - s * 0.4),
        motion: "wag",
        height: 0.07,
    },
    hands: "hoof",
    feet: "hoof",
    belly: 0.3,
    cheeks: 0,
    sleek: true,
    earMotion: "swing",
    extras: addSnout,
    anchors: (a, b) => {
        // Vrh nosa je na disku njuškice
        const n = b.head.normal(0.5, b.head.spec.noseV);
        a.nose.tip.copy(b.head.point(0.5, b.head.spec.noseV).addScaledVector(n, 0.025 * b.k).add(b.boneAt("head")));
        a.nose.snout = 0.05;
    },
    paint: paintPig,
};

registerCompanion(companionFrom(PIG));
