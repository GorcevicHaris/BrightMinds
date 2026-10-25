// Sadržaj igre „Mama i beba”: dete spaja mladunče sa mamom (prevlačenjem ili dodirom bebe pa
// mame), kasnije odgovara „Čija je ovo beba?”, pronalazi bebu po imenu („Gde je jagnje?”), slaže
// cele porodice (tata, mama i beba) i na kraju porodicu ljudi (dedo, nana, tata, mama, beba).
//
// Zašto ovako (uzrast 3–10, deca sa autizmom):
//  • Učenje bez greške (errorless learning): prvi zadatak prvog nivoa pokazuje ruka i ne
//    ocenjuje se; na lakim nivoima tačno mesto zasvetli već posle prve greške i posle čekanja,
//    a pomoć se kasnije povlači (od najviše ka najmanje podrške). Na prva dva nivoa bebe stoje
//    tačno ispod svojih mama (prostorni nagoveštaj), od trećeg su izmešane.
//  • Malo izbora na početku (2 para, pa 3, pa 4) i najviše onoliko koliko dozvoljava uzrast;
//    prvo bebe koje liče na mamu (jagnje, mače), tek na teškim nivoima one koje ne liče
//    (pile, punoglavac, gusenica) — prvo se uči po izgledu, pa po znanju.
//  • Slušalačko reagovanje pre imenovanja (VB-MAPP: prvo uparivanje, pa „Gde je jagnje?”).
//  • Mirna povratna poruka: posle greške glas kaže tačnu činjenicu („Mačka ima mače.”), bez
//    „ne” i bez tresenja; nema tajmera ni žurbe. Raspored je uvek isti (mame gore, bebe dole),
//    a mesta za dodir su velika (kartice od najmanje 48 px).
//  • Glas i tekst nikad ne govore gde da se dodirne — samo o čemu je zadatak.
//
// Imena mladunaca su prava srpska imena (tele, jagnje, mače, kuče, ždrebe, prase, pače, jare,
// zeče, meče, lavić, slonče, pile, punoglavac, gusenica); mame su u ženskom rodu (kobila, zečica).

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";

export const SPECIES_IDS = ["cow", "sheep", "cat", "dog", "horse", "pig", "duck", "goat", "rabbit", "bear", "lion", "elephant", "chicken", "frog", "butterfly"] as const;
export type SpeciesId = (typeof SPECIES_IDS)[number];

export interface Species {
    id: SpeciesId;
    /** Mama, nominativ („Krava”) */
    mother: string;
    /** Beba, nominativ („Tele”) */
    baby: string;
    /** Tata (samo vrste koje se slažu u porodice) */
    father?: string;
    /** Beba liči na mamu (lakši nivoi); pile, punoglavac i gusenica ne liče */
    alike: boolean;
    /** 1 = najpoznatije (prvi nivoi), 2 = poznate */
    familiar: 1 | 2;
    /** Rečenica posle spajanja („Krava i njeno tele.”) */
    pairLine: string;
    /** Tačna činjenica o mami, posle pogrešnog spuštanja („Mačka ima mače.”) */
    hasLine: string;
}

const s = (id: SpeciesId, mother: string, baby: string, familiar: Species["familiar"], pairLine: string, hasLine: string, extra: Partial<Pick<Species, "father" | "alike">> = {}): Species => ({
    id,
    mother,
    baby,
    familiar,
    pairLine,
    hasLine,
    alike: extra.alike ?? true,
    ...(extra.father ? { father: extra.father } : {}),
});

