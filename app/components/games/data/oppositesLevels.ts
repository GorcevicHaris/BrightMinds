// Sadržaj igre „Suprotnosti”: veliko i malo, puno i prazno, dan i noć… Dete prvo prepoznaje
// jednu stranu para na istom predmetu („Koja lopta je velika?”), pa traži suprotnost, razvrstava
// slike na dve strane, spaja parove i na kraju misli samo rečima („Šta je suprotno od reči
// tvrdo?”). Bez Reacta, da bi se nivoi proveravali u testovima; crteži su u games/opposites/.
//
// Zašto ovako (uzrast 3–7, i deca sa autizmom):
//  • Suprotnosti su osnovni pojmovi govora i mišljenja (veliko/malo, puno/prazno, gore/dole) i
//    deo predškolskog programa; deca ih najlakše uče u paru, kao dva kraja iste osobine.
//  • Pojam se uči na „minimalnom paru”: ista lopta velika i mala, ista čaša puna i prazna — razlikuje
//    se samo osobina o kojoj se priča, pa dete ne može da pogađa po predmetu (učenje pojmova
//    kroz primere i kontraprimere). Tek kasnije dolaze različiti predmeti (slon i miš).
//  • Učenje bez greške: prvi zadatak prvog nivoa pokazuje ruka (ne ocenjuje se), a i prvi zadatak
//    nivoa koji uvodi novu vrstu igre (razvrstavanje, parovi); na lakim nivoima su samo dva izbora
//    i pomoć (tačna slika zasvetli) stiže već posle prve greške i posle čekanja.
//  • Podrška se povlači postepeno: dva izbora → tri → četiri; daleki izbor → bliski (druga velika
//    stvar kad se traži nešto malo); slika → reč. Svaki odgovor ima mirno objašnjenje
//    („Kuća je velika. Tražimo nešto malo.”), a greška se nikad ne kažnjava.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import {
    choiceCount,
    cycleThrough,
    randomTools,
    roundCount,
    type BuildOptions,
    type PickRound,
    type SortRound,
    type WorldCard,
    type WorldRound,
} from "@/app/components/games/world/worldPlay";

// ── Pojmovi ──────────────────────────────────────────────────────────────────

export const CONCEPT_IDS = ["size", "full", "open", "temp", "day", "clean", "speed", "height", "length", "place", "weight", "hard", "mood", "taste"] as const;
export type ConceptId = (typeof CONCEPT_IDS)[number];

export interface Concept {
    id: ConceptId;
    /** Dve strane para (srednji rod, kao reč na kartici): „veliko” / „malo” */
    a: string;
    b: string;
    /** Kako se traži druga strana: „nešto malo”, „noć” */
    seekA: string;
    seekB: string;
    /** 1 lako · 2 srednje · 3 teško */
    tier: 1 | 2 | 3;
}

const concept = (id: ConceptId, a: string, b: string, tier: 1 | 2 | 3, seekA = `nešto ${a}`, seekB = `nešto ${b}`): Concept => ({ id, a, b, seekA, seekB, tier });

export const CONCEPTS: Readonly<Record<ConceptId, Concept>> = {
    size: concept("size", "veliko", "malo", 1),
    full: concept("full", "puno", "prazno", 1),
    open: concept("open", "otvoreno", "zatvoreno", 1),
    temp: concept("temp", "toplo", "hladno", 1),
    day: concept("day", "dan", "noć", 1, "dan", "noć"),
    clean: concept("clean", "čisto", "prljavo", 1),
    speed: concept("speed", "brzo", "sporo", 2, "nešto što ide brzo", "nešto što ide sporo"),
    height: concept("height", "visoko", "nisko", 2),
    length: concept("length", "dugačko", "kratko", 2),
    place: concept("place", "gore", "dole", 2, "nešto gore", "nešto dole"),
    weight: concept("weight", "teško", "lagano", 3),
    hard: concept("hard", "tvrdo", "meko", 3),
    mood: concept("mood", "veselo", "tužno", 3),
    taste: concept("taste", "slatko", "kiselo", 3),
};

