// Sadržaj igre „Spakuj ranac”: na stolu su školske stvari i igračke, sa strane slikovna lista
// (ili raspored časova), a dete prevlači (ili dodirne, pa dodirne ranac) ono što treba u ranac.
// Spakovano se na listi štiklira; ono što ne treba ranac mirno vrati („To ne treba za školu danas.”).
//
// Zašto ovako (uzrast 5–10, deca sa autizmom):
//  • Radno pamćenje i planiranje rastu u malim koracima: prvo 2–3 stvari uz listu koja je stalno
//    na ekranu (vizuelna podrška, slikovna lista kao u TEACCH-u), pa 4–5 stvari, pa lista koja se
//    vidi samo na početku (zapamti, pa spakuj; „Lista” je vraća, ali se to beleži kao pomoć), pa
//    provera („Šta fali u rancu?”) i na kraju zaključivanje iz rasporeda časova (predmet → knjiga).
//  • Učenje bez greške: prvi zadatak prvog nivoa pokazuje ruka i ne ocenjuje se; na lakim nivoima
//    sledeća stvar sa liste zasvetli već posle prve greške i posle čekanja, kasnije ređe.
//  • Malo ometača na početku (dve igračke), više tek kasnije; slične knjige se razlikuju bojom i
//    znakom predmeta, isto kao na rasporedu (ista boja, isti znak), pa se poklapanje vidi.
//  • Mirna povratna poruka bez „ne valja”; nema tajmera. Raspored ekrana je uvek isti (lista,
//    ranac, sto), a mesta za dodir su velika. Glas ne govori gde da se dodirne.
//
// Predmeti su iz programa za 1–4. razred (srpski jezik, matematika, svet oko nas, engleski jezik,
// muzička i likovna kultura, fizičko i zdravstveno vaspitanje, digitalni svet).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

// ── Predmeti (časovi) ─────────────────────────────────────────────────────────

export const SUBJECT_IDS = ["srpski", "matematika", "svet", "engleski", "muzicko", "likovno", "fizicko", "digitalni"] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];

export interface Subject {
    id: SubjectId;
    /** Kako piše na rasporedu („Srpski jezik”, „Likovno”) */
    name: string;
    /** Akuzativ, malim slovom („Danas nemamo matematiku.”) */
    acc: string;
    /** Šta se nosi za taj čas */
    item: ItemId;
    /** Boja predmeta: ista na rasporedu i na knjizi */
    color: string;
}

// ── Stvari ────────────────────────────────────────────────────────────────────

export const ITEM_IDS = [
    // Svaki dan
    "pencilcase",
    "bottle",
    "lunch",
    // Školske stvari (laki nivoi)
    "notebook",
    "book",
    "crayons",
    "ruler",
    // Za predmete
    "book-srpski",
    "book-matematika",
    "book-svet",
    "book-engleski",
    "book-muzicko",
    "book-digitalni",
    "sketchbook",
    "sneakers",
    // Ne trebaju za školu
    "car",
    "ball",
    "phone",
    "icecream",
    "teddy",
    "blocks",
] as const;
export type ItemId = (typeof ITEM_IDS)[number];

export interface Item {
    id: ItemId;
    /** Natpis na kartici */
    name: string;
    /** Rečenica kad stvar uđe u ranac („Knjiga za matematiku.”) */
    packLine: string;
    /** Školska stvar ili igračka (ometač) */
    school: boolean;
    /** Za koji predmet */
    subject?: SubjectId;
}

export const SUBJECTS: readonly Subject[] = [
    { id: "srpski", name: "Srpski jezik", acc: "srpski", item: "book-srpski", color: "#e0574f" },
    { id: "matematika", name: "Matematika", acc: "matematiku", item: "book-matematika", color: "#3f7fd8" },
    { id: "svet", name: "Svet oko nas", acc: "svet oko nas", item: "book-svet", color: "#3fa45a" },
    { id: "engleski", name: "Engleski jezik", acc: "engleski", item: "book-engleski", color: "#8a6ee8" },
    { id: "muzicko", name: "Muzičko", acc: "muzičko", item: "book-muzicko", color: "#e0609e" },
    { id: "likovno", name: "Likovno", acc: "likovno", item: "sketchbook", color: "#f08a2e" },
    { id: "fizicko", name: "Fizičko", acc: "fizičko", item: "sneakers", color: "#d9a520" },
    { id: "digitalni", name: "Digitalni svet", acc: "digitalni svet", item: "book-digitalni", color: "#2aa3b3" },
];

