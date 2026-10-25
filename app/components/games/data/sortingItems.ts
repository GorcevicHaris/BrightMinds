// Sadržaj igre „Razvrstaj”: predmeti, korpe i raspored po nivoima.
//
// Napredovanje prati redosled iz programa rane podrške (VB-MAPP, vizuelna percepcija):
// najpre ISTA SLIKA (jabuka uz jabuku — najranije slaganje, VP-MTS 1, oko druge i treće godine,
// pa može i dete koje još ne zna boje), zatim JEDNO vidljivo svojstvo (boja, oblik, veliko i
// malo — oko treće godine), pa po VRSTI (voće, životinje…), tri i četiri korpe i manje
// „tipični” predmeti, a na kraju po PRAVILU koje se ne vidi na prvi pogled: šta se jede, čemu
// predmet služi (za jelo, za pranje, za crtanje — razvrstavanje po nameni), gde se kreće.
// Oblici su u raznim bojama: dete mora da gleda oblik, a ne boju. Veliko i malo je uvek isti
// predmet, samo nacrtan u dve veličine (mali je oko 45 % velikog).
//
// Pomoć se povlači (od najviše ka najmanje pomoći):
//   • model: u svakoj korpi je već jedan razvrstan predmet kao primer, a na korpi su slika i natpis;
//   • natpis sa slikom: korpe su prazne, slika na korpi pokazuje šta ide unutra;
//   • samo natpis: pravilo se kaže jednom na početku nivoa, a na korpi je samo reč.
// Svaka nova vrsta razvrstavanja (boja, oblik, vrsta, pravilo) počinje modelom.
//
// Pravila pisanja:
//  • Svaki predmet je crtež iz zajedničkog kompleta slika (pictures/), nikad emodži: emodži je na
//    svakom uređaju drugačiji (negde siv ili ga nema), a crtež je svuda isti. Predmet u nivoima
//    boja ima jednu jasnu boju (crvena jabuka, žuta banana, plavi kit), veliko i malo je isti
//    crtež u dve veličine, a ista slika je baš isti crtež.
//  • Naziv je u nominativu JEDNINE, uz gramatički rod (za „Banana je žuta.”) — bez reči koje
//    postoje samo u množini (farmerke, makaze, sanke), jer bi „Farmerke je plava” bilo pogrešno.
//  • Predmet nikad ne pripada dvema korpama istog nivoa (test to proverava).
//  • Uz pravilo „šta se jede” nema životinja („Pas se ne jede.” ne pišemo).
//  • Pravilo „leto / zima” trenutno nije u rasporedu nivoa, ali podaci ostaju (stanje sa
//    monitora iz starije verzije aplikacije i dalje ima smisla).

import type { PictureId } from "@/app/components/games/pictures";

export type SortColor = "red" | "yellow" | "green" | "blue";
export type SortCategory = "fruit" | "animals" | "vehicles" | "clothes" | "toys" | "music" | "school";
export type SortShape = "circle" | "square" | "triangle" | "star";
export type SortSize = "big" | "small";
/** Namena: za jelo, za pranje, za crtanje */
export type SortUse = "meal" | "wash" | "draw";
/** Pravila: jede se / ne jede se, leto / zima, u vazduhu / u vodi / na zemlji, namena */
export type SortRuleKey = "eat" | "noEat" | "summer" | "winter" | "air" | "water" | "land" | SortUse;
export type SortRuleGroup = "eat" | "season" | "where" | "use";
/** `same`: ista slika (korpa sa slikom jabuke prima jabuku); `size`: veliko ili malo */
export type SortKind = "same" | "color" | "shape" | "size" | "category" | "rule";
export type BasketId =
    | `same:${string}`
    | `color:${SortColor}`
    | `shape:${SortShape}`
    | `size:${SortSize}`
    | `category:${SortCategory}`
    | `rule:${SortRuleKey}`;
/** Koliko pomoći ima na korpama: primer u korpi, slika i natpis, samo natpis */
export type SortSupport = "model" | "label" | "text";

type Gender = "m" | "f" | "n";

