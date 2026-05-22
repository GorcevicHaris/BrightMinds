// app/api/children/[id]/progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const ACTIVITY_IDS = [1, 3, 4, 5, 6, 7, 8];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyToken();
    const { id: childId } = await params;

    // Access check
    const { data: accessRows, error: accessError } = await supabaseAdmin
        .from('user_children')
        .select('id')
        .eq('user_id', user.id)
        .eq('child_id', childId);

    if (!accessRows || accessRows.length === 0) {
      return NextResponse.json({ error: "Nemate pristup ovom detetu" }, { status: 403 });
    }

    // Fetch all logs and activities to do aggregations in memory
    // Since this is per-child, the number of logs shouldn't exceed a few thousand
    const { data: logsData, error: logsError } = await supabaseAdmin
      .from('progress_logs')
      .select('*, activity:activities(title)')
      .eq('child_id', childId)
      .in('activity_id', ACTIVITY_IDS)
      .order('completed_at', { ascending: false });

    if (logsError) throw logsError;

    const logs = logsData || [];

    // Helper: Parse score from notes like "Nivo 1, Zvezdice: 3, Rezultat: 150" ili "Nivo 1, Skup 1: 5 / 5"
    const getScore = (notes: string | null) => {
      if (!notes) return 0;
      
      const rezultatMatch = notes.match(/Rezultat:\s*(\d+)/i);
      if (rezultatMatch) return parseInt(rezultatMatch[1], 10);

      const match = notes.match(/(\d+)\s*\/\s*\d+$/);
      return match ? parseInt(match[1], 10) : 0;
    };

    // Helper: Parse level from notes
    const getLevel = (notes: string | null) => {
      if (!notes) return null;
      const match = notes.match(/Nivo\s+(\d+)/);
      return match ? match[1] : null;
    };

    // Prepare aggregations
    const allStats: Record<number, any> = {};
    const recentRaw: any[] = [];
    const progressRaw: any[] = [];
    const levelsRaw: any[] = [];
    
    ACTIVITY_IDS.forEach(id => {
      allStats[id] = {
        total_games: 0,
        total_score: 0,
        best_score: 0,
        total_minutes: 0,
        excellent_count: 0,
        successful_count: 0,
        partial_count: 0,
        struggled_count: 0
      };
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString().substring(0, 10);

    const activityCounts: Record<number, number> = {};
    const progressMap: Record<string, any> = {};
    const levelMap: Record<string, any> = {};

    logs.forEach(log => {
      const actId = log.activity_id;
      const score = getScore(log.notes);
      
      // Update allStats
      if (allStats[actId]) {
        allStats[actId].total_games++;
        allStats[actId].total_score += score;
        if (score > allStats[actId].best_score) allStats[actId].best_score = score;
        allStats[actId].total_minutes += (log.duration_minutes || 0);
        
        if (log.success_level === 'excellent') allStats[actId].excellent_count++;
        if (log.success_level === 'successful') allStats[actId].successful_count++;
        if (log.success_level === 'partial') allStats[actId].partial_count++;
        if (log.success_level === 'struggled') allStats[actId].struggled_count++;
      }

      // Recent games (last 10)
      if (!activityCounts[actId]) activityCounts[actId] = 0;
      if (activityCounts[actId] < 10) {
        recentRaw.push({
          id: log.id,
          activity_id: actId,
          completed_at: log.completed_at,
          success_level: log.success_level,
          mood_before: log.mood_before,
          mood_after: log.mood_after,
          duration_minutes: log.duration_minutes,
          notes: log.notes,
          score
        });
        activityCounts[actId]++;
      }

      // Daily progress (last 30 days)
      const dateStr = log.completed_at ? log.completed_at.substring(0, 10) : null;
      if (dateStr && dateStr >= thirtyDaysAgoIso) {
        const key = `${actId}_${dateStr}`;
        if (!progressMap[key]) {
          progressMap[key] = { activity_id: actId, date: dateStr, games_count: 0, total_score: 0, max_score: 0 };
        }
        progressMap[key].games_count++;
        progressMap[key].total_score += score;
        if (score > progressMap[key].max_score) progressMap[key].max_score = score;
      }

      // Level stats
      const level = getLevel(log.notes);
      if (level) {
        const key = `${actId}_${level}`;
        if (!levelMap[key]) {
          levelMap[key] = { activity_id: actId, level, games_count: 0, total_score: 0, best_score: 0 };
        }
        levelMap[key].games_count++;
        levelMap[key].total_score += score;
        if (score > levelMap[key].best_score) levelMap[key].best_score = score;
      }
    });

    // Finalize aggregations
    Object.values(progressMap).forEach((p: any) => {
      p.avg_score = p.games_count > 0 ? p.total_score / p.games_count : 0;
      progressRaw.push(p);
    });

    Object.values(levelMap).forEach((l: any) => {
      l.avg_score = l.games_count > 0 ? l.total_score / l.games_count : 0;
      levelsRaw.push(l);
    });

    // ── 5. Total stats + all recent games (for timeline) ─────────────────────
    const allGames = logs.slice(0, 30).map(log => ({
      id: log.id,
      completed_at: log.completed_at,
      success_level: log.success_level,
      mood_before: log.mood_before,
      mood_after: log.mood_after,
      duration_minutes: log.duration_minutes,
      notes: log.notes,
      activity_title: log.activity && typeof log.activity === 'object' && !Array.isArray(log.activity) 
        ? log.activity.title 
        : null,
      score: getScore(log.notes)
    }));

    // ── Group results by activity_id ──────────────────────────────────────────
    function statsFor(actId: number) {
      const s = allStats[actId];
      return {
        total_games:     s.total_games || 0,
        avg_score:       s.total_games > 0 ? s.total_score / s.total_games : 0,
        best_score:      s.best_score || 0,
        total_minutes:   s.total_minutes || 0,
        excellent_count: s.excellent_count || 0,
        successful_count:s.successful_count || 0,
        partial_count:   s.partial_count || 0,
        struggled_count: s.struggled_count || 0,
      };
    }
    const recentFor  = (actId: number) => recentRaw.filter((r) => r.activity_id === actId);
    const progressFor= (actId: number) => progressRaw.filter((r) => r.activity_id === actId).sort((a, b) => b.date.localeCompare(a.date));
    const levelsFor  = (actId: number) => levelsRaw.filter((r) => r.activity_id === actId).sort((a, b) => a.level.localeCompare(b.level));

    // Total across all activities
    const safeTotal = {
      total_games:     Object.values(allStats).reduce((a, r: any) => a + (r.total_games || 0), 0),
      total_minutes:   Object.values(allStats).reduce((a, r: any) => a + (r.total_minutes || 0), 0),
      excellent_count: Object.values(allStats).reduce((a, r: any) => a + (r.excellent_count || 0), 0),
      successful_count:Object.values(allStats).reduce((a, r: any) => a + (r.successful_count || 0), 0),
      partial_count:   Object.values(allStats).reduce((a, r: any) => a + (r.partial_count || 0), 0),
      struggled_count: Object.values(allStats).reduce((a, r: any) => a + (r.struggled_count || 0), 0),
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
    console.error(error);
    return NextResponse.json(
      { error: "Greška pri dobavljanju statistike" },
      { status: 500 }
    );
  }
}