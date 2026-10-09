import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ANIMAL_PICTURES } from "@/lib/pictures";
import { VISUAL_PIN_CATEGORIES } from "@/lib/visualPinData";

describe("shared animal pictures", () => {
    const entries = Object.entries(ANIMAL_PICTURES);

    it("has one existing picture per animal, never shared by two animals", () => {
        const images = entries.map(([, picture]) => picture.image);
        assert.equal(new Set(images).size, images.length);
        for (const [id, picture] of entries) {
            assert.ok(picture.name.trim().length > 0, `${id}: name`);
            assert.ok(existsSync(join(process.cwd(), "public", picture.image)), `${id}: ${picture.image} is missing`);
        }
    });

    it("is what the PIN pad shows for every animal", () => {
        const animals = VISUAL_PIN_CATEGORIES.find((category) => category.id === "animals");
        assert.ok(animals);
        const known = new Set(entries.map(([, picture]) => picture.image as string));
        for (const item of animals.items) assert.ok(known.has(item.image), `${item.id} uses its own picture`);
    });

    it("has enough animals for the largest memory board (10 pairs)", () => {
        assert.ok(entries.length >= 10);
    });
});
