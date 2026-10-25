"use client";

// Crteži za igre sa umetanjem („Sat”, „Umetaljka”): drvena tabla, rupa u njoj i obojen
// drveni komad koji u rupu tačno ulazi (isti obris iz shapePaths.ts). Sve je SVG u kodu,
// pa izgleda isto na svakom uređaju. Pokreti su kratki i mirni, a uz „Manje animacija”
// nema ni njih: komad samo stoji na mestu, pomoć je mirna ivica umesto treptaja.

import { useId, type ReactNode, type SVGProps } from "react";
import { PIECE_PALETTE, SHAPE_PATHS, type PieceColor, type ShapeKey } from "./shapePaths";

/** Boje drveta: tabla, njena ivica, dno rupe i senka u rupi */
export const WOOD = {
    board: "#EBC48E",
    boardLight: "#F5DAB0",
    grain: "#D9A86A",
    edge: "#B47C42",
    edgeDark: "#8A5A2B",
    holeFloor: "#7A4E26",
    holeShadow: "#4A2E14",
    plain: "#E8C08A",
    plainEdge: "#9C6B35",
    ink: "#3B2414",
};

/** Boja pomoći (ista ljubičasta kao isticanje odgovora u ostalim igrama) */
const GLOW = "#6C61F0";

/**
 * Stilovi pokreta (jednom po tabli): pomoć blago „diše”, komad koji legne kratko se spusti
 * u rupu. Klase važe samo unutar SVG-a koji ih uključi.
 */
export function InsetStyles() {
    return (
        <style>{`
            @keyframes ins-glow { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
            @keyframes ins-snap { 0% { transform: scale(1.12); } 60% { transform: scale(0.97); } 100% { transform: scale(1); } }
            .ins-glow { animation: ins-glow 1.6s ease-in-out infinite; }
            .ins-snap { animation: ins-snap 0.32s ease-out both; transform-box: fill-box; transform-origin: center; }
            @media (prefers-reduced-motion: reduce) { .ins-glow, .ins-snap { animation: none; } }
        `}</style>
    );
}

/** Svi delovi oblika, svaki kao poseban <path> (vidi shapePaths.ts) */
function Parts({ shape, ...props }: { shape: ShapeKey } & SVGProps<SVGPathElement>) {
    return (
        <>
            {SHAPE_PATHS[shape].map((d, i) => (
                <path key={i} d={d} fillRule="evenodd" {...props} />
            ))}
        </>
    );
}

interface PieceProps {
    shape: ShapeKey;
    color: PieceColor;
    /** Okret u stepenima (oko sredine okvira 100 × 100) */
    rot?: number;
    /** Drvena „dugmad” za hvatanje, kao na pravoj umetaljci */
    knob?: boolean;
    /** Komad boje drveta (bez boje — ostaje samo oblik ili broj) */
    plain?: boolean;
    /** Crtež preko komada (broj na satu) */
    children?: ReactNode;
}

/**
 * Obojen drveni komad u okviru 100 × 100 (crta se unutar SVG-a). Dva sloja istog obrisa:
 * širi daje ivicu, uži ispunu — bez linija na spojevima delova. Odsjaj gore levo.
 */
