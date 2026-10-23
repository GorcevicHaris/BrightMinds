"use client";

// Drugar životinja (mačka, pas, zeka, meda): isti „kostur” kao učitelj (faceRig.ts), pa
//  • izraz lica prati emociju rečenice, usta se pomeraju dok govori, oči trepću
//  • miruje kad je uključeno „manje pokreta”
//  • nosi iste predmete iz prodavnice (oči, usta, vrat i ramena su na istim mestima)
// Lica su namerno mirna i prijateljska: velike oči, meke boje, bez zuba.

import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FACE_FOR_EMOTION, type VoiceEmotion } from "@/lib/emotion";
import { useVoiceState } from "@/lib/voice";
import { useChildSettings } from "../ChildSettingsProvider";
import { POSES, REST_MOUTH, useFaceRig } from "./faceRig";
import {
    BROW_Y,
    EYE_LX,
    EYE_RX,
    EYE_Y,
    HAND_DOWN_Y,
    HAND_LX,
    HAND_RX,
    HEAD_CX,
    HEAD_CY,
    HEAD_R,
    LID_REST,
    MOUTH_X,
    MOUTH_Y,
    FULL_TORSO_PATH,
    TORSO_PATH,
    VIEWBOX,
} from "./geometry";
import { fullArms, fullBackFront, fullBehind, fullFeet, fullHand, fullLegs, fullPet } from "./fullBody";
import { renderWorn, wornItem, type Wear } from "./wearables";

export type AnimalKind = "cat" | "dog" | "bunny" | "bear";

interface Look {
    /** Krzno: osvetljeni deo, osnovna boja i senka */
    fur: [string, string, string];
    /** Njuška (svetliji deo oko nosa i usta) */
    muzzle: string;
    /** Unutrašnjost uha / jastučići šapa */
    inner: string;
    nose: string;
    brow: string;
    /** Dužica: svetlo i tamno */
    iris: [string, string];
    /** Majica: svetlo i senka */
    top: [string, string];
}

const LOOKS: Record<AnimalKind, Look> = {
    cat: {
        fur: ["#FFE3BD", "#F7B771", "#D98C43"],
        muzzle: "#FFF4E3",
        inner: "#F7A9B6",
        nose: "#F08AA0",
        brow: "#B5672A",
        iris: ["#B9DA6A", "#4F7A18"],
        top: ["#86D8CD", "#3FA89B"],
    },
    dog: {
        fur: ["#FFF2DC", "#EDCB9C", "#C99B63"],
        muzzle: "#FFF9EF",
        inner: "#F3C9A6",
        nose: "#3A2A2A",
        brow: "#8E5A33",
        iris: ["#B07A45", "#4A2A12"],
        top: ["#96C9FF", "#3D86E0"],
    },
    bunny: {
        fur: ["#FFFFFF", "#F2EDF7", "#CFC5DE"],
        muzzle: "#FFFFFF",
        inner: "#F9B9C9",
        nose: "#F08AA0",
        brow: "#A99BBE",
        iris: ["#8E78C8", "#33255E"],
        top: ["#FFB8CB", "#E9708F"],
    },
    bear: {
        fur: ["#E6BA8E", "#BC8656", "#8A5A30"],
        muzzle: "#F7E0C4",
        inner: "#F1CBA4",
        nose: "#4A2E1E",
        brow: "#6E4424",
        iris: ["#A87444", "#3A200C"],
        top: ["#FFC27A", "#EA7B24"],
    },
};

/** Uši psa (padaju pored glave): tamnije od lica */
const DOG_EAR = ["#B57B50", "#8A5732"] as const;

const MOUTH_STROKE = "#5A2C24";
const MOUTH_FILL = "#8F3333";
const TONGUE = "#F27C92";
const BLUSH = "#F58F8F";

