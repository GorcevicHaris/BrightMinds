/* eslint-disable react/display-name -- crteži su čiste funkcije koje vraćaju SVG, nisu komponente */
// Na leđima: samo na celom liku. Glavni crtež je IZA tela (krila, ranac, plašt, oklop), a
// `front` je mali deo koji se vidi spreda (kaiševi, kopča) i crta se preko odeće.
// Ramena su na y ≈ 204–222, trup x 58–182, ruke vise do (42, 304) i (198, 304).

import type { ReactNode } from "react";
import { gloss, itemsFor, mirror, r1, sparkle, starPath } from "./art";

/** Kaiševi ranca preko ramena */
function straps(color: string, buckle = "#FFC83D"): () => ReactNode {
    return () => (
        <>
            <path d="M84 206Q92 240 86 290M156 206Q148 240 154 290" stroke={color} strokeWidth="9" strokeLinecap="round" fill="none" />
            <rect x="81" y="252" width="12" height="9" rx="2.5" fill={buckle} />
            <rect x="147" y="252" width="12" height="9" rx="2.5" fill={buckle} />
        </>
    );
}

const BAG = "M48 208Q48 190 66 190H174Q192 190 192 208V308Q192 322 178 322H62Q48 322 48 308Z";

function backpack(color: string, shade: string, extra?: ReactNode): () => ReactNode {
    return () => (
        <>
            <path d={BAG} fill={color} />
            <path d="M48 208Q48 190 66 190H174Q192 190 192 208V222H48Z" fill={shade} />
            <rect x="40" y="250" width="14" height="44" rx="6" fill={shade} />
            <rect x="186" y="250" width="14" height="44" rx="6" fill={shade} />
            {extra}
        </>
    );
}

/** Ranac meda: glava mede viri iznad levog ramena */
function bearPack(): ReactNode {
    return (
        <>
            {backpack("#BC8656", "#8A5A30")()}
            <g transform="translate(58 182)">
                <circle cx="-14" cy="-16" r="8" fill="#A8703F" />
                <circle cx="14" cy="-16" r="8" fill="#A8703F" />
                <circle r="20" fill="#BC8656" />
                <ellipse cy="6" rx="9" ry="7" fill="#F1CBA4" />
                <circle cy="3" r="3" fill="#4A2E1E" />
                <circle cx="-7" cy="-5" r="2.6" fill="#2A1D18" />
                <circle cx="7" cy="-5" r="2.6" fill="#2A1D18" />
                <path d="M-3 10Q0 13 3 10" stroke="#4A2E1E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </g>
        </>
    );
}

const CAPE = "M76 204Q26 250 10 398Q120 416 230 398Q214 250 164 204Z";

function cape(color: string, shade: string, trim?: string, stars?: string): () => ReactNode {
    return () => (
        <>
            <path d={CAPE} fill={color} />
            <path d="M120 214V404" stroke={shade} strokeWidth="3" opacity="0.4" />
            <path d="M40 300Q28 350 26 396M200 300Q212 350 214 396" stroke={shade} strokeWidth="4" opacity="0.5" fill="none" strokeLinecap="round" />
            {trim && <path d="M10 398Q120 416 230 398" stroke={trim} strokeWidth="10" strokeLinecap="round" fill="none" />}
            {trim && [32, 76, 120, 164, 208].map((x) => <circle key={x} cx={x} cy={r1(401 + Math.sin(((x - 10) / 220) * Math.PI) * 6)} r="2" fill="#2A2733" />)}
            {stars &&
                [
                    [24, 340],
                    [34, 270],
                    [214, 330],
                    [206, 262],
                    [22, 384],
                    [218, 380],
                ].map(([x, y]) => <path key={`${x}-${y}`} d={starPath(x, y, 6, 2.6)} fill={stars} />)}
        </>
    );
}

function clasp(color: string): () => ReactNode {
    return () => (
        <>
            <path d="M96 208Q120 220 144 208" stroke={color} strokeWidth="3" fill="none" />
            <circle cx="94" cy="208" r="6" fill={color} />
            <circle cx="146" cy="208" r="6" fill={color} />
        </>
    );
}

function butterflyWings(): ReactNode {
    const upper = "M112 236Q60 150 10 174Q-22 196 8 242Q40 266 112 252Z";
    const lower = "M112 254Q50 262 30 304Q24 338 58 332Q96 318 114 264Z";
    return (
        <>
            <path d={`${upper}${mirror(upper)}`} fill="#FF8A3D" stroke="#3A3546" strokeWidth="3" strokeLinejoin="round" />
            <path d={`${lower}${mirror(lower)}`} fill="#B9A2F2" stroke="#3A3546" strokeWidth="3" strokeLinejoin="round" />
            {[
                [30, 196, 9, "#FFD15C"],
                [56, 222, 7, "#fff"],
                [52, 308, 7, "#fff"],
            ].map(([x, y, r, fill]) => (
                <g key={`${x}-${y}`}>
                    <circle cx={x} cy={y} r={r} fill={fill as string} />
                    <circle cx={240 - (x as number)} cy={y} r={r} fill={fill as string} />
                </g>
            ))}
        </>
    );
}

