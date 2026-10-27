// Sadržaj igre „Mešaj boje”: dve boje se sipaju u činiju i nastaje nova.
//
// Zašto ovako (istraživanje i odluke):
//  • Mešanje boja je jasan uzrok i posledica (dete nešto uradi i odmah vidi rezultat) i rano
//    predviđanje („šta će nastati?”), pa uči kako se proverava pretpostavka — osnovno naučno
//    razmišljanje za 4–9 godina.
//  • Redosled kao u likovnom vaspitanju u vrtiću: prvo tri osnovne boje i tri koje od njih
//    nastaju (narandžasta, zelena, ljubičasta), pa svetle nijanse sa belom, pa tamne sa crnom i
//    mešanje već pomešanih boja (braon, tamnozelena).
//  • Bez grešaka na početku (errorless): prvi zadatak prvog nivoa pokazuje ruka, prvo samo dva
//    izbora; i pogrešno mešanje pokaže šta je nastalo („Crvena i plava daju ljubičastu.”) — dete
//    uči i iz pokušaja, bez kazne. Pomoć (istaknute prave boje) stiže posle promašaja ili čekanja.
//  • Predmet koji se boji je poznat i konkretan (pomorandža, žaba, grožđe, prase…), pa boja ima
//    smisao i lakše se pamti.
//
// Nivoi (zadataka najviše koliko dozvoljava uzrast, `maxRounds`):
//   1–2   Lako     „Šta će nastati?” — dve osnovne boje, 2 izbora (prvi zadatak pokazuje ruka)
//   3–5   Lako     „Napravi boju” — tri osnovne boje u teglama, nivo 4 i mešano
//   6–10  Srednje  dodaje se bela: ružičasta, svetloplava, svetložuta…; 3 izbora, 3–4 tegle
//                  (na 9. nivou se mešaju i složene boje sa belom: svetlozelena, svetloljubičasta…)
//   11–15 Teško    dodaje se crna i pomešane boje: siva, tamnoplava, braon…; do 4 izbora, 5–6 tegli

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";

export type PaintId =
    | "red"
    | "yellow"
    | "blue"
    | "white"
    | "black"
    | "orange"
    | "green"
    | "purple"
    | "pink"
    | "lightblue"
    | "lightyellow"
    | "lightgreen"
    | "lilac"
    | "peach"
    | "gray"
    | "navy"
    | "darkred"
    | "olive"
    | "brown"
    | "darkgreen"
    | "darkpurple";

export interface Paint {
    id: PaintId;
    hex: string;
    /** Tamnija ivica (tegla, mrlja) */
    edge: string;
    /** Nominativ: „crvena” */
    name: string;
    /** Akuzativ: „crvenu” (braon se ne menja) */
    acc: string;
}

const p = (id: PaintId, hex: string, edge: string, name: string, acc: string): Paint => ({ id, hex, edge, name, acc });

export const PAINTS: readonly Paint[] = [
    p("red", "#E9504F", "#B93A3A", "crvena", "crvenu"),
    p("yellow", "#F9D23C", "#D3A912", "žuta", "žutu"),
    p("blue", "#3E7FDB", "#2C5FAE", "plava", "plavu"),
    p("white", "#FFFFFF", "#C9CCD6", "bela", "belu"),
    p("black", "#3A3A46", "#22222B", "crna", "crnu"),
    p("orange", "#F59A34", "#C87517", "narandžasta", "narandžastu"),
    p("green", "#5DB862", "#3E8F44", "zelena", "zelenu"),
    p("purple", "#9561D0", "#7144A8", "ljubičasta", "ljubičastu"),
    p("pink", "#F4A0B8", "#D37892", "ružičasta", "ružičastu"),
    p("lightblue", "#9CCBF3", "#6EA6D8", "svetloplava", "svetloplavu"),
    p("lightyellow", "#FCEBA0", "#E2C766", "svetložuta", "svetložutu"),
    p("lightgreen", "#AEDEA9", "#7FBF79", "svetlozelena", "svetlozelenu"),
    p("lilac", "#C9AEEA", "#A487CF", "svetloljubičasta", "svetloljubičastu"),
    p("peach", "#F9C59A", "#DDA170", "svetlonarandžasta", "svetlonarandžastu"),
    p("gray", "#9EA2AE", "#787C88", "siva", "sivu"),
    p("navy", "#2D4C86", "#1E3563", "tamnoplava", "tamnoplavu"),
    p("darkred", "#A33A3D", "#7C2A2D", "tamnocrvena", "tamnocrvenu"),
    p("olive", "#A39A3F", "#7C752C", "maslinasta", "maslinastu"),
    p("brown", "#9A6B45", "#744E30", "braon", "braon"),
    p("darkgreen", "#3B7D47", "#2A5C34", "tamnozelena", "tamnozelenu"),
    p("darkpurple", "#64408F", "#472D6A", "tamnoljubičasta", "tamnoljubičastu"),
];

