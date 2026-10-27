// Crteži igre „Godišnja doba”: isto drvo u četiri doba (kartice i kutije), prizori za pitanje
// (livada u proleće, more leti, park u jesen, brdo pod snegom), kuća u četiri dela dana, list
// kalendara sa brojem meseca i stvari iz svakog doba. Postojeće slike (sladoled, lubenica,
// rukavice, sneško…) dolaze iz pictures/ preko world/basePics.

import type { ReactNode } from "react";
import { INK, line, Shine } from "@/app/components/games/pictures/kit";
import { basePic } from "@/app/components/games/world/basePics";
import { habitatDrawing } from "@/app/components/games/habitats/HabitatsArt";
import { DAY_IDS, SEASON_IDS, type DayId, type SeasonId } from "@/app/components/games/data/seasonsLevels";

const isSeason = (value: string): value is SeasonId => (SEASON_IDS as readonly string[]).includes(value);
const isDay = (value: string): value is DayId => (DAY_IDS as readonly string[]).includes(value);

function Frame({ id, sky, children }: { id: string; sky: string; children: ReactNode }) {
    return (
        <>
            <defs>
                <clipPath id={`ss-${id}`}>
                    <rect x={2} y={2} width={96} height={96} rx={14} />
                </clipPath>
            </defs>
            <g clipPath={`url(#ss-${id})`}>
                <rect x={0} y={0} width={100} height={100} fill={sky} />
                {children}
            </g>
        </>
    );
}

/** Zaokruženo na dve decimale (isti zapis na serveru i u pregledaču) */
const r2 = (value: number) => Math.round(value * 100) / 100;

const Sun = ({ x, y, r = 10, color = "#f6c518" }: { x: number; y: number; r?: number; color?: string }) => (
    <g>
        <g {...line(color, 2.6)}>
            {Array.from({ length: 8 }, (_, i) => {
                const a = (i * Math.PI) / 4;
                return <path key={i} d={`M${r2(x + Math.cos(a) * (r + 3))} ${r2(y + Math.sin(a) * (r + 3))} L${r2(x + Math.cos(a) * (r + 7))} ${r2(y + Math.sin(a) * (r + 7))}`} />;
            })}
        </g>
        <circle cx={x} cy={y} r={r} fill={color} />
    </g>
);

const Moon = ({ x, y, r = 10 }: { x: number; y: number; r?: number }) => <path d={`M${x} ${y - r} A${r} ${r} 0 1 0 ${x + r * 0.8} ${y + r * 0.6} A${r * 0.8} ${r * 0.8} 0 1 1 ${x} ${y - r}Z`} fill="#fff3b0" />;

const Flake = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} {...line("#ffffff", 1.4)}>
        <path d="M0 -4 L0 4 M-3.5 -2 L3.5 2 M-3.5 2 L3.5 -2" />
    </g>
);

const Leaf = ({ x, y, r = 0, color = "#e8742a" }: { x: number; y: number; r?: number; color?: string }) => (
    <path d={`M${x} ${y} q4 -6 9 -2 q-3 7 -9 2z`} fill={color} transform={`rotate(${r} ${x} ${y})`} />
);

// ── Isto drvo u četiri doba ───────────────────────────────────────────────────

