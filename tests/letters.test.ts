// Igra „Slova”: abeceda i azbuka, reči sa slikom, nivoi, monitor.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    AZBUKA_ORDER,
    LETTERS,
    LETTERS_MAX_LEVEL,
    answerFor,
    buildLettersLevel,
    emptyLettersView,
    getLetter,
    glyphForLetter,
    isTraceKind,
    letterAndWord,
    letterChar,
    mergeLettersMonitor,
    nameInitial,
    promptTitle,
    questionFor,
    splitLetters,
    validLetterTask,
    wordRest,
    type LetterTask,
} from "@/app/components/games/data/lettersItems";
import { isPictureId } from "@/app/components/games/pictures";
import { BAND_PRESETS } from "@/lib/childSettings";
import { toCyrillic } from "@/lib/script";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: LETTERS_MAX_LEVEL }, (_, i) => i + 1);
const SCRIPTS = ["latin", "cyrillic"] as const;
const task = (extra: Partial<LetterTask>): LetterTask => ({ kind: "trace", letter: "A", lower: false, script: "latin", guide: "thick", demo: true, choices: [], ...extra });

describe("Serbian alphabet", () => {
    it("has all 30 letters of the Latin abeceda in order, digraphs included", () => {
        assert.equal(
            LETTERS.map((item) => item.id).join(" "),
            "A B C Č Ć D DŽ Đ E F G H I J K L LJ M N NJ O P R S Š T U V Z Ž"
        );
        for (const id of ["Č", "Ć", "Š", "Ž", "Đ", "DŽ", "LJ", "NJ"]) assert.ok(getLetter(id), id);
    });

    it("has all 30 letters of the Cyrillic azbuka in order", () => {
        assert.equal(new Set(AZBUKA_ORDER).size, 30);
        assert.deepEqual([...AZBUKA_ORDER].sort(), LETTERS.map((item) => item.id).sort());
        assert.equal(AZBUKA_ORDER.map((id) => letterChar(id, "cyrillic", false)).join(""), "АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ");
        assert.equal(AZBUKA_ORDER.map((id) => letterChar(id, "cyrillic", true)).join(""), "абвгдђежзијклљмнњопрстћуфхцчџш");
    });

    it("writes digraphs as one letter in both scripts", () => {
        assert.equal(letterChar("LJ", "latin", false), "LJ");
        assert.equal(letterChar("LJ", "latin", true), "lj");
        assert.equal(letterChar("LJ", "cyrillic", false), "Љ");
        assert.equal(letterChar("NJ", "cyrillic", true), "њ");
        assert.equal(letterChar("DŽ", "cyrillic", false), "Џ");
        assert.deepEqual(splitLetters("njuška"), ["NJ", "U", "Š", "K", "A"]);
        assert.deepEqual(splitLetters("džip"), ["DŽ", "I", "P"]);
        assert.deepEqual(splitLetters("ljubav"), ["LJ", "U", "B", "A", "V"]);
    });

    it("has strokes for every letter: capital and small, Latin and Cyrillic (120 glyphs)", () => {
        let count = 0;
        for (const item of LETTERS) {
            for (const script of SCRIPTS) {
                for (const lower of [false, true]) {
                    assert.ok(glyphForLetter(item.id, script, lower), `${item.id} ${script} ${lower ? "malo" : "veliko"}`);
                    count += 1;
                }
            }
        }
        assert.equal(count, 120);
    });

    it("gives every letter a spoken name and a word with a picture that starts with that letter, in both scripts", () => {
        assert.equal(new Set(LETTERS.map((item) => item.word)).size, LETTERS.length);
        assert.equal(new Set(LETTERS.map((item) => item.pic)).size, LETTERS.length);
        for (const item of LETTERS) {
            assert.match(item.name, /^[a-zčćđšž]+$/, item.id);
            assert.equal(item.word, item.word.toLocaleLowerCase("sr"), item.id);
            assert.equal(splitLetters(item.word)[0], item.id, `${item.id}: ${item.word}`);
            assert.ok(toCyrillic(item.word).startsWith(toCyrillic(item.id.toLocaleLowerCase("sr"))), `${item.id}: ${toCyrillic(item.word)}`);
        }
    });

    it("draws every word picture (no emoji, which look different on every device)", () => {
        for (const item of LETTERS) assert.ok(isPictureId(item.pic), `${item.id}: ${item.pic}`);
    });

    it("finds the first letter of a child's name in either script", () => {
        assert.equal(nameInitial("Lejla"), "L");
        assert.equal(nameInitial("Ljiljana"), "LJ");
        assert.equal(nameInitial("Njegoš"), "NJ");
        assert.equal(nameInitial("Džana"), "DŽ");
        assert.equal(nameInitial("Đorđe"), "Đ");
        assert.equal(nameInitial("Лука"), "L");
        assert.equal(nameInitial("Љубица"), "LJ");
        assert.equal(nameInitial("  ana"), "A");
        assert.equal(nameInitial("Xavier"), undefined);
        assert.equal(nameInitial(""), undefined);
        assert.equal(nameInitial(undefined), undefined);
    });
});

