// Sadržaj igre „Šta dolazi sledeće?”: niz boja, oblika, slika ili brojeva stoji na vozu, gusenici,
// ogrlici od perli, balonima ili konopcu sa karticama, a na kraju (kasnije i u sredini) je prazno
// mesto „?”. Dete bira šta dolazi sledeće; tačan izbor doleti na svoje mesto, a voz zatrubi i
// krene. Bez Reacta, da bi se nivoi proveravali u testovima; crteži su u games/pattern/.
//
// Zašto ovako (uzrast 3–8, i deca sa autizmom):
//  • Deca od 3 do 8 godina vole ritam i ponavljanje (pesmice, brojalice, ogrlice od perli,
//    vozići), a prepoznavanje obrasca je jedan od najjačih ranih temelja matematike: dete koje
//    vidi pravilo („posle plave uvek dolazi crvena”) lakše broji, poredi i kasnije uči brojevne
//    nizove i množenje (Rittle-Johnson i sar., 2019; Clements i Sarama: učenje kroz putanje).
//  • Redosled ide od ponavljanja (AB) ka složenijim jedinicama (AAB, ABB, ABC, AABB), pa
//    rastućim nizovima (1, 2, 3 tačkice), brojevima (2, 4, 6), okretanju i na kraju prenošenju
//    pravila na druge stvari (crvena-plava = mačka-pas) — to je istraživanjima potvrđen tok
//    razvoja razumevanja obrazaca (ponavljanje → produžavanje → apstrakcija pravila).
//  • Deca sa autizmom često imaju jaku vizuelnu obradu i vole predvidljive nizove; uz to dobijaju
//    učenje bez greške (errorless learning): prvi zadatak prvog nivoa pokaže ruka (ne ocenjuje
//    se), na početku su samo dva izbora, a ponavljajuća jedinica je blago uokvirena lukom ispod
//    niza (vizuelna podrška koja se kasnije povlači — fading). Na lakim nivoima pomoć (tačan
//    izbor blago zasvetli) stiže posle prve greške i posle čekanja.
//  • Predvidljiv raspored: niz je uvek gore, izbori uvek dole; nosač niza (voz, gusenica, perle,
//    baloni, konopac) se smenjuje radi novine, ali se čita uvek sleva nadesno od glave voza.
//  • Boje su lako razlikujuće i za decu koja ne razlikuju sve boje (crvena i zelena, plava i
//    ljubičasta se ne nalaze u istom nizu dok god ima drugog izbora), a svaka boja nosi i svoj
//    znak (tačka, kvadrat, zvezda, trougao, srce, romb) — dvostruki znak koji ne zavisi od boje.
//  • Teme koje deca vole i za koje deca sa autizmom često imaju posebno interesovanje: životinje,
//    voće, vozila, dinosaurusi, vozovi i brojevi.
//  • Mirna povratna informacija: greška nije kazna — glas kaže pravilo („Posle plave uvek dolazi
//    crvena.”), a tačan odgovor se pročita ritmično („Crvena, plava, crvena, plava, crvena.”).
//    Na lakim nivoima glas čita i ceo niz pre pitanja (ritam pomaže), na težim samo pitanje.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.
//
// Nivoi: Lako 1–5 (AB boje sa dva izbora i rukom, AB životinje, AB oblici, AAB, ABB/AAB voće),
// Srednje 6–10 (ABC boje, ABC vozila i dinosaurusi, AABB sa četiri izbora, prazno mesto u
// sredini, dve osobine — boja i oblik), Teško 11–15 (rastući niz tačkica, brojevi, dugi niz sa
// dva prazna mesta, okretanje strelice, isto pravilo u drugom nizu).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

// ── Boje ──────────────────────────────────────────────────────────────────────

export const COLOR_IDS = ["red", "blue", "yellow", "green", "purple", "orange"] as const;
export type ColorId = (typeof COLOR_IDS)[number];

/** Znak u boji (za decu koja boje slabije razlikuju): svaka boja ima svoj */
export type GlyphId = "dot" | "square" | "star" | "triangle" | "heart" | "diamond";

export interface ColorInfo {
    id: ColorId;
    /** Pridev u ženskom rodu („crvena” perla) i njegov genitiv („posle crvene”, „dve crvene”) */
    name: string;
    gen: string;
    /** Muški i srednji rod („crveni krug”, „crveno srce”) i genitiv za njih („crvenog”) */
    masc: string;
    neut: string;
    mascGen: string;
    fill: string;
    edge: string;
    /** Svetlija nijansa (odsjaj, unutrašnjost) */
    light: string;
    glyph: GlyphId;
}

export const COLORS: Readonly<Record<ColorId, ColorInfo>> = {
    red: { id: "red", name: "crvena", gen: "crvene", masc: "crveni", neut: "crveno", mascGen: "crvenog", fill: "#e5484d", edge: "#a8282d", light: "#f7a8aa", glyph: "dot" },
    blue: { id: "blue", name: "plava", gen: "plave", masc: "plavi", neut: "plavo", mascGen: "plavog", fill: "#3e7bfa", edge: "#234fb0", light: "#a9c6ff", glyph: "square" },
    yellow: { id: "yellow", name: "žuta", gen: "žute", masc: "žuti", neut: "žuto", mascGen: "žutog", fill: "#f6c518", edge: "#b38a0a", light: "#fde68a", glyph: "star" },
    green: { id: "green", name: "zelena", gen: "zelene", masc: "zeleni", neut: "zeleno", mascGen: "zelenog", fill: "#2fae66", edge: "#1b7a44", light: "#9be3b6", glyph: "triangle" },
    purple: { id: "purple", name: "ljubičasta", gen: "ljubičaste", masc: "ljubičasti", neut: "ljubičasto", mascGen: "ljubičastog", fill: "#9b5de5", edge: "#6a35ad", light: "#d6bdf6", glyph: "heart" },
    orange: { id: "orange", name: "narandžasta", gen: "narandžaste", masc: "narandžasti", neut: "narandžasto", mascGen: "narandžastog", fill: "#f5892a", edge: "#b85d12", light: "#fcc79a", glyph: "diamond" },
};

