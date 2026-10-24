// Sadržaj igre „Brojimo”: dete broji predmete i bira broj, traži grupu sa traženim brojem
// predmeta i poredi dve grupe („Gde ima više?”).
//
// Redosled prati razvojni put ranog brojanja (Clements i Sarama; vodič IES „Teaching Math to
// Young Children”, preporuka 1): prvo male grupe od 1 do 3 koje se prepoznaju na prvi pogled,
// pa brojanje do 5 i raspored kao na kockici, pa do 10 (5 + još, „okvir od deset”), broj ↔ količina
// i poređenje, pa do 20 u dva okvira, jedan više / jedan manje i sabiranje sa predmetima.
// Sve je konkretno i vidljivo: predmeti su uvek na ekranu, nema treptanja ni žurbe.
//
// Na prvim nivoima učitelj pre odgovora broji zajedno sa detetom (model „brojimo zajedno”),
// pa se model povlači: nivoi 1–2 — predmeti zasvetle jedan po jedan dok glas broji, a poslednji
// zasvetli bez reči, pa dete samo kaže koliko ih je (načelo kardinalnosti: poslednji izgovoren
// broj je odgovor); nivoi 3–4 — predmeti zasvetle bez glasa, dete broji u sebi; dalje bez modela
// (brojanje zajedno ostaje samo kao pomoć posle greške ili dugog čekanja).
//
// Pravila pisanja:
//  • Svaka imenica ima tri oblika: uz 1 (jedna jabuka), uz 2–4 (dve jabuke) i uz 5 i više,
//    posle „Koliko ima…?” i „više / manje” (pet jabuka). `countPhrase` bira oblik i rod broja
//    (jedan / jedna / jedno, dva / dve) — test to proverava.
//  • Brojanje naglas je apstraktno: „Jedan. Dva. Tri.” (kao kad dete broji prstom).
//  • Sličice su emodži iz Unicode 11 ili starijeg (stariji tableti) — test to proverava.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

// ── Brojevi i imenice ─────────────────────────────────────────────────────────

export type NounGender = "m" | "f" | "n";

export interface CountNoun {
    id: string;
    emoji: string;
    gender: NounGender;
    /** Uz 1, 21…: jedna jabuka, jedan balon */
    one: string;
    /** Uz 2–4, 22–24…: dve jabuke, dva balona */
    few: string;
    /** Uz 0, 5–20…, posle „Koliko ima” i „više / manje”: pet jabuka, pet balona */
    many: string;
    /** Može sam da dođe i ode (za „Dolazi još jedan…” / „…odlazi”) */
    moves?: boolean;
}

const n = (id: string, emoji: string, gender: NounGender, one: string, few: string, many: string, moves = false): CountNoun => ({ id, emoji, gender, one, few, many, moves });

export const COUNT_NOUNS: readonly CountNoun[] = [
    // Voće i stvari (ne kreću se same)
    n("apple", "🍎", "f", "jabuka", "jabuke", "jabuka"),
    n("pear", "🍐", "f", "kruška", "kruške", "krušaka"),
    n("strawberry", "🍓", "f", "jagoda", "jagode", "jagoda"),
    n("banana", "🍌", "f", "banana", "banane", "banana"),
    n("star", "⭐", "f", "zvezda", "zvezde", "zvezda"),
    n("ball", "⚽", "f", "lopta", "lopte", "lopti"),
    n("flower", "🌼", "m", "cvet", "cveta", "cvetova"),
    n("cupcake", "🧁", "m", "kolač", "kolača", "kolača"),
    n("egg", "🥚", "n", "jaje", "jajeta", "jaja"),
    // Životinje i prevoz (mogu da dođu i odu)
    n("balloon", "🎈", "m", "balon", "balona", "balona", true),
    n("car", "🚗", "m", "auto", "auta", "auta", true),
    n("butterfly", "🦋", "m", "leptir", "leptira", "leptira", true),
    n("dog", "🐶", "m", "pas", "psa", "pasa", true),
    n("fish", "🐟", "f", "riba", "ribe", "riba", true),
    n("duck", "🦆", "f", "patka", "patke", "pataka", true),
    n("ladybug", "🐞", "f", "bubamara", "bubamare", "bubamara", true),
    n("turtle", "🐢", "f", "kornjača", "kornjače", "kornjača", true),
    // Još voća, povrća i stvari
    n("cherry", "🍒", "f", "trešnja", "trešnje", "trešanja"),
    n("carrot", "🥕", "f", "šargarepa", "šargarepe", "šargarepa"),
    n("lemon", "🍋", "m", "limun", "limuna", "limuna"),
    n("mushroom", "🍄", "f", "pečurka", "pečurke", "pečuraka"),
    n("gift", "🎁", "m", "poklon", "poklona", "poklona"),
    n("heart", "❤️", "n", "srce", "srca", "srca"),
    n("bell", "🔔", "n", "zvono", "zvona", "zvona"),
    // Još životinja (sa farme, iz bašte)
    n("chick", "🐤", "n", "pile", "pileta", "pilića", true),
    n("rabbit", "🐰", "m", "zec", "zeca", "zečeva", true),
    n("sheep", "🐑", "f", "ovca", "ovce", "ovaca", true),
    n("mouse", "🐭", "m", "miš", "miša", "miševa", true),
    n("snail", "🐌", "m", "puž", "puža", "puževa", true),
    n("frog", "🐸", "f", "žaba", "žabe", "žaba", true),
    n("bee", "🐝", "f", "pčela", "pčele", "pčela", true),
];

