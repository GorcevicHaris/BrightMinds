// Izgled drugara: boja krzna životinja i, kod učitelja i učiteljice, boja kože, boja kose i
// frizura. Namerno bez React-a i bez "use client": katalog uvozi i API ruta (provera cene).
//
// Pravila (pravednost):
//  • izgled čoveka — koža, kosa i frizura — je UVEK besplatan: identitet se ne plaća;
//  • životinje imaju 3–4 prirodne boje besplatno, a posebna krzna (tigrasta, dalmatinac,
//    panda, haski, zlatna, duga…) imaju stalnu cenu; nema nasumičnih nagrada;
//  • prvi izgled na spisku je dosadašnji crtež: dete koje ništa ne bira vidi istog drugara.
//
// Id-jevi se čuvaju u bazi (children.settings.companion.skin) — ne menjaju se.
// Izgled čoveka je jedan id od tri dela: `<koža>.<kosa>.<frizura>` (npr. „svetla.smedja.kratka”).

import type { CompanionKind } from "./companions";

export type AnimalKind = "cat" | "dog" | "bunny" | "bear";
export type HumanKind = "woman" | "man";

export function isHumanKind(kind: string): kind is HumanKind {
    return kind === "woman" || kind === "man";
}

// ── Životinje ─────────────────────────────────────────────────────────────────

/** Šare koje se crtaju preko krzna (AnimalAvatar): prate ih i kapci, uši i rep */
export type CoatPattern = "tuxedo" | "calico" | "tiger" | "points" | "spots" | "husky" | "blaze" | "dutch" | "panda" | "gold" | "rainbow";

export interface Coat {
    /** Krzno: osvetljeni deo, osnovna boja i senka */
    fur: [string, string, string];
    /** Njuška (svetliji deo oko nosa i usta) */
    muzzle: string;
    /** Unutrašnjost uha / jastučići šapa */
    inner: string;
    nose: string;
    brow: string;
    /** Dužica: svetlo i tamno */
    iris: [string, string];
    /** Brkovi (mačka i zeka) */
    whisker?: string;
    /** Prugice na čelu (mačka) */
    stripes?: string;
    /** Fleka na temenu (pas) */
    spot?: string;
    /** Uši u svojoj boji (leva i desna na slici); bez toga su u boji krzna */
    ears?: [string, string];
    /** Šape i noge (svetlo i osnovna boja); bez toga su u boji krzna */
    paw?: [string, string];
    /** Rep celog lika; bez toga je u boji krzna */
    tail?: string;
    /** Šara preko krzna i njene boje */
    pattern?: CoatPattern;
    marks?: string[];
    /** Oblik ušiju kad nije uobičajen: uspravne (haski), kovrdžave (pudla), čupave (koala) */
    earShape?: "pointy" | "curly" | "fluffy";
    /** Kovrdže na temenu (pudla) */
    topknot?: boolean;
    /** Krupan nos (koala) */
    bigNose?: boolean;
    /** Obris usta na tamnoj njušci */
    mouthStroke?: string;
    /** Majica, kad se boja krzna ne vidi dobro na uobičajenoj */
    top?: [string, string];
}

export interface AnimalSkin {
    id: string;
    /** Naziv za dete (srpski, latinica) */
    label: string;
    /** 0 = besplatno; posebna krzna 8–30 novčića (stalna cena) */
    price: number;
    coat: Coat;
}

const PASTEL_RAINBOW = ["#FFB3C7", "#FFD0A6", "#FFF1A6", "#BFF0C8", "#B5DEFF", "#D6C2FF"];

/** Zlatno krzno sa iskricama (isto za sve životinje, uz sitne razlike) */
function goldCoat(extra: Partial<Coat> = {}): Coat {
    return {
        fur: ["#FFF6C2", "#F7CC45", "#C9921C"],
        muzzle: "#FFF8D8",
        inner: "#F7A9B6",
        nose: "#B5672A",
        brow: "#B07A14",
        iris: ["#7ED6F2", "#1F7FA8"],
        pattern: "gold",
        marks: ["#FFFFFF"],
        ...extra,
    };
}

