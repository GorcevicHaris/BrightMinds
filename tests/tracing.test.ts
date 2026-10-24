// Motor za precrtavanje (data/tracing.ts) i potezi svih slova i cifara.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LETTER_GLYPHS } from "@/app/components/games/data/letterGlyphs";
import {
    DOT_LENGTH,
    SLIP_LENGTH,
    TOLERANCE,
    TRACE_GUIDES,
    arc,
    followFinger,
    glyphBox,
    glyphFrame,
    joinGlyphs,
    line,
    pointAt,
    sampleStroke,
    strokeDone,
    tracePath,
    type Glyph,
    type Pt,
} from "@/app/components/games/data/tracing";
import { outcomeFor, scoreSolved, traceResult, type ScoredView } from "@/app/components/games/data/traceScore";

const ALL_GLYPHS: [string, Glyph][] = Object.entries(LETTER_GLYPHS);

/** Prst koji ide tačno po potezu (gusto), uz malo podrhtavanje `wobble` */
function fingerAlong(points: readonly Pt[], wobble = 0, step = 2.5): Pt[] {
    const s = sampleStroke(points, step);
    return s.pts.map(([x, y], i) => [x + Math.sin(i * 0.9) * wobble, y + Math.cos(i * 0.6) * wobble] as const);
}

describe("stroke data", () => {
    it("draws every letter and digit with finite points inside a sane box", () => {
        for (const [key, glyph] of ALL_GLYPHS) {
            assert.ok(glyph.strokes.length >= 1 && glyph.strokes.length <= 6, `${key}: ${glyph.strokes.length} poteza`);
            for (const s of glyph.strokes) {
                assert.ok(s.length >= 2, `${key}: potez bez tačaka`);
                for (const [x, y] of s) {
                    assert.ok(Number.isFinite(x) && Number.isFinite(y), `${key}: ${x},${y}`);
                    assert.ok(x >= -5 && x <= 190 && y >= -30 && y <= 140, `${key}: tačka van okvira ${x},${y}`);
                }
                assert.ok(sampleStroke(s).length > 0, `${key}: potez dužine 0`);
            }
            const frame = glyphFrame(glyph);
            assert.ok(frame.w > 0 && frame.h > 0 && frame.y <= 0 && frame.y + frame.h >= 100, `${key}: okvir`);
        }
    });

    it("keeps capitals and digits on the cap height and small letters under the x-height line", () => {
        for (const [key, glyph] of ALL_GLYPHS) {
            const box = glyphBox(glyph);
            const isLower = key !== key.toLocaleUpperCase("sr");
            if (isLower) {
                // Telo malog slova je ispod srednje linije (40); preko nje idu samo b, d, h, k, l, ђ, ћ, б, ф, t, f i kvačice
                assert.ok(box.maxY >= 98, `${key}: ne stoji na liniji`);
            } else {
                assert.ok(box.minY <= 3, `${key}: vrh ${box.minY}`);
                assert.ok(box.maxY >= 98 && box.maxY <= 106, `${key}: dno ${box.maxY}`);
            }
        }
    });

    it("puts the strokes of joined glyphs (DŽ, LJ, NJ) side by side", () => {
        const joined = joinGlyphs({ strokes: [line(0, 0, 0, 100)] }, { strokes: [line(0, 0, 0, 100)] }, 12);
        assert.deepEqual(joined.strokes[1][0], [12, 0]);
        for (const key of ["DŽ", "LJ", "NJ", "dž", "lj", "nj"]) {
            const glyph = LETTER_GLYPHS[key];
            const firstMax = Math.max(...glyph.strokes[0].map(([x]) => x));
            const lastMin = Math.min(...glyph.strokes[glyph.strokes.length - 1].map(([x]) => x));
            assert.ok(lastMin > firstMax - 30, `${key}`);
        }
    });

    it("draws an arc counter-clockwise when the angle goes down (like writing O)", () => {
        const o = arc(0, 0, 10, 10, -90, -180);
        const near = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-9;
        assert.ok(near(o[0], [0, -10]));
        assert.ok(near(o[o.length - 1], [-10, 0]));
        // Na pola puta je gornji levi deo kruga (suprotno kazaljci na satu)
        const half = o[Math.floor(o.length / 2)];
        assert.ok(half[0] < 0 && half[1] < 0);
    });
});