export function getCountNoun(id: unknown): CountNoun | undefined {
    return COUNT_NOUNS.find((noun) => noun.id === id);
}

const ONES = ["nula", "jedan", "dva", "tri", "četiri", "pet", "šest", "sedam", "osam", "devet"];
const TEENS = ["deset", "jedanaest", "dvanaest", "trinaest", "četrnaest", "petnaest", "šesnaest", "sedamnaest", "osamnaest", "devetnaest"];
const TENS = ["", "", "dvadeset", "trideset", "četrdeset", "pedeset", "šezdeset", "sedamdeset", "osamdeset", "devedeset"];

/** Koji oblik imenice ide uz broj: 1, 21… → „one”; 2–4, 22–24… → „few”; ostalo (i 11–14) → „many” */
export function nounForm(count: number): "one" | "few" | "many" {
    const last = count % 10;
    const lastTwo = count % 100;
    if (last === 1 && lastTwo !== 11) return "one";
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "few";
    return "many";
}

/**
 * Broj rečima, 0–99. Rod menja samo 1 i 2 (i složene sa njima):
 * numberWord(1, "f") → „jedna”, numberWord(2, "f") → „dve”, numberWord(1, "n") → „jedno”.
 * Bez roda (brojanje naglas, „Pet je više nego tri.”) je muški oblik: „jedan”, „dva”.
 */
export function numberWord(count: number, gender: NounGender = "m"): string {
    const value = Math.min(Math.max(Math.round(count), 0), 99);
    if (value >= 10 && value < 20) return TEENS[value - 10];
    const tens = Math.floor(value / 10);
    const last = value % 10;
    let unit = ONES[last];
    if (last === 1) unit = gender === "f" ? "jedna" : gender === "n" ? "jedno" : "jedan";
    if (last === 2) unit = gender === "f" ? "dve" : "dva";
    if (tens === 0) return unit;
    return last === 0 ? TENS[tens] : `${TENS[tens]} ${unit}`;
}

/** „tri jabuke”, „jedan balon”, „pet pasa”, „dva jajeta” */
export function countPhrase(count: number, noun: CountNoun): string {
    return `${numberWord(count, noun.gender)} ${noun[nounForm(count)]}`;
}

function capitalize(text: string): string {
    return text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);
}

/** Glagol uz broj u „Gde je / su …?”: jedna jabuka je, dve jabuke su, pet jabuka je */
function isAre(count: number): "je" | "su" {
    return nounForm(count) === "few" ? "su" : "je";
}

// ── Zadaci ────────────────────────────────────────────────────────────────────

/**
 *  count  — „Koliko ima jabuka?” predmeti na tabli, dete bira broj
 *  match  — „Gde su tri jabuke?” veliki broj gore, dete bira grupu
 *  most   — „Gde ima više jabuka?” dve grupe
 *  least  — „Gde ima manje jabuka?” dve grupe
 *  plus1  — „Dolazi još jedan balon. Koliko je sada balona?”
 *  minus1 — „Jedan balon odlazi. Koliko je sada balona?”
 *  add    — „Koliko je jabuka zajedno?” dve grupe sa znakom +
 */
