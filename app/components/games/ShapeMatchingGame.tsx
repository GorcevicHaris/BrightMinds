"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameEmitter } from '@/lib/useSocket';

interface Shape {
    id: number;
    type: "circle" | "square" | "triangle" | "star";
    color: string;
    size: number;
}

interface GameProps {
    childId: number;
    level: number;
    onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => void;
    isMonitor?: boolean;
    monitorState?: any;
}

const COLORS = {
    circle: "#FF6B9D",
    square: "#4ECDC4",
    triangle: "#FFE66D",
    star: "#A8E6CF",
};

const SHAPE_NAMES = {
    circle: "Krug",
    square: "Kvadrat",
    triangle: "Trougao",
    star: "Zvezda",
};

export default function ShapeMatchingGame({ childId, level, onComplete, isMonitor, monitorState }: GameProps) {
    const [shapes, setShapes] = useState<Shape[]>(monitorState?.shapes || []);
    const [targetShape, setTargetShape] = useState<Shape | null>(monitorState?.targetShape || null);
    const [score, setScore] = useState(monitorState?.score || 0);
    const [timeLeft, setTimeLeft] = useState(monitorState?.timeLeft || 60);
    const [isPlaying, setIsPlaying] = useState(isMonitor ? true : false);
    const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [moodBefore, setMoodBefore] = useState<string | null>(null);
    const [showMoodBefore, setShowMoodBefore] = useState(false);
    const [showMoodAfter, setShowMoodAfter] = useState(false);
    const [correctCount, setCorrectCount] = useState(0);
    const [incorrectCount, setIncorrectCount] = useState(0);

    // Sync with monitor state if in monitor mode
    useEffect(() => {
        if (isMonitor && monitorState) {
            if (monitorState.shapes) setShapes(monitorState.shapes);
            if (monitorState.targetShape) setTargetShape(monitorState.targetShape);
            if (monitorState.score !== undefined) setScore(monitorState.score);
            if (monitorState.timeLeft !== undefined) setTimeLeft(monitorState.timeLeft);
            if (monitorState.feedback !== undefined) setFeedback(monitorState.feedback);
        }
    }, [isMonitor, monitorState]);

    // 🔴 WebSocket Hook
    const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();

    const generateShapes = useCallback(() => {
        const shapeTypes: Array<"circle" | "square" | "triangle" | "star"> =
            ["circle", "square", "triangle", "star"];

        const numShapes = Math.min(3 + level, 8);
        const targetType = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];

        const newShapes: Shape[] = Array.from({ length: numShapes }, (_, i) => {
            const type = i === 0 ? targetType : shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
            return {
                id: i,
                type,
                color: COLORS[type],
                size: 60 + Math.random() * 20,
            };
        });

        const shuffled = newShapes.sort(() => Math.random() - 0.5);

        setShapes(shuffled);
        const newTarget = { id: -1, type: targetType, color: COLORS[targetType], size: 80 };
        setTargetShape(newTarget);

        if (!isMonitor) {
            emitGameProgress({
                childId,
                activityId: 1,
                gameType: 'shape_matching',
                event: 'progress',
                data: {
                    shapes: shuffled,
                    targetShape: newTarget,
                    score,
                    level,
                    correctCount,
                    incorrectCount,
                },
                timestamp: new Date().toISOString(),
            });
        }
    }, [level, isMonitor, childId, score, correctCount, incorrectCount, emitGameProgress]);

    const startGame = () => {
        setShowMoodBefore(true);
    };

    const handleMoodBeforeSelect = (mood: string) => {
        setMoodBefore(mood);
        setShowMoodBefore(false);
        setIsPlaying(true);
        setScore(0);
        setTimeLeft(60);
        setStartTime(Date.now());
        setCorrectCount(0);
        setIncorrectCount(0);
        generateShapes();

        // 🔴 EMIT: Igra počela
        emitGameStart(childId, 1, 'shape_matching', {
            level,
            shapes: shapes,
            targetShape: targetShape
        });
    };

    const handleShapeClick = (shape: Shape) => {
        if (!isPlaying || !targetShape || isMonitor) return;

        const isCorrect = shape.type === targetShape.type;

        if (isCorrect) {
            const newScore = score + 10;
            setScore(newScore);
            setFeedback("correct");

            const newCorrect = correctCount + 1;
            setCorrectCount(newCorrect);

            emitGameProgress({
                childId,
                activityId: 1,
                gameType: 'shape_matching',
                event: 'shape_placed',
                data: {
                    shape: shape.type,
                    correct: true,
                    score: newScore,
                    level,
                    correctCount: newCorrect,
                    incorrectCount,
                    feedback: 'correct',
                    // Pošalji i trenutno stanje oblika (biće generisano novo u sledećem koraku)
                    shapes,
                    targetShape,
                    timeLeft,
                },
                timestamp: new Date().toISOString(),
            });

            setTimeout(() => {
                setFeedback(null);
                generateShapes();
            }, 500);
        } else {
            setFeedback("wrong");

            const newIncorrect = incorrectCount + 1;
            setIncorrectCount(newIncorrect);

            // 🔴 EMIT: Pogrešan odgovor
            emitGameProgress({
                childId,
                activityId: 1,
                gameType: 'shape_matching',
                event: 'shape_placed',
                data: {
                    shape: shape.type,
                    correct: false,
                    score,
                    level,
                    correctCount,
                    incorrectCount: newIncorrect,
                    feedback: 'wrong',
                    shapes,
                    targetShape,
                    timeLeft,
                },
                timestamp: new Date().toISOString(),
            });

            setTimeout(() => setFeedback(null), 500);
        }
    };

    useEffect(() => {
        if (!isPlaying || timeLeft <= 0 || isMonitor) return;

        const timer = setInterval(() => {
            setTimeLeft((prev: number) => {
                const newTime = prev - 1;
                // Svakih 10 sekundi pošalji "heartbeat" za vreme ako niko ne klikne
                if (newTime > 0 && newTime % 10 === 0) {
                    emitGameProgress({
                        childId,
                        activityId: 1,
                        gameType: 'shape_matching',
                        event: 'progress',
                        data: {
                            timeLeft: newTime,
                            score,
                            level,
                            correctCount,
                            incorrectCount,
                        },
                        timestamp: new Date().toISOString(),
                    });
                }

                if (newTime <= 0) {
                    setIsPlaying(false);

                    // 🔴 EMIT: Igra završena
                    emitGameComplete({
                        childId,
                        activityId: 1,
                        gameType: 'shape_matching',
                        event: 'completed',
                        data: {
                            finalScore: score,
                            finalLevel: level,
                            timeSpent: 60,
                        },
                        timestamp: new Date().toISOString(),
                    });

                    setShowMoodAfter(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isPlaying, timeLeft, score, level, childId, emitGameComplete]);

    const handleMoodAfterSelect = (mood: string) => {
        setShowMoodAfter(false);
        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 60;
        onComplete(score, duration, moodBefore, mood);
    };

    const renderShape = (shape: Shape) => {
        const commonProps = {
            fill: shape.color,
            className: "transition-transform hover:scale-110 cursor-pointer drop-shadow-lg",
        };

        switch (shape.type) {
            case "circle":
                return (
                    <circle
                        cx={shape.size / 2}
                        cy={shape.size / 2}
                        r={shape.size / 2 - 5}
                        {...commonProps}
                    />
                );
            case "square":
                return (
                    <rect
                        x="5"
                        y="5"
                        width={shape.size - 10}
                        height={shape.size - 10}
                        rx="8"
                        {...commonProps}
                    />
                );
            case "triangle":
                return (
                    <polygon
                        points={`${shape.size / 2},5 ${shape.size - 5},${shape.size - 5} 5,${shape.size - 5}`}
                        {...commonProps}
                    />
                );
            case "star":
                const points = [];
                for (let i = 0; i < 5; i++) {
                    const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
                    const x = shape.size / 2 + Math.cos(angle) * (shape.size / 2 - 5);
                    const y = shape.size / 2 + Math.sin(angle) * (shape.size / 2 - 5);
                    points.push(`${x},${y}`);
                }
                return <polygon points={points.join(" ")} {...commonProps} />;
        }
    };

    if (!isMonitor && showMoodBefore) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-3xl p-8 shadow-xl">
                <h2 className="text-3xl font-bold text-purple-700 mb-8">
                    Kako se osećaš PRE igre?
                </h2>
                <div className="grid grid-cols-5 gap-6">
                    {[
                        { emoji: "😢", label: "Loše", value: "very_upset" },
                        { emoji: "😕", label: "Nije sjajno", value: "upset" },
                        { emoji: "😐", label: "Okej", value: "neutral" },
                        { emoji: "😊", label: "Dobro", value: "happy" },
                        { emoji: "😄", label: "Super", value: "very_happy" },
                    ].map(mood => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodBeforeSelect(mood.value)}
                            className="flex flex-col items-center bg-white rounded-3xl p-6 hover:scale-110 transition-transform shadow-lg hover:shadow-2xl"
                        >
                            <span className="text-6xl mb-2">{mood.emoji}</span>
                            <span className="text-lg font-semibold text-gray-700">{mood.label}</span>
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

    if (!isMonitor && showMoodAfter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-green-100 via-yellow-100 to-orange-100 rounded-3xl p-8 shadow-xl">
                <h2 className="text-3xl font-bold text-green-700 mb-4">
                    Kako se osećaš POSLE igre?
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                    Osvojio/la si <span className="font-bold text-purple-600">{score} poena</span>! 🎉
                </p>
                <div className="grid grid-cols-5 gap-6">
                    {[
                        { emoji: "😢", label: "Loše", value: "very_upset" },
                        { emoji: "😕", label: "Nije sjajno", value: "upset" },
                        { emoji: "😐", label: "Okej", value: "neutral" },
                        { emoji: "😊", label: "Dobro", value: "happy" },
                        { emoji: "😄", label: "Super", value: "very_happy" },
                    ].map(mood => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodAfterSelect(mood.value)}
                            className="flex flex-col items-center bg-white rounded-3xl p-6 hover:scale-110 transition-transform shadow-lg hover:shadow-2xl"
                        >
                            <span className="text-6xl mb-2">{mood.emoji}</span>
                            <span className="text-lg font-semibold text-gray-700">{mood.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    if (!isPlaying && score === 0) {
        return (
            <div className="relative min-h-[500px] w-full flex items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 shadow-lg">

                {/* Background Decorations */}
                <div className="absolute top-10 left-10 text-6xl opacity-10 animate-pulse rotate-12">🔺</div>
                <div className="absolute bottom-10 right-10 text-8xl opacity-10 animate-bounce -rotate-12">🟦</div>
                <div className="absolute top-20 right-20 text-5xl opacity-10 animate-pulse rotate-45">🟢</div>
                <div className="absolute bottom-20 left-20 text-7xl opacity-10 animate-bounce -rotate-6">🔶</div>

                {/* Background Blobs (Softer) */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl -ml-32 -mb-32"></div>

                {/* Main Card Content */}
                <div className="relative z-10 w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">

                    {/* Floating Badge */}
                    <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
                        <span className="px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-emerald-100 text-emerald-600 text-sm font-black uppercase tracking-widest shadow-sm">
                            Nivo {level}
                        </span>
                    </div>

                    {/* Hero Icon */}
                    <div className="mb-10 relative group cursor-default">
                        <div className="absolute inset-0 bg-emerald-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <div className="relative w-40 h-40 bg-gradient-to-b from-white to-emerald-50 rounded-[2.5rem] shadow-xl border-4 border-white flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                            <span className="text-8xl drop-shadow-md">🔷</span>
                        </div>
                        {/* Decorative mini icons */}
                        <div className="absolute -top-4 -right-4 text-3xl animate-bounce delay-100">✨</div>
                        <div className="absolute -bottom-4 -left-4 text-3xl animate-bounce delay-300">🎮</div>
                    </div>

                    {/* Title & Description */}
                    <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight drop-shadow-sm">Složi Oblik</h2>
                    <p className="text-slate-600 text-xl font-medium leading-relaxed mb-12 max-w-sm mx-auto">
                        Pronađi oblik koji nedostaje i pokaži koliko si brz!
                    </p>

                    {/* Big Action Button */}
                    <button
                        onClick={startGame}
                        className="w-full max-w-sm group bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-1.5 transition-all duration-300 shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-1"
                    >
                        <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 flex items-center justify-center gap-4 h-full">
                            <span className="text-2xl font-bold tracking-wide">ZAPOČNI IGRU</span>
                            <div className="w-12 h-12 bg-white text-emerald-600 rounded-xl flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform shadow-inner">
                                ▶
                            </div>
                        </div>
                    </button>

                </div>
            </div>
        );
    }

    if (!isPlaying && score > 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 rounded-3xl p-8 shadow-xl">
                <div className="text-center space-y-6">
                    <h2 className="text-5xl font-bold text-orange-600">🎉 Bravo!</h2>
                    <p className="text-3xl font-bold text-purple-700">Rezultat: {score} poena</p>
                    <div className="text-6xl">
                        {score >= 80 ? "⭐⭐⭐" : score >= 50 ? "⭐⭐" : "⭐"}
                    </div>
                    <button
                        onClick={startGame}
                        className="px-12 py-4 text-xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:scale-110 transition-transform shadow-xl"
                    >
                        🔄 Igraj ponovo
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-purple-700">Poeni: {score}</span>
                    <span className="text-2xl">🏆</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-blue-700">
                        ⏱️ {timeLeft}s
                    </span>
                    {isConnected && (
                        <span className="text-sm text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live
                        </span>
                    )}
                </div>
            </div>
            {targetShape && (
                <div className="mb-8 text-center">
                    <p className="text-2xl font-bold text-gray-700 mb-4">
                        Pronađi ovaj oblik:
                    </p>
                    <div className="inline-flex flex-col items-center bg-white rounded-3xl p-6 shadow-xl">
                        <svg
                            width={targetShape.size}
                            height={targetShape.size}
                            className="mb-2"
                        >
                            {renderShape(targetShape)}
                        </svg>
                        <p className="text-xl font-semibold text-gray-700">
                            {SHAPE_NAMES[targetShape.type]}
                        </p>
                    </div>
                </div>
            )}
            {feedback && (
                <div className={`text-center mb-4 text-4xl font-bold animate-bounce ${feedback === "correct" ? "text-green-600" : "text-red-600"
                    }`}>
                    {feedback === "correct" ? "✅ Tačno!" : "❌ Pokušaj ponovo"}
                </div>
            )}
            <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                {shapes.map(shape => (
                    <button
                        key={shape.id}
                        onClick={() => handleShapeClick(shape)}
                        className="bg-white rounded-2xl p-6 hover:scale-105 transition-all shadow-lg hover:shadow-2xl"
                    >
                        <svg width={shape.size} height={shape.size} className="mx-auto">
                            {renderShape(shape)}
                        </svg>
                    </button>
                ))}
            </div>
        </div>
    );
}