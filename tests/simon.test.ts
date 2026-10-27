// Igra „Zapamti niz” (app/components/games/data/simonLevels.ts): nivoi (broj polja, dužina niza,
// tempo, unazad), zadaci iz semena, redosled odgovora, stanje za monitor, reči i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { answerOrder, buildSimonLevel, emptySimonView, getSimonPad, mergeSimonMonitor, SIMON_MAX_LEVEL, SIMON_PADS, simonRule, type SimonView } from "@/app/components/games/data/simonLevels";
import { PAD_NOTES } from "@/app/components/games/kit/tones";
import { GAMES, getGame } from "@/lib/games";
import { isTogetherGame } from "@/lib/playTogether";
import { hasSharedBoard } from "@/lib/sharedPlay";
import { seededRandom } from "@/lib/seededRandom";
import { versusFormat } from "@/lib/versusFormat";

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const LEVELS = Array.from({ length: 15 }, (_, i) => i + 1);
const EMOJI = /\p{Extended_Pictographic}/u;
const WHERE_TO_TAP = /dodirni|pritisni|klikni|prevuci|dodirn|pritisn/i;

describe("simon levels", () => {
    it("has 15 levels in three tiers of five", () => {
        assert.equal(SIMON_MAX_LEVEL, 15);
        assert.equal(simonRule(0), simonRule(1));
        assert.equal(simonRule(99), simonRule(15));
    });

    it("starts below a four-year-old's span and grows slowly (never shrinks inside a tier going forward)", () => {
        assert.deepEqual([1, 2].map((l) => simonRule(l).length), [1, 2]);
        assert.equal(simonRule(1).pads, 2);
        for (const tier of [[1, 5], [6, 10], [11, 13]]) {
            for (let l = tier[0] + 1; l <= tier[1]; l += 1) {
                assert.ok(simonRule(l).pads >= simonRule(l - 1).pads, `polja ${l}`);
                assert.ok(simonRule(l).length >= simonRule(l - 1).length, `dužina ${l}`);
                assert.ok(simonRule(l).tempo <= simonRule(l - 1).tempo, `tempo ${l}`);
            }
        }
        // Svaka težina je teža od prethodne
        assert.ok(simonRule(6).pads > simonRule(5).pads && simonRule(11).pads > simonRule(10).pads);
        // Najduži niz unapred: pet (oko raspona deteta od 9–10 godina)
        assert.ok(LEVELS.every((l) => simonRule(l).length <= 5));
        // Unazad samo na poslednja dva nivoa, kraće nego unapred na istom broju polja
        assert.deepEqual(LEVELS.filter((l) => simonRule(l).backwards), [14, 15]);
        assert.ok(simonRule(14).length < simonRule(13).length);
        // Mlađa deca: sporiji prikaz
        assert.ok(simonRule(1).tempo > simonRule(13).tempo);
    });

    it("builds rounds from the level's pads only, with fair sequences", () => {
        for (const level of LEVELS) {
            const rule = simonRule(level);
            for (let s = 0; s < 30; s += 1) {
                const plan = buildSimonLevel(level, { maxRounds: 8, random: seededRandom(`s-${level}-${s}`) });
                assert.deepEqual(plan.pads, SIMON_PADS.slice(0, rule.pads).map((p) => p.id));
                assert.equal(plan.backwards, rule.backwards);
                assert.equal(plan.rounds.length, rule.rounds);
                plan.rounds.forEach((round, i) => {
                    assert.equal(round.sequence.length, rule.length);
                    assert.ok(round.sequence.every((id) => plan.pads.includes(id)));
                    for (let k = 2; k < round.sequence.length; k += 1) assert.ok(!(round.sequence[k] === round.sequence[k - 1] && round.sequence[k] === round.sequence[k - 2]), "triput isto zaredom");
                    if (rule.pads <= 3) for (let k = 1; k < round.sequence.length; k += 1) assert.notEqual(round.sequence[k], round.sequence[k - 1]);
                    if (i > 0) assert.notEqual(round.sequence.join(), plan.rounds[i - 1].sequence.join(), `nivo ${level}: isti niz zaredom`);
                });
            }
        }
    });

    it("respects the parent's round limit (but plays at least two)", () => {
        assert.equal(buildSimonLevel(9, { maxRounds: 3 }).rounds.length, 3);
        assert.equal(buildSimonLevel(1, { maxRounds: 1 }).rounds.length, 2);
    });

    it("answers backwards from the last to the first", () => {
        assert.deepEqual(answerOrder(["frog", "cat", "fish"], false), ["frog", "cat", "fish"]);
        assert.deepEqual(answerOrder(["frog", "cat", "fish"], true), ["fish", "cat", "frog"]);
    });

    it("gives every pad its own animal drawing, colour and pentatonic note", () => {
        assert.equal(new Set(SIMON_PADS.map((p) => p.pic)).size, SIMON_PADS.length);
        assert.equal(new Set(SIMON_PADS.map((p) => p.color)).size, SIMON_PADS.length);
        assert.deepEqual(SIMON_PADS.map((p) => p.note), [0, 1, 2, 3, 4, 5]);
        assert.equal(PAD_NOTES.length, SIMON_PADS.length);
        for (const pad of SIMON_PADS) assert.doesNotMatch(pad.name, EMOJI);
        assert.equal(getSimonPad("cat")?.name, "Mačka");
        assert.equal(getSimonPad("lav"), undefined);
    });
});

