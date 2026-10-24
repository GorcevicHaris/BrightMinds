// Pogodi oblik: oblici, nivoi i plan zadataka.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildShapePlan, COLOR_IDS, POOL, SHAPE_INFO, SHAPE_LEVELS, shapeLevelIndex } from "@/app/components/games/data/shapeLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { MAX_LEVEL } from "@/lib/games";

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

/** Koliko je nivo težak (grubo): više opcija, slabiji znak, sličniji ometači, okretanje */
function difficulty(level: (typeof SHAPE_LEVELS)[number]): number {
    const look = { color: 0, shadow: 3, outline: 5 }[level.look];
    const coloring = { natural: 0, uniform: 1, mixed: 4 }[level.coloring];
    return level.options + look + coloring + level.similar + (level.rotate ? 3 : 0) + (level.sizes ? 0.5 : 0) - (level.preview ? 0.5 : 0) - (level.earlyHint ? 0.5 : 0);
}

describe("shapes", () => {
    it("has at least 25 shapes, starting with the basic geometric ones", () => {
        assert.ok(POOL.length >= 25);
        assert.deepEqual(POOL.slice(0, 3), ["circle", "square", "triangle"]);
    });

    for (const id of POOL) {
        it(`${id}: name, colour and look-alikes are valid`, () => {
            const info = SHAPE_INFO[id];
            assert.ok(info.name && info.acc);
            assert.ok(COLOR_IDS.includes(info.color));
            assert.ok(info.similar.length >= 2);
            for (const other of info.similar) {
                assert.notEqual(other, id);
                assert.ok(POOL.includes(other), `${id} → ${other}`);
            }
        });
    }
});

describe("shape levels", () => {
    it(`has ${MAX_LEVEL} distinct levels that get harder within each tier`, () => {
        assert.equal(SHAPE_LEVELS.length, MAX_LEVEL);
        assert.equal(new Set(SHAPE_LEVELS.map((level) => JSON.stringify(level))).size, MAX_LEVEL);
        for (let tier = 0; tier < 3; tier += 1) {
            for (let i = tier * 5 + 1; i < tier * 5 + 5; i += 1) {
                assert.ok(difficulty(SHAPE_LEVELS[i]) >= difficulty(SHAPE_LEVELS[i - 1]), `level ${i + 1}`);
            }
        }
        for (const level of SHAPE_LEVELS) assert.ok(level.pool <= POOL.length && level.pool > level.options);
    });

    it("help fades: same-size match and early hint first, colour preview only when a new look starts", () => {
        assert.ok(SHAPE_LEVELS.slice(0, 3).every((level) => !level.sizes && level.earlyHint));
        assert.ok(SHAPE_LEVELS.slice(5).every((level) => !level.earlyHint));
        SHAPE_LEVELS.forEach((level, i) => {
            if (level.preview) assert.notEqual(SHAPE_LEVELS[i - 1].look, level.look, `preview on level ${i + 1} only when the look changes`);
        });
    });

    it("level numbers outside 1–15 fall back to the nearest level", () => {
        assert.equal(shapeLevelIndex(0), 0);
        assert.equal(shapeLevelIndex(40), MAX_LEVEL - 1);
    });
});

describe("shape plans", () => {
    SHAPE_LEVELS.forEach((cfg, index) => {
        for (const [band, preset] of Object.entries(BAND_PRESETS)) {
            it(`level ${index + 1}, ${band}`, () => {
                const limits = { rounds: Math.min(cfg.rounds, preset.maxRounds), options: Math.min(cfg.options, preset.maxChoices), warmUp: band === "young" && index < 5 };
                for (let seed = 1; seed <= 10; seed += 1) {
                    const plan = buildShapePlan(cfg, limits, seeded(seed * 7 + index));
                    assert.equal(plan.length, limits.rounds);
                    assert.equal(new Set(plan.map((round) => round.target)).size, plan.length, "targets do not repeat");
                    plan.forEach((round, r) => {
                        const shapes = round.options.map((option) => option.shape);
                        assert.equal(shapes.filter((shape) => shape === round.target).length, 1, "exactly one correct option");
                        assert.equal(new Set(shapes).size, shapes.length);
                        assert.equal(round.options.length, limits.warmUp && r === 0 ? Math.min(limits.options, 2) : limits.options);
                        for (const option of round.options) {
                            assert.ok(POOL.slice(0, cfg.pool).includes(option.shape));
                            if (!cfg.rotate) assert.equal(option.rot, 0);
                            if (!cfg.sizes) assert.equal(option.scale, 1);
                        }
                        const correct = round.options.find((option) => option.shape === round.target)!;
                        if (cfg.coloring === "mixed") assert.notEqual(correct.color, round.targetColor);
                        else assert.equal(correct.color, round.targetColor);
                    });
                }
            });
        }
    });
});
