"use client";

// Crteži igre „Ponovi ritam”: veliki bubanj, mali bubanj i zvonce (nasmejani, mirnih boja) i
// znaci zapisa ritma (velika tačka, mala tačka, zvonce). Udarac se vidi i bez zvuka: koža bubnja
// zasvetli, a iznad se pojave dva mekana luka „zvuka”. Uz „manje animacija” bubanj se ne pomera.

import type { Instrument } from "@/app/components/games/data/rhythmLevels";
import { cn } from "@/lib/cn";

interface Look {
    shell: string;
    edge: string;
    light: string;
}

export const INSTRUMENT_LOOK: Record<Instrument, Look> = {
    big: { shell: "#F08A3E", edge: "#C4621E", light: "#FFE79A" },
    small: { shell: "#4FB0C6", edge: "#2E8297", light: "#D4F6FF" },
    bell: { shell: "#FFC83D", edge: "#D99A12", light: "#FFF3B8" },
};

function Face({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round">
            <path d="M-11 0 q4 4 8 0" />
            <path d="M3 0 q4 4 8 0" />
            <path d="M-5 8 q5 5 10 0" />
        </g>
    );
}

/** Dva mekana luka iznad instrumenta: „ovaj je zazvučao” (vidi se i kad je zvuk isključen) */
function Waves({ x, y }: { x: number; y: number }) {
    return (
        <g transform={`translate(${x} ${y})`} fill="none" stroke="#F59E0B" strokeWidth="3.5" strokeLinecap="round" opacity="0.85">
            <path d="M-26 -2 q-6 -10 0 -20" />
            <path d="M-36 2 q-9 -14 0 -28" />
            <path d="M26 -2 q6 -10 0 -20" />
            <path d="M36 2 q9 -14 0 -28" />
        </g>
    );
}

