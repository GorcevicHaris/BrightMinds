/* eslint-disable react/display-name -- crteži su čiste funkcije koje vraćaju SVG, nisu komponente */
// Oko vrata: mašne, šalovi, ogrlice (y ≈ 186–262, sredina x = 120). Vrat životinje je
// širok x 97–143, a učitelja 103–137, pa ogrlice idu preko oba.

import type { ReactNode } from "react";
import { flower, gloss, heartPath, itemsFor, r1, starPath } from "./art";

// ── Postojeći predmeti (crtež se ne menja) ───────────────────────────────────

function bowTie(): ReactNode {
    return (
        <>
            <path d="M120 210L97 198Q92 210 97 222Z" fill="#E5484D" />
            <path d="M120 210L143 198Q148 210 143 222Z" fill="#E5484D" />
            <path d="M98 204Q96 210 98 216M142 204Q144 210 142 216" stroke="#fff" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="104" cy="210" r="2" fill="#fff" opacity="0.75" />
            <circle cx="136" cy="210" r="2" fill="#fff" opacity="0.75" />
            <rect x="113" y="203" width="14" height="14" rx="4.5" fill="#C53035" />
        </>
    );
}

function scarf(): ReactNode {
    return (
        <>
            <path d="M92 188Q120 202 148 188L150 207Q120 222 90 207Z" fill="#3BB2A0" />
            <path d="M96 193Q120 205 144 193" stroke="#FFD15C" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M101 205L94 252L113 255L115 212Z" fill="#35A190" />
            <path d="M98 222L114 225M96 238L113 241" stroke="#FFD15C" strokeWidth="5" />
            <path d="M96 254V262M101 254.5V263M106 255V263.5M111 255.5V263" stroke="#35A190" strokeWidth="2.6" strokeLinecap="round" />
            <ellipse cx="108" cy="207" rx="9" ry="7.5" fill="#3BB2A0" />
            <path d="M84 200Q104 210 112 207" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
    );
}

function starMedal(): ReactNode {
    return (
        <>
            <path d="M102 188L114 230H122L110 186Z" fill="#3D7BE0" />
            <path d="M138 188L126 230H118L130 186Z" fill="#2C5DB0" />
            <circle cx="120" cy="241" r="16" fill="#F2AE1C" />
            <path d={starPath(120, 241, 13, 5.6)} fill="#FFE08A" />
            <circle cx="114" cy="234" r="2.4" fill="#fff" opacity="0.8" />
        </>
    );
}

// ── Novi predmeti ─────────────────────────────────────────────────────────────

/** Ogrlica (traka oko vrata) na kojoj nešto visi */
const COLLAR = "M95 192Q120 206 145 192L146 202Q120 216 94 202Z";

function polkaBowTie(): ReactNode {
    return (
        <>
            <path d="M120 210L95 196Q89 210 95 224Z" fill="#FFC83D" />
            <path d="M120 210L145 196Q151 210 145 224Z" fill="#FFC83D" />
            {[
                [101, 204],
                [104, 216],
                [139, 204],
                [136, 216],
                [96, 211],
                [144, 211],
            ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#E5484D" />
            ))}
            <rect x="113" y="203" width="14" height="14" rx="4.5" fill="#E9A10E" />
        </>
    );
}

function tie(knot: string, color: string, stripe: string): () => ReactNode {
    return () => (
        <>
            <path d="M111 204H129L125 218H115Z" fill={knot} />
            <path d="M115 218H125L132 256L120 268L108 256Z" fill={color} />
            <path d="M112 232L130 226M110 246L132 238M112 258L128 252" stroke={stripe} strokeWidth="3.5" strokeLinecap="round" />
            {gloss("M118 222L114 252", 2.5, 0.35)}
        </>
    );
}

