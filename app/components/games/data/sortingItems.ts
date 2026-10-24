// Sadržaj igre „Razvrstaj”: predmeti, korpe i raspored po nivoima.
//
// Napredovanje prati redosled iz programa rane podrške (VB-MAPP, vizuelna percepcija):
// prvo razvrstavanje po JEDNOM vidljivom svojstvu (boja ili oblik — oboje oko treće godine),
// pa po VRSTI (voće, životinje…), pa tri i četiri korpe i manje „tipični” predmeti, a na kraju
// po PRAVILU koje se ne vidi na prvi pogled (šta se jede, šta je za leto, šta leti).
// Oblici su u raznim bojama: dete mora da gleda oblik, a ne boju.
//
// Pomoć se povlači (od najviše ka najmanje pomoći):
//   • model: u svakoj korpi je već jedan razvrstan predmet kao primer, a na korpi su slika i natpis;
//   • natpis sa slikom: korpe su prazne, slika na korpi pokazuje šta ide unutra;
//   • samo natpis: pravilo se kaže jednom na početku nivoa, a na korpi je samo reč.
// Svaka nova vrsta razvrstavanja (boja, oblik, vrsta, pravilo) počinje modelom.
//
// Pravila pisanja:
//  • Svaki predmet je jedan emodži koji svuda ima jasnu, jednu boju i jasnu vrstu.
//  • Naziv je u nominativu JEDNINE, uz gramatički rod (za „Banana je žuta.”) — bez reči koje
//    postoje samo u množini (farmerke, makaze, sanke), jer bi „Farmerke je plava” bilo pogrešno.
//  • Predmet nikad ne pripada dvema korpama istog nivoa (test to proverava).
//  • Uz pravilo „šta se jede” nema životinja („Pas se ne jede.” ne pišemo).

export type SortColor = "red" | "yellow" | "green" | "blue";
export type SortCategory = "fruit" | "animals" | "vehicles" | "clothes" | "toys" | "music" | "school";
export type SortShape = "circle" | "square" | "triangle" | "star";
/** Pravila: jede se / ne jede se, leto / zima, u vazduhu / u vodi / na zemlji */
export type SortRuleKey = "eat" | "noEat" | "summer" | "winter" | "air" | "water" | "land";
export type SortRuleGroup = "eat" | "season" | "where";
export type SortKind = "color" | "shape" | "category" | "rule";
export type BasketId = `color:${SortColor}` | `shape:${SortShape}` | `category:${SortCategory}` | `rule:${SortRuleKey}`;
/** Koliko pomoći ima na korpama: primer u korpi, slika i natpis, samo natpis */
export type SortSupport = "model" | "label" | "text";

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
    /** Pravilo „jede se”: true = jede se, false = ne jede se (bez polja: ne ide u taj nivo) */
    eat?: boolean;
    /** Pravilo „leto / zima” */
    season?: "summer" | "winter";
    /** Pravilo „gde”: u vazduhu, u vodi, na zemlji; `goes` = šta radi („leti”, „plovi po vodi”) */
    where?: "air" | "water" | "land";
    goes?: string;
}

export interface Basket {
    id: BasketId;
    /** Natpis na korpi */
    label: string;
    /** Za objašnjenje: „Banana je …” (boja zavisi od roda predmeta) */
    describe: (item: SortItem) => string;
    /** Rečenica posle tačnog izbora: „Banana je žuta.”, „Jabuka se jede.” */
    yes: (item: SortItem) => string;
    /** Posle pogrešne korpe: „Banana nije crvena.”, „Lopta se ne jede.” */
    no: (item: SortItem) => string;
    /** Boja korpe (krug na natpisu), oblik ili sličica vrste */
    swatch?: string;
    shape?: SortShape;
    emoji?: string;
}

/** Boja kojom se crta geometrijski oblik (ista kao boja korpe) */
export function colorHex(color: SortColor): string {
    return COLOR_WORDS[color].hex;
}

