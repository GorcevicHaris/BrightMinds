// Male pomoćne funkcije za dodatne životinje: boje u sRGB prostoru (brojevi 0–1, bez
// THREE.Color i njegovog prevođenja u linearni prostor), 3D šum i ćelije (za šare na krznu:
// pruge, pege, mrlje), glatki maksimum i Gausova zvona. Bez three.js — lako za testiranje.

/** Boja u sRGB prostoru, kanali 0–1 */
export type RGB = [number, number, number];

export function rgb(hex: string): RGB {
    const n = parseInt(hex.replace("#", ""), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function hexOf(c: RGB): string {
    const h = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
    return `#${h(c[0])}${h(c[1])}${h(c[2])}`.toUpperCase();
}

/** out = a + (b − a)·t (u mestu, vraća out) */
export function mixInto(out: RGB, a: RGB, b: RGB, t: number): RGB {
    out[0] = a[0] + (b[0] - a[0]) * t;
    out[1] = a[1] + (b[1] - a[1]) * t;
    out[2] = a[2] + (b[2] - a[2]) * t;
    return out;
}

/** Preliva boju `b` preko `out` sa udelom t */
export function over(out: RGB, b: RGB, t: number): RGB {
    if (t <= 0) return out;
    const k = Math.min(1, t);
    out[0] += (b[0] - out[0]) * k;
    out[1] += (b[1] - out[1]) * k;
    out[2] += (b[2] - out[2]) * k;
    return out;
}

export function scaleInto(out: RGB, k: number): RGB {
    out[0] *= k;
    out[1] *= k;
    out[2] *= k;
    return out;
}

export function copyInto(out: RGB, a: RGB): RGB {
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    return out;
}

/** Svetlije (k > 0) ili tamnije (k < 0) */
export function lighten(c: RGB, k: number): RGB {
    return k >= 0 ? [c[0] + (1 - c[0]) * k, c[1] + (1 - c[1]) * k, c[2] + (1 - c[2]) * k] : [c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)];
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (a: number, b: number, x: number) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
};
export const gauss = (x: number, s: number) => Math.exp(-(x * x) / (2 * s * s));

/** Glatki maksimum (polinomski): [vrednost, udeo drugog] */
export function smax(a: number, b: number, k: number): [number, number] {
    if (k <= 0) return a > b ? [a, 0] : [b, 1];
    const h = clamp01(0.5 + (0.5 * (b - a)) / k);
    return [a + (b - a) * h + k * h * (1 - h), h];
}

// ── 3D šum ────────────────────────────────────────────────────────────────────

function hash3(x: number, y: number, z: number, seed: number): number {
    let h = (x * 374761393 + y * 668265263 + z * 1440662683 + seed * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
}

/** Glatki šum vrednosti u prostoru, ≈ [0, 1] */
export function noise3(x: number, y: number, z: number, seed = 1): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const fx = x - xi;
    const fy = y - yi;
    const fz = z - zi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const sz = fz * fz * (3 - 2 * fz);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, seed);
    return l(
        l(l(c(0, 0, 0), c(1, 0, 0), sx), l(c(0, 1, 0), c(1, 1, 0), sx), sy),
        l(l(c(0, 0, 1), c(1, 0, 1), sx), l(c(0, 1, 1), c(1, 1, 1), sx), sy),
        sz,
    );
}

export function fbm3(x: number, y: number, z: number, octaves = 3, seed = 1): number {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
        sum += amp * noise3(x * f, y * f, z * f, seed + o * 17);
        norm += amp;
        amp *= 0.5;
        f *= 2.03;
    }
    return sum / norm;
}

/**
 * Ćelije (Voronoj) u prostoru: [udaljenost do najbliže tačke, do druge najbliže, id ćelije].
 * Razlika d2 − d1 je mala na granici ćelija (linije između mrlja žirafe).
 */
export function cells3(x: number, y: number, z: number, seed = 1, jitter = 0.85): [number, number, number] {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    let d1 = 9;
    let d2 = 9;
    let id = 0;
    for (let dz = -1; dz <= 1; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const cx = xi + dx;
                const cy = yi + dy;
                const cz = zi + dz;
                const px = cx + 0.5 + (hash3(cx, cy, cz, seed) - 0.5) * jitter;
                const py = cy + 0.5 + (hash3(cx, cy, cz, seed + 7) - 0.5) * jitter;
                const pz = cz + 0.5 + (hash3(cx, cy, cz, seed + 13) - 0.5) * jitter;
                const d = Math.hypot(px - x, py - y, pz - z);
                if (d < d1) {
                    d2 = d1;
                    d1 = d;
                    id = hash3(cx, cy, cz, seed + 29);
                } else if (d < d2) {
                    d2 = d;
                }
            }
        }
    }
    return [d1, d2, id];
}

/** Determinističan „slučajan” broj iz celog broja (raspored bodlji, pega) */
export function rand(i: number, seed = 1): number {
    return hash3(i, i * 7 + 3, i * 13 + 5, seed);
}