/** Šal na pruge u bojama duge */
function rainbowScarf(): ReactNode {
    const colors = ["#F45B8D", "#FF8A3D", "#FFD15C", "#3BB273", "#3D9BE9", "#8E77E6"];
    return (
        <>
            <path d="M92 188Q120 202 148 188L150 207Q120 222 90 207Z" fill="#F45B8D" />
            <path d="M93 195Q120 209 147 195" stroke="#FFD15C" strokeWidth="4" fill="none" />
            <path d="M92 202Q120 216 149 202" stroke="#3D9BE9" strokeWidth="4" fill="none" />
            <path d="M131 205L138 252L119 255L117 212Z" fill="#fff" />
            {colors.map((color, i) => {
                // Pruge prate ivice repa šala: levo x 117 → 119, desno x 131 → 138
                const y = 217 + i * 6.4;
                return <path key={color} d={`M${r1(117.6 + ((y - 212) * 2) / 43)} ${r1(y + 1)}L${r1(130.6 + ((y - 205) * 7) / 47)} ${r1(y - 1)}`} stroke={color} strokeWidth="5.4" />;
            })}
            <path d="M121 255V263M126 254.5V263M131 254V263.5M136 253.5V263" stroke="#8E77E6" strokeWidth="2.6" strokeLinecap="round" />
            <ellipse cx="132" cy="207" rx="9" ry="7.5" fill="#FF8A3D" />
        </>
    );
}

function goldMedal(): ReactNode {
    return (
        <>
            <path d="M100 190L114 232H124L110 188Z" fill="#E5484D" />
            <path d="M140 190L126 232H116L130 188Z" fill="#fff" />
            <path d="M140 190L126 232H121L135 189Z" fill="#E5484D" opacity="0.35" />
            <circle cx="120" cy="244" r="18" fill="#E9A10E" />
            <circle cx="120" cy="244" r="14" fill="#FFC83D" />
            <path d={heartPath(120, 245, 8)} fill="#E5484D" />
            <circle cx="113" cy="236" r="2.6" fill="#fff" opacity="0.8" />
        </>
    );
}

/** Ogrlica od cveća */
function lei(): ReactNode {
    const colors = ["#F78FB3", "#FFD15C", "#B9A2F2", "#FF8A3D"];
    const points: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        points.push([r1(92 + 56 * t), r1(194 + Math.sin(t * Math.PI) * 30)]);
    }
    return (
        <>
            <path d="M92 194Q120 254 148 194" stroke="#4FAE5E" strokeWidth="4" fill="none" />
            {points.map(([x, y], i) => flower(x, y, colors[i % colors.length], 0.9))}
        </>
    );
}

/** Marama (trougao sa tufnama) */
function bandana(): ReactNode {
    return (
        <>
            <path d="M92 196Q120 210 148 196L120 246Z" fill="#E5484D" />
            {[
                [106, 210],
                [120, 214],
                [134, 210],
                [113, 224],
                [127, 224],
                [120, 236],
            ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="#fff" />
            ))}
            <path d="M92 196Q120 210 148 196" stroke="#C53035" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M146 196L158 190M146 198L156 206" stroke="#C53035" strokeWidth="5" strokeLinecap="round" />
        </>
    );
}

function bellCollar(): ReactNode {
    return (
        <>
            <path d={COLLAR} fill="#E5484D" />
            {gloss("M100 197Q112 203 120 204", 2.5, 0.4)}
            <path d="M108 222Q108 208 120 207Q132 208 132 222L134 226H106Z" fill="#FFC83D" stroke="#E9A10E" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="120" cy="228" r="3.5" fill="#E9A10E" />
            <path d="M108 222H132" stroke="#E9A10E" strokeWidth="2" />
            <circle cx="114" cy="214" r="2.2" fill="#fff" opacity="0.8" />
        </>
    );
}

function beads(): ReactNode {
    const colors = ["#F45B8D", "#FFD15C", "#3D9BE9", "#3BB273", "#8E77E6"];
    const points: [number, number][] = [];
    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        points.push([r1(94 + 52 * t), r1(196 + Math.sin(t * Math.PI) * 24)]);
    }
    return (
        <>
            {points.map(([x, y], i) => (
                <g key={i}>
                    <circle cx={x} cy={y} r="5.2" fill={colors[i % colors.length]} />
                    <circle cx={x - 1.6} cy={y - 1.6} r="1.5" fill="#fff" opacity="0.7" />
                </g>
            ))}
        </>
    );
}

