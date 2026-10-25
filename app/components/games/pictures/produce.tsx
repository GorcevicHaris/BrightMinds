// Voće, povrće i slatkiši kojih nema u igrama „Šta jede?” i „Prodavnica”. Isti stil: krupni obli
// oblici u okviru 100 × 100, sredina je u (50, 50), tanka tamnija ivica i beli odsjaj. Boja je
// uvek jasna i jedna (jagoda je crvena, limun žut, krastavac zelen) — igra „Razvrstaj” po njoj
// razvrstava.

import type { ReactNode } from "react";
import { line, Shine } from "./kit";

const RED = "#e8483f";
const RED_EDGE = "#b9302a";
const LEAF = "#5fae4a";
const LEAF_EDGE = "#3f7a3a";

/** Zelena „zvezdica” peteljke (jagoda, paradajz) oko tačke (x, y) */
function Calyx({ x, y, r = 12 }: { x: number; y: number; r?: number }) {
    const points = Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const b = a + Math.PI / 5;
        return `${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r * 0.55).toFixed(1)} ${(x + Math.cos(b) * r * 0.35).toFixed(1)} ${(y + Math.sin(b) * r * 0.25).toFixed(1)}`;
    });
    return <path d={`M${points.join(" L")}Z`} fill={LEAF} {...line(LEAF_EDGE, 1.2)} />;
}

