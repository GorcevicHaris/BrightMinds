// app/dashboard/child/[id]/mapWorlds.tsx
// Četiri sveta „Mape” igara: Zelena livada, Peščana pustinja, Vatreni vulkan i Ledeni vrhovi.
// Ovde je samo crtež (čist SVG, bez stanja i bez podataka): tlo, ukrasi, reka, put, most,
// početak puta i kapija na kraju sveta. Raspored (kuda ide put, gde rastu ukrasi, gde teče
// reka) daje gameMapLayout.ts, pa svi svetovi dele iste koordinate — menja se samo izgled.
//
// Zašto ovako:
//   • Svet se prepoznaje na prvi pogled (boja tla + jedan veliki znak u gornjem uglu: piramide,
//     nasmejani vulkan, snežni vrhovi), a raspored ostaje isti i predvidljiv. Deci sa autizmom
//     promena rasporeda smeta mnogo više od promene boja.
//   • Boje su meke i tople, isti ravni crtež kao ostatak aplikacije. Vulkan je narandžast,
//     „pospan” i nasmejan (bez jarko crvene, bez lobanja), led je svetao i veseo.
//   • Kapija pokazuje cilj bez reči: katanac (zaključano), zlatni ključ pored katanca (zvezdice
//     su skupljene) i otvorena vrata sa svetlom stazom ka sledećem svetu. Poslednji svet umesto
//     kapije ima dvorac sa kovčegom blaga.
//   • Pokret je tih i spor (dim, sjaj lave, svetlucanje snega, ključ koji lebdi) i potpuno
//     staje uz „Manje animacija” (`calm`) ili sistemsko „smanji pokrete”.

import { useId, type JSX } from "react";
import type { MapHill, MapLayout, MapPoint, MapTree } from "./gameMapLayout";

export type WorldId = "meadow" | "desert" | "volcano" | "ice";

export interface WorldTheme {
    id: WorldId;
    /** Ime sveta: „Zelena livada”, „Peščana pustinja”, „Vatreni vulkan”, „Ledeni vrhovi” */
    name: string;
    /** Gde je dete, za glas i pohvalu: „na livadi”, „u pustinji”, „na vulkanu”, „na ledenim vrhovima” */
    where: string;
    /** Boje okvira oko mape (jezičak, ivica, dugme), bez Tailwinda */
    colors: { ground: string; groundDeep: string; frame: string; accent: string; text: string };
}

export const WORLDS: readonly WorldTheme[] = [
    {
        id: "meadow",
        name: "Zelena livada",
        where: "na livadi",
        colors: { ground: "#E9F5E1", groundDeep: "#BFE3AE", frame: "#7DBE7E", accent: "#22A06B", text: "#1E5631" },
    },
    {
        id: "desert",
        name: "Peščana pustinja",
        where: "u pustinji",
        colors: { ground: "#FBF0D9", groundDeep: "#F1D9A8", frame: "#D9A85B", accent: "#D97F16", text: "#6B4310" },
    },
    {
        id: "volcano",
        name: "Vatreni vulkan",
        where: "na vulkanu",
        colors: { ground: "#FCE8DA", groundDeep: "#F3C6A8", frame: "#C9774E", accent: "#EE7A2A", text: "#6E2E12" },
    },
    {
        id: "ice",
        name: "Ledeni vrhovi",
        where: "na ledenim vrhovima",
        colors: { ground: "#EAF6FD", groundDeep: "#C4E6F7", frame: "#6FB7E3", accent: "#2F8FD6", text: "#14476E" },
    },
];

export function worldTheme(id: WorldId): WorldTheme {
    return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}

/** Svet posle ovog (za pogled kroz otvorenu kapiju); posle poslednjeg nema ništa */
function nextWorld(id: WorldId): WorldTheme | null {
    const index = WORLDS.findIndex((w) => w.id === id);
    return WORLDS[index + 1] ?? null;
}

// ── Zajedničko ────────────────────────────────────────────────────────────────

/** Jedinstven ID za gradijente i isečke (više mapa na istoj strani se ne mešaju) */
function useSafeId(): string {
    return "bmw" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
}

/** Deterministički „slučajan” broj 0–1 (isti kao u gameMapLayout.ts: isti ulaz → isti crtež) */
function noise(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Klasa pokreta samo kad pokret nije smanjen */
const moving = (calm: boolean, name: string) => (calm ? undefined : name);

/** Tihi pokreti; uz sistemsko „smanji pokrete” staju i bez `calm` */
const WORLD_STYLE =
    "@keyframes bmw-pulse{0%,100%{opacity:.55}50%{opacity:1}}" +
    "@keyframes bmw-twinkle{0%,100%{opacity:.25;transform:scale(.55)}50%{opacity:1;transform:scale(1)}}" +
    "@keyframes bmw-smoke{0%{opacity:0;transform:translate(0,8px) scale(.55)}25%{opacity:.9}100%{opacity:0;transform:translate(7px,-30px) scale(1.3)}}" +
    "@keyframes bmw-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}" +
    "@keyframes bmw-flow{to{stroke-dashoffset:-128}}" +
    ".bmw-pulse{animation:bmw-pulse 3.4s ease-in-out infinite}" +
    ".bmw-twinkle{animation:bmw-twinkle 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}" +
    ".bmw-smoke{animation:bmw-smoke 5.4s ease-out infinite;transform-box:fill-box;transform-origin:center}" +
    ".bmw-bob{animation:bmw-bob 2.6s ease-in-out infinite}" +
    ".bmw-flow{animation:bmw-flow 9s linear infinite}" +
    "@media (prefers-reduced-motion:reduce){.bmw-pulse,.bmw-twinkle,.bmw-smoke,.bmw-bob,.bmw-flow{animation:none}}";

/** Zvezdica sa četiri kraka (svetlucanje), središte u 0,0 */
function sparklePath(s: number): string {
    const k = r1(s * 0.28);
    return `M0 ${-s} L${k} ${-k} L${s} 0 L${k} ${k} L0 ${s} L${-k} ${k} L${-s} 0 L${-k} ${-k} Z`;
}

function Sparkle({ x, y, s, fill, calm, delay = 0 }: { x: number; y: number; s: number; fill: string; calm: boolean; delay?: number }) {
    return (
        <g transform={`translate(${r1(x)} ${r1(y)})`}>
            <path d={sparklePath(s)} fill={fill} className={moving(calm, "bmw-twinkle")} style={calm ? undefined : { animationDelay: `${delay}s` }} />
        </g>
    );
}

/** Talasasta linija preko cele širine (reka) */
function wave(width: number, y: number): string {
    let d = `M-20 ${r1(y)}`;
    for (let x = -20; x < width + 40; x += 80) d += " q20 -9 40 0 t40 0";
    return d;
}

// ── Boje po svetu ─────────────────────────────────────────────────────────────

const GROUND: Record<WorldId, [string, string]> = {
    meadow: ["#EEF8E8", "#E2F1D8"],
    desert: ["#FDF4E0", "#F8E5C1"],
    volcano: ["#FDEDE1", "#F9DCC8"],
    ice: ["#F6FCFF", "#E4F3FC"],
};

const ROADS: Record<WorldId, { edge: string; fill: string; dash: string; done: string }> = {
    meadow: { edge: "#D9C49A", fill: "#F4E6C6", dash: "#FFFFFF", done: "#FFD66B" },
    desert: { edge: "#D59D6B", fill: "#F3CDA3", dash: "#FFF6E6", done: "#FFD34F" },
    volcano: { edge: "#9C8073", fill: "#C9B0A3", dash: "#FFEBD0", done: "#FFC94D" },
    ice: { edge: "#A9D3EE", fill: "#FFFFFF", dash: "#A9D3EE", done: "#FFD66B" },
};

export function worldRoad(id: WorldId): { edge: string; fill: string; dash: string; done: string } {
    return ROADS[id];
}

// ── Svet ispod puta ───────────────────────────────────────────────────────────

/** Mesto za veliki znak sveta u gornjem delu mape (piramide, vulkan, snežni vrhovi) */
interface EdgeSpot {
    x: number;
    /** Dno znaka */
    y: number;
    s: number;
}

function edgeSpot(layout: MapLayout): EdgeSpot | null {
    const { width: w, lanes, nodes, start, end } = layout;
    if (lanes === 1) return { x: w - 44, y: 138, s: 0.82 };
    // Šire: u razmaku između dve stanice prvog reda, desno od sela
    const firstY = nodes[0]?.y ?? end.y;
    const row = [...nodes, end].filter((p) => Math.abs(p.y - firstY) < 70).map((p) => p.x);
    row.sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 0; i < row.length - 1; i += 1) if (row[i + 1] - row[i] > 230) gaps.push((row[i] + row[i + 1]) / 2);
    const last = row[row.length - 1] ?? 0;
    if (w - last > 260) gaps.push((last + w) / 2);
    const x = gaps.filter((g) => g > start.x + 190).pop();
    return x === undefined ? null : { x, y: 128, s: 0.9 };
}

/** Ukras ne raste preko velikog znaka */
function underSpot(spot: EdgeSpot | null, t: MapTree): boolean {
    if (!spot) return false;
    return Math.abs(t.x - spot.x) < 96 * spot.s + t.r && t.y > spot.y - 150 * spot.s - t.r && t.y < spot.y + t.r * 2 + 8;
}

/**
 * Sve ISPOD puta: tlo, brda/dine/stene/smetovi uz ivice, ukrasi na mestima drveća
 * (`layout.trees`) i reka (`layout.river`). Iste koordinate kao mapa (layout.width × layout.height).
 */
