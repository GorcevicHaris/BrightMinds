// lib/playTogether.ts
// „Igraj sa drugom” — igra na smenu na istom uređaju (čist modul, radi i u testovima).
// Dete i drug igraju isti nivo: zadaci se smenjuju (jedan zadatak — jedan igrač). Red se
// određuje iz stanja igre koje igra ionako šalje (useGameSync → view), pa same igre ne
// moraju da znaju za zajedničku igru. Nagrade (novčići, nivoi) dobija samo prijavljeno dete;
// drug dobija pohvalu. Nema poređenja ko je bolji: sve je zajedničko („Zajedno ste…”).

import type { GameId } from "./games";

/** Igre u kojima smena posle svakog zadatka ima smisla (kratki zadaci, jasan kraj poteza). */
export const TOGETHER_GAMES: readonly GameId[] = ["memory", "counting", "gaze", "where", "families", "backpack"];

export function isTogetherGame(id: GameId | null | undefined): boolean {
    return Boolean(id) && TOGETHER_GAMES.includes(id as GameId);
}

/** Najviše igrača na jednom uređaju (dete + jedan drug: kratko čekanje na red). */
export const TOGETHER_MAX_PLAYERS = 2;

/**
 * Čiji je red, iz stanja igre koje igra šalje posle svakog poteza:
 *  • Spoji parove — potez su dve okrenute kartice (`moves`), pa red prelazi posle svakog pokušaja
 *  • ostale igre — svaki zadatak (`round`, od 1) igra drugi igrač
 * Vraća indeks igrača (0 = prijavljeno dete) ili null kad stanje ne kaže ništa o redu.
 */
export function turnIndexFor(gameId: GameId, data: Record<string, unknown> | null | undefined, players = TOGETHER_MAX_PLAYERS): number | null {
    if (!data || players < 1) return null;
    if (gameId === "memory") {
        const moves = data.moves;
        if (typeof moves !== "number" || !Number.isFinite(moves) || moves < 0) return null;
        return Math.floor(moves) % players;
    }
    const round = data.round;
    if (typeof round !== "number" || !Number.isFinite(round) || round < 1) return null;
    return (Math.floor(round) - 1) % players;
}

// ── Drug ──────────────────────────────────────────────────────────────────────

/** Drugari koje može da izabere drug čije je ime upisao odrasli (bez naloga u aplikaciji). */
export const FRIEND_KINDS = ["dog", "cat", "bunny", "bear", "fox", "panda"] as const;

export interface TogetherPlayer {
    /** Samo ime (bez prezimena) */
    name: string;
    /** Drugar (lik) igrača */
    kind: string;
    skin?: string;
    wear?: Record<string, string>;
    /** Dete sa istog roditeljskog naloga (id) ili drug upisan na ovom uređaju (undefined) */
    childId?: number;
}

const NAME_MAX = 16;

/**
 * Ime druga koje upisuje odrasli: samo slova (i razmak ili crtica), najviše 16 znakova,
 * prvo slovo veliko. Prazno ili neispravno → null.
 */
export function cleanFriendName(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const letters = raw
        .normalize("NFC")
        .replace(/[^\p{L}\s-]/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, NAME_MAX)
        .trim();
    if (letters.length < 2 || !/\p{L}/u.test(letters)) return null;
    return letters.charAt(0).toLocaleUpperCase("sr") + letters.slice(1);
}

/** Drugovi upisani na ovom uređaju (localStorage) — čitanje uz proveru svakog polja. */
export function parseSavedFriends(raw: string | null): TogetherPlayer[] {
    if (!raw) return [];
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];
    const out: TogetherPlayer[] = [];
    for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        const name = cleanFriendName((item as Record<string, unknown>).name);
        const kind = (item as Record<string, unknown>).kind;
        if (!name || typeof kind !== "string" || !(FRIEND_KINDS as readonly string[]).includes(kind)) continue;
        if (out.some((f) => f.name.toLowerCase() === name.toLowerCase())) continue;
        out.push({ name, kind });
        if (out.length >= 6) break;
    }
    return out;
}

/** Novi drug ide na početak spiska; isto ime se ne ponavlja, čuva se najviše šest. */
export function rememberFriend(list: TogetherPlayer[], friend: TogetherPlayer): TogetherPlayer[] {
    const rest = list.filter((f) => f.name.toLowerCase() !== friend.name.toLowerCase());
    return [{ name: friend.name, kind: friend.kind }, ...rest].slice(0, 6);
}

// ── Reči ──────────────────────────────────────────────────────────────────────

/** Zbir zvezdica rečima, za zajedničku pohvalu („12 zvezdica”, „1 zvezdicu”). */
export function starsPhrase(count: number): string {
    const n = Math.max(0, Math.round(count));
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} zvezdicu`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} zvezdice`;
    return `${n} zvezdica`;
}

/** Zajednička pohvala na kraju nivoa — uvek oboma, bez poređenja. */
export function togetherPraise(names: [string, string], totalStars: number): { title: string; text: string } {
    return {
        title: `Bravo, ${names[0]} i ${names[1]}!`,
        text: `Zajedno ste skupili ${starsPhrase(totalStars)}!`,
    };
}
