// Izmišljeni podaci o napretku za probne stranice — samo u razvoju.
// Prolaze kroz isti `buildProgress` kao pravi zapisi, pa /dev/progress prikazuje sva stanja:
// savladanu igru, igru kojoj treba podrška, igru koja nije igrana, zapise bez `prompted_count`
// i raspoloženje sa obe skale (pet i tri lica).
import { NextResponse } from "next/server";
import { getGame, starsFor, successLevelFor, type GameId, type Mood } from "@/lib/games";
import { buildProgress } from "@/lib/progress";

const MOODS_FIVE: Mood[] = ["very_upset", "upset", "neutral", "happy", "very_happy"];
const MOODS_THREE: Mood[] = ["upset", "neutral", "happy"];
const DAY_MS = 24 * 3600 * 1000;

/** Igre sa nasumičnim partijama; "coloring" namerno ostaje neigrana. */
const RANDOM_GAMES: GameId[] = ["memory", "sound-to-image", "social", "social-story"];
const RANDOM_ROWS = 56;

interface Play {
    gameId: GameId;
    level: number;
    correct: number;
    total: number;
    /** `null`: zapis nastao pre nego što je pomoć počela da se beleži */
    prompted: number | null;
    seconds: number;
    daysAgo: number;
    moodBefore: Mood | null;
    moodAfter: Mood | null;
}

/** Deterministički "nasumičan" broj 0–1, da prikaz bude isti pri svakom učitavanju. */
function pseudoRandom(index: number, salt: number): number {
    return Math.abs((Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453) % 1);
}

function randomPlay(index: number): Play {
    const rand = (salt: number) => pseudoRandom(index, salt);
    const total = 5 + Math.floor(rand(1) * 4);
    const correct = Math.max(0, total - Math.floor(rand(2) * 5));
    // Oko 80% zapisa ima zabeleženu pomoć, uvek najviše (ukupno − samostalno)
    const prompted = rand(9) < 0.8 ? Math.floor(rand(10) * (total - correct + 1)) : null;
    // Mešavina skala: deo zapisa koristi tri lica, deo pet
    const scale = rand(11) < 0.5 ? MOODS_THREE : MOODS_FIVE;
    return {
        gameId: RANDOM_GAMES[Math.floor(rand(6) * RANDOM_GAMES.length)],
        level: 1 + Math.floor(rand(3) * (index % 3 === 0 ? 11 : 6)),
        correct,
        total,
        prompted,
        seconds: 60 + Math.floor(rand(4) * 240),
        daysAgo: rand(8) * 28,
        moodBefore: scale[Math.floor(rand(5) * scale.length)],
        moodAfter: index % 4 === 0 ? null : scale[Math.floor(rand(7) * scale.length)],
    };
}

/** [nivo, samostalno, uz pomoć, ukupno, pre koliko dana] */
type ScriptedPlay = [level: number, correct: number, prompted: number, total: number, daysAgo: number];

function scriptedPlays(gameId: GameId, plays: ScriptedPlay[]): Play[] {
    return plays.map(([level, correct, prompted, total, daysAgo]) => ({
        gameId,
        level,
        correct,
        total,
        prompted,
        seconds: 150,
        daysAgo,
        moodBefore: "neutral",
        moodAfter: "happy",
    }));
}

const SCRIPTED: Play[] = [
    // Savladano: poslednje tri partije na lakoj težini, u tri različita dana, sve ≥ 80% samostalno
    ...scriptedPlays("shapes", [
        [1, 3, 2, 5, 9.2],
        [2, 4, 1, 5, 7.2],
        [3, 5, 0, 5, 4.2],
        [3, 4, 1, 5, 2.2],
        [4, 5, 0, 5, 0.2],
    ]),
    // Treba podrška: poslednje tri partije ispod 50% samostalno
    ...scriptedPlays("emotions", [
        [1, 4, 1, 6, 8.1],
        [2, 3, 2, 6, 5.1],
        [3, 2, 3, 6, 3.1],
        [3, 1, 4, 6, 1.1],
        [3, 2, 3, 6, 0.1],
    ]),
];

export function GET() {
    if (process.env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });

    const now = Date.now();
    const plays = [...Array.from({ length: RANDOM_ROWS }, (_, index) => randomPlay(index)), ...SCRIPTED];
    const rows = plays.map((play, index) => {
        const stars = starsFor(play.correct, play.total);
        return {
            id: index + 1,
            child_id: 0,
            activity_id: getGame(play.gameId).activityId,
            success_level: successLevelFor(stars),
            duration_minutes: Math.ceil(play.seconds / 60),
            duration_seconds: play.seconds,
            notes: `Nivo ${play.level}, Zvezdice: ${stars}, Rezultat: ${play.correct * 10}`,
            level: play.level,
            stars,
            score: play.correct * 10,
            correct_count: play.correct,
            total_count: play.total,
            // Kolona ne postoji u starijim zapisima — tada je i ovde nema
            ...(play.prompted === null ? {} : { prompted_count: play.prompted }),
            mood_before: play.moodBefore,
            mood_after: play.moodAfter,
            completed_at: new Date(now - Math.floor(play.daysAgo * DAY_MS)).toISOString(),
        };
    });

    return NextResponse.json(buildProgress(rows));
}
