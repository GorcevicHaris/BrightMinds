"use client";

// Crteži igre „Operi ruke i zube”: sličice koraka za kartice i traku rasporeda, i mehurići
// koji rastu dok dete trlja ruke ili četka zube. Predmeti su iz zajedničkog kompleta (scene/
// props, sequence/drawings) — isti crtež kao u igri „Šta je prvo?”, samo krupnije.

import type { ReactNode } from "react";
import { Prop } from "@/app/components/games/scene/props";
import { Drawing } from "@/app/components/games/sequence/drawings";
import type { StepId } from "@/app/components/games/data/hygieneLevels";
import { cn } from "@/lib/cn";

const at = (x: number, y: number, s: number, node: ReactNode, rot = 0) => (
    <g transform={`translate(${x} ${y})${rot ? ` rotate(${rot})` : ""} scale(${s})`}>{node}</g>
);

const BUBBLE = (x: number, y: number, s: number) => at(x, y, s, <Prop id="soapBubbles" />);

/** Sličica koraka u kvadratu 100 × 100 */
const ICONS: Record<StepId, () => ReactNode> = {
    wet: () => (
        <>
            {at(58, 94, 1.85, <Drawing id="tapWater" />)}
            {at(72, 92, 0.9, <Drawing id="splash" />)}
        </>
    ),
    soap: () => (
        <>
            {at(50, 76, 3.2, <Drawing id="soap" />)}
            {BUBBLE(30, 52, 1.1)}
            {BUBBLE(72, 48, 0.9)}
        </>
    ),
    scrub: () => (
        <>
            {at(50, 82, 1.7, <Drawing id="hands" />)}
            {BUBBLE(34, 60, 1.3)}
            {BUBBLE(64, 54, 1.2)}
            {BUBBLE(50, 88, 1)}
        </>
    ),
    rinse: () => (
        <>
            {at(50, 50, 0.9, <Drawing id="bigStream" />)}
            {at(50, 86, 1.6, <Drawing id="hands" />)}
            {BUBBLE(28, 96, 0.8)}
            {BUBBLE(76, 98, 0.7)}
        </>
    ),
    tapOff: () => (
        <>
            {at(66, 80, 1.5, <Drawing id="tap" />)}
            {at(82, 30, 1.5, <Drawing id="hand" />, -30)}
        </>
    ),
    dry: () => at(50, 88, 2.5, <Prop id="towel" />),
    paste: () => at(52, 66, 2.9, <Drawing id="toothpaste" />, -14),
    brush: () => (
        <>
            {at(62, 94, 2.6, <Prop id="toothbrush" />)}
            {BUBBLE(30, 44, 1)}
        </>
    ),
    spit: () => at(50, 90, 4, <Prop id="glass" />),
    cleanBrush: () => (
        <>
            {at(40, 58, 1.2, <Drawing id="tapWater" />)}
            {at(46, 96, 2.2, <Prop id="toothbrush" />, 20)}
        </>
    ),
    putAway: () => (
        <>
            {at(52, 94, 3.6, <Prop id="glass" />)}
            {at(56, 56, 2, <Prop id="toothbrush" />, 30)}
        </>
    ),
};

export function StepIcon({ id, className }: { id: StepId; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {ICONS[id]()}
        </svg>
    );
}

// ── Mehurići dok se trlja ili četka ────────────────────────────────────────────

/** Raspored mehurića oko ruku (ili usta): uvek isti, da se slika ne „trese” */
function bubbleSpots(count: number, cx: number, cy: number, spread: number): { x: number; y: number; r: number }[] {
    return Array.from({ length: count }, (_, i) => {
        const a = i * 2.399963; // zlatni ugao: ravnomerno, bez nagomilavanja
        const d = 6 + 7 * Math.sqrt(i);
        // Oko šaka ili usta (u slici 150 × 100)
        return { x: Math.round(cx + Math.cos(a) * d * 1.35 * spread), y: Math.round(cy + Math.sin(a) * d * 0.55 * spread), r: (3.5 + ((i * 7) % 4)) * Math.max(spread, 0.7) };
    });
}

/**
 * Mehurići preko slike: `count` od `target` je narastao. Uz smanjene pokrete mehurić se samo
 * pojavi (bez „iskakanja”).
 */
export function RubBubbles({ count, target, calm, mouth = false, className }: { count: number; target: number; calm: boolean; mouth?: boolean; className?: string }) {
    // Ruke: oko šaka iznad lavaboa; zubi: pena oko usta (manji krug)
    const spots = mouth ? bubbleSpots(target, 76, 60, 0.5) : bubbleSpots(target, 70, 70, 1);
    return (
        <svg viewBox="0 0 150 100" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true" focusable="false">
            {spots.map((s, i) =>
                i < count ? (
                    <g key={i} className={calm ? undefined : "animate-pop"} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                        <circle cx={s.x} cy={s.y} r={s.r} fill="#f2fbff" fillOpacity="0.85" stroke="#9ac4dc" strokeWidth="1" />
                        <circle cx={s.x - s.r * 0.35} cy={s.y - s.r * 0.35} r={s.r * 0.28} fill="#ffffff" />
                    </g>
                ) : null
            )}
        </svg>
    );
}

/** Traka napretka trljanja: mali krugovi, pun = jedan mehurić (bez brojeva naglas) */
export function RubMeter({ count, target, className }: { count: number; target: number; className?: string }) {
    return (
        // Do deset u jednom redu, dvadeset u dva reda po deset (lako se vidi koliko je ostalo)
        <div className={cn("grid place-items-center gap-1 sm:gap-1.5", target > 10 ? "grid-cols-10" : "grid-flow-col", className)} aria-hidden="true">
            {Array.from({ length: target }, (_, i) => (
                <span key={i} className={cn("h-3.5 w-3.5 rounded-full border-2 border-mint-500 sm:h-4 sm:w-4", i < count ? "bg-mint-400" : "bg-white")} />
            ))}
        </div>
    );
}
