"use client";

// Crteži igre „Saobraćaj”: ulica sa pešačkim prelazom i semaforom (zadatak čekanja), semafori za
// pešake i automobile, mali prizori „bezbedno / nije bezbedno” (uvek ista situacija koja se
// razlikuje u jednoj stvari: kaciga, pojas, prelaz, ruka odraslog, prsluk), koraci prelaska i
// znakovi. Deca su isti likovi kao na slikama situacija (scene/figures), sa kacigom, prslukom
// ili pojasom kad treba. Nebezbedne slike su mirne: bez nesreće, plača i straha.

import type { ReactNode } from "react";
import { INK, line, Shine } from "@/app/components/games/pictures/kit";
import { Figure, gazeToward } from "@/app/components/games/scene/figures";
import { Prop } from "@/app/components/games/scene/props";
import type { AdultId, LookId, PoseId, WearId } from "@/app/components/games/scene/types";
import { basePic } from "@/app/components/games/world/basePics";
import type { CrossingProps } from "@/app/components/games/world/WorldGame";

// ── Delovi prizora ────────────────────────────────────────────────────────────

interface KidProps {
    id: LookId | AdultId;
    x: number;
    y: number;
    s?: number;
    pose?: PoseId;
    face?: "calm" | "happy" | "talk" | "neutral";
    wear?: WearId[];
    flip?: boolean;
    /** Kuda gleda (u koordinatama lika) */
    look?: [number, number];
}

/** Lik iz slika situacija: stopala su u (x, y) */
function Kid({ id, x, y, s = 1, pose = "stand", face = "calm", wear = [], flip = false, look }: KidProps) {
    const gaze = look ? gazeToward(id, pose, look[0], look[1], 1) : undefined;
    return (
        <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
            <ellipse cx={0} cy={0} rx={12} ry={2.4} fill="#000" opacity={0.08} />
            <Figure id={id} pose={pose} face={face} wear={wear} gaze={gaze} />
        </g>
    );
}

function Car({ x, y, s = 1, color = "#e8604a", flip = false }: { x: number; y: number; s?: number; color?: string; flip?: boolean }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
            <ellipse cx={0} cy={1} rx={30} ry={3} fill="#000" opacity={0.12} />
            <path d="M-30 -6 L-30 -16 Q-29 -22 -21 -23 L-13 -33 Q-10 -36 -4 -36 L10 -36 Q16 -36 19 -31 L25 -23 Q31 -22 31 -15 L31 -6Z" fill={color} {...line("#1f1b3a", 1.2)} strokeOpacity={0.4} />
            <path d="M-11 -31 L-3 -31 L-3 -23 L-17 -23Z M2 -31 L11 -31 Q14 -31 17 -23 L2 -23Z" fill="#cfeefc" />
            <circle cx={-18} cy={-5} r={6} fill="#3b3b4b" />
            <circle cx={-18} cy={-5} r={2.4} fill="#c9c9d6" />
            <circle cx={19} cy={-5} r={6} fill="#3b3b4b" />
            <circle cx={19} cy={-5} r={2.4} fill="#c9c9d6" />
            <rect x={27} y={-18} width={4} height={4} rx={1} fill="#fff3b0" />
        </g>
    );
}

/** Ulica u kvadratu: nebo, kuće, trotoar, kolovoz (i zebra) */
function Street({ zebra = false, night = false, children }: { zebra?: boolean; night?: boolean; children?: ReactNode }) {
    return (
        <g>
            <rect x={0} y={0} width={100} height={100} rx={14} fill={night ? "#262a62" : "#cdeefc"} />
            <rect x={6} y={18} width={22} height={30} fill={night ? "#3b3f7a" : "#f4e1c4"} />
            <rect x={70} y={10} width={26} height={38} fill={night ? "#34386e" : "#e6dccf"} />
            {[10, 18].map((x) => (
                <rect key={x} x={x} y={24} width={6} height={6} fill={night ? "#ffd75a" : "#cfeefc"} />
            ))}
            {[75, 85].map((x) => (
                <rect key={x} x={x} y={18} width={6} height={7} fill={night ? "#ffd75a" : "#cfeefc"} />
            ))}
            <rect x={0} y={46} width={100} height={8} fill={night ? "#5a5a6a" : "#d9d2c8"} />
            <rect x={0} y={54} width={100} height={26} fill={night ? "#3b3f4a" : "#6a6f7a"} />
            {zebra && [57, 63, 69, 75].map((y) => <rect key={y} x={34} y={y} width={32} height={3.4} fill="#f4f4f4" opacity={night ? 0.6 : 1} />)}
            {!zebra && <path d="M4 67 L18 67 M30 67 L44 67 M56 67 L70 67 M82 67 L96 67" {...line(night ? "#8a8a9a" : "#f4f4f4", 1.6)} />}
            <path d="M0 80 L100 80 L100 86 Q100 100 86 100 L14 100 Q0 100 0 86Z" fill={night ? "#5a5a6a" : "#e6dfd4"} />
            <rect x={0} y={80} width={100} height={2} fill={night ? "#7a7a8a" : "#c9c1b4"} />
            {children}
        </g>
    );
}

