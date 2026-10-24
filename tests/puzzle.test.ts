// Složi sliku: nivoi, isecanje slike (delovi tačno pokrivaju sliku) i bodovanje.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    buildPuzzleLevel,
    cleanRound,
    emptyPuzzleView,
    getPuzzlePicture,
    isDecoy,
    levelPieceCount,
    mergePuzzleMonitor,
    nextPictureView,
    pieceShapes,
    placePiece,
    PUZZLE_H,
    PUZZLE_LEVELS,
    PUZZLE_PICTURE_IDS,
    PUZZLE_PICTURES,
    PUZZLE_W,
    puzzleLevel,
    puzzleResult,
    randomEdges,
    roundIntro,
    roundPieces,
    tabMargin,
    type PieceShape,
    type PuzzleView,
} from "@/app/components/games/data/puzzleLevels";
import { dropCell, GAP, puzzleLayout, traySlots } from "@/app/components/games/puzzle/boardLayout";
import { MAX_LEVEL } from "@/lib/games";
import { toCyrillic } from "@/lib/script";

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

/** Površina mnogougla (formula pertle) */
function area(points: [number, number][]): number {
    let sum = 0;
    for (let i = 0; i < points.length; i += 1) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        sum += x1 * y2 - x2 * y1;
    }
    return Math.abs(sum) / 2;
}

