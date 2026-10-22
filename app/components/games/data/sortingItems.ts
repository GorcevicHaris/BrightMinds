// Sadržaj igre „Razvrstaj”: predmeti, korpe i raspored po nivoima.
//
// Napredovanje prati redosled iz programa rane podrške (VB-MAPP, vizuelna percepcija):
// prvo razvrstavanje po JEDNOM vidljivom svojstvu (boja ili oblik — oboje oko treće godine),
// pa po VRSTI (voće, životinje…), pa tri i četiri korpe i manje „tipični” predmeti.
// Oblici su u raznim bojama: dete mora da gleda oblik, a ne boju.
//
// Pravila pisanja:
//  • Svaki predmet je jedan emodži koji svuda ima jasnu, jednu boju i jasnu vrstu.
//  • Naziv je u nominativu JEDNINE, uz gramatički rod (za „Banana je žuta.”) — bez reči koje
//    postoje samo u množini (farmerke, pantalone), jer bi „Farmerke je plava” bilo pogrešno.
//  • Predmet nikad ne pripada dvema korpama istog nivoa (test to proverava).

export type SortColor = "red" | "yellow" | "green" | "blue";
export type SortCategory = "fruit" | "animals" | "vehicles" | "clothes" | "toys";
export type SortShape = "circle" | "square" | "triangle" | "star";
export type SortKind = "color" | "shape" | "category";
export type BasketId = `color:${SortColor}` | `shape:${SortShape}` | `category:${SortCategory}`;

type Gender = "m" | "f" | "n";

export interface SortItem {
    id: string;
    emoji: string;
    /** Naziv, nominativ jednine, malim slovom */
    name: string;
    g: Gender;
    color?: SortColor;
    category?: SortCategory;
    /** Geometrijski oblik (crta se, nije emodži); boja oblika je `color` */
    shape?: SortShape;
    /** Manje tipičan predstavnik vrste — dolazi tek na teškim nivoima */
    hard?: boolean;
}

export interface Basket {
    id: BasketId;
    /** Natpis na korpi */
    label: string;
    /** Za objašnjenje: „Banana je …” (boja zavisi od roda predmeta) */
    describe: (item: SortItem) => string;
    /** Boja korpe (krug na natpisu), oblik ili sličica vrste */
    swatch?: string;
    shape?: SortShape;
    emoji?: string;
}

/** Boja kojom se crta geometrijski oblik (ista kao boja korpe) */
export function colorHex(color: SortColor): string {
    return COLOR_WORDS[color].hex;
}

const COLOR_WORDS: Record<SortColor, { label: string; hex: string; forms: Record<Gender, string> }> = {
    red: { label: "Crveno", hex: "#e5484d", forms: { m: "crven", f: "crvena", n: "crveno" } },
    yellow: { label: "Žuto", hex: "#f5c518", forms: { m: "žut", f: "žuta", n: "žuto" } },
    green: { label: "Zeleno", hex: "#30a46c", forms: { m: "zelen", f: "zelena", n: "zeleno" } },
    blue: { label: "Plavo", hex: "#3e7bfa", forms: { m: "plav", f: "plava", n: "plavo" } },
};

const SHAPE_WORDS: Record<SortShape, { label: string; noun: string }> = {
    circle: { label: "Krug", noun: "krug" },
    square: { label: "Kvadrat", noun: "kvadrat" },
    triangle: { label: "Trougao", noun: "trougao" },
    star: { label: "Zvezda", noun: "zvezda" },
};

const CATEGORY_WORDS: Record<SortCategory, { label: string; emoji: string; noun: string }> = {
    fruit: { label: "Voće", emoji: "🧺", noun: "voće" },
    animals: { label: "Životinje", emoji: "🐾", noun: "životinja" },
    vehicles: { label: "Vozila", emoji: "🚦", noun: "vozilo" },
    clothes: { label: "Odeća", emoji: "👚", noun: "odeća" },
    toys: { label: "Igračke", emoji: "🎁", noun: "igračka" },
};