function Park({ children }: { children?: ReactNode }) {
    return (
        <g>
            <rect x={0} y={0} width={100} height={100} rx={14} fill="#cdeefc" />
            <path d="M0 56 Q50 48 100 58 L100 86 Q100 100 86 100 L14 100 Q0 100 0 86Z" fill="#9ad66a" />
            <circle cx={16} cy={36} r={13} fill="#5fae4f" />
            <rect x={14} y={44} width={4} height={14} fill="#8a5a2b" />
            <circle cx={86} cy={40} r={10} fill="#6abf58" />
            <rect x={84} y={46} width={4} height={12} fill="#8a5a2b" />
            {children}
        </g>
    );
}

function Clip({ id, children }: { id: string; children: ReactNode }) {
    return (
        <>
            <defs>
                <clipPath id={`tr-${id}`}>
                    <rect x={0} y={0} width={100} height={100} rx={14} />
                </clipPath>
            </defs>
            <g clipPath={`url(#tr-${id})`}>{children}</g>
        </>
    );
}

/** Dete na biciklu (kao na slikama situacija: bicikl je ispod lika) */
function Rider({ x, y, helmet }: { x: number; y: number; helmet: boolean }) {
    const s = 0.95;
    return (
        <g>
            <g transform={`translate(${x + 10 * s} ${y + 22 * s}) scale(${1.4 * s})`}>
                <Prop id="bicycle" tone="#3f8fd8" />
            </g>
            <Kid id="amar" x={x} y={y} s={s} pose="ride" face="happy" wear={helmet ? ["helmet"] : []} />
        </g>
    );
}

/** Auto sa strane, kroz prozor se vidi dete na zadnjem sedištu */
function CarInside({ belt }: { belt: boolean }) {
    return (
        <g>
            <rect x={0} y={0} width={100} height={100} rx={14} fill="#dff1fb" />
            <rect x={0} y={80} width={100} height={20} fill="#6a6f7a" />
            {/* Prozor (iza lika) */}
            <path d="M24 30 L40 16 L74 16 L86 34 L86 56 L24 56Z" fill="#bfe6fb" />
            {belt ? (
                <Kid id="lejla" x={50} y={66} s={0.62} pose="sit" face="happy" wear={["belt"]} />
            ) : (
                <Kid id="lejla" x={50} y={62} s={0.62} pose="wave" face="happy" />
            )}
            {/* Karoserija sa otvorom za prozor */}
            <path
                fillRule="evenodd"
                d="M6 82 L6 52 Q8 40 20 36 L36 14 Q40 10 48 10 L74 10 Q82 10 86 16 L96 34 Q98 40 98 52 L98 82Z M24 30 L40 16 L74 16 L86 34 L86 56 L24 56Z"
                fill="#e8604a"
                {...line("#a8392b", 1.6)}
            />
            <path d="M62 16 L62 56" {...line("#a8392b", 2)} />
            <circle cx={28} cy={84} r={11} fill="#3b3b4b" />
            <circle cx={28} cy={84} r={4.4} fill="#c9c9d6" />
            <circle cx={78} cy={84} r={11} fill="#3b3b4b" />
            <circle cx={78} cy={84} r={4.4} fill="#c9c9d6" />
            <rect x={70} y={62} width={8} height={3} rx={1.5} fill="#a8392b" />
        </g>
    );
}

