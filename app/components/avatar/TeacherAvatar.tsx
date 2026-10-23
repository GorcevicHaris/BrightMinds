"use client";

// Učitelj / učiteljica: crtani lik koji govori sa detetom.
//  • izraz lica prati emociju rečenice (lib/emotion.ts)
//  • usta se pomeraju po jačini glasa (lib/voice.ts), oči povremeno trepnu
//  • jednostavno, čitljivo lice — bez sitnih detalja koji odvlače pažnju
// Sve se crta u SVG-u, ali sa svetlom i senkom kao kod 3D lika (oblina lica, sjaj u očima,
// odsjaj na kosi, senka ispod brade) — u istom duhu kao 3D slike životinja u igrama.
// Nema učitavanja modela, pa radi i na starijim tabletima.
// Boja kože, boja kose i frizura dolaze iz skins.ts (uvek besplatno); bez izbora — dosadašnji izgled.
// Ceo lik i portret se mirno kreću (diše, kosa se leluja, mahne kad pozdravlja): motion.ts.

import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { FACE_FOR_EMOTION, type VoiceEmotion } from "@/lib/emotion";
import { useVoiceState } from "@/lib/voice";
import { POSES, REST_MOUTH, useFaceRig } from "./faceRig";
import { fullArms, fullBack, fullBackFront, fullFeet, fullLegs, fullMotion, fullPet, fullScene } from "./fullBody";
import { EYE_LX, EYE_RX, EYE_Y, FULL_TORSO_PATH, HAND_DOWN_Y, HAND_LX, HAND_RX, LID_REST, MOUTH_X, MOUTH_Y, TORSO_PATH, VIEWBOX, BROW_Y } from "./geometry";
import { liveClass, sayMove, useCalmMotion, useCompanionMotion, type CompanionAction } from "./motion";
import { hairColors, humanLook, toneColors } from "./skins";
import { mirror } from "./wear/art";
import { renderWorn, wornItem, type Wear } from "./wearables";

// Izrazi lica, geometrija i petlja crtanja su zajednički za sve likove: faceRig.ts, geometry.ts

/** Beonjača */
const EYE_RADIUS_X = 14;
const EYE_RADIUS_Y = 15.5;

// ── Izgled likova ─────────────────────────────────────────────────────────────

interface Look {
    /** Odeća: svetlo i senka */
    top: [string, string];
    /** Dužica oka: svetlo i tamno */
    iris: [string, string];
    /** Ceo lik: pantalone (boja i senka) i cipele */
    pants: [string, string];
    shoes: string;
}

const LOOKS: Record<"male" | "female", Look> = {
    male: { top: ["#FFD15C", "#EE9A06"], iris: ["#9A6A3A", "#3F2410"], pants: ["#4B5E8E", "#3A4A75"], shoes: "#5C3A25" },
    female: { top: ["#FFA097", "#EC5B52"], iris: ["#7A9A4A", "#2F4016"], pants: ["#6A5AA8", "#54478A"], shoes: "#B5446E" },
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
    variant?: "bust" | "face" | "full" | "portrait";
    /** Stalna emocija, umesto one iz govora (pregled i primeri) */
    emotion?: VoiceEmotion;
    /** Predmeti iz prodavnice (na poprsju i licu: kapa, naočare, oko vrata, odeća; na celom liku sve) */
    wear?: Wear;
    /** Izgled iz skins.ts: `<koža>.<kosa>.<frizura>` (bez njega ili nepoznat: dosadašnji) */
    skin?: string;
    /** Jednokratni pokret celog lika (motion.ts); ponavlja se kad se promeni `actionKey` */
    action?: CompanionAction;
    actionKey?: number | string;
    /** Bez ikakvih pokreta (sličice) */
    still?: boolean;
    className?: string;
}

