// lib/customStories.ts — „Moje priče”: provera unosa, čitanje iz baze i gotovi primeri.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    MAX_STORIES_PER_CHILD,
    STORY_EMOJI_MAX_UNITS,
    STORY_INVALID_REQUEST,
    STORY_MAX_STEPS,
    STORY_MIN_STEPS,
    STORY_STEP_TEXT_MAX,
    STORY_TEMPLATES,
    STORY_TITLE_MAX,
    isMissingTableError,
    parseStory,
    parseStoryList,
    readStoryRequest,
    stepCountLabel,
    storiesFromRows,
    validateStoryInput,
    type CustomStoryInput,
} from "@/lib/customStories";
import { toCyrillic } from "@/lib/script";

const steps = (count: number) => Array.from({ length: count }, (_, index) => ({ text: `Korak ${index + 1}.`, emoji: "🙂" }));

/** Ispravna priča; pojedinačni testovi menjaju po jedno polje. */
const story = (overrides: Record<string, unknown> = {}) => ({ title: "Idemo u park", emoji: "🌳", steps: steps(3), ...overrides });

function expectError(raw: unknown, pattern: RegExp): void {
    const result = validateStoryInput(raw);
    assert.equal(result.ok, false, JSON.stringify(raw));
    if (!result.ok) assert.match(result.error, pattern);
}

function expectValue(raw: unknown): CustomStoryInput {
    const result = validateStoryInput(raw);
    assert.ok(result.ok, result.ok ? "" : result.error);
    return result.value;
}

function storyRequest(body: string, headers: Record<string, string> = {}): Request {
    return new Request("http://localhost/api/children/1/stories", { method: "POST", body, headers });
}

describe("validateStoryInput", () => {
    it("accepts a valid story and returns it unchanged", () => {
        assert.deepEqual(expectValue(story()), story());
    });

    it("rejects anything that is not an object", () => {
        for (const raw of [null, undefined, "priča", 7, [story()]]) expectError(raw, new RegExp(STORY_INVALID_REQUEST));
    });

    it("requires a title of at most 60 characters", () => {
        assert.equal(STORY_TITLE_MAX, 60);
        expectError(story({ title: "" }), /naslov/);
        expectError(story({ title: "   " }), /naslov/);
        expectError(story({ title: 5 }), /naslov/);
        expectError(story({ title: "a".repeat(61) }), /naslov/);
        assert.equal(expectValue(story({ title: "a".repeat(60) })).title.length, 60);
    });

    it("collapses whitespace in the title and in step text", () => {
        const value = expectValue(story({ title: "  Idemo \n u   park ", steps: [{ text: " Prvo\tse  obujem. " }, { text: "Zatim idemo." }] }));
        assert.equal(value.title, "Idemo u park");
        assert.equal(value.steps[0].text, "Prvo se obujem.");
    });

    it("measures the title after trimming, so padding does not count", () => {
        assert.equal(expectValue(story({ title: `  ${"a".repeat(60)}  ` })).title.length, 60);
    });

    it("requires between 2 and 8 steps", () => {
        assert.equal(STORY_MIN_STEPS, 2);
        assert.equal(STORY_MAX_STEPS, 8);
        expectError(story({ steps: steps(1) }), /od 2 do 8 koraka/);
        expectError(story({ steps: steps(9) }), /od 2 do 8 koraka/);
        expectError(story({ steps: "dva" }), /od 2 do 8 koraka/);
        expectError(story({ steps: undefined }), /od 2 do 8 koraka/);
        assert.equal(expectValue(story({ steps: steps(2) })).steps.length, 2);
        assert.equal(expectValue(story({ steps: steps(8) })).steps.length, 8);
    });

    it("requires text of at most 160 characters in every step and names the step", () => {
        assert.equal(STORY_STEP_TEXT_MAX, 160);
        expectError(story({ steps: [{ text: "Prvi." }, { text: "  " }] }), /^Korak 2: upišite tekst/);
        expectError(story({ steps: [{ text: "Prvi." }, "drugi"] }), /^Korak 2: upišite tekst/);
        expectError(story({ steps: [{ text: "a".repeat(161) }, { text: "Drugi." }] }), /^Korak 1: tekst može imati najviše 160/);
        assert.equal(expectValue(story({ steps: [{ text: "a".repeat(160) }, { text: "Drugi." }] })).steps[0].text.length, 160);
    });

    it("stores a missing or empty picture as null", () => {
        const value = expectValue({ title: "Bez sličica", steps: [{ text: "Prvi." }, { text: "Drugi.", emoji: "  " }] });
        assert.equal(value.emoji, null);
        assert.deepEqual(value.steps, [
            { text: "Prvi.", emoji: null },
            { text: "Drugi.", emoji: null },
        ]);
    });

    it("accepts a compound emoji and removes spaces inside the picture", () => {
        assert.equal(expectValue(story({ emoji: " ✂️ " })).emoji, "✂️");
        assert.equal(expectValue(story({ emoji: "👩‍🏫" })).emoji, "👩‍🏫");
    });

    it("rejects a picture that contains letters or digits, or is not text", () => {
        expectError(story({ emoji: "abc" }), /Sličica priče/);
        expectError(story({ emoji: "7" }), /Sličica priče/);
        expectError(story({ emoji: "ж" }), /Sličica priče/);
        expectError(story({ emoji: 5 }), /Sličica priče/);
        expectError(story({ steps: [{ text: "Prvi.", emoji: "x" }, { text: "Drugi." }] }), /^Korak 1: sličica/);
    });

    it(
        "accepts a keycap emoji, the natural picture for numbered steps",
        () => {
            assert.equal(expectValue(story({ steps: [{ text: "Prvi.", emoji: "1️⃣" }, { text: "Drugi.", emoji: "2️⃣" }] })).steps[0].emoji, "1️⃣");
        }
    );

    it("rejects a picture longer than 8 UTF-16 units", () => {
        assert.equal(STORY_EMOJI_MAX_UNITS, 8);
        expectError(story({ emoji: "🙂🙂🙂🙂🙂" }), /Sličica priče/);
        assert.equal(expectValue(story({ emoji: "🙂🙂🙂🙂" })).emoji, "🙂🙂🙂🙂");
    });

    it("drops unknown fields from the story and from its steps", () => {
        const value = expectValue(story({ id: 99, child_id: 5, steps: [{ text: "Prvi.", emoji: null, hidden: true }, { text: "Drugi." }] }));
        assert.deepEqual(Object.keys(value).sort(), ["emoji", "steps", "title"]);
        assert.deepEqual(Object.keys(value.steps[0]).sort(), ["emoji", "text"]);
    });
});

