// Sadržaj igre „Prve reči”: rano čitanje za decu od 5 do 8 godina, po srpskoj latinici i
// globalno-slogovnoj metodi iz prvog razreda.
//
//  • Slika i reč: dete gleda sliku i bira napisanu reč (MAMA, TATA, KUĆA, LOPTA, MAČKA). Reč se
//    izgovara samo na dugme „Ponovi” uz sliku — glas ne čita ponuđene reči umesto deteta.
//  • Prvo slovo: „Na koje slovo počinje LOPTA?” — reč bez prvog slova i tri slova za izbor.
//  • Slogovi: reč se slaže od slogova (LO + PTA, KU + ĆA, MA + ČKA), pa od tri sloga
//    (BA-NA-NA, JA-BU-KA); zatim slika i tri slične reči (MAČKA / MAMA / MASKA).
//  • Slova: reč se slaže slovo po slovo (S-U-N-C-E), pa kratka rečenica („Amar ima loptu.”)
//    i izbor slike koja joj odgovara.
//
// Zašto ovako (istraživanja o ranom čitanju i deci sa autizmom):
//  • U prvom razredu se kod nas čita globalno (cela reč uz sliku), pa analitičko-sintetički:
//    glas na početku reči, slogovi, slova. Deca sa autizmom često dobro prepoznaju celu reč
//    (vizuelno pamćenje), pa reč uz sliku dolazi prva, a glasovi i slogovi posle.
//  • Učenje bez grešaka: prvi zadatak prvog nivoa pokazuje ruka (model), na lakim nivoima su
//    samo dva izbora i tačan izbor zasvetli već posle prve greške; pomoć se zatim povlači.
//  • Pogrešni izbori su na početku sasvim različiti (druga reč, drugo slovo), a tek kasnije
//    slični (MAČKA / MASKA); slova koja se lako mešaju (S i Š, L i LJ, C, Č i Ć) se na lakim
//    nivoima ne nude zajedno.
//  • Velika štampana slova su podrazumevana (tako se počinje u školi); kad roditelj isključi
//    „SVA SLOVA VELIKA”, reči su napisane malim slovima. Pismo prati podešavanje deteta.
//  • DŽ, LJ i NJ su jedno slovo (jedna pločica, jedno mesto), kao u školskoj abecedi.
//  • Rečenice su kratke (dve-tri reči), sa imenima iz Novog Pazara; slike se razlikuju baš u
//    onome što piše (šta Amar ima, šta Lejla radi), pa dete mora da pročita celu rečenicu.
//
// Pravila pisanja:
//  • Svaka reč ima podelu na slogove (`syl`, sa crticom) — test proverava da spojeni slogovi
//    daju reč, da svaki slog ima samoglasnik i da su slova iz srpske abecede.
//  • Slogovi prate pravopis: grupa koja može da počne reč ide u sledeći slog (LO-PTA, MA-ČKA,
//    KI-ŠO-BRAN), a ostale se dele (SUN-CE, OV-CA, KOR-NJA-ČA).
//  • Reči sa spornom podelom (patka, leptir, auto) nisu u igri.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";
import { getLetter, splitLetters } from "@/app/components/games/data/lettersItems";
import type { Script } from "@/lib/childSettings";
import { toCyrillic } from "@/lib/script";

// ── Reči ──────────────────────────────────────────────────────────────────────

/** Slika reči: „thing:ball” (missing/things.tsx), „food:apple”, „animal:cat”, „person:mama” */
export type WordPic = `${"thing" | "food" | "animal" | "person"}:${string}`;

export interface Word {
    /** Reč malim slovima, latinicom („lopta”) */
    word: string;
    /** Slogovi sa crticom („lo-pta”) */
    syl: string;
    pic: WordPic;
    /** Reči koje liče na ovu (za izbor sa sličnim rečima) */
    similar?: readonly [string, string];
}

const w = (word: string, syl: string, pic: WordPic, similar?: readonly [string, string]): Word => ({ word, syl, pic, ...(similar ? { similar } : {}) });

