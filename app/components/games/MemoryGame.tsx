"use client";

import { useState, useEffect, useCallback } from "react";
import { useGameEmitter } from '@/lib/useSocket';

interface Card {
  id: number;
  pairId: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface GameProps {
  childId: number;
  level: number;
  onComplete: (score: number, duration: number, moodBefore?: string | null, moodAfter?: string | null) => void;
  isMonitor?: boolean;
  monitorState?: any;
}

const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮"];

export default function MemoryGame({ childId, level, onComplete, isMonitor, monitorState }: GameProps) {
  const pairsCount = Math.min(3 + level, 8);

  const [cards, setCards] = useState<Card[]>(monitorState?.cards || []);
  const [flippedCards, setFlippedCards] = useState<number[]>(monitorState?.flippedCards || []);
  const [moves, setMoves] = useState(monitorState?.moves || 0);
  const [matchedPairs, setMatchedPairs] = useState(monitorState?.matchedPairs || 0);
  const [isPlaying, setIsPlaying] = useState(isMonitor ? true : false);
  const [isChecking, setIsChecking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [moodBefore, setMoodBefore] = useState<string | null>(null);
  const [showMoodBefore, setShowMoodBefore] = useState(false);
  const [showMoodAfter, setShowMoodAfter] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [incorrectCount, setIncorrectCount] = useState(monitorState?.incorrectCount || 0);

  // Sync with monitor state if in monitor mode
  useEffect(() => {
    if (isMonitor && monitorState) {
      if (monitorState.cards) setCards(monitorState.cards);
      if (monitorState.moves !== undefined) setMoves(monitorState.moves);
      if (monitorState.matchedPairs !== undefined) setMatchedPairs(monitorState.matchedPairs);
      if (monitorState.flippedCards) setFlippedCards(monitorState.flippedCards);
    }
  }, [isMonitor, monitorState]);

  // 🔴 WebSocket Hook
  const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();

  const initializeGame = useCallback(() => {
    const selectedEmojis = EMOJIS.slice(0, pairsCount);

    const cardPairs: Card[] = [];
    selectedEmojis.forEach((emoji, pairId) => {
      cardPairs.push({
        id: pairId * 2,
        pairId,
        emoji,
        isFlipped: false,
        isMatched: false,
      });
      cardPairs.push({
        id: pairId * 2 + 1,
        pairId,
        emoji,
        isFlipped: false,
        isMatched: false,
      });
    });

    const shuffled = cardPairs.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsChecking(false);
    setGameCompleted(false);
  }, [pairsCount]);

  useEffect(() => {
    setIsPlaying(false);
    setShowMoodBefore(false);
    setShowMoodAfter(false);
    setMoodBefore(null);
    setStartTime(null);
    setGameCompleted(false);
    initializeGame();
  }, [level, initializeGame]);

  const startGame = () => {
    setShowMoodBefore(true);
  };

  const handleMoodBeforeSelect = (mood: string) => {
    setMoodBefore(mood);
    setShowMoodBefore(false);
    setIsPlaying(true);
    setStartTime(Date.now());
    setIncorrectCount(0);
    initializeGame();

    // 🔴 EMIT: Igra počela
    emitGameStart(childId, 3, 'memory', {
      level,
      cards: cards,
      moves: 0,
      matchedPairs: 0
    });
  };

  const handleCardClick = (cardId: number) => {
    if (!isPlaying || isMonitor) return;
    if (isChecking) return;
    if (flippedCards.length >= 2) return;
    if (flippedCards.includes(cardId)) return;

    const clickedCard = cards.find(c => c.id === cardId);
    if (!clickedCard || clickedCard.isMatched) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    const newCards = cards.map(card =>
      card.id === cardId ? { ...card, isFlipped: true } : card
    );

    setCards(newCards);

    // 🔴 EMIT: Kartica okrenuta
    const currentScore = Math.max(0, 1000 - moves * 50);
    emitGameProgress({
      childId,
      activityId: 3,
      gameType: 'memory',
      event: 'card_flipped',
      data: {
        cardId,
        emoji: clickedCard.emoji,
        flippedCount: newFlipped.length,
        cards: newCards,
        moves,
        score: currentScore,
        correctCount: matchedPairs,
        incorrectCount,
        flippedCards: newFlipped,
      },
      timestamp: new Date().toISOString(),
    });

    if (newFlipped.length === 2) {
      setIsChecking(true);
      const newMoves = moves + 1;
      setMoves(newMoves);

      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === firstId || card.id === secondId
              ? { ...card, isMatched: true, isFlipped: true }
              : card
          ));
          setFlippedCards([]);
          const newMatchedPairs = matchedPairs + 1;
          setMatchedPairs(newMatchedPairs);
          setIsChecking(false);

          const updatedCards = cards.map(card =>
            card.id === firstId || card.id === secondId
              ? { ...card, isMatched: true, isFlipped: true }
              : card
          );

          // 🔴 EMIT: Par pronađen
          const updatedScore = Math.max(0, 1000 - newMoves * 50);
          emitGameProgress({
            childId,
            activityId: 3,
            gameType: 'memory',
            event: 'progress',
            data: {
              matched: true,
              emoji: firstCard.emoji,
              score: updatedScore,
              moves: newMoves,
              correct: true,
              correctCount: newMatchedPairs,
              incorrectCount,
              cards: updatedCards,
              flippedCards: [],
            },
            timestamp: new Date().toISOString(),
          });
        }, 600);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === firstId || card.id === secondId
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
          const newIncorrect = incorrectCount + 1;
          setIncorrectCount(newIncorrect);
          setIsChecking(false);

