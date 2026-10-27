// Sedam igara o svetu oko nas (world/): zajednička pravila za svaki nivo svake igre — zadaci su
// ispravni i rešivi, izbori i korpe se slažu, tekst se može pročitati i ćirilicom, glas nikad ne
// kaže gde se dodiruje, svaki crtež postoji, bodovanje i stanje monitora. Pojedinosti svake igre
// su u tests/<igra>.test.ts.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { buildBodyLevel, BODY_LEVELS, bodyPics } from "@/app/components/games/data/bodyLevels";
import { buildHabitatsLevel, HABITATS_LEVELS, habitatPics } from "@/app/components/games/data/habitatsLevels";
import { buildJobsLevel, JOBS_LEVELS, jobPics } from "@/app/components/games/data/jobsLevels";
import { buildOppositesLevel, OPPOSITES_LEVELS, oppositePics } from "@/app/components/games/data/oppositesLevels";
import { buildSeasonsLevel, SEASONS_LEVELS, seasonPics } from "@/app/components/games/data/seasonsLevels";
import { buildSyllablesLevel, SYLLABLES_LEVELS, SYLLABLE_WORDS } from "@/app/components/games/data/syllablesLevels";
import { buildTrafficLevel, TRAFFIC_LEVELS, trafficPics } from "@/app/components/games/data/trafficLevels";
import { bodyDrawing, hasZone } from "@/app/components/games/body/BodyArt";
import { habitatDrawing } from "@/app/components/games/habitats/HabitatsArt";
import { jobDrawing } from "@/app/components/games/jobs/JobsArt";
import { OPPOSITE_ART } from "@/app/components/games/opposites/OppositesArt";
import { seasonDrawing } from "@/app/components/games/seasons/SeasonsArt";
import { trafficDrawing } from "@/app/components/games/traffic/TrafficArt";
import { basePic, hasBasePic } from "@/app/components/games/world/basePics";
import {
    boardDone,
    cycleThrough,
    emptyWorldView,
    fitsBin,
    mergeWorldMonitor,
    modeledCount,
    nextPiece,
    solveWorldView,
    worldResult,
    worldRoundView,
    type BuildOptions,
    type WorldRound,
    type WorldView,
} from "@/app/components/games/world/worldPlay";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, MAX_LEVEL, getGame, type GameId } from "@/lib/games";
import { TOGETHER_GAMES } from "@/lib/playTogether";
import { hasSharedBoard, turnRuleFor } from "@/lib/sharedPlay";
import { VERSUS_FORMATS } from "@/lib/versusFormat";
import { toCyrillic } from "@/lib/script";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirni|pritisni|prevuci|klikni|ovde|tamo gore/i;
const read = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

type Builder = (level: number, options: BuildOptions) => WorldRound[];

interface WorldGameSpec {
    id: GameId;
    file: string;
    build: Builder;
    levels: readonly { earlyHint: boolean; intro: boolean }[];
    /** Crtež za ključ (null kad ga nema) */
    draw: (pic: string) => unknown;
    pics: () => string[];
    /** Igra sme da kaže „levo” i „desno” (gde gledamo pre prelaska ulice) */
    sides?: boolean;
}

const SPECS: WorldGameSpec[] = [
    { id: "opposites", file: "Opposites", build: buildOppositesLevel, levels: OPPOSITES_LEVELS, draw: (pic) => OPPOSITE_ART[pic]?.() ?? null, pics: oppositePics },
    {
        id: "syllables",
        file: "Syllables",
        build: buildSyllablesLevel,
        levels: SYLLABLES_LEVELS,
        draw: (pic) => (/^dots[1-4]$/.test(pic) ? pic : basePic(pic)),
        pics: () => [...SYLLABLE_WORDS.map((w) => w.pic), "dots1", "dots2", "dots3", "dots4"],
    },
    { id: "jobs", file: "Jobs", build: buildJobsLevel, levels: JOBS_LEVELS, draw: jobDrawing, pics: jobPics },
    { id: "habitats", file: "Habitats", build: buildHabitatsLevel, levels: HABITATS_LEVELS, draw: habitatDrawing, pics: habitatPics },
    { id: "seasons", file: "Seasons", build: buildSeasonsLevel, levels: SEASONS_LEVELS, draw: seasonDrawing, pics: seasonPics },
    { id: "body", file: "Body", build: buildBodyLevel, levels: BODY_LEVELS, draw: bodyDrawing, pics: bodyPics },
    { id: "traffic", file: "Traffic", build: buildTrafficLevel, levels: TRAFFIC_LEVELS, draw: trafficDrawing, pics: trafficPics, sides: true },
];