/** Parovi boja koje deca sa slabijim razlikovanjem boja lako pomešaju — ne stoje u istom nizu dok ima drugog izbora */
const CONFUSABLE: readonly (readonly [ColorId, ColorId])[] = [
    ["red", "green"],
    ["red", "orange"],
    ["orange", "yellow"],
    ["blue", "purple"],
    ["green", "orange"],
    ["green", "yellow"],
];

function confusable(a: string, b: string): boolean {
    return CONFUSABLE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

// ── Oblici ────────────────────────────────────────────────────────────────────

export const SHAPE_IDS = ["circle", "square", "triangle", "star", "heart"] as const;
export type ShapeId = (typeof SHAPE_IDS)[number];

type Gender = "m" | "f" | "n";

interface Noun {
    name: string;
    /** Genitiv jednine — i za „dva/dve” („dva kruga”, „dve zvezde”) */
    gen: string;
    gender: Gender;
}

export const SHAPES: Readonly<Record<ShapeId, Noun>> = {
    circle: { name: "krug", gen: "kruga", gender: "m" },
    square: { name: "kvadrat", gen: "kvadrata", gender: "m" },
    triangle: { name: "trougao", gen: "trougla", gender: "m" },
    star: { name: "zvezda", gen: "zvezde", gender: "f" },
    heart: { name: "srce", gen: "srca", gender: "n" },
};

// ── Slike ─────────────────────────────────────────────────────────────────────

export type PictureGroup = "animals" | "fruit" | "vehicles" | "dinos";

export interface PatternPicture extends Noun {
    group: PictureGroup;
    /** Glavna boja slike: u jednom nizu nema dve slike iste boje (lakše se razlikuju) */
    tone: string;
}

const pic = (name: string, gen: string, gender: Gender, group: PictureGroup, tone: string): PatternPicture => ({ name, gen, gender, group, tone });

/**
 * Slike iz zajedničkog kompleta (`pictures/index.tsx`, isti id) i četiri dinosaurusa nacrtana za
 * ovu igru (`pattern/PatternArt.tsx`). Birane su slike koje se lako prepoznaju i u malom.
 */
export const PATTERN_PICTURES = {
    cat: pic("mačka", "mačke", "f", "animals", "orange"),
    dog: pic("pas", "psa", "m", "animals", "brown"),
    frog: pic("žaba", "žabe", "f", "animals", "green"),
    pig: pic("prase", "praseta", "n", "animals", "pink"),
    cow: pic("krava", "krave", "f", "animals", "white"),
    chick: pic("pile", "pileta", "n", "animals", "yellow"),
    bird: pic("ptica", "ptice", "f", "animals", "blue"),
    elephant: pic("slon", "slona", "m", "animals", "gray"),
    ladybug: pic("bubamara", "bubamare", "f", "animals", "red"),
    turtle: pic("kornjača", "kornjače", "f", "animals", "teal"),
    fish: pic("riba", "ribe", "f", "animals", "gold"),
    rabbit: pic("zec", "zeca", "m", "animals", "lavender"),
    apple: pic("jabuka", "jabuke", "f", "fruit", "red"),
    banana: pic("banana", "banane", "f", "fruit", "yellow"),
    pear: pic("kruška", "kruške", "f", "fruit", "green"),
    grapes: pic("grožđe", "grožđa", "n", "fruit", "purple"),
    orange: pic("pomorandža", "pomorandže", "f", "fruit", "orange"),
    strawberry: pic("jagoda", "jagode", "f", "fruit", "pink"),
    watermelon: pic("lubenica", "lubenice", "f", "fruit", "teal"),
    pineapple: pic("ananas", "ananasa", "m", "fruit", "gold"),
    car: pic("auto", "auta", "m", "vehicles", "blue"),
    bus: pic("autobus", "autobusa", "m", "vehicles", "yellow"),
    tractor: pic("traktor", "traktora", "m", "vehicles", "green"),
    helicopter: pic("helikopter", "helikoptera", "m", "vehicles", "orange"),
    rocket: pic("raketa", "rakete", "f", "vehicles", "white"),
    fireTruck: pic("vatrogasni kamion", "vatrogasnog kamiona", "m", "vehicles", "red"),
    boat: pic("brod", "broda", "m", "vehicles", "gold"),
    bicycle: pic("bicikl", "bicikla", "m", "vehicles", "pink"),
    bronto: pic("brontosaurus", "brontosaurusa", "m", "dinos", "green"),
    tricera: pic("triceratops", "triceratopsa", "m", "dinos", "orange"),
    stego: pic("stegosaurus", "stegosaurusa", "m", "dinos", "blue"),
    rex: pic("tiranosaurus", "tiranosaurusa", "m", "dinos", "purple"),
} satisfies Record<string, PatternPicture>;

export type PatternPictureId = keyof typeof PATTERN_PICTURES;
export const PATTERN_PICTURE_IDS = Object.keys(PATTERN_PICTURES) as PatternPictureId[];
/** Dinosaurusi su nacrtani u ovoj igri; ostale slike su iz zajedničkog kompleta */
export const DINO_IDS = ["bronto", "tricera", "stego", "rex"] as const;

function isPatternPicture(id: string): id is PatternPictureId {
    return Object.hasOwn(PATTERN_PICTURES, id);
}

// ── Stvari u nizu ─────────────────────────────────────────────────────────────
// Svaka stvar je kratak tekst (običan JSON, ide i roditeljskom prikazu):
//   c:red          boja (perla, balon, deo gusenice, sanduk na vozu)
//   s:star:red     oblik u boji
//   p:cat          slika (životinja, voće, vozilo, dinosaurus)
//   n:8            broj
//   d:4 / t:4      četiri tačkice / četiri zvezdice
//   a:1 / k:1      strelica / kazaljka okrenuta za četvrt kruga (0 gore, 1 desno, 2 dole, 3 levo)

export type ItemKind = "color" | "shape" | "picture" | "number" | "dots" | "stars" | "arrow" | "clock";

export interface ParsedItem {
    kind: ItemKind;
    color?: ColorId;
    shape?: ShapeId;
    picture?: PatternPictureId;
    /** Broj, broj tačkica ili četvrtina kruga */
    value?: number;
}

const isColor = (value: string): value is ColorId => (COLOR_IDS as readonly string[]).includes(value);
const isShape = (value: string): value is ShapeId => (SHAPE_IDS as readonly string[]).includes(value);

export const MAX_NUMBER = 99;
export const MAX_DOTS = 9;

export function parseItem(id: unknown): ParsedItem | null {
    if (typeof id !== "string" || id.length > 24) return null;
    const [kind, a, b, extra] = id.split(":");
    if (extra !== undefined) return null;
    const int = (value: string | undefined, min: number, max: number) => (value !== undefined && /^\d{1,2}$/.test(value) && Number(value) >= min && Number(value) <= max ? Number(value) : null);
    switch (kind) {
        case "c":
            return a && isColor(a) && b === undefined ? { kind: "color", color: a } : null;
        case "s":
            return a && b && isShape(a) && isColor(b) ? { kind: "shape", shape: a, color: b } : null;
        case "p":
            return a && isPatternPicture(a) && b === undefined ? { kind: "picture", picture: a } : null;
        case "n": {
            const value = int(a, 0, MAX_NUMBER);
            return value !== null && b === undefined ? { kind: "number", value } : null;
        }
        case "d":
        case "t": {
            const value = int(a, 1, MAX_DOTS);
            return value !== null && b === undefined ? { kind: kind === "d" ? "dots" : "stars", value } : null;
        }
        case "a":
        case "k": {
            const value = int(a, 0, 3);
            return value !== null && b === undefined ? { kind: kind === "a" ? "arrow" : "clock", value } : null;
        }
        default:
            return null;
    }
}

export function isPatternItem(id: unknown): id is string {
    return parseItem(id) !== null;
}

/** Ime stvari (nominativ, genitiv, rod). `plain`: oblik bez boje (kad su svi oblici u nizu iste boje). */
export function itemNoun(id: string, plain = false): Noun {
    const item = parseItem(id);
    if (!item) return { name: "", gen: "", gender: "f" };
    switch (item.kind) {
        case "color": {
            const color = COLORS[item.color as ColorId];
            return { name: color.name, gen: color.gen, gender: "f" };
        }
        case "shape": {
            const shape = SHAPES[item.shape as ShapeId];
            if (plain) return shape;
            const color = COLORS[item.color as ColorId];
            const adjective = shape.gender === "f" ? color.name : shape.gender === "n" ? color.neut : color.masc;
            const adjectiveGen = shape.gender === "f" ? color.gen : color.mascGen;
            return { name: `${adjective} ${shape.name}`, gen: `${adjectiveGen} ${shape.gen}`, gender: shape.gender };
        }
        case "picture":
            return PATTERN_PICTURES[item.picture as PatternPictureId];
        default:
            return { name: String(item.value ?? ""), gen: String(item.value ?? ""), gender: "m" };
    }
}

/** Kratak natpis ispod izbora („Crvena”, „Mačka”, „8”) */
export function itemLabel(id: string, plain = false): string {
    const item = parseItem(id);
    if (!item) return "";
    if (item.kind === "arrow" || item.kind === "clock") return "";
    return cap(itemNoun(id, plain).name);
}

/** Opis za čitače ekrana (i za strelice i kazaljke, koje nemaju natpis) */
const QUARTERS = ["gore", "desno", "dole", "levo"];
export function itemSpoken(id: string, plain = false): string {
    const item = parseItem(id);
    if (!item) return "";
    if (item.kind === "arrow") return `strelica ${QUARTERS[item.value ?? 0]}`;
    if (item.kind === "clock") return `kazaljka ${QUARTERS[item.value ?? 0]}`;
    if (item.kind === "dots") return countPhrase(item.value ?? 0, "tačkica");
    if (item.kind === "stars") return countPhrase(item.value ?? 0, "zvezdica");
    return itemNoun(id, plain).name;
}

/** „1 tačkica”, „3 tačkice”, „5 tačkica” (i 21, 22, 25…) */
function countPhrase(n: number, word: "tačkica" | "zvezdica"): string {
    const stem = word.slice(0, -1);
    const last = n % 10;
    const teen = n % 100 >= 11 && n % 100 <= 14;
    const form = !teen && last === 1 ? `${stem}a` : !teen && last >= 2 && last <= 4 ? `${stem}e` : word;
    return `${n} ${form}`;
}

/** Da li su svi oblici u nizu iste boje (tada se kažu samo oblici: „krug, zvezda…”) */
export function plainShapes(items: readonly string[]): boolean {
    const colors = new Set(items.map((id) => parseItem(id)).filter((item) => item?.kind === "shape").map((item) => item?.color));
    return colors.size <= 1;
}

function cap(text: string): string {
    return text ? text[0].toUpperCase() + text.slice(1) : text;
}

// ── Nosači niza ───────────────────────────────────────────────────────────────

export const CARRIER_IDS = ["train", "caterpillar", "beads", "balloons", "line"] as const;
export type CarrierId = (typeof CARRIER_IDS)[number];

export const CARRIER_NAMES: Readonly<Record<CarrierId, string>> = {
    train: "Voz",
    caterpillar: "Gusenica",
    beads: "Perle na kanapu",
    balloons: "Baloni",
    line: "Kartice na konopcu",
};

/** Koji nosači idu uz koju vrstu stvari (boje na sve, slike i brojevi u vagone i na kartice) */
const CARRIERS_FOR: Readonly<Record<"color" | "shape" | "picture" | "count", readonly CarrierId[]>> = {
    color: ["caterpillar", "train", "beads", "balloons"],
    shape: ["beads", "train", "line"],
    picture: ["train", "line"],
    count: ["train", "line"],
};

// ── Pravila niza ──────────────────────────────────────────────────────────────

/** Jedinica koja se ponavlja: slova su različite stvari („aab” = dve iste, pa jedna druga) */
export const STRUCTURES = ["ab", "aab", "abb", "abc", "aabb", "abcd", "aabc"] as const;
export type Structure = (typeof STRUCTURES)[number];

/** Strukture koje se porede u poslednjem nivou (isto pravilo u drugom nizu) */
export const TRANSFER_STRUCTURES = ["ab", "aab", "abb", "abc", "aabb"] as const;

export function isStructure(value: unknown): value is Structure {
    return typeof value === "string" && (STRUCTURES as readonly string[]).includes(value);
}

/** Jedinica od stvari: „aab” + [crvena, plava] → [crvena, crvena, plava] */
export function unitOf(structure: Structure, things: readonly string[]): string[] {
    return [...structure].map((letter) => things[letter.charCodeAt(0) - 97]);
}

const distinctCount = (structure: Structure) => new Set(structure).size;

/** Niz dužine `length` od jedinice koja se ponavlja */
export function repeatUnit(unit: readonly string[], length: number): string[] {
    return Array.from({ length }, (_, i) => unit[i % unit.length]);
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export type PatternKind = "repeat" | "grow" | "count" | "turn" | "transfer";
/** Šta stoji u nizu (za ponavljanje) */
type Content = "colors" | "shapes" | "duo" | PictureGroup;
/** Gde je prazno mesto: na kraju, u sredini ili dva na kraju (popunjavaju se jedno za drugim) */
type GapPlace = "end" | "middle" | "two";

export interface PatternLevel {
    kind: PatternKind;
    structures: readonly Structure[];
    content: readonly Content[];
    gap: GapPlace;
    /** Koliko izbora (pre ograničenja iz podešavanja) */
    choices: number;
    /** Jedinica je od početka uokvirena lukom (inače samo kao pomoć) */
    grouped: boolean;
    /** Glas pročita niz pre pitanja i ceo niz posle tačnog odgovora */
    read: boolean;
    earlyHint: boolean;
    rounds: number;
}

const L = (kind: PatternKind, structures: readonly Structure[], content: readonly Content[], gap: GapPlace, choices: number, easy: boolean, rounds = easy ? 5 : 6): PatternLevel => ({
    kind,
    structures,
    content,
    gap,
    choices,
    grouped: easy,
    read: easy,
    earlyHint: easy,
    rounds,
});

const PICTURES_ALL: Content[] = ["animals", "fruit", "vehicles", "dinos"];

export const PATTERN_LEVELS: readonly PatternLevel[] = [
    // Lako: AB sa dva izbora, pa tri; AAB i ABB. Jedinica uokvirena, glas čita niz.
    L("repeat", ["ab"], ["colors"], "end", 2, true),
    L("repeat", ["ab"], ["animals", "dinos"], "end", 2, true),
    L("repeat", ["ab"], ["shapes"], "end", 3, true),
    L("repeat", ["aab"], ["colors"], "end", 3, true),
    L("repeat", ["abb", "aab"], ["fruit"], "end", 3, true),
    // Srednje: ABC, AABB sa četiri izbora, prazno mesto u sredini, dve osobine odjednom
    L("repeat", ["abc"], ["colors"], "end", 3, false),
    L("repeat", ["abc"], ["vehicles", "dinos"], "end", 3, false),
    L("repeat", ["aabb"], ["colors", "shapes", "animals"], "end", 4, false),
    L("repeat", ["ab", "abb", "aab", "abc"], ["colors", "shapes", ...PICTURES_ALL], "middle", 4, false),
    L("repeat", ["ab", "abc"], ["duo"], "end", 4, false),
    // Teško: rastući niz, brojevi, dva prazna mesta, okretanje, isto pravilo u drugom nizu
    L("grow", [], [], "end", 4, false),
    L("count", [], [], "end", 4, false),
    L("repeat", ["abcd", "aabc"], ["colors", ...PICTURES_ALL], "two", 4, false),
    L("turn", [], [], "end", 4, false),
    L("transfer", [...TRANSFER_STRUCTURES], [...PICTURES_ALL, "shapes"], "end", 3, false),
];

export const PATTERN_MAX_LEVEL = PATTERN_LEVELS.length;

export function patternLevel(level: number): PatternLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), PATTERN_MAX_LEVEL);
    return PATTERN_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

