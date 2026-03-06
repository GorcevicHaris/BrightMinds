// app/dashboard/child/[id]/GameContainer.tsx
"use client";

import { useState, useRef } from "react";
import ShapeMatchingGame from "@/app/components/games/ShapeMatchingGame";
import MemoryGame from "@/app/components/games/MemoryGame";
import ColoringGame from "@/app/components/games/ColoringGame";
import SoundToImageGame from "@/app/components/games/SoundToImageGame";
import SocialCommunicationGame from "@/app/components/games/SocialCommunicationGame";
import { ArrowLeft, Timer, Trophy, Target } from "lucide-react";

interface GameContainerProps {
  childId: number;
  childName: string;
}

const GAMES = [
  {
    id: "shapes",
    title: "Složi oblik",
    description: "Prepoznavanje oblika i boja",
    icon: "🔷",
    color: "from-emerald-400 to-teal-500",
    shadow: "shadow-emerald-200",
  },
  {
    id: "memory",
    title: "Spoji parove",
    description: "Vežbanje memorije i pažnje",
    icon: "🧠",
    color: "from-purple-400 to-indigo-500",
    shadow: "shadow-purple-200",
  },
  {
    id: "coloring",
    title: "Bojanka",
    description: "Kreativnost i fina motorika",
    icon: "🎨",
    color: "from-orange-400 to-pink-500",
    shadow: "shadow-orange-200",
  },
  {
    id: "sound-to-image",
    title: "Zvuk → Slika",
    description: "Slušna pažnja i povezivanje",
    icon: "🔊",
    color: "from-cyan-400 to-blue-500",
    shadow: "shadow-cyan-200",
  },
  {
    id: "social",
    title: "Šta treba da kažeš?",
    description: "Socijalna komunikacija i govor",
    icon: "💬",
    color: "from-violet-400 to-purple-600",
    shadow: "shadow-violet-200",
  },
];

