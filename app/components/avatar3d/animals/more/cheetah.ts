// Gepard: vitko telo i duge noge, mala okrugla glava sa tamnim „suzama” od očiju do usta
// (oštre šare-površine), pune okrugle pege po telu (sitnije na glavi), svetao stomak i dug rep
// sa tamnim prstenovima i belim vrhom. Kraljevski gepard ima spojene pege u pruge.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { asMore, coat, col, dots, fbm3, goldCoat, headMarks, rainbowAt, RAINBOW, smoothstep, stripeOutline, type HeadMark } from "./common";
import { CAT_HEAD, paintBigCat } from "./bigcat";
import { MORE_SKINS } from "./skins.data";

function cheetah(fur: string, spot: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, "#FFFBF2", { muzzle: "#FFFFFF", inner: "#FFF4EA", nose: "#2A2228", brow: shade(spot, 0.2), iris: ["#E8B84A", "#8A5410"], marks: [spot], tailTip: "#FFFFFF", ...extra });
}

export const CHEETAH_COATS: Record<string, Coat> = {
    zuti: cheetah("#E9B159", "#2A2228"),
    svetli: cheetah("#F2D29A", "#4A3A34"),
    plavi: cheetah("#A6C2EA", "#26365A", { iris: ["#BFE8FF", "#3A7AC0"] }),
    kraljevski: cheetah("#E8B66A", "#241C20"),
    zlatni: goldCoat({ marks: ["#B07A1E"], light: "#FFF8E0", nose: "#3A2A24", tailTip: "#FFFFFF" }),
    dugin: cheetah("#FFF6FA", "#C7AEFF", { marks: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"], nose: "#6A4A8A" }),
};

/** Kraljevski gepard (šara se bira po krznu) */
let royal = false;

const paint = paintBigCat((p, head) => {
    if (royal && !head) {
        // Kraljevski: pege se spajaju u isprekidane pruge niz leđa
        const n = fbm3(p.x * 9, p.y * 22, p.z * 9, 3, 61);
        return [Math.max(smoothstep(0.58, 0.62, n), dots(p, 22, 0.22, 17)), 0];
    }
    return [dots(p, head ? 44 : 21, head ? 0.22 : 0.3, 17), 0];
}, (pp) => {
    const t = pp.t ?? 0;
    // Prstenovi na drugoj polovini repa, beo vrh
    const rings = t > 0.55 ? smoothstep(0.55, 0.75, 0.5 + 0.5 * Math.sin(t * 46)) : dots(pp.p, 26, 0.24, 17);
    return rings * (1 - smoothstep(0.9, 0.94, t));
});

/** Tamne „suze” od unutrašnjeg ugla oka do ugla usta */
function addTearLines(b: AnimalBuild) {
    const k = b.k;
    const marks = b.coat.marks ?? ["#2A2228"];
    const list: HeadMark[] = [];
    for (const side of [1, -1] as const) {
        const color = marks.length > 2 ? rainbowAt(marks, side > 0 ? 0.1 : 0.6, new THREE.Color()) : col(marks[0]).clone();
        list.push({ center: b.head.point(0.5 + side * 0.058, 0.585), side, radius: stripeOutline(0.052 * k, 0.0075 * k, -1.3, 0.55), color });
    }
    b.headGroup.add(headMarks(b, list));
}

export const CHEETAH: AnimalSpec = {
    kind: "cheetah",
    skins: MORE_SKINS.cheetah,
    coats: CHEETAH_COATS,
    shape: { kind: asMore("cheetah"), girth: 0.9, belly: 0.94, limb: 0.92, legK: 1.06, armK: 1.04, head: { w: 0.33, h: 0.29, d: 0.3 } },
    ...CAT_HEAD,
    tail: {
        points: [[0, 0, 0], [0.04, -0.07, -0.08], [0.12, -0.12, -0.15], [0.22, -0.08, -0.2], [0.29, 0.04, -0.18], [0.3, 0.16, -0.12]],
        radius: profile([[0, 0.026], [0.5, 0.022], [0.9, 0.02], [1, 0.008]]),
        motion: "sway",
    },
    hands: "paw",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
    extras: addTearLines,
    paint: (pp, ctx, out) => {
        royal = ctx.coat === CHEETAH_COATS.kraljevski;
        paint(pp, ctx, out);
    },
};

registerCompanion(companionFrom(CHEETAH));