export interface TransferRow {
    /** Pravilo reda je i njegov id (svaki red ima drugo pravilo) */
    id: Structure;
    items: string[];
}

export interface PatternRound {
    kind: PatternKind;
    carrier: CarrierId;
    /** Ceo niz (rešenje); kod prenošenja pravila — uzor */
    items: string[];
    /** Dužina jedinice koja se ponavlja (0 kad niz ne ponavlja jedinicu) */
    unit: number;
    /** Prazna mesta redom kojim se popunjavaju */
    gaps: number[];
    /** Ponuđeni izbori: stvari, a kod prenošenja pravila — id-jevi redova */
    choices: string[];
    rows: TransferRow[];
    /** Pravilo uzora (prenošenje pravila) */
    structure: Structure | null;
    /** Za koliko se niz menja (brojevi, tačkice: +1, +2, −1…; okretanje: +1 ili −1 četvrtina) */
    step: number;
    grouped: boolean;
    read: boolean;
}

interface BuildOptions {
    maxRounds: number;
    maxChoices: number;
    random?: () => number;
}

/** Nizovi brojeva za 12. nivo: početak i korak (prikazuju se četiri broja, pa „?”) */
const NUMBER_RULES: readonly { start: readonly number[]; step: number }[] = [
    { start: [2], step: 2 },
    { start: [5], step: 5 },
    { start: [10, 9, 12], step: -1 },
    { start: [10], step: 10 },
    { start: [1, 3], step: 2 },
    { start: [3, 4, 6, 7, 11], step: 1 },
    { start: [10, 12, 20], step: -2 },
    { start: [3], step: 3 },
];

