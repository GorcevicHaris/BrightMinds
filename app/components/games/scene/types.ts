// Opis slike situacije: pozadina, likovi i predmeti, kao kratak „scenario” za crtača.
//
// Slike se crtaju u SVG-u iz istih delova (scene/backgrounds, figures, props), pa sve imaju
// isti stil, istu razmeru i isti okvir (VIEW_W × VIEW_H). Podaci za pojedine igre su u
// data/*Scenes.ts i pozivaju se po ID-ju zadatka; ovde su samo tipovi i spiskovi naziva
// (test proverava da svaki naziv ima svoj crtež).

import type { EmotionId } from "@/app/components/games/data/emotionScenarios";

export const VIEW_W = 240;
export const VIEW_H = 160;

export const BACKGROUND_IDS = [
    "room",
    "bedroom",
    "living",
    "kitchen",
    "bathroom",
    "classroom",
    "hall",
    "clinic",
    "shop",
    "restaurant",
    "park",
    "playground",
    "street",
    "garden",
    "beach",
    "snow",
    "pool",
    "station",
    "train",
    "plain",
    "sky",
] as const;
export type BackgroundId = (typeof BACKGROUND_IDS)[number];

/**
 * Šta se vidi napolju: kroz prozor sobe ili nebo na otvorenom. „clear” je dan bez sunca i
 * oblaka, „stars” noć bez meseca — za pitanja čiji je odgovor baš sunce ili mesec.
 */
export const VIEW_IDS = ["day", "clear", "night", "stars", "dusk", "rain", "storm", "snow", "rainbow", "dark"] as const;
export type ViewId = (typeof VIEW_IDS)[number];

/**
 * Izrazi lica: šest osećanja iz igre (isti crtež kao na karticama) i izrazi za ostale situacije.
 * „calm” i „talk” su blago nasmejani (prijatne situacije); „neutral” je bez osmeha, „worried”
 * zabrinuto i nelagodno, „firm” ozbiljno i odlučno („Stani.”), „tired” umorno, „sleep” spava.
 * Lice mora da odgovara situaciji: dete koje kaže „Pusti me” se ne smeje.
 */
export type Face = EmotionId | "calm" | "talk" | "sleep" | "neutral" | "worried" | "firm" | "tired" | ActionFace;

/**
 * Izrazi uz radnju (ne osećanja): „lick” liže (jezik napolju), „chew” žvaće, „laugh” se glasno
 * smeje, „cry” plače (suze teku), „yawn” zeva, „open” otvara usta kod doktora („A”),
 * „blow” duva (svećice, supa), „pain” nešto ga boli (stisnute oči).
 */
export const ACTION_FACES = ["lick", "chew", "laugh", "cry", "yawn", "open", "blow", "pain"] as const;
export type ActionFace = (typeof ACTION_FACES)[number];

/** Deca sa imenima iz igara, sporedna deca i lik deteta koje igra (priče su u prvom licu) */
export const LOOK_IDS = [
    "lejla",
    "amina",
    "selma",
    "haris",
    "amar",
    "tarik",
    "emir",
    "merjem",
    "ajla",
    "nejla",
    "adnan",
    "ilma",
    "kenan",
    "lamija",
    "faris",
    "boy",
    "boy2",
    "girl",
    "girl2",
    "baby",
    "meBoy",
    "meGirl",
] as const;
export type LookId = (typeof LOOK_IDS)[number];

export const ADULT_IDS = [
    "mama",
    "tata",
    "baka",
    "deka",
    "teacher",
    "teacher2",
    "doctor",
    "nurse",
    "dentist",
    "seller",
    "waiter",
    "cook",
    "firefighter",
    "magician",
    "aunt",
    "lifeguard",
    "conductor",
    "man",
    "woman",
] as const;
export type AdultId = (typeof ADULT_IDS)[number];

