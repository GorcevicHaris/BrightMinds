// Sadržaj igara (app/components/games/data/*.ts): pravila koja moraju da važe za svaki nivo
// i provera da se sav tekst za dete može prikazati ćirilicom.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    EMOTIONS,
    getEmotionLevel,
    getScenario,
    inEmotionOrder,
    isNamesake,
    questionFor,
    type EmotionId,
    type EmotionScenario,
} from "@/app/components/games/data/emotionScenarios";
import { getSituation, getSituationsForLevel, type SocialSituation } from "@/app/components/games/data/socialSituations";
import { decisionCount, storyForLevel, type Story, type StoryDecision } from "@/app/components/games/data/socialStories";
import { genderText, offeredOptions } from "@/app/components/games/kit/utils";
import { BAND_PRESETS } from "@/lib/childSettings";
import { MAX_LEVEL } from "@/lib/games";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1);
const EMOTION_IDS = Object.keys(EMOTIONS) as EmotionId[];
const GENDER_PAIR = /\{[^{}|]*\|[^{}|]*\}/;

const isUnique = (values: readonly unknown[]) => new Set(values).size === values.length;
const filled = (text: string) => text.trim().length > 0;

/** Indeksi izbora koji pomažu: bar jedan, bez ponavljanja, svi unutar spiska izbora. */
function assertValidIndexes(acceptable: readonly number[], optionCount: number, where: string): void {
    assert.ok(acceptable.length >= 1, `${where}: no helpful choice`);
    assert.ok(isUnique(acceptable), `${where}: repeated index`);
    for (const index of acceptable) {
        assert.ok(Number.isInteger(index) && index >= 0 && index < optionCount, `${where}: index ${index} of ${optionCount}`);
    }
}

// ── Šta reći? ─────────────────────────────────────────────────────────────

const SITUATIONS: { level: number; situation: SocialSituation }[] = LEVELS.flatMap((level) =>
    getSituationsForLevel(level).map((situation) => ({ level, situation }))
);

describe("social situations", () => {
    it("has four situations on every level from 1 to 15", () => {
        for (const level of LEVELS) assert.equal(getSituationsForLevel(level).length, 4, `level ${level}`);
    });

    it("gives all 60 situations a unique id that getSituation can look up", () => {
        assert.equal(SITUATIONS.length, 60);
        assert.ok(isUnique(SITUATIONS.map(({ situation }) => situation.id)));
        for (const { situation } of SITUATIONS) assert.equal(getSituation(situation.id), situation);
        assert.equal(getSituation(0), undefined);
        assert.equal(getSituation(61), undefined);
    });

    it("marks only valid, unique option indexes as helpful", () => {
        for (const { situation } of SITUATIONS) {
            assertValidIndexes(situation.acceptable, situation.options.length, `situation ${situation.id}`);
        }
    });

    it("always offers at least one helpful and one less helpful choice", () => {
        for (const { situation } of SITUATIONS) {
            assert.ok(situation.acceptable.length < situation.options.length, `situation ${situation.id}`);
        }
    });

    it("offers 2 choices on easy, 3 on medium and 4 on hard levels for the repeated situations", () => {
        for (const { level, situation } of SITUATIONS) {
            if (situation.id > 45) continue;
            const expected = level <= 5 ? 2 : level <= 10 ? 3 : 4;
            assert.equal(situation.options.length, expected, `situation ${situation.id} on level ${level}`);
        }
    });

    it("puts one self-advocacy situation second on every level", () => {
        for (const level of LEVELS) {
            const second = getSituationsForLevel(level)[1];
            assert.equal(second.kind, "advocacy", `level ${level}`);
            assert.ok(second.id >= 46 && second.id <= 60, `level ${level}`);
        }
    });

    it("fills in every text a child sees or hears", () => {
        for (const { situation } of SITUATIONS) {
            const where = `situation ${situation.id}`;
            for (const text of [situation.scene, situation.model, situation.text, situation.ask, situation.script]) {
                assert.ok(filled(text), where);
            }
            for (const option of situation.options) {
                assert.ok(filled(option.emoji) && filled(option.text) && filled(option.note), where);
                assert.ok(option.type === "say" || option.type === "do", where);
            }
        }
    });

    it("offers the sentence to repeat as one of the helpful things to say", () => {
        for (const { situation } of SITUATIONS) {
            const helpfulSayings = situation.acceptable
                .map((index) => situation.options[index])
                .filter((option) => option.type === "say")
                .map((option) => option.text);
            assert.ok(helpfulSayings.includes(situation.script), `situation ${situation.id}: "${situation.script}"`);
        }
    });

    it("gives an example in the model that is not the answer itself, so the child does not just copy it", () => {
        const plain = (text: string) =>
            text
                .toLocaleLowerCase("sr")
                .replace(/[^\p{L}\s]/gu, "")
                .replace(/\s+/g, " ")
                .trim();
        for (const { situation } of SITUATIONS) {
            const quotes = [...situation.model.matchAll(/„([^”]+)”/g)].map((match) => plain(match[1]));
            assert.ok(quotes.length > 0, `situation ${situation.id}: the model has no example sentence`);
            const answers = [situation.script, ...situation.options.map((option) => option.text)].flatMap((text) =>
                [false, true].map((female) => plain(genderText(text, female)))
            );
            for (const quote of quotes) assert.ok(!answers.includes(quote), `situation ${situation.id}: example „${quote}” is an answer`);
        }
    });

    it("writes the question without a gendered form, because it is shown as it is", () => {
        for (const { situation } of SITUATIONS) assert.doesNotMatch(situation.ask, /[{}|]/, `situation ${situation.id}`);
    });

    it("clamps a level outside 1–15 to the nearest level", () => {
        assert.equal(getSituationsForLevel(0), getSituationsForLevel(1));
        assert.equal(getSituationsForLevel(-5), getSituationsForLevel(1));
        assert.equal(getSituationsForLevel(99), getSituationsForLevel(15));
        assert.equal(getSituationsForLevel(Number.NaN), getSituationsForLevel(1));
    });
});

