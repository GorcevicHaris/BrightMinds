// lib/duelStakes.ts
// Ulog u dvoboju: ko izgubi, da pobedniku malo novčića — čist deo (server, pregledač, testovi).
//
// Pravila:
//  • Na kraju dvoboja (lib/versusFormat.ts) poražen daje pobedniku ulog: podrazumevano
//    DUEL_STAKE = 3 novčića; roditelj u podešavanjima deteta bira 0, 3 ili 5 („Ulog u dvoboju”).
//  • Nikad ispod nule: poražen daje najviše onoliko koliko ima. Ko nema nijedan novčić, ne daje
//    ništa — ekran i dalje mirno kaže ko je pobedio.
//  • Nerešeno: niko ništa ne daje.
//  • Dve porodice (dva uređaja): važi MANJI od dva uloga. Podešavanje svakog deteta je gornja
//    granica onoga što to dete može da izgubi, a ulog je isti za oba deteta (pošteno: ko može da
//    dobije 3, može i da izgubi 3). Roditelj koji izabere 0 time isključuje prenos za svoje dete
//    u oba smera — dvoboj se igra samo „za ime pobednika”.
//  • Obračun radi samo server (app/api/_lib/duels.ts): dvoboj se obračunava jednom po sesiji,
//    nivou i partiji (`duels` u stanju drugara), i samo kad se izveštaji oba uređaja slažu oko
//    pobednika (ili kad zajednička tabla domaćina javi rezultate poteza).
//  • Model podataka: dobijeni novčići su `bonus`, a dati se dodaju na `spent` (lib/companion.ts):
//    novčići = zarađeni + bonus − potrošeno; stari podaci (bez `bonus`) ostaju ispravni.
//
// Zašto mali ulog i ovakve reči (istraživanja): gubitak se doživljava jače od jednako velikog
// dobitka („averzija prema gubitku”, Kahneman i Tversky 1979; kod dece od predškolskog uzrasta,
// Harbaugh i sar. 2001), a deca sa autizmom češće imaju jaku reakciju na poraz i na gubitak
// nečeg svog (rigidnost, teškoće regulacije emocija — Mazefsky i sar. 2013). Zato je ulog mali
// i predvidiv (nikad „sve ili ništa”), poraz se nikad ne zove „izgubio si”, nego „daje … —
// sledeći put možda ti! Bravo za trud.”, bez tužnog lica i zvuka; trud se hvali kod oba deteta
// (pohvala truda, ne ishoda — Mueller i Dweck 1998), a roditelj može ulog da postavi na 0.

import { coinsOf, DUEL_LEDGER_MAX, type CompanionState } from "./companion";
import { type VersusPlayer } from "./versus";
import type { VersusFormat } from "./versusFormat";

/** Podrazumevani ulog (novčića) */
export const DUEL_STAKE = 3;
/** Izbori roditelja: bez uloga, mali, nešto veći */
export const DUEL_STAKE_OPTIONS = [0, 3, 5] as const;
export type DuelStake = (typeof DUEL_STAKE_OPTIONS)[number];

export function isDuelStake(value: unknown): value is DuelStake {
    return (DUEL_STAKE_OPTIONS as readonly unknown[]).includes(value);
}

/** Ulog dvoboja dva deteta: manji od dva podešavanja (nijedno ne gubi više nego što je roditelj dozvolio). */
export function duelStakeFor(a: number, b: number): number {
    const clean = (n: number) => (isDuelStake(n) ? n : DUEL_STAKE);
    return Math.min(clean(a), clean(b));
}

/** Koliko poražen zaista daje: ulog, ali nikad više nego što ima (nikad ispod nule). */
export function transferAmount(stake: number, loserCoins: number): number {
    return Math.max(0, Math.min(Math.floor(stake), Math.floor(loserCoins)));
}

// ── Rezultat ───────────────────────────────────────────────────────────────────

/** Rezultat jednog igrača u partiji: tačni iz prvog pokušaja, broj zadataka i vreme (s, bez pauza; 0 = ne zna se) */
export interface DuelScore {
    correct: number;
    total: number;
    secs: number;
}

function int(value: unknown, max: number): number | null {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.min(Math.round(value), max) : null;
}

