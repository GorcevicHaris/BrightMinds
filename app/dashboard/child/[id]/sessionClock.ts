// Dnevno vreme igre po detetu (na ovom uređaju). Čuva se u pregledaču, pa
// ograničenje važi i posle osvežavanja stranice, a sutradan kreće od nule.
"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

const TICK_SEC = 5;
const listeners = new Set<() => void>();
/** Kada pregledač ne da skladište (privatni režim), vreme se pamti dok je stranica otvorena */
const memory = new Map<number, DayRecord>();

interface DayRecord {
    day: string;
    sec: number;
    bonusMin: number;
}

function today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function storageKey(childId: number): string {
    return `bm:played:${childId}`;
}

function read(childId: number): DayRecord {
    const fresh: DayRecord = { day: today(), sec: 0, bonusMin: 0 };
    const kept = memory.get(childId);
    if (kept) return kept.day === fresh.day ? kept : fresh;
    try {
        const raw = window.localStorage.getItem(storageKey(childId));
        if (!raw) return fresh;
        const parsed = JSON.parse(raw) as Partial<DayRecord>;
        if (parsed.day !== fresh.day) return fresh;
        return { day: fresh.day, sec: Number(parsed.sec) || 0, bonusMin: Number(parsed.bonusMin) || 0 };
    } catch {
        return fresh;
    }
}

function write(childId: number, record: DayRecord) {
    try {
        window.localStorage.setItem(storageKey(childId), JSON.stringify(record));
        memory.delete(childId);
    } catch {
        memory.set(childId, record);
    }
    listeners.forEach((listener) => listener());
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

export interface SessionClock {
    /** Sekunde preostale za danas; null kada nema ograničenja */
    remainingSec: number | null;
    limitReached: boolean;
    /** Odrasli produžava današnju igru */
    addMinutes: (minutes: number) => void;
}

/**
 * Broji vreme dok je `running` (dete je u igri i kartica je vidljiva).
 * `limitMinutes` = 0 znači bez ograničenja.
 */
export function useSessionClock(childId: number, limitMinutes: number, running: boolean): SessionClock {
    // Snimak je tekst (stabilan za poređenje): "sekunde|bonus"
    const snapshot = useSyncExternalStore(
        subscribe,
        () => {
            const record = read(childId);
            return `${record.sec}|${record.bonusMin}`;
        },
        () => "0|0"
    );
    const [sec, bonusMin] = snapshot.split("|").map(Number);

    useEffect(() => {
        if (!running || limitMinutes === 0) return;
        const timer = setInterval(() => {
            if (document.visibilityState !== "visible") return;
            const record = read(childId);
            write(childId, { ...record, sec: record.sec + TICK_SEC });
        }, TICK_SEC * 1000);
        return () => clearInterval(timer);
    }, [childId, limitMinutes, running]);

    const addMinutes = useCallback(
        (minutes: number) => {
            const record = read(childId);
            write(childId, { ...record, bonusMin: record.bonusMin + minutes });
        },
        [childId]
    );

    if (limitMinutes === 0) return { remainingSec: null, limitReached: false, addMinutes };
    const remainingSec = (limitMinutes + bonusMin) * 60 - sec;
    return { remainingSec, limitReached: remainingSec <= 0, addMinutes };
}
