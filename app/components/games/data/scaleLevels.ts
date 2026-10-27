// Sadržaj igre „Vaga”: na stolu stoji vaga sa dva tasa. Dete prvo čita nagnutu vagu („Šta je
// teže?”), pa pogađa pre nego što pustimo vagu, pa samo pravi ravnotežu kockama i tegovima, bira
// grupu koja je jednaka (=), a na kraju zaključuje preko više vaga (ko je najteži) i menja jednu
// stvar drugom (1 ananas = 3 jabuke). Bez Reacta, da bi se nivoi proveravali u testovima; crteži
// su u games/scale/.
//
// Zašto ovako (uzrast 4–9, i deca sa autizmom):
//  • Deca od 3–4 godine porede „teže / lakše” rukama, a vaga to pretvara u nešto što se VIDI:
//    teža strana ide dole (uzrok → posledica). Poređenje mera je deo rane matematike
//    (Clements i Sarama: merenje i poređenje), a ravnoteža je prvi susret sa znakom jednakosti:
//    „=” znači „isto teško”, ne „sad napiši rezultat” (rana algebra, relacijsko shvatanje znaka =).
//  • Učenje bez greške (errorless learning): prvo samo čitanje već nagnute vage i parovi koji se
//    jako razlikuju (slon i miš); prvi zadatak prvog nivoa pokaže ruka (ne ocenjuje se), a pomoć
//    (tačan odgovor blago zasvetli) na lakim nivoima stiže već posle prve greške i posle čekanja.
//  • Podrška se povlači postepeno: veliko = teško (slika pomaže) → iznenađenja (veliki balon,
//    mali kamen: „vaga, a ne veličina, kaže šta je teže”) → pogađanje pa provera → kocke sa
//    tačkicama koje se mogu prebrojati → tegovi sa brojevima → zaključivanje bez gledanja jedne vage.
//  • Ravnoteža se pravi pokušajem: svaka kocka pomeri vagu za jedan podeljak, pa dete vidi koliko
//    još fali. Previše je informacija, ne kazna: vaga se nagne na drugu stranu i glas mirno kaže
//    da jedna kocka može nazad (u bodovanju je to promašaj).
//  • Predvidljiv raspored (TEACCH): vaga je uvek na istom mestu, na istom stolu; tegovi su uvek
//    u istoj korpi. Teme koje deca vole i znaju: životinje, voće, igračke, vozila.
//  • Mirne povratne poruke: bez crvenih znakova i tresenja; glas kaže činjenicu („Strana sa mišem
//    je gore. Teža strana ide dole.”) i nikad ne kaže gde treba dodirnuti.
//
// Nivoi: 1–4 čitanje i pogađanje, 5–7 ravnoteža kockama (1–3, do 5, do 8 sa kockom od dva),
// 8 grupe kocaka, 9 jednaka grupa (=), 10 tegovi sa brojevima 1, 2, 5, 11 dve vage (ko je
// najteži), 12 jednačina 3 + 4 = 5 + ?, 13 tegovi do 15, 14 tri vage (ko je najlakši),
// 15 zamena (1 ananas = 3 jabuke: koliko jabuka za 2 ananasa?).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, shuffle, toCount } from "@/app/components/games/kit/utils";
import { nounForm, numberWord } from "@/app/components/games/data/countingItems";

// ── Predmeti na vagi ─────────────────────────────────────────────────────────

export type Gender = "m" | "f" | "n";

export interface ScaleItem {
    id: string;
    /** Nominativ: „slon” */
    name: string;
    /** Genitiv: „od slona” */
    gen: string;
    /** Instrumental: „sa slonom” */
    ins: string;
    gender: Gender;
    /** Približna stvarna težina (g) — za poređenje „šta je teže” */
    grams: number;
    /** Koliko je velik na tasu (deo najveće slike) */
    size: number;
    /** Koliko kocaka je težak (zadaci ravnoteže i zamene) */
    units?: number;
    /** Uz 2–4 i uz 5 i više (zamena: „tri jabuke”, „šest jabuka”) */
    few?: string;
    many?: string;
}

const it = (id: string, name: string, gen: string, ins: string, gender: Gender, grams: number, size: number, extra: Partial<ScaleItem> = {}): ScaleItem => ({
    id,
    name,
    gen,
    ins,
    gender,
    grams,
    size,
    ...extra,
});

