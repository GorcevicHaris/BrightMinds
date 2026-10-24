// Crteži koji postoje samo u igri „Šta je prvo?”: ono čega nema u zajedničkom kompletu slika
// (kantica, sapun, pasta za zube, tiganj…). Isti stil kao scene/props.tsx: jednostavni oblici,
// mirne boje, tanka tamnija ivica. Svaki se crta oko sredine svoje donje ivice (0, 0), u
// razmeri u kojoj je dete visoko oko 75 jedinica.

import type { ReactNode } from "react";
import type { DrawId } from "./art";

const line = (color: string, width = 1.5) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

const WATER = "#6cc0e8";
const SOIL = "#8a5a3a";
const SOIL_DARK = "#6a4128";
const POT = "#d9774a";

function Pot({ children }: { children?: ReactNode }) {
    return (
        <g>
            {children}
            <path d="M-13 -18 H13 L10 0 H-10Z" fill={POT} {...line("#a8532c")} />
            <rect x={-15} y={-21} width={30} height={5} rx={1.5} fill="#e88a5e" {...line("#a8532c")} />
            <ellipse cx={0} cy={-21} rx={13} ry={2.2} fill={SOIL} />
        </g>
    );
}

function Flame() {
    return <path d="M0 -6 Q-2.5 -9 0 -13 Q2.5 -9 0 -6Z" fill="#f6b23e" {...line("#e0782a", 0.8)} />;
}

function Plate({ children }: { children?: ReactNode }) {
    return (
        <g>
            <ellipse cx={0} cy={-3} rx={18} ry={4.5} fill="#ffffff" {...line("#c9c2b6")} />
            <ellipse cx={0} cy={-3.6} rx={11} ry={2.6} fill="none" {...line("#e4ded4", 1)} />
            {children}
        </g>
    );
}

function Bowl({ fill }: { fill?: ReactNode }) {
    return (
        <g>
            {fill}
            <path d="M-16 -14 H16 Q15 0 0 0 Q-15 0 -16 -14Z" fill="#7cc4e8" {...line("#4a98c0")} />
            <path d="M-12 -8 Q0 -5 12 -8" fill="none" stroke="#ffffff" strokeWidth={1.4} opacity={0.6} />
        </g>
    );
}

