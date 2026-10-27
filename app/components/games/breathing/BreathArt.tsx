"use client";

// Crteži igre „Balon disanja” (čist SVG, bez stanja): balon, cvet i svećica, vetrenjača, mehur,
// kvadrat i pet prstiju. Sve se pomera samo meko i sporo (ease-in-out, trajanje = trajanje
// udaha ili izdaha), bez treptanja. Uz smanjene pokrete (`calm`) ništa ne raste i ne vrti se:
// balon se polako puni bojom, korak po korak (roditelj šalje `level` svake sekunde).
//
// `BreathBalloon` koristi i ekran „Pauza” (GameContainer.tsx): dete na pauzi vidi isti balon
// sa kojim je vežbalo disanje.

import type { CSSProperties, ReactNode } from "react";
import { useId } from "react";
import type { BreathPhase, BreathPicture } from "@/app/components/games/data/breathingLevels";

const INK = "#3b3760";
const LINE = "rgba(31, 27, 58, 0.18)";

/** Kretanje ka cilju za `ms` (meko); uz smanjene pokrete odmah */
function move(ms: number, calm: boolean, easing = "ease-in-out"): CSSProperties {
    return calm ? { transition: "none" } : { transition: `transform ${Math.max(ms, 200)}ms ${easing}, opacity ${Math.max(ms, 200)}ms ${easing}` };
}

