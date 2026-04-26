// app/dashboard/child/[id]/GameContainer.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import ShapeMatchingGame from "@/app/components/games/ShapeMatchingGame";
import MemoryGame from "@/app/components/games/MemoryGame";
import ColoringGame from "@/app/components/games/ColoringGame";
import SoundToImageGame from "@/app/components/games/SoundToImageGame";
import SocialCommunicationGame from "@/app/components/games/SocialCommunicationGame";
import SocialStoryGame from "@/app/components/games/SocialStoryGame";
import EmotionsGame from "@/app/components/games/EmotionsGame";
import { useGameEmitter } from "@/lib/useSocket";

type GameId = "shapes" | "memory" | "coloring" | "sound-to-image" | "social" | "social-story" | "emotions";
type Difficulty = "easy" | "medium" | "hard";
type Screen = "picker" | "difficulty-select" | "playing" | "tier-finished" | "all-finished";

interface GameContainerProps {
  childId: number;
  childName: string;
}

// ── Igre ───────────────────────────────────────────────────────────────────────
const GAMES = [
  { id: "shapes" as GameId, title: "Pogodi oblik", description: "Prepoznavanje oblika i boja", icon: "🔷", gradient: "from-emerald-400 to-teal-500", cardBg: "bg-emerald-50", border: "border-emerald-200", bgImage: "/images/pogodioblik.png" },
  { id: "memory" as GameId, title: "Spoji parove", description: "Vežbanje memorije i pažnje", icon: "🧠", gradient: "from-purple-400 to-indigo-500", cardBg: "bg-purple-50", border: "border-purple-200", bgImage: "/images/spojiparove.png" },
  { id: "coloring" as GameId, title: "Bojanka", description: "Kreativnost i fina motorika", icon: "🎨", gradient: "from-orange-400 to-pink-500", cardBg: "bg-orange-50", border: "border-orange-200", bgImage: "/images/oboji.png" },
  { id: "sound-to-image" as GameId, title: "Zvuk → Slika", description: "Slušna pažnja i povezivanje", icon: "🔊", gradient: "from-cyan-400 to-blue-500", cardBg: "bg-cyan-50", border: "border-cyan-200", bgImage: "/images/slusajispoji.png" },
  { id: "social" as GameId, title: "Šta da kažeš?", description: "Socijalna komunikacija i govor", icon: "💬", gradient: "from-violet-400 to-purple-600", cardBg: "bg-violet-50", border: "border-violet-200", bgImage: "/images/stareci.png" },
  { id: "social-story" as GameId, title: "Socijalne Priče", description: "Uči o školi, doktoru, parku i još mnogo!", icon: "📖", gradient: "from-teal-500 to-emerald-600", cardBg: "bg-teal-50", border: "border-teal-200", bgImage: "/images/socijalneprice.png" },
  { id: "emotions" as GameId, title: "Emocije", description: "Kako se osećaš u različitim situacijama?", icon: "😊", gradient: "from-pink-400 to-rose-500", cardBg: "bg-pink-50", border: "border-pink-200", bgImage: "/images/emocije.png" },
];

// ── Konfiguracija težina ───────────────────────────────────────────────────────
const DIFF_CONFIG = {
  easy: {
    label: "Lako",
    sublabel: "Za početnike",
    emoji: "🌱",
    range: "Nivoi 1 – 5",
    min: 1, max: 5,
    gradient: "from-emerald-400 via-green-500 to-teal-500",
    gradientHover: "from-emerald-500 via-green-600 to-teal-600",
    glow: "rgba(16,185,129,0.35)",
    badge: "bg-emerald-500",
    lockMsg: null,
  },
  medium: {
    label: "Srednje",
    sublabel: "Za napredne",
    emoji: "⚡",
    range: "Nivoi 6 – 10",
    min: 6, max: 10,
    gradient: "from-amber-400 via-yellow-500 to-orange-500",
    gradientHover: "from-amber-500 via-yellow-600 to-orange-600",
    glow: "rgba(245,158,11,0.35)",
    badge: "bg-amber-500",
    lockMsg: "Završi sve LAKO nivoe da otključaš",
  },
  hard: {
    label: "Teško",
    sublabel: "Za eksperte",
    emoji: "🔥",
    range: "Nivoi 11 – 15",
    min: 11, max: 15,
    gradient: "from-rose-500 via-red-500 to-orange-600",
    gradientHover: "from-rose-600 via-red-600 to-orange-700",
    glow: "rgba(244,63,94,0.35)",
    badge: "bg-rose-500",
    lockMsg: "Završi sve SREDNJE nivoe da otključaš",
  },
} as const;

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "medium", "hard"];

