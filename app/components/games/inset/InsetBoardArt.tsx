"use client";

// Crteži igre „Umetaljka”: drvena tabla sa rupama raspoređenim u mrežu i obojeni drveni komadi
// sa drvenim dugmetom za hvatanje. Obris rupe i komada je isti (kit/shapePaths.ts).

import { InsetStyles, ShapeHole, ShapePiece, WoodBoard } from "@/app/components/games/kit/InsetArt";
import { getInsetShape } from "@/app/components/games/data/insetLevels";
import type { ShapeKey } from "@/app/components/games/kit/shapePaths";

/** Ćelija table (jedinice crteža); rupa je 100 × 100 u sredini ćelije */
export const INSET_CELL = 128;
export const INSET_HOLE = 100;
export const INSET_PAD = 18;

/** Kolone za dati broj rupa: 2 → 2, 3 → 3, 4 → 2 × 2, 5 i 6 → 3, 8 → 4 × 2 */
export function insetColumns(count: number): number {
    if (count <= 3) return count;
    if (count === 4) return 2;
    if (count <= 6) return 3;
    return 4;
}

export function insetBoardSize(count: number): { width: number; height: number } {
    const cols = insetColumns(count);
    const rows = Math.ceil(count / cols);
    return { width: cols * INSET_CELL + INSET_PAD * 2, height: rows * INSET_CELL + INSET_PAD * 2 };
}

/** Gornji levi ugao rupe (okvir 100 × 100); poslednji red je centriran kad nije pun */
export function holeOrigin(index: number, count: number): { x: number; y: number } {
    const cols = insetColumns(count);
    const row = Math.floor(index / cols);
    const inRow = Math.min(cols, count - row * cols);
    const shift = ((cols - inRow) * INSET_CELL) / 2;
    const gap = (INSET_CELL - INSET_HOLE) / 2;
    return { x: INSET_PAD + shift + (index % cols) * INSET_CELL + gap, y: INSET_PAD + row * INSET_CELL + gap };
}

interface BoardProps {
    holes: readonly string[];
    filled: readonly string[];
    tint: boolean;
    plain: boolean;
    glow: string | null;
    over: string | null;
    last: string | null;
    calm: boolean;
}

export function InsetBoardArt({ holes, filled, tint, plain, glow, over, last, calm }: BoardProps) {
    const size = insetBoardSize(holes.length);
    return (
        <g>
            <InsetStyles />
            <WoodBoard width={size.width} height={size.height} radius={30} />
            {holes.map((id, index) => {
                const shape = getInsetShape(id);
                if (!shape) return null;
                const o = holeOrigin(index, holes.length);
                return (
                    <g key={id} transform={`translate(${o.x} ${o.y})`}>
                        {filled.includes(id) ? (
                            <g className={last === id && !calm ? "ins-snap" : undefined}>
                                <ShapePiece shape={shape.id} color={shape.color} plain={plain} knob />
                            </g>
                        ) : (
                            <ShapeHole shape={shape.id} tint={tint && !plain ? shape.color : null} glow={glow === id} over={over === id} calm={calm} />
                        )}
                    </g>
                );
            })}
        </g>
    );
}

/** Komad kao samostalna slika (korpa, „duh” koji prati prst), okrenut za `rot` stepeni */
export function InsetPieceSvg({ id, rot = 0, plain = false, calm = true, className }: { id: ShapeKey | string; rot?: number; plain?: boolean; calm?: boolean; className?: string }) {
    const shape = getInsetShape(id);
    if (!shape) return null;
    return (
        <svg viewBox="-6 -6 112 112" className={className} aria-hidden="true" focusable="false">
            <g style={{ transform: `rotate(${rot}deg)`, transformOrigin: "50px 50px", transition: calm ? undefined : "transform 0.3s cubic-bezier(0.3, 0.7, 0.4, 1)" }}>
                <ShapePiece shape={shape.id} color={shape.color} plain={plain} knob />
            </g>
        </svg>
    );
}
