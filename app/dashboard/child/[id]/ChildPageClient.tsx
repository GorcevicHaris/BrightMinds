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
    const [activeView, setActiveView] = useState<"game" | "stats">("game");
    return (
        <div className="min-h-screen bg-[#F8FAFC] selection:bg-purple-100 font-sans">
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-200 uppercase">
                            {child.first_name?.trim()?.charAt(0)}{child.last_name?.trim()?.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">
                                {child.first_name} {child.last_name}
                            </h1>
                            <p className="text-sm text-gray-500 font-medium">Profil deteta</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <nav className="hidden md:flex bg-gray-100/80 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveView("game")}
                                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${activeView === "game"
                                    ? "bg-white text-purple-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                    }`}
                            >
                                🎮 Igraonica
                            </button>
                            <button
                                onClick={() => setActiveView("stats")}
                                className={`px-6 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${activeView === "stats"
                                    ? "bg-white text-purple-600 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                                    }`}
                            >
                                📊 Statistika
                            </button>
                        </nav>
                        <ExitButton target="/dashboard" />
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Mobile Navigation */}
                <div className="md:hidden flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-8">
                    <button
                        onClick={() => setActiveView("game")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeView === "game"
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                            : "text-gray-500"
                            }`}
                    >
                        🎮 Igraonica
                    </button>
                    <button
                        onClick={() => setActiveView("stats")}
                        className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${activeView === "stats"
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                            : "text-gray-500"
                            }`}
                    >
                        📊 Statistika
                    </button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {activeView === "game" ? (
                        <div className="space-y-8">
                            <GameContainer childId={childId} childName={child.first_name} />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-gray-100 shadow-sm overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16"></div>
                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-900 mb-2">
                                            Analiza napretka 📈
                                        </h2>
                                        <p className="text-gray-500 font-medium">
                                            Pratite svakodnevne rezultate i uspeh u različitim aktivnostima.
                                        </p>
                                    </div>
                                    <div className="flex -space-x-3">
                                        {['⭐', '🏆', '🔥'].map((emoji, i) => (
                                            <div key={i} className={`h-12 w-12 rounded-full border-4 border-white flex items-center justify-center text-white font-bold ring-2 ring-gray-50 ${i === 0 ? 'bg-green-400' : i === 1 ? 'bg-blue-400' : 'bg-purple-400'
                                                }`}>
                                                {emoji}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <ProgressDashboard childId={childId} childName={child.first_name} />
                        </div>
                    )}
                </div>
            </main>

            {/* Subtle Footer */}
            <footer className="mt-20 py-12 border-t border-gray-100 bg-white">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-gray-400 text-sm font-medium">
                        © 2026 Bright Minds App • Napravljeno sa ❤️ za tvoj napredak
                    </p>
                </div>
            </footer>
        </div>
    );
}