function useSvgId(prefix: string): string {
    return prefix + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

// ── Balon ──────────────────────────────────────────────────────────────────────

interface BalloonProps {
    /** Koliko je balon pun: 0 = mali (izdahnuto), 1 = veliki (udahnuto) */
    level: number;
    /** Za koliko ms balon stiže do `level` */
    ms: number;
    color: string;
    calm: boolean;
    className?: string;
    /** Nasmejano lice na balonu */
    face?: boolean;
}

/**
 * Balon koji „diše”: raste do `level` za `ms` milisekundi. Uz `calm` balon je stalno iste
 * veličine, a boja ga puni odozdo do `level` (bez pokreta). Koriste ga igra i ekran „Pauza”.
 */
export function BreathBalloon({ className, ...props }: BalloonProps) {
    return (
        <svg viewBox="0 0 200 250" className={className} aria-hidden="true" focusable="false">
            <BalloonGroup {...props} />
        </svg>
    );
}

/** Isti balon kao grupa (za scenu igre, u okviru 200 × 250) */
function BalloonGroup({ level, ms, color, calm, face = true }: Omit<BalloonProps, "className">) {
    const clip = useSvgId("bb");
    const fill = Math.min(Math.max(level, 0), 1);
    const scale = calm ? 1 : 0.58 + 0.42 * fill;
    return (
        <g>
            <defs>
                <clipPath id={clip}>
                    <path d={BALLOON} />
                </clipPath>
            </defs>
            {/* Konac ostaje na mestu; balon raste iznad čvora */}
            <path d="M100 184 C92 200 110 212 100 226 C94 236 104 242 100 248" fill="none" stroke="#9a96b8" strokeWidth="2.5" strokeLinecap="round" />
            <g style={{ transform: `scale(${scale})`, transformBox: "fill-box", transformOrigin: "50% 98%", ...move(ms, calm) }}>
                {calm ? (
                    <>
                        <path d={BALLOON} fill="#ffffff" />
                        <g clipPath={`url(#${clip})`}>
                            <rect x="20" y={20 + 160 * (1 - fill)} width="160" height={170} fill={color} opacity="0.9" />
                        </g>
                        <path d={BALLOON} fill="none" stroke={color} strokeWidth="4" />
                    </>
                ) : (
                    <path d={BALLOON} fill={color} />
                )}
                <path d={BALLOON} fill="none" stroke={LINE} strokeWidth="2" />
                <ellipse cx="72" cy="66" rx="13" ry="22" fill="#ffffff" opacity="0.45" transform="rotate(24 72 66)" />
                <path d="M93 178 L107 178 L103 186 L97 186 Z" fill={color} stroke={LINE} strokeWidth="1.5" strokeLinejoin="round" />
                {face && (
                    <g fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" opacity="0.75">
                        <path d="M78 104 q6 5 12 0" />
                        <path d="M110 104 q6 5 12 0" />
                        <path d="M90 122 q10 8 20 0" />
                    </g>
                )}
                {face && (
                    <g fill="#ffffff" opacity="0.35">
                        <ellipse cx="72" cy="118" rx="8" ry="5" />
                        <ellipse cx="128" cy="118" rx="8" ry="5" />
                    </g>
                )}
            </g>
        </g>
    );
}

/** Obris balona: širok gore, sužava se ka čvoru (100, 180) */
const BALLOON = "M100 22 C150 22 178 60 178 102 C178 140 146 170 104 180 L96 180 C54 170 22 140 22 102 C22 60 50 22 100 22 Z";

// ── Scena za jedan udah ────────────────────────────────────────────────────────

interface SceneProps {
    picture: BreathPicture;
    phase: BreathPhase;
    /** Trajanje tekućeg dela (ms) */
    ms: number;
    /** Sekunde koje su prošle u tekućem delu (za korake uz smanjene pokrete) */
    tick: number;
    /** Ukupno sekundi u tekućem delu */
    seconds: number;
    color: string;
    finger: number;
    /** Prsti koji su već „prodisani” */
    fingersDone: number;
    calm: boolean;
    className?: string;
}

/** Koliko je balon (cvet, mehur) „pun” u ovom trenutku: cilj dela, a uz `calm` korak po korak */
function fullness(phase: BreathPhase, tick: number, seconds: number, calm: boolean): number {
    const part = seconds > 0 ? Math.min(tick / seconds, 1) : 1;
    if (phase === "in") return calm ? part : 1;
    if (phase === "hold") return 1;
    if (phase === "out") return calm ? 1 - part : 0;
    return 0;
}

/** Scena jednog udaha (sve slike su u istom okviru 300 × 250) */
export function BreathScene(props: SceneProps) {
    const { picture, phase, ms, tick, seconds, color, calm, className } = props;
    const level = fullness(phase, tick, seconds, calm);
    // Na početku sledećeg udaha balon se vrati na malo bez dugog pokreta
    const speed = phase === "ready" ? 900 : ms;
    let art: ReactNode;
    if (picture === "balloon") {
        art = (
            <g transform="translate(50 0)">
                <BalloonGroup level={level} ms={speed} color={color} calm={calm} />
            </g>
        );
    } else if (picture === "flower") art = <FlowerCandle phase={phase} level={level} ms={speed} color={color} calm={calm} tick={tick} seconds={seconds} />;
    else if (picture === "pinwheel") art = <Pinwheel phase={phase} ms={speed} color={color} calm={calm} tick={tick} />;
    else if (picture === "bubble") art = <Bubble phase={phase} level={level} ms={speed} color={color} calm={calm} />;
    else if (picture === "box") art = <BoxPath phase={phase} ms={speed} calm={calm} tick={tick} seconds={seconds} />;
    else art = <Fingers {...props} />;
    return (
        // Kvadratni isečak (sredina scene 300 × 250): na uspravnom telefonu slika je što veća
        <svg viewBox="25 0 250 250" className={className} aria-hidden="true" focusable="false">
            <style>{SCENE_STYLE}</style>
            <Backdrop />
            {art}
        </svg>
    );
}

/** Mirna pozadina: meko nebo, dva oblačića i brežuljak (ništa se ne pomera) */
function Backdrop() {
    return (
        <g aria-hidden="true">
            <ellipse cx="150" cy="128" rx="128" ry="112" fill="#ffffff" opacity="0.55" />
            <g fill="#ffffff" opacity="0.9">
                <ellipse cx="44" cy="54" rx="22" ry="11" />
                <ellipse cx="60" cy="47" rx="15" ry="11" />
                <ellipse cx="252" cy="78" rx="20" ry="10" />
                <ellipse cx="266" cy="72" rx="13" ry="9" />
            </g>
            <ellipse cx="150" cy="268" rx="190" ry="40" fill="#d7f2f0" />
        </g>
    );
}

const SCENE_STYLE =
    "@keyframes bmb-spin{to{transform:rotate(360deg)}}" +
    ".bmb-spin{animation:bmb-spin 2.6s linear infinite;transform-box:fill-box;transform-origin:center}" +
    "@media (prefers-reduced-motion:reduce){.bmb-spin{animation:none}}";

// ── Cvet i svećica ─────────────────────────────────────────────────────────────

function FlowerCandle({ phase, level, ms, color, calm, tick, seconds }: { phase: BreathPhase; level: number; ms: number; color: string; calm: boolean; tick: number; seconds: number }) {
    const smelling = phase === "in" || phase === "hold";
    const blowing = phase === "out";
    // Plamen: ceo dok se miriše, polako se smanjuje i naginje dok se duva, posle se upali ponovo
    const part = seconds > 0 ? Math.min(tick / seconds, 1) : 1;
    const flame = blowing ? (calm ? 1 - 0.75 * part : 0.25) : 1;
    const lean = blowing ? (calm ? 0 : 22) : 0;
    const petals = [0, 60, 120, 180, 240, 300];
    return (
        <g>
            {/* Cvet levo */}
            <g transform="translate(86 196)">
                <path d="M0 0 C-4 -30 4 -60 0 -88" fill="none" stroke="#6db27a" strokeWidth="6" strokeLinecap="round" />
                <path d="M0 -36 C-18 -44 -30 -34 -32 -22 C-18 -20 -6 -26 0 -36 Z" fill="#8fcb86" />
                <path d="M0 -52 C18 -62 32 -52 34 -40 C18 -38 6 -44 0 -52 Z" fill="#7dbe7e" />
                <g style={{ transform: `scale(${calm ? 1 : 0.86 + 0.18 * level})`, transformBox: "fill-box", transformOrigin: "50% 50%", ...move(ms, calm) }}>
                    {petals.map((a) => (
                        <ellipse key={a} cx="0" cy="-122" rx="13" ry="22" fill={color} stroke={LINE} strokeWidth="1.5" transform={`rotate(${a} 0 -100)`} />
                    ))}
                    <circle cx="0" cy="-100" r="15" fill="#ffd66b" stroke={LINE} strokeWidth="1.5" />
                    <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
                        <path d="M-7 -102 q3 3 6 0" />
                        <path d="M2 -102 q3 3 6 0" />
                        <path d="M-4 -94 q4 4 8 0" />
                    </g>
                </g>
                {/* Miris: tri meke linije ka detetu, samo dok se miriše */}
                <g fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={smelling ? 0.8 : 0} style={calm ? undefined : { transition: "opacity 600ms ease-in-out" }}>
                    <path d="M28 -132 q10 -8 20 0 t20 0" />
                    <path d="M30 -112 q10 -8 20 0 t20 0" />
                </g>
            </g>
            {/* Svećica desno */}
            <g transform="translate(222 206)">
                <ellipse cx="0" cy="4" rx="34" ry="7" fill="#000" opacity="0.06" />
                <path d="M-30 0 Q-30 -10 -20 -10 H20 Q30 -10 30 0 Z" fill="#c3a6f0" />
                <rect x="-15" y="-86" width="30" height="78" rx="6" fill="#fff4e4" stroke="#ead7b7" strokeWidth="2" />
                <path d="M-15 -60 H15 M-15 -36 H15" stroke="#f4a6c0" strokeWidth="5" opacity="0.6" />
                <path d="M0 -86 V-96" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
                <g style={{ transform: `rotate(${lean}deg) scale(${flame})`, transformBox: "fill-box", transformOrigin: "50% 100%", ...move(blowing ? ms : 700, calm) }}>
                    <path d="M0 -136 C10 -122 13 -108 0 -96 C-13 -108 -10 -122 0 -136 Z" fill="#ffc15e" />
                    <path d="M0 -122 C5 -114 6 -106 0 -100 C-6 -106 -5 -114 0 -122 Z" fill="#fff1a8" />
                </g>
                {/* Dah koji duva ka svećici */}
                <g fill="none" stroke="#9fd3f5" strokeWidth="3" strokeLinecap="round" opacity={blowing ? 0.85 : 0} style={calm ? undefined : { transition: "opacity 600ms ease-in-out" }}>
                    <path d="M-86 -112 q12 -6 24 0 t24 0" />
                    <path d="M-80 -96 q10 -5 20 0 t20 0" />
                </g>
            </g>
        </g>
    );
}

// ── Vetrenjača ─────────────────────────────────────────────────────────────────

function Pinwheel({ phase, ms, color, calm, tick }: { phase: BreathPhase; ms: number; color: string; calm: boolean; tick: number }) {
    const blowing = phase === "out";
    // Uz smanjene pokrete vetrenjača se okrene za jedan mali korak svake sekunde (bez vrtenja)
    const step = calm && blowing ? tick * 15 : 0;
    const blades = [0, 90, 180, 270];
    const tones = [color, "#ffd66b", color, "#9fd8a8"];
    return (
        <g>
            <path d="M150 128 V242" stroke="#c49a6c" strokeWidth="7" strokeLinecap="round" />
            <g transform={`translate(150 122) rotate(${step})`}>
                <g className={blowing && !calm ? "bmb-spin" : undefined} style={blowing && !calm ? { animationDuration: `${Math.max(ms / 2, 1600)}ms` } : undefined}>
                    {blades.map((a, i) => (
                        <path key={a} d="M0 0 L0 -84 Q46 -64 0 0 Z" fill={tones[i]} stroke={LINE} strokeWidth="2" strokeLinejoin="round" transform={`rotate(${a})`} />
                    ))}
                    <circle r="9" fill="#ffffff" stroke={LINE} strokeWidth="2" />
                </g>
            </g>
            <g fill="none" stroke="#9fd3f5" strokeWidth="3.4" strokeLinecap="round" opacity={blowing ? 0.85 : 0} style={calm ? undefined : { transition: "opacity 600ms ease-in-out" }}>
                <path d="M40 96 q10 -6 20 0 t20 0" />
                <path d="M36 122 q10 -6 20 0 t20 0" />
                <path d="M40 148 q10 -6 20 0 t20 0" />
            </g>
        </g>
    );
}

// ── Mehur od sapunice ──────────────────────────────────────────────────────────

function Bubble({ phase, level, ms, color, calm }: { phase: BreathPhase; level: number; ms: number; color: string; calm: boolean }) {
    // Mehur raste dok se duva (izdah), a pre sledećeg udaha je mali
    const size = phase === "out" ? 1 - level : phase === "hold" || phase === "in" ? 0 : 1;
    const grow = calm ? Math.max(size, 0.12) : phase === "out" ? 1 : 0.12;
    const clip = useSvgId("bbl");
    return (
        <g>
            <defs>
                <radialGradient id={clip} cx="0.35" cy="0.35" r="0.7">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="0.6" stopColor={color} stopOpacity="0.25" />
                    <stop offset="1" stopColor={color} stopOpacity="0.55" />
                </radialGradient>
            </defs>
            {/* Štapić sa obručem */}
            <path d="M52 236 L104 172" stroke="#f4a6c0" strokeWidth="7" strokeLinecap="round" />
            <circle cx="114" cy="160" r="15" fill="none" stroke="#f4a6c0" strokeWidth="6" />
            <g style={{ transform: `scale(${grow})`, transformBox: "fill-box", transformOrigin: "10% 85%", ...move(phase === "out" ? ms : 700, calm) }}>
                <circle cx="190" cy="92" r="78" fill={`url(#${clip})`} stroke={color} strokeWidth="3" opacity="0.95" />
                <ellipse cx="160" cy="62" rx="18" ry="10" fill="#ffffff" opacity="0.8" transform="rotate(-30 160 62)" />
            </g>
        </g>
    );
}

// ── Kvadrat ────────────────────────────────────────────────────────────────────

/** Uglovi kvadrata: dole levo → gore levo (udah) → gore desno (zadrži) → dole desno (izdah) → dole levo (zadrži) */
const BOX = { x0: 70, y0: 50, x1: 230, y1: 210 } as const;

function BoxPath({ phase, ms, calm, tick, seconds }: { phase: BreathPhase; ms: number; calm: boolean; tick: number; seconds: number }) {
    const { x0, y0, x1, y1 } = BOX;
    const corners: Record<BreathPhase, [number, number]> = { ready: [x0, y1], in: [x0, y0], hold: [x1, y0], out: [x1, y1], rest: [x0, y1] };
    const starts: Record<BreathPhase, [number, number]> = { ready: [x0, y1], in: [x0, y1], hold: [x0, y0], out: [x1, y0], rest: [x1, y1] };
    let [x, y] = corners[phase];
    if (calm && phase !== "ready") {
        // Korak po korak: tačka skače za jedan deo stranice svake sekunde
        const part = seconds > 0 ? Math.min(tick / seconds, 1) : 1;
        const [sx, sy] = starts[phase];
        x = sx + (x - sx) * part;
        y = sy + (y - sy) * part;
    }
    const side = (which: BreathPhase) => (phase === which ? "#55b7b1" : "#d7f2f0");
    return (
        <g>
            <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx="18" fill="#effaf9" />
            <path d={`M${x0} ${y1} V${y0}`} stroke={side("in")} strokeWidth="12" strokeLinecap="round" />
            <path d={`M${x0} ${y0} H${x1}`} stroke={side("hold")} strokeWidth="12" strokeLinecap="round" />
            <path d={`M${x1} ${y0} V${y1}`} stroke={side("out")} strokeWidth="12" strokeLinecap="round" />
            <path d={`M${x1} ${y1} H${x0}`} stroke={side("rest")} strokeWidth="12" strokeLinecap="round" />
            <g fontFamily="inherit" fontWeight="800" fontSize="15" fill="#276564" textAnchor="middle">
                <text x={x0 - 26} y={(y0 + y1) / 2} transform={`rotate(-90 ${x0 - 26} ${(y0 + y1) / 2})`}>UDAH</text>
                <text x={(x0 + x1) / 2} y={y0 - 16}>ZADRŽI</text>
                <text x={x1 + 26} y={(y0 + y1) / 2} transform={`rotate(90 ${x1 + 26} ${(y0 + y1) / 2})`}>IZDAH</text>
                <text x={(x0 + x1) / 2} y={y1 + 30}>ZADRŽI</text>
            </g>
            <g style={{ transform: `translate(${x}px, ${y}px)`, ...move(phase === "ready" ? 600 : ms, calm, "linear") }}>
                <circle r="17" fill="#ffffff" stroke="#3a9a96" strokeWidth="4" />
                <circle r="8" fill="#ffc978" />
            </g>
        </g>
    );
}

// ── Pet prstiju ────────────────────────────────────────────────────────────────

/** Prsti: gde im je osnova na dlanu, ugao i dužina (palac izlazi sa strane dlana, niže) */
const FINGERS = [
    { x: -48, y: -8, a: -42, len: 62, w: 32 },
    { x: -34, y: -40, a: -16, len: 74, w: 30 },
    { x: -8, y: -48, a: -4, len: 84, w: 30 },
    { x: 18, y: -46, a: 8, len: 78, w: 29 },
    { x: 42, y: -36, a: 22, len: 62, w: 26 },
] as const;

const fingerAt = (fi: (typeof FINGERS)[number]) => `translate(${fi.x} ${fi.y}) rotate(${fi.a})`;

function Fingers({ phase, ms, calm, tick, seconds, finger, fingersDone, color }: SceneProps) {
    const skin = "#f4c7a1";
    const edge = "#c98e6a";
    const active = Math.min(Math.max(finger, 0), 4);
    const f = FINGERS[active];
    // Tačka u prostoru prsta: osnova levo → vrh (udah) → osnova desno (izdah)
    const base = -14;
    const points: Record<BreathPhase, [number, number]> = {
        ready: [-f.w / 2 - 4, base],
        in: [0, -f.len - 4],
        hold: [0, -f.len - 4],
        out: [f.w / 2 + 4, base],
        rest: [f.w / 2 + 4, base],
    };
    let [dx, dy] = points[phase];
    if (calm && (phase === "in" || phase === "out")) {
        const part = seconds > 0 ? Math.min(tick / seconds, 1) : 1;
        const [sx, sy] = phase === "in" ? points.ready : points.in;
        dx = sx + (dx - sx) * part;
        dy = sy + (dy - sy) * part;
    }
    return (
        <g>
            <g transform="translate(150 206)">
                {FINGERS.map((fi, i) => (
                    <g key={i} transform={fingerAt(fi)}>
                        <rect x={-fi.w / 2} y={-fi.len} width={fi.w} height={fi.len + 20} rx={fi.w / 2} fill={i < fingersDone ? color : skin} stroke={edge} strokeWidth="2" />
                        {i === active && <rect x={-fi.w / 2} y={-fi.len} width={fi.w} height={fi.len + 20} rx={fi.w / 2} fill="none" stroke="#3a9a96" strokeWidth="4" />}
                    </g>
                ))}
                <rect x="-58" y="-56" width="116" height="88" rx="38" fill={skin} stroke={edge} strokeWidth="2" />
                <path d="M-30 -20 q30 18 60 0" fill="none" stroke={edge} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                {/* Tačka putuje gore pa dole po prstu koji je na redu */}
                <g transform={fingerAt(f)}>
                    <g style={{ transform: `translate(${dx}px, ${dy}px)`, ...move(phase === "ready" ? 600 : ms, calm) }}>
                        <circle r="12" fill="#ffffff" stroke="#3a9a96" strokeWidth="3.5" />
                        <circle r="5.5" fill="#ffc978" />
                    </g>
                </g>
            </g>
        </g>
    );
}
