// U ruci — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/hand.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "lizalica", slot: "hand", label: "Lizalica", price: 3 },
    { id: "cvet", slot: "hand", label: "Cvet", price: 3 },
    { id: "jabuka", slot: "hand", label: "Jabuka", price: 3 },
    { id: "sargarepa", slot: "hand", label: "Šargarepa", price: 3 },
    { id: "balon", slot: "hand", label: "Balon", price: 4 },
    { id: "sladoled", slot: "hand", label: "Sladoled", price: 4 },
    { id: "kolacic", slot: "hand", label: "Kolačić", price: 4 },
    { id: "varjaca", slot: "hand", label: "Varjača", price: 4 },
    { id: "suncokret", slot: "hand", label: "Suncokret", price: 5 },
    { id: "lopta", slot: "hand", label: "Lopta", price: 5 },
    { id: "cetkica", slot: "hand", label: "Četkica za slikanje", price: 5 },
    { id: "kokice", slot: "hand", label: "Kokice", price: 5 },
    { id: "knjiga", slot: "hand", label: "Knjiga", price: 6 },
    { id: "vetrenjaca", slot: "hand", label: "Vetrenjača", price: 6 },
    { id: "kofica", slot: "hand", label: "Kofica i lopatica", price: 6 },
    { id: "mehurici", slot: "hand", label: "Duvaljka za mehuriće", price: 6 },
    { id: "lampa", slot: "hand", label: "Baterijska lampa", price: 7 },
    { id: "kantica", slot: "hand", label: "Kantica za zalivanje", price: 7 },
    { id: "kisobran", slot: "hand", label: "Kišobran", price: 8 },
    { id: "teniski-reket", slot: "hand", label: "Teniski reket", price: 8 },
    { id: "laso", slot: "hand", label: "Laso", price: 8 },
    { id: "mikrofon", slot: "hand", label: "Mikrofon", price: 9 },
    { id: "mapa", slot: "hand", label: "Mapa blaga", price: 9 },
    { id: "stapic-zvezda", slot: "hand", label: "Štapić sa zvezdom", price: 10 },
    { id: "dvogled", slot: "hand", label: "Dvogled", price: 10 },
    { id: "balon-srce", slot: "hand", label: "Balon srce", price: 10 },
    { id: "medvedic", slot: "hand", label: "Medvedić", price: 12 },
    { id: "zmaj-od-papira", slot: "hand", label: "Zmaj od papira", price: 14 },
    { id: "tri-balona", slot: "hand", label: "Tri balona", price: 15 },
    { id: "gitara", slot: "hand", label: "Gitara", price: 25 },
];
