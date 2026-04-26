"use client";

import { useState, useEffect, useRef } from "react";
import { useGameEmitter } from "@/lib/useSocket";

interface GameProps {
    childId: number;
    level: number;
    onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => void;
    onClose?: () => void;
    autoStart?: boolean;
    isMonitor?: boolean;
    monitorState?: any;
}

interface Situation {
    id: number;
    scene: string;
    description: string;
    question: string;
    answers: string[];
    correct: number;
    hint: string;
    color: string;
    bgColor: string;
}

// ─── SITUACIJE PO NIVOIMA ────────────────────────────────────────────────────
const SITUATIONS_BY_LEVEL: Record<number, Situation[]> = {
    1: [
        {
            id: 1, scene: "🎁",
            description: "Dobio/la si poklon. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Hvala!","Neću to."],
            correct: 0,
            hint: "Uvek kažemo hvala.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 2, scene: "👋",
            description: "Srećeš učiteljicu. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Ćutiš.","Dobar dan!"],
            correct: 1,
            hint: "Starije pozdravljamo.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 3, scene: "😢",
            description: "Slučajno si gurnuo druga. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Izvini!","Skloni se."],
            correct: 0,
            hint: "Kada pogrešimo, kažemo izvini.",
            color: "#059669", bgColor: "#D1FAE5",
        },
    ],
    2: [
        {
            id: 4, scene: "💧",
            description: "Želiš vodu. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Daj vodu!","Molim te, daj mi vodu."],
            correct: 1,
            hint: "Koristimo reč molim.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 5, scene: "🧸",
            description: "Drug ti da igračku. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Hvala ti!","Baciš je."],
            correct: 0,
            hint: "Lepo se zahvalimo.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
        {
            id: 6, scene: "🏠",
            description: "Ideš kući. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Doviđenja!","Samo odeš."],
            correct: 0,
            hint: "Uvek se pozdravimo pri prelasku.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
    ],
    3: [
        {
            id: 7, scene: "😭",
            description: "Brat plače. Šta uradiš?",
            question: "Šta je najbolje reći?",
            answers: ["Smeješ se.","Pitaš: Jesi li dobro?"],
            correct: 1,
            hint: "Brinemo o drugima.",
            color: "#4B5563", bgColor: "#F3F4F6",
        },
        {
            id: 8, scene: "🍽️",
            description: "Mama napravi ručak. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Baš je ukusno, hvala!","Fuj."],
            correct: 0,
            hint: "Zahvalimo se za obrok.",
            color: "#65A30D", bgColor: "#ECFCCB",
        },
        {
            id: 9, scene: "👋",
            description: "Drug ti kaže zdravo. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Zdravo!","Gledaš u pod."],
            correct: 0,
            hint: "Odgovorimo na pozdrav.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
    ],
    4: [
        {
            id: 10, scene: "⚽",
            description: "Želiš da se igraš sa drugima. Šta pitaš?",
            question: "Šta je najbolje reći?",
            answers: ["Mogu li i ja?","Uzmim im loptu."],
            correct: 0,
            hint: "Uvek lepo pitaj.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 11, scene: "✏️",
            description: "Neko ti uzme olovku. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Vrati to, molim te.","Udariš ga."],
            correct: 0,
            hint: "Budi pristojan.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 12, scene: "🤕",
            description: "Prijatelj je pao. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Smeješ se.","Treba li ti pomoć?"],
            correct: 1,
            hint: "Pomažemo u nevolji.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
    ],
    5: [
        {
            id: 13, scene: "🍦",
            description: "Kupuješ sladoled. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Molim vas jedan sladoled.","Daj sladoled!"],
            correct: 0,
            hint: "Koristimo reč molim.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
        {
            id: 14, scene: "🎂",
            description: "Drug slavi rođendan. Šta mu kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Srećan rođendan!","Daj mi tortu."],
            correct: 0,
            hint: "Čestitamo rođendane.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
        {
            id: 15, scene: "🚶",
            description: "Želiš da prođeš. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Skloni se!","Izvinite, mogu li da prođem?"],
            correct: 1,
            hint: "Budimo kulturni.",
            color: "#4B5563", bgColor: "#F3F4F6",
        },
    ],
    6: [
        {
            id: 16, scene: "🎁",
            description: "Dobio/la si poklon. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Hvala!","Neću to."],
            correct: 0,
            hint: "Uvek kažemo hvala.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 17, scene: "👋",
            description: "Srećeš učiteljicu. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Ćutiš.","Dobar dan!"],
            correct: 1,
            hint: "Starije pozdravljamo.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 18, scene: "😢",
            description: "Slučajno si gurnuo druga. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Izvini!","Skloni se."],
            correct: 0,
            hint: "Kada pogrešimo, kažemo izvini.",
            color: "#059669", bgColor: "#D1FAE5",
        },
    ],
    7: [
        {
            id: 19, scene: "💧",
            description: "Želiš vodu. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Daj vodu!","Molim te, daj mi vodu."],
            correct: 1,
            hint: "Koristimo reč molim.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 20, scene: "🧸",
            description: "Drug ti da igračku. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Hvala ti!","Baciš je."],
            correct: 0,
            hint: "Lepo se zahvalimo.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
        {
            id: 21, scene: "🏠",
            description: "Ideš kući. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Doviđenja!","Samo odeš."],
            correct: 0,
            hint: "Uvek se pozdravimo pri prelasku.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
    ],
    8: [
        {
            id: 22, scene: "😭",
            description: "Brat plače. Šta uradiš?",
            question: "Šta je najbolje reći?",
            answers: ["Smeješ se.","Pitaš: Jesi li dobro?"],
            correct: 1,
            hint: "Brinemo o drugima.",
            color: "#4B5563", bgColor: "#F3F4F6",
        },
        {
            id: 23, scene: "🍽️",
            description: "Mama napravi ručak. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Baš je ukusno, hvala!","Fuj."],
            correct: 0,
            hint: "Zahvalimo se za obrok.",
            color: "#65A30D", bgColor: "#ECFCCB",
        },
        {
            id: 24, scene: "👋",
            description: "Drug ti kaže zdravo. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Zdravo!","Gledaš u pod."],
            correct: 0,
            hint: "Odgovorimo na pozdrav.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
    ],
    9: [
        {
            id: 25, scene: "⚽",
            description: "Želiš da se igraš sa drugima. Šta pitaš?",
            question: "Šta je najbolje reći?",
            answers: ["Mogu li i ja?","Uzmim im loptu."],
            correct: 0,
            hint: "Uvek lepo pitaj.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 26, scene: "✏️",
            description: "Neko ti uzme olovku. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Vrati to, molim te.","Udariš ga."],
            correct: 0,
            hint: "Budi pristojan.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 27, scene: "🤕",
            description: "Prijatelj je pao. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Smeješ se.","Treba li ti pomoć?"],
            correct: 1,
            hint: "Pomažemo u nevolji.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
    ],
    10: [
        {
            id: 28, scene: "🍦",
            description: "Kupuješ sladoled. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Molim vas jedan sladoled.","Daj sladoled!"],
            correct: 0,
            hint: "Koristimo reč molim.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
        {
            id: 29, scene: "🎂",
            description: "Drug slavi rođendan. Šta mu kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Srećan rođendan!","Daj mi tortu."],
            correct: 0,
            hint: "Čestitamo rođendane.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
        {
            id: 30, scene: "🚶",
            description: "Želiš da prođeš. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Skloni se!","Izvinite, mogu li da prođem?"],
            correct: 1,
            hint: "Budimo kulturni.",
            color: "#4B5563", bgColor: "#F3F4F6",
        },
    ],
    11: [
        {
            id: 31, scene: "🎁",
            description: "Dobio/la si poklon. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Hvala!","Neću to."],
            correct: 0,
            hint: "Uvek kažemo hvala.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
        {
            id: 32, scene: "👋",
            description: "Srećeš učiteljicu. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Ćutiš.","Dobar dan!"],
            correct: 1,
            hint: "Starije pozdravljamo.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 33, scene: "😢",
            description: "Slučajno si gurnuo druga. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Izvini!","Skloni se."],
            correct: 0,
            hint: "Kada pogrešimo, kažemo izvini.",
            color: "#059669", bgColor: "#D1FAE5",
        },
    ],
    12: [
        {
            id: 34, scene: "💧",
            description: "Želiš vodu. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Daj vodu!","Molim te, daj mi vodu."],
            correct: 1,
            hint: "Koristimo reč molim.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
        {
            id: 35, scene: "🧸",
            description: "Drug ti da igračku. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Hvala ti!","Baciš je."],
            correct: 0,
            hint: "Lepo se zahvalimo.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
        {
            id: 36, scene: "🏠",
            description: "Ideš kući. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Doviđenja!","Samo odeš."],
            correct: 0,
            hint: "Uvek se pozdravimo pri prelasku.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
    ],
    13: [
        {
            id: 37, scene: "😭",
            description: "Brat plače. Šta uradiš?",
            question: "Šta je najbolje reći?",
            answers: ["Smeješ se.","Pitaš: Jesi li dobro?"],
            correct: 1,
            hint: "Brinemo o drugima.",
            color: "#4B5563", bgColor: "#F3F4F6",
        },
        {
            id: 38, scene: "🍽️",
            description: "Mama napravi ručak. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Baš je ukusno, hvala!","Fuj."],
            correct: 0,
            hint: "Zahvalimo se za obrok.",
            color: "#65A30D", bgColor: "#ECFCCB",
        },
        {
            id: 39, scene: "👋",
            description: "Drug ti kaže zdravo. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Zdravo!","Gledaš u pod."],
            correct: 0,
            hint: "Odgovorimo na pozdrav.",
            color: "#7C3AED", bgColor: "#EDE9FE",
        },
    ],
    14: [
        {
            id: 40, scene: "⚽",
            description: "Želiš da se igraš sa drugima. Šta pitaš?",
            question: "Šta je najbolje reći?",
            answers: ["Mogu li i ja?","Uzmim im loptu."],
            correct: 0,
            hint: "Uvek lepo pitaj.",
            color: "#0891B2", bgColor: "#E0F2FE",
        },
        {
            id: 41, scene: "✏️",
            description: "Neko ti uzme olovku. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Vrati to, molim te.","Udariš ga."],
            correct: 0,
            hint: "Budi pristojan.",
            color: "#059669", bgColor: "#D1FAE5",
        },
        {
            id: 42, scene: "🤕",
            description: "Prijatelj je pao. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Smeješ se.","Treba li ti pomoć?"],
            correct: 1,
            hint: "Pomažemo u nevolji.",
            color: "#DC2626", bgColor: "#FEE2E2",
        },
    ],
    15: [
        {
            id: 43, scene: "🍦",
            description: "Kupuješ sladoled. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Molim vas jedan sladoled.","Daj sladoled!"],
            correct: 0,
            hint: "Koristimo reč molim.",
            color: "#D97706", bgColor: "#FEF3C7",
        },
        {
            id: 44, scene: "🎂",
            description: "Drug slavi rođendan. Šta mu kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Srećan rođendan!","Daj mi tortu."],
            correct: 0,
            hint: "Čestitamo rođendane.",
            color: "#DB2777", bgColor: "#FCE7F3",
        },
        {
            id: 45, scene: "🚶",
            description: "Želiš da prođeš. Šta kažeš?",
            question: "Šta je najbolje reći?",
            answers: ["Skloni se!","Izvinite, mogu li da prođem?"],
            correct: 1,
            hint: "Budimo kulturni.",
            color: "#4B5563", bgColor: "#F3F4F6",
        },
    ],
};

