// Sadržaj igre „Šta ne pripada?”: na polici stoje 3–5 slika, a jedna ne ide uz ostale. Dete je
// pronađe, ona veselo iskoči iz grupe, a ostale ostanu zajedno u okviru koji kaže šta ih spaja
// („Sve je voće.”). Na teškim nivoima dete posle toga bira i ZAŠTO (boja, oblik, veličina, broj,
// vrsta, prvi glas). Bez Reacta, da bi se nivoi proveravali u testovima; crteži su u games/oddone/.
//
// Zašto ovako (uzrast 4–9, i deca sa autizmom):
//  • Deca od 4 do 9 godina vole zagonetke „pronađi uljeza”: kratke su, odmah se vidi rezultat, a
//    slike su poznate (životinje, voće, vozila, igračke, dinosaurusi). Igra razvija kategorije i
//    rečnik (voće/povrće, gde ko živi, čemu služi), vizuelnu pažnju, rano zaključivanje i — na
//    kraju — kognitivnu fleksibilnost: iste slike, a pravilo se menja („Sada gledaj boju.”), što
//    je izvršna funkcija koja deci sa autizmom često teško ide (DCCS zadatak, Zelazo 2006).
//  • Učenje bez greške (errorless learning): prvo je razlika čisto opažajna (jedna boja među
//    istim krugovima — „iskače” sama), prvi zadatak prvog nivoa pokaže ruka (ne ocenjuje se), a
//    pomoć (tačna slika blago zasvetli) na lakim nivoima stiže već posle prve greške i posle
//    čekanja. Pogrešno izabrana slika se samo utiša; ostaje manje izbora.
//  • Vizuelna podrška se povlači (stimulus fading): na lakim nivoima mala oznaka kaže šta se
//    gleda (boja, oblik, veličina, vrsta), kasnije je nema; tri pa četiri pa pet slika.
//  • Uvek tačno jedna slika koja se može braniti (testovi to proveravaju za svako svojstvo:
//    boja, oblik, veličina, broj, vrsta, gde živi, leti li, čemu služi, prvi glas, parnost).
//    Mamac (druga boja, drugi oblik) postoji samo kad je baš on zadatak nivoa.
//  • Glas kaže činjenicu i razlog („Mačka, pas i krava su životinje. Jabuka je voće.”); posle
//    promašaja mirno kaže šta važi za izabranu sliku („Patka leti. Pogledaj šta ne leti.”).
//    Nikad ne kaže gde treba dodirnuti; nema tajmera ni žurbe.
//  • Predvidljiv raspored: slike uvek stoje na polici istim redom, grupa se uvek okupi na istom
//    mestu, a „Zašto?” izbori su uvek iste sličice sa rečju (ikonice iz lakih nivoa).
// Nivoi: Lako — boja, oblik, veličina, očigledne vrste (životinje / voće, vozila / životinje);
// Srednje — voće / povrće, šta leti, gde ko živi, čemu služi, oblik uz boju kao mamac;
// Teško — broj, isto slike pa drugo pravilo, pa „Zašto?” sa dva i tri razloga i skriveno pravilo
// (parni brojevi, prvi glas reči).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

// ── Rod i pridevi ─────────────────────────────────────────────────────────────

export type Gender = "m" | "f" | "n";

const ADJ_END = {
    /** „krug je plav”, „zvezda je plava”, „srce je plavo” */
    sg: { m: "", f: "a", n: "o" },
    /** „plavi krug”, „plava zvezda”, „plavo srce” */
    def: { m: "i", f: "a", n: "o" },
} as const;

const ALL_WORD: Record<Gender, string> = { m: "Svi", f: "Sve", n: "Sva" };
const OTHERS_WORD: Record<Gender, string> = { m: "Ostali", f: "Ostale", n: "Ostala" };

// ── Boje i oblici ─────────────────────────────────────────────────────────────

export const COLOR_IDS = ["red", "blue", "yellow", "green", "purple", "orange"] as const;
export type ColorId = (typeof COLOR_IDS)[number];

/** Osnova prideva: crven → crveni, crvena, crveno */
export const COLOR_STEMS: Readonly<Record<ColorId, string>> = {
    red: "crven",
    blue: "plav",
    yellow: "žut",
    green: "zelen",
    purple: "ljubičast",
    orange: "narandžast",
};

export function isColorId(value: unknown): value is ColorId {
    return typeof value === "string" && (COLOR_IDS as readonly string[]).includes(value);
}

function colorAdj(color: ColorId, form: keyof typeof ADJ_END, g: Gender): string {
    return COLOR_STEMS[color] + ADJ_END[form][g];
}

export const SHAPE_IDS = ["circle", "square", "triangle", "star", "heart"] as const;
export type ShapeId = (typeof SHAPE_IDS)[number];

export const SHAPES: Readonly<Record<ShapeId, { name: string; plural: string; g: Gender }>> = {
    circle: { name: "krug", plural: "krugovi", g: "m" },
    square: { name: "kvadrat", plural: "kvadrati", g: "m" },
    triangle: { name: "trougao", plural: "trouglovi", g: "m" },
    star: { name: "zvezda", plural: "zvezde", g: "f" },
    heart: { name: "srce", plural: "srca", g: "n" },
};

export function isShapeId(value: unknown): value is ShapeId {
    return typeof value === "string" && (SHAPE_IDS as readonly string[]).includes(value);
}

export const SIZE_IDS = ["small", "mid", "big"] as const;
export type SizeId = (typeof SIZE_IDS)[number];

/** „veliki krug” / „krug je veliki”, „mala zvezda” / „zvezda je mala” */
function sizeAdj(size: SizeId, g: Gender): string {
    const stem = size === "big" ? "velik" : "mal";
    return stem + ADJ_END.def[g];
}

// ── Stvari (slike) ────────────────────────────────────────────────────────────

export type Kind = "animal" | "fruit" | "vegetable" | "vehicle" | "clothes" | "toy" | "sweet" | "dino" | "instrument" | "dish" | "hygiene" | "art";
export type Home = "farm" | "sea" | "forest" | "house";
export type Use = "eat" | "music" | "wash" | "draw" | "write";

export interface Thing {
    id: string;
    /** Kako se zove (nominativ jednine) */
    name: string;
    g: Gender;
    kind?: Kind;
    /** Glavna boja crteža; „mixed” kad nema jedne (nikad nije zajednička) */
    color: ColorId | "white" | "brown" | "gray" | "pink" | "black" | "teal" | "mixed";
    home?: Home;
    /** Leti li (bez vrednosti kad nije jasno — pile, ćurka) */
    flies?: boolean;
    use?: Use;
    /** Genitiv množine, za brojanje („Riba ima 4.”) */
    gen?: string;
}

const t = (id: string, name: string, g: Gender, color: Thing["color"], extra: Partial<Omit<Thing, "id" | "name" | "g" | "color">> = {}): Thing => ({ id, name, g, color, ...extra });
const animal = (id: string, name: string, g: Gender, color: Thing["color"], extra: Partial<Thing> = {}): Thing => t(id, name, g, color, { kind: "animal", ...extra });

/**
 * Sve slike igre. Većina je iz zajedničkog kompleta (`pictures`, <Picture id=…/>); lisica,
 * veverica, rak, morska zvezda i tri dinosaurusa su nacrtani u games/oddone/ (OWN_THINGS).
 */
