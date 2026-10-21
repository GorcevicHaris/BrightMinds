"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

// Pokazivanje: uz svako uputstvo kratko se istakne ono o čemu uputstvo govori
// (uzorak, tabla, traženi deo slike) — jedan miran puls, pa mir.

/** Koliko traje jedno pokazivanje */
export const DEMO_MS = 1500;

/** Uz `animate-soft-pulse`: jedan krug umesto beskonačnog ponavljanja */
export const PULSE_ONCE: CSSProperties = { animationDuration: `${DEMO_MS}ms`, animationIterationCount: 1 };

/**
 * Jednokratno pokazivanje. Ako je `enabled`, prvo kreće čim se igra pojavi.
 *
 *   const demo = useDemo(!isMonitor);
 *   demo.show();                                   // novi zadatak ili dugme „Ponovi”
 *   <span key={demo.run} className={cn(demo.on && "animate-soft-pulse")} style={demo.on ? PULSE_ONCE : undefined} />
 *
 * `run` se menja pri svakom pokazivanju: kao `key` pokreće puls iz početka.
 */
export function useDemo(enabled: boolean) {
    const [demo, setDemo] = useState({ on: enabled, run: 0 });
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const arm = useCallback(() => {
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            timer.current = null;
            setDemo((current) => ({ ...current, on: false }));
        }, DEMO_MS);
    }, []);

    useEffect(() => {
        if (enabled) arm();
        return () => {
            if (timer.current !== null) clearTimeout(timer.current);
        };
    }, [enabled, arm]);

    const show = useCallback(() => {
        setDemo((current) => ({ on: true, run: current.run + 1 }));
        arm();
    }, [arm]);

    return { on: demo.on, run: demo.run, show };
}
