// Donji deo — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Novo mesto (nema ga u 2D): pantalone, suknje, šorcevi. Cene su stalne (3–15).
// 3D crtež svakog predmeta: items/bottom.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    // Pantalone
    { id: "farmerke", slot: "bottom", label: "Farmerke", price: 8, group: "pantalone" },
    { id: "svetle-farmerke", slot: "bottom", label: "Svetle farmerke", price: 8, group: "pantalone" },
    { id: "tamne-farmerke", slot: "bottom", label: "Tamne farmerke", price: 8, group: "pantalone" },
    { id: "roze-farmerke", slot: "bottom", label: "Roze farmerke", price: 9, group: "pantalone" },
    { id: "farmerke-zakrpe", slot: "bottom", label: "Farmerke sa zakrpama", price: 10, group: "pantalone" },
    { id: "sive-trenerke", slot: "bottom", label: "Sive trenerke", price: 6, group: "pantalone" },
    { id: "plave-trenerke", slot: "bottom", label: "Plave trenerke", price: 6, group: "pantalone" },
    { id: "roze-trenerke", slot: "bottom", label: "Roze trenerke", price: 6, group: "pantalone" },
    { id: "crne-trenerke", slot: "bottom", label: "Crne trenerke sa prugom", price: 7, group: "pantalone" },
    { id: "bez-pantalone", slot: "bottom", label: "Bež pantalone", price: 7, group: "pantalone" },
    { id: "teget-pantalone", slot: "bottom", label: "Teget pantalone", price: 7, group: "pantalone" },
    { id: "karirane-pantalone", slot: "bottom", label: "Karirane pantalone", price: 9, group: "pantalone" },
    { id: "pantalone-dzepovi", slot: "bottom", label: "Pantalone sa džepovima", price: 9, group: "pantalone" },
    { id: "siroke-pantalone", slot: "bottom", label: "Široke pantalone", price: 9, group: "pantalone" },
    { id: "roze-helanke", slot: "bottom", label: "Roze helanke", price: 5, group: "pantalone" },
    { id: "helanke-tufne", slot: "bottom", label: "Helanke na tufne", price: 5, group: "pantalone" },
    { id: "ljubicaste-helanke", slot: "bottom", label: "Ljubičaste helanke", price: 5, group: "pantalone" },
    { id: "pantalone-tregeri", slot: "bottom", label: "Pantalone sa tregerima", price: 10, group: "pantalone" },
    { id: "siroke-farmerke", slot: "bottom", label: "Široke farmerke", price: 10, group: "pantalone" },
    { id: "sive-siroke-farmerke", slot: "bottom", label: "Sive široke farmerke", price: 10, group: "pantalone" },
    { id: "svetle-siroke-farmerke", slot: "bottom", label: "Svetle široke farmerke", price: 10, group: "pantalone" },
    { id: "zelene-trenerke", slot: "bottom", label: "Zelene trenerke", price: 7, group: "pantalone" },
    { id: "crne-zvonaste-helanke", slot: "bottom", label: "Crne zvonaste helanke", price: 7, group: "pantalone" },
    { id: "roze-zvonaste-helanke", slot: "bottom", label: "Roze zvonaste helanke", price: 7, group: "pantalone" },
    // Šorcevi
    { id: "teksas-sorc", slot: "bottom", label: "Teksas šorc", price: 6, group: "sorcevi" },
    { id: "crveni-sorc", slot: "bottom", label: "Crveni šorc", price: 5, group: "sorcevi" },
    { id: "sportski-sorc", slot: "bottom", label: "Sportski šorc", price: 5, group: "sorcevi" },
    { id: "bermude", slot: "bottom", label: "Bermude", price: 6, group: "sorcevi" },
    { id: "zeleni-sorc", slot: "bottom", label: "Zeleni šorc", price: 5, group: "sorcevi" },
    { id: "crni-sorc", slot: "bottom", label: "Crni sportski šorc", price: 5, group: "sorcevi" },
    { id: "beli-sorc", slot: "bottom", label: "Beli šorc", price: 5, group: "sorcevi" },
    // Suknje
    { id: "plisirana-suknja", slot: "bottom", label: "Plisirana suknja", price: 7, group: "suknje" },
    { id: "teksas-suknja", slot: "bottom", label: "Teksas suknja", price: 7, group: "suknje" },
    { id: "tutu-suknja", slot: "bottom", label: "Roze tutu suknja", price: 9, group: "suknje" },
    { id: "suknja-tufne", slot: "bottom", label: "Suknja na tufne", price: 8, group: "suknje" },
    { id: "karirana-suknja", slot: "bottom", label: "Karirana suknja", price: 8, group: "suknje" },
    { id: "zuta-suknja", slot: "bottom", label: "Žuta zvonasta suknja", price: 7, group: "suknje" },
    { id: "duga-suknja", slot: "bottom", label: "Duga suknja", price: 10, group: "suknje" },
    { id: "duga-cvetna-suknja", slot: "bottom", label: "Duga cvetna suknja", price: 11, group: "suknje" },
    { id: "ljubicasta-duga-suknja", slot: "bottom", label: "Ljubičasta duga suknja", price: 10, group: "suknje" },
    { id: "suknja-na-volane", slot: "bottom", label: "Suknja na volane", price: 12, group: "suknje" },
    // ── Novo (porodica, škola, sport, praznik, zima, kiša, spavanje) ──
    { id: "sive-pantalone", slot: "bottom", label: "Sive školske pantalone", price: 7, group: "pantalone" },
    { id: "smedje-pantalone", slot: "bottom", label: "Smeđe pantalone", price: 7, group: "pantalone" },
    { id: "planinarske-pantalone", slot: "bottom", label: "Planinarske pantalone", price: 9, group: "pantalone" },
    { id: "teget-trenerke", slot: "bottom", label: "Teget trenerke", price: 6, group: "pantalone" },
    { id: "crveni-sportski-sorc", slot: "bottom", label: "Crveni sportski šorc", price: 5, group: "sorcevi" },
    { id: "zuti-sportski-sorc", slot: "bottom", label: "Žuti sportski šorc", price: 5, group: "sorcevi" },
    { id: "siva-plisirana-suknja", slot: "bottom", label: "Siva školska suknja", price: 7, group: "suknje" },
    { id: "teget-plisirana-suknja", slot: "bottom", label: "Teget plisirana suknja", price: 7, group: "suknje" },
    { id: "duga-teget-suknja", slot: "bottom", label: "Duga teget suknja", price: 10, group: "suknje" },
    { id: "duga-bez-suknja", slot: "bottom", label: "Duga bež suknja", price: 10, group: "suknje" },
    { id: "duga-zelena-suknja", slot: "bottom", label: "Duga zelena suknja", price: 10, group: "suknje" },
];
