// lib/sharedPlay.ts
// „Zajednička tabla” — igra sa drugom na dva uređaja kao JEDNA igra (čist deo: radi u
// pregledaču, na serveru i u testovima; DOM deo je u app/dashboard/child/[id]/playShared.tsx).
//
// Kako radi (domaćin je jedini koji igra pravu igru — „host-authoritative”):
//  • Domaćin pokreće pravu igru. Svako stanje igre (view, isto ono koje ide roditelju koji prati
//    uživo, useGameSync) domaćin šalje gostu kao „snimak” sa rednim brojem.
//  • Gost iscrtava ISTU komponentu igre u režimu monitora (`isMonitor` + `monitorState`), pa oba
//    deteta uvek vide istu tablu. Kad je gost na redu, njegov dodir postaje „ključ radnje” koji
//    ide domaćinu, a domaćin ga izvede na svojoj tabli kao da je dodir bio njegov.
//  • Smenu, rezultat svakog poteza i kraj računa samo domaćin; gost samo prikazuje i šalje dodire.
//
// Zašto ključevi radnji, a ne koordinate ili kopija logike igre (27 igara):
//  • Ključ se izvodi iz STANJA igre (`data-action="choice:mačka"`, `card:3`, `slot:2`; postojeći
//    `data-piece` / `data-slot` / `data-drop` iz prevlačenja važe kao `piece:` / `slot:` / `drop:`),
//    pa je isti na telefonu i na tabletu, uspravno i položeno — raspored se razlikuje, stanje ne.
//  • Domaćin radnju izvodi kroz isti put kao pravi dodir (`click()` na elementu sa tim ključem): igra
//    ne zna za drugi uređaj, sva pravila, pomoć, zvuk i bodovanje ostaju njena. Nema druge kopije
//    logike koja bi mogla da se razide.
//  • Gost pogodak traži po geometriji (pravougaonici elemenata, a za SVG polja tačno popunjen deo),
//    a ne preko `elementFromPoint`: u monitoru su dugmad isključena i bez dodira.
//  • Za retke igre gde je mesto dodira sam zadatak (razlike na slici, korak u lavirintu) element
//    nosi `data-action-point`, a ključ je tačka u delovima tog elementa (`pt:slika-a:0.412,0.530`).
//
// Pouzdanost: svaki snimak ima (epoha, redni broj) — stariji ili isti snimak se odbacuje, a nova
// epoha znači da je domaćin ponovo pokrenuo stranicu. Svaka radnja gosta ima svoj redni broj i broj
// poteza: primenjuje se najviše jednom, samo dok je gost na redu i samo u potezu za koji je poslata
// (zakasneo dodir iz prošlog poteza ne „pojede” tuđi potez). Gost posle osvežavanja traži poslednji
// snimak i nastavlja; kad domaćin ode, gost dobija mirnu poruku; kad gost ode, domaćin igra dalje sam.
//
// Smena (istraživanja: kratko i predvidljivo čekanje, dete koje čeka uči gledajući — učenje po
// modelu; jasan znak čiji je red smanjuje napetost kod dece sa autizmom):
//  • podrazumevano jedan zadatak (`round`) — jedno dete;
//  • „Spoji parove”: potez su dve kartice; pronađen par — isto dete igra opet (klasična pravila);
//  • slaganje i prevlačenje gde je zadatak cela tabla (ranac, odeća, korpa, hranjenje, mama i
//    beba): jedan postavljen komad — jedan potez;
//  • red prelazi samo kad oznaka poteza pređe svoj dosadašnji najveći broj (dugme „Nazad” u priči
//    ili gumica u bojanci ne vraćaju red).
//
// Dvoboj „jedan po jedan” (lib/versusFormat.ts bira način; ovde je samo tabla i bodovanje): svaki
// potez donosi `SharedTurnResult` za dete koje ga je odigralo; `onSharedTurn` ga javlja ekranu
// dvoboja (playVersus.tsx), a `sharedScores` daje rezultat oba deteta.