/** Svi tekstovi zadatka (glas i ekran) */
function textsOf(round: WorldRound): string[] {
    const texts = [round.prompt, round.why, round.say ?? ""];
    if (round.kind === "pick") texts.push(...round.clues, ...Object.values(round.notes), ...round.choices.map((c) => c.label), round.cue?.label ?? "");
    if (round.kind === "sort") texts.push(...Object.values(round.says), ...Object.values(round.notes), ...round.items.map((c) => c.label), ...round.bins.map((c) => c.label));
    if (round.kind === "order") texts.push(...Object.values(round.notes), ...round.items.map((c) => c.label));
    if (round.kind === "point") texts.push(...Object.values(round.notes), round.cue?.label ?? "");
    if (round.kind === "clap") texts.push(round.word.label, ...round.syllables);
    return texts.filter((text) => text.length > 0);
}

function picsOf(round: WorldRound): string[] {
    switch (round.kind) {
        case "pick":
            return [...(round.style === "number" ? [] : round.choices.map((c) => c.pic)), ...(round.cue ? [round.cue.pic] : [])];
        case "sort":
            return [...round.items, ...round.bins].map((c) => c.pic);
        case "order":
            return round.items.map((c) => c.pic);
        case "clap":
            return [round.word.pic];
        case "point":
            return round.cue ? [round.cue.pic] : [];
        case "wait":
            return [];
    }
}

/** Planovi za sve nivoe, sa nekoliko semena i za sva tri uzrasta */
function allPlans(build: Builder): { level: number; plan: WorldRound[]; options: BuildOptions }[] {
    const result: { level: number; plan: WorldRound[]; options: BuildOptions }[] = [];
    for (const level of LEVELS) {
        for (const preset of Object.values(BAND_PRESETS)) {
            for (const seed of [1, 7, 42, 99]) {
                const options = { maxRounds: preset.maxRounds, maxChoices: preset.maxChoices, random: seeded(seed * 31 + level) };
                result.push({ level, plan: build(level, options), options });
            }
        }
    }
    return result;
}