function SeasonTree({ season }: { season: SeasonId }) {
    const ground = { spring: "#9ad66a", summer: "#6ab84a", autumn: "#c9a24a", winter: "#f4f9ff" }[season];
    const sky = { spring: "#e3f4fb", summer: "#cdeefc", autumn: "#f4ead8", winter: "#dfe9f6" }[season];
    return (
        <Frame id={`tree-${season}`} sky={sky}>
            <path d="M0 78 Q50 70 100 78 L100 100 L0 100Z" fill={ground} />
            {season === "summer" && <Sun x={82} y={18} r={9} />}
            {season === "spring" && <path d="M70 22 q5 -8 13 -4 q6 -6 12 0 q4 6 -2 9 l-20 0 q-6 -1 -3 -5z" fill="#ffffff" />}
            <path d="M46 80 L47 50 Q40 44 30 40 M47 56 Q56 46 66 42 M47 50 L48 34" fill="none" {...line("#8a5a2b", 5)} />
            <path d="M44 80 L44 52 L52 52 L52 80Z" fill="#9a6a3a" />
            {season === "winter" ? (
                <g>
                    <path d="M30 40 Q24 34 22 28 M66 42 Q72 34 76 30 M48 34 Q46 24 50 16" fill="none" {...line("#8a5a2b", 3.4)} />
                    <g fill="#ffffff" {...line("#c9d6e8", 1)}>
                        <ellipse cx={30} cy={39} rx={6} ry={2.4} />
                        <ellipse cx={66} cy={41} rx={6} ry={2.4} />
                        <ellipse cx={49} cy={33} rx={5} ry={2.2} />
                        <ellipse cx={23} cy={28} rx={3.6} ry={1.8} />
                        <ellipse cx={75} cy={30} rx={3.6} ry={1.8} />
                    </g>
                    {[
                        [14, 18],
                        [36, 12],
                        [62, 16],
                        [86, 24],
                        [20, 56],
                        [82, 58],
                        [64, 66],
                    ].map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r={1.8} fill="#ffffff" />
                    ))}
                </g>
            ) : (
                <g>
                    <ellipse cx={48} cy={36} rx={30} ry={24} fill={{ spring: "#a8dc7a", summer: "#3f9a4a", autumn: "#f2a33a" }[season]} />
                    <ellipse cx={34} cy={30} rx={13} ry={11} fill={{ spring: "#bfe88f", summer: "#56b05a", autumn: "#f6c518" }[season]} />
                    <ellipse cx={62} cy={42} rx={13} ry={10} fill={{ spring: "#94cf68", summer: "#2f8a3e", autumn: "#e8742a" }[season]} />
                    {season === "spring" &&
                        [
                            [30, 24],
                            [44, 18],
                            [58, 26],
                            [68, 36],
                            [36, 42],
                            [52, 40],
                            [24, 36],
                            [62, 18],
                        ].map(([x, y], i) => (
                            <g key={i}>
                                <circle cx={x} cy={y} r={3.2} fill="#f7b6cf" />
                                <circle cx={x} cy={y} r={1.2} fill="#ffffff" />
                            </g>
                        ))}
                    {season === "autumn" && (
                        <>
                            <Leaf x={20} y={60} r={20} />
                            <Leaf x={74} y={64} r={-30} color="#f6c518" />
                            <Leaf x={64} y={84} r={10} color="#c8352b" />
                            <Leaf x={26} y={86} r={-10} />
                        </>
                    )}
                    {season === "summer" && (
                        <g>
                            <circle cx={22} cy={86} r={2.6} fill="#e86a8a" />
                            <circle cx={78} cy={88} r={2.6} fill="#f6c518" />
                            <circle cx={66} cy={84} r={2.2} fill="#ffffff" />
                        </g>
                    )}
                </g>
            )}
        </Frame>
    );
}

// ── Prizori za pitanje „Koje je godišnje doba?” ───────────────────────────────

