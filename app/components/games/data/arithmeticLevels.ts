// Sadržaj igre „Računanje”: male žive scene u kojima se nešto doda ili oduzme — ptice slete na
// granu i odlete, ribe doplivaju i otplivaju, auta uđu u garažu, rakete slete na planetu, iz
// jaja dinosaurusa izlegu se bebe. Dete prebroji i izabere broj. Kasnije ispod scene stoji
// brojevna rečenica (2 + 1 = ?), pa kutija za jaja sa deset mesta (desetica), kratke priče sa
// imenima i, na kraju, računanje do 20 u dva koraka. Bez Reacta, da bi se nivoi proveravali u
// testovima; crteži su u games/arithmetic/.
//
// Zašto ovako (uzrast 5–10, i deca sa autizmom):
//  • Deca od 5 do 10 godina vole male priče sa životinjama, vozilima, svemirom i dinosaurusima
//    i vole da vide da se nešto zaista desi (uzrok → posledica): ptica sleti, auto izađe.
//    Sabiranje kao „doći još”, a oduzimanje kao „otići” je najlakši ulaz u računanje.
//  • Konkretno → slikovno → apstraktno (CRA, Bruner): prvo predmeti koji se pomeraju, pa
//    predmeti u nizovima po pet (kao desetica), pa brojevna rečenica uz sliku, pa samo rečenica
//    — a slika se vraća kao pomoć posle greške. Desetica (kutija sa 10 mesta) gradi „pet i još”
//    i „dopuni do deset”, osnovu računanja do 20 (prelaz preko desetice: 8 + 5 = 8 + 2 + 3).
//  • Učenje bez greške (errorless learning): prvi zadatak prvog nivoa pokaže ruka (ne
//    ocenjuje se), u početku su samo dva broja, pa tri, pa četiri; pomoć (tačan broj blago
//    zasvetli, a predmeti dobiju redne brojeve dok glas broji zajedno sa detetom) na lakim
//    nivoima stiže već posle prve greške i posle čekanja, a kasnije posle onoliko grešaka
//    koliko roditelj podesi (stimulus fading).
//  • Ponuđeni brojevi su uverljivi (za jedan ili dva više ili manje, broj iz zadatka), uvek
//    različiti i u opsegu nivoa, pa dete ne može da pogodi „po izgledu”.
//  • Predvidljiv raspored (TEACCH): scena gore, rečenica ispod, brojevi na dnu — uvek isto.
//    Glas jednu po jednu rečenicu prati ono što se dešava na sceni; pokret je miran, a kad je
//    uključeno „manje pokreta”, predmeti se samo pojave ili izblede.
//  • Greška nije kazna: kartica se blago označi, glas kaže mirnu činjenicu („Broj je veći od
//    2.”) i kako da računa („Kreni od 6 i broji još 3.”). Nema žurbe ni tajmera.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak. Imena su Amar, Lejla,
//    Haris, Ajla i Tarik; brojevi se slažu sa imenicom (1 ptica, 2 ptice, 5 ptica).
//
// Nivoi: 1–5 lako (do 5, pa do 10 uz scene), 6–10 srednje (oduzimanje do 10, dopuni do 10,
// samo rečenica, broj u kutiji, priče), 11–15 teško (do 20 sa dve desetice, prelaz preko
// desetice, broj koji nedostaje, dva koraka).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";
import { nounForm, numberWord, type NounGender } from "@/app/components/games/data/countingItems";

// ── Imenice, glagoli i brojevi ───────────────────────────────────────────────

interface Noun {
    gender: NounGender;
    /** Uz 1: ptica, auto */
    one: string;
    /** Uz 2–4: ptice, auta */
    few: string;
    /** Uz 5 i više i posle „Koliko”: ptica, auta */
    many: string;
    /** Akuzativ jednine kad se razlikuje (ženski rod): „ima jednu jabuku” */
    oneAcc?: string;
}

export const ITEM_IDS = ["bird", "fish", "ladybug", "car", "toyCar", "apple", "strawberry", "rocket", "egg", "dinoEgg", "balloon", "cupcake"] as const;
export type ItemId = (typeof ITEM_IDS)[number];

const noun = (gender: NounGender, one: string, few: string, many: string, oneAcc?: string): Noun => ({ gender, one, few, many, oneAcc });

export const ITEMS: Readonly<Record<ItemId, Noun>> = {
    bird: noun("f", "ptica", "ptice", "ptica", "pticu"),
    fish: noun("f", "riba", "ribe", "riba", "ribu"),
    ladybug: noun("f", "bubamara", "bubamare", "bubamara", "bubamaru"),
    car: noun("m", "auto", "auta", "auta"),
    toyCar: noun("m", "autić", "autića", "autića"),
    apple: noun("f", "jabuka", "jabuke", "jabuka", "jabuku"),
    strawberry: noun("f", "jagoda", "jagode", "jagoda", "jagodu"),
    rocket: noun("f", "raketa", "rakete", "raketa", "raketu"),
    egg: noun("n", "jaje", "jajeta", "jaja"),
    dinoEgg: noun("n", "jaje", "jajeta", "jaja"),
    balloon: noun("m", "balon", "balona", "balona"),
    cupcake: noun("m", "kolač", "kolača", "kolača"),
};

export function isItem(value: unknown): value is ItemId {
    return typeof value === "string" && (ITEM_IDS as readonly string[]).includes(value);
}

const DINO = noun("m", "dinosaurus", "dinosaurusa", "dinosaurusa");

/** Glagolski pridev: osnova („doletel”) i muški oblik jednine („doleteo”) */
interface Verb {
    stem: string;
    mOne: string;
}
const verb = (stem: string, mOne: string): Verb => ({ stem, mOne });

const FLY_IN = verb("doletel", "doleteo");
const FLY_OFF = verb("odletel", "odleteo");
const LAND = verb("sletel", "sleteo");
const LIFT_OFF = verb("poletel", "poleteo");
const SWIM_IN = verb("doplival", "doplivao");
const SWIM_OFF = verb("otplival", "otplivao");
const DRIVE_IN = verb("ušl", "ušao");
const DRIVE_OUT = verb("izašl", "izašao");
const FALL = verb("pal", "pao");
const STAY = verb("ostal", "ostao");
const HATCH = verb("izlegl", "izlegao");

/** Oblik glagola uz broj: doletela je jedna, doletele su dve, doletelo je pet */
export function verbForm(v: Verb, gender: NounGender, count: number): string {
    const form = nounForm(count);
    if (form === "one") return gender === "m" ? v.mOne : `${v.stem}${gender === "f" ? "a" : "o"}`;
    if (form === "few") return `${v.stem}${gender === "f" ? "e" : "a"}`;
    return `${v.stem}o`;
}

