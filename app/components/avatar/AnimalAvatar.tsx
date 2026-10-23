"use client";

// Drugar životinja (mačka, pas, zeka, meda): isti „kostur” kao učitelj (faceRig.ts), pa
//  • izraz lica prati emociju rečenice, usta se pomeraju dok govori, oči trepću
//  • miruje kad je uključeno „manje pokreta”
//  • nosi iste predmete iz prodavnice (oči, usta, vrat i ramena su na istim mestima)
// Lica su namerno mirna i prijateljska: velike oči, meke boje, bez zuba.
//
// Krzno (boja i šare) dolazi iz skins.ts. Šare se crtaju u SVG šari (<pattern>) u koordinatama
// crteža: glava, uši, kapci i rep je dele, pa kapak koji se podiže preko oka ima istu fleku
// kao lice. Id-jevi šara su jedinstveni po liku (useId), pa se drugari na istoj strani ne mešaju.

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
import { animalSkin, type AnimalKind, type Coat } from "./skins";
import { renderWorn, wornItem, type Wear } from "./wearables";

export type { AnimalKind } from "./skins";

/** Majica po vrsti (svetlo i senka); krzno može da je promeni kad se slabo vidi */
const TOPS: Record<AnimalKind, [string, string]> = {
    cat: ["#86D8CD", "#3FA89B"],
    dog: ["#96C9FF", "#3D86E0"],
    bunny: ["#FFB8CB", "#E9708F"],
    bear: ["#FFC27A", "#EA7B24"],
};

const WHISKERS: Partial<Record<AnimalKind, string>> = { cat: "#C98A55", bunny: "#B9AECB" };

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
    /** Krzno iz skins.ts (bez njega ili nepoznato: dosadašnje) */
    skin?: string;
    className?: string;
}

