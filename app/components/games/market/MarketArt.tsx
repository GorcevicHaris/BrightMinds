// Crteži igre „Prodavnica”: roba sa police (u okviru 100 × 100, kao hrana u igri „Šta jede?”),
// srpski novac nacrtan jednostavno (novčići od 1, 2, 5, 10 i 20 dinara, novčanice od 50, 100 i
// 200 dinara — prepoznaju se po boji, veličini i broju, bez lica i bez kopiranja pravog
// novca), korpa i kasa sa prodavačicom Eminom (lik iz slika situacija).

import { useId, type ReactNode } from "react";
import { FOOD_ART } from "../food/foods";
import { Figure } from "../scene/figures";
import type { GoodId } from "../data/marketLevels";

const line = (color: string, width = 2) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

// ── Roba ─────────────────────────────────────────────────────────────────────

export const GOOD_ART: Record<GoodId, () => ReactNode> = {
    apple: FOOD_ART.apple,
    banana: FOOD_ART.banana,
    carrot: FOOD_ART.carrot,
    bread: () => (
        <g>
            <path d="M12 64 Q10 34 50 30 Q90 34 88 64 Q88 76 74 76 H26 Q12 76 12 64Z" fill="#d99a4e" {...line("#a8692a")} />
            <path d="M18 60 Q18 42 50 38 Q82 42 82 60" fill="none" stroke="#efc27e" strokeWidth={5} strokeLinecap="round" opacity={0.7} />
            <path d="M32 44 L38 56 M48 40 L54 54 M64 42 L70 56" {...line("#a8692a", 3)} />
        </g>
    ),
    milk: () => (
        <g>
            <path d="M32 30 L50 16 L68 30 Z" fill="#e8f1fb" {...line("#6f8fb8")} />
            <rect x={32} y={30} width={36} height={58} rx={3} fill="#ffffff" {...line("#6f8fb8")} />
            <rect x={32} y={52} width={36} height={22} fill="#4f86d8" />
            <path d="M40 40 q4 -4 8 0 q-2 4 -8 0z M54 44 q5 -3 8 1 q-4 4 -8 -1z" fill="#3b3f52" />
            <path d="M44 16 H56 V22 H44 Z" fill="#4f86d8" {...line("#3f6fb8", 1.5)} />
            <path d="M40 63 H60" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
        </g>
    ),
    yogurt: () => (
        <g>
            <path d="M28 36 H72 L66 84 Q50 88 34 84 Z" fill="#ffffff" {...line("#9aa3b8")} />
            <ellipse cx={50} cy={36} rx={23} ry={7} fill="#f07aa0" {...line("#c94f78")} />
            <path d="M31 52 H69 L67 68 H33 Z" fill="#f6b3cb" />
            <circle cx={50} cy={60} r={6} fill="#e5534b" />
            <path d="M50 54 q2 -4 5 -4" {...line("#3f8a3a", 1.6)} fill="none" />
        </g>
    ),
    juice: () => (
        <g>
            <rect x={30} y={26} width={40} height={62} rx={5} fill="#f6a33b" {...line("#c97a1a")} />
            <path d="M58 26 L64 8 L70 10" fill="none" {...line("#e5534b", 4)} />
            <circle cx={50} cy={58} r={13} fill="#ffd24a" {...line("#e0a01e")} />
            <path d="M50 45 V71 M37 58 H63 M41 49 L59 67 M59 49 L41 67" {...line("#f6a33b", 1.6)} />
            <path d="M30 36 H70" stroke="#ffffff" strokeWidth={3} opacity={0.6} />
        </g>
    ),
    cheese: () => (
        <g>
            <path d="M14 70 L82 70 L82 46 L28 34 Z" fill="#f6d84a" {...line("#c9a01e")} />
            <path d="M14 70 L28 34 L82 46" fill="none" {...line("#c9a01e")} />
            <path d="M14 70 L14 78 L82 78 L82 70" fill="#e8c43a" {...line("#c9a01e")} />
            <circle cx={40} cy={58} r={5} fill="#e0b52a" />
            <circle cx={62} cy={62} r={4} fill="#e0b52a" />
            <circle cx={58} cy={50} r={3} fill="#e0b52a" />
        </g>
    ),
    chocolate: () => (
        <g transform="rotate(-12 50 50)">
            <rect x={18} y={30} width={64} height={40} rx={4} fill="#7a4a28" {...line("#5a3418")} />
            <path d="M34 30 V70 M50 30 V70 M66 30 V70 M18 50 H82" {...line("#5a3418", 2)} />
            <rect x={52} y={26} width={34} height={48} rx={4} fill="#e5534b" {...line("#b23a33")} />
            <path d="M58 40 H80 M58 50 H76" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
        </g>
    ),
    cookie: () => (
        <g>
            <circle cx={50} cy={52} r={32} fill="#e0b070" {...line("#b07a3a")} />
            {[
                [38, 40],
                [60, 42],
                [48, 58],
                [66, 62],
                [34, 64],
            ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={4.2} fill="#5a3418" />
            ))}
        </g>
    ),
    lollipop: () => (
        <g>
            <path d="M50 58 V92" {...line("#c9b8a0", 5)} />
            <circle cx={50} cy={38} r={24} fill="#f07aa0" {...line("#c94f78")} />
            <path d="M50 38 m-4 0 a4 4 0 1 1 8 0 a8 8 0 1 1 -16 0 a12 12 0 1 1 24 0 a16 16 0 1 1 -32 0" fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
        </g>
    ),
    roll: () => (
        <g>
            <path d="M14 64 Q20 30 50 28 Q80 30 86 64 Q76 54 66 58 Q58 46 50 46 Q42 46 34 58 Q24 54 14 64Z" fill="#e0a456" {...line("#b0743a")} />
            <path d="M34 58 Q38 40 50 36 M66 58 Q62 40 50 36" fill="none" {...line("#b0743a", 1.8)} />
            <path d="M28 40 Q36 34 44 33" stroke="#f6d39a" strokeWidth={4} strokeLinecap="round" fill="none" />
        </g>
    ),
    water: () => (
        <g>
            <rect x={42} y={10} width={16} height={10} rx={2} fill="#3f8fd8" />
            <path d="M42 20 H58 L62 30 Q66 34 66 42 V84 Q66 90 60 90 H40 Q34 90 34 84 V42 Q34 34 38 30 Z" fill="#cfe9fb" {...line("#6fa8d8")} />
            <rect x={34} y={50} width={32} height={18} fill="#4fb0e8" />
            <path d="M42 59 q4 -5 8 0 t8 0" fill="none" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" />
            <path d="M40 34 V44" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
        </g>
    ),
    icecream: () => (
        <g>
            <path d="M34 50 L50 92 L66 50 Z" fill="#e8b46a" {...line("#b07a3a")} />
            <path d="M40 58 L60 58 M44 68 L56 68 M38 52 L58 80 M62 52 L44 82" {...line("#b07a3a", 1.4)} />
            <circle cx={42} cy={44} r={13} fill="#f6a6c1" {...line("#d9789c")} />
            <circle cx={58} cy={44} r={13} fill="#fff3d6" {...line("#d9c08a")} />
            <circle cx={50} cy={30} r={12} fill="#8a5a3a" {...line("#5a3418")} />
            <circle cx={50} cy={18} r={4} fill="#e5534b" />
        </g>
    ),
    pencil: () => (
        <g transform="rotate(-35 50 50)">
            <rect x={16} y={42} width={56} height={16} fill="#f6c93b" {...line("#c9962a")} />
            <path d="M72 42 L88 50 L72 58 Z" fill="#f2d6a8" {...line("#c9962a")} />
            <path d="M83 47.5 L88 50 L83 52.5 Z" fill="#3b3f52" />
            <rect x={8} y={42} width={10} height={16} rx={3} fill="#f07aa0" {...line("#c94f78")} />
            <path d="M16 50 H72" stroke="#e0b52a" strokeWidth={2} />
        </g>
    ),
    notebook: () => (
        <g>
            <rect x={24} y={16} width={54} height={70} rx={5} fill="#4d9be8" {...line("#2f6fb8")} />
            <rect x={36} y={30} width={32} height={14} rx={2} fill="#ffffff" />
            <path d="M40 36 H64" stroke="#9aa3b8" strokeWidth={2} />
            {[24, 34, 44, 54, 64, 74].map((y) => (
                <path key={y} d={`M20 ${y} H30`} {...line("#3b3f52", 2.5)} />
            ))}
        </g>
    ),
    ball: () => (
        <g>
            <circle cx={50} cy={50} r={34} fill="#e5534b" {...line("#b23a33")} />
            <path d="M18 42 Q50 54 82 42 L84 56 Q50 68 16 56 Z" fill="#ffffff" />
            <circle cx={50} cy={50} r={34} fill="none" {...line("#b23a33")} />
            <path d="M30 26 Q38 20 48 20" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.6} fill="none" />
        </g>
    ),
};