export const THINGS: readonly Thing[] = [
    // Životinje: domaće
    animal("cat", "mačka", "f", "orange", { home: "house", flies: false, gen: "mačaka" }),
    animal("dog", "pas", "m", "brown", { home: "house", flies: false, gen: "pasa" }),
    animal("cow", "krava", "f", "white", { home: "farm", flies: false }),
    animal("pig", "svinja", "f", "pink", { home: "farm", flies: false }),
    animal("sheep", "ovca", "f", "white", { home: "farm", flies: false }),
    animal("chick", "pile", "n", "yellow", { home: "farm" }),
    animal("turkey", "ćurka", "f", "brown", { home: "farm" }),
    animal("duck", "patka", "f", "white", { flies: true }),
    animal("mouse", "miš", "m", "gray", { flies: false }),
    // Šuma
    animal("hedgehog", "jež", "m", "brown", { home: "forest", flies: false }),
    animal("owl", "sova", "f", "brown", { home: "forest", flies: true }),
    animal("reindeer", "jelen", "m", "brown", { home: "forest", flies: false }),
    animal("fox", "lisica", "f", "orange", { home: "forest", flies: false }),
    animal("squirrel", "veverica", "f", "brown", { home: "forest", flies: false }),
    // More
    animal("fish", "riba", "f", "orange", { home: "sea", flies: false, gen: "riba" }),
    animal("whale", "kit", "m", "blue", { home: "sea", flies: false }),
    animal("octopus", "hobotnica", "f", "pink", { home: "sea", flies: false }),
    animal("dolphin", "delfin", "m", "blue", { home: "sea", flies: false }),
    animal("crab", "rak", "m", "red", { home: "sea", flies: false }),
    animal("starfish", "morska zvezda", "f", "orange", { home: "sea", flies: false }),
    // Ostale životinje
    animal("lion", "lav", "m", "yellow", { flies: false }),
    animal("elephant", "slon", "m", "gray", { flies: false }),
    animal("giraffe", "žirafa", "f", "yellow", { flies: false }),
    animal("turtle", "kornjača", "f", "green", { flies: false }),
    animal("frog", "žaba", "f", "green", { flies: false }),
    animal("snail", "puž", "m", "mixed", { flies: false }),
    animal("bird", "ptica", "f", "blue", { flies: true }),
    animal("bee", "pčela", "f", "yellow", { flies: true, gen: "pčela" }),
    animal("butterfly", "leptir", "m", "purple", { flies: true }),
    animal("ladybug", "bubamara", "f", "red", { flies: true, gen: "bubamara" }),
    // Dinosaurusi
    t("tRex", "tiranosaurus", "m", "green", { kind: "dino", flies: false }),
    t("triceratops", "triceratops", "m", "orange", { kind: "dino", flies: false }),
    t("diplodocus", "diplodokus", "m", "purple", { kind: "dino", flies: false }),
    // Voće
    t("apple", "jabuka", "f", "red", { kind: "fruit", flies: false, gen: "jabuka" }),
    t("appleGreen", "zelena jabuka", "f", "green", { kind: "fruit", flies: false }),
    t("banana", "banana", "f", "yellow", { kind: "fruit", flies: false, gen: "banana" }),
    t("strawberry", "jagoda", "f", "red", { kind: "fruit", flies: false, gen: "jagoda" }),
    t("cherry", "trešnja", "f", "red", { kind: "fruit", flies: false, gen: "trešanja" }),
    t("lemon", "limun", "m", "yellow", { kind: "fruit", flies: false, gen: "limuna" }),
    t("pear", "kruška", "f", "green", { kind: "fruit", flies: false, gen: "krušaka" }),
    t("grapes", "grožđe", "n", "purple", { kind: "fruit", flies: false }),
    t("orange", "pomorandža", "f", "orange", { kind: "fruit", flies: false }),
    t("pineapple", "ananas", "m", "yellow", { kind: "fruit", flies: false }),
    t("kiwi", "kivi", "m", "green", { kind: "fruit", flies: false }),
    t("watermelon", "lubenica", "f", "mixed", { kind: "fruit", flies: false }),
    t("coconut", "kokos", "m", "brown", { kind: "fruit", flies: false }),
    // Povrće
    t("carrot", "šargarepa", "f", "orange", { kind: "vegetable", flies: false }),
    t("tomato", "paradajz", "m", "red", { kind: "vegetable", flies: false }),
    t("broccoli", "brokoli", "m", "green", { kind: "vegetable", flies: false }),
    t("cucumber", "krastavac", "m", "green", { kind: "vegetable", flies: false }),
    // Vozila
    t("car", "auto", "m", "blue", { kind: "vehicle", flies: false }),
    t("bus", "autobus", "m", "yellow", { kind: "vehicle", flies: false }),
    t("train", "voz", "m", "blue", { kind: "vehicle", flies: false }),
    t("fireTruck", "vatrogasni kamion", "m", "red", { kind: "vehicle", flies: false }),
    t("tractor", "traktor", "m", "green", { kind: "vehicle", flies: false }),
    t("bicycle", "bicikl", "m", "red", { kind: "vehicle", flies: false }),
    t("scooter", "trotinet", "m", "red", { kind: "vehicle", flies: false }),
    t("boat", "brod", "m", "white", { kind: "vehicle", flies: false }),
    t("plane", "avion", "m", "white", { kind: "vehicle", flies: true }),
    t("helicopter", "helikopter", "m", "orange", { kind: "vehicle", flies: true }),
    t("rocket", "raketa", "f", "white", { kind: "vehicle", flies: true }),
    // Odeća
    t("tshirt", "majica", "f", "orange", { kind: "clothes", flies: false }),
    t("scarf", "šal", "m", "red", { kind: "clothes", flies: false }),
    t("jacket", "jakna", "f", "red", { kind: "clothes", flies: false }),
    t("shorts", "šorc", "m", "teal", { kind: "clothes", flies: false }),
    t("cap", "kapa", "f", "blue", { kind: "clothes", flies: false }),
    t("dress", "haljina", "f", "pink", { kind: "clothes", flies: false }),
    t("sock", "čarapa", "f", "orange", { kind: "clothes", flies: false }),
    t("sunHat", "šešir", "m", "yellow", { kind: "clothes", flies: false }),
    // Igračke
    t("ball", "lopta", "f", "red", { kind: "toy", flies: false, gen: "lopti" }),
    t("teddy", "meda", "m", "brown", { kind: "toy", flies: false }),
    t("toyDuck", "patkica", "f", "yellow", { kind: "toy", flies: false, gen: "patkica" }),
    t("balloon", "balon", "m", "purple", { kind: "toy", flies: true, gen: "balona" }),
    t("kite", "zmaj", "m", "yellow", { kind: "toy", flies: true }),
    t("dice", "kocka", "f", "white", { kind: "toy", flies: false }),
    t("puzzlePiece", "slagalica", "f", "blue", { kind: "toy", flies: false }),
    // Slatkiši
    t("cake", "torta", "f", "pink", { kind: "sweet", flies: false }),
    t("cupcake", "kolačić", "m", "pink", { kind: "sweet", flies: false }),
    t("iceCream", "sladoled", "m", "mixed", { kind: "sweet", flies: false }),
    t("chocolate", "čokolada", "f", "brown", { kind: "sweet", flies: false }),
    // Čemu služi
    t("spoon", "kašika", "f", "gray", { kind: "dish", use: "eat", flies: false }),
    t("fork", "viljuška", "f", "gray", { kind: "dish", use: "eat", flies: false }),
    t("plate", "tanjir", "m", "white", { kind: "dish", use: "eat", flies: false }),
    t("glass", "čaša", "f", "mixed", { kind: "dish", use: "eat", flies: false }),
    t("bowl", "činija", "f", "mixed", { kind: "dish", use: "eat", flies: false }),
    t("guitar", "gitara", "f", "brown", { kind: "instrument", use: "music", flies: false }),
    t("trumpet", "truba", "f", "yellow", { kind: "instrument", use: "music", flies: false }),
    t("violin", "violina", "f", "brown", { kind: "instrument", use: "music", flies: false }),
    t("piano", "klavir", "m", "black", { kind: "instrument", use: "music", flies: false }),
    t("drum", "bubanj", "m", "red", { kind: "instrument", use: "music", flies: false }),
    t("saxophone", "saksofon", "m", "yellow", { kind: "instrument", use: "music", flies: false }),
    t("soap", "sapun", "m", "pink", { kind: "hygiene", use: "wash", flies: false }),
    t("sponge", "sunđer", "m", "yellow", { kind: "hygiene", use: "wash", flies: false }),
    t("toothbrush", "četkica za zube", "f", "blue", { kind: "hygiene", use: "wash", flies: false }),
    t("shampoo", "šampon", "m", "purple", { kind: "hygiene", use: "wash", flies: false }),
    t("crayon", "bojica", "f", "orange", { kind: "art", use: "draw", flies: false }),
    t("palette", "paleta", "f", "brown", { kind: "art", use: "draw", flies: false }),
    t("pencil", "olovka", "f", "yellow", { kind: "art", use: "write", flies: false }),
    // Za brojanje
    t("heartRed", "srce", "n", "red", { flies: false, gen: "srca" }),
    t("star", "zvezda", "f", "yellow", { flies: false, gen: "zvezda" }),
];

