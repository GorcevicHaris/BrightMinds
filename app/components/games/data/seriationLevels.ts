// Sadržaj igre „Poređaj po veličini”: predmeti leže izmešani u korpi, a iznad njih je red mesta
// (polica, more, nebo, trava) koji se puni redom. Dete prevlači (ili dodirne) predmet koji je
// sledeći po veličini; predmet koji nije na redu se zaljulja i mirno vrati („Ova riba je veća.
// Prvo ide najmanja.”). Kad je red pun, predmeti urade nešto veselo (ribe puste mehuriće,
// babuške trepnu, rakete se malo podignu). Bez Reacta, da bi se nivoi proveravali u testovima;
// crteži su u games/seriation/.
//
// Zašto ovako (uzrast 3–7, i deca sa autizmom):
//  • Seriacija (ređanje po veličini) je jedan od temelja matematike (Piaže; Clements i Sarama):
//    iz nje rastu poređenje, merenje i redosled brojeva. Deca od 3 godine slažu 3 predmeta koji
//    se jasno razlikuju, oko 5–6 godina 5–6 predmeta sa manjim razlikama, a zatim i količinu i
//    brojeve — zato ista igra ide od veličine, preko visine i dužine, do količine i brojeva.
//  • Deca ovo vole jer je konkretno i vidljivo: babuške, ribe, dinosaurusi, rakete i životinje
//    (česta posebna interesovanja), a pun red odmah „oživi” (uzrok → posledica, mali kraj).
//  • Učenje bez greške: prvi zadatak prvog nivoa pokaže ruka (ne ocenjuje se); na lakim nivoima
//    mesta pokazuju bledu senku tačne veličine (vizuelni oslonac), a pomoć (sledeći predmet
//    blago zasvetli) stiže već posle prve greške i posle čekanja. Podrška se povlači: senka samo
//    na prvom mestu, pa prazna mesta; pomoć tek posle onoliko grešaka koliko roditelj podesi.
//  • Predvidljiv raspored (TEACCH): red je uvek gore, korpa dole, mesta se pune sleva nadesno;
//    jedno uputstvo u isto vreme, malo predmeta na početku (3), više kasnije (do 6).
//  • Smer se menja tek na 4. nivou (od najvećeg) i uvek se vidi i na traci ispod reda (klin koji
//    raste ili se smanjuje) — kognitivna fleksibilnost uz vizuelnu podršku.
//  • Greška nije kazna: predmet se zaljulja i vrati, glas kaže mirnu činjenicu i šta ide prvo.
//    Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.
//
// Nivoi: Lako 1–5 (3–4 predmeta, velike razlike, senke na mestima; ribe, medvedići, baloni,
// dinosaurusi od najvećeg, kule po visini) · Srednje 6–10 (5 raketa, dužina zmija i olovaka,
// babuške od najveće, korpe sa jabukama i kartice sa tačkicama po količini) · Teško 11–15
// (životinje po veličini u stvarnosti, šest predmeta sa malim razlikama, brojevi do 10,
// umetanje u gotov red, brojevi do 20 u oba smera).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";
import { nounForm, numberWord } from "@/app/components/games/data/countingItems";

// ── Teme (šta se ređa) ────────────────────────────────────────────────────────

/** Po čemu se ređa: veličina, visina, dužina, količina, veličina u stvarnosti, broj */
export type Measure = "size" | "height" | "length" | "count" | "real" | "number";
export type Direction = "up" | "down";
type Gender = "m" | "f";

