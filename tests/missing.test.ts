// Igra „Šta fali?” (app/components/games/data/missingItems.ts): crteži, delovi, rečenice,
// nivoi, bodovanje i stanje za roditeljski prikaz uživo.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
    buildMissingLevel,
    CLOSURES,
    closureQuestion,
    closureWrong,
    CURTAIN_TEXT,
    emptyMissingView,
    getPart,
    getShelfItem,
    getThing,
    GONE_QUESTION,
    GONE_TWO_HINT,
    inPlaceSentence,
    LOOK_TAIL,
    LOOK_TITLE,
    LOOK_SWAP_TITLE,
    mergeMissingMonitor,
    MISSING_MAX_LEVEL,
    missingQuestion,
    missingResult,
    missingRule,
    missingSentence,
    namesSentence,
    PART_IDS,
    PARTS,
    roundView,
    SHELF_IDS,
    solveMissingView,
    stillThereSentence,
    SWAP_HINT,
    SWAP_QUESTION,
    swappedSentence,
    THING_IDS,
    THINGS,
    type MissingRound,
    type MissingView,
} from "@/app/components/games/data/missingItems";
import { FOOD_ART } from "@/app/components/games/food/foods";
import { PART_ART, THING_ART } from "@/app/components/games/missing/things";
import MissingGame from "@/app/components/games/MissingGame";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame } from "@/lib/games";
import { TOGETHER_GAMES } from "@/lib/playTogether";
import { toCyrillic } from "@/lib/script";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: MISSING_MAX_LEVEL }, (_, i) => i + 1);
const BANDS = Object.entries(BAND_PRESETS);
/** Glas i natpisi nikad ne govore detetu gde da dodirne */
const TAP_WORDS = /dodirn|pritisn|prevuc|klikn|tapn|ovde dole|ovde gore/i;

function allLevels(): { level: number; band: string; rounds: MissingRound[] }[] {
    const out: { level: number; band: string; rounds: MissingRound[] }[] = [];
    for (const level of LEVELS) {
        for (const [band, preset] of BANDS) {
            for (let seed = 1; seed <= 12; seed += 1) {
                out.push({ level, band, rounds: buildMissingLevel(level, { maxChoices: preset.maxChoices, maxRounds: preset.maxRounds, random: seeded(seed * 97 + level) }) });
            }
        }
    }
    return out;
}

describe("missing game drawings", () => {
    it("draws every thing and every part, and every part sits in its own thing's drawing", () => {
        for (const id of THING_IDS) assert.ok(THING_ART[id]?.length > 0, `crtež: ${id}`);
        for (const id of PART_IDS) {
            const part = getPart(id)!;
            assert.ok(PART_ART[id], `deo: ${id}`);
            assert.ok(
                THING_ART[part.thing].some((layer) => layer.part === id),
                `${id} je deo crteža ${part.thing}`
            );
            const [x, y, s] = PART_ART[id].box;
            assert.ok(s > 0 && x > -10 && y > -10 && x + s < 110 && y + s < 110, `${id}: kvadrat dela je na slici`);
        }
    });

    it("has a drawing for every thing on the shelf (toys and food from „Šta jede?”)", () => {
        for (const id of SHELF_IDS) {
            const item = getShelfItem(id);
            assert.ok(item, id);
            assert.ok(item.art === "thing" ? THING_ART[id as keyof typeof THING_ART] : FOOD_ART[id as keyof typeof FOOD_ART], `crtež: ${id}`);
        }
        assert.equal(new Set(SHELF_IDS.map((id) => getShelfItem(id)!.name)).size, SHELF_IDS.length, "svaka stvar ima svoje ime");
    });

    it("has names that can be shown in Cyrillic", () => {
        for (const text of [...THINGS.map((thing) => thing.name), ...PARTS.map((part) => part.name), ...SHELF_IDS.map((id) => getShelfItem(id)!.name)]) {
            assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
        }
    });
});

