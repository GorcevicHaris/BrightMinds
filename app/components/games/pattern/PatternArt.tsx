// Crteži za igru „Šta dolazi sledeće?”: nosači niza (voz sa lokomotivom, gusenica, perle na
// kanapu, baloni, kartice na konopcu), stvari u nizu (boje sa znakom, oblici, slike, brojevi,
// tačkice, strelice, sat) i četiri vesela dinosaurusa u stilu zajedničkih slika (pictures/):
// obli oblici, tanka tamnija ivica, oči sa sjajem i rumeni obrazi, bez zuba i kandži.
//
// Svako mesto u nizu je kvadrat širine 100 (visina zavisi od nosača). Mesto ima dva sloja:
// podlogu (točkovi, nožice, kanap, kartica) i samu stvar u svom okviru (`itemBox`) — stvar se
// crta isto i na kartici izbora, pa kad je izbor tačan, ista slika doleti tačno na svoje mesto.

import type { ReactNode } from "react";
import { Picture, type PictureId } from "@/app/components/games/pictures";
import { Cheek, Eye, INK, line, Shadow, Shine, Smile } from "@/app/components/games/pictures/kit";
import { SHAPE_PATHS } from "@/app/components/games/kit/shapePaths";
import { COLORS, parseItem, type CarrierId, type ColorId, type GlyphId, type ParsedItem, type ShapeId } from "@/app/components/games/data/patternLevels";

// ── Dinosaurusi ───────────────────────────────────────────────────────────────

