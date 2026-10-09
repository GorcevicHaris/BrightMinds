"use client";

// Učitelj / učiteljica: crtani lik koji govori sa detetom.
//  • izraz lica prati emociju rečenice (lib/emotion.ts)
//  • usta se pomeraju po jačini glasa (lib/voice.ts), oči povremeno trepnu
//  • jednostavno, čitljivo lice — bez sitnih detalja koji odvlače pažnju
// Sve se crta u SVG-u, ali sa svetlom i senkom kao kod 3D lika (oblina lica, sjaj u očima,
// odsjaj na kosi, senka ispod brade) — u istom duhu kao 3D slike životinja u igrama.
// Nema učitavanja modela, pa radi i na starijim tabletima.

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
/** Beonjača */
const EYE_RADIUS_X = 14;
const EYE_RADIUS_Y = 15.5;
const BROW_Y = EYE_Y - 29;
/** Koliko je donji kapak ispod oka dok lice miruje */
const LID_REST = 30;
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
    /** Koža: osvetljeni deo, osnovna boja i senka */
    skin: [string, string, string];
    /** Kosa: odsjaj, osnovna boja i senka */
    hair: [string, string, string];
    /** Odeća: svetlo i senka */
    top: [string, string];
    /** Dužica oka: svetlo i tamno */
    iris: [string, string];
}

const LOOKS: Record<"male" | "female", Look> = {
    male: { skin: ["#FFE3C8", "#F4C39C", "#D99870"], hair: ["#8A5B3C", "#5C3A25", "#3A2316"], top: ["#FFD15C", "#EE9A06"], iris: ["#9A6A3A", "#3F2410"] },
    female: { skin: ["#FFE8D4", "#F8CEAC", "#E0A481"], hair: ["#B86B3C", "#8A4A26", "#5E2E15"], top: ["#FFA097", "#EC5B52"], iris: ["#7A9A4A", "#2F4016"] },
};