// ── Prizori: bezbedno / nije bezbedno ─────────────────────────────────────────

const SCENES: Record<string, () => ReactNode> = {
    bikeHelmet: () => (
        <Clip id="bh">
            <Park>
                <path d="M0 84 Q50 76 100 86 L100 100 L0 100Z" fill="#e6dfd4" />
                <Rider x={44} y={70} helmet />
            </Park>
        </Clip>
    ),
    bikeNoHelmet: () => (
        <Clip id="bn">
            <Park>
                <path d="M0 84 Q50 76 100 86 L100 100 L0 100Z" fill="#e6dfd4" />
                <Rider x={44} y={70} helmet={false} />
            </Park>
        </Clip>
    ),
    carBelt: () => (
        <Clip id="cb">
            <CarInside belt />
        </Clip>
    ),
    carNoBelt: () => (
        <Clip id="cn">
            <CarInside belt={false} />
        </Clip>
    ),
    crossZebra: () => (
        <Clip id="cz">
            <Street zebra>
                <Kid id="haris" x={50} y={78} s={0.62} pose="walk" face="happy" />
            </Street>
        </Clip>
    ),
    crossCars: () => (
        <Clip id="cc">
            <Street>
                <Car x={22} y={78} s={0.75} color="#5aa8e8" />
                <Car x={82} y={78} s={0.75} color="#f6c518" flip />
                <Kid id="haris" x={52} y={80} s={0.62} pose="walk" face="calm" />
            </Street>
        </Clip>
    ),
    walkHand: () => (
        <Clip id="wh">
            <Street>
                <Kid id="mama" x={40} y={96} s={0.55} pose="holdHand" face="happy" />
                <Kid id="selma" x={62} y={96} s={0.7} pose="holdHand" face="happy" flip />
            </Street>
        </Clip>
    ),
    walkRun: () => (
        <Clip id="wr">
            <Street>
                <Kid id="selma" x={52} y={74} s={0.66} pose="run" face="happy" />
                <Car x={88} y={72} s={0.6} color="#5fbf6a" flip />
            </Street>
        </Clip>
    ),
    ballPark: () => (
        <Clip id="bp">
            <Park>
                <Kid id="tarik" x={44} y={88} s={0.85} pose="kick" face="happy" />
                <g transform="translate(70 88) scale(0.9)">
                    <Prop id="ball" tone="#e8604a" />
                </g>
            </Park>
        </Clip>
    ),
    ballStreet: () => (
        <Clip id="bs">
            <Street>
                <Kid id="tarik" x={40} y={76} s={0.62} pose="kick" face="happy" />
                <g transform="translate(60 76) scale(0.65)">
                    <Prop id="ball" tone="#e8604a" />
                </g>
                <Car x={92} y={72} s={0.55} color="#a87be8" flip />
            </Street>
        </Clip>
    ),
    nightVest: () => (
        <Clip id="nv">
            <Street night>
                <circle cx={50} cy={70} r={24} fill="#fff3b0" opacity={0.18} />
                <Kid id="emir" x={50} y={94} s={0.7} pose="walk" face="happy" wear={["vest"]} />
            </Street>
        </Clip>
    ),
    nightDark: () => (
        <Clip id="nd">
            <Street night>
                <Kid id="emir" x={50} y={94} s={0.7} pose="walk" face="calm" />
                <ellipse cx={50} cy={70} rx={20} ry={30} fill="#1a1d40" opacity={0.6} />
            </Street>
        </Clip>
    ),
    walkSidewalk: () => (
        <Clip id="ws">
            <Street>
                <Kid id="ajla" x={50} y={96} s={0.72} pose="walk" face="happy" />
                <Car x={20} y={72} s={0.6} color="#5aa8e8" />
            </Street>
        </Clip>
    ),
    walkRoad: () => (
        <Clip id="wd">
            <Street>
                <Kid id="ajla" x={46} y={74} s={0.6} pose="walk" face="calm" />
                <Car x={84} y={72} s={0.6} color="#5aa8e8" flip />
            </Street>
        </Clip>
    ),
    nightRoad: () => (
        <Clip id="nr">
            <Street night>
                <path d="M84 80 L84 30 Q84 22 76 22" fill="none" {...line("#8a8a9a", 3)} />
                <circle cx={74} cy={25} r={5} fill="#fff3b0" />
                <path d="M74 30 L60 80 L88 80Z" fill="#fff3b0" opacity={0.15} />
            </Street>
        </Clip>
    ),
};

