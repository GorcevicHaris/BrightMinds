// Crteži igre „Obuci se”: Amar i Lejla (veliki lik na koji se oblači odeća), svaka stvar
// odeće (ista slika na liku i u korpi), prozor sa vremenom, slike mesta (bazen, škola, park)
// i male ikonice vremena za nedeljnu prognozu. Isti stil kao likovi na slikama situacija
// (scene/figures): velika glava, obli oblici, mirne boje, bez sitnih detalja.
//
// Lik se crta u svojim koordinatama (CHAR_VIEW): glava je krug oko (100, 72), stopala su na
// y ≈ 330. Odeća se crta u istim koordinatama, pa ikonica u korpi samo „iseca” deo slike.
// Pokreti (kiša, sneg, vetar, šetnja) su mirni i staju uz „Manje animacija”.

import { useId, type ReactNode } from "react";
import { EmotionFeatures } from "../EmotionFace";
import { Cheeks, INK, LINE } from "../faceParts";
import { shade } from "../scene/figures";
import type { ClothingId, HeroId, SceneId } from "../data/weatherLevels";

// ── Lik ───────────────────────────────────────────────────────────────────────

/** Okvir lika: mesta ima i za otvoren kišobran iznad glave */
export const CHAR_VIEW = { x: 0, y: -48, w: 210, h: 390 };

type Pt = readonly [number, number];

interface HeroLook {
    skin: string;
    hair: string;
    shirt: string;
    under: string;
    female: boolean;
}

const LOOK: Record<HeroId, HeroLook> = {
    amar: { skin: "#fbdcc2", hair: "#7a4a28", shirt: "#f59e3b", under: "#8fbbe8", female: false },
    lejla: { skin: "#f4c7a1", hair: "#3a2620", shirt: "#f07aa0", under: "#f6b3cb", female: true },
};

/** Glava: središte i razmera „jedinice glave” (poluprečnik 17, kao na slikama situacija) */
const HEAD: Pt = [100, 72];
const K = 44 / 17;
const SHOULDER_L: Pt = [72, 136];
const SHOULDER_R: Pt = [128, 136];
const HAND_L: Pt = [50, 228];
const HAND_R: Pt = [150, 228];
/** Šaka koja drži kišobran (ruka malo podignuta) */
const HAND_UMBRELLA: Pt = [154, 194];

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function hands(worn: readonly string[]): { l: Pt; r: Pt } {
    return { l: HAND_L, r: worn.includes("umbrella") ? HAND_UMBRELLA : HAND_R };
}

/** Rukav (ili ruka) kao debela linija sa obrisom */
function Sleeve({ from, to, color, width }: { from: Pt; to: Pt; color: string; width: number }) {
    return (
        <g strokeLinecap="round">
            <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={shade(color, 0.78)} strokeWidth={width + 3.5} />
            <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={color} strokeWidth={width} />
        </g>
    );
}

const outline = (color: string, width = 2.5) => ({ fill: color, stroke: shade(color, 0.75), strokeWidth: width, strokeLinejoin: "round" as const });

// ── Odeća na liku ─────────────────────────────────────────────────────────────

interface WearProps {
    look: HeroLook;
    hands: { l: Pt; r: Pt };
}

/** Telo majice/džempera/jakne: od ramena do `hem`, širine `spread` */
function torsoPath(spread: number, hem: number, flare = 0): string {
    const l = 100 - spread;
    const r = 100 + spread;
    return `M${l + 2} 132 Q100 ${120} ${r - 2} 132 L${r + 2} 150 L${r + flare} ${hem} Q100 ${hem + 6} ${l - flare} ${hem} L${l - 2} 150 Z`;
}

function LongSleeves({ color, width, hands: h }: { color: string; width: number; hands: { l: Pt; r: Pt } }) {
    return (
        <>
            <Sleeve from={SHOULDER_L} to={lerp(SHOULDER_L, h.l, 0.86)} color={color} width={width} />
            <Sleeve from={SHOULDER_R} to={lerp(SHOULDER_R, h.r, 0.86)} color={color} width={width} />
        </>
    );
}

function Foot({ x, children }: { x: number; children: ReactNode }) {
    return <g transform={`translate(${x} 0)`}>{children}</g>;
}

const FEET = [86, 114] as const;

