// Sadržaj igara o svetu oko nas: pravila koja važe samo za pojedinu igru (suprotnosti, zanimanja,
// staništa, godišnja doba, telo, saobraćaj). Zajednička pravila su u tests/worldGames.test.ts, a
// slogovi u tests/syllables.test.ts.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BODY_LEVELS, PARTS, SENSES, SENSE_THINGS, WEARABLES, buildBodyLevel, thisIs, whereQuestion, type PartId } from "@/app/components/games/data/bodyLevels";
import { ANIMALS, HABITATS, HABITAT_IDS, HOMES, animalsOf, buildHabitatsLevel, livesSentence } from "@/app/components/games/data/habitatsLevels";
import { JOBS, SITUATIONS, belongsTo, buildJobsLevel, jobsLevel, ownerOf, workerQuestion } from "@/app/components/games/data/jobsLevels";
import { CONCEPTS, EXEMPLARS, buildOppositesLevel, exemplarsOf, familyOf, oppositesLevel } from "@/app/components/games/data/oppositesLevels";
import { MONTHS, SEASONS, SEASON_IDS, buildSeasonsLevel, nextSeason, seasonOfMonth } from "@/app/components/games/data/seasonsLevels";
import { SCENARIOS, SIGNS, STEPS_4, buildTrafficLevel } from "@/app/components/games/data/trafficLevels";
import type { WorldRound } from "@/app/components/games/world/worldPlay";
import { MAX_LEVEL } from "@/lib/games";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const opts = (seed: number, maxChoices = 4) => {
    let x = seed;
    return {
        maxRounds: 8,
        maxChoices,
        random: () => {
            x = (x * 1103515245 + 12345) % 2147483648;
            return x / 2147483648;
        },
    };
};

function eachPlan(build: (level: number, o: ReturnType<typeof opts>) => WorldRound[], check: (round: WorldRound, level: number) => void) {
    for (const level of LEVELS) for (const seed of [2, 5, 17, 40]) for (const round of build(level, opts(seed * 13 + level))) check(round, level);
}

describe("Suprotnosti", () => {
    it("gives every concept at least three examples, each side its own picture", () => {
        for (const id of Object.keys(CONCEPTS) as (keyof typeof CONCEPTS)[]) assert.ok(exemplarsOf(id).length >= 3, id);
        assert.equal(new Set(EXEMPLARS.map((e) => e.id)).size, EXEMPLARS.length);
        for (const e of EXEMPLARS) assert.notEqual(e.a.pic, e.b.pic, e.id);
    });

    it("first asks about one thing on two pictures (a minimal pair), never two different things", () => {
        eachPlan(buildOppositesLevel, (round, level) => {
            if (round.kind !== "pick" || round.style !== "pic" || round.cue) return;
            const ids = round.choices.map((c) => c.id.split(".")[0]);
            assert.equal(new Set(ids).size, 1, `nivo ${level}: ${round.prompt}`);
        });
    });

    it("never offers a 'far' choice from the same family (a small hedgehog is not the opposite of a big ball)", () => {
        eachPlan(buildOppositesLevel, (round, level) => {
            if (round.kind !== "pick" || !round.cue || round.style !== "pic") return;
            const cue = EXEMPLARS.find((e) => e.id === round.cue!.id.split(".")[0])!;
            for (const choice of round.choices) {
                const e = EXEMPLARS.find((x) => x.id === choice.id.split(".")[0])!;
                if (e.concept !== cue.concept) assert.notEqual(familyOf(e.concept), familyOf(cue.concept), `nivo ${level}: ${choice.id}`);
            }
        });
    });

    it("pairs only things from different families, so each picture has exactly one opposite", () => {
        eachPlan(buildOppositesLevel, (round) => {
            if (round.kind !== "sort" || !round.prompt.startsWith("Svaka slika traži")) return;
            const families = round.bins.map((b) => familyOf(EXEMPLARS.find((e) => e.id === b.id.split(".")[0])!.concept));
            assert.equal(new Set(families).size, families.length);
        });
    });

    it("moves from two choices on easy levels to four, and from pictures to words", () => {
        assert.ok(oppositesLevel(1).choices === 2 && oppositesLevel(1).kinds.includes("identify"));
        assert.ok(oppositesLevel(14).kinds.includes("word"));
        assert.ok(oppositesLevel(15).choices === 4);
    });
});

describe("Ko šta radi?", () => {
    it("gives every worker a name, three own tools, a place and three clues", () => {
        const tools = JOBS.flatMap((j) => j.tools.map((t) => t.id));
        assert.equal(new Set(tools).size, tools.length, "svaki alat pripada samo jednom radniku");
        assert.equal(new Set(JOBS.map((j) => j.name)).size, JOBS.length);
        for (const job of JOBS) {
            assert.equal(job.tools.length, 3);
            assert.equal(job.clues.length, 3);
            for (const t of job.tools) assert.equal(ownerOf(t).id, job.id);
        }
        for (const s of SITUATIONS) assert.ok(JOBS.some((j) => j.id === s.helper), s.id);
    });

    it("asks in good Serbian: who uses the whistle, who heals the kitten", () => {
        const whistle = JOBS.find((j) => j.id === "police")!.tools.find((t) => t.id === "whistle")!;
        assert.equal(workerQuestion(whistle), "Ko koristi pištaljku?");
        const kitten = JOBS.find((j) => j.id === "vet")!.tools.find((t) => t.id === "kitten")!;
        assert.equal(workerQuestion(kitten), "Ko leči mače?");
        assert.equal(belongsTo(whistle), "Policajac pištaljkom zaustavlja saobraćaj.");
        const bread = JOBS.find((j) => j.id === "baker")!.tools.find((t) => t.id === "bread")!;
        assert.equal(workerQuestion(bread), "Ko peče hleb?");
    });

    it("keeps similar workers apart until the hard levels", () => {
        eachPlan(buildJobsLevel, (round, level) => {
            if (jobsLevel(level).close || round.kind !== "pick") return;
            const workers = round.choices.map((c) => JOBS.find((j) => j.id === c.id)).filter((j) => j !== undefined);
            if (workers.length < 2) return;
            assert.equal(new Set(workers.map((j) => j!.group)).size, workers.length, `nivo ${level}: ${round.prompt}`);
        });
    });
});