export function WorldScenery({ world, layout, calm }: { world: WorldId; layout: MapLayout; calm: boolean }): JSX.Element {
    const uid = useSafeId();
    const { width, height, river, trees, hills } = layout;
    const [top, bottom] = GROUND[world];
    const spot = world === "meadow" ? null : edgeSpot(layout);

    return (
        <g>
            <defs>
                <linearGradient id={`${uid}-ground`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={top} />
                    <stop offset="1" stopColor={bottom} />
                </linearGradient>
                <style>{WORLD_STYLE}</style>
            </defs>
            <rect width={width} height={height} fill={`url(#${uid}-ground)`} />
            <GroundTexture world={world} width={width} height={height} />

            {hills.map((h, i) => (
                <Hill key={`h${i}`} world={world} hill={h} width={width} calm={calm} index={i} />
            ))}

            {spot && <EdgeLandmark world={world} spot={spot} calm={calm} />}

            {river && <WorldRiver world={world} width={width} y={river.y} cross={river.cross} calm={calm} />}

            {trees.map((t, i) => (underSpot(spot, t) ? null : <Decor key={`t${i}`} world={world} t={t} index={i} calm={calm} />))}
        </g>
    );
}

/** Sitna šara tla: talasići peska, kamenčići, pahuljice (livada ostaje čista kao do sada) */
function GroundTexture({ world, width, height }: { world: WorldId; width: number; height: number }) {
    if (world === "meadow") return null;
    const marks: JSX.Element[] = [];
    const cell = 118;
    let seed = 500;
    for (let y = 60; y < height - 20; y += cell) {
        for (let x = 30; x < width - 10; x += cell) {
            seed += 1;
            if (noise(seed) < 0.35) continue;
            const mx = r1(x + (noise(seed * 3) - 0.5) * cell * 0.8);
            const my = r1(y + (noise(seed * 5) - 0.5) * cell * 0.8);
            if (world === "desert") {
                marks.push(
                    <g key={seed} fill="none" stroke="#EDD3A2" strokeWidth="2.5" strokeLinecap="round">
                        <path d={`M${mx - 14} ${my} q14 -6 28 0`} />
                        <path d={`M${mx - 6} ${my + 7} q10 -4 20 0`} />
                    </g>
                );
            } else if (world === "volcano") {
                marks.push(
                    <g key={seed} fill="#EFC9B1">
                        <ellipse cx={mx} cy={my} rx="4" ry="2.6" />
                        <ellipse cx={mx + 9} cy={my + 4} rx="2.6" ry="1.8" />
                    </g>
                );
            } else {
                marks.push(
                    <g key={seed} fill="#D3EAF8">
                        <circle cx={mx} cy={my} r="2.2" />
                        <circle cx={mx + 10} cy={my + 6} r="1.5" />
                    </g>
                );
            }
        }
    }
    return <g>{marks}</g>;
}

const GREENS = ["#BFE3AE", "#CDEABD", "#B3DCA0"];
const DUNES = ["#F1D39B", "#F4DBAA", "#ECCB8C"];
const MOUNDS = ["#F2CDB4", "#F5D6C1", "#EEC4A8"];
const DRIFTS = ["#DCEFFB", "#E4F3FC", "#D3EAF8"];

function Hill({ world, hill: h, width, calm, index }: { world: WorldId; hill: MapHill; width: number; calm: boolean; index: number }) {
    // Vidljiva strana brda (brdo stoji uz levu ili desnu ivicu)
    const dir = h.x < width / 2 ? 1 : -1;
    if (world === "meadow") return <ellipse cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} fill={GREENS[h.tone]} opacity="0.8" />;
    if (world === "desert") {
        return (
            <g>
                <ellipse cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} fill={DUNES[h.tone]} opacity="0.85" />
                <path
                    d={`M${r1(h.x - h.rx * 0.85)} ${r1(h.y - h.ry * 0.3)} Q${r1(h.x + dir * h.rx * 0.2)} ${r1(h.y - h.ry * 1.12)} ${r1(h.x + h.rx * 0.85)} ${r1(h.y - h.ry * 0.3)}`}
                    fill="none"
                    stroke="#FBEBCB"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.9"
                />
            </g>
        );
    }
    if (world === "volcano") {
        return (
            <g>
                <ellipse cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} fill={MOUNDS[h.tone]} opacity="0.9" />
                <g fill="#E6B497">
                    <ellipse cx={r1(h.x + dir * h.rx * 0.6)} cy={r1(h.y - h.ry * 0.3)} rx="9" ry="6" />
                    <ellipse cx={r1(h.x + dir * h.rx * 0.74)} cy={r1(h.y + h.ry * 0.18)} rx="6" ry="4" />
                    <ellipse cx={r1(h.x + dir * h.rx * 0.46)} cy={r1(h.y + h.ry * 0.42)} rx="7" ry="4.5" />
                </g>
            </g>
        );
    }
    return (
        <g>
            <ellipse cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} fill={DRIFTS[h.tone]} />
            <path
                d={`M${r1(h.x - h.rx * 0.85)} ${r1(h.y - h.ry * 0.3)} Q${r1(h.x + dir * h.rx * 0.2)} ${r1(h.y - h.ry * 1.12)} ${r1(h.x + h.rx * 0.85)} ${r1(h.y - h.ry * 0.3)}`}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="5"
                strokeLinecap="round"
            />
            <Sparkle x={h.x + dir * h.rx * 0.55} y={h.y - h.ry * 0.55} s={6} fill="#8FCDEE" calm={calm} delay={index * 0.7} />
        </g>
    );
}

// ── Veliki znak sveta ─────────────────────────────────────────────────────────

function EdgeLandmark({ world, spot, calm }: { world: WorldId; spot: EdgeSpot; calm: boolean }) {
    return (
        <g transform={`translate(${r1(spot.x)} ${spot.y}) scale(${spot.s})`}>
            {world === "desert" ? <Pyramids /> : world === "volcano" ? <BigVolcano calm={calm} /> : <SnowPeaks calm={calm} />}
        </g>
    );
}

function Pyramids() {
    const one = (cx: number, half: number, h: number) => (
        <g>
            <path d={`M${cx} ${-h} L${cx - half} 0 L${cx + half * 0.2} 0 Z`} fill="#F2D394" />
            <path d={`M${cx} ${-h} L${cx + half * 0.2} 0 L${cx + half} 0 Z`} fill="#DDAE6C" />
            {[0.3, 0.55, 0.78].map((f) => (
                <path key={f} d={`M${r1(cx - half * f)} ${r1(-h * (1 - f))} H${r1(cx + half * f)}`} stroke="#E6BF7E" strokeWidth="1.5" opacity="0.7" />
            ))}
            <path d={`M${cx} ${-h} l-5 8 h10 Z`} fill="#F5B83D" />
        </g>
    );
    return (
        <g>
            <ellipse cx="0" cy="4" rx="96" ry="9" fill="#000" opacity="0.06" />
            {one(-34, 54, 92)}
            {one(44, 40, 66)}
            {/* Mala palma pored piramida */}
            <g transform="translate(-86 0)">
                <path d="M0 0 Q-2 -22 6 -40" fill="none" stroke="#C49A6C" strokeWidth="5" strokeLinecap="round" />
                {[-150, -110, -60, -20, 25].map((a) => (
                    <ellipse key={a} cx="13" cy="0" rx="14" ry="4.5" fill="#7DBE7E" transform={`translate(6 -40) rotate(${a})`} />
                ))}
            </g>
        </g>
    );
}

/** Pospani, nasmejani vulkan: topla narandžasta lava, dim polako izlazi */
function BigVolcano({ calm }: { calm: boolean }) {
    const puffs = [
        { x: -2, y: -104, r: 9 },
        { x: 6, y: -114, r: 11 },
        { x: -4, y: -124, r: 13 },
    ];
    return (
        <g>
            <ellipse cx="0" cy="4" rx="98" ry="9" fill="#000" opacity="0.06" />
            {/* Topli sjaj oko kratera */}
            <g opacity="0.35"><ellipse cx="0" cy="-92" rx="44" ry="18" fill="#FFC56B" className={moving(calm, "bmw-pulse")} /></g>
            <path d="M-94 2 C-70 -18 -46 -74 -30 -90 Q0 -100 30 -90 C46 -74 70 -18 94 2 Z" fill="#C89580" />
            <path d="M8 -97 Q30 -92 34 -86 C50 -66 72 -18 94 2 L30 2 C38 -30 30 -70 8 -97 Z" fill="#B7836E" />
            {/* Lava u krateru i jedna meka kap niz padinu */}
            <ellipse cx="0" cy="-92" rx="28" ry="7" fill="#FFB04A" />
            <ellipse cx="0" cy="-93" rx="18" ry="3.5" fill="#FFD77E" className={moving(calm, "bmw-pulse")} />
            <path d="M-20 -90 Q-26 -74 -22 -64 Q-18 -56 -14 -64 Q-12 -76 -6 -88 Z" fill="#FFA94D" />
            <path d="M-17 -86 Q-20 -76 -18 -68" fill="none" stroke="#FFD77E" strokeWidth="2.5" strokeLinecap="round" />
            {/* Lice: zatvorene, nasmejane oči i osmeh */}
            <g fill="none" stroke="#7A4E3E" strokeWidth="3" strokeLinecap="round">
                <path d="M-24 -46 q6 5 12 0" />
                <path d="M12 -46 q6 5 12 0" />
                <path d="M-8 -32 q8 7 16 0" />
            </g>
            <ellipse cx="-28" cy="-36" rx="7" ry="4" fill="#F4A08E" opacity="0.7" />
            <ellipse cx="28" cy="-36" rx="7" ry="4" fill="#F4A08E" opacity="0.7" />
            {/* Dim */}
            {puffs.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={p.r}
                    fill="#FBF3EE"
                    stroke="#EAD8CD"
                    strokeWidth="1.5"
                    opacity={calm ? 0.85 : undefined}
                    className={moving(calm, "bmw-smoke")}
                    style={calm ? undefined : { animationDelay: `${i * 1.8}s` }}
                />
            ))}
        </g>
    );
}

function SnowPeaks({ calm }: { calm: boolean }) {
    const peak = (cx: number, half: number, h: number, body: string, shade: string) => (
        <g>
            <path d={`M${cx} ${-h} L${cx - half} 0 H${cx + half} Z`} fill={body} />
            <path d={`M${cx} ${-h} L${cx + half} 0 H${cx + half * 0.15} Z`} fill={shade} />
            <path
                d={`M${cx} ${-h} L${r1(cx - half * 0.38)} ${r1(-h * 0.62)} q${r1(half * 0.12)} 7 ${r1(half * 0.24)} 0 q${r1(half * 0.14)} 7 ${r1(half * 0.28)} 0 q${r1(half * 0.12)} 7 ${r1(half * 0.24)} 0 Z`}
                fill="#FFFFFF"
            />
        </g>
    );
    return (
        <g>
            <ellipse cx="0" cy="4" rx="100" ry="9" fill="#000" opacity="0.05" />
            {peak(40, 52, 82, "#B5DCF2", "#9CCDEB")}
            {peak(-28, 64, 112, "#C6E5F6", "#A9D6F0")}
            <ellipse cx="0" cy="0" rx="98" ry="12" fill="#FFFFFF" />
            <Sparkle x={-50} y={-70} s={7} fill="#FFFFFF" calm={calm} />
            <Sparkle x={66} y={-58} s={5} fill="#FFFFFF" calm={calm} delay={1.2} />
        </g>
    );
}

// ── Reka ──────────────────────────────────────────────────────────────────────

