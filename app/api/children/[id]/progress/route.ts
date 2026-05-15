// app/api/children/[id]/progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

const ACTIVITY_IDS = [1, 3, 4, 5, 6, 7, 8];

interface StatsRow extends RowDataPacket {
  activity_id: number;
  total_games: number;
  avg_score: number;
  best_score: number;
  total_minutes: number;
  excellent_count: number;
  successful_count: number;
  partial_count: number;
  struggled_count: number;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyToken();
    const { id: childId } = await params;

    // Access check
    const [accessRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM user_children WHERE user_id = ? AND child_id = ?",
      [user.id, childId]
    );
    if (accessRows.length === 0) {
      return NextResponse.json({ error: "Nemate pristup ovom detetu" }, { status: 403 });
    }

    // ── 1. Aggregate stats for ALL games in one query ─────────────────────────
    const [allStats] = await pool.query<StatsRow[]>(
      `SELECT
         activity_id,
         COUNT(*) AS total_games,
         AVG(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) AS avg_score,
         MAX(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) AS best_score,
         SUM(duration_minutes) AS total_minutes,
         SUM(CASE WHEN success_level = 'excellent'   THEN 1 ELSE 0 END) AS excellent_count,
         SUM(CASE WHEN success_level = 'successful'  THEN 1 ELSE 0 END) AS successful_count,
         SUM(CASE WHEN success_level = 'partial'     THEN 1 ELSE 0 END) AS partial_count,
         SUM(CASE WHEN success_level = 'struggled'   THEN 1 ELSE 0 END) AS struggled_count
       FROM progress_logs
       WHERE child_id = ? AND activity_id IN (${ACTIVITY_IDS.join(",")})
       GROUP BY activity_id`,
      [childId]
    );

    // ── 2. Recent games per activity (last 10 each) ───────────────────────────
    const [recentRaw] = await pool.query<RowDataPacket[]>(
      `SELECT id, activity_id, completed_at, success_level, mood_before, mood_after,
              duration_minutes, notes,
              CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED) AS score,
              ROW_NUMBER() OVER (PARTITION BY activity_id ORDER BY completed_at DESC) AS rn
       FROM progress_logs
       WHERE child_id = ? AND activity_id IN (${ACTIVITY_IDS.join(",")})
       HAVING rn <= 10`,
      [childId]
    );

    // ── 3. Daily progress per activity (last 30 days each) ────────────────────
    const [progressRaw] = await pool.query<RowDataPacket[]>(
      `SELECT
         activity_id,
         DATE(completed_at) AS date,
         COUNT(*) AS games_count,
         AVG(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) AS avg_score,
         MAX(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) AS max_score
       FROM progress_logs
       WHERE child_id = ? AND activity_id IN (${ACTIVITY_IDS.join(",")})
         AND completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY activity_id, DATE(completed_at)
       ORDER BY date DESC`,
      [childId]
    );

    // ── 4. Level stats per activity ───────────────────────────────────────────
    const [levelsRaw] = await pool.query<RowDataPacket[]>(
      `SELECT
         activity_id,
         SUBSTRING_INDEX(SUBSTRING_INDEX(notes, 'Nivo ', -1), ',', 1) AS level,
         COUNT(*) AS games_count,
         AVG(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) AS avg_score,
         MAX(CAST(SUBSTRING_INDEX(notes, ' ', -2) AS UNSIGNED)) AS best_score
       FROM progress_logs
       WHERE child_id = ? AND activity_id IN (${ACTIVITY_IDS.join(",")}) AND notes LIKE '%Nivo%'
       GROUP BY activity_id, level
       ORDER BY activity_id, level`,
      [childId]
    );

    // ── 5. Total stats + all recent games (for timeline) ─────────────────────
    const [allGames] = await pool.query<RowDataPacket[]>(
      `SELECT pl.id, pl.completed_at, pl.success_level, pl.mood_before, pl.mood_after,
              pl.duration_minutes, pl.notes, a.title AS activity_title,
              CAST(SUBSTRING_INDEX(pl.notes, ' ', -2) AS UNSIGNED) AS score
       FROM progress_logs pl
       JOIN activities a ON a.id = pl.activity_id
       WHERE pl.child_id = ? AND pl.activity_id IN (${ACTIVITY_IDS.join(",")})
       ORDER BY pl.completed_at DESC
       LIMIT 30`,
      [childId]
    );

    // ── Group results by activity_id ──────────────────────────────────────────
    function statsFor(actId: number) {
      const s = allStats.find((r) => r.activity_id === actId);
      return {
        total_games:     Number(s?.total_games)     || 0,
        avg_score:       Number(s?.avg_score)       || 0,
        best_score:      Number(s?.best_score)      || 0,
        total_minutes:   Number(s?.total_minutes)   || 0,
        excellent_count: Number(s?.excellent_count) || 0,
        successful_count:Number(s?.successful_count)|| 0,
        partial_count:   Number(s?.partial_count)   || 0,
        struggled_count: Number(s?.struggled_count) || 0,
      };
    }
    const recentFor  = (actId: number) => recentRaw.filter((r) => r.activity_id === actId);
    const progressFor= (actId: number) => progressRaw.filter((r) => r.activity_id === actId);
    const levelsFor  = (actId: number) => levelsRaw.filter((r) => r.activity_id === actId);

    // Total across all activities
    const safeTotal = {
      total_games:     allStats.reduce((a, r) => a + (Number(r.total_games) || 0), 0),
      total_minutes:   allStats.reduce((a, r) => a + (Number(r.total_minutes) || 0), 0),
      excellent_count: allStats.reduce((a, r) => a + (Number(r.excellent_count) || 0), 0),
      successful_count:allStats.reduce((a, r) => a + (Number(r.successful_count) || 0), 0),
      partial_count:   allStats.reduce((a, r) => a + (Number(r.partial_count) || 0), 0),
      struggled_count: allStats.reduce((a, r) => a + (Number(r.struggled_count) || 0), 0),
    };

    return NextResponse.json({
      total:    safeTotal,
      allGames: allGames || [],
      shapes:      { stats: statsFor(1), recentGames: recentFor(1),  progress: progressFor(1),  levelStats: levelsFor(1)  },
      memory:      { stats: statsFor(3), recentGames: recentFor(3),  progress: progressFor(3),  levelStats: levelsFor(3)  },
      coloring:    { stats: statsFor(4), recentGames: recentFor(4),  progress: progressFor(4),  levelStats: levelsFor(4)  },
      soundToImage:{ stats: statsFor(5), recentGames: recentFor(5),  progress: progressFor(5),  levelStats: levelsFor(5)  },
      social:      { stats: statsFor(6), recentGames: recentFor(6),  progress: progressFor(6),  levelStats: levelsFor(6)  },
      socialStory: { stats: statsFor(7), recentGames: recentFor(7),  progress: progressFor(7),  levelStats: levelsFor(7)  },
      emotions:    { stats: statsFor(8), recentGames: recentFor(8),  progress: progressFor(8),  levelStats: levelsFor(8)  },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Greška pri dobavljanju statistike" },
      { status: 500 }
    );
  }
}