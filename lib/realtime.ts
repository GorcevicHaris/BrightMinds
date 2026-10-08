// lib/realtime.ts
// Live praćenje igre preko Supabase Realtime Broadcast-a.
// Jedan kanal po detetu, pretplata se radi tačno jednom, a poruke poslate pre
// nego što se kanal poveže čekaju u redu (ranije su se gubile ili bacale grešku).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { GameUpdate } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const realtimeConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const EVENT_UPDATE = "game:update";
const EVENT_SYNC = "monitor:request-sync";
// Monitor se javlja na svakih nekoliko sekundi, da dete vidi znak „neko gleda”
const EVENT_WATCHING = "monitor:watching";
const WATCH_PING_MS = 15_000;
const WATCH_TIMEOUT_MS = 40_000;

type Listener = (payload: GameUpdate) => void;

interface ChannelEntry {
    channel: RealtimeChannel;
    ready: boolean;
    refs: number;
    queue: { event: string; payload: unknown }[];
    updateListeners: Set<Listener>;
    syncListeners: Set<() => void>;
    watchListeners: Set<() => void>;
    statusListeners: Set<(ready: boolean) => void>;
}

let client: SupabaseClient | null = null;
const entries = new Map<number, ChannelEntry>();

function getClient(): SupabaseClient {
    if (!client) {
        client = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false },
            realtime: { params: { eventsPerSecond: 20 } },
        });
    }
    return client;
}

function acquire(childId: number): ChannelEntry | null {
    if (!realtimeConfigured) return null;

    const existing = entries.get(childId);
    if (existing) {
        existing.refs += 1;
        return existing;
    }

    const channel = getClient().channel(`child:${childId}`, { config: { broadcast: { self: false } } });
    const entry: ChannelEntry = {
        channel,
        ready: false,
        refs: 1,
        queue: [],
        updateListeners: new Set(),
        syncListeners: new Set(),
        watchListeners: new Set(),
        statusListeners: new Set(),
    };
    entries.set(childId, entry);

    channel
        .on("broadcast", { event: EVENT_UPDATE }, ({ payload }) => {
            entry.updateListeners.forEach((fn) => fn(payload as GameUpdate));
        })
        .on("broadcast", { event: EVENT_SYNC }, () => {
            entry.syncListeners.forEach((fn) => fn());
            entry.watchListeners.forEach((fn) => fn());
        })
        .on("broadcast", { event: EVENT_WATCHING }, () => {
            entry.watchListeners.forEach((fn) => fn());
        })
        .subscribe((status) => {
            const ready = status === "SUBSCRIBED";
            entry.ready = ready;
            entry.statusListeners.forEach((fn) => fn(ready));
            if (ready) {
                const pending = entry.queue.splice(0);
                pending.forEach((msg) => void channel.send({ type: "broadcast", ...msg }));
            }
        });

    return entry;
}

function release(childId: number) {
    const entry = entries.get(childId);
    if (!entry) return;
    entry.refs -= 1;
    if (entry.refs <= 0) {
        entries.delete(childId);
        void getClient().removeChannel(entry.channel);
    }
}

function send(entry: ChannelEntry, event: string, payload: unknown) {
    if (entry.ready) {
        void entry.channel.send({ type: "broadcast", event, payload });
    } else {
        // Čuvamo samo poslednjih nekoliko poruka dok se kanal ne poveže
        entry.queue.push({ event, payload });
        if (entry.queue.length > 20) entry.queue.shift();
    }
}

// ── Monitor (roditelj/terapeut) ───────────────────────────────────────────────

export function useGameMonitor(childId: number, onUpdate: Listener) {
    const [isConnected, setIsConnected] = useState(false);
    const onUpdateRef = useRef(onUpdate);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        const entry = acquire(childId);
        if (!entry) return;

        const listener: Listener = (update) => onUpdateRef.current(update);
        const onStatus = (ready: boolean) => {
            setIsConnected(ready);
            // Čim se povežemo, tražimo trenutno stanje od igre koja je možda već u toku
            if (ready) send(entry, EVENT_SYNC, { childId });
        };

        entry.updateListeners.add(listener);
        entry.statusListeners.add(onStatus);
        if (entry.ready) onStatus(true);
        const ping = setInterval(() => {
            if (entry.ready) send(entry, EVENT_WATCHING, { childId });
        }, WATCH_PING_MS);

        return () => {
            clearInterval(ping);
            entry.updateListeners.delete(listener);
            entry.statusListeners.delete(onStatus);
            setIsConnected(false);
            release(childId);
        };
    }, [childId]);

    return { isConnected, isConfigured: realtimeConfigured };
}

// ── Emiter (dete koje igra) ───────────────────────────────────────────────────

/**
 * Vraća `publish(update)` za slanje stanja igre monitoru.
 * Pamti poslednje stanje da bi monitor koji se naknadno poveže odmah dobio sliku.
 */
export function useGameBroadcast(childId: number, enabled = true) {
    const entryRef = useRef<ChannelEntry | null>(null);
    const lastRef = useRef<GameUpdate | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const entry = acquire(childId);
        if (!entry) return;
        entryRef.current = entry;

        const onSync = () => {
            if (!lastRef.current) return;
            send(entry, EVENT_UPDATE, { ...lastRef.current, isSync: true, timestamp: new Date().toISOString() });
        };
        entry.syncListeners.add(onSync);

        return () => {
            entry.syncListeners.delete(onSync);
            entryRef.current = null;
            release(childId);
        };
    }, [childId, enabled]);

    return useCallback((update: GameUpdate) => {
        if (update.event === "completed") {
            lastRef.current = null;
        } else {
            // Za sinhronizaciju uvek čuvamo poslednje puno stanje kao "started"
            lastRef.current = { ...update, event: "started" };
        }
        const entry = entryRef.current;
        if (entry) send(entry, EVENT_UPDATE, update);
    }, []);
}

// ── Znak detetu da ga neko gleda ──────────────────────────────────────────────

/**
 * True dok je roditelj ili terapeut povezan na praćenje uživo.
 * Dete ima pravo da zna da ga neko gleda, pa se na osnovu ovoga prikazuje stalni znak.
 */
export function useWatcherPresence(childId: number, enabled = true): boolean {
    const [watching, setWatching] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        const entry = acquire(childId);
        if (!entry) return;

        let timeout: ReturnType<typeof setTimeout> | null = null;
        const onPing = () => {
            setWatching(true);
            if (timeout) clearTimeout(timeout);
            timeout = setTimeout(() => setWatching(false), WATCH_TIMEOUT_MS);
        };
        entry.watchListeners.add(onPing);

        return () => {
            entry.watchListeners.delete(onPing);
            if (timeout) clearTimeout(timeout);
            setWatching(false);
            release(childId);
        };
    }, [childId, enabled]);

    return watching;
}
