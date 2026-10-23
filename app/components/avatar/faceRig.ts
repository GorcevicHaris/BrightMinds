"use client";

// Zajednički „kostur” svih likova (učitelj, učiteljica, životinje): izrazi lica, geometrija
// lica i petlja crtanja koja pomera delove označene sa `data-part`.
//  • izraz lica prati emociju rečenice (lib/emotion.ts)
//  • usta se otvaraju po jačini glasa (lib/voice.ts), oči povremeno trepnu
//  • kad je u podešavanjima uključeno „manje pokreta”, lik miruje
// Svi likovi dele istu geometriju (oči, usta, vrat), pa im odgovaraju isti predmeti
// iz prodavnice (app/components/avatar/wearables.tsx).

import { useEffect, useRef, type RefObject } from "react";
import type { FaceExpression, FaceGesture } from "@/lib/emotion";
import { mouthLevel } from "@/lib/voice";
import {
    BROW_Y,
    EYE_LX,
    EYE_RX,
    EYE_Y,
    HAND_DOWN_Y,
    HAND_LX,
    HAND_RX,
    HAND_UP_Y,
    LID_REST,
    MOUTH_X,
    MOUTH_Y,
    NECK,
} from "./geometry";

// ── Izrazi lica ───────────────────────────────────────────────────────────────

export interface Pose {
    /** Pomeraj obrva nadole (px); negativno = podignute */
    browL: number;
    browR: number;
    /** Nagib obrva (°): pozitivno = unutrašnji krajevi gore (tuga), negativno = dole (ozbiljnost) */
    browTilt: number;
    /** Otvorenost očiju (1 = uobičajeno) */
    eye: number;
    /** Podignut donji kapak 0–1 („oči koje se smeju”) */
    lid: number;
    /** -1 (uglovi usana dole) … 1 (širok osmeh) */
    smile: number;
    /** Poluširina usta (px) */
    mouthW: number;
    /** Otvorenost usta 0–1 dok lik ćuti */
    open: number;
    /** Nagib glave (°) */
    tilt: number;
    blush: number;
}

export const POSES: Record<FaceExpression, Pose> = {
    neutral: { browL: 0, browR: 0, browTilt: 0, eye: 1, lid: 0, smile: 0.5, mouthW: 17, open: 0, tilt: 0, blush: 0.35 },
    happy: { browL: -3, browR: -3, browTilt: 2, eye: 0.94, lid: 0.5, smile: 1, mouthW: 21, open: 0.2, tilt: 0, blush: 0.6 },
    proud: { browL: -6, browR: -6, browTilt: 3, eye: 0.92, lid: 0.65, smile: 1, mouthW: 23, open: 0.42, tilt: -2, blush: 0.7 },
    gentle: { browL: -1, browR: -1, browTilt: 6, eye: 0.92, lid: 0.25, smile: 0.65, mouthW: 17, open: 0, tilt: 5, blush: 0.45 },
    curious: { browL: -8, browR: -1, browTilt: 0, eye: 1.06, lid: 0, smile: 0.3, mouthW: 14, open: 0.08, tilt: -6, blush: 0.35 },
    sad: { browL: 1, browR: 1, browTilt: 14, eye: 0.88, lid: 0, smile: -0.55, mouthW: 15, open: 0, tilt: 4, blush: 0.2 },
    serious: { browL: 3, browR: 3, browTilt: -9, eye: 0.9, lid: 0.1, smile: -0.15, mouthW: 15, open: 0, tilt: 0, blush: 0.2 },
    worried: { browL: -3, browR: -3, browTilt: 12, eye: 1.08, lid: 0, smile: -0.3, mouthW: 12, open: 0.2, tilt: 0, blush: 0.2 },
    surprised: { browL: -9, browR: -9, browTilt: 0, eye: 1.15, lid: 0, smile: 0, mouthW: 11, open: 0.6, tilt: 0, blush: 0.35 },
};

// ── Geometrija: app/components/avatar/geometry.ts ────────────────────────────

export const r1 = (n: number) => Math.round(n * 10) / 10;

export function mouthPath(w: number, smile: number, open: number): string {
    const corner = MOUTH_Y - smile * 5;
    // Što je osmeh manji, otvorena usta su okruglija („o”)
    const top = MOUTH_Y + smile * 9 - open * (3 + (1 - Math.abs(smile)) * 7);
    const bottom = MOUTH_Y + smile * 9 + open * 30;
    return `M${r1(MOUTH_X - w)} ${r1(corner)}Q${MOUTH_X} ${r1(top)} ${r1(MOUTH_X + w)} ${r1(corner)}Q${MOUTH_X} ${r1(bottom)} ${r1(MOUTH_X - w)} ${r1(corner)}Z`;
}

