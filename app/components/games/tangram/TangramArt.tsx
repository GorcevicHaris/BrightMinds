"use client";

// Crteži igre „Tangram”: senka oblika (sa obrisima u boji, linijama, samo nekim linijama,
// bledim linijama ili samo senkom), postavljeni delovi u svojim bojama, ukrasi (oči, nos,
// vrata, plamen, voda) i delovi u korpi. Sve je SVG u kodu, pa izgleda isto na svakom
// uređaju. Linije su uvek iste debljine na ekranu (non-scaling-stroke), bez obzira na to
// koliko je oblik uvećan. Složen oblik kratko oživi; uz „Manje animacija” sve stoji mirno.

import type { ReactNode } from "react";
import { PIECE_PALETTE } from "@/app/components/games/kit/shapePaths";
import { BLUSH, INK } from "@/app/components/games/pictures/kit";
import { PIECE_SPAN, PIECES, pieceShape, type Deco, type Figure, type PieceId, type Pt, type Support, type Target } from "@/app/components/games/data/tangramLevels";

/** Boje senke (mirna tirkizna, kao boja igre) */
export const SIL = "#a9dcd6";
const SIL_EDGE = "#3c8f87";
/** Boja pomoći (ista ljubičasta kao isticanje odgovora u ostalim igrama) */
export const GLOW = "#6C61F0";

const pts = (list: readonly Pt[]) => list.map(([x, y]) => `${x.toFixed(4)},${y.toFixed(4)}`).join(" ");
const NS = { vectorEffect: "non-scaling-stroke" as const };

/** Mnogougao skupljen ka težištu (odsjaj na delu; trougao ostaje unutar sebe) */
function inset(list: readonly Pt[], factor: number, dx = 0, dy = 0): Pt[] {
    const mx = list.reduce((s, p) => s + p[0], 0) / list.length;
    const my = list.reduce((s, p) => s + p[1], 0) / list.length;
    return list.map(([x, y]) => [mx + (x - mx) * factor + dx, my + (y - my) * factor + dy] as const);
}

/**
 * Pokreti (jednom po tabli): oblik oživi, deo koji legne kratko „sedne”, pomoć blago diše.
 * Procenti u `translate` se odnose na okvir samog oblika (transform-box: fill-box).
 */