/** Pastelne pruge u bojama duge */
function rainbowCoat(extra: Partial<Coat> = {}): Coat {
    return {
        fur: ["#FFFFFF", "#FDE7F1", "#E3C9E8"],
        muzzle: "#FFFFFF",
        inner: "#F9B9C9",
        nose: "#F08AA0",
        brow: "#B59AD0",
        iris: ["#C9A6F2", "#6A3FB0"],
        pattern: "rainbow",
        marks: PASTEL_RAINBOW,
        ...extra,
    };
}

export const ANIMAL_SKINS: Record<AnimalKind, readonly AnimalSkin[]> = {
    cat: [
        {
            id: "narandzasta",
            label: "Narandžasta",
            price: 0,
            coat: { fur: ["#FFE3BD", "#F7B771", "#D98C43"], muzzle: "#FFF4E3", inner: "#F7A9B6", nose: "#F08AA0", brow: "#B5672A", iris: ["#B9DA6A", "#4F7A18"], whisker: "#C98A55", stripes: "#D98C43" },
        },
        {
            id: "siva",
            label: "Siva",
            price: 0,
            coat: { fur: ["#ECEEF2", "#BBC0CA", "#878D9B"], muzzle: "#F7F8FA", inner: "#F4B2BF", nose: "#E98AA0", brow: "#6F7584", iris: ["#F2D35C", "#A8800F"], whisker: "#8F95A3", stripes: "#7D8392" },
        },
        {
            id: "crna",
            label: "Crna",
            price: 0,
            coat: { fur: ["#6E6879", "#3D3946", "#24212B"], muzzle: "#5A5562", inner: "#E79AAC", nose: "#E07D96", brow: "#A29CAE", iris: ["#EDE76E", "#8FA019"], whisker: "#CFC9D8", mouthStroke: "#1E1A22" },
        },
        {
            id: "bela",
            label: "Bela",
            price: 0,
            coat: { fur: ["#FFFFFF", "#F4F2F6", "#D6D1DD"], muzzle: "#FFFFFF", inner: "#F9B9C9", nose: "#F08AA0", brow: "#B8B0C4", iris: ["#9CCBF5", "#2F6DB0"], whisker: "#BDB5C9" },
        },
        {
            id: "crno-bela",
            label: "Crno-bela",
            price: 8,
            coat: {
                fur: ["#FFFFFF", "#F4F2F6", "#D6D1DD"],
                muzzle: "#FFFFFF",
                inner: "#F2A0B2",
                nose: "#F08AA0",
                brow: "#B8B0C4",
                iris: ["#EDE76E", "#8FA019"],
                whisker: "#BDB5C9",
                ears: ["#34303C", "#34303C"],
                tail: "#34303C",
                pattern: "tuxedo",
                marks: ["#34303C"],
            },
        },
        {
            id: "tigrasta",
            label: "Tigrasta",
            price: 12,
            coat: {
                fur: ["#FFE0A8", "#F2A93B", "#C97A1C"],
                muzzle: "#FFF4E3",
                inner: "#F7A9B6",
                nose: "#E98AA0",
                brow: "#7A3E10",
                iris: ["#B9DA6A", "#4F7A18"],
                whisker: "#B9772E",
                pattern: "tiger",
                marks: ["#8A4A14"],
            },
        },
        {
            id: "trobojna",
            label: "Šarena",
            price: 14,
            coat: {
                fur: ["#FFFFFF", "#F6F3EF", "#D8D1C8"],
                muzzle: "#FFFFFF",
                inner: "#F2A0B2",
                nose: "#F08AA0",
                brow: "#B07A4A",
                iris: ["#B9DA6A", "#4F7A18"],
                whisker: "#BDB5C9",
                ears: ["#F2A65A", "#3D3946"],
                tail: "#F2A65A",
                pattern: "calico",
                marks: ["#F2A65A", "#3D3946"],
            },
        },
        {
            id: "sijamska",
            label: "Sijamska",
            price: 16,
            coat: {
                fur: ["#FFF9EF", "#F1E3CB", "#CDB896"],
                muzzle: "#8C6E5C",
                inner: "#C7A08E",
                nose: "#3A2A24",
                brow: "#7A5C4C",
                iris: ["#A9DBFF", "#2F74C0"],
                whisker: "#EADFCC",
                ears: ["#5E4436", "#5E4436"],
                paw: ["#8C6E5C", "#6A4E40"],
                tail: "#5E4436",
                pattern: "points",
                marks: ["#5E4436"],
                mouthStroke: "#2A1810",
            },
        },
        { id: "zlatna", label: "Zlatna", price: 25, coat: goldCoat({ whisker: "#C9921C", nose: "#F08AA0" }) },
        { id: "duga", label: "Duga", price: 30, coat: rainbowCoat({ whisker: "#C8A9DA" }) },
    ],
    dog: [
        {
            id: "bez",
            label: "Bež",
            price: 0,
            coat: {
                fur: ["#FFF2DC", "#EDCB9C", "#C99B63"],
                muzzle: "#FFF9EF",
                inner: "#F3C9A6",
                nose: "#3A2A2A",
                brow: "#8E5A33",
                iris: ["#B07A45", "#4A2A12"],
                ears: ["#B57B50", "#8A5732"],
                spot: "#B57B50",
                tail: "#B57B50",
            },
        },
        {
            id: "braon",
            label: "Braon",
            price: 0,
            coat: {
                fur: ["#DDAE80", "#AC7446", "#7C4C28"],
                muzzle: "#F2D9BC",
                inner: "#E8B996",
                nose: "#2E1E18",
                brow: "#5A3418",
                iris: ["#C8904F", "#5A3212"],
                ears: ["#7A4A26", "#5E3618"],
                tail: "#7A4A26",
            },
        },
        {
            id: "crna",
            label: "Crna",
            price: 0,
            coat: {
                fur: ["#6E6670", "#3D3740", "#231F26"],
                muzzle: "#5E5660",
                inner: "#C9A08E",
                nose: "#141014",
                brow: "#A8A0AE",
                iris: ["#D29A58", "#6A3C16"],
                ears: ["#2C272F", "#1E1A21"],
                tail: "#2C272F",
                mouthStroke: "#1A1418",
            },
        },
        {
            id: "bela",
            label: "Bela",
            price: 0,
            coat: {
                fur: ["#FFFFFF", "#F6F3EF", "#DAD3C9"],
                muzzle: "#FFFFFF",
                inner: "#F6CBB8",
                nose: "#3A2A2A",
                brow: "#B8AA98",
                iris: ["#B07A45", "#4A2A12"],
                ears: ["#EFE8DE", "#DDD4C8"],
                tail: "#EFE8DE",
            },
        },
        {
            id: "retriver",
            label: "Zlatni retriver",
            price: 8,
            coat: {
                fur: ["#FFE7B0", "#EDB765", "#C68A36"],
                muzzle: "#FFF1D4",
                inner: "#F3C9A6",
                nose: "#3A2A2A",
                brow: "#9A6424",
                iris: ["#B07A45", "#4A2A12"],
                ears: ["#DB9C4A", "#BA7C30"],
                tail: "#DB9C4A",
            },
        },
        {
            id: "bigl",
            label: "Bigl",
            price: 10,
            coat: {
                fur: ["#F8D29E", "#D99A50", "#A86A2A"],
                muzzle: "#FFFFFF",
                inner: "#F3C9A6",
                nose: "#2E1E18",
                brow: "#6E3E1A",
                iris: ["#B07A45", "#4A2A12"],
                ears: ["#8A5226", "#6E3E1A"],
                tail: "#2E2A2A",
                pattern: "blaze",
                marks: ["#FFFFFF"],
            },
        },
        {
            id: "dalmatinac",
            label: "Dalmatinac",
            price: 14,
            coat: {
                fur: ["#FFFFFF", "#F4F4F6", "#D4D4DC"],
                muzzle: "#FFFFFF",
                inner: "#F6CBB8",
                nose: "#2A2A30",
                brow: "#2A2A30",
                iris: ["#B07A45", "#4A2A12"],
                ears: ["#2A2A30", "#2A2A30"],
                pattern: "spots",
                marks: ["#2A2A30"],
            },
        },
        {
            id: "pudla",
            label: "Pudla",
            price: 16,
            coat: {
                fur: ["#FFF3E8", "#F4D2B6", "#D6A882"],
                muzzle: "#FFF8F0",
                inner: "#F3C9A6",
                nose: "#3A2A2A",
                brow: "#B07E58",
                iris: ["#B07A45", "#4A2A12"],
                ears: ["#EDC4A2", "#DDAE88"],
                tail: "#EDC4A2",
                earShape: "curly",
                topknot: true,
            },
        },
        {
            id: "haski",
            label: "Haski",
            price: 18,
            coat: {
                fur: ["#FFFFFF", "#F2F4F8", "#D2D8E2"],
                muzzle: "#FFFFFF",
                inner: "#F4C7CF",
                nose: "#2A2A30",
                brow: "#FFFFFF",
                iris: ["#A9DBFF", "#2F74C0"],
                ears: ["#7C8696", "#6A7484"],
                tail: "#7C8696",
                pattern: "husky",
                marks: ["#7C8696"],
                earShape: "pointy",
            },
        },
        { id: "zlatna", label: "Zlatna sjajna", price: 25, coat: goldCoat({ nose: "#3A2A2A", ears: ["#E9B530", "#C9921C"], tail: "#E9B530" }) },
        { id: "duga", label: "Duga", price: 30, coat: rainbowCoat({ nose: "#3A2A2A" }) },
    ],
    bunny: [
        {
            id: "bela",
            label: "Bela",
            price: 0,
            coat: { fur: ["#FFFFFF", "#F2EDF7", "#CFC5DE"], muzzle: "#FFFFFF", inner: "#F9B9C9", nose: "#F08AA0", brow: "#A99BBE", iris: ["#8E78C8", "#33255E"], whisker: "#B9AECB", tail: "#FFFFFF" },
        },
        {
            id: "siva",
            label: "Siva",
            price: 0,
            coat: { fur: ["#EEF0F4", "#C2C7D1", "#8F96A5"], muzzle: "#F7F8FA", inner: "#F4B9C6", nose: "#E98AA0", brow: "#7B8292", iris: ["#B07A45", "#4A2A12"], whisker: "#9AA1AF", tail: "#FFFFFF" },
        },
        {
            id: "braon",
            label: "Braon",
            price: 0,
            coat: { fur: ["#EBCDAE", "#C79B70", "#966A40"], muzzle: "#F7E6D2", inner: "#F2B6B6", nose: "#D9788C", brow: "#7A5230", iris: ["#B07A45", "#4A2A12"], whisker: "#A07A55", tail: "#FFFFFF" },
        },
        {
            id: "crno-bela",
            label: "Crno-bela",
            price: 8,
            coat: {
                fur: ["#FFFFFF", "#F4F2F6", "#D6D1DD"],
                muzzle: "#FFFFFF",
                inner: "#F9B9C9",
                nose: "#F08AA0",
                brow: "#D8D2E0",
                iris: ["#8E78C8", "#33255E"],
                whisker: "#B9AECB",
                ears: ["#34303C", "#34303C"],
                tail: "#FFFFFF",
                pattern: "dutch",
                marks: ["#34303C"],
            },
        },
        {
            id: "roze",
            label: "Roze",
            price: 12,
            coat: {
                fur: ["#FFF0F6", "#FBCFE0", "#E9A3C0"],
                muzzle: "#FFF6FA",
                inner: "#F58FB0",
                nose: "#E9708F",
                brow: "#D27FA0",
                iris: ["#8E78C8", "#33255E"],
                whisker: "#E0A3BE",
                tail: "#FFFFFF",
                top: ["#B9E6FF", "#4FA3E0"],
            },
        },
        { id: "zlatna", label: "Zlatna", price: 25, coat: goldCoat({ whisker: "#C9921C", nose: "#F08AA0", tail: "#FFF6C2" }) },
        { id: "duga", label: "Duga", price: 30, coat: rainbowCoat({ whisker: "#C8A9DA", tail: "#FFFFFF" }) },
    ],
    bear: [
        {
            id: "braon",
            label: "Braon",
            price: 0,
            coat: { fur: ["#E6BA8E", "#BC8656", "#8A5A30"], muzzle: "#F7E0C4", inner: "#F1CBA4", nose: "#4A2E1E", brow: "#6E4424", iris: ["#A87444", "#3A200C"], tail: "#BC8656" },
        },
        {
            id: "svetlo-braon",
            label: "Svetlo-braon",
            price: 0,
            coat: { fur: ["#FAE2C0", "#E6BA88", "#BC8C5C"], muzzle: "#FFF3E2", inner: "#F6D7B8", nose: "#5A3A26", brow: "#9A6A40", iris: ["#A87444", "#3A200C"], tail: "#E6BA88" },
        },
        {
            id: "polarni",
            label: "Polarni",
            price: 0,
            coat: { fur: ["#FFFFFF", "#F3F1EA", "#D3CEC0"], muzzle: "#FFFFFF", inner: "#E9DFD0", nose: "#2A2228", brow: "#B5AE9E", iris: ["#7A6A5A", "#2A2018"], tail: "#F3F1EA" },
        },
        {
            id: "koala",
            label: "Koala",
            price: 12,
            coat: {
                fur: ["#E6E8EC", "#ADB2BC", "#7C828E"],
                muzzle: "#D9DCE2",
                inner: "#FFFFFF",
                nose: "#3A3238",
                brow: "#5E6470",
                iris: ["#7A5A3A", "#2A180C"],
                tail: "#ADB2BC",
                earShape: "fluffy",
                bigNose: true,
            },
        },
        {
            id: "panda",
            label: "Panda",
            price: 18,
            coat: {
                fur: ["#FFFFFF", "#F4F4F2", "#D6D6D2"],
                muzzle: "#FFFFFF",
                inner: "#4A4A50",
                nose: "#2A2A2E",
                brow: "#2A2A2E",
                iris: ["#7A5A3A", "#2A180C"],
                ears: ["#2A2A2E", "#2A2A2E"],
                paw: ["#45454B", "#2A2A2E"],
                tail: "#FFFFFF",
                pattern: "panda",
                marks: ["#2A2A2E"],
            },
        },
        { id: "zlatna", label: "Zlatna", price: 25, coat: goldCoat({ nose: "#6E4424", inner: "#FFE7A0" }) },
        { id: "duga", label: "Duga", price: 30, coat: rainbowCoat({ nose: "#6E4424", inner: "#FFE0EC" }) },
    ],
};

