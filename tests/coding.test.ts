// Igra „Vodi robota” (app/components/games/data/codingLevels.ts): table, izvođenje programa,
// nivoi, ispravljanje greške, petlja, pomoć, rečenice, bodovanje, monitor i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    addCmd,
    buildCodingLevel,
    clearCmds,
    CMDS,
    codingLevel,
    CODING_LEVELS,
    CODING_MAX_LEVEL,
    codingQuestion,
    codingResult,
    codingRoundView,
    codingTitle,
    countWord,
    doneSentence,
    emptyCodingView,
    expand,
    hintSentence,
    hintTarget,
    MAX_SIDE,
    mergeCodingMonitor,
    mistakeSentence,
    nextZone,
    OBSTACLE_IDS,
    pathTip,
    programOf,
    selectFix,
    selectZone,
    simulate,
    solveCodingView,
    THEMES,
    THEME_IDS,
    undoCmd,
    type Board,
    type Cmd,
    type CodingRound,
    type CodingView,
} from "@/app/components/games/data/codingLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde|tu dole|tamo gore/i;

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

function plans(level: number, seeds = 5) {
    const result: { where: string; rounds: CodingRound[]; maxChoices: number; maxRounds: number }[] = [];
    for (const preset of Object.values(BAND_PRESETS)) {
        for (let seed = 1; seed <= seeds; seed += 1) {
            result.push({
                where: `L${level} ${preset.label} s${seed}`,
                rounds: buildCodingLevel(level, { maxRounds: preset.maxRounds, maxChoices: preset.maxChoices, random: seeded(seed * 31 + level) }),
                maxChoices: preset.maxChoices,
                maxRounds: preset.maxRounds,
            });
        }
    }
    return result;
}

const viewOf = (round: CodingRound, extra: Partial<CodingView> = {}): CodingView => ({ ...emptyCodingView(4), ...codingRoundView(round), ...extra });

/** Dete koje radi samo ono što pomoć pokaže: mora da stigne do cilja */
function followHints(round: CodingRound, start: Partial<CodingView> = {}): CodingView {
    let view = viewOf(round, start);
    for (let guard = 0; guard < 60; guard += 1) {
        const target = hintTarget(view);
        if (target.action === "run") return view;
        let patch: Partial<CodingView> | null = null;
        if (target.action.startsWith("cmd:")) patch = addCmd(view, target.action.slice(4) as Cmd);
        else if (target.action === "undo") patch = undoCmd(view);
        else if (target.action.startsWith("fix:")) patch = selectFix(view, Number(target.action.slice(4)));
        else if (target.action.startsWith("zone:")) patch = selectZone(view, target.action.slice(5) as "pre" | "loop");
        assert.ok(patch, `pomoć ${target.action} mora nešto da promeni`);
        view = { ...view, ...patch };
    }
    assert.fail("pomoć ne vodi do cilja");
}

describe("coding board and program runs", () => {
    // 4 × 3: start dole levo (8), cilj gore desno (3), kamen na 9, zvezda na 0
    const board: Board = { cols: 4, rows: 3, start: 8, goal: 3, obstacles: [{ cell: 9, kind: "rock" }], stars: [] };

    it("stops at the edge and in front of an obstacle, and says where it stopped", () => {
        assert.deepEqual(simulate(board, ["down"]), { outcome: "edge", cells: [8], got: [], at: 0, pos: 8, obstacle: null });
        const blocked = simulate(board, ["up", "right", "down"]);
        assert.equal(blocked.outcome, "blocked");
        assert.equal(blocked.obstacle, "rock");
        assert.equal(blocked.at, 2);
        assert.deepEqual(blocked.cells, [8, 4, 5]);
    });

    it("succeeds as soon as the goal is reached (extra arrows are not run), short when arrows run out", () => {
        const done = simulate(board, ["up", "up", "right", "right", "right", "down"]);
        assert.equal(done.outcome, "goal");
        assert.equal(done.at, 4);
        assert.equal(simulate(board, ["up", "up"]).outcome, "short");
        assert.equal(simulate(board, []).outcome, "short");
    });

    it("needs every star before the goal counts; passing over the goal is allowed", () => {
        const withStar: Board = { ...board, goal: 2, stars: [3] };
        assert.equal(simulate(withStar, ["up", "up", "right", "right"]).outcome, "stars");
        const run = simulate(withStar, ["up", "up", "right", "right", "right", "left"]);
        assert.equal(run.outcome, "goal");
        assert.deepEqual(run.got, [0]);
    });

    it("expands a loop body the given number of times", () => {
        assert.deepEqual(expand(["right"], ["up", "right"], 2), ["right", "up", "right", "up", "right"]);
        assert.deepEqual(programOf({ pre: ["up"], body: [], times: 3 }), ["up"]);
    });
});