// ── Primeri: ista stvar (ili dve stvari) na dva kraja osobine ────────────────

export interface Side {
    /** Crtež (games/opposites/OppositesArt) */
    pic: string;
    /** Rečenica o slici: „Lopta je velika.” */
    say: string;
    /** Pitanje kad se traži baš ova strana: „Koja lopta je velika?” */
    ask: string;
}

export interface Exemplar {
    id: string;
    concept: ConceptId;
    a: Side;
    b: Side;
    /** Ista stvar na obe slike (minimalni par) — za prvo prepoznavanje */
    same: boolean;
}

const ex = (id: string, c: ConceptId, a: Side, b: Side, same = true): Exemplar => ({ id, concept: c, a, b, same });
const side = (pic: string, say: string, ask: string): Side => ({ pic, say, ask });

export const EXEMPLARS: readonly Exemplar[] = [
    // Veliko i malo
    ex("ball", "size", side("ballBig", "Lopta je velika.", "Koja lopta je velika?"), side("ballSmall", "Lopta je mala.", "Koja lopta je mala?")),
    ex("teddy", "size", side("teddyBig", "Meda je veliki.", "Koji meda je veliki?"), side("teddySmall", "Meda je mali.", "Koji meda je mali?")),
    ex("house", "size", side("houseBig", "Kuća je velika.", "Koja kuća je velika?"), side("houseSmall", "Kuća je mala.", "Koja kuća je mala?")),
    ex("elephantMouse", "size", side("elephant", "Slon je veliki.", "Ko je veliki?"), side("mouse", "Miš je mali.", "Ko je mali?"), false),
    // Puno i prazno
    ex("glass", "full", side("glassFull", "Čaša je puna.", "Koja čaša je puna?"), side("glassEmpty", "Čaša je prazna.", "Koja čaša je prazna?")),
    ex("basket", "full", side("basketFull", "Korpa je puna.", "Koja korpa je puna?"), side("basketEmpty", "Korpa je prazna.", "Koja korpa je prazna?")),
    ex("plate", "full", side("plateFull", "Tanjir je pun.", "Koji tanjir je pun?"), side("plateEmpty", "Tanjir je prazan.", "Koji tanjir je prazan?")),
    // Otvoreno i zatvoreno
    ex("door", "open", side("doorOpen", "Vrata su otvorena.", "Koja vrata su otvorena?"), side("doorClosed", "Vrata su zatvorena.", "Koja vrata su zatvorena?")),
    ex("book", "open", side("bookOpen", "Knjiga je otvorena.", "Koja knjiga je otvorena?"), side("bookClosed", "Knjiga je zatvorena.", "Koja knjiga je zatvorena?")),
    ex("box", "open", side("boxOpen", "Kutija je otvorena.", "Koja kutija je otvorena?"), side("boxClosed", "Kutija je zatvorena.", "Koja kutija je zatvorena?")),
    // Toplo i hladno
    ex("teaIce", "temp", side("tea", "Čaj je topao.", "Šta je toplo?"), side("iceCream", "Sladoled je hladan.", "Šta je hladno?"), false),
    ex("soupIce", "temp", side("soup", "Supa je topla.", "Šta je toplo?"), side("iceCubes", "Led je hladan.", "Šta je hladno?"), false),
    ex("sunSnow", "temp", side("sunHot", "Sunce greje. Toplo je.", "Gde je toplo?"), side("snowman", "Sneško je od snega. Hladan je.", "Gde je hladno?"), false),
    // Dan i noć
    ex("window", "day", side("windowDay", "Napolju je dan.", "Gde je dan?"), side("windowNight", "Napolju je noć.", "Gde je noć?")),
    ex("sky", "day", side("skyDay", "Danju sija sunce.", "Gde je dan?"), side("skyNight", "Noću sija mesec.", "Gde je noć?")),
    ex("town", "day", side("townDay", "Dan je. Deca su u parku.", "Gde je dan?"), side("townNight", "Noć je. U kući gori svetlo.", "Gde je noć?")),
    // Čisto i prljavo
    ex("shirt", "clean", side("shirtClean", "Majica je čista.", "Koja majica je čista?"), side("shirtDirty", "Majica je prljava.", "Koja majica je prljava?")),
    ex("hand", "clean", side("handClean", "Ruka je čista.", "Koja ruka je čista?"), side("handDirty", "Ruka je prljava.", "Koja ruka je prljava?")),
    ex("dog", "clean", side("dogClean", "Kuca je čista.", "Koja kuca je čista?"), side("dogDirty", "Kuca je prljava.", "Koja kuca je prljava?")),
    // Brzo i sporo
    ex("rabbitSnail", "speed", side("rabbitFast", "Zec trči brzo.", "Ko ide brzo?"), side("snail", "Puž ide sporo.", "Ko ide sporo?"), false),
    ex("planeTurtle", "speed", side("planeFast", "Avion leti brzo.", "Šta ide brzo?"), side("turtle", "Kornjača ide sporo.", "Ko ide sporo?"), false),
    ex("carTractor", "speed", side("carFast", "Auto ide brzo.", "Šta ide brzo?"), side("tractor", "Traktor ide sporo.", "Šta ide sporo?"), false),
    // Visoko i nisko
    ex("tower", "height", side("towerTall", "Kula je visoka.", "Koja kula je visoka?"), side("towerShort", "Kula je niska.", "Koja kula je niska?")),
    ex("tree", "height", side("treeTall", "Drvo je visoko.", "Koje drvo je visoko?"), side("treeShort", "Drvo je nisko.", "Koje drvo je nisko?")),
    ex("giraffeHedgehog", "height", side("giraffe", "Žirafa je visoka.", "Ko je visok?"), side("hedgehog", "Jež je nizak.", "Ko je nizak?"), false),
    // Dugačko i kratko
    ex("pencil", "length", side("pencilLong", "Olovka je dugačka.", "Koja olovka je dugačka?"), side("pencilShort", "Olovka je kratka.", "Koja olovka je kratka?")),
    ex("caterpillar", "length", side("caterpillarLong", "Gusenica je dugačka.", "Koja gusenica je dugačka?"), side("caterpillarShort", "Gusenica je kratka.", "Koja gusenica je kratka?")),
    ex("train", "length", side("trainLong", "Voz je dugačak.", "Koji voz je dugačak?"), side("trainShort", "Voz je kratak.", "Koji voz je kratak?")),
    // Gore i dole
    ex("balloon", "place", side("balloonUp", "Balon je gore.", "Na kojoj slici je balon gore?"), side("balloonDown", "Balon je dole.", "Na kojoj slici je balon dole?")),
    ex("bird", "place", side("birdUp", "Ptica je gore, na grani.", "Na kojoj slici je ptica gore?"), side("birdDown", "Ptica je dole, na travi.", "Na kojoj slici je ptica dole?")),
    ex("kite", "place", side("kiteUp", "Zmaj je gore, na nebu.", "Na kojoj slici je zmaj gore?"), side("kiteDown", "Zmaj je dole, na travi.", "Na kojoj slici je zmaj dole?")),
    // Teško i lagano
    ex("stoneFeather", "weight", side("stone", "Kamen je težak.", "Šta je teško?"), side("feather", "Pero je lagano.", "Šta je lagano?"), false),
    ex("elephantButterfly", "weight", side("elephantHeavy", "Slon je težak.", "Ko je težak?"), side("butterfly", "Leptir je lagan.", "Ko je lagan?"), false),
    ex("melonBalloon", "weight", side("watermelon", "Lubenica je teška.", "Šta je teško?"), side("balloonLight", "Balon je lagan.", "Šta je lagano?"), false),
    // Tvrdo i meko
    ex("stonePillow", "hard", side("stoneHard", "Kamen je tvrd.", "Šta je tvrdo?"), side("pillow", "Jastuk je mek.", "Šta je meko?"), false),
    ex("hammerTeddy", "hard", side("hammer", "Čekić je tvrd.", "Šta je tvrdo?"), side("teddySoft", "Meda je mek.", "Šta je meko?"), false),
    ex("keyScarf", "hard", side("key", "Ključ je tvrd.", "Šta je tvrdo?"), side("scarf", "Šal je mek.", "Šta je meko?"), false),
    // Veselo i tužno
    ex("face", "mood", side("faceHappy", "Lice je veselo.", "Koje lice je veselo?"), side("faceSad", "Lice je tužno.", "Koje lice je tužno?")),
    ex("amar", "mood", side("amarHappy", "Amar je veseo.", "Na kojoj slici je Amar veseo?"), side("amarSad", "Amar je tužan.", "Na kojoj slici je Amar tužan?")),
    ex("lejla", "mood", side("lejlaHappy", "Lejla je vesela.", "Na kojoj slici je Lejla vesela?"), side("lejlaSad", "Lejla je tužna.", "Na kojoj slici je Lejla tužna?")),
    // Slatko i kiselo
    ex("cakeLemon", "taste", side("cupcake", "Kolač je sladak.", "Šta je slatko?"), side("lemon", "Limun je kiseo.", "Šta je kiselo?"), false),
    ex("honeyLemon", "taste", side("honey", "Med je sladak.", "Šta je slatko?"), side("lemonSlice", "Limun je kiseo.", "Šta je kiselo?"), false),
    ex("bananaApple", "taste", side("banana", "Banana je slatka.", "Šta je slatko?"), side("appleGreen", "Zelena jabuka je kisela.", "Šta je kiselo?"), false),
];

