// Sadržaj igre „Moje telo”: delovi lica i tela na velikom crtežu deteta (Amar ili Lejla), čula
// (očima gledamo, ušima slušamo…), šta nosimo na kom delu tela i koliko čega imamo. Bez Reacta,
// da bi se nivoi proveravali u testovima; crtež deteta i delovi su u games/body/.
//
// Zašto ovako (uzrast 3–7, i deca sa autizmom):
//  • Imenovanje delova tela je jedna od prvih reči deteta i osnova za brigu o sebi („Boli me
//    uvo.”), oblačenje i bezbednost. Deca sa autizmom ga često uče izričito, uz crtež i pokazivanje
//    (receptivni govor pre izgovaranja) — ovde dete pokazuje deo tela na crtežu.
//  • Prvo lice (oči, nos, usta, uši), pa krupni delovi tela (glava, ruke, noge, stomak), pa sitniji
//    (ramena, laktovi, kolena, šake, stopala) — kao u pesmi „Glava, ramena, kolena, prsti”.
//    „Ruke” i „šake” (i „noge” i „stopala”) nisu u istom nivou, da odgovor ne bude dvosmislen.
//  • Delovi koji se mogu izabrati su veći od samog crteža (lako se pogode malim prstom), a dodir
//    na deo koji nije u zadatku se ne računa kao greška.
//  • Učenje bez greške: ruka pokazuje prvi zadatak (i prvi zadatak nove vrste); na lakim nivoima
//    pomoć (deo zasvetli) stiže posle prve greške i posle čekanja.
//  • Podrška se povlači postepeno: ime dela → čulo („Čime mirišemo?”) → odeća („Gde nosimo
//    rukavice?”) → razvrstavanje po čulima → brojanje (dve ruke, pet prstiju).
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import {
    choiceCount,
    cycleThrough,
    randomTools,
    roundCount,
    type BuildOptions,
    type HeroId,
    type PickRound,
    type PointRound,
    type SortRound,
    type WorldCard,
    type WorldRound,
} from "@/app/components/games/world/worldPlay";

// ── Delovi tela ───────────────────────────────────────────────────────────────

export const FACE_PARTS = ["hair", "eyes", "ears", "nose", "mouth", "cheeks", "brows"] as const;
export const BODY_PARTS = ["head", "neck", "shoulders", "arms", "elbows", "hands", "belly", "legs", "knees", "feet"] as const;
export type FacePart = (typeof FACE_PARTS)[number];
export type BodyPart = (typeof BODY_PARTS)[number];
export type PartId = FacePart | BodyPart;

export interface Part {
    id: PartId;
    figure: "face" | "body";
    /** Naziv (kao što se kaže: „oči”, „nos”) */
    name: string;
    /** Množina („Gde su oči?”) ili jednina („Gde je nos?”) */
    plural: boolean;
}

const part = (id: PartId, figure: "face" | "body", name: string, plural: boolean): Part => ({ id, figure, name, plural });

export const PARTS: Readonly<Record<PartId, Part>> = {
    hair: part("hair", "face", "kosa", false),
    eyes: part("eyes", "face", "oči", true),
    ears: part("ears", "face", "uši", true),
    nose: part("nose", "face", "nos", false),
    mouth: part("mouth", "face", "usta", true),
    cheeks: part("cheeks", "face", "obrazi", true),
    brows: part("brows", "face", "obrve", true),
    head: part("head", "body", "glava", false),
    neck: part("neck", "body", "vrat", false),
    shoulders: part("shoulders", "body", "ramena", true),
    arms: part("arms", "body", "ruke", true),
    elbows: part("elbows", "body", "laktovi", true),
    hands: part("hands", "body", "šake", true),
    belly: part("belly", "body", "stomak", false),
    legs: part("legs", "body", "noge", true),
    knees: part("knees", "body", "kolena", true),
    feet: part("feet", "body", "stopala", true),
};

/** „Gde je nos?” / „Gde su oči?” */
export function whereQuestion(id: PartId): string {
    const p = PARTS[id];
    return `Gde ${p.plural ? "su" : "je"} ${p.name}?`;
}

/** „To je nos.” / „To su oči.” */
export function thisIs(id: PartId): string {
    const p = PARTS[id];
    return `To ${p.plural ? "su" : "je"} ${p.name}.`;
}

