// Igra „Balon disanja” (app/components/games/data/breathingLevels.ts): nivoi, obrasci disanja,
// reči, bodovanje bez grešaka, stanje sa monitora i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    BREATH_COLORS,
    BREATH_PICTURES,
    BREATH_PRAISE,
    breathingResult,
    breathingRule,
    breathSteps,
    buildBreathingLevel,
    emptyBreathingView,
    introText,
    mergeBreathingMonitor,
    phaseCue,
    phaseSeconds,
    phaseVoice,
    READY_TEXT,
    type BreathPhase,
} from "@/app/components/games/data/breathingLevels";
import { BreathBalloon, BreathScene } from "@/app/components/games/breathing/BreathArt";
import { genderText } from "@/app/components/games/kit/utils";
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

describe("breathing levels", () => {
    it("has fifteen levels: balloon, then pictures, then holding, the square and the fingers", () => {
        assert.deepEqual(LEVELS.slice(0, 5).map((lv) => breathingRule(lv).pictures), Array(5).fill(["balloon"]));
        assert.deepEqual([6, 7, 8].map((lv) => breathingRule(lv).pictures[0]), ["flower", "pinwheel", "bubble"]);
        assert.equal(breathingRule(11).pattern.hold, 2);
        assert.deepEqual(breathingRule(12).pictures, ["box"]);
        assert.deepEqual(breathingRule(13).pictures, ["fingers"]);
        assert.ok(breathingRule(15).mixed);
    });

    it("breathes slowly: short breaths for the youngest, longer later, exhale never shorter than inhale", () => {
        for (const level of LEVELS) {
            const { pattern, breaths } = breathingRule(level);
            assert.ok(pattern.inhale >= 3 && pattern.inhale <= 4, `nivo ${level}`);
            assert.ok(pattern.exhale >= pattern.inhale, `nivo ${level}: izdah bar koliko udah`);
            assert.ok(breaths >= 3 && breaths <= 5);
        }
        assert.equal(breathingRule(1).pattern.inhale, 3);
        assert.equal(breathingRule(6).pattern.inhale, 4);
        assert.deepEqual(breathSteps({ inhale: 4, hold: 4, exhale: 4, rest: 4 }).map((s) => s.phase), ["in", "hold", "out", "rest"]);
        assert.deepEqual(breathSteps({ inhale: 3, hold: 0, exhale: 4, rest: 0 }), [
            { phase: "in", ms: 3000 },
            { phase: "out", ms: 4000 },
        ]);
    });

    it("builds every level for every age band within the round limit, with soft colours and no repeats in a row", () => {
        for (const preset of Object.values(BAND_PRESETS)) {
            for (const level of LEVELS) {
                const rounds = buildBreathingLevel(level, { maxRounds: preset.maxRounds, random: seeded(level) });
                assert.ok(rounds.length >= 2 && rounds.length <= Math.max(preset.maxRounds, 2), `nivo ${level}`);
                for (const [i, round] of rounds.entries()) {
                    assert.ok(BREATH_PICTURES.includes(round.picture));
                    assert.ok((BREATH_COLORS as readonly string[]).includes(round.color));
                    if (i > 0) assert.notEqual(round.color, rounds[i - 1].color);
                    if (round.picture === "box") assert.deepEqual(round.pattern, { inhale: 4, hold: 4, exhale: 4, rest: 4 });
                }
            }
        }
        // Pet prstiju: svaki udah sledeći prst
        assert.deepEqual(buildBreathingLevel(13, { maxRounds: 8 }).map((r) => r.finger), [0, 1, 2, 3, 4]);
        // Izmešano: nijedna slika dvaput zaredom
        const mixed = buildBreathingLevel(10, { maxRounds: 8, random: seeded(3) });
        mixed.slice(1).forEach((r, i) => assert.notEqual(r.picture, mixed[i].picture));
    });

    it("is the same for the same seed and differs for another seed", () => {
        assert.deepEqual(buildBreathingLevel(9, { maxRounds: 8, random: seeded(1) }), buildBreathingLevel(9, { maxRounds: 8, random: seeded(1) }));
        assert.notDeepEqual(buildBreathingLevel(9, { maxRounds: 8, random: seeded(1) }), buildBreathingLevel(9, { maxRounds: 8, random: seeded(2) }));
    });
});

