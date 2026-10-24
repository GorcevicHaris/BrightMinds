"use client";

// Tabla za precrtavanje slova i brojeva (igre „Slova” i „Brojevi”).
//
// Na tabli je slovo (debelo isprekidano, tanko isprekidano ili samo početna tačka), uz brojeve
// i strelice koji pokazuju redosled poteza, i tačka „prati me” na mestu gde dete treba da nastavi.
// Dete vuče prst ili miš duž poteza; napredak se boji u boji poteza, a gotov potez postaje
// lepa obojena linija. Izlazak iz hodnika ne briše ništa — tačka samo blago zatitra i dete
// nastavlja odande. Pomoć: tačka ponovo polako „napiše” potez (uz „Manje animacija” potez
// samo zasvetli, bez kretanja). Na tabli se ne skroluje stranica (touch-action: none).

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import {
    DOT_LENGTH,
    SLIP_LENGTH,
    TOLERANCE,
    directionAt,
    followSegment,
    glyphFrame,
    nearProgress,
    pointAt,
    pointsBetween,
    pointsUpTo,
    sampleStroke,
    strokeDone,
    type Glyph,
    type Pt,
    type SampledStroke,
    type TraceGuide,
} from "@/app/components/games/data/tracing";
import { cn } from "@/lib/cn";

/** Boje gotovih poteza, redom (mirne, dovoljno tamne na beloj tabli) */
export const STROKE_COLORS = ["#7c5cf0", "#0e9bd8", "#12a37a", "#ef8a17", "#e0508f"];
const GUIDE_BAND = "#e7e5f4";
const GUIDE_DOTS = "#a9a4c9";
const DOT_COLOR = "#6c61f0";
/** Brzina tačke koja pokazuje potez (jedinica znaka u sekundi) */
const DEMO_SPEED = 75;
const DEMO_GAP_MS = 350;
/** Uz „Manje animacija”: koliko dugo potez svetli umesto kretanja */
const CALM_SHOW_MS = 2600;

interface TracePadProps {
    glyph: Glyph;
    guide: TraceGuide;
    /** Koliko poteza je gotovo (vodi igra; menja se posle `onStrokeDone`) */
    strokesDone: number;
    /** Linije sveske: za mala slova i srednja linija */
    lines?: "upper" | "lower";
    /** Kad se promeni (i nije 0): učitelj pokaže sve preostale poteze redom (model) */
    demoRun: number;
    /** Kad se promeni (i nije 0): tačka ponovo pokaže potez koji je na redu (pomoć) */
    hintRun: number;
    /** Monitor ili rešen zadatak: bez unosa */
    disabled?: boolean;
    onStrokeDone?: () => void;
    /** Dete je izašlo iz hodnika (jednom po pokretu) */
    onSlip?: () => void;
    label: string;
    className?: string;
}

interface Anim {
    /** Potezi koje tačka pokazuje, redom */
    strokes: number[];
    /** Koji od njih je u toku */
    index: number;
    /** Pređeni put tačke na tom potezu */
    distance: number;
}

/** Mesto za broj poteza: malo ispred početka, da ne pokriva liniju; brojevi se ne preklapaju */
function badgePositions(sampled: SampledStroke[]): Pt[] {
    const placed: Pt[] = [];
    return sampled.map((s) => {
        const [sx, sy] = pointAt(s, 0);
        const [dx, dy] = directionAt(s, Math.min(4, s.length / 2));
        let point: Pt = [sx - dx * 21, sy - dy * 21];
        for (let tries = 0; tries < 4 && placed.some((p) => Math.hypot(p[0] - point[0], p[1] - point[1]) < 16); tries += 1) {
            point = [point[0] - dy * 16, point[1] + dx * 16];
        }
        placed.push(point);
        return point;
    });
}

