// Teksture dodatnih životinja, nacrtane u kodu (bez preuzimanja):
//  • „naslikano krzno” — boja svakog teksela se računa iz 3D tačke tela (šare, njuška,
//    rumenilo i senka u naborima su u istoj slici, pa nema šavova između delova);
//  • mape normala za vrste površine (plišano krzno, vuna, perje, krljušti, koža slona, glatka
//    koža žabe), periodične pa se ponavljaju bez šava;
//  • oči (velika dužica sa zenicom, kao kod crtanih životinja).
// Keš ima gornju granicu: najstarije teksture se oslobađaju (three.js ih sam ponovo pošalje
// na grafičku karticu ako ih neki lik i dalje koristi), pa razgledanje izgleda ne puni memoriju.

import * as THREE from "three";
import { clamp01, type RGB } from "./util";

const LIMIT = 120;
const cache = new Map<string, THREE.Texture>();

function remember<T extends THREE.Texture>(key: string, make: () => T): T {
    const hit = cache.get(key) as T | undefined;
    if (hit) {
        cache.delete(key);
        cache.set(key, hit);
        return hit;
    }
    const texture = make();
    cache.set(key, texture);
    while (cache.size > LIMIT) {
        const [oldest, old] = cache.entries().next().value as [string, THREE.Texture];
        cache.delete(oldest);
        old.dispose();
    }
    return texture;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const el = document.createElement("canvas");
    el.width = w;
    el.height = h;
    const ctx = el.getContext("2d");
    if (!ctx) throw new Error("canvas 2d nije dostupan");
    return [el, ctx];
}

/**
 * Naslikana boja površine: `color(u, v, out)` za koordinate teksture (u, v) ∈ [0, 1]
 * (v = 0 je dno slike, kao u three.js). Ključ mora da opiše sve od čega boja zavisi.
 */
