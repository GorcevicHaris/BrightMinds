// Pozadine: samo na celom liku, iza svega. Pokrivaju ceo okvir (geometry.ts FULL_BOX:
// x −60 … 300, y −24 … 426); tlo počinje oko y 330, a drugar stoji na y 410.
// Boje su meke i mirne, sa malo detalja, da pozadina ne odvlači pažnju od drugara.

import type { ReactNode } from "react";
import { FULL_BOX } from "../geometry";
import { flower, heartPath, itemsFor, r1, sparkle, starPath } from "./art";

const X0 = FULL_BOX.x;
const Y0 = FULL_BOX.y;
const W = FULL_BOX.w;
const H = FULL_BOX.h;

const sky = (color: string) => <rect x={X0} y={Y0} width={W} height={H} fill={color} />;
const ground = (y: number, color: string, curve = 0) => <path d={`M${X0} ${y + curve}Q120 ${y - curve} ${X0 + W} ${y + curve}V${Y0 + H}H${X0}Z`} fill={color} />;

function cloud(x: number, y: number, s = 1, fill = "#fff"): ReactNode {
    return (
        <g key={`c${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
            <ellipse cx="0" cy="6" rx="30" ry="10" />
            <circle cx="-12" cy="0" r="12" />
            <circle cx="6" cy="-4" r="15" />
            <circle cx="20" cy="2" r="10" />
        </g>
    );
}

function roundTree(x: number, y: number, s = 1, leaf = "#6CC46F", dark = "#4FAE5E"): ReactNode {
    return (
        <g key={`t${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
            <rect x="-6" y="-30" width="12" height="34" rx="4" fill="#9A6236" />
            <circle cy="-50" r="28" fill={leaf} />
            <circle cx="-14" cy="-40" r="16" fill={dark} opacity="0.5" />
            <circle cx="-8" cy="-60" r="8" fill="#fff" opacity="0.2" />
        </g>
    );
}

function pine(x: number, y: number, s = 1, snow = false): ReactNode {
    return (
        <g key={`p${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`}>
            <rect x="-5" y="-14" width="10" height="16" fill="#8A5A30" />
            <path d="M0 -90L26 -46H-26ZM0 -66L32 -14H-32Z" fill="#3E9950" />
            {snow && <path d="M0 -90L12 -70Q4 -66 0 -72Q-4 -66 -12 -70ZM-20 -24Q0 -16 20 -24L26 -16Q0 -8 -26 -16Z" fill="#fff" />}
        </g>
    );
}

function sunDisc(x: number, y: number, r = 24): ReactNode {
    return (
        <g>
            <circle cx={x} cy={y} r={r + 10} fill="#FFE08A" opacity="0.45" />
            <circle cx={x} cy={y} r={r} fill="#FFD15C" />
        </g>
    );
}

function room(): ReactNode {
    return (
        <>
            {sky("#FFF1D6")}
            <rect x={X0} y="320" width={W} height="110" fill="#E2B98A" />
            <path d={`M${X0} 352H300M${X0} 386H300M20 320V352M140 352V386M240 320V352M60 386V426`} stroke="#C99A66" strokeWidth="2.5" />
            <rect x={X0} y="312" width={W} height="10" fill="#F2D7A6" />
            <rect x="196" y="40" width="88" height="104" rx="6" fill="#BFE9FF" stroke="#fff" strokeWidth="8" />
            <path d="M240 40V144M196 92H284" stroke="#fff" strokeWidth="5" />
            {cloud(222, 70, 0.6)}
            <rect x="-44" y="70" width="60" height="52" rx="4" fill="#fff" stroke="#E2B256" strokeWidth="5" />
            <path d={heartPath(-14, 96, 13)} fill="#F78FB3" />
            <ellipse cx="120" cy="410" rx="120" ry="18" fill="#B9A2F2" opacity="0.7" />
            <rect x="244" y="270" width="40" height="44" rx="6" fill="#F78FB3" />
            <path d="M264 270Q250 240 236 236M264 270Q266 236 278 228M264 270Q282 250 294 250" stroke="#4FAE5E" strokeWidth="5" strokeLinecap="round" fill="none" />
        </>
    );
}

function park(): ReactNode {
    return (
        <>
            {sky("#CFEFFF")}
            {sunDisc(250, 30)}
            {cloud(10, 40, 0.9)}
            {cloud(170, 80, 0.7)}
            {ground(300, "#9BD88F", 16)}
            {ground(340, "#7CC47A", 6)}
            <path d="M80 426Q110 360 150 330H170Q150 370 160 426Z" fill="#F2E3B6" />
            {roundTree(-30, 320, 1.1)}
            {roundTree(262, 316, 1)}
            {flower(30, 380, "#F78FB3", 0.9)}
            {flower(220, 392, "#FFD15C", 0.9)}
            {flower(250, 370, "#fff", 0.8)}
        </>
    );
}

function beach(): ReactNode {
    return (
        <>
            {sky("#BFE9FF")}
            {sunDisc(-10, 40, 26)}
            {cloud(200, 50, 0.8)}
            <rect x={X0} y="250" width={W} height="90" fill="#5CC6E8" />
            <path d={`M${X0} 270Q-40 262 -20 270T20 270T60 270T100 270T140 270T180 270T220 270T260 270T300 270`} stroke="#fff" strokeOpacity="0.6" strokeWidth="3" fill="none" />
            <path d={`M${X0} 300Q-30 292 0 300T60 300T120 300T180 300T240 300T300 300`} stroke="#fff" strokeOpacity="0.45" strokeWidth="3" fill="none" />
            {ground(334, "#F6DFA4", 6)}
            <path d="M250 260V420" stroke="#fff" strokeWidth="4" />
            <path d="M200 270Q250 220 300 270Z" fill="#F45B8D" />
            <path d="M225 270Q250 222 275 270Z" fill="#fff" />
            <path d="M-36 404Q-30 390 -20 404Z" fill="#F78FB3" />
            <path d={starPath(230, 400, 10, 4.5)} fill="#FF8A3D" />
        </>
    );
}

function space(): ReactNode {
    const stars: [number, number, number][] = [
        [-40, 10, 4],
        [20, 60, 3],
        [70, -6, 3.5],
        [180, 30, 3],
        [290, 120, 4],
        [-30, 180, 3],
        [260, 220, 3.5],
        [10, 260, 3],
        [210, 150, 2.5],
        [-50, 300, 3],
    ];
    return (
        <>
            {sky("#232457")}
            {stars.map(([x, y, s]) => sparkle(x, y, s * 1.6, "#FFF6CC"))}
            <circle cx="250" cy="56" r="30" fill="#F7A8C8" />
            <ellipse cx="250" cy="56" rx="52" ry="12" fill="none" stroke="#FFD15C" strokeWidth="5" transform="rotate(-16 250 56)" />
            <circle cx="240" cy="46" r="8" fill="#fff" opacity="0.25" />
            <circle cx="-20" cy="100" r="16" fill="#7ED6F2" />
            <circle cx="-26" cy="94" r="4" fill="#fff" opacity="0.4" />
            {ground(336, "#B7BCD0", 14)}
            <ellipse cx="-20" cy="370" rx="18" ry="6" fill="#9AA0B8" />
            <ellipse cx="250" cy="390" rx="24" ry="7" fill="#9AA0B8" />
            <ellipse cx="200" cy="356" rx="10" ry="4" fill="#9AA0B8" />
        </>
    );
}

function underwater(): ReactNode {
    return (
        <>
            {sky("#7ED6F2")}
            <rect x={X0} y="120" width={W} height="310" fill="#5CC6E8" />
            <rect x={X0} y="240" width={W} height="190" fill="#45B4DA" />
            {ground(360, "#F6DFA4", 8)}
            <path d="M-30 370Q-46 330 -30 300Q-16 270 -34 240M260 380Q246 340 262 310Q276 280 260 250" stroke="#3BB273" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M230 384Q226 350 240 330M230 360Q216 344 214 330M230 360Q246 350 252 340" stroke="#F78FB3" strokeWidth="7" strokeLinecap="round" fill="none" />
            {[
                [20, 80, 7],
                [30, 50, 5],
                [210, 120, 8],
                [220, 90, 5],
                [-20, 200, 6],
            ].map(([x, y, r]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" />
            ))}
            <g transform="translate(250 180)">
                <ellipse rx="16" ry="10" fill="#FFD15C" />
                <path d="M14 0L26 -8V8Z" fill="#FFD15C" />
                <circle cx="-7" cy="-2" r="2.4" fill="#2A1D18" />
            </g>
            <g transform="translate(-10 140) scale(-1 1)">
                <ellipse rx="12" ry="8" fill="#FF8A3D" />
                <path d="M10 0L20 -6V6Z" fill="#FF8A3D" />
                <circle cx="-5" cy="-1" r="2" fill="#2A1D18" />
            </g>
        </>
    );
}

function castle(): ReactNode {
    const tower = (x: number, top: number) => (
        <g key={x}>
            <rect x={x - 18} y={top} width="36" height={300 - top} fill="#E8D5F5" />
            <path d={`M${x - 24} ${top}L${x} ${top - 44}L${x + 24} ${top}Z`} fill="#B9A2F2" />
            <path d={`M${x} ${top - 44}V${top - 64}`} stroke="#8C98AB" strokeWidth="2.5" />
            <path d={`M${x} ${top - 64}L${x + 18} ${top - 58}L${x} ${top - 52}Z`} fill="#F45B8D" />
            <rect x={x - 6} y={top + 20} width="12" height="18" rx="6" fill="#7A6AB0" />
        </g>
    );
    return (
        <>
            {sky("#E3E8FF")}
            {cloud(-20, 30, 0.8)}
            {cloud(250, 20, 0.7)}
            <rect x="-10" y="150" width="260" height="150" fill="#F2E4FA" />
            <path d="M-10 150h20v-14h20v14h20v-14h20v14h20v-14h20v14h20v-14h20v14h20v-14h20v14h20v-14h20v14h20v-14h20v14" fill="#F2E4FA" />
            {tower(-20, 110)}
            {tower(260, 110)}
            {tower(120, 70)}
            <path d="M96 300V250Q120 226 144 250V300Z" fill="#9A6236" />
            {ground(310, "#9BD88F", 14)}
            <path d="M90 310Q120 360 100 426H150Q140 360 150 310Z" fill="#F2E3B6" />
            {flower(20, 380, "#F78FB3", 0.9)}
            {flower(240, 390, "#FFD15C", 0.9)}
        </>
    );
}

function forest(): ReactNode {
    return (
        <>
            {sky("#DFF5E1")}
            {roundTree(-40, 300, 1.2, "#8FD18F", "#6CC46F")}
            {roundTree(40, 290, 0.9, "#8FD18F", "#6CC46F")}
            {roundTree(200, 296, 1.1, "#8FD18F", "#6CC46F")}
            {roundTree(280, 300, 1, "#8FD18F", "#6CC46F")}
            {ground(320, "#7CC47A", 8)}
            {roundTree(-20, 360, 1.15)}
            {roundTree(260, 370, 1.1)}
            {[
                [30, 400],
                [220, 404],
            ].map(([x, y]) => (
                <g key={x}>
                    <rect x={x - 4} y={y - 12} width="8" height="12" rx="3" fill="#fff" />
                    <path d={`M${x - 14} ${y - 10}Q${x} ${y - 30} ${x + 14} ${y - 10}Z`} fill="#E5484D" />
                    <circle cx={x - 4} cy={y - 18} r="2.2" fill="#fff" />
                    <circle cx={x + 5} cy={y - 15} r="2" fill="#fff" />
                </g>
            ))}
        </>
    );
}

function snow(): ReactNode {
    return (
        <>
            {sky("#DDEBFF")}
            {cloud(30, 30, 0.8, "#F2F6FF")}
            {cloud(230, 60, 0.6, "#F2F6FF")}
            {ground(320, "#F7FAFF", 12)}
            {pine(-30, 330, 1.2, true)}
            {pine(40, 318, 0.8, true)}
            {pine(270, 336, 1.1, true)}
            <g transform="translate(236 404)">
                <circle cy="-20" r="22" fill="#fff" stroke="#DDE4EE" strokeWidth="2" />
                <circle cy="-56" r="15" fill="#fff" stroke="#DDE4EE" strokeWidth="2" />
                <circle cx="-5" cy="-59" r="2" fill="#2A1D18" />
                <circle cx="5" cy="-59" r="2" fill="#2A1D18" />
                <path d="M0 -54L12 -52L0 -50Z" fill="#FF8A3D" />
                <path d="M-14 -44Q0 -36 14 -44" stroke="#E5484D" strokeWidth="5" strokeLinecap="round" fill="none" />
            </g>
            {[
                [-40, 120],
                [10, 200],
                [80, -10],
                [190, 160],
                [280, 200],
                [250, 280],
                [-10, 280],
            ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="#fff" />
            ))}
        </>
    );
}

function fair(): ReactNode {
    const flags = ["#F45B8D", "#FFD15C", "#3D9BE9", "#3BB273", "#8E77E6"];
    return (
        <>
            {sky("#FFE8D6")}
            <g transform="translate(240 170)">
                <circle r="70" fill="none" stroke="#B9A2F2" strokeWidth="5" />
                {[0, 45, 90, 135].map((deg) => (
                    <path key={deg} d="M-70 0H70" stroke="#B9A2F2" strokeWidth="3" transform={`rotate(${deg})`} />
                ))}
                {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                    const a = (deg * Math.PI) / 180;
                    return <rect key={deg} x={r1(Math.cos(a) * 70 - 9)} y={r1(Math.sin(a) * 70 - 4)} width="18" height="14" rx="4" fill={flags[i % flags.length]} />;
                })}
                <path d="M-20 140L0 0L20 140" stroke="#8E77E6" strokeWidth="5" fill="none" />
            </g>
            <path d="M-50 290L-10 230L30 290Z" fill="#F45B8D" />
            <path d="M-30 290L-10 230L10 290Z" fill="#fff" />
            <path d={`M${X0} 20Q60 70 180 20T300 30`} stroke="#8C98AB" strokeWidth="2" fill="none" />
            {[-40, -10, 20, 50, 80, 110, 140, 170, 200, 230, 260].map((x, i) => {
                const y = r1(20 + Math.sin(((x + 60) / 240) * Math.PI) * 22);
                return <path key={x} d={`M${x - 9} ${y}L${x + 9} ${y}L${x} ${y + 18}Z`} fill={flags[i % flags.length]} />;
            })}
            {ground(320, "#F2D7A6", 6)}
            {[
                [-30, 360],
                [260, 372],
            ].map(([x, y]) => (
                <g key={x}>
                    <path d={`M${x} ${y}V${y + 50}`} stroke="#8C98AB" strokeWidth="2" />
                    <ellipse cx={x} cy={y - 18} rx="14" ry="18" fill="#3D9BE9" />
                </g>
            ))}
        </>
    );
}

