/* eslint-disable react/display-name -- crteži su čiste funkcije koje vraćaju SVG, nisu komponente */
// Odeća i kostimi: preko trupa, ispod vrata. Na poprsju trup je TORSO_PATH (ramena do dna
// slike), a na celom liku FULL_TORSO_PATH sa donjim delom (pantalone, šorc, suknja, haljina).
// Šare na grudima su oko (120, 250) i staju u oba oblika; tufne i pruge prate ivice trupa.
// Ruke crta lik, u boji `sleeve`.

import type { ReactNode } from "react";
import { FULL_TORSO_PATH, TORSO_PATH } from "../geometry";
import type { WearVariant } from "../wearables";
import {
    bands,
    columns,
    flower,
    heartPath,
    itemsFor,
    lowerPart,
    mirror,
    r1,
    scatter,
    sidePanels,
    sparkle,
    starPath,
    torsoBottom,
    torsoLight,
    type LowerKind,
} from "./art";

// ── Postojeći predmeti: poprsje se crta isto kao ranije ──────────────────────

function suitBust(): ReactNode {
    return (
        <>
            <path d={TORSO_PATH} fill="#33427A" />
            {torsoLight()}
            <path d="M90 206Q120 213 150 206L120 268Z" fill="#fff" />
            <path d="M90 206L120 268L106 262L97 238L84 242Z" fill="#26325E" />
            <path d="M150 206L120 268L134 262L143 238L156 242Z" fill="#26325E" />
            <path d="M113 213H127L124 226H116Z" fill="#C53035" />
            <path d="M116 226H124L130 255L120 266L110 255Z" fill="#E5484D" />
            <path d="M118 230L114 253" stroke="#fff" strokeOpacity="0.3" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="120" cy="276" r="3.2" fill="#1C2547" />
            <path d="M157 242H177L175 247H159Z" fill="#fff" />
            <path d="M160 242L163 236L166 242M167 242L171 235L174 242" fill="#FFD15C" />
        </>
    );
}

function suitFull(): ReactNode {
    return (
        <>
            {lowerPart("pants", "#2B3870", "#1C2547")}
            <path d={FULL_TORSO_PATH} fill="#33427A" />
            {torsoLight("full")}
            <path d="M90 206Q120 213 150 206L120 268Z" fill="#fff" />
            <path d="M90 206L120 268L106 262L97 238L84 242Z" fill="#26325E" />
            <path d="M150 206L120 268L134 262L143 238L156 242Z" fill="#26325E" />
            <path d="M113 213H127L124 226H116Z" fill="#C53035" />
            <path d="M116 226H124L130 255L120 266L110 255Z" fill="#E5484D" />
            <path d="M118 230L114 253" stroke="#fff" strokeOpacity="0.3" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="120" cy="280" r="3.2" fill="#1C2547" />
            <circle cx="120" cy="298" r="3.2" fill="#1C2547" />
            <path d="M144 242H164L162 247H146Z" fill="#fff" />
            <path d="M147 242L150 236L153 242M154 242L158 235L161 242" fill="#FFD15C" />
        </>
    );
}

function heartSweaterBust(): ReactNode {
    return (
        <>
            <path d={TORSO_PATH} fill="#5DB98D" />
            {torsoLight()}
            <path d="M58 228Q68 250 64 284M182 228Q172 250 176 284" stroke="#3E9970" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M92 206Q120 230 148 206" stroke="#3E9970" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d={heartPath(120, 250, 17)} fill="#F2557A" />
            <ellipse cx="111" cy="240" rx="4" ry="3" fill="#fff" opacity="0.45" />
            <path d="M82 262l4 5 4-5M150 262l4 5 4-5M70 246l4 5 4-5M162 246l4 5 4-5" stroke="#fff" strokeOpacity="0.45" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
    );
}

const CAPE = "M98 204Q58 208 36 236Q22 256 16 284L62 284Q66 246 92 216Z";
const CAPE_FULL = "M98 204Q60 210 42 250Q28 300 22 376Q44 384 64 376Q62 300 76 250Q84 226 100 214Z";

function superCape(variant?: WearVariant): ReactNode {
    const full = variant === "full";
    const cape = full ? CAPE_FULL : CAPE;
    return (
        <>
            <path d={cape} fill="#E5484D" />
            <path d={mirror(cape)} fill="#E5484D" />
            {full ? (
                <>
                    <path d="M76 250Q62 300 64 376H74Q72 300 84 254Z" fill="#B8323A" opacity="0.8" />
                    <path d="M164 250Q178 300 176 376H166Q168 300 156 254Z" fill="#B8323A" opacity="0.8" />
                </>
            ) : (
                <>
                    <path d="M92 216Q66 246 62 284H74Q76 248 98 220Z" fill="#B8323A" opacity="0.8" />
                    <path d="M148 216Q174 246 178 284H166Q164 248 142 220Z" fill="#B8323A" opacity="0.8" />
                </>
            )}
            <path d="M44 236Q60 216 90 210" stroke="#fff" strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M120 228L141 240L120 268L99 240Z" fill="#FFC83D" stroke="#E9A10E" strokeWidth="3" strokeLinejoin="round" />
            <path d="M124 234L112 250H120L116 262L130 245H122Z" fill="#E5484D" />
            <circle cx="96" cy="211" r="6.5" fill="#FFC83D" stroke="#E9A10E" strokeWidth="2" />
            <circle cx="144" cy="211" r="6.5" fill="#FFC83D" stroke="#E9A10E" strokeWidth="2" />
        </>
    );
}

function starTeeBust(): ReactNode {
    return (
        <>
            <path d={TORSO_PATH} fill="#8E77E6" />
            {torsoLight()}
            <path d="M52 228Q62 252 58 284M188 228Q178 252 182 284" stroke="#7258C9" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M94 206Q120 224 146 206" stroke="#7258C9" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d={starPath(120, 250, 24, 10.5)} fill="#FFD15C" stroke="#F2A516" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="113" cy="243" r="2.6" fill="#fff" opacity="0.7" />
        </>
    );
}

// ── Graditelj odeće ───────────────────────────────────────────────────────────

type Neck = "round" | "v" | "collar" | "hood" | "zip" | "none";
type Lower = [LowerKind, string, string] | (() => ReactNode);

