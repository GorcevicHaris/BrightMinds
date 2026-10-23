// Naočare i maske: preko očiju (92, 114) i (148, 114). Maske imaju otvore za oči,
// pa se oči i treptanje uvek vide.

import type { ReactNode } from "react";
import { EYE_LX, EYE_RX, EYE_Y } from "../geometry";
import { gloss, heartPath, itemsFor, mirror, sparkle, starPath } from "./art";

// ── Postojeći predmeti (crtež se ne menja) ───────────────────────────────────

function roundGlasses(color = "#3B4A8C"): ReactNode {
    return (
        <>
            <g fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round">
                <circle cx={EYE_LX} cy={EYE_Y} r="20" fill="#DCEBFF" fillOpacity="0.18" />
                <circle cx={EYE_RX} cy={EYE_Y} r="20" fill="#DCEBFF" fillOpacity="0.18" />
                <path d={`M${EYE_LX + 20} ${EYE_Y - 2}Q120 ${EYE_Y - 9} ${EYE_RX - 20} ${EYE_Y - 2}`} />
                <path d={`M${EYE_LX - 20} ${EYE_Y - 4}L56 ${EYE_Y - 8}M${EYE_RX + 20} ${EYE_Y - 4}L184 ${EYE_Y - 8}`} />
            </g>
            <path d={`M${EYE_LX - 12} ${EYE_Y - 9}q4-6 11-7M${EYE_RX - 12} ${EYE_Y - 9}q4-6 11-7`} stroke="#fff" strokeOpacity="0.8" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
    );
}

const SUN_LENS = "M68 103Q68 98 73 98L111 98Q116 98 115 103L112 121Q110 134 92 134Q72 134 69 120Z";

function sunglasses(frame = "#E5484D", lens = "#1F2937"): ReactNode {
    return (
        <>
            <path d={`M66 104L54 100M174 104L186 100`} stroke={frame} strokeWidth="4.5" strokeLinecap="round" />
            <path d={SUN_LENS} fill={lens} fillOpacity="0.88" stroke={frame} strokeWidth="4.5" strokeLinejoin="round" />
            <path d={mirror(SUN_LENS)} fill={lens} fillOpacity="0.88" stroke={frame} strokeWidth="4.5" strokeLinejoin="round" />
            <path d="M115 104Q120 99 125 104" stroke={frame} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M78 108L86 102M80 118L96 104M134 108L142 102M136 118L152 104" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
        </>
    );
}

// ── Novi predmeti ─────────────────────────────────────────────────────────────

/** Drške i mostić za naočare bilo kog oblika */
function temples(color: string, gap = 20): ReactNode {
    return (
        <path
            d={`M${EYE_LX + gap} ${EYE_Y - 3}Q120 ${EYE_Y - 10} ${EYE_RX - gap} ${EYE_Y - 3}M${EYE_LX - gap} ${EYE_Y - 4}L56 ${EYE_Y - 8}M${EYE_RX + gap} ${EYE_Y - 4}L184 ${EYE_Y - 8}`}
            stroke={color}
            strokeWidth="4.5"
            strokeLinecap="round"
            fill="none"
        />
    );
}

function squareGlasses(): ReactNode {
    const color = "#2FA36B";
    return (
        <>
            {temples(color, 22)}
            <rect x={EYE_LX - 22} y={EYE_Y - 17} width="44" height="34" rx="9" fill="#DCF5E7" fillOpacity="0.2" stroke={color} strokeWidth="4.5" />
            <rect x={EYE_RX - 22} y={EYE_Y - 17} width="44" height="34" rx="9" fill="#DCF5E7" fillOpacity="0.2" stroke={color} strokeWidth="4.5" />
            {gloss(`M${EYE_LX - 14} ${EYE_Y - 9}l8-4M${EYE_RX - 14} ${EYE_Y - 9}l8-4`, 3, 0.8)}
        </>
    );
}

function heartGlasses(): ReactNode {
    const color = "#E0457A";
    return (
        <>
            {temples(color, 22)}
            <path d={heartPath(EYE_LX, EYE_Y + 1, 21)} fill="#F78FB3" fillOpacity="0.35" stroke={color} strokeWidth="4.5" strokeLinejoin="round" />
            <path d={heartPath(EYE_RX, EYE_Y + 1, 21)} fill="#F78FB3" fillOpacity="0.35" stroke={color} strokeWidth="4.5" strokeLinejoin="round" />
            {gloss(`M${EYE_LX - 14} ${EYE_Y - 10}q3-5 9-6M${EYE_RX - 14} ${EYE_Y - 10}q3-5 9-6`, 3, 0.8)}
        </>
    );
}

