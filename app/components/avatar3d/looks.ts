// Izgled čoveka (devojčica, dečak, učiteljica, učitelj): boja kože, boja očiju, boja kose,
// frizura i hidžab. Sve je UVEK besplatno — identitet se ne plaća. Čisti podaci, bez three.js:
// uvozi ga i server (provera izbora).
//
// Zapis u bazi (children.settings.companion.skin[<drugar>]) je jedan id od pet delova:
//   `<koža>.<oči>.<kosa>.<frizura>.<hidžab>`   npr. „svetla.smedje.smedja.duga.nema”
// Stari 2D zapis od tri dela `<koža>.<kosa>.<frizura>` i dalje važi (oči smeđe, bez hidžaba),
// pa izgled koji je dete ranije izabralo ostaje isti.

import { isHumanKind, type HumanKind } from "./data";

export interface LookPart {
    id: string;
    label: string;
}

export interface ColorLookPart extends LookPart {
    /** Boja za 3D (sRGB) */
    hex: string;
}

/** Boje kože (iste id-jeve ima 2D izgled, skins.ts), od najsvetlije do najtamnije */
export const SKIN_TONES: readonly ColorLookPart[] = [
    { id: "vrlo-svetla", label: "Vrlo svetla koža", hex: "#F8CFB2" },
    { id: "svetla", label: "Svetla koža", hex: "#F2BE96" },
    { id: "psenicna", label: "Pšenična koža", hex: "#E2A374" },
    { id: "maslinasta", label: "Maslinasta koža", hex: "#C98A5A" },
    { id: "smedja", label: "Smeđa koža", hex: "#A2673F" },
    { id: "tamna", label: "Tamna koža", hex: "#7E4A2C" },
    { id: "vrlo-tamna", label: "Vrlo tamna koža", hex: "#5E3521" },
];

export const EYE_COLORS: readonly ColorLookPart[] = [
    { id: "smedje", label: "Smeđe oči", hex: "#8A5630" },
    { id: "tamne", label: "Tamne oči", hex: "#5A3522" },
    { id: "lesnik", label: "Oči boje lešnika", hex: "#B08A3C" },
    { id: "zelene", label: "Zelene oči", hex: "#6DB565" },
    { id: "plave", label: "Plave oči", hex: "#5AA8E8" },
    { id: "sive", label: "Sive oči", hex: "#7D8A96" },
];

/** Boje kose (isti id-jevi kao 2D) */
export const HAIR_COLORS: readonly ColorLookPart[] = [
    { id: "crna", label: "Crna kosa", hex: "#2A2224" },
    { id: "smedja", label: "Smeđa kosa", hex: "#5A3824" },
    { id: "kestenjasta", label: "Kestenjasta kosa", hex: "#8C4A26" },
    { id: "plava", label: "Plava kosa", hex: "#D9AE5C" },
    { id: "rida", label: "Riđa kosa", hex: "#C2552A" },
    { id: "seda", label: "Seda kosa", hex: "#C9C9CF" },
];

/** Oblik kose u 3D (engine/hair.ts) za svaku frizuru */
export type HairShape = "short" | "curly" | "long" | "shoulder" | "ponytail" | "braids" | "buzz" | "bun" | "none";

export interface HairStylePart extends LookPart {
    shape: HairShape;
}

const STYLE: Record<string, HairStylePart> = {
    "do-ramena": { id: "do-ramena", label: "Kosa do ramena", shape: "shoulder" },
    duga: { id: "duga", label: "Duga kosa", shape: "long" },
    rep: { id: "rep", label: "Rep", shape: "ponytail" },
    pletenice: { id: "pletenice", label: "Pletenice", shape: "braids" },
    pundja: { id: "pundja", label: "Punđa", shape: "bun" },
    "kratka-kovrdzava": { id: "kratka-kovrdzava", label: "Kratka kovrdžava", shape: "curly" },
    kratka: { id: "kratka", label: "Kratka kosa", shape: "short" },
    kovrdzava: { id: "kovrdzava", label: "Kovrdžava kosa", shape: "curly" },
    duza: { id: "duza", label: "Duža kosa", shape: "shoulder" },
    osisana: { id: "osisana", label: "Ošišana na kratko", shape: "buzz" },
    "bez-kose": { id: "bez-kose", label: "Bez kose", shape: "none" },
};

/** Frizure po drugaru; prva je podrazumevana (kod učiteljice i učitelja — dosadašnji 2D crtež) */
export const HAIRSTYLES: Record<HumanKind, readonly HairStylePart[]> = {
    girl: [STYLE.duga, STYLE["do-ramena"], STYLE.rep, STYLE.pletenice, STYLE.pundja, STYLE["kratka-kovrdzava"], STYLE.kratka],
    boy: [STYLE.kratka, STYLE.kovrdzava, STYLE.duza, STYLE.osisana],
    woman: [STYLE["do-ramena"], STYLE.duga, STYLE.rep, STYLE.pletenice, STYLE.pundja, STYLE["kratka-kovrdzava"], STYLE.kratka],
    man: [STYLE.kratka, STYLE.kovrdzava, STYLE.duza, STYLE.osisana, STYLE["bez-kose"]],
};

