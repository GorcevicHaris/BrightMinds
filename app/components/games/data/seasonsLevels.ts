// Sadržaj igre „Godišnja doba”: proleće, leto, jesen i zima (isto drvo u četiri doba), šta tada
// radimo i nosimo, redosled kroz godinu, delovi dana (jutro, podne, veče, noć) i meseci.
// Bez Reacta, da bi se nivoi proveravali u testovima; crteži su u games/seasons/.
//
// Zašto ovako (uzrast 4–9, i deca sa autizmom):
//  • Godišnja doba i delovi dana su osnova razumevanja vremena (redosled, ciklus, „posle”), a
//    deci sa autizmom predvidljiv godišnji i dnevni ritam (kalendar sa slikama) smanjuje
//    nesigurnost pred promenama — zato se uče uz slike koje se uvek isto crtaju.
//  • Godišnje doba je na karticama uvek isto drvo (cvet, puna krošnja, žuto lišće, sneg): dete
//    poredi samo ono što se menja (minimalni par), kao u igri „Suprotnosti”. Prizori u pitanju
//    su drugačiji (livada, more, park, brdo pod snegom), pa se doba prepoznaje, a ne precrtava.
//  • Učenje bez greške: prvo leto i zima (najveća razlika), dva izbora; ruka pokazuje prvi
//    zadatak i prvi zadatak nove vrste igre; pomoć posle prve greške na lakim nivoima.
//  • Podrška se povlači postepeno: dva doba → četiri; slika doba → stvar i radnja → razvrstavanje
//    → redosled (ciklus, „šta dolazi posle”) → delovi dana → meseci (školski uzrast).
//  • Meseci po godišnjim dobima kako ih deca uče u školi: proleće (mart, april, maj), leto (jun,
//    jul, avgust), jesen (septembar, oktobar, novembar), zima (decembar, januar, februar).
//    Stvari koje idu uz dva doba (kišobran, jakna, zmaj) nisu u igri — odgovor je uvek jedan.
//  • Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import {
    choiceCount,
    cycleThrough,
    randomTools,
    roundCount,
    type BuildOptions,
    type OrderRound,
    type PickRound,
    type SortRound,
    type WorldCard,
    type WorldRound,
} from "@/app/components/games/world/worldPlay";

// ── Godišnja doba ─────────────────────────────────────────────────────────────

export const SEASON_IDS = ["spring", "summer", "autumn", "winter"] as const;
export type SeasonId = (typeof SEASON_IDS)[number];

export interface Season {
    id: SeasonId;
    name: string;
    /** „u proleće”, „leti” */
    when: string;
    /** Posle (genitiv): „posle proleća” */
    after: string;
    /** Kratak opis prizora */
    looks: string;
    months: readonly [number, number, number];
}

export const SEASONS: Readonly<Record<SeasonId, Season>> = {
    spring: { id: "spring", name: "proleće", when: "u proleće", after: "proleća", looks: "Drveće cveta i ptice pevaju.", months: [3, 4, 5] },
    summer: { id: "summer", name: "leto", when: "leti", after: "leta", looks: "Toplo je i sunce jako sija.", months: [6, 7, 8] },
    autumn: { id: "autumn", name: "jesen", when: "u jesen", after: "jeseni", looks: "Lišće žuti i pada sa drveća.", months: [9, 10, 11] },
    winter: { id: "winter", name: "zima", when: "zimi", after: "zime", looks: "Hladno je i pada sneg.", months: [12, 1, 2] },
};

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function nextSeason(id: SeasonId): SeasonId {
    return SEASON_IDS[(SEASON_IDS.indexOf(id) + 1) % SEASON_IDS.length];
}

// ── Stvari i radnje po godišnjim dobima ───────────────────────────────────────

export interface SeasonThing {
    id: string;
    pic: string;
    name: string;
    season: SeasonId;
    /** „Kada pravimo sneška?” */
    ask: string;
    /** „Sneška pravimo zimi, kad pada sneg.” */
    why: string;
}

