// app/dashboard/child/[id]/mapWorlds.tsx
// Sedam svetova „Mape” igara, od najlakšeg ka najtežem: Zelena livada, Čarobna šuma, Peščana
// pustinja, Podvodni svet, Vatreni vulkan, Ledeni vrhovi i Svemir.
// Ovde je samo crtež (čist SVG, bez stanja i bez podataka): tlo, ukrasi, reka, put, most,
// početak puta i kapija na kraju sveta. Raspored (kuda ide put, gde rastu ukrasi, gde teče
// reka) daje gameMapLayout.ts, pa svi svetovi dele iste koordinate — menja se samo izgled.
//
// Zašto ovako:
//   • Svet se prepoznaje na prvi pogled (boja tla + jedan veliki znak u gornjem uglu: staro
//     drvo sa kućicom, piramide, nasmejani kit, nasmejani vulkan, snežni vrhovi, planeta sa
//     prstenom), a raspored ostaje isti i predvidljiv. Deci sa autizmom promena rasporeda smeta
//     mnogo više od promene boja.
//   • Boje su meke i tople, isti ravni crtež kao ostatak aplikacije. Vulkan je narandžast,
//     „pospan” i nasmejan (bez jarko crvene, bez lobanja), led je svetao i veseo, šuma je
//     čarobna a ne mračna (pečurke, svitci), more je plitko i svetlo (bez ajkula i dubina), a
//     svemir je pastelno ljubičast (ne crn), sa planetama i zvezdicama.
//   • Kapija pokazuje cilj bez reči: katanac (zaključano), zlatni ključ pored katanca (zvezdice
//     su skupljene) i otvorena vrata sa svetlom stazom ka sledećem svetu. Poslednji svet umesto
//     kapije ima cilj sa kovčegom blaga: u svemiru raketu pored planete, u ostalim dvorac.
//   • Pokret je tih i spor (dim, sjaj lave, svetlucanje snega i zvezda, mehurići, alge koje se
//     njišu, ključ koji lebdi) i potpuno staje uz „Manje animacija” (`calm`) ili sistemsko
//     „smanji pokrete”.

import { useId, type JSX } from "react";
import type { MapHill, MapLayout, MapPoint, MapTree } from "./gameMapLayout";

export type WorldId = "meadow" | "forest" | "desert" | "ocean" | "volcano" | "ice" | "space";

export interface WorldTheme {
    id: WorldId;
    /** Ime sveta: „Zelena livada”, „Čarobna šuma”, „Peščana pustinja”… */
    name: string;
    /** Gde je dete, za glas i pohvalu: „na livadi”, „u šumi”, „u pustinji”, „pod morem”… */
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
        id: "forest",
        name: "Čarobna šuma",
        where: "u šumi",
        colors: { ground: "#E4F1EA", groundDeep: "#B5DCC6", frame: "#4FA383", accent: "#2E8B6E", text: "#1B4D3E" },
    },
    {
        id: "desert",
        name: "Peščana pustinja",
        where: "u pustinji",
        colors: { ground: "#FBF0D9", groundDeep: "#F1D9A8", frame: "#D9A85B", accent: "#D97F16", text: "#6B4310" },
    },
    {
        id: "ocean",
        name: "Podvodni svet",
        where: "pod morem",
        colors: { ground: "#E3F4F7", groundDeep: "#B3E2EA", frame: "#4FB3C8", accent: "#1E95B0", text: "#0F4A5A" },
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
    {
        id: "space",
        name: "Svemir",
        where: "u svemiru",
        colors: { ground: "#ECEAFB", groundDeep: "#CFC9F2", frame: "#8C82D9", accent: "#6A5FD0", text: "#2E2770" },
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
    "@keyframes bmw-rise{0%{opacity:0;transform:translateY(6px)}20%{opacity:.9}100%{opacity:0;transform:translateY(-34px)}}" +
    "@keyframes bmw-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}" +
    ".bmw-pulse{animation:bmw-pulse 3.4s ease-in-out infinite}" +
    ".bmw-twinkle{animation:bmw-twinkle 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}" +
    ".bmw-smoke{animation:bmw-smoke 5.4s ease-out infinite;transform-box:fill-box;transform-origin:center}" +
    ".bmw-bob{animation:bmw-bob 2.6s ease-in-out infinite}" +
    ".bmw-flow{animation:bmw-flow 9s linear infinite}" +
    ".bmw-rise{animation:bmw-rise 5s ease-out infinite;transform-box:fill-box;transform-origin:center}" +
    ".bmw-sway{animation:bmw-sway 5.5s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}" +
    "@media (prefers-reduced-motion:reduce){.bmw-pulse,.bmw-twinkle,.bmw-smoke,.bmw-bob,.bmw-flow,.bmw-rise,.bmw-sway{animation:none}}";

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
    forest: ["#EAF4EC", "#DAECDF"],
    desert: ["#FDF4E0", "#F8E5C1"],
    ocean: ["#E9F8FA", "#D2EEF2"],
    volcano: ["#FDEDE1", "#F9DCC8"],
    ice: ["#F6FCFF", "#E4F3FC"],
    space: ["#EFECFC", "#E0DBF7"],
};

const ROADS: Record<WorldId, { edge: string; fill: string; dash: string; done: string }> = {
    meadow: { edge: "#D9C49A", fill: "#F4E6C6", dash: "#FFFFFF", done: "#FFD66B" },
    // Šumska staza: tamnija zemlja sa mahovinom uz ivicu
    forest: { edge: "#B39B78", fill: "#E3D0AE", dash: "#FFF8EA", done: "#FFD66B" },
    desert: { edge: "#D59D6B", fill: "#F3CDA3", dash: "#FFF6E6", done: "#FFD34F" },
    // Peskovita staza po morskom dnu
    ocean: { edge: "#D8C391", fill: "#F7EBCB", dash: "#FFFFFF", done: "#FFD34F" },
    volcano: { edge: "#9C8073", fill: "#C9B0A3", dash: "#FFEBD0", done: "#FFC94D" },
    ice: { edge: "#A9D3EE", fill: "#FFFFFF", dash: "#A9D3EE", done: "#FFD66B" },
    // Svetla staza među zvezdama
    space: { edge: "#B3A9E6", fill: "#F6F3FF", dash: "#C7BEF2", done: "#FFD66B" },
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

/** Sitna šara tla: lišće, talasići peska, kamenčići, pahuljice, tačkice zvezda (livada ostaje čista kao do sada) */
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
            } else if (world === "forest") {
                // Opalo lišće i detelina
                const a = Math.round(noise(seed * 7) * 180);
                marks.push(
                    <g key={seed} fill="#CBE3CF" transform={`translate(${mx} ${my}) rotate(${a})`}>
                        <ellipse cx="-5" cy="0" rx="5" ry="2.6" />
                        <ellipse cx="5" cy="0" rx="5" ry="2.6" />
                        <ellipse cx="0" cy="-5" rx="2.6" ry="5" />
                    </g>
                );
            } else if (world === "ocean") {
                // Talasići na pesku i poneki mehurić
                marks.push(
                    <g key={seed} fill="none" stroke="#C3E6EC" strokeWidth="2.4" strokeLinecap="round">
                        <path d={`M${mx - 13} ${my} q13 -6 26 0`} />
                        <circle cx={mx + 18} cy={my - 10} r="3" strokeWidth="1.6" />
                    </g>
                );
            } else if (world === "space") {
                // Sitne zvezde (mirne, bez treperenja: tlo se ne pomera)
                marks.push(
                    <g key={seed} fill="#D3CCF4">
                        <circle cx={mx} cy={my} r="1.8" />
                        <g transform={`translate(${mx + 11} ${my + 6})`}>
                            <path d={sparklePath(4)} />
                        </g>
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
const BUSHES = ["#A9D4B4", "#B8DCC0", "#9CCBA9"];
const REEFS = ["#BDE4E8", "#C9EAED", "#B2DDE3"];
const MOONS = ["#DAD4F3", "#E2DDF6", "#D2CBEF"];

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
    if (world === "forest") {
        // Gust žbun uz ivicu: bobice i jedna pečurka na vidljivoj strani
        const bx = (f: number) => r1(h.x + dir * h.rx * f);
        return (
            <g>
                <ellipse cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} fill={BUSHES[h.tone]} opacity="0.9" />
                <ellipse cx={bx(0.35)} cy={r1(h.y - h.ry * 0.55)} rx={r1(h.rx * 0.4)} ry={r1(h.ry * 0.32)} fill="#C6E3CC" opacity="0.8" />
                <g fill="#9D8BE0">
                    <circle cx={bx(0.62)} cy={r1(h.y - h.ry * 0.2)} r="4" />
                    <circle cx={bx(0.68)} cy={r1(h.y - h.ry * 0.12)} r="3.4" />
                    <circle cx={bx(0.56)} cy={r1(h.y - h.ry * 0.1)} r="3.4" />
                </g>
                <g transform={`translate(${bx(0.7)} ${r1(h.y + h.ry * 0.3)})`}>
                    <rect x="-3" y="-4" width="6" height="10" rx="2.5" fill="#FFF4E4" />
                    <path d="M-10 -3 Q0 -15 10 -3 Z" fill="#F08A7E" />
                    <circle cx="-3.5" cy="-7" r="1.6" fill="#FFFFFF" />
                    <circle cx="3" cy="-6" r="1.3" fill="#FFFFFF" />
                </g>
                <Sparkle x={h.x + dir * h.rx * 0.5} y={h.y - h.ry * 0.75} s={5} fill="#FFE27A" calm={calm} delay={index * 0.8} />
            </g>
        );
    }
    if (world === "ocean") {
        // Greben: zaobljena stena sa koralima na vidljivoj strani
        const bx = (f: number) => r1(h.x + dir * h.rx * f);
        const top = (f: number) => r1(h.y - h.ry * f);
        return (
            <g>
                <ellipse cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} fill={REEFS[h.tone]} opacity="0.9" />
                <g fill="none" stroke="#F4A9A0" strokeWidth="5" strokeLinecap="round">
                    <path d={`M${bx(0.62)} ${top(0.2)} V${top(0.62)} M${bx(0.62)} ${top(0.42)} l${dir * 9} -9 M${bx(0.62)} ${top(0.48)} l${-dir * 8} -7`} />
                </g>
                <g fill="none" stroke="#FFC48A" strokeWidth="4.5" strokeLinecap="round">
                    <path d={`M${bx(0.45)} ${top(0.05)} V${top(0.36)} M${bx(0.45)} ${top(0.2)} l${dir * 7} -8`} />
                </g>
                <g fill="#FFFFFF" opacity="0.8">
                    <circle cx={bx(0.74)} cy={top(0.05)} r="3" />
                    <circle cx={bx(0.32)} cy={top(-0.25)} r="2.4" />
                </g>
            </g>
        );
    }
    if (world === "space") {
        // Mesečevo brdo sa kraterima
        const bx = (f: number) => r1(h.x + dir * h.rx * f);
        return (
            <g>
                <ellipse cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} fill={MOONS[h.tone]} />
                <g fill="#C9C1EC">
                    <ellipse cx={bx(0.6)} cy={r1(h.y - h.ry * 0.35)} rx="13" ry="8" />
                    <ellipse cx={bx(0.75)} cy={r1(h.y + h.ry * 0.15)} rx="8" ry="5" />
                    <ellipse cx={bx(0.42)} cy={r1(h.y + h.ry * 0.38)} rx="10" ry="6" />
                </g>
                <g fill="#E9E5FA">
                    <ellipse cx={bx(0.6)} cy={r1(h.y - h.ry * 0.35 + 2)} rx="9" ry="4.5" />
                    <ellipse cx={bx(0.42)} cy={r1(h.y + h.ry * 0.38 + 1.5)} rx="6.5" ry="3" />
                </g>
                <Sparkle x={h.x + dir * h.rx * 0.5} y={h.y - h.ry * 0.85} s={6} fill="#FFFFFF" calm={calm} delay={index * 0.7} />
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
            {world === "forest" ? <OldTree calm={calm} />
            : world === "desert" ? <Pyramids />
            : world === "ocean" ? <Whale calm={calm} />
            : world === "volcano" ? <BigVolcano calm={calm} />
            : world === "space" ? <RingPlanet calm={calm} />
            : <SnowPeaks calm={calm} />}
        </g>
    );
}

