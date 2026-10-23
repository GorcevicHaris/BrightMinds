// Teksture nacrtane u kodu (bez preuzimanja): mape normala za tkanine (pamuk, pletivo,
// teksas, rebrasto, flis, kosa), šare (pruge, kocke), dužica oka i usta. Sve se pravi
// jednom i čuva u kešu; ponavljaju se bez šava (periodični šum).

import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function cached<T extends THREE.Texture>(key: string, make: () => T): T {
    let texture = cache.get(key) as T | undefined;
    if (!texture) {
        texture = make();
        cache.set(key, texture);
    }
    return texture;
}

const smoothstep01 = (x: number) => {
    const t = Math.min(1, Math.max(0, x));
    return t * t * (3 - 2 * t);
};

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const el = document.createElement("canvas");
    el.width = w;
    el.height = h;
    const ctx = el.getContext("2d");
    if (!ctx) throw new Error("canvas 2d nije dostupan");
    return [el, ctx];
}

// ── Periodični šum ─────────────────────────────────────────────────────────────

function hash(x: number, y: number, seed: number): number {
    let h = x * 374761393 + y * 668265263 + seed * 2246822519;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Glatki šum koji se ponavlja na `period` ćelija */
function valueNoise(x: number, y: number, period: number, seed = 1): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const m = (v: number) => ((v % period) + period) % period;
    const a = hash(m(xi), m(yi), seed);
    const b = hash(m(xi + 1), m(yi), seed);
    const c = hash(m(xi), m(yi + 1), seed);
    const d = hash(m(xi + 1), m(yi + 1), seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, period: number, octaves = 3, seed = 1): number {
    let sum = 0;
    let amp = 0.5;
    let p = period;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
        sum += amp * valueNoise(x * f, y * f, p, seed + o);
        amp *= 0.5;
        f *= 2;
        p *= 2;
    }
    return sum;
}

/** Mapa normala iz visina h(x, y) ∈ [0, 1] (x, y ∈ [0, 1), periodično) */
function normalMap(key: string, size: number, height: (x: number, y: number) => number, strength: number, repeat: [number, number] = [1, 1]): THREE.Texture {
    return cached(key, () => {
        const w = size;
        const h = size;
        const field = new Float32Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) field[y * w + x] = height(x / w, y / h);
        const [el, ctx] = canvas(w, h);
        const image = ctx.createImageData(w, h);
        const at = (x: number, y: number) => field[((y + h) % h) * w + ((x + w) % w)];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
                const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
                const len = Math.hypot(dx, dy, 1);
                const k = (y * w + x) * 4;
                image.data[k] = ((dx / len) * 0.5 + 0.5) * 255;
                image.data[k + 1] = ((dy / len) * 0.5 + 0.5) * 255;
                image.data[k + 2] = ((1 / len) * 0.5 + 0.5) * 255;
                image.data[k + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
        const texture = new THREE.CanvasTexture(el);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(...repeat);
        texture.anisotropy = 4;
        texture.colorSpace = THREE.NoColorSpace;
        return texture;
    });
}

export type FabricKind = "cotton" | "knit" | "denim" | "rib" | "fleece" | "leather" | "satin" | "hair" | "skin" | "felt" | "mesh";

/**
 * Mapa normala tkanine. UV koordinate odeće su u metrima, pa `repeat` određuje veličinu
 * šare: pamuk ≈ 4 mm, pletivo ≈ 8 mm po petlji, teksas ≈ 3 mm kosa linija.
 */