function SeasonScene({ season }: { season: SeasonId }) {
    switch (season) {
        case "spring":
            return (
                <Frame id="scene-spring" sky="#dff3fb">
                    <Sun x={80} y={20} r={8} color="#f9d84a" />
                    <path d="M8 26 q6 -8 14 -4 q6 -6 13 0 q4 7 -3 9 l-20 0 q-7 -1 -4 -5z" fill="#ffffff" />
                    <path d="M0 58 Q30 48 60 56 Q82 62 100 54 L100 100 L0 100Z" fill="#9ad66a" />
                    <path d="M0 80 Q50 72 100 82 L100 100 L0 100Z" fill="#7cc56a" />
                    {[
                        [14, 74, "#e86a8a"],
                        [30, 84, "#f6c518"],
                        [46, 70, "#ffffff"],
                        [62, 86, "#a87be8"],
                        [80, 72, "#e86a8a"],
                        [90, 90, "#f6c518"],
                    ].map(([x, y, c], i) => (
                        <g key={i}>
                            <path d={`M${x} ${Number(y) + 2} L${x} ${Number(y) + 10}`} {...line("#3f8a4a", 1.6)} />
                            <circle cx={Number(x) - 2.6} cy={Number(y)} r={2.4} fill={String(c)} />
                            <circle cx={Number(x) + 2.6} cy={Number(y)} r={2.4} fill={String(c)} />
                            <circle cx={Number(x)} cy={Number(y) - 2.6} r={2.4} fill={String(c)} />
                            <circle cx={Number(x)} cy={Number(y) + 2.4} r={2.4} fill={String(c)} />
                            <circle cx={Number(x)} cy={Number(y)} r={1.8} fill="#f6c518" />
                        </g>
                    ))}
                    {basePic("p:butterflyBlue", 40, 26, 22)}
                    <g transform="translate(70 38)">
                        <path d="M-6 0 q3 -4 6 0 q3 -4 6 0" fill="none" {...line(INK, 1.4)} />
                    </g>
                </Frame>
            );
        case "summer":
            return (
                <Frame id="scene-summer" sky="#bfe6fb">
                    <Sun x={20} y={20} r={10} />
                    <path d="M0 44 Q25 40 50 44 Q75 48 100 44 L100 70 L0 70Z" fill="#3f8fd8" />
                    <path d="M8 52 q5 -3 10 0 M60 56 q5 -3 10 0" fill="none" {...line("#9ad0f5", 1.8)} />
                    <path d="M0 66 Q50 58 100 68 L100 100 L0 100Z" fill="#f2d48a" />
                    {basePic("p:parasol", 54, 34, 44)}
                    <g transform="translate(26 82)">
                        <ellipse rx={12} ry={6} fill="#e86a8a" />
                        <ellipse rx={5} ry={2.4} fill="#f2d48a" />
                        <path d="M-12 0 A12 6 0 0 1 -4 -5.4" fill="none" {...line("#ffffff", 3)} />
                        <path d="M12 0 A12 6 0 0 1 4 5.4" fill="none" {...line("#ffffff", 3)} />
                    </g>
                    <g transform="translate(48 86)">
                        <path d="M-6 6 L-4 -4 L4 -4 L6 6Z" fill="#5aa8e8" {...line("#2f6fa8", 1.2)} />
                        <path d="M-4 -4 Q0 -10 4 -4" fill="none" {...line("#2f6fa8", 1.4)} />
                    </g>
                </Frame>
            );
        case "autumn":
            return (
                <Frame id="scene-autumn" sky="#efe3d2">
                    <path d="M58 14 q6 -8 14 -4 q6 -6 13 0 q4 7 -3 9 l-20 0 q-7 -1 -4 -5z" fill="#c9c3bb" />
                    <path d="M0 70 Q50 62 100 72 L100 100 L0 100Z" fill="#c9a24a" />
                    <g>
                        <rect x={22} y={36} width={6} height={38} fill="#8a5a2b" />
                        <circle cx={25} cy={30} r={16} fill="#f2a33a" />
                        <circle cx={16} cy={26} r={8} fill="#f6c518" />
                        <circle cx={34} cy={34} r={8} fill="#e8742a" />
                        <rect x={70} y={44} width={5} height={30} fill="#8a5a2b" />
                        <circle cx={72} cy={40} r={12} fill="#e8742a" />
                        <circle cx={80} cy={36} r={6} fill="#c8352b" />
                    </g>
                    <Leaf x={44} y={30} r={30} />
                    <Leaf x={52} y={46} r={-20} color="#f6c518" />
                    <Leaf x={58} y={22} r={60} color="#c8352b" />
                    <Leaf x={40} y={56} r={-50} color="#e8742a" />
                    <g>
                        {[
                            [12, 84],
                            [30, 90],
                            [50, 82],
                            [66, 88],
                            [86, 84],
                        ].map(([x, y], i) => (
                            <Leaf key={i} x={x} y={y} r={i * 40} color={["#e8742a", "#f6c518", "#c8352b"][i % 3]} />
                        ))}
                    </g>
                    <ellipse cx={48} cy={94} rx={14} ry={3} fill="#9ab0c8" opacity={0.6} />
                </Frame>
            );
        case "winter":
            return (
                <Frame id="scene-winter" sky="#d8e6f6">
                    <path d="M0 54 Q30 36 60 50 Q82 60 100 46 L100 100 L0 100Z" fill="#f4f9ff" {...line("#c9d6e8", 1.2)} />
                    <path d="M0 80 Q50 72 100 82 L100 100 L0 100Z" fill="#ffffff" />
                    {basePic("p:snowman", 8, 40, 46)}
                    <g transform="translate(70 76)">
                        <path d="M-16 0 L14 0 Q20 0 20 -6" fill="none" {...line("#c8352b", 2.6)} />
                        <rect x={-14} y={-8} width={26} height={5} rx={2} fill="#c98a4b" {...line("#8f5a2b", 1)} />
                        <path d="M-10 -3 L-10 0 M8 -3 L8 0" {...line("#8f5a2b", 1.6)} />
                    </g>
                    {[
                        [14, 12],
                        [30, 22],
                        [48, 10],
                        [64, 24],
                        [84, 14],
                        [90, 34],
                        [56, 38],
                        [20, 34],
                    ].map(([x, y], i) => (
                        <Flake key={i} x={x} y={y} s={i % 2 ? 1 : 1.4} />
                    ))}
                </Frame>
            );
    }
}

