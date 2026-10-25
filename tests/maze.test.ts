// Igra „Lavirint” (app/components/games/data/mazeLevels.ts): pravljenje lavirinta iz semena,
// rešivost, nivoi, kretanje lika, bodovanje i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    buildMaze,
    buildMazeLevel,
    canStep,
    carveMaze,
    cellPx,
    closedDoorOf,
    corridorMaze,
    deadEnds,
    emptyMazeView,
    extendTrail,
    findPath,
    fitMazeSize,
    hintPath,
    isEmptyDeadEnd,
    MAZE_LEVELS,
    MAZE_MAX_LEVEL,
    MAZE_TRIPS,
    mazeDone,
    mazeIntro,
    mazeResult,
    mazeRoundView,
    mergeMazeMonitor,
    MIN_CELL_PX,
    nextTarget,
    openNeighbors,
    seededRandom,
    solveMazeView,
    turnsOf,
    walkToward,
    type Maze,
    type MazeView,
} from "@/app/components/games/data/mazeLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
/** Polja za igru na ekranima koje igra mora da podrži (px, bez trake i uputstva) */
const BOXES: readonly [number, number][] = [
    [0, 0],
    [340, 470], // 360 × 740
    [370, 560], // 390 × 844
    [410, 650], // 430 × 932
    [560, 250], // položen telefon 844 × 390
    [700, 640], // uspravan tablet
    [640, 420], // položen tablet, laptop
];

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

/** Lavirint je rešiv: od starta do cilja (preko ključa kad su vrata zaključana) i do svake zvezdice */
function assertSolvable(maze: Maze, where: string) {
    const door = maze.key !== null ? maze.door : null;
    if (door) {
        assert.equal(findPath(maze, maze.start, maze.goal, door), null, `${where}: zaključana vrata ne zatvaraju put`);
        assert.ok(findPath(maze, maze.start, maze.key!, door), `${where}: do ključa se ne stiže`);
        assert.ok(findPath(maze, maze.key!, maze.goal), `${where}: od ključa do cilja nema puta`);
    }
    const solution = findPath(maze, maze.start, maze.goal);
    assert.ok(solution, `${where}: nema puta do cilja`);
    for (const star of maze.stars) assert.ok(findPath(maze, maze.start, star, door), `${where}: zvezdica ${star} je nedostižna`);
    // Prolazi su uvek obostrani (zid vidi isto sa obe strane)
    maze.open.forEach((bits, cell) => {
        for (const next of openNeighbors(maze, cell)) assert.ok(canStep(maze, next, cell), `${where}: jednosmeran prolaz ${cell}→${next}`);
        if (bits === 0) assert.deepEqual(openNeighbors(maze, cell), [], `${where}: trava ima prolaz`);
    });
}

