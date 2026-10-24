// Sadržaj igre „Šta jede?”: dete vidi životinju, čuje „Šta jede zeka?” i bira hranu.
//
// To je slušalačko reagovanje po funkciji, osobini i vrsti (LRFFC iz VB-MAPP-a): dete
// povezuje životinju sa hranom bez imenovanja odgovora u pitanju. Kasnije se pita obrnuto
// („Ko jede bambus?”), pa „Šta ne jede…?” (izbacivanje uljeza), „Ko još jede travu?” (dve
// životinje jedu istu hranu) i na kraju hranjenje: hrana se prevlači do prave životinje.
//
// Pravila sadržaja:
//  • `eats` su jednostavne i tačne činjenice (prva je glavna hrana, za lake nivoe).
//  • `maybe` je ono što životinja takođe jede ili bi se moglo sporiti (konj i šargarepa,
//    kokoška i crv, miš i skoro sve). Takva hrana se NIKAD ne nudi kao pogrešan odgovor za tu
//    životinju, niti se ta životinja nudi kao pogrešan odgovor za tu hranu — pogrešan odgovor
//    uvek mora biti jasno pogrešan.
//  • Bez mita „miš jede sir” (sira nema u igri) i „jež nosi jabuku” (jabuka je kod ježa `maybe`).
//  • Rečenice su doslovne: „Zeka jede šargarepu.” Imenica stoji u akuzativu (crv → crva,
//    jer je živo). Pas „glođe” kost; pčela jede „polen iz cveta”.
//  • Nema prikaza lova ni mesa: plen (muva, crv) je nacrtan bez lica.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

export const FOOD_IDS = ["carrot", "lettuce", "grass", "hay", "leaves", "banana", "apple", "bamboo", "nut", "flower", "honey", "seeds", "corn", "fish", "bone", "fly", "worm"] as const;
export type FoodId = (typeof FOOD_IDS)[number];

export const ANIMAL_IDS = [
    "rabbit",
    "cat",
    "dog",
    "cow",
    "monkey",
    "bird",
    "bee",
    "horse",
    "panda",
    "squirrel",
    "chicken",
    "frog",
    "mouse",
    "sheep",
    "bear",
    "goat",
    "hedgehog",
    "penguin",
    "giraffe",
    "turtle",
    "elephant",
] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

export interface Food {
    id: FoodId;
    /** Nominativ, velikim početnim slovom (natpis na kartici) */
    name: string;
    /** Akuzativ, malim slovom („šargarepu”, „crva”) */
    acc: string;
    /** Glagol u rečenici (podrazumevano „jede”; pas „glođe” kost) */
    verb?: string;
    /** Dopuna u rečenici umesto samog akuzativa („polen iz cveta”) */
    phrase?: string;
}

export interface Animal {
    id: AnimalId;
    /** Nominativ, velikim početnim slovom („Zeka”) */
    name: string;
    /** Šta jede (prva je glavna hrana) */
    eats: readonly FoodId[];
    /** Takođe jede ili je sporno — nikad pogrešan odgovor za ovu životinju */
    maybe: readonly FoodId[];
    /** 1 = najpoznatije (prvi nivoi), 2 = poznate, 3 = ređe */
    familiar: 1 | 2 | 3;
}

const f = (id: FoodId, name: string, acc: string, extra: Pick<Food, "verb" | "phrase"> = {}): Food => ({ id, name, acc, ...extra });

export const FOODS: readonly Food[] = [
    f("carrot", "Šargarepa", "šargarepu"),
    f("lettuce", "Salata", "salatu"),
    f("grass", "Trava", "travu"),
    f("hay", "Seno", "seno"),
    f("leaves", "Lišće", "lišće"),
    f("banana", "Banana", "bananu"),
    f("apple", "Jabuka", "jabuku"),
    f("bamboo", "Bambus", "bambus"),
    f("nut", "Orah", "orah"),
    f("flower", "Cvet", "cvet", { phrase: "polen iz cveta" }),
    f("honey", "Med", "med"),
    f("seeds", "Seme", "seme"),
    f("corn", "Kukuruz", "kukuruz"),
    f("fish", "Riba", "ribu"),
    f("bone", "Kost", "kost", { verb: "glođe" }),
    f("fly", "Muva", "muvu"),
    f("worm", "Crv", "crva"),
];

