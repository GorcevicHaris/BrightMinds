"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVoiceState } from "@/lib/voice";
import { useGamePaused } from "./pause";

/** Koliko dugo čekamo pre nego što blago skrenemo pažnju na dugme „Ponovi” (dete dobija vreme da razmisli). */
export const IDLE_HINT_MS = 10_000;

/** Posle ovoliko vremena bez dodira tačan odgovor zasvetli (kad je uključena „pomoć posle čekanja”) */
export const WAIT_HINT_MS = 8_000;

/**
 * True kada dete `ms` milisekundi nije ništa dodirnulo. Vraća se na false pri
 * svakom dodiru i kad se promeni `resetKey` (npr. novi zadatak).
 */
export function useIdle(ms: number = IDLE_HINT_MS, resetKey?: unknown): boolean {
    const [idle, setIdle] = useState(false);
    // Vreme čekanja ne teče dok učitelj govori ni dok je pauza: dete koje mirno sluša nije „zaglavljeno”.
    // Kad govor (ili pauza) prestane, čekanje kreće ispočetka.
    const { speaking } = useVoiceState();
    const paused = useGamePaused();
    const waiting = !speaking && !paused;

    useEffect(() => {
        if (!waiting) return;
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
    }, [ms, resetKey, waiting]);

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

/**
 * Pomoć posle čekanja: kad je `enabled` i dete `WAIT_HINT_MS` ništa ne dodirne, zove se `onHint`
 * (jednom po `resetKey`, npr. zadatku). Igra tada ističe tačan odgovor i beleži ga kao „uz pomoć”.
 * Nema odbrojavanja ni požurivanja na ekranu — samo tiha pomoć za dete koje ne zna kako dalje.
 */
export function useWaitHint(enabled: boolean, resetKey: unknown, onHint: () => void) {
    const idle = useIdle(WAIT_HINT_MS, resetKey);
    const onHintRef = useRef(onHint);
    useEffect(() => {
        onHintRef.current = onHint;
    });
    useEffect(() => {
        if (enabled && idle) onHintRef.current();
    }, [enabled, idle]);
}