export type CountKind = "count" | "match" | "most" | "least" | "plus1" | "minus1" | "add";
export const COUNT_KINDS: readonly CountKind[] = ["count", "match", "most", "least", "plus1", "minus1", "add"];

/** Raspored predmeta na tabli: u redovima po pet, kao na kockici, ili u okviru od deset */
export type CountLayout = "row" | "dice" | "frame";

export interface CountRound {
    kind: CountKind;
    noun: string;
    layout: CountLayout;
    /** Broj predmeta na tabli (count, plus1, minus1) ili prvi sabirak (add); 0 kad table nema */
    a: number;
    /** Drugi sabirak (add); inače 0 */
    b: number;
    /** Tačan odgovor: broj na kartici ili broj predmeta u grupi */
    answer: number;
    /** Kartice na ekranu, redom: brojevi (count, plus1, minus1, add) ili veličine grupa (match, most, least) */
    choices: number[];
    /** Na karticama sa brojem su i tačkice (lako: broj se uparuje sa količinom) */
    dots: boolean;
}

/** Kartice su grupe predmeta (inače su brojevi) */
export function choosesGroup(kind: CountKind): boolean {
    return kind === "match" || kind === "most" || kind === "least";
}

/** Na kockici su rasporedi do šest; mesta 0–8 u mreži 3 × 3 */
export const DICE_PATTERNS: Record<number, readonly number[]> = {
    1: [4],
    2: [2, 6],
    3: [2, 4, 6],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
};

/** Predmeti u redovima po pet (5 + još je lako videti na prvi pogled): 7 → [5, 2] */
export function rowsOf(count: number, perRow = 5): number[] {
    const rows: number[] = [];
    for (let left = Math.max(0, Math.round(count)); left > 0; left -= perRow) rows.push(Math.min(perRow, left));
    return rows;
}

/** Koliko predmeta brojimo pri pomoći (minus1: onaj koji odlazi se ne broji) */
export function boardCount(round: CountRound): number {
    switch (round.kind) {
        case "count":
            return round.a;
        case "plus1":
            return round.a + 1;
        case "minus1":
            return round.a - 1;
        case "add":
            return round.a + round.b;
        default:
            return 0;
    }
}

/** Pitanje koje glas postavlja (i natpis na ekranu) */
export function questionFor(round: CountRound): string {
    const noun = getCountNoun(round.noun);
    if (!noun) return "";
    switch (round.kind) {
        case "count":
            return `Koliko ima ${noun.many}?`;
        case "match":
            return `Gde ${isAre(round.answer)} ${countPhrase(round.answer, noun)}?`;
        case "most":
            return `Gde ima više ${noun.many}?`;
        case "least":
            return `Gde ima manje ${noun.many}?`;
        case "plus1":
            return `Dolazi još ${countPhrase(1, noun)}. Koliko je sada ${noun.many}?`;
        case "minus1":
            return `${capitalize(countPhrase(1, noun))} odlazi. Koliko je sada ${noun.many}?`;
        case "add":
            return `Koliko je ${noun.many} zajedno?`;
    }
}

/** Šta je na izabranoj grupi: „Ovde su tri jabuke.” / „Ovde ima pet jabuka.” */
function groupSentence(round: CountRound, count: number, noun: CountNoun): string {
    return round.kind === "match" ? `Ovde ${isAre(count)} ${countPhrase(count, noun)}.` : `Ovde ima ${countPhrase(count, noun)}.`;
}

/** Rečenica posle tačnog odgovora */
export function answerFor(round: CountRound): string {
    const noun = getCountNoun(round.noun);
    if (!noun) return "";
    switch (round.kind) {
        case "count":
            return `${capitalize(countPhrase(round.answer, noun))}.`;
        case "match":
            return groupSentence(round, round.answer, noun);
        case "most":
        case "least": {
            const other = round.choices.find((value) => value !== round.answer) ?? 0;
            return `${groupSentence(round, round.answer, noun)} ${capitalize(numberWord(round.answer))} je ${round.kind === "most" ? "više" : "manje"} nego ${numberWord(other)}.`;
        }
        case "plus1":
        case "minus1":
            return `Sada ima ${countPhrase(round.answer, noun)}.`;
        case "add":
            return `${capitalize(numberWord(round.a))} i ${numberWord(round.b)} je ${numberWord(round.answer)}.`;
    }
}