const toPoints = (points: readonly Pt[]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export function TracePad({ glyph, guide, strokesDone, lines = "upper", demoRun, hintRun, disabled = false, onStrokeDone, onSlip, label, className }: TracePadProps) {
    const calm = useCalmMotion();
    const tol = TOLERANCE[guide];
    const sampled = useMemo(() => glyph.strokes.map((s) => sampleStroke(s)), [glyph]);
    const frame = useMemo(() => glyphFrame(glyph, 30), [glyph]);
    const badges = useMemo(() => badgePositions(sampled), [sampled]);
    const total = sampled.length;

    const svgRef = useRef<SVGSVGElement>(null);
    // Napredak tekućeg poteza: { potez, put }. Kad igra pređe na sledeći potez, put kreće od nule.
    const [progress, setProgress] = useState<{ stroke: number; distance: number }>({ stroke: strokesDone, distance: 0 });
    const progressRef = useRef(progress);
    /** Poslednji potez koji je tabla sama završila (igra ga potvrđuje malo kasnije) */
    const [localDone, setLocalDone] = useState(strokesDone);
    const active = useRef<{ id: number; last: Pt; off: number } | null>(null);
    const [nudge, setNudge] = useState(0);
    const [anim, setAnim] = useState<Anim | null>(null);
    const [glow, setGlow] = useState<number[] | null>(null);
    const animFrame = useRef<number | null>(null);
    const glowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const current = Math.max(strokesDone, localDone);
    const finished = current >= total;
    const distance = progress.stroke === current ? progress.distance : 0;

    const stopAnimation = useCallback(() => {
        if (animFrame.current !== null) cancelAnimationFrame(animFrame.current);
        animFrame.current = null;
        if (glowTimer.current !== null) clearTimeout(glowTimer.current);
        glowTimer.current = null;
        setAnim(null);
        setGlow(null);
    }, []);

    /** Tačka redom „napiše” zadate poteze; uz „Manje animacija” potezi samo zasvetle */
    const play = useCallback(
        (strokes: number[]) => {
            stopAnimation();
            if (strokes.length === 0) return;
            if (calm) {
                setGlow(strokes);
                glowTimer.current = setTimeout(() => {
                    glowTimer.current = null;
                    setGlow(null);
                }, CALM_SHOW_MS);
                return;
            }
            let index = 0;
            let startedAt = performance.now();
            const tick = (now: number) => {
                const s = sampled[strokes[index]];
                const elapsed = now - startedAt;
                const travel = Math.min(s.length, (Math.max(0, elapsed - 120) / 1000) * DEMO_SPEED);
                setAnim({ strokes, index, distance: travel });
                if (travel >= s.length) {
                    if (elapsed - 120 >= (s.length / DEMO_SPEED) * 1000 + DEMO_GAP_MS) {
                        index += 1;
                        startedAt = now;
                        if (index >= strokes.length) {
                            animFrame.current = null;
                            setAnim(null);
                            return;
                        }
                    }
                }
                animFrame.current = requestAnimationFrame(tick);
            };
            animFrame.current = requestAnimationFrame(tick);
        },
        [calm, sampled, stopAnimation]
    );

    // Model: svi preostali potezi; pomoć: potez koji je na redu
    const currentRef = useRef(current);
    useEffect(() => {
        currentRef.current = current;
    });
    useEffect(() => {
        if (demoRun === 0) return;
        const remaining = Array.from({ length: total - currentRef.current }, (_, i) => currentRef.current + i);
        play(remaining);
    }, [demoRun, total, play]);
    useEffect(() => {
        if (hintRun === 0 || currentRef.current >= total) return;
        play([currentRef.current]);
    }, [hintRun, total, play]);
    useEffect(() => stopAnimation, [stopAnimation]);

    const toLocal = (event: { clientX: number; clientY: number }): Pt | null => {
        const svg = svgRef.current;
        const matrix = svg?.getScreenCTM();
        if (!svg || !matrix) return null;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
        return [point.x, point.y];
    };

    const completeStroke = () => {
        active.current = null;
        setLocalDone(current + 1);
        progressRef.current = { stroke: current + 1, distance: 0 };
        setProgress(progressRef.current);
        onStrokeDone?.();
    };

    const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (disabled || finished) return;
        const point = toLocal(event);
        if (!point) return;
        stopAnimation();
        const s = sampled[current];
        const from = progressRef.current.stroke === current ? progressRef.current.distance : 0;
        if (!nearProgress(s, from, point, tol)) {
            if (from > 0 && nearProgress(s, 0, point, tol)) {
                // Dete kreće ispočetka poteza: i to je u redu, potez se crta iznova
                progressRef.current = { stroke: current, distance: 0 };
                setProgress(progressRef.current);
            } else {
                // Dodir daleko od tačke: tačka blago zatitra (bez glasa, bez greške)
                setNudge((value) => value + 1);
                return;
            }
        }
        event.preventDefault();
        if (s.length <= DOT_LENGTH) {
            completeStroke();
            return;
        }
        try {
            event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
            /* stariji pregledač: prst se prati i bez „hvatanja” */
        }
        active.current = { id: event.pointerId, last: point, off: 0 };
    };

    const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
        const gesture = active.current;
        if (!gesture || gesture.id !== event.pointerId || disabled) return;
        const s = sampled[current];
        if (!s) return;
        const native = event.nativeEvent;
        const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
        const points = (events.length > 0 ? events : [native]).map(toLocal).filter((p): p is Pt => p !== null);
        let value = progressRef.current.stroke === current ? progressRef.current.distance : 0;
        for (const point of points) {
            const result = followSegment(s, value, gesture.last, point, tol);
            value = result.progress;
            gesture.last = point;
            gesture.off = result.offPath > 0 ? gesture.off + result.offPath : 0;
            if (gesture.off > SLIP_LENGTH) {
                // Izašao iz hodnika: pokret se prekida, napredak ostaje; nastavlja se od tačke
                active.current = null;
                progressRef.current = { stroke: current, distance: value };
                setProgress(progressRef.current);
                setNudge((n) => n + 1);
                onSlip?.();
                return;
            }
            if (strokeDone(s, value, tol)) {
                completeStroke();
                return;
            }
        }
        progressRef.current = { stroke: current, distance: value };
        setProgress(progressRef.current);
    };

    const onPointerEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (active.current?.id === event.pointerId) active.current = null;
    };

    // ── Crtanje ──
    const width = 11;
    const showArrows = (i: number) => !finished && i >= current && (guide === "thick" || (guide === "thin" && i === current));
    const dotPoint = !finished && sampled[current] ? pointAt(sampled[current], distance) : null;
    const animStroke = anim ? anim.strokes[anim.index] : null;
    const animPoint = anim && animStroke !== null ? pointAt(sampled[animStroke], anim.distance) : null;

    return (
        <div className={cn("relative flex min-h-0 w-full touch-none select-none items-center justify-center overscroll-contain", className)} style={{ touchAction: "none" }}>
            <svg
                ref={svgRef}
                role="img"
                aria-label={label}
                viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
                preserveAspectRatio="xMidYMid meet"
                className={cn("h-full max-h-full w-full max-w-full touch-none", !disabled && !finished && "cursor-pointer")}
                style={{ touchAction: "none" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onLostPointerCapture={onPointerEnd}
                onContextMenu={(event) => event.preventDefault()}
            >
                {/* Linije sveske: vrh slova, (srednja linija za mala slova) i linija na kojoj slovo stoji */}
                {/* (linije idu preko cele table, i van okvira slova) */}
                <g stroke="#dcd9ee" strokeWidth={1.4} vectorEffect="non-scaling-stroke">
                    <line x1={frame.x - 400} x2={frame.x + frame.w + 400} y1={0} y2={0} strokeDasharray="6 6" />
                    {lines === "lower" && <line x1={frame.x - 400} x2={frame.x + frame.w + 400} y1={40} y2={40} strokeDasharray="6 6" />}
                    <line x1={frame.x - 400} x2={frame.x + frame.w + 400} y1={100} y2={100} stroke="#c9c5e3" strokeWidth={2} />
                </g>

                {/* Uzor: debelo (svetla traka + tačkice) ili tanko (samo tačkice) */}
                {guide !== "copy" &&
                    sampled.map((s, i) => (
                        <g key={`guide-${i}`} fill="none" strokeLinecap="round" strokeLinejoin="round">
                            {guide === "thick" && <polyline points={toPoints(s.pts)} stroke={GUIDE_BAND} strokeWidth={tol * 1.3} />}
                            <polyline points={toPoints(s.pts)} stroke={GUIDE_DOTS} strokeWidth={guide === "thick" ? 4.5 : 3.2} strokeDasharray={guide === "thick" ? "0.1 7.5" : "0.1 6"} />
                        </g>
                    ))}

                {/* Pomoć uz „Manje animacija”: potez samo zasvetli */}
                {glow?.map((i) => (
                    <polyline key={`glow-${i}`} points={toPoints(sampled[i].pts)} fill="none" stroke={DOT_COLOR} strokeOpacity={0.4} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
                ))}

                {/* Gotovi potezi i deo tekućeg koji je dete već povuklo */}
                {sampled.map((s, i) =>
                    i < current ? (
                        <polyline key={`done-${i}`} points={toPoints(s.pts)} fill="none" stroke={STROKE_COLORS[i % STROKE_COLORS.length]} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
                    ) : null
                )}
                {!finished && distance > 0 && (
                    <polyline points={toPoints(pointsUpTo(sampled[current], distance))} fill="none" stroke={STROKE_COLORS[current % STROKE_COLORS.length]} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
                )}

                {/* Redosled: broj i strelica na početku poteza */}
                {sampled.map((s, i) => {
                    if (!showArrows(i) || s.length <= DOT_LENGTH) return null;
                    const at = Math.min(32, s.length * 0.5);
                    const [hx, hy] = pointAt(s, at);
                    const [dx, dy] = directionAt(s, at);
                    const shaft = pointsBetween(s, Math.min(13, at * 0.4), at);
                    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                    const [bx, by] = badges[i];
                    const isCurrent = i === current;
                    return (
                        <g key={`arrow-${i}`} opacity={isCurrent ? 1 : 0.55}>
                            <polyline points={toPoints(shaft)} fill="none" stroke="#f59e0b" strokeWidth={2.6} strokeLinecap="round" />
                            <path d="M -5 -5 L 4 0 L -5 5 Z" fill="#f59e0b" transform={`translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${angle.toFixed(1)})`} />
                            <circle cx={bx} cy={by} r={7.5} fill="#ffffff" stroke="#f59e0b" strokeWidth={2} />
                            <text x={bx} y={by + 3.6} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#955005" style={{ fontFamily: "var(--font-sans)" }}>
                                {i + 1}
                            </text>
                        </g>
                    );
                })}

                {/* Tačka koja pokazuje potez (model / pomoć) i trag iza nje */}
                {anim && animStroke !== null && animPoint && (
                    <g>
                        <polyline points={toPoints(pointsUpTo(sampled[animStroke], anim.distance))} fill="none" stroke={DOT_COLOR} strokeOpacity={0.35} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx={animPoint[0]} cy={animPoint[1]} r={9} fill={DOT_COLOR} stroke="#ffffff" strokeWidth={3} />
                    </g>
                )}

                {/* Tačka „prati me”: odavde dete nastavlja */}
                {!anim && dotPoint && !disabled && (
                    <g key={`dot-${nudge}`}>
                        {!calm && (
                            <circle cx={dotPoint[0]} cy={dotPoint[1]} r={10} fill={DOT_COLOR} opacity={0.25}>
                                <animate attributeName="r" values="10;17;10" dur="1.8s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.3;0;0.3" dur="1.8s" repeatCount="indefinite" />
                            </circle>
                        )}
                        <circle cx={dotPoint[0]} cy={dotPoint[1]} r={9} fill={DOT_COLOR} stroke="#ffffff" strokeWidth={3}>
                            {nudge > 0 && !calm && <animate attributeName="r" values="9;12;9" dur="0.45s" repeatCount="2" />}
                        </circle>
                    </g>
                )}
                {/* Na monitoru: samo gde je dete stalo */}
                {disabled && dotPoint && !finished && <circle cx={dotPoint[0]} cy={dotPoint[1]} r={7} fill={DOT_COLOR} opacity={0.6} />}
            </svg>
        </div>
    );
}

/** Tačka (i, j) se crta kao kružić */
function isDotStroke(points: readonly Pt[]): boolean {
    const [first, last] = [points[0], points[points.length - 1]];
    return points.length <= 2 && Math.hypot(first[0] - last[0], first[1] - last[1]) <= DOT_LENGTH;
}

/** Slovo ili broj kao miran crtež (uzor za prepisivanje, kartice „Gde je slovo…?”) */
export function GlyphPicture({ glyph, color = "#2b2552", multicolor = false, className }: { glyph: Glyph; color?: string; multicolor?: boolean; className?: string }) {
    const frame = glyphFrame(glyph, 12);
    return (
        <svg viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" className={className}>
            {glyph.strokes.map((s, i) => (
                <polyline
                    key={i}
                    points={toPoints(s)}
                    fill="none"
                    stroke={multicolor ? STROKE_COLORS[i % STROKE_COLORS.length] : color}
                    strokeWidth={isDotStroke(s) ? 13 : 11}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}
        </svg>
    );
}