export default function TeacherAvatar({ gender, variant = "bust", emotion: fixedEmotion, wear, skin, action, actionKey, still = false, className }: TeacherAvatarProps) {
    const female = gender?.toLowerCase() === "female";
    const look = LOOKS[female ? "female" : "male"];
    const kind = female ? "woman" : "man";
    const human = humanLook(kind, skin);
    // Portret je isti crtež kao ceo lik, samo isečen na gornji deo
    const full = variant === "full" || variant === "portrait";
    const art = full ? "full" : variant;
    const voice = useVoiceState();
    // Smanjeno kretanje gasi i lice; `still` (sličica) samo pokrete celog lika
    const reduced = useCalmMotion();
    const calm = reduced || still;
    const uid = useId();

    const emotion = fixedEmotion ?? voice.emotion;
    const speaking = fixedEmotion ? false : voice.speaking;
    const { expression, gesture } = FACE_FOR_EMOTION[emotion];

    const svgRef = useRef<SVGSVGElement>(null);
    useFaceRig(svgRef, { expression, gesture, speaking, still: reduced });
    useCompanionMotion(svgRef, { action, actionKey, wear, full, calm });

    const rest = POSES.neutral;
    const restMouth = REST_MOUTH;
    const sleeve = wornItem(wear, "outfit")?.sleeve ?? look.top[1];
    // Preliv kože je zadat u koordinatama crteža: sve što je u boji kože (lice, uši, kapci)
    // deli isto svetlo, pa se kapak koji prekriva oko ne vidi kao zakrpa.
    const id = (name: string) => `${uid}-${name}`;
    const fill = (name: string) => `url(#${id(name)})`;
    const [skinLight, skinMid, skinDark] = toneColors(human.tone);
    const [hairLight, hairMid, hairDark] = hairColors(human.hair);
    const hair = hairArt(human.style, fill("hair"), hairDark);

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

    const nodWrap = (head: ReactNode) => (full ? <g className="cm-nod">{head}</g> : head);

    // Lik (sve osim pozadine i ljubimca); na celom liku je u grupama koje se mirno pokreću
    const body = (
        <>
            {full && fullBack(wear, kind)}

            {/* Kosa iza glave (do ramena, duga kosa, rep, pletenice): na celom liku se blago leluja */}
            {full ? <g className="cm-hair">{hair.back}</g> : hair.back}

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
            {renderWorn(wear, "outfit", { variant: art, kind })}
            {full &&
                fullFeet(
                    wear,
                    kind,
                    <>
                        <path d={SHOE} fill={look.shoes} />
                        <path d={mirror(SHOE)} fill={look.shoes} />
                        <path d="M84 392Q90 389 98 389M142 389Q150 389 156 392" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" fill="none" />
                    </>,
                    skinMid
                )}
            <rect x="103" y="164" width="34" height="50" rx="14" fill={fill("neck")} />
            <ellipse cx="120" cy="178" rx="24" ry="13" fill={fill("shade")} />
            <path d="M95 204q25 36 50 0-25 14-50 0z" fill="#fff" />
            <path d="M95 204q25 14 50 0-25 9-50 0z" fill="#C9D2E0" opacity="0.7" />
            {full && fullBackFront(wear, kind)}
            {renderWorn(wear, "neck", { variant: art, kind })}

            {/* Ceo lik: ruke vise pored tela, desna drži predmet iz prodavnice */}
            {full && fullArms(wear, kind, sleeve, skinMid, fist)}

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

            {/* Glava (na celom liku u grupi za klimanje uz nežne reči) */}
            {nodWrap(
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
                    {renderWorn(wear, "glasses", { variant: art, kind })}

                    {/* Kosa sa odsjajem */}
                    {hair.front}

                    {/* Kapa: poslednja, preko kose */}
                    {renderWorn(wear, "hat", { variant: art, kind })}
                </g>
            )}
        </>
    );

    return (
        <svg
            ref={svgRef}
            viewBox={VIEWBOX[variant]}
            className={cn("pointer-events-none block select-none", liveClass(full, calm), className)}
            data-say={full && speaking && !calm ? sayMove(emotion) : undefined}
            data-holding={full && wornItem(wear, "hand") ? "" : undefined}
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

            {full && fullScene(wear, kind)}
            {full ? fullMotion(body) : body}
            {full && fullPet(wear, kind)}
        </svg>
    );
}

// ── Frizure ───────────────────────────────────────────────────────────────────
// Kosa je u istom okviru kao dosadašnja (teme do y ≈ 18, strane x ≈ 36–204), pa kape iz
// prodavnice i dalje sede kako treba. Duga kosa pada iza ramena (trup je preko nje).

/** Kosa iza glave (dosadašnja učiteljica: do ramena) */
const BACK_SHOULDER = "M38 122C34 56 76 20 120 20s86 36 82 102v56c0 21-15 29-28 25l-3-80H69l-3 80c-13 4-28-4-28-25z";
const BACK_LONG = "M36 120C32 54 76 18 120 18s88 36 84 102v118c0 14-12 20-24 18l-6-128H66l-6 128c-12 2-24-4-24-18z";
const BACK_JAW = "M44 124C40 60 78 24 120 24s80 34 76 98v42c0 12-8 18-18 16l-4-58H66l-4 58c-10 2-18-4-18-16z";
const BACK_CAP = "M40 124C36 58 78 22 120 22s84 36 80 102z";
/** Šiške (dosadašnja učiteljica) */
const FRONT_FRINGE = "M50 112C44 58 82 28 122 28c44 0 74 30 68 82-6-23-18-35-34-41-22 23-72 23-106 43z";
/** Kratka kosa (dosadašnji učitelj) */
const FRONT_SHORT = "M49 108C43 52 80 24 122 24c46 0 78 28 70 84-4-21-18-37-38-41-24-5-48 6-69-2-18 10-32 24-36 43z";
/** Razdeljak po sredini */
const FRONT_PART = "M50 120C42 60 80 28 120 28c40 0 78 32 70 92-4-30-20-48-44-56-12-4-22-2-26 6-4-8-14-10-26-6-24 8-40 26-44 56z";
/** Kosa začešljana unazad (rep) */
const FRONT_BACK = "M52 104C48 54 84 28 122 28c42 0 72 28 68 76-8-22-26-36-50-38-30-2-62 12-88 38z";
const PONYTAIL = "M150 40C196 30 222 60 216 108c-4 30-14 52-30 66 8-26 10-50 2-70-6-18-20-28-40-32z";
const CURLY_CAP_W = "M54 100C50 56 84 30 120 30s70 26 66 70c-20-24-44-32-66-30-24-2-46 6-66 30z";
const CURLY_CAP_M = "M52 104C48 56 82 30 120 30s72 26 68 74c-18-26-42-36-68-34-26-2-50 8-68 34z";
const BUZZ = "M54 98C52 56 84 34 120 34s68 22 66 64c-14-20-38-28-66-28s-52 8-66 28z";