export interface SortItem {
    id: string;
    /** Slika iz zajedničkog kompleta (oblici je nemaju: crtaju se sami, u svojoj boji) */
    pic?: PictureId;
    /** Naziv, nominativ jednine, malim slovom */
    name: string;
    g: Gender;
    color?: SortColor;
    category?: SortCategory;
    /** Geometrijski oblik (crta ga igra, nema sliku iz kompleta); boja oblika je `color` */
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
    /** Veliko / malo: isti predmet je u nizu dvaput, veliki i mali */
    size?: SortSize;
    /** Pravilo „čemu služi” */
    use?: SortUse;
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
    /** Boja korpe (krug na natpisu i boja „čarobne kutije”), oblik, veličina ili sličica */
    swatch?: string;
    shape?: SortShape;
    size?: SortSize;
    pic?: PictureId;
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

const SIZE_WORDS: Record<SortSize, { label: string; forms: Record<Gender, string> }> = {
    big: { label: "Veliko", forms: { m: "veliki", f: "velika", n: "veliko" } },
    small: { label: "Malo", forms: { m: "mali", f: "mala", n: "malo" } },
};

const CATEGORY_WORDS: Record<SortCategory, { label: string; pic: PictureId; noun: string }> = {
    fruit: { label: "Voće", pic: "fruitBasket", noun: "voće" },
    animals: { label: "Životinje", pic: "paw", noun: "životinja" },
    vehicles: { label: "Vozila", pic: "trafficLight", noun: "vozilo" },
    clothes: { label: "Odeća", pic: "hanger", noun: "odeća" },
    toys: { label: "Igračke", pic: "gift", noun: "igračka" },
    music: { label: "Muzika", pic: "notes", noun: "muzički instrument" },
    school: { label: "Škola", pic: "school", noun: "školski pribor" },
};

/** Pravila: natpis, sličica, rečenica „da” i „ne” (ime predmeta ide na početak) */
const RULE_WORDS: Record<SortRuleKey, { label: string; pic: PictureId; yes: (item: SortItem) => string; no: string }> = {
    eat: { label: "Jede se", pic: "yum", yes: () => "se jede", no: "se ne jede" },
    noEat: { label: "Ne jede se", pic: "noEat", yes: () => "se ne jede", no: "se jede" },
    summer: { label: "Leto", pic: "sunFace", yes: () => "je za leto", no: "nije za leto" },
    winter: { label: "Zima", pic: "snowflake", yes: () => "je za zimu", no: "nije za zimu" },
    air: { label: "U vazduhu", pic: "cloud", yes: (item) => item.goes ?? "leti", no: "ne leti" },
    water: { label: "U vodi", pic: "waves", yes: (item) => item.goes ?? "pliva", no: "ne ide po vodi" },
    land: { label: "Na zemlji", pic: "tree", yes: (item) => item.goes ?? "ide po zemlji", no: "ne ide po zemlji" },
    meal: { label: "Za jelo", pic: "cutlery", yes: () => "je za jelo", no: "nije za jelo" },
    wash: { label: "Za pranje", pic: "bathtub", yes: () => "je za pranje", no: "nije za pranje" },
    draw: { label: "Za crtanje", pic: "picture", yes: () => "je za crtanje", no: "nije za crtanje" },
};

/** Pravila po grupama (korpe jednog nivoa sa pravilom) i šta glas kaže jednom, na početku */
export const RULE_GROUPS: Record<SortRuleGroup, { keys: readonly SortRuleKey[]; intro: string }> = {
    eat: { keys: ["eat", "noEat"], intro: "Šta se jede, a šta se ne jede?" },
    season: { keys: ["summer", "winter"], intro: "Šta je za leto, a šta za zimu?" },
    where: { keys: ["air", "water", "land"], intro: "Šta leti u vazduhu, šta je u vodi, a šta ide po zemlji?" },
    use: { keys: ["meal", "wash", "draw"], intro: "Čime jedemo, čime se peremo, a čime crtamo?" },
};

/** Pravilo koje važi za ove korpe (za natpis na monitoru, gde plan nivoa nije poznat) */
export function ruleIntro(baskets: readonly BasketId[]): string | undefined {
    const key = baskets.find((id) => id.startsWith("rule:"))?.slice(5);
    return Object.values(RULE_GROUPS).find((group) => group.keys.some((k) => k === key))?.intro;
}

export function basketFor(id: BasketId): Basket {
    const [kind, key] = id.split(":") as [SortKind, string];
    if (kind === "same") {
        // Na korpi je slika predmeta; naziv je u nominativu, pa nema promene po rodu
        const model = getSortItem(key);
        const name = model?.name ?? "";
        return {
            id,
            label: capitalized(name),
            pic: model?.pic,
            describe: () => name,
            yes: (item) => `Ista slika: ${item.name}.`,
            no: () => "To nije ista slika.",
        };
    }
    if (kind === "size") {
        const word = SIZE_WORDS[key as SortSize];
        return {
            id,
            label: word.label,
            size: key as SortSize,
            describe: (item) => word.forms[item.g],
            yes: (item) => `${capitalized(item.name)} je ${word.forms[item.g]}.`,
            no: (item) => `${capitalized(item.name)} nije ${word.forms[item.g]}.`,
        };
    }
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
            pic: word.pic,
            describe: (item) => word.yes(item),
            yes: (item) => `${capitalized(item.name)} ${word.yes(item)}.`,
            no: (item) => `${capitalized(item.name)} ${word.no}.`,
        };
    }
    const word = CATEGORY_WORDS[key as SortCategory];
    return {
        id,
        label: word.label,
        pic: word.pic,
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
        (kind === "same" && SAME_IDS.includes(key)) ||
        (kind === "size" && key in SIZE_WORDS) ||
        (kind === "color" && key in COLOR_WORDS) ||
        (kind === "shape" && key in SHAPE_WORDS) ||
        (kind === "category" && key in CATEGORY_WORDS) ||
        (kind === "rule" && key in RULE_WORDS)
    );
}

