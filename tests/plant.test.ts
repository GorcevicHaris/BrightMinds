// Igra „Posadi cvet” (app/components/games/data/plantLevels.ts): nivoi, redosled nege, ponuđene
// stvari, objašnjenja, stanje za monitor i upis u registar igara.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PETALS, TOOLS, buildPlantLevel, emptyPlantView, mergePlantMonitor, plantRule, whyNot, type Cond, type PlantKind, type PlantView } from "@/app/components/games/data/plantLevels";
import { GardenSprout, PlantScene, ToolArt } from "@/app/components/games/plant/PlantArt";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { seededRandom } from "@/lib/seededRandom";
import { versusFormat } from "@/lib/versusFormat";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const EMOJI = /\p{Extended_Pictographic}/u;
const WHERE_TO_TAP = /dodirni|pritisni|klikni|prevuci/i;

describe("nivoi", () => {
    const settings = [
        { maxChoices: 2, maxRounds: BAND_PRESETS.young.maxRounds },
        { maxChoices: 4, maxRounds: BAND_PRESETS.middle.maxRounds },
        { maxChoices: 6, maxRounds: BAND_PRESETS.older.maxRounds },
    ];

    for (const level of LEVELS) {
        it(`level ${level}: right tool always offered, few choices, plants grow and end in bloom`, () => {
            const rule = plantRule(level);
            for (const opts of settings) {
                for (let seed = 0; seed < 5; seed += 1) {
                    const steps = buildPlantLevel(level, { ...opts, random: seededRandom(`plant-${level}-${seed}`) });
                    assert.ok(steps.length >= 2 && steps.length <= opts.maxRounds + 2, `${level}: ${steps.length}`);
                    for (const step of steps) {
                        assert.ok(step.tools.includes(step.need));
                        assert.equal(new Set(step.tools).size, step.tools.length);
                        assert.equal(step.tools.length, Math.max(2, Math.min(rule.tools, opts.maxChoices)));
                        assert.ok(step.next > step.stage, "the plant grows");
                        assert.ok(step.explain.length > 10);
                        assert.ok((PETALS as readonly string[]).includes(step.petal));
                        assert.equal(step.bubble, level <= 5, "need bubble only on easy levels");
                    }
                    // Svaka biljka se završi cvetom (plodom)
                    const last = new Map<number, number>();
                    for (const step of steps) last.set(step.plantIndex, step.next);
                    for (const [index, next] of last) assert.equal(next, 6, `${level}: plant ${index}`);
                }
            }
        });
    }

    it("easy levels go seed → water → sun with the need in a bubble", () => {
        const steps = buildPlantLevel(1, { maxChoices: 4, maxRounds: 6, random: seededRandom("easy") });
        assert.deepEqual(steps.map((s) => s.need), ["seed", "water", "sun", "seed", "water", "sun"]);
        assert.ok(steps.every((s) => s.tools.length === 2));
    });

    it("medium levels add digging and weeding, shown only by the plant", () => {
        const needs = new Set(LEVELS.slice(5, 10).flatMap((level) => buildPlantLevel(level, { maxChoices: 4, maxRounds: 8, random: seededRandom(`m${level}`) }).map((s) => s.need)));
        assert.ok(needs.has("shovel") && needs.has("gloves"));
    });

    it("hard levels have different plants with different needs (cactus, tomato, too much water)", () => {
        const all = LEVELS.slice(10).flatMap((level) => buildPlantLevel(level, { maxChoices: 6, maxRounds: 8, random: seededRandom(`h${level}`) }));
        assert.ok(new Set(all.map((s) => s.plant)).size >= 4);
        assert.ok(all.some((s) => s.need === "pot"));
        // Kad je zamka voda (mokra zemlja, kaktus u hladu), voda je uvek ponuđena
        for (const s of all) if (s.need === "sun" && (s.cond === "wet" || s.cond === "moist-cloud")) assert.ok(s.tools.includes("water"));
    });
});