function Drum({ size, look, hit }: { size: "big" | "small"; look: Look; hit: boolean }) {
    // Veliki: širok; mali: uži i niži (u istom viewBox-u, pa se razlika vidi i jedan pored drugog)
    const w = size === "big" ? 46 : 33;
    const top = size === "big" ? 40 : 52;
    const bottom = 100;
    const ry = size === "big" ? 12 : 9;
    const side = (y: number) => `M${60 - w} ${y} Q60 ${y + ry * 1.6} ${60 + w} ${y}`;
    // Užad: cik-cak između gornjeg i donjeg obruča
    const n = size === "big" ? 6 : 4;
    const zig = Array.from({ length: n + 1 }, (_, i) => {
        const x = 60 - w + 6 + ((2 * w - 12) * i) / n;
        const y = i % 2 === 0 ? top + 12 + Math.sin((i / n) * Math.PI) * ry * 0.8 : bottom - 14 + Math.sin((i / n) * Math.PI) * ry * 0.8;
        return `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
    });
    return (
        <g>
            <ellipse cx="60" cy={bottom + 9} rx={w + 6} ry="6" fill="#000" opacity="0.07" />
            <path d={`M${60 - w} ${top} V${bottom} Q60 ${bottom + ry * 1.6} ${60 + w} ${bottom} V${top} Z`} fill={look.shell} stroke={look.edge} strokeWidth="3" strokeLinejoin="round" />
            <path d={`M${zig.join(" L")}`} fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinejoin="round" opacity="0.55" />
            {/* Obruči */}
            <path d={side(top + 5)} fill="none" stroke={look.edge} strokeWidth="5" strokeLinecap="round" />
            <path d={side(bottom - 4)} fill="none" stroke={look.edge} strokeWidth="5" strokeLinecap="round" />
            <g transform={`translate(60 ${(top + bottom) / 2 + 4})`}>
                <ellipse cx="0" cy="2" rx={size === "big" ? 17 : 13} ry={size === "big" ? 12 : 10} fill="#FFFFFF" opacity="0.92" />
                <Face x={0} y={-1} s={size === "big" ? 0.9 : 0.72} color={look.edge} />
            </g>
            {/* Koža bubnja: zasvetli kad se udari */}
            <ellipse cx="60" cy={top} rx={w} ry={ry} fill={hit ? look.light : "#FFF6E3"} stroke={look.edge} strokeWidth="3" />
            <ellipse cx={60 - w * 0.3} cy={top - ry * 0.25} rx={w * 0.28} ry={ry * 0.3} fill="#FFFFFF" opacity="0.7" />
            {/* Palica odmara na koži */}
            <path d={`M${60 + w * 0.15} ${top - 2} L${60 + w + 8} ${top - 22}`} stroke="#B08968" strokeWidth="4" strokeLinecap="round" />
            <circle cx={60 + w * 0.15} cy={top - 2} r="4.5" fill="#E6C9A8" stroke="#B08968" strokeWidth="1.5" />
            {hit && <Waves x={60} y={top - ry - 2} />}
        </g>
    );
}

function Bell({ look, hit }: { look: Look; hit: boolean }) {
    return (
        <g>
            <ellipse cx="60" cy="104" rx="30" ry="5" fill="#000" opacity="0.07" />
            {/* Stalak */}
            <path d="M34 104 H86 M60 104 V30 M60 30 H74" stroke="#B08968" strokeWidth="5" strokeLinecap="round" />
            <path d="M74 30 V40" stroke="#B08968" strokeWidth="3" strokeLinecap="round" />
            <g transform="translate(74 40)">
                <path d="M-20 34 Q-20 6 0 4 Q20 6 20 34 L24 40 H-24 Z" fill={hit ? look.light : look.shell} stroke={look.edge} strokeWidth="3" strokeLinejoin="round" />
                <circle cx="0" cy="44" r="5" fill={look.edge} />
                <circle cx="0" cy="3" r="4" fill={look.edge} />
                <path d="M-11 14 q-3 8 -2 16" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" fill="none" />
                <Face x={1} y={22} s={0.7} color="#9A6B0A" />
            </g>
            {hit && <Waves x={74} y={40} />}
        </g>
    );
}

/** Instrument u dugmetu (kvadrat 120 × 120) */
export function InstrumentArt({ kind, hit }: { kind: Instrument; hit: boolean }) {
    const look = INSTRUMENT_LOOK[kind];
    return (
        <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible" aria-hidden="true" focusable="false">
            {kind === "bell" ? <Bell look={look} hit={hit} /> : <Drum size={kind} look={look} hit={hit} />}
        </svg>
    );
}

export type MarkState = "todo" | "playing" | "done" | "hidden" | "next";

/**
 * Znak zapisa za jedan udarac: velika tačka (veliki bubanj), mala tačka (mali bubanj), zvonce.
 * todo — svetao, čeka; playing — upravo svira (sjaj); done — ponovljen (pun);
 * hidden — „?” (zapis skriven); next — sledeći (blag okvir, pomoć).
 */
export function BeatMark({ kind, state }: { kind: Instrument; state: MarkState }) {
    const look = INSTRUMENT_LOOK[kind];
    const strong = state === "done" || state === "playing";
    if (state === "hidden") {
        return (
            <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-dashed border-marigold-300 bg-white font-display text-lg font-extrabold text-marigold-600 sm:h-10 sm:w-10">
                ?
            </span>
        );
    }
    const size = kind === "big" ? "h-9 w-9 sm:h-10 sm:w-10" : kind === "small" ? "h-6 w-6 sm:h-7 sm:w-7" : "h-8 w-8 sm:h-9 sm:w-9";
    return (
        <span className="grid h-9 w-9 place-items-center sm:h-10 sm:w-10">
            <span
                className={cn("grid place-items-center rounded-full border-[3px] transition-[background-color,box-shadow] duration-150", size, state === "next" && "animate-soft-pulse")}
                style={{
                    borderColor: look.edge,
                    backgroundColor: strong ? look.shell : "#FFFFFF",
                    boxShadow: state === "playing" ? `0 0 0 5px ${look.light}, 0 0 16px 6px ${look.light}` : undefined,
                    opacity: state === "todo" ? 0.85 : 1,
                }}
            >
                {kind === "bell" && (
                    <svg viewBox="0 0 24 24" className="h-[70%] w-[70%]" aria-hidden="true" focusable="false">
                        <path d="M5 17 Q5 6 12 5 Q19 6 19 17 L20.5 19 H3.5 Z" fill={strong ? "#FFFFFF" : look.shell} />
                        <circle cx="12" cy="21" r="1.8" fill={strong ? "#FFFFFF" : look.edge} />
                    </svg>
                )}
            </span>
        </span>
    );
}
