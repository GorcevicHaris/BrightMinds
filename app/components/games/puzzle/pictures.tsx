// Slike za igru „Složi sliku”. Svaka je cela scena u okviru 400 × 300 (bez praznog belog
// prostora), da i najmanji deo slagalice ima nešto prepoznatljivo: nebo, travu, deo lika.
// Boje su mirne i jasne, obrisi tamni i debeli, likovi okrenuti licem ka detetu i nasmejani.
// Bez prelaza boja (gradijenata): ista slika se crta i na tabli i u svakom delu, a prelazi
// bi trebalo da imaju jedinstvene id-jeve na stranici.

import type { ReactNode } from "react";
import type { PuzzlePictureId } from "@/app/components/games/data/puzzleLevels";

const INK = "#3d3357";
const SKIN = "#f3c9a1";
const HAIR = "#3b2a22";
const SKY = "#bfe5fb";
const SKY_LOW = "#dcf1fd";
const GRASS = "#8fd16a";
const GRASS_DARK = "#6cb94f";

const line = (width = 3, color = INK) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

// ── Zajednički delovi ─────────────────────────────────────────────────────────

function Sky({ low = SKY_LOW }: { low?: string }) {
    return (
        <>
            <rect x={0} y={0} width={400} height={300} fill={SKY} />
            <rect x={0} y={120} width={400} height={180} fill={low} />
        </>
    );
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <path
            d={`M${x} ${y} q${-22 * s} 0 ${-20 * s} ${-18 * s} q${2 * s} ${-18 * s} ${24 * s} ${-14 * s} q${10 * s} ${-22 * s} ${36 * s} ${-12 * s} q${22 * s} ${-6 * s} ${26 * s} ${16 * s} q${18 * s} ${4 * s} ${12 * s} ${28 * s} Z`}
            fill="#ffffff"
            {...line(2.5, "#9cc7e0")}
        />
    );
}

function Sun({ x, y, r = 30, face = false }: { x: number; y: number; r?: number; face?: boolean }) {
    const rays = Array.from({ length: 10 }, (_, i) => {
        const a = (i * Math.PI) / 5;
        return `M${(x + Math.cos(a) * (r + 7)).toFixed(1)} ${(y + Math.sin(a) * (r + 7)).toFixed(1)} L${(x + Math.cos(a) * (r + 19)).toFixed(1)} ${(y + Math.sin(a) * (r + 19)).toFixed(1)}`;
    }).join(" ");
    return (
        <g>
            <path d={rays} {...line(5, "#f5b100")} />
            <circle cx={x} cy={y} r={r} fill="#ffd23f" {...line(3, "#e39b00")} />
            {face && (
                <>
                    <circle cx={x - r * 0.32} cy={y - r * 0.12} r={r * 0.09} fill={INK} />
                    <circle cx={x + r * 0.32} cy={y - r * 0.12} r={r * 0.09} fill={INK} />
                    <path d={`M${x - r * 0.38} ${y + r * 0.2} Q${x} ${y + r * 0.55} ${x + r * 0.38} ${y + r * 0.2}`} fill="none" {...line(3)} />
                    <circle cx={x - r * 0.55} cy={y + r * 0.22} r={r * 0.13} fill="#f59a9a" opacity={0.6} />
                    <circle cx={x + r * 0.55} cy={y + r * 0.22} r={r * 0.13} fill="#f59a9a" opacity={0.6} />
                </>
            )}
        </g>
    );
}