/**
 * Plan nivoa. Isti `random` daje isti plan (dvoboj: oba deteta dobijaju iste zadatke). Nosač se
 * menja od zadatka do zadatka (nikad isti dvaput zaredom), a ponuđeno je najviše onoliko izbora
 * koliko dete sme da vidi — nikad manje od dva i uvek su tu svi tačni odgovori. `random` daje [0, 1).
 */
export function buildPatternLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): PatternRound[] {
    const rule = patternLevel(level);
    const shuffle = <T,>(list: readonly T[]): T[] => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    const count = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? Math.floor(maxRounds) : rule.rounds));
    const limit = Math.max(2, Math.min(rule.choices, Number.isFinite(maxChoices) ? Math.floor(maxChoices) : rule.choices));

    // Nosači: svaki tip stvari ima svoje; isti nosač nikad dvaput zaredom
    let lastCarrier: CarrierId | null = null;
    const carrierFor = (type: keyof typeof CARRIERS_FOR, length = 6): CarrierId => {
        // Baloni su uži od ostalih: dug niz (7 stvari) ide na nosač koji bolje popunjava red
        const options = CARRIERS_FOR[type].filter((id) => id !== lastCarrier && (length < 7 || id !== "balloons"));
        lastCarrier = pick(options);
        return lastCarrier;
    };

    /** `k` različitih boja koje se lako razlikuju (ako ih ima) */
    const pickColors = (k: number, avoid: readonly string[] = []): ColorId[] => {
        const pool = COLOR_IDS.filter((id) => !avoid.includes(id));
        for (let tries = 0; tries < 60; tries += 1) {
            const set = shuffle(pool).slice(0, k);
            if (set.every((a, i) => set.every((b, j) => i === j || !confusable(a, b)))) return set;
        }
        return shuffle(pool).slice(0, k);
    };
    /** `k` slika iz grupe, bez dve iste boje */
    const pickPictures = (group: PictureGroup, k: number): PatternPictureId[] => {
        const pool = PATTERN_PICTURE_IDS.filter((id) => PATTERN_PICTURES[id].group === group);
        for (let tries = 0; tries < 60; tries += 1) {
            const set = shuffle(pool).slice(0, k);
            if (new Set(set.map((id) => PATTERN_PICTURES[id].tone)).size === set.length) return set;
        }
        return shuffle(pool).slice(0, k);
    };

    const base = { rows: [] as TransferRow[], structure: null, grouped: rule.grouped, read: rule.read };
    const rounds: PatternRound[] = [];

    // Sadržaj se smenjuje redom (svaka vrsta po jednom pre ponavljanja)
    const contents: Content[] = [];
    while (rule.content.length > 0 && contents.length < count) contents.push(...shuffle(rule.content));
    const structures: Structure[] = [];
    while (rule.structures.length > 0 && structures.length < count) structures.push(...shuffle(rule.structures));
    const numberRules = shuffle(NUMBER_RULES);

    for (let index = 0; index < count; index += 1) {
        const demo = level === 1 && index === 0;

        if (rule.kind === "grow") {
            // Rastući niz: svaki vagon ima jednu tačkicu (zvezdicu) više; odgovor je najviše 6
            const start = pick([1, 1, 2]);
            const length = start === 1 ? pick([5, 6]) : 5;
            const prefix = index % 2 === 0 ? "d" : "t";
            const values = Array.from({ length }, (_, i) => start + i);
            const answer = values[length - 1];
            const others = shuffle([answer - 1, answer + 1, answer - 2, answer + 2].filter((n) => n >= 1 && n <= MAX_DOTS));
            const choices = shuffle([answer, ...others.slice(0, limit - 1)]).map((n) => `${prefix}:${n}`);
            rounds.push({ ...base, kind: "grow", carrier: carrierFor("count", length), items: values.map((n) => `${prefix}:${n}`), unit: 0, gaps: [length - 1], choices, step: 1, grouped: false });
            continue;
        }

        if (rule.kind === "count") {
            const { start: starts, step } = numberRules[index % numberRules.length];
            const start = pick(starts);
            const values = Array.from({ length: 5 }, (_, i) => start + i * step);
            const answer = values[4];
            const near = [values[3], answer + step, answer + 1, answer - 1, answer + 2, answer - 2];
            const others = Array.from(new Set(near.filter((n) => n !== answer && n >= 0 && n <= MAX_NUMBER)));
            // Najbliži promašaji prvi (isti kao prethodni, korak predaleko), ostalo nasumično
            const kept = [...others.slice(0, 2), ...shuffle(others.slice(2))].slice(0, limit - 1);
            const choices = shuffle([answer, ...kept]).map((n) => `n:${n}`);
            rounds.push({ ...base, kind: "count", carrier: carrierFor("count"), items: values.map((n) => `n:${n}`), unit: 0, gaps: [4], choices, step, grouped: false });
            continue;
        }

        if (rule.kind === "turn") {
            // Strelica (napred ili unazad) ili kazaljka sata (samo napred) — četvrt kruga svaki put
            const clock = index % 2 === 1;
            const step = clock ? 1 : pick([1, 1, -1]);
            const start = Math.floor(random() * 4);
            const prefix = clock ? "k" : "a";
            const values = Array.from({ length: 6 }, (_, i) => (((start + i * step) % 4) + 4) % 4);
            const answer = values[5];
            const others = shuffle([0, 1, 2, 3].filter((q) => q !== answer));
            const choices = shuffle([answer, ...others.slice(0, limit - 1)]).map((q) => `${prefix}:${q}`);
            rounds.push({ ...base, kind: "turn", carrier: carrierFor("count"), items: values.map((q) => `${prefix}:${q}`), unit: 0, gaps: [5], choices, step, grouped: false });
            continue;
        }

        if (rule.kind === "transfer") {
            // Uzor u bojama; redovi su od slika (ili oblika), svaki sa drugim pravilom — samo jedan isti kao uzor
            const structure = structures[index] as Structure;
            const model = repeatUnit(unitOf(structure, pickColors(distinctCount(structure)).map((id) => `c:${id}`)), 6);
            const content = contents[index];
            const things =
                content === "shapes" ? (() => {
                    const color = pick(COLOR_IDS);
                    return shuffle(SHAPE_IDS).slice(0, 3).map((shape) => `s:${shape}:${color}`);
                })() : pickPictures(content as PictureGroup, 3).map((id) => `p:${id}`);
            const others = shuffle(TRANSFER_STRUCTURES.filter((id) => id !== structure)).slice(0, limit - 1);
            const rows = shuffle([structure, ...others]).map((id) => ({ id, items: repeatUnit(unitOf(id, things), 6) }));
            rounds.push({ ...base, kind: "transfer", carrier: carrierFor("color"), items: model, unit: structure.length, gaps: [], choices: rows.map((row) => row.id), rows, structure, step: 0, grouped: false, read: false });
            continue;
        }

        // ── Ponavljanje ──
        const structure: Structure = demo ? "ab" : structures[index];
        const k = distinctCount(structure);
        const content: Content = demo ? "colors" : contents[index];
        let things: string[];
        let pool: string[];
        let type: keyof typeof CARRIERS_FOR;
        if (content === "colors") {
            const colors = demo ? (["red", "blue"] as ColorId[]) : pickColors(k);
            things = colors.map((id) => `c:${id}`);
            // Ostale boje za izbore: prvo one koje se ne mešaju sa bojama niza
            const rest = shuffle(COLOR_IDS.filter((id) => !colors.includes(id)));
            pool = [...rest.filter((id) => colors.every((c) => !confusable(c, id))), ...rest.filter((id) => colors.some((c) => confusable(c, id)))].map((id) => `c:${id}`);
            type = "color";
        } else if (content === "shapes") {
            const color = pick(["blue", "purple", "red", "green", "orange"] as ColorId[]);
            const shapes = shuffle(SHAPE_IDS);
            things = shapes.slice(0, k).map((shape) => `s:${shape}:${color}`);
            pool = shapes.slice(k).map((shape) => `s:${shape}:${color}`);
            type = "shape";
        } else if (content === "duo") {
            // Dve osobine: svaka stvar u jedinici ima drugi oblik I drugu boju
            const colors = pickColors(k);
            const shapes = shuffle(SHAPE_IDS).slice(0, k);
            things = colors.map((color, i) => `s:${shapes[i]}:${color}`);
            pool = [];
            type = "shape";
        } else {
            const pictures = pickPictures(content, k);
            things = pictures.map((id) => `p:${id}`);
            const tones = new Set(pictures.map((id) => PATTERN_PICTURES[id].tone));
            const rest = shuffle(PATTERN_PICTURE_IDS.filter((id) => PATTERN_PICTURES[id].group === content && !pictures.includes(id)));
            pool = [...rest.filter((id) => !tones.has(PATTERN_PICTURES[id].tone)), ...rest.filter((id) => tones.has(PATTERN_PICTURES[id].tone))].map((id) => `p:${id}`);
            type = "picture";
        }

        const unit = unitOf(structure, things);
        let items: string[];
        let gaps: number[];
        if (rule.gap === "two") {
            // Cela jedinica, prva stvar sledeće, pa dva prazna mesta (ABCDA??, AABCA??)
            items = repeatUnit(unit, 7);
            gaps = [5, 6];
        } else if (rule.gap === "middle") {
            const length = structure === "ab" ? 6 : 7;
            items = repeatUnit(unit, length);
            // Prazno mesto posle bar jedne cele jedinice, a iza njega bar jedna stvar
            const spots = Array.from({ length }, (_, i) => i).filter((i) => i >= unit.length && i <= length - 2);
            gaps = [pick(spots)];
        } else {
            // Bar jedna cela jedinica i deo druge pre praznog mesta (dva dužine, da odgovor ne bude uvek isti)
            // Najviše 7 stvari: i na uskom telefonu svaka ostaje dovoljno krupna
            const lengths: Record<Structure, number[]> = { ab: [5, 6], aab: [6, 7], abb: [6, 7], abc: [6, 7], aabb: [6, 7], abcd: [7], aabc: [7] };
            const length = demo ? 5 : pick(lengths[structure]);
            items = repeatUnit(unit, length);
            gaps = [length - 1];
        }

        const answers = Array.from(new Set(gaps.map((g) => items[g])));
        const size = Math.max(2, answers.length, limit);
        let choices: string[];
        if (content === "duo") {
            // Promašaji dele jednu osobinu sa tačnim odgovorom: ista boja drugi oblik, isti oblik druga boja
            const answer = parseItem(answers[0]) as ParsedItem;
            const usedShapes = unit.map((id) => parseItem(id)?.shape);
            const otherShape = shuffle(SHAPE_IDS.filter((s) => !usedShapes.includes(s)))[0] ?? SHAPE_IDS.find((s) => s !== answer.shape);
            const unitOthers = shuffle(things.filter((id) => !answers.includes(id)));
            const sameColor = `s:${unitOthers.length ? parseItem(unitOthers[0])?.shape : otherShape}:${answer.color}`;
            const sameShape = `s:${answer.shape}:${unitOthers.length ? parseItem(unitOthers[0])?.color : pickColors(1, [answer.color as ColorId])[0]}`;
            const extraColor = pickColors(1, [...things.map((id) => parseItem(id)?.color as ColorId)])[0] ?? "orange";
            const extra = [sameColor, sameShape, ...unitOthers, `s:${otherShape}:${answer.color}`, `s:${answer.shape}:${extraColor}`];
            choices = [...answers, ...Array.from(new Set(extra.filter((id) => !answers.includes(id))))].slice(0, size);
        } else {
            const unitOthers = shuffle(things.filter((id) => !answers.includes(id)));
            choices = [...answers, ...unitOthers, ...pool].slice(0, size);
        }

        rounds.push({
            ...base,
            kind: "repeat",
            carrier: demo ? (lastCarrier = "caterpillar") : carrierFor(type, items.length),
            items,
            unit: unit.length,
            gaps,
            choices: shuffle(choices),
            step: 0,
        });
    }
    return rounds;
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

