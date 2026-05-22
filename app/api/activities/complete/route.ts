// app/api/activities/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        console.log("🎮 API POZVAN - Početak");
        const user = await verifyToken();
        console.log("✅ User verifikovan:", user.id);

        const body = await req.json();
        console.log("📦 Primljeni podaci:", body);

        const {
            childId,
            activityId,
            successLevel,
            durationMinutes,
            notes,
            moodBefore,
            moodAfter
        } = body;

        // Validacija podataka
        if (!childId || !activityId || !successLevel) {
            console.log("❌ Validacija neuspešna:", { childId, activityId, successLevel });
            return NextResponse.json(
                { error: "Nedostaju obavezna polja" },
                { status: 400 }
            );
        }

        // Proveri da li korisnik ima pristup detetu
        console.log("🔍 Proveravam pristup detetu...");
        const { data: accessRows, error: accessError } = await supabaseAdmin
            .from('user_children')
            .select('id')
            .eq('user_id', user.id)
            .eq('child_id', childId);
            
        console.log("👨‍👧 Pristup rezultat:", accessRows);

        if (!accessRows || accessRows.length === 0) {
            return NextResponse.json(
                { error: "Nemate pristup ovom detetu" },
                { status: 403 }
            );
        }

        // Unesi progress log (bez provere aktivnosti)
        console.log("💾 Upisujem u progress_logs: childId=" + childId + ", activityId=" + activityId);

        const { data: result, error: insertError } = await supabaseAdmin
            .from('progress_logs')
            .insert([{
                child_id: childId,
                activity_id: activityId,
                success_level: successLevel,
                duration_minutes: durationMinutes,
                notes,
                mood_before: moodBefore,
                mood_after: moodAfter,
                recorded_by: user.id
            }])
            .select('id')
            .single();
            
        if (insertError) {
             throw insertError;
        }

        console.log("✅ USPEŠNO UPISANO! Insert ID:", result.id);

        return NextResponse.json({
            success: true,
            logId: result.id,
            message: "Rezultat uspešno sačuvan!"
        });

    } catch (error) {
        console.error("💥 GREŠKA U API:", error);
        return NextResponse.json(
            { error: "Greška pri čuvanju rezultata" },
            { status: 500 }
        );
    }
}