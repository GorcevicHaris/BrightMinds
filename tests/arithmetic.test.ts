// Igra „Računanje” (app/components/games/data/arithmeticLevels.ts): nivoi i njihov tok, zadaci,
// ponuđeni brojevi, predmeti na slici, rečenice (gramatika brojeva), bodovanje, monitor i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    ARITHMETIC_LEVELS,
    ARITHMETIC_MAX_LEVEL,
    arithmeticResult,
    buildArithmeticLevel,
    choiceCount,
    correctSentence,
    countSentence,
    emptyArithmeticView,
    evaluate,
    mergeArithmeticMonitor,
    mistakeSentence,
    moveCount,
    objectsShown,
    pickChoices,
    questionParts,
    questionText,
    solveArithmeticView,
    taskAnswer,
    tipSentence,
    tokensFor,
    verbForm,
    type ArithmeticTask,
    type ArithmeticView,
} from "@/app/components/games/data/arithmeticLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde|tu dole|levo|desno/i;

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

function plans(level: number) {
    const result: { where: string; tasks: ArithmeticTask[]; maxChoices: number; maxRounds: number }[] = [];
    for (const preset of Object.values(BAND_PRESETS)) {
        for (const maxChoices of [2, 3, 4, 6]) {
            for (let seed = 1; seed <= 8; seed += 1) {
                const tasks = buildArithmeticLevel(level, { maxRounds: preset.maxRounds, maxChoices, random: seeded(seed * 37 + level) });
                result.push({ where: `L${level} ${preset.label} c${maxChoices} s${seed}`, tasks, maxChoices, maxRounds: preset.maxRounds });
            }
        }
    }
    return result;
}

/** Svi međuzbirovi računa (5 + 3 − 2: 5, 8, 6) */
function runningTotals(task: ArithmeticTask): number[] {
    const totals = [task.terms[0]];
    task.ops.forEach((op, i) => totals.push(totals[i] + (op === "+" ? task.terms[i + 1] : -task.terms[i + 1])));
    return totals;
}