export function GoodPicture({ id, small = false, className }: { id: GoodId; small?: boolean; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
            <g transform={small ? "translate(50 58) scale(0.74) translate(-50 -50)" : undefined}>{GOOD_ART[id]()}</g>
        </svg>
    );
}

// ── Novac ────────────────────────────────────────────────────────────────────

interface CoinLook {
    r: number;
    /** Spoljni prsten i unutrašnjost (dvobojni novčići od 10 i 20 dinara) */
    ring: string;
    face: string;
    edge: string;
    ink: string;
}

const COIN_LOOK: Record<number, CoinLook> = {
    1: { r: 36, ring: "#f2cd5c", face: "#f2cd5c", edge: "#b98f22", ink: "#7a5a10" },
    2: { r: 38, ring: "#dfe3ea", face: "#dfe3ea", edge: "#8c95a6", ink: "#4a5266" },
    5: { r: 41, ring: "#e7a868", face: "#e7a868", edge: "#a86a2e", ink: "#6a3e14" },
    10: { r: 44, ring: "#dfe3ea", face: "#f2cd5c", edge: "#8c95a6", ink: "#5a4210" },
    20: { r: 47, ring: "#f2cd5c", face: "#dfe3ea", edge: "#b98f22", ink: "#3f4658" },
};