// ── Socijalne priče ───────────────────────────────────────────────────────────

const STORIES: { level: number; story: Story }[] = LEVELS.map((level) => ({ level, story: storyForLevel(level) }));
const DECISIONS: { where: string; decision: StoryDecision }[] = STORIES.flatMap(({ level, story }) =>
    story.steps.flatMap((step, index) => (step.decision ? [{ where: `story ${level}, step ${index + 1}`, decision: step.decision }] : []))
);

describe("social stories", () => {
    it("has a different story for every level from 1 to 15", () => {
        assert.ok(isUnique(STORIES.map(({ story }) => story)));
        assert.ok(isUnique(STORIES.map(({ story }) => story.title)));
    });

    it("has 4 steps on levels 1–5, 4–5 on levels 6–10 and 6 on levels 11–15", () => {
        for (const { level, story } of STORIES) {
            const steps = story.steps.length;
            if (level <= 5) assert.equal(steps, 4, `level ${level}`);
            else if (level <= 10) assert.ok(steps === 4 || steps === 5, `level ${level}: ${steps}`);
            else assert.equal(steps, 6, `level ${level}`);
        }
    });

    it("offers two less helpful choices from level 6 on, so later stories ask for more", () => {
        for (const { level, story } of STORIES) {
            for (const step of story.steps) {
                if (!step.decision) continue;
                const others = step.decision.options.length - step.decision.acceptable.length;
                if (level >= 6) assert.equal(others, 2, `level ${level}: ${step.decision.question}`);
                else assert.equal(others, 1, `level ${level}: ${step.decision.question}`);
            }
        }
    });

    it("has at least two decisions in every story, so a level can be scored", () => {
        for (const { level, story } of STORIES) {
            assert.ok(decisionCount(story) >= 2, `level ${level}`);
            assert.equal(decisionCount(story), story.steps.filter((step) => step.decision !== undefined).length);
        }
    });

    it("marks only valid, unique option indexes as helpful", () => {
        assert.ok(DECISIONS.length > 0);
        for (const { where, decision } of DECISIONS) assertValidIndexes(decision.acceptable, decision.options.length, where);
    });

    it("always offers at least one helpful and one less helpful choice", () => {
        for (const { where, decision } of DECISIONS) {
            assert.ok(decision.options.length >= 2, where);
            assert.ok(decision.acceptable.length < decision.options.length, where);
        }
    });

    it("never asks for a choice on a step that affirms what the child already can do", () => {
        for (const { level, story } of STORIES) {
            for (const step of story.steps) {
                if (step.affirm) assert.equal(step.decision, undefined, `level ${level}: "${step.text}"`);
            }
        }
    });

    it("fills in the title, cover, intro and every step, question and choice", () => {
        for (const { level, story } of STORIES) {
            const where = `level ${level}`;
            assert.ok(filled(story.title) && filled(story.icon) && filled(story.intro), where);
            assert.ok(story.cover.length >= 1 && story.cover.every(filled), where);
            for (const step of story.steps) {
                assert.ok(filled(step.text), where);
                assert.ok(step.scene.length >= 1 && step.scene.every(filled), where);
                if (!step.decision) continue;
                assert.ok(filled(step.decision.question), where);
                for (const option of step.decision.options) {
                    assert.ok(filled(option.emoji) && filled(option.label) && filled(option.why), where);
                }
            }
        }
    });

    it("writes the title without a gendered form, because it is shown as it is", () => {
        for (const { level, story } of STORIES) assert.doesNotMatch(story.title, /[{}|]/, `level ${level}`);
    });

    it("clamps a level outside 1–15 to the nearest level", () => {
        assert.equal(storyForLevel(0), storyForLevel(1));
        assert.equal(storyForLevel(99), storyForLevel(15));
        assert.equal(storyForLevel(Number.NaN), storyForLevel(1));
    });
});