export const WORDS: readonly Word[] = [
    // Porodica
    w("mama", "ma-ma", "person:mama", ["mapa", "masa"]),
    w("tata", "ta-ta", "person:tata", ["teta", "tava"]),
    w("baka", "ba-ka", "person:baka"),
    w("deka", "de-ka", "person:deka"),
    w("beba", "be-ba", "person:baby"),
    // Kuća i igračke
    w("kuća", "ku-ća", "thing:house", ["kuma", "kosa"]),
    w("lopta", "lo-pta", "thing:ball", ["lopata", "lampa"]),
    w("kapa", "ka-pa", "thing:cap", ["kafa", "kaša"]),
    w("meda", "me-da", "thing:teddy", ["mera", "meta"]),
    w("sunce", "sun-ce", "thing:sun", ["sanke", "sunđer"]),
    w("šolja", "šo-lja", "thing:cup", ["škola", "šala"]),
    w("knjiga", "knji-ga", "thing:book"),
    w("balon", "ba-lon", "thing:balloon"),
    w("riba", "ri-ba", "thing:fish", ["ruka", "rupa"]),
    w("lice", "li-ce", "thing:face"),
    w("džem", "džem", "thing:jam"),
    w("đevrek", "đe-vrek", "thing:pretzel"),
    w("cipela", "ci-pe-la", "thing:shoe"),
    w("kišobran", "ki-šo-bran", "thing:umbrella"),
    w("ljuljaška", "lju-lja-ška", "thing:swing"),
    w("stolica", "sto-li-ca", "thing:chair"),
    w("bicikl", "bi-cikl", "thing:bicycle"),
    // Životinje
    w("mačka", "ma-čka", "animal:cat", ["maska", "mama"]),
    w("zeka", "ze-ka", "animal:rabbit", ["deka", "reka"]),
    w("žaba", "ža-ba", "animal:frog"),
    w("krava", "kra-va", "animal:cow", ["kruna", "trava"]),
    w("konj", "konj", "animal:horse", ["konac", "koka"]),
    w("pas", "pas", "animal:dog"),
    w("koza", "ko-za", "animal:goat"),
    w("ovca", "ov-ca", "animal:sheep"),
    w("slon", "slon", "animal:elephant"),
    w("jež", "jež", "animal:hedgehog"),
    w("miš", "miš", "animal:mouse"),
    w("panda", "pan-da", "animal:panda"),
    w("pčela", "pče-la", "animal:bee"),
    w("ptica", "pti-ca", "animal:bird"),
    w("žirafa", "ži-ra-fa", "animal:giraffe"),
    w("kornjača", "kor-nja-ča", "animal:turtle"),
    w("kokoška", "ko-ko-ška", "animal:chicken"),
    w("majmun", "maj-mun", "animal:monkey"),
    // Hrana
    w("banana", "ba-na-na", "food:banana", ["banka", "baka"]),
    w("jabuka", "ja-bu-ka", "food:apple", ["jakna", "jaje"]),
    w("kukuruz", "ku-ku-ruz", "food:corn"),
    w("cvet", "cvet", "food:flower"),
    w("kost", "kost", "food:bone"),
];

export function getWord(word: unknown): Word | undefined {
    return WORDS.find((item) => item.word === word);
}

export function syllablesOf(word: Word): string[] {
    return word.syl.split("-");
}

/** Slova reči; DŽ, LJ i NJ su jedno slovo: „šolja” → [Š, O, LJ, A] */
export function lettersOf(word: Word): string[] {
    return splitLetters(word.word);
}

/** Prvo slovo reči (ključ iz abecede: „LJ”, „Š”) */
export function firstLetter(word: Word): string {
    return lettersOf(word)[0] ?? "";
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);

// ── Rečenice ──────────────────────────────────────────────────────────────────

/** Kako izgleda slika rečenice (data/optionPictures.ts: OptionArt) i ko je na njoj */
export interface SentencePicture {
    /** Ko je glavni lik (dete iz igre) */
    who?: "amar" | "lejla" | "haris" | "tarik" | "ajla";
    p?: "hold" | "eat" | "drink" | "run" | "sit" | "wave";
    h?: "ball" | "book" | "balloon" | "apple" | "glass" | "bookOpen";
    w?: readonly ("glasses" | "beanie" | "headphones")[];
    /** Sedi na klupi */
    bench?: boolean;
    /** Samo pozadina i nebo (vreme) */
    none?: boolean;
    v?: "rain" | "snow" | "clear";
    sun?: boolean;
}

export interface Sentence {
    id: string;
    text: string;
    /** Grupa: rečenice iz iste grupe su jedna drugoj pogrešni izbori */
    group: string;
    pic: SentencePicture;
}

