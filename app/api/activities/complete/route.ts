// app/api/activities/complete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export async function POST(req: NextRequest) {
    try {
        const user = await verifyToken();
        const { childId, activityId, successLevel, durationMinutes, notes } = await req.json();

        // Validacija podataka
        if (!childId || !activityId || !successLevel) {
            return NextResponse.json(
                { error: "Nedostaju obavezna polja" },
                { status: 400 }
            );
        }

        // Proveri da li korisnik ima pristup detetu
        const [accessRows] = await pool.query<RowDataPacket[]>(
            "SELECT id FROM user_children WHERE user_id = ? AND child_id = ?",
            [user.id, childId]
        );

        if (accessRows.length === 0) {
            return NextResponse.json(
                { error: "Nemate pristup ovom detetu" },
                { status: 403 }
            );
        }

        // Proveri da li aktivnost postoji
        const [activityRows] = await pool.query<RowDataPacket[]>(
            "SELECT id, title FROM activities WHERE id = ?",
            [activityId]
        );

        if (activityRows.length === 0) {
            return NextResponse.json(
                { error: "Aktivnost ne postoji" },
                { status: 404 }
            );
        }

        // Unesi progress log
        const [result] = await pool.query<ResultSetHeader>(
            `INSERT INTO progress_logs 
       (child_id, activity_id, success_level, duration_minutes, notes, recorded_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
            [childId, activityId, successLevel, durationMinutes, notes, user.id]
        );

        return NextResponse.json({
            success: true,
            logId: result.insertId,
            message: "Rezultat uspešno sačuvan!",
            activityTitle: activityRows[0].title
        });

    } catch (error) {
        console.error("Error completing activity:", error);
        return NextResponse.json(
            { error: "Greška pri čuvanju rezultata" },
            { status: 500 }
        );
    }
}