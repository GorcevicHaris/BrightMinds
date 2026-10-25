// Sadržaj igre „Šta gleda?”: dete na slici gleda u jedan od predmeta oko sebe, a dete koje
// igra bira taj predmet. Vežba se praćenje pogleda (zajednička pažnja) i dve prve veze između
// pogleda i misli (Baron-Cohen; Howlin, Baron-Cohen i Hadwin, „Teaching Children with Autism
// to Mind-Read”): u šta neko gleda, to i želi; ko je video, taj zna.
//
// Napredovanje (od jače ka slabijoj pomoći, kao u učenju zajedničke pažnje):
//   1–2   lik pokazuje rukom (ka predmetu gore ruka ide uvis), okreće glavu i oči; dva, pa tri predmeta
//   3–5   glava i oči, bez pokazivanja; dva, tri, pa četiri predmeta
//   6–7   glava se okreće samo upola, oči jasno; tri, pa četiri predmeta
//   8–10  samo oči (glava ostaje pravo); dva, tri, pa četiri predmeta
//   11–12 „Šta Amina želi?” — pogled pokazuje šta lik želi (glava i oči, pa samo oči)
//   13–14 „Ko zna šta je u kutiji?” — ko je pogledao, taj zna (glava i oči, pa samo oči)
//   15    sve izmešano, samo oči
// Svaka nova vrsta zadatka (želja, znanje) počinje jačim znakom (glava i oči), pa ide samo oči.
//
// Pravila pisanja:
//  • Rečenice su kratke i doslovne, u sadašnjem vremenu, pa ne zavise od roda lika:
//    „Šta gleda Amina?”, „Amina gleda loptu.”, „Amina gleda u kutiju. Amina zna šta je u kutiji.”
//  • Ime je uvek u nominativu; predmet u nominativu (natpis, „To je …”) i akuzativu
//    („gleda loptu”, „gleda leptira”) — oba oblika su napisana ručno, ovde.
//  • Nikad se ne traži da dete gleda nekoga u oči: pitanje je samo o liku na slici.

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";
import type { LookId, PropId } from "@/app/components/games/scene/types";
import { toCyrillic } from "@/lib/script";

// ── Likovi ────────────────────────────────────────────────────────────────────

export type GazeCharacterId = "lejla" | "amina" | "selma" | "haris" | "amar" | "tarik" | "emir" | "ajla" | "merjem";

export interface GazeCharacter {
    id: GazeCharacterId & LookId;
    name: string;
}

export const GAZE_CHARACTERS: readonly GazeCharacter[] = [
    { id: "amina", name: "Amina" },
    { id: "haris", name: "Haris" },
    { id: "lejla", name: "Lejla" },
    { id: "amar", name: "Amar" },
    { id: "selma", name: "Selma" },
    { id: "tarik", name: "Tarik" },
    { id: "ajla", name: "Ajla" },
    { id: "emir", name: "Emir" },
    { id: "merjem", name: "Merjem" },
];

export function getGazeCharacter(id: unknown): GazeCharacter | undefined {
    return GAZE_CHARACTERS.find((character) => character.id === id);
}

/** Likovi koji smeju u igru: bez imenjaka deteta koje igra (i kad je ime upisano ćirilicom) */
export function gazeCast(childName: string | undefined): GazeCharacter[] {
    const given = childName?.trim().toLocaleLowerCase("sr");
    if (!given) return [...GAZE_CHARACTERS];
    return GAZE_CHARACTERS.filter((character) => given !== character.name.toLocaleLowerCase("sr") && given !== toCyrillic(character.name).toLocaleLowerCase("sr"));
}

// ── Predmeti ──────────────────────────────────────────────────────────────────

export interface GazeObject {
    id: string;
    prop: PropId;
    tone?: string;
    /** Nominativ, velikim početnim slovom (natpis na kartici) */
    name: string;
    /** Akuzativ: „Amina gleda loptu.” */
    acc: string;
    plural?: boolean;
    /** Nešto što dete može da želi (igračka, poslastica) — samo takvi se nude uz „Šta … želi?” */
    wanted: boolean;
    /** Granice crteža u razmeri 1 [x0, y0, x1, y1] (predmet stoji na 0, 0) */
    box: readonly [number, number, number, number];
    /** Razmera na slici: svi predmeti su otprilike iste veličine */
    s: number;
}