export const DINO_ART: Record<string, () => ReactNode> = {
    // Brontosaurus: dugačak vrat, zelen, sa tačkama na leđima
    bronto: () => (
        <g>
            <Shadow cy={93} rx={38} />
            <path d="M24 66 Q10 70 3 60 Q12 64 24 58Z" fill="#6cbf5c" {...line("#3f8a36")} />
            <g fill="#5daf4e" {...line("#3f8a36")}>
                <rect x={24} y={70} width={11} height={20} rx={5} />
                <rect x={60} y={70} width={11} height={20} rx={5} />
            </g>
            <path d="M18 66 Q18 44 44 44 Q64 44 72 54 L76 34 Q77 16 84 14 Q96 12 96 22 Q96 30 86 31 Q84 44 82 64 Q80 82 50 82 Q20 82 18 66Z" fill="#7cc96a" {...line("#3f8a36")} />
            <g fill="#6cbf5c" {...line("#3f8a36")}>
                <rect x={32} y={72} width={11} height={19} rx={5} />
                <rect x={68} y={70} width={11} height={20} rx={5} />
            </g>
            <path d="M26 72 Q48 80 74 70 Q70 78 50 79 Q32 79 26 72Z" fill="#c9eeb8" />
            <g fill="#4f9e41" opacity={0.6}>
                <circle cx={36} cy={52} r={3.6} />
                <circle cx={48} cy={49} r={3} />
                <circle cx={58} cy={53} r={3.4} />
            </g>
            <Eye x={88} y={20} r={2.8} />
            <Cheek x={91} y={26} r={2.4} />
            <path d="M86 27 Q90 29 94 26" fill="none" {...line(INK, 1.3)} />
            <Shine x={34} y={50} rx={3} ry={7} rotate={70} opacity={0.35} />
        </g>
    ),
    // Triceratops: narandžast, sa okovratnikom i tri tupa roga
    tricera: () => (
        <g>
            <Shadow cy={93} rx={36} />
            <path d="M18 66 Q6 64 3 54 Q12 60 20 58Z" fill="#f2a14a" {...line("#b8661a")} />
            <g fill="#e2903a" {...line("#b8661a")}>
                <rect x={22} y={70} width={11} height={20} rx={5} />
                <rect x={50} y={70} width={11} height={20} rx={5} />
            </g>
            <ellipse cx={40} cy={62} rx={28} ry={20} fill="#f5ad58" {...line("#b8661a")} />
            <g fill="#f2a14a" {...line("#b8661a")}>
                <rect x={30} y={72} width={11} height={19} rx={5} />
                <rect x={58} y={70} width={11} height={20} rx={5} />
            </g>
            <path d="M58 30 Q66 18 78 22 Q90 26 90 38 Q86 52 74 56 Q60 52 58 30Z" fill="#fbd29a" {...line("#b8661a")} />
            <g fill="#f08a6a" opacity={0.7}>
                <circle cx={66} cy={28} r={2.6} />
                <circle cx={78} cy={26} r={2.6} />
                <circle cx={86} cy={34} r={2.6} />
            </g>
            <path d="M62 50 Q62 38 76 38 Q92 38 94 52 Q94 64 80 66 Q66 66 62 50Z" fill="#f5ad58" {...line("#b8661a")} />
            <path d="M72 40 Q72 30 80 24 Q78 34 78 40Z M82 40 Q86 30 94 28 Q90 36 87 42Z M92 50 Q98 46 99 42 Q99 50 95 54Z" fill="#fff4dc" {...line("#b8661a", 1.3)} />
            <Eye x={78} y={48} r={2.8} />
            <Cheek x={83} y={56} r={2.6} />
            <path d="M84 60 Q89 62 93 58" fill="none" {...line(INK, 1.3)} />
            <path d="M24 68 Q40 78 60 70 Q54 78 40 79 Q28 78 24 68Z" fill="#fde0b8" opacity={0.8} />
            <Shine x={30} y={52} rx={3} ry={7} rotate={70} opacity={0.35} />
        </g>
    ),
    // Stegosaurus: plav, sa okruglim pločama na leđima
    stego: () => (
        <g>
            <Shadow cy={93} rx={38} />
            <g fill="#f6c96a" {...line("#c2902a", 1.4)}>
                <path d="M22 50 Q20 36 28 34 Q34 40 32 50Z" />
                <path d="M32 44 Q32 26 42 24 Q48 32 44 44Z" />
                <path d="M46 42 Q48 24 58 26 Q62 34 56 44Z" />
                <path d="M60 46 Q64 32 72 36 Q74 44 66 50Z" />
            </g>
            <path d="M16 66 Q6 62 4 52 L9 56 L10 48 L14 56 Q16 60 22 60Z" fill="#5aa7e0" {...line("#2e6fa3")} />
            <g fill="#4a97d0" {...line("#2e6fa3")}>
                <rect x={22} y={70} width={11} height={20} rx={5} />
                <rect x={54} y={70} width={11} height={20} rx={5} />
            </g>
            <path d="M16 66 Q16 44 44 44 Q70 44 78 60 Q84 56 90 60 Q96 66 90 72 Q84 76 76 72 Q66 82 44 82 Q18 82 16 66Z" fill="#62b0e8" {...line("#2e6fa3")} />
            <g fill="#5aa7e0" {...line("#2e6fa3")}>
                <rect x={30} y={72} width={11} height={19} rx={5} />
                <rect x={62} y={70} width={11} height={20} rx={5} />
            </g>
            <path d="M22 70 Q44 80 70 72 Q64 79 44 79 Q28 79 22 70Z" fill="#cfe8fa" />
            <Eye x={88} y={64} r={2.6} />
            <Cheek x={91} y={70} r={2.2} />
            <path d="M86 70 Q89 72 92 70" fill="none" {...line(INK, 1.2)} />
            <Shine x={32} y={52} rx={3} ry={7} rotate={70} opacity={0.35} />
        </g>
    ),
    // Tiranosaurus: ljubičast i nasmejan, uspravan, sa malim rukama (bez zuba)
    rex: () => (
        <g>
            <Shadow cy={93} rx={30} />
            <path d="M30 70 Q14 78 4 90 Q20 88 36 80Z" fill="#a983e6" {...line("#6a48b0")} />
            <rect x={34} y={70} width={12} height={21} rx={5} fill="#9a72dc" {...line("#6a48b0")} />
            <path d="M28 62 Q26 38 46 34 Q60 32 62 48 Q66 66 58 78 Q48 86 36 82 Q28 76 28 62Z" fill="#b590ee" {...line("#6a48b0")} />
            <rect x={48} y={72} width={12} height={20} rx={5} fill="#a983e6" {...line("#6a48b0")} />
            <path d="M36 50 Q46 46 52 56 Q56 70 46 80 Q38 76 36 64Z" fill="#e6d8fb" />
            <path d="M40 14 Q40 6 54 6 Q80 6 88 14 Q94 20 92 30 Q90 40 76 40 Q62 40 54 42 Q44 42 40 34Z" fill="#b590ee" {...line("#6a48b0")} />
            <path d="M58 32 Q72 36 88 30" fill="none" {...line(INK, 1.5)} />
            <path d="M58 52 Q66 52 66 58 M56 60 Q63 62 62 67" fill="none" {...line("#6a48b0", 2.6)} />
            <g fill="#9a72dc" opacity={0.55}>
                <circle cx={36} cy={44} r={2.6} />
                <circle cx={32} cy={56} r={2.2} />
            </g>
            <Eye x={60} y={18} r={3.2} />
            <Cheek x={68} y={26} r={3} />
            <circle cx={84} cy={16} r={1.2} fill={INK} opacity={0.5} />
            <Shine x={50} y={12} rx={3} ry={6} rotate={70} opacity={0.4} />
        </g>
    ),
};

