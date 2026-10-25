// Sadržaj igre „Prodavnica”: spisak sa slikama, police, korpa i kasa kod prodavačice Emine.
// Dete prvo kupuje po slikama (bez novca), pa plaća novčićima od 1 dinara (broji naglas),
// pa mešanim novčićima, sabira cene, plaća novčanicama, računa kusur i na kraju kupuje sve
// sa spiska tako da ne potroši više nego što ima. Novac je srpski (dinar): novčići od 1, 2,
// 5, 10 i 20 dinara i novčanice od 50, 100 i 200 dinara — nacrtani jednostavno, da se
// prepoznaju po boji i broju, ne kao kopije pravog novca. Bez Reacta, da bi se nivoi i
// račun proveravali u testovima; crteži su u games/market/.
//
// Zašto ovako (uzrast 5–10, školski uzrast; i deca sa autizmom):
//  • Kupovina je funkcionalna veština (life skills): ista situacija kao u pravoj prodavnici,
//    uvek isti raspored (spisak – police – korpa – kasa), bez žurbe i bez reda iza deteta.
//  • Novac se uči redom koji preporučuju programi za funkcionalnu matematiku: prvo brojanje
//    jednakih novčića (1 + 1 + 1 = cena, „jedan na jedan”), pa prepoznavanje vrednosti
//    novčića, pa sastavljanje cene od različitih novčića, sabiranje dve cene, novčanice,
//    kusur i na kraju plan (budžet).
//  • Učenje bez greške: prvi zadatak prvog nivoa pokaže ruka (ne ocenjuje se), na prvim
//    plaćanjima na pultu su nacrtana prazna mesta za tačno toliko novčića koliko treba, a
//    pomoć (sledeći dobar novčić zasvetli) na lakim nivoima stiže već posle prve greške.
//  • Novčić koji bi bio previše se ne prihvata: vrati se, a glas mirno kaže koliko još treba
//    („To je previše. Treba još 2 dinara.”) — dete nikad ne „plati pogrešno”, nego dobije
//    tačnu informaciju za sledeći korak. Novčić sa pulta može da se vrati u novčanik.
//  • Uz brojeve ide pravilan oblik reči: 1 dinar, 2 dinara, 5 dinara, 21 dinar.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";
import { nounForm, numberWord } from "@/app/components/games/data/countingItems";

// ── Novac ────────────────────────────────────────────────────────────────────

export const COINS = [1, 2, 5, 10, 20] as const;
export const NOTES = [50, 100, 200] as const;
export const DENOMINATIONS = [...COINS, ...NOTES] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

export function isDenomination(value: unknown): value is Denomination {
    return typeof value === "number" && (DENOMINATIONS as readonly number[]).includes(value);
}

export function isNote(value: number): boolean {
    return (NOTES as readonly number[]).includes(value);
}

/** „1 dinar”, „2 dinara”, „5 dinara”, „11 dinara”, „21 dinar” */
export function dinars(amount: number): string {
    return `${amount} ${dinarWord(amount)}`;
}

export function dinarWord(amount: number): "dinar" | "dinara" {
    return nounForm(Math.abs(Math.round(amount))) === "one" ? "dinar" : "dinara";
}

const HUNDREDS = ["", "sto", "dvesta", "trista", "četiristo", "petsto", "šeststo", "sedamsto", "osamsto", "devetsto"];

/** Broj rečima do 999 („trideset pet”, „sto dvadeset”, „dvesta”) — za glas */
export function moneyWord(amount: number): string {
    const value = Math.min(Math.max(Math.round(amount), 0), 999);
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    if (hundreds === 0) return numberWord(rest);
    return rest === 0 ? HUNDREDS[hundreds] : `${HUNDREDS[hundreds]} ${numberWord(rest)}`;
}

/** Rečenica za glas: brojevi se izgovaraju rečima („35 dinara” → „trideset pet dinara”) */
export function spoken(text: string): string {
    return text.replace(/\d+/g, (digits) => moneyWord(Number(digits)));
}