/** Delovi koji su zajedno u nivou (ruke i šake nikad zajedno; noge i stopala ili kolena takođe) */
export const FACE_EASY: readonly PartId[] = ["eyes", "nose", "mouth", "ears"];
export const FACE_ALL: readonly PartId[] = ["hair", "eyes", "ears", "nose", "mouth"];
export const FACE_HARD: readonly PartId[] = ["hair", "brows", "eyes", "ears", "nose", "cheeks", "mouth"];
export const BODY_EASY: readonly PartId[] = ["head", "arms", "belly", "legs"];
export const BODY_MIDDLE: readonly PartId[] = ["head", "neck", "arms", "belly", "legs"];
export const BODY_HARD: readonly PartId[] = ["head", "neck", "shoulders", "elbows", "hands", "belly", "knees", "feet"];

// ── Čula ──────────────────────────────────────────────────────────────────────

export const SENSE_IDS = ["see", "hear", "smell", "taste", "touch"] as const;
export type SenseId = (typeof SENSE_IDS)[number];

export interface Sense {
    id: SenseId;
    /** Deo tela na crtežu lica ili tela */
    part: PartId;
    figure: "face" | "body";
    /** „Čime gledamo?” */
    ask: string;
    /** „Očima gledamo.” */
    say: string;
    /** Slika čula (na korpi): oči, uvo, nos, jezik, šaka */
    pic: string;
    /** Glagol na korpi: „vidimo” */
    verb: string;
    /** Instrumental: „Šta radimo očima?” */
    with: string;
}

export const SENSES: Readonly<Record<SenseId, Sense>> = {
    see: { id: "see", part: "eyes", figure: "face", ask: "Čime gledamo?", say: "Očima gledamo.", pic: "p:eyes", verb: "vidimo", with: "očima" },
    hear: { id: "hear", part: "ears", figure: "face", ask: "Čime slušamo?", say: "Ušima slušamo.", pic: "p:ear", verb: "čujemo", with: "ušima" },
    smell: { id: "smell", part: "nose", figure: "face", ask: "Čime mirišemo cveće?", say: "Nosom mirišemo.", pic: "p:nose", verb: "mirišemo", with: "nosom" },
    taste: { id: "taste", part: "mouth", figure: "face", ask: "Čime kušamo hranu?", say: "Ustima i jezikom kušamo hranu.", pic: "p:tongue", verb: "kušamo", with: "jezikom" },
    touch: { id: "touch", part: "hands", figure: "body", ask: "Čime mazimo mače?", say: "Šakama mazimo i dodirujemo.", pic: "p:hand", verb: "dodirujemo", with: "šakama" },
};

/** Stvari koje najbolje upoznajemo jednim čulom */
export interface SenseThing {
    id: string;
    pic: string;
    name: string;
    sense: SenseId;
    /** „Zvono slušamo ušima.” */
    say: string;
}

const st = (id: string, pic: string, name: string, sense: SenseId, say: string): SenseThing => ({ id, pic, name, sense, say });

export const SENSE_THINGS: readonly SenseThing[] = [
    st("rainbow", "p:rainbow", "duga", "see", "Dugu gledamo očima."),
    st("tv", "p:tv", "crtani film", "see", "Crtani film gledamo očima."),
    st("book", "p:bookOpen", "slikovnica", "see", "Slike u slikovnici gledamo očima."),
    st("bell", "p:bell", "zvono", "hear", "Zvono slušamo ušima."),
    st("trumpet", "p:trumpet", "truba", "hear", "Trubu slušamo ušima."),
    st("drum", "p:drum", "bubanj", "hear", "Bubanj slušamo ušima."),
    st("flower", "p:flower", "cvet", "smell", "Cvet mirišemo nosom."),
    st("soap", "p:soap", "sapun", "smell", "Sapun lepo miriše. Mirišemo ga nosom."),
    st("iceCream", "p:iceCream", "sladoled", "taste", "Sladoled kušamo jezikom. Sladak je."),
    st("lemon", "p:lemon", "limun", "taste", "Limun kušamo jezikom. Kiseo je."),
    st("chocolate", "p:chocolate", "čokolada", "taste", "Čokoladu kušamo jezikom."),
    st("kitten", "p:kitten", "mače", "touch", "Mače mazimo šakom. Meko je."),
    st("teddy", "p:teddy", "meda", "touch", "Medu grlimo i dodirujemo. Mekan je."),
];

