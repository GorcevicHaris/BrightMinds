"use client";

import { useState, useEffect, useRef } from "react";
import { useGameEmitter } from "@/lib/useSocket";

// Pomocna funkcija za reprodukciju lokalnih MP3 zvukova iz /sounds/emotions/
function playSound(filename: string) {
    const audio = new Audio(`/sounds/emotions/${filename}`);
    audio.volume = 0.9;
    audio.play().catch(() => { /* fajl jos nije ubacen, nema greske */ });
    return audio;
}

interface GameProps {
    childId: number;
    level: number;
    onComplete: (
        score: number,
        duration: number,
        moodBefore?: string | null,
        moodAfter?: string | null
    ) => void;
    onClose?: () => void;
    autoStart?: boolean;
    isMonitor?: boolean;
    monitorState?: any;
}

// Kratka, jasna pitanja + emoji koji asocira na situaciju
// Nivo 1-2: srećno/tužno  |  3-4: ljuto  |  5-6: uplašeno  |  7-8: miks
const SCENARIOS = [
    { level: 1, text: "Dobio si poklon! 🎁\nKako se osećaš?", sceneEmoji: "🎁", correctEmotion: "happy", soundFile: "firstSent.mp3" },
    { level: 2, text: "Pao si i udario koleno. 🤕\nKako se osećaš?", sceneEmoji: "🤕", correctEmotion: "sad", soundFile: "secondSent.mp3" },
    { level: 3, text: "Drug ti uzeo igračku! 😤\nKako se osećaš?", sceneEmoji: "🧸", correctEmotion: "angry", soundFile: "thirdSent.mp3" },
    { level: 4, text: "Mama te pohvalila! ⭐\nKako se osećaš?", sceneEmoji: "⭐", correctEmotion: "happy", soundFile: "fourthSent.mp3" },
    { level: 5, text: "Veliki pas trči prema tebi! 🐕\nKako se osećaš?", sceneEmoji: "🐕", correctEmotion: "scared", soundFile: "fifthSent.mp3" },
    { level: 6, text: "Neko srušio tvoju kulu! 🧱\nKako se osećaš?", sceneEmoji: "🧱", correctEmotion: "angry", soundFile: "sixthSent.mp3" },
    { level: 7, text: "Izgubio si se u prodavnici. 🏪\nKako se osećaš?", sceneEmoji: "🏪", correctEmotion: "scared", soundFile: "seventSent.mp3" },
    { level: 8, text: "Drug želi da se igra s tobom! 🤝\nKako se osećaš?", sceneEmoji: "🤝", correctEmotion: "happy", soundFile: "eightSent.mp3" },
    { level: 9, text: "Grmi napolju! ⛈️\nKako se osećaš?", sceneEmoji: "⛈️", correctEmotion: "scared", soundFile: "ninthSent.mp3" },
    { level: 10, text: "Pokvarila se tvoja omiljena igračka. 🚂\nKako se osećaš?", sceneEmoji: "💔", correctEmotion: "sad", soundFile: "tenthSent.mp3" },
    { level: 11, text: "Neko te gurnuo, a nije se izvinio! 😡\nKako se osećaš?", sceneEmoji: "🧍", correctEmotion: "angry", soundFile: "eleventhSent.mp3" },
    { level: 12, text: "Slaviš rođendan! 🎂\nKako se osećaš?", sceneEmoji: "🎂", correctEmotion: "happy", soundFile: "twelfthSent.mp3" },
    { level: 13, text: "Ugasilo se svetlo u sobi. 💡\nKako se osećaš?", sceneEmoji: "💡", correctEmotion: "scared", soundFile: "thirteenthSent.mp3" },
    { level: 14, text: "Drug ti nije dao čokoladu! 🍫\nKako se osećaš?", sceneEmoji: "🍫", correctEmotion: "angry", soundFile: "fourteenthSent.mp3" },
    { level: 15, text: "Tvoj crtež se iscepao. 📃\nKako se osećaš?", sceneEmoji: "📃", correctEmotion: "sad", soundFile: "fifteenthSent.mp3" },
];

