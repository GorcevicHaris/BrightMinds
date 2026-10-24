// Igra „Šta gleda?” (data/gazeRounds.ts, data/gazeScenes.ts): nivoi, rečenice, slike i stanje za monitor.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
    buildGazeLevel,
    FAR_OBJECTS,
    GAZE_CHARACTERS,
    GAZE_MAX_LEVEL,
    GAZE_OBJECTS,
    gazeAnswer,
    gazeCast,
    gazeQuestion,
    gazeRule,
    gazeWrong,
    getGazeObject,
    headTurn,
    itIs,
    mergeGazeMonitor,
    roundFields,
    slotSide,
    type GazeRound,
} from "@/app/components/games/data/gazeRounds";
import { gazeScene } from "@/app/components/games/data/gazeScenes";
import { hasBackground } from "@/app/components/games/scene/backgrounds";
import { LOOKS } from "@/app/components/games/scene/figures";
import { hasProp } from "@/app/components/games/scene/props";
import { isFigure, sceneParts, type FigureItem } from "@/app/components/games/scene/types";
import { BAND_PRESETS } from "@/lib/childSettings";
import { toCyrillic } from "@/lib/script";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: GAZE_MAX_LEVEL }, (_, i) => i + 1);
const SEEDS = [1, 2, 3, 7, 11, 42, 99];

function levels(options: { maxChoices: number; maxRounds: number; childName?: string } = { maxChoices: 4, maxRounds: 8 }) {
    return LEVELS.flatMap((level) => SEEDS.map((seed) => ({ level, rounds: buildGazeLevel(level, { ...options, random: seeded(seed * 31 + level) }) })));
}

const figures = (round: GazeRound, line = false): FigureItem[] => (gazeScene(round, line)?.items ?? []).filter(isFigure);

describe("gaze game content", () => {
    it("uses names from the app with a drawn look, and objects with a drawing", () => {
        for (const character of GAZE_CHARACTERS) assert.ok(Object.hasOwn(LOOKS, character.id), character.id);
        for (const object of [...GAZE_OBJECTS, ...FAR_OBJECTS]) {
            assert.ok(hasProp(object.prop), `${object.id}: nema crteža ${object.prop}`);
            assert.match(object.name, /^\p{Lu}/u, `${object.id}: natpis velikim slovom`);
            assert.equal(getGazeObject(object.id), object);
        }
        assert.equal(new Set([...GAZE_OBJECTS, ...FAR_OBJECTS].map((object) => object.id)).size, GAZE_OBJECTS.length + FAR_OBJECTS.length);
    });

    it("writes the accusative by hand: lopta → loptu, meda → medu, leptir → leptira, mače → mače", () => {
        const acc = (id: string) => getGazeObject(id)!.acc;
        assert.equal(acc("ball"), "loptu");
        assert.equal(acc("teddy"), "medu");
        assert.equal(acc("apple"), "jabuku");
        assert.equal(acc("cat"), "mače");
        assert.equal(acc("car"), "autić");
        assert.equal(acc("butterfly"), "leptira");
        assert.equal(acc("kite"), "zmaja");
        // Ženski rod na -a dobija -u; ostali oblici su napisani posebno
        for (const object of [...GAZE_OBJECTS, ...FAR_OBJECTS]) {
            if (/a$/.test(object.name) && !object.plural) assert.match(object.acc, /u$/, `${object.id}: ${object.acc}`);
        }
        assert.equal(itIs(getGazeObject("blocks")!), "To su kocke.");
        assert.equal(itIs(getGazeObject("ball")!), "To je lopta.");
    });

    it("asks short literal questions and answers with what the character looks at", () => {
        const look = { kind: "look", hero: "amina", target: "ball" } as const;
        assert.equal(gazeQuestion(look), "Šta gleda Amina?");
        assert.equal(gazeAnswer(look), "Amina gleda loptu.");
        assert.equal(gazeQuestion({ kind: "want", hero: "haris" }), "Šta Haris želi?");
        assert.equal(gazeAnswer({ kind: "want", hero: "haris", target: "cake" }), "Haris gleda tortu. Haris želi tortu.");
        assert.equal(gazeQuestion({ kind: "know", hero: "selma" }), "Ko zna šta je u kutiji?");
        assert.equal(gazeAnswer({ kind: "know", hero: "selma", target: "selma" }), "Selma gleda u kutiju. Selma zna šta je u kutiji.");
    });

    it("after a wrong card says what was picked and to watch the character — never where to tap", () => {
        const objects = [{ id: "ball", slot: "left" as const }, { id: "teddy", slot: "right" as const }];
        assert.equal(gazeWrong({ kind: "look", hero: "amina", objects }, "teddy", false), "Netačno. To je meda. Pogledaj kuda Amina gleda.");
        assert.equal(gazeWrong({ kind: "look", hero: "amina", objects }, "teddy", true), "Netačno. To je meda. Prati tačkice od očiju.");
        assert.equal(gazeWrong({ kind: "know", hero: "amina", objects: [{ id: "kite", slot: "upRight" }] }, "haris", false), "Netačno. Haris gleda zmaja. Pogledaj u šta gleda koje dete.");
        // Nijedna poruka ne kaže gde da dodirne niti traži pogled u oči
        for (const { rounds } of levels()) {
            for (const round of rounds) {
                for (const id of round.choices.filter((choice) => choice !== round.target)) {
                    for (const hint of [false, true]) {
                        const text = gazeWrong(round, id, hint);
                        assert.doesNotMatch(text, /\b(levo|desno|gore|dole|dodirni|pritisni|u oči|mene)\b/i, text);
                    }
                }
            }
        }
    });

    it("can show every sentence fully in Cyrillic", () => {
        for (const { rounds } of levels()) {
            for (const round of rounds) {
                for (const text of [gazeQuestion(round), gazeAnswer(round), ...round.choices.filter((id) => id !== round.target).map((id) => gazeWrong(round, id, true))]) {
                    assert.doesNotMatch(toCyrillic(text), /\p{Script=Latin}/u, text);
                }
            }
        }
    });
});

