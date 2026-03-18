"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useGameEmitter } from "@/lib/useSocket";
import { Star, AlertTriangle, X, Trophy, Lock, Navigation2, MapPin, Flag } from "lucide-react";

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────
interface GameProps {
    childId: number;
    level: number;
    onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => void;
    isMonitor?: boolean;
    monitorState?: any;
}


// ─────────────────────────────────────────────────────
const CX = [90, 280, 470, 660, 850];
const CY = [110, 280, 450, 620];
const N = (r: number, c: number) => `n${r}${c}`;

interface MapNode { id: string; x: number; y: number; neighbors: string[] }

const NODES: MapNode[] = (() => {
    const list: MapNode[] = [];
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 5; c++) {
            const nb: string[] = [];
            if (c > 0) nb.push(N(r, c - 1));
            if (c < 4) nb.push(N(r, c + 1));
            if (r > 0) nb.push(N(r - 1, c));
            if (r < 3) nb.push(N(r + 1, c));
            list.push({ id: N(r, c), x: CX[c], y: CY[r], neighbors: nb });
        }
    }
    return list;
})();

const getNode = (id: string): MapNode => NODES.find(n => n.id === id)!;

// ─────────────────────────────────────────────────────
// LEVEL DEFINITIONS
// Each level = one destination, increasing difficulty
// ─────────────────────────────────────────────────────
interface CP {
    nodeId: string;
    question: string;
    emoji: string;
    options: { label: string; icon: string; correct: boolean }[];
}
interface DE { nodeId: string; message: string; icon: string }
interface LevelDef {
    destination: string;    // shown as big title
    subtitle: string;       // shown as description
    icon: string;
    color: string;          // tailwind gradient
    startId: string;
    goalId: string;
    checkpoints: CP[];
    deadEnds: DE[];
}

