// Igra „Vaga” (app/components/games/data/scaleLevels.ts): nivoi, težine, nagib, rečenice,
// bodovanje, monitor i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    buildScaleLevel,
    chainOrder,
    choiceLabel,
    cubes,
    CHAIN_ANIMALS,
    emptyScaleView,
    getScaleItem,
    groupTokens,
    isToken,
    loadWeight,
    MAX_ON_PAN,
    MAX_TILT,
    mergeScaleMonitor,
    nextBalanceStep,
    NOT_YET,
    overSentence,
    panLoads,
    scaleAnswer,
    SCALE_ITEMS,
    SCALE_LEVELS,
    SCALE_MAX_LEVEL,
    scaleMistake,
    scaleQuestion,
    scaleResult,
    scaleRoundView,
    solveScaleView,
    SURPRISE_PAIRS,
    SWAP_PAIRS,
    tiltFor,
    trialLoad,
    VERY_DIFFERENT,
    CLEAR_PAIRS,
    viewTilt,
    weightValue,
    type ScaleRound,
    type ScaleView,
} from "@/app/components/games/data/scaleLevels";
import { isPictureId } from "@/app/components/games/pictures";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde|tu dole|tamo gore|levo|desno/i;
const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);
const BANDS = [
    { maxRounds: 5, maxChoices: 3 },
    { maxRounds: 6, maxChoices: 4 },
    { maxRounds: 8, maxChoices: 6 },
];
/** Crteži koji nisu u zajedničkom kompletu slika (nacrtani u scale/ScaleArt.tsx) */
const OWN_ART = ["stone", "feather", "leaf", "parcel"];

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

const viewOf = (round: ScaleRound, extra: Partial<ScaleView> = {}): ScaleView => ({ ...emptyScaleView(5), ...scaleRoundView(round), ...extra });

/** Sva rešenja ravnoteže tegovima iz korpe (do MAX_ON_PAN tegova) */
function solvable(target: number, tray: readonly string[]): boolean {
    const values = tray.map(weightValue);
    const reach = new Map<number, number>([[0, 0]]);
    for (let step = 0; step < MAX_ON_PAN; step += 1) {
        for (const [sum, count] of [...reach]) for (const v of values) if (!reach.has(sum + v) && count < MAX_ON_PAN) reach.set(sum + v, count + 1);
    }
    return reach.has(target);
}

describe("scale items and art", () => {
    it("every item has art, a name with its cases, and sensible weights", () => {
        const ids = new Set<string>();
        for (const item of SCALE_ITEMS) {
            assert.ok(!ids.has(item.id), item.id);
            ids.add(item.id);
            assert.ok(isPictureId(item.id) || OWN_ART.includes(item.id), `${item.id} ima crtež`);
            assert.ok(item.name && item.gen && item.ins, item.id);
            assert.ok(item.grams > 0 && item.size > 0 && item.size <= 1, item.id);
            if (item.units !== undefined) assert.ok(Number.isInteger(item.units) && item.units >= 1 && item.units <= 8, item.id);
        }
    });

    it("pairs are really heavier → lighter, and surprises are small-but-heavy", () => {
        for (const [heavy, light] of [...VERY_DIFFERENT, ...CLEAR_PAIRS, ...SURPRISE_PAIRS]) {
            assert.ok(getScaleItem(heavy)!.grams > getScaleItem(light)!.grams, `${heavy} > ${light}`);
        }
        for (const [heavy, light] of VERY_DIFFERENT) assert.ok(getScaleItem(heavy)!.grams / getScaleItem(light)!.grams >= 100, `${heavy} ≫ ${light}`);
        for (const [heavy, light] of SURPRISE_PAIRS) assert.ok(getScaleItem(heavy)!.size < getScaleItem(light)!.size, `${heavy} je manji od ${light}`);
    });

    it("swap pairs use whole numbers of the same units as the balance levels", () => {
        for (const [x, y] of SWAP_PAIRS) {
            const ratio = getScaleItem(x)!.units! / getScaleItem(y)!.units!;
            assert.ok(Number.isInteger(ratio) && ratio >= 2, `${x} = ${ratio} × ${y}`);
            assert.ok(getScaleItem(y)!.few && getScaleItem(y)!.many && getScaleItem(x)!.few, `${x}, ${y} imaju oblike množine`);
        }
    });

    it("chain animals are drawn the same size and have names", () => {
        for (const id of CHAIN_ANIMALS) assert.ok(getScaleItem(id), id);
    });

    it("says counts of cubes with the right Serbian grammar", () => {
        assert.equal(cubes(1), "jedna kocka");
        assert.equal(cubes(2), "dve kocke");
        assert.equal(cubes(4), "četiri kocke");
        assert.equal(cubes(5), "pet kocaka");
        assert.equal(cubes(8), "osam kocaka");
        assert.equal(cubes(12), "dvanaest kocaka");
    });
});

