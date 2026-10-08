// app/api/children/[id]/stories/[storyId]/route.ts
// Izmena i brisanje jedne priče. Samo roditelj/terapeut povezan sa detetom;
// priča mora pripadati baš tom detetu (inače 404).
import { NextResponse } from "next/server";
import { requireChildOwner } from "@/lib/auth";
import {
    STORY_COLUMNS,
    STORY_MIGRATION_REQUIRED,
    STORY_NOT_FOUND,
    STORY_TABLE,
    isMissingTableError,
    readStoryRequest,
    storiesFromRows,
} from "@/lib/customStories";
import { supabaseAdmin } from "@/lib/supabase";
import { errorResponse, HttpError, parseIdParam } from "../../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string; storyId: string }>;
}

/** Proverava vlasništvo nad detetom i vraća oba ID-ja; neispravan ID priče je 404. */
async function authorize(params: RouteContext["params"]): Promise<{ childId: number; storyId: number }> {
    const { id, storyId: rawStoryId } = await params;
    const childId = parseIdParam(id);
    await requireChildOwner(childId);
    const storyId = parseIdParam(rawStoryId);
    if (Number.isNaN(storyId)) throw new HttpError(404, STORY_NOT_FOUND);
    return { childId, storyId };
}

/** Bez tabele (migracija 0003 nije primenjena) upis nije moguć: 409 sa uputstvom. */
function writeError(error: unknown): unknown {
    return isMissingTableError(error) ? new HttpError(409, STORY_MIGRATION_REQUIRED) : error;
}

/** Zamenjuje naslov, sličicu i korake priče. */
export async function PUT(request: Request, { params }: RouteContext) {
    try {
        const { childId, storyId } = await authorize(params);
        const input = await readStoryRequest(request);
        if (!input.ok) throw new HttpError(400, input.error);

        const { data, error } = await supabaseAdmin
            .from(STORY_TABLE)
            .update(input.value)
            .eq("id", storyId)
            .eq("child_id", childId)
            .select(STORY_COLUMNS);
        if (error) throw writeError(error);

        const story = storiesFromRows(data)[0];
        if (!story) throw new HttpError(404, STORY_NOT_FOUND);

        return NextResponse.json({ story });
    } catch (error) {
        return errorResponse(error, "PUT /api/children/[id]/stories/[storyId]");
    }
}

/** Trajno briše priču. */
export async function DELETE(_request: Request, { params }: RouteContext) {
    try {
        const { childId, storyId } = await authorize(params);

        const { data, error } = await supabaseAdmin
            .from(STORY_TABLE)
            .delete()
            .eq("id", storyId)
            .eq("child_id", childId)
            .select("id");
        if (error) throw writeError(error);
        if (!data || data.length === 0) throw new HttpError(404, STORY_NOT_FOUND);

        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, "DELETE /api/children/[id]/stories/[storyId]");
    }
}
