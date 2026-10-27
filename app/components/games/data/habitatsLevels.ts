// Sadržaj igre „Ko gde živi?”: životinje i njihova staništa (farma, šuma, more, led i sneg,
// džungla, savana) i domovi (gnezdo, košnica, kućica za psa…). Dete smešta životinje tamo gde
// žive, traži ko ne pripada i pogađa zagonetke („Imam crno-belo perje. Ne letim, ali plivam.”).
// Bez Reacta, da bi se nivoi proveravali u testovima; crteži su u games/habitats/.
//
// Zašto ovako (uzrast 3–8, i deca sa autizmom):
//  • Životinje su najomiljenija tema male dece (i čest „poseban interes” dece sa autizmom), a
//    razvrstavanje po mestu gde žive je prvo naučno razvrstavanje (kategorije, „svet oko nas”).
//  • Staništa su nacrtana kao prepoznatljivi prizori (talasi, jelke, led, lijane, žuta trava),
//    uvek istim bojama, pa dete mesto prepoznaje i pre nego što čuje reč (vizuelna podrška).
//  • Učenje bez greške: prvo dva mesta koja se jasno razlikuju (farma i more), dva izbora, ruka
//    pokazuje prvi zadatak (i prvi zadatak nove vrste igre), pomoć stiže posle prve greške.
//  • Podrška se povlači postepeno: dva staništa → tri → šest; „gde živi” → „ko živi” →
//    razvrstavanje → domovi → „ko ne živi ovde” → zagonetke sa tragovima (zaključivanje).
//  • Tačnost: lav, žirafa, slon i zebra žive u savani (a ne u džungli); pingvin i polarni medved
//    na ledu i snegu (polarni krajevi). Životinje koje žive na više mesta (zec, patka, kornjača)
//    nisu u igri, da odgovor uvek bude samo jedan.
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

// ── Staništa ─────────────────────────────────────────────────────────────────

export const HABITAT_IDS = ["farm", "forest", "sea", "polar", "jungle", "savanna"] as const;
export type HabitatId = (typeof HABITAT_IDS)[number];

export interface Habitat {
    id: HabitatId;
    /** Naziv na kartici */
    name: string;
    /** „na farmi”, „u moru” */
    at: string;
}

export const HABITATS: Readonly<Record<HabitatId, Habitat>> = {
    farm: { id: "farm", name: "farma", at: "na farmi" },
    forest: { id: "forest", name: "šuma", at: "u šumi" },
    sea: { id: "sea", name: "more", at: "u moru" },
    polar: { id: "polar", name: "led i sneg", at: "na ledu i snegu" },
    jungle: { id: "jungle", name: "džungla", at: "u džungli" },
    savanna: { id: "savanna", name: "savana", at: "u savani" },
};

// ── Životinje ─────────────────────────────────────────────────────────────────

export interface Animal {
    id: string;
    name: string;
    /** „p:…” / „a:…” (postojeće slike) ili crtež iz games/habitats/ */
    pic: string;
    home: HabitatId;
    /** Zagonetka: tri traga, poslednji je najjasniji (samo za neke životinje) */
    clues?: readonly [string, string, string];
}

const a = (id: string, name: string, pic: string, home: HabitatId, clues?: readonly [string, string, string]): Animal => ({ id, name, pic, home, ...(clues ? { clues } : {}) });

