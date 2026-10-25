// Igra „Prve reči” (app/components/games/data/wordsItems.ts): reči, slogovi, slova, slike,
// rečenice, nivoi, bodovanje i stanje za roditeljski prikaz uživo.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
    answerSentence,
    buildWordsLevel,
    confusable,
    emptyWordsView,
    firstLetter,
    getSentence,
    getWord,
    isBuild,
    lettersOf,
    LETTERS_TITLE,
    MATCH_TITLE,
    mergeWordsMonitor,
    nextTile,
    piecesOf,
    roundView,
    SENTENCE_TITLE,
    SENTENCES,
    shownLetter,
    shownText,
    solveWordsView,
    spokenItem,
    spokenQuestion,
    syllablesOf,
    SYLLABLES_TITLE,
    titleFor,
    WORDS,
    WORDS_MAX_LEVEL,
    wordsResult,
    wordsRule,
    wrongSentence,
    type WordsRound,
    type WordsView,
} from "@/app/components/games/data/wordsItems";
import { getLetter } from "@/app/components/games/data/lettersItems";
import { hasProp } from "@/app/components/games/scene/props";
import { sceneParts } from "@/app/components/games/scene/types";
import { hasWordPicture, sentenceScene } from "@/app/components/games/words/WordPictures";
import WordsGame from "@/app/components/games/WordsGame";
import { BAND_PRESETS } from "@/lib/childSettings";
import { GAMES, getGame } from "@/lib/games";
import { TOGETHER_GAMES } from "@/lib/playTogether";

function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

const LEVELS = Array.from({ length: WORDS_MAX_LEVEL }, (_, i) => i + 1);
const TAP_WORDS = /dodirn|pritisn|prevuc|klikn|tapn|ovde dole|ovde gore/i;
const LATIN = { upper: true, script: "latin" } as const;

/**
 * Nezavisna tabela: kako se svaka reč deli na slogove i na slova (DŽ, LJ, NJ su jedno slovo).
 * Slogovi prate pravopis (grupa koja može da počne reč ide u sledeći slog: LO-PTA, MA-ČKA).
 */
