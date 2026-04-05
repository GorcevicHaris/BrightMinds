// lib/useSocket.ts
'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameUpdate } from './types';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (socketRef.current) return;

    const socketUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    console.log('🔌 Connecting to socket at:', socketUrl);

    socketRef.current = io(socketUrl, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected:', socketRef.current?.id);
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return useMemo(() => ({
    socket: socketRef.current,
    isConnected,
  }), [isConnected]);
};

export const useGameMonitor = (childId: number, onUpdate: (update: GameUpdate) => void) => {
  const { socket, isConnected } = useSocket();
  const [activeSession, setActiveSession] = useState<any>(null);

  // Use a ref to store the latest onUpdate callback to avoid re-triggering the effect
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Prijavi se za praćenje deteta
    socket.emit('monitor:child', childId);

    // Slušaj game update-e
    const handler = (update: GameUpdate) => {
      console.log('📡 Received game update:', update);

      if (update.event === 'started') {
        setActiveSession(update);
      } else if (update.event === 'completed') {
        setActiveSession(null);
      }

      onUpdateRef.current(update);
    };

    socket.on('game:update', handler);
    // 
    socket.on('monitor:joined', (data) => {
      console.log('👁️ Monitoring child:', data.childId);
    });

    return () => {
      socket.emit('monitor:leave', childId);
      socket.off('game:update', handler);
      socket.off('monitor:joined');
    };
  }, [socket, isConnected, childId]); // Removed onUpdate from deps

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