// ── Koliko izbora dete vidi ───────────────────────────────────────────────────

describe("choices offered under a child's choice limit", () => {
    const sources = [
        ...SITUATIONS.map(({ situation }) => ({ where: `situation ${situation.id}`, source: situation })),
        ...DECISIONS.map(({ where, decision }) => ({ where, source: decision })),
    ];

    it("keep a helpful and a less helpful choice for every situation and story decision", () => {
        for (const { where, source } of sources) {
            for (const limit of [2, 3, 4, 6]) {
                const offered = offeredOptions(source, limit);
                const label = `${where}, limit ${limit}`;
                assert.ok(offered.length <= Math.max(2, limit), label);
                assert.ok(isUnique(offered), label);
                assert.ok(offered.some((index) => source.acceptable.includes(index)), `${label}: nothing helpful offered`);
                assert.ok(offered.some((index) => !source.acceptable.includes(index)), `${label}: nothing less helpful offered`);
            }
        }
    });
});

// ── Emocije ───────────────────────────────────────────────────────────────────

/** Scenariji nisu izvezeni kao spisak, pa se čitaju po ID-ju kroz javni `getScenario`. */
const SCENARIOS: EmotionScenario[] = Array.from({ length: 2000 }, (_, id) => getScenario(id)).filter(
    (scenario): scenario is EmotionScenario => scenario !== undefined
);

/** Broj zadataka po nivou iz pravila igre (pre ograničenja po uzrastu). */
const roundsOnLevel = (level: number) => (level <= 5 ? 4 : level <= 8 ? 5 : level <= 10 ? 6 : level <= 13 ? 5 : 6);

