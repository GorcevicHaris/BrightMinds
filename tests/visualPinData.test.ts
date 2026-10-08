// lib/visualPinData.ts — sličice vizuelnog PIN-a. ID-jevi su deo PIN-a u bazi i ne smeju se menjati.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeVisualPin } from "@/lib/validation";
import { PIN_LENGTH, VISUAL_PIN_CATEGORIES, pinToItems } from "@/lib/visualPinData";

describe("visual PIN categories", () => {
    it("has one category for each position of the PIN", () => {
        assert.equal(PIN_LENGTH, 4);
        assert.equal(VISUAL_PIN_CATEGORIES.length, PIN_LENGTH);
        assert.deepEqual(
            VISUAL_PIN_CATEGORIES.map((category) => category.id),
            ["animals", "food", "items", "juices"]
        );
    });

    it("has ten items with unique ids in every category", () => {
        for (const category of VISUAL_PIN_CATEGORIES) {
            const ids = category.items.map((item) => item.id);
            assert.equal(ids.length, 10, category.id);
            assert.equal(new Set(ids).size, 10, category.id);
        }
    });

    it("gives every item a name, an emoji and its own picture inside the category folder", () => {
        for (const category of VISUAL_PIN_CATEGORIES) {
            const images = category.items.map((item) => item.image);
            assert.equal(new Set(images).size, images.length, `${category.id}: repeated picture`);
            for (const item of category.items) {
                assert.ok(item.name.trim().length > 0, `${category.id}/${item.id}: name`);
                assert.ok(item.emoji.trim().length > 0, `${category.id}/${item.id}: emoji`);
                assert.ok(item.image.startsWith(`/pins/${category.id}/`) && item.image.endsWith(".webp"), `${category.id}/${item.id}: image`);
            }
        }
    });

    it("uses ids that can be stored in a comma-separated PIN", () => {
        for (const category of VISUAL_PIN_CATEGORIES) {
            for (const item of category.items) assert.match(item.id, /^[a-z_]+$/, `${category.id}/${item.id}`);
        }
    });

    it("keeps the ids that are already stored in children's PINs", () => {
        assert.deepEqual(
            VISUAL_PIN_CATEGORIES.map((category) => category.items.map((item) => item.id)),
            [
                ["dog", "cat", "lion", "tiger", "bear", "cow", "crocodile", "zebra", "horse", "puma"],
                ["cevapi", "sausages", "pancakes", "meatballs", "pizza", "burger", "eggs", "gyros", "fish", "fries"],
                ["spinner", "phone", "tablet", "computer", "car", "book", "lego", "laptop", "drums", "ball"],
                [
                    "orange_juice",
                    "sprite",
                    "pepsi",
                    "cedevita",
                    "strawberry_juice",
                    "fanta_blue",
                    "bravo_orange",
                    "apple_juice",
                    "fanta_yellow",
                    "coca_cola",
                ],
            ]
        );
    });
});

describe("pinToItems", () => {
    it("turns every possible PIN position back into the item that was picked", () => {
        for (let index = 0; index < 10; index += 1) {
            const picked = VISUAL_PIN_CATEGORIES.map((category) => category.items[index]);
            const pin = picked.map((item) => item.id).join(",");
            assert.deepEqual(pinToItems(pin), picked);
            assert.equal(normalizeVisualPin(pin), pin);
        }
    });

    it("looks each id up in the category of its position, not in other categories", () => {
        // "pizza" i "fish" postoje samo u hrani; na prvom mestu (životinje) nisu sličica
        assert.deepEqual(pinToItems("pizza,dog,car,pepsi"), [
            undefined,
            undefined,
            VISUAL_PIN_CATEGORIES[2].items[4],
            VISUAL_PIN_CATEGORIES[3].items[2],
        ]);
    });

    it("returns an empty list when there is no PIN", () => {
        assert.deepEqual(pinToItems(null), []);
        assert.deepEqual(pinToItems(undefined), []);
        assert.deepEqual(pinToItems(""), []);
    });

    it("returns undefined for positions beyond the four categories", () => {
        assert.deepEqual(pinToItems("dog,pizza,car,pepsi,dog")[4], undefined);
    });
});