describe("arithmetic levels", () => {
    it("has 15 levels in three tiers, with more numbers and harder sums as levels grow", () => {
        assert.equal(ARITHMETIC_MAX_LEVEL, 15);
        assert.equal(ARITHMETIC_LEVELS.length, MAX_LEVEL);
        // Lako do 5 pa do 10, srednje do 10, teško do 20
        assert.deepEqual(ARITHMETIC_LEVELS.map((rule) => rule.max), [5, 5, 5, 5, 10, 10, 10, 10, 10, 10, 20, 20, 20, 20, 20]);
        // Izbori: 2 → 3 → 4, nikad manje nego na prethodnom nivou
        for (let i = 1; i < ARITHMETIC_LEVELS.length; i += 1) assert.ok(ARITHMETIC_LEVELS[i].choices >= ARITHMETIC_LEVELS[i - 1].choices, `L${i + 1}`);
        assert.equal(ARITHMETIC_LEVELS[0].choices, 2);
        assert.equal(ARITHMETIC_LEVELS[14].choices, 4);
        // Rečenica se pojavljuje od 4. nivoa; pomoć brže samo na lakim nivoima; predmeti tek uz pomoć na 8, 14, 15
        assert.deepEqual(ARITHMETIC_LEVELS.map((rule) => rule.sentence), [false, false, false, ...Array(12).fill(true)]);
        assert.deepEqual(ARITHMETIC_LEVELS.map((rule) => rule.earlyHint), [...Array(5).fill(true), ...Array(10).fill(false)]);
        assert.deepEqual(ARITHMETIC_LEVELS.flatMap((rule, i) => (rule.hidden ? [i + 1] : [])), [8, 14, 15]);
    });

    it("builds valid tasks for every level, setting and seed: the answer offered exactly once, unique numbers, in range", () => {
        for (const level of LEVELS) {
            const rule = ARITHMETIC_LEVELS[level - 1];
            for (const { where, tasks, maxChoices, maxRounds } of plans(level)) {
                assert.equal(tasks.length, Math.max(2, Math.min(rule.rounds, maxRounds)), where);
                const keys = new Set(tasks.map((task) => `${task.terms}|${task.ops}|${task.unknown}`));
                assert.ok(keys.size >= Math.min(tasks.length, 3), `${where}: zadaci se ne ponavljaju`);
                for (const task of tasks) {
                    const label = `${where} ${task.terms.join(task.ops[0])}`;
                    const answer = taskAnswer(task);
                    assert.equal(task.choices.filter((value) => value === answer).length, 1, `${label}: tačan broj tačno jednom`);
                    assert.equal(new Set(task.choices).size, task.choices.length, `${label}: različiti brojevi`);
                    assert.ok(task.choices.length >= 2 && task.choices.length <= Math.max(2, Math.min(maxChoices, rule.choices)), `${label}: broj izbora`);
                    assert.equal(task.choices.length, choiceCount(level, maxChoices), label);
                    assert.deepEqual(task.choices, [...task.choices].sort((a, b) => a - b), `${label}: rastuće`);
                    for (const value of task.choices) assert.ok(Number.isInteger(value) && value >= 0 && value <= rule.max, `${label}: ${value} u opsegu`);
                    // Rešiv zadatak: brojevi i svi međuzbirovi u opsegu nivoa, odgovor bar 1
                    assert.ok(answer >= 1 && answer <= rule.max, `${label}: odgovor ${answer}`);
                    for (const total of runningTotals(task)) assert.ok(total >= 0 && total <= rule.max, `${label}: međuzbir ${total}`);
                    for (const value of task.terms) assert.ok(value >= 1, `${label}: sabirci`);
                    assert.equal(task.sentence, rule.sentence, label);
                    // Scena ima najviše deset predmeta (redovi po pet), okviri najviše dvadeset mesta
                    const tokens = tokensFor(task);
                    const slots = Math.max(...tokens.filter((t) => !t.inBox).map((t) => t.slot)) + 1;
                    assert.ok(slots <= (task.draw === "frames" ? 20 : 10), `${label}: ${slots} mesta`);
                }
            }
        }
    });

    it("follows the planned ramp of tasks", () => {
        const kinds = (level: number) => new Set(plans(level).flatMap((plan) => plan.tasks.map((task) => task.kind)));
        const ops = (level: number) => new Set(plans(level).flatMap((plan) => plan.tasks.map((task) => task.ops.join(""))));
        assert.deepEqual([...ops(1)], ["+"]);
        assert.deepEqual([...ops(3)], ["-"]);
        assert.deepEqual([...ops(4)].sort(), ["+", "-"]);
        assert.deepEqual([...kinds(7)], ["make10"]);
        assert.deepEqual([...kinds(8)], ["equation"]);
        assert.deepEqual([...kinds(9)], ["box"]);
        assert.deepEqual([...kinds(10)], ["story"]);
        assert.deepEqual([...kinds(14)], ["equation"]);
        assert.deepEqual([...kinds(15)].sort(), ["change", "story"]);
        for (const plan of plans(15)) for (const task of plan.tasks) assert.equal(task.ops.length, 2, plan.where);
        // Do 20 bez prelaza (11, 12), prelaz preko desetice (13)
        for (const plan of plans(11)) for (const task of plan.tasks) assert.ok((task.terms[0] % 10) + task.terms[1] <= 9 && task.terms[0] >= 10, plan.where);
        for (const plan of plans(12)) for (const task of plan.tasks) assert.ok(task.terms[0] - task.terms[1] >= 10, plan.where);
        for (const plan of plans(13)) for (const task of plan.tasks) assert.ok(task.split && task.terms[0] < 10 && task.terms[0] + task.terms[1] > 10, plan.where);
        // Broj koji nedostaje: i na početku (? − 5 = 9) i u sredini (6 + ? = 15)
        const unknowns = new Set(plans(14).flatMap((plan) => plan.tasks.map((task) => `${task.ops[0]}${task.unknown}`)));
        for (const form of ["+1", "-0", "-1"]) assert.ok(unknowns.has(form), form);
    });

    it("starts level 1 with the demonstrated round: two birds on a branch, one more lands", () => {
        for (const { tasks } of plans(1)) {
            const first = tasks[0];
            assert.equal(first.theme, "branch");
            assert.deepEqual(first.terms, [2, 1]);
            assert.equal(questionText(first), "Na grani su 2 ptice. Doletela je još 1. Koliko je sada ptica na grani?");
            assert.equal(first.dots, true);
        }
    });

    it("never shows the same scene twice in a row on scene levels", () => {
        for (const level of [2, 3, 4, 5, 6]) {
            for (const { where, tasks } of plans(level)) {
                for (let i = 1; i < tasks.length; i += 1) assert.notEqual(tasks[i].theme, tasks[i - 1].theme, `${where} #${i + 1}`);
            }
        }
    });

    it("is deterministic for the same random source and differs for another seed", () => {
        const a = buildArithmeticLevel(5, { maxRounds: 8, maxChoices: 4, random: seeded(3) });
        const b = buildArithmeticLevel(5, { maxRounds: 8, maxChoices: 4, random: seeded(3) });
        assert.deepEqual(a, b);
        assert.deepEqual(JSON.parse(JSON.stringify(a)), a, "plan je običan JSON");
        const c = buildArithmeticLevel(5, { maxRounds: 8, maxChoices: 4, random: seeded(99) });
        assert.notDeepEqual(a, c);
    });

    it("keeps the child's own name out of the stories", () => {
        for (let seed = 1; seed < 30; seed += 1) {
            for (const task of buildArithmeticLevel(10, { maxRounds: 8, maxChoices: 4, random: seeded(seed), childName: "Amar" })) {
                assert.ok(!task.names.includes("amar"));
                assert.equal(new Set(task.names).size, task.names.length);
            }
        }
    });
});

