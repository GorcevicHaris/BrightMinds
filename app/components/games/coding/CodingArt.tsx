// Crteži igre „Vodi robota”: Robotić (isti kao drugar-robot: plavo kućište, tamni ekran sa
// svetlim očima, antena sa lampicom, tri dugmeta na grudima — ovde na točkićima), ciljevi
// (baterija, cvet, raketa, blago), prepreke, zvezde, polja table po temama i strelice.
// Polje table je kvadrat 100 × 100; sve se crta oko njega. Stil kao u ostalim igrama: obli
// oblici, mirne boje, tanka tamnija ivica, odsjaj.

import type { CSSProperties, ReactNode } from "react";
import { line, Shine } from "@/app/components/games/pictures/kit";
import type { Cmd, ObstacleId, ThemeId } from "@/app/components/games/data/codingLevels";

/** Veličina polja u crtežu */
export const CELL = 100;
/** Okvir oko table */
export const BOARD_PAD = 14;

// ── Pokreti ───────────────────────────────────────────────────────────────────

/** Udarac u prepreku (pola koraka i nazad), mirni ples na cilju, svetlucanje i pokupljena zvezda */
export function CodingStyles() {
    return (
        <style>{`
@keyframes cr-bump-up { 0%,100% { transform: translate(0,0) } 40% { transform: translate(0,-16px) } }
@keyframes cr-bump-down { 0%,100% { transform: translate(0,0) } 40% { transform: translate(0,16px) } }
@keyframes cr-bump-left { 0%,100% { transform: translate(0,0) } 40% { transform: translate(-16px,0) } }
@keyframes cr-bump-right { 0%,100% { transform: translate(0,0) } 40% { transform: translate(16px,0) } }
.cr-bump-up { animation: cr-bump-up 0.5s ease-in-out both }
.cr-bump-down { animation: cr-bump-down 0.5s ease-in-out both }
.cr-bump-left { animation: cr-bump-left 0.5s ease-in-out both }
.cr-bump-right { animation: cr-bump-right 0.5s ease-in-out both }
@keyframes cr-dance { 0%,100% { transform: translate(0,0) rotate(0) } 20% { transform: translate(0,-9px) rotate(-7deg) } 40% { transform: translate(0,0) rotate(0) } 60% { transform: translate(0,-9px) rotate(7deg) } 80% { transform: translate(0,0) rotate(0) } }
.cr-dance { animation: cr-dance 1.1s ease-in-out 2 both; transform-box: fill-box; transform-origin: 50% 100% }
@keyframes cr-twinkle { 0%,100% { opacity: 0.25; transform: scale(0.6) } 50% { opacity: 1; transform: scale(1.1) } }
.cr-twinkle { animation: cr-twinkle 1.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center }
@keyframes cr-glow { 0%,100% { opacity: 0.45 } 50% { opacity: 1 } }
.cr-glow { animation: cr-glow 1.8s ease-in-out infinite }
@keyframes cr-blink { 0%,92%,100% { transform: scaleY(1) } 96% { transform: scaleY(0.15) } }
.cr-blink { animation: cr-blink 4.5s ease-in-out infinite; transform-box: fill-box; transform-origin: center }
`}</style>
    );
}

// ── Robotić ───────────────────────────────────────────────────────────────────

export type RobotMood = "idle" | "happy" | "oops";

const BODY = "#5b9be8";
const BODY_EDGE = "#3a6fb8";
const SCREEN = "#26324a";
const GLOW = "#8ff3ff";

const LOOK: Record<Cmd, [number, number]> = { up: [0, -2.6], down: [0, 2.6], left: [-3.2, 0], right: [3.2, 0] };

