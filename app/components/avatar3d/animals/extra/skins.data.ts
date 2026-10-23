// Izgledi dodatnih životinja — čisti podaci (bez three.js). Vlasnik: #2b.
// Spaja se u ANIMAL_SKINS (animals/skins.data.ts); vrsta se nudi kad je motor doda u ANIMAL_KINDS.

import type { SkinData } from "../../data";

export const EXTRA_SKINS: Readonly<Record<string, readonly SkinData[]>> = {};
