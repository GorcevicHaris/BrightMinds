// Pogodi oblik — oblici (nazivi, boje, slični oblici), nivoi i plan zadataka (bez Reacta, za testove).
// Crteži oblika su u ShapeMatchingGame.tsx.
//
// Podrška se povlači kroz nivoe:
//   1–3   uzorak i tačan oblik su potpuno isti (ista boja i veličina), ometači jasno različiti,
//         a tačan oblik blago zasvetli već posle prve greške;
//   4–5   veličine se razlikuju, pa i boja prestaje da pomaže (svi oblici u istoj boji);
//   6–9   senke: na prvom nivou sa senkom uzorak se prvo pokaže u boji, pa „potamni” u senku;
//         sve sličniji ometači i više ponuđenih oblika;
//   10    obrisi (opet uz kratak pregled u boji); 11–15 tačan oblik u drugoj boji (uz mamac u boji
//         uzorka), okrenuti oblici, senke i obrisi bez pregleda.

export type ColorId = "red" | "orange" | "yellow" | "green" | "teal" | "sky" | "blue" | "purple" | "pink" | "brown" | "gray";

export const COLOR_IDS: ColorId[] = ["red", "orange", "yellow", "green", "teal", "sky", "blue", "purple", "pink", "brown", "gray"];

export type ShapeId =
    | "circle"
    | "square"
    | "triangle"
    | "heart"
    | "star"
    | "sun"
    | "house"
    | "apple"
    | "car"
    | "fish"
    | "tree"
    | "flower"
    | "balloon"
    | "moon"
    | "umbrella"
    | "mushroom"
    | "icecream"
    | "rocket"
    | "cloud"
    | "butterfly"
    | "egg"
    | "key"
    | "cat"
    | "diamond"
    | "lightning";

export interface ShapeInfo {
    name: string;
    /** Akuzativ za rečenice "Pronađi …" i "Tražimo …" (zadat za svaki oblik posebno, ne izvodi se iz imena) */
    acc: string;
    color: ColorId;
    /** Oblici slične siluete — koriste se kao teži ometači */
    similar: ShapeId[];
}

/** Redosled je redosled uvođenja: prvo osnovni i međusobno najrazličitiji oblici. */
export const SHAPE_INFO: Record<ShapeId, ShapeInfo> = {
    circle: { name: "Krug", acc: "krug", color: "blue", similar: ["egg", "balloon", "sun", "apple"] },
    square: { name: "Kvadrat", acc: "kvadrat", color: "red", similar: ["house", "diamond", "car"] },
    triangle: { name: "Trougao", acc: "trougao", color: "yellow", similar: ["tree", "diamond", "icecream"] },
    heart: { name: "Srce", acc: "srce", color: "red", similar: ["apple", "balloon", "cat", "diamond"] },
    star: { name: "Zvezda", acc: "zvezdu", color: "purple", similar: ["sun", "flower", "diamond", "lightning"] },
    sun: { name: "Sunce", acc: "sunce", color: "yellow", similar: ["flower", "star", "circle"] },
    house: { name: "Kućica", acc: "kućicu", color: "orange", similar: ["square", "tree", "car"] },
    apple: { name: "Jabuka", acc: "jabuku", color: "red", similar: ["heart", "balloon", "circle", "cat"] },
    car: { name: "Auto", acc: "auto", color: "blue", similar: ["house", "fish", "cloud"] },
    fish: { name: "Riba", acc: "ribu", color: "teal", similar: ["car", "cloud", "butterfly", "key"] },
    tree: { name: "Drvo", acc: "drvo", color: "green", similar: ["house", "triangle", "rocket", "mushroom"] },
    flower: { name: "Cvet", acc: "cvet", color: "pink", similar: ["sun", "star", "butterfly"] },
    balloon: { name: "Balon", acc: "balon", color: "pink", similar: ["apple", "egg", "heart", "icecream"] },
    moon: { name: "Mesec", acc: "mesec", color: "yellow", similar: ["balloon", "egg", "circle"] },
    umbrella: { name: "Kišobran", acc: "kišobran", color: "purple", similar: ["mushroom", "cloud", "house"] },
    mushroom: { name: "Pečurka", acc: "pečurku", color: "red", similar: ["umbrella", "tree", "icecream"] },
    icecream: { name: "Sladoled", acc: "sladoled", color: "pink", similar: ["balloon", "mushroom", "triangle"] },
    rocket: { name: "Raketa", acc: "raketu", color: "sky", similar: ["tree", "lightning", "icecream"] },
    cloud: { name: "Oblak", acc: "oblak", color: "gray", similar: ["car", "fish", "flower", "umbrella"] },
    butterfly: { name: "Leptir", acc: "leptira", color: "purple", similar: ["flower", "fish", "heart"] },
    egg: { name: "Jaje", acc: "jaje", color: "brown", similar: ["circle", "balloon", "moon"] },
    key: { name: "Ključ", acc: "ključ", color: "orange", similar: ["lightning", "fish", "car"] },
    cat: { name: "Mačka", acc: "mačku", color: "brown", similar: ["heart", "apple", "house"] },
    diamond: { name: "Dijamant", acc: "dijamant", color: "teal", similar: ["star", "lightning", "heart", "square"] },
    lightning: { name: "Munja", acc: "munju", color: "orange", similar: ["diamond", "star", "tree", "key"] },
};

