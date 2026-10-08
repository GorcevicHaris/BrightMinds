// app/api/children/[id]/unlocked-levels/route.ts
// Za svaku igru vraća (najviši POLOŽEN nivo + 1), u opsegu 1..MAX_LEVEL + 1.
// Vrednost MAX_LEVEL + 1 znači da su svi nivoi položeni. Podrazumevano 1.
//
// Nivo je položen kada je dete bar polovinu zadataka rešilo samostalno (videti
// `isLevelPassed`). Za dete nema neuspeha: nivo koji još nije savladan ostaje
// dostupan za novi pokušaj, samo ne otključava sledeći.
//
// Odakle se čita, od najnovije baze ka najstarijoj:
//   1. pogled `child_game_progress` (migracija 0004) — JEDAN mali upit; odluka
//      „položen” je sačuvana uz svaku partiju (`progress_logs.passed`);
//   2. kolone iz migracije 0001 — po jedan upit za svaku igru, pravilo računa kod;
//   3. baza bez migracija — nivo i zvezdice iz stare beleške.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { GAMES, MAX_LEVEL, type GameId, isGradedActivity } from "@/lib/games";
import { supabaseAdmin, withSchemaFallback } from "@/lib/supabase";
import { isLevelPassed, parseLegacyNotes, type ProgressLogRow } from "../../../_lib/children";
import { errorResponse, parseIdParam, requireSession } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

interface GameProgressRow {
    activity_id: number;
    highest_level_passed: number | null;
}

type LevelRow = Pick<ProgressLogRow, "id" | "level" | "stars" | "success_level" | "correct_count" | "total_count">;
type LegacyLogRow = Pick<ProgressLogRow, "id" | "activity_id" | "notes" | "success_level">;

const PAGE_SIZE = 1000;
const MAX_LEGACY_PAGES = 50;
/** Strana pri traženju najvišeg položenog nivoa jedne igre (odgovor je skoro uvek na prvoj). */
const LEVEL_PAGE_SIZE = 200;
const MAX_LEVEL_PAGES = 100;

/** Najviši položen nivo po igri iz pogleda `child_game_progress`: jedan upit, najviše red po igri. */
async function highestPassedFromView(childId: number): Promise<Map<number, number>> {
    const { data, error } = await supabaseAdmin
        .from("child_game_progress")
        .select("activity_id, highest_level_passed")
        .eq("child_id", childId);
    if (error) throw error;

    return new Map(((data ?? []) as GameProgressRow[]).map((row) => [row.activity_id, row.highest_level_passed ?? 0]));
}

// ── Baza bez migracije 0004 ───────────────────────────────────────────────────

/**
 * Najviši položen nivo jedne igre. Odnos tačnih i ukupnih odgovora ne može da
 * se izrazi PostgREST filterom (poređenje dve kolone), pa se partije čitaju od
 * najvišeg nivoa naniže i staje se kod prve položene. Čitanje ide po ključu
 * (level, id), pa strane ostaju ispravne i kad PostgREST vrati manje redova od
 * traženih ili se u međuvremenu upiše nova partija.
 */
async function highestPassedLevel(childId: number, activityId: number): Promise<number> {
    let cursor: { level: number; id: number } | null = null;

    for (let page = 0; page < MAX_LEVEL_PAGES; page++) {
        let query = supabaseAdmin
            .from("progress_logs")
            .select("id, level, stars, success_level, correct_count, total_count")
            .eq("child_id", childId)
            .eq("activity_id", activityId)
            .not("level", "is", null);
        if (cursor) {
            query = query.or(`level.lt.${cursor.level},and(level.eq.${cursor.level},id.lt.${cursor.id})`);
        }
        const { data, error } = await query
            .order("level", { ascending: false })
            .order("id", { ascending: false })
            .limit(LEVEL_PAGE_SIZE);
        if (error) throw error;

        const rows = (data ?? []) as LevelRow[];
        for (const row of rows) {
            if (typeof row.level === "number" && isLevelPassed(row, isGradedActivity(activityId))) return row.level;
        }

        const last = rows[rows.length - 1];
        if (!last || typeof last.level !== "number") break;
        cursor = { level: last.level, id: last.id };
    }
    return 0;
}

/** Baza sa kolonama iz migracije 0001: po jedan mali upit za svaku igru. */
async function highestPassedFromColumns(childId: number): Promise<Map<number, number>> {
    const levels = await Promise.all(GAMES.map((game) => highestPassedLevel(childId, game.activityId)));
    return new Map(GAMES.map((game, index) => [game.activityId, levels[index]]));
}

/**
 * Baza pre migracije: nivo i zvezdice se čitaju iz beleške "Nivo N, Zvezdice: S, …".
 * Bez broja odgovora važi staro pravilo (bar jedna zvezdica).
 */
async function highestPassedFromNotes(childId: number): Promise<Map<number, number>> {
    const highest = new Map<number, number>();
    let lastId = 0;

    for (let page = 0; page < MAX_LEGACY_PAGES; page++) {
        const { data, error } = await supabaseAdmin
            .from("progress_logs")
            .select("id, activity_id, notes, success_level")
            .eq("child_id", childId)
            .like("notes", "%Nivo%")
            .gt("id", lastId)
            .order("id", { ascending: true })
            .limit(PAGE_SIZE);
        if (error) throw error;

        const rows = (data ?? []) as LegacyLogRow[];
        for (const row of rows) {
            const { level } = parseLegacyNotes(row.notes);
            if (level === null || !isLevelPassed(row, isGradedActivity(row.activity_id))) continue;
            if (level > (highest.get(row.activity_id) ?? 0)) highest.set(row.activity_id, level);
        }

        const last = rows[rows.length - 1];
        if (!last) break;
        lastId = last.id;
    }
    return highest;
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        await requireSession();
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);

        const sources = [highestPassedFromView, highestPassedFromColumns, highestPassedFromNotes];
        const { data: highest } = await withSchemaFallback(
            sources.map((read) => async () => ({ data: await read(childId), error: null })),
            "unlocked-levels"
        );

        const unlockedLevels = {} as Record<GameId, number>;
        for (const game of GAMES) {
            const passed = highest.get(game.activityId) ?? 0;
            unlockedLevels[game.id] = Math.min(Math.max(passed + 1, 1), MAX_LEVEL + 1);
        }

        return NextResponse.json({ unlockedLevels });
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/unlocked-levels");
    }
}
