"use client";

// Velika slika igre „Šta jede?” (okvir 150 × 100, odnos 3 : 2): životinja u svom okruženju,
// sama, sa hranom pored sebe, ili kako jede. Jedenje je kratko i veselo: hrana dođe do usta,
// tri zalogaja, životinja zažmuri od zadovoljstva i iznad nje se pojavi srce — jednom, bez
// ponavljanja. Uz „Manje animacija” (ili sistemsko „smanji pokrete”) slika je mirna: hrana
// stoji kod usta, životinja je zadovoljna, srce je tu.

import type { ReactNode } from "react";
import type { AnimalId, FoodId } from "@/app/components/games/data/foodItems";
import { ANIMAL_ART, type Place } from "./animals";
import { FOOD_ART } from "./foods";

/** Koliko traje jedenje (ms) — igra čeka bar toliko pre sledećeg zadatka */
export const EAT_MS = 2200;

// Imena animacija imaju predznak „fj-” da se ne sudare sa ostatkom aplikacije
const EAT_CSS = `
@keyframes fj-bring {
  0% { transform: translate(34px, 8px); opacity: 0; }
  12% { opacity: 1; }
  32% { transform: translate(0, 0) scale(1); }
  48% { transform: scale(0.74); }
  64% { transform: scale(0.5); }
  80% { transform: scale(0.26); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
}
@keyframes fj-chew {
  0%, 34%, 48%, 64%, 80%, 100% { transform: none; }
  41%, 57%, 73% { transform: translateY(1.6px) scaleY(0.975); }
}
@keyframes fj-heart {
  0%, 78% { opacity: 0; transform: translateY(4px) scale(0.6); }
  90% { opacity: 1; transform: translateY(0) scale(1.08); }
  100% { opacity: 1; transform: translateY(-2px) scale(1); }
}
.fj-food { transform-box: fill-box; transform-origin: center; animation: fj-bring ${EAT_MS}ms ease-in-out both; }
.fj-chew { transform-box: fill-box; transform-origin: 50% 100%; animation: fj-chew ${EAT_MS}ms ease-in-out both; }
.fj-heart { transform-box: fill-box; transform-origin: center; animation: fj-heart ${EAT_MS + 300}ms ease-out both; }
`;

/** Stilovi animacije (jednom po slici; isti sadržaj se ponavlja bez štete) */
export function EatStyles() {
    return <style>{EAT_CSS}</style>;
}

