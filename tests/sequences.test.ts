import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildSequenceLevel, hasTalk, SEQUENCES, SEQUENCE_MAX_LEVEL, sequenceRule } from "@/app/components/games/data/sequences";
import { DRAW_IDS, isArtFigure, type StepArtSpec } from "@/app/components/games/sequence/art";
import { hasDrawing } from "@/app/components/games/sequence/drawings";
import { hasBackground } from "@/app/components/games/scene/backgrounds";
import { hasProp } from "@/app/components/games/scene/props";
import { ADULT_IDS, LOOK_IDS } from "@/app/components/games/scene/types";
import { BAND_PRESETS } from "@/lib/childSettings";

const LEVELS = Array.from({ length: SEQUENCE_MAX_LEVEL }, (_, i) => i + 1);

/** Svi predmeti i crteži jedne slike (i oni u rukama) */
function parts(spec: StepArtSpec) {
    const props: string[] = [];
    const draws: string[] = [];
    const people: string[] = [];
    for (const item of spec.items) {
        if (isArtFigure(item)) {
            people.push(item.f);
            if (item.hold?.p) props.push(item.hold.p);
            if (item.hold?.d) draws.push(item.hold.d);
        } else {
            if (item.p) props.push(item.p);
            if (item.d) draws.push(item.d);
        }
    }
    return { props, draws, people };
}

describe("sequence game content", () => {
    it("has unique sequences of 2–5 steps, each step with a sentence and its own picture", () => {
        const ids = SEQUENCES.map((sequence) => sequence.id);
        assert.equal(new Set(ids).size, ids.length);
        for (const sequence of SEQUENCES) {
            assert.ok(sequence.steps.length >= 2 && sequence.steps.length <= 5, sequence.id);
            // U istom nizu nema dve iste slike: svaki korak se vidi drugačije
            const pictures = sequence.steps.map((step) => JSON.stringify(step.art));
            assert.equal(new Set(pictures).size, pictures.length, `${sequence.id}: repeated picture`);
            for (const step of sequence.steps) {
                assert.match(step.text, /^[A-ZČĆŽŠĐ].*(\.|[.!?]”)$/u, `${sequence.id}: ${step.text}`);
                assert.ok(step.art.items.length > 0, `${sequence.id}: ${step.text} has no picture`);
            }
        }
    });

    it("has enough everyday sequences of every length for all fifteen levels", () => {
        const count = (length: number) => SEQUENCES.filter((sequence) => sequence.steps.length === length).length;
        assert.ok(count(2) >= 8 && count(3) >= 10 && count(4) >= 8 && count(5) >= 5, `${count(2)}/${count(3)}/${count(4)}/${count(5)}`);
        assert.ok(SEQUENCES.length >= 38);
        for (const id of ["wash-hands", "teeth", "sandwich", "plant", "winter", "sleep", "dishes", "snowman", "cookies", "street"]) assert.ok(SEQUENCES.some((sequence) => sequence.id === id), id);
    });

    it("draws every picture from existing parts", () => {
        const people = new Set<string>(["me", ...LOOK_IDS, ...ADULT_IDS]);
        const used = new Set<string>();
        for (const sequence of SEQUENCES) {
            for (const step of sequence.steps) {
                assert.ok(hasBackground(step.art.bg), `${sequence.id}: ${step.art.bg}`);
                const { props, draws, people: who } = parts(step.art);
                for (const prop of props) assert.ok(hasProp(prop), `${sequence.id}: prop ${prop}`);
                for (const draw of draws) {
                    assert.ok(hasDrawing(draw), `${sequence.id}: drawing ${draw}`);
                    used.add(draw);
                }
                for (const person of who) assert.ok(people.has(person), `${sequence.id}: ${person}`);
            }
        }
        // Svaki crtež iz ove igre se negde koristi (nema mrtvih crteža)
        for (const id of DRAW_IDS) assert.ok(used.has(id), `unused drawing ${id}`);
    });

    it("writes steps without gendered past tense (same for boys and girls)", () => {
        for (const sequence of SEQUENCES) {
            for (const step of sequence.steps) assert.doesNotMatch(step.text, /\b\p{L}+(o|la) sam\b/u, `${sequence.id}: ${step.text}`);
        }
    });

    it("keeps short words (se, ga, mu, me, je) in second place when a step is retold after „prvo / zatim”", () => {
        // „Probudim se.” → „Prvo se probudim”, ne „Prvo probudim se”
        for (const sequence of SEQUENCES) {
            for (const step of sequence.steps) {
                const second = step.text.replace(/\.$/, "").split(/\s+/)[1];
                if (["se", "ga", "mu", "me", "mi", "je"].includes(second ?? "")) {
                    assert.ok(step.retell, `${sequence.id}: „${step.text}” needs a retell form`);
                    assert.ok(step.retell.startsWith(second + " "), `${sequence.id}: „${step.retell}”`);
                }
            }
        }
    });

    it("never tells the child where to tap and writes in Ekavian", () => {
        for (const sequence of SEQUENCES) {
            for (const text of [sequence.title, ...sequence.steps.map((step) => step.text)]) {
                assert.doesNotMatch(text, /\b(levo|desno|gore|dole|dodirni|klikni|pritisni)\b/iu, text);
                assert.doesNotMatch(text, /(lijep|mjest|bijel|dijete|cvijet|vrijeme|prije|poslije|dvije|sjed)/u, text);
            }
        }
    });
});

