// Sadržaj igre „Slova”: precrtavanje slova srpske abecede i azbuke, „Gde je slovo…?” i
// „Koje slovo čuješ na početku reči…?”.
//
// Redosled prati put model → precrtaj → prepiši (Berninger i sar. 1997: numerisane strelice
// za redosled poteza + pisanje po sećanju; Santangelo i Graham 2016: izričito poučavanje
// pisanja slova): prvo velika štampana slova od pravih linija (I, L, T, E…), pa obla
// (O, C, U), pa kosa; zatim slova sa kvačicama i dvoslovi (Č, Ć, Š, Ž, Đ, DŽ, LJ, NJ) i mala
// slova; na kraju prepisivanje po uzoru samo sa početnom tačkom, prvi glas u reči i prvo
// slovo detetovog imena.
//
// Pismo prati podešavanje deteta: uz ćirilicu se pišu ćirilična slova (redosled uvođenja je
// prilagođen azbuci — prvo Т, Г, П, О), a reči su iste (srpski se piše kako se govori, pa
// reč počinje istim slovom u oba pisma).
//
// Pravila pisanja:
//  • Svako slovo ima naziv kako se izgovara u školi (a, be, ve, ge…) i jednu reč sa slikom
//    koja počinje tim slovom: „A kao auto”.
//  • Sličice su emodži iz Unicode 11 ili starijeg (stariji tableti) — test to proverava.
//  • Glas kaže slovo i reč, nikad ne kaže gde treba dodirnuti.

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";
import { letterGlyph } from "@/app/components/games/data/letterGlyphs";
import { TRACE_GUIDES, type Glyph, type TraceGuide } from "@/app/components/games/data/tracing";
import type { Script } from "@/lib/childSettings";
import { toCyrillic } from "@/lib/script";

// ── Abeceda ───────────────────────────────────────────────────────────────────

export interface SerbianLetter {
    /** Veliko latinično slovo: „A”, „Č”, „DŽ” */
    id: string;
    /** Naziv slova kako se izgovara: „a”, „be”, „dže” */
    name: string;
    /** Reč koja počinje ovim slovom (malim slovima, latinicom) */
    word: string;
    emoji: string;
}

const letter = (id: string, name: string, word: string, emoji: string): SerbianLetter => ({ id, name, word, emoji });

/** Srpska latinica abecednim redom (30 slova, i dvoslovi DŽ, LJ, NJ) */
export const LETTERS: readonly SerbianLetter[] = [
    letter("A", "a", "auto", "🚗"),
    letter("B", "be", "banana", "🍌"),
    letter("C", "ce", "cvet", "🌼"),
    letter("Č", "če", "čokolada", "🍫"),
    letter("Ć", "će", "ćurka", "🦃"),
    letter("D", "de", "duga", "🌈"),
    letter("DŽ", "dže", "džip", "🚙"),
    letter("Đ", "đe", "đevrek", "🥨"),
    letter("E", "e", "ekran", "📺"),
    letter("F", "ef", "fudbal", "⚽"),
    letter("G", "ge", "grožđe", "🍇"),
    letter("H", "ha", "hleb", "🍞"),
    letter("I", "i", "irvas", "🦌"),
    letter("J", "je", "jabuka", "🍎"),
    letter("K", "ka", "kuća", "🏠"),
    letter("L", "el", "lav", "🦁"),
    letter("LJ", "lje", "ljubav", "❤️"),
    letter("M", "em", "mačka", "🐱"),
    letter("N", "en", "nos", "👃"),
    letter("NJ", "nje", "njuška", "🐽"),
    letter("O", "o", "oblak", "☁️"),
    letter("P", "pe", "pas", "🐶"),
    letter("R", "er", "riba", "🐟"),
    letter("S", "es", "sunce", "☀️"),
    letter("Š", "še", "šargarepa", "🥕"),
    letter("T", "te", "torta", "🎂"),
    letter("U", "u", "uvo", "👂"),
    letter("V", "ve", "voz", "🚂"),
    letter("Z", "ze", "zec", "🐰"),
    letter("Ž", "že", "žaba", "🐸"),
];