// ── Šta nosimo na kom delu tela ──────────────────────────────────────────────

export interface Wearable {
    id: string;
    pic: string;
    name: string;
    part: PartId;
    /** „Gde nosimo rukavice?” */
    ask: string;
    say: string;
}

export const WEARABLES: readonly Wearable[] = [
    { id: "gloves", pic: "p:gloves", name: "rukavice", part: "hands", ask: "Gde nosimo rukavice?", say: "Rukavice nosimo na šakama." },
    { id: "scarf", pic: "p:scarf", name: "šal", part: "neck", ask: "Gde nosimo šal?", say: "Šal nosimo oko vrata." },
    { id: "cap", pic: "p:cap", name: "kapa", part: "head", ask: "Gde nosimo kapu?", say: "Kapu nosimo na glavi." },
    { id: "sock", pic: "p:sock", name: "čarapa", part: "feet", ask: "Gde nosimo čarape?", say: "Čarape nosimo na stopalima." },
    { id: "sneakers", pic: "p:sneakers", name: "patike", part: "feet", ask: "Gde nosimo patike?", say: "Patike nosimo na stopalima." },
    { id: "glasses", pic: "p:glasses", name: "naočare", part: "eyes", ask: "Za šta su naočare?", say: "Naočare nosimo ispred očiju." },
    { id: "earmuffs", pic: "earmuffs", name: "štitnici za uši", part: "ears", ask: "Šta greju štitnici za uši?", say: "Štitnici greju uši." },
    { id: "kneePads", pic: "kneePads", name: "štitnici za kolena", part: "knees", ask: "Gde nosimo štitnike kad vozimo rolere?", say: "Štitnike nosimo na kolenima." },
];

// ── Brojanje ──────────────────────────────────────────────────────────────────

export interface CountFact {
    id: string;
    pic: string;
    ask: string;
    answer: number;
    say: string;
}

export const COUNT_FACTS: readonly CountFact[] = [
    { id: "eyes", pic: "p:eyes", ask: "Koliko imamo očiju?", answer: 2, say: "Imamo dva oka." },
    { id: "nose", pic: "p:nose", ask: "Koliko imamo nosova?", answer: 1, say: "Imamo jedan nos." },
    { id: "ears", pic: "p:ear", ask: "Koliko imamo ušiju?", answer: 2, say: "Imamo dva uva." },
    { id: "fingers", pic: "p:hand", ask: "Koliko prstiju ima jedna šaka?", answer: 5, say: "Jedna šaka ima pet prstiju." },
    { id: "legs", pic: "p:leg", ask: "Koliko imamo nogu?", answer: 2, say: "Imamo dve noge." },
    { id: "mouth", pic: "p:mouth", ask: "Koliko imamo usta?", answer: 1, say: "Imamo jedna usta." },
    { id: "allFingers", pic: "p:hand", ask: "Koliko prstiju imaju obe šake zajedno?", answer: 10, say: "Pet i pet je deset prstiju." },
];