describe("breathing words", () => {
    const phases: BreathPhase[] = ["in", "hold", "out", "rest"];
    const lines = [
        ...BREATH_PICTURES.flatMap((pic) => [introText(pic), ...phases.flatMap((ph) => [phaseCue(ph, pic), phaseVoice(ph, pic)])]),
        ...BREATH_PRAISE.flatMap((t) => [genderText(t, true), genderText(t, false)]),
        genderText(READY_TEXT, true),
        genderText(READY_TEXT, false),
    ];

    it("never tells the child where to tap, has no emoji, and can be shown in Cyrillic", () => {
        for (const line of lines) {
            assert.doesNotMatch(line, TAP_WORDS, line);
            assert.doesNotMatch(line, EMOJI, line);
            assert.doesNotMatch(toCyrillic(line), /\p{Script=Latin}/u, line);
        }
    });

    it("speaks to boys and girls correctly", () => {
        assert.equal(genderText(READY_TEXT, true), "Kad budeš spremna, kreni.");
        assert.equal(genderText(READY_TEXT, false), "Kad budeš spreman, kreni.");
        assert.equal(genderText(BREATH_PRAISE[0], true), "Bravo, lepo si disala.");
    });

    it("says inhale through the nose and exhale slowly, with pictures young children know", () => {
        assert.equal(phaseVoice("in", "balloon"), "Polako udahni kroz nos.");
        assert.equal(phaseCue("in", "flower"), "Pomiriši cvet…");
        assert.equal(phaseCue("out", "flower"), "Ugasi svećicu…");
        assert.equal(phaseCue("hold", "box"), "Zadrži…");
        assert.equal(phaseSeconds({ phase: "out", pattern: { inhale: 3, hold: 0, exhale: 4, rest: 0 } }), 4);
    });
});

describe("breathing scoring and monitor", () => {
    it("never fails: every finished breath is correct, the demonstrated breath is not counted", () => {
        const view = { ...emptyBreathingView(3), score: 20, correctCount: 2 };
        assert.deepEqual(breathingResult(view, 1, 30), { score: 20, durationSec: 30, correct: 2, total: 2, prompted: 0 });
        assert.deepEqual(breathingResult({ ...view, correctCount: 3 }, 0, 30).total, 3);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeBreathingMonitor({ picture: "rocket" as never, phase: "jump" as never, color: "red", round: 9, totalRounds: 3, pattern: { inhale: 99, hold: -1, exhale: "x" } as never, finger: 12, phaseMs: 1e9 });
        assert.equal(merged.picture, "balloon");
        assert.equal(merged.phase, "ready");
        assert.equal(merged.color, BREATH_COLORS[0]);
        assert.equal(merged.round, 3);
        assert.deepEqual(merged.pattern, { inhale: 8, hold: 0, exhale: 1, rest: 0 });
        assert.equal(merged.finger, 4);
        assert.ok(merged.phaseMs <= 10_000);
        assert.deepEqual(mergeBreathingMonitor(null), emptyBreathingView(1));
        const ok = mergeBreathingMonitor({ picture: "box", phase: "hold", phaseMs: 4000, phaseKey: 7, round: 2, totalRounds: 5, color: BREATH_COLORS[2] });
        assert.equal(ok.picture, "box");
        assert.equal(ok.phase, "hold");
        assert.equal(ok.phaseKey, 7);
    });
});

describe("breathing art", () => {
    it("draws every picture in every phase, calm and moving, without NaN or emoji", () => {
        for (const picture of BREATH_PICTURES) {
            for (const phase of ["ready", "in", "hold", "out", "rest"] as const) {
                for (const calm of [false, true]) {
                    const html = renderToStaticMarkup(createElement(BreathScene, { picture, phase, ms: 4000, tick: 2, seconds: 4, color: BREATH_COLORS[1], finger: 2, fingersDone: 2, calm }));
                    assert.ok(html.length > 300, picture);
                    assert.doesNotMatch(html, /NaN|undefined/, `${picture} ${phase}`);
                    assert.doesNotMatch(html, EMOJI);
                    if (calm) assert.doesNotMatch(html, /transition:transform \d+ms/, `${picture}: bez pokreta uz calm`);
                }
            }
        }
    });

    it("the pause screen uses the same balloon", () => {
        const html = renderToStaticMarkup(createElement(BreathBalloon, { level: 1, ms: 4000, color: "#7cc7e8", calm: false }));
        assert.match(html, /scale\(1\)/);
        assert.match(read("app/dashboard/child/[id]/GameContainer.tsx"), /<BreathBalloon level=\{inhale \? 1 : 0\} ms=\{4000\}/);
    });
});

describe("breathing registry", () => {
    it("is activity 43, graded (every breath counts), with a cover, a migration and its own colour", () => {
        const game = getGame("breathing");
        assert.equal(game.activityId, 43);
        assert.equal(game.graded, true);
        assert.deepEqual(game.ages, { min: 3, max: 10 });
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)));
        assert.match(read("supabase/migrations/0026_calm_games.sql"), /\(43, 'Balon disanja'/);
        assert.match(game.accent.solid, /seafoam/);
    });

    it("can be played with a friend on one device and on two (one breath each, turn by turn)", () => {
        assert.ok(isTogetherGame("breathing"));
        assert.ok(hasSharedBoard("breathing"));
        assert.equal(versusFormat("breathing"), "turns");
        assert.match(read("app/components/games/BreathingGame.tsx"), /data-action="breathe"/);
    });
});