const o = (id: string, prop: PropId, name: string, acc: string, box: GazeObject["box"], s: number, extra: Partial<Pick<GazeObject, "tone" | "plural" | "wanted">> = {}): GazeObject => ({
    id,
    prop,
    name,
    acc,
    box,
    s,
    wanted: extra.wanted ?? true,
    ...(extra.tone ? { tone: extra.tone } : {}),
    ...(extra.plural ? { plural: true } : {}),
});

/** Predmeti oko lika: različitih oblika i boja, da se ne mešaju */
export const GAZE_OBJECTS: readonly GazeObject[] = [
    o("ball", "ball", "Lopta", "loptu", [-9, -17, 9, 1], 2.3, { tone: "#f4b73f" }),
    o("teddy", "teddy", "Meda", "medu", [-12, -30, 12, 1], 1.55),
    o("car", "toyCar", "Autić", "autić", [-17, -23, 17, 1], 1.35, { tone: "#e0574f" }),
    o("gift", "gift", "Poklon", "poklon", [-15, -35, 15, 1], 1.3, { tone: "#8a6ee8" }),
    o("apple", "apple", "Jabuka", "jabuku", [-12, -21, 12, 1], 1.9),
    o("book", "book", "Knjiga", "knjigu", [-11, -25, 11, 1], 1.55, { tone: "#3f8fd8" }),
    o("cake", "cake", "Torta", "tortu", [-22, -37, 22, 1], 1.15),
    o("blocks", "blocks", "Kocke", "kocke", [-15, -47, 12, 1], 0.95, { plural: true }),
    o("cat", "cat", "Mače", "mače", [-18, -29, 17, 1], 1.4, { wanted: false }),
    o("cup", "cup", "Šolja", "šolju", [-7, -15, 10, 1], 2.3, { wanted: false, tone: "#3fbf8a" }),
    o("bird", "bird", "Ptica", "pticu", [-11, -16, 13, 1], 2.2, { wanted: false }),
    o("balloon", "balloon", "Balon", "balon", [-9, -41, 9, 1], 1.2, { tone: "#e8605a" }),
    o("iceCream", "iceCream", "Sladoled", "sladoled", [-7, -21, 7, 1], 2.2),
    o("puzzle", "puzzle", "Slagalica", "slagalicu", [-21, -29, 21, 1], 1.3),
    o("crayons", "crayons", "Bojice", "bojice", [-12, -21, 12, 1], 2, { plural: true }),
    o("clock", "clock", "Sat", "sat", [-12, -23, 12, 1], 2, { wanted: false }),
    o("flowers", "flowers", "Cveće", "cveće", [-14, -27, 14, 1], 1.7, { wanted: false }),
];

/** Ono u šta gleda dete koje NE gleda u kutiju (zadatak „Ko zna?”): daleko, gore */
export const FAR_OBJECTS: readonly GazeObject[] = [
    o("butterfly", "butterfly", "Leptir", "leptira", [-11, -17, 11, 1], 2.2, { wanted: false }),
    o("kite", "kite", "Zmaj", "zmaja", [-11, -41, 11, 11], 1.2, { wanted: false }),
    o("birdFar", "bird", "Ptica", "pticu", [-11, -16, 13, 1], 2.2, { wanted: false }),
    o("plane", "plane", "Avion", "avion", [-32, -29, 33, 5], 0.75, { wanted: false }),
    o("sun", "sun", "Sunce", "sunce", [-18, -32, 18, 4], 1.2, { wanted: false }),
];

export function getGazeObject(id: unknown): GazeObject | undefined {
    return GAZE_OBJECTS.find((object) => object.id === id) ?? FAR_OBJECTS.find((object) => object.id === id);
}

/** „To je lopta.” / „To su kocke.” */
export function itIs(object: GazeObject): string {
    return `To ${object.plural ? "su" : "je"} ${object.name.toLocaleLowerCase("sr")}.`;
}

// ── Mesta na slici ────────────────────────────────────────────────────────────
// Lik je u sredini, krupno (vide se glava i ramena), a predmeti su levo i desno od njega:
// dole na podu i gore na polici. Dva predmeta su uvek na suprotnim stranama.

export type SlotId = "left" | "right" | "upLeft" | "upRight";
export const SLOTS: readonly SlotId[] = ["left", "right", "upLeft", "upRight"];

export function isSlot(value: unknown): value is SlotId {
    return typeof value === "string" && (SLOTS as readonly string[]).includes(value);
}