export function basketFor(id: BasketId): Basket {
    const [kind, key] = id.split(":") as [SortKind, string];
    if (kind === "color") {
        const word = COLOR_WORDS[key as SortColor];
        return { id, label: word.label, swatch: word.hex, describe: (item) => word.forms[item.g] };
    }
    if (kind === "shape") {
        const word = SHAPE_WORDS[key as SortShape];
        return { id, label: word.label, shape: key as SortShape, describe: () => word.noun };
    }
    const word = CATEGORY_WORDS[key as SortCategory];
    return { id, label: word.label, emoji: word.emoji, describe: () => word.noun };
}

/** Da li je oznaka korpe poznata (stanje sa monitora može doći iz druge verzije aplikacije) */
export function isBasketId(value: unknown): value is BasketId {
    if (typeof value !== "string") return false;
    const [kind, key] = value.split(":");
    return (kind === "color" && key in COLOR_WORDS) || (kind === "shape" && key in SHAPE_WORDS) || (kind === "category" && key in CATEGORY_WORDS);
}

export function belongsTo(item: SortItem, basket: BasketId): boolean {
    const [kind, key] = basket.split(":");
    return kind === "color" ? item.color === key : kind === "shape" ? item.shape === key : item.category === key;
}

const SHAPE_GENDER: Record<SortShape, Gender> = { circle: "m", square: "m", triangle: "m", star: "f" };

/** Oblici u svakoj od četiri boje: „Krug je crven.” u nivoima boja, „To je krug.” u nivoima oblika */
const SHAPE_ITEMS: SortItem[] = (Object.keys(SHAPE_WORDS) as SortShape[]).flatMap((shape) =>
    (Object.keys(COLOR_WORDS) as SortColor[]).map((color) => ({
        id: `shape-${shape}-${color}`,
        emoji: "",
        name: SHAPE_WORDS[shape].noun,
        g: SHAPE_GENDER[shape],
        color,
        shape,
    }))
);