describe("coding levels", () => {
    it("has fifteen levels in three tiers with a clear ramp", () => {
        assert.equal(CODING_MAX_LEVEL, 15);
        assert.equal(CODING_LEVELS.length, MAX_LEVEL);
        // Lako: samo slaganje puta, pomoć odmah, tragovi plana na prva četiri
        for (const level of [1, 2, 3, 4, 5]) {
            assert.equal(codingLevel(level).kind, "plan");
            assert.ok(codingLevel(level).earlyHint);
        }
        assert.deepEqual([1, 2, 3, 4, 5].map((level) => codingLevel(level).preview), [true, true, true, true, false]);
        assert.deepEqual(codingLevel(1).steps, [1, 1]);
        assert.equal(codingLevel(1).arrows, 2);
        // Srednje: veće table, zvezde, pa ispravljanje
        assert.deepEqual([6, 7, 8, 9, 10].map((level) => codingLevel(level).kind), ["plan", "plan", "plan", "debug", "debug"]);
        assert.ok(codingLevel(8).stars > codingLevel(7).stars);
        assert.ok(codingLevel(10).steps[0] > codingLevel(9).steps[1]);
        // Teško: petlja
        for (const level of [11, 12, 13, 14, 15]) {
            assert.equal(codingLevel(level).kind, "loop");
            assert.ok(!codingLevel(level).earlyHint);
        }
        assert.equal(codingLevel(13).body, 3);
        assert.deepEqual(codingLevel(14).pre, [1, 1]);
        assert.ok(codingLevel(15).free);
        // Najduži put raste kroz lake i srednje nivoe
        for (let level = 2; level <= 8; level += 1) assert.ok(codingLevel(level).steps[1] >= codingLevel(level - 1).steps[1], `nivo ${level}`);
    });

    it("builds valid, solvable rounds for every level, age band and seed", () => {
        for (const level of LEVELS) {
            const rule = codingLevel(level);
            for (const { where, rounds, maxChoices, maxRounds } of plans(level)) {
                assert.ok(rounds.length >= 2 && rounds.length <= Math.min(rule.rounds, maxRounds), `${where}: broj zadataka`);
                rounds.forEach((round, index) => {
                    const at = `${where} z${index + 1}`;
                    assert.ok(round.cols >= 3 && round.cols <= MAX_SIDE && round.rows >= 3 && round.rows <= MAX_SIDE, `${at}: veličina table`);
                    const size = round.cols * round.rows;
                    const cells = [round.start, round.goal, ...round.obstacles.map((o) => o.cell), ...round.stars];
                    assert.equal(new Set(cells).size, cells.length, `${at}: dve stvari na istom polju`);
                    for (const cell of cells) assert.ok(cell >= 0 && cell < size, `${at}: polje van table`);
                    for (const o of round.obstacles) assert.ok(THEMES[round.theme].obstacles.includes(o.kind), `${at}: prepreka iz druge teme`);
                    // Ponuđene strelice: bez ponavljanja, najmanje dve, najviše koliko dete sme da vidi, sve potrebne
                    const solution = expand(round.solution.pre, round.solution.body, round.times);
                    const needed = new Set([...round.solution.pre, ...round.solution.body]);
                    assert.equal(new Set(round.arrows).size, round.arrows.length, `${at}: iste strelice`);
                    assert.ok(round.arrows.length >= 2, `${at}: bar dve strelice`);
                    assert.ok(round.arrows.length <= Math.max(maxChoices, needed.size, 2) && round.arrows.length <= 4, `${at}: previše strelica`);
                    for (const cmd of needed) assert.ok(round.arrows.includes(cmd), `${at}: fali strelica ${cmd}`);
                    // Rešenje stiže do cilja i dužina puta je u granicama nivoa
                    assert.equal(simulate(round, solution).outcome, "goal", `${at}: rešenje`);
                    assert.ok(solution.length >= rule.steps[0] && solution.length <= rule.steps[1], `${at}: dužina ${solution.length}`);
                    if (round.kind === "plan") {
                        assert.ok(round.preSlots >= solution.length && round.preSlots <= 9, `${at}: mesta u traci`);
                        assert.equal(round.program.length, 0);
                        if (rule.stars > 0) assert.equal(round.stars.length, rule.stars, `${at}: zvezde`);
                    }
                    if (round.kind === "debug") {
                        const diff = round.program.map((cmd, i) => (cmd === round.solution.pre[i] ? -1 : i)).filter((i) => i >= 0);
                        assert.equal(round.program.length, round.solution.pre.length, `${at}: dužina programa`);
                        assert.equal(diff.length, 1, `${at}: tačno jedna pogrešna strelica`);
                        assert.notEqual(simulate(round, round.program).outcome, "goal", `${at}: pogrešan program ne sme da stigne`);
                        // Samo jedna izmena jedne strelice popravlja program — baš ona
                        for (let j = 0; j < round.program.length; j += 1) {
                            for (const cmd of round.arrows) {
                                if (cmd === round.program[j]) continue;
                                const fixed = [...round.program];
                                fixed[j] = cmd;
                                const ok = simulate(round, fixed).outcome === "goal";
                                assert.equal(ok, j === diff[0] && cmd === round.solution.pre[j], `${at}: izmena ${j}→${cmd}`);
                            }
                        }
                    }
                    if (round.kind === "loop") {
                        assert.ok(round.times >= 2, `${at}: petlja se ponavlja`);
                        assert.equal(round.solution.body.length, rule.body, `${at}: telo petlje`);
                        if (rule.free) {
                            assert.equal(round.limit, round.solution.pre.length + round.solution.body.length, `${at}: ograničenje strelica`);
                            assert.ok(solution.length > round.limit, `${at}: bez petlje ne može`);
                            assert.ok(round.stars.length >= 1, `${at}: zvezde na stepenicama`);
                        } else {
                            assert.equal(round.preSlots, round.solution.pre.length, `${at}: mesta pre petlje`);
                            assert.equal(round.bodySlots, round.solution.body.length, `${at}: mesta u petlji`);
                        }
                    }
                });
            }
        }
    });

    it("demonstrates level 1 with one step to the right on a 3 × 3 board, with two arrows", () => {
        for (const { rounds } of plans(1)) {
            const demo = rounds[0];
            assert.deepEqual([demo.cols, demo.rows], [3, 3]);
            assert.deepEqual(demo.solution.pre, ["right"]);
            assert.equal(demo.theme, "city");
            assert.equal(demo.arrows.length, 2);
        }
    });

    it("rotates the themes from round to round", () => {
        const rounds = buildCodingLevel(6, { maxRounds: 8, maxChoices: 4, random: seeded(3) });
        assert.deepEqual(
            rounds.map((round) => round.theme),
            rounds.map((_, i) => THEME_IDS[(5 + i) % THEME_IDS.length])
        );
    });

    it("is the same for the same seed and different for another seed", () => {
        for (const level of LEVELS) {
            const a = buildCodingLevel(level, { maxRounds: 6, maxChoices: 4, random: seeded(77) });
            const b = buildCodingLevel(level, { maxRounds: 6, maxChoices: 4, random: seeded(77) });
            assert.deepEqual(a, b, `nivo ${level}`);
            assert.doesNotThrow(() => JSON.parse(JSON.stringify(a)));
        }
        const differs = LEVELS.some((level) => JSON.stringify(buildCodingLevel(level, { maxRounds: 6, maxChoices: 4, random: seeded(1) })) !== JSON.stringify(buildCodingLevel(level, { maxRounds: 6, maxChoices: 4, random: seeded(2) })));
        assert.ok(differs);
    });
});

