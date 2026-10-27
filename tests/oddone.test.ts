// Igra „Šta ne pripada?” (app/components/games/data/oddoneLevels.ts): slike i svojstva, nivoi,
// jedan uljez u svakom zadatku, „Zašto?”, rečenice, bodovanje, monitor i registar.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    buildOddoneLevel,
    cardValue,
    defensibleOdds,
    emptyOddView,
    FOUND_SENTENCE,
    groupLabel,
    isValidRound,
    mergeOddoneMonitor,
    mistakeSentence,
    nearSounds,
    ODDONE_LEVELS,
    ODDONE_MAX_LEVEL,
    oddoneResult,
    oddQuestion,
    oddSentence,
    outliersBy,
    OWN_THINGS,
    reasonMistake,
    REASON_IDS,
    REASONS,
    RULE_REASON,
    singleReason,
    solveOddView,
    THINGS,
    WHY_QUESTION,
    type OddCard,
    type OddRound,
    type OddView,
} from "@/app/components/games/data/oddoneLevels";
import { isPictureId } from "@/app/components/games/pictures";
import { ODD_ART, REASON_ART_IDS } from "@/app/components/games/oddone/OddOneArt";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame, MAX_LEVEL } from "@/lib/games";
import { isRemoteGame } from "@/lib/invite";
import { isTogetherGame } from "@/lib/playTogether";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde|tamo gore|levo|desno|tu dole/i;
const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1);

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

/** Svaka podešenost uzrasta (5/6/8 zadataka, 3/4/6 izbora) i mnogo semena */
function* allPlans(level: number): Generator<{ plan: OddRound[]; maxRounds: number; maxChoices: number; seed: number }> {
    for (const preset of Object.values(BAND_PRESETS)) {
        for (const maxChoices of [3, 4, 6]) {
            for (const seed of SEEDS) {
                const plan = buildOddoneLevel(level, { maxRounds: preset.maxRounds, maxChoices, random: seeded(seed * 31 + level) });
                yield { plan, maxRounds: preset.maxRounds, maxChoices, seed };
            }
        }
    }
}

const focused = (round: OddRound) => round.prompt === "focusFirst" || round.prompt === "focusNext";

describe("oddone pictures", () => {
    it("every thing has a drawing (shared picture set or own art) and a name", () => {
        for (const thing of THINGS) {
            assert.ok(isPictureId(thing.id) || thing.id in ODD_ART, thing.id);
            assert.ok(thing.name.length > 1, thing.id);
        }
        for (const id of OWN_THINGS) assert.ok(id in ODD_ART, id);
    });

    it("ids are unique and names are not repeated (the voice says the name)", () => {
        assert.equal(new Set(THINGS.map((thing) => thing.id)).size, THINGS.length);
        assert.equal(new Set(THINGS.map((thing) => thing.name)).size, THINGS.length);
    });

    it("near sounds (s/š, c/č/ć) count as the same for the first-sound rule", () => {
        assert.ok(nearSounds("S", "Š"));
        assert.ok(nearSounds("Č", "Ć"));
        assert.ok(!nearSounds("B", "K"));
    });
});

