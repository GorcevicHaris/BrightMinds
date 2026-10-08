// lib/games.ts
// Jedini izvor istine za spisak igara: ID-jevi, nazivi, boje i ID aktivnosti u bazi.
// Koriste ga dečji ekran, live monitor, statistika i API rute.

export type GameId =
    | "shapes"
    | "memory"
    | "coloring"
    | "sound-to-image"
    | "social"
    | "social-story"
    | "emotions";

/** Naziv kanala/događaja koji igra šalje monitoru (istorijski se razlikuje od GameId). */
export type GameType =
    | "shape_matching"
    | "memory"
    | "coloring"
    | "sound-to-image"
    | "social"
    | "social-story"
    | "emotions";

export interface GameAccent {
    /** Puna boja (dugmad, bedževi) */
    solid: string;
    /** Tamnija ivica za "3D" dugme */
    edge: string;
    /** Svetla podloga */
    soft: string;
    /** Tekst u boji igre */
    text: string;
    /** Ivica u boji igre */
    border: string;
    /** Prsten/fokus */
    ring: string;
    /** Gradijent za ikonice i trake */
    gradient: string;
}

export interface GameDefinition {
    id: GameId;
    gameType: GameType;
    /** ID u tabeli `activities` */
    activityId: number;
    title: string;
    description: string;
    /** Veština koju igra razvija — prikazuje se roditeljima */
    skill: string;
    icon: string;
    image: string;
    accent: GameAccent;
}

export const GAMES: GameDefinition[] = [
    {
        id: "shapes",
        gameType: "shape_matching",
        activityId: 1,
        title: "Pogodi oblik",
        description: "Pronađi isti oblik",
        skill: "Vizuelna percepcija",
        icon: "🔷",
        image: "/images/pogodioblik.webp",
        accent: {
            solid: "bg-emerald-500",
            edge: "border-emerald-700",
            soft: "bg-emerald-50",
            text: "text-emerald-700",
            border: "border-emerald-200",
            ring: "ring-emerald-200",
            gradient: "from-emerald-400 to-teal-500",
        },
    },
    {
        id: "memory",
        gameType: "memory",
        activityId: 3,
        title: "Spoji parove",
        description: "Pronađi dve iste slike",
        skill: "Pamćenje i pažnja",
        icon: "🧠",
        image: "/images/spojiparove.webp",
        accent: {
            solid: "bg-violet-500",
            edge: "border-violet-700",
            soft: "bg-violet-50",
            text: "text-violet-700",
            border: "border-violet-200",
            ring: "ring-violet-200",
            gradient: "from-violet-400 to-indigo-500",
        },
    },
    {
        id: "coloring",
        gameType: "coloring",
        activityId: 4,
        title: "Bojanka",
        description: "Oboji sliku kako želiš",
        skill: "Fina motorika i boje",
        icon: "🎨",
        image: "/images/oboji.webp",
        accent: {
            solid: "bg-orange-500",
            edge: "border-orange-700",
            soft: "bg-orange-50",
            text: "text-orange-700",
            border: "border-orange-200",
            ring: "ring-orange-200",
            gradient: "from-orange-400 to-pink-500",
        },
    },
    {
        id: "sound-to-image",
        gameType: "sound-to-image",
        activityId: 5,
        title: "Slušaj i spoji",
        description: "Čuj zvuk i pronađi sliku",
        skill: "Slušna pažnja",
        icon: "🔊",
        image: "/images/slusajispoji.webp",
        accent: {
            solid: "bg-sky-500",
            edge: "border-sky-700",
            soft: "bg-sky-50",
            text: "text-sky-700",
            border: "border-sky-200",
            ring: "ring-sky-200",
            gradient: "from-cyan-400 to-blue-500",
        },
    },
    {
        id: "social",
        gameType: "social",
        activityId: 6,
        title: "Šta da kažeš?",
        description: "Izaberi lepe reči",
        skill: "Socijalna komunikacija",
        icon: "💬",
        image: "/images/stareci.webp",
        accent: {
            solid: "bg-indigo-500",
            edge: "border-indigo-700",
            soft: "bg-indigo-50",
            text: "text-indigo-700",
            border: "border-indigo-200",
            ring: "ring-indigo-200",
            gradient: "from-indigo-400 to-purple-600",
        },
    },
    {
        id: "social-story",
        gameType: "social-story",
        activityId: 7,
        title: "Socijalne priče",
        description: "Škola, doktor, park i još mnogo",
        skill: "Svakodnevne situacije",
        icon: "📖",
        image: "/images/socijalneprice.webp",
        accent: {
            solid: "bg-teal-500",
            edge: "border-teal-700",
            soft: "bg-teal-50",
            text: "text-teal-700",
            border: "border-teal-200",
            ring: "ring-teal-200",
            gradient: "from-teal-400 to-emerald-600",
        },
    },
    {
        id: "emotions",
        gameType: "emotions",
        activityId: 8,
        title: "Emocije",
        description: "Kako se ko oseća?",
        skill: "Prepoznavanje emocija",
        icon: "😊",
        image: "/images/emocije.webp",
        accent: {
            solid: "bg-pink-500",
            edge: "border-pink-700",
            soft: "bg-pink-50",
            text: "text-pink-700",
            border: "border-pink-200",
            ring: "ring-pink-200",
            gradient: "from-pink-400 to-rose-500",
        },
    },
];

export const ACTIVITY_IDS: number[] = GAMES.map((g) => g.activityId);

export const LEVELS_PER_TIER = 5;
export const MAX_LEVEL = 15;

export function getGame(id: GameId): GameDefinition {
    return GAMES.find((g) => g.id === id) ?? GAMES[0];
}

export function getGameByType(gameType: string): GameDefinition | undefined {
    return GAMES.find((g) => g.gameType === gameType);
}

export function getGameByActivityId(activityId: number): GameDefinition | undefined {
    return GAMES.find((g) => g.activityId === activityId);
}

// ── Raspoloženje ───────────────────────────────────────────────────────────────

export type Mood = "very_upset" | "upset" | "neutral" | "happy" | "very_happy";

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
    { value: "very_upset", emoji: "😢", label: "Tužno" },
    { value: "upset", emoji: "😕", label: "Umorno" },
    { value: "neutral", emoji: "😐", label: "Okej" },
    { value: "happy", emoji: "😊", label: "Dobro" },
    { value: "very_happy", emoji: "😄", label: "Super" },
];

export function getMood(value: string | null | undefined) {
    return MOODS.find((m) => m.value === value);
}

// ── Zvezdice ──────────────────────────────────────────────────────────────────

export type SuccessLevel = "struggled" | "partial" | "successful" | "excellent";

/** 0–3 zvezdice na osnovu udela tačnih odgovora. */
export function starsFor(correct: number, total: number): 0 | 1 | 2 | 3 {
    if (total <= 0) return 0;
    const ratio = correct / total;
    if (ratio >= 0.8) return 3;
    if (ratio >= 0.5) return 2;
    if (ratio >= 0.2) return 1;
    return 0;
}

export function successLevelFor(stars: number): SuccessLevel {
    if (stars >= 3) return "excellent";
    if (stars === 2) return "successful";
    if (stars === 1) return "partial";
    return "struggled";
}
