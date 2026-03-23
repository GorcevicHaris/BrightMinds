// app/components/LiveMonitor.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGameMonitor } from '@/lib/useSocket';
import { GameUpdate } from '@/lib/types';
import { Eye, Activity, Clock, Award, TrendingUp, Monitor } from 'lucide-react';
import ShapeMatchingGame from './games/ShapeMatchingGame';
import MemoryGame from './games/MemoryGame';
import ColoringGame from './games/ColoringGame';
import SoundToImageGame from './games/SoundToImageGame';
import SocialCommunicationGame from './games/SocialCommunicationGame';
import SocialStoryGame from './games/SocialStoryGame';
import EmotionsGame from './games/EmotionsGame';


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

  const handleUpdate = useCallback((update: GameUpdate & { isSync?: boolean; reason?: string }) => {
    // 1. Ako je igra započela (ili se sinhronizujemo na već započetu) ili imamo gameType u progresu
    if (update.event === 'started' || update.isSync || (!currentGame && update.gameType)) {
      if (update.gameType) setCurrentGame(update.gameType);

      // Reset state for new game or sync
      if (update.event === 'started' || update.isSync) {
        setVisualState(update.data || {});
        setLiveStats({
          score: update.data?.score || 0,
          level: update.data?.level || 1,
          moves: update.data?.moves || 0,
          correct: update.data?.correctCount || 0,
          incorrect: update.data?.incorrectCount || 0,
        });
      }

      if (update.isSync) {
        setUpdates(prev => prev.length === 0 ? [update] : prev);
      } else if (update.event === 'started') {
        setUpdates((prev) => [update, ...prev].slice(0, 20));
      }
    }

    if (update.event === 'completed') {
      // Ignorišemo disconnect kao kraj igre da bismo omogućili refresh stranice kod deteta
      if (update.reason === 'disconnect') {
        setUpdates((prev) => [update, ...prev].slice(0, 20));
        return;
      }
      // 2. Igra je stvarno gotova (manual exit ili win)
      setCurrentGame(null);
      setVisualState(null);
      setUpdates((prev) => [update, ...prev].slice(0, 20));
      return;
    }

    // 3. Običan progres (uključujući i slučajeve gde smo gore preskočili started/sync logiku)
    if (update.event !== 'started' && !update.isSync) {
      setUpdates((prev) => [update, ...prev].slice(0, 20));
      if (update.data) {
        setVisualState((prev: any) => ({
          ...prev,
          ...update.data,
        }));
      }
    }

    // 4. Ažuriraj statistiku
    if (update.data) {
      setLiveStats((prev) => {
        const newStats = { ...prev };

        // Prioritet imaju direktno poslati brojači iz same igrice
        if (update.data.score !== undefined) newStats.score = update.data.score;
        if (update.data.level !== undefined) newStats.level = update.data.level;
        if (update.data.moves !== undefined) newStats.moves = update.data.moves;

        if (update.data.correctCount !== undefined) {
          newStats.correct = update.data.correctCount;
        } else if (update.event === 'shape_placed' || update.event === 'color_applied' || (update.event === 'progress' && update.data.matched)) {
          // Fallback ako igrica ne šalje total count
          if (!update.isSync && (update.data.correct === true || update.data.matched === true)) {
            newStats.correct += 1;
          }
        }

        if (update.data.incorrectCount !== undefined) {
          newStats.incorrect = update.data.incorrectCount;
        } else if (update.data.totalIncorrect !== undefined) {
          newStats.incorrect = update.data.totalIncorrect;
        } else if (!update.isSync && (update.data.correct === false || (update.event === 'progress' && update.data.matched === false))) {
          newStats.incorrect += 1;
        }

        return newStats;
      });
    }
  }, [childId, currentGame, setUpdates, setCurrentGame, setVisualState, setLiveStats]);

  const { activeSession, isConnected } = useGameMonitor(childId, handleUpdate);

  const renderGamePreview = () => {
    if (!currentGame || !visualState) return null;

    const gameProps = {
      childId,
      level: visualState.level || liveStats.level || 1,
      onComplete: () => { },
      isMonitor: true,
      monitorState: {
        isPlaying: true,
        currentIndex: visualState.index ?? 0,
        score: liveStats.score,
        correctCount: liveStats.correct,
        totalIncorrect: liveStats.incorrect,
        ...visualState,
      },
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
            {currentGame === 'sound-to-image' && <SoundToImageGame {...gameProps} />}
            {currentGame === 'social' && <SocialCommunicationGame {...gameProps} />}
            {currentGame === 'social-story' && <SocialStoryGame {...gameProps} />}
            {currentGame === 'emotions' && <EmotionsGame {...gameProps} />}
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
      case 'shape_matching': return 'Složi Oblik';
      case 'memory': return 'Spoji Parove';
      case 'coloring': return 'Bojenje';
      case 'sound-to-image': return 'Zvuk → Slika';
      case 'social': return 'Šta treba da kažeš?';
      case 'social-story': return 'Istraži Grad';
      case 'emotions': return 'Moja Osećanja';
      default: return gameType;

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
      case 'answer':
        if ((update.gameType as string) === 'social') {
          return update.data.correct
            ? `✅ Tačan odgovor (pitanje ${(update.data.index ?? 0) + 1}/${update.data.totalSituations ?? '?'}) — ${update.data.score} poena ukupno`
            : `❌ Pogrešan odgovor na pitanju ${(update.data.index ?? 0) + 1}`;
        }
        if ((update.gameType as string) === 'social-story') {
          return update.data.correct
            ? `✅ Tačan odgovor na raskrsnici (pitanje rešeno)`
            : `❌ Pogrešan odgovor na raskrsnicu`;
        }
        if ((update.gameType as string) === 'sound-to-image') {
          return update.data.correct
            ? `🔊 Tačno prepoznao zvuk: ${update.data.currentSound?.label || ''}`
            : `👂 Pogrešan pokušaj prepoznavanja zvuka`;
        }
        return update.data.correct ? '✅ Tačan odgovor' : '❌ Pogrešan odgovor';

      case 'progress':
        if ((update.gameType as string) === 'social-story') {
          return `🚗 Vozi se kroz grad: ${update.data.curId || 'n00'}`;
        }
        if ((update.gameType as string) === 'emotions') {
          return update.data.matched
            ? `✅ Tačno prepoznao emociju: ${update.data.selectedEmotion}`
            : `❌ Pogrešan izbor emocije: ${update.data.selectedEmotion}`;
        }
        return update.data.matched
          ? `✨ Par pronađen - ${update.data.emoji} (+${update.data.score} poena)`
          : '🔄 Progres';

      case 'completed':
        if ((update as any).reason === 'disconnect') return '🔌 Prekinuta veza — dete je izašlo';
        if (update.data?.reason === 'manual_exit') return '🚪 Izašao iz igre pre kraja';
        return `🏆 Završio igru! Konačan rezultat: ${update.data?.finalScore ?? 0} poena`;
      case 'new_round':
        return `🎯 Nova runda - Pronađi ${update.data?.currentSound?.label ?? '?'}`;
      default:
        return update.event;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-4xl mx-auto border border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <Eye className="text-white" size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Live Praćenje</h2>
            <p className="text-slate-500 font-medium text-sm">{childName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border">
          {isConnected ? (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-bold text-sm">Povezano</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-red-600 font-bold text-sm">Nepovezano</span>
            </>
          )}
        </div>
      </div>

      {/* Current Game Status */}
      {currentGame ? (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-5">
            <Activity className="text-blue-600" size={24} />
            <h3 className="text-xl font-black text-slate-800">
              Trenutno igra: {getGameName(currentGame)}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <Award className="mx-auto mb-2 text-yellow-500" size={24} />
              <div className="text-2xl font-black text-slate-800">{liveStats.score}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Poeni</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <TrendingUp className="mx-auto mb-2 text-purple-500" size={24} />
              <div className="text-2xl font-black text-slate-800">{liveStats.level}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nivo</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-black text-green-600">{liveStats.correct}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tačno</div>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-black text-red-500">{liveStats.incorrect}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Netačno</div>
            </div>
          </div>

          {renderGamePreview()}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-10 mb-6 text-center border border-slate-100">
          <Clock className="mx-auto mb-4 text-slate-300" size={48} />
          <p className="text-slate-500 text-lg font-medium">Dete trenutno ne igra nijednu igru</p>
          <p className="text-slate-400 text-sm mt-1">Ovde ćete videti aktivnosti čim dete započne igru</p>
        </div>
      )}

      {/* Activity Feed */}
      <div>
        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
          <Activity size={20} />
          Aktivnost uživo
        </h3>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {updates.length === 0 ? (
            <p className="text-slate-400 text-center py-8 font-medium">Nema aktivnosti</p>
          ) : (
            updates.map((update, index) => (
              <div
                key={index}
                className="bg-slate-50 rounded-xl p-4 border-l-4 border-blue-400 hover:bg-slate-100 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <p className="text-slate-800 font-medium text-sm">
                    {getEventDescription(update)}
                  </p>
                  <span className="text-xs text-slate-400 font-mono whitespace-nowrap ml-4">
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