/**
 * Pojmovi iste „porodice” (veličina, visina, dužina, težina) nisu jedan drugom daleki izbor:
 * mali jež bi bio i „nešto malo” kad se traži suprotno od velike lopte.
 */
const DIMENSION: readonly ConceptId[] = ["size", "height", "length", "weight"];
export function familyOf(c: ConceptId): string {
    return DIMENSION.includes(c) ? "dimension" : c;
}

export function exemplarsOf(c: ConceptId): Exemplar[] {
    return EXEMPLARS.filter((item) => item.concept === c);
}

export function getExemplar(id: unknown): Exemplar | undefined {
    return EXEMPLARS.find((item) => item.id === id);
}

/** Svi crteži koje igra koristi (test proverava da svaki postoji) */
export function oppositePics(): string[] {
    return Array.from(new Set(EXEMPLARS.flatMap((item) => [item.a.pic, item.b.pic])));
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 * identify — „Koja lopta je velika?” (ista stvar, dve slike)
 * opposite — „Lopta je velika. Šta je suprotno?”
 * sort     — slike na dve strane (veliko | malo)
 * pairs    — svaka slika do svoje suprotnosti
 * word     — „Šta je suprotno od reči tvrdo?” (reči sa sličicom)
 */
export type OppositesKind = "identify" | "opposite" | "sort" | "pairs" | "word";

export interface OppositesLevel {
    kinds: readonly OppositesKind[];
    concepts: readonly ConceptId[];
    rounds: number;
    /** Broj izbora (pitanja) ili slika (razvrstavanje, parovi) */
    choices: number;
    /** Među izborima je i druga stvar sa istom stranom (kad se traži malo — nešto veliko) */
    near: boolean;
    /** Prvi zadatak nivoa pokazuje ruka (nova vrsta zadatka) */
    intro: boolean;
    earlyHint: boolean;
}

const EASY: ConceptId[] = ["size", "full", "open", "temp", "day", "clean"];
const MIDDLE: ConceptId[] = ["speed", "height", "length", "place"];
const HARD: ConceptId[] = ["weight", "hard", "mood", "taste"];
const ALL: ConceptId[] = [...EASY, ...MIDDLE, ...HARD];

const lvl = (kinds: OppositesKind[], concepts: ConceptId[], rounds: number, choices: number, extra: Partial<OppositesLevel> = {}): OppositesLevel => ({
    kinds,
    concepts,
    rounds,
    choices,
    near: false,
    intro: false,
    earlyHint: false,
    ...extra,
});

export const OPPOSITES_LEVELS: readonly OppositesLevel[] = [
    // Lako: prepoznavanje na istoj stvari, pa prva suprotnost i dve strane
    lvl(["identify"], ["size", "full", "open"], 5, 2, { earlyHint: true }),
    lvl(["identify"], EASY, 5, 2, { earlyHint: true }),
    lvl(["opposite"], ["size", "full", "open", "day"], 5, 2, { earlyHint: true }),
    lvl(["sort"], ["size", "full", "open"], 3, 4, { intro: true, earlyHint: true }),
    lvl(["opposite"], EASY, 5, 3, { earlyHint: true }),
    // Srednje: brzo, visoko, dugačko, gore — prvo prepoznavanje, pa bliski izbori i parovi
    lvl(["identify"], MIDDLE, 5, 2),
    lvl(["opposite"], [...EASY, ...MIDDLE], 5, 3, { near: true }),
    lvl(["sort"], MIDDLE, 3, 4),
    lvl(["pairs"], [...EASY, ...MIDDLE], 3, 3, { intro: true }),
    lvl(["opposite"], [...EASY, ...MIDDLE], 5, 4, { near: true }),
    // Teško: teško i lagano, tvrdo i meko…, više slika, pa samo reči
    lvl(["identify", "opposite"], HARD, 6, 3, { near: true }),
    lvl(["sort"], HARD, 4, 4),
    lvl(["pairs"], ALL, 3, 4),
    lvl(["word"], ALL, 5, 3, { intro: true }),
    lvl(["opposite", "pairs", "word", "sort"], ALL, 6, 4, { near: true }),
];

export const OPPOSITES_MAX_LEVEL = OPPOSITES_LEVELS.length;

export function oppositesLevel(level: number): OppositesLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), OPPOSITES_MAX_LEVEL);
    return OPPOSITES_LEVELS[safe - 1];
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function wordFor(c: ConceptId, which: "a" | "b"): string {
    return CONCEPTS[c][which];
}