export const REST_MOUTH = mouthPath(POSES.neutral.mouthW, POSES.neutral.smile, POSES.neutral.open);

// ── Petlja crtanja ────────────────────────────────────────────────────────────

interface Live extends Pose {
    armL: number;
    armR: number;
}

export interface RigTarget {
    expression: FaceExpression;
    gesture: FaceGesture;
    speaking: boolean;
    /** Bez pokreta (podešavanje „manje pokreta”) */
    still: boolean;
}

/**
 * Pokreće lice u SVG-u: traži delove po `data-part` (head, brow-l/r, eye-l/r, lid-l/r,
 * blush-l/r, mouth, mouth-clip, tongue, teeth, arm-l/r, sleeve-l/r) i pomera ih bez
 * ponovnog renderovanja. Deo koji lik nema (npr. zubi kod životinja) se preskače.
 */
export function useFaceRig(svgRef: RefObject<SVGSVGElement | null>, { expression, gesture, speaking, still }: RigTarget) {
    /** Ono što petlja crtanja čita; menja se bez ponovnog renderovanja */
    const wanted = useRef<{ pose: Pose; gesture: FaceGesture; speaking: boolean; still: boolean }>({
        pose: POSES.neutral,
        gesture: "none",
        speaking: false,
        still: false,
    });
    const kickRef = useRef<() => void>(() => {});

    // Petlja crtanja: živi dok je komponenta na ekranu, a radi samo kad ima šta da se pomeri
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const part = <T extends SVGElement>(name: string) => svg.querySelector<T>(`[data-part="${name}"]`);
        const parts = {
            head: part<SVGGElement>("head"),
            browL: part<SVGGElement>("brow-l"),
            browR: part<SVGGElement>("brow-r"),
            eyeL: part<SVGGElement>("eye-l"),
            eyeR: part<SVGGElement>("eye-r"),
            lidL: part<SVGEllipseElement>("lid-l"),
            lidR: part<SVGEllipseElement>("lid-r"),
            blushL: part<SVGCircleElement>("blush-l"),
            blushR: part<SVGCircleElement>("blush-r"),
            mouth: part<SVGPathElement>("mouth"),
            mouthClip: part<SVGPathElement>("mouth-clip"),
            tongue: part<SVGEllipseElement>("tongue"),
            teeth: part<SVGRectElement>("teeth"),
            armL: part<SVGGElement>("arm-l"),
            armR: part<SVGGElement>("arm-r"),
            sleeveL: part<SVGLineElement>("sleeve-l"),
            sleeveR: part<SVGLineElement>("sleeve-r"),
        };

        const live: Live = { ...POSES.neutral, armL: 0, armR: 0 };
        let frame: number | null = null;
        let last = 0;
        let blinkAt = -1000;
        /** Mahanje traje kratko, pa ruka mirno ostane podignuta (bez stalnog pokreta pred detetom) */
        let shownGesture: FaceGesture = "none";
        let gestureAt = 0;
        const GESTURE_MS = 2400;
        let blinkTimer: ReturnType<typeof setTimeout> | null = null;
        let alive = true;

        const draw = (now: number) => {
            const { gesture: move, speaking: talking, still: calm } = wanted.current;
            const t = now / 1000;

            const blinking = now - blinkAt < 130;
            const eye = blinking ? 0.08 : live.eye;
            // Oko je grupa (beonjača, dužica, sjaj): treptaj i širenje su sabijanje po visini
            const squeeze = Math.round(eye * 100) / 100;
            parts.eyeL?.setAttribute("transform", `translate(${EYE_LX} ${EYE_Y}) scale(1 ${squeeze})`);
            parts.eyeR?.setAttribute("transform", `translate(${EYE_RX} ${EYE_Y}) scale(1 ${squeeze})`);
            parts.lidL?.setAttribute("cy", String(r1(EYE_Y + LID_REST - live.lid * 12)));
            parts.lidR?.setAttribute("cy", String(r1(EYE_Y + LID_REST - live.lid * 12)));

            parts.browL?.setAttribute("transform", `translate(${EYE_LX} ${r1(BROW_Y + live.browL)}) rotate(${r1(-live.browTilt)})`);
            parts.browR?.setAttribute("transform", `translate(${EYE_RX} ${r1(BROW_Y + live.browR)}) rotate(${r1(live.browTilt)})`);

            // Usta: osnovni izraz + otvaranje po jačini glasa
            const loud = talking ? (calm ? 0.3 : mouthLevel()) : 0;
            const open = Math.min(1, live.open + loud * 0.8);
            const width = live.mouthW * (1 - loud * 0.14);
            const d = mouthPath(width, live.smile, open);
            parts.mouth?.setAttribute("d", d);
            parts.mouthClip?.setAttribute("d", d);
            parts.tongue?.setAttribute("cy", String(r1(MOUTH_Y + live.smile * 9 + open * 17)));
            parts.tongue?.setAttribute("ry", String(r1(open * 8)));
            parts.teeth?.setAttribute("height", String(open > 0.22 ? r1(4 + open * 5) : 0));
            parts.teeth?.setAttribute("y", String(r1(MOUTH_Y - live.smile * 5 - 4)));

            parts.blushL?.setAttribute("opacity", String(r1(live.blush)));
            parts.blushR?.setAttribute("opacity", String(r1(live.blush)));

            // Glava se dok govori jedva primetno njiše
            const nod = talking && !calm ? Math.sin(t * 2.6) * 1.2 : 0;
            parts.head?.setAttribute("transform", `rotate(${r1(live.tilt + nod)} ${NECK})`);

            // Ruke: mahanje pri pozdravu, obe gore kad je nivo gotov
            const swaying = !calm && now - gestureAt < GESTURE_MS;
            const sway = swaying ? Math.sin(((now - gestureAt) / 1000) * 7) * Math.min(1, (GESTURE_MS - (now - gestureAt)) / 400) : 0;
            const leftY = HAND_DOWN_Y - live.armL * (HAND_DOWN_Y - HAND_UP_Y) + (move === "cheer" ? sway * 4 : 0);
            const rightY = HAND_DOWN_Y - live.armR * (HAND_DOWN_Y - HAND_UP_Y) + (move === "cheer" ? -sway * 4 : 0);
            const rightX = HAND_RX + (move === "wave" ? sway * 8 * live.armR : 0);
            parts.armL?.setAttribute("transform", `translate(${HAND_LX} ${r1(leftY)})`);
            parts.armR?.setAttribute("transform", `translate(${r1(rightX)} ${r1(rightY)})`);
            // Rukav se vidi tek kad se ruka diže (spušten bi virio kao tamna mrlja na ramenu)
            parts.sleeveL?.setAttribute("opacity", String(Math.min(1, r1(live.armL * 4))));
            parts.sleeveR?.setAttribute("opacity", String(Math.min(1, r1(live.armR * 4))));
            parts.sleeveL?.setAttribute("x2", String(HAND_LX));
            parts.sleeveL?.setAttribute("y2", String(r1(leftY + 14)));
            parts.sleeveR?.setAttribute("x2", String(r1(rightX)));
            parts.sleeveR?.setAttribute("y2", String(r1(rightY + 14)));
        };

        const step = (now: number) => {
            frame = null;
            if (!alive) return;
            const { pose, gesture: move, speaking: talking, still: calm } = wanted.current;
            const dt = Math.min(64, now - (last || now));
            last = now;
            // Bez animacija izraz se menja odmah; inače klizi do novog za oko četvrt sekunde
            const ease = calm ? 1 : 1 - Math.exp(-dt / 85);

            if (move !== shownGesture) {
                shownGesture = move;
                gestureAt = now;
            }
            const armL = move === "cheer" ? 1 : 0;
            const armR = move === "none" ? 0 : 1;
            let moving = false;
            const approach = (key: keyof Live, target: number) => {
                const next = live[key] + (target - live[key]) * ease;
                if (Math.abs(target - next) > 0.004) moving = true;
                live[key] = Math.abs(target - next) < 0.004 ? target : next;
            };
            (Object.keys(pose) as (keyof Pose)[]).forEach((key) => approach(key, pose[key]));
            approach("armL", armL);
            approach("armR", armR);

            draw(now);

            const blinking = now - blinkAt < 160;
            const animated = !calm && (talking || (move !== "none" && now - gestureAt < GESTURE_MS));
            if (moving || blinking || animated) frame = requestAnimationFrame(step);
            else last = 0;
        };

        const kick = () => {
            if (frame === null && alive) frame = requestAnimationFrame(step);
        };
        kickRef.current = kick;

        const scheduleBlink = () => {
            blinkTimer = setTimeout(
                () => {
                    if (!wanted.current.still && document.visibilityState === "visible") {
                        blinkAt = performance.now();
                        kick();
                    }
                    scheduleBlink();
                },
                2600 + Math.random() * 3400
            );
        };
        scheduleBlink();
        kick();

        return () => {
            alive = false;
            kickRef.current = () => {};
            if (frame !== null) cancelAnimationFrame(frame);
            if (blinkTimer) clearTimeout(blinkTimer);
        };
    }, [svgRef]);

    // Novi izraz ili početak/kraj govora: petlja dobija nove ciljeve
    useEffect(() => {
        wanted.current = { pose: POSES[expression], gesture, speaking, still };
        kickRef.current();
    }, [expression, gesture, speaking, still]);
}
