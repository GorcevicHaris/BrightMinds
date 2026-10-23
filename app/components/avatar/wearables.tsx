// Predmeti koje dete kupuje novčićima i oblači svom drugaru (učitelju ili životinji).
// Svaki predmet je crtež u zajedničkom koordinatnom sistemu 240 × 280 (geometry.ts),
// pa pristaje svakom liku. Stil: veseo, ravne boje sa blagom senkom i sjajem.
//
// Namerno bez "use client", bez hook-ova i bez uvoza klijentskih modula: katalog
// uvoze i API rute (provera kupovine). Crteži su čiste funkcije koje vraćaju SVG.
// Bez gradijenata sa id-jem: isti predmet može biti na više likova na istom ekranu.

import type { ReactNode } from "react";
import { EYE_LX, EYE_RX, EYE_Y, TORSO_PATH } from "./geometry";

export type WearSlot = "hat" | "glasses" | "neck" | "outfit";

export const WEAR_SLOTS: readonly WearSlot[] = ["hat", "glasses", "neck", "outfit"];

export interface WearItem {
    id: string;
    slot: WearSlot;
    /** Naziv za dete (srpski, latinica) */
    label: string;
    /** Cena u novčićima (3–15) */
    price: number;
    /** SVG elementi u zajedničkom sistemu 240 × 280 */
    render: () => ReactNode;
    /** Odeća: boja rukava kad lik podigne ruku (inače se vidi boja lika) */
    sleeve?: string;
}

/** Oprema po mestu: id predmeta koji je obučen */
export type Wear = Partial<Record<WearSlot, string>>;

// ── Pomoćni crteži ────────────────────────────────────────────────────────────

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Zvezda sa pet krakova, vrh nagore */
function starPath(cx: number, cy: number, outer: number, inner: number): string {
    const points: string[] = [];
    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        points.push(`${r1(cx + radius * Math.cos(angle))} ${r1(cy + radius * Math.sin(angle))}`);
    }
    return `M${points.join("L")}Z`;
}

/** Srce sa vrhom dole; (cx, cy) je sredina, `s` veličina */
function heartPath(cx: number, cy: number, s: number): string {
    const p = (x: number, y: number) => `${r1(cx + x * s)} ${r1(cy + y * s)}`;
    return `M${p(0, 1)}C${p(-1.3, 0.2)} ${p(-1.05, -1.05)} ${p(-0.5, -1)}C${p(-0.2, -0.98)} ${p(0, -0.75)} ${p(0, -0.55)}C${p(0, -0.75)} ${p(0.2, -0.98)} ${p(0.5, -1)}C${p(1.05, -1.05)} ${p(1.3, 0.2)} ${p(0, 1)}Z`;
}

function flower(x: number, y: number, petal: string, size = 1): ReactNode {
    const d = 5.2 * size;
    return (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((deg) => (
                <circle
                    key={deg}
                    cx={r1(Math.cos(((deg - 90) * Math.PI) / 180) * d)}
                    cy={r1(Math.sin(((deg - 90) * Math.PI) / 180) * d)}
                    r={r1(5.2 * size)}
                    fill={petal}
                />
            ))}
            <circle r={r1(3.6 * size)} fill="#FFC83D" />
            <circle cx={-1.2 * size} cy={-1.2 * size} r={1.3 * size} fill="#fff" opacity="0.7" />
        </g>
    );
}

/** Blag sjaj sleva odozgo i senka ispod vrata — kao na telu likova */
function torsoLight(): ReactNode {
    return (
        <>
            <ellipse cx="76" cy="234" rx="40" ry="17" fill="#fff" opacity="0.16" />
            <ellipse cx="120" cy="214" rx="56" ry="15" fill="#1D1030" opacity="0.12" />
        </>
    );
}