export default function AnimalAvatar({ kind, variant = "bust", emotion: fixedEmotion, wear, skin, className }: AnimalAvatarProps) {
    const coat = animalSkin(kind, skin).coat;
    const top = coat.top ?? TOPS[kind];
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
    const [furLight, furMid, furDark] = coat.fur;
    const [pawLight, pawMid] = coat.paw ?? [furLight, furMid];
    // Krzno sa šarom ide kroz <pattern>; obično krzno ostaje isti preliv kao ranije
    const fur = coat.pattern ? fill("coat") : fill("fur");
    const mouthStroke = coat.mouthStroke ?? MOUTH_STROKE;
    const sleeve = wornItem(wear, "outfit")?.sleeve ?? top[1];

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
            <circle cx="-7" cy="-8" r="3.6" fill={coat.inner} />
            <circle cy="-11" r="3.6" fill={coat.inner} />
            <circle cx="7" cy="-8" r="3.6" fill={coat.inner} />
            <ellipse cy="3" rx="7" ry="5.5" fill={coat.inner} />
        </g>
    );

    /** Šapa celog lika (spuštena ruka) */
    const fist = (x: number, y: number) => (
        <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="13.5" fill={fill("paw")} />
            <circle cx={x - 5} cy={y + 4} r="2.6" fill={coat.inner} />
            <circle cx={x} cy={y + 6} r="2.6" fill={coat.inner} />
            <circle cx={x + 5} cy={y + 4} r="2.6" fill={coat.inner} />
        </g>
    );

    /** Stopala (šape) celog lika, kad dete nije izabralo obuću */
    const bareFeet = (
        <>
            {[97, 143].map((x) => (
                <g key={x}>
                    <ellipse cx={x} cy="402" rx="19" ry="10" fill={fill("paw")} />
                    <path d={`M${x - 6} 400V407M${x} 399V408M${x + 6} 400V407`} stroke={furDark} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
                </g>
            ))}
        </>
    );

    const whisker = coat.whisker ?? WHISKERS[kind];

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
                {coat.pattern && (
                    <>
                        {/* Svetlo preko šara: fleke i pruge imaju istu oblinu kao glava */}
                        <radialGradient id={id("coat-light")} gradientUnits="userSpaceOnUse" cx="96" cy="84" r="128">
                            <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
                            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
                            <stop offset="0.75" stopColor="#3A1E12" stopOpacity="0" />
                            <stop offset="1" stopColor="#3A1E12" stopOpacity="0.2" />
                        </radialGradient>
                        <pattern id={id("coat")} patternUnits="userSpaceOnUse" x="0" y="0" width="240" height="420">
                            <rect width="240" height="420" fill={fill("fur")} />
                            {coatMarks(coat)}
                            <rect width="240" height="420" fill={fill("coat-light")} />
                        </pattern>
                    </>
                )}
                <radialGradient id={id("paw")} cx="0.35" cy="0.3" r="0.8">
                    <stop offset="0" stopColor={pawLight} />
                    <stop offset="1" stopColor={pawMid} />
                </radialGradient>
                <linearGradient id={id("neck")} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={furDark} />
                    <stop offset="1" stopColor={furMid} />
                </linearGradient>
                <linearGradient id={id("top")} gradientUnits="userSpaceOnUse" x1="60" y1="200" x2="180" y2="290">
                    <stop offset="0" stopColor={top[0]} />
                    <stop offset="1" stopColor={top[1]} />
                </linearGradient>
                <radialGradient id={id("iris")} cx="0.5" cy="0.62" r="0.6">
                    <stop offset="0" stopColor={coat.iris[0]} />
                    <stop offset="1" stopColor={coat.iris[1]} />
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
                    {tail(kind, coat, fur)}
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
            <path d="M94 206Q120 226 146 206" stroke={top[1]} strokeWidth="6" strokeLinecap="round" fill="none" />
            {renderWorn(wear, "outfit", { variant, kind })}
            {full && fullFeet(wear, kind, bareFeet, pawMid)}
            <rect x="97" y="160" width="46" height="54" rx="18" fill={fill("neck")} />
            <ellipse cx="120" cy="176" rx="26" ry="13" fill={fill("shade")} />
            {full && fullBackFront(wear, kind)}
            {renderWorn(wear, "neck", { variant, kind })}

            {/* Ceo lik: šape vise pored tela, desna drži predmet iz prodavnice */}
            {full && fullArms(sleeve, pawMid, fist)}
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
                {ears(kind, coat, fur)}
                <circle cx={HEAD_CX} cy={HEAD_CY} r={HEAD_R} fill={fur} />
                {markings(kind, coat, fur)}
                <ellipse cx="92" cy="72" rx="34" ry="20" fill={fill("glow")} opacity="0.55" />

                {/* Oči i donji kapci (u boji krzna, podižu se kad se lice smeje) */}
                {eye(EYE_LX, "eye-l")}
                {eye(EYE_RX, "eye-r")}
                <ellipse data-part="lid-l" cx={EYE_LX} cy={EYE_Y + LID_REST} rx="19" ry="12" fill={fur} />
                <ellipse data-part="lid-r" cx={EYE_RX} cy={EYE_Y + LID_REST} rx="19" ry="12" fill={fur} />

                {/* Njuška i nos */}
                <ellipse cx="120" cy="151" rx="34" ry="25" fill={coat.muzzle} />
                <ellipse cx="110" cy="141" rx="14" ry="7" fill="#fff" opacity="0.4" />
                {nose(kind, coat)}
                <path d="M120 143V150" stroke={mouthStroke} strokeWidth="3" strokeLinecap="round" />
                {whisker && (
                    <path
                        d={`M86 146L52 140M86 153L50 155M88 160L56 168${mirrorX("M86 146L52 140M86 153L50 155M88 160L56 168")}`}
                        stroke={whisker}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        opacity="0.8"
                    />
                )}

                {/* Obrve: kratke i meke */}
                <g data-part="brow-l" transform={`translate(${EYE_LX} ${BROW_Y})`}>
                    <path d="M-10 2Q0-4 10 2" stroke={coat.brow} strokeWidth="5" strokeLinecap="round" fill="none" />
                </g>
                <g data-part="brow-r" transform={`translate(${EYE_RX} ${BROW_Y})`}>
                    <path d="M-10 2Q0-4 10 2" stroke={coat.brow} strokeWidth="5" strokeLinecap="round" fill="none" />
                </g>

                {/* Obrazi */}
                <circle data-part="blush-l" cx="76" cy="146" r="16" fill={fill("blush")} opacity={POSES.neutral.blush} />
                <circle data-part="blush-r" cx="164" cy="146" r="16" fill={fill("blush")} opacity={POSES.neutral.blush} />

                {/* Usta (bez zuba) */}
                <path data-part="mouth" d={REST_MOUTH} fill={fill("inside")} stroke={mouthStroke} strokeWidth="4.5" strokeLinejoin="round" strokeLinecap="round" />
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