/** Položaj ruku (i tela): gde su šake u odnosu na lik */
export const POSE_IDS = [
    "stand",
    "wave",
    "up",
    "hold",
    "give",
    "point",
    "reach",
    "pet",
    "ears",
    "stop",
    "mouth",
    "hug",
    "push",
    "belly",
    "shrug",
    "sit",
    "sitHold",
    "sitReach",
    "lie",
    "swim",
    "ride",
    "walk",
    // Radnje: šta lik radi rukama i telom (slika mora da pokaže tačno ono što piše u tekstu)
    "eat",
    "drink",
    "brush",
    "wash",
    "draw",
    "take",
    "throw",
    "embrace",
    "holdHand",
    "run",
    "kick",
    "sitEat",
    "sitDraw",
    "sitTie",
    "floor",
    "knee",
] as const;
export type PoseId = (typeof POSE_IDS)[number];

/** Odeća i dodaci preko osnovnog izgleda */
export const WEAR_IDS = ["glasses", "partyHat", "beanie", "backpack", "jacket", "swim", "scarf", "medal", "plaster", "shaved", "headphones"] as const;
export type WearId = (typeof WEAR_IDS)[number];

export const PROP_IDS = [
    // Kuća i nameštaj
    "bed",
    "table",
    "chair",
    "sofa",
    "shelf",
    "toyBox",
    "door",
    "doorOpen",
    "lamp",
    "tvOff",
    "remote",
    "clock",
    "sink",
    "bathtubTiles",
    "stove",
    "pot",
    "fridge",
    "coatHook",
    "desk",
    "speaker",
    "radio",
    "phone",
    "suitcase",
    "bag",
    "backpack",
    "basket",
    "toilet",
    "mirror",
    "wallShelf",
    "boxOpen",
    // Igračke i igra
    "gift",
    "cake",
    "balloon",
    "balloons",
    "ball",
    "toyCar",
    "toyCarBroken",
    "teddy",
    "blocks",
    "blocksFallen",
    "puzzle",
    "puzzlePieces",
    "boardGame",
    "cards",
    "kite",
    "drawing",
    "drawingTorn",
    "drawingScribbled",
    "paper",
    "paperCut",
    "paperCircle",
    "crayons",
    "crayonsBroken",
    "pencil",
    "book",
    "bookOpen",
    "bookTorn",
    "envelope",
    "paints",
    "scissors",
    "glue",
    "confetti",
    // Hrana i posuđe
    "iceCream",
    "iceCreamDropped",
    "cone",
    "wrapper",
    "bowlEmpty",
    "soup",
    "plate",
    "pancakes",
    "cup",
    "glass",
    "juiceSpill",
    "apple",
    "carrot",
    "bread",
    "milk",
    "cheese",
    "sweets",
    "syrup",
    "spoon",
    "menu",
    // Napolju
    "tree",
    "flowers",
    "bench",
    "fence",
    "swing",
    "slide",
    "climber",
    "carousel",
    "sandcastleCrushed",
    "wave",
    "puddle",
    "stone",
    "stoneLifted",
    "snowman",
    "snowball",
    "sled",
    "school",
    "shopClosed",
    "iceCreamStand",
    "truck",
    "bus",
    "train",
    "fireTruck",
    "boat",
    "plane",
    "goal",
    "bicycle",
    "bicycleSmall",
    "sun",
    "cloud",
    "rainCloud",
    "rainbow",
    "moon",
    "lightning",
    "smoke",
    "steam",
    "shopShelf",
    "cart",
    "register",
    "seat",
    "ticket",
    "lifebuoy",
    "laneRope",
    "poolSlide",
    "whistle",
    // Životinje
    "cat",
    "dog",
    "bigDog",
    "dogBowl",
    "dogBed",
    "poodle",
    "bee",
    "spider",
    "squirrel",
    "frog",
    "rabbit",
    "topHat",
    "lion",
    "bird",
    "fish",
    "butterfly",
    "duck",
    // Zdravlje
    "thermometer",
    "syringe",
    "plaster",
    "stethoscope",
    "dentistChair",
    "tooth",
    "toothbrush",
    "waitingChairs",
    "lampBright",
    "soapBubbles",
    "towel",
    "shower",
    // Odeća i stvari
    "cap",
    "glove",
    "shoe",
    "shoes",
    "socks",
    "magnifier",
    "glasses",
    "nail",
    "eyeChart",
    "lock",
    "letters",
    "rainDrops",
    "snowflakes",
    "leaves",
    // Znakovi i pokret
    "heart",
    "star",
    "notes",
    "loudNotes",
    "soundWaves",
    "motion",
    "motionLeft",
    "spin",
    "burst",
    "sparkle",
    "zzz",
    "hourglass",
    "question",
    "arrow",
    // Delovi životinja i stvari (za pitanja „Ko ima …?”, „Šta ima …?”)
    "trunk",
    "spikes",
    "longEars",
    "feather",
    "shell",
    "honey",
    "pedal",
    "ladybug",
    "bubbles",
    "strings",
    "stream",
    "bottle",
    // Hrana i stvari za radnje (jede, liže, pije, crta, zaliva…)
    "chocolate",
    "lollipop",
    "sandwich",
    "cookie",
    "fork",
    "watermelon",
    "juiceBox",
    "stick",
    "pinecone",
    "wateringCan",
    "drum",
    "web",
    "sunscreen",
] as const;
export type PropId = (typeof PROP_IDS)[number];