const DRAWINGS: Record<DrawId, (tone?: string) => ReactNode> = {
    // ── Kiša, napolju ────────────────────────────────────────────────────────
    umbrella: (tone = "#e8605a") => (
        <g>
            <path d="M0 -38 V-4 Q0 0 -4 0 Q-7 0 -7 -3" fill="none" {...line("#5a4a3a", 2)} />
            <path d="M-30 -38 Q-28 -64 0 -66 Q28 -64 30 -38 Q25 -42 20 -38 Q15 -42 10 -38 Q5 -42 0 -38 Q-5 -42 -10 -38 Q-15 -42 -20 -38 Q-25 -42 -30 -38Z" fill={tone} {...line("#00000040")} />
            <path d="M0 -66 Q-9 -52 -10 -38 M0 -66 Q9 -52 10 -38" fill="none" stroke="#00000030" strokeWidth={1.2} />
            <path d="M0 -66 V-70" {...line("#5a4a3a", 2)} />
        </g>
    ),
    boots: (tone = "#f2c230") => (
        <g>
            {[-9, 9].map((x) => (
                <g key={x} transform={`translate(${x} 0)`}>
                    <path d="M-6 -24 H4 V-8 Q10 -7 11 -3 V0 H-6Z" fill={tone} {...line("#b88a10")} />
                    <rect x={-7} y={-26} width={12} height={4} rx={1.5} fill={tone} {...line("#b88a10")} />
                </g>
            ))}
        </g>
    ),
    splash: () => (
        <g fill={WATER} stroke="#3f8fc0" strokeWidth={0.8}>
            <path d="M-14 -2 Q-18 -14 -12 -20 Q-10 -10 -6 -4Z" />
            <path d="M14 -2 Q18 -14 12 -20 Q10 -10 6 -4Z" />
            <circle cx={-4} cy={-22} r={2.4} />
            <circle cx={5} cy={-26} r={2} />
            <circle cx={0} cy={-16} r={2.6} />
            <circle cx={-20} cy={-24} r={1.8} />
            <circle cx={20} cy={-25} r={1.8} />
        </g>
    ),
    crosswalk: () => (
        <g>
            <rect x={-60} y={-14} width={120} height={14} fill="#6b7280" />
            {[-50, -30, -10, 10, 30, 50].map((x) => (
                <rect key={x} x={x - 6} y={-13} width={12} height={12} fill="#ffffff" />
            ))}
        </g>
    ),
    trafficRed: () => <TrafficLight green={false} />,
    trafficGreen: () => <TrafficLight green />,
    house: () => (
        <g>
            <rect x={-26} y={-34} width={52} height={34} fill="#f6d9a8" {...line("#c99a5a")} />
            <path d="M-32 -32 L0 -56 L32 -32Z" fill="#e8605a" {...line("#a8403a")} />
            <rect x={-8} y={-22} width={16} height={22} rx={1} fill="#b07a4a" {...line("#8f5d34")} />
            <circle cx={5} cy={-11} r={1.3} fill="#f6d84a" />
            <rect x={-21} y={-26} width={10} height={9} fill="#bfe3f6" {...line("#8fb8d0", 1)} />
            <rect x={11} y={-26} width={10} height={9} fill="#bfe3f6" {...line("#8fb8d0", 1)} />
        </g>
    ),
    mailbox: () => (
        <g>
            <rect x={-2} y={-24} width={4} height={24} fill="#8a8a96" />
            <path d="M-12 -24 V-40 Q-12 -46 -6 -46 H6 Q12 -46 12 -40 V-24Z" fill="#f6c230" {...line("#b88a10")} />
            <rect x={-7} y={-40} width={14} height={2.6} rx={1.2} fill="#3b3f52" />
            <path d="M-6 -32 H6" stroke="#b88a10" strokeWidth={1.2} />
        </g>
    ),
    // ── Kupatilo ──────────────────────────────────────────────────────────────
    soap: (tone = "#f29ec0") => (
        <g>
            <rect x={-9} y={-8} width={18} height={8} rx={3.5} fill={tone} {...line("#c86a92")} />
            <path d="M-5 -5.5 H3" stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
        </g>
    ),
    toothpaste: () => (
        <g>
            <path d="M-14 -4 L10 -7 L10 -1 L-14 -2 Q-16 -3 -14 -4Z" fill="#ffffff" {...line("#9aa6b2", 1)} />
            <path d="M-14 -5 L10 -8 L10 0 L-14 -1Z" fill="#ffffff" {...line("#9aa6b2", 1)} />
            <rect x={-6} y={-6.5} width={8} height={4.5} fill="#4d9be8" transform="rotate(-4)" />
            <rect x={10} y={-6.5} width={4} height={5} rx={1} fill="#e8605a" />
        </g>
    ),
    brushPaste: () => (
        <g>
            <rect x={-22} y={-3.4} width={30} height={3.4} rx={1.7} fill="#4d9be8" />
            <rect x={6} y={-4.6} width={12} height={4.6} rx={1} fill="#ffffff" {...line("#9aa6b2", 0.8)} />
            <path d="M7 -4.6 Q9 -9 12 -8 Q15 -10 17 -6 Q18 -4.6 17 -4.6Z" fill="#e6f6ff" {...line("#6cc0e8", 0.8)} />
            <path d="M9 -6 Q12 -7 15 -6" fill="none" stroke="#e8605a" strokeWidth={0.9} />
        </g>
    ),
    bathtub: () => (
        <g>
            <path d="M-46 -26 H46 V-12 Q46 0 34 0 H-34 Q-46 0 -46 -12Z" fill="#ffffff" {...line("#b9c6d4", 2)} />
            <path d="M-43 -24 H43 V-20 H-43Z" fill={WATER} opacity={0.8} />
            <g fill="#ffffff" stroke="#b9dcef" strokeWidth={1}>
                <circle cx={-30} cy={-27} r={4} />
                <circle cx={-22} cy={-29} r={5} />
                <circle cx={18} cy={-28} r={4.5} />
                <circle cx={27} cy={-27} r={3.5} />
            </g>
            <path d="M-36 0 V4 M36 0 V4" {...line("#9aa6b2", 3)} />
        </g>
    ),
    bathtubEmpty: () => (
        <g>
            <path d="M-46 -26 H46 V-12 Q46 0 34 0 H-34 Q-46 0 -46 -12Z" fill="#ffffff" {...line("#b9c6d4", 2)} />
            <path d="M-36 0 V4 M36 0 V4" {...line("#9aa6b2", 3)} />
        </g>
    ),
    tapWater: () => (
        <g>
            <path d="M-10 -40 V-46 H8 V-38" fill="none" {...line("#9aa6b2", 3.4)} />
            <rect x={-5} y={-50} width={6} height={4} rx={1} fill="#9aa6b2" />
            <path d="M8 -36 Q9 -18 7 0 M10 -36 Q12 -18 11 0" fill="none" stroke={WATER} strokeWidth={2.4} strokeLinecap="round" opacity={0.9} />
        </g>
    ),
    sponge: () => (
        <g>
            <rect x={-9} y={-9} width={18} height={9} rx={2} fill="#f6d84a" {...line("#c9a42a", 1)} />
            <rect x={-9} y={-11} width={18} height={4} rx={1.5} fill="#3fae6a" />
        </g>
    ),
    dishCloth: () => (
        <g>
            <path d="M-12 -18 H12 L10 0 H-10Z" fill="#ffffff" {...line("#9aa6b2", 1)} />
            <path d="M-11 -12 H11 M-10.5 -6 H10.5 M-6 -18 L-5 0 M0 -18 V0 M6 -18 L5 0" stroke="#e8605a" strokeWidth={1.4} opacity={0.75} />
        </g>
    ),
    plateDirty: () => (
        <Plate>
            <ellipse cx={-5} cy={-4} rx={4} ry={1.6} fill="#c98a42" opacity={0.8} />
            <circle cx={5} cy={-3.4} r={1.2} fill="#c98a42" />
            <circle cx={8} cy={-4.6} r={0.9} fill="#c98a42" />
            <path d="M-2 -3 Q2 -5 4 -2.6" fill="none" stroke="#e8605a" strokeWidth={1.2} opacity={0.7} />
        </Plate>
    ),
    plateClean: () => (
        <g>
            <Plate />
            <path d="M-12 -12 L-10 -9 M12 -13 L10.5 -10 M0 -15 V-11" {...line("#f6c230", 1.4)} />
        </g>
    ),

    // ── Kuhinja ───────────────────────────────────────────────────────────────
    breadSlice: () => (
        <g>
            <path d="M-11 0 V-16 Q-15 -17 -15 -22 Q-14 -28 -6 -28 Q0 -31 6 -28 Q14 -28 15 -22 Q15 -17 11 -16 V0Z" fill="#c9843a" />
            <path d="M-9 -2 V-16 Q-12 -18 -12 -22 Q-11 -26 -5 -26 Q0 -28.5 5 -26 Q11 -26 12 -22 Q12 -18 9 -16 V-2Z" fill="#f6e2b8" />
        </g>
    ),
    breadButter: () => (
        <g>
            <path d="M-11 0 V-16 Q-15 -17 -15 -22 Q-14 -28 -6 -28 Q0 -31 6 -28 Q14 -28 15 -22 Q15 -17 11 -16 V0Z" fill="#c9843a" />
            <path d="M-9 -2 V-16 Q-12 -18 -12 -22 Q-11 -26 -5 -26 Q0 -28.5 5 -26 Q11 -26 12 -22 Q12 -18 9 -16 V-2Z" fill="#f6e2b8" />
            <path d="M-8 -6 V-16 Q-10 -19 -9 -22 Q-4 -24 0 -23 Q6 -25 9 -21 Q9 -16 8 -14 V-6 Q0 -4 -8 -6Z" fill="#f6d84a" opacity={0.9} />
        </g>
    ),
    knife: () => (
        <g>
            <rect x={-16} y={-3.6} width={12} height={3.6} rx={1.6} fill="#8f5d34" />
            <path d="M-4 -3.4 H14 Q17 -3 16 0 H-4Z" fill="#d4dae2" {...line("#9aa6b2", 0.8)} />
            <path d="M6 -3.6 Q10 -6 14 -4" fill="none" stroke="#f6d84a" strokeWidth={2.2} strokeLinecap="round" />
        </g>
    ),
    sandwich: () => (
        <g>
            <path d="M-16 -1 Q-17 -6 -14 -7 H14 Q17 -6 16 -1Z" fill="#e3a65a" {...line("#b9793a", 1)} />
            <path d="M-16 -9 Q-8 -6 0 -9 Q8 -6 16 -9 L15 -7 H-15Z" fill="#6cc06a" />
            <rect x={-15} y={-12} width={30} height={3} fill="#f6d84a" />
            <path d="M-15 -12 Q-17 -20 -6 -21 H6 Q17 -20 15 -12Z" fill="#e3a65a" {...line("#b9793a", 1)} />
        </g>
    ),
    eggCrack: () => (
        <g>
            <path d="M-11 -14 Q-12 -24 -6 -26 L-4 -22 L-1 -25 L1 -21 Q-4 -12 -11 -14Z" fill="#fbf3e4" {...line("#c9b89a", 1)} />
            <path d="M11 -14 Q12 -24 6 -26 L4 -22 L1 -24 L0 -21 Q4 -12 11 -14Z" fill="#fbf3e4" {...line("#c9b89a", 1)} />
            <path d="M0 -18 Q-2 -12 0 -8 Q2 -12 0 -18Z" fill="#ffffff" opacity={0.85} />
            <circle cx={0} cy={-6} r={3.6} fill="#f6b23e" {...line("#e0942a", 0.8)} />
        </g>
    ),
    bowl: () => <Bowl />,
    batter: () => (
        <g>
            <path d="M6 -26 L-2 -8" {...line("#b07a4a", 2.6)} />
            <Bowl fill={<ellipse cx={0} cy={-14} rx={15} ry={4} fill="#f6dc8a" {...line("#d9b45a", 1)} />} />
            <path d="M-8 -14 Q-2 -17 4 -14 Q8 -12 10 -14" fill="none" stroke="#d9b45a" strokeWidth={1.2} />
        </g>
    ),
    panEgg: () => (
        <Pan>
            <path d="M-12 -7 Q-14 -11 -8 -12 Q-4 -15 2 -12 Q10 -13 10 -9 Q12 -6 4 -5.5 Q-6 -4 -12 -7Z" fill="#ffffff" {...line("#e0d8c8", 0.8)} />
            <circle cx={-1} cy={-9} r={3.6} fill="#f6b23e" />
        </Pan>
    ),
    panPancake: () => (
        <Pan>
            <ellipse cx={0} cy={-8} rx={11} ry={3.4} fill="#e8b46a" {...line("#c98a42", 1)} />
        </Pan>
    ),
    ovenCake: () => (
        <Oven>
            <path d="M-9 -15 H9 V-11 H-9Z" fill="#c98a42" />
            <path d="M-8 -19 Q0 -24 8 -19 V-15 H-8Z" fill="#e8b46a" />
        </Oven>
    ),
    cakeSlice: () => (
        <Plate>
            <path d="M-8 -5 L10 -6 L10 -16 L-8 -11Z" fill="#f6e2b8" {...line("#c9a46a", 1)} />
            <path d="M-8 -11 L10 -16 L10 -19 L-8 -14Z" fill="#f29ec0" {...line("#c86a92", 1)} />
            <path d="M-8 -8 L10 -11" stroke="#e8605a" strokeWidth={1.2} />
            <circle cx={8} cy={-21} r={2} fill="#e8463f" />
        </Plate>
    ),
    cakeCandles: () => (
        <g>
            <ellipse cx={0} cy={-1} rx={26} ry={4} fill="#ffffff" {...line("#c9c2b6")} />
            <rect x={-20} y={-24} width={40} height={22} rx={4} fill="#f6e2b8" {...line("#c9a46a")} />
            <path d="M-20 -18 Q-15 -14 -10 -18 Q-5 -14 0 -18 Q5 -14 10 -18 Q15 -14 20 -18 V-22 Q20 -24 16 -24 H-16 Q-20 -24 -20 -22Z" fill="#f29ec0" />
            {[-10, 0, 10].map((x, i) => (
                <g key={x} transform={`translate(${x} -24)`}>
                    <rect x={-1.6} y={-10} width={3.2} height={10} rx={1} fill={["#4d9be8", "#f6c230", "#3fae6a"][i]} />
                    <g transform="translate(0 -3)">
                        <Flame />
                    </g>
                </g>
            ))}
        </g>
    ),
    juiceOpen: () => (
        <g>
            <rect x={-7} y={-26} width={14} height={26} rx={3} fill="#f6a23e" {...line("#c9741a")} />
            <rect x={-3} y={-29} width={6} height={3} fill="#e6eef3" />
            <circle cx={0} cy={-13} r={4} fill="#ffcf5a" />
        </g>
    ),
    bottleCap: () => <rect x={-4} y={-5} width={8} height={5} rx={1} fill="#3fae6a" />,
    cerealBox: () => (
        <g>
            <rect x={-12} y={-36} width={24} height={36} rx={2} fill="#4d9be8" {...line("#2f6fb0")} />
            <ellipse cx={0} cy={-16} rx={8} ry={5} fill="#ffffff" />
            {[-4, 0, 4].map((x) => (
                <circle key={x} cx={x} cy={-17} r={1.8} fill="#e8b46a" />
            ))}
            <rect x={-9} y={-32} width={18} height={6} rx={1.5} fill="#f6c230" />
        </g>
    ),
    cerealBowl: () => (
        <g>
            <path d="M-6 -24 L2 -12" {...line("#9aa6b2", 2.4)} />
            <Bowl
                fill={
                    <g>
                        <ellipse cx={0} cy={-14} rx={15} ry={4} fill="#ffffff" {...line("#d4dae2", 1)} />
                        {[-9, -4, 1, 6, 10, -6, 4].map((x, i) => (
                            <circle key={i} cx={x} cy={-15 + (i % 2) * 1.8} r={1.9} fill="#e8b46a" {...line("#c98a42", 0.5)} />
                        ))}
                    </g>
                }
            />
        </g>
    ),
    honeyJar: () => (
        <g>
            <rect x={-8} y={-16} width={16} height={16} rx={4} fill="#f6b23e" {...line("#c9741a")} />
            <rect x={-7} y={-19} width={14} height={4} rx={1} fill="#e8605a" />
        </g>
    ),
    tableLamp: () => <TableLamp on={false} />,
    tableLampOn: () => <TableLamp on />,
    catFood: () => (
        <g>
            <path d="M-10 0 V-26 L-7 -30 H7 L10 -26 V0Z" fill="#e8605a" {...line("#a8403a")} />
            <ellipse cx={0} cy={-15} rx={6} ry={4.5} fill="#ffffff" />
            <path d="M-3 -16 L-4 -19 L-1 -17 M3 -16 L4 -19 L1 -17" stroke="#3b3f52" strokeWidth={1} fill="none" />
            <circle cx={0} cy={-14} r={1.2} fill="#3b3f52" />
        </g>
    ),
    catBowl: () => (
        <g>
            <path d="M-12 -7 H12 L9 0 H-9Z" fill="#8a6ee8" {...line("#5f48b8")} />
        </g>
    ),
    catBowlFull: () => (
        <g>
            {[-7, -3, 1, 5, 8, -5, 3].map((x, i) => (
                <circle key={i} cx={x} cy={-8 - (i % 3) * 1.4} r={2} fill="#b07a4a" {...line("#8f5d34", 0.5)} />
            ))}
            <path d="M-12 -7 H12 L9 0 H-9Z" fill="#8a6ee8" {...line("#5f48b8")} />
        </g>
    ),

    // ── Bašta ─────────────────────────────────────────────────────────────────
    seeds: () => (
        <g fill="#8a5a2a">
            <ellipse cx={-3} cy={-14} rx={1.4} ry={2} />
            <ellipse cx={2} cy={-8} rx={1.4} ry={2} />
            <ellipse cx={-1} cy={-2} rx={1.4} ry={2} />
        </g>
    ),
    pot: () => <Pot />,
    potFlower: (tone = "#f6c230") => (
        <Pot>
            <path d="M0 -21 V-44" {...line("#3fae6a", 2)} />
            <path d="M0 -30 Q-8 -34 -10 -29 Q-5 -26 0 -30Z M0 -34 Q8 -38 10 -33 Q5 -30 0 -34Z" fill="#6cc06a" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse key={a} cx={0} cy={-51} rx={3.4} ry={6} fill={tone} transform={`rotate(${a} 0 -46)`} />
            ))}
            <circle cx={0} cy={-46} r={3.6} fill="#a8532c" />
        </Pot>
    ),
    wateringCan: (tone = "#3fae6a") => (
        <g>
            <path d="M-14 -24 Q-24 -24 -22 -14 Q-20 -8 -14 -8" fill="none" {...line(tone, 3)} />
            <rect x={-14} y={-26} width={22} height={24} rx={4} fill={tone} {...line("#00000040")} />
            <path d="M8 -14 L24 -28" {...line(tone, 4)} />
            <rect x={21} y={-32} width={7} height={6} rx={1.5} fill={tone} transform="rotate(-40 24 -29)" />
        </g>
    ),
    pour: () => (
        <g fill={WATER}>
            {[
                [0, 0],
                [3, 7],
                [-2, 12],
                [4, 17],
                [0, 22],
                [-4, 5],
                [6, 11],
            ].map(([x, y], i) => (
                <path key={i} d={`M${x} ${y - 4} Q${x - 1.6} ${y - 1} ${x} ${y} Q${x + 1.6} ${y - 1} ${x} ${y - 4}Z`} />
            ))}
        </g>
    ),
    shovel: () => (
        <g>
            <path d="M0 -40 V-12" {...line("#b07a4a", 2.6)} />
            <path d="M-4 -42 H4" {...line("#b07a4a", 2.6)} />
            <path d="M-6 -12 H6 V-4 Q6 2 0 4 Q-6 2 -6 -4Z" fill="#9aa6b2" {...line("#6f7a86")} />
        </g>
    ),
    hole: () => (
        <g>
            <path d="M-28 0 Q-26 -9 -16 -8 Q-12 -14 -6 -6 H6 Q12 -14 16 -8 Q26 -9 28 0Z" fill={SOIL} {...line(SOIL_DARK, 1)} />
            <ellipse cx={0} cy={-3} rx={9} ry={3} fill="#3a2414" />
        </g>
    ),
    mound: () => <path d="M-22 0 Q-14 -10 0 -10 Q14 -10 22 0Z" fill={SOIL} {...line(SOIL_DARK, 1)} />,

    // ── Igra i stvari ─────────────────────────────────────────────────────────
    balloonSmall: (tone = "#e8605a") => (
        <g>
            <ellipse cx={11} cy={-6} rx={10} ry={8} fill={tone} {...line("#00000033")} />
            <path d="M0 -6 L-2 -8 V-4Z" fill={tone} />
            <ellipse cx={14} cy={-9} rx={3} ry={2} fill="#ffffff" opacity={0.45} />
        </g>
    ),
    bubbleWand: () => (
        <g>
            <path d="M0 0 V-22" {...line("#e8605a", 2)} />
            <circle cx={0} cy={-27} r={5} fill="#dff1fb" fillOpacity={0.5} {...line("#e8605a", 1.8)} />
        </g>
    ),
    bubbleBottle: () => (
        <g>
            <path d="M-6 0 V-16 Q-6 -20 -3 -21 V-25 H3 V-21 Q6 -20 6 -16 V0Z" fill="#bfe3f6" {...line("#6cc0e8")} />
            <rect x={-6} y={-12} width={12} height={6} fill="#f29ec0" />
        </g>
    ),
    tower: () => (
        <g>
            {["#e8605a", "#4d9be8", "#f6c230", "#3fae6a", "#8a6ee8", "#f6862e"].map((color, i) => (
                <rect key={i} x={-8 + (i % 2) * 1.5} y={-12 - i * 12} width={16} height={12} rx={1.5} fill={color} {...line("#00000033", 1)} />
            ))}
        </g>
    ),
    puzzleDone: () => (
        <g>
            <rect x={-26} y={-30} width={52} height={30} rx={2} fill="#bfe3f6" {...line("#6f7a86", 1.4)} />
            <path d="M-26 -10 Q-12 -22 0 -12 Q12 -4 26 -14 V0 H-26Z" fill="#6cc06a" />
            <circle cx={14} cy={-22} r={4.5} fill="#f6c230" />
            <path d="M0 -30 V-24 Q4 -22 0 -19 V0 M-26 -15 H-15 Q-13 -11 -10 -15 H26" fill="none" stroke="#6f7a86" strokeWidth={1} opacity={0.7} />
        </g>
    ),
    pajamas: () => (
        <g>
            <path d="M-12 0 V-22 L-20 -16 L-24 -22 L-12 -32 H-5 Q0 -28 5 -32 H12 L24 -22 L20 -16 L12 -22 V0Z" fill="#8fb8f0" {...line("#5f8fcf")} />
            <g fill="#ffffff">
                <circle cx={-5} cy={-20} r={1.6} />
                <circle cx={5} cy={-12} r={1.6} />
                <circle cx={-4} cy={-6} r={1.6} />
                <circle cx={6} cy={-25} r={1.6} />
            </g>
        </g>
    ),
    zipper: () => (
        <g>
            <path d="M0 0 V-24" stroke="#cfd6de" strokeWidth={2} strokeDasharray="1.6 1.4" />
            <rect x={-2} y={-13} width={4} height={6} rx={1} fill="#9aa6b2" />
        </g>
    ),
    snowBall: () => <circle cx={0} cy={-10} r={10} fill="#ffffff" {...line("#c9d6e6", 1.4)} />,
    carrotNose: () => <path d="M0 -2 L14 0 L0 2Z" fill="#f6862e" {...line("#c95a1a", 0.8)} />,
    paperHouse: () => (
        <g>
            <rect x={-18} y={-26} width={36} height={26} fill="#ffffff" {...line("#c9c2b6", 1)} />
            <path d="M-9 -4 V-14 H9 V-4Z M-11 -14 L0 -22 L11 -14" fill="none" stroke="#3b3f52" strokeWidth={1.2} strokeLinejoin="round" />
        </g>
    ),
    paperHouseColor: () => (
        <g>
            <rect x={-18} y={-26} width={36} height={26} fill="#ffffff" {...line("#c9c2b6", 1)} />
            <path d="M-9 -4 V-14 H9 V-4Z" fill="#f6c230" stroke="#3b3f52" strokeWidth={1.2} />
            <path d="M-11 -14 L0 -22 L11 -14Z" fill="#e8605a" stroke="#3b3f52" strokeWidth={1.2} strokeLinejoin="round" />
            <rect x={-2} y={-10} width={4} height={6} fill="#4d9be8" />
            <circle cx={12} cy={-21} r={3} fill="#f6b23e" />
            <path d="M-18 -3 H18" stroke="#6cc06a" strokeWidth={2} />
        </g>
    ),
    letter: () => (
        <g>
            <rect x={-12} y={-30} width={24} height={30} fill="#ffffff" {...line("#c9c2b6", 1)} />
            <path d="M-8 -24 H8 M-8 -19 H6 M-8 -14 H8 M-8 -9 H3" stroke="#4d9be8" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M3 -5 Q5 -8 7 -5 Q9 -8 11 -5 L7 -1Z" fill="#e8605a" />
        </g>
    ),
    list: () => (
        <g>
            <rect x={-10} y={-28} width={20} height={28} rx={1} fill="#fffbe6" {...line("#c9c2b6", 1)} />
            {[-22, -16, -10, -4].map((y) => (
                <g key={y}>
                    <circle cx={-6} cy={y} r={1.2} fill="#3b3f52" />
                    <path d={`M-3 ${y} H6`} stroke="#3b3f52" strokeWidth={1.1} strokeLinecap="round" />
                </g>
            ))}
        </g>
    ),
    coin: () => (
        <g>
            <circle cx={0} cy={-5} r={5} fill="#f6c230" {...line("#c9941a", 1)} />
            <circle cx={0} cy={-5} r={2.6} fill="none" stroke="#c9941a" strokeWidth={0.8} />
        </g>
    ),
    fruitBag: () => (
        <g>
            <circle cx={-7} cy={-24} r={5} fill="#e8463f" />
            <circle cx={3} cy={-26} r={5} fill="#f6a23e" />
            <path d="M-6 -30 Q0 -40 6 -30" fill="none" {...line("#c9a46a", 1.6)} />
            <path d="M-13 -22 H13 L11 0 H-11Z" fill="#f2e6cf" {...line("#c9a46a")} />
        </g>
    ),
    cakeSmoke: () => (
        <g>
            <ellipse cx={0} cy={-1} rx={26} ry={4} fill="#ffffff" {...line("#c9c2b6")} />
            <rect x={-20} y={-24} width={40} height={22} rx={4} fill="#f6e2b8" {...line("#c9a46a")} />
            <path d="M-20 -18 Q-15 -14 -10 -18 Q-5 -14 0 -18 Q5 -14 10 -18 Q15 -14 20 -18 V-22 Q20 -24 16 -24 H-16 Q-20 -24 -20 -22Z" fill="#f29ec0" />
            {[-10, 0, 10].map((x, i) => (
                <g key={x} transform={`translate(${x} -24)`}>
                    <rect x={-1.6} y={-10} width={3.2} height={10} rx={1} fill={["#4d9be8", "#f6c230", "#3fae6a"][i]} />
                    <path d="M0 -11 Q-3 -15 0 -18 Q3 -21 0 -25" fill="none" stroke="#b9bcc8" strokeWidth={1.4} strokeLinecap="round" />
                </g>
            ))}
        </g>
    ),
    blow: () => (
        <g fill="none" stroke="#9ac4dc" strokeWidth={1.6} strokeLinecap="round">
            <path d="M0 -6 Q6 -9 12 -6" />
            <path d="M0 0 Q7 -2 14 1" />
            <path d="M0 6 Q6 8 12 5" />
        </g>
    ),
    milkPour: () => (
        <g>
            <path d="M14 -30 Q16 -16 15 0" fill="none" stroke="#ffffff" strokeWidth={3.2} strokeLinecap="round" />
            <path d="M14 -30 Q16 -16 15 0" fill="none" stroke="#d4dae2" strokeWidth={0.8} strokeLinecap="round" opacity={0.8} />
            <g transform="translate(0 -40) rotate(70)">
                <path d="M-6 -22 L0 -27 L6 -22 V0 H-6Z" fill="#ffffff" stroke="#9ac4dc" strokeWidth={1.5} strokeLinejoin="round" />
                <rect x={-6} y={-16} width={12} height={8} fill="#6cc0e8" />
            </g>
        </g>
    ),
    basin: () => (
        <g>
            <path d="M-96 -44 H96 Q92 -6 50 0 H-50 Q-92 -6 -96 -44Z" fill="#ffffff" {...line("#b9c6d4", 2)} />
            <path d="M-90 -40 H90" stroke="#dfe6ee" strokeWidth={3} />
            <ellipse cx={0} cy={-22} rx={6} ry={2.4} fill="#9aa6b2" />
        </g>
    ),
    tap: () => (
        <g>
            <rect x={-8} y={-30} width={16} height={30} rx={3} fill="#c9d0da" {...line("#8a96a4")} />
            <path d="M0 -24 H-34 Q-40 -24 -40 -18 V-12" fill="none" stroke="#c9d0da" strokeWidth={9} strokeLinecap="round" />
            <path d="M0 -24 H-34 Q-40 -24 -40 -18 V-12" fill="none" stroke="#8a96a4" strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
            <path d="M0 -30 L16 -42" {...line("#8a96a4", 5)} />
            <circle cx={16} cy={-42} r={3.6} fill="#e8605a" />
        </g>
    ),
    hand: (tone = "#f4c7a1") => (
        <g>
            <path d="M-7 0 V-14 Q-7 -20 -4 -20 Q-2 -20 -2 -16 V-20 Q-2 -24 1 -24 Q4 -24 4 -20 V-18 Q4 -21 7 -21 Q9 -21 9 -17 V-6 Q9 0 3 0Z" fill={tone} {...line("#c98e6a", 1.2)} />
            <path d="M-7 -10 Q-12 -14 -12 -9 Q-11 -5 -7 -3" fill={tone} {...line("#c98e6a", 1.2)} />
            <path d="M-6 0 H8 V6 H-6Z" fill="#8a6ee8" />
        </g>
    ),
    hands: (tone = "#f4c7a1") => (
        <g>
            <g transform="translate(-9 0) rotate(-14)">
                <path d="M-8 4 V-14 Q-8 -22 -2 -22 H4 Q9 -22 9 -14 V4Z" fill={tone} {...line("#c98e6a", 1.2)} />
                <path d="M-8 -8 Q-14 -12 -14 -6 Q-13 -2 -8 0" fill={tone} {...line("#c98e6a", 1.2)} />
            </g>
            <g transform="translate(9 0) rotate(14) scale(-1 1)">
                <path d="M-8 4 V-14 Q-8 -22 -2 -22 H4 Q9 -22 9 -14 V4Z" fill={tone} {...line("#c98e6a", 1.2)} />
                <path d="M-8 -8 Q-14 -12 -14 -6 Q-13 -2 -8 0" fill={tone} {...line("#c98e6a", 1.2)} />
            </g>
            <path d="M-20 4 H-2 V14 H-20Z M2 4 H20 V14 H2Z" fill="#8a6ee8" />
        </g>
    ),
    bigStream: () => (
        <g fill="none" strokeLinecap="round">
            <path d="M0 -50 Q2 -25 0 0" stroke={WATER} strokeWidth={7} opacity={0.85} />
            <path d="M-1.5 -46 Q0 -25 -1.5 -4" stroke="#ffffff" strokeWidth={1.4} opacity={0.7} />
        </g>
    ),
    block: (tone = "#e8605a") => (
        <g>
            <rect x={-6} y={-12} width={12} height={12} rx={1.5} fill={tone} {...line("#00000033", 1)} />
            <rect x={-3} y={-9} width={6} height={6} rx={1} fill="#ffffff" opacity={0.35} />
        </g>
    ),
    juiceGlass: () => (
        <g>
            <path d="M-6 -18 H6 L5 0 H-5Z" fill="#fff6e6" {...line("#e0b07a")} />
            <path d="M-5.6 -13 H5.6 L5 0 H-5Z" fill="#f6a23e" opacity={0.9} />
        </g>
    ),
    tshirt: (tone = "#f6c230") => (
        <path d="M-12 0 V-22 L-20 -16 L-24 -22 L-12 -32 H-5 Q0 -28 5 -32 H12 L24 -22 L20 -16 L12 -22 V0Z" fill={tone} {...line("#00000040")} />
    ),
    jacket: () => (
        <g>
            <path d="M-12 0 V-22 L-18 -6 L-24 -8 L-14 -32 H-5 Q0 -27 5 -32 H14 L24 -8 L18 -6 L12 -22 V0Z" fill="#2f8f6f" {...line("#1f5f4a")} />
            <path d="M0 -29 V0" stroke="#1f5f4a" strokeWidth={1.2} />
            <path d="M-8 -12 H-3 M3 -12 H8" stroke="#1f5f4a" strokeWidth={1.2} />
        </g>
    ),
    flower: (tone = "#e8605a") => (
        <g>
            <path d="M0 0 V-26" {...line("#3fae6a", 2)} />
            <path d="M0 -10 Q-8 -14 -10 -9 Q-5 -6 0 -10Z M0 -14 Q8 -18 10 -13 Q5 -10 0 -14Z" fill="#6cc06a" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse key={a} cx={0} cy={-33} rx={3.4} ry={6} fill={tone} transform={`rotate(${a} 0 -28)`} />
            ))}
            <circle cx={0} cy={-28} r={3.6} fill="#f6c230" />
        </g>
    ),
    dough: () => <ellipse cx={0} cy={-3} rx={22} ry={5.5} fill="#f6e2b8" {...line("#d9b98a")} />,
    rollingPin: () => (
        <g>
            <rect x={-16} y={-7} width={32} height={7} rx={3.5} fill="#e3b06a" {...line("#a8783a", 1)} />
            <rect x={-24} y={-5} width={8} height={3} rx={1.5} fill="#b07a4a" />
            <rect x={16} y={-5} width={8} height={3} rx={1.5} fill="#b07a4a" />
        </g>
    ),
    pizzaSauce: () => (
        <g>
            <ellipse cx={0} cy={-3} rx={22} ry={5.5} fill="#f6e2b8" {...line("#d9b98a")} />
            <ellipse cx={0} cy={-3.4} rx={18} ry={4.2} fill="#e8463f" />
        </g>
    ),
    pizzaCheese: () => <PizzaTop />,
    ovenPizza: () => (
        <Oven>
            <g transform="translate(0 -12) scale(0.55)">
                <PizzaTop baked />
            </g>
        </Oven>
    ),
    pizzaSlice: () => (
        <Plate>
            <path d="M-12 -6 L12 -8 L0 -20Z" fill="#f6d84a" {...line("#d9a84a", 1)} />
            <path d="M-12 -6 L12 -8 L11 -5 L-12 -3.6Z" fill="#e3a65a" />
            <circle cx={-1} cy={-11} r={1.8} fill="#e8463f" />
            <circle cx={4} cy={-9} r={1.5} fill="#e8463f" />
        </Plate>
    ),
    sticker: () => (
        <g>
            <circle cx={0} cy={-9} r={9} fill="#ffffff" {...line("#c9c2b6", 1)} />
            <path d="M0 -15 L1.8 -11 L6 -10.6 L2.8 -7.8 L3.7 -3.6 L0 -5.8 L-3.7 -3.6 L-2.8 -7.8 L-6 -10.6 L-1.8 -11Z" fill="#f6c230" />
        </g>
    ),
};