function WorldRiver({ world, width, y, cross, calm }: { world: WorldId; width: number; y: number; cross: MapPoint; calm: boolean }) {
    const d = wave(width, y);
    const dUp = wave(width, y - 6);
    const dDown = wave(width, y + 7);
    /** Mesta uz obalu (rogoz, kamenje, pukotine), ne kod mosta */
    const bank: { x: number; side: number; k: number }[] = [];
    for (let x = 34, k = 0; x < width - 20; x += 84, k += 1) if (Math.abs(x - cross.x) > 64) bank.push({ x, side: k % 2 === 0 ? -1 : 1, k });

    if (world === "meadow") {
        return (
            <g>
                <path d={d} fill="none" stroke="#A9D8F0" strokeWidth="44" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#C4E6F7" strokeWidth="34" strokeLinecap="round" />
                <path d={dUp} fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" strokeDasharray="18 46" />
                <path d={dDown} fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.45" strokeDasharray="12 58" strokeDashoffset="20" />
            </g>
        );
    }
    if (world === "desert") {
        // Potok oaze: tirkizna voda, zelene obale, rogoz
        return (
            <g>
                <path d={d} fill="none" stroke="#CFE3A4" strokeWidth="58" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#7FD0C8" strokeWidth="40" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#A8E3DC" strokeWidth="30" strokeLinecap="round" />
                <path d={dUp} fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" strokeDasharray="18 46" className={moving(calm, "bmw-flow")} />
                <path d={dDown} fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.5" strokeDasharray="12 52" strokeDashoffset="20" />
                {bank.map(({ x, side, k }) => {
                    const by = y + side * 25;
                    return (
                        <g key={x} transform={`translate(${x} ${r1(by)})`} stroke="#86BE6E" strokeWidth="2.5" strokeLinecap="round" fill="none">
                            <path d="M0 4 L-5 -7" />
                            <path d="M0 4 L0 -10" />
                            <path d="M0 4 L5 -6" />
                            {k % 3 === 0 && <ellipse cx="0" cy="-12" rx="2" ry="4" fill="#B08968" stroke="none" />}
                        </g>
                    );
                })}
            </g>
        );
    }
    if (world === "volcano") {
        // Reka lave: toplo narandžasta, meko sija (bez crvene)
        return (
            <g>
                <g opacity="0.16"><path d={d} fill="none" stroke="#FFB04A" strokeWidth="78" strokeLinecap="round" className={moving(calm, "bmw-pulse")} /></g>
                <path d={d} fill="none" stroke="#A88A7C" strokeWidth="52" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#FF9F43" strokeWidth="38" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#FFC15E" strokeWidth="24" strokeLinecap="round" className={moving(calm, "bmw-pulse")} />
                <path d={dUp} fill="none" stroke="#FFE7A3" strokeWidth="3" strokeLinecap="round" opacity="0.9" strokeDasharray="10 54" className={moving(calm, "bmw-flow")} />
                <path d={dDown} fill="none" stroke="#FFE7A3" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" strokeDasharray="6 58" strokeDashoffset="24" />
                {bank.map(({ x, side }) => (
                    <g key={x} fill="#8C7469">
                        <ellipse cx={x} cy={r1(y + side * 25)} rx="7" ry="5" />
                        <ellipse cx={x + 10} cy={r1(y + side * 27)} rx="4.5" ry="3.5" fill="#9C8073" />
                    </g>
                ))}
            </g>
        );
    }
    // Zaleđeni potok: svetloplavi led, beli odsjaji, pukotinice
    return (
        <g>
            <path d={d} fill="none" stroke="#D3EAF8" strokeWidth="58" strokeLinecap="round" />
            <path d={d} fill="none" stroke="#FFFFFF" strokeWidth="52" strokeLinecap="round" />
            <path d={d} fill="none" stroke="#A9D9F2" strokeWidth="40" strokeLinecap="round" />
            <path d={d} fill="none" stroke="#CDEBFA" strokeWidth="31" strokeLinecap="round" />
            <path d={dUp} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.9" strokeDasharray="30 50" />
            {bank.map(({ x, side, k }) => (
                <g key={x}>
                    <path d={`M${x - 8} ${r1(y + side * 4)} l5 -4 l4 5 l6 -3`} fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    {k % 2 === 0 && <Sparkle x={x + 22} y={y - side * 6} s={4.5} fill="#FFFFFF" calm={calm} delay={k * 0.5} />}
                </g>
            ))}
        </g>
    );
}

// ── Ukrasi (na mestima drveća) ────────────────────────────────────────────────

const TREE_TONES = ["#7DBE7E", "#8FCB86", "#6DB27A"];
const TREE_LIGHT = ["#A3D6A0", "#B2DEA5", "#93CB98"];
const CACTUS = ["#7FBF7A", "#8CC98A", "#6FB47C"];
const PINE = ["#4FA88F", "#5CB89C", "#46A08A"];

function Decor({ world, t, index, calm }: { world: WorldId; t: MapTree; index: number; calm: boolean }) {
    const pick = Math.floor(noise(index * 31 + 7) * 100);
    let art: JSX.Element;
    if (world === "meadow") art = <Tree t={t} />;
    else if (world === "desert") {
        if (pick < 36) art = <Cactus t={t} />;
        else if (pick < 58) art = <DesertRocks t={t} />;
        else if (pick < 80) art = <Palm t={t} />;
        else if (pick < 92) art = t.r > 15 ? <SmallPyramid t={t} /> : <Cactus t={t} />;
        else art = <OasisPond t={t} />;
    } else if (world === "volcano") {
        if (pick < 30) art = <Boulders t={t} />;
        else if (pick < 50) art = <LavaPool t={t} calm={calm} />;
        else if (pick < 66) art = <GlowCrack t={t} calm={calm} />;
        else if (pick < 88) art = <FireFlowers t={t} />;
        else art = <MiniCone t={t} />;
    } else {
        if (pick < 44) art = <SnowPine t={t} />;
        else if (pick < 66) art = <Crystals t={t} />;
        else if (pick < 80) art = <Snowman t={t} />;
        else if (pick < 90) art = <SnowMound t={t} />;
        else art = t.r > 15 ? <SmallIgloo t={t} /> : <SnowPine t={t} />;
    }
    const sparkle = world === "ice" && index % 3 === 0;
    return (
        <g transform={`translate(${t.x} ${t.y})`}>
            {art}
            {sparkle && <Sparkle x={t.r * 1.1} y={-t.r * 0.7} s={5} fill="#8FCDEE" calm={calm} delay={(index % 5) * 0.6} />}
        </g>
    );
}

function Shadow({ r }: { r: number }) {
    return <ellipse cx="0" cy={r1(r + 6)} rx={r1(r * 0.8)} ry="3.5" fill="#000" opacity="0.07" />;
}

/** Drvo livade — isto kao do sada */
function Tree({ t }: { t: MapTree }) {
    return (
        <>
            <ellipse cx="0" cy={t.r + 6} rx={t.r * 0.8} ry="3.5" fill="#000" opacity="0.07" />
            <rect x="-3" y={t.r * 0.4} width="6" height={t.r * 0.8} rx="2" fill="#B08968" />
            <circle r={t.r} fill={TREE_TONES[t.tone]} />
            <circle cx={-t.r * 0.3} cy={-t.r * 0.3} r={t.r * 0.45} fill={TREE_LIGHT[t.tone]} />
        </>
    );
}

