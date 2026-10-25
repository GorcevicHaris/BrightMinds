// Crteži igre „Lavirint”: vrt sa peščanim stazama i živom ogradom, lik u krugu (portret deteta
// iz slika situacija ili životinja iz igre „Šta jede?”), cilj (kuća, mama, baka ili hrana),
// zvezdice, ključ i vrata. Jedna ćelija lavirinta je CELL × CELL jedinica; sve se crta u SVG-u.

import { useId, type CSSProperties, type ReactNode } from "react";
import { AnimalPicture } from "@/app/components/games/food/animals";
import { FoodPicture } from "@/app/components/games/food/foods";
import { Figure } from "@/app/components/games/scene/figures";
import { cellX, cellY, hintPath, type GuideMode, type Maze, type MazeGoalId, type MazeHeroId, type MazeView } from "@/app/components/games/data/mazeLevels";

/** Veličina ćelije u jedinicama crteža */
export const CELL = 100;
const PATH_W = 70;
const GRASS = "#a9dc8c";
const GRASS_DARK = "#93cc74";
const SAND = "#f7e8c4";
const SAND_EDGE = "#e3c98f";
const HEDGE = "#4f9a3e";
const HEDGE_LIGHT = "#73ba5a";
const TRAIL = "#f59e0b";

const center = (maze: { cols: number }, cell: number): [number, number] => [(cellX(maze, cell) + 0.5) * CELL, (cellY(maze, cell) + 0.5) * CELL];

/** Duži od ćelije do ćelije (za staze, trag i liniju) */
function polyline(maze: { cols: number }, cells: readonly number[]): string {
    return cells.map((cell, i) => `${i === 0 ? "M" : "L"}${center(maze, cell).join(" ")}`).join(" ");
}

// ── Stilovi (pokreti su mirni; uz „Manje animacija” ih nema) ─────────────────

const STYLE = `
.maze-hero { transition: transform 150ms ease-out; }
.maze-bump { animation: maze-bump 360ms ease-in-out; }
@keyframes maze-bump { 0%, 100% { transform: translate(0, 0); } 40% { transform: translate(var(--bx), var(--by)); } }
.maze-hint { animation: maze-hint 1.6s ease-in-out infinite; }
@keyframes maze-hint { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.maze-goal { animation: maze-goal 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 90%; }
@keyframes maze-goal { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@media (prefers-reduced-motion: reduce) { .maze-hero { transition: none; } .maze-bump, .maze-hint, .maze-goal { animation: none; } }
`;

// ── Lik i cilj ────────────────────────────────────────────────────────────────

const KIDS: Partial<Record<MazeHeroId, "amar" | "lejla" | "haris" | "ajla">> = { amar: "amar", lejla: "lejla", haris: "haris", ajla: "ajla" };

/** Portret lika u krugu prečnika 100 (sredina u 50, 50) */
export function HeroPortrait({ hero }: { hero: MazeHeroId }): ReactNode {
    const kid = KIDS[hero];
    if (kid) {
        return (
            <svg x={0} y={0} width={100} height={100} viewBox="-25 -86 50 50" overflow="hidden">
                <Figure id={kid} face="happy" />
            </svg>
        );
    }
    return (
        <svg x={0} y={0} width={100} height={100} viewBox="10 14 80 80" overflow="hidden">
            <AnimalPicture id={hero as Exclude<MazeHeroId, keyof typeof KIDS>} />
        </svg>
    );
}

const FOOD: Partial<Record<MazeGoalId, "carrot" | "bone" | "honey" | "nut" | "fish" | "banana">> = { carrot: "carrot", bone: "bone", honey: "honey", nut: "nut", fish: "fish", banana: "banana" };

/** Kuća sa crvenim krovom, u okviru 100 × 100 (vrata dole u sredini) */
function House() {
    return (
        <g strokeLinejoin="round">
            <rect x={20} y={46} width={60} height={46} rx={4} fill="#f6d28b" stroke="#c89a4a" strokeWidth={2.4} />
            <path d="M12 50 L50 16 L88 50 Z" fill="#e8605a" stroke="#b8433f" strokeWidth={2.6} />
            <rect x={66} y={22} width={9} height={18} fill="#c98e5a" stroke="#9a6a3e" strokeWidth={2} />
            <rect x={42} y={62} width={16} height={30} rx={3} fill="#a8683a" stroke="#7a4a26" strokeWidth={2} />
            <circle cx={54} cy={78} r={1.8} fill="#ffd36b" />
            <rect x={26} y={56} width={12} height={12} rx={2} fill="#cfe8fb" stroke="#c89a4a" strokeWidth={2} />
            <rect x={63} y={56} width={12} height={12} rx={2} fill="#cfe8fb" stroke="#c89a4a" strokeWidth={2} />
        </g>
    );
}