function Coin({ value }: { value: number }) {
    const look = COIN_LOOK[value] ?? COIN_LOOK[1];
    const two = look.ring !== look.face;
    const size = value >= 10 ? 30 : 34;
    return (
        <g transform="translate(50 50)">
            <circle cy={3} r={look.r} fill="#000000" opacity={0.12} />
            <circle r={look.r} fill={look.ring} stroke={look.edge} strokeWidth={3} />
            {two && <circle r={look.r * 0.68} fill={look.face} stroke={look.edge} strokeWidth={1.5} />}
            <circle r={look.r - 5} fill="none" stroke={look.edge} strokeWidth={1.2} strokeDasharray="2 3" opacity={0.7} />
            <ellipse cx={-look.r * 0.38} cy={-look.r * 0.45} rx={look.r * 0.32} ry={look.r * 0.16} fill="#ffffff" opacity={0.45} transform={`rotate(-30 ${-look.r * 0.38} ${-look.r * 0.45})`} />
            <text y={value >= 10 ? 6 : 8} textAnchor="middle" fontSize={size} fontWeight={900} fill={look.ink} fontFamily="var(--font-baloo), var(--font-nunito), sans-serif">
                {value}
            </text>
            <text y={value >= 10 ? 22 : 24} textAnchor="middle" fontSize={11} fontWeight={800} fill={look.ink} fontFamily="var(--font-nunito), sans-serif">
                din
            </text>
        </g>
    );
}

const NOTE_LOOK: Record<number, { paper: string; dark: string; light: string }> = {
    50: { paper: "#c9b3f2", dark: "#6a4cb8", light: "#e6dcfa" },
    100: { paper: "#a9c8f2", dark: "#2f5fb0", light: "#dbe8fa" },
    200: { paper: "#f2c49a", dark: "#a85a22", light: "#fae4cf" },
};