export const ANIMALS: readonly Animal[] = [
    // Farma
    a("cow", "krava", "p:cow", "farm", ["Kažem: mu.", "Dajem mleko.", "Pasem travu na farmi."]),
    a("sheep", "ovca", "p:sheep", "farm"),
    a("pig", "svinja", "p:pig", "farm"),
    a("hen", "kokoška", "a:chicken", "farm"),
    a("goat", "koza", "a:goat", "farm"),
    a("horse", "konj", "a:horse", "farm", ["Imam grivu i kopita.", "Vučem kola.", "Živim u štali na farmi."]),
    // Šuma
    a("bear", "medved", "a:bear", "forest", ["Imam gusto smeđe krzno.", "Zimi dugo spavam.", "Volim med i živim u šumi."]),
    a("hedgehog", "jež", "p:hedgehog", "forest"),
    a("squirrel", "veverica", "a:squirrel", "forest", ["Imam čupav rep.", "Skupljam lešnike.", "Skačem po granama u šumi."]),
    a("owl", "sova", "p:owl", "forest", ["Imam velike oči.", "Letim noću.", "Kažem: hu-hu."]),
    a("fox", "lisica", "fox", "forest"),
    // More
    a("whale", "kit", "p:whale", "sea", ["Ja sam najveća životinja.", "Izbacujem vodu kroz glavu.", "Živim u moru."]),
    a("dolphin", "delfin", "p:dolphin", "sea"),
    a("octopus", "hobotnica", "p:octopus", "sea", ["Imam osam krakova.", "Mogu da se sakrijem iza kamena.", "Plivam u moru."]),
    a("fish", "riba", "p:fish", "sea"),
    a("crab", "rak", "crab", "sea"),
    a("starfish", "morska zvezda", "starfish", "sea"),
    // Led i sneg
    a("penguin", "pingvin", "a:penguin", "polar", ["Imam crno-belo perje.", "Ne letim, ali odlično plivam.", "Živim na ledu."]),
    a("polarBear", "polarni medved", "polarBear", "polar", ["Imam belo krzno.", "Lovim ribu kroz rupu u ledu.", "Živim na ledu i snegu."]),
    a("seal", "foka", "seal", "polar"),
    a("reindeer", "irvas", "p:reindeer", "polar"),
    // Džungla
    a("monkey", "majmun", "a:monkey", "jungle", ["Imam dugačak rep.", "Volim banane.", "Penjem se po drveću u džungli."]),
    a("parrot", "papagaj", "parrot", "jungle", ["Imam šareno perje.", "Mogu da ponovim reči.", "Letim kroz džunglu."]),
    a("tiger", "tigar", "tiger", "jungle"),
    a("snake", "zmija", "snake", "jungle"),
    // Savana
    a("lion", "lav", "p:lion", "savanna", ["Imam žuto krzno i jake šape.", "Glasno ričem.", "Lovim po savani."]),
    a("giraffe", "žirafa", "p:giraffe", "savanna", ["Imam dugačak vrat.", "Jedem lišće sa visokog drveća.", "Živim u savani."]),
    a("elephant", "slon", "p:elephant", "savanna"),
    a("zebra", "zebra", "zebra", "savanna", ["Imam crne i bele pruge.", "Ličim na konja.", "Živim u savani."]),
];

export function getAnimal(id: unknown): Animal | undefined {
    return ANIMALS.find((animal) => animal.id === id);
}

export function animalsOf(habitat: HabitatId): Animal[] {
    return ANIMALS.filter((animal) => animal.home === habitat);
}

// ── Domovi ────────────────────────────────────────────────────────────────────

export interface Home {
    id: string;
    name: string;
    pic: string;
    animal: { id: string; name: string; pic: string };
    /** „Ptica živi u gnezdu.” */
    say: string;
}

export const HOMES: readonly Home[] = [
    { id: "nest", name: "gnezdo", pic: "nest", animal: { id: "bird", name: "ptica", pic: "p:bird" }, say: "Ptica živi u gnezdu." },
    { id: "hive", name: "košnica", pic: "hive", animal: { id: "bee", name: "pčela", pic: "p:bee" }, say: "Pčela živi u košnici." },
    { id: "doghouse", name: "kućica za psa", pic: "doghouse", animal: { id: "dog", name: "pas", pic: "p:dog" }, say: "Pas spava u svojoj kućici." },
    { id: "barn", name: "štala", pic: "barn", animal: { id: "cowHome", name: "krava", pic: "p:cow" }, say: "Krava spava u štali." },
    { id: "web", name: "paukova mreža", pic: "web", animal: { id: "spider", name: "pauk", pic: "p:spider" }, say: "Pauk plete mrežu i živi u njoj." },
    { id: "aquarium", name: "akvarijum", pic: "aquarium", animal: { id: "goldfish", name: "zlatna ribica", pic: "p:fish" }, say: "Zlatna ribica živi u akvarijumu." },
];

