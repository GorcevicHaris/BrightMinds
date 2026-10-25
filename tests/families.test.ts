// Igra „Mama i beba” (app/components/games/data/familyLevels.ts): imena, nivoi, rečenice i bodovanje.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    answerSentence,
    belongs,
    boardHint,
    buildFamilyLevel,
    emptyFamilyView,
    FAMILY_MAX_LEVEL,
    FAMILY_SPECIES,
    familyResult,
    familyRule,
    getSpecies,
    isBoard,
    mergeFamilyMonitor,
    misplacedSentence,
    PERSON_IDS,
    pieceName,
    roundQuestion,
    roundView,
    solveFamilyView,
    SPECIES,
    SPECIES_IDS,
    wrongSentence,
    type FamilyRound,
    type FamilyView,
} from "@/app/components/games/data/familyLevels";
import FamilyGame from "@/app/components/games/FamilyGame";
import { DRAWN_BABIES, FamilyAnimal } from "@/app/components/games/families/animals";
import { PersonPicture } from "@/app/components/games/families/people";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame } from "@/lib/games";
import { isTogetherGame } from "@/lib/playTogether";
import { isRemoteGame } from "@/lib/invite";
import { toCyrillic } from "@/lib/script";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: FAMILY_MAX_LEVEL }, (_, i) => i + 1);
const build = (level: number, seed = 1, preset = BAND_PRESETS.older) => buildFamilyLevel(level, { maxChoices: preset.maxChoices, maxRounds: preset.maxRounds, random: seeded(seed) });

/** Prava imena mladunaca (i mama) — tabela iz zadatka */
const NAMES: Record<string, [string, string]> = {
    cow: ["Krava", "Tele"],
    chicken: ["Kokoška", "Pile"],
    sheep: ["Ovca", "Jagnje"],
    cat: ["Mačka", "Mače"],
    dog: ["Kuja", "Kuče"],
    horse: ["Kobila", "Ždrebe"],
    pig: ["Svinja", "Prase"],
    duck: ["Patka", "Pače"],
    goat: ["Koza", "Jare"],
    rabbit: ["Zečica", "Zeče"],
    bear: ["Medvedica", "Meče"],
    lion: ["Lavica", "Lavić"],
    elephant: ["Slonica", "Slonče"],
    frog: ["Žaba", "Punoglavac"],
    butterfly: ["Leptir", "Gusenica"],
};