const mirrorX = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${240 - Number(x)} ${y}`);

interface AnimalAvatarProps {
    kind: AnimalKind;
    /** `bust` = glava i ramena (može da maše); `face` = samo lice, za mala mesta; `full` = ceo lik */
    variant?: "bust" | "face" | "full";
    /** Stalna emocija, umesto one iz govora (pregled i primeri) */
    emotion?: VoiceEmotion;
    /** Predmeti iz prodavnice (na poprsju i licu: kapa, naočare, oko vrata, odeća; na celom liku sve) */
    wear?: Wear;
    className?: string;
}

export default function AnimalAvatar({ kind, variant = "bust", emotion: fixedEmotion, wear, className }: AnimalAvatarProps) {
    const look = LOOKS[kind];
    const full = variant === "full";
    const voice = useVoiceState();
    const settings = useChildSettings();
    const uid = useId();

    const emotion = fixedEmotion ?? voice.emotion;
    const speaking = fixedEmotion ? false : voice.speaking;
    const { expression, gesture } = FACE_FOR_EMOTION[emotion];

    const svgRef = useRef<SVGSVGElement>(null);
    useFaceRig(svgRef, { expression, gesture, speaking, still: settings.reduceMotion });

    const id = (name: string) => `${uid}-${name}`;
    const fill = (name: string) => `url(#${id(name)})`;
    const [furLight, furMid, furDark] = look.fur;
    const sleeve = wornItem(wear, "outfit")?.sleeve ?? look.top[1];

    const eye = (x: number, part: string) => (
        <g data-part={part} transform={`translate(${x} ${EYE_Y})`}>
            <ellipse rx="13.5" ry="15" fill="#2A1D18" />
            <ellipse cy="2.5" rx="10" ry="11" fill={fill("iris")} />
            <circle cy="2.5" r="5" fill="#1B120D" />
            <circle cx="-4.6" cy="-5.2" r="4.8" fill="#fff" />
            <circle cx="4.2" cy="5.6" r="2.1" fill="#fff" opacity="0.8" />
        </g>
    );

    const paw = (part: string, x: number) => (
        <g data-part={part} transform={`translate(${x} ${HAND_DOWN_Y})`}>
            <circle r="17" fill={fill("paw")} />
            <circle cx="-7" cy="-8" r="3.6" fill={look.inner} />
            <circle cy="-11" r="3.6" fill={look.inner} />
            <circle cx="7" cy="-8" r="3.6" fill={look.inner} />
            <ellipse cy="3" rx="7" ry="5.5" fill={look.inner} />
        </g>
    );

    /** Šapa celog lika (spuštena ruka) */
    const fist = (x: number, y: number) => (
        <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="13.5" fill={fill("paw")} />
            <circle cx={x - 5} cy={y + 4} r="2.6" fill={look.inner} />
            <circle cx={x} cy={y + 6} r="2.6" fill={look.inner} />
            <circle cx={x + 5} cy={y + 4} r="2.6" fill={look.inner} />
        </g>
    );

    /** Stopala (šape) celog lika, kad dete nije izabralo obuću */
    const bareFeet = (
        <>
            {[97, 143].map((x) => (
                <g key={x}>
                    <ellipse cx={x} cy="402" rx="19" ry="10" fill={fill("paw")} />
                    <path d={`M${x - 6} 400V407M${x} 399V408M${x + 6} 400V407`} stroke={look.fur[2]} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
                </g>
            ))}
        </>
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
                    <path data-part="mouth-clip" d={REST_MOUTH} />
                </clipPath>
                {/* Isto svetlo za glavu, uši i kapke: kapak koji prekriva oko se ne vidi kao zakrpa */}
                <radialGradient id={id("fur")} gradientUnits="userSpaceOnUse" cx="96" cy="84" r="128">
                    <stop offset="0" stopColor={furLight} />
                    <stop offset="0.55" stopColor={furMid} />
                    <stop offset="1" stopColor={furDark} />
                </radialGradient>
                <radialGradient id={id("paw")} cx="0.35" cy="0.3" r="0.8">
                    <stop offset="0" stopColor={furLight} />
                    <stop offset="1" stopColor={furMid} />
                </radialGradient>
                <linearGradient id={id("neck")} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={furDark} />
                    <stop offset="1" stopColor={furMid} />
                </linearGradient>
                <linearGradient id={id("top")} gradientUnits="userSpaceOnUse" x1="60" y1="200" x2="180" y2="290">
                    <stop offset="0" stopColor={look.top[0]} />
                    <stop offset="1" stopColor={look.top[1]} />
                </linearGradient>
                <radialGradient id={id("iris")} cx="0.5" cy="0.62" r="0.6">
                    <stop offset="0" stopColor={look.iris[0]} />
                    <stop offset="1" stopColor={look.iris[1]} />
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

            {full && (
                <>
                    {fullBehind(wear, kind)}
                    {tail(kind, look, fill("fur"))}
                    {fullLegs(wear, fill("paw"))}
                </>
            )}

            {/* Telo: majica u boji lika, svetlo sleva odozgo */}
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
            <path d="M94 206Q120 226 146 206" stroke={look.top[1]} strokeWidth="6" strokeLinecap="round" fill="none" />
            {renderWorn(wear, "outfit", { variant, kind })}
            {full && fullFeet(wear, kind, bareFeet)}
            <rect x="97" y="160" width="46" height="54" rx="18" fill={fill("neck")} />
            <ellipse cx="120" cy="176" rx="26" ry="13" fill={fill("shade")} />
            {full && fullBackFront(wear, kind)}
            {renderWorn(wear, "neck", { variant, kind })}

            {/* Ceo lik: šape vise pored tela, desna drži predmet iz prodavnice */}
            {full && fullArms(sleeve, look.fur[1], fist)}
            {full && fullHand(wear, kind, fist)}

            {/* Šape (vide se samo kad su podignute), isečene na okvir crteža */}
            {!full && (
                <g clipPath={`url(#${id("frame")})`}>
                    <line data-part="sleeve-l" x1="50" y1="262" x2={HAND_LX} y2={HAND_DOWN_Y + 14} stroke={sleeve} strokeWidth="27" strokeLinecap="round" opacity="0" />
                    <line data-part="sleeve-r" x1="190" y1="262" x2={HAND_RX} y2={HAND_DOWN_Y + 14} stroke={sleeve} strokeWidth="27" strokeLinecap="round" opacity="0" />
                    {paw("arm-l", HAND_LX)}
                    {paw("arm-r", HAND_RX)}
                </g>
            )}

            {/* Glava */}
            <g data-part="head">
                {ears(kind, look, fill("fur"))}
                <circle cx={HEAD_CX} cy={HEAD_CY} r={HEAD_R} fill={fill("fur")} />
                {markings(kind, look)}
                <ellipse cx="92" cy="72" rx="34" ry="20" fill={fill("glow")} opacity="0.55" />

                {/* Oči i donji kapci (u boji krzna, podižu se kad se lice smeje) */}
                {eye(EYE_LX, "eye-l")}
                {eye(EYE_RX, "eye-r")}
                <ellipse data-part="lid-l" cx={EYE_LX} cy={EYE_Y + LID_REST} rx="19" ry="12" fill={fill("fur")} />
                <ellipse data-part="lid-r" cx={EYE_RX} cy={EYE_Y + LID_REST} rx="19" ry="12" fill={fill("fur")} />

                {/* Njuška i nos */}
                <ellipse cx="120" cy="151" rx="34" ry="25" fill={look.muzzle} />
                <ellipse cx="110" cy="141" rx="14" ry="7" fill="#fff" opacity="0.4" />
                {nose(kind, look)}
                <path d="M120 143V150" stroke={MOUTH_STROKE} strokeWidth="3" strokeLinecap="round" />
                {(kind === "cat" || kind === "bunny") && (
                    <path
                        d={`M86 146L52 140M86 153L50 155M88 160L56 168${mirrorX("M86 146L52 140M86 153L50 155M88 160L56 168")}`}
                        stroke={kind === "cat" ? "#C98A55" : "#B9AECB"}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        opacity="0.8"
                    />
                )}

                {/* Obrve: kratke i meke */}
                <g data-part="brow-l" transform={`translate(${EYE_LX} ${BROW_Y})`}>
                    <path d="M-10 2Q0-4 10 2" stroke={look.brow} strokeWidth="5" strokeLinecap="round" fill="none" />
                </g>
                <g data-part="brow-r" transform={`translate(${EYE_RX} ${BROW_Y})`}>
                    <path d="M-10 2Q0-4 10 2" stroke={look.brow} strokeWidth="5" strokeLinecap="round" fill="none" />
                </g>

                {/* Obrazi */}
                <circle data-part="blush-l" cx="76" cy="146" r="16" fill={fill("blush")} opacity={POSES.neutral.blush} />
                <circle data-part="blush-r" cx="164" cy="146" r="16" fill={fill("blush")} opacity={POSES.neutral.blush} />

                {/* Usta (bez zuba) */}
                <path data-part="mouth" d={REST_MOUTH} fill={fill("inside")} stroke={MOUTH_STROKE} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
                <g clipPath={`url(#${id("mouth")})`}>
                    <ellipse data-part="tongue" cx={MOUTH_X} cy={MOUTH_Y + 10} rx="11" ry="0" fill={TONGUE} />
                </g>

                {renderWorn(wear, "glasses", { variant, kind })}
                {renderWorn(wear, "hat", { variant, kind })}
            </g>

            {full && fullPet(wear, kind)}
        </svg>
    );
}