describe("gaze game levels", () => {
    it("moves from pointing to head and eyes, half a head turn, eyes only, then to wanting and knowing", () => {
        const cues = LEVELS.map((level) => gazeRule(level).tasks.map((task) => `${task.kind}:${task.cue}:${task.objects}`).join(","));
        assert.deepEqual(cues.slice(0, 2), ["look:point:2", "look:point:3"]);
        assert.deepEqual(cues.slice(2, 5), ["look:head:2", "look:head:3", "look:head:4"]);
        assert.deepEqual(cues.slice(5, 7), ["look:turn:3", "look:turn:4"]);
        assert.deepEqual(cues.slice(7, 10), ["look:eyes:2", "look:eyes:3", "look:eyes:4"]);
        assert.deepEqual(cues.slice(10, 12), ["want:head:3", "want:eyes:3"]);
        assert.deepEqual(cues.slice(12, 14), ["know:head:2", "know:eyes:2"]);
        assert.deepEqual(gazeRule(15).tasks.map((task) => task.kind), ["look", "want", "know"]);
        assert.ok(gazeRule(15).tasks.every((task) => task.cue === "eyes"));
        // Svaki nivo je drugačiji od prethodnog, a znak pogleda nikad ne postaje jači unutar iste vrste zadatka
        for (let i = 1; i < cues.length; i += 1) assert.notEqual(cues[i], cues[i - 1], `nivo ${i + 1}`);
        assert.deepEqual([headTurn("point"), headTurn("head"), headTurn("turn"), headTurn("eyes")], [1, 1, 0.5, 0]);
        assert.equal(gazeRule(0), gazeRule(1));
        assert.equal(gazeRule(99), gazeRule(15));
        assert.equal(gazeRule(Number.NaN), gazeRule(1));
    });

    it("builds every level with a correct answer among the cards and every object on its own place", () => {
        for (const { level, rounds } of levels()) {
            const rule = gazeRule(level);
            assert.equal(rounds.length, rule.rounds, `nivo ${level}`);
            rounds.forEach((round, i) => {
                const task = rule.tasks[i % rule.tasks.length];
                assert.equal(round.kind, task.kind);
                assert.equal(round.cue, task.cue);
                assert.ok(round.choices.includes(round.target), `nivo ${level}: tačan odgovor nije ponuđen`);
                assert.equal(new Set(round.choices).size, round.choices.length);
                if (round.kind === "know") {
                    assert.equal(round.target, round.hero);
                    assert.deepEqual([...round.choices].sort(), [round.hero, round.other].sort());
                    assert.notEqual(round.hero, round.other);
                    assert.equal(round.objects.length, 1);
                    // Ono daleko je na strani drugog deteta, pa ono gleda od kutije
                    assert.notEqual(slotSide(round.objects[0].slot), round.heroSide);
                    return;
                }
                assert.equal(round.objects.length, task.objects, `nivo ${level}: broj predmeta`);
                assert.deepEqual([...round.choices].sort(), round.objects.map((object) => object.id).sort());
                assert.equal(new Set(round.objects.map((object) => object.slot)).size, round.objects.length, `nivo ${level}: dva predmeta na istom mestu`);
                const sides = new Set(round.objects.map((object) => slotSide(object.slot)));
                assert.equal(sides.size, 2, `nivo ${level}: predmeti moraju biti i levo i desno`);
                if (round.kind === "want") for (const object of round.objects) assert.ok(getGazeObject(object.id)!.wanted, `nivo ${level}: ${object.id} nije nešto što se želi`);
            });
        }
    });

    it("puts the answer left and right equally often, never repeats a character or an answer twice in a row", () => {
        for (const { level, rounds } of levels()) {
            const looked = rounds.filter((round) => round.kind !== "know");
            const left = looked.filter((round) => slotSide(round.objects.find((object) => object.id === round.target)!.slot) === "left").length;
            const knowLeft = rounds.filter((round) => round.kind === "know" && round.heroSide === "left").length;
            assert.ok(Math.abs(2 * (left + knowLeft) - rounds.length) <= 1, `nivo ${level}: levo ${left + knowLeft} od ${rounds.length}`);
            for (let i = 1; i < rounds.length; i += 1) {
                assert.notEqual(rounds[i].hero, rounds[i - 1].hero, `nivo ${level}: isti lik zaredom`);
                if (rounds[i].kind !== "know" && rounds[i - 1].kind !== "know") assert.notEqual(rounds[i].target, rounds[i - 1].target, `nivo ${level}: isti odgovor zaredom`);
            }
        }
    });

    it("respects the age settings: fewer cards and rounds for younger children, at least two of each", () => {
        for (const preset of Object.values(BAND_PRESETS)) {
            for (const { level, rounds } of levels({ maxChoices: preset.maxChoices, maxRounds: preset.maxRounds })) {
                assert.ok(rounds.length <= preset.maxRounds && rounds.length >= 2, `nivo ${level}`);
                for (const round of rounds) assert.ok(round.choices.length >= 2 && round.choices.length <= Math.max(2, preset.maxChoices), `nivo ${level}: ${round.choices.length} kartica`);
            }
        }
        const tiny = buildGazeLevel(8, { maxChoices: 1, maxRounds: 1, random: seeded(3) });
        assert.equal(tiny.length, 2);
        for (const round of tiny) assert.equal(round.choices.length, 2);
        // Prvi nivo ima pokazni zadatak i bar još jedan pravi
        assert.ok(buildGazeLevel(1, { maxChoices: 2, maxRounds: 2, random: seeded(1) }).length >= 2);
    });

    it("never gives a character the child's own name, also when it is written in Cyrillic", () => {
        for (const name of ["Amina", "  amina ", "Амина", "Haris"]) {
            const cast = gazeCast(name).map((character) => character.id);
            const banned = name.trim().toLowerCase().startsWith("h") ? "haris" : "amina";
            assert.ok(!cast.includes(banned), name);
            for (const { rounds } of levels({ maxChoices: 4, maxRounds: 8, childName: name })) {
                for (const round of rounds) assert.ok(round.hero !== banned && round.other !== banned, `${name}: ${round.hero}/${round.other}`);
            }
        }
        assert.equal(gazeCast(undefined).length, GAZE_CHARACTERS.length);
        assert.equal(gazeCast("Lana").length, GAZE_CHARACTERS.length);
    });
});