/** Rezultat iz zahteva ili kanala; neispravno → null */
export function cleanDuelScore(raw: unknown): DuelScore | null {
    if (typeof raw !== "object" || raw === null) return null;
    const data = raw as Record<string, unknown>;
    const total = int(data.total, 100);
    const correct = int(data.correct, 100);
    const secs = int(data.secs ?? 0, 36_000);
    if (total === null || correct === null || secs === null || correct > Math.max(total, 0)) return null;
    return { correct, total, secs };
}

/**
 * Pobednik partije (0 ili 1) ili null kad je nerešeno:
 *  • više tačnih odgovora iz prvog pokušaja pobeđuje;
 *  • kad deca imaju različit broj zadataka (svako igra sa svojim podešavanjima za uzrast —
 *    mlađe dete ima manje zadataka i izbora, i to se u dvoboju ne menja), poredi se udeo tačnih
 *    (3 od 4 je bolje od 4 od 6), da mlađe dete ne gubi samo zato što ima kraći nivo;
 *  • u trci („ko je brži”) isti rezultat razrešava ukupno vreme (kraće pobeđuje) — samo kad su
 *    oba vremena poznata;
 *  • „jedan po jedan”: samo tačni odgovori (smena nema zajednički sat).
 */
export function duelWinner(format: VersusFormat, a: DuelScore, b: DuelScore): 0 | 1 | null {
    if (a.total !== b.total && a.total > 0 && b.total > 0) {
        const left = a.correct * b.total;
        const right = b.correct * a.total;
        if (left !== right) return left > right ? 0 : 1;
    } else if (a.correct !== b.correct) {
        return a.correct > b.correct ? 0 : 1;
    }
    if (format === "race" && a.secs > 0 && b.secs > 0 && a.secs !== b.secs) return a.secs < b.secs ? 0 : 1;
    return null;
}

// ── Izveštaji dva uređaja ─────────────────────────────────────────────────────────

export type DuelRole = "host" | "guest";
export type DuelOutcome = DuelRole | "tie";

/** Izveštaj jednog uređaja o završenoj partiji: svoj rezultat i rezultat druga kako ga je video */
export interface DuelReport {
    level: number;
    /** Redni broj partije u sesiji (od 0) — revanš na istom nivou je nova partija */
    round: number;
    format: VersusFormat;
    mine: DuelScore;
    theirs: DuelScore;
}

export function parseDuelReport(raw: unknown, maxLevel: number): DuelReport | null {
    if (typeof raw !== "object" || raw === null) return null;
    const data = raw as Record<string, unknown>;
    const level = typeof data.level === "number" && Number.isInteger(data.level) && data.level >= 1 && data.level <= maxLevel ? data.level : null;
    const round = typeof data.round === "number" && Number.isInteger(data.round) && data.round >= 0 && data.round <= 1000 ? data.round : null;
    const format = data.format === "race" || data.format === "turns" ? data.format : null;
    const mine = cleanDuelScore(data.mine);
    const theirs = cleanDuelScore(data.theirs);
    if (level === null || round === null || !format || !mine || !theirs) return null;
    return { level, round, format, mine, theirs };
}

/** Ishod iz izveštaja jednog uređaja (domaćin je uvek prvi) */
export function reportOutcome(role: DuelRole, report: DuelReport): DuelOutcome {
    const [host, guest] = role === "host" ? [report.mine, report.theirs] : [report.theirs, report.mine];
    const winner = duelWinner(report.format, host, guest);
    return winner === null ? "tie" : winner === 0 ? "host" : "guest";
}

/**
 * Ishod partije kad su stigla oba izveštaja: obračunava se samo kad se slažu oko pobednika
 * (ista partija, isti način). "pending" — čeka se drugi izveštaj; "disagree" — ne slažu se
 * (nema prenosa; ekran i dalje pokazuje pobednika kako ga je video uređaj).
 */
export function agreedOutcome(host: DuelReport | null | undefined, guest: DuelReport | null | undefined): DuelOutcome | "pending" | "disagree" {
    if (!host || !guest) return "pending";
    if (host.level !== guest.level || host.round !== guest.round || host.format !== guest.format) return "disagree";
    const a = reportOutcome("host", host);
    return a === reportOutcome("guest", guest) ? a : "disagree";
}

