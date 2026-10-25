// Sadržaj igre „Šta fali?”: vizuelno pamćenje i vizuelno dopunjavanje (zatvaranje).
//
//  • Dopunjavanje („Šta fali kući?”): predmetu fali jedan deo (biciklu točak, licu nos, kući
//    vrata, šolji drška). Dete bira deo koji fali među dva ili tri dela, a pravi deo doleti na
//    svoje mesto. Na mestu dela je „rupa” u obliku dela, pa dete gleda oblik, a ne pogađa.
//  • Pamćenje (Kimova igra): na polici stoje predmeti. Dete gleda koliko želi i samo kaže kad
//    je zapamtilo (dugme, bez sata i odbrojavanja). Zavesa se navuče („Zatvori oči…”), a kad se
//    razgrne, jednog predmeta nema — dete bira šta fali. Na teškim nivoima fale dva predmeta, a
//    na kraju dve stvari zamene mesta („Šta se promenilo?”).
//
// Zašto ovako (istraživanja o učenju dece od 3 do 10 godina i dece sa autizmom):
//  • Kimova igra je klasična vežba vizuelnog radnog pamćenja: obim pamćenja kod dece od 4 do 5
//    godina je oko tri predmeta, a kod školske dece pet do šest, pa se ide 3 → 4–5 → 6 predmeta.
//  • Vizuelno dopunjavanje (vizuelna percepcija, VB-MAPP: dovršavanje slike; testovi vizuelne
//    percepcije za predškolce) dolazi prvo, jer je rešenje na samoj slici — samo pamćenje je teže.
//  • Učenje bez grešaka: prvi zadatak prvog nivoa pokazuje ruka (model), na lakim nivoima rupa
//    blago svetli i tačan izbor zasvetli već posle prve greške; predmeti se izgovaraju naglas dok
//    dete gleda (imenovanje pomaže pamćenje), a podrška se kroz nivoe povlači.
//  • Malo izbora na početku (dva), predvidljiv tok (gledam → zavesa → biram), mirne poruke bez
//    tužnih lica i zvuka greške, veliki ciljevi za dodir i nikakva žurba: zavesa se zatvara tek
//    kad dete samo kaže da je zapamtilo.
//  • Pogrešan izbor na polici se odbija činjenicom („Lopta je i dalje na polici.”), bez osude.
//  • Ocena: svaki zadatak je jedan bod. „Tačno” = iz prvog pokušaja i bez pomoći; „uz pomoć” =
//    posle isticanja tačnog izbora. Pokazni zadatak (nivo 1) se ne ocenjuje.
//
// Pravila pisanja:
//  • Rečenice su doslovne i kratke; rod glagola prati rod imenice („Falio je meda.”, „Falila je
//    lopta.”), zato svaki predmet ima rod.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";
import { FOOD_IDS, getFood, type FoodId } from "@/app/components/games/data/foodItems";

// ── Predmeti ──────────────────────────────────────────────────────────────────

/** Predmeti nacrtani u missing/things.tsx (deli ih i igra „Prve reči”) */
export const THING_IDS = [
    "ball",
    "teddy",
    "car",
    "duck",
    "cup",
    "book",
    "cap",
    "balloon",
    "umbrella",
    "sun",
    "jam",
    "pretzel",
    "swing",
    "shoe",
    "house",
    "bicycle",
    "chair",
    "butterfly",
    "face",
    "fish",
] as const;
export type ThingId = (typeof THING_IDS)[number];

export type Gender = "m" | "f" | "n";

export interface Thing {
    id: ThingId;
    /** Nominativ, velikim početnim slovom (natpis) */
    name: string;
    gender: Gender;
    /** Dativ („Šta fali kući?”), samo za predmete sa delovima */
    dat?: string;
    /** Genitiv („drška od šolje”) */
    gen?: string;
}

const t = (id: ThingId, name: string, gender: Gender, dat?: string, gen?: string): Thing => ({ id, name, gender, ...(dat ? { dat, gen } : {}) });

