"use client";

// Učitelj / učiteljica: crtani lik koji govori sa detetom.
//  • izraz lica prati emociju rečenice (lib/emotion.ts)
//  • usta se pomeraju po jačini glasa (lib/voice.ts), oči povremeno trepnu
//  • jednostavno, čitljivo lice — bez sitnih detalja koji odvlače pažnju
// Sve se crta u SVG-u, ali sa svetlom i senkom kao kod 3D lika (oblina lica, sjaj u očima,
// odsjaj na kosi, senka ispod brade) — u istom duhu kao 3D slike životinja u igrama.
// Nema učitavanja modela, pa radi i na starijim tabletima.

import { useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { FACE_FOR_EMOTION, type VoiceEmotion } from "@/lib/emotion";
import { useVoiceState } from "@/lib/voice";
import { useChildSettings } from "../ChildSettingsProvider";
import { POSES, REST_MOUTH, useFaceRig } from "./faceRig";
import { fullArms, fullBackFront, fullBehind, fullFeet, fullHand, fullLegs, fullPet } from "./fullBody";
import { EYE_LX, EYE_RX, EYE_Y, FULL_TORSO_PATH, HAND_DOWN_Y, HAND_LX, HAND_RX, LID_REST, MOUTH_X, MOUTH_Y, TORSO_PATH, VIEWBOX, BROW_Y } from "./geometry";
import { mirror } from "./wear/art";
import { renderWorn, wornItem, type Wear } from "./wearables";

// Izrazi lica, geometrija i petlja crtanja su zajednički za sve likove: faceRig.ts, geometry.ts

/** Beonjača */
const EYE_RADIUS_X = 14;
const EYE_RADIUS_Y = 15.5;

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
    /** Ceo lik: pantalone (boja i senka) i cipele */
    pants: [string, string];
    shoes: string;
}

const LOOKS: Record<"male" | "female", Look> = {
    male: { skin: ["#FFE3C8", "#F4C39C", "#D99870"], hair: ["#8A5B3C", "#5C3A25", "#3A2316"], top: ["#FFD15C", "#EE9A06"], iris: ["#9A6A3A", "#3F2410"], pants: ["#4B5E8E", "#3A4A75"], shoes: "#5C3A25" },
    female: { skin: ["#FFE8D4", "#F8CEAC", "#E0A481"], hair: ["#B86B3C", "#8A4A26", "#5E2E15"], top: ["#FFA097", "#EC5B52"], iris: ["#7A9A4A", "#2F4016"], pants: ["#6A5AA8", "#54478A"], shoes: "#B5446E" },
};

const MOUTH_STROKE = "#6E2B2B";
const MOUTH_FILL = "#8F3333";
const TONGUE = "#F27C92";
const BLUSH = "#F58F8F";

/** Podrazumevane cipele celog lika (kad dete nije izabralo obuću) */
const SHOE = "M77 404Q75 388 92 386H102Q117 388 117 400V404Q117 410 109 410H83Q77 410 77 404Z";

// ── Komponenta ────────────────────────────────────────────────────────────────

interface TeacherAvatarProps {
    /** Pol deteta: dečak dobija učitelja, devojčica učiteljicu (isti izbor kao za glas) */
    gender?: string;
    /** `bust` = glava i ramena (može da maše); `face` = samo lice, za mala mesta; `full` = ceo lik */
    variant?: "bust" | "face" | "full";
    /** Stalna emocija, umesto one iz govora (pregled i primeri) */
    emotion?: VoiceEmotion;
    /** Predmeti iz prodavnice (na poprsju i licu: kapa, naočare, oko vrata, odeća; na celom liku sve) */
    wear?: Wear;
    className?: string;
}

