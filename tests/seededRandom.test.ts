// Seme zadataka u dvoboju (lib/seededRandom.ts, kit/random.ts): isto seme daje isti nivo u svakoj
// igri — oba deteta u trci dobijaju iste zadatke istim redom; drugo seme daje druge zadatke.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildBackpackLevel } from "@/app/components/games/data/backpackLevels";
import { buildBodyLevel } from "@/app/components/games/data/bodyLevels";
import { buildHabitatsLevel } from "@/app/components/games/data/habitatsLevels";
import { buildJobsLevel } from "@/app/components/games/data/jobsLevels";
import { buildOppositesLevel } from "@/app/components/games/data/oppositesLevels";
import { buildSeasonsLevel } from "@/app/components/games/data/seasonsLevels";
import { buildSyllablesLevel } from "@/app/components/games/data/syllablesLevels";
import { buildTrafficLevel } from "@/app/components/games/data/trafficLevels";
import { buildBreathingLevel } from "@/app/components/games/data/breathingLevels";
import { buildHygieneLevel } from "@/app/components/games/data/hygieneLevels";
import { buildMixLevel } from "@/app/components/games/data/mixColorsLevels";
import { buildPlantLevel } from "@/app/components/games/data/plantLevels";
import { buildRhythmLevel } from "@/app/components/games/data/rhythmLevels";
import { buildSimonLevel } from "@/app/components/games/data/simonLevels";
import { buildClockLevel } from "@/app/components/games/data/clockLevels";
import { buildColoringPlan } from "@/app/components/games/data/coloringLevels";
import { buildCountingLevel } from "@/app/components/games/data/countingItems";
import { buildDiffLevel } from "@/app/components/games/data/differencesLevels";
import { buildFamilyLevel } from "@/app/components/games/data/familyLevels";
import { buildFoodLevel } from "@/app/components/games/data/foodItems";
import { buildGazeLevel } from "@/app/components/games/data/gazeRounds";
import { buildInsetLevel } from "@/app/components/games/data/insetLevels";
import { buildLettersLevel } from "@/app/components/games/data/lettersItems";
import { buildMarketLevel } from "@/app/components/games/data/marketLevels";
import { buildMazeLevel } from "@/app/components/games/data/mazeLevels";
import { buildShelves, memoryLevel } from "@/app/components/games/data/memoryLevels";
import { buildMissingLevel } from "@/app/components/games/data/missingItems";
import { buildNumbersLevel } from "@/app/components/games/data/numbersItems";
import { buildPuzzleLevel } from "@/app/components/games/data/puzzleLevels";
import { buildSequenceLevel } from "@/app/components/games/data/sequences";
import { SHAPE_LEVELS, buildShapePlan, shapeLevelIndex } from "@/app/components/games/data/shapeLevels";
import { buildSortLevel } from "@/app/components/games/data/sortingItems";
import { buildSoundRounds } from "@/app/components/games/data/soundLevels";
import { buildUsesLevel } from "@/app/components/games/data/usesItems";
import { buildWeatherLevel } from "@/app/components/games/data/weatherLevels";
import { buildWhereLevel } from "@/app/components/games/data/whereScenes";
import { buildWordsLevel } from "@/app/components/games/data/wordsItems";
import { shuffle } from "@/app/components/games/kit/utils";
import { MAX_LEVEL } from "@/lib/games";
import { cleanSeed, duelSeed, seededRandom } from "@/lib/seededRandom";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const opts = { maxChoices: 4, maxRounds: 8 };

/** Svaki graditelj nivoa: (nivo, izvor brojeva) → zadaci nivoa */
const BUILDERS: Record<string, (level: number, random: () => number) => unknown> = {
    backpack: (level, random) => buildBackpackLevel(level, { ...opts, random }),
    clock: (level, random) => buildClockLevel(level, { ...opts, random }),
    coloring: (level, random) => buildColoringPlan(level, { rounds: 8, choices: 4 }, undefined, random),
    counting: (level, random) => buildCountingLevel(level, { ...opts, random }),
    differences: (level, random) => buildDiffLevel(level, { maxRounds: 8, random }),
    families: (level, random) => buildFamilyLevel(level, { ...opts, random }),
    food: (level, random) => buildFoodLevel(level, { ...opts, random }),
    gaze: (level, random) => buildGazeLevel(level, { ...opts, childName: "Lejla", random }),
    inset: (level, random) => buildInsetLevel(level, { maxRounds: 8, random }),
    letters: (level, random) => buildLettersLevel(level, { ...opts, script: "latin", childName: "Lejla", random }),
    market: (level, random) => buildMarketLevel(level, { ...opts, random }),
    maze: (level, random) => buildMazeLevel(level, { maxRounds: 8, childName: "Lejla", random }),
    memory: (level, random) => {
        const cfg = memoryLevel(level);
        return cfg.kind === "scene" ? buildShelves(cfg, 6, random) : null;
    },
    missing: (level, random) => buildMissingLevel(level, { ...opts, random }),
    numbers: (level, random) => buildNumbersLevel(level, { ...opts, random }),
    puzzle: (level, random) => buildPuzzleLevel(level, { maxRounds: 8, random }),
    sequence: (level, random) => buildSequenceLevel(level, { maxSteps: 4, random }),
    shapes: (level, random) => {
        const cfg = SHAPE_LEVELS[shapeLevelIndex(level)];
        return buildShapePlan(cfg, { rounds: cfg.rounds, options: Math.min(cfg.options, 4), warmUp: false }, random);
    },
    sorting: (level, random) => buildSortLevel(level, { maxBaskets: 4, maxRounds: 8, random }),
    sound: (level, random) => buildSoundRounds(level, { loudSounds: false, maxRounds: 8, maxOptions: 4 }, random),
    uses: (level, random) => buildUsesLevel(level, { ...opts, random }),
    weather: (level, random) => buildWeatherLevel(level, { ...opts, random }),
    where: (level, random) => buildWhereLevel(level, { ...opts, random }),
    words: (level, random) => buildWordsLevel(level, { ...opts, random }),
    opposites: (level, random) => buildOppositesLevel(level, { ...opts, random }),
    syllables: (level, random) => buildSyllablesLevel(level, { ...opts, random }),
    jobs: (level, random) => buildJobsLevel(level, { ...opts, random }),
    habitats: (level, random) => buildHabitatsLevel(level, { ...opts, random }),
    seasons: (level, random) => buildSeasonsLevel(level, { ...opts, random }),
    body: (level, random) => buildBodyLevel(level, { ...opts, random }),
    traffic: (level, random) => buildTrafficLevel(level, { ...opts, random }),
    breathing: (level, random) => buildBreathingLevel(level, { maxRounds: 8, random }),
    simon: (level, random) => buildSimonLevel(level, { maxRounds: 8, random }),
    rhythm: (level, random) => buildRhythmLevel(level, { maxRounds: 8, random }),
    mixcolors: (level, random) => buildMixLevel(level, { ...opts, random }),
    plant: (level, random) => buildPlantLevel(level, { ...opts, random }),
    hygiene: (level, random) => buildHygieneLevel(level, { ...opts, random }),
};