const CURLS_W: [number, number, number][] = [
    [58, 98, 13],
    [60, 74, 16],
    [78, 50, 18],
    [104, 36, 18],
    [136, 36, 18],
    [162, 50, 18],
    [180, 74, 16],
    [182, 98, 13],
];
const CURLS_W_BACK: [number, number, number][] = [
    [46, 118, 14],
    [48, 142, 12],
    [194, 118, 14],
    [192, 142, 12],
];
const CURLS_M: [number, number, number][] = [
    [62, 84, 14],
    [68, 60, 16],
    [88, 42, 17],
    [114, 34, 17],
    [140, 35, 17],
    [164, 46, 16],
    [178, 68, 14],
    [184, 90, 12],
];

/** Odsjaj na kosi */
function shine(d: string, opacity = 0.26): ReactNode {
    return <path d={d} stroke="#fff" strokeOpacity={opacity} strokeWidth="9" strokeLinecap="round" fill="none" />;
}

/** Kovrdže: krugovi sa tankim obrisom, da se vidi svaka */
function curls(points: [number, number, number][], hair: string, edge: string): ReactNode {
    return points.map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={hair} stroke={edge} strokeOpacity="0.35" strokeWidth="2" />);
}

/** Pletenica: niz uvijenih delova, gumica i čuperak na kraju */
function braid(x: number, hair: string, edge: string): ReactNode {
    return (
        <g key={x}>
            {[138, 158, 178, 198].map((y) => (
                <ellipse key={y} cx={x} cy={y} rx="11" ry="12" fill={hair} stroke={edge} strokeOpacity="0.45" strokeWidth="2" />
            ))}
            <rect x={x - 7} y="208" width="14" height="7" rx="3.5" fill="#F45B8D" />
            <path d={`M${x - 7} 216Q${x} 236 ${x + 7} 216Z`} fill={hair} />
        </g>
    );
}

/** Kosa iza glave i kosa preko čela, za frizuru iz skins.ts */
function hairArt(style: string, hair: string, edge: string): { back: ReactNode; front: ReactNode } {
    const part = (
        <>
            <path d={FRONT_PART} fill={hair} />
            {shine("M78 50c10-9 22-14 34-15")}
        </>
    );
    const short = (
        <>
            <path d={FRONT_SHORT} fill={hair} />
            {shine("M72 60c14-16 34-23 56-22", 0.25)}
        </>
    );
    switch (style) {
        case "do-ramena":
            return {
                back: <path d={BACK_SHOULDER} fill={hair} />,
                front: (
                    <>
                        <path d={FRONT_FRINGE} fill={hair} />
                        {shine("M70 66c14-18 36-27 58-26", 0.28)}
                    </>
                ),
            };
        case "duga":
            return { back: <path d={BACK_LONG} fill={hair} />, front: part };
        case "rep":
            return {
                back: <path d={PONYTAIL} fill={hair} />,
                front: (
                    <>
                        <path d={FRONT_BACK} fill={hair} />
                        {shine("M74 58c14-16 34-23 56-22")}
                        <circle cx="178" cy="52" r="7" fill="#F45B8D" />
                    </>
                ),
            };
        case "pletenice":
            return {
                back: (
                    <>
                        <path d={BACK_CAP} fill={hair} />
                        {braid(46, hair, edge)}
                        {braid(194, hair, edge)}
                    </>
                ),
                front: part,
            };
        case "kratka-kovrdzava":
            return {
                back: curls(CURLS_W_BACK, hair, edge),
                front: (
                    <>
                        <path d={CURLY_CAP_W} fill={hair} />
                        {curls(CURLS_W, hair, edge)}
                        {shine("M84 46c8-6 16-9 24-10", 0.3)}
                    </>
                ),
            };
        case "kovrdzava":
            return {
                back: null,
                front: (
                    <>
                        <path d={CURLY_CAP_M} fill={hair} />
                        {curls(CURLS_M, hair, edge)}
                        {shine("M92 38c8-5 16-7 24-7", 0.3)}
                    </>
                ),
            };
        case "duza":
            return { back: <path d={BACK_JAW} fill={hair} />, front: short };
        case "osisana":
            return { back: null, front: <path d={BUZZ} fill={hair} opacity="0.7" /> };
        case "bez-kose":
            return { back: null, front: null };
        // „kratka” i sve nepoznato: dosadašnji učitelj
        default:
            return { back: null, front: short };
    }
}