export const PRODUCE_ART = {
    strawberry: () => (
        <g>
            <path d="M50 90 Q26 74 21 50 Q18 32 34 29 Q43 28 50 33 Q57 28 66 29 Q82 32 79 50 Q74 74 50 90Z" fill={RED} {...line(RED_EDGE)} />
            <g fill="#f6dc6a">
                {[
                    [36, 44],
                    [50, 46],
                    [64, 44],
                    [30, 56],
                    [43, 58],
                    [57, 58],
                    [70, 56],
                    [38, 70],
                    [50, 72],
                    [62, 70],
                    [50, 83],
                ].map(([x, y]) => (
                    <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={1.5} ry={2.3} />
                ))}
            </g>
            <Calyx x={50} y={31} r={17} />
            <path d="M50 28 Q50 18 55 13" fill="none" {...line(LEAF_EDGE, 3)} />
            <Shine x={31} y={44} rx={3} ry={6} />
        </g>
    ),
    // Jedna trešnja (u igri „Brojimo” svaka sličica je jedan predmet)
    cherry: () => (
        <g>
            <path d="M48 62 Q48 34 60 12" fill="none" {...line("#4f7a2a", 3)} />
            <path d="M60 14 Q74 6 86 14 Q74 26 60 14Z" fill={LEAF} {...line(LEAF_EDGE, 1.2)} />
            <path d="M48 46 Q28 42 22 62 Q18 82 34 88 Q42 90 48 86 Q54 90 62 88 Q78 82 74 62 Q68 42 48 46Z" fill="#d93a3a" {...line(RED_EDGE)} />
            <Shine x={34} y={60} rx={4} ry={7} />
        </g>
    ),
    tomato: () => (
        <g>
            <path d="M50 30 Q22 28 16 52 Q14 78 40 84 Q50 86 60 84 Q86 78 84 52 Q78 28 50 30Z" fill={RED} {...line(RED_EDGE)} />
            <path d="M36 34 Q30 50 34 74 M64 34 Q70 50 66 74" fill="none" {...line("#d23c34", 1.3)} />
            <Calyx x={50} y={31} r={16} />
            <path d="M50 30 V20" {...line(LEAF_EDGE, 3)} />
            <Shine x={28} y={48} rx={4} ry={7} />
        </g>
    ),
    lemon: () => (
        <g transform="rotate(-18 50 52)">
            <path d="M12 52 Q14 46 20 44 Q30 26 50 26 Q70 26 80 44 Q86 46 88 52 Q86 58 80 60 Q70 78 50 78 Q30 78 20 60 Q14 58 12 52Z" fill="#f8d93a" {...line("#c9a01e")} />
            <Shine x={36} y={40} rx={4} ry={8} rotate={60} />
            <path d="M80 44 Q76 36 82 30 Q86 36 80 44Z" fill={LEAF} {...line(LEAF_EDGE, 1.1)} />
        </g>
    ),
    broccoli: () => (
        <g>
            <path d="M42 90 L44 62 L34 54 M58 90 L56 62 L66 54 M50 62 V90" fill="none" {...line("#6fa04a", 2)} />
            <path d="M40 92 L43 58 H57 L60 92Z" fill="#a6d27a" {...line("#6f9a4a")} />
            <g fill="#4f9a3a" {...line("#2f6a2a", 1.4)}>
                <circle cx={30} cy={46} r={14} />
                <circle cx={70} cy={46} r={14} />
                <circle cx={42} cy={30} r={15} />
                <circle cx={60} cy={30} r={15} />
                <circle cx={50} cy={48} r={14} />
            </g>
            <g fill="#6fbf4a">
                <circle cx={38} cy={26} r={4} />
                <circle cx={58} cy={24} r={4} />
                <circle cx={26} cy={42} r={3.5} />
                <circle cx={68} cy={42} r={3.5} />
                <circle cx={48} cy={44} r={3.5} />
            </g>
        </g>
    ),
    appleGreen: () => (
        <g>
            <path d="M50 34 Q36 24 26 34 Q16 46 22 64 Q28 84 42 84 Q46 82 50 84 Q54 82 58 84 Q72 84 78 64 Q84 46 74 34 Q64 24 50 34Z" fill="#7cc84a" {...line("#4a8a2a")} />
            <path d="M50 34 Q50 24 54 18" fill="none" {...line("#6a4426", 3)} />
            <path d="M54 24 Q64 14 74 20 Q66 30 54 24Z" fill="#3f9a3a" {...line("#2f6a2a", 1.2)} />
            <Shine x={34} y={46} />
        </g>
    ),
    cucumber: () => (
        <g transform="rotate(-30 50 50)">
            <rect x={10} y={36} width={80} height={28} rx={14} fill="#4fa34a" {...line("#2f6a2a")} />
            <path d="M20 44 Q50 40 82 44" fill="none" {...line("#7cc86a", 2.4)} />
            <g fill="#2f6a2a">
                {[24, 38, 52, 66, 78].map((x, i) => (
                    <circle key={x} cx={x} cy={i % 2 ? 56 : 52} r={1.4} />
                ))}
            </g>
            <ellipse cx={88} cy={50} rx={2} ry={5} fill="#c9e59a" />
        </g>
    ),
    clover: () => (
        <g>
            <path d="M50 52 Q54 72 46 92" fill="none" {...line("#3f8a3a", 3.4)} />
            <g fill="#4fae4a" {...line("#2f7a2a", 1.4)}>
                {[0, 90, 180, 270].map((angle) => (
                    <path key={angle} transform={`rotate(${angle} 50 50)`} d="M50 50 Q36 44 36 32 Q36 22 44 22 Q50 22 50 30 Q50 22 56 22 Q64 22 64 32 Q64 44 50 50Z" />
                ))}
            </g>
            <circle cx={50} cy={50} r={3} fill="#3f8a3a" />
            <path d="M44 30 Q46 38 50 44 M56 30 Q54 38 50 44" fill="none" stroke="#8fd16a" strokeWidth={1.2} strokeLinecap="round" />
        </g>
    ),
    pear: () => (
        <g>
            <path d="M50 18 Q40 18 38 34 Q36 46 28 56 Q18 72 30 84 Q40 92 50 90 Q60 92 70 84 Q82 72 72 56 Q64 46 62 34 Q60 18 50 18Z" fill="#b8d54a" {...line("#7a9a2a")} />
            <path d="M50 20 Q50 12 46 8" fill="none" {...line("#6a4426", 3)} />
            <path d="M50 16 Q60 6 70 12 Q62 20 50 16Z" fill={LEAF} {...line(LEAF_EDGE, 1.2)} />
            <Shine x={36} y={64} rx={4} ry={9} rotate={10} />
        </g>
    ),
    grapes: () => (
        <g>
            <path d="M50 22 Q50 14 56 8" fill="none" {...line("#6a4426", 3)} />
            <path d="M52 18 Q36 6 24 16 Q36 28 52 18Z" fill={LEAF} {...line(LEAF_EDGE, 1.2)} />
            <g fill="#8a5cc9" {...line("#5f3a9a", 1.4)}>
                {[
                    [34, 30],
                    [50, 28],
                    [66, 30],
                    [26, 44],
                    [42, 44],
                    [58, 44],
                    [74, 44],
                    [34, 58],
                    [50, 58],
                    [66, 58],
                    [42, 72],
                    [58, 72],
                    [50, 85],
                ].map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r={9} />
                ))}
            </g>
            <g fill="#ffffff" opacity={0.4}>
                {[
                    [31, 27],
                    [47, 25],
                    [39, 41],
                    [55, 41],
                    [47, 55],
                    [39, 69],
                ].map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r={2.2} />
                ))}
            </g>
        </g>
    ),
    orange: () => (
        <g>
            <circle cx={50} cy={56} r={32} fill="#f6922e" {...line("#c9631a")} />
            <g fill="#e07a1e">
                {[
                    [40, 50],
                    [60, 46],
                    [66, 64],
                    [46, 72],
                    [34, 64],
                    [54, 60],
                ].map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r={1.2} />
                ))}
            </g>
            <path d="M50 25 Q50 18 52 14" fill="none" {...line("#6a4426", 3)} />
            <path d="M52 20 Q64 10 74 18 Q64 28 52 20Z" fill={LEAF} {...line(LEAF_EDGE, 1.2)} />
            <Shine x={34} y={44} />
        </g>
    ),
    coconut: () => (
        <g>
            <circle cx={50} cy={54} r={34} fill="#8a5a32" {...line("#5f3a1e")} />
            <path d="M22 40 L28 42 M18 56 L24 56 M24 72 L29 69 M78 40 L72 42 M82 56 L76 56 M76 72 L71 69 M40 22 L42 27 M60 22 L58 27" {...line("#5f3a1e", 1.4)} />
            <circle cx={50} cy={54} r={25} fill="#fbf6ec" {...line("#d9cbb0", 1.4)} />
            <circle cx={50} cy={54} r={15} fill="#eef6f8" />
            <Shine x={40} y={44} rx={3} ry={5} opacity={0.7} />
        </g>
    ),
    pineapple: () => (
        <g>
            <g fill="#4fae4a" {...line("#2f7a2a", 1.3)}>
                <path d="M50 38 L40 6 L52 28Z" />
                <path d="M50 38 L60 6 L48 28Z" />
                <path d="M48 38 L26 14 L46 30Z" />
                <path d="M52 38 L74 14 L54 30Z" />
                <path d="M50 38 L50 2 L56 30 Z" />
            </g>
            <ellipse cx={50} cy={64} rx={24} ry={30} fill="#f6c43a" {...line("#c98a1a")} />
            <path d="M32 46 L68 84 M28 60 L56 92 M40 38 L74 72 M68 46 L32 84 M72 60 L44 92 M60 38 L26 72" fill="none" {...line("#d99a2a", 1.3)} />
        </g>
    ),
    kiwi: () => (
        <g>
            <circle cx={50} cy={52} r={34} fill="#9a6a3a" {...line("#6a4426")} />
            <circle cx={50} cy={52} r={29} fill="#8fcc3a" {...line("#6aa02a", 1.2)} />
            <ellipse cx={50} cy={52} rx={10} ry={9} fill="#f2f6d8" />
            <g fill="#3a2a1e">
                {Array.from({ length: 12 }, (_, i) => {
                    const a = (i / 12) * Math.PI * 2;
                    return <ellipse key={i} cx={50 + Math.cos(a) * 15} cy={52 + Math.sin(a) * 14} rx={1.4} ry={2.4} transform={`rotate(${(a * 180) / Math.PI + 90} ${50 + Math.cos(a) * 15} ${52 + Math.sin(a) * 14})`} />;
                })}
            </g>
        </g>
    ),
    egg: () => (
        <g>
            <path d="M50 12 Q74 12 80 54 Q82 88 50 90 Q18 88 20 54 Q26 12 50 12Z" fill="#efc48c" {...line("#9c6a34", 2.6)} />
            <Shine x={36} y={40} rx={5} ry={10} rotate={15} opacity={0.8} />
        </g>
    ),
    cupcake: () => (
        <g>
            <path d="M26 54 L32 90 H68 L74 54Z" fill="#7fc8f0" {...line("#4a8ac0")} />
            <path d="M38 56 L40 90 M50 56 V90 M62 56 L60 90" {...line("#4a8ac0", 1.3)} />
            <path d="M22 56 Q16 46 28 42 Q26 30 40 30 Q44 18 56 22 Q70 22 70 34 Q84 36 78 48 Q82 58 70 58 H30 Q20 60 22 56Z" fill="#f7a8c8" {...line("#d9628e")} />
            <path d="M32 44 Q44 48 56 42 M44 32 Q52 36 62 32" fill="none" {...line("#fbd0e0", 2)} />
            <circle cx={52} cy={16} r={6} fill={RED} {...line(RED_EDGE, 1.2)} />
            <path d="M52 10 Q54 4 60 3" fill="none" {...line("#4f7a2a", 1.4)} />
        </g>
    ),
    mushroom: () => (
        <g>
            <path d="M38 56 Q34 76 36 88 Q50 92 64 88 Q66 76 62 56Z" fill="#fbf1de" {...line("#cdb58e")} />
            <path d="M12 58 Q12 18 50 16 Q88 18 88 58 Q70 64 50 62 Q30 64 12 58Z" fill="#e5484d" {...line("#b9302a")} />
            <g fill="#ffffff">
                <circle cx={32} cy={38} r={6} />
                <circle cx={54} cy={28} r={5} />
                <circle cx={70} cy={44} r={5.5} />
                <circle cx={48} cy={50} r={4} />
            </g>
        </g>
    ),
} satisfies Record<string, () => ReactNode>;
