// Igra „Prodavnica” (app/components/games/data/marketLevels.ts): novac i oblici reči uz broj,
// plaćanje (svaka cena se može platiti onim što je u novčaniku), kusur, budžet, nivoi,
// rečenice, bodovanje i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    affordAnswer,
    affordMistake,
    basketSum,
    buildMarketLevel,
    buildWallet,
    canPay,
    changeAnswer,
    COINS,
    countSentence,
    dinars,
    emptyMarketView,
    getGood,
    GOODS,
    greedy,
    listHint,
    MARKET_LEVELS,
    MARKET_MAX_LEVEL,
    marketQuestion,
    marketResult,
    marketRoundView,
    mergeMarketMonitor,
    moneyWord,
    needMoreSentence,
    NOTES,
    notOnListSentence,
    overBudgetSentence,
    paidSentence,
    paidSum,
    payHint,
    payWith,
    sizedName,
    solveMarketView,
    spoken,
    sumAnswer,
    type MarketRound,
    type MarketView,
} from "@/app/components/games/data/marketLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde|tamo gore|levo|desno/i;

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

function plans(level: number) {
    const result: { where: string; rounds: MarketRound[]; maxChoices: number }[] = [];
    for (const preset of Object.values(BAND_PRESETS)) {
        for (let seed = 1; seed <= 8; seed += 1) {
            result.push({ where: `L${level} ${preset.label} s${seed}`, rounds: buildMarketLevel(level, { maxRounds: preset.maxRounds, maxChoices: preset.maxChoices, random: seeded(seed * 13 + level) }), maxChoices: preset.maxChoices });
        }
    }
    return result;
}

describe("market money words", () => {
    it("says dinar with the right Serbian form after a number", () => {
        assert.equal(dinars(1), "1 dinar");
        assert.equal(dinars(2), "2 dinara");
        assert.equal(dinars(5), "5 dinara");
        assert.equal(dinars(11), "11 dinara");
        assert.equal(dinars(21), "21 dinar");
        assert.equal(dinars(22), "22 dinara");
        assert.equal(dinars(100), "100 dinara");
        assert.equal(dinars(101), "101 dinar");
        assert.equal(dinars(111), "111 dinara");
    });

    it("reads numbers as words for the voice", () => {
        assert.equal(moneyWord(1), "jedan");
        assert.equal(moneyWord(21), "dvadeset jedan");
        assert.equal(moneyWord(35), "trideset pet");
        assert.equal(moneyWord(100), "sto");
        assert.equal(moneyWord(120), "sto dvadeset");
        assert.equal(moneyWord(200), "dvesta");
        assert.equal(spoken("Hleb košta 21 dinar."), "Hleb košta dvadeset jedan dinar.");
        assert.equal(countSentence(7), "Sedam.");
    });

    it("has Serbian coins and notes, each drawn once", () => {
        assert.deepEqual([...COINS], [1, 2, 5, 10, 20]);
        assert.deepEqual([...NOTES], [50, 100, 200]);
    });
});

