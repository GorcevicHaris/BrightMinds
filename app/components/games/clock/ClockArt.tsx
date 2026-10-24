"use client";

// Crteži igre „Sat”: drveni sat sa pingvinom koji peca, debeli drveni brojevi u bojama (svaki
// svog oblika, kao na igrački sa fotografije), kazaljke, mali sat za izbore i drvene cifre
// 0–9 sa životinjama za tablu. Sve je SVG u kodu; brojevi su debeli potezi (isti kao u igri
// „Brojevi”), pa izgledaju isto na svakom uređaju.

import { useId } from "react";
import { InsetStyles, ShapeHole, ShapePiece, WOOD, WoodBoard } from "@/app/components/games/kit/InsetArt";
import { PIECE_PALETTE } from "@/app/components/games/kit/shapePaths";
import { ANIMAL_ART } from "@/app/components/games/food/animals";
import { numberGlyph } from "@/app/components/games/data/numbersItems";
import { glyphBox, type Glyph } from "@/app/components/games/data/tracing";
import { CLOCK_NUMBERS, CLOCK_PIECES, COUNT_ANIMALS, DIGIT_COLORS, clockAngle, countRows, handAngles, type ClockTime } from "@/app/components/games/data/clockLevels";

// ── Brojevi kao potezi ────────────────────────────────────────────────────────

function glyphD(glyph: Glyph): string {
    return glyph.strokes.map((stroke) => `M${stroke.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")}`).join(" ");
}

interface NumeralProps {
    value: number;
    cx: number;
    cy: number;
    /** Visina broja */
    height: number;
    /** Debljina poteza (u jedinicama crteža) */
    weight: number;
    color: string;
    /** Tanka tamna ivica oko poteza (čitljiv broj na svakoj boji) */
    outline?: string;
}

/** Broj nacrtan debelim zaobljenim potezima, sa sredinom u (cx, cy) */
export function Numeral({ value, cx, cy, height, weight, color, outline }: NumeralProps) {
    const glyph = numberGlyph(value);
    if (!glyph) return null;
    const box = glyphBox(glyph);
    const scale = height / 100;
    const d = glyphD(glyph);
    const tx = cx - ((box.minX + box.maxX) / 2) * scale;
    const ty = cy - 50 * scale;
    return (
        <g transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {outline && <path d={d} stroke={outline} strokeWidth={weight + 3.5 / scale} />}
            <path d={d} stroke={color} strokeWidth={weight} />
        </g>
    );
}

// ── Komad sata ────────────────────────────────────────────────────────────────

/** Komad sata u okviru 100 × 100: oblik i boja broja, broj odštampan preko */
export function ClockPieceArt({ value, plain = false }: { value: number; plain?: boolean }) {
    const piece = CLOCK_PIECES[value];
    if (!piece) return null;
    // Isti komadi (težak nivo): svi okrugli, boje drveta, ostaje samo broj
    const shape = plain ? "circle" : piece.shape;
    const twoDigits = value >= 10;
    // Broj stoji u „najdebljem” delu oblika (trougao i polukrug su širi dole, polumesec levo)
    const cy = shape === "triangle" ? 62 : shape === "halfCircle" ? 56 : shape === "heart" ? 46 : 51;
    const cx = shape === "crescent" ? 40 : 50;
    const height = shape === "triangle" || shape === "halfCircle" || shape === "crescent" ? 34 : twoDigits ? 40 : 46;
    return (
        <ShapePiece shape={shape} color={piece.color} plain={plain}>
            {plain ? (
                <Numeral value={value} cx={cx} cy={cy} height={height} weight={17} color={WOOD.ink} />
            ) : (
                <Numeral value={value} cx={cx} cy={cy} height={height} weight={17} color="#ffffff" outline={PIECE_PALETTE[piece.color].edge} />
            )}
        </ShapePiece>
    );
}