describe("scale levels", () => {
    it("has 15 levels in three tiers with a clear ramp", () => {
        assert.equal(SCALE_MAX_LEVEL, 15);
        assert.equal(SCALE_LEVELS.length, MAX_LEVEL);
        const tasks = SCALE_LEVELS.map((level) => level.task);
        assert.deepEqual(tasks.slice(0, 3), ["read", "read", "read"]);
        assert.equal(tasks[3], "predict");
        assert.ok(tasks.slice(4, 7).every((task) => task === "balance"));
        assert.deepEqual(tasks.slice(10), ["chain", "equation", "balance", "chain", "swap"]);
        // Pomoć posle prve greške samo na lakim nivoima; brojevi na tegovima tek posle kocaka sa tačkicama
        SCALE_LEVELS.forEach((level, i) => assert.equal(level.earlyHint, i < 5, `nivo ${i + 1}`));
        assert.ok(SCALE_LEVELS.slice(0, 9).every((level) => level.marks === "dots"));
        assert.equal(SCALE_LEVELS[9].marks, "numerals");
    });

    it("level 1 opens with the elephant and the mouse, heavier on the left (demonstrated)", () => {
        const [first] = buildScaleLevel(1, { maxRounds: 5, maxChoices: 3, random: seeded(3) });
        assert.deepEqual(first.left, ["elephant"]);
        assert.deepEqual(first.right, ["mouse"]);
        assert.equal(first.answer, "left");
        assert.equal(first.ask, "heavy");
    });

    it("every plan is valid for every age band and many seeds", () => {
        for (const level of LEVELS) {
            for (const band of BANDS) {
                for (const seed of SEEDS) {
                    const plan = buildScaleLevel(level, { ...band, random: seeded(seed * 31 + level) });
                    const where = `nivo ${level}, ${band.maxRounds}/${band.maxChoices}, seme ${seed}`;
                    assert.equal(plan.length, band.maxRounds, where);
                    for (const round of plan) {
                        assert.equal(round.task, SCALE_LEVELS[level - 1].task, where);
                        assert.ok([...round.left, ...round.right, ...round.tray].every(isToken), where);
                        if (round.task === "balance") {
                            assert.equal(round.choices.length, 0, where);
                            assert.ok(round.target >= 1 && solvable(round.target, round.tray), `${where}: ${round.target}`);
                            assert.equal(loadWeight(round.left, round.weights), round.target, where);
                            continue;
                        }
                        // Tačan odgovor je ponuđen tačno jednom, izbori su različiti, 2 … choiceLimit
                        assert.ok(round.answer !== null, where);
                        assert.equal(round.choices.filter((c) => c === round.answer).length, 1, where);
                        assert.equal(new Set(round.choices).size, round.choices.length, where);
                        assert.ok(round.choices.length >= 2 && round.choices.length <= Math.max(2, band.maxChoices), where);
                        const view = viewOf(round);
                        if (round.task === "read" || round.task === "predict" || round.task === "groups") {
                            // Teža strana je stvarno teža (vaga ne laže)
                            const heavySide = tiltFor(round.left, round.right, round.weights, round.task !== "groups") > 0 ? "right" : "left";
                            assert.equal(round.answer, round.ask === "heavy" ? heavySide : heavySide === "left" ? "right" : "left", where);
                            assert.equal(round.peg, round.task !== "read", where);
                        }
                        if (round.task === "pick" || round.task === "equation" || round.task === "swap") {
                            // Samo tačan izbor ispravi vagu
                            for (const id of round.choices) {
                                const loads = panLoads({ ...view, trial: id });
                                const equal = loadWeight(loads.left, round.weights) === loadWeight(loads.right, round.weights);
                                assert.equal(equal, id === round.answer, `${where}: ${id}`);
                                assert.ok(trialLoad(view, id).length > 0, `${where}: ${id}`);
                            }
                        }
                        if (round.task === "chain") {
                            const order = chainOrder(round.chain);
                            assert.equal(order.length, round.chain.length + 1, where);
                            assert.equal(round.answer, round.ask === "heavy" ? order[0] : order[order.length - 1], where);
                            assert.ok(round.choices.every((id) => order.includes(id)), where);
                        }
                    }
                }
            }
        }
    });

    it("balance ramps from 1–3 cubes to 15 with numbered weights", () => {
        const targets = (level: number) => buildScaleLevel(level, { maxRounds: 8, maxChoices: 4, random: seeded(level) }).map((round) => round.target);
        assert.ok(targets(5).every((t) => t >= 1 && t <= 3));
        assert.equal(targets(5)[0], 2);
        assert.ok(targets(6).every((t) => t >= 3 && t <= 5));
        assert.ok(targets(7).every((t) => t >= 4 && t <= 8));
        assert.ok(targets(10).every((t) => t >= 7 && t <= 9));
        assert.ok(targets(13).every((t) => t >= 11 && t <= 15));
        assert.deepEqual(buildScaleLevel(7, { maxRounds: 5, maxChoices: 3 })[0].tray, ["d1", "d2"]);
        assert.deepEqual(buildScaleLevel(13, { maxRounds: 5, maxChoices: 3 })[0].tray, ["n1", "n2", "n5", "n10"]);
    });

    it("is deterministic for the same random source", () => {
        for (const level of LEVELS) {
            const a = buildScaleLevel(level, { maxRounds: 6, maxChoices: 4, random: seeded(7) });
            const b = buildScaleLevel(level, { maxRounds: 6, maxChoices: 4, random: seeded(7) });
            assert.deepEqual(a, b, `nivo ${level}`);
            assert.doesNotThrow(() => JSON.stringify(a));
        }
    });
});