const it = (id: ItemId, name: string, packLine: string, school: boolean, subject?: SubjectId): Item => ({ id, name, packLine, school, ...(subject ? { subject } : {}) });

export const ITEMS: readonly Item[] = [
    it("pencilcase", "Pernica", "Pernica.", true),
    it("bottle", "Flašica", "Flašica za vodu.", true),
    it("lunch", "Užina", "Užina.", true),
    it("notebook", "Sveska", "Sveska.", true),
    it("book", "Knjiga", "Knjiga.", true),
    it("crayons", "Bojice", "Bojice.", true),
    it("ruler", "Lenjir", "Lenjir.", true),
    it("book-srpski", "Srpski jezik", "Knjiga za srpski.", true, "srpski"),
    it("book-matematika", "Matematika", "Knjiga za matematiku.", true, "matematika"),
    it("book-svet", "Svet oko nas", "Knjiga za svet oko nas.", true, "svet"),
    it("book-engleski", "Engleski jezik", "Knjiga za engleski.", true, "engleski"),
    it("book-muzicko", "Muzičko", "Knjiga za muzičko.", true, "muzicko"),
    it("book-digitalni", "Digitalni svet", "Knjiga za digitalni svet.", true, "digitalni"),
    it("sketchbook", "Blok", "Blok za likovno.", true, "likovno"),
    it("sneakers", "Patike", "Patike za fizičko.", true, "fizicko"),
    it("car", "Autić", "", false),
    it("ball", "Lopta", "", false),
    it("phone", "Telefon", "", false),
    it("icecream", "Sladoled", "", false),
    it("teddy", "Meda", "", false),
    it("blocks", "Kocke", "", false),
];

export function getItem(id: unknown): Item | undefined {
    return ITEMS.find((item) => item.id === id);
}

export function getSubject(id: unknown): Subject | undefined {
    return SUBJECTS.find((subject) => subject.id === id);
}

/** Stvari koje se nose svaki dan (uz knjige za predmete) */
export const DAILY_ITEMS: readonly ItemId[] = ["pencilcase", "bottle", "lunch"];
/** Lista na lakim i srednjim nivoima */
const LIST_ITEMS: readonly ItemId[] = ["notebook", "pencilcase", "bottle", "book", "lunch", "crayons", "ruler"];
const TOYS: readonly ItemId[] = ["car", "ball", "phone", "icecream", "teddy", "blocks"];

/** Šta treba za ovaj čas (raspored → ranac) */
export function itemForSubject(id: SubjectId): ItemId {
    return getSubject(id)?.item ?? "book";
}

/** Sve što ide u ranac za ove časove: stvar za svaki čas, pa ono što se nosi svaki dan */
export function itemsForTimetable(subjects: readonly SubjectId[], daily: readonly ItemId[] = DAILY_ITEMS): ItemId[] {
    return [...new Set([...subjects.map(itemForSubject), ...daily])];
}

// ── Dani ──────────────────────────────────────────────────────────────────────

export const DAY_IDS = ["pon", "uto", "sre", "cet", "pet"] as const;
export type DayId = (typeof DAY_IDS)[number];

export const DAYS: Record<DayId, { name: string; short: string; acc: string }> = {
    pon: { name: "Ponedeljak", short: "Pon", acc: "ponedeljak" },
    uto: { name: "Utorak", short: "Uto", acc: "utorak" },
    sre: { name: "Sreda", short: "Sre", acc: "sredu" },
    cet: { name: "Četvrtak", short: "Čet", acc: "četvrtak" },
    pet: { name: "Petak", short: "Pet", acc: "petak" },
};

export function isDay(id: unknown): id is DayId {
    return typeof id === "string" && (DAY_IDS as readonly string[]).includes(id);
}

// ── Deca čiji je ranac ────────────────────────────────────────────────────────

export interface Owner {
    name: string;
    female: boolean;
}

export const OWNERS: readonly Owner[] = [
    { name: "Amar", female: false },
    { name: "Lejla", female: true },
    { name: "Haris", female: false },
    { name: "Emina", female: true },
    { name: "Semir", female: false },
    { name: "Ajla", female: true },
];

