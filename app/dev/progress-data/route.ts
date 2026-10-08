// Izmišljeni podaci o napretku za probne stranice — samo u razvoju.
import { NextResponse } from "next/server";
import { ACTIVITY_IDS, starsFor, successLevelFor } from "@/lib/games";
import { buildProgress } from "@/lib/progress";

const MOODS = ["very_upset", "upset", "neutral", "happy", "very_happy"];

export function GET() {
    if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });

    const now = Date.now();
    const rows = Array.from({ length: 64 }, (_, i) => {
        // Deterministički "nasumični" brojevi, da prikaz bude isti pri svakom učitavanju
        const r = (salt: number) => (Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453) % 1;
        const rand = (salt: number) => Math.abs(r(salt));
        const total = 5 + Math.floor(rand(1) * 4);
        const correct = Math.max(0, total - Math.floor(rand(2) * 5));
        const stars = starsFor(correct, total);
        const level = 1 + Math.floor(rand(3) * (i % 3 === 0 ? 11 : 6));
        const seconds = 60 + Math.floor(rand(4) * 240);
        const before = Math.floor(rand(5) * 5);
        return {
            id: i + 1,
            child_id: 0,
            activity_id: ACTIVITY_IDS[Math.floor(rand(6) * ACTIVITY_IDS.length)],
            success_level: successLevelFor(stars),
            duration_minutes: Math.ceil(seconds / 60),
            duration_seconds: seconds,
            notes: `Nivo ${level}, Zvezdice: ${stars}, Rezultat: ${correct * 10}`,
            level,
            stars,
            score: correct * 10,
            correct_count: correct,
            total_count: total,
            mood_before: MOODS[before],
            mood_after: i % 4 === 0 ? null : MOODS[Math.min(4, Math.max(0, before + Math.round(r(7) * 2)))],
            completed_at: new Date(now - Math.floor(rand(8) * 28 * 24 * 3600 * 1000)).toISOString(),
        };
    });

    return NextResponse.json(buildProgress(rows));
}