export function belongsTo(item: SortItem, basket: BasketId): boolean {
    const [kind, key] = basket.split(":");
    if (kind === "same") return item.id === key;
    if (kind === "size") return item.size === key;
    if (kind === "color") return item.color === key;
    if (kind === "shape") return item.shape === key;
    if (kind === "category") return item.category === key;
    if (key === "eat") return item.eat === true;
    if (key === "noEat") return item.eat === false;
    if (key === "summer" || key === "winter") return item.season === key;
    if (key === "meal" || key === "wash" || key === "draw") return item.use === key;
    return item.where === key;
}

const SHAPE_GENDER: Record<SortShape, Gender> = { circle: "m", square: "m", triangle: "m", star: "f" };

/** Oblici u svakoj od četiri boje: „Krug je crven.” u nivoima boja, „To je krug.” u nivoima oblika */
const SHAPE_ITEMS: SortItem[] = (Object.keys(SHAPE_WORDS) as SortShape[]).flatMap((shape) =>
    (Object.keys(COLOR_WORDS) as SortColor[]).map((color) => ({
        id: `shape-${shape}-${color}`,
        name: SHAPE_WORDS[shape].noun,
        g: SHAPE_GENDER[shape],
        color,
        shape,
    }))
);

/**
 * Veliko / malo: predmeti koji su na slici celi i zbijeni (bez dugačkih i „scena”), pa se
 * veličina jasno vidi. Svaki je u nizu dvaput: veliki i mali. Ovi predmeti nemaju boju ni
 * vrstu — u drugim nivoima se ne pojavljuju.
 */
const SIZE_BASES: readonly { key: string; pic: PictureId; name: string; g: Gender }[] = [
    { key: "ball", pic: "ball", name: "lopta", g: "f" },
    { key: "apple", pic: "apple", name: "jabuka", g: "f" },
    { key: "house", pic: "house", name: "kuća", g: "f" },
    { key: "car", pic: "car", name: "auto", g: "m" },
    { key: "teddy", pic: "teddy", name: "meda", g: "m" },
    { key: "balloon", pic: "balloon", name: "balon", g: "m" },
    { key: "egg", pic: "egg", name: "jaje", g: "n" },
    { key: "chick", pic: "chick", name: "pile", g: "n" },
];

const SIZE_ITEMS: SortItem[] = SIZE_BASES.flatMap((base) =>
    (Object.keys(SIZE_WORDS) as SortSize[]).map((size) => ({ id: `size-${base.key}-${size}`, pic: base.pic, name: base.name, g: base.g, size }))
);

/** Ista slika: predmeti koji se jasno razlikuju i oblikom i bojom (dve korpe su uvek dva različita) */
const SAME_IDS: readonly string[] = ["apple-red", "banana", "ball", "car", "dog", "teddy", "fish", "frog"];