const LEVELS: LevelDef[] = [
    // L1 — Bolnica  (start n00, goal n01 — 1 step, no CP, no DE)
    {
        destination: "Bolnica", subtitle: "Vozi se do bolnice! Kratka vožnja.", icon: "🏥",
        color: "from-rose-400 to-red-500",
        startId: N(0, 0), goalId: N(0, 1),
        checkpoints: [], deadEnds: [],
    },
    // L2 — Pekara  (start n00, goal n20 — 2 steps, 1 CP)
    {
        destination: "Pekara", subtitle: "Donesi svež hleb! Prođi jednu raskrsnicu.", icon: "🥐",
        color: "from-amber-400 to-orange-500",
        startId: N(0, 0), goalId: N(2, 0),
        checkpoints: [
            {
                nodeId: N(1, 0), question: "Šta nam treba da kupimo hleb?", emoji: "👛",
                options: [{ label: "Novčanik", icon: "👛", correct: true }, { label: "Lopta", icon: "⚽", correct: false }, { label: "Knjiga", icon: "📖", correct: false }]
            },
        ],
        deadEnds: [],
    },
    // L3 — Park  (start n04, goal n31 — 4 steps, 1 CP, 1 DE)
    {
        destination: "Park", subtitle: "Pronađi park i uživaj u igri!", icon: "🌳",
        color: "from-emerald-400 to-green-500",
        startId: N(0, 4), goalId: N(3, 1),
        checkpoints: [
            {
                nodeId: N(2, 2), question: "Šta nosimo u park?", emoji: "💧",
                options: [{ label: "Flaša vode", icon: "💧", correct: true }, { label: "Laptop", icon: "💻", correct: false }, { label: "Kaput", icon: "🧥", correct: false }]
            },
        ],
        deadEnds: [
            { nodeId: N(3, 4), message: "To je pogrešan kraj grada! Park je levo.", icon: "🏘️" },
        ],
    },
    // L4 — Škola  (start n30, goal n14 — 5 steps, 1 CP, 2 DE)
    {
        destination: "Škola", subtitle: "Vozi se do škole! Pazi na pogrešne skretanje.", icon: "🏫",
        color: "from-indigo-400 to-blue-500",
        startId: N(3, 0), goalId: N(1, 4),
        checkpoints: [
            {
                nodeId: N(1, 2), question: "Šta pakujemo u ranac za školu?", emoji: "🎒",
                options: [{ label: "Sveska i olovka", icon: "📓", correct: true }, { label: "Igračke", icon: "🧸", correct: false }, { label: "Slatkiši", icon: "🍬", correct: false }]
            },
        ],
        deadEnds: [
            { nodeId: N(0, 2), message: "Ovo je gore, škola je desno-gore!", icon: "⬆️" },
            { nodeId: N(2, 4), message: "Škola je jedan red gore. Nastavi!", icon: "⬆️" },
        ],
    },
    // L5 — Vatrogasna  (start n34, goal n10 — 6 steps, 2 CP, 1 DE)
    {
        destination: "Vatrogasna stanica", subtitle: "Do vatrogasaca kroz ceo grad!", icon: "🚒",
        color: "from-red-500 to-rose-600",
        startId: N(3, 4), goalId: N(1, 0),
        checkpoints: [
            {
                nodeId: N(2, 2), question: "Šta vatrogasci gase?", emoji: "🔥",
                options: [{ label: "Požar", icon: "🔥", correct: true }, { label: "Voda", icon: "💧", correct: false }, { label: "Vetar", icon: "🌬️", correct: false }]
            },
            {
                nodeId: N(2, 0), question: "Čime vatrogasci gase požar?", emoji: "🌊",
                options: [{ label: "Crevo sa vodom", icon: "🌊", correct: true }, { label: "Vejalica", icon: "🍃", correct: false }, { label: "Čekić", icon: "🔨", correct: false }]
            },
        ],
        deadEnds: [
            { nodeId: N(3, 3), message: "Vatrogasci su daleko levo, kreni ukoso!", icon: "🚦" },
        ],
    },
    // L6 — Biblioteka  (start n30, goal n03 — 7 steps, 2 CP, 2 DE)
    {
        destination: "Biblioteka", subtitle: "Knjige čekaju! Prolaz kroz ceo grad.", icon: "📚",
        color: "from-cyan-500 to-teal-600",
        startId: N(3, 0), goalId: N(0, 3),
        checkpoints: [
            {
                nodeId: N(2, 1), question: "Šta radimo u biblioteci?", emoji: "📖",
                options: [{ label: "Tiho čitamo knjige", icon: "📖", correct: true }, { label: "Glasno pevamo", icon: "🎤", correct: false }, { label: "Jedemo", icon: "🍕", correct: false }]
            },
            {
                nodeId: N(0, 1), question: "Šta radimo s knjigom kada je pročitamo?", emoji: "🔖",
                options: [{ label: "Vraćamo je na vreme", icon: "🔖", correct: true }, { label: "Zadržimo je", icon: "🏠", correct: false }, { label: "Bacamo je", icon: "🗑️", correct: false }]
            },
        ],
        deadEnds: [
            { nodeId: N(1, 0), message: "Biblioteka je gore-desno, ne dole!", icon: "↗️" },
            { nodeId: N(3, 3), message: "Otišao si predaleko desno! Vrati se.", icon: "↩️" },
        ],
    },
    // L7 — Bioskop  (start n00, goal n24 — 6 steps, 2 CP, 3 DE)
    {
        destination: "Bioskop", subtitle: "Do bioskopa kroz pun grad! Mnogo izazova.", icon: "🎬",
        color: "from-purple-500 to-violet-600",
        startId: N(0, 0), goalId: N(2, 4),
        checkpoints: [
            {
                nodeId: N(1, 2), question: "Šta nosimo u bioskop?", emoji: "🎟️",
                options: [{ label: "Karta za film", icon: "🎟️", correct: true }, { label: "Knjiga", icon: "📚", correct: false }, { label: "Lopta", icon: "⚽", correct: false }]
            },
            {
                nodeId: N(2, 3), question: "Kako se ponašamo u bioskopu?", emoji: "🤫",
                options: [{ label: "Tiho gledamo", icon: "🤫", correct: true }, { label: "Glasno pričamo", icon: "📣", correct: false }, { label: "Koristimo telefon", icon: "📱", correct: false }]
            },
        ],
        deadEnds: [
            { nodeId: N(0, 3), message: "Bioskop je dole-desno!", icon: "⬇️" },
            { nodeId: N(1, 4), message: "Previše gore, bioskop je jedan red dole.", icon: "⬇️" },
            { nodeId: N(3, 4), message: "Otišao si do dna! Bioskop je gore.", icon: "⬆️" },
        ],
    },
    // L8 — Gradska Kuća  (start n04, goal n32 — 8+ steps, 3 CP, 3 DE)
    {
        destination: "Gradska Kuća", subtitle: "Najtežji nivo! Prođi ceo grad.", icon: "🏛️",
        color: "from-slate-700 to-gray-900",
        startId: N(0, 4), goalId: N(3, 2),
        checkpoints: [
            {
                nodeId: N(0, 2), question: "Šta je na gradskom trgu?", emoji: "⛲",
                options: [{ label: "Fontana i klupe", icon: "⛲", correct: true }, { label: "Fabrika", icon: "🏭", correct: false }, { label: "Farma", icon: "🐄", correct: false }]
            },
            {
                nodeId: N(2, 2), question: "Kako se krećemo gradom?", emoji: "🚦",
                options: [{ label: "Poštujemo semafor", icon: "🚦", correct: true }, { label: "Trčimo kroz crveno", icon: "🏃", correct: false }, { label: "Gledamo telefon", icon: "📱", correct: false }]
            },
            {
                nodeId: N(3, 1), question: "Gde možemo parkirati auto?", emoji: "🅿️",
                options: [{ label: "Na parkingu", icon: "🅿️", correct: true }, { label: "Na trotoaru", icon: "🚶", correct: false }, { label: "Usred puta", icon: "🛣️", correct: false }]
            },
        ],
        deadEnds: [
            { nodeId: N(1, 4), message: "Ovo je škola, nastavi dole.", icon: "🏫" },
            { nodeId: N(3, 3), message: "Gradska Kuća je levo od tebe!", icon: "⬅️" },
            { nodeId: N(2, 0), message: "Predaleko levo! Kreni ka centru.", icon: "↩️" },
        ],
    },
];