// ── Delovi dana ───────────────────────────────────────────────────────────────

function DayScene({ part }: { part: DayId }) {
    const sky = { morning: "#fbd9c4", noon: "#bfe6fb", evening: "#f4a36c", night: "#262a62" }[part];
    const lit = part === "evening" || part === "night";
    return (
        <Frame id={`day-${part}`} sky={sky}>
            {part === "morning" && (
                <>
                    <rect x={0} y={44} width={100} height={20} fill="#fde7b8" opacity={0.7} />
                    <Sun x={22} y={64} r={11} color="#f9b23a" />
                </>
            )}
            {part === "noon" && <Sun x={50} y={18} r={11} />}
            {part === "evening" && (
                <>
                    <rect x={0} y={0} width={100} height={30} fill="#b06aa8" opacity={0.45} />
                    <Sun x={80} y={66} r={11} color="#e8604a" />
                </>
            )}
            {part === "night" && (
                <>
                    <Moon x={74} y={18} r={10} />
                    <g fill="#fff3b0">
                        <circle cx={18} cy={14} r={1.6} />
                        <circle cx={36} cy={24} r={1.2} />
                        <circle cx={54} cy={12} r={1.5} />
                        <circle cx={88} cy={36} r={1.2} />
                        <path d="M28 40 l1.6 3.4 l3.4 1.6 l-3.4 1.6 l-1.6 3.4 l-1.6 -3.4 l-3.4 -1.6 l3.4 -1.6z" />
                    </g>
                </>
            )}
            <path d="M0 72 Q50 64 100 74 L100 100 L0 100Z" fill={part === "night" ? "#2f5a3a" : part === "evening" ? "#6a9a4a" : "#7cc56a"} />
            <path d="M30 56 L52 38 L74 56Z" fill="#d9584a" {...line("#8f2f22", 1.6)} />
            <rect x={34} y={56} width={36} height={26} fill={part === "night" ? "#c9b39a" : "#f4e1c4"} {...line("#a8703a", 1.6)} />
            <rect x={39} y={61} width={10} height={9} rx={1.5} fill={lit ? "#ffd75a" : "#cfeefc"} {...line("#a8703a", 1.2)} />
            <rect x={56} y={64} width={9} height={18} rx={1.5} fill="#8b5e3c" />
        </Frame>
    );
}

// ── List kalendara ────────────────────────────────────────────────────────────

function MonthPage({ month }: { month: number }) {
    return (
        <g>
            <ellipse cx={50} cy={95} rx={34} ry={3} fill="#1f1b3a" opacity={0.08} />
            <rect x={12} y={12} width={76} height={80} rx={8} fill="#ffffff" {...line("#b9b2d8", 2.2)} />
            <path d="M12 20 Q12 12 20 12 L80 12 Q88 12 88 20 L88 32 L12 32Z" fill="#6c61f0" />
            {[30, 50, 70].map((x) => (
                <g key={x}>
                    <rect x={x - 3} y={4} width={6} height={14} rx={3} fill="#8a8aa0" />
                    <circle cx={x} cy={22} r={2.4} fill="#4937c6" />
                </g>
            ))}
            <text x={50} y={76} textAnchor="middle" fontSize={40} fontWeight={800} fill={INK} fontFamily="ui-rounded, system-ui, sans-serif">
                {month}
            </text>
        </g>
    );
}

// ── Stvari ────────────────────────────────────────────────────────────────────