export function TangramStyles() {
    return (
        <style>{`
            .tg-a { transform-box: fill-box; transform-origin: 50% 60%; }
            .tg-a-pop { animation: tg-pop 1.1s ease-in-out 2; }
            .tg-a-swim { animation: tg-swim 2.6s ease-in-out both; transform-origin: 50% 50%; }
            .tg-a-sail { animation: tg-sail 1.5s ease-in-out 2; transform-origin: 50% 100%; }
            .tg-a-wag { animation: tg-wag 0.55s ease-in-out 4; transform-origin: 50% 100%; }
            .tg-a-drive { animation: tg-drive 2.4s ease-in-out both; }
            .tg-a-lift { animation: tg-lift 2.6s ease-in-out both; }
            .tg-a-hop { animation: tg-hop 0.8s ease-out 2; transform-origin: 50% 100%; }
            .tg-a-crawl { animation: tg-crawl 2.6s ease-in-out both; }
            .tg-a-nod { animation: tg-nod 1.2s ease-in-out 2; transform-origin: 70% 100%; }
            .tg-a-shine { animation: tg-sway 1.3s ease-in-out 2; transform-origin: 50% 100%; }
            .tg-a-blink { animation: tg-pop 1.4s ease-in-out 1; }
            .tg-blink { animation: tg-blink 2.6s ease-in-out both; transform-box: fill-box; transform-origin: center; }
            .tg-snap { animation: tg-snap 0.34s ease-out both; transform-box: fill-box; transform-origin: center; }
            .tg-hint { animation: tg-hint 1.6s ease-in-out infinite; }
            .tg-in { animation: tg-in 0.9s ease-out both; }
            .tg-rise { animation: tg-rise 2.4s ease-out both; transform-box: fill-box; }
            .tg-flick { animation: tg-flick 0.35s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 50% 0%; }
            .tg-twinkle { animation: tg-twinkle 0.9s ease-in-out infinite alternate; }
            @keyframes tg-pop { 0%, 100% { transform: scale(1); } 40% { transform: scale(1.07); } 70% { transform: scale(0.98); } }
            @keyframes tg-swim { 0% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-7%) rotate(-4deg); } 50% { transform: translateX(-12%) rotate(3deg); } 75% { transform: translateX(-5%) rotate(-2deg); } 100% { transform: translateX(0) rotate(0); } }
            @keyframes tg-sail { 0%, 100% { transform: translateY(0) rotate(0); } 30% { transform: translateY(-3%) rotate(-3deg); } 70% { transform: translateY(1%) rotate(2deg); } }
            @keyframes tg-wag { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-5deg); } 70% { transform: rotate(5deg); } }
            @keyframes tg-drive { 0% { transform: translateX(0); } 45% { transform: translateX(9%); } 55% { transform: translateX(9%); } 100% { transform: translateX(0); } }
            @keyframes tg-lift { 0% { transform: translateY(0); } 15% { transform: translateY(1%); } 70% { transform: translateY(-16%); } 100% { transform: translateY(-12%); } }
            @keyframes tg-hop { 0%, 100% { transform: translateY(0) scale(1, 1); } 15% { transform: translateY(0) scale(1.05, 0.94); } 50% { transform: translateY(-12%) scale(0.97, 1.03); } }
            @keyframes tg-crawl { 0% { transform: translateX(0); } 100% { transform: translateX(6%); } }
            @keyframes tg-nod { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-4deg); } }
            @keyframes tg-sway { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-2deg); } 70% { transform: rotate(2deg); } }
            @keyframes tg-blink { 0%, 28%, 40%, 68%, 80%, 100% { transform: scaleY(1); } 34%, 74% { transform: scaleY(0.12); } }
            @keyframes tg-snap { 0% { transform: scale(1.12); } 60% { transform: scale(0.97); } 100% { transform: scale(1); } }
            @keyframes tg-hint { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
            @keyframes tg-in { 0% { opacity: 0; } 100% { opacity: 1; } }
            @keyframes tg-rise { 0% { opacity: 0; transform: translateY(0); } 25% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-60%); } }
            @keyframes tg-flick { 0% { transform: scaleY(0.88); } 100% { transform: scaleY(1.1); } }
            @keyframes tg-twinkle { 0% { opacity: 0.55; } 100% { opacity: 1; } }
            @media (prefers-reduced-motion: reduce) {
                .tg-a, .tg-blink, .tg-snap, .tg-hint, .tg-in, .tg-rise, .tg-flick, .tg-twinkle { animation: none !important; }
            }
        `}</style>
    );
}

// ── Deo ───────────────────────────────────────────────────────────────────────

interface PieceBodyProps {
    piece: PieceId;
    points: readonly Pt[];
    className?: string;
}

/** Obojen deo (sa tamnijom ivicom i blagim odsjajem) u datim tačkama */
export function PieceBody({ piece, points, className }: PieceBodyProps) {
    const paint = PIECE_PALETTE[PIECES[piece].color];
    return (
        <g className={className}>
            <polygon points={pts(points)} fill={paint.fill} stroke={paint.edge} strokeWidth={2} strokeLinejoin="round" {...NS} />
            <polygon points={pts(inset(points, 0.55, -0.02, -0.02))} fill="#ffffff" opacity={0.17} />
        </g>
    );
}

/** Vazduh oko dela u njegovom crtežu (jedinice) */
const PIECE_PAD = 0.06;

/** Stranica kvadratnog crteža dela (jedinice): deo staje u svakom okretu */
export function pieceBox(piece: PieceId): number {
    return PIECE_SPAN[PIECES[piece].kind] + 2 * PIECE_PAD;
}

/**
 * Deo kao samostalan SVG (korpa i deo koji prati prst): sredina okvira dela je u sredini
 * crteža, pa deo u korpi i na tabli ima istu sredinu u svakom okretu.
 */
export function PieceSvg({ piece, rot, className }: { piece: PieceId; rot: number; className?: string }) {
    const kind = PIECES[piece].kind;
    const box = pieceBox(piece);
    return (
        <svg viewBox={`${-box / 2} ${-box / 2} ${box} ${box}`} className={className} aria-hidden="true" overflow="visible">
            <PieceBody piece={piece} points={pieceShape(kind, rot)} />
        </svg>
    );
}