function heartLocket(): ReactNode {
    return (
        <>
            <path d="M96 194Q120 236 144 194" stroke="#F2AE1C" strokeWidth="2.5" fill="none" />
            <path d={heartPath(120, 228, 12)} fill="#F45B8D" stroke="#F2AE1C" strokeWidth="2.5" strokeLinejoin="round" />
            <ellipse cx="114" cy="222" rx="3" ry="2.2" fill="#fff" opacity="0.7" />
        </>
    );
}

/** Šal od krzna (beo, mekan, sa kuglicama) */
function fluffyScarf(): ReactNode {
    return (
        <>
            {[96, 106, 116, 126, 136, 146].map((x, i) => (
                <circle key={x} cx={x} cy={r1(196 + Math.sin(((i + 0.5) / 6) * Math.PI) * 10)} r="9" fill="#fff" />
            ))}
            {[96, 106, 116, 126, 136, 146].map((x, i) => (
                <circle key={`s${x}`} cx={x + 2} cy={r1(199 + Math.sin(((i + 0.5) / 6) * Math.PI) * 10)} r="5" fill="#E8E1F2" opacity="0.6" />
            ))}
            <circle cx="104" cy="222" r="7" fill="#F78FB3" />
            <circle cx="114" cy="226" r="7" fill="#F78FB3" />
            <path d="M104 214V218M114 214V219" stroke="#E8E1F2" strokeWidth="2" />
        </>
    );
}


/** Ogrlica od školjki */
function shells(): ReactNode {
    const points: [number, number][] = [];
    for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        points.push([r1(94 + 52 * t), r1(196 + Math.sin(t * Math.PI) * 24)]);
    }
    return (
        <>
            <path d="M94 196Q120 244 146 196" stroke="#C98A55" strokeWidth="2" fill="none" />
            {points.map(([x, y], i) => (
                <g key={i} transform={`translate(${x} ${y})`}>
                    <path d="M-6 3Q-7 -6 0 -7Q7 -6 6 3Z" fill={i % 2 ? "#FFD3E0" : "#FFF1D6"} stroke="#E2B256" strokeWidth="1.2" />
                    <path d="M0 -6V3M-3 -5L-2 3M3 -5L2 3" stroke="#E2B256" strokeWidth="0.9" />
                </g>
            ))}
        </>
    );
}

/** Pištaljka na vrpci (sport) */
function whistle(): ReactNode {
    return (
        <>
            <path d="M98 194Q108 232 120 236Q132 232 142 194" stroke="#3D9BE9" strokeWidth="3.5" fill="none" />
            <path d="M112 236H130Q138 236 138 244Q138 252 130 252H118Q110 252 110 244Z" fill="#C7D0DD" stroke="#8C98AB" strokeWidth="2" />
            <rect x="104" y="238" width="10" height="7" rx="2" fill="#AEB9C9" />
            <circle cx="128" cy="244" r="3" fill="#8C98AB" />
        </>
    );
}

const neck = itemsFor("neck");

export const NECK = [
    neck("leptir-masna", "Leptir-mašna", 3, bowTie),
    neck("kravata", "Kravata", 4, tie("#2C5DB0", "#3D7BE0", "#FFD15C")),
    neck("crvena-kravata", "Crvena kravata", 4, tie("#B8323A", "#E5484D", "#fff")),
    neck("ogrlica-skoljke", "Ogrlica od školjki", 6, shells),
    neck("pistaljka", "Pištaljka", 6, whistle),
    neck("marama", "Marama", 4, bandana),
    neck("sal", "Šal", 5, scarf),
    neck("leptir-masna-tufne", "Leptir-mašna sa tufnama", 5, polkaBowTie),
    neck("ogrlica-perle", "Ogrlica od perli", 5, beads),
    neck("zvonce", "Ogrlica sa zvoncetom", 6, bellCollar),
    neck("ogrlica-zvezda", "Ogrlica sa zvezdom", 7, starMedal),
    neck("ogrlica-srce", "Ogrlica sa srcem", 7, heartLocket),
    neck("prugasti-sal", "Šal duga", 8, rainbowScarf),
    neck("ogrlica-cvece", "Ogrlica od cveća", 9, lei),
    neck("krzneni-sal", "Mekani šal", 9, fluffyScarf),
    neck("medalja", "Zlatna medalja", 10, goldMedal),
];