/** Predmet u ruci lika: crta se na mestu šake (ili između obe šake) */
export interface Held {
    prop: PropId;
    hand?: "l" | "r" | "both";
    s?: number;
    rot?: number;
    tone?: string;
    /** Pomak nadole (u jedinicama lika): kesa ili kofa visi iz šake umesto da stoji na njoj */
    dy?: number;
}

/**
 * Kuda lik gleda: tačka na slici (iste koordinate kao x i y predmeta). Bez pogleda lik gleda
 * pravo, kao i do sada. Uz pogled se oči crtaju sa beonjačom i zenicom okrenutom ka tački.
 */
export interface Gaze {
    x: number;
    y: number;
    /** Koliko se i glava okreće ka tački: 1 = jasno (podrazumevano), 0 = pomeraju se samo oči */
    head?: number;
    /** Tačkice od očiju do tačke — pomoć „prati pogled” */
    line?: boolean;
    /** Uz tačkice: poluprečnik blagog kruga oko tačke (0 = bez kruga) */
    ring?: number;
}

export interface FigureItem {
    /** "hero" = glavni lik zadatka (izgled i izraz lica zadaje igra) */
    fig: "hero" | LookId | AdultId;
    x: number;
    /** Gde su stopala (podrazumevano pod) */
    y?: number;
    s?: number;
    pose?: PoseId;
    face?: Face;
    /** Okrenut leđima: lice se ne vidi */
    back?: boolean;
    flip?: boolean;
    wear?: readonly WearId[];
    hold?: Held;
    /** Kuda lik gleda (podrazumevano pravo napred) */
    gaze?: Gaze;
    /** Nagib celog lika oko stopala, u stepenima (spušta se niz tobogan, ljulja se) */
    rot?: number;
}

export interface PropItem {
    prop: PropId;
    x: number;
    y: number;
    s?: number;
    flip?: boolean;
    rot?: number;
    /** Boja predmeta, kad je dozvoljena (balon, kapa, lopta…) */
    tone?: string;
}

/** Oblačić govora iznad lika (bez teksta: tri tačke, ili glasno) */
export interface BubbleItem {
    bubble: "talk" | "loud";
    x: number;
    y: number;
    /** Repić ide nadole levo (podrazumevano) ili desno */
    flip?: boolean;
}