export const SORT_ITEMS: readonly SortItem[] = [
    ...SHAPE_ITEMS,
    // Boje (lako): predmeti koji su na svakom telefonu iste, jasne boje
    { id: "apple-red", emoji: "🍎", name: "jabuka", g: "f", color: "red", category: "fruit" },
    { id: "strawberry", emoji: "🍓", name: "jagoda", g: "f", color: "red", category: "fruit" },
    { id: "cherries", emoji: "🍒", name: "trešnja", g: "f", color: "red", category: "fruit" },
    { id: "tomato", emoji: "🍅", name: "paradajz", g: "m", color: "red" },
    { id: "fire-truck", emoji: "🚒", name: "vatrogasni kamion", g: "m", color: "red", category: "vehicles" },
    { id: "heart-red", emoji: "❤️", name: "srce", g: "n", color: "red" },
    { id: "banana", emoji: "🍌", name: "banana", g: "f", color: "yellow", category: "fruit" },
    { id: "lemon", emoji: "🍋", name: "limun", g: "m", color: "yellow", category: "fruit" },
    { id: "chick", emoji: "🐤", name: "pile", g: "n", color: "yellow", category: "animals" },
    { id: "sun", emoji: "🌞", name: "sunce", g: "n", color: "yellow" },
    { id: "star", emoji: "⭐", name: "zvezda", g: "f", color: "yellow" },
    { id: "cheese", emoji: "🧀", name: "sir", g: "m", color: "yellow" },
    { id: "frog", emoji: "🐸", name: "žaba", g: "f", color: "green", category: "animals" },
    { id: "broccoli", emoji: "🥦", name: "brokoli", g: "m", color: "green" },
    { id: "apple-green", emoji: "🍏", name: "jabuka", g: "f", color: "green", category: "fruit" },
    { id: "cucumber", emoji: "🥒", name: "krastavac", g: "m", color: "green" },
    { id: "leaf", emoji: "🍀", name: "detelina", g: "f", color: "green" },
    { id: "turtle", emoji: "🐢", name: "kornjača", g: "f", color: "green", category: "animals" },
    { id: "whale", emoji: "🐳", name: "kit", g: "m", color: "blue", category: "animals" },
    { id: "heart-blue", emoji: "💙", name: "srce", g: "n", color: "blue" },
    { id: "drop", emoji: "💧", name: "kap vode", g: "f", color: "blue" },
    { id: "butterfly", emoji: "🦋", name: "leptir", g: "m", color: "blue", category: "animals" },

    // Vrste (srednje): tipični predstavnici
    { id: "pear", emoji: "🍐", name: "kruška", g: "f", category: "fruit" },
    { id: "grapes", emoji: "🍇", name: "grožđe", g: "n", category: "fruit" },
    { id: "orange", emoji: "🍊", name: "pomorandža", g: "f", category: "fruit" },
    { id: "watermelon", emoji: "🍉", name: "lubenica", g: "f", category: "fruit" },
    { id: "dog", emoji: "🐶", name: "pas", g: "m", category: "animals" },
    { id: "cat", emoji: "🐱", name: "mačka", g: "f", category: "animals" },
    { id: "cow", emoji: "🐮", name: "krava", g: "f", category: "animals" },
    { id: "pig", emoji: "🐷", name: "svinja", g: "f", category: "animals" },
    { id: "rabbit", emoji: "🐰", name: "zec", g: "m", category: "animals" },
    { id: "car", emoji: "🚗", name: "auto", g: "m", category: "vehicles" },
    { id: "bus", emoji: "🚌", name: "autobus", g: "m", category: "vehicles" },
    { id: "bicycle", emoji: "🚲", name: "bicikl", g: "m", category: "vehicles" },
    { id: "train", emoji: "🚂", name: "voz", g: "m", category: "vehicles" },
    { id: "plane", emoji: "✈️", name: "avion", g: "m", category: "vehicles" },
    { id: "tshirt", emoji: "👕", name: "majica", g: "f", category: "clothes" },
    { id: "dress", emoji: "👗", name: "haljina", g: "f", category: "clothes" },
    { id: "socks", emoji: "🧦", name: "čarapa", g: "f", category: "clothes" },
    { id: "cap", emoji: "🧢", name: "kapa", g: "f", color: "blue", category: "clothes" },
    { id: "coat", emoji: "🧥", name: "jakna", g: "f", category: "clothes" },
    { id: "teddy", emoji: "🧸", name: "meda", g: "m", category: "toys" },
    { id: "ball", emoji: "⚽", name: "lopta", g: "f", category: "toys" },
    { id: "kite", emoji: "🪁", name: "zmaj", g: "m", category: "toys" },
    { id: "puzzle", emoji: "🧩", name: "slagalica", g: "f", category: "toys" },

    // Vrste (teško): manje tipični predstavnici
    { id: "coconut", emoji: "🥥", name: "kokos", g: "m", category: "fruit", hard: true },
    { id: "pineapple", emoji: "🍍", name: "ananas", g: "m", category: "fruit", hard: true },
    { id: "kiwi", emoji: "🥝", name: "kivi", g: "m", category: "fruit", hard: true },
    { id: "hedgehog", emoji: "🦔", name: "jež", g: "m", category: "animals", hard: true },
    { id: "snail", emoji: "🐌", name: "puž", g: "m", category: "animals", hard: true },
    { id: "owl", emoji: "🦉", name: "sova", g: "f", category: "animals", hard: true },
    { id: "scooter", emoji: "🛴", name: "trotinet", g: "m", category: "vehicles", hard: true },
    { id: "tractor", emoji: "🚜", name: "traktor", g: "m", category: "vehicles", hard: true },
    { id: "boat", emoji: "⛵", name: "brod", g: "m", category: "vehicles", hard: true },
    { id: "gloves", emoji: "🧤", name: "rukavica", g: "f", category: "clothes", hard: true },
    { id: "scarf", emoji: "🧣", name: "šal", g: "m", category: "clothes", hard: true },
    { id: "shirt", emoji: "👔", name: "košulja", g: "f", category: "clothes", hard: true },
    { id: "balloon", emoji: "🎈", name: "balon", g: "m", category: "toys", hard: true },
    { id: "dice", emoji: "🎲", name: "kocka", g: "f", category: "toys", hard: true },
    { id: "drum", emoji: "🥁", name: "doboš", g: "m", category: "toys", hard: true },
];

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelRule {
    first: number;
    last: number;
    kind: SortKind;
    /** Broj korpi */
    baskets: number;
    rounds: number;
    /** Na težim nivoima dolaze i manje tipični predmeti */
    hard: boolean;
}

