"use client";

import { useCallback, useEffect, useRef } from "react";

export type TimerId = ReturnType<typeof setTimeout>;

/**
 * setTimeout koji se sam čisti kad komponenta nestane.
 *
 *   const { after, cancel } = useTimers();
 *   const id = after(900, () => …);   // zakazuje
 *   cancel(id);                       // otkazuje (null se preskače)
 */
export function useTimers() {
    const pending = useRef(new Set<TimerId>());

    useEffect(() => {
        const ids = pending.current;
        return () => {
            ids.forEach(clearTimeout);
            ids.clear();
        };
    }, []);

    const after = useCallback((ms: number, fn: () => void): TimerId => {
        const id = setTimeout(() => {
            pending.current.delete(id);
            fn();
        }, ms);
        pending.current.add(id);
        return id;
    }, []);

    const cancel = useCallback((id: TimerId | null) => {
        if (id === null) return;
        clearTimeout(id);
        pending.current.delete(id);
    }, []);

    return { after, cancel };
}