/** Šta je na kartici koju je dete pogrešno izabralo: „To je broj četiri.” / „Ovde ima tri jabuke.” */
export function pickedSentence(round: CountRound, value: number): string {
    const noun = getCountNoun(round.noun);
    if (!noun) return "";
    return choosesGroup(round.kind) ? groupSentence(round, value, noun) : `To je broj ${numberWord(value)}.`;
}

/** Natpis kartice za čitač ekrana */
export function choiceLabel(round: CountRound, value: number): string {
    const noun = getCountNoun(round.noun);
    if (!noun) return String(value);
    return choosesGroup(round.kind) ? capitalize(countPhrase(value, noun)) : `Broj ${numberWord(value)}`;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelRule {
    first: number;
    last: number;
    /** Vrste zadataka; u mešanom nivou se smenjuju */
    kinds: readonly CountKind[];
    /** Opseg broja koji se traži (count, match, most, least), odnosno broja predmeta na tabli (plus1, minus1) */
    min: number;
    max: number;
    layout: CountLayout;
    /** Broj kartica sa brojevima ili grupa za „Gde su…?” (poređenje ima uvek dve) */
    choices: number;
    dots: boolean;
    /** Najmanja razlika dve grupe pri poređenju */
    gap: number;
    rounds: number;
    /**
     * Model „brojimo zajedno” pre odgovora (samo kad se broji na tabli): „voice” — predmeti
     * zasvetle jedan po jedan dok glas broji, a poslednji zasvetli bez reči (dete kaže koliko);
     * „lights” — predmeti zasvetle bez glasa (dete broji u sebi); „none” — bez modela.
     */
    model: CountModel;
}

export type CountModel = "voice" | "lights" | "none";

const RULES: readonly LevelRule[] = [
    // Lako: male grupe do 3, pa do 5 u redu i kao na kockici; kartice imaju i tačkice
    { first: 1, last: 1, kinds: ["count"], min: 1, max: 3, layout: "row", choices: 2, dots: true, gap: 2, rounds: 5, model: "voice" },
    { first: 2, last: 2, kinds: ["count"], min: 1, max: 4, layout: "row", choices: 3, dots: true, gap: 2, rounds: 5, model: "voice" },
    { first: 3, last: 3, kinds: ["count"], min: 1, max: 5, layout: "row", choices: 3, dots: true, gap: 2, rounds: 5, model: "lights" },
    { first: 4, last: 4, kinds: ["count"], min: 1, max: 5, layout: "dice", choices: 3, dots: true, gap: 2, rounds: 5, model: "lights" },
    { first: 5, last: 5, kinds: ["count", "most"], min: 1, max: 5, layout: "dice", choices: 3, dots: true, gap: 2, rounds: 5, model: "none" },
    // Srednje: do 10 (pet + još, okvir od deset), broj ↔ količina, više pa i manje
    { first: 6, last: 6, kinds: ["count"], min: 4, max: 7, layout: "row", choices: 3, dots: false, gap: 2, rounds: 6, model: "none" },
    { first: 7, last: 7, kinds: ["count"], min: 5, max: 10, layout: "frame", choices: 3, dots: false, gap: 2, rounds: 6, model: "none" },
    { first: 8, last: 8, kinds: ["match"], min: 1, max: 8, layout: "row", choices: 3, dots: false, gap: 2, rounds: 6, model: "none" },
    { first: 9, last: 9, kinds: ["most"], min: 2, max: 10, layout: "row", choices: 2, dots: false, gap: 1, rounds: 6, model: "none" },
    { first: 10, last: 10, kinds: ["count", "match", "most", "least"], min: 1, max: 10, layout: "frame", choices: 3, dots: false, gap: 1, rounds: 6, model: "none" },
    // Teško: do 20 u dva okvira, jedan više / jedan manje, sabiranje sa predmetima, pa sve izmešano
    { first: 11, last: 11, kinds: ["count"], min: 10, max: 15, layout: "frame", choices: 4, dots: false, gap: 1, rounds: 8, model: "none" },
    { first: 12, last: 12, kinds: ["count"], min: 11, max: 20, layout: "frame", choices: 4, dots: false, gap: 1, rounds: 8, model: "none" },
    { first: 13, last: 13, kinds: ["plus1", "minus1"], min: 2, max: 9, layout: "row", choices: 4, dots: false, gap: 1, rounds: 8, model: "none" },
    { first: 14, last: 14, kinds: ["add"], min: 1, max: 5, layout: "row", choices: 4, dots: false, gap: 1, rounds: 8, model: "none" },
    { first: 15, last: 15, kinds: ["count", "least", "plus1", "minus1", "add", "most"], min: 11, max: 20, layout: "frame", choices: 4, dots: false, gap: 1, rounds: 8, model: "none" },
];

export const COUNTING_MAX_LEVEL = 15;
/** Najveći broj u igri */
export const COUNTING_MAX_NUMBER = 20;
/** Najviše predmeta u jednoj grupi na kartici (dva reda po pet) */
export const GROUP_MAX = 10;

export function countingRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), COUNTING_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

