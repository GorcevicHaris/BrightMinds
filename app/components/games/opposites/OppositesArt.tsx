// Crteži igre „Suprotnosti”. Svaki par je ista stvar na dva kraja osobine (velika i mala lopta,
// puna i prazna čaša), nacrtana u istom kvadratu 100 × 100, da se razlikuje samo ono o čemu
// je zadatak. Gde god može, koriste se postojeće slike (pictures/) — iste lopte, mede i
// životinje koje dete zna iz drugih igara; ovde su samo nove stvari i prizori (vrata, kula od
// kocaka, prozor danju i noću, blato na majici…).

import type { ReactNode } from "react";
import { EmotionFeatures } from "@/app/components/games/EmotionFace";
import { FaceBase } from "@/app/components/games/faceParts";
import { Picture, type PictureId } from "@/app/components/games/pictures";
import { INK, line, Shine } from "@/app/components/games/pictures/kit";
import { Figure } from "@/app/components/games/scene/figures";

/** Postojeća slika u delu kvadrata */
export const P = (id: PictureId, x: number, y: number, w: number, h = w) => <Picture id={id} x={x} y={y} width={w} height={h} />;

/** Senka na tlu */
const Ground = ({ y = 92, rx = 30, cx = 50 }: { y?: number; rx?: number; cx?: number }) => <ellipse cx={cx} cy={y} rx={rx} ry={3.2} fill="#1f1b3a" opacity={0.08} />;

/** Ista slika velika (ceo kvadrat) ili mala (na tlu u sredini) */
function sized(id: PictureId, large: boolean): ReactNode {
    return large ? (
        <>
            <Ground y={95} rx={34} />
            {P(id, 5, 4, 90)}
        </>
    ) : (
        <>
            <Ground y={93} rx={17} />
            {P(id, 31, 52, 38)}
        </>
    );
}
const big = (id: PictureId) => () => sized(id, true);
const small = (id: PictureId) => () => sized(id, false);

/** Blato: smeđe mrlje preko slike */
function Mud({ spots }: { spots: readonly [number, number, number][] }) {
    return (
        <g>
            {spots.map(([x, y, r], i) => (
                <g key={i}>
                    <ellipse cx={x} cy={y} rx={r} ry={r * 0.78} fill="#8a5a2b" opacity={0.92} transform={`rotate(${(i * 37) % 60 - 30} ${x} ${y})`} />
                    <circle cx={x + r * 1.1} cy={y - r * 0.6} r={r * 0.32} fill="#8a5a2b" opacity={0.85} />
                </g>
            ))}
        </g>
    );
}

/** Crte brzine iza onoga što juri */
function Speed({ y = 50, x = 4 }: { y?: number; x?: number }) {
    return (
        <g {...line("#8fb4e8", 3.4)}>
            <path d={`M${x} ${y - 12} L${x + 18} ${y - 12}`} />
            <path d={`M${x - 2} ${y} L${x + 22} ${y}`} />
            <path d={`M${x} ${y + 12} L${x + 16} ${y + 12}`} />
        </g>
    );
}

/** Para iznad toplog */
function Steam({ x = 50, y = 30 }: { x?: number; y?: number }) {
    return (
        <g fill="none" {...line("#c9b8a8", 2.6)} opacity={0.9}>
            <path d={`M${x - 10} ${y} q-5 -7 0 -13 q5 -6 0 -13`} />
            <path d={`M${x} ${y - 2} q-5 -7 0 -13 q5 -6 0 -13`} />
            <path d={`M${x + 10} ${y} q-5 -7 0 -13 q5 -6 0 -13`} />
        </g>
    );
}

function Glass({ full }: { full: boolean }) {
    return (
        <>
            <Ground y={93} rx={20} />
            {full && <path d="M34 30 L66 30 L62 86 Q50 90 38 86Z" fill="#f59e42" />}
            {full && <path d="M34 30 L66 30 L65.5 36 L34.5 36Z" fill="#ffc278" />}
            {!full && <path d="M36 84 Q50 88 64 84 L63.6 86 Q50 90 36.4 86Z" fill="#cfe9f7" />}
            <path d="M30 16 L70 16 L63 88 Q50 92 37 88Z" fill="#e8f6fd" fillOpacity={full ? 0.25 : 0.55} {...line("#7fb6d6", 2.4)} />
            <path d="M36 22 L39 80" {...line("#ffffff", 3)} opacity={0.75} />
            {full && <path d="M58 6 L54 40" {...line("#e85a8a", 3.6)} />}
        </>
    );
}