export const THEME_IDS = ["fish", "teddy", "balloon", "dino", "rocket", "doll", "tower", "snake", "pencil", "apples", "dots", "stars", "animal", "number"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Pozadina reda: more, nebo, trava ili polica */
export type Stage = "water" | "sky" | "grass" | "shelf" | "desk";

export interface Theme {
    id: ThemeId;
    measure: Measure;
    /** Jednina (nominativ): „riba” */
    one: string;
    /** Množina, akuzativ: „Poređaj ribe…” */
    acc: string;
    /** Množina, nominativ: „Ribe su poređane…” */
    many: string;
    gender: Gender;
    stage: Stage;
    /** Oblik mesta: visina / širina (za `length` je to traka, pa se ne koristi) */
    aspect: number;
    /** Količina: šta se broji (ž. rod): jednina, 2–4, ostalo; i gde je („U ovoj korpi”) */
    unit?: { one: string; few: string; many: string; where: string };
    /** Šta urade kad je red pun */
    cheer: string;
    /** Ova tema uvek ide u istom smeru (babuške: od najveće, kao kad se vade jedna iz druge) */
    dir?: Direction;
    /** Koliko boja (tonova) ima */
    tones: number;
}

const t = (theme: Theme): Theme => theme;

export const THEMES: Readonly<Record<ThemeId, Theme>> = {
    fish: t({ id: "fish", measure: "size", one: "riba", acc: "ribe", many: "ribe", gender: "f", stage: "water", aspect: 0.8, cheer: "Ribice puštaju mehuriće.", tones: 3 }),
    teddy: t({ id: "teddy", measure: "size", one: "medvedić", acc: "medvediće", many: "medvedići", gender: "m", stage: "shelf", aspect: 1.05, cheer: "Medvedići mašu.", tones: 3 }),
    balloon: t({ id: "balloon", measure: "size", one: "balon", acc: "balone", many: "baloni", gender: "m", stage: "sky", aspect: 1.3, cheer: "Baloni se njišu na vetru.", tones: 3 }),
    dino: t({ id: "dino", measure: "size", one: "dinosaurus", acc: "dinosauruse", many: "dinosaurusi", gender: "m", stage: "grass", aspect: 0.9, cheer: "Dinosaurusi lupkaju nogama.", tones: 3 }),
    rocket: t({ id: "rocket", measure: "size", one: "raketa", acc: "rakete", many: "rakete", gender: "f", stage: "sky", aspect: 1.15, cheer: "Rakete se malo podižu.", tones: 3 }),
    doll: t({ id: "doll", measure: "size", one: "babuška", acc: "babuške", many: "babuške", gender: "f", stage: "shelf", aspect: 1.25, cheer: "Babuške se smeše i trepću.", dir: "down", tones: 3 }),
    tower: t({ id: "tower", measure: "height", one: "kula", acc: "kule", many: "kule", gender: "f", stage: "shelf", aspect: 1.45, cheer: "Kule su sada kao stepenice.", tones: 3 }),
    snake: t({ id: "snake", measure: "length", one: "zmija", acc: "zmije", many: "zmije", gender: "f", stage: "grass", aspect: 1, cheer: "Zmije mrdaju repom.", tones: 3 }),
    pencil: t({ id: "pencil", measure: "length", one: "olovka", acc: "olovke", many: "olovke", gender: "f", stage: "desk", aspect: 1, cheer: "Olovke su kao stepenice.", tones: 3 }),
    apples: t({
        id: "apples",
        measure: "count",
        one: "korpa",
        acc: "korpe",
        many: "korpe",
        gender: "f",
        stage: "shelf",
        aspect: 1,
        unit: { one: "jabuka", few: "jabuke", many: "jabuka", where: "U ovoj korpi" },
        cheer: "Svaka korpa je na svom mestu.",
        tones: 3,
    }),
    dots: t({
        id: "dots",
        measure: "count",
        one: "kartica",
        acc: "kartice",
        many: "kartice",
        gender: "f",
        stage: "shelf",
        aspect: 1.25,
        unit: { one: "tačkica", few: "tačkice", many: "tačkica", where: "Na ovoj kartici" },
        cheer: "Tačkica je sve više.",
        tones: 3,
    }),
    stars: t({
        id: "stars",
        measure: "count",
        one: "kartica",
        acc: "kartice",
        many: "kartice",
        gender: "f",
        stage: "shelf",
        aspect: 1.25,
        unit: { one: "zvezdica", few: "zvezdice", many: "zvezdica", where: "Na ovoj kartici" },
        cheer: "Zvezdica je sve više.",
        tones: 3,
    }),
    animal: t({ id: "animal", measure: "real", one: "životinja", acc: "životinje", many: "životinje", gender: "f", stage: "shelf", aspect: 1, cheer: "", tones: 1 }),
    number: t({ id: "number", measure: "number", one: "broj", acc: "brojeve", many: "brojevi", gender: "m", stage: "shelf", aspect: 1.25, cheer: "", tones: 3 }),
};

export function isTheme(value: unknown): value is ThemeId {
    return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function getTheme(id: unknown): Theme | undefined {
    return isTheme(id) ? THEMES[id] : undefined;
}

// ── Životinje (veličina u stvarnosti) ─────────────────────────────────────────

export const ANIMAL_IDS = ["bee", "mouse", "hedgehog", "rabbit", "cat", "dog", "sheep", "cow", "elephant"] as const;
export type AnimalId = (typeof ANIMAL_IDS)[number];

export interface Animal {
    id: AnimalId;
    /** Nominativ i genitiv: „Pas je veći od mačke.” */
    name: string;
    gen: string;
    gender: Gender;
    /**
     * Veličina u stvarnosti (redni broj). Životinje slične veličine (zec i mačka, pas i ovca)
     * imaju isti broj, pa se nikad ne nađu u istom redu — odgovor uvek mora biti jasan.
     */
    rank: number;
}

const a = (id: AnimalId, name: string, gen: string, gender: Gender, rank: number): Animal => ({ id, name, gen, gender, rank });

export const ANIMALS: readonly Animal[] = [
    a("bee", "pčela", "pčele", "f", 1),
    a("mouse", "miš", "miša", "m", 2),
    a("hedgehog", "jež", "ježa", "m", 3),
    a("rabbit", "zec", "zeca", "m", 4),
    a("cat", "mačka", "mačke", "f", 4),
    a("dog", "pas", "psa", "m", 5),
    a("sheep", "ovca", "ovce", "f", 5),
    a("cow", "krava", "krave", "f", 6),
    a("elephant", "slon", "slona", "m", 7),
];

export function getAnimal(id: unknown): Animal | undefined {
    return ANIMALS.find((animal) => animal.id === id);
}

const ANIMAL_RANKS = Array.from(new Set(ANIMALS.map((animal) => animal.rank)));

// ── Komadi ────────────────────────────────────────────────────────────────────

/**
 * Jedan predmet u redu. `value` je ono po čemu se ređa: veličina u procentima (40–100), broj
 * kocaka u kuli, dužina, broj jabuka ili tačkica, broj na kartici, a za životinje veličina u
 * stvarnosti (`rank`). Id je izveden iz teme i vrednosti („fish-70”, „number-7”), a za životinje
 * je to sama životinja („mouse”).
 */
export interface SeriationPiece {
    id: string;
    value: number;
}

/** Dozvoljene vrednosti po vrsti merenja (i za proveru stanja sa monitora) */
export const VALUE_RANGE: Readonly<Record<Measure, readonly [number, number]>> = {
    size: [30, 100],
    height: [1, 6],
    length: [1, 7],
    count: [1, 9],
    real: [1, 7],
    number: [0, 20],
};

export function pieceId(theme: ThemeId, value: number): string {
    return `${theme}-${value}`;
}

/** Komad iz id-a (ili undefined kad id ne pripada temi) */
export function pieceFrom(theme: ThemeId, id: unknown): SeriationPiece | undefined {
    if (typeof id !== "string") return undefined;
    const info = THEMES[theme];
    if (info.measure === "real") {
        const animal = getAnimal(id);
        return animal ? { id: animal.id, value: animal.rank } : undefined;
    }
    const match = /^([a-z]+)-(\d{1,3})$/.exec(id);
    if (!match || match[1] !== theme) return undefined;
    const value = Number(match[2]);
    const [min, max] = VALUE_RANGE[info.measure];
    if (value < min || value > max) return undefined;
    return { id, value };
}

/** Tačan redosled id-ova za smer */
export function orderOf(pieces: readonly SeriationPiece[], dir: Direction): string[] {
    return [...pieces].sort((x, y) => (dir === "up" ? x.value - y.value : y.value - x.value)).map((piece) => piece.id);
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/** Senka tačne veličine na mestima: na svim, samo na prvom, nigde */
export type Guide = "all" | "first" | "none";

export interface SeriationLevel {
    /** Teme zadataka (smenjuju se) */
    themes: readonly ThemeId[];
    /** Koliko predmeta je u redu (najviše; ograničava ga i broj izbora za uzrast) */
    count: number;
    /** Smer; `mixed` = smenjuje se od zadatka do zadatka */
    dir: Direction | "mixed";
    /** Veličina: od koliko procenata do 100 (manji raspon = manje razlike) */
    smallest?: number;
    /** Količina i brojevi: iz kog raspona se biraju */
    range?: readonly [number, number];
    /** Brojevi nisu susedni (razlika bar 2) */
    apart?: boolean;
    /** Umetanje: red je već poređan, jedan predmet fali i ide u pravi razmak */
    insert: boolean;
    guide: Guide;
    rounds: number;
    earlyHint: boolean;
}

const L = (rule: Partial<SeriationLevel> & Pick<SeriationLevel, "themes" | "count" | "rounds">): SeriationLevel => ({
    dir: "up",
    insert: false,
    guide: "none",
    earlyHint: false,
    ...rule,
});

export const SERIATION_LEVELS: readonly SeriationLevel[] = [
    // Lako: 3–4 predmeta sa velikim razlikama, senke na mestima, pomoć rano
    L({ themes: ["fish"], count: 3, smallest: 38, guide: "all", rounds: 4, earlyHint: true }),
    L({ themes: ["teddy"], count: 3, smallest: 42, guide: "all", rounds: 4, earlyHint: true }),
    L({ themes: ["balloon"], count: 4, smallest: 40, guide: "all", rounds: 4, earlyHint: true }),
    L({ themes: ["dino"], count: 3, dir: "down", smallest: 42, guide: "all", rounds: 4, earlyHint: true }),
    L({ themes: ["tower"], count: 4, guide: "all", rounds: 4, earlyHint: true }),
    // Srednje: 4–5 predmeta, senka samo na prvom mestu, pa bez senke; dužina i količina
    L({ themes: ["rocket"], count: 5, smallest: 40, guide: "first", rounds: 3 }),
    L({ themes: ["snake", "pencil"], count: 4, guide: "first", rounds: 4 }),
    L({ themes: ["doll"], count: 5, dir: "down", smallest: 40, rounds: 3 }),
    L({ themes: ["apples"], count: 5, range: [1, 5], rounds: 3 }),
    L({ themes: ["dots", "stars"], count: 5, range: [1, 9], rounds: 3 }),
    // Teško: veličina u stvarnosti, male razlike, brojevi, umetanje, brojevi do 20 u oba smera
    L({ themes: ["animal"], count: 5, rounds: 3 }),
    L({ themes: ["fish", "balloon", "rocket", "teddy", "dino"], count: 6, smallest: 55, rounds: 3 }),
    L({ themes: ["number"], count: 6, range: [1, 10], rounds: 3 }),
    L({ themes: ["number", "doll", "fish"], count: 5, smallest: 40, range: [1, 20], apart: true, insert: true, rounds: 5 }),
    L({ themes: ["number"], count: 6, dir: "mixed", range: [1, 20], apart: true, rounds: 3 }),
];

export const SERIATION_MAX_LEVEL = SERIATION_LEVELS.length;

export function seriationLevel(level: number): SeriationLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), SERIATION_MAX_LEVEL);
    return SERIATION_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

export interface SeriationRound {
    theme: ThemeId;
    dir: Direction;
    /** Boja (ton) predmeta u ovom zadatku */
    tone: number;
    /** Predmeti, izmešani (kako stoje u korpi); kod umetanja i oni koji su već u redu */
    pieces: SeriationPiece[];
    /** Umetanje: predmeti koji već stoje u redu (redom) */
    given: string[];
    insert: boolean;
    guide: Guide;
}

interface BuildOptions {
    maxRounds: number;
    maxChoices: number;
    random?: () => number;
}

/** Veličine ravnomerno od `smallest` do 100 (procenti) */
function sizeValues(count: number, smallest: number): number[] {
    if (count <= 1) return [100];
    return Array.from({ length: count }, (_, i) => Math.round(smallest + ((100 - smallest) * i) / (count - 1)));
}

/**
 * Plan nivoa: zadaci jedan za drugim. Teme i boje se smenjuju (ista boja iste teme se ne
 * ponavlja zaredom), predmeti u korpi su izmešani tako da nikad ne stoje već poređani. Broj
 * predmeta je najviše koliko dete sme da vidi izbora (a bar 2). `random` daje [0, 1).
 */
export function buildSeriationLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): SeriationRound[] {
    const rule = seriationLevel(level);
    const shuffle = <T,>(list: readonly T[]): T[] => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const pickN = <T,>(list: readonly T[], n: number): T[] => shuffle(list).slice(0, n);
    const rounds = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const limit = Number.isFinite(maxChoices) ? maxChoices : 3;
    const count = Math.max(2, Math.min(rule.count, limit));

    // Teme redom: svaka po jednom pre ponavljanja, bez iste dve zaredom
    const themes: ThemeId[] = [];
    while (themes.length < rounds) {
        for (const id of shuffle(rule.themes)) {
            if (themes.length > 0 && themes[themes.length - 1] === id && rule.themes.length > 1) continue;
            themes.push(id);
        }
    }
    // Prvi zadatak prvog nivoa (pokazni) je uvek isti: tri narandžaste ribe
    const lastTone: Partial<Record<ThemeId, number>> = {};
    let mixedUp = random() < 0.5;

    return themes.slice(0, rounds).map((theme, index) => {
        const info = THEMES[theme];
        const demo = level === 1 && index === 0;
        let tone = demo ? 0 : Math.floor(random() * info.tones);
        if (info.tones > 1 && lastTone[theme] === tone) tone = (tone + 1) % info.tones;
        lastTone[theme] = tone;

        let dir: Direction = rule.dir === "mixed" ? (mixedUp ? "up" : "down") : rule.dir;
        if (rule.dir === "mixed") mixedUp = !mixedUp;
        if (info.dir) dir = info.dir;

        // Umetanje predmeta po veličini: red od najviše 4, da i najmanji predmet bude dovoljno krupan
        const size = rule.insert && info.measure !== "number" ? Math.min(count, 4) : count;
        const values = valuesFor(info, rule, size, random, pickN);
        const pieces = values.map((value) => (info.measure === "real" ? animalPiece(value, random) : { id: pieceId(theme, value), value }));
        const order = orderOf(pieces, dir);

        if (rule.insert) {
            // Jedan predmet fali; ostali već stoje u redu
            const missing = order[Math.floor(random() * order.length)];
            return { theme, dir, tone, pieces, given: order.filter((id) => id !== missing), insert: true, guide: "none" };
        }

        // Korpa: izmešano, ali nikad već poređano (ni obrnuto, da red ne bude „gotov”)
        let tray = shuffle(pieces);
        for (let tries = 0; tries < 8 && (sameOrder(tray, order) || sameOrder([...tray].reverse(), order)); tries += 1) tray = shuffle(pieces);
        if (sameOrder(tray, order) || sameOrder([...tray].reverse(), order)) tray = [...tray.slice(1), tray[0]];
        return { theme, dir, tone, pieces: tray, given: [], insert: false, guide: rule.guide };
    });
}