/** Cilj u okviru 100 × 100 */
export function GoalPicture({ goal }: { goal: MazeGoalId }): ReactNode {
    if (goal === "house") return <House />;
    if (goal === "mama" || goal === "baka") {
        return (
            <svg x={0} y={0} width={100} height={100} viewBox="-31 -134 62 62" overflow="hidden">
                <Figure id={goal} face="happy" pose="wave" />
            </svg>
        );
    }
    const food = FOOD[goal] ?? "carrot";
    return (
        <svg x={6} y={6} width={88} height={88} viewBox="0 0 100 100">
            <FoodPicture id={food} />
        </svg>
    );
}

// ── Sitni crteži ──────────────────────────────────────────────────────────────

function StarShape({ r = 26, fill = "#ffcd4d", stroke = "#d97f06" }: { r?: number; fill?: string; stroke?: string }) {
    const points = Array.from({ length: 10 }, (_, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r : r * 0.48;
        return `${(Math.cos(angle) * rr).toFixed(2)},${(Math.sin(angle) * rr).toFixed(2)}`;
    }).join(" ");
    return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={3} strokeLinejoin="round" />;
}

/** Zlatni ključ, sredina u (0, 0) */
export function KeyShape({ s = 1 }: { s?: number }) {
    return (
        <g transform={`scale(${s})`} strokeLinejoin="round" strokeLinecap="round">
            <circle cx={-14} cy={0} r={12} fill="#ffcd4d" stroke="#b77806" strokeWidth={3.4} />
            <circle cx={-14} cy={0} r={4.5} fill="#f7e8c4" stroke="#b77806" strokeWidth={2.4} />
            <path d="M-2 0 H26 M16 0 V10 M24 0 V8" fill="none" stroke="#b77806" strokeWidth={9} />
            <path d="M-2 0 H26 M16 0 V10 M24 0 V8" fill="none" stroke="#ffcd4d" strokeWidth={4.5} />
        </g>
    );
}

/** Vrata preko prolaza između dve ćelije: zaključana (sa ključaonicom) ili otvorena (uz ivicu) */
function Door({ maze, door, open, unlocked }: { maze: Maze; door: [number, number]; open: boolean; unlocked: boolean }) {
    const [ax, ay] = center(maze, door[0]);
    const [bx, by] = center(maze, door[1]);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const vertical = ax !== bx; // prolaz levo-desno: vrata stoje uspravno
    const rot = vertical ? 90 : 0;
    if (open) {
        // Otvorena vrata leže uz ivicu staze
        return (
            <g transform={`translate(${mx} ${my}) rotate(${rot})`} opacity={0.9}>
                <rect x={-PATH_W / 2 - 4} y={-6} width={14} height={40} rx={4} fill="#c98e5a" stroke="#7a4a26" strokeWidth={2.4} transform={`rotate(-12 ${-PATH_W / 2} -6)`} />
            </g>
        );
    }
    return (
        <g transform={`translate(${mx} ${my}) rotate(${rot})`}>
            <rect x={-PATH_W / 2 - 6} y={-11} width={PATH_W + 12} height={22} rx={5} fill="#b9773f" stroke="#7a4a26" strokeWidth={3} />
            <path d={`M${-PATH_W / 6} -11 V11 M${PATH_W / 6} -11 V11`} stroke="#8f5a2c" strokeWidth={2} />
            {/* Kad lik ima ključ, ključaonica zasvetli zlatno */}
            {unlocked && <circle cx={0} cy={1} r={10} fill="#ffcd4d" opacity={0.85} />}
            <circle cx={0} cy={-2} r={5} fill="#3b2a1f" />
            <path d="M-2.5 0 L-3.5 8 H3.5 L2.5 0Z" fill="#3b2a1f" />
        </g>
    );
}

// ── Tabla ─────────────────────────────────────────────────────────────────────

