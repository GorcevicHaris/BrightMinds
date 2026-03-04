"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGameEmitter } from '@/lib/useSocket';

interface GameProps {
    childId: number;
    level: number;
    onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => void;
    isMonitor?: boolean;
    monitorState?: any;
}

interface SoundItem {
    id: string;
    icon: string; // Promenjeno sa image na icon
    label: string;
    soundUrl: string;
}

const SOUND_ITEMS: SoundItem[] = [
    { id: "dog", icon: "🐶", label: "Pas", soundUrl: "/sounds/pas.mp3" },
    { id: "cat", icon: "🐱", label: "Mačka", soundUrl: "/sounds/macka.mp3" },
    { id: "cow", icon: "🐮", label: "Krava", soundUrl: "/sounds/krava.wav" },
    { id: "horse", icon: "🐴", label: "Konj", soundUrl: "/sounds/konj.mp3" },
    { id: "bear", icon: "🐻", label: "Medved", soundUrl: "/sounds/medved.mp3" },
    { id: "police", icon: "🚓", label: "Policija", soundUrl: "/sounds/policija.mp3" },
    { id: "car_horn", icon: "🚗", label: "Sirena auta", soundUrl: "/sounds/sirenaAuta.mp3" },
    { id: "rain", icon: "🌧️", label: "Kiša", soundUrl: "/sounds/kisa.mp3" },
    { id: "thunder", icon: "⚡", label: "Grmljavina", soundUrl: "/sounds/grmljavina.mp3" },
    { id: "doorbell", icon: "🔔", label: "Zvono", soundUrl: "/sounds/zvonoKucno.mp3" },
    { id: "bird", icon: "🐦", label: "Ptica", soundUrl: "/sounds/ptica.mp3" },
    { id: "monkey", icon: "🐵", label: "Majmun", soundUrl: "/sounds/majmun.mp3" },
    { id: "rooster", icon: "🐓", label: "Petao", soundUrl: "/sounds/petao.wav" },
    { id: "pig", icon: "🐷", label: "Svinja", soundUrl: "/sounds/svinja.mp3" },
];