// ── Šare krzna ────────────────────────────────────────────────────────────────

/** Iskrica sa četiri kraka */
const sparklePath = (x: number, y: number, s: number) => `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

/** Tačkice dalmatinca: (x, y, poluprečnik), glava i rep */
const DALMATIAN_SPOTS: [number, number, number][] = [
    [88, 60, 7],
    [150, 52, 9],
    [174, 90, 6],
    [62, 120, 6],
    [180, 140, 7],
    [106, 80, 4],
    [138, 78, 5],
    [68, 152, 5],
    [128, 56, 4],
    [162, 170, 5],
    [82, 176, 4],
    [74, 316, 4],
    [62, 302, 3.5],
];

/** Crtež šare u koordinatama crteža (unutar <pattern>, preko osnovne boje krzna) */
function coatMarks(coat: Coat): ReactNode {
    const [a = "#000", b = a] = coat.marks ?? [];
    switch (coat.pattern) {
        case "tuxedo":
            // Tamno teme i uši, belo lice sa belom prugom do čela
            return <path d="M0 0H240V104Q200 96 160 100Q134 98 126 64L120 52L114 64Q106 98 80 100Q40 96 0 104Z" fill={a} />;
        case "calico":
            return (
                <>
                    <path d="M0 0H116Q112 60 92 84Q70 104 40 112L0 118Z" fill={a} />
                    <path d="M128 0H240V122Q214 112 186 100Q158 86 140 60Q130 40 128 0Z" fill={b} />
                    <ellipse cx="172" cy="150" rx="12" ry="9" fill={a} />
                </>
            );
        case "tiger":
            return (
                <path
                    d="M120 46V72M103 50L107 70M137 50L133 70M88 58L93 74M152 58L147 74M54 112Q66 112 78 120M56 128Q66 130 76 134M186 112Q174 112 162 120M184 128Q174 130 164 134M78 318L74 332M62 316L56 330M48 306L36 310M44 292L34 290"
                    stroke={a}
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.85"
                />
            );
        case "points":
            // Sijamska: tamnija njuška i osnova ušiju (uši, šape i rep su u svojoj boji)
            return (
                <>
                    <ellipse cx="120" cy="148" rx="46" ry="38" fill={a} opacity="0.35" />
                    <ellipse cx="120" cy="150" rx="34" ry="28" fill={a} opacity="0.35" />
                    <circle cx="70" cy="60" r="24" fill={a} opacity="0.3" />
                    <circle cx="170" cy="60" r="24" fill={a} opacity="0.3" />
                </>
            );
        case "spots":
            return (
                <>
                    {DALMATIAN_SPOTS.map(([x, y, r]) => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={a} />
                    ))}
                </>
            );
        case "husky":
            // Sivo teme sa klinom do nosa, belo lice i bele tačke iznad očiju
            return (
                <>
                    <path d="M0 0H240V112Q206 100 178 100Q154 98 140 88Q128 96 124 126L120 134L116 126Q112 96 100 88Q86 98 62 100Q34 100 0 112Z" fill={a} />
                    <circle cx="88" cy="84" r="8" fill="#fff" />
                    <circle cx="152" cy="84" r="8" fill="#fff" />
                </>
            );
        case "blaze":
            // Bigl: bela pruga od čela do njuške
            return <path d="M110 44Q120 40 130 44L128 96Q146 120 152 160H88Q94 120 112 96Z" fill={a} />;
        case "dutch":
            // Crno-beli zeka: tamno oko očiju i na temenu, bela pruga po sredini i beli obrazi
            return <path d="M0 0H240V170L156 160Q136 130 130 100L126 60L120 50L114 60L110 100Q104 130 84 160L0 170Z" fill={a} />;
        case "panda":
            return (
                <>
                    <ellipse cx="90" cy="118" rx="21" ry="27" transform="rotate(28 90 118)" fill={a} />
                    <ellipse cx="150" cy="118" rx="21" ry="27" transform="rotate(-28 150 118)" fill={a} />
                </>
            );
        case "gold":
            return (
                <>
                    <path d="M60 92Q96 50 152 48" stroke="#fff" strokeOpacity="0.35" strokeWidth="14" strokeLinecap="round" fill="none" />
                    <path d={`${sparklePath(76, 66, 8)}${sparklePath(162, 60, 6)}${sparklePath(178, 128, 6)}${sparklePath(64, 140, 4.5)}${sparklePath(66, 306, 5)}`} fill={a} opacity="0.9" />
                </>
            );
        case "rainbow": {
            const colors = coat.marks ?? [];
            return (
                <>
                    {Array.from({ length: 18 }, (_, index) => (
                        <rect key={index} y={20 + index * 24} width="240" height="24" fill={colors[index % colors.length]} opacity="0.9" />
                    ))}
                </>
            );
        }
        default:
            return null;
    }
}

// ── Delovi po vrsti ───────────────────────────────────────────────────────────

/** Uši u svojoj boji (leva, desna) ili u boji krzna */
function earFills(coat: Coat, fur: string): [string, string] {
    return coat.ears ?? [fur, fur];
}

/** Uspravne trouglaste uši (mačka, haski) */
function pointyEars(coat: Coat, fur: string): ReactNode {
    const outer = "M58 98L63 34Q65 25 74 29L114 50Z";
    const inner = "M68 82L71 42Q72 37 77 40L102 56Z";
    const [left, right] = earFills(coat, fur);
    return (
        <>
            <path d={outer} fill={left} stroke={coat.fur[2]} strokeOpacity="0.35" strokeWidth="2" strokeLinejoin="round" />
            <path d={mirrorX(outer)} fill={right} stroke={coat.fur[2]} strokeOpacity="0.35" strokeWidth="2" strokeLinejoin="round" />
            <path d={inner} fill={coat.inner} />
            <path d={mirrorX(inner)} fill={coat.inner} />
        </>
    );
}

function ears(kind: AnimalKind, coat: Coat, fur: string): ReactNode {
    const [left, right] = earFills(coat, fur);
    switch (kind) {
        case "cat":
            return pointyEars(coat, fur);
        case "bunny":
            return (
                <>
                    <g transform="rotate(-20 86 40)">
                        <ellipse cx="86" cy="40" rx="16" ry="36" fill={left} />
                        <ellipse cx="86" cy="42" rx="8" ry="26" fill={coat.inner} />
                    </g>
                    <g transform="rotate(20 154 40)">
                        <ellipse cx="154" cy="40" rx="16" ry="36" fill={right} />
                        <ellipse cx="154" cy="42" rx="8" ry="26" fill={coat.inner} />
                    </g>
                </>
            );
        case "bear":
            if (coat.earShape === "fluffy") {
                // Koala: krupne čupave uši sa belim krznom unutra
                return (
                    <>
                        <circle cx="60" cy="64" r="30" fill={left} />
                        <circle cx="180" cy="64" r="30" fill={right} />
                        <circle cx="62" cy="66" r="18" fill={coat.inner} />
                        <circle cx="178" cy="66" r="18" fill={coat.inner} />
                        <path d="M48 60L40 54M50 72L40 74M192 60L200 54M190 72L200 74" stroke={coat.inner} strokeWidth="4" strokeLinecap="round" />
                    </>
                );
            }
            return (
                <>
                    <circle cx="66" cy="58" r="23" fill={left} />
                    <circle cx="174" cy="58" r="23" fill={right} />
                    <circle cx="68" cy="60" r="12" fill={coat.inner} />
                    <circle cx="172" cy="60" r="12" fill={coat.inner} />
                </>
            );
        case "dog":
            return coat.earShape === "pointy" ? pointyEars(coat, fur) : null;
    }
}

/** Kovrdže: krugovi sa tankim obrisom, da se vidi svaka */
function curls(points: [number, number, number][], color: string, edge: string): ReactNode {
    return (
        <>
            {points.map(([x, y, r]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={color} stroke={edge} strokeOpacity="0.35" strokeWidth="2" />
            ))}
        </>
    );
}

const POODLE_EAR: [number, number, number][] = [
    [56, 76, 15],
    [44, 96, 17],
    [42, 120, 17],
    [50, 142, 15],
];
const POODLE_TOP: [number, number, number][] = [
    [96, 54, 14],
    [144, 54, 14],
    [108, 42, 13],
    [132, 42, 13],
    [120, 48, 15],
];

/** Šare preko glave (iznad očiju, pa ih kapa slobodno prekriva) i uši psa koje padaju pored lica */
function markings(kind: AnimalKind, coat: Coat, fur: string): ReactNode {
    switch (kind) {
        case "cat":
            return coat.stripes ? <path d="M120 48V64M104 50L107 63M136 50L133 63" stroke={coat.stripes} strokeOpacity="0.55" strokeWidth="4.5" strokeLinecap="round" /> : null;
        case "dog": {
            if (coat.earShape === "pointy") return null;
            const [left, right] = earFills(coat, fur);
            if (coat.earShape === "curly") {
                return (
                    <>
                        {curls(POODLE_EAR, left, coat.fur[2])}
                        {curls(
                            POODLE_EAR.map(([x, y, r]) => [240 - x, y, r]),
                            right,
                            coat.fur[2]
                        )}
                        {coat.topknot && curls(POODLE_TOP, coat.fur[0], coat.fur[2])}
                    </>
                );
            }
            const ear = "M70 54Q42 54 36 104Q32 138 50 148Q66 152 70 124Q73 90 84 62Z";
            const shine = "M62 66Q48 80 46 110";
            return (
                <>
                    {coat.spot && <ellipse cx="146" cy="58" rx="20" ry="13" fill={coat.spot} opacity="0.55" />}
                    <path d={ear} fill={left} />
                    <path d={mirrorX(ear)} fill={right} />
                    <path d={shine} stroke="#fff" strokeOpacity="0.25" strokeWidth="5" strokeLinecap="round" fill="none" />
                </>
            );
        }
        default:
            return null;
    }
}

/** Rep celog lika: iza leve noge, ne smeta ljubimcu ni predmetu u ruci */
function tail(kind: AnimalKind, coat: Coat, fur: string): ReactNode {
    switch (kind) {
        case "cat":
            return <path d="M92 318Q58 336 44 312Q36 296 46 284" stroke={coat.tail ?? fur} strokeWidth="13" strokeLinecap="round" fill="none" />;
        case "dog":
            return <path d="M90 316Q66 318 58 296" stroke={coat.tail ?? fur} strokeWidth="13" strokeLinecap="round" fill="none" />;
        case "bunny":
            return <circle cx="78" cy="320" r="11" fill={coat.tail ?? "#fff"} />;
        case "bear":
            return <circle cx="78" cy="320" r="11" fill={coat.tail ?? coat.fur[1]} />;
    }
}

function nose(kind: AnimalKind, coat: Coat): ReactNode {
    if (coat.bigNose) {
        // Koala: krupan uspravan nos
        return (
            <>
                <ellipse cx="120" cy="134" rx="13" ry="16" fill={coat.nose} />
                <ellipse cx="115" cy="127" rx="4" ry="3" fill="#fff" opacity="0.45" />
            </>
        );
    }
    switch (kind) {
        case "cat":
        case "bunny":
            return (
                <>
                    <path d="M111 134Q120 130 129 134Q126 141 120 144Q114 141 111 134Z" fill={coat.nose} />
                    <ellipse cx="117" cy="134.5" rx="3" ry="1.6" fill="#fff" opacity="0.6" />
                </>
            );
        case "dog":
        case "bear":
            return (
                <>
                    <ellipse cx="120" cy="137" rx={kind === "dog" ? 12 : 10.5} ry={kind === "dog" ? 8.5 : 7.5} fill={coat.nose} />
                    <ellipse cx="116" cy="134" rx="4" ry="2.2" fill="#fff" opacity="0.5" />
                </>
            );
    }
}
