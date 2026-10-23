/* eslint-disable react/display-name -- crteži su čiste funkcije koje vraćaju SVG, nisu komponente */
// Kape, šeširi, krune i trake: na glavi, preko kose i ušiju (y ≈ 4–75, sredina x = 120).
// Glava životinje je krug (120, 110) r 66, a kosa učitelja ide do y 24, pa kape pokrivaju
// oba oblika; uši zeke i mačke slobodno vire iznad kape.

import type { ReactNode } from "react";
import type { CompanionKind } from "../companions";
import type { WearVariant } from "../wearables";
import { flower, gloss, itemsFor, mirror, sparkle, starPath } from "./art";

// ── Postojeći predmeti (crtež se ne menja) ───────────────────────────────────

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

// ── Novi predmeti ─────────────────────────────────────────────────────────────

/** Kupola kape od uha do uha (pokriva kosu učitelja i vrh glave životinje) */
const DOME = "M54 72C50 0 190 0 186 72Z";

/** Kapa sa šiltom okrenutim u stranu */
function sideCap(color: string, shade: string, dark: string): () => ReactNode {
    return () => (
        <>
            <path d="M58 64C58 6 182 6 182 64Z" fill={color} />
            <path d="M120 20V60M94 26Q86 42 84 60M146 26Q154 42 156 60" stroke={shade} strokeWidth="3" strokeLinecap="round" opacity="0.5" fill="none" />
            {gloss("M74 46Q84 30 104 23", 7, 0.35)}
            <circle cx="120" cy="20" r="5" fill={shade} />
            <circle cx="120" cy="44" r="11" fill="#fff" />
            <path d={starPath(120, 44, 7.5, 3.4)} fill={dark} />
            <path d="M150 58Q192 48 214 60Q216 70 202 72Q176 72 154 68Z" fill={shade} />
            {gloss("M160 60Q186 54 206 60", 3, 0.3)}
            <path d="M56 64Q120 54 184 64L184 70Q120 61 56 70Z" fill={shade} />
        </>
    );
}

/** Zimska kapa sa kićankom */
function beanie(color: string, rib: string, cuff: string, cuffRib: string): () => ReactNode {
    return () => (
        <>
            <path d={DOME} fill={color} />
            <path d="M84 20Q74 40 72 60M104 12Q98 36 98 60M136 12Q142 36 142 60M156 20Q166 40 168 60" stroke={rib} strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.6" />
            {gloss("M72 46Q80 26 102 16", 7, 0.3)}
            <rect x="50" y="56" width="140" height="22" rx="11" fill={cuff} />
            <path d="M64 60V74M78 60V74M92 60V74M106 60V74M120 60V74M134 60V74M148 60V74M162 60V74M176 60V74" stroke={cuffRib} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
            <circle cx="120" cy="10" r="15" fill="#fff" />
            <circle cx="111" cy="6" r="6" fill="#fff" />
            <circle cx="129" cy="4" r="6" fill="#fff" />
            <circle cx="120" cy="14" r="13" fill="#F1F5F9" opacity="0.6" />
            <circle cx="114" cy="5" r="3.5" fill="#fff" />
        </>
    );
}

/** Kapa sa okruglim ušima mede */
function bearHat(): ReactNode {
    return (
        <>
            <circle cx="68" cy="30" r="20" fill="#A8703F" />
            <circle cx="172" cy="30" r="20" fill="#A8703F" />
            <circle cx="69" cy="31" r="10" fill="#F1CBA4" />
            <circle cx="171" cy="31" r="10" fill="#F1CBA4" />
            <path d={DOME} fill="#BC8656" />
            {gloss("M72 46Q80 26 102 16", 7, 0.3)}
            <rect x="50" y="58" width="140" height="18" rx="9" fill="#8A5A30" />
            <path d={starPath(120, 38, 8, 3.6)} fill="#FFD15C" />
        </>
    );
}