describe("objašnjenja", () => {
    it("explains calmly why another tool does not help now", () => {
        const base = { need: "water" as const, stage: 2 as const, cond: "dry" as Cond, plant: "flower" as PlantKind };
        assert.equal(whyNot(base, "seed"), "Seme je već u zemlji.");
        assert.equal(whyNot({ ...base, stage: 0 }, "seed"), "Prvo treba iskopati rupu za seme.");
        assert.equal(whyNot({ ...base, need: "sun", cond: "wet", stage: 5 }, "water"), "Zemlja je još mokra. Previše vode šteti biljci.");
        assert.equal(whyNot({ ...base, need: "sun", cond: "cloud", stage: 3 }, "water"), "Biljka sada nije žedna.");
        for (const tool of TOOLS) assert.ok(whyNot(base, tool.id).length > 5, tool.id);
    });
});

describe("stanje za monitor", () => {
    it("starts empty and rejects unknown values", () => {
        assert.equal(emptyPlantView(0).totalRounds, 1);
        const merged = mergePlantMonitor({
            need: "water",
            tools: ["water", "sun", "hammer"],
            plant: "palm",
            stage: 99,
            cond: "fire",
            garden: [{ plant: "flower", petal: PETALS[0] }, { plant: "x", petal: "#000" }],
            plantsTotal: 1,
            round: 7,
            totalRounds: 3,
        } as unknown as Partial<PlantView>);
        assert.deepEqual(merged.tools, ["water", "sun"]);
        assert.equal(merged.plant, "flower");
        assert.equal(merged.stage, 6);
        assert.equal(merged.cond, "none");
        assert.equal(merged.garden.length, 1);
        assert.equal(merged.round, 3);
        assert.equal(mergePlantMonitor({ need: "pot", tools: ["water"] }).need, "");
    });
});

describe("crteži i tekstovi", () => {
    it("draws every stage, condition and tool without emoji or broken numbers", () => {
        const kinds: PlantKind[] = ["flower", "tulip", "sunflower", "tomato", "cactus"];
        const conds: Cond[] = ["none", "dry", "cloud", "weeds", "wet", "cramped", "moist-cloud"];
        for (const plant of kinds) {
            for (let stage = 0; stage <= 6; stage += 1) {
                for (const cond of conds) {
                    for (const calm of [true, false]) {
                        const html = renderToStaticMarkup(createElement(PlantScene, { plant, stage, cond, petal: PETALS[1], bubble: "water", just: stage === 6 ? "sun" : null, calm }));
                        assert.doesNotMatch(html, /NaN|undefined/, `${plant} ${stage} ${cond}`);
                        if (calm) assert.doesNotMatch(html, /class="pa-/, "still when motion is calm");
                    }
                }
            }
            assert.doesNotMatch(renderToStaticMarkup(createElement(GardenSprout, { plant, petal: PETALS[0] })), /NaN/);
        }
        for (const tool of TOOLS) assert.doesNotMatch(renderToStaticMarkup(createElement(ToolArt, { id: tool.id })), EMOJI);
    });

    it("never tells the child where to tap and has no emoji in what is shown or said", () => {
        for (const file of ["app/components/games/PlantGame.tsx", "app/components/games/data/plantLevels.ts", "app/components/games/plant/PlantArt.tsx"]) {
            const source = read(file);
            assert.doesNotMatch(source, WHERE_TO_TAP, file);
            assert.doesNotMatch(source, EMOJI, file);
            assert.doesNotMatch(source, /Math\.random\(\)/, file);
        }
    });
});

describe("plant game registry entry", () => {
    const game = getGame("plant");

    it("is activity 47, graded, cognitive, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 47);
        assert.equal(game.gameType, "plant");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        assert.match(read("supabase/migrations/0026_calm_games.sql"), /\(47, 'Posadi cvet', '[^']+', 'cognitive'/);
    });

    it("can be played with a friend on one device and on two, taking turns in a duel", () => {
        assert.ok(isTogetherGame("plant"));
        assert.ok(isRemoteGame("plant"));
        assert.equal(versusFormat("plant"), "turns");
    });
});
