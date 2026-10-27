// Igra „Koliko slogova?” (app/components/games/data/syllablesLevels.ts): podela svake reči na
// slogove (pravilom i ručno proverenom tabelom), reči za broj slogova i nivoi.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    buildSyllablesLevel,
    countSentence,
    lettersOf,
    ONSETS,
    spoken,
    syllabify,
    syllableCount,
    syllableNoun,
    syllablesOf,
    SYLLABLE_WORDS,
    SYLLABLES_LEVELS,
} from "@/app/components/games/data/syllablesLevels";
import { BAND_PRESETS } from "@/lib/childSettings";
import { MAX_LEVEL } from "@/lib/games";

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);
const ALPHABET = new Set(["a", "b", "c", "č", "ć", "d", "dž", "đ", "e", "f", "g", "h", "i", "j", "k", "l", "lj", "m", "n", "nj", "o", "p", "r", "s", "š", "t", "u", "v", "z", "ž"]);
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function seeded(seed: number): () => number {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2147483648;
        return x / 2147483648;
    };
}

/**
 * Ručno proverena podela svake reči (kao u prvom razredu: suglasnici koji mogu da počnu reč idu
 * u sledeći slog — LO-PTA, MA-ČKA, KI-ŠO-BRAN; ostali se dele — SUN-CE, OV-CA, KOR-NJA-ČA).
 */
const EXPECTED: Record<string, string> = {
    pas: "PAS",
    "miš": "MIŠ",
    "jež": "JEŽ",
    slon: "SLON",
    sir: "SIR",
    hleb: "HLEB",
    cvet: "CVET",
    kit: "KIT",
    "puž": "PUŽ",
    zec: "ZEC",
    lav: "LAV",
    voz: "VOZ",
    brod: "BROD",
    zmaj: "ZMAJ",
    "ključ": "KLJUČ",
    nos: "NOS",
    "šal": "ŠAL",
    "džip": "DŽIP",
    "mačka": "MA-ČKA",
    lopta: "LO-PTA",
    "kuća": "KU-ĆA",
    riba: "RI-BA",
    kapa: "KA-PA",
    meda: "ME-DA",
    "žaba": "ŽA-BA",
    krava: "KRA-VA",
    "pčela": "PČE-LA",
    ptica: "PTI-CA",
    ovca: "OV-CA",
    sunce: "SUN-CE",
    balon: "BA-LON",
    knjiga: "KNJI-GA",
    sova: "SO-VA",
    delfin: "DEL-FIN",
    jaje: "JA-JE",
    limun: "LI-MUN",
    truba: "TRU-BA",
    zvono: "ZVO-NO",
    tanjir: "TA-NJIR",
    "čekić": "ČE-KIĆ",
    krevet: "KRE-VET",
    oblak: "O-BLAK",
    "škola": "ŠKO-LA",
    poklon: "PO-KLON",
    jakna: "JA-KNA",
    ranac: "RA-NAC",
    sveska: "SVE-SKA",
    "čaša": "ČA-ŠA",
    duga: "DU-GA",
    mesec: "ME-SEC",
    torta: "TOR-TA",
    "grožđe": "GROŽ-ĐE",
    svinja: "SVI-NJA",
    "kolač": "KO-LAČ",
    zvezda: "ZVE-ZDA",
    klavir: "KLA-VIR",
    metla: "ME-TLA",
    traktor: "TRAK-TOR",
    "sneško": "SNE-ŠKO",
    jabuka: "JA-BU-KA",
    banana: "BA-NA-NA",
    cipela: "CI-PE-LA",
    "žirafa": "ŽI-RA-FA",
    "kornjača": "KOR-NJA-ČA",
    "kišobran": "KI-ŠO-BRAN",
    jagoda: "JA-GO-DA",
    paradajz: "PA-RA-DAJZ",
    ananas: "A-NA-NAS",
    krastavac: "KRA-STA-VAC",
    "pečurka": "PE-ČUR-KA",
    sladoled: "SLA-DO-LED",
    olovka: "O-LOV-KA",
    telefon: "TE-LE-FON",
    patike: "PA-TI-KE",
    majica: "MA-JI-CA",
    "kašika": "KA-ŠI-KA",
    "viljuška": "VI-LJU-ŠKA",
    makaze: "MA-KA-ZE",
    "čarapa": "ČA-RA-PA",
    haljina: "HA-LJI-NA",
    gitara: "GI-TA-RA",
    avion: "A-VI-ON",
    trotinet: "TRO-TI-NET",
    raketa: "RA-KE-TA",
    budilnik: "BU-DIL-NIK",
    "četkica": "ČE-TKI-CA",
    brokoli: "BRO-KO-LI",
    lubenica: "LU-BE-NI-CA",
    bubamara: "BU-BA-MA-RA",
    helikopter: "HE-LI-KO-PTER",
    televizor: "TE-LE-VI-ZOR",
    "čokolada": "ČO-KO-LA-DA",
    sijalica: "SI-JA-LI-CA",
    violina: "VI-O-LI-NA",
    rukavice: "RU-KA-VI-CE",
    "šargarepa": "ŠAR-GA-RE-PA",
    "pomorandža": "PO-MO-RAN-DŽA",
};

