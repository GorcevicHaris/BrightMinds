import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildUsesLevel, getUseItem, itIs, mergeUsesMonitor, USE_ITEMS, USES_MAX_LEVEL, usesRule } from "@/app/components/games/data/usesItems";
import { isPictureId } from "@/app/components/games/pictures";
import { BAND_PRESETS } from "@/lib/childSettings";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: USES_MAX_LEVEL }, (_, i) => i + 1);

describe("uses game content", () => {
    it("has unique items, each with its own picture, a question and an answer sentence", () => {
        assert.equal(new Set(USE_ITEMS.map((item) => item.id)).size, USE_ITEMS.length);
        assert.equal(new Set(USE_ITEMS.map((item) => item.pic)).size, USE_ITEMS.length, "repeated picture");
        for (const item of USE_ITEMS) {
            assert.match(item.name, /^[A-ZČĆŽŠĐ][a-zčćžšđ]+$/u, item.id);
            assert.match(item.question, /^[A-ZČĆŽŠĐ].*\?$/u, item.id);
            assert.match(item.answer, /^[A-ZČĆŽŠĐ].*\.$/u, item.id);
            assert.ok(isPictureId(item.pic), `${item.id}: ${item.pic} is not drawn`);
        }
    });

    it("never names the answer (or any other picture of the group) in the question", () => {
        for (const item of USE_ITEMS) {
            const question = item.question.toLocaleLowerCase("sr");
            for (const other of USE_ITEMS.filter((candidate) => candidate.group === item.group)) {
                const stem = other.name.toLocaleLowerCase("sr").slice(0, 4);
                assert.ok(!question.includes(stem), `${item.id}: „${item.question}” names ${other.name}`);
            }
        }
    });

    it("answers in the case the question asks for", () => {
        // „Čime …?” → instrumental (olovkom, ključem, makazama, očima, ušima)
        for (const item of USE_ITEMS.filter((candidate) => candidate.question.startsWith("Čime"))) {
            assert.match(item.answer, /\p{L}+(om|em|ama|ima|ma)\b/u, `${item.id}: ${item.answer}`);
        }
        assert.equal(getUseItem("pencil")!.answer, "Pišemo olovkom.");
        assert.equal(getUseItem("scissors")!.answer, "Papir sečemo makazama.");
        assert.equal(getUseItem("ear")!.answer, "Slušamo ušima.");
        assert.equal(getUseItem("eyes")!.answer, "Gledamo očima.");
        assert.equal(getUseItem("mouth")!.answer, "Pričamo ustima.");
        assert.equal(getUseItem("hammer")!.answer, "Ekser zakucavamo čekićem.");
        // „U čemu / Na čemu / Iz čega …?” → lokativ ili genitiv
        assert.equal(getUseItem("bathtub")!.answer, "Kupamo se u kadi.");
        assert.equal(getUseItem("bed")!.answer, "Spavamo na krevetu.");
        assert.equal(getUseItem("glass")!.answer, "Vodu pijemo iz čaše.");
        // Akuzativ posle prelaznog glagola
        assert.equal(getUseItem("cap")!.answer, "Kapu stavljamo na glavu.");
        assert.equal(getUseItem("snowman")!.answer, "Od snega pravimo Sneška.");
    });

    it("keeps short words (se, nas, nam) in second place", () => {
        for (const item of USE_ITEMS) {
            for (const sentence of [item.question, item.answer]) {
                const words = sentence.replace(/[.?]$/, "").split(/\s+/);
                const conjunctions = ["i", "kad", "da"];
                words.forEach((word, i) => {
                    if (!["se", "nas", "nam"].includes(word)) return;
                    // U zavisnoj ili naporednoj rečenici („…kad se pozdravljamo”, „…i greje nas”) broji se od veznika
                    const start = words.slice(0, i).findLastIndex((other) => conjunctions.includes(other));
                    if (start >= 0) {
                        assert.ok(i - start <= 2, `${item.id}: „${sentence}”`);
                        return;
                    }
                    // Prvo mesto može biti cela predloška fraza („U čemu se kupamo?”)
                    const first = ["u", "na", "iz", "od"].includes(words[0].toLocaleLowerCase("sr")) ? 2 : 1;
                    assert.equal(i, first, `${item.id}: „${sentence}”`);
                });
            }
        }
    });

    it("says „To su” for plural-only nouns and „To je” otherwise", () => {
        assert.equal(itIs(getUseItem("scissors")!), "To su makaze.");
        assert.equal(itIs(getUseItem("glasses")!), "To su naočare.");
        assert.equal(itIs(getUseItem("eyes")!), "To su oči.");
        assert.equal(itIs(getUseItem("mouth")!), "To su usta.");
        assert.equal(itIs(getUseItem("cap")!), "To je kapa.");
        assert.equal(itIs(getUseItem("ear")!), "To je uvo.");
        for (const item of USE_ITEMS) if (/e$|i$/.test(item.name) && item.plural) assert.match(itIs(item), /^To su /, item.id);
    });

    it("writes everything in Ekavian (no ije/je forms)", () => {
        for (const item of USE_ITEMS) {
            for (const text of [item.question, item.answer]) assert.doesNotMatch(text, /cvije|mlijek|snijeg|svjetl|lijep|vrijem|bijel|djec|mjes/u, `${item.id}: ${text}`);
        }
    });

    it("goes from everyday objects to body parts to features, with more pictures later", () => {
        assert.deepEqual([...usesRule(1).groups], ["home"]);
        assert.equal(usesRule(1).choices, 2);
        assert.equal(usesRule(3).choices, 3);
        assert.deepEqual([...usesRule(6).groups], ["body"]);
        assert.ok(usesRule(11).groups.includes("animals"));
        assert.equal(usesRule(11).choices, 4);
        assert.equal(usesRule(15).groups.length, 5);
    });

    for (const band of ["young", "middle", "older"] as const) {
        const { maxChoices, maxRounds } = BAND_PRESETS[band];
        it(`builds every level for the ${band} band: one right answer, distractors from the same group, no repeats`, () => {
            for (const level of LEVELS) {
                const rule = usesRule(level);
                for (const seed of [1, 7, 42, 99]) {
                    const rounds = buildUsesLevel(level, { maxChoices, maxRounds, random: seeded(seed + level) });
                    assert.equal(rounds.length, Math.min(rule.rounds, maxRounds), `level ${level}: rounds`);
                    assert.equal(new Set(rounds.map((round) => round.itemId)).size, rounds.length, `level ${level}: repeated question`);
                    for (const round of rounds) {
                        const item = getUseItem(round.itemId)!;
                        assert.ok(rule.groups.includes(item.group), `level ${level}: ${item.id}`);
                        assert.equal(round.choices.length, Math.min(rule.choices, Math.max(2, maxChoices)), `level ${level}: choices`);
                        assert.equal(new Set(round.choices).size, round.choices.length, `level ${level}: repeated picture`);
                        assert.equal(round.choices.filter((id) => id === item.id).length, 1);
                        for (const id of round.choices) {
                            const other = getUseItem(id)!;
                            assert.equal(other.group, item.group, `level ${level}: ${id} with ${item.id}`);
                            if (id !== item.id) assert.ok(!item.alsoFits?.includes(id) && !other.alsoFits?.includes(item.id), `level ${level}: ${id} also fits ${item.id}`);
                        }
                    }
                    // Mešani nivoi: zastupljena je više od jedne grupe
                    if (rule.groups.length > 1) assert.ok(new Set(rounds.map((round) => getUseItem(round.itemId)!.group)).size > 1, `level ${level}: one group only`);
                }
            }
        });
    }

    it("never offers „usta” with the teeth question (both would fit)", () => {
        for (let seed = 1; seed < 40; seed += 1) {
            for (const round of buildUsesLevel(9, { maxChoices: 4, maxRounds: 8, random: seeded(seed) })) {
                if (round.itemId === "teeth") assert.ok(!round.choices.includes("mouth"));
            }
        }
    });
});

describe("uses game live monitor state", () => {
    it("returns an empty board for missing or garbage state", () => {
        for (const state of [null, undefined, {}, { itemId: "unicorn", choices: ["unicorn"] }, { itemId: "pencil", choices: "pencil" }] as const) {
            const view = mergeUsesMonitor(state as never);
            assert.equal(view.itemId, "");
            assert.deepEqual(view.choices, []);
            assert.equal(view.totalRounds, 1);
        }
    });

    it("keeps known pictures only, and wrong picks only from the board", () => {
        const view = mergeUsesMonitor({
            itemId: "pencil",
            choices: ["pencil", "spoon", "unicorn", "spoon"],
            wrong: ["spoon", "key", "pencil"],
            picked: "spoon",
            feedback: "wrong",
            round: 3,
            totalRounds: 5,
            promptedCount: Number.NaN,
        });
        assert.deepEqual(view.choices, ["pencil", "spoon"]);
        assert.deepEqual(view.wrong, ["spoon"]);
        assert.equal(view.picked, "spoon");
        assert.equal(view.round, 3);
        assert.equal(view.promptedCount, 0);
    });
});
