// Alpaka: dug vrat (kragna i ogrlica ostaju na ramenima), mala glava sa kratkom njuškom i
// rascepljenom usnom, visoke uši u obliku banane (kapa ih propušta), velika vunena kapa-pompon na
// temenu (kapa je sakriva kao kosu), kovrdžavo runo (šara), kopita i pufnast repić.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { furMaterial } from "../materials";
import type { PaintContext, PaintPoint } from "../paint";
import { clumpGeometry, EAR_PROFILES, type Clump } from "../parts";
import { asMore, coat, col, fbm3, goldCoat, headLocal, isHead, rainbowAt, RAINBOW, smoothstep } from "./common";
import { MORE_SKINS } from "./skins.data";

function alpaca(fur: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, shade(fur, 0.2), { muzzle: shade(fur, 0.12), inner: "#F4C2C6", nose: "#4A3A3A", brow: shade(fur, -0.25), iris: ["#5A3A2A", "#140A04"], hoof: "#5A4A44", ...extra });
}

export const ALPACA_COATS: Record<string, Coat> = {
    bela: alpaca("#FBF8F2", { brow: "#D2C8BA" }),
    bez: alpaca("#E8D2B0"),
    braon: alpaca("#A87A54", { muzzle: "#C9A07C" }),
    roze: alpaca("#FAD0E0", { iris: ["#7A4A8A", "#2A1030"] }),
    plava: alpaca("#C6DCF6", { iris: ["#3A5A8A", "#0E1A2E"] }),
    zlatna: goldCoat({ nose: "#6A4A1E", hoof: "#8A5A10" }),
    duga: alpaca("#FFF8FC", { marks: RAINBOW, iris: ["#6A4A9A", "#24143A"] }),
};

const tmp = new THREE.Color();

/** Vunasta neravnina boje (runo): svetlije kovrdže */
function fleece(p: THREE.Vector3): number {
    return fbm3(p.x * 70, p.y * 70, p.z * 70, 2, 5);
}

function paintAlpaca(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c, shape } = ctx;
    const p = pp.p;
    if ((c.marks ?? []).length > 2) out.lerp(rainbowAt(RAINBOW, p.y * 2.4 + p.x * 0.5, tmp), isHead(pp) ? 0.2 : 0.55);
    const light = col(c.light);
    if (pp.region === "torso" || pp.region === "arm" || pp.region === "leg") {
        // Runo: kovrdžava svetlija šara, gušće oko vrata i grudi
        const k = pp.region === "torso" ? 0.6 + 0.4 * smoothstep(shape.chestY, shape.neckBaseY, p.y) : 1 - smoothstep(0.4, 0.75, pp.t ?? 0);
        out.lerp(light, smoothstep(0.45, 0.7, fleece(p)) * 0.5 * k);
        out.multiplyScalar(1 - (1 - smoothstep(0.3, 0.5, fleece(p))) * 0.06 * k);
    }
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        out.lerp(col(c.muzzle), smoothstep(0.1, 0.6, pp.muzzle ?? 0));
        void q;
    }
}

/** Vunena kapa na temenu (pompon od kovrdža) */
function addTopknot(b: AnimalBuild) {
    const head = b.head;
    const k = b.k;
    const clumps: Clump[] = [];
    const n = b.quality === "high" ? 30 : 20;
    for (let i = 0; i < n; i++) {
        const y = 1 - (i + 0.5) / n;
        const r = Math.sqrt(1 - y * y);
        const phi = i * 2.399963;
        const d = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
        // Teme i čelo (do obrva), ne preko lica
        if (d.y < 0.42 - Math.max(0, -d.z) * 0.5 || (d.z > 0.5 && d.y < 0.72)) continue;
        const [u, v] = head.uvOf(d);
        const base = head.point(u, v);
        const nn = head.normal(u, v);
        clumps.push({ base: base.addScaledVector(nn, -0.012 * k), dir: nn.clone().add(new THREE.Vector3(0.2 * Math.sin(i * 3.1), 0.3, 0.15)).normalize(), len: (0.075 + 0.015 * Math.sin(i * 1.7)) * k, r: (0.05 + 0.008 * Math.cos(i * 2.3)) * k, curl: new THREE.Vector3(-d.z, -0.3, d.x).normalize(), color: b.coat.fur, flat: 0.7, taper: 0.45, shade: 0.12 });
    }
    const mesh = new THREE.Mesh(clumpGeometry(clumps, b.quality), furMaterial({ sheen: b.coat.light }));
    mesh.name = "vunena-kapa";
    b.headGroup.add(mesh);
    b.part("hair", mesh);
}

export const ALPACA: AnimalSpec = {
    kind: "alpaca",
    skins: MORE_SKINS.alpaca,
    coats: ALPACA_COATS,
    shape: { kind: asMore("alpaca"), girth: 1.04, belly: 1.08, limb: 1.0, legK: 1.02, neck: 0.13, neckR: 0.062, head: { w: 0.31, h: 0.33, d: 0.33 } },
    ref: 0.42,
    head: {
        flat: 0.1,
        flatTop: 0.1,
        chin: 0.08,
        blobs: [
            { c: [0, -0.085, 0.1], r: [0.1, 0.085, 0.15], k: 0.06, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, 0.02, 0.9], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0.1, -0.55, 0.83], sigma: 0.1, amp: 0.006, muzzle: true, mirror: true },
        ],
        eye: { u: 0.11, v: 0.44, r: 0.064, inset: 0.66, yaw: 0.28 },
        noseV: 0.6,
        mouthV: 0.7,
    },
    face: {
        eye: { upper: 0.84, lower: -0.86, lashes: 4, iris: 0.98, pupil: 0.56 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "nostrils", w: 0.011, h: 0.007, d: 0.006, v: 0.6 },
        mouth: { w: 0.034, h: 0.05, curve: "w", teeth: "buck", wrap: 0.07, philtrum: 0.014, line: 0.0026 },
    },
    ears: {
        kind: "tall",
        shape: { len: 0.13, width: 0.06, depth: 0.03, profile: EAR_PROFILES.tall, cup: 0.6, inner: 0.65, bend: -0.012 },
        u: 0.61,
        v: 0.13,
        sink: 0.012,
        tilt: [-0.05, 0.3, 0.35],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0, 0.02, -0.03], [0, 0.03, -0.05]],
        radius: profile([[0, 0.03], [1, 0.03]]),
        pom: 0.045,
        motion: "flick",
        height: 0.06,
    },
    hands: "hoof",
    feet: "hoof",
    belly: 0,
    cheeks: 0,
    earMotion: "twitch",
    extras: addTopknot,
    paint: paintAlpaca,
};

registerCompanion(companionFrom(ALPACA));