export const SCALE_ITEMS: readonly ScaleItem[] = [
    // Životinje
    it("elephant", "slon", "slona", "slonom", "m", 5_000_000, 1),
    it("mouse", "miš", "miša", "mišem", "m", 20, 0.42),
    it("cow", "krava", "krave", "kravom", "f", 600_000, 1),
    it("chick", "pile", "pileta", "piletom", "n", 50, 0.42),
    it("giraffe", "žirafa", "žirafe", "žirafom", "f", 800_000, 1),
    it("bird", "ptica", "ptice", "pticom", "f", 30, 0.45),
    it("whale", "kit", "kita", "kitom", "m", 50_000_000, 1),
    it("fish", "ribica", "ribice", "ribicom", "f", 40, 0.45),
    it("pig", "svinja", "svinje", "svinjom", "f", 100_000, 0.85),
    it("ladybug", "bubamara", "bubamare", "bubamarom", "f", 0.05, 0.38),
    it("lion", "lav", "lava", "lavom", "m", 190_000, 0.95),
    it("bee", "pčela", "pčele", "pčelom", "f", 0.1, 0.38),
    it("dog", "pas", "psa", "psom", "m", 25_000, 0.8),
    it("sheep", "ovca", "ovce", "ovcom", "f", 60_000, 0.85),
    it("rabbit", "zec", "zeca", "zecom", "m", 2_000, 0.6),
    it("cat", "mačka", "mačke", "mačkom", "f", 4_000, 0.65),
    it("hedgehog", "jež", "ježa", "ježom", "m", 800, 0.5),
    it("duck", "patka", "patke", "patkom", "f", 1_200, 0.6),
    it("frog", "žaba", "žabe", "žabom", "f", 30, 0.45),
    it("turtle", "kornjača", "kornjače", "kornjačom", "f", 1_000, 0.55),
    // Vozila
    it("bus", "autobus", "autobusa", "autobusom", "m", 12_000_000, 1),
    it("scooter", "trotinet", "trotineta", "trotinetom", "m", 4_000, 0.6),
    it("bicycle", "bicikl", "bicikla", "biciklom", "m", 12_000, 0.75),
    it("tractor", "traktor", "traktora", "traktorom", "m", 4_000_000, 1),
    it("car", "auto", "auta", "autom", "m", 1_200_000, 0.95),
    // Voće
    it("watermelon", "lubenica", "lubenice", "lubenicom", "f", 5_000, 0.9, { units: 8, few: "lubenice", many: "lubenica" }),
    it("cherry", "trešnja", "trešnje", "trešnjom", "f", 8, 0.36, { units: 1 }),
    it("strawberry", "jagoda", "jagode", "jagodom", "f", 15, 0.4, { units: 1 }),
    it("apple", "jabuka", "jabuke", "jabukom", "f", 150, 0.5, { units: 2, few: "jabuke", many: "jabuka" }),
    it("banana", "banana", "banane", "bananom", "f", 120, 0.55, { units: 2, few: "banane", many: "banana" }),
    it("pear", "kruška", "kruške", "kruškom", "f", 170, 0.55, { units: 3, few: "kruške", many: "krušaka" }),
    it("orange", "pomorandža", "pomorandže", "pomorandžom", "f", 200, 0.52, { units: 3 }),
    it("lemon", "limun", "limuna", "limunom", "m", 100, 0.45),
    it("pineapple", "ananas", "ananasa", "ananasom", "m", 1_500, 0.78, { units: 6, few: "ananasa", many: "ananasa" }),
    // Igračke i stvari
    it("teddy", "medvedić", "medvedića", "medvedićem", "m", 300, 0.72, { units: 4, few: "medvedića", many: "medvedića" }),
    it("book", "knjiga", "knjige", "knjigom", "f", 500, 0.6, { units: 4 }),
    it("ball", "lopta", "lopte", "loptom", "f", 400, 0.62, { units: 5 }),
    it("shoe", "cipela", "cipele", "cipelom", "f", 400, 0.62, { units: 5 }),
    it("drum", "doboš", "doboša", "dobošem", "m", 1_000, 0.72, { units: 7 }),
    it("balloon", "balon", "balona", "balonom", "m", 3, 1),
    it("feather", "pero", "pera", "perom", "n", 0.5, 0.95),
    it("leaf", "list", "lista", "listom", "m", 1, 0.9),
    it("kite", "zmaj", "zmaja", "zmajem", "m", 150, 1),
    it("stone", "kamen", "kamena", "kamenom", "m", 400, 0.42),
    it("key", "ključ", "ključa", "ključem", "m", 20, 0.42),
    it("hammer", "čekić", "čekića", "čekićem", "m", 500, 0.55),
    // Paket sa brojem (tegovi sa brojevima)
    it("parcel", "paket", "paketa", "paketom", "m", 1_000, 0.8),
];

export const SCALE_ITEM_IDS = SCALE_ITEMS.map((item) => item.id);

export function getScaleItem(id: unknown): ScaleItem | undefined {
    return typeof id === "string" ? SCALE_ITEMS.find((item) => item.id === id) : undefined;
}

function item(id: string): ScaleItem {
    return getScaleItem(id)!;
}

// ── Tegovi ───────────────────────────────────────────────────────────────────
// Kocke sa tačkicama: `d1` (jedna kocka) i `d2` (dve slepljene kocke). Tegovi sa brojem: `n1`…`n10`.
// „?” je prazno mesto (teg ili grupa koja se traži).

export const MYSTERY = "?";
export const DOT_WEIGHTS = ["d1", "d2"] as const;
export const MAX_NUMERAL = 10;

export function isWeight(token: unknown): token is string {
    if (typeof token !== "string") return false;
    if (token === "d1" || token === "d2") return true;
    const match = /^n(\d{1,2})$/.exec(token);
    return match !== null && Number(match[1]) >= 1 && Number(match[1]) <= MAX_NUMERAL;
}

/** Težina tega (u kockama) */
export function weightValue(token: string): number {
    if (token === "d1") return 1;
    if (token === "d2") return 2;
    const match = /^n(\d{1,2})$/.exec(token);
    return match ? Number(match[1]) : 0;
}

/** Sve što sme da stoji na tasu */
export function isToken(token: unknown): token is string {
    return token === MYSTERY || isWeight(token) || getScaleItem(token) !== undefined;
}

// ── Reči ─────────────────────────────────────────────────────────────────────

type Forms = Readonly<Record<Gender, string>>;
const HEAVIER: Forms = { m: "teži", f: "teža", n: "teže" };
const LIGHTER: Forms = { m: "lakši", f: "lakša", n: "lakše" };
const HEAVY: Forms = { m: "težak", f: "teška", n: "teško" };
const HEAVIEST: Forms = { m: "najteži", f: "najteža", n: "najteže" };
const LIGHTEST: Forms = { m: "najlakši", f: "najlakša", n: "najlakše" };
const BIG: Forms = { m: "veliki", f: "velika", n: "veliko" };
const SMALL: Forms = { m: "mali", f: "mala", n: "malo" };
const ITS: Forms = { m: "njegova", f: "njena", n: "njegova" };
const EVERY: Forms = { m: "svaki", f: "svaka", n: "svako" };

function cap(text: string): string {
    return text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);
}

/** „jedna kocka”, „dve kocke”, „pet kocaka” */
export function cubes(count: number): string {
    const form = nounForm(count);
    return `${numberWord(count, "f")} ${form === "one" ? "kocka" : form === "few" ? "kocke" : "kocaka"}`;
}

/** „sa jednom kockom”, „sa tri kocke”, „sa pet kocaka” */
function withCubes(count: number): string {
    return count === 1 ? "sa jednom kockom" : `sa ${cubes(count)}`;
}

/** Broj predmeta sa imenicom: „tri jabuke”, „šest jabuka”, „dva ananasa” */
export function countOf(count: number, id: string): string {
    const thing = item(id);
    const form = nounForm(count);
    const noun = form === "one" ? thing.name : form === "few" ? (thing.few ?? thing.name) : (thing.many ?? thing.name);
    return `${numberWord(count, thing.gender)} ${noun}`;
}

/** Zbir rečima: „pet i dva” */
function sumWords(values: readonly number[]): string {
    return values.map((value) => numberWord(value)).join(" i ");
}

// ── Nivoi ────────────────────────────────────────────────────────────────────