function starGlasses(): ReactNode {
    const color = "#F2A516";
    return (
        <>
            {temples(color, 22)}
            <path d={starPath(EYE_LX, EYE_Y + 2, 27, 15)} fill="#FFE08A" fillOpacity="0.3" stroke={color} strokeWidth="4.5" strokeLinejoin="round" />
            <path d={starPath(EYE_RX, EYE_Y + 2, 27, 15)} fill="#FFE08A" fillOpacity="0.3" stroke={color} strokeWidth="4.5" strokeLinejoin="round" />
            {sparkle(60, 92, 5)}
            {sparkle(182, 136, 4)}
        </>
    );
}

/** Šarene naočare: svaki deo okvira druge boje */
function rainbowGlasses(): ReactNode {
    return (
        <>
            {temples("#3BB273")}
            <circle cx={EYE_LX} cy={EYE_Y} r="20" fill="#FFE5D0" fillOpacity="0.2" stroke="#FF8A3D" strokeWidth="5" />
            <circle cx={EYE_RX} cy={EYE_Y} r="20" fill="#E8E1FF" fillOpacity="0.2" stroke="#8E77E6" strokeWidth="5" />
            <circle cx={EYE_LX} cy={EYE_Y} r="23.5" fill="none" stroke="#FFD15C" strokeWidth="2.5" />
            <circle cx={EYE_RX} cy={EYE_Y} r="23.5" fill="none" stroke="#F45B8D" strokeWidth="2.5" />
            {gloss(`M${EYE_LX - 12} ${EYE_Y - 9}q4-6 11-7M${EYE_RX - 12} ${EYE_Y - 9}q4-6 11-7`, 3, 0.8)}
        </>
    );
}

/** Okviri u obliku cveta (latice oko svakog oka) */
function flowerGlasses(): ReactNode {
    const petals = (cx: number, color: string) =>
        [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const a = (deg * Math.PI) / 180;
            return <circle key={`${cx}-${deg}`} cx={Math.round((cx + Math.cos(a) * 22) * 10) / 10} cy={Math.round((EYE_Y + Math.sin(a) * 22) * 10) / 10} r="7" fill={color} />;
        });
    return (
        <>
            {temples("#F45B8D", 26)}
            {petals(EYE_LX, "#F78FB3")}
            {petals(EYE_RX, "#FFD15C")}
            <circle cx={EYE_LX} cy={EYE_Y} r="18" fill="#fff" fillOpacity="0.25" stroke="#F45B8D" strokeWidth="3.5" />
            <circle cx={EYE_RX} cy={EYE_Y} r="18" fill="#fff" fillOpacity="0.25" stroke="#F2A516" strokeWidth="3.5" />
        </>
    );
}

/** Maska sa otvorima za oči (superheroj) */
const MASK = "M50 106Q56 88 92 92Q110 94 120 102Q130 94 148 92Q184 88 190 106Q190 130 164 136Q140 140 120 124Q100 140 76 136Q50 130 50 106Z";
const EYE_HOLES = `M${EYE_LX - 16} ${EYE_Y}a16 16 0 1 0 32 0a16 16 0 1 0-32 0ZM${EYE_RX - 16} ${EYE_Y}a16 16 0 1 0 32 0a16 16 0 1 0-32 0Z`;

function heroMask(): ReactNode {
    return (
        <>
            <path d="M52 108Q36 112 30 128M52 104Q38 100 30 90" stroke="#2C5DB0" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d={`${MASK}${EYE_HOLES}`} fill="#3D7BE0" fillRule="evenodd" />
            {gloss("M60 104Q68 94 86 94", 3, 0.4)}
            <path d={EYE_HOLES} fill="none" stroke="#2C5DB0" strokeWidth="2.5" />
        </>
    );
}

/** Maska leptira: krila oko očiju, sa tačkicama */
function butterflyMask(): ReactNode {
    const wing = "M120 104Q110 82 84 80Q52 80 50 104Q48 126 64 136Q82 144 104 134Q114 126 120 116Z";
    return (
        <>
            <path d={`${wing}${mirror(wing)}${EYE_HOLES}`} fill="#B9A2F2" fillRule="evenodd" stroke="#8E77E6" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="60" cy="94" r="4.5" fill="#F78FB3" />
            <circle cx="180" cy="94" r="4.5" fill="#F78FB3" />
            <circle cx="64" cy="128" r="3.5" fill="#FFD15C" />
            <circle cx="176" cy="128" r="3.5" fill="#FFD15C" />
            <ellipse cx="120" cy="110" rx="5" ry="12" fill="#8E77E6" />
            <path d="M118 98Q112 86 106 82M122 98Q128 86 134 82" stroke="#8E77E6" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            {sparkle(112, 78, 4)}
        </>
    );
}

/** Ronilačka maska sa disaljkom */
function divingMask(): ReactNode {
    const glass = "M62 100Q62 90 74 90H166Q178 90 178 100V124Q178 138 164 138Q146 138 132 128Q120 120 108 128Q94 138 76 138Q62 138 62 124Z";
    return (
        <>
            <path d="M62 108L48 104M178 108L192 104" stroke="#3BB2A0" strokeWidth="8" strokeLinecap="round" />
            <path d="M194 112V40Q194 30 204 30" stroke="#FF8A3D" strokeWidth="9" strokeLinecap="round" fill="none" />
            <path d="M194 112V40" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
            <path d={glass} fill="#BDEBFF" fillOpacity="0.35" stroke="#FF8A3D" strokeWidth="6" strokeLinejoin="round" />
            {gloss("M74 104L86 96M78 118L96 100", 3, 0.7)}
        </>
    );
}

