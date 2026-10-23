// Zajedničke sitnice za sve predmete kataloga: materijali po vrsti tkanine (keširani),
// nalepnice (šare na grudima), kvalitet (sličice crtaju sa pola podela), postavljanje
// krutih delova na kost i težine kostiju za geometriju nacrtanu u prostoru tela.

import * as THREE from "three";
import type { BoneName, ItemContext } from "../../contract";
import { shade } from "../../contract";
import { fabricMaterial, furMaterial, gemMaterial, glossyMaterial, leatherMaterial, lensMaterial, metalMaterial, type FabricOptions } from "../../engine/materials";
import { armWeights, legWeights, torsoWeights, type Rig } from "../../engine/rig";
import type { BoneWeights } from "../../engine/surface";
import type { FabricKind } from "../../engine/textures";

export { THREE };
export { shade, mix } from "../../contract";

export type Side = 1 | -1;
export const SIDES: readonly Side[] = [1, -1];

export const gauss = (x: number, mu: number, s: number) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
export const TAU = Math.PI * 2;

/** Umnožak broja podela: 1 na liku, 0,5 u sličicama i na slabijem uređaju */
export function res(ctx: ItemContext): number {
    return ctx.quality === "low" ? 0.5 : 1;
}

/** Zaokružen broj podela (najmanje `min`) */
export const seg = (n: number, r: number, min = 3) => Math.max(min, Math.round(n * r));

// ── Materijali (svi iz keša motora) ─────────────────────────────────────────

/** Tkanina koja se vidi i iznutra (rubovi, porubi, unutrašnjost kragne) */
export function cloth(hex: string, kind: FabricKind = "cotton", options: FabricOptions = {}): THREE.MeshPhysicalMaterial {
    return fabricMaterial(hex, kind, { side: THREE.DoubleSide, ...options });
}

/** Tkanina samo spolja (porubi, manžetne, džepovi — zatvorena tela) */
export function fabric(hex: string, kind: FabricKind = "cotton", options: FabricOptions = {}): THREE.MeshPhysicalMaterial {
    return fabricMaterial(hex, kind, options);
}

/** Pliš (kostimi životinja, papuče, mede): mek sheen po ivicama */
export function plush(hex: string): THREE.MeshPhysicalMaterial {
    return furMaterial(hex, { sheenLift: 0.45, normalScale: 0.6 });
}

export const rubber = (hex: string, roughness = 0.6) => glossyMaterial(hex, roughness, 0.15);
export const plastic = (hex: string, roughness = 0.32) => glossyMaterial(hex, roughness, 0.6);
export const lacquer = (hex: string) => glossyMaterial(hex, 0.18, 1);
export const leather = (hex: string) => leatherMaterial(hex);
export const metal = (hex: string) => metalMaterial(hex);
export const gem = (hex: string) => gemMaterial(hex);
export const glass = (tint: string, opacity: number) => lensMaterial(tint, opacity);
export const gold = () => metalMaterial("#E3B754");
export const silver = () => metalMaterial("#C9CED6");

/** Tamnija nijansa (šav, senka nabora) */
export const darker = (hex: string, k = 0.18) => shade(hex, -k);
export const lighter = (hex: string, k = 0.2) => shade(hex, k);

const decals = new Map<string, THREE.Material>();

/**
 * Nalepnica (šara na grudima, broj na dresu): providna gde je mapa providna, malo „izdignuta”
 * iznad tkanine (polygonOffset) da ne treperi. Keš po teksturi.
 */
export function decal(map: THREE.Texture, options: { roughness?: number; metal?: number; side?: THREE.Side } = {}): THREE.Material {
    const key = `${map.uuid}-${options.roughness ?? ""}-${options.metal ?? ""}-${options.side ?? ""}`;
    let material = decals.get(key);
    if (!material) {
        material = new THREE.MeshPhysicalMaterial({
            map,
            transparent: true,
            roughness: options.roughness ?? 0.72,
            metalness: options.metal ?? 0,
            sheen: 0.35,
            sheenRoughness: 0.6,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            depthWrite: false,
            side: options.side ?? THREE.FrontSide,
        });
        decals.set(key, material);
    }
    return material;
}

// ── Kosti i položaj ─────────────────────────────────────────────────────────

