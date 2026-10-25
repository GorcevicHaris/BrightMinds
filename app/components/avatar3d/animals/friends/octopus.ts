// Hobotnica: velika okrugla glava-kupola (oči niže na licu, kao kod prave hobotnice), rumeni
// obrazi i mali osmeh, svetlije pege po kupoli, i četiri meka pipka iz struka koji leže na
// tlu oko nogu i na kraju se uvijaju nagore — sa svetlom donjom stranom i okruglim
// pijavkama (prolaze kroz odeću kao rep i polako se talasaju). Ruke i noge su takođe meke,
// sa pijavkama na unutrašnjoj strani. Bez ušiju i bez repa.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import type { PaintContext, PaintPoint } from "../paint";
import { weightedTube } from "../parts";
import { FUR_TILE } from "../materials";
import { polyPath } from "../../engine/surface";
import { asFriend, bellyMask, brimRadiusAt, cells3, coat, col, headLocal, isHead, onBone, rainbowAt, RAINBOW, smoothstep } from "./common";
import { FRIEND_SKINS } from "./skins.data";

/** fur = koža; light = donja strana pipaka i stomak; marks = [pege, pijavke] */
function octopus(skin: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(skin, light, {
        muzzle: skin,
        inner: light,
        nose: shade(skin, -0.4),
        brow: shade(skin, -0.34),
        iris: ["#5A3A7A", "#1A0E28"],
        mouth: shade(skin, -0.6),
        marks: [shade(skin, 0.16), shade(light, 0.04)],
        paws: skin,
        ...extra,
    });
}

export const OCTOPUS_COATS: Record<string, Coat> = {
    ljubicasta: octopus("#B48BE6", "#F2E8FF"),
    narandzasta: octopus("#F59A5E", "#FFE8D6", { iris: ["#6A3A2A", "#200E0A"] }),
    plava: octopus("#6DB6EE", "#E4F4FF", { iris: ["#2A4A8A", "#0A1428"] }),
    duga: octopus("#F6EEFA", "#FFFFFF", { mane: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

function paintOctopus(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    const [spotHex] = c.marks ?? [c.light];
    if ((c.mane ?? []).length > 2) out.lerp(rainbowAt(c.mane!, p.y * 1.8 + p.x * 0.4, tmp), 0.55);
    if (pp.region === "torso") out.lerp(col(c.light), bellyMask(ctx, p, 0, shape.neckBaseY) * 0.7);
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        // Svetlije pege po kupoli (ne po licu)
        const [d1, , id] = cells3(p.x * 20, p.y * 20, p.z * 20, 41, 0.8);
        const spot = (1 - smoothstep(0.17, 0.22, d1)) * (id > 0.3 ? 1 : 0) * smoothstep(0.2, 0.5, q.y);
        out.lerp(col(spotHex), spot * 0.8);
        const cheek = Math.max(...ctx.eyes.map((e) => Math.exp(-(((p.x - e.x * 1.3) / 0.036) ** 2 + ((p.y - e.y + 0.07) / 0.024) ** 2))));
        out.lerp(col("#FF8CA6"), cheek * 0.42);
        return;
    }
}

/** Pipci iz struka: leže na tlu oko nogu, vrh se uvija nagore */
function addTentacles(b: AnimalBuild) {
    const { shape } = b;
    const k = b.k;
    const hi = b.quality === "high";
    const c = b.coat;
    const [, suckerHex] = c.marks ?? [c.light, c.light];
    const rainbow = (c.mane ?? []).length > 2;
    const y0 = shape.crotchY + 0.03;
    // Ugao oko tela (0 = napred): bokovi i pozadi, levo i desno ogledalno
    const angles = [1.75, 2.55, -1.75, -2.55];
    for (const [i, ang] of angles.entries()) {
        const dir = new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang));
        const side = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
        const curl = i % 2 === 0 ? 1 : -1;
        const at = (r: number, y: number, s = 0) => new THREE.Vector3(0, y, 0).addScaledVector(dir, r).addScaledVector(side, s);
        const torsoR = Math.min(shape.torsoW(y0), shape.torsoBack(y0)) * 0.55;
        const pts = [
            at(torsoR, y0),
            at(0.12, y0 - 0.1),
            at(0.18, 0.14, 0.01 * curl),
            at(0.24, 0.045, 0.03 * curl),
            at(0.32, 0.035, 0.05 * curl),
            at(0.37, 0.07, 0.06 * curl),
            at(0.375, 0.115, 0.04 * curl),
            at(0.35, 0.12, 0.02 * curl),
        ].map((p) => p.multiplyScalar(1).setY(p.y));
        const path = polyPath(pts);
        const radius = (s: number) => (0.042 * Math.pow(1 - s, 0.85) + 0.008) * k;
        const g = weightedTube(path, radius, hi ? 72 : 36, hi ? 18 : 10);
        // Boja: koža odozgo, svetla donja strana sa okruglim pijavkama
        const pos = g.getAttribute("position");
        const uv = g.getAttribute("uv");
        let length = 0;
        const a = new THREE.Vector3();
        const bb = new THREE.Vector3();
        for (let s = 0; s < 24; s++) length += path(s / 24, a).distanceTo(path((s + 1) / 24, bb));
        const colors = new Float32Array(pos.count * 3);
        const p = new THREE.Vector3();
        const mid = new THREE.Vector3();
        const cc = new THREE.Color();
        for (let v = 0; v < pos.count; v++) {
            p.fromBufferAttribute(pos, v);
            const s = Math.min(1, Math.max(0, (uv.getY(v) * FUR_TILE) / length));
            path(s, mid);
            const n = p.clone().sub(mid).normalize();
            const under = smoothstep(0.05, 0.6, -n.y) * smoothstep(0.12, 0.25, s);
            if (rainbow) rainbowAt(c.mane!, p.y * 1.8 + p.x * 0.4 + 0.2, cc).lerp(col("#FFFFFF"), 0.4);
            else cc.copy(col(c.fur));
            cc.lerp(col(c.light), under * 0.85);
            const row = Math.abs(((s * 22) % 1) - 0.5);
            const across = Math.abs(n.dot(side));
            const sucker = (1 - smoothstep(0.16, 0.24, Math.hypot(row, across * 0.6))) * under;
            cc.lerp(col(suckerHex), sucker).multiplyScalar(1 - sucker * 0.12);
            colors.set([cc.r, cc.g, cc.b], v * 3);
        }
        g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        const mesh = new THREE.Mesh(g, b.fur);
        mesh.name = "pipak";
        // Talasanje: ceo pipak se blago okreće oko korena (sporo, različito za svaki)
        const pivot = new THREE.Group();
        pivot.position.copy(pts[0]);
        mesh.position.copy(pts[0]).negate();
        pivot.add(mesh);
        onBone(b, "hips", pivot);
        b.part("tail", pivot);
        b.onAnimate((time, _dt, live) => {
            pivot.rotation.y = live ? Math.sin(time * 0.9 + i * 1.7) * 0.06 : 0;
        });
    }
}

