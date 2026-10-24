// Slušaj i spoji: zvuci, nivoi i plan rundi.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildSoundRounds, MAX_PLAY_MS, SOUND_ITEMS, SOUND_LEVELS, soundLevelIndex } from "@/app/components/games/data/soundLevels";
import { MAX_LEVEL } from "@/lib/games";

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

const publicFile = (file: string) => existsSync(path.join(process.cwd(), "public", file));

describe("sounds", () => {
    it("every sound and picture is already in the repository (nothing is downloaded)", () => {
        assert.equal(new Set(SOUND_ITEMS.map((item) => item.id)).size, SOUND_ITEMS.length);
        for (const item of SOUND_ITEMS) {
            assert.ok(publicFile(item.sound), item.sound);
            if (item.image) assert.ok(publicFile(item.image), item.image);
            assert.ok(item.level > 0 && item.level <= 1);
        }
        // Prva četiri zvuka su tiha: svaki nivo ima šta da pusti i bez glasnih zvukova
        assert.ok(SOUND_ITEMS.slice(0, 4).every((item) => !item.loud));
    });
});

describe("sound levels", () => {
    it(`has ${MAX_LEVEL} distinct levels that only get harder`, () => {
        assert.equal(SOUND_LEVELS.length, MAX_LEVEL);
        assert.equal(new Set(SOUND_LEVELS.map((level) => JSON.stringify(level))).size, MAX_LEVEL);
        for (let i = 1; i < SOUND_LEVELS.length; i += 1) {
            const [prev, cur] = [SOUND_LEVELS[i - 1], SOUND_LEVELS[i]];
            assert.ok(cur.options >= prev.options, `options, level ${i + 1}`);
            assert.ok(cur.pool >= prev.pool, `pool, level ${i + 1}`);
            assert.ok(cur.clipMs <= prev.clipMs, `clip, level ${i + 1}`);
            assert.ok(!prev.noLabels || cur.noLabels, `labels come back on level ${i + 1}`);
            assert.ok(!(prev.earlyHint === false && cur.earlyHint), `early hint returns on level ${i + 1}`);
            assert.ok(cur.pool <= SOUND_ITEMS.length);
        }
        assert.ok(SOUND_LEVELS[0].earlyHint && !SOUND_LEVELS[MAX_LEVEL - 1].earlyHint);
        assert.ok(SOUND_LEVELS[MAX_LEVEL - 1].clipMs < MAX_PLAY_MS);
    });

    it("level numbers outside 1–15 fall back to the nearest level", () => {
        assert.equal(soundLevelIndex(0), 0);
        assert.equal(soundLevelIndex(99), MAX_LEVEL - 1);
        assert.equal(soundLevelIndex(Number.NaN), 0);
    });
});

describe("sound rounds", () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
        for (const loudSounds of [false, true]) {
            it(`level ${level}, loud sounds ${loudSounds ? "allowed" : "off"}`, () => {
                for (const maxOptions of [2, 3, 4, 6]) {
                    for (let seed = 1; seed <= 8; seed += 1) {
                        const rounds = buildSoundRounds(level, { loudSounds, maxRounds: 6, maxOptions }, seeded(seed * 13 + level));
                        const cfg = SOUND_LEVELS[level - 1];
                        assert.equal(rounds.length, Math.min(cfg.rounds, 6));
                        rounds.forEach((round, i) => {
                            const target = SOUND_ITEMS.find((item) => item.id === round.targetId)!;
                            assert.ok(target, round.targetId);
                            if (!loudSounds) assert.equal(target.loud, false, "a loud sound is never played when it is off");
                            assert.ok(round.optionIds.includes(round.targetId));
                            assert.equal(new Set(round.optionIds).size, round.optionIds.length);
                            assert.ok(round.optionIds.length >= 2 && round.optionIds.length <= Math.min(cfg.options, maxOptions) + 1);
                            if (i > 0) assert.notEqual(rounds[i - 1].targetId, round.targetId, "the same sound twice in a row");
                        });
                    }
                }
            });
        }
    }
});

describe("sound file safety", () => {
    it("plays the wind clip only before its clipped segment at 4.8 s", () => {
        const wind = SOUND_ITEMS.find((item) => item.id === "wind");
        assert.ok(wind?.maxMs !== undefined && wind.maxMs < 4800, "vetar se seče pre 4,8 s");
    });
});