const t = (id: string, pic: string, name: string, season: SeasonId, ask: string, why: string): SeasonThing => ({ id, pic, name, season, ask, why });

export const THINGS: readonly SeasonThing[] = [
    // Proleće
    t("flower", "tulip", "cvet", "spring", "Kada procveta cveće?", "U proleće procveta cveće."),
    t("seedling", "seedling", "sadnica", "spring", "Kada sadimo biljke u bašti?", "U proleće sadimo biljke, da rastu preko leta."),
    t("nest", "nest", "gnezdo", "spring", "Kada ptice prave gnezda?", "U proleće ptice prave gnezda i izležu ptiće."),
    // Leto
    t("watermelon", "p:watermelon", "lubenica", "summer", "Kada jedemo lubenice?", "Lubenice zru leti."),
    t("sunHat", "p:sunHat", "šešir", "summer", "Kada nosimo šešir od sunca?", "Leti nosimo šešir, da nas sunce ne peče."),
    t("swimRing", "swimRing", "šlauf", "summer", "Kada se kupamo u moru?", "Leti se kupamo u moru i bazenu."),
    t("shorts", "p:shorts", "šorts", "summer", "Kada nosimo šorts?", "Leti je toplo, pa nosimo šorts."),
    // Jesen
    t("leaves", "leaves", "lišće", "autumn", "Kada lišće pada sa drveća?", "U jesen lišće žuti i pada."),
    t("chestnut", "chestnut", "kesten", "autumn", "Kada skupljamo kestenje?", "U jesen skupljamo kestenje."),
    t("grapes", "p:grapes", "grožđe", "autumn", "Kada beremo grožđe?", "Grožđe beremo u jesen."),
    t("mushroom", "p:mushroom", "pečurka", "autumn", "Kada u šumi niču pečurke?", "U jesen u šumi niču pečurke."),
    t("backpack", "p:backpack", "ranac", "autumn", "Kada počinje škola?", "Škola počinje u jesen, u septembru."),
    // Zima
    t("snowman", "p:snowman", "sneško", "winter", "Kada pravimo sneška?", "Sneška pravimo zimi, kad pada sneg."),
    t("sled", "sled", "sanke", "winter", "Kada se sankamo?", "Zimi se sankamo na snegu."),
    t("gloves", "p:gloves", "rukavice", "winter", "Kada nosimo rukavice?", "Zimi je hladno, pa nosimo rukavice."),
    t("snowflake", "p:snowflake", "pahulja", "winter", "Kada pada sneg?", "Sneg pada zimi."),
    t("ski", "p:ski", "skije", "winter", "Kada skijamo?", "Zimi skijamo na planini."),
];

export function thingsOf(season: SeasonId): SeasonThing[] {
    return THINGS.filter((thing) => thing.season === season);
}

// ── Delovi dana ───────────────────────────────────────────────────────────────

export const DAY_IDS = ["morning", "noon", "evening", "night"] as const;
export type DayId = (typeof DAY_IDS)[number];

export const DAY_PARTS: Readonly<Record<DayId, { name: string; when: string; looks: string }>> = {
    morning: { name: "jutro", when: "ujutru", looks: "Sunce izlazi." },
    noon: { name: "podne", when: "u podne", looks: "Sunce je najviše na nebu." },
    evening: { name: "veče", when: "uveče", looks: "Sunce zalazi." },
    night: { name: "noć", when: "noću", looks: "Sija mesec i vide se zvezde." },
};

export interface DayThing {
    id: string;
    pic: string;
    name: string;
    part: DayId;
    ask: string;
    why: string;
}

