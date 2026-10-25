// Obrisi oblika za igre sa umetanjem („Sat”, „Umetaljka”): isti obris crta i rupu na tabli
// i komad koji u nju ulazi, pa komad uvek tačno „legne”. Bez Reacta (koriste ga i testovi).
//
// Svaki oblik je u okviru 100 × 100, sa sredinom oko (50, 50), i sastoji se od delova
// (`parts`). Svaki deo se crta kao poseban <path> sa `fill-rule="evenodd"`, pa se delovi
// slobodno preklapaju (kuća = krov + zid + dimnjak), a deo sa dva obrisa je prsten (glava
// ključa, drška šolje). Crtež je pun i jednostavan, kao drveni komad iz prave umetaljke.

export type ShapeKey =
    // Geometrijski oblici
    | "circle"
    | "oval"
    | "square"
    | "rectangle"
    | "triangle"
    | "trapezoid"
    | "pentagon"
    | "hexagon"
    | "octagon"
    | "star"
    | "heart"
    | "halfCircle"
    | "crescent"
    | "diamond"
    | "flower"
    // Predmeti (silueta)
    | "apple"
    | "car"
    | "house"
    | "fish"
    | "key"
    | "cup"
    | "tree"
    | "mushroom"
    | "umbrella"
    | "cloud"
    | "boat"
    | "icecream";

type Pt = readonly [number, number];

const n = (value: number) => Number(value.toFixed(2));

/** Mnogougao kroz date tačke */
function poly(points: readonly Pt[]): string {
    return `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join(" L")} Z`;
}

/** Krug kao dva luka (radi i kao drugi obris prstena) */
function circle(cx: number, cy: number, r: number): string {
    return ellipse(cx, cy, r, r);
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
    return `M${n(cx - rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 1 ${n(cx + rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 1 ${n(cx - rx)} ${n(cy)} Z`;
}

/** Pravougaonik sa zaobljenim uglovima */
function rect(x: number, y: number, w: number, h: number, r = 0): string {
    const k = Math.min(r, w / 2, h / 2);
    if (k <= 0) return poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
    return (
        `M${n(x + k)} ${n(y)} H${n(x + w - k)} A${n(k)} ${n(k)} 0 0 1 ${n(x + w)} ${n(y + k)} V${n(y + h - k)} ` +
        `A${n(k)} ${n(k)} 0 0 1 ${n(x + w - k)} ${n(y + h)} H${n(x + k)} A${n(k)} ${n(k)} 0 0 1 ${n(x)} ${n(y + h - k)} V${n(y + k)} A${n(k)} ${n(k)} 0 0 1 ${n(x + k)} ${n(y)} Z`
    );
}

/** Pravilan mnogougao: `sides` temena na krugu poluprečnika `r`, prvo teme pod uglom `start` (stepeni) */
function regular(sides: number, cx: number, cy: number, r: number, start: number): string {
    return poly(
        Array.from({ length: sides }, (_, i) => {
            const angle = ((start + (360 / sides) * i) * Math.PI) / 180;
            return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as const;
        })
    );
}

function starPoints(points: number, cx: number, cy: number, outer: number, inner: number): string {
    return poly(
        Array.from({ length: points * 2 }, (_, i) => {
            const radius = i % 2 === 0 ? outer : inner;
            const angle = ((i * (180 / points) - 90) * Math.PI) / 180;
            return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
        })
    );
}