const s = (id: string, group: string, text: string, pic: SentencePicture): Sentence => ({ id, group, text, pic });

export const SENTENCES: readonly Sentence[] = [
    s("amar-lopta", "amar", "Amar ima loptu.", { who: "amar", p: "hold", h: "ball" }),
    s("amar-knjiga", "amar", "Amar ima knjigu.", { who: "amar", p: "hold", h: "book" }),
    s("amar-balon", "amar", "Amar ima balon.", { who: "amar", p: "wave", h: "balloon" }),
    s("lejla-jede", "lejla", "Lejla jede jabuku.", { who: "lejla", p: "eat", h: "apple" }),
    s("lejla-pije", "lejla", "Lejla pije vodu.", { who: "lejla", p: "drink", h: "glass" }),
    s("lejla-cita", "lejla", "Lejla čita knjigu.", { who: "lejla", p: "hold", h: "bookOpen" }),
    s("haris-trci", "haris", "Haris trči.", { who: "haris", p: "run" }),
    s("haris-sedi", "haris", "Haris sedi.", { who: "haris", p: "sit", bench: true }),
    s("haris-mase", "haris", "Haris maše.", { who: "haris", p: "wave" }),
    s("tarik-naocare", "tarik", "Tarik ima naočare.", { who: "tarik", w: ["glasses"] }),
    s("tarik-kapa", "tarik", "Tarik ima kapu.", { who: "tarik", w: ["beanie"] }),
    s("tarik-slusalice", "tarik", "Tarik ima slušalice.", { who: "tarik", w: ["headphones"] }),
    s("kisa", "vreme", "Pada kiša.", { none: true, v: "rain" }),
    s("sneg", "vreme", "Pada sneg.", { none: true, v: "snow" }),
    s("sunce", "vreme", "Sija sunce.", { none: true, v: "clear", sun: true }),
];

export function getSentence(id: unknown): Sentence | undefined {
    return SENTENCES.find((item) => item.id === id);
}

// ── Prikaz (velika ili mala slova, latinica ili ćirilica) ────────────────────

export interface TextStyle {
    upper: boolean;
    script: Script;
}

/** Tekst kako ga dete vidi: „lopta” → „LOPTA” / „ЛОПТА” */
export function shownText(text: string, style: TextStyle): string {
    const cased = style.upper ? text.toLocaleUpperCase("sr") : text;
    return style.script === "cyrillic" ? toCyrillic(cased) : cased;
}

/** Slovo kao pločica: „LJ” → „LJ” / „lj” / „Љ” */
export function shownLetter(id: string, style: TextStyle): string {
    return shownText(style.upper ? id : id.toLocaleLowerCase("sr"), style);
}

// ── Pitanja i rečenice ────────────────────────────────────────────────────────

export const MATCH_TITLE = "Koja reč je za ovu sliku?";
export const SYLLABLES_TITLE = "Složi reč od slogova.";
export const LETTERS_TITLE = "Složi reč od slova.";
export const SENTENCE_TITLE = "Pročitaj i pronađi pravu sliku.";

