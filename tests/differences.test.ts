// Igra „Pronađi razlike” (app/components/games/data/differencesLevels.ts): slike, razlike,
// nivoi, pogađanje, bodovanje i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    buildDiffLevel,
    DIFF_LEVELS,
    DIFF_MAX_LEVEL,
    DIFF_SCENES,
    diffIntro,
    diffPictures,
    diffResult,
    diffRoundsTotal,
    emptyDiffView,
    findTitle,
    getDifference,
    getDiffScene,
    hitDifference,
    hitFound,
    MIN_GAP,
    MIN_HIT_PX,
    mergeDiffMonitor,
    pickDifferences,
    SAME_HERE,
    SAME_HERE_SLOW,
    solveDiffView,
    type DiffView,
} from "@/app/components/games/data/differencesLevels";
import { hasBackground } from "@/app/components/games/scene/backgrounds";
import { isAdult, LOOKS } from "@/app/components/games/scene/figures";
import { hasProp } from "@/app/components/games/scene/props";
import { SceneArt } from "@/app/components/games/scene/SceneArt";
import { sceneParts, VIEW_H, VIEW_W } from "@/app/components/games/scene/types";
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

describe("difference scenes", () => {
    it("has nine places, each drawn from existing parts with children from the games", () => {
        assert.deepEqual(
            DIFF_SCENES.map((s) => s.id),
            ["soba", "park", "kuhinja", "plaza", "ucionica", "dvoriste", "pijaca", "akvarijum", "zima"]
        );
        for (const scene of DIFF_SCENES) {
            const { a, b } = diffPictures(scene, scene.diffs.map((d) => ({ id: d.id, side: "b" as const })));
            for (const spec of [a, b]) {
                const { backgrounds, props, figures } = sceneParts(spec);
                for (const bg of backgrounds) assert.ok(hasBackground(bg), `${scene.id}: pozadina ${bg}`);
                for (const prop of props) assert.ok(hasProp(prop), `${scene.id}: predmet ${prop}`);
                for (const fig of figures) assert.ok(isAdult(fig) || Object.hasOwn(LOOKS, fig), `${scene.id}: lik ${fig}`);
                assert.equal(spec.camera, "fixed", "obe slike u istom kadru, bez približavanja");
                assert.ok(renderToStaticMarkup(createElement(SceneArt, { spec })).length > 500);
            }
        }
    });

    it("gives every scene enough well-spaced differences of every kind", () => {
        for (const scene of DIFF_SCENES) {
            const ids = scene.diffs.map((d) => d.id);
            assert.equal(new Set(ids).size, ids.length, `${scene.id}: iste oznake`);
            assert.ok(scene.diffs.filter((d) => d.tier === 1).length >= 3, `${scene.id}: krupne razlike`);
            assert.ok(scene.diffs.some((d) => d.kind === "color" && d.tier === 1), `${scene.id}: krupna razlika u boji`);
            assert.ok(scene.diffs.filter((d) => d.tier === 3).length >= 2, `${scene.id}: suptilne razlike`);
            for (const d of scene.diffs) {
                const [x, y, r] = d.at;
                assert.ok(x - r >= -4 && x + r <= VIEW_W + 4 && y - r >= -4 && y + r <= VIEW_H + 4, `${scene.id}/${d.id}: van slike`);
                assert.ok(d.target === undefined || scene.items.some(([key]) => key === d.target), `${scene.id}/${d.id}: nepoznat predmet`);
                assert.ok(d.target !== undefined || d.add, `${scene.id}/${d.id}: razlika bez predmeta`);
                // Razlika zaista menja sliku
                const changed = diffPictures(scene, [{ id: d.id, side: "a" }]);
                assert.notDeepEqual(changed.a, changed.b, `${scene.id}/${d.id}: slike su iste`);
            }
        }
    });

    it("never tells the child where to tap, in Serbian Latin and Cyrillic", () => {
        const texts = [SAME_HERE, SAME_HERE_SLOW, ...[1, 2, 3, 4, 5, 6].flatMap((n) => [findTitle(n), diffIntro(n)]), ...DIFF_SCENES.flatMap((s) => s.diffs.map((d) => d.text))];
        for (const text of texts) {
            assert.doesNotMatch(text, /dodirni|pritisni|prevuci|klikni|ovde|gore|dole|levo|desno/i, text);
            assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
        }
        assert.equal(findTitle(1), "Pronađi jednu razliku.");
        assert.equal(findTitle(3), "Pronađi tri razlike.");
        assert.equal(findTitle(6), "Pronađi šest razlika.");
    });
});