function angelWings(): ReactNode {
    const wing = "M114 232Q64 170 4 186Q-30 200 -12 226Q-34 244 -6 260Q-26 282 10 294Q48 300 114 258Z";
    const lines = "M100 236Q50 206 0 218M100 244Q46 236 -2 252M100 252Q50 262 8 280";
    return (
        <>
            <path d={`${wing}${mirror(wing)}`} fill="#fff" stroke="#AEB9C9" strokeWidth="3" strokeLinejoin="round" />
            <path d={`${lines}${mirror(lines)}`} stroke="#C7D0DD" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
    );
}

function fairyWings(): ReactNode {
    return (
        <>
            {[
                [56, 186, -40, 50, 20, "#FFB8CB"],
                [64, 286, 30, 36, 16, "#7ED6F2"],
            ].map(([x, y, deg, ry, rx, fill]) => (
                <g key={`${x}-${y}`}>
                    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={fill as string} fillOpacity="0.7" stroke="#fff" strokeWidth="3" transform={`rotate(${deg} ${x} ${y})`} />
                    <ellipse cx={240 - (x as number)} cy={y} rx={rx} ry={ry} fill={fill as string} fillOpacity="0.7" stroke="#fff" strokeWidth="3" transform={`rotate(${-(deg as number)} ${240 - (x as number)} ${y})`} />
                </g>
            ))}
            {sparkle(20, 160, 6)}
            {sparkle(222, 168, 5)}
            {sparkle(30, 300, 4)}
            {sparkle(212, 306, 4)}
        </>
    );
}

function birdWings(): ReactNode {
    const wing = "M114 236Q70 196 18 204Q-6 210 6 226Q-10 236 6 246Q-6 258 12 264Q-2 276 22 280Q70 282 114 256Z";
    return (
        <>
            <path d={`${wing}${mirror(wing)}`} fill="#3D9BE9" />
            <path d={`M114 236Q80 214 40 216${mirror("M114 236Q80 214 40 216")}`} stroke="#7ED6F2" strokeWidth="10" strokeLinecap="round" fill="none" />
            <path d={`M30 230L60 236M24 248L58 248M30 266L62 260${mirror("M30 230L60 236M24 248L58 248M30 266L62 260")}`} stroke="#2C6BC0" strokeWidth="3" strokeLinecap="round" />
        </>
    );
}

function rainbowWings(): ReactNode {
    const colors = ["#F45B8D", "#FF8A3D", "#FFD15C", "#3BB273", "#3D9BE9", "#8E77E6"];
    return (
        <>
            {colors.map((color, i) => {
                const r = 110 - i * 12;
                const arc = `M114 250Q${114 - r} ${250 - r * 0.9} ${114 - r * 0.95} ${250 + r * 0.25}`;
                return <path key={color} d={`${arc}${mirror(arc)}`} stroke={color} strokeWidth="13" strokeLinecap="round" fill="none" />;
            })}
        </>
    );
}

function dragonWings(): ReactNode {
    const wing = "M114 236Q80 170 20 164Q30 186 10 200Q30 214 0 232Q24 246 4 266Q36 270 30 292Q70 276 114 258Z";
    const ribs = "M110 240L22 168M110 244L14 202M110 250L6 234M110 254L10 266";
    return (
        <>
            <path d={`${wing}${mirror(wing)}`} fill="#6CC46F" stroke="#3E9950" strokeWidth="3" strokeLinejoin="round" />
            <path d={`${ribs}${mirror(ribs)}`} stroke="#3E9950" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            <path d={`M20 164L14 152L28 160${mirror("M20 164L14 152L28 160")}`} fill="#FFD15C" />
        </>
    );
}

function beeWings(): ReactNode {
    return (
        <>
            {[
                [30, 186, -50, 42, 22],
                [34, 252, 40, 30, 16],
            ].map(([x, y, deg, ry, rx]) => (
                <g key={`${x}-${y}`}>
                    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#E8F6FF" fillOpacity="0.8" stroke="#AEB9C9" strokeWidth="2.5" transform={`rotate(${deg} ${x} ${y})`} />
                    <ellipse cx={240 - x} cy={y} rx={rx} ry={ry} fill="#E8F6FF" fillOpacity="0.8" stroke="#AEB9C9" strokeWidth="2.5" transform={`rotate(${-deg} ${240 - x} ${y})`} />
                </g>
            ))}
        </>
    );
}

function ladybugWings(): ReactNode {
    const shell = "M116 212Q60 200 30 240Q10 290 50 318Q90 330 116 300Z";
    return (
        <>
            <path d={`${shell}${mirror(shell)}`} fill="#E5484D" stroke="#3A3546" strokeWidth="3" />
            {[
                [44, 252, 9],
                [64, 296, 8],
                [40, 290, 6],
                [76, 226, 6],
            ].map(([x, y, r]) => (
                <g key={`${x}-${y}`}>
                    <circle cx={x} cy={y} r={r} fill="#3A3546" />
                    <circle cx={240 - x} cy={y} r={r} fill="#3A3546" />
                </g>
            ))}
        </>
    );
}