/** Slika iz zajedničkog kompleta ili dinosaurus iz ove igre, u kvadratu (x, y, s) */
function PictureAt({ id, x, y, s }: { id: string; x: number; y: number; s: number }) {
    const dino = DINO_ART[id];
    if (dino) {
        return (
            <svg x={x} y={y} width={s} height={s} viewBox="0 0 100 100" overflow="visible">
                {dino()}
            </svg>
        );
    }
    return <Picture id={id as PictureId} x={x} y={y} width={s} height={s} />;
}

// ── Okvir stvari u mestu ──────────────────────────────────────────────────────

export interface Box {
    x: number;
    y: number;
    s: number;
}

/** Visina mesta (širina je uvek 100) */
export const SLOT_HEIGHT: Readonly<Record<CarrierId, number>> = {
    train: 100,
    caterpillar: 100,
    beads: 100,
    balloons: 136,
    line: 112,
};

/** Okvir stvari u mestu (kvadrat) — isti okvir je i slika na kartici izbora */
export function itemBox(carrier: CarrierId): Box {
    switch (carrier) {
        case "train":
            return { x: 15, y: 4, s: 70 };
        case "caterpillar":
            return { x: -4, y: -6, s: 108 };
        case "beads":
            return { x: 9, y: 9, s: 82 };
        case "balloons":
            return { x: 4, y: 0, s: 92 };
        case "line":
            return { x: 9, y: 22, s: 82 };
    }
}

// ── Znak boje (za decu koja boje slabije razlikuju) ───────────────────────────

const GLYPH_SHAPE: Record<GlyphId, keyof typeof SHAPE_PATHS> = {
    dot: "circle",
    square: "square",
    star: "star",
    triangle: "triangle",
    heart: "heart",
    diamond: "diamond",
};

function Glyph({ color, cx, cy, size }: { color: ColorId; cx: number; cy: number; size: number }) {
    const info = COLORS[color];
    const scale = size / 100;
    // Na žutoj je znak taman (beo se ne bi video), na ostalim beo
    const fill = color === "yellow" ? info.edge : "#ffffff";
    return (
        <g transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})`} opacity={color === "yellow" ? 0.75 : 0.92}>
            {SHAPE_PATHS[GLYPH_SHAPE[info.glyph]].map((d, i) => (
                <path key={i} d={d} fill={fill} />
            ))}
        </g>
    );
}

function ShapePath({ shape, color, box }: { shape: ShapeId; color: ColorId; box: Box }) {
    const info = COLORS[color];
    const scale = box.s / 100;
    return (
        <g transform={`translate(${box.x} ${box.y}) scale(${scale})`}>
            {SHAPE_PATHS[shape].map((d, i) => (
                <path key={i} d={d} fill={info.fill} stroke={info.edge} strokeWidth={4 / Math.max(scale, 0.4)} strokeLinejoin="round" />
            ))}
            <ellipse cx={34} cy={34} rx={6} ry={12} fill="#ffffff" opacity={0.4} transform="rotate(35 34 34)" />
        </g>
    );
}

// ── Tačkice (kao na kocki) ────────────────────────────────────────────────────

const PIPS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
    7: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [2, 2]],
    8: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    9: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
};

const STAR_D = SHAPE_PATHS.star[0];

function Pips({ n, star, box }: { n: number; star: boolean; box: Box }) {
    const cell = box.s / 3;
    return (
        <g>
            {(PIPS[n] ?? []).map(([col, row], i) => {
                const cx = box.x + cell * (col + 0.5);
                const cy = box.y + cell * (row + 0.5);
                if (star) {
                    const size = cell * 0.95;
                    return (
                        <g key={i} transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${size / 100})`}>
                            <path d={STAR_D} fill="#f6c518" stroke="#b38a0a" strokeWidth={7} strokeLinejoin="round" />
                        </g>
                    );
                }
                return <circle key={i} cx={cx} cy={cy} r={cell * 0.3} fill="#6a35ad" />;
            })}
        </g>
    );
}