export function ShapePiece({ shape, color, rot = 0, knob = false, plain = false, children }: PieceProps) {
    const clip = useId();
    const paint = plain ? { fill: WOOD.plain, edge: WOOD.plainEdge, light: WOOD.boardLight } : PIECE_PALETTE[color];
    return (
        <g transform={rot ? `rotate(${rot} 50 50)` : undefined}>
            <defs>
                <clipPath id={clip}>
                    <Parts shape={shape} />
                </clipPath>
            </defs>
            {/* Senka ispod komada (komad je deblji od table) */}
            <g transform="translate(1.5 3)" opacity={0.22}>
                <Parts shape={shape} fill={WOOD.holeShadow} stroke={WOOD.holeShadow} strokeWidth={5} strokeLinejoin="round" />
            </g>
            <Parts shape={shape} fill={paint.edge} stroke={paint.edge} strokeWidth={5} strokeLinejoin="round" />
            <Parts shape={shape} fill={paint.fill} />
            <g clipPath={`url(#${clip})`}>
                <ellipse cx={30} cy={22} rx={34} ry={17} fill="#ffffff" opacity={0.28} transform="rotate(-24 30 22)" />
                <g transform="translate(0 4)" opacity={0.18}>
                    <Parts shape={shape} fill="none" stroke={paint.edge} strokeWidth={4} />
                </g>
            </g>
            {knob && (
                <g>
                    <circle cx={50} cy={52} r={8.5} fill={WOOD.holeShadow} opacity={0.25} />
                    <circle cx={50} cy={50} r={8} fill={WOOD.plain} stroke={WOOD.plainEdge} strokeWidth={2} />
                    <circle cx={47.5} cy={47.5} r={2.6} fill="#ffffff" opacity={0.6} />
                </g>
            )}
            {children}
        </g>
    );
}

interface HoleProps {
    shape: ShapeKey;
    /** Okret rupe (stepeni) */
    rot?: number;
    /** Rupa obojena svetlom bojom komada koji u nju ide (više podrške) */
    tint?: PieceColor | null;
    /** Pomoć: rupa svetli */
    glow?: boolean;
    /** Komad je iznad rupe (prevlačenje) */
    over?: boolean;
    calm?: boolean;
}

/** Udubljenje u drvetu: tamno dno, senka uz gornju levu ivicu, svetla ivica table oko rupe */
export function ShapeHole({ shape, rot = 0, tint = null, glow = false, over = false, calm = false }: HoleProps) {
    const clip = useId();
    return (
        <g transform={rot ? `rotate(${rot} 50 50)` : undefined}>
            <defs>
                <clipPath id={clip}>
                    <Parts shape={shape} />
                </clipPath>
            </defs>
            {/* Svetla ivica table oko rupe (urezan rub) */}
            <Parts shape={shape} fill="none" stroke={WOOD.boardLight} strokeWidth={7} strokeLinejoin="round" />
            <Parts shape={shape} fill={WOOD.holeShadow} stroke={WOOD.edgeDark} strokeWidth={2.5} strokeLinejoin="round" />
            <g clipPath={`url(#${clip})`}>
                <g transform="translate(3 4.5)">
                    <Parts shape={shape} fill={WOOD.holeFloor} />
                </g>
                {tint && (
                    <g transform="translate(3 4.5)">
                        <Parts shape={shape} fill={PIECE_PALETTE[tint].light} opacity={0.75} />
                    </g>
                )}
            </g>
            {(glow || over) && (
                <Parts
                    shape={shape}
                    fill={over ? GLOW : "none"}
                    fillOpacity={over ? 0.18 : 0}
                    stroke={GLOW}
                    strokeWidth={over ? 5 : 6}
                    strokeLinejoin="round"
                    className={glow && !over && !calm ? "ins-glow" : undefined}
                />
            )}
        </g>
    );
}

/** Drvena ploča (pravougaonik sa zaobljenim uglovima, godovi, svetla gornja ivica) */
export function WoodBoard({ width, height, radius = 28 }: { width: number; height: number; radius?: number }) {
    const grain = useId();
    return (
        <g>
            <defs>
                <linearGradient id={grain} x1="0" y1="0" x2="0.3" y2="1">
                    <stop offset="0" stopColor={WOOD.boardLight} />
                    <stop offset="1" stopColor={WOOD.board} />
                </linearGradient>
            </defs>
            <rect x={2} y={6} width={width - 4} height={height - 6} rx={radius} fill={WOOD.edgeDark} opacity={0.35} />
            <rect x={2} y={2} width={width - 4} height={height - 8} rx={radius} fill={`url(#${grain})`} stroke={WOOD.edge} strokeWidth={4} />
            {/* Godovi: nekoliko mekih talasastih linija */}
            <g fill="none" stroke={WOOD.grain} strokeWidth={2} strokeLinecap="round" opacity={0.45}>
                {[0.22, 0.48, 0.74].map((f) => (
                    <path key={f} d={`M${radius} ${height * f} C ${width * 0.3} ${height * f - 10}, ${width * 0.6} ${height * f + 12}, ${width - radius} ${height * f - 4}`} />
                ))}
            </g>
        </g>
    );
}