export const DAY_THINGS: readonly DayThing[] = [
    { id: "breakfast", pic: "breakfast", name: "doručak", part: "morning", ask: "Kada doručkujemo?", why: "Doručkujemo ujutru, kad ustanemo." },
    { id: "alarm", pic: "p:alarm", name: "budilnik", part: "morning", ask: "Kada zvoni budilnik i budimo se?", why: "Budimo se ujutru." },
    { id: "sunHigh", pic: "p:sunFace", name: "sunce", part: "noon", ask: "Kada je sunce najviše na nebu?", why: "U podne je sunce najviše na nebu." },
    { id: "dinner", pic: "dinner", name: "večera", part: "evening", ask: "Kada večeramo?", why: "Večeramo uveče, sa celom porodicom." },
    { id: "bed", pic: "p:bed", name: "krevet", part: "night", ask: "Kada spavamo?", why: "Noću spavamo." },
    { id: "stars", pic: "p:star", name: "zvezde", part: "night", ask: "Kada vidimo zvezde?", why: "Zvezde vidimo noću." },
];

// ── Meseci ────────────────────────────────────────────────────────────────────

export const MONTHS = ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"] as const;
/** Genitiv: „posle aprila” */
export const MONTHS_GEN = ["januara", "februara", "marta", "aprila", "maja", "juna", "jula", "avgusta", "septembra", "oktobra", "novembra", "decembra"] as const;

export function seasonOfMonth(month: number): SeasonId {
    return SEASON_IDS.find((id) => SEASONS[id].months.includes(month)) ?? "winter";
}

/** „jun, jul i avgust” */
function monthList(season: SeasonId): string {
    const [a, b, c] = SEASONS[season].months.map((m) => MONTHS[m - 1]);
    return `${a}, ${b} i ${c}`;
}

/** Svi crteži igre (test proverava da svaki postoji) */
export function seasonPics(): string[] {
    return Array.from(
        new Set([
            ...SEASON_IDS.flatMap((id) => [`season:${id}`, `scene:${id}`]),
            ...DAY_IDS.map((id) => `day:${id}`),
            ...THINGS.map((x) => x.pic),
            ...DAY_THINGS.map((x) => x.pic),
            ...MONTHS.map((_, i) => `month:${i + 1}`),
        ])
    );
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/**
 * season    — „Koje je godišnje doba na slici?”
 * when      — „Kada pravimo sneška?” (stvar → godišnje doba)
 * sort      — stvari u godišnja doba
 * cycle     — godišnja doba redom
 * next      — „Šta dolazi posle zime?”
 * day       — „Kada doručkujemo?” (delovi dana)
 * dayOrder  — jutro, podne, veče, noć redom
 * month     — „Kom godišnjem dobu pripada jul?”
 * monthNext — „Koji mesec dolazi posle aprila?”
 */
export type SeasonsKind = "season" | "when" | "sort" | "cycle" | "next" | "day" | "dayOrder" | "month" | "monthNext";

export interface SeasonsLevel {
    kinds: readonly SeasonsKind[];
    seasons: readonly SeasonId[];
    days: readonly DayId[];
    rounds: number;
    choices: number;
    /** Redosled: koliko prvih mesta je već popunjeno */
    given: number;
    intro: boolean;
    earlyHint: boolean;
}

const lvl = (kinds: SeasonsKind[], seasons: SeasonId[], rounds: number, choices: number, extra: Partial<SeasonsLevel> = {}): SeasonsLevel => ({
    kinds,
    seasons,
    days: [...DAY_IDS],
    rounds,
    choices,
    given: 0,
    intro: false,
    earlyHint: false,
    ...extra,
});

const ALL: SeasonId[] = [...SEASON_IDS];

export const SEASONS_LEVELS: readonly SeasonsLevel[] = [
    // Lako: leto i zima, pa sva četiri doba; jutro i noć
    lvl(["season"], ["summer", "winter"], 4, 2, { earlyHint: true }),
    lvl(["when"], ["summer", "winter"], 5, 2, { earlyHint: true }),
    lvl(["sort"], ["summer", "winter"], 3, 4, { intro: true, earlyHint: true }),
    lvl(["season"], ALL, 5, 3, { earlyHint: true }),
    lvl(["day"], ALL, 5, 2, { days: ["morning", "night"], earlyHint: true }),
    // Srednje: sva doba, redosled kroz godinu, delovi dana
    lvl(["when"], ALL, 5, 3),
    lvl(["cycle"], ALL, 3, 4, { given: 1, intro: true }),
    lvl(["sort"], ["spring", "summer", "autumn"], 3, 6),
    lvl(["next", "when"], ALL, 5, 3),
    lvl(["dayOrder", "day"], ALL, 4, 4, { given: 1 }),
    // Teško: meseci, četiri doba u razvrstavanju, redosled bez pomoći
    lvl(["month"], ALL, 5, 4, { intro: true }),
    lvl(["sort"], ALL, 3, 4),
    lvl(["monthNext", "month"], ALL, 5, 3),
    lvl(["cycle", "dayOrder", "next"], ALL, 4, 4),
    lvl(["month", "monthNext", "next", "when", "day"], ALL, 6, 4),
];

export const SEASONS_MAX_LEVEL = SEASONS_LEVELS.length;

export function seasonsLevel(level: number): SeasonsLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), SEASONS_MAX_LEVEL);
    return SEASONS_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