export function slotSide(slot: SlotId): "left" | "right" {
    return slot === "left" || slot === "upLeft" ? "left" : "right";
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/** look = „Šta gleda …?”, want = „Šta … želi?”, know = „Ko zna šta je u kutiji?” */
export type GazeKind = "look" | "want" | "know";
/** Koliko pogled pomaže: rukom pokazuje + glava i oči, glava i oči, glava upola, samo oči */
export type GazeCue = "point" | "head" | "turn" | "eyes";

const KINDS: readonly GazeKind[] = ["look", "want", "know"];
const CUES: readonly GazeCue[] = ["point", "head", "turn", "eyes"];

/** Koliko se glava okreće ka predmetu (1 = sasvim, 0 = samo oči) */
export function headTurn(cue: GazeCue): number {
    return cue === "eyes" ? 0 : cue === "turn" ? 0.5 : 1;
}

interface Task {
    kind: GazeKind;
    cue: GazeCue;
    /** Broj predmeta na slici (za „know” uvek dva deteta) */
    objects: number;
}

interface LevelRule {
    first: number;
    last: number;
    /** Zadaci nivoa se smenjuju ovim redom */
    tasks: readonly Task[];
    rounds: number;
}

const RULES: readonly LevelRule[] = [
    // Lako: lik pokazuje rukom, pa samo okreće glavu; dva do četiri predmeta
    { first: 1, last: 1, tasks: [{ kind: "look", cue: "point", objects: 2 }], rounds: 5 },
    { first: 2, last: 2, tasks: [{ kind: "look", cue: "point", objects: 3 }], rounds: 5 },
    { first: 3, last: 3, tasks: [{ kind: "look", cue: "head", objects: 2 }], rounds: 5 },
    { first: 4, last: 4, tasks: [{ kind: "look", cue: "head", objects: 3 }], rounds: 6 },
    { first: 5, last: 5, tasks: [{ kind: "look", cue: "head", objects: 4 }], rounds: 6 },
    // Srednje: glava se okreće sve manje, pa samo oči
    { first: 6, last: 6, tasks: [{ kind: "look", cue: "turn", objects: 3 }], rounds: 6 },
    { first: 7, last: 7, tasks: [{ kind: "look", cue: "turn", objects: 4 }], rounds: 6 },
    { first: 8, last: 8, tasks: [{ kind: "look", cue: "eyes", objects: 2 }], rounds: 6 },
    { first: 9, last: 9, tasks: [{ kind: "look", cue: "eyes", objects: 3 }], rounds: 6 },
    { first: 10, last: 10, tasks: [{ kind: "look", cue: "eyes", objects: 4 }], rounds: 6 },
    // Teško: pogled i misli — šta lik želi, ko zna; pa sve izmešano
    { first: 11, last: 11, tasks: [{ kind: "want", cue: "head", objects: 3 }], rounds: 6 },
    { first: 12, last: 12, tasks: [{ kind: "want", cue: "eyes", objects: 3 }], rounds: 6 },
    { first: 13, last: 13, tasks: [{ kind: "know", cue: "head", objects: 2 }], rounds: 6 },
    { first: 14, last: 14, tasks: [{ kind: "know", cue: "eyes", objects: 2 }], rounds: 6 },
    {
        first: 15,
        last: 15,
        tasks: [
            { kind: "look", cue: "eyes", objects: 4 },
            { kind: "want", cue: "eyes", objects: 3 },
            { kind: "know", cue: "eyes", objects: 2 },
        ],
        rounds: 6,
    },
];

export const GAZE_MAX_LEVEL = 15;

export function gazeRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), GAZE_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

export interface PlacedObject {
    id: string;
    slot: SlotId;
}

export interface GazeRound {
    kind: GazeKind;
    cue: GazeCue;
    /** Lik koji gleda (u „know”: dete koje gleda u kutiju) */
    hero: GazeCharacterId;
    /** Samo „know”: dete koje gleda na drugu stranu */
    other: GazeCharacterId | "";
    /** look/want: predmeti oko lika; know: jedan predmet daleko (u njega gleda `other`) */
    objects: PlacedObject[];
    /** look/want: ID predmeta u koji lik gleda; know: ID deteta koje zna (`hero`) */
    target: string;
    /** Kartice, redom na ekranu (ID-jevi predmeta ili, u „know”, likova) */
    choices: string[];
    /** Samo „know”: na kojoj strani slike stoji `hero` */
    heroSide: "left" | "right";
}