const RULES: readonly LevelRule[] = [
    { first: 1, last: 1, kind: "color", baskets: 2, rounds: 5, hard: false },
    { first: 2, last: 2, kind: "shape", baskets: 2, rounds: 5, hard: false },
    { first: 3, last: 3, kind: "color", baskets: 3, rounds: 6, hard: false },
    { first: 4, last: 4, kind: "shape", baskets: 3, rounds: 6, hard: false },
    { first: 5, last: 5, kind: "color", baskets: 3, rounds: 6, hard: false },
    { first: 6, last: 8, kind: "category", baskets: 2, rounds: 6, hard: false },
    { first: 9, last: 10, kind: "category", baskets: 3, rounds: 7, hard: false },
    { first: 11, last: 13, kind: "category", baskets: 3, rounds: 8, hard: true },
    { first: 14, last: 15, kind: "category", baskets: 4, rounds: 8, hard: true },
];

export const SORT_MAX_LEVEL = 15;

const COLORS: readonly SortColor[] = ["red", "yellow", "green", "blue"];
const CATEGORIES: readonly SortCategory[] = ["fruit", "animals", "vehicles", "clothes", "toys"];
const SHAPES: readonly SortShape[] = ["circle", "square", "triangle", "star"];

export interface SortRound {
    itemId: string;
    /** Korpe na ekranu, uvek istim redom tokom celog nivoa */
    baskets: BasketId[];
}

export interface SortLevel {
    kind: SortKind;
    baskets: BasketId[];
    rounds: SortRound[];
}

export function ruleForLevel(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), SORT_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

/**
 * Korpe i predmeti jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random,
 * testovi stalan niz). `maxBaskets` i `maxRounds` dolaze iz podešavanja uzrasta.
 * Korpe ostaju iste tokom celog nivoa (dete ne traži novo mesto u svakom zadatku), a
 * predmeti su ravnomerno raspoređeni po korpama i ne ponavljaju se.
 */
export function buildSortLevel(level: number, { maxBaskets, maxRounds, random = Math.random }: { maxBaskets: number; maxRounds: number; random?: () => number }): SortLevel {
    const rule = ruleForLevel(level);
    const basketCount = Math.max(2, Math.min(rule.baskets, Number.isFinite(maxBaskets) ? maxBaskets : rule.baskets));
    const roundCount = Math.max(basketCount, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    const all = rule.kind === "color" ? COLORS : rule.kind === "shape" ? SHAPES : CATEGORIES;
    const keys = shuffle<string>(all).slice(0, basketCount);
    const baskets = keys.map((key) => `${rule.kind}:${key}` as BasketId);

    // Predmet ide samo u jednu korpu ovog nivoa; na lakšim nivoima bez manje tipičnih predmeta
    const pools = baskets.map((basket) =>
        shuffle(
            SORT_ITEMS.filter(
                (item) => belongsTo(item, basket) && (rule.hard || !item.hard) && baskets.filter((other) => belongsTo(item, other)).length === 1
            )
        )
    );
    const rounds: SortRound[] = [];
    for (let i = 0; i < roundCount; i += 1) {
        const pool = pools[i % pools.length];
        const item = pool.shift();
        if (item) rounds.push({ itemId: item.id, baskets });
    }
    // Redosled zadataka je pomešan; svaki predmet se u nivou pojavljuje samo jednom
    return { kind: rule.kind, baskets, rounds: shuffle(rounds) };
}

export function getSortItem(id: string): SortItem | undefined {
    return SORT_ITEMS.find((item) => item.id === id);
}
