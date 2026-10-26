// app/api/children/[id]/invite/requests/route.ts
// „Sanduče” deteta: pozivi drugova sa spiska „Drugovi” (bez koda) koji čekaju odgovor. `[id]`
// je dete kome je poziv namenjen; pristup traži sesiju baš tog deteta ili njegovog roditelja.
//
// GET → { requests: [{ key, friend: { firstName, companion }, game, level[, mode] }] }
// Stranica deteta pita kad se otvori, kad se dete vrati na nju i kad stigne znak na sanduče
// (lib/inviteInbox.ts). Prvo pitanje beleži da je poziv stigao do otvorene stranice — tek tada
// drug ima vremena da odgovori; poziv koji ne stigne za minut domaćin vidi kao „nije tu”.
import { NextResponse } from "next/server";
import { requireChildAccess } from "@/lib/auth";
import { inviteStatus, parseStoredInvite } from "@/lib/invite";
import { takeAttempts } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase";
import { ANSWER_RULE, INVITE_LIMITED, requestCard, updateInvite, type InviteRow } from "../../../../_lib/invites";
import { enforceRateLimit, errorResponse, parseIdParam } from "../../../../_lib/http";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const childId = parseIdParam((await params).id);
        await requireChildAccess(childId);
        enforceRateLimit(takeAttempts([{ key: `invite-inbox:child:${childId}`, rule: ANSWER_RULE }]), INVITE_LIMITED);

        const { data, error } = await supabaseAdmin
            .from("children")
            .select("id, first_name, gender, date_of_birth, settings")
            .eq("settings->invite->request->>guestId", String(childId))
            .limit(5);
        if (error) throw error;
        const now = Date.now();
        const requests: ReturnType<typeof requestCard>[] = [];
        for (const row of (data ?? []) as InviteRow[]) {
            if (row.id === childId) continue;
            const invite = parseStoredInvite((row.settings as Record<string, unknown> | null)?.invite);
            const request = invite?.request;
            if (!invite || !request || request.guestId !== childId || request.via !== "direct" || inviteStatus(invite, now) !== "asking") continue;
            let shown = { invite, request };
            if (!request.seenAt) {
                // Poziv je stigao do otvorene stranice: od sada drug ima vremena da odgovori
                const seenAt = new Date(now).toISOString();
                try {
                    const result = await updateInvite(row.id, (_row, current) => {
                        if (!current?.request || current.request.key !== request.key) return undefined;
                        return { ...current, request: { ...current.request, seenAt } };
                    });
                    if (result.invite?.request?.key === request.key) shown = { invite: result.invite, request: result.invite.request };
                } catch (writeError) {
                    console.error("[api] invite seen:", writeError);
                }
            }
            requests.push(requestCard(row, shown.invite, shown.request));
        }
        return NextResponse.json({ requests }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        return errorResponse(error, "GET /api/children/[id]/invite/requests");
    }
}