/** Svi crteži igre (test proverava da svaki postoji) */
export function habitatPics(): string[] {
    return Array.from(new Set([...HABITAT_IDS.map((id) => `place:${id}`), ...ANIMALS.map((x) => x.pic), ...HOMES.flatMap((h) => [h.pic, h.animal.pic])]));
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 * where  — „Gde živi pingvin?” (životinja → stanište)
 * who    — „Ko živi u moru?” (stanište → životinja)
 * sort   — životinje u svoja staništa
 * home   — „Gde živi pčela?” (dom)
 * homes  — životinje do svojih domova (parovi)
 * odd    — „Ko ne živi u šumi?”
 * riddle — „Ko sam ja?” (tragovi)
 */
export type HabitatsKind = "where" | "who" | "sort" | "home" | "homes" | "odd" | "riddle";

export interface HabitatsLevel {
    kinds: readonly HabitatsKind[];
    habitats: readonly HabitatId[];
    rounds: number;
    choices: number;
    intro: boolean;
    earlyHint: boolean;
}

const lvl = (kinds: HabitatsKind[], habitats: HabitatId[], rounds: number, choices: number, extra: Partial<HabitatsLevel> = {}): HabitatsLevel => ({
    kinds,
    habitats,
    rounds,
    choices,
    intro: false,
    earlyHint: false,
    ...extra,
});

const THREE: HabitatId[] = ["farm", "forest", "sea"];
const FOUR: HabitatId[] = [...THREE, "polar"];
const ALL: HabitatId[] = [...HABITAT_IDS];

export const HABITATS_LEVELS: readonly HabitatsLevel[] = [
    // Lako: farma i more, pa šuma; dva izbora
    lvl(["where"], ["farm", "sea"], 4, 2, { earlyHint: true }),
    lvl(["sort"], ["farm", "sea"], 3, 4, { intro: true, earlyHint: true }),
    lvl(["who"], THREE, 5, 2, { earlyHint: true }),
    lvl(["where"], THREE, 5, 3, { earlyHint: true }),
    lvl(["sort"], THREE, 3, 4, { earlyHint: true }),
    // Srednje: led i sneg, domovi, tri staništa u razvrstavanju
    lvl(["where", "who"], FOUR, 5, 3),
    lvl(["home"], FOUR, 5, 3, { intro: true }),
    lvl(["sort"], FOUR, 3, 6),
    lvl(["who", "where"], ALL, 5, 3),
    lvl(["homes"], FOUR, 3, 3, { intro: true }),
    // Teško: džungla i savana, „ko ne živi ovde”, zagonetke
    lvl(["odd"], ALL, 5, 4, { intro: true }),
    lvl(["sort"], ["polar", "jungle", "savanna", "sea"], 3, 6),
    lvl(["riddle"], ALL, 5, 3, { intro: true }),
    lvl(["where", "odd"], ALL, 5, 4),
    lvl(["riddle", "odd", "sort", "homes", "who"], ALL, 6, 4),
];

export const HABITATS_MAX_LEVEL = HABITATS_LEVELS.length;

export function habitatsLevel(level: number): HabitatsLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), HABITATS_MAX_LEVEL);
    return HABITATS_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** „Krava živi na farmi.” */
export function livesSentence(animal: Animal): string {
    return `${cap(animal.name)} živi ${HABITATS[animal.home].at}.`;
}

export const habitatCard = (id: HabitatId): WorldCard => ({ id, pic: `place:${id}`, label: HABITATS[id].name });
const animalCard = (animal: Animal): WorldCard => ({ id: animal.id, pic: animal.pic, label: animal.name });

