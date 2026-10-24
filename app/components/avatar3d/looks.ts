// Izgled čoveka (devojčica, dečak, učiteljica, učitelj, tinejdžerka, tinejdžer, nana, dedo):
// boja kože, boja očiju, boja kose, frizura, hidžab, pegice i brada/brkovi (učitelj, dedo).
// Sve je UVEK besplatno — identitet se ne plaća (i vesele boje kose su besplatne).
// Čisti podaci, bez three.js: uvozi ga i server (provera izbora).
//
// Zapis u bazi (children.settings.companion.skin[<drugar>]) je jedan id od pet delova:
//   `<koža>.<oči>.<kosa>.<frizura>.<hidžab>`   npr. „svetla.smedje.smedja.duga.nema”
// Pegice i brada se dopisuju samo kad nisu podrazumevane (pa stari id-jevi ostaju isti):
//   `….<hidžab>.<pegice>`            npr. „svetla.plave.smedja.kratka.nema.malo”
//   `….<hidžab>.<pegice>.<brada>`    npr. „svetla.smedje.crna.talasasta.nema.bez.brada”
// Stari 2D zapis od tri dela `<koža>.<kosa>.<frizura>` i dalje važi (oči smeđe, bez hidžaba),
// pa izgled koji je dete ranije izabralo ostaje isti.

import { HUMAN_TRAITS, isHumanKind, type HumanKind } from "./data";

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
    // Prvih sedam su dosadašnji izgledi (isti id-jevi kao 2D); ostali su dodati za veći izbor
    { id: "vrlo-svetla", label: "Vrlo svetla koža", hex: "#F8CFB2" },
    { id: "svetla", label: "Svetla koža", hex: "#F2BE96" },
    { id: "psenicna", label: "Pšenična koža", hex: "#E2A374" },
    { id: "maslinasta", label: "Maslinasta koža", hex: "#C98A5A" },
    { id: "smedja", label: "Smeđa koža", hex: "#A2673F" },
    { id: "tamna", label: "Tamna koža", hex: "#7E4A2C" },
    { id: "vrlo-tamna", label: "Vrlo tamna koža", hex: "#5E3521" },
    { id: "porcelan", label: "Porcelanska koža", hex: "#FBDCC8" },
    { id: "ruzicasta", label: "Ružičasta koža", hex: "#F5C6B0" },
    { id: "breskva", label: "Koža boje breskve", hex: "#F4B98F" },
    { id: "medena", label: "Medena koža", hex: "#E7B077" },
    { id: "zlatna", label: "Zlatna koža", hex: "#DDA066" },
    { id: "karamel", label: "Karamel koža", hex: "#C98E5E" },
    { id: "bakarna", label: "Bakarna koža", hex: "#BD7B4E" },
    { id: "lesnik", label: "Koža boje lešnika", hex: "#B27448" },
    { id: "cimet", label: "Koža boje cimeta", hex: "#9C5F3B" },
    { id: "kakao", label: "Koža boje kakaa", hex: "#8A5534" },
    { id: "kafa", label: "Koža boje kafe", hex: "#6F4229" },
    { id: "espreso", label: "Koža boje espresa", hex: "#55311F" },
    { id: "ebanovina", label: "Koža boje ebanovine", hex: "#46281A" },
    { id: "pesak", label: "Koža boje peska", hex: "#D9A27A" },
    { id: "maslina-svetla", label: "Svetla maslinasta koža", hex: "#D0A06C" },
    { id: "maslina-tamna", label: "Tamna maslinasta koža", hex: "#A87A4E" },
    { id: "topla-smedja", label: "Topla smeđa koža", hex: "#93603E" },
];

export const EYE_COLORS: readonly ColorLookPart[] = [
    { id: "smedje", label: "Smeđe oči", hex: "#8A5630" },
    { id: "tamne", label: "Tamne oči", hex: "#5A3522" },
    { id: "lesnik", label: "Oči boje lešnika", hex: "#B08A3C" },
    { id: "zelene", label: "Zelene oči", hex: "#6DB565" },
    { id: "plave", label: "Plave oči", hex: "#5AA8E8" },
    { id: "sive", label: "Sive oči", hex: "#7D8A96" },
    // Nove boje očiju (dodate na kraj: stari id-jevi ostaju isti)
    { id: "cilibar", label: "Oči boje ćilibara", hex: "#C98B2E" },
    { id: "tamnoplave", label: "Tamnoplave oči", hex: "#2F5FA8" },
    { id: "plavozelene", label: "Plavozelene oči", hex: "#3E9E9A" },
    { id: "sivozelene", label: "Sivozelene oči", hex: "#7E9A7A" },
    { id: "svetlosmedje", label: "Svetlosmeđe oči", hex: "#A8743E" },
];