// ── Ljudi ─────────────────────────────────────────────────────────────────────

export interface HumanPart {
    id: string;
    label: string;
}

export interface ColorPart extends HumanPart {
    /** Osvetljeni deo, osnovna boja i senka */
    colors: [string, string, string];
}

/** Boje kože, od najsvetlije do najtamnije (sve besplatne) */
export const SKIN_TONES: readonly ColorPart[] = [
    { id: "vrlo-svetla", label: "Vrlo svetla koža", colors: ["#FFE8D4", "#F8CEAC", "#E0A481"] },
    { id: "svetla", label: "Svetla koža", colors: ["#FFE3C8", "#F4C39C", "#D99870"] },
    { id: "psenicna", label: "Pšenična koža", colors: ["#F8D6AE", "#E3B07E", "#B98250"] },
    { id: "maslinasta", label: "Maslinasta koža", colors: ["#EBC497", "#C99868", "#9A6A3E"] },
    { id: "smedja", label: "Smeđa koža", colors: ["#CE9A74", "#A66E48", "#76482A"] },
    { id: "tamna", label: "Tamna koža", colors: ["#A2714F", "#7A4C31", "#52301C"] },
    { id: "vrlo-tamna", label: "Vrlo tamna koža", colors: ["#80573E", "#5C3826", "#3C2216"] },
];