/** Robotić u polju 100 × 100 (sredina 50, 50): oči gledaju kuda ide */
export function RobotFigure({ facing, mood = "idle", calm = true }: { facing: Cmd | null; mood?: RobotMood; calm?: boolean }) {
    const [lx, ly] = facing ? LOOK[facing] : [0, 0];
    return (
        <g>
            <ellipse cx={50} cy={93} rx={27} ry={4.5} fill="#000000" opacity={0.12} />
            {/* Točkići */}
            <g>
                <circle cx={32} cy={83} r={9.5} fill="#3b4256" {...line("#232838", 2)} />
                <circle cx={32} cy={83} r={3.6} fill="#c6d0de" />
                <circle cx={68} cy={83} r={9.5} fill="#3b4256" {...line("#232838", 2)} />
                <circle cx={68} cy={83} r={3.6} fill="#c6d0de" />
            </g>
            {/* Antena */}
            <path d="M50 30 V17" fill="none" {...line("#8a96aa", 3)} />
            <circle cx={50} cy={14} r={5.4} fill={mood === "happy" ? "#ffe27a" : "#ffd24a"} {...line("#c9971a", 1.8)} />
            {mood === "happy" && <circle cx={50} cy={14} r={9} fill="#ffe27a" opacity={0.35} />}
            {/* Zavrtnji sa strane */}
            <circle cx={18.5} cy={50} r={5} fill="#c6d0de" {...line("#8a96aa", 1.6)} />
            <circle cx={81.5} cy={50} r={5} fill="#c6d0de" {...line("#8a96aa", 1.6)} />
            {/* Kućište */}
            <rect x={20} y={28} width={60} height={56} rx={24} fill={BODY} {...line(BODY_EDGE, 2.4)} />
            <Shine x={30} y={38} rx={3.4} ry={7} rotate={25} opacity={0.4} />
            {/* Ekran sa licem */}
            <rect x={27.5} y={35} width={45} height={29} rx={11} fill={SCREEN} {...line("#1a2234", 1.6)} />
            <g transform={`translate(${lx} ${ly})`}>
                {mood === "happy" ? (
                    <>
                        <path d="M36 50 Q41 44 46 50" fill="none" {...line(GLOW, 3)} />
                        <path d="M54 50 Q59 44 64 50" fill="none" {...line(GLOW, 3)} />
                        <path d="M42 54.5 Q50 61.5 58 54.5" fill={GLOW} opacity={0.95} {...line(GLOW, 1.6)} />
                    </>
                ) : mood === "oops" ? (
                    <>
                        <circle cx={41} cy={48} r={4} fill={GLOW} />
                        <circle cx={59} cy={48} r={4} fill={GLOW} />
                        <ellipse cx={50} cy={57.5} rx={3} ry={2.4} fill="none" {...line(GLOW, 2)} />
                    </>
                ) : (
                    <>
                        <g className={calm ? undefined : "cr-blink"}>
                            <ellipse cx={41} cy={48} rx={4.4} ry={5.4} fill={GLOW} />
                            <ellipse cx={59} cy={48} rx={4.4} ry={5.4} fill={GLOW} />
                        </g>
                        <circle cx={39.6} cy={46.2} r={1.5} fill="#ffffff" />
                        <circle cx={57.6} cy={46.2} r={1.5} fill="#ffffff" />
                        <path d="M44 55.5 Q50 60 56 55.5" fill="none" {...line(GLOW, 2.4)} />
                    </>
                )}
            </g>
            <circle cx={33.5} cy={56.5} r={2.6} fill="#ff8fb0" opacity={0.55} />
            <circle cx={66.5} cy={56.5} r={2.6} fill="#ff8fb0" opacity={0.55} />
            {/* Dugmići na grudima */}
            <rect x={37} y={68} width={26} height={9} rx={4.5} fill="#e8f2ff" {...line(BODY_EDGE, 1.4)} />
            <circle cx={43} cy={72.5} r={2.3} fill="#ff6b7a" />
            <circle cx={50} cy={72.5} r={2.3} fill="#ffd24a" />
            <circle cx={57} cy={72.5} r={2.3} fill="#6ed68a" />
        </g>
    );
}

// ── Ciljevi ───────────────────────────────────────────────────────────────────