function inside(points: [number, number][], x: number, y: number): boolean {
    let hit = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
        const [xi, yi] = points[i];
        const [xj, yj] = points[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
}

/** Svaka tačka slike (osim samih ivica) pripada tačno jednom delu, a zbir površina je cela slika */
function assertCovers(shapes: PieceShape[], where: string) {
    const total = shapes.reduce((sum, shape) => sum + area(shape.outline), 0);
    assert.ok(Math.abs(total - PUZZLE_W * PUZZLE_H) < PUZZLE_W * PUZZLE_H * 0.001, `${where}: area ${total}`);
    for (const shape of shapes) {
        for (const [x, y] of shape.outline) assert.ok(x >= -0.01 && x <= PUZZLE_W + 0.01 && y >= -0.01 && y <= PUZZLE_H + 0.01, `${where}: outline inside the picture`);
    }
    for (let gx = 0; gx < 57; gx += 1) {
        for (let gy = 0; gy < 43; gy += 1) {
            const x = (gx + 0.5) * (PUZZLE_W / 57) + 0.013;
            const y = (gy + 0.5) * (PUZZLE_H / 43) + 0.017;
            const owners = shapes.filter((shape) => inside(shape.outline, x, y)).length;
            assert.equal(owners, 1, `${where}: point ${x.toFixed(1)},${y.toFixed(1)} in ${owners} pieces`);
        }
    }
}

describe("puzzle pictures", () => {
    it("has 8–12 pictures with unique ids, a name and a sentence for the end", () => {
        assert.ok(PUZZLE_PICTURES.length >= 8 && PUZZLE_PICTURES.length <= 12);
        assert.deepEqual(PUZZLE_PICTURES.map((p) => p.id), [...PUZZLE_PICTURE_IDS]);
        for (const picture of PUZZLE_PICTURES) {
            assert.ok(picture.name.trim() && picture.about.endsWith("."), picture.id);
            assert.equal(getPuzzlePicture(picture.id), picture);
            for (const text of [picture.name, picture.about]) assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
        }
        assert.equal(getPuzzlePicture("nema"), undefined);
    });
});

describe("puzzle levels", () => {
    it(`has ${MAX_LEVEL} distinct levels in three tiers`, () => {
        assert.equal(PUZZLE_LEVELS.length, MAX_LEVEL);
        assert.equal(new Set(PUZZLE_LEVELS.map((level) => JSON.stringify(level))).size, MAX_LEVEL);
        assert.equal(puzzleLevel(0), PUZZLE_LEVELS[0]);
        assert.equal(puzzleLevel(99), PUZZLE_LEVELS[MAX_LEVEL - 1]);
        assert.equal(puzzleLevel(Number.NaN), PUZZLE_LEVELS[0]);
    });

    it("starts with halves and a guide, and ends with 16 tabbed pieces", () => {
        const pieces = (i: number) => PUZZLE_LEVELS[i].cols * PUZZLE_LEVELS[i].rows;
        assert.deepEqual([PUZZLE_LEVELS[0].cols, PUZZLE_LEVELS[0].rows], [2, 1], "left and right half");
        assert.deepEqual([PUZZLE_LEVELS[1].cols, PUZZLE_LEVELS[1].rows], [1, 2], "top and bottom half");
        assert.equal(pieces(2), 3);
        for (let i = 0; i < 5; i += 1) assert.ok(PUZZLE_LEVELS[i].earlyHint, `level ${i + 1}: early hint`);
        for (let i = 0; i < 4; i += 1) assert.ok(PUZZLE_LEVELS[i].guide, `level ${i + 1}: guide`);
        assert.equal(PUZZLE_LEVELS[4].given, 1, "half of the picture is already there");
        assert.ok(PUZZLE_LEVELS.slice(10).every((level) => !level.guide), "no guide on hard levels");
        assert.ok(PUZZLE_LEVELS.slice(0, 12).every((level) => !level.tabs) && PUZZLE_LEVELS.slice(12).every((level) => level.tabs));
        assert.equal(pieces(14), 16);
        // Po nivou se slaže sve više delova (u svakom stepenu prvi nivo ima najviše onoliko koliko poslednji)
        for (let tier = 0; tier < 3; tier += 1) assert.ok(pieces(tier * 5) <= pieces(tier * 5 + 4) || PUZZLE_LEVELS[tier * 5 + 4].given > 0);
        assert.ok(Math.max(...PUZZLE_LEVELS.slice(0, 5).map((_, i) => pieces(i))) <= 4, "few pieces at first");
        assert.ok(PUZZLE_LEVELS.slice(10).every((_, i) => pieces(i + 10) >= 9), "hard levels have at least nine pieces");
    });
});

describe("cutting the picture", () => {
    for (const level of PUZZLE_LEVELS) {
        it(`${level.cols}×${level.rows}${level.tabs ? " with tabs" : ""}: pieces cover the picture exactly`, () => {
            for (let seed = 1; seed <= (level.tabs ? 4 : 1); seed += 1) {
                const edges = level.tabs ? randomEdges(level.cols, level.rows, seeded(seed)) : null;
                const shapes = pieceShapes({ cols: level.cols, rows: level.rows, edges });
                assert.equal(shapes.length, level.cols * level.rows);
                assert.deepEqual(
                    shapes.map((shape) => shape.cell),
                    shapes.map((_, i) => i)
                );
                for (const shape of shapes) {
                    assert.match(shape.d, /^M[\d.]+,[\d.]+ .+ Z$/);
                    assert.doesNotMatch(shape.d, /NaN|undefined/);
                }
                assertCovers(shapes, `${level.cols}×${level.rows}/${seed}`);
                // Ušice vire najviše za marginu koja se crta oko dela
                const margin = tabMargin({ cols: level.cols, rows: level.rows, edges });
                for (const shape of shapes) {
                    for (const [x, y] of shape.outline) {
                        assert.ok(x >= shape.x - margin - 0.01 && x <= shape.x + shape.w + margin + 0.01, "tab inside margin (x)");
                        assert.ok(y >= shape.y - margin - 0.01 && y <= shape.y + shape.h + margin + 0.01, "tab inside margin (y)");
                    }
                }
                if (!level.tabs) assert.equal(margin, 0);
            }
        });
    }
});

describe("puzzle rounds", () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
        it(`level ${level}: every round builds with the right pieces`, () => {
            const rule = puzzleLevel(level);
            for (let seed = 1; seed <= 8; seed += 1) {
                for (const maxRounds of [5, 8]) {
                    const rounds = buildPuzzleLevel(level, { maxRounds, random: seeded(seed * 17 + level) });
                    assert.equal(rounds.length, Math.min(rule.rounds, maxRounds));
                    assert.equal(new Set(rounds.map((round) => round.picture)).size, rounds.length, "no picture twice in a level");
                    for (const round of rounds) {
                        assert.ok(rule.pictures.includes(round.picture));
                        assert.deepEqual([round.cols, round.rows, round.guide, round.edges !== null], [rule.cols, rule.rows, rule.guide, rule.tabs]);
                        const cells = rule.cols * rule.rows;
                        const own = roundPieces(round);
                        // Pravi delovi: svako polje tačno jednom (osim onih na mestu od početka)
                        assert.equal(round.given.length, rule.given);
                        assert.equal(own.length, cells - rule.given);
                        assert.deepEqual(
                            [...own.map((piece) => piece.cell), ...round.given].sort((a, b) => a - b),
                            Array.from({ length: cells }, (_, i) => i)
                        );
                        const decoys = round.tray.filter((piece) => isDecoy(round, piece));
                        assert.equal(decoys.length, rule.decoys);
                        assert.equal(round.tray.length, own.length + rule.decoys);
                        assert.equal(new Set(round.tray.map((piece) => piece.id)).size, round.tray.length, "unique piece ids");
                        for (const decoy of decoys) {
                            assert.notEqual(decoy.picture, round.picture);
                            assert.ok(!round.given.includes(decoy.cell), "a decoy looks like a missing piece");
                        }
                        // Korpa nije složena redom
                        if (own.length > 1 && decoys.length === 0) assert.notDeepEqual(round.tray.map((p) => p.cell), [...round.tray.map((p) => p.cell)].sort((a, b) => a - b));
                        assert.ok(roundIntro(round).length > 0);
                        assert.deepEqual(cleanRound(JSON.parse(JSON.stringify(round))), round, "survives the trip to the monitor");
                    }
                    assert.equal(emptyPuzzleView(rounds).totalRounds, levelPieceCount(rounds));
                }
            }
        });
    }
});

