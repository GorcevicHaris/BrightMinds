// app/api/_lib/invites.ts
// Zajednički deo ruta za igru sa drugom na drugom uređaju (videti lib/invite.ts).
//
// Poziv živi u `children.settings.invite` domaćina, a spisak drugova u
// `children.settings.playFriends` (bez nove tabele). Svaki upis je „uporedi pa zameni”: uspeva
// samo ako se poziv (ključ kanala, kod i zahtev) i brojači izmena drugara i drugova nisu
// promenili od čitanja — dva istovremena ulaska ne mogu oba da iskoriste isti kod, dva odgovora
// isti poziv, a upis poziva ne briše upravo kupljenu odeću ni zapamćenog druga.
import { randomBytes, randomInt } from "node:crypto";
import { COMPANION_CATALOG } from "@/app/components/avatar3d/manifest";
import { resolveSettings } from "@/lib/childSettings";
import { sanitizeCompanion } from "@/lib/companion";
import { isGameAvailable } from "@/lib/gameAccess";
import type { GameId } from "@/lib/games";
import { firstNameOnly, inviteStatus, parseStoredInvite, randomInviteCode, type InviteCompanion, type InviteRequest, type StoredInvite } from "@/lib/invite";
import { parsePlayFriends, rememberPlayFriend, type PlayFriend, type PlayFriends } from "@/lib/playFriends";
import type { RateLimitRule } from "@/lib/rateLimit";
import { friendKeyFor, inviteChannelFor } from "@/lib/realtimeTopic";
import { supabaseAdmin } from "@/lib/supabase";
import { isRecord } from "@/lib/validation";
import { CHILD_NOT_FOUND } from "./children";
import type { Session } from "@/lib/auth";
import { HttpError } from "./http";
import { readUnlockedLevels } from "./levels";

/** Pogađanje koda: najviše 10 pokušaja za 10 minuta sa iste adrese i za isto dete. */
export const JOIN_RULE: RateLimitRule = { limit: 10, windowMs: 10 * 60 * 1000 };
/** Osigurač za sve adrese i svu decu zajedno (pogađanje sa mnogo naloga i adresa). */
export const JOIN_GLOBAL_RULE: RateLimitRule = { limit: 300, windowMs: 10 * 60 * 1000 };
/** Pravljenje poziva: najviše 10 kodova za 10 minuta po detetu (i 30 po adresi). */
export const CREATE_RULE: RateLimitRule = { limit: 10, windowMs: 10 * 60 * 1000 };
export const CREATE_IP_RULE: RateLimitRule = { limit: 30, windowMs: 10 * 60 * 1000 };
/** Poziv istom drugu sa spiska: najviše 5 za 10 minuta (drug ne dobija poziv za pozivom). */
export const DIRECT_PAIR_RULE: RateLimitRule = { limit: 5, windowMs: 10 * 60 * 1000 };
/** Odgovori i provera sandučeta: najviše 60 za 10 minuta po detetu (stranica proverava retko). */
export const ANSWER_RULE: RateLimitRule = { limit: 60, windowMs: 10 * 60 * 1000 };

export const INVITE_GONE = "Kod više ne važi. Zamoli druga da napravi novi.";
export const INVITE_OWN = "To je tvoj kod. Drug ga unosi na svom uređaju.";
export const INVITE_LIMITED = "Previše pokušaja. Sačekaj malo pa probaj ponovo.";
export const INVITE_GAME_LOCKED = "Ova igra ti još nije otvorena. Zamoli druga da izabere drugu igru.";
export const FRIEND_GONE = "Ovog druga više nema na spisku. Pokaži mu kod.";
export const FRIEND_GAME_LOCKED = "Ova igra drugu još nije otvorena. Izaberi drugu igru.";
export const REQUEST_GONE = "Ovaj poziv više ne važi.";

const MAX_RETRIES = 3;
const CODE_TRIES = 12;

export interface InviteRow {
    id: number;
    first_name: string | null;
    gender: string | null;
    date_of_birth?: string | null;
    settings: unknown;
}

const ROW_COLUMNS = "id, first_name, gender, date_of_birth, settings";