// ── Koraci prelaska i radnje ──────────────────────────────────────────────────

/** Strelica „gledamo” levo ili desno */
const LookArrow = ({ dir, y = 24 }: { dir: "left" | "right"; y?: number }) => (
    <g transform={dir === "left" ? `translate(26 ${y})` : `translate(74 ${y}) scale(-1 1)`}>
        <circle r={11} fill="#ffffff" {...line("#8a82f7", 2)} />
        <path d="M5 0 L-5 0 M-1 -4 L-5 0 L-1 4" fill="none" {...line("#6c61f0", 2.6)} />
    </g>
);

const STEPS: Record<string, () => ReactNode> = {
    actStop: () => (
        <Clip id="as">
            <Street zebra>
                <Kid id="amar" x={50} y={96} s={0.72} pose="stand" face="calm" />
            </Street>
        </Clip>
    ),
    actGo: () => (
        <Clip id="ag">
            <Street zebra>
                <Kid id="amar" x={50} y={76} s={0.62} pose="walk" face="happy" />
            </Street>
        </Clip>
    ),
    stepStop: () => (
        <Clip id="ss">
            <Street zebra>
                <Kid id="lejla" x={50} y={96} s={0.72} pose="stop" face="calm" />
            </Street>
        </Clip>
    ),
    stepLeft: () => (
        <Clip id="sl">
            <Street zebra>
                <Kid id="lejla" x={50} y={96} s={0.72} pose="stand" face="calm" look={[-80, -60]} />
                <LookArrow dir="left" />
            </Street>
        </Clip>
    ),
    stepRight: () => (
        <Clip id="sr">
            <Street zebra>
                <Kid id="lejla" x={50} y={96} s={0.72} pose="stand" face="calm" look={[80, -60]} />
                <LookArrow dir="right" />
            </Street>
        </Clip>
    ),
    stepLook: () => (
        <Clip id="sk">
            <Street zebra>
                <Kid id="lejla" x={50} y={96} s={0.72} pose="stand" face="calm" look={[-80, -60]} />
                <LookArrow dir="left" />
                <LookArrow dir="right" />
            </Street>
        </Clip>
    ),
    stepCross: () => (
        <Clip id="sc">
            <Street zebra>
                <Kid id="lejla" x={50} y={76} s={0.62} pose="walk" face="happy" />
            </Street>
        </Clip>
    ),
};

// ── Semafori ──────────────────────────────────────────────────────────────────

/** Pešak na semaforu: stoji (crveno) ili korača (zeleno) */
function Walker({ x, y, s, color, walking }: { x: number; y: number; s: number; color: string; walking: boolean }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} fill={color} stroke={color}>
            <circle cx={0} cy={-13} r={3.4} stroke="none" />
            {walking ? (
                <path d="M-1 -8 L-3 2 L1 4 L0 12 M-3 2 L-7 11 M-2 -6 L-7 -2 L-8 3 M0 -7 L4 -2 L8 -1" fill="none" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
            ) : (
                <path d="M0 -8 L0 4 M0 4 L-3 12 M0 4 L3 12 M0 -7 L-5 2 M0 -7 L5 2" fill="none" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
            )}
        </g>
    );
}

/** Semafor za pešake: gore crveni čovek, dole zeleni; svetli jedan */
function PedLight({ x, y, s = 1, green }: { x: number; y: number; s?: number; green: boolean }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <rect x={-3} y={30} width={6} height={60} fill="#5a5a6a" />
            <rect x={-16} y={-34} width={32} height={66} rx={7} fill="#2d3040" />
            <rect x={-12} y={-30} width={24} height={27} rx={5} fill={green ? "#3b2224" : "#4a1a1a"} />
            <rect x={-12} y={1} width={24} height={27} rx={5} fill={green ? "#123a24" : "#1d2a22"} />
            {!green && <circle cx={0} cy={-16} r={13} fill="#ff6a5a" opacity={0.25} />}
            {green && <circle cx={0} cy={15} r={13} fill="#5ef08a" opacity={0.25} />}
            <Walker x={0} y={-14} s={0.85} color={green ? "#6a3a3a" : "#ff5a4a"} walking={false} />
            <Walker x={0} y={17} s={0.85} color={green ? "#3ae07a" : "#2a5a3a"} walking />
        </g>
    );
}

