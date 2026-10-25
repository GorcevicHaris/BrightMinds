// Sadržaj igre „Obuci se”: kroz prozor se vidi kakvo je vreme (sunce, kiša, sneg, vetar,
// hladno), a Amar ili Lejla stoji pored. Dete prevlači odeću na lik; odeća koja ne ide uz to
// vreme se mirno vrati („Napolju pada sneg. Sandale nisu za sneg.”). Kad je lik spreman,
// veselo izađe napolje. Bez Reacta, da bi se nivoi proveravali u testovima; crteži su u
// games/weather/.
//
// Zašto ovako (uzrast 3–10, i deca sa autizmom):
//  • Oblačenje prema vremenu je veština svakodnevnog života (adaptive skill) koju deca sa
//    autizmom često uče izričito i uz vizuelnu podršku: prozor sa vremenom i lik su uvek na
//    istom mestu, a odeća stoji u korpi kao u pravom ormanu (TEACCH: predvidljiv raspored).
//  • Učenje bez greške (errorless learning): prvo samo jedan predmet i dva izbora koji se jasno
//    razlikuju (kapa za sunce, kišobran za kišu, rukavice za sneg); prvi zadatak prvog nivoa
//    pokaže ruka (ne ocenjuje se), a pomoć (sledeća prava stvar zasvetli) na lakim nivoima
//    stiže već posle prve greške i posle čekanja. Na lakim nivoima lik je već skoro obučen
//    za to vreme, pa dete dodaje samo ono što fali.
//  • Podrška se povlači postepeno (stimulus fading): jedan predmet → dva → cela odeća od
//    potkošulje → redosled oblačenja (prvo čarape, pa patike; prvo majica, pa jakna) sa
//    trakom koraka, pa bez trake → mešano vreme („Hladno je i pada kiša.”), nedeljna
//    prognoza (sutra, pa imenovani dan) i mesto (bazen, škola, park pod snegom).
//  • Redosled oblačenja je isti kao u igri „Šta je prvo?” (rutine u koracima, task analysis).
//  • Pogrešna odeća nije kazna: stvar se zaljulja i vrati, glas kaže mirnu činjenicu i
//    razlog. Lik se nikad ne mršti i ne drhti; uvek je miran ili veseo.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

// ── Vreme i mesta ────────────────────────────────────────────────────────────

export const WEATHER_IDS = ["sun", "rain", "snow", "wind", "cold"] as const;
export type WeatherId = (typeof WEATHER_IDS)[number];

export const PLACE_IDS = ["pool", "school", "park"] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

/** Uslov uz koji se bira odeća: vreme ili mesto */
export type Condition = WeatherId | PlaceId;

export const SCENE_IDS = ["sun", "rain", "snow", "wind", "cold", "coldRain", "coldWind", "snowWind", "pool", "school", "park"] as const;
export type SceneId = (typeof SCENE_IDS)[number];

// ── Odeća ────────────────────────────────────────────────────────────────────

export const CLOTHING_IDS = [
    "sunCap",
    "sunglasses",
    "sandals",
    "shorts",
    "tshirt",
    "umbrella",
    "raincoat",
    "rainBoots",
    "beanie",
    "gloves",
    "scarf",
    "jacket",
    "snowBoots",
    "hoodie",
    "sweater",
    "pants",
    "socks",
    "sneakers",
    "swimsuit",
    "flipFlops",
    "towel",
    "backpack",
] as const;
export type ClothingId = (typeof CLOTHING_IDS)[number];

/**
 * Mesto na telu. Dve stvari sa istog mesta se ne nose zajedno (sandale i čizme), pa ih jedna
 * odeća nikad ne traži obe. Redosled crtanja (šta je preko čega) je u weather/WeatherArt.
 */
export type ClothingSlot = "swim" | "socks" | "legs" | "top" | "warm" | "feet" | "outer" | "neck" | "hands" | "head" | "eyes" | "held" | "back";

export interface Clothing {
    id: ClothingId;
    /** Kako se zove (nominativ) — glas i natpis */
    name: string;
    /** Kratak natpis ispod slike („Naočare”) */
    label: string;
    /** Akuzativ, za „Kada nosimo kapu?” */
    acc: string;
    /** Množina („Sandale nisu…”) */
    plural: boolean;
    slot: ClothingSlot;
    /** Za koje vreme i mesta je ova stvar baš potrebna */
    for: readonly Condition[];
    /** Kad je ova stvar jasno pogrešna (prevruće, mokro, hladno) — ne nosi se ni uz drugo vreme */
    against: readonly Condition[];
    /** Zašto je dobra (glas kaže kad je stvar obučena) */
    why: string;
}

const c = (
    id: ClothingId,
    name: string,
    label: string,
    acc: string,
    plural: boolean,
    slot: ClothingSlot,
    useful: readonly Condition[],
    against: readonly Condition[],
    why: string
): Clothing => ({ id, name, label, acc, plural, slot, for: useful, against, why });

