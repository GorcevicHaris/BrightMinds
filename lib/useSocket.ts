// lib/useSocket.ts
'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameUpdate } from './types';

// ── Singleton socket — shared across all components ─────────────────────────
let _socket: Socket | null = null;
let _connectionCount = 0;

function getSocket(): Socket {
  if (_socket && _socket.connected) return _socket;
  const url =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

  _socket = io(url, {
    path: '/api/socket',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
  });
  return _socket;
}
// ─────────────────────────────────────────────────────────────────────────────

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    _connectionCount++;

    // Sync initial state
    if (socket.connected) setIsConnected(true);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      _connectionCount--;
      // Only disconnect when no component is using the socket
      if (_connectionCount === 0 && _socket) {
        _socket.disconnect();
        _socket = null;
      }
    };
  }, []);

  return useMemo(() => ({
    socket: _socket,
    isConnected,
  }), [isConnected]);
};

export const useGameMonitor = (childId: number, onUpdate: (update: GameUpdate) => void) => {
  const { socket, isConnected } = useSocket();
  const [activeSession, setActiveSession] = useState<any>(null);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('monitor:child', childId);

    const handler = (update: GameUpdate) => {
      if (update.event === 'started') setActiveSession(update);
      else if (update.event === 'completed') setActiveSession(null);
      onUpdateRef.current(update);
    };

    const onJoined = () => {}; // silenced — was console.log

    socket.on('game:update', handler);
    socket.on('monitor:joined', onJoined);

    return () => {
      socket.emit('monitor:leave', childId);
      socket.off('game:update', handler);
      socket.off('monitor:joined', onJoined);
    };
  }, [socket, isConnected, childId]);

  return { activeSession, isConnected };
};

export const useGameEmitter = () => {
  const { socket, isConnected } = useSocket();

  const emitGameStart = useCallback((childId: number, activityId: number, gameType: string, initialData?: any) => {
    if (!socket) return;
    socket.emit('game:start', { childId, activityId, gameType, ...initialData });
  }, [socket]);

  const emitGameProgress = useCallback((update: GameUpdate) => {
    if (!socket) return;
    socket.emit('game:progress', update);
  }, [socket]);

  const emitGameComplete = useCallback((update: GameUpdate) => {
    if (!socket) return;
    socket.emit('game:complete', update);
  }, [socket]);

  return useMemo(() => ({
    emitGameStart,
    emitGameProgress,
    emitGameComplete,
    isConnected,
  }), [emitGameStart, emitGameProgress, emitGameComplete, isConnected]);
};