// ── Strelica i sat ────────────────────────────────────────────────────────────

function ArrowSign({ quarter, box }: { quarter: number; box: Box }) {
    return (
        <g transform={`translate(${box.x} ${box.y}) scale(${box.s / 100})`}>
            <circle cx={50} cy={50} r={46} fill="#ffffff" stroke="#8c62d2" strokeWidth={5} />
            <g transform={`rotate(${quarter * 90} 50 50)`}>
                <path d="M50 12 L76 42 H60 V84 H40 V42 H24Z" fill="#e5484d" stroke="#a8282d" strokeWidth={3.5} strokeLinejoin="round" />
            </g>
        </g>
    );
}

function ClockFace({ quarter, box }: { quarter: number; box: Box }) {
    return (
        <g transform={`translate(${box.x} ${box.y}) scale(${box.s / 100})`}>
            <circle cx={50} cy={50} r={46} fill="#fffdf6" stroke="#3e7bfa" strokeWidth={6} />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                const a = (h * Math.PI) / 6;
                const big = h % 3 === 0;
                const r1 = big ? 32 : 36;
                return <line key={h} x1={50 + Math.sin(a) * r1} y1={50 - Math.cos(a) * r1} x2={50 + Math.sin(a) * 40} y2={50 - Math.cos(a) * 40} stroke="#57537a" strokeWidth={big ? 5 : 2.5} strokeLinecap="round" />;
            })}
            <g transform={`rotate(${quarter * 90} 50 50)`}>
                <path d="M50 54 L50 16" stroke="#e5484d" strokeWidth={7} strokeLinecap="round" />
                <path d="M42 22 L50 10 L58 22Z" fill="#e5484d" stroke="#e5484d" strokeWidth={3} strokeLinejoin="round" />
            </g>
            <circle cx={50} cy={50} r={6} fill="#3a3a5a" />
        </g>
    );
}

// ── Stvar u okviru ────────────────────────────────────────────────────────────

/** Boja kao komad nosača: sanduk na vozu, deo gusenice, perla, balon */
function ColorPiece({ color, carrier, box }: { color: ColorId; carrier: CarrierId; box: Box }) {
    const info = COLORS[color];
    const { x, y, s } = box;
    const cx = x + s / 2;
    const cy = y + s / 2;
    if (carrier === "train") {
        return (
            <g>
                <rect x={x + 3} y={y + 8} width={s - 6} height={s - 8} rx={7} fill={info.fill} stroke={info.edge} strokeWidth={2.4} />
                <path d={`M${x + 8} ${y + 24} H${x + s - 8} M${x + 8} ${y + s - 14} H${x + s - 8}`} stroke={info.light} strokeWidth={2.4} strokeLinecap="round" opacity={0.75} />
                <Glyph color={color} cx={cx} cy={y + 8 + (s - 8) / 2} size={s * 0.34} />
            </g>
        );
    }
    if (carrier === "balloons") {
        const rx = s * 0.4;
        const ry = s * 0.47;
        const by = y + ry + 2;
        return (
            <g>
                <path d={`M${cx - 5} ${by + ry + 5} L${cx} ${by + ry - 2} L${cx + 5} ${by + ry + 5}Z`} fill={info.fill} stroke={info.edge} strokeWidth={2} strokeLinejoin="round" />
                <ellipse cx={cx} cy={by} rx={rx} ry={ry} fill={info.fill} stroke={info.edge} strokeWidth={2.4} />
                <Shine x={cx - rx * 0.45} y={by - ry * 0.4} rx={rx * 0.14} ry={ry * 0.26} rotate={25} opacity={0.5} />
                <Glyph color={color} cx={cx + 2} cy={by + 4} size={s * 0.32} />
            </g>
        );
    }
    const r = s / 2 - (carrier === "caterpillar" ? 2 : 1.5);
    return (
        <g>
            <circle cx={cx} cy={cy} r={r} fill={info.fill} stroke={info.edge} strokeWidth={2.4} />
            {carrier === "caterpillar" && <path d={`M${cx - r * 0.75} ${cy + r * 0.45} Q${cx} ${cy + r * 0.95} ${cx + r * 0.75} ${cy + r * 0.45}`} fill="none" stroke={info.light} strokeWidth={2.2} opacity={0.6} strokeLinecap="round" />}
            <Shine x={cx - r * 0.42} y={cy - r * 0.42} rx={r * 0.13} ry={r * 0.26} rotate={40} opacity={0.5} />
            <Glyph color={color} cx={cx} cy={cy} size={r * 0.78} />
        </g>
    );
}

