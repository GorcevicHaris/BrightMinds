// Kravica: okrugla glava sa širokom ružičastom njuškom (krupne nozdrve), kratki svetli rogovi
// (kapa ih zaobilazi), uši koje štrče u stranu, čuperak između rogova (kapa ga sakriva kao kosu),
// krupne mrlje po telu, kopita i rep sa kićankom.

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

function cow(fur: string, spot: string, extra: Partial<Coat> = {}): Coat {
    return coat(fur, "#FFFFFF", { muzzle: "#F7B8C4", inner: "#F6B6C2", nose: "#C46A82", brow: shade(spot, 0.1), iris: ["#8A5A3A", "#2A180C"], marks: [spot], horn: "#F6EEDC", hoof: "#5A4A44", tailTip: spot, ...extra });
}

export const COW_COATS: Record<string, Coat> = {
    "crno-bela": cow("#FFFFFF", "#2E2A30"),
    smedja: cow("#FFFFFF", "#9A5A34", { brow: "#9A5A34" }),
    braon: cow("#A8683E", "#7A4426", { muzzle: "#F2C6B6", brow: "#5A3018", marks: [] }),
    roze: cow("#FFF2F6", "#F28AB4", { muzzle: "#FFC6D8", iris: ["#B57AD6", "#4A1E6A"], horn: "#FFF6E0" }),
    zlatna: goldCoat({ muzzle: "#FFD8C8", nose: "#C46A82", marks: ["#D9A21E"], horn: "#FFF6E0", hoof: "#8A5A10", tailTip: "#C08A1E", pattern: "none" }),
    duga: cow("#FFFFFF", "#C7AEFF", { marks: RAINBOW, iris: ["#C9A6F2", "#6A3FB0"], muzzle: "#FFD6E6" }),
};

const tmp = new THREE.Color();

function paintCow(pp: PaintPoint, ctx: PaintContext, out: THREE.Color) {
    const { coat: c } = ctx;
    const p = pp.p;
    const marks = c.marks ?? [];
    if (!marks.length || pp.region === "hand" || pp.region === "foot") return;
    const spot = marks.length > 2 ? rainbowAt(marks, p.y * 2 + p.x * 2, tmp) : tmp.copy(col(marks[0]));
    let k = smoothstep(0.53, 0.57, fbm3(p.x * 6 + 2, p.y * 6, p.z * 6, 3, 23));
    if (isHead(pp)) {
        const q = headLocal(ctx, p);
        // Glava: jedna mrlja oko oka i uha (desna strana lika), čelo belo
        const eye = Math.exp(-(((q.x + 0.45) / 0.35) ** 2 + ((q.y - 0.15) / 0.4) ** 2)) * smoothstep(-0.6, 0.2, q.z);
        k = smoothstep(0.35, 0.55, eye) * (1 - smoothstep(0.1, 0.4, pp.muzzle ?? 0));
    }
    if (pp.region === "ear") k = (pp.side ?? 1) < 0 ? 1 : 0;
    if (pp.region === "tail") k = Math.max(k, smoothstep(0.85, 0.95, pp.t ?? 0));
    if (pp.region === "ear" && pp.inner) k = 0;
    out.lerp(spot, k);
}

/** Čuperak na temenu između rogova */
function addTuft(b: AnimalBuild) {
    const head = b.head;
    const k = b.k;
    const clumps: Clump[] = [];
    for (let i = 0; i < 7; i++) {
        const u = 0.5 + (i - 3) * 0.018;
        const v = 0.08 + (i % 2) * 0.025;
        const nn = head.normal(u, v);
        clumps.push({ base: head.offsetPoint(u, v, -0.004 * k), dir: nn.clone().add(new THREE.Vector3((i - 3) * 0.12, 0.1, 0.5)).normalize(), len: 0.045 * k, r: 0.017 * k, curl: new THREE.Vector3(0, -1, 0.3), color: b.coat.marks?.length === 1 && b.coat.fur === "#FFFFFF" ? b.coat.marks[0] : b.coat.fur, flat: 0.6 });
    }
    const mesh = new THREE.Mesh(clumpGeometry(clumps, b.quality), furMaterial({ sheen: b.coat.light }));
    mesh.name = "cuperak";
    b.headGroup.add(mesh);
    b.part("hair", mesh);
}

export const COW: AnimalSpec = {
    kind: "cow",
    skins: MORE_SKINS.cow,
    coats: COW_COATS,
    shape: { kind: asMore("cow"), girth: 1.12, belly: 1.16, limb: 1.06, head: { w: 0.35, h: 0.34, d: 0.34 } },
    ref: 0.44,
    head: {
        flat: 0.06,
        flatTop: 0.2,
        chin: 0.04,
        blobs: [
            // Široka zaobljena njuška
            { c: [0, -0.095, 0.1], r: [0.15, 0.1, 0.17], k: 0.06, muzzle: true },
        ],
        bumps: [
            { dir: [0.4, 0.02, 0.9], sigma: 0.13, amp: -0.006, mirror: true },
            { dir: [0.2, -0.45, 0.87], sigma: 0.11, amp: 0.01, muzzle: true, mirror: true },
        ],
        eye: { u: 0.104, v: 0.43, r: 0.06, inset: 0.68, yaw: 0.24 },
        noseV: 0.63,
        mouthV: 0.74,
    },
    face: {
        eye: { upper: 0.82, lower: -0.86, lashes: 3, iris: 0.96, pupil: 0.48 },
        brow: { dv: 0.115, len: 0.05, thick: 0.008 },
        nose: { kind: "nostrils", w: 0.018, h: 0.012, d: 0.008, v: 0.63 },
        mouth: { w: 0.06, h: 0.055, curve: "smile", teeth: "none", wrap: 0.1, philtrum: 0, line: 0.003 },
    },
    ears: {
        kind: "floppy",
        shape: { len: 0.12, width: 0.075, depth: 0.03, profile: EAR_PROFILES.floppy, cup: 0.55, inner: 0.65, bend: -0.01 },
        u: 0.7,
        v: 0.3,
        sink: 0.008,
        tilt: [-0.15, 0.6, 1.55],
        inner: "pad",
    },
    tail: {
        points: [[0, 0, 0], [0.01, -0.05, -0.05], [0.03, -0.16, -0.08], [0.05, -0.26, -0.08]],
        radius: profile([[0, 0.014], [1, 0.01]]),
        tuft: 0.038,
        motion: "flick",
        height: 0.07,
    },
    hands: "hoof",
    feet: "hoof",
    belly: 0.3,
    cheeks: 0,
    earMotion: "swing",
    extras: (b) => {
        addHorns(b, { u: 0.585, v: 0.12, points: [[0, 0, 0], [0.03, 0.015, -0.005], [0.05, 0.045, -0.005]], r0: 0.016, r1: 0.008, color: b.coat.horn ?? "#F6EEDC" });
        addTuft(b);
    },
    paint: paintCow,
};

registerCompanion(companionFrom(COW));