interface Garment {
    /** Osnovna boja i tamnija (šavovi, okovratnik) */
    color: string;
    shade: string;
    neck?: Neck;
    /** Šara preko celog trupa (pre svetla) */
    pattern?: (variant?: WearVariant) => ReactNode;
    /** Crtež na grudima (posle svetla) */
    deco?: (variant?: WearVariant) => ReactNode;
    /** Donji deo celog lika */
    lower?: Lower;
    /** Boja okovratnika „collar” */
    collar?: string;
}

function neckline(kind: Neck, shade: string, collar = "#fff"): ReactNode {
    switch (kind) {
        case "round":
            return <path d="M94 206Q120 224 146 206" stroke={shade} strokeWidth="6" strokeLinecap="round" fill="none" />;
        case "v":
            return <path d="M96 205L120 234L144 205" stroke={shade} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
        case "collar":
            return (
                <>
                    <path d="M94 204L118 214L106 232Z" fill={collar} stroke={shade} strokeWidth="2" strokeLinejoin="round" />
                    <path d="M146 204L122 214L134 232Z" fill={collar} stroke={shade} strokeWidth="2" strokeLinejoin="round" />
                </>
            );
        case "hood":
            return (
                <>
                    <path d="M84 206Q120 240 156 206" stroke={shade} strokeWidth="13" strokeLinecap="round" fill="none" />
                    <path d="M110 226L108 252M130 226L132 252" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="108" cy="254" r="3" fill="#fff" />
                    <circle cx="132" cy="254" r="3" fill="#fff" />
                </>
            );
        case "zip":
            return <path d="M96 205Q120 216 144 205" stroke={shade} strokeWidth="8" strokeLinecap="round" fill="none" />;
        case "none":
            return null;
    }
}

/** Džep „kengur” na duksu */
function hoodPocket(variant: WearVariant | undefined, color: string): ReactNode {
    const d = variant === "full" ? "M84 276Q120 272 156 276L162 308Q120 312 78 308Z" : "M86 262Q120 258 154 262L160 284H80Z";
    return <path d={d} fill={color} />;
}

/** Rajsferšlus po sredini (do poruba) */
function zipper(variant: WearVariant | undefined, color: string): ReactNode {
    return (
        <>
            <path d={`M120 212V${torsoBottom(variant)}`} stroke={color} strokeWidth="3" />
            <rect x="116.5" y="214" width="7" height="11" rx="2.5" fill="#DDE4EE" stroke={color} strokeWidth="1.5" />
        </>
    );
}

/** Dugmad po sredini */
function buttons(variant: WearVariant | undefined, color: string, x = 120, from = 232): ReactNode {
    const out: ReactNode[] = [];
    for (let y = from; y < torsoBottom(variant) - 6; y += 20) out.push(<circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" fill={color} />);
    return out;
}

function garment(g: Garment): (variant?: WearVariant) => ReactNode {
    return (variant) => {
        const full = variant === "full";
        return (
            <>
                {full && g.lower && (typeof g.lower === "function" ? g.lower() : lowerPart(...g.lower))}
                <path d={full ? FULL_TORSO_PATH : TORSO_PATH} fill={g.color} />
                {g.pattern?.(variant)}
                {torsoLight(variant)}
                {neckline(g.neck ?? "round", g.shade, g.collar)}
                {g.deco?.(variant)}
            </>
        );
    };
}

// ── Šare na grudima ───────────────────────────────────────────────────────────

const JEANS: Lower = ["pants", "#4A6FB5", "#3A5A9A"];
const JEANS_SHORTS: Lower = ["shorts", "#4A6FB5", "#3A5A9A"];
const GRAY_PANTS: Lower = ["pants", "#5B6475", "#464E5E"];

const rainbow = () => (
    <>
        {["#F45B8D", "#FFD15C", "#3BB273", "#3D9BE9"].map((color, i) => (
            <path key={color} d={`M${96 + i * 6} 262A${24 - i * 6} ${24 - i * 6} 0 0 1 ${144 - i * 6} 262`} stroke={color} strokeWidth="6" fill="none" />
        ))}
        <circle cx="94" cy="262" r="7" fill="#fff" />
        <circle cx="102" cy="264" r="5.5" fill="#fff" />
        <circle cx="146" cy="262" r="7" fill="#fff" />
        <circle cx="138" cy="264" r="5.5" fill="#fff" />
    </>
);

const sun = () => (
    <>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const a = (deg * Math.PI) / 180;
            return <path key={deg} d={`M${r1(120 + Math.cos(a) * 19)} ${r1(250 + Math.sin(a) * 19)}L${r1(120 + Math.cos(a) * 26)} ${r1(250 + Math.sin(a) * 26)}`} stroke="#F2A516" strokeWidth="4" strokeLinecap="round" />;
        })}
        <circle cx="120" cy="250" r="15" fill="#FFD15C" />
        <circle cx="114" cy="247" r="1.8" fill="#5A2C24" />
        <circle cx="126" cy="247" r="1.8" fill="#5A2C24" />
        <path d="M113 254Q120 260 127 254" stroke="#5A2C24" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
);

const heart = (color: string) => () => (
    <>
        <path d={heartPath(120, 250, 18)} fill={color} />
        <ellipse cx="110" cy="240" rx="4" ry="3" fill="#fff" opacity="0.45" />
    </>
);

const car = () => (
    <>
        <path d="M90 260Q90 248 100 247L108 236H132L141 247Q150 248 150 260Z" fill="#E5484D" />
        <path d="M110 239H119V247H104ZM122 239H131L137 247H122Z" fill="#BDEBFF" />
        <circle cx="103" cy="261" r="6.5" fill="#3A3546" />
        <circle cx="137" cy="261" r="6.5" fill="#3A3546" />
        <circle cx="103" cy="261" r="2.5" fill="#DDE4EE" />
        <circle cx="137" cy="261" r="2.5" fill="#DDE4EE" />
    </>
);