export default function TeacherAvatar({ gender, variant = "bust", emotion: fixedEmotion, wear, className }: TeacherAvatarProps) {
    const female = gender?.toLowerCase() === "female";
    const look = LOOKS[female ? "female" : "male"];
    const kind = female ? "woman" : "man";
    const full = variant === "full";
    const voice = useVoiceState();
    const settings = useChildSettings();
    const uid = useId();

    const emotion = fixedEmotion ?? voice.emotion;
    const speaking = fixedEmotion ? false : voice.speaking;
    const { expression, gesture } = FACE_FOR_EMOTION[emotion];

    const svgRef = useRef<SVGSVGElement>(null);
    useFaceRig(svgRef, { expression, gesture, speaking, still: settings.reduceMotion });

    const rest = POSES.neutral;
    const restMouth = REST_MOUTH;
    const sleeve = wornItem(wear, "outfit")?.sleeve ?? look.top[1];
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

    /** Šaka celog lika (pesnica sa palcem) */
    const fist = (x: number, y: number) => (
        <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="13" fill={fill("hand")} />
            <circle cx={x + (x < 120 ? 9 : -9)} cy={y - 7} r="5.5" fill={fill("hand")} />
        </g>
    );

    return (
        <svg
            ref={svgRef}
            viewBox={VIEWBOX[variant]}
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

            {full && fullBehind(wear, kind)}

            {/* Kosa iza glave (učiteljica) */}
            {female && (
                <path d="M38 122C34 56 76 20 120 20s86 36 82 102v56c0 21-15 29-28 25l-3-80H69l-3 80c-13 4-28-4-28-25z" fill={fill("hair")} />
            )}

            {full && fullLegs(wear, skinMid, look.pants)}

            {/* Telo: svetlo pada sleva odozgo, ramena su zaobljena */}
            {full ? (
                <>
                    <path d={FULL_TORSO_PATH} fill={fill("top")} />
                    <ellipse cx="88" cy="238" rx="26" ry="24" fill={fill("glow")} opacity="0.5" />
                    <ellipse cx="120" cy="214" rx="52" ry="18" fill={fill("shade")} opacity="0.75" />
                </>
            ) : (
                <>
                    <path d={TORSO_PATH} fill={fill("top")} />
                    <ellipse cx="78" cy="232" rx="46" ry="20" fill={fill("glow")} opacity="0.5" />
                    <ellipse cx="120" cy="214" rx="62" ry="20" fill={fill("shade")} opacity="0.75" />
                </>
            )}
            {renderWorn(wear, "outfit", { variant, kind })}
            {full &&
                fullFeet(
                    wear,
                    kind,
                    <>
                        <path d={SHOE} fill={look.shoes} />
                        <path d={mirror(SHOE)} fill={look.shoes} />
                        <path d="M84 392Q90 389 98 389M142 389Q150 389 156 392" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </>
                )}
            <rect x="103" y="164" width="34" height="50" rx="14" fill={fill("neck")} />
            <ellipse cx="120" cy="178" rx="24" ry="13" fill={fill("shade")} />
            <path d="M95 204q25 36 50 0-25 14-50 0z" fill="#fff" />
            <path d="M95 204q25 14 50 0-25 9-50 0z" fill="#C9D2E0" opacity="0.7" />
            {full && fullBackFront(wear, kind)}
            {renderWorn(wear, "neck", { variant, kind })}

            {/* Ceo lik: ruke vise pored tela, desna drži predmet iz prodavnice */}
            {full && fullArms(sleeve, skinMid, fist)}
            {full && fullHand(wear, kind, fist)}

            {/* Ruke (vide se samo kad su podignute). Isečene su na okvir crteža: kad je mesto za
                lik uže od crteža, spuštene šake ne smeju da provire ispod ramena. */}
            {!full && (
            <g clipPath={`url(#${id("frame")})`}>
                <line data-part="sleeve-l" x1="50" y1="262" x2={HAND_LX} y2={HAND_DOWN_Y + 14} stroke={sleeve} strokeWidth="27" strokeLinecap="round" opacity="0" />
                <line data-part="sleeve-r" x1="190" y1="262" x2={HAND_RX} y2={HAND_DOWN_Y + 14} stroke={sleeve} strokeWidth="27" strokeLinecap="round" opacity="0" />
                <g data-part="arm-l" transform={`translate(${HAND_LX} ${HAND_DOWN_Y})`}>
                    <circle r="17" fill={fill("hand")} />
                    <circle cx="13" cy="-9" r="7" fill={fill("hand")} />
                </g>
                <g data-part="arm-r" transform={`translate(${HAND_RX} ${HAND_DOWN_Y})`}>
                    <circle r="17" fill={fill("hand")} />
                    <circle cx="-13" cy="-9" r="7" fill={fill("hand")} />
                </g>
            </g>
            )}

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

                {/* Naočare: preko očiju, ispod kose (drške nestaju pod kosom) */}
                {renderWorn(wear, "glasses", { variant, kind })}

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

                {/* Kapa: poslednja, preko kose */}
                {renderWorn(wear, "hat", { variant, kind })}
            </g>

            {full && fullPet(wear, kind)}
        </svg>
    );
}