const seasonCard = (id: SeasonId): WorldCard => ({ id, pic: `season:${id}`, label: SEASONS[id].name });
const dayCard = (id: DayId): WorldCard => ({ id, pic: `day:${id}`, label: DAY_PARTS[id].name });
const monthCard = (m: number): WorldCard => ({ id: `m${m}`, pic: `month:${m}`, label: MONTHS[m - 1] });
const thingCard = (x: { id: string; pic: string; name: string }): WorldCard => ({ id: x.id, pic: x.pic, label: x.name });

/** Plan nivoa: zadaci jedan za drugim. `random` daje [0, 1) (seme dvoboja ili Math.random). */
export function buildSeasonsLevel(level: number, { maxRounds, maxChoices, random = Math.random }: BuildOptions): WorldRound[] {
    const rule = seasonsLevel(level);
    const { shuffle, pick } = randomTools(random);
    const count = roundCount(rule.rounds, maxRounds);
    const choices = choiceCount(rule.choices, maxChoices);
    const kinds = cycleThrough(rule.kinds, count, shuffle);
    const seasons = cycleThrough(rule.seasons, count, shuffle);
    // Pokazni zadatak prvog nivoa: zima (sneg je najjasniji znak)
    if (level === 1) seasons[0] = "winter";
    const used = new Set<string>();
    const freshThing = (season: SeasonId, except: readonly string[] = []): SeasonThing => {
        const list = thingsOf(season).filter((x) => !except.includes(x.id));
        const unused = list.filter((x) => !used.has(x.id));
        const chosen = pick(unused.length > 0 ? unused : list);
        used.add(chosen.id);
        return chosen;
    };
    const dayThings = cycleThrough(
        DAY_THINGS.filter((x) => rule.days.includes(x.part)),
        count,
        shuffle,
        (x) => x.id
    );
    const months = cycleThrough(
        Array.from({ length: 12 }, (_, i) => i + 1),
        count,
        shuffle
    );

    /** Druga godišnja doba za izbor */
    const otherSeasons = (season: SeasonId) => shuffle(rule.seasons.filter((id) => id !== season)).slice(0, choices - 1);

    return kinds.map((kind, index): WorldRound => {
        const modeled = index === 0 && (level === 1 || rule.intro);
        const season = seasons[index];
        switch (kind) {
            case "season": {
                const others = otherSeasons(season);
                return pickRound({
                    prompt: "Koje je godišnje doba na slici?",
                    why: `Ovo je ${SEASONS[season].name}. ${SEASONS[season].looks}`,
                    modeled,
                    cue: { id: `scene-${season}`, pic: `scene:${season}`, label: "" },
                    choices: shuffle([season, ...others]).map(seasonCard),
                    style: "word",
                    answer: season,
                    notes: Object.fromEntries(others.map((id) => [id, `Na slici nije ${SEASONS[id].name}. ${cap(SEASONS[id].when)}: ${SEASONS[id].looks.charAt(0).toLowerCase()}${SEASONS[id].looks.slice(1)}`])),
                });
            }
            case "when": {
                const thing = freshThing(season);
                const others = otherSeasons(season);
                return pickRound({
                    prompt: thing.ask,
                    why: thing.why,
                    modeled,
                    cue: thingCard(thing),
                    choices: shuffle([season, ...others]).map(seasonCard),
                    style: "word",
                    answer: season,
                    notes: Object.fromEntries(others.map((id) => [id, `${cap(SEASONS[id].name)} nije pravo vreme. ${thing.why}`])),
                });
            }
            case "next": {
                const after = nextSeason(season);
                const others = shuffle(SEASON_IDS.filter((id) => id !== after && id !== season)).slice(0, choices - 1);
                return pickRound({
                    prompt: `Koje godišnje doba dolazi posle ${SEASONS[season].after}?`,
                    why: `Posle ${SEASONS[season].after} dolazi ${SEASONS[after].name}.`,
                    modeled,
                    cue: seasonCard(season),
                    choices: shuffle([after, ...others]).map(seasonCard),
                    style: "word",
                    answer: after,
                    notes: Object.fromEntries(others.map((id) => [id, `${cap(SEASONS[id].name)} ne dolazi posle ${SEASONS[season].after}.`])),
                });
            }
            case "day": {
                const thing = dayThings[index];
                const others = shuffle(rule.days.filter((id) => id !== thing.part)).slice(0, choices - 1);
                return pickRound({
                    prompt: thing.ask,
                    why: thing.why,
                    modeled,
                    cue: thingCard(thing),
                    choices: shuffle([thing.part, ...others]).map(dayCard),
                    style: "word",
                    answer: thing.part,
                    notes: Object.fromEntries(others.map((id) => [id, `${cap(DAY_PARTS[id].when)}: ${DAY_PARTS[id].looks.charAt(0).toLowerCase()}${DAY_PARTS[id].looks.slice(1)}`])),
                });
            }
            case "month": {
                const month = months[index];
                const own = seasonOfMonth(month);
                const others = shuffle(SEASON_IDS.filter((id) => id !== own)).slice(0, choices - 1);
                return pickRound({
                    prompt: `Kom godišnjem dobu pripada ${MONTHS[month - 1]}?`,
                    why: `${cap(MONTHS[month - 1])} je ${SEASONS[own].name}. ${cap(SEASONS[own].name)} ima ${monthList(own)}.`,
                    modeled,
                    cue: monthCard(month),
                    choices: shuffle([own, ...others]).map(seasonCard),
                    style: "word",
                    answer: own,
                    notes: Object.fromEntries(others.map((id) => [id, `${cap(SEASONS[id].name)} ima ${monthList(id)}.`])),
                });
            }
            case "monthNext": {
                const month = months[index];
                const after = (month % 12) + 1;
                const pool = shuffle([((month + 10) % 12) + 1, ((month + 1) % 12) + 1, ((month + 2) % 12) + 1, ((month + 5) % 12) + 1].filter((m) => m !== after && m !== month));
                const others = pool.slice(0, choices - 1);
                return pickRound({
                    prompt: `Koji mesec dolazi posle ${MONTHS_GEN[month - 1]}?`,
                    why: `Posle ${MONTHS_GEN[month - 1]} dolazi ${MONTHS[after - 1]}.`,
                    modeled,
                    cue: monthCard(month),
                    choices: shuffle([after, ...others]).map(monthCard),
                    style: "pic",
                    answer: `m${after}`,
                    notes: Object.fromEntries(others.map((m) => [`m${m}`, `${cap(MONTHS[m - 1])} ne dolazi posle ${MONTHS_GEN[month - 1]}.`])),
                });
            }
            case "cycle":
                return cycleRound(season, rule, modeled, shuffle);
            case "dayOrder":
                return dayOrderRound(rule, modeled, shuffle);
            case "sort":
                return sortRound(rule, season, modeled, freshThing, shuffle);
        }
    });
}

