// Kornjača: okrugla glava sa kratkom zaobljenom njuškom i širokim osmehom, bez ušiju, oklop na
// leđima (pločice sa tamnim šavovima i svetlijim središtem, ispupčen do 8 mm — ostaje ispod
// odeće kao vuna ovčice) i svetao trbušni oklop sa poprečnim šavovima, zdepaste šape sa
// noktićima i kratak šiljat repić.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { torsoPoint, torsoSurface } from "../../engine/body";
import { torsoWeights } from "../../engine/rig";
import { buildSurface, profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { paintGeometry } from "../paint";
import { furUv } from "../parts";
import { fingerHand, toeFoot } from "../extra/hands";
import { asMore, brimRadiusAt, cells3, coat, col, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep, torsoAngle } from "./common";
import { MORE_SKINS } from "./skins.data";

/** fur = koža (glava, udovi); marks = [oklop, šavovi oklopa, trbušni oklop] */
function turtle(skin: string, shell: string, plastron: string, extra: Partial<Coat> = {}): Coat {
    return coat(skin, shade(skin, 0.35), { muzzle: shade(skin, 0.2), nose: shade(skin, -0.5), brow: shade(skin, -0.3), iris: ["#8A6A3A", "#2A1A0C"], mouth: shade(skin, -0.6), marks: [shell, shade(shell, -0.45), plastron], hoof: "#F6EEDC", ...extra });
}

export const TURTLE_COATS: Record<string, Coat> = {
    zelena: turtle("#8CCB6A", "#4E8A3A", "#F2E2A0"),
    smedja: turtle("#A8B86A", "#9A6A3E", "#F2DCA8"),
    morska: turtle("#7AC2B4", "#3E8A8A", "#F2EAC8", { iris: ["#4A6A8A", "#0E1E2E"] }),
    ljubicasta: turtle("#B8A2E8", "#7A5AC0", "#F6E8FF", { iris: ["#4A2A6A", "#140A24"] }),
    zlatna: goldCoat({ marks: ["#D9A21E", "#8A5A10", "#FFF6D0"], mouth: "#6A4A10", hoof: "#FFF6D8" }),
    duga: turtle("#C8F0D0", "#C7AEFF", "#FFFFFF", { iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();
const RB = RAINBOW;

/** Oklop: 0–1 koliko je tačka trupa na leđnom oklopu (ivica oklopa ide bokom) */
function shellMask(ctx: PaintContext, p: THREE.Vector3): number {
    const s = ctx.shape;
    const a = Math.abs(torsoAngle(p));
    const v = smoothstep(s.crotchY - 0.01, s.crotchY + 0.03, p.y) * (1 - smoothstep(s.shoulderY + 0.005, s.shoulderY + 0.03, p.y));
    return smoothstep(1.35, 1.6, a) * v;
}

/** Šavovi pločica oklopa (ćelije) i trbušnog oklopa (poprečne trake) */
function seams(p: THREE.Vector3, ctx: PaintContext): { shell: number; plastron: number; id: number; center: number } {
    const [d1, d2, id] = cells3(p.x * 13, p.y * 10, p.z * 13, 3, 0.55);
    const shell = 1 - smoothstep(0.04, 0.1, d2 - d1);
    const center = 1 - smoothstep(0.1, 0.45, d1);
    const s = ctx.shape;
    const t = (p.y - s.crotchY) / Math.max(0.01, s.shoulderY - s.crotchY);
    const band = Math.abs(Math.sin(t * Math.PI * 4));
    const mid = Math.exp(-((p.x / 0.004) ** 2));
    return { shell, plastron: Math.max(1 - smoothstep(0.06, 0.16, band), mid), id, center };
}

function paintTurtle(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [c.fur, c.fur, c.light];
    const rainbow = c.fur === "#C8F0D0";
    if (pp.region === "torso") {
        const m = shellMask(ctx, p);
        const sm = seams(p, ctx);
        const shell = rainbow ? rainbowAt(RB, sm.id, tmp) : tmp.copy(col(marks[0]));
        // Trbušni oklop spreda, leđni pozadi
        const front = (1 - m) * smoothstep(shape.crotchY, shape.crotchY + 0.03, p.y) * (1 - smoothstep(shape.shoulderY, shape.shoulderY + 0.03, p.y));
        out.lerp(col(marks[2]), front);
        out.multiplyScalar(1 - front * sm.plastron * 0.18);
        out.lerp(shell, m);
        // Pločica: svetlije središte, tamniji rub i šav
        out.lerp(col(marks[2]), m * sm.center * 0.22);
        out.multiplyScalar(1 - m * (1 - sm.center) * 0.12);
        out.lerp(col(marks[1]), m * sm.shell * 0.9);
        return;
    }
    if (pp.region === "tail") return;
    if (!isHead(pp)) {
        if (rainbow) out.lerp(rainbowAt(RB, p.y * 2, tmp), 0.35);
        return;
    }
    const q = headLocal(ctx, p);
    out.lerp(col(c.light), (1 - smoothstep(-0.5, -0.25, q.y)) * smoothstep(-0.3, 0.2, q.z));
    const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.04) ** 2 + ((p.y - e.y + 0.07) / 0.03) ** 2))));
    out.lerp(col("#FF9C9C"), cheek * 0.3);
}