describe("coding program editing", () => {
    const flat = buildCodingLevel(6, { maxRounds: 3, maxChoices: 4, random: seeded(5) })[0];

    it("adds arrows up to the strip capacity, removes the last one and clears", () => {
        let view = viewOf(flat);
        for (let i = 0; i < flat.preSlots; i += 1) view = { ...view, ...addCmd(view, view.arrows[0]) };
        assert.equal(view.pre.length, flat.preSlots);
        assert.equal(nextZone(view), null);
        assert.equal(addCmd(view, view.arrows[0]), null, "traka je puna");
        view = { ...view, ...undoCmd(view) };
        assert.equal(view.pre.length, flat.preSlots - 1);
        assert.deepEqual(clearCmds(view), { pre: [], body: [], zone: "pre" });
        assert.equal(undoCmd(viewOf(flat)), null);
    });

    it("never takes an arrow that is not offered", () => {
        const round = buildCodingLevel(1, { maxRounds: 4, maxChoices: 3, random: seeded(9) })[0];
        const missing = CMDS.find((cmd) => !round.arrows.includes(cmd)) as Cmd;
        assert.equal(addCmd(viewOf(round), missing), null);
    });

    it("fills the steps before the loop first, then the loop body", () => {
        const round = buildCodingLevel(14, { maxRounds: 3, maxChoices: 4, random: seeded(4) })[0];
        let view = viewOf(round);
        assert.equal(nextZone(view), "pre");
        view = { ...view, ...addCmd(view, round.solution.pre[0]) };
        assert.equal(nextZone(view), "loop");
        view = { ...view, ...addCmd(view, round.solution.body[0]) };
        assert.deepEqual(view.body, [round.solution.body[0]]);
        view = { ...view, ...undoCmd(view) };
        assert.deepEqual(view.body, []);
        assert.equal(view.pre.length, 1);
    });

    it("lets the child choose where arrows go in the shortest-program challenge, within the limit", () => {
        const round = buildCodingLevel(15, { maxRounds: 3, maxChoices: 4, random: seeded(8) })[0];
        let view = viewOf(round);
        assert.equal(selectZone(view, "pre"), null, "već je izabrano");
        view = { ...view, ...selectZone(view, "loop") };
        for (let i = 0; i < round.limit; i += 1) view = { ...view, ...addCmd(view, round.arrows[0]) };
        assert.equal(view.body.length, round.limit);
        assert.equal(nextZone(view), null);
        assert.equal(selectZone(viewOf(flat), "loop"), null, "bez ograničenja nema izbora dela");
    });

    it("fixes a debug program by choosing the wrong arrow, then the right one", () => {
        const round = buildCodingLevel(9, { maxRounds: 3, maxChoices: 4, random: seeded(2) })[0];
        const bug = round.program.findIndex((cmd, i) => cmd !== round.solution.pre[i]);
        let view = viewOf(round);
        assert.equal(addCmd(view, round.arrows[0]), null, "bez izabrane strelice nema izmene");
        view = { ...view, ...selectFix(view, bug) };
        assert.equal(view.fixAt, bug);
        assert.deepEqual(selectFix(view, bug), { fixAt: null }, "ponovni izbor poništava");
        view = { ...view, ...addCmd(view, round.solution.pre[bug]) };
        assert.equal(view.fixAt, null);
        assert.equal(simulate(round, view.pre).outcome, "goal");
        assert.equal(undoCmd(view), null);
        assert.equal(clearCmds(view), null);
    });
});