export const OCTOPUS: AnimalSpec = {
    kind: "octopus",
    skins: FRIEND_SKINS.octopus,
    coats: OCTOPUS_COATS,
    shape: { kind: asFriend("octopus"), girth: 1.0, belly: 1.08, pear: 0.26, limb: 0.92, legK: 0.84, head: { w: 0.44, h: 0.44, d: 0.41 } },
    ref: 0.44,
    head: {
        flat: 0.08,
        flatTop: 0,
        chin: 0.12,
        blobs: [
            // Kupola: viša i malo nagnuta unazad
            { c: [0, 0.06, -0.035], r: [0.215, 0.225, 0.215], k: 0.07 },
        ],
        eye: { u: 0.094, v: 0.55, r: 0.07, inset: 0.62, yaw: 0.2 },
        noseV: 0.64,
        mouthV: 0.71,
    },
    face: {
        eye: { upper: 0.86, lower: -0.88, lashes: 2, iris: 0.96, pupil: 0.52 },
        brow: { dv: 0.11, len: 0.055, thick: 0.0085 },
        nose: { kind: "none", w: 0.01, h: 0.01, d: 0.01 },
        mouth: { w: 0.048, h: 0.045, curve: "smile", teeth: "none", wrap: 0.1, philtrum: 0, line: 0.0034 },
    },
    hands: "paw",
    feet: "paw",
    belly: 0.5,
    cheeks: 0,
    sleek: true,
    extras: (b) => addTentacles(b),
    anchors: (a, b) => {
        a.ears.kind = "none";
        a.head.brimR = brimRadiusAt(b, a.head.brimY);
    },
    paint: paintOctopus,
};

registerCompanion(companionFrom(OCTOPUS));
