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

        // ============================================
        // SLOŽI OBLIK (activity_id = 1)
        // ============================================
        const [shapesStats] = await pool.query<RowDataPacket[]>(
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

        const [shapesRecent] = await pool.query<RowDataPacket[]>(
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

        const [shapesProgress] = await pool.query<RowDataPacket[]>(
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

        const [shapesLevels] = await pool.query<RowDataPacket[]>(
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

        // ============================================
        // SPOJI PAROVE (activity_id = 3)
        // ============================================
        const [memoryStats] = await pool.query<RowDataPacket[]>(
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
            WHERE child_id = ? AND activity_id = 3`,
            [childId]
        );

        const [memoryRecent] = await pool.query<RowDataPacket[]>(
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
            WHERE child_id = ? AND activity_id = 3
            ORDER BY completed_at DESC 
            LIMIT 10`,
            [childId]
        );

        const [memoryProgress] = await pool.query<RowDataPacket[]>(
            `SELECT 
                DATE(completed_at) as date,
                COUNT(*) as games_count,
                AVG(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as avg_score,
                MAX(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as max_score
            FROM progress_logs 
            WHERE child_id = ? AND activity_id = 3
            GROUP BY DATE(completed_at)
            ORDER BY date DESC
            LIMIT 30`,
            [childId]
        );

        const [memoryLevels] = await pool.query<RowDataPacket[]>(
            `SELECT 
                SUBSTRING_INDEX(SUBSTRING_INDEX(notes, 'Nivo ', -1), ',', 1) as level,
                COUNT(*) as games_count,
                AVG(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as avg_score,
                MAX(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) as best_score
            FROM progress_logs 
            WHERE child_id = ? AND activity_id = 3 AND notes LIKE '%Nivo%'
            GROUP BY level
            ORDER BY level`,
            [childId]
        );

        // ============================================
        // UKUPNE STATISTIKE (obe igrice zajedno)
        // ============================================
        const [totalStats] = await pool.query<RowDataPacket[]>(
            `SELECT 
                COUNT(*) as total_games,
                SUM(duration_minutes) as total_minutes,
                SUM(CASE WHEN success_level = 'excellent' THEN 1 ELSE 0 END) as excellent_count,
                SUM(CASE WHEN success_level = 'successful' THEN 1 ELSE 0 END) as successful_count,
                SUM(CASE WHEN success_level = 'partial' THEN 1 ELSE 0 END) as partial_count,
                SUM(CASE WHEN success_level = 'struggled' THEN 1 ELSE 0 END) as struggled_count
            FROM progress_logs 
            WHERE child_id = ? AND activity_id IN (1, 3)`,
            [childId]
        );

        // Sve igre (obe aktivnosti) za hronološki prikaz
        const [allGames] = await pool.query<RowDataPacket[]>(
            `SELECT 
                pl.id,
                pl.completed_at,
                pl.success_level,
                pl.mood_before,
                pl.mood_after,
                pl.duration_minutes,
                pl.notes,
                a.title as activity_title,
                CAST(SUBSTRING_INDEX(pl.notes, ' ', -2) AS UNSIGNED) as score
            FROM progress_logs pl
            JOIN activities a ON a.id = pl.activity_id
            WHERE pl.child_id = ? AND pl.activity_id IN (1, 3)
            ORDER BY pl.completed_at DESC 
            LIMIT 20`,
            [childId]
        );

        // Osiguraj da svi podaci imaju default vrednosti
        const safeTotal = totalStats[0] || {
            total_games: 0,
            total_minutes: 0,
            excellent_count: 0,
            successful_count: 0,
            partial_count: 0,
            struggled_count: 0,
        };

        const safeShapesStats = shapesStats[0] || {
            total_games: 0,
            avg_score: 0,
            best_score: 0,
            total_minutes: 0,
            excellent_count: 0,
            successful_count: 0,
            partial_count: 0,
            struggled_count: 0,
        };

        const safeMemoryStats = memoryStats[0] || {
            total_games: 0,
            avg_score: 0,
            best_score: 0,
            total_minutes: 0,
            excellent_count: 0,
            successful_count: 0,
            partial_count: 0,
            struggled_count: 0,
        };

        return NextResponse.json({
            // Ukupno
            total: safeTotal,
            allGames: allGames || [],
            
            // Složi oblik
            shapes: {
                stats: safeShapesStats,
                recentGames: shapesRecent || [],
                progress: shapesProgress || [],
                levelStats: shapesLevels || [],
            },
            
            // Spoji parove
            memory: {
                stats: safeMemoryStats,
                recentGames: memoryRecent || [],
                progress: memoryProgress || [],
                levelStats: memoryLevels || [],
            }
        });

    } catch (error) {
        console.error("Error fetching progress:", error);
        return NextResponse.json(
            { error: "Greška pri dobavljanju statistike" },
            { status: 500 }
        );
    }
}