/** Ključ partije u pozivu: „nivo-partija” */
export function duelKey(level: number, round: number): string {
    return `${level}-${round}`;
}

/**
 * Oznaka obračuna u stanju deteta (`duels`): vrsta sesije („r” dva uređaja, „l” isti uređaj),
 * ključ sesije, nivo i partija. Ista partija ima istu oznaku kod oba deteta.
 */
export function settlementId(scope: "r" | "l", sessionKey: string, level: number, round: number): string {
    return `${scope}:${sessionKey.slice(0, 64)}:${level}:${round}`;
}

// ── Obračun u stanju drugara (idempotentno) ───────────────────────────────────────

export function ledgerEntry(state: Pick<CompanionState, "duels">, id: string): number | null {
    return state.duels?.find((entry) => entry.id === id)?.c ?? null;
}

function withEntry(state: CompanionState, id: string, c: number): CompanionState["duels"] {
    return [...(state.duels ?? []).filter((entry) => entry.id !== id), { id, c }].slice(-DUEL_LEDGER_MAX);
}

/**
 * Poražen daje: najviše `stake`, i nikad više nego što ima. Već obračunat dvoboj se ne menja
 * (`state` null) i vraća isti iznos kao prvi put.
 */
export function applyDuelLoss(state: CompanionState, id: string, stake: number, experiencePoints: number | null | undefined): { state: CompanionState | null; given: number } {
    const existing = ledgerEntry(state, id);
    if (existing !== null) return { state: null, given: Math.max(0, -existing) };
    const given = transferAmount(stake, coinsOf(state, experiencePoints));
    return { state: { ...state, spent: state.spent + given, duels: withEntry(state, id, -given), v: state.v + 1 }, given };
}

/** Pobednik dobija `amount` (koliko je poražen zaista dao); već obračunat dvoboj → null. */
export function applyDuelWin(state: CompanionState, id: string, amount: number): CompanionState | null {
    if (ledgerEntry(state, id) !== null) return null;
    const won = Math.max(0, Math.floor(amount));
    const bonus = (state.bonus ?? 0) + won;
    const next: CompanionState = { ...state, duels: withEntry(state, id, won), v: state.v + 1 };
    if (bonus > 0) next.bonus = bonus;
    return next;
}

// ── Reči ──────────────────────────────────────────────────────────────────────

/** „1 novčić”, „3 novčića”, „5 novčića”, „21 novčić” */
export function coinsPhrase(n: number): string {
    const count = Math.max(0, Math.round(n));
    const last = count % 10;
    const lastTwo = count % 100;
    if (last === 1 && lastTwo !== 11) return `${count} novčić`;
    return `${count} novčića`;
}

export const TIE_COINS_LINE = "Nerešeno — niko ne gubi novčiće.";

export interface StakeLines {
    /** „Lejla dobija 3 novčića” (samo kad je bilo prenosa) */
    winner: string | null;
    /** Nežno detetu koje ovaj put nije pobedilo */
    loser: string | null;
    /** Nerešeno */
    tie: string | null;
}

/**
 * Rečenice o novčićima na kraju dvoboja. `amount` je ono što je poražen zaista dao (0 kad nema
 * uloga ili poražen nema novčića — tada samo pohvala, bez reči o novčićima). Reči ne zavise od
 * pola („dobija”, „daje”), pa važe i za druga čiji se pol ne zna.
 */
export function stakeLines(players: readonly [VersusPlayer, VersusPlayer], winner: 0 | 1 | null, amount: number): StakeLines {
    if (winner === null) return { winner: null, loser: null, tie: TIE_COINS_LINE };
    const loser = players[winner === 0 ? 1 : 0];
    if (amount <= 0) return { winner: null, loser: `${loser.name}, sledeći put možda ti! Bravo za trud.`, tie: null };
    return {
        winner: `${players[winner].name} dobija ${coinsPhrase(amount)}`,
        loser: `${loser.name} daje ${coinsPhrase(amount)} — sledeći put možda ti! Bravo za trud.`,
        tie: null,
    };
}
