// lib/invite.ts
// „Igraj sa drugom na drugom uređaju” — čist deo (radi na serveru, u pregledaču i u testovima).
//
// Dete (domaćin) prvo izabere igru, nivo i način igre, pa napravi poziv: server mu da kod od
// četiri sličice (iste sličice kao tajni kod za prijavu). Drug na SVOM uređaju, prijavljen u SVOJ
// profil, izabere te četiri sličice i pre ulaska vidi karticu poziva: ko ga zove, koja igra i
// nivo i da li je „zajedno” ili dvoboj, pa izabere „Prihvati” ili „Ne sada”. Domaćin za to vreme
// vidi „Čekamo da Amar prihvati…”. Posle prvog zajedničkog igranja deca se pamte kao „drugovi”
// (lib/playFriends.ts), pa sledeći put domaćin može da pozove druga bez koda: kartica poziva
// iskoči na stranici druga (ako je otvorena). Posle „Prihvati” oboje igraju istu igru i isti
// nivo istovremeno, svako na svom uređaju (rezultati idu svakom u njegov profil), a preko kanala
// vide traku sa drugom: drugar, ime, zadatak i zvezdice. Podrazumevano je sve zajedničko — nikad poređenje;
// samo kad dete ili odrasli izabere „Takmičenje” (lib/versus.ts), traka postaje „VS” rezultat.
//
// Poziv se čuva u podešavanjima domaćina (`children.settings.invite`), bez nove tabele.
// Ovde su: oblik poziva i njegovo čišćenje, rokovi, reči kartice poziva, poruke kanala i
// zajedničke zvezdice.
//
// Zašto kartica poziva pre ulaska (deca od 3 do 10 godina i deca sa autizmom): predvidljivost —
// dete unapred zna sa kim, šta i kako igra; izbor je njegov (dva velika dugmeta, bez trećeg),
// a „Ne sada” je jednako mirno kao „Prihvati”: domaćin ne vidi tužno lice, samo sledeći korak.

import { GAMES, MAX_LEVEL, starsForGame, type GameId } from "./games";
import { PIN_LENGTH, VISUAL_PIN_CATEGORIES } from "./visualPinData";
import { playModeOr, type PlayMode } from "./versus";

/** Kod važi 10 minuta (detetu se vreme ne prikazuje; posle toga „Kod više ne važi”). */
export const INVITE_CODE_TTL_MS = 10 * 60 * 1000;
/** Igra sa drugom posle ulaska druga traje najduže tri sata (posle toga se poziv briše). */
export const INVITE_SESSION_TTL_MS = 3 * 60 * 60 * 1000;
/**
 * Drug koji vidi karticu poziva ima tri minuta da odgovori — bez sata i žurbe: vreme se detetu ne
 * prikazuje, a posle roka domaćin mirno vidi „Amar sada nije tu”.
 */
export const REQUEST_ANSWER_TTL_MS = 3 * 60 * 1000;
/** Poziv drugu sa spiska (bez koda): ako ga stranica druga ne prikaže za minut, drug „nije tu”. */
export const REQUEST_SEEN_TTL_MS = 60 * 1000;
/** Koliko dugo domaćin još vidi odgovor „Ne sada” / „nije tu” (posle toga se poziv samo briše). */
export const ANSWER_SHOWN_TTL_MS = 10 * 60 * 1000;

/** Igre koje se nude za igru na dva uređaja: sve osim igre zvukova (zvuk je u njoj sve). */
export const REMOTE_GAMES: readonly GameId[] = GAMES.map((g) => g.id).filter((id) => id !== "sound-to-image");

export function isRemoteGame(id: unknown): id is GameId {
    return typeof id === "string" && (REMOTE_GAMES as readonly string[]).includes(id);
}

/** Drugar onako kako ga vidi drug: samo lik, izgled i odeća. */
export interface InviteCompanion {
    kind: string;
    skin: string | null;
    wear: Record<string, string>;
}

/** Drug koji je ušao: samo ime i drugar (ništa drugo o detetu se ne čuva). */
export interface InviteGuest {
    firstName: string;
    companion: InviteCompanion;
}

/** Kako je drug dobio poziv: unosom koda ili sa spiska drugova (bez koda). */
export type RequestVia = "code" | "direct";

/**
 * Poziv koji čeka odgovor druga („Prihvati” / „Ne sada”). Ključ ima samo drug (njime odgovara);
 * ID druga je samo na serveru — domaćin vidi samo ime i drugara.
 */
export interface InviteRequest {
    key: string;
    guestId: number;
    firstName: string;
    companion: InviteCompanion;
    via: RequestVia;
    /** Kada je poziv krenuo ka drugu (ISO) */
    at: string;
    /** Kada ga je stranica druga prikazala (poziv sa spiska; poziv kodom je viđen odmah) */
    seenAt?: string;
}

