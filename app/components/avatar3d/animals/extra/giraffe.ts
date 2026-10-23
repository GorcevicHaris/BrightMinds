// Žirafa: dug vrat, manja glava sa izduženom svetlom njuškom, dva roščića (osikoni) sa
// tamnim čupercima na vrhu, uši kao listovi sa strane, duge trepavice, mrlje kao mozaik
// (ćelije sa svetlim linijama između), kratka griva niz vrat, kopita i rep sa čupercem.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { paintGeometry, type PaintContext, type PaintPoint } from "../paint";
import { clumpGeometry, EAR_PROFILES, weightedTube, type Clump } from "../parts";
import { asKind, col, goldCoat, headLocal, isHead, rainbowAt, smoothstep } from "./common";
import { cells3 } from "./kit/util";
import { EXTRA_SKINS } from "./skins.data";

function giraffe(fur: string, patch: string, extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: shade(fur, 0.35),
        muzzle: shade(fur, 0.3),
        inner: "#F6D6C6",
        nose: shade(patch, -0.3),
        brow: shade(patch, -0.1),
        iris: ["#8A5A2A", "#2A180C"],
        pattern: "none",
        marks: [patch],
        mane: [shade(patch, -0.15), patch],
        hoof: "#5A3E2E",
        tailTip: shade(patch, -0.35),
        ...extra,
    };
}

export const GIRAFFE_COATS: Record<string, Coat> = {
    pegava: giraffe("#F6D9A0", "#C77C3A"),
    svetla: giraffe("#FBEACB", "#E0A86A", { hoof: "#7A5A44" }),
    mrezasta: giraffe("#FFF2DC", "#9A4E24", { hoof: "#4A2E22" }),
    roze: giraffe("#FFE6EE", "#F08DB4", { hoof: "#C2537E", iris: ["#B57A9A", "#5A1E3E"] }),
    plava: giraffe("#E6F1FF", "#5E8FD6", { hoof: "#2E4A7E", iris: ["#7A9AC8", "#1E345E"] }),
    zlatna: goldCoat({ pattern: "none", marks: ["#D9A21E"], light: "#FFF6D8", muzzle: "#FFF4D0", hoof: "#B07A1E", mane: ["#C08A1E", "#E0A82A"], tailTip: "#B07A1E" }),
    duga: giraffe("#FFFFFF", "#C7AEFF", { marks: ["#FF9DB8", "#FFC08A", "#FFE68A", "#A8E6B0", "#9CCCFF", "#C7AEFF"], mane: ["#FF9DB8", "#9CCCFF"], iris: ["#C9A6F2", "#6A3FB0"], hoof: "#8A6AAA", tailTip: "#B79CFF" }),
};

const tmp = new THREE.Color();

function paintGiraffe(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat } = ctx;
    const p = pp.p;
    const marks = coat.marks ?? [];
    const patch = marks.length > 2 ? rainbowAt(marks, p.y * 2.4, tmp) : tmp.copy(col(marks[0] ?? coat.fur));
    let k = 1;
    if (pp.region === "ear") k = pp.inner ? 0 : 0.4;
    if (pp.region === "hand" || pp.region === "foot") k = 0;
    if (pp.region === "leg" || pp.region === "arm") k = 1 - smoothstep(0.55, 0.85, pp.t ?? 0);
    if (pp.region === "tail") k = 0.6;
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        // Lice svetlije, mrlje sitnije i samo na temenu i obrazima
        k = (1 - smoothstep(0.1, 0.5, pp.muzzle ?? 0)) * smoothstep(-0.3, 0.1, q.y + (1 - Math.abs(q.z)) * 0.2) * 0.85;
        out.lerp(col(coat.light), smoothstep(0.1, 0.6, pp.muzzle ?? 0));
    }
    if (pp.region === "torso") {
        // Svetliji stomak
        const front = smoothstep(0.4, 0.9, p.z / Math.max(0.01, ctx.shape.torsoFront(p.y)));
        out.lerp(col(coat.light), front * 0.55);
        k *= 1 - front * 0.6;
    }
    if (k <= 0) return;
    const scale = isHead(pp) ? 30 : 17;
    const [d1, d2] = cells3(p.x * scale, p.y * scale, p.z * scale, 23, 0.8);
    // Mrlja = unutrašnjost ćelije; svetla linija između ćelija (mreža)
    const inside = smoothstep(0.07, 0.12, d2 - d1);
    out.lerp(patch, inside * k);
}

