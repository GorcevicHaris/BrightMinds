"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface GameStats {
    total_games: number;
    avg_score: number;
    best_score: number;
    total_minutes: number;
    excellent_count: number;
    successful_count: number;
    partial_count: number;
    struggled_count: number;
}

interface ProgressData {
    total: {
        total_games: number;
        total_minutes: number;
        excellent_count: number;
        successful_count: number;
        partial_count: number;
        struggled_count: number;
    };
    allGames: Array<{
        id: number;
        completed_at: string;
        success_level: string;
        mood_before: string | null;
        mood_after: string | null;
        duration_minutes: number;
        notes: string;
        activity_title: string;
        score: number;
    }>;
    shapes: {
        stats: GameStats;
        recentGames: any[];
        progress: any[];
        levelStats: any[];
    };
    memory: {
        stats: GameStats;
        recentGames: any[];
        progress: any[];
        levelStats: any[];
    };
}

interface Props {
    childId: number;
    childName: string;
}

const MOOD_EMOJI = {
    very_upset: "😢",
    upset: "😕",
    neutral: "😐",
    happy: "😊",
    very_happy: "😄",
};

const SUCCESS_COLORS = {
    excellent: "#10B981",
    successful: "#3B82F6",
    partial: "#F59E0B",
    struggled: "#EF4444",
};