/** Piratski šešir: bez lobanje, sa zlatnom ivicom i perom */
function pirateHat(): ReactNode {
    const brim = "M34 70Q46 18 120 14Q194 18 206 70Q170 52 120 56Q70 52 34 70Z";
    return (
        <>
            <path d="M70 52Q76 4 120 2Q164 4 170 52Z" fill="#2E3A66" />
            <path d={brim} fill="#3A4A80" stroke="#FFC83D" strokeWidth="4" strokeLinejoin="round" />
            {gloss("M52 56Q70 30 104 24", 5, 0.3)}
            <path d="M148 22Q182 0 196 14Q178 16 160 34Z" fill="#F78FB3" />
            <path d="M152 28Q174 12 190 14" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" fill="none" />
            <circle cx="120" cy="38" r="12" fill="#FFC83D" />
            <path d={starPath(120, 38, 8, 3.6)} fill="#fff" />
        </>
    );
}

/** Kuvarska kapa */
function chefHat(): ReactNode {
    return (
        <>
            <circle cx="88" cy="28" r="22" fill="#fff" />
            <circle cx="152" cy="28" r="22" fill="#fff" />
            <circle cx="120" cy="16" r="26" fill="#fff" />
            <path d="M74 36H166L162 62H78Z" fill="#fff" />
            <path d="M96 30Q100 44 98 60M144 30Q140 44 142 60" stroke="#D5DCE6" strokeWidth="3" strokeLinecap="round" fill="none" />
            <rect x="72" y="52" width="96" height="20" rx="6" fill="#EEF2F7" stroke="#D5DCE6" strokeWidth="2" />
            {gloss("M76 22Q84 10 98 8", 5, 0.9)}
        </>
    );
}

/** Vatrogasni šlem (crven, sa zlatnim znakom) */
function fireHelmet(): ReactNode {
    return (
        <>
            <path d="M38 70Q120 40 202 70Q206 80 194 80Q120 60 46 80Q34 80 38 70Z" fill="#B8323A" />
            <path d="M58 68C56 4 184 4 182 68Q120 56 58 68Z" fill="#E5484D" />
            <path d="M120 10V58" stroke="#C53035" strokeWidth="9" strokeLinecap="round" />
            {gloss("M72 50Q78 28 98 18", 7, 0.35)}
            <path d="M104 26H136L134 48Q120 56 106 48Z" fill="#FFC83D" stroke="#E9A10E" strokeWidth="2.5" strokeLinejoin="round" />
            <path d={starPath(120, 38, 7, 3.2)} fill="#E5484D" />
        </>
    );
}

/** Astronautski šlem: providna kugla, lice se vidi */
function spaceHelmet(_variant?: WearVariant, kind?: CompanionKind): ReactNode {
    // Zeka ima duge uši: kugla je kod nje malo viša
    const tall = kind === "bunny";
    const ry = tall ? 112 : 100;
    const cy = tall ? 98 : 104;
    return (
        <>
            <ellipse cx="120" cy={cy} rx="104" ry={ry} fill="#CFE8FF" fillOpacity="0.18" stroke="#EEF2F7" strokeWidth="8" />
            <ellipse cx="120" cy={cy} rx="108" ry={ry + 4} fill="none" stroke="#AEB9C9" strokeWidth="2" />
            {gloss(`M34 ${cy - 20}Q46 ${cy - ry + 30} 100 ${cy - ry + 12}`, 9, 0.55)}
            {gloss(`M196 ${cy + 24}Q202 ${cy + 4} 200 ${cy - 10}`, 5, 0.4)}
            <path d={`M182 ${cy - ry + 18}L194 ${cy - ry - 2}`} stroke="#AEB9C9" strokeWidth="4" strokeLinecap="round" />
            <circle cx="195" cy={cy - ry - 4} r="6" fill="#F45B8D" />
            <path d="M44 178Q120 236 196 178L204 192Q120 254 36 192Z" fill="#F2F5FA" stroke="#C7D0DD" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="70" cy="200" r="4" fill="#3D9BE9" />
            <circle cx="170" cy="200" r="4" fill="#FFC83D" />
        </>
    );
}

/** Tijara: tanka, srebrna, sa ružičastim kamenom */
function tiara(): ReactNode {
    const arc = "M74 70Q78 50 92 46Q104 44 108 34Q114 22 120 18Q126 22 132 34Q136 44 148 46Q162 50 166 70";
    return (
        <>
            <path d="M68 74Q120 50 172 74" stroke="#C7D0DD" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d={arc} stroke="#DDE4EE" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d={arc} stroke="#fff" strokeOpacity="0.8" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M120 22L128 36L120 48L112 36Z" fill="#F45B8D" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="94" cy="52" r="5" fill="#B9A2F2" />
            <circle cx="146" cy="52" r="5" fill="#B9A2F2" />
            <circle cx="80" cy="64" r="3.5" fill="#7ED6F2" />
            <circle cx="160" cy="64" r="3.5" fill="#7ED6F2" />
            {sparkle(102, 24, 6)}
            {sparkle(142, 20, 5)}
        </>
    );
}