function pickRound(round: Pick<PickRound, "prompt" | "why" | "modeled" | "cue" | "choices" | "answer" | "notes" | "style">): PickRound {
    return { kind: "pick", cueWide: false, clues: [], ...round };
}

function cycleRound(start: SeasonId, rule: SeasonsLevel, modeled: boolean, shuffle: <T>(list: readonly T[]) => T[]): OrderRound {
    // Godina kreće od datog doba i ide u krug; prvo mesto je (na srednjim nivoima) već postavljeno
    const sequence: SeasonId[] = [start];
    while (sequence.length < SEASON_IDS.length) sequence.push(nextSeason(sequence[sequence.length - 1]));
    return {
        kind: "order",
        prompt: `Godišnja doba redom, od ${SEASONS[start].after}.`,
        why: `${sequence.map((id) => SEASONS[id].name).join(", ")}. Pa opet ${SEASONS[start].name}.`,
        modeled,
        items: shuffle(sequence.map(seasonCard)),
        sequence: [...sequence],
        given: Math.min(rule.given, 1),
        notes: Object.fromEntries(sequence.map((id, i) => [id, i === 0 ? `Prvo ${SEASONS[id].name}.` : `Posle ${SEASONS[sequence[i - 1]].after} dolazi ${SEASONS[id].name}.`])),
    };
}