export const SORT_ITEMS: readonly SortItem[] = [
    ...SHAPE_ITEMS,
    ...SIZE_ITEMS,
    // Boje (lako): predmeti koji su na svakom telefonu iste, jasne boje
    { id: "apple-red", pic: "apple", name: "jabuka", g: "f", color: "red", category: "fruit", eat: true },
    { id: "strawberry", pic: "strawberry", name: "jagoda", g: "f", color: "red", category: "fruit", eat: true },
    { id: "cherries", pic: "cherry", name: "trešnja", g: "f", color: "red", category: "fruit", eat: true },
    { id: "tomato", pic: "tomato", name: "paradajz", g: "m", color: "red", eat: true },
    { id: "fire-truck", pic: "fireTruck", name: "vatrogasni kamion", g: "m", color: "red", category: "vehicles", eat: false },
    { id: "heart-red", pic: "heartRed", name: "srce", g: "n", color: "red" },
    { id: "banana", pic: "banana", name: "banana", g: "f", color: "yellow", category: "fruit", eat: true },
    { id: "lemon", pic: "lemon", name: "limun", g: "m", color: "yellow", category: "fruit" },
    { id: "chick", pic: "chick", name: "pile", g: "n", color: "yellow", category: "animals" },
    { id: "sun", pic: "sunFace", name: "sunce", g: "n", color: "yellow" },
    { id: "star", pic: "star", name: "zvezda", g: "f", color: "yellow" },
    { id: "cheese", pic: "cheese", name: "sir", g: "m", color: "yellow", eat: true },
    { id: "frog", pic: "frog", name: "žaba", g: "f", color: "green", category: "animals" },
    { id: "broccoli", pic: "broccoli", name: "brokoli", g: "m", color: "green", eat: true },
    { id: "apple-green", pic: "appleGreen", name: "jabuka", g: "f", color: "green", category: "fruit" },
    { id: "cucumber", pic: "cucumber", name: "krastavac", g: "m", color: "green", eat: true },
    { id: "leaf", pic: "clover", name: "detelina", g: "f", color: "green" },
    { id: "turtle", pic: "turtle", name: "kornjača", g: "f", color: "green", category: "animals" },
    { id: "whale", pic: "whale", name: "kit", g: "m", color: "blue", category: "animals", where: "water", goes: "pliva u vodi" },
    { id: "heart-blue", pic: "heartBlue", name: "srce", g: "n", color: "blue" },
    { id: "drop", pic: "drop", name: "kap vode", g: "f", color: "blue" },
    { id: "butterfly", pic: "butterflyBlue", name: "leptir", g: "m", color: "blue", category: "animals", where: "air", goes: "leti" },

    // Vrste (srednje): tipični predstavnici
    { id: "pear", pic: "pear", name: "kruška", g: "f", category: "fruit", eat: true },
    { id: "grapes", pic: "grapes", name: "grožđe", g: "n", category: "fruit", eat: true },
    { id: "orange", pic: "orange", name: "pomorandža", g: "f", category: "fruit", eat: true },
    { id: "watermelon", pic: "watermelon", name: "lubenica", g: "f", category: "fruit", eat: true, season: "summer" },
    { id: "dog", pic: "dog", name: "pas", g: "m", category: "animals", where: "land" },
    { id: "cat", pic: "cat", name: "mačka", g: "f", category: "animals", where: "land" },
    { id: "cow", pic: "cow", name: "krava", g: "f", category: "animals", where: "land" },
    { id: "pig", pic: "pig", name: "svinja", g: "f", category: "animals" },
    { id: "rabbit", pic: "rabbit", name: "zec", g: "m", category: "animals", where: "land" },
    { id: "car", pic: "car", name: "auto", g: "m", category: "vehicles", eat: false, where: "land" },
    { id: "bus", pic: "bus", name: "autobus", g: "m", category: "vehicles", where: "land" },
    { id: "bicycle", pic: "bicycle", name: "bicikl", g: "m", category: "vehicles", where: "land" },
    { id: "train", pic: "train", name: "voz", g: "m", category: "vehicles" },
    { id: "plane", pic: "plane", name: "avion", g: "m", category: "vehicles", where: "air", goes: "leti" },
    { id: "tshirt", pic: "tshirt", name: "majica", g: "f", category: "clothes", eat: false },
    { id: "dress", pic: "dress", name: "haljina", g: "f", category: "clothes" },
    { id: "socks", pic: "sock", name: "čarapa", g: "f", category: "clothes", eat: false },
    { id: "cap", pic: "cap", name: "kapa", g: "f", color: "blue", category: "clothes" },
    { id: "coat", pic: "jacket", name: "jakna", g: "f", category: "clothes", season: "winter" },
    { id: "teddy", pic: "teddy", name: "meda", g: "m", category: "toys", eat: false },
    { id: "ball", pic: "ball", name: "lopta", g: "f", category: "toys", eat: false },
    { id: "kite", pic: "kite", name: "zmaj", g: "m", category: "toys" },
    { id: "puzzle", pic: "puzzlePiece", name: "slagalica", g: "f", category: "toys", eat: false },
    { id: "guitar", pic: "guitar", name: "gitara", g: "f", category: "music" },
    { id: "trumpet", pic: "trumpet", name: "truba", g: "f", category: "music" },
    { id: "violin", pic: "violin", name: "violina", g: "f", category: "music" },
    { id: "piano", pic: "piano", name: "klavir", g: "m", category: "music" },
    { id: "pencil", pic: "pencil", name: "olovka", g: "f", category: "school", eat: false, use: "draw" },
    { id: "backpack", pic: "backpack", name: "ranac", g: "m", category: "school" },
    { id: "notebook", pic: "notebook", name: "sveska", g: "f", category: "school" },
    { id: "crayon", pic: "crayon", name: "bojica", g: "f", category: "school", use: "draw" },

    // Vrste (teško): manje tipični predstavnici
    { id: "coconut", pic: "coconut", name: "kokos", g: "m", category: "fruit", hard: true },
    { id: "pineapple", pic: "pineapple", name: "ananas", g: "m", category: "fruit", hard: true },
    { id: "kiwi", pic: "kiwi", name: "kivi", g: "m", category: "fruit", hard: true },
    { id: "hedgehog", pic: "hedgehog", name: "jež", g: "m", category: "animals", hard: true },
    { id: "snail", pic: "snail", name: "puž", g: "m", category: "animals", hard: true, where: "land" },
    { id: "owl", pic: "owl", name: "sova", g: "f", category: "animals", hard: true },
    { id: "scooter", pic: "scooter", name: "trotinet", g: "m", category: "vehicles", hard: true },
    { id: "tractor", pic: "tractor", name: "traktor", g: "m", category: "vehicles", hard: true, where: "land" },
    { id: "boat", pic: "boat", name: "brod", g: "m", category: "vehicles", hard: true, where: "water", goes: "plovi po vodi" },
    { id: "gloves", pic: "gloves", name: "rukavica", g: "f", category: "clothes", hard: true, season: "winter" },
    { id: "scarf", pic: "scarf", name: "šal", g: "m", category: "clothes", hard: true, season: "winter" },
    { id: "shirt", pic: "shirt", name: "košulja", g: "f", category: "clothes", hard: true },
    { id: "balloon", pic: "balloon", name: "balon", g: "m", category: "toys", hard: true, where: "air", goes: "leti" },
    { id: "dice", pic: "dice", name: "kocka", g: "f", category: "toys", hard: true, eat: false },
    { id: "drum", pic: "drum", name: "doboš", g: "m", category: "music", hard: true },
    { id: "saxophone", pic: "saxophone", name: "saksofon", g: "m", category: "music", hard: true },
    { id: "ruler", pic: "ruler", name: "lenjir", g: "m", category: "school", hard: true },
    { id: "book", pic: "book", name: "knjiga", g: "f", category: "school", hard: true },

    // Samo za pravila (šta se jede, leto i zima, gde)
    { id: "bread", pic: "bread", name: "hleb", g: "m", eat: true },
    { id: "cake", pic: "cakeSlice", name: "kolač", g: "m", eat: true },
    { id: "carrot", pic: "carrot", name: "šargarepa", g: "f", eat: true },
    { id: "shoe", pic: "shoe", name: "patika", g: "f", eat: false },
    { id: "key", pic: "key", name: "ključ", g: "m", eat: false },
    { id: "ice-cream", pic: "iceCream", name: "sladoled", g: "m", season: "summer" },
    { id: "parasol", pic: "parasol", name: "suncobran", g: "m", season: "summer" },
    { id: "sun-hat", pic: "sunHat", name: "šešir", g: "m", season: "summer" },
    { id: "shorts", pic: "shorts", name: "šorc", g: "m", season: "summer" },
    { id: "snowman", pic: "snowman", name: "sneško", g: "m", season: "winter" },
    { id: "ski", pic: "ski", name: "skija", g: "f", season: "winter" },
    { id: "helicopter", pic: "helicopter", name: "helikopter", g: "m", where: "air", goes: "leti" },
    { id: "bee", pic: "bee", name: "pčela", g: "f", where: "air", goes: "leti" },
    { id: "rocket", pic: "rocket", name: "raketa", g: "f", where: "air", goes: "leti" },
    { id: "fish", pic: "fish", name: "riba", g: "f", where: "water", goes: "pliva u vodi" },
    { id: "octopus", pic: "octopus", name: "hobotnica", g: "f", where: "water", goes: "pliva u vodi" },
    { id: "dolphin", pic: "dolphin", name: "delfin", g: "m", where: "water", goes: "pliva u vodi" },

    // Samo za pravilo „čemu služi” (olovka i bojica su gore, uz školski pribor)
    { id: "spoon", pic: "spoon", name: "kašika", g: "f", use: "meal" },
    { id: "fork", pic: "fork", name: "viljuška", g: "f", use: "meal" },
    { id: "plate", pic: "plate", name: "tanjir", g: "m", use: "meal" },
    { id: "bowl", pic: "bowl", name: "činija", g: "f", use: "meal" },
    { id: "soap", pic: "soap", name: "sapun", g: "m", use: "wash" },
    { id: "toothbrush", pic: "toothbrush", name: "četkica za zube", g: "f", use: "wash" },
    { id: "sponge", pic: "sponge", name: "sunđer", g: "m", use: "wash" },
    { id: "shampoo", pic: "shampoo", name: "šampon", g: "m", use: "wash" },
    { id: "shower", pic: "shower", name: "tuš", g: "m", use: "wash" },
    { id: "paintbrush", pic: "paintbrush", name: "kičica", g: "f", use: "draw" },
    { id: "palette", pic: "palette", name: "paleta", g: "f", use: "draw" },
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
    // Lako: ista slika (od treće godine), pa jedno vidljivo svojstvo — boja, oblik, veliko i malo;
    // svako novo svojstvo prvo sa primerom u korpi, pa tri korpe sa slikom
    rule(1, "same", 2, 5, "model"),
    rule(2, "color", 2, 5, "model"),
    rule(3, "shape", 2, 5, "model"),
    rule(4, "size", 2, 6, "model"),
    rule(5, "color", 3, 6, "label"),
    // Srednje: oblik sa tri korpe, pa vrste (voće, životinje, vozila…) i četiri korpe
    rule(6, "shape", 3, 6, "label"),
    rule(7, "category", 2, 6, "model"),
    rule(8, "category", 3, 7, "label"),
    rule(9, "color", 4, 8, "label"),
    rule(10, "category", 4, 8, "label"),
    // Teško: manje tipični predmeti, pa pravila koja se ne vide na prvi pogled (rečena jednom)
    rule(11, "category", 3, 8, "label", { hard: true }),
    rule(12, "rule", 2, 6, "model", { group: "eat" }),
    rule(13, "rule", 3, 8, "model", { group: "use" }),
    rule(14, "rule", 3, 8, "text", { group: "where" }),
    rule(15, "category", 4, 8, "text", { hard: true }),
];