function sameOrder(tray: readonly SeriationPiece[], order: readonly string[]): boolean {
    return tray.length > 2 && tray.every((piece, i) => piece.id === order[i]);
}

function animalPiece(rank: number, random: () => number): SeriationPiece {
    const options = ANIMALS.filter((animal) => animal.rank === rank);
    const animal = options[Math.floor(random() * options.length)];
    return { id: animal.id, value: animal.rank };
}

function valuesFor(info: Theme, rule: SeriationLevel, count: number, random: () => number, pickN: <T>(list: readonly T[], n: number) => T[]): number[] {
    const sorted = (list: number[]) => [...list].sort((x, y) => x - y);
    switch (info.measure) {
        case "size":
            return sizeValues(count, rule.smallest ?? 40);
        case "height": {
            // Kule od 1–5 kocaka, susedne visine (razlika jedna kocka)
            const start = 1 + Math.floor(random() * Math.max(1, 6 - count));
            return Array.from({ length: count }, (_, i) => start + i);
        }
        case "length": {
            // Dužine 2–6 (ili 3–7), razlika jedna jedinica
            const start = 2 + Math.floor(random() * Math.max(1, 7 - count));
            return Array.from({ length: count }, (_, i) => Math.min(start + i, VALUE_RANGE.length[1]));
        }
        case "real":
            return sorted(pickN(ANIMAL_RANKS, Math.min(count, ANIMAL_RANKS.length)));
        case "count":
        case "number": {
            const [min, max] = rule.range ?? (info.measure === "count" ? [1, 5] : [1, 10]);
            const all = Array.from({ length: max - min + 1 }, (_, i) => min + i);
            if (!rule.apart) return sorted(pickN(all, Math.min(count, all.length)));
            // Brojevi koji nisu susedni: redom iz izmešanog spiska, bez suseda već izabranih
            const chosen: number[] = [];
            for (const value of pickN(all, all.length)) {
                if (chosen.length >= count) break;
                if (chosen.some((other) => Math.abs(other - value) < 2)) continue;
                chosen.push(value);
            }
            return sorted(chosen);
        }
    }
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

const cap = (text: string) => text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);