function Basket() {
    return (
        <>
            <Ground y={93} rx={36} />
            <path d="M20 50 Q50 2 80 50" fill="none" {...line("#9a6a35", 6)} />
            <ellipse cx={50} cy={50} rx={38} ry={8} fill="#7a4a22" />
            <path d="M12 50 L88 50 L79 88 Q50 95 21 88Z" fill="#d9a35f" {...line("#9a6a35", 2.4)} />
            <g {...line("#b7834a", 2)}>
                <path d="M15 62 L85 62 M18 75 L82 75" />
                <path d="M30 51 L33 90 M50 51 L50 92 M70 51 L67 90" />
            </g>
            <rect x={10} y={46} width={80} height={8} rx={4} fill="#c38a48" {...line("#9a6a35", 2)} />
        </>
    );
}

function Door({ open }: { open: boolean }) {
    return (
        <>
            <rect x={6} y={93} width={88} height={4} rx={2} fill="#d9c7b0" />
            <rect x={22} y={6} width={56} height={89} rx={3} fill="#8b5e3c" />
            {open ? (
                <>
                    <rect x={27} y={11} width={46} height={84} fill="#fff3c4" />
                    <path d="M27 72 L73 72 L73 95 L27 95Z" fill="#f3d98b" />
                    <rect x={56} y={26} width={12} height={18} rx={2} fill="#ffffff" opacity={0.7} />
                    <path d="M27 11 L10 4 L10 100 L27 95Z" fill="#c98a4b" {...line("#8b5e3c", 2)} />
                    <circle cx={14} cy={55} r={2.6} fill="#f6c518" stroke="#a87b10" strokeWidth={1} />
                </>
            ) : (
                <>
                    <rect x={27} y={11} width={46} height={84} fill="#c98a4b" {...line("#8b5e3c", 2)} />
                    <rect x={33} y={18} width={34} height={28} rx={3} fill="none" {...line("#a8703a", 2.2)} />
                    <rect x={33} y={54} width={34} height={34} rx={3} fill="none" {...line("#a8703a", 2.2)} />
                    <circle cx={66} cy={52} r={3.2} fill="#f6c518" stroke="#a87b10" strokeWidth={1.2} />
                </>
            )}
        </>
    );
}

function Box({ open }: { open: boolean }) {
    return (
        <>
            <Ground y={93} rx={38} />
            {open && (
                <>
                    {P("ball", 36, 22, 30)}
                    {P("teddy", 18, 20, 28)}
                    <path d="M16 46 L4 30 L40 30 L50 46Z" fill="#e8c38a" {...line("#a8703a", 2)} />
                    <path d="M84 46 L96 30 L60 30 L50 46Z" fill="#e8c38a" {...line("#a8703a", 2)} />
                </>
            )}
            <path d="M16 46 L84 46 L84 90 L16 90Z" fill="#d9a35f" {...line("#a8703a", 2.4)} />
            {open ? (
                <path d="M16 46 L84 46" {...line("#7a4a22", 3)} />
            ) : (
                <>
                    <path d="M16 46 L28 30 L96 30 L84 46Z" fill="#e8c38a" {...line("#a8703a", 2.4)} />
                    <path d="M84 46 L96 30 L96 74 L84 90Z" fill="#c38a48" {...line("#a8703a", 2.4)} />
                    <path d="M44 30 L32 46 L32 60 L44 60 L44 46 L56 30Z" fill="#f2e2b8" opacity={0.9} />
                </>
            )}
        </>
    );
}

function Cup() {
    return (
        <>
            <Ground y={92} rx={34} />
            <ellipse cx={50} cy={86} rx={36} ry={7} fill="#ffffff" {...line("#b9b2d8", 2)} />
            <path d="M22 46 L78 46 L72 80 Q50 88 28 80Z" fill="#e86a6a" {...line("#b94848", 2.4)} />
            <path d="M78 54 Q92 56 88 68 Q84 76 74 72" fill="none" {...line("#b94848", 4)} />
            <ellipse cx={50} cy={46} rx={28} ry={6} fill="#b8743c" {...line("#b94848", 2)} />
            <Shine x={33} y={60} rx={3} ry={8} rotate={10} />
            <Steam x={50} y={38} />
        </>
    );
}