export const SPECIES: readonly Species[] = [
    s("cow", "Krava", "Tele", 1, "Krava i njeno tele.", "Krava ima tele.", { father: "Bik" }),
    s("sheep", "Ovca", "Jagnje", 1, "Ovca i njeno jagnje.", "Ovca ima jagnje.", { father: "Ovan" }),
    s("cat", "Mačka", "Mače", 1, "Mačka i njeno mače.", "Mačka ima mače."),
    s("dog", "Kuja", "Kuče", 1, "Kuja i njeno kuče.", "Kuja ima kuče."),
    s("horse", "Kobila", "Ždrebe", 1, "Kobila i njeno ždrebe.", "Kobila ima ždrebe."),
    s("pig", "Svinja", "Prase", 1, "Svinja i njeno prase.", "Svinja ima prase."),
    s("duck", "Patka", "Pače", 1, "Patka i njeno pače.", "Patka ima pače.", { father: "Patak" }),
    s("goat", "Koza", "Jare", 2, "Koza i njeno jare.", "Koza ima jare.", { father: "Jarac" }),
    s("rabbit", "Zečica", "Zeče", 2, "Zečica i njeno zeče.", "Zečica ima zeče."),
    s("bear", "Medvedica", "Meče", 2, "Medvedica i njeno meče.", "Medvedica ima meče."),
    s("lion", "Lavica", "Lavić", 2, "Lavica i njen lavić.", "Lavica ima lavića.", { father: "Lav" }),
    s("elephant", "Slonica", "Slonče", 2, "Slonica i njeno slonče.", "Slonica ima slonče.", { father: "Slon" }),
    // Bebe koje ne liče na mamu (teški nivoi)
    s("chicken", "Kokoška", "Pile", 1, "Kokoška i njeno pile.", "Kokoška ima pile.", { father: "Petao", alike: false }),
    s("frog", "Žaba", "Punoglavac", 2, "Punoglavac raste i postaje žaba.", "Žaba ima punoglavca.", { alike: false }),
    s("butterfly", "Leptir", "Gusenica", 2, "Gusenica raste i postaje leptir.", "Leptir je nekad bio gusenica.", { alike: false }),
];

export function getSpecies(id: unknown): Species | undefined {
    return SPECIES.find((species) => species.id === id);
}

/** Vrste koje se slažu u porodice (imaju tatu) */
export const FAMILY_SPECIES: readonly SpeciesId[] = SPECIES.filter((species) => species.father).map((species) => species.id);

// ── Porodica ljudi ────────────────────────────────────────────────────────────

export const PERSON_IDS = ["dedo", "nana", "tata", "mama", "beba"] as const;
export type PersonId = (typeof PERSON_IDS)[number];

export const PERSON_NAMES: Record<PersonId, string> = { dedo: "Dedo", nana: "Nana", tata: "Tata", mama: "Mama", beba: "Beba" };

export function isPerson(id: unknown): id is PersonId {
    return typeof id === "string" && (PERSON_IDS as readonly string[]).includes(id);
}

// ── Komadi na tabli ───────────────────────────────────────────────────────────
// Komad je ono što se prevlači: beba („cow”), član porodice („cow.dad”, „cow.baby”) ili osoba („nana”).

export type Member = "dad" | "baby";

export function pieceSpecies(piece: string): SpeciesId | undefined {
    return getSpecies(piece.split(".")[0])?.id;
}

export function pieceMember(piece: string): Member {
    return piece.endsWith(".dad") ? "dad" : "baby";
}

const lower = (text: string) => text.toLocaleLowerCase("sr");

/** Natpis komada („Tele”, „Bik”, „Nana”) */
export function pieceName(kind: FamilyKind, piece: string): string {
    if (kind === "people" || kind === "person") return isPerson(piece) ? PERSON_NAMES[piece] : "";
    const species = getSpecies(pieceSpecies(piece));
    if (!species) return "";
    return kind === "family" && pieceMember(piece) === "dad" ? (species.father ?? "") : species.baby;
}