describe("difference levels", () => {
    it("has fifteen levels: 1–2 big, then 3–4 with colour, then 5–6 subtle", () => {
        assert.equal(DIFF_LEVELS.length, 15);
        assert.equal(DIFF_MAX_LEVEL, MAX_LEVEL);
        for (const [i, rule] of DIFF_LEVELS.entries()) {
            const level = i + 1;
            if (level <= 5) assert.ok(rule.count >= 1 && rule.count <= 2 && rule.tiers[0] === 1, `nivo ${level}`);
            else if (level <= 10) assert.ok(rule.count >= 3 && rule.count <= 4, `nivo ${level}`);
            else assert.ok(rule.count >= 5 && rule.count <= 6 && rule.tiers[0] === 3, `nivo ${level}`);
        }
        assert.ok(DIFF_LEVELS.slice(6, 10).every((rule) => rule.colors >= 1), "srednji nivoi imaju razlike u boji");
    });

    it("builds every level for every age band: right count, spaced apart, no scene twice", () => {
        for (const level of LEVELS) {
            const rule = DIFF_LEVELS[level - 1];
            for (const band of Object.values(BAND_PRESETS)) {
                for (let seed = 1; seed <= 25; seed += 1) {
                    const plan = buildDiffLevel(level, { maxRounds: band.maxRounds, random: seeded(seed * 13 + level) });
                    const where = `nivo ${level}, ${band.label}, seme ${seed}`;
                    assert.ok(plan.rounds.length >= 1 && plan.rounds.length <= rule.scenes, where);
                    assert.ok(diffRoundsTotal(plan) <= Math.max(6, band.maxRounds), `${where}: previše zadataka`);
                    assert.equal(new Set(plan.rounds.map((r) => r.scene)).size, plan.rounds.length, `${where}: ista slika dvaput`);
                    for (const round of plan.rounds) {
                        const scene = getDiffScene(round.scene)!;
                        assert.equal(round.diffs.length, rule.count, `${where}: ${round.scene}`);
                        const diffs = round.diffs.map((p) => getDifference(scene, p.id)!);
                        for (let i = 0; i < diffs.length; i += 1) {
                            for (let j = i + 1; j < diffs.length; j += 1) {
                                assert.ok(Math.hypot(diffs[i].at[0] - diffs[j].at[0], diffs[i].at[1] - diffs[j].at[1]) >= MIN_GAP, `${where}: ${diffs[i].id} i ${diffs[j].id} su preblizu`);
                                assert.ok(!diffs[i].target || diffs[i].target !== diffs[j].target, `${where}: dve razlike na istom predmetu`);
                            }
                        }
                        if (rule.missingOnly) for (const d of diffs) assert.equal(d.kind, "missing", where);
                        assert.ok(diffs.filter((d) => d.kind === "color").length >= Math.min(rule.colors, rule.count), `${where}: razlike u boji`);
                        if (level >= 11) assert.ok(diffs.filter((d) => d.tier >= 2).length >= rule.count - 1, `${where}: suptilne razlike`);
                    }
                }
            }
        }
    });

    it("can always pick enough differences in every scene for the hardest level", () => {
        for (const scene of DIFF_SCENES) {
            for (let seed = 1; seed <= 30; seed += 1) assert.equal(pickDifferences(scene, DIFF_LEVELS[14], seeded(seed)).length, 6, `${scene.id}, seme ${seed}`);
        }
    });
});

