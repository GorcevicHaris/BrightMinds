// app/api/activities/complete/route.ts
// POST  — čuva završenu partiju (zvezdice, uspešnost i „nivo položen” računa SERVER)
//         i vezuje je za posetu (play_sessions): raspoloženje pre igre se čuva
//         jednom, na poseti, a ne uz svaku partiju.
// PATCH — upisuje raspoloženje posle igre: na posetu (sessionId) ili, u bazi bez
//         tabele poseta, uz već sačuvane partije (logIds).
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import {
    ACTIVITY_IDS,
    MAX_LEVEL,
    MOODS,
    isGradedActivity,
    starsForGame,
    successLevelFor,
    type Mood,
} from "@/lib/games";
import { noResult, supabaseAdmin, withSchemaFallback } from "@/lib/supabase";
import { asInt, asIntArray, asNumber, oneOf } from "@/lib/validation";
import { isLevelPassed, PLAY_SESSIONS_MEMO, PLAY_SESSIONS_TABLE } from "../../_lib/children";
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
    /** Zadaci rešeni samostalno */
    correct: number;
    /** Zadaci rešeni tek uz pomoć (istaknut odgovor); `null` = klijent nije poslao */
    prompted: number | null;
    total: number;
    durationSec: number;
    moodBefore: Mood | null;
    /** Poseta koju je klijent dobio pri prethodnoj partiji; `null` = prva partija posete */
    sessionId: number | null;
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

    // Samostalni i potpomognuti odgovori zajedno ne mogu premašiti broj zadataka.
    let prompted: number | null = null;
    if (body.prompted !== undefined && body.prompted !== null) {
        prompted = asInt(body.prompted, { min: 0, max: 1000 });
        if (prompted === null || correct + prompted > total) throw new HttpError(400, INVALID_RESULT);
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
        prompted,
        total,
        durationSec: Math.round(durationSec),
        moodBefore,
        // Neupotrebljiva vrednost se tretira kao da nije poslata: otvara se nova poseta.
        sessionId: asInt(body.sessionId, { min: 1 }),
    };
}

/**
 * Poseta kojoj partija pripada. Poslata poseta važi samo ako pripada OVOM detetu;
 * u suprotnom (ili kada nije poslata) otvara se nova, sa raspoloženjem pre igre.
 * Vraća `null` kada baza još nema tabelu poseta (migracija 0004) — i kada upis
 * posete ne uspe: poseta je sporedna, partija mora da se sačuva i bez nje.
 */
async function resolvePlaySession(
    childId: number,
    requestedId: number | null,
    moodBefore: Mood | null,
    userId: number
): Promise<number | null> {
    try {
        const { data } = await withSchemaFallback<unknown>(
            [
                async () => {
                    if (requestedId !== null) {
                        const existing = await supabaseAdmin
                            .from(PLAY_SESSIONS_TABLE)
                            .select("id")
                            .eq("id", requestedId)
                            .eq("child_id", childId)
                            .limit(1);
                        if (existing.error || (existing.data ?? []).length > 0) return existing;
                    }
                    return supabaseAdmin
                        .from(PLAY_SESSIONS_TABLE)
                        .insert({ child_id: childId, mood_before: moodBefore, created_by: userId })
                        .select("id");
                },
                noResult,
            ],
            PLAY_SESSIONS_MEMO
        );
        return ((data ?? []) as { id: number }[])[0]?.id ?? null;
    } catch (error) {
        console.error("[api] POST /api/activities/complete: poseta nije zabeležena:", error);
        return null;
    }
}

/**
 * Upisuje raspoloženje posle igre i kraj posete. `false` ako poseta ne pripada
 * detetu ili baza nema tabelu poseta.
 */
