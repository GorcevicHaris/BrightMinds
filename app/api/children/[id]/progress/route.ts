// app/api/children/[id]/progress/route.ts
// GET — statistika napretka jednog deteta (za roditelja/terapeuta i za dečji "Napredak").
// Oblik odgovora: `ProgressResponse` iz lib/progress.ts — pored aktivnosti i nivoa nosi
// samostalno/uz pomoć rešene zadatke po partiji, udele za 30 dana, savladanost i trend po igri.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { ACTIVITY_IDS } from "@/lib/games";
import { buildProgress, type ProgressResponse } from "@/lib/progress";
import { supabaseAdmin } from "@/lib/supabase";
import { errorResponse, parseIdParam, requireSession } from "../../../_lib/http";

/** PostgREST vraća najviše 1000 redova po upitu, pa čitamo stranu po stranu. */
const PAGE_SIZE = 1000;
const MAX_ROWS = 20_000;

/**
 * Svi zapisi deteta za igre iz lib/games.ts. Namerno `select('*')` bez spajanja sa
 * tabelom `activities`: nove kolone (level, stars, score, correct_count, prompted_count…)
 * možda još ne postoje u bazi — `buildProgress` tada koristi starije podatke ili `null` —
 * a nazivi igara dolaze iz lib/games.ts.
 */
async function fetchLogs(childId: number): Promise<unknown[]> {
    const rows: unknown[] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
            .from("progress_logs")
            .select("*")
            .eq("child_id", childId)
            .in("activity_id", ACTIVITY_IDS)
            .order("completed_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;

        const page: unknown[] = data ?? [];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
    }
    return rows;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Neprijavljen poziv uvek dobija 401; pristup ima roditelj deteta ili samo dete.
        await requireSession();
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);

        const body: ProgressResponse = buildProgress(await fetchLogs(childId));
        return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        // AuthError → 401/403 (authErrorResponse), nepodešena baza → 503, ostalo → 500
        return errorResponse(error, "GET /api/children/[id]/progress");
    }
}
