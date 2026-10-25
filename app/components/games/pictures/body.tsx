// Delovi tela za igre „Čemu služi?” i „Slova”: nos, uvo, oči, usta, jezik, ruka, noga i zubi.
// Mirno i jednostavno, bez krvi i bez straha; koža iste boje kao kod dece na slikama situacija.

import type { ReactNode } from "react";
import { INK, line, Shine } from "./kit";

const SKIN = "#f6cfa8";
const SKIN_EDGE = "#c98a5a";
const SKIN_DARK = "#eab48a";

export const BODY_ART = {
    nose: () => (
        <g>
            <path d="M52 10 Q58 40 72 62 Q80 74 70 82 Q62 88 54 82 Q50 86 44 86 Q36 88 30 82 Q22 74 32 66 Q40 56 42 36 Q44 14 52 10Z" fill={SKIN} {...line(SKIN_EDGE, 1.8)} />
            <ellipse cx={42} cy={78} rx={5} ry={3} fill={SKIN_EDGE} opacity={0.7} />
            <ellipse cx={60} cy={78} rx={5} ry={3} fill={SKIN_EDGE} opacity={0.7} />
            <Shine x={50} y={40} rx={3} ry={9} rotate={-10} opacity={0.5} />
        </g>
    ),
    ear: () => (
        <g>
            <path d="M40 10 Q74 8 78 38 Q80 56 64 66 Q56 72 56 82 Q54 94 42 92 Q30 90 32 76 Q22 64 22 40 Q22 12 40 10Z" fill={SKIN} {...line(SKIN_EDGE, 1.8)} />
            <path d="M40 24 Q62 22 64 40 Q64 52 52 56 Q44 58 46 70" fill="none" {...line(SKIN_EDGE, 2.4)} />
            <path d="M44 36 Q52 36 52 44" fill="none" {...line(SKIN_EDGE, 2)} />
        </g>
    ),
    eyes: () => (
        <g>
            {[28, 72].map((x) => (
                <g key={x}>
                    <path d={`M${x - 20} 52 Q${x} 26 ${x + 20} 52 Q${x} 74 ${x - 20} 52Z`} fill="#ffffff" {...line("#8a7a6a", 1.8)} />
                    <circle cx={x} cy={52} r={10} fill="#6a9a4a" />
                    <circle cx={x} cy={52} r={5} fill={INK} />
                    <circle cx={x - 3} cy={48} r={2.4} fill="#ffffff" />
                    <path d={`M${x - 18} 40 Q${x} 22 ${x + 18} 40`} fill="none" {...line("#6a4a32", 2.4)} />
                </g>
            ))}
        </g>
    ),
    mouth: () => (
        <g>
            <path d="M10 46 Q30 30 42 36 Q50 32 58 36 Q70 30 90 46 Q70 78 50 78 Q30 78 10 46Z" fill="#e8606a" {...line("#b03a44", 1.8)} />
            <path d="M14 47 Q50 56 86 47" fill="none" {...line("#b03a44", 1.8)} />
            <Shine x={34} y={62} rx={2} ry={7} rotate={70} opacity={0.4} />
        </g>
    ),
    tongue: () => (
        <g>
            <path d="M10 34 Q50 52 90 34 Q74 46 50 48 Q26 46 10 34Z" fill="#b03a44" />
            <path d="M10 34 Q50 52 90 34" fill="none" {...line("#b03a44", 2)} />
            <path d="M30 42 Q28 90 50 90 Q72 90 70 42 Q50 50 30 42Z" fill="#f28a9a" {...line("#c9566a", 1.8)} />
            <path d="M50 52 V74" {...line("#c9566a", 1.8)} />
            <Shine x={40} y={62} rx={2.4} ry={7} rotate={0} opacity={0.5} />
        </g>
    ),
    hand: () => (
        <g>
            <path d="M34 92 V60 L20 44 Q16 38 22 36 Q26 34 30 40 L36 46 V18 Q36 12 41 12 Q46 12 46 18 V40 V12 Q46 6 51 6 Q56 6 56 12 V40 V16 Q56 10 61 10 Q66 10 66 16 V42 V24 Q66 18 71 18 Q76 18 76 24 V64 Q76 80 66 92Z" fill={SKIN} {...line(SKIN_EDGE, 1.8)} />
            <path d="M46 40 V30 M56 40 V28 M66 42 V34" {...line(SKIN_DARK, 1.4)} />
        </g>
    ),
    // Noga od kolena naniže, sa stopalom (bosa), ispod plavog šorca
    leg: () => (
        <g>
            <path d="M38 22 H60 V62 Q60 70 68 72 L84 76 Q94 78 93 86 Q92 94 82 94 H42 Q34 94 34 84 Q34 74 36 62Z" fill={SKIN} {...line(SKIN_EDGE, 1.8)} />
            <path d="M30 4 H66 L64 30 Q50 34 34 30Z" fill="#3e7bfa" {...line("#2a58c0", 1.8)} />
            <path d="M35 24 Q50 28 64 24" fill="none" {...line("#2a58c0", 1.4)} />
            <path d="M44 50 Q48 54 53 50" fill="none" {...line(SKIN_DARK, 1.6)} />
            <path d="M82 80 Q86 84 84 90 M75 80 Q78 85 76 91" fill="none" {...line(SKIN_DARK, 1.2)} />
        </g>
    ),
    teeth: () => (
        <g>
            <path d="M8 34 Q50 14 92 34 Q88 70 50 82 Q12 70 8 34Z" fill="#f28a9a" {...line("#c9566a", 1.8)} />
            <g fill="#ffffff" {...line("#c8c8d0", 1.2)}>
                {[18, 30, 42, 54, 66, 78].map((x, i) => (
                    <rect key={x} x={x - 5} y={i === 0 || i === 5 ? 30 : 26} width={11} height={14} rx={3} />
                ))}
                {[30, 42, 54, 66].map((x) => (
                    <rect key={`b${x}`} x={x - 5} y={58} width={11} height={12} rx={3} />
                ))}
            </g>
        </g>
    ),
} satisfies Record<string, () => ReactNode>;
