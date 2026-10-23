// Poni: zaobljena glava sa izduženom svetlom njuškom i krupnim nozdrvama, visoke šiljate uši,
// krupne oči sa trepavicama, griva od mekih pramenova (šiška preko čela — kapa je sakriva kao
// kosu — i greben niz vrat), rep od talasastih pramenova, kopita. Šareni (pinto) ima mrlje.

import * as THREE from "three";
import { registerCompanion, shade } from "../../contract";
import { profile } from "../../engine/surface";
import type { Coat } from "../coats";
import { companionFrom, type AnimalBuild, type AnimalSpec } from "../figure";
import { furMaterial } from "../materials";
import type { PaintContext, PaintPoint } from "../paint";
import { clumpGeometry, EAR_PROFILES, type Clump } from "../parts";
import { asKind, col, goldCoat, headLocal, isHead, PASTEL, scaleOf, smoothstep } from "./common";
import { fbm3 } from "./kit/util";
import { EXTRA_SKINS } from "./skins.data";

function pony(fur: string, mane: string[], extra: Partial<Coat> = {}): Coat {
    return {
        fur,
        light: shade(fur, 0.3),
        muzzle: shade(fur, 0.38),
        inner: "#F4C2C6",
        nose: shade(fur, -0.5),
        brow: shade(mane[0], -0.1),
        iris: ["#9A6A3A", "#3A200C"],
        pattern: "none",
        mane,
        hoof: "#4A3A34",
        ...extra,
    };
}

export const PONY_COATS: Record<string, Coat> = {
    braon: pony("#A8703F", ["#4A2C1E", "#5E3A26"]),
    beli: pony("#F7F4EF", ["#D9CFC2", "#EDE6DC"], { muzzle: "#FCE6EA", nose: "#C99AA4", hoof: "#8A7A70", iris: ["#7AA6D6", "#2A4A7E"] }),
    crni: pony("#3A3238", ["#1C181C", "#2A2428"], { muzzle: "#5A5058", nose: "#141014", hoof: "#2A2428" }),
    sareni: pony("#FFFFFF", ["#3A2C26", "#F4EEE6"], { marks: ["#8A5434"], muzzle: "#FCE9EC", nose: "#C99AA4", brow: "#8A5434" }),
    roze: pony("#F9CADB", ["#FF8FB8", "#FFFFFF", "#D6B8FF"], { nose: "#D97A9C", hoof: "#C2537E", iris: ["#B57AD6", "#4A1E6A"] }),
    zlatni: goldCoat({ pattern: "gold", mane: ["#FFFFFF", "#FFE7A0", "#F2C443"], hoof: "#B07A1E", nose: "#B07A1E" }),
    dugin: pony("#FFFFFF", PASTEL, { muzzle: "#FFF0F4", nose: "#D99AB0", iris: ["#C9A6F2", "#6A3FB0"], hoof: "#B79CFF" }),
};

function paintPony(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat } = ctx;
    const p = pp.p;
    if (coat.marks && coat.marks.length) {
        // Pinto: krupne nepravilne mrlje (šum), ne preko njuške
        const n = fbm3(p.x * 7 + 3, p.y * 7, p.z * 7, 3, 41);
        const keep = isHead(pp) ? 1 - smoothstep(0.05, 0.4, pp.muzzle ?? 0) : 1;
        out.lerp(col(coat.marks[0]), smoothstep(0.52, 0.56, n) * keep);
    }
    if (pp.region === "torso") {
        const front = smoothstep(0.3, 0.9, p.z / Math.max(0.01, ctx.shape.torsoFront(p.y)));
        out.lerp(col(coat.light), front * 0.35);
    }
    if ((pp.region === "leg" || pp.region === "arm") && (pp.t ?? 0) > 0.75) out.lerp(col(coat.light), smoothstep(0.78, 0.92, pp.t ?? 0) * 0.5);
    if (pp.region === "ear" && pp.inner) out.lerp(col(coat.inner), 0.8);
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        // Bela lisa (zvezdica) na čelu
        const blaze = Math.exp(-((q.x / 0.09) ** 2 + ((q.y - 0.22) / 0.16) ** 2)) * smoothstep(0.3, 0.7, q.z);
        if (!coat.marks) out.lerp(col(coat.light), blaze * 0.7);
    }
}