/** Odigra ceo nivo: `mistakes(id)` kaže koliko puta je deo prvo stavljen pogrešno, `hinted(id)` da li je dobio pomoć */
function play(level: number, mistakes: (id: string) => number, hinted: (id: string) => boolean = () => false): PuzzleView {
    const rounds = buildPuzzleLevel(level, { maxRounds: 8, random: seeded(level * 7) });
    let view = emptyPuzzleView(rounds);
    let first = true;
    for (let r = 0; r < rounds.length; r += 1) {
        for (const piece of roundPieces(rounds[r])) {
            const misses = mistakes(piece.id);
            if (misses > 0) view = { ...view, tried: [...view.tried, piece.id], incorrectCount: view.incorrectCount + misses };
            if (hinted(piece.id)) view = { ...view, hint: piece.id, hinted: [...view.hinted, piece.id] };
            const { next, done } = placePiece(view, rounds, piece.id, level, first && level === 1);
            first = false;
            view = next;
            if (done && r < rounds.length - 1) view = nextPictureView(view, rounds);
        }
    }
    return view;
}

describe("puzzle scoring", () => {
    it("the demo piece of level 1 is not scored; all others count", () => {
        const view = play(1, () => 0);
        const result = puzzleResult(view, 1, 30);
        assert.equal(result.total, view.totalRounds - 1);
        assert.equal(result.correct, result.total);
        assert.equal(result.prompted, 0);
        // Na drugim nivoima nema pokaznog dela
        const other = puzzleResult(play(4, () => 0), 4, 30);
        assert.equal(other.total, levelPieceCount(buildPuzzleLevel(4, { maxRounds: 8, random: seeded(28) })));
    });

    it("correct = first try without a hint, prompted = after a hint, and together never more than total", () => {
        for (let level = 1; level <= MAX_LEVEL; level += 1) {
            let n = 0;
            const view = play(
                level,
                () => (n++ % 3 === 0 ? 1 : 0),
                (id) => id.endsWith("1")
            );
            const result = puzzleResult(view, level, 10);
            assert.ok(result.correct + (result.prompted ?? 0) <= result.total, `level ${level}`);
            assert.ok(result.correct < result.total, `level ${level}: mistakes lower the score`);
            assert.ok(view.round <= view.totalRounds);
        }
        const all = puzzleResult(
            play(6, () => 0, () => true),
            6,
            10
        );
        assert.equal(all.correct, 0);
        assert.equal(all.prompted, all.total);
    });

    it("the live state always reports the piece in progress and the picture", () => {
        const rounds = buildPuzzleLevel(7, { maxRounds: 8, random: seeded(3) });
        let view = emptyPuzzleView(rounds);
        const pieces = roundPieces(rounds[0]);
        view = placePiece(view, rounds, pieces[0].id, 7).next;
        assert.equal(view.round, 2);
        assert.equal(view.picture, 1);
        for (const piece of pieces.slice(1)) view = placePiece(view, rounds, piece.id, 7).next;
        assert.equal(view.solved, true);
        view = nextPictureView(view, rounds);
        assert.equal(view.picture, 2);
        assert.equal(view.round, pieces.length + 1);
        assert.deepEqual(view.placed, []);
    });
});