// ─────────────────────────────────────────────────────
// DECORATIVE CITY BLOCKS
// ─────────────────────────────────────────────────────
const BLOCKS = [
    { x: 116, y: 126, w: 138, h: 118, fill: "#dcfce7", stroke: "#86efac", emoji: "🏠", sz: 44 },
    { x: 306, y: 126, w: 128, h: 118, fill: "#fee2e2", stroke: "#fca5a5", emoji: "🏥", sz: 44 },
    { x: 496, y: 126, w: 128, h: 118, fill: "#fef3c7", stroke: "#fcd34d", emoji: "⛪", sz: 40 },
    { x: 686, y: 126, w: 128, h: 118, fill: "#ede9fe", stroke: "#c4b5fd", emoji: "📚", sz: 40 },
    { x: 116, y: 296, w: 138, h: 118, fill: "#fff7ed", stroke: "#fdba74", emoji: "🚒", sz: 40 },
    { x: 306, y: 296, w: 128, h: 118, fill: "#f0f9ff", stroke: "#7dd3fc", emoji: "🏦", sz: 40 },
    { x: 496, y: 296, w: 128, h: 118, fill: "#fdf4ff", stroke: "#e879f9", emoji: "🎭", sz: 40 },
    { x: 686, y: 296, w: 128, h: 118, fill: "#fefce8", stroke: "#fde047", emoji: "🏫", sz: 44 },
    { x: 116, y: 466, w: 138, h: 118, fill: "#f0fdf4", stroke: "#86efac", emoji: "🥐", sz: 40 },
    { x: 306, y: 466, w: 128, h: 118, fill: "#f8fafc", stroke: "#94a3b8", emoji: "🍕", sz: 40 },
    { x: 496, y: 466, w: 128, h: 118, fill: "#ecfdf5", stroke: "#6ee7b7", emoji: "⛲", sz: 44 },
    { x: 686, y: 466, w: 128, h: 118, fill: "#fff1f2", stroke: "#fda4af", emoji: "🎬", sz: 40 },
    { x: 116, y: 636, w: 138, h: 74, fill: "#dcfce7", stroke: "#86efac", emoji: "🌳", sz: 48 },
    { x: 306, y: 636, w: 128, h: 74, fill: "#fef3c7", stroke: "#fcd34d", emoji: "🛝", sz: 40 },
    { x: 496, y: 636, w: 128, h: 74, fill: "#dbeafe", stroke: "#93c5fd", emoji: "🏛️", sz: 44 },
    { x: 686, y: 636, w: 128, h: 74, fill: "#f5f3ff", stroke: "#c4b5fd", emoji: "🌳", sz: 48 },
];

// ─────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────
type Phase = "preview" | "mood_before" | "playing" | "checkpoint" | "dead_end" | "win" | "mood_after";

const DE_PENALTY = 20; // points deducted for wrong path

