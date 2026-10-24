// Životinje za igru „Šta jede?”: krupne, okrenute licem ka detetu, mirnog i prijateljskog
// izraza (velike oči, blagi osmeh, bez zuba i kandži). Svaka se crta u okviru 100 × 100,
// stopala su oko y = 96. `mouth` je tačka do koje hrana dolazi kad životinja jede
// (kod slona je to vrh surle, kod žirafe usta visoko gore).

import type { ReactNode } from "react";
import type { AnimalId } from "@/app/components/games/data/foodItems";

const INK = "#4a3a32";
const BLUSH = "#f59a9a";

export interface AnimalDrawing {
    draw: (happy: boolean) => ReactNode;
    /** Gde su usta (hrana dolazi tu) */
    mouth: readonly [number, number];
    /** Pozadina slike: livada, šuma, voda, sneg */
    place: Place;
}

export type Place = "meadow" | "farm" | "forest" | "pond" | "ice" | "savanna" | "home" | "garden";

const line = (color: string, width = 1.6) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

/** Oko: krug sa odsjajem, a kad je srećna (jede) zatvoreno, kao osmeh ^ */
function Eye({ x, y, r = 3.2, happy, white = false }: { x: number; y: number; r?: number; happy: boolean; white?: boolean }) {
    if (happy) return <path d={`M${x - r} ${y + 0.6} Q${x} ${y - r * 1.2} ${x + r} ${y + 0.6}`} fill="none" {...line(white ? "#ffffff" : INK, 1.8)} />;
    return (
        <g>
            {white && <circle cx={x} cy={y} r={r + 1.4} fill="#ffffff" />}
            <circle cx={x} cy={y} r={r} fill={INK} />
            <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.36} fill="#ffffff" />
        </g>
    );
}

function Eyes({ y, dx, happy, r, white }: { y: number; dx: number; happy: boolean; r?: number; white?: boolean }) {
    return (
        <>
            <Eye x={50 - dx} y={y} r={r} happy={happy} white={white} />
            <Eye x={50 + dx} y={y} r={r} happy={happy} white={white} />
        </>
    );
}

function Cheeks({ y, dx, r = 3.4 }: { y: number; dx: number; r?: number }) {
    return (
        <>
            <circle cx={50 - dx} cy={y} r={r} fill={BLUSH} opacity={0.45} />
            <circle cx={50 + dx} cy={y} r={r} fill={BLUSH} opacity={0.45} />
        </>
    );
}

/** Blag osmeh; kad jede, usta su malo otvorena */
function Smile({ y, w = 4, happy, color = INK }: { y: number; w?: number; happy: boolean; color?: string }) {
    if (happy) return <ellipse cx={50} cy={y + 1} rx={w * 0.7} ry={w * 0.55} fill="#8f3a3a" stroke={color} strokeWidth={1.2} />;
    return <path d={`M${50 - w} ${y} Q50 ${y + w * 0.9} ${50 + w} ${y}`} fill="none" {...line(color, 1.5)} />;
}

function Feet({ color, edge, y = 95, dx = 10, rx = 7 }: { color: string; edge: string; y?: number; dx?: number; rx?: number }) {
    return (
        <>
            <ellipse cx={50 - dx} cy={y} rx={rx} ry={3.6} fill={color} {...line(edge, 1.2)} />
            <ellipse cx={50 + dx} cy={y} rx={rx} ry={3.6} fill={color} {...line(edge, 1.2)} />
        </>
    );
}

function Shadow({ rx = 26 }: { rx?: number }) {
    return <ellipse cx={50} cy={97} rx={rx} ry={3} fill="#000000" opacity={0.09} />;
}