/** Traka sa ušima (zeka) */
function bunnyBand(): ReactNode {
    const ear = "M84 54Q66 2 80 -8Q96 -12 100 50Z";
    const inner = "M88 48Q76 10 84 2Q92 4 94 46Z";
    return (
        <>
            <path d={ear} fill="#fff" stroke="#E6DDEF" strokeWidth="2" />
            <path d={mirror(ear)} fill="#fff" stroke="#E6DDEF" strokeWidth="2" />
            <path d={inner} fill="#F9B9C9" />
            <path d={mirror(inner)} fill="#F9B9C9" />
            <path d="M56 84Q60 44 120 40Q180 44 184 84" stroke="#F45B8D" strokeWidth="8" strokeLinecap="round" fill="none" />
            {gloss("M68 64Q80 48 104 44", 2.5, 0.6)}
        </>
    );
}

/** Rog jednoroga na traci, sa cvetićima */
function unicornHorn(): ReactNode {
    return (
        <>
            <path d="M56 84Q60 44 120 40Q180 44 184 84" stroke="#B9A2F2" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M106 46L122 -14L136 46Q120 54 106 46Z" fill="#FFD15C" stroke="#F2A516" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M110 34L132 26M113 20L129 13M116 6L126 1" stroke="#F2A516" strokeWidth="3" strokeLinecap="round" />
            {gloss("M112 40L120 4", 3, 0.6)}
            {flower(88, 48, "#F78FB3", 0.9)}
            {flower(152, 48, "#7ED6F2", 0.9)}
            {flower(72, 60, "#B9A2F2", 0.7)}
            {flower(168, 60, "#F78FB3", 0.7)}
        </>
    );
}

/** Šešir čarobnjaka sa zvezdama */
function wizardHat(): ReactNode {
    return (
        <>
            <path d="M70 62Q94 20 116 -6Q128 -20 150 -16Q138 -8 140 10Q150 40 170 62Z" fill="#6C55C9" />
            <path d="M140 10Q150 40 170 62H150Q140 36 138 8Z" fill="#5641A8" opacity="0.6" />
            {gloss("M92 44Q104 20 118 4", 6, 0.3)}
            <circle cx="152" cy="-16" r="6" fill="#FFD15C" />
            <path d={starPath(112, 34, 8, 3.6)} fill="#FFD15C" />
            <path d={starPath(134, 16, 5.5, 2.4)} fill="#FFE08A" />
            <circle cx="140" cy="44" r="3" fill="#FFE08A" />
            <circle cx="98" cy="54" r="2.4" fill="#FFE08A" />
            <ellipse cx="120" cy="64" rx="76" ry="12" fill="#5641A8" />
            <path d="M52 62Q120 50 188 62" stroke="#FFD15C" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
    );
}

/** Kaciga za bicikl */
function bikeHelmet(): ReactNode {
    return (
        <>
            <path d="M52 76C46 8 194 8 188 76Q120 62 52 76Z" fill="#3BB273" />
            <path d="M84 24Q96 34 98 56M120 16V56M156 24Q144 34 142 56" stroke="#2A8E57" strokeWidth="8" strokeLinecap="round" fill="none" />
            <path d="M84 24Q96 34 98 56M120 16V56M156 24Q144 34 142 56" stroke="#1F6B41" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.5" />
            {gloss("M66 54Q72 32 92 20", 6, 0.4)}
            <path d="M50 74Q120 58 190 74L190 80Q120 66 50 80Z" fill="#FFC83D" />
            <circle cx="66" cy="60" r="4" fill="#fff" opacity="0.8" />
        </>
    );
}