describe("letters texts", () => {
    it("says the letter by its name and the word, and never where to tap", () => {
        assert.equal(answerFor(task({ letter: "B" })), "Be, kao banana.");
        assert.equal(questionFor(task({ letter: "M" })), "Piši slovo em. Em, kao mačka.");
        assert.equal(questionFor(task({ letter: "M", guide: "copy", lower: true })), "Prepiši malo slovo em. Em, kao mačka.");
        assert.equal(questionFor(task({ kind: "first", letter: "M", choices: ["M", "A"] })), "Koje slovo čuješ na početku reči mačka?");
        assert.equal(questionFor(task({ kind: "find", letter: "Š", choices: ["Š", "S"] })), "Gde je slovo še? Še, kao šargarepa.");
        for (const item of LETTERS) {
            for (const kind of ["trace", "find", "first", "name"] as const) {
                const text = questionFor(task({ kind, letter: item.id, choices: isTraceKind(kind) ? [] : [item.id, "A"] }));
                assert.doesNotMatch(text, /dodirni|klikni|levo|desno|gore|dole|ovde/i, text);
            }
        }
    });

    it("shows the letter in the child's script and keeps the word without its first letter", () => {
        assert.equal(letterAndWord(task({ letter: "A" })), "A kao auto");
        assert.equal(letterAndWord(task({ letter: "A", script: "cyrillic", lower: true })), "а kao auto");
        assert.deepEqual(promptTitle(task({ kind: "find", letter: "Ž", lower: true, choices: ["Ž", "Z"] })), { lead: "Gde je malo slovo", letter: "ž", tail: "?" });
        assert.equal(wordRest(task({ kind: "first", letter: "M" })), "AČKA");
        assert.equal(wordRest(task({ kind: "first", letter: "NJ" })), "UŠKA");
        assert.equal(wordRest(task({ kind: "first", letter: "M", script: "cyrillic" })), "АЧКА");
    });
});

