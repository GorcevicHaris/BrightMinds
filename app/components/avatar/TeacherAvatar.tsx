"use client";

// Učitelj / učiteljica: crtani lik koji govori sa detetom.
//  • izraz lica prati emociju rečenice (lib/emotion.ts)
//  • usta se pomeraju po jačini glasa (lib/voice.ts), oči povremeno trepnu
//  • jednostavno, čitljivo lice — bez sitnih detalja koji odvlače pažnju
// Sve se crta u SVG-u: nema učitavanja modela, radi i na starijim tabletima.

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { FACE_FOR_EMOTION, type FaceExpression, type FaceGesture, type VoiceEmotion } from "@/lib/emotion";
import { mouthLevel, useVoiceState } from "@/lib/voice";
import { useChildSettings } from "../ChildSettingsProvider";

// ── Izrazi lica ───────────────────────────────────────────────────────────────

interface Pose {
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
    /** Otvorenost usta 0–1 dok učitelj ćuti */
    open: number;
    /** Nagib glave (°) */
    tilt: number;
    blush: number;
}

const POSES: Record<FaceExpression, Pose> = {
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

// ── Geometrija ────────────────────────────────────────────────────────────────

const EYE_Y = 114;
const EYE_LX = 92;
const EYE_RX = 148;
const EYE_RADIUS_X = 9.5;
const EYE_RADIUS_Y = 13;
const BROW_Y = EYE_Y - 25;
const MOUTH_X = 120;
const MOUTH_Y = 156;
/** Tačka oko koje se glava naginje (vrat) */
const NECK = "120 186";
/** Ruka je spuštena ispod ivice slike, pa podignuta pored glave */
const HAND_DOWN_Y = 306;
const HAND_UP_Y = 150;
const HAND_LX = 26;
const HAND_RX = 214;

const r1 = (n: number) => Math.round(n * 10) / 10;

function mouthPath(w: number, smile: number, open: number): string {
    const corner = MOUTH_Y - smile * 5;
    // Što je osmeh manji, otvorena usta su okruglija („o”)
    const top = MOUTH_Y + smile * 9 - open * (3 + (1 - Math.abs(smile)) * 7);
    const bottom = MOUTH_Y + smile * 9 + open * 30;
    return `M${r1(MOUTH_X - w)} ${r1(corner)}Q${MOUTH_X} ${r1(top)} ${r1(MOUTH_X + w)} ${r1(corner)}Q${MOUTH_X} ${r1(bottom)} ${r1(MOUTH_X - w)} ${r1(corner)}Z`;
}

// ── Izgled likova ─────────────────────────────────────────────────────────────

interface Look {
    skin: string;
    shade: string;
    hair: string;
    top: string;
    topShade: string;
}

const LOOKS: Record<"male" | "female", Look> = {
    male: { skin: "#F1C29C", shade: "#E0A57E", hair: "#49301F", top: "#FFB920", topShade: "#E79C0A" },
    female: { skin: "#F6CDAB", shade: "#E7B08C", hair: "#7A4326", top: "#FF7A70", topShade: "#EC5F55" },
};

const MOUTH_STROKE = "#6E2B2B";
const MOUTH_FILL = "#8F3333";
const TONGUE = "#F27C92";
const EYE_COLOR = "#2B1F1A";
const BLUSH = "#F58F8F";

// ── Komponenta ────────────────────────────────────────────────────────────────

interface TeacherAvatarProps {
    /** Pol deteta: dečak dobija učitelja, devojčica učiteljicu (isti izbor kao za glas) */
    gender?: string;
    /** `bust` = glava i ramena (može da maše); `face` = samo lice, za mala mesta */
    variant?: "bust" | "face";
    /** Stalna emocija, umesto one iz govora (pregled i primeri) */
    emotion?: VoiceEmotion;
    className?: string;
}

interface Live extends Pose {
    armL: number;
    armR: number;
}

export default function TeacherAvatar({ gender, variant = "bust", emotion: fixedEmotion, className }: TeacherAvatarProps) {
    const female = gender?.toLowerCase() === "female";
    const look = LOOKS[female ? "female" : "male"];
    const voice = useVoiceState();
    const settings = useChildSettings();
    const clipId = useId();

    const emotion = fixedEmotion ?? voice.emotion;
    const speaking = fixedEmotion ? false : voice.speaking;
    const { expression, gesture } = FACE_FOR_EMOTION[emotion];

    const svgRef = useRef<SVGSVGElement>(null);
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
            eyeL: part<SVGEllipseElement>("eye-l"),
            eyeR: part<SVGEllipseElement>("eye-r"),
            shineL: part<SVGCircleElement>("shine-l"),
            shineR: part<SVGCircleElement>("shine-r"),
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
            const { gesture: move, speaking: talking, still } = wanted.current;
            const t = now / 1000;

            const blinking = now - blinkAt < 130;
            const eye = blinking ? 0.08 : live.eye;
            for (const [ellipse, shine] of [
                [parts.eyeL, parts.shineL],
                [parts.eyeR, parts.shineR],
            ] as const) {
                ellipse?.setAttribute("ry", String(r1(EYE_RADIUS_Y * eye)));
                shine?.setAttribute("opacity", eye < 0.5 ? "0" : "1");
            }
            parts.lidL?.setAttribute("cy", String(r1(EYE_Y + 25 - live.lid * 10)));
            parts.lidR?.setAttribute("cy", String(r1(EYE_Y + 25 - live.lid * 10)));

            parts.browL?.setAttribute("transform", `translate(${EYE_LX} ${r1(BROW_Y + live.browL)}) rotate(${r1(-live.browTilt)})`);
            parts.browR?.setAttribute("transform", `translate(${EYE_RX} ${r1(BROW_Y + live.browR)}) rotate(${r1(live.browTilt)})`);

            // Usta: osnovni izraz + otvaranje po jačini glasa
            const loud = talking ? (still ? 0.3 : mouthLevel()) : 0;
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
            const nod = talking && !still ? Math.sin(t * 2.6) * 1.2 : 0;
            parts.head?.setAttribute("transform", `rotate(${r1(live.tilt + nod)} ${NECK})`);

            // Ruke: mahanje pri pozdravu, obe gore kad je nivo gotov
            const swaying = !still && now - gestureAt < GESTURE_MS;
            const sway = swaying ? Math.sin(((now - gestureAt) / 1000) * 7) * Math.min(1, (GESTURE_MS - (now - gestureAt)) / 400) : 0;
            const leftY = HAND_DOWN_Y - live.armL * (HAND_DOWN_Y - HAND_UP_Y) + (move === "cheer" ? sway * 4 : 0);
            const rightY = HAND_DOWN_Y - live.armR * (HAND_DOWN_Y - HAND_UP_Y) + (move === "cheer" ? -sway * 4 : 0);
            const rightX = HAND_RX + (move === "wave" ? sway * 8 * live.armR : 0);
            parts.armL?.setAttribute("transform", `translate(${HAND_LX} ${r1(leftY)})`);
            parts.armR?.setAttribute("transform", `translate(${r1(rightX)} ${r1(rightY)})`);
            parts.sleeveL?.setAttribute("x2", String(HAND_LX));
            parts.sleeveL?.setAttribute("y2", String(r1(leftY + 14)));
            parts.sleeveR?.setAttribute("x2", String(r1(rightX)));
            parts.sleeveR?.setAttribute("y2", String(r1(rightY + 14)));
        };

        const step = (now: number) => {
            frame = null;
            if (!alive) return;
            const { pose, gesture: move, speaking: talking, still } = wanted.current;
            const dt = Math.min(64, now - (last || now));
            last = now;
            // Bez animacija izraz se menja odmah; inače klizi do novog za oko četvrt sekunde
            const ease = still ? 1 : 1 - Math.exp(-dt / 85);

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
            const animated = !still && (talking || (move !== "none" && now - gestureAt < GESTURE_MS));
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
    }, []);

    // Novi izraz ili početak/kraj govora: petlja dobija nove ciljeve
    const still = settings.reduceMotion;
    useEffect(() => {
        wanted.current = { pose: POSES[expression], gesture, speaking, still };
        kickRef.current();
    }, [expression, gesture, speaking, still]);

    const rest = POSES.neutral;
    const restMouth = mouthPath(rest.mouthW, rest.smile, rest.open);

    return (
        <svg
            ref={svgRef}
            viewBox={variant === "face" ? "36 16 168 176" : "0 0 240 280"}
            className={cn("pointer-events-none block select-none", className)}
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <clipPath id={clipId}>
                    <path data-part="mouth-clip" d={restMouth} />
                </clipPath>
            </defs>

            {/* Kosa iza glave (učiteljica) */}
            {female && (
                <path
                    d="M40 122C36 58 76 22 120 22s84 36 80 100v54c0 20-14 28-27 24l-3-78H70l-3 78c-13 4-27-4-27-24z"
                    fill={look.hair}
                />
            )}

            {/* Telo */}
            <path d="M26 282c0-54 38-78 94-78s94 24 94 78z" fill={look.top} />
            <path d="M26 282c0-22 6-39 17-52 4 20 8 36 10 52zM214 282c0-22-6-39-17-52-4 20-8 36-10 52z" fill={look.topShade} opacity="0.55" />
            <rect x="104" y="166" width="32" height="48" rx="13" fill={look.shade} />
            <path d="M96 205q24 34 48 0-24 13-48 0z" fill="#fff" />

            {/* Ruke (vide se samo kad su podignute) */}
            <line data-part="sleeve-l" x1="50" y1="262" x2={HAND_LX} y2={HAND_DOWN_Y + 14} stroke={look.top} strokeWidth="26" strokeLinecap="round" />
            <line data-part="sleeve-r" x1="190" y1="262" x2={HAND_RX} y2={HAND_DOWN_Y + 14} stroke={look.top} strokeWidth="26" strokeLinecap="round" />
            <g data-part="arm-l" transform={`translate(${HAND_LX} ${HAND_DOWN_Y})`}>
                <circle r="17" fill={look.skin} />
                <circle cx="13" cy="-9" r="7" fill={look.skin} />
            </g>
            <g data-part="arm-r" transform={`translate(${HAND_RX} ${HAND_DOWN_Y})`}>
                <circle r="17" fill={look.skin} />
                <circle cx="-13" cy="-9" r="7" fill={look.skin} />
            </g>

            {/* Glava */}
            <g data-part="head">
                <circle cx="55" cy="120" r="12" fill={look.skin} />
                <circle cx="185" cy="120" r="12" fill={look.skin} />
                <circle cx="55" cy="120" r="5.5" fill={look.shade} />
                <circle cx="185" cy="120" r="5.5" fill={look.shade} />
                {female && (
                    <>
                        <circle cx="55" cy="136" r="4.5" fill="#FFCD4D" />
                        <circle cx="185" cy="136" r="4.5" fill="#FFCD4D" />
                    </>
                )}
                <rect x="54" y="40" width="132" height="142" rx="62" fill={look.skin} />

                {/* Oči */}
                <ellipse data-part="eye-l" cx={EYE_LX} cy={EYE_Y} rx={EYE_RADIUS_X} ry={EYE_RADIUS_Y} fill={EYE_COLOR} />
                <ellipse data-part="eye-r" cx={EYE_RX} cy={EYE_Y} rx={EYE_RADIUS_X} ry={EYE_RADIUS_Y} fill={EYE_COLOR} />
                <circle data-part="shine-l" cx={EYE_LX + 3} cy={EYE_Y - 4} r="3" fill="#fff" />
                <circle data-part="shine-r" cx={EYE_RX + 3} cy={EYE_Y - 4} r="3" fill="#fff" />
                {/* Donji kapci: u boji kože, podižu se kad se lice smeje */}
                <ellipse data-part="lid-l" cx={EYE_LX} cy={EYE_Y + 25} rx="15" ry="10" fill={look.skin} />
                <ellipse data-part="lid-r" cx={EYE_RX} cy={EYE_Y + 25} rx="15" ry="10" fill={look.skin} />
                {female && (
                    <path
                        d={`M${EYE_LX - 9} ${EYE_Y - 8}l-6-4M${EYE_RX + 9} ${EYE_Y - 8}l6-4`}
                        stroke={EYE_COLOR}
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                    />
                )}

                {/* Obrve */}
                <g data-part="brow-l" transform={`translate(${EYE_LX} ${BROW_Y})`}>
                    <path d="M-13 2Q0-4 13 2" stroke={look.hair} strokeWidth="5.5" strokeLinecap="round" fill="none" />
                </g>
                <g data-part="brow-r" transform={`translate(${EYE_RX} ${BROW_Y})`}>
                    <path d="M-13 2Q0-4 13 2" stroke={look.hair} strokeWidth="5.5" strokeLinecap="round" fill="none" />
                </g>

                {/* Nos i obrazi */}
                <path d="M115 134q5 6 11 0" stroke={look.shade} strokeWidth="4" strokeLinecap="round" fill="none" />
                <circle data-part="blush-l" cx="77" cy="143" r="11" fill={BLUSH} opacity={rest.blush} />
                <circle data-part="blush-r" cx="163" cy="143" r="11" fill={BLUSH} opacity={rest.blush} />

                {/* Usta */}
                <path data-part="mouth" d={restMouth} fill={MOUTH_FILL} stroke={MOUTH_STROKE} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
                <g clipPath={`url(#${clipId})`}>
                    <rect data-part="teeth" x={MOUTH_X - 26} y={MOUTH_Y - 6} width="52" height="0" fill="#fff" />
                    <ellipse data-part="tongue" cx={MOUTH_X} cy={MOUTH_Y + 10} rx="11" ry="0" fill={TONGUE} />
                </g>

                {/* Kosa */}
                {female ? (
                    <path d="M52 110C46 60 82 30 122 30c42 0 72 30 66 80-6-22-18-34-34-40-22 22-70 22-102 40z" fill={look.hair} />
                ) : (
                    <path d="M50 106C44 52 80 26 122 26c44 0 76 28 68 80-4-20-18-36-38-40-24-4-48 6-68-2-18 10-30 24-34 42z" fill={look.hair} />
                )}
            </g>
        </svg>
    );
}
