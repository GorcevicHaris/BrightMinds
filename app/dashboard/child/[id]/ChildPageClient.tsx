// app/dashboard/child/[id]/ChildPageClient.tsx
"use client";

import { useState } from "react";
import ExitButton from "@/app/components/ExitButton";
import GameContainer from "./GameContainer";
import ProgressDashboard from "@/app/components/ProgressDashboard";
import WelcomeAvatar, { triggerAvatarLogout } from "@/app/components/WelcomeAvatar";
import { Child } from "./page";

interface Props {
    child: Child;
    childId: number;
}
export default function ChildPageClient({ child, childId }: Props) {
    const [activeView, setActiveView] = useState<"game" | "stats">("game");

    // Called by WelcomeAvatar AFTER the goodbye sound finishes
    const handleLogoutConfirmed = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem('childLogin');
            }
            window.location.href = '/login';
        } catch (err) {
            console.error('Logout error:', err);
            window.location.href = '/login';
        }
    };

    // Called when child clicks "Izađi" — shows avatar goodbye popup first
    const handleLogoutClick = () => {
        triggerAvatarLogout();
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] selection:bg-purple-100 font-sans">

            {/* Welcome Avatar — top-right corner + goodbye modal */}
            <WelcomeAvatar
                childName={child.first_name}
                onLogoutConfirmed={handleLogoutConfirmed}
            />

            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white text-base sm:text-xl font-bold shadow-lg shadow-purple-200 uppercase">
                            {child.first_name?.trim()?.charAt(0)}{child.last_name?.trim()?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h1 className="text-sm sm:text-xl font-bold text-gray-900 leading-tight truncate max-w-[100px] sm:max-w-none">
                                    {child.first_name}
                                </h1>
                                {child.streak > 0 && (
                                    <div className="flex items-center gap-0.5 sm:gap-1 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100 shrink-0">
                                        <span className="text-xs sm:text-sm">🔥</span>
                                        <span className="text-[10px] sm:text-xs font-black text-orange-600">{child.streak}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Profil</p>
                                <span className="text-gray-300">•</span>
                                <span className="text-[8px] sm:text-[10px] text-purple-400 font-black uppercase tracking-widest leading-none">
                                    {child.experience_points || 0} poena
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-6">
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
                        {/* Logout button — triggers avatar goodbye popup */}
                        <button
                            onClick={handleLogoutClick}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all shadow-lg shadow-rose-100 active:scale-95 shrink-0"
                        >
                            Izađi 👋
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
                {/* Mobile Navigation */}
                <div className="md:hidden flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 mb-6">
                    <button
                        onClick={() => setActiveView("game")}
                        className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${activeView === "game"
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-100"
                            : "text-slate-500 hover:bg-slate-50"
                            }`}
                    >
                        🎮 Igraonica
                    </button>
                    <button
                        onClick={() => setActiveView("stats")}
                        className={`flex-1 py-3 rounded-lg font-black text-xs transition-all ${activeView === "stats"
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-100"
                            : "text-slate-500 hover:bg-slate-50"
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