/** Da li se od datih novčića (svaki jednom) može sastaviti tačno `amount` */
export function canPay(amount: number, money: readonly number[]): boolean {
    if (amount === 0) return true;
    if (amount < 0) return false;
    let reachable = new Set<number>([0]);
    for (const value of money) {
        const next = new Set(reachable);
        for (const sum of reachable) if (sum + value <= amount) next.add(sum + value);
        reachable = next;
        if (reachable.has(amount)) return true;
    }
    return reachable.has(amount);
}

/** Jedan način da se plati `amount` od datih novčića (najveći prvo), ili null */
export function payWith(amount: number, money: readonly number[]): number[] | null {
    const sorted = money.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value);
    const pick = (left: number, from: number): number[] | null => {
        if (left === 0) return [];
        for (let i = from; i < sorted.length; i += 1) {
            if (sorted[i].value > left) continue;
            // Isti novčić ponovo ne treba probati sa istog mesta (ista vrednost)
            if (i > from && sorted[i].value === sorted[i - 1].value) continue;
            const rest = pick(left - sorted[i].value, i + 1);
            if (rest) return [sorted[i].index, ...rest];
        }
        return null;
    };
    return pick(amount, 0);
}

/** Najmanje novčića/novčanica za iznos (od dozvoljenih vrednosti, bez ograničenja broja) */
export function greedy(amount: number, values: readonly number[]): number[] {
    const result: number[] = [];
    let left = amount;
    for (const value of [...values].sort((a, b) => b - a)) {
        while (left >= value) {
            result.push(value);
            left -= value;
        }
    }
    return left === 0 ? result : [];
}

// ── Roba ─────────────────────────────────────────────────────────────────────

export const GOOD_IDS = [
    "apple",
    "banana",
    "carrot",
    "bread",
    "milk",
    "yogurt",
    "juice",
    "cheese",
    "chocolate",
    "cookie",
    "lollipop",
    "roll",
    "water",
    "icecream",
    "pencil",
    "notebook",
    "ball",
] as const;
export type GoodId = (typeof GOOD_IDS)[number];

export interface Good {
    id: GoodId;
    /** Nominativ („jabuka”) */
    name: string;
    /** Genitiv („Jabuke nema na spisku.”) */
    gen: string;
    gender: "m" | "f" | "n";
}

const g = (id: GoodId, name: string, gen: string, gender: Good["gender"]): Good => ({ id, name, gen, gender });

export const GOODS: readonly Good[] = [
    g("apple", "jabuka", "jabuke", "f"),
    g("banana", "banana", "banane", "f"),
    g("carrot", "šargarepa", "šargarepe", "f"),
    g("bread", "hleb", "hleba", "m"),
    g("milk", "mleko", "mleka", "n"),
    g("yogurt", "jogurt", "jogurta", "m"),
    g("juice", "sok", "soka", "m"),
    g("cheese", "sir", "sira", "m"),
    g("chocolate", "čokolada", "čokolade", "f"),
    g("cookie", "keks", "keksa", "m"),
    g("lollipop", "lizalica", "lizalice", "f"),
    g("roll", "kifla", "kifle", "f"),
    g("water", "voda", "vode", "f"),
    g("icecream", "sladoled", "sladoleda", "m"),
    g("pencil", "olovka", "olovke", "f"),
    g("notebook", "sveska", "sveske", "f"),
    g("ball", "lopta", "lopte", "f"),
];

export function getGood(id: unknown): Good | undefined {
    return typeof id === "string" ? GOODS.find((good) => good.id === id) : undefined;
}

function good(id: GoodId): Good {
    return getGood(id)!;
}

const cap = (text: string) => text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);

/** „Mali sok”, „Velika čokolada”, „Malo mleko” (za budžet: dve veličine iste stvari) */
export function sizedName(id: GoodId, big: boolean): string {
    const info = good(id);
    const adjective = big ? { m: "veliki", f: "velika", n: "veliko" }[info.gender] : { m: "mali", f: "mala", n: "malo" }[info.gender];
    return `${adjective} ${info.name}`;
}

