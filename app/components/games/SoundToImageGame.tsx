"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGameEmitter } from '@/lib/useSocket';
import { useSpeech } from '@/lib/useSpeech';

interface GameProps {
    childId: number;
    level: number;
    onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => void;
    autoStart?: boolean;
    isMonitor?: boolean;
    monitorState?: any;
}

interface SoundItem {
    id: string;
    icon: string;
    label: string;
    soundUrl: string;
}

// 14 zvučnih stavki — više se uvode u kasnijim nivoima
const SOUND_ITEMS: SoundItem[] = [
    { id: "dog",      icon: "🐶", label: "Pas",          soundUrl: "/sounds/pas.mp3" },
    { id: "cat",      icon: "🐱", label: "Mačka",        soundUrl: "/sounds/macka.mp3" },
    { id: "cow",      icon: "🐮", label: "Krava",        soundUrl: "/sounds/krava.wav" },
    { id: "horse",    icon: "🐴", label: "Konj",         soundUrl: "/sounds/konj.mp3" },
    { id: "bear",     icon: "🐻", label: "Medved",       soundUrl: "/sounds/medved.mp3" },
    { id: "bird",     icon: "🐦", label: "Ptica",        soundUrl: "/sounds/ptica.mp3" },
    { id: "monkey",   icon: "🐵", label: "Majmun",       soundUrl: "/sounds/majmun.mp3" },
    { id: "rooster",  icon: "🐓", label: "Petao",        soundUrl: "/sounds/petao.wav" },
    { id: "pig",      icon: "🐷", label: "Svinja",       soundUrl: "/sounds/svinja.mp3" },
    { id: "rain",     icon: "🌧️", label: "Kiša",         soundUrl: "/sounds/kisa.mp3" },
    { id: "thunder",  icon: "⚡",  label: "Grmljavina",  soundUrl: "/sounds/grmljavina.mp3" },
    { id: "doorbell", icon: "🔔", label: "Zvono",        soundUrl: "/sounds/zvonoKucno.mp3" },
    { id: "police",   icon: "🚓", label: "Policija",     soundUrl: "/sounds/policija.mp3" },
    { id: "car_horn", icon: "🚗", label: "Sirena auta",  soundUrl: "/sounds/sirenaAuta.mp3" },
];

// Konfiguracija svakog od 15 nivoa
interface LevelConfig {
    rounds: number;       // broj rundi (pitanja)
    poolSize: number;     // koliko različitih zvukova se koristi
    optionsCount: number; // broj ponuđenih odgovora po pitanju
}

const LEVEL_CONFIGS: LevelConfig[] = [
    // Nivo  1 — intro: 3 poznate životinje, 2 opcije, 4 pitanja
    { rounds: 4,  poolSize: 3,  optionsCount: 2 },
    // Nivo  2
    { rounds: 4,  poolSize: 4,  optionsCount: 2 },
    // Nivo  3
    { rounds: 5,  poolSize: 4,  optionsCount: 3 },
    // Nivo  4
    { rounds: 5,  poolSize: 5,  optionsCount: 3 },
    // Nivo  5
    { rounds: 6,  poolSize: 6,  optionsCount: 3 },
    // Nivo  6
    { rounds: 6,  poolSize: 7,  optionsCount: 4 },
    // Nivo  7
    { rounds: 7,  poolSize: 8,  optionsCount: 4 },
    // Nivo  8
    { rounds: 7,  poolSize: 9,  optionsCount: 4 },
    // Nivo  9
    { rounds: 8,  poolSize: 10, optionsCount: 5 },
    // Nivo 10
    { rounds: 8,  poolSize: 11, optionsCount: 5 },
    // Nivo 11
    { rounds: 9,  poolSize: 12, optionsCount: 6 },
    // Nivo 12
    { rounds: 9,  poolSize: 13, optionsCount: 6 },
    // Nivo 13
    { rounds: 10, poolSize: 14, optionsCount: 7 },
    // Nivo 14
    { rounds: 10, poolSize: 14, optionsCount: 8 },
    // Nivo 15 — finale: svi zvukovi, 8 opcija, 12 pitanja
    { rounds: 12, poolSize: 14, optionsCount: 8 },
];