describe("scale tilt", () => {
    it("tilts towards the heavier side, one step per cube, clamped", () => {
        assert.equal(tiltFor(["d1"], ["d1"], {}, false), 0);
        assert.equal(tiltFor(["d2"], ["d1"], {}, false), -4);
        assert.equal(tiltFor([], ["n10"], {}, false), MAX_TILT);
        assert.equal(tiltFor(["elephant"], ["mouse"], { elephant: 5_000_000, mouse: 20 }, true), -MAX_TILT);
        assert.ok(Math.abs(tiltFor(["cat"], ["dog"], { cat: 4_000, dog: 6_000 }, true)) < MAX_TILT);
    });

    it("stands level while the blocks hold it, and shows the trial on the right pan", () => {
        const [round] = buildScaleLevel(4, { maxRounds: 5, maxChoices: 3, random: seeded(1) });
        assert.equal(viewTilt(viewOf(round)), 0);
        assert.notEqual(viewTilt(viewOf(round, { peg: false })), 0);
        const [swap] = buildScaleLevel(15, { maxRounds: 5, maxChoices: 3, random: seeded(2) });
        assert.equal(viewTilt(viewOf(swap, { trial: swap.answer })), 0);
    });

    it("suggests the next weight, or taking one back after too much", () => {
        assert.equal(nextBalanceStep({ placed: [], target: 7, tray: ["n1", "n2", "n5"] }), "n5");
        assert.equal(nextBalanceStep({ placed: ["n5"], target: 7, tray: ["n1", "n2", "n5"] }), "n2");
        assert.equal(nextBalanceStep({ placed: ["n5", "n5"], target: 7, tray: ["n1", "n2", "n5"] }), "takeback");
        assert.equal(nextBalanceStep({ placed: ["d1", "d1"], target: 2, tray: ["d1"] }), null);
    });
});

