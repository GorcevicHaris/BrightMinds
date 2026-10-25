// Izgledi novih drugara (animals/friends/) — čisti podaci (bez three.js), uvozi ih i server.
// Spaja se u ANIMAL_SKINS (animals/skins.data.ts). Prvi izgled je podrazumevani i besplatan;
// osnovne boje su besplatne, posebne (zlatna, dugina, zvezdana) imaju stalnu cenu (8–30 novčića).
// Malo izbora (četiri boje po drugaru): manje odlučivanja za mlađu decu i decu sa autizmom.
// 3D boje i šare svakog izgleda su u friends/<vrsta>.ts (pod istim id-jem).

import type { FriendKind, SkinData } from "../../data";

export const FRIEND_SKINS: Record<FriendKind, readonly SkinData[]> = {
    robot: [
        { id: "plavi", label: "Plavi", price: 0 },
        { id: "narandzasti", label: "Narandžasti", price: 0 },
        { id: "beli", label: "Beli", price: 0 },
        { id: "zlatni", label: "Zlatni", price: 25 },
    ],
    alien: [
        { id: "zeleni", label: "Zeleni", price: 0 },
        { id: "plavi", label: "Plavi", price: 0 },
        { id: "ljubicasti", label: "Ljubičasti", price: 12 },
        { id: "zvezdani", label: "Zvezdani", price: 25 },
    ],
    ladybug: [
        { id: "crvena", label: "Crvena", price: 0 },
        { id: "zuta", label: "Žuta", price: 0 },
        { id: "roze", label: "Roze", price: 12 },
        { id: "zlatna", label: "Zlatna", price: 25 },
    ],
    bee: [
        { id: "zuta", label: "Žuta", price: 0 },
        { id: "medena", label: "Medena", price: 0 },
        { id: "roze", label: "Roze", price: 12 },
        { id: "dugina", label: "Dugina", price: 30 },
    ],
    butterfly: [
        { id: "plavi", label: "Plavi", price: 0 },
        { id: "roze", label: "Roze", price: 0 },
        { id: "narandzasti", label: "Narandžasti", price: 0 },
        { id: "dugin", label: "Dugin", price: 30 },
    ],
    snail: [
        { id: "smedji", label: "Smeđi", price: 0 },
        { id: "zeleni", label: "Zeleni", price: 0 },
        { id: "roze", label: "Roze", price: 12 },
        { id: "dugin", label: "Dugin", price: 30 },
    ],
    octopus: [
        { id: "ljubicasta", label: "Ljubičasta", price: 0 },
        { id: "narandzasta", label: "Narandžasta", price: 0 },
        { id: "plava", label: "Plava", price: 12 },
        { id: "duga", label: "Duga", price: 30 },
    ],
    sloth: [
        { id: "braon", label: "Braon", price: 0 },
        { id: "sivi", label: "Sivi", price: 0 },
        { id: "svetli", label: "Svetli", price: 0 },
        { id: "roze", label: "Roze", price: 12 },
    ],
};