function Soup() {
    return (
        <>
            <Ground y={92} rx={36} />
            <path d="M12 50 Q14 88 50 88 Q86 88 88 50Z" fill="#6cc0e8" {...line("#3f8fb8", 2.4)} />
            <ellipse cx={50} cy={50} rx={38} ry={9} fill="#f3b04a" {...line("#3f8fb8", 2)} />
            <circle cx={40} cy={49} r={3} fill="#e86a3a" />
            <circle cx={58} cy={51} r={2.6} fill="#5aa848" />
            <circle cx={50} cy={47} r={2.2} fill="#e86a3a" />
            <Steam x={50} y={38} />
        </>
    );
}

function IceCubes() {
    const cube = (x: number, y: number, s: number, r = 0) => (
        <g transform={`rotate(${r} ${x + s / 2} ${y + s / 2})`}>
            <rect x={x} y={y} width={s} height={s} rx={s * 0.18} fill="#d8f0fb" {...line("#7fb6d6", 2.2)} />
            <path d={`M${x + s * 0.2} ${y + s * 0.25} L${x + s * 0.2} ${y + s * 0.6}`} {...line("#ffffff", 3)} />
            <circle cx={x + s * 0.7} cy={y + s * 0.3} r={s * 0.08} fill="#ffffff" />
        </g>
    );
    return (
        <>
            <Ground y={92} rx={36} />
            {cube(14, 50, 36, -8)}
            {cube(50, 52, 36, 6)}
            {cube(30, 18, 36, 3)}
            <g fill="#a8dcf2">
                <path d="M86 26 l3 6 l6 3 l-6 3 l-3 6 l-3 -6 l-6 -3 l6 -3z" />
                <path d="M10 22 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2z" />
            </g>
        </>
    );
}

function Window({ night }: { night: boolean }) {
    return (
        <>
            <rect x={10} y={8} width={80} height={80} rx={6} fill={night ? "#2b2f6b" : "#aee0fa"} />
            {night ? (
                <>
                    <path d="M62 22 A13 13 0 1 0 72 44 A10 10 0 1 1 62 22Z" fill="#fff3b0" />
                    <g fill="#fff3b0">
                        <circle cx={26} cy={24} r={1.8} />
                        <circle cx={40} cy={36} r={1.4} />
                        <circle cx={30} cy={50} r={1.6} />
                        <circle cx={78} cy={60} r={1.4} />
                    </g>
                </>
            ) : (
                <>
                    <circle cx={66} cy={30} r={11} fill="#f6c518" />
                    <g {...line("#f6c518", 2.6)}>
                        <path d="M66 12 L66 15 M66 45 L66 48 M48 30 L51 30 M81 30 L84 30 M53 17 L55 19 M77 41 L79 43 M53 43 L55 41 M77 19 L79 17" />
                    </g>
                    <path d="M18 46 q4 -8 12 -5 q4 -7 12 -2 q6 0 6 6 q-2 5 -8 5 l-18 0 q-6 0 -4 -4z" fill="#ffffff" />
                </>
            )}
            <path d={`M10 70 Q30 62 50 70 Q70 78 90 68 L90 88 L10 88Z`} fill={night ? "#2f5a3a" : "#7cc56a"} />
            <rect x={10} y={8} width={80} height={80} rx={6} fill="none" {...line("#c9b8a8", 5)} />
            <path d="M50 8 L50 88 M10 48 L90 48" {...line("#c9b8a8", 4)} />
            <rect x={4} y={86} width={92} height={7} rx={3} fill="#e6dccf" />
        </>
    );
}

