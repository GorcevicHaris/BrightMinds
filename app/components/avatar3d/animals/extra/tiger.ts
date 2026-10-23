// Tigar: narandžasto krzno sa tamnim prugama koje se šiljato završavaju ka stomaku, bela
// njuška, obrazi sa čupercima (široko lice), bele tačke iznad očiju, okrugle uši sa belom mrljom
// pozadi, dug rep sa prstenovima i tamnim vrhom.

import * as THREE from "three";
import { registerCompanion } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asKind, bellyMask, col, headLocal, markColor, muzzleOf, rainbowAt, smoothstep, torsoAngle } from "./common";
import { EXTRA_SKINS } from "./skins.data";
import { fbm3 } from "./kit/util";

function tiger(fur: string, stripe: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: "#FFFBF4",
        muzzle: "#FFFFFF",
        inner: "#FFF4EA",
        nose: "#E58F86",
        brow: stripe,
        iris: ["#E8C24A", "#8A5A10"],
        pattern: "none",
        marks: [stripe],
        ...extra,
    };
}

export const TIGER_COATS: Record<string, Coat> = {
    narandzasti: tiger("#F08A2E", "#2A2026"),
    beli: tiger("#F6F2EA", "#3A3640", { iris: ["#8CC8F0", "#2A6AA8"], nose: "#E8A0A8", light: "#FFFFFF" }),
    crni: tiger("#3A343C", "#141016", { light: "#8A828E", muzzle: "#C9C2CC", inner: "#B9B0BC", iris: ["#F2D35C", "#A8800F"], nose: "#2A2228" }),
    plavi: tiger("#8FA6C8", "#2E3A52", { iris: ["#A9DBFF", "#2F74C0"], nose: "#C08A9A" }),
    zlatni: tiger("#F2C443", "#B0741C", { shimmer: true, iris: ["#7ED6F2", "#1F7FA8"], nose: "#C9786A" }),
    dugin: tiger("#FFF2F6", "#B79CFF", { marks: ["#FF8FA8", "#FFB870", "#FFE36A", "#8EE0A0", "#7CC4FF", "#B79CFF"], iris: ["#C9A6F2", "#6A3FB0"], nose: "#F08AA0" }),
};

const stripeColor = new THREE.Color();

/** Pruga sa šiljatim krajevima: `phase` duž pruga, `taper` 0–1 koliko je pruga tu široka */
function stripe(phase: number, taper: number, width = 0.42): number {
    const s = 0.5 + 0.5 * Math.sin(phase);
    const w = width * taper;
    return smoothstep(1 - w, 1 - w * 0.25, s);
}

function paintTiger(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat, shape } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    if (marks.length > 2) rainbowAt(marks, p.y * 3 + p.x, stripeColor);
    else markColor(coat, p, stripeColor);
    const n = fbm3(p.x * 14, p.y * 14, p.z * 14, 3, 11);
    const light = col(coat.light);
    switch (pp.region) {
        case "torso": {
            const a = torsoAngle(p);
            // Svetao stomak i grudi; pruge na leđima i bokovima, šiljate ka stomaku
            out.lerp(light, bellyMask(ctx, p, 0.12));
            const back = smoothstep(0.75, 2.2, Math.abs(a));
            out.lerp(stripeColor, stripe(p.y * 44 + Math.sin(a * 1.6) * 0.9 + n * 3, back, 0.5) * 0.95);
            return;
        }
        case "arm":
        case "leg": {
            const side = pp.side ?? 1;
            const outer = smoothstep(-0.6, 0.6, ((p.x - side * 0.1) * side) / 0.06 + p.z * -3);
            if (pp.region === "leg") out.lerp(light, (1 - outer) * 0.25);
            out.lerp(stripeColor, stripe(p.y * 50 + n * 3, outer * (1 - smoothstep(0.82, 1, pp.t ?? 0)), 0.5) * 0.9);
            return;
        }
        case "hand":
        case "foot":
            out.lerp(light, 0.65);
            return;
        case "tail": {
            const t = pp.t ?? 0;
            out.lerp(stripeColor, Math.max(stripe(t * 40 + n * 1.5, 0.9 + 0.1 * t, 0.5), smoothstep(0.88, 0.94, t)));
            return;
        }
        case "ear":
            if (pp.inner) out.copy(col(coat.inner));
            else out.lerp(stripeColor, smoothstep(0.35, 0.6, pp.t ?? 0) * 0.85);
            return;
        case "head":
        case "lid": {
            const q = headLocal(ctx, p);
            // Bela njuška, obrazi i brada
            const lower = (1 - smoothstep(-0.56, -0.36, q.y - Math.abs(q.x) * 0.12)) * smoothstep(-0.2, 0.25, q.z) * (1 - smoothstep(0.45, 0.75, Math.abs(q.x)));
            out.lerp(light, Math.max(lower, muzzleOf(pp, 0.1, 0.55)));
            // Bele tačke iznad očiju
            for (const e of ctx.eyes) {
                const d = Math.hypot((p.x - e.x - Math.sign(e.x) * ctx.eyeR * 0.25) / (ctx.eyeR * 0.6), (p.y - e.y - ctx.eyeR * 1.75) / (ctx.eyeR * 0.42), (p.z - e.z) / (ctx.eyeR * 2.5));
                out.lerp(light, 1 - smoothstep(0.7, 1, d));
            }
            const face = smoothstep(-0.25, 0.25, q.z) * (1 - muzzleOf(pp, 0.05, 0.4));
            // Čelo: tri pruge koje se sužavaju naniže ka nosu
            for (const cx of [0, -0.2, 0.2]) {
                const top = cx === 0 ? 0.25 : 0.4;
                const along = smoothstep(top, top + 0.15, q.y) * (1 - smoothstep(0.88, 1, q.y));
                const w = 0.06 * (0.4 + 0.6 * smoothstep(top, 0.8, q.y));
                const line = 1 - smoothstep(w * 0.6, w, Math.abs(q.x - cx * (1 + 0.3 * (q.y - 0.5))));
                out.lerp(stripeColor, line * along * face * 0.95);
            }
            // Obrazi: dve pruge sa strane, šiljate ka njušci
            for (const yy of [-0.08, -0.3]) {
                const k = smoothstep(0.45, 0.85, Math.abs(q.x));
                const line = 1 - smoothstep(0.03 * k, 0.055 * k + 0.001, Math.abs(q.y - yy + (Math.abs(q.x) - 0.7) * 0.35));
                out.lerp(stripeColor, line * k * smoothstep(-0.5, 0.0, q.z) * 0.9);
            }
            // Teme i potiljak: kratke pruge
            const backHead = smoothstep(0.1, -0.5, q.z) * smoothstep(-0.3, 0.2, q.y);
            out.lerp(stripeColor, stripe(Math.atan2(q.x, -q.z) * 9 + n * 2, backHead * 0.8) * 0.9);
            return;
        }
        default:
            void shape;
    }
}