function rainbowSky(): ReactNode {
    const colors = ["#F45B8D", "#FF8A3D", "#FFD15C", "#3BB273", "#3D9BE9", "#8E77E6"];
    return (
        <>
            {sky("#E6F4FF")}
            {colors.map((color, i) => (
                <path key={color} d={`M${-50 + i * 14} 320A${170 - i * 14} ${170 - i * 14} 0 0 1 ${290 - i * 14} 320`} stroke={color} strokeWidth="14" fill="none" />
            ))}
            {cloud(-40, 316, 1.3)}
            {cloud(280, 316, 1.3)}
            {ground(334, "#9BD88F", 8)}
            {flower(10, 390, "#F78FB3", 0.9)}
            {flower(230, 400, "#B9A2F2", 0.9)}
        </>
    );
}

function farm(): ReactNode {
    return (
        <>
            {sky("#D6F0FF")}
            {sunDisc(260, 30, 22)}
            {cloud(80, 40, 0.7)}
            {ground(300, "#9BD88F", 12)}
            <g transform="translate(-20 300)">
                <path d="M-40 0V-80L0 -120L40 -80V0Z" fill="#E5484D" />
                <path d="M-48 -78L0 -126L48 -78" stroke="#fff" strokeWidth="6" fill="none" strokeLinejoin="round" />
                <rect x="-16" y="-44" width="32" height="44" fill="#B8323A" />
                <path d="M-16 -44L16 0M16 -44L-16 0" stroke="#fff" strokeWidth="4" />
            </g>
            <path d="M150 330H300M150 350H300M160 316V364M200 316V364M240 316V364M280 316V364" stroke="#E2B256" strokeWidth="6" strokeLinecap="round" />
            {ground(360, "#7CC47A", 4)}
            <g transform="translate(250 404)">
                <rect x="-26" y="-34" width="52" height="34" rx="10" fill="#F6D58A" />
                <path d="M-20 -24H20M-20 -12H20" stroke="#E2B256" strokeWidth="3" />
            </g>
        </>
    );
}