/** Redosled azbuke (А Б В Г Д Ђ Е Ж З И Ј К Л Љ М Н Њ О П Р С Т Ћ У Ф Х Ц Ч Џ Ш), po latiničnom ključu */
export const AZBUKA_ORDER: readonly string[] = ["A", "B", "V", "G", "D", "Đ", "E", "Ž", "Z", "I", "J", "K", "L", "LJ", "M", "N", "NJ", "O", "P", "R", "S", "T", "Ć", "U", "F", "H", "C", "Č", "DŽ", "Š"];

export function getLetter(id: unknown): SerbianLetter | undefined {
    return LETTERS.find((item) => item.id === id);
}

/** Malo slovo: „dž”, „lj”, „a” */
function lowerOf(id: string): string {
    return id.toLocaleLowerCase("sr");
}

/** Slovo kako se piše u izabranom pismu: letterChar("LJ", "cyrillic", false) → „Љ” */
export function letterChar(id: string, script: Script, lower: boolean): string {
    const latin = lower ? lowerOf(id) : id;
    return script === "cyrillic" ? toCyrillic(latin) : latin;
}

/** Potezi slova (u izabranom pismu i veličini) */
export function glyphForLetter(id: string, script: Script, lower: boolean): Glyph | undefined {
    return letterGlyph(letterChar(id, script, lower));
}

/** Slova reči (dvoslovi su jedno slovo): „njuška” → [NJ, U, Š, K, A] */
export function splitLetters(word: string): string[] {
    const upper = word.toLocaleUpperCase("sr");
    const out: string[] = [];
    for (let i = 0; i < upper.length; i += 1) {
        const pair = upper.slice(i, i + 2);
        if (pair === "DŽ" || pair === "LJ" || pair === "NJ") {
            out.push(pair);
            i += 1;
        } else {
            out.push(upper[i]);
        }
    }
    return out;
}

/** Ćirilično slovo → latinični ključ (za ime deteta napisano ćirilicom) */
const FROM_CYRILLIC: Record<string, string> = Object.fromEntries(LETTERS.map((item) => [toCyrillic(item.id), item.id]));

/** Prvo slovo imena kao ključ abecede („Ljiljana” → LJ, „Лејла” → L); undefined ako slovo nije srpsko */
export function nameInitial(name: string | undefined): string | undefined {
    const trimmed = (name ?? "").trim();
    if (!trimmed) return undefined;
    const first = trimmed.charAt(0);
    if (FROM_CYRILLIC[first.toLocaleUpperCase("sr")]) return FROM_CYRILLIC[first.toLocaleUpperCase("sr")];
    const [initial] = splitLetters(trimmed.slice(0, 2));
    return getLetter(initial)?.id;
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);

// ── Zadaci ────────────────────────────────────────────────────────────────────

/**
 *  trace — precrtaj (ili prepiši) slovo
 *  find  — „Gde je slovo M?”: dete bira slovo među karticama
 *  first — „Koje slovo čuješ na početku reči mačka?”: slika i reč bez prvog slova
 *  name  — prvo slovo detetovog imena (prepisuje se)
 */
export type LetterKind = "trace" | "find" | "first" | "name";
export const LETTER_KINDS: readonly LetterKind[] = ["trace", "find", "first", "name"];

export interface LetterTask {
    kind: LetterKind;
    /** Ključ slova (veliko latinično) */
    letter: string;
    /** Malo slovo */
    lower: boolean;
    script: Script;
    /** Koliko pomoći ima tabla za precrtavanje */
    guide: TraceGuide;
    /** Na početku učitelj pokaže sve poteze (model) */
    demo: boolean;
    /** Kartice za find / first (ključevi slova); prazno za precrtavanje */
    choices: string[];
}

export function isTraceKind(kind: LetterKind): boolean {
    return kind === "trace" || kind === "name";
}

