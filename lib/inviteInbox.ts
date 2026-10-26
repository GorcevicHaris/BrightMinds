// lib/inviteInbox.ts
// „Sanduče” deteta (Supabase Realtime Broadcast): server javlja kad detetu stigne poziv druga
// sa spiska „Drugovi” ili odgovor na njegov poziv (app/api/_lib/inbox.ts). Naziv kanala je tajna
// koju server daje samo stranici tog deteta (lib/realtimeTopic.ts → inboxTopicFor). U poruci je
// samo znak „pogledaj”; sam poziv stranica uzima sa servera, gde se pristup proverava.
"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { realtimeClient, realtimeConfigured } from "./realtime";

const EVENT = "inbox:changed";
// Kanal se gasi tek malo posle poslednjeg korisnika: brz ponovni ulazak (StrictMode, povratak
// na stranicu) inače dobije kanal koji se upravo zatvara i više se ne poveže
const REMOVE_DELAY_MS = 3_000;

interface Entry {
    channel: RealtimeChannel | null;
    refs: number;
    ready: boolean;
    retries: number;
    retryTimer: ReturnType<typeof setTimeout> | null;
    removeTimer: ReturnType<typeof setTimeout> | null;
    listeners: Set<() => void>;
    statusListeners: Set<(ready: boolean) => void>;
}

const entries = new Map<string, Entry>();

function setReady(entry: Entry, ready: boolean) {
    entry.ready = ready;
    entry.statusListeners.forEach((fn) => fn(ready));
    // Posle (ponovnog) povezivanja: znak je mogao da promakne dok veze nije bilo
    if (ready) entry.listeners.forEach((fn) => fn());
}

function connect(topic: string, entry: Entry) {
    const channel = realtimeClient().channel(topic, { config: { broadcast: { self: false } } });
    entry.channel = channel;
    channel
        .on("broadcast", { event: EVENT }, () => entry.listeners.forEach((fn) => fn()))
        .subscribe((status) => {
            if (entry.channel !== channel) return;
            if (status === "SUBSCRIBED") {
                entry.retries = 0;
                setReady(entry, true);
                return;
            }
            if (entry.ready) setReady(entry, false);
            // Kanal koji je server zatvorio (npr. posle uspavanog uređaja) se ne vraća sam
            if (status !== "CLOSED" || entry.refs <= 0 || entry.retryTimer) return;
            const delay = Math.min(15_000, 1_000 * 2 ** Math.min(entry.retries, 4));
            entry.retries += 1;
            entry.channel = null;
            entry.retryTimer = setTimeout(() => {
                entry.retryTimer = null;
                if (entry.refs > 0 && entry.channel === null) connect(topic, entry);
            }, delay);
        });
}

function acquire(topic: string): Entry {
    const existing = entries.get(topic);
    if (existing) {
        if (existing.removeTimer) clearTimeout(existing.removeTimer);
        existing.removeTimer = null;
        existing.refs += 1;
        return existing;
    }
    const entry: Entry = { channel: null, refs: 1, ready: false, retries: 0, retryTimer: null, removeTimer: null, listeners: new Set(), statusListeners: new Set() };
    entries.set(topic, entry);
    connect(topic, entry);
    return entry;
}

function release(topic: string) {
    const entry = entries.get(topic);
    if (!entry) return;
    entry.refs -= 1;
    if (entry.refs > 0 || entry.removeTimer) return;
    entry.removeTimer = setTimeout(() => {
        if (entry.refs > 0) return;
        entries.delete(topic);
        if (entry.retryTimer) clearTimeout(entry.retryTimer);
        const channel = entry.channel;
        entry.channel = null;
        if (channel) void realtimeClient().removeChannel(channel);
    }, REMOVE_DELAY_MS);
}

/**
 * Pretplata na sanduče; `onSignal` se zove na svaki znak i odmah po (ponovnom) povezivanju.
 * Vraća da li je sanduče povezano (kad nije, stranica sama povremeno proverava server).
 */
export function useInviteInbox(topic: string | null, onSignal: () => void): boolean {
    const [ready, setReadyState] = useState(false);
    const signalRef = useRef(onSignal);
    useEffect(() => {
        signalRef.current = onSignal;
    }, [onSignal]);

    useEffect(() => {
        if (!topic || !realtimeConfigured) return;
        const entry = acquire(topic);
        const listener = () => signalRef.current();
        const onStatus = (value: boolean) => setReadyState(value);
        entry.listeners.add(listener);
        entry.statusListeners.add(onStatus);
        if (entry.ready) queueMicrotask(() => setReadyState(true));
        return () => {
            entry.listeners.delete(listener);
            entry.statusListeners.delete(onStatus);
            setReadyState(false);
            release(topic);
        };
    }, [topic]);

    return ready;
}