export const THINGS: readonly Thing[] = [
    t("ball", "Lopta", "f"),
    t("teddy", "Meda", "m", "medi", "mede"),
    t("car", "Auto", "m", "autu", "auta"),
    t("duck", "Patka", "f"),
    t("cup", "Šolja", "f", "šolji", "šolje"),
    t("book", "Knjiga", "f"),
    t("cap", "Kapa", "f"),
    t("balloon", "Balon", "m"),
    t("umbrella", "Kišobran", "m", "kišobranu", "kišobrana"),
    t("sun", "Sunce", "n"),
    t("jam", "Džem", "m"),
    t("pretzel", "Đevrek", "m"),
    t("swing", "Ljuljaška", "f"),
    t("shoe", "Cipela", "f"),
    t("house", "Kuća", "f", "kući", "kuće"),
    t("bicycle", "Bicikl", "m", "biciklu", "bicikla"),
    t("chair", "Stolica", "f", "stolici", "stolice"),
    t("butterfly", "Leptir", "m", "leptiru", "leptira"),
    t("face", "Lice", "n", "licu", "lica"),
    t("fish", "Riba", "f", "ribi", "ribe"),
];

export function getThing(id: unknown): Thing | undefined {
    return THINGS.find((item) => item.id === id);
}

// ── Delovi (dopunjavanje) ─────────────────────────────────────────────────────

export const PART_IDS = [
    "houseDoor",
    "houseWindow",
    "bikeWheel",
    "bikeSeat",
    "carWheel",
    "cupHandle",
    "umbrellaHandle",
    "faceNose",
    "faceEar",
    "teddyEar",
    "chairLeg",
    "butterflyWing",
    "fishTail",
] as const;
export type PartId = (typeof PART_IDS)[number];

/** Vrsta dela: dva dela iste vrste (dva točka, dve drške) nikad nisu u istom zadatku */
export type PartKind = "door" | "window" | "wheel" | "seat" | "handle" | "nose" | "ear" | "leg" | "wing" | "tail";
/** Grub oblik dela: na lakim nivoima pogrešan deo je i drugačijeg oblika (ne krug pored kruga) */
export type PartShape = "box" | "round" | "curve" | "long" | "fan";

export interface Part {
    id: PartId;
    thing: ThingId;
    /** Nominativ, velikim slovom („Točak”) */
    name: string;
    kind: PartKind;
    shape: PartShape;
    /** Kad je ovaj deo ponuđen, a fali drugi deo istog predmeta: „Kuća već ima vrata.” */
    already: string;
}

const p = (id: PartId, thing: ThingId, name: string, kind: PartKind, shape: PartShape, already: string): Part => ({ id, thing, name, kind, shape, already });

export const PARTS: readonly Part[] = [
    p("houseDoor", "house", "Vrata", "door", "box", "Kuća već ima vrata."),
    p("houseWindow", "house", "Prozor", "window", "box", "Kuća već ima prozor."),
    p("bikeWheel", "bicycle", "Točak", "wheel", "round", "Bicikl već ima točak."),
    p("bikeSeat", "bicycle", "Sedište", "seat", "long", "Bicikl već ima sedište."),
    p("carWheel", "car", "Točak", "wheel", "round", "Auto već ima točak."),
    p("cupHandle", "cup", "Drška", "handle", "curve", "Šolja već ima dršku."),
    p("umbrellaHandle", "umbrella", "Drška", "handle", "curve", "Kišobran već ima dršku."),
    p("faceNose", "face", "Nos", "nose", "round", "Lice već ima nos."),
    p("faceEar", "face", "Uvo", "ear", "round", "Lice već ima uvo."),
    p("teddyEar", "teddy", "Uvo", "ear", "round", "Meda već ima uvo."),
    p("chairLeg", "chair", "Noga", "leg", "long", "Stolica već ima nogu."),
    p("butterflyWing", "butterfly", "Krilo", "wing", "fan", "Leptir već ima krilo."),
    p("fishTail", "fish", "Rep", "tail", "fan", "Riba već ima rep."),
];

export function getPart(id: unknown): Part | undefined {
    return PARTS.find((item) => item.id === id);
}

export interface Closure {
    thing: ThingId;
    part: PartId;
    /** 1 = deo je velik i očigledan (lako), 2 = manji deo (srednje) */
    tier: 1 | 2;
    /** Rečenica posle tačnog izbora */
    answer: string;
}