describe("market paying", () => {
    it("knows when an amount can be paid exactly from the coins at hand", () => {
        assert.ok(canPay(7, [5, 2, 1]));
        assert.ok(canPay(7, [5, 1, 1, 1]));
        assert.ok(!canPay(4, [5, 10]));
        assert.ok(canPay(0, []));
        assert.ok(!canPay(3, [2, 2]));
        assert.deepEqual(greedy(38, [1, 2, 5, 10, 20]), [20, 10, 5, 2, 1]);
        assert.deepEqual(greedy(3, [2]), []);
        const way = payWith(8, [5, 2, 2, 1]);
        assert.ok(way);
        assert.equal(way!.reduce((sum, index) => sum + [5, 2, 2, 1][index], 0), 8);
    });

    it("always puts enough money in the wallet to pay exactly, plus a few to choose from", () => {
        for (let seed = 1; seed <= 40; seed += 1) {
            const random = seeded(seed);
            for (const [values, low, high] of [
                [[1], 1, 5],
                [[1, 2, 5], 3, 10],
                [[1, 2, 5, 10, 20], 11, 40],
                [[1, 2, 5, 10, 20, 50, 100], 21, 100],
            ] as const) {
                for (let price = low; price <= high; price += 1) {
                    const wallet = buildWallet(price, values, random);
                    assert.ok(canPay(price, wallet), `${price} od ${wallet.join(",")}`);
                    assert.ok(wallet.every((value) => (values as readonly number[]).includes(value)));
                    assert.ok(wallet.length <= 10 && wallet.length > (values.length === 1 ? price : 1), `${price}: ${wallet.join(",")}`);
                }
            }
        }
        // Samo novčići od 1 dinara: tačno toliko plus dva
        assert.deepEqual(buildWallet(3, [1]), [1, 1, 1, 1, 1]);
    });

    it("hints the next good coin, or a coin to take back when the counter cannot reach the price", () => {
        const view = (paid: number[]) => ({ wallet: [10, 5, 2, 2, 1], paid, price: 9 });
        const first = payHint(view([]));
        assert.ok(first && "give" in first);
        assert.equal([10, 5, 2, 2, 1][(first as { give: number }).give], 5);
        // 2 + 2 + 1 = 5 na pultu; ostaju 10 i 5, a fali 4: jedan novčić treba vratiti
        const stuck = payHint(view([2, 3, 4]));
        assert.ok(stuck && "back" in stuck);
        // Plaćeno je tačno (5 + 2 + 2): pomoć više ne treba
        assert.equal(payHint(view([1, 2, 3])), null);
        assert.equal(paidSum(view([1, 2])), 7);
    });
});

describe("market goods", () => {
    it("has a name, a genitive and a gender for every item", () => {
        assert.equal(new Set(GOODS.map((good) => good.id)).size, GOODS.length);
        for (const good of GOODS) {
            assert.ok(good.name && good.gen, good.id);
            assert.doesNotMatch(toCyrillic(notOnListSentence(good.id)), /\p{Script=Latin}/u);
        }
        assert.equal(notOnListSentence("milk"), "Mleka nema na spisku.");
        assert.equal(sizedName("milk", false), "malo mleko");
        assert.equal(sizedName("juice", true), "veliki sok");
        assert.equal(sizedName("chocolate", false), "mala čokolada");
    });
});