describe("coding hints", () => {
    it("lead a child who only follows them to the goal on every level", () => {
        for (const level of LEVELS) {
            for (const { where, rounds } of plans(level, 3)) {
                rounds.forEach((round, index) => {
                    const view = followHints(round);
                    assert.equal(simulate(round, programOf(view)).outcome, "goal", `${where} z${index + 1}`);
                });
            }
        }
    });

    it("glow the delete arrow when the program has gone wrong, and the next cell on the board", () => {
        const round = buildCodingLevel(6, { maxRounds: 3, maxChoices: 4, random: seeded(11) })[0];
        const first = round.solution.pre[0];
        const away = CMDS.find((cmd) => simulate(round, [cmd]).outcome === "edge" || simulate(round, [cmd]).outcome === "blocked");
        if (away) assert.equal(hintTarget(viewOf(round, { pre: [away] })).action, "undo");
        const target = hintTarget(viewOf(round));
        assert.match(target.action, /^cmd:/);
        assert.equal(target.cell, simulate(round, [target.action.slice(4) as Cmd]).cells[1]);
        void first;
        // Ispravljanje: prvo pogrešna strelica u traci, pa prava strelica
        const debug = buildCodingLevel(10, { maxRounds: 3, maxChoices: 4, random: seeded(6) })[0];
        const bug = debug.program.findIndex((cmd, i) => cmd !== debug.solution.pre[i]);
        assert.equal(hintTarget(viewOf(debug)).action, `fix:${bug}`);
        assert.equal(hintTarget(viewOf(debug, { fixAt: bug })).action, `cmd:${debug.solution.pre[bug]}`);
    });
});