import type { GameResult } from "@/app/components/games/kit/types";
import { GAMES, type GameId } from "./games";
import type { PlayMode } from "./versus";

// ── Ugovor sa dvobojem (playVersus.tsx, lib/versusFormat.ts) ─────────────────

export type SharedRole = "host" | "guest";

/** Rezultat jednog poteza na zajedničkoj tabli: ko ga je odigrao i da li je bio tačan. */
export type SharedTurnResult = { player: SharedRole; correct: boolean; round: number };

export type SharedTurnListener = (result: SharedTurnResult, scores: SharedScores) => void;

export interface SharedScores {
    host: number;
    guest: number;
}

const turnListeners = new Set<SharedTurnListener>();
let turnLog: SharedTurnResult[] = [];

/**
 * Prijava na rezultate poteza (na oba uređaja: domaćin ih računa, gost ih dobija u snimku).
 * Vraća funkciju za odjavu. Uz svaki potez stiže i zbir tačnih poteza oba deteta.
 */
export function onSharedTurn(listener: SharedTurnListener): () => void {
    turnListeners.add(listener);
    return () => {
        turnListeners.delete(listener);
    };
}

/** Rezultati poteza tekućeg nivoa (prazno na početku svakog nivoa). */
export function sharedTurnLog(): readonly SharedTurnResult[] {
    return turnLog;
}

/** Zbir tačnih poteza po detetu. */
export function sharedScores(results: readonly SharedTurnResult[]): SharedScores {
    const scores = { host: 0, guest: 0 };
    for (const result of results) if (result.correct) scores[result.player] += 1;
    return scores;
}

/** Novi nivo na zajedničkoj tabli: rezultati kreću od nule. */
export function resetSharedTurns() {
    turnLog = [];
}

/** Javlja nove rezultate (poziva ih zajednička tabla, ne igre ni ekran dvoboja). */
export function publishSharedTurns(all: readonly SharedTurnResult[]) {
    if (all.length < turnLog.length) turnLog = [];
    const fresh = all.slice(turnLog.length);
    if (fresh.length === 0) return;
    turnLog = [...turnLog, ...fresh];
    const scores = sharedScores(turnLog);
    for (const result of fresh) turnListeners.forEach((fn) => fn(result, scores));
}

// ── Koje igre imaju zajedničku tablu ─────────────────────────────────────────

/** Kako se meri jedan potez u igri */
export type TurnRule = "round" | "pieces" | "pairs";

/**
 * Igre bez zajedničke table igraju se na dva uređaja kao i ranije (svako svoju kopiju istog
 * nivoa, uz traku sa drugom). Razlog je uvek isti oblik zadatka: pisanje prstom je neprekidan
 * pokret — dodir se ne može poslati kao jedan ključ, a potez koji kasni preko mreže lomi liniju
 * slova; deca ga uče na svom ekranu. „Slušaj i spoji” se na dva uređaja ni ne nudi (zvuk je sve).
 */
export const SHARED_FALLBACK: Readonly<Partial<Record<GameId, string>>> = {
    letters: "Pisanje slova prstom je neprekidan pokret: svako piše na svom ekranu.",
    numbers: "Pisanje cifara prstom je neprekidan pokret: svako piše na svom ekranu.",
    "sound-to-image": "Igra zvukova se ne igra na dva uređaja.",
};

/** Igre u kojima je zadatak cela tabla, pa je potez jedan postavljen komad */
const PIECE_COUNTERS: Readonly<Partial<Record<GameId, (view: Record<string, unknown>) => number>>> = {
    weather: (v) => lengthOf(v.worn),
    market: (v) => lengthOf(v.basket) + lengthOf(v.paid),
    families: (v) => lengthOf(v.placed),
    backpack: (v) => lengthOf(v.packed),
    food: (v) => lengthOf(v.fed),
};

export function hasSharedBoard(id: GameId | null | undefined): boolean {
    return Boolean(id) && GAMES.some((g) => g.id === id) && !(id! in SHARED_FALLBACK);
}