/** Naziv slova kako se izgovara („el”, „lje”) */
export function letterName(id: string): string {
    return getLetter(id)?.name ?? id.toLocaleLowerCase("sr");
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 *  match     — slika i napisana reč (dve različite reči, kasnije tri slične)
 *  first     — „Na koje slovo počinje LOPTA?”
 *  syllables — reč od slogova
 *  letters   — reč od slova
 *  sentence  — rečenica i slika
 */
export type WordsKind = "match" | "first" | "syllables" | "letters" | "sentence";
export const WORDS_KINDS: readonly WordsKind[] = ["match", "first", "syllables", "letters", "sentence"];

/** Reči za laki početak: kratke, poznate, iz porodice i kuće */
const STARTER = ["mama", "tata", "beba", "baka", "kuća", "lopta", "mačka", "zeka", "riba", "meda", "kapa", "sunce"];
/** Slova koja se lako mešaju: na lakim nivoima se ne nude zajedno */
const CONFUSABLE: readonly (readonly string[])[] = [
    ["C", "Č", "Ć"],
    ["S", "Š"],
    ["Z", "Ž"],
    ["D", "DŽ", "Đ"],
    ["L", "LJ"],
    ["N", "NJ", "M"],
    ["B", "D", "P"],
    ["E", "F"],
    ["I", "J"],
    ["U", "V"],
];
/** Pogrešna slova na lakim nivoima: samo obična slova (bez kvačica i dvoslova) */
const PLAIN_LETTERS = ["A", "B", "D", "E", "I", "J", "K", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "Z"];
/** Slova sa kvačicom i dvoslovi */
const SPECIAL = ["Č", "Ć", "Š", "Ž", "Đ", "DŽ", "LJ", "NJ"];

export function confusable(a: string, b: string): boolean {
    return a === b || CONFUSABLE.some((group) => group.includes(a) && group.includes(b));
}

export interface WordsRule {
    first: number;
    last: number;
    kinds: readonly WordsKind[];
    rounds: number;
    /** Izbora za match / first / sentence */
    choices: number;
    /** match: slične reči (MAČKA / MASKA) */
    similar: boolean;
    /** first: i reči koje počinju slovom sa kvačicom ili dvoslovom */
    special: boolean;
    /** Broj slogova reči za slaganje (syllables) */
    syllables: readonly number[];
    /** Broj slova reči za slaganje (letters) */
    letters: readonly number[];
    /** Rečenica ima dugme „Ponovi” (glas je pročita) */
    speaker: boolean;
    /** Tačan izbor zasvetli već posle prve greške */
    earlyHint: boolean;
    /** Samo poznate reči za početak */
    starter: boolean;
}

const RULE_BASE = { similar: false, special: false, syllables: [2], letters: [3, 4], speaker: true, earlyHint: false, starter: false } as const;

const RULES: readonly WordsRule[] = [
    // Lako: slika i reč (dve reči), pa prvo slovo (tri slova)
    { ...RULE_BASE, first: 1, last: 1, kinds: ["match"], rounds: 5, choices: 2, earlyHint: true, starter: true },
    { ...RULE_BASE, first: 2, last: 2, kinds: ["match"], rounds: 6, choices: 2, earlyHint: true },
    { ...RULE_BASE, first: 3, last: 3, kinds: ["first"], rounds: 5, choices: 3, earlyHint: true, starter: true },
    { ...RULE_BASE, first: 4, last: 4, kinds: ["first"], rounds: 6, choices: 3, earlyHint: true, special: true },
    { ...RULE_BASE, first: 5, last: 5, kinds: ["match", "first"], rounds: 6, choices: 3, earlyHint: true, special: true },
    // Srednje: slogovi (dva, pa tri), pa slika i tri slične reči
    { ...RULE_BASE, first: 6, last: 6, kinds: ["syllables"], rounds: 5, choices: 3, syllables: [2], starter: true },
    { ...RULE_BASE, first: 7, last: 7, kinds: ["syllables"], rounds: 5, choices: 3, syllables: [2] },
    { ...RULE_BASE, first: 8, last: 8, kinds: ["syllables"], rounds: 5, choices: 3, syllables: [3] },
    { ...RULE_BASE, first: 9, last: 9, kinds: ["match"], rounds: 6, choices: 3, similar: true },
    { ...RULE_BASE, first: 10, last: 10, kinds: ["syllables", "match"], rounds: 6, choices: 3, similar: true, syllables: [2, 3] },
    // Teško: slova (kratke, pa duže reči sa DŽ, LJ, NJ), pa rečenica i slika
    { ...RULE_BASE, first: 11, last: 11, kinds: ["letters"], rounds: 5, choices: 3, letters: [3, 4] },
    { ...RULE_BASE, first: 12, last: 12, kinds: ["letters"], rounds: 5, choices: 3, letters: [4, 5, 6] },
    { ...RULE_BASE, first: 13, last: 13, kinds: ["sentence"], rounds: 5, choices: 3 },
    { ...RULE_BASE, first: 14, last: 14, kinds: ["sentence"], rounds: 5, choices: 3, speaker: false },
    { ...RULE_BASE, first: 15, last: 15, kinds: ["letters", "sentence"], rounds: 6, choices: 3, letters: [4, 5, 6], speaker: false },
];

export const WORDS_MAX_LEVEL = 15;

export function wordsRule(level: number): WordsRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), WORDS_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

export interface WordsRound {
    kind: WordsKind;
    /** Reč zadatka (ili id rečenice) */
    item: string;
    /** Tačan izbor (match: reč, first: slovo, sentence: id); kod slaganja prazno */
    answer: string;
    /** Izbori; kod slaganja pločice (slogovi ili slova) pomešanim redom */
    choices: string[];
    /** Rečenica ima dugme „Ponovi” */
    speaker: boolean;
}