function Sky({ night }: { night: boolean }) {
    return (
        <>
            <rect x={4} y={4} width={92} height={92} rx={14} fill={night ? "#262a62" : "#bfe6fb"} />
            {night ? (
                <>
                    <path d="M58 16 A16 16 0 1 0 70 44 A12 12 0 1 1 58 16Z" fill="#fff3b0" />
                    <g fill="#fff3b0">
                        <path d="M22 22 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2z" />
                        <circle cx={38} cy={40} r={1.6} />
                        <circle cx={82} cy={22} r={1.6} />
                        <circle cx={18} cy={48} r={1.4} />
                    </g>
                </>
            ) : (
                <>
                    <circle cx={64} cy={30} r={14} fill="#f6c518" />
                    <g {...line("#f6c518", 3)}>
                        <path d="M64 8 L64 12 M64 48 L64 52 M42 30 L46 30 M82 30 L86 30 M48 14 L51 17 M77 43 L80 46 M48 46 L51 43 M77 17 L80 14" />
                    </g>
                </>
            )}
            <path d="M4 66 Q30 52 56 64 Q78 74 96 60 L96 82 Q96 96 82 96 L18 96 Q4 96 4 82Z" fill={night ? "#2f5a3a" : "#7cc56a"} />
            <path d="M4 78 Q40 70 96 80 L96 82 Q96 96 82 96 L18 96 Q4 96 4 82Z" fill={night ? "#284d33" : "#5fae4f"} />
        </>
    );
}

function Town({ night }: { night: boolean }) {
    const win = night ? "#ffd75a" : "#cfeefc";
    return (
        <>
            <rect x={4} y={4} width={92} height={92} rx={14} fill={night ? "#262a62" : "#bfe6fb"} />
            {night ? <path d="M78 14 A10 10 0 1 0 86 30 A8 8 0 1 1 78 14Z" fill="#fff3b0" /> : <circle cx={80} cy={22} r={9} fill="#f6c518" />}
            <path d="M4 80 L96 80 L96 82 Q96 96 82 96 L18 96 Q4 96 4 82Z" fill={night ? "#2f5a3a" : "#7cc56a"} />
            <path d="M18 46 L44 24 L70 46Z" fill="#d9584a" {...line("#a8392b", 2)} />
            <rect x={22} y={46} width={44} height={36} fill={night ? "#c9b39a" : "#f4e1c4"} {...line("#a8703a", 2)} />
            <rect x={28} y={52} width={12} height={11} rx={1.5} fill={win} {...line("#a8703a", 1.6)} />
            <rect x={48} y={52} width={12} height={11} rx={1.5} fill={win} {...line("#a8703a", 1.6)} />
            <rect x={39} y={66} width={10} height={16} rx={1.5} fill="#8b5e3c" />
            {night && <path d="M28 63 L40 63 L46 80 L22 80Z" fill="#ffd75a" opacity={0.18} />}
            {!night && (
                <>
                    <circle cx={80} cy={70} r={3.4} fill="#e86a8a" />
                    <path d="M80 73 L80 80" {...line("#3f8a4a", 1.6)} />
                    <circle cx={88} cy={72} r={3} fill="#f6c518" />
                    <path d="M88 75 L88 80" {...line("#3f8a4a", 1.6)} />
                </>
            )}
            {night && (
                <g fill="#fff3b0">
                    <circle cx={14} cy={18} r={1.5} />
                    <circle cx={32} cy={12} r={1.3} />
                    <circle cx={58} cy={16} r={1.5} />
                </g>
            )}
        </>
    );
}

function Tower({ blocks }: { blocks: number }) {
    const colors = ["#e8604a", "#f6c518", "#5aa8e8", "#5fbf6a", "#a87be8"];
    const s = 16.5;
    return (
        <>
            <rect x={14} y={92} width={72} height={4} rx={2} fill="#d9c7b0" />
            {Array.from({ length: blocks }, (_, i) => {
                const y = 92 - (i + 1) * s;
                const x = 50 - s / 2 + (i % 2 === 0 ? -1 : 1);
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={s} height={s} rx={2.5} fill={colors[i % colors.length]} {...line("#1f1b3a", 1.2)} strokeOpacity={0.35} />
                        <rect x={x + 2.5} y={y + 2.5} width={4} height={4} rx={1} fill="#ffffff" opacity={0.45} />
                    </g>
                );
            })}
        </>
    );
}

function Tree({ tall }: { tall: boolean }) {
    return tall ? (
        <>
            <Ground y={94} rx={22} />
            <rect x={45} y={40} width={10} height={54} rx={3} fill="#9a6a3a" />
            <ellipse cx={50} cy={30} rx={22} ry={26} fill="#5fae4f" />
            <ellipse cx={40} cy={22} rx={11} ry={12} fill="#7cc56a" />
            <ellipse cx={58} cy={38} rx={12} ry={11} fill="#4f9a42" />
        </>
    ) : (
        <>
            <Ground y={94} rx={22} />
            <rect x={46} y={78} width={8} height={16} rx={2} fill="#9a6a3a" />
            <ellipse cx={50} cy={72} rx={18} ry={13} fill="#5fae4f" />
            <ellipse cx={43} cy={68} rx={8} ry={6} fill="#7cc56a" />
        </>
    );
}

