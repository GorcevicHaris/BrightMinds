// app/api/children/[id]/companion/route.ts
// Pratilac deteta i novčići (model: lib/companion.ts).
// GET — roditelj ili dečja sesija tog deteta: izabrani pratilac, odeća i novčići.
// PUT — isto: dete samo bira pratioca, kupuje predmete i komplete, oblači i skida odeću,
//       bira izgled (boju) drugara i kupuje posebna krzna, i bira cilj (predmet, komplet ili
//       poseban izgled za koji skuplja novčiće). Radnje: lib/companion.ts. Cenu i stanje novčića
//       uvek proverava server; upis uspeva samo ako se stanje u međuvremenu nije
//       promenilo (dva brza dodira ne mogu dvaput da potroše iste novčiće).
import { NextResponse } from "next/server";
import { COMPANION_CATALOG } from "@/app/components/avatar3d/manifest";
import { requireChildAccess } from "@/lib/auth";
import { applyCompanionAction, parseCompanionAction, sanitizeCompanion, type CompanionCatalog } from "@/lib/companion";
import { companionBody } from "@/lib/companionPayload";
import { supabaseAdmin } from "@/lib/supabase";
import { isRecord } from "@/lib/validation";
import { CHILD_NOT_FOUND } from "../../../_lib/children";
import { errorResponse, HttpError, parseIdParam, readJsonObject } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

// Katalog 3D drugara (čisti podaci, bez three.js): svi stari predmeti (isti id i cena),
// donji deo, kompleti, krzna životinja i besplatan izgled čoveka (looks.ts)
const CATALOG: CompanionCatalog = COMPANION_CATALOG;

const MESSAGES = {
    unknown: "Nepoznat izbor",
    "not-owned": "To još nije kupljeno",
    owned: "To je već kupljeno",
    coins: "Nema dovoljno novčića",
} as const;

const MAX_RETRIES = 3;

interface ChildCompanionRow {
    gender: string | null;
    experience_points: number | null;
    settings: unknown;
}

async function loadRow(childId: number): Promise<ChildCompanionRow> {
    const { data, error } = await supabaseAdmin.from("children").select("gender, experience_points, settings").eq("id", childId).limit(1);
    if (error) throw error;
    const row = ((data ?? []) as ChildCompanionRow[])[0];
    if (!row) throw new HttpError(404, CHILD_NOT_FOUND);
    return row;
}

function stateOf(row: ChildCompanionRow) {
    const settings = isRecord(row.settings) ? row.settings : {};
    return sanitizeCompanion(settings.companion, row.gender, CATALOG);
}

function response(row: ChildCompanionRow, state = stateOf(row)) {
    return NextResponse.json(companionBody(state, row.experience_points), { headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);
        return response(await loadRow(childId));
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/companion");
    }
}

export async function PUT(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);
        const action = parseCompanionAction(await readJsonObject(request));
        if (!action) throw new HttpError(400, "Neispravan zahtev");

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            const row = await loadRow(childId);
            const state = stateOf(row);
            const result = applyCompanionAction(state, action, row.experience_points, CATALOG);
            if (!result.ok) throw new HttpError(result.reason === "coins" ? 402 : 400, MESSAGES[result.reason]);

            const settings = isRecord(row.settings) ? row.settings : {};
            // Upis samo ako je brojač izmena isti kao pri čitanju (inače je neko drugi upisao u međuvremenu)
            let update = supabaseAdmin.from("children").update({ settings: { ...settings, companion: result.state } }).eq("id", childId);
            update = state.v === 0 && !isRecord(settings.companion) ? update : update.eq("settings->companion->>v", String(state.v));
            const { data, error } = await update.select("id");
            if (error) throw error;
            if (data && data.length > 0) return response(row, result.state);
        }
        throw new HttpError(409, "Pokušaj ponovo");
    } catch (error) {
        return errorResponse(error, "PUT /api/children/[id]/companion");
    }
}