describe("Ko gde živi?", () => {
    it("puts every animal in exactly one habitat, with at least three animals per habitat", () => {
        assert.equal(new Set(ANIMALS.map((a) => a.id)).size, ANIMALS.length);
        for (const id of HABITAT_IDS) assert.ok(animalsOf(id).length >= 3, id);
        assert.equal(livesSentence(ANIMALS.find((a) => a.id === "penguin")!), "Pingvin živi na ledu i snegu.");
        // Lav, žirafa, slon i zebra žive u savani, a ne u džungli
        for (const id of ["lion", "giraffe", "elephant", "zebra"]) assert.equal(ANIMALS.find((a) => a.id === id)!.home, "savanna", id);
        assert.equal(new Set(HOMES.map((h) => h.animal.id)).size, HOMES.length);
        assert.ok(Object.values(HABITATS).every((h) => h.at.length > 0));
    });

    it("asks about an odd one out only with one animal that does not belong", () => {
        eachPlan(buildHabitatsLevel, (round) => {
            if (round.kind !== "pick" || !round.prompt.startsWith("Ko ne živi")) return;
            const place = round.cue!.id;
            const strangers = round.choices.filter((c) => ANIMALS.find((a) => a.id === c.id)!.home !== place);
            assert.deepEqual(strangers.map((c) => c.id), [round.answer]);
        });
    });
});

describe("Godišnja doba", () => {
    it("has three months in every season and goes around the year in order", () => {
        for (const id of SEASON_IDS) assert.equal(SEASONS[id].months.length, 3);
        assert.deepEqual(
            Array.from({ length: 12 }, (_, i) => seasonOfMonth(i + 1)),
            ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"]
        );
        assert.deepEqual(SEASON_IDS.map(nextSeason), ["summer", "autumn", "winter", "spring"]);
        assert.equal(MONTHS.length, 12);
    });

    it("orders the seasons around the year from the given one", () => {
        eachPlan(buildSeasonsLevel, (round) => {
            if (round.kind !== "order" || !round.prompt.startsWith("Godišnja doba")) return;
            for (let i = 1; i < round.sequence.length; i++) assert.equal(round.sequence[i], nextSeason(round.sequence[i - 1] as (typeof SEASON_IDS)[number]));
        });
    });
});

describe("Moje telo", () => {
    it("never asks about arms and hands (or legs and feet) on the same level", () => {
        for (const rule of BODY_LEVELS) {
            assert.ok(!(rule.body.includes("arms") && rule.body.includes("hands")), "ruke i šake");
            assert.ok(!(rule.body.includes("legs") && (rule.body.includes("feet") || rule.body.includes("knees"))), "noge i stopala");
        }
    });

    it("asks in good Serbian: where is the nose, where are the eyes", () => {
        assert.equal(whereQuestion("nose"), "Gde je nos?");
        assert.equal(whereQuestion("eyes"), "Gde su oči?");
        assert.equal(thisIs("ears"), "To su uši.");
        for (const sense of Object.values(SENSES)) assert.ok(PARTS[sense.part], sense.id);
        for (const thing of SENSE_THINGS) assert.ok(SENSES[thing.sense], thing.id);
        for (const w of WEARABLES) assert.ok(PARTS[w.part as PartId], w.id);
    });

    it("points only at parts of the drawing the task is about", () => {
        eachPlan(buildBodyLevel, (round) => {
            if (round.kind !== "point") return;
            for (const part of round.parts) assert.equal(PARTS[part as PartId].figure, round.figure, part);
        });
    });
});

describe("Saobraćaj", () => {
    it("shows each safety situation twice, safe and not safe, as two different pictures", () => {
        for (const s of SCENARIOS) assert.notEqual(s.safe.pic, s.unsafe.pic, s.id);
        assert.equal(new Set(SIGNS.map((s) => s.id)).size, SIGNS.length);
        assert.deepEqual([...STEPS_4], ["stepStop", "stepLeft", "stepRight", "stepCross"]);
    });

    it("says the rule the same way every time: red — we stop, green — we go", () => {
        eachPlan(buildTrafficLevel, (round) => {
            if (round.kind === "pick" && round.prompt.startsWith("Pešački semafor")) {
                const red = round.prompt.includes("crven");
                assert.equal(round.answer, red ? "stop" : "go");
                assert.match(round.why, red ? /^Crveno svetlo: stojimo/ : /^Zeleno svetlo/);
            }
            if (round.kind === "wait") assert.ok(round.scene === "light" || round.scene === "zebra");
            if (round.kind === "sort") assert.deepEqual(round.bins.map((b) => b.id), ["safe", "unsafe"]);
            if (round.kind === "pick" && round.prompt === "Koja slika je bezbedna?") {
                assert.ok(round.answer.endsWith(".safe"));
                assert.equal(round.choices.filter((c) => c.id.endsWith(".safe")).length, 1);
            }
        });
    });
});