describe("market levels", () => {
    it("has fifteen levels in three tiers", () => {
        assert.equal(MARKET_MAX_LEVEL, 15);
        assert.equal(MARKET_LEVELS.length, MAX_LEVEL);
        assert.deepEqual(
            MARKET_LEVELS.map((rule) => rule.task),
            ["list", "list", "pay", "pay", "match", "pay", "pay", "afford", "sum", "pay", "pay", "pay", "change", "change", "budget"]
        );
        assert.ok(MARKET_LEVELS.slice(0, 5).every((rule) => rule.earlyHint));
        assert.deepEqual(MARKET_LEVELS[2].money, [1]);
        assert.deepEqual(MARKET_LEVELS[3].money, [1]);
        assert.ok(MARKET_LEVELS.slice(5, 10).every((rule) => !rule.money || rule.money.every((value) => value <= 20)));
        assert.ok(MARKET_LEVELS[10].money!.includes(50) && MARKET_LEVELS[10].money!.includes(100));
    });

    it("makes every price payable with the money at hand, on every level and for every age band", () => {
        for (const level of LEVELS) {
            for (const { where, rounds, maxChoices } of plans(level)) {
                assert.ok(rounds.length >= 2, where);
                rounds.forEach((round, index) => {
                    const at = `${where} z${index + 1}`;
                    assert.equal(round.task, MARKET_LEVELS[level - 1].task, at);
                    for (const ware of round.wares) assert.ok(getGood(ware.good), at);
                    switch (round.task) {
                        case "list": {
                            assert.ok(round.list.length >= 1, at);
                            assert.ok(round.wares.some((w) => !round.list.includes(w.good)), `${at}: na polici ima i nešto što nije na spisku`);
                            for (const id of round.list) assert.ok(round.wares.some((w) => w.good === id), `${at}: ${id} je na polici`);
                            assert.equal(new Set(round.wares.map((w) => w.key)).size, round.wares.length, at);
                            break;
                        }
                        case "pay": {
                            const rule = MARKET_LEVELS[level - 1];
                            assert.equal(round.price, round.wares.reduce((sum, w) => sum + w.price, 0), at);
                            assert.ok(canPay(round.price, round.wallet), `${at}: ${round.price} od ${round.wallet.join(",")}`);
                            for (const value of round.wallet) assert.ok(rule.money!.includes(value), `${at}: ${value}`);
                            if (!rule.pair) assert.ok(round.price >= rule.price![0] && round.price <= rule.price![1], at);
                            break;
                        }
                        case "match": {
                            assert.ok(round.choices.includes(String(round.price)), at);
                            assert.equal(round.answer, String(round.price));
                            assert.ok(round.choices.every((choice) => (COINS as readonly number[]).includes(Number(choice))), at);
                            break;
                        }
                        case "afford": {
                            const cheap = round.wares.filter((w) => w.price <= round.budget);
                            assert.equal(cheap.length, 1, `${at}: samo jedna stvar je dovoljno jeftina`);
                            assert.equal(round.answer, cheap[0].key, at);
                            break;
                        }
                        case "sum": {
                            assert.equal(Number(round.answer), round.wares[0].price + round.wares[1].price, at);
                            break;
                        }
                        case "change": {
                            const change = round.given - round.price;
                            assert.ok(change > 0 && round.price > 0, at);
                            assert.equal(round.answer, String(change), `${at}: kusur`);
                            for (const choice of round.choices) assert.ok(Number(choice) > 0 && Number(choice) < round.given, `${at}: ${choice}`);
                            if (MARKET_LEVELS[level - 1].round5) assert.equal(round.price % 5, 0, at);
                            break;
                        }
                        case "budget": {
                            const cheapest = round.list.reduce((sum, id) => sum + Math.min(...round.wares.filter((w) => w.good === id).map((w) => w.price)), 0);
                            const dearest = round.list.reduce((sum, id) => sum + Math.max(...round.wares.filter((w) => w.good === id).map((w) => w.price)), 0);
                            assert.ok(cheapest <= round.budget, `${at}: može se kupiti sve (${cheapest})`);
                            assert.ok(dearest > round.budget, `${at}: ne može sve skuplje (${dearest})`);
                            for (const id of round.list) assert.equal(round.wares.filter((w) => w.good === id).length, 2, `${at}: dve veličine`);
                            break;
                        }
                    }
                    if (round.choices.length > 0) {
                        assert.equal(new Set(round.choices).size, round.choices.length, `${at}: isti izbor dvaput`);
                        assert.ok(round.choices.length >= 2 && round.choices.length <= Math.max(2, maxChoices), `${at}: ${round.choices.length} izbora`);
                        assert.ok(round.choices.includes(round.answer), at);
                    }
                });
            }
        }
    });

    it("starts the first payments with one-dinar coins and room drawn for each coin", () => {
        const [first] = buildMarketLevel(3, { maxRounds: 5, maxChoices: 3, random: seeded(4) });
        assert.ok(first.slots);
        assert.ok(first.wallet.every((value) => value === 1));
        assert.ok(first.price >= 1 && first.price <= 3);
    });
});

describe("market change math", () => {
    it("computes change correctly and says it as a subtraction", () => {
        assert.equal(changeAnswer({ price: 35, given: 50 }), "50 manje 35 je 15. Kusur je 15 dinara.");
        assert.equal(changeAnswer({ price: 79, given: 100 }), "100 manje 79 je 21. Kusur je 21 dinar.");
        assert.equal(changeAnswer({ price: 120, given: 200 }), "200 manje 120 je 80. Kusur je 80 dinara.");
        for (let seed = 1; seed <= 30; seed += 1) {
            for (const level of [13, 14]) {
                for (const round of buildMarketLevel(level, { maxRounds: 8, maxChoices: 6, random: seeded(seed) })) {
                    assert.equal(Number(round.answer) + round.price, round.given);
                }
            }
        }
    });
});

