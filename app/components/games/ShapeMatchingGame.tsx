"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameEmitter } from '@/lib/useSocket';

type ShapeType = "house" | "flower" | "sun" | "heart" | "star" | "diamond" | "moon" | "lightning" | "cloud" | "apple" | "car" | "tree" | "butterfly" | "balloon" | "fish";

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
    autoStart?: boolean;
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
    lightning: "#FFD700",
    cloud: "#94A3B8",
    apple: "#EF4444",
    car: "#3B82F6",
    tree: "#22C55E",
    butterfly: "#A855F7",
    balloon: "#F43F5E",
    fish: "#06B6D4",
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
    cloud: "Oblak",
    apple: "Jabuka",
    car: "Auto",
    tree: "Drvo",
    butterfly: "Leptir",
    balloon: "Balon",
    fish: "Riba",
};

// All 8 shape types - level controls how many are used
const ALL_SHAPES: ShapeType[] = ["house", "flower", "sun", "heart", "star", "diamond", "moon", "lightning", "cloud", "apple", "car", "tree", "butterfly", "balloon", "fish"];

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
                        d="M60,10 A40,40 0 1,0 60,90 A30,30 0 1,1 60,10 Z"
                        fill="#FDE047"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />
                    {/* Stars beside moon */}
                    <path d="M75,18 L77,24 L83,24 L78,28 L80,34 L75,30 L70,34 L72,28 L67,24 L73,24 Z" fill="white" opacity="0.9" />
                    <circle cx="85" cy="45" r="2" fill="white" opacity="0.6" />
                    <circle cx="78" cy="65" r="2.5" fill="white" opacity="0.7" />
                    {/* Shine */}
                    <ellipse cx="32" cy="36" rx="6" ry="12" fill="white" opacity="0.25" transform="rotate(-25, 32, 36)" />
                </g>
            )}
            {type === "lightning" && (
                <g>
                    <polygon
                        points="60,5 30,50 50,50 40,95 80,40 55,40"
                        fill={color}
                        stroke="white"
                        strokeWidth="3"
                        strokeLinejoin="round"
                    />
                    <ellipse cx="48" cy="25" rx="6" ry="10" fill="white" opacity="0.25" transform="rotate(-15, 48, 25)" />
                </g>
            )}
            {type === "butterfly" && (
                <g>
                    <path d="M50,40 Q30,10 15,30 Q10,50 30,60 Q10,70 15,90 Q30,110 50,80 Q70,110 85,90 Q90,70 70,60 Q90,50 85,30 Q70,10 50,40" fill={color} stroke="white" strokeWidth="2" />
                    <rect x="47" y="30" width="6" height="50" rx="3" fill="#1F2937" />
                    <line x1="47" y1="30" x2="40" y2="15" stroke="#1F2937" strokeWidth="1.5" />
                    <line x1="53" y1="30" x2="60" y2="15" stroke="#1F2937" strokeWidth="1.5" />
                </g>
            )}
            {type === "cloud" && (
                <g>
                    <path d="M25,65 A15,15 0 0,1 25,35 A20,20 0 0,1 60,30 A20,20 0 0,1 85,45 A15,15 0 0,1 75,75 Z" fill={color} stroke="white" strokeWidth="2" />
                    <ellipse cx="40" cy="45" rx="6" ry="3" fill="white" opacity="0.3" />
                </g>
            )}
            {type === "apple" && (
                <g>
                    <path d="M50,90 C25,90 10,70 10,45 C10,25 25,15 50,25 C75,15 90,25 90,45 C90,70 75,90 50,90 Z" fill={color} stroke="white" strokeWidth="2" />
                    <path d="M50,25 L50,10" stroke="#92400E" strokeWidth="4" strokeLinecap="round" />
                    <path d="M50,15 Q65,5 75,15" fill="#22C55E" stroke="white" strokeWidth="1" />
                </g>
            )}
            {type === "car" && (
                <g>
                    <path d="M10,70 L10,50 Q10,40 25,35 L40,20 Q45,15 80,15 L95,45 L95,70 Z" fill={color} stroke="white" strokeWidth="2" />
                    <circle cx="25" cy="75" r="10" fill="#1F2937" stroke="white" strokeWidth="2" />
                    <circle cx="75" cy="75" r="10" fill="#1F2937" stroke="white" strokeWidth="2" />
                    <rect x="45" y="25" width="30" height="15" fill="white" opacity="0.5" />
                </g>
            )}
            {type === "tree" && (
                <g>
                    <rect x="42" y="60" width="16" height="35" rx="2" fill="#92400E" />
                    <path d="M50,10 L20,70 L80,70 Z" fill={color} stroke="white" strokeWidth="2" />
                    <path d="M50,25 L25,60 L75,60 Z" fill={color} stroke="white" strokeWidth="2" opacity="0.8" />
                </g>
            )}
            {type === "balloon" && (
                <g>
                    <path d="M50,10 A35,40 0 1,0 50,90 A35,40 0 1,0 50,10 Z" fill={color} stroke="white" strokeWidth="2" />
                    <path d="M50,90 L50,110 Q50,120 60,125" fill="none" stroke="#94A3B8" strokeWidth="1.5" />
                    <polygon points="50,90 45,98 55,98" fill={color} stroke="white" strokeWidth="1" />
                </g>
            )}
            {type === "fish" && (
                <g>
                    <ellipse cx="45" cy="50" rx="35" ry="20" fill={color} stroke="white" strokeWidth="2" />
                    <path d="M75,50 L95,30 L95,70 Z" fill={color} stroke="white" strokeWidth="2" />
                    <circle cx="30" cy="45" r="4" fill="white" />
                    <circle cx="30" cy="45" r="2" fill="black" />
                </g>
            )}
        </svg>
    );
}

