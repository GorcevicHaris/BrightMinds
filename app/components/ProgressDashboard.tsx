"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface ProgressData {
    stats: {
        total_games: number;
        avg_score: number;
        best_score: number;
        total_minutes: number;
        excellent_count: number;
        successful_count: number;
        partial_count: number;
        struggled_count: number;
    };
    recentGames: Array<{
        id: number;
        completed_at: string;
        success_level: string;
        mood_before: string | null;
        mood_after: string | null;
        duration_minutes: number;
        notes: string;
        score: number;
    }>;
    progress: Array<{
        date: string;
        games_count: number;
        avg_score: number;
        max_score: number;
    }>;
    levelStats: Array<{
        level: string;
        games_count: number;
        avg_score: number;
        best_score: number;
    }>;
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
    const [activeTab, setActiveTab] = useState<"overview" | "history" | "levels">("overview");

    useEffect(() => {
        fetchProgress();
    }, [childId]);

    const fetchProgress = async () => {
        try {
            const res = await fetch(`/api/children/${childId}/progress`);
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Error fetching progress:", error);
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

    if (!data || data.stats.total_games === 0) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-12 text-center shadow-xl">
                <div className="text-8xl mb-6">🎮</div>
                <h3 className="text-3xl font-bold text-gray-800 mb-4">
                    Još nema odigranih igara
                </h3>
                <p className="text-xl text-gray-600">
                    {childName} još nije igrao/la nijednu igru. Klikni na dugme "Igraj" da počneš!
                </p>
            </div>
        );
    }

    const pieData = [
        { name: "Odlično", value: data.stats.excellent_count, color: SUCCESS_COLORS.excellent },
        { name: "Uspešno", value: data.stats.successful_count, color: SUCCESS_COLORS.successful },
        { name: "Delimično", value: data.stats.partial_count, color: SUCCESS_COLORS.partial },
        { name: "Teškoće", value: data.stats.struggled_count, color: SUCCESS_COLORS.struggled },
    ].filter(item => item.value > 0);

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="bg-white rounded-3xl shadow-xl p-2 flex gap-2">
                {[
                    { id: "overview", label: "📊 Pregled", icon: "📊" },
                    { id: "history", label: "📅 Istorija", icon: "📅" },
                    { id: "levels", label: "🎯 Po nivoima", icon: "🎯" },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 px-6 py-4 rounded-2xl font-bold text-lg transition-all ${activeTab === tab.id
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">🎮</div>
                            <div className="text-4xl font-bold mb-2">{data.stats.total_games}</div>
                            <div className="text-blue-100 text-lg">Odigranih igara</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">🏆</div>
                            <div className="text-4xl font-bold mb-2">{Math.round(data.stats.avg_score)}</div>
                            <div className="text-green-100 text-lg">Prosečan rezultat</div>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">⭐</div>
                            <div className="text-4xl font-bold mb-2">{data.stats.best_score}</div>
                            <div className="text-yellow-100 text-lg">Najbolji rezultat</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-xl">
                            <div className="text-5xl mb-3">⏱️</div>
                            <div className="text-4xl font-bold mb-2">{data.stats.total_minutes}</div>
                            <div className="text-purple-100 text-lg">Minuta vežbanja</div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Success Distribution */}
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

                        {/* Progress Over Time */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">📅 Napredak kroz vreme</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={data.progress.slice().reverse()}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(value: any) => new Date(value).toLocaleDateString('sr-RS', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis />
                                    <Tooltip
                                        labelFormatter={(value: any) => new Date(value).toLocaleDateString('sr-RS')}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="avg_score" stroke="#8B5CF6" strokeWidth={3} name="Prosek" />
                                    <Line type="monotone" dataKey="max_score" stroke="#10B981" strokeWidth={3} name="Najbolji" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* History Tab */}
            {activeTab === "history" && (
                <div className="bg-white rounded-3xl p-6 shadow-xl">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">📜 Istorija igara</h3>
                    <div className="space-y-4">
                        {data.recentGames.map((game) => (
                            <div
                                key={game.id}
                                className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${game.success_level === 'excellent' ? 'bg-green-100' :
                                            game.success_level === 'successful' ? 'bg-blue-100' :
                                                game.success_level === 'partial' ? 'bg-yellow-100' : 'bg-red-100'
                                            }`}>
                                            {game.success_level === 'excellent' ? '⭐' :
                                                game.success_level === 'successful' ? '👍' :
                                                    game.success_level === 'partial' ? '👌' : '💪'}
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-gray-800">
                                                {game.score} poena
                                            </div>
                                            <div className="text-gray-600">
                                                {new Date(game.completed_at).toLocaleString('sr-RS', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {game.mood_before && game.mood_after && (
                                            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2">
                                                <span className="text-3xl">{MOOD_EMOJI[game.mood_before as keyof typeof MOOD_EMOJI]}</span>
                                                <span className="text-gray-400">→</span>
                                                <span className="text-3xl">{MOOD_EMOJI[game.mood_after as keyof typeof MOOD_EMOJI]}</span>
                                            </div>
                                        )}
                                        <div className="text-gray-500">
                                            ⏱️ {game.duration_minutes} min
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Levels Tab */}
            {activeTab === "levels" && (
                <div className="bg-white rounded-3xl p-6 shadow-xl">
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">🎯 Statistike po nivoima</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={data.levelStats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="level" label={{ value: 'Nivo', position: 'insideBottom', offset: -5 }} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="avg_score" fill="#8B5CF6" name="Prosečan rezultat" />
                            <Bar dataKey="best_score" fill="#10B981" name="Najbolji rezultat" />
                        </BarChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
                        {data.levelStats.map((level) => (
                            <div key={level.level} className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-4 text-center">
                                <div className="text-3xl font-bold text-purple-700 mb-2">
                                    Nivo {level.level}
                                </div>
                                <div className="text-gray-600 text-sm mb-1">
                                    {level.games_count} {level.games_count === 1 ? 'igra' : 'igara'}
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                    {Math.round(level.avg_score)}
                                </div>
                                <div className="text-xs text-gray-500">
                                    Prosek
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}