export const CLOTHES: readonly Clothing[] = [
    c("sunCap", "kapa", "Kapa", "kapu", false, "head", ["sun"], ["snow", "cold", "wind", "park"], "Kapa čuva glavu od sunca."),
    c("sunglasses", "naočare za sunce", "Naočare", "naočare za sunce", true, "eyes", ["sun"], [], "Naočare čuvaju oči od sunca."),
    c("sandals", "sandale", "Sandale", "sandale", true, "feet", ["sun"], ["rain", "snow", "cold", "wind", "school", "park"], "Sandale su za toplo vreme."),
    c("shorts", "šorc", "Šorc", "šorc", false, "legs", ["sun"], ["rain", "snow", "cold", "wind", "park"], "Šorc je za toplo vreme."),
    c("tshirt", "majica", "Majica", "majicu", false, "top", ["sun", "rain", "snow", "wind", "cold", "school", "park"], [], "Majica ide prva."),
    c("umbrella", "kišobran", "Kišobran", "kišobran", false, "held", ["rain"], ["wind"], "Kišobran nas čuva od kiše."),
    c("raincoat", "kabanica", "Kabanica", "kabanicu", false, "outer", ["rain"], ["sun"], "Kabanica ne propušta kišu."),
    c("rainBoots", "gumene čizme", "Gumene čizme", "gumene čizme", true, "feet", ["rain", "snow"], ["sun"], "U gumenim čizmama noge ostaju suve."),
    c("beanie", "zimska kapa", "Zimska kapa", "zimsku kapu", false, "head", ["snow", "cold", "wind", "park"], ["sun", "pool"], "Zimska kapa greje glavu i uši."),
    c("gloves", "rukavice", "Rukavice", "rukavice", true, "hands", ["snow", "cold", "park"], ["sun", "pool"], "Rukavice greju ruke."),
    c("scarf", "šal", "Šal", "šal", false, "neck", ["snow", "cold", "wind", "park"], ["sun", "pool"], "Šal greje vrat."),
    c("jacket", "jakna", "Jakna", "jaknu", false, "outer", ["snow", "cold", "wind", "park"], ["sun", "pool"], "Jakna nas greje."),
    c("snowBoots", "čizme", "Čizme", "čizme", true, "feet", ["snow", "cold", "park"], ["sun", "pool"], "Čizme greju noge."),
    c("hoodie", "duks", "Duks", "duks", false, "warm", ["wind", "cold"], ["sun", "pool"], "Duks čuva od vetra."),
    c("sweater", "džemper", "Džemper", "džemper", false, "warm", ["cold", "snow", "wind", "school", "park"], ["sun", "pool"], "Džemper je topao."),
    c("pants", "pantalone", "Pantalone", "pantalone", true, "legs", ["rain", "snow", "wind", "cold", "school", "park"], ["pool"], "Pantalone greju noge."),
    c("socks", "čarape", "Čarape", "čarape", true, "socks", ["rain", "snow", "wind", "cold", "school", "park"], ["pool"], "Čarape greju stopala."),
    c("sneakers", "patike", "Patike", "patike", true, "feet", ["sun", "wind", "cold", "school"], ["rain", "snow", "park", "pool"], "Patike su udobne za hodanje."),
    c("swimsuit", "kupaći", "Kupaći", "kupaći", false, "swim", ["pool"], ["school", "park", "snow", "cold", "rain", "wind"], "Kupaći je za plivanje."),
    c("flipFlops", "japanke", "Japanke", "japanke", true, "feet", ["pool"], ["school", "park", "snow", "cold", "rain", "wind"], "Japanke su za bazen."),
    c("towel", "peškir", "Peškir", "peškir", false, "neck", ["pool"], ["school", "park"], "Peškirom se brišemo posle kupanja."),
    c("backpack", "ranac", "Ranac", "ranac", false, "back", ["school"], ["pool", "park"], "U rancu su knjige i sveske."),
];

export function getClothing(id: unknown): Clothing | undefined {
    return typeof id === "string" ? CLOTHES.find((item) => item.id === id) : undefined;
}

function clothing(id: ClothingId): Clothing {
    return getClothing(id)!;
}

/**
 * Redosled oblačenja: prvo leva, pa desna stvar (čarape pa obuća, majica pa ono preko nje).
 * Važi samo kad su obe u istoj odeći.
 */
export const DRESS_BEFORE: readonly (readonly [ClothingId, ClothingId])[] = [
    ["socks", "sneakers"],
    ["socks", "snowBoots"],
    ["socks", "rainBoots"],
    ["tshirt", "sweater"],
    ["tshirt", "hoodie"],
    ["tshirt", "jacket"],
    ["tshirt", "raincoat"],
    ["sweater", "jacket"],
    ["sweater", "raincoat"],
    ["hoodie", "jacket"],
    ["hoodie", "raincoat"],
];

/** Šta mora da bude obučeno pre ove stvari (od stvari koje su u istoj odeći) */
export function mustComeFirst(id: string, outfit: readonly string[]): string[] {
    return DRESS_BEFORE.filter(([first, then]) => then === id && outfit.includes(first)).map(([first]) => first);
}

// ── Scene: vreme, mešano vreme i mesta ───────────────────────────────────────

export interface Kit {
    /** Šta dete oblači */
    add: ClothingId[];
    /** Šta je već obučeno (bez toga: sve ostalo iz `wear`) */
    base?: ClothingId[];
}

export interface Scene {
    id: SceneId;
    conditions: readonly Condition[];
    /** Šta se dešava napolju, bez „napolju” („pada sneg”, „je hladno i pada kiša”) */
    now: string;
    /** Za šta je odeća („za sneg”, „za hladnu kišu”, „za bazen”) */
    forNoun: string;
    /** Kratak natpis ispod prozora */
    caption: string;
    /** Mesto (bazen, škola, park): umesto prozora je slika mesta, a lik „ide” tamo */
    place?: PlaceId;
    /** Cela odeća za ovo vreme, redom kako se oblači */
    wear: ClothingId[];
    /** Jedna stvar koja fali (lako); prva je „ključna” (kapa, kišobran, rukavice) */
    one: ClothingId[];
    two: ClothingId[][];
    /** Cela odeća od 3–4 stvari (lik je u potkošulji ili već delom obučen) */
    outfit: Kit[];
    /** Odeća u kojoj je važan redosled (čarape pa čizme, majica pa jakna) */
    order: Kit[];
    /** Jasno pogrešne stvari za ovo vreme (nikad nešto o čemu bi se moglo sporiti) */
    distractors: ClothingId[];
}