export const SHAPE_PATHS: Readonly<Record<ShapeKey, readonly string[]>> = {
    circle: [circle(50, 50, 44)],
    oval: [ellipse(50, 50, 30, 45)],
    square: [rect(9, 9, 82, 82, 8)],
    rectangle: [rect(2, 25, 96, 50, 7)],
    triangle: [poly([[50, 7], [95, 88], [5, 88]])],
    trapezoid: [poly([[28, 18], [72, 18], [96, 82], [4, 82]])],
    pentagon: [regular(5, 50, 54, 47, -90)],
    hexagon: [regular(6, 50, 50, 46, 0)],
    octagon: [regular(8, 50, 50, 46, 22.5)],
    star: [starPoints(5, 50, 53, 48, 21)],
    heart: ["M50 90 C50 90 7 62 7 35 C7 20 19 11 32 14 C40 16 46 22 50 29 C54 22 60 16 68 14 C81 11 93 20 93 35 C93 62 50 90 50 90 Z"],
    halfCircle: ["M4 73 A46 46 0 0 1 96 73 Z"],
    crescent: ["M80 10 A42 42 0 1 0 80 90 A46 46 0 0 1 80 10 Z"],
    diamond: [poly([[50, 4], [87, 50], [50, 96], [13, 50]])],
    flower: [circle(50, 28, 22), circle(72, 50, 22), circle(50, 72, 22), circle(28, 50, 22), circle(50, 50, 20)],

    apple: [
        "M50 32 C42 22 13 24 13 53 C13 75 29 95 42 95 C46 95 48 93 50 93 C52 93 54 95 58 95 C71 95 87 75 87 53 C87 24 58 22 50 32 Z",
        poly([[47, 12], [53, 11], [54, 34], [48, 34]]),
        "M54 24 C57 10 72 6 82 11 C78 24 64 29 54 24 Z",
    ],
    car: [
        rect(4, 44, 92, 28, 10),
        "M22 48 L34 27 Q36 23 41 23 L63 23 Q68 23 70 27 L82 48 Z",
        circle(27, 72, 13),
        circle(73, 72, 13),
    ],
    house: [poly([[50, 6], [94, 44], [6, 44]]), rect(16, 40, 68, 54, 4), rect(66, 12, 12, 24, 2)],
    fish: [ellipse(42, 52, 34, 23), poly([[66, 52], [96, 28], [96, 76]]), poly([[32, 32], [54, 14], [60, 34]])],
    key: [`${circle(28, 50, 23)} ${circle(28, 50, 10)}`, rect(46, 44, 50, 12, 4), rect(72, 52, 9, 17, 2), rect(86, 52, 10, 22, 2)],
    cup: ["M12 22 H72 V62 Q72 90 46 90 H38 Q12 90 12 62 Z", `${ellipse(74, 50, 20, 19)} ${ellipse(74, 50, 10, 9)}`],
    tree: [poly([[50, 4], [74, 36], [26, 36]]), poly([[50, 20], [82, 58], [18, 58]]), poly([[50, 38], [90, 80], [10, 80]]), rect(42, 74, 16, 22, 2)],
    mushroom: ["M6 58 Q6 8 50 8 Q94 8 94 58 Z", rect(34, 48, 32, 46, 9)],
    umbrella: [
        "M6 54 Q6 10 50 8 Q94 10 94 54 Q86 47 78 54 Q71 47 64 54 Q57 47 50 54 Q43 47 36 54 Q29 47 22 54 Q14 47 6 54 Z",
        rect(46, 48, 8, 36, 3),
        "M46 80 L54 80 L54 84 Q54 98 38 97 L38 90 Q46 90 46 84 Z",
    ],
    cloud: [circle(29, 60, 19), circle(50, 42, 25), circle(73, 57, 21), rect(29, 54, 44, 25, 8)],
    boat: ["M4 60 H96 L82 88 H18 Z", rect(46, 8, 7, 54, 2), poly([[56, 12], [88, 54], [56, 54]]), poly([[43, 20], [43, 54], [16, 54]])],
    icecream: [poly([[27, 46], [73, 46], [50, 97]]), circle(50, 33, 27)],
};

export const SHAPE_KEYS = Object.keys(SHAPE_PATHS) as ShapeKey[];

export function isShapeKey(value: unknown): value is ShapeKey {
    return typeof value === "string" && Object.hasOwn(SHAPE_PATHS, value);
}

// ── Boje komada ───────────────────────────────────────────────────────────────

export type PieceColor = "red" | "orange" | "yellow" | "green" | "teal" | "sky" | "blue" | "purple" | "pink" | "brown";

/** Ispuna, tamnija ivica iste nijanse i svetliji odsjaj (drveni komad obojen lakom) */
export const PIECE_PALETTE: Readonly<Record<PieceColor, { fill: string; edge: string; light: string }>> = {
    red: { fill: "#EF4444", edge: "#B91C1C", light: "#FCA5A5" },
    orange: { fill: "#FB923C", edge: "#C2410C", light: "#FED7AA" },
    yellow: { fill: "#FBBF24", edge: "#B45309", light: "#FDE68A" },
    green: { fill: "#22C55E", edge: "#15803D", light: "#86EFAC" },
    teal: { fill: "#14B8A6", edge: "#0F766E", light: "#99F6E4" },
    sky: { fill: "#38BDF8", edge: "#0369A1", light: "#BAE6FD" },
    blue: { fill: "#3B82F6", edge: "#1D4ED8", light: "#BFDBFE" },
    purple: { fill: "#A855F7", edge: "#7E22CE", light: "#E9D5FF" },
    pink: { fill: "#F472B6", edge: "#BE185D", light: "#FBCFE8" },
    brown: { fill: "#B45309", edge: "#78350F", light: "#FCD34D" },
};

export const PIECE_COLORS = Object.keys(PIECE_PALETTE) as PieceColor[];
