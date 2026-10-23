// Materijali i teksture životinja (keširani, dele ih svi likovi iste boje):
//  • krzno: boja iz temena (šare, senka u naborima) × mapa „vlasi” (svetliji vrhovi, tamniji
//    koren), mapa normala sa smerom dlake (niz telo), sheen po ivicama — mek, plišan utisak;
//  • oči: krupna dužica sa prelazom i zenicom, lakovana površina (clearcoat) i ispupčena rožnjača;
//  • nos (vlažan odsjaj), jastučići šapa, kljun, kopita, rog (sedef, prelivanje boja).

import * as THREE from "three";

const textures = new Map<string, THREE.Texture>();
const materials = new Map<string, THREE.Material>();

function cachedTexture<T extends THREE.Texture>(key: string, make: () => T): T {
    let t = textures.get(key) as T | undefined;
    if (!t) {
        t = make();
        textures.set(key, t);
    }
    return t;
}

function cached<T extends THREE.Material>(key: string, make: () => T): T {
    let m = materials.get(key) as T | undefined;
    if (!m) {
        m = make();
        materials.set(key, m);
    }
    return m;
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const el = document.createElement("canvas");
    el.width = w;
    el.height = h;
    const ctx = el.getContext("2d");
    if (!ctx) throw new Error("canvas 2d nije dostupan");
    return [el, ctx];
}

// ── Šum koji se ponavlja bez šava ─────────────────────────────────────────────

function hash(x: number, y: number, seed: number): number {
    let h = x * 374761393 + y * 668265263 + seed * 2246822519;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, y: number, px: number, py: number, seed: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const mx = (v: number) => ((v % px) + px) % px;
    const my = (v: number) => ((v % py) + py) % py;
    const a = hash(mx(xi), my(yi), seed);
    const b = hash(mx(xi + 1), my(yi), seed);
    const c = hash(mx(xi), my(yi + 1), seed);
    const d = hash(mx(xi + 1), my(yi + 1), seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * Polje „vlasi” h(x, y) ∈ [0, 1]: kratki izduženi pramenovi duž y (niz dlaku), okupljeni
 * u mekane čuperke; vrh pramena je svetao (visok), koren taman.
 */
let furField: Float32Array | null = null;
const FUR_SIZE = 256;

function furHeights(): Float32Array {
    if (furField) return furField;
    const n = FUR_SIZE;
    const field = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const x = i / n;
            const y = j / n;
            // Čuperci (krupno), pa vlasi (sitno, izduženo niz y)
            const clump = noise(x * 6, y * 4, 6, 4, 3) * 0.6 + noise(x * 12, y * 8, 12, 8, 5) * 0.4;
            const warp = (noise(x * 4, y * 4, 4, 4, 9) - 0.5) * 0.08;
            const strands = noise((x + warp) * 64, y * 10, 64, 10, 7) * 0.65 + noise((x + warp) * 128, y * 20, 128, 20, 11) * 0.35;
            // Pramen se sužava ka vrhu: zub testere duž y daje koren → vrh
            const phase = (y * 10 + noise(x * 32, 0, 32, 1, 13) * 3) % 1;
            const tip = Math.pow(phase, 1.6);
            field[j * n + i] = Math.min(1, Math.max(0, strands * 0.55 + clump * 0.25 + tip * 0.2));
        }
    }
    furField = field;
    return field;
}

