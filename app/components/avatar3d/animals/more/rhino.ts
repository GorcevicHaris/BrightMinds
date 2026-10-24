// Nosorog (drugarski): krupna glava sa širokom njuškom i dva roga na nosu (veliki napred, mali
// iza — sidro `horn` je veliki rog), uspravne uši-levkovi (kapa ih propušta), nabori kože na
// ramenima i kukovima (senke), krupno telo, stopala sa tri debela prsta i rep sa čupercem.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { toeFoot } from "../extra/hands";
import { addHorns, asMore, bellyMask, coat, col, fbm3, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function rhino(fur: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, shade(fur, 0.22), { muzzle: shade(fur, 0.1), inner: "#E8B4BC", nose: shade(fur, -0.45), brow: shade(fur, -0.3), iris: ["#8A6A4A", "#2A1A0E"], horn: "#E8DCC6", tailTip: shade(fur, -0.3), ...extra });
}

export const RHINO_COATS: Record<string, Coat> = {
    sivi: rhino("#9A98A0"),
    svetli: rhino("#C2BEC0"),
    smedji: rhino("#A8907C", { horn: "#DCC8A8" }),
    plavi: rhino("#86A6D2", { horn: "#F2ECE0", iris: ["#3A5A8A", "#0E1A2E"] }),
    ljubicasti: rhino("#A894D6", { horn: "#FFF2E0", iris: ["#4A2A6A", "#140A24"] }),
    zlatni: goldCoat({ horn: "#FFF6E0", nose: "#6A4A1E", tailTip: "#B07A1E" }),
    dugin: rhino("#F6F2FA", { marks: RAINBOW, horn: "#FFF2E0", iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintRhino(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    if ((c.marks ?? []).length > 2) out.lerp(rainbowAt(RAINBOW, p.y * 2.2 + p.x * 0.5, tmp), 0.5);
    // Koža: blago zrnasta
    out.multiplyScalar(0.94 + fbm3(p.x * 30, p.y * 30, p.z * 30, 2, 4) * 0.12);
    if (pp.region === "torso") {
        out.lerp(col(c.light), bellyMask(ctx, p, 0.05) * 0.45);
        // Nabori: tamne linije oko ramena i iznad kukova
        const fold = Math.exp(-(((p.y - (shape.chestY - 0.015)) / 0.006) ** 2)) + Math.exp(-(((p.y - (shape.hipY + 0.03)) / 0.006) ** 2));
        out.multiplyScalar(1 - Math.min(1, fold) * 0.18 * smoothstep(0.4, 1.4, Math.abs(Math.atan2(p.x, p.z))));
    }
    if (pp.region === "arm" || pp.region === "leg") {
        const fold = Math.exp(-((((pp.t ?? 0) - 0.15) / 0.03) ** 2));
        out.multiplyScalar(1 - fold * 0.15);
    }
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        out.lerp(col(c.light), (1 - smoothstep(-0.5, -0.3, q.y)) * smoothstep(-0.2, 0.3, q.z) * 0.6);
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.35) / 0.04) ** 2 + ((p.y - e.y + 0.08) / 0.03) ** 2))));
        out.lerp(col("#FF9CB0"), cheek * 0.3);
    }
}

export const RHINO: AnimalSpec = {
    kind: "rhino",
    skins: MORE_SKINS.rhino,
    coats: RHINO_COATS,
    shape: { kind: asMore("rhino"), girth: 1.2, belly: 1.2, pear: 0.1, limb: 1.2, legK: 0.88, armK: 0.95, head: { w: 0.38, h: 0.36, d: 0.38 } },
    ref: 0.46,
    head: {
        flat: 0.04,
        flatTop: 0.25,
        chin: 0.04,
        blobs: [
            { c: [0, -0.06, 0.02], r: [0.24, 0.17, 0.2], k: 0.07 },
            // Široka zaobljena njuška
            { c: [0, -0.085, 0.12], r: [0.14, 0.1, 0.18], k: 0.06, muzzle: true },
        ],
        bumps: [
            { dir: [0.38, 0.05, 0.92], sigma: 0.13, amp: -0.005, mirror: true },
            { dir: [0.22, -0.6, 0.75], sigma: 0.12, amp: 0.01, muzzle: true, mirror: true },
        ],
        eye: { u: 0.112, v: 0.43, r: 0.054, inset: 0.68, yaw: 0.3 },
        noseV: 0.66,
        mouthV: 0.75,
    },
    face: {
        eye: { upper: 0.82, lower: -0.86, lashes: 2, iris: 0.94, pupil: 0.48 },
        brow: { dv: 0.11, len: 0.05, thick: 0.009 },
        nose: { kind: "nostrils", w: 0.013, h: 0.008, d: 0.006, v: 0.66 },
        mouth: { w: 0.06, h: 0.05, curve: "smile", teeth: "none", wrap: 0.1, philtrum: 0, line: 0.003 },
    },
    ears: {
        kind: "pointy",
        shape: { len: 0.1, width: 0.065, depth: 0.035, profile: EAR_PROFILES.tall, cup: 0.75, inner: 0.65, bend: 0.01 },
        u: 0.63,
        v: 0.14,
        sink: 0.012,
        tilt: [-0.15, 0.4, 0.45],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0, -0.04, -0.04], [0.01, -0.1, -0.06]],
        radius: profile([[0, 0.016], [1, 0.01]]),
        tuft: 0.026,
        motion: "flick",
        height: 0.06,
    },
    hands: "paw",
    feet: "paw",
    pawR: 0.05,
    belly: 0.3,
    cheeks: 0,
    sleek: true,
    earMotion: "twitch",
    customFoot: (b, side) => toeFoot(b, side, { toes: 3, thick: 0.22 }),
    extras: (b) => {
        const color = b.coat.horn ?? "#E8DCC6";
        // Veliki rog napred (sidro), mali iza njega
        addHorns(b, { u: 0.5, v: 0.5, single: true, points: [[0, 0, 0], [0, 0.05, 0.03], [0, 0.11, 0.025], [0, 0.15, -0.005]], r0: 0.034, r1: 0.006, color });
        addHorns(b, { u: 0.5, v: 0.41, single: true, points: [[0, 0, 0], [0, 0.035, 0.01], [0, 0.06, 0.0]], r0: 0.024, r1: 0.006, color }, false);
    },
    paint: paintRhino,
};

registerCompanion(companionFrom(RHINO));