const WEAR: Record<ClothingId, (p: WearProps) => ReactNode> = {
    tshirt: ({ look }) => (
        <g>
            <Sleeve from={SHOULDER_L} to={lerp(SHOULDER_L, HAND_L, 0.36)} color={look.shirt} width={26} />
            <Sleeve from={SHOULDER_R} to={lerp(SHOULDER_R, HAND_R, 0.36)} color={look.shirt} width={26} />
            <path d={torsoPath(32, 218)} {...outline(look.shirt)} />
            <path d="M88 126 Q100 140 112 126" fill="none" stroke={shade(look.shirt, 0.75)} strokeWidth={2.5} strokeLinecap="round" />
            {/* Zvezdica na majici */}
            <path d="M100 160 l3.5 7 7.6 1 -5.6 5.2 1.4 7.6 -6.9 -3.7 -6.9 3.7 1.4 -7.6 -5.6 -5.2 7.6 -1z" fill="#fff6d6" opacity={0.95} />
        </g>
    ),
    sweater: ({ hands: h }) => (
        <g>
            <LongSleeves color="#4d7fd8" width={25} hands={h} />
            <path d={torsoPath(33, 222)} {...outline("#4d7fd8")} />
            <path d="M68 172 l8 -7 8 7 8 -7 8 7 8 -7 8 7 8 -7 8 7" fill="none" stroke="#bcd3f7" strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
            <path d="M68 210 H132" stroke="#3a64b4" strokeWidth={3} strokeDasharray="3 3" />
            <path d="M86 126 Q100 138 114 126" fill="none" stroke="#3a64b4" strokeWidth={5} strokeLinecap="round" />
        </g>
    ),
    hoodie: ({ hands: h }) => (
        <g>
            {/* Spuštena kapuljača iza vrata */}
            <path d="M70 136 Q66 112 84 106 Q100 112 116 106 Q134 112 130 136 Z" {...outline("#2f9a6a")} />
            <LongSleeves color="#3fae7a" width={25} hands={h} />
            <path d={torsoPath(33, 222)} {...outline("#3fae7a")} />
            <path d="M78 192 H122 L118 212 H82 Z" fill="#37996b" stroke="#2a7f57" strokeWidth={2} strokeLinejoin="round" />
            <path d="M93 128 V152 M107 128 V152" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" />
            <circle cx={93} cy={154} r={2.6} fill="#ffffff" />
            <circle cx={107} cy={154} r={2.6} fill="#ffffff" />
        </g>
    ),
    jacket: ({ hands: h }) => (
        <g>
            <LongSleeves color="#e5534b" width={30} hands={h} />
            <path d={torsoPath(37, 230, 2)} {...outline("#e5534b")} />
            <path d="M66 160 Q100 166 134 160 M65 190 Q100 196 135 190 M65 216 Q100 222 135 216" fill="none" stroke="#c23e37" strokeWidth={2.2} strokeLinecap="round" />
            <path d="M100 128 V232" stroke="#8f2a24" strokeWidth={3} />
            <path d="M82 120 Q100 132 118 120 L120 132 Q100 142 80 132 Z" {...outline("#f07a72")} />
        </g>
    ),
    raincoat: ({ hands: h }) => (
        <g>
            <LongSleeves color="#f6c93b" width={28} hands={h} />
            <path d={torsoPath(36, 256, 8)} {...outline("#f6c93b")} />
            <path d="M100 130 V258" stroke="#d9a520" strokeWidth={2.5} />
            {[156, 184, 212, 240].map((y) => (
                <circle key={y} cx={108} cy={y} r={3.2} fill="#3f6fd8" />
            ))}
            <path d="M80 122 Q100 136 120 122 L122 134 Q100 146 78 134 Z" {...outline("#ffd95e")} />
            <path d="M74 150 Q72 190 76 236" fill="none" stroke="#fff3c0" strokeWidth={4} strokeLinecap="round" opacity={0.75} />
        </g>
    ),
    pants: () => (
        <g>
            <path d="M68 204 H132 L131 316 H104 L100 238 L96 316 H69 Z" {...outline("#4a6fb5")} />
            <path d="M70 306 H95 M105 306 H130" stroke="#3a5a9a" strokeWidth={2.5} />
            <path d="M100 212 V236" stroke="#3a5a9a" strokeWidth={2} />
        </g>
    ),
    shorts: () => (
        <g>
            <path d="M68 204 H132 L134 260 H104 L100 236 L96 260 H66 Z" {...outline("#2fae9c")} />
            <path d="M68 212 H132" stroke="#24897b" strokeWidth={2.5} />
        </g>
    ),
    swimsuit: ({ look }) =>
        look.female ? (
            <g>
                <path d="M81 128 H89 Q100 146 111 128 H119 Q124 168 126 204 Q128 232 114 244 Q104 238 100 238 Q96 238 86 244 Q72 232 74 204 Q76 168 81 128Z" {...outline("#f2786a")} />
                <path d="M75 204 Q100 212 125 204" fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
                {[
                    [90, 160],
                    [110, 176],
                    [92, 196],
                    [112, 214],
                    [86, 226],
                ].map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r={3.4} fill="#ffffff" opacity={0.9} />
                ))}
            </g>
        ) : (
            <g>
                <Sleeve from={SHOULDER_L} to={lerp(SHOULDER_L, HAND_L, 0.3)} color="#2f8fd8" width={24} />
                <Sleeve from={SHOULDER_R} to={lerp(SHOULDER_R, HAND_R, 0.3)} color="#2f8fd8" width={24} />
                <path d={torsoPath(31, 214)} {...outline("#2f8fd8")} />
                <path d="M70 168 H130" stroke="#ffffff" strokeWidth={5} />
                <path d="M68 206 H132 L133 252 H104 L100 236 L96 252 H67 Z" {...outline("#245fb0")} />
                <path d="M126 210 V250" stroke="#ffffff" strokeWidth={3} />
            </g>
        ),
    socks: () => (
        <g>
            {FEET.map((x) => (
                <Foot key={x} x={x}>
                    <path d="M-11 288 H11 V318 Q14 328 4 330 H-12 Q-16 328 -13 318 Z" {...outline("#ffffff", 2)} />
                    <path d="M-11 296 H11" stroke="#e5534b" strokeWidth={3.2} />
                    <path d="M-11 302 H11" stroke="#4d7fd8" strokeWidth={3.2} />
                </Foot>
            ))}
        </g>
    ),
    sneakers: () => (
        <g>
            {FEET.map((x, i) => (
                <Foot key={x} x={x + (i === 0 ? -4 : 4)}>
                    <path d="M-14 312 Q-14 300 0 300 Q14 300 14 312 L16 322 Q16 330 8 330 H-8 Q-16 330 -16 322 Z" {...outline("#ffffff", 2)} />
                    <path d="M-16 322 H16 V324 Q16 331 8 331 H-8 Q-16 331 -16 324 Z" fill="#6c61f0" />
                    <path d="M-6 306 H6 M-7 311 H7" stroke="#6c61f0" strokeWidth={2.2} strokeLinecap="round" />
                    <path d={i === 0 ? "M-15 318 Q-8 314 -2 318" : "M15 318 Q8 314 2 318"} fill="none" stroke="#f07aa0" strokeWidth={2.6} strokeLinecap="round" />
                </Foot>
            ))}
        </g>
    ),
    sandals: () => (
        <g>
            {FEET.map((x, i) => (
                <Foot key={x} x={x}>
                    <path d={i === 0 ? "M-22 324 H10 V330 H-22 Z" : "M22 324 H-10 V330 H22 Z"} {...outline("#b77a45", 2)} />
                    <path d={i === 0 ? "M-15 316 Q-6 310 4 316" : "M15 316 Q6 310 -4 316"} fill="none" stroke="#b77a45" strokeWidth={5} strokeLinecap="round" />
                    <path d={i === 0 ? "M-2 324 V312" : "M2 324 V312"} stroke="#b77a45" strokeWidth={4} strokeLinecap="round" />
                </Foot>
            ))}
        </g>
    ),
    snowBoots: () => (
        <g>
            {FEET.map((x, i) => (
                <Foot key={x} x={x}>
                    <path d={i === 0 ? "M-13 276 H12 V312 Q14 320 8 324 H-22 Q-24 314 -13 310 Z" : "M13 276 H-12 V312 Q-14 320 -8 324 H22 Q24 314 13 310 Z"} {...outline("#8a5a3a")} />
                    <path d={i === 0 ? "M-24 322 H12 V330 H-24 Z" : "M24 322 H-12 V330 H24 Z"} fill="#4a3426" />
                    <rect x={-16} y={268} width={32} height={14} rx={7} fill="#f3e6cf" stroke="#d6c3a2" strokeWidth={2} />
                </Foot>
            ))}
        </g>
    ),
    rainBoots: () => (
        <g>
            {FEET.map((x, i) => (
                <Foot key={x} x={x}>
                    <path d={i === 0 ? "M-13 274 H13 V312 Q15 320 9 324 H-22 Q-24 314 -13 310 Z" : "M13 274 H-13 V312 Q-15 320 -9 324 H22 Q24 314 13 310 Z"} {...outline("#f6c93b")} />
                    <path d={i === 0 ? "M-24 322 H13 V330 H-24 Z" : "M24 322 H-13 V330 H24 Z"} fill="#3b4a6b" />
                    <path d="M-14 274 H14" stroke="#d9a520" strokeWidth={4} strokeLinecap="round" />
                    <path d={i === 0 ? "M-7 282 V306" : "M7 282 V306"} stroke="#fff6cf" strokeWidth={3.2} strokeLinecap="round" opacity={0.85} />
                </Foot>
            ))}
        </g>
    ),
    flipFlops: () => (
        <g>
            {FEET.map((x, i) => (
                <Foot key={x} x={x}>
                    <path d={i === 0 ? "M-22 324 H10 V330 H-22 Z" : "M22 324 H-10 V330 H22 Z"} {...outline("#2fae9c", 2)} />
                    <path d={i === 0 ? "M-14 320 L-4 312 L4 320" : "M14 320 L4 312 L-4 320"} fill="none" stroke="#f2786a" strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
                </Foot>
            ))}
        </g>
    ),
    gloves: ({ hands: h }) => (
        <g>
            <Mitten at={h.l} />
            <Mitten at={h.r} flip />
        </g>
    ),
    scarf: () => (
        <g>
            <path d="M74 116 Q100 132 126 116 L130 130 Q100 148 70 130 Z" {...outline("#e5534b")} />
            <path d="M76 128 L70 186 L86 188 L90 134 Z" {...outline("#e5534b")} />
            <path d="M72 168 L87 170 M71 178 L86 180" stroke="#ffffff" strokeWidth={3.5} />
            <path d="M68 188 l3 8 M75 189 l1 8 M82 190 l-1 8" stroke="#c23e37" strokeWidth={2.5} strokeLinecap="round" />
            <path d="M88 126 Q100 134 112 126" fill="none" stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" />
        </g>
    ),
    towel: () => (
        <g>
            <path d="M118 122 L136 128 L94 238 L74 230 Z" {...outline("#f6a6c1")} />
            <path d="M112 138 L130 145 M86 205 L105 212" stroke="#ffffff" strokeWidth={5} />
            <path d="M118 122 Q130 112 142 126 L136 150 Q130 132 118 122Z" {...outline("#f6a6c1")} />
        </g>
    ),
    backpack: () => (
        <g>
            {/* Naramenice preko ramena (ranac je na leđima) */}
            <path d="M80 130 Q76 170 80 206" fill="none" stroke="#2f8f4a" strokeWidth={9} strokeLinecap="round" />
            <path d="M120 130 Q124 170 120 206" fill="none" stroke="#2f8f4a" strokeWidth={9} strokeLinecap="round" />
            <rect x={75} y={176} width={10} height={6} rx={2} fill="#f6c93b" />
            <rect x={115} y={176} width={10} height={6} rx={2} fill="#f6c93b" />
        </g>
    ),
    sunCap: () => (
        <g transform={`translate(${HEAD[0]} ${HEAD[1]}) scale(${K})`}>
            <path d="M-18 -9 C-18 -29 18 -29 18 -9 Z" {...outline("#3f8fd8", 1)} />
            <path d="M-21 -9.5 Q0 -15 21 -9.5 Q22 -6 18 -5.5 Q0 -9.5 -18 -5.5 Q-22 -6 -21 -9.5Z" {...outline("#2f6fb8", 1)} />
            <circle cx={0} cy={-26.5} r={2} fill="#ffffff" />
            <path d="M-6 -18 Q0 -21 6 -18" fill="none" stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" />
        </g>
    ),
    beanie: () => (
        <g transform={`translate(${HEAD[0]} ${HEAD[1]}) scale(${K})`}>
            <circle cx={0} cy={-29} r={5} fill="#ffffff" stroke="#d9d4ea" strokeWidth={1} />
            <path d="M-18.5 -9 C-20 -32 20 -32 18.5 -9 Z" {...outline("#8a6ee8", 1)} />
            <path d="M-6 -26 V-11 M0 -27 V-11 M6 -26 V-11 M-12 -22 V-11 M12 -22 V-11" stroke="#7458d0" strokeWidth={1.1} strokeLinecap="round" />
            <rect x={-20} y={-13.5} width={40} height={8} rx={4} {...outline("#a48cf0", 1)} />
        </g>
    ),
    sunglasses: () => (
        <g transform={`translate(${HEAD[0]} ${HEAD[1]}) scale(${K})`}>
            <path d="M-11 -3 H11" stroke="#1f1b3a" strokeWidth={1.4} />
            <rect x={-12.5} y={-6} width={11} height={8} rx={3.5} fill="#2b2f4a" stroke="#1f1b3a" strokeWidth={1.2} />
            <rect x={1.5} y={-6} width={11} height={8} rx={3.5} fill="#2b2f4a" stroke="#1f1b3a" strokeWidth={1.2} />
            <path d="M-10 -4 L-7 -4.5 M4 -4 L7 -4.5" stroke="#8fb8ff" strokeWidth={1.2} strokeLinecap="round" />
            <path d="M-12.5 -3 L-16.5 -2 M12.5 -3 L16.5 -2" stroke="#1f1b3a" strokeWidth={1.2} strokeLinecap="round" />
        </g>
    ),
    umbrella: ({ hands: h }) => <Umbrella hand={h.r} />,
};