export const SCENES: readonly Scene[] = [
    {
        id: "sun",
        conditions: ["sun"],
        now: "je sunčano i toplo",
        forNoun: "za sunce",
        caption: "Sunčano i toplo",
        wear: ["tshirt", "shorts", "sandals", "sunCap", "sunglasses"],
        one: ["sunCap", "sunglasses", "sandals"],
        two: [
            ["sunCap", "sunglasses"],
            ["sunCap", "sandals"],
            ["sandals", "sunglasses"],
        ],
        outfit: [
            { add: ["shorts", "sandals", "sunCap"], base: ["tshirt"] },
            { add: ["tshirt", "shorts", "sandals", "sunCap"], base: [] },
            { add: ["shorts", "sunCap", "sunglasses"], base: ["tshirt", "sandals"] },
        ],
        order: [],
        distractors: ["gloves", "beanie", "snowBoots", "jacket", "scarf", "raincoat", "rainBoots"],
    },
    {
        id: "rain",
        conditions: ["rain"],
        now: "pada kiša",
        forNoun: "za kišu",
        caption: "Pada kiša",
        wear: ["tshirt", "pants", "socks", "rainBoots", "raincoat", "umbrella"],
        one: ["umbrella", "raincoat", "rainBoots"],
        two: [
            ["umbrella", "raincoat"],
            ["raincoat", "rainBoots"],
            ["umbrella", "rainBoots"],
        ],
        outfit: [
            { add: ["rainBoots", "raincoat", "umbrella"] },
            { add: ["pants", "rainBoots", "raincoat", "umbrella"], base: ["tshirt", "socks"] },
        ],
        order: [
            { add: ["socks", "rainBoots", "umbrella"], base: ["tshirt", "pants", "raincoat"] },
            { add: ["tshirt", "raincoat", "umbrella"], base: ["pants", "socks", "rainBoots"] },
            { add: ["tshirt", "socks", "rainBoots", "raincoat"], base: ["pants"] },
        ],
        distractors: ["sandals", "shorts", "sunglasses", "sneakers"],
    },
    {
        id: "snow",
        conditions: ["snow"],
        now: "pada sneg",
        forNoun: "za sneg",
        caption: "Pada sneg",
        wear: ["tshirt", "pants", "socks", "snowBoots", "sweater", "jacket", "scarf", "beanie", "gloves"],
        one: ["gloves", "beanie", "scarf"],
        two: [
            ["beanie", "gloves"],
            ["scarf", "gloves"],
            ["snowBoots", "gloves"],
            ["beanie", "scarf"],
        ],
        outfit: [
            { add: ["scarf", "beanie", "gloves"] },
            { add: ["jacket", "scarf", "beanie", "gloves"] },
            { add: ["snowBoots", "jacket", "beanie"] },
        ],
        order: [
            { add: ["socks", "snowBoots", "jacket"], base: ["tshirt", "pants", "sweater", "beanie"] },
            { add: ["sweater", "jacket", "gloves"], base: ["tshirt", "pants", "socks", "snowBoots", "beanie"] },
            { add: ["tshirt", "socks", "snowBoots", "jacket"], base: ["pants", "beanie", "scarf"] },
        ],
        distractors: ["sandals", "shorts", "sunglasses", "sunCap", "sneakers"],
    },
    {
        id: "wind",
        conditions: ["wind"],
        now: "duva jak vetar",
        forNoun: "za vetar",
        caption: "Duva vetar",
        wear: ["tshirt", "pants", "socks", "sneakers", "hoodie", "scarf", "beanie"],
        one: ["scarf", "hoodie", "beanie"],
        two: [
            ["hoodie", "scarf"],
            ["scarf", "beanie"],
        ],
        outfit: [
            { add: ["hoodie", "scarf", "beanie"] },
            { add: ["sneakers", "hoodie", "scarf", "beanie"] },
        ],
        order: [
            { add: ["tshirt", "hoodie", "beanie"], base: ["pants", "socks", "sneakers"] },
            { add: ["tshirt", "socks", "sneakers", "hoodie"], base: ["pants"] },
        ],
        distractors: ["umbrella", "sandals", "shorts", "sunCap"],
    },
    {
        id: "cold",
        conditions: ["cold"],
        now: "je hladno",
        forNoun: "za hladno vreme",
        caption: "Hladno je",
        wear: ["tshirt", "pants", "socks", "sneakers", "sweater", "jacket", "scarf", "beanie"],
        one: ["beanie", "jacket", "scarf"],
        two: [
            ["beanie", "scarf"],
            ["jacket", "beanie"],
        ],
        outfit: [
            { add: ["jacket", "scarf", "beanie"] },
            { add: ["sweater", "jacket", "scarf", "beanie"] },
        ],
        order: [
            { add: ["tshirt", "sweater", "jacket"], base: ["pants", "socks", "sneakers"] },
            { add: ["tshirt", "socks", "sneakers", "jacket"], base: ["pants", "beanie"] },
        ],
        distractors: ["sandals", "shorts", "sunglasses", "sunCap"],
    },
    {
        id: "coldRain",
        conditions: ["cold", "rain"],
        now: "je hladno i pada kiša",
        forNoun: "za hladnu kišu",
        caption: "Hladno je i pada kiša",
        wear: ["tshirt", "pants", "socks", "rainBoots", "sweater", "raincoat", "beanie", "umbrella"],
        one: ["umbrella", "beanie"],
        two: [["raincoat", "beanie"]],
        outfit: [
            { add: ["rainBoots", "raincoat", "beanie", "umbrella"] },
            { add: ["sweater", "raincoat", "beanie", "umbrella"], base: ["tshirt", "pants", "socks", "rainBoots"] },
        ],
        order: [{ add: ["socks", "rainBoots", "sweater", "raincoat", "beanie"], base: ["tshirt", "pants"] }],
        distractors: ["sandals", "shorts", "sunglasses", "sunCap", "sneakers"],
    },
    {
        id: "coldWind",
        conditions: ["cold", "wind"],
        now: "je hladno i duva vetar",
        forNoun: "za hladan vetar",
        caption: "Hladno je i duva vetar",
        wear: ["tshirt", "pants", "socks", "sneakers", "hoodie", "jacket", "scarf", "beanie"],
        one: ["scarf", "beanie"],
        two: [["jacket", "scarf"]],
        outfit: [
            { add: ["jacket", "scarf", "beanie"] },
            { add: ["hoodie", "jacket", "scarf", "beanie"] },
        ],
        order: [{ add: ["socks", "sneakers", "hoodie", "jacket", "beanie"], base: ["tshirt", "pants"] }],
        distractors: ["umbrella", "sandals", "shorts", "sunCap", "sunglasses"],
    },
    {
        id: "snowWind",
        conditions: ["snow", "wind"],
        now: "pada sneg i duva vetar",
        forNoun: "za sneg i vetar",
        caption: "Pada sneg i duva vetar",
        wear: ["tshirt", "pants", "socks", "snowBoots", "sweater", "jacket", "scarf", "beanie", "gloves"],
        one: ["gloves", "scarf"],
        two: [["scarf", "gloves"]],
        outfit: [
            { add: ["jacket", "scarf", "beanie", "gloves"] },
            { add: ["snowBoots", "jacket", "scarf", "gloves"] },
        ],
        order: [{ add: ["socks", "snowBoots", "sweater", "jacket", "gloves"], base: ["tshirt", "pants", "beanie"] }],
        distractors: ["umbrella", "sandals", "shorts", "sunCap", "sneakers"],
    },
    {
        id: "pool",
        conditions: ["pool"],
        now: "",
        forNoun: "za bazen",
        caption: "Bazen",
        place: "pool",
        wear: ["swimsuit", "flipFlops", "towel"],
        one: ["swimsuit"],
        two: [["swimsuit", "flipFlops"]],
        outfit: [{ add: ["swimsuit", "flipFlops", "towel"], base: [] }],
        order: [],
        distractors: ["jacket", "snowBoots", "beanie", "gloves", "backpack", "sweater"],
    },
    {
        id: "school",
        conditions: ["school"],
        now: "",
        forNoun: "za školu",
        caption: "Škola",
        place: "school",
        wear: ["tshirt", "pants", "socks", "sneakers", "sweater", "backpack"],
        one: ["backpack"],
        two: [["sweater", "backpack"]],
        outfit: [
            { add: ["pants", "sneakers", "sweater", "backpack"], base: ["tshirt", "socks"] },
            { add: ["tshirt", "pants", "sneakers", "backpack"], base: ["socks"] },
        ],
        order: [],
        distractors: ["swimsuit", "flipFlops", "towel"],
    },
    {
        id: "park",
        conditions: ["park", "snow"],
        now: "",
        forNoun: "za sneg",
        caption: "Park pod snegom",
        place: "park",
        wear: ["tshirt", "pants", "socks", "snowBoots", "sweater", "jacket", "beanie", "gloves"],
        one: ["gloves"],
        two: [["beanie", "gloves"]],
        outfit: [
            { add: ["snowBoots", "jacket", "beanie", "gloves"] },
            { add: ["jacket", "beanie", "gloves"] },
        ],
        order: [],
        distractors: ["swimsuit", "flipFlops", "towel", "sandals", "shorts"],
    },
];