describe("scale sentences", () => {
    it("explains the scale in calm, correct Serbian", () => {
        const [first] = buildScaleLevel(1, { maxRounds: 5, maxChoices: 3, random: seeded(1) });
        const view = viewOf(first);
        assert.equal(scaleQuestion(view), "Vaga pokazuje: šta je teže?");
        assert.equal(scaleAnswer(view), "Slon je teži, zato je njegova strana dole.");
        assert.equal(scaleMistake(view, "right"), "Strana sa mišem je gore. Teža strana ide dole.");
        const surprise = viewOf({ ...first, left: ["stone"], right: ["balloon"], weights: { stone: 400, balloon: 3 }, surprise: true, ask: "light", answer: "right" });
        assert.equal(scaleAnswer(surprise), "Balon je veliki, ali je lakši. Zato je njegova strana gore.");
        const balance = viewOf({ ...first, task: "balance", left: ["apple"], weights: { apple: 2 }, target: 2, tray: ["d1"], choices: [], answer: null }, { placed: ["d1", "d1"] });
        assert.equal(scaleQuestion(balance), "Koliko kocaka je teško kao jabuka?");
        assert.equal(scaleAnswer(balance), "Sada je ravno: jabuka je teška kao dve kocke.");
        assert.equal(overSentence({ marks: "dots", placed: ["d2", "d2"], target: 3 }), "Previše: sada su kocke teže. Jedna kocka može nazad.");
        assert.equal(overSentence({ marks: "numerals", placed: ["n5", "n5"], target: 8 }), "Previše: deset je više od osam. Jedan teg može nazad.");
        const swap = viewOf({ ...first, task: "swap", left: ["pineapple", "pineapple"], right: ["?"], weights: { pineapple: 6, apple: 2 }, fill: "apple", ratio: 3, choices: ["6", "5", "3"], answer: "6" });
        assert.equal(scaleQuestion(swap), "Jedan ananas je težak kao tri jabuke. Koliko jabuka treba za dva ananasa?");
        assert.equal(scaleAnswer(swap), "Šest jabuka. Svaki ananas je kao tri jabuke: tri i tri je šest.");
        assert.equal(scaleMistake(swap, "5"), "Sa pet jabuka vaga nije ravna. Svaki ananas je kao tri jabuke.");
        const chain = viewOf({ ...first, task: "chain", left: [], right: [], chain: [{ heavy: "rabbit", light: "hedgehog", heavyLeft: true }, { heavy: "cat", light: "rabbit", heavyLeft: false }], ask: "heavy", choices: ["cat", "rabbit", "hedgehog"], answer: "cat" });
        assert.equal(scaleAnswer(chain), "Mačka je teža od zeca, a zec je teži od ježa. Zato je mačka najteža.");
        assert.equal(scaleMistake(chain, "hedgehog"), "Jež je lakši od zeca, pa nije najteži.");
    });

    it("never tells the child where to tap, and every line can be shown in Cyrillic", () => {
        const lines: string[] = [NOT_YET];
        for (const level of LEVELS) {
            for (const seed of SEEDS.slice(0, 8)) {
                for (const round of buildScaleLevel(level, { maxRounds: 8, maxChoices: 6, random: seeded(seed + level) })) {
                    const view = viewOf(round);
                    lines.push(scaleQuestion(view));
                    if (round.task === "balance") {
                        const step = round.tray.map(weightValue).sort((a, b) => a - b)[0];
                        const placed = Array<string>(round.target / step).fill(round.tray[0]);
                        lines.push(scaleAnswer({ ...view, placed }), overSentence({ ...view, placed: [...placed, round.tray[0]] }));
                        continue;
                    }
                    lines.push(scaleAnswer({ ...view, trial: round.answer }));
                    for (const id of round.choices) {
                        lines.push(choiceLabel(view, id));
                        if (id !== round.answer) lines.push(scaleMistake(view, id));
                    }
                }
            }
        }
        for (const text of lines) {
            assert.ok(text.length > 0, "prazna rečenica");
            assert.doesNotMatch(text, TAP_WORDS, text);
            assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
            assert.doesNotMatch(text, /undefined|null|NaN|\s{2}/, text);
        }
    });
});