/** Pridevi po vrsti merenja: [muški, ženski] */
const ADJ: Record<"size" | "height" | "length", { more: [string, string]; less: [string, string]; mostGen: [string, string]; leastGen: [string, string]; most: [string, string]; least: [string, string] }> = {
    size: { more: ["veći", "veća"], less: ["manji", "manja"], mostGen: ["najvećeg", "najveće"], leastGen: ["najmanjeg", "najmanje"], most: ["najveći", "najveća"], least: ["najmanji", "najmanja"] },
    height: { more: ["viši", "viša"], less: ["niži", "niža"], mostGen: ["najvišeg", "najviše"], leastGen: ["najnižeg", "najniže"], most: ["najviši", "najviša"], least: ["najniži", "najniža"] },
    length: { more: ["duži", "duža"], less: ["kraći", "kraća"], mostGen: ["najdužeg", "najduže"], leastGen: ["najkraćeg", "najkraće"], most: ["najduži", "najduža"], least: ["najkraći", "najkraća"] },
};

function adj(info: Theme) {
    const set = ADJ[info.measure === "height" || info.measure === "length" ? info.measure : "size"];
    const g = info.gender === "m" ? 0 : 1;
    return { more: set.more[g], less: set.less[g], mostGen: set.mostGen[g], leastGen: set.leastGen[g], most: set.most[g], least: set.least[g] };
}