const EXPECTED: Record<string, { syl: string; letters: string }> = {
    mama: { syl: "MA-MA", letters: "M·A·M·A" },
    tata: { syl: "TA-TA", letters: "T·A·T·A" },
    baka: { syl: "BA-KA", letters: "B·A·K·A" },
    deka: { syl: "DE-KA", letters: "D·E·K·A" },
    beba: { syl: "BE-BA", letters: "B·E·B·A" },
    kuća: { syl: "KU-ĆA", letters: "K·U·Ć·A" },
    lopta: { syl: "LO-PTA", letters: "L·O·P·T·A" },
    kapa: { syl: "KA-PA", letters: "K·A·P·A" },
    meda: { syl: "ME-DA", letters: "M·E·D·A" },
    sunce: { syl: "SUN-CE", letters: "S·U·N·C·E" },
    šolja: { syl: "ŠO-LJA", letters: "Š·O·LJ·A" },
    knjiga: { syl: "KNJI-GA", letters: "K·NJ·I·G·A" },
    balon: { syl: "BA-LON", letters: "B·A·L·O·N" },
    riba: { syl: "RI-BA", letters: "R·I·B·A" },
    lice: { syl: "LI-CE", letters: "L·I·C·E" },
    džem: { syl: "DŽEM", letters: "DŽ·E·M" },
    đevrek: { syl: "ĐE-VREK", letters: "Đ·E·V·R·E·K" },
    cipela: { syl: "CI-PE-LA", letters: "C·I·P·E·L·A" },
    kišobran: { syl: "KI-ŠO-BRAN", letters: "K·I·Š·O·B·R·A·N" },
    ljuljaška: { syl: "LJU-LJA-ŠKA", letters: "LJ·U·LJ·A·Š·K·A" },
    stolica: { syl: "STO-LI-CA", letters: "S·T·O·L·I·C·A" },
    bicikl: { syl: "BI-CIKL", letters: "B·I·C·I·K·L" },
    mačka: { syl: "MA-ČKA", letters: "M·A·Č·K·A" },
    zeka: { syl: "ZE-KA", letters: "Z·E·K·A" },
    žaba: { syl: "ŽA-BA", letters: "Ž·A·B·A" },
    krava: { syl: "KRA-VA", letters: "K·R·A·V·A" },
    konj: { syl: "KONJ", letters: "K·O·NJ" },
    pas: { syl: "PAS", letters: "P·A·S" },
    koza: { syl: "KO-ZA", letters: "K·O·Z·A" },
    ovca: { syl: "OV-CA", letters: "O·V·C·A" },
    slon: { syl: "SLON", letters: "S·L·O·N" },
    jež: { syl: "JEŽ", letters: "J·E·Ž" },
    miš: { syl: "MIŠ", letters: "M·I·Š" },
    panda: { syl: "PAN-DA", letters: "P·A·N·D·A" },
    pčela: { syl: "PČE-LA", letters: "P·Č·E·L·A" },
    ptica: { syl: "PTI-CA", letters: "P·T·I·C·A" },
    žirafa: { syl: "ŽI-RA-FA", letters: "Ž·I·R·A·F·A" },
    kornjača: { syl: "KOR-NJA-ČA", letters: "K·O·R·NJ·A·Č·A" },
    kokoška: { syl: "KO-KO-ŠKA", letters: "K·O·K·O·Š·K·A" },
    majmun: { syl: "MAJ-MUN", letters: "M·A·J·M·U·N" },
    banana: { syl: "BA-NA-NA", letters: "B·A·N·A·N·A" },
    jabuka: { syl: "JA-BU-KA", letters: "J·A·B·U·K·A" },
    kukuruz: { syl: "KU-KU-RUZ", letters: "K·U·K·U·R·U·Z" },
    cvet: { syl: "CVET", letters: "C·V·E·T" },
    kost: { syl: "KOST", letters: "K·O·S·T" },
};

const allLevels = (): { level: number; band: string; rounds: WordsRound[] }[] => {
    const out: { level: number; band: string; rounds: WordsRound[] }[] = [];
    for (const level of LEVELS) {
        for (const [band, preset] of Object.entries(BAND_PRESETS)) {
            for (let seed = 1; seed <= 12; seed += 1) {
                out.push({ level, band, rounds: buildWordsLevel(level, { maxChoices: preset.maxChoices, maxRounds: preset.maxRounds, random: seeded(seed * 31 + level) }) });
            }
        }
    }
    return out;
};