interface BoardProps {
    view: MazeView;
    calm: boolean;
    /** Smer kratkog „udarca” u zid (menja se `bump.key` pri svakom udarcu) */
    bump: { dir: "N" | "E" | "S" | "W"; key: number } | null;
    /** Lik je uhvaćen (prst ga vodi) */
    held: boolean;
}

/** Koliko se vidi linija koja pokazuje put */
const GUIDE_OPACITY: Record<GuideMode, number> = { full: 0.95, faint: 0.42, start: 0.95, none: 0 };
/** „start”: linija samo prvih nekoliko ćelija */
const GUIDE_START_CELLS = 4;

function Dots({ d, color, edge, opacity, className }: { d: string; color: string; edge: string; opacity: number; className?: string }) {
    return (
        <g className={className} opacity={opacity}>
            <path d={d} fill="none" stroke={edge} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.1 26" />
            <path d={d} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0.1 26" />
        </g>
    );
}

export function MazeBoardArt({ view, calm, bump, held }: BoardProps) {
    const clip = `maze-hero-${useId().replace(/:/g, "")}`;
    const maze = view.maze;
    if (!maze) return null;
    const width = maze.cols * CELL;
    const height = maze.rows * CELL;
    const cells = maze.open.map((bits, cell) => ({ bits, cell })).filter((c) => c.bits !== 0);
    const full = cells.length === maze.cols * maze.rows;

    // Prolazi (desno i dole, da se svaki crta jednom) i zidovi između susednih ćelija staze
    const passages: string[] = [];
    const hedges: string[] = [];
    for (const { bits, cell } of cells) {
        const [x, y] = center(maze, cell);
        const cx = cellX(maze, cell);
        const cy = cellY(maze, cell);
        if (bits & 2) passages.push(`M${x} ${y} L${x + CELL} ${y}`);
        if (bits & 4) passages.push(`M${x} ${y} L${x} ${y + CELL}`);
        if (full) {
            // Cela ivica ćelije: susedni delovi se spajaju u neprekidnu ogradu
            if (cx < maze.cols - 1 && !(bits & 2)) hedges.push(`M${(cx + 1) * CELL} ${cy * CELL} V${(cy + 1) * CELL}`);
            if (cy < maze.rows - 1 && !(bits & 4)) hedges.push(`M${cx * CELL} ${(cy + 1) * CELL} H${(cx + 1) * CELL}`);
        }
    }
    const dots = cells.map(({ cell }) => center(maze, cell));

    const guideCells = view.guide === "start" ? maze.solution.slice(0, GUIDE_START_CELLS) : maze.solution;
    const hint = view.hint && view.feedback !== "correct" ? hintPath(view) : [];
    const [hx, hy] = center(maze, view.pos);
    const [gx, gy] = center(maze, maze.goal);
    const offset = { N: [0, -14], E: [14, 0], S: [0, 14], W: [-14, 0] } as const;
    const bumpStyle = bump && !calm ? ({ "--bx": `${offset[bump.dir][0]}px`, "--by": `${offset[bump.dir][1]}px` } as CSSProperties) : undefined;

    return (
        <>
            <style>{STYLE}</style>
            {/* Trava i busenje (uvek na istom mestu, iz broja ćelije) */}
            <rect width={width} height={height} rx={28} fill={GRASS} />
            {maze.open.map((bits, cell) =>
                bits === 0 || full ? null : (
                    <g key={`tuft-${cell}`} transform={`translate(${center(maze, cell).join(" ")})`} fill={GRASS_DARK}>
                        <circle cx={-18 + (cell % 3) * 8} cy={-10} r={9} />
                        <circle cx={14} cy={12 - (cell % 2) * 10} r={7} />
                        {cell % 4 === 1 && <circle cx={-6} cy={18} r={5} fill="#f6f1ff" />}
                        {cell % 4 === 3 && <circle cx={20} cy={-16} r={5} fill="#ffd36b" />}
                    </g>
                )
            )}

            {/* Peščane staze sa tamnijom ivicom */}
            <g strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d={passages.join(" ")} stroke={SAND_EDGE} strokeWidth={PATH_W + 8} />
                {dots.map(([x, y], i) => (
                    <circle key={`edge-${i}`} cx={x} cy={y} r={(PATH_W + 8) / 2} fill={SAND_EDGE} />
                ))}
                <path d={passages.join(" ")} stroke={SAND} strokeWidth={PATH_W} />
                {dots.map(([x, y], i) => (
                    <circle key={`sand-${i}`} cx={x} cy={y} r={PATH_W / 2} fill={SAND} />
                ))}
            </g>

            {/* Živa ograda između staza koje nisu spojene */}
            {hedges.length > 0 && (
                <g fill="none" strokeLinecap="round">
                    <path d={hedges.join(" ")} stroke={HEDGE} strokeWidth={18} />
                    <path d={hedges.join(" ")} stroke={HEDGE_LIGHT} strokeWidth={7} strokeDasharray="10 16" transform="translate(-2 -2)" />
                </g>
            )}

            {/* Isprekidana linija koja pokazuje put (bledi kroz nivoe) */}
            {GUIDE_OPACITY[view.guide] > 0 && guideCells.length > 1 && <Dots d={polyline(maze, guideCells)} color="#ffb920" edge="#b77806" opacity={GUIDE_OPACITY[view.guide]} />}

            {/* Trag: put koji je lik već prešao */}
            {view.trail.length > 1 && <path d={polyline(maze, view.trail)} fill="none" stroke={TRAIL} strokeOpacity={0.5} strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />}

            {/* Pomoć: linija od lika do sledećeg cilja */}
            {hint.length > 1 && <Dots d={polyline(maze, hint)} color="#8a82f7" edge="#4937c6" opacity={1} className={calm ? undefined : "maze-hint"} />}

            {/* Zvezdice koje još nisu skupljene */}
            {maze.stars
                .filter((star) => !view.starsGot.includes(star))
                .map((star) => (
                    <g key={`star-${star}`} transform={`translate(${center(maze, star).join(" ")})`}>
                        <StarShape />
                    </g>
                ))}

            {/* Ključ (dok ga lik nije uzeo) */}
            {maze.key !== null && !view.hasKey && (
                <g transform={`translate(${center(maze, maze.key).join(" ")}) rotate(-20)`}>
                    <KeyShape />
                </g>
            )}

            {maze.door && <Door maze={maze} door={maze.door} open={view.doorOpen} unlocked={view.hasKey} />}

            {/* Cilj na svom podmetaču */}
            <g data-maze="goal" transform={`translate(${gx - 50} ${gy - 50})`}>
                <circle cx={50} cy={50} r={44} fill="#fff1c2" stroke="#f5c451" strokeWidth={3} opacity={0.95} />
                <g className={calm || view.feedback === "correct" ? undefined : "maze-goal"}>
                    <GoalPicture goal={view.goal} />
                </g>
            </g>

            {/* Lik u krugu; klizi od ćelije do ćelije */}
            <g className={calm ? undefined : "maze-hero"} style={{ transform: `translate(${hx}px, ${hy}px)` }}>
                <g key={bump?.key ?? 0} className={bumpStyle ? "maze-bump" : undefined} style={bumpStyle}>
                    <g data-maze="hero" transform={held ? "scale(1.08)" : undefined}>
                        <circle r={43} fill="#000000" opacity={0.12} cy={5} />
                        <circle r={42} fill="#fdf3d8" stroke={held ? "#6c61f0" : "#f59e0b"} strokeWidth={6} />
                        <clipPath id={clip}>
                            <circle r={37} />
                        </clipPath>
                        <g clipPath={`url(#${clip})`}>
                            <g transform="translate(-50 -50)">
                                <HeroPortrait hero={view.hero} />
                            </g>
                        </g>
                        {view.hasKey && (
                            <g transform="translate(30 -32)">
                                <circle r={17} fill="#ffffff" stroke="#b77806" strokeWidth={3} />
                                <g transform="rotate(-35)">
                                    <KeyShape s={0.5} />
                                </g>
                            </g>
                        )}
                    </g>
                </g>
            </g>
        </>
    );
}

/** Zvezdica za brojač iznad table (u istom stilu kao na tabli) */
export function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
    return (
        <svg viewBox="-30 -30 60 60" className={className} aria-hidden="true">
            <StarShape fill={filled ? "#ffcd4d" : "#ffffff"} stroke={filled ? "#d97f06" : "#c9c4e6"} />
        </svg>
    );
}

/** Ključ za oznaku iznad table */
export function KeyIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="-30 -20 60 40" className={className} aria-hidden="true">
            <KeyShape s={0.85} />
        </svg>
    );
}

/** Cilj kao mala slika (uputstvo) */
export function GoalIcon({ goal, className }: { goal: MazeGoalId; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
            <GoalPicture goal={goal} />
        </svg>
    );
}