/**
 *  read     — vaga je već nagnuta: šta je teže / lakše (izbor je tas)
 *  predict  — vaga stoji na kockicama (ne može da se nagne): pogodi, pa pustimo vagu
 *  balance  — predmet levo, dete dodaje kocke ili tegove desno dok vaga ne bude ravna
 *  groups   — dve grupe kocaka na zadržanoj vagi: koja strana je teža / lakša
 *  pick     — koja grupa kocaka pravi ravnotežu (=)
 *  equation — 3 + 4 = 5 + ?: koji teg fali
 *  chain    — dve ili tri vage: ko je najteži / najlakši (zaključivanje preko vaga)
 *  swap     — 1 ananas = 3 jabuke: koliko jabuka za 2 ananasa
 */
export type ScaleTask = "read" | "predict" | "balance" | "groups" | "pick" | "equation" | "chain" | "swap";
export type ScaleAsk = "heavy" | "light";
export type Marks = "dots" | "numerals";

export interface ScaleLevel {
    task: ScaleTask;
    /** Pomoć već posle prve greške i posle čekanja (lakši nivoi) */
    earlyHint: boolean;
    marks: Marks;
    /** Šta se uči (za roditelja i za testove) */
    note: string;
}

const L = (task: ScaleTask, marks: Marks, note: string, earlyHint = false): ScaleLevel => ({ task, marks, note, earlyHint });

export const SCALE_LEVELS: readonly ScaleLevel[] = [
    // Lako
    L("read", "dots", "Šta je teže? Vrlo različiti predmeti", true),
    L("read", "dots", "Šta je lakše?", true),
    L("read", "dots", "Iznenađenja: veliko, a lako", true),
    L("predict", "dots", "Pogodi, pa pustimo vagu", true),
    L("balance", "dots", "Ravnoteža sa 1–3 kocke", true),
    // Srednje
    L("balance", "dots", "Ravnoteža do 5 kocaka"),
    L("balance", "dots", "Ravnoteža do 8: kocke od jedan i dva"),
    L("groups", "dots", "Dve grupe kocaka: koja je teža?"),
    L("pick", "dots", "Koja grupa pravi ravnotežu (=)?"),
    L("balance", "numerals", "Tegovi 1, 2, 5: napravi 7–9"),
    // Teško
    L("chain", "dots", "Dve vage: ko je najteži?"),
    L("equation", "numerals", "3 + 4 = 5 + ?"),
    L("balance", "numerals", "Tegovi 1, 2, 5, 10: napravi 11–15"),
    L("chain", "dots", "Tri vage: ko je najlakši?"),
    L("swap", "dots", "1 ananas = 3 jabuke: koliko za 2?"),
];

export const SCALE_MAX_LEVEL = SCALE_LEVELS.length;

export function scaleLevel(level: number): ScaleLevel {
    const index = Math.min(Math.max(Math.round(level) || 1, 1), SCALE_MAX_LEVEL) - 1;
    return SCALE_LEVELS[index];
}

// ── Zadaci ───────────────────────────────────────────────────────────────────

/** Jedna mala vaga u zaključivanju: teža životinja i lakša, i na kojoj strani je teža */
export interface ChainScale {
    heavy: string;
    light: string;
    heavyLeft: boolean;
}

export interface ScaleRound {
    task: ScaleTask;
    ask: ScaleAsk;
    marks: Marks;
    left: string[];
    right: string[];
    /** Težine predmeta u ovom zadatku (grami za „šta je teže”, kocke za ravnotežu i zamenu) */
    weights: Record<string, number>;
    /** Vaga stoji na kockicama dok dete ne izabere */
    peg: boolean;
    /** Veliko, a lako (nivo 3): objašnjenje kaže „mali, ali težak” */
    surprise: boolean;
    choices: string[];
    answer: string | null;
    /** Ravnoteža: tegovi u korpi i koliko je težak predmet levo */
    tray: string[];
    target: number;
    /** Na predmetu piše koliko je težak (paket sa brojem) */
    tag: boolean;
    /** Zamena: čime se meri (jabuka) i koliko njih je jedan predmet */
    fill: string | null;
    ratio: number;
    chain: ChainScale[];
    /** Zamena: vaga koja pokazuje pravilo (1 ananas = 3 jabuke) */
    ref: { left: string[]; right: string[] } | null;
}

interface BuildOptions {
    maxRounds: number;
    maxChoices: number;
    random?: () => number;
}

const PAN_CHOICES = ["left", "right"];

/** Najviše tegova na jednom tasu */
export const MAX_ON_PAN = 10;

function blank(task: ScaleTask, marks: Marks): ScaleRound {
    return {
        task,
        ask: "heavy",
        marks,
        left: [],
        right: [],
        weights: {},
        peg: false,
        surprise: false,
        choices: [],
        answer: null,
        tray: [],
        target: 0,
        tag: false,
        fill: null,
        ratio: 1,
        chain: [],
        ref: null,
    };
}

function pickOne<T>(list: readonly T[], random: () => number): T {
    return list[Math.floor(random() * list.length) % list.length];
}

function intIn(min: number, max: number, random: () => number): number {
    return min + (Math.floor(random() * (max - min + 1)) % (max - min + 1));
}

/** `count` elemenata iz liste, bez ponavljanja dok se lista ne potroši */
function draw<T>(list: readonly T[], count: number, random: () => number): T[] {
    const out: T[] = [];
    let bag: T[] = [];
    while (out.length < count) {
        if (bag.length === 0) bag = shuffle(list, random);
        out.push(bag.pop()!);
    }
    return out;
}

/** Pitanja „teže” i „lakše” izmešana, bez dugih nizova istog */
function mixedAsks(count: number, random: () => number): ScaleAsk[] {
    const asks: ScaleAsk[] = Array.from({ length: count }, (_, i) => (i % 2 === 0 ? "heavy" : "light"));
    const mixed = shuffle(asks, random);
    // Najviše dva ista zaredom
    for (let i = 2; i < mixed.length; i += 1) {
        if (mixed[i] === mixed[i - 1] && mixed[i] === mixed[i - 2]) {
            const swap = mixed.findIndex((ask, j) => j > i && ask !== mixed[i]);
            if (swap > 0) [mixed[i], mixed[swap]] = [mixed[swap], mixed[i]];
        }
    }
    return mixed;
}

// Parovi [teže, lakše]
/** Nivo 1: ogromna razlika (i veliko je zaista teško) */
export const VERY_DIFFERENT: readonly (readonly [string, string])[] = [
    ["elephant", "mouse"],
    ["cow", "chick"],
    ["giraffe", "bird"],
    ["watermelon", "cherry"],
    ["whale", "fish"],
    ["bus", "scooter"],
    ["pig", "ladybug"],
    ["lion", "bee"],
];

