// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { AuthError, clearSessionCookie, getSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { errorResponse, jsonError } from "../../_lib/http";
import { PUBLIC_USER_COLUMNS, toPublicUser, type PublicUser } from "../../_lib/users";

const NOT_LOGGED_IN = "Niste prijavljeni";

/** Trenutno prijavljeni roditelj/učitelj. Dečja sesija ovde nije korisnik → 401. */
export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.childId) throw new AuthError(401, NOT_LOGGED_IN);

        const { data, error } = await supabaseAdmin
            .from("users")
            .select(PUBLIC_USER_COLUMNS)
            .eq("id", session.userId)
            .limit(1);
        if (error) throw error;

        const user = ((data ?? []) as PublicUser[])[0];
        if (!user) {
            // Nalog je u međuvremenu obrisan — poništi kolačić.
            const response = jsonError(NOT_LOGGED_IN, 401);
            clearSessionCookie(response);
            return response;
        }

        return NextResponse.json({ user: toPublicUser(user) });
    } catch (error) {
        return errorResponse(error, "GET /api/auth/me");
    }
}
