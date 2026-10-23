import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasBackground } from "@/app/components/games/scene/backgrounds";
import { isAdult, LOOKS } from "@/app/components/games/scene/figures";
import { hasProp } from "@/app/components/games/scene/props";
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
