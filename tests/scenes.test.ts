import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasBackground } from "@/app/components/games/scene/backgrounds";
import { isAdult, LOOKS } from "@/app/components/games/scene/figures";
import { emotionHero } from "@/app/components/games/scene/heroes";
import { hasProp } from "@/app/components/games/scene/props";
import { allScenarios } from "@/app/components/games/data/emotionScenarios";
import { EMOTION_SCENES } from "@/app/components/games/data/emotionScenes";
import { socialScene } from "@/app/components/games/data/socialScenes";
import { getSituationsForLevel } from "@/app/components/games/data/socialSituations";
import { storyForLevel } from "@/app/components/games/data/socialStories";
import { STORY_SCENES, storyScene } from "@/app/components/games/data/storyScenes";
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

describe("social scenes", () => {
    const situations = Array.from({ length: 15 }, (_, i) => getSituationsForLevel(i + 1)).flat();

    it("has a picture for every situation on every level", () => {
        const missing = situations.filter((situation) => !socialScene(situation.id)).map((situation) => situation.id);
        assert.deepEqual(missing, [], `bez slike: ${missing.join(", ")}`);
        assert.equal(new Set(situations.map((situation) => situation.id)).size, 60);
    });

    it("draws the child from the example, by name, from existing parts", () => {
        for (const situation of situations) {
            const picture = socialScene(situation.id)!;
            assertDrawable(picture.scene, `situacija ${situation.id}`);
            assert.ok(sceneParts(picture.scene).figures.includes("hero"), `situacija ${situation.id}: nema deteta iz primera`);
            // „Harisov brat”, „Ilmin prijatelj”, „Selmi”: ime je u primeru, bar bez poslednjeg slova
            const name = picture.hero[0].toUpperCase() + picture.hero.slice(1);
            assert.ok(situation.model.includes(name.slice(0, -1)), `situacija ${situation.id}: u primeru nema imena ${name}`);
        }
    });
});

describe("story scenes", () => {
    it("has a cover and one picture per page for every story", () => {
        for (let level = 1; level <= 15; level += 1) {
            const story = storyForLevel(level);
            assert.ok(storyScene(level, "cover"), `nivo ${level}: nema naslovne slike`);
            assert.equal(STORY_SCENES[level].steps.length, story.steps.length, `nivo ${level}: broj slika ≠ broj stranica`);
            story.steps.forEach((_, i) => assert.ok(storyScene(level, i), `nivo ${level}, stranica ${i + 1}: nema slike`));
        }
        assert.deepEqual(Object.keys(STORY_SCENES).map(Number), Array.from({ length: 15 }, (_, i) => i + 1));
    });

    it("draws every page from existing parts", () => {
        for (const [level, pictures] of Object.entries(STORY_SCENES)) {
            assertDrawable(pictures.cover, `nivo ${level}, naslovna`);
            pictures.steps.forEach((spec, i) => assertDrawable(spec, `nivo ${level}, stranica ${i + 1}`));
        }
    });
});
