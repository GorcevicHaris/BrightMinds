// Zebra: konjska glava sa kratkom zaobljenom njuškom (tamna njuška, krupne nozdrve), visoke
// uši sa tamnim vrhom, uspravna prugasta griva-četka od čela niz vrat (čuperak na čelu kapa
// sakriva kao kosu), pruge svuda (prstenovi oko udova, talasaste po trupu i glavi), kopita i rep
// sa tamnom kićankom.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { furMaterial } from "../materials";
import type { PaintContext, PaintPoint } from "../paint";
import { clumpGeometry, EAR_PROFILES, type Clump } from "../parts";
import { asMore, bellyMask, coat, col, fbm3, goldCoat, headMarks, isHead, rainbowAt, RAINBOW, scaleOf, smoothstep, stripeOutline, type HeadMark } from "./common";
import { MORE_SKINS } from "./skins.data";

function zebra(fur: string, stripe: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, shade(fur, 0.2), { muzzle: shade(stripe, 0.12), inner: "#F4D2D8", nose: shade(stripe, -0.3), brow: stripe, iris: ["#9A6A3A", "#3A200C"], marks: [stripe], mane: [stripe, fur], hoof: shade(stripe, -0.1), tailTip: stripe, ...extra });
}

export const ZEBRA_COATS: Record<string, Coat> = {
    prugasta: zebra("#FAFAF6", "#2A2830"),
    smedja: zebra("#FBF4EA", "#6A4A36", { iris: ["#A8763E", "#4A2A0E"] }),
    roze: zebra("#FFEAF2", "#E2679C", { iris: ["#B57AD6", "#4A1E6A"], muzzle: "#F4A6C6", nose: "#B04A7A" }),
    plava: zebra("#EEF5FF", "#3E66B0", { iris: ["#8CC8F0", "#2A6AA8"], muzzle: "#8EA8D6", nose: "#2E4A8E" }),
    zlatna: goldCoat({ marks: ["#B07A1E"], mane: ["#B07A1E", "#F2C443"], hoof: "#8A5A10", tailTip: "#B07A1E", muzzle: "#E8C06A", nose: "#8A5A10" }),
    duga: zebra("#FFFFFF", "#C7AEFF", { marks: RAINBOW, mane: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"], muzzle: "#E6D8FF", nose: "#8A6AC0", hoof: "#8A6AAA" }),
};

const tmp = new THREE.Color();

/** Pruga: 1 u tamnoj traci (meka ivica), `phase` raste preko pruga */
function band(phase: number, width = 0.5, soft = 0.14): number {
    const s = 0.5 + 0.5 * Math.sin(phase);
    return smoothstep(1 - width - soft, 1 - width + soft, s);
}

function paintZebra(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    const stripe = marks.length > 2 ? rainbowAt(marks, p.y * 3 + p.x, tmp) : tmp.copy(col(marks[0] ?? "#2A2830"));
    const n = fbm3(p.x * 10, p.y * 10, p.z * 10, 3, 7);
    switch (pp.region) {
        case "torso": {
            // Talasaste pruge oko trupa, svetliji stomak (pruge tanje napred)
            const a = Math.atan2(p.x, p.z);
            const front = bellyMask(ctx, p, 0.05);
            out.lerp(stripe, band(p.y * 50 + Math.sin(a * 2.2) * 1.0 + n * 2.0, 0.46 - front * 0.2) * (1 - front * 0.35));
            return;
        }
        case "arm":
        case "leg": {
            const t = pp.t ?? 0;
            out.lerp(stripe, band(p.y * 60 + n * 1.5, 0.48) * (1 - smoothstep(0.88, 0.97, t)));
            return;
        }
        case "hand":
        case "foot":
            return;
        case "tail":
            out.lerp(stripe, band((pp.t ?? 0) * 26, 0.5));
            return;
        case "ear":
            if (pp.inner) out.copy(col(c.inner));
            else out.lerp(stripe, Math.max(smoothstep(0.6, 0.8, pp.t ?? 0), band((pp.t ?? 0) * 14 + 1, 0.4) * 0.8));
            return;
        default:
            if (!isHead(pp)) return;
    }
    // Glava: pruge su oštre šare-površine (addHeadStripes); ovde samo tamna njuška
    out.lerp(col(c.muzzle), smoothstep(0.25, 0.75, pp.muzzle ?? 0));
    void shape;
}

/**
 * Pruge na glavi kao oštre šare (tanka površina tik iznad glave, glatka ivica): „V” niz čelo
 * ka njušci, lukovi ispod očiju i uspravne pruge sa strane. Oko očiju nema pruga.
 * [pomak od sredine (u), visina (v), poluduzina, polusirina, nagib]
 */
const HEAD_STRIPES: [number, number, number, number, number][] = [
    [0.065, 0.1, 0.075, 0.019, 0.35],
    [0.075, 0.2, 0.085, 0.021, 0.5],
    [0.05, 0.3, 0.05, 0.016, 0.6],
    [0.14, 0.27, 0.06, 0.016, 0.05],
    [0.185, 0.585, 0.08, 0.019, -0.35],
    [0.225, 0.69, 0.06, 0.017, -0.5],
    [0.25, 0.36, 0.09, 0.021, 1.3],
    [0.31, 0.5, 0.085, 0.021, 1.4],
    [0.2, 0.15, 0.07, 0.018, 0.9],
];

function addHeadStripes(b: AnimalBuild) {
    const k = b.k;
    const marks = b.coat.marks ?? ["#2A2830"];
    const list: HeadMark[] = [];
    for (const side of [1, -1] as const) {
        for (const [i, [du, v, a, w, tilt]] of HEAD_STRIPES.entries()) {
            const color = marks.length > 2 ? rainbowAt(marks, i / HEAD_STRIPES.length + (side > 0 ? 0 : 0.5), new THREE.Color()) : col(marks[0]).clone();
            list.push({ center: b.head.point(0.5 + side * du, v), side, radius: stripeOutline(a * k, w * k, tilt), color });
        }
    }
    b.headGroup.add(headMarks(b, list));
}

/** Uspravna griva-četka: od čela preko temena niz vrat, pruge u pramenovima */
function addMane(b: AnimalBuild) {
    const k = scaleOf(b);
    const colors = b.coat.mane ?? ["#2A2830", "#FAFAF6"];
    const rainbow = colors.length > 2;
    const head = b.head;
    const fore: Clump[] = [];
    const crown: Clump[] = [];
    const steps = b.quality === "high" ? 18 : 11;
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const front = t < 0.28;
        const u = front ? 0.5 : 0.0;
        const v = front ? 0.2 * (1 - t / 0.28) + 0.01 : 0.02 + ((t - 0.28) / 0.72) * 0.52;
        const nn = head.normal(u, v);
        const dir = nn.clone().add(new THREE.Vector3(0, 0.35, front ? 0.25 : -0.2)).normalize();
        const color = rainbow ? colors[i % colors.length] : colors[i % 2];
        const clump: Clump = { base: head.offsetPoint(u, v, -0.01 * k), dir, len: (0.085 + 0.03 * Math.sin(Math.PI * t)) * k, r: 0.034 * k, flat: 0.35, taper: 0.35, color, shade: 0.12 };
        (front ? fore : crown).push(clump);
    }
    const mat = furMaterial({ sheen: b.coat.light, shimmer: b.coat.shimmer });
    const forelock = new THREE.Mesh(clumpGeometry(fore, b.quality), mat);
    forelock.name = "griva-celo";
    b.headGroup.add(forelock);
    b.part("hair", forelock);
    const crest = new THREE.Mesh(clumpGeometry(crown, b.quality), mat);
    crest.name = "griva";
    b.headGroup.add(crest);
    b.part("hair", crest);
    // Niz vrat (kost vrata): kratka uspravna četka do ramena
    const shape = b.shape;
    const neck: Clump[] = [];
    const y0 = shape.shoulderY + 0.005;
    const y1 = shape.headBoneY + 0.03;
    for (let i = 0; i < 4; i++) {
        const y = y0 + ((y1 - y0) * i) / 3;
        const z = -shape.torsoBack(y) + 0.008;
        neck.push({ base: new THREE.Vector3(0, y, z), dir: new THREE.Vector3(0, 0.45, -1).normalize(), len: 0.07 * k, r: 0.028 * k, flat: 0.35, taper: 0.4, color: rainbow ? colors[(i + 3) % colors.length] : colors[(i + 1) % 2], shade: 0.15 });
    }
    const neckMesh = new THREE.Mesh(clumpGeometry(neck, b.quality), mat);
    neckMesh.position.copy(b.boneAt("neck")).negate();
    b.bone("neck")!.add(neckMesh);
}

export const ZEBRA: AnimalSpec = {
    kind: "zebra",
    skins: MORE_SKINS.zebra,
    coats: ZEBRA_COATS,
    shape: { kind: asMore("zebra"), girth: 1.02, belly: 1.05, limb: 1.02, head: { w: 0.33, h: 0.37, d: 0.37 } },
    ref: 0.43,
    head: {
        flat: 0.05,
        flatTop: 0.08,
        chin: 0.04,
        blobs: [
            { c: [0, -0.1, 0.12], r: [0.108, 0.09, 0.19], k: 0.06, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, 0.02, 0.9], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0.16, -0.5, 0.85], sigma: 0.1, amp: 0.008, muzzle: true, mirror: true },
            { dir: [0.75, -0.5, 0.42], sigma: 0.2, amp: 0.008, mirror: true },
        ],
        eye: { u: 0.118, v: 0.42, r: 0.058, inset: 0.68, yaw: 0.36 },
        noseV: 0.62,
        mouthV: 0.72,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 3, iris: 0.98, pupil: 0.5 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "nostrils", w: 0.015, h: 0.01, d: 0.007, v: 0.625 },
        mouth: { w: 0.045, h: 0.06, curve: "smile", teeth: "row", wrap: 0.08, philtrum: 0, line: 0.0028 },
    },
    ears: {
        kind: "tall",
        shape: { len: 0.14, width: 0.08, depth: 0.035, profile: EAR_PROFILES.tall, cup: 0.6, inner: 0.66, bend: 0.012 },
        u: 0.6,
        v: 0.11,
        sink: 0.012,
        tilt: [-0.15, 0.25, 0.42],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0.01, -0.04, -0.06], [0.03, -0.12, -0.09], [0.05, -0.2, -0.09]],
        radius: profile([[0, 0.014], [1, 0.01]]),
        tuft: 0.04,
        motion: "flick",
        height: 0.07,
    },
    hands: "hoof",
    feet: "hoof",
    belly: 0,
    cheeks: 0,
    earMotion: "twitch",
    extras: (b) => {
        addMane(b);
        addHeadStripes(b);
    },
    paint: paintZebra,
};

registerCompanion(companionFrom(ZEBRA));