/** Slike koje su nacrtane u ovoj igri (games/oddone/OddOneArt.tsx); ostale su iz `pictures` */
export const OWN_THINGS = ["fox", "squirrel", "crab", "starfish", "tRex", "triceratops", "diplodocus"] as const;

const THING_MAP = new Map(THINGS.map((thing) => [thing.id, thing]));

export function getThing(id: unknown): Thing | undefined {
    return typeof id === "string" ? THING_MAP.get(id) : undefined;
}

// ── Šta spaja grupu (rečenice) ────────────────────────────────────────────────

interface Phrase {
    /** „Jabuka je voće.” */
    sg: string;
    /** „Mačka, pas i krava su životinje.” */
    pl: string;
    /** Natpis na okviru grupe */
    label: string;
    /** „Pogledaj šta nije životinja.” */
    look: string;
}

export const KIND_PHRASES: Readonly<Partial<Record<Kind, Phrase>>> = {
    animal: { sg: "je životinja", pl: "su životinje", label: "Sve su životinje.", look: "šta nije životinja" },
    fruit: { sg: "je voće", pl: "su voće", label: "Sve je voće.", look: "šta nije voće" },
    vegetable: { sg: "je povrće", pl: "su povrće", label: "Sve je povrće.", look: "šta nije povrće" },
    vehicle: { sg: "je vozilo", pl: "su vozila", label: "Sva su vozila.", look: "šta nije vozilo" },
    clothes: { sg: "je odeća", pl: "su odeća", label: "Sve je odeća.", look: "šta nije odeća" },
    toy: { sg: "je igračka", pl: "su igračke", label: "Sve su igračke.", look: "šta nije igračka" },
    sweet: { sg: "je slatkiš", pl: "su slatkiši", label: "Svi su slatkiši.", look: "šta nije slatkiš" },
    dino: { sg: "je dinosaurus", pl: "su dinosaurusi", label: "Svi su dinosaurusi.", look: "šta nije dinosaurus" },
};

export const HOME_PHRASES: Readonly<Record<Home, Phrase>> = {
    farm: { sg: "živi na farmi", pl: "žive na farmi", label: "Sve žive na farmi.", look: "ko ne živi na farmi" },
    sea: { sg: "živi u moru", pl: "žive u moru", label: "Sve žive u moru.", look: "ko ne živi u moru" },
    forest: { sg: "živi u šumi", pl: "žive u šumi", label: "Sve žive u šumi.", look: "ko ne živi u šumi" },
    house: { sg: "živi u kući", pl: "žive u kući", label: "Sve žive u kući.", look: "ko ne živi u kući" },
};

export const FLY_PHRASES: Readonly<Record<"yes" | "no", Phrase>> = {
    yes: { sg: "leti", pl: "lete", label: "Sve ovo leti.", look: "šta ne leti" },
    no: { sg: "ne leti", pl: "ne lete", label: "Ništa od ovoga ne leti.", look: "šta leti" },
};

export const USE_PHRASES: Readonly<Record<Use, Phrase>> = {
    eat: { sg: "služi za jelo", pl: "služe za jelo", label: "Sve služi za jelo.", look: "šta ne služi za jelo" },
    music: { sg: "služi za sviranje", pl: "služe za sviranje", label: "Sve služi za sviranje.", look: "šta ne služi za sviranje" },
    wash: { sg: "služi za pranje", pl: "služe za pranje", label: "Sve služi za pranje.", look: "šta ne služi za pranje" },
    draw: { sg: "služi za crtanje", pl: "služe za crtanje", label: "Sve služi za crtanje.", look: "šta ne služi za crtanje" },
    write: { sg: "služi za pisanje", pl: "služe za pisanje", label: "Sve služi za pisanje.", look: "šta ne služi za pisanje" },
};

/** Prvi glas reči, kako ga dete čuje: „lj”, „nj” i „dž” su jedan glas */
export function firstSound(word: string): string {
    const lower = word.toLocaleLowerCase("sr");
    const two = lower.slice(0, 2);
    const sound = two === "lj" || two === "nj" || two === "dž" ? two : lower.charAt(0);
    return sound.charAt(0).toLocaleUpperCase("sr") + sound.slice(1);
}

// ── Kartice i svojstva ────────────────────────────────────────────────────────

export type CardLook = "shape" | "pic" | "count" | "number";

/** Jedna kartica na polici. Sve što treba za crtež i za rečenice je ovde (i u monitoru). */
export interface OddCard {
    /** Stalan ključ kartice u zadatku (data-action="choice:<id>") */
    id: string;
    look: CardLook;
    shape?: ShapeId;
    color?: ColorId;
    size: SizeId;
    pic?: string;
    /** Koliko istih stvari je na kartici (brojanje) */
    count?: number;
    /** Broj na kartici (skriveno pravilo: parni i neparni) */
    num?: number;
}

/** Svojstva po kojima se slike mogu grupisati — za proveru da je uljez samo jedan */
export const DIMS = ["color", "shape", "size", "count", "kind", "home", "flies", "use", "sound", "parity", "item"] as const;
export type Dim = (typeof DIMS)[number];

/** Pravilo zadatka: po čemu grupa ide zajedno */
export const RULE_IDS = ["color", "shape", "size", "count", "kind", "home", "flies", "use", "sound", "parity"] as const;
export type RuleId = (typeof RULE_IDS)[number];

/** Vrednost svojstva kartice; bez vrednosti (undefined) nikad nije zajednička */
export function cardValue(card: OddCard, dim: Dim): string | undefined {
    const pic = card.pic ? getThing(card.pic) : undefined;
    switch (dim) {
        case "color":
            if (card.color) return card.color;
            return pic && pic.color !== "mixed" ? pic.color : undefined;
        case "shape":
            return card.shape;
        case "size":
            return card.size;
        case "count":
            return String(card.count ?? 1);
        case "kind":
            if (card.look === "shape") return "shape";
            if (card.look === "number") return "number";
            return pic?.kind;
        case "home":
            return pic?.home;
        case "flies":
            return pic?.flies === undefined ? undefined : pic.flies ? "yes" : "no";
        case "use":
            return pic?.use;
        case "sound":
            return pic && !pic.name.includes(" ") ? firstSound(pic.name) : undefined;
        case "parity":
            return card.num === undefined ? undefined : card.num % 2 === 0 ? "even" : "odd";
        case "item":
            if (card.look === "number") return `n${card.num}`;
            return card.pic;
    }
}

/** Kartice koje su „uljez” po svojstvu `dim`: sve ostale imaju istu vrednost, a ona drugu */
export function outliersBy(cards: readonly OddCard[], dim: Dim): string[] {
    if (cards.length < 3) return [];
    return cards
        .filter((card) => {
            const others = cards.filter((other) => other !== card).map((other) => cardValue(other, dim));
            const first = others[0];
            return first !== undefined && others.every((value) => value === first) && cardValue(card, dim) !== first;
        })
        .map((card) => card.id);
}

/** Sve kartice koje bi dete moglo da odbrani kao uljeza (po bilo kom svojstvu) */
export function defensibleOdds(cards: readonly OddCard[], dims: readonly Dim[] = DIMS): string[] {
    const found = new Set<string>();
    for (const dim of dims) for (const id of outliersBy(cards, dim)) found.add(id);
    return cards.filter((card) => found.has(card.id)).map((card) => card.id);
}

// ── Razlozi („Zašto?”) ────────────────────────────────────────────────────────

export const REASON_IDS = ["color", "shape", "size", "count", "kind", "sound"] as const;
export type ReasonId = (typeof REASON_IDS)[number];

