// app/api/children/[id]/unlocked-levels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

const GAME_ACTIVITY_MAP: Record<string, number> = {
  shapes: 1,
  memory: 3,
  coloring: 4,
  "sound-to-image": 5,
  social: 6,
  "social-story": 7,
  emotions: 8,
};

// Reverse map: activityId → gameId
const ACTIVITY_GAME_MAP: Record<number, string> = Object.fromEntries(
  Object.entries(GAME_ACTIVITY_MAP).map(([k, v]) => [v, k])
);

const ACTIVITY_IDS = Object.values(GAME_ACTIVITY_MAP);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyToken();
    const { id: childId } = await params;

    const [accessRows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM user_children WHERE user_id = ? AND child_id = ?",
      [user.id, childId]
    );
    if (accessRows.length === 0) {
      return NextResponse.json({ error: "Nemate pristup ovom detetu" }, { status: 403 });
    }

    // ── Single query instead of 7 sequential queries ─────────────────────────
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         activity_id,
         MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(notes, 'Nivo ', -1), ',', 1) AS UNSIGNED)) AS max_completed_level
       FROM progress_logs
       WHERE child_id = ?
         AND activity_id IN (${ACTIVITY_IDS.join(",")})
         AND notes LIKE '%Nivo%'
       GROUP BY activity_id`,
      [childId]
    );
    // ─────────────────────────────────────────────────────────────────────────

    // Build result — default to 1 for games not yet played
    const unlockedLevels: Record<string, number> = {};
    for (const gameId of Object.keys(GAME_ACTIVITY_MAP)) {
      unlockedLevels[gameId] = 1;
    }
    for (const row of rows) {
      const gameId = ACTIVITY_GAME_MAP[row.activity_id];
      if (gameId) {
        const maxCompleted = Number(row.max_completed_level) || 0;
        unlockedLevels[gameId] = Math.min(Math.max(maxCompleted + 1, 1), 15);
      }
    }

    return NextResponse.json({ unlockedLevels });
  } catch (error) {
    return NextResponse.json(
      { error: "Greška pri dobavljanju otključanih nivoa" },
      { status: 500 }
    );
  }
}