export function getScene(id: unknown): Scene | undefined {
    return typeof id === "string" ? SCENES.find((scene) => scene.id === id) : undefined;
}

function scene(id: SceneId): Scene {
    return getScene(id)!;
}

/** Odgovara li stvar ovom vremenu: potrebna je bar za jedan uslov i nije pogrešna ni za jedan */
export function fitsScene(item: ClothingId, sceneId: SceneId): boolean {
    const info = clothing(item);
    const conditions = scene(sceneId).conditions;
    return conditions.some((condition) => info.for.includes(condition)) && !conditions.some((condition) => info.against.includes(condition));
}

/** Šta je već obučeno u ovom kompletu */
export function kitBase(sceneId: SceneId, kit: Kit): ClothingId[] {
    return kit.base ? [...kit.base] : scene(sceneId).wear.filter((id) => !kit.add.includes(id));
}

// ── Junaci ───────────────────────────────────────────────────────────────────

export const HERO_IDS = ["amar", "lejla"] as const;
export type HeroId = (typeof HERO_IDS)[number];

interface Hero {
    name: string;
    /** Dativ: „Šta treba Lejli?” */
    dat: string;
    female: boolean;
}

export const HEROES: Readonly<Record<HeroId, Hero>> = {
    amar: { name: "Amar", dat: "Amaru", female: false },
    lejla: { name: "Lejla", dat: "Lejli", female: true },
};

export function isHero(value: unknown): value is HeroId {
    return value === "amar" || value === "lejla";
}