/** Nivo 2 i pogađanje: jasna razlika, ali bliže */
export const CLEAR_PAIRS: readonly (readonly [string, string])[] = [
    ["dog", "mouse"],
    ["sheep", "rabbit"],
    ["pig", "cat"],
    ["cow", "dog"],
    ["tractor", "bicycle"],
    ["pineapple", "strawberry"],
    ["watermelon", "apple"],
    ["lion", "hedgehog"],
    ["car", "scooter"],
    ["elephant", "cow"],
];

/** Nivo 3: malo, a teško — veliko, a lako */
export const SURPRISE_PAIRS: readonly (readonly [string, string])[] = [
    ["stone", "balloon"],
    ["key", "feather"],
    ["apple", "balloon"],
    ["stone", "feather"],
    ["hammer", "kite"],
    ["stone", "leaf"],
    ["key", "leaf"],
    ["hammer", "balloon"],
];

/** Životinje iste veličine na malim vagama (veličina ne pomaže — samo vage) */
export const CHAIN_ANIMALS: readonly string[] = ["cat", "dog", "rabbit", "hedgehog", "duck", "turtle", "frog"];

/** Ravnoteža kockama: predmeti po težini (u kockama) */
const BALANCE_ITEMS: readonly string[] = SCALE_ITEMS.filter((thing) => thing.units !== undefined).map((thing) => thing.id);

/** Zamena: [predmet, čime se meri] — težine su iste kao u ravnoteži (ananas = 3 jabuke) */
export const SWAP_PAIRS: readonly (readonly [string, string])[] = [
    ["pineapple", "apple"],
    ["watermelon", "apple"],
    ["pineapple", "pear"],
    ["watermelon", "banana"],
    ["teddy", "apple"],
    ["pineapple", "banana"],
];

function pairRound(task: ScaleTask, pair: readonly [string, string], ask: ScaleAsk, heavyLeft: boolean, surprise = false): ScaleRound {
    const [heavy, light] = pair;
    const round = blank(task, "dots");
    round.ask = ask;
    round.left = [heavyLeft ? heavy : light];
    round.right = [heavyLeft ? light : heavy];
    round.weights = { [heavy]: item(heavy).grams, [light]: item(light).grams };
    round.peg = task === "predict";
    round.surprise = surprise;
    round.choices = [...PAN_CHOICES];
    const heavySide = heavyLeft ? "left" : "right";
    round.answer = ask === "heavy" ? heavySide : heavyLeft ? "right" : "left";
    return round;
}

function balanceRound(target: number, marks: Marks, tray: string[], thing: string): ScaleRound {
    const round = blank("balance", marks);
    round.left = [thing];
    round.weights = { [thing]: target };
    round.target = target;
    round.tray = tray;
    round.tag = thing === "parcel";
    return round;
}

/** Grupa kocaka od tačno `sum` kocaka: nekoliko dvojki, ostalo jedinice (dvojke prve) */
function composition(sum: number, twos: number): string[] {
    const t = Math.max(0, Math.min(twos, Math.floor(sum / 2)));
    return [...Array<string>(t).fill("d2"), ...Array<string>(sum - 2 * t).fill("d1")];
}

export function groupId(tokens: readonly string[]): string {
    return tokens.join("-");
}

export function groupTokens(id: string): string[] {
    const tokens = id.split("-");
    return tokens.every((token) => token === "d1" || token === "d2") ? tokens : [];
}

function groupSum(tokens: readonly string[]): number {
    return tokens.reduce((sum, token) => sum + weightValue(token), 0);
}

/**
 * Plan nivoa: niz zadataka. Deterministički za isti `random` (dvoboj: oba deteta dobijaju iste
 * zadatke). Broj zadataka prati podešavanje uzrasta, a broj izbora `maxChoices` (najmanje 2).
 */