export const REASONS: Readonly<Record<ReasonId, { label: string; acc: string; same: string; differ: string }>> = {
    color: { label: "Boja", acc: "boju", same: "Sve je iste boje.", differ: "Boje se razlikuju i kod ostalih." },
    shape: { label: "Oblik", acc: "oblik", same: "Sve je istog oblika.", differ: "Oblici se razlikuju i kod ostalih." },
    size: { label: "Veličina", acc: "veličinu", same: "Sve je iste veličine.", differ: "Veličine se razlikuju i kod ostalih." },
    count: { label: "Broj", acc: "broj", same: "Na svakoj slici je isti broj.", differ: "Brojevi se razlikuju i kod ostalih." },
    kind: { label: "Vrsta", acc: "vrstu", same: "Sve je iste vrste.", differ: "Vrste se razlikuju i kod ostalih." },
    sound: { label: "Prvi glas", acc: "prvi glas", same: "Sve počinje istim glasom.", differ: "I ostale reči počinju različitim glasom." },
};

export function isReasonId(value: unknown): value is ReasonId {
    return typeof value === "string" && (REASON_IDS as readonly string[]).includes(value);
}

/** Koji razlog je tačan za koje pravilo (parni brojevi su „broj”, gde živi i šta leti su „vrsta”) */
export const RULE_REASON: Readonly<Record<RuleId, ReasonId>> = {
    color: "color",
    shape: "shape",
    size: "size",
    count: "count",
    parity: "count",
    kind: "kind",
    home: "kind",
    flies: "kind",
    use: "kind",
    sound: "sound",
};

const REASON_DIM: Readonly<Record<ReasonId, Dim>> = { color: "color", shape: "shape", size: "size", count: "count", kind: "kind", sound: "sound" };

/** Razlozi koji imaju smisla za ovakve kartice (oblik nema smisla za voće, vrsta za krugove) */
const REASONS_FOR: Readonly<Record<CardLook, readonly ReasonId[]>> = {
    shape: ["color", "shape", "size", "count"],
    pic: ["color", "size", "kind", "count"],
    count: ["count", "color", "kind", "size"],
    number: ["count", "color", "size"],
};

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/** Vrste zadataka (svaka ima svoj „pravilnik” u `makeRound`) */
export type Maker =
    | "color"
    | "shape"
    | "size"
    | "sizePic"
    | "kindEasy"
    | "kindMid"
    | "kindClose"
    | "flies"
    | "home"
    | "use"
    | "lure"
    | "count"
    | "flex"
    | "colorLure"
    | "shapeLure"
    | "sizeLure"
    | "parity"
    | "sound";

/** Kako glasi pitanje (sve bez „gde dodirnuti”) */
export const PROMPT_IDS = ["color", "shape", "size", "plain", "count", "hidden", "focusFirst", "focusNext"] as const;
export type PromptId = (typeof PROMPT_IDS)[number];

export interface OddLevel {
    tier: "Lako" | "Srednje" | "Teško";
    /** Šta nivo uči (za tabelu nivoa) */
    task: string;
    makers: readonly Maker[];
    cards: number;
    rounds: number;
    /** Koliko razloga se nudi za „Zašto?” (0 = bez tog koraka) */
    why: number;
    /** Mala oznaka „šta se gleda” (vizuelna podrška lakih nivoa) */
    legend: ReasonId | null;
    prompt: PromptId;
    earlyHint: boolean;
}

export const ODDONE_LEVELS: readonly OddLevel[] = [
    // Lako: čisto opažajna razlika, pa očigledne vrste; oznaka kaže šta se gleda
    { tier: "Lako", task: "boja: isti oblici, jedan druge boje", makers: ["color"], cards: 4, rounds: 4, why: 0, legend: "color", prompt: "color", earlyHint: true },
    { tier: "Lako", task: "oblik: ista boja, jedan drugi oblik", makers: ["shape"], cards: 4, rounds: 5, why: 0, legend: "shape", prompt: "shape", earlyHint: true },
    { tier: "Lako", task: "veličina: jedan veliki među malima", makers: ["size", "sizePic"], cards: 4, rounds: 5, why: 0, legend: "size", prompt: "size", earlyHint: true },
    { tier: "Lako", task: "vrsta: tri životinje i jedno voće", makers: ["kindEasy"], cards: 4, rounds: 5, why: 0, legend: "kind", prompt: "plain", earlyHint: true },
    { tier: "Lako", task: "vrsta: vozila, životinje, odeća, dinosaurusi", makers: ["kindMid"], cards: 4, rounds: 5, why: 0, legend: "kind", prompt: "plain", earlyHint: true },
    // Srednje: bliske vrste i svojstva, bez oznake; pomoć po podešavanju
    { tier: "Srednje", task: "bliske vrste: voće i povrće", makers: ["kindClose"], cards: 4, rounds: 6, why: 0, legend: null, prompt: "plain", earlyHint: false },
    { tier: "Srednje", task: "svojstvo: šta leti", makers: ["flies"], cards: 4, rounds: 6, why: 0, legend: null, prompt: "plain", earlyHint: false },
    { tier: "Srednje", task: "gde živi: more, šuma, farma", makers: ["home"], cards: 5, rounds: 6, why: 0, legend: null, prompt: "plain", earlyHint: false },
    { tier: "Srednje", task: "čemu služi: jelo, sviranje, pranje", makers: ["use"], cards: 4, rounds: 6, why: 0, legend: null, prompt: "plain", earlyHint: false },
    { tier: "Srednje", task: "dva svojstva: oblik važi, boja je mamac", makers: ["lure"], cards: 4, rounds: 6, why: 0, legend: null, prompt: "plain", earlyHint: false },
    // Teško: broj, promena pravila, pa „Zašto?”
    { tier: "Teško", task: "broj: na jednoj slici ih je više ili manje", makers: ["count"], cards: 4, rounds: 6, why: 0, legend: null, prompt: "count", earlyHint: false },
    { tier: "Teško", task: "iste slike, drugo pravilo („Sada gledaj boju.”)", makers: ["flex"], cards: 4, rounds: 6, why: 0, legend: null, prompt: "focusFirst", earlyHint: false },
    { tier: "Teško", task: "uljez i zašto: dva razloga", makers: ["color", "shape", "size", "kindMid"], cards: 4, rounds: 5, why: 2, legend: null, prompt: "plain", earlyHint: false },
    { tier: "Teško", task: "uljez i zašto: tri razloga, sa mamcima", makers: ["colorLure", "shapeLure", "sizeLure", "count", "kindClose"], cards: 5, rounds: 5, why: 3, legend: null, prompt: "plain", earlyHint: false },
    { tier: "Teško", task: "skriveno pravilo: parni brojevi, prvi glas", makers: ["parity", "sound"], cards: 4, rounds: 6, why: 3, legend: null, prompt: "hidden", earlyHint: false },
];

export const ODDONE_MAX_LEVEL = ODDONE_LEVELS.length;

export function oddoneLevel(level: number): OddLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), ODDONE_MAX_LEVEL);
    return ODDONE_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

export interface OddRound {
    cards: OddCard[];
    odd: string;
    rule: RuleId;
    prompt: PromptId;
    /** Ponuđeni razlozi za „Zašto?” (prazno = bez tog koraka) */
    reasons: ReasonId[];
    reason: ReasonId | null;
    legend: ReasonId | null;
    /** Isti broj = iste kartice ostaju na polici (promena pravila) */
    pair: number;
}

interface BuildOptions {
    maxRounds: number;
    maxChoices: number;
    random?: () => number;
}

/** Jasno različite boje za prvi nivo (crvena i narandžasta su preblizu za četvorogodišnjake) */
const CONTRAST: readonly (readonly [ColorId, ColorId])[] = [
    ["red", "blue"],
    ["yellow", "purple"],
    ["green", "red"],
    ["blue", "yellow"],
    ["purple", "orange"],
    ["orange", "blue"],
    ["red", "green"],
    ["yellow", "blue"],
];

/** Za veličinu sa slikama: stvari jednostavnog obrisa */
const SIZE_PICS = ["apple", "ball", "fish", "toyDuck", "teddy", "balloon", "strawberry", "car"] as const;
/** Za brojanje: sitne stvari sa genitivom množine */
const COUNT_PICS = THINGS.filter((item) => item.gen).map((item) => item.id);
const EVENS = [2, 4, 6, 8, 10, 12];
const ODDS = [1, 3, 5, 7, 9, 11];