export const RETRY = "Probaj ponovo.";
export const RETRY_SLOW = "Probaj još jednom, polako.";
export const NEXT_GAP = "Tako je! Šta dolazi posle toga?";

/** „dve crvene”, „dva psa”, „dva srca” */
function two(noun: Noun): string {
    return `${noun.gender === "f" ? "dve" : "dva"} ${noun.gen}`;
}

/** Delovi jedinice: [„dve crvene”, „plava”] */
function unitParts(unit: readonly string[], plain: boolean): string[] {
    const parts: string[] = [];
    for (let i = 0; i < unit.length; ) {
        let run = 1;
        while (unit[i + run] === unit[i]) run += 1;
        const noun = itemNoun(unit[i], plain);
        parts.push(run === 1 ? noun.name : two(noun));
        i += run;
    }
    return parts;
}

/** Jedinica rečima: „dve crvene, pa plava”, „mačka, pas, pa riba” */
export function describeUnit(unit: readonly string[], plain = false): string {
    const parts = unitParts(unit, plain);
    if (parts.length === 1) return parts[0];
    return `${parts.slice(0, -1).join(", ")}, pa ${parts[parts.length - 1]}`;
}

/** Krug jedinice: „Dve crvene, plava, pa opet ispočetka.” */
export function cycleSentence(unit: readonly string[], plain = false): string {
    return `${cap(unitParts(unit, plain).join(", "))}, pa opet ispočetka.`;
}

