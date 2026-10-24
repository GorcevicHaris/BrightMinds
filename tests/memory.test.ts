// Spoji parove: špilovi, nivoi i police za „Zapamti gde je šta bilo”.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildShelves, cardArt, DECKS, MEMORY_LEVELS, memoryLevel, PAIR_LEVELS, poolSize, type SceneLevel } from "@/app/components/games/data/memoryLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { MAX_LEVEL } from "@/lib/games";

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

describe("memory decks", () => {
    for (const [id, deck] of Object.entries(DECKS)) {
        it(`${id}: unique cards with a picture or a shape`, () => {
            assert.equal(new Set(deck.map((card) => card.id)).size, deck.length);
            for (const card of deck) {
                assert.ok(card.name.length > 0);
                assert.ok(Boolean(card.src) !== Boolean(card.shape), `${card.id}: exactly one of src / shape`);
                if (card.src) assert.ok(existsSync(path.join(process.cwd(), "public", card.src)), `${card.src} exists`);
                assert.equal(cardArt(card.id)?.id, card.id);
            }
        });
    }

    it("every board size has enough different pictures", () => {
        for (const level of PAIR_LEVELS) {
            const deck = DECKS[level.deck];
            assert.ok(poolSize(deck, level.pairs) >= level.pairs, `${level.deck} × ${level.pairs}`);
        }
    });
});

describe("memory levels", () => {
    it(`has ${MAX_LEVEL} distinct levels: pairs first, then scene memory`, () => {
        assert.equal(MEMORY_LEVELS.length, MAX_LEVEL);
        assert.equal(new Set(MEMORY_LEVELS.map((level) => JSON.stringify(level))).size, MAX_LEVEL);
        const firstScene = MEMORY_LEVELS.findIndex((level) => level.kind === "scene");
        assert.ok(firstScene >= 10, "scene memory belongs to the higher levels");
        assert.ok(MEMORY_LEVELS.slice(firstScene).every((level) => level.kind === "scene"));
    });

    it("boards grow and help fades on the pair levels", () => {
        for (let i = 1; i < PAIR_LEVELS.length; i += 1) assert.ok(PAIR_LEVELS[i].pairs >= PAIR_LEVELS[i - 1].pairs);
        // Pomoć posle prve greške samo na početku; poslednji nivoi sa parovima su bez zavirivanja
        const early = PAIR_LEVELS.map((level) => level.earlyHint);
        assert.ok(early[0] && !early[early.length - 1]);
        assert.ok(early.indexOf(false) > 0 && early.slice(early.indexOf(false)).every((value) => !value));
        assert.equal(PAIR_LEVELS[0].peek, true);
        assert.equal(PAIR_LEVELS[PAIR_LEVELS.length - 1].peek, false);
    });

    it("scene memory goes from 2 to 5 objects, with more empty places", () => {
        const scenes = MEMORY_LEVELS.filter((level): level is SceneLevel => level.kind === "scene");
        assert.equal(scenes[0].objects, 2);
        assert.equal(scenes[scenes.length - 1].objects, 5);
        for (let i = 1; i < scenes.length; i += 1) {
            assert.ok(scenes[i].objects >= scenes[i - 1].objects);
            assert.ok(scenes[i].cols * scenes[i].rows >= scenes[i - 1].cols * scenes[i - 1].rows);
        }
    });

    it("level numbers outside 1–15 fall back to the nearest level", () => {
        assert.equal(memoryLevel(0), MEMORY_LEVELS[0]);
        assert.equal(memoryLevel(42), MEMORY_LEVELS[MAX_LEVEL - 1]);
    });
});

describe("memory shelves", () => {
    const scenes = MEMORY_LEVELS.filter((level): level is SceneLevel => level.kind === "scene");
    for (const level of scenes) {
        for (const [band, preset] of Object.entries(BAND_PRESETS)) {
            it(`${level.objects} objects on ${level.cols}×${level.rows}, ${band}`, () => {
                for (let seed = 1; seed <= 20; seed += 1) {
                    const shelves = buildShelves(level, preset.memoryMaxPairs, seeded(seed));
                    assert.equal(shelves.length, level.scenes);
                    for (const shelf of shelves) {
                        assert.equal(shelf.slots.length, level.cols * level.rows);
                        const objects = shelf.slots.filter((id): id is string => id !== null);
                        assert.equal(objects.length, Math.min(level.objects, preset.memoryMaxPairs));
                        assert.equal(new Set(objects).size, objects.length, "different objects on one shelf");
                        objects.forEach((id) => assert.ok(cardArt(id), id));
                        // I za poslednji predmet ostaju bar dva prazna mesta: nije pogođen „nasilu”
                        assert.ok(shelf.slots.length - objects.length + 1 >= 2);
                    }
                }
            });
        }
    }
});