export const TIGER: AnimalSpec = {
    kind: "tiger",
    skins: EXTRA_SKINS.tiger,
    coats: TIGER_COATS,
    shape: { kind: asKind("tiger"), girth: 1.02, belly: 1.02, limb: 1.06, head: { w: 0.47, h: 0.4, d: 0.41 } },
    head: {
        flat: 0.14,
        flatTop: 0.25,
        chin: 0.1,
        blobs: [
            // Široki obrazi sa čupercima (tigar ima „okvir” lica)
            { c: [0.1, -0.07, 0.02], r: [0.14, 0.11, 0.14], k: 0.05 },
            { c: [-0.1, -0.07, 0.02], r: [0.14, 0.11, 0.14], k: 0.05 },
            { c: [0, -0.06, 0.1], r: [0.12, 0.085, 0.12], k: 0.04, muzzle: true },
        ],
        bumps: [
            { dir: [0.28, -0.4, 0.87], sigma: 0.18, amp: 0.012, muzzle: true, mirror: true },
            { dir: [0.36, -0.02, 0.93], sigma: 0.12, amp: -0.006, mirror: true },
            { dir: [0.95, -0.35, 0.1], sigma: 0.18, amp: 0.012, mirror: true },
        ],
        eye: { u: 0.085, v: 0.5, r: 0.05, inset: 0.48, yaw: 0.14 },
        noseV: 0.605,
        mouthV: 0.68,
    },
    face: {
        eye: { upper: 0.62, lower: -0.8, lashes: 0, iris: 0.8, pupil: 0.38 },
        brow: { dv: 0.11, len: 0.06, thick: 0.009 },
        nose: { kind: "button", w: 0.026, h: 0.017, d: 0.014, lift: 0.3 },
        mouth: { w: 0.032, h: 0.045, curve: "w", teeth: "fangs", wrap: 0.07, philtrum: 0.014, line: 0.0026 },
        whiskers: { count: 3, len: 0.09, v: 0.655, u: 0.075, color: "#FFFFFF" },
    },
    ears: {
        kind: "round",
        shape: { len: 0.09, width: 0.1, depth: 0.04, profile: EAR_PROFILES.round, cup: 0.6, inner: 0.62, tufts: 3 },
        u: 0.64,
        v: 0.17,
        sink: 0.012,
        tilt: [-0.1, 0.2, 0.5],
        inner: "fur",
    },
    tail: {
        points: [[0, 0, 0], [0.05, -0.05, -0.08], [0.14, -0.04, -0.14], [0.22, 0.06, -0.15], [0.25, 0.2, -0.1], [0.22, 0.31, -0.05]],
        radius: profile([[0, 0.034], [0.4, 0.03], [0.85, 0.028], [0.97, 0.02], [1, 0.006]]),
        motion: "sway",
    },
    hands: "paw",
    feet: "paw",
    belly: 0.55,
    cheeks: 0,
    paint: paintTiger,
};

registerCompanion(companionFrom(TIGER));