/** Komad sata kao samostalna slika (korpa, izbori, „duh” koji prati prst) */
export function ClockPieceSvg({ value, plain = false, className }: { value: number; plain?: boolean; className?: string }) {
    return (
        <svg viewBox="-6 -6 112 112" className={className} aria-hidden="true" focusable="false">
            <ClockPieceArt value={value} plain={plain} />
        </svg>
    );
}

// ── Sat ───────────────────────────────────────────────────────────────────────

/** Sat je u okviru 400 × 400 */
export const FACE = 400;
const C = FACE / 2;
/** Udaljenost sredine broja od sredine sata */
export const NUMBER_R = 136;
/** Veličina komada (i rupe) na satu */
export const PIECE_SIZE = 64;

/** Sredina mesta za broj (u jedinicama sata) */
export function numberPoint(value: number, radius = NUMBER_R): { x: number; y: number } {
    const a = (clockAngle(value) * Math.PI) / 180;
    return { x: C + radius * Math.sin(a), y: C - radius * Math.cos(a) };
}

/** Pingvin na santi, peca u maloj bari u sredini sata */
function FishingPenguin() {
    return (
        <g>
            <ellipse cx={C} cy={C + 58} rx={74} ry={20} fill="#9ED8F5" />
            <ellipse cx={C} cy={C + 58} rx={74} ry={20} fill="none" stroke="#5FB4DE" strokeWidth={2} />
            <path d={`M${C - 50} ${C + 60} q8 -5 16 0 M${C + 34} ${C + 64} q8 -5 16 0`} fill="none" stroke="#ffffff" strokeWidth={2.4} strokeLinecap="round" opacity={0.8} />
            <ellipse cx={C - 18} cy={C + 44} rx={44} ry={11} fill="#F4FBFF" stroke="#BFD9EA" strokeWidth={2} />
            {/* Štap i udica */}
            <path d={`M${C + 4} ${C + 6} L${C + 70} ${C - 64}`} stroke="#8A5A2B" strokeWidth={4.5} strokeLinecap="round" />
            <path d={`M${C + 70} ${C - 64} L${C + 70} ${C + 46}`} stroke="#6B7280" strokeWidth={1.4} />
            <g transform={`translate(${C + 70} ${C + 54})`}>
                <ellipse cx={0} cy={0} rx={10} ry={6} fill="#FB923C" stroke="#C2410C" strokeWidth={1.4} />
                <path d="M8 0 L16 -6 L16 6 Z" fill="#FB923C" stroke="#C2410C" strokeWidth={1.4} strokeLinejoin="round" />
                <circle cx={-5} cy={-1.5} r={1.4} fill={WOOD.ink} />
            </g>
            <g transform={`translate(${C - 62} ${C - 58}) scale(0.92)`}>{ANIMAL_ART.penguin.draw(false)}</g>
        </g>
    );
}

/** Kazaljke: mala (sat, narandžasta, kratka i debela) i velika (minuti, plava, duga) */
export function ClockHands({ hour, minute, calm = true }: { hour: number; minute: number; calm?: boolean }) {
    const turn = calm ? undefined : { transition: "transform 0.35s cubic-bezier(0.3, 0.7, 0.4, 1)" };
    return (
        <g>
            <g style={{ transform: `rotate(${minute}deg)`, transformOrigin: `${C}px ${C}px`, ...turn }}>
                <path d={`M${C - 6} ${C + 16} L${C - 4.5} ${C - 80} L${C} ${C - 100} L${C + 4.5} ${C - 80} L${C + 6} ${C + 16} Z`} fill="#2563EB" stroke="#1E3A8A" strokeWidth={2.5} strokeLinejoin="round" />
            </g>
            <g style={{ transform: `rotate(${hour}deg)`, transformOrigin: `${C}px ${C}px`, ...turn }}>
                <path d={`M${C - 9} ${C + 14} L${C - 7} ${C - 46} L${C} ${C - 66} L${C + 7} ${C - 46} L${C + 9} ${C + 14} Z`} fill="#F97316" stroke="#9A3412" strokeWidth={2.5} strokeLinejoin="round" />
            </g>
            <circle cx={C} cy={C} r={11} fill="#FBBF24" stroke="#B45309" strokeWidth={2.5} />
            <circle cx={C - 3} cy={C - 3} r={3} fill="#ffffff" opacity={0.6} />
        </g>
    );
}

