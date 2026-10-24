// Spoji parove — špilovi slika i nivoi (bez Reacta, da ih testovi i igra dele).
//
// Nivoi 1–10: parovi kartica. Raste broj parova, a podrška se povlači: na lakim nivoima kartice se
// na početku nakratko pokažu (zavirivanje), a par otvorene kartice zasvetli već posle prve greške
// pamćenja; kasnije zavirivanja nema, pomoć stiže prema podešavanju deteta, a slike su sve sličnije
// (isti oblik u drugoj boji, slične životinje, mešani špilovi).
// Nivoi 11–15: „Zapamti gde je šta bilo” — na polici stoje predmeti; kad dete samo kaže da je
// zapamtilo (dugme, bez vremena), predmeti se sklone, a dete ih vraća na svoja mesta. Od dva do pet
// predmeta, a praznih mesta je sve više.

import { ANIMAL_PICTURES, type AnimalId } from "@/lib/pictures";

// ── Slike ─────────────────────────────────────────────────────────────────────

export type ShapeKind = "circle" | "square" | "triangle" | "star" | "heart" | "moon" | "diamond" | "drop";

export interface MemoryCardArt {
    id: string;
    /** Naziv (i za glas: „To je lopta.”) */
    name: string;
    /** Fotografija ili crtež iz /public */
    src?: string;
    /** Oblik u boji (crta se u kodu) */
    shape?: { kind: ShapeKind; color: string };
}

const animal = (id: AnimalId): MemoryCardArt => ({ id, name: ANIMAL_PICTURES[id].name, src: ANIMAL_PICTURES[id].image });

/** Životinje: od onih koje se jasno razlikuju ka onima koje liče jedna na drugu (lav, tigar, mačka, puma) */
const ANIMALS: MemoryCardArt[] = (["dog", "cow", "pig", "bird", "zebra", "crocodile", "monkey", "rooster", "bear", "horse", "lion", "tiger", "cat", "puma"] as AnimalId[]).map(animal);

/** Igračke i stvari: od jasno različitih ka sličnim (telefon, tablet, laptop, kompjuter) */
const TOYS: MemoryCardArt[] = [
    { id: "ball", name: "Lopta", src: "/pins/items/ball.webp" },
    { id: "book", name: "Knjiga", src: "/pins/items/book.webp" },
    { id: "car", name: "Autić", src: "/pins/items/car.webp" },
    { id: "drums", name: "Bubanj", src: "/pins/items/drums.webp" },
    { id: "lego", name: "Kocke", src: "/pins/items/lego.webp" },
    { id: "spinner", name: "Spiner", src: "/pins/items/spinner.webp" },
    { id: "phone", name: "Telefon", src: "/pins/items/phone.webp" },
    { id: "tablet", name: "Tablet", src: "/pins/items/tablet.webp" },
    { id: "laptop", name: "Laptop", src: "/pins/items/laptop.webp" },
    { id: "computer", name: "Kompjuter", src: "/pins/items/computer.webp" },
];

const HEX = { red: "#EF4444", orange: "#F97316", yellow: "#FACC15", green: "#16A34A", blue: "#2563EB", purple: "#9333EA", pink: "#F472B6", sky: "#38BDF8" };

const shape = (kind: ShapeKind, color: keyof typeof HEX, name: string): MemoryCardArt => ({ id: `${kind}-${color}`, name, shape: { kind, color: HEX[color] } });

/** Oblici u boji: svaki oblik ima svoju boju — jasno različite kartice za najmlađe */
const SHAPES: MemoryCardArt[] = [
    shape("circle", "red", "Crveni krug"),
    shape("square", "blue", "Plavi kvadrat"),
    shape("triangle", "yellow", "Žuti trougao"),
    shape("star", "purple", "Ljubičasta zvezda"),
    shape("heart", "pink", "Roze srce"),
    shape("moon", "orange", "Narandžasti mesec"),
    shape("diamond", "green", "Zeleni romb"),
    shape("drop", "sky", "Plava kap"),
];

/** Teže: isti oblik u dve boje i ista boja na dva oblika — pamti se i oblik i boja */
const SHAPES_HARD: MemoryCardArt[] = [
    shape("circle", "red", "Crveni krug"),
    shape("circle", "blue", "Plavi krug"),
    shape("square", "blue", "Plavi kvadrat"),
    shape("square", "red", "Crveni kvadrat"),
    shape("star", "yellow", "Žuta zvezda"),
    shape("star", "purple", "Ljubičasta zvezda"),
    shape("heart", "purple", "Ljubičasto srce"),
    shape("heart", "pink", "Roze srce"),
    shape("triangle", "yellow", "Žuti trougao"),
    shape("triangle", "green", "Zeleni trougao"),
];

export type DeckId = "animals" | "toys" | "shapes" | "shapesHard" | "mixed";