function Flower({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
    const petals = [0, 72, 144, 216, 288].map((deg) => {
        const a = (deg * Math.PI) / 180;
        return <circle key={deg} cx={x + Math.cos(a) * 7 * s} cy={y - 18 * s + Math.sin(a) * 7 * s} r={6 * s} fill={color} {...line(1.6)} />;
    });
    return (
        <g>
            <path d={`M${x} ${y} L${x} ${y - 16 * s}`} {...line(3, "#3f8f3a")} />
            <path d={`M${x} ${y - 6 * s} q${-9 * s} ${-2 * s} ${-11 * s} ${-9 * s} q${8 * s} 0 ${11 * s} ${7 * s}`} fill="#5fae4a" {...line(1.4, "#3f8f3a")} />
            {petals}
            <circle cx={x} cy={y - 18 * s} r={4.5 * s} fill="#ffd23f" {...line(1.4)} />
        </g>
    );
}

function Eyes({ x, y, dx, r = 3.4 }: { x: number; y: number; dx: number; r?: number }) {
    return (
        <>
            <circle cx={x - dx} cy={y} r={r} fill={INK} />
            <circle cx={x + dx} cy={y} r={r} fill={INK} />
            <circle cx={x - dx - r * 0.35} cy={y - r * 0.4} r={r * 0.36} fill="#ffffff" />
            <circle cx={x + dx - r * 0.35} cy={y - r * 0.4} r={r * 0.36} fill="#ffffff" />
        </>
    );
}

function Grass({ y = 228, color = GRASS }: { y?: number; color?: string }) {
    return <path d={`M0 ${y} Q100 ${y - 14} 200 ${y} T400 ${y} V300 H0 Z`} fill={color} {...line(3, GRASS_DARK)} />;
}

// ── Scene ─────────────────────────────────────────────────────────────────────

function SunHill() {
    return (
        <g>
            <Sky />
            <Sun x={110} y={92} r={42} face />
            <Cloud x={330} y={70} s={1.2} />
            <Cloud x={250} y={130} s={0.7} />
            <path d="M-10 300 L-10 210 Q90 120 210 210 Q260 246 300 300 Z" fill={GRASS} {...line(3, GRASS_DARK)} />
            <path d="M150 300 Q240 160 410 196 L410 300 Z" fill={GRASS_DARK} {...line(3, "#4f9a3a")} />
            <Flower x={60} y={262} color="#ff7a8a" />
            <Flower x={110} y={276} color="#ffffff" s={0.8} />
            <Flower x={330} y={262} color="#b48cff" />
            <Flower x={370} y={282} color="#ffd23f" s={0.8} />
            <path d="M262 236 l8 -10 l8 10 M278 252 l8 -10 l8 10" fill="none" {...line(2.5, "#3f8f3a")} />
        </g>
    );
}

function House() {
    return (
        <g>
            <Sky />
            <Sun x={64} y={58} r={26} />
            <Cloud x={340} y={64} />
            <Grass y={238} />
            {/* Drvo desno */}
            <rect x={318} y={150} width={20} height={92} rx={6} fill="#a86b3c" {...line(3)} />
            <circle cx={328} cy={132} r={44} fill="#4fae55" {...line(3, "#2f7d3a")} />
            {/* Kuća */}
            <rect x={232} y={86} width={26} height={52} fill="#c2593e" {...line(3)} />
            <rect x={108} y={140} width={184} height={112} fill="#ffe08a" {...line(3)} />
            <path d="M90 146 L200 62 L310 146 Z" fill="#e5483a" {...line(3)} />
            <path d="M178 252 V196 Q200 180 222 196 V252 Z" fill="#9a5b34" {...line(3)} />
            <circle cx={212} cy={224} r={3.5} fill="#ffd23f" />
            <rect x={124} y={164} width={40} height={36} rx={4} fill="#7cc8f2" {...line(3)} />
            <rect x={236} y={164} width={40} height={36} rx={4} fill="#7cc8f2" {...line(3)} />
            <path d="M144 164 V200 M124 182 H164 M256 164 V200 M236 182 H276" {...line(2.5)} />
            <path d="M188 252 Q200 282 170 300 M212 252 Q216 282 240 300" fill="none" {...line(3, "#c9a46a")} />
            <path d="M188 252 Q200 282 170 300 L240 300 Q216 282 212 252 Z" fill="#e8cf9a" />
            <Flower x={40} y={276} color="#ff7a8a" />
            <Flower x={74} y={286} color="#ffd23f" s={0.8} />
        </g>
    );
}

function Fish() {
    return (
        <g>
            <rect x={0} y={0} width={400} height={300} fill="#5ec3e6" />
            <rect x={0} y={0} width={400} height={40} fill="#8fd8f0" />
            <path d="M0 40 Q50 30 100 40 T200 40 T300 40 T400 40" fill="none" {...line(3, "#3a9fc7")} />
            <path d="M0 256 Q100 240 200 254 T400 250 V300 H0 Z" fill="#f2d79a" {...line(3, "#cfa964")} />
            {/* Alge */}
            <path d="M40 262 Q22 220 44 190 Q60 160 42 130 M62 262 Q80 226 64 196" fill="none" {...line(9, "#3f9f5a")} />
            <path d="M352 258 Q372 214 350 180 Q334 150 352 118" fill="none" {...line(9, "#3f9f5a")} />
            {/* Riba */}
            <path d="M96 150 L42 112 L50 150 L42 188 Z" fill="#ff8a3d" {...line(3)} />
            <ellipse cx={180} cy={150} rx={92} ry={60} fill="#ffa14a" {...line(3)} />
            <path d="M150 92 Q182 62 214 94" fill="#ff8a3d" {...line(3)} />
            <path d="M156 210 Q176 232 196 208" fill="#ff8a3d" {...line(3)} />
            <path d="M136 104 Q120 150 136 196 M168 94 Q150 150 168 206" fill="none" {...line(3, "#e06a1f")} />
            <circle cx={232} cy={134} r={15} fill="#ffffff" {...line(3)} />
            <circle cx={235} cy={135} r={7} fill={INK} />
            <circle cx={232} cy={131} r={2.4} fill="#ffffff" />
            <path d="M252 164 Q262 170 268 162" fill="none" {...line(3)} />
            <circle cx={212} cy={164} r={8} fill="#f59a9a" opacity={0.6} />
            {/* Mehurići */}
            <circle cx={292} cy={108} r={9} fill="#dff5fc" {...line(2.5, "#3a9fc7")} />
            <circle cx={310} cy={76} r={12} fill="#dff5fc" {...line(2.5, "#3a9fc7")} />
            <circle cx={296} cy={46} r={6} fill="#dff5fc" {...line(2.5, "#3a9fc7")} />
            {/* Morska zvezda */}
            <path d="M260 236 L268 254 L288 256 L272 268 L278 288 L260 276 L242 288 L248 268 L232 256 L252 254 Z" fill="#ff6f91" {...line(2.5)} />
        </g>
    );
}

function Car() {
    return (
        <g>
            <Sky />
            <Cloud x={120} y={64} />
            <Sun x={340} y={60} r={28} />
            <path d="M0 196 Q120 170 240 192 T400 186 V230 H0 Z" fill={GRASS} {...line(3, GRASS_DARK)} />
            <rect x={0} y={226} width={400} height={74} fill="#8d8aa0" />
            <path d="M0 226 H400" {...line(3)} />
            <path d="M14 266 H54 M94 266 H134 M174 266 H214 M254 266 H294 M334 266 H374" {...line(6, "#ffffff")} />
            {/* Drvo levo */}
            <rect x={30} y={136} width={16} height={64} rx={5} fill="#a86b3c" {...line(3)} />
            <circle cx={38} cy={124} r={32} fill="#4fae55" {...line(3, "#2f7d3a")} />
            {/* Auto */}
            <path d="M92 236 V196 Q92 182 108 180 L150 176 L184 132 Q192 122 206 122 H268 Q282 122 290 134 L316 176 L330 180 Q344 184 344 200 V236 Z" fill="#e5483a" {...line(3)} />
            <path d="M196 140 H238 V176 H170 Z" fill="#9ad8f6" {...line(3)} />
            <path d="M250 140 H274 Q280 140 284 148 L298 176 H250 Z" fill="#9ad8f6" {...line(3)} />
            <path d="M244 180 V230 M226 194 h12" {...line(3)} />
            <rect x={330} y={194} width={14} height={12} rx={3} fill="#ffe08a" {...line(2.5)} />
            <circle cx={142} cy={236} r={26} fill="#2f2a3f" {...line(3)} />
            <circle cx={142} cy={236} r={10} fill="#c9c5d6" />
            <circle cx={292} cy={236} r={26} fill="#2f2a3f" {...line(3)} />
            <circle cx={292} cy={236} r={10} fill="#c9c5d6" />
        </g>
    );
}

function Cat() {
    return (
        <g>
            <rect x={0} y={0} width={400} height={300} fill="#fde6cf" />
            <rect x={0} y={206} width={400} height={94} fill="#d9a46e" />
            <path d="M0 206 H400 M0 240 H400 M0 274 H400" {...line(2.5, "#b9824f")} />
            {/* Prozor */}
            <rect x={26} y={30} width={96} height={86} rx={6} fill="#bfe5fb" {...line(4)} />
            <path d="M74 30 V116 M26 73 H122" {...line(4)} />
            <circle cx={50} cy={52} r={11} fill="#ffd23f" />
            {/* Slika na zidu */}
            <rect x={298} y={36} width={74} height={56} rx={4} fill="#ffffff" {...line(4, "#b9824f")} />
            <path d="M306 84 L326 58 L340 74 L350 64 L364 84 Z" fill="#6cb94f" />
            {/* Tepih */}
            <ellipse cx={200} cy={258} rx={150} ry={34} fill="#9b8cf2" {...line(3)} />
            <ellipse cx={200} cy={258} rx={112} ry={22} fill="none" {...line(3, "#ffffff")} />
            {/* Mačka */}
            <path d="M262 242 Q330 236 316 186 Q308 160 328 150" fill="none" {...line(16, INK)} />
            <path d="M262 242 Q330 236 316 186 Q308 160 328 150" fill="none" {...line(10, "#f5a04a")} />
            <path d="M146 250 Q140 170 200 162 Q260 170 254 250 Z" fill="#f5a04a" {...line(3)} />
            <ellipse cx={200} cy={222} rx={30} ry={28} fill="#ffe0b8" />
            <path d="M144 98 L150 46 L184 80 Z M256 98 L250 46 L216 80 Z" fill="#f5a04a" {...line(3)} />
            <path d="M154 86 L156 62 L174 80 Z M246 86 L244 62 L226 80 Z" fill="#f7b3c2" />
            <circle cx={200} cy={118} r={56} fill="#f5a04a" {...line(3)} />
            <path d="M184 66 L188 84 M200 62 V82 M216 66 L212 84" {...line(3, "#d97b26")} />
            <Eyes x={200} y={112} dx={20} r={6} />
            <path d="M194 132 L206 132 L200 139 Z" fill="#e8738f" {...line(2)} />
            <path d="M200 139 Q192 148 184 142 M200 139 Q208 148 216 142" fill="none" {...line(2.5)} />
            <path d="M156 132 L124 126 M156 140 L124 144 M244 132 L276 126 M244 140 L276 144" {...line(2)} />
            <ellipse cx={176} cy={250} rx={16} ry={9} fill="#f5a04a" {...line(3)} />
            <ellipse cx={224} cy={250} rx={16} ry={9} fill="#f5a04a" {...line(3)} />
            {/* Klupko */}
            <circle cx={84} cy={250} r={24} fill="#4fb3e8" {...line(3)} />
            <path d="M66 238 Q84 250 100 236 M64 254 Q84 264 104 252 M76 228 Q72 252 86 272" fill="none" {...line(2, "#2a7fb3")} />
        </g>
    );
}

function AppleTree() {
    const apples = [
        [150, 92],
        [214, 70],
        [256, 118],
        [180, 140],
        [124, 148],
        [276, 162],
        [222, 172],
    ];
    return (
        <g>
            <Sky />
            <Sun x={346} y={50} r={26} />
            <Cloud x={80} y={48} s={0.9} />
            <Grass y={232} />
            <path d="M182 254 Q188 214 186 178 L170 160 L180 154 L196 170 L214 150 L224 158 L208 180 Q206 216 216 254 Z" fill="#a86b3c" {...line(3)} />
            <path d="M88 132 Q80 70 140 56 Q170 20 222 34 Q280 30 300 80 Q340 110 312 160 Q306 200 250 196 Q216 214 184 198 Q120 212 100 176 Q66 160 88 132 Z" fill="#4fae55" {...line(3, "#2f7d3a")} />
            <path d="M124 96 q12 -10 24 0 M246 70 q12 -10 24 0 M206 120 q12 -10 24 0" fill="none" {...line(3, "#2f7d3a")} />
            {apples.map(([x, y]) => (
                <g key={`${x}-${y}`}>
                    <circle cx={x} cy={y} r={13} fill="#e5483a" {...line(2.5)} />
                    <path d={`M${x} ${y - 13} q2 -6 6 -8`} fill="none" {...line(2.5, "#7a4a2a")} />
                    <circle cx={x - 4} cy={y - 4} r={3} fill="#ffffff" opacity={0.7} />
                </g>
            ))}
            {/* Korpa */}
            <path d="M286 236 H362 L352 278 H296 Z" fill="#d9a46e" {...line(3)} />
            <path d="M292 250 H356 M296 264 H352" {...line(2.5, "#b9824f")} />
            <circle cx={308} cy={232} r={11} fill="#e5483a" {...line(2.5)} />
            <circle cx={330} cy={228} r={11} fill="#e5483a" {...line(2.5)} />
            <circle cx={350} cy={234} r={10} fill="#e5483a" {...line(2.5)} />
            <circle cx={70} cy={262} r={12} fill="#e5483a" {...line(2.5)} />
            <Flower x={40} y={286} color="#ffd23f" s={0.8} />
        </g>
    );
}

function Boat() {
    return (
        <g>
            <Sky />
            <Sun x={64} y={62} r={30} face />
            <Cloud x={320} y={56} />
            <path d="M118 80 q8 -8 16 0 q8 -8 16 0 M246 112 q7 -7 14 0 q7 -7 14 0" fill="none" {...line(3)} />
            <rect x={0} y={200} width={400} height={100} fill="#4fb3e8" />
            <path d="M0 200 Q50 190 100 200 T200 200 T300 200 T400 200" fill="none" {...line(3, "#2a7fb3")} />
            <path d="M20 250 q20 -10 40 0 M120 276 q20 -10 40 0 M300 262 q20 -10 40 0 M220 290 q20 -10 40 0" fill="none" {...line(3, "#bfe5fb")} />
            {/* Brod */}
            <path d="M206 34 V206" {...line(5, "#7a4a2a")} />
            <path d="M206 38 L262 50 L206 64 Z" fill="#ffd23f" {...line(2.5)} />
            <path d="M212 70 Q290 120 300 186 H212 Z" fill="#ffffff" {...line(3)} />
            <path d="M212 112 Q262 136 280 152 M212 150 Q256 160 294 168" fill="none" {...line(3, "#e5483a")} />
            <path d="M200 84 Q138 132 128 186 H200 Z" fill="#ffffff" {...line(3)} />
            <path d="M200 128 Q160 146 144 160" fill="none" {...line(3, "#4fb3e8")} />
            <path d="M96 194 H322 Q306 238 280 244 H140 Q114 238 96 194 Z" fill="#e5483a" {...line(3)} />
            <path d="M104 210 H314" {...line(3, "#ffffff")} />
            <circle cx={156} cy={226} r={7} fill="#ffe08a" {...line(2.5)} />
            <circle cx={208} cy={226} r={7} fill="#ffe08a" {...line(2.5)} />
            <circle cx={260} cy={226} r={7} fill="#ffe08a" {...line(2.5)} />
        </g>
    );
}

function Butterfly() {
    return (
        <g>
            <Sky />
            <Cloud x={70} y={54} s={0.9} />
            <Cloud x={360} y={86} s={0.8} />
            <Grass y={226} />
            {/* Leptir */}
            <path d="M196 132 Q150 50 90 66 Q50 90 76 140 Q100 176 196 152 Z" fill="#b48cff" {...line(3)} />
            <path d="M204 132 Q250 50 310 66 Q350 90 324 140 Q300 176 204 152 Z" fill="#b48cff" {...line(3)} />
            <path d="M196 156 Q120 160 110 206 Q122 238 196 186 Z" fill="#ff8ab3" {...line(3)} />
            <path d="M204 156 Q280 160 290 206 Q278 238 204 186 Z" fill="#ff8ab3" {...line(3)} />
            <circle cx={118} cy={108} r={16} fill="#ffd23f" {...line(2.5)} />
            <circle cx={282} cy={108} r={16} fill="#ffd23f" {...line(2.5)} />
            <circle cx={142} cy={196} r={9} fill="#7cc8f2" {...line(2.5)} />
            <circle cx={258} cy={196} r={9} fill="#7cc8f2" {...line(2.5)} />
            <ellipse cx={200} cy={156} rx={11} ry={44} fill="#7a4a2a" {...line(3)} />
            <circle cx={200} cy={104} r={15} fill="#7a4a2a" {...line(3)} />
            <Eyes x={200} y={102} dx={6} r={2.6} />
            <path d="M194 92 Q182 66 168 62 M206 92 Q218 66 232 62" fill="none" {...line(3)} />
            <circle cx={168} cy={62} r={4} fill={INK} />
            <circle cx={232} cy={62} r={4} fill={INK} />
            {/* Cveće */}
            <Flower x={46} y={276} color="#ff7a8a" s={1.3} />
            <Flower x={120} y={288} color="#ffd23f" s={1.1} />
            <Flower x={200} y={278} color="#ffffff" s={1.2} />
            <Flower x={280} y={290} color="#7cc8f2" s={1.1} />
            <Flower x={356} y={276} color="#ff7a8a" s={1.3} />
        </g>
    );
}

function Train() {
    return (
        <g>
            <Sky />
            <path d="M0 170 Q80 110 170 160 Q250 100 400 150 V220 H0 Z" fill="#b9e49a" {...line(3, GRASS_DARK)} />
            <Grass y={210} />
            <circle cx={36} cy={60} r={14} fill="#eef6fb" {...line(2, "#9cc7e0")} />
            <circle cx={62} cy={42} r={20} fill="#eef6fb" {...line(2, "#9cc7e0")} />
            <circle cx={96} cy={30} r={24} fill="#eef6fb" {...line(2, "#9cc7e0")} />
            {/* Šine */}
            <path d="M0 270 H400 M0 284 H400" {...line(5, "#7a4a2a")} />
            <path d="M12 264 v26 M42 264 v26 M72 264 v26 M102 264 v26 M132 264 v26 M162 264 v26 M192 264 v26 M222 264 v26 M252 264 v26 M282 264 v26 M312 264 v26 M342 264 v26 M372 264 v26" {...line(4, "#a86b3c")} />
            {/* Vagoni */}
            <rect x={20} y={176} width={96} height={72} rx={8} fill="#4fb3e8" {...line(3)} />
            <rect x={34} y={190} width={30} height={26} rx={4} fill="#ffe08a" {...line(2.5)} />
            <rect x={72} y={190} width={30} height={26} rx={4} fill="#ffe08a" {...line(2.5)} />
            <rect x={128} y={176} width={96} height={72} rx={8} fill="#6cc46a" {...line(3)} />
            <rect x={142} y={190} width={30} height={26} rx={4} fill="#ffe08a" {...line(2.5)} />
            <rect x={180} y={190} width={30} height={26} rx={4} fill="#ffe08a" {...line(2.5)} />
            <path d="M116 230 H128 M224 230 H236" {...line(5)} />
            {/* Lokomotiva */}
            <rect x={236} y={176} width={70} height={72} rx={6} fill="#e5483a" {...line(3)} />
            <rect x={228} y={140} width={86} height={40} rx={6} fill="#c2393a" {...line(3)} />
            <rect x={250} y={150} width={42} height={24} rx={4} fill="#9ad8f6" {...line(2.5)} />
            <rect x={306} y={196} width={64} height={52} rx={8} fill="#e5483a" {...line(3)} />
            <rect x={330} y={150} width={22} height={48} fill="#3d3357" {...line(3)} />
            <path d="M324 150 H358" {...line(6)} />
            <circle cx={360} cy={118} r={14} fill="#eef6fb" {...line(2, "#9cc7e0")} />
            <circle cx={384} cy={98} r={18} fill="#eef6fb" {...line(2, "#9cc7e0")} />
            <circle cx={372} cy={222} r={8} fill="#ffe08a" {...line(2.5)} />
            {[46, 90, 154, 198, 262, 300, 346].map((x) => (
                <g key={x}>
                    <circle cx={x} cy={252} r={14} fill="#2f2a3f" {...line(3)} />
                    <circle cx={x} cy={252} r={5} fill="#c9c5d6" />
                </g>
            ))}
        </g>
    );
}

function Rainbow() {
    const bands = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"];
    return (
        <g>
            <Sky />
            <Grass y={240} />
            {bands.map((color, i) => {
                const r = 170 - i * 18;
                return <path key={color} d={`M${200 - r} 250 A${r} ${r} 0 0 1 ${200 + r} 250`} fill="none" stroke={color} strokeWidth={18} />;
            })}
            <path d="M30 250 A170 170 0 0 1 370 250 M120 250 A80 80 0 0 1 280 250" fill="none" {...line(3)} />
            <Cloud x={70} y={252} s={1.4} />
            <Cloud x={380} y={252} s={1.4} />
            <Cloud x={210} y={48} s={1} />
            {[60, 96, 132, 300, 336, 372].map((x, i) => (
                <path key={x} d={`M${x} ${110 + (i % 2) * 22} q-5 9 0 12 q5 -3 0 -12 Z`} fill="#4fb3e8" {...line(1.6, "#2a7fb3")} />
            ))}
            <ellipse cx={200} cy={276} rx={56} ry={12} fill="#7cc8f2" {...line(2.5, "#2a7fb3")} />
            <Flower x={150} y={292} color="#ffd23f" s={0.8} />
            <Flower x={262} y={292} color="#ff7a8a" s={0.8} />
        </g>
    );
}

/** Dete spreda: glava, kosa, majica, šorc ili haljina, ruke i noge (koordinate glave i tela) */
function Child({ x, kind }: { x: number; kind: "amar" | "lejla" }) {
    const girl = kind === "lejla";
    const shirt = girl ? "#ff8ab3" : "#4f8ff0";
    return (
        <g>
            {/* Noge */}
            <path d={`M${x - 14} 222 V266 M${x + 14} 222 V266`} {...line(13, SKIN)} />
            <path d={`M${x - 14} 222 V266 M${x + 14} 222 V266`} fill="none" stroke="none" />
            <ellipse cx={x - 16} cy={270} rx={14} ry={8} fill={girl ? "#e5483a" : "#3d3357"} {...line(2.5)} />
            <ellipse cx={x + 16} cy={270} rx={14} ry={8} fill={girl ? "#e5483a" : "#3d3357"} {...line(2.5)} />
            {/* Telo */}
            {girl ? (
                <path d={`M${x - 26} 148 Q${x} 140 ${x + 26} 148 L${x + 44} 230 Q${x} 240 ${x - 44} 230 Z`} fill={shirt} {...line(3)} />
            ) : (
                <>
                    <rect x={x - 28} y={146} width={56} height={62} rx={14} fill={shirt} {...line(3)} />
                    <rect x={x - 28} y={200} width={56} height={28} rx={6} fill="#3d3357" {...line(3)} />
                    <text x={x} y={186} textAnchor="middle" fontSize={24} fontWeight={800} fill="#ffffff" fontFamily="system-ui, sans-serif">
                        7
                    </text>
                </>
            )}
            {/* Vrat i glava */}
            <rect x={x - 8} y={128} width={16} height={22} fill={SKIN} {...line(2.5)} />
            <circle cx={x} cy={104} r={36} fill={SKIN} {...line(3)} />
            {girl ? (
                <>
                    <path d={`M${x - 38} 104 Q${x - 42} 60 ${x} 62 Q${x + 42} 60 ${x + 38} 104 Q${x + 26} 80 ${x} 82 Q${x - 26} 80 ${x - 38} 104 Z`} fill={HAIR} {...line(3)} />
                    <path d={`M${x + 34} 82 Q${x + 66} 92 ${x + 58} 140 Q${x + 46} 120 ${x + 36} 100 Z`} fill={HAIR} {...line(3)} />
                    <circle cx={x + 38} cy={84} r={7} fill="#ffd23f" {...line(2)} />
                </>
            ) : (
                <path d={`M${x - 36} 98 Q${x - 38} 62 ${x} 64 Q${x + 38} 62 ${x + 36} 98 Q${x + 20} 82 ${x + 4} 86 Q${x - 18} 80 ${x - 36} 98 Z`} fill={HAIR} {...line(3)} />
            )}
            <Eyes x={x} y={106} dx={13} r={4} />
            <circle cx={x - 22} cy={118} r={6} fill="#f59a9a" opacity={0.55} />
            <circle cx={x + 22} cy={118} r={6} fill="#f59a9a" opacity={0.55} />
            <path d={`M${x - 11} 122 Q${x} 132 ${x + 11} 122`} fill="none" {...line(3)} />
        </g>
    );
}

function AmarBall() {
    return (
        <g>
            <Sky />
            <Sun x={344} y={54} r={26} />
            <Cloud x={120} y={52} />
            <Grass y={226} />
            {/* Gol */}
            <path d="M16 236 V136 H104 V236" fill="none" {...line(6, "#ffffff")} />
            <path d="M16 136 H104 M16 236 V136" fill="none" {...line(2, INK)} />
            <path d="M30 136 V236 M46 136 V236 M62 136 V236 M78 136 V236 M92 136 V236 M16 156 H104 M16 176 H104 M16 196 H104 M16 216 H104" {...line(1.4, "#9cc7e0")} />
            <Child x={200} kind="amar" />
            {/* Ruke */}
            <path d="M174 160 Q150 186 156 206 M226 160 Q252 182 262 200" fill="none" {...line(12, SKIN)} />
            {/* Lopta */}
            <circle cx={292} cy={250} r={28} fill="#ffffff" {...line(3)} />
            <path d="M292 236 L304 245 L300 259 L284 259 L280 245 Z" fill={INK} />
            <path d="M292 236 V222 M304 245 L318 240 M300 259 L310 272 M284 259 L274 272 M280 245 L266 240" {...line(2.5)} />
            <Flower x={360} y={280} color="#ffd23f" />
        </g>
    );
}

function LejlaKite() {
    return (
        <g>
            <Sky />
            <Cloud x={100} y={60} />
            <Cloud x={190} y={120} s={0.6} />
            <Grass y={232} />
            {/* Zmaj */}
            <path d="M320 26 L362 76 L320 132 L278 76 Z" fill="#ffd23f" {...line(3)} />
            <path d="M320 26 L320 132 M278 76 H362" {...line(2.5)} />
            <path d="M320 26 L362 76 L320 76 Z M278 76 L320 132 L320 76 Z" fill="#e5483a" {...line(2.5)} />
            <path d="M320 132 Q300 160 322 176 Q342 192 320 214" fill="none" {...line(2.5)} />
            <path d="M312 160 l10 -6 l2 12 Z M320 196 l10 -6 l2 12 Z" fill="#4fb3e8" {...line(2)} />
            {/* Kanap */}
            <path d="M320 132 Q270 150 236 166" fill="none" {...line(2, "#7a4a2a")} />
            <Child x={180} kind="lejla" />
            <path d="M156 160 Q132 186 140 206 M204 160 Q220 162 236 166" fill="none" {...line(12, SKIN)} />
            <Flower x={44} y={276} color="#ff7a8a" s={1.2} />
            <Flower x={88} y={286} color="#ffffff" />
            <Flower x={300} y={280} color="#b48cff" s={1.2} />
            <Flower x={356} y={290} color="#ffd23f" />
        </g>
    );
}

export const PUZZLE_ART: Record<PuzzlePictureId, () => ReactNode> = {
    sunce: SunHill,
    kuca: House,
    riba: Fish,
    auto: Car,
    macka: Cat,
    drvo: AppleTree,
    brod: Boat,
    leptir: Butterfly,
    voz: Train,
    duga: Rainbow,
    amar: AmarBall,
    lejla: LejlaKite,
};

/** Cela scena (za tablu, vodilju i svaki deo) */
export function PuzzleScene({ id }: { id: PuzzlePictureId }) {
    const Draw = PUZZLE_ART[id];
    return <Draw />;
}