describe("seme zadataka", () => {
    it("the generator is deterministic, in [0, 1), and different seeds differ", () => {
        const a = seededRandom("abcdefgh12345678");
        const b = seededRandom("abcdefgh12345678");
        const c = seededRandom("abcdefgh12345679");
        const xs = Array.from({ length: 200 }, () => a());
        assert.deepEqual(Array.from({ length: 200 }, () => b()), xs);
        assert.notDeepEqual(Array.from({ length: 200 }, () => c()), xs);
        assert.ok(xs.every((x) => x >= 0 && x < 1));
        // Grubo ravnomerno: svaka četvrtina dobije bar 30 od 200
        for (let q = 0; q < 4; q++) assert.ok(xs.filter((x) => x >= q / 4 && x < (q + 1) / 4).length >= 30, `četvrtina ${q}`);
    });

    it("each match of a session has its own seed (rematch = new tasks, still the same for both)", () => {
        assert.equal(duelSeed("S", "shapes", 2, 0), duelSeed("S", "shapes", 2, 0));
        assert.notEqual(duelSeed("S", "shapes", 2, 0), duelSeed("S", "shapes", 2, 1));
        assert.notEqual(duelSeed("S", "shapes", 2, 0), duelSeed("S", "shapes", 3, 0));
        assert.equal(cleanSeed("abcdefgh"), "abcdefgh");
        assert.equal(cleanSeed("<script>"), null);
        assert.equal(cleanSeed(42), null);
    });

    it("shuffle follows the given source", () => {
        const list = Array.from({ length: 20 }, (_, i) => i);
        assert.deepEqual(shuffle(list, seededRandom("seed-one-xyz")), shuffle(list, seededRandom("seed-one-xyz")));
        assert.notDeepEqual(shuffle(list, seededRandom("seed-one-xyz")), shuffle(list, seededRandom("seed-two-xyz")));
    });
});

describe("isto seme — isti nivo, u svakoj igri", () => {
    for (const [name, build] of Object.entries(BUILDERS)) {
        it(`${name}: every level is identical for the same seed`, () => {
            let differs = false;
            for (const level of LEVELS) {
                const seed = duelSeed("sessionSeed123", name, level, 0);
                const one = build(level, seededRandom(seed));
                const two = build(level, seededRandom(seed));
                assert.deepEqual(two, one, `${name} nivo ${level}`);
                if (JSON.stringify(build(level, seededRandom(`${seed}-drugo`))) !== JSON.stringify(one)) differs = true;
            }
            // Seme zaista bira zadatke (bar na nekom nivou drugo seme daje drugo)
            assert.ok(differs, `${name}: seme ne utiče na zadatke`);
        });
    }

    it("every game takes its tasks from useGameRandom, and visual-only randomness stays unseeded", () => {
        const games = [
            "Backpack", "Clock", "Coloring", "Counting", "Differences", "Emotions", "Family", "Food", "Gaze", "Inset", "Letters", "Market", "Maze", "Memory",
            "Missing", "Numbers", "Puzzle", "Sequence", "ShapeMatching", "SocialCommunication", "SocialStory", "Sorting", "SoundToImage", "Uses", "Weather", "Where", "Words",
            "Opposites", "Syllables", "Jobs", "Habitats", "Seasons", "Body", "Traffic",
            "Breathing", "Simon", "Rhythm", "MixColors", "Plant", "Hygiene",
        ];
        for (const game of games) {
            const source = read(`app/components/games/${game}Game.tsx`) + (game === "Memory" ? read("app/components/games/MemoryScene.tsx") : "");
            assert.match(source, /useGameRandom\(\)/, game);
            assert.doesNotMatch(source, /Math\.random/, game);
        }
        // Konfete i pohvale nisu zadaci: ostaju nasumične
        assert.match(read("app/components/games/kit/Celebration.tsx"), /Math\.random/);
    });
});