const c = (thing: ThingId, part: PartId, tier: 1 | 2, answer: string): Closure => ({ thing, part, tier, answer });

export const CLOSURES: readonly Closure[] = [
    c("house", "houseDoor", 1, "Kući su falila vrata."),
    c("bicycle", "bikeWheel", 1, "Biciklu je falio točak."),
    c("cup", "cupHandle", 1, "Šolji je falila drška."),
    c("face", "faceNose", 1, "Licu je falio nos."),
    c("chair", "chairLeg", 1, "Stolici je falila noga."),
    c("butterfly", "butterflyWing", 1, "Leptiru je falilo krilo."),
    c("umbrella", "umbrellaHandle", 1, "Kišobranu je falila drška."),
    c("teddy", "teddyEar", 2, "Medi je falilo uvo."),
    c("house", "houseWindow", 2, "Kući je falio prozor."),
    c("fish", "fishTail", 2, "Ribi je falio rep."),
    c("car", "carWheel", 2, "Autu je falio točak."),
    c("face", "faceEar", 2, "Licu je falilo uvo."),
    c("bicycle", "bikeSeat", 2, "Biciklu je falilo sedište."),
];

export function getClosure(part: unknown): Closure | undefined {
    return CLOSURES.find((item) => item.part === part);
}

export function closureQuestion(thing: ThingId): string {
    return `Šta fali ${getThing(thing)?.dat ?? ""}?`;
}

/** Posle pogrešnog dela: činjenica, bez osude („Kuća već ima vrata.”, „To je drška od šolje.”) */
export function closureWrong(closure: Pick<Closure, "thing">, picked: PartId): string {
    const part = getPart(picked);
    if (!part) return "";
    if (part.thing === closure.thing) return part.already;
    return `To je ${part.name.toLocaleLowerCase("sr")} od ${getThing(part.thing)?.gen ?? ""}.`;
}

// ── Predmeti na polici (pamćenje) ─────────────────────────────────────────────

/** Na polici: igračke i stvari iz kuće, pa voće i povrće iz igre „Šta jede?” */
export const SHELF_THINGS = ["ball", "teddy", "car", "duck", "cup", "book", "cap", "balloon", "umbrella", "jam", "shoe"] as const satisfies readonly ThingId[];
export const SHELF_FOODS = ["apple", "banana", "carrot", "corn", "flower"] as const satisfies readonly FoodId[];
export const SHELF_IDS: readonly string[] = [...SHELF_THINGS, ...SHELF_FOODS];
export type ShelfId = (typeof SHELF_THINGS)[number] | (typeof SHELF_FOODS)[number];

const FOOD_GENDER: Partial<Record<FoodId, Gender>> = { apple: "f", banana: "f", carrot: "f", corn: "m", flower: "m" };

export interface ShelfItem {
    id: ShelfId;
    name: string;
    gender: Gender;
    /** Odakle je crtež */
    art: "thing" | "food";
}

export function getShelfItem(id: unknown): ShelfItem | undefined {
    if (typeof id !== "string" || !SHELF_IDS.includes(id)) return undefined;
    const thing = getThing(id);
    if (thing) return { id: id as ShelfId, name: thing.name, gender: thing.gender, art: "thing" };
    const food = getFood(id);
    if (food && (FOOD_IDS as readonly string[]).includes(id)) return { id: id as ShelfId, name: food.name, gender: FOOD_GENDER[food.id] ?? "f", art: "food" };
    return undefined;
}

const lower = (text: string) => text.toLocaleLowerCase("sr");
const VERB_END: Record<Gender, string> = { m: "o", f: "la", n: "lo" };

/** „Falila je lopta.” / „Falio je i meda.” */
export function missingSentence(item: ShelfItem, also = false): string {
    return `Fali${VERB_END[item.gender]} je ${also ? "i " : ""}${lower(item.name)}.`;
}

/** Izabran predmet koji je i dalje na polici */
export function stillThereSentence(item: ShelfItem): string {
    return `${item.name} je i dalje na polici.`;
}