/**
 * Zadaci jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random, testovi stalan niz).
 * `maxChoices` i `maxRounds` dolaze iz podešavanja uzrasta. Isti odgovor i ista sličica se ne
 * ponavljaju dvaput zaredom; u mešanom nivou vrste zadataka se smenjuju.
 */
export function buildCountingLevel(level: number, { maxChoices, maxRounds, random = Math.random }: { maxChoices: number; maxRounds: number; random?: () => number }): CountRound[] {
    const rule = countingRule(level);
    const choiceCount = Math.max(2, Math.min(rule.choices, Number.isFinite(maxChoices) ? maxChoices : rule.choices));
    const roundCount = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const between = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    /** Broj iz opsega, različit od prethodnog (kad opseg to dozvoljava) */
    const freshNumber = (lo: number, hi: number, last: number | null) => {
        let value = between(lo, hi);
        for (let tries = 0; value === last && hi > lo && tries < 8; tries += 1) value = between(lo, hi);
        return value;
    };
    /**
     * Brojevi na karticama: uzastopni brojevi oko tačnog (kao deo brojevne prave), u opsegu nivoa
     * kad stanu. Tačan je na slučajnom mestu u nizu, pa „uvek najveći” ili „uvek prvi” ne pomaže.
     */
    const numeralChoices = (answer: number, lo: number, hi: number) => {
        const k = choiceCount;
        let low = Math.min(lo, answer);
        let high = Math.max(hi, answer);
        if (high - low + 1 < k) low = Math.max(1, high - k + 1);
        if (high - low + 1 < k) high = Math.min(COUNTING_MAX_NUMBER, low + k - 1);
        const start = between(Math.max(low, answer - k + 1), Math.min(answer, high - k + 1));
        return Array.from({ length: k }, (_, i) => start + i);
    };

    // Vrste zadataka: podjednako često, redom koji se ne ponavlja
    const kinds: CountKind[] = [];
    while (kinds.length < roundCount) kinds.push(...shuffle(rule.kinds));

    const rounds: CountRound[] = [];
    let lastAnswer: number | null = null;
    let lastNoun: string | null = null;
    for (const kind of kinds.slice(0, roundCount)) {
        const nouns = COUNT_NOUNS.filter((noun) => noun.id !== lastNoun && (kind === "plus1" || kind === "minus1" ? noun.moves : true));
        const noun = nouns[Math.floor(random() * nouns.length)];
        // Grupe na karticama i sabirci ostaju do deset predmeta, i u mešanom nivou do 20
        const lo = Math.min(rule.min, GROUP_MAX - 1);
        const hi = Math.min(rule.max, GROUP_MAX);
        let round: CountRound;
        if (kind === "count") {
            const answer = freshNumber(rule.min, rule.max, lastAnswer);
            round = { kind, noun: noun.id, layout: rule.layout, a: answer, b: 0, answer, choices: numeralChoices(answer, rule.min, rule.max), dots: rule.dots };
        } else if (kind === "match") {
            const answer = freshNumber(Math.max(1, lo), hi, lastAnswer);
            const groups = numeralChoices(answer, Math.max(1, lo), hi).filter((value) => value <= GROUP_MAX);
            round = { kind, noun: noun.id, layout: "row", a: 0, b: 0, answer, choices: shuffle(groups), dots: false };
        } else if (kind === "most" || kind === "least") {
            const small = rule.max > GROUP_MAX ? 1 : Math.max(1, rule.min);
            let x = between(small, hi);
            let y = between(small, hi);
            for (let tries = 0; Math.abs(x - y) < rule.gap && tries < 40; tries += 1) {
                x = between(small, hi);
                y = between(small, hi);
            }
            if (Math.abs(x - y) < rule.gap) [x, y] = [small, Math.min(hi, small + Math.max(rule.gap, 1))];
            const answer = kind === "most" ? Math.max(x, y) : Math.min(x, y);
            round = { kind, noun: noun.id, layout: "row", a: 0, b: 0, answer, choices: [x, y], dots: false };
        } else if (kind === "plus1" || kind === "minus1") {
            // Na tabli je 2–9 predmeta; „jedan više” ide do deset, „jedan manje” od jedan
            const from = rule.max > GROUP_MAX ? 2 : rule.min;
            const to = rule.max > GROUP_MAX ? 9 : rule.max;
            const a = kind === "plus1" ? freshNumber(from, to, lastAnswer === null ? null : lastAnswer - 1) : freshNumber(from, to, lastAnswer === null ? null : lastAnswer + 1);
            const answer = kind === "plus1" ? a + 1 : a - 1;
            round = { kind, noun: noun.id, layout: "row", a, b: 0, answer, choices: numeralChoices(answer, 1, GROUP_MAX), dots: false };
        } else {
            // Sabiranje: prvi sabirak 1–5, drugi 1–3 (zbir do osam)
            let a = between(1, 5);
            let b = between(1, 3);
            for (let tries = 0; a + b === lastAnswer && tries < 8; tries += 1) {
                a = between(1, 5);
                b = between(1, 3);
            }
            round = { kind, noun: noun.id, layout: "row", a, b, answer: a + b, choices: numeralChoices(a + b, 2, 8), dots: false };
        }
        rounds.push(round);
        lastAnswer = round.answer;
        lastNoun = noun.id;
    }
    return rounds;
}

