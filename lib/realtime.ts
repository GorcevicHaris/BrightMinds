// lib/realtime.ts
// Live praćenje igre preko Supabase Realtime Broadcast-a.
// Jedan kanal po detetu, pretplata se radi tačno jednom, a poruke poslate pre
// nego što se kanal poveže čekaju u redu (ranije su se gubile ili bacale grešku).
//
// Naziv kanala (tema) NIJE javan: Supabase Broadcast kanal može da sluša svako ko zna
// njegov naziv i javni ključ, pa temu pravi server (lib/realtimeTopic.ts) i daje je samo
// stranicama kojima je pristup već proveren. Bez teme praćenje jednostavno ne radi.
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
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
// Duže od minuta: pregledači usporavaju tajmere u kartici koja nije u prvom planu
const WATCH_TIMEOUT_MS = 75_000;
// Kanal se gasi tek malo posle poslednjeg korisnika: brzo vraćanje na stranicu inače
// dobije kanal koji se upravo zatvara i više se ne poveže
const REMOVE_DELAY_MS = 5_000;

/** Tema kanala za dete čija se stranica prikazuje; postavlja je serverska stranica. */
const TopicContext = createContext<string | null>(null);
export const RealtimeTopicProvider = TopicContext.Provider;

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
    removeTimer: ReturnType<typeof setTimeout> | null;
}

let client: SupabaseClient | null = null;
const entries = new Map<string, ChannelEntry>();

function getClient(): SupabaseClient {
    if (!client) {
        client = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { persistSession: false },
            realtime: { params: { eventsPerSecond: 20 } },
        });
    }
    return client;
}

function acquire(topic: string | null): ChannelEntry | null {
    if (!realtimeConfigured || !topic) return null;

    const existing = entries.get(topic);
    if (existing) {
        if (existing.removeTimer) clearTimeout(existing.removeTimer);
        existing.removeTimer = null;
        existing.refs += 1;
        return existing;
    }

    const channel = getClient().channel(topic, { config: { broadcast: { self: false } } });
    const entry: ChannelEntry = {
        channel,
        ready: false,
        refs: 1,
        queue: [],
        updateListeners: new Set(),
        syncListeners: new Set(),
        watchListeners: new Set(),
        statusListeners: new Set(),
        removeTimer: null,
    };
    entries.set(topic, entry);

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

function release(topic: string | null) {
    const entry = topic ? entries.get(topic) : undefined;
    if (!topic || !entry) return;
    entry.refs -= 1;
    if (entry.refs > 0 || entry.removeTimer) return;
    entry.removeTimer = setTimeout(() => {
        if (entry.refs > 0) return;
        entries.delete(topic);
        void getClient().removeChannel(entry.channel);
    }, REMOVE_DELAY_MS);
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

export function useGameMonitor(childId: number, onUpdate: Listener, topic: string | null) {
    const [isConnected, setIsConnected] = useState(false);
    const onUpdateRef = useRef(onUpdate);
    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        const entry = acquire(topic);
        if (!entry) return;

        const listener: Listener = (update) => {
            // Dete koje je upravo krenulo odmah saznaje da ga odrasli gleda (ne čeka sledeći otkucaj)
            if (update.event === "started" && !update.isSync) send(entry, EVENT_WATCHING, { childId });
            onUpdateRef.current(update);
        };
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
            release(topic);
        };
    }, [childId, topic]);

    return { isConnected, isConfigured: realtimeConfigured && Boolean(topic) };
}

// ── Emiter (dete koje igra) ───────────────────────────────────────────────────

/**
 * Vraća `publish(update)` za slanje stanja igre monitoru.
 * Pamti poslednje stanje da bi monitor koji se naknadno poveže odmah dobio sliku.
 */
export function useGameBroadcast(childId: number, enabled = true) {
    const topic = useContext(TopicContext);
    const entryRef = useRef<ChannelEntry | null>(null);
    const lastRef = useRef<GameUpdate | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const entry = acquire(topic);
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
            release(topic);
        };
    }, [topic, enabled]);

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
export function useWatcherPresence(enabled = true): boolean {
    const topic = useContext(TopicContext);
    const [watching, setWatching] = useState(false);

    useEffect(() => {
        if (!enabled) return;
        const entry = acquire(topic);
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
            release(topic);
        };
    }, [topic, enabled]);

    return watching;
}