// ── Nedeljna prognoza ─────────────────────────────────────────────────────────

export const WEEKDAYS = [
    { short: "Pon", name: "ponedeljak", in: "u ponedeljak" },
    { short: "Uto", name: "utorak", in: "u utorak" },
    { short: "Sre", name: "sreda", in: "u sredu" },
    { short: "Čet", name: "četvrtak", in: "u četvrtak" },
    { short: "Pet", name: "petak", in: "u petak" },
] as const;

export interface Forecast {
    /** Vreme za svaki dan od ponedeljka do petka */
    days: SceneId[];
    /** Koji je dan danas (indeks) */
    today: number;
    /** Za koji dan se sprema odeća */
    target: number;
    /** Ciljni dan je istaknut (prva prognoza); kasnije se dan samo imenuje */
    mark: boolean;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export type WeatherTask = "dress" | "when";
type KitKind = "one" | "two" | "outfit" | "order";

export interface WeatherLevel {
    task: WeatherTask;
    /** Iz kojih scena se biraju zadaci */
    scenes: readonly SceneId[];
    kit: KitKind;
    /** Samo prva (ključna) stvar iz `one` */
    keyOnly?: boolean;
    /** Koliko pogrešnih stvari stoji u korpi */
    distractors: number;
    /** Bar jedna pogrešna stvar je sa istog mesta na telu kao prava (patike pored čizama) */
    near?: boolean;
    /** Važi redosled oblačenja */
    order: boolean;
    /** Traka sa koracima oblačenja se vidi od početka (inače samo kao pomoć posle greške) */
    strip: boolean;
    /** Nedeljna prognoza: „sutra” (istaknuto) ili imenovan dan */
    forecast?: "tomorrow" | "day";
    rounds: number;
    earlyHint: boolean;
}

const SINGLE: SceneId[] = ["sun", "rain", "snow", "wind", "cold"];
const MIXED: SceneId[] = ["coldRain", "coldWind", "snowWind"];

export const WEATHER_LEVELS: readonly WeatherLevel[] = [
    // Lako: lik je skoro obučen, fali jedna pa dve stvari; pa „Kada nosimo čizme?”
    { task: "dress", scenes: ["sun", "rain", "snow"], kit: "one", keyOnly: true, distractors: 1, order: false, strip: false, rounds: 4, earlyHint: true },
    { task: "dress", scenes: ["sun", "rain", "snow", "cold"], kit: "one", distractors: 2, order: false, strip: false, rounds: 5, earlyHint: true },
    { task: "dress", scenes: ["sun", "rain", "snow"], kit: "two", distractors: 1, order: false, strip: false, rounds: 4, earlyHint: true },
    { task: "dress", scenes: SINGLE, kit: "two", distractors: 2, order: false, strip: false, rounds: 4, earlyHint: true },
    { task: "when", scenes: ["sun", "rain", "snow"], kit: "one", distractors: 2, order: false, strip: false, rounds: 5, earlyHint: true },
    // Srednje: cela odeća, pa redosled oblačenja (prvo sa trakom koraka)
    { task: "dress", scenes: ["sun", "rain", "snow"], kit: "outfit", distractors: 1, order: false, strip: false, rounds: 3, earlyHint: false },
    { task: "dress", scenes: SINGLE, kit: "outfit", distractors: 2, order: false, strip: false, rounds: 3, earlyHint: false },
    { task: "dress", scenes: ["rain", "snow", "wind", "cold"], kit: "order", distractors: 1, order: true, strip: true, rounds: 3, earlyHint: false },
    { task: "dress", scenes: ["rain", "snow", "wind", "cold"], kit: "order", distractors: 1, order: true, strip: false, rounds: 3, earlyHint: false },
    { task: "dress", scenes: SINGLE, kit: "outfit", distractors: 2, near: true, order: true, strip: false, rounds: 3, earlyHint: false },
    // Teško: mešano vreme, nedeljna prognoza, mesto
    { task: "dress", scenes: MIXED, kit: "outfit", distractors: 2, near: true, order: true, strip: false, rounds: 3, earlyHint: false },
    { task: "dress", scenes: MIXED, kit: "order", distractors: 3, near: true, order: true, strip: false, rounds: 3, earlyHint: false },
    { task: "dress", scenes: [...SINGLE, ...MIXED], kit: "outfit", distractors: 2, near: true, order: true, strip: false, forecast: "tomorrow", rounds: 3, earlyHint: false },
    { task: "dress", scenes: [...SINGLE, ...MIXED], kit: "outfit", distractors: 3, near: true, order: true, strip: false, forecast: "day", rounds: 3, earlyHint: false },
    { task: "dress", scenes: ["pool", "school", "park"], kit: "outfit", distractors: 3, order: true, strip: false, rounds: 3, earlyHint: false },
];

export const WEATHER_MAX_LEVEL = WEATHER_LEVELS.length;

export function weatherLevel(level: number): WeatherLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), WEATHER_MAX_LEVEL);
    return WEATHER_LEVELS[safe - 1];
}

/** Stvari za pitanje „Kada nosimo …?” i vreme kada se nose (samo jedno tačno) */
export const WHEN_ITEMS: readonly { item: ClothingId; answer: WeatherId }[] = [
    { item: "snowBoots", answer: "snow" },
    { item: "sandals", answer: "sun" },
    { item: "umbrella", answer: "rain" },
    { item: "gloves", answer: "snow" },
    { item: "raincoat", answer: "rain" },
    { item: "sunglasses", answer: "sun" },
    { item: "sunCap", answer: "sun" },
    { item: "shorts", answer: "sun" },
];

