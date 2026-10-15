import type { ReactNode } from "react";

// Zajednički delovi crtanih lica (igra emocija i pitanje „Kako si?”): ista glava, iste linije.

export const INK = "#3b2a1a";
export const MOUTH = "#7a2a2a";

export const LINE = { fill: "none", stroke: INK, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function Cheeks(): ReactNode {
    return (
        <g fill="#ff9e80" opacity={0.55}>
            <circle cx={24} cy={62} r={6} />
            <circle cx={76} cy={62} r={6} />
        </g>
    );
}

/** Glava: žuta lopta sa svetlom odozgo sleva i senkom dole — ista za sva lica. */
export function FaceBase(): ReactNode {
    return (
        <>
            <defs>
                <radialGradient id="ef-skin" cx="0.36" cy="0.28" r="0.85">
                    <stop offset="0" stopColor="#ffe894" />
                    <stop offset="0.6" stopColor="#ffd24a" />
                    <stop offset="1" stopColor="#eea413" />
                </radialGradient>
                <radialGradient id="ef-glow">
                    <stop offset="0" stopColor="#fff" stopOpacity="0.65" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx={50} cy={52} r={43} fill="url(#ef-skin)" stroke="#c98a12" strokeWidth={2.5} />
            <ellipse cx={36} cy={27} rx={20} ry={11} fill="url(#ef-glow)" />
        </>
    );
}