describe("puzzle monitor state", () => {
    it("rebuilds the round and drops anything unknown", () => {
        const rounds = buildPuzzleLevel(13, { maxRounds: 8, random: seeded(5) });
        const view = { ...emptyPuzzleView(rounds), placed: ["p0", "x9"], selected: "nope", misses: { p1: 2, zz: 4 } };
        const merged = mergePuzzleMonitor(JSON.parse(JSON.stringify(view)));
        assert.deepEqual(merged.current, rounds[0]);
        assert.deepEqual(merged.placed, ["p0"]);
        assert.equal(merged.selected, null);
        assert.deepEqual(merged.misses, { p1: 2 });
        assert.equal(mergePuzzleMonitor(null).current, null);
        assert.equal(cleanRound({ picture: "mars", cols: 2, rows: 1 }), null);
        assert.equal(mergePuzzleMonitor({ current: { picture: "macka", cols: 2, rows: 1, edges: { h: [[3]], v: [] } } as never }).current?.edges, null);
    });
});

describe("board and tray layout", () => {
    // Slobodan prostor za igru (px) na telefonu uspravno i položeno, tabletu i računaru
    const SPACES = [
        [328, 420],
        [358, 520],
        [560, 230],
        [700, 600],
        [720, 420],
    ];
    for (const level of PUZZLE_LEVELS) {
        it(`${level.cols}×${level.rows}${level.tabs ? " with tabs" : ""}${level.decoys ? " with decoys" : ""}: board and tray fit, pieces are big enough to touch`, () => {
            const margin = tabMargin({ cols: level.cols, rows: level.rows, edges: level.tabs ? randomEdges(level.cols, level.rows) : null });
            const pieces = level.cols * level.rows - level.given + level.decoys;
            for (const [width, height] of SPACES) {
                const layout = puzzleLayout({ width, height, cols: level.cols, rows: level.rows, margin, pieces });
                const { board, tray } = layout;
                const where = `${width}×${height}`;
                assert.ok(board.x >= 0 && board.y >= 0 && board.x + board.w <= width + 0.5 && board.y + board.h <= height + 0.5, `${where}: board inside`);
                assert.ok(tray.x + tray.w <= width + 0.5 && tray.y + tray.h <= height + 0.5, `${where}: tray inside`);
                const overlap = layout.side ? board.x + board.w > tray.x : board.y + board.h > tray.y;
                assert.ok(!overlap, `${where}: board and tray do not overlap`);
                assert.ok(Math.min(tray.item.w, tray.item.h) >= 48, `${where}: piece ${Math.round(tray.item.w)}×${Math.round(tray.item.h)}`);
                assert.ok(tray.capacity >= Math.min(3, pieces) && tray.capacity <= pieces);
                assert.ok(tray.cols * tray.rows >= tray.capacity);
                assert.ok(tray.cols * tray.item.w + (tray.cols - 1) * GAP <= tray.w + 0.5 && tray.rows * tray.item.h + (tray.rows - 1) * GAP <= tray.h + 0.5, `${where}: pieces inside the tray`);
            }
        });
    }

    it("a placed piece's tray slot gets the next waiting piece; the others stay where they are", () => {
        const order = ["a", "b", "c", "d", "e"];
        assert.deepEqual(traySlots(order, [], 3), ["a", "b", "c"]);
        assert.deepEqual(traySlots(order, ["b"], 3), ["a", "d", "c"]);
        assert.deepEqual(traySlots(order, ["b", "a", "d", "e"], 3), [null, null, "c"]);
        // Korpa se smanjila dok je deo iz reda već bio stavljen: on se ne vraća u korpu
        assert.deepEqual(traySlots(order, ["d"], 2), ["a", "b"]);
        assert.deepEqual(traySlots(order, ["d", "a"], 2), ["c", "b"]);
    });

    it("a piece dropped near its own place snaps there; elsewhere the nearest place counts", () => {
        assert.equal(dropCell(2, 2, 100, 75, 0), 0);
        assert.equal(dropCell(2, 2, 215, 75, 0), 0, "a little into the neighbour still counts as its own place");
        assert.equal(dropCell(2, 2, 300, 75, 0), 1);
        assert.equal(dropCell(2, 2, 300, 225, null), 3);
        assert.equal(dropCell(2, 2, -200, 75, 0), null, "far from the board");
    });
});
