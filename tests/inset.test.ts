// Igra „Umetaljka” (app/components/games/data/insetLevels.ts): oblici, nivoi, okretanje,
// bodovanje i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    areSimilar,
    buildInsetLevel,
    emptyInsetView,
    fitsHole,
    getInsetShape,
    INSET_LEVELS,
    INSET_MAX_LEVEL,
    INSET_SHAPES,
    insetIntro,
    insetResult,
    insetRounds,
    mergeInsetMonitor,
    placedSentence,
    SIMILAR_PAIRS,
    solveInsetView,
    type InsetView,
} from "@/app/components/games/data/insetLevels";
import { PIECE_PALETTE, SHAPE_KEYS, SHAPE_PATHS } from "@/app/components/games/kit/shapePaths";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

describe("inset shapes", () => {
    it("has an outline, a colour and a name for every shape", () => {
        assert.equal(new Set(INSET_SHAPES.map((shape) => shape.id)).size, INSET_SHAPES.length);
        for (const shape of INSET_SHAPES) {
            assert.ok(SHAPE_PATHS[shape.id].length > 0, shape.id);
            for (const d of SHAPE_PATHS[shape.id]) assert.match(d, /^M[\d.\- ]/, `${shape.id}: obris`);
            assert.ok(PIECE_PALETTE[shape.color], shape.id);
            assert.ok(shape.name.trim().length > 0);
            assert.doesNotMatch(toCyrillic(placedSentence(shape.id)), /\p{Script=Latin}/u, shape.id);
        }
        // Svaki obris u kit-u ima koordinate unutar okvira 100 × 100 (uz malo prostora za ivicu)
        for (const key of SHAPE_KEYS) {
            for (const d of SHAPE_PATHS[key]) {
                for (const n of d.match(/-?\d+(\.\d+)?/g) ?? []) assert.ok(Number(n) >= -1 && Number(n) <= 101, `${key}: ${n}`);
            }
        }
    });

    it("has similar pairs made only of known shapes", () => {
        for (const [a, b] of SIMILAR_PAIRS) {
            assert.ok(getInsetShape(a) && getInsetShape(b), `${a}–${b}`);
            assert.ok(areSimilar(a, b) && areSimilar(b, a));
        }
        assert.ok(!areSimilar("circle", "star"));
    });

    it("fits a piece only into its own hole, turned the right way", () => {
        assert.ok(fitsHole("circle", 90, "circle"), "krug ulazi okrenut");
        assert.ok(fitsHole("square", 270, "square"));
        assert.ok(fitsHole("rectangle", 180, "rectangle"));
        assert.ok(!fitsHole("rectangle", 90, "rectangle"), "uspravan pravougaonik ne ulazi u položenu rupu");
        assert.ok(!fitsHole("triangle", 180, "triangle"));
        assert.ok(fitsHole("triangle", 360, "triangle"));
        assert.ok(!fitsHole("square", 0, "rectangle"), "kvadrat ne ulazi u pravougaonik");
        assert.ok(!fitsHole("circle", 0, "oval"));
    });
});