/** Kaubojski šešir */
function cowboyHat(): ReactNode {
    return (
        <>
            <path d="M28 52Q40 72 120 70Q200 72 212 52Q214 66 200 76Q120 92 40 76Q26 66 28 52Z" fill="#9A6236" />
            <path d="M76 64Q72 14 96 10Q108 18 120 12Q132 18 144 10Q168 14 164 64Q120 72 76 64Z" fill="#B8783F" />
            <path d="M120 14Q116 34 120 52" stroke="#8A5530" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
            <path d="M77 52Q120 60 163 52L164 62Q120 70 76 62Z" fill="#E5484D" />
            <path d={starPath(144, 57, 5, 2.2)} fill="#FFD15C" />
            {gloss("M86 46Q86 26 96 16", 5, 0.3)}
        </>
    );
}

/** Kapa žabica sa očima na vrhu */
function frogHat(): ReactNode {
    return (
        <>
            <path d={DOME} fill="#6CC46F" />
            <circle cx="88" cy="18" r="17" fill="#6CC46F" />
            <circle cx="152" cy="18" r="17" fill="#6CC46F" />
            <circle cx="88" cy="17" r="11" fill="#fff" />
            <circle cx="152" cy="17" r="11" fill="#fff" />
            <circle cx="89" cy="19" r="6" fill="#2A1D18" />
            <circle cx="151" cy="19" r="6" fill="#2A1D18" />
            <circle cx="87" cy="16" r="2" fill="#fff" />
            <circle cx="149" cy="16" r="2" fill="#fff" />
            <path d="M100 48Q120 60 140 48" stroke="#3E9950" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="92" cy="46" r="5" fill="#F78FB3" opacity="0.6" />
            <circle cx="148" cy="46" r="5" fill="#F78FB3" opacity="0.6" />
            <rect x="50" y="62" width="140" height="14" rx="7" fill="#4FAE5E" />
        </>
    );
}

/** Rođendanska kapa (kupa sa tufnama), malo nakrivljena */
function partyHat(): ReactNode {
    return (
        <g transform="rotate(12 120 64)">
            <path d="M88 64L120 -8L152 64Q120 72 88 64Z" fill="#7ED6F2" />
            <path d="M120 -8L152 64Q138 68 126 68Z" fill="#4FB7DD" opacity="0.6" />
            <circle cx="112" cy="40" r="5" fill="#F45B8D" />
            <circle cx="132" cy="26" r="4" fill="#FFD15C" />
            <circle cx="124" cy="52" r="4.5" fill="#B9A2F2" />
            <circle cx="114" cy="16" r="3.5" fill="#FFD15C" />
            <path d="M88 64Q120 72 152 64" stroke="#F45B8D" strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="120" cy="-10" r="8" fill="#FFD15C" />
            <circle cx="117" cy="-13" r="2.6" fill="#fff" opacity="0.8" />
        </g>
    );
}

/** Traka sa antenama (bubamara / pčelica) */
function antennae(): ReactNode {
    return (
        <>
            <path d="M104 44Q96 14 80 2M136 44Q144 14 160 2" stroke="#3A3546" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M56 84Q60 44 120 40Q180 44 184 84" stroke="#3A3546" strokeWidth="8" strokeLinecap="round" fill="none" />
            <circle cx="78" cy="2" r="9" fill="#F45B8D" />
            <circle cx="162" cy="2" r="9" fill="#FFD15C" />
            <circle cx="75" cy="-1" r="3" fill="#fff" opacity="0.7" />
            <circle cx="159" cy="-1" r="3" fill="#fff" opacity="0.7" />
        </>
    );
}

/** Cvetna traka za kosu (mala, sa jednim velikim cvetom) */
function flowerClip(): ReactNode {
    return (
        <>
            <path d="M56 84Q60 44 120 40Q180 44 184 84" stroke="#FFB8CB" strokeWidth="7" strokeLinecap="round" fill="none" />
            <g transform="translate(150 46)">
                {[0, 60, 120, 180, 240, 300].map((deg) => (
                    <ellipse key={deg} cx="0" cy="-11" rx="7" ry="11" fill="#FFD15C" transform={`rotate(${deg})`} />
                ))}
                <circle r="7" fill="#F2A516" />
                <circle cx="-2" cy="-2" r="2.4" fill="#fff" opacity="0.7" />
            </g>
        </>
    );
}

