// Igra „Sat” (app/components/games/data/clockLevels.ts): nivoi, komadi i mesta, rečenice o
// vremenu, bodovanje i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    animalPhrase,
    boardIntro,
    buildClockLevel,
    CLOCK_LEVELS,
    CLOCK_MAX_LEVEL,
    CLOCK_NUMBERS,
    CLOCK_PIECES,
    clockResult,
    COUNT_ANIMALS,
    countRows,
    digitSentence,
    DIGIT_COLORS,
    emptyClockView,
    fits,
    handAngles,
    hourPhrase,
    mergeClockMonitor,
    parseTime,
    planRounds,
    solveClockView,
    taskAnswer,
    taskAnswerKey,
    taskMistake,
    taskQuestion,
    timeKey,
    timePhrase,
    type ClockView,
} from "@/app/components/games/data/clockLevels";
import { SHAPE_PATHS } from "@/app/components/games/kit/shapePaths";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isTogetherGame } from "@/lib/playTogether";
import { isRemoteGame } from "@/lib/invite";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

/** Stalan niz „slučajnih” brojeva, da testovi uvek vide isti plan */
function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

const PRESETS = Object.values(BAND_PRESETS);

describe("clock pieces", () => {
    it("has the twelve wooden pieces from the photo, each its own shape", () => {
        assert.deepEqual([...CLOCK_NUMBERS].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
        const expected: Record<number, [string, string]> = {
            12: ["square", "yellow"],
            1: ["flower", "pink"],
            2: ["heart", "red"],
            3: ["triangle", "orange"],
            4: ["trapezoid", "blue"],
            5: ["pentagon", "green"],
            6: ["halfCircle", "yellow"],
            7: ["star", "pink"],
            8: ["octagon", "red"],
            9: ["crescent", "orange"],
            10: ["circle", "blue"],
            11: ["oval", "green"],
        };
        for (const value of CLOCK_NUMBERS) {
            assert.deepEqual([CLOCK_PIECES[value].shape, CLOCK_PIECES[value].color], expected[value], String(value));
            assert.ok(SHAPE_PATHS[CLOCK_PIECES[value].shape].length > 0, `obris za ${value}`);
        }
        assert.equal(new Set(CLOCK_NUMBERS.map((value) => CLOCK_PIECES[value].shape)).size, 12);
    });

    it("has a colour and a count picture for every digit on the number board", () => {
        for (let digit = 0; digit <= 9; digit += 1) assert.ok(DIGIT_COLORS[digit], String(digit));
        for (let digit = 1; digit <= 9; digit += 1) {
            assert.ok(COUNT_ANIMALS[digit], String(digit));
            assert.equal(countRows(digit).reduce((a, b) => a + b, 0), digit, `${digit} životinja`);
            assert.ok(Math.max(...countRows(digit)) <= 4, "najviše četiri u redu");
        }
        assert.deepEqual(countRows(0), []);
    });

    it("says the number and its quantity", () => {
        assert.equal(digitSentence(1), "Jedan. Jedna žirafa.");
        assert.equal(digitSentence(2), "Dva. Dve mačke.");
        assert.equal(digitSentence(3), "Tri. Tri slona.");
        assert.equal(digitSentence(5), "Pet. Pet ptica.");
        assert.equal(digitSentence(0), "Nula. Nema nikoga.");
        assert.equal(animalPhrase(8), "osam miševa");
        assert.equal(animalPhrase(4), "četiri zeca");
    });
});

describe("telling the time in Serbian", () => {
    it("says full hours with the right noun form", () => {
        assert.equal(hourPhrase(1), "jedan sat");
        assert.equal(hourPhrase(2), "dva sata");
        assert.equal(hourPhrase(3), "tri sata");
        assert.equal(hourPhrase(4), "četiri sata");
        assert.equal(hourPhrase(5), "pet sati");
        assert.equal(hourPhrase(11), "jedanaest sati");
        assert.equal(hourPhrase(12), "dvanaest sati");
    });

    it("says half hours as „pola” and the NEXT hour", () => {
        assert.equal(timePhrase({ h: 3, m: 30 }), "pola četiri");
        assert.equal(timePhrase({ h: 12, m: 30 }), "pola jedan");
        assert.equal(timePhrase({ h: 1, m: 30 }), "pola dva");
        assert.equal(timePhrase({ h: 11, m: 30 }), "pola dvanaest");
        assert.equal(timePhrase({ h: 7, m: 0 }), "sedam sati");
    });

    it("asks and answers simply, never naming where to tap", () => {
        assert.equal(taskQuestion({ kind: "read", time: "3:00" }), "Koliko je sati?");
        assert.equal(taskQuestion({ kind: "set", time: "3:00" }), "Pokaži tri sata.");
        assert.equal(taskQuestion({ kind: "which", time: "3:30" }), "Koji sat pokazuje pola četiri?");
        assert.equal(taskAnswer({ kind: "read", time: "1:00" }), "Sada je jedan sat.");
        assert.equal(taskAnswer({ kind: "which", time: "3:30" }), "Pola četiri. Mala kazaljka je između tri i četiri, a velika na šest.");
        assert.equal(taskMistake({ kind: "set", time: "3:00" }, "5"), "Ovo je pet sati.");
        assert.equal(taskMistake({ kind: "which", time: "3:30" }, "7:30"), "Ovaj sat pokazuje pola osam.");
        for (const text of [boardIntro({ slots: [1, 2, 3], holes: "digit" }, "board"), boardIntro({ slots: [...CLOCK_NUMBERS], holes: "round" }, "clock")]) {
            assert.doesNotMatch(text, /dodirni|prevuci|ovde|klikni/i, text);
        }
    });

    it("puts the hands where a real clock has them", () => {
        assert.deepEqual(handAngles({ h: 3, m: 0 }), { hour: 90, minute: 0 });
        assert.deepEqual(handAngles({ h: 3, m: 30 }), { hour: 105, minute: 180 });
        assert.deepEqual(handAngles({ h: 12, m: 0 }), { hour: 0, minute: 0 });
        assert.equal(timeKey({ h: 9, m: 30 }), "9:30");
        assert.deepEqual(parseTime("12:00"), { h: 12, m: 0 });
        assert.equal(parseTime("13:00"), null);
        assert.equal(parseTime("3:15"), null);
    });
});

describe("clock levels", () => {
    it("has fifteen levels: number board, clock, then telling the time", () => {
        assert.equal(CLOCK_MAX_LEVEL, 15);
        assert.equal(CLOCK_LEVELS.length, MAX_LEVEL);
        assert.deepEqual(
            CLOCK_LEVELS.map((rule) => rule.mode),
            ["board", "board", "board", "board", "board", "clock", "clock", "clock", "clock", "clock", "time", "time", "time", "time", "time"]
        );
    });

    it("builds every level for every age band, with pieces that match the holes", () => {
        for (const level of LEVELS) {
            for (const preset of PRESETS) {
                for (let seed = 1; seed <= 6; seed += 1) {
                    const plan = buildClockLevel(level, { maxRounds: preset.maxRounds, maxChoices: preset.maxChoices, random: seeded(seed * 31 + level) });
                    const where = `L${level} ${preset.label} s${seed}`;
                    assert.ok(planRounds(plan) >= 2, `${where}: zadaci`);
                    if (plan.mode === "time") {
                        assert.equal(plan.boards.length, 0);
                        for (const task of plan.tasks) {
                            const time = parseTime(task.time);
                            assert.ok(time, `${where}: vreme ${task.time}`);
                            if (task.kind === "set") {
                                assert.equal(time.m, 0, `${where}: „Pokaži” je pun sat`);
                                assert.notEqual(task.start, time.h, `${where}: kazaljka ne kreće sa tačnog broja`);
                                continue;
                            }
                            assert.ok(task.choices.length >= 2 && task.choices.length <= 3, `${where}: izbori`);
                            assert.equal(new Set(task.choices).size, task.choices.length, `${where}: bez ponavljanja`);
                            assert.equal(task.choices.filter((key) => key === taskAnswerKey(task)).length, 1, `${where}: tačan odgovor jednom`);
                            if (task.kind === "read") assert.equal(time.m, 0, `${where}: „Koliko je sati?” je pun sat`);
                        }
                        continue;
                    }
                    for (const board of plan.boards) {
                        assert.equal(new Set(board.slots).size, board.slots.length, `${where}: mesta`);
                        assert.equal(new Set(board.tray).size, board.tray.length, `${where}: komadi`);
                        // Svaki komad ima tačno jedno mesto, a svako mesto je ili popunjeno ili ima svoj komad
                        for (const piece of board.tray) assert.equal(board.slots.filter((slot) => fits(piece, slot)).length, 1, `${where}: komad ${piece}`);
                        assert.deepEqual([...board.prefilled, ...board.tray].sort((a, b) => a - b), [...board.slots].sort((a, b) => a - b), `${where}: tabla puna`);
                        assert.ok(board.prefilled.every((value) => !board.tray.includes(value)));
                    }
                }
            }
        }
    });

    it("starts with only 1–3 and the demonstrated 1 first, then fades the support", () => {
        const first = buildClockLevel(1, { maxRounds: 5, maxChoices: 3, random: seeded(3) });
        assert.equal(first.mode, "board");
        assert.deepEqual(first.boards[0].slots, [1, 2, 3]);
        assert.equal(first.boards[0].tray[0], 1, "ruka pokazuje jedinicu");
        assert.ok(first.boards[0].tint && first.earlyHint);
        assert.equal(planRounds(first), 6, "1–3 dvaput i za najmlađe");
        const ten = buildClockLevel(5, { maxRounds: 8, maxChoices: 6, random: seeded(3) });
        assert.deepEqual([...ten.boards[0].slots].sort(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        assert.equal(ten.boards[0].tint, false);
        const anchors = buildClockLevel(6, { maxRounds: 8, maxChoices: 6, random: seeded(3) });
        assert.deepEqual([...anchors.boards[0].tray].sort((a, b) => a - b), [3, 6, 9, 12]);
        assert.equal(anchors.boards[0].holes, "shaped");
        const round = buildClockLevel(9, { maxRounds: 8, maxChoices: 6, random: seeded(3) });
        assert.equal(round.boards[0].holes, "round");
        assert.deepEqual([...round.boards[0].prefilled].sort((a, b) => a - b), [3, 6, 9, 12]);
        const plain = buildClockLevel(10, { maxRounds: 8, maxChoices: 6, random: seeded(3) });
        assert.ok(plain.boards[0].plain && plain.boards[0].tray.length === 12);
    });

    it("uses far choices first and the classic near mix-up (pola četiri – četiri) at the end", () => {
        const far = buildClockLevel(11, { maxRounds: 6, maxChoices: 3, random: seeded(5) });
        for (const task of far.tasks) {
            const h = parseTime(task.time)!.h;
            for (const key of task.choices.filter((k) => k !== taskAnswerKey(task))) {
                const d = Math.abs(Number(key) - h) % 12;
                assert.ok(Math.min(d, 12 - d) >= 3, `${task.time}: ${key}`);
            }
        }
        const halves = buildClockLevel(14, { maxRounds: 6, maxChoices: 3, random: seeded(5) });
        assert.ok(halves.tasks.every((task) => task.kind === "which" && task.time.endsWith(":30")));
        const last = buildClockLevel(15, { maxRounds: 8, maxChoices: 3, random: seeded(5) });
        assert.ok(last.tasks.some((task) => task.time.endsWith(":30")) && last.tasks.some((task) => task.time.endsWith(":00")));
    });
});

describe("clock scoring", () => {
    const view = (extra: Partial<ClockView> = {}): ClockView => ({ ...emptyClockView(6), ...extra });

    it("does not score the demonstrated first piece of level 1", () => {
        const { next, modeled, firstTry } = solveClockView(view({ round: 1 }), 1);
        assert.ok(modeled && !firstTry);
        assert.equal(next.correctCount, 0);
        assert.equal(next.promptedCount, 0);
    });

    it("counts first try without help as correct, and help as prompted", () => {
        assert.equal(solveClockView(view({ round: 2 }), 1).next.correctCount, 1);
        const helped = solveClockView(view({ round: 2, hintPiece: 3 }), 1).next;
        assert.equal(helped.correctCount, 0);
        assert.equal(helped.promptedCount, 1);
        const missed = solveClockView(view({ round: 2, wrong: ["3>4"] }), 1).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
    });

    it("reports a result without the demo round where correct + prompted ≤ total", () => {
        const result = clockResult(view({ totalRounds: 6, correctCount: 4, promptedCount: 3, score: 50 }), 1, 30);
        assert.equal(result.total, 5);
        assert.equal(result.correct, 4);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
        assert.equal(clockResult(view({ totalRounds: 12, correctCount: 12 }), 8, 9).total, 12);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeClockMonitor({ mode: "clock", slots: [12, 1, 99] as number[], filled: [1, 5], tray: [1, 77], selected: 42, task: "set" } as Partial<ClockView>);
        assert.deepEqual(merged.slots, [12, 1]);
        assert.deepEqual(merged.filled, [1]);
        assert.deepEqual(merged.tray, [1]);
        assert.equal(merged.selected, null);
        assert.equal(merged.task, null);
        assert.equal(mergeClockMonitor(null).slots.length, 0);
    });
});

describe("clock game registry entry", () => {
    const game = getGame("clock");

    it("is activity 18, graded, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 18);
        assert.equal(game.gameType, "clock");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0013_clock_game.sql"), "utf8");
        assert.match(sql, /\(18, 'Sat', '[^']+', 'cognitive'/);
        assert.match(sql, /on conflict \(id\) do update/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("clock"));
        assert.ok(isRemoteGame("clock"));
    });

    it("has child-facing text that can be shown in Cyrillic", () => {
        const texts = [game.title, game.description, taskQuestion({ kind: "which", time: "3:30" }), digitSentence(7)];
        for (const text of texts) assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
    });
});