describe("coding sentences", () => {
    it("never say where to tap, and speak correct Serbian", () => {
        const texts: string[] = [];
        for (const level of LEVELS) {
            for (const round of buildCodingLevel(level, { maxRounds: 8, maxChoices: 4, random: seeded(level) })) {
                const view = viewOf(round);
                texts.push(codingQuestion(view), codingTitle(view), doneSentence(view), hintSentence(view));
                assert.ok(codingTitle(view).length <= 44, codingTitle(view));
                for (const outcome of ["edge", "blocked", "stars", "short"] as const) {
                    for (const obstacle of OBSTACLE_IDS) texts.push(mistakeSentence({ outcome, obstacle, missing: 2 }, round.theme), mistakeSentence({ outcome, obstacle, missing: 1 }, round.theme));
                }
            }
        }
        for (const text of texts) {
            assert.doesNotMatch(text, TAP_WORDS, text);
            assert.doesNotMatch(text, /undefined|NaN|\s{2}/, text);
        }
        assert.equal(countWord(1, "korak", "koraka", "koraka"), "1 korak");
        assert.equal(countWord(3, "strelicu", "strelice", "strelica"), "3 strelice");
        assert.equal(countWord(5, "strelicu", "strelice", "strelica"), "5 strelica");
        assert.equal(countWord(21, "korak", "koraka", "koraka"), "21 korak");
        assert.equal(countWord(12, "strelicu", "strelice", "strelica"), "12 strelica");
    });

    it("describes the task, the stop and the path calmly", () => {
        const round = buildCodingLevel(1, { maxRounds: 4, maxChoices: 3, random: seeded(1) })[0];
        assert.equal(codingQuestion(viewOf(round)), "Robotić želi do baterije. Kojim putem?");
        assert.equal(mistakeSentence({ outcome: "blocked", obstacle: "rock", missing: 0 }, "garden"), "Robotić je stao: ispred je kamen.");
        assert.equal(mistakeSentence({ outcome: "short", obstacle: null, missing: 0 }, "space"), "Robotić nije stigao do rakete.");
        assert.equal(doneSentence({ theme: "sea", stars: [] }), "Robotić je stigao do blaga.");
        assert.equal(pathTip(["up", "right"]), "Prvo gore, pa desno.");
        assert.equal(pathTip(["right", "right", "up", "left", "left", "down"]), "Prvo 2 koraka desno, pa gore, pa 2 koraka levo, pa dalje.");
    });
});

