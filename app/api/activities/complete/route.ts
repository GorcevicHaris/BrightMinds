// app/api/activities/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

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
        const [accessRows] = await pool.query<RowDataPacket[]>(
            "SELECT id FROM user_children WHERE user_id = ? AND child_id = ?",
            [user.id, childId]
        );
        console.log("👨‍👧 Pristup rezultat:", accessRows);

        if (accessRows.length === 0) {
            return NextResponse.json(
                { error: "Nemate pristup ovom detetu" },
                { status: 403 }
            );
        }

        // Unesi progress log (bez provere aktivnosti)
        console.log("💾 Upisujem u progress_logs...");
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO progress_logs 
       (child_id, activity_id, success_level, duration_minutes, notes, mood_before, mood_after, recorded_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [childId, activityId, successLevel, durationMinutes, notes, moodBefore, moodAfter, user.id]
        );
        console.log("✅ USPEŠNO UPISANO! Insert ID:", result.insertId);

        return NextResponse.json({
            success: true,
            logId: result.insertId,
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