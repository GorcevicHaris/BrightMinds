// Oko vrata — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/neck.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "leptir-masna", slot: "neck", label: "Leptir-mašna", price: 3 },
    { id: "kravata", slot: "neck", label: "Kravata", price: 4 },
    { id: "crvena-kravata", slot: "neck", label: "Crvena kravata", price: 4 },
    { id: "ogrlica-skoljke", slot: "neck", label: "Ogrlica od školjki", price: 6 },
    { id: "pistaljka", slot: "neck", label: "Pištaljka", price: 6 },
    { id: "marama", slot: "neck", label: "Marama", price: 4 },
    { id: "sal", slot: "neck", label: "Šal", price: 5 },
    { id: "leptir-masna-tufne", slot: "neck", label: "Leptir-mašna sa tufnama", price: 5 },
    { id: "ogrlica-perle", slot: "neck", label: "Ogrlica od perli", price: 5 },
    { id: "zvonce", slot: "neck", label: "Ogrlica sa zvoncetom", price: 6 },
    { id: "ogrlica-zvezda", slot: "neck", label: "Ogrlica sa zvezdom", price: 7 },
    { id: "ogrlica-srce", slot: "neck", label: "Ogrlica sa srcem", price: 7 },
    { id: "prugasti-sal", slot: "neck", label: "Šal duga", price: 8 },
    { id: "ogrlica-cvece", slot: "neck", label: "Ogrlica od cveća", price: 9 },
    { id: "krzneni-sal", slot: "neck", label: "Mekani šal", price: 9 },
    { id: "medalja", slot: "neck", label: "Zlatna medalja", price: 10 },
];