/** Svi crteži igre (test proverava da svaki postoji) */
export function bodyPics(): string[] {
    return Array.from(
        new Set([
            ...SENSE_IDS.map((id) => SENSES[id].pic),
            ...SENSE_THINGS.map((x) => x.pic),
            ...WEARABLES.map((x) => x.pic),
            ...COUNT_FACTS.map((x) => x.pic),
        ])
    );
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 * name    — „Gde je nos?” (deo na crtežu)
 * sense   — „Čime mirišemo cveće?” (deo na crtežu)
 * use     — „Šta radimo nosom?” (slike radnji)
 * wear    — „Gde nosimo rukavice?” (deo na crtežu)
 * sort    — stvari po čulima
 * count   — „Koliko imamo očiju?”
 */
export type BodyKind = "name" | "sense" | "use" | "wear" | "sort" | "count";

export interface BodyLevel {
    kinds: readonly BodyKind[];
    /** Delovi lica i tela koji se mogu izabrati (po crtežu) */
    face: readonly PartId[];
    body: readonly PartId[];
    /** Koji crtež(i) u zadacima „name” */
    figures: readonly ("face" | "body")[];
    senses: readonly SenseId[];
    rounds: number;
    choices: number;
    intro: boolean;
    earlyHint: boolean;
}

const lvl = (kinds: BodyKind[], rounds: number, choices: number, extra: Partial<BodyLevel> = {}): BodyLevel => ({
    kinds,
    face: FACE_ALL,
    body: BODY_MIDDLE,
    figures: ["face"],
    senses: ["see", "hear", "smell", "taste"],
    rounds,
    choices,
    intro: false,
    earlyHint: false,
    ...extra,
});

export const BODY_LEVELS: readonly BodyLevel[] = [
    // Lako: lice, pa krupni delovi tela; čula po jedan izbor od dva
    lvl(["name"], 5, 2, { face: FACE_EASY, earlyHint: true }),
    lvl(["name"], 5, 2, { face: FACE_ALL, earlyHint: true }),
    lvl(["name"], 5, 2, { body: BODY_EASY, figures: ["body"], earlyHint: true }),
    lvl(["use"], 5, 2, { intro: true, earlyHint: true }),
    lvl(["sense"], 5, 2, { face: FACE_ALL, earlyHint: true }),
    // Srednje: više delova, odeća, razvrstavanje po čulima
    lvl(["name"], 5, 3, { body: BODY_MIDDLE, figures: ["body", "face"] }),
    lvl(["wear"], 5, 3, { body: BODY_HARD, face: FACE_ALL }),
    lvl(["sort"], 3, 4, { senses: ["hear", "taste"], intro: true }),
    lvl(["name"], 5, 3, { body: BODY_HARD, figures: ["body"] }),
    lvl(["use", "sense"], 5, 3, { senses: [...SENSE_IDS], body: BODY_HARD }),
    // Teško: sitni delovi, tri čula u razvrstavanju, brojanje
    lvl(["sort"], 3, 6, { senses: ["see", "hear", "taste"] }),
    lvl(["count"], 5, 3, { intro: true }),
    lvl(["name"], 6, 3, { face: FACE_HARD, figures: ["face", "body"], body: BODY_HARD }),
    lvl(["wear", "sense", "count"], 6, 4, { senses: [...SENSE_IDS], body: BODY_HARD, face: FACE_HARD }),
    lvl(["name", "sort", "use", "wear", "count"], 6, 4, { senses: [...SENSE_IDS], face: FACE_HARD, body: BODY_HARD, figures: ["face", "body"] }),
];

export const BODY_MAX_LEVEL = BODY_LEVELS.length;

export function bodyLevel(level: number): BodyLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), BODY_MAX_LEVEL);
    return BODY_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

const NUMBER_WORDS: Record<number, string> = { 1: "jedan", 2: "dva", 5: "pet", 10: "deset" };

