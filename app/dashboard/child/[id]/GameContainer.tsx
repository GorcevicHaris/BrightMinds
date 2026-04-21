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
  { id: "shapes" as GameId,       title: "Složi oblik",        description: "Prepoznavanje oblika i boja",          icon: "🔷", gradient: "from-emerald-400 to-teal-500",   cardBg: "bg-emerald-50",   border: "border-emerald-200" },
  { id: "memory" as GameId,       title: "Spoji parove",       description: "Vežbanje memorije i pažnje",           icon: "🧠", gradient: "from-purple-400 to-indigo-500",  cardBg: "bg-purple-50",    border: "border-purple-200" },
  { id: "coloring" as GameId,     title: "Bojanka",            description: "Kreativnost i fina motorika",          icon: "🎨", gradient: "from-orange-400 to-pink-500",    cardBg: "bg-orange-50",    border: "border-orange-200" },
  { id: "sound-to-image" as GameId, title: "Zvuk → Slika",    description: "Slušna pažnja i povezivanje",          icon: "🔊", gradient: "from-cyan-400 to-blue-500",      cardBg: "bg-cyan-50",      border: "border-cyan-200" },
  { id: "social" as GameId,       title: "Šta da kažeš?",     description: "Socijalna komunikacija i govor",        icon: "💬", gradient: "from-violet-400 to-purple-600",  cardBg: "bg-violet-50",    border: "border-violet-200" },
  { id: "social-story" as GameId, title: "Socijalne Priče",   description: "Uči o školi, doktoru, parku i još mnogo!", icon: "📖", gradient: "from-teal-500 to-emerald-600", cardBg: "bg-teal-50",      border: "border-teal-200" },
  { id: "emotions" as GameId,     title: "Emocije",           description: "Kako se osećaš u različitim situacijama?", icon: "😊", gradient: "from-pink-400 to-rose-500",  cardBg: "bg-pink-50",      border: "border-pink-200" },
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
      .catch(() => {});
  };

  useEffect(() => {
    setLevelsLoading(true);
    fetch(`/api/children/${childId}/unlocked-levels?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.json())
      .then(data => { if (data.unlockedLevels) setUnlockedLevels(data.unlockedLevels); })
      .catch(() => {})
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

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {GAMES.map(game => {
            const maxUnlocked = getMaxUnlocked(game.id);
            const easyDone   = completedInTier("easy",   maxUnlocked);
            const mediumDone = completedInTier("medium", maxUnlocked);
            const hardDone   = completedInTier("hard",   maxUnlocked);
            const mediumUnlocked = isDiffUnlocked("medium", maxUnlocked);
            const hardUnlocked   = isDiffUnlocked("hard",   maxUnlocked);
            const totalDone = Math.min(easyDone, 5) + Math.min(mediumDone, 5) + Math.min(hardDone, 5);
            const pct = Math.round((totalDone / 15) * 100);

            return (
              <button
                key={game.id}
                id={`game-card-${game.id}`}
                onClick={() => handleGameSelect(game.id)}
                className="group relative flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden text-left transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] shadow-md hover:shadow-2xl bg-white select-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {/* Gradient top — big icon zone */}
                <div className={`relative bg-gradient-to-br ${game.gradient} flex flex-col items-center justify-center pt-6 pb-5 sm:pt-8 sm:pb-6 px-3`}>
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.5) 0%, transparent 60%)" }} />
                  <div className="text-5xl sm:text-6xl md:text-7xl mb-1 drop-shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    {game.icon}
                  </div>
                  {totalDone > 0 && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white/30 backdrop-blur-sm px-2 py-0.5 rounded-full border border-white/50">
                      <span className="text-white font-black text-[9px] sm:text-[10px]">{totalDone}/15 ⭐</span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="flex-1 flex flex-col p-3 sm:p-4 bg-white">
                  <h3 className="font-black text-slate-900 text-sm sm:text-base md:text-lg leading-tight mb-1">
                    {game.title}
                  </h3>
                  <p className="text-slate-400 text-[10px] sm:text-xs font-medium mb-3 leading-snug line-clamp-2 hidden sm:block">
                    {game.description}
                  </p>

                  {/* Difficulty mini badges */}
                  <div className="flex items-center gap-1 sm:gap-1.5 mt-auto">
                    <div className="flex-1 flex flex-col items-center gap-0.5 bg-emerald-50 rounded-lg py-1.5 px-1 border border-emerald-100">
                      <span className="text-sm leading-none">🌱</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${i <= easyDone ? "bg-emerald-500" : "bg-emerald-200"}`} />
                        ))}
                      </div>
                    </div>
                    <div className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg py-1.5 px-1 border ${mediumUnlocked ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100 opacity-40"}`}>
                      <span className="text-sm leading-none">{mediumUnlocked ? "⚡" : "🔒"}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${mediumUnlocked && i <= mediumDone ? "bg-amber-500" : "bg-slate-200"}`} />
                        ))}
                      </div>
                    </div>
                    <div className={`flex-1 flex flex-col items-center gap-0.5 rounded-lg py-1.5 px-1 border ${hardUnlocked ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100 opacity-40"}`}>
                      <span className="text-sm leading-none">{hardUnlocked ? "🔥" : "🔒"}</span>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${hardUnlocked && i <= hardDone ? "bg-rose-500" : "bg-slate-200"}`} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Overall progress bar */}
                  <div className="mt-2">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${game.gradient} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className={`bg-gradient-to-r ${game.gradient} px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between`}>
                  <span className="text-white font-black text-xs sm:text-sm uppercase tracking-wider">Igraj!</span>
                  <span className="text-white text-base sm:text-xl group-hover:translate-x-1 transition-transform duration-200">▶</span>
                </div>
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
      <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden"
        style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #fdf4ff 50%, #f0fdf4 100%)" }}>

        {/* Decorative blobs — very child-friendly pastel */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-blue-200/40 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-48 h-48 bg-pink-200/30 rounded-full blur-3xl" />
        </div>

        {/* ── Top bar ── */}
        <div className="relative z-10 flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-white/70 backdrop-blur-md border-b border-slate-200/60 shadow-sm flex-shrink-0">
          <button
            onClick={handleExit}
            aria-label="Nazad na igre"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 px-3 py-2 rounded-xl font-black text-xs sm:text-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Nazad</span>
          </button>

          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${activeGame.gradient} flex items-center justify-center text-2xl sm:text-3xl shadow-lg shrink-0`}>
            {activeGame.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-xl font-black text-slate-900 leading-tight truncate">{activeGame.title}</h2>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Odaberi težinu</p>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="relative z-10 flex-1 overflow-y-auto flex flex-col items-center justify-start sm:justify-center px-4 sm:px-6 py-5 sm:py-8">

          {/* Title */}
          <div className="text-center mb-5 sm:mb-8">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 mb-3">
              <span className="text-lg sm:text-xl">{activeGame.icon}</span>
              <span className="text-xs sm:text-sm font-black text-slate-600 uppercase tracking-wider">{activeGame.title}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Koliko je teško? 🎯
            </h1>
          </div>

          {/* ── 3 Difficulty Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 w-full max-w-3xl">
            {DIFFICULTY_ORDER.map((diff, cardIdx) => {
              const cfg = DIFF_CONFIG[diff];
              const unlocked = isDiffUnlocked(diff, maxUnlocked);
              const done = completedInTier(diff, maxUnlocked);
              const allDone = done === 5;

              // Card-specific styles
              const cardStyles = [
                { bg: "from-emerald-400 to-teal-500",    shadow: "shadow-emerald-200", ring: "ring-emerald-300", lightBg: "bg-emerald-50",   border: "border-emerald-200" },
                { bg: "from-amber-400 to-orange-500",    shadow: "shadow-amber-200",   ring: "ring-amber-300",   lightBg: "bg-amber-50",     border: "border-amber-200" },
                { bg: "from-rose-500 to-pink-600",       shadow: "shadow-rose-200",    ring: "ring-rose-300",    lightBg: "bg-rose-50",      border: "border-rose-200" },
              ][cardIdx];

              return (
                <button
                  key={diff}
                  onClick={() => unlocked && handleDifficultySelect(diff)}
                  disabled={!unlocked}
                  className={`group relative flex flex-col rounded-2xl sm:rounded-3xl overflow-hidden text-center transition-all duration-300 select-none
                    ${unlocked
                      ? `hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.97] shadow-2xl ${cardStyles.shadow} cursor-pointer`
                      : "opacity-55 cursor-not-allowed shadow-md grayscale"
                    }`}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {/* ── Cijela kartica je jedan gradient ── */}
                  <div className={`relative flex flex-col items-center bg-gradient-to-b ${cardStyles.bg} w-full h-full p-5 sm:p-7`}>

                    {/* Sjaj (shine) odozgo */}
                    <div className="absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl pointer-events-none" />
                    {/* Sjena odozdo */}
                    <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-black/10 rounded-b-2xl pointer-events-none" />

                    {/* Completed badge */}
                    {unlocked && allDone && (
                      <div className="absolute top-2.5 right-2.5 bg-white/30 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/50">
                        <span className="text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider">✅ Gotovo!</span>
                      </div>
                    )}

                    {/* Big emoji */}
                    <div className={`relative z-10 text-5xl sm:text-7xl mb-3 sm:mb-4 drop-shadow-2xl transition-transform duration-300
                      ${unlocked ? "group-hover:scale-110 group-hover:-rotate-6" : ""}`}>
                      {unlocked ? cfg.emoji : "🔒"}
                    </div>

                    {/* Title */}
                    <h2 className="relative z-10 text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow mb-1">
                      {cfg.label}
                    </h2>
                    <p className="relative z-10 text-white/80 text-xs sm:text-sm font-bold mb-3 sm:mb-4">
                      {cfg.sublabel}
                    </p>

                    {/* Level range pill */}
                    <div className="relative z-10 mb-4 sm:mb-5 bg-black/20 backdrop-blur-sm border border-white/25 px-4 py-1.5 rounded-full">
                      <span className="text-white/90 text-[11px] sm:text-xs font-black tracking-widest">{cfg.range}</span>
                    </div>

                    {/* Star progress — 5 zvjezdica */}
                    <div className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                      {[1,2,3,4,5].map(i => (
                        <div key={i}
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-base sm:text-xl transition-all duration-300
                            ${unlocked && i <= done
                              ? "bg-white shadow-lg scale-105"
                              : "bg-white/20 border border-white/30"
                            }`}>
                          {unlocked && i <= done
                            ? <span>⭐</span>
                            : <span className="text-white/40 text-xs font-black">{i}</span>}
                        </div>
                      ))}
                    </div>

                    {/* Progress text */}
                    <p className="relative z-10 text-white/80 text-[11px] sm:text-xs font-bold mb-4 sm:mb-5">
                      {!unlocked
                        ? cfg.lockMsg
                        : done === 0 ? "Još nisi počeo/la"
                        : done === 5 ? "Sve urađeno! 🏆"
                        : `${done} od 5 završeno`}
                    </p>

                    {/* CTA */}
                    <div className="relative z-10 w-full bg-white/25 hover:bg-white/35 border-2 border-white/50 rounded-xl sm:rounded-2xl py-3 sm:py-4 flex items-center justify-center gap-2 transition-all group-hover:shadow-xl">
                      <span className="text-white font-black text-sm sm:text-xl uppercase tracking-wider drop-shadow">
                        {!unlocked ? "🔒 Zaključano" : allDone ? "🔁 Ponovi" : "▶ Igraj!"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom hint */}
          <p className="mt-5 sm:mt-8 text-center text-slate-400 text-xs font-bold animate-pulse">
            🌟 Završi Lako da otključaš Srednje — pa Teško!
          </p>
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
                  {[1,2,3,4,5].map(i => (
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
              <ShapeMatchingGame childId={childId} level={currentLevel} onComplete={handleGameComplete} autoStart={autoStart} />
            ) : selectedGame === "memory" ? (
              <MemoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} autoStart={autoStart} />
            ) : selectedGame === "sound-to-image" ? (
              <SoundToImageGame childId={childId} level={currentLevel} onComplete={handleGameComplete} autoStart={autoStart} />
            ) : selectedGame === "social" ? (
              <SocialCommunicationGame childId={childId} level={currentLevel} onComplete={handleGameComplete} autoStart={autoStart} />
            ) : selectedGame === "social-story" ? (
              <SocialStoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} autoStart={autoStart} />
            ) : selectedGame === "emotions" ? (
              <EmotionsGame childId={childId} level={currentLevel} onComplete={handleGameComplete} autoStart={autoStart} />
            ) : (
              <ColoringGame childId={childId} level={currentLevel} onComplete={handleGameComplete} autoStart={autoStart} />
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
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 text-center overflow-hidden"
        style={{ background: `linear-gradient(145deg,#0d1117 0%,#161b27 100%)` }}>

        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl animate-pulse"
            style={{ background: `radial-gradient(circle, ${currentCfg.glow}, transparent)` }} />
        </div>

        <div className="relative z-10 w-full max-w-lg flex flex-col items-center">

          {/* Icon area */}
          <div className="relative mb-6 sm:mb-8">
            <div className="text-7xl sm:text-9xl animate-bounce">{currentCfg.emoji}</div>
            <div className="absolute -top-2 -right-2 text-2xl sm:text-3xl animate-spin" style={{ animationDuration: "3s" }}>✨</div>
            <div className="absolute -bottom-2 -left-2 text-xl sm:text-2xl animate-ping" style={{ animationDuration: "2s" }}>🌟</div>
          </div>

          {/* Completed tier badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${currentCfg.gradient} mb-4 sm:mb-6 shadow-lg`}
            style={{ boxShadow: `0 4px 20px ${currentCfg.glow}` }}>
            <span className="text-sm sm:text-base font-black text-white uppercase tracking-widest">{currentCfg.label} — ZAVRŠENO!</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white mb-3 sm:mb-4 tracking-tight leading-tight">
            Sjajno! 🎉
          </h1>
          <p className="text-white/70 text-base sm:text-lg font-medium mb-6 sm:mb-8 max-w-sm leading-relaxed">
            Završio/la si svih <span className="text-white font-black">5 {currentCfg.label.toLowerCase()} nivoa</span> u igri {activeGame.title}!
          </p>

          {/* Stars display */}
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-10">
            {[1,2,3,4,5].map(i => (
              <span key={i} className="text-2xl sm:text-4xl" style={{ animationDelay: `${i * 0.15}s` }}>⭐</span>
            ))}
          </div>

          {/* Next difficulty unlock message */}
          {nextCfg && (
            <div className="w-full mb-5 sm:mb-6 p-4 sm:p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-center gap-3 sm:gap-4 text-left">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${nextCfg.gradient} flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-lg`}>
                {nextCfg.emoji}
              </div>
              <div>
                <p className="text-white font-black text-sm sm:text-base">🔓 Otključano: {nextCfg.label}!</p>
                <p className="text-white/50 text-xs sm:text-sm">{nextCfg.range} je sada dostupno</p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="w-full flex flex-col gap-3 max-w-sm">
            {nextCfg && (
              <button
                onClick={() => {
                  setSelectedDifficulty(nextDiff!);
                  const maxUnlocked = getMaxUnlocked(selectedGame!);
                  setCurrentLevel(getStartLevelForDiff(nextDiff!, maxUnlocked));
                  setAutoStart(false);
                  setScreen("playing");
                }}
                className={`w-full relative p-1 rounded-2xl bg-gradient-to-r ${nextCfg.gradient} shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]`}
                style={{ boxShadow: `0 8px 30px ${nextCfg.glow}` }}
              >
                <div className="bg-white/10 border border-white/20 rounded-xl px-6 py-4 flex items-center justify-center gap-3">
                  <span className="text-xl">{nextCfg.emoji}</span>
                  <span className="text-base sm:text-xl font-black text-white uppercase tracking-widest">Igraj {nextCfg.label}</span>
                </div>
              </button>
            )}
            <button
              onClick={() => setScreen("difficulty-select")}
              className="w-full px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white/80 font-bold text-sm sm:text-base uppercase tracking-widest transition-all duration-200"
            >
              Nazad na težine
            </button>
            <button
              onClick={handleExit}
              className="w-full px-6 py-3 rounded-2xl bg-transparent hover:bg-white/5 text-white/40 hover:text-white/60 font-bold text-sm uppercase tracking-widest transition-all duration-200"
            >
              Nazad na igre
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
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-8 text-center overflow-hidden"
        style={{ background: "linear-gradient(145deg,#0d1117 0%,#1a1333 50%,#0d1117 100%)" }}>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-15 blur-3xl animate-pulse"
            style={{ background: "radial-gradient(circle, rgba(250,204,21,0.5), transparent)" }} />
        </div>

        <div className="relative z-10 w-full max-w-md flex flex-col items-center">
          <div className="relative mb-6 sm:mb-8">
            <div className="text-8xl sm:text-[120px] md:text-[140px] animate-bounce">🏆</div>
            <div className="absolute -top-4 -right-4 text-3xl sm:text-4xl animate-pulse">✨</div>
            <div className="absolute top-1/2 -left-6 text-2xl sm:text-3xl animate-ping" style={{ animationDuration: "2s" }}>🎉</div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl sm:text-2xl">🌱</span>
            <span className="text-xl sm:text-2xl">⚡</span>
            <span className="text-xl sm:text-2xl">🔥</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white mb-4 tracking-tight leading-tight">
            ŠAMPION!
          </h1>
          <p className="text-lg sm:text-2xl text-white/70 mb-2 sm:mb-3 font-medium leading-relaxed">
            Završio/la si <span className="font-black text-white">SVE 15 NIVOA</span> u igri
          </p>
          <p className={`text-xl sm:text-3xl font-black mb-8 sm:mb-12 text-transparent bg-clip-text bg-gradient-to-r ${activeGame.gradient}`}>
            {activeGame.icon} {activeGame.title}
          </p>

          <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8 sm:mb-12">
            {Array.from({ length: 15 }).map((_, i) => (
              <span key={i} className="text-sm sm:text-lg" style={{ animationDelay: `${i * 0.08}s` }}>⭐</span>
            ))}
          </div>

          <button
            onClick={handleExit}
            className={`w-full max-w-xs group relative p-1.5 rounded-[2rem] bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 shadow-2xl transition-all duration-300 hover:scale-[1.05] active:scale-[0.95]`}
            style={{ boxShadow: "0 10px 40px rgba(245,158,11,0.4)" }}
          >
            <div className="bg-white/10 border border-white/20 rounded-[1.5rem] px-8 py-4 sm:py-5 flex items-center justify-center gap-3">
              <span className="text-base sm:text-2xl font-black text-white uppercase tracking-widest">Nazad na igre</span>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform text-white text-xl">
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