/** Leđni oklop: tanka ljuska iznad trupa (ispupčena pozadi, rub na bokovima), na kostima trupa */
function addShell(b: AnimalBuild) {
    const { shape } = b;
    const hi = b.quality === "high";
    const q = new THREE.Vector3();
    const y0 = shape.crotchY - 0.006;
    const y1 = shape.shoulderY + 0.035;
    // Ispupčenje: najviše na sredini leđa, rub malo izdignut na granici oklopa (bok)
    const bulge = (a: number, y: number) => {
        const back = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
        const along = Math.sin(Math.PI * Math.min(1, Math.max(0, (y - y0) / (y1 - y0))));
        const dome = smoothstep(1.5, Math.PI, back) * along;
        const rim = Math.exp(-(((back - 1.5) / 0.08) ** 2)) * along;
        return 0.0055 * dome + 0.0025 * rim;
    };
    // Ljuska se crta samo pozadi (ugao od π/2 do 3π/2 oko trupa)
    const a0 = Math.PI * 0.5 - 0.06;
    const a1 = Math.PI * 1.5 + 0.06;
    const base = torsoSurface(shape, y0, y1, 0.0015, bulge);
    const fn = (u: number, v: number, out: THREE.Vector3) => base((a0 + (a1 - a0) * u) / (Math.PI * 2), v, out);
    const g = buildSurface(fn, {
        nu: hi ? 44 : 26,
        nv: hi ? 36 : 20,
        closedU: false,
        inside: (_u, v, out) => out.set(0, y0 + (y1 - y0) * v, 0),
        weights: (_u, _v, p) => torsoWeights(shape, p),
        uv: furUv(Math.PI * shape.torsoW(shape.waistY), y1 - y0),
    });
    // Boje: prema tački trupa ispod (šare oklopa iste kao na trupu)
    paintGeometry(g, b.paint, (_i, p) => {
        torsoPoint(shape, Math.atan2(p.x, p.z), p.y, 0, q);
        return { p: q.clone(), region: "torso" };
    });
    const mesh = new THREE.SkinnedMesh(g, b.fur);
    mesh.name = "oklop";
    mesh.frustumCulled = false;
    (b.rig.root.parent ?? b.headGroup).add(mesh);
    mesh.bind(b.rig.skeleton, new THREE.Matrix4());
}

export const TURTLE: AnimalSpec = {
    kind: "turtle",
    skins: MORE_SKINS.turtle,
    coats: TURTLE_COATS,
    shape: { kind: asMore("turtle"), girth: 1.12, belly: 1.15, pear: 0.15, limb: 1.1, legK: 0.84, armK: 0.9, head: { w: 0.35, h: 0.34, d: 0.34 } },
    ref: 0.45,
    head: {
        flat: 0.08,
        flatTop: 0.12,
        chin: 0.06,
        blobs: [
            { c: [0, -0.04, 0.02], r: [0.22, 0.16, 0.19], k: 0.07 },
            { c: [0, -0.06, 0.1], r: [0.11, 0.08, 0.14], k: 0.05, muzzle: true },
        ],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.1, v: 0.43, r: 0.06, inset: 0.68, yaw: 0.22 },
        noseV: 0.57,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 2, iris: 0.94, pupil: 0.48 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "nostrils", w: 0.006, h: 0.004, d: 0.004, v: 0.56 },
        mouth: { w: 0.07, h: 0.05, curve: "smile", teeth: "none", wrap: 0.1, philtrum: 0, line: 0.003 },
    },
    tail: {
        points: [[0, 0, 0], [0, -0.02, -0.04], [0, -0.04, -0.07]],
        radius: profile([[0, 0.022], [1, 0.004]]),
        motion: "wag",
        height: 0.04,
        sleek: true,
    },
    hands: "paw",
    feet: "paw",
    belly: 0,
    cheeks: 0,
    sleek: true,
    customHand: (b, side) => fingerHand(b, side, { fingers: 3, len: 0.4, thick: 0.3, claws: b.coat.hoof ?? "#F6EEDC" }),
    customFoot: (b, side) => toeFoot(b, side, { toes: 3, claws: b.coat.hoof ?? "#F6EEDC", thick: 0.2 }),
    extras: addShell,
    anchors: (a, b) => {
        a.ears.kind = "none";
        a.head.brimY = Math.max(a.head.brimY, a.eyes.left.y + a.eyes.radius * 1.3);
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintTurtle,
};

registerCompanion(companionFrom(TURTLE));