function Cactus({ t }: { t: MapTree }) {
    const { r } = t;
    const bw = r1(r * 0.62);
    const bottom = r + 5;
    const top = r1(bottom - r * 2.1);
    const green = CACTUS[t.tone];
    return (
        <>
            <Shadow r={r} />
            <path d={`M${-bw / 2} ${r1(r * 0.25)} H${r1(-r * 0.72)} V${r1(-r * 0.3)}`} fill="none" stroke={green} strokeWidth={r1(bw * 0.72)} strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M${bw / 2} ${r1(-r * 0.1)} H${r1(r * 0.68)} V${r1(-r * 0.7)}`} fill="none" stroke={green} strokeWidth={r1(bw * 0.72)} strokeLinecap="round" strokeLinejoin="round" />
            <rect x={-bw / 2} y={top} width={bw} height={r1(bottom - top)} rx={bw / 2} fill={green} />
            <path d={`M0 ${top + 5} V${bottom - 4}`} stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
            {t.tone === 1 && (
                <g transform={`translate(0 ${top + 1})`}>
                    {[0, 72, 144, 216, 288].map((a) => (
                        <circle key={a} cx="0" cy="-3" r="2.4" fill="#F59FB5" transform={`rotate(${a})`} />
                    ))}
                    <circle r="1.8" fill="#FFD66B" />
                </g>
            )}
        </>
    );
}

function Palm({ t }: { t: MapTree }) {
    const { r } = t;
    const tx = r1(r * 0.35);
    const ty = r1(-r * 0.75);
    const green = TREE_TONES[t.tone];
    return (
        <>
            <Shadow r={r} />
            <path d={`M0 ${r + 5} Q${r1(r * 0.05)} ${r1(r * 0.2)} ${tx} ${ty}`} fill="none" stroke="#C49A6C" strokeWidth="5.5" strokeLinecap="round" />
            <path d={`M0 ${r + 5} Q${r1(r * 0.05)} ${r1(r * 0.2)} ${tx} ${ty}`} fill="none" stroke="#A97E52" strokeWidth="5.5" strokeDasharray="1.5 6" opacity="0.55" />
            {[-165, -125, -80, -35, 10].map((a) => (
                <ellipse key={a} cx={r1(r * 0.62)} cy="0" rx={r1(r * 0.68)} ry={r1(r * 0.22)} fill={green} transform={`translate(${tx} ${ty}) rotate(${a})`} />
            ))}
            <circle cx={tx - 2} cy={ty + 3} r="2.6" fill="#9C6B43" />
            <circle cx={tx + 3} cy={ty + 3.5} r="2.6" fill="#9C6B43" />
        </>
    );
}

function DesertRocks({ t }: { t: MapTree }) {
    const { r } = t;
    return (
        <>
            <Shadow r={r} />
            <ellipse cx={r1(-r * 0.25)} cy={r1(r * 0.55)} rx={r1(r * 0.72)} ry={r1(r * 0.52)} fill="#DDB98F" />
            <ellipse cx={r1(-r * 0.45)} cy={r1(r * 0.38)} rx={r1(r * 0.3)} ry={r1(r * 0.16)} fill="#EED3AE" />
            <ellipse cx={r1(r * 0.5)} cy={r1(r * 0.85)} rx={r1(r * 0.45)} ry={r1(r * 0.32)} fill="#CFA77A" />
        </>
    );
}

function SmallPyramid({ t }: { t: MapTree }) {
    const { r } = t;
    const base = r + 5;
    const half = r1(r * 1.25);
    const apex = r1(base - r * 1.55);
    return (
        <>
            <ellipse cx="0" cy={base + 1} rx={half + 4} ry="4" fill="#000" opacity="0.07" />
            <path d={`M0 ${apex} L${-half} ${base} L${r1(half * 0.2)} ${base} Z`} fill="#F2D394" />
            <path d={`M0 ${apex} L${r1(half * 0.2)} ${base} L${half} ${base} Z`} fill="#DDAE6C" />
            <path d={`M0 ${apex} l-3.5 5.5 h7 Z`} fill="#F5B83D" />
        </>
    );
}

function OasisPond({ t }: { t: MapTree }) {
    const { r } = t;
    return (
        <>
            <ellipse cx="0" cy={r1(r * 0.6)} rx={r1(r * 1.1)} ry={r1(r * 0.55)} fill="#CFE3A4" />
            <ellipse cx="0" cy={r1(r * 0.62)} rx={r1(r * 0.85)} ry={r1(r * 0.38)} fill="#8FD8D0" />
            <path d={`M${r1(-r * 0.4)} ${r1(r * 0.55)} h${r1(r * 0.35)}`} stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
            <g transform={`translate(${r1(r * 0.8)} ${r1(r * 0.3)})`} stroke="#86BE6E" strokeWidth="2.5" strokeLinecap="round" fill="none">
                <path d="M0 4 L-4 -8" />
                <path d="M0 4 L1 -11" />
                <path d="M0 4 L5 -6" />
            </g>
        </>
    );
}

function Boulders({ t }: { t: MapTree }) {
    const { r } = t;
    return (
        <>
            <Shadow r={r} />
            <ellipse cx="0" cy={r1(r * 0.45)} rx={r1(r * 0.85)} ry={r1(r * 0.68)} fill="#9C8073" />
            <ellipse cx={r1(-r * 0.3)} cy={r1(r * 0.18)} rx={r1(r * 0.34)} ry={r1(r * 0.2)} fill="#B39A8D" />
            <ellipse cx={r1(r * 0.78)} cy={r1(r * 0.9)} rx={r1(r * 0.36)} ry={r1(r * 0.27)} fill="#8C7469" />
        </>
    );
}

function LavaPool({ t, calm }: { t: MapTree; calm: boolean }) {
    const { r } = t;
    const cy = r1(r * 0.55);
    return (
        <>
            <g opacity="0.2"><ellipse cx="0" cy={cy} rx={r1(r * 1.5)} ry={r1(r * 0.9)} fill="#FFB04A" className={moving(calm, "bmw-pulse")} /></g>
            <ellipse cx="0" cy={cy} rx={r1(r * 1.12)} ry={r1(r * 0.6)} fill="#A88A7C" />
            <ellipse cx="0" cy={cy} rx={r1(r * 0.9)} ry={r1(r * 0.44)} fill="#FFA94D" />
            <ellipse cx={r1(-r * 0.1)} cy={cy - 1} rx={r1(r * 0.55)} ry={r1(r * 0.22)} fill="#FFD77E" className={moving(calm, "bmw-pulse")} />
            <circle cx={r1(r * 0.42)} cy={cy + 1} r="2.2" fill="#FFE7A3" />
        </>
    );
}

function GlowCrack({ t, calm }: { t: MapTree; calm: boolean }) {
    const { r } = t;
    const d = `M${r1(-r)} ${r1(r * 0.35)} L${r1(-r * 0.4)} ${r1(r * 0.1)} L${r1(-r * 0.05)} ${r1(r * 0.55)} L${r1(r * 0.45)} ${r1(r * 0.2)} L${r1(r)} ${r1(r * 0.6)}`;
    return (
        <>
            <g opacity="0.22"><path d={d} fill="none" stroke="#FFB04A" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" className={moving(calm, "bmw-pulse")} /></g>
            <path d={d} fill="none" stroke="#A88A7C" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke="#FFC15E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </>
    );
}

/** Topli žbun sa narandžastim cvetovima (vulkan nije pust ni strašan) */
function FireFlowers({ t }: { t: MapTree }) {
    const { r } = t;
    const flowers = [
        { x: -r * 0.45, y: -r * 0.05, c: "#FF9F43" },
        { x: r * 0.35, y: -r * 0.3, c: "#FFB84D" },
        { x: r * 0.1, y: r * 0.25, c: "#FF9F43" },
    ];
    return (
        <>
            <Shadow r={r} />
            <ellipse cx={r1(-r * 0.35)} cy={r1(r * 0.5)} rx={r1(r * 0.55)} ry={r1(r * 0.42)} fill="#9DB46A" />
            <ellipse cx={r1(r * 0.35)} cy={r1(r * 0.45)} rx={r1(r * 0.6)} ry={r1(r * 0.45)} fill="#8DA65E" />
            <ellipse cx="0" cy={r1(r * 0.2)} rx={r1(r * 0.55)} ry={r1(r * 0.45)} fill="#A9C077" />
            {flowers.map((f, i) => (
                <g key={i} transform={`translate(${r1(f.x)} ${r1(f.y)})`}>
                    {[0, 72, 144, 216, 288].map((a) => (
                        <circle key={a} cx="0" cy="-3.2" r="2.6" fill={f.c} transform={`rotate(${a})`} />
                    ))}
                    <circle r="2" fill="#FFE08A" />
                </g>
            ))}
        </>
    );
}

function MiniCone({ t }: { t: MapTree }) {
    const { r } = t;
    const base = r + 5;
    const top = r1(base - r * 1.4);
    const half = r1(r * 1.1);
    return (
        <>
            <ellipse cx="0" cy={base + 1} rx={half + 3} ry="4" fill="#000" opacity="0.07" />
            <path d={`M${-half} ${base} L${r1(-r * 0.35)} ${top} H${r1(r * 0.35)} L${half} ${base} Z`} fill="#C89580" />
            <path d={`M${r1(r * 0.1)} ${top} H${r1(r * 0.35)} L${half} ${base} H${r1(r * 0.3)} Z`} fill="#B7836E" />
            <ellipse cx="0" cy={top} rx={r1(r * 0.36)} ry="3" fill="#FFB04A" />
            <circle cx="2" cy={top - 9} r="5" fill="#FBF3EE" stroke="#EAD8CD" strokeWidth="1.2" />
        </>
    );
}

function SnowPine({ t }: { t: MapTree }) {
    const { r } = t;
    const green = PINE[t.tone];
    const tiers = [0, 1, 2].map((j) => {
        const bottom = r * 0.95 - j * r * 0.62;
        const h = r * 0.95;
        const hw = r * (1 - j * 0.22);
        return { bottom: r1(bottom), top: r1(bottom - h), hw: r1(hw), h };
    });
    return (
        <>
            <Shadow r={r} />
            <rect x="-2.5" y={r1(r * 0.85)} width="5" height={r1(r * 0.3)} rx="1.5" fill="#A97E52" />
            {tiers.map((tier, j) => {
                const capY = r1(tier.top + tier.h * 0.4);
                const capW = r1(tier.hw * 0.42);
                return (
                    <g key={j}>
                        <path d={`M0 ${tier.top} L${-tier.hw} ${tier.bottom} Q0 ${tier.bottom + 4} ${tier.hw} ${tier.bottom} Z`} fill={green} />
                        <path d={`M0 ${tier.top} L${-capW} ${capY} q${r1(capW / 2)} 4 ${capW} 0 q${r1(capW / 2)} 4 ${capW} 0 Z`} fill="#FFFFFF" />
                    </g>
                );
            })}
        </>
    );
}

function Crystals({ t }: { t: MapTree }) {
    const { r } = t;
    const crystal = (h: number, w: number, a: number, dx: number) => {
        const d = `M0 ${-h} L${w} ${-h + w * 1.3} L${w} 0 L0 ${w * 0.7} L${-w} 0 L${-w} ${-h + w * 1.3} Z`;
        const face = `M0 ${-h} L${-w} ${-h + w * 1.3} L${-w} 0 L0 ${w * 0.7} Z`;
        return (
            <g transform={`translate(${r1(dx)} ${r1(r + 2)}) rotate(${a})`}>
                <path d={d} fill="#C9ECFB" stroke="#8FCDEE" strokeWidth="1.5" strokeLinejoin="round" />
                <path d={face} fill="#FFFFFF" opacity="0.6" />
            </g>
        );
    };
    return (
        <>
            <Shadow r={r} />
            {crystal(r * 1.1, r * 0.3, -22, -r * 0.45)}
            {crystal(r * 0.95, r * 0.26, 24, r * 0.5)}
            {crystal(r * 1.6, r * 0.36, 0, 0)}
        </>
    );
}

function Snowman({ t }: { t: MapTree }) {
    const { r } = t;
    const scarf = ["#F47C9C", "#FFB13B", "#7C8CF5"][t.tone];
    return (
        <>
            <Shadow r={r} />
            <path d={`M${r1(-r * 0.4)} ${r1(-r * 0.15)} l${r1(-r * 0.5)} ${r1(-r * 0.3)}`} stroke="#A97E52" strokeWidth="2.2" strokeLinecap="round" />
            <path d={`M${r1(r * 0.4)} ${r1(-r * 0.15)} l${r1(r * 0.5)} ${r1(-r * 0.32)}`} stroke="#A97E52" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="0" cy={r1(r * 0.55)} r={r1(r * 0.6)} fill="#FFFFFF" stroke="#CFE3F2" strokeWidth="1.5" />
            <circle cx="0" cy={r1(-r * 0.22)} r={r1(r * 0.44)} fill="#FFFFFF" stroke="#CFE3F2" strokeWidth="1.5" />
            <circle cx="0" cy={r1(-r * 0.84)} r={r1(r * 0.33)} fill="#FFFFFF" stroke="#CFE3F2" strokeWidth="1.5" />
            <rect x={r1(-r * 0.34)} y={r1(-r * 0.6)} width={r1(r * 0.68)} height="4" rx="2" fill={scarf} />
            <rect x={r1(r * 0.12)} y={r1(-r * 0.6)} width="4" height={r1(r * 0.42)} rx="2" fill={scarf} />
            <path d={`M${r1(-r * 0.3)} ${r1(-r * 0.95)} A${r1(r * 0.3)} ${r1(r * 0.3)} 0 0 1 ${r1(r * 0.3)} ${r1(-r * 0.95)} Z`} fill="#6FB7E3" />
            <circle cx="0" cy={r1(-r * 1.25)} r="2.4" fill="#FFFFFF" stroke="#6FB7E3" strokeWidth="1" />
            <circle cx={r1(-r * 0.12)} cy={r1(-r * 0.86)} r="1.4" fill="#3A4A6B" />
            <circle cx={r1(r * 0.12)} cy={r1(-r * 0.86)} r="1.4" fill="#3A4A6B" />
            <path d={`M0 ${r1(-r * 0.78)} l${r1(r * 0.3)} 1.5 l${r1(-r * 0.3)} 1.5 Z`} fill="#FF9F43" />
            <circle cx="0" cy={r1(-r * 0.1)} r="1.4" fill="#6B7A99" />
            <circle cx="0" cy={r1(r * 0.12)} r="1.4" fill="#6B7A99" />
        </>
    );
}

function SnowMound({ t }: { t: MapTree }) {
    const { r } = t;
    return (
        <>
            <ellipse cx="0" cy={r1(r * 0.75)} rx={r1(r * 1.05)} ry={r1(r * 0.5)} fill="#FFFFFF" stroke="#D3EAF8" strokeWidth="2" />
            <ellipse cx={r1(r * 0.15)} cy={r1(r * 0.9)} rx={r1(r * 0.75)} ry={r1(r * 0.25)} fill="#E7F4FC" />
            <ellipse cx={r1(r * 0.9)} cy={r1(r * 0.95)} rx={r1(r * 0.42)} ry={r1(r * 0.24)} fill="#FFFFFF" stroke="#D3EAF8" strokeWidth="1.5" />
        </>
    );
}

function Igloo({ scale = 1, door = "#5E8FBF" }: { scale?: number; door?: string }) {
    const R = 26;
    // Redovi blokova (vrh kupole je na y = −4)
    const rows = [14, 6, 0];
    return (
        <g transform={`scale(${scale})`}>
            <ellipse cx="0" cy="23" rx="34" ry="5" fill="#000" opacity="0.07" />
            <path d={`M${-R} 22 A${R} ${R} 0 0 1 ${R} 22 Z`} fill="#FFFFFF" stroke="#BFDDF0" strokeWidth="2" />
            {rows.map((ry) => {
                const half = r1(Math.sqrt(R * R - (22 - ry) * (22 - ry)) - 1);
                return <path key={ry} d={`M${-half} ${ry} H${half}`} stroke="#D3E9F7" strokeWidth="1.6" />;
            })}
            {[-16, 16].map((x) => (
                <path key={x} d={`M${x} 14 V22`} stroke="#D3E9F7" strokeWidth="1.6" />
            ))}
            {[-8, 8].map((x) => (
                <path key={x} d={`M${x} 6 V14`} stroke="#D3E9F7" strokeWidth="1.6" />
            ))}
            <path d="M0 0 V6" stroke="#D3E9F7" strokeWidth="1.6" />
            <path d="M-10 22 V12 A10 10 0 0 1 10 12 V22 Z" fill="#FFFFFF" stroke="#BFDDF0" strokeWidth="2" />
            <path d="M-6 22 V13 A6 6 0 0 1 6 13 V22 Z" fill={door} />
        </g>
    );
}

function SmallIgloo({ t }: { t: MapTree }) {
    return (
        <g transform={`translate(0 ${r1(t.r * 0.2)})`}>
            <Igloo scale={r1(t.r / 22)} />
        </g>
    );
}

// ── Most ──────────────────────────────────────────────────────────────────────

/** Most preko reke, položen duž puta (crta se preko puta, na `layout.river.cross`) */
export function WorldBridge({ world, x, y, angle }: { world: WorldId; x: number; y: number; angle: number }): JSX.Element {
    const at = `translate(${x} ${y}) rotate(${angle})`;
    if (world === "meadow") {
        return (
            <g transform={at}>
                <rect x="-40" y="-20" width="80" height="40" rx="8" fill="#C99A6B" />
                {[-28, -16, -4, 8, 20].map((px) => (
                    <rect key={px} x={px} y="-18" width="8" height="36" rx="2" fill="#DDB384" />
                ))}
                <rect x="-42" y="-24" width="84" height="6" rx="3" fill="#9C6B43" />
                <rect x="-42" y="18" width="84" height="6" rx="3" fill="#9C6B43" />
            </g>
        );
    }
    // Kameni (pustinja, vulkan) ili ledeni most: blokovi + ograde sa stubićima
    const look = {
        desert: { deck: "#E3C08A", block: "#EDD1A2", line: "#CFA56C", rail: "#C29560", post: "#B08350", glow: null as string | null, snow: false },
        volcano: { deck: "#A99487", block: "#BDAA9E", line: "#8E796E", rail: "#7D665B", post: "#6E5A52", glow: "#FFB04A", snow: false },
        ice: { deck: "#CBEAFB", block: "#E4F5FE", line: "#9FD3F0", rail: "#9FD3F0", post: "#7CC0E8", glow: null, snow: true },
    }[world];
    return (
        <g transform={at}>
            {look.glow && <rect x="-50" y="-30" width="100" height="60" rx="18" fill={look.glow} opacity="0.25" />}
            <rect x="-42" y="-20" width="84" height="40" rx="8" fill={look.deck} />
            {[-34, -12, 10].map((px, i) => (
                <g key={px}>
                    <rect x={px} y="-17" width="20" height="16" rx="3" fill={look.block} />
                    <rect x={px + (i === 2 ? -11 : 11)} y="1" width="20" height="16" rx="3" fill={look.block} />
                </g>
            ))}
            <rect x="-44" y="-25" width="88" height="7" rx="3.5" fill={look.rail} />
            <rect x="-44" y="18" width="88" height="7" rx="3.5" fill={look.rail} />
            {look.snow && (
                <>
                    <rect x="-42" y="-27" width="84" height="3.5" rx="1.75" fill="#FFFFFF" />
                    <rect x="-42" y="16" width="84" height="3.5" rx="1.75" fill="#FFFFFF" />
                </>
            )}
            {[-40, 0, 40].map((px) => (
                <g key={px}>
                    <circle cx={px} cy="-21.5" r="5" fill={look.post} />
                    <circle cx={px} cy="21.5" r="5" fill={look.post} />
                </g>
            ))}
        </g>
    );
}

// ── Početak puta ──────────────────────────────────────────────────────────────

const FLAG: Record<WorldId, string> = { meadow: "#22A06B", desert: "#E08A1E", volcano: "#F28C38", ice: "#F47C9C" };

function StartFlag({ world }: { world: WorldId }) {
    return (
        <>
            <rect x="-1.5" y="-26" width="3" height="30" rx="1.5" fill="#8C6A4F" />
            <path d="M1.5 -26 L22 -20 L1.5 -13 Z" fill={FLAG[world]} />
        </>
    );
}

function House({ x, y, roof, scale = 1 }: { x: number; y: number; roof: string; scale?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <ellipse cx="0" cy="22" rx="30" ry="5" fill="#000" opacity="0.07" />
            <rect x="-22" y="-6" width="44" height="28" rx="3" fill="#FFF4E0" stroke="#EAD7B7" strokeWidth="1.5" />
            <path d="M-28 -4 L0 -28 L28 -4 Z" fill={roof} />
            <rect x="-6" y="6" width="12" height="16" rx="2" fill="#B08968" />
            <rect x="-17" y="2" width="8" height="8" rx="1.5" fill="#BFE3F5" />
            <rect x="9" y="2" width="8" height="8" rx="1.5" fill="#BFE3F5" />
        </g>
    );
}

function Tent({ x, y, color, stripe, scale = 1 }: { x: number; y: number; color: string; stripe: string; scale?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <ellipse cx="0" cy="22" rx="32" ry="5" fill="#000" opacity="0.07" />
            <path d="M-30 22 Q-14 -2 0 -26 Q14 -2 30 22 Z" fill={color} />
            <path d="M-11 22 Q-5 -2 0 -26 Q5 -2 11 22 Z" fill={stripe} />
            <path d="M-8 22 Q-3 10 0 4 Q3 10 8 22 Z" fill="#8A5A3A" opacity="0.85" />
            <path d="M0 -26 V-34" stroke="#8C6A4F" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M1 -34 L9 -31.5 L1 -29 Z" fill={stripe} />
        </g>
    );
}

function StoneHut({ x, y, roof, scale = 1 }: { x: number; y: number; roof: string; scale?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <ellipse cx="0" cy="22" rx="30" ry="5" fill="#000" opacity="0.07" />
            <rect x="12" y="-24" width="7" height="14" rx="2" fill="#A89385" />
            <rect x="-22" y="-6" width="44" height="28" rx="10" fill="#CDB8AB" stroke="#AE998B" strokeWidth="1.5" />
            <g fill="#DCCABE">
                <ellipse cx="-14" cy="2" rx="4.5" ry="3" />
                <ellipse cx="13" cy="12" rx="5" ry="3" />
                <ellipse cx="-12" cy="15" rx="4" ry="2.6" />
            </g>
            <path d="M-29 -1 Q-14 -16 0 -34 Q14 -16 29 -1 Q0 4 -29 -1 Z" fill={roof} />
            <path d="M-19 -9 Q0 -5 19 -9 M-11 -19 Q0 -16 11 -19" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.4" />
            <path d="M-6 22 V10 A6 6 0 0 1 6 10 V22 Z" fill="#8E5638" />
            <circle cx="13" cy="2" r="4" fill="#FFD98A" />
        </g>
    );
}

/** Početak puta na `layout.start`: selo, šatori, kamene kućice ili iglui */
export function WorldStart({ world, x, y }: { world: WorldId; x: number; y: number }): JSX.Element {
    const flag = (
        <g transform={`translate(${x + 30} ${y + 34})`}>
            <StartFlag world={world} />
        </g>
    );
    if (world === "meadow") {
        return (
            <g>
                <House x={x - 64} y={y + 4} roof="#E98B6D" scale={0.9} />
                <House x={x + 2} y={y - 10} roof="#8FA7E6" />
                <House x={x + 66} y={y + 8} roof="#F2B45C" scale={0.85} />
                {flag}
            </g>
        );
    }
    if (world === "desert") {
        return (
            <g>
                <Tent x={x - 64} y={y + 4} color="#E98B6D" stripe="#F7C2AE" scale={0.9} />
                <Tent x={x + 2} y={y - 10} color="#5CC2BA" stripe="#A6E3DD" />
                <Tent x={x + 66} y={y + 8} color="#F2B45C" stripe="#F9DCA6" scale={0.85} />
                {flag}
            </g>
        );
    }
    if (world === "volcano") {
        return (
            <g>
                <StoneHut x={x - 64} y={y + 4} roof="#E9A15C" scale={0.9} />
                <StoneHut x={x + 2} y={y - 10} roof="#F0B36A" />
                <StoneHut x={x + 66} y={y + 8} roof="#E39B6B" scale={0.85} />
                {flag}
            </g>
        );
    }
    return (
        <g>
            <g transform={`translate(${x - 64} ${y + 4})`}>
                <Igloo scale={0.9} />
            </g>
            <g transform={`translate(${x + 2} ${y - 10})`}>
                <Igloo door="#4F86BD" />
            </g>
            <g transform={`translate(${x + 66} ${y + 8})`}>
                <Igloo scale={0.85} />
            </g>
            {flag}
        </g>
    );
}

// ── Kapija na kraju sveta ─────────────────────────────────────────────────────

export type GateState = "locked" | "key" | "open";

interface GateLook {
    frame: string;
    frameDark: string;
    frameLight: string;
    door: string;
    doorLight: string;
    doorDark: string;
}

const GATE: Record<WorldId, GateLook> = {
    meadow: { frame: "#7DBE7E", frameDark: "#5FA868", frameLight: "#A3D6A0", door: "#C99A6B", doorLight: "#DDB384", doorDark: "#9C6B43" },
    desert: { frame: "#EBC98A", frameDark: "#CFA466", frameLight: "#F7E2B5", door: "#4FA9C9", doorLight: "#7CC3DC", doorDark: "#2F86A8" },
    volcano: { frame: "#8C7469", frameDark: "#6E5A52", frameLight: "#A68B7E", door: "#C47F55", doorLight: "#D9996E", doorDark: "#8E5638" },
    ice: { frame: "#CDEEFF", frameDark: "#8FCBEA", frameLight: "#FFFFFF", door: "#E3F4FE", doorLight: "#FFFFFF", doorDark: "#A9D6F0" },
};

/** Otvor kapije (lučni), dno na y = 44 */
const DOORWAY = "M-30 44 V-20 A30 30 0 0 1 30 -20 V44 Z";

/** Veliki zlatni katanac sa ključaonicom; `glow` — ključaonica sija (ključ je spreman) */
function Padlock({ x, y, scale = 1, glow = false, calm }: { x: number; y: number; scale?: number; glow?: boolean; calm: boolean }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <path d="M-10 -6 V-13 A10 10 0 0 1 10 -13 V-6" fill="none" stroke="#8E9AAE" strokeWidth="6" strokeLinecap="round" />
            <path d="M-10 -8 V-13 A10 10 0 0 1 -2 -22.5" fill="none" stroke="#C5CEDB" strokeWidth="2" strokeLinecap="round" />
            <rect x="-17" y="-8" width="34" height="27" rx="7" fill="#F7BE3B" stroke="#D99A1E" strokeWidth="2" />
            <rect x="-12.5" y="-4.5" width="6" height="19" rx="3" fill="#FFE08A" opacity="0.85" />
            {glow && (
                <g opacity="0.75">
                    <circle cx="0" cy="6" r="9" fill="#FFF6C2" className={moving(calm, "bmw-pulse")} />
                </g>
            )}
            {/* Ključaonica: tamna, a kad je ključ spreman — svetla, da „čeka” ključ */}
            <path d="M0 -1 A4 4 0 0 1 2.6 6 L3.2 12 H-3.2 L-2.6 6 A4 4 0 0 1 0 -1 Z" fill={glow ? "#FFFFFF" : "#8A5A12"} stroke={glow ? "#E5A01E" : "none"} strokeWidth="1.3" strokeLinejoin="round" />
        </g>
    );
}

/** Zlatni ključ koji lebdi spreman pored katanca */
function FloatingKey({ x, y, calm }: { x: number; y: number; calm: boolean }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <g className={moving(calm, "bmw-bob")}>
                <g opacity="0.9">
                    <circle r="21" fill="#FFF4BA" stroke="#FFFFFF" strokeWidth="2" className={moving(calm, "bmw-pulse")} />
                </g>
                <g transform="rotate(-35)">
                    <circle cx="-11" cy="0" r="8" fill="none" stroke="#F5B83D" strokeWidth="5.5" />
                    <circle cx="-11" cy="0" r="8" fill="none" stroke="#C98510" strokeWidth="1.2" opacity="0.6" />
                    <rect x="-4" y="-2.8" width="24" height="5.6" rx="2.8" fill="#F5B83D" stroke="#C98510" strokeWidth="1.2" />
                    <rect x="12" y="1.5" width="4.5" height="7" rx="1.2" fill="#F5B83D" stroke="#C98510" strokeWidth="1.2" />
                    <rect x="5.5" y="1.5" width="3.5" height="5.5" rx="1" fill="#F5B83D" stroke="#C98510" strokeWidth="1.2" />
                    <circle cx="-13.5" cy="-3" r="1.8" fill="#FFF3B0" />
                </g>
            </g>
            <Sparkle x={-18} y={-16} s={5} fill="#FFD34F" calm={calm} />
            <Sparkle x={19} y={-14} s={4} fill="#FFD34F" calm={calm} delay={0.9} />
            <Sparkle x={16} y={18} s={3.5} fill="#FFD34F" calm={calm} delay={1.7} />
        </g>
    );
}

/** Svetle zrake iza otvorene kapije */
function Rays({ cx, cy, length, calm }: { cx: number; cy: number; length: number; calm: boolean }) {
    return (
        <g transform={`translate(${cx} ${cy})`} className={moving(calm, "bmw-pulse")}>
            {[-72, -48, -24, 0, 24, 48, 72].map((a) => (
                <path key={a} d={`M0 0 L-8 ${-length} Q0 ${-length - 6} 8 ${-length} Z`} fill="#FFE58A" opacity="0.5" transform={`rotate(${a})`} />
            ))}
        </g>
    );
}

/** Mali znak sledećeg sveta, vidi se kroz otvorenu kapiju */
function NextSign({ world }: { world: WorldId }) {
    if (world === "desert") {
        return (
            <g>
                <path d="M-4 4 H-8 V-2 M4 1 H8 V-5" fill="none" stroke="#7FBF7A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="-2.5" y="-10" width="5" height="16" rx="2.5" fill="#7FBF7A" />
            </g>
        );
    }
    if (world === "volcano") {
        return (
            <g>
                <path d="M-13 6 L-4 -8 H4 L13 6 Z" fill="#C89580" />
                <ellipse cx="0" cy="-8" rx="4" ry="1.6" fill="#FFB04A" />
                <circle cx="1" cy="-14" r="3.5" fill="#FBF3EE" />
            </g>
        );
    }
    if (world === "ice") {
        return (
            <g>
                <path d="M0 -12 L-14 6 H14 Z" fill="#B5DCF2" />
                <path d="M0 -12 L-5.5 -5 q2.7 2 5.5 0 q2.7 2 5.5 0 Z" fill="#FFFFFF" />
            </g>
        );
    }
    return null;
}

/** Ukrasi okvira kapije po svetu */
function GateOrnaments({ world, look, calm }: { world: WorldId; look: GateLook; calm: boolean }) {
    if (world === "meadow") {
        // Živa ograda: listići po luku, okrugli žbunovi na stubovima, cvetići
        const bumps = [200, 225, 250, 275, 300, 325, 350].map((a) => ({ x: r1(40 * Math.cos((a * Math.PI) / 180)), y: r1(-20 + 40 * Math.sin((a * Math.PI) / 180)) }));
        const flowers = [
            { x: -26, y: -46, c: "#F59FB5" },
            { x: 20, y: -52, c: "#FFFFFF" },
            { x: -53, y: -26, c: "#FFFFFF" },
            { x: 53, y: 2, c: "#F59FB5" },
            { x: -53, y: 24, c: "#FFD66B" },
            { x: 36, y: -30, c: "#FFD66B" },
        ];
        return (
            <g>
                {bumps.map((b, i) => (
                    <circle key={i} cx={b.x} cy={b.y} r="8" fill={look.frame} />
                ))}
                {[-53, 53].map((cx) => (
                    <g key={cx}>
                        <circle cx={cx} cy="-70" r="14" fill={look.frame} stroke={look.frameDark} strokeWidth="2" />
                        <circle cx={cx - 4} cy="-74" r="6" fill={look.frameLight} />
                    </g>
                ))}
                {flowers.map((f, i) => (
                    <g key={i} transform={`translate(${f.x} ${f.y})`}>
                        {[0, 72, 144, 216, 288].map((a) => (
                            <circle key={a} cx="0" cy="-3" r="2.6" fill={f.c} transform={`rotate(${a})`} />
                        ))}
                        <circle r="1.9" fill={f.c === "#FFD66B" ? "#F59FB5" : "#FFD66B"} />
                    </g>
                ))}
            </g>
        );
    }
    if (world === "desert") {
        // Peščar: redovi blokova, tirkizne pločice po luku, piramidice i sunce
        return (
            <g>
                {[-36, -16, 4, 24].map((y) => (
                    <g key={y} stroke={look.frameDark} strokeWidth="1.5" opacity="0.5">
                        <path d={`M-66 ${y} H-40`} />
                        <path d={`M40 ${y} H66`} />
                    </g>
                ))}
                <path d="M-35 -20 A35 35 0 0 1 35 -20" fill="none" stroke="#5CC2BA" strokeWidth="6" strokeDasharray="8 3" />
                {[-53, 53].map((cx) => (
                    <g key={cx}>
                        <path d={`M${cx} -88 L${cx - 15} -64 H${cx + 3} Z`} fill="#F2D394" />
                        <path d={`M${cx} -88 L${cx + 3} -64 H${cx + 15} Z`} fill="#DDAE6C" />
                        <path d={`M${cx} -88 l-3.5 5.5 h7 Z`} fill="#F5B83D" />
                    </g>
                ))}
                <g transform="translate(0 -62)">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                        <rect key={a} x="-1.5" y="-15" width="3" height="6" rx="1.5" fill="#F5B83D" transform={`rotate(${a})`} />
                    ))}
                    <circle r="9" fill="#F5B83D" stroke="#E5A01E" strokeWidth="1.5" />
                    <circle cx="-2.5" cy="-2.5" r="3" fill="#FFE08A" />
                </g>
            </g>
        );
    }
    if (world === "volcano") {
        // Topao kamen: pukotinice koje meko sijaju, narandžasti dragulji
        const gem = (x: number, y: number, s: number) => (
            <g transform={`translate(${x} ${y}) scale(${s})`}>
                <g opacity="0.45"><circle r="13" fill="#FFC56B" className={moving(calm, "bmw-pulse")} /></g>
                <path d="M0 -9 L8 0 L0 9 L-8 0 Z" fill="#FFB04A" stroke="#E8892E" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M0 -9 L-8 0 L0 0 Z" fill="#FFD77E" />
            </g>
        );
        return (
            <g>
                <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M-58 -36 L-52 -28 L-56 -18 L-50 -10" stroke="#FFC15E" strokeWidth="2.4" />
                    <path d="M50 12 L55 20 L51 28 L56 34" stroke="#FFC15E" strokeWidth="2.4" />
                    <g opacity="0.25"><path d="M-58 -36 L-52 -28 L-56 -18 L-50 -10" stroke="#FFB04A" strokeWidth="7" className={moving(calm, "bmw-pulse")} /></g>
                    <g opacity="0.25"><path d="M50 12 L55 20 L51 28 L56 34" stroke="#FFB04A" strokeWidth="7" className={moving(calm, "bmw-pulse")} /></g>
                </g>
                {[-53, 53].map((cx) => (
                    <g key={cx}>
                        <ellipse cx={cx} cy="-68" rx="15" ry="9" fill={look.frameDark} />
                        <ellipse cx={cx - 4} cy="-71" rx="6" ry="3" fill={look.frameLight} />
                        {gem(cx, -80, 0.8)}
                    </g>
                ))}
                {gem(0, -60, 1)}
            </g>
        );
    }
    // Led: sneg na vrhu, ledenice ispod luka, kristali na stubovima
    const icicles = [215, 240, 300, 325].map((a) => ({ x: r1(30 * Math.cos((a * Math.PI) / 180)), y: r1(-20 + 30 * Math.sin((a * Math.PI) / 180)) }));
    return (
        <g>
            {[-61, 45].map((x) => (
                <rect key={x} x={x} y="-50" width="4" height="86" rx="2" fill="#FFFFFF" opacity="0.8" />
            ))}
            <path d="M-39 -22 A39 39 0 0 1 39 -22" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
            {[-53, 53].map((cx) => (
                <g key={cx}>
                    <ellipse cx={cx} cy="-64" rx="19" ry="6" fill="#FFFFFF" />
                    <g transform={`translate(${cx} -66)`}>
                        <path d="M0 -24 L6 -14 L6 0 L0 4 L-6 0 L-6 -14 Z" fill="#C9ECFB" stroke="#8FCDEE" strokeWidth="1.5" strokeLinejoin="round" />
                        <path d="M0 -24 L-6 -14 L-6 0 L0 4 Z" fill="#FFFFFF" opacity="0.6" />
                    </g>
                </g>
            ))}
            {icicles.map((p, i) => (
                <path key={i} d={`M${p.x - 3.5} ${p.y} L${p.x} ${p.y + 9} L${p.x + 3.5} ${p.y} Z`} fill="#E3F4FE" stroke="#8FCBEA" strokeWidth="1.2" strokeLinejoin="round" />
            ))}
            <Sparkle x={-30} y={-70} s={5} fill="#8FCDEE" calm={calm} />
            <Sparkle x={34} y={-76} s={4} fill="#8FCDEE" calm={calm} delay={1.4} />
        </g>
    );
}

/**
 * Kraj sveta na `layout.end`: kapija sa velikim katancem.
 *   locked — vrata zatvorena, katanac;
 *   key    — zlatni ključ lebdi spreman pored katanca (zvezdice su skupljene);
 *   open   — vrata otvorena, katanca nema, svetla staza vodi kroz kapiju ka sledećem svetu.
 * `final` (poslednji svet): umesto kapije dvorac sa kovčegom blaga, ista tri stanja.
 */
export function WorldGate({ world, x, y, state, final = false, calm }: { world: WorldId; x: number; y: number; state: GateState; final?: boolean; calm: boolean }): JSX.Element {
    const uid = useSafeId();
    if (final) return <FinalCastle uid={uid} world={world} x={x} y={y} state={state} calm={calm} />;
    const look = GATE[world];
    const next = nextWorld(world);
    const open = state === "open";

    return (
        <g transform={`translate(${x} ${y})`}>
            <defs>
                <clipPath id={`${uid}-door`}>
                    <path d={DOORWAY} />
                </clipPath>
                <linearGradient id={`${uid}-light`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#FFFBEA" />
                    <stop offset="1" stopColor="#FFE9A6" />
                </linearGradient>
            </defs>
            <style>{WORLD_STYLE}</style>
            <ellipse cx="0" cy="47" rx="80" ry="10" fill="#000" opacity="0.07" />
            {open && <Rays cx={0} cy={-6} length={100} calm={calm} />}

            {/* Otvor: tamna vrata ili pogled na sledeći svet */}
            {open ? (
                <g clipPath={`url(#${uid}-door)`}>
                    <rect x="-30" y="-52" width="60" height="98" fill={`url(#${uid}-light)`} />
                    {next && <ellipse cx="0" cy="22" rx="52" ry="22" fill={next.colors.groundDeep} />}
                    {next && (
                        <g transform="translate(15 6) scale(0.8)">
                            <NextSign world={next.id} />
                        </g>
                    )}
                    <path d="M-15 46 L-3 4 H3 L15 46 Z" fill="#FFE58A" />
                    <path d="M0 8 V44" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
                    <g opacity="0.4"><path d={DOORWAY} fill="#FFF7C8" className={moving(calm, "bmw-pulse")} /></g>
                </g>
            ) : (
                <path d={DOORWAY} fill={look.doorDark} />
            )}

            {/* Stubovi i luk */}
            <rect x="-66" y="-56" width="26" height="100" rx="4" fill={look.frame} stroke={look.frameDark} strokeWidth="2" />
            <rect x="40" y="-56" width="26" height="100" rx="4" fill={look.frame} stroke={look.frameDark} strokeWidth="2" />
            <path d="M-40 44 V-20 A40 40 0 0 1 40 -20 V44 H30 V-20 A30 30 0 0 0 -30 -20 V44 Z" fill={look.frame} stroke={look.frameDark} strokeWidth="2" strokeLinejoin="round" />
            {world !== "meadow" && (
                <>
                    <rect x="-70" y="-64" width="34" height="10" rx="4" fill={look.frameLight} stroke={look.frameDark} strokeWidth="2" />
                    <rect x="36" y="-64" width="34" height="10" rx="4" fill={look.frameLight} stroke={look.frameDark} strokeWidth="2" />
                </>
            )}
            <GateOrnaments world={world} look={look} calm={calm} />

            {open ? <OpenDoors look={look} /> : <ClosedDoors uid={uid} look={look} />}
            {!open && <Padlock x={0} y={6} scale={1.15} glow={state === "key"} calm={calm} />}
            {state === "key" && <FloatingKey x={34} y={-28} calm={calm} />}
        </g>
    );
}