/** Bez hidžaba */
export const NO_HIJAB = "nema";

/** Boje hidžaba (besplatno, kao i ostatak izgleda); nudi se devojčici i učiteljici */
export const HIJAB_COLORS: readonly ColorLookPart[] = [
    { id: "krem", label: "Krem hidžab", hex: "#E3D3BC" },
    { id: "bela", label: "Beli hidžab", hex: "#F2EFEA" },
    { id: "roze", label: "Roze hidžab", hex: "#E6A9B6" },
    { id: "ljubicasta", label: "Ljubičasti hidžab", hex: "#A68BC9" },
    { id: "plava", label: "Plavi hidžab", hex: "#7FA7D9" },
    { id: "zelena", label: "Zeleni hidžab", hex: "#7FA88E" },
    { id: "teget", label: "Teget hidžab", hex: "#2F3B5E" },
    { id: "crna", label: "Crni hidžab", hex: "#2A2A30" },
];

/** Kroj hidžaba: id se dodaje boji (`roze` = omotan, `roze-sportski` = sportski, iz jednog dela) */
export const HIJAB_STYLES: readonly LookPart[] = [
    { id: "omotan", label: "Omotan hidžab" },
    { id: "sportski", label: "Sportski hidžab" },
];

const SPORT = "-sportski";

/** Vrednost hidžaba → boja i kroj (ili null bez hidžaba / za neispravnu vrednost) */
export function hijabParts(value: string): { color: string; style: "omotan" | "sportski" } | null {
    if (value === NO_HIJAB) return null;
    const sport = value.endsWith(SPORT);
    const color = sport ? value.slice(0, -SPORT.length) : value;
    return HIJAB_COLORS.some((part) => part.id === color) ? { color, style: sport ? "sportski" : "omotan" } : null;
}

export function hijabValue(color: string, style: "omotan" | "sportski"): string {
    return style === "sportski" ? color + SPORT : color;
}

export function hasHijabOption(kind: HumanKind): boolean {
    return kind === "girl" || kind === "woman";
}

export interface HumanLook {
    tone: string;
    eye: string;
    hair: string;
    style: string;
    /** Boja hidžaba ili NO_HIJAB */
    hijab: string;
}

export const HUMAN_DEFAULT: Record<HumanKind, HumanLook> = {
    girl: { tone: "psenicna", eye: "lesnik", hair: "smedja", style: "duga", hijab: NO_HIJAB },
    boy: { tone: "svetla", eye: "plave", hair: "smedja", style: "kratka", hijab: NO_HIJAB },
    // Kao dosadašnja 2D učiteljica i učitelj (skins.ts HUMAN_DEFAULT)
    woman: { tone: "vrlo-svetla", eye: "smedje", hair: "kestenjasta", style: "do-ramena", hijab: NO_HIJAB },
    man: { tone: "svetla", eye: "smedje", hair: "smedja", style: "kratka", hijab: NO_HIJAB },
};

export function humanLookId(look: HumanLook): string {
    return `${look.tone}.${look.eye}.${look.hair}.${look.style}.${look.hijab}`;
}

const known = (list: readonly LookPart[], id: string | undefined) => id !== undefined && list.some((part) => part.id === id);

/** Id → delovi izgleda, ili undefined kad id nije ispravan (prima i stari zapis od tri dela) */
export function parseHumanLook(kind: HumanKind, id: string): HumanLook | undefined {
    const parts = id.split(".");
    let look: HumanLook;
    if (parts.length === 3) look = { tone: parts[0], eye: HUMAN_DEFAULT[kind].eye, hair: parts[1], style: parts[2], hijab: NO_HIJAB };
    else if (parts.length === 5) look = { tone: parts[0], eye: parts[1], hair: parts[2], style: parts[3], hijab: parts[4] };
    else return undefined;
    if (!known(SKIN_TONES, look.tone) || !known(EYE_COLORS, look.eye) || !known(HAIR_COLORS, look.hair)) return undefined;
    if (!known(HAIRSTYLES[kind], look.style)) return undefined;
    if (look.hijab !== NO_HIJAB && (!hasHijabOption(kind) || !hijabParts(look.hijab))) return undefined;
    return look;
}

/** Izgled za crtanje: nepoznat ili prazan id daje podrazumevani izgled */
export function humanLook(kind: HumanKind, id: string | undefined): HumanLook {
    return (id && parseHumanLook(kind, id)) || HUMAN_DEFAULT[kind];
}

export function hairShape(kind: HumanKind, style: string): HairShape {
    return (HAIRSTYLES[kind].find((part) => part.id === style) ?? HAIRSTYLES[kind][0]).shape;
}

export function partHex(list: readonly ColorLookPart[], id: string): string {
    return (list.find((part) => part.id === id) ?? list[0]).hex;
}

/** Izgled za 3D motor: čovek dobija delove izgleda, životinja id krzna (nepoznat → prvi) */
export function companionLook(kind: string, skin: string | undefined): { kind: string; skin: string; human?: HumanLook } {
    return isHumanKind(kind) ? { kind, skin: "", human: humanLook(kind, skin) } : { kind, skin: skin ?? "" };
}