// ── Plan nivoa ────────────────────────────────────────────────────────────────

export interface DressRound {
    task: "dress";
    scene: SceneId;
    hero: HeroId;
    base: ClothingId[];
    need: ClothingId[];
    /** Odeća u korpi (prave i pogrešne stvari, izmešane) */
    tray: ClothingId[];
    order: boolean;
    /** Zadatak je baš o redosledu (pitanje to kaže) */
    sequence: boolean;
    strip: boolean;
    forecast: Forecast | null;
}

export interface WhenRound {
    task: "when";
    item: ClothingId;
    answer: WeatherId;
    choices: WeatherId[];
    hero: HeroId;
}

export type WeatherRound = DressRound | WhenRound;

interface BuildOptions {
    maxRounds: number;
    maxChoices: number;
    random?: () => number;
}

/**
 * Plan nivoa: zadaci jedan za drugim. Isto vreme se ne ponavlja zaredom (dok ima drugog),
 * a junaci se smenjuju. U korpi je uvek bar jedna pogrešna stvar; ukupno najviše koliko
 * dete sme da vidi izbora (ali ne manje od prave odeće i jedne pogrešne). `random` daje [0, 1).
 */
export function buildWeatherLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): WeatherRound[] {
    const rule = weatherLevel(level);
    const shuffle = <T,>(list: readonly T[]): T[] => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    const count = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const limit = Number.isFinite(maxChoices) ? maxChoices : 3;

    // Scene redom: svaka po jednom pre ponavljanja, bez iste dve zaredom. Prvi zadatak prvog
    // nivoa (pokazni) je sunce i kapa — najpoznatije.
    const pool = rule.scenes.filter((id) => rule.kit !== "order" || scene(id).order.length > 0);
    const scenes: SceneId[] = level === 1 && pool.includes("sun") ? ["sun"] : [];
    while (scenes.length < count) {
        // Prvi krug bez scena koje su već bile (sunce na prvom nivou)
        for (const id of shuffle(pool.filter((other) => scenes.length >= pool.length || !scenes.includes(other)))) {
            if (scenes.length >= count) break;
            if (scenes[scenes.length - 1] === id && pool.length > 1) continue;
            scenes.push(id);
        }
    }
    const firstHero: HeroId = random() < 0.5 ? "amar" : "lejla";
    const heroAt = (index: number): HeroId => (index % 2 === 0 ? firstHero : firstHero === "amar" ? "lejla" : "amar");

    if (rule.task === "when") {
        const items = shuffle(WHEN_ITEMS.filter((entry) => rule.scenes.includes(entry.answer)));
        const size = Math.max(2, Math.min(rule.distractors + 1, limit));
        return Array.from({ length: count }, (_, index) => {
            const entry = items[index % items.length];
            const others = shuffle(rule.scenes.filter((id): id is WeatherId => id !== entry.answer && !clothing(entry.item).for.includes(id as Condition)) as WeatherId[]);
            const choices = shuffle([entry.answer, ...others.slice(0, size - 1)]);
            return { task: "when", item: entry.item, answer: entry.answer, choices, hero: heroAt(index) };
        });
    }

    const rounds: DressRound[] = [];
    scenes.forEach((sceneId, index) => {
        const info = scene(sceneId);
        let kit: Kit;
        if (rule.kit === "one") kit = { add: [rule.keyOnly ? info.one[0] : pick(info.one)] };
        else if (rule.kit === "two") kit = { add: [...pick(info.two)] };
        else if (rule.kit === "order") kit = pick(info.order);
        else kit = pick(info.outfit);
        const need = [...kit.add];
        const base = kitBase(sceneId, kit);

        // Pogrešne stvari: na prvom nivou ključne stvari drugog vremena (kapa, kišobran, rukavice)
        const candidates = (rule.keyOnly ? rule.scenes.filter((id) => id !== sceneId).map((id) => scene(id).one[0]) : info.distractors).filter(
            (id) => !need.includes(id) && !base.includes(id) && !fitsScene(id, sceneId)
        );
        const room = Math.max(1, limit - need.length);
        const wanted = Math.max(1, Math.min(rule.distractors, room));
        const slots = new Set([...need, ...base].map((id) => clothing(id).slot));
        const near = shuffle(candidates.filter((id) => slots.has(clothing(id).slot)));
        const far = shuffle(candidates.filter((id) => !slots.has(clothing(id).slot)));
        const chosen = rule.near ? [...near.slice(0, 1), ...shuffle([...near.slice(1), ...far])] : [...far, ...near];
        const distractors = Array.from(new Set(chosen)).slice(0, wanted);

        // Prognoza: dan za koji se sprema odeća ima baš ovo vreme, ostali dani su drugačiji.
        // Danas je uvek pre tog dana (i sa drugačijim vremenom), da se odeća ne bira „kroz prozor”.
        let forecast: Forecast | null = null;
        if (rule.forecast) {
            const target = 1 + Math.floor(random() * (WEEKDAYS.length - 1));
            const today = rule.forecast === "tomorrow" ? target - 1 : Math.floor(random() * target);
            const others = shuffle([...SINGLE, ...MIXED].filter((id) => id !== sceneId));
            const days = WEEKDAYS.map((_, day) => (day === target ? sceneId : others[day % others.length]));
            forecast = { days, today, target, mark: rule.forecast === "tomorrow" };
        }

        rounds.push({
            task: "dress",
            scene: sceneId,
            hero: heroAt(index),
            base,
            need,
            tray: level === 1 && index === 0 ? [need[0], ...shuffle([...need.slice(1), ...distractors])] : shuffle([...need, ...distractors]),
            order: rule.order,
            sequence: rule.kit === "order",
            strip: rule.strip,
            forecast,
        });
    });
    return rounds;
}

