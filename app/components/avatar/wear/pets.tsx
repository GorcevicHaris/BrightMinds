/* eslint-disable react/display-name -- crteži su čiste funkcije koje vraćaju SVG, nisu komponente */
// Ljubimci: samo na celom liku, stoje na tlu levo od drugara (geometry.ts PET_X, GROUND_Y).
// Crtež je u sopstvenim koordinatama: (0, 0) je sredina na tlu, gore je negativno y,
// širina oko x −40 … 40. Lica su mirna i vesela (velike oči, mali osmeh).

import type { ReactNode } from "react";
import { dotEye, itemsFor, smile } from "./art";

const shadow = (rx = 30) => <ellipse cy="1" rx={rx} ry="4" fill="#1D1030" opacity="0.12" />;
const cheeks = (x: number, y: number, r = 3.5) => (
    <>
        <circle cx={-x} cy={y} r={r} fill="#F58F8F" opacity="0.45" />
        <circle cx={x} cy={y} r={r} fill="#F58F8F" opacity="0.45" />
    </>
);

function kitten(): ReactNode {
    return (
        <>
            {shadow()}
            <path d="M18 -10Q40 -12 36 -34Q34 -42 30 -36Q32 -18 14 -18Z" fill="#F7B771" />
            <ellipse cy="-16" rx="20" ry="16" fill="#F7B771" />
            <ellipse cx="-8" cy="-2" rx="6" ry="4" fill="#FFE3BD" />
            <ellipse cx="8" cy="-2" rx="6" ry="4" fill="#FFE3BD" />
            <path d="M-18 -44L-16 -64L-4 -52ZM18 -44L16 -64L4 -52Z" fill="#F7B771" />
            <path d="M-15 -48L-14 -59L-8 -52ZM15 -48L14 -59L8 -52Z" fill="#F7A9B6" />
            <circle cy="-42" r="18" fill="#F7B771" />
            <ellipse cy="-36" rx="9" ry="6" fill="#FFF4E3" />
            {dotEye(-7, -45)}
            {dotEye(7, -45)}
            <path d="M-2 -40H2L0 -38Z" fill="#F08AA0" />
            {smile(0, -36, 3)}
            {cheeks(12, -38)}
            <path d="M-6 -56V-50M0 -58V-51M6 -56V-50" stroke="#D98C43" strokeWidth="2" strokeLinecap="round" />
        </>
    );
}

function puppy(): ReactNode {
    return (
        <>
            {shadow()}
            <path d="M18 -14Q32 -22 30 -34" stroke="#EDCB9C" strokeWidth="6" strokeLinecap="round" fill="none" />
            <ellipse cy="-16" rx="20" ry="16" fill="#EDCB9C" />
            <ellipse cx="-8" cy="-2" rx="6" ry="4" fill="#FFF2DC" />
            <ellipse cx="8" cy="-2" rx="6" ry="4" fill="#FFF2DC" />
            <circle cy="-42" r="18" fill="#EDCB9C" />
            <path d="M-14 -56Q-28 -56 -26 -36Q-24 -26 -16 -30Q-14 -44 -10 -54Z" fill="#B57B50" />
            <path d="M14 -56Q28 -56 26 -36Q24 -26 16 -30Q14 -44 10 -54Z" fill="#B57B50" />
            <ellipse cy="-35" rx="10" ry="7" fill="#FFF9EF" />
            {dotEye(-7, -46)}
            {dotEye(7, -46)}
            <ellipse cy="-39" rx="4" ry="3" fill="#3A2A2A" />
            {smile(0, -34, 3)}
            <path d="M-2 -32Q0 -26 3 -31" fill="#F27C92" />
            <path d="M-12 -24Q0 -20 12 -24" stroke="#E5484D" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cy="-21" r="2.6" fill="#FFC83D" />
        </>
    );
}

