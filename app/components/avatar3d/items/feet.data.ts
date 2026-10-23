// Obuća — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #3 (katalog).
// Id-jevi, nazivi i cene su preneti iz 2D kataloga (app/components/avatar/wear) i ne menjaju se.
// 3D crtež svakog predmeta: items/feet.ts (registerItems), pod istim id-jem.

import type { ItemData } from "../data";

export const ITEMS: readonly ItemData[] = [
    { id: "sandale", slot: "feet", label: "Sandale", price: 4, group: "sandale" },
    { id: "roze-sandale", slot: "feet", label: "Roze sandale", price: 4, group: "sandale" },
    { id: "plave-patike", slot: "feet", label: "Plave patike", price: 5, group: "patike" },
    { id: "crvene-patike", slot: "feet", label: "Crvene patike", price: 5, group: "patike" },
    { id: "zelene-patike", slot: "feet", label: "Zelene patike", price: 5, group: "patike" },
    { id: "roze-patike", slot: "feet", label: "Roze patike", price: 5, group: "patike" },
    { id: "zute-patike", slot: "feet", label: "Žute patike", price: 6, group: "patike" },
    { id: "ljubicaste-patike", slot: "feet", label: "Ljubičaste patike", price: 6, group: "patike" },
    { id: "baletanke", slot: "feet", label: "Baletanke", price: 6, group: "cipele" },
    { id: "zute-cizme", slot: "feet", label: "Žute gumene čizme", price: 7, group: "cizme" },
    { id: "crvene-cizme", slot: "feet", label: "Crvene gumene čizme", price: 7, group: "cizme" },
    { id: "cizme-tufne", slot: "feet", label: "Plave čizme na tufne", price: 8, group: "cizme" },
    { id: "cipele-masna", slot: "feet", label: "Cipele sa mašnom", price: 8, group: "cipele" },
    { id: "papuce-zeke", slot: "feet", label: "Papuče zeke", price: 9, group: "papuce" },
    { id: "papuce-mede", slot: "feet", label: "Papuče mede", price: 9, group: "papuce" },
    { id: "papuce-zabice", slot: "feet", label: "Papuče žabice", price: 9, group: "papuce" },
    { id: "lakovane-cipele", slot: "feet", label: "Lakovane cipele", price: 9, group: "cipele" },
    { id: "kopacke", slot: "feet", label: "Kopačke", price: 10, group: "patike" },
    { id: "narandzaste-kopacke", slot: "feet", label: "Narandžaste kopačke", price: 10, group: "patike" },
    { id: "cizme-sneg", slot: "feet", label: "Čizme za sneg", price: 10, group: "cizme" },
    { id: "peraja", slot: "feet", label: "Peraja", price: 11, group: "sandale" },
    { id: "sjajne-patike", slot: "feet", label: "Sjajne patike", price: 12, group: "patike" },
    { id: "svetlece-patike", slot: "feet", label: "Svetleće patike", price: 14, group: "patike" },
    { id: "kaubojske-cizme", slot: "feet", label: "Kaubojske čizme", price: 14, group: "cizme" },
    { id: "klizaljke", slot: "feet", label: "Klizaljke", price: 15, group: "cizme" },
    { id: "rolsue", slot: "feet", label: "Rolšue", price: 16, group: "cizme" },
    { id: "vatrogasne-cizme", slot: "feet", label: "Vatrogasne čizme", price: 16, group: "cizme" },
    { id: "cizme-superheroja", slot: "feet", label: "Čizme superheroja", price: 18, group: "cizme" },
    { id: "cizme-astronauta", slot: "feet", label: "Čizme astronauta", price: 25, group: "cizme" },
    // Novo u 3D
    { id: "bele-patike", slot: "feet", label: "Bele patike", price: 5, group: "patike" },
    { id: "crne-patike", slot: "feet", label: "Crne patike", price: 5, group: "patike" },
    { id: "narandzaste-patike", slot: "feet", label: "Narandžaste patike", price: 5, group: "patike" },
    { id: "teget-patike", slot: "feet", label: "Teget patike", price: 6, group: "patike" },
    { id: "cizme-do-kolena", slot: "feet", label: "Čizme do kolena", price: 12, group: "cizme" },
    { id: "mokasine", slot: "feet", label: "Mokasine", price: 9, group: "cipele" },
    { id: "krem-patike", slot: "feet", label: "Krem patike", price: 6, group: "patike" },
    { id: "crno-bele-patike", slot: "feet", label: "Crno-bele patike", price: 7, group: "patike" },
    { id: "cizme-krzno", slot: "feet", label: "Čizme sa krznom", price: 12, group: "cizme" },
    { id: "roze-cizme-krzno", slot: "feet", label: "Roze čizme sa krznom", price: 12, group: "cizme" },
];
