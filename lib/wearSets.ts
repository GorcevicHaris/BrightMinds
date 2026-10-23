// lib/wearSets.ts
// Kompleti (gotovi izgledi) — privremeno mesto dok katalog crteža
// (app/components/avatar/wearables.tsx) ne dobije WEAR_SETS i getWearSet istog oblika.
// Posle spajanja API ruta, stanje pratioca i prodavnica uvoze odande, a ovaj fajl se briše.
// Bez "use client": koristi ga i API ruta (provera kupovine kompleta).

import type { CompanionWear } from "./companion";

export interface WearSet {
    id: string;
    /** Naziv za dete (srpski, latinica) */
    label: string;
    /** Predmeti kompleta po mestu (id-jevi iz WEAR_ITEMS) */
    items: CompanionWear;
}

// posle spajanja: WEAR_SETS
export const WEAR_SETS: readonly WearSet[] = [];

// posle spajanja: WEAR_SETS (getWearSet iz wearables.tsx)
export function getWearSet(id: string): WearSet | undefined {
    return WEAR_SETS.find((set) => set.id === id);
}
