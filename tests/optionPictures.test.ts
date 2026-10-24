// Izbori u igrama „Šta reći?” i „Socijalne priče” su slike sa kratkim natpisom: svaki ponuđeni
// izbor ima svoju sliku, nacrtanu iz postojećih delova, i nikad nema više od tri izbora.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasBackground } from "@/app/components/games/scene/backgrounds";
import { isAdult, LOOKS } from "@/app/components/games/scene/figures";
import { hasProp } from "@/app/components/games/scene/props";
import { sceneParts, type SceneSpec } from "@/app/components/games/scene/types";
import { OPTION_ART, optionPicture } from "@/app/components/games/data/optionPictures";
import { getSituationsForLevel } from "@/app/components/games/data/socialSituations";
import { storyForLevel } from "@/app/components/games/data/socialStories";

const LEVELS = Array.from({ length: 15 }, (_, i) => i + 1);

function offered(): { where: string; text: string; count: number; level: number }[] {
    const all: { where: string; text: string; count: number; level: number }[] = [];
    for (const level of LEVELS) {
        for (const situation of getSituationsForLevel(level)) {
            for (const option of situation.options) all.push({ where: `šta reći ${situation.id}`, text: option.text, count: situation.options.length, level });
        }
        storyForLevel(level).steps.forEach((step, i) => {
            for (const option of step.decision?.options ?? []) all.push({ where: `priča ${level}/${i + 1}`, text: option.label, count: step.decision!.options.length, level });
        });
    }
    return all;
}

function assertDrawable(spec: SceneSpec, where: string) {
    const { backgrounds, props, figures } = sceneParts(spec);
    for (const bg of backgrounds) assert.ok(hasBackground(bg), `${where}: nema pozadine „${bg}”`);
    for (const prop of props) assert.ok(hasProp(prop), `${where}: nema predmeta „${prop}”`);
    for (const fig of figures) assert.ok(fig === "hero" || isAdult(fig) || Object.hasOwn(LOOKS, fig), `${where}: nema lika „${fig}”`);
}

describe("answer options as pictures", () => {
    it("draws a picture for every option a child can be offered", () => {
        const missing = [...new Set(offered().filter((o) => !optionPicture(o.text)).map((o) => `${o.where}: ${o.text}`))];
        assert.deepEqual(missing, []);
    });

    it("draws every option picture from existing parts, with the child in it", () => {
        for (const [text, art] of Object.entries(OPTION_ART)) {
            const spec = optionPicture(text)!;
            assertDrawable(spec, text);
            if (!art.none) assert.ok(sceneParts(spec).figures.includes("hero"), `${text}: na slici nema deteta`);
        }
    });

    it("keeps no picture for an option that is never offered", () => {
        const used = new Set(offered().map((o) => o.text));
        const unused = Object.keys(OPTION_ART).filter((text) => !used.has(text));
        assert.deepEqual(unused, []);
    });

    it("offers two pictures on easy levels and never more than three", () => {
        for (const o of offered()) {
            if (o.level <= 5) assert.equal(o.count, 2, `${o.where}`);
            else assert.ok(o.count === 3, `${o.where}: ${o.count}`);
        }
    });
});