function Note({ value }: { value: number }) {
    const look = NOTE_LOOK[value] ?? NOTE_LOOK[50];
    return (
        <g>
            <rect x={2} y={4} width={156} height={84} rx={8} fill="#000000" opacity={0.12} />
            <rect x={2} y={2} width={156} height={84} rx={8} fill={look.paper} stroke={look.dark} strokeWidth={2.5} />
            <rect x={9} y={9} width={142} height={70} rx={5} fill="none" stroke={look.dark} strokeWidth={1.2} opacity={0.6} />
            <g fill="none" stroke={look.light} strokeWidth={2}>
                <path d="M12 60 q12 -10 24 0 t24 0 t24 0 t24 0 t24 0 t24 0" />
                <path d="M12 70 q12 -10 24 0 t24 0 t24 0 t24 0 t24 0 t24 0" />
            </g>
            {/* Ukras: cvet u krugu (vodeni znak), bez lica */}
            <circle cx={112} cy={40} r={22} fill={look.light} stroke={look.dark} strokeWidth={1.5} />
            <g transform="translate(112 40)" fill={look.paper} stroke={look.dark} strokeWidth={1.2}>
                {[0, 60, 120, 180, 240, 300].map((a) => (
                    <ellipse key={a} cx={0} cy={-9} rx={5} ry={9} transform={`rotate(${a})`} />
                ))}
                <circle r={4.5} fill={look.dark} />
            </g>
            <text x={16} y={42} fontSize={32} fontWeight={900} fill={look.dark} fontFamily="var(--font-baloo), var(--font-nunito), sans-serif">
                {value}
            </text>
            <text x={17} y={56} fontSize={11} fontWeight={800} letterSpacing={1} fill={look.dark} fontFamily="var(--font-nunito), sans-serif">
                DINARA
            </text>
            <text x={146} y={80} textAnchor="end" fontSize={12} fontWeight={900} fill={look.dark} fontFamily="var(--font-nunito), sans-serif">
                {value}
            </text>
        </g>
    );
}

/** Novčić (kvadrat) ili novčanica (široka) */
export function MoneyArt({ value, className }: { value: number; className?: string }) {
    const note = value >= 50;
    return (
        <svg viewBox={note ? "0 0 160 90" : "0 0 100 100"} aria-hidden="true" focusable="false" className={className}>
            {note ? <Note value={value} /> : <Coin value={value} />}
        </svg>
    );
}

// ── Korpa ────────────────────────────────────────────────────────────────────

/** Korpa (prednja strana; ono što je u njoj crta igra iznad) */
export function BasketArt({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 200 90" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false" className={className}>
            <path d="M10 20 H190 L174 84 Q172 88 166 88 H34 Q28 88 26 84 Z" fill="#d9a066" stroke="#9a6a3a" strokeWidth={3} strokeLinejoin="round" />
            <g stroke="#b07a44" strokeWidth={2.5} fill="none">
                <path d="M16 38 H184 M20 54 H180 M24 70 H176" />
                {[40, 64, 88, 112, 136, 160].map((x) => (
                    <path key={x} d={`M${x} 22 L${x - (x - 100) * 0.1} 86`} />
                ))}
            </g>
            <rect x={6} y={14} width={188} height={12} rx={6} fill="#e8b47e" stroke="#9a6a3a" strokeWidth={3} />
        </svg>
    );
}

// ── Kasa i Emina ─────────────────────────────────────────────────────────────

export const COUNTER_W = 240;
export const COUNTER_H = 132;
/** Gde na pultu stoji roba (x sredine, y donje ivice) */
export const COUNTER_TOP = 100;

/**
 * Kasa: police iza, Emina (prodavačica) iza pulta, kasa sa strane. Roba i cene se crtaju
 * preko (u istim koordinatama) — vidi `CounterGoods`.
 */
