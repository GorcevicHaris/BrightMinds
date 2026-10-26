// app/api/_lib/duels.ts
// Obračun uloga u dvoboju (pravila: lib/duelStakes.ts) — samo server.
//
// Dva deteta su dva reda u tabeli `children`, pa se prenos novčića upisuje u dva koraka, svaki
// kao „uporedi pa zameni” (guardedWrite: brojač izmena drugara, poziv i spisak drugova moraju
// biti isti kao pri čitanju):
//   1. poražen daje — najviše ulog i nikad više nego što ima; u njegovo stanje (`duels`) se
//      upisuje oznaka partije i koliko je dao;
//   2. pobednik dobija tačno toliko (čita se iz zapisa poraženog), uz istu oznaku.
// Svaki korak je idempotentan (oznaka partije), pa ponovljen poziv — drugi uređaj, ponovljen
// zahtev ili prekid između koraka — samo dovršava započeto i nikad ne prenosi dvaput. Ishod
// partije se pre prenosa beleži na jednom mestu (poziv domaćina ili sesija na istom uređaju),
// tako da se partija obračunava tačno jednom po sesiji, nivou i partiji.
//
// Dvoboj na istom uređaju (`children.settings.localDuel` deteta koje je prijavljeno): braća i
// sestre sa istog roditeljskog naloga — sesiju odobrava nalog roditelja (siblingIdsOf).

import { COMPANION_CATALOG } from "@/app/components/avatar3d/manifest";
import { resolveSettings } from "@/lib/childSettings";
import { coinsOf, sanitizeCompanion, type CompanionState } from "@/lib/companion";
import { applyDuelLoss, applyDuelWin, duelStakeFor } from "@/lib/duelStakes";
import { INVITE_SESSION_TTL_MS } from "@/lib/invite";
import { cleanSeed } from "@/lib/seededRandom";
import { supabaseAdmin } from "@/lib/supabase";
import { isRecord } from "@/lib/validation";
import { CHILD_NOT_FOUND } from "./children";
import { HttpError } from "./http";
import { guardedWrite, settingsOf, type InviteRow } from "./invites";

const MAX_RETRIES = 4;

export const DUEL_GONE = "Ovaj dvoboj više ne važi.";

export interface DuelRow extends InviteRow {
    experience_points: number | null;
}

export async function loadDuelRow(childId: number): Promise<DuelRow> {
    const { data, error } = await supabaseAdmin.from("children").select("id, first_name, gender, date_of_birth, settings, experience_points").eq("id", childId).limit(1);
    if (error) throw error;
    const row = ((data ?? []) as DuelRow[])[0];
    if (!row) throw new HttpError(404, CHILD_NOT_FOUND);
    return row;
}

export function companionStateOf(row: Pick<DuelRow, "settings" | "gender">): CompanionState {
    return sanitizeCompanion(settingsOf(row).companion, row.gender, COMPANION_CATALOG);
}

/** Novčići deteta na raspolaganju (isto kao ekran „Moj drugar”) */
export function coinsOfRow(row: DuelRow): number {
    return coinsOf(companionStateOf(row), row.experience_points);
}

/** „Ulog u dvoboju” iz podešavanja deteta (0, 3 ili 5) */
export function stakeSettingOf(row: Pick<InviteRow, "settings" | "date_of_birth">): number {
    return resolveSettings(row.settings, row.date_of_birth ?? null).duelStake;
}

/** Ulog između dvoje dece sada: manji od dva podešavanja */
export function currentStake(a: DuelRow, b: DuelRow): number {
    return duelStakeFor(stakeSettingOf(a), stakeSettingOf(b));
}

/** Menja drugara deteta funkcijom `change` (null = ništa); ponavlja se kad neko upiše u međuvremenu. */
async function changeCompanion<T>(childId: number, change: (state: CompanionState, row: DuelRow) => { state: CompanionState | null; result: T }): Promise<T> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const row = await loadDuelRow(childId);
        const { state, result } = change(companionStateOf(row), row);
        if (!state) return result;
        if (await guardedWrite(childId, row, { ...settingsOf(row), companion: state })) return result;
    }
    throw new HttpError(409, "Pokušaj ponovo");
}

/**
 * Prenos uloga za jednu partiju (oznaka `id`, lib/duelStakes.ts → settlementId): poražen daje
 * najviše `stake` (nikad više nego što ima), pobednik dobija tačno toliko. Idempotentno.
 * Vraća koliko je preneto.
 */
export async function transferDuelCoins({ id, winnerId, loserId, stake }: { id: string; winnerId: number; loserId: number; stake: number }): Promise<number> {
    if (winnerId === loserId) throw new HttpError(400, "Neispravan zahtev");
    const given = await changeCompanion(loserId, (state, row) => {
        const loss = applyDuelLoss(state, id, stake, row.experience_points);
        return { state: loss.state, result: loss.given };
    });
    await changeCompanion(winnerId, (state) => ({ state: applyDuelWin(state, id, given), result: undefined }));
    return given;
}

// ── Dvoboj na istom uređaju ─────────────────────────────────────────────────────

/** Sesija dvoboja na istom uređaju (kod deteta koje je prijavljeno) */
export interface LocalDuel {
    id: string;
    /** Brat ili sestra sa istog roditeljskog naloga (samo na serveru) */
    friendId: number;
    seed: string;
    createdAt: string;
}

const LOCAL_ID = /^[A-Za-z0-9_-]{16,64}$/;

export function parseLocalDuel(raw: unknown): LocalDuel | null {
    if (!isRecord(raw)) return null;
    const id = typeof raw.id === "string" && LOCAL_ID.test(raw.id) ? raw.id : null;
    const friendId = typeof raw.friendId === "number" && Number.isSafeInteger(raw.friendId) && raw.friendId > 0 ? raw.friendId : null;
    const seed = cleanSeed(raw.seed);
    const createdAt = typeof raw.createdAt === "string" && !Number.isNaN(Date.parse(raw.createdAt)) ? raw.createdAt : null;
    if (!id || !friendId || !seed || !createdAt) return null;
    return { id, friendId, seed, createdAt };
}

/** Sesija važi kao i igra sa drugom na dva uređaja: tri sata od početka */
export function localDuelActive(duel: LocalDuel, now = Date.now()): boolean {
    return now - Date.parse(duel.createdAt) < INVITE_SESSION_TTL_MS;
}

/** Upisuje novu sesiju dvoboja kod deteta (stara prestaje da važi) */
export async function writeLocalDuel(childId: number, duel: LocalDuel): Promise<void> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const row = await loadDuelRow(childId);
        if (await guardedWrite(childId, row, { ...settingsOf(row), localDuel: duel })) return;
    }
    throw new HttpError(409, "Pokušaj ponovo");
}
