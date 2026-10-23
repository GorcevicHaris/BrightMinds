// Materijali: koža (meka, blago „prosijava”), tkanine (sheen + mapa normala), kosa
// (anizotropni odsjaj), lakovano (đon, oči), metal (kruna). Keširaju se po parametrima.

import * as THREE from "three";
import { fabricNormal, type FabricKind } from "./textures";

const cache = new Map<string, THREE.Material>();
/** Materijali iz keša se dele među likovima — ne oslobađaju se pri skidanju predmeta */
const shared = new WeakSet<THREE.Material>();

function cached<T extends THREE.Material>(key: string, make: () => T): T {
    let material = cache.get(key) as T | undefined;
    if (!material) {
        material = make();
        cache.set(key, material);
        shared.add(material);
    }
    return material;
}

export function isSharedMaterial(material: THREE.Material): boolean {
    return shared.has(material);
}

/** Oslobađa geometrije (i materijale koji nisu iz keša) svega ispod objekta */
export function disposeObject(root: THREE.Object3D) {
    root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh && !(o as THREE.Points).isPoints && !(o as THREE.Line).isLine) return;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) if (material && !shared.has(material)) material.dispose();
        if ((mesh as unknown as THREE.InstancedMesh).isInstancedMesh) (mesh as unknown as THREE.InstancedMesh).dispose();
    });
}

/** Koža: mat, sa toplim sheen-om na ivicama (utisak meke, „dečje” kože) */
export function skinMaterial(hex: string, vertexColors = false): THREE.MeshPhysicalMaterial {
    return cached(`skin-${hex}-${vertexColors}`, () => {
        const color = new THREE.Color(hex);
        const warm = color.clone().lerp(new THREE.Color("#FF6A55"), 0.5);
        return new THREE.MeshPhysicalMaterial({
            color,
            roughness: 0.6,
            sheen: 0.7,
            sheenRoughness: 0.5,
            sheenColor: warm,
            // Topao „prosev” (lažni SSS): koža nije siva ni u senci
            emissive: warm.clone().multiplyScalar(0.1),
            specularIntensity: 0.35,
            normalMap: fabricNormal("skin"),
            normalScale: new THREE.Vector2(0.15, 0.15),
            vertexColors,
        });
    });
}

export interface FabricOptions {
    map?: THREE.Texture;
    roughness?: number;
    sheen?: number;
    normalScale?: number;
    side?: THREE.Side;
    /** Svetlija nit u sheen-u (plišano) */
    sheenLift?: number;
}

/** Tkanina: boja, mapa normala vrste tkanine i sheen (meki odsjaj vlakana na ivicama) */
export function fabricMaterial(hex: string, kind: FabricKind, options: FabricOptions = {}): THREE.MeshPhysicalMaterial {
    const key = `fabric-${hex}-${kind}-${options.map?.uuid ?? ""}-${options.roughness ?? ""}-${options.sheen ?? ""}-${options.normalScale ?? ""}-${options.side ?? ""}`;
    return cached(key, () => {
        const color = new THREE.Color(hex);
        const n = options.normalScale ?? (kind === "knit" ? 0.9 : kind === "denim" ? 0.55 : 0.4);
        return new THREE.MeshPhysicalMaterial({
            color: options.map ? new THREE.Color("#FFFFFF") : color,
            map: options.map ?? null,
            roughness: options.roughness ?? (kind === "satin" ? 0.45 : 0.82),
            sheen: options.sheen ?? (kind === "satin" ? 0.4 : 0.85),
            sheenRoughness: kind === "satin" ? 0.35 : 0.65,
            sheenColor: color.clone().lerp(new THREE.Color("#FFFFFF"), options.sheenLift ?? 0.35),
            specularIntensity: kind === "satin" ? 0.6 : 0.25,
            normalMap: fabricNormal(kind),
            normalScale: new THREE.Vector2(n, n),
            side: options.side ?? THREE.FrontSide,
        });
    });
}

/** Tkanina sa šarom u boji (pruge, kocke, teksas): boja materijala množi mapu */
export function patternedFabric(map: THREE.Texture, kind: FabricKind, tint = "#FFFFFF", options: FabricOptions = {}): THREE.MeshPhysicalMaterial {
    const key = `pattern-${map.uuid}-${kind}-${tint}-${options.side ?? ""}`;
    return cached(key, () => {
        const material = fabricMaterial(tint, kind, { ...options, map });
        const clone = material.clone();
        clone.color.set(tint);
        return clone;
    });
}

/** Kosa: anizotropni odsjaj duž vlasi (kao „prsten” svetla na kosi) i fini pramenovi */
export function hairMaterial(hex: string): THREE.MeshPhysicalMaterial {
    return cached(`hair-${hex}`, () => {
        const color = new THREE.Color(hex);
        return new THREE.MeshPhysicalMaterial({
            color,
            roughness: 0.66,
            metalness: 0,
            specularIntensity: 0.24,
            specularColor: color.clone().lerp(new THREE.Color("#FFFFFF"), 0.6),
            anisotropy: 0.22,
            anisotropyRotation: Math.PI / 2,
            sheen: 0.35,
            sheenColor: color.clone().lerp(new THREE.Color("#FFFFFF"), 0.3),
            sheenRoughness: 0.5,
            normalMap: fabricNormal("hair"),
            normalScale: new THREE.Vector2(0.14, 0.14),
        });
    });
}