describe("inset levels", () => {
    it("has fifteen levels", () => {
        assert.equal(INSET_MAX_LEVEL, 15);
        assert.equal(INSET_LEVELS.length, MAX_LEVEL);
    });

    it("builds every level for every age band: one piece per hole, turned pieces only where turning matters", () => {
        for (const level of LEVELS) {
            for (const preset of Object.values(BAND_PRESETS)) {
                for (let seed = 1; seed <= 8; seed += 1) {
                    const plan = buildInsetLevel(level, { maxRounds: preset.maxRounds, random: seeded(seed * 17 + level) });
                    const rule = INSET_LEVELS[level - 1];
                    const where = `L${level} ${preset.label} s${seed}`;
                    assert.ok(plan.boards.length >= 1 && insetRounds(plan) >= 2, where);
                    let previous: string[] | null = null;
                    for (const board of plan.boards) {
                        assert.equal(board.holes.length, rule.holes, `${where}: rupe`);
                        assert.equal(new Set(board.holes).size, board.holes.length, `${where}: bez dve iste rupe`);
                        assert.deepEqual([...board.tray].sort(), [...board.holes].sort(), `${where}: komad za svaku rupu`);
                        for (const id of board.holes) assert.ok(rule.pool.includes(id), `${where}: ${id} iz skupa nivoa`);
                        for (const id of board.tray) {
                            // Svaki komad ulazi u tačno jednu rupu (kad se okrene kako treba)
                            assert.equal(board.holes.filter((hole) => fitsHole(id, 0, hole)).length, 1, `${where}: ${id}`);
                        }
                        for (const [id, rot] of Object.entries(board.rot)) {
                            assert.ok(!fitsHole(id as never, rot!, id as never), `${where}: ${id} okrenut za ${rot}° zaista ne ulazi`);
                        }
                        assert.equal(Object.keys(board.rot).length, Math.min(rule.rotated, board.holes.filter((id) => getInsetShape(id)!.turns < 4).length), `${where}: okrenuti`);
                        assert.equal(board.rotate, Object.keys(board.rot).length > 0);
                        if (rule.similar === "apart") {
                            for (const a of board.holes) for (const b of board.holes) assert.ok(a === b || !areSimilar(a, b), `${where}: ${a} i ${b} su slični`);
                        }
                        if (rule.similar === "together") {
                            assert.ok(board.holes.some((a) => board.holes.some((b) => areSimilar(a, b))), `${where}: bar jedan sličan par`);
                        }
                        if (previous && rule.pool.length > rule.holes) assert.notDeepEqual([...board.holes].sort(), previous, `${where}: ista tabla zaredom`);
                        previous = [...board.holes].sort();
                    }
                }
            }
        }
    });

    it("starts with two basic holes in colour, the circle demonstrated first", () => {
        const plan = buildInsetLevel(1, { maxRounds: 5, random: seeded(2) });
        assert.equal(plan.boards.length, 3);
        assert.equal(insetRounds(plan), 6);
        assert.deepEqual([...plan.boards[0].holes].sort(), ["circle", "square"]);
        assert.equal(plan.boards[0].tray[0], "circle");
        assert.ok(plan.boards.every((board) => board.tint && !board.rotate));
        assert.ok(plan.earlyHint);
    });

    it("moves from shapes to objects, then turned pieces, then plain silhouettes with more holes", () => {
        const kinds = (level: number) => new Set(INSET_LEVELS[level - 1].pool.map((id) => getInsetShape(id)!.kind));
        assert.deepEqual([...kinds(1)], ["basic"]);
        assert.ok(!kinds(6).has("object"));
        assert.deepEqual([...kinds(9)], ["object"]);
        assert.ok(INSET_LEVELS.slice(0, 10).every((rule) => rule.rotated === 0));
        assert.ok(INSET_LEVELS[10].rotated > 0 && INSET_LEVELS[11].rotated > 0);
        assert.ok(INSET_LEVELS.slice(12).every((rule) => rule.plain && rule.holes >= 6));
        assert.ok(INSET_LEVELS.slice(0, 5).every((rule) => rule.earlyHint));
    });

    it("never tells the child where to tap", () => {
        for (const level of LEVELS) {
            const plan = buildInsetLevel(level, { maxRounds: 8, random: seeded(level) });
            for (const board of plan.boards) assert.doesNotMatch(insetIntro(board), /dodirni|prevuci|ovde|klikni/i);
        }
    });
});

describe("inset scoring", () => {
    const view = (extra: Partial<InsetView> = {}): InsetView => ({ ...emptyInsetView(6), ...extra });

    it("does not score the demonstrated first piece of level 1", () => {
        const { next, modeled } = solveInsetView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts first try as correct, help as prompted, a miss as neither", () => {
        assert.equal(solveInsetView(view({ round: 3 }), 2).next.correctCount, 1);
        assert.equal(solveInsetView(view({ round: 3, hintPiece: "star" }), 2).next.promptedCount, 1);
        const missed = solveInsetView(view({ round: 3, wrong: ["star>heart"] }), 2).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = insetResult(view({ totalRounds: 6, correctCount: 5, promptedCount: 5 }), 1, 20);
        assert.equal(result.total, 5);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeInsetMonitor({ holes: ["circle", "dragon", "star"], tray: ["star", "circle", "x"], filled: ["star"], rot: { star: 45, circle: 90 }, selected: "x" } as Partial<InsetView>);
        assert.deepEqual(merged.holes, ["circle", "star"]);
        assert.deepEqual(merged.tray, ["star", "circle"]);
        assert.deepEqual(merged.rot, { star: 0, circle: 90 });
        assert.equal(merged.selected, null);
    });
});

describe("inset game registry entry", () => {
    const game = getGame("inset");

    it("is activity 19, graded, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 19);
        assert.equal(game.gameType, "inset");
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0014_inset_board.sql"), "utf8");
        assert.match(sql, /\(19, 'Umetaljka', '[^']+', 'motor'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("inset"));
        assert.ok(isRemoteGame("inset"));
    });
});