function CarLight({ lit }: { lit: "red" | "yellow" | "green" }) {
    const lamp = (cy: number, on: boolean, color: string, dim: string) => (
        <g>
            {on && <circle cx={50} cy={cy} r={14} fill={color} opacity={0.3} />}
            <circle cx={50} cy={cy} r={10} fill={on ? color : dim} />
            {on && <Shine x={46} y={cy - 4} rx={2} ry={3.4} rotate={30} />}
        </g>
    );
    return (
        <g>
            <rect x={46} y={80} width={8} height={18} fill="#5a5a6a" />
            <rect x={32} y={4} width={36} height={80} rx={9} fill="#2d3040" />
            {lamp(20, lit === "red", "#ff5a4a", "#4a1a1a")}
            {lamp(44, lit === "yellow", "#ffc92a", "#4a3a12")}
            {lamp(68, lit === "green", "#3ae07a", "#123a24")}
        </g>
    );
}

// ── Znakovi i oprema ──────────────────────────────────────────────────────────

const SIGNS_ART: Record<string, () => ReactNode> = {
    signStop: () => (
        <g>
            <rect x={47} y={70} width={6} height={28} fill="#8a8a9a" />
            <path d="M34 6 L66 6 L88 28 L88 60 L66 82 L34 82 L12 60 L12 28Z" fill="#e8463f" stroke="#ffffff" strokeWidth={3} />
            <path d="M34 6 L66 6 L88 28 L88 60 L66 82 L34 82 L12 60 L12 28Z" fill="none" stroke="#a8291f" strokeWidth={1.4} />
            <text x={50} y={53} textAnchor="middle" fontSize={20} fontWeight={900} fill="#ffffff" fontFamily="ui-rounded, system-ui, sans-serif">
                STOP
            </text>
        </g>
    ),
    signCrossing: () => (
        <g>
            <rect x={47} y={80} width={6} height={18} fill="#8a8a9a" />
            <rect x={12} y={6} width={76} height={76} rx={6} fill="#2f6fd8" stroke="#ffffff" strokeWidth={3} />
            <path d="M50 14 L82 74 L18 74Z" fill="#ffffff" />
            <g fill={INK}>
                {[58, 63, 68].map((y) => (
                    <rect key={y} x={30} y={y + 2} width={40} height={2.6} />
                ))}
            </g>
            <Walker x={50} y={50} s={1.15} color={INK} walking />
        </g>
    ),
    signChildren: () => (
        <g>
            <rect x={47} y={80} width={6} height={18} fill="#8a8a9a" />
            <path d="M50 6 L92 80 L8 80Z" fill="#ffffff" stroke="#e8463f" strokeWidth={7} strokeLinejoin="round" />
            <Walker x={42} y={62} s={1.05} color={INK} walking />
            <Walker x={58} y={65} s={0.85} color={INK} walking />
        </g>
    ),
    signBike: () => (
        <g>
            <rect x={47} y={84} width={6} height={14} fill="#8a8a9a" />
            <circle cx={50} cy={46} r={40} fill="#2f6fd8" stroke="#ffffff" strokeWidth={3} />
            <g fill="none" stroke="#ffffff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                <circle cx={32} cy={56} r={10} />
                <circle cx={68} cy={56} r={10} />
                <path d="M32 56 L44 38 L58 38 L68 56 M44 38 L52 56 L58 38 M42 32 L48 32 M58 38 L56 30 L62 30" />
            </g>
        </g>
    ),
    safe: () => (
        <g>
            <path d="M50 8 L84 20 L82 52 Q78 78 50 92 Q22 78 18 52 L16 20Z" fill="#3fae6a" {...line("#257a48", 2.4)} />
            <path d="M34 50 L46 62 L68 38" fill="none" {...line("#ffffff", 7)} />
        </g>
    ),
    unsafe: () => (
        <g>
            <path d="M50 10 Q54 10 56 14 L90 76 Q92 84 84 84 L16 84 Q8 84 10 76 L44 14 Q46 10 50 10Z" fill="#f6b23a" {...line("#c8801a", 2.4)} />
            <rect x={46} y={32} width={8} height={28} rx={4} fill="#5a3a0a" />
            <circle cx={50} cy={70} r={5} fill="#5a3a0a" />
        </g>
    ),
    helmet: () => (
        <g>
            <ellipse cx={50} cy={86} rx={34} ry={4} fill="#1f1b3a" opacity={0.08} />
            <path d="M28 62 L34 82 M72 62 L66 82" {...line("#3b4a6b", 3)} />
            <path d="M12 66 C10 22 90 22 88 66 Q50 56 12 66Z" fill="#3a9ad8" {...line("#2a6fa8", 2.4)} />
            <path d="M30 36 L36 56 M50 30 L50 52 M70 36 L64 56" {...line("#1f5a8a", 4)} />
            <Shine x={30} y={44} rx={3} ry={8} rotate={40} />
        </g>
    ),
    belt: () => (
        <g>
            <path d="M8 26 L56 58" {...line("#c8352b", 12)} />
            <path d="M92 74 L58 64" {...line("#c8352b", 12)} />
            <rect x={44} y={50} width={26} height={22} rx={5} fill="#c9c9d6" {...line("#6a6a80", 2)} transform="rotate(16 57 61)" />
            <rect x={50} y={56} width={14} height={10} rx={2} fill="#e8463f" transform="rotate(16 57 61)" />
        </g>
    ),
    vest: () => (
        <g>
            <path d="M30 12 L42 12 Q50 24 58 12 L70 12 L84 24 L82 90 L18 90 L16 24Z" fill="#c8f23a" {...line("#8fb81a", 2.4)} />
            <path d="M42 12 Q50 30 58 12" fill="#ffffff" />
            <path d="M18 56 L82 56 M18 70 L82 70" {...line("#e6ebf2", 6)} />
            <path d="M50 30 L50 90" {...line("#8fb81a", 2)} />
        </g>
    ),
    carSeat: () => (
        <g>
            <ellipse cx={50} cy={92} rx={34} ry={4} fill="#1f1b3a" opacity={0.08} />
            <path d="M26 88 L22 30 Q22 10 42 10 L58 10 Q78 10 76 30 L74 66 L84 70 Q90 76 86 88Z" fill="#5a6a8a" {...line("#3b4a6b", 2.4)} />
            <path d="M32 30 Q32 20 42 20 L58 20 Q68 20 66 30 L64 64 L36 64Z" fill="#8a9ab8" />
            <path d="M38 26 L48 50 M62 26 L52 50 L50 60" fill="none" {...line("#c8352b", 4)} />
            <rect x={44} y={46} width={10} height={8} rx={2} fill="#c9c9d6" />
        </g>
    ),
    pedRed: () => (
        <g>
            <PedLight x={50} y={38} s={1.15} green={false} />
        </g>
    ),
    pedGreen: () => (
        <g>
            <PedLight x={50} y={38} s={1.15} green />
        </g>
    ),
    carRed: () => <CarLight lit="red" />,
    carYellow: () => <CarLight lit="yellow" />,
    carGreen: () => <CarLight lit="green" />,
};

