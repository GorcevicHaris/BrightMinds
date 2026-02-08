// app/dashboard/child/[id]/GameContainer.tsx
"use client";

import { useState, useRef } from "react";
import ShapeMatchingGame from "@/app/components/games/ShapeMatchingGame";
import MemoryGame from "@/app/components/games/MemoryGame";
import ColoringGame from "@/app/components/games/ColoringGame";

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
];

export default function GameContainer({ childId, childName }: GameContainerProps) {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedGame, setSelectedGame] = useState<"shapes" | "memory" | "coloring">("shapes");

  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef(0);

  const handleGameComplete = async (
    score: number,
    duration: number,
    moodBefore?: string | null,
    moodAfter?: string | null
  ) => {
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

      const activityId = selectedGame === "shapes" ? 1 : selectedGame === "memory" ? 3 : 4;

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
      }
    } catch (error) {
      console.error("Error saving score:", error);
      setMessage("⚠️ Greška pri čuvanju rezultata");
    } finally {
      setIsLoading(false);
      setTimeout(() => { isSavingRef.current = false; }, 5000);
    }
  };

  const activeGameInfo = GAMES.find(g => g.id === selectedGame);

  return (
    <div className="space-y-12">
      {/* Premium Game Selector */}
      <section>
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h3 className="text-2xl font-black text-gray-900">Izaberi svoju avanturu 🎮</h3>
            <p className="text-gray-500 font-medium">Svaka igra te uči nečemu novom!</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => {
                setSelectedGame(game.id as any);
                setCurrentLevel(1);
                setMessage("");
              }}
              disabled={isLoading}
              className={`group relative p-8 rounded-[2.5rem] text-left transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] ${selectedGame === game.id
                  ? `bg-gradient-to-br ${game.color} text-white shadow-2xl ${game.shadow}`
                  : "bg-white border border-gray-100 text-gray-900 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-50"
                }`}
            >
              <div className={`text-5xl mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${selectedGame === game.id ? "drop-shadow-lg" : ""
                }`}>
                {game.icon}
              </div>
              <h4 className="text-2xl font-black mb-2">{game.title}</h4>
              <p className={`text-sm font-medium leading-relaxed ${selectedGame === game.id ? "text-white/80" : "text-gray-500"
                }`}>
                {game.description}
              </p>

              {selectedGame === game.id && (
                <div className="absolute top-6 right-6 h-3 w-3 bg-white rounded-full animate-ping"></div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Level Dashboard */}
      <section className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-50 text-purple-600 text-xs font-black uppercase tracking-widest mb-4">
              Podešavanje igre
            </span>
            <h3 className="text-3xl font-black text-gray-900">
              Izaberi nivo težine 🎯
            </h3>
          </div>

          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
              <button
                key={level}
                onClick={() => { setCurrentLevel(level); setMessage(""); }}
                disabled={isLoading}
                className={`w-14 h-14 rounded-2xl font-black text-lg transition-all duration-300 flex items-center justify-center ${currentLevel === level
                    ? `bg-gradient-to-br ${activeGameInfo?.color} text-white shadow-lg ${activeGameInfo?.shadow} scale-110`
                    : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Game Tips/Description */}
        <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 flex items-start gap-4">
          <div className="text-2xl">💡</div>
          <p className="text-gray-600 font-medium leading-relaxed">
            {selectedGame === "shapes" && (
              <><b>Nivo {currentLevel}:</b> {currentLevel <= 2 ? "Fokus na osnovne oblike." : "Više oblika za bolje prepoznavanje."}</>
            )}
            {selectedGame === "memory" && (
              <><b>Nivo {currentLevel}:</b> {currentLevel * 2} kartica za pamćenje. Pronađi sve parove!</>
            )}
            {selectedGame === "coloring" && (
              <><b>Nivo {currentLevel}:</b> Sjajna prilika da pokažeš svoje veštine bojenja.</>
            )}
          </p>
        </div>
      </section>

      {/* Status Messages */}
      {message && (
        <div className="animate-in zoom-in duration-500">
          <div className={`p-6 rounded-[2rem] text-center text-xl font-black shadow-xl border-4 ${message.includes("Greška")
              ? "bg-red-50 border-red-200 text-red-600"
              : "bg-green-50 border-green-200 text-green-600 animate-bounce"
            }`}>
            {message}
          </div>
        </div>
      )}

      {/* Main Game Interface */}
      <div className="relative group min-h-[600px] bg-white rounded-[3rem] p-4 md:p-8 shadow-2xl shadow-purple-100/50 border border-purple-50 overflow-hidden">
        {/* Soft background glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${activeGameInfo?.color} opacity-0 group-hover:opacity-[0.02] transition-opacity duration-1000`}></div>

        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
            <div className="h-16 w-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
            <p className="text-xl font-black text-gray-800 tracking-tight">Čuvam tvoj uspeh...</p>
          </div>
        )}

        <div className="relative z-10" key={`${selectedGame}-level-${currentLevel}`}>
          {selectedGame === "shapes" ? (
            <ShapeMatchingGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
          ) : selectedGame === "memory" ? (
            <MemoryGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
          ) : (
            <ColoringGame childId={childId} level={currentLevel} onComplete={handleGameComplete} />
          )}
        </div>
      </div>
    </div>
  );
}