function ClosedDoors({ uid, look }: { uid: string; look: GateLook }) {
    return (
        <g>
            <path d={DOORWAY} fill={look.door} stroke={look.doorDark} strokeWidth="2" />
            <g clipPath={`url(#${uid}-door)`}>
                {[-20, -10, 10, 20].map((px) => (
                    <path key={px} d={`M${px} -52 V44`} stroke={look.doorLight} strokeWidth="3" opacity="0.7" />
                ))}
                <rect x="-31" y="-10" width="62" height="5" fill={look.doorDark} opacity="0.75" />
                <rect x="-31" y="28" width="62" height="5" fill={look.doorDark} opacity="0.75" />
            </g>
            <path d="M0 -50 V44" stroke={look.doorDark} strokeWidth="2" />
        </g>
    );
}

function OpenDoors({ look }: { look: GateLook }) {
    // Krila otvorena ka nama: šarka uz otvor, slobodna ivica dalje i niže
    const leaf = (dir: 1 | -1) => {
        const hx = 30 * dir;
        const fx = 52 * dir;
        const lines = [0.35, 0.68].map((f) => {
            const lx = r1(hx + (fx - hx) * f);
            return <path key={f} d={`M${lx} ${r1(-24 - 7 * f)} V${r1(44 + 9 * f)}`} stroke={look.doorLight} strokeWidth="2.5" opacity="0.7" />;
        });
        return (
            <g>
                <path d={`M${hx} -24 V44 L${fx} 53 V-31 Z`} fill={look.door} stroke={look.doorDark} strokeWidth="2" strokeLinejoin="round" />
                {lines}
            </g>
        );
    };
    return (
        <g>
            {leaf(-1)}
            {leaf(1)}
        </g>
    );
}

