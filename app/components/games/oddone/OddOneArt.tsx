// Crteži igre „Šta ne pripada?”: oblici u bojama (krug, kvadrat, trougao, zvezda, srce), nove
// životinje (lisica, veverica, rak, morska zvezda), tri dinosaurusa, sličice razloga („Zašto?”:
// boja, oblik, veličina, broj, vrsta, prvi glas) i jež detektiv sa lupom koji postavlja pitanje.
// Isti stil kao zajednički komplet slika (pictures/): oblo, tanka tamnija ivica, odsjaj, oči sa
// sjajem i rumeni obrazi; okvir 100 × 100. Ostale slike su iz `pictures` (<Picture id=…/>).

import type { ReactNode } from "react";
import { Picture, isPictureId } from "@/app/components/games/pictures";
import { Cheek, Eye, INK, line, Shadow, Shine, Smile } from "@/app/components/games/pictures/kit";
import type { ColorId, ReasonId, ShapeId } from "@/app/components/games/data/oddoneLevels";

// ── Oblici u bojama ───────────────────────────────────────────────────────────

/** Boja oblika i tamnija ivica (iste nijanse kao bojice u ostalim igrama) */
export const SHAPE_COLORS: Readonly<Record<ColorId, { fill: string; edge: string }>> = {
    red: { fill: "#f26b6b", edge: "#bd424a" },
    blue: { fill: "#4f8ff0", edge: "#2c62c4" },
    yellow: { fill: "#f8cf3c", edge: "#c99a14" },
    green: { fill: "#5ec46e", edge: "#36924a" },
    purple: { fill: "#a873e6", edge: "#7448b4" },
    orange: { fill: "#f99a3c", edge: "#c66a16" },
};

function starPath(cx: number, cy: number, outer: number, inner: number): string {
    const points = Array.from({ length: 10 }, (_, i) => {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outer : inner;
        return `${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`;
    });
    return `M${points.join(" L")}Z`;
}

const SHAPE_DRAW: Record<ShapeId, (fill: string, edge: string) => ReactNode> = {
    circle: (fill, edge) => <circle cx={50} cy={50} r={40} fill={fill} {...line(edge, 3)} />,
    square: (fill, edge) => <rect x={13} y={13} width={74} height={74} rx={12} fill={fill} {...line(edge, 3)} />,
    // Zaobljeni uglovi: debela ivica tamnije boje, preko nje ista boja malo uža
    triangle: (fill, edge) => (
        <g strokeLinejoin="round">
            <path d="M50 12 L89 84 L11 84Z" fill={edge} stroke={edge} strokeWidth={10} />
            <path d="M50 15 L86 82 L14 82Z" fill={fill} stroke={fill} strokeWidth={5} />
        </g>
    ),
    star: (fill, edge) => <path d={starPath(50, 53, 44, 20)} fill={fill} {...line(edge, 3)} />,
    heart: (fill, edge) => <path d="M50 87 C22 68 9 50 12 33 C15 17 37 11 50 28 C63 11 85 17 88 33 C91 50 78 68 50 87Z" fill={fill} {...line(edge, 3)} />,
};

/** Gde stoji odsjaj na kom obliku */
const SHAPE_SHINE: Record<ShapeId, { x: number; y: number }> = {
    circle: { x: 33, y: 32 },
    square: { x: 28, y: 29 },
    triangle: { x: 40, y: 45 },
    star: { x: 42, y: 40 },
    heart: { x: 27, y: 32 },
};

export function ShapeArt({ shape, color, className }: { shape: ShapeId; color: ColorId; className?: string }) {
    const { fill, edge } = SHAPE_COLORS[color];
    const shine = SHAPE_SHINE[shape];
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {SHAPE_DRAW[shape](fill, edge)}
            <Shine x={shine.x} y={shine.y} rx={5} ry={9} rotate={35} opacity={0.4} />
        </svg>
    );
}

// ── Nove životinje i dinosaurusi ──────────────────────────────────────────────

