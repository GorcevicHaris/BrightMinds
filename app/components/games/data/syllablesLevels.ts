// Sadržaj igre „Koliko slogova?”: dete tapše slogove reči u bubanj (MA-ČKA — dva udarca), pa
// ih broji bez pomoći, razvrstava slike po broju slogova, traži dužu reč i reč koja počinje
// datim slogom. Bez Reacta, da bi se nivoi i podela na slogove proveravali u testovima.
//
// Zašto ovako (uzrast 4–8, i deca sa autizmom):
//  • Rastavljanje reči na slogove uz tapšanje je prvi korak glasovne (fonološke) svesnosti i
//    najbolji predznak ranog čitanja; u vrtiću i prvom razredu se radi baš ovako — pljesak ili
//    udarac za svaki slog. Pokret i ritam pomažu deci kojoj je teško da samo slušaju.
//  • Učenje bez greške: prvo se slogovi vide i pale uz svaki udarac, a glas ih izgovara
//    (tapšanje uz model). Tek kasnije dete samo broji udarce i kaže „Gotovo”; kad pogreši,
//    slogovi se pokažu i tapše se zajedno (pomoć), bez kazne.
//  • Podrška se povlači postepeno: jedan i dva sloga → tri → četiri; dva izbora → četiri;
//    tapšanje → broj → razvrstavanje → poređenje dužine → prvi slog (sledeći korak ka čitanju).
//  • Reči su poznate i nacrtane (životinje, voće, stvari iz kuće i škole), sve ekavski i
//    srpski (pečurka, šargarepa, paradajz, pomorandža, sijalica).
//  • Podela na slogove prati pravopis kao u igri „Prve reči”: suglasnici koji mogu da počnu reč
//    idu u sledeći slog (LO-PTA, MA-ČKA, KI-ŠO-BRAN), a ostali se dele (SUN-CE, OV-CA, KOR-NJA-ČA).
//    Test proverava svaku reč i pravilom (`syllabify`) i tabelom. Reči sa slogotvornim R
//    (srce, prst) i sa spornom podelom (auto, leptir, patka) nisu u igri.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import {
    choiceCount,
    cycleThrough,
    randomTools,
    roundCount,
    type BuildOptions,
    type ClapRound,
    type PickRound,
    type SortRound,
    type WorldCard,
    type WorldRound,
} from "@/app/components/games/world/worldPlay";

// ── Slova i slogovi ───────────────────────────────────────────────────────────

const DIGRAPHS = ["dž", "lj", "nj"];
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

/** Slova reči (lj, nj i dž su jedno slovo) */
export function lettersOf(word: string): string[] {
    const result: string[] = [];
    for (let i = 0; i < word.length; i++) {
        const two = word.slice(i, i + 2);
        if (DIGRAPHS.includes(two)) {
            result.push(two);
            i++;
        } else result.push(word[i]);
    }
    return result;
}

/**
 * Grupe suglasnika kojima može da počne srpska reč (blato, cvet, čkalja, dlan, gnezdo, knjiga,
 * pčela, ptica, pljesak, stablo, škola, šljiva, tkati, tlo, zdravo…). U sredini reči takva
 * grupa ide cela u sledeći slog; ostali suglasnici ostaju u prethodnom.
 */
export const ONSETS: ReadonlySet<string> = new Set([
    "bl", "br", "cv", "čk", "čl", "čv", "dl", "dr", "dv", "gl", "gn", "gr", "hl", "hr", "hv",
    "kl", "kn", "kr", "kv", "ml", "mn", "mr", "pč", "pl", "pr", "ps", "pš", "pt", "sk", "sl",
    "sm", "sn", "sp", "st", "sv", "sr", "šk", "šl", "šm", "šn", "šp", "št", "šv", "tk", "tl",
    "tr", "tv", "vl", "vr", "zb", "zd", "zg", "zl", "zm", "zn", "zr", "zv", "žd", "žl", "žm",
    "knj", "plj", "šlj", "str", "skr", "spr", "zdr", "zgr", "štr", "škr",
]);