describe("slogovi svake reči", () => {
    it("checks every word in the game against the hand-checked table", () => {
        assert.deepEqual(SYLLABLE_WORDS.map((w) => w.word).sort(), Object.keys(EXPECTED).sort());
        for (const entry of SYLLABLE_WORDS) assert.equal(entry.syl.toUpperCase(), EXPECTED[entry.word], entry.word);
    });

    it("splits every word by the rule exactly as written (and as in the table)", () => {
        for (const entry of SYLLABLE_WORDS) {
            assert.deepEqual(syllabify(entry.word), syllablesOf(entry), entry.word);
            assert.equal(syllabify(entry.word).join("-").toUpperCase(), EXPECTED[entry.word], entry.word);
        }
    });

    it("joins the syllables back into the word, with exactly one vowel in each syllable", () => {
        for (const entry of SYLLABLE_WORDS) {
            const parts = syllablesOf(entry);
            assert.equal(parts.join(""), entry.word, entry.word);
            for (const part of parts) assert.equal(lettersOf(part).filter((l) => VOWELS.has(l)).length, 1, `${entry.word}: ${part}`);
            assert.equal(parts.length, lettersOf(entry.word).filter((l) => VOWELS.has(l)).length, entry.word);
        }
    });

    it("uses only letters of the Serbian alphabet and no words with a syllabic R (srce, prst)", () => {
        for (const entry of SYLLABLE_WORDS) {
            for (const letter of lettersOf(entry.word)) assert.ok(ALPHABET.has(letter), `${entry.word}: ${letter}`);
            assert.doesNotMatch(entry.word, /(^|[^aeiou])r([^aeiou]|$)/, entry.word);
        }
    });

    it("starts every inner syllable with a consonant group a Serbian word can start with", () => {
        for (const entry of SYLLABLE_WORDS) {
            for (const part of syllablesOf(entry).slice(1)) {
                const letters = lettersOf(part);
                const onset = letters.slice(0, letters.findIndex((l) => VOWELS.has(l))).join("");
                if (onset.length > 0 && lettersOf(onset).length > 1) assert.ok(ONSETS.has(onset), `${entry.word}: ${onset}`);
            }
        }
    });

    it("splits the classic examples the same way as the game „Prve reči”", () => {
        assert.deepEqual(syllabify("lopta"), ["lo", "pta"]);
        assert.deepEqual(syllabify("mačka"), ["ma", "čka"]);
        assert.deepEqual(syllabify("sunce"), ["sun", "ce"]);
        assert.deepEqual(syllabify("ovca"), ["ov", "ca"]);
        assert.deepEqual(syllabify("kornjača"), ["kor", "nja", "ča"]);
        assert.deepEqual(syllabify("kišobran"), ["ki", "šo", "bran"]);
        assert.deepEqual(syllabify("pomorandža"), ["po", "mo", "ran", "dža"]);
        assert.deepEqual(syllabify("violina"), ["vi", "o", "li", "na"]);
        assert.deepEqual(lettersOf("džip"), ["dž", "i", "p"]);
    });

    it("has enough words for every number of syllables", () => {
        for (const n of [1, 2, 3, 4]) assert.ok(SYLLABLE_WORDS.filter((w) => syllableCount(w) === n).length >= 10, `${n} slogova`);
    });
});

