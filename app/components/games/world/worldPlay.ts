// Zajednički tok za sedam igara o svetu oko nas („Suprotnosti”, „Koliko slogova?”, „Ko šta
// radi?”, „Ko gde živi?”, „Godišnja doba”, „Moje telo”, „Saobraćaj”). Bez Reacta, da bi se
// nivoi i bodovanje proveravali u testovima; izgled je u world/WorldGame.tsx, a sadržaj svake
// igre u data/<igra>Levels.ts i crteži u <igra>/.
//
// Svaka igra slaže nivo od istih vrsta zadataka, uvek istim rasporedom na ekranu (predvidljivo,
// TEACCH), a razlikuje se po sadržaju, crtežima i po bar jednoj svojoj vrsti zadatka:
//  • pick  — jedno pitanje i 2–4 slike (prepoznavanje, pa izbor uz razlog);
//  • sort  — slike u 2–4 korpe ili parove (prevlačenje, ili dodir slike pa korpe);
//  • order — slike redom u numerisana mesta (godišnja doba, delovi dana, koraci prelaska ulice);
//  • clap  — tapšanje slogova u bubanj („Koliko slogova?”);
//  • point — deo tela na velikom crtežu deteta („Moje telo”);
//  • wait  — čekanje zelenog svetla ili praznog puta, pa „Kreni” („Saobraćaj”).
//
// Bodovanje kao u ostalim igrama: pokazni zadatak (ruka) se ne ocenjuje; „tačno” = rešeno bez
// greške i bez pomoći; „uz pomoć” = posle isticanja tačnog odgovora (ne pokazni).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";

// ── Zadaci ───────────────────────────────────────────────────────────────────

export const WORLD_KINDS = ["pick", "sort", "order", "clap", "point", "wait"] as const;
export type WorldKind = (typeof WORLD_KINDS)[number];

/** Slika sa natpisom: `pic` je ključ crteža igre (svaka igra ima svoje crteže) */
export interface WorldCard {
    id: string;
    pic: string;
    label: string;
    /** Natpis se ne prikazuje na kartici (samo čitač ekrana): kad bi natpis odao odgovor */
    quiet?: boolean;
}

export type HeroId = "amar" | "lejla";

/** Kako izgledaju izbori: slike sa natpisom, krupna reč ili krupan broj (sa tačkicama) */
export type ChoiceStyle = "pic" | "word" | "number";

interface RoundBase {
    /** Pitanje (glas i tekst); nikad ne kaže gde se dodiruje */
    prompt: string;
    /** Kratko uputstvo koje se samo izgovori posle pitanja („Tapši slogove, pa reci kad je gotovo.”) */
    say?: string;
    /** Rečenica posle tačnog odgovora: zašto je tačno („Miš je mali.”) */
    why: string;
    /** Pokazni zadatak: ruka pokazuje odgovor, ne ocenjuje se */
    modeled: boolean;
}

export interface PickRound extends RoundBase {
    kind: "pick";
    /** Slika o kojoj je pitanje (ili nijedna) */
    cue: WorldCard | null;
    /** Slika pitanja je široka scena (3 : 2), a ne kvadrat */
    cueWide: boolean;
    /** Zagonetka: tragovi jedan za drugim („Nosim beli mantil.”) */
    clues: string[];
    choices: WorldCard[];
    style: ChoiceStyle;
    answer: string;
    /** Šta se kaže kad je izabrano nešto drugo (po izboru) */
    notes: Record<string, string>;
}

export interface SortRound extends RoundBase {
    kind: "sort";
    bins: WorldCard[];
    /** Slike u korpi, pomešanim redom */
    items: WorldCard[];
    /** Gde ide koja slika (id slike → id korpe) */
    homes: Record<string, string>;
    /** Šta se kaže kad slika legne u svoju korpu (po slici): „Krava živi na farmi.” */
    says: Record<string, string>;
    /** Šta se kaže kad slika padne u pogrešnu korpu (po slici) */
    notes: Record<string, string>;
}

export interface OrderRound extends RoundBase {
    kind: "order";
    /** Slike u korpi, pomešanim redom */
    items: WorldCard[];
    /** Tačan redosled (id-jevi) */
    sequence: string[];
    /** Koliko prvih mesta je već popunjeno (od čega se kreće) */
    given: number;
    /** Šta se kaže kad dođe nešto drugo umesto sledećeg (po id-ju onoga što je sledeće) */
    notes: Record<string, string>;
}