const mirror = (d: string) =>
    // Ogledalo oko x = 120; putanja sme da ima samo apsolutne parove „x y” (bez H/V/h/v)
    d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${r1(240 - Number(x))} ${y}`);

// ── Kape (na glavi, preko kose i ušiju) ──────────────────────────────────────

function cap(): ReactNode {
    return (
        <>
            <path d="M58 62C58 4 182 4 182 62Z" fill="#3D7BE0" />
            <path d="M120 19V58M94 25Q86 40 84 58M146 25Q154 40 156 58" stroke="#2C5DB0" strokeWidth="3" strokeLinecap="round" opacity="0.55" fill="none" />
            <path d="M74 46Q84 28 106 22" stroke="#fff" strokeOpacity="0.35" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="120" cy="19" r="5" fill="#2C5DB0" />
            <path d={starPath(120, 42, 9, 4)} fill="#FFD15C" />
            <path d="M52 62Q120 46 188 62Q194 71 182 73Q120 58 58 73Q46 71 52 62Z" fill="#2C5DB0" />
            <path d="M64 64Q120 52 176 64" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
    );
}

function sunHat(): ReactNode {
    return (
        <>
            <ellipse cx="120" cy="57" rx="94" ry="15" fill="#E2B256" />
            <ellipse cx="120" cy="54" rx="84" ry="11" fill="#F6D58A" />
            <path d="M76 58C74 8 166 8 164 58Q120 66 76 58Z" fill="#F8DC98" />
            <path d="M76 44Q120 53 164 44L165 56Q120 65 75 56Z" fill="#F07C9A" />
            <path d="M88 30Q98 18 116 16" stroke="#fff" strokeOpacity="0.45" strokeWidth="6" strokeLinecap="round" fill="none" />
            {flower(150, 50, "#fff", 1)}
            <ellipse cx="120" cy="66" rx="86" ry="5" fill="#B9872F" opacity="0.25" />
        </>
    );
}

function topHat(): ReactNode {
    return (
        <>
            <ellipse cx="120" cy="59" rx="64" ry="11" fill="#2A2733" />
            <path d="M82 57L86 8Q120 2 154 8L158 57Q120 65 82 57Z" fill="#3A3546" />
            <ellipse cx="120" cy="8" rx="34" ry="5" fill="#514A60" />
            <path d="M84 40Q120 47 156 40L157 53Q120 60 83 53Z" fill="#E5484D" />
            <path d="M97 14L95 36" stroke="#fff" strokeOpacity="0.2" strokeWidth="7" strokeLinecap="round" />
            <path d="M66 58Q120 72 174 58" stroke="#fff" strokeOpacity="0.14" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
    );
}

function crown(): ReactNode {
    return (
        <>
            <path d="M78 64L73 24L97 42L120 12L143 42L167 24L162 64Q120 72 78 64Z" fill="#FFC83D" stroke="#E9A10E" strokeWidth="3" strokeLinejoin="round" />
            <path d="M120 12L143 42L167 24L162 64Q140 68 120 68Z" fill="#E9A10E" opacity="0.28" />
            <path d="M78 64Q120 72 162 64L163 52Q120 60 77 52Z" fill="#F2AE1C" />
            <circle cx="73" cy="24" r="5" fill="#FFE08A" />
            <circle cx="120" cy="12" r="5.5" fill="#FFE08A" />
            <circle cx="167" cy="24" r="5" fill="#FFE08A" />
            <circle cx="120" cy="59" r="5.5" fill="#E5484D" />
            <circle cx="98" cy="58" r="4" fill="#3D9BE9" />
            <circle cx="142" cy="58" r="4" fill="#3BB273" />
            <circle cx="118.5" cy="57.5" r="1.8" fill="#fff" opacity="0.8" />
            <path d="M82 50L79 32" stroke="#fff" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
        </>
    );
}

function hairBow(): ReactNode {
    return (
        <g transform="translate(150 44) rotate(14)">
            <path d="M-3 4L-15 26L-7 23L-3 29L3 5Z" fill="#E0457A" />
            <path d="M3 4L15 26L7 23L3 29L-3 5Z" fill="#E0457A" />
            <path d="M0 0C-10-19-36-21-36-2C-36 15-12 15 0 0Z" fill="#F45B8D" />
            <path d="M0 0C10-19 36-21 36-2C36 15 12 15 0 0Z" fill="#F45B8D" />
            <path d="M-6-2C-14-10-26-12-29-4M6-2C14-10 26-12 29-4" stroke="#C93366" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="-22" cy="2" r="2.4" fill="#fff" opacity="0.75" />
            <circle cx="-14" cy="-8" r="2" fill="#fff" opacity="0.75" />
            <circle cx="22" cy="2" r="2.4" fill="#fff" opacity="0.75" />
            <circle cx="14" cy="-8" r="2" fill="#fff" opacity="0.75" />
            <ellipse rx="8" ry="9" fill="#E0457A" />
            <ellipse cx="-2" cy="-3" rx="3" ry="2.4" fill="#fff" opacity="0.45" />
        </g>
    );
}

function flowerCrown(): ReactNode {
    return (
        <>
            <path d="M58 86Q70 54 96 47Q120 40 144 47Q170 54 182 86" stroke="#4FAE5E" strokeWidth="5" strokeLinecap="round" fill="none" />
            {[
                [74, 61, -40],
                [110, 42, -10],
                [130, 42, 10],
                [166, 61, 40],
            ].map(([x, y, deg]) => (
                <ellipse key={x} cx={x} cy={y} rx="7" ry="3.6" fill="#6CC46F" transform={`rotate(${deg} ${x} ${y})`} />
            ))}
            {flower(64, 76, "#F78FB3", 1)}
            {flower(84, 52, "#FFD15C", 0.95)}
            {flower(102, 45, "#B9A2F2", 0.95)}
            {flower(120, 42, "#F78FB3", 1.15)}
            {flower(138, 45, "#B9A2F2", 0.95)}
            {flower(156, 52, "#FFD15C", 0.95)}
            {flower(176, 76, "#F78FB3", 1)}
        </>
    );
}

// ── Naočare (preko očiju) ─────────────────────────────────────────────────────

function roundGlasses(): ReactNode {
    return (
        <>
            <g fill="none" stroke="#3B4A8C" strokeWidth="4.5" strokeLinecap="round">
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

function sunglasses(): ReactNode {
    return (
        <>
            <path d={`M66 104L54 100M174 104L186 100`} stroke="#E5484D" strokeWidth="4.5" strokeLinecap="round" />
            <path d={SUN_LENS} fill="#1F2937" fillOpacity="0.88" stroke="#E5484D" strokeWidth="4.5" strokeLinejoin="round" />
            <path d={mirror(SUN_LENS)} fill="#1F2937" fillOpacity="0.88" stroke="#E5484D" strokeWidth="4.5" strokeLinejoin="round" />
            <path d="M115 104Q120 99 125 104" stroke="#E5484D" strokeWidth="4.5" strokeLinecap="round" fill="none" />
            <path d="M78 108L86 102M80 118L96 104M134 108L142 102M136 118L152 104" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
        </>
    );
}

// ── Oko vrata ─────────────────────────────────────────────────────────────────

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

// ── Odeća (preko tela, ispod vrata) ───────────────────────────────────────────

function suit(): ReactNode {
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

function heartSweater(): ReactNode {
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

function superCape(): ReactNode {
    return (
        <>
            <path d={CAPE} fill="#E5484D" />
            <path d={mirror(CAPE)} fill="#E5484D" />
            <path d="M92 216Q66 246 62 284H74Q76 248 98 220Z" fill="#B8323A" opacity="0.8" />
            <path d="M148 216Q174 246 178 284H166Q164 248 142 220Z" fill="#B8323A" opacity="0.8" />
            <path d="M44 236Q60 216 90 210" stroke="#fff" strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M120 228L141 240L120 268L99 240Z" fill="#FFC83D" stroke="#E9A10E" strokeWidth="3" strokeLinejoin="round" />
            <path d="M124 234L112 250H120L116 262L130 245H122Z" fill="#E5484D" />
            <circle cx="96" cy="211" r="6.5" fill="#FFC83D" stroke="#E9A10E" strokeWidth="2" />
            <circle cx="144" cy="211" r="6.5" fill="#FFC83D" stroke="#E9A10E" strokeWidth="2" />
        </>
    );
}

function starTee(): ReactNode {
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

// ── Katalog ───────────────────────────────────────────────────────────────────

export const WEAR_ITEMS: readonly WearItem[] = [
    { id: "kapa", slot: "hat", label: "Kapa", price: 4, render: cap },
    { id: "sesir", slot: "hat", label: "Šešir", price: 5, render: sunHat },
    { id: "masna", slot: "hat", label: "Mašna", price: 3, render: hairBow },
    { id: "cvetni-venac", slot: "hat", label: "Cvetni venac", price: 6, render: flowerCrown },
    { id: "cilindar", slot: "hat", label: "Cilindar", price: 8, render: topHat },
    { id: "kruna", slot: "hat", label: "Kruna", price: 12, render: crown },
    { id: "naocare", slot: "glasses", label: "Naočare", price: 4, render: roundGlasses },
    { id: "suncane-naocare", slot: "glasses", label: "Sunčane naočare", price: 6, render: sunglasses },
    { id: "leptir-masna", slot: "neck", label: "Leptir-mašna", price: 3, render: bowTie },
    { id: "sal", slot: "neck", label: "Šal", price: 5, render: scarf },
    { id: "ogrlica-zvezda", slot: "neck", label: "Ogrlica sa zvezdom", price: 7, render: starMedal },
    { id: "majica-zvezda", slot: "outfit", label: "Majica sa zvezdom", price: 6, render: starTee, sleeve: "#7258C9" },
    { id: "dzemper-srce", slot: "outfit", label: "Džemper sa srcem", price: 8, render: heartSweater, sleeve: "#3E9970" },
    { id: "odelo", slot: "outfit", label: "Odelo sa kravatom", price: 12, render: suit, sleeve: "#26325E" },
    { id: "super-ogrtac", slot: "outfit", label: "Super-ogrtač", price: 15, render: superCape, sleeve: "#C93A3F" },
];

const BY_ID = new Map(WEAR_ITEMS.map((item) => [item.id, item]));

export function getWearItem(id: string): WearItem | undefined {
    return BY_ID.get(id);
}

/** Predmet obučen na tom mestu (nepoznat id ili predmet za drugo mesto se ne crta) */
export function wornItem(wear: Wear | undefined, slot: WearSlot): WearItem | undefined {
    const id = wear?.[slot];
    const item = id ? getWearItem(id) : undefined;
    return item?.slot === slot ? item : undefined;
}

/** Crtež predmeta na tom mestu, ili ništa */
export function renderWorn(wear: Wear | undefined, slot: WearSlot): ReactNode {
    const item = wornItem(wear, slot);
    return item ? <g data-wear={item.id}>{item.render()}</g> : null;
}