/** Drug je rekao „Ne sada” (ili nije odgovorio): domaćin to mirno vidi, pa bira dalje. */
export interface InviteAnswer extends InviteGuest {
    at: string;
}

/** Poziv u `children.settings.invite` domaćina. */
export interface StoredInvite {
    /** Četiri sličice (kao tajni kod: po jedna iz svake grupe, spojene zarezom); null = iskorišćen */
    code: string | null;
    /** Nasumičan ključ iz kog server (uz tajnu) pravi naziv kanala; nikad se ne izvodi iz koda */
    channelKey: string;
    /** Do kada kod važi (ISO) */
    expiresAt: string;
    hostFirstName: string;
    game: GameId;
    level: number;
    /** „Zajedno” ili „Takmičenje”; stari pozivi bez ovog polja su „zajedno” */
    mode: PlayMode;
    createdAt: string;
    guest?: InviteGuest;
    joinedAt?: string;
    /** Drug je uneo kod (ili je pozvan sa spiska) i još nije odgovorio */
    request?: InviteRequest;
    /** Drug je rekao „Ne sada” */
    declined?: InviteAnswer;
}

const KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const NAME_MAX = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isoOrNull(value: unknown): string | null {
    if (typeof value !== "string" || value.length > 40) return null;
    return Number.isNaN(Date.parse(value)) ? null : value;
}

/** Samo ime (prva reč), najviše 30 znakova — isto kao spisak drugova (friends). */
export function firstNameOnly(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const first = raw.trim().split(/\s+/)[0]?.slice(0, NAME_MAX) ?? "";
    return first.length > 0 ? first : null;
}

/** Kod od četiri sličice: po jedna iz svake grupe, redom; inače null. */
export function normalizeInviteCode(value: unknown): string | null {
    const ids = Array.isArray(value) ? value : typeof value === "string" && value.length <= 200 ? value.split(",") : null;
    if (!ids || ids.length !== PIN_LENGTH) return null;
    const clean = ids.map((id) => (typeof id === "string" ? id.trim() : ""));
    const valid = VISUAL_PIN_CATEGORIES.every((category, index) => category.items.some((item) => item.id === clean[index]));
    return valid ? clean.join(",") : null;
}

/** Nasumičan kod; `randomIndex(n)` vraća ceo broj 0…n-1 (na serveru crypto.randomInt). */
export function randomInviteCode(randomIndex: (n: number) => number): string {
    return VISUAL_PIN_CATEGORIES.map((category) => category.items[randomIndex(category.items.length)].id).join(",");
}

/** Drugar iz sačuvanih ili primljenih podataka, ograničen i prečišćen; neispravno → null. */
export function cleanCompanion(raw: unknown): InviteCompanion | null {
    if (!isRecord(raw) || typeof raw.kind !== "string" || raw.kind.length > 40) return null;
    const wear: Record<string, string> = {};
    if (isRecord(raw.wear)) {
        for (const [slot, item] of Object.entries(raw.wear).slice(0, 12)) {
            if (typeof item === "string" && slot.length <= 40 && item.length <= 60) wear[slot] = item;
        }
    }
    return { kind: raw.kind, skin: typeof raw.skin === "string" && raw.skin.length <= 60 ? raw.skin : null, wear };
}

export function isRequestKey(value: unknown): value is string {
    return typeof value === "string" && KEY_PATTERN.test(value);
}

function cleanPerson(raw: unknown): InviteGuest | null {
    if (!isRecord(raw)) return null;
    const firstName = firstNameOnly(raw.firstName);
    const companion = cleanCompanion(raw.companion);
    return firstName && companion ? { firstName, companion } : null;
}

function cleanRequest(raw: unknown): InviteRequest | null {
    if (!isRecord(raw)) return null;
    const person = cleanPerson(raw);
    const at = isoOrNull(raw.at);
    const guestId = typeof raw.guestId === "number" && Number.isSafeInteger(raw.guestId) && raw.guestId > 0 ? raw.guestId : null;
    const via = raw.via === "code" || raw.via === "direct" ? raw.via : null;
    if (!person || !at || !guestId || !via || !isRequestKey(raw.key)) return null;
    const seenAt = isoOrNull(raw.seenAt);
    return { key: raw.key, guestId, ...person, via, at, ...(seenAt ? { seenAt } : {}) };
}