function Pencil({ long }: { long: boolean }) {
    const x0 = long ? 6 : 34;
    const x1 = long ? 82 : 58;
    return (
        <g transform="rotate(-8 50 50)">
            <path d={`M${x1} 42 L${x1 + 12} 50 L${x1} 58Z`} fill="#f4d7a8" {...line("#a8703a", 1.6)} />
            <path d={`M${x1 + 7} 46.5 L${x1 + 12} 50 L${x1 + 7} 53.5Z`} fill={INK} />
            <rect x={x0 + 8} y={42} width={x1 - x0 - 8} height={16} fill="#f6c518" {...line("#c9971a", 1.6)} />
            <path d={`M${x0 + 8} 47.5 L${x1} 47.5 M${x0 + 8} 52.5 L${x1} 52.5`} {...line("#e0ac14", 1.4)} />
            <rect x={x0 + 3} y={42} width={6} height={16} fill="#c9c9d6" {...line("#8a8aa0", 1.2)} />
            <rect x={x0} y={42} width={5} height={16} rx={2.5} fill="#f29bb0" {...line("#c86a84", 1.2)} />
        </g>
    );
}

function Caterpillar({ segments }: { segments: number }) {
    const r = 9;
    const step = 13;
    const width = (segments - 1) * step;
    const start = 50 - width / 2 - 6;
    return (
        <>
            <Ground y={72} rx={Math.max(18, width / 2 + 16)} />
            {Array.from({ length: segments }, (_, i) => {
                const x = start + i * step;
                const y = 60 + (i % 2 === 0 ? 0 : -3);
                return (
                    <g key={i}>
                        <circle cx={x} cy={y} r={r} fill={i % 2 === 0 ? "#7cc56a" : "#9ad66a"} {...line("#4f9a42", 1.6)} />
                        <path d={`M${x - 3} ${y + 8} l-1 5 M${x + 3} ${y + 8} l1 5`} {...line("#4f9a42", 1.8)} />
                    </g>
                );
            })}
            {/* Glava */}
            <g transform={`translate(${start + segments * step} 52)`}>
                <circle r={11} fill="#7cc56a" {...line("#4f9a42", 1.8)} />
                <circle cx={-3} cy={-2} r={2.2} fill={INK} />
                <circle cx={4} cy={-2} r={2.2} fill={INK} />
                <path d="M-3 4 Q0.5 7 4 4" fill="none" {...line(INK, 1.4)} />
                <path d="M-4 -10 L-7 -17 M3 -10 L5 -17" {...line("#4f9a42", 1.6)} />
                <circle cx={-7} cy={-18} r={1.8} fill="#e8604a" />
                <circle cx={5} cy={-18} r={1.8} fill="#e8604a" />
            </g>
        </>
    );
}

function Train({ wagons }: { wagons: number }) {
    const w = 20;
    const total = 26 + wagons * (w + 3);
    const x0 = 50 - total / 2;
    return (
        <>
            <rect x={4} y={74} width={92} height={3} rx={1.5} fill="#a89f96" />
            <g {...line("#8a847c", 1.4)}>
                {Array.from({ length: 12 }, (_, i) => (
                    <path key={i} d={`M${8 + i * 7.6} 77 L${8 + i * 7.6} 80`} />
                ))}
            </g>
            {Array.from({ length: wagons }, (_, i) => {
                const x = x0 + 26 + 3 + i * (w + 3);
                const colors = ["#5aa8e8", "#f6c518", "#5fbf6a", "#a87be8"];
                return (
                    <g key={i}>
                        <rect x={x} y={52} width={w} height={18} rx={3} fill={colors[i % colors.length]} {...line("#1f1b3a", 1.2)} strokeOpacity={0.35} />
                        <rect x={x + 4} y={56} width={12} height={6} rx={1.5} fill="#ffffff" opacity={0.8} />
                        <circle cx={x + 5} cy={72} r={3.2} fill="#3b3b4b" />
                        <circle cx={x + w - 5} cy={72} r={3.2} fill="#3b3b4b" />
                    </g>
                );
            })}
            <g>
                <rect x={x0} y={46} width={26} height={24} rx={3} fill="#e8604a" {...line("#a8392b", 1.4)} />
                <rect x={x0 + 2} y={38} width={13} height={14} rx={2} fill="#e8604a" {...line("#a8392b", 1.4)} />
                <rect x={x0 + 4} y={41} width={9} height={7} rx={1.5} fill="#ffffff" opacity={0.85} />
                <rect x={x0 + 18} y={36} width={6} height={10} rx={1} fill="#3b3b4b" />
                <circle cx={x0 + 7} cy={72} r={4} fill="#3b3b4b" />
                <circle cx={x0 + 19} cy={72} r={4} fill="#3b3b4b" />
                <circle cx={x0 + 24} cy={30} r={3} fill="#e6e1ee" opacity={0.85} />
                <circle cx={x0 + 28} cy={24} r={4} fill="#e6e1ee" opacity={0.7} />
            </g>
        </>
    );
}