/** „tri jabuke”, „jedna tačkica”, „pet zvezdica” */
export function unitPhrase(info: Theme, count: number): string {
    const unit = info.unit ?? { one: "", few: "", many: "" };
    return `${numberWord(count, "f")} ${unit[nounForm(count)]}`;
}

/** „od najmanje do najveće” (deo pitanja i kratak natpis na niskom ekranu) */
export function directionWords(theme: ThemeId, dir: Direction): string {
    const info = THEMES[theme];
    if (info.measure === "count") return dir === "up" ? `od najmanje do najviše ${info.unit?.many ?? ""}` : `od najviše do najmanje ${info.unit?.many ?? ""}`;
    const words = adj(info);
    return dir === "up" ? `od ${words.leastGen} do ${words.mostGen}` : `od ${words.mostGen} do ${words.leastGen}`;
}

/** Šta je zadatak (glas i natpis) */
export function seriationQuestion(view: Pick<SeriationView, "theme" | "dir" | "insert" | "pieces" | "given">): string {
    const info = getTheme(view.theme);
    if (!info) return "";
    if (view.insert) {
        const missing = view.pieces.find((piece) => !view.given.includes(piece.id));
        if (info.measure === "number") return missing ? `Broj ${missing.value} fali u redu. Gde je njegovo mesto?` : "";
        return info.gender === "m" ? `Jedan ${info.one} fali u redu. Gde je njegovo mesto?` : `Jedna ${info.one} fali u redu. Gde je njeno mesto?`;
    }
    if (info.measure === "real") return "Poređaj životinje od najmanje do najveće, kao u stvarnom životu.";
    return `Poređaj ${info.acc} ${directionWords(info.id, view.dir)}.`;
}

/** Kratak natpis za nizak ekran (pitanje se tada samo čuje) */
export function seriationCaption(view: Pick<SeriationView, "theme" | "dir" | "insert" | "pieces" | "given">): string {
    const info = getTheme(view.theme);
    if (!info) return "";
    if (view.insert) return "Gde je mesto?";
    if (info.measure === "real") return "od najmanje do najveće";
    return directionWords(info.id, view.dir);
}