export function paintedTexture(key: string, w: number, h: number, color: (u: number, v: number, out: RGB) => void): THREE.Texture {
    return remember(`paint-${key}-${w}x${h}`, () => {
        const [el, ctx] = canvas(w, h);
        const image = ctx.createImageData(w, h);
        const c: RGB = [0, 0, 0];
        for (let j = 0; j < h; j++) {
            const v = 1 - (j + 0.5) / h;
            for (let i = 0; i < w; i++) {
                c[0] = c[1] = c[2] = 0;
                color((i + 0.5) / w, v, c);
                const k = (j * w + i) * 4;
                image.data[k] = clamp01(c[0]) * 255;
                image.data[k + 1] = clamp01(c[1]) * 255;
                image.data[k + 2] = clamp01(c[2]) * 255;
                image.data[k + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
        const texture = new THREE.CanvasTexture(el);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 4;
        return texture;
    });
}

// ── Periodični šum u ravni (za mape normala) ─────────────────────────────────────

function hash2(x: number, y: number, seed: number): number {
    let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
}

function vnoise(x: number, y: number, period: number, seed: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const m = (v: number) => ((v % period) + period) % period;
    const a = hash2(m(xi), m(yi), seed);
    const b = hash2(m(xi + 1), m(yi), seed);
    const c = hash2(m(xi), m(yi + 1), seed);
    const d = hash2(m(xi + 1), m(yi + 1), seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function pfbm(x: number, y: number, period: number, octaves: number, seed: number): number {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    let p = period;
    for (let o = 0; o < octaves; o++) {
        sum += amp * vnoise(x * f, y * f, p, seed + o);
        amp *= 0.5;
        f *= 2;
        p *= 2;
    }
    return sum;
}

/** Periodične ćelije u ravni: [d1, d2] (vuna, krljušti) */
function pcells(x: number, y: number, period: number, seed: number): [number, number] {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let d1 = 9;
    let d2 = 9;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const cx = xi + dx;
            const cy = yi + dy;
            const mx = ((cx % period) + period) % period;
            const my = ((cy % period) + period) % period;
            const px = cx + 0.15 + hash2(mx, my, seed) * 0.7;
            const py = cy + 0.15 + hash2(mx, my, seed + 5) * 0.7;
            const d = Math.hypot(px - x, py - y);
            if (d < d1) {
                d2 = d1;
                d1 = d;
            } else if (d < d2) d2 = d;
        }
    }
    return [d1, d2];
}

/** Vrste površine životinja */
export type CoatKind = "plush" | "short" | "wool" | "feather" | "scales" | "wrinkle" | "smooth" | "hair";

function heightOf(kind: CoatKind): { size: number; strength: number; h: (x: number, y: number) => number } {
    switch (kind) {
        case "plush":
            // Meko krzno: kratki pramenovi niz dlaku (izduženi šum po v) + fini šum
            return {
                size: 256,
                strength: 2.4,
                h: (x, y) => pfbm(x * 24, y * 6, 24, 3, 3) * 0.55 + pfbm(x * 64, y * 16, 64, 2, 9) * 0.3 + pfbm(x * 8, y * 8, 8, 2, 21) * 0.15,
            };
        case "short":
            return { size: 256, strength: 1.6, h: (x, y) => pfbm(x * 48, y * 12, 48, 3, 5) * 0.7 + pfbm(x * 12, y * 12, 12, 2, 11) * 0.3 };
        case "hair":
            return { size: 256, strength: 1.8, h: (x, y) => 0.5 + 0.5 * Math.sin(x * Math.PI * 2 * 14 + pfbm(x * 4, y * 2, 4, 2, 29) * 5) * 0.6 + pfbm(x * 32, y * 4, 32, 3, 31) * 0.4 };
        case "wool": {
            // Kovrdže: okrugle grudvice sa udubljenjem između
            return {
                size: 256,
                strength: 3.2,
                h: (x, y) => {
                    const [d1] = pcells(x * 10, y * 10, 10, 41);
                    const curl = Math.sin(Math.atan2(y * 10 % 1 - 0.5, x * 10 % 1 - 0.5) * 3 + d1 * 14) * 0.08;
                    return Math.sqrt(Math.max(0, 1 - d1 * d1 * 2.4)) * 0.8 + curl + pfbm(x * 40, y * 40, 40, 2, 43) * 0.15;
                },
            };
        }
        case "feather": {
            // Perca u redovima kao crep: svako pero je luk koji se diže ka ivici
            return {
                size: 256,
                strength: 2.6,
                h: (x, y) => {
                    const rows = 12;
                    const cols = 10;
                    const ry = y * rows;
                    const row = Math.floor(ry);
                    const fx = (x * cols + (row % 2) * 0.5) % 1;
                    const fy = ry - row;
                    const arc = Math.sqrt(Math.max(0, 1 - ((fx - 0.5) * 2) ** 2));
                    const edge = clamp01(1 - Math.abs(fy - arc * 0.85) * 5);
                    const barbs = 0.5 + 0.5 * Math.sin((fx - 0.5) * Math.PI * 18);
                    return fy * 0.6 + edge * 0.25 + barbs * 0.08 + pfbm(x * 32, y * 32, 32, 2, 47) * 0.1;
                },
            };
        }
        case "scales": {
            // Sitne okrugle krljušti (dinosaurus): jastučići sa žljebom između
            return {
                size: 256,
                strength: 2.2,
                h: (x, y) => {
                    const [d1, d2] = pcells(x * 22, y * 22, 22, 53);
                    return clamp01((d2 - d1) * 2.2) * 0.75 + pfbm(x * 64, y * 64, 64, 2, 59) * 0.25;
                },
            };
        }
        case "wrinkle":
            // Koža slona: vodoravne bore i fini šum
            return {
                size: 256,
                strength: 1.8,
                h: (x, y) => 0.5 + 0.5 * Math.sin(y * Math.PI * 2 * 16 + pfbm(x * 6, y * 6, 6, 2, 61) * 6) * 0.45 + pfbm(x * 32, y * 32, 32, 3, 67) * 0.55,
            };
        case "smooth":
            return { size: 128, strength: 0.6, h: (x, y) => pfbm(x * 16, y * 16, 16, 3, 71) };
    }
}

/**
 * Mapa normala vrste površine, sa ponavljanjem `repeat` (koliko puta šara stane duž u i v
 * na tom delu tela). Iste slike se dele (isti izvor), menja se samo ponavljanje.
 */
export function coatNormal(kind: CoatKind, repeat: [number, number]): THREE.Texture {
    const base = remember(`normal-${kind}`, () => {
        const { size, strength, h } = heightOf(kind);
        const field = new Float32Array(size * size);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) field[y * size + x] = h(x / size, y / size);
        const [el, ctx] = canvas(size, size);
        const image = ctx.createImageData(size, size);
        const at = (x: number, y: number) => field[((y + size) % size) * size + ((x + size) % size)];
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
                const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
                const len = Math.hypot(dx, dy, 1);
                const k = (y * size + x) * 4;
                image.data[k] = ((dx / len) * 0.5 + 0.5) * 255;
                image.data[k + 1] = ((dy / len) * 0.5 + 0.5) * 255;
                image.data[k + 2] = ((1 / len) * 0.5 + 0.5) * 255;
                image.data[k + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
        const texture = new THREE.CanvasTexture(el);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.NoColorSpace;
        texture.anisotropy = 4;
        return texture;
    });
    const rx = Math.max(1, Math.round(repeat[0]));
    const ry = Math.max(1, Math.round(repeat[1]));
    return remember(`normal-${kind}-${rx}x${ry}`, () => {
        const texture = base.clone();
        texture.repeat.set(rx, ry);
        texture.needsUpdate = true;
        return texture;
    });
}

// ── Oko ───────────────────────────────────────────────────────────────────────

export interface EyeLook {
    /** Boja dužice */
    iris: string;
    /** Ugaoni poluprečnik dužice i zenice (rad, od napred) */
    irisSize?: number;
    pupilSize?: number;
    /** Zenica: okrugla ili vodoravna (žaba, ovca) */
    pupil?: "round" | "wide";
}

/** Oko na sferi (UV sfere iz three.js, napred = +z): belo, dužica sa prelazom, zenica */
export function eyeTexture(look: EyeLook): THREE.Texture {
    const irisSize = look.irisSize ?? 0.74;
    const pupilSize = look.pupilSize ?? 0.4;
    const pupil = look.pupil ?? "round";
    return remember(`eye-${look.iris}-${irisSize}-${pupilSize}-${pupil}`, () => {
        const w = 512;
        const h = 256;
        const [el, ctx] = canvas(w, h);
        const image = ctx.createImageData(w, h);
        const base = new THREE.Color(look.iris);
        const iris: RGB = [0, 0, 0];
        const s = { r: 0, g: 0, b: 0 };
        base.getRGB(s, THREE.SRGBColorSpace);
        const col: RGB = [s.r, s.g, s.b];
        const out: RGB = [0, 0, 0];
        for (let y = 0; y < h; y++) {
            const theta = ((y + 0.5) / h) * Math.PI;
            for (let x = 0; x < w; x++) {
                const phi = ((x + 0.5) / w) * Math.PI * 2;
                const dx = -Math.cos(phi) * Math.sin(theta);
                const dy = Math.cos(theta);
                const dz = Math.sin(phi) * Math.sin(theta);
                const angle = Math.acos(Math.max(-1, Math.min(1, dz)));
                const around = Math.atan2(dy, dx);
                // Zenica: krug ili vodoravni oval (izdužen po x)
                const pr = pupil === "wide" ? pupilSize * (1 / Math.sqrt((Math.cos(around) / 1.35) ** 2 + (Math.sin(around) / 0.62) ** 2)) : pupilSize;
                if (angle < irisSize) {
                    const t = angle / irisSize;
                    // Dužica: svetlija dole (svetlo pada kroz rožnjaču), tamniji rub, fina vlakna
                    const fibers = 0.5 + 0.5 * Math.sin(around * 44 + Math.sin(around * 9) * 2.4);
                    const lift = clamp01(-dy * 1.4 + 0.15) * 0.45;
                    iris[0] = col[0] + (1 - col[0]) * lift * 0.5;
                    iris[1] = col[1] + (1 - col[1]) * lift * 0.5;
                    iris[2] = col[2] + (1 - col[2]) * lift * 0.5;
                    const rim = Math.pow(t, 4) * 0.7;
                    const top = dy > 0 ? dy * 0.45 : 0;
                    const k = (1 - rim) * (1 - top) * (0.9 + fibers * 0.16 * (1 - t));
                    out[0] = iris[0] * k;
                    out[1] = iris[1] * k;
                    out[2] = iris[2] * k;
                    // Zenica sa mekom ivicom
                    const pe = clamp01((angle - pr) / 0.035);
                    const dark: RGB = [0.035, 0.025, 0.03];
                    out[0] = dark[0] + (out[0] - dark[0]) * pe;
                    out[1] = dark[1] + (out[1] - dark[1]) * pe;
                    out[2] = dark[2] + (out[2] - dark[2]) * pe;
                    // Tamni prsten oko dužice
                    const ring = clamp01((angle - irisSize + 0.05) / 0.05);
                    out[0] *= 1 - ring * 0.6;
                    out[1] *= 1 - ring * 0.6;
                    out[2] *= 1 - ring * 0.6;
                } else {
                    // Belo oka: toplo belo, sivlje ka uglovima
                    const g = 0.985 - Math.max(0, angle - irisSize - 0.25) * 0.09;
                    out[0] = g;
                    out[1] = g * 0.985;
                    out[2] = g * 0.965;
                }
                const k = (y * w + x) * 4;
                image.data[k] = clamp01(out[0]) * 255;
                image.data[k + 1] = clamp01(out[1]) * 255;
                image.data[k + 2] = clamp01(out[2]) * 255;
                image.data[k + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
        const texture = new THREE.CanvasTexture(el);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        return texture;
    });
}
