// Naočare i maske — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// Novi predmeti (posle 3D) su na kraju spiska, sa novim id-jevima.
// 3D crtež svakog predmeta: items/glasses.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "naocare", slot: "glasses", label: "Naočare", price: 4, group: "naocare" },
    { id: "roze-naocare", slot: "glasses", label: "Roze naočare", price: 4, group: "naocare" },
    { id: "zute-naocare", slot: "glasses", label: "Žute naočare", price: 4, group: "naocare" },
    { id: "cetvrtaste-naocare", slot: "glasses", label: "Četvrtaste naočare", price: 5, group: "naocare" },
    { id: "suncane-naocare", slot: "glasses", label: "Sunčane naočare", price: 6, group: "naocare" },
    { id: "plave-suncane-naocare", slot: "glasses", label: "Plave sunčane naočare", price: 6, group: "naocare" },
    { id: "sarene-naocare", slot: "glasses", label: "Šarene naočare", price: 7, group: "naocare" },
    { id: "naocare-srca", slot: "glasses", label: "Naočare srca", price: 8, group: "naocare" },
    { id: "naocare-zvezde", slot: "glasses", label: "Naočare zvezde", price: 9, group: "naocare" },
    { id: "naocare-cvetici", slot: "glasses", label: "Naočare cvetići", price: 9, group: "naocare" },
    { id: "plivacke-naocare", slot: "glasses", label: "Naočare za plivanje", price: 8, group: "naocare" },
    { id: "skijaske-naocare", slot: "glasses", label: "Skijaške naočare", price: 10, group: "naocare" },
    { id: "pilotske-naocare", slot: "glasses", label: "Pilotske naočare", price: 11, group: "naocare" },
    { id: "maska-superheroja", slot: "glasses", label: "Maska superheroja", price: 12, group: "maske" },
    { id: "ronilacka-maska", slot: "glasses", label: "Ronilačka maska", price: 14, group: "maske" },
    { id: "maska-leptira", slot: "glasses", label: "Maska leptira", price: 16, group: "maske" },
    // Novo u 3D
    { id: "crne-suncane-naocare", slot: "glasses", label: "Crne sunčane naočare", price: 7, group: "naocare" },
    { id: "ovalne-suncane-naocare", slot: "glasses", label: "Ovalne sunčane naočare", price: 7, group: "naocare" },
];
