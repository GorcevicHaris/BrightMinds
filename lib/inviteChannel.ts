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
// Zajednička tabla: snimak table (domaćin → gost), dodir gosta (gost → domaćin) i „pošalji mi
// poslednji snimak” (gost posle ulaska ili osvežavanja)
const EVENT_MIRROR = "together:mirror";
const EVENT_ACTION = "together:action";
const EVENT_HELLO = "together:hello";
// Kanal se gasi tek malo posle poslednjeg korisnika (brz ponovni ulazak u razvoju, StrictMode)
const REMOVE_DELAY_MS = 3_000;

export type InviteRole = "host" | "guest";

interface Entry {
    name: string;
    role: InviteRole;
    channel: RealtimeChannel | null;
    refs: number;
    ready: boolean;
    removeTimer: ReturnType<typeof setTimeout> | null;
    retryTimer: ReturnType<typeof setTimeout> | null;
    retries: number;
    onState: Set<(payload: unknown) => void>;
    onEnd: Set<() => void>;
    onShared: Set<(kind: SharedEvent, payload: unknown) => void>;
    onPresence: Set<(present: boolean) => void>;
    onReady: Set<(ready: boolean) => void>;
    /** Poslednje stanje koje čeka da se kanal poveže */
    pending: unknown;
}

const entries = new Map<string, Entry>();

function setReady(entry: Entry, ready: boolean) {
    if (entry.ready === ready) return;
    entry.ready = ready;
    entry.onReady.forEach((fn) => fn(ready));
}

/**
 * Pravi kanal i pretplaćuje se. Kad server zatvori kanal (npr. posle uspavanog uređaja), posle
 * kratke pauze se pravi nov kanal — igra sa drugom se sama nastavlja.
 */
function connect(entry: Entry) {
    const channel = realtimeClient().channel(entry.name, { config: { broadcast: { self: false }, presence: { key: entry.role } } });
    entry.channel = channel;
    channel
        .on("broadcast", { event: EVENT_STATE }, ({ payload }) => entry.onState.forEach((fn) => fn(payload)))
        .on("broadcast", { event: EVENT_END }, () => entry.onEnd.forEach((fn) => fn()))
        .on("broadcast", { event: EVENT_MIRROR }, ({ payload }) => entry.onShared.forEach((fn) => fn("mirror", payload)))
        .on("broadcast", { event: EVENT_ACTION }, ({ payload }) => entry.onShared.forEach((fn) => fn("action", payload)))
        .on("broadcast", { event: EVENT_HELLO }, ({ payload }) => entry.onShared.forEach((fn) => fn("hello", payload)))
        .on("presence", { event: "sync" }, () => {
            const present = Object.keys(channel.presenceState()).some((key) => key !== entry.role);
            entry.onPresence.forEach((fn) => fn(present));
        })
        .subscribe((status) => {
            if (entry.channel !== channel) return;
            if (status === "SUBSCRIBED") {
                entry.retries = 0;
                setReady(entry, true);
                void channel.track({ role: entry.role });
                if (entry.pending !== null) {
                    void channel.send({ type: "broadcast", event: EVENT_STATE, payload: entry.pending });
                    entry.pending = null;
                }
                return;
            }
            setReady(entry, false);
            // Greška i isteklo vreme: biblioteka sama ponovo pokušava. Kanal koji je server
            // zatvorio (CLOSED) se ne vraća sam — pravi se nov, posle kratke pauze (1, 2, 4 … 15 s).
            if (status !== "CLOSED" || entry.refs <= 0 || entry.retryTimer) return;
            const delay = Math.min(15_000, 1_000 * 2 ** Math.min(entry.retries, 4));
            entry.retries += 1;
            entry.channel = null;
            entry.retryTimer = setTimeout(() => {
                entry.retryTimer = null;
                if (entry.refs > 0 && entry.channel === null) connect(entry);
            }, delay);
        });
}