const kitty = () => (
    <>
        <path d="M104 244L106 228L116 238ZM136 244L134 228L124 238Z" fill="#F7B771" />
        <circle cx="120" cy="252" r="17" fill="#F7B771" />
        <circle cx="113" cy="250" r="2.4" fill="#2A1D18" />
        <circle cx="127" cy="250" r="2.4" fill="#2A1D18" />
        <path d="M117 256L120 258L123 256" stroke="#F08AA0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M100 254H108M132 254H140" stroke="#C98A55" strokeWidth="1.6" strokeLinecap="round" />
    </>
);

const dino = (body = "#6CC46F") => () => (
    <>
        <path d="M140 256Q156 254 162 242Q160 262 140 266Z" fill={body} />
        <ellipse cx="126" cy="258" rx="18" ry="12" fill={body} />
        <path d="M110 254Q102 248 104 238" stroke={body} strokeWidth="9" strokeLinecap="round" fill="none" />
        <circle cx="104" cy="236" r="9" fill={body} />
        <path d="M114 247L118 241L122 246L126 240L130 246L134 241L137 248" fill="#FF8A3D" />
        <circle cx="102" cy="234" r="2" fill="#2A1D18" />
        <path d="M116 268V274M134 268V274" stroke={body} strokeWidth="5" strokeLinecap="round" />
    </>
);