const KIND_PAIRS: Readonly<Record<"kindEasy" | "kindMid" | "kindClose", readonly (readonly [Kind, Kind])[]>> = {
    kindEasy: [
        ["animal", "fruit"],
        ["fruit", "animal"],
        ["animal", "toy"],
        ["animal", "fruit"],
    ],
    kindMid: [
        ["vehicle", "animal"],
        ["animal", "vehicle"],
        ["dino", "vehicle"],
        ["clothes", "fruit"],
        ["vehicle", "toy"],
    ],
    kindClose: [
        ["fruit", "vegetable"],
        ["vegetable", "fruit"],
        ["sweet", "fruit"],
        ["fruit", "vegetable"],
    ],
};

/** Slike jedne vrste (jednom rečju, da rečenice budu kratke) */
const KIND_POOL = (kind: Kind) => THINGS.filter((item) => item.kind === kind && !item.name.includes(" "));

const FLYERS = ["bird", "owl", "bee", "butterfly", "ladybug", "plane", "helicopter", "rocket", "kite", "balloon"];
const WALKERS = ["cat", "dog", "cow", "pig", "car", "bus", "train", "fish", "snail", "turtle", "elephant", "tractor", "bicycle", "boat", "giraffe", "teddy"];
const HOME_GROUPS: readonly Home[] = ["sea", "forest", "farm"];
const USE_GROUPS: readonly Use[] = ["eat", "music", "wash"];

/** Glasovi koje deca lako pobrkaju (s/š, c/č/ć…): uljez nikad ne počinje „skoro istim” glasom */
const NEAR_SOUNDS: readonly string[][] = [["S", "Š", "Z", "Ž"], ["C", "Č", "Ć"], ["D", "Đ", "Dž"], ["L", "Lj"], ["N", "Nj"]];

export function nearSounds(a: string, b: string): boolean {
    return a === b || NEAR_SOUNDS.some((set) => set.includes(a) && set.includes(b));
}

/** Reči za „prvi glas” (jedna reč, bez lj/nj/dž na početku) */
const SOUND_POOL = THINGS.filter((item) => !item.name.includes(" ") && !["lj", "nj", "dž"].includes(item.name.slice(0, 2)));

/**
 * Plan nivoa: zadaci jedan za drugim, bez iste vrste zadatka dvaput zaredom (dok ima druge) i
 * bez ponavljanja istog uljeza. Svaki zadatak prolazi proveru da je uljez tačno jedan; u retkom
 * slučaju kad slučajan izbor ne prođe, bira se ponovo. `random` daje [0, 1).
 */