export default function SoundToImageGame({ childId, level, onComplete, isMonitor, monitorState }: GameProps) {
    const [currentSound, setCurrentSound] = useState<SoundItem | null>(null);
    const [options, setOptions] = useState<SoundItem[]>([]);
    const [score, setScore] = useState(monitorState?.score || 0);
    const [round, setRound] = useState(monitorState?.round || 0);
    const [correctCount, setCorrectCount] = useState(monitorState?.correctCount || 0);
    const [incorrectCount, setIncorrectCount] = useState(monitorState?.incorrectCount || 0);
    const [isPlaying, setIsPlaying] = useState(isMonitor ? true : false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [moodBefore, setMoodBefore] = useState<string | null>(null);
    const [showMoodBefore, setShowMoodBefore] = useState(false);
    const [showMoodAfter, setShowMoodAfter] = useState(false);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [isPlayingSound, setIsPlayingSound] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const initialRoundRef = useRef(false);
    const maxRounds = 5 + level;

    // Sync with monitor state
    useEffect(() => {
        if (isMonitor && monitorState) {
            if (monitorState.score !== undefined) setScore(monitorState.score);
            if (monitorState.round !== undefined) setRound(monitorState.round);
            if (monitorState.correctCount !== undefined) setCorrectCount(monitorState.correctCount);
            if (monitorState.incorrectCount !== undefined) setIncorrectCount(monitorState.incorrectCount);
            if (monitorState.currentSound) setCurrentSound(monitorState.currentSound);
            if (monitorState.options) setOptions(monitorState.options);
        }
    }, [isMonitor, monitorState]);

    const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();

    const generateRound = useCallback((stats?: { score: number, round: number, correctCount: number, incorrectCount: number }) => {
        // Broj dostupnih zvukova raste sa nivoom
        const availableCount = Math.min(SOUND_ITEMS.length, 6 + level);
        const availableSounds = SOUND_ITEMS.slice(0, availableCount);

        // Odaberi nasumičan zvuk
        const correctAnswer = availableSounds[Math.floor(Math.random() * availableSounds.length)];

        // Broj opcija:
        // Nivo 1-2: 3 opcije
        // Nivo 3-4: 4 opcije
        // Nivo 5-6: 6 opcija
        // Nivo 7+: 8 opcija (ako imamo dovoljno zvukova)
        let optionsCount = 3;
        if (level >= 3 && level <= 4) optionsCount = 4;
        else if (level >= 5 && level <= 6) optionsCount = 6;
        else if (level >= 7) optionsCount = 8;

        // Kreiraj pogrešne opcije
        const allOtherSounds = SOUND_ITEMS.filter(item => item.id !== correctAnswer.id);
        const wrongOptions = allOtherSounds
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(optionsCount - 1, allOtherSounds.length));

        const allOptions = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

        setCurrentSound(correctAnswer);
        setOptions(allOptions);
        setFeedback(null);

        // Emituj novi krug monitoru
        if (!isMonitor) {
            emitGameProgress({
                childId,
                activityId: 5,
                gameType: 'sound-to-image',
                event: 'new_round',
                data: {
                    currentSound: correctAnswer,
                    options: allOptions,
                    score: stats ? stats.score : 0,
                    round: stats ? stats.round : 0,
                    correctCount: stats ? stats.correctCount : 0,
                    incorrectCount: stats ? stats.incorrectCount : 0,
                },
                timestamp: new Date().toISOString(),
            });
        }
    }, [level, childId, emitGameProgress, isMonitor]);

    useEffect(() => {
        if (isPlaying && !isMonitor && !initialRoundRef.current) {
            initialRoundRef.current = true;
            generateRound();
        }
    }, [isPlaying, generateRound, isMonitor]);

    // Cleanup results on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const startGame = () => {
        setShowMoodBefore(true);
    };

    const handleMoodBeforeSelect = (mood: string) => {
        setMoodBefore(mood);
        setShowMoodBefore(false);
        setIsPlaying(true);
        setStartTime(Date.now());
        setScore(0);
        setRound(0);
        setCorrectCount(0);
        setIncorrectCount(0);
        setGameCompleted(false);

        emitGameStart(childId, 5, 'sound-to-image', {
            level,
            score: 0,
            round: 0,
            correctCount: 0,
            incorrectCount: 0,
        });
    };

    const stopSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setIsPlayingSound(false);
    }, []);

    const playSound = () => {
        if (!currentSound || isPlayingSound) return;

        setIsPlayingSound(true);

        // Kreiraj audio element
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const audio = new Audio(currentSound.soundUrl);
        audioRef.current = audio;

        audio.play().catch(err => {
            console.log("Audio file not found, using text-to-speech fallback");

            // Fallback na Web Speech API
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(currentSound.label);
                utterance.lang = 'sr-RS'; // Serbian language
                utterance.rate = 0.8;
                utterance.pitch = 1.0;

                utterance.onend = () => {
                    setIsPlayingSound(false);
                };

                utterance.onerror = () => {
                    setIsPlayingSound(false);
                };

                window.speechSynthesis.speak(utterance);
            } else {
                setIsPlayingSound(false);
            }
        });

        audio.onended = () => {
            setIsPlayingSound(false);
        };

        audio.onerror = () => {
            console.log("Audio error, using text-to-speech fallback");

            // Fallback na Web Speech API
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(currentSound.label);
                utterance.lang = 'sr-RS';
                utterance.rate = 0.8;
                utterance.pitch = 1.0;

                utterance.onend = () => {
                    setIsPlayingSound(false);
                };

                utterance.onerror = () => {
                    setIsPlayingSound(false);
                };

                window.speechSynthesis.speak(utterance);
            } else {
                setIsPlayingSound(false);
            }
        };
    };

    const handleAnswer = (selectedItem: SoundItem) => {
        if (!isPlaying || isMonitor || feedback) return;

        stopSound();
        const isCorrect = selectedItem.id === currentSound?.id;
        setFeedback(isCorrect ? "correct" : "incorrect");

        const newScore = isCorrect ? score + 100 : score;
        const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
        const newIncorrectCount = !isCorrect ? incorrectCount + 1 : incorrectCount;
        const newRound = round + 1;

        setScore(newScore);
        setCorrectCount(newCorrectCount);
        setIncorrectCount(newIncorrectCount);
        setRound(newRound);

        // Emit progress
        emitGameProgress({
            childId,
            activityId: 5,
            gameType: 'sound-to-image',
            event: 'answer',
            data: {
                correct: isCorrect,
                selectedId: selectedItem.id,
                correctId: currentSound?.id,
                score: newScore,
                round: newRound,
                correctCount: newCorrectCount,
                incorrectCount: newIncorrectCount,
                currentSound,
                options,
            },
            timestamp: new Date().toISOString(),
        });

        // Pređi na sledeću rundu ili završi igru
        setTimeout(() => {
            if (newRound >= maxRounds) {
                setIsPlaying(false);
                setGameCompleted(true);

                emitGameComplete({
                    childId,
                    activityId: 5,
                    gameType: 'sound-to-image',
                    event: 'completed',
                    data: {
                        finalScore: newScore,
                        totalRounds: newRound,
                        correctCount: newCorrectCount,
                        incorrectCount: newIncorrectCount,
                    },
                    timestamp: new Date().toISOString(),
                });

                setTimeout(() => {
                    setShowMoodAfter(true);
                }, 500);
            } else {
                generateRound({
                    score: newScore,
                    round: newRound,
                    correctCount: newCorrectCount,
                    incorrectCount: newIncorrectCount
                });
            }
        }, 1500);
    };

    const handleMoodAfterSelect = (mood: string) => {
        setShowMoodAfter(false);
        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        onComplete(score, duration, moodBefore, mood);
    };

    // Mood Before Screen
    if (!isMonitor && showMoodBefore) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-3xl p-8 shadow-xl">
                <h2 className="text-2xl md:text-3xl font-bold text-purple-700 mb-8 text-center">
                    Kako se osećaš PRE igre?
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                    {[
                        { emoji: "😢", label: "Loše", value: "very_upset" },
                        { emoji: "😕", label: "Nije sjajno", value: "upset" },
                        { emoji: "😐", label: "Okej", value: "neutral" },
                        { emoji: "😊", label: "Dobro", value: "happy" },
                        { emoji: "😄", label: "Super", value: "very_happy" },
                    ].map((mood) => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodBeforeSelect(mood.value)}
                            className="flex flex-col items-center bg-white rounded-3xl p-4 md:p-6 hover:scale-110 transition-transform shadow-lg hover:shadow-2xl"
                        >
                            <span className="text-4xl md:text-6xl mb-2">{mood.emoji}</span>
                            <span className="text-sm md:text-lg font-semibold text-gray-700">{mood.label}</span>
                        </button>
                    ))}
                </div>
                {isConnected && (
                    <div className="mt-6 text-green-600 font-semibold flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        Live praćenje aktivno
                    </div>
                )}
            </div>
        );
    }

    // Mood After Screen
    if (!isMonitor && showMoodAfter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-green-100 via-yellow-100 to-orange-100 rounded-3xl p-8 shadow-xl">
                <h2 className="text-2xl md:text-3xl font-bold text-green-700 mb-4 text-center">
                    Kako se osećaš POSLE igre?
                </h2>
                <p className="text-lg md:text-xl text-gray-600 mb-8 text-center">
                    Tačno si odgovorio/la na <span className="font-bold text-purple-600">{correctCount}/{maxRounds}</span> pitanja!<br />
                    Rezultat: <span className="font-bold text-green-600">{score} poena</span> 🎉
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                    {[
                        { emoji: "😢", label: "Loše", value: "very_upset" },
                        { emoji: "😕", label: "Nije sjajno", value: "upset" },
                        { emoji: "😐", label: "Okej", value: "neutral" },
                        { emoji: "😊", label: "Dobro", value: "happy" },
                        { emoji: "😄", label: "Super", value: "very_happy" },
                    ].map((mood) => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodAfterSelect(mood.value)}
                            className="flex flex-col items-center bg-white rounded-3xl p-4 md:p-6 hover:scale-110 transition-transform shadow-lg hover:shadow-2xl"
                        >
                            <span className="text-4xl md:text-6xl mb-2">{mood.emoji}</span>
                            <span className="text-sm md:text-lg font-semibold text-gray-700">{mood.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Start Screen
    if (!isPlaying && round === 0) {
        return (
            <div className="relative min-h-[500px] w-full flex items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 shadow-lg">

                {/* Background Decorations */}
                <div className="absolute top-12 left-12 text-6xl opacity-10 animate-pulse -rotate-12">🔊</div>
                <div className="absolute bottom-16 right-12 text-7xl opacity-10 animate-bounce rotate-12">🎵</div>
                <div className="absolute top-24 right-20 text-5xl opacity-10 animate-pulse rotate-45">👂</div>
                <div className="absolute bottom-24 left-24 text-6xl opacity-10 animate-bounce -rotate-6">🎶</div>

                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl -ml-32 -mb-32"></div>

                {/* Main Content */}
                <div className="relative z-10 w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">

                    {/* Badge */}
                    <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
                        <span className="px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-cyan-100 text-cyan-600 text-sm font-black uppercase tracking-widest shadow-sm">
                            Nivo {level}
                        </span>
                    </div>

                    {/* Hero Icon */}
                    <div className="mb-10 relative group cursor-default">
                        <div className="absolute inset-0 bg-cyan-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <div className="relative w-40 h-40 bg-gradient-to-b from-white to-cyan-50 rounded-[2.5rem] shadow-xl border-4 border-white flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                            <span className="text-8xl drop-shadow-md">🔊</span>
                        </div>
                        {/* Decorative mini icons */}
                        <div className="absolute -top-4 -right-4 text-3xl animate-bounce delay-100">🎵</div>
                        <div className="absolute -bottom-4 -left-4 text-3xl animate-bounce delay-300">👂</div>
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight drop-shadow-sm">Zvuk → Slika</h2>
                    <p className="text-slate-600 text-xl font-medium leading-relaxed mb-12 max-w-sm mx-auto">
                        Slušaj zvuk i izaberi <span className="text-cyan-600 font-bold">tačnu sliku</span> od 3 ponuđene!
                    </p>

                    {/* Action Button */}
                    <button
                        onClick={startGame}
                        className="w-full max-w-sm group bg-cyan-500 hover:bg-cyan-600 text-white rounded-2xl p-1.5 transition-all duration-300 shadow-xl shadow-cyan-200 hover:shadow-cyan-300 hover:-translate-y-1"
                    >
                        <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 flex items-center justify-center gap-4 h-full">
                            <span className="text-2xl font-bold tracking-wide">ZAPOČNI IGRU</span>
                            <div className="w-12 h-12 bg-white text-cyan-600 rounded-xl flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform shadow-inner">
                                ▶
                            </div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    // Game Screen
    return (
        <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 rounded-3xl p-4 md:p-8 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 md:mb-8 bg-white/80 backdrop-blur rounded-2xl p-4 md:p-6 shadow-lg flex-wrap gap-4">
                <div className="flex items-center gap-2 md:gap-4">
                    <span className="text-2xl md:text-3xl font-bold text-cyan-700">
                        Runda: {round}/{maxRounds}
                    </span>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                    <span className="text-2xl md:text-3xl font-bold text-green-700">
                        Poeni: {score}
                    </span>
                    {isConnected && (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    )}
                </div>
            </div>

            {/* Sound Player */}
            <div className="mb-8 flex flex-col items-center">
                <button
                    onClick={playSound}
                    disabled={isPlayingSound || !currentSound}
                    className={`group relative w-32 h-32 md:w-40 md:h-40 rounded-full transition-all duration-300 ${isPlayingSound
                        ? "bg-gradient-to-br from-cyan-400 to-blue-500 scale-110 animate-pulse"
                        : "bg-gradient-to-br from-cyan-500 to-blue-600 hover:scale-110 shadow-xl hover:shadow-2xl"
                        }`}
                >
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
                    <div className="relative flex flex-col items-center justify-center h-full">
                        <span className="text-6xl md:text-7xl mb-2">{isPlayingSound ? "🔊" : "🔉"}</span>
                        <span className="text-white text-sm md:text-base font-bold">
                            {isPlayingSound ? "Slušaj..." : "Pusti zvuk"}
                        </span>
                    </div>
                </button>
                <p className="mt-4 text-gray-600 font-medium text-center">
                    Klikni na zvučnik da čuješ zvuk
                </p>
            </div>

            {/* Options */}
            <div className={`grid ${options.length === 4 ? "grid-cols-2" : "grid-cols-3"} gap-4 md:gap-6 max-w-4xl mx-auto`}>
                {options.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleAnswer(item)}
                        disabled={feedback !== null || !currentSound}
                        className={`relative group aspect-square rounded-2xl md:rounded-3xl p-4 md:p-6 transition-all duration-300 transform ${feedback === "correct" && item.id === currentSound?.id
                            ? "bg-gradient-to-br from-green-400 to-green-500 scale-110 shadow-2xl"
                            : feedback === "incorrect" && item.id === currentSound?.id
                                ? "bg-gradient-to-br from-green-400 to-green-500 shadow-xl"
                                : feedback === "incorrect" && options.find(o => o.id === item.id)
                                    ? "bg-gradient-to-br from-red-400 to-red-500 scale-95"
                                    : "bg-white hover:scale-105 hover:shadow-xl shadow-lg"
                            } ${feedback ? "cursor-not-allowed" : "cursor-pointer"}`}
                    >
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="relative w-24 h-24 md:w-32 md:h-32 mb-4 flex items-center justify-center">
                                <span className="text-6xl md:text-8xl drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                                    {item.icon}
                                </span>
                            </div>
                            <span className={`text-base md:text-xl font-bold ${feedback && item.id === currentSound?.id ? "text-white" : "text-gray-700"
                                }`}>
                                {item.label}
                            </span>
                        </div>

                        {/* Feedback Icons */}
                        {feedback === "correct" && item.id === currentSound?.id && (
                            <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl shadow-lg animate-bounce">
                                ✓
                            </div>
                        )}
                        {feedback === "incorrect" && item.id !== currentSound?.id && (
                            <div className="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl shadow-lg">
                                ✗
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Feedback Message */}
            {feedback && (
                <div className={`mt-8 p-4 rounded-2xl text-center text-xl font-bold animate-in zoom-in duration-300 ${feedback === "correct"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                    }`}>
                    {feedback === "correct" ? "🎉 Bravo! Tačan odgovor!" : "😊 Pokušaj ponovo sledeći put!"}
                </div>
            )}
        </div>
    );
}