describe("path matcher", () => {
    it("completes every stroke of every glyph when the finger follows it, for every guide", () => {
        for (const guide of TRACE_GUIDES) {
            const tol = TOLERANCE[guide];
            for (const [key, glyph] of ALL_GLYPHS) {
                for (const [i, s] of glyph.strokes.entries()) {
                    const sampled = sampleStroke(s);
                    const result = tracePath(sampled, fingerAlong(s), tol);
                    assert.ok(strokeDone(sampled, result.progress, tol), `${guide} ${key} potez ${i + 1}: ${result.progress.toFixed(1)} / ${sampled.length.toFixed(1)}`);
                    assert.equal(result.offPath, 0, `${guide} ${key} potez ${i + 1}: van linije`);
                }
            }
        }
    });

    it("tolerates a shaky hand inside the corridor", () => {
        const tol = TOLERANCE.thin;
        for (const [key, glyph] of ALL_GLYPHS) {
            for (const [i, s] of glyph.strokes.entries()) {
                const sampled = sampleStroke(s);
                // Ruka drhti, ali dete završi na kraju poteza
                const result = tracePath(sampled, [...fingerAlong(s, tol * 0.45), s[s.length - 1]], tol);
                assert.ok(strokeDone(sampled, result.progress, tol), `${key} potez ${i + 1}`);
            }
        }
    });

    it("does not finish a stroke when the finger jumps straight to its end", () => {
        for (const key of ["O", "C", "S", "G", "o", "З"]) {
            const s = LETTER_GLYPHS[key].strokes[0];
            const sampled = sampleStroke(s);
            const start = s[0];
            const end = s[s.length - 1];
            const mid = pointAt(sampled, sampled.length * 0.5);
            for (const path of [[start, end], [start, mid, end]]) {
                const result = tracePath(sampled, path, TOLERANCE.thick);
                assert.ok(!strokeDone(sampled, result.progress, TOLERANCE.thick), `${key}: prečica`);
            }
        }
    });

    it("does not count a stroke traced in the wrong direction", () => {
        for (const key of ["L", "T", "Z", "C", "S"]) {
            const s = LETTER_GLYPHS[key].strokes[0];
            const sampled = sampleStroke(s);
            const backwards = [...fingerAlong(s)].reverse();
            const result = tracePath(sampled, backwards, TOLERANCE.thick);
            assert.ok(!strokeDone(sampled, result.progress, TOLERANCE.thick), `${key}: unazad`);
        }
        // O počinje i završava se na vrhu: pisanje u smeru kazaljke izlazi iz linije
        const o = sampleStroke(LETTER_GLYPHS.O.strokes[0]);
        const clockwise = sampleStroke(arc(40, 50, 32, 50, -90, 270));
        const result = tracePath(o, clockwise.pts, TOLERANCE.thick);
        assert.ok(!strokeDone(o, result.progress, TOLERANCE.thick));
        assert.ok(result.offPath > SLIP_LENGTH);
    });

    it("needs the finger to start at the dot", () => {
        const s = sampleStroke(LETTER_GLYPHS.I.strokes[0]);
        const result = tracePath(s, [[90, 50], [90, 100]], TOLERANCE.thick);
        assert.equal(result.progress, 0);
    });

    it("measures how far the finger left the corridor", () => {
        const s = sampleStroke(line(0, 0, 0, 100));
        const tol = TOLERANCE.thin;
        const detour: Pt[] = [
            [0, 0],
            [0, 40],
            [tol + 25, 40],
            [tol + 25, 60],
            [0, 60],
            [0, 100],
        ];
        const result = tracePath(s, detour, tol);
        assert.ok(result.offPath > SLIP_LENGTH, `${result.offPath}`);
        // Napredak ostaje i posle izlaska, a do kraja se stiže kad se prst vrati
        assert.ok(strokeDone(s, result.progress, tol));
    });

    it("never moves the progress backwards and does not snap to a later part of the same stroke", () => {
        const b = sampleStroke(LETTER_GLYPHS.B.strokes[1]);
        // Sredina slova B: deo poteza ide nazad do uspravne linije. Prst na sredini gornjeg luka ne preskače kraj.
        const step = followFinger(b, 10, pointAt(b, 12), TOLERANCE.thick);
        assert.ok(step.onPath && step.progress >= 10 && step.progress < 20);
        const back = followFinger(b, 30, pointAt(b, 22), TOLERANCE.thick);
        assert.equal(back.progress, 30);
        assert.equal(back.onPath, true);
        // Kraj slova O je na istom mestu kao početak: dodir tu na početku ne završava slovo
        const o = sampleStroke(LETTER_GLYPHS.O.strokes[0]);
        assert.ok(followFinger(o, 0, LETTER_GLYPHS.O.strokes[0][0], TOLERANCE.thick).progress < 10);
    });

    it("finishes the dot of i and j with one touch", () => {
        const dot = sampleStroke(LETTER_GLYPHS.i.strokes[1]);
        assert.ok(dot.length <= DOT_LENGTH);
        const result = tracePath(dot, [LETTER_GLYPHS.i.strokes[1][0]], TOLERANCE.thin);
        assert.ok(strokeDone(dot, result.progress, TOLERANCE.thin));
    });
});

