// Koje igre iz dnevnog plana su danas odigrane (na ovom uređaju).
"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { GameId } from "@/lib/games";

const listeners = new Set<() => void>();

function today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function storageKey(childId: number): string {
    return `bm:plan:${childId}`;
}

function read(childId: number): string[] {
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
    return () => {
        listeners.delete(listener);
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
            try {
                window.localStorage.setItem(storageKey(childId), JSON.stringify({ day: today(), done: [...current, gameId] }));
            } catch {
                /* bez skladišta plan važi samo dok je stranica otvorena */
            }
            listeners.forEach((listener) => listener());
        },
        [childId]
    );

    return [done, markDone];
}