export interface ClapRound extends RoundBase {
    kind: "clap";
    word: WorldCard;
    syllables: string[];
    /** along: slogovi se vide i pale se uz svaki udarac · count: dete samo broji, pa kaže „Gotovo” */
    mode: "along" | "count";
}

export interface PointRound extends RoundBase {
    kind: "point";
    figure: "face" | "body";
    hero: HeroId;
    /** Delovi koji se mogu izabrati (ostali su samo crtež) */
    parts: string[];
    answer: string;
    /** Mala slika pored crteža (rukavice: „Gde nosimo rukavice?”) */
    cue: WorldCard | null;
    notes: Record<string, string>;
}

export interface WaitRound extends RoundBase {
    kind: "wait";
    /** light: semafor za pešake · zebra: prelaz bez semafora (čeka se da prođe auto) */
    scene: "light" | "zebra";
    hero: HeroId;
    /** Koliko puta se svetlo (ili auto) promeni pre nego što je bezbedno — duže čekanje na težim nivoima */
    cycles: number;
}

export type WorldRound = PickRound | SortRound | OrderRound | ClapRound | PointRound | WaitRound;

// ── Stanje igre (šalje se i roditeljskom prikazu i drugom detetu na zajedničkoj tabli) ──

export type WaitPhase = "stop" | "go";

export interface WorldView extends BaseView {
    kind: WorldKind;
    prompt: string;
    say: string;
    clues: string[];
    cue: WorldCard | null;
    cueWide: boolean;
    style: ChoiceStyle;
    choices: WorldCard[];
    answer: string | null;
    bins: WorldCard[];
    items: WorldCard[];
    homes: Record<string, string>;
    /** Postavljene slike (korpe, redosled) */
    placed: string[];
    sequence: string[];
    given: number;
    word: WorldCard | null;
    syllables: string[];
    mode: "along" | "count";
    /** Udarci u bubanj u tekućem pokušaju */
    taps: number;
    figure: "face" | "body" | null;
    hero: HeroId;
    parts: string[];
    scene: "light" | "zebra" | null;
    /** Semafor: crveno (stop) ili zeleno (go); prelaz bez semafora: auto prolazi (stop) ili je put prazan (go) */
    phase: WaitPhase;
    /** Koliko je promena svetla prošlo u ovom zadatku */
    cycle: number;
    cycles: number;
    /** Izabrana slika (dodir, pa korpa) */
    selected: string | null;
    /** Pogrešni pokušaji u zadatku (izbori, delovi tela; kod korpi „slika>korpa”) */
    wrong: string[];
    hint: boolean;
    /** Poruka uz poslednji potez (zašto je tačno, ili šta je izabrano) */
    message: string;
    /** Poslednja postavljena slika (kratko zasvetli) */
    last: string | null;
    modeled: boolean;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyWorldView(totalRounds: number): WorldView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "pick",
        prompt: "",
        say: "",
        clues: [],
        cue: null,
        cueWide: false,
        style: "pic",
        choices: [],
        answer: null,
        bins: [],
        items: [],
        homes: {},
        placed: [],
        sequence: [],
        given: 0,
        word: null,
        syllables: [],
        mode: "along",
        taps: 0,
        figure: null,
        hero: "amar",
        parts: [],
        scene: null,
        phase: "stop",
        cycle: 0,
        cycles: 1,
        selected: null,
        wrong: [],
        hint: false,
        message: "",
        last: null,
        modeled: false,
        feedback: null,
    };
}

const copyCard = (card: WorldCard): WorldCard => ({ id: card.id, pic: card.pic, label: card.label, ...(card.quiet ? { quiet: true } : {}) });