/** Natpis robe: „Jabuka” (ili „Mali sok” kad postoje dve veličine) */
export function goodLabel(id: string, size: "small" | "big" | null = null): string {
    const info = getGood(id);
    if (!info) return "";
    return cap(size ? sizedName(info.id, size === "big") : info.name);
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 * list — kupi sve sa spiska (slike, bez novca) · pay — plati tačnu cenu novčićima ·
 * match — koji novčić je toliko dinara · afford — šta možeš da kupiš za toliko dinara ·
 * sum — koliko košta sve zajedno (izbor) · change — koliko dobijaš kusura (izbor) ·
 * budget — kupi sve sa spiska, a ne potroši više nego što imaš
 */
export type MarketTask = "list" | "pay" | "match" | "afford" | "sum" | "change" | "budget";

export interface MarketLevel {
    task: MarketTask;
    rounds: number;
    earlyHint: boolean;
    /** Spisak: koliko stvari, i koliko ih stoji na polici */
    list?: number;
    shelf?: number;
    /** Plaćanje: cena (od–do) i vrednosti u novčaniku */
    price?: readonly [number, number];
    money?: readonly number[];
    /** Na pultu su nacrtana mesta za svaki novčić (prva plaćanja) */
    slots?: boolean;
    /** Plaća se za dve stvari odjednom (cene se sabiraju) */
    pair?: boolean;
    /** Novčići među kojima se bira („Koji novčić je 5 dinara?”) */
    coins?: readonly number[];
    /** Koliko dinara dete ima (afford, budget) */
    budget?: number;
    /** Kusur: kojom novčanicom se plaća */
    given?: readonly number[];
    /** Kusur: cene su okrugle (deljive sa 5) */
    round5?: boolean;
    choices?: number;
}

export const MARKET_LEVELS: readonly MarketLevel[] = [
    // Lako: kupovina po slikama, pa novčići od 1 dinara (brojanje), pa koji novčić je koliko
    { task: "list", list: 2, shelf: 4, rounds: 3, earlyHint: true },
    { task: "list", list: 3, shelf: 6, rounds: 3, earlyHint: true },
    { task: "pay", price: [1, 3], money: [1], slots: true, rounds: 4, earlyHint: true },
    { task: "pay", price: [2, 5], money: [1], rounds: 4, earlyHint: true },
    { task: "match", coins: [1, 2, 5, 10, 20], choices: 3, rounds: 5, earlyHint: true },
    // Srednje: mešani novčići do 20 dinara, „Šta možeš da kupiš za 10 dinara?”, sabiranje cena
    { task: "pay", price: [3, 10], money: [1, 2, 5], rounds: 4, earlyHint: false },
    { task: "pay", price: [11, 20], money: [1, 2, 5, 10, 20], rounds: 4, earlyHint: false },
    { task: "afford", budget: 10, choices: 3, rounds: 4, earlyHint: false },
    { task: "sum", price: [1, 10], choices: 3, rounds: 4, earlyHint: false },
    { task: "pay", price: [2, 10], money: [1, 2, 5, 10], pair: true, rounds: 3, earlyHint: false },
    // Teško: novčanice do 100 dinara, kusur, budžet od 50 dinara
    { task: "pay", price: [21, 100], money: [1, 2, 5, 10, 20, 50, 100], rounds: 4, earlyHint: false },
    { task: "pay", price: [10, 50], money: [1, 2, 5, 10, 20, 50, 100], pair: true, rounds: 3, earlyHint: false },
    { task: "change", given: [50], round5: true, choices: 3, rounds: 4, earlyHint: false },
    { task: "change", given: [100, 200], choices: 3, rounds: 4, earlyHint: false },
    { task: "budget", list: 3, budget: 50, rounds: 3, earlyHint: false },
];

export const MARKET_MAX_LEVEL = MARKET_LEVELS.length;

export function marketLevel(level: number): MarketLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), MARKET_MAX_LEVEL);
    return MARKET_LEVELS[safe - 1];
}

// ── Zadaci ────────────────────────────────────────────────────────────────────