function Mitten({ at, flip = false }: { at: Pt; flip?: boolean }) {
    return (
        <g transform={`translate(${at[0]} ${at[1] + 2})${flip ? " scale(-1 1)" : ""}`}>
            <path d="M-10 -12 H10 V8 Q10 18 0 18 Q-10 18 -10 8 Z" {...outline("#2fae9c", 2)} />
            <path d="M10 -2 Q18 -4 16 6 Q14 10 10 8" {...outline("#2fae9c", 2)} />
            <rect x={-11} y={-16} width={22} height={7} rx={3} fill="#ffffff" stroke="#c9e9e2" strokeWidth={1.5} />
        </g>
    );
}

function Umbrella({ hand }: { hand: Pt }) {
    const top: Pt = [136, -6];
    return (
        <g>
            <line x1={hand[0]} y1={hand[1] + 10} x2={top[0]} y2={top[1]} stroke="#5a4636" strokeWidth={4} strokeLinecap="round" />
            <path d={`M${hand[0]} ${hand[1] + 10} q2 14 -8 14 q-8 0 -8 -8`} fill="none" stroke="#5a4636" strokeWidth={4} strokeLinecap="round" />
            <g transform={`translate(${top[0]} ${top[1]}) rotate(8)`}>
                <path d="M-68 4 Q-64 -40 0 -42 Q64 -40 68 4 Q57 -6 45 4 Q34 -6 23 4 Q11 -6 0 4 Q-11 -6 -23 4 Q-34 -6 -45 4 Q-57 -6 -68 4Z" {...outline("#6c61f0", 2.5)} />
                <path d="M-23 4 Q-24 -30 0 -42 Q24 -30 23 4 Q11 -6 0 4 Q-11 -6 -23 4Z" fill="#8f86f5" />
                <path d="M0 -42 V-50" stroke="#5a4636" strokeWidth={4} strokeLinecap="round" />
            </g>
        </g>
    );
}

// ── Glava i telo ──────────────────────────────────────────────────────────────

/** Lice iz koordinata 100 × 100 u glavi poluprečnika 17 (kao na slikama situacija) */
const FS = 17 / 43;