const MOUTH_STROKE = "#6E2B2B";
const MOUTH_FILL = "#8F3333";
const TONGUE = "#F27C92";
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
    const uid = useId();

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
            const { gesture: move, speaking: talking, still } = wanted.current;
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
    // Preliv kože je zadat u koordinatama crteža: sve što je u boji kože (lice, uši, kapci)
    // deli isto svetlo, pa se kapak koji prekriva oko ne vidi kao zakrpa.
    const id = (name: string) => `${uid}-${name}`;
    const fill = (name: string) => `url(#${id(name)})`;
    const [skinLight, skinMid, skinDark] = look.skin;
    const [hairLight, hairMid, hairDark] = look.hair;

    const eye = (x: number, part: string) => (
        <g data-part={part} transform={`translate(${x} ${EYE_Y})`}>
            <ellipse rx={EYE_RADIUS_X} ry={EYE_RADIUS_Y} fill={fill("white")} />
            <circle cy="1" r="11" fill={fill("iris")} />
            <circle cy="1" r="5.6" fill="#1B120D" />
            <circle cx="-4" cy="-3.6" r="3.8" fill="#fff" />
            <circle cx="4" cy="5" r="1.7" fill="#fff" opacity="0.75" />
            {/* Senka gornjeg kapka na oku i linija trepavica */}
            <path d={`M${-EYE_RADIUS_X} -2A${EYE_RADIUS_X} ${EYE_RADIUS_Y} 0 0 1 ${EYE_RADIUS_X} -2A${EYE_RADIUS_X} 11 0 0 0 ${-EYE_RADIUS_X} -2Z`} fill="#2B1F1A" opacity="0.14" />
            <path d={`M${-EYE_RADIUS_X - 1} -3A${EYE_RADIUS_X + 1} ${EYE_RADIUS_Y + 0.5} 0 0 1 ${EYE_RADIUS_X + 1} -3`} fill="none" stroke="#2B1F1A" strokeWidth="3" strokeLinecap="round" />
        </g>
    );

    return (
        <svg
            ref={svgRef}
            viewBox={variant === "face" ? "36 14 168 178" : "0 0 240 280"}
            className={cn("pointer-events-none block select-none", className)}
            aria-hidden="true"
            focusable="false"
        >
            <defs>
                <clipPath id={id("frame")}>
                    <rect width="240" height="280" />
                </clipPath>
                <clipPath id={id("mouth")}>
                    <path data-part="mouth-clip" d={restMouth} />
                </clipPath>
                <radialGradient id={id("skin")} gradientUnits="userSpaceOnUse" cx="96" cy="84" r="128">
                    <stop offset="0" stopColor={skinLight} />
                    <stop offset="0.55" stopColor={skinMid} />
                    <stop offset="1" stopColor={skinDark} />
                </radialGradient>
                <radialGradient id={id("hand")} cx="0.35" cy="0.3" r="0.8">
                    <stop offset="0" stopColor={skinLight} />
                    <stop offset="1" stopColor={skinMid} />
                </radialGradient>
                <linearGradient id={id("neck")} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={skinDark} />
                    <stop offset="1" stopColor={skinMid} />
                </linearGradient>
                <linearGradient id={id("hair")} gradientUnits="userSpaceOnUse" x1="70" y1="24" x2="170" y2="200">
                    <stop offset="0" stopColor={hairLight} />
                    <stop offset="0.45" stopColor={hairMid} />
                    <stop offset="1" stopColor={hairDark} />
                </linearGradient>
                <linearGradient id={id("top")} gradientUnits="userSpaceOnUse" x1="60" y1="200" x2="180" y2="290">
                    <stop offset="0" stopColor={look.top[0]} />
                    <stop offset="1" stopColor={look.top[1]} />
                </linearGradient>
                <radialGradient id={id("iris")} cx="0.5" cy="0.62" r="0.6">
                    <stop offset="0" stopColor={look.iris[0]} />
                    <stop offset="1" stopColor={look.iris[1]} />
                </radialGradient>
                <radialGradient id={id("white")} cx="0.45" cy="0.4" r="0.7">
                    <stop offset="0.5" stopColor="#fff" />
                    <stop offset="1" stopColor="#DDE4EE" />
                </radialGradient>
                <radialGradient id={id("blush")}>
                    <stop offset="0" stopColor={BLUSH} stopOpacity="0.9" />
                    <stop offset="1" stopColor={BLUSH} stopOpacity="0" />
                </radialGradient>
                <radialGradient id={id("shade")}>
                    <stop offset="0" stopColor="#3A1E12" stopOpacity="0.38" />
                    <stop offset="1" stopColor="#3A1E12" stopOpacity="0" />
                </radialGradient>
                <radialGradient id={id("glow")}>
                    <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={id("inside")} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#5E1F22" />
                    <stop offset="1" stopColor={MOUTH_FILL} />
                </linearGradient>
            </defs>

            {/* Kosa iza glave (učiteljica) */}
            {female && (
                <path d="M38 122C34 56 76 20 120 20s86 36 82 102v56c0 21-15 29-28 25l-3-80H69l-3 80c-13 4-28-4-28-25z" fill={fill("hair")} />
            )}

            {/* Telo: svetlo pada sleva odozgo, ramena su zaobljena */}
            <path d="M24 284c0-56 38-80 96-80s96 24 96 80z" fill={fill("top")} />
            <ellipse cx="78" cy="232" rx="46" ry="20" fill={fill("glow")} opacity="0.5" />
            <ellipse cx="120" cy="214" rx="62" ry="20" fill={fill("shade")} opacity="0.75" />
            <rect x="103" y="164" width="34" height="50" rx="14" fill={fill("neck")} />
            <ellipse cx="120" cy="178" rx="24" ry="13" fill={fill("shade")} />
            <path d="M95 204q25 36 50 0-25 14-50 0z" fill="#fff" />
            <path d="M95 204q25 14 50 0-25 9-50 0z" fill="#C9D2E0" opacity="0.7" />

            {/* Ruke (vide se samo kad su podignute). Isečene su na okvir crteža: kad je mesto za
                lik uže od crteža, spuštene šake ne smeju da provire ispod ramena. */}
            <g clipPath={`url(#${id("frame")})`}>
            <line data-part="sleeve-l" x1="50" y1="262" x2={HAND_LX} y2={HAND_DOWN_Y + 14} stroke={look.top[1]} strokeWidth="27" strokeLinecap="round" opacity="0" />
                <line data-part="sleeve-r" x1="190" y1="262" x2={HAND_RX} y2={HAND_DOWN_Y + 14} stroke={look.top[1]} strokeWidth="27" strokeLinecap="round" opacity="0" />
                <g data-part="arm-l" transform={`translate(${HAND_LX} ${HAND_DOWN_Y})`}>
                    <circle r="17" fill={fill("hand")} />
                    <circle cx="13" cy="-9" r="7" fill={fill("hand")} />
                </g>
                <g data-part="arm-r" transform={`translate(${HAND_RX} ${HAND_DOWN_Y})`}>
                    <circle r="17" fill={fill("hand")} />
                    <circle cx="-13" cy="-9" r="7" fill={fill("hand")} />
                </g>
            </g>

            {/* Glava */}
            <g data-part="head">
                <circle cx="55" cy="122" r="13" fill={fill("skin")} />
                <circle cx="185" cy="122" r="13" fill={fill("skin")} />
                <circle cx="56" cy="122" r="6" fill={skinDark} opacity="0.7" />
                <circle cx="184" cy="122" r="6" fill={skinDark} opacity="0.85" />
                {female && (
                    <>
                        <circle cx="54" cy="139" r="5" fill="#FFCD4D" />
                        <circle cx="186" cy="139" r="5" fill="#FFCD4D" />
                        <circle cx="52.5" cy="137.5" r="1.6" fill="#fff" opacity="0.8" />
                        <circle cx="184.5" cy="137.5" r="1.6" fill="#fff" opacity="0.8" />
                    </>
                )}
                <rect x="54" y="40" width="132" height="142" rx="62" fill={fill("skin")} />
                {/* Odsjaj na čelu i obrazu daje licu oblinu */}
                <ellipse cx="92" cy="74" rx="34" ry="20" fill={fill("glow")} opacity="0.55" />

                {/* Oči */}
                {eye(EYE_LX, "eye-l")}
                {eye(EYE_RX, "eye-r")}
                {/* Donji kapci: u boji kože, podižu se kad se lice smeje */}
                <ellipse data-part="lid-l" cx={EYE_LX} cy={EYE_Y + LID_REST} rx="19" ry="12" fill={fill("skin")} />
                <ellipse data-part="lid-r" cx={EYE_RX} cy={EYE_Y + LID_REST} rx="19" ry="12" fill={fill("skin")} />
                {female && (
                    <path
                        d={`M${EYE_LX - 13} ${EYE_Y - 9}l-7-5M${EYE_LX - 9} ${EYE_Y - 13}l-4-6M${EYE_RX + 13} ${EYE_Y - 9}l7-5M${EYE_RX + 9} ${EYE_Y - 13}l4-6`}
                        stroke="#2B1F1A"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        fill="none"
                    />
                )}

                {/* Obrve */}
                <g data-part="brow-l" transform={`translate(${EYE_LX} ${BROW_Y})`}>
                    <path d="M-14 2Q0-5 14 2" stroke={hairDark} strokeWidth="6" strokeLinecap="round" fill="none" />
                </g>
                <g data-part="brow-r" transform={`translate(${EYE_RX} ${BROW_Y})`}>
                    <path d="M-14 2Q0-5 14 2" stroke={hairDark} strokeWidth="6" strokeLinecap="round" fill="none" />
                </g>

                {/* Nos: senka ispod i tačka svetla */}
                <path d="M113 137q7 8 14 0" stroke={skinDark} strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <ellipse cx="118" cy="129" rx="4" ry="3" fill="#fff" opacity="0.45" />

                {/* Obrazi */}
                <circle data-part="blush-l" cx="76" cy="146" r="16" fill={fill("blush")} opacity={rest.blush} />
                <circle data-part="blush-r" cx="164" cy="146" r="16" fill={fill("blush")} opacity={rest.blush} />

                {/* Usta */}
                <path data-part="mouth" d={restMouth} fill={fill("inside")} stroke={MOUTH_STROKE} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
                <g clipPath={`url(#${id("mouth")})`}>
                    <rect data-part="teeth" x={MOUTH_X - 26} y={MOUTH_Y - 6} width="52" height="0" fill="#fff" />
                    <ellipse data-part="tongue" cx={MOUTH_X} cy={MOUTH_Y + 10} rx="11" ry="0" fill={TONGUE} />
                </g>

                {/* Kosa sa odsjajem */}
                {female ? (
                    <>
                        <path d="M50 112C44 58 82 28 122 28c44 0 74 30 68 82-6-23-18-35-34-41-22 23-72 23-106 43z" fill={fill("hair")} />
                        <path d="M70 66c14-18 36-27 58-26" stroke="#fff" strokeOpacity="0.28" strokeWidth="9" strokeLinecap="round" fill="none" />
                    </>
                ) : (
                    <>
                        <path d="M49 108C43 52 80 24 122 24c46 0 78 28 70 84-4-21-18-37-38-41-24-5-48 6-69-2-18 10-32 24-36 43z" fill={fill("hair")} />
                        <path d="M72 60c14-16 34-23 56-22" stroke="#fff" strokeOpacity="0.25" strokeWidth="9" strokeLinecap="round" fill="none" />
                    </>
                )}
            </g>
        </svg>
    );
}
