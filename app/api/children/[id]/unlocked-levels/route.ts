// app/api/children/[id]/unlocked-levels/route.ts
// Za svaku igru vraća (najviši POLOŽEN nivo + 1), u opsegu 1..MAX_LEVEL + 1.
// Vrednost MAX_LEVEL + 1 znači da su svi nivoi položeni. Podrazumevano 1.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { GAMES, MAX_LEVEL, type GameId } from "@/lib/games";
import { isMissingColumnError, supabaseAdmin } from "@/lib/supabase";
import { errorResponse, parseIdParam, requireSession } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

interface LegacyLogRow {
    id: number;
    activity_id: number;
    notes: string | null;
    success_level: string | null;
}

const PAGE_SIZE = 1000;
const MAX_LEGACY_PAGES = 50;

/**
 * Partija je položena ako ima bar jednu zvezdicu. Stariji zapisi bez zvezdica
 * računaju se kao položeni osim ako je uspešnost "struggled".
 */
const PASSED_FILTER = [
    "stars.gte.1",
    "and(stars.is.null,success_level.neq.struggled)",
    "and(stars.is.null,success_level.is.null)",
].join(",");

/** Baza sa kolonama `level`/`stars`: jedan mali upit po igri. */
async function highestPassedFromColumns(childId: number): Promise<Map<number, number>> {
    const results = await Promise.all(
        GAMES.map((game) =>
            supabaseAdmin
                .from("progress_logs")
                .select("level")
                .eq("child_id", childId)
                .eq("activity_id", game.activityId)
                .not("level", "is", null)
                .or(PASSED_FILTER)
                .order("level", { ascending: false })
                .limit(1)
        )
    );

    const highest = new Map<number, number>();
    results.forEach(({ data, error }, index) => {
        if (error) throw error;
        const level = ((data ?? []) as { level: number | null }[])[0]?.level;
        if (typeof level === "number") highest.set(GAMES[index].activityId, level);
    });
    return highest;
}

/** Baza pre migracije: nivo i zvezdice se čitaju iz beleške "Nivo N, Zvezdice: S, …". */
async function highestPassedFromNotes(childId: number): Promise<Map<number, number>> {
    const highest = new Map<number, number>();

    for (let page = 0; page < MAX_LEGACY_PAGES; page++) {
        const { data, error } = await supabaseAdmin
            .from("progress_logs")
            .select("id, activity_id, notes, success_level")
            .eq("child_id", childId)
            .like("notes", "%Nivo%")
            .order("id", { ascending: true })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (error) throw error;

        const rows = (data ?? []) as LegacyLogRow[];
        for (const row of rows) {
            const levelMatch = row.notes?.match(/Nivo\s+(\d{1,3})/);
            if (!levelMatch) continue;
            const starsMatch = row.notes?.match(/Zvezdice:\s*(\d+)/);
            const passed = starsMatch ? Number(starsMatch[1]) >= 1 : row.success_level !== "struggled";
            if (!passed) continue;

            const level = Number(levelMatch[1]);
            if (level > (highest.get(row.activity_id) ?? 0)) highest.set(row.activity_id, level);
        }
        if (rows.length < PAGE_SIZE) break;
    }
    return highest;
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        await requireSession();
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);

        let highest: Map<number, number>;
        try {
            highest = await highestPassedFromColumns(childId);
        } catch (error) {
            if (!isMissingColumnError(error)) throw error;
            highest = await highestPassedFromNotes(childId);
        }

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
