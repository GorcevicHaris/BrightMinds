// Vozila kojih nema u postojećim kompletima: avion, trotinet, traktor, helikopter, raketa i džip.
// Bočno, kao autić iz igre „Šta fali?”: krupni točkovi, prozori, mirne boje; okvir 100 × 100.

import type { ReactNode } from "react";
import { line, Shadow } from "./kit";

function Wheel({ x, y, r }: { x: number; y: number; r: number }) {
    return (
        <g>
            <circle cx={x} cy={y} r={r} fill="#3a3a4a" />
            <circle cx={x} cy={y} r={r * 0.45} fill="#c8ccd8" />
        </g>
    );
}

export const VEHICLE_ART = {
    plane: () => (
        <g>
            <path d="M50 44 L30 14 H40 L66 44Z" fill="#3e7bfa" {...line("#2a58c0")} />
            <path d="M8 44 Q8 36 20 36 H76 Q94 36 96 48 Q94 58 76 58 H22 Q8 58 8 44Z" fill="#f2f6fc" {...line("#8a9ab8")} />
            <path d="M8 44 L4 22 H14 L24 38Z" fill="#3e7bfa" {...line("#2a58c0")} />
            <path d="M44 54 L30 84 H40 L64 54Z" fill="#3e7bfa" {...line("#2a58c0")} />
            <g fill="#8fd0f6" {...line("#5a8ac0", 1)}>
                {[32, 42, 52, 62].map((x) => (
                    <circle key={x} cx={x} cy={45} r={3} />
                ))}
            </g>
            <path d="M82 40 Q90 40 92 46 H82Z" fill="#8fd0f6" {...line("#5a8ac0", 1)} />
        </g>
    ),
    scooter: () => (
        <g>
            <Shadow cy={92} rx={40} />
            <path d="M70 16 L78 80" {...line("#5a6274", 4)} />
            <path d="M62 16 H80" {...line("#3a3a4a", 5)} />
            <path d="M16 78 H74" {...line("#e5484d", 7)} />
            <Wheel x={20} y={82} r={9} />
            <Wheel x={78} y={82} r={9} />
        </g>
    ),
    tractor: () => (
        <g>
            <Shadow cy={94} rx={42} />
            <path d="M10 60 Q10 52 18 52 H52 V74 H10Z" fill="#4fae4a" {...line("#2f7a2a")} />
            <path d="M48 24 H82 V74 H48Z" fill="#4fae4a" {...line("#2f7a2a")} />
            <rect x={54} y={30} width={22} height={20} rx={2} fill="#bfe6fb" {...line("#2f7a2a", 1.3)} />
            <rect x={44} y={20} width={42} height={7} rx={3} fill="#2f7a2a" />
            <rect x={22} y={36} width={6} height={16} fill="#5a5a6a" />
            <Wheel x={66} y={74} r={18} />
            <Wheel x={22} y={80} r={11} />
            <circle cx={66} cy={74} r={8} fill="#f6c43a" />
            <circle cx={22} cy={80} r={5} fill="#f6c43a" />
        </g>
    ),
    helicopter: () => (
        <g>
            <path d="M12 16 H88" {...line("#5a5a6a", 4)} />
            <path d="M50 16 V28" {...line("#5a5a6a", 4)} />
            <path d="M58 52 H90 L94 40" fill="none" {...line("#f6922e", 6)} />
            <path d="M88 32 L98 48" {...line("#5a5a6a", 3)} />
            <path d="M26 54 Q26 28 52 28 Q72 28 72 52 Q72 70 50 70 H36 Q26 70 26 54Z" fill="#f6922e" {...line("#c9631a")} />
            <path d="M30 50 Q32 34 48 34 V50Z" fill="#bfe6fb" {...line("#c9631a", 1.3)} />
            <path d="M34 70 V82 M60 70 V82 M24 84 H72" fill="none" {...line("#5a5a6a", 3)} />
        </g>
    ),
    rocket: () => (
        <g transform="rotate(30 50 50)">
            <path d="M50 4 Q70 22 68 60 H32 Q30 22 50 4Z" fill="#f2f6fc" {...line("#8a9ab8")} />
            <path d="M50 4 Q60 12 64 24 H36 Q40 12 50 4Z" fill="#e5484d" {...line("#a8282a")} />
            <circle cx={50} cy={38} r={8} fill="#8fd0f6" {...line("#5a8ac0", 1.6)} />
            <path d="M32 46 L18 66 L32 64Z M68 46 L82 66 L68 64Z" fill="#e5484d" {...line("#a8282a")} />
            <path d="M40 62 Q42 80 50 94 Q58 80 60 62Z" fill="#f6922e" />
            <path d="M44 62 Q46 74 50 84 Q54 74 56 62Z" fill="#fde68a" />
        </g>
    ),
    jeep: () => (
        <g>
            <Shadow cy={92} rx={44} />
            <path d="M6 72 V54 Q6 48 12 48 H32 L40 28 H70 Q74 28 74 32 V48 H90 Q96 48 96 54 V72Z" fill="#30a46c" {...line("#1f7a4a")} />
            <path d="M43 34 H56 V48 H37Z M60 34 H68 V48 H60Z" fill="#bfe6fb" {...line("#1f7a4a", 1.2)} />
            <rect x={90} y={52} width={6} height={8} rx={2} fill="#fde68a" />
            <rect x={2} y={56} width={6} height={12} rx={2} fill="#3a3a4a" />
            <Wheel x={26} y={74} r={13} />
            <Wheel x={76} y={74} r={13} />
        </g>
    ),
} satisfies Record<string, () => ReactNode>;
