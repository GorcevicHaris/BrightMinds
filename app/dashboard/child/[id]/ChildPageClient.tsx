// app/dashboard/child/[id]/ChildPageClient.tsx
"use client";

import { useState } from "react";
import ExitButton from "@/app/components/ExitButton";
import GameContainer from "./GameContainer";
import ProgressDashboard from "@/app/components/ProgressDashboard";
import { Child } from "./page";
import { CloudCog } from "lucide-react";

interface Props {
    child: Child;
    childId: number;
}
// 
export default function ChildPageClient({ child, childId }: Props) {
    const [activeView, setActiveView] = useState<"game" | "stats">("game");
    console.log(typeof (child.first_name), "First letter of name")
    return (
        <div className="min-h-screen bg-[#F8FAFC] selection:bg-purple-100 font-sans">
            {/* Minimalist Top Bar */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gdodaj deteray-100">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-200">
                            {child.first_name?.charAt(0) || undefined}
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
                            {/* Hero Section - Professional & Welcoming */}
                            <div className="relative bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-xl shadow-indigo-50/50 overflow-hidden">
                                {/* Decorative muted background */}
                                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl opacity-60 -mr-20 -mt-20"></div>
                                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-rose-50 to-orange-50 rounded-full blur-3xl opacity-60 -ml-20 -mb-20"></div>

                                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                                    <div className="max-w-2xl text-center md:text-left space-y-6">
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                            </span>
                                            Spremna avantura
                                        </div>

                                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                                            Zdravo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{child.first_name}</span>,<br />
                                            vreme je za učenje! ✨
                                        </h2>

                                        <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-lg mx-auto md:mx-0">
                                            Izaberi igru koja ti se najviše sviđa danas i pokaži svoje veštine. Tvoj napredak se čuva!
                                        </p>
                                    </div>

                                    {/* Visual Element / Illustration Placeholder */}
                                    <div className="hidden md:flex relative w-48 h-48 lg:w-64 lg:h-64 flex-shrink-0">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-[2rem] rotate-6"></div>
                                        <div className="absolute inset-0 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-center -rotate-3 transition-transform hover:rotate-0 duration-500">
                                            <span className="text-8xl filter drop-shadow-sm transform hover:scale-110 transition-transform duration-300">🚀</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

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