/** Osikoni: krzneni roščići sa tamnim zaobljenim vrhom (kapa ih zaobilazi kao rog) */
function addOssicones(b: AnimalBuild) {
    const head = b.head;
    const headBone = b.boneAt("head");
    const hi = b.quality === "high";
    let tipMid = new THREE.Vector3();
    let baseMid = new THREE.Vector3();
    for (const side of [1, -1]) {
        const u = 0.5 + side * 0.055;
        const base = head.point(u, 0.11).addScaledVector(head.normal(u, 0.11), -0.01);
        const dir = head.normal(u, 0.11).add(new THREE.Vector3(side * 0.15, 0.6, -0.25)).normalize();
        const tip = base.clone().addScaledVector(dir, 0.085);
        const path = (s: number, out: THREE.Vector3) => out.copy(base).lerp(tip, s);
        const g = weightedTube(path, profile([[0, 0.019], [0.5, 0.014], [1, 0.013]]), hi ? 12 : 8, hi ? 14 : 8);
        paintGeometry(g, b.paint, (_i, p) => ({ p: p.clone().add(headBone), region: "head", muzzle: 0 }));
        const stem = new THREE.Mesh(g, b.fur);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, hi ? 18 : 10, hi ? 12 : 7), b.fur);
        knob.position.copy(tip);
        const kc = new Float32Array(knob.geometry.getAttribute("position").count * 3);
        const c = col(b.coat.tailTip ?? "#5A3E2E");
        for (let i = 0; i < kc.length; i += 3) kc.set([c.r, c.g, c.b], i);
        knob.geometry.setAttribute("color", new THREE.BufferAttribute(kc, 3));
        b.headGroup.add(stem, knob);
        b.part("horn", stem);
        b.part("horn", knob);
        tipMid = tipMid.add(tip.clone().multiplyScalar(0.5));
        baseMid = baseMid.add(base.clone().multiplyScalar(0.5));
    }
    b.setHorn({ base: baseMid.add(headBone), tip: tipMid.add(headBone), radius: 0.075 });
}

/** Kratka griva niz zadnju stranu vrata */
function addMane(b: AnimalBuild) {
    const shape = b.shape;
    const colors = b.coat.mane ?? ["#9A4E24"];
    const clumps: Clump[] = [];
    const y0 = shape.shoulderY + 0.02;
    const y1 = shape.headBoneY + 0.06;
    const n = b.quality === "high" ? 11 : 7;
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = y0 + (y1 - y0) * t;
        const back = -shape.torsoBack(Math.min(y, shape.neckBaseY)) + 0.006;
        clumps.push({
            base: new THREE.Vector3(0, y, back),
            dir: new THREE.Vector3(0, 0.55, -1).normalize(),
            len: 0.032,
            r: 0.012,
            color: colors[i % colors.length],
            flat: 0.45,
        });
    }
    const g = clumpGeometry(clumps, b.quality);
    const neck = b.bone("neck")!;
    const mesh = new THREE.Mesh(g, b.fur);
    mesh.position.copy(b.boneAt("neck")).negate();
    neck.add(mesh);
}

export const GIRAFFE: AnimalSpec = {
    kind: "giraffe",
    skins: EXTRA_SKINS.giraffe,
    coats: GIRAFFE_COATS,
    shape: { kind: asKind("giraffe"), girth: 0.94, belly: 1.0, limb: 0.92, leg: 0.25, neck: 0.17, neckR: 0.046, head: { w: 0.38, h: 0.36, d: 0.4 } },
    head: {
        flat: 0.05,
        flatTop: 0.1,
        chin: 0.05,
        blobs: [
            // Izdužena, zaobljena njuška
            { c: [0, -0.075, 0.12], r: [0.1, 0.085, 0.14], k: 0.05, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, 0.05, 0.9], sigma: 0.12, amp: -0.005, mirror: true },
            { dir: [0, 0.3, 0.95], sigma: 0.14, amp: 0.006 },
        ],
        eye: { u: 0.1, v: 0.43, r: 0.046, inset: 0.45, yaw: 0.24 },
        noseV: 0.6,
        mouthV: 0.7,
    },
    face: {
        eye: { upper: 0.55, lower: -0.82, lashes: 3, iris: 0.86, pupil: 0.46 },
        brow: { dv: 0.1, len: 0.05, thick: 0.007 },
        nose: { kind: "nostrils", w: 0.008, h: 0.005, d: 0.005, v: 0.6 },
        mouth: { w: 0.04, h: 0.04, curve: "smile", teeth: "none", wrap: 0.07, philtrum: 0, line: 0.0026 },
    },
    ears: {
        kind: "tall",
        shape: { len: 0.1, width: 0.05, depth: 0.025, profile: EAR_PROFILES.tall, cup: 0.6, inner: 0.6, bend: 0.01 },
        u: 0.69,
        v: 0.25,
        sink: 0.01,
        tilt: [0.1, 0.5, 1.35],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0.01, -0.05, -0.04], [0.02, -0.15, -0.05]],
        radius: profile([[0, 0.011], [1, 0.008]]),
        tuft: 0.028,
        motion: "flick",
        height: 0.08,
    },
    hands: "hoof",
    feet: "hoof",
    belly: 0,
    cheeks: 0,
    earMotion: "twitch",
    extras: (b) => {
        addOssicones(b);
        addMane(b);
    },
    anchors: (a, b) => {
        // Dug vrat: prsten za šal/ogrlicu ide celom dužinom vrata (predmet bira visinu)
        const s = b.shape;
        a.neck.y0 = s.shoulderY - 0.005;
        a.neck.y1 = s.neckBaseY + 0.02;
        a.neck.center.set(0, (a.neck.y0 + a.neck.y1) / 2, 0);
        a.neck.radius = s.neckR + 0.006;
    },
    paint: paintGiraffe,
};

registerCompanion(companionFrom(GIRAFFE));
