import type { ReactNode } from "react";
import { Cheeks, FaceBase, INK, LINE } from "./faceParts";

// ── Lica za pitanje „Kako si?” ────────────────────────────────────────────────
// Tri jednostavna lica u istom stilu (umesto emodžija, koji na svakom uređaju izgledaju drugačije).

export type MoodFaceKind = "upset" | "neutral" | "happy";

const MOOD_FEATURES: Record<MoodFaceKind, ReactNode> = {
    upset: (
        <>
            <path d="M27 40 L42 35 M58 35 L73 40" {...LINE} strokeWidth={3.5} />
            <ellipse cx={35} cy={49} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={49} rx={4.5} ry={5.5} fill={INK} />
            <path d="M36 74 Q50 64 64 74" {...LINE} />
        </>
    ),
    neutral: (
        <>
            <path d="M27 36 H42 M58 36 H73" {...LINE} strokeWidth={3.5} />
            <ellipse cx={35} cy={48} rx={4.5} ry={5.5} fill={INK} />
            <ellipse cx={65} cy={48} rx={4.5} ry={5.5} fill={INK} />
            <path d="M37 70 H63" {...LINE} />
        </>
    ),
    happy: (
        <>
            <Cheeks />
            <path d="M26 36 Q34 30 42 35 M58 35 Q66 30 74 36" {...LINE} strokeWidth={3.5} />
            <ellipse cx={35} cy={47} rx={4.5} ry={6} fill={INK} />
            <ellipse cx={65} cy={47} rx={4.5} ry={6} fill={INK} />
            <path d="M32 63 Q50 82 68 63" {...LINE} />
        </>
    ),
};

/** Lice za izbor raspoloženja; ukrasno (naziv piše ispod), pa ga čitači ekrana preskaču. */
export function MoodFace({ mood, className }: { mood: MoodFaceKind; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
            <FaceBase />
            {MOOD_FEATURES[mood]}
        </svg>
    );
}