/** „Veliko i malo su suprotnosti.” */
export function pairSentence(c: ConceptId): string {
    return `${cap(CONCEPTS[c].a)} i ${CONCEPTS[c].b} su suprotnosti.`;
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

type Which = "a" | "b";
const other = (which: Which): Which => (which === "a" ? "b" : "a");

function card(e: Exemplar, which: Which, label: string, quiet = true): WorldCard {
    return { id: `${e.id}.${which}`, pic: e[which].pic, label, ...(quiet ? { quiet: true } : {}) };
}

/** Plan nivoa: zadaci jedan za drugim. `random` daje [0, 1) (seme dvoboja ili Math.random). */
export function buildOppositesLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): WorldRound[] {
    const rule = oppositesLevel(level);
    const { shuffle, pick } = randomTools(random);
    const count = roundCount(rule.rounds, maxRounds);
    const choices = choiceCount(rule.choices, maxChoices);
    const kinds = cycleThrough(rule.kinds, count, shuffle);
    // Pojmovi redom, bez istog dvaput zaredom; prvi (pokazni) zadatak prvog nivoa je velika lopta
    const concepts = cycleThrough(rule.concepts, count, shuffle);
    if (level === 1) concepts[0] = "size";
    const pool = (c: ConceptId, sameOnly: boolean) => {
        const list = exemplarsOf(c);
        const same = list.filter((item) => item.same);
        return sameOnly && same.length > 0 ? same : list;
    };
    const used = new Set<string>();
    const fresh = (list: Exemplar[]): Exemplar => {
        const unused = list.filter((item) => !used.has(item.id));
        const chosen = pick(unused.length > 0 ? unused : list);
        used.add(chosen.id);
        return chosen;
    };

    return kinds.map((kind, index): WorldRound => {
        const modeled = index === 0 && (level === 1 || rule.intro);
        const c = concepts[index];
        if (kind === "identify") {
            const e = level === 1 && index === 0 ? EXEMPLARS[0] : fresh(pool(c, true));
            const which: Which = level === 1 && index === 0 ? "a" : random() < 0.5 ? "a" : "b";
            const target = card(e, which, wordFor(c, which));
            const rest = card(e, other(which), wordFor(c, other(which)));
            return {
                kind: "pick",
                prompt: e[which].ask,
                why: e[which].say,
                modeled,
                cue: null,
                cueWide: false,
                clues: [],
                choices: shuffle([target, rest]),
                style: "pic",
                answer: target.id,
                notes: { [rest.id]: e[other(which)].say },
            } satisfies PickRound;
        }
        if (kind === "opposite") return oppositeRound(c, rule, choices, modeled, fresh, pool, shuffle, random);
        if (kind === "word") return wordRound(c, rule, choices, modeled, shuffle, pick);
        if (kind === "sort") return sortRound(c, Math.min(rule.choices, 4), modeled, shuffle);
        return pairsRound(rule, choices, modeled, shuffle);
    });
}