/** Plan nivoa: zadaci jedan za drugim. `random` daje [0, 1) (seme dvoboja ili Math.random). */
export function buildHabitatsLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): WorldRound[] {
    const rule = habitatsLevel(level);
    const { shuffle, pick } = randomTools(random);
    const count = roundCount(rule.rounds, maxRounds);
    const choices = choiceCount(rule.choices, maxChoices);
    const kinds = cycleThrough(rule.kinds, count, shuffle);
    const places = cycleThrough(rule.habitats, count, shuffle);
    const used = new Set<string>();
    const fresh = (list: readonly Animal[]): Animal => {
        const unused = list.filter((x) => !used.has(x.id));
        const chosen = pick(unused.length > 0 ? unused : list);
        used.add(chosen.id);
        return chosen;
    };
    const homes = cycleThrough(HOMES, count, shuffle, (h) => h.id);
    const riddles = cycleThrough(
        ANIMALS.filter((x) => x.clues && rule.habitats.includes(x.home)),
        count,
        shuffle,
        (x) => x.id
    );

    return kinds.map((kind, index): WorldRound => {
        const modeled = index === 0 && (level === 1 || rule.intro);
        const place = places[index];
        switch (kind) {
            case "where": {
                const animal = level === 1 && index === 0 ? getAnimal("cow")! : fresh(animalsOf(place));
                const others = shuffle(rule.habitats.filter((id) => id !== animal.home)).slice(0, choices - 1);
                return pickRound({
                    prompt: `Gde živi ${animal.name}?`,
                    why: livesSentence(animal),
                    modeled,
                    cue: animalCard(animal),
                    choices: shuffle([animal.home, ...others]).map(habitatCard),
                    answer: animal.home,
                    notes: Object.fromEntries(others.map((id) => [id, `${cap(animal.name)} ne živi ${HABITATS[id].at}.`])),
                });
            }
            case "who": {
                const animal = fresh(animalsOf(place));
                const rest = shuffle(rule.habitats.filter((id) => id !== place))
                    .slice(0, choices - 1)
                    .map((id) => fresh(animalsOf(id)));
                return pickRound({
                    prompt: `Ko živi ${HABITATS[place].at}?`,
                    why: livesSentence(animal),
                    modeled,
                    cue: habitatCard(place),
                    choices: shuffle([animal, ...rest]).map(animalCard),
                    answer: animal.id,
                    notes: Object.fromEntries(rest.map((x) => [x.id, livesSentence(x)])),
                });
            }
            case "odd": {
                const stranger = fresh(animalsOf(shuffle(rule.habitats.filter((id) => id !== place))[0]));
                const locals = shuffle(animalsOf(place)).slice(0, choices - 1);
                return pickRound({
                    prompt: `Ko ne živi ${HABITATS[place].at}?`,
                    why: `${livesSentence(stranger)} Ne živi ${HABITATS[place].at}.`,
                    modeled,
                    cue: habitatCard(place),
                    choices: shuffle([stranger, ...locals]).map(animalCard),
                    answer: stranger.id,
                    notes: Object.fromEntries(locals.map((x) => [x.id, livesSentence(x)])),
                });
            }
            case "riddle": {
                const animal = riddles[index];
                const rest = shuffle(ANIMALS.filter((x) => x.id !== animal.id && x.home !== animal.home && rule.habitats.includes(x.home))).slice(0, choices - 1);
                return {
                    ...pickRound({
                        prompt: "Ko sam ja?",
                        why: `Ja sam ${animal.name}. ${livesSentence(animal)}`,
                        modeled,
                        cue: null,
                        choices: shuffle([animal, ...rest]).map(animalCard),
                        answer: animal.id,
                        notes: Object.fromEntries(rest.map((x) => [x.id, livesSentence(x)])),
                    }),
                    clues: [...(animal.clues ?? [])],
                };
            }
            case "home": {
                const home = homes[index];
                const others = shuffle(HOMES.filter((h) => h.id !== home.id)).slice(0, choices - 1);
                return pickRound({
                    prompt: `Gde živi ${home.animal.name}?`,
                    why: home.say,
                    modeled,
                    cue: { id: home.animal.id, pic: home.animal.pic, label: home.animal.name },
                    choices: shuffle([home, ...others]).map((h) => ({ id: h.id, pic: h.pic, label: h.name })),
                    answer: home.id,
                    notes: Object.fromEntries(others.map((h) => [h.id, h.say])),
                });
            }
            case "homes": {
                const chosen = shuffle(HOMES).slice(0, Math.max(2, Math.min(choices, 3)));
                return {
                    kind: "sort",
                    prompt: "Svaka životinja ide u svoj dom.",
                    why: "Svi su kod kuće.",
                    modeled,
                    bins: chosen.map((h) => ({ id: h.id, pic: h.pic, label: h.name })),
                    items: shuffle(chosen.map((h) => ({ id: h.animal.id, pic: h.animal.pic, label: h.animal.name }))),
                    homes: Object.fromEntries(chosen.map((h) => [h.animal.id, h.id])),
                    says: Object.fromEntries(chosen.map((h) => [h.animal.id, h.say])),
                    notes: Object.fromEntries(chosen.map((h) => [h.animal.id, h.say])),
                } satisfies SortRound;
            }
            case "sort":
                return sortRound(rule, place, modeled, fresh, shuffle);
        }
    });
}

function pickRound(round: Pick<PickRound, "prompt" | "why" | "modeled" | "cue" | "choices" | "answer" | "notes">): PickRound {
    return { kind: "pick", cueWide: false, clues: [], style: "pic", ...round };
}

function sortRound(rule: HabitatsLevel, first: HabitatId, modeled: boolean, fresh: (list: readonly Animal[]) => Animal, shuffle: <T>(list: readonly T[]) => T[]): SortRound {
    // Dva staništa za četiri životinje, tri za šest
    const size = rule.choices >= 6 ? 3 : 2;
    const places = [first, ...shuffle(rule.habitats.filter((id) => id !== first))].slice(0, size);
    // Po dve različite životinje iz svakog staništa (prvo one koje još nisu bile)
    const animals = places.flatMap((id) => {
        const first = fresh(animalsOf(id));
        const second = fresh(animalsOf(id).filter((x) => x.id !== first.id));
        return [first, second];
    });
    return {
        kind: "sort",
        prompt: "Svaka životinja ide tamo gde živi.",
        why: "Sve životinje su kod kuće.",
        modeled,
        bins: places.map(habitatCard),
        items: shuffle(animals.map(animalCard)),
        homes: Object.fromEntries(animals.map((x) => [x.id, x.home])),
        says: Object.fromEntries(animals.map((x) => [x.id, livesSentence(x)])),
        notes: Object.fromEntries(animals.map((x) => [x.id, livesSentence(x)])),
    };
}