const EMOTIONS = [
    {
        id: "happy",
        emoji: "😀",
        label: "Srećno",
        color: "from-yellow-300 to-amber-400",
        shadow: "shadow-yellow-200",
        bg: "bg-yellow-50",
        border: "border-yellow-300",
    },
    {
        id: "sad",
        emoji: "😢",
        label: "Tužno",
        color: "from-blue-300 to-indigo-400",
        shadow: "shadow-blue-200",
        bg: "bg-blue-50",
        border: "border-blue-300",
    },
    {
        id: "angry",
        emoji: "😡",
        label: "Ljuto",
        color: "from-red-300 to-rose-400",
        shadow: "shadow-red-200",
        bg: "bg-red-50",
        border: "border-red-300",
    },
    {
        id: "scared",
        emoji: "😨",
        label: "Uplašeno",
        color: "from-purple-300 to-violet-400",
        shadow: "shadow-purple-200",
        bg: "bg-purple-50",
        border: "border-purple-300",
    },
];

export default function EmotionsGame({ childId, level, onComplete, onClose, autoStart, isMonitor, monitorState }: GameProps) {
    const scenario = SCENARIOS.find((s) => s.level === level) || SCENARIOS[0];

    const [isPlaying, setIsPlaying] = useState<boolean>(isMonitor ? true : false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [moves, setMoves] = useState<number>(monitorState?.moves || 0);
    const [incorrectCount, setIncorrectCount] = useState<number>(
        monitorState?.incorrectCount || 0
    );
    const [hasWon, setHasWon] = useState<boolean>(monitorState?.hasWon || false);
    const [showMoodBefore, setShowMoodBefore] = useState(!isMonitor && !autoStart);
    const [showMoodAfter, setShowMoodAfter] = useState(false);
    const [moodBefore, setMoodBefore] = useState<string | null>(null);
    const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);

    const { emitGameStart, emitGameProgress, emitGameComplete } =
        useGameEmitter();
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    const stopCurrentSound = () => {
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
            currentAudioRef.current = null;
        }
    };

    // Reset kada se nivo promeni
    useEffect(() => {
        setIsPlaying(isMonitor ? true : false);
        setStartTime(null);
        setMoves(0);
        setIncorrectCount(0);
        setHasWon(false);
        setSelectedEmotion(null);
        setIsLocked(false);
    }, [level, isMonitor]);

    const handleMoodBeforeSelect = (mood: string) => {
        setMoodBefore(mood);
        setShowMoodBefore(false);
        startGame();
    };

    const handleMoodAfterSelect = (mood: string) => {
        setShowMoodAfter(false);
        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        onComplete(1000, duration, moodBefore, mood);
    };

    // Auto-start logic
    useEffect(() => {
        if (autoStart && !isMonitor && (showMoodBefore || !isPlaying) && moves === 0 && !hasWon) {
            handleMoodBeforeSelect("neutral");
        }
    }, [autoStart, isMonitor, isPlaying, moves, hasWon]);

    // Sync monitor state
    useEffect(() => {
        if (isMonitor && monitorState) {
            if (monitorState.moves !== undefined) setMoves(monitorState.moves);
            if (monitorState.incorrectCount !== undefined)
                setIncorrectCount(monitorState.incorrectCount);
            if (monitorState.hasWon !== undefined) setHasWon(monitorState.hasWon);
            if (monitorState.selectedEmotion !== undefined)
                setSelectedEmotion(monitorState.selectedEmotion);
            if (monitorState.isPlaying !== undefined) setIsPlaying(monitorState.isPlaying);
        }
    }, [isMonitor, monitorState]);

    const startGame = () => {
        setIsPlaying(true);
        setStartTime(Date.now());
        setMoves(0);
        setIncorrectCount(0);
        setHasWon(false);

        emitGameStart(childId, 8, "emotions", {
            level,
            scenarioText: scenario.text,
            moves: 0,
            incorrectCount: 0,
            isPlaying: true
        });
    };

    const handleSpeech = () => {
        if (isMonitor) return;
        stopCurrentSound();
        const audio = playSound(scenario.soundFile);
        currentAudioRef.current = audio;
    };

    // Autoplay zvuk pitanja na startu
    useEffect(() => {
        if (isPlaying && !hasWon) {
            const timer = setTimeout(() => {
                handleSpeech();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isPlaying, hasWon, isMonitor]);

    const handleEmotionSelect = (emotionId: string) => {
        if (isLocked || isMonitor || hasWon || !isPlaying) return;
        setIsLocked(true);
        setSelectedEmotion(emotionId);

        const newMoves = 1;
        setMoves(newMoves);
        setHasWon(true);

        emitGameProgress({
            childId,
            activityId: 8,
            gameType: "emotions",
            event: "progress",
            data: {
                matched: true,
                moves: newMoves,
                score: 1000,
                correct: true,
                incorrectCount: 0,
                hasWon: true,
                selectedEmotion: emotionId,
            },
            timestamp: new Date().toISOString(),
        });

        stopCurrentSound();
        const audio = new Audio('/sounds/click.mp3');
        audio.play().catch(() => { });

        setTimeout(() => {
            setShowMoodAfter(true);
        }, 1500);
    };

    // ── MOOD BEFORE ────────────────────────────────────
    if (!isMonitor && showMoodBefore) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-10 overflow-hidden text-center">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-slate-50">
                   <div 
                     className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl scale-110"
                     style={{ backgroundImage: "url('/images/emocije.png')" }}
                   />
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-white/80 to-purple-600/10 backdrop-blur-3xl" />
                </div>

                <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
                    {onClose && (
                        <button 
                            onClick={onClose}
                            className="absolute -top-12 left-0 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-500 hover:text-indigo-600 font-black text-xs uppercase tracking-widest shadow-md border border-slate-100 transition-all hover:-translate-x-1 active:scale-95 z-20"
                        >
                            <span>⬅</span> Nazad
                        </button>
                    )}
                    <div className="text-center mb-6 sm:mb-10 animate-in fade-in slide-in-from-top-10 duration-700">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-sm border border-slate-100 text-indigo-600 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-4">
                           ✨ Raspoloženje
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-2">
                           Kako si danas?
                        </h2>
                        <p className="text-slate-500 text-base sm:text-xl font-bold italic">Izaberi sličicu koja te opisuje</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 sm:gap-6 w-full max-w-4xl px-4">
                        {[
                            { emoji: "😢", label: "Tužno", color: "from-blue-400 to-indigo-500", value: "very_upset" },
                            { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500", value: "upset" },
                            { emoji: "😐", label: "Okej", color: "from-emerald-400 to-teal-500", value: "neutral" },
                            { emoji: "😊", label: "Dobro", color: "from-amber-400 to-orange-500", value: "happy" },
                            { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500", value: "very_happy" },
                        ].map((mood, idx) => (
                            <button
                                key={mood.value}
                                onClick={() => handleMoodBeforeSelect(mood.value)}
                                className="group relative flex flex-col items-center bg-white rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer shadow-lg border border-slate-100 hover:border-indigo-100 animate-in zoom-in-95 duration-500"
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
                                <div className="w-16 h-16 sm:w-24 sm:h-24 mb-3 sm:mb-4 flex items-center justify-center text-5xl sm:text-7xl transform group-hover:scale-110 transition-transform duration-500">
                                   {mood.emoji}
                                </div>
                                <span className="text-sm sm:text-lg font-black text-slate-800 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{mood.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── START SCREEN ────────────────────────────────────
    if (!isPlaying) {
        return (
            <div className="relative flex-1 min-h-[350px] w-full flex items-center justify-center overflow-hidden rounded-[2rem] md:rounded-[2.5rem] shadow-lg py-10 md:py-6"
                style={{ 
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.7)), url('/images/emocije.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}>
                <div className="relative z-10 w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">
                    <div className="mb-8">
                        <span className="px-6 py-2.5 rounded-full bg-white/90 backdrop-blur-sm border border-pink-200 text-pink-600 text-sm font-black uppercase tracking-widest shadow-md">
                            Nivo {level}
                        </span>
                    </div>
                    {/* Large scene emoji as preview */}
                    <div className="mb-6 w-36 h-36 md:w-44 md:h-44 bg-white rounded-full shadow-2xl border-4 border-pink-100 flex items-center justify-center text-7xl md:text-8xl animate-bounce">
                        {scenario.sceneEmoji}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight drop-shadow-md">
                        Moja Osećanja
                    </h2>
                    <p className="text-slate-800 text-base md:text-lg font-bold mb-10 max-w-xs mx-auto leading-relaxed">
                        Pogledaj sliku i reci kako se osećaš!
                    </p>
                    <button
                        onClick={startGame}
                        className="w-full max-w-sm group bg-pink-500 hover:bg-pink-600 text-white rounded-2xl p-1.5 transition-all duration-300 shadow-xl shadow-pink-200 hover:shadow-pink-300 hover:-translate-y-1"
                    >
                        <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 flex items-center justify-center gap-4 h-full">
                            <span className="text-xl md:text-2xl font-bold tracking-wide uppercase">
                                IGRAJ
                            </span>
                            <div className="w-12 h-12 bg-white text-pink-600 rounded-xl flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform shadow-inner">
                                ▶
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    // ── Mood After SCREEN ─────────────────────────────────────
    if (!isMonitor && showMoodAfter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-[3rem] p-12 shadow-2xl animate-in fade-in duration-500">
                <div className="text-center mb-16">
                    <span className="px-6 py-2 rounded-full bg-emerald-100 text-emerald-600 text-sm font-black uppercase tracking-widest mb-4 inline-block">Sjajno urađeno!</span>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4 text-center">Kako se osećaš sada? 🌟</h2>
                    <p className="text-2xl text-slate-500 font-medium tracking-wide">Bravo za prepoznavanje emocija!</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 w-full max-w-5xl">
                    {[
                        { emoji: "😢", label: "Tužno", color: "from-blue-400 to-indigo-500", value: "very_upset" },
                        { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500", value: "upset" },
                        { emoji: "😐", label: "Okej", color: "from-emerald-400 to-teal-500", value: "neutral" },
                        { emoji: "😊", label: "Dobro", color: "from-amber-400 to-orange-500", value: "happy" },
                        { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500", value: "very_happy" },
                    ].map((mood) => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodAfterSelect(mood.value)}
                            className="group relative flex flex-col items-center bg-white rounded-[2.5rem] p-10 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-10 rounded-[2.5rem] transition-opacity`} />
                            <span className="text-7xl mb-4 transform group-hover:scale-110 transition-transform duration-500 select-none">{mood.emoji}</span>
                            <span className="text-lg font-black text-slate-700 uppercase tracking-wide">{mood.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (hasWon) {
        const chosenEmo = EMOTIONS.find((e) => e.id === selectedEmotion);
        return (
            <div className="relative flex-1 min-h-[350px] w-full flex items-center justify-center overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 shadow-lg p-4 md:p-6">
                <div className="text-center animate-in zoom-in duration-500">
                    <div className="w-36 h-36 md:w-52 md:h-52 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6 relative border-4 md:border-8 border-green-200">
                        <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                        <span className="text-7xl md:text-9xl drop-shadow-md relative z-10 animate-bounce">
                            {chosenEmo?.emoji}
                        </span>
                        <div className="absolute -top-4 -right-4 text-4xl animate-pulse">🌟</div>
                        <div className="absolute -bottom-4 -left-4 text-4xl animate-pulse delay-75">✨</div>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-green-700 mb-3">
                        Bravo! 🎉
                    </h2>
                    <p className="text-xl md:text-2xl font-bold text-slate-600">
                        Odabrao/la si:{" "}
                        <span className="text-green-600 uppercase font-black">{chosenEmo?.label}</span>
                    </p>
                </div>
            </div>
        );
    }

    // ── GAME SCREEN ────────────────────────────────────
    // Split scenario text lines so we can display them separately
    const [questionLine, promptLine] = scenario.text.split("\n");

    return (
        <div className="bg-white/95 backdrop-blur-xl rounded-[1.5rem] md:rounded-[3rem] p-3 sm:p-4 md:p-8 shadow-2xl border border-white/50 w-full max-w-4xl mx-auto flex-1 flex flex-col animate-in fade-in duration-700 relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 md:mb-8 bg-gradient-to-r from-pink-50/50 to-white rounded-2xl md:rounded-[2.5rem] px-3 py-3 md:px-8 md:py-4 shadow-sm border border-pink-100 flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-white shadow-md flex items-center justify-center text-xl md:text-3xl ring-4 ring-pink-50 border border-pink-100 shrink-0">
                        😊
                    </div>
                    <div>
                        <h3 className="text-base md:text-xl font-black text-slate-800 uppercase">Nivo {level}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Kako se osećaš?</p>
                    </div>
                </div>
                {/* Sound replay button */}
                <button
                    onClick={handleSpeech}
                    className="flex items-center gap-2 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
                    aria-label="Pročitaj naglas"
                >
                    <span className="text-lg">🔊</span>
                    <span className="hidden sm:inline font-black text-xs uppercase tracking-wide">Ponovi</span>
                </button>
            </div>

            {/* Scenario card */}
            <div className="flex-shrink-0 flex flex-col sm:flex-row items-center gap-4 md:gap-8 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl md:rounded-[2.5rem] p-5 md:p-10 mb-6 md:mb-10 border border-pink-100 shadow-inner">
                {/* Big scene emoji */}
                <div className="w-24 h-24 md:w-40 md:h-40 flex-shrink-0 bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl flex items-center justify-center text-6xl md:text-8xl border-4 border-white animate-in zoom-in duration-500">
                    {scenario.sceneEmoji}
                </div>
                {/* Question text */}
                <div className="flex-1 text-center sm:text-left">
                    <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-800 leading-snug">
                        {questionLine}
                    </p>
                    {promptLine && (
                        <p className="mt-2 text-lg md:text-2xl font-bold text-pink-500">
                            {promptLine}
                        </p>
                    )}
                </div>
            </div>

            {/* Emotion buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 px-1 md:px-2 pb-2">
                {EMOTIONS.map((emotion) => {
                    const isSelected = selectedEmotion === emotion.id;
                    return (
                        <button
                            key={emotion.id}
                            onClick={() => handleEmotionSelect(emotion.id)}
                            disabled={isLocked || hasWon}
                            className={`relative flex flex-col items-center justify-center p-3 sm:p-4 md:p-7 rounded-xl sm:rounded-2xl md:rounded-[2rem] border-2 md:border-4 transition-all duration-300 shadow-md
                                ${isSelected
                                    ? `${emotion.bg} ${emotion.border} scale-105 shadow-2xl`
                                    : `bg-white border-slate-100 hover:${emotion.bg} hover:${emotion.border} hover:shadow-xl hover:-translate-y-1 active:scale-95`
                                }`}
                        >
                            {/* Emoji circle */}
                            <div className={`w-12 h-12 sm:w-16 sm:h-16 md:w-28 md:h-28 flex items-center justify-center rounded-full mb-1 sm:mb-2 md:mb-3 shadow-lg bg-gradient-to-br ${emotion.color}`}>
                                <span className="text-2xl sm:text-4xl md:text-6xl drop-shadow-sm">{emotion.emoji}</span>
                            </div>
                            <span className="text-[10px] sm:text-base md:text-xl font-black text-slate-700 uppercase tracking-wide text-center">
                                {emotion.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}