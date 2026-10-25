// Pužić: meko glatko telo svetle boje, okrugla glava sa krupnim očima, rumenim obrazima i
// osmehom, dva duga pipka sa kuglicama (kapa im pravi otvor), i velika sjajna kućica na
// leđima — spirala koja se uvija ka sredini, sa svetlom prugom duž zavojaka i tankim linijama
// rasta (prolazi kroz odeću kao rep, kao krila zmaja). Bez ušiju i bez repa.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { antennaEars, antennaTips, asFriend, bellyMask, boxUv, brimRadiusAt, coat, col, glossyVertexMaterial, isHead, onBone, rainbowAt, RAINBOW, smoothstep } from "./common";
import { FRIEND_SKINS } from "./skins.data";

/** fur = telo; light = stomak; marks = [kućica, pruga na kućici] */
function snail(body: string, light: string, shell: string, stripe: string, extra: Partial<Coat> = {}): Coat {
    return coat(body, light, {
        muzzle: light,
        inner: light,
        nose: shade(body, -0.4),
        brow: shade(body, -0.36),
        iris: ["#7A5A3A", "#24160A"],
        mouth: shade(body, -0.62),
        marks: [shell, stripe],
        horn: shade(body, 0.04),
        ...extra,
    });
}

export const SNAIL_COATS: Record<string, Coat> = {
    smedji: snail("#F2D3A2", "#FFF2DC", "#C77A42", "#F2C27E"),
    zeleni: snail("#B8E6B0", "#EEFBEA", "#4FAE66", "#B6EC8E", { iris: ["#4A7A3A", "#14280C"] }),
    roze: snail("#FFD3E0", "#FFF2F6", "#EE6FA4", "#FFC2DA", { iris: ["#8A4A7A", "#2A1024"] }),
    dugin: snail("#ECE2F8", "#FFFFFF", "#FFFFFF", "#FFFFFF", { mane: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

function paintSnail(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    if (pp.region === "torso") out.lerp(col(c.light), bellyMask(ctx, p, 0.05, shape.neckBaseY + 0.01) * 0.8);
    if (isHead(pp)) {
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.035) ** 2 + ((p.y - e.y + 0.078) / 0.023) ** 2))));
        out.lerp(col("#FF8FA0"), cheek * 0.42);
    }
}

/**
 * Kućica: spiralna cev u ravni simetrije (osa levo-desno), od širokog otvora dole pozadi ka
 * sitnom vrhu u sredini; zavojci se dodiruju. Prednja strana naleže na leđa.
 */