export function getPaint(id: unknown): Paint | undefined {
    return PAINTS.find((paint) => paint.id === id);
}

/** Jedna tabela mešanja: dve boje → nova (redosled u paru nije bitan) */
export const MIXES: readonly (readonly [PaintId, PaintId, PaintId])[] = [
    // Osnovne → složene
    ["red", "yellow", "orange"],
    ["yellow", "blue", "green"],
    ["red", "blue", "purple"],
    // Sa belom: svetle nijanse
    ["red", "white", "pink"],
    ["blue", "white", "lightblue"],
    ["yellow", "white", "lightyellow"],
    ["green", "white", "lightgreen"],
    ["purple", "white", "lilac"],
    ["orange", "white", "peach"],
    // Sa crnom: tamne nijanse
    ["white", "black", "gray"],
    ["blue", "black", "navy"],
    ["red", "black", "darkred"],
    ["yellow", "black", "olive"],
    ["green", "black", "darkgreen"],
    ["purple", "black", "darkpurple"],
    // Pomešane boje: dve „suprotne” boje zajedno daju braon
    ["orange", "blue", "brown"],
    ["red", "green", "brown"],
    ["yellow", "purple", "brown"],
];

/** Šta nastaje od dve boje; null kad par nije u tabeli (takve tegle se nikad ne nude zajedno) */
export function mixOf(a: PaintId, b: PaintId): PaintId | null {
    const found = MIXES.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
    return found ? found[2] : null;
}

/** Parovi koji daju boju */
export function pairsFor(result: PaintId): [PaintId, PaintId][] {
    return MIXES.filter(([, , r]) => r === result).map(([a, b]) => [a, b]);
}

/** „Crvena i žuta daju narandžastu.” */
export function mixSentence(a: PaintId, b: PaintId): string {
    const x = getPaint(a);
    const y = getPaint(b);
    const r = mixOf(a, b);
    const z = r ? getPaint(r) : undefined;
    if (!x || !y || !z) return "";
    return `${capital(x.name)} i ${y.name} daju ${z.acc}.`;
}

function capital(text: string): string {
    return text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);
}

// ── Predmeti koji se boje ─────────────────────────────────────────────────────

export type ThingId =
    | "orange"
    | "frog"
    | "grapes"
    | "pig"
    | "balloon"
    | "chick"
    | "caterpillar"
    | "lilac"
    | "peach"
    | "elephant"
    | "night"
    | "cherry"
    | "olive"
    | "bear"
    | "pine"
    | "eggplant";

export interface Thing {
    id: ThingId;
    /** Boja koju predmet dobija */
    color: PaintId;
    /** Nominativ za natpis: „Pomorandža” */
    name: string;
    /** „za pomorandžu” */
    forWhat: string;
}

const t = (id: ThingId, color: PaintId, name: string, forWhat: string): Thing => ({ id, color, name, forWhat });

export const THINGS: readonly Thing[] = [
    t("orange", "orange", "Pomorandža", "za pomorandžu"),
    t("frog", "green", "Žaba", "za žabu"),
    t("grapes", "purple", "Grožđe", "za grožđe"),
    t("pig", "pink", "Prase", "za prase"),
    t("balloon", "lightblue", "Balon", "za balon"),
    t("chick", "lightyellow", "Pile", "za pile"),
    t("caterpillar", "lightgreen", "Gusenica", "za gusenicu"),
    t("lilac", "lilac", "Jorgovan", "za jorgovan"),
    t("peach", "peach", "Breskva", "za breskvu"),
    t("elephant", "gray", "Slon", "za slona"),
    t("night", "navy", "Noćno nebo", "za noćno nebo"),
    t("cherry", "darkred", "Trešnje", "za trešnje"),
    t("olive", "olive", "Masline", "za masline"),
    t("bear", "brown", "Meda", "za medu"),
    t("pine", "darkgreen", "Jelka", "za jelku"),
    t("eggplant", "darkpurple", "Plavi patlidžan", "za plavi patlidžan"),
];