/** Stvar na polici ili na pultu, sa cenom (0 = bez cene) i veličinom (samo u budžetu) */
export interface Ware {
    /** Jedinstven ključ na polici („bread” ili „juice-big”) */
    key: string;
    good: GoodId;
    price: number;
    size: "small" | "big" | null;
}

export interface MarketRound {
    task: MarketTask;
    /** Spisak (list, budget): koje stvari treba kupiti */
    list: GoodId[];
    /** Police (list, budget) ili stvari na pultu (pay, match, afford, sum, change) */
    wares: Ware[];
    /** Koliko treba platiti (pay) ili koliko košta sve (sum) */
    price: number;
    /** Novčanik: vrednosti novčića i novčanica (pay) */
    wallet: number[];
    slots: boolean;
    /** Izbori: vrednosti (match: novčići; sum, change: iznosi) ili ključevi robe (afford) */
    choices: string[];
    answer: string;
    budget: number;
    given: number;
}

interface BuildOptions {
    maxRounds: number;
    maxChoices: number;
    random?: () => number;
}

/** Stvari koje se kupuju u prodavnici hrane (budžet: dve veličine iste stvari) */
const SIZED: GoodId[] = ["milk", "juice", "bread", "chocolate", "cheese", "yogurt", "water", "cookie"];

/**
 * Plan nivoa. Svaka cena je platljiva onim što je u novčaniku; kusur je uvek pozitivan; u
 * budžetu se uvek može kupiti sve sa spiska (jeftinije veličine), a ne može sve skuplje.
 * `random` daje [0, 1).
 */