/** Boje kose (sve besplatne) */
export const HAIR_COLORS: readonly ColorPart[] = [
    { id: "crna", label: "Crna kosa", colors: ["#5A5058", "#2C2429", "#151014"] },
    { id: "smedja", label: "Smeđa kosa", colors: ["#8A5B3C", "#5C3A25", "#3A2316"] },
    { id: "kestenjasta", label: "Kestenjasta kosa", colors: ["#B86B3C", "#8A4A26", "#5E2E15"] },
    { id: "plava", label: "Plava kosa", colors: ["#FFE7A0", "#ECC25A", "#BC8E2E"] },
    { id: "rida", label: "Riđa kosa", colors: ["#F7A062", "#DB6A2E", "#A8461C"] },
    { id: "seda", label: "Seda kosa", colors: ["#FAFAFC", "#D2D3DB", "#9A9CA8"] },
];

/** Frizure (sve besplatne); prva je dosadašnji crtež */
export const HAIRSTYLES: Record<HumanKind, readonly HumanPart[]> = {
    woman: [
        { id: "do-ramena", label: "Kosa do ramena" },
        { id: "duga", label: "Duga kosa" },
        { id: "rep", label: "Rep" },
        { id: "pletenice", label: "Pletenice" },
        { id: "kratka-kovrdzava", label: "Kratka kovrdžava" },
        { id: "kratka", label: "Kratka kosa" },
    ],
    man: [
        { id: "kratka", label: "Kratka kosa" },
        { id: "kovrdzava", label: "Kovrdžava kosa" },
        { id: "duza", label: "Duža kosa" },
        { id: "osisana", label: "Ošišana na kratko" },
        { id: "bez-kose", label: "Bez kose" },
    ],
};

