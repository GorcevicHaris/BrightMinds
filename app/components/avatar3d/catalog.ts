// Katalog 3D lika (prototip): tela, koža, oči, kosa i predmeti po mestima. Čisti podaci,
// bez three.js i bez React-a, da ga mogu uvoziti i testovi i (kasnije) serverske rute.
//
// Boje kože i kose koriste iste id-jeve kao 2D izgledi (skins.ts), da sačuvan izbor deteta
// važi i za 3D lik. Predmeti imaju sopstvene id-jeve; veza sa 2D prodavnicom je u docs/avatar3d-plan.md.

export type BodyKind = "girl" | "boy" | "woman" | "man";
export type FigureKind = BodyKind | "cat";

export const FIGURES: readonly { kind: FigureKind; label: string }[] = [
    { kind: "girl", label: "Devojčica" },
    { kind: "boy", label: "Dečak" },
    { kind: "woman", label: "Učiteljica" },
    { kind: "man", label: "Učitelj" },
    { kind: "cat", label: "Mačka" },
];

export interface Swatch {
    id: string;
    label: string;
    /** Glavna boja (sRGB) */
    hex: string;
    /** Druga boja predmeta (rub, šara, đon) */
    accent?: string;
}

export const SKIN_TONES_3D: readonly Swatch[] = [
    { id: "vrlo-svetla", label: "Vrlo svetla", hex: "#F6D2B8" },
    { id: "svetla", label: "Svetla", hex: "#EFC29E" },
    { id: "psenicna", label: "Pšenična", hex: "#E0AC7E" },
    { id: "maslinasta", label: "Maslinasta", hex: "#C99566" },
    { id: "smedja", label: "Smeđa", hex: "#A06E48" },
    { id: "tamna", label: "Tamna", hex: "#7A4E33" },
    { id: "vrlo-tamna", label: "Vrlo tamna", hex: "#5A3624" },
];

export const EYE_COLORS: readonly Swatch[] = [
    { id: "smedje", label: "Smeđe", hex: "#6B4226" },
    { id: "tamne", label: "Tamne", hex: "#3A2418" },
    { id: "plave", label: "Plave", hex: "#3F86C4" },
    { id: "zelene", label: "Zelene", hex: "#5E9A55" },
];

export const HAIR_COLORS_3D: readonly Swatch[] = [
    { id: "crna", label: "Crna", hex: "#2A2224" },
    { id: "smedja", label: "Smeđa", hex: "#5A3824" },
    { id: "kestenjasta", label: "Kestenjasta", hex: "#8C4A26" },
    { id: "plava", label: "Plava", hex: "#D9AE5C" },
    { id: "rida", label: "Riđa", hex: "#C2552A" },
    { id: "seda", label: "Seda", hex: "#C9C9CF" },
];

export type HairStyle =
    | "short" | "curly" | "long" | "ponytail" | "braids" | "buzz" | "bun" | "messy" | "swept" | "wavy" | "straight"
    // Nove frizure motora (looks.ts HairShape)
    | "puffs" | "cornrows" | "bob" | "pixie" | "highbun" | "curlylong" | "sidepart" | "spiky" | "fade" | "pigtails" | "receding" | "afro";

export const HAIR_STYLES_3D: readonly { id: HairStyle; label: string }[] = [
    { id: "short", label: "Kratka" },
    { id: "buzz", label: "Ošišana" },
    { id: "curly", label: "Kovrdžava" },
    { id: "long", label: "Duga" },
    { id: "ponytail", label: "Rep" },
    { id: "braids", label: "Pletenice" },
    { id: "bun", label: "Punđa" },
    { id: "messy", label: "Razbarušene šiške" },
    { id: "swept", label: "Začešljana u stranu" },
    { id: "wavy", label: "Talasasta" },
    { id: "straight", label: "Duga ravna" },
];

export type Expression = "happy" | "neutral";

// ── Predmeti ───────────────────────────────────────────────────────────────────

export type Slot3D = "top" | "bottom" | "long" | "shoes" | "head" | "glasses" | "bag";

export const SLOTS_3D: readonly { slot: Slot3D; label: string }[] = [
    { slot: "top", label: "Gornji deo" },
    { slot: "bottom", label: "Donji deo" },
    { slot: "long", label: "Haljine i kaputi" },
    { slot: "shoes", label: "Obuća" },
    { slot: "head", label: "Na glavi" },
    { slot: "glasses", label: "Naočare" },
    { slot: "bag", label: "Ranac" },
];

