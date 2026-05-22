// app/api/children/[id]/unlocked-levels/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

    const { data: accessRows, error: accessError } = await supabaseAdmin
      .from('user_children')
      .select('id')
      .eq('user_id', user.id)
      .eq('child_id', childId);

    if (!accessRows || accessRows.length === 0) {
      return NextResponse.json({ error: "Nemate pristup ovom detetu" }, { status: 403 });
    }

    const { data: logsData, error: logsError } = await supabaseAdmin
      .from('progress_logs')
      .select('activity_id, notes')
      .eq('child_id', childId)
      .in('activity_id', ACTIVITY_IDS)
      .like('notes', '%Nivo%');

    if (logsError) throw logsError;

    const maxCompletedPerActivity: Record<number, number> = {};

    (logsData || []).forEach(log => {
      const match = log.notes?.match(/Nivo\s+(\d+)/);
      if (match) {
        const level = parseInt(match[1], 10);
        if (!maxCompletedPerActivity[log.activity_id] || level > maxCompletedPerActivity[log.activity_id]) {
          maxCompletedPerActivity[log.activity_id] = level;
        }
      }
    });

    // Build result — default to 1 for games not yet played
    const unlockedLevels: Record<string, number> = {};
    for (const gameId of Object.keys(GAME_ACTIVITY_MAP)) {
      unlockedLevels[gameId] = 1;
    }
    
    for (const [actIdStr, maxLevel] of Object.entries(maxCompletedPerActivity)) {
      const actId = parseInt(actIdStr, 10);
      const gameId = ACTIVITY_GAME_MAP[actId];
      if (gameId) {
        unlockedLevels[gameId] = Math.min(Math.max(maxLevel + 1, 1), 15);
      }
    }

    return NextResponse.json({ unlockedLevels });
  } catch (error) {
    console.error('Error fetching unlocked levels:', error);
    return NextResponse.json(
      { error: "Greška pri dobavljanju otključanih nivoa" },
      { status: 500 }
    );
  }
}
