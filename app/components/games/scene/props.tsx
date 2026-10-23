// Predmeti za slike situacija. Svaki se crta oko sredine svoje donje ivice (0, 0), u razmeri
// u kojoj je dete visoko oko 75 jedinica. Oblici su jednostavni i jasni, bez sitnih detalja;
// boja se kod nekih predmeta može zadati (`tone`).

import type { ReactNode } from "react";
import { Medal } from "../EmotionFace";
import type { PropId } from "./types";

const WOOD = "#b07a4a";
const WOOD_DARK = "#8f5d34";
const OUT = "#5a4a3a";

type Draw = (tone?: string) => ReactNode;

const stroke = (color: string, width = 1.5) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

function ConeBody() {
    return (
        <>
            <path d="M-5 -12 L0 0 L5 -12 Z" fill="#e3a65a" {...stroke("#b9793a", 1)} />
            <path d="M-3.5 -9 L3 -9 M-2 -5 L2 -5" stroke="#b9793a" strokeWidth={0.8} />
        </>
    );
}

function Balloon({ color }: { color: string }) {
    return (
        <g>
            <path d="M0 0 Q-3 -10 0 -20" fill="none" stroke="#8a8a8a" strokeWidth={0.9} />
            <ellipse cx={0} cy={-30} rx={8} ry={10} fill={color} {...stroke("#00000033", 1)} />
            <ellipse cx={-3} cy={-34} rx={2.2} ry={3.2} fill="#ffffff" opacity={0.55} />
            <path d="M-1.5 -20 L1.5 -20 L0 -21.5Z" fill={color} />
        </g>
    );
}

function Paper({ children, w = 26, h = 20 }: { children?: ReactNode; w?: number; h?: number }) {
    return (
        <g>
            <rect x={-w / 2} y={-h} width={w} height={h} rx={1.5} fill="#ffffff" {...stroke("#c9c2b6", 1.2)} />
            {children}
        </g>
    );
}

/** Mali crtež deteta: sunce i kućica */
function KidDrawing() {
    return (
        <>
            <circle cx={6} cy={-14} r={3} fill="#f4b73f" />
            <path d="M-8 -3 V-10 L-4 -14 L0 -10 V-3Z" fill="#f28b6e" />
            <path d="M-12 -3 H12" stroke="#6cc06a" strokeWidth={1.5} />
        </>
    );
}

function Animal({ body, children }: { body: string; children?: ReactNode }) {
    return (
        <g>
            <ellipse cx={0} cy={-1} rx={12} ry={2} fill="#000" opacity={0.08} />
            <g fill={body}>{children}</g>
        </g>
    );
}