/** Crvena kapa sa belim krznom i kićankom koja pada u stranu */
function winterElfHat(): ReactNode {
    return (
        <>
            <path d="M54 70Q56 10 120 6Q178 6 204 84Q188 60 176 50Q182 60 186 70Z" fill="#E5484D" />
            {gloss("M76 50Q84 24 110 16", 6, 0.3)}
            <rect x="50" y="56" width="140" height="22" rx="11" fill="#fff" />
            <circle cx="204" cy="86" r="12" fill="#fff" />
            <circle cx="200" cy="82" r="4" fill="#F1F5F9" />
        </>
    );
}

/** Mornarska kapa: bela, okrugla, sa plavom trakom */
function sailorCap(): ReactNode {
    return (
        <>
            <path d="M66 64Q62 30 120 28Q178 30 174 64Z" fill="#fff" />
            <ellipse cx="120" cy="34" rx="58" ry="12" fill="#F2F5FA" stroke="#DDE4EE" strokeWidth="2" />
            <path d="M66 54Q120 64 174 54L174 66Q120 76 66 66Z" fill="#2C5DB0" />
            <path d="M174 60Q186 70 182 86M172 62Q178 76 172 90" stroke="#2C5DB0" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="120" cy="46" r="7" fill="#FFC83D" />
        </>
    );
}

/** Slamnati šešir (farma) sa crvenom trakom */
function strawHat(): ReactNode {
    return (
        <>
            <ellipse cx="120" cy="60" rx="98" ry="16" fill="#E8C46A" />
            <path d="M34 60Q120 80 206 60" stroke="#C9A04A" strokeWidth="2.5" fill="none" />
            <path d="M78 60C76 14 164 14 162 60Q120 68 78 60Z" fill="#F2D27E" />
            <path d="M78 48Q120 56 162 48L162 58Q120 66 78 58Z" fill="#E5484D" />
            <path d="M92 26L96 46M108 20L110 44M124 20L124 44M140 22L138 44M152 30L150 46" stroke="#D6B05A" strokeWidth="2" strokeLinecap="round" />
            <path d="M40 54L50 58M190 54L180 58M64 70L70 66M176 70L170 66" stroke="#C9A04A" strokeWidth="2" strokeLinecap="round" />
        </>
    );
}

/** Kapa pilota sa zlatnim krilima */
function pilotCap(): ReactNode {
    return (
        <>
            <path d="M58 52Q56 18 120 16Q184 18 182 52Q120 60 58 52Z" fill="#2E3A66" />
            <ellipse cx="120" cy="30" rx="62" ry="13" fill="#3A4A80" />
            <path d="M62 52Q120 60 178 52L178 64Q120 72 62 64Z" fill="#1F2850" />
            <path d="M74 64Q120 82 166 64Q150 78 120 80Q90 78 74 64Z" fill="#14121A" />
            <path d="M98 40Q108 34 116 38Q120 34 124 38Q132 34 142 40Q132 44 124 42Q120 46 116 42Q108 44 98 40Z" fill="#FFC83D" />
            <circle cx="120" cy="40" r="3.5" fill="#E9A10E" />
        </>
    );
}

/** Šlem viteza, otvoren spreda, sa perom */
function knightHelmet(): ReactNode {
    return (
        <>
            <path d="M120 14Q128 -12 150 -18Q140 0 132 18Z" fill="#E5484D" />
            <path d="M52 92Q46 18 120 16Q194 18 188 92H172Q172 56 120 54Q68 56 68 92Z" fill="#C7D0DD" />
            <path d="M120 16V54" stroke="#9AA8BC" strokeWidth="6" strokeLinecap="round" />
            <path d="M68 92Q68 56 120 54Q172 56 172 92" stroke="#9AA8BC" strokeWidth="4" fill="none" />
            {gloss("M66 70Q66 36 96 24", 6, 0.5)}
            <circle cx="60" cy="80" r="3" fill="#9AA8BC" />
            <circle cx="180" cy="80" r="3" fill="#9AA8BC" />
        </>
    );
}