/** Skijaške naočare: veliko staklo i traka */
function skiGoggles(): ReactNode {
    const glass = "M60 102Q62 90 76 90H164Q178 90 180 102Q182 124 168 132Q150 140 134 128Q120 120 106 128Q90 140 72 132Q58 124 60 102Z";
    return (
        <>
            <path d="M60 106L48 104M180 106L192 104" stroke="#8E77E6" strokeWidth="11" strokeLinecap="round" />
            <path d={glass} fill="#FFB866" fillOpacity="0.55" stroke="#3A3546" strokeWidth="5" strokeLinejoin="round" />
            <path d="M68 100Q120 94 172 100" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" fill="none" />
            {gloss("M76 110L90 98M84 120L100 104", 3, 0.6)}
        </>
    );
}


/** Naočare za plivanje: mala okrugla stakla i traka */
function swimGoggles(): ReactNode {
    return (
        <>
            <path d="M74 112L50 106M166 112L190 106" stroke="#3BB2A0" strokeWidth="7" strokeLinecap="round" />
            <ellipse cx={EYE_LX} cy={EYE_Y} rx="21" ry="18" fill="#7ED6F2" fillOpacity="0.4" stroke="#3BB2A0" strokeWidth="6" />
            <ellipse cx={EYE_RX} cy={EYE_Y} rx="21" ry="18" fill="#7ED6F2" fillOpacity="0.4" stroke="#3BB2A0" strokeWidth="6" />
            <path d="M113 112Q120 106 127 112" stroke="#3BB2A0" strokeWidth="5" strokeLinecap="round" fill="none" />
            {gloss(`M${EYE_LX - 12} ${EYE_Y - 7}l8-5M${EYE_RX - 12} ${EYE_Y - 7}l8-5`, 3, 0.8)}
        </>
    );
}

/** Pilotske naočare: kožna traka i okrugla stakla sa mesinganim okvirom */
function aviatorGoggles(): ReactNode {
    return (
        <>
            <path d="M68 108L46 104M172 108L194 104" stroke="#9A6236" strokeWidth="10" strokeLinecap="round" />
            <circle cx={EYE_LX} cy={EYE_Y} r="23" fill="#9A6236" />
            <circle cx={EYE_RX} cy={EYE_Y} r="23" fill="#9A6236" />
            <circle cx={EYE_LX} cy={EYE_Y} r="18" fill="#BDEBFF" fillOpacity="0.4" stroke="#E2B256" strokeWidth="4" />
            <circle cx={EYE_RX} cy={EYE_Y} r="18" fill="#BDEBFF" fillOpacity="0.4" stroke="#E2B256" strokeWidth="4" />
            <path d="M114 110Q120 104 126 110" stroke="#9A6236" strokeWidth="7" strokeLinecap="round" fill="none" />
            {gloss(`M${EYE_LX - 10} ${EYE_Y - 8}l7-4M${EYE_RX - 10} ${EYE_Y - 8}l7-4`, 3, 0.8)}
        </>
    );
}

const glasses = itemsFor("glasses");

export const GLASSES = [
    glasses("naocare", "Naočare", 4, () => roundGlasses()),
    glasses("roze-naocare", "Roze naočare", 4, () => roundGlasses("#E0457A")),
    glasses("zute-naocare", "Žute naočare", 4, () => roundGlasses("#F2A516")),
    glasses("cetvrtaste-naocare", "Četvrtaste naočare", 5, squareGlasses),
    glasses("suncane-naocare", "Sunčane naočare", 6, () => sunglasses()),
    glasses("plave-suncane-naocare", "Plave sunčane naočare", 6, () => sunglasses("#3D7BE0", "#2C3E6E")),
    glasses("sarene-naocare", "Šarene naočare", 7, rainbowGlasses),
    glasses("naocare-srca", "Naočare srca", 8, heartGlasses),
    glasses("naocare-zvezde", "Naočare zvezde", 9, starGlasses),
    glasses("naocare-cvetici", "Naočare cvetići", 9, flowerGlasses),
    glasses("plivacke-naocare", "Naočare za plivanje", 8, swimGoggles),
    glasses("skijaske-naocare", "Skijaške naočare", 10, skiGoggles),
    glasses("pilotske-naocare", "Pilotske naočare", 11, aviatorGoggles),
    glasses("maska-superheroja", "Maska superheroja", 12, heroMask),
    glasses("ronilacka-maska", "Ronilačka maska", 14, divingMask),
    glasses("maska-leptira", "Maska leptira", 16, butterflyMask),
];