function Battery() {
    return (
        <g>
            <ellipse cx={50} cy={90} rx={22} ry={4} fill="#000000" opacity={0.1} />
            <rect x={41} y={12} width={18} height={11} rx={3.5} fill="#2f8a57" {...line("#1f6a40", 1.8)} />
            <rect x={28} y={20} width={44} height={68} rx={12} fill="#ffffff" {...line("#2f8a57", 3)} />
            <rect x={34} y={42} width={32} height={40} rx={7} fill="#5ccf86" />
            <rect x={34} y={30} width={32} height={8} rx={4} fill="#5ccf86" opacity={0.45} />
            <path d="M54 34 L40 58 H50 L46 76 L61 50 H51 Z" fill="#ffd24a" {...line("#c9971a", 2)} />
            <Shine x={36} y={30} rx={2.6} ry={6} rotate={15} opacity={0.7} />
        </g>
    );
}

function Flower() {
    const petals = [0, 60, 120, 180, 240, 300];
    return (
        <g>
            <ellipse cx={50} cy={92} rx={20} ry={3.6} fill="#000000" opacity={0.1} />
            <path d="M50 52 Q48 72 50 90" fill="none" {...line("#3f8f3c", 4)} />
            <path d="M50 76 Q36 66 28 74 Q38 84 50 78Z" fill="#6cc25f" {...line("#3f8f3c", 1.8)} />
            <path d="M50 70 Q64 60 72 68 Q62 78 50 72Z" fill="#6cc25f" {...line("#3f8f3c", 1.8)} />
            {petals.map((deg) => (
                <ellipse key={deg} cx={50} cy={22} rx={10} ry={13} fill="#f78fb3" transform={`rotate(${deg} 50 38)`} {...line("#d0638c", 1.8)} />
            ))}
            <circle cx={50} cy={38} r={11} fill="#ffd24a" {...line("#d9a521", 1.8)} />
            <circle cx={46} cy={36.5} r={1.6} fill="#4a3a32" />
            <circle cx={54} cy={36.5} r={1.6} fill="#4a3a32" />
            <path d="M46.5 41 Q50 44 53.5 41" fill="none" {...line("#4a3a32", 1.4)} />
        </g>
    );
}

function Rocket() {
    return (
        <g>
            <ellipse cx={50} cy={93} rx={24} ry={4} fill="#000000" opacity={0.12} />
            <path d="M43 78 Q44 90 50 96 Q56 90 57 78Z" fill="#f6922e" />
            <path d="M46 78 Q47 86 50 90 Q53 86 54 78Z" fill="#fde68a" />
            <path d="M34 56 L20 78 L36 76Z M66 56 L80 78 L64 76Z" fill="#e5484d" {...line("#a8282a", 1.8)} />
            <path d="M50 6 Q70 24 68 78 H32 Q30 24 50 6Z" fill="#f2f6fc" {...line("#8a9ab8", 2)} />
            <path d="M50 6 Q61 15 65 28 H35 Q39 15 50 6Z" fill="#e5484d" {...line("#a8282a", 1.8)} />
            <circle cx={50} cy={46} r={9} fill="#8fd0f6" {...line("#5a8ac0", 2)} />
            <circle cx={47} cy={43} r={2.6} fill="#ffffff" opacity={0.8} />
            <path d="M44 78 V68 H56 V78" fill="none" {...line("#8a9ab8", 1.6)} />
        </g>
    );
}

function Treasure() {
    return (
        <g>
            <ellipse cx={50} cy={90} rx={32} ry={4.5} fill="#000000" opacity={0.12} />
            {/* Otvoren poklopac */}
            <path d="M20 46 Q20 22 50 22 Q80 22 80 46Z" fill="#b0743c" {...line("#7a4d22", 2.2)} />
            <path d="M28 44 Q30 30 50 30 Q70 30 72 44" fill="none" {...line("#e8b84a", 3)} />
            {/* Zlatnici */}
            <circle cx={36} cy={46} r={8} fill="#ffd24a" {...line("#c9971a", 1.8)} />
            <circle cx={52} cy={43} r={9} fill="#ffd24a" {...line("#c9971a", 1.8)} />
            <circle cx={66} cy={47} r={7.5} fill="#ffd24a" {...line("#c9971a", 1.8)} />
            <path d="M52 38 V48 M48.5 43 H55.5" fill="none" {...line("#c9971a", 1.6)} />
            {/* Sanduk */}
            <rect x={18} y={48} width={64} height={38} rx={7} fill="#c98a4b" {...line("#7a4d22", 2.4)} />
            <path d="M18 60 H82" fill="none" {...line("#7a4d22", 1.6)} />
            <rect x={28} y={48} width={7} height={38} fill="#e8b84a" {...line("#a8802a", 1.4)} />
            <rect x={65} y={48} width={7} height={38} fill="#e8b84a" {...line("#a8802a", 1.4)} />
            <rect x={44} y={56} width={12} height={14} rx={3} fill="#e8b84a" {...line("#a8802a", 1.6)} />
            <circle cx={50} cy={62} r={2} fill="#7a4d22" />
            <Shine x={24} y={58} rx={2.4} ry={6} rotate={0} opacity={0.35} />
        </g>
    );
}