export function CashierArt({ children, happy = false, className }: { children?: ReactNode; happy?: boolean; className?: string }) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    return (
        <svg viewBox={`0 0 ${COUNTER_W} ${COUNTER_H}`} aria-hidden="true" focusable="false" className={className}>
            <defs>
                <clipPath id={`${uid}-c`}>
                    <rect width={COUNTER_W} height={COUNTER_H} rx={10} />
                </clipPath>
            </defs>
            <g clipPath={`url(#${uid}-c)`}>
                <rect width={COUNTER_W} height={COUNTER_H} fill="#fff6e6" />
                {[10, 44].map((y) => (
                    <g key={y}>
                        <rect x={0} y={y + 26} width={COUNTER_W} height={4} fill="#c9a27a" />
                        {Array.from({ length: 17 }, (_, i) => (
                            <rect
                                key={i}
                                x={3 + i * 14}
                                y={y + 10 + (i % 3) * 2}
                                width={10}
                                height={16 - (i % 3) * 2}
                                rx={2}
                                fill={["#f28b6e", "#6cc0e8", "#f4c94a", "#8fd07a", "#c79bf0"][i % 5]}
                                opacity={0.75}
                            />
                        ))}
                    </g>
                ))}
                {/* Emina iza pulta */}
                <g transform="translate(176 178) scale(1.22)">
                    <Figure id="seller" pose={happy ? "wave" : "stand"} face={happy ? "happy" : "calm"} />
                </g>
                {/* Pult */}
                <rect x={0} y={COUNTER_TOP} width={COUNTER_W} height={COUNTER_H - COUNTER_TOP} fill="#c9a27a" />
                <rect x={0} y={COUNTER_TOP - 4} width={COUNTER_W} height={8} rx={2} fill="#e2c39b" stroke="#a87f52" strokeWidth={1.5} />
                <g transform={`translate(216 ${COUNTER_TOP - 2}) scale(0.62)`}>
                    <rect x={-30} y={-30} width={60} height={30} rx={3} fill="#6c7a96" stroke="#4a5266" strokeWidth={2} />
                    <rect x={-14} y={-50} width={30} height={20} rx={3} fill="#3b3f52" />
                    <rect x={-10} y={-46} width={22} height={8} rx={1.5} fill="#8fe0a8" />
                    {[-20, -8, 4, 16].map((x) => (
                        <rect key={x} x={x} y={-24} width={8} height={6} rx={1.5} fill="#dfe3ea" />
                    ))}
                </g>
                {children}
            </g>
        </svg>
    );
}

/** Cena na kartončiću (u koordinatama kase): „7 din” */
export function PriceTagSvg({ x, y, price, highlight = false }: { x: number; y: number; price: number; highlight?: boolean }) {
    const text = `${price} din`;
    const w = 12 + text.length * 6.6;
    return (
        <g transform={`translate(${x} ${y})`}>
            <path d={`M${-w / 2} -9 H${w / 2 - 4} L${w / 2 + 4} 0 L${w / 2 - 4} 9 H${-w / 2} Z`} fill={highlight ? "#fff3c4" : "#ffffff"} stroke="#c38a17" strokeWidth={1.6} strokeLinejoin="round" />
            <circle cx={w / 2 - 3} cy={0} r={1.6} fill="#c38a17" />
            <text x={-2} y={4.2} textAnchor="middle" fontSize={12} fontWeight={900} fill="#3b2a1a" fontFamily="var(--font-nunito), sans-serif">
                {text}
            </text>
        </g>
    );
}

/** Roba na pultu (jedna ili dve stvari) sa cenama */
export function CounterGoods({ goods, showPrice = true }: { goods: readonly { good: GoodId; price: number }[]; showPrice?: boolean }) {
    const xs = goods.length > 1 ? [52, 118] : [84];
    return (
        <g>
            {goods.map((item, i) => (
                <g key={`${item.good}-${i}`}>
                    <g transform={`translate(${xs[i] - 30} ${COUNTER_TOP - 56}) scale(0.6)`}>{GOOD_ART[item.good]()}</g>
                    {showPrice && <PriceTagSvg x={xs[i]} y={COUNTER_TOP + 16} price={item.price} />}
                </g>
            ))}
        </g>
    );
}
