// Zajednički delovi novih crteža (isti kao u igrama „Šta jede?” i „Šta fali?”): tanka tamnija
// ivica oblih krajeva, odsjaj, oči sa sjajem i rumeni obrazi.

export const INK = "#4a3a32";
export const BLUSH = "#f59a9a";

export const line = (color: string, width = 1.6) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

/** Beli odsjaj (kao na jabuci) */
export function Shine({ x, y, rx = 4, ry = 7, rotate = 20, opacity = 0.45 }: { x: number; y: number; rx?: number; ry?: number; rotate?: number; opacity?: number }) {
    return <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#ffffff" opacity={opacity} transform={`rotate(${rotate} ${x} ${y})`} />;
}

/** Oko sa sjajem */
export function Eye({ x, y, r = 3.2 }: { x: number; y: number; r?: number }) {
    return (
        <g>
            <circle cx={x} cy={y} r={r} fill={INK} />
            <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.36} fill="#ffffff" />
        </g>
    );
}

export function Cheek({ x, y, r = 3.2 }: { x: number; y: number; r?: number }) {
    return <circle cx={x} cy={y} r={r} fill={BLUSH} opacity={0.45} />;
}

/** Blag osmeh oko tačke (x, y) */
export function Smile({ x, y, w = 4 }: { x: number; y: number; w?: number }) {
    return <path d={`M${x - w} ${y} Q${x} ${y + w * 0.9} ${x + w} ${y}`} fill="none" {...line(INK, 1.5)} />;
}

/** Senka ispod predmeta */
export function Shadow({ cx = 50, cy = 94, rx = 30 }: { cx?: number; cy?: number; rx?: number }) {
    return <ellipse cx={cx} cy={cy} rx={rx} ry={3.2} fill="#000000" opacity={0.08} />;
}