/** Posle tačno postavljenog predmeta (red još nije pun): šta sada ide */
export function stepSentence(view: Pick<SeriationView, "theme" | "dir" | "pieces" | "placed" | "given">, placedId: string): string {
    const info = getTheme(view.theme);
    if (!info) return "";
    const piece = view.pieces.find((p) => p.id === placedId);
    // Koliko ih ostaje u korpi kad ovaj legne u red: kad ostane jedan, on je poslednji
    const left = view.pieces.length - view.given.length - view.placed.length - 1;
    const up = view.dir === "up";
    const last = left === 1;
    switch (info.measure) {
        case "number":
            return `Broj ${piece?.value ?? ""}. ${last ? `Na kraju ide ${up ? "najveći" : "najmanji"} broj.` : `Sada ide ${up ? "veći" : "manji"} broj.`}`;
        case "count": {
            const lead = piece ? `${cap(unitPhrase(info, piece.value))}. ` : "";
            return `${lead}${last ? `Na kraju ide ${info.one} sa ${up ? "najviše" : "najmanje"} ${info.unit?.many}.` : `Sada ide ${info.one} sa ${up ? "više" : "manje"} ${info.unit?.many}.`}`;
        }
        case "real": {
            const animal = getAnimal(placedId);
            return `${animal ? `${cap(animal.name)}. ` : ""}${last ? "Na kraju ide najveća životinja." : "Sada ide veća životinja."}`;
        }
        default: {
            const words = adj(info);
            return last ? `Na kraju ide ${up ? words.most : words.least}.` : `Sada ide malo ${up ? words.more : words.less}.`;
        }
    }
}

/** Red je pun */
export function doneSentence(view: Pick<SeriationView, "theme" | "dir" | "pieces" | "insert" | "given">): string {
    const info = getTheme(view.theme);
    if (!info) return "";
    const order = orderOf(view.pieces, view.dir);
    if (view.insert) {
        const missing = view.pieces.find((piece) => !view.given.includes(piece.id));
        if (info.measure === "number" && missing) {
            const at = order.indexOf(missing.id);
            const before = view.pieces.find((piece) => piece.id === order[at - 1]);
            const after = view.pieces.find((piece) => piece.id === order[at + 1]);
            if (before && after) return `Broj ${missing.value} ide između ${before.value} i ${after.value}.`;
            if (after) return `Broj ${missing.value} ide pre broja ${after.value}.`;
            if (before) return `Broj ${missing.value} ide posle broja ${before.value}.`;
        }
        return `${cap(info.many)} su opet u redu.`;
    }
    if (info.measure === "number") {
        const values = order.map((id) => view.pieces.find((piece) => piece.id === id)?.value ?? 0);
        return `${values.slice(0, -1).join(", ")} i ${values[values.length - 1]}. Brojevi su poređani!`;
    }
    if (info.measure === "real") {
        const first = getAnimal(order[0]);
        const last = getAnimal(order[order.length - 1]);
        return first && last ? `Od ${first.gen} do ${last.gen}, kao u stvarnom životu.` : "";
    }
    const done = info.gender === "m" ? "poređani" : "poređane";
    return `${cap(info.many)} su ${done} ${directionWords(info.id, view.dir)}. ${info.cheer}`;
}

/** Zašto predmet ne ide na to mesto (posle greške) */
export function mistakeSentence(view: Pick<SeriationView, "theme" | "dir" | "pieces" | "placed" | "given" | "insert" | "mistake">): string {
    const info = getTheme(view.theme);
    const mistake = view.mistake;
    if (!info || !mistake) return "";
    const piece = view.pieces.find((p) => p.id === mistake.piece);
    if (!piece) return "";
    const up = view.dir === "up";

    if (view.insert) {
        // Umetanje: poredi se sa susedom na pogrešnoj strani razmaka
        const row = orderOf(view.pieces, view.dir).filter((id) => view.given.includes(id) || view.placed.includes(id));
        const correct = correctGap(view, piece.id);
        const gap = mistake.gap ?? correct;
        const early = gap < correct;
        const neighbor = view.pieces.find((p) => p.id === row[early ? gap : gap - 1]);
        if (!neighbor) return "";
        // Prerano: sused mora pre njega; prekasno: sused ide posle njega
        const bigger = early === up;
        if (info.measure === "number") return `Broj ${piece.value} je ${bigger ? "veći" : "manji"} od broja ${neighbor.value}, pa ide ${early ? "posle" : "pre"} njega.`;
        const words = adj(info);
        const m = info.gender === "m";
        return `${m ? "Ovaj" : "Ova"} ${info.one} je ${bigger ? words.more : words.less} od ${m ? "onog" : "one"} pored, pa ide ${early ? "posle" : "pre"} ${m ? "njega" : "nje"}.`;
    }

    const expected = view.pieces.find((p) => p.id === mistake.expected);
    const first = view.placed.length === 0;
    switch (info.measure) {
        case "number":
            return expected ? `Broj ${piece.value} je ${up ? "veći" : "manji"} od broja ${expected.value}. Prvo ide broj ${expected.value}.` : "";
        case "count":
            return `${info.unit?.where} ima ${up ? "više" : "manje"} ${info.unit?.many}. Prvo ide ${info.one} sa ${first ? (up ? "najmanje" : "najviše") : up ? "manje" : "više"} ${info.unit?.many}.`;
        case "real": {
            const wrong = getAnimal(piece.id);
            const right = getAnimal(expected?.id);
            if (!wrong || !right) return "";
            return `${cap(wrong.name)} je ${wrong.gender === "m" ? "veći" : "veća"} od ${right.gen}. Prvo ide ${right.name}.`;
        }
        default: {
            const words = adj(info);
            const m = info.gender === "m";
            const next = first ? (up ? words.least : words.most) : up ? words.less : words.more;
            return `${m ? "Ovaj" : "Ova"} ${info.one} je ${up ? words.more : words.less}. Prvo ide ${next}.`;
        }
    }
}

