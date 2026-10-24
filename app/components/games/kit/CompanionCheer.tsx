"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CELEBRATE_EVENT } from "./Celebration";
import { FLY_MS, PRAISE_EVENT, type PraiseDetail } from "./hype";

// Drugar koji navija: posle tačnog odgovora zvezdice doleću do njega, on kratko skoči (ili se
// obraduje), iznad njega iskoči „+1 ⭐”, a u oblačiću stoji pohvala koju glas upravo kaže.
// Posle niza tačnih odgovora aplaudira. Na grešku ne reaguje ničim — greška nije kazna.
// Uz „Manje animacija”: bez skokova i bez rasta — samo mirno „+1” i oblačić.

export type CheerMove = "hop" | "joy" | "cheer";

export interface CompanionHype {
    /** Jednokratni pokret drugara (CompanionStage `action` + `actionKey`) */
    action: CheerMove | undefined;
    actionKey: number;
    /** Ključ „+1” oznake (0 = ne prikazuje se) */
    plus: number;
    /** Pohvala u oblačiću */
    bubble: { text: string; key: number } | null;
    /** Kratko „uvećan” trenutak (portret u traci na telefonu malo poraste) */
    excited: boolean;
}

const PLUS_MS = 1300;
const BUBBLE_MS = 2200;
const EXCITED_MS = 900;

/** Sluša tačne odgovore i pohvale; `calm` = „Manje animacija” (bez pokreta, odmah „+1”) */
export function useCompanionHype(calm: boolean): CompanionHype {
    const [hype, setHype] = useState<CompanionHype>({ action: undefined, actionKey: 0, plus: 0, bubble: null, excited: false });
    const calmRef = useRef(calm);
    useEffect(() => {
        calmRef.current = calm;
    });

    useEffect(() => {
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const later = (ms: number, run: () => void) => {
            const timer = setTimeout(() => {
                timers.delete(timer);
                run();
            }, ms);
            timers.add(timer);
        };
        let key = 0;
        /** Do kada traje aplauz za niz (tada se mali skok ne meša) */
        let cheerUntil = 0;

        const onCelebrate = (event: Event) => {
            const detail = (event as CustomEvent<{ big?: true } | null>).detail;
            if (detail && "big" in detail) return; // kraj nivoa slavi ekran sa rezultatom
            const quiet = calmRef.current;
            // Kad zvezdice stignu: „+1”, mali skok ili radost, i trenutak kad drugar poraste
            later(quiet ? 0 : FLY_MS, () => {
                const plusKey = (key += 1);
                const jump = !quiet && Date.now() > cheerUntil;
                setHype((current) => ({
                    ...current,
                    plus: plusKey,
                    excited: !quiet,
                    ...(jump ? { action: plusKey % 3 === 0 ? "joy" : "hop", actionKey: plusKey } : {}),
                }));
                later(EXCITED_MS, () => setHype((current) => (current.plus === plusKey ? { ...current, excited: false } : current)));
                later(PLUS_MS, () => setHype((current) => (current.plus === plusKey ? { ...current, plus: 0 } : current)));
            });
        };

        const onPraise = (event: Event) => {
            const praise = (event as CustomEvent<PraiseDetail>).detail;
            if (!praise?.text) return;
            const bubbleKey = (key += 1);
            setHype((current) => ({ ...current, bubble: { text: praise.text, key: bubbleKey } }));
            later(BUBBLE_MS, () => setHype((current) => (current.bubble?.key === bubbleKey ? { ...current, bubble: null } : current)));
            if (praise.big && !calmRef.current) {
                cheerUntil = Date.now() + FLY_MS + 1800;
                later(FLY_MS, () => setHype((current) => ({ ...current, action: "cheer", actionKey: (key += 1) })));
            }
        };

        window.addEventListener(CELEBRATE_EVENT, onCelebrate);
        window.addEventListener(PRAISE_EVENT, onPraise);
        return () => {
            window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
            window.removeEventListener(PRAISE_EVENT, onPraise);
            timers.forEach(clearTimeout);
        };
    }, []);

    return hype;
}

/** „+1 ⭐” kod drugara kad zvezdice stignu. Položaj daje roditelj. */
export function HypePlus({ hype, calm, className }: { hype: CompanionHype; calm: boolean; className?: string }) {
    if (!hype.plus) return null;
    return (
        <span
            key={hype.plus}
            aria-hidden="true"
            className={cn(
                "pointer-events-none z-20 inline-flex items-center gap-1 rounded-full bg-sun-100 px-2.5 py-1 font-display text-lg font-extrabold text-sun-700 shadow-pop ring-2 ring-white",
                !calm && "animate-pop",
                className
            )}
        >
            +1
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#ffc83d" stroke="#e8a317" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
        </span>
    );
}

/** Oblačić sa pohvalom koju glas upravo kaže (`tail`: kuda pokazuje repić). Položaj (`absolute`/`relative`) daje roditelj. */
export function HypeBubble({ hype, calm, tail = "down", className }: { hype: CompanionHype; calm: boolean; tail?: "down" | "left"; className?: string }) {
    if (!hype.bubble) return null;
    return (
        <span
            key={hype.bubble.key}
            aria-hidden="true"
            className={cn(
                "pointer-events-none z-20 w-max max-w-[14rem] rounded-2xl bg-surface px-3.5 py-2 text-center font-display text-lg font-extrabold leading-tight text-brand-700 shadow-pop ring-2 ring-brand-200",
                "after:absolute after:h-3 after:w-3 after:rotate-45 after:bg-surface",
                tail === "down" ? "after:-bottom-1.5 after:left-1/2 after:-ml-1.5" : "after:-left-1.5 after:top-1/2 after:-mt-1.5",
                !calm && "animate-pop",
                className
            )}
        >
            {hype.bubble.text}
        </span>
    );
}