function oppositeRound(
    c: ConceptId,
    rule: OppositesLevel,
    choices: number,
    modeled: boolean,
    fresh: (list: Exemplar[]) => Exemplar,
    pool: (c: ConceptId, sameOnly: boolean) => Exemplar[],
    shuffle: <T>(list: readonly T[]) => T[],
    random: () => number
): PickRound {
    const e = fresh(pool(c, false));
    const which: Which = random() < 0.5 ? "a" : "b";
    const want = other(which);
    const info = CONCEPTS[c];
    const cue = card(e, which, wordFor(c, which), false);
    const target = card(e, want, wordFor(c, want));
    const seek = want === "a" ? info.seekA : info.seekB;
    const notes: Record<string, string> = {};
    const distractors: WorldCard[] = [];
    // Bliski izbor: druga stvar sa ISTOM stranom kao slika pitanja (tražimo suprotno, ne isto)
    if (rule.near) {
        const near = shuffle(exemplarsOf(c).filter((item) => item.id !== e.id))[0];
        if (near) {
            const nearCard = card(near, which, wordFor(c, which));
            distractors.push(nearCard);
            notes[nearCard.id] = `${near[which].say} Tražimo ${seek}.`;
        }
    }
    // Daleki izbori: druge osobine (zatvorena knjiga, prljava majica…)
    const far = shuffle(EXEMPLARS.filter((item) => familyOf(item.concept) !== familyOf(c) && rule.concepts.includes(item.concept)));
    for (const item of far) {
        if (distractors.length >= choices - 1) break;
        if (distractors.some((d) => d.pic === item.a.pic || d.pic === item.b.pic)) continue;
        const s: Which = random() < 0.5 ? "a" : "b";
        const extra = card(item, s, wordFor(item.concept, s));
        distractors.push(extra);
        notes[extra.id] = `${item[s].say} Tražimo ${seek}.`;
    }
    return {
        kind: "pick",
        prompt: `${e[which].say} Šta je suprotno?`,
        why: `${e[want].say} ${pairSentence(c)}`,
        modeled,
        cue,
        cueWide: false,
        clues: [],
        choices: shuffle([target, ...distractors.slice(0, choices - 1)]),
        style: "pic",
        answer: target.id,
        notes,
    };
}