const GOALS: Record<ThemeId, () => ReactNode> = { city: Battery, garden: Flower, space: Rocket, sea: Treasure };

export function GoalArt({ theme }: { theme: ThemeId }) {
    const Draw = GOALS[theme];
    return <Draw />;
}

/** Cilj kao mala sličica (kartica sa uputstvom) */
export function GoalIcon({ theme, className }: { theme: ThemeId; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            <GoalArt theme={theme} />
        </svg>
    );
}

// ── Prepreke ──────────────────────────────────────────────────────────────────

const ROCK_TONES: Record<ThemeId, [string, string, string]> = {
    city: ["#b3b9c4", "#737a86", "#9aa1ad"],
    garden: ["#b3b9c4", "#737a86", "#9aa1ad"],
    space: ["#a093c2", "#5f5480", "#8a7cb0"],
    sea: ["#93aaa3", "#5d7670", "#7f9891"],
};

function Rock({ theme }: { theme: ThemeId }) {
    const [fill, edge, shade] = ROCK_TONES[theme];
    return (
        <g>
            <ellipse cx={50} cy={86} rx={34} ry={5} fill="#000000" opacity={0.12} />
            <path d="M16 78 Q12 56 28 44 Q38 26 58 30 Q80 32 85 54 Q90 76 74 82 Q50 88 28 84 Q18 83 16 78Z" fill={fill} {...line(edge, 2.4)} />
            <path d="M24 78 Q40 84 62 82 Q78 80 82 66 Q80 78 66 80 Q44 84 24 78Z" fill={shade} opacity={0.8} />
            <path d="M54 40 L50 52 L58 58" fill="none" {...line(edge, 1.6)} opacity={0.7} />
            <Shine x={36} y={46} rx={4} ry={8} rotate={35} opacity={0.5} />
            {theme === "sea" && (
                <>
                    <path d="M30 46 Q36 40 44 42 Q40 48 30 46Z" fill="#6fae7a" />
                    <path d="M66 38 Q74 38 78 46 Q70 46 66 38Z" fill="#6fae7a" />
                </>
            )}
            {theme === "space" && (
                <>
                    <circle cx={64} cy={60} r={5} fill={shade} {...line(edge, 1.2)} />
                    <circle cx={40} cy={66} r={3.4} fill={shade} {...line(edge, 1.2)} />
                </>
            )}
        </g>
    );
}

function Puddle() {
    return (
        <g>
            <path d="M14 66 Q12 50 32 48 Q44 40 62 46 Q86 46 88 62 Q90 78 66 80 Q46 86 28 80 Q14 76 14 66Z" fill="#7cc4f2" {...line("#3f8fd0", 2.4)} />
            <ellipse cx={46} cy={64} rx={18} ry={7} fill="none" {...line("#ffffff", 2)} opacity={0.6} />
            <ellipse cx={46} cy={64} rx={8} ry={3} fill="none" {...line("#ffffff", 1.6)} opacity={0.5} />
            <path d="M66 54 Q74 54 78 60" fill="none" {...line("#ffffff", 2.4)} opacity={0.7} />
        </g>
    );
}

