// Kape i krune — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/hat.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "kapa", slot: "hat", label: "Kapa", price: 4 },
    { id: "sesir", slot: "hat", label: "Šešir", price: 5 },
    { id: "masna", slot: "hat", label: "Mašna", price: 3 },
    { id: "cvetni-venac", slot: "hat", label: "Cvetni venac", price: 6 },
    { id: "cilindar", slot: "hat", label: "Cilindar", price: 8 },
    { id: "kruna", slot: "hat", label: "Kruna", price: 12 },
    { id: "rodjendanska-kapa", slot: "hat", label: "Rođendanska kapa", price: 4 },
    { id: "kapa-siltom", slot: "hat", label: "Kapa sa šiltom", price: 5 },
    { id: "zelena-kapa-siltom", slot: "hat", label: "Zelena kapa sa šiltom", price: 5 },
    { id: "traka-zeka", slot: "hat", label: "Traka sa ušima zeke", price: 5 },
    { id: "traka-cvet", slot: "hat", label: "Traka sa cvetom", price: 4 },
    { id: "antene", slot: "hat", label: "Traka sa antenama", price: 6 },
    { id: "zimska-kapa", slot: "hat", label: "Zimska kapa", price: 6 },
    { id: "roze-zimska-kapa", slot: "hat", label: "Roze zimska kapa", price: 6 },
    { id: "mornarska-kapa", slot: "hat", label: "Mornarska kapa", price: 7 },
    { id: "slamnati-sesir", slot: "hat", label: "Slamnati šešir", price: 7 },
    { id: "kuvarska-kapa", slot: "hat", label: "Kuvarska kapa", price: 7 },
    { id: "kapa-meda", slot: "hat", label: "Kapa sa ušima mede", price: 8 },
    { id: "kapa-patuljka", slot: "hat", label: "Crvena kapa sa kićankom", price: 8 },
    { id: "kaciga-bicikl", slot: "hat", label: "Kaciga za bicikl", price: 9 },
    { id: "kapa-propeler", slot: "hat", label: "Kapa sa propelerom", price: 9 },
    { id: "kapa-pilota", slot: "hat", label: "Kapa pilota", price: 11 },
    { id: "kapa-dino", slot: "hat", label: "Kapa dinosaurusa", price: 12 },
    { id: "slem-viteza", slot: "hat", label: "Šlem viteza", price: 16 },
    { id: "kapa-zabica", slot: "hat", label: "Kapa žabica", price: 10 },
    { id: "piratski-sesir", slot: "hat", label: "Piratski šešir", price: 10 },
    { id: "kaubojski-sesir", slot: "hat", label: "Kaubojski šešir", price: 12 },
    { id: "vatrogasni-slem", slot: "hat", label: "Vatrogasni šlem", price: 14 },
    { id: "tijara", slot: "hat", label: "Tijara", price: 15 },
    { id: "rog-jednoroga", slot: "hat", label: "Rog jednoroga", price: 18 },
    { id: "sesir-carobnjaka", slot: "hat", label: "Šešir čarobnjaka", price: 20 },
    { id: "astronautski-slem", slot: "hat", label: "Astronautski šlem", price: 30 },
];
