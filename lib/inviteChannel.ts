// lib/inviteChannel.ts
// Kanal igre sa drugom na drugom uređaju (Supabase Realtime: Broadcast + Presence).
// Naziv kanala je tajna koju daje server (lib/realtimeTopic.ts → inviteChannelFor) samo
// domaćinu i drugu koji je uneo kod. Preko kanala idu SAMO brojevi stanja igre (RemoteState,
// lib/invite.ts) i znak „kraj”; imena i drugari stižu od servera, ne od drugog uređaja.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RemoteState } from "./invite";
import { realtimeClient, realtimeConfigured } from "./realtime";

const EVENT_STATE = "together:state";
const EVENT_END = "together:end";
// Kanal se gasi tek malo posle poslednjeg korisnika (brz ponovni ulazak u razvoju, StrictMode)
const REMOVE_DELAY_MS = 3_000;

export type InviteRole = "host" | "guest";

interface Entry {
    channel: RealtimeChannel;
    refs: number;
    ready: boolean;
    removeTimer: ReturnType<typeof setTimeout> | null;
    onState: Set<(payload: unknown) => void>;
    onEnd: Set<() => void>;
    onPresence: Set<(present: boolean) => void>;
    onReady: Set<(ready: boolean) => void>;
    /** Poslednje stanje koje čeka da se kanal poveže */
    pending: unknown;
}

const entries = new Map<string, Entry>();

function acquire(name: string, role: InviteRole): Entry {
    const existing = entries.get(name);
    if (existing) {
        if (existing.removeTimer) clearTimeout(existing.removeTimer);
        existing.removeTimer = null;
        existing.refs += 1;
        return existing;
    }
    const channel = realtimeClient().channel(name, { config: { broadcast: { self: false }, presence: { key: role } } });
    const entry: Entry = { channel, refs: 1, ready: false, removeTimer: null, onState: new Set(), onEnd: new Set(), onPresence: new Set(), onReady: new Set(), pending: null };
    entries.set(name, entry);

    channel
        .on("broadcast", { event: EVENT_STATE }, ({ payload }) => entry.onState.forEach((fn) => fn(payload)))
        .on("broadcast", { event: EVENT_END }, () => entry.onEnd.forEach((fn) => fn()))
        .on("presence", { event: "sync" }, () => {
            const present = Object.keys(channel.presenceState()).some((key) => key !== role);
            entry.onPresence.forEach((fn) => fn(present));
        })
        .subscribe((status) => {
            const ready = status === "SUBSCRIBED";
            entry.ready = ready;
            entry.onReady.forEach((fn) => fn(ready));
            if (!ready) return;
            void channel.track({ role });
            if (entry.pending !== null) {
                void channel.send({ type: "broadcast", event: EVENT_STATE, payload: entry.pending });
                entry.pending = null;
            }
        });
    return entry;
}

function release(name: string) {
    const entry = entries.get(name);
    if (!entry) return;
    entry.refs -= 1;
    if (entry.refs > 0 || entry.removeTimer) return;
    entry.removeTimer = setTimeout(() => {
        if (entry.refs > 0) return;
        entries.delete(name);
        void entry.channel.untrack();
        void realtimeClient().removeChannel(entry.channel);
    }, REMOVE_DELAY_MS);
}

interface Handlers {
    onState: (payload: unknown) => void;
    onEnd: () => void;
}

/**
 * Povezuje se na kanal igre sa drugom. Vraća da li je kanal povezan, da li je drug prisutan
 * (Presence) i funkcije za slanje svog stanja i znaka „kraj igre sa drugom”.
 */
export function useInviteChannel(name: string | null, role: InviteRole, handlers: Handlers) {
    const [ready, setReady] = useState(false);
    const [present, setPresent] = useState<boolean | null>(null);
    const entryRef = useRef<Entry | null>(null);
    const handlersRef = useRef(handlers);
    useEffect(() => {
        handlersRef.current = handlers;
    }, [handlers]);

    useEffect(() => {
        if (!name || !realtimeConfigured) return;
        const entry = acquire(name, role);
        entryRef.current = entry;
        const onState = (payload: unknown) => handlersRef.current.onState(payload);
        const onEnd = () => handlersRef.current.onEnd();
        const onReady = (value: boolean) => setReady(value);
        const onPresence = (value: boolean) => setPresent(value);
        entry.onState.add(onState);
        entry.onEnd.add(onEnd);
        entry.onReady.add(onReady);
        entry.onPresence.add(onPresence);
        if (entry.ready) queueMicrotask(() => setReady(true));
        return () => {
            entry.onState.delete(onState);
            entry.onEnd.delete(onEnd);
            entry.onReady.delete(onReady);
            entry.onPresence.delete(onPresence);
            entryRef.current = null;
            setReady(false);
            setPresent(null);
            release(name);
        };
    }, [name, role]);

    const sendState = useCallback((state: RemoteState) => {
        const entry = entryRef.current;
        if (!entry) return;
        if (entry.ready) void entry.channel.send({ type: "broadcast", event: EVENT_STATE, payload: state });
        else entry.pending = state;
    }, []);

    const sendEnd = useCallback(() => {
        const entry = entryRef.current;
        if (entry?.ready) void entry.channel.send({ type: "broadcast", event: EVENT_END, payload: {} });
    }, []);

    return { ready, present, sendState, sendEnd, configured: realtimeConfigured };
}