/** Natpis za predmet (čitač ekrana i roditelj) */
export function pieceLabel(theme: ThemeId, piece: SeriationPiece, pieces: readonly SeriationPiece[]): string {
    const info = THEMES[theme];
    switch (info.measure) {
        case "number":
            return `Broj ${piece.value}`;
        case "count":
            return `${cap(info.one)}: ${unitPhrase(info, piece.value)}`;
        case "real":
            return cap(getAnimal(piece.id)?.name ?? "");
        case "height":
            return `${cap(info.one)} od ${piece.value} ${piece.value <= 4 ? "kocke" : "kocaka"}`;
        default: {
            const rank = [...pieces].sort((x, y) => x.value - y.value).findIndex((p) => p.id === piece.id) + 1;
            const word = info.measure === "length" ? "dužina" : "veličina";
            return `${cap(info.one)}, ${word} ${rank} od ${pieces.length}`;
        }
    }
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface SeriationMistake {
    piece: string;
    /** Predmet koji je bio na redu (obično ređanje) */
    expected?: string;
    /** Razmak u koji je predmet spušten (umetanje) */
    gap?: number;
}

export interface SeriationView extends BaseView {
    theme: ThemeId | "";
    dir: Direction;
    tone: number;
    /** Svi predmeti zadatka, redom kako stoje u korpi */
    pieces: SeriationPiece[];
    /** Umetanje: predmeti koji su već u redu na početku (ne broje se kao potez) */
    given: string[];
    /** Predmeti koje je dete postavilo u red u ovom zadatku (redom) */
    placed: string[];
    insert: boolean;
    guide: Guide;
    /** Izabran predmet (umetanje dodirom: predmet, pa razmak) */
    selected: string | null;
    /** Sledeći pravi predmet (i njegovo mesto) blago svetli */
    hint: boolean;
    /** U ovom zadatku je bilo pomoći (za bodovanje) */
    helped: boolean;
    /** Pogrešni pokušaji u zadatku („predmet” ili „predmet>razmak”) */
    wrong: string[];
    /** Greške od poslednjeg tačno postavljenog predmeta (za pomoć posle grešaka) */
    stepWrong: number;
    mistake: SeriationMistake | null;
    /** Upravo postavljen predmet (kratko „skoči”) */
    last: string | null;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptySeriationView(totalRounds: number): SeriationView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        theme: "",
        dir: "up",
        tone: 0,
        pieces: [],
        given: [],
        placed: [],
        insert: false,
        guide: "none",
        selected: null,
        hint: false,
        helped: false,
        wrong: [],
        stepWrong: 0,
        mistake: null,
        last: null,
        feedback: null,
    };
}

export function seriationRoundView(round: SeriationRound): Partial<SeriationView> {
    return {
        theme: round.theme,
        dir: round.dir,
        tone: round.tone,
        pieces: round.pieces.map((piece) => ({ ...piece })),
        given: [...round.given],
        placed: [],
        insert: round.insert,
        guide: round.guide,
        selected: null,
        hint: false,
        helped: false,
        wrong: [],
        stepWrong: 0,
        mistake: null,
        last: null,
        feedback: null,
    };
}

/** Tačan redosled celog reda */
export function rowOrder(view: Pick<SeriationView, "pieces" | "dir">): string[] {
    return orderOf(view.pieces, view.dir);
}

/** Predmeti koji su još u korpi */
export function trayLeft(view: Pick<SeriationView, "pieces" | "given" | "placed">): string[] {
    return view.pieces.filter((piece) => !view.given.includes(piece.id) && !view.placed.includes(piece.id)).map((piece) => piece.id);
}

/** Obično ređanje: koji predmet je sledeći na redu */
export function nextPiece(view: Pick<SeriationView, "pieces" | "dir" | "placed" | "given" | "insert">): string | null {
    if (view.insert) return trayLeft(view)[0] ?? null;
    return rowOrder(view)[view.placed.length] ?? null;
}

/** Umetanje: u koji razmak ide predmet (0 = pre prvog u redu) */
export function correctGap(view: Pick<SeriationView, "pieces" | "dir" | "given" | "placed">, id: string): number {
    const order = rowOrder(view);
    const at = order.indexOf(id);
    return order.filter((other, i) => i < at && (view.given.includes(other) || view.placed.includes(other))).length;
}

/** Id mesta: „s2” (obično ređanje, treće mesto) ili „g1” (umetanje, drugi razmak) */
export const slotId = (index: number) => `s${index}`;
export const gapId = (index: number) => `g${index}`;