export function buildMarketLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): MarketRound[] {
    const rule = marketLevel(level);
    const shuffle = <T,>(list: readonly T[]): T[] => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const between = (low: number, high: number) => low + Math.floor(random() * (high - low + 1));
    const count = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const limit = Math.max(2, Number.isFinite(maxChoices) ? maxChoices : 3);
    const empty = { list: [], wares: [], price: 0, wallet: [], slots: false, choices: [], answer: "", budget: 0, given: 0 };
    // Roba se ne ponavlja dok ima nove
    let goodsQueue: GoodId[] = [];
    const nextGoods = (n: number, avoid: readonly GoodId[] = []): GoodId[] => {
        const result: GoodId[] = [];
        let guard = 0;
        while (result.length < n && guard < 200) {
            guard += 1;
            if (goodsQueue.length === 0) goodsQueue = shuffle(GOOD_IDS);
            const next = goodsQueue.shift()!;
            if (!result.includes(next) && !avoid.includes(next)) result.push(next);
        }
        return result;
    };
    const ware = (id: GoodId, price = 0, size: Ware["size"] = null): Ware => ({ key: size ? `${id}-${size}` : id, good: id, price, size });
    const rounds: MarketRound[] = [];
    let lastPrice = -1;
    const freshPrice = (low: number, high: number) => {
        let value = between(low, high);
        for (let i = 0; i < 6 && value === lastPrice && high > low; i += 1) value = between(low, high);
        lastPrice = value;
        return value;
    };

    for (let index = 0; index < count; index += 1) {
        if (rule.task === "list") {
            const size = Math.min(rule.list ?? 2, Math.max(1, limit - 1));
            const list = nextGoods(size);
            const others = nextGoods(Math.max(1, Math.min((rule.shelf ?? 4) - size, limit + 1 - size)), list);
            // Prvi zadatak prvog nivoa: prva stvar sa spiska stoji prva na polici (ruka je pokaže)
            const shelf = level === 1 && index === 0 ? [list[0], ...shuffle([...list.slice(1), ...others])] : shuffle([...list, ...others]);
            rounds.push({ ...empty, task: "list", list, wares: shelf.map((id) => ware(id)) });
            continue;
        }

        if (rule.task === "pay") {
            const [low, high] = rule.price ?? [1, 5];
            const values = [...(rule.money ?? [1])].sort((a, b) => a - b);
            let wares: Ware[];
            let price: number;
            if (rule.pair) {
                const [a, b] = nextGoods(2);
                const first = between(low, high);
                const second = between(low, high);
                wares = [ware(a, first), ware(b, second)];
                price = first + second;
            } else {
                price = freshPrice(low, high);
                wares = [ware(nextGoods(1)[0], price)];
            }
            rounds.push({ ...empty, task: "pay", wares, price, wallet: buildWallet(price, values, random), slots: rule.slots === true });
            continue;
        }

        if (rule.task === "match") {
            // Prvo novčići od 1, 2 i 5 (dva izbora za mlađu decu), pa i 10 i 20
            const pool = index < 2 ? [1, 2, 5] : [...(rule.coins ?? COINS)];
            const fresh = pool.filter((v) => v !== lastPrice);
            const value = fresh[Math.floor(random() * fresh.length)];
            lastPrice = value;
            const size = Math.min(rule.choices ?? 3, limit);
            const others = shuffle(pool.filter((v) => v !== value)).slice(0, size - 1);
            const choices = shuffle([value, ...others]).map(String);
            rounds.push({ ...empty, task: "match", wares: [ware(nextGoods(1)[0], value)], price: value, choices, answer: String(value) });
            continue;
        }

        if (rule.task === "afford") {
            const budget = rule.budget ?? 10;
            const size = Math.min(rule.choices ?? 3, limit);
            const goods = nextGoods(size);
            // Jedna stvar je jeftinija (ili ista kao novac), ostale su skuplje — prvo jasno skuplje
            const cheap = between(Math.max(1, budget - 7), budget);
            const prices = goods.map((_, i) => (i === 0 ? cheap : between(budget + (index === 0 ? 5 : 1), budget * 2)));
            const wares = shuffle(goods.map((id, i) => ware(id, prices[i])));
            rounds.push({ ...empty, task: "afford", wares, budget, choices: wares.map((w) => w.key), answer: goods[0] });
            continue;
        }

        if (rule.task === "sum") {
            const [low, high] = rule.price ?? [1, 10];
            const [a, b] = nextGoods(2);
            const first = between(low, high);
            const second = between(low, high);
            const total = first + second;
            const size = Math.min(rule.choices ?? 3, limit);
            const near = shuffle([total - 1, total + 1, total - 2, total + 2, total + 10, Math.abs(first - second)].filter((v) => v > 0 && v !== total));
            const choices = shuffle([total, ...Array.from(new Set(near)).slice(0, size - 1)]).map(String);
            rounds.push({ ...empty, task: "sum", wares: [ware(a, first), ware(b, second)], price: total, choices, answer: String(total) });
            continue;
        }

        if (rule.task === "change") {
            const given = (rule.given ?? [50])[index % (rule.given ?? [50]).length];
            const price = rule.round5 ? 5 * between(1, given / 5 - 1) : between(Math.max(1, Math.round(given * 0.3)), given - 1);
            const change = given - price;
            const size = Math.min(rule.choices ?? 3, limit);
            // Česte greške: cena umesto kusura, deset više ili manje, pet više ili manje
            const near = [price, change + 10, change - 10, change + 5, change - 5, change + 1].filter((v) => v > 0 && v !== change && v < given);
            const choices = shuffle([change, ...Array.from(new Set(shuffle(near))).slice(0, size - 1)]).map(String);
            rounds.push({ ...empty, task: "change", wares: [ware(nextGoods(1)[0], price)], price, given, choices, answer: String(change) });
            continue;
        }

        // budget: tri stvari sa spiska, svaka u dve veličine; sve manje staje u budžet, sve veće ne
        const budget = rule.budget ?? 50;
        const list = shuffle(SIZED).slice(0, Math.min(rule.list ?? 3, 3));
        let small: number[] = [];
        let big: number[] = [];
        for (let attempt = 0; attempt < 60; attempt += 1) {
            small = list.map(() => between(5, 15));
            big = small.map((value) => value + between(8, 18));
            const smallSum = small.reduce((a, b) => a + b, 0);
            const bigSum = big.reduce((a, b) => a + b, 0);
            // Bar jedna veća stvar sme da uđe, ali sve veće zajedno ne
            const roomForOneBig = big.some((value, i) => smallSum - small[i] + value <= budget);
            if (smallSum <= budget && bigSum > budget && roomForOneBig) break;
        }
        const wares = shuffle(list.flatMap((id, i) => [ware(id, small[i], "small"), ware(id, big[i], "big")]));
        rounds.push({ ...empty, task: "budget", list, wares, budget });
    }
    return rounds;
}