/** Kako se slovo izgovara u rečenici: „slovo be”, „malo slovo be” */
function spokenLetter(task: Pick<LetterTask, "letter" | "lower">): string {
    const item = getLetter(task.letter);
    return `${task.lower ? "malo slovo" : "slovo"} ${item?.name ?? ""}`;
}

/** „A kao auto.” — tekst na ekranu (slovo se piše kako izgleda) */
export function letterAndWord(task: Pick<LetterTask, "letter" | "lower" | "script">): string {
    const item = getLetter(task.letter);
    if (!item) return "";
    return `${letterChar(item.id, task.script, task.lower)} kao ${item.word}`;
}

/** Ono što glas kaže uz slovo: „Be, kao banana.” (slovo se izgovara po nazivu) */
export function spokenLetterAndWord(id: string): string {
    const item = getLetter(id);
    if (!item) return "";
    return `${capitalize(item.name)}, kao ${item.word}.`;
}

/** Pitanje / uputstvo (glas; natpis na ekranu je `promptTitle`) */
export function questionFor(task: LetterTask): string {
    const item = getLetter(task.letter);
    if (!item) return "";
    switch (task.kind) {
        case "trace":
            return task.guide === "copy" ? `Prepiši ${spokenLetter(task)}. ${spokenLetterAndWord(item.id)}` : `Piši ${spokenLetter(task)}. ${spokenLetterAndWord(item.id)}`;
        case "name":
            return `Ovo je prvo slovo tvog imena. ${spokenLetterAndWord(item.id)} Prepiši ga.`;
        case "find":
            return `Gde je ${spokenLetter(task)}? ${spokenLetterAndWord(item.id)}`;
        case "first":
            return `Koje slovo čuješ na početku reči ${item.word}?`;
    }
}

export interface PromptTitle {
    /** Tekst ispred slova: „Piši malo slovo” */
    lead: string;
    /** Slovo kako izgleda (prikazuje se bez pretvaranja u velika slova); null kad ga nema */
    letter: string | null;
    /** Tekst posle slova: „?” */
    tail: string;
}

/** Natpis na kartici sa uputstvom (slovo je odvojeno, da malo slovo ostane malo i uz „SVA SLOVA VELIKA”) */
export function promptTitle(task: LetterTask): PromptTitle {
    const item = getLetter(task.letter);
    if (!item) return { lead: "", letter: null, tail: "" };
    const shown = letterChar(item.id, task.script, task.lower);
    const which = `${task.lower ? "malo " : ""}slovo`;
    switch (task.kind) {
        case "trace":
            return { lead: `${task.guide === "copy" ? "Prepiši" : "Piši"} ${which}`, letter: shown, tail: "" };
        case "name":
            return { lead: "Prvo slovo tvog imena:", letter: shown, tail: "" };
        case "find":
            return { lead: `Gde je ${which}`, letter: shown, tail: "?" };
        case "first":
            return { lead: "Koje slovo čuješ na početku reči?", letter: null, tail: "" };
    }
}

/** Reč bez prvog slova, u izabranom pismu: „mačka” → „AČKA” (prvo slovo dete traži) */
export function wordRest(task: Pick<LetterTask, "letter" | "script">): string {
    const item = getLetter(task.letter);
    if (!item) return "";
    const rest = splitLetters(item.word).slice(1).join("");
    return task.script === "cyrillic" ? toCyrillic(rest) : rest;
}

/** Rečenica posle tačnog odgovora / dovršenog slova (glas): „Be, kao banana.” */
export function answerFor(task: LetterTask): string {
    return spokenLetterAndWord(task.letter);
}

/** Šta je na kartici koju je dete pogrešno izabralo: „To je slovo em.” */
export function pickedSentence(task: LetterTask, picked: string): string {
    const item = getLetter(picked);
    return item ? `To je ${spokenLetter({ letter: picked, lower: task.lower })}.` : "";
}