// ── Helper funkcije ────────────────────────────────────────────────────────────
/** maxUnlocked = max completed + 1 (ili 1 ako ništa nije urađeno) */
function isDiffUnlocked(diff: Difficulty, maxUnlocked: number): boolean {
  if (diff === "easy") return true;
  if (diff === "medium") return maxUnlocked > 5;
  return maxUnlocked > 10;
}

/** Koliko nivoa je završeno u ovom tieru (0–5) */
function completedInTier(diff: Difficulty, maxUnlocked: number): number {
  const done = maxUnlocked - 1; // broj završenih nivoa ukupno
  const offset = DIFF_CONFIG[diff].min - 1;
  return Math.min(Math.max(done - offset, 0), 5);
}

/** Nivo od kojeg startujemo u odabranom tieru */
function getStartLevelForDiff(diff: Difficulty, maxUnlocked: number): number {
  const comp = completedInTier(diff, maxUnlocked);
  const { min } = DIFF_CONFIG[diff];
  return comp < 5 ? min + comp : min; // replay od početka ako je tier završen
}

function getActivityId(gameId: GameId | null): number {
  return gameId === "shapes" ? 1 : gameId === "memory" ? 3 : gameId === "sound-to-image" ? 5 : gameId === "social" ? 6 : gameId === "social-story" ? 7 : gameId === "emotions" ? 8 : 4;
}