describe("arithmetic choices", () => {
    const task = (terms: number[], ops: ("+" | "-")[], unknown = -1): ArithmeticTask => ({
        kind: "change",
        theme: "branch",
        item: "bird",
        draw: "scene",
        terms,
        ops,
        unknown,
        choices: [],
        sentence: true,
        hidden: false,
        split: false,
        dots: false,
        names: [],
        steps: [],
    });

    it("offers plausible numbers (one or two away, a number from the sum) and places the answer anywhere", () => {
        const positions = new Set<number>();
        for (let seed = 1; seed < 60; seed += 1) {
            const choices = pickChoices(task([4, 3], ["+"]), 4, 10, seeded(seed));
            assert.ok(choices.includes(7));
            for (const value of choices) assert.ok([7, 5, 6, 8, 9, 4, 3, 1].includes(value), String(value));
            positions.add(choices.indexOf(7));
        }
        assert.ok(positions.size >= 3, "tačan broj nije uvek na istom mestu");
    });

    it("fills up with the nearest numbers when few are plausible, never going out of range", () => {
        const choices = pickChoices(task([2, 1], ["-"]), 4, 5, seeded(1));
        assert.equal(choices.length, 4);
        for (const value of choices) assert.ok(value >= 1 && value <= 5);
    });
});

describe("arithmetic pictures (objects that come and go)", () => {
    const counted = (task: Parameters<typeof tokensFor>[0]) => tokensFor(task).filter((t) => t.counted).length;

    it("always counts exactly as many objects as the answer", () => {
        for (const level of LEVELS) {
            for (const { tasks } of plans(level).slice(0, 6)) for (const task of tasks) assert.equal(counted(task), taskAnswer(task), `L${level} ${task.terms}`);
        }
    });

    it("shows arrivals, leavings (the ones leaving are drawn leaving) and empty places", () => {
        const add = tokensFor({ kind: "change", terms: [2, 1], ops: ["+"], unknown: -1 });
        assert.deepEqual(add.map((t) => t.kind), ["base", "base", "arrive"]);
        const sub = tokensFor({ kind: "change", terms: [5, 2], ops: ["-"], unknown: -1 });
        assert.deepEqual(sub.map((t) => t.kind), ["base", "base", "base", "leave", "leave"]);
        const two = tokensFor({ kind: "story", terms: [5, 3, 2], ops: ["+", "-"], unknown: -1 });
        assert.deepEqual(two.map((t) => `${t.kind}${t.step}`), ["base0", "base0", "base0", "base0", "base0", "arrive1", "leave2", "leave2"]);
        const make10 = tokensFor({ kind: "make10", terms: [7, 3], ops: ["+"], unknown: 1 });
        assert.deepEqual(make10.filter((t) => t.kind === "empty").map((t) => t.slot), [7, 8, 9]);
        assert.equal(moveCount({ kind: "story", ops: ["+", "-"], unknown: -1 }), 2);
        assert.equal(moveCount({ kind: "equation", ops: ["+"], unknown: -1 }), 0);
    });

    it("hides the objects on sentence-only levels until help or a mistake", () => {
        const task = buildArithmeticLevel(8, { maxRounds: 6, maxChoices: 4, random: seeded(1) })[0];
        const view = { ...emptyArithmeticView(6), task };
        assert.equal(objectsShown(view), false);
        assert.equal(objectsShown({ ...view, wrong: [task.choices[0]] }), true);
        assert.equal(objectsShown({ ...view, hint: true }), true);
    });
});