describe("animal families content", () => {
    it("has every pair once, with the correct Serbian names for mother and young", () => {
        assert.equal(new Set(SPECIES.map((s) => s.id)).size, SPECIES.length);
        assert.equal(new Set(SPECIES.map((s) => s.baby)).size, SPECIES.length, "every baby name is unique");
        assert.equal(new Set(SPECIES.map((s) => s.mother)).size, SPECIES.length, "every mother name is unique");
        assert.deepEqual(Object.fromEntries(SPECIES.map((s) => [s.id, [s.mother, s.baby]])), NAMES);
    });

    it("marks only chick, tadpole and caterpillar as babies that do not look like their mother", () => {
        assert.deepEqual(SPECIES.filter((s) => !s.alike).map((s) => s.id).sort(), ["butterfly", "chicken", "frog"]);
    });

    it("has fathers for every family species, with their real names", () => {
        assert.deepEqual(Object.fromEntries(FAMILY_SPECIES.map((id) => [id, getSpecies(id)!.father])), {
            cow: "Bik",
            sheep: "Ovan",
            duck: "Patak",
            goat: "Jarac",
            lion: "Lav",
            elephant: "Slon",
            chicken: "Petao",
        });
    });

    it("says true, calm sentences without telling the child where to tap", () => {
        for (const s of SPECIES) {
            for (const text of [s.pairLine, s.hasLine]) {
                assert.match(text, /^\p{Lu}.*\.$/u, text);
                assert.doesNotMatch(text, /dodirni|klikni|prevuci|ovde|levo|desno|\bne\b/iu, text);
            }
            assert.ok(s.pairLine.toLocaleLowerCase("sr").includes(s.baby.toLocaleLowerCase("sr")), s.pairLine);
        }
        assert.equal(getSpecies("cow")!.pairLine, "Krava i njeno tele.");
        assert.equal(getSpecies("lion")!.hasLine, "Lavica ima lavića.");
        assert.equal(misplacedSentence("family", "cow"), "Tu žive bik, krava i tele.");
        assert.equal(misplacedSentence("people", "nana"), "Tu stoji nana.");
    });

    it("draws a mother and a baby for every species, a father for every family and every person", () => {
        assert.deepEqual([...DRAWN_BABIES].sort(), [...SPECIES_IDS].sort());
        for (const species of SPECIES_IDS) {
            for (const role of ["mother", "baby"] as const) {
                const svg = renderToStaticMarkup(createElement(FamilyAnimal, { species, role }));
                assert.match(svg, /^<svg[^>]*viewBox="0 0 100 100"/, `${species} ${role}`);
                assert.ok(svg.length > 400, `${species} ${role}`);
            }
        }
        for (const species of FAMILY_SPECIES) {
            const father = renderToStaticMarkup(createElement(FamilyAnimal, { species, role: "father" }));
            const mother = renderToStaticMarkup(createElement(FamilyAnimal, { species, role: "mother" }));
            assert.notEqual(father, mother, `${species}: tata se razlikuje od mame`);
        }
        for (const id of PERSON_IDS) assert.match(renderToStaticMarkup(createElement(PersonPicture, { id })), /<svg/);
        // Nana nosi maramu
        assert.ok(renderToStaticMarkup(createElement(PersonPicture, { id: "nana" })).includes("#5f9e86"));
    });
});

describe("animal families levels", () => {
    it("builds every level for every age band and many seeds", () => {
        for (const level of LEVELS) {
            for (const preset of Object.values(BAND_PRESETS)) {
                for (let seed = 1; seed <= 25; seed += 1) {
                    const rounds = build(level, seed, preset);
                    const rule = familyRule(level);
                    assert.equal(rounds.length, Math.max(2, Math.min(rule.rounds, preset.maxRounds)), `level ${level}`);
                    for (const round of rounds) checkRound(round, level, preset.maxChoices);
                }
            }
        }
    });

    it("starts with two pairs (babies under their mothers) and grows to three and four", () => {
        const first = build(1);
        assert.ok(first.every((r) => r.kind === "match" && r.targets.length === 2));
        assert.ok(first.every((r) => r.pieces.join() === r.targets.join()), "level 1: aligned");
        assert.ok(build(2, 3).some((r) => r.pieces.join() !== r.targets.join()), "level 2: mixed");
        assert.ok(build(3).every((r) => r.targets.length === 3));
        assert.ok(build(6).every((r) => r.targets.length === 4));
        assert.ok(build(6, 1, BAND_PRESETS.young).every((r) => r.targets.length === 3), "young children see at most three");
    });

    it("uses only babies that look like their mother before the hard tier", () => {
        for (const level of LEVELS.filter((l) => l <= 10)) {
            for (let seed = 1; seed <= 20; seed += 1) {
                for (const round of build(level, seed)) {
                    for (const id of [...round.targets, ...round.choices]) assert.ok(getSpecies(id)!.alike, `level ${level}: ${id}`);
                }
            }
        }
    });

    it("brings in chick, tadpole or caterpillar on level 11 and families from level 12", () => {
        const unlike = ["chicken", "frog", "butterfly"];
        for (let seed = 1; seed <= 10; seed += 1) {
            for (const round of build(11, seed)) {
                const ids = round.kind === "whose" ? [round.answer] : round.targets;
                if (round.kind === "match") assert.ok(ids.some((id) => unlike.includes(id)), `seed ${seed}`);
            }
            assert.ok(build(11, seed).some((r) => r.kind === "whose" && unlike.includes(r.answer)));
        }
        assert.ok(build(12).every((r) => r.kind === "family" && r.targets.length === 2 && r.outline));
        assert.ok(build(13).every((r) => r.kind === "family" && r.targets.length === 3 && !r.outline));
        const people = build(14);
        assert.ok(people.some((r) => r.kind === "people") && people.some((r) => r.kind === "person"));
    });

    it("has kinds for every tier: matching, then whose/name, then families and people", () => {
        const kinds = (level: number) => new Set(build(level).map((r) => r.kind));
        for (const level of [1, 2, 3, 4, 5]) assert.deepEqual([...kinds(level)], ["match"]);
        assert.deepEqual([...kinds(7)], ["whose"]);
        assert.deepEqual([...kinds(8)], ["name"]);
        assert.deepEqual([...kinds(15)].sort(), ["family", "match", "name", "person", "whose"]);
    });

    it("asks questions without telling where to tap", () => {
        for (const level of LEVELS) {
            for (const round of build(level, 7)) {
                const question = roundQuestion(round);
                assert.ok(question.length > 0);
                assert.doesNotMatch(question, /dodirni|klikni|prevuci|levo|desno|gore|dole|ovde/iu, question);
            }
        }
        assert.equal(roundQuestion({ kind: "name", answer: "sheep" }), "Gde je jagnje?");
        assert.equal(roundQuestion({ kind: "person", answer: "nana" }), "Gde je nana?");
        assert.equal(answerSentence({ kind: "whose", answer: "cow" }), "Krava i njeno tele.");
        assert.equal(wrongSentence({ kind: "whose", answer: "cow" }, "cat"), "Mačka ima mače.");
        assert.equal(wrongSentence({ kind: "name", answer: "cow" }, "cat"), "Ovo je mače.");
    });
});