export const ANIMAL_ART: Record<AnimalId, AnimalDrawing> = {
    rabbit: {
        mouth: [50, 62],
        place: "meadow",
        draw: (happy) => (
            <g>
                <Shadow rx={22} />
                <ellipse cx={50} cy={80} rx={19} ry={16} fill="#f6f2f8" {...line("#c9c2d6")} />
                <ellipse cx={50} cy={84} rx={11} ry={10} fill="#ffffff" />
                <Feet color="#f6f2f8" edge="#c9c2d6" dx={9} rx={6.5} />
                <ellipse cx={42} cy={24} rx={6} ry={17} fill="#f6f2f8" transform="rotate(-8 42 24)" {...line("#c9c2d6")} />
                <ellipse cx={58} cy={24} rx={6} ry={17} fill="#f6f2f8" transform="rotate(8 58 24)" {...line("#c9c2d6")} />
                <ellipse cx={42} cy={25} rx={2.6} ry={12} fill="#f7c3d4" transform="rotate(-8 42 25)" />
                <ellipse cx={58} cy={25} rx={2.6} ry={12} fill="#f7c3d4" transform="rotate(8 58 25)" />
                <circle cx={50} cy={52} r={18} fill="#f6f2f8" {...line("#c9c2d6")} />
                <Eyes y={49} dx={7.5} happy={happy} />
                <Cheeks y={57} dx={11} />
                <ellipse cx={50} cy={56} rx={2.4} ry={1.7} fill="#e88aa8" />
                <path d="M50 57.5 V59.5 M46 60 Q48 62.5 50 59.5 Q52 62.5 54 60" fill="none" {...line(INK, 1.3)} />
                {happy && <ellipse cx={50} cy={63} rx={2.6} ry={1.8} fill="#8f3a3a" />}
            </g>
        ),
    },
    cat: {
        mouth: [50, 63],
        place: "home",
        draw: (happy) => (
            <g>
                <Shadow />
                <path d="M66 86 Q86 84 82 64 Q80 56 74 60" fill="none" {...line("#e59c55", 6)} />
                <ellipse cx={50} cy={80} rx={19} ry={16} fill="#f4b06a" {...line("#c98a55")} />
                <ellipse cx={50} cy={84} rx={10} ry={10} fill="#fbe3c4" />
                <Feet color="#f4b06a" edge="#c98a55" dx={9} rx={6.5} />
                <path d="M33 44 L35 25 L48 36Z M67 44 L65 25 L52 36Z" fill="#f4b06a" {...line("#c98a55")} />
                <path d="M36.5 39 L37 30 L43.5 35.5Z M63.5 39 L63 30 L56.5 35.5Z" fill="#f7c3c3" />
                <ellipse cx={50} cy={52} rx={20} ry={18} fill="#f4b06a" {...line("#c98a55")} />
                <path d="M44 36 Q46 40 45 43 M50 35 V41 M56 36 Q54 40 55 43" fill="none" {...line("#d98a45", 1.6)} />
                <ellipse cx={50} cy={60} rx={9} ry={6} fill="#fbe3c4" />
                <Eyes y={50} dx={8} happy={happy} />
                <Cheeks y={58} dx={13} />
                <path d="M48 56 H52 L50 58.2Z" fill="#e88aa8" />
                <path d="M50 58.2 V59.5 M47 60.5 Q48.5 62 50 59.5 Q51.5 62 53 60.5" fill="none" {...line(INK, 1.2)} />
                <path d="M37 57 L28 55 M37 60 L28 61 M63 57 L72 55 M63 60 L72 61" {...line("#c98a55", 1)} />
                {happy && <ellipse cx={50} cy={63} rx={2.4} ry={1.7} fill="#8f3a3a" />}
            </g>
        ),
    },
    dog: {
        mouth: [50, 66],
        place: "home",
        draw: (happy) => (
            <g>
                <Shadow />
                <path d="M66 82 Q80 76 78 64" fill="none" {...line("#d9ae62", 5)} />
                <ellipse cx={50} cy={80} rx={19} ry={16} fill="#e8c27a" {...line("#b9894a")} />
                <ellipse cx={50} cy={84} rx={10} ry={10} fill="#f6e2b8" />
                <Feet color="#e8c27a" edge="#b9894a" dx={9} rx={6.5} />
                <circle cx={50} cy={50} r={19} fill="#e8c27a" {...line("#b9894a")} />
                <ellipse cx={31} cy={50} rx={7} ry={14} fill="#a8783e" transform="rotate(18 31 50)" {...line("#8a5f2e", 1.2)} />
                <ellipse cx={69} cy={50} rx={7} ry={14} fill="#a8783e" transform="rotate(-18 69 50)" {...line("#8a5f2e", 1.2)} />
                <ellipse cx={58} cy={45} rx={6} ry={5.5} fill="#c99652" />
                <ellipse cx={50} cy={60} rx={10.5} ry={7.5} fill="#f6e2b8" />
                <Eyes y={46} dx={8} happy={happy} />
                <Cheeks y={56} dx={13} />
                <ellipse cx={50} cy={56} rx={3.8} ry={2.7} fill={INK} />
                <path d="M50 58.5 V61 M46 62 Q48 64 50 61 Q52 64 54 62" fill="none" {...line(INK, 1.3)} />
                {happy && <path d="M47.5 63 Q50 69 52.5 63Z" fill="#f27c92" />}
            </g>
        ),
    },
    cow: {
        mouth: [50, 67],
        place: "farm",
        draw: (happy) => (
            <g>
                <Shadow />
                <ellipse cx={50} cy={82} rx={21} ry={14} fill="#fbfbfb" {...line("#a29ea8")} />
                <path d="M34 76 Q38 70 44 74 Q42 82 35 82Z M60 84 Q64 76 70 80 Q68 88 62 88Z" fill="#3f3a44" />
                <Feet color="#6b6470" edge="#4a444f" dx={11} rx={6} />
                <path d="M35 32 Q31 24 36 22 Q37 28 40 31Z M65 32 Q69 24 64 22 Q63 28 60 31Z" fill="#f2e3c4" {...line("#c9b48a", 1.2)} />
                <ellipse cx={29} cy={42} rx={8} ry={4.5} fill="#fbfbfb" transform="rotate(-20 29 42)" {...line("#a29ea8")} />
                <ellipse cx={71} cy={42} rx={8} ry={4.5} fill="#fbfbfb" transform="rotate(20 71 42)" {...line("#a29ea8")} />
                <ellipse cx={50} cy={48} rx={18} ry={18} fill="#fbfbfb" {...line("#a29ea8")} />
                <path d="M54 31 Q63 32 64 41 Q57 42 54 36Z" fill="#3f3a44" />
                <ellipse cx={50} cy={61} rx={13} ry={8.5} fill="#f7c1c8" {...line("#d99aa4", 1.2)} />
                <ellipse cx={45} cy={60} rx={1.8} ry={2.4} fill="#c47a86" />
                <ellipse cx={55} cy={60} rx={1.8} ry={2.4} fill="#c47a86" />
                <Eyes y={45} dx={7.5} happy={happy} />
                <Smile y={65} w={4} happy={happy} />
            </g>
        ),
    },
    monkey: {
        mouth: [50, 61],
        place: "forest",
        draw: (happy) => (
            <g>
                <Shadow />
                <path d="M68 86 Q86 86 84 70 Q82 62 76 66" fill="none" {...line("#8a5632", 4.5)} />
                <ellipse cx={50} cy={80} rx={18} ry={15} fill="#a0683e" {...line("#6e4426")} />
                <ellipse cx={50} cy={82} rx={11} ry={10} fill="#f2c9a0" />
                <Feet color="#a0683e" edge="#6e4426" dx={9} rx={6} />
                <circle cx={30} cy={47} r={7.5} fill="#a0683e" {...line("#6e4426")} />
                <circle cx={70} cy={47} r={7.5} fill="#a0683e" {...line("#6e4426")} />
                <circle cx={30} cy={47} r={4} fill="#f2c9a0" />
                <circle cx={70} cy={47} r={4} fill="#f2c9a0" />
                <circle cx={50} cy={47} r={18} fill="#a0683e" {...line("#6e4426")} />
                <path d="M50 44 Q44 36 38 40 Q33 46 38 52 Q36 60 44 64 Q50 66 56 64 Q64 60 62 52 Q67 46 62 40 Q56 36 50 44Z" fill="#f2c9a0" />
                <Eyes y={46} dx={6.5} happy={happy} />
                <path d="M48 54 Q50 55 52 54" fill="none" {...line("#8a5632", 1.2)} />
                <Smile y={58} w={5} happy={happy} />
            </g>
        ),
    },
    bird: {
        mouth: [50, 58],
        place: "garden",
        draw: (happy) => (
            <g>
                <Shadow rx={18} />
                <path d="M44 88 V95 M40 95 H48 M56 88 V95 M52 95 H60" fill="none" {...line("#f08a2e", 2)} />
                <path d="M46 30 Q48 22 52 26 Q54 20 57 27" fill="none" {...line("#3d86d0", 2.6)} />
                <ellipse cx={28} cy={64} rx={7} ry={14} fill="#3d86d0" transform="rotate(25 28 64)" />
                <ellipse cx={72} cy={64} rx={7} ry={14} fill="#3d86d0" transform="rotate(-25 72 64)" />
                <ellipse cx={50} cy={60} rx={22} ry={27} fill="#4d9be8" {...line("#3d7fc0")} />
                <ellipse cx={50} cy={70} rx={14} ry={15} fill="#d5e9fb" />
                <Eyes y={50} dx={8} happy={happy} />
                <Cheeks y={58} dx={13} r={3} />
                <path d="M45 55 L55 55 L50 62Z" fill="#f6a23e" {...line("#d9822e", 1.2)} />
                {happy && <path d="M46.5 59 L53.5 59 L50 64Z" fill="#f6a23e" {...line("#d9822e", 1)} />}
            </g>
        ),
    },
    bee: {
        mouth: [50, 64],
        place: "garden",
        draw: (happy) => (
            <g>
                <Shadow rx={16} />
                <ellipse cx={30} cy={40} rx={13} ry={9} fill="#e3f3fc" opacity={0.95} transform="rotate(-25 30 40)" {...line("#a9cfe6", 1.2)} />
                <ellipse cx={70} cy={40} rx={13} ry={9} fill="#e3f3fc" opacity={0.95} transform="rotate(25 70 40)" {...line("#a9cfe6", 1.2)} />
                <path d="M44 34 Q40 22 34 20 M56 34 Q60 22 66 20" fill="none" {...line(INK, 1.6)} />
                <circle cx={34} cy={20} r={2.4} fill={INK} />
                <circle cx={66} cy={20} r={2.4} fill={INK} />
                <path d="M50 88 L46 94 L54 94Z" fill={INK} />
                <ellipse cx={50} cy={62} rx={22} ry={25} fill="#f6cf4a" {...line("#c99a1e")} />
                <path d="M29.5 70 Q50 76 70.5 70 L68 77 Q50 83 32 77Z M31 81 Q50 87 69 81 Q60 88 50 88 Q40 88 31 81Z" fill="#4a3a32" />
                <Eyes y={54} dx={8} happy={happy} />
                <Cheeks y={61} dx={13} r={3} />
                <Smile y={63} w={4.5} happy={happy} />
            </g>
        ),
    },
    horse: {
        mouth: [50, 70],
        place: "farm",
        draw: (happy) => (
            <g>
                <Shadow />
                <ellipse cx={50} cy={86} rx={20} ry={11} fill="#b9804e" {...line("#8a5a32")} />
                <Feet color="#5a4032" edge="#3f2c22" dx={11} rx={5.5} />
                <path d="M37 28 L35 14 L45 23Z M63 28 L65 14 L55 23Z" fill="#b9804e" {...line("#8a5a32")} />
                <path d="M38.5 24 L38 18 L42 22Z M61.5 24 L62 18 L58 22Z" fill="#e8b48a" />
                <path d="M36 52 Q34 30 50 26 Q66 30 64 52 Q66 62 62 70 Q56 76 50 76 Q44 76 38 70 Q34 62 36 52Z" fill="#b9804e" {...line("#8a5a32")} />
                <path d="M42 24 Q50 18 58 24 Q56 34 50 38 Q46 32 42 24Z" fill="#6b4426" />
                <path d="M64 30 Q72 40 68 56" fill="none" {...line("#6b4426", 5)} />
                <ellipse cx={50} cy={66} rx={12} ry={9} fill="#e2b48a" {...line("#b98a5e", 1.2)} />
                <ellipse cx={45.5} cy={64} rx={1.8} ry={2.4} fill="#8a5a32" />
                <ellipse cx={54.5} cy={64} rx={1.8} ry={2.4} fill="#8a5a32" />
                <Eyes y={46} dx={8} happy={happy} />
                <Smile y={70} w={3.6} happy={happy} />
            </g>
        ),
    },
    panda: {
        mouth: [50, 61],
        place: "forest",
        draw: (happy) => (
            <g>
                <Shadow />
                <ellipse cx={50} cy={80} rx={20} ry={16} fill="#fbfbfb" {...line("#b8b8c0")} />
                <path d="M30 74 Q28 86 36 88 Q40 80 38 72Z M70 74 Q72 86 64 88 Q60 80 62 72Z" fill="#2f2f38" />
                <Feet color="#2f2f38" edge="#1f1f26" dx={10} rx={7} />
                <circle cx={34} cy={32} r={7.5} fill="#2f2f38" />
                <circle cx={66} cy={32} r={7.5} fill="#2f2f38" />
                <circle cx={50} cy={49} r={19} fill="#fbfbfb" {...line("#b8b8c0")} />
                <ellipse cx={42} cy={48} rx={5.5} ry={7} fill="#2f2f38" transform="rotate(30 42 48)" />
                <ellipse cx={58} cy={48} rx={5.5} ry={7} fill="#2f2f38" transform="rotate(-30 58 48)" />
                <Eyes y={47} dx={7.5} r={2.4} happy={happy} white />
                <ellipse cx={50} cy={56} rx={3} ry={2.2} fill="#2f2f38" />
                <Cheeks y={58} dx={12} r={3} />
                <Smile y={60} w={3.8} happy={happy} />
            </g>
        ),
    },
    squirrel: {
        mouth: [50, 62],
        place: "forest",
        draw: (happy) => (
            <g>
                <path d="M62 90 Q92 88 88 58 Q86 34 70 30 Q60 30 64 42 Q76 48 74 64 Q72 78 60 82Z" fill="#d9894a" {...line("#a85f2a")} />
                <path d="M70 40 Q80 46 80 60" fill="none" {...line("#f0b47a", 2)} />
                <Shadow rx={20} />
                <ellipse cx={46} cy={80} rx={16} ry={15} fill="#c8743a" {...line("#a85f2a")} />
                <ellipse cx={46} cy={83} rx={9} ry={10} fill="#f2d2a8" />
                <Feet color="#c8743a" edge="#a85f2a" dx={9} rx={6} />
                <path d="M36 42 L35 30 L43 37Z M60 42 L61 30 L53 37Z" fill="#c8743a" {...line("#a85f2a")} />
                <path d="M35 30 L33 25 M61 30 L63 25" {...line("#a85f2a", 2)} />
                <circle cx={48} cy={52} r={15} fill="#c8743a" {...line("#a85f2a")} />
                <ellipse cx={48} cy={59} rx={8} ry={6} fill="#f2d2a8" />
                <Eye x={42} y={50} happy={happy} />
                <Eye x={54} y={50} happy={happy} />
                <ellipse cx={48} cy={56} rx={2} ry={1.5} fill={INK} />
                <path d={happy ? "M45 59.5 Q48 63 51 59.5Z" : "M45 59.5 Q48 62 51 59.5"} fill={happy ? "#8f3a3a" : "none"} {...line(INK, 1.3)} />
            </g>
        ),
    },
    chicken: {
        mouth: [50, 58],
        place: "farm",
        draw: (happy) => (
            <g>
                <Shadow rx={20} />
                <path d="M44 88 V95 M40 95 H48 M56 88 V95 M52 95 H60" fill="none" {...line("#f08a2e", 2)} />
                <path d="M72 58 Q84 50 82 66 Q80 76 72 74Z" fill="#fff7ea" {...line("#d9c9aa")} />
                <path d="M42 33 Q42 22 48 27 Q50 18 54 27 Q60 22 58 33Z" fill="#e8483f" {...line("#b9302a", 1.2)} />
                <ellipse cx={50} cy={62} rx={22} ry={26} fill="#fff7ea" {...line("#d9c9aa")} />
                <ellipse cx={30} cy={66} rx={6} ry={12} fill="#f4ead6" transform="rotate(15 30 66)" />
                <ellipse cx={70} cy={66} rx={6} ry={12} fill="#f4ead6" transform="rotate(-15 70 66)" />
                <Eyes y={48} dx={8} happy={happy} />
                <Cheeks y={56} dx={13} r={3} />
                <path d="M45 53 L55 53 L50 60Z" fill="#f6b23e" {...line("#d9822e", 1.2)} />
                <path d="M48 60 Q50 67 52 60Z" fill="#e8483f" />
                {happy && <path d="M46.5 57 L53.5 57 L50 61.5Z" fill="#f6b23e" {...line("#d9822e", 1)} />}
            </g>
        ),
    },
    frog: {
        mouth: [50, 68],
        place: "pond",
        draw: (happy) => (
            <g>
                <Shadow rx={28} />
                <path d="M22 92 Q26 80 36 84 Q34 92 22 92Z M78 92 Q74 80 64 84 Q66 92 78 92Z" fill="#6ab456" {...line("#3f7a3a", 1.2)} />
                <ellipse cx={50} cy={80} rx={19} ry={14} fill="#7fc46a" {...line("#4f8a44")} />
                <ellipse cx={50} cy={83} rx={12} ry={9} fill="#d6efc2" />
                <circle cx={36} cy={42} r={10} fill="#7fc46a" {...line("#4f8a44")} />
                <circle cx={64} cy={42} r={10} fill="#7fc46a" {...line("#4f8a44")} />
                <ellipse cx={50} cy={58} rx={26} ry={16} fill="#7fc46a" {...line("#4f8a44")} />
                <circle cx={36} cy={42} r={6.5} fill="#ffffff" />
                <circle cx={64} cy={42} r={6.5} fill="#ffffff" />
                <Eye x={36} y={42} r={3.6} happy={happy} />
                <Eye x={64} y={42} r={3.6} happy={happy} />
                <Cheeks y={62} dx={17} r={3.6} />
                <circle cx={46} cy={54} r={0.9} fill="#3f7a3a" />
                <circle cx={54} cy={54} r={0.9} fill="#3f7a3a" />
                {happy ? <path d="M38 63 Q50 72 62 63 Q50 67 38 63Z" fill="#8f3a3a" {...line("#3f7a3a", 1.3)} /> : <path d="M36 62 Q50 71 64 62" fill="none" {...line("#3f7a3a", 1.6)} />}
            </g>
        ),
    },
    mouse: {
        mouth: [50, 64],
        place: "home",
        draw: (happy) => (
            <g>
                <Shadow rx={20} />
                <path d="M64 88 Q84 92 86 78 Q88 68 80 66" fill="none" {...line("#e8a8b8", 2.2)} />
                <ellipse cx={50} cy={81} rx={16} ry={14} fill="#bdb8c8" {...line("#8f8a9c")} />
                <ellipse cx={50} cy={84} rx={9} ry={8} fill="#e6e2ec" />
                <Feet color="#f2c9d4" edge="#d99aa8" dx={8} rx={5} />
                <circle cx={33} cy={38} r={11} fill="#bdb8c8" {...line("#8f8a9c")} />
                <circle cx={67} cy={38} r={11} fill="#bdb8c8" {...line("#8f8a9c")} />
                <circle cx={33} cy={38} r={6.5} fill="#f6c3d2" />
                <circle cx={67} cy={38} r={6.5} fill="#f6c3d2" />
                <path d="M34 52 Q34 38 50 38 Q66 38 66 52 Q66 62 56 65 Q50 67 44 65 Q34 62 34 52Z" fill="#bdb8c8" {...line("#8f8a9c")} />
                <Eyes y={51} dx={7} happy={happy} />
                <Cheeks y={58} dx={11} r={2.8} />
                <circle cx={50} cy={58} r={2.2} fill="#e88aa8" />
                <path d="M41 59 L32 57 M41 61 L32 62 M59 59 L68 57 M59 61 L68 62" {...line("#8f8a9c", 0.9)} />
                <path d={happy ? "M47 61.5 Q50 65 53 61.5Z" : "M47 61.5 Q50 63.5 53 61.5"} fill={happy ? "#8f3a3a" : "none"} {...line(INK, 1.2)} />
            </g>
        ),
    },
    sheep: {
        mouth: [50, 63],
        place: "meadow",
        draw: (happy) => (
            <g>
                <Shadow />
                <Feet color="#5a5560" edge="#3f3a44" dx={11} rx={5.5} />
                <g fill="#fbf8f1" {...line("#d6cfc0", 1.3)}>
                    <circle cx={34} cy={72} r={11} />
                    <circle cx={66} cy={72} r={11} />
                    <circle cx={40} cy={84} r={10} />
                    <circle cx={60} cy={84} r={10} />
                    <circle cx={50} cy={74} r={14} />
                </g>
                <ellipse cx={31} cy={46} rx={8} ry={4} fill="#e9d2b8" transform="rotate(-20 31 46)" {...line("#c9a888", 1.2)} />
                <ellipse cx={69} cy={46} rx={8} ry={4} fill="#e9d2b8" transform="rotate(20 69 46)" {...line("#c9a888", 1.2)} />
                <ellipse cx={50} cy={52} rx={14} ry={16} fill="#f2dcc4" {...line("#c9a888")} />
                <g fill="#fbf8f1" {...line("#d6cfc0", 1.2)}>
                    <circle cx={42} cy={36} r={6} />
                    <circle cx={50} cy={33} r={6.5} />
                    <circle cx={58} cy={36} r={6} />
                </g>
                <Eyes y={49} dx={6} happy={happy} />
                <Cheeks y={57} dx={9.5} r={2.6} />
                <path d="M48 56 Q50 57.5 52 56" fill="none" {...line("#a8866a", 1.3)} />
                <Smile y={61} w={3.6} happy={happy} />
            </g>
        ),
    },
    bear: {
        mouth: [50, 61],
        place: "forest",
        draw: (happy) => (
            <g>
                <Shadow />
                <ellipse cx={50} cy={80} rx={20} ry={16} fill="#a8703f" {...line("#7a4f2a")} />
                <ellipse cx={50} cy={83} rx={12} ry={10} fill="#d9a877" />
                <Feet color="#a8703f" edge="#7a4f2a" dx={10} rx={7} />
                <circle cx={34} cy={33} r={7.5} fill="#a8703f" {...line("#7a4f2a")} />
                <circle cx={66} cy={33} r={7.5} fill="#a8703f" {...line("#7a4f2a")} />
                <circle cx={34} cy={33} r={4} fill="#d9a877" />
                <circle cx={66} cy={33} r={4} fill="#d9a877" />
                <circle cx={50} cy={49} r={19} fill="#a8703f" {...line("#7a4f2a")} />
                <ellipse cx={50} cy={58} rx={9.5} ry={7.5} fill="#e2b98a" />
                <Eyes y={46} dx={8} happy={happy} />
                <ellipse cx={50} cy={55} rx={3.4} ry={2.4} fill={INK} />
                <Cheeks y={56} dx={13} r={3} />
                <path d="M50 57.4 V59" fill="none" {...line(INK, 1.2)} />
                <Smile y={60} w={3.4} happy={happy} />
            </g>
        ),
    },
    goat: {
        mouth: [50, 64],
        place: "meadow",
        draw: (happy) => (
            <g>
                <Shadow />
                <ellipse cx={50} cy={84} rx={19} ry={12} fill="#ece6da" {...line("#b8ae9c")} />
                <Feet color="#6b6470" edge="#4a444f" dx={10} rx={5} />
                <path d="M42 32 Q36 16 26 20 Q32 22 36 34Z M58 32 Q64 16 74 20 Q68 22 64 34Z" fill="#c9b48a" {...line("#9a865e", 1.2)} />
                <ellipse cx={30} cy={46} rx={9} ry={4} fill="#ece6da" transform="rotate(-15 30 46)" {...line("#b8ae9c")} />
                <ellipse cx={70} cy={46} rx={9} ry={4} fill="#ece6da" transform="rotate(15 70 46)" {...line("#b8ae9c")} />
                <path d="M36 46 Q36 32 50 32 Q64 32 64 46 Q64 60 58 66 Q50 72 42 66 Q36 60 36 46Z" fill="#ece6da" {...line("#b8ae9c")} />
                <path d="M46 70 Q50 82 54 70Z" fill="#f8f6f0" {...line("#b8ae9c", 1.2)} />
                <ellipse cx={50} cy={60} rx={8} ry={5.5} fill="#f2cfc6" />
                <Eyes y={47} dx={7} happy={happy} />
                <circle cx={47.5} cy={58} r={1} fill="#b47a72" />
                <circle cx={52.5} cy={58} r={1} fill="#b47a72" />
                <Smile y={62.5} w={3.2} happy={happy} />
            </g>
        ),
    },
    hedgehog: {
        mouth: [50, 67],
        place: "garden",
        draw: (happy) => (
            <g>
                <Shadow rx={30} />
                <path
                    d="M18 86 L14 74 L22 72 L16 60 L25 60 L22 47 L31 50 L31 37 L39 43 L42 30 L48 39 L53 29 L57 39 L63 31 L65 44 L72 38 L72 51 L80 48 L77 60 L86 61 L80 72 L88 75 L82 86Z"
                    fill="#8a6244"
                    {...line("#5e4030", 1.4)}
                />
                <Feet color="#e9c9a0" edge="#b9946a" dx={14} rx={6} />
                <path d="M30 60 Q30 44 50 44 Q70 44 70 60 Q70 70 60 76 Q50 82 40 76 Q30 70 30 60Z" fill="#efd3ac" {...line("#b9946a")} />
                <Eyes y={58} dx={8} happy={happy} />
                <Cheeks y={66} dx={13} r={3} />
                <ellipse cx={50} cy={66} rx={3.6} ry={2.8} fill={INK} />
                <Smile y={70} w={3.2} happy={happy} />
            </g>
        ),
    },
    penguin: {
        mouth: [50, 50],
        place: "ice",
        draw: (happy) => (
            <g>
                <Shadow rx={22} />
                <ellipse cx={42} cy={94} rx={7} ry={3.2} fill="#f6a23e" />
                <ellipse cx={58} cy={94} rx={7} ry={3.2} fill="#f6a23e" />
                <ellipse cx={26} cy={66} rx={6} ry={16} fill="#2f3550" transform="rotate(20 26 66)" />
                <ellipse cx={74} cy={66} rx={6} ry={16} fill="#2f3550" transform="rotate(-20 74 66)" />
                <ellipse cx={50} cy={60} rx={23} ry={33} fill="#2f3550" />
                <path d="M50 40 Q36 34 34 48 Q32 60 34 72 Q38 90 50 91 Q62 90 66 72 Q68 60 66 48 Q64 34 50 40Z" fill="#fbfbfb" />
                <Eyes y={42} dx={7} happy={happy} />
                <Cheeks y={50} dx={11} r={3} />
                <path d="M45 46 L55 46 L50 52Z" fill="#f6a23e" {...line("#d9822e", 1.2)} />
                {happy && <path d="M46.5 50 L53.5 50 L50 54Z" fill="#f6a23e" {...line("#d9822e", 1)} />}
            </g>
        ),
    },
    giraffe: {
        mouth: [50, 36],
        place: "savanna",
        draw: (happy) => (
            <g>
                <Shadow rx={20} />
                <ellipse cx={50} cy={86} rx={17} ry={10} fill="#f4c062" {...line("#c9923a")} />
                <Feet color="#8a5a32" edge="#5e3d22" dx={10} rx={5} />
                <path d="M42 84 L44 40 L56 40 L58 84Z" fill="#f4c062" {...line("#c9923a")} />
                <path d="M45 52 h5 v5 h-5z M51 62 h5 v6 h-5z M45 72 h5 v5 h-5z M51 46 h4 v4 h-4z" fill="#b8743a" />
                <path d="M44 14 V6 M56 14 V6" {...line("#b8743a", 2.4)} />
                <circle cx={44} cy={6} r={2.6} fill="#8a5a32" />
                <circle cx={56} cy={6} r={2.6} fill="#8a5a32" />
                <ellipse cx={35} cy={18} rx={6} ry={3} fill="#f4c062" transform="rotate(-25 35 18)" {...line("#c9923a", 1.2)} />
                <ellipse cx={65} cy={18} rx={6} ry={3} fill="#f4c062" transform="rotate(25 65 18)" {...line("#c9923a", 1.2)} />
                <path d="M38 22 Q38 10 50 10 Q62 10 62 22 Q62 30 58 36 Q50 41 42 36 Q38 30 38 22Z" fill="#f4c062" {...line("#c9923a")} />
                <ellipse cx={50} cy={32} rx={8.5} ry={6} fill="#f8dc9e" />
                <circle cx={47} cy={30.5} r={1} fill="#8a5a32" />
                <circle cx={53} cy={30.5} r={1} fill="#8a5a32" />
                <Eyes y={21} dx={6} r={2.6} happy={happy} />
                <Smile y={34.5} w={3} happy={happy} />
            </g>
        ),
    },
    turtle: {
        mouth: [50, 70],
        place: "garden",
        draw: (happy) => (
            <g>
                <Shadow rx={32} />
                <ellipse cx={22} cy={88} rx={8} ry={5} fill="#a6d27a" {...line("#6f9a4a", 1.2)} />
                <ellipse cx={78} cy={88} rx={8} ry={5} fill="#a6d27a" {...line("#6f9a4a", 1.2)} />
                <path d="M14 82 Q14 40 50 38 Q86 40 86 82Z" fill="#6fae5a" {...line("#4a7a3a")} />
                <path d="M30 80 Q30 58 40 50 M70 80 Q70 58 60 50 M40 50 H60 M24 66 H76 M50 38 V50" fill="none" {...line("#4a7a3a", 1.6)} />
                <rect x={12} y={80} width={76} height={6} rx={3} fill="#9cc77a" {...line("#4a7a3a", 1.2)} />
                <circle cx={50} cy={70} r={13} fill="#a6d27a" {...line("#6f9a4a")} />
                <Eyes y={67} dx={5.5} r={2.6} happy={happy} />
                <Cheeks y={73} dx={8.5} r={2.4} />
                <Smile y={74} w={3} happy={happy} />
            </g>
        ),
    },
    elephant: {
        mouth: [57, 84],
        place: "savanna",
        draw: (happy) => (
            <g>
                <Shadow rx={28} />
                <ellipse cx={50} cy={84} rx={20} ry={12} fill="#a9b2c3" {...line("#7d8698")} />
                <Feet color="#a9b2c3" edge="#7d8698" dx={12} rx={6} />
                <path d="M34 34 Q14 26 12 46 Q12 62 34 60Z M66 34 Q86 26 88 46 Q88 62 66 60Z" fill="#a9b2c3" {...line("#7d8698")} />
                <path d="M30 38 Q18 36 18 47 Q19 55 30 55Z M70 38 Q82 36 82 47 Q81 55 70 55Z" fill="#f2c3cc" />
                <circle cx={50} cy={46} r={18} fill="#a9b2c3" {...line("#7d8698")} />
                <path d="M45 56 Q44 70 48 78 Q51 84 57 83 Q60 82 58 79 Q54 79 53 74 Q52 66 55 56Z" fill="#a9b2c3" {...line("#7d8698")} />
                <path d="M46 66 h4 M46.5 71 h4" {...line("#7d8698", 1)} />
                <Eyes y={44} dx={8} happy={happy} />
                <Cheeks y={52} dx={12} r={3} />
            </g>
        ),
    },
};

/** Životinja u svom okviru 100 × 100 (za karticu izbora ili veliku sliku) */
export function AnimalPicture({ id, happy = false, className }: { id: AnimalId; happy?: boolean; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {ANIMAL_ART[id].draw(happy)}
        </svg>
    );
}