function meadow(): ReactNode {
    const colors = ["#F78FB3", "#FFD15C", "#B9A2F2", "#fff", "#FF8A3D"];
    const spots: [number, number][] = [
        [-40, 350],
        [-10, 380],
        [20, 352],
        [60, 396],
        [180, 400],
        [210, 356],
        [250, 384],
        [280, 350],
        [-30, 410],
        [270, 414],
        [40, 340],
        [200, 336],
    ];
    return (
        <>
            {sky("#E3F6FF")}
            {cloud(0, 60, 0.9)}
            {cloud(220, 40, 0.8)}
            {ground(310, "#A8DE8F", 14)}
            {spots.map(([x, y], i) => flower(x, y, colors[i % colors.length], 0.9))}
            <g transform="translate(240 230)">
                <path d="M0 0Q-14 -14 -16 0Q-14 12 0 0ZM0 0Q14 -14 16 0Q14 12 0 0Z" fill="#F78FB3" />
                <path d="M0 -6V6" stroke="#3A3546" strokeWidth="2.5" strokeLinecap="round" />
            </g>
        </>
    );
}

function town(): ReactNode {
    const houses: [number, number, number, string][] = [
        [-60, 170, 70, "#F7A8C8"],
        [10, 210, 60, "#FFE08A"],
        [170, 190, 64, "#A8D8F0"],
        [234, 150, 70, "#C8EBB0"],
    ];
    return (
        <>
            {sky("#DDF1FF")}
            {cloud(110, 30, 0.8)}
            {houses.map(([x, top, w, color]) => (
                <g key={x}>
                    <rect x={x} y={top} width={w} height={330 - top} fill={color} />
                    {Array.from({ length: Math.floor((310 - top) / 40) }, (_, row) => (
                        <g key={row}>
                            <rect x={x + 12} y={top + 16 + row * 40} width="16" height="20" rx="3" fill="#fff" opacity="0.85" />
                            <rect x={x + w - 28} y={top + 16 + row * 40} width="16" height="20" rx="3" fill="#fff" opacity="0.85" />
                        </g>
                    ))}
                </g>
            ))}
            <rect x={X0} y="330" width={W} height="20" fill="#DDE4EE" />
            <rect x={X0} y="350" width={W} height="80" fill="#C7D0DD" />
            <path d={`M${X0} 390H300`} stroke="#fff" strokeWidth="5" strokeDasharray="24 18" />
            {roundTree(150, 334, 0.8)}
        </>
    );
}

const background = itemsFor("background");

export const BACKGROUNDS = [
    background("soba", "Soba", 25, room),
    background("park", "Park", 30, park),
    background("livada", "Livada sa cvećem", 30, meadow),
    background("grad", "Grad", 35, town),
    background("suma", "Šuma", 35, forest),
    background("plaza", "Plaža", 40, beach),
    background("zimski-dan", "Zimski dan", 40, snow),
    background("duga", "Duga", 45, rainbowSky),
    background("farma", "Farma", 45, farm),
    background("podvodni-svet", "Podvodni svet", 50, underwater),
    background("vasar", "Vašar", 55, fair),
    background("svemir", "Svemir", 75, space),
    background("zamak", "Zamak", 80, castle),
];