function wordRound(c: ConceptId, rule: OppositesLevel, choices: number, modeled: boolean, shuffle: <T>(list: readonly T[]) => T[], pick: <T>(list: readonly T[]) => T): PickRound {
    const e = pick(exemplarsOf(c));
    const which: Which = shuffle(["a", "b"] as Which[])[0];
    const want = other(which);
    const word = wordFor(c, which);
    const target: WorldCard = { id: `${c}.${want}`, pic: e[want].pic, label: wordFor(c, want) };
    const others = shuffle(rule.concepts.filter((id) => familyOf(id) !== familyOf(c))).slice(0, choices - 1);
    const distractors = others.map((id): WorldCard => {
        const s = shuffle(["a", "b"] as Which[])[0];
        return { id: `${id}.${s}`, pic: pick(exemplarsOf(id))[s].pic, label: wordFor(id, s) };
    });
    const notes = Object.fromEntries(distractors.map((d) => [d.id, `${cap(d.label)} i ${word} nisu suprotnosti.`]));
    return {
        kind: "pick",
        prompt: `Šta je suprotno od reči ${word}?`,
        why: `${pairSentence(c)} ${e.a.say} ${e.b.say}`,
        modeled,
        cue: { id: `${c}.${which}`, pic: e[which].pic, label: word },
        cueWide: false,
        clues: [],
        choices: shuffle([target, ...distractors]),
        style: "word",
        answer: target.id,
        notes,
    };
}

