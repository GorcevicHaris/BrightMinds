// Igra „Operi ruke i zube” (app/components/games/data/hygieneLevels.ts): rutine, nivoi, reči,
// bodovanje, stanje sa monitora i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    buildHygieneLevel,
    emptyHygieneView,
    getStep,
    hygieneResult,
    hygieneRule,
    introText,
    mergeHygieneMonitor,
    ROUTINES,
    rubDoneText,
    rubPrompt,
    rubStep,
    SITUATION_IDS,
    SITUATIONS,
    STEP_IDS,
    STEPS,
    stepQuestion,
    WHEN_QUESTION,
    wrongStepText,
    wrongWhenText,
    type StepId,
} from "@/app/components/games/data/hygieneLevels";
import { isDrawId } from "@/app/components/games/sequence/art";
import { RubBubbles, StepIcon } from "@/app/components/games/hygiene/HygieneArt";
import { BAND_PRESETS } from "@/lib/childSettings";
import { getGame, MAX_LEVEL } from "@/lib/games";
import { isTogetherGame } from "@/lib/playTogether";
import { hasSharedBoard } from "@/lib/sharedPlay";
import { versusFormat } from "@/lib/versusFormat";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

describe("hygiene routines", () => {
    it("washes hands in the right order (water, soap, rub, rinse, towel) and brushes teeth step by step", () => {
        assert.deepEqual(ROUTINES.hands5, ["wet", "soap", "scrub", "rinse", "dry"]);
        assert.deepEqual(ROUTINES.hands6, ["wet", "soap", "scrub", "rinse", "tapOff", "dry"]);
        assert.deepEqual(ROUTINES.teeth, ["paste", "brush", "spit", "cleanBrush", "putAway"]);
        for (const id of STEP_IDS) {
            const step = STEPS[id];
            assert.equal(step.id, id);
            assert.ok(step.label && step.text.endsWith(".") || step.text.endsWith("!"), id);
            assert.equal(step.act, step.act.toLowerCase(), id);
            const scene = step.scene();
            assert.ok(scene.items.length > 0);
            for (const item of scene.items) if ("d" in item && item.d) assert.ok(isDrawId(item.d), `${id}: ${item.d}`);
        }
        assert.ok(rubStep("scrub") && rubStep("brush") && !rubStep("soap"));
    });

    it("has fifteen levels: model strip, then a „?”, then no strip with „When do we wash?”", () => {
        assert.deepEqual(LEVELS.slice(0, 5).map((lv) => hygieneRule(lv).strip), Array(5).fill("next"));
        assert.deepEqual(LEVELS.slice(5, 10).map((lv) => hygieneRule(lv).strip), Array(5).fill("mystery"));
        assert.deepEqual(LEVELS.slice(10).map((lv) => hygieneRule(lv).strip), Array(5).fill("none"));
        assert.deepEqual(LEVELS.map((lv) => hygieneRule(lv).choices), [...Array(5).fill(2), ...Array(5).fill(3), ...Array(5).fill(4)]);
        assert.equal(hygieneRule(1).rubTarget, 10);
        assert.equal(hygieneRule(6).rubTarget, 20);
        assert.ok(LEVELS.slice(5, 10).some((lv) => hygieneRule(lv).routine === "teeth"));
        assert.ok(LEVELS.slice(10).every((lv) => hygieneRule(lv).when > 0));
    });

    it("builds every level for every age band: the whole routine, choices within the limit, the answer always offered", () => {
        for (const preset of Object.values(BAND_PRESETS)) {
            for (const level of LEVELS) {
                const rule = hygieneRule(level);
                const rounds = buildHygieneLevel(level, { maxChoices: preset.maxChoices, maxRounds: preset.maxRounds, random: seeded(level) });
                const steps = rounds.filter((r) => r.kind === "step");
                // Rutina se nikad ne skraćuje
                assert.deepEqual(steps.map((r) => r.kind === "step" && r.step), [...ROUTINES[rule.routine]], `nivo ${level}`);
                for (const round of rounds) {
                    const answer = round.kind === "step" ? round.step : round.situation;
                    assert.ok((round.choices as string[]).includes(answer));
                    assert.equal(new Set(round.choices).size, round.choices.length);
                    assert.ok(round.choices.length >= 2 && round.choices.length <= Math.max(Math.min(rule.choices, preset.maxChoices), 2));
                    if (round.kind === "when") {
                        assert.equal(SITUATIONS[round.situation].wash, true);
                        for (const other of round.choices) if (other !== round.situation) assert.equal(SITUATIONS[other].wash, false);
                    }
                    if (round.kind === "step" && !rule.mixRoutines) for (const id of round.choices) assert.equal(STEPS[id].routine, STEPS[round.step].routine);
                }
                assert.ok(rounds.length <= Math.max(preset.maxRounds, ROUTINES[rule.routine].length), `nivo ${level}: broj zadataka`);
            }
        }
        // Na lakim nivoima jedini drugi izbor je korak koji dolazi kasnije (najčešća zabuna)
        const first = buildHygieneLevel(1, { maxChoices: 4, maxRounds: 8, random: seeded(1) })[0];
        assert.ok(first.kind === "step" && first.choices.length === 2 && ROUTINES.hands5.indexOf(first.choices.find((c) => c !== first.step) as StepId) > 0);
        // Pitanje pre rutine na nivou 13
        assert.equal(buildHygieneLevel(13, { maxChoices: 4, maxRounds: 8 })[0].kind, "when");
    });

    it("is the same for the same seed and differs for another seed", () => {
        assert.deepEqual(buildHygieneLevel(12, { maxChoices: 4, maxRounds: 8, random: seeded(4) }), buildHygieneLevel(12, { maxChoices: 4, maxRounds: 8, random: seeded(4) }));
        assert.notDeepEqual(buildHygieneLevel(12, { maxChoices: 4, maxRounds: 8, random: seeded(4) }), buildHygieneLevel(12, { maxChoices: 4, maxRounds: 8, random: seeded(5) }));
    });
});