function bunny(): ReactNode {
    return (
        <>
            {shadow()}
            <circle cx="18" cy="-12" r="6" fill="#fff" />
            <ellipse cy="-16" rx="19" ry="16" fill="#F2EDF7" />
            <ellipse cx="-8" cy="-2" rx="7" ry="4" fill="#fff" />
            <ellipse cx="8" cy="-2" rx="7" ry="4" fill="#fff" />
            <ellipse cx="-8" cy="-66" rx="6" ry="17" fill="#F2EDF7" transform="rotate(-12 -8 -66)" />
            <ellipse cx="8" cy="-66" rx="6" ry="17" fill="#F2EDF7" transform="rotate(12 8 -66)" />
            <ellipse cx="-8" cy="-66" rx="3" ry="12" fill="#F9B9C9" transform="rotate(-12 -8 -66)" />
            <ellipse cx="8" cy="-66" rx="3" ry="12" fill="#F9B9C9" transform="rotate(12 8 -66)" />
            <circle cy="-40" r="17" fill="#F2EDF7" />
            {dotEye(-7, -43)}
            {dotEye(7, -43)}
            <path d="M-2.5 -37H2.5L0 -34.5Z" fill="#F08AA0" />
            {smile(0, -33, 3)}
            {cheeks(11, -36)}
        </>
    );
}

function fishBowl(): ReactNode {
    return (
        <>
            {shadow(26)}
            <path d="M-26 -6Q-36 -30 -22 -48H22Q36 -30 26 -6Q20 0 0 0Q-20 0 -26 -6Z" fill="#BDEBFF" fillOpacity="0.55" stroke="#DDE4EE" strokeWidth="3" />
            <path d="M-30 -30Q0 -24 30 -30Q34 -18 26 -6Q20 0 0 0Q-20 0 -26 -6Q-34 -18 -30 -30Z" fill="#7ED6F2" fillOpacity="0.6" />
            <rect x="-24" y="-52" width="48" height="6" rx="3" fill="#DDE4EE" />
            <path d="M-14 -4Q-16 -14 -10 -20M10 -4Q12 -12 8 -18" stroke="#3BB273" strokeWidth="3" strokeLinecap="round" fill="none" />
            <g transform="translate(2 -18)">
                <ellipse rx="10" ry="7" fill="#FF8A3D" />
                <path d="M8 0L16 -6V6Z" fill="#FF8A3D" />
                {dotEye(-4, -1, 2)}
            </g>
            <circle cx="-8" cy="-34" r="2.4" fill="#fff" opacity="0.8" />
            <circle cx="-4" cy="-40" r="1.6" fill="#fff" opacity="0.8" />
            <path d="M-20 -40Q-26 -28 -22 -16" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
    );
}

function bird(body: string, belly: string, beak: string): () => ReactNode {
    return () => (
        <>
            {shadow(18)}
            <path d="M-4 0V-8M4 0V-8" stroke="#F2A516" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M-14 -20Q-28 -18 -30 -10Q-20 -12 -12 -14Z" fill={body} />
            <ellipse cy="-20" rx="15" ry="14" fill={body} />
            <ellipse cx="2" cy="-16" rx="9" ry="9" fill={belly} />
            <circle cx="4" cy="-38" r="12" fill={body} />
            <path d="M14 -40L22 -37L14 -34Z" fill={beak} />
            {dotEye(7, -41, 2.6)}
            <circle cx="10" cy="-35" r="2.6" fill="#F58F8F" opacity="0.5" />
            <path d="M-6 -24Q2 -18 8 -26" stroke={belly} strokeWidth="2" fill="none" opacity="0.6" />
        </>
    );
}

function parrot(): ReactNode {
    return (
        <>
            {shadow(22)}
            <path d="M-22 0V-44M22 0V-44M-30 -44H30" stroke="#9A6236" strokeWidth="5" strokeLinecap="round" />
            <path d="M-2 -46L-10 -20L0 -24L6 -20Z" fill="#3D9BE9" />
            <ellipse cy="-62" rx="13" ry="18" fill="#E5484D" />
            <path d="M-12 -62Q-20 -48 -8 -42Q-2 -54 -6 -66Z" fill="#3BB273" />
            <circle cy="-82" r="12" fill="#E5484D" />
            <ellipse cx="4" cy="-82" rx="6" ry="5" fill="#fff" />
            {dotEye(4, -83, 2.4)}
            <path d="M10 -82Q18 -82 16 -72Q12 -76 9 -76Z" fill="#3A3546" />
            <path d="M-6 -92Q-4 -102 4 -98" stroke="#FFD15C" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M-6 -46L-6 -42M4 -46L4 -42" stroke="#F2A516" strokeWidth="3" strokeLinecap="round" />
        </>
    );
}

