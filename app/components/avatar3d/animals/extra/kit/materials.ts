// Materijali dodatnih životinja. Krzno je mat sa mekim sheen-om po ivicama (plišano, kao
// igračka), perje ima blag satenski sjaj, krljušti i koža slona su polumat, a žaba je glatka
// i malo vlažna (clearcoat). Svi se keširaju po ključu (boja/slika + vrsta), sa gornjom
// granicom — najstariji se oslobađaju.

import * as THREE from "three";
import { coatNormal, type CoatKind } from "./textures";

const LIMIT = 200;
const cache = new Map<string, THREE.Material>();

export function remembered<T extends THREE.Material>(key: string, make: () => T): T {
    const hit = cache.get(key) as T | undefined;
    if (hit) {
        cache.delete(key);
        cache.set(key, hit);
        return hit;
    }
    const material = make();
    cache.set(key, material);
    while (cache.size > LIMIT) {
        const [oldest, old] = cache.entries().next().value as [string, THREE.Material];
        cache.delete(oldest);
        old.dispose();
    }
    return material;
}

export interface CoatOptions {
    /** Naslikana boja dela (ili jedna boja kad nema slike) */
    map?: THREE.Texture;
    color?: string;
    /** Boja sjaja po ivicama (podrazumevano svetlija osnovna boja) */
    sheenColor?: string;
    /** Koliko puta šara površine stane duž u i v */
    repeat: [number, number];
    /** Jačina mape normala (umnožak) */
    relief?: number;
    side?: THREE.Side;
}

interface KindLook {
    roughness: number;
    sheen: number;
    sheenRoughness: number;
    normal: number;
    clearcoat: number;
    clearcoatRoughness: number;
    specular: number;
}

const LOOKS: Record<CoatKind, KindLook> = {
    plush: { roughness: 0.86, sheen: 1, sheenRoughness: 0.55, normal: 0.45, clearcoat: 0, clearcoatRoughness: 0.5, specular: 0.25 },
    short: { roughness: 0.78, sheen: 0.8, sheenRoughness: 0.5, normal: 0.35, clearcoat: 0, clearcoatRoughness: 0.5, specular: 0.3 },
    hair: { roughness: 0.5, sheen: 0.5, sheenRoughness: 0.45, normal: 0.35, clearcoat: 0, clearcoatRoughness: 0.5, specular: 0.5 },
    wool: { roughness: 0.95, sheen: 1, sheenRoughness: 0.75, normal: 0.9, clearcoat: 0, clearcoatRoughness: 0.5, specular: 0.15 },
    feather: { roughness: 0.62, sheen: 0.7, sheenRoughness: 0.35, normal: 0.5, clearcoat: 0, clearcoatRoughness: 0.5, specular: 0.4 },
    scales: { roughness: 0.55, sheen: 0.25, sheenRoughness: 0.4, normal: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.45, specular: 0.45 },
    wrinkle: { roughness: 0.72, sheen: 0.35, sheenRoughness: 0.5, normal: 0.5, clearcoat: 0, clearcoatRoughness: 0.5, specular: 0.3 },
    smooth: { roughness: 0.38, sheen: 0.2, sheenRoughness: 0.4, normal: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.25, specular: 0.55 },
};

/** Površina tela životinje (krzno, perje, krljušti…) */
export function coatMaterial(kind: CoatKind, options: CoatOptions): THREE.MeshPhysicalMaterial {
    const look = LOOKS[kind];
    const rx = Math.max(1, Math.round(options.repeat[0]));
    const ry = Math.max(1, Math.round(options.repeat[1]));
    const key = `coat-${kind}-${options.map?.uuid ?? options.color}-${options.sheenColor ?? ""}-${rx}x${ry}-${options.relief ?? 1}-${options.side ?? 0}`;
    return remembered(key, () => {
        const base = new THREE.Color(options.color ?? "#FFFFFF");
        const sheen = options.sheenColor ? new THREE.Color(options.sheenColor) : base.clone().lerp(new THREE.Color("#FFFFFF"), 0.45);
        const n = look.normal * (options.relief ?? 1);
        return new THREE.MeshPhysicalMaterial({
            color: options.map ? new THREE.Color("#FFFFFF") : base,
            map: options.map ?? null,
            roughness: look.roughness,
            sheen: look.sheen,
            sheenRoughness: look.sheenRoughness,
            sheenColor: sheen,
            clearcoat: look.clearcoat,
            clearcoatRoughness: look.clearcoatRoughness,
            specularIntensity: look.specular,
            normalMap: coatNormal(kind, [rx, ry]),
            normalScale: new THREE.Vector2(n, n),
            side: options.side ?? THREE.FrontSide,
        });
    });
}

/** Sjajno: nos, kopita, kandže, kljun (lak), sa blagom mapom normala po želji */
export function glossMaterial(hex: string, roughness = 0.3, clearcoat = 0.8): THREE.MeshPhysicalMaterial {
    return remembered(`gloss-${hex}-${roughness}-${clearcoat}`, () => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(hex),
        roughness,
        clearcoat,
        clearcoatRoughness: 0.18,
        specularIntensity: 0.7,
    }));
}

/** Oko: sjajna rožnjača preko naslikane dužice */
export function eyeMaterial(map: THREE.Texture): THREE.MeshPhysicalMaterial {
    return remembered(`eye-${map.uuid}`, () => new THREE.MeshPhysicalMaterial({
        map,
        roughness: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        specularIntensity: 0.7,
    }));
}

/** Odsjaj u oku (bez senčenja, uvek čisto belo) */
export function shineMaterial(): THREE.MeshBasicMaterial {
    return remembered("shine", () => new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF"), toneMapped: false }));
}

/** Trepavice i tamne crte (mat) */
export function inkMaterial(hex: string): THREE.MeshStandardMaterial {
    return remembered(`ink-${hex}`, () => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.8 }));
}
