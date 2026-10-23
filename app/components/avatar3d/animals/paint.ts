// Boja krzna po temenu: osnovna boja, svetliji stomak i njuška, šare (pruge, fleke, maska…)
// i meka senka u naborima (ispod brade, pazuh, koren uha, između prstiju). Sve je funkcija
// položaja u prostoru tela, pa se šara nastavlja preko granica delova (trup → ruka → šapa).

import * as THREE from "three";
import type { BodyShape } from "../contract";
import type { AnimalKind } from "../data";
import { clamp01, smoothstep } from "../engine/surface";
import type { Coat } from "./coats";

export type Region = "torso" | "arm" | "leg" | "hand" | "foot" | "head" | "lid" | "ear" | "tail" | "mane";

/** Jedno teme koje se boji */
export interface PaintPoint {
    /** Položaj u prostoru tela (mirovanje) */
    p: THREE.Vector3;
    region: Region;
    /** Udeo duž dela (uho, rep, ruka, noga: 0 = koren, 1 = vrh) */
    t?: number;
    /** Strana (+1 levo od lika, −1 desno) */
    side?: number;
    /** Udeo njuške (glava) */
    muzzle?: number;
    /** Senka u naboru (0–1) */
    ao?: number;
    /** Unutrašnja strana (uho, rep) */
    inner?: number;
}

export interface PaintContext {
    kind: AnimalKind;
    coat: Coat;
    shape: BodyShape;
    /** Središte glave u prostoru tela i poluose */
    headCenter: THREE.Vector3;
    headRadii: THREE.Vector3;
    /** Središta očiju (prostor tela) */
    eyes: [THREE.Vector3, THREE.Vector3];
    eyeR: number;
    /** Koliko je stomak svetao i širok (0–1) */
    belly: number;
    /** Svetli obrazi i brada (lisica, haski, pingvin) */
    cheeks: number;
}

// ── 3D šum ────────────────────────────────────────────────────────────────────

function hash3(x: number, y: number, z: number, seed = 1): number {
    let h = x * 374761393 + y * 668265263 + z * 1440662683 + seed * 2246822519;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise3(x: number, y: number, z: number, seed = 1): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const fx = x - xi;
    const fy = y - yi;
    const fz = z - zi;
    const s = (t: number) => t * t * (3 - 2 * t);
    const sx = s(fx);
    const sy = s(fy);
    const sz = s(fz);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
    return l(
        l(l(c(0, 0, 0), c(1, 0, 0), sx), l(c(0, 1, 0), c(1, 1, 0), sx), sy),
        l(l(c(0, 0, 1), c(1, 0, 1), sx), l(c(0, 1, 1), c(1, 1, 1), sx), sy),
        sz,
    );
}

function fbm3(x: number, y: number, z: number, seed = 1): number {
    return noise3(x, y, z, seed) * 0.6 + noise3(x * 2.1, y * 2.1, z * 2.1, seed + 7) * 0.3 + noise3(x * 4.3, y * 4.3, z * 4.3, seed + 13) * 0.1;
}

/** Okrugle fleke (dalmatinac): 1 u fleki, meka ivica */
function spots(p: THREE.Vector3, cell: number, seed: number, fill = 0.55): number {
    const gx = Math.floor(p.x / cell);
    const gy = Math.floor(p.y / cell);
    const gz = Math.floor(p.z / cell);
    let best = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
        const cx = gx + i;
        const cy = gy + j;
        const cz = gz + k;
        if (hash3(cx, cy, cz, seed) > fill) continue;
        const fx = (cx + 0.2 + 0.6 * hash3(cx, cy, cz, seed + 1)) * cell;
        const fy = (cy + 0.2 + 0.6 * hash3(cx, cy, cz, seed + 2)) * cell;
        const fz = (cz + 0.2 + 0.6 * hash3(cx, cy, cz, seed + 3)) * cell;
        const r = cell * (0.22 + 0.16 * hash3(cx, cy, cz, seed + 4));
        const d = Math.hypot(p.x - fx, p.y - fy, p.z - fz);
        best = Math.max(best, 1 - smoothstep(r * 0.82, r, d));
    }
    return best;
}

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();
const colorCache = new Map<string, THREE.Color>();