/** Da li komad pripada ovom mestu (beba mami, član porodici, osoba svom mestu na slici) */
export function belongs(kind: FamilyKind, piece: string, target: string): boolean {
    if (kind === "people") return piece === target;
    return pieceSpecies(piece) === target;
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

export const MATCH_QUESTION = "Svaka beba ide kod svoje mame.";
export const WHOSE_QUESTION = "Čija je ovo beba?";
export const FAMILY_QUESTION = "Ko je u kojoj porodici?";
export const PEOPLE_QUESTION = "Porodica se slika: dedo, nana, tata, mama i beba.";
export const MATCH_DONE = "Sve bebe su kod mama.";
export const FAMILY_DONE = "Sve porodice su na okupu.";
export const PEOPLE_DONE = "Cela porodica je na slici.";

/** „Bik, krava i tele.” */
export function familyLine(species: Species): string {
    return `${species.father}, ${lower(species.mother)} i ${lower(species.baby)}.`;
}

/** Pitanje koje glas postavlja i koje piše na ekranu */
export function roundQuestion(round: Pick<FamilyRound, "kind" | "answer">): string {
    switch (round.kind) {
        case "match":
            return MATCH_QUESTION;
        case "whose":
            return WHOSE_QUESTION;
        case "family":
            return FAMILY_QUESTION;
        case "people":
            return PEOPLE_QUESTION;
        case "name": {
            const species = getSpecies(round.answer);
            return species ? `Gde je ${lower(species.baby)}?` : "";
        }
        case "person":
            return isPerson(round.answer) ? `Gde je ${lower(PERSON_NAMES[round.answer])}?` : "";
    }
}

/** Kraći natpis na ekranu (glas za porodicu ljudi nabraja sve članove) */
export function roundTitle(round: Pick<FamilyRound, "kind" | "answer">): string {
    return round.kind === "people" ? "Porodica se slika." : roundQuestion(round);
}

/** Rečenica posle tačnog odgovora u zadatku sa izborom */
export function answerSentence(round: Pick<FamilyRound, "kind" | "answer">): string {
    if (round.kind === "person") return isPerson(round.answer) ? `Ovo je ${lower(PERSON_NAMES[round.answer])}.` : "";
    const species = getSpecies(round.answer);
    if (!species) return "";
    if (round.kind === "name") return `Ovo je ${lower(species.baby)}.`;
    return species.pairLine;
}

/** Posle pogrešnog izbora: šta je zapravo izabrano (tačna činjenica, bez „ne”) */
export function wrongSentence(round: Pick<FamilyRound, "kind" | "answer">, picked: string): string {
    if (round.kind === "person") return isPerson(picked) ? `Ovo je ${lower(PERSON_NAMES[picked])}.` : "";
    const species = getSpecies(picked);
    if (!species) return "";
    if (round.kind === "name") return `Ovo je ${lower(species.baby)}.`;
    return species.hasLine;
}

/** Posle tačnog spuštanja na tabli */
export function placedSentence(kind: FamilyKind, piece: string): string {
    if (kind === "people") return isPerson(piece) ? `${PERSON_NAMES[piece]}.` : "";
    const species = getSpecies(pieceSpecies(piece));
    if (!species) return "";
    if (kind === "family") return pieceMember(piece) === "dad" ? `Tata ${lower(species.father ?? "")}.` : `Beba ${lower(species.baby)}.`;
    return species.pairLine;
}

/** Posle pogrešnog spuštanja: šta je na tom mestu („Mačka ima mače.”, „Tu stoji nana.”) */
export function misplacedSentence(kind: FamilyKind, target: string): string {
    if (kind === "people") return isPerson(target) ? `Tu stoji ${lower(PERSON_NAMES[target])}.` : "";
    const species = getSpecies(target);
    if (!species) return "";
    if (kind === "family" && species.father) return `Tu žive ${lower(familyLine(species)).replace(/\.$/, "")}.`;
    return species.hasLine;
}

export function boardDone(kind: FamilyKind): string {
    return kind === "family" ? FAMILY_DONE : kind === "people" ? PEOPLE_DONE : MATCH_DONE;
}

// ── Zadaci ────────────────────────────────────────────────────────────────────

export type FamilyKind = "match" | "whose" | "name" | "family" | "people" | "person";

/** Table: komadi se prevlače na mesta. Ostalo su zadaci sa izborom slike. */
export const BOARD_KINDS: readonly FamilyKind[] = ["match", "family", "people"];
export const isBoard = (kind: FamilyKind) => BOARD_KINDS.includes(kind);

/**
 * Jedan zadatak.
 *  • Table (`match`, `family`, `people`): `targets` su mesta redom (mame, kuće porodica, mesta na
 *    slici), `pieces` komadi u korpi redom.
 *  • Izbor (`whose`, `name`, `person`): `answer` je tačna slika, `choices` slike redom; u „whose”
 *    je na velikoj slici beba vrste `answer`, a izbori su mame.
 */
export interface FamilyRound {
    kind: FamilyKind;
    targets: string[];
    pieces: string[];
    answer: string;
    choices: string[];
    /** Na mestu za komad se vidi bleda silueta (pomoć na prvom nivou porodica i na slici porodice) */
    outline: boolean;
}

interface LevelRule {
    first: number;
    last: number;
    kinds: readonly FamilyKind[];
    /** Vrste koje učestvuju: `alike1` najpoznatije koje liče, `alike` sve koje liče, `all` i one koje ne liče */
    pool: "alike1" | "alike" | "all";
    /** Broj parova, kuća ili slika po vrsti zadatka */
    size: Partial<Record<FamilyKind, number>>;
    rounds: number;
    /** Bebe stoje ispod svojih mama (prostorni nagoveštaj, samo na početku) */
    aligned: boolean;
    /** Podrška se povlači: tačno mesto zasvetli već posle prve greške i posle čekanja */
    earlyHint: boolean;
    /** Silueta člana porodice na praznom mestu */
    outline: boolean;
    /** Bar jedna beba koja ne liči na mamu u svakom zadatku (teški nivoi) */
    unlike: boolean;
}

const RULES: readonly LevelRule[] = [
    // Lako: dva para (prvi zadatak pokazan), bebe ispod mama; pa tri para, izmešano
    { first: 1, last: 1, kinds: ["match"], pool: "alike1", size: { match: 2 }, rounds: 4, aligned: true, earlyHint: true, outline: false, unlike: false },
    { first: 2, last: 2, kinds: ["match"], pool: "alike1", size: { match: 2 }, rounds: 5, aligned: false, earlyHint: true, outline: false, unlike: false },
    { first: 3, last: 3, kinds: ["match"], pool: "alike1", size: { match: 3 }, rounds: 4, aligned: false, earlyHint: true, outline: false, unlike: false },
    { first: 4, last: 5, kinds: ["match"], pool: "alike", size: { match: 3 }, rounds: 5, aligned: false, earlyHint: true, outline: false, unlike: false },
    // Srednje: četiri para, „Čija je ovo beba?” (tri mame), „Gde je jagnje?” (tri bebe)
    { first: 6, last: 6, kinds: ["match"], pool: "alike", size: { match: 4 }, rounds: 4, aligned: false, earlyHint: false, outline: false, unlike: false },
    { first: 7, last: 7, kinds: ["whose"], pool: "alike", size: { whose: 3 }, rounds: 6, aligned: false, earlyHint: false, outline: false, unlike: false },
    { first: 8, last: 8, kinds: ["name"], pool: "alike", size: { name: 3 }, rounds: 6, aligned: false, earlyHint: false, outline: false, unlike: false },
    { first: 9, last: 9, kinds: ["whose", "name"], pool: "alike", size: { whose: 3, name: 3 }, rounds: 6, aligned: false, earlyHint: false, outline: false, unlike: false },
    { first: 10, last: 10, kinds: ["match", "whose", "name"], pool: "alike", size: { match: 4, whose: 3, name: 3 }, rounds: 6, aligned: false, earlyHint: false, outline: false, unlike: false },
    // Teško: bebe koje ne liče na mamu, porodice (tata, mama, beba), porodica ljudi, pa sve zajedno
    { first: 11, last: 11, kinds: ["whose", "match"], pool: "all", size: { whose: 3, match: 3 }, rounds: 6, aligned: false, earlyHint: false, outline: false, unlike: true },
    { first: 12, last: 12, kinds: ["family"], pool: "all", size: { family: 2 }, rounds: 4, aligned: false, earlyHint: false, outline: true, unlike: false },
    { first: 13, last: 13, kinds: ["family"], pool: "all", size: { family: 3 }, rounds: 4, aligned: false, earlyHint: false, outline: false, unlike: false },
    { first: 14, last: 14, kinds: ["people", "person"], pool: "all", size: { person: 3 }, rounds: 5, aligned: false, earlyHint: false, outline: true, unlike: false },
    { first: 15, last: 15, kinds: ["family", "whose", "name", "match", "person"], pool: "all", size: { family: 3, whose: 3, name: 4, match: 4, person: 4 }, rounds: 7, aligned: false, earlyHint: false, outline: false, unlike: true },
];

export const FAMILY_MAX_LEVEL = 15;

export function familyRule(level: number): LevelRule {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), FAMILY_MAX_LEVEL);
    return RULES.find((rule) => safe >= rule.first && safe <= rule.last) ?? RULES[0];
}