/** Griva: šiška na čelu (deo „kosa”) i greben od temena niz vrat */
function addMane(b: AnimalBuild) {
    const k = scaleOf(b);
    const colors = b.coat.mane ?? ["#4A2C1E"];
    const head = b.head;
    const rainbow = colors.length > 2;
    const pick = (i: number, t: number) => (rainbow ? colors[i % colors.length] : colors[(i + (t > 0.5 ? 1 : 0)) % colors.length]);
    // Šiška: tri puna pramena sa čela, padaju napred i u stranu (−x) preko čela
    const fore: Clump[] = [];
    for (let i = 0; i < 3; i++) {
        const u = 0.5 + 0.02 * (i - 1) - 0.015;
        const v = 0.17 + i * 0.014;
        fore.push({ base: head.offsetPoint(u, v, -0.006 * k), dir: new THREE.Vector3(-0.55, -0.55, 0.62).normalize(), len: (0.11 - i * 0.012) * k, r: 0.031 * k, flat: 0.5, taper: 0.5, color: pick(i, 0), curl: new THREE.Vector3(0.3, -0.3, 0.1) });
    }
    // Griva: niz sredinu temena i potiljka, pada uglavnom na jednu stranu (poneki pramen na drugu)
    const crown: Clump[] = [];
    const steps = b.quality === "high" ? 16 : 10;
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const front = t < 0.22;
        const u = front ? 0.5 : 0.0;
        const v = front ? 0.15 * (1 - t / 0.22) : 0.02 + ((t - 0.22) / 0.78) * 0.58;
        const side = i % 4 === 3 ? 1 : -1;
        const nn = head.normal(u, Math.max(0.01, v));
        const dir = nn.clone().multiplyScalar(0.55).add(new THREE.Vector3(side * 0.75, -0.7, -0.3)).normalize();
        crown.push({ base: head.offsetPoint(u, Math.max(0.01, v), -0.006 * k), dir, len: (0.14 + 0.08 * Math.sin(Math.PI * t)) * k, r: 0.042 * k, flat: 0.45, taper: 0.5, color: pick(i, t), curl: new THREE.Vector3(-side * 0.4, -0.5, 0) });
    }
    const forelock = new THREE.Mesh(clumpGeometry([...fore, ...crown.slice(0, 4)], b.quality), furMaterial({ sheen: colors[0], shimmer: b.coat.shimmer }));
    b.headGroup.add(forelock);
    b.part("hair", forelock);
    const crestMesh = new THREE.Mesh(clumpGeometry(crown.slice(4), b.quality), furMaterial({ sheen: colors[0], shimmer: b.coat.shimmer }));
    b.headGroup.add(crestMesh);
    // Niz vrat (kost vrata): dugi pramenovi koji padaju na istu stranu do ramena
    const shape = b.shape;
    const neck: Clump[] = [];
    const y0 = shape.shoulderY - 0.01;
    const y1 = shape.headBoneY + 0.02;
    for (let i = 0; i < 4; i++) {
        const y = y0 + ((y1 - y0) * i) / 3;
        const z = -shape.torsoBack(y) + 0.008;
        neck.push({ base: new THREE.Vector3(-0.006 * k, y, z), dir: new THREE.Vector3(-0.85, -0.5, -0.3).normalize(), len: 0.12 * k, r: 0.034 * k, curl: new THREE.Vector3(0.3, -0.5, 0), color: pick(i + 1, 0.8), flat: 0.45, taper: 0.5 });
    }
    const neckMesh = new THREE.Mesh(clumpGeometry(neck, b.quality), furMaterial({ sheen: b.coat.light }));
    neckMesh.position.copy(b.boneAt("neck")).negate();
    b.bone("neck")!.add(neckMesh);
    // Griva se blago njiše
    b.onAnimate((time, _dt, live) => {
        crestMesh.rotation.z = live ? Math.sin(time * 1.3) * 0.015 : 0;
        forelock.rotation.x = live ? Math.sin(time * 1.1) * 0.01 : 0;
    });
}

export const PONY: AnimalSpec = {
    kind: "pony",
    skins: EXTRA_SKINS.pony,
    coats: PONY_COATS,
    shape: { kind: asKind("pony"), girth: 1.02, belly: 1.05, limb: 1.04, head: { w: 0.33, h: 0.37, d: 0.37 } },
    ref: 0.43,
    head: {
        flat: 0.05,
        flatTop: 0.08,
        chin: 0.04,
        blobs: [
            // Izdužena, zaobljena njuška (konjska, ali kratka i slatka)
            { c: [0, -0.1, 0.12], r: [0.105, 0.088, 0.19], k: 0.06, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, 0.02, 0.9], sigma: 0.13, amp: -0.006, mirror: true },
            // Mekane nozdrve: blago ispupčenje sa strane vrha njuške
            { dir: [0.16, -0.5, 0.85], sigma: 0.1, amp: 0.008, muzzle: true, mirror: true },
            // Obrazi (ganaša) pozadi njuške
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
        shape: { len: 0.13, width: 0.075, depth: 0.035, profile: EAR_PROFILES.tall, cup: 0.6, inner: 0.66, bend: 0.012 },
        u: 0.6,
        v: 0.11,
        sink: 0.012,
        tilt: [-0.15, 0.25, 0.42],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0, -0.03, -0.06], [0.01, -0.12, -0.1], [0.02, -0.22, -0.11], [0.03, -0.3, -0.1]],
        radius: profile([[0, 0.03], [0.5, 0.036], [1, 0.02]]),
        locks: 7,
        motion: "sway",
        height: 0.07,
    },
    hands: "hoof",
    feet: "hoof",
    belly: 0,
    cheeks: 0,
    earMotion: "twitch",
    extras: addMane,
    paint: paintPony,
};

registerCompanion(companionFrom(PONY));