export interface Item3D {
    id: string;
    slot: Slot3D;
    label: string;
    /** Varijante boje; prva je podrazumevana */
    colors: readonly Swatch[];
    /** Druga mesta koja ovaj predmet prekriva (dugačka haljina skida gornji i donji deo) */
    covers?: readonly Slot3D[];
}

const c = (id: string, label: string, hex: string, accent?: string): Swatch => ({ id, label, hex, accent });

export const ITEMS_3D: readonly Item3D[] = [
    // Gornji deo
    { id: "majica", slot: "top", label: "Majica", colors: [c("zuta", "Žuta", "#F4C542", "#3F7FD9"), c("plava", "Plava", "#4C8DDB", "#FFD34D"), c("roze", "Roze", "#F28DB2", "#FFFFFF"), c("bela", "Bela", "#F4F2EE", "#E8545A")] },
    { id: "majica-dugi-rukav", slot: "top", label: "Majica dugih rukava", colors: [c("mornarska", "Mornarske pruge", "#F5F3EE", "#2F4E8C"), c("crvene-pruge", "Crvene pruge", "#F5F3EE", "#D9434B"), c("zelena", "Zelena", "#5DAE7C", "#3E8A5B")] },
    { id: "duks", slot: "top", label: "Duks sa kapuljačom", colors: [c("siva", "Siva", "#B9BCC3", "#F2F2F2"), c("ljubicasta", "Ljubičasta", "#8D74D6", "#EDE6FF"), c("zelena", "Zelena", "#4FA67A", "#E8F6EE"), c("crvena", "Crvena", "#D9534F", "#FFFFFF")] },
    { id: "dzemper", slot: "top", label: "Pleteni džemper", colors: [c("krem", "Krem", "#EFE3CC", "#C9B38F"), c("tirkizna", "Tirkizna", "#3FB3B0", "#2E8C89"), c("bordo", "Bordo", "#9C3446", "#7A2335")] },
    { id: "kosulja", slot: "top", label: "Košulja na kocke", colors: [c("crvena", "Crvene kocke", "#D8574F", "#2C2C3A"), c("plava", "Plave kocke", "#4F7FC9", "#FFFFFF"), c("zelena", "Zelene kocke", "#4E9B67", "#F4E9C8")] },
    { id: "dres", slot: "top", label: "Sportski dres", colors: [c("plavi", "Plavi", "#2F6FD6", "#FFFFFF"), c("crveni", "Crveni", "#D93A3A", "#FFFFFF"), c("zeleni", "Zeleni", "#22A061", "#FFE14D")] },
    // Donji deo
    { id: "farmerke", slot: "bottom", label: "Farmerke", colors: [c("plave", "Plave", "#4A6FA5", "#E3A54A"), c("svetle", "Svetle", "#7E9DC8", "#E3A54A"), c("tamne", "Tamne", "#2B3A55", "#C88D3C")] },
    { id: "trenerka", slot: "bottom", label: "Trenerka", colors: [c("siva", "Siva", "#8E939C", "#FFFFFF"), c("teget", "Teget", "#2E3C66", "#FFFFFF"), c("roze", "Roze", "#EE9CBD", "#FFFFFF")] },
    { id: "suknja", slot: "bottom", label: "Plisirana suknja", colors: [c("teget", "Teget", "#2F3D6B"), c("roze", "Roze", "#F09AB9"), c("zuta", "Žuta", "#F2C14E")] },
    { id: "sorc", slot: "bottom", label: "Šorc", colors: [c("bez", "Bež", "#C8B08A"), c("plavi", "Plavi", "#4C7DC4"), c("zeleni", "Zeleni", "#6FA36A")] },
    // Dugačko
    { id: "haljina", slot: "long", label: "Haljina", covers: ["top", "bottom"], colors: [c("ljubicasta", "Ljubičasta", "#A07BD8", "#FFFFFF"), c("crvena", "Crvena", "#D9505B", "#FFFFFF"), c("plava", "Plava", "#5AA0E0", "#FFFFFF"), c("zuta", "Žuta", "#F3C54B", "#FFFFFF")] },
    { id: "dugi-kaput", slot: "long", label: "Dugi kaput", covers: ["top"], colors: [c("bez", "Bež", "#C9AE8A", "#8A6D4B"), c("teget", "Teget", "#2E3A5C", "#C9B07A"), c("maslinasti", "Maslinasti", "#6F7454", "#3F4230"), c("roze", "Roze", "#D9A3A8", "#9C6168")] },
    { id: "abaja", slot: "long", label: "Abaja", covers: ["top", "bottom"], colors: [c("crna", "Crna", "#2A2A33", "#C9A55A"), c("teget", "Teget", "#25304F", "#C9A55A"), c("bez", "Bež", "#CDB79A", "#8C6F4A"), c("zelena", "Zelena", "#3E6656", "#D9C38A")] },
    // Obuća
    { id: "patike", slot: "shoes", label: "Patike", colors: [c("bele", "Bele", "#F2F2F0", "#4C8DDB"), c("crvene", "Crvene", "#E0484E", "#FFFFFF"), c("roze", "Roze", "#F3A0C0", "#FFFFFF"), c("crne", "Crne", "#33343A", "#FFFFFF")] },
    { id: "cizme", slot: "shoes", label: "Čizme", colors: [c("braon", "Braon", "#7A4E30", "#3A2A20"), c("crne", "Crne", "#2C2C30", "#16161A"), c("zute", "Žute", "#F2C230", "#2C2C30")] },
    { id: "sandale", slot: "shoes", label: "Sandale", colors: [c("braon", "Braon", "#9A6A44", "#E9DCC6"), c("roze", "Roze", "#EE8FB4", "#FFFFFF"), c("plave", "Plave", "#4F86D0", "#FFFFFF")] },
    { id: "papuce", slot: "shoes", label: "Papuče", colors: [c("roze", "Roze", "#F6B3CB", "#FFFFFF"), c("plave", "Plave", "#9CC4F0", "#FFFFFF"), c("sive", "Sive", "#C4C6CC", "#FFFFFF")] },
    // Na glavi
    { id: "hidzab", slot: "head", label: "Hidžab", colors: [c("bez", "Bež", "#D8C3A5"), c("roze", "Roze", "#E6A9B6"), c("teget", "Teget", "#2F3B5E"), c("bela", "Bela", "#F2EFEA"), c("zelena", "Zelena", "#7FA88E")] },
    { id: "kacket", slot: "head", label: "Kačket", colors: [c("crveni", "Crveni", "#D9433F", "#FFFFFF"), c("plavi", "Plavi", "#2F6FD6", "#FFFFFF"), c("zuti", "Žuti", "#F2C230", "#2C2C30")] },
    { id: "kapa", slot: "head", label: "Zimska kapa", colors: [c("crvena", "Crvena", "#D9443F", "#FFFFFF"), c("plava", "Plava", "#4F7FC9", "#FFFFFF"), c("zuta", "Žuta", "#F2C14E", "#FFFFFF")] },
    { id: "kruna", slot: "head", label: "Kruna", colors: [c("zlatna", "Zlatna", "#E8B93C", "#E0455A"), c("srebrna", "Srebrna", "#D4D8E0", "#4C8DDB")] },
    // Naočare
    { id: "okrugle-naocare", slot: "glasses", label: "Okrugle naočare", colors: [c("crvene", "Crvene", "#D9433F"), c("plave", "Plave", "#3F78D0"), c("crne", "Crne", "#2A2A30")] },
    { id: "suncane-naocare", slot: "glasses", label: "Sunčane naočare", colors: [c("crne", "Crne", "#25252B", "#3A4050"), c("roze", "Roze", "#F07AA8", "#7A3A5A"), c("bele", "Bele", "#F2F2F2", "#2E4A70")] },
    // Ranac
    { id: "ranac", slot: "bag", label: "Ranac", colors: [c("plavi", "Plavi", "#3F7FD9", "#F2C230"), c("crveni", "Crveni", "#D9433F", "#3A3A44"), c("zeleni", "Zeleni", "#43A06A", "#F28A3A")] },
];