const a = (id: AnimalId, name: string, familiar: Animal["familiar"], eats: readonly FoodId[], maybe: readonly FoodId[]): Animal => ({ id, name, familiar, eats, maybe });

// Biljojedi jedu skoro sve biljno, pa su biljke kod njih `maybe`, a pogrešni odgovori su
// riba, kost, muva, crv i med. Svaštojedi (meda, majmun, miš) imaju samo nekoliko jasno
// pogrešnih odgovora, pa se uz njih nudi manje slika.
export const ANIMALS: readonly Animal[] = [
    // Najpoznatije
    a("rabbit", "Zeka", 1, ["carrot", "lettuce", "grass", "hay"], ["leaves", "apple", "flower", "corn", "seeds", "banana"]),
    a("cat", "Mačka", 1, ["fish"], ["grass", "fly", "worm", "bone"]),
    a("dog", "Pas", 1, ["bone"], ["fish", "carrot", "apple", "banana", "grass", "corn", "honey", "worm", "fly", "lettuce", "seeds"]),
    a("cow", "Krava", 1, ["grass", "hay"], ["corn", "leaves", "apple", "carrot", "lettuce", "seeds", "flower", "banana"]),
    a("monkey", "Majmun", 1, ["banana"], ["apple", "nut", "leaves", "seeds", "flower", "fly", "worm", "carrot", "lettuce", "corn", "honey", "bamboo", "grass"]),
    a("bird", "Ptica", 1, ["seeds"], ["worm", "fly", "corn", "nut", "apple", "flower", "banana", "lettuce", "grass", "fish", "honey", "leaves", "carrot"]),
    a("bee", "Pčela", 1, ["flower"], ["honey"]),
    // Poznate
    a("horse", "Konj", 2, ["hay", "grass", "apple", "carrot"], ["corn", "seeds", "lettuce", "leaves", "banana", "flower"]),
    a("panda", "Panda", 2, ["bamboo"], ["leaves", "apple", "carrot", "banana", "grass", "honey", "corn", "lettuce"]),
    a("squirrel", "Veverica", 2, ["nut", "seeds"], ["corn", "apple", "carrot", "banana", "flower", "leaves", "worm", "fly", "lettuce", "honey"]),
    a("chicken", "Kokoška", 2, ["corn", "seeds"], ["worm", "fly", "grass", "lettuce", "leaves", "apple", "carrot", "banana", "flower", "nut", "fish", "honey"]),
    a("frog", "Žaba", 2, ["fly", "worm"], ["fish"]),
    a("mouse", "Miš", 2, ["seeds", "corn"], ["nut", "apple", "carrot", "banana", "lettuce", "leaves", "grass", "hay", "worm", "fly", "honey", "flower", "bone"]),
    a("sheep", "Ovca", 2, ["grass", "hay"], ["leaves", "corn", "seeds", "apple", "carrot", "lettuce", "flower", "banana"]),
    a("bear", "Meda", 2, ["honey", "fish"], ["apple", "nut", "grass", "corn", "worm", "fly", "seeds", "flower", "banana", "carrot", "leaves", "lettuce", "bone"]),
    // Ređe
    a("goat", "Koza", 3, ["leaves", "grass", "hay"], ["apple", "carrot", "corn", "seeds", "lettuce", "flower", "banana", "bamboo", "nut"]),
    a("hedgehog", "Jež", 3, ["worm"], ["fly", "apple", "banana", "carrot", "fish", "bone", "honey", "corn", "seeds", "nut"]),
    a("penguin", "Pingvin", 3, ["fish"], []),
    a("giraffe", "Žirafa", 3, ["leaves"], ["grass", "hay", "flower", "apple", "carrot", "banana", "lettuce", "bamboo", "corn", "seeds"]),
    a("turtle", "Kornjača", 3, ["lettuce"], ["leaves", "grass", "flower", "apple", "banana", "carrot", "worm", "fly", "fish", "hay", "corn", "seeds", "bamboo"]),
    a("elephant", "Slon", 3, ["hay", "grass", "leaves", "banana"], ["apple", "carrot", "bamboo", "corn", "lettuce", "flower", "nut", "seeds", "honey"]),
];