function capitalized(text: string): string {
    return text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);
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
    music: { label: "Muzika", emoji: "🎵", noun: "muzički instrument" },
    school: { label: "Škola", emoji: "🏫", noun: "školski pribor" },
};

/** Pravila: natpis, sličica, rečenica „da” i „ne” (ime predmeta ide na početak) */
const RULE_WORDS: Record<SortRuleKey, { label: string; emoji: string; yes: (item: SortItem) => string; no: string }> = {
    eat: { label: "Jede se", emoji: "😋", yes: () => "se jede", no: "se ne jede" },
    noEat: { label: "Ne jede se", emoji: "🚫", yes: () => "se ne jede", no: "se jede" },
    summer: { label: "Leto", emoji: "☀️", yes: () => "je za leto", no: "nije za leto" },
    winter: { label: "Zima", emoji: "❄️", yes: () => "je za zimu", no: "nije za zimu" },
    air: { label: "U vazduhu", emoji: "☁️", yes: (item) => item.goes ?? "leti", no: "ne leti" },
    water: { label: "U vodi", emoji: "🌊", yes: (item) => item.goes ?? "pliva", no: "ne pliva" },
    land: { label: "Na zemlji", emoji: "🌳", yes: (item) => item.goes ?? "ide po zemlji", no: "ne ide po zemlji" },
};

/** Pravila po grupama (korpe jednog nivoa sa pravilom) i šta glas kaže jednom, na početku */
export const RULE_GROUPS: Record<SortRuleGroup, { keys: readonly SortRuleKey[]; intro: string }> = {
    eat: { keys: ["eat", "noEat"], intro: "Šta se jede, a šta se ne jede?" },
    season: { keys: ["summer", "winter"], intro: "Šta je za leto, a šta za zimu?" },
    where: { keys: ["air", "water", "land"], intro: "Šta leti u vazduhu, šta je u vodi, a šta ide po zemlji?" },
};

/** Pravilo koje važi za ove korpe (za natpis na monitoru, gde plan nivoa nije poznat) */
export function ruleIntro(baskets: readonly BasketId[]): string | undefined {
    const key = baskets.find((id) => id.startsWith("rule:"))?.slice(5);
    return Object.values(RULE_GROUPS).find((group) => group.keys.some((k) => k === key))?.intro;
}

export function basketFor(id: BasketId): Basket {
    const [kind, key] = id.split(":") as [SortKind, string];
    if (kind === "color") {
        const word = COLOR_WORDS[key as SortColor];
        return {
            id,
            label: word.label,
            swatch: word.hex,
            describe: (item) => word.forms[item.g],
            yes: (item) => `${capitalized(item.name)} je ${word.forms[item.g]}.`,
            no: (item) => `${capitalized(item.name)} nije ${word.forms[item.g]}.`,
        };
    }
    if (kind === "shape") {
        const word = SHAPE_WORDS[key as SortShape];
        return { id, label: word.label, shape: key as SortShape, describe: () => word.noun, yes: () => `To je ${word.noun}.`, no: () => `To nije ${word.noun}.` };
    }
    if (kind === "rule") {
        const word = RULE_WORDS[key as SortRuleKey];
        return {
            id,
            label: word.label,
            emoji: word.emoji,
            describe: (item) => word.yes(item),
            yes: (item) => `${capitalized(item.name)} ${word.yes(item)}.`,
            no: (item) => `${capitalized(item.name)} ${word.no}.`,
        };
    }
    const word = CATEGORY_WORDS[key as SortCategory];
    return {
        id,
        label: word.label,
        emoji: word.emoji,
        describe: () => word.noun,
        yes: (item) => `${capitalized(item.name)} je ${word.noun}.`,
        no: (item) => `${capitalized(item.name)} nije ${word.noun}.`,
    };
}

/** Da li je oznaka korpe poznata (stanje sa monitora može doći iz druge verzije aplikacije) */
export function isBasketId(value: unknown): value is BasketId {
    if (typeof value !== "string") return false;
    const [kind, key] = value.split(":");
    return (
        (kind === "color" && key in COLOR_WORDS) ||
        (kind === "shape" && key in SHAPE_WORDS) ||
        (kind === "category" && key in CATEGORY_WORDS) ||
        (kind === "rule" && key in RULE_WORDS)
    );
}