/** Da li se u ovom zadatku pre odgovora broji zajedno (model), i kako */
export function modelFor(level: number, round: CountRound): CountModel {
    return round.kind === "count" ? countingRule(level).model : "none";
}

/**
 * Koraci modela „brojimo zajedno”: isti kao pomoć, ali uz `voice` poslednji broj ostaje
 * nečujan (`word` je prazan) — odgovor na „Koliko ima?” kaže dete; uz `lights` se ništa ne kaže.
 */
export function modelSteps(round: CountRound, model: CountModel): CountStep[] {
    if (model === "none") return [];
    const steps = hintSteps(round);
    return steps.map((step, i) => (model === "lights" || i === steps.length - 1 ? { ...step, word: "" } : step));
}

// ── Brojanje uz pomoć ─────────────────────────────────────────────────────────

export interface CountStep {
    /** `board` ili grupa na kartici (`groupKey`) */
    key: string;
    /** Koliko predmeta te table ili grupe svetli posle ovog koraka */
    lit: number;
    /** Šta glas kaže: „Jedan.”, „Dva.” … */
    word: string;
}

/**
 * Pomoć kao model brojanja: predmeti zasvetle jedan po jedan dok glas broji („Jedan. Dva. Tri.”).
 * Poslednja izgovorena reč je odgovor na „Koliko ima?” (načelo kardinalnosti) — zato se posle
 * brojanja ništa ne dodaje, a tačna kartica blago svetli. Pun okvir od deset se kaže odjednom
 * („Deset.”), pa se broji dalje („Jedanaest. Dvanaest.”). „Gde su…?” broji tačnu grupu,
 * poređenje broji obe grupe redom kojim su na ekranu.
 */
export function hintSteps(round: CountRound): CountStep[] {
    const word = (value: number) => `${capitalize(numberWord(value))}.`;
    const countUp = (key: string, total: number, from = 1): CountStep[] => Array.from({ length: Math.max(0, total - from + 1) }, (_, i) => ({ key, lit: from + i, word: word(from + i) }));
    if (round.kind === "match") return countUp(groupKey(round.answer), round.answer);
    if (round.kind === "most" || round.kind === "least") return round.choices.flatMap((value) => countUp(groupKey(value), value));
    const total = boardCount(round);
    if (round.kind === "count" && round.layout === "frame" && total > 10) return [{ key: "board", lit: 10, word: word(10) }, ...countUp("board", total, 11)];
    return countUp("board", total);
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface CountingView extends BaseView {
    /** Tekući zadatak (null dok ne počne) */
    task: CountRound | null;
    /** Kartice probane pogrešno u ovom zadatku */
    wrong: number[];
    /** Poslednja dodirnuta kartica dok traje povratna poruka */
    picked: number | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
    /**
     * Brojanje uz pomoć: koliko je predmeta već „izbrojano” (zasvetli) na tabli (`board`)
     * ili na kartici sa grupom (ključ = veličina grupe, npr. `g5`)
     */
    lit: Record<string, number>;
}

export function emptyCountingView(totalRounds: number): CountingView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        task: null,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        lit: {},
    };
}