function Cone() {
    return (
        <g>
            <ellipse cx={50} cy={86} rx={30} ry={4.5} fill="#000000" opacity={0.12} />
            <rect x={20} y={74} width={60} height={11} rx={4} fill="#f2994a" {...line("#c9692a", 2)} />
            <path d="M44 14 Q50 10 56 14 L72 76 H28 Z" fill="#f7a24a" {...line("#c9692a", 2.2)} />
            <path d="M39.5 34 H60.5 L63.5 46 H36.5 Z" fill="#ffffff" />
            <path d="M34 56 H66 L68.6 66 H31.4 Z" fill="#ffffff" />
            <Shine x={44} y={30} rx={2} ry={8} rotate={14} opacity={0.4} />
        </g>
    );
}

function Bush() {
    return (
        <g>
            <ellipse cx={50} cy={86} rx={34} ry={5} fill="#000000" opacity={0.12} />
            <circle cx={30} cy={62} r={18} fill="#5fb15a" {...line("#3d8a3c", 2.2)} />
            <circle cx={70} cy={62} r={18} fill="#5fb15a" {...line("#3d8a3c", 2.2)} />
            <circle cx={50} cy={46} r={22} fill="#6cc25f" {...line("#3d8a3c", 2.2)} />
            <path d="M18 70 Q50 92 82 70 Q78 84 50 84 Q22 84 18 70Z" fill="#4f9e4b" />
            <circle cx={40} cy={44} r={3.6} fill="#e5484d" {...line("#a8282a", 1.2)} />
            <circle cx={60} cy={54} r={3.6} fill="#e5484d" {...line("#a8282a", 1.2)} />
            <circle cx={30} cy={64} r={3.2} fill="#e5484d" {...line("#a8282a", 1.2)} />
            <circle cx={72} cy={66} r={3.2} fill="#e5484d" {...line("#a8282a", 1.2)} />
            <Shine x={42} y={34} rx={3.4} ry={7} rotate={-30} opacity={0.4} />
        </g>
    );
}

function Crater() {
    return (
        <g>
            <ellipse cx={50} cy={60} rx={38} ry={24} fill="#6b75ad" {...line("#3a4170", 2.4)} />
            <ellipse cx={50} cy={63} rx={27} ry={15} fill="#252c58" />
            <path d="M24 56 Q50 38 76 56" fill="none" {...line("#9aa3d8", 3)} opacity={0.7} />
            <circle cx={20} cy={36} r={3.4} fill="#6b75ad" {...line("#3a4170", 1.2)} />
            <circle cx={82} cy={34} r={2.6} fill="#6b75ad" {...line("#3a4170", 1.2)} />
        </g>
    );
}

function Coral() {
    const branch = (d: string) => (
        <>
            <path d={d} fill="none" {...line("#c94f75", 12)} />
            <path d={d} fill="none" {...line("#f57ea0", 7.5)} />
        </>
    );
    return (
        <g>
            <ellipse cx={50} cy={88} rx={26} ry={4.5} fill="#000000" opacity={0.12} />
            {branch("M50 86 V40")}
            {branch("M50 66 Q30 60 28 34")}
            {branch("M50 58 Q70 54 72 28")}
            {branch("M50 48 Q42 36 46 22")}
            <circle cx={36} cy={52} r={2.2} fill="#ffd3e0" />
            <circle cx={64} cy={46} r={2.2} fill="#ffd3e0" />
            <circle cx={52} cy={70} r={2.2} fill="#ffd3e0" />
        </g>
    );
}

export function ObstacleArt({ kind, theme }: { kind: ObstacleId; theme: ThemeId }) {
    switch (kind) {
        case "cone":
            return <Cone />;
        case "puddle":
            return <Puddle />;
        case "bush":
            return <Bush />;
        case "crater":
            return <Crater />;
        case "coral":
            return <Coral />;
        default:
            return <Rock theme={theme} />;
    }
}

// ── Zvezda ────────────────────────────────────────────────────────────────────

const STAR_PATH = "M50 14 L60.6 36.2 L84.8 39.3 L67 56 L71.5 80 L50 68.4 L28.5 80 L33 56 L15.2 39.3 L39.4 36.2 Z";

