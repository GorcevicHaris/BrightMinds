// Ljubimci — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #2 (životinje).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/pet.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "pile", slot: "pet", label: "Pile", price: 18 },
    { id: "patkica", slot: "pet", label: "Patkica", price: 18 },
    { id: "ribica", slot: "pet", label: "Ribica u činiji", price: 20 },
    { id: "zabica", slot: "pet", label: "Žabica", price: 20 },
    { id: "pticica", slot: "pet", label: "Ptičica", price: 22 },
    { id: "kornjaca", slot: "pet", label: "Kornjača", price: 25 },
    { id: "jezic", slot: "pet", label: "Ježić", price: 26 },
    { id: "zecic", slot: "pet", label: "Zečić", price: 28 },
    { id: "mace", slot: "pet", label: "Mače", price: 30 },
    { id: "kuce", slot: "pet", label: "Kuče", price: 30 },
    { id: "pingvin", slot: "pet", label: "Pingvin", price: 32 },
    { id: "papagaj", slot: "pet", label: "Papagaj", price: 35 },
    { id: "poni", slot: "pet", label: "Poni", price: 60 },
];