interface FaceProps {
    /** Brojevi koji stoje na satu */
    filled: readonly number[];
    /** Okrugle rupe umesto rupa u obliku komada */
    roundHoles?: boolean;
    /** Svi komadi isti (okrugli, boje drveta) */
    plain?: boolean;
    /** Rupa koja svetli (pomoć) */
    glow?: number | null;
    /** Rupa iznad koje je komad */
    over?: number | null;
    /** Upravo postavljen broj (kratko „legne”) */
    last?: number | null;
    /** Broj koji svetli (pomoć u zadatku „Pokaži”) */
    mark?: number | null;
    hands: { hour: number; minute: number };
    calm: boolean;
}

/** Ceo sat: drveni okvir, tačkice za minute, rupe ili brojevi, pingvin u sredini i kazaljke */
export function ClockFaceArt({ filled, roundHoles = false, plain = false, glow = null, over = null, last = null, mark = null, hands, calm }: FaceProps) {
    const wood = useId();
    const half = PIECE_SIZE / 2;
    return (
        <g>
            <InsetStyles />
            <defs>
                <radialGradient id={wood} cx="0.4" cy="0.35" r="0.75">
                    <stop offset="0" stopColor={WOOD.boardLight} />
                    <stop offset="1" stopColor={WOOD.board} />
                </radialGradient>
            </defs>
            <circle cx={C} cy={C + 5} r={196} fill={WOOD.edgeDark} opacity={0.3} />
            <circle cx={C} cy={C} r={196} fill={WOOD.edge} />
            <circle cx={C} cy={C} r={186} fill={`url(#${wood})`} />
            <circle cx={C} cy={C} r={186} fill="none" stroke={WOOD.edgeDark} strokeWidth={2} opacity={0.4} />
            {/* Tačkice za minute; svaka peta veća */}
            {Array.from({ length: 60 }, (_, i) => {
                const a = (i * 6 * Math.PI) / 180;
                const big = i % 5 === 0;
                return <circle key={i} cx={C + 174 * Math.sin(a)} cy={C - 174 * Math.cos(a)} r={big ? 4.2 : 2.3} fill={WOOD.edgeDark} opacity={big ? 0.75 : 0.5} />;
            })}
            <FishingPenguin />
            {CLOCK_NUMBERS.map((value) => {
                const p = numberPoint(value);
                const placed = filled.includes(value);
                const shape = roundHoles || plain ? "circle" : CLOCK_PIECES[value].shape;
                return (
                    <g key={value} transform={`translate(${p.x - half} ${p.y - half}) scale(${PIECE_SIZE / 100})`}>
                        {placed ? (
                            <g className={last === value && !calm ? "ins-snap" : undefined}>
                                <ClockPieceArt value={value} plain={plain} />
                                {mark === value && <circle cx={50} cy={50} r={54} fill="none" stroke="#6C61F0" strokeWidth={7} className={calm ? undefined : "ins-glow"} />}
                            </g>
                        ) : (
                            <ShapeHole shape={shape} glow={glow === value} over={over === value} calm={calm} />
                        )}
                    </g>
                );
            })}
            <ClockHands hour={hands.hour} minute={hands.minute} calm={calm} />
        </g>
    );
}

/** Mali sat za izbore („Koji sat pokazuje pola četiri?”): svi brojevi stoje, samo kazaljke se razlikuju */
export function MiniClock({ time, className }: { time: ClockTime; className?: string }) {
    const angles = handAngles(time);
    return (
        <svg viewBox={`0 0 ${FACE} ${FACE}`} className={className} aria-hidden="true" focusable="false">
            <ClockFaceArt filled={CLOCK_NUMBERS} hands={angles} calm />
        </svg>
    );
}