for (const spec of SPECS) {
    describe(`${spec.id}: nivoi`, () => {
        const plans = allPlans(spec.build);

        it("has fifteen levels, three tiers of five, with early help only on easy levels", () => {
            assert.equal(spec.levels.length, MAX_LEVEL);
            spec.levels.forEach((rule, i) => {
                if (rule.earlyHint) assert.ok(i < 5, `nivo ${i + 1}: rana pomoć samo na lakim nivoima`);
            });
            assert.ok(spec.levels.slice(0, 5).some((rule) => rule.earlyHint), "laki nivoi imaju ranu pomoć");
        });

        it("builds every level for every age preset: right number of tasks, at least two choices, a demo first", () => {
            for (const { level, plan, options } of plans) {
                assert.ok(plan.length >= 2 && plan.length <= options.maxRounds, `${spec.id} ${level}: ${plan.length} zadataka`);
                // Pokazni zadatak: uvek prvi zadatak prvog nivoa i prvi zadatak nivoa koji uvodi novu vrstu igre
                assert.equal(plan[0].modeled, level === 1 || spec.levels[level - 1].intro, `${spec.id} ${level}: pokazni`);
                assert.ok(plan.slice(1).every((round) => !round.modeled), `${spec.id} ${level}: samo prvi je pokazni`);
                for (const round of plan) {
                    if (round.kind === "pick") {
                        assert.ok(round.choices.length >= 2 && round.choices.length <= Math.max(options.maxChoices, 2), `${spec.id} ${level}: ${round.choices.length} izbora`);
                        assert.equal(new Set(round.choices.map((c) => c.id)).size, round.choices.length, `${spec.id} ${level}: isti izbor dvaput`);
                        assert.ok(round.choices.some((c) => c.id === round.answer), `${spec.id} ${level}: tačan odgovor među izborima (${round.prompt})`);
                        for (const choice of round.choices) {
                            if (choice.id !== round.answer) assert.ok((round.notes[choice.id] ?? "").length > 0, `${spec.id} ${level}: objašnjenje za ${choice.id}`);
                        }
                        if (round.style === "pic") assert.equal(new Set(round.choices.map((c) => c.pic)).size, round.choices.length, `${spec.id} ${level}: dve iste slike (${round.prompt})`);
                    }
                    if (round.kind === "sort") {
                        assert.ok(round.bins.length >= 2 && round.bins.length <= 4, `${spec.id} ${level}: korpe`);
                        assert.ok(round.items.length >= 2 && round.items.length <= 8, `${spec.id} ${level}: slike`);
                        assert.equal(new Set(round.items.map((c) => c.id)).size, round.items.length, `${spec.id} ${level}: ista slika dvaput`);
                        const bins = round.bins.map((b) => b.id);
                        for (const item of round.items) {
                            assert.ok(bins.includes(round.homes[item.id]), `${spec.id} ${level}: ${item.id} nema korpu`);
                            assert.ok(round.says[item.id] && round.notes[item.id], `${spec.id} ${level}: rečenice za ${item.id}`);
                        }
                        // Svaka korpa dobije bar jednu sliku
                        for (const bin of bins) assert.ok(round.items.some((item) => round.homes[item.id] === bin), `${spec.id} ${level}: prazna korpa ${bin}`);
                    }
                    if (round.kind === "order") {
                        assert.deepEqual([...round.sequence].sort(), round.items.map((c) => c.id).sort(), `${spec.id} ${level}: redosled`);
                        assert.ok(round.given >= 0 && round.given < round.sequence.length);
                        for (const id of round.sequence.slice(round.given)) assert.ok(round.notes[id], `${spec.id} ${level}: pomoć za ${id}`);
                    }
                    if (round.kind === "clap") {
                        assert.equal(round.syllables.join(""), round.word.label, `${spec.id} ${level}: slogovi daju reč`);
                    }
                    if (round.kind === "point") {
                        assert.ok(round.parts.includes(round.answer), `${spec.id} ${level}: deo ${round.answer}`);
                        for (const part of round.parts) assert.ok(hasZone(round.figure, part), `${spec.id} ${level}: polje za ${part} (${round.figure})`);
                        for (const part of round.parts.filter((p) => p !== round.answer)) assert.ok(round.notes[part], `${spec.id} ${level}: objašnjenje za ${part}`);
                    }
                    if (round.kind === "wait") assert.ok(round.cycles >= 1);
                }
            }
        });

        it("never tells the child where to tap, and every text can be shown in Cyrillic", () => {
            for (const { plan } of plans) {
                for (const round of plan) {
                    for (const text of textsOf(round)) {
                        assert.doesNotMatch(text, TAP_WORDS, `${spec.id}: „${text}”`);
                        if (!spec.sides) assert.doesNotMatch(text, /\blevo\b|\bdesno\b/i, `${spec.id}: „${text}”`);
                        // Latinica se prevodi slovo po slovo: posle prevoda ne sme ostati nijedno latinično slovo
                        assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, `${spec.id}: „${text}”`);
                        assert.ok(text.length <= 200, `${spec.id}: predugačko „${text}”`);
                    }
                }
            }
        });

        it("draws every picture the game uses", () => {
            for (const pic of spec.pics()) assert.ok(spec.draw(pic) !== null && spec.draw(pic) !== undefined, `${spec.id}: nema crteža „${pic}”`);
            for (const { plan } of plans) for (const round of plan) for (const pic of picsOf(round)) assert.ok(spec.draw(pic) !== null, `${spec.id}: nema crteža „${pic}”`);
        });

        it("is registered everywhere: game file, together play, duel format, shared board, monitor and statistics", () => {
            const game = getGame(spec.id);
            assert.equal(game.id, spec.id);
            assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), `${spec.id}: naslovna slika ${game.image}`);
            const source = read(`app/components/games/${spec.file}Game.tsx`);
            assert.match(source, /useGameRandom\(\)/);
            assert.match(source, /onComplete\(worldResult\(/);
            assert.ok(TOGETHER_GAMES.includes(spec.id), `${spec.id}: igra na smenu`);
            assert.ok(VERSUS_FORMATS[spec.id] === "race" || VERSUS_FORMATS[spec.id] === "turns");
            assert.ok(hasSharedBoard(spec.id), `${spec.id}: zajednička tabla`);
            assert.equal(turnRuleFor(spec.id), "pieces");
            assert.match(read("app/components/LiveMonitor.tsx"), new RegExp(`${spec.id}: dynamic\\(\\(\\) => import\\("@/app/components/games/${spec.file}Game"\\)`));
            assert.match(read("app/components/ProgressDashboard.tsx"), new RegExp(`${spec.id}: \\{ swatch: "bg-`));
            assert.ok(game.ages.min >= 3 && game.ages.max <= 10);
        });
    });
}