export function getFood(id: unknown): Food | undefined {
    return FOODS.find((food) => food.id === id);
}

export function getAnimal(id: unknown): Animal | undefined {
    return ANIMALS.find((animal) => animal.id === id);
}

/** Jede li životinja ovu hranu (tačna činjenica iz `eats`) */
export function eats(animal: Animal, food: FoodId): boolean {
    return animal.eats.includes(food);
}

/** Da li je ova hrana JASNO pogrešan odgovor za životinju (nije ni u `eats` ni u `maybe`) */
export function clearlyNot(animal: Animal, food: FoodId): boolean {
    return !animal.eats.includes(food) && !animal.maybe.includes(food);
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

const lower = (text: string) => text.toLocaleLowerCase("sr");
const verbOf = (food: Food) => food.verb ?? "jede";
const objectOf = (food: Food) => food.phrase ?? food.acc;

/** „Zeka jede šargarepu.” / „Pas glođe kost.” */
export function eatsSentence(animal: Animal, food: Food): string {
    return `${animal.name} ${verbOf(food)} ${objectOf(food)}.`;
}

/** „Zeka ne jede kost.” */
export function notSentence(animal: Animal, food: Food): string {
    return `${animal.name} ne ${verbOf(food)} ${objectOf(food)}.`;
}

/** „Šta jede zeka?” */
export function whatQuestion(animal: Animal): string {
    return `Šta jede ${lower(animal.name)}?`;
}

/** „Šta ne jede krava?” */
export function notQuestion(animal: Animal): string {
    return `Šta ne jede ${lower(animal.name)}?`;
}

/** „Ko jede bambus?” / „Ko glođe kost?” */
export function whoQuestion(food: Food): string {
    return `Ko ${verbOf(food)} ${objectOf(food)}?`;
}

/** „Ko još jede travu?” */
export function alsoQuestion(food: Food): string {
    return `Ko još ${verbOf(food)} ${objectOf(food)}?`;
}

export const FEED_QUESTION = "Daj svakoj životinji njenu hranu.";

// ── Zadaci ────────────────────────────────────────────────────────────────────

export type RoundKind = "what" | "who" | "not" | "also" | "feed";

export interface FeedPair {
    animal: AnimalId;
    food: FoodId;
}

/**
 * Jedan zadatak. `animal` je životinja na velikoj slici (u „who” i „feed” je prazno), `food`
 * hrana o kojoj se pita („who”, „also”), `answer` tačan izbor, `choices` slike na ekranu redom.
 * U hranjenju (`feed`) su `pairs` životinje sa svojom hranom, a `choices` hrana u korpi redom.
 */
export interface FoodRound {
    kind: RoundKind;
    animal: AnimalId | "";
    food: FoodId | "";
    answer: string;
    choices: string[];
    pairs: FeedPair[];
}

/** Zadatak u obliku u kome stiže i sa monitora (obični stringovi) */
interface RoundRef {
    kind: RoundKind;
    animal: string;
    food: string;
    answer: string;
}

/** Pitanje koje glas postavlja i koje piše na ekranu */
export function roundQuestion(round: Omit<RoundRef, "answer">): string {
    const animal = getAnimal(round.animal);
    const food = getFood(round.food);
    if (round.kind === "feed") return FEED_QUESTION;
    if (round.kind === "who") return food ? whoQuestion(food) : "";
    if (round.kind === "also") return animal && food ? `${eatsSentence(animal, food)} ${alsoQuestion(food)}` : "";
    if (round.kind === "not") return animal ? notQuestion(animal) : "";
    return animal ? whatQuestion(animal) : "";
}

/** Životinja i hrana koje se vide na slici posle tačnog odgovora (ko šta jede) */
export function solvedPair(round: RoundRef): FeedPair | null {
    const animal = getAnimal(round.kind === "who" || round.kind === "also" ? round.answer : round.animal);
    if (!animal) return null;
    if (round.kind === "what") {
        const food = getFood(round.answer);
        return food ? { animal: animal.id, food: food.id } : null;
    }
    if (round.kind === "not") return { animal: animal.id, food: animal.eats[0] };
    const food = getFood(round.food);
    return food ? { animal: animal.id, food: food.id } : null;
}

/** Rečenica posle tačnog odgovora („Zeka jede šargarepu.”) */
export function answerSentence(round: RoundRef): string {
    if (round.kind === "not") {
        const animal = getAnimal(round.animal);
        const odd = getFood(round.answer);
        const main = animal && getFood(animal.eats[0]);
        return animal && odd && main ? `${notSentence(animal, odd)} ${eatsSentence(animal, main)}` : "";
    }
    const pair = solvedPair(round);
    const animal = pair && getAnimal(pair.animal);
    const food = pair && getFood(pair.food);
    return animal && food ? eatsSentence(animal, food) : "";
}

/** Rečenica posle pogrešnog izbora — uvek tačna činjenica („Mačka ne jede bambus.”) */
export function wrongSentence(round: Omit<RoundRef, "answer">, picked: string): string {
    if (round.kind === "who" || round.kind === "also") {
        const animal = getAnimal(picked);
        const food = getFood(round.food);
        return animal && food ? notSentence(animal, food) : "";
    }
    const animal = getAnimal(round.animal);
    const food = getFood(picked);
    if (!animal || !food) return "";
    return round.kind === "not" ? eatsSentence(animal, food) : notSentence(animal, food);
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelRule {
    first: number;
    last: number;
    /** Vrste zadataka, smenjuju se redom */
    kinds: readonly RoundKind[];
    /** Najmanje poznate životinje koje učestvuju (1 = samo najpoznatije) */
    familiar: 1 | 2 | 3;
    /** Broj slika po vrsti zadatka (u hranjenju: broj životinja) */
    choices: Partial<Record<RoundKind, number>>;
    rounds: number;
    /** Samo glavna hrana životinje (lako: „zeka – šargarepa”, ne „zeka – seno”) */
    mainOnly: boolean;
    /** Podrška se povlači: tačan odgovor zasvetli već posle prve greške i posle čekanja */
    earlyHint: boolean;
}

const RULES: readonly LevelRule[] = [
    // Lako: dve slike, najpoznatije životinje i njihova glavna hrana
    { first: 1, last: 2, kinds: ["what"], familiar: 1, choices: { what: 2 }, rounds: 5, mainOnly: true, earlyHint: true },
    { first: 3, last: 3, kinds: ["what"], familiar: 2, choices: { what: 2 }, rounds: 5, mainOnly: true, earlyHint: true },
    { first: 4, last: 5, kinds: ["what"], familiar: 2, choices: { what: 2 }, rounds: 6, mainOnly: true, earlyHint: true },
    // Srednje: tri slike, pa obrnuto pitanje („Ko jede bambus?”), pa ređe životinje
    { first: 6, last: 6, kinds: ["what"], familiar: 2, choices: { what: 3 }, rounds: 6, mainOnly: true, earlyHint: false },
    { first: 7, last: 7, kinds: ["who"], familiar: 2, choices: { who: 3 }, rounds: 6, mainOnly: true, earlyHint: false },
    { first: 8, last: 8, kinds: ["what", "who"], familiar: 3, choices: { what: 3, who: 3 }, rounds: 6, mainOnly: true, earlyHint: false },
    { first: 9, last: 10, kinds: ["who", "what"], familiar: 3, choices: { what: 3, who: 3 }, rounds: 7, mainOnly: false, earlyHint: false },
    // Teško: „Šta ne jede?”, „Ko još jede?”, četiri slike i hranjenje
    { first: 11, last: 11, kinds: ["not", "what"], familiar: 3, choices: { not: 3, what: 4 }, rounds: 7, mainOnly: false, earlyHint: false },
    { first: 12, last: 12, kinds: ["also", "who"], familiar: 3, choices: { also: 3, who: 4 }, rounds: 7, mainOnly: false, earlyHint: false },
    { first: 13, last: 13, kinds: ["feed", "not", "also"], familiar: 3, choices: { feed: 2, not: 3, also: 3 }, rounds: 8, mainOnly: false, earlyHint: false },
    { first: 14, last: 14, kinds: ["feed", "what", "who", "not"], familiar: 3, choices: { feed: 3, what: 4, who: 4, not: 3 }, rounds: 8, mainOnly: false, earlyHint: false },
    { first: 15, last: 15, kinds: ["what", "feed", "who", "also", "not"], familiar: 3, choices: { what: 4, who: 4, not: 4, also: 4, feed: 3 }, rounds: 8, mainOnly: false, earlyHint: false },
];

export const FOOD_MAX_LEVEL = 15;

export function foodRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), FOOD_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

interface BuildOptions {
    maxChoices: number;
    maxRounds: number;
    random?: () => number;
}

/**
 * Zadaci jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random, testovi stalan niz).
 * `maxChoices` i `maxRounds` dolaze iz podešavanja uzrasta. Vrste zadataka se smenjuju; isto
 * pitanje se u nivou ne ponavlja, a ista životinja ne dolazi dvaput zaredom.
 */
export function buildFoodLevel(level: number, { maxChoices, maxRounds, random = Math.random }: BuildOptions): FoodRound[] {
    const rule = foodRule(level);
    const roundCount = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const limit = Math.max(2, Number.isFinite(maxChoices) ? maxChoices : 4);
    const pick = <T,>(list: readonly T[]): T | undefined => list[Math.floor(random() * list.length)];
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    const pool = ANIMALS.filter((animal) => animal.familiar <= rule.familiar);
    const foodsOf = (animal: Animal) => (rule.mainOnly ? animal.eats.slice(0, 1) : animal.eats);
    const used = new Set<string>();
    const rounds: FoodRound[] = [];
    let lastAnimals: string[] = [];

    const make = (kind: RoundKind): FoodRound | null => {
        const count = Math.max(2, Math.min(rule.choices[kind] ?? 2, limit));
        const fresh = (animal: Animal) => !lastAnimals.includes(animal.id);

        if (kind === "what") {
            const options = shuffle(pool.filter(fresh)).flatMap((animal) => foodsOf(animal).map((food) => ({ animal, food })));
            for (const { animal, food } of options) {
                const key = `what:${animal.id}`;
                const wrong = FOODS.filter((other) => clearlyNot(animal, other.id));
                if (used.has(key) || wrong.length < count - 1) continue;
                used.add(key);
                return { kind, animal: animal.id, food: "", answer: food, choices: shuffle([food, ...shuffle(wrong).slice(0, count - 1).map((other) => other.id)]), pairs: [] };
            }
            return null;
        }

        if (kind === "who") {
            const options = shuffle(pool.filter(fresh)).flatMap((animal) => foodsOf(animal).map((food) => ({ animal, food })));
            for (const { animal, food } of options) {
                const key = `who:${food}`;
                const wrong = pool.filter((other) => other.id !== animal.id && clearlyNot(other, food));
                if (used.has(key) || wrong.length < count - 1) continue;
                used.add(key);
                return { kind, animal: "", food, answer: animal.id, choices: shuffle([animal.id, ...shuffle(wrong).slice(0, count - 1).map((other) => other.id)]) as string[], pairs: [] };
            }
            return null;
        }

        if (kind === "not") {
            for (const animal of shuffle(pool.filter(fresh))) {
                const key = `not:${animal.id}`;
                const size = Math.min(count, animal.eats.length + 1);
                const wrong = FOODS.filter((other) => clearlyNot(animal, other.id));
                if (used.has(key) || size < Math.min(count, 3) || wrong.length === 0) continue;
                const odd = pick(wrong)!;
                used.add(key);
                return { kind, animal: animal.id, food: "", answer: odd.id, choices: shuffle([odd.id, ...shuffle(animal.eats).slice(0, size - 1)]), pairs: [] };
            }
            return null;
        }

        if (kind === "also") {
            for (const shown of shuffle(pool.filter(fresh))) {
                for (const food of shuffle(shown.eats)) {
                    const key = `also:${food}`;
                    const others = pool.filter((other) => other.id !== shown.id && eats(other, food));
                    const wrong = pool.filter((other) => other.id !== shown.id && clearlyNot(other, food));
                    if (used.has(key) || others.length === 0 || wrong.length < count - 1) continue;
                    const answer = pick(others)!;
                    used.add(key);
                    return { kind, animal: shown.id, food, answer: answer.id, choices: shuffle([answer.id, ...shuffle(wrong).slice(0, count - 1).map((other) => other.id)]), pairs: [] };
                }
            }
            return null;
        }

        // Hranjenje: svaka hrana pripada tačno jednoj životinji sa ekrana
        for (let attempt = 0; attempt < 40; attempt += 1) {
            const chosen: FeedPair[] = [];
            for (const animal of shuffle(pool)) {
                if (chosen.length >= count) break;
                const food = animal.eats[0];
                const clash = chosen.some((pair) => {
                    const other = getAnimal(pair.animal)!;
                    return pair.food === food || !clearlyNot(other, food) || !clearlyNot(animal, pair.food);
                });
                if (!clash) chosen.push({ animal: animal.id, food });
            }
            const key = `feed:${chosen.map((pair) => pair.animal).sort().join(",")}`;
            if (chosen.length < count || used.has(key)) continue;
            used.add(key);
            const pairs = shuffle(chosen);
            return { kind, animal: "", food: "", answer: "", choices: shuffle(pairs.map((pair) => pair.food)), pairs };
        }
        return null;
    };

    for (let i = 0; rounds.length < roundCount && i < roundCount * 4; i += 1) {
        const kind = rule.kinds[rounds.length % rule.kinds.length];
        const round = make(kind) ?? make("what");
        if (!round) {
            // Svaka životinja je već bila: dozvoljava se ponavljanje (samo kod vrlo dugih nivoa)
            lastAnimals = [];
            used.clear();
            continue;
        }
        rounds.push(round);
        lastAnimals = roundAnimals(round);
    }
    return rounds;
}

/** Životinje koje se vide u zadatku (velika slika, izbori, hranjenje) */
export function roundAnimals(round: FoodRound): string[] {
    if (round.kind === "feed") return round.pairs.map((pair) => pair.animal);
    if (round.kind === "who") return [round.answer];
    if (round.kind === "also") return [round.animal, round.answer];
    return [round.animal];
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface FoodView extends BaseView {
    kind: RoundKind;
    /** Životinja na velikoj slici */
    animal: string;
    /** Hrana o kojoj se pita */
    food: string;
    /** Tačan izbor (u hranjenju prazno) */
    answer: string;
    /** Slike na ekranu redom (u hranjenju: hrana u korpi) */
    choices: string[];
    /** Hranjenje: životinje i njihova hrana */
    pairs: FeedPair[];
    /** Hranjenje: hrana koja je već data */
    fed: string[];
    /** Hranjenje: izabrana hrana (dodir, pa dodir na životinju) */
    selected: string | null;
    /** Pogrešno probane slike u ovom zadatku (u hranjenju: „hrana>životinja”) */
    wrong: string[];
    /** Poslednji pogrešan izbor dok traje povratna poruka */
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
}

export function emptyFoodView(totalRounds: number): FoodView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "what",
        animal: "",
        food: "",
        answer: "",
        choices: [],
        pairs: [],
        fed: [],
        selected: null,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

/** Polja zadatka u stanju igre */
export function roundView(round: FoodRound): Pick<FoodView, "kind" | "animal" | "food" | "answer" | "choices" | "pairs"> {
    return { kind: round.kind, animal: round.animal, food: round.food, answer: round.answer, choices: [...round.choices], pairs: round.pairs.map((pair) => ({ ...pair })) };
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen. Prvi zadatak prvog nivoa pokazuje ruka (pokazni, ne ocenjuje se);
 * „correct” = iz prvog pokušaja i bez pomoći, „prompted” = uz pomoć (osim pokaznog).
 * U hranjenju je zadatak „iz prvog pokušaja” kad nijedna hrana nije data pogrešnoj životinji.
 */
export function solveFoodView(current: FoodView, level: number, solved: Partial<FoodView> = {}): { next: FoodView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
    const next: FoodView = {
        ...current,
        ...solved,
        feedback: "correct",
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

/** Rezultat nivoa: total = zadaci bez pokaznog; correct = iz prvog pokušaja; prompted = uz pomoć */
export function foodResult(final: FoodView, level: number, durationSec: number): GameResult {
    return {
        score: final.score,
        durationSec,
        correct: final.correctCount,
        total: Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1),
        prompted: final.promptedCount,
    };
}

const KINDS: readonly RoundKind[] = ["what", "who", "not", "also", "feed"];

/** Da li je slika poznata za ovu vrstu izbora (hrana ili životinja) */
function isChoice(kind: RoundKind, id: unknown): id is string {
    return kind === "who" || kind === "also" ? getAnimal(id) !== undefined : getFood(id) !== undefined;
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeFoodMonitor(state: Partial<FoodView> | null | undefined): FoodView {
    const base = emptyFoodView(1);
    if (!state) return base;
    const kind = KINDS.includes(state.kind as RoundKind) ? (state.kind as RoundKind) : "what";
    const choices = Array.isArray(state.choices) ? Array.from(new Set(state.choices.filter((id) => isChoice(kind, id)))) : [];
    const pairs = Array.isArray(state.pairs)
        ? state.pairs.filter((pair): pair is FeedPair => typeof pair === "object" && pair !== null && getAnimal(pair.animal) !== undefined && getFood(pair.food) !== undefined && choices.includes(pair.food))
        : [];
    const animal = getAnimal(state.animal)?.id ?? "";
    const food = getFood(state.food)?.id ?? "";
    const valid =
        kind === "feed"
            ? pairs.length >= 2 && pairs.length === choices.length
            : choices.includes(String(state.answer)) && (kind === "who" ? food !== "" : animal !== "") && (kind !== "also" || food !== "");
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const answer = valid && kind !== "feed" ? String(state.answer) : "";
    const pick = (id: unknown) => (valid && typeof id === "string" && choices.includes(id) ? id : null);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind,
        animal: valid ? animal : "",
        food: valid ? food : "",
        answer,
        choices: valid ? choices : [],
        pairs: valid ? pairs : [],
        fed: valid && kind === "feed" && Array.isArray(state.fed) ? Array.from(new Set(state.fed.filter((id) => typeof id === "string" && choices.includes(id)))) : [],
        selected: kind === "feed" ? pick(state.selected) : null,
        wrong: valid && Array.isArray(state.wrong) ? state.wrong.filter((id): id is string => typeof id === "string" && (kind === "feed" ? /^[a-z]+>[a-z]+$/.test(id) : choices.includes(id) && id !== answer)) : [],
        picked: kind === "feed" ? null : pick(state.picked),
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
    };
}