export function buildScaleLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): ScaleRound[] {
    const lv = Math.min(Math.max(Math.round(level) || 1, 1), SCALE_MAX_LEVEL);
    const count = Math.max(2, Math.min(Math.round(maxRounds) || 5, 10));
    const choiceCap = Math.max(2, Math.round(maxChoices) || 3);
    const rounds: ScaleRound[] = [];

    switch (lv) {
        case 1: {
            // Prvi zadatak (pokazni): slon i miš, slon levo
            rounds.push(pairRound("read", VERY_DIFFERENT[0], "heavy", true));
            const rest = draw(VERY_DIFFERENT.slice(1), count - 1, random);
            for (const pair of rest) rounds.push(pairRound("read", pair, "heavy", random() < 0.5));
            break;
        }
        case 2:
            for (const pair of draw(CLEAR_PAIRS, count, random)) rounds.push(pairRound("read", pair, "light", random() < 0.5));
            break;
        case 3: {
            const asks = mixedAsks(count, random);
            draw(SURPRISE_PAIRS, count, random).forEach((pair, i) => rounds.push(pairRound("read", pair, asks[i], random() < 0.5, true)));
            break;
        }
        case 4: {
            const asks = mixedAsks(count, random);
            draw([...VERY_DIFFERENT.slice(1), ...CLEAR_PAIRS], count, random).forEach((pair, i) => rounds.push(pairRound("predict", pair, asks[i], random() < 0.5)));
            break;
        }
        case 5:
        case 6:
        case 7: {
            const [min, max] = lv === 5 ? [1, 3] : lv === 6 ? [3, 5] : [4, 8];
            const tray = lv === 7 ? ["d1", "d2"] : ["d1"];
            const targets = draw(
                Array.from({ length: max - min + 1 }, (_, i) => min + i),
                count,
                random
            );
            // Prva ravnoteža je kratka (dve kocke), da dete vidi kako vaga ide gore
            if (lv === 5) targets[0] = 2;
            let last = "";
            for (const target of targets) {
                const options = BALANCE_ITEMS.filter((id) => item(id).units === target && id !== last);
                const thing = pickOne(options.length > 0 ? options : BALANCE_ITEMS.filter((id) => item(id).units === target), random);
                last = thing;
                rounds.push(balanceRound(target, "dots", tray, thing));
            }
            break;
        }
        case 8: {
            const asks = mixedAsks(count, random);
            for (let i = 0; i < count; i += 1) {
                // Prvo velika razlika, pa sve manja
                const diff = i < Math.ceil(count / 2) ? intIn(2, 4, random) : intIn(1, 2, random);
                const small = intIn(1, 8 - diff, random);
                const big = small + diff;
                const bigLeft = random() < 0.5;
                const round = blank("groups", "dots");
                round.ask = asks[i];
                round.left = Array<string>(bigLeft ? big : small).fill("d1");
                round.right = Array<string>(bigLeft ? small : big).fill("d1");
                round.peg = true;
                round.choices = [...PAN_CHOICES];
                const heavySide = bigLeft ? "left" : "right";
                round.answer = asks[i] === "heavy" ? heavySide : bigLeft ? "right" : "left";
                rounds.push(round);
            }
            break;
        }
        case 9: {
            const size = Math.min(choiceCap, 3);
            for (const sum of draw([3, 4, 5, 6], count, random)) {
                const leftTwos = intIn(0, Math.floor(sum / 2), random);
                const left = composition(sum, leftTwos);
                // Tačna grupa izgleda drugačije od leve (iste težine, drugi oblik)
                const otherTwos = Array.from({ length: Math.floor(sum / 2) + 1 }, (_, t) => t).filter((t) => t !== leftTwos);
                const good = composition(sum, pickOne(otherTwos, random));
                const near = shuffle([sum - 1, sum + 1], random);
                const wrongs = [...near, sum + 2].slice(0, size - 1).map((n) => composition(n, intIn(0, Math.floor(n / 2), random)));
                const round = blank("pick", "dots");
                round.left = left;
                round.right = [MYSTERY];
                round.answer = groupId(good);
                round.choices = shuffle([groupId(good), ...wrongs.map(groupId)], random);
                rounds.push(round);
            }
            break;
        }
        case 10:
        case 13: {
            const [min, max] = lv === 10 ? [7, 9] : [11, 15];
            const tray = lv === 10 ? ["n1", "n2", "n5"] : ["n1", "n2", "n5", "n10"];
            for (const target of draw(Array.from({ length: max - min + 1 }, (_, i) => min + i), count, random)) {
                rounds.push(balanceRound(target, "numerals", tray, "parcel"));
            }
            break;
        }
        case 11:
        case 14: {
            const size = lv === 11 ? 3 : 4;
            for (let i = 0; i < count; i += 1) {
                // Redosled od najtežeg: [A, B, C(, D)]
                const order = shuffle(CHAIN_ANIMALS, random).slice(0, size);
                const scales: ChainScale[] = [];
                for (let k = 0; k < size - 1; k += 1) scales.push({ heavy: order[k], light: order[k + 1], heavyLeft: random() < 0.5 });
                const round = blank("chain", "dots");
                round.ask = lv === 11 ? "heavy" : "light";
                round.chain = shuffle(scales, random);
                const answer = lv === 11 ? order[0] : order[size - 1];
                round.answer = answer;
                let offered = order;
                if (offered.length > choiceCap) {
                    // Ostaje onaj koji je odmah do odgovora (najbliži promašaj) i još neko
                    const nearest = lv === 11 ? order[1] : order[size - 2];
                    const others = order.filter((id) => id !== answer && id !== nearest);
                    offered = [answer, nearest, ...shuffle(others, random)].slice(0, choiceCap);
                }
                round.choices = shuffle(offered, random);
                rounds.push(round);
            }
            break;
        }
        case 12: {
            const size = Math.min(choiceCap, 4);
            for (let i = 0; i < count; i += 1) {
                const cap10 = i < Math.ceil(count / 2) ? 10 : 15;
                let a = 0;
                let b = 0;
                let c = 0;
                let answer = 0;
                do {
                    a = intIn(1, 9, random);
                    b = intIn(1, 9, random);
                    c = intIn(1, 9, random);
                    answer = a + b - c;
                } while (a + b > cap10 || answer < 1 || answer > 9 || c === a + b);
                const near = shuffle([answer - 1, answer + 1, answer + 2, answer - 2, c].filter((n, k, all) => n >= 1 && n <= 9 && n !== answer && all.indexOf(n) === k), random);
                const round = blank("equation", "numerals");
                round.left = [`n${a}`, `n${b}`];
                round.right = [`n${c}`, MYSTERY];
                round.answer = String(answer);
                round.choices = shuffle([String(answer), ...near.slice(0, size - 1).map(String)], random);
                rounds.push(round);
            }
            break;
        }
        case 15: {
            const size = Math.min(choiceCap, 4);
            for (const [x, y] of draw(SWAP_PAIRS, count, random)) {
                const ratio = item(x).units! / item(y).units!;
                const times = ratio * 3 <= 12 && random() < 0.5 ? 3 : 2;
                const answer = ratio * times;
                // Česte greške: sabiranje umesto množenja (2 + 3), jedan predmet (3), za jedan više ili manje
                const near = [ratio + times, ratio, answer + 1, answer - 1].filter((n, k, all) => n >= 2 && n <= 12 && n !== answer && all.indexOf(n) === k);
                const round = blank("swap", "dots");
                round.left = Array<string>(times).fill(x);
                round.right = [MYSTERY];
                round.weights = { [x]: item(x).units!, [y]: item(y).units! };
                round.fill = y;
                round.ratio = ratio;
                round.ref = { left: [x], right: Array<string>(ratio).fill(y) };
                round.answer = String(answer);
                round.choices = shuffle([String(answer), ...near.slice(0, size - 1).map(String)], random);
                rounds.push(round);
            }
            break;
        }
    }
    return rounds;
}

// ── Težina i nagib ───────────────────────────────────────────────────────────

/** Najveći nagib grede (stepeni) i koliko je jedan podeljak (jedna kocka razlike) */
export const MAX_TILT = 12;
export const TILT_STEP = 4;

export function tokenWeight(token: string, weights: Readonly<Record<string, number>>): number {
    if (isWeight(token)) return weightValue(token);
    if (token === MYSTERY) return 0;
    return weights[token] ?? 0;
}

export function loadWeight(tokens: readonly string[], weights: Readonly<Record<string, number>>): number {
    return tokens.reduce((sum, token) => sum + tokenWeight(token, weights), 0);
}

/**
 * Nagib grede u stepenima: pozitivan = desna strana je dole. Kod pravih predmeta (grami) vaga
 * se nagne do kraja (malo manje kad je razlika manja); kod kocaka svaka kocka razlike je jedan
 * podeljak, pa dete vidi koliko još fali.
 */
