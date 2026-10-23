// Izgledi (krzna) životinja — čisti podaci (bez three.js), uvozi ih i server. Vlasnik: #2 (životinje).
// Mačka, pas, zeka i meda zadržavaju id-jeve 2D izgleda (app/components/avatar/skins.ts) jer su
// sačuvani u bazi (children.settings.companion.skin / skins). Prvi izgled je podrazumevani i besplatan.
// Nove životinje (lisica, lav, pingvin, jednorog) za sad imaju po jedan besplatan izgled; #2 dodaje ostale.

import type { AnimalKind, SkinData } from "../data";

export const ANIMAL_SKINS: Record<AnimalKind, readonly SkinData[]> = {
    cat: [
        { id: "narandzasta", label: "Narandžasta", price: 0 },
        { id: "siva", label: "Siva", price: 0 },
        { id: "crna", label: "Crna", price: 0 },
        { id: "bela", label: "Bela", price: 0 },
        { id: "crno-bela", label: "Crno-bela", price: 8 },
        { id: "tigrasta", label: "Tigrasta", price: 12 },
        { id: "trobojna", label: "Šarena", price: 14 },
        { id: "sijamska", label: "Sijamska", price: 16 },
        { id: "zlatna", label: "Zlatna", price: 25 },
        { id: "duga", label: "Duga", price: 30 },
    ],
    dog: [
        { id: "bez", label: "Bež", price: 0 },
        { id: "braon", label: "Braon", price: 0 },
        { id: "crna", label: "Crna", price: 0 },
        { id: "bela", label: "Bela", price: 0 },
        { id: "retriver", label: "Zlatni retriver", price: 8 },
        { id: "bigl", label: "Bigl", price: 10 },
        { id: "dalmatinac", label: "Dalmatinac", price: 14 },
        { id: "pudla", label: "Pudla", price: 16 },
        { id: "haski", label: "Haski", price: 18 },
        { id: "zlatna", label: "Zlatna sjajna", price: 25 },
        { id: "duga", label: "Duga", price: 30 },
    ],
    bunny: [
        { id: "bela", label: "Bela", price: 0 },
        { id: "siva", label: "Siva", price: 0 },
        { id: "braon", label: "Braon", price: 0 },
        { id: "crno-bela", label: "Crno-bela", price: 8 },
        { id: "roze", label: "Roze", price: 12 },
        { id: "zlatna", label: "Zlatna", price: 25 },
        { id: "duga", label: "Duga", price: 30 },
    ],
    bear: [
        { id: "braon", label: "Braon", price: 0 },
        { id: "svetlo-braon", label: "Svetlo-braon", price: 0 },
        { id: "polarni", label: "Polarni", price: 0 },
        { id: "koala", label: "Koala", price: 12 },
        { id: "panda", label: "Panda", price: 18 },
        { id: "zlatna", label: "Zlatna", price: 25 },
        { id: "duga", label: "Duga", price: 30 },
    ],
    fox: [
        { id: "narandzasta", label: "Narandžasta", price: 0 },
    ],
    lion: [
        { id: "zlatna-griva", label: "Zlatna griva", price: 0 },
    ],
    penguin: [
        { id: "crno-beli", label: "Crno-beli", price: 0 },
    ],
    unicorn: [
        { id: "beli", label: "Beli", price: 0 },
    ],
};