/** Čitanje niza: „Crvena, plava, crvena, plava” (do `end`, bez njega) */
function readRow(items: readonly string[], end: number, plain: boolean): string {
    return cap(items.slice(0, end).map((id) => itemSpoken(id, plain)).join(", "));
}

type ViewLike = Pick<PatternView, "kind" | "items" | "unit" | "gaps" | "filled" | "step" | "read" | "rows" | "structure">;

/** Prazno mesto koje se sada popunjava (−1 kad ga nema) */
export function currentGap(view: Pick<PatternView, "gaps" | "filled">): number {
    return view.gaps[Math.min(view.filled, view.gaps.length - 1)] ?? -1;
}

/** Tačan izbor za tekuće prazno mesto (ili tekući red kod prenošenja pravila) */
export function currentAnswer(view: Pick<PatternView, "kind" | "items" | "gaps" | "filled" | "structure">): string | null {
    if (view.kind === "transfer") return view.structure;
    const gap = currentGap(view);
    return gap >= 0 ? (view.items[gap] ?? null) : null;
}

const stepWords: Record<number, string> = { 1: "jedan", 2: "dva", 3: "tri", 5: "pet", 10: "deset" };

function countRule(step: number): string {
    return `Svaki put je ${stepWords[Math.abs(step)] ?? Math.abs(step)} ${step > 0 ? "više" : "manje"}.`;
}