/** Boja iz heksa (linearni prostor, keš) */
export function col(hex: string): THREE.Color {
    let c = colorCache.get(hex);
    if (!c) {
        c = new THREE.Color(hex);
        colorCache.set(hex, c);
    }
    return c;
}

/** Duga kroz visinu (pastelne boje u krug) */
function rainbowAt(marks: readonly string[], t: number, out: THREE.Color): THREE.Color {
    const n = marks.length;
    const x = ((t % 1) + 1) % 1 * n;
    const i = Math.floor(x);
    const f = smoothstep(0.25, 0.75, x - i);
    return out.copy(col(marks[i % n])).lerp(col(marks[(i + 1) % n]), f);
}

/** Lokalne koordinate glave (poluose = 1) */
function headLocal(ctx: PaintContext, p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    return out.subVectors(p, ctx.headCenter).divide(ctx.headRadii);
}

const q = new THREE.Vector3();

/** Udeo „oko oka” (maska oko očiju: panda, sijamska, haski) */
function aroundEyes(ctx: PaintContext, p: THREE.Vector3, scale: number, tilt = 0): number {
    let best = 0;
    for (const [i, e] of ctx.eyes.entries()) {
        const side = i === 0 ? 1 : -1;
        const dx = (p.x - e.x) / (ctx.eyeR * scale * 1.15);
        const dy = (p.y - e.y + dx * tilt * side * ctx.eyeR * scale) / (ctx.eyeR * scale * 1.45);
        const dz = (p.z - e.z) / (ctx.eyeR * scale * 2.2);
        best = Math.max(best, 1 - smoothstep(0.75, 1.05, Math.hypot(dx, dy, dz)));
    }
    return best;
}

/** Svetao stomak i grudi (ovalni deo spreda) */
function bellyMask(ctx: PaintContext, p: THREE.Vector3, widen = 0): number {
    const s = ctx.shape;
    const a = Math.atan2(p.x / Math.max(0.01, s.torsoW(p.y)), p.z >= 0 ? p.z / Math.max(0.01, s.torsoFront(p.y)) : p.z / Math.max(0.01, s.torsoBack(p.y)));
    const width = 0.55 + 0.6 * ctx.belly + widen;
    const front = 1 - smoothstep(width * 0.75, width, Math.abs(a));
    const top = s.neckBaseY + 0.02;
    const bottom = s.crotchY + 0.01;
    const vertical = smoothstep(bottom - 0.01, bottom + 0.05, p.y) * (1 - smoothstep(top - 0.03, top + 0.02, p.y));
    return front * vertical * (ctx.belly > 0 ? 1 : 0);
}

/** Svetla brada i obrazi (donji deo lica) */
function lowerFace(ctx: PaintContext, p: THREE.Vector3, amount: number): number {
    headLocal(ctx, p, q);
    if (amount <= 0) return 0;
    const below = 1 - smoothstep(-0.38 + amount * 0.3, -0.2 + amount * 0.35, q.y);
    const front = smoothstep(-0.2, 0.3, q.z);
    return below * front;
}

/**
 * Boja jednog temena (linearni prostor). `out` dobija boju krzna sa šarom i senkom.
 */