function checkRound(round: FamilyRound, level: number, maxChoices: number) {
    const where = `level ${level} ${round.kind}`;
    if (isBoard(round.kind)) {
        assert.equal(new Set(round.targets).size, round.targets.length, `${where}: unique targets`);
        assert.equal(new Set(round.pieces).size, round.pieces.length, `${where}: unique pieces`);
        // Svaki komad pripada tačno jednom mestu, a svako mesto dobija komad
        for (const piece of round.pieces) {
            assert.equal(round.targets.filter((t) => belongs(round.kind, piece, t)).length, 1, `${where}: ${piece}`);
            assert.ok(pieceName(round.kind, piece).length > 0, `${where}: name of ${piece}`);
        }
        for (const target of round.targets) assert.ok(round.pieces.some((p) => belongs(round.kind, p, target)), `${where}: ${target}`);
        if (round.kind === "family") {
            assert.equal(round.pieces.length, round.targets.length * 2);
            for (const target of round.targets) assert.ok(getSpecies(target)!.father, `${where}: ${target} has a father`);
        }
        if (round.kind === "match") assert.ok(round.targets.length <= Math.max(2, maxChoices), where);
        if (round.kind === "people") assert.deepEqual([...round.targets].sort(), [...PERSON_IDS].sort());
        return;
    }
    assert.ok(round.choices.includes(round.answer), `${where}: answer offered`);
    assert.equal(new Set(round.choices).size, round.choices.length, `${where}: unique choices`);
    assert.ok(round.choices.length >= 2 && round.choices.length <= Math.max(2, maxChoices), where);
}

