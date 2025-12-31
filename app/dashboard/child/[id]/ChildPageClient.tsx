// app/dashboard/child/[id]/ChildPageClient.tsx
"use client";

import { useState } from "react";
import ExitButton from "@/app/components/ExitButton";
import GameContainer from "./GameContainer";
import ProgressDashboard from "@/app/components/ProgressDashboard";
import { Child } from "./page";

interface Props {
    child: Child;
    childId: number;
}

export default function ChildPageClient({ child, childId }: Props) {
    const [activeView,  setActiveView] = useState<"game" | "stats">("game");

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
            <div className="max-w-7xl mx-auto pb-12">
                <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <div>
                            <h1 className="text-4xl font-bold text-purple-700 mb-2">
                                {child.first_name} {child.last_name}
                            </h1>
                            {child.notes && (
                                <p className="text-gray-600 italic">💭 {child.notes}</p>
                            )}
                        </div>
                        <ExitButton target="/dashboard" />
                    </div>
                </div>
                <div className="bg-white rounded-3xl shadow-xl p-3 mb-6 flex gap-3">
                    <button
                        onClick={() => setActiveView("game")}
                        className={`flex-1 px-8 py-4 rounded-2xl font-bold text-xl transition-all ${activeView === "game"
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        🎮 Igraj
                    </button>
                    <button
                        onClick={() => setActiveView("stats")}
                        className={`flex-1 px-8 py-4 rounded-2xl font-bold text-xl transition-all ${activeView === "stats"
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        📊 Statistika
                    </button>
                </div>
                <div className="mb-16">
                    {activeView === "game" ? (
                        <GameContainer childId={childId} childName={child.first_name} />
                    ) : (
                        <ProgressDashboard childId={childId} childName={child.first_name} />
                    )}
                </div>
            </div>
        </div>
    );
}