export default function ShapeMatchingGame({ childId, level, onComplete, autoStart, isMonitor, monitorState }: GameProps) {
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

    useEffect(() => {
        if (autoStart && !isMonitor && !isPlaying && score === 0) {
            handleMoodBeforeSelect("neutral"); // Default mood for auto-start
        }
    }, [autoStart, isMonitor, isPlaying, score]);

    const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();

    const generateShapes = useCallback(() => {
        const availableCount = Math.min(ALL_SHAPES.length, 3 + Math.floor(level / 2));
        const availableShapes = ALL_SHAPES.slice(0, availableCount);

        const numShapes = Math.min(2 + Math.floor(level / 3), 6); // Broj opcija na ekranu
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

                    if (autoStart) {
                        handleMoodAfterSelect("neutral"); // Default mood for auto-transition
                    } else {
                        setShowMoodAfter(true);
                    }
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
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-in fade-in duration-500">
                <div className="text-center mb-10 md:mb-16">
                    <span className="px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Mali upitnik</span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Kako se osećaš sada? ✨</h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-8 w-full max-w-5xl px-2">
                    {[
                        { emoji: "😢", label: "Tužno", color: "from-blue-400 to-indigo-500", value: "very_upset" },
                        { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500", value: "upset" },
                        { emoji: "😐", label: "Okej", color: "from-emerald-400 to-teal-500", value: "neutral" },
                        { emoji: "😊", label: "Dobro", color: "from-amber-400 to-orange-500", value: "happy" },
                        { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500", value: "very_happy" },
                    ].map(mood => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodBeforeSelect(mood.value)}
                            className="group relative flex flex-col items-center bg-white rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] p-3 sm:p-5 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-10 rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] transition-opacity`}></div>
                            <span className="text-4xl sm:text-6xl md:text-7xl mb-1 sm:mb-2 md:mb-4 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
                            <span className="text-xs sm:text-base md:text-lg font-black text-slate-700">{mood.label}</span>
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

    if (!isMonitor && showMoodAfter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl animate-in fade-in duration-500">
                <div className="text-center mb-10 md:mb-16">
                    <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] md:text-xs font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Igra je gotova!</span>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 md:mb-4">Bravo! Kako si sada? 🌟</h2>
                    <p className="text-lg md:text-xl text-slate-500 font-medium tracking-wide">
                        Sjajno si uradio/la zadatak! Osvojio/la si <span className="font-black text-emerald-600 underline decoration-2 underline-offset-4">{score} poena</span>.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 md:gap-8 w-full max-w-5xl px-2">
                    {[
                        { emoji: "😢", label: "Tužno", color: "from-blue-400 to-indigo-500", value: "very_upset" },
                        { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500", value: "upset" },
                        { emoji: "😐", label: "Okej", color: "from-emerald-400 to-teal-500", value: "neutral" },
                        { emoji: "😊", label: "Dobro", color: "from-amber-400 to-orange-500", value: "happy" },
                        { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500", value: "very_happy" },
                    ].map(mood => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodAfterSelect(mood.value)}
                            className="group relative flex flex-col items-center bg-white rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] p-3 sm:p-5 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-10 rounded-xl sm:rounded-[2rem] md:rounded-[2.5rem] transition-opacity`}></div>
                            <span className="text-4xl sm:text-6xl md:text-7xl mb-1 sm:mb-2 md:mb-4 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
                            <span className="text-xs sm:text-base md:text-lg font-black text-slate-700">{mood.label}</span>
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
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl md:rounded-[3rem] p-4 pt-6 md:p-10 shadow-2xl border border-white/50 w-full max-w-6xl mx-auto flex-1 flex flex-col animate-in fade-in duration-700 relative">

            {/* Soft background glow based on target shape */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none transition-colors duration-1000"
                style={{ backgroundColor: targetShape?.color || '#6366f1' }}
            ></div>

            {/* Compact Header Area */}
            <div className="flex justify-between items-center mb-6 md:mb-10 bg-gradient-to-r from-indigo-50/50 to-white rounded-2xl md:rounded-[2.5rem] px-4 py-3 md:px-10 md:py-6 shadow-xl relative overflow-hidden ring-1 ring-indigo-100/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                <div className="flex items-center gap-3 md:gap-8 relative z-10">
                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl bg-white shadow-md flex items-center justify-center text-xl md:text-3xl ring-4 ring-indigo-50 border border-indigo-100 transform -rotate-3 transition-transform">
                        ⭐
                    </div>
                    <div>
                        <h3 className="text-lg md:text-2xl font-black text-slate-800 tracking-wide uppercase">Nivo {level}</h3>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6 relative z-10">
                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl md:rounded-3xl px-4 py-2 md:px-8 md:py-3 border border-indigo-100/50 text-center min-w-[80px] md:min-w-[120px]">
                        <span className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Poeni</span>
                        <span className="text-xl md:text-3xl font-black text-indigo-600">{score}</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-xl md:rounded-3xl px-4 py-2 md:px-8 md:py-3 border border-indigo-100/50 text-center min-w-[70px] md:min-w-[100px]">
                        <span className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 md:mb-1">Vreme</span>
                        <span className={`text-xl md:text-3xl font-black ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>
                            {timeLeft}s
                        </span>
                    </div>
                </div>
            </div>

            {/* Game Main Area */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 md:gap-12 pt-2 md:pt-4 relative z-10">

                {/* Target prompt */}
                <div className="text-center">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-widest mb-4 md:mb-8 border border-slate-200">
                        Pronađi isti oblik
                    </span>

                    {targetShape && (
                        <div className="relative group">
                            <div className="absolute inset-0 bg-white rounded-2xl md:rounded-[3rem] blur-xl opacity-40"></div>
                            <div className="relative bg-white rounded-2xl md:rounded-[3rem] p-6 md:p-10 shadow-xl border-2 border-slate-50 flex flex-col items-center justify-center ring-1 ring-slate-100">
                                <ShapeSVG
                                    type={targetShape.type}
                                    color={targetShape.color}
                                    size={80}
                                />
                                <div
                                    className="mt-4 text-xl md:text-2xl font-black tracking-tight"
                                    style={{ color: targetShape.color }}
                                >
                                    {SHAPE_NAMES[targetShape.type]}
                                </div>
                                <div className="absolute -bottom-2 md:-bottom-3 px-4 py-1 md:px-6 md:py-1.5 bg-slate-900 rounded-full text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest shadow-lg">
                                    Cilj
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Multiple choice grid */}
                <div className="w-full max-w-5xl px-2">
                    <div className={`grid gap-2 sm:gap-4 md:gap-8 mx-auto ${shapes.length <= 4
                        ? 'grid-cols-2 lg:grid-cols-4'
                        : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
                        }`}>
                        {shapes.map((shape) => (
                            <button
                                key={shape.id}
                                onClick={() => handleShapeClick(shape)}
                                disabled={feedback !== null || isMonitor}
                                className={`group relative aspect-square bg-white rounded-2xl md:rounded-[2.5rem] p-3 md:p-6 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 border shadow-sm ${feedback === "correct" && targetShape?.type === shape.type
                                    ? "border-emerald-400 bg-emerald-50 shadow-2xl scale-110 z-20 ring-4 ring-emerald-100"
                                    : feedback === "wrong" && targetShape?.type !== shape.type
                                        ? "border-rose-100 opacity-40"
                                        : "border-slate-50 hover:border-indigo-100 hover:shadow-xl shadow-sm"
                                    }`}
                            >
                                <div className="transform transition-all duration-300 group-hover:rotate-6 scale-75 sm:scale-100">
                                    <ShapeSVG type={shape.type} color={shape.color} size={60} />
                                </div>

                                {feedback === "correct" && targetShape?.type === shape.type && (
                                    <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-2 md:p-3 rounded-full shadow-lg animate-bounce border-2 md:border-4 border-white">
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

            <div className="mt-8 text-center text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest opacity-60 px-4">
                💡 Brzina donosi više poena! Fokusiraj se na oblik i boju.
            </div>
        </div>
    );
}