describe("animal families scoring", () => {
    const view = (round: FamilyRound, total: number): FamilyView => ({ ...emptyFamilyView(total), ...roundView(round) });

    it("does not score the modelled first task of level 1", () => {
        const round = build(1)[0];
        const { next, modeled, firstTry } = solveFamilyView(view(round, 4), 1);
        assert.ok(modeled);
        assert.ok(!firstTry);
        assert.equal(next.correctCount, 0);
        assert.equal(next.promptedCount, 0);
        assert.deepEqual(familyResult(next, 1, 30), { score: 5, durationSec: 30, correct: 0, total: 3, prompted: 0 });
    });

    it("counts correct (first try, no hint) and prompted (with hint) separately, never more than the total", () => {
        const rounds = build(9);
        let current = view(rounds[0], rounds.length);
        // 1: samostalno; 2: uz pomoć; 3: posle greške bez pomoći; ostalo samostalno
        const outcomes = rounds.map((_, i) => (i === 1 ? "hint" : i === 2 ? "wrong" : "ok"));
        outcomes.forEach((how, i) => {
            current = { ...current, ...roundView(rounds[i]), round: i + 1, wrong: how === "wrong" ? ["x"] : [], hint: how === "hint", feedback: null };
            current = solveFamilyView(current, 9).next;
        });
        const result = familyResult(current, 9, 60);
        assert.equal(result.total, rounds.length);
        assert.equal(result.correct, rounds.length - 2);
        assert.equal(result.prompted, 1);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("gives the board hint for the first piece that is not placed yet", () => {
        const round = build(3)[0];
        const v = view(round, 4);
        const hint = boardHint(v)!;
        assert.equal(hint.piece, round.pieces[0]);
        assert.ok(belongs(round.kind, hint.piece, hint.target));
        assert.equal(boardHint({ ...v, placed: [...round.pieces] }), null);
    });

    it("keeps only known values from the live-monitor state", () => {
        assert.deepEqual(mergeFamilyMonitor(null), emptyFamilyView(1));
        const round = build(13)[0];
        const merged = mergeFamilyMonitor({ ...view(round, 4), pieces: [...round.pieces, "dragon.dad", 5 as unknown as string], placed: ["nope", round.pieces[0]], wrong: ["<script>"] });
        assert.deepEqual(merged.pieces, round.pieces);
        assert.deepEqual(merged.placed, [round.pieces[0]]);
        assert.deepEqual(merged.wrong, []);
        const bad = mergeFamilyMonitor({ kind: "whose", answer: "dragon", choices: ["cow", "cat"] });
        assert.deepEqual(bad.choices, []);
    });

});

describe("animal families in the live monitor", () => {
    const render = (monitorState: Partial<FamilyView>) => renderToStaticMarkup(createElement(FamilyGame, { childId: 0, level: 12, isMonitor: true, monitorState, onComplete: () => {} }));

    it("draws the matching board with the baby already beside its mother", () => {
        const html = render({ kind: "match", targets: ["cow", "sheep"], pieces: ["sheep", "cow"], placed: ["cow"], round: 2, totalRounds: 4 });
        assert.match(html, /Svaka beba ide kod svoje mame\./);
        assert.match(html, /aria-label="Krava, krava i njeno tele\."/);
        assert.match(html, /aria-label="Jagnje"/);
    });

    it("draws the question „Čija je ovo beba?” with mothers to choose from", () => {
        const html = render({ kind: "whose", answer: "frog", choices: ["frog", "cow", "cat"], round: 1, totalRounds: 4 });
        assert.match(html, /Čija je ovo beba\?/);
        assert.match(html, /aria-label="Žaba"/);
    });
});

describe("animal families registry entry", () => {
    const game = getGame("families");

    it("is activity 20, for ages 3–8, with its own colour, cover and tip for the adult", () => {
        assert.equal(game.id, "families");
        assert.equal(game.gameType, "families");
        assert.equal(game.activityId, 20);
        assert.equal(game.title, "Mama i beba");
        assert.deepEqual(game.ages, { min: 3, max: 8 });
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        assert.match(readFileSync(path.join(process.cwd(), "public", game.image), "utf8"), /^<svg[^>]+viewBox="0 0 1380 752"/);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        assert.doesNotMatch(toCyrillic(game.title), /\p{Script=Latin}/u);
    });

    it("can be played with a friend on one device and on two devices", () => {
        assert.ok(isTogetherGame("families"));
        assert.ok(isRemoteGame("families"));
    });

    it("has a migration that adds activity 20 in the cognitive category", () => {
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0015_animal_families.sql"), "utf8");
        assert.match(sql, /\(20, 'Mama i beba', '[^']+', 'cognitive'/);
        assert.match(sql, /on conflict \(id\) do update/);
    });
});