function growRule(items: readonly string[]): string {
    return `Svaki put je jedna ${parseItem(items[0])?.kind === "stars" ? "zvezdica" : "tačkica"} više.`;
}

function turnRule(items: readonly string[], step: number): string {
    if (parseItem(items[0])?.kind === "clock") return "Kazaljka se svaki put pomeri za četvrt kruga, kao na satu.";
    return step > 0 ? "Strelica se svaki put okrene za četvrt kruga, kao kazaljka na satu." : "Strelica se svaki put okrene za četvrt kruga, ali unazad.";
}

/** Pitanje na ekranu */
export function patternQuestion(view: ViewLike): string {
    switch (view.kind) {
        case "grow":
            return parseItem(view.items[0])?.kind === "stars" ? "Koliko zvezdica dolazi sledeće?" : "Koliko tačkica dolazi sledeće?";
        case "count":
            return "Koji broj dolazi sledeći?";
        case "turn":
            return parseItem(view.items[0])?.kind === "clock" ? "Gde će kazaljka biti sledeće?" : "Kuda će strelica pokazivati sledeće?";
        case "transfer":
            return "Koji niz ide po istom pravilu?";
        default: {
            const gap = currentGap(view);
            if (view.gaps.length > 1) return view.filled > 0 ? "Šta dolazi posle toga?" : "Šta dolazi sledeće?";
            return gap < view.items.length - 1 ? "Šta fali u nizu?" : "Šta dolazi sledeće?";
        }
    }
}

/** Šta glas kaže na početku zadatka: na lakim nivoima prvo ritmično pročita niz do praznog mesta */
export function patternVoiceQuestion(view: ViewLike): string {
    const question = patternQuestion(view);
    if (view.kind !== "repeat" || !view.read) return question;
    const gap = currentGap(view);
    return `${readRow(view.items, gap, plainShapes(view.items))}… ${question}`;
}

/** Posle greške: mirna činjenica o pravilu (i šta je dobro u izboru, kad je jedna osobina dobra) */
export function mistakeSentence(view: ViewLike, picked: string): string {
    switch (view.kind) {
        case "grow":
            return growRule(view.items);
        case "count":
            return countRule(view.step);
        case "turn":
            return turnRule(view.items, view.step);
        case "transfer": {
            const row = view.rows.find((r) => r.id === picked);
            if (!row || !view.structure) return "";
            const plain = plainShapes(row.items);
            return `Taj niz ide: ${describeUnit(row.items.slice(0, row.id.length), plain)}. Naš niz ide: ${describeUnit(view.items.slice(0, view.structure.length))}.`;
        }
        default: {
            const gap = currentGap(view);
            const answer = view.items[gap];
            if (!answer || view.unit <= 0) return "";
            const plain = plainShapes(view.items);
            const unit = view.items.slice(0, view.unit);
            let lead = "";
            const a = parseItem(answer);
            const p = parseItem(picked);
            if (!plain && a?.kind === "shape" && p?.kind === "shape") {
                if (a.color === p.color && a.shape !== p.shape) lead = "Boja je dobra, ali oblik nije. ";
                else if (a.shape === p.shape && a.color !== p.color) lead = "Oblik je dobar, ali boja nije. ";
            }
            // „Posle X uvek dolazi Y” kad je to tačno za celu jedinicu; inače se kaže cela jedinica
            const before = gap > 0 ? view.items[gap - 1] : null;
            const always = before !== null && unit.every((id, i) => id !== before || unit[(i + 1) % unit.length] === answer);
            if (always && before) return `${lead}Posle ${itemNoun(before, plain).gen} uvek dolazi ${itemNoun(answer, plain).name}.`;
            return `${lead}${cycleSentence(unit, plain)}`;
        }
    }
}