/** Mapa normala krzna (smer dlake niz v) */
export function furNormal(): THREE.Texture {
    return cachedTexture("fur-normal", () => {
        const n = FUR_SIZE;
        const h = furHeights();
        const [el, ctx] = canvas(n, n);
        const image = ctx.createImageData(n, n);
        const at = (x: number, y: number) => h[((y + n) % n) * n + ((x + n) % n)];
        const strength = 2.6;
        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
                const dy = (at(x, y + 1) - at(x, y - 1)) * strength * 0.5;
                const len = Math.hypot(dx, dy, 1);
                const k = (y * n + x) * 4;
                image.data[k] = ((dx / len) * 0.5 + 0.5) * 255;
                image.data[k + 1] = ((dy / len) * 0.5 + 0.5) * 255;
                image.data[k + 2] = ((1 / len) * 0.5 + 0.5) * 255;
                image.data[k + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
        const t = new THREE.CanvasTexture(el);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.NoColorSpace;
        t.anisotropy = 4;
        return t;
    });
}

/** Svetlina vlasi (množi boju): koren tamniji, vrhovi svetliji */
export function furShade(): THREE.Texture {
    return cachedTexture("fur-shade", () => {
        const n = FUR_SIZE;
        const h = furHeights();
        const [el, ctx] = canvas(n, n);
        const image = ctx.createImageData(n, n);
        for (let k = 0; k < n * n; k++) {
            const v = Math.round((0.8 + 0.2 * h[k]) * 255);
            image.data[k * 4] = image.data[k * 4 + 1] = image.data[k * 4 + 2] = v;
            image.data[k * 4 + 3] = 255;
        }
        ctx.putImageData(image, 0, 0);
        const t = new THREE.CanvasTexture(el);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
    });
}

/** Koordinate teksture krzna su u metrima: jedno ponavljanje ≈ 5 cm */
export const FUR_TILE = 0.05;

export interface FurOptions {
    /** Svetlucanje (zlatna, zvezdana krzna) */
    shimmer?: boolean;
    /** Boja sheen-a (svetliji ton krzna) */
    sheen: string;
    /** Glatko krzno (pingvin: perje) */
    sleek?: boolean;
}

/** Krzno: boja dolazi iz temena (vertexColors), pa jedan materijal služi celom liku */
export function furMaterial(options: FurOptions): THREE.MeshPhysicalMaterial {
    const key = `fur-${options.sheen}-${options.shimmer ? 1 : 0}-${options.sleek ? 1 : 0}`;
    return cached(key, () => {
        const normalMap = furNormal();
        const map = furShade();
        const sheenColor = new THREE.Color(options.sheen).lerp(new THREE.Color("#FFFFFF"), 0.35);
        const m = new THREE.MeshPhysicalMaterial({
            color: "#FFFFFF",
            vertexColors: true,
            map,
            normalMap,
            normalScale: new THREE.Vector2(options.sleek ? 0.18 : 0.5, options.sleek ? 0.18 : 0.5),
            roughness: options.sleek ? 0.62 : 0.86,
            metalness: options.shimmer ? 0.18 : 0,
            sheen: options.sleek ? 0.4 : 1,
            sheenRoughness: 0.42,
            sheenColor,
            specularIntensity: options.sleek ? 0.45 : 0.22,
            clearcoat: options.sleek ? 0.25 : 0,
            clearcoatRoughness: 0.5,
            iridescence: options.shimmer ? 0.35 : 0,
            iridescenceIOR: 1.6,
        });
        return m;
    });
}

/** Meka koža bez krzna (jastučići šapa, unutrašnjost uha): satenasto, toplo */
export function padMaterial(hex: string): THREE.MeshPhysicalMaterial {
    return cached(`pad-${hex}`, () => new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness: 0.55,
        sheen: 0.5,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color(hex).lerp(new THREE.Color("#FFFFFF"), 0.4),
        specularIntensity: 0.35,
        vertexColors: false,
    }));
}

/** Vlažan nos: sjajan lak, malo mekši odsjaj */
export function noseMaterial(hex: string): THREE.MeshPhysicalMaterial {
    return cached(`nose-${hex}`, () => new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        specularIntensity: 0.8,
        sheen: 0.2,
        sheenColor: new THREE.Color(hex).lerp(new THREE.Color("#FFFFFF"), 0.5),
    }));
}

/** Kljun, kopita: glatko, blag lak */
export function hornyMaterial(hex: string, roughness = 0.42): THREE.MeshPhysicalMaterial {
    return cached(`horny-${hex}-${roughness}`, () => new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness,
        clearcoat: 0.7,
        clearcoatRoughness: 0.25,
        specularIntensity: 0.6,
    }));
}

/** Rog jednoroga: sedef sa prelivanjem boja */
export function pearlMaterial(hex: string): THREE.MeshPhysicalMaterial {
    return cached(`pearl-${hex}`, () => new THREE.MeshPhysicalMaterial({
        color: hex,
        roughness: 0.22,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        iridescence: 1,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [180, 520],
        sheen: 0.6,
        sheenColor: new THREE.Color("#FFFFFF"),
        sheenRoughness: 0.3,
        emissive: new THREE.Color(hex).multiplyScalar(0.06),
    }));
}