describe("words: every word's syllables, letters and picture", () => {
    it("has the expected table for every word, and no word twice", () => {
        assert.deepEqual(WORDS.map((word) => word.word).sort(), Object.keys(EXPECTED).sort());
        assert.equal(new Set(WORDS.map((word) => word.word)).size, WORDS.length);
    });

    for (const word of WORDS) {
        it(`splits ${word.word.toLocaleUpperCase("sr")} into syllables and letters`, () => {
            const expected = EXPECTED[word.word];
            assert.equal(
                syllablesOf(word)
                    .map((syl) => syl.toLocaleUpperCase("sr"))
                    .join("-"),
                expected.syl
            );
            assert.equal(lettersOf(word).join("·"), expected.letters);
            assert.equal(syllablesOf(word).join(""), word.word, "slogovi zajedno daju reč");
            assert.equal(lettersOf(word).join(""), word.word.toLocaleUpperCase("sr"), "slova zajedno daju reč");
            for (const letter of lettersOf(word)) assert.ok(getLetter(letter), `${letter} je slovo srpske abecede`);
            for (const syl of syllablesOf(word)) assert.match(syl, /[aeiou]/, `slog ${syl} ima samoglasnik`);
            assert.ok(hasWordPicture(word.pic), `slika ${word.pic}`);
        });
    }

    it("treats DŽ, LJ and NJ as one letter and Č, Ć, Š, Ž, Đ as their own letters", () => {
        assert.deepEqual(lettersOf(getWord("džem")!), ["DŽ", "E", "M"]);
        assert.deepEqual(lettersOf(getWord("ljuljaška")!), ["LJ", "U", "LJ", "A", "Š", "K", "A"]);
        assert.deepEqual(lettersOf(getWord("konj")!), ["K", "O", "NJ"]);
        assert.equal(firstLetter(getWord("đevrek")!), "Đ");
        assert.equal(firstLetter(getWord("šolja")!), "Š");
        assert.equal(firstLetter(getWord("žaba")!), "Ž");
        assert.equal(firstLetter(getWord("ljuljaška")!), "LJ");
        assert.equal(firstLetter(getWord("džem")!), "DŽ");
        const words = WORDS.map((word) => word.word).join(" ");
        for (const letter of ["č", "ć", "š", "ž", "đ", "dž", "lj", "nj"]) assert.ok(words.includes(letter), `ima reč sa slovom ${letter}`);
    });

    it("offers similar words that are real, different words", () => {
        for (const word of WORDS.filter((item) => item.similar)) {
            const [a, b] = word.similar!;
            assert.notEqual(a, b);
            for (const other of [a, b]) {
                assert.notEqual(other, word.word);
                assert.match(other, /^[a-zčćđšž]+$/);
                // Slična reč: ista dužina ± 2 i bar dva ista slova na istim mestima
                assert.ok(Math.abs(other.length - word.word.length) <= 2, `${word.word} / ${other}`);
                const same = [...word.word].filter((ch, i) => other[i] === ch).length;
                assert.ok(same >= 2, `${word.word} / ${other}`);
            }
        }
        assert.deepEqual(getWord("mačka")!.similar, ["maska", "mama"]);
    });
});

describe("words: sentences and their pictures", () => {
    it("has three short sentences in every group, each with its own picture", () => {
        const groups = new Map<string, number>();
        for (const sentence of SENTENCES) groups.set(sentence.group, (groups.get(sentence.group) ?? 0) + 1);
        for (const [group, count] of groups) assert.equal(count, 3, group);
        for (const sentence of SENTENCES) {
            assert.match(sentence.text, /^[A-ZČĆĐŠŽ][a-zčćđšž]+( [a-zčćđšž]+){1,2}\.$/, sentence.text);
            const parts = sceneParts(sentenceScene(sentence));
            for (const prop of parts.props) assert.ok(hasProp(prop), `${sentence.id}: ${prop}`);
        }
        assert.equal(getSentence("amar-lopta")?.text, "Amar ima loptu.");
        const keys = SENTENCES.map((sentence) => JSON.stringify(sentence.pic));
        assert.equal(new Set(keys).size, keys.length, "svaka rečenica ima drugačiju sliku");
    });

    it("uses names from Novi Pazar", () => {
        for (const sentence of SENTENCES.filter((item) => item.pic.who)) assert.ok(["amar", "lejla", "haris", "tarik", "ajla"].includes(sentence.pic.who!));
    });
});