/** Jedan validan redosled oblačenja (za traku koraka): stvari bez preduslova idu što ranije */
export function dressingOrder(need: readonly string[]): string[] {
    const left = [...need];
    const result: string[] = [];
    while (left.length > 0) {
        const index = left.findIndex((id) => mustComeFirst(id, left).length === 0);
        const [next] = left.splice(index < 0 ? 0 : index, 1);
        result.push(next);
    }
    return result;
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

const cap = (text: string) => text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);
const isAre = (item: Clothing, yes: boolean) => (item.plural ? (yes ? "su" : "nisu") : yes ? "je" : "nije");

/** „Napolju pada sneg.” / „Amar ide na bazen.” */
export function sceneSentence(sceneId: SceneId, hero: HeroId): string {
    const info = scene(sceneId);
    const name = HEROES[hero].name;
    if (info.place === "pool") return `${name} ide na bazen.`;
    if (info.place === "school") return `${name} ide u školu.`;
    if (info.place === "park") return `${name} ide u park. U parku je sneg.`;
    return `Napolju ${info.now}.`;
}

/** Kako se zove dan iz prognoze u rečenici („Sutra”, „U četvrtak”) */
function dayLead(forecast: Forecast): string {
    return forecast.mark ? "Sutra" : cap(WEEKDAYS[forecast.target].in);
}

/** Pitanje zadatka (naslov i glas) */
export function dressQuestion(round: Pick<DressRound, "scene" | "hero" | "base" | "forecast"> & { sequence?: boolean }): string {
    const hero = HEROES[round.hero];
    if (round.forecast) {
        const today = WEEKDAYS[round.forecast.today].name;
        const when = round.forecast.mark ? "sutra" : WEEKDAYS[round.forecast.target].in;
        return `Danas je ${today}. Šta ${hero.name} nosi ${when}?`;
    }
    const lead = sceneSentence(round.scene, round.hero);
    if (scene(round.scene).place) return `${lead} Šta ${hero.female ? "joj" : "mu"} treba?`;
    // Lik je već delom obučen: pita se šta još fali (a u zadacima o redosledu i šta ide prvo)
    return `${lead} Šta${round.base.length > 0 ? " još" : ""} treba ${hero.dat}?${round.sequence ? ` ${ORDER_TIP}` : ""}`;
}

export const ORDER_TIP = "Pazi šta ide prvo.";

/** Pogrešna stvar: „Napolju pada sneg. Sandale nisu za sneg.” */
export function refusalSentence(round: Pick<DressRound, "scene" | "hero" | "forecast">, item: ClothingId): string {
    const info = clothing(item);
    const sceneInfo = scene(round.scene);
    const fact = `${cap(info.name)} ${isAre(info, false)} ${sceneInfo.forNoun}.`;
    if (round.forecast) return `${forecastSentence(round.forecast)} ${fact}`;
    if (sceneInfo.place) return fact;
    return `${sceneSentence(round.scene, round.hero)} ${fact}`;
}

/** Redosled: „Prvo čarape, pa čizme.” */
export function orderSentence(first: ClothingId, then: ClothingId): string {
    return `Prvo ${clothing(first).name}, pa ${clothing(then).name}.`;
}

/** Stvar je obučena: razlog („Rukavice greju ruke.”) */
export function wornSentence(item: ClothingId): string {
    return clothing(item).why;
}

/** Lik je spreman: „Amar je spreman za sneg.” */
export function readySentence(round: Pick<DressRound, "scene" | "hero">): string {
    const hero = HEROES[round.hero];
    return `${hero.name} je ${hero.female ? "spremna" : "spreman"} ${scene(round.scene).forNoun}.`;
}

/** Kakvo je vreme na ciljni dan prognoze: „U četvrtak pada kiša.” */
export function forecastSentence(forecast: Forecast): string {
    return `${dayLead(forecast)} ${scene(forecast.days[forecast.target]).now}.`;
}

/** „Kada nosimo čizme?” */
export function whenQuestion(item: ClothingId): string {
    return `Kada nosimo ${clothing(item).acc}?`;
}

/** „Čizme nosimo kad pada sneg.” */
export function whenAnswer(item: ClothingId, answer: WeatherId): string {
    return `${cap(clothing(item).acc)} nosimo kad ${scene(answer).now}.`;
}

/** „Čizme ne nosimo kad je sunčano i toplo.” */
export function whenMistake(item: ClothingId, picked: WeatherId): string {
    return `${cap(clothing(item).acc)} ne nosimo kad ${scene(picked).now}.`;
}

export const WHEN_INTRO = "Pogledaj stvar i vreme.";

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface WeatherMistake {
    item: string;
    /** weather: ne ide uz ovo vreme · order: prvo treba nešto drugo · when: pogrešno vreme */
    reason: "weather" | "order" | "when";
    /** Za redosled: šta treba prvo */
    first?: string;
}