const snowflake = () => (
    <g stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none">
        {[0, 60, 120].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 120 250)`}>
                <path d="M120 230V270M114 236L120 242L126 236M114 264L120 258L126 264" />
            </g>
        ))}
    </g>
);

const tree = () => (
    <>
        <path d="M120 230L136 254H104Z" fill="#3BB273" />
        <path d="M120 240L140 268H100Z" fill="#3BB273" />
        <rect x="116" y="268" width="8" height="8" fill="#8A5A30" />
        <path d={starPath(120, 229, 6, 2.6)} fill="#FFD15C" />
        <circle cx="114" cy="254" r="2.4" fill="#F45B8D" />
        <circle cx="128" cy="260" r="2.4" fill="#FFD15C" />
    </>
);

const soccerBall = () => (
    <>
        <circle cx="120" cy="252" r="15" fill="#fff" stroke="#3A3546" strokeWidth="2.5" />
        <path d="M120 245L127 250L124 258H116L113 250Z" fill="#3A3546" />
        <path d="M120 245V237M127 250L134 247M124 258L129 264M116 258L111 264M113 250L106 247" stroke="#3A3546" strokeWidth="2" />
    </>
);

const basketball = () => (
    <>
        <circle cx="120" cy="252" r="15" fill="#FF8A3D" stroke="#B8561C" strokeWidth="2" />
        <path d="M105 252H135M120 237V267M110 240Q118 252 110 264M130 240Q122 252 130 264" stroke="#B8561C" strokeWidth="2" fill="none" />
    </>
);

const fish = (x: number, y: number, color: string, flip = false) => (
    <g key={`${x}-${y}`} transform={`translate(${x} ${y})${flip ? " scale(-1 1)" : ""}`}>
        <ellipse rx="8" ry="5" fill={color} />
        <path d="M7 0L13 -5V5Z" fill={color} />
        <circle cx="-4" cy="-1" r="1.3" fill="#2A1D18" />
    </g>
);

const bigStar = (color: string, line: string) => () => <path d={starPath(120, 250, 22, 9.5)} fill={color} stroke={line} strokeWidth="3" strokeLinejoin="round" />;

/** Tufne preko trupa */
const dots = (color: string, step = 20, r = 3.6) => (variant?: WearVariant) => scatter(variant, step, r + 3, (x, y) => <circle cx={x} cy={y} r={r} fill={color} />);
const starsAll = (color: string, step = 24) => (variant?: WearVariant) => scatter(variant, step, 8, (x, y) => <path d={starPath(x, y, 5.5, 2.4)} fill={color} />);
const heartsAll = (color: string) => (variant?: WearVariant) => scatter(variant, 24, 8, (x, y) => <path d={heartPath(x, y, 5.5)} fill={color} />);
const stripes = (color: string, step = 16, height = 7, from = 222) => (variant?: WearVariant) => bands(variant, from, step, height, color);
/** Karo: uspravne i vodoravne providne pruge */
const plaid = (color: string) => (variant?: WearVariant) => (
    <>
        {bands(variant, 224, 22, 8, color)}
        {columns(variant, [0, 22, 44, 66, 88], 8, color, 0.55)}
    </>
);

// ── Donji delovi sa šarom ─────────────────────────────────────────────────────

/** Tačke na nogavicama pantalona (pidžama) */
const LEG_SPOTS: [number, number][] = [
    [92, 334],
    [106, 356],
    [92, 376],
    [148, 334],
    [134, 356],
    [148, 376],
];

const patternedPants = (color: string, shade: string, spot: (x: number, y: number) => ReactNode) => () => (
    <>
        {lowerPart("pants", color, shade)}
        {LEG_SPOTS.map(([x, y]) => (
            <g key={`${x}-${y}`}>{spot(x, y)}</g>
        ))}
    </>
);

const stripedPants = (color: string, shade: string, stripe: string) => () => (
    <>
        {lowerPart("pants", color, shade)}
        <path d="M69 312L82 390M171 312L158 390" stroke={stripe} strokeWidth="4" strokeLinecap="round" />
    </>
);

const SKIRT_SPOTS: [number, number][] = [
    [82, 336],
    [104, 328],
    [136, 328],
    [158, 336],
    [70, 354],
    [94, 350],
    [120, 344],
    [146, 350],
    [170, 354],
];

const patternedSkirt = (kind: LowerKind, color: string, shade: string, spot: (x: number, y: number) => ReactNode) => () => (
    <>
        {lowerPart(kind, color, shade)}
        {SKIRT_SPOTS.map(([x, y]) => (
            <g key={`${x}-${y}`}>{spot(x, y)}</g>
        ))}
    </>
);

/** Kaput do kolena (kabanica, doktorski mantil) preko pantalona */
const coatSkirt = (color: string, shade: string, pants: Lower = JEANS) => () => (
    <>
        {typeof pants === "function" ? pants() : lowerPart(...pants)}
        <path d="M58 300H182L188 352Q120 360 52 352Z" fill={color} />
        <path d="M120 318V356" stroke={shade} strokeWidth="2.5" />
        <path d="M54 348Q120 356 186 348" stroke={shade} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
    </>
);

/** Tutu suknjica (balet) */
const tutu = (color: string, light: string) => () => {
    const ruffle = (y: number, w: number, fill: string) => {
        const points: string[] = [];
        for (let i = 0; i <= 12; i++) {
            const x = 120 - w + (i * w) / 6;
            points.push(`${r1(x)} ${i % 2 ? y + 10 : y}`);
        }
        return <path d={`M${120 - w + 10} ${y - 30}L${120 + w - 10} ${y - 30}L${points.reverse().join("L")}Z`} fill={fill} />;
    };
    return (
        <>
            {ruffle(338, 80, color)}
            {ruffle(328, 72, light)}
        </>
    );
};

// ── Kostimi: posebni detalji ──────────────────────────────────────────────────

const astronautPanel = (variant?: WearVariant) => (
    <>
        <rect x="102" y="232" width="36" height="24" rx="5" fill="#5B6475" />
        <circle cx="110" cy="240" r="3.2" fill="#F45B8D" />
        <circle cx="120" cy="240" r="3.2" fill="#FFD15C" />
        <circle cx="130" cy="240" r="3.2" fill="#3D9BE9" />
        <path d="M108 249H132" stroke="#3BB273" strokeWidth="3" strokeLinecap="round" />
        <circle cx="82" cy="232" r="9" fill="#3D7BE0" />
        <path d={starPath(82, 232, 6, 2.6)} fill="#fff" />
        <path d="M150 238Q160 254 150 270" stroke="#3D9BE9" strokeWidth="5" strokeLinecap="round" fill="none" />
        {variant === "full" && (
            <>
                <rect x="60" y="298" width="120" height="10" rx="4" fill="#AEB9C9" />
                <rect x="112" y="296" width="16" height="14" rx="3" fill="#FFC83D" />
            </>
        )}
    </>
);

const kneePads = (color: string, shade: string, pad: string) => () => (
    <>
        {lowerPart("pants", color, shade)}
        <circle cx="98" cy="360" r="9" fill={pad} />
        <circle cx="142" cy="360" r="9" fill={pad} />
    </>
);

const reflective = (from: number) => (variant?: WearVariant) => (
    <>
        {bands(variant, from, 26, 9, "#FFD15C")}
        {bands(variant, from + 3.5, 26, 2, "#fff")}
    </>
);

const fireDeco = (variant?: WearVariant) => (
    <>
        {zipper(variant, "#1C2547")}
        <rect x="74" y="232" width="20" height="12" rx="3" fill="#262F5C" />
    </>
);

const firePants = () => (
    <>
        {lowerPart("pants", "#34407A", "#262F5C")}
        <path d="M76 362H117M123 362H164" stroke="#FFD15C" strokeWidth="8" />
        <path d="M76 362H117M123 362H164" stroke="#fff" strokeWidth="2" />
    </>
);

const doctorDeco = (variant?: WearVariant) => (
    <>
        <path d="M102 206L120 240L138 206Z" fill="#5CC0B8" />
        <path d="M102 206L112 254M138 206L128 254" stroke="#D5DCE6" strokeWidth="3" strokeLinecap="round" />
        <rect x="74" y="248" width="22" height="16" rx="3" fill="#EEF2F7" stroke="#D5DCE6" strokeWidth="2" />
        <rect x="80" y="240" width="4" height="12" rx="2" fill="#3D7BE0" />
        <path d="M106 212Q96 238 108 254Q116 262 124 254M134 212Q146 238 140 256" stroke="#5B6475" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <circle cx="140" cy="262" r="6.5" fill="#AEB9C9" />
        <path d={heartPath(140, 262, 3.6)} fill="#F45B8D" />
        {buttons(variant, "#C7D0DD", 120, 266)}
    </>
);

const chefDeco = (variant?: WearVariant) => (
    <>
        <path d="M104 206L120 224L136 206Z" fill="#E5484D" />
        <path d="M96 210Q140 232 146 300" stroke="#D5DCE6" strokeWidth="3" fill="none" />
        {buttons(variant, "#AEB9C9", 108, 236)}
        {buttons(variant, "#AEB9C9", 136, 236)}
    </>
);

const checkPants = () => (
    <>
        {lowerPart("pants", "#3A3546", "#22202A")}
        {[320, 334, 348, 362, 376].flatMap((y, row) =>
            [86, 98, 110, 130, 142, 154].map((x) => <rect key={`${x}-${y}`} x={x + (row % 2) * 6 - 3} y={y} width="5" height="5" fill="#fff" opacity="0.8" />)
        )}
    </>
);

const pilotDeco = (variant?: WearVariant) => (
    <>
        <path d="M100 205L120 246L140 205Z" fill="#fff" />
        <path d="M117 212H123L125 238L120 245L115 238Z" fill="#1F2937" />
        <path d="M100 205L112 262M140 205L128 262" stroke="#1F2850" strokeWidth="3" strokeLinecap="round" />
        <path d="M70 234Q78 228 86 232Q94 228 102 234Q94 237 86 236Q78 237 70 234Z" fill="#FFC83D" />
        <circle cx="86" cy="234" r="3" fill="#E9A10E" />
        {buttons(variant, "#FFC83D", 120, 262)}
    </>
);

const princessDeco = (variant?: WearVariant) => (
    <>
        <circle cx="70" cy="218" r="14" fill="#FBC8DC" />
        <circle cx="170" cy="218" r="14" fill="#FBC8DC" />
        <path d="M94 210Q120 236 146 210" stroke="#FFC83D" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M120 238L127 247L120 256L113 247Z" fill="#B9A2F2" stroke="#fff" strokeWidth="1.5" />
        <path d="M100 262Q120 272 140 262" stroke="#E0709A" strokeWidth="3" fill="none" />
        {variant === "full" && <path d="M64 292Q120 304 176 292" stroke="#FFC83D" strokeWidth="6" strokeLinecap="round" fill="none" />}
    </>
);

const princessGown = () => (
    <>
        {lowerPart("gown", "#F7A8C8", "#E0709A")}
        <path d="M30 394Q120 410 210 394" stroke="#FFC83D" strokeWidth="3" fill="none" />
        {sparkle(80, 340, 5)}
        {sparkle(160, 352, 5)}
        {sparkle(120, 372, 6)}
        {sparkle(62, 380, 4)}
        {sparkle(178, 384, 4)}
    </>
);

const princeDeco = (variant?: WearVariant) => (
    <>
        <path d={variant === "full" ? "M76 210L166 318" : "M76 210L156 284"} stroke="#FFC83D" strokeWidth="11" strokeLinecap="round" />
        <ellipse cx="72" cy="214" rx="15" ry="6" fill="#FFC83D" />
        <ellipse cx="168" cy="214" rx="15" ry="6" fill="#FFC83D" />
        <path d="M60 218V226M66 219V228M72 220V229M78 219V228M84 218V226M156 218V226M162 219V228M168 220V229M174 219V228M180 218V226" stroke="#E9A10E" strokeWidth="2.4" strokeLinecap="round" />
        {[100, 110, 120, 130, 140].map((x, i) => (
            <circle key={x} cx={x} cy={i % 2 ? 214 : 210} r="6" fill="#fff" />
        ))}
        <circle cx="146" cy="244" r="3.4" fill="#FFC83D" />
        <circle cx="146" cy="262" r="3.4" fill="#FFC83D" />
    </>
);

const knightDeco = (variant?: WearVariant) => (
    <>
        {scatter(variant, 9, 4, (x, y) => <circle cx={x} cy={y} r="1.6" fill="#9AA8BC" />, 222)}
        <path d={variant === "full" ? "M94 208H146L152 330H88Z" : "M94 208H146L150 286H90Z"} fill="#3D7BE0" stroke="#FFC83D" strokeWidth="3" strokeLinejoin="round" />
        <path d={heartPath(120, 252, 14)} fill="#FFD15C" />
        <ellipse cx="70" cy="216" rx="20" ry="11" fill="#AEB9C9" />
        <ellipse cx="170" cy="216" rx="20" ry="11" fill="#AEB9C9" />
        <circle cx="64" cy="214" r="2" fill="#fff" />
        <circle cx="176" cy="214" r="2" fill="#fff" />
    </>
);

const heroDeco = (variant?: WearVariant) => (
    <>
        <circle cx="120" cy="248" r="20" fill="#FFD15C" stroke="#F2A516" strokeWidth="3" />
        <path d={starPath(120, 249, 14, 6)} fill="#E5484D" />
        {variant === "full" && (
            <>
                <rect x="60" y="298" width="120" height="11" rx="4" fill="#FFD15C" />
                <rect x="112" y="296" width="16" height="15" rx="3" fill="#F2A516" />
            </>
        )}
    </>
);

const dinoDeco = (variant?: WearVariant) => (
    <>
        <ellipse cx="120" cy="266" rx="30" ry="38" fill="#FFE08A" />
        <path d="M96 252Q120 258 144 252M92 270Q120 276 148 270M96 288Q120 294 144 288" stroke="#F2C94C" strokeWidth="3" fill="none" />
        <circle cx="76" cy="236" r="6" fill="#4FAE5E" />
        <circle cx="164" cy="246" r="7" fill="#4FAE5E" />
        <circle cx="82" cy="266" r="4" fill="#4FAE5E" />
        {variant === "full" && (
            <>
                <path d="M66 290Q30 300 8 340Q4 352 16 348Q42 334 70 318Z" fill="#6CC46F" />
                <path d="M54 296L52 284L62 292M38 306L32 294L44 300M24 320L16 310L30 314" fill="#FF8A3D" />
            </>
        )}
    </>
);

const bearDeco = () => (
    <>
        <ellipse cx="120" cy="268" rx="30" ry="36" fill="#F1CBA4" />
        <path d={heartPath(120, 262, 9)} fill="#F45B8D" />
        <path d="M74 230l4 4 4-4M158 236l4 4 4-4M78 262l4 4 4-4M160 268l4 4 4-4" stroke="#8A5A30" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </>
);

const pirateDeco = (variant?: WearVariant) => (
    <>
        {sidePanels(variant, 100, 208, "#3A3546")}
        <circle cx="94" cy="244" r="3.4" fill="#FFC83D" />
        <circle cx="94" cy="264" r="3.4" fill="#FFC83D" />
        <circle cx="146" cy="244" r="3.4" fill="#FFC83D" />
        <circle cx="146" cy="264" r="3.4" fill="#FFC83D" />
        {variant === "full" && <path d="M60 300Q120 312 180 300L182 312Q120 322 58 312Z" fill="#E5484D" />}
    </>
);

const cowboyDeco = (variant?: WearVariant) => (
    <>
        {sidePanels(variant, 102, 208, "#9A6236")}
        <path d={starPath(84, 246, 9, 4)} fill="#FFC83D" stroke="#E9A10E" strokeWidth="1.5" strokeLinejoin="round" />
        {buttons(variant, "#fff", 120, 236)}
    </>
);

const wetsuitDeco = (variant?: WearVariant) => (
    <>
        {sidePanels(variant, 82, 214, "#3BB2A0")}
        {zipper(variant, "#5B6475")}
    </>
);

const wetsuitPants = () => (
    <>
        {lowerPart("pants", "#2A3346", "#1C2333")}
        <path d="M69 312L82 390M171 312L158 390" stroke="#3BB2A0" strokeWidth="7" strokeLinecap="round" />
    </>
);

const overallsDeco = (denim: string, dark: string) => (variant?: WearVariant) => (
    <>
        <path d={variant === "full" ? "M90 236H150V322H90Z" : "M90 236H150V284H90Z"} fill={denim} />
        <path d="M92 238L84 206M148 238L156 206" stroke={denim} strokeWidth="9" strokeLinecap="round" />
        <circle cx="93" cy="240" r="3.4" fill="#FFC83D" />
        <circle cx="147" cy="240" r="3.4" fill="#FFC83D" />
        <path d="M106 250H134V268Q120 274 106 268Z" fill={dark} />
        <path d={heartPath(120, 259, 5)} fill="#F45B8D" />
    </>
);

const pufferDeco = (variant?: WearVariant) => (
    <>
        {zipper(variant, "#3A3546")}
        {[94, 102, 110, 118, 126, 134, 142].map((x, i) => (
            <circle key={x} cx={x} cy={r1(206 + Math.sin(((i + 0.5) / 7) * Math.PI) * 8)} r="7" fill="#fff" />
        ))}
    </>
);

const raincoatDeco = (shade: string) => (variant?: WearVariant) => (
    <>
        <path d={`M120 214V${torsoBottom(variant)}`} stroke={shade} strokeWidth="2.5" />
        {[236, 258, 280, 302].filter((y) => y < torsoBottom(variant) - 6).map((y) => (
            <rect key={y} x="124" y={y - 3} width="12" height="6" rx="3" fill="#3A3546" />
        ))}
        <path d="M70 266H96V272H70ZM144 266H170V272H144Z" fill={shade} />
    </>
);

const tracksuitDeco = (variant?: WearVariant) => (
    <>
        {columns(variant, [52], 4, "#fff")}
        {zipper(variant, "#fff")}
    </>
);

const tankTrim = (trim: string) => () => (
    <>
        <path d="M86 206Q120 248 154 206" stroke={trim} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M78 212Q90 232 80 262M162 212Q150 232 160 262" stroke={trim} strokeWidth="4" fill="none" strokeLinecap="round" />
    </>
);

const vestDeco = (variant?: WearVariant) => (
    <>
        {sidePanels(variant, 104, 212, "#3BB273")}
        {buttons(variant, "#2A8E57", 98, 240)}
    </>
);

const ladybugDeco = (variant?: WearVariant) => (
    <>
        <path d={`M120 210V${torsoBottom(variant)}`} stroke="#3A3546" strokeWidth="4" />
        {[
            [92, 236, 7],
            [148, 236, 7],
            [84, 264, 8],
            [156, 264, 8],
            [102, 290, 6],
            [138, 290, 6],
        ]
            .filter(([, y, r]) => y + r < torsoBottom(variant))
            .map(([x, y, r]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#3A3546" />
            ))}
    </>
);

const robeLower = () => (
    <>
        {lowerPart("gown", "#6C55C9", "#5641A8")}
        {[
            [70, 350],
            [104, 334],
            [150, 344],
            [178, 380],
            [120, 384],
            [56, 388],
        ].map(([x, y]) => (
            <path key={`${x}-${y}`} d={starPath(x, y, 6, 2.6)} fill="#FFD15C" />
        ))}
    </>
);

const balletDeco = () => (
    <>
        <path d="M96 205L104 236M144 205L136 236" stroke="#F78FB3" strokeWidth="4" strokeLinecap="round" />
        <path d="M120 246L108 240Q104 246 108 252ZM120 246L132 240Q136 246 132 252Z" fill="#F45B8D" />
        <circle cx="120" cy="246" r="3.4" fill="#E0457A" />
        {sparkle(96, 268, 4)}
        {sparkle(146, 262, 3.5)}
    </>
);

// ── Katalog ───────────────────────────────────────────────────────────────────

const base = itemsFor("outfit");

function outfit(id: string, label: string, price: number, g: Garment, sleeve = g.color) {
    return base(id, label, price, garment(g), { sleeve, lower: g.lower !== undefined });
}

const tee = (color: string, shade: string, deco: Garment["deco"], lower: Lower = JEANS, pattern?: Garment["pattern"]): Garment => ({ color, shade, deco, lower, pattern });
const hoodie = (color: string, shade: string, pocket: string, deco?: Garment["deco"]): Garment => ({
    color,
    shade,
    neck: "hood",
    lower: GRAY_PANTS,
    deco: (variant) => (
        <>
            {hoodPocket(variant, pocket)}
            {deco?.(variant)}
        </>
    ),
});
const pajamas = (color: string, shade: string, spot: (x: number, y: number) => ReactNode, pattern: Garment["pattern"]): Garment => ({
    color,
    shade,
    neck: "collar",
    collar: shade,
    pattern,
    lower: patternedPants(color, shade, spot),
    deco: (variant) => buttons(variant, "#fff", 120, 234),
});
const tracksuit = (color: string, shade: string): Garment => ({ color, shade, neck: "zip", lower: stripedPants(color, shade, "#fff"), deco: tracksuitDeco });
const puffer = (color: string, shade: string): Garment => ({ color, shade, neck: "none", pattern: (variant) => bands(variant, 232, 17, 2.5, shade), deco: pufferDeco, lower: ["pants", "#3A3546", "#22202A"] });
const raincoat = (color: string, shade: string): Garment => ({ color, shade, neck: "collar", collar: shade, deco: raincoatDeco(shade), lower: coatSkirt(color, shade) });
const dress = (color: string, shade: string, spot: (x: number, y: number) => ReactNode, pattern?: Garment["pattern"]): Garment => ({
    color,
    shade,
    neck: "collar",
    pattern,
    lower: patternedSkirt("skirt", color, shade, spot),
    deco: (variant) => variant === "full" && <path d="M62 296Q120 306 178 296" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />,
});

const dot = (color: string, r = 3.6) => (x: number, y: number) => <circle cx={x} cy={y} r={r} fill={color} />;
const star = (color: string) => (x: number, y: number) => <path d={starPath(x, y, 5.5, 2.4)} fill={color} />;
const heartSpot = (color: string) => (x: number, y: number) => <path d={heartPath(x, y, 5)} fill={color} />;
const cloud = (x: number, y: number) => (
    <g>
        <circle cx={x - 4} cy={y} r="4" fill="#fff" />
        <circle cx={x + 2} cy={y - 2} r="5" fill="#fff" />
        <circle cx={x + 7} cy={y + 1} r="3.5" fill="#fff" />
    </g>
);
const flowerSpot = (color: string) => (x: number, y: number) => flower(x, y, color, 0.7);
const clouds = (variant?: WearVariant) => scatter(variant, 30, 10, (x, y) => cloud(x, y));

export const OUTFITS = [
    // Majice
    outfit("majica-pruge", "Majica na plave pruge", 5, tee("#fff", "#3D7BE0", undefined, JEANS_SHORTS, stripes("#3D7BE0"))),
    outfit("majica-crvene-pruge", "Majica na crvene pruge", 5, tee("#fff", "#E5484D", undefined, ["shorts", "#3A4A80", "#2E3A66"], stripes("#E5484D", 18, 8))),
    base("majica-zvezda", "Majica sa zvezdom", 6, (variant) => (variant === "full" ? garment(tee("#8E77E6", "#7258C9", bigStar("#FFD15C", "#F2A516")))(variant) : starTeeBust()), { sleeve: "#7258C9", lower: true }),
    outfit("majica-duga", "Majica sa dugom", 6, tee("#7CC6F2", "#4FA6DA", rainbow, JEANS_SHORTS)),
    outfit("majica-srce", "Majica sa srcem", 6, tee("#FFB8CB", "#E9708F", heart("#E5484D"), ["shorts", "#fff", "#DDE4EE"])),
    outfit("majica-sunce", "Majica sa suncem", 6, tee("#3BB2A0", "#2C8F80", sun, JEANS_SHORTS)),
    outfit("majica-tufne", "Majica na tufne", 6, tee("#FFD15C", "#F2A516", undefined, ["shorts", "#3BB273", "#2A8E57"], dots("#fff"))),
    outfit("majica-auto", "Majica sa autićem", 7, tee("#DDE4EE", "#AEB9C9", car)),
    outfit("majica-mace", "Majica sa mačetom", 7, tee("#B9A2F2", "#8E77E6", kitty)),
    outfit("majica-dino", "Majica sa dinosaurusom", 7, tee("#FFB866", "#F2994A", dino())),
    // Duksevi i džemperi
    outfit("plavi-duks", "Plavi duks", 8, hoodie("#3D86E0", "#2C6BC0", "#2C6BC0")),
    outfit("roze-duks", "Roze duks", 8, hoodie("#F78FB3", "#E0709A", "#E0709A", heart("#fff"))),
    outfit("zeleni-duks", "Zeleni duks sa zvezdom", 9, hoodie("#3BB273", "#2A8E57", "#2A8E57", bigStar("#FFD15C", "#F2A516"))),
    outfit("sivi-duks", "Sivi duks sa dugom", 9, hoodie("#AEB9C9", "#8C98AB", "#8C98AB", rainbow)),
    base("dzemper-srce", "Džemper sa srcem", 8, (variant) => (variant === "full" ? garment({ color: "#5DB98D", shade: "#3E9970", lower: GRAY_PANTS, deco: heart("#F2557A") })(variant) : heartSweaterBust()), {
        sleeve: "#3E9970",
        lower: true,
    }),
    outfit("dzemper-pruge", "Džemper na pruge", 9, { color: "#FFB866", shade: "#E5484D", pattern: stripes("#E5484D", 20, 9, 226), lower: JEANS }),
    outfit("dzemper-pahulja", "Džemper sa pahuljom", 10, { color: "#E5484D", shade: "#C53035", deco: snowflake, lower: GRAY_PANTS }),
    outfit("dzemper-jelka", "Džemper sa jelkom", 10, { color: "#2E3A66", shade: "#1F2850", deco: tree, lower: GRAY_PANTS }),
    // Haljine i kombinezoni
    outfit("haljina-tufne", "Haljina na tufne", 12, dress("#F78FB3", "#E0457A", dot("#fff"), dots("#fff"))),
    outfit("haljina-cvece", "Haljina sa cvećem", 12, dress("#7ED6F2", "#4FB7DD", flowerSpot("#fff"), (variant) => scatter(variant, 30, 9, (x, y) => flower(x, y, "#fff", 0.7)))),
    outfit("letnja-haljina", "Letnja haljina", 11, dress("#FFD15C", "#F2A516", heartSpot("#F45B8D"))),
    outfit("haljina-zvezde", "Haljina sa zvezdama", 13, dress("#8E77E6", "#7258C9", star("#FFD15C"), starsAll("#FFD15C"))),
    outfit("kombinezon", "Kombinezon", 10, { color: "#FFD15C", shade: "#F2A516", deco: overallsDeco("#4A6FB5", "#3A5A9A"), lower: JEANS }),
    outfit("roze-kombinezon", "Roze kombinezon", 10, { color: "#fff", shade: "#DDE4EE", deco: overallsDeco("#F78FB3", "#E0709A"), lower: ["pants", "#F78FB3", "#E0709A"] }),
    // Trenerke, pidžame, jakne
    outfit("crvena-trenerka", "Crvena trenerka", 11, tracksuit("#E5484D", "#C53035")),
    outfit("plava-trenerka", "Plava trenerka", 11, tracksuit("#3D7BE0", "#2C5DB0")),
    outfit("ljubicasta-trenerka", "Ljubičasta trenerka", 11, tracksuit("#8E77E6", "#7258C9")),
    outfit("pidzama", "Pidžama sa zvezdama", 9, pajamas("#A8D8F0", "#7FBCE0", star("#FFD15C"), starsAll("#FFD15C"))),
    outfit("pidzama-oblaci", "Pidžama sa oblačićima", 9, pajamas("#B9A2F2", "#8E77E6", cloud, clouds)),
    outfit("pidzama-srca", "Pidžama sa srcima", 9, pajamas("#FFB8CB", "#E9708F", heartSpot("#fff"), heartsAll("#fff"))),
    outfit("zuta-kabanica", "Žuta kabanica", 12, raincoat("#FFD15C", "#E9A10E")),
    outfit("crvena-kabanica", "Crvena kabanica", 12, raincoat("#E5484D", "#C53035")),
    outfit("zimska-jakna", "Zimska jakna", 15, puffer("#3D86E0", "#2C6BC0")),
    outfit("roze-jakna", "Roze zimska jakna", 15, puffer("#F78FB3", "#E0709A")),
    outfit("zelena-jakna", "Zelena zimska jakna", 15, puffer("#3BB273", "#2A8E57")),
    // Leto i sport
    outfit("kupaci-pruge", "Kupaći sa prugama", 8, tee("#fff", "#3BB2A0", undefined, ["shorts", "#3BB2A0", "#2C8F80"], stripes("#3BB2A0", 14, 6))),
    outfit("kupaci-ribice", "Kupaći sa ribicama", 8, tee("#7ED6F2", "#4FB7DD", () => [fish(104, 244, "#FF8A3D"), fish(138, 258, "#FFD15C", true), fish(112, 270, "#F45B8D")], ["shorts", "#FF8A3D", "#E5732A"])),
    outfit("kupaci-cvetovi", "Kupaći sa cvetovima", 8, tee("#F45B8D", "#D93C70", undefined, ["shorts", "#FFD15C", "#F2A516"], (variant) => scatter(variant, 28, 9, (x, y) => flower(x, y, "#FFD15C", 0.75)))),
    outfit("fudbalski-dres", "Fudbalski dres", 12, { color: "#3BB273", shade: "#fff", neck: "v", deco: soccerBall, pattern: (variant) => columns(variant, [50], 6, "#fff"), lower: ["shorts", "#fff", "#DDE4EE"] }),
    outfit("kosarkaski-dres", "Košarkaški dres", 12, { color: "#FF8A3D", shade: "#fff", neck: "none", deco: () => (
            <>
                {tankTrim("#fff")()}
                {basketball()}
            </>
        ), lower: ["shorts", "#FF8A3D", "#E5732A"] }),
    outfit("dres-zvezda", "Dres sa zvezdom", 12, { color: "#2C5DB0", shade: "#FFD15C", neck: "v", deco: bigStar("#fff", "#DDE4EE"), lower: ["shorts", "#2C5DB0", "#1F4A94"] }),
    outfit("kosulja-kocke", "Košulja na kocke", 10, { color: "#E5484D", shade: "#B8323A", neck: "collar", collar: "#C53035", pattern: plaid("#B8323A"), deco: (variant) => buttons(variant, "#fff", 120, 228), lower: JEANS }),
    outfit("kosulja-prsluk", "Košulja i prsluk", 11, { color: "#fff", shade: "#DDE4EE", neck: "collar", deco: vestDeco, lower: ["pants", "#9A6236", "#7A4A28"] }),
    base("odelo", "Odelo sa kravatom", 12, (variant) => (variant === "full" ? suitFull() : suitBust()), { sleeve: "#26325E", lower: true }),
    base("super-ogrtac", "Super-ogrtač", 15, superCape, { sleeve: "#C93A3F" }),
    // Kostimi
    outfit("kostim-balerine", "Baletska haljina", 18, { color: "#FFB8CB", shade: "#F78FB3", neck: "none", deco: balletDeco, lower: tutu("#FFB8CB", "#FFD3E0") }, "#FFD3E0"),
    outfit("kostim-kuvara", "Kostim kuvara", 20, { color: "#FFFFFF", shade: "#D5DCE6", neck: "none", deco: chefDeco, lower: checkPants }),
    outfit("kostim-bubamare", "Kostim bubamare", 20, { color: "#E5484D", shade: "#3A3546", neck: "round", deco: ladybugDeco, lower: ["pants", "#3A3546", "#22202A"] }, "#3A3546"),
    outfit("kostim-pcelice", "Kostim pčelice", 22, { color: "#FFD15C", shade: "#3A3546", pattern: stripes("#3A3546", 24, 11, 236), lower: ["pants", "#3A3546", "#22202A"] }, "#3A3546"),
    outfit("kostim-doktora", "Kostim doktora", 25, { color: "#F8FAFC", shade: "#D5DCE6", neck: "none", deco: doctorDeco, lower: coatSkirt("#F8FAFC", "#D5DCE6", ["pants", "#5CC0B8", "#3FA89B"]) }),
    outfit("kostim-mede", "Kostim mede", 26, { color: "#BC8656", shade: "#8A5A30", deco: bearDeco, lower: ["pants", "#BC8656", "#8A5A30"] }),
    outfit("kostim-ronioca", "Kostim ronioca", 26, { color: "#2A3346", shade: "#1C2333", neck: "zip", deco: wetsuitDeco, lower: wetsuitPants }),
    outfit("kostim-kauboja", "Kostim kauboja", 27, { color: "#E5484D", shade: "#B8323A", neck: "collar", collar: "#C53035", pattern: plaid("#B8323A"), deco: cowboyDeco, lower: JEANS }),
    outfit("kostim-pilota", "Kostim pilota", 28, { color: "#2E3A66", shade: "#1F2850", neck: "none", deco: pilotDeco, lower: ["pants", "#2E3A66", "#1F2850"] }),
    outfit("kostim-pirata", "Kostim pirata", 28, { color: "#fff", shade: "#DDE4EE", neck: "v", pattern: stripes("#E5484D", 16, 7, 222), deco: pirateDeco, lower: ["pants", "#3A4A80", "#2E3A66"] }, "#F8FAFC"),
    outfit("kostim-vatrogasca", "Kostim vatrogasca", 30, { color: "#34407A", shade: "#262F5C", neck: "zip", pattern: reflective(252), deco: fireDeco, lower: firePants }),
    outfit("kostim-superheroja", "Kostim superheroja", 32, { color: "#E5484D", shade: "#B8323A", deco: heroDeco, lower: ["pants", "#3D7BE0", "#2C5DB0"] }),
    outfit("kostim-carobnjaka", "Odora čarobnjaka", 34, { color: "#6C55C9", shade: "#FFD15C", neck: "v", pattern: starsAll("#FFD15C", 28), lower: robeLower }),
    outfit("kostim-viteza", "Kostim viteza", 35, { color: "#C7D0DD", shade: "#9AA8BC", neck: "none", deco: knightDeco, lower: kneePads("#AEB9C9", "#8C98AB", "#DDE4EE") }, "#AEB9C9"),
    outfit("haljina-princeze", "Haljina princeze", 40, { color: "#F7A8C8", shade: "#E0709A", neck: "none", deco: princessDeco, lower: princessGown }, "#FBC8DC"),
    outfit("kostim-princa", "Kostim princa", 40, { color: "#3D7BE0", shade: "#2C5DB0", neck: "none", deco: princeDeco, lower: ["pants", "#F2F5FA", "#D5DCE6"] }),
    outfit("kostim-dinosaurusa", "Kostim dinosaurusa", 45, { color: "#6CC46F", shade: "#4FAE5E", deco: dinoDeco, lower: ["pants", "#6CC46F", "#4FAE5E"] }),
    outfit("kostim-astronauta", "Kostim astronauta", 60, { color: "#F2F5FA", shade: "#AEB9C9", deco: astronautPanel, lower: kneePads("#F2F5FA", "#C7D0DD", "#AEB9C9") }, "#E3E8F0"),
];
