// app/api/children/[id]/stories/route.ts
// „Moje priče” — priče koje odrasli piše za dete. Model i provera su u lib/customStories.ts.
// GET  — roditelj ILI dečja sesija tog deteta (dete čita svoje priče).
// POST — samo roditelj/terapeut povezan sa detetom.
import { NextResponse } from "next/server";
import { requireChildAccess, requireChildOwner } from "@/lib/auth";
import {
    MAX_STORIES_PER_CHILD,
    STORY_COLUMNS,
    STORY_LIMIT_REACHED,
    STORY_MIGRATION_REQUIRED,
    STORY_TABLE,
    isMissingTableError,
    readStoryRequest,
    storiesFromRows,
} from "@/lib/customStories";
import { supabaseAdmin } from "@/lib/supabase";
import { errorResponse, HttpError, parseIdParam, requireSession } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

/** Bez tabele (migracija 0003 nije primenjena) upis nije moguć: 409 sa uputstvom. */
function writeError(error: unknown): unknown {
    return isMissingTableError(error) ? new HttpError(409, STORY_MIGRATION_REQUIRED) : error;
}

/** Priče deteta, najnovije prvo. Dok tabela ne postoji, spisak je prazan. */
export async function GET(_request: Request, { params }: RouteContext) {
    try {
        await requireSession();
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);

        const { data, error } = await supabaseAdmin
            .from(STORY_TABLE)
            .select(STORY_COLUMNS)
            .eq("child_id", childId)
            .order("updated_at", { ascending: false })
            .order("id", { ascending: false });
        if (error && !isMissingTableError(error)) throw error;

        return NextResponse.json(
            { stories: error ? [] : storiesFromRows(data) },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/stories");
    }
}

/** Dodaje priču. Najviše `MAX_STORIES_PER_CHILD` po detetu. */
export async function POST(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        const session = await requireChildOwner(childId);
        const input = await readStoryRequest(request);
        if (!input.ok) throw new HttpError(400, input.error);

        const { data: existing, error: countError } = await supabaseAdmin
            .from(STORY_TABLE)
            .select("id")
            .eq("child_id", childId)
            .limit(MAX_STORIES_PER_CHILD);
        if (countError) throw writeError(countError);
        if ((existing ?? []).length >= MAX_STORIES_PER_CHILD) throw new HttpError(409, STORY_LIMIT_REACHED);

        const { data, error } = await supabaseAdmin
            .from(STORY_TABLE)
            .insert({ child_id: childId, ...input.value, created_by: session.userId })
            .select(STORY_COLUMNS);
        if (error) throw writeError(error);

        const story = storiesFromRows(data)[0];
        if (!story) throw new Error("custom_stories: upis nije vratio red");

        return NextResponse.json({ story }, { status: 201 });
    } catch (error) {
        return errorResponse(error, "POST /api/children/[id]/stories");
    }
}
