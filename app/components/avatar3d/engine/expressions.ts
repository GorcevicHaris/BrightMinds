// Izrazi lica u 3D: isti izrazi kao kod 2D lica (lib/emotion FaceExpression), zadati brojevima
// koje lice (head.ts, i životinje) samo primenjuje. Prelaz između izraza je mešanje brojeva.
// Lice okrenuto detetu nikad nije ljutito (ljutnja iz priče → „ozbiljan”, strah → „zabrinut”).

import type { FaceExpression } from "@/lib/emotion";

export interface FacePose {
    /** Obrve gore (+) / dole (−), u metrima */
    browY: number;
    /** Nagib obrva (rad): + unutrašnji krajevi gore (tuga), − dole (ozbiljnost) */
    browTilt: number;
    /** Leva obrva dodatno gore (radoznalost: jedna obrva) */
    browLeft: number;
    /** Otvorenost očiju (1 = uobičajeno) */
    eye: number;
    /** Donji kapak gore 0–1 („oči koje se smeju”) */
    lid: number;
    /** Usta: osmeh −1…1, širina (1 = uobičajeno), otvorenost dok lik ćuti */
    smile: number;
    width: number;
    open: number;
    /** Nagib glave (rad) */
    tilt: number;
}

export const FACE_POSES: Record<FaceExpression, FacePose> = {
    neutral: { browY: 0, browTilt: 0, browLeft: 0, eye: 1, lid: 0.05, smile: 0.5, width: 1, open: 0, tilt: 0 },
    happy: { browY: 0.0028, browTilt: 0.03, browLeft: 0, eye: 0.95, lid: 0.55, smile: 1, width: 1.2, open: 0.22, tilt: 0 },
    proud: { browY: 0.005, browTilt: 0.05, browLeft: 0, eye: 0.9, lid: 0.7, smile: 1, width: 1.3, open: 0.42, tilt: -0.03 },
    gentle: { browY: 0.001, browTilt: 0.08, browLeft: 0, eye: 0.92, lid: 0.3, smile: 0.7, width: 1, open: 0, tilt: 0.07 },
    curious: { browY: 0.002, browTilt: 0, browLeft: 0.005, eye: 1.06, lid: 0, smile: 0.3, width: 0.82, open: 0.08, tilt: -0.08 },
    sad: { browY: -0.001, browTilt: 0.22, browLeft: 0, eye: 0.86, lid: 0, smile: -0.55, width: 0.88, open: 0, tilt: 0.06 },
    serious: { browY: -0.0025, browTilt: -0.14, browLeft: 0, eye: 0.9, lid: 0.1, smile: -0.15, width: 0.88, open: 0, tilt: 0 },
    worried: { browY: 0.003, browTilt: 0.18, browLeft: 0, eye: 1.08, lid: 0, smile: -0.3, width: 0.72, open: 0.18, tilt: 0 },
    surprised: { browY: 0.007, browTilt: 0, browLeft: 0, eye: 1.18, lid: 0, smile: 0, width: 0.66, open: 0.6, tilt: 0 },
};

export function mixPose(a: FacePose, b: FacePose, t: number): FacePose {
    const out = { ...a };
    for (const key of Object.keys(a) as (keyof FacePose)[]) out[key] = a[key] + (b[key] - a[key]) * t;
    return out;
}