export async function loadInviteRow(childId: number): Promise<InviteRow> {
    const { data, error } = await supabaseAdmin.from("children").select(ROW_COLUMNS).eq("id", childId).limit(1);
    if (error) throw error;
    const row = ((data ?? []) as InviteRow[])[0];
    if (!row) throw new HttpError(404, CHILD_NOT_FOUND);
    return row;
}

export function settingsOf(row: Pick<InviteRow, "settings">): Record<string, unknown> {
    return isRecord(row.settings) ? row.settings : {};
}

export function inviteOf(row: Pick<InviteRow, "settings">): StoredInvite | null {
    return parseStoredInvite(settingsOf(row).invite);
}

/** Drugar deteta onako kako ga vidi drug: lik, izgled i odeća (kao spisak drugova). */
export function companionOf(row: Pick<InviteRow, "settings" | "gender">): InviteCompanion {
    const state = sanitizeCompanion(settingsOf(row).companion, row.gender, COMPANION_CATALOG);
    return {
        kind: state.kind,
        skin: (state.skin as Partial<Record<string, string>> | undefined)?.[state.kind] ?? null,
        wear: (state.wear ?? {}) as Record<string, string>,
    };
}

export function channelOf(hostChildId: number, invite: StoredInvite): string {
    return inviteChannelFor(hostChildId, invite.channelKey);
}

export function newChannelKey(): string {
    return randomBytes(18).toString("base64url");
}

/**
 * Upisuje nova podešavanja deteta samo ako se u bazi od čitanja reda `row` nisu promenili
 * poziv (ključ kanala, kod i zahtev), brojač izmena drugara i brojač izmena spiska drugova —
 * dva istovremena upisa ne mogu jedan drugom da obrišu poziv, kupljenu odeću ili druga.
 */
async function guardedWrite(childId: number, row: InviteRow, nextSettings: Record<string, unknown>): Promise<boolean> {
    const settings = settingsOf(row);
    let update = supabaseAdmin.from("children").update({ settings: nextSettings }).eq("id", childId);
    const rawInvite = settings.invite;
    const prev = parseStoredInvite(rawInvite);
    if (prev) {
        update = update.eq("settings->invite->>channelKey", prev.channelKey);
        update = prev.code === null ? update.is("settings->invite->>code", null) : update.eq("settings->invite->>code", prev.code);
        update = prev.request ? update.eq("settings->invite->request->>key", prev.request.key) : update.is("settings->invite->request", null);
    } else if (rawInvite === undefined || rawInvite === null) {
        update = update.is("settings->invite", null);
    } else if (isRecord(rawInvite) && typeof rawInvite.channelKey === "string") {
        // Oštećen poziv (ne prolazi proveru): menja se samo ako je i dalje isti
        update = update.eq("settings->invite->>channelKey", rawInvite.channelKey);
    }
    const companion = settings.companion;
    if (isRecord(companion) && typeof companion.v === "number") update = update.eq("settings->companion->>v", String(companion.v));
    else if (companion === undefined) update = update.is("settings->companion", null);
    const friends = settings.playFriends;
    if (isRecord(friends) && typeof friends.v === "number") update = update.eq("settings->playFriends->>v", String(friends.v));
    else if (friends === undefined) update = update.is("settings->playFriends", null);

    const { data, error } = await update.select("id");
    if (error) throw error;
    return Boolean(data && data.length > 0);
}

/**
 * Upisuje novi poziv (`next`, ili null = briše ga) samo ako je u bazi i dalje poziv `prev`
 * (isti ključ kanala, kod i zahtev) i isti brojači izmena drugara i drugova. Vraća da li je
 * upis uspeo. `prev` je poziv pročitan iz istog reda (`inviteOf(row)`).
 */
export async function writeInvite(childId: number, row: InviteRow, prev: StoredInvite | null, next: StoredInvite | null): Promise<boolean> {
    void prev;
    const nextSettings: Record<string, unknown> = { ...settingsOf(row) };
    if (next) nextSettings.invite = next;
    else delete nextSettings.invite;
    return guardedWrite(childId, row, nextSettings);
}

/**
 * Menja poziv deteta funkcijom `change` (dobija sveže pročitan red i poziv, vraća novi poziv,
 * null = obriši, ili `undefined` = ništa ne menjaj). Ponavlja se kad neko upiše u međuvremenu.
 */