/** Pomoćni glagol uz broj: jedna ptica je, dve ptice su, pet ptica je */
function aux(count: number): "je" | "su" {
    return nounForm(count) === "few" ? "su" : "je";
}

function cap(text: string): string {
    return text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);
}

function lower(text: string): string {
    return text.charAt(0).toLocaleLowerCase("sr") + text.slice(1);
}

/** Broj: cifrom za tekst, rečju (u rodu imenice) za glas */
function num(count: number, gender: NounGender, voice: boolean): string {
    return voice ? numberWord(count, gender) : String(count);
}

/** Broj kao predmet rečenice u akuzativu: „jednu” (ženski rod), inače kao u nominativu */
function numAcc(count: number, gender: NounGender, voice: boolean): string {
    if (voice && count === 1 && gender === "f") return "jednu";
    return num(count, gender, voice);
}

/** „3 ptice” / „tri ptice” */
function phrase(count: number, item: Noun, voice: boolean): string {
    return `${num(count, item.gender, voice)} ${item[nounForm(count)]}`;
}

/** Akuzativ: „ima jednu jabuku”, „ima tri jabuke” */
function phraseAcc(count: number, item: Noun, voice: boolean): string {
    const form = nounForm(count);
    const word = form === "one" && item.oneAcc ? item.oneAcc : item[form];
    return `${numAcc(count, item.gender, voice)} ${word}`;
}

/** Broj bez imenice (računanje): cifra ili reč u muškom rodu */
function bare(count: number, voice: boolean): string {
    return voice ? numberWord(count) : String(count);
}

// ── Scene i okviri (teme) ────────────────────────────────────────────────────

/** Kako se nešto doda ili oduzme: sam predmet (ptica doleti) ili neko drugi (baka donese) */
type Move = { by: "self"; verb: Verb; more: boolean } | { by: "agent"; agent: string; part: string; more: boolean } | { by: "hatch" };

