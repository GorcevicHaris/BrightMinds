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

const SCENARIOS = [
    {
        level: 1,
        text: "Kako se osećaš kada te neko pohvali i kaže da si odličan?",
        correctEmotion: "happy",
        soundFile: "firstSent.mp3",
    },
    {
        level: 2,
        text: "Kako se osećaš kada ti drug uzme igračku?",
        correctEmotion: "angry",
        soundFile: "secondSent.mp3",
    },
    {
        level: 3,
        text: "Kako se osećaš kada dobiješ poklon?",
        correctEmotion: "happy",
        soundFile: "thirdSent.mp3",
    },
    {
        level: 4,
        text: "Kako se osećaš kada padneš i udariš koleno?",
        correctEmotion: "sad",
        soundFile: "fourthSent.mp3",
    },
    {
        level: 5,
        text: "Kako se osećaš kada ti neko sruši kulu od kocaka?",
        correctEmotion: "angry",
        soundFile: "fifthSent.mp3",
    },
    {
        level: 6,
        text: "Kako se osećaš kada se izgubiš u prodavnici?",
        correctEmotion: "scared",
        soundFile: "sixthSent.mp3",
    },
    {
        level: 7,
        text: "Kako se osećaš kada neko želi da se igra sa tobom?",
        correctEmotion: "happy",
        soundFile: "seventSent.mp3",
    },
    {
        level: 8,
        text: "Kako se osećaš kada te juri strašan pas?",
        correctEmotion: "scared",
        soundFile: "eightSent.mp3",
    },
];