// ── Delovi po vrsti ───────────────────────────────────────────────────────────

function ears(kind: AnimalKind, look: Look, fur: string): ReactNode {
    switch (kind) {
        case "cat": {
            const outer = "M58 98L63 34Q65 25 74 29L114 50Z";
            const inner = "M68 82L71 42Q72 37 77 40L102 56Z";
            return (
                <>
                    <path d={outer} fill={fur} stroke={look.fur[2]} strokeOpacity="0.35" strokeWidth="2" strokeLinejoin="round" />
                    <path d={mirrorX(outer)} fill={fur} stroke={look.fur[2]} strokeOpacity="0.35" strokeWidth="2" strokeLinejoin="round" />
                    <path d={inner} fill={look.inner} />
                    <path d={mirrorX(inner)} fill={look.inner} />
                </>
            );
        }
        case "bunny":
            return (
                <>
                    <g transform="rotate(-20 86 40)">
                        <ellipse cx="86" cy="40" rx="16" ry="36" fill={fur} />
                        <ellipse cx="86" cy="42" rx="8" ry="26" fill={look.inner} />
                    </g>
                    <g transform="rotate(20 154 40)">
                        <ellipse cx="154" cy="40" rx="16" ry="36" fill={fur} />
                        <ellipse cx="154" cy="42" rx="8" ry="26" fill={look.inner} />
                    </g>
                </>
            );
        case "bear":
            return (
                <>
                    <circle cx="66" cy="58" r="23" fill={fur} />
                    <circle cx="174" cy="58" r="23" fill={fur} />
                    <circle cx="68" cy="60" r="12" fill={look.inner} />
                    <circle cx="172" cy="60" r="12" fill={look.inner} />
                </>
            );
        case "dog":
            return null;
    }
}