// ── Rečenice ──────────────────────────────────────────────────────────────────

const lower = (text: string) => text.toLocaleLowerCase("sr");

/** „sveska, pernica i flašica” */
export function listWords(names: readonly string[]): string {
    const words = names.map(lower);
    if (words.length <= 1) return words.join("");
    return `${words.slice(0, -1).join(", ")} i ${words[words.length - 1]}`;
}

export const PACK_TITLE = "Spakuj ranac za školu.";
export const PEEK_TITLE = "Zapamti listu.";
export const MISSING_TITLE = "Šta fali u rancu?";
export const REFUSE_LINE = "To ne treba za školu danas.";
export const PACKED_LINE = "Ranac je spakovan.";

/** Naslov zadatka na ekranu */
/** Zadatak u obliku u kome stiže i sa monitora (obični stringovi) */
interface RoundRef {
    kind: RoundKind;
    day: string;
    needed: readonly string[];
    subjects: readonly string[];
    owner: Owner;
}

export function roundTitle(round: Pick<RoundRef, "kind" | "day">, listOpen = true): string {
    switch (round.kind) {
        case "pack":
            return PACK_TITLE;
        case "peek":
            return listOpen ? PEEK_TITLE : PACK_TITLE;
        case "missing":
            return MISSING_TITLE;
        case "timetable":
            return isDay(round.day) ? `Spakuj ranac za ${DAYS[round.day].acc}.` : PACK_TITLE;
        case "week":
            return isDay(round.day) ? `Sutra je ${lower(DAYS[round.day].name)}.` : PACK_TITLE;
    }
}

/** Šta glas kaže na početku zadatka (lista ili raspored naglas) */
export function roundQuestion(round: RoundRef): string {
    const names = round.needed.map((id) => getItem(id)?.name ?? "").filter(Boolean);
    switch (round.kind) {
        case "pack":
            return `${PACK_TITLE} Na listi su ${listWords(names)}.`;
        case "peek":
            return `Zapamti listu: ${listWords(names)}.`;
        case "missing":
            return `${round.owner.name} je ${round.owner.female ? "spakovala" : "spakovao"} ranac. ${MISSING_TITLE}`;
        case "timetable": {
            if (!isDay(round.day)) return PACK_TITLE;
            const subjects = round.subjects.map((id) => getSubject(id)?.name ?? "");
            return `${DAYS[round.day].name}: ${listWords(subjects)}. Spakuj ranac za ${DAYS[round.day].acc}.`;
        }
        case "week":
            return isDay(round.day) ? `Sutra je ${lower(DAYS[round.day].name)}. Spakuj ranac za ${DAYS[round.day].acc}.` : PACK_TITLE;
    }
}

/** Posle stvari koja ne treba: igračka ili lenjir — „To ne treba…”, knjiga za drugi čas — „Danas nemamo likovno.” */
export function refuseSentence(id: string): string {
    const subject = getSubject(getItem(id)?.subject);
    return subject ? `Danas nemamo ${subject.acc}.` : REFUSE_LINE;
}

export function packSentence(id: string): string {
    return getItem(id)?.packLine ?? "";
}

export function doneSentence(kind: RoundKind): string {
    return kind === "missing" ? "Sad ništa ne fali." : PACKED_LINE;
}

// ── Zadaci ────────────────────────────────────────────────────────────────────

export type RoundKind = "pack" | "peek" | "missing" | "timetable" | "week";

export interface WeekDay {
    day: DayId;
    subjects: SubjectId[];
}

/**
 * Jedan zadatak. `needed` je sve što na kraju mora biti u rancu (redom kao na listi); `packed` je
 * ono što je u rancu već na početku (samo „Šta fali?”); `desk` su stvari na stolu redom.
 * U zadacima sa rasporedom `subjects` su časovi tog dana (`day`), a u „week” `week` je ceo raspored.
 */
export interface BackpackRound {
    kind: RoundKind;
    needed: ItemId[];
    packed: ItemId[];
    desk: ItemId[];
    day: DayId | "";
    subjects: SubjectId[];
    week: WeekDay[];
    /** Svakodnevne stvari na rasporedu: sa slikom ili samo rečima (13. nivo: zapamti ih bez slike) */
    dailyPictures: boolean;
    owner: Owner;
}

