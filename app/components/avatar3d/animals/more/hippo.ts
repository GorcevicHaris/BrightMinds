// Nilski konj: okruglo punačko telo, krupna glava sa ogromnom širokom njuškom (nozdrve na
// vrhu, rumeni obrazi), oči visoko na čelu, sitne okrugle uši, širok osmeh sa dva zuba, kratke
// debele noge sa četiri prsta i kratak rep sa čupercem.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { toeFoot } from "../extra/hands";
import { asMore, bellyMask, coat, col, fbm3, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function hippo(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: shade(light, 0.1), inner: "#F2A6B4", nose: shade(fur, -0.45), brow: shade(fur, -0.25), iris: ["#8A6A4A", "#2A1A0E"], tailTip: shade(fur, -0.2), paws: shade(fur, -0.08), ...extra });
}

export const HIPPO_COATS: Record<string, Coat> = {
    sivi: hippo("#9C93A8", "#E8CCD6"),
    svetli: hippo("#C9B8C6", "#F6DDE4", { iris: ["#7A9AC8", "#1E345E"] }),
    ljubicasti: hippo("#A88ADC", "#F0DCFF", { iris: ["#7A5AB0", "#2A1A4A"] }),
    plavi: hippo("#7EA6D8", "#DDEBFF", { inner: "#F6B8C8" }),
    zlatni: goldCoat({ muzzle: "#FFF0C8", light: "#FFF0C8", nose: "#9A6A1E", tailTip: "#C08A1E" }),
    dugin: hippo("#F6F0FA", "#FFFFFF", { marks: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"], nose: "#8A6AA8" }),
};

const tmp = new THREE.Color();

function paintHippo(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.2 + p.x * 0.6, tmp), pp.region === "torso" ? 0.55 * (1 - bellyMask(ctx, p)) : 0.55);
    // Blago šarenilo kože (tamnije i svetlije mrlje, kao prava koža)
    const n = fbm3(p.x * 9, p.y * 9, p.z * 9, 3, 19);
    out.multiplyScalar(0.95 + n * 0.1);
    const light = col(c.light);
    switch (pp.region) {
        case "torso":
            out.lerp(light, bellyMask(ctx, p, 0.18) * 0.85);
            return;
        case "ear":
            if (pp.inner) out.copy(col(c.inner));
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Rumeni obrazi sa strane njuške; svetla donja vilica
    out.lerp(light, (1 - smoothstep(-0.55, -0.3, q.y)) * smoothstep(-0.2, 0.3, q.z) * 0.8);
    const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.55) / 0.045) ** 2 + ((p.y - e.y + 0.1) / 0.035) ** 2 + ((p.z - e.z) / 0.08) ** 2))));
    out.lerp(col("#FF8FA6"), cheek * 0.45);
}

export const HIPPO: AnimalSpec = {
    kind: "hippo",
    skins: MORE_SKINS.hippo,
    coats: HIPPO_COATS,
    shape: { kind: asMore("hippo"), girth: 1.24, belly: 1.25, pear: 0.2, limb: 1.22, legK: 0.84, armK: 0.92, head: { w: 0.4, h: 0.37, d: 0.38 } },
    ref: 0.46,
    head: {
        flat: 0.0,
        flatTop: 0.3,
        chin: 0.0,
        blobs: [
            // Ogromna široka njuška (dva režnja) i debela donja vilica
            { c: [0.07, -0.075, 0.1], r: [0.14, 0.13, 0.2], k: 0.07, muzzle: true },
            { c: [-0.07, -0.075, 0.1], r: [0.14, 0.13, 0.2], k: 0.07, muzzle: true },
            { c: [0, -0.12, 0.06], r: [0.2, 0.1, 0.18], k: 0.06, muzzle: true },
        ],
        bumps: [
            // Kupole očiju na čelu i nozdrve na vrhu njuške
            { dir: [0.32, 0.42, 0.85], sigma: 0.14, amp: 0.014, mirror: true },
            { dir: [0.18, 0.02, 0.98], sigma: 0.08, amp: 0.008, muzzle: true, mirror: true },
        ],
        eye: { u: 0.1, v: 0.33, r: 0.056, inset: 0.66, yaw: 0.2 },
        noseV: 0.47,
        mouthV: 0.69,
    },
    face: {
        eye: { upper: 0.8, lower: -0.86, lashes: 2, iris: 0.92, pupil: 0.46 },
        brow: { dv: 0.105, len: 0.05, thick: 0.009 },
        nose: { kind: "nostrils", w: 0.016, h: 0.009, d: 0.007, v: 0.47 },
        mouth: { w: 0.1, h: 0.06, curve: "smile", teeth: "buck", wrap: 0.12, philtrum: 0, line: 0.0032 },
    },
    ears: {
        kind: "round",
        shape: { len: 0.05, width: 0.05, depth: 0.025, profile: EAR_PROFILES.round, cup: 0.6, inner: 0.6 },
        u: 0.64,
        v: 0.15,
        sink: 0.008,
        tilt: [-0.1, 0.3, 0.6],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0, -0.03, -0.04], [0, -0.07, -0.06]],
        radius: profile([[0, 0.02], [1, 0.01]]),
        tuft: 0.022,
        motion: "wag",
        height: 0.06,
    },
    hands: "paw",
    feet: "paw",
    pawR: 0.05,
    belly: 0.5,
    cheeks: 0,
    sleek: true,
    ruff: 0,
    earMotion: "twitch",
    customFoot: (b, side) => toeFoot(b, side, { toes: 4, thick: 0.17 }),
    paint: paintHippo,
};

registerCompanion(companionFrom(HIPPO));