export const POOL = Object.keys(SHAPE_INFO) as ShapeId[];

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export type Look = "color" | "shadow" | "outline";
/** natural: svaki oblik u svojoj boji · uniform: svi u istoj boji · mixed: tačan oblik je u drugoj boji od uzorka */
export type Coloring = "natural" | "uniform" | "mixed";

export interface ShapeLevel {
    rounds: number;
    options: 2 | 3 | 4 | 6;
    /** Koliko oblika iz POOL-a učestvuje */
    pool: number;
    look: Look;
    coloring: Coloring;
    /** Koliko ometača se bira među sličnim oblicima */
    similar: number;
    rotate: boolean;
    /** Ponuđeni oblici su različitih veličina (na prvim nivoima tačan oblik je iste veličine kao uzorak) */
    sizes: boolean;
    /** Uzorak se na početku zadatka nakratko pokaže u boji, pa pređe u senku ili obris */
    preview: boolean;
    /** Tačan oblik zasvetli već posle prve greške (osim kad je roditelj isključio pomoć) */
    earlyHint: boolean;
}

const lv = (rounds: number, options: ShapeLevel["options"], pool: number, look: Look, coloring: Coloring, similar: number, extra: Partial<ShapeLevel> = {}): ShapeLevel => ({
    rounds,
    options,
    pool,
    look,
    coloring,
    similar,
    rotate: false,
    sizes: true,
    preview: false,
    earlyHint: false,
    ...extra,
});

export const SHAPE_LEVELS: ShapeLevel[] = [
    // Lako: uzorak i tačan oblik su isti, raste broj ponuđenih i oblika
    lv(5, 2, 5, "color", "natural", 0, { sizes: false, earlyHint: true }),
    lv(5, 3, 7, "color", "natural", 0, { sizes: false, earlyHint: true }),
    lv(6, 3, 10, "color", "natural", 1, { sizes: false, earlyHint: true }),
    lv(6, 4, 13, "color", "natural", 1, { earlyHint: true }),
    lv(6, 4, 16, "color", "uniform", 1, { earlyHint: true }),
    // Srednje: senke i obrisi, boja više ne pomaže, sličniji ometači
    lv(6, 4, 19, "shadow", "natural", 1, { preview: true }),
    lv(7, 4, 22, "shadow", "uniform", 2),
    lv(7, 6, 25, "shadow", "natural", 2),
    lv(7, 6, 25, "shadow", "uniform", 3),
    lv(7, 6, 25, "outline", "uniform", 3, { preview: true }),
    // Teško: isti oblik u drugoj boji (uz mamac u boji uzorka) i okrenuti oblici.
    // Svaki nivo menja nešto što se vidi i kad je broj ponuđenih oblika ograničen podešavanjima.
    lv(7, 4, 25, "color", "mixed", 2),
    lv(8, 6, 25, "color", "mixed", 3, { rotate: true }),
    lv(8, 6, 25, "shadow", "uniform", 3, { rotate: true }),
    lv(8, 6, 25, "outline", "uniform", 3, { rotate: true }),
    lv(8, 6, 25, "outline", "mixed", 4, { rotate: true }),
];