export const handBone = (side: Side): BoneName => (side === 1 ? "handL" : "handR");
export const footBone = (side: Side): BoneName => (side === 1 ? "footL" : "footR");

/** Kruti deo nacrtan oko (0, 0, 0) postavlja se na tačku `at` (prostor tela) i prati kost */
export function attachAt(ctx: ItemContext, bone: BoneName, object: THREE.Object3D, at: THREE.Vector3): THREE.Object3D {
    object.position.copy(ctx.toBone(bone, at));
    return ctx.attach(bone, object);
}

/** Najbliža kost trupa za visinu y (dugmad, kopče) */
export function torsoBone(ctx: ItemContext, y: number): BoneName {
    const s = ctx.body.shape;
    if (y > s.neckBaseY + 0.005) return "neck";
    if (y > s.chestY - 0.05) return "chest";
    if (y > s.waistY - 0.04) return "spine";
    return "hips";
}

// ── Težine kostiju za geometriju nacrtanu u prostoru tela ───────────────────

function writeWeights(geometry: THREE.BufferGeometry, weights: (p: THREE.Vector3) => BoneWeights): THREE.BufferGeometry {
    const position = geometry.getAttribute("position");
    const skinIndex = new Uint16Array(position.count * 4);
    const skinWeight = new Float32Array(position.count * 4);
    const p = new THREE.Vector3();
    for (let k = 0; k < position.count; k++) {
        p.fromBufferAttribute(position, k);
        const sorted = weights(p).filter(([, w]) => w > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
        const total = sorted.reduce((sum, [, w]) => sum + w, 0) || 1;
        for (let q = 0; q < 4; q++) {
            skinIndex[k * 4 + q] = sorted[q]?.[0] ?? 0;
            skinWeight[k * 4 + q] = sorted[q] ? sorted[q][1] / total : 0;
        }
    }
    geometry.setAttribute("skinIndex", new THREE.BufferAttribute(skinIndex, 4));
    geometry.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeight, 4));
    return geometry;
}

/** Geometrija u prostoru tela → prati trup (dugme, šav, džep, mašna na leđima) */
export function weighTorso(rig: Rig, geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    return writeWeights(geometry, (p) => torsoWeights(rig.shape, p));
}

export function weighArm(rig: Rig, side: Side, geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    return writeWeights(geometry, (p) => armWeights(rig, side, p));
}

export function weighLeg(rig: Rig, side: Side, geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    return writeWeights(geometry, (p) => legWeights(rig, side, p));
}

/** Kruti deo bez rotacije (geometrija u prostoru tela) koji prati trup kao koža */
export function skinnedTorso(ctx: ItemContext, geometry: THREE.BufferGeometry, material: THREE.Material, name = "detalj"): THREE.SkinnedMesh {
    return ctx.kit.skinned(weighTorso(ctx.body.rig, geometry), material, name);
}

/** Geometrija u prostoru tela pomerena za `at` (Object3D → BufferGeometry bez grupe) */
export function placed(geometry: THREE.BufferGeometry, at: THREE.Vector3, rotation?: THREE.Euler | THREE.Quaternion, scale?: THREE.Vector3): THREE.BufferGeometry {
    const m = new THREE.Matrix4();
    const q = rotation instanceof THREE.Quaternion ? rotation : new THREE.Quaternion().setFromEuler(rotation ?? new THREE.Euler());
    m.compose(at, q, scale ?? new THREE.Vector3(1, 1, 1));
    return geometry.applyMatrix4(m);
}

/**
 * Koliko je debelo ono što lik nosi na trupu (od kože do spoljne površine), da se predmet
 * preko toga (tregeri, ranac, ogrlica) ne utisne u odeću. Procena po id-ju odeće.
 */
export function torsoLayer(ctx: ItemContext): number {
    const id = ctx.wear.outfit ?? "";
    if (!id) return 0.012;
    if (/jakna|kabanica|kaput|mantil|abaja|kostim-(astronauta|vatrogasca|mede|dinosaurusa|viteza|pilota|princa|doktora|kuvara)/.test(id)) return 0.042;
    if (/duks|dzemper|trenerka|pidzama|kostim|odelo|prsluk|haljina-princeze/.test(id)) return 0.028;
    return 0.021;
}