// ── Tabla sa ciframa 0–9 ──────────────────────────────────────────────────────

/** Ćelija table: rupa za cifru gore, životinje dole (jedinice crteža) */
export const CELL_W = 124;
export const CELL_H = 236;
export const BOARD_PAD = 18;
/** Okvir cifre u ćeliji */
const DIGIT_TOP = 14;
const DIGIT_H = 128;
const DIGIT_WEIGHT = 25;

/** Kolone table za dati broj cifara (3 → 3, 5 → 5, 6 → 3 × 2, 10 → 5 × 2) */
export function boardColumns(count: number): number {
    if (count <= 5) return count;
    if (count === 6) return 3;
    return 5;
}

export function boardSize(count: number): { width: number; height: number; cols: number; rows: number } {
    const cols = boardColumns(count);
    const rows = Math.ceil(count / cols);
    return { cols, rows, width: cols * CELL_W + BOARD_PAD * 2, height: rows * CELL_H + BOARD_PAD * 2 };
}

/** Gornji levi ugao ćelije */
export function cellOrigin(index: number, count: number): { x: number; y: number } {
    const cols = boardColumns(count);
    return { x: BOARD_PAD + (index % cols) * CELL_W, y: BOARD_PAD + Math.floor(index / cols) * CELL_H };
}

/** Okvir rupe za cifru u ćeliji (za dugme preko slike) */
export function digitFrame(index: number, count: number): { x: number; y: number; w: number; h: number } {
    const o = cellOrigin(index, count);
    return { x: o.x + 8, y: o.y + DIGIT_TOP - 4, w: CELL_W - 16, h: DIGIT_H + 8 };
}

/** Transformacija koja cifru visine 100 smešta u okvir ćelije */
function digitTransform(digit: number, x: number, y: number): string {
    const glyph = numberGlyph(digit)!;
    const box = glyphBox(glyph);
    const scale = (DIGIT_H - DIGIT_WEIGHT) / 100;
    const tx = x + CELL_W / 2 - ((box.minX + box.maxX) / 2) * scale;
    const ty = y + DIGIT_TOP + DIGIT_WEIGHT / 2;
    return `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`;
}

/** Drvena cifra (debeli potezi u boji, tamnija ivica, odsjaj) — u koordinatama ćelije */
function DigitShape({ digit, x, y, mode, tint = null, glow = false, over = false, snap = false, calm }: { digit: number; x: number; y: number; mode: "piece" | "hole"; tint?: string | null; glow?: boolean; over?: boolean; snap?: boolean; calm: boolean }) {
    const glyph = numberGlyph(digit);
    if (!glyph) return null;
    const d = glyphD(glyph);
    const scale = (DIGIT_H - DIGIT_WEIGHT) / 100;
    const w = DIGIT_WEIGHT / scale;
    const props = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    if (mode === "hole") {
        return (
            <g transform={digitTransform(digit, x, y)} {...props}>
                <path d={d} stroke={WOOD.boardLight} strokeWidth={w + 8} />
                <path d={d} stroke={WOOD.edgeDark} strokeWidth={w + 3} />
                <path d={d} stroke={WOOD.holeShadow} strokeWidth={w} />
                <path d={d} stroke={tint ?? WOOD.holeFloor} strokeWidth={w - 7} transform="translate(2.5 3.5)" opacity={tint ? 0.8 : 1} />
                {(glow || over) && <path d={d} stroke="#6C61F0" strokeWidth={over ? w + 4 : w + 6} opacity={over ? 0.35 : 0.8} className={glow && !over && !calm ? "ins-glow" : undefined} />}
            </g>
        );
    }
    const paint = PIECE_PALETTE[DIGIT_COLORS[digit]];
    return (
        <g className={snap && !calm ? "ins-snap" : undefined}>
            <g transform={digitTransform(digit, x, y)} {...props}>
                <path d={d} stroke={WOOD.holeShadow} strokeWidth={w + 4} opacity={0.25} transform="translate(2 4)" />
                <path d={d} stroke={paint.edge} strokeWidth={w + 4} />
                <path d={d} stroke={paint.fill} strokeWidth={w - 2} />
                <path d={d} stroke="#ffffff" strokeWidth={w * 0.22} opacity={0.35} transform="translate(-3 -4)" />
            </g>
        </g>
    );
}