export function coatColor(ctx: PaintContext, pp: PaintPoint, out: THREE.Color): THREE.Color {
    const { coat, shape } = ctx;
    const p = pp.p;
    const t = pp.t ?? 0;
    const fur = col(coat.fur);
    const light = col(coat.light);
    out.copy(fur);

    // ── Osnova po delu tela ──
    switch (pp.region) {
        case "torso":
            out.lerp(light, bellyMask(ctx, p));
            break;
        case "hand":
        case "foot":
            if (coat.paws) out.copy(col(coat.paws));
            break;
        case "head":
        case "lid": {
            out.lerp(light, lowerFace(ctx, p, ctx.cheeks));
            const m = pp.muzzle ?? 0;
            if (m > 0) out.lerp(col(coat.muzzle), smoothstep(0.1, 0.7, m));
            break;
        }
        case "ear":
            if (coat.ears) out.copy(col(coat.ears));
            if (coat.earTips) out.lerp(col(coat.earTips), smoothstep(0.45, 0.75, t));
            if (pp.inner) out.lerp(col(coat.light), pp.inner * 0.7);
            break;
        case "tail":
            if (coat.tail) out.copy(col(coat.tail));
            if (coat.tailTip) out.lerp(col(coat.tailTip), smoothstep(0.72, 0.86, t));
            break;
        case "mane":
            break;
        default:
            break;
    }

    // ── Šare ──
    const marks = coat.marks ?? [];
    const m0 = marks[0] ? col(marks[0]) : fur;
    switch (coat.pattern) {
        case "tiger": {
            const n = fbm3(p.x * 18, p.y * 18, p.z * 18, 3);
            if (pp.region === "torso") {
                const a = Math.atan2(p.x, p.z);
                const back = smoothstep(0.9, 1.7, Math.abs(a));
                const s = Math.sin(p.y * 70 + Math.sin(a * 2.2) * 1.1 + n * 3.2);
                out.lerp(m0, smoothstep(0.45, 0.8, s) * back * 0.85);
            } else if (pp.region === "arm" || pp.region === "leg") {
                const outer = smoothstep(-0.3, 0.4, p.x * (pp.side ?? 1) / 0.2 - Math.abs(p.z) * 2);
                const s = Math.sin(p.y * 80 + n * 3);
                out.lerp(m0, smoothstep(0.55, 0.85, s) * outer * 0.75);
            } else if (pp.region === "tail") {
                const s = Math.sin(t * 34 + n * 2);
                out.lerp(m0, smoothstep(0.35, 0.75, s) * 0.85);
            } else if (pp.region === "head") {
                headLocal(ctx, p, q);
                // Slovo „M” na čelu: tri pruge koje se sužavaju ka očima
                for (const cx of [0, -0.24, 0.24]) {
                    const len = cx === 0 ? 0.42 : 0.3;
                    const along = smoothstep(0.78 - len, 0.88 - len * 0.6, q.y) * (1 - smoothstep(0.9, 1.02, q.y));
                    const wdt = 0.055 * (0.6 + 0.6 * smoothstep(0.3, 0.9, q.y));
                    const line = 1 - smoothstep(wdt * 0.6, wdt, Math.abs(q.x - cx * (1 - 0.2 * q.y)));
                    out.lerp(m0, line * along * smoothstep(-0.1, 0.3, q.z) * 0.9);
                }
                // Pruge na obrazima
                for (const yy of [-0.12, -0.3]) {
                    const line = 1 - smoothstep(0.035, 0.06, Math.abs(q.y - yy - (Math.abs(q.x) - 0.8) * 0.25));
                    out.lerp(m0, line * smoothstep(0.62, 0.8, Math.abs(q.x)) * smoothstep(-0.4, 0.2, q.z) * 0.8);
                }
            }
            break;
        }
        case "tuxedo": {
            const white = marks[0] ? col(marks[0]) : light;
            if (pp.region === "torso") out.copy(fur).lerp(white, bellyMask(ctx, p, 0.15));
            if (pp.region === "hand" || pp.region === "foot") out.copy(white);
            if (pp.region === "head" || pp.region === "lid") {
                headLocal(ctx, p, q);
                const lower = 1 - smoothstep(-0.32, -0.12, q.y - Math.abs(q.x) * 0.2);
                const blaze = (1 - smoothstep(0.1, 0.16, Math.abs(q.x) - (0.05 - q.y) * 0.4)) * (1 - smoothstep(0.35, 0.5, q.y));
                out.copy(fur).lerp(white, Math.max(lower, blaze, smoothstep(0.1, 0.6, pp.muzzle ?? 0)) * smoothstep(0, 0.35, q.z));
            }
            if (pp.region === "tail") out.lerp(white, smoothstep(0.85, 0.95, t));
            break;
        }
        case "calico": {
            if (pp.region === "ear") {
                out.copy(col(marks[(pp.side ?? 1) > 0 ? 0 : 1] ?? coat.fur));
                break;
            }
            const n1 = fbm3(p.x * 9, p.y * 9, p.z * 9, 21);
            const n2 = fbm3(p.x * 9 + 5, p.y * 9, p.z * 9, 37);
            const keep = pp.region === "head" || pp.region === "lid" ? 1 - smoothstep(0.1, 0.4, pp.muzzle ?? 0) : pp.region === "torso" ? 1 - bellyMask(ctx, p) : 1;
            out.lerp(col(marks[0] ?? coat.fur), smoothstep(0.56, 0.6, n1) * keep);
            out.lerp(col(marks[1] ?? coat.fur), smoothstep(0.6, 0.64, n2) * keep);
            break;
        }
        case "points": {
            let k = 0;
            if (pp.region === "ear" || pp.region === "tail") k = 0.9;
            if (pp.region === "hand" || pp.region === "foot") k = 1;
            if (pp.region === "arm") k = smoothstep(0.5, 1, t) * 0.85;
            if (pp.region === "leg") k = smoothstep(0.55, 1, t) * 0.85;
            if (pp.region === "head" || pp.region === "lid") {
                headLocal(ctx, p, q);
                const mask = Math.exp(-((q.x / 0.55) ** 2 + ((q.y + 0.25) / 0.5) ** 2)) * smoothstep(0.2, 0.7, q.z);
                k = Math.max(smoothstep(0.1, 0.8, pp.muzzle ?? 0) * 0.9, mask * 0.85);
            }
            out.lerp(m0, k);
            break;
        }
        case "spots": {
            if (pp.region === "ear") break;
            const skip = pp.region === "head" || pp.region === "lid" ? smoothstep(0.05, 0.3, pp.muzzle ?? 0) : 0;
            out.lerp(m0, spots(p, 0.075, 5) * (1 - skip));
            break;
        }
        case "husky": {
            const white = marks[0] ? col(marks[0]) : light;
            if (pp.region === "torso") out.copy(fur).lerp(white, bellyMask(ctx, p, 0.35));
            if (pp.region === "arm" || pp.region === "leg") out.lerp(white, smoothstep(0.35, 0.7, t));
            if (pp.region === "hand" || pp.region === "foot") out.copy(white);
            if (pp.region === "ear" && pp.inner) out.lerp(white, pp.inner);
            if (pp.region === "head" || pp.region === "lid") {
                headLocal(ctx, p, q);
                const yb = 0.18 - 0.36 * Math.exp(-((q.x / 0.13) ** 2)) - 0.18 * smoothstep(0.5, 0.9, Math.abs(q.x));
                const face = (1 - smoothstep(yb - 0.05, yb + 0.05, q.y)) * smoothstep(-0.25, 0.15, q.z);
                // Bele „obrve” iznad očiju
                const dots = ctx.eyes.reduce((m, e) => {
                    const d = Math.hypot((p.x - e.x) / (ctx.eyeR * 0.7), (p.y - e.y - ctx.eyeR * 1.55) / (ctx.eyeR * 0.45), (p.z - e.z) / (ctx.eyeR * 2));
                    return Math.max(m, 1 - smoothstep(0.75, 1, d));
                }, 0);
                out.copy(fur).lerp(white, Math.max(face, dots, smoothstep(0.1, 0.5, pp.muzzle ?? 0)));
            }
            break;
        }
        case "blaze": {
            const white = col(marks[0] ?? coat.light);
            const saddle = col(marks[1] ?? coat.fur);
            if (pp.region === "torso") {
                const a = Math.atan2(p.x, p.z);
                const back = smoothstep(1.9, 2.4, Math.abs(a)) * smoothstep(shape.waistY - 0.03, shape.waistY + 0.03, p.y) * (1 - smoothstep(shape.shoulderY - 0.03, shape.shoulderY + 0.01, p.y));
                out.copy(fur).lerp(white, bellyMask(ctx, p, 0.1)).lerp(saddle, back * 0.95);
            }
            if (pp.region === "hand" || pp.region === "foot") out.copy(white);
            if (pp.region === "leg") out.lerp(white, smoothstep(0.6, 0.85, t));
            if (pp.region === "head" || pp.region === "lid") {
                headLocal(ctx, p, q);
                const blaze = (1 - smoothstep(0.07, 0.12, Math.abs(q.x) - Math.max(0, 0.15 - q.y) * 0.35)) * (1 - smoothstep(0.55, 0.7, q.y)) * smoothstep(0.2, 0.5, q.z);
                out.lerp(white, Math.max(blaze, smoothstep(0.1, 0.5, pp.muzzle ?? 0)));
            }
            break;
        }
        case "dutch": {
            const dark = m0;
            if (pp.region === "torso") out.lerp(dark, 1 - smoothstep(shape.waistY - 0.02, shape.waistY + 0.02, p.y));
            if (pp.region === "leg") out.copy(dark);
            if (pp.region === "foot") out.copy(col(coat.light));
            if (pp.region === "head" || pp.region === "lid") {
                headLocal(ctx, p, q);
                const blaze = (1 - smoothstep(0.16, 0.24, Math.abs(q.x) + Math.max(0, q.y) * 0.15)) * smoothstep(0.1, 0.4, q.z);
                const lower = 1 - smoothstep(-0.35, -0.2, q.y);
                const cap = smoothstep(-0.25, 0.05, q.y) * (1 - Math.max(blaze, lower));
                out.lerp(dark, cap * (1 - smoothstep(0.1, 0.5, pp.muzzle ?? 0)));
            }
            break;
        }
        case "panda": {
            const dark = m0;
            if (pp.region === "arm" || pp.region === "leg" || pp.region === "hand" || pp.region === "foot") out.copy(dark);
            if (pp.region === "torso") {
                // Crni pojas preko ramena i ruke; noge crne do kukova
                const a = Math.atan2(p.x, p.z);
                const band = smoothstep(shape.chestY - 0.01, shape.chestY + 0.035, p.y) * (1 - smoothstep(shape.neckBaseY - 0.02, shape.neckBaseY + 0.02, p.y));
                const sides = smoothstep(0.55, 1.1, Math.abs(a));
                const hips = 1 - smoothstep(shape.crotchY + 0.02, shape.crotchY + 0.06, p.y);
                out.lerp(dark, Math.max(band * sides, hips));
            }
            if (pp.region === "head" || pp.region === "lid") out.lerp(dark, aroundEyes(ctx, p, 1.55, 0.6) * (1 - smoothstep(0.2, 0.6, pp.muzzle ?? 0)));
            break;
        }
        case "koala": {
            if (pp.region === "torso") out.lerp(col(coat.light), bellyMask(ctx, p, 0.05));
            if (pp.region === "ear") out.lerp(col("#FFFFFF"), (pp.inner ?? 0) * 0.9);
            if (pp.region === "head") out.lerp(col(coat.light), lowerFace(ctx, p, 0.6) * 0.8);
            break;
        }
        case "gold":
        case "stars": {
            const s = spots(p, 0.026, 77, 0.35);
            const twinkle = hash3(Math.floor(p.x * 400), Math.floor(p.y * 400), Math.floor(p.z * 400), 9);
            const fleck = coat.pattern === "gold" ? s * 0.35 + (twinkle > 0.985 ? 0.5 : 0) : s * 0.9;
            if (pp.region !== "mane") out.lerp(col(marks[0] ?? "#FFFFFF"), fleck * (pp.region === "head" ? 1 - smoothstep(0.1, 0.5, pp.muzzle ?? 0) : 1));
            break;
        }
        case "rainbow": {
            const k = pp.region === "head" || pp.region === "lid" ? 0.35 * smoothstep(0.1, 0.6, (p.y - ctx.headCenter.y) / ctx.headRadii.y) : 0.8;
            if (pp.region === "ear" || pp.region === "tail") rainbowAt(marks, t * 0.8 + 0.2, tmpA);
            else rainbowAt(marks, p.y * 2.4, tmpA);
            const keep = pp.region === "torso" ? 1 - bellyMask(ctx, p) * 0.6 : 1;
            out.lerp(tmpA, (pp.region === "ear" || pp.region === "tail" ? 0.85 : k) * keep);
            break;
        }
        case "fox":
        case "silver": {
            const dark = m0;
            if (pp.region === "torso") out.copy(fur).lerp(light, bellyMask(ctx, p, 0.05));
            if (pp.region === "leg") out.lerp(col(coat.paws ?? marks[0] ?? coat.fur), smoothstep(0.5, 0.75, t));
            if (pp.region === "arm") out.lerp(col(coat.paws ?? marks[0] ?? coat.fur), smoothstep(0.6, 0.85, t));
            if (pp.region === "ear" && pp.inner) out.lerp(col("#FFFFFF"), pp.inner * 0.85);
            if (coat.pattern === "silver" && pp.region !== "hand" && pp.region !== "foot") {
                const frost = fbm3(p.x * 40, p.y * 40, p.z * 40, 51);
                out.lerp(dark, smoothstep(0.55, 0.75, frost) * 0.45 * (pp.region === "torso" ? 1 - bellyMask(ctx, p) : 1));
            }
            break;
        }
        case "penguin":
        case "emperor": {
            if (pp.region === "torso") out.copy(fur).lerp(light, bellyMask(ctx, p, 0.4));
            if (pp.region === "leg") out.copy(fur).lerp(light, smoothstep(0.2, 0.9, Math.cos(Math.atan2(p.x - Math.sign(p.x) * shape.hipX, p.z))) * 0.9);
            if (pp.region === "head" || pp.region === "lid") {
                headLocal(ctx, p, q);
                // Belo lice: srce oko očiju i donji deo
                const lobes = ctx.eyes.reduce((m, e) => Math.max(m, 1 - smoothstep(ctx.eyeR * 1.7, ctx.eyeR * 2.2, Math.hypot(p.x - e.x, (p.y - e.y) * 0.9, (p.z - e.z) * 0.6))), 0);
                const lower = (1 - smoothstep(-0.05, 0.12, q.y + Math.abs(q.x) * 0.15)) * smoothstep(-0.05, 0.35, q.z);
                out.copy(fur).lerp(light, Math.max(lobes * smoothstep(0, 0.4, q.z), lower));
                if (coat.pattern === "emperor") {
                    const patch = Math.exp(-(((Math.abs(q.x) - 0.85) / 0.2) ** 2 + ((q.y + 0.2) / 0.35) ** 2));
                    out.lerp(col(marks[0] ?? "#FFC23A"), clamp01(patch * 1.4) * 0.95);
                }
            }
            if (coat.pattern === "emperor" && pp.region === "torso") {
                const glow = smoothstep(shape.shoulderY - 0.06, shape.neckBaseY, p.y) * bellyMask(ctx, p, 0.3);
                out.lerp(col(marks[1] ?? "#FFE9A6"), glow * 0.8);
            }
            break;
        }
        default:
            break;
    }

    // ── Senka u naborima ──
    const ao = clamp01(pp.ao ?? 0);
    if (ao > 0) {
        tmpB.copy(out).multiplyScalar(1 - ao * 0.5);
        // Senka je blago toplija (rasipanje kroz krzno)
        tmpB.lerp(tmpA.setRGB(out.r * 0.42, out.g * 0.36, out.b * 0.34), ao * 0.25);
        out.copy(tmpB);
    }
    return out;
}

/** Upisuje boje temena u geometriju; `at(i)` daje tačku i podatke za teme i */
export function paintGeometry(geometry: THREE.BufferGeometry, ctx: PaintContext, at: (i: number, p: THREE.Vector3) => PaintPoint): void {
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < position.count; i++) {
        p.fromBufferAttribute(position, i);
        coatColor(ctx, at(i, p), c);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/** Jedna boja za celu geometriju (deo koji nema šaru, a koristi materijal sa bojama temena) */
export function solidColor(geometry: THREE.BufferGeometry, hex: string, ao?: (p: THREE.Vector3) => number): void {
    const position = geometry.getAttribute("position");
    const colors = new Float32Array(position.count * 3);
    const base = col(hex);
    const p = new THREE.Vector3();
    for (let i = 0; i < position.count; i++) {
        const k = ao ? 1 - clamp01(ao(p.fromBufferAttribute(position, i))) * 0.5 : 1;
        colors[i * 3] = base.r * k;
        colors[i * 3 + 1] = base.g * k;
        colors[i * 3 + 2] = base.b * k;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}