/** „Lopta i meda su zamenili mesta.” (oba ženskog roda: zamenile; oba srednjeg: zamenila) */
export function swappedSentence(a: ShelfItem, b: ShelfItem): string {
    const end = a.gender === "f" && b.gender === "f" ? "e" : a.gender === "n" && b.gender === "n" ? "a" : "i";
    return `${a.name} i ${lower(b.name)} su zamenil${end} mesta.`;
}

export function inPlaceSentence(item: ShelfItem): string {
    return `${item.name} je na svom mestu.`;
}

/** „Lopta, meda i jabuka.” — glas imenuje predmete dok dete gleda */
export function namesSentence(ids: readonly string[]): string {
    const names = ids.map((id) => getShelfItem(id)?.name).filter((name): name is string => Boolean(name));
    if (names.length === 0) return "";
    const listed = names.map((name, i) => (i === 0 ? name : lower(name)));
    if (listed.length === 1) return `${listed[0]}.`;
    return `${listed.slice(0, -1).join(", ")} i ${listed[listed.length - 1]}.`;
}

// ── Pitanja ───────────────────────────────────────────────────────────────────

export const LOOK_TITLE = "Pogledaj šta je na polici.";
export const LOOK_SWAP_TITLE = "Pogledaj gde je šta.";
export const LOOK_TAIL = "Kad zapamtiš, javi mi.";
export const CURTAIN_TEXT = "Zatvori oči…";
export const GONE_QUESTION = "Šta fali?";
export const GONE_TWO_HINT = "Fale dve stvari.";
export const SWAP_QUESTION = "Šta se promenilo?";
export const SWAP_HINT = "Dve stvari su zamenile mesta.";

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 *  closure — „Šta fali kući?”: predmetu fali deo
 *  gone    — Kimova igra: jednog predmeta nema
 *  gone2   — dva predmeta nema
 *  swap    — dva predmeta su zamenila mesta
 */
export type MissingKind = "closure" | "gone" | "gone2" | "swap";
export const MISSING_KINDS: readonly MissingKind[] = ["closure", "gone", "gone2", "swap"];

export interface MissingRule {
    first: number;
    last: number;
    /** Vrste zadataka, smenjuju se redom */
    kinds: readonly MissingKind[];
    rounds: number;
    /** Predmeta na polici */
    objects: number;
    /** Izbora za „gone” / „gone2” / „closure” */
    choices: number;
    closureTier: 1 | 2;
    /** Rupa na slici blago svetli (dopunjavanje) i tačan izbor zasvetli već posle prve greške */
    earlyHint: boolean;
    /** Glas imenuje predmete na polici dok dete gleda */
    names: boolean;
}

const RULES: readonly MissingRule[] = [
    // Lako: dopunjavanje sa dva očigledna dela, pa Kimova igra sa tri predmeta i dva izbora
    { first: 1, last: 2, kinds: ["closure"], rounds: 5, objects: 3, choices: 2, closureTier: 1, earlyHint: true, names: true },
    { first: 3, last: 4, kinds: ["gone"], rounds: 5, objects: 3, choices: 2, closureTier: 1, earlyHint: true, names: true },
    { first: 5, last: 5, kinds: ["gone", "closure"], rounds: 6, objects: 3, choices: 2, closureTier: 1, earlyHint: true, names: true },
    // Srednje: četiri i pet predmeta sa tri izbora, dopunjavanje sa tri dela
    { first: 6, last: 6, kinds: ["gone"], rounds: 5, objects: 4, choices: 3, closureTier: 2, earlyHint: false, names: true },
    { first: 7, last: 7, kinds: ["gone"], rounds: 5, objects: 5, choices: 3, closureTier: 2, earlyHint: false, names: true },
    { first: 8, last: 8, kinds: ["closure"], rounds: 6, objects: 5, choices: 3, closureTier: 2, earlyHint: false, names: true },
    { first: 9, last: 10, kinds: ["gone", "closure"], rounds: 6, objects: 5, choices: 3, closureTier: 2, earlyHint: false, names: false },
    // Teško: šest predmeta i dva fale, pa „Šta se promenilo?”
    { first: 11, last: 11, kinds: ["gone2"], rounds: 4, objects: 6, choices: 4, closureTier: 2, earlyHint: false, names: true },
    { first: 12, last: 12, kinds: ["gone2"], rounds: 5, objects: 6, choices: 4, closureTier: 2, earlyHint: false, names: false },
    { first: 13, last: 13, kinds: ["swap"], rounds: 4, objects: 4, choices: 0, closureTier: 2, earlyHint: false, names: false },
    { first: 14, last: 14, kinds: ["swap"], rounds: 5, objects: 6, choices: 0, closureTier: 2, earlyHint: false, names: false },
    { first: 15, last: 15, kinds: ["gone2", "swap"], rounds: 6, objects: 6, choices: 4, closureTier: 2, earlyHint: false, names: false },
];

