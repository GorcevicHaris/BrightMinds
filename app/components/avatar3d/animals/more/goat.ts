// Kozica: uža glava sa izduženom njuškom, rogovi sa prstenovima koji se savijaju unazad (kapa
// ih zaobilazi), uši u stranu, bradica ispod brade, čuperak na čelu, kopita i kratak repić gore.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { furMaterial } from "../materials";
import type { PaintContext, PaintPoint } from "../paint";
import { clumpGeometry, EAR_PROFILES, type Clump } from "../parts";
import { addHorns, asMore, coat, col, fbm3, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function goat(fur: string, light: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, light, { muzzle: shade(light, 0.1), inner: "#F4C2C6", nose: "#C99AA4", brow: shade(fur, -0.25), iris: ["#E8B84A", "#8A5410"], horn: "#BFB2A2", hoof: "#5A4A44", ...extra });
}

export const GOAT_COATS: Record<string, Coat> = {
    bela: goat("#F8F6F2", "#FFFFFF"),
    smedja: goat("#A8744A", "#E8CCAE", { horn: "#8A7A6A", nose: "#5A3A2A", mane: ["#5A3A24"] }),
    sarena: goat("#F8F6F2", "#FFFFFF", { marks: ["#5A4034"], mane: ["#5A4034"] }),
    ljubicasta: goat("#D2BCF2", "#F6EEFF", { horn: "#F6E6C8", iris: ["#FFD0E8", "#B04A8A"] }),
    zlatna: goldCoat({ horn: "#FFF6E0", hoof: "#8A5A10", nose: "#C99AA4" }),
    duga: goat("#FFFFFF", "#FFFFFF", { marks: RAINBOW, horn: "#F6E6C8", iris: ["#C9A6F2", "#6A3FB0"] }),
};

const tmp = new THREE.Color();

function paintGoat(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    if (marks.length > 2) out.lerp(rainbowAt(marks, p.y * 2.2 + p.x * 0.5, tmp), 0.55);
    else if (marks.length && pp.region !== "hand" && pp.region !== "foot") {
        let k = smoothstep(0.52, 0.56, fbm3(p.x * 6, p.y * 6 + 4, p.z * 6, 3, 31));
        if (isHead(pp)) {
            const q = headLocal(ctx, p);
            // Glava: tamni obrazi i uši, svetla pruga niz sredinu lica
            k = smoothstep(0.25, 0.6, Math.abs(q.x)) * (1 - smoothstep(0.2, 0.5, pp.muzzle ?? 0));
        }
        if (pp.region === "leg" || pp.region === "arm") k = Math.max(k, smoothstep(0.6, 0.8, pp.t ?? 0));
        out.lerp(col(marks[0]), k);
    }
    if (pp.region === "ear" && pp.inner) out.lerp(col(c.inner), 0.8);
}

/** Bradica ispod brade i čuperak na čelu (čuperak je „kosa” — kapa ga sakriva) */
function addBeard(b: AnimalBuild) {
    const head = b.head;
    const k = b.k;
    const color = b.coat.mane?.[0] ?? shade(b.coat.fur, -0.05);
    const beard: Clump[] = [];
    for (let i = 0; i < 5; i++) {
        const u = 0.5 + (i - 2) * 0.014;
        const v = 0.86 + Math.abs(i - 2) * 0.01;
        beard.push({ base: head.offsetPoint(u, v, -0.006 * k), dir: new THREE.Vector3((i - 2) * 0.08, -1, 0.25).normalize(), len: (0.075 - Math.abs(i - 2) * 0.012) * k, r: 0.014 * k, curl: new THREE.Vector3(0, 0, 1), color, flat: 0.6, taper: 0.7 });
    }
    const beardMesh = new THREE.Mesh(clumpGeometry(beard, b.quality), furMaterial({ sheen: b.coat.light }));
    beardMesh.name = "bradica";
    b.headGroup.add(beardMesh);
    const fore: Clump[] = [];
    for (let i = 0; i < 5; i++) {
        const u = 0.5 + (i - 2) * 0.02;
        const v = 0.18 + (i % 2) * 0.02;
        const nn = head.normal(u, v);
        fore.push({ base: head.offsetPoint(u, v, -0.004 * k), dir: nn.clone().add(new THREE.Vector3((i - 2) * 0.15, 0.2, 0.3)).normalize(), len: 0.04 * k, r: 0.016 * k, curl: new THREE.Vector3(0, -1, 0.2), color, flat: 0.6 });
    }
    const foreMesh = new THREE.Mesh(clumpGeometry(fore, b.quality), furMaterial({ sheen: b.coat.light }));
    foreMesh.name = "cuperak";
    b.headGroup.add(foreMesh);
    b.part("hair", foreMesh);
}

export const GOAT: AnimalSpec = {
    kind: "goat",
    skins: MORE_SKINS.goat,
    coats: GOAT_COATS,
    shape: { kind: asMore("goat"), girth: 0.98, belly: 1.05, limb: 0.98, legK: 1.03, head: { w: 0.31, h: 0.34, d: 0.34 } },
    ref: 0.42,
    head: {
        flat: 0.05,
        flatTop: 0.1,
        chin: 0.12,
        blobs: [
            { c: [0, -0.1, 0.11], r: [0.095, 0.085, 0.19], k: 0.06, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, 0.02, 0.9], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0.75, -0.5, 0.42], sigma: 0.2, amp: 0.007, mirror: true },
        ],
        eye: { u: 0.112, v: 0.43, r: 0.058, inset: 0.68, yaw: 0.3 },
        noseV: 0.62,
        mouthV: 0.72,
    },
    face: {
        eye: { upper: 0.82, lower: -0.86, lashes: 3, iris: 0.94, pupil: 0.46, almond: 1.2 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "nostrils", w: 0.012, h: 0.008, d: 0.006, v: 0.625 },
        mouth: { w: 0.034, h: 0.05, curve: "w", teeth: "none", wrap: 0.07, philtrum: 0.012, line: 0.0026 },
    },
    ears: {
        kind: "floppy",
        shape: { len: 0.12, width: 0.06, depth: 0.026, profile: EAR_PROFILES.tall, cup: 0.55, inner: 0.65, bend: -0.008 },
        u: 0.71,
        v: 0.27,
        sink: 0.008,
        tilt: [-0.1, 0.55, 1.45],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0, 0.03, -0.035], [0, 0.07, -0.045]],
        radius: profile([[0, 0.02], [0.6, 0.02], [1, 0.006]]),
        motion: "wag",
        height: 0.07,
    },
    hands: "hoof",
    feet: "hoof",
    belly: 0.25,
    cheeks: 0,
    earMotion: "swing",
    extras: (b) => {
        addHorns(b, { u: 0.565, v: 0.13, points: [[0, 0, 0], [0.008, 0.065, -0.02], [0.02, 0.1, -0.075], [0.034, 0.095, -0.13], [0.04, 0.06, -0.16]], r0: 0.026, r1: 0.008, color: b.coat.horn ?? "#BFB2A2", rings: 1 });
        addBeard(b);
    },
    paint: paintGoat,
};

registerCompanion(companionFrom(GOAT));