export const ODD_ART: Record<string, () => ReactNode> = {
    // Lisica sedi okrenuta ka detetu, rep se savio oko nogu
    fox: () => (
        <g>
            <Shadow cy={94} rx={28} />
            <path d="M62 88 Q92 88 92 64 Q92 48 82 46 Q84 66 62 74Z" fill="#f08a3a" {...line("#b45a1a")} />
            <path d="M86 52 Q92 56 92 64 Q90 58 84 56Z" fill="#fff6ea" />
            <ellipse cx={50} cy={72} rx={21} ry={20} fill="#f08a3a" {...line("#b45a1a")} />
            <path d="M41 60 Q50 90 59 60 Q50 56 41 60Z" fill="#fff6ea" />
            <rect x={38} y={84} width={9} height={9} rx={4} fill="#5a3a2a" />
            <rect x={53} y={84} width={9} height={9} rx={4} fill="#5a3a2a" />
            <path d="M26 34 L24 10 L42 24Z" fill="#f08a3a" {...line("#b45a1a")} />
            <path d="M74 34 L76 10 L58 24Z" fill="#f08a3a" {...line("#b45a1a")} />
            <path d="M29 28 L28 16 L37 24Z M71 28 L72 16 L63 24Z" fill="#5a3a2a" />
            <ellipse cx={50} cy={40} rx={25} ry={19} fill="#f08a3a" {...line("#b45a1a")} />
            <path d="M26 44 Q38 62 50 58 Q62 62 74 44 Q62 50 50 47 Q38 50 26 44Z" fill="#fff6ea" />
            <ellipse cx={50} cy={50} rx={3.6} ry={2.8} fill={INK} />
            <Eye x={40} y={38} r={3.2} />
            <Eye x={60} y={38} r={3.2} />
            <Cheek x={33} y={47} />
            <Cheek x={67} y={47} />
            <path d="M46 55 Q50 58 54 55" fill="none" {...line(INK, 1.4)} />
            <Shine x={36} y={28} rx={3} ry={6} rotate={60} opacity={0.35} />
        </g>
    ),
    // Veverica bočno, sa velikim čupavim repom i žirom u šapama
    squirrel: () => (
        <g>
            <Shadow cy={94} rx={30} />
            <path d="M58 90 Q94 90 92 58 Q90 26 70 20 Q54 18 54 32 Q70 32 72 50 Q74 70 56 74Z" fill="#cf7a3c" {...line("#94521f")} />
            <path d="M62 30 Q80 34 82 56 Q82 74 66 82" fill="none" {...line("#e9a466", 3)} />
            <ellipse cx={44} cy={70} rx={19} ry={21} fill="#c06c32" {...line("#94521f")} />
            <ellipse cx={39} cy={74} rx={9} ry={13} fill="#f6dcc0" />
            <rect x={36} y={86} width={10} height={8} rx={4} fill="#a85a26" />
            <rect x={50} y={86} width={10} height={8} rx={4} fill="#a85a26" />
            <path d="M28 30 L30 14 L40 26Z" fill="#c06c32" {...line("#94521f")} />
            <path d="M30 26 L31 18 L36 25Z" fill="#f2b98a" />
            <circle cx={38} cy={42} r={16} fill="#c06c32" {...line("#94521f")} />
            <ellipse cx={27} cy={47} rx={7} ry={5.5} fill="#f6dcc0" />
            <ellipse cx={22.5} cy={45.5} rx={2.4} ry={2} fill={INK} />
            <Eye x={35} y={39} r={3} />
            <Cheek x={40} y={48} r={3} />
            <path d="M24 50 Q27 52 30 50" fill="none" {...line(INK, 1.3)} />
            <ellipse cx={30} cy={64} rx={6} ry={7} fill="#b07a44" {...line("#7a4a20", 1.3)} />
            <path d="M23 60 Q30 54 37 60 Q30 62 23 60Z" fill="#7a5530" {...line("#5a3a1a", 1.2)} />
            <path d="M24 66 Q22 60 28 58 M36 66 Q38 60 32 58" fill="none" {...line("#94521f", 2.4)} />
            <Shine x={32} y={33} rx={3} ry={5} rotate={50} opacity={0.35} />
        </g>
    ),
    // Crveni rak sa očima na drškama i oblim kleštima
    crab: () => (
        <g>
            <Shadow cy={92} rx={32} />
            <path d="M26 66 L12 74 M26 72 L14 84 M30 76 L22 90 M74 66 L88 74 M74 72 L86 84 M70 76 L78 90" fill="none" {...line("#bd424a", 3)} />
            <path d="M30 56 Q20 50 16 40 M70 56 Q80 50 84 40" fill="none" {...line("#bd424a", 4)} />
            <path d="M6 30 Q8 16 20 16 Q30 18 28 30 Q24 26 18 30 Q20 38 14 42 Q6 40 6 30Z" fill="#f2655a" {...line("#bd424a")} />
            <path d="M94 30 Q92 16 80 16 Q70 18 72 30 Q76 26 82 30 Q80 38 86 42 Q94 40 94 30Z" fill="#f2655a" {...line("#bd424a")} />
            <ellipse cx={50} cy={64} rx={30} ry={20} fill="#f2655a" {...line("#bd424a")} />
            <path d="M42 44 L40 32 M58 44 L60 32" {...line("#bd424a", 3)} />
            <circle cx={40} cy={30} r={6.5} fill="#ffffff" {...line("#bd424a", 1.4)} />
            <circle cx={60} cy={30} r={6.5} fill="#ffffff" {...line("#bd424a", 1.4)} />
            <Eye x={40} y={30.5} r={3.4} />
            <Eye x={60} y={30.5} r={3.4} />
            <Cheek x={36} y={66} r={3.6} />
            <Cheek x={64} y={66} r={3.6} />
            <Smile x={50} y={66} w={6} />
            <Shine x={34} y={56} rx={3} ry={7} rotate={60} opacity={0.4} />
        </g>
    ),
    // Morska zvezda sa tačkicama i nasmejanim licem
    starfish: () => (
        <g>
            <Shadow cy={93} rx={30} />
            <path d={starPath(50, 54, 46, 22)} fill="#f9a04a" stroke="#c96a1e" strokeWidth={9} strokeLinejoin="round" />
            <path d={starPath(50, 54, 46, 22)} fill="#f9a04a" stroke="#f9a04a" strokeWidth={5} strokeLinejoin="round" />
            <g fill="#fcd29a">
                <circle cx={50} cy={22} r={2.4} />
                <circle cx={50} cy={31} r={2} />
                <circle cx={20} cy={46} r={2.2} />
                <circle cx={80} cy={46} r={2.2} />
                <circle cx={32} cy={80} r={2.2} />
                <circle cx={68} cy={80} r={2.2} />
            </g>
            <Eye x={43} y={52} r={3.2} />
            <Eye x={57} y={52} r={3.2} />
            <Cheek x={38} y={60} />
            <Cheek x={62} y={60} />
            <Smile x={50} y={61} w={4.5} />
        </g>
    ),
    // Tiranosaurus: zelen, veselo nasmejan, bez zuba
    tRex: () => (
        <g>
            <Shadow cy={94} rx={34} />
            <path d="M30 60 Q14 64 4 80 Q20 80 34 72Z" fill="#6cc070" {...line("#3d8a48")} />
            <rect x={33} y={74} width={10} height={18} rx={5} fill="#5aac60" {...line("#3d8a48")} />
            <rect x={49} y={74} width={10} height={18} rx={5} fill="#5aac60" {...line("#3d8a48")} />
            <ellipse cx={46} cy={64} rx={22} ry={17} fill="#6cc070" {...line("#3d8a48")} />
            <ellipse cx={50} cy={68} rx={12} ry={10} fill="#bfe8b0" />
            <path d="M54 52 Q56 40 60 34 L72 40 Q66 50 66 58Z" fill="#6cc070" />
            <path d="M54 26 Q56 14 70 14 L84 15 Q96 17 96 29 Q96 41 84 42 L68 43 Q56 43 54 34Z" fill="#6cc070" {...line("#3d8a48")} />
            <path d="M54 52 Q56 40 60 34" fill="none" {...line("#3d8a48")} />
            <path d="M66 54 Q72 54 72 60" fill="none" {...line("#3d8a48", 3)} />
            <g fill="#4f9e56">
                <circle cx={36} cy={54} r={2.6} />
                <circle cx={44} cy={50} r={2} />
                <circle cx={30} cy={62} r={2} />
            </g>
            <Eye x={73} y={24} r={3.4} />
            <circle cx={92} cy={24} r={1.2} fill={INK} />
            <Cheek x={74} y={33} />
            <path d="M80 35 Q87 38 93 33" fill="none" {...line(INK, 1.5)} />
            <Shine x={64} y={19} rx={2.5} ry={5} rotate={70} opacity={0.4} />
        </g>
    ),
    // Triceratops: narandžast, sa okovratnikom i tri obla roga
    triceratops: () => (
        <g>
            <Shadow cy={94} rx={36} />
            <path d="M22 56 Q8 58 3 70 Q14 70 24 64Z" fill="#f4a04a" {...line("#b86a1e")} />
            <rect x={22} y={70} width={10} height={20} rx={5} fill="#e08c38" {...line("#b86a1e")} />
            <rect x={52} y={70} width={10} height={20} rx={5} fill="#e08c38" {...line("#b86a1e")} />
            <ellipse cx={42} cy={60} rx={26} ry={17} fill="#f4a04a" {...line("#b86a1e")} />
            <rect x={34} y={70} width={9} height={18} rx={4.5} fill="#f4a04a" {...line("#b86a1e")} />
            <rect x={62} y={68} width={9} height={18} rx={4.5} fill="#f4a04a" {...line("#b86a1e")} />
            <path d="M58 30 Q60 18 70 20 Q76 12 84 18 Q92 18 90 28 Q94 38 86 44 Q74 56 62 50 Q54 42 58 30Z" fill="#fbc983" {...line("#b86a1e")} />
            <ellipse cx={78} cy={54} rx={15} ry={11} fill="#f4a04a" {...line("#b86a1e")} />
            <path d="M74 44 Q74 34 80 30 Q80 38 78 45Z M84 44 Q86 34 92 32 Q90 40 86 46Z" fill="#fff4dc" {...line("#b86a1e", 1.3)} />
            <path d="M90 50 Q96 44 98 46 Q96 52 92 55Z" fill="#fff4dc" {...line("#b86a1e", 1.3)} />
            <Eye x={78} y={51} r={3.2} />
            <Cheek x={74} y={58} />
            <path d="M84 60 Q89 62 93 58" fill="none" {...line(INK, 1.5)} />
            <Shine x={34} y={52} rx={3} ry={7} rotate={70} opacity={0.35} />
        </g>
    ),
    // Diplodokus: ljubičast, dugog vrata i repa
    diplodocus: () => (
        <g>
            <Shadow cy={94} rx={36} />
            <path d="M24 60 Q8 62 2 76 Q14 76 28 68Z" fill="#a77de0" {...line("#7450b0")} />
            <rect x={24} y={70} width={10} height={20} rx={5} fill="#9268d0" {...line("#7450b0")} />
            <rect x={50} y={70} width={10} height={20} rx={5} fill="#9268d0" {...line("#7450b0")} />
            <path d="M52 54 Q64 36 66 18 L78 20 Q76 42 62 64Z" fill="#a77de0" {...line("#7450b0")} />
            <ellipse cx={42} cy={62} rx={24} ry={15} fill="#a77de0" {...line("#7450b0")} />
            <rect x={36} y={70} width={9} height={18} rx={4.5} fill="#a77de0" {...line("#7450b0")} />
            <rect x={60} y={68} width={9} height={18} rx={4.5} fill="#a77de0" {...line("#7450b0")} />
            <ellipse cx={42} cy={66} rx={13} ry={7} fill="#d9c4f6" />
            <ellipse cx={78} cy={17} rx={13} ry={9} fill="#a77de0" {...line("#7450b0")} />
            <g fill="#8a62c8">
                <circle cx={34} cy={54} r={2.4} />
                <circle cx={44} cy={51} r={2} />
                <circle cx={52} cy={56} r={1.8} />
            </g>
            <Eye x={79} y={14} r={2.8} />
            <Cheek x={84} y={20} r={2.6} />
            <path d="M84 22 Q88 24 91 20" fill="none" {...line(INK, 1.3)} />
            <Shine x={36} y={56} rx={3} ry={7} rotate={70} opacity={0.35} />
        </g>
    ),
};