describe("arithmetic sentences", () => {
    it("matches Serbian number grammar (1 ptica, 2 ptice, 5 ptica; jedna, dve)", () => {
        assert.equal(verbForm({ stem: "doletel", mOne: "doleteo" }, "f", 1), "doletela");
        assert.equal(verbForm({ stem: "doletel", mOne: "doleteo" }, "f", 3), "doletele");
        assert.equal(verbForm({ stem: "doletel", mOne: "doleteo" }, "f", 5), "doletelo");
        assert.equal(verbForm({ stem: "ušl", mOne: "ušao" }, "m", 1), "ušao");
        assert.equal(verbForm({ stem: "ušl", mOne: "ušao" }, "m", 2), "ušla");
        const birds: ArithmeticTask = { ...buildArithmeticLevel(1, { maxRounds: 4, maxChoices: 2, random: seeded(1) })[0] };
        assert.equal(questionText(birds, true), "Na grani su dve ptice. Doletela je još jedna. Koliko je sada ptica na grani?");
        assert.equal(correctSentence(birds, true), "Na grani su sada tri ptice.");
        assert.equal(countSentence(birds, true), "Brojimo zajedno: jedan, dva, tri. Ima ih tri.");
        const cars = { ...birds, theme: "garage" as const, item: "car" as const, terms: [5, 2], ops: ["-" as const], sentence: true };
        assert.equal(questionText(cars), "U garaži je 5 auta. Izašla su 2. Koliko je auta ostalo u garaži?");
        assert.equal(correctSentence(cars, true), "Pet minus dva je tri. U garaži su ostala tri auta.");
        const fishOne = { ...birds, theme: "pond" as const, item: "fish" as const, terms: [3, 2], ops: ["-" as const] };
        assert.equal(correctSentence(fishOne, true), "U jezeru je ostala jedna riba.");
        const eggs = { ...birds, kind: "make10" as const, theme: "carton" as const, item: "egg" as const, draw: "frames" as const, terms: [7, 3], unknown: 1 };
        assert.equal(questionText(eggs), "Kutija ima mesta za 10 jaja. U njoj je 7 jaja. Koliko još jaja stane u kutiju?");
        assert.equal(correctSentence(eggs, true), "Još tri jajeta i kutija je puna.");
        const dino = { ...birds, theme: "nest" as const, item: "dinoEgg" as const, terms: [5, 2], ops: ["-" as const] };
        assert.equal(questionText(dino, true), "U gnezdu je pet jaja. Izlegla su se dva dinosaurusa. Koliko je celih jaja ostalo u gnezdu?");
        assert.equal(correctSentence(dino, true), "U gnezdu su ostala tri cela jajeta.");
    });

    it("tells stories with names and the right gender", () => {
        const story: ArithmeticTask = {
            kind: "story",
            theme: "park",
            item: "balloon",
            draw: "scene",
            terms: [3, 4],
            ops: ["+"],
            unknown: -1,
            choices: [6, 7, 8],
            sentence: true,
            hidden: false,
            split: false,
            dots: false,
            names: ["amar", "lejla", "haris"],
            steps: ["give"],
        };
        assert.equal(questionText(story), "Amar ima 3 balona. Lejla mu je dala još 4. Koliko balona Amar ima sada?");
        const berries = { ...story, item: "strawberry" as const, theme: "basket" as const, names: ["ajla", "tarik", "amar"] as ArithmeticTask["names"], terms: [6, 1, 2], ops: ["-", "+"] as ArithmeticTask["ops"], steps: ["eat", "give"] as ArithmeticTask["steps"] };
        assert.equal(questionText(berries, true), "Ajla ima šest jagoda. Pojela je jednu. Onda joj je Tarik dao još dve. Koliko jagoda Ajla ima sada?");
        assert.equal(correctSentence(berries, true, false), "Ajla sada ima sedam jagoda.");
    });

    it("explains a mistake calmly and gives a strategy, never saying where to tap", () => {
        const lines: string[] = [];
        for (const level of LEVELS) {
            for (const task of buildArithmeticLevel(level, { maxRounds: 8, maxChoices: 6, random: seeded(level) })) {
                lines.push(...questionParts(task), ...questionParts(task, true), correctSentence(task), correctSentence(task, true), tipSentence(task), tipSentence(task, true), countSentence(task, true));
                for (const value of task.choices) if (value !== taskAnswer(task)) lines.push(mistakeSentence(task, value, true));
            }
        }
        for (const text of lines) {
            assert.doesNotMatch(text, TAP_WORDS, text);
            assert.doesNotMatch(text, /undefined|null|NaN|\s{2}|\s[.,?]/, text);
            assert.match(text, /^[A-ZČĆŽŠĐ0-9]/u, text);
            assert.doesNotMatch(toCyrillic(text.replace(/[0-9+−=?]/g, "")), /\p{Script=Latin}/u, text);
        }
        assert.equal(mistakeSentence({ terms: [2, 1], ops: ["+"], unknown: -1 }, 2), "Broj je veći od 2.");
        assert.equal(mistakeSentence({ terms: [2, 1], ops: ["+"], unknown: -1 }, 4), "Broj je manji od 4.");
    });

    it("computes sums left to right", () => {
        assert.equal(evaluate([5, 3, 2], ["+", "-"]), 6);
        assert.equal(evaluate([12, 4, 3], ["-", "+"]), 11);
    });
});