describe("maze generation", () => {
    it("carves a perfect maze: every cell reachable, exactly one path between any two", () => {
        for (let seed = 1; seed <= 40; seed += 1) {
            const grid = carveMaze(7, 6, seededRandom(seed));
            const edges = grid.open.reduce((sum, _bits, cell) => sum + openNeighbors(grid, cell).length, 0) / 2;
            assert.equal(edges, 7 * 6 - 1, `seme ${seed}: drvo ima n − 1 prolaza`);
            for (let cell = 0; cell < 42; cell += 1) assert.ok(findPath(grid, 0, cell), `seme ${seed}: ćelija ${cell}`);
        }
    });

    it("gives the same maze for the same seed, and a different one for another seed", () => {
        const rule = MAZE_LEVELS[10];
        assert.deepEqual(buildMaze(rule, 0, 1234, { width: 400, height: 500 }), buildMaze(rule, 0, 1234, { width: 400, height: 500 }));
        assert.notDeepEqual(buildMaze(rule, 0, 1234).open, buildMaze(rule, 0, 99).open);
    });

    it("builds solvable mazes for every level, seed and screen", () => {
        for (const level of LEVELS) {
            const rule = MAZE_LEVELS[level - 1];
            for (let seed = 1; seed <= 25; seed += 1) {
                for (const [w, h] of BOXES) {
                    for (let index = 0; index < rule.mazes; index += 1) {
                        const maze = buildMaze(rule, index, seed * 7919 + level, { width: w, height: h });
                        assertSolvable(maze, `nivo ${level}, seme ${seed}, ${w}×${h}, lavirint ${index + 1}`);
                        if (!rule.shapes) assert.ok(maze.solution.length >= maze.cols + maze.rows + 1, `nivo ${level}: put vijuga`);
                    }
                }
            }
        }
    });

    it("keeps every cell at least 44 px on phones by fitting the maze to the screen", () => {
        for (const level of LEVELS) {
            const rule = MAZE_LEVELS[level - 1];
            for (const [w, h] of BOXES.slice(1)) {
                const maze = buildMaze(rule, 0, level * 31, { width: w, height: h });
                assert.ok(cellPx(maze, w, h) >= MIN_CELL_PX, `nivo ${level} na ${w}×${h}: ćelija ${cellPx(maze, w, h).toFixed(1)} px (${maze.cols}×${maze.rows})`);
            }
        }
        // Veliki lavirint na uskom telefonu: manje kolona, više redova (približno isto ćelija)
        assert.deepEqual(fitMazeSize([8, 8], 340, 470), [7, 9]);
        assert.deepEqual(fitMazeSize([8, 8], 560, 250), [12, 5]);
        assert.deepEqual(fitMazeSize([6, 6], 900, 700), [6, 6]);
    });
});

describe("maze levels", () => {
    it("has fifteen levels", () => {
        assert.equal(MAZE_LEVELS.length, 15);
        assert.equal(MAZE_MAX_LEVEL, MAX_LEVEL);
    });

    it("starts with a straight corridor, then one turn, then two or three — always with the guide line", () => {
        const turns = (level: number) => (MAZE_LEVELS[level - 1].shapes ?? []).map((shape) => turnsOf(corridorMaze(shape)));
        assert.deepEqual(turns(1), [0, 0, 0]);
        assert.deepEqual(turns(2), [1, 1, 1]);
        for (const level of [3, 4, 5]) for (const t of turns(level)) assert.ok(t >= 2 && t <= 3, `nivo ${level}: ${t} skretanja`);
        for (const level of [1, 2, 3, 4, 5]) {
            const rule = MAZE_LEVELS[level - 1];
            assert.equal(rule.guide, "full");
            assert.ok(rule.earlyHint);
            for (const shape of rule.shapes!) assert.equal(deadEnds(corridorMaze(shape)).length, 0, `nivo ${level}: hodnik bez ćorsokaka`);
        }
    });

    it("then small mazes with one dead end and a fading guide, then stars on the way", () => {
        const middle = MAZE_LEVELS.slice(5, 10);
        assert.deepEqual(
            middle.map((rule) => rule.guide),
            ["full", "faint", "start", "none", "none"]
        );
        assert.deepEqual(
            middle.map((rule) => rule.size),
            [
                [4, 4],
                [4, 4],
                [5, 5],
                [5, 5],
                [5, 5],
            ]
        );
        for (const [i, rule] of middle.entries()) {
            for (let seed = 1; seed <= 20; seed += 1) {
                const maze = buildMaze(rule, 0, seed * 101);
                assert.equal(deadEnds(maze).length, 1, `nivo ${i + 6}, seme ${seed}: tačno jedan ćorsokak`);
                if (rule.stars !== "none") assert.equal(maze.stars.length, 3, `nivo ${i + 6}: tri zvezdice`);
                if (rule.stars === "path") for (const star of maze.stars) assert.ok(maze.solution.includes(star), "zvezdica na putu");
                if (rule.stars === "branch") assert.equal(maze.stars.filter((star) => !maze.solution.includes(star)).length, 1, "jedna zvezdica u ćorsokaku");
            }
        }
    });

    it("ends with bigger mazes, several dead ends and no guide, then a key before a door", () => {
        const hard = MAZE_LEVELS.slice(10);
        for (const rule of hard) assert.equal(rule.guide, "none");
        assert.deepEqual(
            hard.map((rule) => rule.size?.[0]),
            [6, 7, 8, 7, 8]
        );
        for (let seed = 1; seed <= 20; seed += 1) {
            for (const [i, rule] of hard.entries()) {
                const maze = buildMaze(rule, 0, seed * 37);
                assert.ok(deadEnds(maze).length >= 3, `nivo ${i + 11}: više ćorsokaka`);
                if (rule.key === "none") continue;
                assert.ok(maze.key !== null && maze.door !== null, `nivo ${i + 11}: ključ i vrata`);
                assert.ok(maze.solution.includes(maze.door![0]) && maze.solution.includes(maze.door![1]), "vrata su na putu do cilja");
                assert.equal(maze.solution.includes(maze.key!), rule.key === "path", `nivo ${i + 11}: ključ ${rule.key === "path" ? "na putu" : "u bočnom hodniku"}`);
            }
        }
    });

    it("plans a few mazes per level with changing characters, never the child's own name", () => {
        for (const level of LEVELS) {
            for (const band of Object.values(BAND_PRESETS)) {
                const plan = buildMazeLevel(level, { maxRounds: band.maxRounds, random: seeded(level), childName: "Amar" });
                assert.ok(plan.rounds.length >= 2 && plan.rounds.length <= 3, `nivo ${level}: ${plan.rounds.length} lavirinta`);
                for (let i = 1; i < plan.rounds.length; i += 1) assert.notEqual(plan.rounds[i].hero, plan.rounds[i - 1].hero);
                for (const round of plan.rounds) assert.notEqual(round.hero, "amar");
            }
        }
        assert.equal(buildMazeLevel(1, { maxRounds: 5, random: seeded(3) }).rounds[0].hero, "amar");
    });

    it("never tells the child where to tap, in Serbian Latin and Cyrillic", () => {
        for (const t of MAZE_TRIPS) {
            const maze = { stars: [1, 2, 3], key: 4 };
            for (const text of [mazeIntro(t.hero, maze), mazeDone(t.hero)]) {
                assert.doesNotMatch(text, /dodirni|prevuci|pritisni|ovde|klikni/i, text);
                assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
            }
        }
    });
});