describe("igre o svetu: registar i baza", () => {
    it("uses activity ids 36–42 in order, with one migration that adds all seven", () => {
        assert.deepEqual(
            SPECS.map((spec) => getGame(spec.id).activityId),
            [36, 37, 38, 39, 40, 41, 42]
        );
        const migration = read("supabase/migrations/0025_world_games.sql");
        for (const spec of SPECS) {
            const game = getGame(spec.id);
            assert.match(migration, new RegExp(`\\(${game.activityId}, '${game.title.replace("?", "\\?")}', '${game.description}', '(cognitive|motor|social)'`), spec.id);
        }
        assert.match(migration, /on conflict \(id\) do update/);
    });

    it("gives each game its own accent colors, defined at the end of the theme", () => {
        const css = read("app/globals.css");
        const families = SPECS.map((spec) => getGame(spec.id).accent.solid.replace(/^bg-|-500$/g, ""));
        assert.equal(new Set(families).size, SPECS.length);
        for (const family of families) {
            for (const shade of [50, 200, 500, 700]) assert.match(css, new RegExp(`--color-${family}-${shade}:`), `${family}-${shade}`);
        }
        const others = GAMES.filter((game) => !SPECS.some((spec) => spec.id === game.id)).map((game) => game.accent.solid);
        for (const spec of SPECS) assert.ok(!others.includes(getGame(spec.id).accent.solid), spec.id);
    });
});

// ── Zajednički tok (world/worldPlay.ts) ───────────────────────────────────────

function viewFor(round: WorldRound, extra: Partial<WorldView> = {}): WorldView {
    return { ...emptyWorldView(5), ...worldRoundView(round), ...extra };
}

const PICK: WorldRound = {
    kind: "pick",
    prompt: "Koja lopta je velika?",
    why: "Lopta je velika.",
    modeled: false,
    cue: null,
    cueWide: false,
    clues: [],
    choices: [
        { id: "a", pic: "ballBig", label: "veliko" },
        { id: "b", pic: "ballSmall", label: "malo" },
    ],
    style: "pic",
    answer: "a",
    notes: { b: "Lopta je mala." },
};

describe("zajednički tok: bodovanje", () => {
    it("scores a first try 10 points and counts it as correct", () => {
        const { next, firstTry } = solveWorldView(viewFor(PICK));
        assert.equal(firstTry, true);
        assert.equal(next.score, 10);
        assert.equal(next.correctCount, 1);
        assert.equal(next.promptedCount, 0);
    });

    it("scores after a mistake or with help 5 points; help is counted as prompted, a mistake alone is not", () => {
        const afterMistake = solveWorldView(viewFor(PICK, { wrong: ["b"] })).next;
        assert.equal(afterMistake.score, 5);
        assert.equal(afterMistake.correctCount, 0);
        assert.equal(afterMistake.promptedCount, 0);
        const helped = solveWorldView(viewFor(PICK, { hint: true })).next;
        assert.equal(helped.correctCount, 0);
        assert.equal(helped.promptedCount, 1);
    });

    it("never grades a demo task, and leaves it out of the level total", () => {
        const demo = solveWorldView(viewFor({ ...PICK, modeled: true }, { hint: true })).next;
        assert.equal(demo.correctCount, 0);
        assert.equal(demo.promptedCount, 0);
        const final: WorldView = { ...emptyWorldView(5), correctCount: 3, promptedCount: 1, score: 40 };
        assert.deepEqual(worldResult(final, 1, 30), { score: 40, durationSec: 30, correct: 3, total: 4, prompted: 1 });
        assert.equal(modeledCount([{ modeled: true }, { modeled: false }]), 1);
        // correct + prompted ≤ total, uvek
        const over = worldResult({ ...final, correctCount: 9, promptedCount: 9 }, 0, 10);
        assert.ok(over.correct + (over.prompted ?? 0) <= over.total);
    });
});