describe("words: text shown to the child", () => {
    it("is uppercase by default, lowercase when the parent turns caps off, and in Cyrillic on request", () => {
        assert.equal(shownText("lopta", LATIN), "LOPTA");
        assert.equal(shownText("džem", LATIN), "DŽEM");
        assert.equal(shownText("lopta", { upper: false, script: "latin" }), "lopta");
        assert.equal(shownText("ljuljaška", { upper: true, script: "cyrillic" }), "ЉУЉАШКА");
        assert.equal(shownText("Amar ima loptu.", { upper: false, script: "cyrillic" }), "Амар има лопту.");
        assert.equal(shownLetter("LJ", LATIN), "LJ");
        assert.equal(shownLetter("LJ", { upper: false, script: "latin" }), "lj");
        assert.equal(shownLetter("DŽ", { upper: true, script: "cyrillic" }), "Џ");
        assert.equal(shownLetter("NJ", { upper: false, script: "cyrillic" }), "њ");
    });

    it("asks without saying the word in picture-and-word tasks, and says it only on „Ponovi”", () => {
        const match = { kind: "match" as const, item: "lopta" };
        assert.equal(spokenQuestion(match), MATCH_TITLE);
        assert.doesNotMatch(spokenQuestion(match), /lopta/i);
        assert.equal(spokenItem(match), "Lopta.");
        assert.equal(spokenQuestion({ kind: "first", item: "lopta" }), "Na koje slovo počinje reč lopta?");
        assert.equal(titleFor({ kind: "first", item: "lopta" }, LATIN), "Na koje slovo počinje LOPTA?");
        assert.equal(spokenQuestion({ kind: "syllables", item: "mačka" }), `${SYLLABLES_TITLE} Mačka.`);
        assert.equal(spokenQuestion({ kind: "letters", item: "sunce" }), `${LETTERS_TITLE} Sunce.`);
        assert.equal(spokenQuestion({ kind: "sentence", item: "amar-lopta" }), SENTENCE_TITLE);
        assert.equal(spokenItem({ kind: "sentence", item: "amar-lopta" }), "Amar ima loptu.");
        assert.equal(answerSentence({ kind: "first", item: "ljuljaška" }), "Ljuljaška počinje slovom lje.");
        assert.equal(answerSentence({ kind: "syllables", item: "lopta" }), "lo, pta. Lopta.");
        assert.equal(wrongSentence({ kind: "first", item: "lopta" }, "M"), "To je slovo em.");
    });

    it("never tells the child where to tap", () => {
        const source = readFileSync(path.join(process.cwd(), "app/components/games/WordsGame.tsx"), "utf8") + readFileSync(path.join(process.cwd(), "app/components/games/data/wordsItems.ts"), "utf8");
        for (const quoted of source.match(/["`][^"`\n]*["`]/g) ?? []) assert.doesNotMatch(quoted, TAP_WORDS, quoted);
    });
});