function Face({ happy }: { happy: boolean }) {
    return (
        <g transform={`translate(${-50 * FS} ${-52 * FS}) scale(${FS})`}>
            {happy ? (
                <EmotionFeatures emotion="happy" />
            ) : (
                <>
                    <Cheeks />
                    <ellipse cx={35} cy={47} rx={4.5} ry={5.5} fill={INK} />
                    <ellipse cx={65} cy={47} rx={4.5} ry={5.5} fill={INK} />
                    <path d="M38 66 Q50 74 62 66" {...LINE} />
                </>
            )}
        </g>
    );
}

function HairBack({ look }: { look: HeroLook }) {
    if (!look.female) return null;
    return (
        <g transform={`translate(${HEAD[0]} ${HEAD[1]}) scale(${K})`}>
            <path d="M-19.5 -4 C-21 -26 21 -26 19.5 -4 L21.5 26 Q0 31 -21.5 26 Z" fill={look.hair} />
        </g>
    );
}

function HairFront({ look, hat }: { look: HeroLook; hat: boolean }) {
    if (look.female) {
        return <path d={hat ? "M-17.8 0 C-18 -8 -15 -11 -10 -11 L10 -11 C15 -11 18 -8 17.8 0 C16 -5 12 -7 7 -7.5 C2 -8.5 -4 -8.5 -9 -7.5 C-14 -6.5 -17 -3 -17.8 0Z" : "M-17.8 0 C-20 -25 20 -25 17.8 0 C16.5 -7 13 -11.5 7 -12 C2 -13 -4 -13 -9 -12 C-14 -10.5 -17 -6 -17.8 0Z"} fill={look.hair} />;
    }
    // Ispod kape se kovrdže ne vide
    if (hat) return null;
    return (
        <g fill={look.hair}>
            <path d="M-17.6 -2 C-19 -22 19 -22 17.6 -2 C15 -9 11 -11.5 5 -11.5 L-5 -11.5 C-11 -11.5 -15 -9 -17.6 -2Z" />
            {[
                [-15, -8],
                [-12, -14],
                [-6, -17.5],
                [1, -18.5],
                [8, -17],
                [13.5, -13],
                [16, -7],
            ].map(([x, y]) => (
                <circle key={`${x}`} cx={x} cy={y} r={5.4} />
            ))}
        </g>
    );
}

function Head({ look, happy, hat }: { look: HeroLook; happy: boolean; hat: boolean }) {
    const line = shade(look.skin);
    return (
        <g transform={`translate(${HEAD[0]} ${HEAD[1]}) scale(${K})`}>
            <circle cx={-16.5} cy={2} r={4} fill={look.skin} stroke={line} strokeWidth={0.6} />
            <circle cx={16.5} cy={2} r={4} fill={look.skin} stroke={line} strokeWidth={0.6} />
            <circle r={17} fill={look.skin} stroke={line} strokeWidth={0.7} />
            <HairFront look={look} hat={hat} />
            <Face happy={happy} />
        </g>
    );
}

/** Redosled crtanja odeće (šta je preko čega) */
const LAYERS: readonly ClothingId[] = [
    "swimsuit",
    "socks",
    "pants",
    "shorts",
    "tshirt",
    "sweater",
    "hoodie",
    "snowBoots",
    "rainBoots",
    "sneakers",
    "sandals",
    "flipFlops",
    "jacket",
    "raincoat",
    "backpack",
    "scarf",
    "towel",
];
/** Iznad glave: kape, naočare, rukavice i kišobran */
const TOP_LAYERS: readonly ClothingId[] = ["gloves", "sunCap", "beanie", "sunglasses", "umbrella"];

interface FigureProps {
    hero: HeroId;
    /** Sve što lik nosi (već obučeno i upravo obučeno) */
    worn: readonly string[];
    happy?: boolean;
    /** Upravo obučena stvar: kratko „iskoči” */
    fresh?: string | null;
    calm?: boolean;
}

/** Lik sa odećom, u koordinatama CHAR_VIEW */
export function DressFigure({ hero, worn, happy = false, fresh = null, calm = true }: FigureProps) {
    const look = LOOK[hero];
    const h = hands(worn);
    const hat = worn.includes("sunCap") || worn.includes("beanie");
    const longSleeves = ["sweater", "hoodie", "jacket", "raincoat"].some((id) => worn.includes(id));
    const swim = worn.includes("swimsuit");
    const layer = (id: ClothingId) =>
        worn.includes(id) ? (
            <g key={id} className={fresh === id && !calm ? "wx-fresh" : undefined}>
                {WEAR[id]({ look, hands: h })}
            </g>
        ) : null;
    const skinLine = shade(look.skin);
    return (
        <g>
            {/* Ranac na leđima (vidi se sa strane) */}
            {worn.includes("backpack") && <rect x={64} y={140} width={72} height={84} rx={18} {...outline("#3fae5a")} />}
            <HairBack look={look} />
            {/* Telo: vrat, ruke, noge, stopala */}
            <rect x={90} y={104} width={20} height={26} rx={6} fill={look.skin} stroke={skinLine} strokeWidth={1.5} />
            {!longSleeves && (
                <>
                    <Sleeve from={SHOULDER_L} to={h.l} color={look.skin} width={17} />
                    <Sleeve from={SHOULDER_R} to={h.r} color={look.skin} width={17} />
                </>
            )}
            <path d={torsoPath(30, 214)} fill={look.skin} stroke={skinLine} strokeWidth={1.5} />
            <rect x={75} y={226} width={22} height={96} rx={10} fill={look.skin} stroke={skinLine} strokeWidth={1.5} />
            <rect x={103} y={226} width={22} height={96} rx={10} fill={look.skin} stroke={skinLine} strokeWidth={1.5} />
            {FEET.map((x, i) => (
                <ellipse key={x} cx={x + (i === 0 ? -4 : 4)} cy={322} rx={14} ry={8} fill={look.skin} stroke={skinLine} strokeWidth={1.5} />
            ))}
            {/* Donji veš: potkošulja i gaće (ispod kupaćeg se ne vide) */}
            {!swim && (
                <g>
                    <path d="M78 130 L88 128 Q100 142 112 128 L122 130 L127 214 Q100 220 73 214 Z" {...outline("#ffffff", 2)} />
                    <path d="M70 204 H130 L132 242 H104 L100 234 L96 242 H68 Z" {...outline(look.under, 2)} />
                </g>
            )}
            {LAYERS.map(layer)}
            {/* Šake preko rukava */}
            {[h.l, h.r].map(([x, y]) => (
                <circle key={`${x}`} cx={x} cy={y} r={10} fill={look.skin} stroke={skinLine} strokeWidth={1.5} />
            ))}
            <Head look={look} happy={happy} hat={hat} />
            {TOP_LAYERS.map(layer)}
        </g>
    );
}

