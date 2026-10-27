"use client";

// Crteži igre „Zapamti niz”: okruglo polje sa životinjom (crtež iz zajedničkog kompleta slika),
// male slike za uputstvo (oko i uvo — „gledaj i slušaj”; strelica — „unazad”) i tačke niza.
// Polje svetli tako što postane svetlije i dobije mek sjaj; uz „manje animacija” se ne povećava.

import type { CSSProperties, ReactNode } from "react";
import { Picture } from "@/app/components/games/pictures";
import type { SimonPad } from "@/app/components/games/data/simonLevels";
import { cn } from "@/lib/cn";

interface PadFaceProps {
    pad: SimonPad;
    lit: boolean;
    calm: boolean;
    children?: ReactNode;
}

/** Lice polja (unutar dugmeta): krug u boji polja, beli krug sa životinjom, sjaj kad svetli */
export function SimonPadFace({ pad, lit, calm }: PadFaceProps) {
    const style: CSSProperties = {
        backgroundColor: lit ? pad.light : pad.color,
        borderColor: pad.edge,
        boxShadow: lit ? `0 0 0 6px ${pad.light}, 0 0 34px 10px ${pad.light}` : undefined,
    };
    return (
        <span
            aria-hidden="true"
            className={cn(
                "absolute inset-0 grid place-items-center rounded-full border-4 border-b-[7px] transition-[background-color,box-shadow,transform] duration-200",
                lit && !calm && "scale-[1.07]"
            )}
            style={style}
        >
            {/* Odsjaj gore levo: polje izgleda kao veliko dugme od plastike */}
            <span className="absolute left-[16%] top-[11%] h-[16%] w-[30%] -rotate-12 rounded-full bg-white/35" />
            <span className={cn("grid h-[66%] w-[66%] place-items-center rounded-full bg-white/90 ring-2 ring-white transition-colors duration-200", lit && "bg-white")}>
                <Picture id={pad.pic} className="h-[80%] w-[80%]" />
            </span>
        </span>
    );
}

/** Oko i uvo: „gledaj i slušaj” (kad je zvuk isključen, samo oko) */
export function WatchIcon({ listen }: { listen: boolean }) {
    return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true" focusable="false">
            <g transform={listen ? "translate(-8 0)" : undefined}>
                <path d="M8 32 Q32 10 56 32 Q32 54 8 32 Z" fill="#FFFFFF" stroke="#4937C6" strokeWidth="3.5" strokeLinejoin="round" />
                <circle cx="32" cy="32" r="10" fill="#7C5CD4" />
                <circle cx="32" cy="32" r="4.5" fill="#2B2A4C" />
                <circle cx="35.5" cy="28.5" r="2.4" fill="#FFFFFF" />
            </g>
            {listen && (
                <g transform="translate(46 20)">
                    <path d="M4 4 Q14 -2 18 8 Q20 15 13 20 Q9 23 10 28 Q9 32 5 30" fill="#FFD9B5" stroke="#C46A2E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 10 Q13 9 13 14" fill="none" stroke="#C46A2E" strokeWidth="2" strokeLinecap="round" />
                </g>
            )}
        </svg>
    );
}

/** Strelica unazad (zakrivljena, nalevo) */
export function BackwardsIcon() {
    return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true" focusable="false">
            <path d="M50 44 Q50 20 26 20 H18" fill="none" stroke="#6847B8" strokeWidth="7" strokeLinecap="round" />
            <path d="M24 9 L11 20 L24 31" fill="none" stroke="#6847B8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="50" r="5" fill="#B5A4EE" />
        </svg>
    );
}

/** Zvezdica „ti si na redu” */
export function TurnIcon() {
    return (
        <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden="true" focusable="false">
            <path d="M32 6 L39.5 23 L58 24.5 L44 36.5 L48.5 55 L32 45 L15.5 55 L20 36.5 L6 24.5 L24.5 23 Z" fill="#FFD34F" stroke="#E5A01E" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="26" cy="30" r="2.6" fill="#7A4E12" />
            <circle cx="38" cy="30" r="2.6" fill="#7A4E12" />
            <path d="M26 37 Q32 42 38 37" fill="none" stroke="#7A4E12" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
    );
}

interface SequenceDotsProps {
    /** Boje polja niza (tačka se oboji kad je to polje tačno ponovljeno) */
    colors: string[];
    /** Koliko je ponovljeno */
    entered: number;
    /** Dok se niz pokazuje: koja tačka trenutno svetli (bez boje — boje se ne „odaju”) */
    playing: number | null;
    backwards: boolean;
}

/**
 * Tačke niza: koliko polja ima niz i koliko je već ponovljeno. Dok se niz pokazuje, tačke samo
 * redom zasvetle (bez boja, da ne bi bile podsetnik za ceo niz); dok dete ponavlja, svaka tačno
 * ponovljena tačka dobije boju svog polja. Unazad se tačke pune zdesna nalevo, uz strelicu.
 */
export function SequenceDots({ colors, entered, playing, backwards }: SequenceDotsProps) {
    const n = colors.length;
    return (
        <div className="flex min-h-9 items-center justify-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-iris-100 sm:min-h-10 sm:px-4" aria-hidden="true">
            {backwards && (
                <span className="h-7 w-7 shrink-0 sm:h-8 sm:w-8">
                    <BackwardsIcon />
                </span>
            )}
            {colors.map((color, i) => {
                // Unazad: prva ponovljena je poslednja tačka
                const filled = backwards ? i >= n - entered : i < entered;
                const glowing = playing === i;
                return (
                    <span
                        key={i}
                        className={cn(
                            "h-4 w-4 rounded-full border-2 transition-colors duration-200 sm:h-5 sm:w-5",
                            filled ? "border-white" : glowing ? "border-iris-400 bg-iris-200" : "border-iris-200 bg-white"
                        )}
                        style={filled ? { backgroundColor: color, boxShadow: `0 0 0 2px ${color}` } : undefined}
                    />
                );
            })}
        </div>
    );
}