/** Sačuvan poziv iz podešavanja; sve neispravno → null (kao da poziva nema). */
export function parseStoredInvite(raw: unknown): StoredInvite | null {
    if (!isRecord(raw)) return null;
    const channelKey = typeof raw.channelKey === "string" && KEY_PATTERN.test(raw.channelKey) ? raw.channelKey : null;
    const expiresAt = isoOrNull(raw.expiresAt);
    const createdAt = isoOrNull(raw.createdAt);
    const hostFirstName = firstNameOnly(raw.hostFirstName);
    const level = typeof raw.level === "number" && Number.isInteger(raw.level) && raw.level >= 1 && raw.level <= MAX_LEVEL ? raw.level : null;
    if (!channelKey || !expiresAt || !createdAt || !hostFirstName || !level || !isRemoteGame(raw.game)) return null;
    const code = raw.code === null ? null : normalizeInviteCode(raw.code);
    if (raw.code !== null && code === null) return null;

    const guest = cleanPerson(raw.guest) ?? undefined;
    const joinedAt = isoOrNull(raw.joinedAt) ?? undefined;
    // Stari pozivi nemaju ni zahtev ni odgovor: ostaju kakvi su bili (čeka se kod ili se igra)
    const request = !guest ? (cleanRequest(raw.request) ?? undefined) : undefined;
    const declinedPerson = !guest ? cleanPerson(raw.declined) : null;
    const declinedAt = isRecord(raw.declined) ? isoOrNull(raw.declined.at) : null;
    const declined = declinedPerson && declinedAt ? { ...declinedPerson, at: declinedAt } : undefined;
    return {
        code,
        channelKey,
        expiresAt,
        hostFirstName,
        game: raw.game,
        level,
        mode: playModeOr(raw.mode),
        createdAt,
        ...(guest ? { guest } : {}),
        ...(guest && joinedAt ? { joinedAt } : {}),
        ...(request ? { request } : {}),
        ...(declined ? { declined } : {}),
    };
}

/**
 * Stanje poziva u trenutku `now`:
 *  • waiting  — kod još važi i niko ga nije uneo
 *  • asking   — drug je uneo kod (ili je pozvan sa spiska) i gleda karticu poziva
 *  • joined   — drug je prihvatio (ili ušao starim putem); igra traje do `INVITE_SESSION_TTL_MS`
 *  • declined — drug je rekao „Ne sada”
 *  • missed   — drug nije odgovorio (poziv sa spiska nije ni stigao do otvorene stranice)
 *  • expired  — kod je istekao pre ulaska, igra sa drugom je predugo trajala, ili je odgovor star
 */
export type InviteStatus = "waiting" | "asking" | "joined" | "declined" | "missed" | "expired";

/** Do kada drug može da odgovori na poziv (ms od 1970); posle toga je „nije tu”. */
export function requestDeadline(request: InviteRequest): number {
    if (request.via === "direct" && !request.seenAt) return Date.parse(request.at) + REQUEST_SEEN_TTL_MS;
    return Date.parse(request.seenAt ?? request.at) + REQUEST_ANSWER_TTL_MS;
}

export function inviteStatus(invite: StoredInvite, now: number = Date.now()): InviteStatus {
    if (invite.guest && invite.joinedAt) {
        return now - Date.parse(invite.joinedAt) < INVITE_SESSION_TTL_MS ? "joined" : "expired";
    }
    if (invite.declined) return now - Date.parse(invite.declined.at) < ANSWER_SHOWN_TTL_MS ? "declined" : "expired";
    if (invite.request) {
        const deadline = requestDeadline(invite.request);
        if (now < deadline) return "asking";
        return now - deadline < ANSWER_SHOWN_TTL_MS ? "missed" : "expired";
    }
    if (invite.code === null) return "expired";
    return now < Date.parse(invite.expiresAt) ? "waiting" : "expired";
}

// ── Reči kartice poziva ─────────────────────────────────────────────────────────

/**
 * Šta drug vidi na kartici poziva, pre nego što prihvati: ko ga zove, igra, nivo i način igre.
 * Samo ime, bez roda (pol drugog deteta se ne šalje): „te zove”, „te izaziva”.
 */
export function requestLine(hostName: string, gameTitle: string, level: number, mode: PlayMode): string {
    if (mode === "versus") return `${hostName} te izaziva na dvoboj u igri ${gameTitle} — Nivo ${level}`;
    return `${hostName} te zove da igrate zajedno: ${gameTitle}`;
}

/** Isto, za glas: bez imena drugog deteta (imena ne idu servisu za govor), bez „dodirni”. */
export function requestSpeech(gameTitle: string, mode: PlayMode): string {
    return mode === "versus" ? `Drug te izaziva na dvoboj. Igra: ${gameTitle}.` : `Drug te zove da igrate zajedno. Igra: ${gameTitle}.`;
}

/** Domaćin čeka odgovor */
export function askingLine(friendName: string): string {
    return `Čekamo da ${friendName} prihvati…`;
}

/** Drug je prihvatio (bez roda: „Amar kaže: može!”) */
export function acceptedLine(friendName: string): string {
    return `${friendName} kaže: može!`;
}