interface BuildOptions {
    maxChoices: number;
    maxRounds: number;
    random?: () => number;
}

/** Delovi reči za slaganje, redom */
export function piecesOf(kind: WordsKind, word: Word): string[] {
    return kind === "syllables" ? syllablesOf(word) : lettersOf(word);
}

/**
 * Zadaci jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random, testovi stalan niz).
 * Ista reč se u nivou ne ponavlja; pločice nikad ne stoje već složene.
 */
export function buildWordsLevel(level: number, { maxChoices, maxRounds, random = Math.random }: BuildOptions): WordsRound[] {
    const rule = wordsRule(level);
    const roundCount = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const limit = Math.max(2, Number.isFinite(maxChoices) ? maxChoices : 4);
    const count = Math.max(2, Math.min(rule.choices, limit));
    const shuffle = <T>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const used = new Set<string>();
    const fresh = (list: readonly Word[]) => {
        const unused = list.filter((word) => !used.has(word.word));
        return shuffle(unused.length > 0 ? unused : list);
    };
    const pool = rule.starter ? WORDS.filter((word) => STARTER.includes(word.word)) : WORDS;

    const make = (kind: WordsKind): WordsRound | null => {
        if (kind === "match") {
            const candidates = rule.similar ? WORDS.filter((word) => word.similar) : pool;
            const word = fresh(candidates)[0];
            if (!word) return null;
            used.add(word.word);
            // Lako: sasvim drugačija reč (drugo prvo slovo); srednje: slične reči
            const others =
                rule.similar && word.similar
                    ? [...word.similar]
                    : shuffle(WORDS.filter((other) => !confusable(firstLetter(other), firstLetter(word)) && other.word !== word.word)).map((other) => other.word);
            // Lako: uvek dve reči; slične reči dolaze sa tri izbora
            const size = rule.similar ? count : 2;
            return { kind, item: word.word, answer: word.word, choices: shuffle([word.word, ...others.slice(0, size - 1)]), speaker: true };
        }
        if (kind === "first") {
            const candidates = pool.filter((word) => rule.special || !SPECIAL.includes(firstLetter(word)));
            // Na nivou sa kvačicama prednost imaju reči koje počinju takvim slovom
            const special = rule.special ? candidates.filter((word) => SPECIAL.includes(firstLetter(word)) && !used.has(word.word)) : [];
            const word = (special.length > 0 && random() < 0.6 ? shuffle(special) : fresh(candidates))[0];
            if (!word) return null;
            used.add(word.word);
            const letter = firstLetter(word);
            const second = lettersOf(word)[1] ?? "";
            const wrong = shuffle(PLAIN_LETTERS.filter((id) => !confusable(id, letter) && id !== second));
            const picked: string[] = [];
            for (const id of wrong) {
                if (picked.length >= count - 1) break;
                if (picked.some((other) => confusable(other, id))) continue;
                picked.push(id);
            }
            return { kind, item: word.word, answer: letter, choices: shuffle([letter, ...picked]), speaker: true };
        }
        if (kind === "syllables" || kind === "letters") {
            const fits = (word: Word) => {
                const size = piecesOf(kind, word).length;
                const sizes = kind === "syllables" ? rule.syllables : rule.letters;
                // Slaganje ima smisla tek sa dva dela koja nisu ista (MA-MA bi se složilo samo od sebe)
                return sizes.includes(size) && new Set(piecesOf(kind, word)).size > 1;
            };
            const word = fresh(pool.filter(fits).length > 0 ? pool.filter(fits) : WORDS.filter(fits))[0];
            if (!word) return null;
            used.add(word.word);
            const pieces = piecesOf(kind, word);
            let tiles = shuffle(pieces);
            for (let attempt = 0; attempt < 12 && tiles.join("|") === pieces.join("|"); attempt += 1) tiles = shuffle(pieces);
            if (tiles.join("|") === pieces.join("|")) tiles = [...pieces.slice(1), pieces[0]];
            return { kind, item: word.word, answer: "", choices: tiles, speaker: true };
        }
        // Rečenica: pogrešne slike su iz iste grupe (isti lik, druga stvar ili radnja)
        const groups = shuffle(Array.from(new Set(SENTENCES.map((sentence) => sentence.group))));
        const unusedGroup = groups.find((group) => !used.has(`group:${group}`)) ?? groups[0];
        used.add(`group:${unusedGroup}`);
        const inGroup = shuffle(SENTENCES.filter((sentence) => sentence.group === unusedGroup));
        const target = inGroup.find((sentence) => !used.has(sentence.id)) ?? inGroup[0];
        used.add(target.id);
        const others = inGroup.filter((sentence) => sentence.id !== target.id).slice(0, count - 1);
        return { kind, item: target.id, answer: target.id, choices: shuffle([target.id, ...others.map((sentence) => sentence.id)]), speaker: rule.speaker };
    };

    const rounds: WordsRound[] = [];
    for (let i = 0; rounds.length < roundCount && i < roundCount * 4; i += 1) {
        const kind = rule.kinds[rounds.length % rule.kinds.length];
        const round = make(kind);
        if (round) rounds.push(round);
    }
    return rounds;
}