/** Šare preko glave (iznad očiju, pa ih kapa slobodno prekriva) i uši psa koje padaju pored lica */
function markings(kind: AnimalKind, look: Look): ReactNode {
    switch (kind) {
        case "cat":
            return <path d="M120 48V64M104 50L107 63M136 50L133 63" stroke={look.fur[2]} strokeOpacity="0.55" strokeWidth="4.5" strokeLinecap="round" />;
        case "dog": {
            const ear = "M70 54Q42 54 36 104Q32 138 50 148Q66 152 70 124Q73 90 84 62Z";
            const shine = "M62 66Q48 80 46 110";
            return (
                <>
                    <ellipse cx="146" cy="58" rx="20" ry="13" fill={DOG_EAR[0]} opacity="0.55" />
                    <path d={ear} fill={DOG_EAR[0]} />
                    <path d={mirrorX(ear)} fill={DOG_EAR[1]} />
                    <path d={shine} stroke="#fff" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" fill="none" />
                </>
            );
        }
        default:
            return null;
    }
}

/** Rep celog lika: iza leve noge, ne smeta ljubimcu ni predmetu u ruci */
function tail(kind: AnimalKind, look: Look, fur: string): ReactNode {
    switch (kind) {
        case "cat":
            return <path d="M92 318Q58 336 44 312Q36 296 46 284" stroke={fur} strokeWidth="13" strokeLinecap="round" fill="none" />;
        case "dog":
            return <path d="M90 316Q66 318 58 296" stroke={DOG_EAR[0]} strokeWidth="13" strokeLinecap="round" fill="none" />;
        case "bunny":
        case "bear":
            return <circle cx="78" cy="320" r="11" fill={kind === "bunny" ? "#fff" : look.fur[1]} />;
    }
}

function nose(kind: AnimalKind, look: Look): ReactNode {
    switch (kind) {
        case "cat":
        case "bunny":
            return (
                <>
                    <path d="M111 134Q120 130 129 134Q126 141 120 144Q114 141 111 134Z" fill={look.nose} />
                    <ellipse cx="117" cy="134.5" rx="3" ry="1.6" fill="#fff" opacity="0.6" />
                </>
            );
        case "dog":
        case "bear":
            return (
                <>
                    <ellipse cx="120" cy="137" rx={kind === "dog" ? 12 : 10.5} ry={kind === "dog" ? 8.5 : 7.5} fill={look.nose} />
                    <ellipse cx="116" cy="134" rx="4" ry="2.2" fill="#fff" opacity="0.5" />
                </>
            );
    }
}