/** Drug je rekao „Ne sada” — mirno, bez tužnog lica, sa sledećim korakom */
export function declinedLine(friendName: string): string {
    return `${friendName} sada ne može. Probaj kasnije ili izaberi drugu igru.`;
}

/** Poziv sa spiska nije stigao do druga (stranica zatvorena) ili drug nije odgovorio */
export function missedLine(friendName: string): string {
    return `${friendName} sada nije tu.`;
}

// ── Poruke kanala ─────────────────────────────────────────────────────────────

export type RemotePhase = "lobby" | "playing" | "done";

/**
 * Stanje jednog igrača koje se šalje drugu (na svaku promenu i na svakih nekoliko sekundi,
 * pa služi i kao „otkucaj srca”). Samo brojevi — imena i drugari stižu od servera.
 */
export interface RemoteState {
    phase: RemotePhase;
    /** Koliko je zajedničkih nivoa ovaj igrač završio (zajednički kraj kad oba stignu do istog broja) */
    done: number;
    /** Zadatak (od 1) i broj zadataka u nivou koji se upravo igra */
    round: number;
    total: number;
    /** Zvezdice u ovom nivou do sada (0–3) */
    stars: number;
    /** Zbir zvezdica u celoj igri sa drugom (završeni nivoi + ovaj) */
    sessionStars: number;
    /** Tačnih odgovora u ovom nivou (drugar navija kad broj poraste) */
    correct: number;
    /** Da li je poslednji završeni nivo vodio dalje (sledeći nivo zajedno) */
    advance: boolean;
}

export const EMPTY_REMOTE_STATE: RemoteState = { phase: "lobby", done: 0, round: 0, total: 0, stars: 0, sessionStars: 0, correct: 0, advance: false };

function int(value: unknown, max: number): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), max) : 0;
}

/** Poruka druga iz kanala: sve se proverava i ograničava (kanal je javni Broadcast). */
export function parseRemoteState(raw: unknown): RemoteState | null {
    if (!isRecord(raw)) return null;
    const phase = raw.phase === "lobby" || raw.phase === "playing" || raw.phase === "done" ? raw.phase : null;
    if (!phase) return null;
    const total = int(raw.total, 100);
    return {
        phase,
        done: int(raw.done, 1000),
        round: Math.min(int(raw.round, 100), total || 100),
        total,
        stars: int(raw.stars, 3),
        sessionStars: int(raw.sessionStars, 3000),
        correct: int(raw.correct, 100),
        advance: raw.advance === true,
    };
}

/**
 * Zvezdice „uživo” u nivou koji traje: iste kao na kraju nivoa (`starsForGame`), samo računate
 * od dosad rešenih zadataka. Igre bez ocenjivanja pune zvezdice redom kako zadaci prolaze.
 */
export function liveStars(graded: boolean, correct: number, round: number, total: number): number {
    if (total <= 0) return 0;
    if (!graded) return Math.min(3, Math.floor((3 * Math.max(0, round - 1)) / total));
    // Pre prvog tačnog odgovora nema zvezdica (na kraju nivoa je uvek bar jedna)
    if (correct <= 0) return 0;
    return starsForGame(true, Math.min(correct, total), total);
}

/** Sledeći zajednički nivo: dalje samo kad su oba igrača prešla nivo (inače isti, još jednom). */
export function nextTogetherLevel(level: number, mineAdvance: boolean, friendAdvance: boolean | null): number {
    const both = mineAdvance && (friendAdvance === null || friendAdvance);
    return both && level < MAX_LEVEL ? level + 1 : level;
}

/** Posle koliko tišine (bez poruke) se smatra da je drug otišao. */
export const FRIEND_TIMEOUT_MS = 20_000;
/** Na koliko se šalje stanje i kad se ništa ne menja („otkucaj srca”). */
export const HEARTBEAT_MS = 4_000;

/**
 * Da li „Krenimo!” u predvorju sada može da otvori igru. Isto pravilo čuva i otvaranje igre
 * (GameContainer), pa dugme nikad ne izgleda spremno dok bi dodir prošao bez ičega:
 *   • "ready"       — igra se otvara odmah;
 *   • "loading"     — napredak deteta se još učitava („Sprema se…”);
 *   • "unavailable" — napredak nije učitan (dugme nudi „Probaj ponovo”);
 *   • "rest"        — dnevno vreme igre je isteklo.
 */
export type RemoteStart = "ready" | "loading" | "unavailable" | "rest";

export function remoteStartState({ limitReached, loading, error }: { limitReached: boolean; loading: boolean; error: boolean }): RemoteStart {
    if (limitReached) return "rest";
    if (error) return "unavailable";
    if (loading) return "loading";
    return "ready";
}