/** Staro drvo sa kućicom u stablu: okrugla vrata, prozorče sa toplim svetlom, pečurke i svitci */
function OldTree({ calm }: { calm: boolean }) {
    const crown = [
        { x: -36, y: -78, r: 28, c: "#5FA97F" },
        { x: 36, y: -80, r: 28, c: "#5FA97F" },
        { x: 0, y: -96, r: 31, c: "#6DB38A" },
        { x: -18, y: -62, r: 26, c: "#6DB38A" },
        { x: 20, y: -60, r: 26, c: "#5FA97F" },
    ];
    const mushroom = (x: number, s: number, cap: string) => (
        <g transform={`translate(${x} 0) scale(${s})`}>
            <rect x="-4" y="-12" width="8" height="12" rx="3" fill="#FFF4E4" />
            <path d="M-13 -10 Q0 -27 13 -10 Z" fill={cap} />
            <circle cx="-5" cy="-15" r="2" fill="#FFFFFF" />
            <circle cx="4" cy="-17" r="1.6" fill="#FFFFFF" />
            <circle cx="7" cy="-12" r="1.4" fill="#FFFFFF" />
        </g>
    );
    return (
        <g>
            <ellipse cx="0" cy="4" rx="80" ry="9" fill="#000" opacity="0.06" />
            {/* Stablo sa korenjem */}
            <path d="M-34 2 Q-20 -4 -18 -26 L-14 -64 H14 L18 -26 Q20 -4 34 2 Z" fill="#B08560" />
            <path d="M4 -64 H14 L18 -26 Q20 -4 34 2 H12 Q16 -24 4 -64 Z" fill="#9A7150" />
            <path d="M-8 -50 q3 6 0 12 M8 -40 q-3 5 0 10" fill="none" stroke="#8E6748" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
            {/* Krošnja */}
            {crown.map((c, i) => (
                <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={c.c} />
            ))}
            <circle cx="-8" cy="-106" r="12" fill="#8FCBA3" />
            <circle cx="-44" cy="-86" r="9" fill="#8FCBA3" />
            <circle cx="28" cy="-90" r="8" fill="#8FCBA3" />
            {/* Vrata i prozorče */}
            <path d="M-10 2 V-14 A10 10 0 0 1 10 -14 V2 Z" fill="#7A5236" />
            <path d="M0 -24 V2" stroke="#946C4A" strokeWidth="1.6" />
            <circle cx="5" cy="-8" r="1.6" fill="#FFD66B" />
            <g opacity="0.45"><circle cx="0" cy="-42" r="11" fill="#FFE9A0" className={moving(calm, "bmw-pulse")} /></g>
            <circle cx="0" cy="-42" r="6.5" fill="#FFD98A" stroke="#7A5236" strokeWidth="2.5" />
            <path d="M0 -48.5 V-35.5 M-6.5 -42 H6.5" stroke="#7A5236" strokeWidth="1.6" />
            {mushroom(-50, 1, "#F08A7E")}
            {mushroom(-36, 0.7, "#B9A6EE")}
            {mushroom(52, 0.9, "#F08A7E")}
            {/* Svitci */}
            <Sparkle x={-66} y={-104} s={5} fill="#FFE27A" calm={calm} />
            <Sparkle x={58} y={-112} s={4.5} fill="#FFE27A" calm={calm} delay={1.1} />
            <Sparkle x={70} y={-50} s={4} fill="#FFE27A" calm={calm} delay={2} />
            <Sparkle x={-70} y={-40} s={3.5} fill="#FFE27A" calm={calm} delay={1.6} />
        </g>
    );
}

/** Nasmejani kit pušta mehuriće (mirno, bez prskanja) */
function Whale({ calm }: { calm: boolean }) {
    const bubbles = [
        { x: -32, y: -82, r: 5 },
        { x: -24, y: -94, r: 6.5 },
        { x: -36, y: -106, r: 4.5 },
    ];
    return (
        <g>
            <ellipse cx="0" cy="4" rx="90" ry="9" fill="#000" opacity="0.05" />
            {/* Alge oko kita */}
            <g fill="none" strokeLinecap="round" strokeWidth="5">
                <path d="M-86 2 q-8 -14 0 -26 q8 -12 0 -24" stroke="#7CC6A4" className={moving(calm, "bmw-sway")} />
                <path d="M86 2 q8 -12 0 -22 q-8 -10 0 -20" stroke="#5DB596" className={moving(calm, "bmw-sway")} style={calm ? undefined : { animationDelay: "1.4s" }} />
            </g>
            {/* Rep */}
            <path d="M54 -26 Q70 -40 70 -64 Q80 -54 94 -60 Q86 -40 64 -16 Z" fill="#7DB6E2" />
            {/* Telo i stomak */}
            <path d="M-76 -22 C-76 -62 -30 -78 10 -72 C44 -66 62 -46 66 -26 C68 -10 58 0 38 2 H-54 C-70 2 -76 -10 -76 -22 Z" fill="#8FC3EA" />
            <path d="M-72 -12 C-48 -2 20 -2 58 -10 C54 -2 46 2 38 2 H-54 C-64 2 -70 -4 -72 -12 Z" fill="#DDF0FB" />
            <g stroke="#BFE0F4" strokeWidth="1.6" strokeLinecap="round">
                <path d="M-40 -5 V0 M-24 -4 V1 M-8 -4 V1 M8 -4 V1 M24 -5 V0" />
            </g>
            <path d="M-12 -14 q4 16 22 14 q-10 -4 -12 -16 Z" fill="#76AFDB" />
            {/* Lice: zatvoreno nasmejano oko, osmeh i rumeni obraz */}
            <g fill="none" stroke="#2F5F86" strokeWidth="3" strokeLinecap="round">
                <path d="M-56 -38 q6 5 12 0" />
                <path d="M-72 -20 q10 9 24 4" />
            </g>
            <ellipse cx="-38" cy="-24" rx="7" ry="4" fill="#F4A9B8" opacity="0.7" />
            {/* Mehurići iz leđa */}
            <path d="M-28 -72 q-2 -6 -8 -9 M-28 -72 q3 -6 9 -8" fill="none" stroke="#BFE0F4" strokeWidth="3" strokeLinecap="round" />
            {bubbles.map((b, i) => (
                <circle
                    key={i}
                    cx={b.x}
                    cy={b.y}
                    r={b.r}
                    fill="#F2FBFF"
                    stroke="#A9D8EE"
                    strokeWidth="1.5"
                    opacity={calm ? 0.9 : undefined}
                    className={moving(calm, "bmw-rise")}
                    style={calm ? undefined : { animationDelay: `${i * 1.6}s` }}
                />
            ))}
        </g>
    );
}