interface ThingArtProps {
    id: string;
    className?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

/** Slika stvari: nova (ODD_ART) ili iz zajedničkog kompleta */
export function ThingArt({ id, className, x, y, width, height }: ThingArtProps) {
    const own = ODD_ART[id];
    if (own) {
        return (
            <svg viewBox="0 0 100 100" className={className} x={x} y={y} width={width} height={height} aria-hidden="true" focusable="false">
                {own()}
            </svg>
        );
    }
    if (!isPictureId(id)) return null;
    return <Picture id={id} className={className} x={x} y={y} width={width} height={height} />;
}

/** Raspored za brojanje (kao na kocki), u okviru 100 × 100 */
const COUNT_SPOTS: Record<number, readonly (readonly [number, number])[]> = {
    1: [[50, 50]],
    2: [
        [28, 50],
        [72, 50],
    ],
    3: [
        [28, 30],
        [72, 30],
        [50, 72],
    ],
    4: [
        [28, 28],
        [72, 28],
        [28, 72],
        [72, 72],
    ],
    5: [
        [24, 24],
        [76, 24],
        [50, 50],
        [24, 76],
        [76, 76],
    ],
    6: [
        [28, 20],
        [72, 20],
        [28, 50],
        [72, 50],
        [28, 80],
        [72, 80],
    ],
};

/** Kartica za brojanje: ista stvar nekoliko puta, raspoređena kao tačke na kocki */
export function CountArt({ pic, count, className }: { pic: string; count: number; className?: string }) {
    const spots = COUNT_SPOTS[Math.min(Math.max(count, 1), 6)];
    const size = count <= 2 ? 42 : count <= 4 ? 38 : 30;
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {spots.map(([cx, cy], i) => (
                <ThingArt key={i} id={pic} x={cx - size / 2} y={cy - size / 2} width={size} height={size} />
            ))}
        </svg>
    );
}