interface BuildOptions {
    maxChoices: number;
    maxRounds: number;
    random?: () => number;
}

/**
 * Zadaci jednog nivoa. `random` daje broj u [0, 1) (igra koristi Math.random, testovi stalan niz).
 * `maxChoices` i `maxRounds` dolaze iz podešavanja uzrasta. Vrste zadataka se smenjuju; ista beba
 * (ili isti skup parova) se ne ponavlja zaredom.
 */
export function buildFamilyLevel(level: number, { maxChoices, maxRounds, random = Math.random }: BuildOptions): FamilyRound[] {
    const rule = familyRule(level);
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
    /** Izmešano, ali ne istim redom kao `order` (bebe ne stoje ispod svojih mama) */
    const mixed = (list: readonly string[], order: readonly string[]) => {
        for (let i = 0; i < 12; i += 1) {
            const next = shuffle(list);
            if (next.length < 2 || next.some((id, index) => id !== order[index])) return next;
        }
        return [...list].reverse();
    };

    const pool = SPECIES.filter((species) => (rule.pool === "all" ? true : species.alike && (rule.pool === "alike" || species.familiar === 1))).map((species) => species.id);
    const unlike = SPECIES.filter((species) => !species.alike).map((species) => species.id);
    const rounds: FamilyRound[] = [];
    const usedSets = new Set<string>();
    const usedAnswers = new Set<string>();
    let last: string[] = [];
    let unlikeTurn = 0;

    const sizeOf = (kind: FamilyKind) => Math.max(2, Math.min(rule.size[kind] ?? 2, limit));
    /** Sledeća vrsta „koja ne liči” (redom, da se sve tri pojave) */
    const nextUnlike = () => unlike[unlikeTurn++ % unlike.length];

    const make = (kind: FamilyKind): FamilyRound | null => {
        const base = { kind, targets: [] as string[], pieces: [] as string[], answer: "", choices: [] as string[], outline: rule.outline };

        if (kind === "match" || kind === "family") {
            const count = Math.min(sizeOf(kind), kind === "family" ? 3 : 4);
            const source = kind === "family" ? FAMILY_SPECIES : pool;
            for (let attempt = 0; attempt < 30; attempt += 1) {
                const fresh = shuffle(source.filter((id) => !last.includes(id)));
                const rest = shuffle(source.filter((id) => last.includes(id)));
                let chosen = [...fresh, ...rest].slice(0, count);
                if (kind === "match" && rule.unlike && !chosen.some((id) => unlike.includes(id))) chosen = [nextUnlike(), ...chosen.filter((id) => !unlike.includes(id))].slice(0, count);
                const key = `${kind}:${[...chosen].sort().join(",")}`;
                if (chosen.length < count || (usedSets.has(key) && attempt < 29)) continue;
                usedSets.add(key);
                const targets = shuffle(chosen);
                if (kind === "family") return { ...base, targets, pieces: shuffle(targets.flatMap((id) => [`${id}.dad`, `${id}.baby`])) };
                return { ...base, targets, pieces: rule.aligned ? [...targets] : mixed(targets, targets) };
            }
            return null;
        }

        if (kind === "people") return { ...base, targets: [...PERSON_IDS], pieces: mixed(PERSON_IDS, PERSON_IDS), outline: true };

        if (kind === "person") {
            const count = Math.min(sizeOf(kind), PERSON_IDS.length);
            const options = shuffle(PERSON_IDS.filter((id) => !usedAnswers.has(`person:${id}`) && !last.includes(id)));
            const answer = options[0] ?? shuffle(PERSON_IDS.filter((id) => !last.includes(id)))[0] ?? shuffle(PERSON_IDS)[0];
            usedAnswers.add(`person:${answer}`);
            const others = shuffle(PERSON_IDS.filter((id) => id !== answer)).slice(0, count - 1);
            return { ...base, answer, choices: shuffle([answer, ...others]) };
        }

        // „Čija je ovo beba?” i „Gde je jagnje?”
        const count = sizeOf(kind);
        const wantUnlike = rule.unlike && kind === "whose" && rounds.filter((r) => r.kind === "whose").length % 2 === 0;
        const candidates = wantUnlike ? [nextUnlike()] : shuffle(pool.filter((id) => !usedAnswers.has(`${kind}:${id}`) && !last.includes(id)));
        const answer = candidates[0] ?? shuffle(pool.filter((id) => !last.includes(id)))[0];
        if (!answer) return null;
        usedAnswers.add(`${kind}:${answer}`);
        const others = shuffle(pool.filter((id) => id !== answer)).slice(0, count - 1);
        return { ...base, answer, choices: shuffle([answer, ...others]) };
    };

    for (let i = 0; rounds.length < roundCount && i < roundCount * 4; i += 1) {
        const kind = rule.kinds[rounds.length % rule.kinds.length];
        const round = make(kind);
        if (!round) continue;
        rounds.push(round);
        last = roundSpecies(round);
    }
    return rounds;
}