/** Kapa dinosaurusa: zelena, sa narandžastim krljuštima na vrhu */
function dinoHat(): ReactNode {
    return (
        <>
            <path d="M78 22L88 4L98 18L110 -2L122 14L134 -2L144 16L156 4L162 24Z" fill="#FF8A3D" />
            <path d={DOME} fill="#6CC46F" />
            {gloss("M72 46Q80 26 102 16", 7, 0.3)}
            <circle cx="84" cy="44" r="5" fill="#4FAE5E" />
            <circle cx="156" cy="40" r="6" fill="#4FAE5E" />
            <circle cx="120" cy="30" r="4" fill="#4FAE5E" />
            <path d="M50 66Q120 50 190 66L190 78H50Z" fill="#4FAE5E" />
            <path d="M58 78L64 68L70 78M170 78L176 68L182 78" fill="#fff" />
        </>
    );
}

/** Kapa sa propelerom */
function propellerCap(): ReactNode {
    return (
        <>
            <path d="M58 66C56 8 184 8 182 66Z" fill="#FFD15C" />
            <path d="M120 10Q180 12 182 66H120Z" fill="#3D9BE9" />
            <path d="M58 66Q60 12 120 10V66Z" fill="#F45B8D" />
            <path d="M120 10V66" stroke="#fff" strokeWidth="3" />
            <path d="M54 66Q120 56 186 66L186 72Q120 64 54 72Z" fill="#3BB273" />
            <rect x="117" y="-6" width="6" height="18" fill="#8C98AB" />
            <path d="M120 -6Q96 -16 80 -8Q96 0 120 -6Q144 4 160 -4Q144 -14 120 -6Z" fill="#E5484D" />
            <circle cx="120" cy="-6" r="4" fill="#FFD15C" />
        </>
    );
}

const hat = itemsFor("hat");

export const HATS = [
    hat("kapa", "Kapa", 4, cap),
    hat("sesir", "Šešir", 5, sunHat),
    hat("masna", "Mašna", 3, hairBow),
    hat("cvetni-venac", "Cvetni venac", 6, flowerCrown),
    hat("cilindar", "Cilindar", 8, topHat),
    hat("kruna", "Kruna", 12, crown),
    hat("rodjendanska-kapa", "Rođendanska kapa", 4, partyHat),
    hat("kapa-siltom", "Kapa sa šiltom", 5, sideCap("#E5484D", "#B8323A", "#3D7BE0")),
    hat("zelena-kapa-siltom", "Zelena kapa sa šiltom", 5, sideCap("#3BB273", "#2A8E57", "#F2A516")),
    hat("traka-zeka", "Traka sa ušima zeke", 5, bunnyBand),
    hat("traka-cvet", "Traka sa cvetom", 4, flowerClip),
    hat("antene", "Traka sa antenama", 6, antennae),
    hat("zimska-kapa", "Zimska kapa", 6, beanie("#4CB8C4", "#2F95A1", "#FFD15C", "#E9A10E")),
    hat("roze-zimska-kapa", "Roze zimska kapa", 6, beanie("#F78FB3", "#E0709A", "#fff", "#DDE4EE")),
    hat("mornarska-kapa", "Mornarska kapa", 7, sailorCap),
    hat("slamnati-sesir", "Slamnati šešir", 7, strawHat),
    hat("kuvarska-kapa", "Kuvarska kapa", 7, chefHat),
    hat("kapa-meda", "Kapa sa ušima mede", 8, bearHat),
    hat("kapa-patuljka", "Crvena kapa sa kićankom", 8, winterElfHat),
    hat("kaciga-bicikl", "Kaciga za bicikl", 9, bikeHelmet),
    hat("kapa-propeler", "Kapa sa propelerom", 9, propellerCap),
    hat("kapa-pilota", "Kapa pilota", 11, pilotCap),
    hat("kapa-dino", "Kapa dinosaurusa", 12, dinoHat),
    hat("slem-viteza", "Šlem viteza", 16, knightHelmet),
    hat("kapa-zabica", "Kapa žabica", 10, frogHat),
    hat("piratski-sesir", "Piratski šešir", 10, pirateHat),
    hat("kaubojski-sesir", "Kaubojski šešir", 12, cowboyHat),
    hat("vatrogasni-slem", "Vatrogasni šlem", 14, fireHelmet),
    hat("tijara", "Tijara", 15, tiara),
    hat("rog-jednoroga", "Rog jednoroga", 18, unicornHorn),
    hat("sesir-carobnjaka", "Šešir čarobnjaka", 20, wizardHat),
    hat("astronautski-slem", "Astronautski šlem", 30, spaceHelmet),
];
