// Igra „Mešaj boje” (app/components/games/data/mixColorsLevels.ts): tabela mešanja, nivoi,
// tegle (svaki par u tabeli), izbori, stanje za monitor i upis u registar igara.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    MIXES,
    PAINTS,
    THINGS,
    buildMixLevel,
    emptyMixView,
    getPaint,
    mergeMixMonitor,
    mixOf,
    mixRule,
    mixSentence,
    pairsFor,
    type MixView,
    type PaintId,
} from "@/app/components/games/data/mixColorsLevels";
import { MixBowl, PaintBlob, PaintPot, ThingArt } from "@/app/components/games/mixcolors/MixArt";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { seededRandom } from "@/lib/seededRandom";
import { versusFormat } from "@/lib/versusFormat";

const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const PRIMARY: PaintId[] = ["red", "yellow", "blue"];
const EMOJI = /\p{Extended_Pictographic}/u;
const WHERE_TO_TAP = /dodirni|pritisni|klikni|prevuci/i;

describe("tabela mešanja", () => {
    it("has every paint once, with a colour and Serbian forms", () => {
        assert.equal(new Set(PAINTS.map((p) => p.id)).size, PAINTS.length);
        for (const paint of PAINTS) {
            assert.match(paint.hex, /^#[0-9A-F]{6}$/);
            assert.match(paint.edge, /^#[0-9A-F]{6}$/);
            assert.ok(paint.name === "braon" || paint.name.endsWith("a"), paint.id);
            assert.ok(paint.acc === "braon" || paint.acc.endsWith("u"), paint.id);
        }
    });

    it("mixes the three primaries into the three secondaries (order does not matter)", () => {
        assert.equal(mixOf("red", "yellow"), "orange");
        assert.equal(mixOf("yellow", "red"), "orange");
        assert.equal(mixOf("blue", "yellow"), "green");
        assert.equal(mixOf("red", "blue"), "purple");
        assert.equal(mixOf("white", "red"), "pink");
        assert.equal(mixOf("black", "white"), "gray");
        assert.equal(mixOf("orange", "blue"), "brown");
        assert.equal(mixOf("red", "red"), null);
    });

    it("has one result per pair and only known paints", () => {
        const keys = MIXES.map(([a, b]) => [a, b].sort().join("+"));
        assert.equal(new Set(keys).size, keys.length);
        for (const [a, b, r] of MIXES) for (const id of [a, b, r]) assert.ok(getPaint(id), id);
    });

    it("says what came out in Serbian (accusative)", () => {
        assert.equal(mixSentence("red", "yellow"), "Crvena i žuta daju narandžastu.");
        assert.equal(mixSentence("blue", "white"), "Plava i bela daju svetloplavu.");
        assert.equal(mixSentence("orange", "blue"), "Narandžasta i plava daju braon.");
    });
});

describe("nivoi", () => {
    const settings = [
        { maxChoices: 2, maxRounds: BAND_PRESETS.young.maxRounds },
        { maxChoices: 4, maxRounds: BAND_PRESETS.middle.maxRounds },
        { maxChoices: 6, maxRounds: BAND_PRESETS.older.maxRounds },
    ];

    for (const level of LEVELS) {
        it(`level ${level}: every task can be solved and every pot pair is in the table`, () => {
            const rule = mixRule(level);
            for (const opts of settings) {
                for (let seed = 0; seed < 6; seed += 1) {
                    const rounds = buildMixLevel(level, { ...opts, random: seededRandom(`mix-${level}-${seed}-${opts.maxRounds}`) });
                    assert.ok(rounds.length >= 2 && rounds.length <= Math.max(2, Math.min(rule.rounds, opts.maxRounds)));
                    for (const round of rounds) {
                        assert.equal(mixOf(round.pair[0], round.pair[1]), round.target);
                        if (round.kind === "predict") {
                            assert.ok(round.choices.includes(round.target));
                            assert.equal(new Set(round.choices).size, round.choices.length, "unique choices");
                            assert.equal(round.choices.length, Math.max(2, Math.min(rule.choices, opts.maxChoices)));
                            // Boje iz para se ne nude kao odgovor
                            for (const id of round.pair) assert.ok(!round.choices.includes(id));
                        } else {
                            assert.ok(round.thing, "something to paint");
                            assert.equal(THINGS.find((t) => t.id === round.thing)?.color, round.target);
                            assert.equal(new Set(round.pots).size, round.pots.length);
                            assert.ok(round.pots.length >= 3 || rule.pots < 3, `${level}: ${round.pots}`);
                            assert.ok(round.pots.includes(round.pair[0]) && round.pots.includes(round.pair[1]));
                            for (const a of round.pots) for (const b of round.pots) if (a !== b) assert.ok(mixOf(a, b), `${a}+${b}`);
                            for (const pot of round.pots) assert.ok(rule.potPool.includes(pot), pot);
                        }
                    }
                }
            }
        });
    }

    it("goes from primaries (easy) to white (medium) and black (hard)", () => {
        for (const level of LEVELS) {
            const rounds = buildMixLevel(level, { maxChoices: 6, maxRounds: 8, random: seededRandom(`order-${level}`) });
            const used = new Set(rounds.flatMap((r) => [...r.pair, ...r.pots]));
            if (level <= 5) assert.ok([...used].every((id) => PRIMARY.includes(id)), `${level}`);
            if (level <= 8) assert.ok(!used.has("black"), `${level}`);
            if (level >= 6 && level <= 8) assert.ok(used.has("white"), `${level}`);
            if (level >= 11) assert.ok(rounds.some((r) => r.pair.includes("black") || ["brown", "darkgreen", "darkpurple"].includes(r.target)), `${level}`);
        }
        // Prvi nivo: samo „Šta će nastati?” sa dva izbora
        const first = buildMixLevel(1, { maxChoices: 6, maxRounds: 8 });
        assert.ok(first.every((r) => r.kind === "predict" && r.choices.length === 2));
    });

    it("every colour that can be asked for has at least one pair", () => {
        for (const level of LEVELS) for (const target of mixRule(level).targets) assert.ok(pairsFor(target).length > 0, target);
    });
});

describe("stanje za monitor", () => {
    it("starts empty and rejects unknown values", () => {
        assert.equal(emptyMixView(0).totalRounds, 1);
        const merged = mergeMixMonitor({
            kind: "make",
            target: "green",
            pair: ["yellow", "blue"],
            thing: "frog",
            pots: ["yellow", "blue", "red", "x"],
            bowl: ["yellow", "zzz"],
            mixed: "nope",
            round: 9,
            totalRounds: 4,
            score: -3,
        } as unknown as Partial<MixView>);
        assert.equal(merged.round, 4);
        assert.equal(merged.score, 0);
        assert.deepEqual(merged.pots, ["yellow", "blue", "red"]);
        assert.deepEqual(merged.bowl, ["yellow"]);
        assert.equal(merged.mixed, null);
        assert.equal(merged.thing, "frog");
        const bad = mergeMixMonitor({ kind: "predict", target: "green", choices: ["red", "blue"] });
        assert.equal(bad.target, "");
        assert.deepEqual(bad.choices, []);
        assert.equal(mergeMixMonitor(null).target, "");
    });
});

describe("crteži i tekstovi", () => {
    it("draws every pot, blob, bowl and thing without emoji or broken numbers", () => {
        const parts = [
            ...PAINTS.flatMap((p) => [createElement(PaintPot, { color: p.id }), createElement(PaintBlob, { color: p.id })]),
            createElement(MixBowl, { colors: [], mixed: null, mixing: false, calm: true, question: true }),
            createElement(MixBowl, { colors: ["red", "blue"], mixed: null, mixing: true, calm: false }),
            createElement(MixBowl, { colors: ["red", "blue"], mixed: "purple", mixing: false, calm: true }),
            ...THINGS.flatMap((t) => [createElement(ThingArt, { id: t.id, color: null }), createElement(ThingArt, { id: t.id, color: t.color })]),
        ];
        for (const part of parts) {
            const html = renderToStaticMarkup(part);
            assert.doesNotMatch(html, EMOJI);
            assert.doesNotMatch(html, /NaN|undefined/);
        }
    });

    it("never tells the child where to tap and has no emoji in what is shown or said", () => {
        for (const file of ["app/components/games/MixColorsGame.tsx", "app/components/games/data/mixColorsLevels.ts", "app/components/games/mixcolors/MixArt.tsx"]) {
            const source = read(file);
            assert.doesNotMatch(source, WHERE_TO_TAP, file);
            assert.doesNotMatch(source, EMOJI, file);
            assert.doesNotMatch(source, /Math\.random\(\)/, file);
        }
    });
});

describe("mixcolors game registry entry", () => {
    const game = getGame("mixcolors");

    it("is activity 46, graded, cognitive, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 46);
        assert.equal(game.gameType, "mixcolors");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        assert.match(read("supabase/migrations/0026_calm_games.sql"), /\(46, 'Mešaj boje', '[^']+', 'cognitive'/);
    });

    it("can be played with a friend on one device and on two, taking turns in a duel", () => {
        assert.ok(isTogetherGame("mixcolors"));
        assert.ok(isRemoteGame("mixcolors"));
        assert.equal(versusFormat("mixcolors"), "turns");
    });
});