/** Pokreti lika: veseo izlazak napolje i kratko „iskakanje” upravo obučene stvari */
export function FigureStyles() {
    return (
        <style>{`
@keyframes wx-walk { 0% { transform: translateX(0) } 100% { transform: translateX(46px) } }
@keyframes wx-bob { 0%, 100% { transform: translateY(0) rotate(0) } 25% { transform: translateY(-9px) rotate(-3deg) } 50% { transform: translateY(0) rotate(0) } 75% { transform: translateY(-9px) rotate(3deg) } }
@keyframes wx-out { 0%, 70% { opacity: 1 } 100% { opacity: 0 } }
@keyframes wx-pop { 0% { transform: scale(0.88); opacity: 0.4 } 60% { transform: scale(1.05); opacity: 1 } 100% { transform: scale(1) } }
.wx-walking { animation: wx-walk 1.9s ease-in 0.5s both, wx-out 1.9s linear 0.5s both; }
.wx-bobbing { transform-box: fill-box; transform-origin: 50% 100%; animation: wx-bob 0.62s ease-in-out 0.5s 3; }
.wx-fresh { transform-box: fill-box; transform-origin: center; animation: wx-pop 0.42s ease-out both; }
@media (prefers-reduced-motion: reduce) { .wx-walking, .wx-bobbing, .wx-fresh { animation: none; } }
`}</style>
    );
}

// ── Ikonice odeće (korpa) ─────────────────────────────────────────────────────

/** Deo slike lika koji pokazuje stvar: [x, y, veličina] u koordinatama lika */
const ICON_BOX: Partial<Record<ClothingId, readonly [number, number, number]>> = {
    tshirt: [22, 104, 156],
    sweater: [22, 104, 156],
    hoodie: [22, 100, 160],
    jacket: [20, 104, 160],
    raincoat: [16, 104, 168],
    swimsuit: [24, 108, 152],
    pants: [42, 200, 120],
    shorts: [52, 192, 96],
    socks: [62, 272, 76],
    sneakers: [58, 273, 84],
    sandals: [60, 280, 80],
    snowBoots: [56, 254, 92],
    rainBoots: [56, 254, 92],
    flipFlops: [60, 282, 80],
    scarf: [52, 104, 96],
    sunCap: [44, -8, 112],
    beanie: [44, -14, 112],
    sunglasses: [64, 26, 72],
};

/** Stvari koje se na liku vide samo delom (ranac na leđima) ili su razdvojene (rukavice) imaju svoj crtež */
const ICON_ART: Partial<Record<ClothingId, () => ReactNode>> = {
    gloves: () => (
        <g transform="translate(50 54) scale(1.4) translate(-50 -50)">
            <Mitten at={[36, 46]} />
            <Mitten at={[64, 46]} flip />
        </g>
    ),
    umbrella: () => (
        <g transform="translate(50 50) scale(0.62)">
            <path d="M0 -40 V54 q0 14 -12 14 q-10 0 -10 -10" fill="none" stroke="#5a4636" strokeWidth={6} strokeLinecap="round" />
            <path d="M-68 -2 Q-64 -46 0 -48 Q64 -46 68 -2 Q57 -12 45 -2 Q34 -12 23 -2 Q11 -12 0 -2 Q-11 -12 -23 -2 Q-34 -12 -45 -2 Q-57 -12 -68 -2Z" {...outline("#6c61f0", 3)} />
            <path d="M-23 -2 Q-24 -36 0 -48 Q24 -36 23 -2 Q11 -12 0 -2 Q-11 -12 -23 -2Z" fill="#8f86f5" />
        </g>
    ),
    backpack: () => (
        <g>
            <path d="M36 28 Q36 16 50 16 Q64 16 64 28" fill="none" stroke="#2f8f4a" strokeWidth={5} strokeLinecap="round" />
            <rect x={24} y={24} width={52} height={64} rx={14} {...outline("#3fae5a")} />
            <rect x={32} y={56} width={36} height={24} rx={7} {...outline("#5bbf5a", 2)} />
            <path d="M32 64 H68" stroke="#2f8f4a" strokeWidth={2} />
            <rect x={46} y={60} width={8} height={6} rx={2} fill="#f6c93b" />
        </g>
    ),
    towel: () => (
        <g>
            <rect x={16} y={52} width={68} height={30} rx={8} {...outline("#f6a6c1")} />
            <rect x={20} y={30} width={60} height={26} rx={8} {...outline("#8fd0e8")} />
            <path d="M20 40 H80 M16 64 H84" stroke="#ffffff" strokeWidth={4} />
        </g>
    ),
};

const ICON_LOOK = (hero: HeroId): WearProps => ({ look: LOOK[hero], hands: { l: HAND_L, r: HAND_R } });

/** Slika jedne stvari (u korpi, na traci koraka, u pitanju „Kada nosimo…?”) */
export function ClothingIcon({ id, hero, className }: { id: ClothingId; hero: HeroId; className?: string }) {
    const custom = ICON_ART[id];
    const box = ICON_BOX[id];
    if (custom || !box) {
        return (
            <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
                {custom?.()}
            </svg>
        );
    }
    const [x, y, size] = box;
    return (
        <svg viewBox={`${x} ${y} ${size} ${size}`} aria-hidden="true" focusable="false" className={className}>
            {WEAR[id](ICON_LOOK(hero))}
        </svg>
    );
}

// ── Prozor sa vremenom ────────────────────────────────────────────────────────

export const WINDOW_W = 200;
export const WINDOW_H = 160;

/** Koje se pojave vide kroz prozor */
interface Sky {
    sky: [string, string];
    ground: string;
    sun?: boolean;
    clouds?: "light" | "grey" | "dark";
    rain?: boolean;
    snow?: boolean;
    wind?: boolean;
    frost?: boolean;
    thermo?: "hot" | "cold";
    snowGround?: boolean;
    bareTree?: boolean;
}

const SKIES: Record<string, Sky> = {
    sun: { sky: ["#7cc8f5", "#d6f0ff"], ground: "#8fd16a", sun: true, thermo: "hot" },
    rain: { sky: ["#8e9bb0", "#c7d0db"], ground: "#6fa86a", clouds: "dark", rain: true },
    snow: { sky: ["#b9c7da", "#eef3f9"], ground: "#ffffff", clouds: "grey", snow: true, snowGround: true },
    wind: { sky: ["#93cdea", "#e1f3fb"], ground: "#8fcf6a", clouds: "light", wind: true },
    cold: { sky: ["#b6cbe0", "#e9f0f7"], ground: "#b4b98e", clouds: "light", frost: true, thermo: "cold", bareTree: true },
    coldRain: { sky: ["#8e9bb0", "#c7d0db"], ground: "#7a9a72", clouds: "dark", rain: true, frost: true, thermo: "cold" },
    coldWind: { sky: ["#a9c3dc", "#e6eef7"], ground: "#aab48a", clouds: "light", wind: true, frost: true, thermo: "cold", bareTree: true },
    snowWind: { sky: ["#aebdd2", "#e8eef6"], ground: "#ffffff", clouds: "grey", snow: true, wind: true, snowGround: true },
};