export interface HumanLook {
    tone: string;
    hair: string;
    style: string;
}

/** Dosadašnji izgled učiteljice i učitelja */
export const HUMAN_DEFAULT: Record<HumanKind, HumanLook> = {
    woman: { tone: "vrlo-svetla", hair: "kestenjasta", style: "do-ramena" },
    man: { tone: "svetla", hair: "smedja", style: "kratka" },
};

export function humanSkinId(look: HumanLook): string {
    return `${look.tone}.${look.hair}.${look.style}`;
}

/** `<koža>.<kosa>.<frizura>` → delovi, ili undefined kad neki deo nije poznat */
export function parseHumanSkin(kind: HumanKind, id: string): HumanLook | undefined {
    const [tone, hair, style, ...rest] = id.split(".");
    if (rest.length > 0) return undefined;
    if (!SKIN_TONES.some((part) => part.id === tone)) return undefined;
    if (!HAIR_COLORS.some((part) => part.id === hair)) return undefined;
    if (!HAIRSTYLES[kind].some((part) => part.id === style)) return undefined;
    return { tone, hair, style };
}

/** Izgled čoveka za crtanje: nepoznat ili prazan id daje dosadašnji izgled */
export function humanLook(kind: HumanKind, id: string | undefined): HumanLook {
    return (id && parseHumanSkin(kind, id)) || HUMAN_DEFAULT[kind];
}