const THING_ART: Record<string, () => ReactNode> = {
    tulip: () => (
        <g>
            <ellipse cx={50} cy={94} rx={22} ry={3} fill="#1f1b3a" opacity={0.08} />
            <path d="M50 92 L50 46" {...line("#3f8a4a", 4)} />
            <path d="M50 78 Q30 72 28 54 Q44 58 50 72Z" fill="#5fae4f" />
            <path d="M50 70 Q68 66 74 50 Q58 54 50 66Z" fill="#7cc56a" />
            <path d="M34 22 L40 34 L50 18 L60 34 L66 22 Q70 42 50 50 Q30 42 34 22Z" fill="#e8463f" {...line("#a8291f", 1.6)} />
            <Shine x={42} y={34} rx={2.4} ry={6} rotate={10} />
        </g>
    ),
    seedling: () => (
        <g>
            <ellipse cx={50} cy={94} rx={26} ry={3} fill="#1f1b3a" opacity={0.08} />
            <path d="M24 60 L76 60 L70 92 L30 92Z" fill="#d9744a" {...line("#a8502a", 2)} />
            <rect x={20} y={54} width={60} height={10} rx={3} fill="#e8845a" {...line("#a8502a", 2)} />
            <ellipse cx={50} cy={56} rx={26} ry={3} fill="#6a4a2a" />
            <path d="M50 56 L50 30" {...line("#3f8a4a", 3.4)} />
            <path d="M50 40 Q34 38 30 24 Q46 24 50 38Z" fill="#7cc56a" {...line("#3f8a4a", 1.2)} />
            <path d="M50 34 Q64 30 70 18 Q54 18 50 32Z" fill="#9ad66a" {...line("#3f8a4a", 1.2)} />
        </g>
    ),
    swimRing: () => (
        <g>
            <ellipse cx={50} cy={92} rx={36} ry={4} fill="#1f1b3a" opacity={0.08} />
            <circle cx={50} cy={50} r={36} fill="#e86a8a" {...line("#b94868", 2)} />
            <circle cx={50} cy={50} r={16} fill="#ffffff" {...line("#b94868", 2)} />
            <g fill="#ffffff">
                <path d="M50 14 A36 36 0 0 1 75.5 24.5 L61.3 38.7 A16 16 0 0 0 50 34Z" />
                <path d="M86 50 A36 36 0 0 1 75.5 75.5 L61.3 61.3 A16 16 0 0 0 66 50Z" />
                <path d="M50 86 A36 36 0 0 1 24.5 75.5 L38.7 61.3 A16 16 0 0 0 50 66Z" />
                <path d="M14 50 A36 36 0 0 1 24.5 24.5 L38.7 38.7 A16 16 0 0 0 34 50Z" />
            </g>
            <Shine x={30} y={30} rx={3} ry={8} rotate={-45} />
        </g>
    ),
    leaves: () => (
        <g>
            <ellipse cx={50} cy={92} rx={36} ry={4} fill="#1f1b3a" opacity={0.08} />
            {[
                [30, 60, -30, "#e8742a"],
                [56, 52, 20, "#f6c518"],
                [44, 76, 60, "#c8352b"],
                [68, 74, -10, "#e8742a"],
            ].map(([x, y, r, c], i) => (
                <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(2.6)`}>
                    <path d="M0 -10 L3 -4 L8 -6 L6 0 L10 3 L4 4 L3 9 L0 6 L-3 9 L-4 4 L-10 3 L-6 0 L-8 -6 L-3 -4Z" fill={String(c)} {...line("#8a4a1a", 0.5)} />
                    <path d="M0 -8 L0 10" {...line("#8a4a1a", 0.6)} />
                </g>
            ))}
        </g>
    ),
    chestnut: () => (
        <g>
            <ellipse cx={50} cy={92} rx={30} ry={4} fill="#1f1b3a" opacity={0.08} />
            <path d="M20 56 Q20 30 46 26 Q50 22 54 26 Q80 30 80 56 Q80 86 50 88 Q20 86 20 56Z" fill="#8a4a22" {...line("#5a2a10", 2)} />
            <path d="M24 62 Q50 72 76 62 Q78 84 50 88 Q22 84 24 62Z" fill="#d9b48a" />
            <Shine x={36} y={42} rx={4} ry={10} rotate={20} />
            <g transform="translate(70 20) scale(0.5)">
                <circle r={18} fill="#7cc56a" {...line("#3f8a4a", 2)} />
                <g {...line("#3f8a4a", 2)}>
                    {Array.from({ length: 10 }, (_, i) => {
                        const a = (i * Math.PI) / 5;
                        return <path key={i} d={`M${r2(Math.cos(a) * 18)} ${r2(Math.sin(a) * 18)} L${r2(Math.cos(a) * 26)} ${r2(Math.sin(a) * 26)}`} />;
                    })}
                </g>
            </g>
        </g>
    ),
    sled: () => (
        <g>
            <ellipse cx={50} cy={88} rx={40} ry={4} fill="#1f1b3a" opacity={0.08} />
            <path d="M8 80 L80 80 Q92 80 92 68" fill="none" {...line("#c8352b", 4)} />
            <path d="M18 80 L22 62 M70 80 L66 62" {...line("#8a5a2b", 4)} />
            <rect x={12} y={50} width={66} height={12} rx={3} fill="#c98a4b" {...line("#8f5a2b", 2)} />
            <path d="M24 50 L24 62 M40 50 L40 62 M56 50 L56 62" {...line("#a8703a", 1.6)} />
            <path d="M12 52 Q2 44 10 36" fill="none" {...line("#c8352b", 2.4)} />
        </g>
    ),
    breakfast: () => (
        <g>
            <ellipse cx={50} cy={92} rx={40} ry={4} fill="#1f1b3a" opacity={0.08} />
            <ellipse cx={36} cy={74} rx={30} ry={10} fill="#ffffff" {...line("#b9b2d8", 2)} />
            <ellipse cx={36} cy={72} rx={20} ry={6} fill="#f4f1fa" />
            <ellipse cx={30} cy={70} rx={10} ry={6} fill="#ffffff" {...line("#e6e1ee", 1)} />
            <circle cx={32} cy={70} r={4} fill="#f6c518" />
            <path d="M48 66 L60 68 L58 74 L46 72Z" fill="#e0b07a" {...line("#a8703a", 1)} />
            <path d="M66 48 L90 48 L86 82 Q78 86 70 82Z" fill="#6cc0e8" {...line("#3f8fb8", 2)} />
            <path d="M68 54 L88 54 L85 80 Q78 83 71 80Z" fill="#ffffff" />
            <g fill="none" {...line("#c9b8a8", 2)}>
                <path d="M74 40 q-3 -5 0 -9 q3 -4 0 -8" />
                <path d="M82 40 q-3 -5 0 -9 q3 -4 0 -8" />
            </g>
        </g>
    ),
    dinner: () => (
        <g>
            <ellipse cx={50} cy={92} rx={40} ry={4} fill="#1f1b3a" opacity={0.08} />
            <rect x={70} y={30} width={8} height={36} rx={2} fill="#ffffff" {...line("#c9b8a8", 1.4)} />
            <path d="M74 30 Q70 22 74 16 Q78 22 74 30Z" fill="#f6c518" />
            <circle cx={74} cy={22} r={10} fill="#ffd75a" opacity={0.25} />
            <ellipse cx={42} cy={72} rx={32} ry={11} fill="#ffffff" {...line("#b9b2d8", 2)} />
            <path d="M22 66 Q22 82 42 82 Q62 82 62 66Z" fill="#6cc0e8" {...line("#3f8fb8", 1.6)} />
            <ellipse cx={42} cy={66} rx={20} ry={5} fill="#f3b04a" {...line("#3f8fb8", 1.4)} />
            <rect x={70} y={66} width={10} height={4} rx={1.5} fill="#c9b8a8" />
        </g>
    ),
};

export function seasonDrawing(pic: string): ReactNode {
    const [kind, value] = pic.split(":");
    if (kind === "season") return isSeason(value) ? <SeasonTree season={value} /> : null;
    if (kind === "scene") return isSeason(value) ? <SeasonScene season={value} /> : null;
    if (kind === "day") return isDay(value) ? <DayScene part={value} /> : null;
    if (kind === "month") {
        const month = Number(value);
        return Number.isInteger(month) && month >= 1 && month <= 12 ? <MonthPage month={month} /> : null;
    }
    if (kind === "p" || kind === "a") return basePic(pic, 4, 4, 92);
    if (pic === "nest") return habitatDrawing("nest");
    return THING_ART[pic]?.() ?? null;
}

export function SeasonPic({ pic, className }: { pic: string; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {seasonDrawing(pic)}
        </svg>
    );
}
