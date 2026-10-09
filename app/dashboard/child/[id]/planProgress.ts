// Koje igre iz dnevnog plana su danas odigrane (na ovom uređaju).
"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { GameId } from "@/lib/games";

const listeners = new Set<() => void>();
/** Kada pregledač ne da skladište (privatni režim), plan se pamti dok je stranica otvorena */
const memory = new Map<number, { day: string; done: string[] }>();

function today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function storageKey(childId: number): string {
    return `bm:plan:${childId}`;
}

function read(childId: number): string[] {
    const kept = memory.get(childId);
    if (kept) return kept.day === today() ? kept.done : [];
    try {
        const raw = window.localStorage.getItem(storageKey(childId));
        if (!raw) return [];
        const parsed = JSON.parse(raw) as { day?: string; done?: unknown };
        if (parsed.day !== today() || !Array.isArray(parsed.done)) return [];
        return parsed.done.filter((id): id is string => typeof id === "string");
    } catch {
        return [];
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    // Novi dan ili promena u drugoj kartici: stanje se čita ponovo kad se dete vrati na stranicu
    window.addEventListener("storage", listener);
    window.addEventListener("focus", listener);
    document.addEventListener("visibilitychange", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
        window.removeEventListener("focus", listener);
        document.removeEventListener("visibilitychange", listener);
    };
}

/** `[odigraneDanas, oznaciOdigranu]` — sutradan lista kreće od početka. */
export function usePlanProgress(childId: number): [GameId[], (gameId: GameId) => void] {
    // Snimak je tekst, da poređenje bude stabilno
    const snapshot = useSyncExternalStore(
        subscribe,
        () => read(childId).join(","),
        () => ""
    );
    const done = (snapshot ? snapshot.split(",") : []) as GameId[];

    const markDone = useCallback(
        (gameId: GameId) => {
            const current = read(childId);
            if (current.includes(gameId)) return;
            const record = { day: today(), done: [...current, gameId] };
            try {
                window.localStorage.setItem(storageKey(childId), JSON.stringify(record));
                memory.delete(childId);
            } catch {
                memory.set(childId, record);
            }
            listeners.forEach((listener) => listener());
        },
        [childId]
    );

    return [done, markDone];
}