export function fabricNormal(kind: FabricKind): THREE.Texture {
    switch (kind) {
        case "cotton":
            return normalMap("n-cotton", 256, (x, y) => {
                const weave = Math.sin(x * Math.PI * 2 * 32) * Math.sin(y * Math.PI * 2 * 32) * 0.25;
                return weave + fbm(x * 16, y * 16, 16, 3, 3) * 0.75;
            }, 2.2, [60, 60]);
        case "knit":
            return normalMap("n-knit", 256, (x, y) => {
                // Redovi slova V: svaka petlja je par kosih „zrna”
                const cols = 8;
                const rows = 10;
                const cx = (x * cols) % 1;
                const cy = (y * rows) % 1;
                const side = cx < 0.5 ? cx * 2 : (1 - cx) * 2;
                const v = Math.abs(cy - side * 0.55 - 0.2);
                const loop = Math.max(0, 1 - v * 3.2) * Math.sin(Math.min(1, side) * Math.PI);
                return loop * 0.85 + fbm(x * 32, y * 32, 32, 2, 7) * 0.15;
            }, 5, [14, 14]);
        case "rib":
            return normalMap("n-rib", 128, (x, y) => 0.5 + 0.5 * Math.sin(x * Math.PI * 2 * 8) + fbm(x * 16, y * 16, 16, 2, 4) * 0.2, 3.5, [40, 20]);
        case "denim":
            return normalMap("n-denim", 256, (x, y) => {
                const twill = 0.5 + 0.5 * Math.sin((x * 24 + y * 24) * Math.PI * 2);
                return twill * 0.55 + fbm(x * 8, y * 64, 8, 3, 11) * 0.45;
            }, 2.6, [50, 50]);
        case "fleece":
            return normalMap("n-fleece", 256, (x, y) => fbm(x * 24, y * 24, 24, 4, 13), 3, [24, 24]);
        case "felt":
            return normalMap("n-felt", 256, (x, y) => fbm(x * 48, y * 48, 48, 3, 17), 2.5, [12, 12]);
        case "leather":
            return normalMap("n-leather", 256, (x, y) => {
                const n = fbm(x * 12, y * 12, 12, 4, 19);
                return Math.pow(Math.abs(n - 0.5) * 2, 0.6);
            }, 1.4, [20, 20]);
        case "satin":
            return normalMap("n-satin", 128, (x, y) => fbm(x * 4, y * 16, 4, 2, 23) * 0.6 + 0.2 * Math.sin(x * Math.PI * 2 * 48), 1.2, [30, 30]);
        case "mesh":
            return normalMap("n-mesh", 128, (x, y) => {
                const gx = Math.abs(Math.sin(x * Math.PI * 12));
                const gy = Math.abs(Math.sin((y + (Math.floor(x * 12) % 2) * 0.04) * Math.PI * 12));
                return Math.min(gx, gy) > 0.85 ? 0 : 0.8;
            }, 1.6, [40, 40]);
        case "hair":
            return normalMap("n-hair", 256, (x, y) => {
                // Pramenovi: talasi po x, izduženi šum po y (duž vlasi)
                const strands = 0.5 + 0.5 * Math.sin(x * Math.PI * 2 * 12 + fbm(x * 4, y * 2, 4, 2, 29) * 5);
                return strands * 0.65 + fbm(x * 32, y * 4, 32, 3, 31) * 0.35;
            }, 1.6, [1, 1]);
        case "skin":
            return normalMap("n-skin", 256, (x, y) => fbm(x * 32, y * 32, 32, 3, 37), 0.35, [12, 12]);
    }
}

// ── Šare u boji ───────────────────────────────────────────────────────────────

function colorTexture(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]): THREE.Texture {
    return cached(key, () => {
        const [el, ctx] = canvas(w, h);
        draw(ctx);
        const texture = new THREE.CanvasTexture(el);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(...repeat);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        return texture;
    });
}

/** Vodoravne pruge (osnova i pruga), ponavljanje na ≈ 4 cm */
export function stripes(base: string, stripe: string): THREE.Texture {
    return colorTexture(`stripes-${base}-${stripe}`, 64, 64, (ctx) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = stripe;
        ctx.fillRect(0, 8, 64, 20);
    }, [25, 25]);
}