describe("letters levels", () => {
    const presets = Object.values(BAND_PRESETS);

    it("builds valid tasks for every level, script and age band", () => {
        for (const level of LEVELS) {
            for (const script of SCRIPTS) {
                for (const preset of presets) {
                    for (let seed = 1; seed <= 6; seed += 1) {
                        const plan = buildLettersLevel(level, { maxChoices: preset.maxChoices, maxRounds: preset.maxRounds, script, childName: "Lejla", random: seeded(seed * 31 + level) });
                        const where = `nivo ${level} ${script} ${preset.label} seme ${seed}`;
                        assert.ok(plan.length >= 2 && plan.length <= preset.maxRounds, `${where}: ${plan.length} zadataka`);
                        assert.equal(plan[0].kind === "trace" || plan[0].kind === "name", true, `${where}: prvi zadatak je pisanje`);
                        assert.ok(plan.some((t) => !isTraceKind(t.kind)) || level === 15, `${where}: bar jedan izbor`);
                        for (const t of plan) {
                            assert.ok(validLetterTask(t), `${where}: ${JSON.stringify(t)}`);
                            assert.equal(t.script, script);
                            assert.ok(t.choices.length <= preset.maxChoices, `${where}: previše kartica`);
                            if (!isTraceKind(t.kind)) assert.ok(t.choices.includes(t.letter), where);
                            assert.ok(glyphForLetter(t.letter, t.script, t.lower), where);
                        }
                    }
                }
            }
        }
    });

    it("goes from thick dotted letters with a model, to thin guides, to copying with only a start dot", () => {
        for (const level of LEVELS) {
            const plan = buildLettersLevel(level, { maxChoices: 4, maxRounds: 8, script: "latin", random: seeded(level) });
            const traces = plan.filter((t) => t.kind === "trace");
            const guide = level <= 5 ? "thick" : level <= 10 ? "thin" : "copy";
            for (const t of traces) {
                assert.equal(t.guide, guide, `nivo ${level}`);
                assert.equal(t.demo, level <= 5, `nivo ${level}: model`);
            }
        }
    });

    it("starts with straight-line capitals (I, L, O, T in Latin; Т, Г, П, О in Cyrillic) and keeps the easy tier in capitals", () => {
        const latin = buildLettersLevel(1, { maxChoices: 3, maxRounds: 5, script: "latin", random: seeded(3) });
        assert.deepEqual(latin.filter((t) => t.kind === "trace").map((t) => t.letter), ["I", "L", "O", "T"]);
        const cyrillic = buildLettersLevel(1, { maxChoices: 3, maxRounds: 5, script: "cyrillic", random: seeded(3) });
        assert.deepEqual(cyrillic.filter((t) => t.kind === "trace").map((t) => letterChar(t.letter, "cyrillic", false)), ["Т", "Г", "П", "О"]);
        for (const level of LEVELS.filter((l) => l <= 8)) {
            for (const t of buildLettersLevel(level, { maxChoices: 4, maxRounds: 8, script: "latin", random: seeded(level) })) assert.equal(t.lower, false, `nivo ${level}`);
        }
    });

    it("brings Č, Ć, Š, Ž, Đ and DŽ, LJ, NJ in the middle tier, then small letters", () => {
        const letters = (level: number) => buildLettersLevel(level, { maxChoices: 4, maxRounds: 8, script: "latin", random: seeded(level) }).filter((t) => t.kind === "trace").map((t) => t.letter);
        assert.deepEqual(letters(7), ["Č", "Ć", "Š", "Ž", "Đ"]);
        assert.deepEqual(letters(8).slice(0, 3), ["DŽ", "LJ", "NJ"]);
        for (const level of [9, 10, 12]) {
            assert.ok(buildLettersLevel(level, { maxChoices: 4, maxRounds: 8, script: "latin", random: seeded(level) }).filter((t) => t.kind === "trace").every((t) => t.lower), `nivo ${level}`);
        }
    });

    it("asks for the first sound of a word in the hard tier and copies the child's initial on the last level", () => {
        for (const level of [11, 12, 13, 14]) {
            for (let seed = 1; seed <= 10; seed += 1) {
                const plan = buildLettersLevel(level, { maxChoices: 4, maxRounds: 8, script: "latin", random: seeded(level * seed) });
                assert.ok(plan.some((t) => t.kind === "first"), `nivo ${level}`);
                // Prvi glas se ne traži za slovo koje se u istom nivou piše
                const written = new Set(plan.filter((t) => isTraceKind(t.kind)).map((t) => t.letter));
                assert.ok(plan.filter((t) => t.kind === "first").every((t) => !written.has(t.letter)), `nivo ${level} seme ${seed}`);
            }
        }
        const named = buildLettersLevel(15, { maxChoices: 4, maxRounds: 8, script: "cyrillic", childName: "Љубица", random: seeded(5) });
        const name = named.find((t) => t.kind === "name");
        assert.equal(name?.letter, "LJ");
        assert.equal(name?.guide, "copy");
        assert.equal(named[0].kind, "name");
        // Ime koje ne počinje srpskim slovom: umesto imena je obično prepisivanje
        const other = buildLettersLevel(15, { maxChoices: 4, maxRounds: 8, script: "latin", childName: "Xena", random: seeded(5) });
        assert.ok(!other.some((t) => t.kind === "name"));
        assert.equal(other.length, named.length);
    });
});

describe("letters monitor state", () => {
    it("keeps a valid state and drops anything the game could not have made", () => {
        const view = { ...emptyLettersView(5), task: task({ letter: "B" }), strokesDone: 2, slips: 1, hint: true, hintRun: 1, score: 10, round: 2 };
        const merged = mergeLettersMonitor(JSON.parse(JSON.stringify(view)));
        assert.deepEqual(merged, view);
        assert.equal(mergeLettersMonitor({ ...view, strokesDone: 99 }).strokesDone, 3);
        assert.equal(mergeLettersMonitor({ ...view, task: { ...view.task, letter: "Q" } }).task, null);
        assert.equal(mergeLettersMonitor({ ...view, task: { ...view.task, guide: "wide" as never } }).task, null);
        assert.equal(mergeLettersMonitor({ ...view, task: { ...view.task, kind: "find", choices: ["A", "C"] } }).task, null);
        assert.equal(mergeLettersMonitor({ ...view, task: { ...view.task, choices: ["A"] } }).task, null);
        const find = { ...view, task: task({ kind: "find", letter: "M", choices: ["M", "N", "A"] }), wrong: ["N", "X", "M"], picked: "A" };
        assert.deepEqual(mergeLettersMonitor(find).wrong, ["N"]);
        assert.equal(mergeLettersMonitor(find).picked, "A");
        assert.deepEqual(mergeLettersMonitor(null), emptyLettersView(1));
        assert.deepEqual(mergeLettersMonitor({ score: -3, round: 9, totalRounds: 4 } as never).round, 4);
    });
});
