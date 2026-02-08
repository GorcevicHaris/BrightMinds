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
    coloring: {
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
    const [activeTab, setActiveTab] = useState<"all" | "shapes" | "memory" | "coloring">("all");

    useEffect(() => {
        fetchProgress();
    }, [childId]);

    const fetchProgress = async () => {
        try {
            const res = await fetch(`/api/children/${childId}/progress`);
            if (res.ok) {
                const json = await res.json();
                if (json && json.total && typeof json.total.total_games !== 'undefined') {
                    setData(json);
                }
            }
        } catch (error) {
            console.error("Error fetching progress:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="h-12 w-12 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium animate-pulse">Analiziramo podatke...</p>
            </div>
        );
    }

    if (!data || !data.total || data.total.total_games === 0) {
        return (
            <div className="bg-white rounded-[3rem] p-16 text-center border border-gray-100 shadow-sm">
                <div className="text-8xl mb-8">🎮</div>
                <h3 className="text-3xl font-black text-gray-900 mb-4">Još uvek učimo!</h3>
                <p className="text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
                    {childName} još uvek nije završio/la nijednu igru. Čim počne sa igrom, ovde će se pojaviti prva statistika.
                </p>
            </div>
        );
    }

    const currentData = activeTab === "shapes" ? data.shapes : activeTab === "memory" ? data.memory : activeTab === "coloring" ? data.coloring : null;

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
        <div className="space-y-10">
            {/* Professional Navigation Tabs */}
            <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm inline-flex w-full overflow-x-auto no-scrollbar">
                {[
                    { id: "all", label: "Ukupno", icon: "📊", color: "text-blue-600 bg-blue-50" },
                    { id: "shapes", label: "Oblici", icon: "🔷", color: "text-emerald-600 bg-emerald-50" },
                    { id: "memory", label: "Memorija", icon: "🧠", color: "text-purple-600 bg-purple-50" },
                    { id: "coloring", label: "Bojanka", icon: "🎨", color: "text-orange-600 bg-orange-50" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${activeTab === tab.id
                            ? `shadow-md shadow-purple-100 scale-[1.02] ${tab.id === 'all' ? 'bg-blue-600 text-white' : tab.id === 'shapes' ? 'bg-emerald-600 text-white' : tab.id === 'memory' ? 'bg-purple-600 text-white' : 'bg-orange-600 text-white'}`
                            : "text-gray-500 hover:bg-gray-50"
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Dashboard Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "all" ? (
                    <div className="space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: "Ukupno igara", value: data.total.total_games, icon: "🎯", color: "from-blue-500 to-indigo-600" },
                                { title: "Minuta vežbe", value: data.total.total_minutes, icon: "⏱️", color: "from-purple-500 to-pink-600" },
                                { title: "Najbolji skor", value: Math.max(data.shapes.stats.best_score, data.memory.stats.best_score, data.coloring.stats.best_score), icon: "🏆", color: "from-orange-400 to-amber-600" },
                                { title: "Bravo poeni", value: data.total.excellent_count + data.total.successful_count, icon: "⭐", color: "from-emerald-400 to-teal-600" },
                            ].map((card, i) => (
                                <div key={i} className={`bg-gradient-to-br ${card.color} rounded-[2rem] p-8 text-white shadow-xl hover:scale-[1.02] transition-transform duration-300`}>
                                    <div className="text-4xl mb-4">{card.icon}</div>
                                    <div className="text-3xl font-black mb-1">{card.value}</div>
                                    <div className="text-white/80 text-xs font-bold uppercase tracking-wider">{card.title}</div>
                                </div>
                            ))}
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm">
                                <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                                    <span className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 text-base">📈</span>
                                    Nivo uspešnosti
                                </h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    {pieData.map((entry, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                            <span className="text-xs font-bold text-gray-600">{entry.name}: {entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm">
                                <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                                    <span className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 text-base">🎯</span>
                                    Pregled po igrama
                                </h3>
                                <div className="space-y-6">
                                    {[
                                        { title: "Složi oblik", stats: data.shapes.stats, icon: "🔷", color: "emerald" },
                                        { title: "Spoji parove", stats: data.memory.stats, icon: "🧠", color: "purple" },
                                        { title: "Bojanka", stats: data.coloring.stats, icon: "🎨", color: "orange" },
                                    ].map((game, i) => (
                                        <div key={i} className={`p-5 rounded-2xl bg-${game.color}-50/50 border border-${game.color}-100 flex items-center justify-between`}>
                                            <div className="flex items-center gap-4">
                                                <div className="text-3xl">{game.icon}</div>
                                                <div>
                                                    <div className="text-sm font-black text-gray-900">{game.title}</div>
                                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{game.stats.total_games} Odrađeno</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-xl font-black text-${game.color}-600`}>{Math.round(game.stats.avg_score || 0)}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Prosek</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent History */}
                        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-sm">
                            <h3 className="text-xl font-black text-gray-900 mb-8">Poslednje aktivnosti 📜</h3>
                            <div className="space-y-4">
                                {data.allGames.slice(0, 10).map((game) => (
                                    <div key={game.id} className="group p-5 rounded-2xl border border-gray-50 hover:bg-gray-50 hover:border-purple-100 transition-all duration-300">
                                        <div className="flex items-center justify-between flex-wrap gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 transition-transform">
                                                    {game.activity_title === "Složi oblik" ? "🔷" : game.activity_title === "Spoji parove" ? "🧠" : "🎨"}
                                                </div>
                                                <div>
                                                    <div className="text-base font-black text-gray-900">{game.activity_title}</div>
                                                    <div className="text-xs font-bold text-gray-400">
                                                        {new Date(game.completed_at).toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-gray-900">{game.score} poena</div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{game.duration_minutes} min treninga</div>
                                                </div>
                                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${game.success_level === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                                                    game.success_level === 'successful' ? 'bg-blue-100 text-blue-700' :
                                                        game.success_level === 'partial' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-red-100 text-red-700'
                                                    }`}>
                                                    {game.success_level === 'excellent' ? 'Sjajno' :
                                                        game.success_level === 'successful' ? 'Uspešno' :
                                                            game.success_level === 'partial' ? 'Delimično' : 'Teškoće'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    currentData && (
                        <div className="space-y-8">
                            {/* Individual Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {[
                                    { title: "Ukupno igara", value: currentData.stats.total_games, icon: "🎮", color: "bg-blue-600" },
                                    { title: "Prosečan skor", value: Math.round(currentData.stats.avg_score || 0), icon: "🏆", color: "bg-emerald-600" },
                                    { title: "Najbolji skor", value: currentData.stats.best_score || 0, icon: "⭐", color: "bg-orange-600" },
                                    { title: "Ukupno minuta", value: currentData.stats.total_minutes || 0, icon: "⏱️", color: "bg-purple-600" },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center">
                                        <div className={`h-12 w-12 ${stat.color} rounded-xl text-white flex items-center justify-center text-xl mb-4 shadow-lg shadow-${stat.color.split('-')[1]}-100`}>
                                            {stat.icon}
                                        </div>
                                        <div className="text-2xl font-black text-gray-900 mb-1">{stat.value}</div>
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.title}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                                    <h3 className="text-xl font-black text-gray-900 mb-8">Napredak kroz vreme 📅</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={currentData.progress.slice().reverse()}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                                                tickFormatter={(v) => new Date(v).toLocaleDateString('sr', { day: 'numeric', month: 'short' })}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Line type="monotone" dataKey="avg_score" stroke="#8B5CF6" strokeWidth={4} dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2, stroke: '#fff' }} name="Prosek" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                                    <h3 className="text-xl font-black text-gray-900 mb-8">Uspeh po nivoima 🎯</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={currentData.levelStats}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                            <XAxis dataKey="level" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
                                            <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="avg_score" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Prosečan skor" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}