describe("zajednički tok: korpe i redosled", () => {
    const sort: WorldRound = {
        kind: "sort",
        prompt: "Veliko ili malo?",
        why: "Sve je na mestu.",
        modeled: false,
        bins: [
            { id: "big", pic: "ballBig", label: "veliko" },
            { id: "small", pic: "ballSmall", label: "malo" },
        ],
        items: [
            { id: "x", pic: "teddyBig", label: "veliko" },
            { id: "y", pic: "teddySmall", label: "malo" },
        ],
        homes: { x: "big", y: "small" },
        says: { x: "Meda je veliki.", y: "Meda je mali." },
        notes: { x: "Meda je veliki.", y: "Meda je mali." },
    };
    const order: WorldRound = {
        kind: "order",
        prompt: "Redom.",
        why: "Tako.",
        modeled: false,
        items: [
            { id: "c", pic: "c", label: "c" },
            { id: "a", pic: "a", label: "a" },
            { id: "b", pic: "b", label: "b" },
        ],
        sequence: ["a", "b", "c"],
        given: 1,
        notes: { b: "Posle a dolazi b.", c: "Posle b dolazi c." },
    };

    it("accepts a picture only in its own basket, and is done when every picture is placed", () => {
        const view = viewFor(sort);
        assert.equal(fitsBin(view, "x", "big"), true);
        assert.equal(fitsBin(view, "x", "small"), false);
        assert.equal(fitsBin(view, "x", null), false);
        assert.equal(boardDone({ ...view, placed: ["x"] }), false);
        assert.equal(boardDone({ ...view, placed: ["x", "y"] }), true);
        assert.equal(nextPiece({ ...view, placed: ["x"] }), "y");
        assert.equal(nextPiece({ ...view, selected: "y" }), "y");
    });

    it("in an order task starts with the given places filled and accepts only the next one", () => {
        const view = viewFor(order);
        assert.deepEqual(view.placed, ["a"]);
        assert.equal(fitsBin(view, "c", "next"), false);
        assert.equal(fitsBin(view, "b", "next"), true);
        assert.equal(nextPiece(view), "b");
        assert.equal(boardDone({ ...view, placed: ["a", "b", "c"] }), true);
    });

    it("cycles through a list without repeating an item twice in a row", () => {
        const list = cycleThrough(["a", "b", "c"], 10, (items) => [...items].reverse());
        assert.equal(list.length, 10);
        for (let i = 1; i < list.length; i++) assert.notEqual(list[i], list[i - 1]);
        assert.deepEqual(cycleThrough(["a"], 3, (items) => [...items]), ["a", "a", "a"]);
    });
});

describe("zajednički tok: stanje sa monitora", () => {
    it("keeps a valid state as it is", () => {
        const view = viewFor(PICK, { round: 2, score: 10, correctCount: 1, wrong: ["b"], feedback: "wrong", message: "Lopta je mala.", selected: "b" });
        const merged = mergeWorldMonitor(JSON.parse(JSON.stringify(view)));
        assert.equal(merged.kind, "pick");
        assert.equal(merged.answer, "a");
        assert.deepEqual(merged.choices.map((c) => c.id), ["a", "b"]);
        assert.equal(merged.feedback, "wrong");
        assert.equal(merged.message, "Lopta je mala.");
        assert.equal(merged.round, 2);
    });

    it("drops anything unknown or broken and never throws", () => {
        assert.doesNotThrow(() => mergeWorldMonitor(null));
        assert.doesNotThrow(() => mergeWorldMonitor({ kind: "boom" as never, choices: "x" as never, homes: 5 as never }));
        const merged = mergeWorldMonitor({
            kind: "sort",
            bins: [{ id: "big", pic: "ballBig", label: "veliko" }, { id: "<script>", pic: "x", label: "" }] as never,
            items: [{ id: "x", pic: "teddyBig", label: "veliko" }] as never,
            homes: { x: "big", y: "nope" } as never,
            placed: ["x", "ghost"],
            answer: "ghost",
            round: 99,
            totalRounds: 3,
            phase: "boom" as never,
        });
        assert.deepEqual(merged.bins.map((b) => b.id), ["big"]);
        assert.deepEqual(merged.homes, { x: "big" });
        assert.deepEqual(merged.placed, ["x"]);
        assert.equal(merged.answer, null);
        assert.equal(merged.round, 3);
        assert.equal(merged.phase, "stop");
    });
});

describe("postojeće slike", () => {
    it("finds pictures from other games by key and refuses unknown keys", () => {
        assert.equal(hasBasePic("p:ball"), true);
        assert.equal(hasBasePic("a:penguin"), true);
        assert.equal(hasBasePic("p:nope"), false);
        assert.equal(hasBasePic("ball"), false);
        assert.equal(basePic("p:nope"), null);
    });
});