export interface WeatherView extends BaseView {
    task: WeatherTask;
    scene: string;
    hero: HeroId;
    base: string[];
    need: string[];
    tray: string[];
    worn: string[];
    order: boolean;
    sequence: boolean;
    strip: boolean;
    forecast: Forecast | null;
    /** „Kada nosimo…”: stvar, izbori (vreme) i tačan odgovor */
    item: string | null;
    choices: string[];
    answer: string | null;
    selected: string | null;
    hint: boolean;
    /** Svi pogrešni pokušaji u zadatku („stvar” ili „stvar>prvo” za redosled) */
    wrong: string[];
    mistake: WeatherMistake | null;
    /** Poslednja obučena stvar (kratko zasvetli) */
    last: string | null;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyWeatherView(totalRounds: number): WeatherView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        task: "dress",
        scene: "",
        hero: "amar",
        base: [],
        need: [],
        tray: [],
        worn: [],
        order: false,
        sequence: false,
        strip: false,
        forecast: null,
        item: null,
        choices: [],
        answer: null,
        selected: null,
        hint: false,
        wrong: [],
        mistake: null,
        last: null,
        feedback: null,
    };
}

export function weatherRoundView(round: WeatherRound): Partial<WeatherView> {
    const reset = { selected: null, hint: false, wrong: [], mistake: null, last: null, feedback: null, worn: [] };
    if (round.task === "when") {
        return { ...reset, task: "when", scene: round.answer, hero: round.hero, base: [], need: [], tray: [], order: false, sequence: false, strip: false, forecast: null, item: round.item, choices: [...round.choices], answer: round.answer };
    }
    return {
        ...reset,
        task: "dress",
        scene: round.scene,
        hero: round.hero,
        base: [...round.base],
        need: [...round.need],
        tray: [...round.tray],
        order: round.order,
        sequence: round.sequence,
        strip: round.strip,
        forecast: round.forecast ? { ...round.forecast, days: [...round.forecast.days] } : null,
        item: null,
        choices: [],
        answer: null,
    };
}

/** Prava stvar koja sledeća ide (poštuje redosled) — za pomoć i za ruku na prvom zadatku */
export function nextNeeded(view: Pick<WeatherView, "need" | "worn" | "order" | "selected">): string | null {
    const left = view.need.filter((id) => !view.worn.includes(id));
    const ready = view.order ? left.filter((id) => mustComeFirst(id, left).length === 0) : left;
    if (view.selected && ready.includes(view.selected)) return view.selected;
    return ready[0] ?? null;
}

/**
 * Šta se dešava kad se stvar spusti na lik: `ok` (obučena), `weather` (ne ide uz ovo vreme)
 * ili `order` (prvo treba nešto drugo — `first`).
 */
export function tryWear(view: Pick<WeatherView, "need" | "worn" | "order">, item: string): { result: "ok" } | { result: "weather" } | { result: "order"; first: string } {
    if (!view.need.includes(item) || view.worn.includes(item)) return { result: "weather" };
    if (view.order) {
        const missing = mustComeFirst(item, view.need).filter((first) => !view.worn.includes(first));
        if (missing.length > 0) return { result: "order", first: missing[0] };
    }
    return { result: "ok" };
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen (lik je spreman ili je izabrano pravo vreme). Prvi zadatak prvog nivoa
 * pokazuje ruka (ne ocenjuje se); „correct” = bez ijedne greške i bez pomoći; „prompted” =
 * uz pomoć (osim pokaznog).
 */
export function solveWeatherView(current: WeatherView, level: number, solved: Partial<WeatherView> = {}): { next: WeatherView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hint;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: WeatherView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function weatherResult(final: WeatherView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeWeatherMonitor(state: Partial<WeatherView> | null | undefined): WeatherView {
    const base = emptyWeatherView(1);
    if (!state) return base;
    const items = (value: unknown, allowed?: string[]) =>
        Array.isArray(value) ? Array.from(new Set(value.filter((id): id is string => getClothing(id) !== undefined && (!allowed || allowed.includes(id))))) : [];
    const task: WeatherTask = state.task === "when" ? "when" : "dress";
    const sceneId = getScene(state.scene)?.id ?? "";
    const need = items(state.need);
    const tray = items(state.tray);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    let forecast: Forecast | null = null;
    const raw = state.forecast as Partial<Forecast> | null | undefined;
    if (raw && typeof raw === "object" && Array.isArray(raw.days) && raw.days.length === WEEKDAYS.length && raw.days.every((id) => getScene(id) !== undefined)) {
        const day = (value: unknown) => (Number.isInteger(value) && (value as number) >= 0 && (value as number) < WEEKDAYS.length ? (value as number) : 0);
        forecast = { days: [...raw.days] as SceneId[], today: day(raw.today), target: day(raw.target), mark: raw.mark === true };
    }
    const choices = Array.isArray(state.choices) ? Array.from(new Set(state.choices.filter((id): id is string => (WEATHER_IDS as readonly string[]).includes(id as string)))) : [];
    const mistake = state.mistake && typeof state.mistake === "object" && getClothing(state.mistake.item) ? state.mistake : null;
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        task,
        scene: sceneId,
        hero: isHero(state.hero) ? state.hero : "amar",
        base: items(state.base),
        need,
        tray,
        worn: items(state.worn, need),
        order: state.order === true,
        sequence: state.sequence === true,
        strip: state.strip === true,
        forecast,
        item: getClothing(state.item)?.id ?? null,
        choices,
        answer: typeof state.answer === "string" && choices.includes(state.answer) ? state.answer : null,
        selected: typeof state.selected === "string" && tray.includes(state.selected) ? state.selected : null,
        hint: state.hint === true,
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((item): item is string => typeof item === "string" && item.length <= 40).slice(0, 24) : [],
        mistake: mistake ? { item: mistake.item, reason: mistake.reason === "order" ? "order" : mistake.reason === "when" ? "when" : "weather", first: getClothing(mistake.first)?.id } : null,
        last: typeof state.last === "string" && need.includes(state.last) ? state.last : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