describe("hygiene words", () => {
    it("explains a wrong step calmly: later, already done, or from the other routine", () => {
        assert.equal(wrongStepText("hands5", 0, "soap"), "Još ne. Prvo pokvasimo ruke, pa onda uzmemo sapun.");
        assert.equal(wrongStepText("hands5", 3, "soap"), "To smo već uradili. Šta je sledeće?");
        assert.equal(wrongStepText("hands6", 1, "paste"), "Pasta nam treba kad peremo zube. Sada peremo ruke.");
        assert.equal(wrongStepText("teeth", 0, "brush"), "Još ne. Prvo stavimo pastu na četkicu, pa onda očetkamo zube.");
        assert.equal(wrongWhenText("music"), "Dok slušamo muziku, ruke ne moramo da peremo. Probaj ponovo.");
    });

    it("counts to twenty at home and explains the shorter count on easy levels", () => {
        assert.match(rubDoneText("scrub", 10), /do dvadeset/);
        assert.match(rubDoneText("scrub", 20), /^Dvadeset!/);
        assert.match(rubDoneText("brush", 20), /dva minuta/);
    });

    it("never tells the child where to tap, has no emoji, and can be shown in Cyrillic", () => {
        const lines = [
            ...STEP_IDS.flatMap((id) => [STEPS[id].label, STEPS[id].text]),
            ...SITUATION_IDS.flatMap((id) => [SITUATIONS[id].label, SITUATIONS[id].text, wrongWhenText(id)]),
            ...(["hands5", "hands6", "teeth"] as const).flatMap((r) => [introText(r), ...ROUTINES[r].flatMap((_, i) => ROUTINES[r].map((p) => wrongStepText(r, i, p)))]),
            stepQuestion(0),
            stepQuestion(2),
            WHEN_QUESTION,
            rubPrompt("scrub"),
            rubPrompt("brush"),
            rubDoneText("scrub", 10),
            rubDoneText("brush", 20),
        ];
        for (const line of lines) {
            assert.doesNotMatch(line, TAP_WORDS, line);
            assert.doesNotMatch(line, EMOJI, line);
            assert.doesNotMatch(toCyrillic(line), /\p{Script=Latin}/u, line);
        }
    });
});

describe("hygiene scoring and monitor", () => {
    it("reports correct + prompted ≤ total, without the demo round", () => {
        const view = { ...emptyHygieneView(5), score: 35, correctCount: 3, promptedCount: 1 };
        const result = hygieneResult(view, 1, 40);
        assert.deepEqual(result, { score: 35, durationSec: 40, correct: 3, total: 4, prompted: 1 });
        assert.ok(result.correct + result.prompted <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeHygieneMonitor({ kind: "step", routine: "teeth", answer: "brush", choices: ["brush", "paste", "rocket", "brush"], wrong: ["paste", "brush", "x"], picked: "rocket", rub: 99, rubTarget: 20, rubbing: true, index: 40, round: 7, totalRounds: 5, strip: "other" as never });
        assert.deepEqual(merged.choices, ["brush", "paste"]);
        assert.deepEqual(merged.wrong, ["paste"]);
        assert.equal(merged.picked, null);
        assert.equal(merged.rub, 20);
        assert.equal(merged.rubbing, true);
        assert.equal(merged.index, 4);
        assert.equal(merged.round, 5);
        assert.equal(merged.strip, "next");
        // Nepoznat odgovor: prazna tabla, bez trljanja
        const bad = mergeHygieneMonitor({ kind: "when", answer: "brush", choices: ["brush"], rubbing: true });
        assert.equal(bad.answer, "");
        assert.equal(bad.rubbing, false);
        assert.deepEqual(mergeHygieneMonitor(undefined), emptyHygieneView(1));
        assert.equal(mergeHygieneMonitor({ kind: "when", answer: "afterDog", choices: ["reading", "afterDog"] }).answer, "afterDog");
    });
});

describe("hygiene art and registry", () => {
    it("draws every step icon and the bubbles without NaN or emoji", () => {
        for (const id of STEP_IDS) {
            const html = renderToStaticMarkup(createElement(StepIcon, { id }));
            assert.ok(html.length > 150, id);
            assert.doesNotMatch(html, /NaN|undefined/, id);
            assert.doesNotMatch(html, EMOJI);
        }
        for (const mouth of [false, true]) {
            const html = renderToStaticMarkup(createElement(RubBubbles, { count: 7, target: 20, calm: true, mouth }));
            assert.equal((html.match(/<circle/g) ?? []).length, 14);
            assert.doesNotMatch(html, /NaN/);
        }
        assert.equal(getStep("nope"), undefined);
    });

    it("is activity 48, graded, with a cover, a migration and its own colour", () => {
        const game = getGame("hygiene");
        assert.equal(game.activityId, 48);
        assert.equal(game.graded, true);
        assert.deepEqual(game.ages, { min: 3, max: 8 });
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)));
        assert.match(read("supabase/migrations/0026_calm_games.sql"), /\(48, 'Operi ruke i zube'/);
        assert.match(game.accent.solid, /mint/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("hygiene"));
        assert.ok(hasSharedBoard("hygiene"));
        assert.equal(versusFormat("hygiene"), "turns");
        const source = read("app/components/games/HygieneGame.tsx");
        assert.match(source, /data-action=\{isStep \? `step:\$\{id\}` : `when:\$\{id\}`\}/);
        assert.match(source, /data-action="rub"/);
    });
});
