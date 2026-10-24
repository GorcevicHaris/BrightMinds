// Kokica: okrugla glava sa crvenom krestom od tri kružna režnja (kapa je sakriva kao kosu),
// kratak kukast kljun i crvene resice ispod njega, rumeni obrazi, krila umesto šaka, punačko
// telo, rep od lučno povijenih pera nagore i žute noge sa tri prsta.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { furMaterial } from "../materials";
import type { PaintContext, PaintPoint } from "../paint";
import { addBeak, beakAnchors, birdParts } from "./birds";
import { addFeatherTail, asMore, bellyMask, coat, col, fillColor, goldCoat, isHead, merge, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function hen(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: fur, brow: shade(fur, -0.3), iris: ["#E89A3A", "#7A3A0C"], beak: "#F2A21E", hoof: "#F2A21E", mane: ["#E8403A"], ...extra });
}

export const CHICKEN_COATS: Record<string, Coat> = {
    bela: hen("#FAF8F4", "#FFFFFF", { brow: "#CFC8BE" }),
    smedja: hen("#C27A3E", "#E8B48A", { marks: ["#8A4A20"] }),
    zuta: hen("#FFE070", "#FFF4BE", { mane: ["#FF8A5A"], iris: ["#5A4A3A", "#1E140C"] }),
    plava: hen("#9EBEEA", "#E2EEFF", { mane: ["#F06A8A"] }),
    zlatna: goldCoat({ beak: "#E8902A", hoof: "#E8902A", mane: ["#E8403A"] }),
    duga: hen("#FFF6FA", "#FFFFFF", { marks: RAINBOW, mane: ["#FF6A8A"], iris: ["#7A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintHen(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.4 + p.x * 0.5, tmp), isHead(pp) ? 0.25 : 0.6);
    else if (marks.length && !isHead(pp)) {
        // Smeđa: tamniji vrhovi perja (ljuspice)
        const row = p.y * 60;
        const fy = row - Math.floor(row);
        const fx = p.x * 40 + (Math.floor(row) % 2) * 0.5;
        const arc = Math.abs(fy - 0.5 - (fx - Math.floor(fx) - 0.5) ** 2 * 1.4);
        out.lerp(col(marks[0]), (1 - smoothstep(0.08, 0.16, arc)) * 0.4 * (pp.region === "torso" ? 1 - bellyMask(ctx, p) : 1));
    }
    if (pp.region === "torso") out.lerp(col(c.light), bellyMask(ctx, p, 0.15) * 0.6);
    if (pp.region === "hand" || pp.region === "arm") out.multiplyScalar(0.94);
    if (isHead(pp)) {
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.035) ** 2 + ((p.y - e.y + 0.06) / 0.028) ** 2))));
        out.lerp(col("#FF8A8A"), cheek * 0.35);
    }
}

/** Kresta (tri režnja na temenu) i resice ispod kljuna */
function addComb(b: AnimalBuild) {
    const head = b.head;
    const k = b.k;
    const red = b.coat.mane?.[0] ?? "#E8403A";
    const hi = b.quality === "high";
    const lobes: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
        const v = 0.02 + i * 0.07;
        const base = head.point(0.5, v);
        const nn = head.normal(0.5, v);
        const r = (0.034 - i * 0.004) * k;
        const g = new THREE.SphereGeometry(r, hi ? 20 : 12, hi ? 14 : 8);
        g.scale(0.45, 1.05, 1);
        g.translate(base.x, base.y, base.z);
        g.translate(nn.x * r * 0.75, nn.y * r * 0.75, nn.z * r * 0.75);
        g.deleteAttribute("uv");
        lobes.push(g);
    }
    const comb = fillColor(merge(lobes), red, (p) => 0.85 + 0.15 * smoothstep(0.2, 0.35, p.y));
    const combMesh = new THREE.Mesh(comb, furMaterial({ sheen: red }));
    combMesh.name = "kresta";
    b.headGroup.add(combMesh);
    b.part("hair", combMesh);
    // Resice: dve kapi ispod kljuna
    const v = head.spec.noseV + 0.09;
    const wat: THREE.BufferGeometry[] = [];
    for (const side of [1, -1]) {
        const at = head.point(0.5 + side * 0.012, v);
        const g = new THREE.SphereGeometry(0.016 * k, hi ? 16 : 10, hi ? 12 : 8);
        g.scale(0.6, 1.25, 0.6);
        g.translate(at.x, at.y - 0.012 * k, at.z + 0.006 * k);
        g.deleteAttribute("uv");
        wat.push(g);
    }
    const wattle = new THREE.Mesh(fillColor(merge(wat), red), furMaterial({ sheen: red }));
    wattle.name = "resice";
    b.headGroup.add(wattle);
}

export const CHICKEN: AnimalSpec = {
    kind: "chicken",
    skins: MORE_SKINS.chicken,
    coats: CHICKEN_COATS,
    shape: { kind: asMore("chicken"), girth: 1.1, belly: 1.18, pear: 0.38, limb: 0.94, legK: 0.85, armK: 0.95, head: { w: 0.33, h: 0.33, d: 0.33 } },
    ref: 0.44,
    head: {
        flat: 0.1,
        flatTop: 0.05,
        chin: 0.1,
        blobs: [{ c: [0, -0.04, 0.0], r: [0.22, 0.17, 0.2], k: 0.07 }],
        bumps: [{ dir: [0.38, 0.02, 0.92], sigma: 0.14, amp: -0.005, mirror: true }],
        eye: { u: 0.1, v: 0.43, r: 0.062, inset: 0.68, yaw: 0.22 },
        noseV: 0.57,
        mouthV: 0.65,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 3, iris: 0.92, pupil: 0.5 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "none", w: 0, h: 0, d: 0 },
        mouth: { w: 0.03, h: 0.03, curve: "smile", teeth: "none", wrap: 0.06, philtrum: 0, line: 0.002 },
    },
    ...birdParts("toes"),
    belly: 0.5,
    cheeks: 0,
    extras: (b) => {
        addBeak(b, { len: 0.085, w: 0.042, h: 0.042, hook: 0.25, color: b.coat.beak ?? "#F2B33A", open: 0.5 });
        addComb(b);
        const f = b.coat.fur;
        const tail = b.coat.marks?.length === 1 ? [b.coat.marks[0], f] : [f, shade(f, -0.08)];
        addFeatherTail(b, { side: true, count: 6, len: 0.2, w: 0.07, spread: 1.1, tilt: 2.3, colors: tail, height: 0.05, middle: 0.2 });
    },
    anchors: beakAnchors,
    paint: paintHen,
};

registerCompanion(companionFrom(CHICKEN));