function TrafficLight({ green }: { green: boolean }) {
    return (
        <g>
            <rect x={-2} y={-34} width={4} height={34} fill="#6b7280" />
            <rect x={-8} y={-62} width={16} height={30} rx={4} fill="#3b3f52" />
            <circle cx={0} cy={-54} r={5} fill={green ? "#5a4446" : "#ff4d4d"} />
            <circle cx={0} cy={-40} r={5} fill={green ? "#3ddc6a" : "#2f4a3a"} />
            {/* Na zelenom svetlu je čovečić koji hoda, na crvenom onaj koji stoji */}
            {green ? <path d="M0 -43 V-39 M-2 -37 L0 -39 L2 -37" stroke="#ffffff" strokeWidth={1} fill="none" /> : <path d="M0 -57 V-51" stroke="#ffffff" strokeWidth={1.2} />}
        </g>
    );
}

function PizzaTop({ baked = false }: { baked?: boolean }) {
    return (
        <g>
            <ellipse cx={0} cy={-3} rx={22} ry={5.5} fill={baked ? "#e3a65a" : "#f6e2b8"} {...line("#d9b98a")} />
            <ellipse cx={0} cy={-3.4} rx={18} ry={4.2} fill="#e8463f" />
            <path d="M-15 -4 Q-10 -7 -4 -5 Q2 -8 8 -5 Q13 -7 16 -3.6 Q8 -1 0 -1.6 Q-9 -1 -15 -4Z" fill={baked ? "#f6c230" : "#fff3b0"} />
            {baked && (
                <g fill="#e8463f">
                    <circle cx={-8} cy={-4} r={1.6} />
                    <circle cx={5} cy={-3} r={1.6} />
                </g>
            )}
        </g>
    );
}