/** Plan nivoa: zadaci jedan za drugim. `random` daje [0, 1) (seme dvoboja ili Math.random). */
export function buildBodyLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): WorldRound[] {
    const rule = bodyLevel(level);
    const { shuffle, pick } = randomTools(random);
    const count = roundCount(rule.rounds, maxRounds);
    const choices = choiceCount(rule.choices, maxChoices);
    const kinds = cycleThrough(rule.kinds, count, shuffle);
    const firstHero: HeroId = random() < 0.5 ? "amar" : "lejla";
    const heroAt = (index: number): HeroId => (index % 2 === 0 ? firstHero : firstHero === "amar" ? "lejla" : "amar");
    const figures = cycleThrough(rule.figures, count, shuffle);
    const faceParts = cycleThrough(rule.face, count, shuffle);
    const bodyParts = cycleThrough(rule.body, count, shuffle);
    // Pokazni zadatak prvog nivoa: nos (u sredini lica, najlakše se pogodi)
    if (level === 1) faceParts[0] = "nose";
    const senses = cycleThrough(rule.senses, count, shuffle);
    const wearables = cycleThrough(
        WEARABLES.filter((w) => rule.face.includes(w.part) || rule.body.includes(w.part)),
        count,
        shuffle,
        (w) => w.id
    );
    const facts = cycleThrough(COUNT_FACTS, count, shuffle, (f) => f.id);

    /** Zadatak na crtežu: svi delovi tog crteža iz nivoa, tačan je `answer` */
    const point = (figure: "face" | "body", answer: PartId, prompt: string, why: string, modeled: boolean, hero: HeroId, cue: WorldCard | null = null): PointRound => {
        const parts = figure === "face" ? rule.face : rule.body;
        return {
            kind: "point",
            prompt,
            why,
            modeled,
            figure,
            hero,
            parts: [...parts],
            answer,
            cue,
            notes: Object.fromEntries(parts.filter((id) => id !== answer).map((id) => [id, thisIs(id)])),
        };
    };

    return kinds.map((kind, index): WorldRound => {
        const modeled = index === 0 && (level === 1 || rule.intro);
        const hero = heroAt(index);
        switch (kind) {
            case "name": {
                const figure = figures[index];
                const answer = figure === "face" ? faceParts[index] : bodyParts[index];
                return point(figure, answer, whereQuestion(answer), `${thisIs(answer)}`, modeled, hero);
            }
            case "sense": {
                const sense = SENSES[senses[index]];
                const figure = sense.figure;
                // Čulo dodira je na crtežu tela, ali samo kad nivo ima šake (inače usta)
                const fallback = figure === "body" && !rule.body.includes(sense.part) ? SENSES.taste : sense;
                return point(fallback.figure, fallback.part, fallback.ask, fallback.say, modeled, hero);
            }
            case "wear": {
                const wearable = wearables[index];
                const figure = PARTS[wearable.part].figure;
                return point(figure, wearable.part, wearable.ask, wearable.say, modeled, hero, { id: wearable.id, pic: wearable.pic, label: wearable.name });
            }
            case "use": {
                const sense = SENSES[senses[index]];
                const target = pick(SENSE_THINGS.filter((x) => x.sense === sense.id));
                const others = shuffle(rule.senses.filter((id) => id !== sense.id))
                    .slice(0, choices - 1)
                    .map((id) => pick(SENSE_THINGS.filter((x) => x.sense === id)));
                const card = (x: SenseThing): WorldCard => ({ id: x.id, pic: x.pic, label: x.name });
                const partName = sense.id === "taste" ? "jezik" : PARTS[sense.part].name;
                return {
                    kind: "pick",
                    prompt: `Šta radimo ${sense.with}?`,
                    why: target.say,
                    modeled,
                    cue: { id: sense.id, pic: sense.pic, label: partName },
                    cueWide: false,
                    clues: [],
                    choices: shuffle([target, ...others]).map(card),
                    style: "pic",
                    answer: target.id,
                    notes: Object.fromEntries(others.map((x) => [x.id, x.say])),
                } satisfies PickRound;
            }
            case "count": {
                const fact = facts[index];
                const pool = [1, 2, 5, 10].filter((n) => n !== fact.answer);
                const offered = [fact.answer, ...shuffle(pool).slice(0, choices - 1)].sort((x, y) => x - y);
                return {
                    kind: "pick",
                    prompt: fact.ask,
                    why: fact.say,
                    modeled,
                    cue: { id: fact.id, pic: fact.pic, label: "" },
                    cueWide: false,
                    clues: [],
                    choices: offered.map((n) => ({ id: `n${n}`, pic: `n${n}`, label: String(n) })),
                    style: "number",
                    answer: `n${fact.answer}`,
                    notes: Object.fromEntries(offered.filter((n) => n !== fact.answer).map((n) => [`n${n}`, `Nije ${NUMBER_WORDS[n] ?? n}. Prebrojmo zajedno.`])),
                } satisfies PickRound;
            }
            case "sort":
                return sortRound(rule, modeled, shuffle);
        }
    });
}

function sortRound(rule: BodyLevel, modeled: boolean, shuffle: <T>(list: readonly T[]) => T[]): SortRound {
    const senses = rule.senses.slice(0, rule.choices >= 6 ? 3 : 2);
    const things = senses.flatMap((id) => shuffle(SENSE_THINGS.filter((x) => x.sense === id)).slice(0, 2));
    return {
        kind: "sort",
        prompt: "Čime to upoznajemo? Svaka slika ide svom čulu.",
        why: "Sve je na svom mestu.",
        modeled,
        bins: senses.map((id) => ({ id, pic: SENSES[id].pic, label: SENSES[id].verb })),
        items: shuffle(things.map((x) => ({ id: x.id, pic: x.pic, label: x.name }))),
        homes: Object.fromEntries(things.map((x) => [x.id, x.sense])),
        says: Object.fromEntries(things.map((x) => [x.id, x.say])),
        notes: Object.fromEntries(things.map((x) => [x.id, x.say])),
    };
}