/** Ključ grupe u `lit` */
export function groupKey(value: number): string {
    return `g${value}`;
}

/**
 * Tačan odgovor: novo stanje sa poenima. Pokazni zadatak (prvi u prvom nivou) se ne ocenjuje;
 * iz prvog pokušaja bez pomoći = samostalno tačno; uz istaknut odgovor (a ne pokazni) = uz pomoć.
 */
export function solveView(current: CountingView, level: number): { next: CountingView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
    const next: CountingView = {
        ...current,
        picked: current.task?.answer ?? null,
        feedback: "correct",
        hint: false,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

/** Rezultat nivoa: total = zadaci bez pokaznog; correct = iz prvog pokušaja; prompted = uz pomoć */
export function countingResult(final: CountingView, level: number, durationSec: number): GameResult {
    return {
        score: final.score,
        durationSec,
        correct: final.correctCount,
        total: Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1),
        prompted: final.promptedCount,
    };
}

const isNumber = (value: unknown, lo: number, hi: number): value is number => Number.isInteger(value) && (value as number) >= lo && (value as number) <= hi;

/** Zadatak sa monitora je ispravan samo ako ga je igra mogla da napravi */
export function validRound(value: unknown): value is CountRound {
    if (!value || typeof value !== "object") return false;
    const round = value as Partial<CountRound>;
    if (!COUNT_KINDS.includes(round.kind as CountKind) || !getCountNoun(round.noun)) return false;
    if (round.layout !== "row" && round.layout !== "dice" && round.layout !== "frame") return false;
    if (!isNumber(round.a, 0, COUNTING_MAX_NUMBER) || !isNumber(round.b, 0, GROUP_MAX) || !isNumber(round.answer, 0, COUNTING_MAX_NUMBER)) return false;
    if (!Array.isArray(round.choices) || round.choices.length < 2 || round.choices.length > 6) return false;
    if (!round.choices.every((choice) => isNumber(choice, 1, COUNTING_MAX_NUMBER)) || new Set(round.choices).size !== round.choices.length) return false;
    if (!round.choices.includes(round.answer)) return false;
    const kind = round.kind as CountKind;
    if (choosesGroup(kind) && round.choices.some((choice) => choice > GROUP_MAX)) return false;
    if (kind === "most" && round.answer !== Math.max(...round.choices)) return false;
    if (kind === "least" && round.answer !== Math.min(...round.choices)) return false;
    if (kind === "count" && round.a !== round.answer) return false;
    if (kind === "plus1" && round.a + 1 !== round.answer) return false;
    if (kind === "minus1" && round.a - 1 !== round.answer) return false;
    if (kind === "add" && round.a + round.b !== round.answer) return false;
    return typeof round.dots === "boolean";
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeCountingMonitor(state: Partial<CountingView> | null | undefined): CountingView {
    const base = emptyCountingView(1);
    if (!state) return base;
    const task = validRound(state.task) ? { ...state.task, choices: [...state.task.choices] } : null;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const choices = task?.choices ?? [];
    const lit: Record<string, number> = {};
    if (task && state.lit && typeof state.lit === "object") {
        const keys = ["board", ...choices.map(groupKey)];
        for (const [key, value] of Object.entries(state.lit)) if (keys.includes(key) && isNumber(value, 0, COUNTING_MAX_NUMBER)) lit[key] = value;
    }
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        task,
        wrong: task && Array.isArray(state.wrong) ? Array.from(new Set(state.wrong.filter((value) => choices.includes(value) && value !== task.answer))) : [],
        picked: task ? (choices.find((value) => value === state.picked) ?? null) : null,
        feedback: task && (state.feedback === "correct" || state.feedback === "wrong") ? state.feedback : null,
        hint: task !== null && state.hint === true,
        lit,
    };
}
