import type { ReactNode } from "react";
import { EMOTIONS, type EmotionId } from "./data/emotionScenarios";

// Šest lica u istom stilu: ista glava i boje, a razlikuju se samo obrve, oči i usta.
// Crtaju se kao SVG da bi na svakom uređaju izgledala isto (emodži lica se razlikuju
// od telefona do telefona i često su dvosmislena).

const INK = "#3b2a1a";
const MOUTH = "#7a2a2a";

const LINE = { fill: "none", stroke: INK, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Cheeks() {
    return (
        <g fill="#ff9e80" opacity={0.55}>
            <circle cx={24} cy={62} r={6} />
            <circle cx={76} cy={62} r={6} />
        </g>
    );
}

/** Široko otvorene oči: bela beonjača i zenica date veličine. */
function WideEyes({ y, radius, pupil }: { y: number; radius: number; pupil: number }) {
    return (
        <>
            {[34, 66].map((x) => (
                <g key={x}>
                    <circle cx={x} cy={y} r={radius} fill="#ffffff" stroke={INK} strokeWidth={3} />
                    <circle cx={x} cy={y} r={pupil} fill={INK} />
                </g>
            ))}
        </>
    );
}

const FEATURES: Record<EmotionId, ReactNode> = {
    // Srećno: blago podignute obrve, širok otvoren osmeh
    happy: (
        <>
            <Cheeks />
            <path d="M26 35 Q34 29 42 34 M58 34 Q66 29 74 35" {...LINE} strokeWidth={3.5} />
            <ellipse cx={35} cy={46} rx={4.5} ry={6} fill={INK} />
            <ellipse cx={65} cy={46} rx={4.5} ry={6} fill={INK} />
            <path d="M28 59 Q50 87 72 59 Z" fill={MOUTH} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <path d="M40 69 Q50 64 60 69 Q50 75 40 69 Z" fill="#f2788c" />
        </>
    ),
    // Tužno: unutrašnji krajevi obrva podignuti, usta nadole, jedna suza
    sad: (
        <>
            <path d="M26 39 L42 32 M58 32 L74 39" {...LINE} />
            <ellipse cx={35} cy={49} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={49} rx={4.5} ry={5.5} fill={INK} />
            <path d="M70 57 Q64 66 70 69 Q76 66 70 57 Z" fill="#5bb8f5" stroke="#2e86c9" strokeWidth={1.5} strokeLinejoin="round" />
            <path d="M35 76 Q50 63 65 76" {...LINE} />
        </>
    ),
    // Ljuto: debele obrve spuštene ka sredini, stisnuti zubi
    angry: (
        <>
            <g fill="#f2644e" opacity={0.35}>
                <circle cx={23} cy={60} r={7} />
                <circle cx={77} cy={60} r={7} />
            </g>
            <path d="M24 32 L43 41 M76 32 L57 41" {...LINE} strokeWidth={5.5} />
            <ellipse cx={36} cy={49} rx={4.5} ry={5} fill={INK} />
            <ellipse cx={64} cy={49} rx={4.5} ry={5} fill={INK} />
            <rect x={35} y={64} width={30} height={13} rx={5} fill="#ffffff" stroke={INK} strokeWidth={3} />
            <path d="M35 70.5 H65 M45 64 V77 M55 64 V77" fill="none" stroke={INK} strokeWidth={2} />
        </>
    ),
    // Uplašeno: obrve podignute i skupljene, razrogačene oči sa malim zenicama, talasasta usta
    scared: (
        <>
            <path d="M24 37 Q32 28 43 27 M76 37 Q68 28 57 27" {...LINE} />
            <WideEyes y={48} radius={9.5} pupil={2.8} />
            <path d="M33 74 Q37.25 68 41.5 74 T50 74 T58.5 74 T67 74" {...LINE} />
        </>
    ),
    // Iznenađeno: visoko podignute okrugle obrve, okrugle oči, okrugla otvorena usta
    surprised: (
        <>
            <path d="M24 30 Q34 20 44 30 M56 30 Q66 20 76 30" {...LINE} />
            <WideEyes y={46} radius={8} pupil={4} />
            <ellipse cx={50} cy={73} rx={8} ry={10} fill={MOUTH} stroke={INK} strokeWidth={3} />
        </>
    ),
    // Ponosno: zatvorene nasmejane oči, miran osmeh, podignuta brada i medalja
    proud: (
        <>
            <path d="M26 33 Q34 28 42 32 M58 32 Q66 28 74 33" {...LINE} strokeWidth={3.5} />
            <path d="M28 46 Q35 39 42 46 M58 46 Q65 39 72 46" {...LINE} />
            <path d="M34 60 Q50 75 66 60" {...LINE} />
            <path d="M67 60 L76 60 L80 77 L73 79 Z" fill="#4f7be8" />
            <path d="M87 60 L78 60 L74 77 L81 79 Z" fill="#3a63cc" />
            <circle cx={77} cy={85} r={11} fill="#f7b500" stroke="#b87900" strokeWidth={2.5} />
            <path
                d="M77 78.5 L78.65 82.73 L83.18 82.99 L79.66 85.87 L80.82 90.26 L77 87.8 L73.18 90.26 L74.34 85.87 L70.82 82.99 L75.35 82.73 Z"
                fill="#fff3c4"
            />
        </>
    ),
};

interface EmotionFaceProps {
    emotion: EmotionId;
    className?: string;
}

/** Crtež lica za jedno osećanje. Čitači ekrana ga čitaju kao sliku sa nazivom osećanja. */
export function EmotionFace({ emotion, className }: EmotionFaceProps) {
    return (
        <svg viewBox="0 0 100 100" role="img" aria-label={EMOTIONS[emotion].label} focusable="false" className={className}>
            <circle cx={50} cy={52} r={43} fill="#ffd75e" stroke="#c98a12" strokeWidth={3} />
            {FEATURES[emotion]}
        </svg>
    );
}
