// lib/playFriends.ts
// „Drugovi” za igru na dva uređaja — čist deo (server i testovi).
//
// Deca koja su jednom igrala zajedno na dva uređaja, a povezao ih je kod koji je pokazala odrasla
// osoba ili dete uz nju (lib/invite.ts), pamte se jedno drugom: samo ime i drugar (lik, izgled,
// odeća). Sledeći put domaćin može da pozove druga sa spiska, bez koda. Spisak se ne pretražuje i
// ne može se popuniti drugačije nego zajedničkom igrom; roditelj ga briše u podešavanjima deteta.
// ID drugog deteta je samo na serveru (za slanje poziva) — pregledač dobija samo ključ izveden iz
// serverske tajne (lib/realtimeTopic.ts → friendKeyFor).
//
// Čuva se u podešavanjima deteta (`children.settings.playFriends`) kao `{ v, list }`; `v` je
// brojač izmena (upis „uporedi pa zameni”, isto kao drugar i poziv).

import { cleanCompanion, firstNameOnly, type InviteCompanion } from "./invite";

/** Najviše osam drugova: mali, pregledan spisak (malo izbora za mlađu decu). */
export const MAX_PLAY_FRIENDS = 8;

export interface PlayFriend {
    /** ID deteta druga — samo na serveru */
    id: number;
    firstName: string;
    companion: InviteCompanion;
    /** Poslednja zajednička igra (ISO) */
    at: string;
}

export interface PlayFriends {
    v: number;
    list: PlayFriend[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Sačuvan spisak; sve neispravno se preskače (najviše `MAX_PLAY_FRIENDS`, bez ponavljanja). */
export function parsePlayFriends(raw: unknown): PlayFriends {
    if (!isRecord(raw)) return { v: 0, list: [] };
    const v = typeof raw.v === "number" && Number.isSafeInteger(raw.v) && raw.v >= 0 ? raw.v : 0;
    const list: PlayFriend[] = [];
    for (const item of Array.isArray(raw.list) ? raw.list.slice(0, MAX_PLAY_FRIENDS * 2) : []) {
        if (!isRecord(item)) continue;
        const id = typeof item.id === "number" && Number.isSafeInteger(item.id) && item.id > 0 ? item.id : null;
        const firstName = firstNameOnly(item.firstName);
        const companion = cleanCompanion(item.companion);
        const at = typeof item.at === "string" && item.at.length <= 40 && !Number.isNaN(Date.parse(item.at)) ? item.at : null;
        if (!id || !firstName || !companion || !at || list.some((f) => f.id === id)) continue;
        list.push({ id, firstName, companion, at });
        if (list.length >= MAX_PLAY_FRIENDS) break;
    }
    return { v, list };
}

/** Pamti (ili osvežava) druga: na vrh spiska, sa novim imenom i drugarom; najstariji ispada. */
export function rememberPlayFriend(current: PlayFriends, friend: PlayFriend): PlayFriends {
    const rest = current.list.filter((f) => f.id !== friend.id);
    return { v: current.v + 1, list: [friend, ...rest].slice(0, MAX_PLAY_FRIENDS) };
}

/** Briše druga sa spiska (roditelj, u podešavanjima deteta). */
export function forgetPlayFriend(current: PlayFriends, friendId: number): PlayFriends {
    return { v: current.v + 1, list: current.list.filter((f) => f.id !== friendId) };
}

/** Da li dete na spisku ima baš ovog druga. */
export function hasPlayFriend(current: PlayFriends, friendId: number): boolean {
    return current.list.some((f) => f.id === friendId);
}