/** Natpis kartice za čitač ekrana */
export function choiceLabel(task: LetterTask, id: string): string {
    const item = getLetter(id);
    return item ? capitalize(`${spokenLetter({ letter: id, lower: task.lower })}`) : id;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelRule {
    /** Slova za precrtavanje (prva idu redom, kako se uvode), latinica i ćirilica */
    latin: readonly string[];
    cyrillic: readonly string[];
    lower: boolean;
    guide: TraceGuide;
    /** Koliko precrtavanja; ostalo su zadaci sa izborom */
    traces: number;
    /** Zadaci sa izborom, redom */
    extra: readonly LetterKind[];
    /** Slova se precrtavaju redom (uvođenje) ili izmešano (ponavljanje) */
    ordered: boolean;
    /** Za „first”: iz kog skupa slova su reči (inače iz `latin`/`cyrillic`) */
    firstPool?: readonly string[];
    /** Precrtavanje malih slova uz velika (mešano) */
    mixCase?: boolean;
    choices: number;
}

const ALL = LETTERS.map((item) => item.id);
const BASIC = ALL.filter((id) => !["Č", "Ć", "DŽ", "Đ", "LJ", "NJ", "Š", "Ž"].includes(id));
const SERBIAN = ["Č", "Ć", "Š", "Ž", "Đ", "DŽ", "LJ", "NJ"];

const RULES: readonly LevelRule[] = [
    // Lako: velika slova, debelo isprekidano slovo, učitelj prvo pokaže poteze; „Gde je slovo…?”
    { latin: ["I", "L", "O", "T"], cyrillic: ["T", "G", "P", "O"], lower: false, guide: "thick", traces: 4, extra: ["find"], ordered: true, choices: 2 },
    { latin: ["E", "F", "H", "L"], cyrillic: ["E", "N", "Š", "C"], lower: false, guide: "thick", traces: 4, extra: ["find"], ordered: true, choices: 3 },
    { latin: ["O", "C", "U", "J"], cyrillic: ["S", "J", "Č", "U"], lower: false, guide: "thick", traces: 4, extra: ["find"], ordered: true, choices: 3 },
    { latin: ["A", "V", "M", "N"], cyrillic: ["A", "I", "L", "M"], lower: false, guide: "thick", traces: 4, extra: ["find"], ordered: true, choices: 3 },
    { latin: ["K", "Z", "P", "S"], cyrillic: ["K", "H", "R", "Z"], lower: false, guide: "thick", traces: 4, extra: ["find"], ordered: true, choices: 3 },
    // Srednje: tanka linija i manje strelica; slova sa kvačicama, dvoslovi, pa mala slova
    { latin: ["B", "D", "G", "R"], cyrillic: ["B", "V", "D", "F"], lower: false, guide: "thin", traces: 4, extra: ["find", "find"], ordered: true, choices: 3 },
    { latin: ["Č", "Ć", "Š", "Ž", "Đ"], cyrillic: ["Đ", "Ć", "Ž", "DŽ", "Š"], lower: false, guide: "thin", traces: 5, extra: ["find"], ordered: true, choices: 3 },
    { latin: ["DŽ", "LJ", "NJ", "Ž"], cyrillic: ["LJ", "NJ", "DŽ", "Č"], lower: false, guide: "thin", traces: 4, extra: ["find", "find"], ordered: true, choices: 3 },
    { latin: ["I", "L", "O", "C", "T", "E", "A", "N"], cyrillic: ["O", "S", "E", "A", "T", "N", "P", "I"], lower: true, guide: "thin", traces: 4, extra: ["find", "find"], ordered: false, choices: 3 },
    { latin: ["Č", "Ć", "Š", "Ž", "Đ", "DŽ", "LJ", "NJ"], cyrillic: ["Đ", "Ć", "Ž", "DŽ", "LJ", "NJ", "J", "Č"], lower: true, guide: "thin", traces: 4, extra: ["find", "find"], ordered: false, choices: 4 },
    // Teško: prepisivanje po uzoru (na tabli je samo početna tačka), prvi glas u reči, ime
    { latin: ALL, cyrillic: ALL, lower: false, guide: "copy", traces: 5, extra: ["first"], ordered: false, firstPool: BASIC, choices: 3 },
    { latin: ALL, cyrillic: ALL, lower: true, guide: "copy", traces: 4, extra: ["first", "first"], ordered: false, firstPool: BASIC, choices: 3 },
    { latin: ALL, cyrillic: ALL, lower: false, guide: "copy", traces: 3, extra: ["first", "first", "first"], ordered: false, firstPool: BASIC, choices: 4 },
    { latin: ALL, cyrillic: ALL, lower: true, guide: "copy", traces: 3, extra: ["first", "first", "first"], ordered: false, firstPool: SERBIAN, choices: 4 },
    { latin: ALL, cyrillic: ALL, lower: false, guide: "copy", traces: 3, extra: ["name", "first", "first"], ordered: false, firstPool: ALL, mixCase: true, choices: 4 },
];

export const LETTERS_MAX_LEVEL = 15;

export function lettersRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), LETTERS_MAX_LEVEL);
    return RULES[safe - 1];
}

