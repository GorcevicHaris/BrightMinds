// Pozadine slika situacija: soba, kuhinja, učionica, park… Sve su mirne, svetle boje i
// sa malo detalja, da likovi i predmeti budu u prvom planu. Unutra je zid do FLOOR, a pod
// ispod; napolju je nebo do HORIZON. `view` je ono što se vidi napolju (kroz prozor ili nebo).

import type { ReactNode } from "react";
import type { BackgroundId, ViewId } from "./types";

export const FLOOR = 112;
export const HORIZON = 100;

const SKY: Record<ViewId, string> = {
    day: "#cfe8fb",
    clear: "#cfe8fb",
    night: "#2f3d6e",
    stars: "#2f3d6e",
    dusk: "#f7c9a3",
    rain: "#c5ccd8",
    storm: "#8f98ab",
    snow: "#dde7f3",
    rainbow: "#d4ecfb",
    dark: "#2f3d6e",
};

function Cloud({ x, y, s = 1, color = "#ffffff" }: { x: number; y: number; s?: number; color?: string }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
            <ellipse cx={0} cy={0} rx={16} ry={8} />
            <ellipse cx={-10} cy={2} rx={10} ry={6} />
            <ellipse cx={11} cy={2} rx={11} ry={6} />
            <ellipse cx={2} cy={-6} rx={9} ry={7} />
        </g>
    );
}

function MoonAndStars({ x, y }: { x: number; y: number }) {
    return (
        <g>
            <path d={`M${x} ${y - 9} a10 10 0 1 0 8 15 a8 8 0 1 1 -8 -15Z`} fill="#fff1a8" />
            {[
                [x - 28, y - 4],
                [x + 22, y + 10],
                [x - 14, y + 16],
                [x + 30, y - 8],
            ].map(([sx, sy]) => (
                <circle key={`${sx}-${sy}`} cx={sx} cy={sy} r={1.6} fill="#ffffff" opacity={0.9} />
            ))}
        </g>
    );
}

/** Nebo sa vremenom: crta se u pravougaoniku (x, y, w, h) — prozor ili otvoreno nebo */
function Sky({ view, x, y, w, h }: { view: ViewId; x: number; y: number; w: number; h: number }) {
    const cx = x + w / 2;
    return (
        <g>
            <rect x={x} y={y} width={w} height={h} fill={SKY[view]} />
            {(view === "day" || view === "rainbow") && <Cloud x={x + w * 0.3} y={y + h * 0.35} s={Math.min(w, 120) / 120} />}
            {view === "rainbow" && (
                <g fill="none" strokeWidth={Math.max(3, w / 30)} strokeLinecap="round">
                    {["#ef6a6a", "#f6a23e", "#f6d84a", "#6ccf6a", "#5aa8ee", "#9b7ef0"].map((color, i) => (
                        <path
                            key={color}
                            d={`M${x + w * 0.12 + i * (w / 34)} ${y + h} A${w * 0.38 - i * (w / 34)} ${h * 0.8 - i * (w / 34)} 0 0 1 ${x + w * 0.88 - i * (w / 34)} ${y + h}`}
                            stroke={color}
                        />
                    ))}
                </g>
            )}
            {view === "dusk" && <circle cx={cx} cy={y + h * 0.85} r={Math.min(w, h) * 0.18} fill="#f6a35a" />}
            {(view === "night" || view === "dark") && <MoonAndStars x={x + w * 0.7} y={y + h * 0.35} />}
            {view === "stars" && (
                <g fill="#ffffff">
                    {Array.from({ length: Math.round(w / 14) }, (_, i) => (
                        <circle key={i} cx={x + 6 + i * 14} cy={y + 8 + ((i * 23) % Math.max(h * 0.6, 10))} r={1.7} opacity={0.9} />
                    ))}
                </g>
            )}
            {(view === "rain" || view === "storm") && (
                <>
                    <Cloud x={x + w * 0.35} y={y + h * 0.25} s={Math.min(w, 120) / 110} color={view === "storm" ? "#6d7587" : "#a9b2c0"} />
                    <g stroke="#6f9fd8" strokeWidth={1.6} strokeLinecap="round">
                        {Array.from({ length: Math.round(w / 9) }, (_, i) => {
                            const rx = x + 5 + i * 9;
                            const ry = y + h * 0.45 + ((i * 37) % 20);
                            return <line key={i} x1={rx} y1={ry} x2={rx - 2} y2={ry + 7} />;
                        })}
                    </g>
                </>
            )}
            {view === "storm" && <path d={`M${cx + 4} ${y + h * 0.3} L${cx - 6} ${y + h * 0.6} H${cx + 2} L${cx - 6} ${y + h * 0.95} L${cx + 12} ${y + h * 0.52} H${cx + 3} Z`} fill="#ffd84a" stroke="#e8a92a" strokeWidth={1} />}
            {view === "snow" && (
                <g fill="#ffffff">
                    {Array.from({ length: Math.round(w / 8) }, (_, i) => (
                        <circle key={i} cx={x + 4 + i * 8} cy={y + 6 + ((i * 29) % Math.max(h - 10, 10))} r={1.8} />
                    ))}
                </g>
            )}
        </g>
    );
}

