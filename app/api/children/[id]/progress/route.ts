// app/api/children/[id]/progress/route.ts
// GET — statistika napretka jednog deteta (za roditelja/terapeuta i za dečji "Napredak").
// Oblik odgovora: `ProgressResponse` iz lib/progress.ts — pored aktivnosti i nivoa nosi
// samostalno/uz pomoć rešene zadatke po partiji, udele za 30 dana, savladanost i trend po igri.
import { NextResponse } from "next/server";
import { requireChildAccess, requireChildOwner } from "@/lib/auth";
import { ACTIVITY_IDS } from "@/lib/games";
import { buildProgress, type ProgressResponse } from "@/lib/progress";
import { supabaseAdmin } from "@/lib/supabase";
import { deletePlaySessions, fetchPlaySessions, selectProgressLogs, type ProgressLogRow } from "../../../_lib/children";
import { errorResponse, parseIdParam, requireSession } from "../../../_lib/http";

/** PostgREST vraća najviše 1000 redova po upitu, pa čitamo stranu po stranu. */
const PAGE_SIZE = 1000;
const MAX_ROWS = 20_000;

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Svi zapisi deteta za igre iz lib/games.ts, bez spajanja sa tabelom `activities`
 * (nazivi igara dolaze iz lib/games.ts). Čitaju se samo kolone koje statistika
 * koristi; u bazi koja ih još nema sve upit se ponavlja sa `*`, a `buildProgress`
 * tada koristi starije podatke ili `null`.
 */
async function fetchLogs(childId: number): Promise<ProgressLogRow[]> {
    const rows: ProgressLogRow[] = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
        const page = await selectProgressLogs((columns) =>
            supabaseAdmin
                .from("progress_logs")
                .select(columns)
                .eq("child_id", childId)
                .in("activity_id", ACTIVITY_IDS)
                .order("completed_at", { ascending: false })
                .order("id", { ascending: false })
                .range(from, from + PAGE_SIZE - 1)
        );
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

        // Zapisi i posete se čitaju istovremeno. Posete nose raspoloženje pre/posle
        // igre (jednom po poseti); poseta je najviše koliko i zapisa, pa važi ista granica.
        const [logs, sessions] = await Promise.all([fetchLogs(childId), fetchPlaySessions(childId, MAX_ROWS)]);

        const body: ProgressResponse = buildProgress(logs, new Date(), sessions);
        return NextResponse.json(body, { headers: NO_STORE });
    } catch (error) {
        // AuthError → 401/403 (authErrorResponse), nepodešena baza → 503, ostalo → 500
        return errorResponse(error, "GET /api/children/[id]/progress");
    }
}

/**
 * DELETE — trajno briše sve zabeležene rezultate deteta i njegove posete (pravo na brisanje podataka).
 * Samo roditelj/staratelj povezan sa detetom; dečja sesija nema ovo pravo.
 * Profil, podešavanja i poeni ostaju; poeni se vraćaju na nulu.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildOwner(childId);

        const { error } = await supabaseAdmin.from("progress_logs").delete().eq("child_id", childId);
        if (error) throw error;

        // Posete (raspoloženje pre/posle igre) su takođe podaci o igri. Brišu se POSLE
        // zapisa: tada nijedan zapis više ne pokazuje na njih, pa baza nema šta da odvezuje.
        await deletePlaySessions(childId);

        // Poeni su izvedeni iz rezultata, pa se brišu sa njima (greška ovde ne poništava brisanje)
        await supabaseAdmin.from("children").update({ experience_points: 0 }).eq("id", childId);

        return NextResponse.json({ success: true }, { headers: NO_STORE });
    } catch (error) {
        return errorResponse(error, "children/[id]/progress DELETE");
    }
}
