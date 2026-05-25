// lib/useSocket.ts
// Replaces Socket.io with Supabase Realtime Broadcast.
// Works on Vercel (serverless) — no custom server needed.
'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { GameUpdate } from './types';

// ── Supabase client singleton (anon key, client-side safe) ──────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: { eventsPerSecond: 20 },
      },
    });
  }
  return _supabase;
}

// ── Shared channel cache: one channel per childId ───────────────────────────
const _channels = new Map<number, RealtimeChannel>();
const _channelRefCounts = new Map<number, number>();

function getChannel(childId: number): RealtimeChannel {
  if (_channels.has(childId)) return _channels.get(childId)!;
  const sb = getSupabase();
  const channel = sb.channel(`child:${childId}`, {
    config: { broadcast: { self: true } },
  });
  _channels.set(childId, channel);
  _channelRefCounts.set(childId, 0);
  return channel;
}

function retainChannel(childId: number) {
  _channelRefCounts.set(childId, (_channelRefCounts.get(childId) || 0) + 1);
}

function releaseChannel(childId: number) {
  const count = (_channelRefCounts.get(childId) || 1) - 1;
  _channelRefCounts.set(childId, count);
  if (count <= 0) {
    const channel = _channels.get(childId);
    if (channel) {
      getSupabase().removeChannel(channel);
      _channels.delete(childId);
      _channelRefCounts.delete(childId);
    }
  }
}

// ── useSocket (compatibility shim — returns isConnected) ────────────────────
export const useSocket = () => {
  // Always "connected" when Supabase client exists
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    setIsConnected(!!supabaseUrl && !!supabaseAnonKey);
  }, []);

  return useMemo(() => ({
    socket: null, // not needed anymore but keeps interface
    isConnected,
  }), [isConnected]);
};

// ── useGameMonitor ──────────────────────────────────────────────────────────
export const useGameMonitor = (childId: number, onUpdate: (update: GameUpdate) => void) => {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    const channel = getChannel(childId);
    retainChannel(childId);

    const handler = (payload: { event: string; payload: any }) => {
      const update = payload.payload as GameUpdate & { isSync?: boolean; reason?: string };
      if (update.event === 'started') setActiveSession(update);
      else if (update.event === 'completed') setActiveSession(null);
      onUpdateRef.current(update);
    };

    channel
      .on('broadcast', { event: 'game:update' }, handler)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Request sync from any active game emitter
          channel.send({
            type: 'broadcast',
            event: 'monitor:request-sync',
            payload: { childId },
          });
        }
      });

    return () => {
      setIsConnected(false);
      releaseChannel(childId);
    };
  }, [childId]);

  return { activeSession, isConnected };
};

// ── useGameEmitter ──────────────────────────────────────────────────────────
export const useGameEmitter = () => {
  const [isConnected] = useState(true);

  // Keep track of last state per child so we can respond to sync requests
  const lastStateRef = useRef<Map<number, any>>(new Map());

  // Listen for sync requests on any channel this emitter has written to
  const syncListenersRef = useRef<Set<number>>(new Set());

  const setupSyncListener = useCallback((childId: number) => {
    if (syncListenersRef.current.has(childId)) return;
    syncListenersRef.current.add(childId);

    const channel = getChannel(childId);
    retainChannel(childId);

    channel
      .on('broadcast', { event: 'monitor:request-sync' }, () => {
        const lastState = lastStateRef.current.get(childId);
        if (lastState) {
          channel.send({
            type: 'broadcast',
            event: 'game:update',
            payload: {
              ...lastState,
              isSync: true,
              timestamp: new Date().toISOString(),
            },
          });
        }
      })
      .subscribe();
  }, []);

  const emitGameStart = useCallback((childId: number, activityId: number, gameType: string, initialData?: any) => {
    const channel = getChannel(childId);
    retainChannel(childId);
    setupSyncListener(childId);

    const update = {
      childId,
      activityId,
      gameType,
      event: 'started',
      data: {
        score: 0,
        level: initialData?.level || 1,
        correctCount: 0,
        incorrectCount: 0,
        ...initialData,
      },
      timestamp: new Date().toISOString(),
    };

    lastStateRef.current.set(childId, update);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'game:update',
          payload: update,
        });
      }
    });
  }, [setupSyncListener]);

  const emitGameProgress = useCallback((update: GameUpdate) => {
    const childId = update.childId;
    const channel = getChannel(childId);
    setupSyncListener(childId);

    // Merge into last state for sync
    const prev = lastStateRef.current.get(childId);
    if (prev) {
      lastStateRef.current.set(childId, {
        ...prev,
        gameType: update.gameType || prev.gameType,
        data: { ...prev.data, ...update.data },
      });
    } else {
      lastStateRef.current.set(childId, update);
    }

    channel.send({
      type: 'broadcast',
      event: 'game:update',
      payload: { ...update, timestamp: update.timestamp || new Date().toISOString() },
    });
  }, [setupSyncListener]);

  const emitGameComplete = useCallback((update: GameUpdate) => {
    const childId = update.childId;
    const channel = getChannel(childId);

    lastStateRef.current.delete(childId);

    channel.send({
      type: 'broadcast',
      event: 'game:update',
      payload: {
        ...update,
        event: 'completed',
        timestamp: update.timestamp || new Date().toISOString(),
      },
    });
  }, []);

  return useMemo(() => ({
    emitGameStart,
    emitGameProgress,
    emitGameComplete,
    isConnected,
  }), [emitGameStart, emitGameProgress, emitGameComplete, isConnected]);
};