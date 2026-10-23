// Predmeti koje dete kupuje novčićima i oblači svom drugaru (učitelju ili životinji).
// Svaki predmet je crtež u zajedničkom koordinatnom sistemu (geometry.ts), pa pristaje
// svakom liku. Stil: veseo, ravne boje sa blagom senkom i sjajem. Crteži su u wear/*.tsx.
//
// Namerno bez "use client", bez hook-ova i bez uvoza klijentskih modula: katalog
// uvoze i API rute (provera kupovine). Crteži su čiste funkcije koje vraćaju SVG.
// Bez gradijenata sa id-jem: isti predmet može biti na više likova na istom ekranu.
//
// Mesta (WEAR_SLOTS) su ugovor sa prodavnicom i serverom — id-jevi se ne menjaju. Na
// svakom mestu drugar nosi najviše jedan predmet, a sva mesta se nose istovremeno.
// Poprsje i lice crtaju samo kapu, naočare, ono oko vrata i odeću; ceo lik sve.

import type { ReactNode } from "react";
import type { CompanionKind } from "./companions";
import { GROUND_Y, HOLD_X, HOLD_Y, PET_X } from "./geometry";
import { BACKGROUNDS } from "./wear/backgrounds";
import { BACKS } from "./wear/backs";
import { FEET } from "./wear/feet";
import { GLASSES } from "./wear/glasses";
import { HANDS } from "./wear/hands";
import { HATS } from "./wear/hats";
import { NECK } from "./wear/neck";
import { OUTFITS } from "./wear/outfits";
import { PETS } from "./wear/pets";

export type WearSlot = "hat" | "glasses" | "neck" | "outfit" | "feet" | "hand" | "back" | "pet" | "background";

export const WEAR_SLOTS: readonly WearSlot[] = ["hat", "glasses", "neck", "outfit", "feet", "hand", "back", "pet", "background"];

/** Nazivi mesta za dete (prodavnica može da ih koristi kao naslove) */
export const WEAR_SLOT_LABELS: Record<WearSlot, string> = {
    hat: "Kape i krune",
    glasses: "Naočare i maske",
    neck: "Oko vrata",
    outfit: "Odeća i kostimi",
    feet: "Obuća",
    hand: "U ruci",
    back: "Na leđima",
    pet: "Ljubimci",
    background: "Pozadine",
};

/** Kako se lik crta: `full` = ceo lik (glava do stopala), `bust` = glava i ramena, `face` = lice */
export type WearVariant = "bust" | "face" | "full";

/** Mesta koja se vide u svakom obliku lika */
const VISIBLE: Record<WearVariant, ReadonlySet<WearSlot>> = {
    full: new Set(WEAR_SLOTS),
    bust: new Set<WearSlot>(["hat", "glasses", "neck", "outfit"]),
    face: new Set<WearSlot>(["hat", "glasses", "neck", "outfit"]),
};

export function slotVisible(slot: WearSlot, variant: WearVariant): boolean {
    return VISIBLE[variant].has(slot);
}

export interface WearItem {
    id: string;
    slot: WearSlot;
    /** Naziv za dete (srpski, latinica) */
    label: string;
    /** Cena u novčićima (stalna, bez nasumičnih nagrada) */
    price: number;
    /**
     * SVG elementi. Kapa, naočare, vrat, odeća, obuća, leđa i pozadina su u zajedničkom
     * sistemu crteža (geometry.ts); predmet u ruci i ljubimac u sopstvenom (0, 0 = šaka / tlo).
     * Bez argumenata crta poprsje (kao ranije). `tone` je boja kože ili krzna lika (bosa stopala u sandalama).
     */
    render: (variant?: WearVariant, kind?: CompanionKind, tone?: string) => ReactNode;
    /** Na leđima: deo koji se vidi spreda (kaiševi, kopča), crta se preko odeće */
    front?: (variant?: WearVariant, kind?: CompanionKind) => ReactNode;
    /** Odeća: boja rukava (ruke celog lika i podignuta ruka na poprsju) */
    sleeve?: string;
    /** Odeća sa svojim donjim delom (pantalone, suknja): lik ne crta svoje pantalone */
    lower?: boolean;
    /** Okvir sličice u prodavnici (viewBox), ako se razlikuje od izračunatog */
    thumb?: string;
}

/** Oprema po mestu: id predmeta koji je obučen */
export type Wear = Partial<Record<WearSlot, string>>;

// ── Katalog ───────────────────────────────────────────────────────────────────