// ── Pitanja (glas i natpis) ───────────────────────────────────────────────────

export function isBuild(kind: WordsKind): boolean {
    return kind === "syllables" || kind === "letters";
}

/** Šta glas kaže na početku zadatka (reč se kod izbora slike i reči NE izgovara) */
export function spokenQuestion(view: Pick<WordsView, "kind" | "item">): string {
    const word = getWord(view.item);
    switch (view.kind) {
        case "match":
            return MATCH_TITLE;
        case "first":
            return word ? `Na koje slovo počinje reč ${word.word}?` : "";
        case "syllables":
            return word ? `${SYLLABLES_TITLE} ${capitalize(word.word)}.` : "";
        case "letters":
            return word ? `${LETTERS_TITLE} ${capitalize(word.word)}.` : "";
        case "sentence":
            return SENTENCE_TITLE;
    }
}

/** Natpis na kartici sa uputstvom */
export function titleFor(view: Pick<WordsView, "kind" | "item">, style: TextStyle): string {
    const word = getWord(view.item);
    switch (view.kind) {
        case "match":
            return MATCH_TITLE;
        case "first":
            return word ? `Na koje slovo počinje ${shownText(word.word, style)}?` : "";
        case "syllables":
            return SYLLABLES_TITLE;
        case "letters":
            return LETTERS_TITLE;
        case "sentence":
            return SENTENCE_TITLE;
    }
}

/** Šta se izgovara na dugme „Ponovi” uz sliku ili rečenicu */
export function spokenItem(view: Pick<WordsView, "kind" | "item">): string {
    if (view.kind === "sentence") return getSentence(view.item)?.text ?? "";
    const word = getWord(view.item);
    return word ? `${capitalize(word.word)}.` : "";
}

/** Rečenica posle tačnog odgovora */
export function answerSentence(view: Pick<WordsView, "kind" | "item">): string {
    const word = getWord(view.item);
    switch (view.kind) {
        case "match":
            return word ? `To je ${word.word}.` : "";
        case "first":
            return word ? `${capitalize(word.word)} počinje slovom ${letterName(firstLetter(word))}.` : "";
        case "syllables":
            return word ? `${syllablesOf(word).join(", ")}. ${capitalize(word.word)}.` : "";
        case "letters":
            return word ? `${capitalize(word.word)}.` : "";
        case "sentence":
            return getSentence(view.item)?.text ?? "";
    }
}