/**
 * Da li se ova igra sa drugom na dva uređaja igra na zajedničkoj tabli: „Zajedno” uvek kad igra
 * ima tablu; dvoboj samo u načinu „jedan po jedan” (`format` iz lib/versusFormat.ts) — „ko je
 * brži” ostaje trka na dve table.
 */
export function sharedBoardFor(id: GameId | null | undefined, mode: PlayMode, format?: "turns" | "race" | null): boolean {
    if (!hasSharedBoard(id)) return false;
    return mode === "together" || format === "turns";
}

export function turnRuleFor(id: GameId, view?: Record<string, unknown> | null): TurnRule {
    // „Zapamti gde je šta bilo” (nivoi 11–15) nema kartice ni poteze: jedan predmet — jedan potez
    if (id === "memory" && (!view || Array.isArray(view.cards))) return "pairs";
    return id in PIECE_COUNTERS ? "pieces" : "round";
}

function num(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function lengthOf(value: unknown): number {
    return Array.isArray(value) ? value.length : 0;
}

/**
 * Oznaka poteza iz stanja igre: raste kad potez prođe.
 *  • zadatak: `round`;
 *  • komadi: broj postavljenih komada u tekućem zadatku (vidi `passedTurn`);
 *  • parovi: broj promašaja (`moves` − pronađeni parovi) — pronađen par ne pomera oznaku.
 */
export function turnMarker(id: GameId, view: Record<string, unknown>): number {
    const rule = turnRuleFor(id, view);
    if (rule === "pairs") return Math.max(0, num(view.moves) - lengthOf(view.matched));
    if (rule === "pieces") return PIECE_COUNTERS[id]?.(view) ?? 0;
    return Math.max(1, num(view.round));
}

/**
 * Da li je potez prošao, i nova oznaka. Kod komada: nov komad u istom zadatku je nov potez; nov
 * zadatak je nov potez samo posle zadatka bez komada (izbor slike) — posle cele table red je već
 * prešao sa poslednjim komadom.
 */
function passedTurn(id: GameId, rule: TurnRule, state: SharedTurnState, view: Record<string, unknown>): { passed: boolean; mark: number } {
    const marker = turnMarker(id, view);
    if (rule !== "pieces") return { passed: marker > state.mark, mark: Math.max(marker, state.mark) };
    const round = Math.max(1, num(view.round));
    if (round > state.round) return { passed: state.mark === 0 || marker > 0, mark: marker };
    if (round < state.round) return { passed: false, mark: state.mark };
    return { passed: marker > state.mark, mark: Math.max(marker, state.mark) };
}

// ── Smena i rezultati poteza (računa domaćin) ──────────────────────────────────

interface Counts {
    correct: number;
    incorrect: number;
    prompted: number;
    matched: number;
}

export interface Tally {
    turns: number;
    correct: number;
    prompted: number;
}

export interface SharedTurnState {
    /** Ko je na redu */
    turn: SharedRole;
    /** Redni broj poteza (radnja gosta važi samo za potez u kom je poslata) */
    turnNo: number;
    /** Najveća oznaka poteza do sada */
    mark: number;
    /** Brojači igre na početku tekućeg poteza */
    base: Counts;
    round: number;
    results: SharedTurnResult[];
    tally: Record<SharedRole, Tally>;
    finished: boolean;
}

function countsOf(view: Record<string, unknown>): Counts {
    return { correct: num(view.correctCount), incorrect: num(view.incorrectCount), prompted: num(view.promptedCount), matched: lengthOf(view.matched) };
}

const EMPTY_TALLY: Tally = { turns: 0, correct: 0, prompted: 0 };

/** Početak nivoa: prvi je na redu domaćin (on je pozvao druga i on je pokrenuo nivo). */
export function initialTurnState(id: GameId, view: Record<string, unknown>, first: SharedRole = "host"): SharedTurnState {
    return {
        turn: first,
        turnNo: 1,
        mark: turnMarker(id, view),
        base: countsOf(view),
        round: Math.max(1, num(view.round)),
        results: [],
        tally: { host: { ...EMPTY_TALLY }, guest: { ...EMPTY_TALLY } },
        finished: false,
    };
}

export function otherRole(role: SharedRole): SharedRole {
    return role === "host" ? "guest" : "host";
}

function record(state: SharedTurnState, player: SharedRole, correct: boolean, prompted: boolean, round: number): SharedTurnState {
    const tally = state.tally[player];
    return {
        ...state,
        results: [...state.results, { player, correct, round }],
        tally: { ...state.tally, [player]: { turns: tally.turns + 1, correct: tally.correct + (correct ? 1 : 0), prompted: tally.prompted + (prompted && !correct ? 1 : 0) } },
    };
}

/**
 * Rezultat poteza koji je upravo prošao (null = zadatak bez ocene, npr. pokazni, kad se nijedan
 * brojač nije pomerio). Zadatak: tačan je samo samostalan odgovor iz prvog pokušaja (kao i inače);
 * komad: tačan kad je legao bez pogrešnog pokušaja i bez pomoći.
 */
function turnOutcome(rule: TurnRule, base: Counts, now: Counts): { correct: boolean; prompted: boolean } | null {
    const prompted = now.prompted > base.prompted;
    if (rule === "pieces") return { correct: now.incorrect === base.incorrect && !prompted, prompted };
    if (now.correct === base.correct && now.incorrect === base.incorrect && !prompted) return null;
    return { correct: now.correct > base.correct, prompted };
}

/**
 * Novo stanje igre → smena i rezultati. `solo`: drug nije tu, pa red ostaje kod domaćina.
 *  • parovi: svaki pronađen par je tačan potez onoga ko je na redu (i igra opet); promašaj je
 *    netačan potez i red prelazi;
 *  • ostalo: kad oznaka poteza pređe najveću dosadašnju, potez je gotov i red prelazi.
 */
export function stepTurn(id: GameId, state: SharedTurnState, view: Record<string, unknown>, solo = false): SharedTurnState {
    if (state.finished) return state;
    const rule = turnRuleFor(id, view);
    const now = countsOf(view);
    const { passed, mark } = passedTurn(id, rule, state, view);
    let next = state;
    const player = state.turn;

    if (rule === "pairs" && now.matched > state.base.matched) {
        for (let i = state.base.matched; i < now.matched; i++) next = record(next, player, true, false, i + 1);
        next = { ...next, base: { ...now, incorrect: state.base.incorrect, prompted: state.base.prompted } };
    }
    if (!passed) return { ...next, mark, round: Math.max(1, num(view.round)) };

    if (rule === "pairs") {
        next = record(next, player, false, false, Math.max(1, num(view.round)));
    } else {
        const outcome = turnOutcome(rule, next.base, now);
        if (outcome) next = record(next, player, outcome.correct, outcome.prompted, next.round);
    }
    return {
        ...next,
        mark,
        base: now,
        round: Math.max(1, num(view.round)),
        turn: solo ? "host" : otherRole(player),
        turnNo: next.turnNo + 1,
    };
}

/** Kraj nivoa: poslednji zadatak nema sledeći `round`, pa se njegov potez beleži ovde. */
export function finishTurns(id: GameId, state: SharedTurnState, view: Record<string, unknown>): SharedTurnState {
    if (state.finished) return state;
    let next = stepTurn(id, state, view);
    const rule = turnRuleFor(id, view);
    if (rule === "round") {
        const outcome = turnOutcome(rule, next.base, countsOf(view));
        if (outcome) next = record(next, next.turn, outcome.correct, outcome.prompted, next.round);
    }
    return { ...next, finished: true };
}

/** Kad drug ode: red se vraća domaćinu (i radnje gosta iz starog poteza više ne važe). */
export function takeTurn(state: SharedTurnState, role: SharedRole): SharedTurnState {
    return state.turn === role ? state : { ...state, turn: role, turnNo: state.turnNo + 1 };
}

/**
 * Rezultat nivoa koji se čuva u profilu svakog deteta:
 *  • „Zajedno”: jedna igra, jedan rezultat — oba deteta dobijaju ceo rezultat table;
 *  • dvoboj: svako svoje poteze (tačni potezi od svih njegovih poteza; poeni srazmerno).
 */
export function playerResult(team: GameResult, state: SharedTurnState | null, role: SharedRole, mode: "together" | "duel"): GameResult {
    if (mode === "together" || !state) return team;
    const mine = state.tally[role];
    const all = state.tally.host.turns + state.tally.guest.turns;
    const total = Math.max(1, mine.turns);
    const correct = Math.min(mine.correct, total);
    return {
        score: all > 0 ? Math.round((team.score * mine.turns) / all) : 0,
        durationSec: team.durationSec,
        correct,
        total,
        prompted: Math.min(mine.prompted, total - correct),
    };
}

// ── Poruke kanala ──────────────────────────────────────────────────────────────

/** Redosled poruka: (epoha, redni broj). Epoha je trenutak kad je pošiljalac pokrenuo stranicu. */
export interface Stamp {
    epoch: number;
    seq: number;
}

/** Da li je `next` noviji od poslednjeg primljenog (`last`). Stariji i isti se odbacuju. */
export function isNewer(next: Stamp, last: Stamp | null): boolean {
    if (!last) return true;
    if (next.epoch !== last.epoch) return next.epoch > last.epoch;
    return next.seq > last.seq;
}

export interface SharedTap {
    by: SharedRole;
    key: string;
    /** Raste sa svakim dodirom (isti ključ dva puta zaredom je i dalje novi dodir) */
    n: number;
}

export interface SharedSay {
    n: number;
    text: string;
    emotion?: string;
}

/** Snimak table koji domaćin šalje gostu */
export interface MirrorMessage extends Stamp {
    /** Partija: igra, nivo i pokušaj domaćina („memory-3-2”) */
    session: string;
    game: GameId;
    level: number;
    view: Record<string, unknown>;
    turn: SharedRole;
    turnNo: number;
    /** Drug nije tu: domaćin igra sam */
    solo: boolean;
    /** Učitelj kod domaćina govori: dodiri čekaju */
    listening: boolean;
    tap: SharedTap | null;
    /** Poslednja primenjena radnja gosta */
    ack: Stamp | null;
    results: SharedTurnResult[];
    /** Kraj nivoa: rezultat za profil svakog deteta */
    final: { host: GameResult; guest: GameResult } | null;
    say: SharedSay | null;
}

/** Dodir gosta: jedan ključ, ili dva za prevlačenje (komad, pa mesto) */
export interface ActionMessage extends Stamp {
    session: string;
    turnNo: number;
    keys: string[];
}

const MAX_KEY = 120;
// Ključ: slova (i naša), brojevi i nekoliko znakova; bez razmaka i navodnika
const KEY_PATTERN = /^[\p{L}\p{N}_.:,+\-/]+$/u;
const SESSION_PATTERN = /^[a-z-]{2,30}-\d{1,2}-\d{1,6}$/;
const MAX_RESULTS = 200;

export function isActionKey(value: unknown): value is string {
    return typeof value === "string" && value.length > 0 && value.length <= MAX_KEY && KEY_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stampOf(raw: Record<string, unknown>): Stamp | null {
    const { epoch, seq } = raw;
    if (typeof epoch !== "number" || !Number.isSafeInteger(epoch) || epoch <= 0) return null;
    if (typeof seq !== "number" || !Number.isSafeInteger(seq) || seq < 0) return null;
    return { epoch, seq };
}

function roleOf(value: unknown): SharedRole | null {
    return value === "host" || value === "guest" ? value : null;
}

function resultOf(raw: unknown): GameResult | null {
    if (!isRecord(raw)) return null;
    const score = num(raw.score);
    const total = Math.min(num(raw.total), 1000);
    const correct = Math.min(num(raw.correct), total);
    return { score, durationSec: Math.max(1, num(raw.durationSec)), correct, total, prompted: Math.min(num(raw.prompted), total - correct) };
}

/** Snimak od domaćina; sve se proverava (kanal je javni Broadcast). Neispravno → null. */
export function parseMirror(raw: unknown): MirrorMessage | null {
    if (!isRecord(raw)) return null;
    const stamp = stampOf(raw);
    const turn = roleOf(raw.turn);
    const game = GAMES.find((g) => g.id === raw.game)?.id;
    if (!stamp || !turn || !game || typeof raw.session !== "string" || !SESSION_PATTERN.test(raw.session) || !isRecord(raw.view)) return null;
    const level = num(raw.level);
    if (level < 1 || level > 15) return null;
    const tap = isRecord(raw.tap) && roleOf(raw.tap.by) && isActionKey(raw.tap.key) ? { by: roleOf(raw.tap.by)!, key: raw.tap.key, n: num(raw.tap.n) } : null;
    const ack = isRecord(raw.ack) ? stampOf(raw.ack) : null;
    const results = Array.isArray(raw.results)
        ? raw.results
              .slice(-MAX_RESULTS)
              .filter(isRecord)
              .map((r) => ({ player: roleOf(r.player), correct: r.correct === true, round: num(r.round) }))
              .filter((r): r is SharedTurnResult => r.player !== null)
        : [];
    const host = isRecord(raw.final) ? resultOf(raw.final.host) : null;
    const guest = isRecord(raw.final) ? resultOf(raw.final.guest) : null;
    const say = isRecord(raw.say) && typeof raw.say.text === "string" && raw.say.text.length <= 400 ? { n: num(raw.say.n), text: raw.say.text, ...(typeof raw.say.emotion === "string" ? { emotion: raw.say.emotion.slice(0, 20) } : {}) } : null;
    return {
        ...stamp,
        session: raw.session,
        game,
        level,
        view: raw.view,
        turn,
        turnNo: num(raw.turnNo),
        solo: raw.solo === true,
        listening: raw.listening === true,
        tap,
        ack,
        results,
        final: host && guest ? { host, guest } : null,
        say,
    };
}

/** Radnja gosta; neispravno → null. */
export function parseAction(raw: unknown): ActionMessage | null {
    if (!isRecord(raw)) return null;
    const stamp = stampOf(raw);
    if (!stamp || typeof raw.session !== "string" || !SESSION_PATTERN.test(raw.session)) return null;
    if (!Array.isArray(raw.keys) || raw.keys.length < 1 || raw.keys.length > 2 || !raw.keys.every(isActionKey)) return null;
    const turnNo = num(raw.turnNo);
    if (turnNo < 1) return null;
    return { ...stamp, session: raw.session, turnNo, keys: raw.keys as string[] };
}

export type ActionVerdict = "apply" | "duplicate" | "not-your-turn" | "stale" | "other-session" | "finished";

/**
 * Da li domaćin sme da primeni radnju gosta. Primenjuje se najviše jednom (redni broj), samo dok
 * je gost na redu i samo u potezu za koji je poslata.
 */
export function judgeAction(
    ctx: { session: string; turn: SharedRole; turnNo: number; solo: boolean; finished: boolean; last: Stamp | null },
    action: ActionMessage
): ActionVerdict {
    if (action.session !== ctx.session) return "other-session";
    if (!isNewer(action, ctx.last)) return "duplicate";
    if (ctx.finished) return "finished";
    if (ctx.solo || ctx.turn !== "guest") return "not-your-turn";
    if (action.turnNo !== ctx.turnNo) return "stale";
    return "apply";
}

/** Da li dodir na ovom uređaju sme u igru: samo kad je dete na redu (i igra traje). */
export function mayTouch(role: SharedRole, turn: SharedRole, solo: boolean): boolean {
    return solo ? role === "host" : role === turn;
}

// ── Ključevi radnji iz elemenata (bez DOM-a: dovoljno je `getAttribute`) ──────

export interface KeyedElement {
    getAttribute(name: string): string | null;
}

const ALIASES: readonly [attribute: string, prefix: string][] = [
    ["data-piece", "piece"],
    ["data-slot", "slot"],
    ["data-drop", "drop"],
];

/** Ključ radnje elementa: `data-action`, ili `data-piece`/`data-slot`/`data-drop` kao `piece:`/`slot:`/`drop:`. */
export function actionKeyOf(el: KeyedElement): string | null {
    const own = el.getAttribute("data-action");
    if (own) return isActionKey(own) ? own : null;
    for (const [attribute, prefix] of ALIASES) {
        const value = el.getAttribute(attribute);
        if (value) {
            const key = `${prefix}:${value}`;
            return isActionKey(key) ? key : null;
        }
    }
    return null;
}

/** CSS izbor elementa sa ključem (vrednost je proverena: bez navodnika i razmaka). */
export function selectorFor(key: string): string | null {
    if (!isActionKey(key)) return null;
    const point = parsePointKey(key);
    if (point) return `[data-action-point="${point.name}"]`;
    const own = `[data-action="${key}"]`;
    const alias = ALIASES.find(([, prefix]) => key.startsWith(`${prefix}:`));
    return alias ? `${own}, [${alias[0]}="${key.slice(alias[1].length + 1)}"]` : own;
}

/** Tačka u delovima elementa: `pt:<ime>:<x>,<y>` (0–1). */
export function pointKey(name: string, fx: number, fy: number): string {
    const clamp = (v: number) => Math.min(1, Math.max(0, v)).toFixed(3);
    return `pt:${name}:${clamp(fx)},${clamp(fy)}`;
}

export function parsePointKey(key: string): { name: string; fx: number; fy: number } | null {
    const match = /^pt:([\p{L}\p{N}_-]{1,40}):(0(?:\.\d{1,3})?|1(?:\.0{1,3})?),(0(?:\.\d{1,3})?|1(?:\.0{1,3})?)$/u.exec(key);
    if (!match) return null;
    return { name: match[1], fx: Number(match[2]), fy: Number(match[3]) };
}

/** Pogodak pod prstom: element sa ključem, njegova površina i redosled u stablu */
export interface HitCandidate {
    key: string;
    area: number;
    /** Redni broj u stablu (kasniji je nacrtan iznad) */
    order: number;
    /** SVG oblik pogođen tačno po popunjenom delu (ne samo po pravougaoniku) */
    exact?: boolean;
    /** Tačka u elementu (`data-action-point`): samo kad ništa drugo nije pogođeno */
    point?: boolean;
}

/**
 * Koji ključ znači dodir: tačno pogođen SVG oblik (najgornji), pa najmanji element (unutrašnji —
 * karta u korpi, a ne korpa), pa tačka na slici. Kod puštanja prevlačenja prednost imaju mesta
 * (`slot:`/`drop:`), jer prst pušta komad NA mesto, ne na komad koji već leži u njemu.
 */
export function pickHit(candidates: readonly HitCandidate[], preferPlaces = false): string | null {
    const regular = candidates.filter((c) => !c.point);
    const pool = preferPlaces && regular.some((c) => isPlace(c.key)) ? regular.filter((c) => isPlace(c.key)) : regular;
    if (pool.length > 0) {
        const sorted = [...pool].sort((a, b) => Number(Boolean(b.exact)) - Number(Boolean(a.exact)) || a.area - b.area || b.order - a.order);
        return sorted[0].key;
    }
    const points = candidates.filter((c) => c.point).sort((a, b) => a.area - b.area || b.order - a.order);
    return points[0]?.key ?? null;
}

function isPlace(key: string): boolean {
    return key.startsWith("slot:") || key.startsWith("drop:");
}

/** Oznaka partije domaćina (igra, nivo, pokušaj) */
export function sessionKey(game: GameId, level: number, attempt: number): string {
    return `${game}-${level}-${attempt}`;
}