export function StarArt() {
    return (
        <g>
            <ellipse cx={50} cy={88} rx={20} ry={3.6} fill="#000000" opacity={0.1} />
            <path d={STAR_PATH} fill="#f6c518" {...line("#c9971a", 2.4)} />
            <Shine x={42} y={36} rx={3} ry={7} rotate={30} opacity={0.6} />
            <circle cx={44} cy={50} r={2.2} fill="#7a5a12" />
            <circle cx={56} cy={50} r={2.2} fill="#7a5a12" />
            <path d="M45.5 56 Q50 60 54.5 56" fill="none" {...line("#7a5a12", 1.6)} />
        </g>
    );
}

/** Mala zvezdica (brojač u traci napretka) */
export function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
    return (
        <svg viewBox="10 10 80 76" className={className} aria-hidden="true" focusable="false">
            <path d={STAR_PATH} fill={filled ? "#f6c518" : "#ffffff"} {...line(filled ? "#c9971a" : "#d6c9a0", 4)} />
        </svg>
    );
}

/** Svetlucanje oko cilja kad Robotić stigne */
export function Sparkles({ calm }: { calm: boolean }) {
    const spots: [number, number, number, number][] = [
        [14, 18, 9, 0],
        [86, 24, 7, 0.3],
        [10, 70, 6, 0.6],
        [90, 76, 8, 0.15],
        [50, 4, 6, 0.45],
    ];
    return (
        <g>
            {spots.map(([x, y, r, delay]) => (
                <path
                    key={`${x}-${y}`}
                    d={`M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`}
                    fill="#ffe27a"
                    {...line("#e0a91a", 1.2)}
                    className={calm ? undefined : "cr-twinkle"}
                    style={calm ? undefined : ({ animationDelay: `${delay}s` } as CSSProperties)}
                />
            ))}
        </g>
    );
}

// ── Polja table po temama ─────────────────────────────────────────────────────

export interface ThemeLook {
    frame: string;
    frameEdge: string;
    tile: [string, string];
    tileEdge: string;
    /** Tragovi točkića */
    track: string;
    /** Bledi tragovi plana (lake table) */
    plan: string;
}

export const THEME_LOOK: Record<ThemeId, ThemeLook> = {
    city: { frame: "#a9c1dc", frameEdge: "#7f9cbd", tile: ["#f3f6fa", "#e6edf5"], tileEdge: "#cfd9e6", track: "#6f7f95", plan: "#2f7de6" },
    garden: { frame: "#94c873", frameEdge: "#6fa652", tile: ["#dcf1bf", "#cde9a9"], tileEdge: "#b5d993", track: "#5e8a43", plan: "#2465c4" },
    space: { frame: "#1d2452", frameEdge: "#121838", tile: ["#323d78", "#2b356c"], tileEdge: "#414d8c", track: "#b6c0ff", plan: "#8ff3ff" },
    sea: { frame: "#7ccbd6", frameEdge: "#56a9b6", tile: ["#d6f3f5", "#c5ebef"], tileEdge: "#a9dce3", track: "#3f8c99", plan: "#1f529e" },
};