describe("scale scoring", () => {
    const [round] = buildScaleLevel(2, { maxRounds: 5, maxChoices: 3, random: seeded(4) });
    const view = (extra: Partial<ScaleView> = {}): ScaleView => viewOf(round, { totalRounds: 4, ...extra });

    it("does not score the demonstrated first round of level 1", () => {
        const { next, modeled } = solveScaleView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts a clean round as correct, a helped round as prompted, an overshoot as a miss", () => {
        assert.equal(solveScaleView(view({ round: 2 }), 1).next.correctCount, 1);
        assert.equal(solveScaleView(view({ round: 2, hint: true }), 3).next.promptedCount, 1);
        const missed = solveScaleView(view({ round: 2, wrong: ["3:d2"] }), 7).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
        assert.equal(missed.score, 5);
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = scaleResult(view({ totalRounds: 4, correctCount: 4, promptedCount: 4 }), 1, 30);
        assert.equal(result.total, 3);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });
});

describe("scale monitor", () => {
    it("drops anything unknown and clamps numbers", () => {
        const merged = mergeScaleMonitor({
            task: "explode",
            left: ["elephant", "dragon", "d1", "n99"],
            right: ["mouse", "?"],
            weights: { elephant: 1e12, dragon: 4, mouse: -3 },
            choices: ["left", "up", "right", "left"],
            answer: "up",
            placed: ["d1", "x"],
            tray: ["n1", "n1", "zz"],
            chain: [{ heavy: "cat", light: "cat", heavyLeft: true }, { heavy: "dragon", light: "cat" }],
            ratio: 50,
            target: 999,
            round: 9,
            totalRounds: 3,
            score: -4,
            selected: "up",
        } as unknown as Partial<ScaleView>);
        assert.equal(merged.task, "read");
        assert.deepEqual(merged.left, ["elephant", "d1"]);
        assert.deepEqual(merged.right, ["mouse", "?"]);
        assert.deepEqual(merged.weights, { elephant: 1e8, mouse: 0 });
        assert.deepEqual(merged.choices, ["left", "right"]);
        assert.equal(merged.answer, null);
        assert.deepEqual(merged.placed, ["d1"]);
        assert.deepEqual(merged.tray, ["n1"]);
        assert.deepEqual(merged.chain, []);
        assert.equal(merged.ratio, 6);
        assert.equal(merged.target, 30);
        assert.equal(merged.round, 3);
        assert.equal(merged.score, 0);
        assert.equal(merged.selected, null);
        assert.deepEqual(mergeScaleMonitor(null), emptyScaleView(1));
    });

    it("keeps a real game view as it is", () => {
        for (const level of LEVELS) {
            const [round] = buildScaleLevel(level, { maxRounds: 5, maxChoices: 4, random: seeded(level) });
            const view = viewOf(round, { round: 2, totalRounds: 5, hint: true });
            assert.deepEqual(mergeScaleMonitor(JSON.parse(JSON.stringify(view))), view, `nivo ${level}`);
        }
    });

    it("group choices are made of cubes only", () => {
        assert.deepEqual(groupTokens("d2-d1"), ["d2", "d1"]);
        assert.deepEqual(groupTokens("d2-n5"), []);
    });
});

describe("scale game registry entry", () => {
    const game = getGame("scale");

    it("is activity 31, graded, with a cover, a migration line and its own colour", () => {
        assert.equal(game.activityId, 31);
        assert.equal(game.gameType, "scale");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        assert.equal(colour(game.accent.solid), "cocoa");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0024_logic_games.sql"), "utf8");
        assert.match(sql, /\(31, 'Vaga', '[^']+', 'cognitive'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("scale"));
        assert.ok(isRemoteGame("scale"));
    });

    it("the game component takes its tasks only from the seeded random source", () => {
        const source = readFileSync(path.join(process.cwd(), "app/components/games/ScaleGame.tsx"), "utf8");
        assert.doesNotMatch(source, /Math\.random/);
        assert.match(source, /useGameRandom\(\)/);
        assert.match(source, /onCompleteRef\.current\(scaleResult\(/);
    });
});