export const THEME_IDS = ["branch", "pond", "leaf", "garage", "basket", "space", "nest", "carton", "parking", "crate", "table", "park"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Crtež: scena (predmeti u redovima po pet) ili okviri sa deset mesta */
export type DrawMode = "scene" | "frames";

export interface Theme {
    id: ThemeId;
    item: ItemId;
    draw: DrawMode;
    /** „Na grani” (za okvire: jedan okvir) */
    place: string;
    /** Dva okvira: „U kutijama” */
    places?: string;
    arrive?: Move;
    leave?: Move;
    /** Za izlegla jaja: koliko je CELIH jaja ostalo */
    whole?: { one: string; few: string; many: string };
    /** „Dopuni do 10”: kutija, parking, gajbica */
    container?: { has: string; inside: string; into: string; full: string };
}

const self = (v: Verb, more = false): Move => ({ by: "self", verb: v, more });
const agent = (who: string, part: string, more = false): Move => ({ by: "agent", agent: who, part, more });

export const THEMES: Readonly<Record<ThemeId, Theme>> = {
    branch: { id: "branch", item: "bird", draw: "scene", place: "Na grani", arrive: self(FLY_IN, true), leave: self(FLY_OFF) },
    pond: { id: "pond", item: "fish", draw: "scene", place: "U jezeru", arrive: self(SWIM_IN, true), leave: self(SWIM_OFF) },
    leaf: { id: "leaf", item: "ladybug", draw: "scene", place: "Na listu", arrive: self(LAND, true), leave: self(FLY_OFF) },
    garage: { id: "garage", item: "car", draw: "scene", place: "U garaži", arrive: self(DRIVE_IN, true), leave: self(DRIVE_OUT) },
    basket: { id: "basket", item: "apple", draw: "scene", place: "U korpi", arrive: self(FALL, true), leave: agent("Mama", "uzela") },
    space: { id: "space", item: "rocket", draw: "scene", place: "Na planeti", arrive: self(LAND, true), leave: self(LIFT_OFF) },
    nest: {
        id: "nest",
        item: "dinoEgg",
        draw: "scene",
        place: "U gnezdu",
        arrive: agent("Mama dinosaurus", "snela", true),
        leave: { by: "hatch" },
        whole: { one: "celo", few: "cela", many: "celih" },
    },
    carton: {
        id: "carton",
        item: "egg",
        draw: "frames",
        place: "U kutiji",
        places: "U kutijama",
        arrive: agent("Baka", "donela", true),
        leave: agent("Baka", "uzela"),
        container: { has: "Kutija ima mesta za", inside: "U njoj", into: "u kutiju", full: "kutija je puna" },
    },
    parking: {
        id: "parking",
        item: "car",
        draw: "frames",
        place: "Na parkingu",
        places: "Na parkingu",
        arrive: self(DRIVE_IN, true),
        leave: self(DRIVE_OUT),
        container: { has: "Parking ima mesta za", inside: "Na njemu", into: "na parking", full: "parking je pun" },
    },
    crate: {
        id: "crate",
        item: "apple",
        draw: "frames",
        place: "U gajbici",
        places: "U gajbicama",
        arrive: agent("Deda", "ubrao", true),
        leave: agent("Mama", "uzela"),
        container: { has: "Gajbica ima mesta za", inside: "U njoj", into: "u gajbicu", full: "gajbica je puna" },
    },
    table: { id: "table", item: "cupcake", draw: "scene", place: "Na stolu" },
    park: { id: "park", item: "balloon", draw: "scene", place: "U parku" },
};

export function isTheme(value: unknown): value is ThemeId {
    return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

/** Scene u kojima se predmeti i dodaju i oduzimaju */
const SCENE_THEMES: readonly ThemeId[] = ["branch", "pond", "leaf", "garage", "basket", "space", "nest"];
const FRAME_THEMES: readonly ThemeId[] = ["carton", "parking", "crate"];

// ── Imena (priče) ─────────────────────────────────────────────────────────────

export const NAME_IDS = ["amar", "lejla", "haris", "ajla", "tarik"] as const;
export type NameId = (typeof NAME_IDS)[number];

export const NAMES: Readonly<Record<NameId, { name: string; dative: string; female: boolean }>> = {
    amar: { name: "Amar", dative: "Amaru", female: false },
    lejla: { name: "Lejla", dative: "Lejli", female: true },
    haris: { name: "Haris", dative: "Harisu", female: false },
    ajla: { name: "Ajla", dative: "Ajli", female: true },
    tarik: { name: "Tarik", dative: "Tariku", female: false },
};

export function isName(value: unknown): value is NameId {
    return typeof value === "string" && (NAME_IDS as readonly string[]).includes(value);
}

/** Korak priče: šta se desilo sa predmetima */
export const STEP_IDS = ["give", "gift", "pick", "flyAway", "eat", "giveAway"] as const;
export type StepId = (typeof STEP_IDS)[number];

/** Koji koraci dodaju (+), a koji oduzimaju (−) */
const STEP_OP: Readonly<Record<StepId, Op>> = { give: "+", gift: "+", pick: "+", flyAway: "-", eat: "-", giveAway: "-" };

/** Predmeti priča: gde se crtaju i šta se sa njima može desiti */
const STORY_ITEMS: readonly { item: ItemId; theme: ThemeId; plus: StepId[]; minus: StepId[] }[] = [
    { item: "balloon", theme: "park", plus: ["give", "gift"], minus: ["flyAway", "giveAway"] },
    { item: "cupcake", theme: "table", plus: ["give"], minus: ["eat", "giveAway"] },
    { item: "strawberry", theme: "basket", plus: ["pick", "give"], minus: ["eat", "giveAway"] },
    { item: "apple", theme: "basket", plus: ["pick", "give"], minus: ["eat", "giveAway"] },
    { item: "toyCar", theme: "table", plus: ["gift", "give"], minus: ["giveAway"] },
];

// ── Zadatak ───────────────────────────────────────────────────────────────────

export type Op = "+" | "-";

/**
 *  change   — scena: bilo je a, došlo je (ili otišlo) b → koliko je sada?
 *  make10   — okvir sa deset mesta: koliko još stane?
 *  box      — deo predmeta je u kutiji: koliko ih je u kutiji? (a + ? = c)
 *  equation — samo brojevna rečenica; predmeti tek kao pomoć
 *  story    — kratka priča sa imenima (jedan ili dva koraka)
 */
export const TASK_KINDS = ["change", "make10", "box", "equation", "story"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export interface ArithmeticTask {
    kind: TaskKind;
    theme: ThemeId;
    /** Šta se crta (predmet teme ili predmet priče) */
    item: ItemId;
    draw: DrawMode;
    /** Cela rečenica, sa svim brojevima: terms[0] ops[0] terms[1] … = rezultat */
    terms: number[];
    ops: Op[];
    /** Koji broj se traži: −1 = rezultat, inače mesto u `terms` */
    unknown: number;
    /** Ponuđeni brojevi (rastuće) */
    choices: number[];
    /** Brojevna rečenica ispod slike */
    sentence: boolean;
    /** Predmeti se vide tek uz pomoć ili posle greške */
    hidden: boolean;
    /** Prelaz preko desetice: 8 + 5 kao 8 + 2 + 3 */
    split: boolean;
    /** Tačkice ispod brojeva na karticama (najlakši nivoi) */
    dots: boolean;
    /** Priča: ko ima (0), ko daje ili prima (1, 2) */
    names: NameId[];
    /** Priča: šta se desilo u svakom koraku */
    steps: StepId[];
}

/** Rezultat cele rečenice */
export function evaluate(terms: readonly number[], ops: readonly Op[]): number {
    let total = terms[0] ?? 0;
    ops.forEach((op, i) => {
        total += op === "+" ? (terms[i + 1] ?? 0) : -(terms[i + 1] ?? 0);
    });
    return total;
}

export function taskResult(task: Pick<ArithmeticTask, "terms" | "ops">): number {
    return evaluate(task.terms, task.ops);
}

/** Broj koji dete treba da izabere */
export function taskAnswer(task: Pick<ArithmeticTask, "terms" | "ops" | "unknown">): number {
    return task.unknown < 0 ? taskResult(task) : (task.terms[task.unknown] ?? 0);
}

/** Koliko pokreta ima scena pre pitanja (doleti, pa odleti) */
export function moveCount(task: Pick<ArithmeticTask, "kind" | "ops" | "unknown">): number {
    return (task.kind === "change" || task.kind === "story") && task.unknown < 0 ? task.ops.length : 0;
}

// ── Predmeti na slici ─────────────────────────────────────────────────────────

/**
 *  base   — tu je od početka
 *  arrive — dolazi u koraku `step`
 *  leave  — odlazi u koraku `step` (posle ostaje bled trag)
 *  hidden — skriven (u kutiji ili broj koji se traži); vidi se tek uz pomoć
 *  empty  — prazno mesto u okviru
 */
export type TokenKind = "base" | "arrive" | "leave" | "hidden" | "empty";

export interface Token {
    /** Mesto u redovima po pet (u kutiji: mesto u kutiji) */
    slot: number;
    kind: TokenKind;
    step: number;
    /** U kutiji (zadatak „box”) */
    inBox: boolean;
    /** Ovi se broje u pomoći (redni broj na predmetu) — ukupno ih je koliko je tačan odgovor */
    counted: boolean;
}

const token = (slot: number, kind: TokenKind, step = 0, counted = false, inBox = false): Token => ({ slot, kind, step, counted, inBox });

/** Svi predmeti zadatka i šta se sa kojim dešava. Brojanih je uvek tačno koliko je odgovor. */
export function tokensFor(task: Pick<ArithmeticTask, "kind" | "terms" | "ops" | "unknown">): Token[] {
    const [a = 0, b = 0] = task.terms;
    const range = (from: number, count: number) => Array.from({ length: Math.max(0, count) }, (_, i) => from + i);
    if (task.kind === "make10") {
        return [...range(0, a).map((slot) => token(slot, "base")), ...range(a, 10 - a).map((slot) => token(slot, "empty", 0, true))];
    }
    if (task.kind === "box") {
        return [...range(0, a).map((slot) => token(slot, "base")), ...range(0, b).map((slot) => token(slot, "hidden", 0, true, true))];
    }
    if (task.unknown >= 0) {
        const op = task.ops[0];
        if (op === "+" && task.unknown === 1) return [...range(0, a).map((slot) => token(slot, "base")), ...range(a, b).map((slot) => token(slot, "hidden", 0, true))];
        if (op === "+" && task.unknown === 0) return [...range(0, a).map((slot) => token(slot, "hidden", 0, true)), ...range(a, b).map((slot) => token(slot, "base"))];
        // a − b = c: svih a se broji kad se traži a; kad se traži b, broje se oni koji su otišli
        const wantStart = task.unknown === 0;
        return range(0, a).map((slot) => (slot < a - b ? token(slot, "base", 0, wantStart) : token(slot, "leave", 1, true)));
    }
    // Rezultat: počinje se od a, pa redom koraci (doleti / odleti)
    const tokens: Token[] = range(0, a).map((slot) => token(slot, "base"));
    let next = a;
    task.ops.forEach((op, i) => {
        const count = task.terms[i + 1] ?? 0;
        if (op === "+") {
            for (const slot of range(next, count)) tokens.push(token(slot, "arrive", i + 1));
            next += count;
            return;
        }
        // Odlaze poslednji koji su još tu
        const present = tokens.filter((t) => t.kind === "base" || t.kind === "arrive").sort((x, y) => y.slot - x.slot);
        for (const t of present.slice(0, count)) {
            t.kind = "leave";
            t.step = i + 1;
        }
    });
    for (const t of tokens) t.counted = t.kind !== "leave";
    return tokens.sort((x, y) => x.slot - y.slot);
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

const SIGN: Readonly<Record<Op, string>> = { "+": "+", "-": "−" };
const SAID: Readonly<Record<Op, string>> = { "+": "plus", "-": "minus" };

/** Brojevna rečenica za prikaz: „2 + 1 = ?” (umesto broja koji se traži stoji `null`) */
export function sentenceParts(task: Pick<ArithmeticTask, "terms" | "ops" | "unknown">): { values: (number | null)[]; signs: string[]; result: number | null } {
    return {
        values: task.terms.map((value, i) => (i === task.unknown ? null : value)),
        signs: task.ops.map((op) => SIGN[op]),
        result: task.unknown < 0 ? null : taskResult(task),
    };
}

/** „6 + 3 = 9” / „šest plus tri je devet” */
function equationText(task: Pick<ArithmeticTask, "terms" | "ops">, voice: boolean): string {
    const left = task.terms.map((value, i) => (i === 0 ? bare(value, voice) : `${voice ? SAID[task.ops[i - 1]] : SIGN[task.ops[i - 1]]} ${bare(value, voice)}`)).join(" ");
    return `${left} ${voice ? "je" : "="} ${bare(taskResult(task), voice)}`;
}

/** Prelaz preko desetice: „8 + 2 + 3” */
export function splitText(task: Pick<ArithmeticTask, "terms">): string {
    const [a = 0, b = 0] = task.terms;
    const fill = 10 - a;
    return `${a} + ${fill} + ${b - fill}`;
}

/** Okviri: dva (do 20) ili jedan (dopuni do 10) */
export function twoFrames(task: Pick<ArithmeticTask, "draw" | "kind">): boolean {
    return task.draw === "frames" && task.kind !== "make10";
}

function placeOf(theme: Theme, many: boolean): string {
    return many && theme.places ? theme.places : theme.place;
}

/** Jedan pokret: „Doletela je još 1.” / „Onda su odletele 2.” */
function moveSentence(theme: Theme, item: Noun, move: Move, count: number, voice: boolean, then: boolean): string {
    if (move.by === "hatch") {
        const verbText = verbForm(HATCH, DINO.gender, count);
        const se = aux(count) === "su" ? "su se" : "se";
        const what = phrase(count, DINO, voice);
        return then ? `Onda ${se} ${verbText} ${what}.` : `${cap(verbText)} ${se} ${what}.`;
    }
    const more = move.more ? "još " : "";
    if (move.by === "agent") {
        const amount = numAcc(count, item.gender, voice);
        return then ? `Onda je ${lower(move.agent)} ${move.part} ${more}${amount}.` : `${move.agent} je ${move.part} ${more}${amount}.`;
    }
    const verbText = verbForm(move.verb, item.gender, count);
    const amount = num(count, item.gender, voice);
    return then ? `Onda ${aux(count)} ${verbText} ${more}${amount}.` : `${cap(verbText)} ${aux(count)} ${more}${amount}.`;
}

/** „Na grani su 2 ptice.” */
function thereAre(theme: Theme, item: Noun, count: number, voice: boolean, many: boolean): string {
    return `${placeOf(theme, many)} ${aux(count)} ${phrase(count, item, voice)}.`;
}

/** Priča: „Lejla mu je dala još 4.” */
function storySentence(task: ArithmeticTask, step: StepId, count: number, voice: boolean, then: boolean): string {
    const item = ITEMS[task.item];
    const hero = NAMES[task.names[0] ?? "amar"];
    const other = NAMES[task.names[1] ?? "lejla"];
    const g = (male: string, female: string, who = hero) => (who.female ? female : male);
    const amount = numAcc(count, item.gender, voice);
    // Kome je dao: treće ime u priči (ako ga ima), da ne vrati poklon onome ko ga je dao
    const receiver = NAMES[task.names[2] ?? task.names[1] ?? "lejla"];
    switch (step) {
        case "give": {
            const to = hero.female ? "joj" : "mu";
            return then ? `Onda ${to} je ${other.name} ${g("dao", "dala", other)} još ${amount}.` : `${other.name} ${to} je ${g("dao", "dala", other)} još ${amount}.`;
        }
        case "gift":
            return `${then ? "Onda je" : "Za rođendan je"} ${g("dobio", "dobila")} još ${amount}.`;
        case "pick":
            return then ? `Onda je ${g("ubrao", "ubrala")} još ${amount}.` : `${cap(g("ubrao", "ubrala"))} je još ${amount}.`;
        case "flyAway": {
            const verbText = verbForm(FLY_OFF, item.gender, count);
            const plain = num(count, item.gender, voice);
            return then ? `Onda ${aux(count)} ${verbText} ${plain}.` : `${cap(verbText)} ${aux(count)} ${plain}.`;
        }
        case "eat":
            return then ? `Onda je ${g("pojeo", "pojela")} ${amount}.` : `${cap(g("pojeo", "pojela"))} je ${amount}.`;
        case "giveAway":
            return then ? `Onda je ${g("dao", "dala")} ${receiver.dative} ${amount}.` : `${cap(g("dao", "dala"))} je ${receiver.dative} ${amount}.`;
    }
}

/** Delovi pitanja redom: uvod, pokreti (po jedan za svaki korak scene) i pitanje */
export function questionParts(task: ArithmeticTask, voice = false): string[] {
    const theme = THEMES[task.theme];
    const item = ITEMS[task.item];
    const a = task.terms[0] ?? 0;
    const many = twoFrames(task);
    const result = taskResult(task);

    if (task.kind === "make10") {
        const box = theme.container ?? THEMES.carton.container!;
        return [`${box.has} ${bare(10, voice)} ${item.many}. ${box.inside} ${aux(a)} ${phrase(a, item, voice)}. Koliko još ${item.many} stane ${box.into}?`];
    }
    if (task.kind === "box") {
        return [`Ukupno ima ${phrase(result, item, voice)}. Van kutije ${aux(a)} ${phrase(a, item, voice)}. Koliko je ${item.many} u kutiji?`];
    }
    if (task.kind === "equation") {
        const [x = 0, y = 0] = task.terms;
        const op = task.ops[0];
        if (task.unknown < 0) {
            const left = task.terms.map((value, i) => (i === 0 ? bare(value, voice) : `${voice ? SAID[task.ops[i - 1]] : SIGN[task.ops[i - 1]]} ${bare(value, voice)}`)).join(" ");
            return [`Koliko je ${left}?`];
        }
        if (op === "+" && task.unknown === 1) return [`Koliko treba dodati na ${bare(x, voice)} da bude ${bare(result, voice)}?`];
        if (op === "+") return [`Na koji broj treba dodati ${bare(y, voice)} da bude ${bare(result, voice)}?`];
        if (task.unknown === 0) return [`Od kog broja, kad oduzmemo ${bare(y, voice)}, ostane ${bare(result, voice)}?`];
        return [`Koliko treba oduzeti od ${bare(x, voice)} da ostane ${bare(result, voice)}?`];
    }
    if (task.kind === "story") {
        const hero = NAMES[task.names[0] ?? "amar"];
        const intro = `${hero.name} ima ${phraseAcc(a, item, voice)}.`;
        const moves = task.steps.map((step, i) => storySentence(task, step, task.terms[i + 1] ?? 0, voice, i > 0));
        return [intro, ...moves, `Koliko ${item.many} ${hero.name} ima sada?`];
    }
    // Scena: bilo je, pa se desilo (jednom ili dvaput)
    const moves = task.ops.map((op, i) => {
        const move = op === "+" ? theme.arrive : theme.leave;
        return move ? moveSentence(theme, item, move, task.terms[i + 1] ?? 0, voice, i > 0) : "";
    });
    const placeLower = lower(placeOf(theme, many));
    const ending = task.ops.length === 1 && task.ops[0] === "-" ? `Koliko je ${theme.whole ? `${theme.whole.many} ` : ""}${item.many} ostalo ${placeLower}?` : `Koliko je sada ${item.many} ${placeLower}?`;
    return [thereAre(theme, item, a, voice, many), ...moves, ending];
}

/** Celo pitanje u jednom redu (natpis i dugme „Ponovi”) */
export function questionText(task: ArithmeticTask, voice = false): string {
    return questionParts(task, voice).join(" ");
}

/** Posle tačnog odgovora: šta je sada na slici (`equation`: sa računom ispred, za glas) */
export function correctSentence(task: ArithmeticTask, voice = false, equation = true): string {
    const theme = THEMES[task.theme];
    const item = ITEMS[task.item];
    const answer = taskAnswer(task);
    const result = taskResult(task);
    if (task.kind === "make10") {
        const box = theme.container ?? THEMES.carton.container!;
        return `Još ${phrase(answer, item, voice)} i ${box.full}.`;
    }
    if (task.kind === "box") return `U kutiji ${aux(answer)} ${phrase(answer, item, voice)}.`;
    if (task.kind === "equation") return `${cap(equationText(task, voice))}.`;
    if (task.kind === "story") {
        const hero = NAMES[task.names[0] ?? "amar"];
        return `${equation ? `${cap(equationText(task, voice))}. ` : ""}${hero.name} sada ima ${phraseAcc(result, item, voice)}.`;
    }
    const place = placeOf(theme, twoFrames(task));
    const lead = task.sentence && equation ? `${cap(equationText(task, voice))}. ` : "";
    if (task.ops.length === 1 && task.ops[0] === "-") {
        const what = theme.whole ? `${num(result, item.gender, voice)} ${theme.whole[nounForm(result)]} ${item[nounForm(result)]}` : phrase(result, item, voice);
        return `${lead}${place} ${aux(result)} ${verbForm(STAY, item.gender, result)} ${what}.`;
    }
    return `${lead}${place} ${aux(result)} sada ${phrase(result, item, voice)}.`;
}

/** Posle pogrešnog broja: mirna činjenica */
export function mistakeSentence(task: Pick<ArithmeticTask, "terms" | "ops" | "unknown">, picked: number, voice = false): string {
    const answer = taskAnswer(task);
    return `Broj je ${answer > picked ? "veći" : "manji"} od ${bare(picked, voice)}.`;
}

/** Kako da računa (srednji i teški nivoi, pre nego što stigne pomoć) */
export function tipSentence(task: ArithmeticTask, voice = false): string {
    const [a = 0, b = 0, c = 0] = task.terms;
    const result = taskResult(task);
    const n = (value: number) => bare(value, voice);
    if (task.kind === "make10") return "Prebroj prazna mesta.";
    if (task.split) return `Prvo dopuni do ${n(10)}: ${n(a)} ${voice ? "plus" : "+"} ${n(10 - a)}. Pa još ${n(b - (10 - a))}.`;
    if (task.ops.length === 2) {
        const first = `${n(a)} ${voice ? SAID[task.ops[0]] : SIGN[task.ops[0]]} ${n(b)}`;
        return `Prvo ${first}. Pa ${task.ops[1] === "+" ? "dodaj" : "oduzmi"} ${n(c)}.`;
    }
    if (task.kind === "box" || (task.unknown === 1 && task.ops[0] === "+")) return `Broji od ${n(a)} do ${n(result)}.`;
    if (task.unknown === 0 && task.ops[0] === "+") return `Broji od ${n(b)} do ${n(result)}.`;
    if (task.unknown === 0) return `Saberi ${n(result)} i ${n(b)}.`;
    if (task.unknown === 1) return `Broji unazad od ${n(a)} do ${n(result)}.`;
    return task.ops[0] === "+" ? `Kreni od ${n(a)} i broji još ${n(b)}.` : `Kreni od ${n(a)} i broji unazad ${n(b)}.`;
}

/** Pomoć: brojimo zajedno („Brojimo zajedno: jedan, dva, tri. Ima ih tri.”) */
export function countSentence(task: ArithmeticTask, voice = false): string {
    const answer = taskAnswer(task);
    if (answer > 10) return `${cap(bare(10, voice))} i još ${bare(answer - 10, voice)} je ${bare(answer, voice)}.`;
    const counted = Array.from({ length: answer }, (_, i) => bare(i + 1, voice)).join(", ");
    let lead = "Brojimo zajedno:";
    if (task.kind === "make10") lead = "Brojimo prazna mesta:";
    else if (task.kind === "box") lead = "Brojimo šta je u kutiji:";
    else if (task.unknown >= 0 && !(task.ops[0] === "-" && task.unknown === 0)) lead = task.ops[0] === "+" ? "Brojimo koliko fali:" : "Brojimo koliko je otišlo:";
    else if (task.unknown < 0 && task.ops.length === 1 && task.ops[0] === "-") lead = "Brojimo koliko je ostalo:";
    // Prazna mesta su „mesta” (srednji rod), inače rod predmeta: „Ima ih dve.” (ptice)
    const gender: NounGender = task.kind === "make10" ? "n" : task.kind === "equation" ? "m" : ITEMS[task.item].gender;
    const total = answer === 1 ? `Samo ${num(1, gender, voice)}.` : `Ima ih ${num(answer, gender, voice)}.`;
    return `${lead} ${counted}. ${total}`;
}

export const RETRY = "Probaj ponovo.";
export const RETRY_SLOW = "Probaj još jednom, polako.";

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/** Vrste računa po nivoima (vidi `pickNumbers`) */
type Plan =
    | "add5"
    | "add5wide"
    | "sub5"
    | "mix5"
    | "add10"
    | "sub10"
    | "make10"
    | "equation10"
    | "box10"
    | "story10"
    | "add20"
    | "sub20"
    | "bridge"
    | "missing20"
    | "twoStep";

export interface ArithmeticLevel {
    plan: Plan;
    kind: TaskKind;
    themes: readonly ThemeId[];
    /** Najveći broj u zadacima i među ponuđenima */
    max: number;
    choices: number;
    rounds: number;
    sentence: boolean;
    hidden: boolean;
    dots: boolean;
    earlyHint: boolean;
}

const lvl = (plan: Plan, kind: TaskKind, themes: readonly ThemeId[], max: number, choices: number, rounds: number, extra: Partial<ArithmeticLevel> = {}): ArithmeticLevel => ({
    plan,
    kind,
    themes,
    max,
    choices,
    rounds,
    sentence: true,
    hidden: false,
    dots: false,
    earlyHint: false,
    ...extra,
});

export const ARITHMETIC_LEVELS: readonly ArithmeticLevel[] = [
    // Lako: do 5 uz žive scene, pa do 10; rečenica se pojavljuje od 4. nivoa
    lvl("add5", "change", ["branch", "pond", "leaf"], 5, 2, 4, { sentence: false, dots: true, earlyHint: true }),
    lvl("add5wide", "change", SCENE_THEMES, 5, 2, 5, { sentence: false, dots: true, earlyHint: true }),
    lvl("sub5", "change", SCENE_THEMES, 5, 3, 5, { sentence: false, dots: true, earlyHint: true }),
    lvl("mix5", "change", SCENE_THEMES, 5, 3, 5, { earlyHint: true }),
    lvl("add10", "change", SCENE_THEMES, 10, 3, 5, { earlyHint: true }),
    // Srednje: oduzimanje do 10, dopuni do 10, samo rečenica, broj u kutiji, priče
    lvl("sub10", "change", SCENE_THEMES, 10, 4, 6),
    lvl("make10", "make10", FRAME_THEMES, 10, 4, 6),
    lvl("equation10", "equation", SCENE_THEMES, 10, 4, 6, { hidden: true }),
    lvl("box10", "box", ["table"], 10, 4, 6),
    lvl("story10", "story", ["park", "table", "basket"], 10, 4, 6),
    // Teško: do 20 sa dve desetice, prelaz preko desetice, broj koji nedostaje, dva koraka
    lvl("add20", "change", FRAME_THEMES, 20, 4, 6),
    lvl("sub20", "change", FRAME_THEMES, 20, 4, 6),
    lvl("bridge", "change", FRAME_THEMES, 20, 4, 6),
    lvl("missing20", "equation", FRAME_THEMES, 20, 4, 6, { hidden: true }),
    lvl("twoStep", "story", ["park", "table", "basket", ...FRAME_THEMES], 20, 4, 6, { hidden: true }),
];

export const ARITHMETIC_MAX_LEVEL = ARITHMETIC_LEVELS.length;

export function arithmeticLevel(level: number): ArithmeticLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), ARITHMETIC_MAX_LEVEL);
    return ARITHMETIC_LEVELS[safe - 1];
}

interface BuildOptions {
    maxRounds: number;
    maxChoices: number;
    random?: () => number;
    /** Ime deteta: lik u priči ne nosi isto ime */
    childName?: string;
}

type Numbers = { terms: number[]; ops: Op[]; unknown: number };

/** Brojevi jednog zadatka za dati nivo. `int(a, b)` daje ceo broj od a do b. */
function pickNumbers(plan: Plan, int: (min: number, max: number) => number, coin: () => boolean, index: number): Numbers {
    const add = (a: number, b: number): Numbers => ({ terms: [a, b], ops: ["+"], unknown: -1 });
    const sub = (a: number, b: number): Numbers => ({ terms: [a, b], ops: ["-"], unknown: -1 });
    switch (plan) {
        case "add5": {
            const b = int(1, 2);
            return add(int(1, 5 - b), b);
        }
        case "add5wide": {
            const sum = int(3, 5);
            const b = int(1, Math.min(3, sum - 1));
            return add(sum - b, b);
        }
        case "sub5": {
            const a = int(2, 5);
            return sub(a, int(1, a - 1));
        }
        case "mix5": {
            // Naizmenično: sabiranje, pa oduzimanje
            if (index % 2 === 0) {
                const sum = int(3, 5);
                const b = int(1, sum - 1);
                return add(sum - b, b);
            }
            const a = int(3, 5);
            return sub(a, int(1, a - 1));
        }
        case "add10": {
            const sum = int(6, 10);
            const b = int(1, Math.min(5, sum - 2));
            return add(sum - b, b);
        }
        case "sub10": {
            const a = int(6, 10);
            return sub(a, int(1, Math.min(5, a - 1)));
        }
        case "make10": {
            const a = int(3, 9);
            return { terms: [a, 10 - a], ops: ["+"], unknown: 1 };
        }
        case "equation10": {
            if (coin()) {
                const sum = int(4, 10);
                const b = int(1, sum - 1);
                return add(sum - b, b);
            }
            const a = int(4, 10);
            return sub(a, int(1, a - 1));
        }
        case "box10": {
            const total = int(4, 10);
            const hidden = int(1, Math.min(6, total - 2));
            return { terms: [total - hidden, hidden], ops: ["+"], unknown: 1 };
        }
        case "story10": {
            if (index % 2 === 0) {
                const sum = int(4, 10);
                const b = int(1, Math.min(5, sum - 2));
                return add(sum - b, b);
            }
            const a = int(4, 10);
            return sub(a, int(1, Math.min(5, a - 1)));
        }
        case "add20": {
            // Do 20 bez prelaza: desetica i još (10 + 4, 13 + 5)
            const a = int(10, 16);
            return add(a, int(2, Math.max(2, 19 - a)));
        }
        case "sub20": {
            const a = int(12, 19);
            return sub(a, int(2, a - 10));
        }
        case "bridge": {
            const a = int(6, 9);
            return add(a, int(11 - a, 9));
        }
        case "missing20": {
            const form = index % 3;
            if (form === 0) {
                // 6 + ? = 15
                const a = int(3, 10);
                return { terms: [a, int(Math.max(2, 11 - a), Math.min(9, 20 - a))], ops: ["+"], unknown: 1 };
            }
            if (form === 1) {
                // ? − 5 = 9
                const b = int(2, 9);
                const c = int(Math.max(2, 11 - b), 20 - b);
                return { terms: [b + c, b], ops: ["-"], unknown: 0 };
            }
            // 14 − ? = 8
            const a = int(11, 20);
            return { terms: [a, int(2, Math.min(9, a - 2))], ops: ["-"], unknown: 1 };
        }
        case "twoStep": {
            if (coin()) {
                // 5 + 3 − 2
                const a = int(3, 12);
                const b = int(2, Math.min(8, 20 - a));
                let c = int(1, Math.min(8, a + b - 1));
                // Ne isto koliko je došlo (5 + 3 − 3 bi bilo bez računanja)
                if (c === b) c = c > 1 ? c - 1 : c + 1;
                return { terms: [a, b, c], ops: ["+", "-"], unknown: -1 };
            }
            // 12 − 4 + 3
            const a = int(6, 15);
            const b = int(2, Math.min(8, a - 1));
            // Oni koji odu ostaju kao bled trag, pa novi idu na sledeća mesta: a + c ≤ 20
            let c = int(1, Math.min(8, 20 - a));
            if (c === b) c = c > 1 ? c - 1 : c + 1;
            return { terms: [a, b, c], ops: ["-", "+"], unknown: -1 };
        }
    }
}

/**
 * Ponuđeni brojevi: tačan jednom, ostali uverljivi (za 1 i 2 više ili manje, broj iz zadatka,
 * rezultat suprotnog računa), svi različiti i od 1 do `max`. Prikazuju se rastuće, kao na
 * brojevnoj pravoj; uverljivi brojevi se biraju nasumično, pa tačan nije uvek u sredini.
 */
export function pickChoices(task: Pick<ArithmeticTask, "terms" | "ops" | "unknown" | "kind">, count: number, max: number, random: () => number): number[] {
    const answer = taskAnswer(task);
    const result = taskResult(task);
    const [a = 0, b = 0] = task.terms;
    const related = [answer - 1, answer + 1, answer - 2, answer + 2, ...task.terms.filter((_, i) => i !== task.unknown)];
    if (task.unknown >= 0) related.push(result);
    if (task.ops.length === 1) related.push(task.ops[0] === "+" ? Math.abs(a - b) : a + b);
    if (task.kind === "make10") related.push(10);
    const fits = (value: number) => Number.isInteger(value) && value >= 1 && value <= max && value !== answer;
    const pool = Array.from(new Set(related.filter(fits)));
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const need = Math.max(1, count - 1);
    const chosen = pool.slice(0, need);
    // Malo uverljivih (npr. odgovor 1 do 5): dopuni najbližim brojevima
    for (let d = 1; chosen.length < need && d <= max; d += 1) {
        for (const value of [answer + d, answer - d]) if (chosen.length < need && fits(value) && !chosen.includes(value)) chosen.push(value);
    }
    if (chosen.length < need && answer !== 0 && !chosen.includes(0)) chosen.push(0);
    return [answer, ...chosen].sort((x, y) => x - y);
}

/** Koliko brojeva dete vidi: po nivou, ali ne više nego što roditelj dozvoli i ne manje od dva */
export function choiceCount(level: number, maxChoices: number): number {
    const rule = arithmeticLevel(level);
    const limit = Number.isFinite(maxChoices) ? maxChoices : rule.choices;
    return Math.max(2, Math.min(rule.choices, limit));
}

/**
 * Plan nivoa: zadaci jedan za drugim, bez dva ista zadatka i bez iste scene dvaput zaredom.
 * Prvi zadatak prvog nivoa (pokazni) je uvek isti: na grani su dve ptice, doleti još jedna.
 * `random` daje [0, 1).
 */
export function buildArithmeticLevel(level: number, { maxRounds, maxChoices, random = Math.random, childName }: BuildOptions): ArithmeticTask[] {
    const rule = arithmeticLevel(level);
    const safeLevel = ARITHMETIC_LEVELS.indexOf(rule) + 1;
    const count = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const choices = choiceCount(safeLevel, maxChoices);
    const int = (min: number, max: number) => (max <= min ? min : min + Math.floor(random() * (max - min + 1)));
    const coin = () => random() < 0.5;
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    const own = (childName ?? "").trim().toLocaleLowerCase("sr");
    const names = NAME_IDS.filter((id) => NAMES[id].name.toLocaleLowerCase("sr") !== own);

    const tasks: ArithmeticTask[] = [];
    const seen = new Set<string>();
    let lastTheme: ThemeId | null = null;
    while (tasks.length < count) {
        // Dva koraka: naizmenično priča sa imenima i scena (kutije, parking, gajbice)
        const kind: TaskKind = rule.plan === "twoStep" && tasks.length % 2 === 1 ? "change" : rule.kind;
        let numbers: Numbers = pickNumbers(rule.plan, int, coin, tasks.length);
        // Isti račun se ne ponavlja u nivou (nekoliko pokušaja, pa šta bude)
        for (let tries = 0; tries < 12 && seen.has(`${numbers.terms}|${numbers.ops}|${numbers.unknown}`); tries += 1) numbers = pickNumbers(rule.plan, int, coin, tasks.length);
        const demo = safeLevel === 1 && tasks.length === 0 && demoRounds(1, count) > 0;
        if (demo) numbers = { terms: [2, 1], ops: ["+"], unknown: -1 };
        seen.add(`${numbers.terms}|${numbers.ops}|${numbers.unknown}`);

        // Tema: priča bira predmet, scena temu koja ume taj pokret; ne ista dvaput zaredom
        let themeId: ThemeId;
        let item: ItemId;
        let steps: StepId[] = [];
        let chosenNames: NameId[] = [];
        if (kind === "story") {
            const fitting = rule.themes.filter((id) => STORY_ITEMS.some((story) => story.theme === id));
            const stories = STORY_ITEMS.filter((story) => fitting.includes(story.theme) && story.theme !== lastTheme);
            const story = pick(stories.length > 0 ? stories : STORY_ITEMS);
            themeId = story.theme;
            item = story.item;
            steps = numbers.ops.map((op) => pick(op === "+" ? story.plus : story.minus));
            const hero = pick(names);
            const other = pick(names.filter((id) => id !== hero));
            const third = pick(names.filter((id) => id !== hero && id !== other));
            chosenNames = [hero, other, third];
        } else {
            const pool = rule.themes.filter((id) => numbers.ops.every((op) => (op === "+" ? THEMES[id].arrive : THEMES[id].leave)));
            const fresh = pool.filter((id) => id !== lastTheme);
            themeId = demo ? "branch" : pick(fresh.length > 0 ? fresh : pool.length > 0 ? pool : rule.themes);
            item = THEMES[themeId].item;
            if (rule.kind === "box") item = pick(["apple", "strawberry", "egg", "cupcake", "toyCar"] as const);
        }
        lastTheme = themeId;
        const draw: DrawMode = rule.max > 10 || rule.kind === "make10" ? "frames" : "scene";
        const base: ArithmeticTask = {
            kind,
            theme: themeId,
            item,
            draw,
            terms: numbers.terms,
            ops: numbers.ops,
            unknown: numbers.unknown,
            choices: [],
            sentence: rule.sentence,
            hidden: rule.hidden,
            split: rule.plan === "bridge",
            dots: rule.dots,
            names: chosenNames,
            steps,
        };
        base.choices = pickChoices(base, choices, rule.max, random);
        tasks.push(base);
    }
    return tasks;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface ArithmeticView extends BaseView {
    task: ArithmeticTask | null;
    /** Koliko pokreta scene je već prikazano (0 … moveCount) */
    step: number;
    selected: number | null;
    hint: boolean;
    /** Pogrešno izabrani brojevi u zadatku */
    wrong: number[];
    feedback: FeedbackKind;
    promptedCount: number;
    /** Koliko puta je scena ispričana ponovo („Ponovi”) — crta se iz početka */
    replay: number;
}

export function emptyArithmeticView(totalRounds: number): ArithmeticView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        task: null,
        step: 0,
        selected: null,
        hint: false,
        wrong: [],
        feedback: null,
        replay: 0,
    };
}