describe("maze movement", () => {
    const corridor = corridorMaze("EESS"); // 3 × 3: desno, desno, dole, dole

    it("follows the finger along the path and around corners", () => {
        assert.deepEqual(walkToward(corridor, 0, 2.5, 2.5), [1, 2, 5, 8]);
        assert.deepEqual(walkToward(corridor, 0, 1.6, 0.5), [1]);
        // Prst jedva pomeren: lik još stoji
        assert.deepEqual(walkToward(corridor, 0, 0.9, 0.5), []);
    });

    it("never walks through a wall or a hedge to reach the finger", () => {
        // Prst je ispod starta, a tamo je trava: lik ostaje
        assert.deepEqual(walkToward(corridor, 0, 0.5, 1.5), []);
        // Savršen lavirint: susedna ćelija iza zida nikad nije prvi korak
        for (let seed = 1; seed <= 30; seed += 1) {
            const maze = buildMaze(MAZE_LEVELS[11], 0, seed);
            for (let cell = 0; cell < maze.open.length; cell += 1) {
                for (const target of [cell - 1, cell + 1, cell - maze.cols, cell + maze.cols]) {
                    if (target < 0 || target >= maze.open.length || canStep(maze, cell, target)) continue;
                    if (Math.abs((target % maze.cols) - (cell % maze.cols)) > 1) continue;
                    const x = (target % maze.cols) + 0.5;
                    const y = Math.floor(target / maze.cols) + 0.5;
                    const steps = walkToward(maze, cell, x, y);
                    if (steps.length > 0) assert.ok(canStep(maze, cell, steps[0]), `seme ${seed}: ${cell}→${steps[0]}`);
                    assert.ok(!steps.includes(target) || steps.length >= 3, `seme ${seed}: ${cell} kroz zid do ${target}`);
                }
            }
        }
    });

    it("stops at a locked door until the key is taken", () => {
        const maze = buildMaze(MAZE_LEVELS[13], 0, 77);
        const [a, b] = maze.door!;
        const view = { ...emptyMazeView(2), ...mazeRoundView(maze, { seed: 77, hero: "lejla" }, 0, "none") } as MazeView;
        const locked = closedDoorOf(view);
        assert.ok(!canStep(maze, a, b, locked));
        assert.ok(canStep(maze, a, b, closedDoorOf({ ...view, hasKey: true })));
        assert.equal(nextTarget(view), maze.key);
        assert.equal(nextTarget({ ...view, hasKey: true }), maze.goal);
        assert.equal(hintPath(view).at(-1), maze.key);
    });

    it("keeps the trail as the path from the start, shortening it when walking back", () => {
        assert.deepEqual(extendTrail([0, 1, 2], 5), [0, 1, 2, 5]);
        assert.deepEqual(extendTrail([0, 1, 2, 5], 2), [0, 1, 2]);
        assert.deepEqual(extendTrail([0, 1, 2], 1), [0, 1]);
    });

    it("counts only empty dead ends as dead ends (a star or the key is a reason to go there)", () => {
        const rule = MAZE_LEVELS[9];
        const maze = buildMaze(rule, 0, 5);
        const [dead] = deadEnds(maze);
        assert.equal(isEmptyDeadEnd(maze, dead), !maze.stars.includes(dead));
        assert.equal(isEmptyDeadEnd(maze, maze.goal), false);
        assert.equal(isEmptyDeadEnd(maze, maze.start), false);
    });
});

