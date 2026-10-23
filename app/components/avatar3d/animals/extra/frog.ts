// Žaba: široka spljoštena glava, krupne oči na „kupolama” na vrhu glave, širok osmeh od obraza
// do obraza, glatka vlažna koža (svetao stomak i grlo), rumeni obrazi, tanki prsti sa okruglim
// jastučićima i plivaća stopala. Bez ušiju i bez repa.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { asKind, bellyMask, brimRadiusAt, col, goldCoat, headLocal, isHead, rainbowAt, smoothstep } from "./common";
import { fingerHand, toeFoot } from "./hands";
import { cells3 } from "./kit/util";
import { EXTRA_SKINS } from "./skins.data";

function frog(skin: string, belly: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur: skin,
        light: belly,
        muzzle: skin,
        inner: belly,
        nose: shade(skin, -0.45),
        brow: shade(skin, -0.25),
        iris: ["#E8C24A", "#7A5A10"],
        pattern: "none",
        mouth: shade(skin, -0.6),
        ...extra,
    };
}

export const FROG_COATS: Record<string, Coat> = {
    zelena: frog("#72C25A", "#EEF7BE"),
    zuta: frog("#F2CC3E", "#FFF6CC", { iris: ["#7A5A2A", "#2A180C"] }),
    plava: frog("#3E8EE0", "#BFE0FF", { marks: ["#1E2A44"], iris: ["#2A2A30", "#0A0A10"] }),
    crvena: frog("#E8503A", "#FFE6A6", { iris: ["#2A2A30", "#0A0A10"], marks: ["#2A2A30"] }),
    tufnasta: frog("#86C96A", "#F4F8CC", { marks: ["#3E8A4A"] }),
    zlatna: goldCoat({ pattern: "gold", light: "#FFF6CC", mouth: "#8A5A10", nose: "#9A6A1E" }),
    duga: frog("#F6F2FA", "#FFFFFF", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], iris: ["#C9A6F2", "#6A3FB0"], mouth: "#6A4A8A" }),
};

const tmp = new THREE.Color();

function paintFrog(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.2 + p.x * 0.5, tmp), 0.7);
    else if (marks.length) {
        // Pege (okrugle mrlje) po leđima, glavi i nogama — ne po stomaku
        const [d1] = cells3(p.x * 20, p.y * 20, p.z * 20, 13, 0.9);
        const keep = pp.region === "torso" ? 1 - bellyMask(ctx, p, 0.1) : 1;
        out.lerp(col(marks[0]), (1 - smoothstep(0.2, 0.26, d1)) * keep * (isHead(pp) ? smoothstep(-0.2, 0.2, headLocal(ctx, p).y) : 1));
    }
    const light = col(coat.light);
    switch (pp.region) {
        case "torso":
            out.lerp(light, bellyMask(ctx, p, 0.15, ctx.shape.neckBaseY + 0.04));
            return;
        case "leg":
        case "arm": {
            // Svetlija unutrašnja strana udova
            const side = pp.side ?? 1;
            const inner = smoothstep(0.2, -0.6, ((p.x - side * 0.08) * side) / 0.05);
            out.lerp(light, inner * 0.45);
            return;
        }
        default:
            if (!isHead(pp)) return;
    }
    const q = headLocal(ctx, p);
    // Svetlo grlo i donja vilica, rumeni obrazi ispod očiju
    out.lerp(light, (1 - smoothstep(-0.55, -0.32, q.y)) * smoothstep(-0.3, 0.2, q.z));
    const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.05) / 0.04) ** 2 + ((p.y - e.y + 0.09) / 0.028) ** 2))));
    out.lerp(col("#FF8C8C"), cheek * 0.32);
}

export const FROG: AnimalSpec = {
    kind: "frog",
    skins: EXTRA_SKINS.frog,
    coats: FROG_COATS,
    shape: { kind: asKind("frog"), girth: 1.08, belly: 1.12, pear: 0.3, limb: 0.92, legK: 0.85, head: { w: 0.42, h: 0.3, d: 0.36 } },
    ref: 0.5,
    head: {
        flat: 0.12,
        flatTop: 0.35,
        chin: 0.0,
        blobs: [
            // Kupole očiju na vrhu glave
            { c: [0.1, 0.09, 0.07], r: [0.1, 0.09, 0.09], k: 0.05 },
            { c: [-0.1, 0.09, 0.07], r: [0.1, 0.09, 0.09], k: 0.05 },
            // Široka donja vilica
            { c: [0, -0.06, 0.05], r: [0.25, 0.1, 0.17], k: 0.06, muzzle: true },
        ],
        bumps: [{ dir: [0, -0.2, 1], sigma: 0.2, amp: 0.006 }],
        eye: { u: 0.085, v: 0.3, r: 0.072, inset: 0.6, yaw: 0.25 },
        noseV: 0.5,
        mouthV: 0.6,
    },
    face: {
        eye: { upper: 0.86, lower: -0.86, lashes: 1, iris: 0.96, pupil: 0.5 },
        brow: { dv: 0.12, len: 0.06, thick: 0.009 },
        nose: { kind: "nostrils", w: 0.006, h: 0.004, d: 0.004, v: 0.5 },
        mouth: { w: 0.105, h: 0.06, curve: "smile", teeth: "none", wrap: 0.12, philtrum: 0, line: 0.0034 },
    },
    hands: "hand",
    feet: "webbed",
    belly: 0.7,
    cheeks: 0,
    sleek: true,
    customHand: (b, side) => fingerHand(b, side, { fingers: 4, len: 0.85, thick: 0.15, bulbs: true }),
    customFoot: (b, side) => toeFoot(b, side, { toes: 4, thick: 0.13, webbed: true }),
    anchors: (a, b) => {
        // Bez ušiju; oči su na vrhu glave, pa kapa naleže iznad njih (između kupola i iza)
        a.ears.kind = "none";
        a.head.brimY = Math.min(a.head.top.y - 0.02, a.eyes.left.y + a.eyes.radius * 0.25);
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintFrog,
};

registerCompanion(companionFrom(FROG));