const PROPS: Record<PropId, Draw> = {
    // ── Kuća i nameštaj ───────────────────────────────────────────────────────
    bed: (tone = "#8ab8f0") => (
        <g>
            <rect x={-46} y={-42} width={8} height={42} rx={2} fill={WOOD} />
            <rect x={38} y={-26} width={8} height={26} rx={2} fill={WOOD} />
            <rect x={-42} y={-22} width={84} height={14} rx={3} fill="#f6f0e6" {...stroke("#d9cfbf")} />
            <rect x={-40} y={-30} width={22} height={10} rx={5} fill="#ffffff" {...stroke("#d9cfbf")} />
            <rect x={-18} y={-24} width={58} height={10} rx={3} fill={tone} opacity={0.6} />
        </g>
    ),
    table: () => (
        <g>
            <rect x={-40} y={-34} width={80} height={7} rx={3} fill={WOOD} {...stroke(WOOD_DARK)} />
            <rect x={-35} y={-28} width={6} height={28} rx={2} fill={WOOD_DARK} />
            <rect x={29} y={-28} width={6} height={28} rx={2} fill={WOOD_DARK} />
        </g>
    ),
    chair: (tone = "#6aa6e8") => (
        <g>
            <rect x={-14} y={-46} width={5} height={46} rx={2} fill={tone} />
            <rect x={-14} y={-22} width={28} height={5} rx={2} fill={tone} />
            <rect x={10} y={-18} width={4} height={18} rx={2} fill={tone} />
        </g>
    ),
    sofa: (tone = "#e0907a") => (
        <g>
            <rect x={-46} y={-38} width={92} height={22} rx={8} fill={tone} />
            <rect x={-50} y={-26} width={100} height={20} rx={7} fill={tone} {...stroke("#00000022")} />
            <rect x={-46} y={-6} width={6} height={6} fill={WOOD_DARK} />
            <rect x={40} y={-6} width={6} height={6} fill={WOOD_DARK} />
        </g>
    ),
    shelf: () => (
        <g>
            <rect x={-24} y={-60} width={48} height={60} rx={2} fill="#e8c9a0" {...stroke("#c9a27a")} />
            <path d="M-24 -40 H24 M-24 -20 H24" stroke="#c9a27a" strokeWidth={2} />
            <rect x={-18} y={-56} width={6} height={15} fill="#f28b6e" />
            <rect x={-10} y={-54} width={6} height={13} fill="#6cc0e8" />
            <rect x={8} y={-36} width={10} height={15} rx={3} fill="#8fd07a" />
        </g>
    ),
    toyBox: () => (
        <g>
            <circle cx={-8} cy={-30} r={7} fill="#f28b6e" />
            <rect x={2} y={-36} width={10} height={10} fill="#6cc0e8" />
            <path d="M14 -30 l4 -8 l4 8z" fill="#f4c94a" />
            <rect x={-22} y={-28} width={46} height={28} rx={3} fill="#f4b73f" {...stroke("#c98a12")} />
            <rect x={-6} y={-20} width={14} height={8} rx={2} fill="#ffe08a" />
        </g>
    ),
    door: (tone = "#c98e5a") => (
        <g>
            <rect x={-20} y={-92} width={40} height={92} rx={2} fill={tone} {...stroke("#9a6a3e", 2)} />
            <rect x={-14} y={-84} width={28} height={30} rx={2} fill="none" stroke="#00000022" strokeWidth={1.5} />
            <rect x={-14} y={-46} width={28} height={36} rx={2} fill="none" stroke="#00000022" strokeWidth={1.5} />
            <circle cx={13} cy={-46} r={2.6} fill="#f4c94a" />
        </g>
    ),
    doorOpen: () => (
        <g>
            <rect x={-20} y={-92} width={40} height={92} fill="#fff6dd" {...stroke("#9a6a3e", 2)} />
            <path d="M-20 -92 L-30 -86 V4 L-20 0Z" fill="#c98e5a" {...stroke("#9a6a3e", 1.5)} />
        </g>
    ),
    lamp: () => (
        <g>
            <rect x={-1.5} y={-50} width={3} height={48} fill="#8a8a96" />
            <ellipse cx={0} cy={-1} rx={9} ry={2.5} fill="#8a8a96" />
            <path d="M-10 -50 L-6 -64 H6 L10 -50Z" fill="#f4d48a" {...stroke("#d9a84a")} />
        </g>
    ),
    tvOff: () => (
        <g>
            <rect x={-30} y={-46} width={60} height={38} rx={4} fill="#2f3448" />
            <rect x={-26} y={-42} width={52} height={30} rx={2} fill="#4a5168" />
            <path d="M-20 -38 L-8 -24" stroke="#6a7290" strokeWidth={3} strokeLinecap="round" />
            <rect x={-12} y={-8} width={24} height={8} fill="#4a4f63" />
        </g>
    ),
    remote: () => (
        <g>
            <rect x={-3} y={-14} width={6} height={14} rx={2} fill="#3b3f52" />
            <circle cx={0} cy={-10} r={1.4} fill="#e8605a" />
        </g>
    ),
    clock: () => (
        <g>
            <circle cx={0} cy={-11} r={11} fill="#ffffff" {...stroke("#8a8a96", 2)} />
            <path d="M0 -11 V-18 M0 -11 L5 -8" stroke="#3b3f52" strokeWidth={1.8} strokeLinecap="round" />
        </g>
    ),
    sink: () => (
        <g>
            <rect x={-4} y={-36} width={8} height={36} fill="#e9eef3" {...stroke("#c3ccd6")} />
            <path d="M-22 -44 H22 Q20 -32 0 -32 Q-20 -32 -22 -44Z" fill="#ffffff" {...stroke("#c3ccd6")} />
            <path d="M-2 -44 V-54 H8 V-50" fill="none" stroke="#9aa6b2" strokeWidth={3} strokeLinecap="round" />
        </g>
    ),
    bathtubTiles: () => (
        <g>
            <rect x={-46} y={-30} width={92} height={30} rx={8} fill="#ffffff" {...stroke("#c3ccd6", 2)} />
        </g>
    ),
    stove: () => (
        <g>
            <rect x={-24} y={-40} width={48} height={40} rx={3} fill="#f2f2f4" {...stroke("#b9bcc8")} />
            <rect x={-18} y={-30} width={36} height={22} rx={3} fill="#3b3f52" opacity={0.85} />
            <ellipse cx={-10} cy={-41} rx={8} ry={2} fill="#3b3f52" />
            <ellipse cx={10} cy={-41} rx={8} ry={2} fill="#e8605a" />
        </g>
    ),
    pot: () => (
        <g>
            <path d="M-12 -14 H12 L10 0 H-10Z" fill="#9aa6b2" {...stroke("#6f7a86")} />
            <rect x={-14} y={-16} width={28} height={3} rx={1.5} fill="#6f7a86" />
            <path d="M-16 -12 H-12 M12 -12 H16" stroke="#6f7a86" strokeWidth={2.5} strokeLinecap="round" />
        </g>
    ),
    fridge: () => (
        <g>
            <rect x={-20} y={-78} width={40} height={78} rx={4} fill="#eef4fa" {...stroke("#b9c6d4", 2)} />
            <path d="M-20 -48 H20" stroke="#b9c6d4" strokeWidth={2} />
            <path d="M14 -70 V-56 M14 -42 V-26" stroke="#9aa6b2" strokeWidth={2.5} strokeLinecap="round" />
        </g>
    ),
    coatHook: () => (
        <g>
            <rect x={-20} y={-74} width={40} height={5} rx={2} fill={WOOD} />
            <path d="M-12 -69 v4 M0 -69 v4 M12 -69 v4" stroke={WOOD_DARK} strokeWidth={2} strokeLinecap="round" />
            <path d="M6 -66 Q14 -66 16 -50 L18 -38 H6 Z" fill="#3f8fd8" />
        </g>
    ),
    desk: () => (
        <g>
            <rect x={-26} y={-30} width={52} height={6} rx={2} fill={WOOD} {...stroke(WOOD_DARK)} />
            <rect x={-22} y={-24} width={5} height={24} fill="#7a8394" />
            <rect x={17} y={-24} width={5} height={24} fill="#7a8394" />
        </g>
    ),
    speaker: () => (
        <g>
            <rect x={-12} y={-36} width={24} height={36} rx={3} fill="#3b3f52" />
            <circle cx={0} cy={-11} r={7} fill="#6a7290" />
            <circle cx={0} cy={-11} r={3} fill="#2f3448" />
            <circle cx={0} cy={-27} r={4} fill="#6a7290" />
        </g>
    ),
    radio: () => (
        <g>
            <rect x={-16} y={-18} width={32} height={18} rx={4} fill="#e8605a" />
            <circle cx={-6} cy={-9} r={5} fill="#3b3f52" />
            <rect x={3} y={-13} width={9} height={3} rx={1} fill="#ffffff" />
            <path d="M8 -18 L14 -28" stroke="#8a8a96" strokeWidth={1.5} />
        </g>
    ),
    phone: () => (
        <g>
            <rect x={-5} y={-18} width={10} height={18} rx={2} fill="#3b3f52" />
            <rect x={-3.5} y={-16} width={7} height={12} rx={1} fill="#8fd0f0" />
        </g>
    ),
    suitcase: (tone = "#e8605a") => (
        <g>
            <path d="M-5 -30 V-34 H5 V-30" fill="none" stroke="#5a5a6a" strokeWidth={2.5} />
            <rect x={-14} y={-30} width={28} height={28} rx={4} fill={tone} {...stroke("#00000033")} />
            <path d="M-6 -30 V-2 M6 -30 V-2" stroke="#00000022" strokeWidth={2} />
            <circle cx={-9} cy={-1} r={2} fill="#3b3f52" />
            <circle cx={9} cy={-1} r={2} fill="#3b3f52" />
        </g>
    ),
    bag: (tone = "#f4f0e6") => (
        <g>
            <path d="M-6 -22 Q0 -30 6 -22" fill="none" stroke="#b9a88a" strokeWidth={2} />
            <path d="M-11 -22 H11 L13 0 H-13Z" fill={tone} {...stroke("#b9a88a")} />
            <circle cx={-4} cy={-25} r={4} fill="#8fd07a" />
            <rect x={1} y={-30} width={4} height={10} fill="#f4c94a" />
        </g>
    ),
    backpack: (tone = "#f4b73f") => (
        <g>
            <rect x={-12} y={-28} width={24} height={28} rx={7} fill={tone} {...stroke("#00000033")} />
            <rect x={-8} y={-14} width={16} height={10} rx={3} fill="#ffffff" opacity={0.4} />
            <path d="M-5 -28 Q0 -34 5 -28" fill="none" stroke="#00000044" strokeWidth={2} />
        </g>
    ),
    basket: () => (
        <g>
            <path d="M-12 -14 Q0 -30 12 -14" fill="none" stroke="#a8682c" strokeWidth={2.5} />
            <path d="M-16 -14 H16 L12 0 H-12Z" fill="#d39a55" {...stroke("#a8682c")} />
            <path d="M-14 -8 H14" stroke="#a8682c" strokeWidth={1} />
            <rect x={-10} y={-18} width={20} height={5} fill="#e8605a" opacity={0.85} />
        </g>
    ),
    toilet: () => (
        <g>
            <rect x={-8} y={-40} width={16} height={18} rx={3} fill="#ffffff" {...stroke("#c3ccd6")} />
            <path d="M-12 -22 H12 Q12 -8 4 -6 V0 H-4 V-6 Q-12 -8 -12 -22Z" fill="#ffffff" {...stroke("#c3ccd6")} />
        </g>
    ),
    mirror: () => (
        <g>
            <ellipse cx={0} cy={-16} rx={12} ry={16} fill="#dff1fb" {...stroke("#9aa6b2", 2)} />
            <path d="M-5 -24 L3 -32 M-6 -16 L6 -28" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
        </g>
    ),

    // ── Igračke i igra ────────────────────────────────────────────────────────
    gift: (tone = "#e8605a") => (
        <g>
            <rect x={-12} y={-20} width={24} height={20} rx={2} fill={tone} {...stroke("#00000033")} />
            <rect x={-14} y={-24} width={28} height={6} rx={2} fill={tone} {...stroke("#00000033")} />
            <rect x={-2.5} y={-24} width={5} height={24} fill="#f6d84a" />
            <path d="M0 -24 C-10 -34 -12 -24 0 -24 C12 -34 10 -24 0 -24Z" fill="#f6d84a" {...stroke("#d9a84a", 1)} />
        </g>
    ),
    cake: () => (
        <g>
            <ellipse cx={0} cy={-1} rx={22} ry={3} fill="#e6e6ee" />
            <rect x={-18} y={-22} width={36} height={20} rx={3} fill="#f7c8d8" {...stroke("#e08aa8")} />
            <path d="M-18 -16 Q-12 -10 -6 -16 T6 -16 T18 -16" fill="none" stroke="#ffffff" strokeWidth={2.5} />
            {[-9, 0, 9].map((x) => (
                <g key={x}>
                    <rect x={x - 1.5} y={-31} width={3} height={9} fill={["#6cc0e8", "#f4c94a", "#8fd07a"][(x + 9) / 9]} />
                    <path d={`M${x} -36 Q${x + 2.5} -33 ${x} -31 Q${x - 2.5} -33 ${x} -36Z`} fill="#f6a23e" />
                </g>
            ))}
        </g>
    ),
    balloon: (tone = "#e8605a") => <Balloon color={tone} />,
    balloons: () => (
        <g>
            <g transform="rotate(-14)">
                <Balloon color="#6cc0e8" />
            </g>
            <g transform="translate(0 -4)">
                <Balloon color="#f4c94a" />
            </g>
            <g transform="rotate(14)">
                <Balloon color="#e8605a" />
            </g>
        </g>
    ),
    ball: (tone = "#e8605a") => (
        <g>
            <ellipse cx={0} cy={-0.5} rx={8} ry={1.6} fill="#000" opacity={0.1} />
            <circle cx={0} cy={-8} r={8} fill={tone} {...stroke("#00000033")} />
            <path d="M-8 -8 Q0 -2 8 -8 M0 -16 Q-4 -8 0 0" fill="none" stroke="#ffffff" strokeWidth={2} />
        </g>
    ),
    toyCar: (tone = "#3f8fd8") => (
        <g>
            <path d="M-16 -6 V-12 Q-14 -16 -8 -16 L-4 -22 H6 L11 -16 Q16 -15 16 -10 V-6Z" fill={tone} {...stroke("#00000033")} />
            <rect x={-3} y={-20} width={7} height={4} fill="#dff1fb" />
            <circle cx={-9} cy={-5} r={4} fill="#3b3f52" />
            <circle cx={9} cy={-5} r={4} fill="#3b3f52" />
        </g>
    ),
    toyCarBroken: (tone = "#3f8fd8") => (
        <g>
            <path d="M-16 -6 V-12 Q-14 -16 -8 -16 L-4 -22 H6 L11 -16 Q16 -15 16 -10 V-6Z" fill={tone} {...stroke("#00000033")} transform="rotate(6)" />
            <circle cx={-9} cy={-5} r={4} fill="#3b3f52" />
            <circle cx={24} cy={-4} r={4} fill="#3b3f52" />
            <path d="M10 -12 L14 -16 L12 -10 L17 -12" fill="none" stroke="#3b3f52" strokeWidth={1.2} />
        </g>
    ),
    teddy: () => (
        <g fill="#c98e5a">
            <circle cx={-7} cy={-25} r={4} />
            <circle cx={7} cy={-25} r={4} />
            <ellipse cx={0} cy={-8} rx={9} ry={9} />
            <circle cx={0} cy={-20} r={8} />
            <ellipse cx={0} cy={-17} rx={3.5} ry={2.6} fill="#f0d2b0" />
            <circle cx={-3} cy={-22} r={1.2} fill={OUT} />
            <circle cx={3} cy={-22} r={1.2} fill={OUT} />
            <ellipse cx={0} cy={-6} rx={5} ry={5} fill="#f0d2b0" />
        </g>
    ),
    blocks: () => (
        <g {...stroke("#00000033", 1)}>
            <rect x={-14} y={-12} width={12} height={12} fill="#e8605a" />
            <rect x={-1} y={-12} width={12} height={12} fill="#3f8fd8" />
            <rect x={-8} y={-24} width={12} height={12} fill="#f4c94a" />
            <rect x={-6} y={-36} width={12} height={12} fill="#8fd07a" />
            <path d="M-6 -36 L0 -46 L6 -36Z" fill="#9b7ef0" />
        </g>
    ),
    blocksFallen: () => (
        <g {...stroke("#00000033", 1)}>
            <rect x={-22} y={-12} width={12} height={12} fill="#e8605a" transform="rotate(-12 -16 -6)" />
            <rect x={-6} y={-12} width={12} height={12} fill="#3f8fd8" />
            <rect x={10} y={-12} width={12} height={12} fill="#f4c94a" transform="rotate(20 16 -6)" />
            <rect x={-2} y={-24} width={12} height={12} fill="#8fd07a" transform="rotate(30 4 -18)" />
            <path d="M24 0 L30 -8 L36 0Z" fill="#9b7ef0" />
        </g>
    ),
    puzzle: () => (
        <g>
            <rect x={-20} y={-4} width={40} height={4} fill="#d9cfbf" />
            <g {...stroke("#00000033", 1)}>
                <rect x={-18} y={-3.5} width={18} height={3} fill="#6cc0e8" transform="skewX(-30)" />
                <rect x={0} y={-3.5} width={18} height={3} fill="#f4c94a" transform="skewX(-30)" />
            </g>
            <g transform="translate(0 -6)">
                <rect x={-18} y={-22} width={36} height={22} rx={2} fill="#ffffff" {...stroke("#c9c2b6")} />
                <rect x={-17} y={-21} width={17} height={10} fill="#6cc0e8" />
                <rect x={0} y={-21} width={17} height={10} fill="#f4c94a" />
                <rect x={-17} y={-11} width={17} height={10} fill="#8fd07a" />
                <rect x={0} y={-11} width={17} height={10} fill="#f28b6e" />
                <circle cx={0} cy={-16} r={2.4} fill="#6cc0e8" />
                <circle cx={-8.5} cy={-11} r={2.4} fill="#6cc0e8" />
            </g>
        </g>
    ),
    puzzlePieces: () => (
        <g {...stroke("#00000033", 1)}>
            {[
                [-22, -4, "#6cc0e8", -20],
                [-6, -3, "#f4c94a", 15],
                [10, -5, "#8fd07a", -35],
                [24, -3, "#f28b6e", 25],
                [2, -14, "#9b7ef0", 50],
            ].map(([x, y, color, rot]) => (
                <g key={`${x}`} transform={`translate(${x} ${y}) rotate(${rot})`}>
                    <rect x={-5} y={-5} width={10} height={10} rx={1} fill={color as string} />
                    <circle cx={5} cy={0} r={2.2} fill={color as string} />
                </g>
            ))}
        </g>
    ),
    boardGame: () => (
        <g>
            <path d="M-26 0 L-18 -12 H18 L26 0Z" fill="#fff6dd" {...stroke("#c9a27a")} />
            <path d="M-20 -3 H20 M-16 -8 H16 M-6 -12 L-8 0 M6 -12 L8 0" stroke="#e8a77a" strokeWidth={1} />
            <path d="M-10 -10 l2 -6 l2 6z" fill="#e8605a" />
            <path d="M10 -8 l2 -6 l2 6z" fill="#3f8fd8" />
            <g transform="translate(20 -14)">
                <rect x={-4} y={-4} width={8} height={8} rx={1.5} fill="#ffffff" {...stroke("#8a8a96", 1)} />
                <circle cx={-1.5} cy={-1.5} r={0.9} fill={OUT} />
                <circle cx={1.5} cy={1.5} r={0.9} fill={OUT} />
            </g>
        </g>
    ),
    cards: () => (
        <g>
            {[-12, 0, 12].map((rot, i) => (
                <g key={rot} transform={`rotate(${rot} 0 0)`}>
                    <rect x={-6} y={-20} width={12} height={17} rx={2} fill="#ffffff" {...stroke("#9aa6b2", 1)} />
                    <circle cx={0} cy={-11.5} r={3} fill={["#e8605a", "#3f8fd8", "#8fd07a"][i]} />
                </g>
            ))}
        </g>
    ),
    kite: () => (
        <g>
            <path d="M0 -40 L10 -28 L0 -12 L-10 -28Z" fill="#f4c94a" {...stroke("#d9a84a")} />
            <path d="M0 -40 V-12 M-10 -28 H10" stroke="#d9a84a" strokeWidth={1} />
            <path d="M0 -12 Q-6 -6 0 0 Q6 6 0 10" fill="none" stroke="#e8605a" strokeWidth={1.2} />
        </g>
    ),
    drawing: () => (
        <Paper>
            <g transform="translate(0 -2)">
                <KidDrawing />
            </g>
        </Paper>
    ),
    drawingTorn: () => (
        <g>
            <g transform="translate(-7 0) rotate(-10)">
                <path d="M-13 -20 H1 L-2 -14 L2 -8 L-1 -3 L1 0 H-13Z" fill="#ffffff" {...stroke("#c9c2b6", 1.2)} />
                <circle cx={-7} cy={-12} r={3} fill="#f4b73f" />
            </g>
            <g transform="translate(9 0) rotate(10)">
                <path d="M-1 -20 H13 V0 H1 L-1 -3 L2 -8 L-2 -14Z" fill="#ffffff" {...stroke("#c9c2b6", 1.2)} />
                <path d="M3 -5 V-11 L7 -14 L11 -11 V-5Z" fill="#f28b6e" />
            </g>
        </g>
    ),
    drawingScribbled: () => (
        <Paper>
            <g transform="translate(0 -2)">
                <KidDrawing />
            </g>
            <path d="M-11 -16 L8 -12 L-9 -9 L10 -6 L-8 -3" fill="none" stroke="#3b3f52" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </Paper>
    ),
    paper: () => (
        <Paper>
            <path d="M-9 -14 H9 M-9 -9 H9 M-9 -4 H4" stroke="#c9d6e6" strokeWidth={1.2} />
        </Paper>
    ),
    paperCut: () => (
        <Paper w={34} h={26}>
            <path d="M-17 -13 H17" stroke="#6a7290" strokeWidth={1.6} strokeDasharray="3 2.5" />
        </Paper>
    ),
    paperCircle: () => (
        <Paper w={30} h={24}>
            <circle cx={0} cy={-12} r={8} fill="none" stroke="#6a7290" strokeWidth={1.4} strokeDasharray="2.5 2" />
        </Paper>
    ),
    crayons: () => (
        <g>
            {["#e8605a", "#3f8fd8", "#f4c94a", "#8fd07a"].map((color, i) => (
                <g key={color} transform={`translate(${-9 + i * 6} 0)`}>
                    <rect x={-2} y={-16} width={4} height={14} fill={color} />
                    <path d="M-2 -16 L0 -20 L2 -16Z" fill={color} />
                </g>
            ))}
        </g>
    ),
    crayonsBroken: () => (
        <g>
            {["#e8605a", "#3f8fd8", "#f4c94a"].map((color, i) => (
                <g key={color} transform={`translate(${-12 + i * 12} -2)`}>
                    <rect x={-5} y={-3} width={6} height={4} fill={color} transform="rotate(-20)" />
                    <rect x={1} y={-3} width={6} height={4} fill={color} transform="rotate(25)" />
                </g>
            ))}
        </g>
    ),
    pencil: (tone = "#f4c94a") => (
        <g transform="rotate(-30)">
            <rect x={-2} y={-22} width={4} height={18} fill={tone} {...stroke("#00000044", 0.8)} />
            <path d="M-2 -4 L0 1 L2 -4Z" fill="#f0d2b0" />
            <rect x={-2} y={-24} width={4} height={3} fill="#f28b6e" />
        </g>
    ),
    book: (tone = "#3f8fd8") => (
        <g>
            <rect x={-10} y={-24} width={20} height={24} rx={2} fill={tone} {...stroke("#00000033")} />
            <rect x={-6} y={-19} width={12} height={6} rx={1} fill="#ffffff" opacity={0.7} />
        </g>
    ),
    bookOpen: () => (
        <g>
            <path d="M0 -4 Q-10 -8 -20 -4 V-20 Q-10 -24 0 -20 Q10 -24 20 -20 V-4 Q10 -8 0 -4Z" fill="#ffffff" {...stroke("#9aa6b2")} />
            <path d="M0 -20 V-4" stroke="#9aa6b2" strokeWidth={1.2} />
            <circle cx={-10} cy={-14} r={3} fill="#f4b73f" />
            <path d="M5 -16 H15 M5 -11 H15" stroke="#c9d6e6" strokeWidth={1.2} />
        </g>
    ),
    bookTorn: () => (
        <g>
            <path d="M0 -4 Q-10 -8 -20 -4 V-20 Q-10 -24 0 -20 Q10 -24 20 -20 V-14 L15 -12 L18 -8 L14 -6 V-4 Q10 -8 0 -4Z" fill="#ffffff" {...stroke("#9aa6b2")} />
            <path d="M0 -20 V-4" stroke="#9aa6b2" strokeWidth={1.2} />
            <g transform="translate(28 -6) rotate(20)">
                <path d="M-5 -8 H5 V2 H-3 L-1 -2 L-4 -4Z" fill="#ffffff" {...stroke("#9aa6b2", 1)} />
            </g>
        </g>
    ),
    envelope: () => (
        <g>
            <rect x={-13} y={-18} width={26} height={18} rx={2} fill="#fff6dd" {...stroke("#d9a84a")} />
            <path d="M-13 -18 L0 -8 L13 -18" fill="none" stroke="#d9a84a" strokeWidth={1.5} />
            <g transform="translate(6 -5) scale(0.35)">
                <Balloon color="#e8605a" />
            </g>
        </g>
    ),
    paints: () => (
        <g>
            <ellipse cx={0} cy={-5} rx={18} ry={6} fill="#ffffff" {...stroke("#c9c2b6")} />
            {[
                [-10, "#e8605a"],
                [-3, "#3f8fd8"],
                [4, "#f4c94a"],
                [11, "#8fd07a"],
            ].map(([x, color]) => (
                <circle key={color} cx={x as number} cy={-5} r={2.8} fill={color as string} />
            ))}
        </g>
    ),
    scissors: () => (
        <g transform="rotate(-20)">
            <path d="M-1 -10 L6 -26 M1 -10 L-6 -26" stroke="#9aa6b2" strokeWidth={2.4} strokeLinecap="round" />
            <circle cx={-4} cy={-5} r={4} fill="none" stroke="#e8605a" strokeWidth={2.4} />
            <circle cx={4} cy={-5} r={4} fill="none" stroke="#e8605a" strokeWidth={2.4} />
        </g>
    ),
    glue: () => (
        <g>
            <rect x={-4} y={-16} width={8} height={16} rx={2} fill="#ffffff" {...stroke("#9aa6b2")} />
            <rect x={-3} y={-20} width={6} height={4} fill="#f28b6e" />
        </g>
    ),
    confetti: () => (
        <g>
            {Array.from({ length: 16 }, (_, i) => (
                <rect
                    key={i}
                    x={-40 + ((i * 23) % 80)}
                    y={-50 + ((i * 17) % 46)}
                    width={3.5}
                    height={6}
                    rx={1}
                    fill={["#e8605a", "#3f8fd8", "#f4c94a", "#8fd07a", "#9b7ef0"][i % 5]}
                    transform={`rotate(${(i * 47) % 90} ${-40 + ((i * 23) % 80)} ${-50 + ((i * 17) % 46)})`}
                />
            ))}
        </g>
    ),
    // ── Hrana i posuđe ────────────────────────────────────────────────────────
    iceCream: (tone = "#f7a8c8") => (
        <g>
            <ConeBody />
            <circle cx={0} cy={-15} r={6} fill={tone} />
            <circle cx={-2} cy={-17} r={1.6} fill="#ffffff" opacity={0.6} />
        </g>
    ),
    iceCreamDropped: (tone = "#f7a8c8") => (
        <g>
            <path d="M-12 0 Q-14 -5 -6 -6 Q-2 -10 4 -6 Q12 -7 12 0Z" fill={tone} />
            <g transform="translate(10 -3) rotate(110)">
                <ConeBody />
            </g>
        </g>
    ),
    cone: () => <ConeBody />,
    wrapper: () => <path d="M-10 0 L-8 -6 L-2 -4 L2 -8 L8 -5 L10 0Z" fill="#e8605a" {...stroke("#b9443e", 1)} />,
    bowlEmpty: () => (
        <g>
            <path d="M-14 -10 H14 Q12 0 0 0 Q-12 0 -14 -10Z" fill="#6cc0e8" {...stroke("#3f8fd8")} />
            <ellipse cx={0} cy={-10} rx={14} ry={3} fill="#eaf6fd" />
        </g>
    ),
    soup: () => (
        <g>
            <ellipse cx={0} cy={-1} rx={18} ry={3} fill="#ffffff" {...stroke("#c9c2b6", 1)} />
            <path d="M-14 -10 H14 Q12 -1 0 -1 Q-12 -1 -14 -10Z" fill="#ffffff" {...stroke("#c9c2b6")} />
            <ellipse cx={0} cy={-10} rx={14} ry={3} fill="#f4b04a" />
            <path d="M-4 -16 Q-6 -20 -4 -24 M4 -16 Q2 -20 4 -24" fill="none" stroke="#c9c2b6" strokeWidth={1.2} strokeLinecap="round" />
        </g>
    ),
    plate: () => (
        <g>
            <ellipse cx={0} cy={-3} rx={18} ry={4} fill="#ffffff" {...stroke("#c9c2b6")} />
            <ellipse cx={-5} cy={-6} rx={6} ry={3} fill="#f4b04a" />
            <ellipse cx={6} cy={-5} rx={5} ry={2.6} fill="#8fd07a" />
        </g>
    ),
    pancakes: () => (
        <g>
            <ellipse cx={0} cy={-2} rx={18} ry={4} fill="#ffffff" {...stroke("#c9c2b6")} />
            {[0, 1, 2].map((i) => (
                <ellipse key={i} cx={0} cy={-5 - i * 3.5} rx={12} ry={3} fill="#e8b46a" {...stroke("#c98a42", 1)} />
            ))}
            <path d="M-4 -14 Q0 -11 4 -14" fill="none" stroke="#9a4a22" strokeWidth={2} />
        </g>
    ),
    cup: (tone = "#6cc0e8") => (
        <g>
            <path d="M-6 -14 H6 L5 0 H-5Z" fill={tone} {...stroke("#00000033")} />
            <path d="M6 -11 Q11 -9 6 -4" fill="none" stroke={tone} strokeWidth={2} />
        </g>
    ),
    glass: () => (
        <g>
            <path d="M-6 -18 H6 L5 0 H-5Z" fill="#e6f4fb" {...stroke("#9ac4dc")} />
            <path d="M-5.5 -10 H5.5 L5 0 H-5Z" fill="#8fd0f0" opacity={0.8} />
        </g>
    ),
    juiceSpill: () => (
        <g>
            <path d="M-22 0 Q-24 -5 -12 -5 Q-4 -9 6 -5 Q20 -6 22 0Z" fill="#f6a23e" opacity={0.85} />
            <g transform="translate(-16 -4) rotate(-80)">{PROPS.cup("#ffffff")}</g>
        </g>
    ),
    apple: () => (
        <g>
            <path d="M0 -14 C-10 -20 -14 -4 -6 0 C-3 1 -1 0 0 -1 C1 0 3 1 6 0 C14 -4 10 -20 0 -14Z" fill="#e8463f" {...stroke("#a82a24", 1)} />
            <path d="M0 -14 L1 -19" stroke="#7a4a28" strokeWidth={1.5} strokeLinecap="round" />
            <path d="M1 -18 Q6 -21 7 -17 Q3 -15 1 -18Z" fill="#6cc06a" />
        </g>
    ),
    carrot: () => (
        <g transform="rotate(-70)">
            <path d="M-3 0 L0 -18 L3 0Z" fill="#f6862e" />
            <path d="M0 0 L-3 4 M0 0 L0 5 M0 0 L3 4" stroke="#6cc06a" strokeWidth={1.5} strokeLinecap="round" />
        </g>
    ),
    bread: () => (
        <g>
            <path d="M-16 0 Q-18 -12 0 -12 Q18 -12 16 0Z" fill="#e3a65a" {...stroke("#b9793a")} />
            <path d="M-8 -9 L-5 -4 M0 -10 L2 -5 M8 -9 L9 -4" stroke="#b9793a" strokeWidth={1.2} strokeLinecap="round" />
        </g>
    ),
    milk: () => (
        <g>
            <path d="M-6 -22 L0 -27 L6 -22 V0 H-6Z" fill="#ffffff" {...stroke("#9ac4dc")} />
            <rect x={-6} y={-16} width={12} height={8} fill="#6cc0e8" />
        </g>
    ),
    cheese: () => <path d="M-12 0 V-10 L10 -16 V0Z" fill="#f6d84a" {...stroke("#d9a84a")} />,
    sweets: () => (
        <g>
            <rect x={-8} y={-14} width={16} height={14} rx={2} fill="#7a4a28" />
            <rect x={-8} y={-8} width={16} height={6} fill="#e86aa0" />
            <circle cx={14} cy={-4} r={4} fill="#f4c94a" />
            <path d="M10 -4 l-3 -2 v4z M18 -4 l3 -2 v4z" fill="#f4c94a" />
        </g>
    ),
    syrup: () => (
        <g>
            <rect x={-6} y={-18} width={12} height={18} rx={2} fill="#c86a4a" {...stroke("#8a4a2a")} />
            <rect x={-3} y={-23} width={6} height={5} fill="#ffffff" />
            <rect x={-5} y={-12} width={10} height={6} fill="#ffffff" opacity={0.7} />
        </g>
    ),
    spoon: () => (
        <g transform="rotate(-30)">
            <ellipse cx={0} cy={-16} rx={4} ry={5} fill="#c9d0da" {...stroke("#9aa6b2", 1)} />
            <rect x={-1} y={-12} width={2} height={12} fill="#9aa6b2" />
        </g>
    ),
    menu: () => (
        <g>
            <rect x={-10} y={-26} width={20} height={26} rx={2} fill="#ffffff" {...stroke("#c9a27a")} />
            <circle cx={-3} cy={-19} r={3} fill="#f4b04a" />
            <path d="M2 -19 H7" stroke="#c9c2b6" strokeWidth={1.2} />
            <circle cx={-3} cy={-10} r={3} fill="#8fd07a" />
            <path d="M2 -10 H7" stroke="#c9c2b6" strokeWidth={1.2} />
        </g>
    ),

    // ── Napolju ───────────────────────────────────────────────────────────────
    tree: () => (
        <g>
            <rect x={-5} y={-40} width={10} height={40} rx={3} fill="#a8794e" />
            <circle cx={0} cy={-56} r={22} fill="#7fc46a" />
            <circle cx={-14} cy={-46} r={13} fill="#8fd07a" />
            <circle cx={14} cy={-48} r={13} fill="#72b85e" />
        </g>
    ),
    flowers: () => (
        <g>
            {[
                [-10, "#e8605a"],
                [0, "#f4c94a"],
                [10, "#9b7ef0"],
            ].map(([x, color], i) => (
                <g key={i} transform={`translate(${x} 0)`}>
                    <path d={`M0 0 V-${12 + i * 3}`} stroke="#6cc06a" strokeWidth={1.8} />
                    <g transform={`translate(0 -${14 + i * 3})`} fill={color as string}>
                        <circle cx={-3} cy={0} r={2.6} />
                        <circle cx={3} cy={0} r={2.6} />
                        <circle cx={0} cy={-3} r={2.6} />
                        <circle cx={0} cy={3} r={2.6} />
                        <circle cx={0} cy={0} r={2} fill="#ffe08a" />
                    </g>
                </g>
            ))}
        </g>
    ),
    bench: () => (
        <g>
            <rect x={-30} y={-30} width={60} height={5} rx={2} fill={WOOD} />
            <rect x={-30} y={-22} width={60} height={5} rx={2} fill={WOOD} />
            <rect x={-32} y={-16} width={64} height={5} rx={2} fill={WOOD} {...stroke(WOOD_DARK, 1)} />
            <rect x={-26} y={-12} width={4} height={12} fill="#5a5a6a" />
            <rect x={22} y={-12} width={4} height={12} fill="#5a5a6a" />
        </g>
    ),
    fence: () => (
        <g fill="#e9d6b4" {...stroke("#c9ae86", 1)}>
            {Array.from({ length: 7 }, (_, i) => (
                <path key={i} d={`M${-42 + i * 12} 0 V-26 l4 -4 l4 4 V0Z`} />
            ))}
            <rect x={-44} y={-20} width={88} height={4} />
        </g>
    ),
    swing: () => (
        <g>
            <path d="M-28 0 L-20 -70 L20 -70 L28 0" fill="none" stroke="#e8605a" strokeWidth={4} strokeLinejoin="round" />
            <path d="M-8 -70 V-24 M8 -70 V-24" stroke="#8a8a96" strokeWidth={1.4} />
            <rect x={-11} y={-25} width={22} height={4} rx={2} fill={WOOD} />
        </g>
    ),
    slide: () => (
        <g>
            <path d="M-30 0 V-56 M-14 0 V-56" stroke="#6a7290" strokeWidth={3} />
            <path d="M-30 -10 H-14 M-30 -24 H-14 M-30 -38 H-14" stroke="#6a7290" strokeWidth={2.4} />
            <rect x={-32} y={-60} width={20} height={6} rx={2} fill="#3f8fd8" />
            <path d="M-12 -58 Q10 -40 20 -6 Q24 0 34 0 V-6 Q26 -6 24 -12 Q14 -46 -12 -50Z" fill="#f4b73f" {...stroke("#d97f06")} />
        </g>
    ),
    climber: () => (
        <g stroke="#e8605a" strokeWidth={3.5} strokeLinecap="round">
            <path d="M-26 0 V-80 M26 0 V-80 M-26 -80 H26" fill="none" />
            <path d="M-26 -20 H26 M-26 -40 H26 M-26 -60 H26 M0 -80 V0" strokeWidth={2.4} stroke="#3f8fd8" />
        </g>
    ),
    carousel: () => (
        <g>
            <ellipse cx={0} cy={-6} rx={36} ry={8} fill="#f4b73f" {...stroke("#d97f06")} />
            <rect x={-2} y={-44} width={4} height={38} fill="#8a8a96" />
            <path d="M-26 -8 V-30 H26 V-8" fill="none" stroke="#e8605a" strokeWidth={3} strokeLinejoin="round" />
        </g>
    ),
    sandcastleCrushed: () => (
        <g>
            <path d="M-24 0 Q-22 -8 -12 -9 Q-6 -15 2 -10 Q10 -14 16 -8 Q24 -7 26 0Z" fill="#e8c88a" {...stroke("#c9a46a", 1.2)} />
            <rect x={14} y={-14} width={7} height={6} fill="#e8c88a" transform="rotate(30 17 -11)" />
            <ellipse cx={-2} cy={-8} rx={6} ry={2.5} fill="#c9a46a" opacity={0.6} />
        </g>
    ),
    wave: () => <path d="M-40 0 Q-36 -26 -10 -30 Q8 -32 10 -18 Q2 -22 -4 -16 Q4 -6 20 -4 L40 0Z" fill="#6cc4e8" {...stroke("#ffffff", 2)} />,
    puddle: () => <ellipse cx={0} cy={-2} rx={22} ry={4.5} fill="#8fb8e0" {...stroke("#6f9fd8", 1)} />,
    stone: () => <path d="M-14 0 Q-16 -12 -4 -14 Q12 -16 14 -4 L14 0Z" fill="#a9a29a" {...stroke("#8a847c")} />,
    stoneLifted: () => (
        <g>
            <path d="M-12 0 Q-14 -2 -12 -3 H12 Q14 -2 12 0Z" fill="#8a6a4a" opacity={0.5} />
            <g transform="translate(10 -20) rotate(-35)">
                <path d="M-14 0 Q-16 -12 -4 -14 Q12 -16 14 -4 L14 0Z" fill="#a9a29a" {...stroke("#8a847c")} />
            </g>
        </g>
    ),
    snowman: () => (
        <g>
            <circle cx={0} cy={-13} r={13} fill="#ffffff" {...stroke("#c9d6e6")} />
            <circle cx={0} cy={-34} r={9} fill="#ffffff" {...stroke("#c9d6e6")} />
            <circle cx={-3} cy={-36} r={1.3} fill={OUT} />
            <circle cx={3} cy={-36} r={1.3} fill={OUT} />
            <path d="M0 -33 L8 -31.5 L0 -30.5Z" fill="#f6862e" />
            <circle cx={0} cy={-18} r={1.4} fill={OUT} />
            <circle cx={0} cy={-11} r={1.4} fill={OUT} />
            <path d="M-9 -27 Q0 -23 9 -27 L9 -24 Q0 -20 -9 -24Z" fill="#e8605a" />
        </g>
    ),
    snowball: () => <circle cx={0} cy={-5} r={5} fill="#ffffff" {...stroke("#c9d6e6")} />,
    sled: () => (
        <g>
            <rect x={-20} y={-12} width={40} height={5} rx={2} fill="#e8605a" />
            <path d="M-18 -7 V-2 M16 -7 V-2" stroke="#6a7290" strokeWidth={2} />
            <path d="M-24 -2 H20 Q26 -2 26 -8" fill="none" stroke="#6a7290" strokeWidth={2.4} strokeLinecap="round" />
        </g>
    ),
    school: () => (
        <g>
            <rect x={-46} y={-50} width={92} height={50} fill="#f2c98a" {...stroke("#c99a5a")} />
            <path d="M-50 -48 L0 -68 L50 -48Z" fill="#c86a5a" />
            <rect x={-8} y={-26} width={16} height={26} fill="#8f5d34" />
            {[-36, -22, 14, 28].map((x) => (
                <rect key={x} x={x} y={-40} width={10} height={10} fill="#dff1fb" />
            ))}
            <circle cx={0} cy={-52} r={5} fill="#ffffff" {...stroke("#8a8a96", 1)} />
        </g>
    ),
    shopClosed: () => (
        <g>
            <rect x={-34} y={-70} width={68} height={70} fill="#f7e0ec" {...stroke("#d9a8c0")} />
            <path d="M-38 -70 H38 L34 -58 H-34Z" fill="#e86aa0" />
            <path d="M-34 -58 Q-26 -52 -17 -58 T0 -58 T17 -58 T34 -58" fill="#ffffff" />
            <rect x={-26} y={-46} width={52} height={46} fill="#9aa3ae" />
            <path d="M-26 -38 H26 M-26 -30 H26 M-26 -22 H26 M-26 -14 H26 M-26 -6 H26" stroke="#7f8893" strokeWidth={1.5} />
            <g transform="translate(26 -66) scale(0.8)">
                <ConeBody />
                <circle cx={0} cy={-15} r={6} fill="#f7a8c8" />
            </g>
        </g>
    ),
    iceCreamStand: () => (
        <g>
            <rect x={-30} y={-34} width={60} height={34} rx={3} fill="#ffffff" {...stroke("#c9d6e6")} />
            <rect x={-30} y={-34} width={60} height={8} fill="#f7a8c8" />
            <path d="M-34 -64 H34 L30 -54 H-30Z" fill="#6cc0e8" />
            <path d="M-26 -54 V-34 M26 -54 V-34" stroke="#c9d6e6" strokeWidth={2} />
            {[-14, 0, 14].map((x, i) => (
                <circle key={x} cx={x} cy={-16} r={5} fill={["#f7a8c8", "#fff1c8", "#8a5a3a"][i]} />
            ))}
        </g>
    ),
    truck: () => (
        <g>
            <rect x={-44} y={-40} width={58} height={34} rx={3} fill="#f4f0e6" {...stroke("#b9b0a0")} />
            <path d="M14 -30 H30 L40 -18 V-6 H14Z" fill="#3f8fd8" {...stroke("#2f6fb0")} />
            <rect x={20} y={-27} width={10} height={8} fill="#dff1fb" />
            <circle cx={-30} cy={-5} r={6} fill="#3b3f52" />
            <circle cx={26} cy={-5} r={6} fill="#3b3f52" />
            <rect x={-36} y={-34} width={14} height={12} fill="#e8b46a" />
            <rect x={-18} y={-32} width={12} height={10} fill="#e8b46a" />
        </g>
    ),
    bus: () => (
        <g>
            <rect x={-44} y={-36} width={88} height={30} rx={6} fill="#f4c94a" {...stroke("#d9a84a")} />
            {[-36, -18, 0, 18].map((x) => (
                <rect key={x} x={x} y={-31} width={14} height={11} rx={2} fill="#dff1fb" />
            ))}
            <circle cx={-26} cy={-5} r={6} fill="#3b3f52" />
            <circle cx={26} cy={-5} r={6} fill="#3b3f52" />
        </g>
    ),
    train: () => (
        <g>
            <rect x={-70} y={-50} width={140} height={44} rx={10} fill="#3f8fd8" {...stroke("#2f6fb0", 2)} />
            {[-58, -34, -10, 14, 38].map((x) => (
                <rect key={x} x={x} y={-42} width={18} height={14} rx={3} fill="#dff1fb" />
            ))}
            <rect x={-70} y={-22} width={140} height={5} fill="#ffffff" opacity={0.7} />
            <circle cx={-48} cy={-5} r={6} fill="#3b3f52" />
            <circle cx={48} cy={-5} r={6} fill="#3b3f52" />
        </g>
    ),
    fireTruck: () => (
        <g>
            <rect x={-46} y={-34} width={70} height={28} rx={3} fill="#e8463f" {...stroke("#a82a24")} />
            <path d="M24 -30 H34 L44 -18 V-6 H24Z" fill="#e8463f" {...stroke("#a82a24")} />
            <rect x={28} y={-27} width={8} height={8} fill="#dff1fb" />
            <path d="M-40 -40 H16 M-40 -40 V-34 M16 -40 V-34 M-30 -40 V-34 M-20 -40 V-34 M-10 -40 V-34 M0 -40 V-34" stroke="#c9d0da" strokeWidth={2.2} />
            <rect x={30} y={-36} width={8} height={5} rx={2} fill="#4d9be8" />
            <circle cx={-30} cy={-5} r={6} fill="#3b3f52" />
            <circle cx={28} cy={-5} r={6} fill="#3b3f52" />
        </g>
    ),
    boat: () => (
        <g>
            <path d="M-26 -10 H26 L18 0 H-18Z" fill="#e8605a" />
            <path d="M0 -12 V-50 L22 -14Z" fill="#ffffff" {...stroke("#c9d6e6")} />
            <path d="M-2 -46 L-18 -14 H-2Z" fill="#f4c94a" />
        </g>
    ),
    plane: () => (
        <g>
            <path d="M-30 -10 Q-30 -16 -20 -16 H24 Q32 -14 32 -10 Q30 -6 24 -6 H-24 Q-30 -6 -30 -10Z" fill="#ffffff" {...stroke("#9aa6b2")} />
            <path d="M-4 -12 L-14 -28 H-6 L8 -12Z M-4 -8 L-12 4 H-4 L6 -8Z" fill="#6cc0e8" />
            <path d="M-26 -14 L-32 -26 H-24 L-18 -14Z" fill="#6cc0e8" />
        </g>
    ),
    goal: () => (
        <g>
            <path d="M-36 0 V-40 H36 V0" fill="none" stroke="#ffffff" strokeWidth={4} />
            <g stroke="#d9dee6" strokeWidth={0.8}>
                {Array.from({ length: 8 }, (_, i) => (
                    <line key={`v${i}`} x1={-32 + i * 9} y1={-38} x2={-32 + i * 9} y2={0} />
                ))}
                {Array.from({ length: 4 }, (_, i) => (
                    <line key={`h${i}`} x1={-34} y1={-30 + i * 9} x2={34} y2={-30 + i * 9} />
                ))}
            </g>
        </g>
    ),
    bicycle: (tone = "#e8605a") => (
        <g>
            <circle cx={-20} cy={-12} r={12} fill="none" stroke="#3b3f52" strokeWidth={3} />
            <circle cx={20} cy={-12} r={12} fill="none" stroke="#3b3f52" strokeWidth={3} />
            <path d="M-20 -12 L-6 -32 H14 L20 -12 M-6 -32 L2 -12 L14 -32 M-20 -12 H2" fill="none" stroke={tone} strokeWidth={3} strokeLinejoin="round" />
            <path d="M-10 -36 H0 M14 -32 L12 -40 H18" fill="none" stroke="#3b3f52" strokeWidth={2.6} strokeLinecap="round" />
        </g>
    ),
    bicycleSmall: (tone = "#9b7ef0") => (
        <g>
            {PROPS.bicycle(tone)}
            <circle cx={-30} cy={-6} r={5} fill="none" stroke="#3b3f52" strokeWidth={2} />
            <path d="M-30 -6 L-20 -12" stroke="#3b3f52" strokeWidth={2} />
        </g>
    ),
    sun: () => (
        <g>
            <circle cx={0} cy={-14} r={10} fill="#ffd84a" />
            <g stroke="#ffd84a" strokeWidth={2.4} strokeLinecap="round">
                {Array.from({ length: 8 }, (_, i) => {
                    const a = (i * Math.PI) / 4;
                    return <line key={i} x1={Math.cos(a) * 13} y1={-14 + Math.sin(a) * 13} x2={Math.cos(a) * 17} y2={-14 + Math.sin(a) * 17} />;
                })}
            </g>
        </g>
    ),
    cloud: () => (
        <g fill="#ffffff" {...stroke("#d6e2f0", 1)}>
            <ellipse cx={0} cy={-8} rx={16} ry={8} />
            <ellipse cx={-10} cy={-6} rx={10} ry={6} />
            <ellipse cx={11} cy={-6} rx={11} ry={6} />
            <ellipse cx={2} cy={-14} rx={9} ry={7} />
        </g>
    ),
    rainCloud: () => (
        <g>
            <g fill="#a9b2c0">
                <ellipse cx={0} cy={-20} rx={16} ry={8} />
                <ellipse cx={-10} cy={-18} rx={10} ry={6} />
                <ellipse cx={11} cy={-18} rx={11} ry={6} />
                <ellipse cx={2} cy={-26} rx={9} ry={7} />
            </g>
            <g stroke="#6f9fd8" strokeWidth={1.8} strokeLinecap="round">
                {[-10, -2, 6, 14].map((x) => (
                    <line key={x} x1={x} y1={-9} x2={x - 2} y2={-2} />
                ))}
            </g>
        </g>
    ),
    rainbow: () => (
        <g fill="none" strokeWidth={4}>
            {["#ef6a6a", "#f6a23e", "#f6d84a", "#6ccf6a", "#5aa8ee", "#9b7ef0"].map((color, i) => (
                <path key={color} d={`M${-40 + i * 4} 0 A${40 - i * 4} ${36 - i * 4} 0 0 1 ${40 - i * 4} 0`} stroke={color} />
            ))}
        </g>
    ),
    moon: () => <path d="M0 -24 a12 12 0 1 0 10 18 a10 10 0 1 1 -10 -18Z" fill="#fff1a8" />,
    lightning: () => <path d="M4 -40 L-8 -18 H0 L-6 0 L12 -24 H3 Z" fill="#ffd84a" {...stroke("#e8a92a", 1)} />,
    smoke: () => (
        <g fill="#b9b9c2" opacity={0.85}>
            <circle cx={0} cy={-8} r={8} />
            <circle cx={8} cy={-18} r={9} />
            <circle cx={-4} cy={-26} r={8} />
            <circle cx={6} cy={-34} r={7} />
        </g>
    ),
    steam: () => (
        <path d="M-5 0 Q-9 -6 -5 -12 Q-1 -18 -5 -24 M5 0 Q1 -6 5 -12 Q9 -18 5 -24" fill="none" stroke="#c9d0da" strokeWidth={2} strokeLinecap="round" />
    ),
    shopShelf: () => (
        <g>
            <rect x={-30} y={-60} width={60} height={60} fill="#f2e6d2" {...stroke("#c9a27a")} />
            <path d="M-30 -40 H30 M-30 -20 H30" stroke="#c9a27a" strokeWidth={2} />
            {[-22, -10, 2, 14].map((x, i) => (
                <rect key={x} x={x} y={-56} width={9} height={15} rx={2} fill={["#f28b6e", "#6cc0e8", "#f4c94a", "#8fd07a"][i]} />
            ))}
            {[-22, -8, 6].map((x, i) => (
                <rect key={x} x={x} y={-36} width={12} height={15} rx={2} fill={["#e86aa0", "#7a4a28", "#f4c94a"][i]} />
            ))}
        </g>
    ),
    cart: () => (
        <g>
            <path d="M-20 -30 H-14 L-8 -10 H16 L20 -26 H-12" fill="#dff1fb" {...stroke("#6a7290", 2)} />
            <circle cx={-6} cy={-4} r={3} fill="#3b3f52" />
            <circle cx={14} cy={-4} r={3} fill="#3b3f52" />
        </g>
    ),
    register: () => (
        <g>
            <rect x={-30} y={-30} width={60} height={30} fill="#c9a27a" {...stroke(WOOD_DARK)} />
            <rect x={-12} y={-46} width={22} height={16} rx={2} fill="#3b3f52" />
            <rect x={-9} y={-43} width={16} height={6} fill="#8fe0a8" />
        </g>
    ),
    seat: (tone = "#4d7fc8") => (
        <g>
            <rect x={-16} y={-46} width={32} height={30} rx={6} fill={tone} />
            <rect x={-18} y={-20} width={36} height={12} rx={4} fill={tone} {...stroke("#00000033")} />
            <rect x={-2} y={-8} width={4} height={8} fill="#5a5a6a" />
        </g>
    ),
    ticket: () => (
        <g>
            <rect x={-10} y={-8} width={20} height={8} rx={1.5} fill="#f4c94a" {...stroke("#d9a84a", 1)} />
            <path d="M-4 -8 V0" stroke="#d9a84a" strokeWidth={1} strokeDasharray="1.5 1" />
        </g>
    ),
    lifebuoy: () => (
        <g>
            <circle cx={0} cy={-12} r={11} fill="none" stroke="#e8463f" strokeWidth={6} />
            <path d="M0 -23 V-17 M0 -7 V-1 M-11 -12 H-5 M5 -12 H11" stroke="#ffffff" strokeWidth={6.5} />
        </g>
    ),
    laneRope: () => (
        <g>
            {Array.from({ length: 24 }, (_, i) => (
                <ellipse key={i} cx={-120 + i * 10 + 5} cy={-2} rx={4.5} ry={2.4} fill={i % 2 ? "#e8463f" : "#ffffff"} />
            ))}
        </g>
    ),
    poolSlide: () => (
        <g>
            <path d="M-30 0 V-60 M-16 0 V-60" stroke="#9aa6b2" strokeWidth={3} />
            <path d="M-30 -14 H-16 M-30 -28 H-16 M-30 -42 H-16" stroke="#9aa6b2" strokeWidth={2.2} />
            <path d="M-14 -62 Q16 -40 26 -4 L36 -4 Q26 -48 -14 -54Z" fill="#4d9be8" {...stroke("#2f6fb0")} />
        </g>
    ),
    whistle: () => (
        <g>
            <rect x={-6} y={-8} width={12} height={7} rx={3.5} fill="#f4c94a" {...stroke("#d9a84a", 1)} />
            <rect x={4} y={-10} width={6} height={4} fill="#f4c94a" />
        </g>
    ),

    // ── Životinje ─────────────────────────────────────────────────────────────
    cat: (tone = "#f4b06a") => (
        <Animal body={tone}>
            <ellipse cx={0} cy={-8} rx={11} ry={7} />
            <circle cx={9} cy={-16} r={7} />
            <path d="M4 -21 L5 -28 L9 -22Z M10 -22 L14 -28 L15 -20Z" />
            <path d="M-10 -10 Q-20 -14 -16 -24" fill="none" stroke={tone} strokeWidth={3.5} strokeLinecap="round" />
            <circle cx={7.5} cy={-17} r={1.1} fill={OUT} />
            <circle cx={12} cy={-17} r={1.1} fill={OUT} />
            <path d="M8.5 -13.5 Q10 -12 11.5 -13.5" fill="none" stroke={OUT} strokeWidth={0.8} />
            <rect x={-8} y={-4} width={3.5} height={4} rx={1.5} />
            <rect x={4} y={-4} width={3.5} height={4} rx={1.5} />
        </Animal>
    ),
    dog: (tone = "#e8c27a") => (
        <Animal body={tone}>
            <ellipse cx={0} cy={-10} rx={13} ry={8} />
            <circle cx={12} cy={-20} r={8} />
            <ellipse cx={17} cy={-15} rx={5} ry={3.6} fill="#f6e2b8" />
            <circle cx={21} cy={-16} r={1.6} fill={OUT} />
            <ellipse cx={8} cy={-22} rx={3.2} ry={7} fill="#b9894a" transform="rotate(20 8 -22)" />
            <circle cx={13} cy={-22} r={1.2} fill={OUT} />
            <path d="M-12 -12 Q-20 -18 -18 -24" fill="none" stroke={tone} strokeWidth={3.2} strokeLinecap="round" />
            <rect x={-10} y={-5} width={4} height={5} rx={1.5} />
            <rect x={6} y={-5} width={4} height={5} rx={1.5} />
        </Animal>
    ),
    bigDog: () => (
        <g>
            <g transform="scale(1.6)">{PROPS.dog("#b9894a")}</g>
            <path d="M42 -34 L50 -38 M43 -28 L52 -28 M42 -22 L50 -18" stroke="#6a7290" strokeWidth={1.8} strokeLinecap="round" />
            <path d="M-26 -14 H-38 M-24 -22 H-34 M-26 -6 H-36" stroke="#9aa6b2" strokeWidth={1.8} strokeLinecap="round" />
        </g>
    ),
    dogBowl: () => (
        <g>
            <path d="M-10 -6 H10 L8 0 H-8Z" fill="#e8605a" {...stroke("#b9443e", 1)} />
            <ellipse cx={0} cy={-6} rx={10} ry={2} fill="#f4dcc8" />
        </g>
    ),
    dogBed: () => (
        <g>
            <ellipse cx={0} cy={-6} rx={26} ry={8} fill="#c98e5a" />
            <ellipse cx={0} cy={-8} rx={20} ry={5} fill="#e8c9a0" />
        </g>
    ),
    poodle: () => (
        <Animal body="#f4f0f6">
            <circle cx={-6} cy={-10} r={7} stroke="#c9c2d6" strokeWidth={1} />
            <circle cx={4} cy={-11} r={8} stroke="#c9c2d6" strokeWidth={1} />
            <circle cx={13} cy={-21} r={7} stroke="#c9c2d6" strokeWidth={1} />
            <circle cx={9} cy={-27} r={4.5} stroke="#c9c2d6" strokeWidth={1} />
            <circle cx={15} cy={-22} r={1.1} fill={OUT} />
            <circle cx={19} cy={-18} r={1.4} fill={OUT} />
            <circle cx={-13} cy={-16} r={3.5} stroke="#c9c2d6" strokeWidth={1} />
            <rect x={-8} y={-5} width={3.5} height={5} />
            <rect x={6} y={-5} width={3.5} height={5} />
        </Animal>
    ),
    bee: () => (
        <g>
            <ellipse cx={-2} cy={-8} rx={4} ry={3} fill="#dff1fb" opacity={0.9} transform="rotate(-30 -2 -8)" />
            <ellipse cx={3} cy={-8} rx={4} ry={3} fill="#dff1fb" opacity={0.9} transform="rotate(30 3 -8)" />
            <ellipse cx={0} cy={-3} rx={6} ry={4} fill="#f4c94a" {...stroke(OUT, 0.8)} />
            <path d="M-2 -7 V1 M2 -7 V1" stroke={OUT} strokeWidth={1.6} />
            <circle cx={5} cy={-4} r={0.9} fill={OUT} />
        </g>
    ),
    spider: () => (
        <g>
            <g stroke="#4a4050" strokeWidth={1.8} fill="none" strokeLinecap="round">
                <path d="M-4 -6 Q-12 -12 -16 -4 M-4 -4 Q-12 -6 -16 2 M4 -6 Q12 -12 16 -4 M4 -4 Q12 -6 16 2" />
            </g>
            <ellipse cx={0} cy={-6} rx={7} ry={6} fill="#5a4a60" />
            <circle cx={-2.4} cy={-7} r={1.8} fill="#ffffff" />
            <circle cx={2.4} cy={-7} r={1.8} fill="#ffffff" />
            <circle cx={-2.2} cy={-6.8} r={0.9} fill={OUT} />
            <circle cx={2.6} cy={-6.8} r={0.9} fill={OUT} />
        </g>
    ),
    squirrel: () => (
        <Animal body="#c8743a">
            <path d="M-6 -4 Q-20 -6 -18 -22 Q-16 -32 -6 -28 Q-12 -20 -4 -12Z" fill="#d9894a" />
            <ellipse cx={2} cy={-8} rx={7} ry={7} />
            <circle cx={6} cy={-16} r={5} />
            <path d="M5 -20 L6 -24 L8 -20Z" />
            <circle cx={8} cy={-16.5} r={1} fill={OUT} />
        </Animal>
    ),
    frog: () => (
        <Animal body="#7fc46a">
            <ellipse cx={0} cy={-6} rx={10} ry={6} />
            <circle cx={-5} cy={-12} r={4} />
            <circle cx={5} cy={-12} r={4} />
            <circle cx={-5} cy={-12.5} r={2.2} fill="#ffffff" />
            <circle cx={5} cy={-12.5} r={2.2} fill="#ffffff" />
            <circle cx={-5} cy={-12.5} r={1.1} fill={OUT} />
            <circle cx={5} cy={-12.5} r={1.1} fill={OUT} />
            <path d="M-4 -5 Q0 -2 4 -5" fill="none" stroke="#3f7a3a" strokeWidth={1} />
            <path d="M-12 0 Q-8 -4 -4 0 M12 0 Q8 -4 4 0" fill="#72b85e" />
        </Animal>
    ),
    rabbit: () => (
        <Animal body="#f4f0f6">
            <ellipse cx={0} cy={-8} rx={8} ry={8} stroke="#c9c2d6" strokeWidth={1} />
            <circle cx={0} cy={-19} r={6} stroke="#c9c2d6" strokeWidth={1} />
            <ellipse cx={-3} cy={-30} rx={2.4} ry={7} stroke="#c9c2d6" strokeWidth={1} />
            <ellipse cx={3} cy={-30} rx={2.4} ry={7} stroke="#c9c2d6" strokeWidth={1} />
            <ellipse cx={-3} cy={-30} rx={1} ry={4.5} fill="#f7c8d8" />
            <ellipse cx={3} cy={-30} rx={1} ry={4.5} fill="#f7c8d8" />
            <circle cx={-2} cy={-20} r={0.9} fill={OUT} />
            <circle cx={2} cy={-20} r={0.9} fill={OUT} />
            <circle cx={0} cy={-17.5} r={0.9} fill="#e88aa8" />
        </Animal>
    ),
    topHat: () => (
        <g>
            <rect x={-10} y={-18} width={20} height={16} rx={1.5} fill="#2f2448" />
            <rect x={-15} y={-4} width={30} height={4} rx={2} fill="#2f2448" />
            <rect x={-10} y={-8} width={20} height={3} fill="#e0574f" />
        </g>
    ),
    lion: () => (
        <Animal body="#f2b44a">
            <circle cx={0} cy={-24} r={14} fill="#c8743a" />
            <ellipse cx={0} cy={-8} rx={14} ry={8} />
            <circle cx={0} cy={-24} r={9} />
            <circle cx={-3.5} cy={-26} r={1.2} fill={OUT} />
            <circle cx={3.5} cy={-26} r={1.2} fill={OUT} />
            <path d="M-2 -22 H2 L0 -20Z" fill={OUT} />
            <path d="M-3 -19 Q0 -17 3 -19" fill="none" stroke={OUT} strokeWidth={0.9} />
        </Animal>
    ),
    bird: (tone = "#4d9be8") => (
        <g>
            <ellipse cx={0} cy={-6} rx={7} ry={5} fill={tone} />
            <circle cx={5} cy={-11} r={4} fill={tone} />
            <path d="M8.5 -11.5 L12 -10.5 L8.5 -9.5Z" fill="#f6a23e" />
            <circle cx={6} cy={-12} r={0.9} fill={OUT} />
            <path d="M-3 -8 Q-8 -14 -10 -6Z" fill="#ffffff" opacity={0.6} />
        </g>
    ),
    fish: (tone = "#f6a23e") => (
        <g>
            <ellipse cx={0} cy={-8} rx={10} ry={6} fill={tone} />
            <path d="M-9 -8 L-16 -14 V-2Z" fill={tone} />
            <circle cx={5} cy={-9} r={1.2} fill={OUT} />
        </g>
    ),
    butterfly: () => (
        <g>
            <ellipse cx={-5} cy={-10} rx={5} ry={6} fill="#f6a23e" transform="rotate(-20 -5 -10)" />
            <ellipse cx={5} cy={-10} rx={5} ry={6} fill="#f6a23e" transform="rotate(20 5 -10)" />
            <ellipse cx={-4} cy={-3} rx={3} ry={3.5} fill="#e8605a" />
            <ellipse cx={4} cy={-3} rx={3} ry={3.5} fill="#e8605a" />
            <rect x={-0.8} y={-14} width={1.6} height={13} rx={0.8} fill={OUT} />
        </g>
    ),
    duck: () => (
        <g>
            <ellipse cx={0} cy={-5} rx={8} ry={5} fill="#f6d84a" />
            <circle cx={5} cy={-11} r={4} fill="#f6d84a" />
            <path d="M8.5 -11 L12 -10 L8.5 -9Z" fill="#f6862e" />
            <circle cx={6} cy={-12} r={0.8} fill={OUT} />
        </g>
    ),

    // ── Zdravlje ──────────────────────────────────────────────────────────────
    thermometer: () => (
        <g transform="rotate(-30)">
            <rect x={-2} y={-20} width={4} height={18} rx={2} fill="#ffffff" {...stroke("#9aa6b2", 1)} />
            <circle cx={0} cy={-2} r={3} fill="#e8463f" />
            <rect x={-0.8} y={-12} width={1.6} height={10} fill="#e8463f" />
        </g>
    ),
    syringe: () => (
        <g transform="rotate(-20)">
            <rect x={-3} y={-20} width={6} height={14} rx={1} fill="#e6f4fb" {...stroke("#9aa6b2", 1)} />
            <rect x={-1} y={-26} width={2} height={6} fill="#9aa6b2" />
            <rect x={-4} y={-27} width={8} height={2} rx={1} fill="#9aa6b2" />
            <rect x={-0.5} y={-6} width={1} height={4} fill="#c9d0da" />
        </g>
    ),
    plaster: () => (
        <g>
            <rect x={-8} y={-4} width={16} height={4} rx={2} fill="#f6c89a" {...stroke("#d99870", 0.8)} />
            <rect x={-2.5} y={-4} width={5} height={4} fill="#fbe0c0" />
        </g>
    ),
    stethoscope: () => (
        <g>
            <path d="M-6 -20 Q-8 -6 0 -4 Q8 -6 6 -20" fill="none" stroke="#4a5a6a" strokeWidth={1.8} />
            <circle cx={0} cy={-2} r={2.6} fill="#8a9ab0" />
        </g>
    ),
    dentistChair: () => (
        <g>
            <rect x={-6} y={-20} width={12} height={20} fill="#9aa6b2" />
            <path d="M-40 -34 Q-44 -42 -36 -44 L-20 -40 L30 -30 Q36 -28 34 -22 L-34 -24 Q-40 -26 -40 -34Z" fill="#6cc4b8" {...stroke("#3f9a8f")} />
            <rect x={-20} y={-24} width={50} height={6} rx={2} fill="#4fb0a4" />
        </g>
    ),
    tooth: () => (
        <path d="M-10 -24 Q-12 -30 -4 -30 Q0 -27 4 -30 Q12 -30 10 -24 Q10 -12 6 -2 Q4 2 2 -4 L0 -10 L-2 -4 Q-4 2 -6 -2 Q-10 -12 -10 -24Z" fill="#ffffff" {...stroke("#b9c6d4")} />
    ),
    toothbrush: () => (
        <g transform="rotate(-35)">
            <rect x={-1.6} y={-22} width={3.2} height={22} rx={1.6} fill="#4d9be8" />
            <rect x={-2.6} y={-30} width={5.2} height={8} rx={1} fill="#ffffff" {...stroke("#9aa6b2", 0.8)} />
            <path d="M-2 -30 V-33 M0 -30 V-33 M2 -30 V-33" stroke="#8fd0f0" strokeWidth={1} />
        </g>
    ),
    waitingChairs: () => (
        <g>
            {[-30, 0, 30].map((x) => (
                <g key={x} transform={`translate(${x} 0)`}>
                    <rect x={-12} y={-34} width={24} height={14} rx={3} fill="#6aa6e8" />
                    <rect x={-13} y={-20} width={26} height={5} rx={2} fill="#4a86c8" />
                    <rect x={-1.5} y={-15} width={3} height={15} fill="#8a8a96" />
                </g>
            ))}
        </g>
    ),
    lampBright: () => (
        <g>
            <path d="M0 0 V-10" stroke="#8a8a96" strokeWidth={2} />
            <ellipse cx={0} cy={-14} rx={12} ry={6} fill="#f2f2f4" {...stroke("#b9bcc8")} />
            <ellipse cx={0} cy={-10} rx={8} ry={3} fill="#fff6c8" />
            <path d="M-8 -6 L-14 6 M0 -6 V8 M8 -6 L14 6" stroke="#fff1a8" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
        </g>
    ),
    soapBubbles: () => (
        <g fill="#dff1fb" stroke="#9ac4dc" strokeWidth={1}>
            <circle cx={-8} cy={-10} r={6} opacity={0.8} />
            <circle cx={4} cy={-18} r={4} opacity={0.8} />
            <circle cx={10} cy={-6} r={5} opacity={0.8} />
            <circle cx={-2} cy={-26} r={3} opacity={0.8} />
        </g>
    ),
    towel: () => (
        <g>
            <rect x={-12} y={-30} width={24} height={30} rx={2} fill="#f28b6e" />
            <path d="M-12 -8 H12" stroke="#ffffff" strokeWidth={2} />
        </g>
    ),
    shower: () => (
        <g>
            <path d="M-14 -70 V-80 H6 V-74" fill="none" stroke="#9aa6b2" strokeWidth={3} />
            <path d="M-2 -74 H14 L12 -70 H0Z" fill="#9aa6b2" />
            <g stroke="#8fd0f0" strokeWidth={1.6} strokeLinecap="round">
                {[0, 4, 8, 12].map((x) => (
                    <line key={x} x1={x} y1={-66} x2={x - 3} y2={-50} />
                ))}
            </g>
        </g>
    ),

    // ── Odeća i stvari ────────────────────────────────────────────────────────
    cap: (tone = "#3f8fd8") => (
        <g>
            <path d="M-10 -2 C-10 -14 10 -14 10 -2 Z" fill={tone} {...stroke("#00000033")} />
            <path d="M6 -3 H18 Q18 0 14 0 H6Z" fill={tone} {...stroke("#00000033")} />
        </g>
    ),
    glove: (tone = "#e8605a") => (
        <g>
            <path d="M-6 0 V-12 Q-6 -16 -2 -16 H4 Q8 -16 8 -12 V0Z" fill={tone} />
            <ellipse cx={-7} cy={-9} rx={2.6} ry={4} fill={tone} transform="rotate(-25 -7 -9)" />
            <rect x={-7} y={-3} width={16} height={3} fill="#ffffff" opacity={0.7} />
        </g>
    ),
    shoe: () => (
        <g>
            <path d="M-14 0 V-8 Q-14 -12 -8 -12 L2 -12 Q6 -6 12 -6 Q16 -5 16 0Z" fill="#4d9be8" {...stroke("#2f6fb0")} />
            <path d="M-6 -12 Q-2 -18 0 -12 Q2 -18 6 -12" fill="none" stroke="#ffffff" strokeWidth={1.8} strokeLinecap="round" />
            <path d="M-14 -1 H16" stroke="#ffffff" strokeWidth={2} />
        </g>
    ),
    shoes: () => (
        <g>
            <g transform="translate(-10 0) scale(0.75)">{PROPS.shoe()}</g>
            <g transform="translate(12 0) scale(0.75)">{PROPS.shoe()}</g>
        </g>
    ),
    socks: () => (
        <g>
            {[-8, 8].map((x) => (
                <path key={x} d={`M${x - 4} -24 H${x + 4} V-8 Q${x + 4} 0 ${x - 4} 0 H${x - 8} Q${x - 11} 0 ${x - 10} -3 Q${x - 8} -6 ${x - 4} -6Z`} fill="#ffffff" {...stroke("#b9c6d4")} />
            ))}
        </g>
    ),
    magnifier: () => (
        <g transform="rotate(-30)">
            <rect x={-1.6} y={-12} width={3.2} height={12} rx={1.6} fill={WOOD} />
            <circle cx={0} cy={-18} r={7} fill="#dff1fb" opacity={0.8} {...stroke("#6a7290", 2)} />
        </g>
    ),
    glasses: () => (
        <g fill="none" stroke="#4a4a5a" strokeWidth={1.8}>
            <circle cx={-7} cy={-6} r={5.5} />
            <circle cx={7} cy={-6} r={5.5} />
            <path d="M-1.5 -6 H1.5" />
        </g>
    ),
    nail: () => (
        <g>
            <rect x={-30} y={-10} width={60} height={10} rx={1} fill="#e3b77a" {...stroke("#b9894a")} />
            <rect x={-1} y={-26} width={2} height={16} fill="#9aa6b2" />
            <rect x={-4} y={-28} width={8} height={2.5} rx={1} fill="#7a8394" />
        </g>
    ),
    eyeChart: () => (
        <g>
            <rect x={-18} y={-48} width={36} height={48} rx={2} fill="#ffffff" {...stroke("#c9c2b6")} />
            {[
                [-40, 10],
                [-28, 7],
                [-18, 5],
                [-10, 3.5],
            ].map(([y, size]) => (
                <g key={y} fill="#3b3f52" opacity={0.75}>
                    {[-1, 0, 1].slice(0, size > 6 ? 1 : 3).map((i) => (
                        <rect key={i} x={i * (size + 3) - size / 2} y={y} width={size} height={size} rx={size / 4} />
                    ))}
                </g>
            ))}
        </g>
    ),
    lock: () => (
        <g>
            <rect x={-20} y={-92} width={40} height={92} rx={2} fill="#c98e5a" {...stroke("#9a6a3e", 2)} />
            <rect x={6} y={-54} width={10} height={16} rx={2} fill="#f4c94a" {...stroke("#c98a12", 1)} />
            <circle cx={11} cy={-48} r={2} fill="#3b3f52" />
            <rect x={10} y={-48} width={2} height={5} fill="#3b3f52" />
        </g>
    ),
    // Rukom pisani redovi (bez pravih slova, da slika ne zavisi od pisma)
    letters: () => (
        <g fill="none" stroke="#3b3f52" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M-18 -4 q2 -8 4 0 t4 0 t4 0 M-4 -10 V-4 q0 3 3 1 M3 -4 q2 -8 4 0 t4 0 t4 0" />
        </g>
    ),
    rainDrops: () => (
        <g stroke="#6f9fd8" strokeWidth={1.8} strokeLinecap="round">
            {Array.from({ length: 10 }, (_, i) => (
                <line key={i} x1={-40 + i * 9} y1={-30 + ((i * 13) % 20)} x2={-42 + i * 9} y2={-23 + ((i * 13) % 20)} />
            ))}
        </g>
    ),
    snowflakes: () => (
        <g fill="#ffffff" stroke="#c9d6e6" strokeWidth={0.6}>
            {Array.from({ length: 10 }, (_, i) => (
                <circle key={i} cx={-40 + i * 9} cy={-30 + ((i * 17) % 28)} r={2.2} />
            ))}
        </g>
    ),
    leaves: () => (
        <g>
            {[
                [-8, -4, "#f6a23e", 20],
                [6, -2, "#e8605a", -30],
                [0, -10, "#f4c94a", 60],
            ].map(([x, y, color, rot]) => (
                <ellipse key={`${x}`} cx={x as number} cy={y as number} rx={5} ry={2.6} fill={color as string} transform={`rotate(${rot} ${x} ${y})`} />
            ))}
        </g>
    ),

    // ── Znakovi i pokret ──────────────────────────────────────────────────────
    heart: (tone = "#ef6a8a") => <path d="M0 0 C-14 -10 -10 -22 0 -16 C10 -22 14 -10 0 0Z" fill={tone} />,
    star: () => (
        <path
            d="M0 -22 L3.5 -13 L13 -12.5 L5.6 -6.5 L8.2 2.8 L0 -2.5 L-8.2 2.8 L-5.6 -6.5 L-13 -12.5 L-3.5 -13Z"
            fill="#f6d84a"
            {...stroke("#d9a84a", 1)}
        />
    ),
    notes: () => (
        <g fill="#6c61f0">
            <ellipse cx={-6} cy={-4} rx={3.5} ry={2.6} />
            <rect x={-3} y={-18} width={1.6} height={14} />
            <path d="M-3 -18 Q2 -16 3 -12" fill="none" stroke="#6c61f0" strokeWidth={1.6} />
            <ellipse cx={8} cy={-10} rx={3.5} ry={2.6} />
            <rect x={11} y={-24} width={1.6} height={14} />
        </g>
    ),
    loudNotes: () => (
        <g>
            <g transform="scale(1.4)">{PROPS.notes()}</g>
            <path d="M-20 -30 L-26 -36 M-22 -20 H-30 M24 -34 L30 -40 M26 -24 H34" stroke="#e8605a" strokeWidth={2.2} strokeLinecap="round" />
        </g>
    ),
    soundWaves: () => (
        <g fill="none" stroke="#6a7290" strokeWidth={2} strokeLinecap="round">
            <path d="M0 -14 Q5 -8 0 -2" />
            <path d="M5 -20 Q13 -8 5 4" />
            <path d="M10 -26 Q21 -8 10 10" />
        </g>
    ),
    motion: () => (
        <g stroke="#9aa6b2" strokeWidth={2} strokeLinecap="round">
            <path d="M0 -4 H-14 M2 -12 H-10 M0 -20 H-12" />
        </g>
    ),
    motionLeft: () => (
        <g stroke="#9aa6b2" strokeWidth={2} strokeLinecap="round">
            <path d="M0 -4 H14 M-2 -12 H10 M0 -20 H12" />
        </g>
    ),
    spin: () => (
        <g fill="none" stroke="#9aa6b2" strokeWidth={2.2} strokeLinecap="round">
            <path d="M-40 -10 Q0 10 40 -10" />
            <path d="M34 -16 L40 -10 L32 -6" />
            <path d="M-30 -30 Q0 -40 30 -30" opacity={0.7} />
        </g>
    ),
    burst: () => (
        <g>
            <path d="M0 -26 L5 -15 L17 -19 L11 -8 L22 -2 L10 2 L13 13 L2 7 L-4 17 L-6 5 L-18 8 L-11 -2 L-20 -10 L-8 -12 L-10 -24 L-2 -15Z" fill="#ffe08a" {...stroke("#f6a23e", 1.5)} />
            <path d="M-4 -8 L4 -6 M-2 -2 L6 2" stroke="#e8605a" strokeWidth={2} strokeLinecap="round" />
        </g>
    ),
    sparkle: () => (
        <g fill="#f6d84a">
            <path d="M0 -12 L2 -6 L8 -4 L2 -2 L0 4 L-2 -2 L-8 -4 L-2 -6Z" />
            <path d="M12 -22 L13 -19 L16 -18 L13 -17 L12 -14 L11 -17 L8 -18 L11 -19Z" />
        </g>
    ),
    zzz: () => (
        <g fill="none" stroke="#9aa6c8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M0 -6 H6 L0 0 H6" />
            <path d="M8 -16 H16 L8 -8 H16" />
        </g>
    ),
    hourglass: () => (
        <g>
            <rect x={-9} y={-26} width={18} height={3} rx={1} fill={WOOD} />
            <rect x={-9} y={-3} width={18} height={3} rx={1} fill={WOOD} />
            <path d="M-7 -23 H7 Q7 -16 1 -13 Q7 -10 7 -3 H-7 Q-7 -10 -1 -13 Q-7 -16 -7 -23Z" fill="#e6f4fb" {...stroke("#9ac4dc", 1)} />
            <path d="M-4 -19 H4 Q3 -16 0 -14 Q-3 -16 -4 -19Z M-5 -3 Q0 -9 5 -3Z" fill="#e8c88a" />
        </g>
    ),
    question: () => (
        <g>
            <circle cx={0} cy={-12} r={12} fill="#ffffff" {...stroke("#aca7fd", 2)} />
            <path d="M-4 -16 Q-4 -21 0 -21 Q4 -21 4 -17 Q4 -14 0 -12 V-9" fill="none" stroke="#6c61f0" strokeWidth={2.6} strokeLinecap="round" />
            <circle cx={0} cy={-5} r={1.6} fill="#6c61f0" />
        </g>
    ),
    arrow: () => <path d="M-14 -6 H6 V-12 L16 -4 L6 4 V-2 H-14Z" fill="#6c61f0" />,

    // ── Delovi životinja i stvari ─────────────────────────────────────────────
    trunk: () => (
        <g>
            <path d="M-8 -60 Q-12 -30 -6 -14 Q0 0 12 -2 Q18 -4 16 -10 Q8 -8 6 -14 Q4 -30 8 -60Z" fill="#a9aab8" {...stroke("#7f8094")} />
            <path d="M-6 -48 H6 M-5 -38 H5 M-4 -28 H4" stroke="#7f8094" strokeWidth={1.2} strokeLinecap="round" />
        </g>
    ),
    spikes: () => (
        <g>
            <ellipse cx={0} cy={-6} rx={24} ry={8} fill="#a8794e" />
            {Array.from({ length: 9 }, (_, i) => {
                const x = -20 + i * 5;
                return <path key={i} d={`M${x - 3} -8 L${x} -${24 + (i % 3) * 4} L${x + 3} -8Z`} fill={i % 2 ? "#7a5232" : "#8f6440"} />;
            })}
        </g>
    ),
    longEars: () => (
        <g>
            {[-8, 8].map((x) => (
                <g key={x} transform={`rotate(${x / 2} ${x} 0)`}>
                    <ellipse cx={x} cy={-22} rx={6} ry={22} fill="#f4f0f6" {...stroke("#c9c2d6")} />
                    <ellipse cx={x} cy={-22} rx={3} ry={16} fill="#f7c8d8" />
                </g>
            ))}
        </g>
    ),
    feather: () => (
        <g transform="rotate(-25)">
            <path d="M0 0 V-40" stroke="#c9a24a" strokeWidth={1.6} strokeLinecap="round" />
            <path d="M0 -6 Q-12 -14 -8 -34 Q-2 -44 0 -42 Q2 -44 8 -34 Q12 -14 0 -6Z" fill="#6cc0e8" {...stroke("#3f8fd8", 1)} />
            <path d="M0 -12 L-6 -18 M0 -20 L-7 -26 M0 -28 L-5 -33 M0 -16 L6 -22 M0 -24 L6 -30" stroke="#3f8fd8" strokeWidth={0.9} strokeLinecap="round" />
        </g>
    ),
    shell: () => (
        <g>
            <path d="M-26 0 Q-26 -30 0 -30 Q26 -30 26 0Z" fill="#8fb86a" {...stroke("#5f8a3f")} />
            <path d="M-8 -30 L-12 -16 L-4 -6 L8 -6 L14 -16 L8 -30 M-12 -16 H-26 M14 -16 H26 M-4 -6 L-8 0 M8 -6 L12 0" fill="none" stroke="#5f8a3f" strokeWidth={1.6} />
        </g>
    ),
    honey: () => (
        <g>
            <rect x={-12} y={-24} width={24} height={24} rx={6} fill="#f6b23e" {...stroke("#c9821a")} />
            <rect x={-13} y={-28} width={26} height={6} rx={2} fill="#e8d2a8" {...stroke("#b9a07a", 1)} />
            <path d="M-6 -22 Q-6 -14 -3 -12 Q0 -14 0 -22" fill="#f8cf6a" />
            <ellipse cx={-4} cy={-14} rx={3} ry={5} fill="#ffffff" opacity={0.3} />
        </g>
    ),
    pedal: () => (
        <g>
            <circle cx={0} cy={-26} r={9} fill="#9aa6b2" {...stroke("#6a7290")} />
            <circle cx={0} cy={-26} r={3} fill="#6a7290" />
            <path d="M0 -26 L14 -6" stroke="#6a7290" strokeWidth={4} strokeLinecap="round" />
            <rect x={6} y={-8} width={18} height={6} rx={2} fill="#3b3f52" />
            <path d="M8 -5 H22" stroke="#f4c94a" strokeWidth={1.4} />
        </g>
    ),
    ladybug: () => (
        <g>
            <path d="M-18 0 Q-14 -16 4 -16 Q20 -14 22 0Z" fill="#7fc46a" {...stroke("#5f9a4f", 1)} />
            <g transform="translate(2 -16)">
                <circle cx={0} cy={0} r={2.6} fill="#e8463f" />
                <circle cx={-0.8} cy={-0.6} r={0.6} fill="#3b3f52" />
                <circle cx={0.9} cy={0.6} r={0.6} fill="#3b3f52" />
            </g>
        </g>
    ),
    bubbles: () => (
        <g fill="none" stroke="#ffffff" strokeWidth={1.6}>
            <circle cx={-6} cy={-8} r={4} />
            <circle cx={4} cy={-20} r={3} />
            <circle cx={-2} cy={-32} r={2.4} />
            <circle cx={8} cy={-40} r={1.8} />
        </g>
    ),
    // Flaša vode (drugačija od čaše, da ne odaje odgovor „Iz čega pijemo vodu?”)
    bottle: () => (
        <g>
            <path d="M-8 -26 Q-8 -30 -4 -32 V-36 H4 V-32 Q8 -30 8 -26 V-2 Q8 0 6 0 H-6 Q-8 0 -8 -2Z" fill="#dff1fb" {...stroke("#6f9fd8")} />
            <path d="M-7.5 -20 H7.5 V-2 Q7.5 -0.5 6 -0.5 H-6 Q-7.5 -0.5 -7.5 -2Z" fill="#8fd0f0" />
            <rect x={-5} y={-40} width={10} height={5} rx={1.5} fill="#3f8fd8" />
        </g>
    ),
    // Mlaz vode iz slavine
    stream: () => (
        <g>
            <path d="M0 -16 Q2 -8 0 0" fill="none" stroke="#6cc0e8" strokeWidth={3.5} strokeLinecap="round" />
            <circle cx={-3} cy={3} r={1.4} fill="#6cc0e8" />
            <circle cx={3} cy={4} r={1.2} fill="#6cc0e8" />
        </g>
    ),
    strings: () => (
        <g>
            <rect x={-26} y={-30} width={52} height={30} rx={4} fill="#e8c9a0" {...stroke("#b9894a")} />
            <g stroke="#6a7290" strokeWidth={1.2}>
                {[-24, -18, -12, -6, 0].map((y) => (
                    <line key={y} x1={-26} y1={y} x2={26} y2={y} />
                ))}
            </g>
            <g transform="translate(14 -36)">{PROPS.notes()}</g>
        </g>
    ),
};

export function Prop({ id, tone }: { id: PropId; tone?: string }) {
    return <>{PROPS[id](tone)}</>;
}

export function hasProp(id: string): boolean {
    return Object.hasOwn(PROPS, id);
}
