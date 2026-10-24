// app/api/children/[id]/route.ts
import { NextResponse } from "next/server";
import { requireChildOwner } from "@/lib/auth";
import { isForeignKeyViolation, supabaseAdmin } from "@/lib/supabase";
import {
    assertPinAvailable,
    CHILD_NOT_FOUND,
    childWriteError,
    deletePlaySessions,
    parseChildInput,
    selectChildRows,
    toChild,
} from "../../_lib/children";
import { errorResponse, HttpError, parseIdParam, readJsonObject } from "../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

/** Menja podatke deteta. `notes` i `pin_code` se ne diraju ako nisu poslati; `null` ih briše. */
export async function PUT(request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        const session = await requireChildOwner(childId);
        const input = parseChildInput(await readJsonObject(request));

        if (input.pin_code) await assertPinAvailable(input.pin_code, { request, userId: session.userId }, childId);

        const [child] = await selectChildRows((columns) =>
            supabaseAdmin
                .from("children")
                .update({
                    first_name: input.first_name,
                    last_name: input.last_name,
                    date_of_birth: input.date_of_birth,
                    gender: input.gender,
                    ...(input.notes !== undefined ? { notes: input.notes } : {}),
                    ...(input.pin_code !== undefined ? { pin_code: input.pin_code } : {}),
                })
                .eq("id", childId)
                .select(columns)
        ).catch((error: unknown) => {
            throw childWriteError(error, input.pin_code);
        });
        if (!child) throw new HttpError(404, CHILD_NOT_FOUND);

        return NextResponse.json({ child: toChild(child) });
    } catch (error) {
        return errorResponse(error, "PUT /api/children/[id]");
    }
}

async function deleteChildRow(childId: number) {
    const { error } = await supabaseAdmin.from("children").delete().eq("id", childId);
    return error;
}

/** Briše zapise koji zavise od deteta. Posle migracije to radi ON DELETE CASCADE. */
async function deleteDependents(childId: number): Promise<void> {
    const { error: logsError } = await supabaseAdmin.from("progress_logs").delete().eq("child_id", childId);
    if (logsError) throw logsError;
    // Posete (migracija 0004) posle zapisa, da baza nema šta da odvezuje; bez tabele nema šta da se briše.
    await deletePlaySessions(childId);
    const { error: linksError } = await supabaseAdmin.from("user_children").delete().eq("child_id", childId);
    if (linksError) throw linksError;
}

/** Trajno briše dete zajedno sa njegovim rezultatima. */
export async function DELETE(_request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildOwner(childId);

        // Prvo samo dete: sa kaskadnim stranim ključevima to je jedna atomska naredba.
        let error = await deleteChildRow(childId);
        if (error && isForeignKeyViolation(error)) {
            // Baza bez kaskade: prvo zavisni redovi, pa ponovo dete.
            await deleteDependents(childId);
            error = await deleteChildRow(childId);
        }
        if (error) throw error;

        // Baza bez stranih ključeva: ukloni redove koji bi ostali da "vise".
        // Dete je već obrisano, pa greška ovde ne sme da obori zahtev.
        try {
            await deleteDependents(childId);
        } catch (cleanupError) {
            console.error("[api] DELETE /api/children/[id]: čišćenje zavisnih redova:", cleanupError);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error, "DELETE /api/children/[id]");
    }
}