const isVowel = (letter: string) => VOWELS.has(letter);

/** Podela reči na slogove po pravilu iznad (svaki slog ima tačno jedan samoglasnik) */
export function syllabify(word: string): string[] {
    const letters = lettersOf(word.toLowerCase());
    const vowels = letters.map((letter, i) => (isVowel(letter) ? i : -1)).filter((i) => i >= 0);
    if (vowels.length <= 1) return [letters.join("")];
    const cuts: number[] = [];
    for (let k = 0; k < vowels.length - 1; k++) {
        const from = vowels[k] + 1;
        const to = vowels[k + 1];
        const between = letters.slice(from, to);
        if (between.length <= 1) {
            cuts.push(from);
            continue;
        }
        // Najduži kraj grupe kojim može da počne reč ide u sledeći slog
        let keep = 1;
        for (let size = between.length; size >= 2; size--) {
            if (ONSETS.has(between.slice(between.length - size).join(""))) {
                keep = size;
                break;
            }
        }
        cuts.push(to - keep);
    }
    const result: string[] = [];
    let start = 0;
    for (const cut of cuts) {
        result.push(letters.slice(start, cut).join(""));
        start = cut;
    }
    result.push(letters.slice(start).join(""));
    return result;
}

// ── Reči ──────────────────────────────────────────────────────────────────────

export interface SyllableWord {
    /** Reč malim slovima („mačka”) */
    word: string;
    /** Slogovi sa crticom („ma-čka”) */
    syl: string;
    /** Slika: „p:<slika>” ili „a:<životinja>” (world/basePics) */
    pic: string;
}

const w = (word: string, syl: string, pic: string): SyllableWord => ({ word, syl, pic });