interface BuildOptions {
    maxChoices: number;
    maxRounds: number;
    script: Script;
    childName?: string;
    random?: () => number;
}

/**
 * Zadaci jednog nivoa. Precrtavanja idu prva (u nivoima uvođenja redom kojim se slova uče),
 * a zadaci sa izborom se umeću između njih, nikad kao prvi zadatak. Kad uzrast traži manje
 * zadataka, odbacuju se poslednja precrtavanja, a bar jedan zadatak sa izborom ostaje.
 */
export function buildLettersLevel(level: number, { maxChoices, maxRounds, script, childName, random = Math.random }: BuildOptions): LetterTask[] {
    const rule = lettersRule(level);
    const total = rule.traces + rule.extra.length;
    const roundCount = Math.max(2, Math.min(total, Number.isFinite(maxRounds) ? maxRounds : total));
    const choiceCount = Math.max(2, Math.min(rule.choices, Number.isFinite(maxChoices) ? maxChoices : rule.choices));
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const pool = script === "cyrillic" ? rule.cyrillic : rule.latin;
    const guide = rule.guide;
    const demo = guide === "thick";

    const extras = rule.extra.slice(0, Math.max(1, roundCount - Math.min(rule.traces, roundCount - 1)));
    const traceCount = roundCount - extras.length;
    const traceLetters = (rule.ordered ? [...pool] : shuffle(pool)).slice(0, traceCount);
    while (traceLetters.length < traceCount) traceLetters.push(pool[traceLetters.length % pool.length]);

    const traceTask = (id: string, lower: boolean): LetterTask => ({ kind: "trace", letter: id, lower, script, guide, demo, choices: [] });
    const traces = traceLetters.map((id, i) => traceTask(id, rule.mixCase ? i % 2 === 1 : rule.lower));

    // Izbori: tačno slovo + druga slova (iz nivoa, pa iz cele abecede), bez ponavljanja
    const choicesFor = (answer: string, from: readonly string[]) => {
        const others = shuffle(from.filter((id) => id !== answer));
        const rest = shuffle(ALL.filter((id) => id !== answer && !others.includes(id)));
        return shuffle([answer, ...[...others, ...rest].slice(0, choiceCount - 1)]);
    };
    let lastFirst: string | null = null;
    const used = new Set(traceLetters);
    const extraTasks = extras.map((kind): LetterTask => {
        if (kind === "find") {
            const answer = shuffle(pool)[0];
            return { kind, letter: answer, lower: rule.lower, script, guide, demo: false, choices: choicesFor(answer, pool) };
        }
        if (kind === "name") {
            const initial = nameInitial(childName);
            if (initial) return { kind, letter: initial, lower: false, script, guide: "copy", demo: false, choices: [] };
            const fallback = shuffle(ALL.filter((id) => !used.has(id)))[0] ?? "A";
            return traceTask(fallback, false);
        }
        const firstPool = rule.firstPool ?? pool;
        // Ne isto slovo kao u prethodnom „first” zadatku ni kao slovo koje se u nivou piše (ili ime)
        const initial = rule.extra.includes("name") ? nameInitial(childName) : undefined;
        const fresh = firstPool.filter((id) => id !== lastFirst && !used.has(id) && id !== initial);
        const candidates = fresh.length > 0 ? fresh : firstPool.filter((id) => id !== lastFirst);
        const answer = shuffle(candidates)[0];
        lastFirst = answer;
        return { kind: "first", letter: answer, lower: false, script, guide, demo: false, choices: choicesFor(answer, firstPool) };
    });

    // Raspored: prvo precrtavanje, pa izbori ravnomerno između precrtavanja (ime ide prvo, kad ga ima)
    const tasks: LetterTask[] = [];
    const nameTask = extraTasks.find((task) => task.kind === "name");
    const others = extraTasks.filter((task) => task !== nameTask);
    if (nameTask) tasks.push(nameTask);
    const gap = Math.max(1, Math.floor(traces.length / Math.max(1, others.length)));
    traces.forEach((task, i) => {
        tasks.push(task);
        if ((i + 1) % gap === 0 && others.length > 0 && i < traces.length - 1) tasks.push(others.shift()!);
    });
    tasks.push(...others);
    return tasks.slice(0, roundCount);
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface LettersView extends BaseView {
    task: LetterTask | null;
    /** Koliko poteza slova je već gotovo */
    strokesDone: number;
    /** Izlaženja iz hodnika u ovom zadatku */
    slips: number;
    /** Kartice probane pogrešno (find / first) */
    wrong: string[];
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    /** Svako novo pokazivanje poteza (pomoć) uvećava broj */
    hintRun: number;
    promptedCount: number;
}

export function emptyLettersView(totalRounds: number): LettersView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        task: null,
        strokesDone: 0,
        slips: 0,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        hintRun: 0,
    };
}