interface LevelRule {
    first: number;
    last: number;
    kinds: readonly RoundKind[];
    /** Koliko stvari je na listi (u rasporedu: koliko časova) */
    needed: number;
    /** Igračke na stolu */
    toys: number;
    /** Školske stvari koje danas ne trebaju (lenjir, knjiga za drugi čas) */
    extra: number;
    rounds: number;
    earlyHint: boolean;
    dailyPictures: boolean;
}

const RULES: readonly LevelRule[] = [
    // Lako: dve–tri stvari, lista stalno na ekranu, malo igračaka
    { first: 1, last: 1, kinds: ["pack"], needed: 2, toys: 2, extra: 0, rounds: 4, earlyHint: true, dailyPictures: true },
    { first: 2, last: 2, kinds: ["pack"], needed: 2, toys: 3, extra: 0, rounds: 4, earlyHint: true, dailyPictures: true },
    { first: 3, last: 3, kinds: ["pack"], needed: 3, toys: 3, extra: 0, rounds: 4, earlyHint: true, dailyPictures: true },
    { first: 4, last: 4, kinds: ["pack"], needed: 3, toys: 3, extra: 1, rounds: 5, earlyHint: true, dailyPictures: true },
    { first: 5, last: 5, kinds: ["pack"], needed: 3, toys: 4, extra: 1, rounds: 5, earlyHint: true, dailyPictures: true },
    // Srednje: četiri–pet stvari, pa lista samo na početku („Lista” je vraća), pa provera
    { first: 6, last: 6, kinds: ["pack"], needed: 4, toys: 3, extra: 1, rounds: 4, earlyHint: false, dailyPictures: true },
    { first: 7, last: 7, kinds: ["pack"], needed: 5, toys: 3, extra: 1, rounds: 4, earlyHint: false, dailyPictures: true },
    { first: 8, last: 8, kinds: ["peek"], needed: 3, toys: 3, extra: 1, rounds: 4, earlyHint: false, dailyPictures: true },
    { first: 9, last: 9, kinds: ["peek"], needed: 4, toys: 3, extra: 1, rounds: 4, earlyHint: false, dailyPictures: true },
    { first: 10, last: 10, kinds: ["missing", "peek"], needed: 4, toys: 2, extra: 1, rounds: 4, earlyHint: false, dailyPictures: true },
    // Teško: raspored časova (predmet → knjiga, uz pernicu, flašicu i užinu), pa ranac za određeni dan
    { first: 11, last: 11, kinds: ["timetable"], needed: 2, toys: 1, extra: 2, rounds: 4, earlyHint: false, dailyPictures: true },
    { first: 12, last: 12, kinds: ["timetable"], needed: 3, toys: 1, extra: 2, rounds: 4, earlyHint: false, dailyPictures: true },
    { first: 13, last: 13, kinds: ["timetable"], needed: 3, toys: 0, extra: 3, rounds: 4, earlyHint: false, dailyPictures: false },
    { first: 14, last: 14, kinds: ["week"], needed: 3, toys: 1, extra: 2, rounds: 4, earlyHint: false, dailyPictures: true },
    { first: 15, last: 15, kinds: ["week"], needed: 4, toys: 0, extra: 3, rounds: 4, earlyHint: false, dailyPictures: true },
];

export const BACKPACK_MAX_LEVEL = 15;

export function backpackRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), BACKPACK_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

interface BuildOptions {
    maxChoices: number;
    maxRounds: number;
    random?: () => number;
}

/** Na stolu najviše ovoliko stvari (da sve stane na telefon) */
export const MAX_DESK = 10;

/**
 * Zadaci jednog nivoa. `random` daje broj u [0, 1). `maxChoices` (uzrast) smanjuje broj igračaka
 * na stolu, `maxRounds` broj zadataka. Ista lista (ili isti dan) se u nivou ne ponavlja.
 */