export function shapeLevelIndex(level: number): number {
    return Math.min(Math.max(Math.round(level) || 1, 1), SHAPE_LEVELS.length) - 1;
}

// ── Plan zadataka ─────────────────────────────────────────────────────────────

export interface ShapeOption {
    shape: ShapeId;
    color: ColorId;
    rot: number;
    /** Veličina primerka u pločici (1 = cela pločica) */
    scale: number;
}

export interface ShapeRound {
    target: ShapeId;
    targetColor: ColorId;
    options: ShapeOption[];
}

/** Granice nivoa posle primene podešavanja deteta (uzrast i izbor roditelja). */
export interface ShapeLimits {
    rounds: number;
    options: number;
    /** Prvi zadatak nudi samo dva oblika */
    warmUp: boolean;
}

const TURNS = [-135, -90, -45, 45, 90, 135, 180];
/** Veličine primerka u pločici: isti oblik nije uvek iste veličine, pa se traži oblik, a ne istovetna sličica */
const SIZES = [1, 0.86, 0.72];
/** Mlađa deca svaki laki nivo počinju zadatkom sa samo dva ponuđena oblika */
const WARM_UP_OPTIONS = 2;

function shuffled<T>(items: readonly T[], random: () => number): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function pickOne<T>(items: readonly T[], random: () => number): T {
    return items[Math.floor(random() * items.length)];
}

/** Svi zadaci nivoa unapred. Traženi oblici su različiti, pa se isti nikad ne ponavlja dva puta zaredom. */
export function buildShapePlan(cfg: ShapeLevel, limits: ShapeLimits, random: () => number = Math.random): ShapeRound[] {
    const pool = POOL.slice(0, cfg.pool);
    return shuffled(pool, random)
        .slice(0, limits.rounds)
        .map((target, round) => {
            const count = limits.warmUp && round === 0 ? Math.min(limits.options, WARM_UP_OPTIONS) : limits.options;
            const lookAlikes = SHAPE_INFO[target].similar.filter((shape) => pool.includes(shape));
            const similar = shuffled(lookAlikes, random).slice(0, cfg.similar);
            let others = shuffled(
                pool.filter((shape) => shape !== target && !similar.includes(shape)),
                random
            );
            // Dok se slični oblici još ne traže, ometači se jasno razlikuju: ni sličan oblik ni ista boja
            if (cfg.similar === 0 && cfg.coloring === "natural") {
                const distinct = others.filter((shape) => !lookAlikes.includes(shape) && SHAPE_INFO[shape].color !== SHAPE_INFO[target].color);
                if (distinct.length >= count - 1) others = distinct;
            }
            const distractors = [...similar, ...others].slice(0, count - 1);

            const shared = pickOne(COLOR_IDS, random);
            const targetColor = cfg.coloring === "uniform" ? shared : SHAPE_INFO[target].color;
            const spare = shuffled(
                COLOR_IDS.filter((color) => color !== targetColor),
                random
            );
            const sizes = shuffled(SIZES, random);

            const options = [target, ...distractors].map((shape, i): ShapeOption => {
                let color = SHAPE_INFO[shape].color;
                if (cfg.coloring === "uniform") color = shared;
                // Tačan oblik (i = 0) dobija drugu boju, a prvi ometač (i = 1) je mamac u boji uzorka
                if (cfg.coloring === "mixed") color = i === 1 ? targetColor : spare[i % spare.length];
                // Na prvim nivoima tačan oblik je iste veličine kao uzorak (potpuno isti); ometači mogu biti manji
                const scale = cfg.sizes ? sizes[i % sizes.length] : 1;
                return { shape, color, rot: cfg.rotate ? pickOne(TURNS, random) : 0, scale };
            });

            return { target, targetColor, options: shuffled(options, random) };
        });
}