describe("tapping a difference", () => {
    const scene = getDiffScene("park")!;
    const sun = getDifference(scene, "sun")!;
    const ids = ["sun", "dog", "bird"];

    it("hits a difference within its own radius, and within 48 px even when it is small", () => {
        assert.equal(hitDifference(scene, ids, [], sun.at[0], sun.at[1], 2), "sun");
        assert.equal(hitDifference(scene, ids, [], sun.at[0] + sun.at[2] - 1, sun.at[1], 4), "sun");
        // Na malom ekranu (0,8 px po jedinici) mesto za dodir je 24 px = 30 jedinica od sredine
        const bird = getDifference(scene, "bird")!;
        assert.equal(hitDifference(scene, ids, [], bird.at[0] + 28, bird.at[1], 0.8), "bird");
        assert.equal(hitDifference(scene, ids, [], bird.at[0] + MIN_HIT_PX / 0.8 + 2, bird.at[1], 0.8), null);
    });

    it("ignores a found difference and taps where the pictures are the same", () => {
        assert.equal(hitDifference(scene, ids, ["sun"], sun.at[0], sun.at[1], 2), null);
        assert.ok(hitFound(scene, ["sun"], sun.at[0], sun.at[1], 2));
        assert.equal(hitDifference(scene, ids, [], 120, 150, 2), null);
    });
});

describe("difference scoring", () => {
    const view = (extra: Partial<DiffView> = {}): DiffView => ({ ...emptyDiffView(4), scene: "park", diffs: [{ id: "sun", side: "a" }, { id: "dog", side: "b" }], ...extra });

    it("does not score the demonstrated first difference of level 1", () => {
        const { next, modeled } = solveDiffView(view(), 1, "sun");
        assert.ok(modeled);
        assert.equal(next.correctCount, 0);
        assert.equal(next.promptedCount, 0);
        assert.deepEqual(next.found, ["sun"]);
    });

    it("counts first try as correct, help as prompted, a miss as neither", () => {
        assert.equal(solveDiffView(view(), 3, "sun").next.correctCount, 1);
        const helped = solveDiffView(view({ hint: "sun", hinted: ["sun"] }), 3, "sun").next;
        assert.equal(helped.correctCount + helped.promptedCount, 1);
        assert.equal(helped.promptedCount, 1);
        const missed = solveDiffView(view({ misses: 2 }), 3, "sun").next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
        assert.equal(missed.misses, 0, "posle pronalaska promašaji kreću od nule");
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = diffResult(view({ correctCount: 4, promptedCount: 4, totalRounds: 4 }), 1, 30);
        assert.equal(result.total, 3);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeDiffMonitor({ scene: "park", diffs: [{ id: "sun", side: "a" }, { id: "nope", side: "b" }, { id: "dog", side: "x" as never }], found: ["sun", "dog"], hint: "dragon", miss: { x: 900, y: 2, n: 1 } });
        assert.deepEqual(merged.diffs, [{ id: "sun", side: "a" }]);
        assert.deepEqual(merged.found, ["sun"]);
        assert.equal(merged.hint, null);
        assert.equal(merged.miss, null);
        assert.equal(mergeDiffMonitor({ scene: "mars" }).scene, "");
    });
});

describe("differences game registry entry", () => {
    const game = getGame("differences");

    it("is activity 24, graded, cognitive, with a cover and its own colour", () => {
        assert.equal(game.activityId, 24);
        assert.equal(game.gameType, "differences");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0019_differences_game.sql"), "utf8");
        assert.match(sql, /\(24, 'Pronađi razlike', '[^']+', 'cognitive'/);
        assert.match(readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8"), /--color-coral-500/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("differences"));
        assert.ok(isRemoteGame("differences"));
    });
});