/** Drvena cifra kao samostalna slika (korpa, „duh” koji prati prst) */
export function DigitPieceSvg({ digit, className }: { digit: number; className?: string }) {
    return (
        <svg viewBox={`0 ${DIGIT_TOP - 8} ${CELL_W} ${DIGIT_H + 16}`} className={className} aria-hidden="true" focusable="false">
            <DigitShape digit={digit} x={0} y={0} mode="piece" calm />
        </svg>
    );
}

/** Životinje ispod rupe: onoliko koliko kaže broj, složene kao na kocki */
function CountPicture({ digit, x, y }: { digit: number; x: number; y: number }) {
    const rows = countRows(digit);
    const animal = COUNT_ANIMALS[digit];
    const top = y + DIGIT_TOP + DIGIT_H + 8;
    const areaH = CELL_H - (DIGIT_TOP + DIGIT_H + 14);
    if (!animal || rows.length === 0) {
        // Nula: prazna livada (nema nikoga)
        return <ellipse cx={x + CELL_W / 2} cy={top + areaH / 2} rx={34} ry={12} fill="#CBE7A6" opacity={0.7} />;
    }
    const size = Math.min(areaH / rows.length, (CELL_W - 8) / Math.max(...rows));
    const art = ANIMAL_ART[animal.animal];
    return (
        <g>
            {rows.map((count, r) =>
                Array.from({ length: count }, (_, i) => {
                    const ax = x + CELL_W / 2 - (count * size) / 2 + i * size;
                    const ay = top + (areaH - rows.length * size) / 2 + r * size;
                    return (
                        <g key={`${r}-${i}`} transform={`translate(${ax.toFixed(1)} ${ay.toFixed(1)}) scale(${(size / 100).toFixed(4)})`}>
                            {art.draw(false)}
                        </g>
                    );
                })
            )}
        </g>
    );
}

interface DigitBoardProps {
    digits: readonly number[];
    filled: readonly number[];
    tint: boolean;
    glow: number | null;
    over: number | null;
    last: number | null;
    calm: boolean;
}

/** Cela drvena tabla sa ciframa: rupe (ili postavljene cifre) i životinje ispod */
export function DigitBoardArt({ digits, filled, tint, glow, over, last, calm }: DigitBoardProps) {
    const size = boardSize(digits.length);
    return (
        <g>
            <InsetStyles />
            <WoodBoard width={size.width} height={size.height} radius={30} />
            {digits.map((digit, index) => {
                const o = cellOrigin(index, digits.length);
                const placed = filled.includes(digit);
                return (
                    <g key={digit}>
                        {/* Svetlo polje ispod životinja */}
                        <rect x={o.x + 8} y={o.y + DIGIT_TOP + DIGIT_H + 6} width={CELL_W - 16} height={CELL_H - (DIGIT_TOP + DIGIT_H + 12)} rx={14} fill="#FFF8EC" opacity={0.75} />
                        {placed ? (
                            <DigitShape digit={digit} x={o.x} y={o.y} mode="piece" snap={last === digit} calm={calm} />
                        ) : (
                            <DigitShape digit={digit} x={o.x} y={o.y} mode="hole" tint={tint ? PIECE_PALETTE[DIGIT_COLORS[digit]].light : null} glow={glow === digit} over={over === digit} calm={calm} />
                        )}
                        <CountPicture digit={digit} x={o.x} y={o.y} />
                    </g>
                );
            })}
        </g>
    );
}