/** Sjajna plastika/guma/lak (đon, dugmad, okvir naočara) */
export function glossyMaterial(hex: string, roughness = 0.35, clearcoat = 0.6): THREE.MeshPhysicalMaterial {
    return cached(`glossy-${hex}-${roughness}-${clearcoat}`, () => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hex),
        roughness,
        clearcoat,
        clearcoatRoughness: 0.25,
    }));
}

/** Koža za obuću (čizme): fina zrnasta površina i blag lak */
export function leatherMaterial(hex: string): THREE.MeshPhysicalMaterial {
    return cached(`leather-${hex}`, () => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hex),
        roughness: 0.5,
        clearcoat: 0.35,
        clearcoatRoughness: 0.4,
        normalMap: fabricNormal("leather"),
        normalScale: new THREE.Vector2(0.35, 0.35),
    }));
}

export function metalMaterial(hex: string): THREE.MeshPhysicalMaterial {
    return cached(`metal-${hex}`, () => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hex),
        metalness: 1,
        roughness: 0.28,
        clearcoat: 0.4,
    }));
}

/** Dragi kamen (kruna): providno-sjajan */
export function gemMaterial(hex: string): THREE.MeshPhysicalMaterial {
    return cached(`gem-${hex}`, () => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hex),
        roughness: 0.08,
        metalness: 0,
        clearcoat: 1,
        emissive: new THREE.Color(hex).multiplyScalar(0.12),
        specularIntensity: 1,
    }));
}

/** Staklo naočara: skoro providno, sa odsjajem */
export function lensMaterial(tint: string, opacity: number): THREE.MeshPhysicalMaterial {
    return cached(`lens-${tint}-${opacity}`, () => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(tint),
        roughness: 0.05,
        metalness: 0,
        transparent: true,
        opacity,
        clearcoat: 1,
        specularIntensity: 1,
        depthWrite: false,
    }));
}

/** Ravna boja bez svetla (unutrašnjost, senke) */
export function basicMaterial(hex: string, opacity = 1): THREE.MeshBasicMaterial {
    return cached(`basic-${hex}-${opacity}`, () => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
}

/** Krzno životinja (i plišane igračke): meki sheen po ivicama, mat */
export function furMaterial(hex: string, options: { sheenLift?: number; normalScale?: number } = {}): THREE.MeshPhysicalMaterial {
    return fabricMaterial(hex, "fleece", { sheen: 1, sheenLift: options.sheenLift ?? 0.5, roughness: 0.85, normalScale: options.normalScale ?? 0.35 });
}

/** Vrste materijala za opštu fabriku `material()` */
export type MaterialKind =
    | "cotton" | "knit" | "denim" | "rib" | "fleece" | "satin" | "felt" | "mesh"
    | "leather" | "rubber" | "plastic" | "metal" | "gem" | "glass" | "wood" | "fur" | "skin" | "hair" | "basic" | "glow";

export interface MaterialSpec {
    kind: MaterialKind;
    color: string;
    /** Šara/crtež (printTexture, stripes, plaid…): boja materijala je tada nijansa preko mape */
    map?: THREE.Texture;
    roughness?: number;
    side?: THREE.Side;
    /** Providnost (staklo) */
    opacity?: number;
}

/**
 * Jedna fabrika za sve predmete: isti spec → isti (keširani) materijal. Tkanine imaju
 * mapu normala i sheen, plastika i guma blagi lak, metal i dragulji odsjaj okruženja.
 */
export function material(spec: MaterialSpec): THREE.Material {
    const { kind, color, map, roughness, side } = spec;
    switch (kind) {
        case "cotton":
        case "knit":
        case "denim":
        case "rib":
        case "fleece":
        case "satin":
        case "felt":
        case "mesh":
            return map ? patternedFabric(map, kind, color, { side, roughness }) : fabricMaterial(color, kind, { roughness, side });
        case "leather":
            return leatherMaterial(color);
        case "rubber":
            return glossyMaterial(color, roughness ?? 0.6, 0.15);
        case "plastic":
            return glossyMaterial(color, roughness ?? 0.32, 0.6);
        case "metal":
            return metalMaterial(color);
        case "gem":
            return gemMaterial(color);
        case "glass":
            return lensMaterial(color, spec.opacity ?? 0.35);
        case "wood":
            return cached(`wood-${color}-${roughness ?? ""}`, () => new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: roughness ?? 0.7, normalMap: fabricNormal("felt"), normalScale: new THREE.Vector2(0.2, 0.2) }));
        case "fur":
            return furMaterial(color);
        case "skin":
            return skinMaterial(color);
        case "hair":
            return hairMaterial(color);
        case "basic":
            return basicMaterial(color, spec.opacity ?? 1);
        case "glow":
            return cached(`glow-${color}`, () => new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 0.9, roughness: 0.5 }));
    }
}