          const updatedCards = cards.map(card =>
            card.id === firstId || card.id === secondId
              ? { ...card, isFlipped: false }
              : card
          );

          // 🔴 EMIT: Promašaj
          emitGameProgress({
            childId,
            activityId: 3,
            gameType: 'memory',
            event: 'progress',
            data: {
              matched: false,
              moves: newMoves,
              correct: false,
              correctCount: matchedPairs,
              incorrectCount: newIncorrect,
              score: Math.max(0, 1000 - newMoves * 50),
              cards: updatedCards,
              flippedCards: [],
            },
            timestamp: new Date().toISOString(),
          });
        }, 1200);
      }
    }
  };

  useEffect(() => {
    if (matchedPairs === pairsCount && matchedPairs > 0 && isPlaying && !gameCompleted) {
      setGameCompleted(true);
      setIsPlaying(false);

      // 🔴 EMIT: Igra završena
      const finalScore = Math.max(0, 1000 - moves * 50);
      emitGameComplete({
        childId,
        activityId: 3,
        gameType: 'memory',
        event: 'completed',
        data: {
          finalScore,
          totalMoves: moves,
        },
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        setShowMoodAfter(true);
      }, 500);
    }
  }, [matchedPairs, pairsCount, isPlaying, gameCompleted, moves, childId, emitGameComplete]);

  const handleMoodAfterSelect = (mood: string) => {
    setShowMoodAfter(false);
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const score = Math.max(0, 1000 - moves * 50);
    onComplete(score, duration, moodBefore, mood);
  };

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

  if (!isMonitor && showMoodAfter) {
    const score = Math.max(0, 1000 - moves * 50);
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-green-100 via-yellow-100 to-orange-100 rounded-3xl p-8 shadow-xl">
        <h2 className="text-2xl md:text-3xl font-bold text-green-700 mb-4 text-center">
          Kako se osećaš POSLE igre?
        </h2>
        <p className="text-lg md:text-xl text-gray-600 mb-8 text-center">
          Završio/la si za <span className="font-bold text-purple-600">{moves} poteza</span>!<br />
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

  if (!isPlaying && moves === 0) {
    return (
      <div className="relative min-h-[500px] w-full flex items-center justify-center overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100 shadow-lg">

        {/* Background Decorations */}
        <div className="absolute top-12 left-12 text-6xl opacity-10 animate-pulse -rotate-12">🃏</div>
        <div className="absolute bottom-16 right-12 text-7xl opacity-10 animate-bounce rotate-12">🎴</div>
        <div className="absolute top-24 right-20 text-5xl opacity-10 animate-pulse rotate-45">❓</div>
        <div className="absolute bottom-24 left-24 text-6xl opacity-10 animate-bounce -rotate-6">🎲</div>

        {/* Background Blobs (Softer) */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl -ml-32 -mb-32"></div>

        {/* Main Card Content */}
        <div className="relative z-10 w-full max-w-md mx-auto p-6 flex flex-col items-center text-center">

          {/* Floating Badge */}
          <div className="mb-8 animate-in slide-in-from-top-4 duration-700">
            <span className="px-6 py-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-indigo-100 text-indigo-600 text-sm font-black uppercase tracking-widest shadow-sm">
              Nivo {level}
            </span>
          </div>

          {/* Hero Icon */}
          <div className="mb-10 relative group cursor-default">
            <div className="absolute inset-0 bg-indigo-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            <div className="relative w-40 h-40 bg-gradient-to-b from-white to-indigo-50 rounded-[2.5rem] shadow-xl border-4 border-white flex items-center justify-center transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
              <span className="text-8xl drop-shadow-md">🧠</span>
            </div>
            {/* Decorative mini icons */}
            <div className="absolute -top-4 -right-4 text-3xl animate-bounce delay-100">❓</div>
            <div className="absolute -bottom-4 -left-4 text-3xl animate-bounce delay-300">💡</div>
          </div>

          {/* Title & Description */}
          <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight drop-shadow-sm">Spoji Parove</h2>
          <p className="text-slate-600 text-xl font-medium leading-relaxed mb-12 max-w-sm mx-auto">
            Pronađi <span className="text-indigo-600 font-bold">{pairsCount} para</span> istih slika. Zapamti gde se kriju!
          </p>

          {/* Big Action Button */}
          <button
            onClick={startGame}
            className="w-full max-w-sm group bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl p-1.5 transition-all duration-300 shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1"
          >
            <div className="bg-white/10 border border-white/20 rounded-xl px-8 py-5 flex items-center justify-center gap-4 h-full">
              <span className="text-2xl font-bold tracking-wide">ZAPOČNI IGRU</span>
              <div className="w-12 h-12 bg-white text-indigo-600 rounded-xl flex items-center justify-center font-bold text-2xl group-hover:scale-110 transition-transform shadow-inner">
                ▶
              </div>
            </div>
          </button>

        </div>
      </div>
    );
  }

  let gridCols = "grid-cols-4";
  if (pairsCount >= 7) gridCols = "grid-cols-4 md:grid-cols-6";
  else if (pairsCount >= 5) gridCols = "grid-cols-4 md:grid-cols-5";

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-4 md:p-8 shadow-2xl">
      <div className="flex justify-between items-center mb-6 md:mb-8 bg-white/80 backdrop-blur rounded-2xl p-4 md:p-6 shadow-lg flex-wrap gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-2xl md:text-3xl font-bold text-purple-700">
            Potezi: {moves}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-2xl md:text-3xl font-bold text-green-700">
            Parovi: {matchedPairs}/{pairsCount}
          </span>
          {isConnected && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </div>
      </div>

      <div className={`grid ${gridCols} gap-3 md:gap-4 max-w-4xl mx-auto`}>
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isMatched || flippedCards.includes(card.id) || isChecking}
            className={`aspect-square rounded-xl md:rounded-2xl text-4xl md:text-6xl font-bold transition-all duration-300 transform ${card.isFlipped || card.isMatched
              ? "bg-white shadow-xl"
              : "bg-gradient-to-br from-purple-400 to-pink-400 hover:scale-105 shadow-lg"
              } ${card.isMatched ? "opacity-60 scale-95" : ""} ${isChecking ? "cursor-not-allowed" : "cursor-pointer"
              }`}
          >
            {card.isFlipped || card.isMatched ? card.emoji : "❓"}
          </button>
        ))}
      </div>
    </div>
  );
}