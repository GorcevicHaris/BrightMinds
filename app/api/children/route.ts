// app/api/children/route.ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import {
    assertPinAvailable,
    childWriteError,
    parseChildInput,
    selectChildRows,
    toChild,
} from "../_lib/children";
import { errorResponse, readJsonObject } from "../_lib/http";

/** Deca prijavljenog roditelja/učitelja, po imenu. */
export async function GET() {
    try {
        const session = await requireUser();

        const { data: links, error: linksError } = await supabaseAdmin
            .from("user_children")
            .select("child_id")
            .eq("user_id", session.userId);
        if (linksError) throw linksError;

        const childIds = ((links ?? []) as { child_id: number }[]).map((link) => link.child_id);
        if (childIds.length === 0) return NextResponse.json({ children: [] });

        const rows = await selectChildRows((columns) =>
            supabaseAdmin
                .from("children")
                .select(columns)
                .in("id", childIds)
                .order("first_name", { ascending: true })
                .order("id", { ascending: true })
        );

        return NextResponse.json({ children: rows.map(toChild) });
    } catch (error) {
        return errorResponse(error, "GET /api/children");
    }
}

/** Dodaje dete i povezuje ga sa prijavljenim korisnikom. */
export async function POST(request: Request) {
    try {
        const session = await requireUser();
        const input = parseChildInput(await readJsonObject(request));
        const pinCode = input.pin_code ?? null;

        if (pinCode) await assertPinAvailable(pinCode);

        const [child] = await selectChildRows((columns) =>
            supabaseAdmin
                .from("children")
                .insert({
                    first_name: input.first_name,
                    last_name: input.last_name,
                    date_of_birth: input.date_of_birth,
                    gender: input.gender,
                    notes: input.notes ?? null,
                    pin_code: pinCode,
                })
                .select(columns)
        ).catch((error: unknown) => {
            throw childWriteError(error, pinCode);
        });
        if (!child) throw new Error("Dete nije sačuvano");

        const { error: linkError } = await supabaseAdmin.from("user_children").insert({
            user_id: session.userId,
            child_id: child.id,
            relationship: "parent",
            is_primary: true,
        });
        if (linkError) {
            // Bez veze sa roditeljem dete bi ostalo "siroče" koje niko ne vidi — poništi upis.
            try {
                const { error: rollbackError } = await supabaseAdmin.from("children").delete().eq("id", child.id);
                if (rollbackError) throw rollbackError;
            } catch (rollbackError) {
                console.error("[api] POST /api/children: poništavanje upisa nije uspelo:", rollbackError);
            }
            throw linkError;
        }

        return NextResponse.json({ child: toChild(child) }, { status: 201 });
    } catch (error) {
        return errorResponse(error, "POST /api/children");
    }
}