/** Tamna unutrašnjost usta, zubi i jezik (boje temena) */
export function mouthMaterial(): THREE.MeshPhysicalMaterial {
    return cached("mouth", () => new THREE.MeshPhysicalMaterial({
        color: "#FFFFFF",
        vertexColors: true,
        roughness: 0.45,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
        specularIntensity: 0.4,
    }));
}

/** Linija usta, trepavice, brkovi */
export function lineMaterial(hex: string): THREE.MeshStandardMaterial {
    return cached(`line-${hex}`, () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.7 }));
}

export function shineMaterial(): THREE.MeshBasicMaterial {
    return cached("shine", () => new THREE.MeshBasicMaterial({ color: "#FFFFFF", toneMapped: false }));
}

// ── Oči ────────────────────────────────────────────────────────────────────────

/**
 * Dužica na sferi (ekvidistantna projekcija kao SphereGeometry, zenica gleda u +z): krupna,
 * svetlija dole (kao da svetlo prolazi kroz rožnjaču), tamni obod, velika zenica.
 */
export function animalIris(light: string, dark: string, iris = 0.72, pupil = 0.36): THREE.Texture {
    return cachedTexture(`a-iris-${light}-${dark}-${iris}-${pupil}`, () => {
        const w = 512;
        const h = 256;
        const [el, ctx] = canvas(w, h);
        const image = ctx.createImageData(w, h);
        const cl = new THREE.Color(light);
        const cd = new THREE.Color(dark);
        const rim = cd.clone().multiplyScalar(0.5);
        const pupilC = new THREE.Color("#0B0709");
        const sclera = new THREE.Color("#FCFAF7");
        const tmp = new THREE.Color();
        for (let y = 0; y < h; y++) {
            const theta = ((y + 0.5) / h) * Math.PI;
            for (let x = 0; x < w; x++) {
                const phi = ((x + 0.5) / w) * Math.PI * 2;
                const dx = -Math.cos(phi) * Math.sin(theta);
                const dy = Math.cos(theta);
                const dz = Math.sin(phi) * Math.sin(theta);
                const angle = Math.acos(Math.max(-1, Math.min(1, dz)));
                const around = Math.atan2(dy, dx);
                if (angle < pupil) {
                    tmp.copy(pupilC);
                    // Blag odsjaj dna oka (dubina)
                    tmp.lerp(cd, 0.12 * (1 - angle / pupil) * Math.max(0, -dy));
                } else if (angle < iris) {
                    const t = (angle - pupil) / (iris - pupil);
                    // Svetlije dole, tamnije gore (senka kapka), vlakna dužice
                    const lower = Math.max(0, -dy);
                    const fibers = 0.5 + 0.5 * Math.sin(around * 42 + Math.sin(around * 9) * 2.4);
                    tmp.copy(cd).lerp(cl, Math.min(1, 0.5 + lower * 0.9) * (1 - Math.pow(t, 2.5) * 0.55));
                    tmp.multiplyScalar(0.9 + fibers * 0.16 * (1 - t));
                    if (t > 0.82) tmp.lerp(rim, (t - 0.82) / 0.18);
                    if (angle < pupil + 0.025) tmp.lerp(pupilC, 1 - (angle - pupil) / 0.025);
                } else {
                    const edge = Math.min(1, (angle - iris) / 0.04);
                    tmp.copy(rim).lerp(sclera, edge);
                    tmp.multiplyScalar(1 - Math.max(0, angle - iris - 0.25) * 0.12);
                }
                const k = (y * w + x) * 4;
                image.data[k] = tmp.r * 255;
                image.data[k + 1] = tmp.g * 255;
                image.data[k + 2] = tmp.b * 255;
                image.data[k + 3] = 255;
            }
        }
        ctx.putImageData(image, 0, 0);
        const t = new THREE.CanvasTexture(el);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
    });
}

export function eyeMaterial(light: string, dark: string, iris?: number, pupil?: number): THREE.MeshPhysicalMaterial {
    return cached(`a-eye-${light}-${dark}-${iris ?? ""}-${pupil ?? ""}`, () => new THREE.MeshPhysicalMaterial({
        map: animalIris(light, dark, iris, pupil),
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        specularIntensity: 0.7,
    }));
}