describe("coding scoring and monitor", () => {
    const round = buildCodingLevel(3, { maxRounds: 4, maxChoices: 4, random: seeded(3) })[0];
    const view = (extra: Partial<CodingView> = {}): CodingView => viewOf(round, extra);

    it("does not score the demonstrated first round of level 1", () => {
        const { next, modeled } = solveCodingView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts a first run as correct, a hinted round as prompted, a round with failed runs as neither", () => {
        assert.equal(solveCodingView(view({ round: 2 }), 1).next.correctCount, 1);
        assert.equal(solveCodingView(view({ round: 2, hint: true, misses: 1 }), 3).next.promptedCount, 1);
        const missed = solveCodingView(view({ round: 2, misses: 1 }), 3).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
        assert.equal(missed.score, 5);
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = codingResult(view({ totalRounds: 4, correctCount: 4, promptedCount: 4 }), 1, 30);
        assert.equal(result.total, 3);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeCodingMonitor({
            cols: 40,
            rows: -2,
            theme: "volcano",
            kind: "hack",
            start: 3,
            goal: 99,
            obstacles: [{ cell: 4, kind: "lava" }, { cell: 5, kind: "rock" }, { cell: 5, kind: "bush" }, null],
            stars: [3, 7, 7, 120],
            arrows: ["up", "jump", "up", "left"],
            pre: ["up", "fly", "down"],
            body: "x",
            fixAt: 9,
            robot: 500,
            got: [0, 5],
            mistake: { outcome: "boom", obstacle: "rock", missing: 2 },
            feedback: "maybe",
            step: 1e9,
        } as unknown as Partial<CodingView>);
        assert.deepEqual([merged.cols, merged.rows], [MAX_SIDE, 2]);
        assert.equal(merged.theme, "city");
        assert.equal(merged.kind, "plan");
        assert.equal(merged.goal, 3, "cilj van table → start");
        assert.deepEqual(merged.obstacles, [{ cell: 5, kind: "rock" }]);
        assert.deepEqual(merged.stars, [7]);
        assert.deepEqual(merged.arrows, ["up", "left"]);
        assert.deepEqual(merged.pre, ["up", "down"]);
        assert.deepEqual(merged.body, []);
        assert.equal(merged.fixAt, null);
        assert.equal(merged.robot, 3);
        assert.deepEqual(merged.got, [0]);
        assert.equal(merged.mistake, null);
        assert.equal(merged.feedback, null);
        assert.equal(merged.step, 99);
        assert.deepEqual(mergeCodingMonitor(null), emptyCodingView(1));
    });

    it("keeps a real game view as it is", () => {
        const real = view({ pre: [...round.solution.pre], robot: round.start, trail: [round.start], hint: true, feedback: "wrong", mistake: { outcome: "edge", obstacle: null, missing: 0 } });
        assert.deepEqual(mergeCodingMonitor(JSON.parse(JSON.stringify(real))), real);
    });
});

describe("coding game component", () => {
    const source = readFileSync(path.join(process.cwd(), "app/components/games/CodingGame.tsx"), "utf8");

    it("takes its tasks only from the game random source and shares every action by key", () => {
        assert.doesNotMatch(source, /Math\.random/);
        for (const key of ["data-action={action}", 'data-action="run"', "data-action={`zone:${zone}`}", "action={`fix:${i}`}", "const action = `cmd:${cmd}`"]) assert.ok(source.includes(key), key);
        assert.match(source, /onCompleteRef\.current\(codingResult\(/);
    });
});

describe("coding game registry entry", () => {
    const game = getGame("coding");

    it("is activity 34, graded, cognitive, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 34);
        assert.equal(game.gameType, "coding");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0024_logic_games.sql"), "utf8");
        assert.match(sql, /\(34, 'Vodi robota', '[^']+', 'cognitive'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("coding"));
        assert.ok(isRemoteGame("coding"));
    });
});