function dayOrderRound(rule: SeasonsLevel, modeled: boolean, shuffle: <T>(list: readonly T[]) => T[]): OrderRound {
    const sequence = [...DAY_IDS];
    return {
        kind: "order",
        prompt: "Delovi dana redom: od jutra do noći.",
        why: "Jutro, podne, veče i noć. Pa opet jutro.",
        modeled,
        items: shuffle(sequence.map(dayCard)),
        sequence,
        given: Math.min(rule.given, 1),
        notes: { morning: "Dan počinje jutrom.", noon: "Posle jutra dolazi podne.", evening: "Posle podneva dolazi veče.", night: "Posle večeri dolazi noć." },
    };
}

function sortRound(rule: SeasonsLevel, first: SeasonId, modeled: boolean, freshThing: (season: SeasonId, except?: readonly string[]) => SeasonThing, shuffle: <T>(list: readonly T[]) => T[]): SortRound {
    // Dva doba za četiri stvari, tri za šest, četiri za osam (po dve stvari)
    const size = Math.min(rule.seasons.length, rule.choices >= 6 ? 3 : rule.seasons.length >= 4 && rule.choices === 4 ? 4 : 2);
    const seasons = [first, ...shuffle(rule.seasons.filter((id) => id !== first))].slice(0, size);
    const per = size === 4 ? 1 : 2;
    // Različite stvari u jednom zadatku (prvo one koje još nisu bile)
    const things: SeasonThing[] = [];
    for (const id of seasons) for (let i = 0; i < per; i++) things.push(freshThing(id, things.map((x) => x.id)));
    const ordered = SEASON_IDS.filter((id) => seasons.includes(id));
    return {
        kind: "sort",
        prompt: "Kada je šta? Svaka slika u svoje godišnje doba.",
        why: "Sve je na svom mestu.",
        modeled,
        bins: ordered.map(seasonCard),
        items: shuffle(things.map(thingCard)),
        homes: Object.fromEntries(things.map((x) => [x.id, x.season])),
        says: Object.fromEntries(things.map((x) => [x.id, x.why])),
        notes: Object.fromEntries(things.map((x) => [x.id, x.why])),
    };
}
