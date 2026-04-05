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
    autoStart?: boolean;
    isMonitor?: boolean;
    monitorState?: any;
}

// Kratka, jasna pitanja + emoji koji asocira na situaciju
// Nivo 1-2: srećno/tužno  |  3-4: ljuto  |  5-6: uplašeno  |  7-8: miks
const SCENARIOS = [
    {
        level: 1,
        text: "Dobio si poklon! 🎁\nKako se osećaš?",
        sceneEmoji: "🎁",
        correctEmotion: "happy",
        soundFile: "firstSent.mp3",
    },
    {
        level: 2,
        text: "Pao si i udario koleno. 🤕\nKako se osećaš?",
        sceneEmoji: "🤕",
        correctEmotion: "sad",
        soundFile: "secondSent.mp3",
    },
    {
        level: 3,
        text: "Drug ti uzeo igračku! 😤\nKako se osećaš?",
        sceneEmoji: "🧸",
        correctEmotion: "angry",
        soundFile: "thirdSent.mp3",
    },
    {
        level: 4,
        text: "Mama te pohvalila! ⭐\nKako se osećaš?",
        sceneEmoji: "⭐",
        correctEmotion: "happy",
        soundFile: "fourthSent.mp3",
    },
    {
        level: 5,
        text: "Veliki pas trči prema tebi! 🐕\nKako se osećaš?",
        sceneEmoji: "🐕",
        correctEmotion: "scared",
        soundFile: "fifthSent.mp3",
    },
    {
        level: 6,
        text: "Neko srušio tvoju kulu! 🧱\nKako se osećaš?",
        sceneEmoji: "🧱",
        correctEmotion: "angry",
        soundFile: "sixthSent.mp3",
    },
    {
        level: 7,
        text: "Izgubio si se u prodavnici. 🏪\nKako se osećaš?",
        sceneEmoji: "🏪",
        correctEmotion: "scared",
        soundFile: "seventSent.mp3",
    },
    {
        level: 8,
        text: "Drug želi da se igra s tobom! 🤝\nKako se osećaš?",
        sceneEmoji: "🤝",
        correctEmotion: "happy",
        soundFile: "eightSent.mp3",
    },
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
        color: "from-blue-400 to-indigo-500",
        shadow: "shadow-blue-200",
        bg: "bg-blue-50",
        border: "border-blue-300",
    },
    {
        id: "angry",
        emoji: "😡",
        label: "Ljuto",
        color: "from-red-400 to-rose-500",
        shadow: "shadow-red-200",
        bg: "bg-red-50",
        border: "border-red-300",
    },
    {
        id: "scared",
        emoji: "😨",
        label: "Uplašeno",
        color: "from-purple-400 to-violet-500",
        shadow: "shadow-purple-200",
        bg: "bg-purple-50",
        border: "border-purple-300",
    },
];

export default function EmotionsGame({
    childId,
    level,
    onComplete,
    autoStart,
    isMonitor,
    monitorState,
}: GameProps) {
    const scenario = SCENARIOS.find((s) => s.level === level) || SCENARIOS[0];

    const [isPlaying, setIsPlaying] = useState(isMonitor ? true : false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [moves, setMoves] = useState<number>(monitorState?.moves || 0);
    const [incorrectCount, setIncorrectCount] = useState<number>(
        monitorState?.incorrectCount || 0
    );
    const [hasWon, setHasWon] = useState<boolean>(monitorState?.hasWon || false);
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

    // Auto-start logic
    useEffect(() => {
        if (autoStart && !isMonitor && !isPlaying && moves === 0 && !hasWon) {
            startGame();
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
            const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
            const finalScore = 1000;

            emitGameComplete({
                childId,
                activityId: 8,
                gameType: "emotions",
                event: "completed",
                data: { finalScore, totalMoves: newMoves, selectedEmotion: emotionId },
                timestamp: new Date().toISOString(),
            });

            onComplete(finalScore, duration, null, null);
        }, 1500);
    };

    // ── START SCREEN ────────────────────────────────────
    if (!isPlaying) {
        return (
            <div className="relative flex-1 min-h-[350px] w-full flex items-center justify-center overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 shadow-lg py-10 md:py-6">
                <div className="relative z-10 w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">
                    <div className="mb-8">
                        <span className="px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-pink-200 text-pink-600 text-sm font-black uppercase tracking-widest shadow-sm">
                            Nivo {level}
                        </span>
                    </div>
                    {/* Large scene emoji as preview */}
                    <div className="mb-6 w-36 h-36 md:w-44 md:h-44 bg-white rounded-full shadow-2xl border-4 border-pink-100 flex items-center justify-center text-7xl md:text-8xl animate-bounce">
                        {scenario.sceneEmoji}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-3 tracking-tight">
                        Moja Osećanja
                    </h2>
                    <p className="text-slate-500 text-base md:text-lg font-semibold mb-10 max-w-xs mx-auto leading-relaxed">
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

    // ── WIN SCREEN ─────────────────────────────────────
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
                            className={`relative flex flex-col items-center justify-center p-4 md:p-7 rounded-2xl md:rounded-[2rem] border-4 transition-all duration-300 shadow-md
                                ${isSelected
                                    ? `${emotion.bg} ${emotion.border} scale-105 shadow-2xl`
                                    : `bg-white border-slate-100 hover:${emotion.bg} hover:${emotion.border} hover:shadow-xl hover:-translate-y-1 active:scale-95`
                                }`}
                        >
                            {/* Emoji circle */}
                            <div className={`w-16 h-16 md:w-28 md:h-28 flex items-center justify-center rounded-full mb-3 shadow-lg bg-gradient-to-br ${emotion.color}`}>
                                <span className="text-4xl md:text-6xl drop-shadow-sm">{emotion.emoji}</span>
                            </div>
                            <span className="text-base md:text-xl font-black text-slate-700 uppercase tracking-wide text-center">
                                {emotion.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}