/** Boje kose (isti id-jevi kao 2D) */
export const HAIR_COLORS: readonly ColorLookPart[] = [
    { id: "crna", label: "Crna kosa", hex: "#2A2224" },
    { id: "smedja", label: "Smeđa kosa", hex: "#5A3824" },
    { id: "kestenjasta", label: "Kestenjasta kosa", hex: "#8C4A26" },
    { id: "plava", label: "Plava kosa", hex: "#D9AE5C" },
    { id: "rida", label: "Riđa kosa", hex: "#C2552A" },
    { id: "seda", label: "Seda kosa", hex: "#C9C9CF" },
    // Nove prirodne boje (nana i dedo: bela i proseda; ostali: nijanse smeđe i plave)
    { id: "tamnosmedja", label: "Tamnosmeđa kosa", hex: "#3E2A1F" },
    { id: "svetlosmedja", label: "Svetlosmeđa kosa", hex: "#8A6440" },
    { id: "medena", label: "Medeno plava kosa", hex: "#C08A48" },
    { id: "platinasta", label: "Platinasta kosa", hex: "#E6D9B8" },
    { id: "bakarna", label: "Bakarna kosa", hex: "#A8461F" },
    { id: "proseda", label: "Proseda kosa", hex: "#8C8A8C" },
    { id: "bela", label: "Bela kosa", hex: "#EEEBE6" },
    // Vesele boje (takođe besplatne)
    { id: "roze", label: "Roze kosa", hex: "#EE8DB8" },
    { id: "ljubicasta", label: "Ljubičasta kosa", hex: "#9A7AD6" },
    { id: "nebo", label: "Nebeskoplava kosa", hex: "#6AA6E6" },
    { id: "tirkizna", label: "Tirkizna kosa", hex: "#3FBDB8" },
];

/** Oblik kose u 3D (engine/hair.ts) za svaku frizuru */
export type HairShape =
    | "short" | "curly" | "long" | "shoulder" | "ponytail" | "braids" | "buzz" | "bun" | "messy" | "swept" | "wavy" | "straight" | "none"
    // Nove frizure
    | "puffs" | "cornrows" | "bob" | "pixie" | "highbun" | "curlylong" | "sidepart" | "spiky" | "fade" | "pigtails" | "receding" | "afro";

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
    // Nove frizure (kao na Bitmoji slikama): razbarušene šiške, začešljana u stranu, talasasta
    // podignuta, duga ravna sa razdeljkom po sredini
    razbarusena: { id: "razbarusena", label: "Razbarušene šiške", shape: "messy" },
    zacesljana: { id: "zacesljana", label: "Začešljana u stranu", shape: "swept" },
    talasasta: { id: "talasasta", label: "Talasasta", shape: "wavy" },
    "ravna-razdeljak": { id: "ravna-razdeljak", label: "Duga ravna, razdeljak", shape: "straight" },
    // Još frizura (sve besplatne): afro punđice, pletenice uz glavu, bob, pixi, visoka punđa,
    // duga kovrdžava, razdeljak u stranu, šiljci, podšišana sa strane, kikice, proređena, afro
    "afro-pundjice": { id: "afro-pundjice", label: "Afro punđice", shape: "puffs" },
    "pletenice-uz-glavu": { id: "pletenice-uz-glavu", label: "Pletenice uz glavu", shape: "cornrows" },
    bob: { id: "bob", label: "Bob frizura", shape: "bob" },
    pixi: { id: "pixi", label: "Kratka pixi frizura", shape: "pixie" },
    "visoka-pundja": { id: "visoka-pundja", label: "Visoka punđa", shape: "highbun" },
    "duga-kovrdzava": { id: "duga-kovrdzava", label: "Duga kovrdžava", shape: "curlylong" },
    "razdeljak-strana": { id: "razdeljak-strana", label: "Kratka sa razdeljkom", shape: "sidepart" },
    siljci: { id: "siljci", label: "Šiljci", shape: "spiky" },
    fejd: { id: "fejd", label: "Podšišana sa strane", shape: "fade" },
    kikice: { id: "kikice", label: "Dve kikice", shape: "pigtails" },
    proredjena: { id: "proredjena", label: "Proređena kosa", shape: "receding" },
    afro: { id: "afro", label: "Afro", shape: "afro" },
};