export function tiltFor(left: readonly string[], right: readonly string[], weights: Readonly<Record<string, number>>, real: boolean): number {
    const l = loadWeight(left, weights);
    const r = loadWeight(right, weights);
    if (l === r) return 0;
    if (real) {
        const ratio = Math.max(l, r) / Math.max(Math.min(l, r), 0.001);
        return Math.sign(r - l) * (ratio >= 4 ? MAX_TILT : MAX_TILT * 0.75);
    }
    return Math.max(-MAX_TILT, Math.min(MAX_TILT, (r - l) * TILT_STEP));
}

// ── Stanje igre (view) ───────────────────────────────────────────────────────

export interface ScaleView extends BaseView, ScaleRound {
    /** Ravnoteža: tegovi na desnom tasu, redom kojim su stavljeni */
    placed: string[];
    /** Izbor koji je upravo probno stavljen na vagu (grupa, teg, voće) */
    trial: string | null;
    selected: string | null;
    hint: boolean;
    /** Svi pogrešni pokušaji u zadatku (izbori, a kod ravnoteže tegovi koji su prebacili) */
    wrong: string[];
    /** Ravnoteža: desna strana je trenutno teža (previše) */
    over: boolean;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyScaleView(totalRounds: number): ScaleView {
    return {
        ...blank("read", "dots"),
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        placed: [],
        trial: null,
        selected: null,
        hint: false,
        wrong: [],
        over: false,
        feedback: null,
    };
}

export function scaleRoundView(round: ScaleRound): Partial<ScaleView> {
    return {
        ...round,
        left: [...round.left],
        right: [...round.right],
        weights: { ...round.weights },
        choices: [...round.choices],
        tray: [...round.tray],
        chain: round.chain.map((scale) => ({ ...scale })),
        ref: round.ref ? { left: [...round.ref.left], right: [...round.ref.right] } : null,
        placed: [],
        trial: null,
        selected: null,
        hint: false,
        wrong: [],
        over: false,
        feedback: null,
    };
}

/** Šta se probno stavlja na desni tas za izbor `id` (grupa, teg koji fali, voće) */
export function trialLoad(view: Pick<ScaleView, "task" | "fill">, id: string): string[] {
    if (view.task === "pick") return groupTokens(id);
    const value = Number(id);
    if (!Number.isInteger(value) || value < 1) return [];
    if (view.task === "equation") return value <= MAX_NUMERAL ? [`n${value}`] : [];
    if (view.task === "swap" && view.fill) return Array<string>(Math.min(value, 12)).fill(view.fill);
    return [];
}

/** Šta je trenutno na tasovima (sa stavljenim tegovima i probnim izborom) */
export function panLoads(view: Pick<ScaleView, "task" | "left" | "right" | "placed" | "trial" | "fill">): { left: string[]; right: string[] } {
    if (view.task === "balance") return { left: view.left, right: view.placed };
    if (view.trial !== null) return { left: view.left, right: [...view.right.filter((token) => token !== MYSTERY), ...trialLoad(view, view.trial)] };
    return { left: view.left, right: view.right };
}

/** Nagib vage koju dete vidi (vaga na kockicama stoji ravno) */
export function viewTilt(view: ScaleView): number {
    if (view.peg || view.task === "chain") return 0;
    const { left, right } = panLoads(view);
    return tiltFor(left, right, view.weights, view.task === "read" || view.task === "predict");
}

export function placedSum(view: Pick<ScaleView, "placed">): number {
    return loadWeight(view.placed, {});
}

/** Ravnoteža: koji teg treba sledeći (pomoć), ili „takeback” kad je previše */
export function nextBalanceStep(view: Pick<ScaleView, "placed" | "target" | "tray">): string | null {
    const sum = placedSum(view);
    if (sum === view.target) return null;
    if (sum > view.target) return "takeback";
    const need = view.target - sum;
    const fits = view.tray.filter((token) => weightValue(token) <= need).sort((a, b) => weightValue(b) - weightValue(a));
    return fits[0] ?? null;
}

// ── Rečenice ─────────────────────────────────────────────────────────────────

function side(view: Pick<ScaleView, "left" | "right">, which: string): string | undefined {
    return (which === "left" ? view.left : view.right)[0];
}

/** Ime onoga što stoji na tasu (za zadatke sa dva predmeta) */
export function panName(view: Pick<ScaleView, "left" | "right">, which: string): string {
    const id = side(view, which);
    const thing = getScaleItem(id);
    return thing ? cap(thing.name) : "";
}

function heavierSide(view: ScaleView): "left" | "right" {
    const real = view.task === "read" || view.task === "predict";
    return tiltFor(view.left, view.right, view.weights, real) > 0 ? "right" : "left";
}

function groupCount(view: ScaleView, which: "left" | "right"): number {
    return loadWeight(which === "left" ? view.left : view.right, {});
}

export function scaleQuestion(view: ScaleView): string {
    switch (view.task) {
        case "read":
            return view.ask === "heavy" ? "Vaga pokazuje: šta je teže?" : "Vaga pokazuje: šta je lakše?";
        case "predict": {
            const a = getScaleItem(view.left[0]);
            const b = getScaleItem(view.right[0]);
            if (!a || !b) return "";
            return `Šta misliš: šta je ${view.ask === "heavy" ? "teže" : "lakše"}, ${a.name} ili ${b.name}?`;
        }
        case "groups":
            return view.ask === "heavy" ? "Koja strana je teža? Prebroj kocke." : "Koja strana je lakša? Prebroj kocke.";
        case "balance": {
            if (view.marks === "numerals") return `Na paketu piše ${numberWord(view.target)}. Koji tegovi su teški kao paket?`;
            const thing = getScaleItem(view.left[0]);
            return thing ? `Koliko kocaka je teško kao ${thing.name}?` : "";
        }
        case "pick":
            return "Šta ide na drugu stranu, da vaga bude ravna?";
        case "equation": {
            const [a, b] = view.left.map(weightValue);
            const c = weightValue(view.right[0] ?? "");
            return `${cap(numberWord(a))} i ${numberWord(b)} na jednoj strani, ${numberWord(c)} na drugoj. Koji teg fali?`;
        }
        case "chain":
            return view.ask === "heavy"
                ? `${view.chain.length === 2 ? "Pogledaj obe vage." : "Pogledaj sve vage."} Ko je najteži?`
                : `${view.chain.length === 3 ? "Pogledaj sve tri vage." : "Pogledaj sve vage."} Ko je najlakši?`;
        case "swap": {
            const x = getScaleItem(view.left[0]);
            if (!x || !view.fill) return "";
            return `${ruleSentence(view)} Koliko ${item(view.fill).many ?? ""} treba za ${countOf(view.left.length, x.id)}?`;
        }
    }
}

/** Zamena: pravilo sa male vage („Jedan ananas je težak kao tri jabuke.”) */
export function ruleSentence(view: Pick<ScaleView, "left" | "fill" | "ratio">): string {
    const x = getScaleItem(view.left[0]);
    if (!x || !view.fill) return "";
    return `${cap(countOf(1, x.id))} je ${HEAVY[x.gender]} kao ${countOf(view.ratio, view.fill)}.`;
}

/** Zašto je tačan odgovor tačan (glas i poruka posle tačnog odgovora) */
export function scaleAnswer(view: ScaleView): string {
    switch (view.task) {
        case "read":
        case "predict": {
            const id = side(view, view.answer ?? "");
            const thing = getScaleItem(id);
            if (!thing) return "";
            const heavy = view.ask === "heavy";
            const adj = heavy ? HEAVIER[thing.gender] : LIGHTER[thing.gender];
            const where = heavy ? "dole" : "gore";
            if (view.surprise) {
                const looks = heavy ? SMALL[thing.gender] : BIG[thing.gender];
                return `${cap(thing.name)} je ${looks}, ali je ${adj}. Zato je ${ITS[thing.gender]} strana ${where}.`;
            }
            return `${cap(thing.name)} je ${adj}, zato je ${ITS[thing.gender]} strana ${where}.`;
        }
        case "groups": {
            const big = groupCount(view, heavierSide(view));
            const small = groupCount(view, heavierSide(view) === "left" ? "right" : "left");
            return view.ask === "heavy"
                ? `${cap(numberWord(big))} je više od ${numberWord(small)}. Strana ${withCubes(big)} je teža.`
                : `${cap(numberWord(small))} je manje od ${numberWord(big)}. Strana ${withCubes(small)} je lakša.`;
        }
        case "balance": {
            if (view.marks === "numerals") {
                const values = view.placed.map(weightValue);
                if (values.length === 1) return `Sada je ravno: ${numberWord(view.target)} i ${numberWord(view.target)}.`;
                // Dug zbir (mnogo jedinica) se ne čita ceo
                return values.length <= 4 ? `Sada je ravno: ${sumWords(values)} je ${numberWord(view.target)}.` : `Sada je ravno: na obe strane je ${numberWord(view.target)}.`;
            }
            const thing = getScaleItem(view.left[0]);
            return thing ? `Sada je ravno: ${thing.name} je ${HEAVY[thing.gender]} kao ${cubes(view.target)}.` : "";
        }
        case "pick": {
            const sum = loadWeight(view.left, {});
            return `Sada je ravno: ${numberWord(sum)} i ${numberWord(sum)}.`;
        }
        case "equation": {
            const [a, b] = view.left.map(weightValue);
            const c = weightValue(view.right[0] ?? "");
            const x = Number(view.answer);
            return `${cap(numberWord(a))} i ${numberWord(b)} je ${numberWord(a + b)}, a ${numberWord(c)} i ${numberWord(x)} je isto ${numberWord(c + x)}.`;
        }
        case "chain": {
            const answer = getScaleItem(view.answer);
            if (!answer) return "";
            const heavy = view.ask === "heavy";
            const ordered = chainOrder(view.chain);
            const path = heavy ? ordered : [...ordered].reverse();
            const steps = path.slice(0, -1).map((id, i) => {
                const a = item(id);
                const b = item(path[i + 1]);
                const adj = heavy ? HEAVIER[a.gender] : LIGHTER[a.gender];
                return i === 0 ? `${cap(a.name)} je ${adj} od ${b.gen}` : `${a.name} je ${adj} od ${b.gen}`;
            });
            const joined = steps.length > 1 ? `${steps.slice(0, -1).join(", ")}, a ${steps[steps.length - 1]}` : steps[0];
            return `${joined}. Zato je ${answer.name} ${heavy ? HEAVIEST[answer.gender] : LIGHTEST[answer.gender]}.`;
        }
        case "swap": {
            const x = getScaleItem(view.left[0]);
            if (!x || !view.fill) return "";
            const parts = Array<string>(view.left.length).fill(numberWord(view.ratio)).join(" i ");
            return `${cap(countOf(Number(view.answer), view.fill))}. ${cap(EVERY[x.gender])} ${x.name} je kao ${countOf(view.ratio, view.fill)}: ${parts} je ${numberWord(Number(view.answer))}.`;
        }
    }
}

/** Mirna činjenica posle pogrešnog izbora `picked` (bez osude) */
export function scaleMistake(view: ScaleView, picked: string): string {
    switch (view.task) {
        case "read": {
            const thing = getScaleItem(side(view, picked));
            if (!thing) return "";
            return view.ask === "heavy" ? `Strana sa ${thing.ins} je gore. Teža strana ide dole.` : `Strana sa ${thing.ins} je dole. Lakša strana ide gore.`;
        }
        case "predict": {
            const heavy = getScaleItem(side(view, heavierSide(view)));
            const light = getScaleItem(side(view, heavierSide(view) === "left" ? "right" : "left"));
            if (!heavy || !light) return "";
            return view.ask === "heavy" ? `Pogledaj vagu: ${heavy.name} je ${HEAVIER[heavy.gender]}.` : `Pogledaj vagu: ${light.name} je ${LIGHTER[light.gender]}.`;
        }
        case "groups":
            return `Pogledaj vagu. ${scaleAnswer(view)}`;
        case "pick": {
            const sum = loadWeight(view.left, {});
            const got = groupSum(groupTokens(picked));
            return `To je ${numberWord(got)}, a treba ${numberWord(sum)}. Vaga nije ravna.`;
        }
        case "equation": {
            const [a, b] = view.left.map(weightValue);
            const c = weightValue(view.right[0] ?? "");
            const x = Number(picked);
            return `${cap(numberWord(c))} i ${numberWord(x)} je ${numberWord(c + x)}, a treba ${numberWord(a + b)}.`;
        }
        case "chain": {
            const thing = getScaleItem(picked);
            if (!thing) return "";
            const heavy = view.ask === "heavy";
            // Vaga na kojoj je izabrani lakši (za „najteži”) ili teži (za „najlakši”)
            const scale = view.chain.find((s) => (heavy ? s.light === picked : s.heavy === picked));
            const other = getScaleItem(scale ? (heavy ? scale.heavy : scale.light) : undefined);
            if (!other) return "";
            return heavy
                ? `${cap(thing.name)} je ${LIGHTER[thing.gender]} od ${other.gen}, pa nije ${HEAVIEST[thing.gender]}.`
                : `${cap(thing.name)} je ${HEAVIER[thing.gender]} od ${other.gen}, pa nije ${LIGHTEST[thing.gender]}.`;
        }
        case "swap": {
            const x = getScaleItem(view.left[0]);
            if (!x || !view.fill) return "";
            return `Sa ${countOf(Number(picked), view.fill)} vaga nije ravna. ${cap(EVERY[x.gender])} ${x.name} je kao ${countOf(view.ratio, view.fill)}.`;
        }
        case "balance":
            return "";
    }
}

/** Ravnoteža: poruka dok vaga još nije ravna */
export const NOT_YET = "Još malo. Vaga još nije ravna.";

/** Ravnoteža: poruka kad je stavljeno previše */
export function overSentence(view: Pick<ScaleView, "marks" | "placed" | "target">): string {
    if (view.marks === "numerals") return `Previše: ${numberWord(placedSum(view))} je više od ${numberWord(view.target)}. Jedan teg može nazad.`;
    return "Previše: sada su kocke teže. Jedna kocka može nazad.";
}

/** Redosled životinja od najteže, iz malih vaga (A > B, B > C …) */
export function chainOrder(chain: readonly ChainScale[]): string[] {
    const lighter = new Set(chain.map((s) => s.light));
    const start = chain.find((s) => !lighter.has(s.heavy))?.heavy;
    if (!start) return [];
    const order = [start];
    for (let i = 0; i < chain.length; i += 1) {
        const next = chain.find((s) => s.heavy === order[order.length - 1]);
        if (!next) break;
        order.push(next.light);
    }
    return order;
}

/** Natpis za izbor (čitač ekrana i natpis ispod slike) */
export function choiceLabel(view: ScaleView, id: string): string {
    switch (view.task) {
        case "read":
        case "predict":
            return panName(view, id);
        case "groups": {
            const n = groupCount(view, id === "left" ? "left" : "right");
            return cap(cubes(n));
        }
        case "pick":
            return cap(cubes(groupSum(groupTokens(id))));
        case "equation":
            return `Teg ${id}`;
        case "chain":
            return cap(getScaleItem(id)?.name ?? "");
        case "swap":
            return view.fill ? cap(countOf(Number(id), view.fill)) : id;
        case "balance":
            return "";
    }
}

// ── Bodovanje ────────────────────────────────────────────────────────────────

export function solveScaleView(current: ScaleView, level: number, solved: Partial<ScaleView> = {}): { next: ScaleView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hint;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: ScaleView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function scaleResult(final: ScaleView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ──────────────────────────────────────────────────────────────────

const TASKS: readonly ScaleTask[] = ["read", "predict", "balance", "groups", "pick", "equation", "chain", "swap"];

function tokens(value: unknown, max = 16): string[] {
    return Array.isArray(value) ? value.filter(isToken).slice(0, max) : [];
}

function validChoice(task: ScaleTask, id: unknown): id is string {
    if (typeof id !== "string") return false;
    switch (task) {
        case "read":
        case "predict":
        case "groups":
            return PAN_CHOICES.includes(id);
        case "pick":
            return id.length <= 40 && groupTokens(id).length > 0;
        case "equation":
            return /^[1-9]$/.test(id);
        case "swap":
            return /^\d{1,2}$/.test(id) && Number(id) >= 1 && Number(id) <= 12;
        case "chain":
            return CHAIN_ANIMALS.includes(id);
        case "balance":
            return false;
    }
}

/** Stanje sa monitora: nepoznato se odbacuje, brojevi se ograničavaju */
export function mergeScaleMonitor(state: Partial<ScaleView> | null | undefined): ScaleView {
    const base = emptyScaleView(1);
    if (!state) return base;
    const task = TASKS.includes(state.task as ScaleTask) ? (state.task as ScaleTask) : "read";
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const weights: Record<string, number> = {};
    if (state.weights && typeof state.weights === "object" && !Array.isArray(state.weights)) {
        for (const [key, value] of Object.entries(state.weights).slice(0, 8)) {
            if (getScaleItem(key) && typeof value === "number" && Number.isFinite(value)) weights[key] = Math.min(Math.max(value, 0), 1e8);
        }
    }
    const choices = Array.isArray(state.choices) ? Array.from(new Set(state.choices.filter((id) => validChoice(task, id)))).slice(0, 6) : [];
    const chain = Array.isArray(state.chain)
        ? state.chain
              .filter((s): s is ChainScale => !!s && typeof s === "object" && CHAIN_ANIMALS.includes(s.heavy) && CHAIN_ANIMALS.includes(s.light) && s.heavy !== s.light)
              .slice(0, 3)
              .map((s) => ({ heavy: s.heavy, light: s.light, heavyLeft: s.heavyLeft === true }))
        : [];
    const rawRef = state.ref;
    const ref = rawRef && typeof rawRef === "object" && !Array.isArray(rawRef) ? { left: tokens(rawRef.left, 4), right: tokens(rawRef.right, 8) } : null;
    const fill = getScaleItem(state.fill)?.id ?? null;
    const tray = Array.isArray(state.tray) ? Array.from(new Set(state.tray.filter(isWeight))).slice(0, 4) : [];
    const placed = Array.isArray(state.placed) ? state.placed.filter(isWeight).slice(0, MAX_ON_PAN) : [];
    const answer = validChoice(task, state.answer) && choices.includes(state.answer) ? state.answer : null;
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        task,
        ask: state.ask === "light" ? "light" : "heavy",
        marks: state.marks === "numerals" ? "numerals" : "dots",
        left: tokens(state.left),
        right: tokens(state.right),
        weights,
        peg: state.peg === true,
        surprise: state.surprise === true,
        choices,
        answer,
        tray,
        target: Math.min(toCount(state.target, 0), 30),
        tag: state.tag === true,
        fill,
        ratio: Math.min(Math.max(toCount(state.ratio, 1), 1), 6),
        chain,
        ref,
        placed,
        trial: validChoice(task, state.trial) && choices.includes(state.trial) ? state.trial : null,
        selected: validChoice(task, state.selected) && choices.includes(state.selected) ? state.selected : null,
        hint: state.hint === true,
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((id): id is string => typeof id === "string" && id.length <= 40).slice(0, 24) : [],
        over: state.over === true,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