describe("oddone levels", () => {
    it("has 15 levels in three tiers with a ramp (more cards, rule change, then „Zašto?”)", () => {
        assert.equal(ODDONE_MAX_LEVEL, MAX_LEVEL);
        assert.deepEqual(
            ODDONE_LEVELS.map((rule) => rule.tier),
            [...Array(5).fill("Lako"), ...Array(5).fill("Srednje"), ...Array(5).fill("Teško")]
        );
        // Podrška se povlači: oznaka „šta se gleda” i rana pomoć samo na lakim nivoima
        for (const [i, rule] of ODDONE_LEVELS.entries()) {
            assert.equal(rule.earlyHint, i < 5, `nivo ${i + 1}`);
            assert.equal(rule.legend !== null, i < 5, `nivo ${i + 1}`);
            assert.equal(rule.why > 0, i >= 12, `nivo ${i + 1}`);
        }
        assert.ok(ODDONE_LEVELS[14].why >= ODDONE_LEVELS[12].why);
        assert.ok(Math.max(...ODDONE_LEVELS.map((rule) => rule.cards)) === 5);
    });

    it("every plan is valid: exactly one defensible odd card, unique keys, 3…choiceLimit cards", () => {
        for (const level of LEVELS) {
            for (const { plan, maxRounds, maxChoices, seed } of allPlans(level)) {
                const rule = ODDONE_LEVELS[level - 1];
                const expected = rule.makers.includes("flex") ? Math.max(2, Math.min(rule.rounds, maxRounds) - (Math.min(rule.rounds, maxRounds) % 2)) : Math.min(rule.rounds, maxRounds);
                assert.equal(plan.length, expected, `nivo ${level}, seme ${seed}`);
                for (const round of plan) {
                    const where = `nivo ${level}, seme ${seed}, ${round.cards.map((card) => card.id).join(" ")}`;
                    assert.ok(round.cards.length >= 3 && round.cards.length <= Math.max(3, maxChoices), where);
                    assert.ok(round.cards.length <= rule.cards, where);
                    assert.equal(new Set(round.cards.map((card) => card.id)).size, round.cards.length, where);
                    assert.ok(round.cards.some((card) => card.id === round.odd), where);
                    for (const card of round.cards) assert.match(card.id, /^[\w-]+$/, where);
                    // Odbranjiv je samo jedan uljez; na nivou promene pravila — po pravilu koje se gleda
                    if (focused(round)) assert.deepEqual(outliersBy(round.cards, round.rule), [round.odd], where);
                    else assert.deepEqual(defensibleOdds(round.cards), [round.odd], where);
                    assert.ok(isValidRound(round.cards, round.odd, focused(round) ? round.rule : undefined), where);
                }
            }
        }
    });

    it("„Zašto?” offers the right reason once, among 2–3 different reasons, and only one fits", () => {
        for (const level of LEVELS) {
            const rule = ODDONE_LEVELS[level - 1];
            for (const { plan } of allPlans(level)) {
                for (const round of plan) {
                    if (rule.why === 0) {
                        assert.deepEqual(round.reasons, []);
                        continue;
                    }
                    assert.equal(round.reason, RULE_REASON[round.rule]);
                    assert.equal(round.reasons.length, rule.why);
                    assert.equal(new Set(round.reasons).size, round.reasons.length);
                    assert.equal(round.reasons.filter((id) => id === round.reason).length, 1);
                    assert.ok(singleReason(round.cards, round.odd, round.rule), round.cards.map((card) => card.id).join(" "));
                }
            }
        }
    });

    it("level 1 starts with the demonstrated red circles and one blue circle", () => {
        const [first] = buildOddoneLevel(1, { maxRounds: 5, maxChoices: 4, random: seeded(3) });
        const odd = first.cards.find((card) => card.id === first.odd)!;
        assert.equal(odd.color, "blue");
        assert.ok(first.cards.every((card) => card.shape === "circle"));
    });

    it("the rule-change level keeps the same cards for two rounds with a different rule and odd card", () => {
        const plan = buildOddoneLevel(12, { maxRounds: 6, maxChoices: 4, random: seeded(9) });
        assert.equal(plan.length % 2, 0);
        for (let i = 0; i < plan.length; i += 2) {
            assert.deepEqual(plan[i].cards, plan[i + 1].cards);
            assert.equal(plan[i].pair, plan[i + 1].pair);
            assert.notEqual(plan[i].rule, plan[i + 1].rule);
            assert.notEqual(plan[i].odd, plan[i + 1].odd);
            assert.equal(plan[i].prompt, "focusFirst");
            assert.equal(plan[i + 1].prompt, "focusNext");
        }
    });

    it("the hidden-rule level uses parity and first sounds, never a near sound as the odd one", () => {
        const rules = new Set<string>();
        for (const { plan } of allPlans(15)) {
            for (const round of plan) {
                rules.add(round.rule);
                if (round.rule !== "sound") continue;
                const odd = round.cards.find((card) => card.id === round.odd)!;
                const group = round.cards.find((card) => card.id !== round.odd)!;
                assert.ok(!nearSounds(cardValue(odd, "sound")!, cardValue(group, "sound")!), round.cards.map((card) => card.id).join(" "));
            }
        }
        assert.deepEqual([...rules].sort(), ["parity", "sound"]);
    });

    it("the same seed gives the same plan", () => {
        const a = buildOddoneLevel(8, { maxRounds: 6, maxChoices: 6, random: seeded(42) });
        const b = buildOddoneLevel(8, { maxRounds: 6, maxChoices: 6, random: seeded(42) });
        assert.deepEqual(a, b);
        assert.notDeepEqual(a, buildOddoneLevel(8, { maxRounds: 6, maxChoices: 6, random: seeded(43) }));
    });
});