/** Frizure po drugaru; prva je podrazumevana (kod učiteljice i učitelja — dosadašnji 2D crtež) */
// Nove frizure se dopisuju POSLE starih (prva ostaje podrazumevana, stari izbori važe)
export const HAIRSTYLES: Record<HumanKind, readonly HairStylePart[]> = {
    girl: [
        STYLE.duga, STYLE["ravna-razdeljak"], STYLE["do-ramena"], STYLE.rep, STYLE.pletenice, STYLE.pundja, STYLE["kratka-kovrdzava"], STYLE.kratka,
        STYLE.kikice, STYLE["afro-pundjice"], STYLE["pletenice-uz-glavu"], STYLE.bob, STYLE["visoka-pundja"], STYLE["duga-kovrdzava"], STYLE.pixi, STYLE.afro,
    ],
    boy: [
        STYLE.kratka, STYLE.razbarusena, STYLE.zacesljana, STYLE.talasasta, STYLE.kovrdzava, STYLE.duza, STYLE.osisana,
        STYLE["razdeljak-strana"], STYLE.siljci, STYLE.fejd, STYLE["pletenice-uz-glavu"], STYLE.afro,
    ],
    woman: [
        STYLE["do-ramena"], STYLE.duga, STYLE["ravna-razdeljak"], STYLE.rep, STYLE.pletenice, STYLE.pundja, STYLE["kratka-kovrdzava"], STYLE.kratka,
        STYLE.bob, STYLE.pixi, STYLE["visoka-pundja"], STYLE["duga-kovrdzava"], STYLE["afro-pundjice"], STYLE["pletenice-uz-glavu"], STYLE.afro,
    ],
    man: [
        STYLE.kratka, STYLE.talasasta, STYLE.zacesljana, STYLE.razbarusena, STYLE.kovrdzava, STYLE.duza, STYLE.osisana, STYLE["bez-kose"],
        STYLE["razdeljak-strana"], STYLE.fejd, STYLE.siljci, STYLE.proredjena, STYLE["pletenice-uz-glavu"], STYLE.afro,
    ],
    teengirl: [
        STYLE.rep, STYLE["visoka-pundja"], STYLE.duga, STYLE["ravna-razdeljak"], STYLE.bob, STYLE["duga-kovrdzava"], STYLE.kikice, STYLE["afro-pundjice"],
        STYLE["pletenice-uz-glavu"], STYLE.pixi, STYLE["do-ramena"], STYLE.pletenice, STYLE.pundja, STYLE["kratka-kovrdzava"], STYLE.afro,
    ],
    teenboy: [
        STYLE.fejd, STYLE.razbarusena, STYLE.siljci, STYLE["razdeljak-strana"], STYLE.zacesljana, STYLE.talasasta, STYLE.kovrdzava, STYLE.kratka,
        STYLE.osisana, STYLE.duza, STYLE["pletenice-uz-glavu"], STYLE.afro,
    ],
    grandma: [
        STYLE.pundja, STYLE["kratka-kovrdzava"], STYLE.bob, STYLE.kratka, STYLE["do-ramena"], STYLE["visoka-pundja"], STYLE.pixi, STYLE.rep, STYLE.pletenice, STYLE.afro,
    ],
    grandpa: [
        STYLE.proredjena, STYLE.kratka, STYLE.zacesljana, STYLE["razdeljak-strana"], STYLE.osisana, STYLE["bez-kose"], STYLE.kovrdzava, STYLE.talasasta,
    ],
};

/** Bez hidžaba */
export const NO_HIJAB = "nema";

/** Boje hidžaba (besplatno, kao i ostatak izgleda); nudi se svim ženskim likovima (i nani) */
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
    return HUMAN_TRAITS[kind].female;
}

/** Pegice (besplatno): bez, malo, više; „bez” je podrazumevano i ne piše se u id */
export const NO_FRECKLES = "bez";
export const FRECKLES: readonly LookPart[] = [
    { id: NO_FRECKLES, label: "Bez pegica" },
    { id: "malo", label: "Malo pegica" },
    { id: "vise", label: "Više pegica" },
];