export function buildOddoneLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): OddRound[] {
    const rule = oddoneLevel(level);
    const shuffle = <T,>(list: readonly T[]): T[] => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    let count = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const flex = rule.makers.includes("flex");
    if (flex) count -= count % 2;
    const n = Math.max(3, Math.min(rule.cards, Number.isFinite(maxChoices) ? maxChoices : rule.cards));
    const usedOdd = new Set<string>();
    const usedPics = new Map<string, number>();

    // Slike koje su se manje javljale imaju prednost (raznovrsnost unutar nivoa); kad izbor ne
    // prođe proveru više puta zaredom, bira se sasvim slučajno
    let loose = false;
    const fresh = (ids: readonly string[]) => (loose ? shuffle(ids) : shuffle(ids).sort((a, b) => (usedPics.get(a) ?? 0) - (usedPics.get(b) ?? 0)));
    /** Mamac (uljez liči na jednog iz grupe) ima smisla tek uz bar tri kartice u grupi */
    const lureFrom = <T,>(group: readonly T[], all: readonly T[]): T => (group.length >= 3 ? pick(group) : pick(all.filter((value) => !group.includes(value))));
    const note = (cards: readonly OddCard[]) => {
        for (const card of cards) if (card.pic) usedPics.set(card.pic, (usedPics.get(card.pic) ?? 0) + 1);
    };

    const shapeCard = (shape: ShapeId, color: ColorId, size: SizeId): OddCard => ({ id: "", look: "shape", shape, color, size });
    const picCard = (pic: string, size: SizeId = "mid"): OddCard => ({ id: pic, look: "pic", pic, size });

    /** Kartice redom (uljez na slučajnom mestu) sa jedinstvenim ključevima */
    const finish = (group: OddCard[], odd: OddCard): { cards: OddCard[]; odd: string } => {
        const cards = shuffle([...group, odd]);
        const seen = new Map<string, number>();
        const named = cards.map((card) => {
            const base = card.look === "shape" ? `${card.shape}-${card.color}${card.size === "mid" ? "" : `-${card.size}`}` : card.look === "number" ? `n${card.num}` : card.look === "count" ? `${card.pic}-${card.count}` : card.pic!;
            const times = (seen.get(base) ?? 0) + 1;
            seen.set(base, times);
            return { ...card, id: times > 1 ? `${base}-${times}` : base };
        });
        return { cards: named, odd: named[cards.indexOf(odd)].id };
    };

    // Jedan zadatak date vrste; null kad slučajan izbor ne prođe proveru (bira se ponovo)
    const attempt = (maker: Maker, index: number): { cards: OddCard[]; odd: string; rule: RuleId } | null => {
        const groupSize = n - 1;
        switch (maker) {
            case "color": {
                const shape = level === 1 && index === 0 ? "circle" : pick(SHAPE_IDS);
                const [main, other] = level === 1 && index === 0 ? (["red", "blue"] as const) : level <= 2 ? pick(CONTRAST) : shuffle(COLOR_IDS);
                const group = Array.from({ length: groupSize }, () => shapeCard(shape, main, "mid"));
                return { ...finish(group, shapeCard(shape, other, "mid")), rule: "color" };
            }
            case "shape": {
                const [main, other] = shuffle(SHAPE_IDS);
                const color = pick(COLOR_IDS);
                const group = Array.from({ length: groupSize }, () => shapeCard(main, color, "mid"));
                return { ...finish(group, shapeCard(other, color, "mid")), rule: "shape" };
            }
            case "size": {
                const shape = pick(SHAPE_IDS);
                const color = pick(COLOR_IDS);
                const big = level <= 5 || random() < 0.5;
                const group = Array.from({ length: groupSize }, () => shapeCard(shape, color, big ? "small" : "big"));
                return { ...finish(group, shapeCard(shape, color, big ? "big" : "small")), rule: "size" };
            }
            case "sizePic": {
                const pic = fresh(SIZE_PICS)[0];
                const group = Array.from({ length: groupSize }, () => picCard(pic, "small"));
                return { ...finish(group, picCard(pic, "big")), rule: "size" };
            }
            case "kindEasy":
            case "kindMid":
            case "kindClose": {
                const pairs = KIND_PAIRS[maker].filter(([kind]) => KIND_POOL(kind).length >= groupSize);
                const [kind, oddKind] = pick(pairs);
                const group = fresh(KIND_POOL(kind).map((item) => item.id)).slice(0, groupSize);
                const oddPool = KIND_POOL(oddKind).filter((item) => !usedOdd.has(item.id));
                const odd = pick(oddPool.length > 0 ? oddPool : KIND_POOL(oddKind)).id;
                return { ...finish(group.map((id) => picCard(id)), picCard(odd)), rule: "kind" };
            }
            case "flies": {
                const group = fresh(FLYERS).slice(0, groupSize);
                const odd = pick(WALKERS.filter((id) => !usedOdd.has(id)));
                return { ...finish(group.map((id) => picCard(id)), picCard(odd)), rule: "flies" };
            }
            case "home": {
                const home = pick(HOME_GROUPS.filter((h) => THINGS.filter((item) => item.home === h).length >= groupSize));
                const group = fresh(THINGS.filter((item) => item.home === home).map((item) => item.id)).slice(0, groupSize);
                const odd = pick(THINGS.filter((item) => item.home && item.home !== home && item.home !== "house" && !usedOdd.has(item.id)).map((item) => item.id));
                return { ...finish(group.map((id) => picCard(id)), picCard(odd)), rule: "home" };
            }
            case "use": {
                const use = pick(USE_GROUPS);
                const group = fresh(THINGS.filter((item) => item.use === use).map((item) => item.id)).slice(0, groupSize);
                const odd = pick(THINGS.filter((item) => item.use && item.use !== use && !usedOdd.has(item.id)).map((item) => item.id));
                return { ...finish(group.map((id) => picCard(id)), picCard(odd)), rule: "use" };
            }
            case "lure": {
                // Grupa: isti oblik, sve različite boje; uljez: drugi oblik u boji jednog iz grupe
                const [main, other] = shuffle(SHAPE_IDS);
                const colors = shuffle(COLOR_IDS).slice(0, groupSize);
                const group = colors.map((color) => shapeCard(main, color, "mid"));
                return { ...finish(group, shapeCard(other, lureFrom(colors, COLOR_IDS), "mid")), rule: "shape" };
            }
            case "colorLure": {
                // Ista boja, različiti oblici; uljez je druge boje, a oblikom liči na jednog iz grupe
                const [main, other] = shuffle(COLOR_IDS);
                const shapes = shuffle(SHAPE_IDS).slice(0, groupSize);
                return { ...finish(shapes.map((shape) => shapeCard(shape, main, "mid")), shapeCard(lureFrom(shapes, SHAPE_IDS), other, "mid")), rule: "color" };
            }
            case "shapeLure": {
                const [main, other] = shuffle(SHAPE_IDS);
                const colors = shuffle(COLOR_IDS).slice(0, groupSize);
                return { ...finish(colors.map((color) => shapeCard(main, color, "mid")), shapeCard(other, lureFrom(colors, COLOR_IDS), "mid")), rule: "shape" };
            }
            case "sizeLure": {
                const shape = pick(SHAPE_IDS);
                const colors = shuffle(COLOR_IDS).slice(0, groupSize);
                const big = random() < 0.5;
                const group = colors.map((color) => shapeCard(shape, color, big ? "small" : "big"));
                return { ...finish(group, shapeCard(shape, lureFrom(colors, COLOR_IDS), big ? "big" : "small")), rule: "size" };
            }
            case "count": {
                // Na svakoj slici druga stvar; na svima ih je isto, samo na jednoj jedna više ili manje
                const pics = fresh(COUNT_PICS).slice(0, n);
                const base = 2 + Math.floor(random() * 3);
                const oddCount = base === 2 ? 3 : random() < 0.5 ? base - 1 : base + 1;
                const group = pics.slice(1).map((pic): OddCard => ({ id: "", look: "count", pic, count: base, size: "mid" }));
                return { ...finish(group, { id: "", look: "count", pic: pics[0], count: oddCount, size: "mid" }), rule: "count" };
            }
            case "parity": {
                // Uljez nije ni najmanji ni najveći broj (inače bi „najveći” bio drugo pravilo)
                const even = random() < 0.5;
                const group = shuffle(even ? EVENS : ODDS).slice(0, groupSize);
                const low = Math.min(...group);
                const high = Math.max(...group);
                const between = (even ? ODDS : EVENS).filter((num) => num > low && num < high);
                if (between.length === 0) return null;
                const colors = shuffle(COLOR_IDS);
                const cards = group.map((num, i): OddCard => ({ id: "", look: "number", num, color: colors[i], size: "mid" }));
                return { ...finish(cards, { id: "", look: "number", num: pick(between), color: colors[groupSize], size: "mid" }), rule: "parity" };
            }
            case "sound": {
                const letters = new Map<string, string[]>();
                for (const item of SOUND_POOL) {
                    const letter = firstSound(item.name);
                    letters.set(letter, [...(letters.get(letter) ?? []), item.id]);
                }
                const letter = pick([...letters.keys()].filter((key) => (letters.get(key) ?? []).length >= groupSize + 1));
                const group = fresh(letters.get(letter) ?? []).slice(0, groupSize);
                const odd = pick(SOUND_POOL.filter((item) => !nearSounds(firstSound(item.name), letter) && !usedOdd.has(item.id))).id;
                return { ...finish(group.map((id) => picCard(id)), picCard(odd)), rule: "sound" };
            }
            case "flex":
                return null;
        }
    };

    /** Promena pravila: iste kartice, a uljez po jednom svojstvu nije uljez po drugom */
    const flexPair = (): { cards: OddCard[]; rules: [RuleId, string][] } | null => {
        if (random() < 0.6) {
            const [first, second] = shuffle(["color", "shape", "size"] as const);
            const shape = pick(SHAPE_IDS);
            const color = pick(COLOR_IDS);
            const other = <T,>(list: readonly T[], not: T) => pick(list.filter((value) => value !== not));
            const base = (): OddCard => shapeCard(shape, color, first === "size" || second === "size" ? "small" : "mid");
            const change = (card: OddCard, dim: "color" | "shape" | "size"): OddCard =>
                dim === "color" ? { ...card, color: other(COLOR_IDS, color) } : dim === "shape" ? { ...card, shape: other(SHAPE_IDS, shape) } : { ...card, size: "big" };
            const a = change(base(), first);
            const b = change(base(), second);
            const rest = Array.from({ length: n - 2 }, base);
            const { cards } = finish([b, ...rest], a);
            const idOf = (card: OddCard) => cards.find((c) => c.shape === card.shape && c.color === card.color && c.size === card.size)!.id;
            return { cards, rules: [[first, idOf(a)], [second, idOf(b)]] };
        }
        // Slike: vrsta i boja (crvene voćke, pa nešto crveno što nije voće, pa voćka druge boje)
        const kinds: Kind[] = ["fruit", "animal", "vehicle", "toy", "clothes"];
        const kind = pick(kinds);
        const color = pick(COLOR_IDS);
        const same = THINGS.filter((item) => item.kind === kind && item.color === color && !item.name.includes(" ")).map((item) => item.id);
        const kindOdd = THINGS.filter((item) => item.kind && item.kind !== kind && KIND_PHRASES[item.kind] && item.color === color).map((item) => item.id);
        const colorOdd = THINGS.filter((item) => item.kind === kind && isColorId(item.color) && item.color !== color && !item.name.includes(" ")).map((item) => item.id);
        if (same.length < n - 2 || kindOdd.length === 0 || colorOdd.length === 0) return null;
        const a = picCard(pick(kindOdd));
        const b = picCard(pick(colorOdd));
        const { cards } = finish([b, ...shuffle(same).slice(0, n - 2).map((id) => picCard(id))], a);
        const rules: [RuleId, string][] = random() < 0.5 ? [["kind", a.id], ["color", b.id]] : [["color", b.id], ["kind", a.id]];
        return { cards, rules };
    };

    const whyCount = Math.max(0, Math.min(rule.why, 3));
    /** Tačan razlog i nekoliko drugih (najpre onih koji se zaista razlikuju među karticama) */
    const whyFor = (cards: OddCard[], ruleId: RuleId): { reasons: ReasonId[]; reason: ReasonId | null } => {
        const reason = RULE_REASON[ruleId];
        const allowed = ruleId === "sound" ? (["kind", "color"] as ReasonId[]) : REASONS_FOR[cards[0].look].filter((id) => id !== reason);
        const varies = (id: ReasonId) => new Set(cards.map((card) => cardValue(card, REASON_DIM[id]))).size > 1;
        const ordered = [...shuffle(allowed.filter(varies)), ...shuffle(allowed.filter((id) => !varies(id)))];
        return { reasons: shuffle([reason, ...ordered.slice(0, whyCount - 1)]), reason };
    };

    const rounds: OddRound[] = [];
    if (flex) {
        let pairIndex = 0;
        while (rounds.length < count) {
            const ok = (candidate: ReturnType<typeof flexPair>) => candidate !== null && candidate.rules.every(([ruleId, odd]) => isValidRound(candidate.cards, odd, ruleId));
            let pair = flexPair();
            for (let tries = 0; !ok(pair) && tries < 60; tries += 1) pair = flexPair();
            if (!pair) break;
            const cards = pair.cards;
            pair.rules.forEach(([ruleId, odd], i) => {
                rounds.push({ cards, odd, rule: ruleId, prompt: i === 0 ? "focusFirst" : "focusNext", reasons: [], reason: null, legend: null, pair: pairIndex });
            });
            note(pair.cards);
            pairIndex += 1;
        }
        return rounds.slice(0, count);
    }

    // Vrste zadataka redom: svaka po jednom pre ponavljanja, bez iste dve zaredom
    const order: Maker[] = [];
    while (order.length < count) {
        for (const maker of shuffle(rule.makers)) {
            if (order.length >= count) break;
            if (order[order.length - 1] === maker && rule.makers.length > 1) continue;
            order.push(maker);
        }
    }

    order.forEach((maker, index) => {
        loose = false;
        let made = attempt(maker, index);
        const ok = (round: typeof made) => round !== null && isValidRound(round.cards, round.odd) && (whyCount === 0 || singleReason(round.cards, round.odd, round.rule));
        for (let tries = 0; tries < 120 && !ok(made); tries += 1) {
            loose = tries >= 10;
            made = attempt(maker, index);
        }
        if (!made) return;
        usedOdd.add(made.cards.find((card) => card.id === made.odd)?.pic ?? made.odd);
        note(made.cards);
        const why = whyCount > 0 ? whyFor(made.cards, made.rule) : { reasons: [], reason: null };
        rounds.push({ ...made, prompt: rule.prompt, reasons: why.reasons, reason: why.reason, legend: rule.legend, pair: rounds.length });
    });
    return rounds;
}

