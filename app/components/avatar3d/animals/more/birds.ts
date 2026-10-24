// Zajedničko za ptice (patka, kokica, papagaj, flamingo): kljun umesto usta (otvara se pri
// govoru), krila umesto šaka (šaka vrste „flipper” — predmet u ruci se drži u krilu), stopala
// sa prstima ili plivaćom kožicom (kalup obuće ostaje, pa patike pristaju), sidra nosa na kljunu.

import * as THREE from "three";
import type { Anchors } from "../../contract";
import type { AnimalBuild, AnimalSpec } from "../figure";
import { toeFoot, wingHand } from "../extra/hands";
import { buildBeak, type BeakSpec } from "./common";

/** Dužina kljuna po liku (za sidro nosa) */
const BEAK_LEN = new WeakMap<AnimalBuild, number>();

/** Kljun na mesto usta; vraća dužinu kljuna (m) za sidro nosa */
export function addBeak(b: AnimalBuild, spec: BeakSpec): number {
    const beak = buildBeak(b, spec);
    b.face = { mouth: beak.group, setJaw: beak.setJaw };
    BEAK_LEN.set(b, beak.tipZ);
    return beak.tipZ;
}

/** Sidra: nos je vrh kljuna (naočare sede na korenu kljuna) */
export function beakAnchors(a: Anchors, b: AnimalBuild): void {
    const len = BEAK_LEN.get(b) ?? 0.04;
    const head = b.head;
    const v = head.spec.noseV;
    const at = head.point(0.5, v).add(b.boneAt("head"));
    a.nose.tip.copy(at).add(new THREE.Vector3(0, 0, len * 0.9));
    a.nose.snout = len;
}

/** Ptičji delovi spec-a: krila, stopala, bez ušiju */
export function birdParts(feet: "webbed" | "toes"): Pick<AnimalSpec, "hands" | "feet" | "customHand" | "customFoot" | "sleek"> {
    return {
        hands: "flipper",
        feet: feet === "webbed" ? "webbed" : "paw",
        sleek: true,
        customHand: (b, side) => wingHand(b, side),
        customFoot: (b, side) => feet === "webbed"
            ? toeFoot(b, side, { toes: 3, color: b.coat.hoof ?? "#F29A2E", thick: 0.16, webbed: true })
            : toeFoot(b, side, { toes: 3, color: b.coat.hoof ?? "#F2B33A", claws: "#5A4A44", thick: 0.15, back: true }),
    };
}
