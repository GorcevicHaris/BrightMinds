// Čisti podaci 3D drugara: mesta, vrste drugara i oblik zapisa predmeta, kompleta i izgleda.
// BEZ three.js i bez React-a — ovo (i fajlovi *.data.ts) uvoze API rute, testovi i server.
//
// Ugovor tima (app/components/avatar3d/contract.ts ga ponovo izvozi, uz 3D tipove):
//  • predmet = jedan zapis `ItemData` u `items/<mesto>.data.ts` (id, mesto, naziv, cena);
//    id-jevi i cene postojećih 228 predmeta se NE menjaju (čuvaju se u bazi i u ormaru deteta);
//  • 3D crtež predmeta je odvojen (items/<mesto>.ts → registerItems), pa server nikad ne
//    učitava three.js;
//  • izgledi životinja = `SkinData` u `animals/skins.data.ts`; izgled čoveka je uvek besplatan
//    (looks.ts).

import { COMPANION_KINDS, WEAR_SLOT_IDS, type CompanionKindId, type WearSlotId } from "@/lib/companion";

export { COMPANION_KINDS };

/** Mesta na liku (konačan spisak): na svakom najviše jedan predmet, sva se nose zajedno */
export const SLOTS = WEAR_SLOT_IDS;
export type Slot = WearSlotId;

/** Nazivi mesta za dete (naslovi i dugmad kategorija u prodavnici) */
export const SLOT_LABELS: Record<Slot, string> = {
    hat: "Kape",
    glasses: "Naočare",
    neck: "Oko vrata",
    outfit: "Odeća",
    bottom: "Donji deo",
    feet: "Obuća",
    hand: "U ruci",
    back: "Na leđima",
    pet: "Ljubimci",
    background: "Pozadine",
};

export type CompanionKind = CompanionKindId;

export const HUMAN_KINDS = ["girl", "boy", "woman", "man"] as const;
export type HumanKind = (typeof HUMAN_KINDS)[number];

export const ANIMAL_KINDS = ["cat", "dog", "bunny", "bear", "fox", "lion", "penguin", "unicorn"] as const;
export type AnimalKind = (typeof ANIMAL_KINDS)[number];

export function isHumanKind(kind: string): kind is HumanKind {
    return (HUMAN_KINDS as readonly string[]).includes(kind);
}

export function isAnimalKind(kind: string): kind is AnimalKind {
    return (ANIMAL_KINDS as readonly string[]).includes(kind);
}

/** Nazivi drugara za dete, redom kojim ih prodavnica nudi */
export const COMPANION_LABELS: Record<CompanionKind, string> = {
    girl: "Devojčica",
    boy: "Dečak",
    woman: "Učiteljica",
    man: "Učitelj",
    cat: "Mačka",
    dog: "Pas",
    bunny: "Zeka",
    bear: "Meda",
    fox: "Lisica",
    lion: "Lav",
    penguin: "Pingvin",
    unicorn: "Jednorog",
};

/** Proporcije tela: kroj odeće i kadar kamere zavise od njih */
export type Proportion = "child" | "adult" | "animal";

/** Oprema po mestu: id predmeta koji je obučen */
export type Wear = Partial<Record<Slot, string>>;

/** Jedan predmet u prodavnici (čist zapis; 3D crtež je u items/<mesto>.ts pod istim id-jem) */
export interface ItemData {
    id: string;
    slot: Slot;
    /** Naziv za dete (srpski, ekavica, latinica) — glas ga izgovara pri probi */
    label: string;
    /** Stalna cena u novčićima (bez popusta i nasumičnih nagrada) */
    price: number;
    /**
     * Mesta koja ovaj predmet prekriva, pa se ona ne crtaju dok je on obučen (stanje deteta se
     * ne menja): haljina i kostim do članaka → ["bottom"]; kombinezon astronauta → ["bottom"].
     */
    hides?: readonly Slot[];
}

/** Gotov komplet (kupuje se odjednom po zbiru cena predmeta koji nedostaju) */
export interface SetData {
    id: string;
    label: string;
    items: Wear;
}

/** Izgled (krzno) životinje; prvi na spisku je podrazumevani i uvek besplatan */
export interface SkinData {
    id: string;
    label: string;
    /** 0 = besplatno; posebna krzna imaju stalnu cenu */
    price: number;
}