export const SYLLABLE_WORDS: readonly SyllableWord[] = [
    // Jedan slog
    w("pas", "pas", "p:dog"),
    w("miš", "miš", "p:mouse"),
    w("jež", "jež", "p:hedgehog"),
    w("slon", "slon", "p:elephant"),
    w("sir", "sir", "p:cheese"),
    w("hleb", "hleb", "p:bread"),
    w("cvet", "cvet", "p:flower"),
    w("kit", "kit", "p:whale"),
    w("puž", "puž", "p:snail"),
    w("zec", "zec", "p:rabbit"),
    w("lav", "lav", "p:lion"),
    w("voz", "voz", "p:train"),
    w("brod", "brod", "p:boat"),
    w("zmaj", "zmaj", "p:kite"),
    w("ključ", "ključ", "p:key"),
    w("nos", "nos", "p:nose"),
    w("šal", "šal", "p:scarf"),
    w("džip", "džip", "p:jeep"),
    // Dva sloga
    w("mačka", "ma-čka", "p:cat"),
    w("lopta", "lo-pta", "p:ball"),
    w("kuća", "ku-ća", "p:house"),
    w("riba", "ri-ba", "p:fish"),
    w("kapa", "ka-pa", "p:cap"),
    w("meda", "me-da", "p:teddy"),
    w("žaba", "ža-ba", "p:frog"),
    w("krava", "kra-va", "p:cow"),
    w("pčela", "pče-la", "p:bee"),
    w("ptica", "pti-ca", "p:bird"),
    w("ovca", "ov-ca", "p:sheep"),
    w("sunce", "sun-ce", "p:sunFace"),
    w("balon", "ba-lon", "p:balloon"),
    w("knjiga", "knji-ga", "p:book"),
    w("sova", "so-va", "p:owl"),
    w("delfin", "del-fin", "p:dolphin"),
    w("jaje", "ja-je", "p:egg"),
    w("limun", "li-mun", "p:lemon"),
    w("truba", "tru-ba", "p:trumpet"),
    w("zvono", "zvo-no", "p:bell"),
    w("tanjir", "ta-njir", "p:plate"),
    w("čekić", "če-kić", "p:hammer"),
    w("krevet", "kre-vet", "p:bed"),
    w("oblak", "o-blak", "p:cloud"),
    w("škola", "ško-la", "p:school"),
    w("poklon", "po-klon", "p:gift"),
    w("jakna", "ja-kna", "p:jacket"),
    w("ranac", "ra-nac", "p:backpack"),
    w("sveska", "sve-ska", "p:notebook"),
    w("čaša", "ča-ša", "p:glass"),
    w("duga", "du-ga", "p:rainbow"),
    w("mesec", "me-sec", "p:moon"),
    w("torta", "tor-ta", "p:cake"),
    w("grožđe", "grož-đe", "p:grapes"),
    w("svinja", "svi-nja", "p:pig"),
    w("kolač", "ko-lač", "p:cupcake"),
    w("zvezda", "zve-zda", "p:star"),
    w("klavir", "kla-vir", "p:piano"),
    w("metla", "me-tla", "p:broom"),
    w("traktor", "trak-tor", "p:tractor"),
    w("sneško", "sne-ško", "p:snowman"),
    // Tri sloga
    w("jabuka", "ja-bu-ka", "p:apple"),
    w("banana", "ba-na-na", "p:banana"),
    w("cipela", "ci-pe-la", "p:shoe"),
    w("žirafa", "ži-ra-fa", "p:giraffe"),
    w("kornjača", "kor-nja-ča", "p:turtle"),
    w("kišobran", "ki-šo-bran", "p:umbrella"),
    w("jagoda", "ja-go-da", "p:strawberry"),
    w("paradajz", "pa-ra-dajz", "p:tomato"),
    w("ananas", "a-na-nas", "p:pineapple"),
    w("krastavac", "kra-sta-vac", "p:cucumber"),
    w("pečurka", "pe-čur-ka", "p:mushroom"),
    w("sladoled", "sla-do-led", "p:iceCream"),
    w("olovka", "o-lov-ka", "p:pencil"),
    w("telefon", "te-le-fon", "p:phone"),
    w("patike", "pa-ti-ke", "p:sneakers"),
    w("majica", "ma-ji-ca", "p:tshirt"),
    w("kašika", "ka-ši-ka", "p:spoon"),
    w("viljuška", "vi-lju-ška", "p:fork"),
    w("makaze", "ma-ka-ze", "p:scissors"),
    w("čarapa", "ča-ra-pa", "p:sock"),
    w("haljina", "ha-lji-na", "p:dress"),
    w("gitara", "gi-ta-ra", "p:guitar"),
    w("avion", "a-vi-on", "p:plane"),
    w("trotinet", "tro-ti-net", "p:scooter"),
    w("raketa", "ra-ke-ta", "p:rocket"),
    w("budilnik", "bu-dil-nik", "p:alarm"),
    w("četkica", "če-tki-ca", "p:toothbrush"),
    w("brokoli", "bro-ko-li", "p:broccoli"),
    // Četiri sloga
    w("lubenica", "lu-be-ni-ca", "p:watermelon"),
    w("bubamara", "bu-ba-ma-ra", "p:ladybug"),
    w("helikopter", "he-li-ko-pter", "p:helicopter"),
    w("televizor", "te-le-vi-zor", "p:tv"),
    w("čokolada", "čo-ko-la-da", "p:chocolate"),
    w("sijalica", "si-ja-li-ca", "p:bulb"),
    w("violina", "vi-o-li-na", "p:violin"),
    w("rukavice", "ru-ka-vi-ce", "p:gloves"),
    w("šargarepa", "šar-ga-re-pa", "p:carrot"),
    w("pomorandža", "po-mo-ran-dža", "p:orange"),
];

export function syllablesOf(entry: SyllableWord): string[] {
    return entry.syl.split("-");
}

export function syllableCount(entry: SyllableWord): number {
    return syllablesOf(entry).length;
}