/** Vrste (ili osobe) koje se vide u zadatku */
export function roundSpecies(round: FamilyRound): string[] {
    // Slika porodice ima sve članove: posle nje se svako sme pitati
    if (round.kind === "people") return [];
    if (isBoard(round.kind)) return [...round.targets];
    return [round.answer];
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface FamilyView extends BaseView {
    kind: FamilyKind;
    targets: string[];
    pieces: string[];
    answer: string;
    choices: string[];
    outline: boolean;
    /** Table: komadi koji su već na svom mestu */
    placed: string[];
    /** Table: izabran komad (dodir, pa dodir na mesto) */
    selected: string | null;
    /** Pogrešno probane slike (na tabli: „komad>mesto”) */
    wrong: string[];
    /** Poslednji pogrešan izbor dok traje povratna poruka */
    picked: string | null;
    feedback: FeedbackKind;
    hint: boolean;
    promptedCount: number;
}

export function emptyFamilyView(totalRounds: number): FamilyView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        kind: "match",
        targets: [],
        pieces: [],
        answer: "",
        choices: [],
        outline: false,
        placed: [],
        selected: null,
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
    };
}

/** Polja zadatka u stanju igre */
export function roundView(round: FamilyRound): Pick<FamilyView, "kind" | "targets" | "pieces" | "answer" | "choices" | "outline"> {
    return { kind: round.kind, targets: [...round.targets], pieces: [...round.pieces], answer: round.answer, choices: [...round.choices], outline: round.outline };
}