function Window({ x, y, w = 60, h = 50, view }: { x: number; y: number; w?: number; h?: number; view: ViewId }) {
    return (
        <g>
            <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={4} fill="#ffffff" stroke="#d8cfc2" strokeWidth={1.5} />
            <Sky view={view} x={x} y={y} w={w} h={h} />
            {view === "snow" && <rect x={x} y={y + h - 8} width={w} height={8} fill="#ffffff" />}
            <path d={`M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`} stroke="#ffffff" strokeWidth={3} />
            <rect x={x - 6} y={y + h + 2} width={w + 12} height={5} rx={2} fill="#e6dccd" />
        </g>
    );
}

function Floor({ color, line }: { color: string; line: string }) {
    return (
        <g>
            <rect x={0} y={FLOOR} width={240} height={160 - FLOOR} fill={color} />
            <rect x={0} y={FLOOR - 3} width={240} height={4} fill={line} />
            <path d={`M0 ${FLOOR + 16} H240 M0 ${FLOOR + 34} H240`} stroke={line} strokeWidth={1} opacity={0.5} />
        </g>
    );
}

function Tiles({ y0, y1, color, line, size = 16 }: { y0: number; y1: number; color: string; line: string; size?: number }) {
    const rows = Math.ceil((y1 - y0) / size);
    return (
        <g>
            <rect x={0} y={y0} width={240} height={y1 - y0} fill={color} />
            <g stroke={line} strokeWidth={1}>
                {Array.from({ length: rows }, (_, i) => (
                    <line key={`h${i}`} x1={0} y1={y0 + i * size} x2={240} y2={y0 + i * size} />
                ))}
                {Array.from({ length: Math.ceil(240 / size) }, (_, i) => (
                    <line key={`v${i}`} x1={i * size} y1={y0} x2={i * size} y2={y1} />
                ))}
            </g>
        </g>
    );
}

function Grass({ color = "#a9dc8c", far = "#c4e8a8" }: { color?: string; far?: string }) {
    return (
        <g>
            <path d={`M0 ${HORIZON - 4} Q60 ${HORIZON - 16} 120 ${HORIZON - 6} T240 ${HORIZON - 8} V160 H0Z`} fill={far} />
            <path d={`M0 ${HORIZON + 6} Q80 ${HORIZON - 4} 160 ${HORIZON + 4} T240 ${HORIZON + 2} V160 H0Z`} fill={color} />
        </g>
    );
}

function FarTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <rect x={-2.5} y={-12} width={5} height={14} fill="#a8794e" />
            <circle cx={0} cy={-20} r={12} fill="#8fcc78" />
        </g>
    );
}

function House({ x, y, color, roof }: { x: number; y: number; color: string; roof: string }) {
    return (
        <g>
            <rect x={x} y={y} width={44} height={36} fill={color} />
            <path d={`M${x - 4} ${y + 2} L${x + 22} ${y - 18} L${x + 48} ${y + 2} Z`} fill={roof} />
            <rect x={x + 7} y={y + 8} width={10} height={10} fill="#ffffff" opacity={0.85} />
            <rect x={x + 27} y={y + 8} width={10} height={10} fill="#ffffff" opacity={0.85} />
        </g>
    );
}