/** Zadatak je ispravan kad je uljez tačno jedan i baš ta kartica (po bilo kom svojstvu) */
export function isValidRound(cards: readonly OddCard[], odd: string, focus?: RuleId): boolean {
    if (cards.length < 3 || new Set(cards.map((card) => card.id)).size !== cards.length) return false;
    const found = focus ? outliersBy(cards, focus) : defensibleOdds(cards);
    return found.length === 1 && found[0] === odd;
}

/** Za „Zašto?”: uljez se razlikuje samo po svom pravilu, ne i po nekom drugom ponuđenom razlogu */
export function singleReason(cards: readonly OddCard[], odd: string, rule: RuleId): boolean {
    const own = RULE_REASON[rule];
    return REASON_IDS.filter((id) => id !== own).every((id) => !outliersBy(cards, REASON_DIM[id]).includes(odd));
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

const cap = (text: string) => text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);

/** „mačka, pas i krava” */
function listOf(words: readonly string[]): string {
    if (words.length <= 1) return words[0] ?? "";
    return `${words.slice(0, -1).join(", ")} i ${words[words.length - 1]}`;
}

/** Ime kartice i rod (krug, zvezda, jabuka, 7) */
function noun(card: OddCard): { name: string; g: Gender } {
    if (card.look === "shape" && card.shape) return { name: SHAPES[card.shape].name, g: SHAPES[card.shape].g };
    if (card.look === "number") return { name: String(card.num ?? ""), g: "m" };
    const item = getThing(card.pic);
    return { name: item?.name ?? "", g: item?.g ?? "m" };
}

/** Kako se kartica zove kad se pominje sama (oblik sa bojom: „crveni krug”) */
export function cardName(card: OddCard): string {
    const { name, g } = noun(card);
    if (card.look !== "shape" || !card.color) return name;
    const size = card.size === "mid" ? "" : `${sizeAdj(card.size, g)} `;
    return `${size}${colorAdj(card.color, "def", g)} ${name}`;
}

function phraseFor(rule: RuleId, value: string | undefined): Phrase | undefined {
    if (value === undefined) return undefined;
    if (rule === "kind") return KIND_PHRASES[value as Kind];
    if (rule === "home") return HOME_PHRASES[value as Home];
    if (rule === "flies") return FLY_PHRASES[value as "yes" | "no"];
    if (rule === "use") return USE_PHRASES[value as Use];
    return undefined;
}

type RoundText = Pick<OddView, "cards" | "odd" | "rule">;

function split(view: RoundText): { odd: OddCard; group: OddCard[]; shared: string } | null {
    const odd = view.cards.find((card) => card.id === view.odd);
    const group = view.cards.filter((card) => card.id !== view.odd);
    const shared = group[0] ? cardValue(group[0], view.rule) : undefined;
    if (!odd || group.length === 0 || shared === undefined) return null;
    return { odd, group, shared };
}

/** Objašnjenje posle tačnog odgovora: šta spaja grupu i šta je sa uljezom */
export function oddSentence(view: RoundText): string {
    const parts = split(view);
    if (!parts) return "";
    const { odd, group, shared } = parts;
    const own = noun(odd);
    switch (view.rule) {
        case "color": {
            if (!isColorId(shared)) return "";
            const desc = odd.look === "shape" && odd.color ? `${colorAdj(odd.color, "def", own.g)} ${own.name}` : own.name;
            return `${cap(desc)} nije ${colorAdj(shared, "sg", own.g)}. Sve ostalo je ${colorAdj(shared, "sg", "n")}.`;
        }
        case "shape": {
            if (!isShapeId(shared)) return "";
            const groupShape = SHAPES[shared];
            return `${cap(own.name)} nije ${groupShape.name}. ${OTHERS_WORD[groupShape.g]} su ${groupShape.plural}.`;
        }
        case "size": {
            const groupSize = shared as SizeId;
            return `${cap(sizeAdj(odd.size, own.g))} ${own.name} nije ${sizeAdj(groupSize, own.g)}. Sve ostalo je ${sizeAdj(groupSize, "n")}.`;
        }
        case "count": {
            const item = getThing(odd.pic);
            return item?.gen ? `${cap(item.gen)} ima ${odd.count}, a svega ostalog po ${shared}.` : "";
        }
        case "parity": {
            const even = shared === "even";
            return `${listOf(group.map((card) => String(card.num)))} su ${even ? "parni" : "neparni"} brojevi. ${odd.num} je ${even ? "neparan" : "paran"} broj.`;
        }
        case "sound":
            return `${cap(listOf(group.map((card) => noun(card).name)))} počinju na ${shared}. ${cap(own.name)} počinje na ${cardValue(odd, "sound") ?? ""}.`;
        default: {
            const groupPhrase = phraseFor(view.rule, shared);
            if (!groupPhrase) return "";
            const oddPhrase = phraseFor(view.rule, cardValue(odd, view.rule));
            const oddText = oddPhrase ? oddPhrase.sg : groupPhrase.sg.startsWith("je ") ? `nije ${groupPhrase.sg.slice(3)}` : `ne ${groupPhrase.sg}`;
            return `${cap(listOf(group.map((card) => noun(card).name)))} ${groupPhrase.pl}. ${cap(own.name)} ${oddText}.`;
        }
    }
}

/** Natpis na okviru grupe („Sve je voće.”) */
export function groupLabel(view: RoundText): string {
    const parts = split(view);
    if (!parts) return "";
    const { shared } = parts;
    switch (view.rule) {
        case "color":
            return isColorId(shared) ? `Sve je ${colorAdj(shared, "sg", "n")}.` : "";
        case "shape":
            return isShapeId(shared) ? `${ALL_WORD[SHAPES[shared].g]} su ${SHAPES[shared].plural}.` : "";
        case "size":
            return `Sve je ${sizeAdj(shared as SizeId, "n")}.`;
        case "count":
            return `Svega ima po ${shared}.`;
        case "parity":
            return shared === "even" ? "Svi su parni." : "Svi su neparni.";
        case "sound":
            return `Sve počinje na ${shared}.`;
        default:
            return phraseFor(view.rule, shared)?.label ?? "";
    }
}