/**
 * Šta se dešava kad se predmet spusti na mesto: `ok` ili `wrong`. Kod običnog ređanja jedino
 * otvoreno mesto je sledeće (`slot` je null kad je predmet samo dodirnut — ide na sledeće
 * mesto); kod umetanja `slot` je razmak.
 */
export function tryPlace(view: Pick<SeriationView, "pieces" | "dir" | "placed" | "given" | "insert">, id: string, slot: string | null): { result: "ok" } | { result: "wrong"; expected?: string; gap?: number } | { result: "invalid" } {
    if (!trayLeft(view).includes(id)) return { result: "invalid" };
    if (view.insert) {
        const match = slot ? /^g(\d+)$/.exec(slot) : null;
        if (!match) return { result: "invalid" };
        const gap = Number(match[1]);
        if (gap > view.given.length + view.placed.length) return { result: "invalid" };
        return gap === correctGap(view, id) ? { result: "ok" } : { result: "wrong", gap };
    }
    if (slot !== null && slot !== slotId(view.placed.length)) return { result: "invalid" };
    const expected = nextPiece(view);
    return id === expected ? { result: "ok" } : { result: "wrong", expected: expected ?? undefined };
}

/** Koliko pogrešnih izbora dete ima u ovom koraku (za pomoć posle grešaka) */
export function missesOffered(view: Pick<SeriationView, "pieces" | "given" | "placed" | "insert">): number {
    if (view.insert) return Math.max(1, view.given.length + view.placed.length);
    return Math.max(1, trayLeft(view).length - 1);
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Red je pun. Prvi zadatak prvog nivoa pokazuje ruka (ne ocenjuje se); „correct” = bez ijedne
 * greške i bez pomoći; „prompted” = uz pomoć (osim pokaznog).
 */
export function solveSeriationView(current: SeriationView, level: number, solved: Partial<SeriationView> = {}): { next: SeriationView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.helped || current.hint;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: SeriationView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function seriationResult(final: SeriationView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeSeriationMonitor(state: Partial<SeriationView> | null | undefined): SeriationView {
    const base = emptySeriationView(1);
    if (!state) return base;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const counters = {
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
    };
    const theme = isTheme(state.theme) ? state.theme : null;
    if (!theme) return { ...base, ...counters };
    const info = THEMES[theme];

    // Predmeti: samo ispravni za temu, bez ponavljanja id-a ili vrednosti (red mora biti jasan)
    const pieces: SeriationPiece[] = [];
    if (Array.isArray(state.pieces)) {
        for (const raw of state.pieces.slice(0, 8)) {
            const piece = pieceFrom(theme, (raw as Partial<SeriationPiece> | null)?.id);
            if (!piece || (raw as SeriationPiece).value !== piece.value) continue;
            if (pieces.some((other) => other.id === piece.id || other.value === piece.value)) continue;
            pieces.push(piece);
        }
    }
    const ids = pieces.map((piece) => piece.id);
    const dir: Direction = state.dir === "down" ? "down" : "up";
    const order = orderOf(pieces, dir);
    const insert = state.insert === true;
    const unique = (value: unknown, allowed: readonly string[]) =>
        Array.isArray(value) ? Array.from(new Set(value.filter((id): id is string => typeof id === "string" && allowed.includes(id)))) : [];
    const given = insert ? order.filter((id) => unique(state.given, ids).includes(id)) : [];
    let placed = unique(state.placed, ids.filter((id) => !given.includes(id)));
    // Obično ređanje: postavljeni predmeti su uvek početak tačnog reda
    if (!insert) {
        const prefix: string[] = [];
        for (const id of placed) {
            if (order[prefix.length] !== id) break;
            prefix.push(id);
        }
        placed = prefix;
    }
    const left = ids.filter((id) => !given.includes(id) && !placed.includes(id));
    const raw = state.mistake && typeof state.mistake === "object" ? state.mistake : null;
    const mistake: SeriationMistake | null =
        raw && ids.includes(raw.piece)
            ? {
                  piece: raw.piece,
                  expected: typeof raw.expected === "string" && ids.includes(raw.expected) ? raw.expected : undefined,
                  gap: Number.isInteger(raw.gap) && (raw.gap as number) >= 0 && (raw.gap as number) <= ids.length ? raw.gap : undefined,
              }
            : null;
    const tone = Number.isInteger(state.tone) ? Math.min(Math.max(state.tone as number, 0), info.tones - 1) : 0;
    return {
        ...base,
        ...counters,
        theme,
        dir,
        tone,
        pieces,
        given,
        placed,
        insert,
        guide: state.guide === "all" || state.guide === "first" ? state.guide : "none",
        selected: typeof state.selected === "string" && left.includes(state.selected) ? state.selected : null,
        hint: state.hint === true,
        helped: state.helped === true,
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((item): item is string => typeof item === "string" && item.length <= 40).slice(0, 24) : [],
        stepWrong: Math.min(toCount(state.stepWrong, 0), 99),
        mistake,
        last: typeof state.last === "string" && placed.includes(state.last) ? state.last : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