// ── Korpa sa komadima ─────────────────────────────────────────────────────────
// Na uspravnom ekranu korpa je ispod table (jedan-dva reda), na položenom pored nje (dva-tri
// reda). Široka i niska tabla (2–3 rupe u redu, 8 rupa u dva reda) i na položenom ekranu ima
// korpu ispod sebe, u jednom redu — tako tabla dobija visinu. Komadi su što veći, ali uvek
// bar 44 px (dugme za mali prst), a redovi staju u visinu.

/** Tabla je široka i niska: korpa ide ispod nje i na položenom ekranu */
/**
 * Rupa kao dugme (dodir komada, pa rupe): kad je rupa sitna (sat na položenom telefonu), nevidljiv
 * okvir oko nje proširuje dodir na najmanje 48 px — slika rupe ostaje ista.
 */
export const HOLE_HIT = "before:absolute before:inset-[min(0px,calc(50%-1.5rem))] before:rounded-2xl before:content-['']";

export function isWideBoard(width: number, height: number): boolean {
    return width / height >= 1.6;
}

/** Kolone korpe: uspravno (ispod table) i položeno (pored table, ili ispod široke table) */
export function trayColumns(count: number, wide = false): { cols: number; side: number } {
    const cols = count <= 6 ? count : count <= 8 ? 4 : count <= 10 ? 5 : 6;
    const side = wide ? count : count <= 3 ? count : count === 4 ? 2 : count <= 6 ? 3 : 4;
    return { cols, side };
}

const TRAY_COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" };
const TRAY_SIDE: Record<number, string> = {
    1: "landscape:grid-cols-1",
    2: "landscape:grid-cols-2",
    3: "landscape:grid-cols-3",
    4: "landscape:grid-cols-4",
    5: "landscape:grid-cols-5",
    6: "landscape:grid-cols-6",
    8: "landscape:grid-cols-8",
};

/** Klase mreže korpe */
export function trayGrid(count: number, wide = false): string {
    const { cols, side } = trayColumns(count, wide);
    return `${TRAY_COLS[cols] ?? "grid-cols-6"} ${TRAY_SIDE[side] ?? "landscape:grid-cols-4"}`;
}

/** Veličina komada u korpi: što manje komada, to su veći */
export function trayPieceSize(count: number, wide = false): string {
    const { side } = trayColumns(count, wide);
    const rows = Math.ceil(count / side);
    const flat = wide
        ? count <= 4
            ? "landscape:w-[clamp(3rem,min(16dvh,11vw),6.5rem)]"
            : count <= 6
              ? "landscape:w-[clamp(3rem,min(15dvh,8vw),5.5rem)]"
              : "landscape:w-[clamp(3rem,min(14dvh,5.6vw),5.5rem)]"
        : rows <= 1
          ? "landscape:w-[clamp(3rem,17dvh,6rem)]"
          : rows === 2
            ? "landscape:w-[clamp(3rem,16dvh,5.5rem)]"
            : "landscape:w-[clamp(3rem,14dvh,5rem)]";
    if (count <= 3) return `w-[clamp(3.5rem,min(24vw,12dvh),7rem)] ${flat}`;
    if (count <= 4) return `w-[clamp(3.25rem,min(20vw,11dvh),6.5rem)] ${flat}`;
    if (count <= 6) return `w-[clamp(3rem,min(14.5vw,9dvh),5.5rem)] ${flat}`;
    if (count <= 8) return `w-[clamp(3rem,min(19vw,9dvh),5.5rem)] ${flat}`;
    if (count <= 10) return `w-[clamp(3rem,min(16vw,8dvh),5rem)] ${flat}`;
    return `w-[clamp(3rem,min(14vw,7.5dvh),5rem)] ${flat}`;
}