export function buildBackpackLevel(level: number, { maxChoices, maxRounds, random = Math.random }: BuildOptions): BackpackRound[] {
    const rule = backpackRule(level);
    const roundCount = Math.max(2, Math.min(rule.rounds, Number.isFinite(maxRounds) ? maxRounds : rule.rounds));
    const limit = Math.max(2, Number.isFinite(maxChoices) ? maxChoices : 4);
    const shuffle = <T>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const toys = Math.min(rule.toys, limit);
    const owners = shuffle(OWNERS);
    const used = new Set<string>();
    const rounds: BackpackRound[] = [];

    /** Sto: potrebno + ometači, izmešano, najviše MAX_DESK */
    const deskOf = (needed: readonly ItemId[], extras: readonly ItemId[]) => {
        const room = Math.max(0, MAX_DESK - needed.length);
        const others = [...extras.slice(0, rule.extra), ...shuffle(TOYS).slice(0, toys)].slice(0, room);
        return shuffle([...needed, ...others]);
    };

    /** Časovi jednog dana: različiti, bez ponavljanja istog skupa */
    const pickDay = (count: number, avoid: ReadonlySet<string>): SubjectId[] => {
        for (let attempt = 0; attempt < 30; attempt += 1) {
            const subjects = shuffle(SUBJECT_IDS).slice(0, count);
            const key = [...subjects].sort().join(",");
            if (!avoid.has(key) || attempt === 29) return subjects;
        }
        return SUBJECT_IDS.slice(0, count);
    };

    const make = (kind: RoundKind, index: number): BackpackRound => {
        const owner = owners[index % owners.length];
        const base = { kind, packed: [] as ItemId[], day: "" as DayId | "", subjects: [] as SubjectId[], week: [] as WeekDay[], dailyPictures: rule.dailyPictures, owner };

        if (kind === "timetable" || kind === "week") {
            const days = shuffle(DAY_IDS);
            const day = days.find((d) => !used.has(`day:${d}`)) ?? days[0];
            used.add(`day:${day}`);
            let week: WeekDay[] = [];
            let subjects: SubjectId[];
            if (kind === "week") {
                // Ceo raspored: svaki dan ima drugačije časove
                const keys = new Set<string>();
                week = DAY_IDS.map((d) => {
                    const daySubjects = pickDay(rule.needed, keys);
                    keys.add([...daySubjects].sort().join(","));
                    return { day: d, subjects: daySubjects };
                });
                subjects = week.find((w) => w.day === day)!.subjects;
            } else {
                subjects = pickDay(rule.needed, used);
                used.add([...subjects].sort().join(","));
            }
            const needed = itemsForTimetable(subjects);
            // Ometači su knjige za druge časove (u „week”: najpre one iz ostalih dana rasporeda)
            const otherSubjects = shuffle(SUBJECT_IDS.filter((id) => !subjects.includes(id)));
            const fromWeek = week.flatMap((w) => w.subjects).filter((id) => !subjects.includes(id));
            const extras = [...new Set([...shuffle(fromWeek), ...otherSubjects])].map(itemForSubject);
            return { ...base, day, subjects, week, needed, desk: deskOf(needed, extras) };
        }

        const count = Math.min(rule.needed, LIST_ITEMS.length - 1);
        let needed: ItemId[] = [];
        for (let attempt = 0; attempt < 30; attempt += 1) {
            needed = shuffle(LIST_ITEMS).slice(0, count);
            const key = [...needed].sort().join(",");
            if (!used.has(key) || attempt === 29) {
                used.add(key);
                break;
            }
        }
        const extras = shuffle(LIST_ITEMS.filter((id) => !needed.includes(id)));

        if (kind === "missing") {
            const missing = needed[Math.floor(random() * needed.length)];
            const packed = needed.filter((id) => id !== missing);
            return { ...base, needed, packed, desk: deskOf([missing], extras) };
        }
        return { ...base, needed, desk: deskOf(needed, extras) };
    };

    for (let i = 0; rounds.length < roundCount; i += 1) {
        rounds.push(make(rule.kinds[i % rule.kinds.length], i));
    }
    return rounds;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface BackpackView extends BaseView {
    kind: RoundKind;
    needed: string[];
    /** Šta je sad u rancu */
    packed: string[];
    desk: string[];
    day: string;
    subjects: string[];
    week: WeekDay[];
    dailyPictures: boolean;
    owner: Owner;
    /** Lista (raspored) je otvorena; u „peek” se zatvara posle čitanja */
    listOpen: boolean;
    /** Izabrana stvar (dodir, pa dodir na ranac) */
    selected: string | null;
    /** Pogrešno probane stvari u ovom zadatku */
    wrong: string[];
    /** Poslednja odbijena stvar dok traje povratna poruka */
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    /** Lista je ponovo otvorena (pomoć pamćenju; ne ističe stvar na stolu) */
    listHelp: boolean;
    promptedCount: number;
}

export function emptyBackpackView(totalRounds: number): BackpackView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "pack",
        needed: [],
        packed: [],
        desk: [],
        day: "",
        subjects: [],
        week: [],
        dailyPictures: true,
        owner: OWNERS[0],
        listOpen: true,
        selected: null,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        listHelp: false,
    };
}

