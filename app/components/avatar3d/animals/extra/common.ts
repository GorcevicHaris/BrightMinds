// Zajedničko za dodatne životinje: posebna krzna (zlatno, dugino) u istom stilu kao glavne
// vrste, maske za sopstvene šare (oko očiju, stomak, donji deo lica, njuška) i duga po visini.
// Sve maske rade u prostoru tela (mirovanje), pa šara prelazi preko granica delova.

import * as THREE from "three";
import type { AnimalKind, ExtraAnimalKind } from "../../data";
import { clamp01, smoothstep } from "../../engine/surface";
import type { Coat } from "../coats";
import { col, type PaintContext, type PaintPoint } from "../paint";

/** Okvir (shape.ts, paint.ts) za sada tipizuje vrstu kao AnimalKind; dodatne vrste prolaze kroz ovo */
export function asKind(kind: ExtraAnimalKind): AnimalKind {
    return kind as unknown as AnimalKind;
}

export const PASTEL = ["#FFB3C7", "#FFD0A6", "#FFF1A6", "#BFF0C8", "#B5DEFF", "#D6C2FF"];

/** Zlatno krzno sa svetlucanjem */
export function goldCoat(extra: Partial<Coat> = {}): Coat {
    return {
        fur: "#F2C443",
        light: "#FFF0B8",
        muzzle: "#FFF4CC",
        inner: "#F7A9B6",
        nose: "#B5672A",
        brow: "#C08A1E",
        iris: ["#7ED6F2", "#1F7FA8"],
        pattern: "gold",
        marks: ["#FFFFFF"],
        shimmer: true,
        ...extra,
    };
}

/** Dugino krzno: pastelne boje po visini */
export function rainbowCoat(extra: Partial<Coat> = {}): Coat {
    return {
        fur: "#FFF6FA",
        light: "#FFFFFF",
        muzzle: "#FFFFFF",
        inner: "#F9B9C9",
        nose: "#F08AA0",
        brow: "#B59AD0",
        iris: ["#C9A6F2", "#6A3FB0"],
        pattern: "rainbow",
        marks: PASTEL,
        mane: PASTEL,
        ...extra,
    };
}

const tmp = new THREE.Vector3();

/** Lokalne koordinate glave (poluose = 1): x levo od lika, y gore, z napred */
export function headLocal(ctx: PaintContext, p: THREE.Vector3, out = tmp): THREE.Vector3 {
    return out.subVectors(p, ctx.headCenter).divide(ctx.headRadii);
}

export function isHead(pp: PaintPoint): boolean {
    return pp.region === "head" || pp.region === "lid";
}

/**
 * Mrlja oko oka (panda, rakun): elipsa oko središta oka, pomerena (dx napolje, dy gore, u
 * poluprečnicima oka) i nagnuta (tilt: spoljni kraj dole). Vraća 0–1 sa mekom ivicom.
 */
export function eyePatch(ctx: PaintContext, p: THREE.Vector3, o: { rx: number; ry: number; dx?: number; dy?: number; tilt?: number; soft?: number }): number {
    let best = 0;
    for (const [i, e] of ctx.eyes.entries()) {
        const side = i === 0 ? 1 : -1;
        const r = ctx.eyeR;
        const lx = (p.x - e.x) * side - (o.dx ?? 0) * r;
        const ly = p.y - e.y - (o.dy ?? 0) * r;
        const c = Math.cos(o.tilt ?? 0);
        const s = Math.sin(o.tilt ?? 0);
        const x = (lx * c + ly * s) / (o.rx * r);
        const y = (-lx * s + ly * c) / (o.ry * r);
        const z = (p.z - e.z) / (r * 2.6);
        const d = Math.hypot(x, y, Math.min(0, z) * 1.2);
        const soft = o.soft ?? 0.12;
        best = Math.max(best, 1 - smoothstep(1 - soft, 1 + soft, d));
    }
    return best;
}

/** Svetao stomak i grudi (ovalni deo spreda); `widen` širi ka bokovima */
export function bellyMask(ctx: PaintContext, p: THREE.Vector3, widen = 0, top?: number): number {
    const s = ctx.shape;
    const a = Math.atan2(p.x / Math.max(0.01, s.torsoW(p.y)), p.z >= 0 ? p.z / Math.max(0.01, s.torsoFront(p.y)) : p.z / Math.max(0.01, s.torsoBack(p.y)));
    const width = 0.55 + 0.6 * ctx.belly + widen;
    const front = 1 - smoothstep(width * 0.75, width, Math.abs(a));
    const yTop = top ?? s.neckBaseY + 0.02;
    const bottom = s.crotchY + 0.01;
    const vertical = smoothstep(bottom - 0.01, bottom + 0.05, p.y) * (1 - smoothstep(yTop - 0.03, yTop + 0.02, p.y));
    return front * vertical;
}

/** Ugao oko trupa (0 = napred, ±π = pozadi) */
export function torsoAngle(p: THREE.Vector3): number {
    return Math.atan2(p.x, p.z);
}

/** Duga po parametru (boje u krug, meki prelazi) */
export function rainbowAt(marks: readonly string[], t: number, out: THREE.Color): THREE.Color {
    const n = marks.length;
    const x = (((t % 1) + 1) % 1) * n;
    const i = Math.floor(x);
    const f = smoothstep(0.25, 0.75, x - i);
    return out.copy(col(marks[i % n])).lerp(col(marks[(i + 1) % n]), f);
}

/** Boja šare: jedna boja, ili duga po visini kad ih ima više */
export function markColor(coat: Coat, p: THREE.Vector3, out: THREE.Color, index = 0): THREE.Color {
    const marks = coat.marks ?? [coat.fur];
    if (marks.length > 2) return rainbowAt(marks, p.y * 2.2, out);
    return out.copy(col(marks[Math.min(index, marks.length - 1)]));
}

/** Udeo njuške sa mekim pragom */
export function muzzleOf(pp: PaintPoint, a = 0.1, b = 0.6): number {
    return smoothstep(a, b, pp.muzzle ?? 0);
}

export { clamp01, smoothstep, col };
