// app/api/children/[id]/unlocked-levels/route.ts
// Za svaku igru vraća (najviši POLOŽEN nivo + 1), u opsegu 1..MAX_LEVEL + 1.
// Pravilo i čitanje iz baze su u app/api/_lib/levels.ts.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { readUnlockedLevels } from "../../../_lib/levels";
import { errorResponse, parseIdParam, requireSession } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        await requireSession();
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);

        return NextResponse.json({ unlockedLevels: await readUnlockedLevels(childId) });
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/unlocked-levels");
    }
}