function addShell(b: AnimalBuild) {
    const { shape } = b;
    const k = b.k;
    const hi = b.quality === "high";
    const turns = 2.4;
    const q = 0.45;
    const g = -Math.log(q) / (Math.PI * 2);
    const outer = 0.22 * k;
    const R0 = outer / (1 + (1 - q) / (1 + q));
    const r0 = (R0 * (1 - q)) / (1 + q);
    const wide = 2.1;
    const nTh = hi ? 220 : 120;
    const nPh = hi ? 28 : 16;
    const [shellHex, stripeHex] = b.coat.marks ?? ["#C77A42", "#F2C27E"];
    const rainbow = (b.coat.mane ?? []).length > 2;
    const base = col(shellHex);
    const stripe = col(stripeHex);
    const radial = (th: number, out: THREE.Vector3) => out.set(0, -Math.cos(th), -Math.sin(th));
    // Središte kućice: prednja ivica zavojaka naleže na leđa (malo utisnuta)
    const y = shape.chestY - 0.01;
    let front = -Infinity;
    const d = new THREE.Vector3();
    for (let i = 0; i <= 200; i++) {
        const th = (i / 200) * turns * Math.PI * 2;
        const e = Math.exp(-g * th);
        radial(th, d);
        front = Math.max(front, R0 * e * d.z + r0 * e);
    }
    const center = new THREE.Vector3(0, y + R0 * 0.05, -shape.torsoBack(y) + 0.02 * k - front);
    const pos: number[] = [];
    const colors: number[] = [];
    const idx: number[] = [];
    const c = new THREE.Color();
    for (let i = 0; i <= nTh; i++) {
        const s = i / nTh;
        const th = s * turns * Math.PI * 2;
        const e = Math.exp(-g * th);
        const R = R0 * e;
        // Zavojci se malo preklapaju (bez procepa); vrh se zatvara u tačku
        const r = r0 * e * 1.06 * (1 - smoothstep(0.96, 1, s) * 0.85);
        radial(th, d);
        for (let j = 0; j <= nPh; j++) {
            const ph = (j / nPh) * Math.PI * 2;
            const cp = Math.cos(ph);
            const sp = Math.sin(ph);
            pos.push(center.x + sp * r * wide, center.y + d.y * (R + cp * r), center.z + d.z * (R + cp * r));
            // Boja: pruga sa strane duž zavojka, linije rasta, tamnije u procepu između zavojaka
            if (rainbow) rainbowAt(b.coat.mane!, s * 1.6, c);
            else c.copy(base);
            const band = 1 - smoothstep(0.18, 0.3, Math.abs(Math.abs(sp) - 0.72));
            c.lerp(rainbow ? col("#FFFFFF") : stripe, band * (rainbow ? 0.45 : 0.85));
            const growth = Math.pow(Math.abs(Math.sin(th * 7)), 18);
            c.multiplyScalar(1 - growth * 0.1 - smoothstep(-0.55, -0.95, cp) * 0.22);
            colors.push(c.r, c.g, c.b);
        }
    }
    for (let i = 0; i < nTh; i++) {
        for (let j = 0; j < nPh; j++) {
            const a = i * (nPh + 1) + j;
            const bb = a + nPh + 1;
            idx.push(a, bb, a + 1, a + 1, bb, bb + 1);
        }
    }
    // Otvor (najširi zavojak) zatvoren pločom boje tela
    const capStart = pos.length / 3;
    radial(0, d);
    pos.push(center.x, center.y + d.y * R0, center.z + d.z * R0);
    const lip = col(b.coat.fur);
    colors.push(lip.r, lip.g, lip.b);
    for (let j = 0; j < nPh; j++) idx.push(capStart, j, j + 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    boxUv(geo);
    const mesh = new THREE.Mesh(geo, glossyVertexMaterial(0.32));
    mesh.name = "kucica";
    const pivot = new THREE.Group();
    pivot.add(mesh);
    onBone(b, "spine", pivot);
    b.part("tail", pivot);
}

export const SNAIL: AnimalSpec = {
    kind: "snail",
    skins: FRIEND_SKINS.snail,
    coats: SNAIL_COATS,
    shape: { kind: asFriend("snail"), girth: 1.04, belly: 1.12, pear: 0.3, limb: 0.9, legK: 0.84, head: { w: 0.41, h: 0.37, d: 0.37 } },
    ref: 0.41,
    head: {
        flat: 0.12,
        flatTop: 0.04,
        chin: 0.08,
        eye: { u: 0.09, v: 0.47, r: 0.066, inset: 0.64, yaw: 0.2 },
        noseV: 0.58,
        mouthV: 0.66,
    },
    face: {
        eye: { upper: 0.86, lower: -0.88, lashes: 2, iris: 0.96, pupil: 0.52 },
        brow: { dv: 0.115, len: 0.055, thick: 0.0085 },
        nose: { kind: "none", w: 0.01, h: 0.01, d: 0.01 },
        mouth: { w: 0.054, h: 0.045, curve: "smile", teeth: "none", wrap: 0.1, philtrum: 0, line: 0.0034 },
    },
    ears: antennaEars({ len: 0.17, thick: 0.024, u: 0.58, v: 0.1, back: 0.08, out: 0.32, bend: 0.03 }),
    hands: "paw",
    feet: "paw",
    belly: 0.55,
    cheeks: 0,
    sleek: true,
    extras: (b) => {
        antennaTips(b, { r: 0.03, color: b.coat.horn ?? b.coat.fur });
        addShell(b);
    },
    anchors: (a, b) => {
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintSnail,
};

registerCompanion(companionFrom(SNAIL));