/** Brada i brkovi (besplatno, odrasli muškarci: učitelj i dedo); „bez” je podrazumevano */
export const NO_BEARD = "bez";
export const BEARDS: readonly LookPart[] = [
    { id: NO_BEARD, label: "Bez brade" },
    { id: "brada", label: "Kratka brada" },
    { id: "brkovi", label: "Brkovi" },
    { id: "puna", label: "Puna brada" },
];

export function hasBeardOption(kind: HumanKind): boolean {
    const traits = HUMAN_TRAITS[kind];
    return !traits.female && (traits.age === "adult" || traits.age === "senior");
}

export interface HumanLook {
    tone: string;
    eye: string;
    hair: string;
    style: string;
    /** Boja hidžaba ili NO_HIJAB */
    hijab: string;
    /** Pegice (FRECKLES); bez vrednosti = bez pegica */
    freckles?: string;
    /** Brada ili brkovi (BEARDS: učitelj i dedo); bez vrednosti = bez brade */
    beard?: string;
}

export const HUMAN_DEFAULT: Record<HumanKind, HumanLook> = {
    girl: { tone: "psenicna", eye: "lesnik", hair: "smedja", style: "duga", hijab: NO_HIJAB },
    boy: { tone: "svetla", eye: "plave", hair: "smedja", style: "kratka", hijab: NO_HIJAB },
    // Kao dosadašnja 2D učiteljica i učitelj (skins.ts HUMAN_DEFAULT)
    woman: { tone: "vrlo-svetla", eye: "smedje", hair: "kestenjasta", style: "do-ramena", hijab: NO_HIJAB },
    man: { tone: "svetla", eye: "smedje", hair: "smedja", style: "kratka", hijab: NO_HIJAB },
    // Porodica: tinejdžeri, nana (seda punđa) i dedo (proređena seda kosa i brkovi)
    teengirl: { tone: "medena", eye: "tamne", hair: "tamnosmedja", style: "rep", hijab: NO_HIJAB },
    teenboy: { tone: "karamel", eye: "smedje", hair: "crna", style: "fejd", hijab: NO_HIJAB },
    grandma: { tone: "svetla", eye: "plave", hair: "seda", style: "pundja", hijab: NO_HIJAB },
    grandpa: { tone: "psenicna", eye: "smedje", hair: "bela", style: "proredjena", hijab: NO_HIJAB, beard: "brkovi" },
};

export function humanLookId(look: HumanLook): string {
    const base = `${look.tone}.${look.eye}.${look.hair}.${look.style}.${look.hijab}`;
    const freckles = look.freckles ?? NO_FRECKLES;
    const beard = look.beard ?? NO_BEARD;
    // Podrazumevane pegice i brada se ne pišu: stari id-jevi ostaju isti
    if (beard !== NO_BEARD) return `${base}.${freckles}.${beard}`;
    return freckles !== NO_FRECKLES ? `${base}.${freckles}` : base;
}

const known = (list: readonly LookPart[], id: string | undefined) => id !== undefined && list.some((part) => part.id === id);

/** Id → delovi izgleda, ili undefined kad id nije ispravan (prima i stari zapis od tri dela) */
export function parseHumanLook(kind: HumanKind, id: string): HumanLook | undefined {
    const parts = id.split(".");
    let look: HumanLook;
    if (parts.length === 3) look = { tone: parts[0], eye: HUMAN_DEFAULT[kind].eye, hair: parts[1], style: parts[2], hijab: NO_HIJAB };
    else if (parts.length >= 5 && parts.length <= 7) look = { tone: parts[0], eye: parts[1], hair: parts[2], style: parts[3], hijab: parts[4] };
    else return undefined;
    // Pegice i brada (dopisani delovi); podrazumevane vrednosti se ne čuvaju u izgledu
    if (parts.length >= 6) {
        if (!known(FRECKLES, parts[5])) return undefined;
        if (parts[5] !== NO_FRECKLES) look.freckles = parts[5];
    }
    if (parts.length === 7) {
        if (!known(BEARDS, parts[6]) || (parts[6] !== NO_BEARD && !hasBeardOption(kind))) return undefined;
        if (parts[6] !== NO_BEARD) look.beard = parts[6];
    }
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