export function toneColors(id: string): [string, string, string] {
    return (SKIN_TONES.find((part) => part.id === id) ?? SKIN_TONES[0]).colors;
}

export function hairColors(id: string): [string, string, string] {
    return (HAIR_COLORS.find((part) => part.id === id) ?? HAIR_COLORS[1]).colors;
}

// ── Zajedničko ────────────────────────────────────────────────────────────────

/** Dosadašnji izgled drugara (dete ga vidi dok ništa ne izabere) */
export function defaultSkin(kind: CompanionKind): string {
    return isHumanKind(kind) ? humanSkinId(HUMAN_DEFAULT[kind]) : ANIMAL_SKINS[kind][0].id;
}

/** Krzno životinje za crtanje: nepoznat ili prazan id daje dosadašnje krzno */
export function animalSkin(kind: AnimalKind, id: string | undefined): AnimalSkin {
    const list = ANIMAL_SKINS[kind];
    return list.find((skin) => skin.id === id) ?? list[0];
}

/** Cena izgleda (0 = besplatno), ili undefined za nepoznat drugar ili izgled */
export function skinPrice(kind: string, id: string): number | undefined {
    if (isHumanKind(kind)) return parseHumanSkin(kind, id) ? 0 : undefined;
    if (!(kind in ANIMAL_SKINS)) return undefined;
    return ANIMAL_SKINS[kind as AnimalKind].find((skin) => skin.id === id)?.price;
}

/** Naziv izgleda za dete (životinje), ili undefined */
export function skinLabel(kind: string, id: string): string | undefined {
    if (isHumanKind(kind) || !(kind in ANIMAL_SKINS)) return undefined;
    return ANIMAL_SKINS[kind as AnimalKind].find((skin) => skin.id === id)?.label;
}