export const DECKS: Record<DeckId, MemoryCardArt[]> = {
    animals: ANIMALS,
    toys: TOYS,
    shapes: SHAPES,
    shapesHard: SHAPES_HARD,
    // Mešano: životinje i igračke naizmenično, slične slike na kraju
    mixed: ANIMALS.flatMap((item, i) => (TOYS[i] ? [item, TOYS[i]] : [item])),
};

export const ALL_CARDS: Record<string, MemoryCardArt> = Object.fromEntries(Object.values(DECKS).flatMap((deck) => deck.map((card) => [card.id, card])));

export function cardArt(id: string | undefined): MemoryCardArt | undefined {
    return id !== undefined && Object.hasOwn(ALL_CARDS, id) ? ALL_CARDS[id] : undefined;
}

/** Koliko slika sa početka špila ulazi u izbor za tablu sa `pairs` parova (male table: samo najrazličitije) */
export function poolSize(deck: readonly MemoryCardArt[], pairs: number): number {
    return Math.min(deck.length, Math.max(pairs + 3, 7));
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export interface PairsLevel {
    kind: "pairs";
    pairs: number;
    /** Sve kartice su na početku nakratko otkrivene (mlađoj deci uvek) */
    peek: boolean;
    deck: DeckId;
    /** Par otvorene kartice zasvetli već posle prve greške pamćenja (rani nivoi) */
    earlyHint: boolean;
}

export interface SceneLevel {
    kind: "scene";
    /** Predmeta na polici (pre ograničenja iz podešavanja deteta) */
    objects: number;
    /** Mesta na polici: kolone × redovi */
    cols: number;
    rows: number;
    /** Koliko polica (slika) ima nivo */
    scenes: number;
    deck: DeckId;
}

export type MemoryLevel = PairsLevel | SceneLevel;

const pairs = (count: number, peek: boolean, deck: DeckId, earlyHint = false): PairsLevel => ({ kind: "pairs", pairs: count, peek, deck, earlyHint });
const scene = (objects: number, cols: number, rows: number, scenes: number, deck: DeckId): SceneLevel => ({ kind: "scene", objects, cols, rows, scenes, deck });

export const MEMORY_LEVELS: MemoryLevel[] = [
    // Lako: male table, zavirivanje, pomoć posle prve greške
    pairs(2, true, "animals", true),
    pairs(3, true, "shapes", true),
    pairs(3, false, "animals", true),
    pairs(4, true, "toys", true),
    pairs(4, false, "shapes", true),
    // Srednje: veće table, slične slike
    pairs(5, true, "animals"),
    pairs(5, false, "toys"),
    pairs(6, true, "mixed"),
    pairs(6, false, "shapesHard"),
    pairs(8, false, "mixed"),
    // Teško: zapamti gde je šta bilo
    scene(2, 2, 2, 2, "toys"),
    scene(3, 3, 2, 2, "toys"),
    scene(4, 3, 2, 1, "mixed"),
    scene(4, 3, 3, 1, "mixed"),
    scene(5, 3, 3, 1, "mixed"),
];

export function memoryLevel(level: number): MemoryLevel {
    const safe = Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), MEMORY_LEVELS.length) : 1;
    return MEMORY_LEVELS[safe - 1];
}

/** Redni broj nivoa (od 0) među nivoima sa parovima */
export const PAIR_LEVELS: PairsLevel[] = MEMORY_LEVELS.filter((level): level is PairsLevel => level.kind === "pairs");

// ── Polica ────────────────────────────────────────────────────────────────────

export interface ShelfScene {
    /** Mesta na polici: id predmeta ili null (prazno mesto) */
    slots: (string | null)[];
    cols: number;
    rows: number;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Police za nivo „zapamti gde je šta bilo”. `maxObjects` dolazi iz podešavanja deteta (uzrast).
 * Predmeti na jednoj polici su različiti, a uvek ostaje bar dva prazna mesta više nego što je
 * predmeta u rukama — ni poslednji predmet nema samo jedno moguće mesto.
 */
export function buildShelves(level: SceneLevel, maxObjects: number, random: () => number = Math.random): ShelfScene[] {
    const size = level.cols * level.rows;
    const objects = Math.max(2, Math.min(level.objects, maxObjects, size - 2));
    const deck = DECKS[level.deck];
    // Jasno različiti predmeti: iz prvog dela špila
    const pool = deck.slice(0, Math.min(deck.length, objects + 5));
    const shelves: ShelfScene[] = [];
    let previous: string[] = [];
    for (let s = 0; s < level.scenes; s += 1) {
        // Druga polica ima druge predmete (koliko god je moguće)
        const fresh = pool.filter((card) => !previous.includes(card.id));
        const chosen = shuffled(fresh.length >= objects ? fresh : pool, random).slice(0, objects).map((card) => card.id);
        const places = shuffled(Array.from({ length: size }, (_, i) => i), random).slice(0, objects);
        const slots: (string | null)[] = Array.from({ length: size }, () => null);
        chosen.forEach((id, i) => {
            slots[places[i]] = id;
        });
        shelves.push({ slots, cols: level.cols, rows: level.rows });
        previous = chosen;
    }
    return shelves;
}