const BACKGROUNDS: Record<BackgroundId, (view: ViewId) => ReactNode> = {
    room: (view) => (
        <g>
            <rect width={240} height={FLOOR} fill="#fdf0e2" />
            <Window x={160} y={22} view={view} />
            <Floor color="#ecd3b2" line="#d9b98f" />
        </g>
    ),
    bedroom: (view) => (
        <g>
            <rect width={240} height={FLOOR} fill="#e8eefc" />
            <g fill="#d6e0f8">
                {[30, 70, 110].map((x) => (
                    <circle key={x} cx={x} cy={30} r={3} />
                ))}
            </g>
            <Window x={150} y={20} view={view} />
            <Floor color="#e3cfb4" line="#cdb08c" />
        </g>
    ),
    living: (view) => (
        <g>
            <rect width={240} height={FLOOR} fill="#fff4e2" />
            <Window x={20} y={22} view={view} />
            <Floor color="#e8cfae" line="#d2b088" />
            <ellipse cx={130} cy={140} rx={70} ry={12} fill="#f2b8a8" opacity={0.6} />
        </g>
    ),
    kitchen: (view) => (
        <g>
            <rect width={240} height={FLOOR} fill="#f4faf4" />
            <Tiles y0={56} y1={82} color="#e2f2e8" line="#cfe5d6" size={13} />
            <Window x={150} y={10} w={56} h={40} view={view} />
            <rect x={0} y={82} width={110} height={30} fill="#9fcbb0" />
            <rect x={0} y={78} width={112} height={6} rx={2} fill="#e9e2d6" />
            <path d="M36 86 V108 M72 86 V108" stroke="#7fb092" strokeWidth={1.5} />
            <Floor color="#e9dccb" line="#d3c2aa" />
        </g>
    ),
    bathroom: () => (
        <g>
            <Tiles y0={0} y1={FLOOR} color="#e6f3fb" line="#cde3f2" size={16} />
            <Tiles y0={FLOOR} y1={160} color="#d9e6ee" line="#c3d4df" size={16} />
        </g>
    ),
    classroom: (view) => (
        <g>
            <rect width={240} height={FLOOR} fill="#f6f1e2" />
            <rect x={62} y={14} width={116} height={52} rx={3} fill="#3f6f5a" stroke="#a8794e" strokeWidth={4} />
            <path d="M74 30 Q90 24 104 32 M120 40 H150" stroke="#ffffff" strokeWidth={1.6} opacity={0.6} fill="none" strokeLinecap="round" />
            <Window x={12} y={22} w={40} h={44} view={view} />
            <Window x={194} y={22} w={36} h={44} view={view} />
            <Floor color="#e2cba8" line="#cbae86" />
        </g>
    ),
    hall: () => (
        <g>
            <rect width={240} height={FLOOR} fill="#efe6fa" />
            <path d="M0 0 H40 Q30 50 40 112 H0Z M240 0 H200 Q210 50 200 112 H240Z" fill="#b25a6a" />
            <path d="M0 0 H240 V12 Q120 20 0 12Z" fill="#c26a7a" />
            <rect x={0} y={FLOOR - 6} width={240} height={10} fill="#a8794e" />
            <Floor color="#d9b88c" line="#c29e70" />
        </g>
    ),
    clinic: (view) => (
        <g>
            <rect width={240} height={FLOOR} fill="#e7f6f4" />
            <Window x={170} y={20} w={50} h={44} view={view} />
            <rect x={24} y={22} width={26} height={26} rx={5} fill="#ffffff" />
            <path d="M37 27 V43 M29 35 H45" stroke="#e8605a" strokeWidth={5} strokeLinecap="round" />
            <Floor color="#d6e4ea" line="#bfd1da" />
        </g>
    ),
    shop: () => (
        <g>
            <rect width={240} height={FLOOR} fill="#fff6e6" />
            {[18, 50].map((y) => (
                <g key={y}>
                    <rect x={0} y={y + 24} width={240} height={4} fill="#c9a27a" />
                    {Array.from({ length: 16 }, (_, i) => (
                        <rect
                            key={i}
                            x={4 + i * 15}
                            y={y + 8 + (i % 3) * 2}
                            width={11}
                            height={16 - (i % 3) * 2}
                            rx={2}
                            fill={["#f28b6e", "#6cc0e8", "#f4c94a", "#8fd07a", "#c79bf0"][i % 5]}
                        />
                    ))}
                </g>
            ))}
            <Tiles y0={FLOOR} y1={160} color="#eef0f2" line="#dde1e6" size={20} />
        </g>
    ),
    restaurant: (view) => (
        <g>
            <rect width={240} height={FLOOR} fill="#fbe8d8" />
            <Window x={24} y={20} w={50} h={44} view={view} />
            <rect x={150} y={26} width={30} height={24} rx={2} fill="#ffffff" stroke="#d9a87a" strokeWidth={3} />
            <circle cx={165} cy={38} r={6} fill="#f4b73f" />
            <path d="M200 30 Q206 46 200 62" stroke="#e0b48a" strokeWidth={2} fill="none" />
            <Floor color="#dcb58c" line="#c49a6c" />
        </g>
    ),
    park: (view) => (
        <g>
            <Sky view={view} x={0} y={0} w={240} h={HORIZON + 10} />
            {view === "day" && <circle cx={212} cy={22} r={11} fill="#ffd84a" />}
            <Grass />
            <FarTree x={22} y={HORIZON - 4} s={0.8} />
            <FarTree x={200} y={HORIZON - 6} s={0.7} />
            <path d="M90 160 Q110 130 140 112 Q160 102 200 98" stroke="#ecdcb8" strokeWidth={18} fill="none" opacity={0.8} />
        </g>
    ),
    playground: (view) => (
        <g>
            <Sky view={view} x={0} y={0} w={240} h={HORIZON + 10} />
            {view === "day" && <circle cx={22} cy={22} r={11} fill="#ffd84a" />}
            <Grass />
            <ellipse cx={120} cy={142} rx={110} ry={20} fill="#f1dfb0" />
            <FarTree x={226} y={HORIZON - 4} s={0.7} />
        </g>
    ),
    street: (view) => (
        <g>
            <Sky view={view} x={0} y={0} w={240} h={HORIZON + 10} />
            <House x={8} y={60} color="#f6d3a8" roof="#d9765a" />
            <House x={96} y={56} color="#cfe0f2" roof="#7f8fb8" />
            <House x={186} y={62} color="#f2c9d4" roof="#c86a7a" />
            <rect x={0} y={HORIZON - 4} width={240} height={34} fill="#dcd6cc" />
            <path d={`M0 ${HORIZON + 8} H240 M0 ${HORIZON + 20} H240`} stroke="#c9c2b6" strokeWidth={1} />
            <rect x={0} y={130} width={240} height={30} fill="#9aa3ae" />
            <path d="M10 145 H40 M70 145 H100 M130 145 H160 M190 145 H220" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
        </g>
    ),
    garden: (view) => (
        <g>
            <Sky view={view} x={0} y={0} w={240} h={HORIZON + 10} />
            <Grass color="#9fd67e" far="#bfe6a0" />
            <g fill="#e9d6b4" stroke="#c9ae86" strokeWidth={1}>
                {Array.from({ length: 13 }, (_, i) => (
                    <path key={i} d={`M${i * 19 + 4} ${HORIZON + 6} V${HORIZON - 16} l5 -5 l5 5 V${HORIZON + 6}Z`} />
                ))}
            </g>
            <rect x={0} y={HORIZON - 8} width={240} height={3} fill="#c9ae86" />
        </g>
    ),
    beach: (view) => (
        <g>
            <Sky view={view} x={0} y={0} w={240} h={80} />
            {view === "day" && <circle cx={200} cy={24} r={12} fill="#ffd84a" />}
            <rect x={0} y={70} width={240} height={34} fill="#6cc4e8" />
            <path d="M0 80 Q15 76 30 80 T60 80 T90 80 T120 80 T150 80 T180 80 T210 80 T240 80" stroke="#ffffff" strokeWidth={2} fill="none" opacity={0.7} />
            <path d="M0 104 Q60 96 120 102 T240 100 V160 H0Z" fill="#f4dca2" />
        </g>
    ),
    snow: (view) => (
        <g>
            <Sky view={view === "day" ? "snow" : view} x={0} y={0} w={240} h={HORIZON + 10} />
            <path d={`M0 ${HORIZON} Q70 ${HORIZON - 14} 140 ${HORIZON - 2} T240 ${HORIZON - 4} V160 H0Z`} fill="#f3f7fc" />
            <path d={`M0 ${HORIZON + 22} Q80 ${HORIZON + 12} 160 ${HORIZON + 22} T240 ${HORIZON + 20}`} stroke="#d6e2f0" strokeWidth={2} fill="none" />
            <g transform={`translate(20 ${HORIZON - 4})`}>
                <path d="M0 0 L-10 0 L0 -26 L10 0 Z" fill="#7fb092" />
                <path d="M-6 -10 L0 -24 L6 -10 Z" fill="#ffffff" />
            </g>
        </g>
    ),
    // Bazen: voda u sredini, ivica od pločica napred (tu stoje oni koji nisu u vodi)
    pool: () => (
        <g>
            <Tiles y0={0} y1={70} color="#e8f4fa" line="#d2e6f0" size={14} />
            <rect x={0} y={66} width={240} height={8} fill="#cfe0ea" />
            <rect x={0} y={74} width={240} height={56} fill="#7fd0ee" />
            <path d="M0 90 Q20 86 40 90 T80 90 T120 90 T160 90 T200 90 T240 90" stroke="#ffffff" strokeWidth={2} fill="none" opacity={0.6} />
            <path d="M0 116 Q20 112 40 116 T80 116 T120 116 T160 116 T200 116 T240 116" stroke="#ffffff" strokeWidth={2} fill="none" opacity={0.5} />
            <Tiles y0={130} y1={160} color="#e2eef4" line="#c9dbe6" size={15} />
            <rect x={0} y={128} width={240} height={4} fill="#b9cfdc" />
        </g>
    ),
    station: (view) => (
        <g>
            <Sky view={view} x={0} y={0} w={240} h={HORIZON} />
            <rect x={0} y={20} width={240} height={8} fill="#8a96a8" />
            <rect x={30} y={28} width={6} height={72} fill="#8a96a8" />
            <rect x={204} y={28} width={6} height={72} fill="#8a96a8" />
            <rect x={90} y={34} width={60} height={20} rx={3} fill="#2f3d5a" />
            <path d="M98 44 H120 M126 44 H142" stroke="#ffd84a" strokeWidth={3} strokeLinecap="round" />
            <rect x={0} y={HORIZON - 20} width={240} height={14} fill="#a9a29a" />
            <path d={`M0 ${HORIZON - 12} H240`} stroke="#6f6a64" strokeWidth={2} />
            <rect x={0} y={HORIZON - 6} width={240} height={66} fill="#d9d4cc" />
            <rect x={0} y={HORIZON - 6} width={240} height={4} fill="#f4d04a" />
        </g>
    ),
    train: (view) => (
        <g>
            <rect width={240} height={FLOOR} fill="#e9eef6" />
            {[20, 130].map((x) => (
                <g key={x}>
                    <rect x={x - 4} y={18} width={98} height={54} rx={10} fill="#ffffff" stroke="#c8d2e0" strokeWidth={2} />
                    <g>
                        <clipPath id={`train-window-${x}`}>
                            <rect x={x} y={22} width={90} height={46} rx={8} />
                        </clipPath>
                        <g clipPath={`url(#train-window-${x})`}>
                            <Sky view={view} x={x} y={22} w={90} h={46} />
                            <path d={`M${x} 60 Q${x + 30} 48 ${x + 60} 58 T${x + 90} 54 V68 H${x}Z`} fill="#a9dc8c" />
                        </g>
                    </g>
                </g>
            ))}
            <Floor color="#b9c2d0" line="#a3adbd" />
        </g>
    ),
    plain: () => (
        <g>
            <rect width={240} height={160} fill="#f4f2ff" />
            <ellipse cx={120} cy={146} rx={96} ry={12} fill="#e5e3ff" />
        </g>
    ),
    // Pijaca: nebo, kuće u daljini, kaldrma, zastavice preko trga
    market: (view) => (
        <g>
            <Sky view={view} x={0} y={0} w={240} h={HORIZON} />
            <House x={14} y={58} color="#f6d3a8" roof="#d9765a" />
            <House x={186} y={60} color="#cfe0f2" roof="#7f8fb8" />
            <rect x={0} y={HORIZON - 6} width={240} height={66} fill="#e6ddcf" />
            <g stroke="#d3c7b4" strokeWidth={1}>
                <path d={`M0 ${HORIZON + 12} H240 M0 ${HORIZON + 32} H240 M0 ${HORIZON + 52} H240`} />
            </g>
            <path d="M0 14 Q60 30 120 16 T240 14" stroke="#9a8a7a" strokeWidth={0.9} fill="none" />
            {Array.from({ length: 11 }, (_, i) => {
                const x = 10 + i * 22;
                const y = 14 + Math.sin((x / 240) * Math.PI * 2) * 7 + 2;
                return <path key={i} d={`M${x - 5} ${y} H${x + 5} L${x} ${y + 9}Z`} fill={["#e8605a", "#f4c94a", "#6cc0e8", "#8fd07a"][i % 4]} />;
            })}
        </g>
    ),
    // Akvarijum: voda, zraci svetla, pesak na dnu i staklo oko svega
    aquarium: () => (
        <g>
            <rect width={240} height={160} fill="#6fc6ea" />
            <rect width={240} height={60} fill="#8fd6f2" opacity={0.7} />
            <g fill="#ffffff" opacity={0.14}>
                <path d="M30 0 H52 L90 130 H62Z" />
                <path d="M120 0 H136 L160 130 H140Z" />
                <path d="M190 0 H204 L214 130 H198Z" />
            </g>
            <path d="M0 132 Q40 124 80 130 T160 128 T240 130 V160 H0Z" fill="#f1dca8" />
            <g fill="#e2c88e">
                <circle cx={40} cy={146} r={2} />
                <circle cx={110} cy={152} r={2.4} />
                <circle cx={176} cy={144} r={1.8} />
                <circle cx={214} cy={154} r={2.2} />
            </g>
            <rect x={3} y={3} width={234} height={154} rx={8} fill="none" stroke="#e6f6fd" strokeWidth={6} opacity={0.9} />
        </g>
    ),
    sky: (view) => (
        <g>
            <Sky view={view} x={0} y={0} w={240} h={160} />
            <Cloud x={60} y={110} s={1.3} />
            <Cloud x={190} y={130} s={1} />
        </g>
    ),
};

/** Unutrašnje pozadine: kad je mrak, cela soba je zatamnjena (napolju se vidi kroz prozor) */
const INDOOR: readonly BackgroundId[] = ["room", "bedroom", "living", "kitchen", "bathroom", "classroom", "hall", "clinic", "shop", "restaurant", "train"];

export function Background({ id, view = "day" }: { id: BackgroundId; view?: ViewId }) {
    return <>{BACKGROUNDS[id](view)}</>;
}

/** Ono što ide preko likova: blagi mrak u sobi noću ili kad nestane svetla */
export function BackgroundOverlay({ id, view = "day" }: { id: BackgroundId; view?: ViewId }) {
    if (!INDOOR.includes(id)) return null;
    if (view === "night") return <rect width={240} height={160} fill="#1d2550" opacity={0.28} />;
    if (view === "dark") return <rect width={240} height={160} fill="#1d2550" opacity={0.5} />;
    return null;
}

export function hasBackground(id: string): boolean {
    return Object.hasOwn(BACKGROUNDS, id);
}