describe("trace scoring", () => {
    const view = (extra: Partial<ScoredView> = {}): ScoredView => ({ score: 0, correctCount: 0, incorrectCount: 0, promptedCount: 0, round: 1, totalRounds: 5, ...extra });

    it("does not score the demo round (level 1, task 1) and scores the rest", () => {
        assert.deepEqual(outcomeFor(1, 1, 5, 0, false), { modeled: true, firstTry: false, prompted: false });
        assert.deepEqual(outcomeFor(1, 1, 5, 0, true), { modeled: true, firstTry: false, prompted: false });
        assert.deepEqual(outcomeFor(1, 2, 5, 0, false), { modeled: false, firstTry: true, prompted: false });
        assert.deepEqual(outcomeFor(2, 1, 5, 0, false), { modeled: false, firstTry: true, prompted: false });
    });

    it("counts a trace as correct only inside the corridor and without the hint", () => {
        assert.equal(outcomeFor(3, 2, 5, 1, false).firstTry, false);
        assert.equal(outcomeFor(3, 2, 5, 1, false).prompted, false);
        assert.deepEqual(outcomeFor(3, 2, 5, 0, true), { modeled: false, firstTry: false, prompted: true });
        assert.deepEqual(outcomeFor(3, 2, 5, 2, true), { modeled: false, firstTry: false, prompted: true });
    });

    it("keeps correct + prompted within the scored total", () => {
        for (let mask = 0; mask < 3 ** 5; mask += 1) {
            let v = view();
            for (let round = 1; round <= 5; round += 1) {
                const kind = Math.floor(mask / 3 ** (round - 1)) % 3; // 0 samostalno, 1 posle greške, 2 uz pomoć
                v = scoreSolved({ ...v, round }, outcomeFor(1, round, 5, kind === 1 ? 1 : 0, kind === 2));
            }
            const result = traceResult(v, 1, 30);
            assert.equal(result.total, 4);
            assert.ok(result.correct + (result.prompted ?? 0) <= result.total, `${mask}`);
        }
        const perfect = traceResult(view({ totalRounds: 6, correctCount: 6, promptedCount: 0 }), 2, 10);
        assert.deepEqual([perfect.correct, perfect.total, perfect.prompted], [6, 6, 0]);
    });
});
