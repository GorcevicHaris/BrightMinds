// Koala: siva, krupne okrugle čupave uši sa belim krznom iznutra, veliki tamni ovalni nos
// (uspravan, sjajan), svetla brada i grudi, male oči sa toplim pogledom; bez repa (samo mali
// čuperak).

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asKind, bellyMask, col, goldCoat, headLocal, isHead, markColor, rainbowCoat, smoothstep } from "./common";
import { EXTRA_SKINS } from "./skins.data";

function koala(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light,
        muzzle: light,
        inner: "#FFFFFF",
        nose: "#2E2A30",
        brow: shade(fur, -0.3),
        iris: ["#8A6446", "#2A180C"],
        pattern: "none",
        marks: ["#FFFFFF"],
        ...extra,
    };
}

export const KOALA_COATS: Record<string, Coat> = {
    siva: koala("#A3A9B4", "#EEF0F4"),
    svetla: koala("#C9CDD5", "#F7F8FA", { iris: ["#9A7656", "#3A200C"] }),
    braon: koala("#9C8878", "#EFE6DC", { nose: "#2A2024" }),
    plava: koala("#8FB2DE", "#EEF5FF", { nose: "#2A3A5E", iris: ["#7A9AC8", "#1E345E"] }),
    zlatna: goldCoat({ pattern: "none", nose: "#6E4424", marks: ["#FFF6D8"], light: "#FFF4D0", muzzle: "#FFF4D0", inner: "#FFF6D8" }),
    duga: rainbowCoat({ pattern: "none", nose: "#5A3E7A", marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], inner: "#FFFFFF" }),
};

const tint = new THREE.Color();

function paintKoala(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat } = ctx;
    const p = pp.p;
    // Duga: krzno u pastelnim prugama po visini, svetli delovi ostaju beli
    if ((coat.marks?.length ?? 0) > 2) out.lerp(markColor(coat, p, tint), pp.region === "head" ? 0.45 : 0.7);
    switch (pp.region) {
        case "torso":
            out.lerp(col(coat.light), bellyMask(ctx, p, 0.05, ctx.shape.neckBaseY + 0.03) * 0.95);
            return;
        case "ear":
            // Belo čupavo krzno iznutra i po obodu uha
            if (pp.inner) out.copy(col(coat.inner));
            else out.lerp(col(coat.inner), smoothstep(0.7, 0.95, pp.t ?? 0) * 0.6);
            return;
        case "hand":
        case "foot":
            out.multiplyScalar(0.82);
            return;
        default:
            if (isHead(pp)) {
                const q = headLocal(ctx, p);
                // Svetla brada i donji obrazi, svetle „obrve” iznad očiju
                const chin = 1 - smoothstep(-0.52, -0.3, q.y + Math.abs(q.x) * 0.1);
                out.lerp(col(coat.light), chin * smoothstep(-0.1, 0.35, q.z));
            }
    }
}

export const KOALA: AnimalSpec = {
    kind: "koala",
    skins: EXTRA_SKINS.koala,
    coats: KOALA_COATS,
    shape: { kind: asKind("koala"), girth: 1.08, belly: 1.1, limb: 1.06, head: { w: 0.48, h: 0.41, d: 0.41 } },
    head: {
        flat: 0.14,
        flatTop: 0.15,
        chin: 0.08,
        blobs: [
            { c: [0, -0.04, 0.0], r: [0.245, 0.16, 0.19], k: 0.07 },
            // Kratka njuška ispod velikog nosa
            { c: [0, -0.07, 0.08], r: [0.08, 0.07, 0.15], k: 0.05, muzzle: true },
        ],
        bumps: [{ dir: [0.36, 0.02, 0.93], sigma: 0.12, amp: -0.006, mirror: true }],
        eye: { u: 0.094, v: 0.49, r: 0.044, inset: 0.5, yaw: 0.16 },
        noseV: 0.56,
        mouthV: 0.69,
    },
    face: {
        eye: { upper: 0.7, lower: -0.82, lashes: 1, iris: 0.92, pupil: 0.5 },
        brow: { dv: 0.1, len: 0.05, thick: 0.008 },
        nose: { kind: "oval", w: 0.04, h: 0.052, d: 0.03, lift: 0.18, v: 0.565 },
        mouth: { w: 0.03, h: 0.04, curve: "smile", teeth: "none", wrap: 0.07, philtrum: 0.006, line: 0.0024 },
    },
    ears: {
        kind: "round",
        shape: { len: 0.135, width: 0.17, depth: 0.05, profile: EAR_PROFILES.round, cup: 0.7, inner: 0.74, tufts: 6 },
        u: 0.69,
        v: 0.22,
        sink: 0.014,
        tilt: [0, -0.15, 0.66],
        inner: "fur",
    },
    tail: { points: [[0, 0, 0], [0, 0.004, -0.02], [0, 0.008, -0.035]], radius: profile([[0, 0.028], [1, 0.028]]), pom: 0.032, motion: "none", height: 0.045 },
    hands: "paw",
    feet: "paw",
    belly: 0.55,
    cheeks: 0,
    earMotion: "swing",
    paint: paintKoala,
};

registerCompanion(companionFrom(KOALA));