/** Zadatak sa monitora je ispravan samo ako ga je igra mogla da napravi */
export function validLetterTask(value: unknown): value is LetterTask {
    if (!value || typeof value !== "object") return false;
    const task = value as Partial<LetterTask>;
    if (!LETTER_KINDS.includes(task.kind as LetterKind) || !getLetter(task.letter)) return false;
    if (task.script !== "latin" && task.script !== "cyrillic") return false;
    if (typeof task.lower !== "boolean" || typeof task.demo !== "boolean" || !TRACE_GUIDES.includes(task.guide as TraceGuide)) return false;
    if (!Array.isArray(task.choices) || task.choices.length > 6 || !task.choices.every((id) => getLetter(id)) || new Set(task.choices).size !== task.choices.length) return false;
    if (isTraceKind(task.kind as LetterKind)) return task.choices.length === 0;
    return task.choices.length >= 2 && task.choices.includes(task.letter as string);
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeLettersMonitor(state: Partial<LettersView> | null | undefined): LettersView {
    const base = emptyLettersView(1);
    if (!state) return base;
    const task = validLetterTask(state.task) ? { ...state.task, choices: [...state.task.choices] } : null;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const choices = task?.choices ?? [];
    const strokes = task ? (glyphForLetter(task.letter, task.script, task.lower)?.strokes.length ?? 0) : 0;
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        task,
        strokesDone: Math.min(toCount(state.strokesDone, 0), strokes),
        slips: toCount(state.slips, 0),
        wrong: task && Array.isArray(state.wrong) ? Array.from(new Set(state.wrong.filter((id) => choices.includes(id) && id !== task.letter))) : [],
        picked: task ? (choices.find((id) => id === state.picked) ?? null) : null,
        feedback: task && (state.feedback === "correct" || state.feedback === "wrong") ? state.feedback : null,
        hint: task !== null && state.hint === true,
        hintRun: toCount(state.hintRun, 0),
    };
}