export const WEAR_ITEMS: readonly WearItem[] = [...HATS, ...GLASSES, ...NECK, ...OUTFITS, ...FEET, ...HANDS, ...BACKS, ...PETS, ...BACKGROUNDS];

const BY_ID = new Map(WEAR_ITEMS.map((item) => [item.id, item]));

export function getWearItem(id: string): WearItem | undefined {
    return BY_ID.get(id);
}

/** Predmet obučen na tom mestu (nepoznat id ili predmet za drugo mesto se ne crta) */
export function wornItem(wear: Wear | undefined, slot: WearSlot): WearItem | undefined {
    const id = wear?.[slot];
    const item = id ? getWearItem(id) : undefined;
    return item?.slot === slot ? item : undefined;
}

/** Gde se crta predmet sa sopstvenim koordinatama (u ruci, ljubimac) */
const PLACE: Partial<Record<WearSlot, string>> = {
    // Predmet u ruci je malo krupniji od prave mere, da se na malom liku jasno vidi
    hand: `translate(${HOLD_X} ${HOLD_Y}) scale(1.25)`,
    pet: `translate(${PET_X} ${GROUND_Y}) scale(1.4)`,
};

interface RenderOptions {
    variant?: WearVariant;
    kind?: CompanionKind;
    /** Deo predmeta na leđima koji se vidi spreda */
    front?: boolean;
    /** Boja kože ili krzna lika (izabrani izgled) */
    tone?: string;
}

/** Crtež predmeta na tom mestu, ili ništa (i kada se to mesto u tom obliku lika ne vidi) */
export function renderWorn(wear: Wear | undefined, slot: WearSlot, { variant = "bust", kind, front = false, tone }: RenderOptions = {}): ReactNode {
    const item = wornItem(wear, slot);
    if (!item || !slotVisible(slot, variant)) return null;
    const art = front ? item.front?.(variant, kind) : item.render(variant, kind, tone);
    if (!art) return null;
    return (
        <g data-wear={item.id} transform={PLACE[slot]}>
            {art}
        </g>
    );
}

// ── Kompleti ──────────────────────────────────────────────────────────────────

export interface WearSet {
    id: string;
    /** Naziv kompleta za dete */
    label: string;
    /** Predmeti po mestu (svi postoje u katalogu i stoje na svom mestu) */
    items: Wear;
}

