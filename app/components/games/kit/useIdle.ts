"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** Koliko dugo čekamo pre nego što blago skrenemo pažnju na dugme „Ponovi” (dete dobija vreme da razmisli). */
export const IDLE_HINT_MS = 10_000;

/**
 * True kada dete `ms` milisekundi nije ništa dodirnulo. Vraća se na false pri
 * svakom dodiru i kad se promeni `resetKey` (npr. novi zadatak).
 */
export function useIdle(ms: number = IDLE_HINT_MS, resetKey?: unknown): boolean {
    const [idle, setIdle] = useState(false);

    useEffect(() => {
        let timer = setTimeout(() => setIdle(true), ms);
        const onActivity = () => {
            setIdle(false);
            clearTimeout(timer);
            timer = setTimeout(() => setIdle(true), ms);
        };
        window.addEventListener("pointerdown", onActivity);
        window.addEventListener("keydown", onActivity);
        return () => {
            clearTimeout(timer);
            window.removeEventListener("pointerdown", onActivity);
            window.removeEventListener("keydown", onActivity);
            setIdle(false);
        };
    }, [ms, resetKey]);

    return idle;
}

/**
 * Kratka pauza unosa posle promene zadatka: deca često dodirnu ekran više puta
 * ili drže prst na mestu prethodnog odgovora, pa bi novi zadatak dobio slučajan odgovor.
 *
 *   const guard = useInputGuard();
 *   guard.hold();                 // kad se pojavi novi zadatak
 *   if (guard.blocked()) return;  // na početku obrade dodira
 */
export function useInputGuard(ms = 400) {
    const until = useRef(0);
    return useMemo(
        () => ({
            hold: () => {
                until.current = Date.now() + ms;
            },
            blocked: () => Date.now() < until.current,
        }),
        [ms]
    );
}