/**
 * Novčanik za plaćanje: najmanje novčića za cenu (od dozvoljenih vrednosti), pa još po koji
 * „višak” — drugačiji novčići (da se bira) i jedan koji bi bio previše. Sa samo novčićima
 * od 1 dinara: tačno toliko plus dva.
 */
export function buildWallet(price: number, values: readonly number[], random: () => number = Math.random): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    if (sorted.length === 1 && sorted[0] === 1) return Array.from({ length: price + 2 }, () => 1);
    const exact = greedy(price, sorted);
    const extra: number[] = [];
    // Po jedan novčić svake manje vrednosti koje nema u tačnom plaćanju (do tri)
    for (const value of sorted) {
        if (extra.length >= 3) break;
        if (value <= price && !exact.includes(value)) extra.push(value);
    }
    // Jedan veći od cene (ako postoji): previše je, pa se ne prihvata
    const bigger = sorted.find((value) => value > price);
    if (bigger !== undefined && random() < 0.6) extra.push(bigger);
    // I bar jedan sitan novčić više, da se do cene može i drugim putem
    extra.push(sorted[0]);
    return [...exact, ...extra].sort((a, b) => b - a).slice(0, 10);
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

export const LIST_DONE = "Sve sa spiska je u korpi.";
export const TOO_MUCH = "To je previše.";

export function listIntro(list: readonly string[]): string {
    const names = list.map((id) => getGood(id)?.name ?? "").filter(Boolean);
    const spoken = names.length > 1 ? `${names.slice(0, -1).join(", ")} i ${names[names.length - 1]}` : (names[0] ?? "");
    return `Na spisku ${names.length > 1 ? "su" : "je"} ${spoken}. Stavi sve u korpu.`;
}

export function inBasketSentence(id: string): string {
    return `${goodLabel(id)} je u korpi.`;
}

export function notOnListSentence(id: string): string {
    const info = getGood(id);
    return info ? `${cap(info.gen)} nema na spisku.` : "";
}

/** „Hleb košta 7 dinara.” (ili „Hleb i mleko koštaju 12 dinara.” bez zbira u pitanju) */
export function payQuestion(round: Pick<MarketRound, "wares" | "price">): string {
    if (round.wares.length > 1) return `${goodLabel(round.wares[0].good)} i ${getGood(round.wares[1].good)?.name ?? ""}. Plati sve.`;
    return `${goodLabel(round.wares[0]?.good ?? "")} košta ${dinars(round.price)}. Plati Emini.`;
}

/** Posle novčića: koliko je plaćeno do sada („Sedam.”) */
export function countSentence(paid: number): string {
    return `${cap(moneyWord(paid))}.`;
}

export function needMoreSentence(left: number): string {
    return `${TOO_MUCH} Treba još ${dinars(left)}.`;
}

export function paidSentence(round: Pick<MarketRound, "wares" | "price">, female: boolean): string {
    const sum = round.wares.length > 1 ? `${round.wares[0].price} i ${round.wares[1].price} je ${round.price}. ` : "";
    return `${sum}Plati${female ? "la" : "o"} si tačno ${dinars(round.price)}. Emina kaže: hvala!`;
}

export function matchQuestion(price: number): string {
    return `Koji novčić je ${dinars(price)}?`;
}

export function matchAnswer(value: number): string {
    return `To je ${dinars(value)}.`;
}

export function affordQuestion(budget: number): string {
    return `Imaš ${dinars(budget)}. Šta možeš da kupiš?`;
}

export function affordAnswer(ware: Ware, budget: number): string {
    return `${goodLabel(ware.good)} košta ${dinars(ware.price)}. Imaš ${dinars(budget)}, to je dovoljno.`;
}

export function affordMistake(ware: Ware, budget: number): string {
    return `${goodLabel(ware.good)} košta ${dinars(ware.price)}. To je više od ${budget}.`;
}