describe("oddone sentences", () => {
    it("explains the group and the odd one, in Serbian, never telling where to tap", () => {
        const lines: string[] = [WHY_QUESTION, FOUND_SENTENCE];
        for (const level of LEVELS) {
            for (const { plan } of allPlans(level)) {
                for (const round of plan) {
                    lines.push(oddQuestion(round), oddSentence(round), groupLabel(round));
                    for (const card of round.cards) if (card.id !== round.odd) lines.push(mistakeSentence(round, card.id));
                    for (const reason of round.reasons) if (reason !== round.reason) lines.push(reasonMistake(round, reason));
                }
            }
        }
        for (const text of new Set(lines)) {
            assert.ok(text.length > 0, "prazna rečenica");
            assert.doesNotMatch(text, TAP_WORDS, text);
            assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
            assert.doesNotMatch(text, /undefined|null|NaN|\s{2}/, text);
        }
    });

    it("says the facts from the brief", () => {
        const pic = (id: string): OddCard => ({ id, look: "pic", pic: id, size: "mid" });
        const animals: Pick<OddView, "cards" | "odd" | "rule"> = { cards: [pic("cat"), pic("dog"), pic("cow"), pic("apple")], odd: "apple", rule: "kind" };
        assert.equal(oddSentence(animals), "Mačka, pas i krava su životinje. Jabuka je voće.");
        assert.equal(groupLabel(animals), "Sve su životinje.");
        const flying: Pick<OddView, "cards" | "odd" | "rule"> = { cards: [pic("duck"), pic("plane"), pic("butterfly"), pic("car")], odd: "car", rule: "flies" };
        assert.equal(mistakeSentence(flying, "duck"), "Patka leti. Pogledaj šta ne leti.");
        assert.equal(oddSentence(flying), "Patka, avion i leptir lete. Auto ne leti.");
        const shapes: Pick<OddView, "cards" | "odd" | "rule"> = {
            cards: [
                { id: "a", look: "shape", shape: "circle", color: "blue", size: "mid" },
                { id: "b", look: "shape", shape: "circle", color: "blue", size: "mid" },
                { id: "c", look: "shape", shape: "circle", color: "red", size: "mid" },
            ],
            odd: "c",
            rule: "color",
        };
        assert.equal(oddSentence(shapes), "Crveni krug nije plav. Sve ostalo je plavo.");
        assert.equal(reasonMistake(shapes, "shape"), "Sve je istog oblika. Pogledaj još jednom.");
        const count: Pick<OddView, "cards" | "odd" | "rule"> = {
            cards: [
                { id: "a", look: "count", pic: "fish", count: 4, size: "mid" },
                { id: "b", look: "count", pic: "apple", count: 3, size: "mid" },
                { id: "c", look: "count", pic: "ball", count: 3, size: "mid" },
            ],
            odd: "a",
            rule: "count",
        };
        assert.equal(oddSentence(count), "Riba ima 4, a svega ostalog po 3.");
    });
});