function turtle(): ReactNode {
    return (
        <>
            {shadow(32)}
            <ellipse cx="-16" cy="-4" rx="6" ry="5" fill="#8FD18F" />
            <ellipse cx="12" cy="-4" rx="6" ry="5" fill="#8FD18F" />
            <path d="M-32 -6L-40 -4L-32 -12Z" fill="#8FD18F" />
            <circle cx="30" cy="-18" r="11" fill="#8FD18F" />
            {dotEye(33, -21, 2.6)}
            {smile(34, -14, 3)}
            <path d="M-30 -8Q-30 -38 -2 -38Q26 -38 26 -8Z" fill="#4FAE5E" />
            <path d="M-16 -32L-8 -20L4 -20L12 -32M-8 -20L-12 -8M4 -20L8 -8" stroke="#3E9950" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
            <path d="M-30 -8H26" stroke="#3E9950" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="-12" cy="-30" rx="5" ry="3" fill="#fff" opacity="0.35" />
        </>
    );
}

function hedgehog(): ReactNode {
    const spikes: string[] = [];
    for (let i = 0; i <= 9; i++) {
        const a = Math.PI * (0.95 + i * 0.1);
        const x = Math.round(Math.cos(a) * 26 - 4);
        const y = Math.round(Math.sin(a) * 24 - 14);
        const tx = Math.round(Math.cos(a) * 36 - 4);
        const ty = Math.round(Math.sin(a) * 34 - 14);
        spikes.push(`M${x - 4} ${y}Q${tx} ${ty} ${x + 4} ${y}`);
    }
    return (
        <>
            {shadow(28)}
            <path d={`M-30 -8Q-34 -38 -4 -40Q22 -40 26 -12Z${spikes.join("")}`} fill="#9A6236" />
            <path d="M14 -30Q34 -26 36 -10Q30 -2 14 -4Z" fill="#F1CBA4" />
            <circle cx="36" cy="-11" r="3" fill="#3A2A2A" />
            {dotEye(22, -20, 2.6)}
            {smile(26, -10, 3)}
            <circle cx="20" cy="-12" r="2.8" fill="#F58F8F" opacity="0.5" />
            <ellipse cx="-14" cy="-2" rx="5" ry="3" fill="#F1CBA4" />
            <ellipse cx="8" cy="-2" rx="5" ry="3" fill="#F1CBA4" />
        </>
    );
}

function chick(color: string, beak: string, duck = false): () => ReactNode {
    return () => (
        <>
            {shadow(20)}
            <path d="M-6 0V-6M6 0V-6" stroke={beak} strokeWidth="3" strokeLinecap="round" />
            <ellipse cy="-18" rx="18" ry="16" fill={color} />
            <path d="M-16 -20Q-24 -14 -16 -8" stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cy="-40" r="14" fill={color} />
            {dotEye(-5, -43, 2.6)}
            {dotEye(5, -43, 2.6)}
            {duck ? <ellipse cy="-35" rx="8" ry="4" fill={beak} /> : <path d="M-4 -38H4L0 -33Z" fill={beak} />}
            {cheeks(9, -37, 3)}
            <path d="M-2 -54Q0 -60 4 -56" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
    );
}