const ITEM_BY_ID = new Map(ITEMS_3D.map((item) => [item.id, item]));

export function getItem3D(id: string): Item3D | undefined {
    return ITEM_BY_ID.get(id);
}

// ── Izgled lika ────────────────────────────────────────────────────────────────

export interface Worn3D {
    id: string;
    /** Indeks varijante boje */
    color: number;
}

export interface AvatarLook {
    figure: FigureKind;
    skin: string;
    eyes: string;
    hair: HairStyle;
    hairColor: string;
    expression: Expression;
    wear: Partial<Record<Slot3D, Worn3D>>;
}

export const DEFAULT_LOOK: AvatarLook = {
    figure: "girl",
    skin: "svetla",
    eyes: "smedje",
    hair: "long",
    hairColor: "smedja",
    expression: "happy",
    wear: { top: { id: "majica", color: 0 }, bottom: { id: "farmerke", color: 0 }, shoes: { id: "patike", color: 0 } },
};

/** Oblači predmet: skida ono što se ne može nositi zajedno (dugačko ↔ gornji/donji deo) */
export function wearItem(look: AvatarLook, id: string, color = 0): AvatarLook {
    const item = getItem3D(id);
    if (!item) return look;
    const wear = { ...look.wear, [item.slot]: { id, color } };
    for (const slot of item.covers ?? []) delete wear[slot];
    // Gornji ili donji deo skida dugačko koje ga prekriva
    for (const [slot, worn] of Object.entries(wear) as [Slot3D, Worn3D][]) {
        if (slot === item.slot) continue;
        const other = getItem3D(worn.id);
        if (other?.covers?.includes(item.slot)) delete wear[slot];
    }
    return { ...look, wear };
}