const ALL_SITUATIONS = Object.values(SITUATIONS_BY_LEVEL).flat();

function getSituationsForLevel(level: number): Situation[] {
    if (level >= 1 && level <= 15) return SITUATIONS_BY_LEVEL[level] || SITUATIONS_BY_LEVEL[1];
    return [...ALL_SITUATIONS].sort(() => Math.random() - 0.5).slice(0, 8);
}

type AnswerState = "idle" | "correct" | "wrong";

export default function SocialCommunicationGame({
    childId, level, onComplete, onClose, autoStart, isMonitor, monitorState
}: GameProps) {
    const situations = getSituationsForLevel(level);
    const [currentIndex, setCurrentIndex] = useState(monitorState?.currentIndex || 0);
    const [score, setScore] = useState(monitorState?.score || 0);
    const [correctCount, setCorrectCount] = useState(monitorState?.correctCount || 0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>("idle");
    const [hintVisible, setHintVisible] = useState(false);
    const [isPlaying, setIsPlaying] = useState(isMonitor ? true : autoStart);
    const [showMoodBefore, setShowMoodBefore] = useState(!isMonitor && !autoStart);
    const [showMoodAfter, setShowMoodAfter] = useState(false);
    const [moodBefore, setMoodBefore] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [completed, setCompleted] = useState(false);
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [totalIncorrect, setTotalIncorrect] = useState(monitorState?.totalIncorrect || 0);
    const [advancing, setAdvancing] = useState(false); // blocks clicks during auto-advance

    const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();

    useEffect(() => {
        if (isMonitor && monitorState) {
            // Sync current question index (support both naming conventions)
            if (monitorState.index !== undefined) setCurrentIndex(monitorState.index);
            else if (monitorState.currentIndex !== undefined) setCurrentIndex(monitorState.currentIndex);

            // Sync stats
            if (monitorState.score !== undefined) setScore(monitorState.score);
            if (monitorState.correctCount !== undefined) setCorrectCount(monitorState.correctCount);
            if (monitorState.totalIncorrect !== undefined) setTotalIncorrect(monitorState.totalIncorrect);

            // Sync answer UI state
            if (monitorState.selectedAnswer !== undefined) setSelectedAnswer(monitorState.selectedAnswer);
            if (monitorState.hintVisible !== undefined) setHintVisible(monitorState.hintVisible);
            if (monitorState.isPlaying !== undefined) setIsPlaying(monitorState.isPlaying);
        }
    }, [isMonitor, monitorState]);

    // Auto-start logic
    useEffect(() => {
        if (autoStart && !isMonitor && !isPlaying && currentIndex === 0 && !completed) {
            handleMoodBeforeSelect("neutral"); // Default mood for auto-start
        }
    }, [autoStart, isMonitor, isPlaying, currentIndex, completed]);

    const currentSituation = situations[currentIndex];
    const totalSituations = situations.length;

    const handleAnswerClick = (index: number) => {
        if (answerState !== "idle" || isMonitor || advancing) return;
        setSelectedAnswer(index);

        if (index === currentSituation.correct) {
            // Tačno!
            const points = wrongAttempts === 0 ? 100 : wrongAttempts === 1 ? 60 : 30;
            const newScore = score + points;
            const newCorrect = correctCount + 1;
            setScore(newScore);
            setCorrectCount(newCorrect);
            setAnswerState("correct");
            setHintVisible(false);
            setAdvancing(true);  // block further clicks

            emitGameProgress({
                childId, activityId: 6, gameType: "social" as any, event: "answer",
                data: {
                    correct: true,
                    situationId: currentSituation.id,
                    score: newScore,
                    correctCount: newCorrect,
                    totalIncorrect,
                    index: currentIndex,
                    level,
                    totalSituations,
                    selectedAnswer: index,
                    answerState: "correct"
                },
                timestamp: new Date().toISOString(),
            });

            setTimeout(() => {
                if (currentIndex + 1 >= totalSituations) {
                    finishGame(newScore, newCorrect);
                } else {
                    const nextIndex = currentIndex + 1;
                    setCurrentIndex(nextIndex);
                    setSelectedAnswer(null);
                    setAnswerState("idle");
                    setHintVisible(false);
                    setWrongAttempts(0);
                    setAdvancing(false);

                    // Sync index change to monitor immediately
                    emitGameProgress({
                        childId, activityId: 6, gameType: "social" as any, event: "next_question",
                        data: {
                            index: nextIndex,
                            score: newScore,
                            correctCount: newCorrect,
                            totalIncorrect,
                            selectedAnswer: null,
                            answerState: "idle",
                            hintVisible: false
                        },
                        timestamp: new Date().toISOString(),
                    });
                }
            }, 1500);

        } else {
            // Netačno
            setAnswerState("wrong");
            setWrongAttempts((prev: number) => prev + 1);
            const newTotalIncorrect = totalIncorrect + 1;
            setTotalIncorrect(newTotalIncorrect);

            // Šaljemo monitoru da je došlo do greške (sa vizuelnim stanjem)
            emitGameProgress({
                childId, activityId: 6, gameType: "social" as any, event: "answer",
                data: {
                    correct: false,
                    situationId: currentSituation.id,
                    score,
                    totalIncorrect: newTotalIncorrect,
                    index: currentIndex,
                    level,
                    selectedAnswer: index,
                    answerState: "wrong"
                },
                timestamp: new Date().toISOString(),
            });

            setTimeout(() => {
                setSelectedAnswer(null);
                setAnswerState("idle");

                // Resetuj vizuelno stanje na monitoru nakon što istekne timeout za grešku
                emitGameProgress({
                    childId, activityId: 6, gameType: "social" as any, event: "reset_answer",
                    data: {
                        selectedAnswer: null,
                        answerState: "idle",
                        index: currentIndex
                    },
                    timestamp: new Date().toISOString(),
                });
            }, 1200);
        }
    };

    const finishGame = (finalScore: number, finalCorrect: number) => {
        setCompleted(true);
        setIsPlaying(false);
        emitGameComplete({
            childId, activityId: 6, gameType: "social" as any, event: "completed",
            data: { finalScore, correctCount: finalCorrect, totalIncorrect, totalSituations },
            timestamp: new Date().toISOString(),
        });

        if (autoStart) {
            handleMoodAfterSelect("neutral"); // Default mood for auto-transition
        } else {
            setTimeout(() => setShowMoodAfter(true), 1000);
        }
    };

    const handleMoodBeforeSelect = (mood: string) => {
        setMoodBefore(mood);
        setShowMoodBefore(false);
        setIsPlaying(true);
        setStartTime(Date.now());
        setCurrentIndex(0);
        setScore(0);
        setCorrectCount(0);
        setCompleted(false);
        setAnswerState("idle");
        setSelectedAnswer(null);
        setWrongAttempts(0);
        setTotalIncorrect(0);
        setAdvancing(false);
        emitGameStart(childId, 6, "social" as any, { level, isPlaying: true });
    };

    const handleMoodAfterSelect = (mood: string) => {
        setShowMoodAfter(false);
        const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
        onComplete(score, duration, moodBefore, mood);
    };

    const moodList = [
        { emoji: "😢", label: "Loše", value: "very_upset" },
        { emoji: "😕", label: "Nije sjajno", value: "upset" },
        { emoji: "😐", label: "Okej", value: "neutral" },
        { emoji: "😊", label: "Dobro", value: "happy" },
        { emoji: "😄", label: "Super", value: "very_happy" },
    ];

    // ── Mood Before — Premium Immersive Design ────────────────
    if (!isMonitor && showMoodBefore) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-10 overflow-hidden text-center">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-slate-50">
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl scale-110"
                        style={{ backgroundImage: "url('/images/ustacomunicira.png')" }}
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

    if (!isMonitor && showMoodAfter) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[450px] w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-[2rem] md:rounded-[3rem] p-4 sm:p-6 md:p-10 shadow-2xl animate-in fade-in duration-500 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                <div className="text-center mb-6 md:mb-12 relative z-10">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] md:text-sm font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Igra je završena!</span>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-2 md:mb-4">Bravo! Kako si sada? 🌟</h2>
                    <p className="text-sm sm:text-base md:text-xl text-slate-500 font-medium tracking-wide">
                        Rezultat: <span className="font-bold text-emerald-600 underline decoration-2 underline-offset-4">{score} poena</span>.
                    </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 md:gap-6 w-full max-w-4xl px-2 relative z-10">
                    {moodList.map(mood => (
                        <button
                            key={mood.value}
                            onClick={() => handleMoodAfterSelect(mood.value)}
                            className="group relative flex flex-col items-center bg-white rounded-2xl md:rounded-[2.5rem] p-3 sm:p-4 md:p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl border border-slate-100 active:scale-95"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 rounded-2xl md:rounded-[2.5rem] transition-opacity`}></div>
                            <span className="text-4xl sm:text-5xl md:text-6xl mb-1 sm:mb-2 md:mb-3 transform group-hover:scale-110 transition-transform duration-300 select-none">{mood.emoji}</span>
                            <span className="text-[10px] sm:text-sm md:text-base font-black text-slate-700 truncate w-full px-1">{mood.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Start screen removed for faster gameplay

    // ─── END SCREEN ───────────────────────────────────────────────────────────────
    if (completed && !showMoodAfter) {
        const pct = Math.round((correctCount / totalSituations) * 100);
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-[3rem] p-12 shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-8 max-w-2xl mx-auto">
                    <div className="relative inline-block mb-8">
                        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                        <div className="relative text-9xl animate-bounce drop-shadow-2xl">🏆</div>
                    </div>

                    <div>
                        <span className="px-6 py-2 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-widest mb-4 inline-block">Sjajan uspeh!</span>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tight">Fantastično si uradio/la!</h2>
                    </div>

                    <p className="text-2xl font-bold text-slate-600 italic leading-relaxed">
                        Tvoj rezultat je <span className="text-indigo-600 underline underline-offset-8 decoration-4">{score} poena</span>
                    </p>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end mb-2 px-2">
                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Tačnost</span>
                            <span className="text-2xl font-black text-indigo-600">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-8 p-1.5 shadow-inner ring-1 ring-slate-200">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1500 shadow-lg relative overflow-hidden"
                                style={{ width: `${pct}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-6 pt-10">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className={`text-6xl transition-all duration-700 delay-${i * 200} ${i * 33 < pct ? 'scale-125 opacity-100 rotate-12' : 'scale-50 opacity-20'}`}
                            >
                                ⭐
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ─── GAME SCREEN ──────────────────────────────────────────────────────────────
    if (!currentSituation) return null; // Guard clause for when currentSituation is not available
    return (
        <div className="bg-white/95 backdrop-blur-xl rounded-[1.5rem] sm:rounded-2xl md:rounded-[3rem] p-3 sm:p-5 md:p-8 shadow-2xl border border-white/50 w-full max-w-5xl mx-auto flex-1 flex flex-col animate-in fade-in duration-700 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-indigo-500/5 pointer-events-none"></div>

            {/* Compact Header Area */}
            <div className="flex justify-between items-center mb-4 sm:mb-6 md:mb-8 bg-gradient-to-r from-violet-50/50 to-white rounded-2xl md:rounded-[2.5rem] px-3 py-2 sm:px-6 sm:py-3 md:px-8 md:py-5 shadow-xl relative overflow-hidden ring-1 ring-violet-100/50 shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                <div className="flex items-center gap-2 sm:gap-3 md:gap-6 relative z-10">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-lg sm:rounded-xl bg-white shadow-md flex items-center justify-center text-lg sm:text-xl md:text-2xl ring-2 sm:ring-4 ring-violet-50 border border-violet-100 transform -rotate-3 transition-transform">
                        🗣️
                    </div>
                    <div className="hidden sm:block">
                        <h3 className="text-sm sm:text-base md:text-xl font-black text-slate-800 tracking-wide uppercase leading-tight">Bon-Ton</h3>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 md:gap-6 relative z-10 shrink-0">
                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-lg sm:rounded-xl md:rounded-2xl px-2 py-1 sm:px-4 sm:py-2 md:px-6 md:py-2.5 border border-violet-100/50 text-center min-w-[60px] sm:min-w-[80px] md:min-w-[100px]">
                        <span className="block text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Igra</span>
                        <span className="text-sm sm:text-lg md:text-2xl font-black text-violet-500">{currentIndex + 1}<span className="text-slate-400 text-[10px] sm:text-xs md:text-lg mx-0.5 md:mx-1">/</span>{totalSituations}</span>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-lg sm:rounded-xl md:rounded-2xl px-2 py-1 sm:px-4 sm:py-2 md:px-6 md:py-2.5 border border-violet-100/50 text-center min-w-[60px] sm:min-w-[80px] md:min-w-[100px]">
                        <span className="block text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Poena</span>
                        <span className="text-sm sm:text-lg md:text-2xl font-black text-emerald-500">{score}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-4 sm:gap-6 md:gap-8 min-h-0 relative z-10 overflow-y-auto custom-scrollbar pr-1">
                {/* Situation Display */}
                <div
                    className="relative group bg-white rounded-[1.25rem] sm:rounded-2xl md:rounded-[2.5rem] p-4 sm:p-6 md:p-10 shadow-xl border-2 transition-all duration-700 shrink-0"
                    style={{ borderColor: `${currentSituation.color}20` }}
                >
                    <div
                        className="absolute inset-x-0 bottom-0 h-1 sm:h-1.5 rounded-b-[1.25rem] sm:rounded-b-2xl md:rounded-b-[2.5rem]"
                        style={{ backgroundColor: currentSituation.color }}
                    ></div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 md:gap-10">
                        <div
                            className="relative w-20 h-20 sm:w-32 sm:h-32 md:w-44 md:h-44 rounded-xl sm:rounded-2xl md:rounded-[2.5rem] shadow-lg flex items-center justify-center text-3xl sm:text-6xl md:text-8xl transform transition-transform duration-700 shrink-0 ring-2 sm:ring-4 md:ring-6 ring-slate-50"
                            style={{ backgroundColor: currentSituation.bgColor }}
                        >
                            {currentSituation.scene}
                        </div>

                        <div className="flex-1 text-center sm:text-left space-y-2 sm:space-y-4">
                            <div className="space-y-0.5 sm:space-y-1">
                                <span className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Situacija</span>
                                <h4 className="text-sm sm:text-xl md:text-3xl font-black text-slate-800 leading-tight">
                                    {currentSituation.description}
                                </h4>
                            </div>

                            <div
                                className="inline-flex items-center gap-2 md:gap-3 px-3 py-1 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-lg sm:rounded-xl md:rounded-[1.5rem] text-[10px] sm:text-sm md:text-lg font-black shadow-inner ring-1 ring-slate-100 max-w-full"
                                style={{ backgroundColor: `${currentSituation.color}08`, color: currentSituation.color }}
                            >
                                <span className="text-sm sm:text-xl">💬</span>
                                <span className="truncate sm:whitespace-normal">{currentSituation.question}</span>
                            </div>
                        </div>
                    </div>

                    {hintVisible && (
                        <div className="mt-3 sm:mt-4 md:mt-6 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl md:rounded-3xl bg-slate-900 text-white animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <p className="relative z-10 flex items-start gap-2 sm:gap-4 text-xs sm:text-sm md:text-lg font-medium">
                                <span className="text-base sm:text-xl shrink-0">💡</span>
                                {currentSituation.hint}
                            </p>
                        </div>
                    )}
                </div>

                {/* Answers Grid */}
                <div className="space-y-2 sm:space-y-3 md:space-y-4 max-w-4xl mx-auto w-full pb-2">
                    {currentSituation.answers.map((answer, i) => {
                        const isSelected = selectedAnswer === i;
                        const state = isSelected
                            ? (answerState === "correct" ? "correct" : (answerState === "wrong" ? "wrong" : "idle"))
                            : "idle";

                        return (
                            <button
                                key={i}
                                onClick={() => handleAnswerClick(i)}
                                disabled={answerState === "correct" || advancing}
                                className={`group w-full relative p-3 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl md:rounded-[2rem] text-left transition-all duration-300 border shadow-sm transform active:scale-[0.98] ${state === "correct"
                                    ? "bg-emerald-50 border-emerald-400 shadow-xl ring-4 ring-emerald-50 z-20"
                                    : state === "wrong"
                                        ? "bg-rose-50 border-rose-200 opacity-60"
                                        : advancing
                                            ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed"
                                            : "bg-white border-slate-100 hover:border-violet-200 hover:shadow-xl hover:-translate-y-0.5 sm:hover:-translate-y-1"
                                    }`}
                            >
                                <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
                                    <div
                                        className={`w-7 h-7 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg md:rounded-xl flex items-center justify-center font-black text-sm sm:text-lg md:text-xl transition-colors duration-300 flex-shrink-0 ${state === "correct"
                                            ? "bg-emerald-500 text-white"
                                            : state === "wrong"
                                                ? "bg-rose-500 text-white"
                                                : "bg-slate-50 text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600 border border-slate-100"
                                            }`}
                                    >
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <span className={`text-xs sm:text-base md:text-lg font-bold transition-colors leading-snug ${state === "correct" ? "text-emerald-900" :
                                        state === "wrong" ? "text-rose-900" : "text-slate-700 font-bold"
                                        }`}>
                                        {answer}
                                    </span>

                                    {state === "correct" && (
                                        <div className="ml-auto w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-bounce shrink-0">
                                            <span className="text-[10px] sm:text-base font-bold">✓</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-auto pt-3 flex justify-between items-center text-[8px] sm:text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest opacity-60 shrink-0">
                <p className="truncate mr-2">💡 Misli o osećanjima drugih.</p>
                {!hintVisible && !advancing && wrongAttempts > 0 && (
                    <button
                        onClick={() => {
                            setHintVisible(true);
                            emitGameProgress({
                                childId, activityId: 6, gameType: "social" as any, event: "hint",
                                data: { hintVisible: true, index: currentIndex },
                                timestamp: new Date().toISOString(),
                            });
                        }}
                        className="text-violet-500 hover:text-violet-600 underline underline-offset-4 decoration-2 shrink-0"
                    >
                        Pomoć?
                    </button>
                )}
            </div>
        </div>
    );
}
