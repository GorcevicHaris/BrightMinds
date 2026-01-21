"use client";

import { useState, useEffect, useCallback } from "react";

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
}

const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮"];

export default function MemoryGame({ childId, level, onComplete }: GameProps) {
  // Dinamički broj parova: nivo 1 = 4 para, nivo 5 = 8 parova
  const pairsCount = Math.min(3 + level, 8);

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [moodBefore, setMoodBefore] = useState<string | null>(null);
  const [showMoodBefore, setShowMoodBefore] = useState(false);
  const [showMoodAfter, setShowMoodAfter] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);

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

    // Shuffle cards
    const shuffled = cardPairs.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsChecking(false);
    setGameCompleted(false);
  }, [pairsCount]);

  // KLJUČNO: Reset kompletne igre kada se promeni nivo
  useEffect(() => {
    console.log(`🔄 Resetujem Memory igru za nivo ${level}`);
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
    initializeGame();
  };

  const handleCardClick = (cardId: number) => {
    if (!isPlaying) return;
    if (isChecking) return;
    if (flippedCards.length >= 2) return;
    if (flippedCards.includes(cardId)) return;
    
    const clickedCard = cards.find(c => c.id === cardId);
    if (!clickedCard || clickedCard.isMatched) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, isFlipped: true } : card
    ));

    if (newFlipped.length === 2) {
      setIsChecking(true);
      setMoves(prev => prev + 1);

      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
        // Match found!
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === firstId || card.id === secondId
              ? { ...card, isMatched: true, isFlipped: true }
              : card
          ));
          setFlippedCards([]);
          setMatchedPairs(prev => prev + 1);
          setIsChecking(false);
        }, 600);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(card =>
            card.id === firstId || card.id === secondId
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
          setIsChecking(false);
        }, 1200);
      }
    }
  };

  // Provera završetka igre
  useEffect(() => {
    if (matchedPairs === pairsCount && matchedPairs > 0 && isPlaying && !gameCompleted) {
      console.log("🎉 Igra završena!");
      setGameCompleted(true);
      setIsPlaying(false);
      setTimeout(() => {
        setShowMoodAfter(true);
      }, 500);
    }
  }, [matchedPairs, pairsCount, isPlaying, gameCompleted]);

  const handleMoodAfterSelect = (mood: string) => {
    setShowMoodAfter(false);
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const score = Math.max(0, 1000 - moves * 50);
    onComplete(score, duration, moodBefore, mood);
  };

  if (showMoodBefore) {
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
      </div>
    );
  }

  if (showMoodAfter) {
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
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 rounded-3xl p-8 shadow-xl">
        <div className="text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-purple-700">🧠 Spoji parove</h2>
          <p className="text-xl text-gray-700">Nivo {level}</p>
          <p className="text-base md:text-lg text-gray-600 max-w-md px-4">
            Pronađi <span className="font-bold text-purple-600">{pairsCount} para</span> istih slika. <br />
            Zapamti gde su! 🎯
          </p>
          <div className="text-6xl mb-4">🎴</div>
          <button
            onClick={startGame}
            className="px-8 md:px-12 py-3 md:py-4 text-xl md:text-2xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-full hover:scale-110 transition-transform shadow-xl"
          >
            ▶️ Počni igru
          </button>
        </div>
      </div>
    );
  }

  // Responsive grid - više kolona za više karata
  let gridCols = "grid-cols-4";
  if (pairsCount >= 7) gridCols = "grid-cols-4 md:grid-cols-6";
  else if (pairsCount >= 5) gridCols = "grid-cols-4 md:grid-cols-5";

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-3xl p-4 md:p-8 shadow-2xl">
      {/* Score header */}
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
        </div>
      </div>

      {/* Card grid */}
      <div className={`grid ${gridCols} gap-3 md:gap-4 max-w-4xl mx-auto`}>
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isMatched || flippedCards.includes(card.id) || isChecking}
            className={`aspect-square rounded-xl md:rounded-2xl text-4xl md:text-6xl font-bold transition-all duration-300 transform ${
              card.isFlipped || card.isMatched
                ? "bg-white shadow-xl"
                : "bg-gradient-to-br from-purple-400 to-pink-400 hover:scale-105 shadow-lg"
            } ${card.isMatched ? "opacity-60 scale-95" : ""} ${
              isChecking ? "cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {card.isFlipped || card.isMatched ? card.emoji : "❓"}
          </button>
        ))}
      </div>
    </div>
  );
}