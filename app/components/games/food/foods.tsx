// Hrana za igru „Šta jede?”: jednostavni, krupni oblici u okviru 100 × 100, sredina je u (50, 50).
// Plen (muva, crv, riba) je nacrtan bez osmeha i bez straha — samo kao hrana sa slikovnice.

import type { ReactNode } from "react";
import type { FoodId } from "@/app/components/games/data/foodItems";

const line = (color: string, width = 1.6) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

export const FOOD_ART: Record<FoodId, () => ReactNode> = {
    carrot: () => (
        <g>
            <path d="M50 26 Q42 14 36 18 Q42 22 46 28Z M50 26 Q50 10 56 12 Q54 20 52 28Z M50 26 Q60 16 66 20 Q58 24 54 29Z" fill="#5fae4a" {...line("#3f7a3a", 1.2)} />
            <path d="M38 32 Q50 22 62 32 Q60 50 52 84 Q50 90 48 84 Q40 50 38 32Z" fill="#f6862e" {...line("#c9631a")} />
            <path d="M42 42 h6 M46 54 h7 M45 66 h5" {...line("#c9631a", 1.4)} />
        </g>
    ),
    lettuce: () => (
        <g>
            <path d="M18 62 Q14 40 32 34 Q36 20 52 24 Q66 18 74 32 Q90 38 84 60 Q86 80 64 82 H36 Q14 80 18 62Z" fill="#8fd16a" {...line("#4f9a3a")} />
            <path d="M28 62 Q30 44 46 42 Q52 32 62 40 Q76 42 72 62 Q70 74 56 76 H44 Q30 74 28 62Z" fill="#b9e58f" {...line("#6fae4a", 1.3)} />
            <path d="M50 76 V48 M50 62 L40 52 M50 60 L60 50 M50 70 L42 64 M50 70 L58 64" fill="none" {...line("#6fae4a", 1.3)} />
        </g>
    ),
    grass: () => (
        <g>
            <ellipse cx={50} cy={82} rx={34} ry={6} fill="#6fae4a" />
            <path
                d="M18 84 Q20 60 14 40 Q28 58 30 84Z M28 84 Q30 50 34 26 Q40 56 40 84Z M38 84 Q42 52 50 18 Q54 54 52 84Z M50 84 Q56 54 66 28 Q62 58 62 84Z M60 84 Q66 60 82 42 Q74 64 72 84Z M70 84 Q76 66 88 58 Q80 72 82 84Z"
                fill="#7fc45a"
                {...line("#4f8a3a", 1.3)}
            />
        </g>
    ),
    hay: () => (
        <g>
            <rect x={14} y={34} width={72} height={46} rx={12} fill="#f2cf6a" {...line("#c9a03a")} />
            <path d="M20 46 Q40 42 60 46 Q72 48 80 44 M18 58 Q36 54 54 58 Q70 62 82 56 M20 70 Q40 66 58 70 Q72 72 80 68" fill="none" {...line("#d9b04a", 1.4)} />
            <rect x={30} y={33} width={7} height={48} fill="#b97a3a" />
            <rect x={63} y={33} width={7} height={48} fill="#b97a3a" />
            <path d="M14 40 L8 34 M16 52 L8 50 M86 42 L92 36 M86 62 L93 62 M40 34 L38 26 M56 34 L60 26" {...line("#d9b04a", 1.8)} />
        </g>
    ),
    leaves: () => (
        <g>
            <path d="M16 80 Q44 62 84 30" fill="none" {...line("#8a5a32", 3.4)} />
            <path d="M34 68 Q22 50 34 36 Q46 50 34 68Z" fill="#6fbf4a" {...line("#3f8a3a", 1.3)} />
            <path d="M54 54 Q48 32 64 22 Q72 40 54 54Z" fill="#7fcf5a" {...line("#3f8a3a", 1.3)} />
            <path d="M50 58 Q66 66 78 56 Q66 44 50 58Z" fill="#5faf3a" {...line("#3f8a3a", 1.3)} />
            <path d="M30 74 Q40 86 54 82 Q46 68 30 74Z" fill="#7fcf5a" {...line("#3f8a3a", 1.3)} />
            <path d="M34 66 V42 M56 50 L63 28 M54 58 H74 M34 76 L50 81" fill="none" {...line("#3f8a3a", 1)} />
        </g>
    ),
    banana: () => (
        <g>
            <path d="M22 34 Q24 74 56 80 Q78 82 84 70 Q60 72 46 60 Q34 48 32 30Z" fill="#f6d84a" {...line("#c9a01e")} />
            <path d="M30 40 Q36 64 60 74" fill="none" {...line("#e0b52a", 1.4)} />
            <path d="M32 30 L30 22 L24 24 L22 34" fill="#8a6a2a" {...line("#6a4f1e", 1.2)} />
            <path d="M84 70 L88 72" {...line("#6a4f1e", 3)} />
        </g>
    ),
    apple: () => (
        <g>
            <path d="M50 34 Q36 24 26 34 Q16 46 22 64 Q28 84 42 84 Q46 82 50 84 Q54 82 58 84 Q72 84 78 64 Q84 46 74 34 Q64 24 50 34Z" fill="#e8483f" {...line("#b9302a")} />
            <path d="M50 34 Q50 24 54 18" fill="none" {...line("#6a4426", 3)} />
            <path d="M54 24 Q64 14 74 20 Q66 30 54 24Z" fill="#5fae4a" {...line("#3f7a3a", 1.2)} />
            <ellipse cx={34} cy={46} rx={4} ry={7} fill="#ffffff" opacity={0.45} transform="rotate(20 34 46)" />
        </g>
    ),
    bamboo: () => (
        <g>
            <g fill="#8fcf5a" {...line("#4f8a3a")}>
                <rect x={30} y={14} width={13} height={76} rx={5} />
                <rect x={54} y={22} width={12} height={68} rx={5} />
            </g>
            <path d="M30 38 H43 M30 62 H43 M54 44 H66 M54 68 H66" {...line("#4f8a3a", 2.2)} />
            <path d="M43 38 Q58 30 66 16 Q50 22 43 38Z M66 44 Q80 40 88 28 Q74 30 66 44Z M30 62 Q16 58 10 46 Q24 50 30 62Z" fill="#5faf3a" {...line("#3f7a3a", 1.2)} />
        </g>
    ),
    nut: () => (
        <g>
            <path d="M50 18 Q76 20 78 50 Q78 80 50 84 Q22 80 22 50 Q24 20 50 18Z" fill="#c8915a" {...line("#8a5a32")} />
            <path d="M50 20 V82" {...line("#8a5a32", 2)} />
            <path d="M34 32 Q40 38 34 44 Q30 50 36 56 Q40 62 34 70 M66 32 Q60 38 66 44 Q70 50 64 56 Q60 62 66 70 M42 26 Q46 34 42 42 M58 26 Q54 34 58 42 M42 60 Q46 68 42 76 M58 60 Q54 68 58 76" fill="none" {...line("#a8723e", 1.4)} />
        </g>
    ),
    flower: () => (
        <g>
            <path d="M50 54 Q48 72 50 92" fill="none" {...line("#4f9a3a", 3)} />
            <path d="M50 78 Q62 66 72 72 Q62 84 50 78Z" fill="#6fbf4a" {...line("#3f8a3a", 1.2)} />
            <g fill="#f78fb3" {...line("#d9628e", 1.3)}>
                <circle cx={50} cy={22} r={11} />
                <circle cx={70} cy={36} r={11} />
                <circle cx={62} cy={58} r={11} />
                <circle cx={38} cy={58} r={11} />
                <circle cx={30} cy={36} r={11} />
            </g>
            <circle cx={50} cy={42} r={11} fill="#f6cf3a" {...line("#d9a01e", 1.3)} />
            <circle cx={46} cy={40} r={1.4} fill="#d9a01e" />
            <circle cx={53} cy={44} r={1.4} fill="#d9a01e" />
            <circle cx={50} cy={38} r={1.2} fill="#d9a01e" />
        </g>
    ),
    honey: () => (
        <g>
            <path d="M28 40 Q20 60 28 78 Q36 88 50 88 Q64 88 72 78 Q80 60 72 40Z" fill="#f2a52a" {...line("#c97a12")} />
            <rect x={24} y={30} width={52} height={12} rx={5} fill="#e8d4a8" {...line("#b99a62")} />
            <path d="M30 42 Q34 54 38 46 Q42 60 46 46 Q50 52 54 44" fill="none" {...line("#fbd06a", 3)} />
            <ellipse cx={36} cy={64} rx={4} ry={9} fill="#ffffff" opacity={0.35} />
            <path d="M58 30 V18 M52 18 H64" {...line("#8a5a32", 2.6)} />
            <path d="M52 14 Q58 10 64 14 L64 20 Q58 24 52 20Z" fill="#c8915a" {...line("#8a5a32", 1.2)} />
        </g>
    ),
    seeds: () => (
        <g>
            <ellipse cx={50} cy={78} rx={34} ry={8} fill="#000000" opacity={0.06} />
            {[
                [32, 70, -30],
                [46, 74, 10],
                [60, 70, 40],
                [70, 76, -10],
                [40, 58, 60],
                [55, 58, -20],
                [66, 60, 20],
                [48, 44, 0],
                [28, 78, 80],
            ].map(([x, y, rot]) => (
                <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rot})`}>
                    <path d="M0 -10 Q7 -2 0 10 Q-7 -2 0 -10Z" fill="#5a4a40" {...line("#3f322a", 1.1)} />
                    <path d="M0 -8 V8" {...line("#d9cbb8", 1.2)} />
                </g>
            ))}
        </g>
    ),
    corn: () => (
        <g>
            <path d="M40 22 Q50 12 60 22 Q66 52 50 86 Q34 52 40 22Z" fill="#f6d84a" {...line("#d9a81e")} />
            <g fill="#fbe68a">
                {[30, 38, 46, 54, 62, 70].flatMap((y) =>
                    [-6, 0, 6].map((dx) => <circle key={`${y}-${dx}`} cx={50 + dx * (1 - Math.abs(y - 46) / 70)} cy={y} r={2.4} stroke="#d9a81e" strokeWidth={0.8} />)
                )}
            </g>
            <path d="M50 86 Q30 70 26 40 Q38 56 46 80Z M50 86 Q70 70 74 40 Q62 56 54 80Z" fill="#7fc45a" {...line("#4f8a3a", 1.2)} />
        </g>
    ),
    fish: () => (
        <g>
            <path d="M20 50 Q36 26 62 32 Q78 36 84 50 Q78 64 62 68 Q36 74 20 50Z" fill="#7ab8e8" {...line("#4a86c0")} />
            <path d="M22 50 L8 36 Q12 50 8 64Z" fill="#7ab8e8" {...line("#4a86c0")} />
            <path d="M48 34 Q56 24 64 33" fill="#5aa0d8" {...line("#4a86c0", 1.2)} />
            <path d="M40 40 Q46 50 40 60 M50 38 Q56 50 50 62" fill="none" {...line("#4a86c0", 1.2)} />
            <circle cx={72} cy={46} r={2.6} fill="#2f3550" />
        </g>
    ),
    bone: () => (
        <g transform="rotate(-25 50 50)">
            <path
                d="M28 44 Q16 34 22 28 Q28 22 34 32 Q40 24 44 32 Q42 40 36 44 H64 Q58 40 56 32 Q60 24 66 32 Q72 22 78 28 Q84 34 72 44 V56 Q84 66 78 72 Q72 78 66 68 Q60 76 56 68 Q58 60 64 56 H36 Q42 60 44 68 Q40 76 34 68 Q28 78 22 72 Q16 66 28 56Z"
                fill="#fbf6ea"
                {...line("#c9bfa8", 1.8)}
            />
        </g>
    ),
    fly: () => (
        <g>
            <ellipse cx={38} cy={36} rx={14} ry={9} fill="#e3f3fc" opacity={0.9} transform="rotate(-30 38 36)" {...line("#9ac2da", 1.2)} />
            <ellipse cx={62} cy={36} rx={14} ry={9} fill="#e3f3fc" opacity={0.9} transform="rotate(30 62 36)" {...line("#9ac2da", 1.2)} />
            <path d="M42 56 L30 66 M42 60 L32 72 M58 56 L70 66 M58 60 L68 72" {...line("#4a4050", 1.6)} />
            <ellipse cx={50} cy={56} rx={10} ry={13} fill="#5a5a68" {...line("#3a3a46", 1.2)} />
            <circle cx={50} cy={40} r={8} fill="#5a5a68" {...line("#3a3a46", 1.2)} />
            <circle cx={45.5} cy={39} r={3} fill="#b94a4a" />
            <circle cx={54.5} cy={39} r={3} fill="#b94a4a" />
        </g>
    ),
    worm: () => (
        <g>
            <path d="M14 66 Q24 46 36 62 Q48 78 58 58 Q68 38 82 50" fill="none" {...line("#e88aa0", 11)} />
            <path d="M14 66 Q24 46 36 62 Q48 78 58 58 Q68 38 82 50" fill="none" {...line("#f6b0c0", 5)} />
            <path d="M30 54 l3 5 M44 66 l-2 5 M62 52 l-4 3" {...line("#d9708a", 1.4)} />
        </g>
    ),
};

/** Hrana u svom okviru 100 × 100 */
export function FoodPicture({ id, className }: { id: FoodId; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {FOOD_ART[id]()}
        </svg>
    );
}