export const SUM_QUESTION = "Koliko košta sve zajedno?";

export function sumAnswer(round: Pick<MarketRound, "wares" | "price">): string {
    return `${round.wares[0]?.price ?? 0} i ${round.wares[1]?.price ?? 0} je ${dinars(round.price)}.`;
}

export function changeQuestion(round: Pick<MarketRound, "wares" | "price" | "given">): string {
    return `${goodLabel(round.wares[0]?.good ?? "")} košta ${dinars(round.price)}. Daješ ${dinars(round.given)}. Koliko dobijaš kusura?`;
}

export function changeAnswer(round: Pick<MarketRound, "price" | "given">): string {
    return `${round.given} manje ${round.price} je ${round.given - round.price}. Kusur je ${dinars(round.given - round.price)}.`;
}

export function budgetIntro(budget: number): string {
    return `Imaš ${dinars(budget)}. Kupi sve sa spiska, a da ne potrošiš više.`;
}

export function overBudgetSentence(left: number): string {
    return `Za to nemaš dovoljno. Ostalo ti je ${dinars(left)}.`;
}

export function alreadySentence(id: string): string {
    return `${goodLabel(id)} je već u korpi.`;
}

export const BUDGET_DONE = "Sve sa spiska je u korpi, i novca je bilo dovoljno.";

/** Pitanje zadatka (naslov i glas) */
export function marketQuestion(view: Pick<MarketView, "task" | "list" | "wares" | "price" | "budget" | "given">): string {
    switch (view.task) {
        case "list":
            return listIntro(view.list);
        case "pay":
            return payQuestion(view);
        case "match":
            return `${goodLabel(view.wares[0]?.good ?? "")} košta ${dinars(view.price)}. ${matchQuestion(view.price)}`;
        case "afford":
            return affordQuestion(view.budget);
        case "sum":
            return `${goodLabel(view.wares[0]?.good ?? "")} i ${getGood(view.wares[1]?.good)?.name ?? ""}. ${SUM_QUESTION}`;
        case "change":
            return changeQuestion(view);
        case "budget":
            return budgetIntro(view.budget);
    }
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface MarketView extends BaseView {
    task: MarketTask;
    list: string[];
    wares: Ware[];
    price: number;
    /** Novčanik: vrednost svakog novčića (indeks je ključ novčića) */
    wallet: number[];
    /** Indeksi novčića koji su na pultu */
    paid: number[];
    slots: boolean;
    choices: string[];
    answer: string;
    budget: number;
    given: number;
    /** U korpi (ključevi robe) */
    basket: string[];
    selected: string | null;
    /** Pomoć: šta sledeće zasvetli (ključ robe, novčić „c3” ili izbor) */
    hint: boolean;
    wrong: string[];
    /** Poslednja greška: šta je rečeno (bez glasa na monitoru) */
    note: string | null;
    picked: string | null;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyMarketView(totalRounds: number): MarketView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        task: "list",
        list: [],
        wares: [],
        price: 0,
        wallet: [],
        paid: [],
        slots: false,
        choices: [],
        answer: "",
        budget: 0,
        given: 0,
        basket: [],
        selected: null,
        hint: false,
        wrong: [],
        note: null,
        picked: null,
        feedback: null,
    };
}

export function marketRoundView(round: MarketRound): Partial<MarketView> {
    return {
        task: round.task,
        list: [...round.list],
        wares: round.wares.map((w) => ({ ...w })),
        price: round.price,
        wallet: [...round.wallet],
        paid: [],
        slots: round.slots,
        choices: [...round.choices],
        answer: round.answer,
        budget: round.budget,
        given: round.given,
        basket: [],
        selected: null,
        hint: false,
        wrong: [],
        note: null,
        picked: null,
        feedback: null,
    };
}

export const coinKey = (index: number) => `c${index}`;

export function coinIndex(key: string): number | null {
    const match = /^c(\d+)$/.exec(key);
    return match ? Number(match[1]) : null;
}

