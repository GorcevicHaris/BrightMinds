// app/dashboard/child/[id]/GameContainer.tsx
"use client";

import { useState } from "react";
import ShapeMatchingGame from "@/app/components/games/ShapeMatchingGame";

interface GameContainerProps {
    childId: number;
    childName: string;
}

export default function GameContainer({ childId, childName }: GameContainerProps) {
    const [currentLevel, setCurrentLevel] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false); // NOVO: Guard za dupli upis

    const handleGameComplete = async (
        score: number,
        duration: number,
        moodBefore?: string | null,
        moodAfter?: string | null
    ) => {
        // GUARD: Spreči dupli upis
        if (isSaving || isLoading) {
            console.log("⚠️ Već se čuva rezultat, preskajem...");
            return;
        }

        setIsSaving(true);
        setIsLoading(true);

        try {
            // Odredi nivo uspeha na osnovu rezultata
            let successLevel: "struggled" | "partial" | "successful" | "excellent";
            if (score >= 80) successLevel = "excellent";
            else if (score >= 60) successLevel = "successful";
            else if (score >= 40) successLevel = "partial";
            else successLevel = "struggled";

            const response = await fetch("/api/activities/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    childId,
                    activityId: 1,
                    successLevel,
                    durationMinutes: Math.ceil(duration / 60),
                    notes: `Nivo ${currentLevel}, Rezultat: ${score} poena`,
                    moodBefore: moodBefore || null,
                    moodAfter: moodAfter || null,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`🎉 Sačuvano! ${childName} je osvojio/la ${score} poena!`);

                // Ako je rezultat odličan, automatski pređi na sledeći nivo
                if (score >= 80 && currentLevel < 5) {
                    setTimeout(() => {
                        setCurrentLevel(prev => prev + 1);
                        setMessage("🚀 Prelazimo na teži nivo!");
                        setTimeout(() => setMessage(""), 1500);
                    }, 2000);
                }
            } else {
                setMessage(`⚠️ Greška: ${data.error}`);
            }
        } catch (error) {
            console.error("Error saving game result:", error);
            setMessage("⚠️ Greška pri čuvanju rezultata");
        } finally {
            setIsLoading(false);
            // Resetuj guard nakon 2 sekunde da omogućiš novu igru
            setTimeout(() => setIsSaving(false), 2000);
        }
    };
    // 
    return (
        <div>
            {/* Level selector */}
            <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                        🎯 Izaberi nivo težine:
                    </h2>
                    <div className="flex gap-3 flex-wrap">
                        {[1, 2, 3, 4, 5].map(level => (
                            <button
                                key={level}
                                onClick={() => setCurrentLevel(level)}
                                disabled={isLoading}
                                className={`px-6 py-3 rounded-full font-bold transition-all ${currentLevel === level
                                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-110 shadow-lg"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                Nivo {level}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mt-4 text-gray-600">
                    {currentLevel === 1 && "⭐ Početni nivo - 3 oblika"}
                    {currentLevel === 2 && "⭐⭐ Lako - 4 oblika"}
                    {currentLevel === 3 && "⭐⭐⭐ Srednje - 5 oblika"}
                    {currentLevel === 4 && "⭐⭐⭐⭐ Teško - 6 oblika"}
                    {currentLevel === 5 && "⭐⭐⭐⭐⭐ Izazov - 7 oblika"}
                </div>
                {isLoading && (
                    <div className="mt-4 text-orange-600 font-semibold text-center animate-pulse">
                        ⏳ Čuvam rezultat, sačekaj malo...
                    </div>
                )}
            </div>

            {/* Success message */}
            {message && (
                <div className={`border-2 px-6 py-4 rounded-2xl mb-6 text-center text-xl font-semibold animate-bounce ${message.includes("Greška")
                    ? "bg-red-100 border-red-400 text-red-800"
                    : "bg-green-100 border-green-400 text-green-800"
                    }`}>
                    {message}
                </div>
            )}

            {/* Loading overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-3xl p-8 text-center">
                        <div className="text-6xl mb-4 animate-spin">⏳</div>
                        <p className="text-2xl font-bold text-gray-700">Čuvam rezultat...</p>
                    </div>
                </div>
            )}

            {/* Game */}
            <ShapeMatchingGame
                childId={childId}
                level={currentLevel}
                onComplete={handleGameComplete}
            />
        </div>
    );
}