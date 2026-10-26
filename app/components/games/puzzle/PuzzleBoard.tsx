"use client";

// Tabla i korpa za „Složi sliku”. Deo se prevlači prstom na tablu (prst „drži” deo i van
// korpe); može i dodir na deo, pa dodir na mesto na tabli (i tastaturom) — za decu kojoj je
// prevlačenje teško. Deo „sedne” samo na svoje mesto; inače se mirno vrati u korpu.
// Veličine se računaju iz slobodnog prostora (boardLayout.ts), pa sve staje bez pomeranja ekrana.

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { DemoHand } from "@/app/components/games/kit";
import { pieceShapes, PUZZLE_H, PUZZLE_W, tabMargin, type PieceShape, type PuzzlePictureId, type PuzzleRound, type PuzzleView, type TrayPiece } from "@/app/components/games/data/puzzleLevels";
import { dropCell, GAP, puzzleLayout, traySlots } from "@/app/components/games/puzzle/boardLayout";
import { PuzzleScene } from "@/app/components/games/puzzle/pictures";
import { cn } from "@/lib/cn";

const INK = "#3d3357";
const HIGHLIGHT = "#6C61F0";
/** Pomeranje (px) posle kog dodir postaje prevlačenje */
const DRAG_START_PX = 6;
/** Koliko traje pokazni let dela (ruka ga nosi na mesto) */
export const DEMO_MOVE_MS = 1300;

// ── Deo slike ─────────────────────────────────────────────────────────────────

interface PieceArtProps {
    shape: PieceShape;
    picture: PuzzlePictureId;
    margin: number;
    className?: string;
    style?: CSSProperties;
}