/** Prizor gore/dole: nebo, trava i ista stvar gore ili dole */
function UpDown({ up, thing }: { up: boolean; thing: "balloon" | "bird" | "kite" }) {
    return (
        <>
            <rect x={4} y={4} width={92} height={92} rx={14} fill="#d6effc" />
            <path d="M4 76 Q50 68 96 76 L96 82 Q96 96 82 96 L18 96 Q4 96 4 82Z" fill="#7cc56a" />
            {thing === "bird" && (
                <>
                    <rect x={70} y={6} width={9} height={90} rx={3} fill="#9a6a3a" />
                    <path d="M74 26 L30 22" {...line("#9a6a3a", 5)} />
                    <ellipse cx={34} cy={18} rx={8} ry={4} fill="#5fae4f" />
                    <ellipse cx={86} cy={14} rx={12} ry={10} fill="#5fae4f" />
                </>
            )}
            {thing === "balloon" && (up ? <path d="M50 42 Q46 56 52 70 Q56 80 50 92" fill="none" {...line("#8a82a8", 1.4)} /> : null)}
            {thing === "balloon" && (up ? P("balloon", 30, 6, 40) : P("balloon", 34, 58, 32))}
            {thing === "bird" && (up ? P("bird", 26, 0, 26) : P("bird", 30, 64, 28))}
            {thing === "kite" && (up ? P("kite", 28, 6, 42) : P("kite", 30, 60, 34))}
            {thing === "kite" && up && <path d="M50 46 Q40 64 54 80 Q60 88 56 94" fill="none" {...line("#8a82a8", 1.4)} />}
        </>
    );
}

function Stone() {
    return (
        <>
            <Ground y={88} rx={40} />
            <path d="M10 84 Q4 54 26 40 Q46 26 70 34 Q94 44 92 70 Q90 88 70 88 L22 88 Q12 88 10 84Z" fill="#a9a29a" {...line("#7a746c", 2.4)} />
            <path d="M28 52 Q36 44 48 46" fill="none" {...line("#c9c3bb", 4)} />
            <path d="M60 70 Q66 74 74 70" fill="none" {...line("#8a847c", 2)} />
        </>
    );
}

function Feather() {
    return (
        <g transform="rotate(-28 50 50)">
            <path d="M50 8 Q72 30 64 60 Q58 80 50 90 Q42 80 36 60 Q28 30 50 8Z" fill="#e8eef8" {...line("#9fb0cc", 2)} />
            <path d="M50 12 L50 96" {...line("#9fb0cc", 2)} />
            <g {...line("#c3cfe2", 1.6)} fill="none">
                <path d="M50 30 L38 22 M50 42 L35 36 M50 54 L37 50 M50 30 L62 22 M50 42 L65 36 M50 54 L63 50 M50 66 L40 64 M50 66 L60 64" />
            </g>
        </g>
    );
}

function Pillow() {
    return (
        <>
            <Ground y={86} rx={40} />
            <path d="M10 34 Q8 24 18 24 Q50 30 82 24 Q92 24 90 34 Q86 52 90 70 Q92 80 82 80 Q50 74 18 80 Q8 80 10 70 Q14 52 10 34Z" fill="#a8d8f0" {...line("#5aa0c8", 2.4)} />
            <path d="M20 34 Q50 40 80 34" fill="none" {...line("#ffffff", 3)} opacity={0.6} />
            <g fill="#ffffff" opacity={0.75}>
                <circle cx={34} cy={52} r={3} />
                <circle cx={50} cy={58} r={3} />
                <circle cx={66} cy={52} r={3} />
            </g>
        </>
    );
}

