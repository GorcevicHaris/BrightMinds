// app/dashboard/child/[id]/ChildPageClient.tsx
"use client";

import { useState, useEffect } from "react";
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
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const handleLogoutConfirmed = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            if (typeof window !== "undefined") {
                sessionStorage.removeItem("childLogin");
            }
            window.location.href = "/login";
        } catch {
            window.location.href = "/login";
        }
    };

    const handleLogoutClick = () => {
        setShowExitConfirm(true);
    };

    const handleConfirmExit = () => {
        setShowExitConfirm(false);
        triggerAvatarLogout();
    };

    // Prevent body scroll when confirm modal is open
    useEffect(() => {
        if (showExitConfirm) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [showExitConfirm]);

    const firstName = child.first_name || "Druže";
    const initials = `${child.first_name?.charAt(0) || ""}${child.last_name?.charAt(0) || ""}`;

    return (
        <div className="min-h-screen font-sans" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #fdf4ff 50%, #f0fdf4 100%)" }}>

            {/* ── Welcome Avatar ─────────────────────────────────────── */}
            <WelcomeAvatar childName={firstName} onLogoutConfirmed={handleLogoutConfirmed} />

            {/* ── TOP HEADER ────────────────────────────────────────────
                  Keep it VERY simple for kids — just name + exit + nav  */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b-2 border-purple-100/60 shadow-sm">
                <div className="max-w-none mx-auto px-6 sm:px-12 h-16 sm:h-20 flex items-center justify-between gap-3">

                    {/* Left: Avatar + Name */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-sm sm:text-base font-black shadow-lg shadow-violet-200 uppercase shrink-0">
                                {initials}
                            </div>
                            {/* Online dot */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-400 rounded-full border-2 border-white shadow-sm" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-base sm:text-xl font-black text-slate-900 leading-none truncate">
                                    {firstName}
                                </span>
                                {child.streak > 0 && (
                                    <span className="inline-flex items-center gap-0.5 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black border border-orange-200 shrink-0">
                                        🔥 {child.streak}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] sm:text-xs text-purple-400 font-black uppercase tracking-wider leading-none mt-0.5">
                                ⭐ {child.experience_points || 0} poena
                            </p>
                        </div>
                    </div>

                    {/* Right: Nav + Exit */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Navigation pills */}
                        <div className="flex items-center bg-slate-100 rounded-xl sm:rounded-2xl p-1 gap-1">
                            <button
                                onClick={() => setActiveView("game")}
                                aria-label="Igre"
                                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all duration-300 ${activeView === "game"
                                    ? "bg-white text-violet-600 shadow-md shadow-violet-100"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                <span className="text-base sm:text-lg">🎮</span>
                                <span className="hidden sm:inline">Igre</span>
                            </button>
                            <button
                                onClick={() => setActiveView("stats")}
                                aria-label="Napredak"
                                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-xs sm:text-sm transition-all duration-300 ${activeView === "stats"
                                    ? "bg-white text-violet-600 shadow-md shadow-violet-100"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                <span className="text-base sm:text-lg">⭐</span>
                                <span className="hidden sm:inline">Napredak</span>
                            </button>
                        </div>

                        {/* Exit button — big, friendly */}
                        <button
                            onClick={handleLogoutClick}
                            aria-label="Izađi"
                            className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg shadow-rose-200 border-b-4 border-rose-700"
                        >
                            <span className="text-base">👋</span>
                            <span className="hidden sm:inline">Izađi</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
            <main className="max-w-none mx-auto px-4 sm:px-8 md:px-12 py-4 sm:py-10">

                {activeView === "game" ? (
                    /* ── GAME VIEW ─────────────────────────────────────────── */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">


                        {/* Game container */}
                        <GameContainer childId={childId} childName={firstName} />
                    </div>

                ) : (
                    /* ── STATS VIEW ────────────────────────────────────────── */
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-5 sm:space-y-8">

                        {/* Stats header banner */}
                        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-400 p-5 sm:p-8 shadow-2xl shadow-amber-200">
                            <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-36 sm:h-36 bg-white/10 rounded-full -ml-8 -mb-8 blur-xl" />

                            <div className="relative z-10 flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-white/70 text-xs sm:text-sm font-bold uppercase tracking-widest mb-1">Tvoji rezultati ✨</p>
                                    <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-1 sm:mb-2">
                                        Bravo, {firstName}! 🏆
                                    </h1>
                                    <p className="text-white/80 text-sm sm:text-base font-semibold">
                                        Pogledaj koliko si naučio/la
                                    </p>
                                </div>
                                <div className="hidden sm:block text-6xl sm:text-7xl animate-bounce shrink-0" style={{ animationDuration: "2.5s" }}>
                                    🏆
                                </div>
                            </div>

                            {/* Quick stats pills */}
                            <div className="relative z-10 flex flex-wrap gap-2 sm:gap-3 mt-4 sm:mt-6">
                                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full">
                                    <span className="text-sm">⭐</span>
                                    <span className="text-white font-black text-xs sm:text-sm">{child.experience_points || 0} poena</span>
                                </div>
                                {child.streak > 0 && (
                                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 px-3 py-1.5 rounded-full">
                                        <span className="text-sm">🔥</span>
                                        <span className="text-white font-black text-xs sm:text-sm">{child.streak} dana zaredom</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Progress component */}
                        <ProgressDashboard childId={childId} childName={firstName} />
                    </div>
                )}
            </main>

            {/* ── BOTTOM NAV BAR (mobile only) ──────────────────────────
                Large tap targets, very clear icons — critical for autism UX */}
            <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t-2 border-slate-100 shadow-2xl">
                <div className="flex items-stretch max-w-md mx-auto">
                    <button
                        onClick={() => setActiveView("game")}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 sm:py-4 transition-all duration-200 ${activeView === "game"
                            ? "text-violet-600"
                            : "text-slate-400"
                            }`}
                    >
                        <span className={`text-2xl sm:text-3xl transition-transform duration-200 ${activeView === "game" ? "scale-110" : "scale-100"}`}>🎮</span>
                        <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${activeView === "game" ? "text-violet-600" : "text-slate-400"}`}>Igre</span>
                        {activeView === "game" && (
                            <div className="absolute bottom-0 h-1 w-12 bg-violet-500 rounded-t-full" />
                        )}
                    </button>

                    <button
                        onClick={() => setActiveView("stats")}
                        className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 sm:py-4 transition-all duration-200 ${activeView === "stats"
                            ? "text-amber-500"
                            : "text-slate-400"
                            }`}
                    >
                        <span className={`text-2xl sm:text-3xl transition-transform duration-200 ${activeView === "stats" ? "scale-110" : "scale-100"}`}>🏆</span>
                        <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${activeView === "stats" ? "text-amber-500" : "text-slate-400"}`}>Napredak</span>
                        {activeView === "stats" && (
                            <div className="absolute bottom-0 h-1 w-12 bg-amber-500 rounded-t-full" />
                        )}
                    </button>

                    <button
                        onClick={handleLogoutClick}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-3 sm:py-4 text-rose-400 active:scale-95 transition-all duration-200"
                    >
                        <span className="text-2xl sm:text-3xl">👋</span>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-400">Izađi</span>
                    </button>
                </div>
            </div>

            {/* Bottom padding for mobile nav */}
            <div className="h-16 sm:h-20 md:h-6" />

            {/* ── EXIT CONFIRM MODAL ─────────────────────────────────────
                Very big, clear, friendly — no complex text for young kids */}
            {showExitConfirm && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    style={{ background: "rgba(15,10,40,0.75)", backdropFilter: "blur(12px)" }}
                    onClick={() => setShowExitConfirm(false)}
                >
                    <div
                        className="bg-white rounded-[2rem] sm:rounded-[3rem] p-7 sm:p-12 max-w-sm sm:max-w-md w-full text-center shadow-2xl border-4 border-violet-100 animate-in zoom-in-90 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Big friendly robot/avatar */}
                        <div className="text-7xl sm:text-9xl mb-4 sm:mb-6 animate-bounce" style={{ animationDuration: "1.5s" }}>👋</div>

                        <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mb-2 sm:mb-3 tracking-tight">
                            Igraš se još?
                        </h2>
                        <p className="text-slate-500 text-base sm:text-lg font-medium mb-6 sm:mb-10 leading-relaxed">
                            Da li zaista želiš da izađeš iz igre?
                        </p>

                        <div className="flex flex-col gap-3 sm:gap-4">
                            {/* Stay button — green, primary */}
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-2xl transition-all shadow-xl shadow-emerald-200 border-b-4 border-emerald-700 flex items-center justify-center gap-3"
                            >
                                <span className="text-2xl sm:text-3xl">🎮</span>
                                <span>Nastavi igru!</span>
                            </button>

                            {/* Exit button — red */}
                            <button
                                onClick={handleConfirmExit}
                                className="w-full bg-rose-100 hover:bg-rose-200 active:scale-95 text-rose-600 py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-black text-base sm:text-xl transition-all border-2 border-rose-200 flex items-center justify-center gap-3"
                            >
                                <span className="text-xl sm:text-2xl">👋</span>
                                <span>Da, izlazim</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}