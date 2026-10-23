// Oko vrata — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/neck.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "leptir-masna", slot: "neck", label: "Leptir-mašna", price: 3, group: "masne" },
    { id: "kravata", slot: "neck", label: "Kravata", price: 4, group: "masne" },
    { id: "crvena-kravata", slot: "neck", label: "Crvena kravata", price: 4, group: "masne" },
    { id: "ogrlica-skoljke", slot: "neck", label: "Ogrlica od školjki", price: 6, group: "ogrlice" },
    { id: "pistaljka", slot: "neck", label: "Pištaljka", price: 6, group: "ogrlice" },
    { id: "marama", slot: "neck", label: "Marama", price: 4, group: "marame" },
    { id: "sal", slot: "neck", label: "Šal", price: 5, group: "marame" },
    { id: "leptir-masna-tufne", slot: "neck", label: "Leptir-mašna sa tufnama", price: 5, group: "masne" },
    { id: "ogrlica-perle", slot: "neck", label: "Ogrlica od perli", price: 5, group: "ogrlice" },
    { id: "zvonce", slot: "neck", label: "Ogrlica sa zvoncetom", price: 6, group: "ogrlice" },
    { id: "ogrlica-zvezda", slot: "neck", label: "Ogrlica sa zvezdom", price: 7, group: "ogrlice" },
    { id: "ogrlica-srce", slot: "neck", label: "Ogrlica sa srcem", price: 7, group: "ogrlice" },
    { id: "prugasti-sal", slot: "neck", label: "Šal duga", price: 8, group: "marame" },
    { id: "ogrlica-cvece", slot: "neck", label: "Ogrlica od cveća", price: 9, group: "ogrlice" },
    { id: "krzneni-sal", slot: "neck", label: "Mekani šal", price: 9, group: "marame" },
    { id: "medalja", slot: "neck", label: "Zlatna medalja", price: 10, group: "ogrlice" },
    // Novo u 3D
    { id: "plava-marama", slot: "neck", label: "Plava marama", price: 4, group: "marame" },
    { id: "ogrlica-kamencici", slot: "neck", label: "Ogrlica sa kamenčićem", price: 7, group: "ogrlice" },
    { id: "mindjuse-alke", slot: "neck", label: "Minđuše alke", price: 6, group: "mindjuse" },
    { id: "mindjuse-srce", slot: "neck", label: "Minđuše sa srcem", price: 6, group: "mindjuse" },
];