/** Sitan ukras polja (ista slika za isto polje): busen trave i cvetić, zvezdice, mehurići, pločnik */
function TileDecor({ theme, seed }: { theme: ThemeId; seed: number }) {
    const x = 18 + ((seed * 37) % 50);
    const y = 26 + ((seed * 53) % 46);
    if (theme === "garden") {
        if (seed % 4 === 0) {
            return (
                <g transform={`translate(${x} ${y})`}>
                    {[0, 72, 144, 216, 288].map((deg) => (
                        <ellipse key={deg} cx={0} cy={-4.2} rx={3} ry={4.2} fill="#ffffff" transform={`rotate(${deg})`} opacity={0.9} />
                    ))}
                    <circle r={2.6} fill="#ffd24a" />
                </g>
            );
        }
        return <path d={`M${x - 9} ${y + 7} Q${x - 8} ${y - 2} ${x - 3} ${y - 6} M${x} ${y + 7} Q${x} ${y - 4} ${x + 1} ${y - 10} M${x + 9} ${y + 7} Q${x + 8} ${y - 1} ${x + 4} ${y - 5}`} fill="none" {...line("#8cc46b", 3.4)} />;
    }
    if (theme === "space") {
        const r = 5 + (seed % 3);
        return (
            <g fill="#ffffff">
                <path d={`M${x} ${y - r} Q${x + 1} ${y - 1} ${x + r} ${y} Q${x + 1} ${y + 1} ${x} ${y + r} Q${x - 1} ${y + 1} ${x - r} ${y} Q${x - 1} ${y - 1} ${x} ${y - r}Z`} opacity={0.75} />
                <circle cx={100 - x} cy={100 - y} r={1.6} opacity={0.6} />
            </g>
        );
    }
    if (theme === "sea") {
        // Mehurić sa odsjajem i zrnca peska pri dnu polja
        return (
            <g>
                <circle cx={x} cy={y} r={6.5} fill="#ffffff" fillOpacity={0.35} stroke="#ffffff" strokeWidth={1.8} strokeOpacity={0.9} />
                <circle cx={x - 2.2} cy={y - 2.2} r={1.6} fill="#ffffff" />
                <path d={`M${100 - x - 8} 84 q4 -3 8 0 t8 0`} fill="none" {...line("#9fd3dc", 2.2)} />
            </g>
        );
    }
    return null;
}

export function Tiles({ theme, cols, rows }: { theme: ThemeId; cols: number; rows: number }) {
    const look = THEME_LOOK[theme];
    const cells: ReactNode[] = [];
    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < cols; x += 1) {
            const i = y * cols + x;
            cells.push(
                <g key={i} transform={`translate(${x * CELL} ${y * CELL})`}>
                    <rect x={3} y={3} width={CELL - 6} height={CELL - 6} rx={16} fill={look.tile[(x + y) % 2]} stroke={look.tileEdge} strokeWidth={1.5} />
                    {/* Blag odsjaj gore levo: polja izgledaju kao pločice društvene igre */}
                    <path d="M12 30 Q12 12 30 12 H70" fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={theme === "space" ? 0.12 : 0.55} />
                    {theme === "city" && <path d="M50 10 V90 M10 50 H90" stroke={look.tileEdge} strokeWidth={1.4} opacity={0.6} />}
                    {(i * 7 + 2) % 3 === 0 && <TileDecor theme={theme} seed={i + 1} />}
                </g>
            );
        }
    }
    return (
        <g>
            <rect x={-BOARD_PAD} y={-BOARD_PAD} width={cols * CELL + BOARD_PAD * 2} height={rows * CELL + BOARD_PAD * 2} rx={30} fill={look.frame} stroke={look.frameEdge} strokeWidth={3} />
            {cells}
        </g>
    );
}

/** Start: okrugla „stanica” na kojoj Robotić počinje */
export function StartPad({ theme }: { theme: ThemeId }) {
    const dark = theme === "space";
    return (
        <g>
            <ellipse cx={50} cy={80} rx={34} ry={12} fill={dark ? "#4a5aa0" : "#ffffff"} opacity={0.75} stroke={dark ? "#8ff3ff" : "#85bbfa"} strokeWidth={3} strokeDasharray="7 6" />
        </g>
    );
}

// ── Strelice i petlja ─────────────────────────────────────────────────────────

const ROTATE: Record<Cmd, number> = { up: 0, right: 90, down: 180, left: 270 };

/** Debela obla strelica (dugmad i traka programa) */
export function ArrowGlyph({ dir, className }: { dir: Cmd; className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
            <path
                d="M12 3.2 L20.4 11.8 H15.1 V20.6 H8.9 V11.8 H3.6 Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinejoin="round"
                transform={`rotate(${ROTATE[dir]} 12 12)`}
            />
        </svg>
    );
}

/** Kružna strelica petlje „Ponovi” */
export function LoopGlyph({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19.5 12 A7.5 7.5 0 1 1 15.8 5.5" />
            <path d="M15.2 1.8 L16.2 5.8 L12.2 6.8" />
        </svg>
    );
}