export function takeOff(look: AvatarLook, slot: Slot3D): AvatarLook {
    const wear = { ...look.wear };
    delete wear[slot];
    return { ...look, wear };
}

export function swatch(list: readonly Swatch[], id: string): Swatch {
    return list.find((s) => s.id === id) ?? list[0];
}

/** Gotovi kompleti — primeri iz stvarnog oblačenja (uključujući hidžab sa dugim kaputom) */
export interface Preset3D {
    id: string;
    label: string;
    look: Partial<AvatarLook>;
}

export const PRESETS_3D: readonly Preset3D[] = [
    {
        id: "hidzab-kaput",
        label: "Hidžab i dugi kaput",
        look: { hair: "long", wear: { head: { id: "hidzab", color: 0 }, long: { id: "dugi-kaput", color: 0 }, bottom: { id: "farmerke", color: 2 }, shoes: { id: "patike", color: 0 } } },
    },
    {
        id: "abaja",
        label: "Abaja i hidžab",
        look: { wear: { head: { id: "hidzab", color: 2 }, long: { id: "abaja", color: 1 }, shoes: { id: "patike", color: 3 } } },
    },
    {
        id: "skola",
        label: "U školu",
        look: { wear: { top: { id: "majica", color: 1 }, bottom: { id: "farmerke", color: 0 }, shoes: { id: "patike", color: 0 }, bag: { id: "ranac", color: 0 } } },
    },
    {
        id: "sport",
        label: "Sport",
        look: { wear: { top: { id: "dres", color: 0 }, bottom: { id: "sorc", color: 1 }, shoes: { id: "patike", color: 1 }, head: { id: "kacket", color: 1 } } },
    },
    {
        id: "zima",
        label: "Zima",
        look: { wear: { top: { id: "duks", color: 1 }, bottom: { id: "trenerka", color: 1 }, shoes: { id: "cizme", color: 0 }, head: { id: "kapa", color: 0 } } },
    },
    {
        id: "svecano",
        label: "Svečano",
        look: { wear: { long: { id: "haljina", color: 0 }, shoes: { id: "sandale", color: 1 }, head: { id: "kruna", color: 0 } } },
    },
    {
        id: "dzemper-suknja",
        label: "Džemper i suknja",
        look: { wear: { top: { id: "dzemper", color: 0 }, bottom: { id: "suknja", color: 0 }, shoes: { id: "cizme", color: 1 }, glasses: { id: "okrugle-naocare", color: 0 } } },
    },
    {
        id: "kosulja",
        label: "Košulja",
        look: { wear: { top: { id: "kosulja", color: 1 }, bottom: { id: "farmerke", color: 2 }, shoes: { id: "papuce", color: 2 } } },
    },
];

export function applyPreset(look: AvatarLook, preset: Preset3D): AvatarLook {
    return { ...look, ...preset.look, wear: { ...(preset.look.wear ?? {}) } };
}