export function getSyllableWord(word: unknown): SyllableWord | undefined {
    return SYLLABLE_WORDS.find((entry) => entry.word === word);
}

function wordsWith(counts: readonly number[]): SyllableWord[] {
    return SYLLABLE_WORDS.filter((entry) => counts.includes(syllableCount(entry)));
}

// ── Reči za glas ──────────────────────────────────────────────────────────────

const NUMBER_WORDS = ["", "jedan", "dva", "tri", "četiri", "pet"];
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** „jedan slog”, „dva sloga”, „četiri sloga” */
export function syllableNoun(count: number): string {
    return `${NUMBER_WORDS[count] ?? count} ${count === 1 ? "slog" : count >= 2 && count <= 4 ? "sloga" : "slogova"}`;
}

/** Slogovi za glas, sa kratkim predahom: „ma, čka” */
export function spoken(entry: SyllableWord): string {
    return syllablesOf(entry).join(", ");
}

/** „Mačka: ma, čka. Dva sloga.” */
export function countSentence(entry: SyllableWord): string {
    return `${cap(entry.word)}: ${spoken(entry)}. ${cap(syllableNoun(syllableCount(entry)))}.`;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 * along   — tapšanje uz slogove (slogovi se vide i pale)
 * count   — tapšanje bez slogova, pa „Gotovo”
 * number  — „Koliko slogova ima reč jabuka?” (brojevi)
 * sort    — slike u kutije po broju slogova
 * which   — „Koja reč ima tri sloga?”
 * longer  — „Koja reč je najduža?” (najviše slogova)
 * first   — „Koja reč počinje slogom MA?”
 */
export type SyllablesKind = "along" | "count" | "number" | "sort" | "which" | "longer" | "first";

export interface SyllablesLevel {
    kinds: readonly SyllablesKind[];
    /** Broj slogova reči u nivou */
    counts: readonly number[];
    rounds: number;
    choices: number;
    intro: boolean;
    earlyHint: boolean;
}

const lvl = (kinds: SyllablesKind[], counts: number[], rounds: number, choices: number, extra: Partial<SyllablesLevel> = {}): SyllablesLevel => ({
    kinds,
    counts,
    rounds,
    choices,
    intro: false,
    earlyHint: false,
    ...extra,
});

export const SYLLABLES_LEVELS: readonly SyllablesLevel[] = [
    // Lako: tapšanje uz slogove, pa prvo brojanje i dve kutije
    lvl(["along"], [2], 4, 2, { earlyHint: true }),
    lvl(["along"], [1, 2], 5, 2, { earlyHint: true }),
    lvl(["along"], [1, 2, 3], 5, 2, { earlyHint: true }),
    lvl(["number"], [1, 2], 5, 2, { intro: true, earlyHint: true }),
    lvl(["sort"], [1, 2], 3, 4, { intro: true, earlyHint: true }),
    // Srednje: tapšanje bez slogova, tri sloga, tri kutije
    lvl(["count"], [1, 2, 3], 5, 3, { intro: true }),
    lvl(["number"], [1, 2, 3], 5, 3),
    lvl(["sort"], [1, 2, 3], 3, 6),
    lvl(["which"], [1, 2, 3], 5, 3),
    lvl(["count"], [2, 3, 4], 5, 3),
    // Teško: četiri sloga, poređenje dužine i prvi slog
    lvl(["number"], [1, 2, 3, 4], 5, 4),
    lvl(["sort"], [2, 3, 4], 3, 6),
    lvl(["longer"], [1, 2, 3, 4], 5, 3),
    lvl(["first"], [2, 3, 4], 5, 3, { intro: true }),
    lvl(["number", "first", "longer", "count", "which"], [1, 2, 3, 4], 6, 4),
];

export const SYLLABLES_MAX_LEVEL = SYLLABLES_LEVELS.length;

export function syllablesLevel(level: number): SyllablesLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), SYLLABLES_MAX_LEVEL);
    return SYLLABLES_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

