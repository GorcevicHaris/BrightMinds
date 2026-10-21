"use client";

import { useCallback, useEffect, useRef } from "react";
import { useGamePaused } from "./pause";

export type TimerId = number;

interface Pending {
    fn: () => void;
    /** Kada tajmer ističe (dok teče) */
    due: number;
    /** Koliko je ostalo kad je igra pauzirana */
    remaining: number;
    handle: ReturnType<typeof setTimeout> | null;
}

let nextId = 1;

/**
 * setTimeout koji se sam čisti kad komponenta nestane i koji stoji dok je igra pauzirana
 * (posle pauze nastavlja tamo gde je stao).
 *
 *   const { after, cancel } = useTimers();
 *   const id = after(900, () => …);   // zakazuje
 *   cancel(id);                       // otkazuje (null se preskače)
 */
export function useTimers() {
    const pending = useRef(new Map<TimerId, Pending>());
    const paused = useGamePaused();
    const pausedRef = useRef(paused);

    const start = useCallback((id: TimerId, entry: Pending, ms: number) => {
        entry.due = Date.now() + ms;
        entry.handle = setTimeout(() => {
            pending.current.delete(id);
            entry.fn();
        }, ms);
    }, []);

    useEffect(() => {
        pausedRef.current = paused;
        const now = Date.now();
        pending.current.forEach((entry, id) => {
            if (paused) {
                if (entry.handle === null) return;
                clearTimeout(entry.handle);
                entry.handle = null;
                entry.remaining = Math.max(0, entry.due - now);
            } else if (entry.handle === null) {
                start(id, entry, entry.remaining);
            }
        });
    }, [paused, start]);

    useEffect(() => {
        const entries = pending.current;
        return () => {
            entries.forEach((entry) => entry.handle !== null && clearTimeout(entry.handle));
            entries.clear();
        };
    }, []);

    const after = useCallback(
        (ms: number, fn: () => void): TimerId => {
            const id = nextId++;
            const entry: Pending = { fn, due: 0, remaining: ms, handle: null };
            pending.current.set(id, entry);
            if (!pausedRef.current) start(id, entry, ms);
            return id;
        },
        [start]
    );

    const cancel = useCallback((id: TimerId | null) => {
        if (id === null) return;
        const entry = pending.current.get(id);
        if (entry?.handle) clearTimeout(entry.handle);
        pending.current.delete(id);
    }, []);

    return { after, cancel };
}