function acquire(name: string, role: InviteRole): Entry {
    const existing = entries.get(name);
    if (existing) {
        if (existing.removeTimer) clearTimeout(existing.removeTimer);
        existing.removeTimer = null;
        existing.refs += 1;
        return existing;
    }
    const entry: Entry = {
        name,
        role,
        channel: null,
        refs: 1,
        ready: false,
        removeTimer: null,
        retryTimer: null,
        retries: 0,
        onState: new Set(),
        onEnd: new Set(),
        onShared: new Set(),
        onPresence: new Set(),
        onReady: new Set(),
        pending: null,
    };
    entries.set(name, entry);
    connect(entry);
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
        if (entry.retryTimer) clearTimeout(entry.retryTimer);
        const channel = entry.channel;
        entry.channel = null;
        if (channel) {
            void channel.untrack();
            void realtimeClient().removeChannel(channel);
        }
    }, REMOVE_DELAY_MS);
}

export type SharedEvent = "mirror" | "action" | "hello";

const SHARED_EVENTS: Record<SharedEvent, string> = { mirror: EVENT_MIRROR, action: EVENT_ACTION, hello: EVENT_HELLO };

interface Handlers {
    onState: (payload: unknown) => void;
    onEnd: () => void;
    /** Poruke zajedničke table (lib/sharedPlay.ts proverava sadržaj) */
    onShared?: (kind: SharedEvent, payload: unknown) => void;
}

/**
 * Povezuje se na kanal igre sa drugom. Vraća da li je kanal povezan, da li je drug prisutan
 * (Presence) i funkcije za slanje svog stanja i znaka „kraj igre sa drugom”.
 */
export function useInviteChannel(name: string | null, role: InviteRole, handlers: Handlers) {
    const [ready, setReady] = useState(false);
    const [present, setPresent] = useState<boolean | null>(null);
    // Kada je Presence javio da drug više nije na kanalu — samo za druga koji je pre toga bio
    // tu (0 = nije otišao). Pri ulasku Presence ume da stigne posle prve poruke; tada nema odlaska.
    const [leftAt, setLeftAt] = useState(0);
    const seenPresent = useRef(false);
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
        const onShared = (kind: SharedEvent, payload: unknown) => handlersRef.current.onShared?.(kind, payload);
        const onReady = (value: boolean) => setReady(value);
        const onPresence = (value: boolean) => {
            setPresent(value);
            if (value) {
                seenPresent.current = true;
                setLeftAt(0);
            } else if (seenPresent.current) {
                setLeftAt((prev) => prev || Date.now());
            }
        };
        entry.onState.add(onState);
        entry.onEnd.add(onEnd);
        entry.onShared.add(onShared);
        entry.onReady.add(onReady);
        entry.onPresence.add(onPresence);
        if (entry.ready) queueMicrotask(() => setReady(true));
        return () => {
            entry.onState.delete(onState);
            entry.onEnd.delete(onEnd);
            entry.onShared.delete(onShared);
            entry.onReady.delete(onReady);
            entry.onPresence.delete(onPresence);
            entryRef.current = null;
            setReady(false);
            setPresent(null);
            setLeftAt(0);
            seenPresent.current = false;
            release(name);
        };
    }, [name, role]);

    const sendState = useCallback((state: RemoteState) => {
        const entry = entryRef.current;
        if (!entry) return;
        if (entry.ready && entry.channel) void entry.channel.send({ type: "broadcast", event: EVENT_STATE, payload: state });
        else entry.pending = state;
    }, []);

    const sendEnd = useCallback(() => {
        const entry = entryRef.current;
        if (entry?.ready && entry.channel) void entry.channel.send({ type: "broadcast", event: EVENT_END, payload: {} });
    }, []);

    /** Poruka zajedničke table; vraća false kad kanal još nije povezan (pošiljalac pokušava ponovo) */
    const sendShared = useCallback((kind: SharedEvent, payload: unknown): boolean => {
        const entry = entryRef.current;
        if (!entry?.ready || !entry.channel) return false;
        void entry.channel.send({ type: "broadcast", event: SHARED_EVENTS[kind], payload });
        return true;
    }, []);

    return { ready, present, leftAt, sendState, sendEnd, sendShared, configured: realtimeConfigured };
}
