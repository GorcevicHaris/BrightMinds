// app/dashboard/child/[id]/GameContainer.tsx
"use client";

import { useState, useRef } from "react";
import ShapeMatchingGame from "@/app/components/games/ShapeMatchingGame";
import MemoryGame from "@/app/components/games/MemoryGame";
import ColoringGame from "@/app/components/games/ColoringGame";
import SoundToImageGame from "@/app/components/games/SoundToImageGame";
import SocialCommunicationGame from "@/app/components/games/SocialCommunicationGame";
import SocialStoryGame from "@/app/components/games/SocialStoryGame";
import EmotionsGame from "@/app/components/games/EmotionsGame";

import { useGameEmitter } from "@/lib/useSocket";

type GameId = "shapes" | "memory" | "coloring" | "sound-to-image" | "social" | "social-story" | "emotions";

interface GameContainerProps {
  childId: number;
  childName: string;
}

const GAMES = [
  {
    id: "shapes" as GameId,
    title: "Složi oblik",
    description: "Prepoznavanje oblika i boja",
    icon: "🔷",
    color: "from-emerald-400 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "memory" as GameId,
    title: "Spoji parove",
    description: "Vežbanje memorije i pažnje",
    icon: "🧠",
    color: "from-purple-400 to-indigo-500",
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-700",
  },
  {
    id: "coloring" as GameId,
    title: "Bojanka",
    description: "Kreativnost i fina motorika",
    icon: "🎨",
    color: "from-orange-400 to-pink-500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700",
  },
  {
    id: "sound-to-image" as GameId,
    title: "Zvuk → Slika",
    description: "Slušna pažnja i povezivanje",
    icon: "🔊",
    color: "from-cyan-400 to-blue-500",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    badge: "bg-cyan-100 text-cyan-700",
  },
  {
    id: "social" as GameId,
    title: "Šta da kažeš?",
    description: "Socijalna komunikacija i govor",
    icon: "💬",
    color: "from-violet-400 to-purple-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-700",
  },
  {
    id: "social-story" as GameId,
    title: "Istraži Grad",
    description: "Vozi kolima kroz grad do cilja!",
    icon: "🚗",
    color: "from-teal-500 to-emerald-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-700",
  },
  {
    id: "emotions" as GameId,
    title: "Emocije",
    description: "Kako se osećaš u različitim situacijama?",
    icon: "😊",
    color: "from-pink-400 to-rose-500",
    bg: "bg-pink-50",
    border: "border-pink-200",
    badge: "bg-pink-100 text-pink-700",
  },
];

type Screen = "picker" | "level-select" | "playing" | "all-finished";

