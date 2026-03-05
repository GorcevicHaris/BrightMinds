"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameEmitter } from '@/lib/useSocket';

type ShapeType = "house" | "flower" | "sun" | "heart" | "star" | "diamond" | "moon" | "lightning";

interface Shape {
    id: number;
    type: ShapeType;
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

const COLORS: Record<ShapeType, string> = {
    house: "#FF8C69",
    flower: "#FF6EB4",
    sun: "#FFD700",
    heart: "#FF4D6D",
    star: "#A78BFA",
    diamond: "#22D3EE",
    moon: "#6EE7B7",
    lightning: "#FB923C",
};

const SHAPE_NAMES: Record<ShapeType, string> = {
    house: "Kućica",
    flower: "Cvet",
    sun: "Sunce",
    heart: "Srce",
    star: "Zvezda",
    diamond: "Dijamant",
    moon: "Polumesec",
    lightning: "Munja",
};

// All 8 shape types - level controls how many are used
const ALL_SHAPES: ShapeType[] = ["house", "flower", "sun", "heart", "star", "diamond", "moon", "lightning"];

// Beautiful SVG shapes rendered inside a 100x100 viewBox
function ShapeSVG({ type, color, size }: { type: ShapeType; color: string; size: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            className="drop-shadow-md transition-transform duration-200"
        >
            {type === "house" && (
                <g>
                    {/* Roof */}
                    <polygon points="50,8 88,40 12,40" fill={color} stroke="white" strokeWidth="2" strokeLinejoin="round" />
                    {/* Body */}
                    <rect x="20" y="40" width="60" height="50" rx="4" fill={color} stroke="white" strokeWidth="2" opacity="0.85" />
                    {/* Door */}
                    <rect x="38" y="62" width="24" height="28" rx="4" fill="white" opacity="0.7" />
                    {/* Window */}
                    <rect x="25" y="47" width="18" height="16" rx="3" fill="white" opacity="0.7" />
                    <rect x="57" y="47" width="18" height="16" rx="3" fill="white" opacity="0.7" />
                    {/* Chimney */}
                    <rect x="62" y="12" width="10" height="20" rx="2" fill={color} stroke="white" strokeWidth="1.5" />
                </g>
            )}
            {type === "flower" && (
                <g>
                    {/* Petals */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                        <ellipse
                            key={i}
                            cx={50 + 22 * Math.cos((angle * Math.PI) / 180)}
                            cy={50 + 22 * Math.sin((angle * Math.PI) / 180)}
                            rx="13"
                            ry="8"
                            transform={`rotate(${angle}, ${50 + 22 * Math.cos((angle * Math.PI) / 180)}, ${50 + 22 * Math.sin((angle * Math.PI) / 180)})`}
                            fill={color}
                            stroke="white"
                            strokeWidth="1.5"
                        />
                    ))}
                    {/* Center */}
                    <circle cx="50" cy="50" r="14" fill="#FFD700" stroke="white" strokeWidth="2" />
                    <circle cx="50" cy="50" r="7" fill="#FFA500" />
                </g>
            )}
            {type === "sun" && (
                <g>
                    {/* Rays */}
                    {Array.from({ length: 12 }, (_, i) => {
                        const angle = (i * 30 * Math.PI) / 180;
                        const x1 = 50 + 30 * Math.cos(angle);
                        const y1 = 50 + 30 * Math.sin(angle);
                        const x2 = 50 + 44 * Math.cos(angle);
                        const y2 = 50 + 44 * Math.sin(angle);
                        return (
                            <line
                                key={i}
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={color}
                                strokeWidth="4"
                                strokeLinecap="round"
                            />
                        );
                    })}
                    {/* Sun body */}
                    <circle cx="50" cy="50" r="26" fill={color} stroke="white" strokeWidth="2" />
                    {/* Face */}
                    <circle cx="42" cy="44" r="3.5" fill="white" opacity="0.9" />
                    <circle cx="58" cy="44" r="3.5" fill="white" opacity="0.9" />
                    <path d="M38,57 Q50,66 62,57" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </g>
            )}
            {type === "heart" && (
                <g>
                    <path
                        d="M50,82 C50,82 12,58 12,36 C12,22 22,14 34,17 C40,18 46,23 50,28 C54,23 60,18 66,17 C78,14 88,22 88,36 C88,58 50,82 50,82 Z"
                        fill={color}
                        stroke="white"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    {/* Shine */}
                    <ellipse cx="36" cy="32" rx="8" ry="5" fill="white" opacity="0.3" transform="rotate(-30, 36, 32)" />
                </g>
            )}
            {type === "star" && (
                <g>
                    <polygon
                        points={(() => {
                            const pts = [];
                            for (let i = 0; i < 5; i++) {
                                const outer = ((i * 72 - 90) * Math.PI) / 180;
                                const inner = (((i * 72 + 36) - 90) * Math.PI) / 180;
                                pts.push(`${50 + 42 * Math.cos(outer)},${50 + 42 * Math.sin(outer)}`);
                                pts.push(`${50 + 18 * Math.cos(inner)},${50 + 18 * Math.sin(inner)}`);
                            }
                            return pts.join(" ");
                        })()}
                        fill={color}
                        stroke="white"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    {/* Shine */}
                    <ellipse cx="38" cy="36" rx="9" ry="5" fill="white" opacity="0.3" transform="rotate(-20, 38, 36)" />
                </g>
            )}
            {type === "diamond" && (
                <g>
                    {/* Diamond body */}
                    <polygon
                        points="50,6 90,42 50,94 10,42"
                        fill={color}
                        stroke="white"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    {/* Facets */}
                    <polygon points="50,6 90,42 50,42" fill="white" opacity="0.15" />
                    <polygon points="10,42 50,42 50,6" fill="white" opacity="0.08" />
                    <line x1="10" y1="42" x2="90" y2="42" stroke="white" strokeWidth="1.5" opacity="0.5" />
                    <line x1="50" y1="6" x2="10" y2="42" stroke="white" strokeWidth="1" opacity="0.3" />
                    <line x1="50" y1="6" x2="90" y2="42" stroke="white" strokeWidth="1" opacity="0.3" />
                    {/* Shine */}
                    <ellipse cx="38" cy="30" rx="8" ry="4" fill="white" opacity="0.35" transform="rotate(-30, 38, 30)" />
                </g>
            )}
            {type === "moon" && (
                <g>
                    {/* Moon crescent */}
                    <path
                        d="M60,10 A40,40 0 1,0 60,90 A28,28 0 1,1 60,10 Z"
                        fill={color}
                        stroke="white"
                        strokeWidth="2"
                    />
                    {/* Stars beside moon */}
                    <circle cx="76" cy="22" r="3" fill="white" opacity="0.8" />
                    <circle cx="82" cy="40" r="2" fill="white" opacity="0.6" />
                    <circle cx="78" cy="58" r="2.5" fill="white" opacity="0.7" />
                    {/* Shine */}
                    <ellipse cx="38" cy="36" rx="7" ry="4" fill="white" opacity="0.25" transform="rotate(-10, 38, 36)" />
                </g>
            )}
            {type === "lightning" && (
                <g>
                    {/* Lightning bolt */}
                    <polygon
                        points="58,5 28,55 52,55 42,95 72,42 48,42"
                        fill={color}
                        stroke="white"
                        strokeWidth="2"
                        strokeLinejoin="round"
                    />
                    {/* Shine */}
                    <ellipse cx="48" cy="25" rx="6" ry="10" fill="white" opacity="0.25" transform="rotate(-15, 48, 25)" />
                </g>
            )}
        </svg>
    );
}

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

    // Sync with monitor state
    useEffect(() => {
        if (isMonitor && monitorState) {
            if (monitorState.shapes) setShapes(monitorState.shapes);
            if (monitorState.targetShape) setTargetShape(monitorState.targetShape);
            if (monitorState.score !== undefined) setScore(monitorState.score);
            if (monitorState.timeLeft !== undefined) setTimeLeft(monitorState.timeLeft);
            if (monitorState.feedback !== undefined) setFeedback(monitorState.feedback);
            if (monitorState.correctCount !== undefined) setCorrectCount(monitorState.correctCount);
            if (monitorState.incorrectCount !== undefined) setIncorrectCount(monitorState.incorrectCount);
            // Handle name mismatch from LiveMonitor
            if (monitorState.totalIncorrect !== undefined) setIncorrectCount(monitorState.totalIncorrect);
        }
    }, [isMonitor, monitorState]);

    const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();

    const generateShapes = useCallback(() => {
        // Broj dostupnih oblika raste sa nivoom: nivo 1-2 = 4 oblika, 3-5 = 6, 6+ = svih 8
        const availableCount = level <= 2 ? 4 : level <= 5 ? 6 : ALL_SHAPES.length;
        const availableShapes = ALL_SHAPES.slice(0, availableCount);

        const numShapes = Math.min(3 + level, 8); // Broj ponuđenih oblika
        const targetType = availableShapes[Math.floor(Math.random() * availableShapes.length)];

        const newShapes: Shape[] = Array.from({ length: numShapes }, (_, i) => {
            const type = i === 0 ? targetType : availableShapes[Math.floor(Math.random() * availableShapes.length)];
            return {
                id: i,
                type,
                color: COLORS[type],
                size: 70,
            };
        });

        const shuffled = newShapes.sort(() => Math.random() - 0.5);
        setShapes(shuffled);
        const newTarget = { id: -1, type: targetType, color: COLORS[targetType], size: 90 };
        setTargetShape(newTarget);

        if (!isMonitor) {
            emitGameProgress({
                childId,
                activityId: 1,
                gameType: 'shape_matching',
                event: 'progress',
                data: { shapes: shuffled, targetShape: newTarget, score, level, correctCount, incorrectCount },
                timestamp: new Date().toISOString(),
            });
        }
    }, [level, isMonitor, childId, score, correctCount, incorrectCount, emitGameProgress]);

    const startGame = () => setShowMoodBefore(true);

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
        emitGameStart(childId, 1, 'shape_matching', { level });
    };

    const handleShapeClick = (shape: Shape) => {
        if (!isPlaying || !targetShape || isMonitor) return;

        const isCorrect = shape.type === targetShape.type;

        if (isCorrect) {
            const newScore = score + 10;
            const newCorrect = correctCount + 1;
            setScore(newScore);
            setCorrectCount(newCorrect);
            setFeedback("correct");

            emitGameProgress({
                childId, activityId: 1, gameType: 'shape_matching', event: 'shape_placed',
                data: { shape: shape.type, correct: true, score: newScore, level, correctCount: newCorrect, incorrectCount, feedback: 'correct', shapes, targetShape, timeLeft },
                timestamp: new Date().toISOString(),
            });

            setTimeout(() => {
                setFeedback(null);
                generateShapes();
                // Očisti feedback i na monitoru
                emitGameProgress({
                    childId, activityId: 1, gameType: 'shape_matching', event: 'progress',
                    data: { feedback: null, score: newScore, level, correctCount: newCorrect, incorrectCount },
                    timestamp: new Date().toISOString(),
                });
            }, 600);
        } else {
            const newIncorrect = incorrectCount + 1;
            setIncorrectCount(newIncorrect);
            setFeedback("wrong");

            emitGameProgress({
                childId, activityId: 1, gameType: 'shape_matching', event: 'shape_placed',
                data: { shape: shape.type, correct: false, score, level, correctCount, incorrectCount: newIncorrect, feedback: 'wrong', shapes, targetShape, timeLeft },
                timestamp: new Date().toISOString(),
            });

            setTimeout(() => {
                setFeedback(null);
                // Očisti feedback i na monitoru
                emitGameProgress({
                    childId, activityId: 1, gameType: 'shape_matching', event: 'progress',
                    data: { feedback: null, score, level, correctCount, incorrectCount: newIncorrect },
                    timestamp: new Date().toISOString(),
                });
            }, 600);
        }
    };

    useEffect(() => {
        if (!isPlaying || timeLeft <= 0 || isMonitor) return;

        const timer = setInterval(() => {
            setTimeLeft((prev: number) => {
                const newTime = prev - 1;
                if (newTime > 0 && newTime % 10 === 0) {
                    emitGameProgress({
                        childId, activityId: 1, gameType: 'shape_matching', event: 'progress',
                        data: { timeLeft: newTime, score, level, correctCount, incorrectCount },
                        timestamp: new Date().toISOString(),
                    });
                }
                if (newTime <= 0) {
                    setIsPlaying(false);
                    emitGameComplete({
                        childId, activityId: 1, gameType: 'shape_matching', event: 'completed',
                        data: { finalScore: score, finalLevel: level, timeSpent: 60 },
                        timestamp: new Date().toISOString(),
                    });
                    setShowMoodAfter(true);
                    return 0;
                }
                return newTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isPlaying, timeLeft, score, level, childId, emitGameComplete]);

    const handleMoodAfterSelect = (mood: string) => {
        setShowMoodAfter(false);
        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 60;
        onComplete(score, duration, moodBefore, mood);
    };

    // ─── Mood Before ───────────────────────────────────────────
    if (!isMonitor && showMoodBefore) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-3xl p-8 shadow-xl">
                <h2 className="text-3xl font-bold text-purple-700 mb-8">Kako se osećaš PRE igre?</h2>
                <div className="grid grid-cols-5 gap-6">
                    {[
                        { emoji: "😢", label: "Loše", value: "very_upset" },
                        { emoji: "😕", label: "Nije sjajno", value: "upset" },
                        { emoji: "😐", label: "Okej", value: "neutral" },
                        { emoji: "😊", label: "Dobro", value: "happy" },
                        { emoji: "😄", label: "Super", value: "very_happy" },
                    ].map(mood => (
                        <button key={mood.value} onClick={() => handleMoodBeforeSelect(mood.value)}
                            className="flex flex-col items-center bg-white rounded-3xl p-6 hover:scale-110 transition-transform shadow-lg hover:shadow-2xl">
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

    // ─── Mood After ────────────────────────────────────────────
    if (!isMonitor && showMoodAfter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-green-100 via-yellow-100 to-orange-100 rounded-3xl p-8 shadow-xl">
                <h2 className="text-3xl font-bold text-green-700 mb-4">Kako se osećaš POSLE igre?</h2>
                <p className="text-xl text-gray-600 mb-8">Osvojio/la si <span className="font-bold text-purple-600">{score} poena</span>! 🎉</p>
                <div className="grid grid-cols-5 gap-6">
                    {[
                        { emoji: "😢", label: "Loše", value: "very_upset" },
                        { emoji: "😕", label: "Nije sjajno", value: "upset" },
                        { emoji: "😐", label: "Okej", value: "neutral" },
                        { emoji: "😊", label: "Dobro", value: "happy" },
                        { emoji: "😄", label: "Super", value: "very_happy" },
                    ].map(mood => (
                        <button key={mood.value} onClick={() => handleMoodAfterSelect(mood.value)}
                            className="flex flex-col items-center bg-white rounded-3xl p-6 hover:scale-110 transition-transform shadow-lg hover:shadow-2xl">
                            <span className="text-6xl mb-2">{mood.emoji}</span>
                            <span className="text-lg font-semibold text-gray-700">{mood.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ─── Start Screen ──────────────────────────────────────────
    if (!isPlaying && score === 0) {
        return (
            <div className="relative min-h-[500px] w-full flex items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 shadow-lg">
                {/* Floating shape decorations */}
                <div className="absolute top-8 left-10 opacity-10 animate-pulse rotate-12"><ShapeSVG type="house" color="#FF8C69" size={70} /></div>
                <div className="absolute top-6 right-12 opacity-10 animate-bounce -rotate-12"><ShapeSVG type="sun" color="#FFD700" size={80} /></div>
                <div className="absolute bottom-10 left-16 opacity-10 animate-bounce rotate-6"><ShapeSVG type="flower" color="#FF6EB4" size={65} /></div>
                <div className="absolute bottom-8 right-10 opacity-10 animate-pulse -rotate-6"><ShapeSVG type="heart" color="#FF4D6D" size={60} /></div>

                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl -ml-32 -mb-32"></div>

                <div className="relative z-10 w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">
                    <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
                        <span className="px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-emerald-100 text-emerald-600 text-sm font-black uppercase tracking-widest shadow-sm">
                            Nivo {level}
                        </span>
                    </div>

                    {/* Hero */}
                    <div className="mb-10 relative group cursor-default">
                        <div className="absolute inset-0 bg-emerald-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <div className="relative w-40 h-40 bg-gradient-to-b from-white to-emerald-50 rounded-[2.5rem] shadow-xl border-4 border-white flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                            <ShapeSVG type="star" color="#A78BFA" size={88} />
                        </div>
                        <div className="absolute -top-4 -right-4 animate-bounce delay-100"><ShapeSVG type="heart" color="#FF4D6D" size={36} /></div>
                        <div className="absolute -bottom-4 -left-4 animate-bounce delay-300"><ShapeSVG type="sun" color="#FFD700" size={34} /></div>
                    </div>

                    <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight drop-shadow-sm">Složi Oblik</h2>
                    <p className="text-slate-600 text-xl font-medium leading-relaxed mb-12 max-w-sm mx-auto">
                        Pronađi <span className="text-emerald-600 font-bold">isti oblik</span> i klikni na njega što brže možeš!
                    </p>

                    <button
                        onClick={startGame}
                        className="w-full max-w-sm group bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-1.5 transition-all duration-300 shadow-xl shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-1"
                    >
                        <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 flex items-center justify-center gap-4 h-full">
                            <span className="text-2xl font-bold tracking-wide">ZAPOČNI IGRU</span>
                            <div className="w-12 h-12 bg-white text-emerald-600 rounded-xl flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform shadow-inner">▶</div>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    // ─── End Screen ────────────────────────────────────────────
    if (!isPlaying && score > 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 rounded-3xl p-8 shadow-xl">
                <div className="text-center space-y-6">
                    <h2 className="text-5xl font-bold text-orange-600">🎉 Bravo!</h2>
                    <p className="text-3xl font-bold text-purple-700">Rezultat: {score} poena</p>
                    <div className="text-6xl">{score >= 80 ? "⭐⭐⭐" : score >= 50 ? "⭐⭐" : "⭐"}</div>
                    <button onClick={startGame}
                        className="px-12 py-4 text-xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:scale-110 transition-transform shadow-xl">
                        🔄 Igraj ponovo
                    </button>
                </div>
            </div>
        );
    }

    // ─── Game Screen ───────────────────────────────────────────
    return (
        <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-6 md:p-8 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur rounded-2xl p-4 md:p-6 shadow-lg">
                <div className="flex items-center gap-3">
                    <span className="text-2xl md:text-3xl font-bold text-purple-700">⭐ {score}</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-2xl md:text-3xl font-bold ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-blue-700'}`}>
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

            {/* Target shape */}
            {targetShape && (
                <div className="mb-8 text-center">
                    <p className="text-xl md:text-2xl font-bold text-gray-700 mb-4">Pronađi ovaj oblik:</p>
                    <div className="inline-flex flex-col items-center bg-white rounded-3xl px-10 py-6 shadow-xl border-4 border-purple-100">
                        <ShapeSVG type={targetShape.type} color={targetShape.color} size={90} />
                        <p className="text-xl font-bold mt-3" style={{ color: targetShape.color }}>
                            {SHAPE_NAMES[targetShape.type]}
                        </p>
                    </div>
                </div>
            )}

            {/* Feedback */}
            {feedback && (
                <div className={`text-center mb-4 text-3xl font-bold animate-bounce ${feedback === "correct" ? "text-green-600" : "text-red-600"}`}>
                    {feedback === "correct" ? "✅ Tačno!" : "❌ Pokušaj ponovo!"}
                </div>
            )}

            {/* Shape grid */}
            <div className={`grid gap-4 md:gap-6 max-w-3xl mx-auto ${shapes.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : shapes.length <= 6 ? 'grid-cols-3 md:grid-cols-3' : 'grid-cols-4 md:grid-cols-4'}`}>
                {shapes.map(shape => (
                    <button
                        key={shape.id}
                        onClick={() => handleShapeClick(shape)}
                        className={`group bg-white rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 active:scale-95 border-2 ${feedback === "correct" && targetShape?.type === shape.type
                            ? "border-green-400 bg-green-50 scale-110"
                            : feedback === "wrong"
                                ? "border-transparent"
                                : "border-transparent hover:border-purple-200"
                            }`}
                    >
                        <ShapeSVG type={shape.type} color={shape.color} size={70} />
                        <span className="mt-2 text-sm font-bold text-gray-500 group-hover:text-gray-700 transition-colors">
                            {SHAPE_NAMES[shape.type]}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}