/** Hrana veličine `size` sa sredinom u (x, y), u koordinatama crteža */
function FoodAt({ id, x, y, size }: { id: FoodId; x: number; y: number; size: number }) {
    return <g transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 100})`}>{FOOD_ART[id]()}</g>;
}

function Heart({ x, y, animate }: { x: number; y: number; animate: boolean }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <path className={animate ? "fj-heart" : undefined} d="M0 4 C-7 -1 -6 -7 -2.5 -7 C-1 -7 0 -6 0 -5 C0 -6 1 -7 2.5 -7 C6 -7 7 -1 0 4Z" fill="#f2607e" stroke="#c9405e" strokeWidth={0.8} />
        </g>
    );
}

export type EatMode = "alone" | "eat";

/**
 * Životinja u okviru 100 × 100. U režimu „eat” hrana dolazi do usta i nestaje u tri zalogaja
 * (`calm`: hrana mirno stoji kod usta). Bez `food` životinja samo stoji.
 */
export function AnimalEating({ animal, food, mode, calm }: { animal: AnimalId; food?: FoodId; mode: EatMode; calm: boolean }) {
    const art = ANIMAL_ART[animal];
    const eating = mode === "eat" && food !== undefined;
    const [mx, my] = art.mouth;
    const animate = eating && !calm;
    // Hrana malo ispod usta, da se lice i dalje vidi
    const size = animal === "bee" || animal === "bird" || animal === "chicken" ? 24 : 28;
    return (
        <g>
            <g className={animate ? "fj-chew" : undefined}>{art.draw(eating)}</g>
            {eating && (
                <g transform={`translate(${mx} ${my + size * 0.28})`}>
                    <g className={animate ? "fj-food" : undefined}>
                        <FoodAt id={food} x={0} y={0} size={size} />
                    </g>
                </g>
            )}
            {eating && <Heart x={Math.min(mx + 26, 90)} y={Math.max(my - 30, 10)} animate={animate} />}
        </g>
    );
}

// ── Okruženja ─────────────────────────────────────────────────────────────────

const PLACES: Record<Place, { sky: string; ground: string; extra?: ReactNode }> = {
    meadow: {
        sky: "#dff1fb",
        ground: "#a6d983",
        extra: (
            <g fill="#ffffff" opacity={0.85}>
                <ellipse cx={24} cy={18} rx={12} ry={5} />
                <ellipse cx={124} cy={14} rx={14} ry={5} />
            </g>
        ),
    },
    farm: {
        sky: "#e4f2fb",
        ground: "#b4d97f",
        extra: (
            <g>
                <path d="M4 66 H146 M4 74 H146" stroke="#c99a6a" strokeWidth={2.2} />
                {[10, 30, 120, 140].map((x) => (
                    <rect key={x} x={x - 2} y={60} width={4} height={18} rx={1} fill="#c99a6a" />
                ))}
                <path d="M118 40 L132 30 L146 40 V62 H118Z" fill="#e8725f" opacity={0.9} />
                <rect x={127} y={48} width={10} height={14} fill="#fbeedd" opacity={0.9} />
            </g>
        ),
    },
    forest: {
        sky: "#e2f3e4",
        ground: "#9fcf7a",
        extra: (
            <g>
                <rect x={14} y={44} width={5} height={34} fill="#9a6a42" />
                <circle cx={16.5} cy={38} r={14} fill="#6fb35a" />
                <rect x={130} y={40} width={5} height={38} fill="#9a6a42" />
                <circle cx={132.5} cy={32} r={15} fill="#5fa34a" />
            </g>
        ),
    },
    pond: {
        sky: "#def2fb",
        ground: "#a6d983",
        extra: (
            <g>
                <ellipse cx={75} cy={92} rx={68} ry={9} fill="#8fcbea" />
                <path d="M18 78 V60 M24 78 V56 M130 78 V58" stroke="#5f9a4a" strokeWidth={2} strokeLinecap="round" />
                <ellipse cx={24} cy={55} rx={2} ry={5} fill="#8a5a32" />
            </g>
        ),
    },
    ice: {
        sky: "#e6f3fb",
        ground: "#f4fafd",
        extra: (
            <g>
                <path d="M4 78 L16 52 L28 60 L38 78Z M112 78 L126 46 L138 56 L148 78Z" fill="#d6ecf7" stroke="#b9dbee" strokeWidth={1} />
                <ellipse cx={75} cy={94} rx={70} ry={6} fill="#bfe1f2" />
            </g>
        ),
    },
    savanna: {
        sky: "#fff2d6",
        ground: "#e6cf82",
        extra: (
            <g>
                <circle cx={128} cy={18} r={8} fill="#fbd36a" />
                <rect x={18} y={50} width={3.5} height={28} fill="#9a6a42" />
                <ellipse cx={20} cy={48} rx={17} ry={6} fill="#8fbf5a" />
            </g>
        ),
    },
    home: {
        sky: "#fbeedd",
        ground: "#e9cba3",
        extra: (
            <g>
                <rect x={110} y={14} width={26} height={22} rx={2} fill="#dff1fb" stroke="#d9b98a" strokeWidth={2} />
                <path d="M123 14 V36 M110 25 H136" stroke="#d9b98a" strokeWidth={1.5} />
                <ellipse cx={75} cy={92} rx={50} ry={7} fill="#f2a5a0" opacity={0.6} />
            </g>
        ),
    },
    garden: {
        sky: "#e2f3fb",
        ground: "#a6d983",
        extra: (
            <g>
                {[12, 26, 128, 140].map((x, i) => (
                    <g key={x}>
                        <path d={`M${x} 80 V68`} stroke="#5f9a4a" strokeWidth={1.4} />
                        <circle cx={x} cy={66} r={3.4} fill={i % 2 ? "#f6cf3a" : "#f78fb3"} />
                    </g>
                ))}
            </g>
        ),
    },
};

function Backdrop({ place }: { place: Place }) {
    const look = PLACES[place];
    return (
        <g>
            <rect x={0} y={0} width={150} height={100} fill={look.sky} />
            <rect x={0} y={74} width={150} height={26} fill={look.ground} />
            {look.extra}
        </g>
    );
}

export type SceneMode = "alone" | "beside" | "eat" | "food";

interface FoodSceneProps {
    animal?: AnimalId;
    food?: FoodId;
    /**
     * „alone” životinja sama, „beside” životinja i hrana pored nje, „eat” životinja jede,
     * „food” samo hrana (pitanje „Ko jede …?”)
     */
    mode: SceneMode;
    calm: boolean;
    className?: string;
}

export function FoodScene({ animal, food, mode, calm, className }: FoodSceneProps) {
    const place: Place = animal ? ANIMAL_ART[animal].place : "meadow";
    return (
        <svg viewBox="0 0 150 100" className={className} aria-hidden="true" focusable="false">
            <EatStyles />
            <Backdrop place={place} />
            {mode === "food" || !animal ? (
                food && <FoodAt id={food} x={75} y={54} size={66} />
            ) : (
                <>
                    <g transform="translate(25 0)">
                        <AnimalEating animal={animal} food={food} mode={mode === "eat" ? "eat" : "alone"} calm={calm} />
                    </g>
                    {mode === "beside" && food && <FoodAt id={food} x={124} y={78} size={34} />}
                </>
            )}
        </svg>
    );
}