/** Pločica sa brojem / kocka sa tačkicama / znak (na vozu kao tovar; na kartici bez okvira) */
function Tile({ carrier, box, children }: { carrier: CarrierId; box: Box; children: ReactNode }) {
    if (carrier !== "train") return <>{children}</>;
    return (
        <g>
            <rect x={box.x + 2} y={box.y + 4} width={box.s - 4} height={box.s - 4} rx={12} fill="#fffdf6" stroke="#c3a6ee" strokeWidth={3} />
            {children}
        </g>
    );
}

/** Stvar iz niza u kvadratnom okviru `box` (isti crtež na mestu u nizu i na kartici izbora) */
export function ItemArt({ id, carrier, box }: { id: string; carrier: CarrierId; box: Box }) {
    const item = parseItem(id);
    if (!item) return null;
    return <ItemShape item={item} carrier={carrier} box={box} />;
}

function inset(box: Box, k: number): Box {
    return { x: box.x + box.s * k, y: box.y + box.s * k, s: box.s * (1 - 2 * k) };
}

function ItemShape({ item, carrier, box }: { item: ParsedItem; carrier: CarrierId; box: Box }) {
    switch (item.kind) {
        case "color":
            return <ColorPiece color={item.color as ColorId} carrier={carrier} box={box} />;
        case "shape":
            return <ShapePath shape={item.shape as ShapeId} color={item.color as ColorId} box={inset(box, carrier === "beads" ? 0.02 : 0.06)} />;
        case "picture":
            return <PictureAt id={item.picture as string} x={box.x} y={box.y} s={box.s} />;
        case "number": {
            const text = String(item.value ?? "");
            return (
                <Tile carrier={carrier} box={box}>
                    <text
                        x={box.x + box.s / 2}
                        y={box.y + box.s / 2 + (carrier === "train" ? 2 : 0)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={box.s * (text.length > 1 ? 0.5 : 0.62)}
                        fontWeight={900}
                        fontFamily="var(--font-baloo), var(--font-nunito), ui-rounded, system-ui, sans-serif"
                        fill="#5f3b96"
                    >
                        {text}
                    </text>
                </Tile>
            );
        }
        case "dots":
        case "stars":
            return (
                <Tile carrier={carrier} box={box}>
                    <Pips n={item.value ?? 1} star={item.kind === "stars"} box={inset(box, carrier === "train" ? 0.1 : 0.04)} />
                </Tile>
            );
        case "arrow":
            return <ArrowSign quarter={item.value ?? 0} box={inset(box, 0.04)} />;
        case "clock":
            return <ClockFace quarter={item.value ?? 0} box={inset(box, 0.04)} />;
    }
}

// ── Prazno mesto „?” ──────────────────────────────────────────────────────────

export function GapMark({ carrier, kind, box, className }: { carrier: CarrierId; kind: ParsedItem["kind"] | undefined; box: Box; className?: string }) {
    const { x, y, s } = box;
    const cx = x + s / 2;
    const cy = y + s / 2;
    const dash = { fill: "#ffffff", fillOpacity: 0.75, stroke: "#a782e2", strokeWidth: 3, strokeDasharray: "7 6", strokeLinecap: "round" as const };
    let outline: ReactNode;
    let qy = cy;
    if (carrier === "balloons" && kind === "color") {
        const rx = s * 0.4;
        const ry = s * 0.47;
        qy = y + ry + 2;
        outline = <ellipse cx={cx} cy={qy} rx={rx} ry={ry} {...dash} />;
    } else if ((carrier === "caterpillar" || carrier === "beads") && (kind === "color" || carrier === "caterpillar")) {
        outline = <circle cx={cx} cy={cy} r={s / 2 - 2} {...dash} />;
    } else {
        outline = <rect x={x + 3} y={y + 5} width={s - 6} height={s - 6} rx={12} {...dash} />;
        qy = y + 2 + s / 2;
    }
    return (
        <g className={className}>
            {outline}
            <text x={cx} y={qy} textAnchor="middle" dominantBaseline="central" fontSize={s * 0.5} fontWeight={900} fontFamily="var(--font-baloo), var(--font-nunito), ui-rounded, system-ui, sans-serif" fill="#8c62d2">
                ?
            </text>
        </g>
    );
}

// ── Podloga mesta (nosač) ─────────────────────────────────────────────────────

function Wheel({ x, y, r, spin }: { x: number; y: number; r: number; spin?: boolean }) {
    return (
        <g>
            <circle cx={x} cy={y} r={r} fill="#3a3a4a" />
            <g className={spin ? "pt-wheel" : undefined}>
                <circle cx={x} cy={y} r={r * 0.55} fill="#c8ccd8" />
                <path d={`M${x - r * 0.55} ${y} H${x + r * 0.55} M${x} ${y - r * 0.55} V${y + r * 0.55}`} stroke="#8a8fa0" strokeWidth={1.6} />
            </g>
        </g>
    );
}

/** Ono što stoji ispod/iza stvari: vagon sa točkovima, nožice gusenice, kanap, kartica */
export function SlotBase({ carrier, spin, open }: { carrier: CarrierId; spin?: boolean; open?: boolean }) {
    switch (carrier) {
        case "train":
            return (
                <g>
                    <path d="M-6 80 H8" stroke="#5a5470" strokeWidth={3.4} strokeLinecap="round" />
                    <rect x={6} y={72} width={88} height={13} rx={4} fill={open ? "#e9e2f7" : "#b07a4a"} stroke={open ? "#c3a6ee" : "#7a4f2a"} strokeWidth={2} />
                    <Wheel x={27} y={89} r={9} spin={spin} />
                    <Wheel x={73} y={89} r={9} spin={spin} />
                </g>
            );
        case "caterpillar":
            return (
                <g stroke="#4a3a32" strokeWidth={3.2} strokeLinecap="round">
                    <path d="M36 84 L32 99 M64 84 L68 99" />
                </g>
            );
        case "beads":
            return <path d="M-4 50 H104" stroke="#a8784a" strokeWidth={3.2} strokeLinecap="round" />;
        case "balloons":
            return <path d="M50 96 Q42 112 50 122 Q56 130 50 136" fill="none" stroke="#8a8fa0" strokeWidth={1.8} strokeLinecap="round" />;
        case "line":
            return (
                <g>
                    <path d="M-4 10 H104" stroke="#a8784a" strokeWidth={2.6} strokeLinecap="round" />
                    <rect x={5} y={18} width={90} height={91} rx={10} fill="#ffffff" stroke={open ? "#c3a6ee" : "#d9d3ee"} strokeWidth={2.4} />
                    <rect x={44} y={3} width={12} height={26} rx={3} fill="#e0b47a" stroke="#a8784a" strokeWidth={1.8} />
                    <path d="M50 6 V26" stroke="#a8784a" strokeWidth={1.2} />
                </g>
            );
    }
}

// ── Glava i krajevi nosača ────────────────────────────────────────────────────

/** Širina glave (levo) i kraja (desno) nosača, u širinama mesta */
export const CARRIER_ENDS: Readonly<Record<CarrierId, { left: number; right: number }>> = {
    train: { left: 1.4, right: 0 },
    caterpillar: { left: 1.15, right: 0 },
    beads: { left: 0.4, right: 0.4 },
    balloons: { left: 0.3, right: 0.3 },
    line: { left: 0.3, right: 0.3 },
};

/** Lokomotiva okrenuta nalevo (vozi niz), sa licem; kad je niz rešen, pušta paru */
export function Locomotive({ happy, moving }: { happy: boolean; moving: boolean }) {
    return (
        <svg viewBox="0 0 140 100" className="h-full w-full overflow-visible" aria-hidden="true">
            {happy && (
                <g fill="#ffffff" stroke="#d9d3ee" strokeWidth={2}>
                    <circle className="pt-puff" cx={38} cy={2} r={8} style={{ animationDelay: "0s" }} />
                    <circle className="pt-puff" cx={30} cy={-4} r={10} style={{ animationDelay: "0.35s" }} />
                    <circle className="pt-puff" cx={22} cy={-12} r={12} style={{ animationDelay: "0.7s" }} />
                </g>
            )}
            <rect x={6} y={72} width={130} height={13} rx={4} fill="#4a3398" />
            <path d="M10 72 L0 86 H14Z" fill="#5a5470" stroke="#3a3a4a" strokeWidth={1.6} strokeLinejoin="round" />
            <rect x={14} y={36} width={84} height={38} rx={14} fill="#9b7be0" stroke="#5f3b96" strokeWidth={2.4} />
            <path d="M30 36 V74 M54 36 V74 M76 36 V74" stroke="#b79cf0" strokeWidth={3} opacity={0.8} />
            <path d="M30 34 L26 16 H46 L42 34Z" fill="#3a3a4a" stroke="#22222e" strokeWidth={2} strokeLinejoin="round" />
            <rect x={24} y={12} width={24} height={7} rx={3} fill="#4a4a5a" />
            <circle cx={66} cy={34} r={7} fill="#f6c518" stroke="#b38a0a" strokeWidth={2} />
            <rect x={94} y={18} width={42} height={56} rx={6} fill="#6a4bc4" stroke="#4a3398" strokeWidth={2.4} />
            <rect x={88} y={9} width={52} height={12} rx={5} fill="#e5484d" stroke="#a8282d" strokeWidth={2} />
            <rect x={102} y={28} width={26} height={20} rx={5} fill="#cfe8fa" stroke="#4a3398" strokeWidth={2} />
            <Shine x={108} y={34} rx={2.4} ry={5} rotate={30} opacity={0.6} />
            {/* Lice na prednjoj strani kotla */}
            <circle cx={16} cy={55} r={17} fill="#eef0f6" stroke="#8a8fa0" strokeWidth={2.2} />
            <Eye x={11} y={51} r={2.6} />
            <Eye x={21} y={51} r={2.6} />
            <Cheek x={8} y={58} r={2.6} />
            <Cheek x={24} y={58} r={2.6} />
            {happy ? <path d="M11 59 Q16 66 21 59Z" fill="#c95a7a" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" /> : <Smile x={16} y={59} w={4} />}
            <Wheel x={34} y={88} r={10} spin={moving} />
            <Wheel x={66} y={88} r={10} spin={moving} />
            <Wheel x={112} y={86} r={13} spin={moving} />
            <path d="M34 88 H112" stroke="#8a8fa0" strokeWidth={2.4} strokeLinecap="round" />
        </svg>
    );
}

/** Glava gusenice, okrenuta nalevo (malo veća od delova tela) */
export function CaterpillarHead({ happy }: { happy: boolean }) {
    return (
        <svg viewBox="0 0 110 100" className="h-full w-full overflow-visible" aria-hidden="true">
            <path d="M40 4 Q30 -14 18 -12 M70 2 Q74 -16 88 -14" fill="none" stroke="#4a3a32" strokeWidth={2.6} strokeLinecap="round" />
            <circle cx={18} cy={-12} r={6} fill="#f59a9a" stroke="#c95a7a" strokeWidth={1.6} />
            <circle cx={88} cy={-14} r={6} fill="#f59a9a" stroke="#c95a7a" strokeWidth={1.6} />
            <path d="M40 90 L36 102 M76 90 L80 102" stroke="#4a3a32" strokeWidth={3.4} strokeLinecap="round" />
            <circle cx={58} cy={44} r={54} fill="#bfe39a" stroke="#6f9a3e" strokeWidth={2.6} />
            <Shine x={82} y={18} rx={5} ry={11} rotate={-30} opacity={0.45} />
            <Eye x={28} y={38} r={6} />
            <Eye x={56} y={38} r={6} />
            <Cheek x={18} y={56} r={6} />
            <Cheek x={64} y={56} r={6} />
            {happy ? <path d="M30 56 Q42 74 54 56Z" fill="#c95a7a" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" /> : <Smile x={42} y={58} w={9} />}
        </svg>
    );
}

/** Kopča ogrlice (levo i desno) */
export function BeadClasp({ side }: { side: "left" | "right" }) {
    const flip = side === "left" ? "" : "scale(-1 1) translate(-40 0)";
    return (
        <svg viewBox="0 0 40 100" className="h-full w-full overflow-visible" aria-hidden="true">
            <g transform={flip}>
                <path d="M40 50 H22" stroke="#a8784a" strokeWidth={3.2} strokeLinecap="round" />
                <circle cx={15} cy={50} r={9} fill="none" stroke="#e0a82a" strokeWidth={4.5} />
                <circle cx={24} cy={50} r={3.5} fill="#e0a82a" />
            </g>
        </svg>
    );
}

/** Stub na kraju konopca (kartice, baloni) */
export function Post({ carrier, side }: { carrier: CarrierId; side: "left" | "right" }) {
    const height = carrier === "balloons" ? 136 : 112;
    const ropeY = carrier === "balloons" ? 136 : 10;
    const flip = side === "left" ? "" : "scale(-1 1) translate(-30 0)";
    return (
        <svg viewBox={`0 0 30 ${height}`} className="h-full w-full overflow-visible" aria-hidden="true">
            <g transform={flip}>
                <rect x={8} y={carrier === "balloons" ? ropeY - 22 : 2} width={10} height={carrier === "balloons" ? 26 : height - 4} rx={4} fill="#c9935a" stroke="#8a5a2a" strokeWidth={2} />
                <path d={`M18 ${ropeY} H34`} stroke="#a8784a" strokeWidth={carrier === "balloons" ? 1.8 : 2.6} strokeLinecap="round" />
                <circle cx={13} cy={carrier === "balloons" ? ropeY - 22 : 3} r={6} fill="#e0b47a" stroke="#8a5a2a" strokeWidth={1.8} />
            </g>
        </svg>
    );
}

// ── Pokreti (samo kad kretanje nije smanjeno) ─────────────────────────────────

export const PATTERN_STYLES = `
@keyframes pt-roll { 0% { transform: translateX(0); } 100% { transform: translateX(-4%); } }
@keyframes pt-spin { to { transform: rotate(-360deg); } }
@keyframes pt-puff { 0% { transform: translate(0, 0) scale(0.4); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(-10px, -26px) scale(1.15); opacity: 0; } }
@keyframes pt-wave { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-14%); } }
@keyframes pt-sway { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-7deg); } 70% { transform: rotate(5deg); } }
@keyframes pt-gap { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes pt-land { 0% { transform: scale(1); } 45% { transform: scale(1.12); } 100% { transform: scale(1); } }
.pt-roll { animation: pt-roll 1.8s cubic-bezier(0.45, 0, 0.3, 1) 0.3s both; }
.pt-wheel { transform-box: fill-box; transform-origin: center; animation: pt-spin 0.9s linear 0.3s 2; }
.pt-puff { transform-box: fill-box; transform-origin: center; animation: pt-puff 1.4s ease-out infinite both; }
.pt-wave { animation: pt-wave 0.7s ease-in-out 2 both; }
.pt-sway { transform-origin: 50% 0; animation: pt-sway 1.1s ease-in-out 1 both; }
.pt-gap { animation: pt-gap 1.8s ease-in-out infinite; }
.pt-land { transform-box: fill-box; transform-origin: center; animation: pt-land 0.45s ease-out both; }
@media (prefers-reduced-motion: reduce) { .pt-roll, .pt-wheel, .pt-puff, .pt-wave, .pt-sway, .pt-gap, .pt-land { animation: none; } }
`;
