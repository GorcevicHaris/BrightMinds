// lib/invite.ts
// „Igraj sa drugom na drugom uređaju” — čist deo (radi na serveru, u pregledaču i u testovima).
//
// Dete (domaćin) napravi poziv: server mu da kod od četiri sličice (iste sličice kao tajni kod
// za prijavu) i tajni naziv kanala. Drug na SVOM uređaju, prijavljen u SVOJ profil, izabere te
// četiri sličice i dobije isti kanal. Oboje zatim igraju istu igru i isti nivo istovremeno,
// svako na svom uređaju (rezultati idu svakom u njegov profil), a preko kanala vide traku sa
// drugom: drugar, ime, zadatak i zvezdice. Sve je zajedničko — nikad poređenje.
//
// Poziv se čuva u podešavanjima domaćina (`children.settings.invite`), bez nove tabele.
// Ovde su: oblik poziva i njegovo čišćenje, rokovi, poruke kanala i zajedničke zvezdice.

import { GAMES, MAX_LEVEL, starsForGame, type GameId } from "./games";
import { PIN_LENGTH, VISUAL_PIN_CATEGORIES } from "./visualPinData";

/** Kod važi 10 minuta (detetu se vreme ne prikazuje; posle toga „Kod više ne važi”). */
export const INVITE_CODE_TTL_MS = 10 * 60 * 1000;
/** Igra sa drugom posle ulaska druga traje najduže tri sata (posle toga se poziv briše). */
export const INVITE_SESSION_TTL_MS = 3 * 60 * 60 * 1000;

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
    createdAt: string;
    guest?: InviteGuest;
    joinedAt?: string;
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

function cleanCompanion(raw: unknown): InviteCompanion | null {
    if (!isRecord(raw) || typeof raw.kind !== "string" || raw.kind.length > 40) return null;
    const wear: Record<string, string> = {};
    if (isRecord(raw.wear)) {
        for (const [slot, item] of Object.entries(raw.wear).slice(0, 12)) {
            if (typeof item === "string" && slot.length <= 40 && item.length <= 60) wear[slot] = item;
        }
    }
    return { kind: raw.kind, skin: typeof raw.skin === "string" && raw.skin.length <= 60 ? raw.skin : null, wear };
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

    let guest: InviteGuest | undefined;
    if (isRecord(raw.guest)) {
        const firstName = firstNameOnly(raw.guest.firstName);
        const companion = cleanCompanion(raw.guest.companion);
        if (firstName && companion) guest = { firstName, companion };
    }
    const joinedAt = isoOrNull(raw.joinedAt) ?? undefined;
    return { code, channelKey, expiresAt, hostFirstName, game: raw.game, level, createdAt, ...(guest ? { guest } : {}), ...(guest && joinedAt ? { joinedAt } : {}) };
}

export type InviteStatus = "waiting" | "joined" | "expired";

/**
 * Stanje poziva u trenutku `now`:
 *  • waiting — kod još važi i niko nije ušao
 *  • joined  — drug je ušao (kod je iskorišćen); igra traje do `INVITE_SESSION_TTL_MS`
 *  • expired — kod je istekao pre ulaska, ili je igra sa drugom predugo trajala
 */
export function inviteStatus(invite: StoredInvite, now: number = Date.now()): InviteStatus {
    if (invite.guest && invite.joinedAt) {
        return now - Date.parse(invite.joinedAt) < INVITE_SESSION_TTL_MS ? "joined" : "expired";
    }
    if (invite.code === null) return "expired";
    return now < Date.parse(invite.expiresAt) ? "waiting" : "expired";
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
