// Zajedničko za velike mačke (gepard, leopard): mačja glava sa kratkom njuškom i belim
// obrazima, okrugle uši, dug rep, i bojenje pega/rozeta po telu (pege na glavi su sitnije, bez
// pega na njušci i stomaku).

import * as THREE from "three";
import { shade } from "../../contract";
import type { AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { bellyMask, col, headLocal, isHead, markColor, muzzleOf, rainbowAt, smoothstep } from "./common";

export const CAT_HEAD: Pick<AnimalSpec, "head" | "face" | "ears" | "ref"> = {
    ref: 0.46,
    head: {
        flat: 0.14,
        flatTop: 0.25,
        chin: 0.12,
        blobs: [
            { c: [0.09, -0.07, 0.02], r: [0.13, 0.1, 0.13], k: 0.05 },
            { c: [-0.09, -0.07, 0.02], r: [0.13, 0.1, 0.13], k: 0.05 },
            { c: [0, -0.06, 0.1], r: [0.11, 0.08, 0.12], k: 0.04, muzzle: true },
        ],
        bumps: [
            { dir: [0.28, -0.4, 0.87], sigma: 0.18, amp: 0.011, muzzle: true, mirror: true },
            { dir: [0.36, -0.02, 0.93], sigma: 0.12, amp: -0.006, mirror: true },
        ],
        eye: { u: 0.086, v: 0.49, r: 0.054, inset: 0.68, yaw: 0.14 },
        noseV: 0.6,
        mouthV: 0.68,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 2, iris: 0.84, pupil: 0.4, almond: 1.18 },
        brow: { dv: 0.11, len: 0.055, thick: 0.0085 },
        nose: { kind: "button", w: 0.026, h: 0.017, d: 0.014, lift: 0.3 },
        mouth: { w: 0.032, h: 0.045, curve: "w", teeth: "fangs", wrap: 0.07, philtrum: 0.014, line: 0.0026 },
        whiskers: { count: 3, len: 0.09, v: 0.655, u: 0.072, color: "#FFFFFF" },
    },
    ears: {
        kind: "round",
        shape: { len: 0.08, width: 0.09, depth: 0.035, profile: EAR_PROFILES.round, cup: 0.6, inner: 0.62, tufts: 3 },
        u: 0.635,
        v: 0.17,
        sink: 0.012,
        tilt: [-0.1, 0.2, 0.5],
        inner: "fur",
    },
};

const tmp = new THREE.Color();

/**
 * Šara velike mačke: `spot(p, glava)` vraća udeo tamne šare (0–1) i opciono svetlije središte
 * (rozeta). Stomak, njuška i unutrašnjost udova su svetli i bez šare.
 */
export function paintBigCat(spot: (p: THREE.Vector3, head: boolean) => [number, number], ring?: (pp: PaintPoint) => number): (pp: PaintPoint, ctx: PaintContext, out: THREE.Color) => void {
    return (pp, ctx, out) => {
        const { coat: c } = ctx;
        const p = pp.p;
        const marks = c.marks ?? [];
        const light = col(c.light);
        const mark = marks.length > 2 ? rainbowAt(marks, p.y * 3 + p.x * 2, tmp) : markColor(c, p, tmp);
        let keep = 1;
        switch (pp.region) {
            case "torso": {
                const m = bellyMask(ctx, p, 0.12);
                out.lerp(light, m);
                keep = 1 - m * 0.85;
                break;
            }
            case "arm":
            case "leg": {
                const side = pp.side ?? 1;
                const inner = smoothstep(0.3, -0.6, ((p.x - side * 0.09) * side) / 0.05);
                out.lerp(light, inner * 0.6);
                keep = 1 - inner * 0.6;
                break;
            }
            case "hand":
            case "foot":
                out.lerp(light, 0.4);
                keep = 0.4;
                break;
            case "ear":
                if (pp.inner) {
                    out.copy(light);
                    return;
                }
                out.lerp(mark, smoothstep(0.45, 0.7, pp.t ?? 0) * 0.8);
                return;
            case "tail": {
                const r = ring?.(pp) ?? 0;
                out.lerp(mark, r);
                keep = 1 - r;
                break;
            }
            default:
                break;
        }
        if (isHead(pp)) {
            const q = headLocal(ctx, p);
            const lower = (1 - smoothstep(-0.56, -0.34, q.y - Math.abs(q.x) * 0.12)) * smoothstep(-0.2, 0.25, q.z) * (1 - smoothstep(0.45, 0.75, Math.abs(q.x)));
            const m = Math.max(lower, muzzleOf(pp, 0.1, 0.5));
            out.lerp(light, m);
            // Bez pega oko očiju
            let eyes = 0;
            for (const e of ctx.eyes) eyes = Math.max(eyes, 1 - smoothstep(ctx.eyeR * 1.35, ctx.eyeR * 1.8, p.distanceTo(e)));
            keep = (1 - m) * (1 - eyes);
        }
        const [s, center] = spot(p, isHead(pp));
        out.lerp(mark, s * keep);
        if (center > 0) out.lerp(col(shade(c.fur, -0.2)), center * keep * 0.5);
    };
}
