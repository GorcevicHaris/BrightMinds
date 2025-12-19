// app/api/children/[id]/progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await verifyToken();
        const { id: childId } = await params;

        // Proveri pristup detetu
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

        // 1. Osnovne statistike
        const [statsRows] = await pool.query<RowDataPacket[]>(
            `SELECT 
        COUNT(*) as total_games,
        AVG(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as avg_score,
        MAX(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as best_score,
        SUM(duration_minutes) as total_minutes,
        SUM(CASE WHEN success_level = 'excellent' THEN 1 ELSE 0 END) as excellent_count,
        SUM(CASE WHEN success_level = 'successful' THEN 1 ELSE 0 END) as successful_count,
        SUM(CASE WHEN success_level = 'partial' THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN success_level = 'struggled' THEN 1 ELSE 0 END) as struggled_count
      FROM progress_logs 
      WHERE child_id = ? AND activity_id = 1`,
            [childId]
        );

        // 2. Poslednje igre (saScore izvučenim iz notes)
        const [recentRows] = await pool.query<RowDataPacket[]>(
            `SELECT 
        id,
        completed_at,
        success_level,
        mood_before,
        mood_after,
        duration_minutes,
        notes,
        CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED) as score
      FROM progress_logs 
      WHERE child_id = ? AND activity_id = 1
      ORDER BY completed_at DESC 
      LIMIT 10`,
            [childId]
        );

        // 3. Napredak kroz vreme (grupisano po danima)
        const [progressRows] = await pool.query<RowDataPacket[]>(
            `SELECT 
        DATE(completed_at) as date,
        COUNT(*) as games_count,
        AVG(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as avg_score,
        MAX(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as max_score
      FROM progress_logs 
      WHERE child_id = ? AND activity_id = 1
      GROUP BY DATE(completed_at)
      ORDER BY date DESC
      LIMIT 30`,
            [childId]
        );

        // 4. Statistike po nivou
        const [levelRows] = await pool.query<RowDataPacket[]>(
            `SELECT 
        SUBSTRING_INDEX(SUBSTRING_INDEX(notes, 'Nivo ', -1), ',', 1) as level,
        COUNT(*) as games_count,
        AVG(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as avg_score,
        MAX(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as best_score
      FROM progress_logs 
      WHERE child_id = ? AND activity_id = 1 AND notes LIKE '%Nivo%'
      GROUP BY level
      ORDER BY level`,
            [childId]
        );

        // 5. Mood tracking
        const [moodRows] = await pool.query<RowDataPacket[]>(
            `SELECT 
        mood_before,
        mood_after,
        COUNT(*) as count
      FROM progress_logs 
      WHERE child_id = ? AND activity_id = 1 AND mood_before IS NOT NULL
      GROUP BY mood_before, mood_after`,
            [childId]
        );

        return NextResponse.json({
            stats: statsRows[0],
            recentGames: recentRows,
            progress: progressRows,
            levelStats: levelRows,
            moodTracking: moodRows,
        });

    } catch (error) {
        console.error("Error fetching progress:", error);
        return NextResponse.json(
            { error: "Greška pri dobavljanju statistike" },
            { status: 500 }
        );
    }
}