function Honey() {
    return (
        <>
            <Ground y={92} rx={30} />
            <path d="M26 34 Q22 40 22 52 L22 80 Q22 90 32 90 L68 90 Q78 90 78 80 L78 52 Q78 40 74 34Z" fill="#f2a71b" {...line("#b86f0a", 2.4)} />
            <path d="M28 46 Q50 52 72 46 L72 74 Q50 80 28 74Z" fill="#fff3d6" {...line("#e0b45a", 1.6)} />
            <path d="M40 62 l5 -4 l5 4 l0 6 l-5 4 l-5 -4z M50 62 l5 -4 l5 4 l0 6 l-5 4 l-5 -4z" fill="#f6c518" {...line("#b86f0a", 1.2)} />
            <rect x={24} y={22} width={52} height={13} rx={4} fill="#e86a6a" {...line("#b94848", 2)} />
            <Shine x={30} y={62} rx={2.5} ry={9} rotate={0} />
        </>
    );
}

function LemonSlice() {
    return (
        <>
            <Ground y={88} rx={36} />
            <path d="M8 74 A42 42 0 0 1 92 74Z" fill="#f6d84a" {...line("#d1a812", 2.4)} />
            <path d="M15 72 A35 35 0 0 1 85 72Z" fill="#fff6b8" />
            <g {...line("#f2d44a", 2.2)}>
                <path d="M50 72 L50 40 M50 72 L27 50 M50 72 L73 50 M50 72 L19 64 M50 72 L81 64" />
            </g>
            <ellipse cx={34} cy={60} rx={2.4} ry={4} fill="#ffffff" transform="rotate(40 34 60)" />
        </>
    );
}

/** Lik do pojasa (lice na slikama situacija), veseo ili tužan */
function Portrait({ who, face }: { who: "amar" | "lejla"; face: "happy" | "sad" }) {
    return (
        <>
            <rect x={4} y={4} width={92} height={92} rx={16} fill={face === "happy" ? "#fff3c4" : "#e3e9f6"} />
            <svg x={4} y={4} width={92} height={92} viewBox="-34 -94 68 68">
                <Figure id={who} pose="stand" face={face} />
            </svg>
        </>
    );
}

function Face({ emotion }: { emotion: "happy" | "sad" }) {
    return (
        <>
            <FaceBase />
            <EmotionFeatures emotion={emotion} />
        </>
    );
}