export async function updateInvite(
    childId: number,
    change: (row: InviteRow, invite: StoredInvite | null) => StoredInvite | null | undefined | Promise<StoredInvite | null | undefined>
): Promise<{ row: InviteRow; invite: StoredInvite | null }> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const row = await loadInviteRow(childId);
        const current = inviteOf(row);
        const next = await change(row, current);
        if (next === undefined) return { row, invite: current };
        if (await writeInvite(childId, row, current, next)) return { row, invite: next };
    }
    throw new HttpError(409, "Pokušaj ponovo");
}

/** Briše istekao poziv (ako je i dalje isti); greška se samo beleži — čišćenje je sporedno. */
export async function clearIfExpired(childId: number, row: InviteRow, invite: StoredInvite, now = Date.now()): Promise<void> {
    if (inviteStatus(invite, now) !== "expired") return;
    try {
        await writeInvite(childId, row, invite, null);
    } catch (error) {
        console.error("[api] invite cleanup:", error);
    }
}

/**
 * Nov kod koji se ne poklapa ni sa jednim pozivom koji je još u bazi (ni sa isteklim, dok
 * se ne obriše) ni sa tajnim kodom za prijavu bilo kog deteta — inače bi drug koji vidi kod
 * mogao da se prijavi u tuđi profil.
 */
export async function freshInviteCode(): Promise<string> {
    for (let i = 0; i < CODE_TRIES; i++) {
        const code = randomInviteCode((n) => randomInt(n));
        const [invites, pins] = await Promise.all([
            supabaseAdmin.from("children").select("id").eq("settings->invite->>code", code).limit(1),
            supabaseAdmin.from("children").select("id").eq("pin_code", code).limit(1),
        ]);
        if (invites.error) throw invites.error;
        if (pins.error) throw pins.error;
        if ((invites.data ?? []).length === 0 && (pins.data ?? []).length === 0) return code;
    }
    throw new HttpError(503, "Probaj ponovo za trenutak");
}

/** Da li je kod nečiji tajni kod za prijavu (takav poziv se nikad ne prihvata). */
export async function isLoginPin(code: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin.from("children").select("id").eq("pin_code", code).limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
}

/** Da li je igra detetu otvorena (roditelj je nije isključio, a „otključavanje redom” ju je otvorilo). */
export async function gameOpenFor(row: InviteRow, gameId: GameId): Promise<boolean> {
    const settings = resolveSettings(row.settings, row.date_of_birth ?? null);
    if (settings.disabledGames.length === 0 && !settings.unlockInOrder) return true;
    const progress = settings.unlockInOrder ? await readUnlockedLevels(row.id) : {};
    return isGameAvailable(settings, progress, gameId);
}

/** Ime deteta za drugog: samo ime (prva reč). */
export function firstNameOf(row: Pick<InviteRow, "first_name">): string {
    return firstNameOnly(row.first_name) ?? "Drug";
}

/** Ono što domaćin vidi o svom pozivu. */
export function hostView(childId: number, invite: StoredInvite, now = Date.now()) {
    const status = inviteStatus(invite, now);
    return {
        status,
        channel: channelOf(childId, invite),
        game: invite.game,
        level: invite.level,
        // Takmičenje se šalje samo kad je izabrano: bez polja je „zajedno” (kao stari pozivi)
        ...(invite.mode === "versus" ? { mode: invite.mode } : {}),
        ...(status === "waiting" && invite.code ? { code: invite.code.split(",") } : {}),
        // Drug gleda karticu poziva: domaćin vidi samo njegovo ime i drugara („Čekamo da Amar prihvati…”)
        ...(status === "asking" && invite.request
            ? { asking: { firstName: invite.request.firstName, companion: invite.request.companion }, via: invite.request.via }
            : {}),
        ...(status === "joined" && invite.guest ? { friend: invite.guest } : {}),
    };
}

/**
 * Kartica poziva kakvu vidi drug pre nego što prihvati: ključ za odgovor, ime i drugar domaćina,
 * igra, nivo i način igre. Ništa drugo (bez kanala — njega drug dobija tek kad prihvati).
 */
export function requestCard(hostRow: InviteRow, invite: StoredInvite, request: InviteRequest) {
    return {
        key: request.key,
        friend: { firstName: firstNameOf(hostRow), companion: companionOf(hostRow) },
        game: invite.game,
        level: invite.level,
        ...(invite.mode === "versus" ? { mode: invite.mode } : {}),
    };
}