/** Karirano (košulja na kocke), ponavljanje ≈ 5 cm */
export function plaid(base: string, line: string): THREE.Texture {
    return colorTexture(`plaid-${base}-${line}`, 128, 128, (ctx) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 128, 128);
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = line;
        ctx.fillRect(0, 40, 128, 36);
        ctx.fillRect(40, 0, 36, 128);
        ctx.globalAlpha = 0.25;
        ctx.fillRect(0, 100, 128, 8);
        ctx.fillRect(100, 0, 8, 128);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 12, 128, 4);
        ctx.fillRect(12, 0, 4, 128);
        ctx.globalAlpha = 1;
    }, [20, 20]);
}

/** Teksas: nijanse niti i svetlije kose linije (boja se množi bojom materijala) */
export function denimColor(): THREE.Texture {
    return colorTexture("denim-color", 256, 256, (ctx) => {
        const image = ctx.createImageData(256, 256);
        for (let y = 0; y < 256; y++) {
            for (let x = 0; x < 256; x++) {
                const u = x / 256;
                const v = y / 256;
                const twill = 0.5 + 0.5 * Math.sin((u * 24 + v * 24) * Math.PI * 2);
                const slub = fbm(u * 4, v * 48, 4, 3, 41);
                const k = 0.8 + twill * 0.12 + (slub - 0.5) * 0.3;
                const i = (y * 256 + x) * 4;
                image.data[i] = image.data[i + 1] = image.data[i + 2] = Math.min(255, k * 255);
                image.data[i + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
    }, [50, 50]);
}

/** Dužica oka na sferi (ekvidistantna projekcija kao SphereGeometry): zenica gleda u +z */
export function irisTexture(color: string): THREE.Texture {
    return cached(`iris-${color}`, () => {
        const w = 512;
        const h = 256;
        const [el, ctx] = canvas(w, h);
        const image = ctx.createImageData(w, h);
        const base = new THREE.Color(color);
        const dark = base.clone().multiplyScalar(0.5);
        const light = base.clone().lerp(new THREE.Color("#FFFFFF"), 0.45);
        const sclera = new THREE.Color("#F2EDE7");
        const tmp = new THREE.Color();
        const IRIS = 0.66;
        const PUPIL = 0.19;
        for (let y = 0; y < h; y++) {
            const theta = ((y + 0.5) / h) * Math.PI;
            for (let x = 0; x < w; x++) {
                const phi = ((x + 0.5) / w) * Math.PI * 2;
                const dx = -Math.cos(phi) * Math.sin(theta);
                const dy = Math.cos(theta);
                const dz = Math.sin(phi) * Math.sin(theta);
                const angle = Math.acos(Math.max(-1, Math.min(1, dz)));
                const around = Math.atan2(dy, dx);
                if (angle < PUPIL) {
                    tmp.set("#0E0A0C");
                } else if (angle < IRIS) {
                    const t = (angle - PUPIL) / (IRIS - PUPIL);
                    const fibers = 0.5 + 0.5 * Math.sin(around * 38 + Math.sin(around * 7) * 2);
                    tmp.copy(light).lerp(base, Math.min(1, t * 1.5)).lerp(dark, Math.pow(t, 4) * 0.6);
                    // Tamni limbalni prsten na ivici dužice
                    tmp.lerp(dark.clone().multiplyScalar(0.55), smoothstep01((t - 0.82) / 0.18) * 0.85);
                    tmp.multiplyScalar(0.88 + fibers * 0.2 * (1 - t));
                    // Tamniji gornji deo dužice (senka kapka) — oko deluje dublje
                    if (dy > 0) tmp.multiplyScalar(1 - dy * 0.3);
                    // Mekan prelaz ka zenici
                    if (angle < PUPIL + 0.03) tmp.lerp(new THREE.Color("#0E0A0C"), 1 - (angle - PUPIL) / 0.03);
                } else {
                    const edge = Math.min(1, (angle - IRIS) / 0.05);
                    tmp.copy(dark).lerp(sclera, edge);
                    // Belo oka blago sivi ka uglovima, a pod gornjim kapkom je meka senka
                    tmp.multiplyScalar(1 - Math.max(0, angle - 1.0) * 0.1);
                    if (dy > 0.25) tmp.multiplyScalar(1 - (dy - 0.25) * 0.28);
                }
                const k = (y * w + x) * 4;
                image.data[k] = tmp.r * 255;
                image.data[k + 1] = tmp.g * 255;
                image.data[k + 2] = tmp.b * 255;
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

/** Usta kao nalepnica na licu: `happy` otvoren osmeh (zubi, jezik), `neutral` blag zatvoren osmeh */
export function mouthTexture(kind: "happy" | "neutral", lip: string): THREE.Texture {
    return cached(`mouth-${kind}-${lip}`, () => {
        const w = 256;
        const h = 128;
        const [el, ctx] = canvas(w, h);
        ctx.clearRect(0, 0, w, h);
        if (kind === "happy") {
            const top = (x: number) => 34 + Math.pow((x - 128) / 92, 2) * -6 + 6;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(36, top(36));
            ctx.bezierCurveTo(70, 30, 186, 30, 220, top(220));
            ctx.bezierCurveTo(206, 92, 170, 118, 128, 118);
            ctx.bezierCurveTo(86, 118, 50, 92, 36, top(36));
            ctx.closePath();
            ctx.fillStyle = "#4A1820";
            ctx.fill();
            ctx.clip();
            // Jezik
            ctx.fillStyle = "#E86A78";
            ctx.beginPath();
            ctx.ellipse(128, 124, 62, 34, 0, 0, Math.PI * 2);
            ctx.fill();
            // Gornji zubi
            ctx.fillStyle = "#FFFDF8";
            ctx.beginPath();
            ctx.moveTo(50, 20);
            ctx.lineTo(206, 20);
            ctx.bezierCurveTo(200, 58, 56, 58, 50, 20);
            ctx.fill();
            // Senka u dnu usta
            const g = ctx.createRadialGradient(128, 70, 10, 128, 70, 110);
            g.addColorStop(0, "rgba(0,0,0,0)");
            g.addColorStop(1, "rgba(30,0,8,0.35)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
            // Usna (mekan obod)
            ctx.strokeStyle = lip;
            ctx.lineWidth = 5;
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(36, top(36));
            ctx.bezierCurveTo(70, 30, 186, 30, 220, top(220));
            ctx.bezierCurveTo(206, 92, 170, 118, 128, 118);
            ctx.bezierCurveTo(86, 118, 50, 92, 36, top(36));
            ctx.closePath();
            ctx.stroke();
        } else {
            ctx.strokeStyle = lip;
            ctx.lineCap = "round";
            ctx.lineWidth = 11;
            ctx.beginPath();
            ctx.moveTo(62, 46);
            ctx.bezierCurveTo(92, 82, 164, 82, 194, 46);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255,0.18)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(100, 84);
            ctx.bezierCurveTo(116, 90, 140, 90, 156, 84);
            ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(el);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        return texture;
    });
}

/** Natpis ili broj na tkanini (dres, majica): bela pozadina je providna */
export function printTexture(key: string, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 256, h = 256): THREE.Texture {
    return cached(`print-${key}`, () => {
        const [el, ctx] = canvas(w, h);
        ctx.clearRect(0, 0, w, h);
        draw(ctx, w, h);
        const texture = new THREE.CanvasTexture(el);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 4;
        return texture;
    });
}

/** Meka okrugla senka (ispod stopala, ispod lika) */
export function blobTexture(): THREE.Texture {
    return cached("blob", () => {
        const [el, ctx] = canvas(128, 128);
        const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(0.5, "rgba(0,0,0,0.5)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        const texture = new THREE.CanvasTexture(el);
        return texture;
    });
}

/** Studijski pod: svetao krug koji se meko gubi u pozadinu */
export function floorTexture(): THREE.Texture {
    return cached("floor", () => {
        const [el, ctx] = canvas(256, 256);
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.55, "rgba(255,255,255,0.75)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
        const texture = new THREE.CanvasTexture(el);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    });
}