export const OPPOSITE_ART: Readonly<Record<string, () => ReactNode>> = {
    ballBig: big("ball"),
    ballSmall: small("ball"),
    teddyBig: big("teddy"),
    teddySmall: small("teddy"),
    houseBig: big("house"),
    houseSmall: small("house"),
    elephant: big("elephant"),
    mouse: small("mouse"),
    glassFull: () => <Glass full />,
    glassEmpty: () => <Glass full={false} />,
    basketFull: () => P("fruitBasket", 4, 4, 92),
    basketEmpty: () => <Basket />,
    plateFull: () => (
        <>
            {P("plate", 2, 8, 96, 84)}
            {P("apple", 20, 26, 30)}
            {P("banana", 42, 34, 36, 30)}
            {P("strawberry", 32, 50, 22)}
            {P("grapes", 54, 18, 22)}
        </>
    ),
    plateEmpty: () => P("plate", 2, 8, 96, 84),
    doorOpen: () => <Door open />,
    doorClosed: () => <Door open={false} />,
    bookOpen: () => P("bookOpen", 4, 4, 92),
    bookClosed: () => P("book", 8, 8, 84),
    boxOpen: () => <Box open />,
    boxClosed: () => <Box open={false} />,
    tea: () => <Cup />,
    iceCream: () => P("iceCream", 6, 4, 88),
    soup: () => <Soup />,
    iceCubes: () => <IceCubes />,
    sunHot: () => P("sunFace", 6, 6, 88),
    snowman: () => P("snowman", 8, 4, 84, 92),
    windowDay: () => <Window night={false} />,
    windowNight: () => <Window night />,
    skyDay: () => <Sky night={false} />,
    skyNight: () => <Sky night />,
    townDay: () => <Town night={false} />,
    townNight: () => <Town night />,
    shirtClean: () => P("tshirt", 4, 4, 92),
    shirtDirty: () => (
        <>
            {P("tshirt", 4, 4, 92)}
            <Mud
                spots={[
                    [40, 46, 7],
                    [62, 62, 5.5],
                    [46, 74, 4.5],
                    [70, 40, 3.5],
                ]}
            />
        </>
    ),
    handClean: () => P("hand", 6, 4, 88),
    handDirty: () => (
        <>
            {P("hand", 6, 4, 88)}
            <Mud
                spots={[
                    [46, 62, 6],
                    [58, 50, 4],
                    [40, 30, 3.4],
                    [62, 74, 3.6],
                ]}
            />
        </>
    ),
    dogClean: () => P("dog", 4, 4, 92),
    dogDirty: () => (
        <>
            {P("dog", 4, 4, 92)}
            <Mud
                spots={[
                    [36, 70, 6],
                    [62, 62, 5],
                    [52, 84, 4],
                    [70, 30, 3.5],
                ]}
            />
        </>
    ),
    rabbitFast: () => (
        <>
            <Speed y={56} />
            {P("rabbit", 24, 8, 76, 86)}
        </>
    ),
    snail: () => P("snail", 6, 10, 88, 80),
    planeFast: () => (
        <>
            <Speed y={52} x={2} />
            {P("plane", 18, 14, 80, 72)}
        </>
    ),
    turtle: () => P("turtle", 4, 8, 92, 84),
    carFast: () => (
        <>
            <Speed y={56} x={2} />
            {P("car", 20, 14, 78, 72)}
        </>
    ),
    tractor: () => P("tractor", 4, 6, 92, 88),
    towerTall: () => <Tower blocks={5} />,
    towerShort: () => <Tower blocks={2} />,
    treeTall: () => <Tree tall />,
    treeShort: () => <Tree tall={false} />,
    giraffe: () => P("giraffe", 4, 2, 92, 96),
    hedgehog: () => (
        <>
            <Ground y={94} rx={22} />
            {P("hedgehog", 26, 50, 48, 46)}
        </>
    ),
    pencilLong: () => <Pencil long />,
    pencilShort: () => <Pencil long={false} />,
    caterpillarLong: () => <Caterpillar segments={6} />,
    caterpillarShort: () => <Caterpillar segments={2} />,
    trainLong: () => <Train wagons={3} />,
    trainShort: () => <Train wagons={0} />,
    balloonUp: () => <UpDown up thing="balloon" />,
    balloonDown: () => <UpDown up={false} thing="balloon" />,
    birdUp: () => <UpDown up thing="bird" />,
    birdDown: () => <UpDown up={false} thing="bird" />,
    kiteUp: () => <UpDown up thing="kite" />,
    kiteDown: () => <UpDown up={false} thing="kite" />,
    stone: () => <Stone />,
    stoneHard: () => <Stone />,
    feather: () => <Feather />,
    elephantHeavy: () => P("elephant", 4, 4, 92),
    butterfly: () => P("butterfly", 14, 14, 72),
    watermelon: () => P("watermelon", 4, 6, 92, 88),
    balloonLight: () => P("balloon", 14, 4, 72, 92),
    pillow: () => <Pillow />,
    hammer: () => P("hammer", 6, 6, 88),
    teddySoft: () => P("teddy", 6, 4, 88),
    key: () => P("key", 6, 6, 88),
    scarf: () => P("scarf", 6, 6, 88),
    faceHappy: () => <Face emotion="happy" />,
    faceSad: () => <Face emotion="sad" />,
    amarHappy: () => <Portrait who="amar" face="happy" />,
    amarSad: () => <Portrait who="amar" face="sad" />,
    lejlaHappy: () => <Portrait who="lejla" face="happy" />,
    lejlaSad: () => <Portrait who="lejla" face="sad" />,
    cupcake: () => P("cupcake", 8, 4, 84, 92),
    lemon: () => P("lemon", 6, 8, 88, 84),
    honey: () => <Honey />,
    lemonSlice: () => <LemonSlice />,
    banana: () => P("banana", 4, 6, 92, 88),
    appleGreen: () => P("appleGreen", 6, 6, 88),
};

export function OppositePic({ pic, className }: { pic: string; className?: string }) {
    const draw = OPPOSITE_ART[pic];
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {draw ? draw() : null}
        </svg>
    );
}