export function paidSum(view: Pick<MarketView, "wallet" | "paid">): number {
    return view.paid.reduce((sum, index) => sum + (view.wallet[index] ?? 0), 0);
}

export function basketSum(view: Pick<MarketView, "wares" | "basket">): number {
    return view.basket.reduce((sum, key) => sum + (view.wares.find((w) => w.key === key)?.price ?? 0), 0);
}

/**
 * Pomoć pri plaćanju: novčić koji sledeći vodi do tačne cene (najveći koji ne prelazi), ili —
 * kad sa pulta više ne može tačno — novčić koji treba vratiti.
 */
export function payHint(view: Pick<MarketView, "wallet" | "paid" | "price">): { give: number } | { back: number } | null {
    const left = view.price - paidSum(view);
    if (left <= 0) return null;
    const free = view.wallet.map((value, index) => ({ value, index })).filter((coin) => !view.paid.includes(coin.index));
    const way = payWith(
        left,
        free.map((coin) => coin.value)
    );
    if (way && way.length > 0) return { give: free[way[0]].index };
    const back = [...view.paid].reverse().find((index) => canPay(view.price - paidSum({ wallet: view.wallet, paid: view.paid.filter((other) => other !== index) }), free.map((c) => c.value)));
    return back === undefined ? null : { back };
}

/** Sledeća stvar sa spiska koja nije u korpi (pomoć); u budžetu manja veličina */
export function listHint(view: Pick<MarketView, "list" | "wares" | "basket" | "task">): string | null {
    for (const id of view.list) {
        if (view.basket.some((key) => view.wares.find((w) => w.key === key)?.good === id)) continue;
        const options = view.wares.filter((w) => w.good === id).sort((a, b) => a.price - b.price);
        if (options[0]) return options[0].key;
    }
    return null;
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen. Prvi zadatak prvog nivoa pokazuje ruka (ne ocenjuje se); „correct” = bez
 * ijedne greške i bez pomoći; „prompted” = uz pomoć (osim pokaznog).
 */
export function solveMarketView(current: MarketView, level: number, solved: Partial<MarketView> = {}): { next: MarketView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hint;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: MarketView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function marketResult(final: MarketView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

const TASKS: readonly MarketTask[] = ["list", "pay", "match", "afford", "sum", "change", "budget"];

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeMarketMonitor(state: Partial<MarketView> | null | undefined): MarketView {
    const base = emptyMarketView(1);
    if (!state) return base;
    const amount = (value: unknown, max = 999) => (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max ? value : 0);
    const wares: Ware[] = Array.isArray(state.wares)
        ? state.wares
              .filter((w): w is Ware => Boolean(w) && typeof w === "object" && getGood((w as Ware).good) !== undefined && typeof (w as Ware).key === "string")
              .slice(0, 8)
              .map((w) => ({ key: w.key.slice(0, 24), good: w.good, price: amount(w.price), size: w.size === "small" || w.size === "big" ? w.size : null }))
        : [];
    const keys = wares.map((w) => w.key);
    const wallet = Array.isArray(state.wallet) ? state.wallet.filter(isDenomination).slice(0, 12) : [];
    const paid = Array.isArray(state.paid) ? Array.from(new Set(state.paid.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < wallet.length))) : [];
    const strings = (value: unknown, max = 8) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length <= 24).slice(0, max) : []);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        task: TASKS.includes(state.task as MarketTask) ? (state.task as MarketTask) : "list",
        list: strings(state.list).filter((id) => getGood(id) !== undefined),
        wares,
        price: amount(state.price),
        wallet,
        paid,
        slots: state.slots === true,
        choices: strings(state.choices),
        answer: typeof state.answer === "string" ? state.answer.slice(0, 24) : "",
        budget: amount(state.budget),
        given: amount(state.given),
        basket: strings(state.basket).filter((key) => keys.includes(key)),
        selected: typeof state.selected === "string" ? state.selected.slice(0, 24) : null,
        hint: state.hint === true,
        wrong: strings(state.wrong, 24),
        note: typeof state.note === "string" ? state.note.slice(0, 200) : null,
        picked: typeof state.picked === "string" ? state.picked.slice(0, 24) : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