function Pan({ children }: { children?: ReactNode }) {
    return (
        <g>
            <path d="M14 -6 L34 -10" {...line("#3b3f52", 3.4)} />
            <ellipse cx={0} cy={-5} rx={16} ry={5} fill="#3b3f52" />
            <ellipse cx={0} cy={-6.4} rx={13} ry={3.6} fill="#5b6075" />
            {children}
        </g>
    );
}

function Oven({ children }: { children?: ReactNode }) {
    return (
        <g>
            <rect x={-22} y={-40} width={44} height={40} rx={3} fill="#f2f2f4" {...line("#b9bcc8")} />
            <rect x={-16} y={-30} width={32} height={22} rx={3} fill="#3b3f52" />
            <rect x={-14} y={-28} width={28} height={18} rx={2} fill="#f6a23e" opacity={0.55} />
            {children}
            <rect x={-12} y={-34} width={24} height={2} rx={1} fill="#9aa6b2" />
            {[-12, -4, 4, 12].map((x) => (
                <circle key={x} cx={x} cy={-37} r={1.6} fill="#9aa6b2" />
            ))}
        </g>
    );
}

function TableLamp({ on }: { on: boolean }) {
    return (
        <g>
            {on && <circle cx={0} cy={-26} r={22} fill="#fff1a8" opacity={0.55} />}
            <rect x={-8} y={-3} width={16} height={3} rx={1.5} fill="#8a8a96" />
            <path d="M0 -3 V-20" {...line("#8a8a96", 2)} />
            <path d="M-11 -20 L-7 -34 H7 L11 -20Z" fill={on ? "#fff6c8" : "#e8d7a8"} {...line(on ? "#e0b84a" : "#b9a878")} />
            {on && <path d="M-14 -14 L-19 -9 M0 -14 V-8 M14 -14 L19 -9" {...line("#f6c230", 1.6)} />}
        </g>
    );
}

export function Drawing({ id, tone }: { id: DrawId; tone?: string }) {
    return <>{DRAWINGS[id](tone)}</>;
}

export function hasDrawing(id: string): boolean {
    return Object.hasOwn(DRAWINGS, id);
}
