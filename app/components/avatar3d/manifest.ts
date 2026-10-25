// Spisak svega što se prodaje (predmeti, kompleti, izgledi) — čisti podaci, BEZ three.js.
// Ovo uvoze API ruta (cena i mesto pri kupovini), prodavnica i testovi. 3D crteži istih
// predmeta su u items/<mesto>.ts (registerItems) i učitavaju se samo u pregledaču.
//
// Novi fajl sa podacima se dodaje ovde (jedan uvoz) — imena fajlova su deo ugovora.

import { isAnimalKind, isExtraAnimalKind, isFriendKind, isHumanKind, isMoreAnimalKind, SLOTS, type CompanionKind, type ItemData, type SetData, type SkinData, type Slot } from "./data";
import { ANIMAL_SKINS } from "./animals/skins.data";
import { ITEMS as BACK } from "./items/back.data";
import { ITEMS as BACKGROUND } from "./items/background.data";
import { ITEMS as BOTTOM } from "./items/bottom.data";
import { ITEMS as FEET } from "./items/feet.data";
import { ITEMS as GLASSES } from "./items/glasses.data";
import { ITEMS as HAND } from "./items/hand.data";
import { ITEMS as HAT } from "./items/hat.data";
import { ITEMS as NECK } from "./items/neck.data";
import { ITEMS as OUTFIT } from "./items/outfit.data";
import { ITEMS as PET } from "./items/pet.data";
import { SETS } from "./items/sets.data";
import { COMPANION_KINDS } from "@/lib/companion";
import type { CompanionCatalog } from "@/lib/companion";
import { parseHumanLook } from "./looks";

const BY_SLOT: Record<Slot, readonly ItemData[]> = {
    hat: HAT,
    glasses: GLASSES,
    neck: NECK,
    outfit: OUTFIT,
    bottom: BOTTOM,
    feet: FEET,
    hand: HAND,
    back: BACK,
    pet: PET,
    background: BACKGROUND,
};

/** Svi predmeti, mesto po mesto (redosled u fajlu = redosled u prodavnici) */
export const ITEMS: readonly ItemData[] = SLOTS.flatMap((slot) => BY_SLOT[slot]);

const ITEM_BY_ID = new Map(ITEMS.map((item) => [item.id, item]));
const SET_BY_ID = new Map(SETS.map((set) => [set.id, set]));

export { SETS };

export function itemsOf(slot: Slot): readonly ItemData[] {
    return BY_SLOT[slot];
}

export function getItem(id: string): ItemData | undefined {
    return ITEM_BY_ID.get(id);
}

export function getSet(id: string): SetData | undefined {
    return SET_BY_ID.get(id);
}

/** Izgledi životinje (prvi je podrazumevani); za ljude prazno — njihov izgled je looks.ts */
export function animalSkins(kind: string): readonly SkinData[] {
    return isAnimalKind(kind) || isExtraAnimalKind(kind) || isMoreAnimalKind(kind) || isFriendKind(kind) ? (ANIMAL_SKINS[kind] ?? []) : [];
}

/** Cena izgleda (0 = besplatno), ili undefined za nepoznat drugar ili izgled */
export function skinPrice(kind: string, id: string): number | undefined {
    if (isHumanKind(kind)) return parseHumanLook(kind, id) ? 0 : undefined;
    return animalSkins(kind).find((skin) => skin.id === id)?.price;
}

export function isCompanionKind(value: unknown): value is CompanionKind {
    return typeof value === "string" && (COMPANION_KINDS as readonly string[]).includes(value);
}

/** Katalog za lib/companion.ts (provera kupovine na serveru) */
export const COMPANION_CATALOG: CompanionCatalog = {
    isKind: isCompanionKind,
    item: (id) => {
        const item = getItem(id);
        return item ? { slot: item.slot, price: item.price } : undefined;
    },
    set: getSet,
    skin: (kind, id) => {
        const price = skinPrice(kind, id);
        return price === undefined ? undefined : { price };
    },
};
