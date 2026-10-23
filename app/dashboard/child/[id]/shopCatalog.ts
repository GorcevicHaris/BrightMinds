// Prodavnica „Moj drugar”: kategorije (čipovi), podvrste i stalan redosled predmeta.
// Jedan čip = samo jedna vrsta stvari (nema mešanih „Sve” strana ni preporuka): kategorija
// prikazuje samo svoje predmete, podvrsta samo svoju podvrstu. Redosled je uvek isti:
// od najjeftinijeg, pa po nazivu.

import { SUBGROUPS, type ItemData, type Slot } from "@/app/components/avatar3d/data";
import { ITEMS } from "@/app/components/avatar3d/manifest";

export type CategoryId = Slot | "sets";

export interface Category {
    id: CategoryId;
    label: string;
}

/** Čipovi kategorija, uvek istim redom */
export const CATEGORY_ORDER: readonly Category[] = [
    { id: "sets", label: "Kompleti" },
    { id: "hat", label: "Kape" },
    { id: "glasses", label: "Naočare" },
    { id: "neck", label: "Oko vrata" },
    { id: "outfit", label: "Odeća" },
    { id: "bottom", label: "Donji deo" },
    { id: "feet", label: "Obuća" },
    { id: "hand", label: "U ruci" },
    { id: "back", label: "Na leđima" },
    { id: "pet", label: "Ljubimci" },
    { id: "background", label: "Pozadine" },
];

const byPrice = (a: ItemData, b: ItemData) => a.price - b.price || a.label.localeCompare(b.label, "sr");

const BY_SLOT = new Map<Slot, ItemData[]>();
for (const item of ITEMS) {
    const list = BY_SLOT.get(item.slot) ?? [];
    list.push(item);
    BY_SLOT.set(item.slot, list);
}
for (const list of BY_SLOT.values()) list.sort(byPrice);

export function itemsInSlot(slot: Slot): readonly ItemData[] {
    return BY_SLOT.get(slot) ?? [];
}

/** Podvrsta kad je katalog ne navodi: pogađa se po id-ju predmeta */
const GUESS: Partial<Record<Slot, [RegExp, string][]>> = {
    hat: [[/kruna|tijara/, "krune"], [/slem/, "slemovi"], [/sesir/, "sesiri"], [/venac|masna|antene|traka|snala/, "za-kosu"], [/kap/, "kape"]],
    glasses: [[/maska/, "maske"], [/./, "naocare"]],
    neck: [[/mindjuse/, "mindjuse"], [/masna|kravata/, "masne"], [/sal|marama/, "marame"], [/./, "ogrlice"]],
    outfit: [
        [/kostim|haljina-princeze/, "kostimi"], [/kombinezon/, "kombinezoni"], [/odelo|prsluk/, "svecano"], [/haljina/, "haljine"],
        [/pidzama/, "pidzame"], [/duks|dzemper/, "duksevi"], [/jakna|kabanica|kaput/, "jakne"], [/dres|trenerka|kupaci/, "sport"], [/./, "majice"],
    ],
    bottom: [[/suknja/, "suknje"], [/sorc/, "sorcevi"], [/./, "pantalone"]],
    feet: [[/sandal|peraj/, "sandale"], [/papuc/, "papuce"], [/cizm/, "cizme"], [/cipel|baletank|lakovan/, "cipele"], [/./, "patike"]],
};

export function groupOf(item: ItemData): string | undefined {
    if (item.group) return item.group;
    return GUESS[item.slot]?.find(([pattern]) => pattern.test(item.id))?.[1];
}

/** Podvrste mesta koje zaista imaju predmete (prazne se ne prikazuju) */
export function subgroupsOf(slot: Slot, items: readonly ItemData[] = itemsInSlot(slot)): { id: string; label: string }[] {
    const present = new Set(items.map(groupOf));
    return (SUBGROUPS[slot] ?? []).filter((group) => present.has(group.id));
}