function getLevelConfig(level: number): LevelConfig {
    return LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];
}

export default function SoundToImageGame({ childId, level, onComplete, autoStart, isMonitor, monitorState }: GameProps) {
    const [currentSound, setCurrentSound] = useState<SoundItem | null>(null);
    const [options, setOptions] = useState<SoundItem[]>([]);
    const [score, setScore] = useState(monitorState?.score || 0);
    const [round, setRound] = useState(monitorState?.round || 0);
    const [correctCount, setCorrectCount] = useState(monitorState?.correctCount || 0);
    const [incorrectCount, setIncorrectCount] = useState(monitorState?.incorrectCount || 0);
    const [isPlaying, setIsPlaying] = useState(isMonitor ? true : (monitorState?.isPlaying || false));
    const [startTime, setStartTime] = useState<number | null>(null);
    const [moodBefore, setMoodBefore] = useState<string | null>(null);
    const [showMoodBefore, setShowMoodBefore] = useState(false);
    const [showMoodAfter, setShowMoodAfter] = useState(false);
    const [gameCompleted, setGameCompleted] = useState(false);
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
    const [isPlayingSound, setIsPlayingSound] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const initialRoundRef = useRef(false);
    const cfg = getLevelConfig(level);
    const maxRounds = cfg.rounds;

    // Sync with monitor state
    useEffect(() => {
        if (isMonitor && monitorState) {
            if (monitorState.score !== undefined) setScore(monitorState.score);
            if (monitorState.round !== undefined) setRound(monitorState.round);
            if (monitorState.correctCount !== undefined) setCorrectCount(monitorState.correctCount);
            if (monitorState.incorrectCount !== undefined) setIncorrectCount(monitorState.incorrectCount);
            if (monitorState.currentSound) setCurrentSound(monitorState.currentSound);
            if (monitorState.options) setOptions(monitorState.options);
            if (monitorState.isPlaying !== undefined) setIsPlaying(monitorState.isPlaying);
        }
    }, [isMonitor, monitorState]);

    // Auto-start logic
    useEffect(() => {
        if (autoStart && !isMonitor && !isPlaying && round === 0) {
            handleMoodBeforeSelect("neutral");
        }
    }, [autoStart, isMonitor, isPlaying, round]);

    const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();
    const { speak, stopSpeech: stopTTS } = useSpeech();

    const stopSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        stopTTS();
        setIsPlayingSound(false);
    }, [stopTTS]);

    // Automatski pusti zvuk čim se postavi novi currentSound
    const autoPlaySoundRef = useRef<SoundItem | null>(null);

    const playSound = useCallback((item?: SoundItem) => {
        const target = item ?? currentSound;
        if (!target || isMonitor) return;

        setIsPlayingSound(true);

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const audio = new Audio(target.soundUrl);
        audioRef.current = audio;

        audio.play().catch(() => {
            audioRef.current = null;
            if (!isMonitor) speak(target.label, () => setIsPlayingSound(false), () => setIsPlayingSound(false));
            else setIsPlayingSound(false);
        });

        audio.onended = () => setIsPlayingSound(false);
        audio.onerror = () => {
            audioRef.current = null;
            if (!isMonitor) speak(target.label, () => setIsPlayingSound(false), () => setIsPlayingSound(false));
            else setIsPlayingSound(false);
        };
    }, [currentSound, isMonitor, speak]);

    const generateRound = useCallback((stats?: { score: number, round: number, correctCount: number, incorrectCount: number }) => {
        const { poolSize, optionsCount } = getLevelConfig(level);
        const pool = SOUND_ITEMS.slice(0, Math.min(poolSize, SOUND_ITEMS.length));

        const correctAnswer = pool[Math.floor(Math.random() * pool.length)];

        const allOthers = SOUND_ITEMS.filter(item => item.id !== correctAnswer.id);
        const wrongOptions = allOthers
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(optionsCount - 1, allOthers.length));

        const allOptions = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);

        setCurrentSound(correctAnswer);
        setOptions(allOptions);
        setFeedback(null);

        // Zapamti za auto-play
        autoPlaySoundRef.current = correctAnswer;

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

    // Auto-play zvuk nakon što se postavi novi currentSound
    useEffect(() => {
        if (!isPlaying || isMonitor || !currentSound) return;
        if (autoPlaySoundRef.current?.id === currentSound.id) {
            // Mali delay da se UI renderuje
            const t = setTimeout(() => {
                playSound(currentSound);
                autoPlaySoundRef.current = null;
            }, 600);
            return () => clearTimeout(t);
        }
    }, [currentSound, isPlaying, isMonitor, playSound]);

    useEffect(() => {
        if (isPlaying && !isMonitor && !initialRoundRef.current) {
            initialRoundRef.current = true;
            generateRound();
        }
    }, [isPlaying, generateRound, isMonitor]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            stopTTS();
        };
    }, [stopTTS]);

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
            isPlaying: true
        });
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

                if (autoStart) {
                    handleMoodAfterSelect("neutral");
                } else {
                    setTimeout(() => {
                        setShowMoodAfter(true);
                    }, 500);
                }
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

    // ── Mood Before Screen ──────────────────────────────────
    if (!isMonitor && showMoodBefore) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-in fade-in duration-500">
                <div className="text-center mb-10 md:mb-16">
                    <span className="px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Slušaj i prepoznaj</span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Kako se osećaš sada? ✨</h2>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 md:gap-8 w-full max-w-5xl px-2">
                    {[
                        { emoji: "😢", label: "Tužno",  color: "from-blue-400 to-indigo-500",   value: "very_upset" },
                        { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500",   value: "upset" },
                        { emoji: "😐", label: "Okej",   color: "from-emerald-400 to-teal-500",  value: "neutral" },
                        { emoji: "😊", label: "Dobro",  color: "from-amber-400 to-orange-500",  value: "happy" },
                        { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500",     value: "very_happy" },
                    ].map(mood => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodBeforeSelect(mood.value)}
                            className="group relative flex flex-col items-center bg-white rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] p-3 sm:p-5 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-100 rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] transition-opacity`}></div>
                            <span className="text-4xl sm:text-6xl md:text-7xl mb-1 sm:mb-2 md:mb-4 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
                            <span className="text-[10px] sm:text-sm md:text-lg font-black text-slate-700">{mood.label}</span>
                        </button>
                    ))}
                </div>

                {isConnected && (
                    <div className="mt-10 md:mt-16 flex items-center gap-3 px-4 py-2 md:px-6 md:py-3 bg-white/50 backdrop-blur-sm rounded-2xl border border-green-100 shadow-sm">
                        <span className="relative flex h-2 w-2 md:h-3 md:w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
                        </span>
                        <span className="text-[10px] md:text-sm font-bold text-green-700 tracking-wide uppercase">Spremni za praćenje</span>
                    </div>
                )}
            </div>
        );
    }

    // ── Mood After Screen ───────────────────────────────────
    if (!isMonitor && showMoodAfter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-in fade-in duration-500">
                <div className="text-center mb-10 md:mb-16">
                    <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Igra je završena!</span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 md:mb-4">Bravo! Kako si sada? 🌟</h2>
                    <p className="text-lg md:text-xl text-slate-500 font-medium tracking-wide">
                        Sjajno si prepoznao/la zvukove! Rezultat: <span className="font-bold text-emerald-600 underline decoration-2 underline-offset-4">{score} poena</span>.
                    </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 md:gap-8 w-full max-w-5xl px-2">
                    {[
                        { emoji: "😢", label: "Tužno",  color: "from-blue-400 to-indigo-500",   value: "very_upset" },
                        { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500",   value: "upset" },
                        { emoji: "😐", label: "Okej",   color: "from-emerald-400 to-teal-500",  value: "neutral" },
                        { emoji: "😊", label: "Dobro",  color: "from-amber-400 to-orange-500",  value: "happy" },
                        { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500",     value: "very_happy" },
                    ].map(mood => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodAfterSelect(mood.value)}
                            className="group relative flex flex-col items-center bg-white rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] p-3 sm:p-5 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-100 rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] transition-opacity`}></div>
                            <span className="text-4xl sm:text-6xl md:text-7xl mb-1 sm:mb-2 md:mb-4 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
                            <span className="text-[10px] sm:text-sm md:text-base font-black text-slate-700">{mood.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ── Start Screen ────────────────────────────────────────
    if (!isPlaying && round === 0) {
        return (
            <div className="relative min-h-[500px] w-full flex items-center justify-center overflow-hidden rounded-[2.5rem] shadow-lg"
                style={{ 
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.7)), url('/images/slusajispoji.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}>
                <div className="absolute top-12 left-12 text-6xl opacity-10 animate-pulse -rotate-12">🔊</div>
                <div className="absolute bottom-16 right-12 text-7xl opacity-10 animate-bounce rotate-12">🎵</div>
                <div className="absolute top-24 right-20 text-5xl opacity-10 animate-pulse rotate-45">👂</div>
                <div className="absolute bottom-24 left-24 text-6xl opacity-10 animate-bounce -rotate-6">🎶</div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl -ml-32 -mb-32"></div>

                <div className="relative z-10 w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">
                    <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
                        <span className="px-6 py-2.5 rounded-full bg-white/90 backdrop-blur-sm border border-cyan-100 text-cyan-600 text-sm font-black uppercase tracking-widest shadow-md">
                            Nivo {level} / 15
                        </span>
                    </div>

                    <div className="mb-10 relative group cursor-default">
                        <div className="absolute inset-0 bg-cyan-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <div className="relative w-40 h-40 bg-gradient-to-b from-white to-cyan-50 rounded-[2.5rem] shadow-xl border-4 border-white flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                            <span className="text-8xl drop-shadow-md">🔊</span>
                        </div>
                        <div className="absolute -top-4 -right-4 text-3xl animate-bounce delay-100">🎵</div>
                        <div className="absolute -bottom-4 -left-4 text-3xl animate-bounce delay-300">👂</div>
                    </div>

                    <h2 className="text-5xl font-black text-slate-900 mb-4 tracking-tight drop-shadow-md">Zvuk → Slika</h2>
                    <p className="text-slate-800 text-xl font-bold leading-relaxed mb-4 max-w-sm mx-auto">
                        Zvuk se pušta <span className="text-cyan-700 font-black">automatski</span> — izaberi tačnu sliku!
                    </p>
                    <p className="text-slate-600 text-sm font-bold mb-12 max-w-sm mx-auto bg-white/50 py-2 rounded-xl backdrop-blur-sm">
                        {cfg.rounds} pitanja · {cfg.optionsCount} ponuđena odgovora
                    </p>

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

    // ── Game Screen ─────────────────────────────────────────
    return (
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl md:rounded-[3rem] p-4 pt-6 md:p-10 shadow-2xl border border-white/50 w-full max-w-6xl mx-auto flex-1 flex flex-col animate-in fade-in duration-700 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none"></div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 md:mb-10 bg-gradient-to-r from-orange-50/50 to-white rounded-2xl md:rounded-[2.5rem] px-4 py-3 md:px-10 md:py-6 shadow-xl relative overflow-hidden ring-1 ring-orange-100/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                <div className="flex items-center gap-3 md:gap-8 relative z-10">
                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl bg-white shadow-md flex items-center justify-center text-xl md:text-3xl ring-4 ring-orange-50 border border-orange-100 transform -rotate-3">
                        🔊
                    </div>
                    <div>
                        <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-wide uppercase leading-tight">Nivo {level}</h3>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6 relative z-10">
                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl md:rounded-3xl px-4 py-2 md:px-8 md:py-3 border border-orange-100/50 text-center min-w-[80px] md:min-w-[120px]">
                        <span className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Runda</span>
                        <span className="text-xl md:text-3xl font-black text-orange-500">{round}<span className="text-slate-400 text-sm md:text-xl mx-1">/</span>{maxRounds}</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl md:rounded-3xl px-4 py-2 md:px-8 md:py-3 border border-orange-100/50 text-center min-w-[80px] md:min-w-[120px]">
                        <span className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Rezultat</span>
                        <span className="text-xl md:text-3xl font-black text-emerald-500">{score}</span>
                    </div>
                </div>
            </div>

            {/* Game Canvas */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 md:gap-12 pt-2 md:pt-4 relative z-10">

                {/* Sound Control */}
                <div className="text-center">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 md:mb-10 border border-slate-200">
                        Šta čuješ? Klikni na tačnu sliku!
                    </span>

                    {/* Dugme za ponovni play zvuka */}
                    <div className="flex justify-center">
                        <button
                            onClick={() => playSound()}
                            disabled={isPlayingSound || !currentSound}
                            title="Ponovo pusti zvuk"
                            className={`group relative w-28 h-28 md:w-40 md:h-40 rounded-full transition-all duration-500 ${isPlayingSound
                                ? "bg-slate-100 scale-95"
                                : "bg-white shadow-2xl hover:shadow-orange-200/50 hover:scale-110 active:scale-95"
                                }`}
                        >
                            <div className={`absolute inset-0 rounded-full bg-orange-500/10 transition-all duration-1000 ${isPlayingSound ? "animate-ping scale-150 opacity-0" : "scale-0 opacity-0"}`}></div>
                            <div className="relative z-10 flex flex-col items-center justify-center h-full border-4 border-slate-50 rounded-full">
                                <span className={`text-4xl md:text-6xl transition-all duration-500 ${isPlayingSound ? "scale-125 rotate-12" : "group-hover:scale-110"}`}>
                                    {isPlayingSound ? "🔊" : "🔈"}
                                </span>
                                <span className="mt-2 text-[8px] md:text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full">
                                    {isPlayingSound ? "Slušaj..." : "Ponovi"}
                                </span>
                            </div>
                        </button>
                    </div>

                    {feedback && (
                        <div className={`mt-4 md:mt-8 text-xl md:text-2xl font-black uppercase tracking-widest animate-bounce ${feedback === 'correct' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {feedback === 'correct' ? '✅ Tačno!' : '❌ Pokušaj ponovo'}
                        </div>
                    )}
                </div>

                {/* Options Grid */}
                <div className="w-full max-w-5xl px-2">
                    <div className={`grid gap-2 sm:gap-4 md:gap-8 mx-auto ${options.length <= 3
                        ? 'grid-cols-3'
                        : options.length <= 4
                            ? 'grid-cols-2 sm:grid-cols-4'
                            : options.length <= 6
                                ? 'grid-cols-3 sm:grid-cols-3'
                                : 'grid-cols-2 sm:grid-cols-4'
                        }`}>
                        {options.map((option, idx) => (
                            <button
                                key={`${option.id}-${idx}`}
                                onClick={() => handleAnswer(option)}
                                disabled={isMonitor || feedback === 'correct'}
                                className={`group relative bg-white rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 flex flex-col items-center justify-center transition-all duration-300 transform border shadow-sm ${feedback === 'correct' && option.id === currentSound?.id
                                    ? "border-emerald-400 bg-emerald-50 shadow-2xl scale-110 z-20 ring-4 ring-emerald-100"
                                    : feedback === 'incorrect' && option.id !== currentSound?.id
                                        ? "border-rose-100 opacity-40"
                                        : "border-slate-50 hover:border-orange-100 hover:shadow-xl hover:-translate-y-1 active:scale-95"
                                    }`}
                            >
                                <span className="text-4xl sm:text-6xl md:text-7xl mb-1 sm:mb-2 md:mb-4 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 select-none">
                                    {option.icon}
                                </span>
                                <span className="text-[10px] sm:text-xs md:text-base font-black text-slate-700 tracking-tight group-hover:text-orange-600 transition-colors uppercase text-center">
                                    {option.label}
                                </span>

                                {feedback === 'correct' && option.id === currentSound?.id && (
                                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-2 md:p-3 rounded-xl md:rounded-2xl shadow-lg animate-bounce border-2 md:border-4 border-white">
                                        <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest opacity-60 px-4 pb-4">
                💡 Svaki tačan odgovor te približava cilju!
            </div>
        </div>
    );
}