/** Krug sa malom slikom: misao, san, sećanje, ono što je daleko */
export interface InsetItem {
    inset: SceneSpec;
    x: number;
    y: number;
    r: number;
    /** Tačkice od glave lika do kruga (misao) */
    from?: readonly [number, number];
}

export type SceneItem = FigureItem | PropItem | BubbleItem | InsetItem;

export interface SceneSpec {
    bg: BackgroundId;
    view?: ViewId;
    items: readonly SceneItem[];
    /** „fixed”: cela slika, bez približavanja (podrazumevano kamera prati likove i predmete) */
    camera?: "fixed";
    /** Najveće približavanje (podrazumevano MAX_ZOOM); male sličice izbora smeju bliže */
    maxZoom?: number;
    /** „square”: slika se prikazuje kao kvadrat (srednji deo), pa kamera bira kadar za kvadrat */
    frame?: "square";
}

/** Glavni lik, kako ga zadaje igra */
export interface HeroLook {
    look: LookId;
    /** Izraz lica glavnog lika (ima prednost nad izrazom iz opisa slike) */
    face?: Face;
    /** Lik je okrenut leđima: lice se ne vidi */
    back?: boolean;
}

// ── Kratki zapis za datoteke sa slikama ───────────────────────────────────────

type FigureOptions = Omit<FigureItem, "fig" | "x">;
type PropOptions = Omit<PropItem, "prop" | "x" | "y">;

/** Glavni lik na mestu x */
export const hero = (x: number, options: FigureOptions = {}): FigureItem => ({ fig: "hero", x, ...options });
/** Sporedni lik (dete ili odrasla osoba) */
export const who = (fig: LookId | AdultId, x: number, options: FigureOptions = {}): FigureItem => ({ fig, x, ...options });
/** Predmet; (x, y) je sredina donje ivice */
export const thing = (prop: PropId, x: number, y: number, options: PropOptions = {}): PropItem => ({ prop, x, y, ...options });
export const say = (x: number, y: number, flip = false): BubbleItem => ({ bubble: "talk", x, y, flip });
export const shout = (x: number, y: number, flip = false): BubbleItem => ({ bubble: "loud", x, y, flip });
export const think = (inset: SceneSpec, x: number, y: number, r: number, from?: readonly [number, number]): InsetItem => ({ inset, x, y, r, from });
export const scene = (bg: BackgroundId, items: readonly SceneItem[], view?: ViewId): SceneSpec => (view ? { bg, view, items } : { bg, items });

/** Lik u krevetu: krevet i lik koji leži sa glavom na jastuku */
export function inBed(fig: FigureItem["fig"], x: number, s = 1.2, options: FigureOptions = {}): SceneItem[] {
    return [thing("bed", x, 148, { s }), { fig, x: x - 29 * s, y: 148 - 18 * s, s, pose: "lie", ...options }];
}

export function isFigure(item: SceneItem): item is FigureItem {
    return "fig" in item;
}
export function isProp(item: SceneItem): item is PropItem {
    return "prop" in item;
}
export function isBubble(item: SceneItem): item is BubbleItem {
    return "bubble" in item;
}
export function isInset(item: SceneItem): item is InsetItem {
    return "inset" in item;
}

/** Svi predmeti i pozadine koje slika koristi (i u krugovima), za proveru u testu */
export function sceneParts(spec: SceneSpec): { backgrounds: BackgroundId[]; props: PropId[]; figures: string[] } {
    const backgrounds: BackgroundId[] = [spec.bg];
    const props: PropId[] = [];
    const figures: string[] = [];
    for (const item of spec.items) {
        if (isProp(item)) props.push(item.prop);
        if (isFigure(item)) {
            figures.push(item.fig);
            if (item.hold) props.push(item.hold.prop);
        }
        if (isInset(item)) {
            const inner = sceneParts(item.inset);
            backgrounds.push(...inner.backgrounds);
            props.push(...inner.props);
            figures.push(...inner.figures);
        }
    }
    return { backgrounds, props, figures };
}