function frog(): ReactNode {
    return (
        <>
            {shadow(26)}
            <ellipse cx="-18" cy="-4" rx="10" ry="5" fill="#4FAE5E" />
            <ellipse cx="18" cy="-4" rx="10" ry="5" fill="#4FAE5E" />
            <ellipse cy="-18" rx="24" ry="17" fill="#6CC46F" />
            <ellipse cy="-14" rx="14" ry="10" fill="#C8EBB0" />
            <circle cx="-11" cy="-34" r="9" fill="#6CC46F" />
            <circle cx="11" cy="-34" r="9" fill="#6CC46F" />
            <circle cx="-11" cy="-35" r="5.5" fill="#fff" />
            <circle cx="11" cy="-35" r="5.5" fill="#fff" />
            {dotEye(-11, -34, 3)}
            {dotEye(11, -34, 3)}
            {smile(0, -24, 8, "#3E9950", 2.6)}
            {cheeks(16, -22)}
        </>
    );
}

function penguin(): ReactNode {
    return (
        <>
            {shadow(20)}
            <ellipse cx="-7" cy="-2" rx="7" ry="3.5" fill="#F2A516" />
            <ellipse cx="7" cy="-2" rx="7" ry="3.5" fill="#F2A516" />
            <ellipse cy="-28" rx="20" ry="28" fill="#3A3546" />
            <ellipse cy="-24" rx="13" ry="21" fill="#fff" />
            <path d="M-18 -34Q-28 -22 -22 -12M18 -34Q28 -22 22 -12" stroke="#3A3546" strokeWidth="6" strokeLinecap="round" fill="none" />
            {dotEye(-6, -42, 2.6)}
            {dotEye(6, -42, 2.6)}
            <path d="M-4 -36H4L0 -31Z" fill="#F2A516" />
            {cheeks(10, -34, 3)}
        </>
    );
}

function pony(): ReactNode {
    // Poni je veći od ostalih ljubimaca: malo umanjen, da stane pored drugara
    return (
        <g transform="translate(-4 0) scale(0.8)">
            {shadow(36)}
            <path d="M-26 0V-22M-14 0V-22M10 0V-22M22 0V-22" stroke="#F7E7FF" strokeWidth="8" strokeLinecap="round" />
            <path d="M-26 -1H-20M-14 -1H-8M10 -1H16M22 -1H28" stroke="#B9A2F2" strokeWidth="4" strokeLinecap="round" />
            <path d="M-30 -30Q-48 -26 -44 -6Q-38 -16 -32 -18Z" fill="#7ED6F2" />
            <ellipse cx="-2" cy="-30" rx="30" ry="16" fill="#F7E7FF" />
            <path d="M16 -40Q20 -60 30 -66Q42 -70 46 -58Q48 -48 40 -44Q30 -42 26 -30Z" fill="#F7E7FF" />
            <path d="M44 -52Q50 -50 48 -44Q44 -42 40 -45Z" fill="#FFB8CB" />
            <path d="M24 -68L26 -78L32 -68Z" fill="#F7E7FF" />
            <path d="M14 -36Q12 -56 26 -70Q30 -62 24 -56Q30 -54 22 -48Q26 -44 18 -40Z" fill="#F78FB3" />
            <path d="M18 -54Q14 -62 22 -66" stroke="#FFD15C" strokeWidth="3" strokeLinecap="round" fill="none" />
            {dotEye(36, -58, 2.8)}
            <circle cx="42" cy="-50" r="1.2" fill="#3A2A2A" />
        </g>
    );
}

const pet = itemsFor("pet");

export const PETS = [
    pet("pile", "Pile", 18, chick("#FFD15C", "#FF8A3D")),
    pet("patkica", "Patkica", 18, chick("#FFE08A", "#FF8A3D", true)),
    pet("ribica", "Ribica u činiji", 20, fishBowl),
    pet("zabica", "Žabica", 20, frog),
    pet("pticica", "Ptičica", 22, bird("#7ED6F2", "#fff", "#FFC83D")),
    pet("kornjaca", "Kornjača", 25, turtle),
    pet("jezic", "Ježić", 26, hedgehog),
    pet("zecic", "Zečić", 28, bunny),
    pet("mace", "Mače", 30, kitten),
    pet("kuce", "Kuče", 30, puppy),
    pet("pingvin", "Pingvin", 32, penguin),
    pet("papagaj", "Papagaj", 35, parrot),
    pet("poni", "Poni", 60, pony),
];