export function trafficDrawing(pic: string): ReactNode {
    if (pic.startsWith("p:") || pic.startsWith("a:")) return basePic(pic, 4, 4, 92);
    const draw = SCENES[pic] ?? STEPS[pic] ?? SIGNS_ART[pic];
    return draw ? draw() : null;
}

export function TrafficPic({ pic, className }: { pic: string; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {trafficDrawing(pic)}
        </svg>
    );
}

// ── Ulica za čekanje (zadatak „Kreni”) ────────────────────────────────────────

const CROSS_STYLE = `
@keyframes tr-drive { from { transform: translateX(-80px); } to { transform: translateX(380px); } }
@keyframes tr-drive-back { from { transform: translateX(380px); } to { transform: translateX(-80px); } }
@keyframes tr-cross { from { transform: translateY(0); } to { transform: translateY(-112px); } }
@keyframes tr-shrink { from { transform: scale(1); } to { transform: scale(0.74); } }
.tr-drive { animation: tr-drive 2.4s linear infinite; }
.tr-drive-back { animation: tr-drive-back 2.9s linear 0.6s infinite both; }
.tr-cross { animation: tr-cross 2.4s ease-in-out forwards; }
.tr-shrink { transform-box: view-box; transform-origin: 150px 182px; animation: tr-shrink 2.4s ease-in-out forwards; }
@media (prefers-reduced-motion: reduce) { .tr-drive, .tr-drive-back, .tr-cross, .tr-shrink { animation: none; } }
`;