/** Pomoć na tabli: prvi komad koji još nije na mestu i mesto gde pripada */
export function boardHint(view: Pick<FamilyView, "kind" | "pieces" | "placed" | "targets">): { piece: string; target: string } | null {
    const piece = view.pieces.find((id) => !view.placed.includes(id));
    if (!piece) return null;
    const target = view.targets.find((id) => belongs(view.kind, piece, id));
    return target ? { piece, target } : null;
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Zadatak je rešen. Prvi zadatak prvog nivoa pokazuje ruka (pokazni, ne ocenjuje se);
 * „correct” = iz prvog pokušaja i bez pomoći, „prompted” = uz pomoć (osim pokaznog).
 * Na tabli je zadatak „iz prvog pokušaja” kad nijedan komad nije spušten na pogrešno mesto.
 */
export function solveFamilyView(current: FamilyView, level: number, solved: Partial<FamilyView> = {}): { next: FamilyView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const firstTry = current.wrong.length === 0 && !current.hint && !modeled;
    const next: FamilyView = {
        ...current,
        ...solved,
        feedback: "correct",
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

/** Rezultat nivoa: total = zadaci bez pokaznog; correct = iz prvog pokušaja; prompted = uz pomoć */
export function familyResult(final: FamilyView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

const KINDS: readonly FamilyKind[] = ["match", "whose", "name", "family", "people", "person"];

/** Da li je id poznat za ovu vrstu zadatka */
function knownTarget(kind: FamilyKind, id: unknown): id is string {
    return kind === "people" || kind === "person" ? isPerson(id) : getSpecies(id) !== undefined;
}

function knownPiece(kind: FamilyKind, id: unknown): id is string {
    if (typeof id !== "string") return false;
    if (kind === "people") return isPerson(id);
    if (kind === "family") return /^[a-z]+\.(dad|baby)$/.test(id) && getSpecies(pieceSpecies(id))?.father !== undefined;
    return getSpecies(id) !== undefined;
}

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeFamilyMonitor(state: Partial<FamilyView> | null | undefined): FamilyView {
    const base = emptyFamilyView(1);
    if (!state) return base;
    const kind = KINDS.includes(state.kind as FamilyKind) ? (state.kind as FamilyKind) : "match";
    const unique = (list: unknown, ok: (id: unknown) => id is string) => (Array.isArray(list) ? Array.from(new Set(list.filter(ok))) : []);
    const targets = unique(state.targets, (id): id is string => knownTarget(kind, id));
    const pieces = unique(state.pieces, (id): id is string => knownPiece(kind, id)).filter((piece) => targets.some((target) => belongs(kind, piece, target)));
    const choices = unique(state.choices, (id): id is string => knownTarget(kind, id));
    const board = isBoard(kind);
    const valid = board ? targets.length >= 2 && pieces.length >= 2 : choices.length >= 2 && choices.includes(String(state.answer));
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const answer = valid && !board ? String(state.answer) : "";
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        kind,
        targets: valid && board ? targets : [],
        pieces: valid && board ? pieces : [],
        answer,
        choices: valid && !board ? choices : [],
        outline: state.outline === true,
        placed: valid && board ? unique(state.placed, (id): id is string => typeof id === "string" && pieces.includes(id)) : [],
        selected: valid && board && typeof state.selected === "string" && pieces.includes(state.selected) ? state.selected : null,
        wrong: valid && Array.isArray(state.wrong) ? state.wrong.filter((id): id is string => typeof id === "string" && (board ? /^[a-z.]+>[a-z]+$/.test(id) : choices.includes(id) && id !== answer)) : [],
        picked: valid && !board && typeof state.picked === "string" && choices.includes(state.picked) ? state.picked : null,
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
    };
}