export const WEAR_SETS: readonly WearSet[] = [
    { id: "astronaut", label: "Astronaut", items: { hat: "astronautski-slem", outfit: "kostim-astronauta", feet: "cizme-astronauta", back: "raketa-ranac", hand: "dvogled", background: "svemir" } },
    { id: "vatrogasac", label: "Vatrogasac", items: { hat: "vatrogasni-slem", outfit: "kostim-vatrogasca", feet: "vatrogasne-cizme", hand: "lampa", pet: "kuce", background: "grad" } },
    { id: "pirat", label: "Pirat", items: { hat: "piratski-sesir", outfit: "kostim-pirata", neck: "marama", hand: "mapa", pet: "papagaj", background: "plaza" } },
    { id: "princeza", label: "Princeza", items: { hat: "tijara", outfit: "haljina-princeze", neck: "ogrlica-srce", feet: "cipele-masna", hand: "stapic-zvezda", background: "zamak" } },
    { id: "princ", label: "Princ", items: { hat: "kruna", outfit: "kostim-princa", back: "kraljevski-plast", feet: "lakovane-cipele", pet: "poni", background: "zamak" } },
    { id: "vitez", label: "Vitez", items: { hat: "slem-viteza", outfit: "kostim-viteza", back: "plast", feet: "kaubojske-cizme", pet: "poni", background: "zamak" } },
    { id: "superheroj", label: "Superheroj", items: { glasses: "maska-superheroja", outfit: "kostim-superheroja", back: "kraljevski-plast", feet: "cizme-superheroja", background: "grad" } },
    { id: "doktor", label: "Doktor", items: { glasses: "naocare", outfit: "kostim-doktora", feet: "plave-patike", hand: "medvedic", pet: "mace", background: "soba" } },
    { id: "kuvar", label: "Kuvar", items: { hat: "kuvarska-kapa", neck: "marama", outfit: "kostim-kuvara", feet: "lakovane-cipele", hand: "varjaca", background: "soba" } },
    { id: "pcelica", label: "Pčelica", items: { hat: "antene", outfit: "kostim-pcelice", back: "krila-pcelice", feet: "zute-patike", hand: "cvet", background: "livada" } },
    { id: "bubamara", label: "Bubamara", items: { hat: "antene", outfit: "kostim-bubamare", back: "krila-bubamare", feet: "crvene-patike", hand: "suncokret", background: "livada" } },
    { id: "dinosaurus", label: "Dinosaurus", items: { hat: "kapa-dino", outfit: "kostim-dinosaurusa", feet: "zelene-patike", pet: "kornjaca", hand: "jabuka", background: "suma" } },
    { id: "meda", label: "Meda", items: { hat: "kapa-meda", outfit: "kostim-mede", feet: "papuce-mede", back: "ranac-meda", hand: "kolacic", background: "suma" } },
    { id: "zimski", label: "Zimski dan", items: { hat: "zimska-kapa", glasses: "skijaske-naocare", neck: "prugasti-sal", outfit: "zimska-jakna", feet: "cizme-sneg", pet: "pingvin", background: "zimski-dan" } },
    { id: "plaza", label: "Na plaži", items: { hat: "sesir", glasses: "suncane-naocare", neck: "ogrlica-cvece", outfit: "kupaci-ribice", feet: "sandale", hand: "kofica", background: "plaza" } },
    { id: "ronilac", label: "Ronilac", items: { glasses: "ronilacka-maska", outfit: "kostim-ronioca", feet: "peraja", back: "boca-ronioca", pet: "ribica", background: "podvodni-svet" } },
    { id: "fudbaler", label: "Fudbaler", items: { hat: "kapa-siltom", neck: "pistaljka", outfit: "fudbalski-dres", feet: "kopacke", hand: "lopta", background: "park" } },
    { id: "kosarkas", label: "Košarkaš", items: { hat: "zelena-kapa-siltom", neck: "medalja", outfit: "kosarkaski-dres", feet: "narandzaste-kopacke", background: "grad" } },
    { id: "carobnjak", label: "Čarobnjak", items: { hat: "sesir-carobnjaka", outfit: "kostim-carobnjaka", back: "plast", hand: "stapic-zvezda", pet: "zecic", background: "svemir" } },
    { id: "kauboj", label: "Kauboj", items: { hat: "kaubojski-sesir", neck: "marama", outfit: "kostim-kauboja", feet: "kaubojske-cizme", hand: "laso", pet: "poni", background: "farma" } },
    { id: "balerina", label: "Balerina", items: { hat: "tijara", outfit: "kostim-balerine", feet: "baletanke", back: "krila-vile", hand: "cvet", background: "soba" } },
    { id: "pilot", label: "Pilot", items: { hat: "kapa-pilota", glasses: "pilotske-naocare", outfit: "kostim-pilota", feet: "lakovane-cipele", back: "krila-ptice", background: "duga" } },
    { id: "farmer", label: "Farmer", items: { hat: "slamnati-sesir", outfit: "kosulja-prsluk", feet: "zute-cizme", hand: "kantica", pet: "pile", background: "farma" } },
    { id: "mornar", label: "Mornar", items: { hat: "mornarska-kapa", neck: "kravata", outfit: "majica-pruge", feet: "plave-patike", hand: "dvogled", background: "plaza" } },
    { id: "kisni-dan", label: "Kišni dan", items: { hat: "zimska-kapa", outfit: "zuta-kabanica", feet: "zute-cizme", hand: "kisobran", pet: "patkica", background: "park" } },
    { id: "laku-noc", label: "Laku noć", items: { outfit: "pidzama", feet: "papuce-zeke", hand: "knjiga", back: "ranac-meda", pet: "mace", background: "soba" } },
    { id: "rodjendan", label: "Rođendan", items: { hat: "rodjendanska-kapa", neck: "leptir-masna", outfit: "haljina-zvezde", feet: "sjajne-patike", hand: "tri-balona", background: "vasar" } },
    { id: "vila", label: "Vila", items: { hat: "cvetni-venac", glasses: "maska-leptira", outfit: "haljina-cvece", back: "krila-vile", hand: "stapic-zvezda", background: "livada" } },
    { id: "slikar", label: "Mali slikar", items: { hat: "sesir", neck: "leptir-masna-tufne", outfit: "kombinezon", feet: "crvene-patike", hand: "cetkica", background: "soba" } },
    { id: "muzicar", label: "Muzičar", items: { glasses: "naocare-zvezde", neck: "leptir-masna", outfit: "odelo", feet: "lakovane-cipele", hand: "gitara", background: "vasar" } },
];

const SET_BY_ID = new Map(WEAR_SETS.map((set) => [set.id, set]));

export function getWearSet(id: string): WearSet | undefined {
    return SET_BY_ID.get(id);
}