const wordCard = (entry: SyllableWord): WorldCard => ({ id: entry.word, pic: entry.pic, label: entry.word });
const numberCard = (n: number): WorldCard => ({ id: `n${n}`, pic: `dots${n}`, label: String(n) });

/** Plan nivoa: zadaci jedan za drugim. `random` daje [0, 1) (seme dvoboja ili Math.random). */
export function buildSyllablesLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): WorldRound[] {
    const rule = syllablesLevel(level);
    const { shuffle, pick } = randomTools(random);
    const count = roundCount(rule.rounds, maxRounds);
    const choices = choiceCount(rule.choices, maxChoices);
    const kinds = cycleThrough(rule.kinds, count, shuffle);
    // Brojevi slogova redom (svaki pre ponavljanja), pa reč tog broja koja još nije bila
    const sizes = cycleThrough(rule.counts, count, shuffle);
    const used = new Set<string>();
    const fresh = (list: readonly SyllableWord[]): SyllableWord => {
        const unused = list.filter((entry) => !used.has(entry.word));
        const chosen = pick(unused.length > 0 ? unused : list);
        used.add(chosen.word);
        return chosen;
    };

    return kinds.map((kind, index): WorldRound => {
        const modeled = index === 0 && (level === 1 || rule.intro);
        const size = sizes[index];
        // Pokazni zadatak prvog nivoa: mačka (najpoznatiji primer, MA-ČKA)
        const entry = level === 1 && index === 0 ? getSyllableWord("mačka")! : fresh(wordsWith([size]));
        switch (kind) {
            case "along":
            case "count":
                return {
                    kind: "clap",
                    prompt: kind === "along" ? `Tapšemo zajedno: ${entry.word}.` : `Koliko slogova ima reč ${entry.word}?`,
                    ...(kind === "count" ? { say: "Tapši slogove, pa reci kad je gotovo." } : {}),
                    why: countSentence(entry),
                    modeled,
                    word: wordCard(entry),
                    syllables: syllablesOf(entry),
                    mode: kind === "along" ? "along" : "count",
                } satisfies ClapRound;
            case "number":
                return numberRound(entry, rule, choices, modeled);
            case "sort":
                return sortRound(rule, modeled, fresh, shuffle);
            case "which":
                return whichRound(size, rule, choices, modeled, fresh, shuffle);
            case "longer":
                return longerRound(rule, choices, modeled, fresh, shuffle);
            case "first":
                return firstRound(entry, choices, modeled, shuffle);
        }
    });
}

function numberRound(entry: SyllableWord, rule: SyllablesLevel, choices: number, modeled: boolean): PickRound {
    const n = syllableCount(entry);
    // Ponuđeni brojevi: tačan i najbliži iz nivoa (dva izbora: 1 i 2), poređani od manjeg
    const pool = Array.from(new Set([...rule.counts, n])).sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || a - b);
    const offered = pool.slice(0, Math.max(2, Math.min(choices, pool.length))).sort((a, b) => a - b);
    return {
        kind: "pick",
        prompt: `Koliko slogova ima reč ${entry.word}?`,
        why: countSentence(entry),
        modeled,
        cue: wordCard(entry),
        cueWide: false,
        clues: [],
        choices: offered.map(numberCard),
        style: "number",
        answer: `n${n}`,
        notes: Object.fromEntries(offered.filter((k) => k !== n).map((k) => [`n${k}`, `Tapšimo zajedno: ${spoken(entry)}.`])),
    };
}

