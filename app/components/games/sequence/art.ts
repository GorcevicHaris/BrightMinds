// Opis slike jednog koraka u igri „Šta je prvo?” (bez React-a, da ga čitaju i testovi).
//
// Slika je krupan kadar radnje iz rečenice: „Obučem čarape.” — dete sedi i navlači čarapu;
// „Zalijem ga.” — kantica iznad saksije, voda curi. Likovi i predmeti su iz zajedničkog
// kompleta slika (scene/), a ono čega u kompletu nema (kantica, sapun, pasta za zube…)
// crta se ovde, u sequence/drawings.tsx. Slika je u istom okviru kao slike situacija
// (240 × 160), a svaki predmet se zadaje sredinom svoje donje ivice.

import type { AdultId, BackgroundId, Face, LookId, PoseId, PropId, ViewId, WearId } from "@/app/components/games/scene/types";

/** Crteži koji postoje samo u ovoj igri (sequence/drawings.tsx) */
export const DRAW_IDS = [
    "umbrella",
    "soap",
    "toothpaste",
    "brushPaste",
    "breadSlice",
    "breadButter",
    "knife",
    "sandwich",
    "seeds",
    "pot",
    "potFlower",
    "wateringCan",
    "pour",
    "eggCrack",
    "bowl",
    "batter",
    "panEgg",
    "panPancake",
    "juiceOpen",
    "bottleCap",
    "balloonSmall",
    "tableLamp",
    "tableLampOn",
    "pajamas",
    "sponge",
    "dishCloth",
    "plateDirty",
    "plateClean",
    "crosswalk",
    "trafficRed",
    "trafficGreen",
    "boots",
    "splash",
    "catFood",
    "catBowl",
    "catBowlFull",
    "bubbleWand",
    "bubbleBottle",
    "zipper",
    "bathtub",
    "bathtubEmpty",
    "tapWater",
    "snowBall",
    "cakeSlice",
    "ovenCake",
    "paperHouse",
    "paperHouseColor",
    "mailbox",
    "letter",
    "cerealBox",
    "cerealBowl",
    "list",
    "shovel",
    "hole",
    "mound",
    "tower",
    "house",
    "cakeCandles",
    "cakeSmoke",
    "sticker",
    "honeyJar",
    "puzzleDone",
    "coin",
    "fruitBag",
    "carrotNose",
    "juiceGlass",
    "tshirt",
    "jacket",
    "flower",
    "dough",
    "rollingPin",
    "pizzaSauce",
    "pizzaCheese",
    "ovenPizza",
    "pizzaSlice",
    "blow",
    "milkPour",
    "block",
    "basin",
    "tap",
    "hand",
    "hands",
    "bigStream",
    "talk",
    "boxClosed",
] as const;
export type DrawId = (typeof DRAW_IDS)[number];

/** Ko je na slici: „me” je dete koje igra (dečak ili devojčica, prema profilu) */
export type ArtWho = "me" | LookId | AdultId;

/** Predmet u ruci lika (iz kompleta ili iz ove igre) */
export interface ArtHeld {
    p?: PropId;
    d?: DrawId;
    hand?: "l" | "r" | "both";
    s?: number;
    rot?: number;
    tone?: string;
    /** Pomeraj od šake (u koordinatama lika) */
    dx?: number;
    dy?: number;
}

export interface ArtFigure {
    f: ArtWho;
    x: number;
    /** Gde su stopala (može i ispod slike: krupan kadar) */
    y: number;
    s?: number;
    pose?: PoseId;
    face?: Face;
    flip?: boolean;
    back?: boolean;
    wear?: readonly WearId[];
    hold?: ArtHeld;
    /** Tačka na slici u koju lik gleda */
    at?: readonly [number, number];
}

export interface ArtThing {
    /** Predmet iz kompleta */
    p?: PropId;
    /** Crtež iz ove igre */
    d?: DrawId;
    x: number;
    y: number;
    s?: number;
    flip?: boolean;
    rot?: number;
    tone?: string;
}

export type ArtItem = ArtFigure | ArtThing;

export interface StepArtSpec {
    bg: BackgroundId;
    view?: ViewId;
    items: readonly ArtItem[];
}

export function isArtFigure(item: ArtItem): item is ArtFigure {
    return "f" in item;
}

export function isDrawId(value: unknown): value is DrawId {
    return typeof value === "string" && (DRAW_IDS as readonly string[]).includes(value);
}

// ── Kratki zapis za data/sequences.ts ─────────────────────────────────────────

type FigureOptions = Omit<ArtFigure, "f" | "x" | "y">;
type ThingOptions = Omit<ArtThing, "p" | "d" | "x" | "y">;

/** Dete koje igra; podrazumevano krupno, od glave do pojasa */
export const me = (x: number, y: number, options: FigureOptions = {}): ArtFigure => ({ f: "me", x, y, s: 1.7, ...options });
/** Drugi lik (odrasli ili dete) */
export const who = (f: ArtWho, x: number, y: number, options: FigureOptions = {}): ArtFigure => ({ f, x, y, s: 1.5, ...options });
/** Predmet iz kompleta */
export const prop = (p: PropId, x: number, y: number, options: ThingOptions = {}): ArtThing => ({ p, x, y, ...options });
/** Crtež iz ove igre */
export const draw = (d: DrawId, x: number, y: number, options: ThingOptions = {}): ArtThing => ({ d, x, y, ...options });
/** Predmet u ruci */
export const holdP = (p: PropId, options: Omit<ArtHeld, "p" | "d"> = {}): ArtHeld => ({ p, ...options });
export const holdD = (d: DrawId, options: Omit<ArtHeld, "p" | "d"> = {}): ArtHeld => ({ d, ...options });
export const art = (bg: BackgroundId, items: readonly ArtItem[], view?: ViewId): StepArtSpec => (view ? { bg, view, items } : { bg, items });