export default function CityNavigatorGame({ childId, level, onComplete, isMonitor, monitorState }: GameProps) {
    const lvl = LEVELS[Math.min(level - 1, LEVELS.length - 1)];

    // Use refs for values needed inside setTimeout to avoid stale closures
    const curIdRef = useRef(lvl.startId);
    const prevIdRef = useRef(lvl.startId);
    const phaseRef = useRef<Phase>("preview");
    const isMovingRef = useRef(false);
    const scoreRef = useRef(0);

    // Character position for smooth animation (SVG coordinates)
    const [charPos, setCharPos] = useState({ x: getNode(lvl.startId).x, y: getNode(lvl.startId).y });
    const [charMoving, setCharMoving] = useState(false);

    const [phase, setPhaseState] = useState<Phase>(monitorState?.phase || "preview");
    const [moodBefore, setMoodBefore] = useState<string | null>(monitorState?.moodBefore || null);
    const [startTime, setStartTime] = useState(0);
    const [curId, setCurIdState] = useState(monitorState?.curId || lvl.startId);
    const [unlockedCPs, setUnlockedCPs] = useState<Set<string>>(new Set(monitorState?.unlockedCPs || []));
    const [visitedDE, setVisitedDE] = useState<Set<string>>(new Set(monitorState?.visitedDE || []));
    const [activeCP, setActiveCP] = useState<CP | null>(monitorState?.activeCP || null);
    const [activeDE, setActiveDE] = useState<DE | null>(monitorState?.activeDE || null);
    const [score, setScore] = useState(monitorState?.score || 0);
    const [steps, setSteps] = useState(monitorState?.steps || 0);
    const [facingLeft, setFacingLeft] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [shake, setShake] = useState(false);
    const [wrongIdx, setWrongIdx] = useState<number | null>(null);
    const [blockedNodes, setBlockedNodes] = useState<Set<string>>(new Set(monitorState?.blockedNodes || []));

    // Statistics
    const [correctCount, setCorrectCount] = useState(monitorState?.correctCount || 0);
    const [incorrectCount, setIncorrectCount] = useState(monitorState?.incorrectCount || 0);

    const { emitGameStart, emitGameProgress, emitGameComplete } = useGameEmitter();

    // Monitor Sync
    useEffect(() => {
        if (isMonitor && monitorState) {
            if (monitorState.curId) {
                curIdRef.current = monitorState.curId;
                setCurIdState(monitorState.curId);
                const node = getNode(monitorState.curId);
                setCharPos({ x: node.x, y: node.y });
            }
            if (monitorState.phase) setPhaseState(monitorState.phase);
            if (monitorState.score !== undefined) {
                scoreRef.current = monitorState.score;
                setScore(monitorState.score);
            }
            if (monitorState.steps !== undefined) setSteps(monitorState.steps);
            if (monitorState.unlockedCPs) setUnlockedCPs(new Set(monitorState.unlockedCPs));
            if (monitorState.visitedDE) setVisitedDE(new Set(monitorState.visitedDE));
            if (monitorState.blockedNodes) setBlockedNodes(new Set(monitorState.blockedNodes));
            if (monitorState.correctCount !== undefined) setCorrectCount(monitorState.correctCount);
            if (monitorState.incorrectCount !== undefined) setIncorrectCount(monitorState.incorrectCount);
        }
    }, [isMonitor, monitorState]);

    // Sync ref helpers
    const setPhase = (p: Phase) => { phaseRef.current = p; setPhaseState(p); };
    const setCurId = (id: string) => { curIdRef.current = id; setCurIdState(id); };

    // Reset when level changes
    useEffect(() => {
        const l = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
        curIdRef.current = l.startId;
        prevIdRef.current = l.startId;
        phaseRef.current = "preview";
        isMovingRef.current = false;
        const startNode = getNode(l.startId);
        setCurIdState(l.startId);
        setCharPos({ x: startNode.x, y: startNode.y });
        setPhaseState("preview");
        setUnlockedCPs(new Set());
        setVisitedDE(new Set());
        setBlockedNodes(new Set());
        setScore(0);
        scoreRef.current = 0;
        setSteps(0);
        setCorrectCount(0);
        setIncorrectCount(0);
        setFacingLeft(false);
        setIsMoving(false);
        setCharMoving(false);
        setActiveCP(null);
        setActiveDE(null);
        setMoodBefore(null);
    }, [level]);

    const doShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };
    const beginPlay = (mood: string) => {
        setMoodBefore(mood);
        setStartTime(Date.now());
        emitGameStart(childId, 7, "social-story" as any, { level });
        setPhase("playing");
    };

    const handleNodeClick = useCallback((targetId: string) => {
        // Use refs to read current values without stale closure
        if (phaseRef.current !== "playing") return;
        if (isMonitor) return;
        if (isMovingRef.current) return;
        if (targetId === curIdRef.current) return;

        const curNode = getNode(curIdRef.current);
        if (!curNode.neighbors.includes(targetId)) return;

        const tgtNode = getNode(targetId);
        setFacingLeft(tgtNode.x < curNode.x);
        isMovingRef.current = true;
        setIsMoving(true);
        setCharMoving(true);

        // Animate character moving TO target node
        setCharPos({ x: tgtNode.x, y: tgtNode.y });

        setTimeout(() => {
            isMovingRef.current = false;
            setIsMoving(false);
            setCharMoving(false);
            prevIdRef.current = curIdRef.current;
            setCurId(targetId);

            // Check what's at targetId
            const cpDef = lvl.checkpoints.find(cp => cp.nodeId === targetId);
            const deDef = lvl.deadEnds.find(de => de.nodeId === targetId);
            const cpUnlocked = unlockedCPs.has(targetId);
            const isGoal = targetId === lvl.goalId;

            const nextPhase: Phase = (cpDef && !cpUnlocked) ? "checkpoint" : (deDef && !visitedDE.has(targetId)) ? "dead_end" : isGoal ? "win" : "playing";

            emitGameProgress({
                childId,
                activityId: 7,
                gameType: "social-story" as any,
                event: "progress",
                data: {
                    curId: targetId,
                    phase: nextPhase,
                    score: scoreRef.current,
                    steps: steps + 1,
                    moves: steps + 1,
                    unlockedCPs: Array.from(unlockedCPs),
                    visitedDE: Array.from(visitedDE),
                    blockedNodes: Array.from(blockedNodes),
                    correctCount: correctCount,
                    incorrectCount: incorrectCount
                },
                timestamp: new Date().toISOString()
            });

            if (cpDef && !cpUnlocked) {
                setActiveCP(cpDef);
                setPhase("checkpoint");
                return;
            }

            if (deDef && !visitedDE.has(targetId)) {
                const newIncorrect = incorrectCount + 1;
                setIncorrectCount(newIncorrect);
                setVisitedDE(prev => new Set([...prev, targetId]));
                setBlockedNodes(prev => new Set([...prev, targetId]));
                setActiveDE(deDef);
                doShake();
                const newScore = Math.max(0, scoreRef.current - DE_PENALTY);
                scoreRef.current = newScore;
                setScore(newScore);
                setPhase("dead_end");
                // Immediately emit that we hit a dead end (incorrect)
                emitGameProgress({
                    childId, activityId: 7, gameType: "social-story" as any, event: "progress",
                    data: {
                        curId: targetId, phase: "dead_end",
                        score: newScore, steps: steps + 1, moves: steps + 1,
                        correctCount: correctCount, incorrectCount: newIncorrect,
                        visitedDE: Array.from(new Set([...visitedDE, targetId])),
                        blockedNodes: Array.from(new Set([...blockedNodes, targetId]))
                    }, timestamp: new Date().toISOString()
                });
                return;
            }

            setSteps((s: number) => s + 1);

            if (isGoal) {
                const finalScore = scoreRef.current + 100 + lvl.checkpoints.length * 25;
                scoreRef.current = finalScore;
                setScore(finalScore);
                emitGameComplete({
                    childId, activityId: 7, gameType: "social-story" as any, event: "completed",
                    data: { finalScore, correctCount, incorrectCount, moves: steps }, timestamp: new Date().toISOString()
                });
                setTimeout(() => setPhase("win"), 300);
            }
        }, 500);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lvl, unlockedCPs, visitedDE, isMonitor, steps, blockedNodes, childId, emitGameComplete, emitGameProgress]);

    const handleCPAnswer = (correct: boolean, idx: number) => {
        const newIncorrect = incorrectCount + 1;
        if (!correct) {
            setIncorrectCount(newIncorrect);
            doShake(); setWrongIdx(idx);
            setTimeout(() => setWrongIdx(null), 700);

            emitGameProgress({
                childId, activityId: 7, gameType: "social-story" as any, event: "answer",
                data: {
                    curId: curIdRef.current, phase: "checkpoint",
                    score: scoreRef.current, steps: steps, moves: steps,
                    correct: false, correctCount: correctCount, incorrectCount: newIncorrect
                }, timestamp: new Date().toISOString()
            });
            return;
        }

        const newUnlocked = new Set([...unlockedCPs, curIdRef.current]);
        setUnlockedCPs(newUnlocked);
        const newCorrectCount = correctCount + 1;
        setCorrectCount(newCorrectCount);

        const newScore = scoreRef.current + 50;
        scoreRef.current = newScore;
        setScore(newScore);
        const newSteps = steps + 1;
        setSteps((s: number) => s + 1);

        emitGameProgress({
            childId,
            activityId: 7,
            gameType: "social-story" as any,
            event: "answer",
            data: {
                curId: curIdRef.current,
                phase: "playing",
                score: newScore,
                steps: newSteps,
                moves: newSteps,
                unlockedCPs: Array.from(newUnlocked),
                correct: true,
                correctCount: newCorrectCount,
                incorrectCount: incorrectCount
            },
            timestamp: new Date().toISOString()
        });

        setActiveCP(null);
        setPhase("playing");
    };

    const handleDEBack = () => {
        const prevNode = getNode(prevIdRef.current);
        setCharPos({ x: prevNode.x, y: prevNode.y });
        setCurId(prevIdRef.current);
        setActiveDE(null);
        setPhase("playing");

        emitGameProgress({
            childId,
            activityId: 7,
            gameType: "social-story" as any,
            event: "progress",
            data: {
                curId: prevIdRef.current,
                phase: "playing",
                score: scoreRef.current,
                steps: steps,
                moves: steps,
                correctCount: correctCount,
                incorrectCount: incorrectCount,
                visitedDE: Array.from(visitedDE),
                blockedNodes: Array.from(blockedNodes),
            },
            timestamp: new Date().toISOString()
        });
    };

    const handleMoodAfter = (mood: string) => {
        const dur = Math.floor((Date.now() - startTime) / 1000);
        onComplete(score, dur, moodBefore, mood);
    };

    // Live values for rendering
    const curNode = getNode(curId);
    const reachable = new Set(
        curNode.neighbors.filter(id => !blockedNodes.has(id))
    );

    // ── PREVIEW ─────────────────────────────────────
    if (phase === "preview") {
        return (
            <div className="w-full flex-1 flex flex-col items-center justify-center gap-8 p-8 md:p-14 bg-white rounded-[4rem] shadow-2xl text-center">
                <div className={`w-40 h-40 rounded-[3.5rem] bg-gradient-to-br ${lvl.color} flex items-center justify-center shadow-2xl`}
                    style={{ fontSize: 80 }}>
                    {lvl.icon}
                </div>
                <div>
                    <div className="inline-flex items-center gap-2 bg-slate-100 px-5 py-2 rounded-full mb-4 text-xs font-black text-slate-500 uppercase tracking-widest">
                        <Navigation2 size={12} /> Putovanje {level} od 8
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-3 tracking-tight">{lvl.destination}</h1>
                    <p className="text-lg md:text-xl text-slate-500 max-w-md mx-auto italic leading-relaxed">{lvl.subtitle}</p>
                </div>
                <div className="flex gap-4 flex-wrap justify-center text-sm font-black">
                    {lvl.checkpoints.length > 0 && (
                        <div className="flex items-center gap-2 bg-indigo-50 border-2 border-indigo-100 px-5 py-3 rounded-2xl text-indigo-700">
                            <Lock size={14} /> {lvl.checkpoints.length} zadatak{lvl.checkpoints.length > 1 ? "a" : ""}
                        </div>
                    )}
                    {lvl.deadEnds.length > 0 && (
                        <div className="flex items-center gap-2 bg-rose-50 border-2 border-rose-100 px-5 py-3 rounded-2xl text-rose-700">
                            <AlertTriangle size={14} /> {lvl.deadEnds.length} zamk{lvl.deadEnds.length > 1 ? "e" : "a"}
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-amber-50 border-2 border-amber-100 px-5 py-3 rounded-2xl text-amber-700">
                        <Star size={14} className="fill-amber-500" /> Do {100 + lvl.checkpoints.length * 75} poena
                    </div>
                </div>
                <button
                    onClick={() => setPhase("mood_before")}
                    className={`px-14 py-7 bg-gradient-to-br ${lvl.color} text-white text-2xl font-black rounded-[2.5rem] shadow-2xl hover:scale-105 active:scale-95 transition-all`}
                >
                    KREĆEMO! 🚗
                </button>
            </div>
        );
    }

    // ── MOOD ────────────────────────────────────────
    if (phase === "mood_before" || phase === "mood_after") {
        const isAfter = phase === "mood_after";
        return (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-10 bg-white rounded-[4rem] shadow-2xl text-center">
                {isAfter && <Trophy className="text-amber-500 w-20 h-20 mb-6 mx-auto animate-bounce" />}
                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                    {isAfter ? "Stigli smo! Bravo! 🎉" : "Kako se osećaš?"}
                </h2>
                {isAfter && (
                    <p className="text-slate-500 text-xl mb-8">
                        {lvl.destination} pronađena! <strong>{steps} koraka</strong>, <strong>{score} ⭐</strong>
                    </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
                    {[{ e: "😢", v: "very_upset" }, { e: "😐", v: "neutral" }, { e: "😊", v: "happy" }, { e: "😄", v: "very_happy" }].map(m => (
                        <button key={m.v}
                            onClick={() => isAfter ? handleMoodAfter(m.v) : beginPlay(m.v)}
                            className="p-8 bg-slate-50 hover:bg-white hover:shadow-2xl hover:scale-110 border-4 border-transparent hover:border-slate-100 rounded-[2.5rem] transition-all text-7xl"
                        >{m.e}</button>
                    ))}
                </div>
            </div>
        );
    }

    // ── WIN ─────────────────────────────────────────
    if (phase === "win") {
        return (
            <div className="w-full flex-1 flex flex-col items-center justify-center p-10 bg-white rounded-[4rem] shadow-2xl text-center">
                <div className="text-9xl mb-6 animate-bounce">{lvl.icon}</div>
                <h2 className="text-5xl font-black text-slate-900 mb-2">Stigli smo!</h2>
                <p className="text-2xl text-slate-500 mb-8 italic">{lvl.destination} pronađena! Odlično vozaštvo 🏆</p>
                <div className="flex items-center justify-center gap-3 bg-amber-50 border-4 border-amber-200 px-10 py-5 rounded-3xl mb-10">
                    <Star className="text-amber-500 fill-amber-500" size={36} />
                    <span className="text-4xl font-black">{score} poena</span>
                </div>
                <button onClick={() => setPhase("mood_after")}
                    className="px-12 py-5 bg-indigo-600 text-white text-xl font-black rounded-2xl shadow-xl active:scale-95 hover:scale-105 transition-all">
                    Nastavi ✓
                </button>
            </div>
        );
    }

    // Izračunaj procenat napretka (fizička razdaljina do cilja)
    const progStart = getNode(lvl.startId);
    const progGoal = getNode(lvl.goalId);
    const progCur = getNode(curId);
    const totalDist = Math.abs(progStart.x - progGoal.x) + Math.abs(progStart.y - progGoal.y);
    const curDist = Math.abs(progCur.x - progGoal.x) + Math.abs(progCur.y - progGoal.y);
    const progressPercent = totalDist === 0 ? 100 : Math.max(5, 100 - (curDist / totalDist) * 100);

    return (
        <div className="w-full flex-1 flex flex-col gap-4 max-w-6xl mx-auto">
            {/* ── HUD ── */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-white/95 backdrop-blur shadow-xl rounded-[2rem] px-6 py-5 border-4 border-white">
                <div className="flex items-center gap-4 flex-1">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${lvl.color} flex items-center justify-center shadow-lg shrink-0 text-3xl`}>
                        {lvl.icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-wide">Cilj: {lvl.destination}</h3>
                        <p className="text-sm text-slate-400 font-bold mb-2">
                            Pređeno koraka: <span className="text-slate-600">{steps}</span>
                        </p>
                        {/* Progress Bar */}
                        <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-slate-400" />
                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                    className={`h-full bg-gradient-to-r ${lvl.color} transition-all duration-500 ease-out`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <Flag size={16} className={progressPercent === 100 ? "text-green-500" : "text-slate-400"} />
                        </div>
                    </div>
                </div>

                <div className="flex md:flex-col items-center justify-center gap-2 bg-amber-50 md:bg-transparent border-2 border-amber-100 md:border-none rounded-xl px-5 py-3 shrink-0">
                    <p className="hidden md:block text-xs font-black text-amber-500 uppercase tracking-widest text-center mb-1">Poeni</p>
                    <div className="flex items-center gap-2">
                        <Star className="text-amber-500 fill-amber-500" size={24} />
                        <span className="text-3xl font-black text-slate-800">{score}</span>
                    </div>
                </div>
            </div>

            {/* MAP CONTAINER — Reduced padding to "zoom in" a bit more */}
            <div className={`relative flex-1 rounded-[3rem] border-[12px] border-white shadow-2xl overflow-hidden min-h-[50vh] max-h-[85vh] p-1 md:p-2 lg:p-4 bg-[#c8e6c9] ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}>
                <svg
                    viewBox="0 0 960 730"
                    width="100%" height="100%"
                    preserveAspectRatio="xMidYMid meet"
                    style={{ display: "block" }}
                >
                    {/* ── SIDEWALKS ── */}
                    {NODES.flatMap(n => n.neighbors.filter(id => id > n.id).map(id => {
                        const nb = getNode(id);
                        return <line key={`sw${n.id}${id}`} x1={n.x} y1={n.y} x2={nb.x} y2={nb.y} stroke="#b0bec5" strokeWidth={70} strokeLinecap="round" />;
                    }))}

                    {/* ── ROADS ── */}
                    {NODES.flatMap(n => n.neighbors.filter(id => id > n.id).map(id => {
                        const nb = getNode(id);
                        return (
                            <g key={`rd${n.id}${id}`}>
                                <line x1={n.x} y1={n.y} x2={nb.x} y2={nb.y} stroke="#f1f5f9" strokeWidth={52} strokeLinecap="round" />
                                <line x1={n.x} y1={n.y} x2={nb.x} y2={nb.y} stroke="#fbbf24" strokeWidth={3} strokeDasharray="20 18" strokeLinecap="round" opacity={0.9} />
                            </g>
                        );
                    }))}

                    {/* ── CITY BLOCKS ── */}
                    {BLOCKS.map((b, i) => (
                        <g key={i}>
                            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={16} fill={b.fill} stroke={b.stroke} strokeWidth={3} />
                            <text x={b.x + b.w / 2} y={b.y + b.h / 2 + b.sz * 0.38} fontSize={b.sz} textAnchor="middle">{b.emoji}</text>
                        </g>
                    ))}

                    {/* ── ALL NODES (including GOAL — all clickable!) ── */}
                    {NODES.map(n => {
                        if (n.id === curId) return null; // character is here, drawn separately

                        const isGoal = n.id === lvl.goalId;
                        const isStart = n.id === lvl.startId;
                        const cpDef = lvl.checkpoints.find(c => c.nodeId === n.id);
                        const deDef = lvl.deadEnds.find(d => d.nodeId === n.id);
                        const cpUnlocked = unlockedCPs.has(n.id);
                        const deVisited = visitedDE.has(n.id);
                        const canReach = reachable.has(n.id);
                        const canClick = canReach && phase === "playing" && !isMoving;

                        // Visual style
                        let r = 16, fill = "#f8fafc", stroke = "#cbd5e1", sw = 2, label = "";
                        if (isGoal) { r = 30; fill = "#bbf7d0"; stroke = "#16a34a"; sw = 5; label = lvl.icon; }
                        else if (isStart) { r = 20; fill = "#fef3c7"; stroke = "#d97706"; sw = 3; }
                        else if (cpDef && !cpUnlocked) { r = 22; fill = "#e0e7ff"; stroke = "#6366f1"; sw = 5; label = "🔒"; }
                        else if (cpDef && cpUnlocked) { r = 20; fill = "#dcfce7"; stroke = "#22c55e"; sw = 4; label = "✅"; }
                        else if (deDef && !deVisited) { r = 18; fill = "#fef9c3"; stroke = "#ca8a04"; sw = 4; }
                        // Blocked dead-ends: shown as red X, cannot be clicked
                        else if (deDef && deVisited) { r = 16; fill = "#fce7f3"; stroke = "#be185d"; sw = 4; label = "❌"; }

                        return (
                            <g key={n.id}>
                                {/* Pulsing ring for reachable nodes */}
                                {canClick && (
                                    <circle cx={n.x} cy={n.y} r={r + 16} fill="none" stroke={isGoal ? "#16a34a" : "#38bdf8"} strokeWidth={3} opacity={0.5}>
                                        <animate attributeName="r" values={`${r + 10};${r + 22};${r + 10}`} dur="1.4s" repeatCount="indefinite" />
                                        <animate attributeName="opacity" values="0.55;0.1;0.55" dur="1.4s" repeatCount="indefinite" />
                                    </circle>
                                )}
                                {/* Main node circle */}
                                <circle cx={n.x} cy={n.y} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />
                                {/* Emoji/icon label */}
                                {label && (
                                    <text x={n.x} y={n.y + (isGoal ? 11 : r * 0.45)} fontSize={isGoal ? 26 : r * 1.15} textAnchor="middle">
                                        {label}
                                    </text>
                                )}
                                {/* Large invisible hit area for easy tapping  */}
                                {canClick && (
                                    <circle
                                        cx={n.x} cy={n.y} r={Math.max(r + 18, 34)}
                                        fill="transparent"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => handleNodeClick(n.id)}
                                    />
                                )}
                            </g>
                        );
                    })}

                    {/* ── WALKING CHARACTER ── */}
                    {/* Use CSS transform translate on a <g> for smooth cross-browser movement */}
                    <g
                        style={{
                            transform: `translate(${charPos.x}px, ${charPos.y}px)`,
                            transition: charMoving ? "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
                        }}
                    >
                        {/* Shadow ellipse */}
                        <ellipse cx={facingLeft ? -3 : 3} cy={18} rx={22} ry={7} fill="rgba(0,0,0,0.15)" />
                        {/* Character emoji — flipped horizontally when going left */}
                        <text
                            x={0}
                            y={12}
                            fontSize={charMoving ? 42 : 40}
                            textAnchor="middle"
                            style={{
                                transform: facingLeft ? "scaleX(-1)" : undefined,
                                transformOrigin: "center",
                                transformBox: "fill-box",
                                transition: "font-size 0.1s ease",
                                userSelect: "none",
                            }}
                        >
                            {charMoving ? "🏃" : "🧒"}
                        </text>
                        {/* Footstep particles when moving */}
                        {charMoving && [0, 1, 2].map(i => (
                            <circle
                                key={i}
                                cx={facingLeft ? (14 + i * 10) : -(14 + i * 10)}
                                cy={16}
                                r={4 - i}
                                fill="#fbbf24"
                                opacity={0.7 - i * 0.2}
                            >
                                <animate attributeName="opacity" values="0.7;0;0.7" dur="0.4s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
                                <animate attributeName="cy" values="16;20;16" dur="0.4s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
                            </circle>
                        ))}
                    </g>
                </svg>

                {/* ── CHECKPOINT MODAL ── */}
                {phase === "checkpoint" && activeCP && (
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-[2.5rem]">
                        <div className={`bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border-4 max-w-lg w-[90%] ${shake ? "border-red-400" : "border-indigo-400"}`}>
                            <div className="text-center mb-8">
                                <div className="text-7xl mb-4">{activeCP.emoji}</div>
                                <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">🔒 Zaključana raskrsnica</p>
                                <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{activeCP.question}</h3>
                            </div>
                            <div className="flex flex-col gap-3">
                                {activeCP.options.map((opt, i) => (
                                    <button key={i} onClick={() => handleCPAnswer(opt.correct, i)}
                                        className={`flex items-center gap-5 p-5 border-4 rounded-2xl transition-all active:scale-95 text-left
                      ${wrongIdx === i
                                                ? "bg-red-50 border-red-400 text-red-700"
                                                : "bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border-slate-100 text-slate-700"}`}
                                    >
                                        <span className="text-4xl">{opt.icon}</span>
                                        <span className="text-xl font-black">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── DEAD END MODAL ── */}
                {phase === "dead_end" && activeDE && (
                    <div className="absolute inset-0 bg-red-900/25 backdrop-blur-sm flex items-center justify-center z-50 rounded-[2.5rem]">
                        <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-4 border-rose-500 max-w-md w-[90%] text-center">
                            <div className="text-7xl mb-3">{activeDE.icon}</div>
                            <AlertTriangle className="text-rose-500 w-14 h-14 mx-auto mb-3" />
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Pogrešan smer!</h3>
                            <p className="text-lg text-slate-600 italic mb-8">"{activeDE.message}"</p>
                            <button onClick={handleDEBack}
                                className="w-full py-5 bg-rose-500 hover:bg-rose-600 text-white text-xl font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                                <X size={22} /> Vrati se na put
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