describe("words: levels", () => {
    it("goes from picture and word, to the first letter, syllables, similar words, letters and sentences", () => {
        assert.deepEqual(wordsRule(1).kinds, ["match"]);
        assert.deepEqual(wordsRule(3).kinds, ["first"]);
        assert.deepEqual(wordsRule(6).kinds, ["syllables"]);
        assert.deepEqual(wordsRule(8).syllables, [3]);
        assert.ok(wordsRule(9).similar);
        assert.deepEqual(wordsRule(11).kinds, ["letters"]);
        assert.deepEqual(wordsRule(13).kinds, ["sentence"]);
        assert.ok(wordsRule(13).speaker && !wordsRule(14).speaker, "rečenicu glas čita samo na prvom nivou rečenica");
    });

    it("builds every level for every age band with exactly one right answer", () => {
        for (const { level, band, rounds } of allLevels()) {
            const rule = wordsRule(level);
            const tag = `nivo ${level}, ${band}`;
            assert.ok(rounds.length >= 2 && rounds.length <= rule.rounds, tag);
            assert.equal(new Set(rounds.map((round) => round.item)).size, rounds.length, `${tag}: bez ponavljanja`);
            for (const round of rounds) {
                assert.ok(rule.kinds.includes(round.kind), tag);
                assert.equal(new Set(round.choices).size === round.choices.length || isBuild(round.kind), true, `${tag}: izbori su različiti`);
                if (round.kind === "match") {
                    assert.ok(round.choices.includes(round.answer) && round.answer === round.item, tag);
                    assert.equal(round.choices.length, rule.similar ? Math.min(3, BAND_PRESETS[band as keyof typeof BAND_PRESETS].maxChoices) : 2, tag);
                    if (rule.similar) assert.deepEqual([...round.choices].sort(), [round.item, ...getWord(round.item)!.similar!].sort(), tag);
                    else
                        for (const other of round.choices.filter((id) => id !== round.answer))
                            assert.ok(!confusable(firstLetter(getWord(other)!), firstLetter(getWord(round.item)!)), `${tag}: ${other}`);
                } else if (round.kind === "first") {
                    const word = getWord(round.item)!;
                    assert.equal(round.answer, firstLetter(word), tag);
                    assert.ok(round.choices.includes(round.answer) && round.choices.length >= 2 && round.choices.length <= 3, tag);
                    for (const id of round.choices) assert.ok(getLetter(id), `${tag}: ${id}`);
                    for (let i = 0; i < round.choices.length; i += 1) {
                        for (let j = i + 1; j < round.choices.length; j += 1)
                            assert.ok(!confusable(round.choices[i], round.choices[j]), `${tag}: ${round.choices[i]} i ${round.choices[j]} se lako mešaju`);
                    }
                } else if (isBuild(round.kind)) {
                    const pieces = piecesOf(round.kind, getWord(round.item)!);
                    assert.deepEqual([...round.choices].sort(), [...pieces].sort(), `${tag}: pločice su delovi reči`);
                    assert.notEqual(round.choices.join("|"), pieces.join("|"), `${tag}: pločice nisu već složene`);
                    const sizes = round.kind === "syllables" ? rule.syllables : rule.letters;
                    assert.ok(sizes.includes(pieces.length), `${tag}: ${round.item} ima ${pieces.length} delova`);
                } else {
                    const target = getSentence(round.answer)!;
                    assert.equal(round.item, round.answer, tag);
                    assert.equal(round.speaker, rule.speaker, tag);
                    for (const id of round.choices) assert.equal(getSentence(id)?.group, target.group, `${tag}: slike iz iste grupe`);
                }
            }
        }
    });

    it("starts with familiar family and home words, and asks letters with hooks only from level 4", () => {
        for (const round of buildWordsLevel(1, { maxChoices: 3, maxRounds: 5, random: seeded(5) }))
            assert.ok(["mama", "tata", "beba", "baka", "kuća", "lopta", "mačka", "zeka", "riba", "meda", "kapa", "sunce"].includes(round.item), round.item);
        for (let seed = 1; seed < 30; seed += 1) {
            for (const round of buildWordsLevel(3, { maxChoices: 3, maxRounds: 5, random: seeded(seed) })) assert.ok(!["Č", "Ć", "Š", "Ž", "Đ", "DŽ", "LJ", "NJ"].includes(round.answer), round.answer);
        }
        const special = new Set<string>();
        for (let seed = 1; seed < 30; seed += 1) for (const round of buildWordsLevel(4, { maxChoices: 3, maxRounds: 6, random: seeded(seed) })) special.add(round.answer);
        assert.ok(["Š", "Ž", "Đ", "DŽ", "LJ"].some((letter) => special.has(letter)));
    });

    it("finds the next tile also when a syllable repeats (BA-NA-NA)", () => {
        const view = { kind: "syllables" as const, item: "banana", choices: ["na", "ba", "na"], placed: [] as number[] };
        assert.equal(nextTile(view), 1);
        assert.equal(nextTile({ ...view, placed: [1] }), 0);
        assert.equal(nextTile({ ...view, placed: [1, 0] }), 2);
    });
});

