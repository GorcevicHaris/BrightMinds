// Obuća — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/feet.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "sandale", slot: "feet", label: "Sandale", price: 4 },
    { id: "roze-sandale", slot: "feet", label: "Roze sandale", price: 4 },
    { id: "plave-patike", slot: "feet", label: "Plave patike", price: 5 },
    { id: "crvene-patike", slot: "feet", label: "Crvene patike", price: 5 },
    { id: "zelene-patike", slot: "feet", label: "Zelene patike", price: 5 },
    { id: "roze-patike", slot: "feet", label: "Roze patike", price: 5 },
    { id: "zute-patike", slot: "feet", label: "Žute patike", price: 6 },
    { id: "ljubicaste-patike", slot: "feet", label: "Ljubičaste patike", price: 6 },
    { id: "baletanke", slot: "feet", label: "Baletanke", price: 6 },
    { id: "zute-cizme", slot: "feet", label: "Žute gumene čizme", price: 7 },
    { id: "crvene-cizme", slot: "feet", label: "Crvene gumene čizme", price: 7 },
    { id: "cizme-tufne", slot: "feet", label: "Plave čizme na tufne", price: 8 },
    { id: "cipele-masna", slot: "feet", label: "Cipele sa mašnom", price: 8 },
    { id: "papuce-zeke", slot: "feet", label: "Papuče zeke", price: 9 },
    { id: "papuce-mede", slot: "feet", label: "Papuče mede", price: 9 },
    { id: "papuce-zabice", slot: "feet", label: "Papuče žabice", price: 9 },
    { id: "lakovane-cipele", slot: "feet", label: "Lakovane cipele", price: 9 },
    { id: "kopacke", slot: "feet", label: "Kopačke", price: 10 },
    { id: "narandzaste-kopacke", slot: "feet", label: "Narandžaste kopačke", price: 10 },
    { id: "cizme-sneg", slot: "feet", label: "Čizme za sneg", price: 10 },
    { id: "peraja", slot: "feet", label: "Peraja", price: 11 },
    { id: "sjajne-patike", slot: "feet", label: "Sjajne patike", price: 12 },
    { id: "svetlece-patike", slot: "feet", label: "Svetleće patike", price: 14 },
    { id: "kaubojske-cizme", slot: "feet", label: "Kaubojske čizme", price: 14 },
    { id: "klizaljke", slot: "feet", label: "Klizaljke", price: 15 },
    { id: "rolsue", slot: "feet", label: "Rolšue", price: 16 },
    { id: "vatrogasne-cizme", slot: "feet", label: "Vatrogasne čizme", price: 16 },
    { id: "cizme-superheroja", slot: "feet", label: "Čizme superheroja", price: 18 },
    { id: "cizme-astronauta", slot: "feet", label: "Čizme astronauta", price: 25 },
];