/** Posle pogrešnog izbora: mirna činjenica */
export function wrongSentence(view: Pick<WordsView, "kind" | "item">, picked: string): string {
    switch (view.kind) {
        case "match":
            return `Ovde piše ${picked}.`;
        case "first":
            return `To je slovo ${letterName(picked)}.`;
        case "syllables":
            return "Taj slog ide kasnije.";
        case "letters":
            return "To slovo ide kasnije.";
        case "sentence":
            return "Na toj slici je nešto drugo.";
    }
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface WordsView extends BaseView {
    kind: WordsKind;
    item: string;
    answer: string;
    choices: string[];
    speaker: boolean;
    /** Slaganje: pločice (indeksi u `choices`) redom kojim su složene */
    placed: number[];
    /** Pogrešno probani izbori (kod slaganja: indeksi pločica kao tekst) */
    wrong: string[];
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
}

export function emptyWordsView(totalRounds: number): WordsView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "match",
        item: "",
        answer: "",
        choices: [],
        speaker: true,
        placed: [],
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

export function roundView(round: WordsRound): Pick<WordsView, "kind" | "item" | "answer" | "choices" | "speaker"> {
    return { kind: round.kind, item: round.item, answer: round.answer, choices: [...round.choices], speaker: round.speaker };
}

/** Delovi reči redom (slaganje) */
export function wordPieces(view: Pick<WordsView, "kind" | "item">): string[] {
    const word = getWord(view.item);
    return word && isBuild(view.kind) ? piecesOf(view.kind, word) : [];
}

/** Pločica koja je sledeća na redu (prva još nesložena pločica sa pravim delom) */
export function nextTile(view: Pick<WordsView, "kind" | "item" | "choices" | "placed">): number {
    const pieces = wordPieces(view);
    const need = pieces[view.placed.length];
    return view.choices.findIndex((piece, i) => piece === need && !view.placed.includes(i));
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen. Prvi zadatak prvog nivoa pokazuje ruka (pokazni, ne ocenjuje se);
 * „correct” = bez greške i bez pomoći, „prompted” = uz pomoć (osim pokaznog).
 */
export function solveWordsView(current: WordsView, level: number, solved: Partial<WordsView> = {}): { next: WordsView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
    const next: WordsView = {
        ...current,
        ...solved,
        feedback: "correct",
        hint: false,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function wordsResult(final: WordsView, level: number, durationSec: number): GameResult {
    return {
        score: final.score,
        durationSec,
        correct: final.correctCount,
        total: Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1),
        prompted: final.promptedCount,
    };
}

// ── Stanje sa monitora ────────────────────────────────────────────────────────

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && id.length <= 40) : []);

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeWordsMonitor(state: Partial<WordsView> | null | undefined): WordsView {
    const base = emptyWordsView(1);
    if (!state) return base;
    const kind = WORDS_KINDS.includes(state.kind as WordsKind) ? (state.kind as WordsKind) : "match";
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const counters = {
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
    };
    const empty = { ...base, ...counters };
    const feedback: FeedbackKind = state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null;
    const choices = strings(state.choices).slice(0, 10);
    const common = { ...empty, kind, feedback, hint: state.hint === true, speaker: state.speaker !== false };

    if (kind === "sentence") {
        const sentence = getSentence(state.item);
        const valid = sentence && choices.includes(sentence.id) && choices.every((id) => getSentence(id) !== undefined) && new Set(choices).size === choices.length;
        if (!valid) return empty;
        return {
            ...common,
            item: sentence.id,
            answer: sentence.id,
            choices,
            wrong: strings(state.wrong).filter((id) => choices.includes(id) && id !== sentence.id),
            picked: typeof state.picked === "string" && choices.includes(state.picked) ? state.picked : null,
        };
    }

    const word = getWord(state.item);
    if (!word) return empty;
    if (isBuild(kind)) {
        const pieces = piecesOf(kind, word);
        // Pločice moraju biti baš delovi te reči (pomešani)
        if ([...choices].sort().join("|") !== [...pieces].sort().join("|")) return empty;
        const placedRaw = Array.isArray(state.placed) ? state.placed.filter((i): i is number => Number.isInteger(i) && i >= 0 && i < choices.length) : [];
        const placed: number[] = [];
        for (const index of placedRaw) {
            if (placed.includes(index) || choices[index] !== pieces[placed.length]) break;
            placed.push(index);
        }
        return {
            ...common,
            item: word.word,
            answer: "",
            choices,
            placed,
            wrong: strings(state.wrong).filter((id) => /^\d+$/.test(id) && Number(id) < choices.length),
            picked: typeof state.picked === "string" && /^\d+$/.test(state.picked) && Number(state.picked) < choices.length ? state.picked : null,
        };
    }
    const answer = kind === "first" ? firstLetter(word) : word.word;
    const known = (id: string) => (kind === "first" ? getLetter(id) !== undefined : /^[a-zčćđšž]+$/.test(id));
    if (!choices.includes(answer) || !choices.every(known) || new Set(choices).size !== choices.length) return empty;
    return {
        ...common,
        item: word.word,
        answer,
        choices,
        wrong: strings(state.wrong).filter((id) => choices.includes(id) && id !== answer),
        picked: typeof state.picked === "string" && choices.includes(state.picked) ? state.picked : null,
    };
}
