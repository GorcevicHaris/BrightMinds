// Rakun: sivo krzno, tamna „maska” preko očiju sa belim obodom i belim obrvama, bela njuška
// sa crnim nosićem, šiljate uši sa belim rubom, tamne šake sa prstima („rukavice”) i čupav rep
// sa tamnim prstenovima.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asKind, bellyMask, col, eyePatch, goldCoat, headLocal, isHead, muzzleOf, rainbowAt, smoothstep } from "./common";
import { fingerHand } from "./hands";
import { EXTRA_SKINS } from "./skins.data";

function raccoon(fur: string, mask: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: "#F4F2EE",
        muzzle: "#FFFFFF",
        inner: shade(mask, 0.3),
        nose: "#1E1A20",
        brow: "#FFFFFF",
        iris: ["#9A6A3A", "#2A180C"],
        pattern: "none",
        marks: [mask],
        paws: shade(mask, 0.15),
        ...extra,
    };
}

export const RACCOON_COATS: Record<string, Coat> = {
    sivi: raccoon("#8E9098", "#2C2A30"),
    smedji: raccoon("#9A7E66", "#3A2A22", { light: "#F6EEE4", muzzle: "#FFF8F0" }),
    plavi: raccoon("#7E9CC8", "#24324E", { iris: ["#7A9AC8", "#1E345E"] }),
    ljubicasti: raccoon("#A68AC8", "#3A2A52", { iris: ["#B57AD6", "#4A1E6A"] }),
    zlatni: goldCoat({ pattern: "none", marks: ["#9A6A1E"], paws: "#B07A1E", light: "#FFF6D8", muzzle: "#FFFFFF", brow: "#FFFFFF" }),
    dugin: raccoon("#F6F2FA", "#7A6AA8", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], paws: "#8A7AB8", iris: ["#C9A6F2", "#6A3FB0"] }),
};

const tmp = new THREE.Color();

function paintRaccoon(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    const rainbow = marks.length > 2;
    const mask = rainbow ? col("#6A5A98") : col(marks[0]);
    if (rainbow && !isHead(pp)) out.lerp(rainbowAt(marks, p.y * 2.4, tmp), 0.6);
    const light = col(coat.light);
    switch (pp.region) {
        case "torso":
            out.lerp(light, bellyMask(ctx, p, -0.05) * 0.85);
            return;
        case "hand":
        case "foot":
            out.copy(col(coat.paws ?? marks[0]));
            return;
        case "arm":
        case "leg":
            out.lerp(col(coat.paws ?? marks[0]), smoothstep(0.7, 0.95, pp.t ?? 0) * 0.9);
            return;
        case "tail": {
            // Prstenovi: 5 tamnih traka, tamni vrh
            const t = pp.t ?? 0;
            const ring = smoothstep(0.35, 0.6, Math.sin(t * Math.PI * 2 * 4.5 - 0.6));
            if (rainbow) out.copy(rainbowAt(marks, t * 1.2, tmp));
            out.lerp(mask, Math.max(ring * smoothstep(0.08, 0.16, t), smoothstep(0.88, 0.94, t)) * 0.92);
            return;
        }
        case "ear":
            out.lerp(light, pp.inner ? 0.9 : smoothstep(0.6, 0.85, pp.t ?? 0) * 0.85);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Bela njuška i donji deo lica, bele „obrve”
    const lower = (1 - smoothstep(-0.42, -0.22, q.y)) * smoothstep(-0.1, 0.3, q.z) * (1 - smoothstep(0.5, 0.75, Math.abs(q.x)));
    out.lerp(light, Math.max(lower, muzzleOf(pp, 0.1, 0.5)));
    for (const e of ctx.eyes) {
        const d = Math.hypot((p.x - e.x) / (ctx.eyeR * 1.1), (p.y - e.y - ctx.eyeR * 1.75) / (ctx.eyeR * 0.5), (p.z - e.z) / (ctx.eyeR * 3));
        out.lerp(light, (1 - smoothstep(0.75, 1, d)) * 0.95);
    }
    // Maska: široka traka preko očiju, ka obrazima; tamna pruga niz čelo
    const m = eyePatch(ctx, p, { rx: 2.1, ry: 1.25, dx: 0.45, dy: -0.25, tilt: -0.3, soft: 0.2 });
    out.lerp(mask, Math.min(1, m * 1.3) * (1 - muzzleOf(pp, 0.2, 0.6)));
    const stripe = (1 - smoothstep(0.05, 0.09, Math.abs(q.x))) * smoothstep(0.0, 0.2, q.y) * smoothstep(0.1, 0.4, q.z);
    out.lerp(mask, stripe * 0.7);
}

export const RACCOON: AnimalSpec = {
    kind: "raccoon",
    skins: EXTRA_SKINS.raccoon,
    coats: RACCOON_COATS,
    shape: { kind: asKind("raccoon"), girth: 1.04, belly: 1.08, limb: 1.0, head: { w: 0.38, h: 0.34, d: 0.36 } },
    ref: 0.44,
    head: {
        flat: 0.08,
        flatTop: 0.15,
        chin: 0.12,
        blobs: [
            // Puni obrazi sa čupercima i kratka šiljata njuška
            { c: [0, -0.06, 0.02], r: [0.24, 0.13, 0.18], k: 0.06 },
            { c: [0, -0.07, 0.12], r: [0.085, 0.07, 0.13], k: 0.05, muzzle: true },
        ],
        bumps: [
            { dir: [0.38, 0.0, 0.93], sigma: 0.12, amp: -0.006, mirror: true },
            { dir: [0.92, -0.38, 0.1], sigma: 0.15, amp: 0.012, mirror: true },
        ],
        eye: { u: 0.09, v: 0.48, r: 0.058, inset: 0.68, yaw: 0.16 },
        noseV: 0.595,
        mouthV: 0.68,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 1, iris: 0.98, pupil: 0.5 },
        brow: { dv: 0.118, len: 0.05, thick: 0.008 },
        nose: { kind: "oval", w: 0.026, h: 0.018, d: 0.017, lift: 0.3, tilt: -0.15 },
        mouth: { w: 0.034, h: 0.055, curve: "w", teeth: "fangs", wrap: 0.06, philtrum: 0.014, line: 0.0025 },
        whiskers: { count: 2, len: 0.08, v: 0.655, u: 0.07, color: "#FFFFFF" },
    },
    ears: {
        kind: "pointy",
        shape: { len: 0.11, width: 0.11, depth: 0.04, profile: EAR_PROFILES.pointy, bend: 0.01, cup: 0.55, inner: 0.7, tufts: 3 },
        u: 0.635,
        v: 0.18,
        sink: 0.012,
        tilt: [-0.12, 0.2, 0.5],
        inner: "fur",
    },
    tail: {
        points: [[0, 0, 0], [0.04, -0.05, -0.08], [0.12, -0.04, -0.15], [0.2, 0.05, -0.17], [0.24, 0.17, -0.12]],
        radius: profile([[0, 0.04], [0.3, 0.056], [0.7, 0.054], [0.92, 0.036], [1, 0.012]]),
        clumps: 8,
        motion: "sway",
    },
    hands: "hand",
    feet: "paw",
    belly: 0.45,
    cheeks: 0,
    customHand: (b, side) => fingerHand(b, side, { fingers: 4, len: 0.62, thick: 0.2 }),
    paint: paintRaccoon,
};

registerCompanion(companionFrom(RACCOON));