describe("emotion scenarios", () => {
    it("names only known emotions as the common feeling, at least one per scenario", () => {
        assert.ok(SCENARIOS.length >= 60);
        for (const scenario of SCENARIOS) {
            assert.ok(scenario.common.length >= 1, `scenario ${scenario.id}`);
            assert.ok(isUnique(scenario.common), `scenario ${scenario.id}`);
            for (const emotion of scenario.common) assert.ok(EMOTION_IDS.includes(emotion), `scenario ${scenario.id}: ${emotion}`);
        }
    });

    it("fills in the scene, the text and the reason, and starts the reason with „Kad”", () => {
        for (const scenario of SCENARIOS) {
            assert.ok(filled(scenario.scene) && filled(scenario.text), `scenario ${scenario.id}`);
            assert.match(scenario.why, /^Kad\s/, `scenario ${scenario.id}`);
            assert.ok([1, 2, 3].includes(scenario.tier), `scenario ${scenario.id}`);
        }
    });

    it("writes scenarios without {m|f} pairs, because they are shown as they are", () => {
        for (const scenario of SCENARIOS) {
            assert.doesNotMatch(scenario.text, /[{}|]/, `scenario ${scenario.id}`);
            assert.doesNotMatch(scenario.why, /[{}|]/, `scenario ${scenario.id}`);
        }
    });

    for (const band of ["young", "middle", "older"] as const) {
        const { emotionCount, maxRounds } = BAND_PRESETS[band];

        it(`fills every level from 1 to 15 for the ${band} band without repeating a scenario`, () => {
            for (const level of LEVELS) {
                const { scenarios } = getEmotionLevel(level, { emotionCount, maxRounds });
                assert.equal(scenarios.length, Math.min(roundsOnLevel(level), maxRounds), `level ${level}`);
                assert.ok(isUnique(scenarios), `level ${level}`);
            }
        });

        it(`offers the ${band} band only feelings it knows, and always the common feeling of each scenario`, () => {
            for (const level of LEVELS) {
                const { scenarios, palette, choices } = getEmotionLevel(level, { emotionCount, maxRounds });
                assert.ok(palette.length >= 2 && palette.length <= emotionCount, `level ${level}: palette ${palette.length}`);
                assert.deepEqual(palette, inEmotionOrder(palette), `level ${level}: palette order`);
                assert.ok(choices >= 2, `level ${level}`);
                for (const scenario of scenarios) {
                    for (const emotion of scenario.common) {
                        assert.ok(palette.includes(emotion), `level ${level}, scenario ${scenario.id}: ${emotion} is not offered`);
                    }
                }
            }
        });
    }

    it("uses scenarios of the level's own difficulty tier", () => {
        for (const level of LEVELS) {
            const tier = Math.ceil(level / 5);
            for (const scenario of getEmotionLevel(level, { emotionCount: 6, maxRounds: 8 }).scenarios) {
                assert.equal(scenario.tier, tier, `level ${level}, scenario ${scenario.id}`);
            }
        }
    });

    it("gives neighbouring levels of one tier different scenarios", () => {
        for (const level of LEVELS.filter((value) => value % 5 !== 0)) {
            const here = getEmotionLevel(level, { emotionCount: 6, maxRounds: 8 }).scenarios;
            const next = getEmotionLevel(level + 1, { emotionCount: 6, maxRounds: 8 }).scenarios;
            assert.ok(!here.some((scenario) => next.includes(scenario)), `levels ${level} and ${level + 1}`);
        }
    });

    it("brings other scenarios when a level is replayed with a different shift, under the same rules", () => {
        for (const level of [1, 6, 11, 15]) {
            const base = getEmotionLevel(level, { emotionCount: 6, maxRounds: 8 });
            const seen = new Set(base.scenarios.map((scenario) => scenario.id));
            for (let shift = 1; shift <= 12; shift += 1) {
                const again = getEmotionLevel(level, { emotionCount: 6, maxRounds: 8, shift });
                assert.equal(again.scenarios.length, base.scenarios.length, `level ${level}, shift ${shift}`);
                assert.deepEqual(again.palette, base.palette);
                assert.equal(new Set(again.scenarios.map((scenario) => scenario.id)).size, again.scenarios.length, "repeated scenario");
                for (const scenario of again.scenarios) {
                    assert.ok(scenario.common.every((id) => again.palette.includes(id)));
                    seen.add(scenario.id);
                }
            }
            assert.ok(seen.size > base.scenarios.length, `level ${level}: replay never changes the scenarios`);
        }
    });

    it("picks the same scenarios every time for the same level and settings", () => {
        const first = getEmotionLevel(7, { emotionCount: 5, maxRounds: 6 });
        assert.deepEqual(getEmotionLevel(7, { emotionCount: 5, maxRounds: 6 }), first);
    });

    it("falls back to safe values for a level or settings out of range", () => {
        const options = { emotionCount: 6, maxRounds: 8 };
        assert.deepEqual(getEmotionLevel(0, options), getEmotionLevel(1, options));
        assert.deepEqual(getEmotionLevel(99, options), getEmotionLevel(15, options));
        assert.deepEqual(getEmotionLevel(Number.NaN, options), getEmotionLevel(1, options));
        assert.equal(getEmotionLevel(3, { emotionCount: 6, maxRounds: 0 }).scenarios.length, 1);
        assert.deepEqual(getEmotionLevel(12, { emotionCount: Number.NaN, maxRounds: 8 }).palette, ["happy", "sad", "angry"]);
    });

    it("asks how the character of the scenario feels, by name", () => {
        for (const scenario of SCENARIOS) {
            const name = /^Kako se (\p{L}+) oseća\?$/u.exec(questionFor(scenario))?.[1];
            assert.ok(name, `scenario ${scenario.id}`);
            assert.ok(scenario.text.includes(name.slice(0, -1)), `scenario ${scenario.id}: text is not about ${name}`);
        }
    });
});

