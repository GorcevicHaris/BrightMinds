"use client";

import { useState, useEffect, useCallback } from "react";

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

export default function ShapeMatchingGame({ childId, level, onComplete }: GameProps) {
    const [shapes, setShapes] = useState<Shape[]>([]);
    const [targetShape, setTargetShape] = useState<Shape | null>(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [isPlaying, setIsPlaying] = useState(false);
    const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [moodBefore, setMoodBefore] = useState<string | null>(null);
    const [showMoodBefore, setShowMoodBefore] = useState(false);
    const [showMoodAfter, setShowMoodAfter] = useState(false);

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

        // Shuffle shapes
        const shuffled = newShapes.sort(() => Math.random() - 0.5);

        setShapes(shuffled);
        setTargetShape({ id: -1, type: targetType, color: COLORS[targetType], size: 80 });
    }, [level]);

    const startGame = () => {
        setShowMoodBefore(true); // Prvo prikaži mood selection
    };

    const handleMoodBeforeSelect = (mood: string) => {
        setMoodBefore(mood);
        setShowMoodBefore(false);
        setIsPlaying(true);
        setScore(0);
        setTimeLeft(60);
        setStartTime(Date.now());
        generateShapes();
    };

    const handleShapeClick = (shape: Shape) => {
        if (!isPlaying || !targetShape) return;

        if (shape.type === targetShape.type) {
            setScore(prev => prev + 10);
            setFeedback("correct");
            setTimeout(() => {
                setFeedback(null);
                generateShapes();
            }, 500);
        } else {
            setFeedback("wrong");
            setTimeout(() => setFeedback(null), 500);
        }
    };

    useEffect(() => {
        if (!isPlaying || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setIsPlaying(false);
                    setShowMoodAfter(true); // Prikaži mood after selection
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isPlaying, timeLeft]);

    const handleMoodAfterSelect = (mood: string) => {
        setShowMoodAfter(false);
        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 60;
        // Prosledi mood podatke u onComplete
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

    // Mood Before Screen
    if (showMoodBefore) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-3xl p-8 shadow-xl">
                <h2 className="text-3xl font-bold text-purple-700 mb-8">
                    Kako se osećaš PRE igre?
                </h2>
                <div className="grid grid-cols-5 gap-6">
                    {[
                        { emoji: "😢", label: "Loše", value: "very_upset" },
                        { emoji: "😕", label: "Nisu sjajno", value: "upset" },
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
            </div>
        );
    }

    // Mood After Screen
    if (showMoodAfter) {
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
                        { emoji: "😕", label: "Nisu sjajno", value: "upset" },
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
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 rounded-3xl p-8 shadow-xl">
                <div className="text-center space-y-6">
                    <h2 className="text-4xl font-bold text-purple-700">🎮 Složi Oblik</h2>
                    <p className="text-xl text-gray-700">Nivo {level}</p>
                    <p className="text-lg text-gray-600 max-w-md">
                        Pronađi i klikni na oblik koji se podudara sa prikazanim!
                    </p>
                    <button
                        onClick={startGame}
                        className="px-12 py-4 text-2xl font-bold text-white bg-gradient-to-r from-green-400 to-blue-500 rounded-full hover:scale-110 transition-transform shadow-xl"
                    >
                        ▶️ Počni igru
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
            {/* Header */}
            <div className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-purple-700">Poeni: {score}</span>
                    <span className="text-2xl">🏆</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-3xl font-bold text-blue-700">
                        ⏱️ {timeLeft}s
                    </span>
                </div>
            </div>

            {/* Target Shape */}
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

            {/* Feedback */}
            {feedback && (
                <div className={`text-center mb-4 text-4xl font-bold animate-bounce ${feedback === "correct" ? "text-green-600" : "text-red-600"
                    }`}>
                    {feedback === "correct" ? "✅ Tačno!" : "❌ Pokušaj ponovo"}
                </div>
            )}

            {/* Game Grid */}
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