describe("gaze game pictures", () => {
    it("draws every round from existing parts, with the character looking at the answer", () => {
        for (const { level, rounds } of levels()) {
            for (const round of rounds) {
                const spec = gazeScene(round, false);
                assert.ok(spec, `nivo ${level}: nema slike`);
                const { backgrounds, props } = sceneParts(spec);
                for (const bg of backgrounds) assert.ok(hasBackground(bg));
                for (const prop of props) assert.ok(hasProp(prop), prop);
                const people = figures(round);
                const looker = people.find((figure) => figure.fig === round.hero)!;
                assert.ok(looker?.gaze, `nivo ${level}: lik ne gleda nigde`);
                // Bez pomoći nema tačkica; sa pomoći tačkice idu samo od lika koji gleda u odgovor
                assert.ok(people.every((figure) => !figure.gaze?.line));
                const hinted = figures(round, true).filter((figure) => figure.gaze?.line);
                assert.deepEqual(hinted.map((figure) => figure.fig), [round.hero]);
                if (round.kind === "know") {
                    assert.equal(people.length, 2);
                    for (const figure of people) assert.equal(figure.gaze!.head, headTurn(round.cue), `nivo ${level}: glava u „ko zna”`);
                    assert.ok(props.includes("boxOpen"));
                    continue;
                }
                assert.equal(people.length, 1);
                // Glava se okreće osim na nivoima „samo oči”; ruka pokazuje samo na prvim nivoima, u pravu stranu
                assert.equal(looker.gaze!.head, headTurn(round.cue));
                const targetSlot = round.objects.find((object) => object.id === round.target)!.slot;
                // Ka predmetu na polici ruka ide uvis, ka predmetu dole pokazuje ispred sebe
                const up = targetSlot === "upLeft" || targetSlot === "upRight";
                assert.equal(looker.pose, round.cue === "point" ? (up ? "reach" : "point") : "stand");
                if (round.cue === "point") assert.equal(looker.flip, slotSide(targetSlot) === "left");
                assert.equal(looker.gaze!.x < 120, slotSide(targetSlot) === "left", `nivo ${level}: pogled ide na pogrešnu stranu`);
            }
        }
    });
});