export function belongsTo(item: SortItem, basket: BasketId): boolean {
    const [kind, key] = basket.split(":");
    if (kind === "color") return item.color === key;
    if (kind === "shape") return item.shape === key;
    if (kind === "category") return item.category === key;
    if (key === "eat") return item.eat === true;
    if (key === "noEat") return item.eat === false;
    if (key === "summer" || key === "winter") return item.season === key;
    return item.where === key;
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
    { id: "apple-red", emoji: "🍎", name: "jabuka", g: "f", color: "red", category: "fruit", eat: true },
    { id: "strawberry", emoji: "🍓", name: "jagoda", g: "f", color: "red", category: "fruit", eat: true },
    { id: "cherries", emoji: "🍒", name: "trešnja", g: "f", color: "red", category: "fruit", eat: true },
    { id: "tomato", emoji: "🍅", name: "paradajz", g: "m", color: "red", eat: true },
    { id: "fire-truck", emoji: "🚒", name: "vatrogasni kamion", g: "m", color: "red", category: "vehicles", eat: false },
    { id: "heart-red", emoji: "❤️", name: "srce", g: "n", color: "red" },
    { id: "banana", emoji: "🍌", name: "banana", g: "f", color: "yellow", category: "fruit", eat: true },
    { id: "lemon", emoji: "🍋", name: "limun", g: "m", color: "yellow", category: "fruit" },
    { id: "chick", emoji: "🐤", name: "pile", g: "n", color: "yellow", category: "animals" },
    { id: "sun", emoji: "🌞", name: "sunce", g: "n", color: "yellow" },
    { id: "star", emoji: "⭐", name: "zvezda", g: "f", color: "yellow" },
    { id: "cheese", emoji: "🧀", name: "sir", g: "m", color: "yellow", eat: true },
    { id: "frog", emoji: "🐸", name: "žaba", g: "f", color: "green", category: "animals" },
    { id: "broccoli", emoji: "🥦", name: "brokoli", g: "m", color: "green", eat: true },
    { id: "apple-green", emoji: "🍏", name: "jabuka", g: "f", color: "green", category: "fruit" },
    { id: "cucumber", emoji: "🥒", name: "krastavac", g: "m", color: "green", eat: true },
    { id: "leaf", emoji: "🍀", name: "detelina", g: "f", color: "green" },
    { id: "turtle", emoji: "🐢", name: "kornjača", g: "f", color: "green", category: "animals" },
    { id: "whale", emoji: "🐳", name: "kit", g: "m", color: "blue", category: "animals", where: "water", goes: "pliva u vodi" },
    { id: "heart-blue", emoji: "💙", name: "srce", g: "n", color: "blue" },
    { id: "drop", emoji: "💧", name: "kap vode", g: "f", color: "blue" },
    { id: "butterfly", emoji: "🦋", name: "leptir", g: "m", color: "blue", category: "animals", where: "air", goes: "leti" },

    // Vrste (srednje): tipični predstavnici
    { id: "pear", emoji: "🍐", name: "kruška", g: "f", category: "fruit", eat: true },
    { id: "grapes", emoji: "🍇", name: "grožđe", g: "n", category: "fruit", eat: true },
    { id: "orange", emoji: "🍊", name: "pomorandža", g: "f", category: "fruit", eat: true },
    { id: "watermelon", emoji: "🍉", name: "lubenica", g: "f", category: "fruit", eat: true, season: "summer" },
    { id: "dog", emoji: "🐶", name: "pas", g: "m", category: "animals", where: "land" },
    { id: "cat", emoji: "🐱", name: "mačka", g: "f", category: "animals", where: "land" },
    { id: "cow", emoji: "🐮", name: "krava", g: "f", category: "animals", where: "land" },
    { id: "pig", emoji: "🐷", name: "svinja", g: "f", category: "animals" },
    { id: "rabbit", emoji: "🐰", name: "zec", g: "m", category: "animals", where: "land" },
    { id: "car", emoji: "🚗", name: "auto", g: "m", category: "vehicles", eat: false, where: "land" },
    { id: "bus", emoji: "🚌", name: "autobus", g: "m", category: "vehicles", where: "land" },
    { id: "bicycle", emoji: "🚲", name: "bicikl", g: "m", category: "vehicles", where: "land" },
    { id: "train", emoji: "🚂", name: "voz", g: "m", category: "vehicles" },
    { id: "plane", emoji: "✈️", name: "avion", g: "m", category: "vehicles", where: "air", goes: "leti" },
    { id: "tshirt", emoji: "👕", name: "majica", g: "f", category: "clothes", eat: false },
    { id: "dress", emoji: "👗", name: "haljina", g: "f", category: "clothes" },
    { id: "socks", emoji: "🧦", name: "čarapa", g: "f", category: "clothes", eat: false },
    { id: "cap", emoji: "🧢", name: "kapa", g: "f", color: "blue", category: "clothes" },
    { id: "coat", emoji: "🧥", name: "jakna", g: "f", category: "clothes", season: "winter" },
    { id: "teddy", emoji: "🧸", name: "meda", g: "m", category: "toys", eat: false },
    { id: "ball", emoji: "⚽", name: "lopta", g: "f", category: "toys", eat: false },
    { id: "kite", emoji: "🪁", name: "zmaj", g: "m", category: "toys" },
    { id: "puzzle", emoji: "🧩", name: "slagalica", g: "f", category: "toys", eat: false },
    { id: "guitar", emoji: "🎸", name: "gitara", g: "f", category: "music" },
    { id: "trumpet", emoji: "🎺", name: "truba", g: "f", category: "music" },
    { id: "violin", emoji: "🎻", name: "violina", g: "f", category: "music" },
    { id: "piano", emoji: "🎹", name: "klavir", g: "m", category: "music" },
    { id: "pencil", emoji: "✏️", name: "olovka", g: "f", category: "school", eat: false },
    { id: "backpack", emoji: "🎒", name: "ranac", g: "m", category: "school" },
    { id: "notebook", emoji: "📓", name: "sveska", g: "f", category: "school" },
    { id: "crayon", emoji: "🖍️", name: "bojica", g: "f", category: "school" },

    // Vrste (teško): manje tipični predstavnici
    { id: "coconut", emoji: "🥥", name: "kokos", g: "m", category: "fruit", hard: true },
    { id: "pineapple", emoji: "🍍", name: "ananas", g: "m", category: "fruit", hard: true },
    { id: "kiwi", emoji: "🥝", name: "kivi", g: "m", category: "fruit", hard: true },
    { id: "hedgehog", emoji: "🦔", name: "jež", g: "m", category: "animals", hard: true },
    { id: "snail", emoji: "🐌", name: "puž", g: "m", category: "animals", hard: true, where: "land" },
    { id: "owl", emoji: "🦉", name: "sova", g: "f", category: "animals", hard: true },
    { id: "scooter", emoji: "🛴", name: "trotinet", g: "m", category: "vehicles", hard: true },
    { id: "tractor", emoji: "🚜", name: "traktor", g: "m", category: "vehicles", hard: true, where: "land" },
    { id: "boat", emoji: "⛵", name: "brod", g: "m", category: "vehicles", hard: true, where: "water", goes: "plovi po vodi" },
    { id: "gloves", emoji: "🧤", name: "rukavica", g: "f", category: "clothes", hard: true, season: "winter" },
    { id: "scarf", emoji: "🧣", name: "šal", g: "m", category: "clothes", hard: true, season: "winter" },
    { id: "shirt", emoji: "👔", name: "košulja", g: "f", category: "clothes", hard: true },
    { id: "balloon", emoji: "🎈", name: "balon", g: "m", category: "toys", hard: true, where: "air", goes: "leti" },
    { id: "dice", emoji: "🎲", name: "kocka", g: "f", category: "toys", hard: true, eat: false },
    { id: "drum", emoji: "🥁", name: "doboš", g: "m", category: "music", hard: true },
    { id: "saxophone", emoji: "🎷", name: "saksofon", g: "m", category: "music", hard: true },
    { id: "ruler", emoji: "📏", name: "lenjir", g: "m", category: "school", hard: true },
    { id: "book", emoji: "📕", name: "knjiga", g: "f", category: "school", hard: true },

    // Samo za pravila (šta se jede, leto i zima, gde)
    { id: "bread", emoji: "🍞", name: "hleb", g: "m", eat: true },
    { id: "cake", emoji: "🍰", name: "kolač", g: "m", eat: true },
    { id: "carrot", emoji: "🥕", name: "šargarepa", g: "f", eat: true },
    { id: "shoe", emoji: "👟", name: "patika", g: "f", eat: false },
    { id: "key", emoji: "🔑", name: "ključ", g: "m", eat: false },
    { id: "ice-cream", emoji: "🍦", name: "sladoled", g: "m", season: "summer" },
    { id: "parasol", emoji: "⛱️", name: "suncobran", g: "m", season: "summer" },
    { id: "sun-hat", emoji: "👒", name: "šešir", g: "m", season: "summer" },
    { id: "shorts", emoji: "🩳", name: "šorc", g: "m", season: "summer" },
    { id: "snowman", emoji: "⛄", name: "sneško", g: "m", season: "winter" },
    { id: "ski", emoji: "🎿", name: "skija", g: "f", season: "winter" },
    { id: "helicopter", emoji: "🚁", name: "helikopter", g: "m", where: "air", goes: "leti" },
    { id: "bee", emoji: "🐝", name: "pčela", g: "f", where: "air", goes: "leti" },
    { id: "rocket", emoji: "🚀", name: "raketa", g: "f", where: "air", goes: "leti" },
    { id: "fish", emoji: "🐟", name: "riba", g: "f", where: "water", goes: "pliva u vodi" },
    { id: "octopus", emoji: "🐙", name: "hobotnica", g: "f", where: "water", goes: "pliva u vodi" },
    { id: "dolphin", emoji: "🐬", name: "delfin", g: "m", where: "water", goes: "pliva u vodi" },
];

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export interface LevelRule {
    level: number;
    kind: SortKind;
    /** Samo za kind „rule”: koja pravila (korpe su sva pravila te grupe) */
    group?: SortRuleGroup;
    /** Broj korpi */
    baskets: number;
    rounds: number;
    /** Na težim nivoima dolaze i manje tipični predmeti */
    hard: boolean;
    support: SortSupport;
}