// ── Sličice razloga („Zašto?”) ────────────────────────────────────────────────

const REASON_ART: Record<ReasonId, () => ReactNode> = {
    // Tri kapi boje
    color: () => (
        <g>
            <path d="M30 18 Q44 38 44 50 A14 14 0 0 1 16 50 Q16 38 30 18Z" fill="#f26b6b" {...line("#bd424a", 2.4)} />
            <path d="M70 18 Q84 38 84 50 A14 14 0 0 1 56 50 Q56 38 70 18Z" fill="#4f8ff0" {...line("#2c62c4", 2.4)} />
            <path d="M50 44 Q64 64 64 76 A14 14 0 0 1 36 76 Q36 64 50 44Z" fill="#f8cf3c" {...line("#c99a14", 2.4)} />
        </g>
    ),
    // Krug, trougao i kvadrat (samo obrisi)
    shape: () => (
        <g fill="#ffffff" strokeLinejoin="round">
            <circle cx={30} cy={32} r={17} {...line("#7448b4", 4)} />
            <path d="M72 14 L90 46 L54 46Z" {...line("#36924a", 4)} />
            <rect x={36} y={56} width={30} height={30} rx={5} {...line("#c66a16", 4)} />
        </g>
    ),
    // Veliki i mali krug
    size: () => (
        <g>
            <circle cx={38} cy={54} r={30} fill="#a873e6" {...line("#7448b4", 2.6)} />
            <circle cx={82} cy={72} r={12} fill="#a873e6" {...line("#7448b4", 2.6)} />
            <Shine x={28} y={42} rx={5} ry={9} rotate={35} opacity={0.4} />
        </g>
    ),
    // Stubići tačaka: 1, 2, 3
    count: () => (
        <g>
            <rect x={6} y={10} width={88} height={80} rx={14} fill="#ffffff" {...line("#c99a14", 2.6)} />
            <g fill="#f99a3c">
                <circle cx={26} cy={72} r={8} />
                <circle cx={50} cy={72} r={8} />
                <circle cx={50} cy={50} r={8} />
                <circle cx={74} cy={72} r={8} />
                <circle cx={74} cy={50} r={8} />
                <circle cx={74} cy={28} r={8} />
            </g>
        </g>
    ),
    // Korpa sa tri voćke (stvari iste vrste)
    kind: () => (
        <g>
            <circle cx={34} cy={40} r={13} fill="#f26b6b" {...line("#bd424a", 2.2)} />
            <circle cx={66} cy={40} r={13} fill="#5ec46e" {...line("#36924a", 2.2)} />
            <circle cx={50} cy={32} r={13} fill="#f8cf3c" {...line("#c99a14", 2.2)} />
            <path d="M12 48 H88 L80 86 Q79 90 74 90 H26 Q21 90 20 86Z" fill="#d9a066" {...line("#9a6a32", 2.6)} />
            <path d="M24 60 H76 M28 74 H72" fill="none" {...line("#9a6a32", 2.2)} />
        </g>
    ),
    // Oblačić sa slovom
    sound: () => (
        <g>
            <path d="M16 14 H84 Q92 14 92 22 V64 Q92 72 84 72 H44 L26 88 L30 72 H16 Q8 72 8 64 V22 Q8 14 16 14Z" fill="#ffffff" {...line("#2c62c4", 3)} />
            <text x={50} y={58} textAnchor="middle" fontSize={44} fontWeight={900} fill="#2c62c4" fontFamily="ui-rounded, system-ui, sans-serif">
                A
            </text>
        </g>
    ),
};