describe("words: scoring", () => {
    const view = (over: Partial<WordsView> = {}): WordsView => ({ ...emptyWordsView(5), ...over });

    it("does not score the demonstrated first task of level 1", () => {
        const { next, modeled } = solveWordsView(view(), 1);
        assert.ok(modeled);
        assert.equal(next.correctCount + next.promptedCount, 0);
        assert.equal(wordsResult(next, 1, 5).total, 4);
    });

    it("counts first-try as correct and hinted as prompted, never more than the scored tasks", () => {
        assert.equal(solveWordsView(view({ round: 2 }), 1).next.correctCount, 1);
        assert.equal(solveWordsView(view({ round: 2, hint: true }), 6).next.promptedCount, 1);
        let current = view();
        for (let round = 1; round <= 5; round += 1) current = solveWordsView({ ...current, round, hint: round === 3, wrong: round === 4 ? ["0"] : [] }, 1).next;
        const result = wordsResult(current, 1, 30);
        assert.ok(result.correct + (result.prompted ?? 0) <= result.total);
    });
});

describe("words: live monitor", () => {
    it("drops garbage and keeps valid tasks", () => {
        assert.equal(mergeWordsMonitor(null).item, "");
        assert.equal(mergeWordsMonitor({ kind: "match", item: "bomba", choices: ["bomba"] }).item, "");
        assert.equal(mergeWordsMonitor({ kind: "syllables", item: "lopta", choices: ["lo", "xx"] }).item, "");
        const build = mergeWordsMonitor({ kind: "syllables", item: "lopta", choices: ["pta", "lo"], placed: [0, 1] });
        assert.deepEqual(build.placed, [], "pogrešan redosled se ne prikazuje kao složen");
        assert.deepEqual(mergeWordsMonitor({ kind: "syllables", item: "lopta", choices: ["pta", "lo"], placed: [1] }).placed, [1]);
        const [round] = buildWordsLevel(13, { maxChoices: 3, maxRounds: 5, random: seeded(2) });
        assert.equal(mergeWordsMonitor({ ...emptyWordsView(5), ...roundView(round) }).item, round.item);
        assert.equal(mergeWordsMonitor({ kind: "first", item: "lopta", choices: ["L", "M", "Q"] }).item, "");
    });

    it("draws the same task the child sees", () => {
        const render = (monitorState: Partial<WordsView>) => renderToStaticMarkup(createElement(WordsGame, { childId: 0, level: 5, isMonitor: true, monitorState, onComplete: () => {} }));
        assert.match(render({ kind: "match", item: "lopta", answer: "lopta", choices: ["lopta", "mama"] }), /aria-label="(LOPTA|lopta)"/);
        assert.match(render({ kind: "first", item: "lopta", answer: "L", choices: ["L", "M", "R"] }), /Na koje slovo počinje/);
        assert.match(render({ kind: "letters", item: "sunce", choices: ["e", "s", "u", "n", "c"].map((l) => l.toUpperCase()), placed: [1] }), /Složi reč od slova/);
        assert.match(render({ kind: "sentence", item: "amar-lopta", answer: "amar-lopta", choices: ["amar-knjiga", "amar-lopta", "amar-balon"] }), /Amar ima loptu|AMAR IMA LOPTU/);
        assert.match(render({ kind: "nope" } as unknown as WordsView), /Igra uskoro počinje/);
    });
});

describe("words: registry entry", () => {
    const game = getGame("words");

    it("is activity 26 for ages 5–8, graded, with its own colour, cover, tip and play-with-a-friend", () => {
        assert.equal(game.activityId, 26);
        assert.equal(game.gameType, "words");
        assert.deepEqual(game.ages, { min: 5, max: 8 });
        assert.equal(game.graded, true);
        assert.ok(existsSync(path.join(process.cwd(), "public", game.image)), game.image);
        assert.equal(GAMES.filter((other) => other.accent.solid === game.accent.solid).length, 1);
        assert.ok(TOGETHER_GAMES.includes("words"));
        assert.ok(game.order > getGame("letters").order, "posle igre „Slova”");
    });

    it("has a migration that adds activity 26 in the cognitive category", () => {
        const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/0021_words_game.sql"), "utf8");
        assert.match(sql, /\(26, 'Prve reči', 'Čitaj reči, slogove i slova', 'cognitive'/);
    });
});