const SKY_STYLE = `
@keyframes wx-rain { from { transform: translate(0, -16px) } to { transform: translate(-6px, 16px) } }
@keyframes wx-snow { from { transform: translate(0, -14px) } to { transform: translate(6px, 14px) } }
@keyframes wx-gust { from { stroke-dashoffset: 60 } to { stroke-dashoffset: -60 } }
@keyframes wx-leaf { 0% { transform: translate(-20px, 0) rotate(0) } 100% { transform: translate(60px, 10px) rotate(220deg) } }
@keyframes wx-sway { 0%, 100% { transform: rotate(-4deg) } 50% { transform: rotate(3deg) } }
@keyframes wx-ray { 0%, 100% { opacity: 0.85 } 50% { opacity: 0.55 } }
.wx-rain { animation: wx-rain 0.9s linear infinite; }
.wx-snow { animation: wx-snow 3.2s linear infinite; }
.wx-gust { animation: wx-gust 2.6s linear infinite; }
.wx-leaf { transform-box: fill-box; animation: wx-leaf 3s linear infinite; }
.wx-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: wx-sway 2.6s ease-in-out infinite; }
.wx-ray { animation: wx-ray 3s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .wx-rain, .wx-snow, .wx-gust, .wx-leaf, .wx-sway, .wx-ray { animation: none; } }
`;

function Cloud({ x, y, s = 1, color }: { x: number; y: number; s?: number; color: string }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M-26 8 Q-30 -6 -16 -8 Q-12 -22 4 -18 Q16 -26 24 -12 Q36 -10 32 4 Q32 10 24 10 H-20 Q-28 12 -26 8Z" fill={color} stroke={shade(color, 0.85)} strokeWidth={1.5} />
        </g>
    );
}

function Thermometer({ kind }: { kind: "hot" | "cold" }) {
    const hot = kind === "hot";
    return (
        <g transform="translate(168 30)">
            <rect x={-7} y={-4} width={14} height={78} rx={7} fill="#ffffff" stroke="#9aa3b8" strokeWidth={2} />
            <rect x={-3} y={hot ? 6 : 50} width={6} height={hot ? 62 : 18} rx={3} fill={hot ? "#e8463f" : "#3f8fd8"} />
            <circle cx={0} cy={78} r={10} fill={hot ? "#e8463f" : "#3f8fd8"} stroke="#9aa3b8" strokeWidth={2} />
            {[10, 24, 38, 52].map((y) => (
                <path key={y} d={`M4 ${y} H7`} stroke="#9aa3b8" strokeWidth={1.5} />
            ))}
        </g>
    );
}

function Frost() {
    const flake = (x: number, y: number, s: number) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`} stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" opacity={0.9}>
            <path d="M0 -6 V6 M-5.2 -3 L5.2 3 M-5.2 3 L5.2 -3" />
        </g>
    );
    return (
        <g>
            <path d="M12 12 H46 Q30 18 26 30 Q20 24 12 40 Z" fill="#ffffff" opacity={0.55} />
            <path d="M188 140 H150 Q166 134 170 122 Q178 128 188 112 Z" fill="#ffffff" opacity={0.55} />
            {flake(22, 22, 1)}
            {flake(36, 16, 0.7)}
            {flake(176, 128, 1)}
            {flake(162, 134, 0.7)}
        </g>
    );
}

function Tree({ bare, wind, calm }: { bare: boolean; wind: boolean; calm: boolean }) {
    return (
        <g transform="translate(46 118)">
            <g className={wind && !calm ? "wx-sway" : undefined}>
                <path d="M-4 0 Q-2 -24 0 -40 L4 -40 Q4 -24 6 0 Z" fill="#8a5a32" />
                {bare ? (
                    <path d="M2 -30 L-12 -46 M2 -36 L14 -52 M2 -40 L0 -58 M-8 -40 L-16 -42 M10 -46 L18 -46" stroke="#8a5a32" strokeWidth={3} strokeLinecap="round" />
                ) : (
                    <g transform={wind ? "skewX(-10)" : undefined}>
                        <circle cx={-10} cy={-50} r={14} fill="#5faf4a" />
                        <circle cx={10} cy={-54} r={15} fill="#6fbf5a" />
                        <circle cx={0} cy={-66} r={14} fill="#7fcf6a" />
                    </g>
                )}
            </g>
        </g>
    );
}

function SkyScene({ id, calm }: { id: SceneId; calm: boolean }) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const sky = SKIES[id];
    if (!sky) return null;
    const anim = (name: string) => (calm ? undefined : name);
    return (
        <g>
            <defs>
                <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={sky.sky[0]} />
                    <stop offset="1" stopColor={sky.sky[1]} />
                </linearGradient>
            </defs>
            <rect x={0} y={0} width={WINDOW_W} height={WINDOW_H} fill={`url(#${uid}-sky)`} />
            {sky.sun && (
                <g transform="translate(58 46)">
                    <g className={anim("wx-ray")} stroke="#f7b500" strokeWidth={4} strokeLinecap="round">
                        {Array.from({ length: 10 }, (_, i) => {
                            const a = (i * Math.PI) / 5;
                            return <line key={i} x1={Math.cos(a) * 25} y1={Math.sin(a) * 25} x2={Math.cos(a) * 33} y2={Math.sin(a) * 33} />;
                        })}
                    </g>
                    <circle r={19} fill="#ffd24a" stroke="#f0a818" strokeWidth={2.5} />
                    <circle cx={-6} cy={-6} r={6} fill="#fff3b0" opacity={0.7} />
                </g>
            )}
            {sky.clouds === "light" && (
                <>
                    <Cloud x={70} y={38} s={1} color="#ffffff" />
                    <Cloud x={130} y={26} s={0.7} color="#ffffff" />
                </>
            )}
            {sky.clouds === "grey" && (
                <>
                    <Cloud x={62} y={30} s={1.2} color="#e4e8ef" />
                    <Cloud x={128} y={26} s={1.1} color="#d6dce6" />
                </>
            )}
            {sky.clouds === "dark" && (
                <>
                    <Cloud x={58} y={30} s={1.3} color="#8f99aa" />
                    <Cloud x={124} y={24} s={1.2} color="#7d8798" />
                    <Cloud x={96} y={44} s={0.9} color="#a3abb9" />
                </>
            )}
            {/* Tlo */}
            {sky.snowGround ? (
                <path d="M0 112 Q50 98 100 108 Q150 118 200 104 V160 H0 Z" fill="#ffffff" stroke="#d5e2f0" strokeWidth={2} />
            ) : (
                <path d="M0 114 Q60 102 120 112 Q160 118 200 108 V160 H0 Z" fill={sky.ground} />
            )}
            {sky.sun && (
                <g>
                    {[
                        [104, 128, "#f6862e"],
                        [126, 124, "#f07aa0"],
                        [146, 132, "#ffd24a"],
                    ].map(([x, y, color]) => (
                        <g key={`${x}`} transform={`translate(${x} ${y})`}>
                            <path d="M0 0 V10" stroke="#3f8a3a" strokeWidth={2} />
                            {[0, 72, 144, 216, 288].map((a) => (
                                <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 4} cy={Math.sin((a * Math.PI) / 180) * 4} r={3.2} fill={String(color)} />
                            ))}
                            <circle r={2.4} fill="#fff3b0" />
                        </g>
                    ))}
                </g>
            )}
            {(sky.wind || sky.bareTree) && <Tree bare={Boolean(sky.bareTree)} wind={Boolean(sky.wind)} calm={calm} />}
            {sky.snowGround && !sky.wind && (
                <g transform="translate(142 122)">
                    <circle cy={-4} r={13} fill="#ffffff" stroke="#c9d6e6" strokeWidth={2} />
                    <circle cy={-24} r={9} fill="#ffffff" stroke="#c9d6e6" strokeWidth={2} />
                    <circle cx={-3} cy={-26} r={1.4} fill={INK} />
                    <circle cx={3} cy={-26} r={1.4} fill={INK} />
                    <path d="M0 -23 l7 2 -7 1z" fill="#f6862e" />
                </g>
            )}
            {sky.rain && (
                <g>
                    <ellipse cx={130} cy={136} rx={22} ry={4} fill="#9fc1e0" opacity={0.8} />
                    <ellipse cx={64} cy={146} rx={16} ry={3} fill="#9fc1e0" opacity={0.8} />
                    <g className={anim("wx-rain")} stroke="#4f86c6" strokeWidth={2.4} strokeLinecap="round">
                        {Array.from({ length: 18 }, (_, i) => {
                            const x = 14 + ((i * 37) % 176);
                            const y = 50 + ((i * 23) % 70);
                            return <line key={i} x1={x} y1={y} x2={x - 3} y2={y + 9} />;
                        })}
                    </g>
                </g>
            )}
            {sky.snow && (
                <g className={anim("wx-snow")} fill="#ffffff" stroke="#c9d6e6" strokeWidth={0.8}>
                    {Array.from({ length: 22 }, (_, i) => {
                        const x = 10 + ((i * 41) % 180);
                        const y = 46 + ((i * 29) % 80);
                        return <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3.4 : 2.4} />;
                    })}
                </g>
            )}
            {sky.wind && (
                <g fill="none" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" opacity={0.9}>
                    {[
                        "M70 60 Q100 52 130 60 Q146 64 152 56",
                        "M86 80 Q120 72 156 82 Q170 86 176 78",
                        "M60 98 Q90 92 116 98",
                    ].map((d, i) => (
                        <path key={i} d={d} strokeDasharray="40 20" className={anim("wx-gust")} style={calm ? undefined : { animationDelay: `${i * -0.8}s` }} />
                    ))}
                </g>
            )}
            {sky.wind && !sky.snow && (
                <g>
                    {[
                        [80, 70, "#f6a33b"],
                        [110, 90, "#e5534b"],
                        [140, 66, "#f2c94c"],
                    ].map(([x, y, color], i) => (
                        <path
                            key={i}
                            d={`M${x} ${y} q6 -6 10 0 q-4 6 -10 0z`}
                            fill={String(color)}
                            className={anim("wx-leaf")}
                            style={calm ? undefined : { animationDelay: `${i * -1}s` }}
                        />
                    ))}
                </g>
            )}
            {sky.frost && <Frost />}
            {sky.thermo && <Thermometer kind={sky.thermo} />}
        </g>
    );
}