describe("simon monitor state", () => {
    it("starts empty and keeps only known pads on the board", () => {
        const empty = emptySimonView(4);
        assert.equal(empty.totalRounds, 4);
        assert.equal(empty.phase, "intro");
        const merged = mergeSimonMonitor({
            pads: ["frog", "duck", "lav", "frog"],
            sequence: ["duck", "fish", "frog"],
            phase: "nešto",
            lit: "fish",
            playing: 7,
            pressed: "duck",
            entered: 9,
            round: 9,
            totalRounds: 4,
            feedback: "bravo",
            hint: true,
        } as unknown as Partial<SimonView>);
        assert.deepEqual(merged.pads, ["frog", "duck"]);
        assert.deepEqual(merged.sequence, ["duck", "frog"]);
        assert.equal(merged.phase, "intro");
        assert.equal(merged.lit, null);
        assert.equal(merged.playing, null);
        assert.equal(merged.pressed, "duck");
        assert.equal(merged.entered, 2);
        assert.equal(merged.round, 4);
        assert.equal(merged.feedback, null);
        assert.equal(merged.hint, true);
        assert.deepEqual(mergeSimonMonitor(null), emptySimonView(1));
    });

    it("shows the playback to the monitor (lit pad and its place)", () => {
        const merged = mergeSimonMonitor({ pads: ["frog", "duck"], sequence: ["frog", "duck"], phase: "show", lit: "duck", playing: 1 });
        assert.equal(merged.phase, "show");
        assert.equal(merged.lit, "duck");
        assert.equal(merged.playing, 1);
    });
});

describe("simon game", () => {
    const source = read("app/components/games/SimonGame.tsx") + read("app/components/games/data/simonLevels.ts") + read("app/components/games/simon/SimonArt.tsx");

    it("never says where to tap and draws no emoji", () => {
        const strings = source.match(/"[^"\n]*"|`[^`\n]*`/g) ?? [];
        for (const text of strings) assert.doesNotMatch(text, WHERE_TO_TAP, text);
        assert.doesNotMatch(read("app/components/games/SimonGame.tsx") + read("app/components/games/simon/SimonArt.tsx"), EMOJI);
    });

    it("plays tones only through the shared quiet synth and works without sound", () => {
        assert.match(source, /playPad\(/);
        assert.match(source, /useTaskSound\(\)/);
        assert.match(source, /Zvuk je isključen: gledaj svetla\./);
        assert.doesNotMatch(source, /new Audio|\.mp3|\.wav/);
    });

    it("has a key for every pad on the shared board", () => {
        assert.match(source, /data-action=\{`pad:\$\{id\}`\}/);
    });
});

describe("simon registry entry", () => {
    const game = getGame("simon");

    it("is activity 44, graded, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 44);
        assert.equal(game.title, "Zapamti niz");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(ROOT, "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        assert.match(read("supabase/migrations/0026_calm_games.sql"), /\(44, 'Zapamti niz', '[^']+', 'cognitive'/);
    });

    it("is played with a friend in turns, on one device and on the shared board", () => {
        assert.ok(isTogetherGame("simon"));
        assert.ok(hasSharedBoard("simon"));
        assert.equal(versusFormat("simon"), "turns");
    });
});