export default function ProgressDashboard({ childId, childName }: Props) {
    const [data, setData] = useState<ProgressData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"all" | "shapes" | "memory">("all");

    useEffect(() => {
        fetchProgress();
    }, [childId]);

    const fetchProgress = async () => {
        try {
            const res = await fetch(`/api/children/${childId}/progress`);
            if (res.ok) {
                const json = await res.json();
                console.log("📊 Podaci iz API-ja:", json);
                
                // Proveri da li total postoji i ima total_games
                if (json && json.total && typeof json.total.total_games !== 'undefined') {
                    setData(json);
                } else {
                    console.error("❌ Nevalidni podaci:", json);
                    // Postavi default prazne podatke
                    setData({
                        total: {
                            total_games: 0,
                            total_minutes: 0,
                            excellent_count: 0,
                            successful_count: 0,
                            partial_count: 0,
                            struggled_count: 0,
                        },
                        allGames: [],
                        shapes: {
                            stats: {
                                total_games: 0,
                                avg_score: 0,
                                best_score: 0,
                                total_minutes: 0,
                                excellent_count: 0,
                                successful_count: 0,
                                partial_count: 0,
                                struggled_count: 0,
                            },
                            recentGames: [],
                            progress: [],
                            levelStats: [],
                        },
                        memory: {
                            stats: {
                                total_games: 0,
                                avg_score: 0,
                                best_score: 0,
                                total_minutes: 0,
                                excellent_count: 0,
                                successful_count: 0,
                                partial_count: 0,
                                struggled_count: 0,
                            },
                            recentGames: [],
                            progress: [],
                            levelStats: [],
                        }
                    });
                }
            } else {
                console.error("❌ API greška:", res.status, res.statusText);
            }
        } catch (error) {
            console.error("💥 Error fetching progress:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-6xl mb-4 animate-spin">📊</div>
                    <p className="text-xl text-gray-600">Učitavam statistiku...</p>
                </div>
            </div>
        );
    }

    if (!data || !data.total || data.total.total_games === 0) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-12 text-center shadow-xl">
                <div className="text-8xl mb-6">🎮</div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    Još nema odigranih igara
                </h3>
                <p className="text-xl text-gray-600">
                    {childName} još nije igrao/la nijednu igru. Klikni na "Igraj" da počneš!
                </p>
            </div>
        );
    }

    // Pripremi podatke za prikaz na osnovu aktivnog tab-a
    const currentData = activeTab === "shapes" ? data.shapes : activeTab === "memory" ? data.memory : null;

    const pieData = currentData ? [
        { name: "Odlično", value: currentData.stats.excellent_count, color: SUCCESS_COLORS.excellent },
        { name: "Uspešno", value: currentData.stats.successful_count, color: SUCCESS_COLORS.successful },
        { name: "Delimično", value: currentData.stats.partial_count, color: SUCCESS_COLORS.partial },
        { name: "Teškoće", value: currentData.stats.struggled_count, color: SUCCESS_COLORS.struggled },
    ].filter(item => item.value > 0) : [
        { name: "Odlično", value: data.total.excellent_count, color: SUCCESS_COLORS.excellent },
        { name: "Uspešno", value: data.total.successful_count, color: SUCCESS_COLORS.successful },
        { name: "Delimično", value: data.total.partial_count, color: SUCCESS_COLORS.partial },
        { name: "Teškoće", value: data.total.struggled_count, color: SUCCESS_COLORS.struggled },
    ].filter(item => item.value > 0);

    return (
        <div className="space-y-6">
            {/* Tab selector */}
            <div className="bg-white rounded-3xl shadow-xl p-2 flex gap-2">
                <button
                    onClick={() => setActiveTab("all")}
                    className={`flex-1 px-4 py-3 rounded-2xl font-bold text-base md:text-lg transition-all ${
                        activeTab === "all"
                            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                    📊 Sve igrice
                </button>
                <button
                    onClick={() => setActiveTab("shapes")}
                    className={`flex-1 px-4 py-3 rounded-2xl font-bold text-base md:text-lg transition-all ${
                        activeTab === "shapes"
                            ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                    🔷 Složi oblik
                </button>
                <button
                    onClick={() => setActiveTab("memory")}
                    className={`flex-1 px-4 py-3 rounded-2xl font-bold text-base md:text-lg transition-all ${
                        activeTab === "memory"
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                    🧠 Spoji parove
                </button>
            </div>

            {/* Sve igrice - ukupan pregled */}
            {activeTab === "all" && (
                <div className="space-y-6">
                    {/* Stats cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">🎮</div>
                            <div className="text-4xl font-bold mb-2">{data.total.total_games}</div>
                            <div className="text-blue-100 text-lg">Ukupno igara</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">🔷</div>
                            <div className="text-4xl font-bold mb-2">{data.shapes.stats.total_games}</div>
                            <div className="text-green-100 text-lg">Složi oblik</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">🧠</div>
                            <div className="text-4xl font-bold mb-2">{data.memory.stats.total_games}</div>
                            <div className="text-purple-100 text-lg">Spoji parove</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">⏱️</div>
                            <div className="text-4xl font-bold mb-2">{data.total.total_minutes}</div>
                            <div className="text-orange-100 text-lg">Minuta vežbanja</div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-3xl p-6 shadow-xl">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">📈 Distribucija uspeha</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.name}: ${entry.value}`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-xl">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">🎯 Uporedni pregled</h3>
                            <div className="space-y-4">
                                <div className="bg-green-50 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-gray-700">🔷 Složi oblik</span>
                                        <span className="text-2xl font-bold text-green-600">
                                            {Math.round(data.shapes.stats.avg_score || 0)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Najbolji: {data.shapes.stats.best_score || 0} | {data.shapes.stats.total_games} igara
                                    </div>
                                </div>
                                <div className="bg-purple-50 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-gray-700">🧠 Spoji parove</span>
                                        <span className="text-2xl font-bold text-purple-600">
                                            {Math.round(data.memory.stats.avg_score || 0)}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Najbolji: {data.memory.stats.best_score || 0} | {data.memory.stats.total_games} igara
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Istorija svih igara */}
                    <div className="bg-white rounded-3xl p-6 shadow-xl">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">📜 Istorija igara</h3>
                        <div className="space-y-4">
                            {data.allGames.map((game) => (
                                <div
                                    key={game.id}
                                    className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 md:p-6 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="text-4xl">
                                                {game.activity_title === "Složi oblik" ? "🔷" : "🧠"}
                                            </div>
                                            <div>
                                                <div className="text-lg md:text-xl font-bold text-gray-800">
                                                    {game.activity_title} • {game.score} poena
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    {new Date(game.completed_at).toLocaleString('sr-RS', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 flex-wrap">
                                            {game.mood_before && game.mood_after && (
                                                <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                                                    <span className="text-2xl">{MOOD_EMOJI[game.mood_before as keyof typeof MOOD_EMOJI]}</span>
                                                    <span className="text-gray-400">→</span>
                                                    <span className="text-2xl">{MOOD_EMOJI[game.mood_after as keyof typeof MOOD_EMOJI]}</span>
                                                </div>
                                            )}
                                            <span
                                                className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                    game.success_level === 'excellent' ? 'bg-green-100 text-green-700' :
                                                    game.success_level === 'successful' ? 'bg-blue-100 text-blue-700' :
                                                    game.success_level === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}
                                            >
                                                {game.success_level === 'excellent' && '⭐ Odlično'}
                                                {game.success_level === 'successful' && '👍 Uspešno'}
                                                {game.success_level === 'partial' && '👌 Delimično'}
                                                {game.success_level === 'struggled' && '💪 Teškoće'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Individualne igrice - detaljnije statistike */}
            {(activeTab === "shapes" || activeTab === "memory") && currentData && (
                <div className="space-y-6">
                    {/* Stats cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">🎮</div>
                            <div className="text-4xl font-bold mb-2">{currentData.stats.total_games}</div>
                            <div className="text-blue-100 text-lg">Odigranih igara</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">🏆</div>
                            <div className="text-4xl font-bold mb-2">{Math.round(currentData.stats.avg_score || 0)}</div>
                            <div className="text-green-100 text-lg">Prosečan rezultat</div>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">⭐</div>
                            <div className="text-4xl font-bold mb-2">{currentData.stats.best_score || 0}</div>
                            <div className="text-yellow-100 text-lg">Najbolji rezultat</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">⏱️</div>
                            <div className="text-4xl font-bold mb-2">{currentData.stats.total_minutes || 0}</div>
                            <div className="text-purple-100 text-lg">Minuta vežbanja</div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-3xl p-6 shadow-xl">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">📈 Distribucija uspeha</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry: any) => `${entry.name}: ${entry.value}`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
{/*  */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">📅 Napredak kroz vreme</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={currentData.progress.slice().reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value: any) => new Date(value).toLocaleDateString('sr-RS', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis />
                                    <Tooltip labelFormatter={(value: any) => new Date(value).toLocaleDateString('sr-RS')} />
                                    <Legend />
                                    <Line type="monotone" dataKey="avg_score" stroke="#8B5CF6" strokeWidth={3} name="Prosek" />
                                    <Line type="monotone" dataKey="max_score" stroke="#10B981" strokeWidth={3} name="Najbolji" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Nivoi */}
                    <div className="bg-white rounded-3xl p-6 shadow-xl">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">🎯 Statistike po nivoima</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={currentData.levelStats}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="level" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="avg_score" fill={activeTab === "shapes" ? "#10B981" : "#8B5CF6"} name="Prosečan rezultat" />
                                <Bar dataKey="best_score" fill={activeTab === "shapes" ? "#059669" : "#7C3AED"} name="Najbolji rezultat" />
                            </BarChart>
                        </ResponsiveContainer>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                            {currentData.levelStats.map((level) => (
                                <div key={level.level} className={`${
                                    activeTab === "shapes" 
                                        ? "bg-gradient-to-br from-green-100 to-emerald-100" 
                                        : "bg-gradient-to-br from-purple-100 to-pink-100"
                                } rounded-2xl p-4 text-center`}>
                                    <div className={`text-2xl md:text-3xl font-bold mb-2 ${
                                        activeTab === "shapes" ? "text-green-700" : "text-purple-700"
                                    }`}>
                                        Nivo {level.level}
                                    </div>
                                    <div className="text-gray-600 text-xs md:text-sm mb-1">
                                        {level.games_count} {level.games_count === 1 ? 'igra' : 'igara'}
                                    </div>
                                    <div className="text-xl md:text-2xl font-bold text-green-600">
                                        {Math.round(level.avg_score)}
                                    </div>
                                    <div className="text-xs text-gray-500">Prosek</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}