describe("reči za glas", () => {
    it("says the number with the right form of the noun", () => {
        assert.equal(syllableNoun(1), "jedan slog");
        assert.equal(syllableNoun(2), "dva sloga");
        assert.equal(syllableNoun(3), "tri sloga");
        assert.equal(syllableNoun(4), "četiri sloga");
        assert.equal(syllableNoun(5), "pet slogova");
    });

    it("reads the syllables with a short pause, then the count", () => {
        const cat = SYLLABLE_WORDS.find((w) => w.word === "mačka")!;
        assert.equal(spoken(cat), "ma, čka");
        assert.equal(countSentence(cat), "Mačka: ma, čka. Dva sloga.");
    });
});

describe("nivoi", () => {
    it("claps along with visible syllables first, then counts alone, sorts, compares and finds the first syllable", () => {
        assert.deepEqual(SYLLABLES_LEVELS.slice(0, 3).map((rule) => rule.kinds), [["along"], ["along"], ["along"]]);
        assert.ok(SYLLABLES_LEVELS.slice(0, 5).every((rule) => !rule.kinds.includes("count")), "na lakim nivoima se tapše uz slogove");
        assert.ok(SYLLABLES_LEVELS.slice(0, 5).every((rule) => Math.max(...rule.counts) <= 3));
        assert.ok(SYLLABLES_LEVELS.slice(10).some((rule) => rule.counts.includes(4)));
        assert.ok(SYLLABLES_LEVELS.some((rule) => rule.kinds.includes("first")));
    });

    it("builds solvable tasks: the right count is offered, the longest word is unique, the first syllable is not guessed by the first sound", () => {
        for (const level of LEVELS) {
            for (const preset of Object.values(BAND_PRESETS)) {
                for (const seed of [3, 11, 29]) {
                    const plan = buildSyllablesLevel(level, { maxRounds: preset.maxRounds, maxChoices: preset.maxChoices, random: seeded(seed + level) });
                    if (level === 1) assert.equal(plan[0].kind === "clap" && plan[0].word.label, "mačka");
                    for (const round of plan) {
                        if (round.kind === "clap") assert.deepEqual(round.syllables, syllabify(round.word.label));
                        if (round.kind !== "pick") continue;
                        const words = round.choices.map((c) => SYLLABLE_WORDS.find((w) => w.word === c.id));
                        if (round.style === "number") {
                            const numbers = round.choices.map((c) => Number(c.label));
                            assert.deepEqual([...numbers].sort((a, b) => a - b), numbers, "brojevi redom");
                            const word = SYLLABLE_WORDS.find((w) => w.word === round.cue?.id)!;
                            assert.equal(round.answer, `n${syllableCount(word)}`);
                        } else if (round.prompt.startsWith("Koja reč je najduža")) {
                            const counts = words.map((w) => syllableCount(w!));
                            const longest = Math.max(...counts);
                            assert.equal(counts.filter((n) => n === longest).length, 1, "samo jedna najduža reč");
                            assert.equal(syllableCount(words.find((w) => w!.word === round.answer)!), longest);
                        } else if (round.prompt.startsWith("Koja reč počinje")) {
                            const target = SYLLABLE_WORDS.find((w) => w.word === round.answer)!;
                            for (const other of words.filter((w) => w!.word !== target.word)) {
                                assert.notEqual(lettersOf(other!.word)[0], lettersOf(target.word)[0], `${other!.word} / ${target.word}`);
                            }
                        } else if (round.prompt.startsWith("Koja reč ima")) {
                            const n = syllableCount(SYLLABLE_WORDS.find((w) => w.word === round.answer)!);
                            assert.equal(words.filter((w) => syllableCount(w!) === n).length, 1, "samo jedna reč sa tim brojem slogova");
                        }
                    }
                }
            }
        }
    });
});
