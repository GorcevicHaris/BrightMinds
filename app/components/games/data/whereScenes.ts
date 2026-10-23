// Sadržaj igre „Gde je?”: prostorni predlozi (u, na, ispod, pored, iza, ispred, iznad, između).
//
// Dete čuje rečenicu („Mače je ispod stola.”) i bira sliku na kojoj je tako. Na svim slikama
// istog zadatka su ISTA igračka i ISTI predmet — razlikuje se samo položaj, pa dete mora da
// razume predlog (a ne da prepozna igračku). Redosled predloga prati razvoj razumevanja:
// „u” i „na” (oko druge godine), „ispod” (oko treće), „pored” (treća–četvrta),
// „iza” i „ispred” (četvrta–peta), „iznad” i „između” (peta i kasnije).
//
// Pravila pisanja:
//  • Rečenica je uvek „{Igračka} je {predlog} {predmet u padežu}.” — glagol „je” ne zavisi od
//    roda, pa nema slaganja koje bi moglo da pogreši; padež zavisi samo od predloga:
//    u/na + lokativ (u kutiji), ispod/pored/iza/ispred/iznad + genitiv (ispod stola),
//    između + „dve/dva” (između dve kutije). Svi oblici su napisani ručno, ovde (test ih proverava).
//  • Predmet nudi samo položaje koji se na slici jasno vide (kutija nema „ispod”, sto nema „u”).

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";

export type Relation = "in" | "on" | "under" | "next" | "behind" | "front" | "above" | "between";
export type FigureId = "cat" | "dog" | "teddy" | "ball" | "chick" | "duck";
export type ObjectId = "box" | "basket" | "table" | "chair";

export interface Figure {
    id: FigureId;
    emoji: string;
    /** Nominativ, velikim početnim slovom (počinje rečenicu) */
    name: string;
}

export interface PlaceObject {
    id: ObjectId;
    /** Nominativ, za natpise i dnevnik */
    name: string;
    /** Lokativ jednine: u kutiji, na stolu */
    loc: string;
    /** Genitiv jednine: ispod stola, pored kutije */
    gen: string;
    /** Posle „između”: dve kutije, dva stola */
    pair: string;
    /** Položaji koji se na slici ovog predmeta jasno vide */
    relations: readonly Relation[];
}

export const RELATIONS: readonly Relation[] = ["in", "on", "under", "next", "behind", "front", "above", "between"];

/** Predlog i padež koji traži */
const PREPOSITION: Record<Relation, { word: string; takes: "loc" | "gen" | "pair" }> = {
    in: { word: "u", takes: "loc" },
    on: { word: "na", takes: "loc" },
    under: { word: "ispod", takes: "gen" },
    next: { word: "pored", takes: "gen" },
    behind: { word: "iza", takes: "gen" },
    front: { word: "ispred", takes: "gen" },
    above: { word: "iznad", takes: "gen" },
    between: { word: "između", takes: "pair" },
};

export const FIGURES: readonly Figure[] = [
    { id: "cat", emoji: "🐱", name: "Mače" },
    { id: "dog", emoji: "🐶", name: "Kuče" },
    { id: "teddy", emoji: "🧸", name: "Meda" },
    { id: "ball", emoji: "⚽", name: "Lopta" },
    { id: "chick", emoji: "🐤", name: "Pile" },
    { id: "duck", emoji: "🦆", name: "Patka" },
];

export const PLACE_OBJECTS: readonly PlaceObject[] = [
    { id: "box", name: "kutija", loc: "kutiji", gen: "kutije", pair: "dve kutije", relations: ["in", "on", "next", "behind", "front", "above", "between"] },
    { id: "basket", name: "korpa", loc: "korpi", gen: "korpe", pair: "dve korpe", relations: ["in", "next", "front", "above", "between"] },
    { id: "table", name: "sto", loc: "stolu", gen: "stola", pair: "dva stola", relations: ["on", "under", "next", "above"] },
    { id: "chair", name: "stolica", loc: "stolici", gen: "stolice", pair: "dve stolice", relations: ["on", "under", "next"] },
];