const rule = (level: number, kind: SortKind, baskets: number, rounds: number, support: SortSupport, extra: { hard?: boolean; group?: SortRuleGroup } = {}): LevelRule => ({
    level,
    kind,
    baskets,
    rounds,
    support,
    hard: extra.hard ?? false,
    ...(extra.group ? { group: extra.group } : {}),
});

const RULES: readonly LevelRule[] = [
    // Lako: jedno vidljivo svojstvo — boja, pa oblik; prvo sa primerom u korpi
    rule(1, "color", 2, 5, "model"),
    rule(2, "shape", 2, 5, "model"),
    rule(3, "color", 3, 6, "label"),
    rule(4, "shape", 3, 6, "label"),
    rule(5, "color", 4, 6, "label"),
    // Srednje: vrste (voće, životinje, vozila…), primer pa slika na korpi; više korpi
    rule(6, "category", 2, 6, "model"),
    rule(7, "category", 2, 6, "label"),
    rule(8, "category", 3, 7, "model"),
    rule(9, "category", 3, 7, "label"),
    rule(10, "category", 4, 8, "label"),
    // Teško: manje tipični predmeti, pa pravila koja se ne vide na prvi pogled (rečena jednom)
    rule(11, "category", 3, 8, "label", { hard: true }),
    rule(12, "rule", 2, 6, "model", { group: "eat" }),
    rule(13, "rule", 2, 8, "text", { group: "season" }),
    rule(14, "rule", 3, 8, "text", { group: "where" }),
    rule(15, "category", 4, 8, "text", { hard: true }),
];