export function getThing(id: unknown): Thing | undefined {
    return THINGS.find((thing) => thing.id === id);
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

export const MIX_MAX_LEVEL = 15;

export type MixKind = "predict" | "make";

interface LevelRule {
    /** Vrste zadataka, redom (ponavljaju se dok ima zadataka) */
    kinds: readonly MixKind[];
    /** Boje koje se traže (rezultati mešanja) */
    targets: readonly PaintId[];
    /** Izbora u „Šta će nastati?” */
    choices: number;
    /** Tegli u „Napravi boju” */
    pots: number;
    /** Tegle za „Napravi boju” biraju se samo iz ovih boja */
    potPool: readonly PaintId[];
    rounds: number;
}

const SECONDARY: PaintId[] = ["orange", "green", "purple"];
const TINTS: PaintId[] = ["pink", "lightblue", "lightyellow"];
const TINTS_MORE: PaintId[] = ["lightgreen", "lilac", "peach"];
const SHADES: PaintId[] = ["gray", "navy", "darkred", "olive"];
const MIXED: PaintId[] = ["brown", "darkgreen", "darkpurple"];
const PRIMARY: PaintId[] = ["red", "yellow", "blue"];

const RULES: readonly LevelRule[] = [
    { kinds: ["predict"], targets: SECONDARY, choices: 2, pots: 3, potPool: PRIMARY, rounds: 3 },
    { kinds: ["predict"], targets: SECONDARY, choices: 2, pots: 3, potPool: PRIMARY, rounds: 4 },
    { kinds: ["make"], targets: SECONDARY, choices: 2, pots: 3, potPool: PRIMARY, rounds: 3 },
    { kinds: ["predict", "make"], targets: SECONDARY, choices: 3, pots: 3, potPool: PRIMARY, rounds: 4 },
    { kinds: ["make"], targets: SECONDARY, choices: 3, pots: 3, potPool: PRIMARY, rounds: 4 },

    { kinds: ["predict"], targets: TINTS, choices: 3, pots: 4, potPool: [...PRIMARY, "white"], rounds: 4 },
    { kinds: ["make"], targets: TINTS, choices: 3, pots: 4, potPool: [...PRIMARY, "white"], rounds: 4 },
    { kinds: ["predict", "make"], targets: [...SECONDARY, ...TINTS], choices: 3, pots: 4, potPool: [...PRIMARY, "white"], rounds: 5 },
    { kinds: ["make"], targets: TINTS_MORE, choices: 3, pots: 4, potPool: [...SECONDARY, "white", "black", "blue"], rounds: 4 },
    { kinds: ["make", "predict"], targets: [...TINTS, ...TINTS_MORE], choices: 3, pots: 4, potPool: [...PRIMARY, ...SECONDARY, "white"], rounds: 5 },

    { kinds: ["predict"], targets: SHADES, choices: 4, pots: 5, potPool: [...PRIMARY, "white", "black"], rounds: 5 },
    { kinds: ["make"], targets: SHADES, choices: 4, pots: 5, potPool: [...PRIMARY, "white", "black"], rounds: 5 },
    { kinds: ["make"], targets: MIXED, choices: 4, pots: 5, potPool: [...PRIMARY, ...SECONDARY, "white", "black"], rounds: 5 },
    { kinds: ["predict", "make"], targets: [...SHADES, ...MIXED, ...TINTS_MORE], choices: 4, pots: 6, potPool: [...PRIMARY, ...SECONDARY, "white", "black"], rounds: 6 },
    { kinds: ["make", "predict", "make"], targets: [...SECONDARY, ...TINTS, ...SHADES, ...MIXED], choices: 4, pots: 6, potPool: [...PRIMARY, ...SECONDARY, "white", "black"], rounds: 6 },
];

export function mixRule(level: number): LevelRule {
    return RULES[Math.min(Math.max(Math.round(level), 1), MIX_MAX_LEVEL) - 1];
}

export interface MixRound {
    kind: MixKind;
    target: PaintId;
    /** Par koji daje boju (za pomoć i za „Šta će nastati?”) */
    pair: [PaintId, PaintId];
    /** Predmet koji se boji („Napravi boju”) */
    thing: ThingId | null;
    /** Tegle („Napravi boju”), redom na ekranu */
    pots: PaintId[];
    /** Ponuđene boje („Šta će nastati?”), redom na ekranu */
    choices: PaintId[];
}

/**
 * Tegle za „Napravi boju”: dve prave + ostale iz `pool`, tako da je SVAKI par tegli u tabeli
 * mešanja — šta god dete pomeša, igra zna šta je nastalo i može to da pokaže i kaže.
 */
export function potsFor(pair: [PaintId, PaintId], pool: readonly PaintId[], count: number, random: () => number): PaintId[] {
    const pots: PaintId[] = [...pair];
    for (const candidate of shuffle(pool, random)) {
        if (pots.length >= count) break;
        if (pots.includes(candidate)) continue;
        if (pots.every((pot) => mixOf(pot, candidate) !== null)) pots.push(candidate);
    }
    return shuffle(pots, random);
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

export function buildMixLevel(level: number, { maxChoices, maxRounds, random = Math.random }: { maxChoices: number; maxRounds: number; random?: () => number }): MixRound[] {
    const rule = mixRule(level);
    const count = Math.max(2, Math.min(rule.rounds, maxRounds));
    const choiceCount = Math.max(2, Math.min(rule.choices, maxChoices));
    // Svaka tražena boja jednom, pa ispočetka (bez dve iste zaredom)
    const queue: PaintId[] = [];
    while (queue.length < count) {
        const batch = shuffle(rule.targets, random);
        if (queue.length > 0 && batch[0] === queue[queue.length - 1] && batch.length > 1) batch.push(batch.shift()!);
        queue.push(...batch);
    }
    const allResults = Array.from(new Set(MIXES.map(([, , r]) => r)));
    return queue.slice(0, count).map((target, i) => {
        const kind = rule.kinds[i % rule.kinds.length];
        const pairs = pairsFor(target).filter(([a, b]) => kind === "predict" || (rule.potPool.includes(a) && rule.potPool.includes(b)));
        const pair = pairs[Math.floor(random() * pairs.length)] ?? pairsFor(target)[0];
        if (kind === "predict") {
            // Ostali izbori: prvo boje sa istog nivoa, pa ostale; nikad sama boja iz para
            const near = shuffle(rule.targets.filter((id) => id !== target && !pair.includes(id)), random);
            const far = shuffle(allResults.filter((id) => id !== target && !near.includes(id) && !pair.includes(id)), random);
            const choices = shuffle([target, ...[...near, ...far].slice(0, choiceCount - 1)], random);
            return { kind, target, pair: shuffle(pair, random) as [PaintId, PaintId], thing: null, pots: [], choices };
        }
        const things = THINGS.filter((thing) => thing.color === target);
        const thing = things[Math.floor(random() * things.length)]?.id ?? null;
        const pots = potsFor(pair, rule.potPool, Math.max(rule.pots, 2), random);
        return { kind, target, pair, thing, pots, choices: [] };
    });
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface MixView extends BaseView {
    kind: MixKind;
    target: string;
    pair: string[];
    thing: string | null;
    pots: string[];
    choices: string[];
    /** Tegle sipane u činiju u ovom pokušaju (0–2) */
    bowl: string[];
    /** Boja u činiji posle mešanja */
    mixed: string | null;
    /** Pogrešno izabrane boje („Šta će nastati?”) */
    wrong: string[];
    /** Broj promašaja u zadatku */
    misses: number;
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    /** Predmet je obojen (zadatak rešen) */
    painted: boolean;
    promptedCount: number;
}

export function emptyMixView(totalRounds: number): MixView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "predict",
        target: "",
        pair: [],
        thing: null,
        pots: [],
        choices: [],
        bowl: [],
        mixed: null,
        wrong: [],
        misses: 0,
        picked: null,
        feedback: null,
        hint: false,
        painted: false,
    };
}

function paintList(value: unknown, max: number): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(value.filter((id): id is string => getPaint(id) !== undefined))).slice(0, max);
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeMixMonitor(state: Partial<MixView> | null | undefined): MixView {
    const base = emptyMixView(1);
    if (!state) return base;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const target = getPaint(state.target)?.id ?? "";
    const kind: MixKind = state.kind === "make" ? "make" : "predict";
    const pots = paintList(state.pots, 6);
    const choices = paintList(state.choices, 6);
    const valid = target !== "" && (kind === "make" ? pots.length >= 2 : choices.includes(target));
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind,
        target: valid ? target : "",
        pair: valid ? paintList(state.pair, 2) : [],
        thing: valid && kind === "make" ? (getThing(state.thing)?.id ?? null) : null,
        pots: valid ? pots : [],
        choices: valid ? choices : [],
        bowl: valid ? paintList(state.bowl, 2).filter((id) => kind === "predict" || pots.includes(id)) : [],
        mixed: valid ? (getPaint(state.mixed)?.id ?? null) : null,
        wrong: valid ? paintList(state.wrong, 6).filter((id) => id !== target) : [],
        misses: toCount(state.misses, 0),
        picked: valid ? (getPaint(state.picked)?.id ?? null) : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
        painted: state.painted === true,
    };
}