// ── Dvorac sa blagom (poslednji svet) ─────────────────────────────────────────

const CASTLE: Record<WorldId, { wall: string; wallStroke: string; tower: string; towerStroke: string; roof: string; roofMain: string; window: string; flag: string; snow: boolean }> = {
    meadow: { wall: "#EDE9FA", wallStroke: "#D7D0F2", tower: "#E4DEF8", towerStroke: "#D0C8F0", roof: "#8A82F7", roofMain: "#6C61F0", window: "#BFE3F5", flag: "#FFB920", snow: false },
    desert: { wall: "#F6E3BC", wallStroke: "#E0C08A", tower: "#F1D9A8", towerStroke: "#DDB97E", roof: "#E9A15C", roofMain: "#DD8A3E", window: "#9FDCD6", flag: "#5CC2BA", snow: false },
    volcano: { wall: "#DCC7BB", wallStroke: "#BFA698", tower: "#D2BAAC", towerStroke: "#B89C8D", roof: "#F4A04E", roofMain: "#EE8A3A", window: "#FFD98A", flag: "#FFD166", snow: false },
    ice: { wall: "#F2FAFF", wallStroke: "#BFE0F4", tower: "#E3F3FD", towerStroke: "#A9D6F0", roof: "#7CC4F0", roofMain: "#4FA8E0", window: "#A9DCF7", flag: "#F47C9C", snow: true },
};