/** Planeta sa prstenom, mali mesec i zvezdice (pastelno, ne mračno) */
function RingPlanet({ calm }: { calm: boolean }) {
    return (
        <g>
            <g transform="translate(-6 -66) rotate(-14)">
                <path d="M-74 0 A74 17 0 0 1 74 0" fill="none" stroke="#B4AAE8" strokeWidth="8" strokeLinecap="round" />
                <circle r="44" fill="#F6B88E" />
                <path d="M-42 -14 Q0 -4 42 -14 L43.5 -8 Q0 2 -43.5 -8 Z" fill="#FAD0AE" />
                <path d="M-40 16 Q0 26 40 16 L37 23 Q0 32 -37 23 Z" fill="#EFA57C" />
                <circle cx="-16" cy="-20" r="9" fill="#FCDCC2" opacity="0.8" />
                <path d="M-74 0 A74 17 0 0 0 74 0" fill="none" stroke="#C9C1F0" strokeWidth="8" strokeLinecap="round" />
            </g>
            <g transform="translate(70 -108)">
                <circle r="11" fill="#EEEBFA" stroke="#CFC8F0" strokeWidth="1.5" />
                <circle cx="-3" cy="-2" r="2.6" fill="#DAD4F3" />
                <circle cx="4" cy="3" r="1.8" fill="#DAD4F3" />
            </g>
            <Sparkle x={-74} y={-110} s={6} fill="#FFFFFF" calm={calm} />
            <Sparkle x={62} y={-24} s={5} fill="#FFE27A" calm={calm} delay={1.2} />
            <Sparkle x={-80} y={-26} s={4} fill="#FFFFFF" calm={calm} delay={2.1} />
            <Sparkle x={24} y={-124} s={3.5} fill="#FFE27A" calm={calm} delay={0.6} />
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
    if (world === "forest") {
        // Šumski potok: zelene obale, kamenčići i listovi lokvanja
        return (
            <g>
                <path d={d} fill="none" stroke="#B9DDC2" strokeWidth="56" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#8ECFC4" strokeWidth="40" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#B4E2DA" strokeWidth="30" strokeLinecap="round" />
                <path d={dUp} fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.65" strokeDasharray="18 46" className={moving(calm, "bmw-flow")} />
                <path d={dDown} fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.45" strokeDasharray="12 52" strokeDashoffset="20" />
                {bank.map(({ x, side, k }) => {
                    const by = r1(y + side * 24);
                    if (k % 3 === 1) {
                        // List lokvanja na vodi
                        return (
                            <g key={x} transform={`translate(${x} ${r1(y + side * 6)})`}>
                                <path d="M0 0 L8 -3 A9 6 0 1 1 8 3 Z" fill="#7CBF8C" />
                                {k % 2 === 0 && <circle cx="-2" cy="-1" r="2.6" fill="#F7B7C8" />}
                            </g>
                        );
                    }
                    return (
                        <g key={x}>
                            <ellipse cx={x} cy={by} rx="7" ry="4.5" fill="#B8C4B3" />
                            <ellipse cx={x + 9} cy={r1(by + side * 2)} rx="4.5" ry="3" fill="#A6B4A2" />
                        </g>
                    );
                })}
            </g>
        );
    }
    if (world === "ocean") {
        // Morska struja: svetlija traka vode sa mehurićima i ribicama uz ivicu
        return (
            <g>
                <path d={d} fill="none" stroke="#C8EBF0" strokeWidth="60" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#DDF5F8" strokeWidth="42" strokeLinecap="round" />
                <path d={dUp} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.85" strokeDasharray="22 42" className={moving(calm, "bmw-flow")} />
                <path d={dDown} fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" strokeDasharray="14 50" strokeDashoffset="20" className={moving(calm, "bmw-flow")} />
                {bank.map(({ x, side, k }) => {
                    const by = r1(y + side * 4);
                    if (k % 2 === 0) {
                        return (
                            <g key={x} fill="#FFFFFF" stroke="#A9D8EE" strokeWidth="1.2">
                                <circle cx={x} cy={by} r="3.5" className={moving(calm, "bmw-rise")} style={calm ? undefined : { animationDelay: `${(k % 5) * 0.9}s` }} />
                                <circle cx={x + 8} cy={r1(by - 8)} r="2.4" />
                            </g>
                        );
                    }
                    const fish = ["#FFB36B", "#F59FB5", "#FFD66B"][k % 3];
                    return (
                        <g key={x} transform={`translate(${x} ${by}) scale(${side < 0 ? 1 : -1} 1)`}>
                            <path d="M-6 0 L-13 -5 V5 Z" fill={fish} />
                            <ellipse cx="2" cy="0" rx="9" ry="5.5" fill={fish} />
                            <circle cx="6" cy="-1.2" r="1.3" fill="#2F5F86" />
                        </g>
                    );
                })}
            </g>
        );
    }
    if (world === "space") {
        // Mlečni put: meka svetla traka puna zvezdica
        return (
            <g>
                <path d={d} fill="none" stroke="#DED8F8" strokeWidth="62" strokeLinecap="round" opacity="0.9" />
                <path d={d} fill="none" stroke="#EAE6FC" strokeWidth="44" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#F6F4FF" strokeWidth="22" strokeLinecap="round" />
                <path d={dUp} fill="none" stroke="#C7BEF2" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 22" className={moving(calm, "bmw-flow")} />
                <path d={dDown} fill="none" stroke="#C7BEF2" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 30" strokeDashoffset="11" />
                {bank.map(({ x, side, k }) => (
                    <Sparkle key={x} x={x} y={y + side * (8 + (k % 3) * 5)} s={k % 3 === 0 ? 5.5 : 4} fill={k % 2 === 0 ? "#FFD34F" : "#A99DEB"} calm={calm} delay={(k % 4) * 0.7} />
                ))}
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
const FOREST = ["#4E9C77", "#5AAA84", "#468F70"];
const FOREST_LIGHT = ["#78BE98", "#84C8A2", "#6FB38E"];
const CAPS = ["#F08A7E", "#B9A6EE", "#F6A85F"];

function Decor({ world, t, index, calm }: { world: WorldId; t: MapTree; index: number; calm: boolean }) {
    const pick = Math.floor(noise(index * 31 + 7) * 100);
    let art: JSX.Element;
    if (world === "meadow") art = <Tree t={t} />;
    else if (world === "forest") {
        if (pick < 42) art = <ForestTree t={t} />;
        else if (pick < 62) art = <Mushrooms t={t} />;
        else if (pick < 76) art = <Fern t={t} />;
        else if (pick < 88) art = <Stump t={t} />;
        else art = <Bluebells t={t} />;
    } else if (world === "ocean") {
        if (pick < 30) art = <Seaweed t={t} calm={calm} />;
        else if (pick < 50) art = <Coral t={t} />;
        else if (pick < 64) art = <Shell t={t} />;
        else if (pick < 76) art = <Starfish t={t} />;
        else if (pick < 90) art = <Fish t={t} calm={calm} />;
        else art = <ReefRock t={t} />;
    } else if (world === "space") {
        if (pick < 28) art = <SmallPlanet t={t} />;
        else if (pick < 50) art = <MoonRock t={t} />;
        else if (pick < 66) art = <StarCluster t={t} calm={calm} />;
        else if (pick < 80) art = <SpaceSprout t={t} calm={calm} />;
        else if (pick < 92) art = <Crystals t={t} tint="space" />;
        else art = t.r > 15 ? <MiniRocket t={t} /> : <SmallPlanet t={t} />;
    } else if (world === "desert") {
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
    // Svetlucanje: sneg na ledu, svitci u šumi
    const sparkle = (world === "ice" || world === "forest") && index % 3 === 0;
    return (
        <g transform={`translate(${t.x} ${t.y})`}>
            {art}
            {sparkle && <Sparkle x={t.r * 1.1} y={-t.r * 0.7} s={world === "forest" ? 4.5 : 5} fill={world === "forest" ? "#FFE27A" : "#8FCDEE"} calm={calm} delay={(index % 5) * 0.6} />}
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

/** Šumsko drvo: visoka zaobljena krošnja u dva tona */
function ForestTree({ t }: { t: MapTree }) {
    const { r } = t;
    return (
        <>
            <Shadow r={r} />
            <rect x="-3" y={r1(r * 0.5)} width="6" height={r1(r * 0.75)} rx="2" fill="#9A7150" />
            <ellipse cx="0" cy={r1(-r * 0.15)} rx={r1(r * 0.82)} ry={r1(r * 1.15)} fill={FOREST[t.tone]} />
            <ellipse cx={r1(-r * 0.25)} cy={r1(-r * 0.5)} rx={r1(r * 0.34)} ry={r1(r * 0.55)} fill={FOREST_LIGHT[t.tone]} />
            <path d={`M${r1(r * 0.3)} ${r1(r * 0.1)} q${r1(r * 0.2)} ${r1(-r * 0.25)} 0 ${r1(-r * 0.5)}`} fill="none" stroke={FOREST_LIGHT[t.tone]} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        </>
    );
}

/** Dve pečurke sa tačkicama (prijateljske, bez lica) */
function Mushrooms({ t }: { t: MapTree }) {
    const { r } = t;
    const cap = CAPS[t.tone];
    const one = (x: number, s: number, c: string) => (
        <g transform={`translate(${r1(x)} ${r1(r + 4)}) scale(${r1((s * r) / 18)})`}>
            <path d="M-5 0 V-13 Q0 -16 5 -13 V0 Z" fill="#FFF4E4" stroke="#EAD7B7" strokeWidth="1" />
            <path d="M-15 -11 Q0 -32 15 -11 Q0 -7 -15 -11 Z" fill={c} />
            <circle cx="-6" cy="-17" r="2.4" fill="#FFFFFF" />
            <circle cx="4" cy="-21" r="2" fill="#FFFFFF" />
            <circle cx="8" cy="-14" r="1.6" fill="#FFFFFF" />
        </g>
    );
    return (
        <>
            <Shadow r={r} />
            {one(r * 0.45, 0.75, CAPS[(t.tone + 1) % 3])}
            {one(-r * 0.2, 1.05, cap)}
            <path d={`M${r1(-r * 0.9)} ${r1(r + 4)} q4 -6 8 0 M${r1(r * 0.8)} ${r1(r + 4)} q3 -5 6 0`} fill="none" stroke="#7CBF8C" strokeWidth="2" strokeLinecap="round" />
        </>
    );
}

function Fern({ t }: { t: MapTree }) {
    const { r } = t;
    const green = FOREST_LIGHT[t.tone];
    return (
        <>
            <Shadow r={r} />
            {[-48, -20, 8, 34].map((a, i) => (
                <g key={a} transform={`translate(0 ${r1(r + 4)}) rotate(${a})`}>
                    <path d={`M0 0 Q${r1(r * 0.2)} ${r1(-r * 0.8)} 0 ${r1(-r * (1.5 - i * 0.12))}`} fill="none" stroke={FOREST[t.tone]} strokeWidth="2.2" strokeLinecap="round" />
                    {[0.35, 0.6, 0.85].map((f) => (
                        <g key={f}>
                            <ellipse cx={r1(-r * 0.16)} cy={r1(-r * f * (1.5 - i * 0.12))} rx={r1(r * 0.18)} ry={r1(r * 0.07)} fill={green} transform={`rotate(-20 0 ${r1(-r * f * (1.5 - i * 0.12))})`} />
                            <ellipse cx={r1(r * 0.18)} cy={r1(-r * f * (1.5 - i * 0.12))} rx={r1(r * 0.18)} ry={r1(r * 0.07)} fill={green} transform={`rotate(20 0 ${r1(-r * f * (1.5 - i * 0.12))})`} />
                        </g>
                    ))}
                </g>
            ))}
        </>
    );
}

/** Panj sa godovima i malom pečurkom */
function Stump({ t }: { t: MapTree }) {
    const { r } = t;
    const w = r1(r * 0.8);
    const top = r1(r * 0.1);
    return (
        <>
            <Shadow r={r} />
            <path d={`M${-w} ${top} V${r1(r + 2)} Q0 ${r1(r + 7)} ${w} ${r1(r + 2)} V${top} Z`} fill="#B08560" />
            <ellipse cx="0" cy={top} rx={w} ry={r1(r * 0.3)} fill="#E3C79E" />
            <ellipse cx="0" cy={top} rx={r1(w * 0.6)} ry={r1(r * 0.17)} fill="none" stroke="#C9A77A" strokeWidth="1.4" />
            <ellipse cx="0" cy={top} rx={r1(w * 0.25)} ry={r1(r * 0.07)} fill="#C9A77A" />
            <g transform={`translate(${r1(w + 2)} ${r1(r + 3)})`}>
                <rect x="-2" y="-7" width="4" height="7" rx="1.5" fill="#FFF4E4" />
                <path d="M-7 -6 Q0 -15 7 -6 Z" fill={CAPS[t.tone]} />
            </g>
        </>
    );
}

/** Zvončići: ljubičasti i plavi cvetići u travi */
function Bluebells({ t }: { t: MapTree }) {
    const { r } = t;
    const stems = [-0.55, -0.1, 0.4, 0.8];
    return (
        <>
            <Shadow r={r} />
            <ellipse cx="0" cy={r1(r * 0.8)} rx={r1(r * 0.95)} ry={r1(r * 0.38)} fill={FOREST_LIGHT[t.tone]} />
            {stems.map((f, i) => {
                const x = r1(r * f);
                const top = r1(r * (0.1 - (i % 2) * 0.3));
                return (
                    <g key={f}>
                        <path d={`M${x} ${r1(r * 0.8)} V${top}`} stroke={FOREST[t.tone]} strokeWidth="1.8" strokeLinecap="round" />
                        <path d={`M${x - 4} ${top + 2} Q${x} ${top - 6} ${x + 4} ${top + 2} Q${x} ${top + 4} ${x - 4} ${top + 2} Z`} fill={i % 2 === 0 ? "#9D8BE0" : "#7FA8EE"} />
                    </g>
                );
            })}
        </>
    );
}

/** Alga koja se polako njiše */
function Seaweed({ t, calm }: { t: MapTree; calm: boolean }) {
    const { r } = t;
    const blades = [
        { x: -r * 0.35, h: 1.6, c: "#6CC09B" },
        { x: r * 0.1, h: 2.1, c: "#58B48D" },
        { x: r * 0.5, h: 1.4, c: "#7CCBA8" },
    ];
    return (
        <>
            <Shadow r={r} />
            {blades.map((b, i) => {
                const h = r1(r * b.h);
                const bx = r1(b.x);
                const base = r1(r + 4);
                return (
                    <path
                        key={i}
                        d={`M${bx} ${base} q${r1(-r * 0.35)} ${r1(-h * 0.25)} 0 ${r1(-h * 0.5)} q${r1(r * 0.35)} ${r1(-h * 0.25)} 0 ${r1(-h * 0.5)}`}
                        fill="none"
                        stroke={b.c}
                        strokeWidth={r1(r * 0.28)}
                        strokeLinecap="round"
                        className={moving(calm, "bmw-sway")}
                        style={calm ? undefined : { animationDelay: `${(i * 0.9 + t.tone) % 3}s` }}
                    />
                );
            })}
        </>
    );
}

/** Koral sa granama (meke tople boje) */
function Coral({ t }: { t: MapTree }) {
    const { r } = t;
    const color = ["#F4A9A0", "#FFC48A", "#C6A8F0"][t.tone];
    const base = r1(r + 4);
    const d = `M0 ${base} V${r1(-r * 0.3)} M0 ${r1(r * 0.4)} Q${r1(-r * 0.6)} ${r1(r * 0.2)} ${r1(-r * 0.7)} ${r1(-r * 0.5)} M0 ${r1(r * 0.1)} Q${r1(r * 0.6)} 0 ${r1(r * 0.65)} ${r1(-r * 0.7)} M${r1(-r * 0.45)} ${r1(r * 0.1)} L${r1(-r * 0.15)} ${r1(-r * 0.15)}`;
    return (
        <>
            <Shadow r={r} />
            <path d={d} fill="none" stroke={color} strokeWidth={r1(r * 0.3)} strokeLinecap="round" strokeLinejoin="round" />
            <g fill="#FFFFFF" opacity="0.55">
                <circle cx={r1(-r * 0.7)} cy={r1(-r * 0.5)} r={r1(r * 0.08)} />
                <circle cx={r1(r * 0.65)} cy={r1(-r * 0.7)} r={r1(r * 0.08)} />
            </g>
        </>
    );
}

function Shell({ t }: { t: MapTree }) {
    const { r } = t;
    const s = r1(r / 16);
    return (
        <>
            <Shadow r={r} />
            <g transform={`translate(0 ${r1(r * 0.5)}) scale(${s})`}>
                <path d="M0 12 L-16 -2 Q-12 -16 0 -18 Q12 -16 16 -2 Z" fill="#FBD5C8" stroke="#EBAF9E" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M0 12 L-9 -14 M0 12 L0 -18 M0 12 L9 -14 M0 12 L-14 -6 M0 12 L14 -6" stroke="#EBAF9E" strokeWidth="1.4" strokeLinecap="round" />
                <rect x="-5" y="10" width="10" height="5" rx="2" fill="#F2BFAF" />
            </g>
        </>
    );
}

function Starfish({ t }: { t: MapTree }) {
    const { r } = t;
    const color = ["#FFB36B", "#F59FB5", "#FFD66B"][t.tone];
    const R = r1(r * 0.85);
    const k = r1(r * 0.36);
    const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? R : k;
        return `${r1(Math.cos(a) * rad)} ${r1(Math.sin(a) * rad)}`;
    });
    return (
        <>
            <Shadow r={r} />
            <g transform={`translate(0 ${r1(r * 0.45)})`}>
                <path d={`M${pts.join(" L")} Z`} fill={color} stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
                <circle r="1.6" fill="#FFFFFF" opacity="0.8" />
            </g>
        </>
    );
}

/** Ribica koja polako pliva gore-dole */
function Fish({ t, calm }: { t: MapTree; calm: boolean }) {
    const { r } = t;
    const color = ["#FFB36B", "#7FA8EE", "#F59FB5"][t.tone];
    const s = r1(r / 15);
    return (
        <g className={moving(calm, "bmw-bob")}>
            <g transform={`scale(${s})`}>
                <path d="M-10 0 L-22 -9 V9 Z" fill={color} />
                <ellipse cx="0" cy="0" rx="15" ry="10" fill={color} />
                <path d="M-2 -10 Q4 -16 8 -9 Z" fill={color} />
                <path d="M2 -6 Q6 0 2 6" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
                <circle cx="8" cy="-2" r="2.2" fill="#2F5F86" />
                <circle cx="8.7" cy="-2.7" r="0.8" fill="#FFFFFF" />
                <circle cx="20" cy="-10" r="2.6" fill="#FFFFFF" stroke="#A9D8EE" strokeWidth="1" />
            </g>
        </g>
    );
}

function ReefRock({ t }: { t: MapTree }) {
    const { r } = t;
    return (
        <>
            <Shadow r={r} />
            <ellipse cx="0" cy={r1(r * 0.5)} rx={r1(r * 0.9)} ry={r1(r * 0.6)} fill="#A9CFD6" />
            <ellipse cx={r1(-r * 0.3)} cy={r1(r * 0.3)} rx={r1(r * 0.35)} ry={r1(r * 0.18)} fill="#C3E1E6" />
            {/* Morska sasa na steni */}
            <g transform={`translate(${r1(r * 0.35)} ${r1(r * 0.05)})`} stroke="#F59FB5" strokeWidth="2.6" strokeLinecap="round">
                <path d="M0 0 V-6 M-4 0 L-6 -5 M4 0 L6 -5" />
            </g>
        </>
    );
}

/** Mala planeta (sa prstenom ili sa kraterima) */
function SmallPlanet({ t }: { t: MapTree }) {
    const { r } = t;
    const body = ["#F6B88E", "#9FC9F2", "#C6A8F0"][t.tone];
    const shade = ["#EFA57C", "#86B6E8", "#B092E6"][t.tone];
    const pr = r1(r * 0.75);
    return (
        <>
            <Shadow r={r} />
            <g transform={`translate(0 ${r1(r * 0.1)}) rotate(-16)`}>
                {t.tone !== 1 && <path d={`M${r1(-pr * 1.6)} 0 A${r1(pr * 1.6)} ${r1(pr * 0.38)} 0 0 1 ${r1(pr * 1.6)} 0`} fill="none" stroke="#B4AAE8" strokeWidth="3" strokeLinecap="round" />}
                <circle r={pr} fill={body} />
                <path d={`M${r1(-pr * 0.95)} ${r1(pr * 0.3)} Q0 ${r1(pr * 0.6)} ${r1(pr * 0.95)} ${r1(pr * 0.3)}`} fill="none" stroke={shade} strokeWidth={r1(pr * 0.22)} strokeLinecap="round" />
                <circle cx={r1(-pr * 0.35)} cy={r1(-pr * 0.35)} r={r1(pr * 0.22)} fill="#FFFFFF" opacity="0.45" />
                {t.tone !== 1 && <path d={`M${r1(-pr * 1.6)} 0 A${r1(pr * 1.6)} ${r1(pr * 0.38)} 0 0 0 ${r1(pr * 1.6)} 0`} fill="none" stroke="#C9C1F0" strokeWidth="3" strokeLinecap="round" />}
            </g>
        </>
    );
}

function MoonRock({ t }: { t: MapTree }) {
    const { r } = t;
    return (
        <>
            <Shadow r={r} />
            <ellipse cx="0" cy={r1(r * 0.5)} rx={r1(r * 0.95)} ry={r1(r * 0.62)} fill="#D2CBEF" />
            <ellipse cx={r1(-r * 0.3)} cy={r1(r * 0.38)} rx={r1(r * 0.26)} ry={r1(r * 0.14)} fill="#BEB5E6" />
            <ellipse cx={r1(r * 0.35)} cy={r1(r * 0.62)} rx={r1(r * 0.2)} ry={r1(r * 0.1)} fill="#BEB5E6" />
            <ellipse cx={r1(r * 0.2)} cy={r1(r * 0.1)} rx={r1(r * 0.3)} ry={r1(r * 0.12)} fill="#E6E1F8" />
        </>
    );
}

function StarCluster({ t, calm }: { t: MapTree; calm: boolean }) {
    const { r } = t;
    return (
        <>
            <Sparkle x={0} y={0} s={r1(r * 0.55)} fill="#FFD34F" calm={calm} delay={t.tone * 0.8} />
            <Sparkle x={r * 0.7} y={r * 0.55} s={r1(r * 0.32)} fill="#A99DEB" calm={calm} delay={t.tone * 0.8 + 1} />
            <Sparkle x={-r * 0.65} y={r * 0.7} s={r1(r * 0.26)} fill="#FFD34F" calm={calm} delay={t.tone * 0.8 + 1.8} />
        </>
    );
}

/** Svemirska biljčica sa svetlom na vrhu (prijateljska, bez lica) */
function SpaceSprout({ t, calm }: { t: MapTree; calm: boolean }) {
    const { r } = t;
    const glow = ["#FFE27A", "#9FE6D6", "#F7B7C8"][t.tone];
    const base = r1(r + 4);
    return (
        <>
            <Shadow r={r} />
            <path d={`M0 ${base} C${r1(-r * 0.5)} ${r1(r * 0.2)} ${r1(r * 0.5)} ${r1(-r * 0.3)} 0 ${r1(-r * 0.8)}`} fill="none" stroke="#9C8FE0" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx={r1(-r * 0.35)} cy={r1(r * 0.45)} rx={r1(r * 0.32)} ry={r1(r * 0.13)} fill="#B8ADEE" transform={`rotate(-25 ${r1(-r * 0.35)} ${r1(r * 0.45)})`} />
            <ellipse cx={r1(r * 0.32)} cy={r1(r * 0.1)} rx={r1(r * 0.3)} ry={r1(r * 0.12)} fill="#B8ADEE" transform={`rotate(25 ${r1(r * 0.32)} ${r1(r * 0.1)})`} />
            <g opacity="0.5"><circle cx="0" cy={r1(-r * 0.85)} r={r1(r * 0.38)} fill={glow} className={moving(calm, "bmw-pulse")} /></g>
            <circle cx="0" cy={r1(-r * 0.85)} r={r1(r * 0.2)} fill={glow} />
        </>
    );
}

/** Mala raketa na postolju (ukras; prava raketa je cilj poslednjeg sveta) */
function MiniRocket({ t }: { t: MapTree }) {
    const s = r1(t.r / 18);
    return (
        <g transform={`translate(0 ${r1(t.r * 0.3)}) scale(${s})`}>
            <ellipse cx="0" cy="22" rx="18" ry="4" fill="#000" opacity="0.07" />
            <Rocket small />
        </g>
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

function Crystals({ t, tint = "ice" }: { t: MapTree; tint?: "ice" | "space" }) {
    const { r } = t;
    const [body, edge] = tint === "space" ? ["#E2D8FB", "#B39DEB"] : ["#C9ECFB", "#8FCDEE"];
    const crystal = (h: number, w: number, a: number, dx: number) => {
        const d = `M0 ${-h} L${w} ${-h + w * 1.3} L${w} 0 L0 ${w * 0.7} L${-w} 0 L${-w} ${-h + w * 1.3} Z`;
        const face = `M0 ${-h} L${-w} ${-h + w * 1.3} L${-w} 0 L0 ${w * 0.7} Z`;
        return (
            <g transform={`translate(${r1(dx)} ${r1(r + 2)}) rotate(${a})`}>
                <path d={d} fill={body} stroke={edge} strokeWidth="1.5" strokeLinejoin="round" />
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
    if (world === "forest") {
        // Most od oblica: balvani poprečno, ograda od užeta, mahovina
        return (
            <g transform={at}>
                <rect x="-44" y="-21" width="88" height="42" rx="9" fill="#8E6748" />
                {[-42, -28, -14, 0, 14, 28].map((px, i) => (
                    <g key={px}>
                        <rect x={px} y="-22" width="13" height="44" rx="6.5" fill={i % 2 === 0 ? "#B08560" : "#A47A55"} />
                        <path d={`M${px + 4} -14 V14`} stroke="#C9A77A" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                    </g>
                ))}
                <ellipse cx="-30" cy="18" rx="8" ry="3.5" fill="#7CBF8C" />
                <ellipse cx="22" cy="-19" rx="7" ry="3" fill="#7CBF8C" />
                {[-24, 24].map((py) => (
                    <path key={py} d={`M-42 ${py} Q-21 ${py + 4} 0 ${py} Q21 ${py + 4} 42 ${py}`} fill="none" stroke="#E3C79E" strokeWidth="3" strokeLinecap="round" />
                ))}
                {[-42, 0, 42].map((px) => (
                    <g key={px}>
                        <circle cx={px} cy="-24" r="5" fill="#7A5236" />
                        <circle cx={px} cy="24" r="5" fill="#7A5236" />
                    </g>
                ))}
            </g>
        );
    }
    // Kameni (pustinja, vulkan, more), ledeni ili svetleći (svemir) most: blokovi + ograde sa stubićima
    const look = {
        desert: { deck: "#E3C08A", block: "#EDD1A2", line: "#CFA56C", rail: "#C29560", post: "#B08350", glow: null as string | null, snow: false, stars: false },
        ocean: { deck: "#EAD3A6", block: "#F7E8C6", line: "#D8C391", rail: "#F4A9A0", post: "#FFFFFF", glow: null, snow: false, stars: false },
        volcano: { deck: "#A99487", block: "#BDAA9E", line: "#8E796E", rail: "#7D665B", post: "#6E5A52", glow: "#FFB04A", snow: false, stars: false },
        ice: { deck: "#CBEAFB", block: "#E4F5FE", line: "#9FD3F0", rail: "#9FD3F0", post: "#7CC0E8", glow: null, snow: true, stars: false },
        space: { deck: "#D6CEF8", block: "#EEEAFE", line: "#B3A9E6", rail: "#A99DEB", post: "#FFD34F", glow: "#C9C1F0", snow: false, stars: true },
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
            {[-40, 0, 40].map((px) =>
                look.stars ? (
                    <g key={px}>
                        <g transform={`translate(${px} -21.5)`}><path d={sparklePath(7)} fill={look.post} /></g>
                        <g transform={`translate(${px} 21.5)`}><path d={sparklePath(7)} fill={look.post} /></g>
                    </g>
                ) : (
                    <g key={px}>
                        {/* Biseri na morskom mostu imaju tanku ivicu, da se vide na pesku */}
                        <circle cx={px} cy="-21.5" r="5" fill={look.post} stroke={world === "ocean" ? "#E5B9C9" : "none"} strokeWidth="1.2" />
                        <circle cx={px} cy="21.5" r="5" fill={look.post} stroke={world === "ocean" ? "#E5B9C9" : "none"} strokeWidth="1.2" />
                    </g>
                )
            )}
        </g>
    );
}

// ── Početak puta ──────────────────────────────────────────────────────────────

const FLAG: Record<WorldId, string> = { meadow: "#22A06B", forest: "#9D8BE0", desert: "#E08A1E", ocean: "#F28B7E", volcano: "#F28C38", ice: "#F47C9C", space: "#FFB920" };

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

/** Kućica-pečurka: šešir sa tačkicama je krov, stablo je kuća */
function MushroomHouse({ x, y, cap, scale = 1 }: { x: number; y: number; cap: string; scale?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <ellipse cx="0" cy="22" rx="30" ry="5" fill="#000" opacity="0.07" />
            <path d="M-17 22 V-2 Q0 -6 17 -2 V22 Z" fill="#FFF4E4" stroke="#EAD7B7" strokeWidth="1.5" />
            <path d="M-31 -2 Q-28 -34 0 -36 Q28 -34 31 -2 Q0 4 -31 -2 Z" fill={cap} />
            <circle cx="-15" cy="-16" r="4.5" fill="#FFFFFF" />
            <circle cx="3" cy="-26" r="3.5" fill="#FFFFFF" />
            <circle cx="17" cy="-12" r="4" fill="#FFFFFF" />
            <circle cx="-2" cy="-10" r="2.6" fill="#FFFFFF" />
            <path d="M-6 22 V12 A6 6 0 0 1 6 12 V22 Z" fill="#9A7150" />
            <circle cx="10" cy="8" r="3.6" fill="#FFD98A" stroke="#EAD7B7" strokeWidth="1.2" />
        </g>
    );
}

/** Kućica od školjke: lepeza sa rebrima, okrugla vrata */
function ShellHouse({ x, y, color, line, scale = 1 }: { x: number; y: number; color: string; line: string; scale?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <ellipse cx="0" cy="22" rx="30" ry="5" fill="#000" opacity="0.07" />
            <path d="M0 22 L-28 4 Q-24 -26 0 -30 Q24 -26 28 4 Z" fill={color} stroke={line} strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M0 22 L-16 -24 M0 22 L0 -30 M0 22 L16 -24 M0 22 L-25 -10 M0 22 L25 -10" stroke={line} strokeWidth="1.6" strokeLinecap="round" />
            <rect x="-14" y="18" width="28" height="6" rx="3" fill={line} />
            <path d="M-6 22 V13 A6 6 0 0 1 6 13 V22 Z" fill="#2A8597" />
            <circle cx="20" cy="-30" r="3" fill="#FFFFFF" stroke="#A9D8EE" strokeWidth="1" />
            <circle cx="25" cy="-40" r="2" fill="#FFFFFF" stroke="#A9D8EE" strokeWidth="1" />
        </g>
    );
}

/** Kupola mesečeve baze sa antenom */
function MoonDome({ x, y, light, scale = 1 }: { x: number; y: number; light: string; scale?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <ellipse cx="0" cy="22" rx="32" ry="5" fill="#000" opacity="0.07" />
            <path d="M8 -20 L14 -32" stroke="#9C8FE0" strokeWidth="2" strokeLinecap="round" />
            <circle cx="14" cy="-33" r="3" fill={light} />
            <rect x="-28" y="12" width="56" height="10" rx="4" fill="#C9C1F0" stroke="#A99DEB" strokeWidth="1.5" />
            <path d="M-24 12 A24 26 0 0 1 24 12 Z" fill="#E4F2FC" stroke="#A9CFEA" strokeWidth="2" />
            <path d="M-16 4 A17 18 0 0 1 -2 -10" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
            <path d="M-7 12 V4 A7 7 0 0 1 7 4 V12 Z" fill="#8C82D9" />
            <circle cx="15" cy="16.5" r="2" fill={light} />
            <circle cx="-15" cy="16.5" r="2" fill={light} />
        </g>
    );
}

/** Početak puta na `layout.start`: selo, kućice-pečurke, šatori, kućice od školjki, kamene kućice, iglui ili mesečeva baza */
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
    if (world === "forest") {
        return (
            <g>
                <MushroomHouse x={x - 64} y={y + 4} cap="#F08A7E" scale={0.9} />
                <MushroomHouse x={x + 2} y={y - 10} cap="#B9A6EE" />
                <MushroomHouse x={x + 66} y={y + 8} cap="#F6A85F" scale={0.85} />
                {flag}
            </g>
        );
    }
    if (world === "ocean") {
        return (
            <g>
                <ShellHouse x={x - 64} y={y + 4} color="#FBD5C8" line="#EBAF9E" scale={0.9} />
                <ShellHouse x={x + 2} y={y - 10} color="#FFE3B3" line="#E9C27E" />
                <ShellHouse x={x + 66} y={y + 8} color="#E6DAFB" line="#C2B0EE" scale={0.85} />
                {flag}
            </g>
        );
    }
    if (world === "space") {
        return (
            <g>
                <MoonDome x={x - 64} y={y + 4} light="#FFD34F" scale={0.9} />
                <MoonDome x={x + 2} y={y - 10} light="#9FE6D6" />
                <MoonDome x={x + 66} y={y + 8} light="#F7B7C8" scale={0.85} />
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
    forest: { frame: "#A47A55", frameDark: "#7A5236", frameLight: "#C49A6C", door: "#6FAF8A", doorLight: "#94C7A8", doorDark: "#4E8A68" },
    ocean: { frame: "#F6C2B2", frameDark: "#DE9A86", frameLight: "#FCE0D6", door: "#45A9BC", doorLight: "#74C4D3", doorDark: "#2A8597" },
    space: { frame: "#BDB5EE", frameDark: "#8F84D6", frameLight: "#E0DBFA", door: "#5D57A8", doorLight: "#7E78C4", doorDark: "#423D86" },
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
    if (world === "forest") {
        return (
            <g>
                <rect x="-3" y="-4" width="6" height="10" rx="2.5" fill="#FFF4E4" />
                <path d="M-11 -3 Q0 -17 11 -3 Z" fill="#F08A7E" />
                <circle cx="-4" cy="-7" r="1.8" fill="#FFFFFF" />
                <circle cx="4" cy="-9" r="1.4" fill="#FFFFFF" />
            </g>
        );
    }
    if (world === "ocean") {
        return (
            <g>
                <path d="M-6 -2 L-14 -8 V4 Z" fill="#FFB36B" />
                <ellipse cx="2" cy="-2" rx="10" ry="6.5" fill="#FFB36B" />
                <circle cx="7" cy="-3.5" r="1.6" fill="#2F5F86" />
                <circle cx="12" cy="-13" r="2.4" fill="#FFFFFF" stroke="#A9D8EE" strokeWidth="1" />
            </g>
        );
    }
    if (world === "space") {
        return (
            <g transform="rotate(-14)">
                <path d="M-17 -2 A17 4.5 0 0 1 17 -2" fill="none" stroke="#B4AAE8" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="0" cy="-2" r="9" fill="#F6B88E" />
                <path d="M-17 -2 A17 4.5 0 0 0 17 -2" fill="none" stroke="#C9C1F0" strokeWidth="2.5" strokeLinecap="round" />
            </g>
        );
    }
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
    if (world === "forest") {
        // Drveni luk obrastao lozom: listići po luku, pečurke na stubovima, svitci
        const leaves = [195, 220, 245, 270, 295, 320, 345].map((a, i) => ({ x: r1(36 * Math.cos((a * Math.PI) / 180)), y: r1(-20 + 36 * Math.sin((a * Math.PI) / 180)), a: a + (i % 2 ? 40 : -40) }));
        return (
            <g>
                <path d="M-62 40 Q-48 20 -60 0 Q-70 -20 -54 -40 M60 40 Q50 18 62 -4 Q70 -24 56 -44" fill="none" stroke="#5FA97F" strokeWidth="3" strokeLinecap="round" />
                {leaves.map((l, i) => (
                    <ellipse key={i} cx={l.x} cy={l.y} rx="7" ry="3.8" fill={i % 2 ? "#6DB38A" : "#8FCBA3"} transform={`rotate(${l.a} ${l.x} ${l.y})`} />
                ))}
                {[-53, 53].map((cx, i) => (
                    <g key={cx} transform={`translate(${cx} -56)`}>
                        <rect x="-5" y="-12" width="10" height="12" rx="4" fill="#FFF4E4" />
                        <path d="M-17 -10 Q0 -34 17 -10 Q0 -6 -17 -10 Z" fill={i === 0 ? "#F08A7E" : "#B9A6EE"} />
                        <circle cx="-7" cy="-17" r="2.6" fill="#FFFFFF" />
                        <circle cx="4" cy="-22" r="2.2" fill="#FFFFFF" />
                        <circle cx="9" cy="-14" r="1.8" fill="#FFFFFF" />
                    </g>
                ))}
                <Sparkle x={-30} y={-72} s={5} fill="#FFE27A" calm={calm} />
                <Sparkle x={30} y={-66} s={4} fill="#FFE27A" calm={calm} delay={1.2} />
                <Sparkle x={-74} y={-6} s={3.5} fill="#FFE27A" calm={calm} delay={2} />
            </g>
        );
    }
    if (world === "ocean") {
        // Koralni luk: biseri po luku, školjke i morske zvezde na stubovima, mehurići
        const pearls = [190, 210, 230, 250, 270, 290, 310, 330, 350].map((a) => ({ x: r1(35 * Math.cos((a * Math.PI) / 180)), y: r1(-20 + 35 * Math.sin((a * Math.PI) / 180)) }));
        return (
            <g>
                {pearls.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3.4" fill="#FFFFFF" stroke="#E5B9C9" strokeWidth="1.2" />
                ))}
                <g fill="none" strokeLinecap="round" strokeWidth="4">
                    <path d="M-72 44 q-6 -12 0 -22 q6 -10 0 -20" stroke="#6CC09B" className={moving(calm, "bmw-sway")} />
                    <path d="M72 44 q6 -10 0 -18 q-6 -8 0 -16" stroke="#58B48D" className={moving(calm, "bmw-sway")} style={calm ? undefined : { animationDelay: "1.6s" }} />
                </g>
                <g transform="translate(-53 -76)">
                    <path d="M0 12 L-13 0 Q-10 -12 0 -14 Q10 -12 13 0 Z" fill="#FBD5C8" stroke="#EBAF9E" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M0 12 L-7 -11 M0 12 V-14 M0 12 L7 -11" stroke="#EBAF9E" strokeWidth="1.3" strokeLinecap="round" />
                </g>
                <g transform="translate(53 -72)">
                    <path d={`M${Array.from({ length: 10 }, (_, i) => {
                        const a = -Math.PI / 2 + (i * Math.PI) / 5;
                        const rad = i % 2 === 0 ? 13 : 5.5;
                        return `${r1(Math.cos(a) * rad)} ${r1(Math.sin(a) * rad)}`;
                    }).join(" L")} Z`} fill="#FFB36B" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
                </g>
                {[
                    { x: -24, y: -66, r: 4 },
                    { x: -18, y: -80, r: 2.8 },
                    { x: 24, y: -84, r: 3.4 },
                ].map((b, i) => (
                    <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="#F2FBFF" stroke="#A9D8EE" strokeWidth="1.2" className={moving(calm, "bmw-rise")} style={calm ? undefined : { animationDelay: `${i * 1.5}s` }} />
                ))}
            </g>
        );
    }
    if (world === "space") {
        // Kapija od mesečevog kamena: zvezdice po luku, male planete na stubovima
        const stars = [200, 235, 270, 305, 340].map((a) => ({ x: r1(35 * Math.cos((a * Math.PI) / 180)), y: r1(-20 + 35 * Math.sin((a * Math.PI) / 180)) }));
        return (
            <g>
                {stars.map((p, i) => (
                    <g key={i} transform={`translate(${p.x} ${p.y})`}>
                        <path d={sparklePath(5)} fill="#FFD34F" />
                    </g>
                ))}
                {[
                    { x: -58, y: -20, r: 4 },
                    { x: 58, y: 10, r: 3.5 },
                    { x: -58, y: 26, r: 3 },
                ].map((c, i) => (
                    <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="#E0DBFA" stroke="#8F84D6" strokeWidth="1" />
                ))}
                <g transform="translate(-53 -78) rotate(-14)">
                    <path d="M-17 0 A17 4.5 0 0 1 17 0" fill="none" stroke="#8F84D6" strokeWidth="2.5" strokeLinecap="round" />
                    <circle r="10" fill="#F6B88E" />
                    <path d="M-17 0 A17 4.5 0 0 0 17 0" fill="none" stroke="#B4AAE8" strokeWidth="2.5" strokeLinecap="round" />
                </g>
                <g transform="translate(53 -78)">
                    <circle r="10" fill="#9FC9F2" />
                    <path d="M-9 3 Q0 7 9 3" fill="none" stroke="#86B6E8" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="-3" cy="-3" r="2.4" fill="#FFFFFF" opacity="0.5" />
                </g>
                <Sparkle x={0} y={-74} s={6} fill="#FFFFFF" calm={calm} />
                <Sparkle x={-30} y={-90} s={4} fill="#FFD34F" calm={calm} delay={1.3} />
                <Sparkle x={32} y={-96} s={3.5} fill="#FFFFFF" calm={calm} delay={2.1} />
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
            {world !== "meadow" && world !== "forest" && (
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

// ── Cilj sa blagom (poslednji svet): dvorac, a u svemiru raketa ───────────────

const CASTLE: Record<Exclude<WorldId, "space">, { wall: string; wallStroke: string; tower: string; towerStroke: string; roof: string; roofMain: string; window: string; flag: string; snow: boolean }> = {
    meadow: { wall: "#EDE9FA", wallStroke: "#D7D0F2", tower: "#E4DEF8", towerStroke: "#D0C8F0", roof: "#8A82F7", roofMain: "#6C61F0", window: "#BFE3F5", flag: "#FFB920", snow: false },
    forest: { wall: "#EEE4D3", wallStroke: "#D2BE9C", tower: "#E6D8C0", towerStroke: "#CBB38E", roof: "#6DB38A", roofMain: "#4E9C77", window: "#FFE08A", flag: "#B9A6EE", snow: false },
    ocean: { wall: "#FCE6DC", wallStroke: "#EDBFAE", tower: "#F9DCCF", towerStroke: "#E6B19F", roof: "#45A9BC", roofMain: "#2A8597", window: "#BFEAF2", flag: "#FFB36B", snow: false },
    desert: { wall: "#F6E3BC", wallStroke: "#E0C08A", tower: "#F1D9A8", towerStroke: "#DDB97E", roof: "#E9A15C", roofMain: "#DD8A3E", window: "#9FDCD6", flag: "#5CC2BA", snow: false },
    volcano: { wall: "#DCC7BB", wallStroke: "#BFA698", tower: "#D2BAAC", towerStroke: "#B89C8D", roof: "#F4A04E", roofMain: "#EE8A3A", window: "#FFD98A", flag: "#FFD166", snow: false },
    ice: { wall: "#F2FAFF", wallStroke: "#BFE0F4", tower: "#E3F3FD", towerStroke: "#A9D6F0", roof: "#7CC4F0", roofMain: "#4FA8E0", window: "#A9DCF7", flag: "#F47C9C", snow: true },
};

function FinalCastle({ uid, world, x, y, state, calm }: { uid: string; world: WorldId; x: number; y: number; state: GateState; calm: boolean }) {
    if (world === "space") return <FinalRocket x={x} y={y} state={state} calm={calm} />;
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

/**
 * Raketa (poslednji svet je uvek svemir): raketa na postolju pored velike planete, iste
 * veličine i na istom mestu kao dvorac, sa istim kovčegom blaga ispred. Otvoreno: prozor
 * rakete svetli toplo žuto i iza su zrake (bez plamena i poletanja: kraj je miran).
 */
function FinalRocket({ x, y, state, calm }: { x: number; y: number; state: GateState; calm: boolean }) {
    const open = state === "open";
    return (
        <g>
            <style>{WORLD_STYLE}</style>
            <g transform={`translate(${x} ${y - 20})`}>
                {open && <Rays cx={0} cy={-10} length={118} calm={calm} />}
                <ellipse cx="0" cy="62" rx="86" ry="10" fill="#000" opacity="0.07" />
                {/* Planeta sa prstenom levo, raketa na postolju desno, kovčeg napred u sredini */}
                <g transform="translate(-42 -34) rotate(-14)">
                    <path d="M-46 0 A46 10 0 0 1 46 0" fill="none" stroke="#B4AAE8" strokeWidth="5" strokeLinecap="round" />
                    <circle r="29" fill="#F6B88E" />
                    <path d="M-28 -9 Q0 -3 28 -9 L29 -5 Q0 1 -29 -5 Z" fill="#FAD0AE" />
                    <path d="M-26 12 Q0 18 26 12 L24 16 Q0 22 -24 16 Z" fill="#EFA57C" />
                    <circle cx="-10" cy="-13" r="6" fill="#FCDCC2" opacity="0.8" />
                    <path d="M-46 0 A46 10 0 0 0 46 0" fill="none" stroke="#C9C1F0" strokeWidth="5" strokeLinecap="round" />
                </g>
                <g transform="translate(-6 -94)">
                    <circle r="10" fill="#EEEBFA" stroke="#CFC8F0" strokeWidth="1.5" />
                    <circle cx="-3" cy="-2.5" r="2.6" fill="#DAD4F3" />
                    <circle cx="3.5" cy="3.5" r="1.8" fill="#DAD4F3" />
                </g>
                <Sparkle x={-78} y={-88} s={5} fill="#FFD34F" calm={calm} />
                <Sparkle x={-80} y={20} s={4} fill="#A99DEB" calm={calm} delay={1.1} />
                <Sparkle x={80} y={-70} s={3.5} fill="#FFD34F" calm={calm} delay={1.9} />
                {/* Postolje */}
                <path d="M8 60 L16 46 H64 L72 60 Z" fill="#C9C1F0" stroke="#A99DEB" strokeWidth="2" strokeLinejoin="round" />
                <path d="M22 52 H58" stroke="#E0DBFA" strokeWidth="3" strokeLinecap="round" />
                {/* Raketa: ista kao mala, samo veća */}
                <g transform="translate(40 17) scale(1.4)">
                    <Rocket lit={open} calm={calm} />
                </g>
            </g>
            <TreasureChest x={x} y={y + 58} state={state} calm={calm} />
        </g>
    );
}

/**
 * Raketa (dno peraja na y = 20, vrh na y = −42). `lit` — prozor svetli i oko rakete je mek
 * sjaj; `small` — za ukras na mapi (tanje linije).
 */
function Rocket({ small = false, lit = false, calm = true }: { small?: boolean; lit?: boolean; calm?: boolean }) {
    const line = small ? 1.4 : 2;
    return (
        <g>
            {lit && (
                <g opacity="0.5">
                    <ellipse cx="0" cy="-10" rx="24" ry="36" fill="#FFF1A8" className={moving(calm, "bmw-pulse")} />
                </g>
            )}
            <path d="M-11 4 L-21 20 H-9 Z" fill="#F47C9C" />
            <path d="M11 4 L21 20 H9 Z" fill="#F47C9C" />
            <rect x="-6.5" y="15" width="13" height="5" rx="1.5" fill="#B4AAE8" />
            <path d="M-11 16 V-14 Q-11 -32 0 -42 Q11 -32 11 -14 V16 Z" fill="#FFFFFF" stroke="#CFC8F0" strokeWidth={line} strokeLinejoin="round" />
            <path d="M-8.6 -26 Q-6 -36 0 -42 Q6 -36 8.6 -26 Z" fill="#F47C9C" />
            <rect x="-11" y="3" width="22" height="4" fill="#E0DBFA" />
            <circle cx="0" cy="-12" r="6" fill={lit ? "#FFF1A8" : "#9FD3F5"} stroke="#8C82D9" strokeWidth={small ? 2 : 2.5} />
            <circle cx="-2" cy="-14" r="1.8" fill="#FFFFFF" opacity="0.8" />
            <path d="M0 7 V16" stroke="#F47C9C" strokeWidth={line} strokeLinecap="round" />
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
    if (world === "forest") {
        return (
            <g>
                <rect width="64" height="64" fill="#DDEFE6" />
                <ellipse cx="32" cy="64" rx="40" ry="14" fill="#A9D4B4" />
                <rect x="13" y="30" width="4.5" height="18" rx="2" fill="#9A7150" />
                <ellipse cx="15" cy="24" rx="11" ry="17" fill="#4E9C77" />
                <ellipse cx="12" cy="18" rx="4" ry="7" fill="#78BE98" />
                <rect x="46" y="28" width="4.5" height="18" rx="2" fill="#9A7150" />
                <ellipse cx="48" cy="22" rx="10" ry="15" fill="#5AAA84" />
                <rect x="28" y="42" width="8" height="10" rx="3" fill="#FFF4E4" />
                <path d="M20 44 Q32 26 44 44 Q32 47 20 44 Z" fill="#F08A7E" />
                <circle cx="27" cy="38" r="2.4" fill="#FFFFFF" />
                <circle cx="36" cy="35" r="2" fill="#FFFFFF" />
                <circle cx="39" cy="41" r="1.6" fill="#FFFFFF" />
                <circle cx="31" cy="13" r="2" fill="#FFE27A" />
                <circle cx="54" cy="44" r="1.6" fill="#FFE27A" />
            </g>
        );
    }
    if (world === "ocean") {
        return (
            <g>
                <rect width="64" height="64" fill="#CDEFF5" />
                <ellipse cx="32" cy="66" rx="44" ry="14" fill="#F7EBCB" />
                <path d="M12 56 q-5 -8 0 -16 q5 -8 0 -16" fill="none" stroke="#58B48D" strokeWidth="4" strokeLinecap="round" />
                <path d="M52 58 V44 M52 50 l5 -5 M52 52 l-4 -4" fill="none" stroke="#F4A9A0" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M26 30 L16 23 V37 Z" fill="#FFB36B" />
                <ellipse cx="34" cy="30" rx="12" ry="8" fill="#FFB36B" />
                <path d="M32 22 Q36 16 40 23 Z" fill="#FFB36B" />
                <circle cx="40" cy="28" r="2" fill="#2F5F86" />
                <circle cx="48" cy="17" r="3" fill="#FFFFFF" stroke="#8FCDE0" strokeWidth="1" />
                <circle cx="52" cy="9" r="2" fill="#FFFFFF" stroke="#8FCDE0" strokeWidth="1" />
            </g>
        );
    }
    if (world === "space") {
        return (
            <g>
                <rect width="64" height="64" fill="#5A52A8" />
                <circle cx="12" cy="14" r="1.6" fill="#FFFFFF" />
                <circle cx="52" cy="50" r="1.4" fill="#FFFFFF" />
                <circle cx="16" cy="50" r="1.2" fill="#FFFFFF" />
                <g transform="translate(48 15)">
                    <path d={sparklePath(5)} fill="#FFD34F" />
                </g>
                <g transform="translate(30 36) rotate(-16)">
                    <path d="M-25 0 A25 6 0 0 1 25 0" fill="none" stroke="#B4AAE8" strokeWidth="3.5" strokeLinecap="round" />
                    <circle r="14" fill="#F6B88E" />
                    <path d="M-13.5 -4 Q0 -1 13.5 -4 L14 -1 Q0 2 -14 -1 Z" fill="#FAD0AE" />
                    <path d="M-25 0 A25 6 0 0 0 25 0" fill="none" stroke="#E0DBFA" strokeWidth="3.5" strokeLinecap="round" />
                </g>
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