/** Jedan deo: cela slika isečena po obrisu dela (clipPath), sa tamnim obrisom */
export function PieceArt({ shape, picture, margin, className, style }: PieceArtProps) {
    const clip = `pz-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
    return (
        <svg
            viewBox={`${shape.x - margin} ${shape.y - margin} ${shape.w + 2 * margin} ${shape.h + 2 * margin}`}
            aria-hidden="true"
            focusable="false"
            className={cn("block overflow-visible", className)}
            style={style}
        >
            <defs>
                <clipPath id={clip}>
                    <path d={shape.d} />
                </clipPath>
            </defs>
            <g clipPath={`url(#${clip})`}>
                <PuzzleScene id={picture} />
            </g>
            <path d={shape.d} fill="none" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

// ── Tabla i korpa ─────────────────────────────────────────────────────────────

interface PuzzleBoardProps {
    round: PuzzleRound;
    view: PuzzleView;
    calm: boolean;
    /** Monitor ili slika je složena: ništa se ne pomera */
    disabled: boolean;
    /** Deo koji ruka upravo nosi na mesto (pokazni deo) */
    demo: string | null;
    onSelect: (id: string) => void;
    /** Deo spušten na polje (null = spušten van table) */
    onDrop: (id: string, cell: number | null) => void;
    /** Ruka je donela pokazni deo do mesta */
    onDemoDone: () => void;
}

interface DragState {
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    /** Gde je prst uhvatio deo (jedinice slike, od gornjeg levog ugla okvira dela) */
    grabX: number;
    grabY: number;
    moved: boolean;
}

export function PuzzleBoard({ round, view, calm, disabled, demo, onSelect, onDrop, onDemoDone }: PuzzleBoardProps) {
    const boxRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const placedClip = `pz-board-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;

    useLayoutEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const measure = () => setSize((prev) => (Math.abs(prev.width - box.clientWidth) < 1 && Math.abs(prev.height - box.clientHeight) < 1 ? prev : { width: box.clientWidth, height: box.clientHeight }));
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(box);
        return () => observer.disconnect();
    }, []);

    const cut = useMemo(() => ({ cols: round.cols, rows: round.rows, edges: round.edges }), [round.cols, round.rows, round.edges]);
    const shapes = useMemo(() => pieceShapes(cut), [cut]);
    const margin = tabMargin(cut);
    const layout = useMemo(
        () => puzzleLayout({ width: size.width, height: size.height, cols: round.cols, rows: round.rows, margin, pieces: round.tray.length }),
        [size.width, size.height, round.cols, round.rows, margin, round.tray.length]
    );
    const { board, scale, tray } = layout;
    const cw = PUZZLE_W / round.cols;
    const ch = PUZZLE_H / round.rows;
    const boxW = (cw + 2 * margin) * scale;
    const boxH = (ch + 2 * margin) * scale;

    const pieces = useMemo(() => new Map(round.tray.map((piece) => [piece.id, piece])), [round.tray]);
    const slots = traySlots(
        round.tray.map((piece) => piece.id),
        view.placed,
        tray.capacity
    );
    const filled = new Set([...round.given, ...view.placed.flatMap((id) => pieces.get(id)?.cell ?? [])]);
    const hintCell = view.hint ? pieces.get(view.hint)?.cell : undefined;

    // ── Prevlačenje ───────────────────────────────────────────────────────────
    const drag = useRef<DragState | null>(null);
    const point = useRef({ x: 0, y: 0 });
    const ghost = useRef<HTMLDivElement | null>(null);
    const skipClick = useRef(false);
    const [dragging, setDragging] = useState<string | null>(null);

    /** Gornji levi ugao okvira dela koji prst nosi (px, u odnosu na prostor igre) */
    const ghostAt = () => {
        const rect = boxRef.current?.getBoundingClientRect();
        const current = drag.current;
        if (!rect || !current) return { x: 0, y: 0 };
        return { x: point.current.x - rect.left - current.grabX * scale, y: point.current.y - rect.top - current.grabY * scale };
    };

    const placeGhost = (el: HTMLDivElement | null) => {
        ghost.current = el;
        if (!el) return;
        const at = ghostAt();
        el.style.transform = `translate(${at.x}px, ${at.y}px)`;
    };

    const reset = () => {
        drag.current = null;
        setDragging(null);
    };

    const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, piece: TrayPiece) => {
        if (disabled || demo || (event.pointerType === "mouse" && event.button !== 0)) return;
        try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
            /* bez hvatanja: događaji i dalje stižu dok je prst nad delom */
        }
        const rect = event.currentTarget.getBoundingClientRect();
        // Okvir dela u korpi je centriran u dugmetu
        const itemScale = tray.item.w / (cw + 2 * margin);
        const left = rect.left + (rect.width - tray.item.w) / 2;
        const top = rect.top + (rect.height - tray.item.h) / 2;
        drag.current = {
            id: piece.id,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            grabX: (event.clientX - left) / itemScale,
            grabY: (event.clientY - top) / itemScale,
            moved: false,
        };
        point.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        point.current = { x: event.clientX, y: event.clientY };
        if (!current.moved) {
            if (Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < DRAG_START_PX) return;
            current.moved = true;
            setDragging(current.id);
        }
        placeGhost(ghost.current);
    };

    const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        if (current.moved) {
            skipClick.current = true;
            point.current = { x: event.clientX, y: event.clientY };
            const at = ghostAt();
            // Središte polja dela u jedinicama slike
            const x = (at.x - board.x) / scale + margin + cw / 2;
            const y = (at.y - board.y) / scale + margin + ch / 2;
            const piece = pieces.get(current.id);
            const own = piece && piece.picture === round.picture ? piece.cell : null;
            onDrop(current.id, dropCell(round.cols, round.rows, x, y, own));
        }
        reset();
    };

    const onPieceClick = (id: string) => {
        if (skipClick.current) {
            skipClick.current = false;
            return;
        }
        onSelect(id);
    };

    // ── Pokazni deo: ruka nosi deo iz korpe na njegovo mesto ─────────────────
    // Deo prvo stoji u korpi (ruka na njemu), pa poleti na mesto; uz „Manje animacija” samo zastane
    const [demoAt, setDemoAt] = useState<"start" | "end">("start");
    const demoDoneRef = useRef(onDemoDone);
    useEffect(() => {
        demoDoneRef.current = onDemoDone;
    });
    useEffect(() => {
        if (!demo) return;
        const timer = window.setTimeout(() => (calm ? demoDoneRef.current() : setDemoAt("end")), calm ? DEMO_MOVE_MS : 500);
        return () => {
            window.clearTimeout(timer);
            setDemoAt("start");
        };
    }, [demo, calm]);

    const slotOf = (id: string) => slots.indexOf(id);
    const slotRect = (index: number) => {
        const col = index % tray.cols;
        const row = Math.floor(index / tray.cols);
        const usedRows = Math.ceil(Math.min(tray.capacity, round.tray.length) / tray.cols);
        const gridW = tray.cols * tray.item.w + (tray.cols - 1) * GAP;
        const gridH = usedRows * tray.item.h + (usedRows - 1) * GAP;
        return {
            x: tray.x + (tray.w - gridW) / 2 + col * (tray.item.w + GAP),
            y: tray.y + (tray.h - gridH) / 2 + row * (tray.item.h + GAP),
        };
    };

    const ready = size.width > 0 && size.height > 0;
    const demoPiece = demo ? pieces.get(demo) : undefined;
    const demoShape = demoPiece ? shapes[demoPiece.cell] : undefined;
    const demoStart = demo ? slotRect(Math.max(0, slotOf(demo))) : { x: 0, y: 0 };
    const demoEnd = demoShape ? { x: board.x + (demoShape.x - margin) * scale, y: board.y + (demoShape.y - margin) * scale } : { x: 0, y: 0 };
    const demoMoved = demoAt === "end" && !calm;
    const dragPiece = dragging ? pieces.get(dragging) : undefined;

    return (
        <div ref={boxRef} className={cn("relative min-h-0 w-full flex-1 select-none", disabled && "pointer-events-none")}>
            {ready && (
                <>
                    {/* Tabla */}
                    <svg
                        viewBox={`0 0 ${PUZZLE_W} ${PUZZLE_H}`}
                        role="img"
                        aria-label={`Tabla: ${view.placed.length + round.given.length} od ${shapes.length} delova je na mestu`}
                        className={cn("absolute overflow-hidden rounded-xl", view.solved && !calm && "animate-pop")}
                        style={{ left: board.x, top: board.y, width: board.w, height: board.h }}
                    >
                        <defs>
                            <clipPath id={placedClip}>
                                {shapes.filter((shape) => filled.has(shape.cell)).map((shape) => (
                                    <path key={shape.cell} d={shape.d} />
                                ))}
                            </clipPath>
                        </defs>
                        <rect x={0} y={0} width={PUZZLE_W} height={PUZZLE_H} fill="#fbfaff" />
                        {/* Vodilja: bleda cela slika (laki nivoi) */}
                        {round.guide && (
                            <g opacity={0.3}>
                                <PuzzleScene id={round.picture} />
                            </g>
                        )}
                        {view.solved ? (
                            <PuzzleScene id={round.picture} />
                        ) : (
                            <>
                                <g clipPath={`url(#${placedClip})`}>
                                    <PuzzleScene id={round.picture} />
                                </g>
                                {shapes.map((shape) =>
                                    filled.has(shape.cell) ? (
                                        <path key={shape.cell} d={shape.d} fill="none" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                                    ) : (
                                        <path
                                            key={shape.cell}
                                            d={shape.d}
                                            fill="none"
                                            stroke="#8f88c9"
                                            strokeWidth={2}
                                            strokeDasharray="7 6"
                                            strokeLinejoin="round"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    )
                                )}
                                {hintCell !== undefined && !filled.has(hintCell) && (
                                    <path
                                        d={shapes[hintCell].d}
                                        fill={HIGHLIGHT}
                                        fillOpacity={0.22}
                                        stroke={HIGHLIGHT}
                                        strokeWidth={4}
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                        className={calm ? undefined : "animate-pulse"}
                                    />
                                )}
                            </>
                        )}
                        <rect x={1} y={1} width={PUZZLE_W - 2} height={PUZZLE_H - 2} rx={10} fill="none" stroke={INK} strokeWidth={3} vectorEffect="non-scaling-stroke" />
                    </svg>

                    {/* Mesta na tabli: dodir (ili Enter) stavlja izabrani deo */}
                    {!view.solved &&
                        shapes
                            .filter((shape) => !filled.has(shape.cell))
                            .map((shape) => (
                                <button
                                    key={shape.cell}
                                    type="button"
                                    data-action={`cell:${shape.cell}`}
                                    tabIndex={view.selected ? 0 : -1}
                                    aria-label={`Mesto ${shape.cell + 1}`}
                                    disabled={disabled || !view.selected}
                                    onClick={() => view.selected && onDrop(view.selected, shape.cell)}
                                    className="absolute rounded-md outline-offset-2 focus-visible:outline-4 focus-visible:outline-brand-500"
                                    style={{ left: board.x + shape.x * scale, top: board.y + shape.y * scale, width: shape.w * scale, height: shape.h * scale }}
                                />
                            ))}

                    {/* Korpa sa delovima */}
                    <div
                        role="group"
                        aria-label="Delovi slike"
                        className="absolute rounded-2xl border-2 border-dashed border-line bg-surface/60"
                        style={{ left: tray.x, top: tray.y, width: tray.w, height: tray.h }}
                    />
                    {slots.map((id, index) => {
                        const at = slotRect(index);
                        const piece = id ? pieces.get(id) : undefined;
                        const box = { left: at.x, top: at.y, width: tray.item.w, height: tray.item.h };
                        if (!piece) return <span key={`empty-${index}`} aria-hidden="true" className="absolute rounded-xl border-2 border-dashed border-line/70" style={box} />;
                        const rejected = view.rejected.includes(piece.id);
                        const selected = view.selected === piece.id;
                        const hinted = view.hint === piece.id;
                        const hidden = dragging === piece.id || demo === piece.id;
                        return (
                            <button
                                key={piece.id}
                                type="button"
                                data-piece={piece.id}
                                disabled={disabled || rejected}
                                aria-pressed={selected}
                                aria-label={rejected ? "Deo koji nije sa ove slike" : `Deo slike ${index + 1}`}
                                onClick={() => onPieceClick(piece.id)}
                                onPointerDown={(event) => onPointerDown(event, piece)}
                                onPointerMove={onPointerMove}
                                onPointerUp={onPointerUp}
                                onPointerCancel={reset}
                                className={cn(
                                    "absolute touch-none rounded-xl outline-offset-4 transition-[opacity,box-shadow] duration-150 focus-visible:outline-4 focus-visible:outline-brand-500 disabled:cursor-default",
                                    selected && "bg-brand-100 ring-4 ring-brand-500",
                                    hinted && !selected && "bg-brand-50 ring-4 ring-brand-400",
                                    hinted && !selected && !calm && "animate-soft-pulse",
                                    rejected && "opacity-60",
                                    hidden && "opacity-0"
                                )}
                                style={box}
                            >
                                <PieceArt shape={shapes[piece.cell]} picture={piece.picture} margin={margin} className={cn("pointer-events-none h-full w-full drop-shadow-md", rejected && "opacity-60 grayscale")} />
                                {rejected && (
                                    <span aria-hidden="true" className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-sun-500 text-base font-black text-white shadow-soft ring-2 ring-white">
                                        ✗
                                    </span>
                                )}
                            </button>
                        );
                    })}

                    {/* Deo koji prst nosi: u veličini table, da se vidi kako će leći */}
                    {dragPiece && (
                        <div ref={placeGhost} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-40" style={{ width: boxW, height: boxH }}>
                            <PieceArt shape={shapes[dragPiece.cell]} picture={dragPiece.picture} margin={margin} className="h-full w-full drop-shadow-xl" />
                        </div>
                    )}

                    {/* Pokazni deo: ruka ga nosi iz korpe na tablu */}
                    {demoPiece && demoShape && (
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute left-0 top-0 z-40 origin-top-left"
                            style={{
                                width: boxW,
                                height: boxH,
                                transform: demoMoved
                                    ? `translate(${demoEnd.x}px, ${demoEnd.y}px) scale(1)`
                                    : `translate(${demoStart.x}px, ${demoStart.y}px) scale(${tray.item.w / boxW})`,
                                transition: calm ? undefined : `transform ${DEMO_MOVE_MS}ms ease-in-out`,
                            }}
                            onTransitionEnd={() => window.setTimeout(() => demoDoneRef.current(), 300)}
                        >
                            <PieceArt shape={demoShape} picture={demoPiece.picture} margin={margin} className="h-full w-full drop-shadow-xl" />
                            <DemoHand className="bottom-auto right-auto left-1/2 top-1/2" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
