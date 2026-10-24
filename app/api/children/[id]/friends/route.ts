// app/api/children/[id]/friends/route.ts
// „Igraj sa drugom”: deca sa istog roditeljskog naloga koju dete može da pozove da igraju
// zajedno na ovom uređaju (na smenu).
// GET — roditelj ili dečja sesija tog deteta. Vraća SAMO ime (bez prezimena) i drugara
// (lik, izgled, odeća) ostale dece istog naloga — ništa drugo (bez datuma rođenja, pola,
// napretka, PIN-a). Rezultati zajedničke igre se čuvaju samo prijavljenom detetu.
// Samo nalog roditelja (braća i sestre u jednoj porodici): nalog učitelja ili terapeuta
// povezuje decu iz različitih porodica, pa je tamo spisak uvek prazan (i za dečju sesiju
// takvog naloga) — nudi se samo drug koga odrasli upiše na uređaju („Novi drug”).
import { NextResponse } from "next/server";
import { COMPANION_CATALOG } from "@/app/components/avatar3d/manifest";
import { requireChildAccess } from "@/lib/auth";
import { sanitizeCompanion } from "@/lib/companion";
import { supabaseAdmin } from "@/lib/supabase";
import { isRecord } from "@/lib/validation";
import { errorResponse, parseIdParam } from "../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

interface FriendRow {
    id: number;
    first_name: string | null;
    gender: string | null;
    settings: unknown;
}

/** Najviše dece na spisku (nalog terapeuta može imati mnogo dece) */
const MAX_FRIENDS = 12;

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        // Dečja sesija nosi i nalog roditelja (vlasnika), pa su „ostala deca” ista za oba
        const session = await requireChildAccess(childId);
        // Dečja sesija nosi ulogu vlasnika naloga, pa ista provera važi i za nju
        if (session.role !== "parent") return NextResponse.json({ friends: [] }, { headers: { "Cache-Control": "no-store" } });

        const { data: links, error: linkError } = await supabaseAdmin.from("user_children").select("child_id").eq("user_id", session.userId);
        if (linkError) throw linkError;
        const ids = [...new Set(((links ?? []) as { child_id: number }[]).map((row) => row.child_id))].filter((id) => id !== childId).slice(0, MAX_FRIENDS);

        let friends: { id: number; firstName: string; companion: { kind: string; skin: string | null; wear: Record<string, string> } }[] = [];
        if (ids.length > 0) {
            const { data, error } = await supabaseAdmin.from("children").select("id, first_name, gender, settings").in("id", ids);
            if (error) throw error;
            friends = ((data ?? []) as FriendRow[])
                .filter((row) => typeof row.first_name === "string" && row.first_name.trim().length > 0)
                .map((row) => {
                    const settings = isRecord(row.settings) ? row.settings : {};
                    const state = sanitizeCompanion(settings.companion, row.gender, COMPANION_CATALOG);
                    return {
                        id: row.id,
                        firstName: (row.first_name as string).trim().split(/\s+/)[0].slice(0, 30),
                        companion: { kind: state.kind, skin: (state.skin as Partial<Record<string, string>> | undefined)?.[state.kind] ?? null, wear: (state.wear ?? {}) as Record<string, string> },
                    };
                })
                .sort((a, b) => a.firstName.localeCompare(b.firstName, "sr"));
        }

        return NextResponse.json({ friends }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/friends");
    }
}
