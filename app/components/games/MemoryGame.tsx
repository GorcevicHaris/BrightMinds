"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  onClose?: () => void;
  autoStart?: boolean;
  isMonitor?: boolean;
  monitorState?: any;
}

const EMOJIS = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐸", "🐵", "🦉", "🦄", "🐢", "🐧", "🐠", "🦋"];

export default function MemoryGame({ childId, level, onComplete, onClose, autoStart, isMonitor, monitorState }: GameProps) {
  const pairsCount = Math.min(2 + level, 16);

  const [cards, setCards] = useState<Card[]>(monitorState?.cards || []);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(monitorState?.moves || 0);
  const [matchedPairs, setMatchedPairs] = useState(monitorState?.matchedPairs || 0);
  const [isPlaying, setIsPlaying] = useState(isMonitor ? true : false);
  const [isLocked, setIsLocked] = useState(false); // replaces isChecking — locks ALL card clicks
  const [startTime, setStartTime] = useState<number | null>(null);
  const [moodBefore, setMoodBefore] = useState<string | null>(null);
  const [showMoodBefore, setShowMoodBefore] = useState(!isMonitor && !autoStart);
  const [showMoodAfter, setShowMoodAfter] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [incorrectCount, setIncorrectCount] = useState(monitorState?.incorrectCount || 0);

  // Refs to avoid stale closures in setTimeout
  const cardsRef = useRef(cards);
  const matchedPairsRef = useRef(matchedPairs);
  const incorrectCountRef = useRef(incorrectCount);
  const movesRef = useRef(moves);

  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { matchedPairsRef.current = matchedPairs; }, [matchedPairs]);
  useEffect(() => { incorrectCountRef.current = incorrectCount; }, [incorrectCount]);
  useEffect(() => { movesRef.current = moves; }, [moves]);

  // Sync with monitor state
  useEffect(() => {
    if (isMonitor && monitorState) {
      if (monitorState.cards) {
        setCards([...monitorState.cards]);
      }
      if (monitorState.moves !== undefined) setMoves(monitorState.moves);
      if (monitorState.matchedPairs !== undefined) setMatchedPairs(monitorState.matchedPairs);
      if (monitorState.flippedCards !== undefined) setFlippedIds(monitorState.flippedCards);
      if (monitorState.incorrectCount !== undefined) setIncorrectCount(monitorState.incorrectCount);
      if (monitorState.totalIncorrect !== undefined) setIncorrectCount(monitorState.totalIncorrect);
      if (monitorState.isPlaying !== undefined) setIsPlaying(monitorState.isPlaying);
    }
  }, [isMonitor, monitorState]);

  // Auto-start logic
  useEffect(() => {
    if (autoStart && !isMonitor && !isPlaying && moves === 0) {
      handleMoodBeforeSelect("neutral"); // Default mood for auto-start
    }
  }, [autoStart, isMonitor, isPlaying, moves]);

  const { emitGameStart, emitGameProgress, emitGameComplete, isConnected } = useGameEmitter();

  const initializeGame = useCallback(() => {
    const selectedEmojis = EMOJIS.slice(0, pairsCount);
    const cardPairs: Card[] = [];
    selectedEmojis.forEach((emoji, pairId) => {
      cardPairs.push({ id: pairId * 2, pairId, emoji, isFlipped: false, isMatched: false });
      cardPairs.push({ id: pairId * 2 + 1, pairId, emoji, isFlipped: false, isMatched: false });
    });
    const shuffled = cardPairs.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedIds([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsLocked(false);
    setGameCompleted(false);
    setIncorrectCount(0);
  }, [pairsCount]);

  useEffect(() => {
    setIsPlaying(isMonitor ? true : false);
    setShowMoodBefore(false);
    setShowMoodAfter(false);
    setMoodBefore(null);
    setStartTime(null);
    setGameCompleted(false);
    initializeGame();
  }, [level, isMonitor, initializeGame]);

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

    emitGameStart(childId, 3, 'memory', {
      level,
      cards: cards,
      moves: 0,
      matchedPairs: 0,
      isPlaying: true,
    });
  };

  const handleCardClick = useCallback((cardId: number) => {
    if (!isPlaying || isMonitor || isLocked) return;

    const card = cardsRef.current.find(c => c.id === cardId);
    if (!card || card.isMatched || card.isFlipped) return;

    // Flip the clicked card
    const updatedCards = cardsRef.current.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );
    setCards(updatedCards);

    setFlippedIds(prev => {
      const newFlipped = [...prev, cardId];

      // Emit progress (lightweight — no full cards array)
      emitGameProgress({
        childId,
        activityId: 3,
        gameType: 'memory',
        event: 'card_flipped',
        data: {
          cardId,
          emoji: card.emoji,
          flippedCount: newFlipped.length,
          moves: movesRef.current,
          score: Math.max(0, 1000 - movesRef.current * 50),
          correctCount: matchedPairsRef.current,
          incorrectCount: incorrectCountRef.current,
          flippedCards: newFlipped,
          cards: updatedCards, // Send current card states to monitor
        },
        timestamp: new Date().toISOString(),
      });

      if (newFlipped.length === 2) {
        setIsLocked(true);
        const newMoves = movesRef.current + 1;
        setMoves(newMoves);

        const firstCard = cardsRef.current.find(c => c.id === newFlipped[0]);
        const secondCard = updatedCards.find(c => c.id === newFlipped[1]);

        if (firstCard && secondCard && firstCard.pairId === secondCard.pairId) {
          // MATCH!
          setTimeout(() => {
            const nextCards = cardsRef.current.map(c =>
              c.id === newFlipped[0] || c.id === newFlipped[1]
                ? { ...c, isMatched: true, isFlipped: true }
                : c
            );
            setCards(nextCards);
            const newMatched = matchedPairsRef.current + 1;
            setMatchedPairs(newMatched);
            setFlippedIds([]);
            setIsLocked(false);

            emitGameProgress({
              childId,
              activityId: 3,
              gameType: 'memory',
              event: 'progress',
              data: {
                matched: true,
                emoji: firstCard.emoji,
                score: Math.max(0, 1000 - newMoves * 50),
                moves: newMoves,
                correct: true,
                correctCount: newMatched,
                incorrectCount: incorrectCountRef.current,
                matchedPairs: newMatched,
                flippedCards: [],
                cards: nextCards, // Send updated matched cards to monitor
              },
              timestamp: new Date().toISOString(),
            });
          }, 400);
        } else {
          // NO MATCH — flip back after delay
          setTimeout(() => {
            const resetCards = cardsRef.current.map(c =>
              c.id === newFlipped[0] || c.id === newFlipped[1]
                ? { ...c, isFlipped: false }
                : c
            );
            setCards(resetCards);
            const newIncorrect = incorrectCountRef.current + 1;
            setIncorrectCount(newIncorrect);
            setFlippedIds([]);
            setIsLocked(false);

            emitGameProgress({
              childId,
              activityId: 3,
              gameType: 'memory',
              event: 'progress',
              data: {
                matched: false,
                moves: newMoves,
                correct: false,
                correctCount: matchedPairsRef.current,
                incorrectCount: newIncorrect,
                score: Math.max(0, 1000 - newMoves * 50),
                matchedPairs: matchedPairsRef.current,
                flippedCards: [],
                cards: resetCards, // Sync flipped back cards
              },
              timestamp: new Date().toISOString(),
            });
          }, 700);
        }
      }

      return newFlipped;
    });
  }, [isPlaying, isMonitor, isLocked, childId, emitGameProgress]);

  // Win detection
  useEffect(() => {
    if (matchedPairs === pairsCount && matchedPairs > 0 && isPlaying && !gameCompleted) {
      setGameCompleted(true);
      setIsPlaying(false);

      const finalScore = Math.max(0, 1000 - moves * 50);
      emitGameComplete({
        childId,
        activityId: 3,
        gameType: 'memory',
        event: 'completed',
        data: { finalScore, totalMoves: moves },
        timestamp: new Date().toISOString(),
      });

      if (autoStart) {
        handleMoodAfterSelect("neutral"); // Default mood for auto-transition
      } else {
        setTimeout(() => setShowMoodAfter(true), 500);
      }
    }
  }, [matchedPairs, pairsCount, isPlaying, gameCompleted, moves, childId, emitGameComplete]);

  const handleMoodAfterSelect = (mood: string) => {
    setShowMoodAfter(false);
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const score = Math.max(0, 1000 - moves * 50);
    onComplete(score, duration, moodBefore, mood);
  };

  // ── Mood Before — Premium Immersive Design ────────────────
  if (!isMonitor && showMoodBefore) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-10 overflow-hidden text-center">
        {/* Background Decor */}
        <div className="absolute inset-0 bg-slate-50">
           <div 
             className="absolute inset-0 bg-cover bg-center opacity-20 blur-xl scale-110"
             style={{ backgroundImage: "url('/images/spojiparove.png')" }}
           />
           <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 via-white/80 to-indigo-600/10 backdrop-blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute -top-12 left-0 flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-500 hover:text-purple-600 font-black text-xs uppercase tracking-widest shadow-md border border-slate-100 transition-all hover:-translate-x-1 active:scale-95 z-20"
            >
              <span>⬅</span> Nazad
            </button>
          )}
          <div className="text-center mb-6 sm:mb-10 animate-in fade-in slide-in-from-top-10 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white shadow-sm border border-slate-100 text-purple-600 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-4">
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
                className="group relative flex flex-col items-center bg-white rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:scale-105 hover:-translate-y-2 cursor-pointer shadow-lg border border-slate-100 hover:border-purple-100 animate-in zoom-in-95 duration-500"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
                <div className="w-16 h-16 sm:w-24 sm:h-24 mb-3 sm:mb-4 flex items-center justify-center text-5xl sm:text-7xl transform group-hover:scale-110 transition-transform duration-500">
                   {mood.emoji}
                </div>
                <span className="text-sm sm:text-lg font-black text-slate-800 tracking-tight uppercase group-hover:text-purple-600 transition-colors">{mood.label}</span>
              </button>
            ))}
          </div>

          {isConnected && (
            <div className="mt-20 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-700">
               <div className="flex items-center gap-4 px-8 py-4 bg-white/40 backdrop-blur-2xl rounded-3xl border-2 border-white shadow-2xl">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                </span>
                <span className="text-sm sm:text-lg font-black text-emerald-900 tracking-[0.1em] uppercase">Sistemi su aktivni</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── POST-GAME MOOD ─────────────────────────────────
  if (!isMonitor && showMoodAfter) {
    const score = Math.max(0, 1000 - moves * 50);
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] w-full bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-[2rem] md:rounded-[3rem] p-4 sm:p-6 md:p-10 shadow-2xl animate-in fade-in duration-500 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

        <div className="text-center mb-6 md:mb-12 relative z-10">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-600 text-[10px] md:text-sm font-black uppercase tracking-widest mb-3 md:mb-4 inline-block">Igra je završena!</span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 md:mb-4">Bravo! Kako si sada? 🌟</h2>
          <p className="text-sm sm:text-base md:text-xl text-slate-500 font-medium tracking-wide">
            Završio/la si za <span className="font-black text-purple-600">{moves} poteza</span>! Rezultat: <span className="font-bold text-emerald-600 underline decoration-2 underline-offset-4">{score} poena</span>.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 sm:gap-8 w-full max-w-6xl px-4 relative z-10">
          {[
            { emoji: "😢", label: "Tužno", color: "from-blue-400 to-indigo-500", value: "very_upset" },
            { emoji: "😕", label: "Umorno", color: "from-slate-400 to-slate-500", value: "upset" },
            { emoji: "😐", label: "Okej", color: "from-emerald-400 to-teal-500", value: "neutral" },
            { emoji: "😊", label: "Dobro", color: "from-amber-400 to-orange-500", value: "happy" },
            { emoji: "😄", label: "Super!", color: "from-pink-400 to-rose-500", value: "very_happy" },
          ].map((mood, idx) => (
            <button
              key={mood.value}
              onClick={() => handleMoodAfterSelect(mood.value)}
              className="group relative flex flex-col items-center bg-white rounded-[2.5rem] p-6 sm:p-10 transition-all duration-500 hover:scale-[1.12] hover:-translate-y-4 cursor-pointer shadow-2xl border-4 border-transparent hover:border-white animate-in zoom-in-75 duration-700"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} opacity-0 group-hover:opacity-10 rounded-[2rem] transition-opacity duration-500`}></div>
              <span className="text-5xl sm:text-7xl md:text-8xl mb-2 sm:mb-4 transform group-hover:rotate-12 transition-transform duration-500 select-none drop-shadow-xl">{mood.emoji}</span>
              <span className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight uppercase group-hover:text-indigo-600 transition-colors">{mood.label}</span>
              <div className="absolute inset-0 rounded-[2rem] shadow-inner opacity-10 pointer-events-none" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Start screen removed for faster gameplay

  // ── PLAYING ────────────────────────────────────────
  let gridCols = "grid-cols-4";
  if (pairsCount >= 12) gridCols = "grid-cols-4 sm:grid-cols-6 md:grid-cols-8";
  else if (pairsCount >= 8) gridCols = "grid-cols-4 sm:grid-cols-5 md:grid-cols-6";
  else if (pairsCount >= 5) gridCols = "grid-cols-4 md:grid-cols-5";

  return (
    <div className="bg-white/95 backdrop-blur-xl rounded-[1.5rem] sm:rounded-2xl md:rounded-[3rem] p-3 sm:p-5 md:p-8 shadow-2xl border border-white/50 w-full max-w-5xl mx-auto flex-1 flex flex-col animate-in fade-in duration-700 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none rounded-2xl md:rounded-[3rem]"></div>

      {/* Header */}
      <div className="flex justify-between items-center mb-4 sm:mb-6 md:mb-8 bg-gradient-to-r from-purple-50/50 to-white rounded-2xl md:rounded-[2.5rem] px-3 py-2 sm:px-6 sm:py-3 md:px-8 md:py-5 shadow-xl relative overflow-hidden ring-1 ring-purple-100/50 flex-shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="flex items-center gap-2 sm:gap-3 md:gap-6 relative z-10">
          <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-lg sm:rounded-xl bg-white shadow-md flex items-center justify-center text-lg sm:text-xl md:text-2xl ring-2 sm:ring-4 ring-purple-50 border border-purple-100 transform -rotate-3 transition-transform">
            🧠
          </div>
          <div className="hidden sm:block">
            <h3 className="text-sm sm:text-base md:text-xl font-black text-slate-800 tracking-wide uppercase leading-tight">Nivo {level}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 md:gap-6 relative z-10 flex-shrink-0">
          <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-lg sm:rounded-xl md:rounded-2xl px-2 py-1 sm:px-4 sm:py-2 md:px-6 md:py-2.5 border border-purple-100/50 text-center min-w-[60px] sm:min-w-[80px] md:min-w-[100px]">
            <span className="block text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Potezi</span>
            <span className="text-sm sm:text-lg md:text-2xl font-black text-purple-600">{moves}</span>
          </div>
          <div className="bg-white/80 backdrop-blur-sm shadow-sm rounded-lg sm:rounded-xl md:rounded-2xl px-2 py-1 sm:px-4 sm:py-2 md:px-6 md:py-2.5 border border-purple-100/50 text-center min-w-[70px] sm:min-w-[90px] md:min-w-[120px]">
            <span className="block text-[7px] sm:text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Pronađeno</span>
            <span className="text-sm sm:text-lg md:text-2xl font-black text-emerald-500">
              {matchedPairs}<span className="text-slate-400 text-xs sm:text-sm mx-0.5 md:mx-1">/</span>{pairsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 flex items-center justify-center relative z-10 min-h-0">
        <div className={`grid ${gridCols} gap-2 sm:gap-3 md:gap-4 w-full max-w-4xl mx-auto px-1 sm:px-2 overflow-y-auto max-h-full custom-scrollbar py-2`}>
          {cards.map((card) => {
            const isRevealed = card.isFlipped || card.isMatched;
            const canClick = isPlaying && !isLocked && !card.isMatched && !card.isFlipped && !isMonitor;

            return (
              <button
                key={card.id}
                onClick={() => canClick && handleCardClick(card.id)}
                className={`relative aspect-square rounded-xl md:rounded-2xl text-2xl sm:text-4xl md:text-5xl font-bold transition-all duration-200 overflow-hidden
                  ${card.isMatched
                    ? "bg-emerald-50 shadow-sm border-2 border-emerald-200"
                    : isRevealed
                      ? "bg-white shadow-lg border-2 border-indigo-100"
                      : canClick
                        ? "bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
                        : "bg-gradient-to-br from-indigo-400 via-indigo-500 to-purple-500 shadow-md cursor-default"
                  }
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Card face (emoji) */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-200
                    ${isRevealed ? "opacity-100 scale-100" : "opacity-0 scale-75"}
                  `}
                >
                  <span className="select-none">{card.emoji}</span>
                </div>

                {/* Card back (?) */}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-200
                    ${isRevealed ? "opacity-0 scale-75" : "opacity-100 scale-100"}
                  `}
                >
                  <span className="text-white/40 font-black text-xl sm:text-2xl md:text-3xl select-none">?</span>
                </div>

                {/* Match sparkle */}
                {card.isMatched && (
                  <div className="absolute top-1 right-1 text-[10px] sm:text-sm md:text-base">✅</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto pt-3 text-center text-[8px] sm:text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">
        💡 Pokušaj da zapamtiš gde su sličice sakrivene!
      </div>
    </div>
  );
}