function turtleShell(): ReactNode {
    return (
        <>
            <ellipse cx="120" cy="268" rx="86" ry="94" fill="#3E9950" />
            <ellipse cx="120" cy="268" rx="78" ry="86" fill="#6CC46F" />
            {[
                [44, 230],
                [40, 290],
                [196, 230],
                [200, 290],
                [72, 190],
                [168, 190],
                [80, 344],
                [160, 344],
            ].map(([x, y]) => (
                <path key={`${x}-${y}`} d={`M${x - 12} ${y}L${x - 6} ${y - 11}H${x + 6}L${x + 12} ${y}L${x + 6} ${y + 11}H${x - 6}Z`} fill="#4FAE5E" stroke="#3E9950" strokeWidth="2" />
            ))}
        </>
    );
}

function divingTank(): ReactNode {
    return (
        <>
            <rect x="52" y="176" width="40" height="150" rx="20" fill="#FFD15C" />
            <rect x="148" y="176" width="40" height="150" rx="20" fill="#FFD15C" />
            <path d="M56 300H88M152 300H184" stroke="#E9A10E" strokeWidth="6" />
            <rect x="64" y="160" width="16" height="18" rx="4" fill="#AEB9C9" />
            <rect x="160" y="160" width="16" height="18" rx="4" fill="#AEB9C9" />
            <path d="M80 166Q120 140 160 166" stroke="#5B6475" strokeWidth="5" fill="none" />
            {gloss("M60 192V300M156 192V300", 5, 0.4)}
        </>
    );
}

function rocketPack(): ReactNode {
    const rocket = (x: number) => (
        <g key={x}>
            <path d={`M${x - 8} 312Q${x} 352 ${x + 8} 312Z`} fill="#FF8A3D" />
            <path d={`M${x - 5} 312Q${x} 338 ${x + 5} 312Z`} fill="#FFD15C" />
            <rect x={x - 16} y="196" width="32" height="118" rx="10" fill="#E3E8F0" />
            <path d={`M${x - 16} 206Q${x - 16} 164 ${x} 148Q${x + 16} 164 ${x + 16} 206Z`} fill="#E5484D" />
            <path d={`M${x - 16} 280L${x - 26} 312H${x - 16}ZM${x + 16} 280L${x + 26} 312H${x + 16}Z`} fill="#E5484D" />
            <circle cx={x} cy="232" r="8" fill="#7ED6F2" stroke="#AEB9C9" strokeWidth="3" />
            <circle cx={x - 3} cy="229" r="2.4" fill="#fff" />
        </g>
    );
    return (
        <>
            <rect x="60" y="210" width="120" height="90" rx="14" fill="#AEB9C9" />
            {rocket(34)}
            {rocket(206)}
            {sparkle(10, 344, 5, "#FFD15C")}
            {sparkle(230, 350, 5, "#FFD15C")}
        </>
    );
}

const back = itemsFor("back");

export const BACKS = [
    back("ranac", "Ranac", 8, backpack("#3D86E0", "#2C6BC0"), { front: straps("#2C6BC0") }),
    back("crveni-ranac", "Crveni ranac sa zvezdom", 9, backpack("#E5484D", "#B8323A", <path d={starPath(47, 272, 6.5, 2.8)} fill="#FFD15C" />), { front: straps("#B8323A") }),
    back("ranac-meda", "Ranac meda", 10, bearPack, { front: straps("#8A5A30") }),
    back("plast", "Plašt sa zvezdama", 12, cape("#6C55C9", "#5641A8", undefined, "#FFD15C"), { front: clasp("#FFD15C"), motion: "cape" }),
    back("krila-pcelice", "Krila pčelice", 14, beeWings, { motion: "wings" }),
    back("krila-bubamare", "Krila bubamare", 15, ladybugWings, { motion: "wings" }),
    back("boca-ronioca", "Boce za ronjenje", 16, divingTank, { front: straps("#3A3546", "#AEB9C9") }),
    back("oklop-kornjace", "Oklop kornjače", 18, turtleShell, { front: straps("#3E9950") }),
    back("kraljevski-plast", "Kraljevski plašt", 20, cape("#C53035", "#8E2328", "#fff"), { front: clasp("#FFC83D"), motion: "cape" }),
    back("krila-leptira", "Krila leptira", 20, butterflyWings, { motion: "wings" }),
    back("krila-vile", "Krila vile", 22, fairyWings, { motion: "wings" }),
    back("krila-ptice", "Krila ptice", 24, birdWings, { motion: "wings" }),
    back("krila-andjela", "Krila anđela", 25, angelWings, { motion: "wings" }),
    back("krila-duge", "Krila od duge", 28, rainbowWings, { motion: "wings" }),
    back("krila-zmaja", "Krila zmaja", 30, dragonWings, { motion: "wings" }),
    back("raketa-ranac", "Raketa-ranac", 70, rocketPack, { front: straps("#5B6475", "#E5484D") }),
];