// ── Komponenta ─────────────────────────────────────────────────────────────────
export default function GameContainer({ childId, childName }: GameContainerProps) {
  const [screen, setScreen] = useState<Screen>("picker");
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [autoStart, setAutoStart] = useState(false);
  const [unlockedLevels, setUnlockedLevels] = useState<Record<string, number>>({});
  const [levelsLoading, setLevelsLoading] = useState(true);

  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef(0);
  const { emitGameComplete } = useGameEmitter();

  const refreshUnlocked = () => {
    fetch(`/api/children/${childId}/unlocked-levels?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (data.unlockedLevels) setUnlockedLevels(data.unlockedLevels); })
      .catch(() => { });
  };

  useEffect(() => {
    setLevelsLoading(true);
    fetch(`/api/children/${childId}/unlocked-levels?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (data.unlockedLevels) setUnlockedLevels(data.unlockedLevels); })
      .catch(() => { })
      .finally(() => setLevelsLoading(false));
  }, [childId]);

  const getMaxUnlocked = (gameId: string) => unlockedLevels[gameId] ?? 1;
  const activeGame = GAMES.find(g => g.id === selectedGame);
  const tierMax = selectedDifficulty ? DIFF_CONFIG[selectedDifficulty].max : 15;

  // ── Game card clicked ──────────────────────────────────────────────────────
  const handleGameSelect = (gameId: GameId) => {
    setSelectedGame(gameId);
    setSelectedDifficulty(null);
    setMessage("");
    setAutoStart(false);
    setScreen("difficulty-select");
  };

  // ── Difficulty selected ────────────────────────────────────────────────────
  const handleDifficultySelect = (diff: Difficulty) => {
    const maxUnlocked = getMaxUnlocked(selectedGame!);
    if (!isDiffUnlocked(diff, maxUnlocked)) return;
    setSelectedDifficulty(diff);
    setCurrentLevel(getStartLevelForDiff(diff, maxUnlocked));
    setMessage("");
    setAutoStart(false);
    setScreen("playing");
  };

  // ── Exit ───────────────────────────────────────────────────────────────────
  const handleExit = () => {
    if (screen === "playing" && selectedGame) {
      emitGameComplete({
        childId,
        activityId: getActivityId(selectedGame),
        gameType: selectedGame,
        event: "completed",
        data: { finalScore: 0, reason: "manual_exit" },
        timestamp: new Date().toISOString(),
      } as any);
    }
    setScreen("picker");
    setSelectedGame(null);
    setSelectedDifficulty(null);
    setAutoStart(false);
    setMessage("");
  };

  // ── Game complete callback ─────────────────────────────────────────────────
  const handleGameComplete = async (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => {
    const now = Date.now();
    if (isSavingRef.current || now - lastSaveTimeRef.current < 2000) return;
    isSavingRef.current = true;
    lastSaveTimeRef.current = now;
    setIsLoading(true);

    try {
      let successLevel: "struggled" | "partial" | "successful" | "excellent";
      if (score >= 200) successLevel = "excellent";
      else if (score >= 100) successLevel = "successful";
      else if (score >= 50) successLevel = "partial";
      else successLevel = "struggled";

      const response = await fetch("/api/activities/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          activityId: getActivityId(selectedGame),
          successLevel,
          durationMinutes: Math.ceil(duration / 60) || 1,
          notes: `Automatski prelaz - Nivo ${currentLevel}, Rezultat: ${score} poena`,
          moodBefore: moodBefore || null,
          moodAfter: moodAfter || null,
        }),
      });

      if (response.ok) {
        refreshUnlocked();

        if (currentLevel < tierMax) {
          // Nastavi unutar tiera
          setMessage(`🌟 Odlično! Sledeći nivo!`);
          setTimeout(() => {
            setCurrentLevel(prev => prev + 1);
            setAutoStart(true);
            setMessage("");
            setIsLoading(false);
          }, 1200);
        } else {
          // Tier je gotov
          setIsLoading(false);
          if (selectedDifficulty === "hard") {
            setScreen("all-finished");
          } else {
            setScreen("tier-finished");
          }
        }
      } else {
        setMessage("⚠️ Problem sa čuvanjem poena");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("⚠️ Greška na mreži");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setTimeout(() => { isSavingRef.current = false; }, 2000);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN A: Game Picker — optimizovano za decu 3+
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "picker") {
    return (
      <div className="pb-6 sm:pb-10">
        <p className="text-center text-slate-400 text-xs sm:text-sm font-black uppercase tracking-widest mb-4 sm:mb-6">
          Izaberi igru koju želiš da igraš 👇
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-none mx-auto px-0">
          {GAMES.map(game => {
            return (
              <button
                key={game.id}
                id={`game-card-${game.id}`}
                onClick={() => handleGameSelect(game.id)}
                className="group relative aspect-video rounded-xl md:rounded-2xl overflow-hidden transition-all duration-700 hover:scale-[1.02] active:scale-[0.99] shadow-xl hover:shadow-2xl bg-white select-none border-[6px] border-white"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {/* Clean Original Illustration */}
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-[2s] group-hover:scale-105"
                  style={{ backgroundImage: `url(${game.bgImage})` }}
                />
                
                {/* Minimalist Hover Overlay */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Play Button - Sleek and Minimalist */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-50 group-hover:scale-100">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/30 backdrop-blur-md rounded-full border-2 border-white/80 flex items-center justify-center shadow-xl">
                    <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                  </div>
                </div>

                {/* Animated Shine Effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transform transition-transform duration-[1.5s]" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN B: Difficulty Select — fun, bright, child-friendly
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "difficulty-select" && activeGame) {
    const maxUnlocked = getMaxUnlocked(selectedGame!);

    return (
      <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-slate-50">
        {/* Dynamic Background Image with Professional Blur */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-30"
            style={{ backgroundImage: `url(${activeGame.bgImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/80 to-white/90 backdrop-blur-3xl" />
        </div>

        {/* Animated Decorative Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-300/40 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] bg-blue-300/40 rounded-full blur-[130px] animate-pulse delay-700" />
          <div className="absolute top-[20%] left-[40%] w-[30%] h-[30%] bg-pink-300/30 rounded-full blur-[100px] animate-pulse delay-1000" />
        </div>

        {/* ── Top Navigation ── */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 sm:py-6 border-b border-white/50 bg-white/20 backdrop-blur-sm shadow-sm">
          <button
            onClick={handleExit}
            className="group flex items-center gap-3 text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white active:scale-95 px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-md hover:shadow-lg border border-slate-100"
          >
            <div className="bg-slate-100 p-1.5 rounded-lg group-hover:-translate-x-1 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <span>Nazad</span>
          </button>

          <div className="flex flex-col items-center">
            <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-3xl mb-1 border-2 border-white/80`}>
              {activeGame.icon}
            </div>
            <h2 className="text-sm sm:text-lg font-black text-slate-800 tracking-tight">{activeGame.title}</h2>
          </div>

          <div className="w-24 hidden sm:block" /> {/* Spacer */}
        </div>

        {/* ── Main Layout ── */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-8 md:py-12 flex flex-col items-center">

          <div className="text-center mb-10 md:mb-16">
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-4 drop-shadow-sm">
              Spreman za igru? 🚀
            </h1>
            <p className="text-slate-500 text-lg md:text-xl font-bold max-w-2xl">
              Odaberi nivo težine i pokaži koliko si vešt!
            </p>
          </div>

          {/* Difficulty Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 w-full max-w-6xl pb-10">
            {DIFFICULTY_ORDER.map((diff, cardIdx) => {
              const cfg = DIFF_CONFIG[diff];
              const unlocked = isDiffUnlocked(diff, maxUnlocked);
              const done = completedInTier(diff, maxUnlocked);
              const allDone = done === 5;

              const themes = {
                easy: { color: "emerald", icon: "🌱", shadow: "shadow-emerald-200", border: "border-emerald-200" },
                medium: { color: "amber", icon: "⚡", shadow: "shadow-amber-200", border: "border-amber-200" },
                hard: { color: "rose", icon: "🔥", shadow: "shadow-rose-200", border: "border-rose-200" }
              };
              const theme = themes[diff as keyof typeof themes];

              return (
                <button
                  key={diff}
                  onClick={() => unlocked && handleDifficultySelect(diff)}
                  disabled={!unlocked}
                  className={`group relative flex flex-col rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 text-center transition-all duration-500 border-4
                    ${unlocked
                      ? `bg-white hover:scale-[1.05] hover:-translate-y-2 active:scale-95 shadow-2xl ${theme.shadow} ${theme.border} cursor-pointer`
                      : `bg-slate-50/50 border-slate-200 opacity-60 cursor-not-allowed`
                    }`}
                >
                  {/* Status Badge */}
                  <div className="absolute top-6 inset-x-0 flex justify-center">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 bg-white
                      ${unlocked ? `text-${theme.color}-500 border-${theme.color}-100` : "text-slate-400 border-slate-200"}`}>
                      {unlocked ? (allDone ? "Sjajno!" : "Otključano") : "Zaključano"}
                    </div>
                  </div>

                  {/* Main Visual */}
                  <div className={`w-28 h-28 md:w-36 md:h-36 mx-auto rounded-full flex items-center justify-center text-6xl md:text-8xl mb-8 transition-transform duration-500
                    ${unlocked
                      ? `bg-${theme.color}-50/50 group-hover:scale-110 group-hover:rotate-6`
                      : "bg-slate-100"}`}>
                    <span className={unlocked ? "drop-shadow-md" : "grayscale opacity-50"}>
                      {unlocked ? theme.icon : "🔒"}
                    </span>
                  </div>

                  {/* Text Content */}
                  <div className="space-y-2 mb-8">
                    <h3 className={`text-2xl md:text-3xl font-black ${unlocked ? "text-slate-800" : "text-slate-400"}`}>
                      {cfg.label}
                    </h3>
                    <p className="text-slate-500 font-bold text-sm md:text-base leading-snug">
                      {unlocked ? cfg.sublabel : cfg.lockMsg}
                    </p>
                  </div>

                  {/* Progress Indicators */}
                  <div className="mt-auto">
                    <div className="flex gap-2 justify-center mb-4">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-3 w-3 md:h-4 md:w-4 rounded-full border-2 transition-all duration-500
                          ${i <= done
                            ? `bg-${theme.color}-500 border-${theme.color}-200 scale-110`
                            : `bg-slate-100 border-slate-200`}`}
                        />
                      ))}
                    </div>
                    <div className="bg-slate-100 px-4 py-2 rounded-2xl inline-block">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{cfg.range}</span>
                    </div>
                  </div>

                  {/* Hover Interaction Overlay */}
                  {unlocked && (
                    <div className={`absolute bottom-6 inset-x-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0`}>
                      <span className={`px-8 py-3 rounded-2xl bg-gradient-to-r from-${theme.color}-500 to-${theme.color}-600 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-${theme.color}-200`}>
                        Započni! ▶
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }


  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN C: Playing
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "playing" && activeGame && selectedDifficulty) {
    const cfg = DIFF_CONFIG[selectedDifficulty];
    const levelInTier = currentLevel - cfg.min + 1; // 1-5

    return (
      <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col animate-in fade-in duration-300 overflow-hidden">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md px-3 sm:px-5 md:px-6 py-3 border-b border-slate-100 flex items-center justify-between shadow-sm flex-shrink-0 relative z-10">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
            <button
              onClick={() => setScreen("difficulty-select")}
              className="p-1.5 md:p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all border border-transparent shrink-0"
              aria-label="Nazad"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className={`hidden sm:flex w-9 h-9 md:w-11 md:h-11 rounded-xl bg-gradient-to-br ${activeGame.gradient} items-center justify-center text-xl shadow-md shrink-0`}>
              {activeGame.icon}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-900 leading-tight truncate">{activeGame.title}</h3>
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Difficulty badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black text-white uppercase tracking-wider ${cfg.badge}`}>
                  {cfg.emoji} {cfg.label}
                </span>
                {/* Level within tier dots */}
                <div className="hidden sm:flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i <= levelInTier ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  ))}
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  {levelInTier}/5
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExit}
            className="ml-2 px-2.5 py-1.5 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-all flex items-center gap-1 sm:gap-1.5 border border-rose-100 hover:border-rose-200 shadow-sm shrink-0 text-xs md:text-sm"
          >
            <span className="hidden sm:inline">Zatvori</span>
            <span className="text-sm md:text-base">✕</span>
          </button>
        </div>

        {/* Game area */}
        <div className="flex-1 relative overflow-y-auto p-2 sm:p-4 md:p-6 flex flex-col">
          {message && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-top-2 duration-300 w-auto max-w-xs sm:max-w-md pointer-events-none">
              <div className="px-5 py-3 rounded-2xl text-center text-sm sm:text-base font-black shadow-lg bg-green-50 border border-green-200 text-green-700">
                {message}
              </div>
            </div>
          )}
          {isLoading && (
            <div className="absolute top-3 right-4 z-[80]">
              <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            </div>
          )}

          <div className="relative w-full flex-1 flex flex-col" key={`${selectedGame}-${selectedDifficulty}-level-${currentLevel}`}>
            {selectedGame === "shapes" ? (
              <ShapeMatchingGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} />
            ) : selectedGame === "memory" ? (
              <MemoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} />
            ) : selectedGame === "sound-to-image" ? (
              <SoundToImageGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} />
            ) : selectedGame === "social" ? (
              <SocialCommunicationGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} />
            ) : selectedGame === "social-story" ? (
              <SocialStoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} />
            ) : selectedGame === "emotions" ? (
              <EmotionsGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} />
            ) : (
              <ColoringGame childId={childId} level={currentLevel} onComplete={handleGameComplete} onClose={handleExit} autoStart={autoStart} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN D: Tier Finished — celebration
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "tier-finished" && activeGame && selectedDifficulty) {
    const currentCfg = DIFF_CONFIG[selectedDifficulty];
    const nextDiff: Difficulty | null = selectedDifficulty === "easy" ? "medium" : selectedDifficulty === "medium" ? "hard" : null;
    const nextCfg = nextDiff ? DIFF_CONFIG[nextDiff] : null;

    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-slate-50">
        {/* Dynamic Background with Professional Blur */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-40"
            style={{ backgroundImage: `url(${activeGame.bgImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/80 to-white/90 backdrop-blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-xl flex flex-col items-center animate-in zoom-in duration-500">
          {/* Main Visual Celebration */}
          <div className="relative mb-10">
            <div className={`w-44 h-44 md:w-56 md:h-56 rounded-full bg-white shadow-2xl flex items-center justify-center text-8xl md:text-9xl border-8 border-white`}>
              {currentCfg.emoji}
            </div>
            <div className="absolute -top-4 -right-4 text-5xl animate-bounce">🎊</div>
            <div className="absolute -bottom-4 -left-4 text-5xl animate-bounce delay-300">🎉</div>
          </div>

          <div className="mb-8">
            <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full border-2 border-${currentCfg.badge.split('-')[1]}-100 bg-white mb-4 shadow-lg text-${currentCfg.badge.split('-')[1]}-600`}>
              <span className="text-sm md:text-base font-black uppercase tracking-widest">{currentCfg.label} — NIVOA ZAVRŠENO!</span>
            </div>
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 mb-4 tracking-tight leading-tight">
              Sjajno! ✨
            </h1>
            <p className="text-slate-500 text-lg md:text-xl font-bold max-w-md leading-relaxed">
              Pobedio si svih <span className="text-slate-900 font-black">5 {currentCfg.label.toLowerCase()} nivoa</span> u igri {activeGame.title}!
            </p>
          </div>

          {/* Stars display */}
          <div className="flex items-center gap-3 md:gap-4 mb-12">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="text-4xl md:text-6xl animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>⭐</div>
            ))}
          </div>

          {/* Next difficulty unlock message */}
          {nextCfg && (
            <div className={`w-full mb-10 p-6 rounded-[2.5rem] border-2 border-${nextCfg.badge.split('-')[1]}-100 bg-white shadow-xl flex items-center gap-5 text-left`}>
              <div className={`w-16 h-16 rounded-2xl bg-${nextCfg.badge.split('-')[1]}-500 flex items-center justify-center text-4xl shrink-0 shadow-lg text-white`}>
                {nextCfg.emoji}
              </div>
              <div>
                <p className={`text-${nextCfg.badge.split('-')[1]}-600 font-black text-lg`}>🔓 Otključano: {nextCfg.label}!</p>
                <p className="text-slate-400 font-bold text-sm">{nextCfg.range} je sada spremno za tebe</p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="w-full flex flex-col gap-4 max-w-md">
            {nextCfg && (
              <button
                onClick={() => {
                  setSelectedDifficulty(nextDiff!);
                  const maxUnlocked = getMaxUnlocked(selectedGame!);
                  setCurrentLevel(getStartLevelForDiff(nextDiff!, maxUnlocked));
                  setAutoStart(false);
                  setScreen("playing");
                }}
                className={`w-full group bg-${nextCfg.badge.split('-')[1]}-500 hover:bg-${nextCfg.badge.split('-')[1]}-600 text-white rounded-3xl p-1.5 transition-all duration-300 shadow-xl shadow-${nextCfg.badge.split('-')[1]}-100 hover:-translate-y-1`}
              >
                <div className="border-2 border-white/20 rounded-2xl px-8 py-5 flex items-center justify-center gap-4">
                  <span className="text-xl sm:text-2xl font-black uppercase tracking-widest leading-none">Igraj {nextCfg.label}</span>
                  <div className="w-12 h-12 bg-white text-slate-900 rounded-xl flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform">▶</div>
                </div>
              </button>
            )}
            <button
              onClick={() => setScreen("difficulty-select")}
              className="w-full px-8 py-5 rounded-3xl bg-white hover:bg-slate-50 border-2 border-slate-100 text-slate-500 font-black text-sm sm:text-base uppercase tracking-widest transition-all duration-200 shadow-md"
            >
              Nazad na težine
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN E: All Finished (Hard sve završeno = šampion!)
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === "all-finished" && activeGame) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-slate-900">
        {/* Professional Celebration Background */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 opacity-60"
            style={{ backgroundImage: `url(${activeGame.bgImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900/90 backdrop-blur-2xl" />
        </div>

        <div className="relative z-10 w-full max-w-2xl flex flex-col items-center animate-in zoom-in duration-700">
          <div className="relative mb-12 transform scale-125">
            <div className="text-8xl sm:text-[140px] md:text-[180px] drop-shadow-2xl animate-bounce">🏆</div>
            <div className="absolute -top-8 -right-8 text-6xl animate-pulse">✨</div>
            <div className="absolute top-1/2 -left-12 text-5xl animate-ping" style={{ animationDuration: "2s" }}>🎉</div>
          </div>

          <div className="mb-12">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-amber-600 px-8 py-2 rounded-full shadow-2xl mb-6 border-2 border-white/20">
              <span className="text-white font-black text-xl uppercase tracking-widest px-2">NAJBOLJI SI! 👑</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-white mb-6 tracking-tight drop-shadow-lg leading-tight">
              ŠAMPION!
            </h1>
            <p className="text-white/80 text-xl md:text-3xl font-bold max-w-xl leading-relaxed">
              Završio/la si <span className="text-white font-black underline underline-offset-8 decoration-yellow-400">SVE 15 NIVOA</span> u igri
            </p>
            <p className={`mt-6 text-2xl md:text-4xl font-black transition-all duration-300 text-transparent bg-clip-text bg-gradient-to-r ${activeGame.gradient} drop-shadow-sm`}>
              {activeGame.icon} {activeGame.title}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-16 max-w-md">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="text-3xl sm:text-4xl animate-bounce" style={{ animationDelay: `${i * 0.05}s` }}>⭐</div>
            ))}
          </div>

          <button
            onClick={handleExit}
            className={`group w-full max-w-sm bg-gradient-to-r from-yellow-400 to-amber-600 hover:from-yellow-500 hover:to-amber-700 text-white rounded-[2.5rem] p-1.5 transition-all duration-300 shadow-2xl shadow-yellow-500/20 hover:-translate-y-2`}
          >
            <div className="border-2 border-white/20 rounded-[2rem] px-8 py-5 flex items-center justify-center gap-4">
              <span className="text-xl sm:text-2xl font-black uppercase tracking-widest">Nazad na igre</span>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform text-2xl">
                🏠
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return null;
}