export const SORT_MAX_LEVEL = 15;

const COLORS: readonly SortColor[] = ["red", "yellow", "green", "blue"];
const CATEGORIES: readonly SortCategory[] = ["fruit", "animals", "vehicles", "clothes", "toys", "music", "school"];
const SHAPES: readonly SortShape[] = ["circle", "square", "triangle", "star"];
const SIZES: readonly SortSize[] = ["big", "small"];

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
    /** Primeri koji su na početku već u korpama (samo uz `support: "model"`); kod iste slike je primer isti predmet kao zadaci */
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
 * predmet koji se posle ne pojavljuje kao zadatak. Izuzetak je ista slika: tu je cela poenta
 * da se isti predmet ponavlja.
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

    const all: readonly string[] = {
        same: SAME_IDS,
        color: COLORS,
        shape: SHAPES,
        size: SIZES,
        category: CATEGORIES,
        rule: RULE_GROUPS[current.group ?? "eat"].keys,
    }[current.kind];
    // Pravila se ne biraju nasumice: ide cela grupa (ili onoliko korpi koliko uzrast dozvoljava)
    const keys = current.kind === "rule" ? all.slice(0, basketCount) : shuffle<string>(all).slice(0, basketCount);
    const baskets = keys.map((key) => `${current.kind}:${key}` as BasketId);

    if (current.kind === "same") {
        // Ista slika: isti predmet dolazi više puta; u svakoj korpi je od početka jedan takav
        const rounds = Array.from({ length: roundCount }, (_, i) => ({ itemId: keys[i % keys.length], baskets }));
        const models: SortLevel["models"] = {};
        if (current.support === "model") baskets.forEach((basket, i) => (models[basket] = keys[i]));
        return { kind: current.kind, support: current.support, baskets, rounds: shuffle(rounds), models };
    }

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