// ── Oblik na tabli ────────────────────────────────────────────────────────────

interface FigureArtProps {
    figure: Figure;
    support: Support;
    /** Postavljeni delovi: deo → indeks mesta */
    at: Record<string, number>;
    last: string | null;
    /** Mesto koje svetli (pomoć) */
    glow: number | null;
    /** Mesto u koje bi deo koji se prevlači sada legao */
    over: number | null;
    done: boolean;
    calm: boolean;
    children?: ReactNode;
}

const GROUNDED = new Set(["glow", "shine", "drive", "hop", "crawl", "nod"]);

/** Linije mesta (ko se vidi pri kojoj podršci) */
function lineOpacity(support: Support, target: Target): number {
    if (support === "lines") return 0.95;
    if (support === "some") return target.kind === "lg" ? 0.95 : 0;
    if (support === "faint") return 0.38;
    return 0;
}

export function FigureArt({ figure, support, at, last, glow, over, done, calm, children }: FigureArtProps) {
    const placedAt = new Map(Object.entries(at).map(([piece, index]) => [index, piece as PieceId]));
    const { view, size } = figure;
    const ground = GROUNDED.has(figure.alive) || figure.id.startsWith("cat-");
    const alive = done && !calm ? `tg-a tg-a-${figure.alive}` : undefined;
    const water = figure.deco.find((d) => d.k === "water");
    return (
        <>
            <TangramStyles />
            {/* Pozadina: senka na tlu ili voda */}
            {ground && <ellipse cx={size.w / 2} cy={size.h + 0.06} rx={size.w * 0.46} ry={Math.max(0.07, size.h * 0.035)} fill="#1f1b3a" opacity={0.08} />}
            {water && <Water y={water.y} x={view.x} w={view.w} bottom={view.y + view.h} />}
            <g className={alive}>
                {/* Senka: prvo debela ivica svih mesta (spoljni obris), pa ispuna preko nje */}
                {figure.targets.map((target) => (
                    <polygon key={`edge-${target.index}`} points={pts(target.pts)} fill={SIL_EDGE} stroke={SIL_EDGE} strokeWidth={support === "outline" ? 5 : 4} strokeLinejoin="round" {...NS} />
                ))}
                {figure.targets.map((target) => {
                    const tint = support === "tint" ? PIECE_PALETTE[PIECES[target.piece].color].light : SIL;
                    return <polygon key={`fill-${target.index}`} points={pts(target.pts)} fill={tint} stroke={tint} strokeWidth={1.4} strokeLinejoin="round" {...NS} />;
                })}
                {/* Linije mesta: u boji dela (lako), bele (srednje), samo neke ili blede */}
                {figure.targets.map((target) => {
                    if (placedAt.has(target.index)) return null;
                    if (support === "tint") {
                        const paint = PIECE_PALETTE[PIECES[target.piece].color];
                        return <polygon key={`line-${target.index}`} points={pts(target.pts)} fill="none" stroke={paint.edge} strokeWidth={2} strokeDasharray="7 5" strokeLinejoin="round" opacity={0.75} {...NS} />;
                    }
                    const opacity = lineOpacity(support, target);
                    if (opacity === 0) return null;
                    return <polygon key={`line-${target.index}`} points={pts(target.pts)} fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinejoin="round" opacity={opacity} {...NS} />;
                })}
                {/* Postavljeni delovi */}
                {figure.targets.map((target) => {
                    const piece = placedAt.get(target.index);
                    if (!piece) return null;
                    return <PieceBody key={`piece-${target.index}`} piece={piece} points={target.pts} className={piece === last && !calm ? "tg-snap" : undefined} />;
                })}
                {/* Mesto u koje bi deo legao (dok se prevlači) i pomoć */}
                {over !== null && figure.targets[over] && !placedAt.has(over) && (
                    <polygon points={pts(figure.targets[over].pts)} fill="#ffffff" fillOpacity={0.6} stroke={GLOW} strokeWidth={3} strokeLinejoin="round" {...NS} />
                )}
                {glow !== null && figure.targets[glow] && !placedAt.has(glow) && (
                    <polygon
                        points={pts(figure.targets[glow].pts)}
                        fill="#ffffff"
                        fillOpacity={0.5}
                        stroke={GLOW}
                        strokeWidth={4}
                        strokeLinejoin="round"
                        className={calm ? undefined : "tg-hint"}
                        {...NS}
                    />
                )}
                <DecoLayer figure={figure} done={done} calm={calm} />
            </g>
            {children}
        </>
    );
}