describe("maze scoring", () => {
    const view = (extra: Partial<MazeView> = {}): MazeView => ({ ...emptyMazeView(3), ...extra });

    it("does not score the demonstrated first maze of level 1", () => {
        const { next, modeled } = solveMazeView(view(), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount, 0);
        assert.equal(next.promptedCount, 0);
    });

    it("counts a maze without help as correct, with help as prompted", () => {
        assert.equal(solveMazeView(view(), 4).next.correctCount, 1);
        const helped = solveMazeView(view({ helped: true }), 4).next;
        assert.equal(helped.correctCount, 0);
        assert.equal(helped.promptedCount, 1);
    });

    it("reports correct + prompted ≤ total, without the demo maze", () => {
        const result = mazeResult(view({ correctCount: 3, promptedCount: 3, totalRounds: 3 }), 1, 40);
        assert.equal(result.total, 2);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const maze = buildMaze(MAZE_LEVELS[8], 0, 9);
        const merged = mergeMazeMonitor({ maze, pos: 999, trail: [0, 1, -3, 1.5] as number[], starsGot: [maze.stars[0], 2000], hero: "dragon" as never, guide: "x" as never });
        assert.deepEqual(merged.maze?.open, maze.open);
        assert.equal(merged.pos, maze.start);
        assert.deepEqual(merged.trail, [0, 1]);
        assert.deepEqual(merged.starsGot, [maze.stars[0]]);
        assert.equal(merged.hero, MAZE_TRIPS[0].hero);
        assert.equal(merged.guide, "none");
        assert.equal(mergeMazeMonitor({ maze: { cols: 99, rows: 2, open: [] } as never }).maze, null);
    });
});

describe("maze game registry entry", () => {
    const game = getGame("maze");

    it("is activity 23, graded, in the motor category, with a cover and its own colour", () => {
        assert.equal(game.activityId, 23);
        assert.equal(game.gameType, "maze");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0018_maze_game.sql"), "utf8");
        assert.match(sql, /\(23, 'Lavirint', '[^']+', 'motor'/);
        assert.match(readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8"), /--color-moss-500/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("maze"));
        assert.ok(isRemoteGame("maze"));
    });
});