function sortRound(rule: SyllablesLevel, modeled: boolean, fresh: (list: readonly SyllableWord[]) => SyllableWord, shuffle: <T>(list: readonly T[]) => T[]): SortRound {
    const counts = [...rule.counts].sort((a, b) => a - b);
    const per = Math.max(1, Math.floor((rule.choices >= 6 ? 6 : 4) / counts.length));
    const entries = counts.flatMap((n) => Array.from({ length: per }, () => fresh(wordsWith([n]))));
    const bins = counts.map((n): WorldCard => ({ id: `n${n}`, pic: `dots${n}`, label: syllableNoun(n) }));
    const homes: Record<string, string> = {};
    const says: Record<string, string> = {};
    const notes: Record<string, string> = {};
    for (const entry of entries) {
        homes[entry.word] = `n${syllableCount(entry)}`;
        says[entry.word] = countSentence(entry);
        notes[entry.word] = `Tapšimo zajedno: ${spoken(entry)}. ${cap(syllableNoun(syllableCount(entry)))}.`;
    }
    return {
        kind: "sort",
        prompt: "Tapši svaku reč i stavi je u kutiju sa toliko slogova.",
        why: "Sve reči su u pravim kutijama.",
        modeled,
        bins,
        items: shuffle(entries.map(wordCard)),
        homes,
        says,
        notes,
    };
}

function whichRound(n: number, rule: SyllablesLevel, choices: number, modeled: boolean, fresh: (list: readonly SyllableWord[]) => SyllableWord, shuffle: <T>(list: readonly T[]) => T[]): PickRound {
    const target = fresh(wordsWith([n]));
    const otherCounts = shuffle(rule.counts.filter((k) => k !== n));
    const others = Array.from({ length: choices - 1 }, (_, i) => fresh(wordsWith([otherCounts[i % otherCounts.length]])));
    return {
        kind: "pick",
        prompt: `Koja reč ima ${syllableNoun(n)}?`,
        why: countSentence(target),
        modeled,
        cue: null,
        cueWide: false,
        clues: [],
        choices: shuffle([target, ...others].map(wordCard)),
        style: "pic",
        answer: target.word,
        notes: Object.fromEntries(others.map((entry) => [entry.word, countSentence(entry)])),
    };
}

function longerRound(rule: SyllablesLevel, choices: number, modeled: boolean, fresh: (list: readonly SyllableWord[]) => SyllableWord, shuffle: <T>(list: readonly T[]) => T[]): PickRound {
    // Različit broj slogova za svaku reč, da najduža bude samo jedna
    const counts = shuffle(rule.counts).slice(0, Math.min(choices, rule.counts.length)).sort((a, b) => b - a);
    const entries = counts.map((n) => fresh(wordsWith([n])));
    const [longest, ...rest] = entries;
    return {
        kind: "pick",
        prompt: "Koja reč je najduža? Ima najviše slogova.",
        why: `${countSentence(longest)} Najduža reč.`,
        modeled,
        cue: null,
        cueWide: false,
        clues: [],
        choices: shuffle(entries.map(wordCard)),
        style: "pic",
        answer: longest.word,
        notes: Object.fromEntries(rest.map((entry) => [entry.word, `${countSentence(entry)} Ima i duža reč.`])),
    };
}

function firstRound(entry: SyllableWord, choices: number, modeled: boolean, shuffle: <T>(list: readonly T[]) => T[]): PickRound {
    const first = syllablesOf(entry)[0];
    const letter = lettersOf(first)[0];
    // Ostale reči počinju drugim slogom i drugim slovom, da se ne pogađa po prvom glasu
    const others = shuffle(SYLLABLE_WORDS.filter((other) => syllableCount(other) >= 2 && lettersOf(other.word)[0] !== letter)).slice(0, choices - 1);
    return {
        kind: "pick",
        prompt: `Koja reč počinje slogom ${first}?`,
        why: `${cap(entry.word)}: ${spoken(entry)}. Počinje slogom ${first}.`,
        modeled,
        cue: null,
        cueWide: false,
        clues: [],
        choices: shuffle([entry, ...others].map(wordCard)),
        style: "pic",
        answer: entry.word,
        notes: Object.fromEntries(others.map((other) => [other.word, `${cap(other.word)} počinje slogom ${syllablesOf(other)[0]}.`])),
    };
}