describe("missing game sentences", () => {
    it("asks „Šta fali …?” with the dative and answers with the right verb ending", () => {
        assert.equal(closureQuestion("house"), "Šta fali kući?");
        assert.equal(closureQuestion("bicycle"), "Šta fali biciklu?");
        assert.equal(closureQuestion("cup"), "Šta fali šolji?");
        assert.equal(closureQuestion("face"), "Šta fali licu?");
        const answers = Object.fromEntries(CLOSURES.map((closure) => [closure.part, closure.answer]));
        assert.equal(answers.houseDoor, "Kući su falila vrata.");
        assert.equal(answers.bikeWheel, "Biciklu je falio točak.");
        assert.equal(answers.cupHandle, "Šolji je falila drška.");
        assert.equal(answers.faceNose, "Licu je falio nos.");
        for (const closure of CLOSURES) {
            const thing = getThing(closure.thing)!;
            const part = getPart(closure.part)!;
            assert.equal(part.thing, closure.thing, `${closure.part} pripada predmetu`);
            assert.ok(thing.dat && thing.gen, `${thing.id}: dativ i genitiv`);
            assert.ok(closure.answer.startsWith(thing.dat!.charAt(0).toLocaleUpperCase("sr") + thing.dat!.slice(1) + " "), closure.answer);
            assert.ok(closure.answer.endsWith(` ${part.name.toLocaleLowerCase("sr")}.`), closure.answer);
            assert.match(closure.answer, / (je falio|je falila|je falilo|su falila) /, closure.answer);
        }
    });

    it("explains a wrong part with a true fact, without blame", () => {
        const window = CLOSURES.find((closure) => closure.part === "houseWindow")!;
        assert.equal(closureWrong(window, "houseDoor"), "Kuća već ima vrata.");
        assert.equal(closureWrong(window, "cupHandle"), "To je drška od šolje.");
        assert.equal(closureWrong(window, "bikeWheel"), "To je točak od bicikla.");
    });

    it("bends the verb by the gender of the missing thing", () => {
        assert.equal(missingSentence(getShelfItem("ball")!), "Falila je lopta.");
        assert.equal(missingSentence(getShelfItem("teddy")!), "Falio je meda.");
        assert.equal(missingSentence(getShelfItem("car")!, true), "Falio je i auto.");
        assert.equal(stillThereSentence(getShelfItem("cup")!), "Šolja je i dalje na polici.");
        assert.equal(inPlaceSentence(getShelfItem("book")!), "Knjiga je na svom mestu.");
        assert.equal(swappedSentence(getShelfItem("ball")!, getShelfItem("cup")!), "Lopta i šolja su zamenile mesta.");
        assert.equal(swappedSentence(getShelfItem("teddy")!, getShelfItem("ball")!), "Meda i lopta su zamenili mesta.");
        assert.equal(namesSentence(["ball", "teddy", "apple"]), "Lopta, meda i jabuka.");
    });

    it("never tells the child where to tap", () => {
        const texts = [
            LOOK_TITLE,
            LOOK_SWAP_TITLE,
            LOOK_TAIL,
            CURTAIN_TEXT,
            GONE_QUESTION,
            GONE_TWO_HINT,
            SWAP_QUESTION,
            SWAP_HINT,
            ...CLOSURES.map((closure) => closure.answer),
            ...PARTS.map((part) => part.already),
        ];
        for (const text of texts) assert.doesNotMatch(text, TAP_WORDS, text);
        const source = readFileSync(path.join(process.cwd(), "app/components/games/MissingGame.tsx"), "utf8");
        for (const quoted of source.match(/"[^"\n]*"/g) ?? []) assert.doesNotMatch(quoted, TAP_WORDS, quoted);
    });
});

describe("missing game levels", () => {
    it("goes from closure with two parts, to three things on the shelf, to two missing and swapped places", () => {
        assert.deepEqual(missingRule(1).kinds, ["closure"]);
        assert.equal(missingRule(1).choices, 2);
        assert.deepEqual(missingRule(3).kinds, ["gone"]);
        assert.equal(missingRule(3).objects, 3);
        assert.equal(missingRule(3).choices, 2);
        assert.equal(missingRule(6).choices, 3);
        assert.ok([4, 5].includes(missingRule(6).objects) && [4, 5].includes(missingRule(7).objects));
        assert.deepEqual(missingRule(8).kinds, ["closure"]);
        assert.equal(missingRule(8).choices, 3);
        assert.deepEqual(missingRule(11).kinds, ["gone2"]);
        assert.equal(missingRule(11).objects, 6);
        assert.deepEqual(missingRule(13).kinds, ["swap"]);
        for (const level of LEVELS) assert.equal(missingRule(level), missingRule(level), `${level}`);
        // Podrška se povlači: imena i rana pomoć samo na lakšim nivoima
        assert.ok(LEVELS.filter((level) => missingRule(level).earlyHint).every((level) => level <= 5));
        assert.equal(missingRule(14).names, false);
    });

    it("builds every level for every age band with exactly the right answers and fair distractors", () => {
        for (const { level, band, rounds } of allLevels()) {
            const rule = missingRule(level);
            const tag = `nivo ${level}, ${band}`;
            assert.ok(rounds.length >= 2 && rounds.length <= rule.rounds, tag);
            for (const round of rounds) {
                assert.ok(rule.kinds.includes(round.kind) || (round.kind === "gone" && rule.kinds.includes("closure")), `${tag}: ${round.kind}`);
                if (round.kind === "closure") {
                    const answer = getPart(round.part)!;
                    assert.deepEqual(round.answers, [round.part], tag);
                    assert.ok(round.choices.includes(round.part), tag);
                    assert.equal(new Set(round.choices).size, round.choices.length, tag);
                    assert.ok(round.choices.length >= 2 && round.choices.length <= rule.choices, `${tag}: ${round.choices.length} izbora`);
                    for (const id of round.choices.filter((choice) => choice !== round.part)) {
                        const other = getPart(id)!;
                        assert.notEqual(other.kind, answer.kind, `${tag}: ${id} uz ${round.part}`);
                        if (rule.closureTier === 1) {
                            assert.notEqual(other.shape, answer.shape, `${tag}: oblik ${id} uz ${round.part}`);
                            assert.notEqual(other.thing, answer.thing, `${tag}: ${id} sa istog predmeta`);
                        }
                    }
                    continue;
                }
                assert.equal(round.shelf.length, rule.objects, tag);
                assert.equal(new Set(round.shelf).size, round.shelf.length, tag);
                for (const id of round.shelf) assert.ok(getShelfItem(id), `${tag}: ${id}`);
                if (round.kind === "swap") {
                    assert.equal(round.answers.length, 2, tag);
                    assert.deepEqual([...round.after].sort(), [...round.shelf].sort(), tag);
                    const moved = round.shelf.map((id, i) => (round.after[i] !== id ? id : null)).filter(Boolean);
                    assert.deepEqual(moved.sort(), [...round.answers].sort(), `${tag}: zamenjene su baš dve stvari`);
                    assert.deepEqual(round.choices, [], tag);
                    continue;
                }
                const missing = round.kind === "gone2" ? 2 : 1;
                assert.equal(round.answers.length, missing, tag);
                for (const id of round.answers) assert.ok(!round.after.includes(id) && round.shelf.includes(id), `${tag}: ${id} fali`);
                assert.equal(round.after.filter(Boolean).length, round.shelf.length - missing, tag);
                for (const id of round.answers) assert.ok(round.choices.includes(id), tag);
                for (const id of round.choices.filter((choice) => !round.answers.includes(choice))) assert.ok(round.after.includes(id), `${tag}: ${id} je i dalje na polici`);
                assert.ok(round.choices.length > missing, `${tag}: bar jedan pogrešan izbor`);
                assert.ok(round.choices.length <= Math.max(rule.choices, missing + 1), tag);
            }
        }
    });

    it("never shows the same closure picture twice in a row", () => {
        for (const { level, band, rounds } of allLevels()) {
            for (let i = 1; i < rounds.length; i += 1) {
                if (rounds[i].kind === "closure" && rounds[i - 1].kind === "closure") assert.notEqual(rounds[i].thing, rounds[i - 1].thing, `nivo ${level}, ${band}`);
            }
        }
    });

    it("respects the number of choices set by the parent (but always keeps one wrong choice)", () => {
        for (const level of LEVELS) {
            for (const round of buildMissingLevel(level, { maxChoices: 2, maxRounds: 5, random: seeded(level) })) {
                if (round.kind === "swap") continue;
                assert.ok(round.choices.length <= Math.max(2, round.answers.length + 1), `nivo ${level}: ${round.choices.length}`);
            }
        }
    });
});

describe("missing game scoring", () => {
    const view = (over: Partial<MissingView> = {}): MissingView => ({ ...emptyMissingView(5), ...over });

    it("does not score the demonstrated first task of level 1", () => {
        const { next, modeled, firstTry } = solveMissingView(view(), 1);
        assert.equal(modeled, true);
        assert.equal(firstTry, false);
        assert.equal(next.correctCount, 0);
        assert.equal(next.promptedCount, 0);
        assert.equal(missingResult(next, 1, 10).total, 4);
    });

    it("counts first-try answers as correct, hinted ones as prompted, and neither after a plain miss", () => {
        assert.equal(solveMissingView(view({ round: 2 }), 1).next.correctCount, 1);
        const hinted = solveMissingView(view({ round: 2, hint: true, wrong: ["x"] }), 1).next;
        assert.equal(hinted.correctCount, 0);
        assert.equal(hinted.promptedCount, 1);
        const missed = solveMissingView(view({ round: 2, wrong: ["x"] }), 4).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
    });

    it("never reports more correct and prompted answers than scored tasks", () => {
        for (const level of [1, 2, 7, 13]) {
            let current = view({ totalRounds: 5 });
            for (let round = 1; round <= 5; round += 1) {
                current = solveMissingView({ ...current, round, hint: round % 2 === 0, wrong: round % 3 === 0 ? ["x"] : [] }, level).next;
            }
            const result = missingResult(current, level, 30);
            assert.ok(result.correct + (result.prompted ?? 0) <= result.total, `nivo ${level}`);
        }
    });
});

describe("missing game live monitor state", () => {
    it("returns an empty board for missing or garbage state", () => {
        assert.deepEqual(mergeMissingMonitor(null).choices, []);
        assert.deepEqual(mergeMissingMonitor({ kind: "gone", shelf: ["bomb"], answers: ["bomb"] } as unknown as MissingView).shelf, []);
        assert.equal(mergeMissingMonitor({ kind: "closure", thing: "house", part: "bikeWheel", choices: ["bikeWheel"] }).part, "");
        assert.equal(mergeMissingMonitor({ score: -5, round: 99, totalRounds: 4 }).round, 4);
    });

    it("keeps a valid shelf, closure and swap", () => {
        const [round] = buildMissingLevel(4, { maxChoices: 3, maxRounds: 5, random: seeded(3) });
        const merged = mergeMissingMonitor({ ...emptyMissingView(5), ...roundView(round), phase: "ask", wrong: ["bomb"] });
        assert.deepEqual(merged.shelf, round.shelf);
        assert.deepEqual(merged.answers, round.answers);
        assert.equal(merged.phase, "ask");
        assert.deepEqual(merged.wrong, []);
        const closure = mergeMissingMonitor({ kind: "closure", thing: "cup", part: "cupHandle", choices: ["chairLeg", "cupHandle"], wrong: ["chairLeg"] });
        assert.equal(closure.part, "cupHandle");
        assert.deepEqual(closure.wrong, ["chairLeg"]);
        const swap = mergeMissingMonitor({ kind: "swap", phase: "ask", shelf: ["ball", "cup", "teddy", "apple"], after: ["teddy", "cup", "ball", "apple"], answers: ["ball", "teddy"] });
        assert.deepEqual(swap.answers, ["ball", "teddy"]);
    });

    it("draws the same picture and choices the child sees", () => {
        const render = (monitorState: Partial<MissingView>) => renderToStaticMarkup(createElement(MissingGame, { childId: 0, level: 3, isMonitor: true, monitorState, onComplete: () => {} }));
        const html = render({ kind: "closure", thing: "house", part: "houseDoor", choices: ["houseDoor", "cupHandle"], round: 2, totalRounds: 5 });
        assert.match(html, /Šta fali kući\?/);
        assert.match(html, /aria-label="Vrata"/);
        assert.match(html, /aria-label="Drška"/);
        const shelf = render({
            kind: "gone",
            phase: "ask",
            shelf: ["ball", "teddy", "apple"],
            after: ["ball", "", "apple"],
            answers: ["teddy"],
            choices: ["teddy", "apple"],
            round: 1,
            totalRounds: 5,
        });
        assert.match(shelf, /Šta fali\?/);
        assert.match(shelf, /aria-label="Meda"/);
        assert.match(shelf, /Prazno mesto/);
        assert.match(render({ kind: "gone", phase: "curtain", shelf: ["ball", "teddy", "apple"], after: ["ball", "", "apple"], answers: ["teddy"], choices: ["teddy", "apple"] }), /Zatvori oči/);
        assert.match(render({ kind: "nope" } as unknown as MissingView), /Igra uskoro počinje/);
        assert.match(
            render({ kind: "swap", phase: "look", shelf: ["ball", "cup", "teddy", "apple"], after: ["teddy", "cup", "ball", "apple"], answers: ["ball", "teddy"] }),
            new RegExp(LOOK_SWAP_TITLE.replace(".", "\\."))
        );
        assert.equal(missingQuestion({ kind: "swap", phase: "ask", thing: "" }), SWAP_QUESTION);
    });
});

describe("missing game registry entry", () => {
    const game = getGame("missing");

    it("is activity 25, graded, with its own colour, cover, tip and play-with-a-friend", () => {
        assert.equal(game.id, "missing");
        assert.equal(game.gameType, "missing");
        assert.equal(game.activityId, 25);
        assert.equal(game.graded, true);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        assert.ok(game.offscreenTip.length > 40);
        assert.equal(GAMES.filter((other) => other.accent.solid === game.accent.solid).length, 1, "boja je samo njena");
        assert.ok(TOGETHER_GAMES.includes("missing"));
    });

    it("has a migration that adds activity 25 in the cognitive category", () => {
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0020_missing_game.sql"), "utf8");
        assert.match(sql, /\(25, 'Šta fali\?', 'Zapamti i pronađi šta fali', 'cognitive'/);
        assert.match(sql, /on conflict \(id\) do update/);
    });
});