/** Stanje za početak zadatka (deo view-a koji zadatak menja) */
export function worldRoundView(round: WorldRound): Partial<WorldView> {
    const reset: Partial<WorldView> = {
        kind: round.kind,
        prompt: round.prompt,
        say: round.say ?? "",
        modeled: round.modeled,
        clues: [],
        cue: null,
        cueWide: false,
        style: "pic",
        choices: [],
        answer: null,
        bins: [],
        items: [],
        homes: {},
        placed: [],
        sequence: [],
        given: 0,
        word: null,
        syllables: [],
        mode: "along",
        taps: 0,
        figure: null,
        parts: [],
        scene: null,
        phase: "stop",
        cycle: 0,
        cycles: 1,
        selected: null,
        wrong: [],
        hint: false,
        message: "",
        last: null,
        feedback: null,
    };
    switch (round.kind) {
        case "pick":
            return { ...reset, cue: round.cue ? copyCard(round.cue) : null, cueWide: round.cueWide, clues: [...round.clues], choices: round.choices.map(copyCard), style: round.style, answer: round.answer };
        case "sort":
            return { ...reset, bins: round.bins.map(copyCard), items: round.items.map(copyCard), homes: { ...round.homes } };
        case "order":
            return { ...reset, items: round.items.map(copyCard), sequence: [...round.sequence], given: round.given, placed: round.sequence.slice(0, round.given) };
        case "clap":
            return { ...reset, word: copyCard(round.word), syllables: [...round.syllables], mode: round.mode };
        case "point":
            return { ...reset, figure: round.figure, hero: round.hero, parts: [...round.parts], answer: round.answer, cue: round.cue ? copyCard(round.cue) : null };
        case "wait":
            return { ...reset, scene: round.scene, hero: round.hero, cycles: round.cycles };
    }
}

// ── Potezi ───────────────────────────────────────────────────────────────────

/** Sledeća slika koja treba da se postavi (za pomoć i ruku): u redosledu baš sledeća, u korpama bilo koja preostala */
export function nextPiece(view: Pick<WorldView, "kind" | "items" | "placed" | "sequence" | "selected" | "homes">): string | null {
    if (view.kind === "order") return view.sequence.find((id) => !view.placed.includes(id)) ?? null;
    if (view.kind !== "sort") return null;
    const left = view.items.filter((item) => !view.placed.includes(item.id)).map((item) => item.id);
    if (view.selected && left.includes(view.selected)) return view.selected;
    return left[0] ?? null;
}

/** Da li slika sme u ovu korpu (ili na sledeće mesto u redosledu) */
export function fitsBin(view: Pick<WorldView, "kind" | "homes" | "sequence" | "placed">, item: string, bin: string | null): boolean {
    if (view.kind === "order") return view.sequence[view.placed.length] === item;
    return bin !== null && view.homes[item] === bin;
}

/** Svi komadi zadatka su na mestu */
export function boardDone(view: Pick<WorldView, "kind" | "items" | "placed" | "sequence">): boolean {
    if (view.kind === "order") return view.placed.length >= view.sequence.length;
    return view.items.length > 0 && view.items.every((item) => view.placed.includes(item.id));
}

// ── Bodovanje ─────────────────────────────────────────────────────────────────

/**
 * Zadatak je rešen. Pokazni se ne ocenjuje; „tačno” = bez ijedne greške i bez pomoći;
 * „uz pomoć” = posle isticanja (osim pokaznog).
 */
export function solveWorldView(current: WorldView, solved: Partial<WorldView> = {}): { next: WorldView; firstTry: boolean } {
    const modeled = current.modeled;
    const helped = current.hint;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: WorldView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry };
}

/** Koliko zadataka nivoa je pokazano rukom (ne ocenjuju se) */
export function modeledCount(plan: readonly Pick<WorldRound, "modeled">[]): number {
    return plan.filter((round) => round.modeled).length;
}

