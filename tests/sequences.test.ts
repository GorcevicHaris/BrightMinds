import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSequenceLevel, SEQUENCES, SEQUENCE_MAX_LEVEL, sequenceRule } from "@/app/components/games/data/sequences";
import { BAND_PRESETS } from "@/lib/childSettings";

const LEVELS = Array.from({ length: SEQUENCE_MAX_LEVEL }, (_, i) => i + 1);

describe("sequence game content", () => {
    it("has unique sequences of 2–5 steps, each step with its own picture and a sentence", () => {
        const ids = SEQUENCES.map((sequence) => sequence.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const sequence of SEQUENCES) {
            assert.ok(sequence.steps.length >= 2 && sequence.steps.length <= 5, sequence.id);
            const emoji = sequence.steps.map((step) => step.emoji);
            assert.equal(new Set(emoji).size, emoji.length, `${sequence.id}: repeated picture`);
            for (const step of sequence.steps) assert.match(step.text, /^[A-ZČĆŽŠĐ].*\.$/u, `${sequence.id}: ${step.text}`);
        }
    });

    it("writes steps without gendered past tense (same for boys and girls)", () => {
        for (const sequence of SEQUENCES) {
            for (const step of sequence.steps) assert.doesNotMatch(step.text, /\b\p{L}+(o|la) sam\b/u, `${sequence.id}: ${step.text}`);
        }
    });

    it("grows from two steps to five", () => {
        assert.equal(sequenceRule(1).steps, 2);
        assert.equal(sequenceRule(4).steps, 3);
        assert.equal(sequenceRule(7).steps, 4);
        assert.equal(sequenceRule(15).steps, 5);
    });

    for (const band of ["young", "middle", "older"] as const) {
        const { maxChoices } = BAND_PRESETS[band];
        it(`builds every level for the ${band} band without longer sequences than the band allows`, () => {
            for (const level of LEVELS) {
                const built = buildSequenceLevel(level, { maxSteps: maxChoices, random: () => 0.37 });
                assert.equal(built.length, sequenceRule(level).rounds, `level ${level}`);
                assert.equal(new Set(built.map((sequence) => sequence.id)).size, built.length, `level ${level}: repeated`);
                for (const sequence of built) assert.ok(sequence.steps.length <= Math.max(2, maxChoices), `level ${level}: ${sequence.id}`);
            }
        });
    }

    it("keeps the youngest band at three steps at most (picture sequencing of three is typical around age four)", () => {
        assert.equal(BAND_PRESETS.young.maxChoices, 3);
        for (const level of LEVELS) for (const sequence of buildSequenceLevel(level, { maxSteps: 3 })) assert.ok(sequence.steps.length <= 3);
    });
});
