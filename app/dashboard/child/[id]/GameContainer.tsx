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

export default function GameContainer({ childId, childName }: GameContainerProps) {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedGame, setSelectedGame] = useState<"shapes" | "memory" | "coloring">("shapes");
  
  // Guard mehanizam za sprečavanje duplih upisa
  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef(0);

  const handleGameComplete = async (
    score: number, 
    duration: number, 
    moodBefore?: string | null, 
    moodAfter?: string | null
  ) => {
    const now = Date.now();
    
    // Guard: spreči čuvanje ako je već u toku ili je prošlo manje od 3 sekunde
    if (isSavingRef.current || (now - lastSaveTimeRef.current < 3000)) {
      console.log("⚠️ Već se čuva rezultat, preskajem...");
      return;
    }

    isSavingRef.current = true;
    lastSaveTimeRef.current = now;
    setIsLoading(true);

    try {
      let successLevel: "struggled" | "partial" | "successful" | "excellent";
      if (score >= 200) successLevel = "excellent";
      else if (score >= 100) successLevel = "successful";
      else if (score >= 50) successLevel = "partial";
      else successLevel = "struggled";

      // ID aktivnosti: 1 = Složi oblik, 3 = Spoji parove
      const activityId = selectedGame === "shapes" ? 1 : selectedGame === "memory" ? 3 : 4

      console.log("💾 Čuvam rezultat:", { childId, activityId, score, duration });

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

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Rezultat uspešno sačuvan");
        setMessage(`🎉 Sačuvano! ${childName} je osvojio/la ${score} poena!`);
        
        // Automatski pređi na sledeći nivo ako je rezultat odličan
        if (score >= 200 && currentLevel < 5) {
          setTimeout(() => {
            setCurrentLevel(prev => prev + 1);
            setMessage("🚀 Prelazimo na teži nivo!");
            setTimeout(() => setMessage(""), 1500);
          }, 2000);
        } else {
          setTimeout(() => setMessage(""), 3000);
        }
      } else {
        console.error("❌ Greška:", data);
        setMessage(`⚠️ Greška: ${data.error || "Nepoznata greška"}`);
        setTimeout(() => setMessage(""), 5000);
      }
    } catch (error) {
      console.error("💥 Greška pri čuvanju:", error);
      setMessage("⚠️ Greška pri čuvanju rezultata");
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setIsLoading(false);
      // Resetuj guard nakon 5 sekundi
      setTimeout(() => {
        isSavingRef.current = false;
        console.log("🔓 Guard resetovan");
      }, 5000);
    }
  };

  const handleGameChange = (game: "shapes" | "memory" | "coloring") => {
    if (!isLoading) {
      setSelectedGame(game);
      setCurrentLevel(1); // Reset level when changing games
      setMessage("");
    }
  };

  const handleLevelChange = (level: number) => {
    if (!isLoading) {
      setCurrentLevel(level);
      setMessage("");
    }
  };

  return (
    <div>
      {/* Game selector */}
      <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          🎮 Izaberi igricu:
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleGameChange("shapes")}
            disabled={isLoading}
            className={`p-6 rounded-2xl font-bold text-lg transition-all ${
              selectedGame === "shapes"
                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="text-4xl mb-2">🔷</div>
            <div>Složi oblik</div>
            <div className="text-sm opacity-80">Prepoznavanje oblika</div>
          </button>

          <button
            onClick={() => handleGameChange("memory")}
            disabled={isLoading}
            className={`p-6 rounded-2xl font-bold text-lg transition-all ${
              selectedGame === "memory"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className="text-4xl mb-2">🧠</div>
            <div>Spoji parove</div>
            <div className="text-sm opacity-80">Trening memorije</div>
          </button>
            <button
              onClick={() => handleGameChange("coloring")}
              disabled={isLoading}
              className={`p-6 rounded-2xl font-bold text-lg transition-all ${
          selectedGame === "coloring"
            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
            <div className="text-4xl mb-2">🧠</div>
            <div>Oboji</div>
            <div className="text-sm opacity-80">Bojenje</div>
    </button>
            
        </div>
      </div>

      {/* Level selector */}
      <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-2xl font-bold text-gray-800">
            🎯 Izaberi nivo težine:
          </h2>
          <div className="flex gap-3 flex-wrap">
            {[1, 2, 3, 4, 5,6,7,8].map(level => (
              <button
                key={level}
                onClick={() => handleLevelChange(level)}
                disabled={isLoading}
                className={`px-6 py-3 rounded-full font-bold transition-all ${
                  currentLevel === level
                    ? selectedGame === "shapes"
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white scale-110 shadow-lg"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110 shadow-lg"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Nivo {level}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mt-4 text-gray-600">
          {selectedGame === "shapes" && (
            <>
              {currentLevel === 1 && "⭐ Početni nivo - 3 oblika"}
              {currentLevel === 2 && "⭐⭐ Lako - 4 oblika"}
              {currentLevel === 3 && "⭐⭐⭐ Srednje - 5 oblika"}
              {currentLevel === 4 && "⭐⭐⭐⭐ Teško - 6 oblika"}
              {currentLevel === 5 && "⭐⭐⭐⭐⭐ Izazov - 7 oblika"}
            </>
          )}
          {selectedGame === "memory" && (
            <>
              {currentLevel === 1 && "⭐ Početni nivo - 4 para (8 karti)"}
              {currentLevel === 2 && "⭐⭐ Lako - 5 parova (10 karti)"}
              {currentLevel === 3 && "⭐⭐⭐ Srednje - 6 parova (12 karti)"}
              {currentLevel === 4 && "⭐⭐⭐⭐ Teško - 7 parova (14 karti)"}
              {currentLevel === 5 && "⭐⭐⭐⭐⭐ Izazov - 8 parova (16 karti)"}
            </>
          )}
          {selectedGame === "coloring" && (
            <>
              {currentLevel === 1 && "⭐ Početni nivo - Drvo"}
              {currentLevel === 2 && "⭐⭐ Lako - Kuća"}
              {currentLevel === 3 && "⭐⭐⭐ Srednje - Cvijet"}
              {currentLevel === 4 && "⭐⭐⭐⭐ Teško - Životinja"}
              {currentLevel === 5 && "⭐⭐⭐⭐⭐ Izazov - Pejzaž"}
              {currentLevel === 6 && "⭐⭐⭐⭐⭐⭐ Bas Tesko- Riba"}
              {currentLevel === 7 && "⭐⭐⭐⭐⭐⭐ Pretesko - Automobil"}
              {currentLevel === 8 && "⭐⭐⭐⭐⭐⭐⭐ Nemoguce - Macka"}
            </>
          )}
        </div>
        
        {isLoading && (
          <div className="mt-4 text-orange-600 font-semibold text-center animate-pulse">
            ⏳ Čuvam rezultat, molim te sačekaj...
          </div>
        )}
      </div>

      {/* Success/Error message */}
      {message && (
        <div className={`border-2 px-6 py-4 rounded-2xl mb-6 text-center text-xl font-semibold ${
          message.includes("Greška") 
            ? "bg-red-100 border-red-400 text-red-800"
            : "bg-green-100 border-green-400 text-green-800 animate-bounce"
        }`}>
          {message}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
            <div className="text-6xl mb-4 animate-spin">⏳</div>
            <p className="text-2xl font-bold text-gray-700">Čuvam rezultat...</p>
            <p className="text-gray-500 mt-2">Molim te ne zatvaraj stranicu</p>
          </div>
        </div>
      )}

      {/* Game component - KEY PROP JE KLJUČAN ZA RESET! */}
      <div key={`${selectedGame}-level-${currentLevel}`}>
  {selectedGame === "shapes" ? (
    <ShapeMatchingGame
      childId={childId}
      level={currentLevel}
      onComplete={handleGameComplete}
    />
  ) : selectedGame === "memory" ? (
    <MemoryGame
      childId={childId}
      level={currentLevel}
      onComplete={handleGameComplete}
    />
  ) : (
    <ColoringGame
      childId={childId}
      level={currentLevel}
      onComplete={handleGameComplete}
    />
  )}
</div>
    </div>
  );
}