describe("arithmetic scoring", () => {
    const task = buildArithmeticLevel(2, { maxRounds: 5, maxChoices: 3, random: seeded(4) })[0];
    const view = (extra: Partial<ArithmeticView> = {}): ArithmeticView => ({ ...emptyArithmeticView(4), task, ...extra });

    it("does not score the demonstrated first round of level 1", () => {
        const { next, modeled } = solveArithmeticView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts a clean round as correct, a helped round as prompted, a round with mistakes as neither", () => {
        assert.equal(solveArithmeticView(view({ round: 2 }), 1).next.correctCount, 1);
        assert.equal(solveArithmeticView(view({ round: 2, hint: true }), 3).next.promptedCount, 1);
        const missed = solveArithmeticView(view({ round: 2, wrong: [1] }), 3).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = arithmeticResult(view({ totalRounds: 4, correctCount: 4, promptedCount: 4 }), 1, 30);
        assert.equal(result.total, 3);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });
});

describe("arithmetic live monitor", () => {
    it("keeps a valid state and drops anything unknown", () => {
        const task = buildArithmeticLevel(15, { maxRounds: 6, maxChoices: 4, random: seeded(2) })[0];
        const good = mergeArithmeticMonitor({ ...emptyArithmeticView(6), task, round: 2, step: 9, wrong: [task.choices.find((c) => c !== taskAnswer(task))!, 77], selected: 99, hint: true });
        assert.deepEqual(good.task, task);
        assert.equal(good.step, moveCount(task));
        assert.equal(good.wrong.length, 1);
        assert.equal(good.selected, null);

        const junk = mergeArithmeticMonitor({
            task: { kind: "magic", theme: "moon", terms: [3, 2], ops: ["+"], unknown: -1, choices: [5] },
            score: -4,
            round: 40,
            totalRounds: 3,
            feedback: "boom",
        } as unknown as Partial<ArithmeticView>);
        assert.equal(junk.task, null);
        assert.equal(junk.score, 0);
        assert.equal(junk.round, 3);
        assert.equal(junk.feedback, null);

        // Brojevi van opsega ili tačan broj koji nije ponuđen: zadatak se odbacuje
        assert.equal(mergeArithmeticMonitor({ task: { ...task, terms: [50, 2, 1] } }).task, null);
        assert.equal(mergeArithmeticMonitor({ task: { ...task, choices: [1, 2] } }).task, null);
        assert.equal(mergeArithmeticMonitor({ task: { ...task, names: ["zorro"] } } as unknown as Partial<ArithmeticView>).task?.kind === "story", false);
        assert.deepEqual(mergeArithmeticMonitor(null), emptyArithmeticView(1));
    });
});

describe("arithmetic game registry entry", () => {
    const game = getGame("arithmetic");

    it("is activity 32, graded, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 32);
        assert.equal(game.gameType, "arithmetic");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        assert.equal(colour(game.accent.solid), "ember");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0024_logic_games.sql"), "utf8");
        assert.match(sql, /\(32, 'Računanje', '[^']+', 'cognitive'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("arithmetic"));
        assert.ok(isRemoteGame("arithmetic"));
    });

    it("never uses Math.random in the game component (tasks come from the seeded game random)", () => {
        const source = readFileSync(path.join(process.cwd(), "app/components/games/ArithmeticGame.tsx"), "utf8");
        assert.doesNotMatch(source, /Math\.random/);
        assert.match(source, /data-action=\{`choice:\$\{value\}`\}/);
    });
});
