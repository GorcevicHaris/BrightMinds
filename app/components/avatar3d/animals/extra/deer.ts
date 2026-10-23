// Srna: toplo smeđe krzno, bele tačkice po leđima (lane), bela njuška, brada i stomak, crni
// sjajan nos, krupne uši sa belom unutrašnjošću, velike oči sa dugim trepavicama, kratak beo
// repić, tanke noge sa kopitima.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asKind, bellyMask, col, goldCoat, headLocal, isHead, muzzleOf, rainbowAt, smoothstep, torsoAngle } from "./common";
import { cells3 } from "./kit/util";
import { EXTRA_SKINS } from "./skins.data";

function deer(fur: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: "#FFF8F0",
        muzzle: "#FFF6EC",
        inner: "#FFF2EA",
        nose: "#1E1A1C",
        brow: shade(fur, -0.25),
        iris: ["#8A5A2A", "#24140A"],
        pattern: "none",
        hoof: "#3A2E2A",
        tail: "#FFFFFF",
        ...extra,
    };
}

export const DEER_COATS: Record<string, Coat> = {
    pegava: deer("#C07A46", { marks: ["#FFF6EA"] }),
    braon: deer("#A8683C"),
    svetla: deer("#DDAE7C", { iris: ["#9A6A3A", "#3A200C"] }),
    bela: deer("#F8F4EE", { light: "#FFFFFF", muzzle: "#FFFFFF", nose: "#D9909E", iris: ["#7AA6D6", "#2A4A7E"], hoof: "#9A8A80", marks: ["#E8DCCC"] }),
    zlatna: goldCoat({ pattern: "gold", hoof: "#9A6A1E", tail: "#FFFFFF", nose: "#3A2A24" }),
    duga: deer("#FFF2F6", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], iris: ["#C9A6F2", "#6A3FB0"], hoof: "#8A6AAA" }),
};

const tmp = new THREE.Color();

function paintDeer(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.4, tmp), 0.6);
    const light = col(coat.light);
    switch (pp.region) {
        case "torso": {
            out.lerp(light, bellyMask(ctx, p, 0.05));
            // Bele tačkice u dva reda niz leđa (lane)
            if (marks.length === 1) {
                const back = smoothstep(1.7, 2.4, Math.abs(torsoAngle(p)));
                const [d1] = cells3(p.x * 22, p.y * 22, p.z * 22, 31, 0.6);
                out.lerp(col(marks[0]), (1 - smoothstep(0.13, 0.17, d1)) * back);
            }
            return;
        }
        case "leg":
        case "arm":
            out.multiplyScalar(1 - smoothstep(0.75, 0.95, pp.t ?? 0) * 0.15);
            return;
        case "ear":
            if (pp.inner) out.lerp(col(coat.inner), 0.9);
            else out.lerp(col(shade(coat.fur, -0.3)), smoothstep(0.8, 0.98, pp.t ?? 0) * 0.6);
            return;
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Bela njuška i brada, tamnija linija po sredini čela
    out.lerp(light, Math.max(muzzleOf(pp, 0.15, 0.55), (1 - smoothstep(-0.55, -0.38, q.y)) * smoothstep(-0.2, 0.3, q.z)));
    const stripe = (1 - smoothstep(0.03, 0.08, Math.abs(q.x))) * smoothstep(-0.1, 0.2, q.y) * smoothstep(0.2, 0.5, q.z);
    out.lerp(col(shade(coat.fur, -0.2)), stripe * 0.5);
}

export const DEER: AnimalSpec = {
    kind: "deer",
    skins: EXTRA_SKINS.deer,
    coats: DEER_COATS,
    shape: { kind: asKind("deer"), girth: 0.95, belly: 1.0, limb: 0.9, legK: 1.05, head: { w: 0.34, h: 0.33, d: 0.36 } },
    ref: 0.43,
    head: {
        flat: 0.05,
        flatTop: 0.1,
        chin: 0.12,
        blobs: [
            // Nežna izdužena njuška
            // Duga, vitka njuška
            { c: [0, -0.085, 0.15], r: [0.085, 0.075, 0.21], k: 0.065, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, 0.02, 0.9], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0, 0.35, 0.94], sigma: 0.16, amp: 0.006 },
        ],
        eye: { u: 0.112, v: 0.43, r: 0.062, inset: 0.68, yaw: 0.3 },
        noseV: 0.625,
        mouthV: 0.715,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 3, iris: 1.0, pupil: 0.52 },
        brow: { dv: 0.115, len: 0.045, thick: 0.007 },
        nose: { kind: "oval", w: 0.026, h: 0.019, d: 0.017, lift: 0.3, tilt: -0.3, v: 0.625 },
        mouth: { w: 0.032, h: 0.05, curve: "smile", teeth: "none", wrap: 0.06, philtrum: 0.012, line: 0.0024 },
    },
    ears: {
        kind: "tall",
        shape: { len: 0.19, width: 0.125, depth: 0.035, profile: EAR_PROFILES.tall, cup: 0.65, inner: 0.74, bend: 0.012, tufts: 3 },
        u: 0.68,
        v: 0.22,
        sink: 0.012,
        tilt: [-0.05, 0.45, 1.05],
        inner: "fur",
    },
    tail: { points: [[0, 0, 0], [0, 0.02, -0.03], [0, 0.04, -0.05]], radius: profile([[0, 0.025], [0.5, 0.03], [1, 0.02]]), pom: 0.034, motion: "flick", height: 0.08 },
    hands: "hoof",
    feet: "hoof",
    belly: 0.5,
    cheeks: 0,
    earMotion: "twitch",
    paint: paintDeer,
};

registerCompanion(companionFrom(DEER));