describe("emotion scenarios for a child with the same name as the character", () => {
    it("recognise a namesake regardless of case, spaces and script", () => {
        const lejla = SCENARIOS.find((scenario) => scenario.who === "lejla");
        assert.ok(lejla);
        assert.equal(isNamesake(lejla, "Lejla"), true);
        assert.equal(isNamesake(lejla, "  lejla "), true);
        assert.equal(isNamesake(lejla, "ЛЕЈЛА"), true);
        assert.equal(isNamesake(lejla, "Lejlana"), false);
        assert.equal(isNamesake(lejla, "Amina"), false);
        assert.equal(isNamesake(lejla, ""), false);
        assert.equal(isNamesake(lejla, undefined), false);
    });

    it("tell every scenario about another character, with no form of the original name left", () => {
        // Koren imena: svi padežni oblici („Lejla, Lejle, Lejli, Lejlu, Lejlom”) počinju njime
        const stems = { lejla: "Lejl", amina: "Amin", selma: "Selm", haris: "Haris", amar: "Amar", tarik: "Tarik" };
        for (const scenario of SCENARIOS) {
            const standIn = getScenario(scenario.id, true);
            assert.ok(standIn, `scenario ${scenario.id}`);
            assert.notEqual(standIn.who, scenario.who, `scenario ${scenario.id}`);
            assert.equal(standIn.id, scenario.id);
            assert.deepEqual(standIn.common, scenario.common);
            assert.notEqual(questionFor(standIn), questionFor(scenario));

            const words = `${standIn.text} ${standIn.why}`.match(/\p{L}+/gu) ?? [];
            const leftovers = words.filter((word) => word.startsWith(stems[scenario.who]));
            assert.deepEqual(leftovers, [], `scenario ${scenario.id}: ${scenario.who} → ${standIn.who}`);
        }
    });
});

// ── Ćirilica ──────────────────────────────────────────────────────────────────

/** Sav tekst koji dete vidi ili čuje u tri igre sa sadržajem, sa mestom odakle potiče. */
function childFacingStrings(): { where: string; text: string }[] {
    const strings: { where: string; text: string }[] = [];
    const add = (where: string, ...texts: string[]) => strings.push(...texts.map((text) => ({ where, text })));

    for (const { situation } of SITUATIONS) {
        add(`situation ${situation.id}`, situation.model, situation.text, situation.ask, situation.script);
        for (const option of situation.options) add(`situation ${situation.id}`, option.text, option.note);
    }
    for (const { level, story } of STORIES) {
        add(`story ${level}`, story.title, story.intro);
        for (const step of story.steps) {
            add(`story ${level}`, step.text);
            if (!step.decision) continue;
            add(`story ${level}`, step.decision.question);
            for (const option of step.decision.options) add(`story ${level}`, option.label, option.why);
        }
    }
    for (const scenario of SCENARIOS) {
        for (const version of [scenario, getScenario(scenario.id, true) ?? scenario]) {
            add(`scenario ${scenario.id} (${version.who})`, version.text, version.why, questionFor(version));
        }
    }
    for (const emotion of Object.values(EMOTIONS)) add(`emotion ${emotion.id}`, emotion.label, emotion.plural);
    return strings;
}

describe("child-facing game text in Cyrillic", () => {
    const strings = childFacingStrings();

    it("covers the content of all three text games", () => {
        assert.ok(strings.length > 1000, `only ${strings.length} strings collected`);
        assert.ok(strings.some(({ text }) => GENDER_PAIR.test(text)), "no {m|f} pair found — is the content still gendered?");
    });

    for (const female of [false, true]) {
        it(`has no Latin letter and no leftover {m|f} pair for a ${female ? "girl" : "boy"}`, () => {
            for (const { where, text } of strings) {
                const shown = toCyrillic(genderText(text, female));
                assert.doesNotMatch(shown, /\p{Script=Latin}/u, `${where}: "${text}" → "${shown}"`);
                assert.doesNotMatch(shown, /[{}|]/, `${where}: "${text}" → "${shown}"`);
            }
        });
    }

    it("resolves every {m|f} pair to two different, non-broken sentences", () => {
        for (const { where, text } of strings.filter((item) => GENDER_PAIR.test(item.text))) {
            const male = genderText(text, false);
            const femaleText = genderText(text, true);
            assert.notEqual(male, femaleText, `${where}: "${text}"`);
            assert.doesNotMatch(`${male}${femaleText}`, /[{}|]/, `${where}: "${text}"`);
        }
    });
});