async function endPlaySession(childId: number, sessionId: number, moodAfter: Mood): Promise<boolean> {
    const { data } = await withSchemaFallback<unknown>([
        () =>
            supabaseAdmin
                .from(PLAY_SESSIONS_TABLE)
                .update({ mood_after: moodAfter, ended_at: new Date().toISOString() })
                .eq("id", sessionId)
                .eq("child_id", childId)
                .select("id"),
        noResult,
    ]);
    return ((data ?? []) as { id: number }[]).length > 0;
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

        // Zvezdice zavise samo od SAMOSTALNO tačnih odgovora; završen nivo donosi bar jednu.
        // Aktivnost bez ocenjivanih zadataka (npr. priča u režimu samo čitanja) je završena,
        // ali nije učinak: jedna zvezdica, bez uticaja na statistiku tačnosti i otključavanje.
        const stars = game.total === 0 ? 1 : starsForGame(isGradedActivity(game.activityId), game.correct, game.total);
        const successLevel = successLevelFor(stars);
        // Odluka „nivo položen” se donosi ovde, jednom, i čuva uz partiju.
        const passed = isLevelPassed(
            { correct_count: game.correct, total_count: game.total, stars, success_level: successLevel },
            isGradedActivity(game.activityId)
        );

        const sessionId = await resolvePlaySession(childId, game.sessionId, game.moodBefore, session.userId);

        // Kolone koje postoje i u bazi pre migracija. `notes` zadržava stari
        // format jer ga čitaju stariji zapisi i izveštaji.
        const base = {
            child_id: childId,
            activity_id: game.activityId,
            success_level: successLevel,
            duration_minutes: Math.max(1, Math.ceil(game.durationSec / 60)),
            notes: `Nivo ${game.level}, Zvezdice: ${stars}, Rezultat: ${game.score}`,
            recorded_by: session.userId,
        };
        // Raspoloženje pre igre ide uz partiju samo kada nema posete koja ga čuva.
        const legacyRow = { ...base, mood_before: game.moodBefore };
        // + kolone iz migracije 0001
        const structured = {
            level: game.level,
            stars,
            score: game.score,
            correct_count: game.correct,
            total_count: game.total,
            duration_seconds: game.durationSec,
        };
        // + kolona iz migracije 0002 (samo ako je klijent poslao broj odgovora uz pomoć)
        const prompted = game.prompted !== null ? { prompted_count: game.prompted } : {};
        // + kolone iz migracije 0004
        const sessionOrMood = sessionId !== null ? { session_id: sessionId } : { mood_before: game.moodBefore };

        // Od najpotpunijeg reda ka najstarijem obliku: ako baza nema kolonu, upis se
        // ponavlja bez nje. Partija se tako čuva i u bazi bez ijedne migracije.
        const rows: Record<string, unknown>[] = [
            { ...base, ...structured, ...prompted, ...sessionOrMood, passed },
            { ...legacyRow, ...structured, ...prompted },
            { ...legacyRow, ...structured },
            legacyRow,
        ];
        // Poseta napravljena baš za ovu partiju ne sme da ostane prazna ako se partija ne veže za nju
        const createdSessionId = sessionId !== null && sessionId !== game.sessionId ? sessionId : null;
        const dropUnusedSession = async () => {
            if (createdSessionId === null) return;
            const { error } = await supabaseAdmin.from(PLAY_SESSIONS_TABLE).delete().eq("id", createdSessionId).eq("child_id", childId);
            if (error) console.error("[api] POST /api/activities/complete: prazna poseta nije obrisana:", error);
        };

        let inserted: { data: unknown; variant: number };
        try {
            inserted = await withSchemaFallback<unknown>(
                rows.map((row) => () => supabaseAdmin.from("progress_logs").insert(row).select("id").single()),
                "progress_logs.insert"
            );
        } catch (error) {
            await dropUnusedSession();
            throw error;
        }
        const { data, variant } = inserted;
        if (variant !== 0) await dropUnusedSession();
        const logId = (data as { id: number }).id;

        const experiencePoints = await awardExperience(childId, stars * POINTS_PER_STAR);

        return NextResponse.json({
            success: true,
            logId,
            stars,
            experiencePoints,
            // Poseta se vraća samo ako je partija zaista vezana za nju; inače klijent
            // raspoloženje posle igre šalje uz partije (logIds), kao u bazi bez poseta.
            sessionId: variant === 0 ? sessionId : null,
        });
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

        // Bar jedno od: poseta (sessionId) ili spisak partija (logIds, baza bez poseta).
        let sessionId: number | null = null;
        if (body.sessionId !== undefined && body.sessionId !== null) {
            sessionId = asInt(body.sessionId, { min: 1 });
            if (sessionId === null) throw new HttpError(400, "Neispravna poseta");
        }
        let logIds: number[] | null = null;
        if (body.logIds !== undefined && body.logIds !== null) {
            logIds = asIntArray(body.logIds, { minItems: 1, maxItems: 50, min: 1 });
            if (!logIds) throw new HttpError(400, "Neispravan spisak partija");
        }
        if (sessionId === null && logIds === null) throw new HttpError(400, "Neispravan spisak partija");

        const moodAfter = oneOf(body.moodAfter, MOOD_VALUES);
        if (!moodAfter) throw new HttpError(400, "Nepoznato raspoloženje");

        // Sa posetom se odgovor čuva jednom, na njoj. Uslov po child_id (i ovde i
        // ispod) sprečava izmenu tuđih zapisa čak i ako se pošalju njihovi ID-jevi.
        let saved = sessionId !== null && (await endPlaySession(childId, sessionId, moodAfter));

        if (!saved && logIds) {
            const { error } = await supabaseAdmin
                .from("progress_logs")
                .update({ mood_after: moodAfter })
                .in("id", logIds)
                .eq("child_id", childId);
            if (error) throw error;
            saved = true;
        }
        if (!saved) throw new HttpError(404, "Poseta nije pronađena");

        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, "PATCH /api/activities/complete");
    }
}