/** Polja zadatka u stanju igre */
export function roundView(round: BackpackRound): Pick<BackpackView, "kind" | "needed" | "packed" | "desk" | "day" | "subjects" | "week" | "dailyPictures" | "owner" | "listOpen"> {
    return {
        kind: round.kind,
        needed: [...round.needed],
        packed: [...round.packed],
        desk: [...round.desk],
        day: round.day,
        subjects: [...round.subjects],
        week: round.week.map((w) => ({ day: w.day, subjects: [...w.subjects] })),
        dailyPictures: round.dailyPictures,
        owner: { ...round.owner },
        listOpen: true,
    };
}

/** Sledeća stvar koja još fali (za pomoć) */
export function nextNeeded(view: Pick<BackpackView, "needed" | "packed">): string | null {
    return view.needed.find((id) => !view.packed.includes(id)) ?? null;
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen. Prvi zadatak prvog nivoa pokazuje ruka (pokazni, ne ocenjuje se);
 * „correct” = bez ijedne odbijene stvari i bez pomoći, „prompted” = uz pomoć (zasvetlela stvar
 * ili ponovo otvorena lista), osim pokaznog.
 */
export function solveBackpackView(current: BackpackView, level: number, solved: Partial<BackpackView> = {}): { next: BackpackView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hint || current.listHelp;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: BackpackView = {
        ...current,
        ...solved,
        feedback: "correct",
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function backpackResult(final: BackpackView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

const KINDS: readonly RoundKind[] = ["pack", "peek", "missing", "timetable", "week"];

const isItem = (id: unknown): id is string => getItem(id) !== undefined;
const isSubject = (id: unknown): id is SubjectId => getSubject(id) !== undefined;

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeBackpackMonitor(state: Partial<BackpackView> | null | undefined): BackpackView {
    const base = emptyBackpackView(1);
    if (!state) return base;
    const kind = KINDS.includes(state.kind as RoundKind) ? (state.kind as RoundKind) : "pack";
    const unique = <T extends string>(list: unknown, ok: (id: unknown) => id is T): T[] => (Array.isArray(list) ? Array.from(new Set(list.filter(ok))) : []);
    const needed = unique(state.needed, isItem);
    const desk = unique(state.desk, isItem);
    const packed = unique(state.packed, isItem).filter((id) => needed.includes(id));
    const valid = needed.length >= 1 && desk.length >= 1 && needed.every((id) => desk.includes(id) || packed.includes(id));
    const week = Array.isArray(state.week)
        ? state.week
              .filter((w): w is WeekDay => typeof w === "object" && w !== null && isDay(w.day) && Array.isArray(w.subjects))
              .map((w) => ({ day: w.day, subjects: unique(w.subjects, isSubject) }))
        : [];
    const owner = state.owner && typeof state.owner.name === "string" ? (OWNERS.find((o) => o.name === state.owner?.name) ?? base.owner) : base.owner;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind,
        needed: valid ? needed : [],
        packed: valid ? packed : [],
        desk: valid ? desk : [],
        day: isDay(state.day) ? state.day : "",
        subjects: unique(state.subjects, isSubject),
        week,
        dailyPictures: state.dailyPictures !== false,
        owner,
        listOpen: state.listOpen !== false,
        selected: valid && typeof state.selected === "string" && desk.includes(state.selected) ? state.selected : null,
        wrong: valid ? unique(state.wrong, isItem).filter((id) => desk.includes(id)) : [],
        picked: valid && typeof state.picked === "string" && desk.includes(state.picked) ? state.picked : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
        listHelp: state.listHelp === true,
    };
}