export function worldResult(final: WorldView, modeled: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - modeled, 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Pomoćno za graditelje nivoa ───────────────────────────────────────────────

export interface BuildOptions {
    maxRounds: number;
    maxChoices: number;
    random?: () => number;
}

/** Mešanje i izbor iz datog izvora brojeva (seme dvoboja ili Math.random) */
export function randomTools(random: () => number) {
    const shuffle = <T>(list: readonly T[]): T[] => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    return { shuffle, pick };
}

/** Broj zadataka nivoa: koliko traži nivo, ali ne više od podešavanja roditelja (i ne manje od 2) */
export function roundCount(wanted: number, maxRounds: number): number {
    return Math.max(2, Math.min(wanted, Number.isFinite(maxRounds) ? maxRounds : wanted));
}

/** Broj izbora: koliko traži nivo, ali ne više nego što dete sme da vidi (najmanje 2) */
export function choiceCount(wanted: number, maxChoices: number): number {
    return Math.max(2, Math.min(wanted, Number.isFinite(maxChoices) ? maxChoices : wanted));
}

/**
 * Redom kroz spisak tako da se ništa ne ponovi dok se ne prođe ceo spisak, i da ista stvar
 * nikad ne dođe dvaput zaredom (kad ima drugih).
 */
export function cycleThrough<T>(list: readonly T[], count: number, shuffle: (items: readonly T[]) => T[], key: (item: T) => string = String): T[] {
    const result: T[] = [];
    if (list.length === 0) return result;
    while (result.length < count) {
        for (const item of shuffle(list)) {
            if (result.length >= count) break;
            const previous = result[result.length - 1];
            if (previous !== undefined && key(previous) === key(item) && list.length > 1) continue;
            result.push(item);
        }
    }
    return result;
}

// ── Monitor ───────────────────────────────────────────────────────────────────

const ID = /^[\p{L}\p{N}_:.+-]{1,48}$/u;
const MAX_TEXT = 400;

const text = (value: unknown, max = MAX_TEXT): string => (typeof value === "string" ? value.slice(0, max) : "");
const isId = (value: unknown): value is string => typeof value === "string" && ID.test(value);

function card(value: unknown): WorldCard | null {
    if (!value || typeof value !== "object") return null;
    const raw = value as Record<string, unknown>;
    if (!isId(raw.id) || !isId(raw.pic)) return null;
    return { id: raw.id, pic: raw.pic, label: text(raw.label, 60), ...(raw.quiet === true ? { quiet: true } : {}) };
}

function cards(value: unknown, max = 12): WorldCard[] {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    const result: WorldCard[] = [];
    for (const raw of value.slice(0, max)) {
        const item = card(raw);
        if (item && !seen.has(item.id)) {
            seen.add(item.id);
            result.push(item);
        }
    }
    return result;
}

function ids(value: unknown, allowed: readonly string[], max = 16): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.filter((id): id is string => typeof id === "string" && allowed.includes(id)))).slice(0, max);
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeWorldMonitor(state: Partial<WorldView> | null | undefined): WorldView {
    const base = emptyWorldView(1);
    if (!state) return base;
    const kind: WorldKind = (WORLD_KINDS as readonly string[]).includes(state.kind as string) ? (state.kind as WorldKind) : "pick";
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const choices = cards(state.choices);
    const bins = cards(state.bins, 6);
    const items = cards(state.items);
    const itemIds = items.map((item) => item.id);
    const binIds = bins.map((bin) => bin.id);
    const homes: Record<string, string> = {};
    if (state.homes && typeof state.homes === "object") {
        for (const [item, bin] of Object.entries(state.homes as Record<string, unknown>)) {
            if (itemIds.includes(item) && typeof bin === "string" && binIds.includes(bin)) homes[item] = bin;
        }
    }
    const sequence = ids(state.sequence, itemIds);
    const parts = Array.isArray(state.parts) ? state.parts.filter(isId).slice(0, 20) : [];
    const answerPool = kind === "point" ? parts : choices.map((choice) => choice.id);
    const syllables = Array.isArray(state.syllables) ? state.syllables.filter((s): s is string => typeof s === "string" && s.length <= 8).slice(0, 6) : [];
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind,
        prompt: text(state.prompt),
        say: text(state.say, 160),
        clues: Array.isArray(state.clues) ? state.clues.map((clue) => text(clue, 120)).filter(Boolean).slice(0, 4) : [],
        cue: card(state.cue),
        cueWide: state.cueWide === true,
        style: state.style === "word" || state.style === "number" ? state.style : "pic",
        choices,
        answer: typeof state.answer === "string" && answerPool.includes(state.answer) ? state.answer : null,
        bins,
        items,
        homes,
        placed: ids(state.placed, itemIds),
        sequence,
        given: Math.min(toCount(state.given, 0), sequence.length),
        word: card(state.word),
        syllables,
        mode: state.mode === "count" ? "count" : "along",
        taps: Math.min(toCount(state.taps, 0), 12),
        figure: state.figure === "face" || state.figure === "body" ? state.figure : null,
        hero: state.hero === "lejla" ? "lejla" : "amar",
        parts,
        scene: state.scene === "light" || state.scene === "zebra" ? state.scene : null,
        phase: state.phase === "go" ? "go" : "stop",
        cycle: toCount(state.cycle, 0),
        cycles: Math.max(toCount(state.cycles, 1), 1),
        selected: typeof state.selected === "string" && itemIds.includes(state.selected) ? state.selected : null,
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((item): item is string => typeof item === "string" && item.length <= 100).slice(0, 24) : [],
        hint: state.hint === true,
        message: text(state.message),
        last: typeof state.last === "string" && itemIds.includes(state.last) ? state.last : null,
        modeled: state.modeled === true,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