/** Posle promašaja: mirna činjenica o izabranoj kartici i šta da pogleda */
export function mistakeSentence(view: RoundText, cardId: string): string {
    const parts = split(view);
    const card = view.cards.find((other) => other.id === cardId);
    if (!parts || !card || card.id === view.odd) return "";
    const { shared } = parts;
    const own = noun(card);
    switch (view.rule) {
        case "color":
            return isColorId(shared) ? `${cap(own.name)} je ${colorAdj(shared, "sg", own.g)}. Pogledaj šta nije ${colorAdj(shared, "sg", "n")}.` : "";
        case "shape":
            return isShapeId(shared) ? `I ovo je ${SHAPES[shared].name}. Pogledaj šta nije ${SHAPES[shared].name}.` : "";
        case "size":
            return `${cap(own.name)} je ${sizeAdj(shared as SizeId, own.g)}. Pogledaj šta nije ${sizeAdj(shared as SizeId, "n")}.`;
        case "count": {
            const item = getThing(card.pic);
            return item?.gen ? `${cap(item.gen)} ima ${card.count}. Prebroj i ostale slike.` : "";
        }
        case "parity": {
            const word = shared === "even" ? "paran" : "neparan";
            return `${card.num} je ${word} broj. Pogledaj koji broj nije ${word}.`;
        }
        case "sound":
            return `${cap(own.name)} počinje na ${shared}. Pogledaj šta ne počinje na ${shared}.`;
        default: {
            const phrase = phraseFor(view.rule, shared);
            return phrase ? `${cap(own.name)} ${phrase.sg}. Pogledaj ${phrase.look}.` : "";
        }
    }
}

/** Posle pogrešnog razloga: zašto to nije razlog (isto je kod svih ili se razlikuje i kod ostalih) */
export function reasonMistake(view: Pick<OddView, "cards">, reason: ReasonId): string {
    const values = view.cards.map((card) => cardValue(card, REASON_DIM[reason]));
    const same = values[0] !== undefined && values.every((value) => value === values[0]);
    return `${same ? REASONS[reason].same : REASONS[reason].differ} Pogledaj još jednom.`;
}

export const WHY_QUESTION = "Zašto ne pripada?";
export const FOUND_SENTENCE = "Tako je, to ne pripada. Zašto?";

/** Pitanje zadatka (glas i natpis) — nikad ne kaže gde treba dodirnuti */
export function oddQuestion(view: Pick<OddView, "prompt" | "rule">): string {
    const acc = REASONS[RULE_REASON[view.rule]].acc;
    switch (view.prompt) {
        case "color":
            return "Šta ne pripada? Pogledaj boje.";
        case "shape":
            return "Šta ne pripada? Pogledaj oblike.";
        case "size":
            return "Šta ne pripada? Pogledaj veličinu.";
        case "count":
            return "Šta ne pripada? Prebroj.";
        case "hidden":
            return "Šta ne pripada? Pronađi skriveno pravilo.";
        case "focusFirst":
            return `Gledaj ${acc}. Šta ne pripada?`;
        case "focusNext":
            return `Sada gledaj ${acc}. Šta ne pripada?`;
        default:
            return "Šta ne pripada?";
    }
}

/** Na nivoima sa promenom pravila: šta se sada gleda (oznaka na tabli) */
export function focusReason(view: Pick<OddView, "prompt" | "rule">): ReasonId | null {
    return view.prompt === "focusFirst" || view.prompt === "focusNext" ? RULE_REASON[view.rule] : null;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export type OddAsk = "find" | "why";

export interface OddView extends BaseView {
    cards: OddCard[];
    odd: string;
    rule: RuleId;
    prompt: PromptId;
    reasons: ReasonId[];
    reason: ReasonId | null;
    legend: ReasonId | null;
    pair: number;
    /** „find” = traži se uljez, „why” = bira se razlog */
    ask: OddAsk;
    /** Uljez je pronađen (iskočio je iz grupe) */
    found: boolean;
    /** Poslednji pogrešan izbor („card:<id>” ili „reason:<id>”), dok traje poruka */
    picked: string | null;
    /** Svi pogrešni izbori u zadatku */
    wrong: string[];
    /** Pomoć za trenutni korak (tačan izbor svetli) */
    hint: boolean;
    /** U ovom zadatku je bilo pomoći (za bodovanje) */
    helped: boolean;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyOddView(totalRounds: number): OddView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        cards: [],
        odd: "",
        rule: "color",
        prompt: "plain",
        reasons: [],
        reason: null,
        legend: null,
        pair: 0,
        ask: "find",
        found: false,
        picked: null,
        wrong: [],
        hint: false,
        helped: false,
        feedback: null,
    };
}

export function oddRoundView(round: OddRound): Partial<OddView> {
    return {
        cards: round.cards.map((card) => ({ ...card })),
        odd: round.odd,
        rule: round.rule,
        prompt: round.prompt,
        reasons: [...round.reasons],
        reason: round.reason,
        legend: round.legend,
        pair: round.pair,
        ask: "find",
        found: false,
        picked: null,
        wrong: [],
        hint: false,
        helped: false,
        feedback: null,
    };
}

/** Pogrešni izbori u trenutnom koraku (za pomoć posle promašaja) */
export function stepMisses(view: Pick<OddView, "wrong" | "ask">): number {
    const prefix = view.ask === "why" ? "reason:" : "card:";
    return view.wrong.filter((key) => key.startsWith(prefix)).length;
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen (uljez pronađen, a na teškim nivoima i razlog). Prvi zadatak prvog nivoa
 * pokazuje ruka (ne ocenjuje se); „correct” = bez ijedne greške i bez pomoći; „prompted” = uz
 * pomoć (osim pokaznog).
 */
export function solveOddView(current: OddView, level: number, solved: Partial<OddView> = {}): { next: OddView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.helped || current.hint;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: OddView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function oddoneResult(final: OddView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

const CARD_LOOKS: readonly CardLook[] = ["shape", "pic", "count", "number"];
const MAX_CARDS = 6;

function cleanCard(raw: unknown): OddCard | null {
    if (!raw || typeof raw !== "object") return null;
    const card = raw as Record<string, unknown>;
    const id = typeof card.id === "string" && /^[\w-]{1,40}$/.test(card.id) ? card.id : null;
    const look = CARD_LOOKS.find((value) => value === card.look);
    if (!id || !look) return null;
    const size: SizeId = SIZE_IDS.find((value) => value === card.size) ?? "mid";
    if (look === "shape") return isShapeId(card.shape) && isColorId(card.color) ? { id, look, shape: card.shape, color: card.color, size } : null;
    if (look === "number") {
        const num = card.num;
        return Number.isInteger(num) && (num as number) >= 0 && (num as number) <= 99 && isColorId(card.color) ? { id, look, num: num as number, color: card.color, size } : null;
    }
    const pic = getThing(card.pic)?.id;
    if (!pic) return null;
    if (look === "count") {
        const count = card.count;
        return Number.isInteger(count) && (count as number) >= 1 && (count as number) <= 6 ? { id, look, pic, count: count as number, size } : null;
    }
    return { id, look, pic, size };
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeOddoneMonitor(state: Partial<OddView> | null | undefined): OddView {
    const base = emptyOddView(1);
    if (!state) return base;
    const cards: OddCard[] = [];
    if (Array.isArray(state.cards)) {
        for (const raw of state.cards.slice(0, MAX_CARDS * 2)) {
            const card = cleanCard(raw);
            if (card && !cards.some((other) => other.id === card.id) && cards.length < MAX_CARDS) cards.push(card);
        }
    }
    const ids = cards.map((card) => card.id);
    const odd = typeof state.odd === "string" && ids.includes(state.odd) ? state.odd : "";
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const reasons = Array.isArray(state.reasons) ? Array.from(new Set(state.reasons.filter(isReasonId))).slice(0, REASON_IDS.length) : [];
    const keyOk = (key: unknown): key is string =>
        typeof key === "string" && ((key.startsWith("card:") && ids.includes(key.slice(5))) || (key.startsWith("reason:") && isReasonId(key.slice(7))));
    const rule = RULE_IDS.find((value) => value === state.rule) ?? "color";
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        cards: odd ? cards : [],
        odd,
        rule,
        prompt: PROMPT_IDS.find((value) => value === state.prompt) ?? "plain",
        reasons,
        reason: isReasonId(state.reason) && reasons.includes(state.reason) ? state.reason : null,
        legend: isReasonId(state.legend) ? state.legend : null,
        pair: toCount(state.pair, 0),
        ask: state.ask === "why" && reasons.length > 0 ? "why" : "find",
        found: state.found === true && odd !== "",
        picked: keyOk(state.picked) ? state.picked : null,
        wrong: Array.isArray(state.wrong) ? Array.from(new Set(state.wrong.filter(keyOk))).slice(0, 12) : [],
        hint: state.hint === true,
        helped: state.helped === true,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