describe("communication inside routines", () => {
    it("has at least six routines with a step where the child says a short sentence, of every length", () => {
        const talking = SEQUENCES.filter(hasTalk);
        assert.ok(talking.length >= 6, `${talking.length}`);
        assert.deepEqual(new Set(talking.map((sequence) => sequence.steps.length)), new Set([2, 3, 4, 5]));
        for (const sequence of talking) {
            for (const step of sequence.steps.filter((item) => item.say)) {
                // Rečenica je u navodnicima u tekstu koraka (glas je pročita), a na slici dete govori (oblačić)
                assert.ok(step.text.endsWith(`„${step.say}”`), `${sequence.id}: ${step.text}`);
                assert.match(step.say!, /^[A-ZČĆŽŠĐ].*[.!?]$/u, step.say);
                assert.ok(step.say!.split(/\s+/).length <= 7, `${sequence.id}: the script is short`);
                assert.ok(step.art.items.some((item) => !isArtFigure(item) && item.d === "talk"), `${sequence.id}: no speech bubble`);
            }
        }
        // Konkretne rečenice iz svakodnevice
        const scripts = talking.flatMap((sequence) => sequence.steps.map((step) => step.say).filter(Boolean));
        for (const script of ["Dobro jutro!", "Molim vas, jedan hleb.", "Boli me ovde.", "Hvala!"]) assert.ok(scripts.includes(script), script);
    });

    it("puts a routine with a sentence to say in every level, for every age band", () => {
        for (const band of ["young", "middle", "older"] as const) {
            for (const level of LEVELS) {
                for (const seed of [0.13, 0.5, 0.91]) {
                    const built = buildSequenceLevel(level, { maxSteps: BAND_PRESETS[band].maxChoices, random: () => seed });
                    assert.ok(built.some(hasTalk), `${band}, level ${level}`);
                }
            }
        }
    });
});

describe("sequence game levels", () => {
    it("grows from two steps to five and fades the support: shadow → model → none → no captions", () => {
        assert.deepEqual(sequenceRule(1).steps, [2]);
        assert.ok(sequenceRule(1).ghost && !sequenceRule(1).model);
        assert.ok(sequenceRule(2).model && sequenceRule(2).ghost, "first step given as a model, with a shadow");
        assert.ok(!sequenceRule(3).ghost && !sequenceRule(3).model);
        assert.ok(sequenceRule(4).model && !sequenceRule(4).ghost);
        assert.deepEqual(sequenceRule(7).steps, [4]);
        assert.ok(sequenceRule(7).model, "a new length starts with a model");
        assert.deepEqual(sequenceRule(11).steps, [5]);
        assert.ok(sequenceRule(11).model);
        assert.ok(!sequenceRule(14).captions && !sequenceRule(15).captions);
        assert.deepEqual([...sequenceRule(15).steps], [4, 5]);
        // Senka samo na početku; pomoć se ne vraća posle bez razloga
        assert.ok(LEVELS.filter((level) => sequenceRule(level).ghost).every((level) => level <= 2));
        assert.equal(sequenceRule(0), sequenceRule(1));
        assert.equal(sequenceRule(99), sequenceRule(15));
    });

    it("makes every level different from the one before (length, support, rounds or captions)", () => {
        for (const level of LEVELS.slice(1)) {
            const a = sequenceRule(level - 1);
            const b = sequenceRule(level);
            assert.notDeepEqual({ ...a, level: 0 }, { ...b, level: 0 }, `level ${level} repeats level ${level - 1}`);
        }
        // Najduži niz nikad ne postaje kraći kako nivo raste
        for (const level of LEVELS.slice(1)) assert.ok(Math.max(...sequenceRule(level).steps) >= Math.max(...sequenceRule(level - 1).steps) || level === 3 || level === 6, `level ${level}`);
    });

    for (const band of ["young", "middle", "older"] as const) {
        const { maxChoices } = BAND_PRESETS[band];
        it(`builds every level for the ${band} band without longer sequences than the band allows`, () => {
            for (const level of LEVELS) {
                for (const seed of [0.11, 0.37, 0.83]) {
                    const built = buildSequenceLevel(level, { maxSteps: maxChoices, random: () => seed });
                    assert.equal(built.length, sequenceRule(level).rounds, `level ${level}`);
                    assert.equal(new Set(built.map((sequence) => sequence.id)).size, built.length, `level ${level}: repeated`);
                    for (const sequence of built) assert.ok(sequence.steps.length <= Math.max(2, maxChoices), `level ${level}: ${sequence.id}`);
                }
            }
        });
    }

    it("mixes four and five steps on the last level", () => {
        const built = buildSequenceLevel(15, { maxSteps: 6, random: () => 0.5 });
        assert.deepEqual(new Set(built.map((sequence) => sequence.steps.length)), new Set([4, 5]));
    });

    it("keeps the youngest band at three steps at most (picture sequencing of three is typical around age four)", () => {
        assert.equal(BAND_PRESETS.young.maxChoices, 3);
        for (const level of LEVELS) for (const sequence of buildSequenceLevel(level, { maxSteps: 3 })) assert.ok(sequence.steps.length <= 3);
    });
});