describe("market sentences", () => {
    it("talks about money calmly and in Serbian", () => {
        assert.equal(needMoreSentence(2), "To je previše. Treba još 2 dinara.");
        assert.equal(needMoreSentence(1), "To je previše. Treba još 1 dinar.");
        assert.equal(overBudgetSentence(21), "Za to nemaš dovoljno. Ostalo ti je 21 dinar.");
        assert.equal(paidSentence({ wares: [{ key: "bread", good: "bread", price: 7, size: null }], price: 7 }, true), "Platila si tačno 7 dinara. Emina kaže: hvala!");
        assert.equal(paidSentence({ wares: [{ key: "bread", good: "bread", price: 3, size: null }, { key: "milk", good: "milk", price: 5, size: null }], price: 8 }, false), "3 i 5 je 8. Platio si tačno 8 dinara. Emina kaže: hvala!");
        assert.equal(sumAnswer({ wares: [{ key: "a", good: "apple", price: 3, size: null }, { key: "b", good: "bread", price: 5, size: null }], price: 8 }), "3 i 5 je 8 dinara.");
        const juice = { key: "juice", good: "juice" as const, price: 15, size: null };
        assert.equal(affordMistake(juice, 10), "Sok košta 15 dinara. To je više od 10.");
        assert.equal(affordAnswer({ ...juice, price: 7 }, 10), "Sok košta 7 dinara. Imaš 10 dinara, to je dovoljno.");
    });

    it("never tells the child where to tap, and every question can be shown in Cyrillic", () => {
        for (const level of LEVELS) {
            for (const round of buildMarketLevel(level, { maxRounds: 8, maxChoices: 6, random: seeded(level) })) {
                const view = { ...emptyMarketView(1), ...marketRoundView(round) } as MarketView;
                const question = marketQuestion(view);
                assert.doesNotMatch(question, TAP_WORDS, question);
                assert.doesNotMatch(toCyrillic(question), /\p{Script=Latin}/u, question);
                assert.doesNotMatch(question, /undefined|NaN|\s{2}/, question);
            }
        }
    });
});

describe("market budget", () => {
    it("adds up the basket and hints the cheaper size of the next item on the list", () => {
        const view = {
            task: "budget" as const,
            list: ["milk", "juice"],
            wares: [
                { key: "milk-small", good: "milk" as const, price: 8, size: "small" as const },
                { key: "milk-big", good: "milk" as const, price: 20, size: "big" as const },
                { key: "juice-small", good: "juice" as const, price: 9, size: "small" as const },
                { key: "juice-big", good: "juice" as const, price: 25, size: "big" as const },
            ],
            basket: ["milk-big"],
        };
        assert.equal(basketSum(view), 20);
        assert.equal(listHint(view), "juice-small");
        assert.equal(listHint({ ...view, basket: ["milk-big", "juice-small"] }), null);
    });
});

describe("market scoring", () => {
    const view = (extra: Partial<MarketView> = {}): MarketView => ({ ...emptyMarketView(4), ...extra });

    it("does not score the demonstrated first round of level 1", () => {
        const { next, modeled } = solveMarketView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts a clean round as correct, a helped round as prompted, a round with mistakes as neither", () => {
        assert.equal(solveMarketView(view({ round: 2 }), 3).next.correctCount, 1);
        assert.equal(solveMarketView(view({ round: 2, hint: true }), 3).next.promptedCount, 1);
        const missed = solveMarketView(view({ round: 2, wrong: ["c3"] }), 3).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = marketResult(view({ totalRounds: 4, correctCount: 4, promptedCount: 4 }), 1, 30);
        assert.equal(result.total, 3);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeMarketMonitor({
            task: "steal",
            wares: [{ key: "bread", good: "bread", price: 7, size: null }, { key: "x", good: "car", price: 1, size: null }],
            wallet: [1, 3, 5, 50],
            paid: [0, 9, 0],
            basket: ["bread", "x"],
            price: -4,
        } as unknown as Partial<MarketView>);
        assert.equal(merged.task, "list");
        assert.deepEqual(merged.wares.map((w) => w.key), ["bread"]);
        assert.deepEqual(merged.wallet, [1, 5, 50]);
        assert.deepEqual(merged.paid, [0]);
        assert.deepEqual(merged.basket, ["bread"]);
        assert.equal(merged.price, 0);
    });
});

describe("market game registry entry", () => {
    const game = getGame("market");

    it("is activity 28, graded, cognitive, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 28);
        assert.equal(game.gameType, "market");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0023_market_game.sql"), "utf8");
        assert.match(sql, /\(28, 'Prodavnica', '[^']+', 'cognitive'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("market"));
        assert.ok(isRemoteGame("market"));
    });
});