/** Razlozi koji imaju sličicu (za testove) */
export const REASON_ART_IDS: Readonly<Record<ReasonId, true>> = { color: true, shape: true, size: true, count: true, kind: true, sound: true };

export function ReasonIcon({ id, className }: { id: ReasonId; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {REASON_ART[id]()}
        </svg>
    );
}

// ── Jež detektiv ──────────────────────────────────────────────────────────────

/** Jež sa lupom: postavlja pitanje (miran, nasmejan; lupa je uvek u istoj ruci) */
export function Detective({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            <Shadow cy={95} rx={30} />
            {/* Bodlje */}
            <path
                d="M14 70 L8 58 L18 56 L12 42 L24 44 L22 30 L34 36 L36 22 L46 32 L52 18 L58 32 L68 22 L70 36 L80 32 L78 46 L88 46 L80 58 L88 66 L76 70Z"
                fill="#8a6244"
                {...line("#5e3f28", 2)}
            />
            <ellipse cx={48} cy={66} rx={30} ry={26} fill="#a87a54" {...line("#5e3f28", 2)} />
            {/* Lice */}
            <path d="M24 64 Q24 44 44 42 Q58 42 62 54 Q66 70 54 82 Q38 90 28 80 Q22 74 24 64Z" fill="#f6dfc0" {...line("#c9a06a", 1.6)} />
            <ellipse cx={22} cy={66} rx={5} ry={4} fill={INK} />
            <circle cx={21} cy={64.6} r={1.2} fill="#ffffff" />
            <Eye x={38} y={57} r={3.6} />
            <Eye x={52} y={57} r={3.6} />
            <Cheek x={34} y={68} />
            <Cheek x={56} y={67} />
            <path d="M33 74 Q38 78 43 74" fill="none" {...line(INK, 1.5)} />
            {/* Detektivska kapa */}
            <path d="M30 40 Q34 24 52 24 Q68 26 70 40 Q50 34 30 40Z" fill="#c9a06a" {...line("#8a6a3a", 1.8)} />
            <path d="M28 40 Q50 32 72 40 Q72 44 66 44 Q50 38 34 44 Q28 44 28 40Z" fill="#b08a52" {...line("#8a6a3a", 1.6)} />
            <path d="M40 28 L44 38 M52 25 L52 35 M62 28 L60 38" fill="none" {...line("#a07a44", 1.2)} />
            {/* Šapa i lupa */}
            <path d="M64 84 L74 71" {...line("#7a5530", 6)} />
            <circle cx={81} cy={61} r={13} fill="#e3f3ff" {...line("#5a6a7a", 3.4)} />
            <path d="M74 56 Q76 51 82 51" fill="none" {...line("#ffffff", 2.4)} />
            <ellipse cx={63} cy={85} rx={7} ry={6} fill="#f6dfc0" {...line("#c9a06a", 1.4)} />
        </svg>
    );
}