function FinalCastle({ uid, world, x, y, state, calm }: { uid: string; world: WorldId; x: number; y: number; state: GateState; calm: boolean }) {
    const c = CASTLE[world];
    const open = state === "open";
    const door = "M-14 62 L-14 36 Q0 20 14 36 L14 62 Z";
    const snowCap = (apexX: number, apexY: number, half: number) => (
        <path d={`M${apexX} ${apexY} L${apexX - half} ${apexY + half * 1.3} q${half / 2} 3 ${half} 0 q${half / 2} 3 ${half} 0 Z`} fill="#FFFFFF" />
    );
    return (
        <g>
            <defs>
                <linearGradient id={`${uid}-light`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#FFFBEA" />
                    <stop offset="1" stopColor="#FFE58A" />
                </linearGradient>
            </defs>
            <style>{WORLD_STYLE}</style>
            <g transform={`translate(${x} ${y - 20})`}>
                {open && <Rays cx={0} cy={-10} length={118} calm={calm} />}
                <ellipse cx="0" cy="62" rx="86" ry="10" fill="#000" opacity="0.07" />
                {/* Zidine */}
                <rect x="-58" y="0" width="116" height="62" rx="4" fill={c.wall} stroke={c.wallStroke} strokeWidth="2" />
                {[-52, -30, -8, 14, 36].map((cx) => (
                    <rect key={cx} x={cx} y="-10" width="14" height="12" rx="2" fill={c.wall} stroke={c.wallStroke} strokeWidth="2" />
                ))}
                {/* Kule */}
                {[-66, 46].map((tx) => (
                    <g key={tx}>
                        <rect x={tx} y="-22" width="20" height="84" rx="3" fill={c.tower} stroke={c.towerStroke} strokeWidth="2" />
                        <path d={`M${tx - 4} -22 L${tx + 10} -52 L${tx + 24} -22 Z`} fill={c.roof} />
                        {c.snow && snowCap(tx + 10, -52, 6)}
                        <rect x={tx + 7} y="-6" width="6" height="10" rx="3" fill={c.window} />
                    </g>
                ))}
                <rect x="-14" y="-40" width="28" height="44" rx="3" fill={c.tower} stroke={c.towerStroke} strokeWidth="2" />
                <path d="M-19 -40 L0 -74 L19 -40 Z" fill={c.roofMain} />
                {c.snow && snowCap(0, -74, 7)}
                <rect x="-1.5" y="-96" width="3" height="24" fill="#8C6A4F" />
                <path d="M1.5 -96 L22 -90 L1.5 -83 Z" fill={c.flag} />
                <rect x="-6" y="-26" width="12" height="12" rx="6" fill={c.window} />
                {c.snow && (
                    <g fill="#E3F4FE" stroke={c.towerStroke} strokeWidth="1.2" strokeLinejoin="round">
                        {[-44, -24, 24, 44].map((ix) => (
                            <path key={ix} d={`M${ix - 3} 0 L${ix} 8 L${ix + 3} 0 Z`} />
                        ))}
                    </g>
                )}
                {/* Kapija dvorca */}
                {open ? (
                    <>
                        <path d={door} fill={`url(#${uid}-light)`} />
                        <g opacity="0.5"><path d={door} fill="#FFF7C8" className={moving(calm, "bmw-pulse")} /></g>
                    </>
                ) : (
                    <>
                        <path d={door} fill={c.snow ? "#8FC3E6" : "#B08968"} />
                        <path d="M0 26 V62" stroke={c.snow ? "#6FA9D6" : "#8E6A4F"} strokeWidth="1.8" />
                    </>
                )}
            </g>
            <TreasureChest x={x} y={y + 58} state={state} calm={calm} />
        </g>
    );
}

/** Kovčeg blaga ispred dvorca: zaključan katancem, ključ spreman, ili otvoren sa zlatom */
function TreasureChest({ x, y, state, calm }: { x: number; y: number; state: GateState; calm: boolean }) {
    const open = state === "open";
    const coins = [
        { x: -14, y: -14 },
        { x: -4, y: -18 },
        { x: 7, y: -15 },
        { x: 16, y: -12 },
        { x: 2, y: -24 },
        { x: -9, y: -23 },
    ];
    return (
        <g transform={`translate(${x} ${y}) scale(1.15)`}>
            <ellipse cx="0" cy="17" rx="34" ry="5" fill="#000" opacity="0.08" />
            {open && <g opacity="0.7"><ellipse cx="0" cy="-20" rx="40" ry="24" fill="#FFF1A8" className={moving(calm, "bmw-pulse")} /></g>}
            {open ? (
                <>
                    <path d="M-27 -12 L-23 -40 H23 L27 -12 Z" fill="#B97A40" stroke="#9C6B43" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M-23 -40 H23" stroke="#F5B83D" strokeWidth="4" strokeLinecap="round" />
                    {coins.map((p, i) => (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r="6" fill="#FFD66B" stroke="#E5A50A" strokeWidth="1.5" />
                            <circle cx={p.x - 1.5} cy={p.y - 1.5} r="2" fill="#FFF1B8" />
                        </g>
                    ))}
                    <Sparkle x={-22} y={-34} s={5} fill="#FFD34F" calm={calm} />
                    <Sparkle x={24} y={-30} s={4} fill="#FFD34F" calm={calm} delay={1} />
                    <Sparkle x={2} y={-44} s={4.5} fill="#FFD34F" calm={calm} delay={1.8} />
                </>
            ) : (
                <path d="M-27 -10 V-18 Q-27 -30 -14 -30 H14 Q27 -30 27 -18 V-10 Z" fill="#D99A5B" stroke="#9C6B43" strokeWidth="2" strokeLinejoin="round" />
            )}
            <rect x="-26" y="-11" width="52" height="27" rx="4" fill="#C98A4B" stroke="#9C6B43" strokeWidth="2" />
            <rect x="-28" y="-13" width="56" height="5" rx="2.5" fill="#F5B83D" />
            {!open && (
                <>
                    <rect x="-21" y="-29" width="6" height="16" rx="2" fill="#F5B83D" />
                    <rect x="15" y="-29" width="6" height="16" rx="2" fill="#F5B83D" />
                </>
            )}
            <rect x="-21" y="-8" width="6" height="24" rx="2" fill="#F5B83D" />
            <rect x="15" y="-8" width="6" height="24" rx="2" fill="#F5B83D" />
            {!open && <Padlock x={0} y={0} scale={0.82} glow={state === "key"} calm={calm} />}
            {state === "key" && <FloatingKey x={32} y={-26} calm={calm} />}
        </g>
    );
}

// ── Značka sveta (jezičak za izbor sveta) ─────────────────────────────────────

function BadgeScene({ world }: { world: WorldId }) {
    if (world === "meadow") {
        return (
            <g>
                <rect width="64" height="64" fill="#DDF1FB" />
                <circle cx="46" cy="18" r="7" fill="#FFD66B" />
                <ellipse cx="38" cy="62" rx="40" ry="22" fill="#9FD38E" />
                <ellipse cx="6" cy="58" rx="26" ry="16" fill="#8FCB86" />
                <rect x="20.5" y="30" width="5" height="14" rx="2" fill="#B08968" />
                <circle cx="23" cy="27" r="10" fill="#7DBE7E" />
                <circle cx="20" cy="24" r="4.5" fill="#A3D6A0" />
                <circle cx="42" cy="48" r="2.4" fill="#F59FB5" />
                <circle cx="50" cy="52" r="2.4" fill="#FFFFFF" />
            </g>
        );
    }
    if (world === "desert") {
        return (
            <g>
                <rect width="64" height="64" fill="#FFF1D6" />
                <circle cx="45" cy="17" r="8" fill="#F5B83D" />
                <path d="M34 46 L46 28 L58 46 Z" fill="#F2D394" />
                <path d="M46 28 L58 46 H48 Z" fill="#DDAE6C" />
                <ellipse cx="18" cy="58" rx="36" ry="14" fill="#F1D39B" />
                <ellipse cx="52" cy="62" rx="30" ry="16" fill="#ECCB8C" />
                <path d="M15 40 H11 V33 M27 36 H31 V29" fill="none" stroke="#7FBF7A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="17" y="22" width="8" height="30" rx="4" fill="#7FBF7A" />
            </g>
        );
    }
    if (world === "volcano") {
        return (
            <g>
                <rect width="64" height="64" fill="#FFE7D4" />
                <circle cx="31" cy="15" r="5" fill="#FBF3EE" stroke="#EAD8CD" />
                <circle cx="37" cy="9" r="6" fill="#FBF3EE" stroke="#EAD8CD" />
                <path d="M4 60 L24 27 Q32 22 40 27 L60 60 Z" fill="#C89580" />
                <path d="M34 25 Q38 26 40 27 L60 60 H44 Q46 40 34 25 Z" fill="#B7836E" />
                <ellipse cx="32" cy="26" rx="8.5" ry="3" fill="#FFB04A" />
                <path d="M26 27 Q23 34 25 38 Q27 41 29 37 Q29 32 31 28 Z" fill="#FFA94D" />
                <g fill="none" stroke="#7A4E3E" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M25 42 q2.5 2 5 0" />
                    <path d="M35 42 q2.5 2 5 0" />
                    <path d="M29.5 48 q3 2.5 6 0" />
                </g>
            </g>
        );
    }
    return (
        <g>
            <rect width="64" height="64" fill="#E2F3FD" />
            <path d="M2 58 L22 24 L42 58 Z" fill="#C6E5F6" />
            <path d="M22 24 L42 58 H26 Z" fill="#A9D6F0" />
            <path d="M22 24 L16 34 q3 2 6 0 q3 2 6 0 Z" fill="#FFFFFF" />
            <path d="M26 58 L44 20 L62 58 Z" fill="#B5DCF2" />
            <path d="M44 20 L62 58 H48 Z" fill="#9CCDEB" />
            <path d="M44 20 L38.5 31 q2.75 2 5.5 0 q2.75 2 5.5 0 Z" fill="#FFFFFF" />
            <ellipse cx="32" cy="62" rx="40" ry="10" fill="#FFFFFF" />
            <g transform="translate(14 14)" stroke="#6FB7E3" strokeWidth="1.8" strokeLinecap="round">
                <path d="M0 -6 V6 M-5.2 -3 L5.2 3 M-5.2 3 L5.2 -3" />
            </g>
        </g>
    );
}

/** Okrugla značka sveta za izbor sveta (≈56–72 px); zaključan svet je bleđi, sa katancem */
export function WorldBadge({ world, locked, className }: { world: WorldId; locked: boolean; className?: string }): JSX.Element {
    const uid = useSafeId();
    const theme = worldTheme(world);
    return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
            <defs>
                <clipPath id={`${uid}-badge`}>
                    <circle cx="32" cy="32" r="28" />
                </clipPath>
            </defs>
            <circle cx="32" cy="32" r="31.5" fill="#FFFFFF" />
            <g clipPath={`url(#${uid}-badge)`}>
                <BadgeScene world={world} />
                {locked && <rect width="64" height="64" fill="#FFFFFF" opacity="0.55" />}
            </g>
            <circle cx="32" cy="32" r="29.5" fill="none" stroke={locked ? "#C9CCD6" : theme.colors.frame} strokeWidth="3" />
            {locked && (
                <g transform="translate(47 47)">
                    <circle r="12" fill="#FFFFFF" stroke="#C9CCD6" strokeWidth="2" />
                    <Padlock x={0} y={-1.5} scale={0.5} calm />
                </g>
            )}
        </svg>
    );
}