describe("story templates", () => {
    it("all pass validation exactly as written", () => {
        assert.ok(STORY_TEMPLATES.length >= 1);
        for (const template of STORY_TEMPLATES) {
            assert.deepEqual(expectValue(template), template, template.title);
        }
    });

    it("have unique titles and a picture on the story and on every step", () => {
        assert.equal(new Set(STORY_TEMPLATES.map((template) => template.title)).size, STORY_TEMPLATES.length);
        for (const template of STORY_TEMPLATES) {
            assert.ok(template.emoji, template.title);
            for (const step of template.steps) assert.ok(step.emoji, `${template.title}: "${step.text}"`);
        }
    });

    it("can be shown fully in Cyrillic", () => {
        for (const template of STORY_TEMPLATES) {
            for (const text of [template.title, ...template.steps.map((step) => step.text)]) {
                assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, `${template.title}: "${text}"`);
            }
        }
    });

    it("do not depend on the child's gender", () => {
        for (const template of STORY_TEMPLATES) {
            for (const step of template.steps) assert.doesNotMatch(step.text, /[{}|]/, template.title);
        }
    });
});

describe("readStoryRequest", () => {
    it("reads and validates a JSON body", async () => {
        const result = await readStoryRequest(storyRequest(JSON.stringify(story())));
        assert.deepEqual(result, { ok: true, value: story() });
    });

    it("rejects a body that is not JSON", async () => {
        assert.deepEqual(await readStoryRequest(storyRequest("{not json")), { ok: false, error: STORY_INVALID_REQUEST });
        assert.deepEqual(await readStoryRequest(storyRequest("")), { ok: false, error: STORY_INVALID_REQUEST });
    });

    it("rejects a body larger than 8 KB, whether or not the size is declared", async () => {
        const huge = JSON.stringify(story({ padding: "x".repeat(9000) }));
        assert.deepEqual(await readStoryRequest(storyRequest(huge)), { ok: false, error: STORY_INVALID_REQUEST });
        const declared = storyRequest(JSON.stringify(story()), { "content-length": "9000" });
        assert.deepEqual(await readStoryRequest(declared), { ok: false, error: STORY_INVALID_REQUEST });
    });
});

describe("stories read from the database", () => {
    const row = { id: 3, title: "Park", emoji: "🌳", steps: [{ text: "Prvi.", emoji: "🙂" }], updated_at: "2026-01-10T10:00:00Z", child_id: 9 };

    it("maps a row to a story without the internal columns", () => {
        assert.deepEqual(storiesFromRows([row]), [
            { id: 3, title: "Park", emoji: "🌳", steps: [{ text: "Prvi.", emoji: "🙂" }], updatedAt: "2026-01-10T10:00:00Z" },
        ]);
    });

    it("skips rows without a numeric id or a title, and steps without text", () => {
        const rows = [
            { ...row, id: "3" },
            { ...row, title: null },
            null,
            { ...row, id: 4, emoji: "", steps: [{ text: "  " }, { emoji: "🙂" }, "x", { text: "Ostaje.", emoji: "" }], updated_at: null },
        ];
        assert.deepEqual(storiesFromRows(rows), [
            { id: 4, title: "Park", emoji: null, steps: [{ text: "Ostaje.", emoji: null }], updatedAt: null },
        ]);
    });

    it("returns an empty list when the rows are not a list", () => {
        assert.deepEqual(storiesFromRows(null), []);
        assert.deepEqual(storiesFromRows({ 0: row }), []);
    });

    it("reads back what the API sends to the browser", () => {
        const [fromDb] = storiesFromRows([row]);
        assert.deepEqual(parseStory(fromDb), fromDb);
        assert.deepEqual(parseStoryList({ stories: [fromDb, { title: "bez ID-ja" }] }), [fromDb]);
        assert.equal(parseStory("x"), null);
        assert.deepEqual(parseStoryList({ stories: "x" }), []);
        assert.deepEqual(parseStoryList(null), []);
    });
});

describe("small helpers", () => {
    it("recognises a missing table from Postgres and from PostgREST", () => {
        assert.equal(isMissingTableError({ code: "42P01" }), true);
        assert.equal(isMissingTableError({ code: "PGRST205" }), true);
        assert.equal(isMissingTableError({ code: "23505" }), false);
        assert.equal(isMissingTableError(new Error("x")), false);
        assert.equal(isMissingTableError(null), false);
    });

    it("labels the number of steps in Serbian", () => {
        assert.equal(stepCountLabel(1), "1 korak");
        assert.equal(stepCountLabel(5), "5 koraka");
    });

    it("allows at most 20 stories per child", () => {
        assert.equal(MAX_STORIES_PER_CHILD, 20);
    });
});