// ── Ukrasi ────────────────────────────────────────────────────────────────────

function Water({ y, x, w, bottom }: { y: number; x: number; w: number; bottom: number }) {
    const step = w / 8;
    const amp = Math.min(0.09, step * 0.25);
    let d = `M${x} ${y}`;
    for (let i = 0; i < 8; i += 1) d += ` q${step / 4} ${-amp} ${step / 2} 0 t${step / 2} 0`;
    return (
        <g>
            <path d={`${d} V${bottom} H${x} Z`} fill="#bfe7f4" opacity={0.9} />
            <path d={d} fill="none" stroke="#5fb8d8" strokeWidth={2} strokeLinecap="round" {...NS} />
        </g>
    );
}

/** Ukrasi koji se pojave tek kad je oblik složen (vrata, svetlo, plamen, dim…) */
const DONE_ONLY = new Set<Deco["k"]>(["door", "window", "lights", "star", "flame", "bubbles", "smoke"]);

function DecoLayer({ figure, done, calm }: { figure: Figure; done: boolean; calm: boolean }) {
    const blink = done && !calm && figure.alive === "blink";
    return (
        <g pointerEvents="none">
            {figure.deco.map((deco, i) => {
                if ((deco.done || DONE_ONLY.has(deco.k)) && !done) return null;
                return <DecoItem key={i} deco={deco} calm={calm} blink={blink} />;
            })}
        </g>
    );
}