export default function GameContainer({ childId, childName }: GameContainerProps) {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedGame, setSelectedGame] = useState<"shapes" | "memory" | "coloring" | "sound-to-image" | "social">("shapes");
  const [isGameFocused, setIsGameFocused] = useState(false);

  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef(0);

  const handleGameComplete = async (
    score: number,
    duration: number,
    moodBefore?: string | null,
    moodAfter?: string | null
  ) => {
    // ... existing logic ...
    const now = Date.now();
    if (isSavingRef.current || (now - lastSaveTimeRef.current < 3000)) return;

    isSavingRef.current = true;
    lastSaveTimeRef.current = now;
    setIsLoading(true);

    try {
      let successLevel: "struggled" | "partial" | "successful" | "excellent";
      if (score >= 200) successLevel = "excellent";
      else if (score >= 100) successLevel = "successful";
      else if (score >= 50) successLevel = "partial";
      else successLevel = "struggled";

      const activityId = selectedGame === "shapes" ? 1 : selectedGame === "memory" ? 3 : selectedGame === "sound-to-image" ? 5 : selectedGame === "social" ? 6 : 4;

      const response = await fetch("/api/activities/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          activityId,
          successLevel,
          durationMinutes: Math.ceil(duration / 60),
          notes: `Nivo ${currentLevel}, Rezultat: ${score} poena`,
          moodBefore: moodBefore || null,
          moodAfter: moodAfter || null,
        }),
      });

      if (response.ok) {
        console.log("✅ Rezultat uspešno sačuvan!");
        setMessage(`🎉 Bravo! Osvojio/la si ${score} poena!`);
        if (score >= 200 && currentLevel < 8) {
          setTimeout(() => {
            setCurrentLevel(prev => prev + 1);
            setMessage("🚀 Wow! Prelazimo na teži nivo!");
            setTimeout(() => setMessage(""), 2000);
          }, 2000);
        } else {
          setTimeout(() => setMessage(""), 4000);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Greška pri čuvanju:", response.status, errorData);
        setMessage(`⚠️ Greška: ${errorData.error || "Server nije prihvatio rezultat"}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error("💥 Mrežna greška:", error);
      setMessage("⚠️ Mrežna greška pri čuvanju");
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setIsLoading(false);
      setTimeout(() => { isSavingRef.current = false; }, 3000);
    }
  };

  const activeGameInfo = GAMES.find(g => g.id === selectedGame);

  // If focused, show only the game with an exit button
  if (isGameFocused) {
    return (
      <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col animate-in fade-in duration-500 overflow-hidden">
        {/* Immersive Game Header */}
        <div className="bg-white/80 backdrop-blur-md px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-gradient-to-br ${activeGameInfo?.color} flex items-center justify-center text-white text-xl md:text-2xl shadow-lg`}>
              {activeGameInfo?.icon}
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-black text-slate-900 leading-tight">{activeGameInfo?.title}</h3>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Nivo {currentLevel}</p>
            </div>
          </div>
          <button
            onClick={() => setIsGameFocused(false)}
            className="px-4 py-2 md:px-6 md:py-2.5 rounded-xl md:rounded-2xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 font-bold transition-all flex items-center gap-2 group border border-transparent hover:border-red-100 text-sm md:text-base"
          >
            <span className="hidden sm:inline">Završi igru</span>
            <span className="text-lg">✕</span>
          </button>
        </div>

        {/* Fullscreen Game Area */}
        <div className="flex-1 relative overflow-y-auto p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-6xl mx-auto min-h-full flex flex-col items-center py-6 md:py-10">
            {isLoading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-md z-[70] flex flex-col items-center justify-center space-y-4 md:space-y-6 animate-in fade-in duration-300">
                <div className="relative">
                  <div className="h-16 w-16 md:h-24 md:w-24 border-4 md:border-8 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-xl md:text-2xl">⏳</div>
                </div>
                <div className="text-center px-4">
                  <p className="text-xl md:text-3xl font-black text-slate-900 mb-1 md:mb-2">Čuvam tvoj uspeh!</p>
                  <p className="text-slate-500 text-sm md:text-base font-medium tracking-wide animate-pulse">Sačekaj trenutak...</p>
                </div>
              </div>
            )}

            {message && (
              <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-top-4 duration-500 w-full max-w-[90%] md:max-w-none">
                <div className={`px-6 py-4 md:px-12 md:py-6 rounded-2xl md:rounded-[2.5rem] text-center text-lg md:text-2xl font-black shadow-2xl border-2 md:border-4 ${message.includes("Greška")
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-green-50 border-green-200 text-green-600 animate-bounce"
                  }`}>
                  {message}
                </div>
              </div>
            )}

            <div className="relative w-full flex-1 flex flex-col" key={`${selectedGame}-level-${currentLevel}`}>
              {selectedGame === "shapes" ? (
                <ShapeMatchingGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
              ) : selectedGame === "memory" ? (
                <MemoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
              ) : selectedGame === "sound-to-image" ? (
                <SoundToImageGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
              ) : selectedGame === "social" ? (
                <SocialCommunicationGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
              ) : (
                <ColoringGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getLevelName = (lvl: number) => {
    const names = ["", "Sunce ☀️", "Kućica 🏠", "Cvijet 🌸", "Leptir 🦋", "Slon 🐘", "Riba 🐟", "Automobil 🚗", "Mačka 🐱"];
    return names[lvl] || "Slika";
  };

  return (
    <div className="space-y-6 md:space-y-12 pb-24 px-2 md:px-0">
      <section>
        <div className="flex items-center justify-between mb-6 md:mb-10 px-2">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-600 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-2 md:mb-3">
              Kategorije aktivnosti
            </span>
            <h3 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Izaberi svoju avanturu 🎮</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                setSelectedGame(game.id as any);
                setCurrentLevel(1);
                setMessage("");
              }}
              disabled={isLoading}
              className={`group relative p-6 md:p-10 rounded-2xl md:rounded-[3rem] text-left transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] border-2 shadow-sm ${selectedGame === game.id
                ? `bg-gradient-to-br ${game.color} text-white shadow-2xl ${game.shadow} border-transparent ring-4 md:ring-8 ring-white/10`
                : "bg-white border-slate-100 text-slate-900 hover:border-purple-200 hover:shadow-xl shadow-sm"
                }`}
            >
              <div className={`text-4xl md:text-6xl mb-4 md:mb-8 transition-all duration-500 group-hover:scale-125 group-hover:rotate-12 ${selectedGame === game.id ? "drop-shadow-2xl" : "grayscale-[0.5] group-hover:grayscale-0"
                }`}>
                {game.icon}
              </div>
              <h4 className="text-xl md:text-2xl font-black mb-2 md:mb-3 leading-tight">{game.title}</h4>
              <p className={`text-xs md:text-sm font-semibold leading-relaxed transition-colors ${selectedGame === game.id ? "text-white/80" : "text-slate-500"
                }`}>
                {game.description}
              </p>

              {selectedGame === game.id && (
                <div className="absolute top-6 right-6 md:top-10 md:right-10 h-3 w-3 md:h-4 md:w-4 bg-white rounded-full animate-ping"></div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Level Selection Dashboard */}
      <section className="bg-white rounded-2xl md:rounded-[3.5rem] p-6 md:p-16 relative overflow-hidden shadow-2xl shadow-indigo-100 border border-slate-100">
        {/* Background Patterns */}
        <div className="absolute top-0 right-0 w-64 h-64 md:w-[500px] md:h-[500px] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-[60px] md:blur-[100px] -mr-32 md:-mr-64 -mt-32 md:-mt-64"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 md:w-[400px] md:h-[400px] bg-gradient-to-tr from-rose-50 to-orange-50 rounded-full blur-[40px] md:blur-[80px] -ml-24 md:-ml-40 -mb-24 md:-mb-40"></div>

        <div className="relative z-10 grid lg:grid-cols-2 gap-8 md:gap-16 items-center">
          <div className="space-y-6 md:space-y-8 text-center md:text-left">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-500 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-3 md:mb-4">
                Prilagodi nivo
              </span>
              <h3 className="text-2xl md:text-5xl font-black text-slate-900 leading-tight mb-4 md:mb-6">
                Izaberi težinu <br className="hidden md:block" />
                koja ti odgovara 🎯
              </h3>
              <p className="text-slate-500 text-sm md:text-lg font-medium leading-relaxed max-w-md mx-auto md:mx-0">
                Svaki nivo donosi nove izazove i pomaže ti da postaneš još bolji u <b>{activeGameInfo?.title}</b>.
              </p>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
                <button
                  key={level}
                  onClick={() => { setCurrentLevel(level); setMessage(""); }}
                  disabled={isLoading}
                  className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl font-black text-sm md:text-xl transition-all duration-500 flex items-center justify-center ${currentLevel === level
                    ? `bg-slate-900 text-white shadow-xl shadow-slate-200 scale-110 md:scale-125 -translate-y-1 md:-translate-y-2`
                    : "bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-900 border border-slate-100 hover:scale-105"
                    }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6 md:space-y-8">
            {/* Game Preview / Info Card */}
            <div className="bg-slate-50/50 backdrop-blur-xl rounded-2xl md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-xl shadow-indigo-50/50 group hover:border-indigo-100 transition-all duration-500">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 mb-6 md:mb-8 text-center md:text-left">
                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-[1.5rem] bg-gradient-to-br ${activeGameInfo?.color} flex items-center justify-center text-3xl md:text-5xl shadow-2xl shrink-0`}>
                  {activeGameInfo?.icon}
                </div>
                <div>
                  <h4 className="text-xl md:text-2xl font-black text-slate-800 mb-2">{activeGameInfo?.title}</h4>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-bold uppercase tracking-widest">
                    <span className="text-emerald-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Nivo {currentLevel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-slate-100 italic shadow-sm">
                  "Sve je spremno za tvoj sledeći korak. Hajde da učimo kroz igru!"
                </p>

                <button
                  onClick={() => setIsGameFocused(true)}
                  disabled={isLoading}
                  className={`w-full group/btn relative p-1 md:p-1.5 rounded-xl md:rounded-2xl bg-gradient-to-r ${activeGameInfo?.color} transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] mt-4`}
                >
                  <div className="bg-white/10 border border-white/20 rounded-lg md:rounded-xl px-4 md:px-8 py-3 md:py-4 flex items-center justify-center gap-3">
                    <span className="text-base md:text-xl font-black text-white uppercase tracking-widest">Pokreni avanturu</span>
                    <span className="text-xl md:text-2xl group-hover/btn:translate-x-2 transition-transform">🚀</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}