export function getFigure(id: unknown): Figure | undefined {
    return FIGURES.find((figure) => figure.id === id);
}

export function getPlaceObject(id: unknown): PlaceObject | undefined {
    return PLACE_OBJECTS.find((object) => object.id === id);
}

export function isRelation(value: unknown): value is Relation {
    return typeof value === "string" && (RELATIONS as readonly string[]).includes(value);
}

/** „ispod stola”, „u kutiji”, „između dve korpe” */
export function placePhrase(relation: Relation, object: PlaceObject): string {
    const { word, takes } = PREPOSITION[relation];
    return `${word} ${object[takes]}`;
}

/** „Mače je ispod stola.” */
export function placeSentence(figure: Figure, relation: Relation, object: PlaceObject): string {
    return `${figure.name} je ${placePhrase(relation, object)}.`;
}

/** Posle pogrešne slike: šta se na njoj vidi („Ovde je mače na kutiji.”) — „je” ostaje na drugom mestu */
export function shownSentence(figure: Figure, relation: Relation, object: PlaceObject): string {
    return `Ovde je ${figure.name.toLocaleLowerCase("sr")} ${placePhrase(relation, object)}.`;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelRule {
    first: number;
    last: number;
    /** Predlozi koji se traže u ovom nivou */
    targets: readonly Relation[];
    /** Broj slika u zadatku */
    choices: number;
    rounds: number;
}

const RULES: readonly LevelRule[] = [
    // Lako: dve slike, prvi predlozi
    { first: 1, last: 2, targets: ["in", "on"], choices: 2, rounds: 5 },
    { first: 3, last: 4, targets: ["on", "under"], choices: 2, rounds: 5 },
    { first: 5, last: 5, targets: ["in", "on", "under"], choices: 2, rounds: 5 },
    // Srednje: tri slike, pa „pored”, „iza”, „ispred”
    { first: 6, last: 7, targets: ["in", "on", "under", "next"], choices: 3, rounds: 6 },
    { first: 8, last: 10, targets: ["in", "on", "under", "next", "behind", "front"], choices: 3, rounds: 6 },
    // Teško: četiri slike, „iznad” i „između”, i slični položaji jedan uz drugi (na / iznad, iza / ispred)
    { first: 11, last: 13, targets: ["next", "behind", "front", "above", "between"], choices: 4, rounds: 8 },
    { first: 14, last: 15, targets: RELATIONS, choices: 4, rounds: 8 },
];

export const WHERE_MAX_LEVEL = 15;

export interface WhereRound {
    figure: FigureId;
    object: ObjectId;
    target: Relation;
    /** Položaji na slikama, redom kojim su na ekranu (jedan je `target`) */
    choices: Relation[];
}

export function whereRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), WHERE_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

/** Svi predlozi do ovog nivoa: od njih se biraju ostale slike (na lakim nivoima samo poznati) */
function knownRelations(level: number): Relation[] {
    const rule = whereRule(level);
    const known = new Set<Relation>();
    for (const earlier of RULES) {
        if (earlier.first > rule.first) break;
        for (const relation of earlier.targets) known.add(relation);
    }
    return RELATIONS.filter((relation) => known.has(relation));
}

/**
 * Zadaci jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random, testovi stalan niz).
 * `maxChoices` i `maxRounds` dolaze iz podešavanja uzrasta. Predlozi se smenjuju ravnomerno
 * (nikad isti dvaput zaredom kad ih ima više), a ostale slike su položaji koje dete već zna.
 */