export const MISSING_MAX_LEVEL = 15;

export function missingRule(level: number): MissingRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), MISSING_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

export interface MissingRound {
    kind: MissingKind;
    /** Dopunjavanje: predmet i deo koji fali */
    thing: ThingId | "";
    part: PartId | "";
    /** Pamćenje: predmeti na polici pre zavese, redom po mestima */
    shelf: string[];
    /** Posle zavese: šta stoji na kom mestu ("" = prazno mesto) */
    after: string[];
    /** Tačni odgovori: deo, predmeti kojih nema ili dva predmeta koja su zamenila mesta */
    answers: string[];
    /** Kartice izbora (kod zamene se bira na samoj polici, pa je prazno) */
    choices: string[];
}

interface BuildOptions {
    maxChoices: number;
    maxRounds: number;
    random?: () => number;
}

/** Koliko izbora stvarno ima zadatak: podešavanje deteta, ali bar jedan pogrešan izbor */
function choiceCount(kind: MissingKind, rule: MissingRule, limit: number): number {
    if (kind === "swap") return 0;
    const wanted = Math.min(rule.choices, limit);
    if (kind === "gone2") return Math.max(3, wanted);
    return Math.max(2, wanted);
}

/**
 * Zadaci jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random, testovi stalan niz).
 * Isti predmet za dopunjavanje se u nivou ne ponavlja, a police se ne ponavljaju.
 */
