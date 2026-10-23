// Pozadine — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/background.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "soba", slot: "background", label: "Soba", price: 25 },
    { id: "park", slot: "background", label: "Park", price: 30 },
    { id: "livada", slot: "background", label: "Livada sa cvećem", price: 30 },
    { id: "grad", slot: "background", label: "Grad", price: 35 },
    { id: "suma", slot: "background", label: "Šuma", price: 35 },
    { id: "plaza", slot: "background", label: "Plaža", price: 40 },
    { id: "zimski-dan", slot: "background", label: "Zimski dan", price: 40 },
    { id: "duga", slot: "background", label: "Duga", price: 45 },
    { id: "farma", slot: "background", label: "Farma", price: 45 },
    { id: "podvodni-svet", slot: "background", label: "Podvodni svet", price: 50 },
    { id: "vasar", slot: "background", label: "Vašar", price: 55 },
    { id: "svemir", slot: "background", label: "Svemir", price: 75 },
    { id: "zamak", slot: "background", label: "Zamak", price: 80 },
];