function PlaceScene({ id, calm }: { id: SceneId; calm: boolean }) {
    if (id === "pool") {
        return (
            <g>
                <rect width={WINDOW_W} height={WINDOW_H} fill="#e8f6fb" />
                <g stroke="#cfe8f2" strokeWidth={1.5}>
                    {[20, 40, 60].map((y) => (
                        <path key={y} d={`M0 ${y} H200`} />
                    ))}
                    {[25, 50, 75, 100, 125, 150, 175].map((x) => (
                        <path key={x} d={`M${x} 0 V70`} />
                    ))}
                </g>
                <rect x={0} y={70} width={WINDOW_W} height={90} fill="#5bc0eb" />
                <path d="M0 70 H200" stroke="#ffffff" strokeWidth={6} />
                <g fill="none" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" opacity={0.75}>
                    <path d="M14 100 q10 -6 20 0 t20 0 t20 0" />
                    <path d="M110 126 q10 -6 20 0 t20 0 t20 0" />
                    <path d="M40 146 q10 -6 20 0 t20 0" />
                </g>
                <path d="M0 116 H200" stroke="#f2786a" strokeWidth={4} strokeDasharray="10 8" />
                <g stroke="#9aa3b8" strokeWidth={4} fill="none" strokeLinecap="round">
                    <path d="M160 52 V100 M176 52 V100" />
                    <path d="M160 52 Q160 40 150 40 M176 52 Q176 40 186 40" />
                    <path d="M160 70 H176 M160 86 H176" strokeWidth={3} />
                </g>
                <g transform="translate(64 96)">
                    <ellipse rx={18} ry={8} fill="#f6c93b" stroke="#d9a520" strokeWidth={2} />
                    <ellipse rx={8} ry={3.5} fill="#5bc0eb" />
                </g>
            </g>
        );
    }
    if (id === "school") {
        return (
            <g>
                <rect width={WINDOW_W} height={WINDOW_H} fill="#d6f0ff" />
                <Cloud x={40} y={26} s={0.7} color="#ffffff" />
                <path d="M0 128 H200 V160 H0 Z" fill="#8fd16a" />
                <path d="M88 160 L96 128 H104 L112 160 Z" fill="#e8d9b8" />
                <rect x={36} y={56} width={128} height={74} fill="#f4b073" stroke="#c97f45" strokeWidth={2.5} />
                <path d="M28 58 L100 22 L172 58 Z" fill="#e5534b" stroke="#b23a33" strokeWidth={2.5} strokeLinejoin="round" />
                <circle cx={100} cy={44} r={9} fill="#ffffff" stroke="#9aa3b8" strokeWidth={2} />
                <path d="M100 38 V44 L104 47" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" />
                {[48, 76, 112, 140].map((x) => (
                    <rect key={x} x={x} y={70} width={16} height={18} rx={2} fill="#bfe3f7" stroke="#c97f45" strokeWidth={2} />
                ))}
                <rect x={88} y={98} width={24} height={32} rx={3} fill="#8a5a32" />
                <circle cx={107} cy={115} r={1.8} fill="#f6c93b" />
                <path d="M164 128 V30" stroke="#9aa3b8" strokeWidth={2.5} />
                <path d="M164 32 H186 V44 H164 Z" fill="#3f8fd8" />
            </g>
        );
    }
    // Park pod snegom
    return (
        <g>
            <rect width={WINDOW_W} height={WINDOW_H} fill="#dfe8f3" />
            <Cloud x={150} y={26} s={0.9} color="#ffffff" />
            <path d="M0 108 Q60 96 120 106 Q160 112 200 100 V160 H0 Z" fill="#ffffff" stroke="#d5e2f0" strokeWidth={2} />
            <g transform="translate(48 110)">
                <path d="M-3 0 V-30 H3 V0 Z" fill="#8a5a32" />
                <path d="M0 -76 L-24 -30 H24 Z" fill="#3f8a5a" />
                <path d="M0 -76 L-16 -46 Q0 -52 16 -46 Z" fill="#ffffff" />
                <path d="M-20 -34 Q0 -40 20 -34" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" fill="none" />
            </g>
            <g transform="translate(130 120)">
                <rect x={-26} y={-12} width={52} height={6} rx={2} fill="#b77a45" />
                <rect x={-26} y={-24} width={52} height={6} rx={2} fill="#b77a45" />
                <path d="M-22 -6 V8 M22 -6 V8" stroke="#6a4a2a" strokeWidth={3} />
                <path d="M-27 -25 Q0 -31 27 -25" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" fill="none" />
            </g>
            <g transform="translate(86 140)">
                <rect x={-18} y={-6} width={36} height={8} rx={4} fill="#e5534b" />
                <path d="M-20 4 H22 Q26 4 26 0" stroke="#5a4636" strokeWidth={2.5} fill="none" strokeLinecap="round" />
            </g>
            <g className={calm ? undefined : "wx-snow"} fill="#ffffff" stroke="#c9d6e6" strokeWidth={0.8}>
                {Array.from({ length: 14 }, (_, i) => (
                    <circle key={i} cx={12 + ((i * 47) % 176)} cy={20 + ((i * 31) % 80)} r={i % 3 === 0 ? 3 : 2.2} />
                ))}
            </g>
        </g>
    );
}