function sortRound(c: ConceptId, size: number, modeled: boolean, shuffle: <T>(list: readonly T[]) => T[]): SortRound {
    const info = CONCEPTS[c];
    // Prvi primer je slika na korpi; ostali su slike za razvrstavanje (po jedna sa svake strane)
    const [sample, ...rest] = shuffle(exemplarsOf(c));
    const binA: WorldCard = { id: `${c}.a`, pic: sample.a.pic, label: info.a };
    const binB: WorldCard = { id: `${c}.b`, pic: sample.b.pic, label: info.b };
    const sides = shuffle(rest.flatMap((item) => [{ e: item, s: "a" as Which }, { e: item, s: "b" as Which }]));
    // Uvek isto toliko sa obe strane
    const half = Math.max(1, Math.floor(Math.min(size, sides.length) / 2));
    const chosen = [...sides.filter((x) => x.s === "a").slice(0, half), ...sides.filter((x) => x.s === "b").slice(0, half)];
    const items = shuffle(chosen.map(({ e, s }) => card(e, s, wordFor(c, s))));
    const homes: Record<string, string> = {};
    const says: Record<string, string> = {};
    const notes: Record<string, string> = {};
    for (const { e, s } of chosen) {
        const id = `${e.id}.${s}`;
        homes[id] = s === "a" ? binA.id : binB.id;
        says[id] = e[s].say;
        notes[id] = `${e[s].say} Ide na stranu: ${wordFor(c, s)}.`;
    }
    return {
        kind: "sort",
        prompt: `${cap(info.a)} ili ${info.b}? Svaka slika na svoju stranu.`,
        why: `Sve je na svom mestu. ${pairSentence(c)}`,
        modeled,
        bins: [binA, binB],
        items,
        homes,
        says,
        notes,
    };
}

function pairsRound(rule: OppositesLevel, size: number, modeled: boolean, shuffle: <T>(list: readonly T[]) => T[]): SortRound {
    // Različiti pojmovi (i porodice), da svaki par ima samo jednu suprotnost
    const concepts: ConceptId[] = [];
    for (const c of shuffle(rule.concepts)) {
        if (concepts.length >= Math.max(2, size)) break;
        if (!concepts.some((taken) => familyOf(taken) === familyOf(c))) concepts.push(c);
    }
    const chosen = concepts.map((c) => shuffle(exemplarsOf(c))[0]);
    const bins: WorldCard[] = [];
    const items: WorldCard[] = [];
    const homes: Record<string, string> = {};
    const says: Record<string, string> = {};
    const notes: Record<string, string> = {};
    for (const e of chosen) {
        const which: Which = shuffle(["a", "b"] as Which[])[0];
        const want = other(which);
        const bin = card(e, which, wordFor(e.concept, which), false);
        const item = card(e, want, wordFor(e.concept, want));
        bins.push(bin);
        items.push(item);
        homes[item.id] = bin.id;
        says[item.id] = `${e[which].say} ${e[want].say}`;
        notes[item.id] = `${e[want].say} To nije suprotno od ove slike.`;
    }
    return {
        kind: "sort",
        prompt: "Svaka slika traži svoju suprotnost.",
        why: "Svi parovi su spojeni.",
        modeled,
        bins,
        items: shuffle(items),
        homes,
        says,
        notes,
    };
}
