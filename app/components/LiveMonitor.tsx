// app/components/LiveMonitor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useGameMonitor } from '@/lib/useSocket';
import { GameUpdate } from '@/lib/types';
import { Eye, Activity, Clock, Award, TrendingUp, Monitor } from 'lucide-react';
import ShapeMatchingGame from './games/ShapeMatchingGame';
import MemoryGame from './games/MemoryGame';
import ColoringGame from './games/ColoringGame';

interface LiveMonitorProps {
  childId: number;
  childName: string;
}

export default function LiveMonitor({ childId, childName }: LiveMonitorProps) {
  const [updates, setUpdates] = useState<GameUpdate[]>([]);
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState({
    score: 0,
    level: 1,
    moves: 0,
    correct: 0,
    incorrect: 0,
  });
  const [visualState, setVisualState] = useState<any>(null);

  const handleUpdate = (update: GameUpdate & { isSync?: boolean }) => {
    setUpdates((prev) => {
      // Ako je sinhronizacija, ne dodajemo u feed istoriju osim ako je bitno
      if (update.isSync) return prev;
      return [update, ...prev].slice(0, 20);
    });

    if (update.event === 'started') {
      setCurrentGame(update.gameType);
      // Ako je sinhronizacija, popuni trenutne statuse
      setLiveStats({
        score: update.data.score || 0,
        level: update.data.level || 1,
        moves: update.data.moves || 0,
        correct: update.data.correctCount || 0,
        incorrect: update.data.incorrectCount || 0,
      });
    }

    if (update.event === 'completed') {
      setCurrentGame(null);
    }

    // Update visual state if present
    if (update.data) {
      setVisualState((prev: any) => ({
        ...prev,
        ...update.data,
      }));
    }

    // Update live stats based on incoming data
    setLiveStats((prev) => {
      const newStats = { ...prev };

      if (update.data.score !== undefined) newStats.score = update.data.score;
      if (update.data.level !== undefined) newStats.level = update.data.level;
      if (update.data.moves !== undefined) newStats.moves = update.data.moves;

      // Koristi apsolutne brojače ako ih igra šalje (da se ne bi desilo da Monitor "zakasni")
      if (update.data.correctCount !== undefined) {
        newStats.correct = update.data.correctCount;
      } else if (update.event === 'shape_placed' || update.event === 'color_applied' || (update.event === 'progress' && update.data.matched)) {
        if (update.data.correct === true || update.data.matched === true) newStats.correct += 1;
      }

      if (update.data.incorrectCount !== undefined) {
        newStats.incorrect = update.data.incorrectCount;
      } else if (update.event === 'shape_placed' || (update.event === 'progress' && !update.data.matched)) {
        if (update.data.correct === false || (update.event === 'progress' && update.data.matched === false)) newStats.incorrect += 1;
      }

      return newStats;
    });
  };

  const { activeSession, isConnected } = useGameMonitor(childId, handleUpdate);

  const renderGamePreview = () => {
    if (!currentGame || !visualState) return null;

    const gameProps = {
      childId,
      level: visualState.level || 1,
      onComplete: () => { }, // No-op for monitor
      isMonitor: true,
      monitorState: visualState,
    };

    return (
      <div className="mt-6 border-t pt-6 bg-white rounded-xl p-4 shadow-inner">
        <div className="flex items-center gap-2 mb-4 text-blue-600 font-semibold border-b pb-2">
          <Monitor size={20} className="animate-pulse" />
          <span>Live Ekran (Pogled deteta)</span>
        </div>
        <div className="bg-gray-50 rounded-2xl overflow-hidden border-2 border-dashed border-blue-200 p-4 transform scale-90 origin-top">
          <div className="pointer-events-none">
            {currentGame === 'shape_matching' && <ShapeMatchingGame {...gameProps} />}
            {currentGame === 'memory' && <MemoryGame {...gameProps} />}
            {currentGame === 'coloring' && <ColoringGame {...gameProps} />}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          * Prikaz je u realnom vremenu i bezbedan za gledanje
        </p>
      </div>
    );
  };

  const getGameName = (gameType: string) => {
    switch (gameType) {
      case 'shape_matching':
        return 'Složi Oblik';
      case 'memory':
        return 'Spoji Parove';
      case 'coloring':
        return 'Bojenje';
      default:
        return gameType;
    }
  };

  const getEventDescription = (update: GameUpdate) => {
    switch (update.event) {
      case 'started':
        return `🎮 Započeo igru "${getGameName(update.gameType)}"`;
      case 'shape_placed':
        return update.data.correct
          ? `✅ Tačan oblik - ${update.data.shape} (+${10 * update.data.level} poena)`
          : `❌ Pogrešan oblik - ${update.data.shape}`;
      case 'card_flipped':
        return `🎴 Okrenuo karticu - ${update.data.emoji}`;
      case 'color_applied':
        return `🎨 Obojio segment - ${update.data.color}`;
      case 'progress':
        return update.data.matched
          ? `✨ Par pronađen - ${update.data.emoji} (+${update.data.score} poena)`
          : '🔄 Progres';
      case 'completed':
        return `🏆 Završio igru! Konačan rezultat: ${update.data.finalScore} poena`;
      default:
        return update.event;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Eye className="text-blue-500" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Live Praćenje</h2>
            <p className="text-gray-500">{childName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-semibold">Povezano</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-red-600 font-semibold">Nepovezano</span>
            </>
          )}
        </div>
      </div>

      {/* Current Game Status */}
      {currentGame ? (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-blue-600" size={24} />
            <h3 className="text-xl font-bold text-gray-800">
              Trenutno igra: {getGameName(currentGame)}
            </h3>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <Award className="mx-auto mb-2 text-yellow-500" size={24} />
              <div className="text-2xl font-bold text-gray-800">{liveStats.score}</div>
              <div className="text-sm text-gray-500">Poeni</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <TrendingUp className="mx-auto mb-2 text-purple-500" size={24} />
              <div className="text-2xl font-bold text-gray-800">{liveStats.level}</div>
              <div className="text-sm text-gray-500">Nivo</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{liveStats.correct}</div>
              <div className="text-sm text-gray-500">Tačno</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{liveStats.incorrect}</div>
              <div className="text-sm text-gray-500">Netačno</div>
            </div>
          </div>

          {/* Game Preview Rendering */}
          {renderGamePreview()}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 mb-6 text-center">
          <Clock className="mx-auto mb-3 text-gray-400" size={48} />
          <p className="text-gray-500 text-lg">Dete trenutno ne igra nijednu igru</p>
        </div>
      )}

      {/* Activity Feed */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Activity size={20} />
          Aktivnost uživo
        </h3>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {updates.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nema aktivnosti</p>
          ) : (
            updates.map((update, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-400 hover:bg-gray-100 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <p className="text-gray-800 font-medium">
                    {getEventDescription(update)}
                  </p>
                  <span className="text-xs text-gray-400">
                    {new Date(update.timestamp).toLocaleTimeString('sr-RS')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}