export const SORT_MAX_LEVEL = 15;

const COLORS: readonly SortColor[] = ["red", "yellow", "green", "blue"];
const CATEGORIES: readonly SortCategory[] = ["fruit", "animals", "vehicles", "clothes", "toys", "music", "school"];
const SHAPES: readonly SortShape[] = ["circle", "square", "triangle", "star"];

export interface SortRound {
    itemId: string;
    /** Korpe na ekranu, uvek istim redom tokom celog nivoa */
    baskets: BasketId[];
}

export interface SortLevel {
    kind: SortKind;
    support: SortSupport;
    baskets: BasketId[];
    rounds: SortRound[];
    /** Primeri koji su na početku već u korpama (samo uz `support: "model"`) */
    models: Partial<Record<BasketId, string>>;
    /** Pravilo koje glas kaže jednom, na početku (samo za „rule”) */
    intro?: string;
}

export function ruleForLevel(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), SORT_MAX_LEVEL);
    return RULES[safe - 1];
}

/**
 * Korpe i predmeti jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random,
 * testovi stalan niz). `maxBaskets` i `maxRounds` dolaze iz podešavanja uzrasta.
 * Korpe ostaju iste tokom celog nivoa (dete ne traži novo mesto u svakom zadatku), a
 * predmeti su ravnomerno raspoređeni po korpama i ne ponavljaju se. Primer u korpi je
 * predmet koji se posle ne pojavljuje kao zadatak.
 */