describe("gaze game monitor state", () => {
    const round = buildGazeLevel(9, { maxChoices: 4, maxRounds: 6, random: seeded(5) })[0];
    const know = buildGazeLevel(14, { maxChoices: 4, maxRounds: 6, random: seeded(5) })[0];

    it("keeps a valid state as it is", () => {
        for (const sample of [round, know]) {
            const view = mergeGazeMonitor({ ...roundFields(sample), round: 2, totalRounds: 6, score: 15, correctCount: 1, wrong: sample.choices.filter((id) => id !== sample.target).slice(0, 1), feedback: "wrong", hint: true });
            assert.equal(view.kind, sample.kind);
            assert.equal(view.hero, sample.hero);
            assert.deepEqual(view.choices, sample.choices);
            assert.deepEqual(view.objects, sample.objects);
            assert.equal(view.target, sample.target);
            assert.equal(view.round, 2);
            assert.equal(view.hint, true);
            assert.equal(view.wrong.length, 1);
            assert.ok(gazeScene(view, view.hint));
        }
    });

    it("drops anything unknown, partial or inconsistent", () => {
        for (const state of [null, undefined, {}, { hero: "nobody" }, { ...roundFields(round), target: "nope" }, { ...roundFields(round), choices: ["ball"] }, { ...roundFields(know), other: know.hero }, { ...roundFields(round), objects: "x" }]) {
            const view = mergeGazeMonitor(state as never);
            assert.equal(view.hero, "");
            assert.deepEqual(view.choices, []);
            assert.equal(gazeScene(view, false), null);
        }
        const view = mergeGazeMonitor({ ...roundFields(round), round: 99, totalRounds: 6, score: -4, wrong: [round.target, "nope"], picked: "nope", feedback: "maybe" as never });
        assert.equal(view.round, 6);
        assert.equal(view.score, 0);
        assert.deepEqual(view.wrong, []);
        assert.equal(view.picked, null);
        assert.equal(view.feedback, null);
    });
});
