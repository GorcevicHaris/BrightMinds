// Panda: okrugla i punačka, velike tamne mrlje oko očiju (kao suze nagnute napolje), crne
// okrugle uši, ruke, noge i pojas preko ramena; bela njuška sa crnim nosom i mali pufnasti rep.
// Posebna krzna menjaju boju mrlja (roze, plava, zlatna, duga).

import * as THREE from "three";
import { registerCompanion } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { EAR_PROFILES } from "../parts";
import { asKind, eyePatch, isHead, markColor, muzzleOf, smoothstep, torsoAngle } from "./common";
import { EXTRA_SKINS } from "./skins.data";

const INK = "#2A2A30";

function panda(fur: string, mark: string | string[], extra: Partial<Coat> = {}): Coat {
    const marks = Array.isArray(mark) ? mark : [mark];
    return {
        fur,
        // Svetla boja daje i sjaj krzna po ivicama: srednje siva, da crne šare ne „izblede”
        light: "#4E4E56",
        muzzle: "#FFFFFF",
        inner: marks[0],
        nose: INK,
        brow: marks[0],
        iris: ["#8A6446", "#2A180C"],
        pattern: "none",
        marks,
        ...extra,
    };
}

export const PANDA_COATS: Record<string, Coat> = {
    "crno-bela": panda("#FAFAF6", "#2B2B31"),
    smedja: panda("#F7F0E6", "#6A4A38", { nose: "#3A2A24", iris: ["#9A7050", "#3A200C"] }),
    roze: panda("#FFF6F9", "#F08DB4", { nose: "#C2537E", iris: ["#B57A9A", "#5A1E3E"] }),
    plava: panda("#F6FAFF", "#5E8FD6", { nose: "#2E4A7E", iris: ["#7A9AC8", "#1E345E"] }),
    zlatna: panda("#FFF5D6", "#D9A21E", { nose: "#8A5A10", shimmer: true, iris: ["#7ED6F2", "#1F7FA8"] }),
    duga: panda("#FFFFFF", ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], { nose: "#6A4A8A", iris: ["#C9A6F2", "#6A3FB0"] }),
};

const mark = new THREE.Color();

/** Šara pande: mrlje oko očiju, uši, ruke, noge i pojas preko ramena (oblik kao kod prave pande) */
function paintPanda(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat, shape } = ctx;
    const p = pp.p;
    markColor(coat, p, mark);
    switch (pp.region) {
        case "arm":
        case "hand":
        case "leg":
        case "foot":
        case "ear":
            out.copy(mark);
            if (pp.region === "ear" && pp.inner) out.multiplyScalar(0.82);
            return;
        case "torso": {
            const a = Math.abs(torsoAngle(p));
            // Pojas preko ramena: širok na leđima i bokovima, sužava se ka grudima
            const band = smoothstep(shape.chestY - 0.03 - 0.03 * smoothstep(1.2, 3, a), shape.chestY + 0.01, p.y) * (1 - smoothstep(shape.neckBaseY - 0.01, shape.neckBaseY + 0.025, p.y));
            const sides = smoothstep(0.75, 1.35, a);
            const hips = 1 - smoothstep(shape.crotchY + 0.025, shape.crotchY + 0.07, p.y + Math.max(0, Math.cos(a)) * 0.02);
            out.lerp(mark, Math.max(band * sides, hips));
            return;
        }
        case "head":
        case "lid": {
            // Mrlja kao suza: veća ispod oka, nagnuta napolje-dole
            const patch = eyePatch(ctx, p, { rx: 1.4, ry: 1.9, dx: 0.3, dy: -0.32, tilt: -0.5, soft: 0.28 });
            out.lerp(mark, Math.min(1, patch * 1.35) * (1 - muzzleOf(pp, 0.25, 0.7)));
            return;
        }
        default:
            if (isHead(pp)) return;
    }
}

export const PANDA: AnimalSpec = {
    kind: "panda",
    skins: EXTRA_SKINS.panda,
    coats: PANDA_COATS,
    shape: { kind: asKind("panda"), girth: 1.12, belly: 1.15, legK: 0.9, armK: 0.95, limb: 1.14, head: { w: 0.43, h: 0.37, d: 0.37 } },
    ref: 0.5,
    head: {
        flat: 0.1,
        flatTop: 0.2,
        chin: 0.05,
        blobs: [
            // Puni obrazi (panda je široka u donjem delu lica)
            { c: [0, -0.06, 0.02], r: [0.235, 0.15, 0.18], k: 0.06 },
            // Kratka, okrugla njuška
            { c: [0, -0.065, 0.125], r: [0.1, 0.072, 0.09], k: 0.04, muzzle: true },
        ],
        bumps: [
            { dir: [0.3, -0.38, 0.88], sigma: 0.17, amp: 0.008, muzzle: true, mirror: true },
            { dir: [0.36, 0.0, 0.93], sigma: 0.13, amp: -0.005, mirror: true },
        ],
        eye: { u: 0.085, v: 0.535, r: 0.05, inset: 0.68, yaw: 0.12 },
        noseV: 0.6,
        mouthV: 0.68,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 0, iris: 0.82, pupil: 0.44 },
        brow: { dv: 0.11, len: 0.06, thick: 0.008 },
        nose: { kind: "oval", w: 0.03, h: 0.021, d: 0.017, lift: 0.3 },
        mouth: { w: 0.03, h: 0.04, curve: "smile", teeth: "row", wrap: 0.07, philtrum: 0.012, line: 0.0026 },
    },
    ears: {
        kind: "round",
        shape: { len: 0.1, width: 0.11, depth: 0.048, profile: EAR_PROFILES.round, cup: 0.55, inner: 0.62 },
        u: 0.638,
        v: 0.18,
        sink: 0.016,
        tilt: [-0.12, 0.25, 0.5],
        inner: "fur",
    },
    tail: {
        points: [[0, 0, 0], [0, 0.01, -0.03], [0, 0.02, -0.05]],
        radius: profile([[0, 0.03], [1, 0.03]]),
        pom: 0.04,
        motion: "flick",
        height: 0.05,
    },
    hands: "paw",
    feet: "paw",
    belly: 0,
    cheeks: 0,
    earMotion: "twitch",
    paint: paintPanda,
};

registerCompanion(companionFrom(PANDA));