export function buildMissingLevel(level: number, { maxChoices, maxRounds, random = Math.random }: BuildOptions): MissingRound[] {
    const rule = missingRule(level);
    const roundCount = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const limit = Math.max(2, Number.isFinite(maxChoices) ? maxChoices : 4);
    const shuffle = <T>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    // Dopunjavanje: prvo laki delovi; na srednjim nivoima i laki dolaze tek kad se teži potroše
    const closurePool = shuffle(CLOSURES.filter((item) => item.tier === rule.closureTier));
    const backup = shuffle(CLOSURES.filter((item) => item.tier !== rule.closureTier));
    const closures = [...closurePool, ...backup];
    let lastThing = "";
    let lastShelf: string[] = [];

    const makeClosure = (): MissingRound | null => {
        const index = closures.findIndex((item) => item.thing !== lastThing);
        if (index < 0) return null;
        const [closure] = closures.splice(index, 1);
        const answer = getPart(closure.part)!;
        const count = choiceCount("closure", rule, limit);
        // Pogrešni delovi su uvek druge vrste; na lakom nivou i drugačijeg oblika i sa drugog predmeta
        const others = PARTS.filter((part) => part.kind !== answer.kind && part.id !== answer.id && (rule.closureTier === 2 || (part.shape !== answer.shape && part.thing !== answer.thing)));
        const same = shuffle(others.filter((part) => part.thing === answer.thing));
        const foreign = shuffle(others.filter((part) => part.thing !== answer.thing));
        // Srednje: jedan pogrešan deo sme biti sa istog predmeta („Kuća već ima vrata.”), ali ne dva
        const picked = [...same.slice(0, rule.closureTier === 2 && count > 2 ? 1 : 0), ...foreign].slice(0, count - 1);
        lastThing = closure.thing;
        return { kind: "closure", thing: closure.thing, part: closure.part, shelf: [], after: [], answers: [closure.part], choices: shuffle([closure.part, ...picked.map((part) => part.id)]) };
    };

    const makeShelf = (kind: MissingKind): MissingRound => {
        // Nova polica: ne ista kao prethodna, i bar pola predmeta drugačije
        let shelf: string[] = [];
        for (let attempt = 0; attempt < 20; attempt += 1) {
            shelf = shuffle(SHELF_IDS).slice(0, rule.objects);
            const repeated = shelf.filter((id) => lastShelf.includes(id)).length;
            if (repeated <= Math.floor(rule.objects / 2)) break;
        }
        lastShelf = shelf;
        if (kind === "swap") {
            // Dva mesta koja nisu jedno do drugog kad god je to moguće (zamena se lakše vidi)
            const pairs: [number, number][] = [];
            for (let i = 0; i < shelf.length; i += 1) for (let j = i + 1; j < shelf.length; j += 1) pairs.push([i, j]);
            const apart = pairs.filter(([i, j]) => j - i > 1);
            const [i, j] = shuffle(apart.length > 0 ? apart : pairs)[0];
            const after = [...shelf];
            [after[i], after[j]] = [after[j], after[i]];
            return { kind, thing: "", part: "", shelf, after, answers: [shelf[i], shelf[j]], choices: [] };
        }
        const missing = kind === "gone2" ? 2 : 1;
        const gone = shuffle(shelf).slice(0, missing);
        const after = shelf.map((id) => (gone.includes(id) ? "" : id));
        const count = choiceCount(kind, rule, limit);
        // Pogrešni izbori su predmeti koji su i dalje na polici (dete gleda šta je ostalo)
        const present = shuffle(shelf.filter((id) => !gone.includes(id))).slice(0, Math.max(1, count - missing));
        return { kind, thing: "", part: "", shelf, after, answers: gone, choices: shuffle([...gone, ...present]) };
    };

    const rounds: MissingRound[] = [];
    for (let i = 0; rounds.length < roundCount && i < roundCount * 4; i += 1) {
        const kind = rule.kinds[rounds.length % rule.kinds.length];
        const round = kind === "closure" ? (makeClosure() ?? makeShelf("gone")) : makeShelf(kind);
        rounds.push(round);
    }
    return rounds;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

/** look — dete gleda policu; curtain — zavesa je navučena; ask — bira se odgovor */
export type MissingPhase = "look" | "curtain" | "ask";
export const MISSING_PHASES: readonly MissingPhase[] = ["look", "curtain", "ask"];

export interface MissingView extends BaseView {
    kind: MissingKind;
    phase: MissingPhase;
    thing: string;
    part: string;
    shelf: string[];
    after: string[];
    answers: string[];
    choices: string[];
    /** Tačni odgovori koje je dete već našlo (dva predmeta, dve zamenjene stvari) */
    found: string[];
    /** Pogrešno probani izbori u ovom zadatku */
    wrong: string[];
    /** Poslednji pogrešan izbor dok traje povratna poruka */
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
}

export function emptyMissingView(totalRounds: number): MissingView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "closure",
        phase: "ask",
        thing: "",
        part: "",
        shelf: [],
        after: [],
        answers: [],
        choices: [],
        found: [],
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

/** Polja zadatka u stanju igre; pamćenje počinje gledanjem police */
export function roundView(round: MissingRound): Pick<MissingView, "kind" | "phase" | "thing" | "part" | "shelf" | "after" | "answers" | "choices"> {
    return {
        kind: round.kind,
        phase: round.kind === "closure" ? "ask" : "look",
        thing: round.thing,
        part: round.part,
        shelf: [...round.shelf],
        after: [...round.after],
        answers: [...round.answers],
        choices: [...round.choices],
    };
}

/** Pitanje zadatka (natpis i glas) */
export function missingQuestion(view: Pick<MissingView, "kind" | "phase" | "thing">): string {
    if (view.kind === "closure") return getThing(view.thing)?.dat ? closureQuestion(view.thing as ThingId) : "";
    if (view.phase === "look") return view.kind === "swap" ? LOOK_SWAP_TITLE : LOOK_TITLE;
    if (view.phase === "curtain") return CURTAIN_TEXT;
    return view.kind === "swap" ? SWAP_QUESTION : GONE_QUESTION;
}

/** Dopuna pitanja na ekranu („Fale dve stvari.”) */
export function missingSubtitle(view: Pick<MissingView, "kind" | "phase">): string {
    if (view.phase !== "ask") return "";
    if (view.kind === "gone2") return GONE_TWO_HINT;
    if (view.kind === "swap") return SWAP_HINT;
    return "";
}

/** Koliko tačnih odgovora treba za ceo zadatak */
export function answersNeeded(view: Pick<MissingView, "answers">): number {
    return Math.max(view.answers.length, 1);
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen. Prvi zadatak prvog nivoa pokazuje ruka (pokazni, ne ocenjuje se);
 * „correct” = bez ijedne greške i bez pomoći, „prompted” = uz pomoć (osim pokaznog).
 */
export function solveMissingView(current: MissingView, level: number, solved: Partial<MissingView> = {}): { next: MissingView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
    const next: MissingView = {
        ...current,
        ...solved,
        feedback: "correct",
        hint: false,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

/** Rezultat nivoa: total = zadaci bez pokaznog; correct = iz prvog pokušaja; prompted = uz pomoć */
export function missingResult(final: MissingView, level: number, durationSec: number): GameResult {
    return {
        score: final.score,
        durationSec,
        correct: final.correctCount,
        total: Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1),
        prompted: final.promptedCount,
    };
}

// ── Stanje sa monitora ────────────────────────────────────────────────────────

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeMissingMonitor(state: Partial<MissingView> | null | undefined): MissingView {
    const base = emptyMissingView(1);
    if (!state) return base;
    const kind = MISSING_KINDS.includes(state.kind as MissingKind) ? (state.kind as MissingKind) : "closure";
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const counters = {
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
    };
    const feedback: FeedbackKind = state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null;

    if (kind === "closure") {
        const closure = getClosure(state.part);
        const choices = Array.from(new Set(strings(state.choices).filter((id) => getPart(id) !== undefined)));
        if (!closure || closure.thing !== state.thing || !choices.includes(closure.part)) return { ...base, ...counters };
        const wrong = strings(state.wrong).filter((id) => choices.includes(id) && id !== closure.part);
        return {
            ...base,
            ...counters,
            kind,
            phase: "ask",
            thing: closure.thing,
            part: closure.part,
            answers: [closure.part],
            choices,
            found: strings(state.found).filter((id) => id === closure.part),
            wrong,
            picked: typeof state.picked === "string" && choices.includes(state.picked) ? state.picked : null,
            feedback,
            hint: state.hint === true,
        };
    }

    const shelf = Array.from(new Set(strings(state.shelf).filter((id) => getShelfItem(id) !== undefined))).slice(0, 6);
    const rawAfter = strings(state.after);
    const after = shelf.map((_, i) => (rawAfter[i] && shelf.includes(rawAfter[i]) ? rawAfter[i] : ""));
    const answers = strings(state.answers).filter((id) => shelf.includes(id));
    const valid =
        shelf.length >= 2 &&
        answers.length >= 1 &&
        (kind === "swap"
            ? answers.length === 2 && after.filter(Boolean).length === shelf.length
            : answers.every((id) => !after.includes(id)) && after.filter(Boolean).length === shelf.length - answers.length);
    if (!valid) return { ...base, ...counters };
    const choices = kind === "swap" ? [] : Array.from(new Set(strings(state.choices).filter((id) => shelf.includes(id))));
    if (kind !== "swap" && !answers.every((id) => choices.includes(id))) return { ...base, ...counters };
    const pickable = kind === "swap" ? shelf : choices;
    const phase = MISSING_PHASES.includes(state.phase as MissingPhase) ? (state.phase as MissingPhase) : "look";
    return {
        ...base,
        ...counters,
        kind,
        phase,
        shelf,
        after,
        answers,
        choices,
        found: Array.from(new Set(strings(state.found).filter((id) => answers.includes(id)))),
        wrong: Array.from(new Set(strings(state.wrong).filter((id) => pickable.includes(id) && !answers.includes(id)))),
        picked: typeof state.picked === "string" && pickable.includes(state.picked) ? state.picked : null,
        feedback,
        hint: state.hint === true,
    };
}