export function buildSortLevel(level: number, { maxBaskets, maxRounds, random = Math.random }: { maxBaskets: number; maxRounds: number; random?: () => number }): SortLevel {
    const current = ruleForLevel(level);
    const basketCount = Math.max(2, Math.min(current.baskets, Number.isFinite(maxBaskets) ? maxBaskets : current.baskets));
    const roundCount = Math.max(basketCount, Math.min(current.rounds, Number.isFinite(maxRounds) ? maxRounds : current.rounds));
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    const all: readonly string[] =
        current.kind === "color" ? COLORS : current.kind === "shape" ? SHAPES : current.kind === "rule" ? RULE_GROUPS[current.group ?? "eat"].keys : CATEGORIES;
    // Pravila se ne biraju nasumice: ide cela grupa (ili onoliko korpi koliko uzrast dozvoljava)
    const keys = current.kind === "rule" ? all.slice(0, basketCount) : shuffle<string>(all).slice(0, basketCount);
    const baskets = keys.map((key) => `${current.kind}:${key}` as BasketId);

    // Predmet ide samo u jednu korpu ovog nivoa; na lakšim nivoima bez manje tipičnih predmeta
    const pools = baskets.map((basket) =>
        shuffle(SORT_ITEMS.filter((item) => belongsTo(item, basket) && (current.hard || !item.hard) && baskets.filter((other) => belongsTo(item, other)).length === 1))
    );
    const models: SortLevel["models"] = {};
    if (current.support === "model") {
        baskets.forEach((basket, i) => {
            // Primer je uvek tipičan predmet, a ostaje dovoljno predmeta za zadatke
            if (pools[i].length > Math.ceil(roundCount / baskets.length)) models[basket] = pools[i].shift()!.id;
        });
    }
    const rounds: SortRound[] = [];
    for (let i = 0; i < roundCount; i += 1) {
        const pool = pools[i % pools.length];
        const item = pool.shift();
        if (item) rounds.push({ itemId: item.id, baskets });
    }
    // Redosled zadataka je pomešan; svaki predmet se u nivou pojavljuje samo jednom
    return {
        kind: current.kind,
        support: current.support,
        baskets,
        rounds: shuffle(rounds),
        models,
        ...(current.kind === "rule" ? { intro: RULE_GROUPS[current.group ?? "eat"].intro } : {}),
    };
}

export function getSortItem(id: string): SortItem | undefined {
    return SORT_ITEMS.find((item) => item.id === id);
}
