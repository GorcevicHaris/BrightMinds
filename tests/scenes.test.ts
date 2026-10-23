import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasBackground } from "@/app/components/games/scene/backgrounds";
import { isAdult, LOOKS } from "@/app/components/games/scene/figures";
import { emotionHero } from "@/app/components/games/scene/heroes";
import { hasProp } from "@/app/components/games/scene/props";
import { allScenarios } from "@/app/components/games/data/emotionScenarios";
import { EMOTION_SCENES } from "@/app/components/games/data/emotionScenes";
import { BACKGROUND_IDS, hero, inBed, PROP_IDS, scene, sceneParts, thing, think, type SceneSpec } from "@/app/components/games/scene/types";

/** Svaki deo slike postoji u kompletu: pozadine, predmeti i likovi */
function assertDrawable(spec: SceneSpec, where: string) {
    const { backgrounds, props, figures } = sceneParts(spec);
    for (const bg of backgrounds) assert.ok(hasBackground(bg), `${where}: nema pozadine „${bg}”`);
    for (const prop of props) assert.ok(hasProp(prop), `${where}: nema predmeta „${prop}”`);
    for (const fig of figures) assert.ok(fig === "hero" || isAdult(fig) || Object.hasOwn(LOOKS, fig), `${where}: nema lika „${fig}”`);
}

describe("scene kit", () => {
    it("draws every background and every prop it names", () => {
        for (const bg of BACKGROUND_IDS) assert.ok(hasBackground(bg), bg);
        for (const prop of PROP_IDS) assert.ok(hasProp(prop), prop);
    });

    it("lists the parts of a scene, inside thought bubbles too", () => {
        const spec = scene("bedroom", [...inBed("hero", 80), think(scene("park", [thing("ball", 120, 140), hero(60)]), 180, 50, 30)]);
        assertDrawable(spec, "primer");
        assert.deepEqual(sceneParts(spec), { backgrounds: ["bedroom", "park"], props: ["bed", "ball"], figures: ["hero", "hero"] });
    });
});

describe("emotion scenes", () => {
    it("has a picture for every scenario, and only for existing scenarios", () => {
        const ids = allScenarios().map((s) => s.id);
        const missing = ids.filter((id) => !EMOTION_SCENES[id]);
        assert.deepEqual(missing, [], `bez slike: ${missing.join(", ")}`);
        const extra = Object.keys(EMOTION_SCENES).map(Number).filter((id) => !ids.includes(id));
        assert.deepEqual(extra, [], `slika bez scenarija: ${extra.join(", ")}`);
    });

    it("draws every picture from existing parts, with the main character in it", () => {
        for (const [id, spec] of Object.entries(EMOTION_SCENES)) {
            assertDrawable(spec, `scenario ${id}`);
            assert.ok(sceneParts(spec).figures.includes("hero"), `scenario ${id}: na slici nema glavnog lika`);
            // Izraz glavnog lika zadaje igra (tačno osećanje ili leđa), nikad opis slike
            const faces = spec.items.filter((item) => "fig" in item && item.fig === "hero" && item.face !== undefined);
            assert.deepEqual(faces, [], `scenario ${id}: glavni lik ne sme imati svoj izraz`);
        }
    });

    it("shows the correct face on easy levels, and hides the face on harder levels until help or answer", () => {
        for (const scenario of allScenarios()) {
            const hidden = emotionHero(scenario, false);
            const revealed = emotionHero(scenario, true);
            assert.equal(hidden.look, scenario.who);
            if (scenario.tier === 1) {
                assert.equal(hidden.face, scenario.common[0], `${scenario.id}: lice mora da pokazuje tačno osećanje`);
                assert.notEqual(hidden.back, true);
            } else {
                assert.equal(hidden.back, true, `${scenario.id}: lice ne sme da se vidi pre pomoći`);
                assert.equal(hidden.face, undefined, `${scenario.id}: lice bez izraza ne sme da se crta`);
            }
            assert.equal(revealed.face, scenario.common[0]);
            assert.notEqual(revealed.back, true);
        }
    });
});
