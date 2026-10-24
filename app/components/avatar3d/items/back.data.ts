// Na leđima — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/back.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "ranac", slot: "back", label: "Ranac", price: 8 },
    { id: "crveni-ranac", slot: "back", label: "Crveni ranac sa zvezdom", price: 9 },
    { id: "ranac-meda", slot: "back", label: "Ranac meda", price: 10 },
    { id: "plast", slot: "back", label: "Plašt sa zvezdama", price: 12 },
    { id: "krila-pcelice", slot: "back", label: "Krila pčelice", price: 14 },
    { id: "krila-bubamare", slot: "back", label: "Krila bubamare", price: 15 },
    { id: "boca-ronioca", slot: "back", label: "Boce za ronjenje", price: 16 },
    { id: "oklop-kornjace", slot: "back", label: "Oklop kornjače", price: 18 },
    { id: "kraljevski-plast", slot: "back", label: "Kraljevski plašt", price: 20 },
    { id: "krila-leptira", slot: "back", label: "Krila leptira", price: 20 },
    { id: "krila-vile", slot: "back", label: "Krila vile", price: 22 },
    { id: "krila-ptice", slot: "back", label: "Krila ptice", price: 24 },
    { id: "krila-andjela", slot: "back", label: "Krila anđela", price: 25 },
    { id: "krila-duge", slot: "back", label: "Krila od duge", price: 28 },
    { id: "krila-zmaja", slot: "back", label: "Krila zmaja", price: 30 },
    { id: "raketa-ranac", slot: "back", label: "Raketa-ranac", price: 70 },
    // Novo u 3D katalogu
    { id: "skolska-torba", slot: "back", label: "Školska torba", price: 9 },
    { id: "ranac-zeka", slot: "back", label: "Ranac zeka", price: 10 },
    // ── Novo (porodica, škola, sport, praznik, zima, kiša, spavanje) ──
    { id: "zeleni-ranac", slot: "back", label: "Zeleni ranac", price: 8 },
    { id: "roze-ranac", slot: "back", label: "Roze ranac", price: 8 },
    { id: "zuti-ranac", slot: "back", label: "Žuti ranac", price: 8 },
    { id: "planinarski-ranac", slot: "back", label: "Planinarski ranac", price: 12 },
    { id: "krila-flaminga", slot: "back", label: "Krila flaminga", price: 22 },
    { id: "krila-sove", slot: "back", label: "Krila sove", price: 22 },
    { id: "plava-krila-vile", slot: "back", label: "Plava krila vile", price: 22 },
];
