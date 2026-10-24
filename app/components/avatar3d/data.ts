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

/** Ljudi, porodica: tinejdžeri, nana i dedo (isti motor i ista sidra kao ostali ljudi) */
export const FAMILY_KINDS = ["teengirl", "teenboy", "grandma", "grandpa"] as const;
export type FamilyKind = (typeof FAMILY_KINDS)[number];

export const HUMAN_KINDS = ["girl", "boy", "woman", "man", ...FAMILY_KINDS] as const;
export type HumanKind = (typeof HUMAN_KINDS)[number];

/** Uzrast lika: lice (oči, nos, obrazi), građa i ponuda frizura zavise od njega */
export type HumanAge = "child" | "teen" | "adult" | "senior";

/** Osobine ljudskog lika: žensko (hidžab, trepavice) i uzrast */
export const HUMAN_TRAITS: Record<HumanKind, { female: boolean; age: HumanAge }> = {
    girl: { female: true, age: "child" },
    boy: { female: false, age: "child" },
    woman: { female: true, age: "adult" },
    man: { female: false, age: "adult" },
    teengirl: { female: true, age: "teen" },
    teenboy: { female: false, age: "teen" },
    grandma: { female: true, age: "senior" },
    grandpa: { female: false, age: "senior" },
};

/** Osnovne životinje (animals/<vrsta>.ts, izgledi u animals/skins.data.ts) */
export const ANIMAL_KINDS = ["cat", "dog", "bunny", "bear", "fox", "lion", "penguin", "unicorn"] as const;
export type AnimalKind = (typeof ANIMAL_KINDS)[number];

/** Dodatne životinje (animals/extra/, izgledi u animals/extra/skins.data.ts) */
export const EXTRA_ANIMAL_KINDS = [
    "panda", "koala", "elephant", "monkey", "owl", "tiger", "dinosaur", "giraffe",
    "pony", "frog", "hedgehog", "raccoon", "deer", "sheep", "hamster", "squirrel",
] as const;
export type ExtraAnimalKind = (typeof EXTRA_ANIMAL_KINDS)[number];

export function isHumanKind(kind: string): kind is HumanKind {
    return (HUMAN_KINDS as readonly string[]).includes(kind);
}

export function isAnimalKind(kind: string): kind is AnimalKind {
    return (ANIMAL_KINDS as readonly string[]).includes(kind);
}

export function isExtraAnimalKind(kind: string): kind is ExtraAnimalKind {
    return (EXTRA_ANIMAL_KINDS as readonly string[]).includes(kind);
}

/** Nazivi drugara za dete, redom kojim ih prodavnica nudi */
export const COMPANION_LABELS: Record<CompanionKind, string> = {
    girl: "Devojčica",
    boy: "Dečak",
    woman: "Učiteljica",
    man: "Učitelj",
    // ── Ljudi, porodica ──
    teengirl: "Tinejdžerka",
    teenboy: "Tinejdžer",
    grandma: "Nana",
    grandpa: "Dedo",
    // ── Životinje ──
    cat: "Mačka",
    dog: "Pas",
    bunny: "Zeka",
    bear: "Meda",
    fox: "Lisica",
    lion: "Lav",
    penguin: "Pingvin",
    unicorn: "Jednorog",
    panda: "Panda",
    koala: "Koala",
    elephant: "Slon",
    monkey: "Majmun",
    owl: "Sova",
    tiger: "Tigar",
    dinosaur: "Dinosaurus",
    giraffe: "Žirafa",
    pony: "Poni",
    frog: "Žaba",
    hedgehog: "Ježić",
    raccoon: "Rakun",
    deer: "Srna",
    sheep: "Ovčica",
    hamster: "Hrčak",
    squirrel: "Veverica",
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
    /**
     * Podvrsta za filter u prodavnici (jedan čip = samo ta vrsta), npr. obuća: "patike",
     * "cizme", "sandale", "papuce"; odeća: "majice", "duksevi", "haljine", "kostimi". Id-jevi
     * podvrsta i nazivi čipova: SUBGROUPS ispod. Bez ovoga prodavnica pogađa po id-ju predmeta.
     */
    group?: string;
}

/** Podvrste po mestu (redosled čipova u prodavnici); id → naziv čipa za dete */
export const SUBGROUPS: Partial<Record<Slot, readonly { id: string; label: string }[]>> = {
    hat: [
        { id: "kape", label: "Kape" },
        { id: "sesiri", label: "Šeširi" },
        { id: "krune", label: "Krune" },
        { id: "slemovi", label: "Šlemovi" },
        { id: "za-kosu", label: "Za kosu" },
    ],
    glasses: [
        { id: "naocare", label: "Naočare" },
        { id: "maske", label: "Maske" },
    ],
    neck: [
        { id: "ogrlice", label: "Ogrlice" },
        { id: "marame", label: "Marame i šalovi" },
        { id: "masne", label: "Masne i kravate" },
        { id: "mindjuse", label: "Minđuše" },
    ],
    outfit: [
        { id: "majice", label: "Majice" },
        { id: "duksevi", label: "Duksevi i džemperi" },
        { id: "haljine", label: "Haljine" },
        { id: "kombinezoni", label: "Kombinezoni" },
        { id: "jakne", label: "Jakne" },
        { id: "sport", label: "Sport" },
        { id: "pidzame", label: "Pidžame" },
        { id: "svecano", label: "Svečano" },
        { id: "kostimi", label: "Kostimi" },
    ],
    bottom: [
        { id: "pantalone", label: "Pantalone" },
        { id: "suknje", label: "Suknje" },
        { id: "sorcevi", label: "Šorcevi" },
    ],
    feet: [
        { id: "patike", label: "Patike" },
        { id: "cizme", label: "Čizme" },
        { id: "cipele", label: "Cipele" },
        { id: "sandale", label: "Sandale" },
        { id: "papuce", label: "Papuče" },
    ],
};

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
