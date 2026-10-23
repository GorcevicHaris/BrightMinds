// Naočare i maske — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/glasses.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "naocare", slot: "glasses", label: "Naočare", price: 4 },
    { id: "roze-naocare", slot: "glasses", label: "Roze naočare", price: 4 },
    { id: "zute-naocare", slot: "glasses", label: "Žute naočare", price: 4 },
    { id: "cetvrtaste-naocare", slot: "glasses", label: "Četvrtaste naočare", price: 5 },
    { id: "suncane-naocare", slot: "glasses", label: "Sunčane naočare", price: 6 },
    { id: "plave-suncane-naocare", slot: "glasses", label: "Plave sunčane naočare", price: 6 },
    { id: "sarene-naocare", slot: "glasses", label: "Šarene naočare", price: 7 },
    { id: "naocare-srca", slot: "glasses", label: "Naočare srca", price: 8 },
    { id: "naocare-zvezde", slot: "glasses", label: "Naočare zvezde", price: 9 },
    { id: "naocare-cvetici", slot: "glasses", label: "Naočare cvetići", price: 9 },
    { id: "plivacke-naocare", slot: "glasses", label: "Naočare za plivanje", price: 8 },
    { id: "skijaske-naocare", slot: "glasses", label: "Skijaške naočare", price: 10 },
    { id: "pilotske-naocare", slot: "glasses", label: "Pilotske naočare", price: 11 },
    { id: "maska-superheroja", slot: "glasses", label: "Maska superheroja", price: 12 },
    { id: "ronilacka-maska", slot: "glasses", label: "Ronilačka maska", price: 14 },
    { id: "maska-leptira", slot: "glasses", label: "Maska leptira", price: 16 },
];
