// Igra „Ponovi ritam” (app/components/games/data/rhythmLevels.ts): nivoi (instrumenti, broj
// udaraca, takt, skriven zapis), ritmovi iz semena, reči uz broj, stanje za monitor i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { beatsPhrase, buildRhythmLevel, emptyRhythmView, INSTRUMENT_NAMES, INSTRUMENTS, mergeRhythmMonitor, RHYTHM_MAX_LEVEL, rhythmRule, type RhythmView } from "@/app/components/games/data/rhythmLevels";
import { GAMES, getGame } from "@/lib/games";
import { isTogetherGame } from "@/lib/playTogether";
import { hasSharedBoard } from "@/lib/sharedPlay";
import { seededRandom } from "@/lib/seededRandom";
import { versusFormat } from "@/lib/versusFormat";

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const LEVELS = Array.from({ length: 15 }, (_, i) => i + 1);
const EMOJI = /\p{Extended_Pictographic}/u;
const WHERE_TO_TAP = /dodirni|pritisni|klikni|prevuci|dodirn|pritisn/i;

describe("rhythm levels", () => {
    it("has 15 levels: one drum, then two, then three instruments", () => {
        assert.equal(RHYTHM_MAX_LEVEL, 15);
        assert.deepEqual(LEVELS.map((l) => rhythmRule(l).instruments.length), [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3]);
        assert.deepEqual(rhythmRule(1).instruments, ["big"]);
        assert.deepEqual(rhythmRule(11).instruments, ["big", "small", "bell"]);
    });

    it("grows the number of beats inside each tier and hides the notation only at the end", () => {
        for (const tier of [[1, 5], [6, 10], [11, 13]]) {
            for (let l = tier[0] + 1; l <= tier[1]; l += 1) {
                assert.ok(rhythmRule(l).beats[0] >= rhythmRule(l - 1).beats[0], `najmanje ${l}`);
                assert.ok(rhythmRule(l).beats[1] >= rhythmRule(l - 1).beats[1], `najviše ${l}`);
                assert.ok(rhythmRule(l).tempo <= rhythmRule(l - 1).tempo, `takt ${l}`);
            }
        }
        assert.deepEqual(LEVELS.filter((l) => rhythmRule(l).hidden), [14, 15]);
        assert.ok(LEVELS.every((l) => rhythmRule(l).beats[1] <= 6 && rhythmRule(l).beats[0] >= 2));
    });

    it("builds rhythms that use every instrument of the level, never four of the same instrument in a row", () => {
        for (const level of LEVELS) {
            const rule = rhythmRule(level);
            for (let s = 0; s < 30; s += 1) {
                const plan = buildRhythmLevel(level, { maxRounds: 8, random: seededRandom(`r-${level}-${s}`) });
                assert.deepEqual(plan.instruments, rule.instruments);
                assert.equal(plan.hidden, rule.hidden);
                assert.equal(plan.rounds.length, rule.rounds);
                plan.rounds.forEach((pattern, i) => {
                    assert.ok(pattern.length >= rule.beats[0] && pattern.length <= rule.beats[1], `nivo ${level}: ${pattern.length}`);
                    assert.ok(rule.instruments.every((kind) => pattern.includes(kind)), `nivo ${level}: svi instrumenti`);
                    if (rule.instruments.length > 1) for (let k = 3; k < pattern.length; k += 1) assert.ok(!(pattern[k] === pattern[k - 1] && pattern[k] === pattern[k - 2] && pattern[k] === pattern[k - 3]));
                    const same = i > 0 && pattern.join() === plan.rounds[i - 1].join();
                    if (same) assert.ok(rule.instruments.length === 1 && rule.beats[0] === rule.beats[1], `nivo ${level}: isti ritam zaredom`);
                });
            }
        }
    });

    it("respects the parent's round limit (but plays at least two)", () => {
        assert.equal(buildRhythmLevel(9, { maxRounds: 3 }).rounds.length, 3);
        assert.equal(buildRhythmLevel(1, { maxRounds: 1 }).rounds.length, 2);
    });

    it("says the number of beats in proper Serbian", () => {
        assert.deepEqual([2, 3, 4, 5, 6].map(beatsPhrase), ["dva udarca", "tri udarca", "četiri udarca", "pet udaraca", "šest udaraca"]);
        for (const kind of INSTRUMENTS) assert.doesNotMatch(INSTRUMENT_NAMES[kind], EMOJI);
    });
});

describe("rhythm monitor state", () => {
    it("starts empty and drops anything unknown", () => {
        assert.equal(emptyRhythmView(3).totalRounds, 3);
        const merged = mergeRhythmMonitor({
            instruments: ["small", "big", "gitara"],
            pattern: ["big", "bell", "small", "big"],
            phase: "show",
            playing: 2,
            hit: "bell",
            entered: 7,
            hidden: true,
            revealed: "da",
            round: 2,
            totalRounds: 4,
        } as unknown as Partial<RhythmView>);
        assert.deepEqual(merged.instruments, ["big", "small"]);
        assert.deepEqual(merged.pattern, ["big", "small", "big"]);
        assert.equal(merged.phase, "show");
        assert.equal(merged.playing, 2);
        assert.equal(merged.hit, null);
        assert.equal(merged.entered, 3);
        assert.equal(merged.hidden, true);
        assert.equal(merged.revealed, false);
        assert.deepEqual(mergeRhythmMonitor(undefined), emptyRhythmView(1));
    });
});

describe("rhythm game", () => {
    const source = read("app/components/games/RhythmGame.tsx") + read("app/components/games/data/rhythmLevels.ts") + read("app/components/games/rhythm/RhythmArt.tsx");

    it("never says where to tap and draws no emoji", () => {
        const strings = source.match(/"[^"\n]*"|`[^`\n]*`/g) ?? [];
        for (const text of strings) assert.doesNotMatch(text, WHERE_TO_TAP, text);
        assert.doesNotMatch(read("app/components/games/RhythmGame.tsx") + read("app/components/games/rhythm/RhythmArt.tsx"), EMOJI);
    });

    it("plays the drums through the shared quiet synth and works without sound", () => {
        assert.match(source, /playDrum\(/);
        assert.match(source, /useTaskSound\(\)/);
        assert.match(source, /Zvuk je isključen: gledaj bubnjeve\./);
        assert.doesNotMatch(source, /new Audio|\.mp3|\.wav/);
    });

    it("never measures the timing of a tap", () => {
        assert.doesNotMatch(read("app/components/games/RhythmGame.tsx"), /performance\.now|Date\.now\(\)/);
    });

    it("has a key for every instrument on the shared board", () => {
        assert.match(source, /data-action=\{`drum:\$\{kind\}`\}/);
    });
});

describe("rhythm registry entry", () => {
    const game = getGame("rhythm");

    it("is activity 45, graded, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 45);
        assert.equal(game.title, "Ponovi ritam");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(ROOT, "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        assert.match(read("supabase/migrations/0026_calm_games.sql"), /\(45, 'Ponovi ritam', '[^']+', 'motor'/);
    });

    it("is played with a friend in turns, on one device and on the shared board", () => {
        assert.ok(isTogetherGame("rhythm"));
        assert.ok(hasSharedBoard("rhythm"));
        assert.equal(versusFormat("rhythm"), "turns");
    });
});