function DecoItem({ deco, calm, blink }: { deco: Deco; calm: boolean; blink: boolean }) {
    const fade = (deco.done || DONE_ONLY.has(deco.k)) && !calm ? "tg-in" : undefined;
    switch (deco.k) {
        case "eye":
            return (
                <g className={blink ? "tg-blink" : undefined}>
                    <circle cx={deco.x} cy={deco.y} r={deco.r} fill={INK} />
                    <circle cx={deco.x - deco.r * 0.35} cy={deco.y - deco.r * 0.38} r={deco.r * 0.36} fill="#ffffff" />
                </g>
            );
        case "nose":
            return <ellipse cx={deco.x} cy={deco.y} rx={deco.r * 1.15} ry={deco.r * 0.8} fill={INK} />;
        case "smile":
            return <path className={fade} d={`M${deco.x - deco.w} ${deco.y} Q${deco.x} ${deco.y + deco.w * 0.9} ${deco.x + deco.w} ${deco.y}`} fill="none" stroke={INK} strokeWidth={2.2} strokeLinecap="round" {...NS} />;
        case "cheek":
            return <circle className={fade} cx={deco.x} cy={deco.y} r={deco.r} fill={BLUSH} opacity={0.55} />;
        case "whiskers": {
            const { x, y, w } = deco;
            return (
                <g stroke={INK} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} {...NS}>
                    {[-1, 1].map((side) => (
                        <g key={side}>
                            <line x1={x + side * w * 0.28} y1={y} x2={x + side * w} y2={y - w * 0.12} {...NS} />
                            <line x1={x + side * w * 0.28} y1={y + w * 0.08} x2={x + side * w} y2={y + w * 0.16} {...NS} />
                        </g>
                    ))}
                </g>
            );
        }
        case "beak": {
            const { x, y, r } = deco;
            const d = deco.down ? `M${x - r * 0.7} ${y - r * 0.4} L${x + r * 0.7} ${y - r * 0.4} L${x} ${y + r * 0.7} Z` : `M${x} ${y - r * 0.55} L${x} ${y + r * 0.55} L${x - r * 1.1} ${y} Z`;
            return <path d={d} fill="#f6a524" stroke="#b86a10" strokeWidth={1.4} strokeLinejoin="round" {...NS} />;
        }
        case "line":
            return <line x1={deco.x1} y1={deco.y1} x2={deco.x2} y2={deco.y2} stroke="#7a5532" strokeWidth={3} strokeLinecap="round" {...NS} />;
        case "flag":
            return <path d={`M${deco.x} ${deco.y} L${deco.x + deco.s} ${deco.y + deco.s * 0.35} L${deco.x} ${deco.y + deco.s * 0.7} Z`} fill="#ef4444" stroke="#b91c1c" strokeWidth={1.4} strokeLinejoin="round" {...NS} />;
        case "wheel":
            return (
                <g>
                    <circle cx={deco.x} cy={deco.y} r={deco.r} fill="#3b3646" stroke="#1f1b28" strokeWidth={1.5} {...NS} />
                    <circle cx={deco.x} cy={deco.y} r={deco.r * 0.42} fill="#d9d6e0" />
                </g>
            );
        case "door":
            return (
                <g className={fade}>
                    <rect x={deco.x} y={deco.y} width={deco.w} height={deco.h} rx={deco.w * 0.35} fill="#9a6232" stroke="#6b3f1c" strokeWidth={1.6} {...NS} />
                    <circle cx={deco.x + deco.w * 0.75} cy={deco.y + deco.h * 0.55} r={deco.w * 0.09} fill="#f6c518" />
                </g>
            );
        case "window":
            return (
                <g className={fade}>
                    <circle cx={deco.x} cy={deco.y} r={deco.r} fill="#fde68a" stroke="#ffffff" strokeWidth={3} {...NS} />
                    <circle cx={deco.x - deco.r * 0.3} cy={deco.y - deco.r * 0.3} r={deco.r * 0.28} fill="#ffffff" opacity={0.75} />
                </g>
            );
        case "lights":
            return (
                <g className={fade}>
                    {deco.pts.map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r={0.12} fill={["#ef4444", "#f6c518", "#60a5fa"][i % 3]} stroke="#ffffff" strokeWidth={1.2} className={calm ? undefined : "tg-twinkle"} style={{ animationDelay: `${i * 0.15}s` }} {...NS} />
                    ))}
                </g>
            );
        case "star": {
            const { x, y, r } = deco;
            const star = Array.from({ length: 10 }, (_, i) => {
                const a = (Math.PI / 5) * i - Math.PI / 2;
                const rr = i % 2 === 0 ? r : r * 0.45;
                return `${(x + Math.cos(a) * rr).toFixed(3)},${(y + Math.sin(a) * rr).toFixed(3)}`;
            }).join(" ");
            return <polygon className={fade} points={star} fill="#f6c518" stroke="#c9971a" strokeWidth={1.5} strokeLinejoin="round" {...NS} />;
        }
        case "flame": {
            const { x, y, w } = deco;
            return (
                <g className={fade}>
                    <g className={calm ? undefined : "tg-flick"}>
                        <path d={`M${x - w / 2} ${y} Q${x - w * 0.4} ${y + w * 0.5} ${x} ${y + w * 0.85} Q${x + w * 0.4} ${y + w * 0.5} ${x + w / 2} ${y} Z`} fill="#fb923c" />
                        <path d={`M${x - w / 4} ${y} Q${x - w * 0.2} ${y + w * 0.3} ${x} ${y + w * 0.5} Q${x + w * 0.2} ${y + w * 0.3} ${x + w / 4} ${y} Z`} fill="#fde047" />
                    </g>
                </g>
            );
        }
        case "bubbles":
            return (
                <g className={calm ? undefined : "tg-rise"} fill="#e0f7ff" stroke="#5fb8d8" strokeWidth={1.4} {...NS}>
                    <circle cx={deco.x} cy={deco.y} r={0.1} {...NS} />
                    <circle cx={deco.x - 0.12} cy={deco.y - 0.3} r={0.07} {...NS} />
                    <circle cx={deco.x + 0.05} cy={deco.y - 0.52} r={0.05} {...NS} />
                </g>
            );
        case "smoke":
            return (
                <g className={calm ? "tg-in" : "tg-rise"} fill="#e7e5ee" stroke="#b9b5c6" strokeWidth={1.2} {...NS}>
                    <circle cx={deco.x} cy={deco.y} r={0.1} {...NS} />
                    <circle cx={deco.x + 0.1} cy={deco.y - 0.22} r={0.13} {...NS} />
                    <circle cx={deco.x + 0.04} cy={deco.y - 0.48} r={0.16} {...NS} />
                </g>
            );
        case "water":
            return null;
        default:
            return null;
    }
}