/** Odgovor drugu koji je ušao (stari put „uđi kodom”) ili prihvatio poziv — isti oblik kao ranije. */
export function joinedAnswer(hostId: number, hostRow: InviteRow, joined: StoredInvite) {
    return {
        channel: channelOf(hostId, joined),
        friend: { firstName: firstNameOf(hostRow), companion: companionOf(hostRow) },
        game: joined.game,
        level: joined.level,
        // Bez polja je „zajedno” (stari klijenti i pozivi); takmičenje se šalje izričito
        ...(joined.mode === "versus" ? { mode: joined.mode } : {}),
    };
}

// ── Drugovi (lib/playFriends.ts) ────────────────────────────────────────────────

export function playFriendsOf(row: Pick<InviteRow, "settings">): PlayFriends {
    return parsePlayFriends(settingsOf(row).playFriends);
}

/** Menja spisak drugova deteta (`change` vraća novi spisak ili null = ništa); ponavlja se kad neko upiše u međuvremenu. */
export async function updatePlayFriends(childId: number, change: (row: InviteRow, current: PlayFriends) => PlayFriends | null): Promise<PlayFriends> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const row = await loadInviteRow(childId);
        const current = playFriendsOf(row);
        const next = change(row, current);
        if (!next) return current;
        if (await guardedWrite(childId, row, { ...settingsOf(row), playFriends: next })) return next;
    }
    throw new HttpError(409, "Pokušaj ponovo");
}

/**
 * Posle prihvaćenog poziva deca se pamte jedno drugom (samo ime i drugar). Greška se samo
 * beleži: igra sa drugom je važnija od spiska, a sledeći put se pamte ponovo.
 */
export async function rememberPair(hostRow: InviteRow, guestRow: InviteRow, now = Date.now()): Promise<void> {
    const at = new Date(now).toISOString();
    const pairs: [InviteRow, InviteRow][] = [
        [hostRow, guestRow],
        [guestRow, hostRow],
    ];
    for (const [self, other] of pairs) {
        try {
            await updatePlayFriends(self.id, (_row, current) => rememberPlayFriend(current, { id: other.id, firstName: firstNameOf(other), companion: companionOf(other), at }));
        } catch (error) {
            console.error("[api] play friends:", error);
        }
    }
}

// ── Braća i sestre (isti roditeljski nalog) ─────────────────────────────────────

/** Najviše dece na spisku (nalog terapeuta može imati mnogo dece) — isto kao /friends */
export const MAX_SIBLINGS = 12;

/**
 * Ostala deca istog roditeljskog naloga — isti skup koji vraća /api/children/[id]/friends.
 * Roditelj ih je sam upisao na svoj nalog, pa se mogu pozvati i bez koda od prvog puta. Samo
 * nalog roditelja: nalog učitelja ili terapeuta povezuje decu iz različitih porodica, pa je tamo
 * spisak uvek prazan (i za dečju sesiju takvog naloga — ona nosi ulogu vlasnika naloga).
 */
export async function siblingIdsOf(session: Pick<Session, "userId" | "role">, childId: number): Promise<number[]> {
    if (session.role !== "parent") return [];
    const { data, error } = await supabaseAdmin.from("user_children").select("child_id").eq("user_id", session.userId);
    if (error) throw error;
    return [...new Set(((data ?? []) as { child_id: number }[]).map((row) => row.child_id))].filter((id) => id !== childId).slice(0, MAX_SIBLINGS);
}

/** Brat ili sestra po ključu iz pregledača (lib/realtimeTopic.ts → friendKeyFor); inače null. */
export function siblingByKey(childId: number, siblingIds: readonly number[], key: unknown): number | null {
    if (typeof key !== "string" || key.length > 64) return null;
    return siblingIds.find((id) => friendKeyFor(childId, id) === key) ?? null;
}

/** Drug sa spiska deteta po ključu iz pregledača (lib/realtimeTopic.ts → friendKeyFor); inače null. */
export function friendByKey(childId: number, friends: PlayFriends, key: unknown): PlayFriend | null {
    if (typeof key !== "string" || key.length > 64) return null;
    return friends.list.find((friend) => friendKeyFor(childId, friend.id) === key) ?? null;
}