export function arithmeticRoundView(task: ArithmeticTask): Partial<ArithmeticView> {
    return { task: cloneTask(task), step: 0, selected: null, hint: false, wrong: [], feedback: null, replay: 0 };
}

function cloneTask(task: ArithmeticTask): ArithmeticTask {
    return { ...task, terms: [...task.terms], ops: [...task.ops], choices: [...task.choices], names: [...task.names], steps: [...task.steps] };
}

/** Da li se predmeti vide (na nivoima sa samo rečenicom: tek uz pomoć ili posle greške) */
export function objectsShown(view: Pick<ArithmeticView, "task" | "hint" | "wrong" | "feedback">): boolean {
    if (!view.task) return false;
    return !view.task.hidden || view.hint || view.wrong.length > 0 || view.feedback === "correct";
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen. Prvi zadatak prvog nivoa pokazuje ruka (ne ocenjuje se); „correct” = iz
 * prvog pokušaja i bez pomoći; „prompted” = uz pomoć (osim pokaznog).
 */
export function solveArithmeticView(current: ArithmeticView, level: number, solved: Partial<ArithmeticView> = {}): { next: ArithmeticView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hint;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: ArithmeticView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function arithmeticResult(final: ArithmeticView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

const MAX_NUMBER = 20;

function mergeTask(raw: unknown): ArithmeticTask | null {
    if (!raw || typeof raw !== "object") return null;
    const t = raw as Partial<Record<keyof ArithmeticTask, unknown>>;
    const kind = (TASK_KINDS as readonly string[]).includes(t.kind as string) ? (t.kind as TaskKind) : null;
    if (!kind || !isTheme(t.theme) || !Array.isArray(t.terms) || !Array.isArray(t.ops)) return null;
    const terms = t.terms.slice(0, 3);
    const ops = t.ops.slice(0, 2);
    if (terms.length < 2 || ops.length !== terms.length - 1) return null;
    if (!terms.every((value) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= MAX_NUMBER)) return null;
    if (!ops.every((op) => op === "+" || op === "-")) return null;
    const unknown = Number.isInteger(t.unknown) && (t.unknown as number) >= -1 && (t.unknown as number) < terms.length ? (t.unknown as number) : -1;
    const task = { terms: terms as number[], ops: ops as Op[], unknown };
    const result = taskResult(task);
    if (result < 0 || result > MAX_NUMBER) return null;
    // Svi koraci (i međuzbir) moraju da budu u opsegu, inače se slika ne može nacrtati
    let running = terms[0] as number;
    for (let i = 0; i < ops.length; i += 1) {
        running += ops[i] === "+" ? (terms[i + 1] as number) : -(terms[i + 1] as number);
        if (running < 0 || running > MAX_NUMBER) return null;
    }
    const choices = Array.isArray(t.choices) ? Array.from(new Set(t.choices.filter((value): value is number => Number.isInteger(value) && value >= 0 && value <= MAX_NUMBER))).sort((x, y) => x - y).slice(0, 6) : [];
    const answer = taskAnswer(task);
    if (!choices.includes(answer)) return null;
    const theme = THEMES[t.theme];
    const steps = Array.isArray(t.steps) ? t.steps.filter((step): step is StepId => (STEP_IDS as readonly string[]).includes(step as string)).slice(0, ops.length) : [];
    const names = Array.isArray(t.names) ? Array.from(new Set(t.names.filter(isName))).slice(0, 3) : [];
    const story = kind === "story" && steps.length === ops.length && steps.every((step, i) => STEP_OP[step] === ops[i]) && names.length >= 2;
    if (kind === "story" && !story) return null;
    return {
        kind,
        theme: t.theme,
        item: isItem(t.item) ? t.item : theme.item,
        draw: t.draw === "frames" ? "frames" : "scene",
        terms: task.terms,
        ops: task.ops,
        unknown,
        choices,
        sentence: t.sentence === true,
        hidden: t.hidden === true,
        split: t.split === true && ops.length === 1 && ops[0] === "+" && unknown < 0 && (terms[0] as number) < 10 && result > 10,
        dots: t.dots === true,
        names: kind === "story" ? names : [],
        steps: kind === "story" ? steps : [],
    };
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeArithmeticMonitor(state: Partial<ArithmeticView> | null | undefined): ArithmeticView {
    const base = emptyArithmeticView(1);
    if (!state) return base;
    const task = mergeTask(state.task);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const choices = task?.choices ?? [];
    const wrong = Array.isArray(state.wrong) ? Array.from(new Set(state.wrong.filter((value): value is number => choices.includes(value as number)))) : [];
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        task,
        step: task ? Math.min(toCount(state.step, 0), moveCount(task)) : 0,
        selected: typeof state.selected === "number" && choices.includes(state.selected) ? state.selected : null,
        hint: state.hint === true,
        wrong,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        replay: Math.min(toCount(state.replay, 0), 999),
    };
}