describe("oddone scoring", () => {
    const view = (extra: Partial<OddView> = {}): OddView => ({ ...emptyOddView(5), ...extra });

    it("does not score the demonstrated first round of level 1", () => {
        const { next, modeled } = solveOddView(view({ round: 1 }), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
    });

    it("counts a clean round as correct, a helped round as prompted, a round with mistakes as neither", () => {
        assert.equal(solveOddView(view({ round: 2 }), 1).next.correctCount, 1);
        assert.equal(solveOddView(view({ round: 2, helped: true }), 3).next.promptedCount, 1);
        assert.equal(solveOddView(view({ round: 2, hint: true }), 3).next.promptedCount, 1);
        const missed = solveOddView(view({ round: 2, wrong: ["reason:color"] }), 13).next;
        assert.equal(missed.correctCount + missed.promptedCount, 0);
    });

    it("reports correct + prompted ≤ total, without the demo round", () => {
        const result = oddoneResult(view({ totalRounds: 4, correctCount: 4, promptedCount: 4 }), 1, 30);
        assert.equal(result.total, 3);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });

    it("drops anything unknown that comes from the live monitor", () => {
        const merged = mergeOddoneMonitor({
            cards: [
                { id: "cat", look: "pic", pic: "cat", size: "mid" },
                { id: "x", look: "pic", pic: "unicorn", size: "mid" },
                { id: "cat", look: "pic", pic: "dog", size: "mid" },
                { id: "c1", look: "shape", shape: "hexagon", color: "red", size: "mid" },
                { id: "n1", look: "number", num: 7, color: "blue", size: "huge" },
                { id: "k", look: "count", pic: "fish", count: 40, size: "mid" },
                { id: "bad id!", look: "pic", pic: "dog", size: "mid" },
            ],
            odd: "n1",
            rule: "magic",
            reasons: ["color", "smell", "color"],
            reason: "smell",
            ask: "why",
            picked: "card:x",
            wrong: ["card:cat", "card:zzz", "reason:color", "reason:taste", 5],
            round: 99,
            totalRounds: 4,
            score: -3,
        } as unknown as Partial<OddView>);
        assert.deepEqual(
            merged.cards.map((card) => card.id),
            ["cat", "n1"]
        );
        assert.equal(merged.cards[1].size, "mid");
        assert.equal(merged.odd, "n1");
        assert.equal(merged.rule, "color");
        assert.deepEqual(merged.reasons, ["color"]);
        assert.equal(merged.reason, null);
        assert.equal(merged.ask, "why");
        assert.equal(merged.picked, null);
        assert.deepEqual(merged.wrong, ["card:cat", "reason:color"]);
        assert.equal(merged.round, 4);
        assert.equal(merged.score, 0);
        assert.deepEqual(mergeOddoneMonitor({ odd: "ghost", cards: [] }).cards, []);
        assert.equal(mergeOddoneMonitor(null).cards.length, 0);
    });

    it("every reason has a label and both explanations", () => {
        for (const id of REASON_IDS) {
            assert.ok(REASONS[id].label && REASONS[id].same && REASONS[id].differ, id);
            assert.ok(id in REASON_ART_IDS, id);
        }
    });
});

describe("oddone game component", () => {
    const source = readFileSync(path.join(process.cwd(), "app/components/games/OddOneGame.tsx"), "utf8");

    it("takes its tasks only from the seeded game random", () => {
        assert.doesNotMatch(source, /Math\.random/);
        assert.match(source, /useGameRandom\(\)/);
    });

    it("gives every choice and reason a shared-board key", () => {
        assert.match(source, /data-action=\{`choice:\$\{card\.id\}`\}/);
        assert.match(source, /data-action=\{`reason:\$\{id\}`\}/);
    });
});

describe("oddone game registry entry", () => {
    const game = getGame("oddone");

    it("is activity 33, graded, cognitive, with a cover, a migration and its own colour", () => {
        assert.equal(game.activityId, 33);
        assert.equal(game.gameType, "oddone");
        assert.ok(game.graded);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        assert.match(game.accent.solid, /mulberry/);
        const colour = (classes: string) => classes.replace(/^bg-/, "").replace(/-\d+$/, "");
        for (const other of GAMES) if (other.id !== game.id) assert.notEqual(colour(other.accent.solid), colour(game.accent.solid), other.id);
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0024_logic_games.sql"), "utf8");
        assert.match(sql, /\(33, 'Šta ne pripada\?', '[^']+', 'cognitive'/);
    });

    it("can be played with a friend on one device and on two", () => {
        assert.ok(isTogetherGame("oddone"));
        assert.ok(isRemoteGame("oddone"));
    });
});
