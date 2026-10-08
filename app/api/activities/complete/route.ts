// app/api/activities/complete/route.ts
// POST  — čuva završenu partiju (zvezdice i uspešnost računa SERVER).
// PATCH — naknadno upisuje raspoloženje posle igre za već sačuvane partije.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { ACTIVITY_IDS, MAX_LEVEL, MOODS, starsFor, successLevelFor, type Mood } from "@/lib/games";
import { isMissingColumnError, supabaseAdmin } from "@/lib/supabase";
import { asInt, asIntArray, asNumber, oneOf } from "@/lib/validation";
import { errorResponse, HttpError, readJsonObject, requireSession } from "../../_lib/http";

const MOOD_VALUES: readonly Mood[] = MOODS.map((mood) => mood.value);

const POINTS_PER_STAR = 5;
const MAX_AWARD_RETRIES = 3;
const INVALID_RESULT = "Neispravni podaci o rezultatu";

function readChildId(body: Record<string, unknown>): number {
    const childId = asInt(body.childId, { min: 1 });
    if (childId === null) throw new HttpError(400, "Neispravan ID deteta");
    return childId;
}

interface CompletedGame {
    activityId: number;
    level: number;
    score: number;
    correct: number;
    total: number;
    durationSec: number;
    moodBefore: Mood | null;
}

function parseCompletedGame(body: Record<string, unknown>): CompletedGame {
    const activityId = asInt(body.activityId);
    if (activityId === null || !ACTIVITY_IDS.includes(activityId)) {
        throw new HttpError(400, "Nepoznata igra");
    }

    const level = asInt(body.level, { min: 1, max: MAX_LEVEL });
    if (level === null) throw new HttpError(400, `Nivo mora biti između 1 i ${MAX_LEVEL}`);

    const total = asInt(body.total, { min: 0, max: 1000 });
    const correct = asInt(body.correct, { min: 0, max: 1000 });
    const score = asNumber(body.score, { min: 0, max: 1_000_000 });
    const durationSec = asNumber(body.durationSec, { min: 1, max: 7200 });
    if (total === null || correct === null || correct > total || score === null || durationSec === null) {
        throw new HttpError(400, INVALID_RESULT);
    }

    let moodBefore: Mood | null = null;
    if (body.moodBefore !== undefined && body.moodBefore !== null) {
        moodBefore = oneOf(body.moodBefore, MOOD_VALUES);
        if (!moodBefore) throw new HttpError(400, "Nepoznato raspoloženje");
    }

    return {
        activityId,
        level,
        score: Math.round(score),
        correct,
        total,
        durationSec: Math.round(durationSec),
        moodBefore,
    };
}

/**
 * Dodaje poene detetu i vraća novo stanje. Upis je uslovan (compare-and-swap),
 * pa se paralelne nagrade ne gube. Nagrada je sporedna: greška se samo beleži
 * i vraća se `null`, a rezultat partije ostaje sačuvan.
 */
async function awardExperience(childId: number, amount: number): Promise<number | null> {
    try {
        for (let attempt = 0; attempt < MAX_AWARD_RETRIES; attempt++) {
            const { data, error } = await supabaseAdmin
                .from("children")
                .select("experience_points")
                .eq("id", childId)
                .limit(1);
            if (error) throw error;

            const row = ((data ?? []) as { experience_points: number | null }[])[0];
            if (!row) return null;
            const current = row.experience_points;
            if (amount === 0) return current ?? 0;

            const next = (current ?? 0) + amount;
            let update = supabaseAdmin.from("children").update({ experience_points: next }).eq("id", childId);
            update =
                current === null ? update.is("experience_points", null) : update.eq("experience_points", current);

            const { data: updated, error: updateError } = await update.select("id");
            if (updateError) throw updateError;
            if (updated && updated.length > 0) return next;
        }
        return null;
    } catch (error) {
        console.error("[api] POST /api/activities/complete: dodela poena nije uspela:", error);
        return null;
    }
}

export async function POST(request: Request) {
    try {
        await requireSession();
        const body = await readJsonObject(request);
        const childId = readChildId(body);
        const session = await requireChildAccess(childId);
        const game = parseCompletedGame(body);

        const stars = starsFor(game.correct, game.total);

        // Kolone koje postoje i u bazi pre migracije. `notes` zadržava stari
        // format jer ga čitaju stariji zapisi i izveštaji.
        const legacyRow = {
            child_id: childId,
            activity_id: game.activityId,
            success_level: successLevelFor(stars),
            duration_minutes: Math.max(1, Math.ceil(game.durationSec / 60)),
            notes: `Nivo ${game.level}, Zvezdice: ${stars}, Rezultat: ${game.score}`,
            mood_before: game.moodBefore,
            recorded_by: session.userId,
        };
        const fullRow = {
            ...legacyRow,
            level: game.level,
            stars,
            score: game.score,
            correct_count: game.correct,
            total_count: game.total,
            duration_seconds: game.durationSec,
        };

        let { data, error } = await supabaseAdmin.from("progress_logs").insert(fullRow).select("id").single();
        if (error && isMissingColumnError(error)) {
            // Migracija još nije primenjena — sačuvaj bar osnovne kolone.
            ({ data, error } = await supabaseAdmin.from("progress_logs").insert(legacyRow).select("id").single());
        }
        if (error) throw error;

        const logId = (data as { id: number }).id;
        const experiencePoints = await awardExperience(childId, stars * POINTS_PER_STAR);

        return NextResponse.json({ success: true, logId, stars, experiencePoints });
    } catch (error) {
        return errorResponse(error, "POST /api/activities/complete");
    }
}

export async function PATCH(request: Request) {
    try {
        await requireSession();
        const body = await readJsonObject(request);
        const childId = readChildId(body);
        await requireChildAccess(childId);

        const logIds = asIntArray(body.logIds, { minItems: 1, maxItems: 50, min: 1 });
        if (!logIds) throw new HttpError(400, "Neispravan spisak partija");

        const moodAfter = oneOf(body.moodAfter, MOOD_VALUES);
        if (!moodAfter) throw new HttpError(400, "Nepoznato raspoloženje");

        // Uslov po child_id sprečava izmenu tuđih zapisa čak i ako se pošalju njihovi ID-jevi.
        const { error } = await supabaseAdmin
            .from("progress_logs")
            .update({ mood_after: moodAfter })
            .in("id", logIds)
            .eq("child_id", childId);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, "PATCH /api/activities/complete");
    }
}