/** Mesta za dati broj predmeta: uvek bar jedan levo i jedan desno */
function slotsFor(count: number, shuffle: <T>(list: readonly T[]) => T[]): SlotId[] {
    if (count >= 4) return [...SLOTS];
    const left = shuffle<SlotId>(["left", "upLeft"]);
    const right = shuffle<SlotId>(["right", "upRight"]);
    if (count <= 2) return [left[0], right[0]];
    return shuffle([left[0], right[0], shuffle([left[1], right[1]])[0]]);
}

/**
 * Zadaci jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random, testovi stalan niz).
 * `maxChoices` i `maxRounds` dolaze iz podešavanja uzrasta; `childName` služi da lik ne nosi
 * ime deteta. Lik se menja iz zadatka u zadatak, a mesto traženog predmeta se ravnomerno
 * smenjuje levo–desno (dete ne može da pogađa po strani).
 */
export function buildGazeLevel(
    level: number,
    { maxChoices, maxRounds, childName, random = Math.random }: { maxChoices: number; maxRounds: number; childName?: string; random?: () => number }
): GazeRound[] {
    const rule = gazeRule(level);
    const roundCount = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const limit = Math.max(2, Number.isFinite(maxChoices) ? maxChoices : 4);
    const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
    const shuffle = <T,>(list: readonly T[]): T[] => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const cast = gazeCast(childName);

    // Strana traženog predmeta: pola levo, pola desno, izmešano
    const sides = shuffle(Array.from({ length: roundCount }, (_, i) => (i % 2 === 0 ? "left" : "right") as "left" | "right"));
    const rounds: GazeRound[] = [];
    let lastHero: GazeCharacterId | null = null;
    let lastTarget: string | null = null;
    for (let i = 0; i < roundCount; i += 1) {
        const task = rule.tasks[i % rule.tasks.length];
        const heroes = cast.filter((character) => character.id !== lastHero);
        const hero = pick(heroes).id;
        lastHero = hero;
        const side = sides[i];

        if (task.kind === "know") {
            const other = pick(cast.filter((character) => character.id !== hero)).id;
            const far = pick(FAR_OBJECTS);
            rounds.push({
                kind: "know",
                cue: task.cue,
                hero,
                other,
                objects: [{ id: far.id, slot: side === "left" ? "upRight" : "upLeft" }],
                target: hero,
                choices: shuffle([hero, other]),
                heroSide: side,
            });
            continue;
        }

        const count = Math.min(task.objects, limit);
        const pool = GAZE_OBJECTS.filter((object) => task.kind === "look" || object.wanted);
        const items = shuffle(pool.filter((object) => object.id !== lastTarget)).slice(0, count);
        const slots = slotsFor(count, shuffle);
        // Traženi predmet ide na mesto sa izabrane strane
        const targetSlot = pick(slots.filter((slot) => slotSide(slot) === side));
        const otherSlots = slots.filter((slot) => slot !== targetSlot);
        const objects: PlacedObject[] = [{ id: items[0].id, slot: targetSlot }, ...items.slice(1).map((object, j) => ({ id: object.id, slot: otherSlots[j] }))];
        lastTarget = items[0].id;
        rounds.push({
            kind: task.kind,
            cue: task.cue,
            hero,
            other: "",
            objects,
            target: items[0].id,
            choices: shuffle(items.map((object) => object.id)),
            heroSide: "left",
        });
    }
    return rounds;
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

/** Pitanje zadatka */
export function gazeQuestion(round: Pick<GazeView, "kind" | "hero">): string {
    const name = getGazeCharacter(round.hero)?.name ?? "";
    if (round.kind === "know") return "Ko zna šta je u kutiji?";
    if (round.kind === "want") return `Šta ${name} želi?`;
    return `Šta gleda ${name}?`;
}

/** Odgovor posle tačnog izbora: šta lik gleda i šta iz toga sledi */
export function gazeAnswer(round: Pick<GazeView, "kind" | "hero" | "target">): string {
    const name = getGazeCharacter(round.hero)?.name ?? "";
    if (round.kind === "know") return `${name} gleda u kutiju. ${name} zna šta je u kutiji.`;
    const object = getGazeObject(round.target);
    if (!object) return "";
    if (round.kind === "want") return `${name} gleda ${object.acc}. ${name} želi ${object.acc}.`;
    return `${name} gleda ${object.acc}.`;
}

/**
 * Posle pogrešne kartice: šta je izabrano i kako da nađe odgovor — gledanjem lika na slici
 * (nikad gde da dodirne). Uz pomoć: „Prati tačkice od očiju.”
 */
export function gazeWrong(round: Pick<GazeView, "kind" | "hero" | "objects">, picked: string, hint: boolean): string {
    const name = getGazeCharacter(round.hero)?.name ?? "";
    const how = hint ? "Prati tačkice od očiju." : round.kind === "know" ? "Pogledaj koje dete gleda u kutiju." : `Pogledaj kuda ${name} gleda.`;
    if (round.kind === "know") {
        const other = getGazeCharacter(picked)?.name ?? "";
        const far = getGazeObject(round.objects[0]?.id);
        return `Netačno. ${other} gleda ${far?.acc ?? "gore"}. ${how}`;
    }
    const object = getGazeObject(picked);
    return `Netačno. ${object ? `${itIs(object)} ` : ""}${how}`;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface GazeView extends BaseView, Omit<GazeRound, "kind" | "cue" | "hero"> {
    kind: GazeKind;
    cue: GazeCue;
    hero: GazeCharacterId | "";
    /** Kartice probane pogrešno u ovom zadatku */
    wrong: string[];
    /** Poslednja dodirnuta kartica dok traje povratna poruka */
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
}

export function emptyGazeView(totalRounds: number): GazeView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "look",
        cue: "head",
        hero: "",
        other: "",
        objects: [],
        target: "",
        choices: [],
        heroSide: "left",
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

/** Polja zadatka iz plana, za stanje igre */
export function roundFields(round: GazeRound): Pick<GazeView, "kind" | "cue" | "hero" | "other" | "objects" | "target" | "choices" | "heroSide"> {
    return { kind: round.kind, cue: round.cue, hero: round.hero, other: round.other, objects: round.objects, target: round.target, choices: round.choices, heroSide: round.heroSide };
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeGazeMonitor(state: Partial<GazeView> | null | undefined): GazeView {
    const base = emptyGazeView(1);
    if (!state) return base;
    const kind: GazeKind = KINDS.includes(state.kind as GazeKind) ? (state.kind as GazeKind) : "look";
    const cue: GazeCue = CUES.includes(state.cue as GazeCue) ? (state.cue as GazeCue) : "head";
    const hero = getGazeCharacter(state.hero);
    const other = kind === "know" ? getGazeCharacter(state.other) : undefined;
    const seen = new Set<string>();
    const usedSlots = new Set<SlotId>();
    const objects: PlacedObject[] = [];
    for (const item of Array.isArray(state.objects) ? state.objects : []) {
        if (!item || typeof item !== "object") continue;
        const object = getGazeObject(item.id);
        if (!object || !isSlot(item.slot) || seen.has(object.id) || usedSlots.has(item.slot)) continue;
        seen.add(object.id);
        usedSlots.add(item.slot);
        objects.push({ id: object.id, slot: item.slot });
    }
    // Kartice: u „know” deca sa slike, inače predmeti sa slike
    const allowed = kind === "know" ? [hero?.id, other?.id].filter((id): id is GazeCharacterId => id !== undefined) : objects.map((object) => object.id);
    const choices = Array.isArray(state.choices) ? Array.from(new Set(state.choices.filter((id): id is string => typeof id === "string" && allowed.includes(id as never)))) : [];
    const target = typeof state.target === "string" ? state.target : "";
    const valid =
        hero !== undefined &&
        choices.includes(target) &&
        choices.length >= 2 &&
        (kind === "know" ? other !== undefined && other.id !== hero.id && target === hero.id && objects.length === 1 : choices.length === objects.length);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind: valid ? kind : "look",
        cue: valid ? cue : "head",
        hero: valid ? hero.id : "",
        other: valid && other ? other.id : "",
        objects: valid ? objects : [],
        target: valid ? target : "",
        choices: valid ? choices : [],
        heroSide: state.heroSide === "right" ? "right" : "left",
        wrong: valid && Array.isArray(state.wrong) ? state.wrong.filter((id) => choices.includes(id) && id !== target) : [],
        picked: valid ? (choices.find((id) => id === state.picked) ?? null) : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
    };
}