/**
 * Ulica sa pešačkim prelazom (300 × 200). Kod semafora: na crveno prolaze auta, na zeleno auto
 * stoji pre prelaza. Bez semafora: auto prolazi (čeka se), pa je put prazan. Kad dete krene,
 * lik mirno pređe zebru. Uz „Manje animacija” auto stoji na putu (nema vožnje).
 */
export function Crossing({ view, calm, crossing, className }: CrossingProps) {
    const light = view.scene === "light";
    const go = view.phase === "go";
    const hero: LookId = view.hero === "lejla" ? "lejla" : "amar";
    const walking = crossing || (view.feedback === "correct" && !calm);
    return (
        <svg viewBox="0 0 300 200" className={className} role="img" aria-label={light ? (go ? "Semafor: zeleno" : "Semafor: crveno") : go ? "Put je prazan" : "Ide auto"}>
            <style>{CROSS_STYLE}</style>
            <rect x={0} y={0} width={300} height={200} fill="#cdeefc" />
            <circle cx={262} cy={26} r={12} fill="#f6c518" />
            {/* Kuće preko puta */}
            <rect x={14} y={22} width={60} height={50} fill="#f4e1c4" />
            <path d="M8 26 L44 6 L80 26Z" fill="#d9584a" />
            <rect x={96} y={30} width={48} height={42} fill="#e6dccf" />
            <rect x={196} y={18} width={70} height={54} fill="#f2d2c2" />
            {[24, 50, 104, 124, 208, 232, 250].map((x, i) => (
                <rect key={i} x={x} y={36} width={12} height={12} rx={1.5} fill="#cfeefc" />
            ))}
            {/* Daleki trotoar, kolovoz, zebra, bliski trotoar */}
            <rect x={0} y={70} width={300} height={16} fill="#d9d2c8" />
            <rect x={0} y={84} width={300} height={3} fill="#c9c1b4" />
            <rect x={0} y={87} width={300} height={66} fill="#6a6f7a" />
            <path d="M0 120 L80 120 M220 120 L300 120" stroke="#f4f4f4" strokeWidth={2.4} strokeDasharray="14 12" />
            {[92, 103, 114, 125, 136].map((y) => (
                <rect key={y} x={120} y={y} width={60} height={6} fill="#f4f4f4" />
            ))}
            <rect x={0} y={153} width={300} height={4} fill="#c9c1b4" />
            <rect x={0} y={157} width={300} height={43} fill="#e6dfd4" />

            {/* Auta */}
            {!go && (calm ? <Car x={150} y={128} s={1.2} color="#5aa8e8" /> : (
                <>
                    <g className="tr-drive">
                        <Car x={0} y={146} s={1.2} color="#5aa8e8" />
                    </g>
                    {!light && (
                        <g className="tr-drive-back">
                            <Car x={0} y={112} s={1.1} color="#f6c518" flip />
                        </g>
                    )}
                </>
            ))}
            {go && light && <Car x={62} y={146} s={1.2} color="#5aa8e8" />}

            {/* Semafor za pešake (samo kod semafora) */}
            {light && <PedLight x={98} y={128} s={0.95} green={go} />}

            {/* Lik na ivici trotoara; kad krene, pređe zebru */}
            <g className={walking ? "tr-cross" : undefined}>
                <g className={walking ? "tr-shrink" : undefined}>
                    <Kid id={hero} x={150} y={186} s={1.05} pose={walking ? "walk" : "stand"} face={view.feedback === "correct" ? "happy" : "calm"} />
                </g>
            </g>
        </svg>
    );
}