/** Posle tačnog odgovora (pohvala se dodaje ispred): niz ritmično, ili pravilo na težim nivoima */
export function solvedSentence(view: ViewLike): string {
    switch (view.kind) {
        case "grow":
            return `${view.items.map((id) => parseItem(id)?.value ?? "").join(", ")}. ${growRule(view.items)}`;
        case "count":
            return `${view.items.map((id) => parseItem(id)?.value ?? "").join(", ")}. ${countRule(view.step)}`;
        case "turn":
            return turnRule(view.items, view.step);
        case "transfer": {
            const row = view.rows.find((r) => r.id === view.structure);
            if (!row || !view.structure) return "";
            return `Isto pravilo: ${describeUnit(view.items.slice(0, view.structure.length))} — ${describeUnit(row.items.slice(0, row.id.length), plainShapes(row.items))}.`;
        }
        default: {
            const plain = plainShapes(view.items);
            if (view.read) return `${readRow(view.items, view.items.length, plain)}.`;
            return cycleSentence(view.items.slice(0, view.unit), plain);
        }
    }
}

/** Opis niza za čitače ekrana („prazno mesto” na mestu znaka pitanja) */
export function rowSpoken(view: Pick<PatternView, "items" | "gaps" | "filled">): string {
    const plain = plainShapes(view.items);
    const open = new Set(view.gaps.slice(view.filled));
    return view.items.map((id, i) => (open.has(i) ? "prazno mesto" : itemSpoken(id, plain))).join(", ");
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface PatternView extends BaseView {
    kind: PatternKind;
    carrier: CarrierId;
    items: string[];
    unit: number;
    gaps: number[];
    /** Koliko praznih mesta je već popunjeno */
    filled: number;
    choices: string[];
    rows: TransferRow[];
    structure: Structure | null;
    step: number;
    grouped: boolean;
    read: boolean;
    /** Poslednji izbor (netačan se kratko označi) */
    picked: string | null;
    /** Netačni izbori za tekuće prazno mesto (zatamnjeni) */
    wrong: string[];
    /** Greške u celom zadatku (sa oba prazna mesta) */
    misses: number;
    hint: boolean;
    /** Pomoć je bila u ovom zadatku (i za prvo od dva prazna mesta) */
    helped: boolean;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyPatternView(totalRounds: number): PatternView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "repeat",
        carrier: "train",
        items: [],
        unit: 0,
        gaps: [],
        filled: 0,
        choices: [],
        rows: [],
        structure: null,
        step: 0,
        grouped: false,
        read: false,
        picked: null,
        wrong: [],
        misses: 0,
        hint: false,
        helped: false,
        feedback: null,
    };
}

export function patternRoundView(round: PatternRound): Partial<PatternView> {
    return {
        kind: round.kind,
        carrier: round.carrier,
        items: [...round.items],
        unit: round.unit,
        gaps: [...round.gaps],
        filled: 0,
        choices: [...round.choices],
        rows: round.rows.map((row) => ({ id: row.id, items: [...row.items] })),
        structure: round.structure,
        step: round.step,
        grouped: round.grouped,
        read: round.read,
        picked: null,
        wrong: [],
        misses: 0,
        hint: false,
        helped: false,
        feedback: null,
    };
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen (popunjena sva prazna mesta ili izabran pravi red). Prvi zadatak prvog
 * nivoa pokazuje ruka (ne ocenjuje se); „correct” = bez ijedne greške i bez pomoći;
 * „prompted” = uz pomoć (osim pokaznog).
 */
export function solvePatternView(current: PatternView, level: number, solved: Partial<PatternView> = {}): { next: PatternView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hint || current.helped;
    const firstTry = current.misses === 0 && current.wrong.length === 0 && !helped && !modeled;
    const next: PatternView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function patternResult(final: PatternView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

const KINDS: readonly PatternKind[] = ["repeat", "grow", "count", "turn", "transfer"];
const MAX_ITEMS = 12;

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergePatternMonitor(state: Partial<PatternView> | null | undefined): PatternView {
    const base = emptyPatternView(1);
    if (!state || typeof state !== "object") return base;
    const kind = KINDS.includes(state.kind as PatternKind) ? (state.kind as PatternKind) : "repeat";
    const itemList = (value: unknown) => (Array.isArray(value) ? value.filter(isPatternItem).slice(0, MAX_ITEMS) : []);
    const items = itemList(state.items);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const gaps = Array.isArray(state.gaps)
        ? Array.from(new Set(state.gaps.filter((g): g is number => Number.isInteger(g) && g >= 0 && g < items.length))).slice(0, 2)
        : [];
    const rows: TransferRow[] =
        kind === "transfer" && Array.isArray(state.rows)
            ? state.rows
                  .filter((row): row is TransferRow => Boolean(row) && typeof row === "object" && isStructure((row as TransferRow).id))
                  .map((row) => ({ id: row.id, items: itemList(row.items) }))
                  .filter((row, i, all) => row.items.length > 0 && all.findIndex((other) => other.id === row.id) === i)
                  .slice(0, 6)
            : [];
    const choices =
        kind === "transfer"
            ? rows.map((row) => row.id)
            : Array.isArray(state.choices)
              ? Array.from(new Set(state.choices.filter(isPatternItem))).slice(0, 6)
              : [];
    const structure = kind === "transfer" && isStructure(state.structure) && choices.includes(state.structure) ? state.structure : null;
    const valid = (id: unknown) => typeof id === "string" && choices.includes(id);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind,
        carrier: (CARRIER_IDS as readonly string[]).includes(state.carrier as string) ? (state.carrier as CarrierId) : "train",
        items,
        unit: Math.min(toCount(state.unit, 0), items.length),
        gaps,
        filled: Math.min(toCount(state.filled, 0), gaps.length),
        choices,
        rows,
        structure,
        step: Math.max(-10, Math.min(10, Math.round(typeof state.step === "number" && Number.isFinite(state.step) ? state.step : 0))),
        grouped: state.grouped === true,
        read: state.read === true,
        picked: valid(state.picked) ? (state.picked as string) : null,
        wrong: Array.isArray(state.wrong) ? Array.from(new Set(state.wrong.filter(valid))) : [],
        misses: toCount(state.misses, 0),
        hint: state.hint === true,
        helped: state.helped === true,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
