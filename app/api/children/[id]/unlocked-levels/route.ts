// app/api/children/[id]/unlocked-levels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

/**
 * Maps game IDs used in the frontend to activity IDs in the database.
 * shapes=1, memory=3, coloring=4, sound-to-image=5, social=6, social-story=7, emotions=8
 */
const GAME_ACTIVITY_MAP: Record<string, number> = {
  shapes: 1,
  memory: 3,
  coloring: 4,
  "sound-to-image": 5,
  social: 6,
  "social-story": 7,
  emotions: 8,
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyToken();
    const { id: childId } = await params;

    // Verify access to this child
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

    // For each game (activity), get the highest level that has been completed at least once.
    // The level number is extracted from the `notes` field which is formatted as:
    // "Automatski prelaz - Nivo X, Rezultat: Y poena"
    const unlockedLevels: Record<string, number> = {};

    for (const [gameId, activityId] of Object.entries(GAME_ACTIVITY_MAP)) {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT MAX(CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(notes, 'Nivo ', -1), ',', 1) AS UNSIGNED)) as max_completed_level
         FROM progress_logs
         WHERE child_id = ? AND activity_id = ? AND notes LIKE '%Nivo%'`,
        [childId, activityId]
      );

      const maxCompleted = Number(rows[0]?.max_completed_level) || 0;
      const maxCap = 15;
      const unlockedUpTo = Math.min(Math.max(maxCompleted + 1, 1), maxCap);
      unlockedLevels[gameId] = unlockedUpTo;
    }

    return NextResponse.json({ unlockedLevels });
  } catch (error) {
    console.error("Error fetching unlocked levels:", error);
    return NextResponse.json(
      { error: "Greška pri dobavljanju otključanih nivoa" },
      { status: 500 }
    );
  }
}