/**
 * Prozor sa vremenom (ili slika mesta: bazen, škola, park). Za vreme je to prozor sa ramom i
 * krstom; za mesto ram razglednice.
 */
export function WeatherWindow({ scene, calm, className }: { scene: SceneId; calm: boolean; className?: string }) {
    const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const place = scene === "pool" || scene === "school" || scene === "park";
    return (
        <svg viewBox={`-10 -10 ${WINDOW_W + 20} ${WINDOW_H + 26}`} aria-hidden="true" focusable="false" className={className}>
            <style>{SKY_STYLE}</style>
            <defs>
                <clipPath id={`${uid}-pane`}>
                    <rect x={0} y={0} width={WINDOW_W} height={WINDOW_H} rx={place ? 12 : 4} />
                </clipPath>
            </defs>
            {place ? (
                <rect x={-8} y={-8} width={WINDOW_W + 16} height={WINDOW_H + 16} rx={18} fill="#ffffff" stroke="#d9d4ea" strokeWidth={2} />
            ) : (
                <>
                    <rect x={-8} y={-8} width={WINDOW_W + 16} height={WINDOW_H + 16} rx={10} fill="#f4ede1" stroke="#c9b48e" strokeWidth={3} />
                    <rect x={-10} y={WINDOW_H + 6} width={WINDOW_W + 20} height={9} rx={4} fill="#e7d8bd" stroke="#c9b48e" strokeWidth={2} />
                </>
            )}
            <g clipPath={`url(#${uid}-pane)`}>{place ? <PlaceScene id={scene} calm={calm} /> : <SkyScene id={scene} calm={calm} />}</g>
            {!place && (
                <g>
                    <rect x={0} y={0} width={WINDOW_W} height={WINDOW_H} rx={4} fill="none" stroke="#c9b48e" strokeWidth={3} />
                    <path d={`M${WINDOW_W / 2} 0 V${WINDOW_H} M0 ${WINDOW_H / 2 - 4} H${WINDOW_W}`} stroke="#f4ede1" strokeWidth={6} />
                    <path d={`M${WINDOW_W / 2} 0 V${WINDOW_H} M0 ${WINDOW_H / 2 - 4} H${WINDOW_W}`} stroke="#c9b48e" strokeWidth={1.2} opacity={0.7} />
                </g>
            )}
        </svg>
    );
}

// ── Ikonice vremena (nedeljna prognoza) ───────────────────────────────────────

/** Mala ikonica vremena u okviru 100 × 100 */
export function WeatherIcon({ scene, className }: { scene: SceneId; className?: string }) {
    const sky = SKIES[scene];
    return (
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
            {sky?.sun && (
                <g transform="translate(46 46)">
                    <g stroke="#f7b500" strokeWidth={6} strokeLinecap="round">
                        {Array.from({ length: 8 }, (_, i) => {
                            const a = (i * Math.PI) / 4;
                            return <line key={i} x1={Math.cos(a) * 28} y1={Math.sin(a) * 28} x2={Math.cos(a) * 38} y2={Math.sin(a) * 38} />;
                        })}
                    </g>
                    <circle r={21} fill="#ffd24a" stroke="#f0a818" strokeWidth={3} />
                </g>
            )}
            {sky?.clouds && (
                <g transform="translate(48 40) scale(1.25)">
                    <path
                        d="M-26 8 Q-30 -6 -16 -8 Q-12 -22 4 -18 Q16 -26 24 -12 Q36 -10 32 4 Q32 10 24 10 H-20 Q-28 12 -26 8Z"
                        fill={sky.clouds === "dark" ? "#8f99aa" : sky.clouds === "grey" ? "#d6dce6" : "#e8f2fb"}
                        stroke={sky.clouds === "dark" ? "#6f7888" : "#aab6c6"}
                        strokeWidth={2}
                    />
                </g>
            )}
            {sky?.rain && (
                <g stroke="#3f7fc8" strokeWidth={5} strokeLinecap="round">
                    {[28, 46, 64].map((x, i) => (
                        <line key={x} x1={x} y1={62 + (i % 2) * 6} x2={x - 5} y2={76 + (i % 2) * 6} />
                    ))}
                </g>
            )}
            {sky?.snow && (
                <g stroke="#6f9fd8" strokeWidth={3.2} strokeLinecap="round">
                    {[28, 50, 72].map((x, i) => (
                        <g key={x} transform={`translate(${x} ${70 + (i % 2) * 8})`}>
                            <path d="M0 -7 V7 M-6 -3.5 L6 3.5 M-6 3.5 L6 -3.5" />
                        </g>
                    ))}
                </g>
            )}
            {sky?.wind && (
                <g fill="none" stroke="#3f8fd8" strokeWidth={5} strokeLinecap="round">
                    <path d={sky.clouds && (sky.rain || sky.snow) ? "M58 86 H82 Q92 86 90 78" : "M14 62 H64 Q78 62 76 50 Q74 42 66 44"} />
                    <path d={sky.clouds && (sky.rain || sky.snow) ? "M54 94 H74" : "M14 76 H76 Q90 76 88 88 Q86 96 78 94"} />
                </g>
            )}
            {sky?.thermo === "cold" && (
                <g transform="translate(82 30)">
                    <rect x={-6} y={-6} width={12} height={46} rx={6} fill="#ffffff" stroke="#6f7888" strokeWidth={2.5} />
                    <circle cy={42} r={9} fill="#3f8fd8" stroke="#6f7888" strokeWidth={2.5} />
                    <rect x={-2.5} y={24} width={5} height={14} fill="#3f8fd8" />
                </g>
            )}
        </svg>
    );
}