export default function GameContainer({ childId, childName }: GameContainerProps) {
  const [screen, setScreen] = useState<Screen>("picker");
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef(0);

  const activeGame = GAMES.find((g) => g.id === selectedGame);

  // ── 1. Game card clicked → jump straight to level selector (fullscreen)
  const handleGameSelect = (gameId: GameId) => {
    setSelectedGame(gameId);
    setCurrentLevel(1);
    setMessage("");
    setScreen("level-select");
  };

  // ── 2. Level chosen + "Launch" clicked → show the actual game
  const handleLaunch = () => {
    setScreen("playing");
  };

  const { emitGameComplete } = useGameEmitter();

  // ── 3. Exit from any focused screen
  const handleExit = () => {
    // Ako smo bili u igri, pošaljimo monitoru da smo završili (izašli)
    if (screen === "playing" && selectedGame) {
      const activityId =
        selectedGame === "shapes" ? 1 :
          selectedGame === "memory" ? 3 :
            selectedGame === "sound-to-image" ? 5 :
              selectedGame === "social" ? 6 :
                selectedGame === "social-story" ? 7 :
                  selectedGame === "emotions" ? 8 : 4;

      emitGameComplete({
        childId,
        activityId,
        gameType: selectedGame,
        event: 'completed',
        data: { finalScore: 0, reason: 'manual_exit' },
        timestamp: new Date().toISOString()
      } as any);
    }

    setScreen("picker");
    setSelectedGame(null);
    setMessage("");
  };

  // ── 4. Game complete callback
  const handleGameComplete = async (
    score: number,
    duration: number,
    moodBefore?: string | null,
    moodAfter?: string | null
  ) => {
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

      const activityId =
        selectedGame === "shapes"
          ? 1
          : selectedGame === "memory"
            ? 3
            : selectedGame === "sound-to-image"
              ? 5
              : selectedGame === "social"
                ? 6
                : selectedGame === "social-story"
                  ? 7
                  : selectedGame === "emotions"
                    ? 8
                    : 4;

      const response = await fetch("/api/activities/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          activityId,
          successLevel,
          durationMinutes: Math.ceil(duration / 60) || 1,
          notes: `Automatski prelaz - Nivo ${currentLevel}, Rezultat: ${score} poena`,
          moodBefore: moodBefore || null,
          moodAfter: moodAfter || null,
        }),
      });

      if (response.ok) {
        if (currentLevel < 8) {
          setMessage(`🌟 Bravo! Prelazimo na NIVO ${currentLevel + 1}! 🚀`);
          setTimeout(() => {
            setCurrentLevel((prev) => prev + 1);
            setMessage("");
            setIsLoading(false);
          }, 2500);
        } else {
          // Završio sve nivoe!
          setIsLoading(false);
          setScreen("all-finished");
        }
      } else {
        setMessage(`⚠️ Problem sa čuvanjem poena`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("⚠️ Greška na mreži");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      // Release reservation after a delay to avoid double calls
      setTimeout(() => {
        isSavingRef.current = false;
      }, 2000);
    }
  };

  // ────────────────────────────────────────────────────────
  // SCREEN A: Game Picker (home)
  // ────────────────────────────────────────────────────────
  if (screen === "picker") {
    return (
      <div className="space-y-8 pb-16 px-2 md:px-0">
        {/* Section header */}
        <div className="flex flex-col gap-2 px-1">
          <span className="inline-block w-fit px-3 py-1 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-600 text-[10px] font-black uppercase tracking-widest">
            활Aktivnosti
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Izaberi igru 🎮
          </h2>
          <p className="text-slate-500 text-base font-medium">
            Klikni na igru i odmah počinjemo!
          </p>
        </div>

        {/* Game cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {GAMES.map((game) => (
            <button
              key={game.id}
              id={`game-card-${game.id}`}
              onClick={() => handleGameSelect(game.id)}
              className={`group relative p-6 md:p-8 rounded-3xl text-left transition-all duration-300
                hover:scale-[1.03] active:scale-[0.97]
                bg-white border-2 ${game.border}
                hover:shadow-2xl shadow-sm
                hover:border-opacity-80`}
            >
              {/* Gradient glow accent */}
              <div
                className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
              />

              <div className="relative flex items-start gap-5">
                {/* Icon */}
                <div
                  className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-4xl shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300`}
                >
                  {game.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">
                    {game.title}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {game.description}
                  </p>
                </div>
              </div>

              {/* "Igraj" CTA */}
              <div
                className={`mt-5 flex items-center justify-between`}
              >
                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${game.badge}`}>
                  Pritisni za igru
                </span>
                <span className="text-2xl group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // SCREEN B: Level selector (fullscreen overlay)
  // ────────────────────────────────────────────────────────
  if (screen === "level-select" && activeGame) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 animate-in fade-in duration-300">
        {/* Top bar */}
        <div className="bg-white/90 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center gap-4 shadow-sm flex-shrink-0">
          <button
            onClick={handleExit}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all"
            aria-label="Nazad"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeGame.color} flex items-center justify-center text-2xl shadow-md`}>
            {activeGame.icon}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">{activeGame.title}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Izaberi nivo</p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-10">

            {/* Hero icon */}
            <div
              className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gradient-to-br ${activeGame.color} flex items-center justify-center shadow-2xl animate-in zoom-in-90 duration-300`}
              style={{ fontSize: "72px" }}
            >
              {activeGame.icon}
            </div>

            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">
                {activeGame.title}
              </h1>
              <p className="text-slate-500 text-base md:text-lg font-medium">
                {activeGame.description}
              </p>
            </div>

            {/* Level grid */}
            <div className="w-full">
              <p className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                Izaberi težinu
              </p>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                  <button
                    key={level}
                    onClick={() => setCurrentLevel(level)}
                    className={`aspect-square rounded-2xl font-black text-xl transition-all duration-200 flex items-center justify-center
                      ${currentLevel === level
                        ? `bg-gradient-to-br ${activeGame.color} text-white shadow-xl scale-110`
                        : "bg-white border-2 border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-700 hover:scale-105"
                      }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-center text-sm font-bold text-slate-500 mt-4">
                Trenutno odabran: <span className="text-slate-900 font-black">Nivo {currentLevel}</span>
              </p>
            </div>

            {/* Launch button */}
            <button
              onClick={handleLaunch}
              className={`w-full max-w-sm relative p-1.5 rounded-2xl bg-gradient-to-r ${activeGame.color} shadow-2xl transition-all duration-300 hover:scale-[1.04] active:scale-[0.97]`}
            >
              <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 flex items-center justify-center gap-3">
                <span className="text-xl md:text-2xl font-black text-white uppercase tracking-widest">
                  Pokreni igru
                </span>
                <span className="text-2xl">🚀</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // SCREEN C: Playing (fullscreen game)
  // ────────────────────────────────────────────────────────
  if (screen === "playing" && activeGame) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col animate-in fade-in duration-300 overflow-hidden">
        {/* Immersive header */}
        <div className="bg-white/90 backdrop-blur-md px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScreen("level-select")}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all"
              aria-label="Nazad na izbor nivoa"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeGame.color} flex items-center justify-center text-xl shadow-md`}>
              {activeGame.icon}
            </div>
            <div>
              <h3 className="text-base md:text-lg font-black text-slate-900 leading-tight">
                {activeGame.title}
              </h3>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                Nivo {currentLevel}
              </p>
            </div>
          </div>
          <button
            onClick={handleExit}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold transition-all flex items-center gap-2 border border-transparent hover:border-red-100 text-sm"
          >
            <span className="hidden sm:inline">Završi igru</span>
            <span className="text-lg">✕</span>
          </button>
        </div>

        {/* Game area */}
        <div className="flex-1 relative overflow-y-auto p-3 md:p-6 flex flex-col">
          {/* Success / error toast — small and non-intrusive */}
          {message && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-top-2 duration-300 w-auto max-w-md pointer-events-none">
              <div
                className={`px-6 py-3 rounded-2xl text-center text-base font-black shadow-lg ${message.includes("Greška")
                  ? "bg-red-50 border border-red-200 text-red-600"
                  : "bg-green-50 border border-green-200 text-green-700"
                  }`}
              >
                {message}
              </div>
            </div>
          )}

          {/* The actual game */}
          <div
            className="relative w-full flex-1 flex flex-col"
            key={`${selectedGame}-level-${currentLevel}`}
          >
            {selectedGame === "shapes" ? (
              <ShapeMatchingGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
            ) : selectedGame === "memory" ? (
              <MemoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
            ) : selectedGame === "sound-to-image" ? (
              <SoundToImageGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
            ) : selectedGame === "social" ? (
              <SocialCommunicationGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
            ) : selectedGame === "social-story" ? (
              <SocialStoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
            ) : selectedGame === "emotions" ? (
              <EmotionsGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
            ) : (
              <ColoringGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────
  // SCREEN D: All Finished (Success celebration)
  // ────────────────────────────────────────────────────────
  if (screen === "all-finished" && activeGame) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        {/* Background decorations */}
        <div className={`absolute top-0 left-0 w-64 h-64 bg-gradient-to-br ${activeGame.color} opacity-10 rounded-full -ml-32 -mt-32 blur-3xl`} />
        <div className={`absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-br ${activeGame.color} opacity-10 rounded-full -mr-32 -mb-32 blur-3xl`} />

        <div className="w-full max-w-xl relative">
          {/* Trophy / Icon */}
          <div className="flex justify-center mb-10">
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${activeGame.color} rounded-full blur-3xl opacity-30 animate-pulse`} />
              <div className="relative text-[120px] md:text-[160px] animate-bounce">
                🏆
              </div>
              <div className="absolute -top-4 -right-4 text-4xl animate-pulse delay-75">✨</div>
              <div className="absolute top-1/2 -left-8 text-4xl animate-pulse delay-300">🎉</div>
            </div>
          </div>

          {/* Text content */}
          <h1 className="text-4xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight">
            BRAVO<br />ŠAMPIONE! 🌟
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-12 font-medium leading-relaxed">
            Pobedio si sve nivoe u igri <br />
            <span className={`font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r ${activeGame.color}`}>
              {activeGame.title}
            </span>! <br />
            Jako sam ponosan na tebe!
          </p>

          {/* Action button */}
          <button
            onClick={handleExit}
            className={`w-full max-w-sm group relative p-1.5 rounded-[2rem] bg-gradient-to-r ${activeGame.color} shadow-2xl transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] mx-auto`}
          >
            <div className="bg-white/10 border border-white/20 rounded-[1.5rem] px-8 py-5 flex items-center justify-center gap-4">
              <span className="text-2xl font-black text-white uppercase tracking-widest">NAZAD NA IGRE</span>
              <div className="w-12 h-12 bg-white text-slate-900 rounded-xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
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