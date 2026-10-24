// Kape i krune — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// Novi predmeti (posle 3D) su na kraju spiska, sa novim id-jevima.
// 3D crtež svakog predmeta: items/hat.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "kapa", slot: "hat", label: "Kapa", price: 4, group: "kape" },
    { id: "sesir", slot: "hat", label: "Šešir", price: 5, group: "sesiri" },
    { id: "masna", slot: "hat", label: "Mašna", price: 3, group: "za-kosu" },
    { id: "cvetni-venac", slot: "hat", label: "Cvetni venac", price: 6, group: "za-kosu" },
    { id: "cilindar", slot: "hat", label: "Cilindar", price: 8, group: "sesiri" },
    { id: "kruna", slot: "hat", label: "Kruna", price: 12, group: "krune" },
    { id: "rodjendanska-kapa", slot: "hat", label: "Rođendanska kapa", price: 4, group: "kape" },
    { id: "kapa-siltom", slot: "hat", label: "Kapa sa šiltom", price: 5, group: "kape" },
    { id: "zelena-kapa-siltom", slot: "hat", label: "Zelena kapa sa šiltom", price: 5, group: "kape" },
    { id: "traka-zeka", slot: "hat", label: "Traka sa ušima zeke", price: 5, group: "za-kosu" },
    { id: "traka-cvet", slot: "hat", label: "Traka sa cvetom", price: 4, group: "za-kosu" },
    { id: "antene", slot: "hat", label: "Traka sa antenama", price: 6, group: "za-kosu" },
    { id: "zimska-kapa", slot: "hat", label: "Zimska kapa", price: 6, group: "kape" },
    { id: "roze-zimska-kapa", slot: "hat", label: "Roze zimska kapa", price: 6, group: "kape" },
    { id: "mornarska-kapa", slot: "hat", label: "Mornarska kapa", price: 7, group: "kape" },
    { id: "slamnati-sesir", slot: "hat", label: "Slamnati šešir", price: 7, group: "sesiri" },
    { id: "kuvarska-kapa", slot: "hat", label: "Kuvarska kapa", price: 7, group: "kape" },
    { id: "kapa-meda", slot: "hat", label: "Kapa sa ušima mede", price: 8, group: "kape" },
    { id: "kapa-patuljka", slot: "hat", label: "Crvena kapa sa kićankom", price: 8, group: "kape" },
    { id: "kaciga-bicikl", slot: "hat", label: "Kaciga za bicikl", price: 9, group: "slemovi" },
    { id: "kapa-propeler", slot: "hat", label: "Kapa sa propelerom", price: 9, group: "kape" },
    { id: "kapa-pilota", slot: "hat", label: "Kapa pilota", price: 11, group: "kape" },
    { id: "kapa-dino", slot: "hat", label: "Kapa dinosaurusa", price: 12, group: "kape" },
    { id: "slem-viteza", slot: "hat", label: "Šlem viteza", price: 16, group: "slemovi" },
    { id: "kapa-zabica", slot: "hat", label: "Kapa žabica", price: 10, group: "kape" },
    { id: "piratski-sesir", slot: "hat", label: "Piratski šešir", price: 10, group: "sesiri" },
    { id: "kaubojski-sesir", slot: "hat", label: "Kaubojski šešir", price: 12, group: "sesiri" },
    { id: "vatrogasni-slem", slot: "hat", label: "Vatrogasni šlem", price: 14, group: "slemovi" },
    { id: "tijara", slot: "hat", label: "Tijara", price: 15, group: "krune" },
    { id: "rog-jednoroga", slot: "hat", label: "Rog jednoroga", price: 18, group: "za-kosu" },
    { id: "sesir-carobnjaka", slot: "hat", label: "Šešir čarobnjaka", price: 20, group: "sesiri" },
    { id: "astronautski-slem", slot: "hat", label: "Astronautski šlem", price: 30, group: "slemovi" },
    // Novo u 3D
    { id: "teget-kapa-siltom", slot: "hat", label: "Teget kapa sa šiltom", price: 6, group: "kape" },
    { id: "crna-kapa-siltom", slot: "hat", label: "Crna kapa sa šiltom", price: 6, group: "kape" },
    { id: "bez-kapa-siltom", slot: "hat", label: "Bež kapa sa šiltom", price: 6, group: "kape" },
    { id: "crna-opustena-kapa", slot: "hat", label: "Crna opuštena kapa", price: 6, group: "kape" },
    { id: "krem-opustena-kapa", slot: "hat", label: "Krem opuštena kapa", price: 6, group: "kape" },
    { id: "zelena-opustena-kapa", slot: "hat", label: "Maslinasta opuštena kapa", price: 6, group: "kape" },
    { id: "traka-za-kosu", slot: "hat", label: "Traka za kosu", price: 3, group: "za-kosu" },
    { id: "traka-marama", slot: "hat", label: "Traka-marama sa čvorom", price: 4, group: "za-kosu" },
    // ── Novo (porodica, škola, sport, praznik, zima, kiša, spavanje) ──
    { id: "bela-kapica", slot: "hat", label: "Bela kapica (takija)", price: 6, group: "kape" },
    { id: "vezena-kapica", slot: "hat", label: "Vezena krem kapica", price: 7, group: "kape" },
    { id: "teget-kapica", slot: "hat", label: "Teget kapica", price: 6, group: "kape" },
    { id: "zuta-zimska-kapa", slot: "hat", label: "Žuta zimska kapa", price: 6, group: "kape" },
    { id: "teget-zimska-kapa", slot: "hat", label: "Teget zimska kapa", price: 6, group: "kape" },
    { id: "zuta-kapa-siltom", slot: "hat", label: "Žuta kapa sa šiltom", price: 6, group: "kape" },
    { id: "lila-opustena-kapa", slot: "hat", label: "Lila opuštena kapa", price: 6, group: "kape" },
    { id: "roze-traka-za-kosu", slot: "hat", label: "Roze traka za kosu", price: 3, group: "za-kosu" },
];