export function buildWhereLevel(level: number, { maxChoices, maxRounds, random = Math.random }: { maxChoices: number; maxRounds: number; random?: () => number }): WhereRound[] {
    const rule = whereRule(level);
    const choiceCount = Math.max(2, Math.min(rule.choices, Number.isFinite(maxChoices) ? maxChoices : rule.choices));
    const roundCount = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const known = knownRelations(level);

    // Traženi predlozi: svaki podjednako često, bez istog dvaput zaredom
    const targets: Relation[] = [];
    const used = new Map<Relation, number>(rule.targets.map((relation) => [relation, 0]));
    while (targets.length < roundCount) {
        const last = targets[targets.length - 1];
        const candidates = rule.targets.filter((relation) => relation !== last || rule.targets.length === 1);
        const fewest = Math.min(...candidates.map((relation) => used.get(relation) ?? 0));
        const next = pick(candidates.filter((relation) => (used.get(relation) ?? 0) === fewest));
        used.set(next, (used.get(next) ?? 0) + 1);
        targets.push(next);
    }

    const rounds: WhereRound[] = [];
    let lastFigure: FigureId | null = null;
    for (const target of targets) {
        // Predmet koji ima traženi položaj i dovoljno drugih poznatih položaja za ostale slike
        const options = (object: PlaceObject) => object.relations.filter((relation) => relation !== target && known.includes(relation)).length;
        const withTarget = PLACE_OBJECTS.filter((object) => object.relations.includes(target));
        const most = Math.max(...withTarget.map(options));
        const fitting = withTarget.filter((object) => options(object) >= Math.min(choiceCount - 1, most));
        const object = pick(fitting);
        const others = object.relations.filter((relation) => relation !== target && known.includes(relation));
        // Na teškim nivoima prednost imaju slični položaji (na ↔ iznad, iza ↔ ispred, u ↔ na)
        const close = CONFUSABLE[target].filter((relation) => others.includes(relation));
        const preferred = choiceCount >= 4 ? [...shuffle(close), ...shuffle(others.filter((relation) => !close.includes(relation)))] : shuffle(others);
        const choices = shuffle([target, ...preferred.slice(0, choiceCount - 1)]);
        const figures = FIGURES.filter((figure) => figure.id !== lastFigure);
        const figure = pick(figures).id;
        lastFigure = figure;
        rounds.push({ figure, object: object.id, target, choices });
    }
    return rounds;
}

/** Položaji koje deca najčešće mešaju */
const CONFUSABLE: Record<Relation, readonly Relation[]> = {
    in: ["on", "behind"],
    on: ["above", "in"],
    under: ["on", "next"],
    next: ["between", "front"],
    behind: ["front", "in"],
    front: ["behind", "next"],
    above: ["on", "next"],
    between: ["next", "front"],
};

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface WhereView extends BaseView {
    figure: FigureId | "";
    object: ObjectId | "";
    target: Relation | "";
    /** Položaji na slikama, redom */
    choices: Relation[];
    /** Slike probane pogrešno u ovom zadatku */
    wrong: Relation[];
    /** Poslednja dodirnuta slika dok traje povratna poruka */
    picked: Relation | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
}

export function emptyWhereView(totalRounds: number): WhereView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        figure: "",
        object: "",
        target: "",
        choices: [],
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeWhereMonitor(state: Partial<WhereView> | null | undefined): WhereView {
    const base = emptyWhereView(1);
    if (!state) return base;
    const figure = getFigure(state.figure);
    const object = getPlaceObject(state.object);
    const target = isRelation(state.target) ? state.target : null;
    // Na slici sme da bude samo položaj koji taj predmet ume da prikaže
    const choices = object && Array.isArray(state.choices) ? Array.from(new Set(state.choices.filter((relation) => isRelation(relation) && object.relations.includes(relation)))) : [];
    const valid = figure !== undefined && object !== undefined && target !== null && choices.includes(target);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        figure: valid ? figure.id : "",
        object: valid ? object.id : "",
        target: valid ? target : "",
        choices: valid ? choices : [],
        wrong: valid && Array.isArray(state.wrong) ? state.wrong.filter((relation) => choices.includes(relation) && relation !== target) : [],
        picked: valid ? (choices.find((relation) => relation === state.picked) ?? null) : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
    };
}