const EMOTIONS = [
    {
        id: "happy",
        emoji: "😀",
        label: "srećno",
        color: "from-green-400 to-emerald-500",
        shadow: "shadow-green-200",
    },
    {
        id: "sad",
        emoji: "😢",
        label: "tužno",
        color: "from-blue-400 to-indigo-500",
        shadow: "shadow-blue-200",
    },
    {
        id: "angry",
        emoji: "😡",
        label: "ljuto",
        color: "from-red-400 to-rose-500",
        shadow: "shadow-red-200",
    },
    {
        id: "scared",
        emoji: "😨",
        label: "uplašeno",
        color: "from-purple-400 to-violet-500",
        shadow: "shadow-purple-200",
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
        setIsPlaying(isMonitor ? true : false); // Monitoru odmah pokazujemo pitanje ako smo već u syncu
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
        if (isMonitor) return; // Disable audio for monitor
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
    }, [isPlaying, hasWon, isMonitor]); // Added isMonitor to dependencies

    const handleEmotionSelect = (emotionId: string) => {
        if (isLocked || isMonitor || hasWon || !isPlaying) return;
        setIsLocked(true);
        setSelectedEmotion(emotionId);

        const newMoves = 1;
        setMoves(newMoves);

        setHasWon(true);
        setIsLocked(true);

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

        // Click sound instead of correct/incorrect
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
                <div className="absolute top-12 left-12 text-5xl md:text-6xl opacity-20 animate-pulse -rotate-12">😀</div>
                <div className="absolute bottom-16 right-12 text-7xl opacity-20 animate-bounce rotate-12">❤️</div>
                <div className="absolute top-24 right-20 text-5xl opacity-20 animate-pulse rotate-45">😢</div>
                <div className="absolute bottom-24 left-24 text-6xl opacity-20 animate-bounce -rotate-6">😡</div>

                <div className="relative z-10 w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">
                    <div className="mb-8">
                        <span className="px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-pink-200 text-pink-600 text-sm font-black uppercase tracking-widest shadow-sm">
                            Nivo {level}
                        </span>
                    </div>
                    <div className="mb-8 relative group cursor-default">
                        <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-b from-white to-pink-50 rounded-full shadow-xl border-4 border-white flex items-center justify-center transform group-hover:scale-110 transition-all duration-300">
                            <span className="text-7xl md:text-8xl drop-shadow-md">😊</span>
                        </div>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-800 mb-2 md:mb-4 tracking-tight drop-shadow-sm">
                        Moja Osećanja
                    </h2>
                    <p className="text-slate-600 text-base md:text-xl font-medium leading-relaxed mb-8 md:mb-12 max-w-sm mx-auto">
                        Kako se osećaš u različitim situacijama? Hajde da otkrijemo zajedno!
                    </p>
                    <button
                        onClick={startGame}
                        className="w-full max-w-sm group bg-pink-500 hover:bg-pink-600 text-white rounded-2xl p-1.5 transition-all duration-300 shadow-xl shadow-pink-200 hover:shadow-pink-300 hover:-translate-y-1"
                    >
                        <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 flex items-center justify-center gap-4 h-full">
                            <span className="text-xl md:text-2xl font-bold tracking-wide uppercase">
                                ZAPOČNI IGRU
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
        const correctEmo = EMOTIONS.find((e) => e.id === scenario.correctEmotion);
        return (
            <div className="relative flex-1 min-h-[350px] w-full flex items-center justify-center overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 shadow-lg p-4 md:p-6">
                <div className="text-center animate-in zoom-in duration-500">
                    <div className="w-32 h-32 md:w-48 md:h-48 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl mb-6 md:mb-8 relative border-4 md:border-8 border-green-200">
                        <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
                        <span className="text-6xl md:text-8xl drop-shadow-md relative z-10 animate-bounce">
                            {correctEmo?.emoji}
                        </span>
                        <div className="absolute -top-4 -right-4 text-4xl animate-pulse">🌟</div>
                        <div className="absolute -bottom-4 -left-4 text-4xl animate-pulse delay-75">✨</div>
                    </div>
                    <h2 className="text-3xl md:text-6xl font-black text-slate-800 mb-3 md:mb-4 text-green-700">
                        Zabeleženo!
                    </h2>
                    <p className="text-xl md:text-2xl font-bold text-slate-600">
                        Izabrao/la si: <span className="text-green-600 uppercase">{correctEmo?.label}</span>
                    </p>
                </div>
            </div>
        );
    }

    // ── GAME SCREEN ────────────────────────────────────
    return (
        <div className="bg-white/95 backdrop-blur-xl rounded-[1.5rem] md:rounded-[3rem] p-3 sm:p-4 md:p-8 shadow-2xl border border-white/50 w-full max-w-4xl mx-auto flex-1 flex flex-col animate-in fade-in duration-700 relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 md:mb-10 bg-gradient-to-r from-pink-50/50 to-white rounded-2xl md:rounded-[2.5rem] px-3 py-3 md:px-8 md:py-5 shadow-sm border border-pink-100 flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-6">
                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-white shadow-md flex items-center justify-center text-xl md:text-3xl ring-4 ring-pink-50 border border-pink-100 shrink-0">
                        😊
                    </div>
                    <div>
                        <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase">Nivo {level}</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase">Prepoznaj emociju</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white/80 rounded-xl px-4 py-2 border border-pink-100 shadow-sm text-center">
                        <span className="block text-[10px] font-black text-slate-400 uppercase mb-0.5">Pokušaji</span>
                        <span className="text-xl font-black text-pink-500">{moves}</span>
                    </div>
                </div>
            </div>

            {/* Scenario Text */}
            <div className="flex-1 flex flex-col justify-center gap-6 md:gap-12 relative z-10 min-h-0">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 md:p-10 rounded-2xl md:rounded-[3rem] text-center shadow-inner border border-slate-200 relative group overflow-y-auto">
                    <button
                        onClick={handleSpeech}
                        className="absolute -top-3 -right-3 md:-top-5 md:right-6 bg-white w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg border-2 border-slate-100 flex items-center justify-center text-lg md:text-xl hover:scale-110 active:scale-95 transition-all text-slate-600 hover:text-pink-500 z-20"
                        aria-label="Pročitaj naglas"
                    >
                        🔊
                    </button>
                    <h2 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black text-slate-800 leading-tight md:leading-tight">
                        {scenario.text}
                    </h2>
                </div>

                {/* Emotion Options */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 px-1 md:px-2 pb-4 md:pb-0">
                    {EMOTIONS.map((emotion) => {
                        const isSelected = selectedEmotion === emotion.id;

                        return (
                            <button
                                key={emotion.id}
                                onClick={() => handleEmotionSelect(emotion.id)}
                                disabled={isLocked || hasWon}
                                className={`relative flex flex-col items-center justify-center bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border-[3px] md:border-4 transition-all duration-300
                  ${isSelected
                                        ? "border-green-400 bg-green-50 scale-105 shadow-2xl"
                                        : "border-slate-100 hover:border-pink-300 hover:shadow-xl hover:-translate-y-2 active:scale-95 shadow-md"
                                    }
                `}
                            >
                                <div
                                    className={`w-14 h-14 md:w-28 md:h-28 flex items-center justify-center rounded-full mb-2 md:mb-4 shadow-lg bg-gradient-to-br ${emotion.color} text-3xl md:text-6xl
                  `}
                                >
                                    <span className="drop-shadow-sm">{emotion.emoji}</span>
                                </div>
                                <span className="text-sm md:text-2xl font-black text-slate-700 uppercase tracking-wide text-center">
                                    {emotion.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}