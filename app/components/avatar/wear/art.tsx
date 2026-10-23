// Zajednički pomoćni crteži za predmete iz prodavnice (wearables.tsx).
// Čiste funkcije koje vraćaju SVG: bez "use client", bez hook-ova, bez gradijenata sa id-jem
// (isti predmet može biti na više likova na istom ekranu).

import type { ReactNode } from "react";
import type { WearItem, WearSlot, WearVariant } from "../wearables";

export const r1 = (n: number) => Math.round(n * 10) / 10;

/** Ogledalo oko x = 120; putanja sme da ima samo apsolutne parove „x y” (bez H/V/h/v) */
export const mirror = (d: string) =>
    d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${r1(240 - Number(x))} ${y}`);

/** Ogledalo oko x = 0 (crteži u sopstvenim koordinatama: ljubimci, predmeti u ruci) */
export const mirror0 = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${r1(-Number(x))} ${y}`);

/** Zvezda sa pet krakova, vrh nagore */
export function starPath(cx: number, cy: number, outer: number, inner: number): string {
    const points: string[] = [];
    for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        points.push(`${r1(cx + radius * Math.cos(angle))} ${r1(cy + radius * Math.sin(angle))}`);
    }
    return `M${points.join("L")}Z`;
}

/** Srce sa vrhom dole; (cx, cy) je sredina, `s` veličina */
export function heartPath(cx: number, cy: number, s: number): string {
    const p = (x: number, y: number) => `${r1(cx + x * s)} ${r1(cy + y * s)}`;
    return `M${p(0, 1)}C${p(-1.3, 0.2)} ${p(-1.05, -1.05)} ${p(-0.5, -1)}C${p(-0.2, -0.98)} ${p(0, -0.75)} ${p(0, -0.55)}C${p(0, -0.75)} ${p(0.2, -0.98)} ${p(0.5, -1)}C${p(1.05, -1.05)} ${p(1.3, 0.2)} ${p(0, 1)}Z`;
}

export function flower(x: number, y: number, petal: string, size = 1): ReactNode {
    const d = 5.2 * size;
    return (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
            {[0, 72, 144, 216, 288].map((deg) => (
                <circle
                    key={deg}
                    cx={r1(Math.cos(((deg - 90) * Math.PI) / 180) * d)}
                    cy={r1(Math.sin(((deg - 90) * Math.PI) / 180) * d)}
                    r={r1(5.2 * size)}
                    fill={petal}
                />
            ))}
            <circle r={r1(3.6 * size)} fill="#FFC83D" />
            <circle cx={-1.2 * size} cy={-1.2 * size} r={1.3 * size} fill="#fff" opacity="0.7" />
        </g>
    );
}

/** Blag sjaj sleva odozgo i senka ispod vrata — kao na telu likova */
export function torsoLight(variant: WearVariant = "bust"): ReactNode {
    if (variant === "full") {
        return (
            <>
                <ellipse cx="86" cy="240" rx="22" ry="26" fill="#fff" opacity="0.14" />
                <ellipse cx="120" cy="214" rx="50" ry="13" fill="#1D1030" opacity="0.12" />
            </>
        );
    }
    return (
        <>
            <ellipse cx="76" cy="234" rx="40" ry="17" fill="#fff" opacity="0.16" />
            <ellipse cx="120" cy="214" rx="56" ry="15" fill="#1D1030" opacity="0.12" />
        </>
    );
}

/** Bela linija odsjaja (meka, providna) */
export function gloss(d: string, width = 4, opacity = 0.45): ReactNode {
    return <path d={d} stroke="#fff" strokeOpacity={opacity} strokeWidth={width} strokeLinecap="round" fill="none" />;
}

/** Mala iskra (četiri kraka) */
export function sparkle(x: number, y: number, s: number, fill = "#fff"): ReactNode {
    const p = (dx: number, dy: number) => `${r1(x + dx * s)} ${r1(y + dy * s)}`;
    return <path key={`${x}-${y}`} d={`M${p(0, -1)}Q${p(0.15, -0.15)} ${p(1, 0)}Q${p(0.15, 0.15)} ${p(0, 1)}Q${p(-0.15, 0.15)} ${p(-1, 0)}Q${p(-0.15, -0.15)} ${p(0, -1)}Z`} fill={fill} />;
}

/** Oko u crtežima životinja i predmeta: tamna tačka sa sjajem */
export function dotEye(x: number, y: number, r = 3.2): ReactNode {
    return (
        <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r={r} fill="#2A1D18" />
            <circle cx={r1(x - r * 0.35)} cy={r1(y - r * 0.35)} r={r1(r * 0.38)} fill="#fff" />
        </g>
    );
}

/** Mali osmeh (luk) */
export function smile(x: number, y: number, w: number, stroke = "#5A2C24", width = 2.2): ReactNode {
    return <path d={`M${r1(x - w)} ${y}Q${x} ${r1(y + w * 0.9)} ${r1(x + w)} ${y}`} stroke={stroke} strokeWidth={width} strokeLinecap="round" fill="none" />;
}

// ── Telo: ivice trupa i donji delovi odeće ───────────────────────────────────

/**
 * Leva ivica trupa na visini `y` (desna je u ogledalu, 240 − x). Poprsje: obris TORSO_PATH
 * (kubna kriva od ramena do dna slike); ceo lik: FULL_TORSO_PATH (geometry.ts).
 */
export function torsoEdge(variant: WearVariant | undefined, y: number): number {
    if (variant === "full") {
        if (y <= 204) return 120;
        if (y < 222) {
            const u = Math.sqrt((y - 204) / 18);
            return u * u * 64 + 2 * u * (1 - u) * 70 + (1 - u) * (1 - u) * 120;
        }
        if (y <= 306) return 64 - ((y - 222) * 6) / 84;
        const u = Math.sqrt(Math.max(0, 324 - y) / 18);
        return u * u * 58 + 2 * u * (1 - u) * 56 + (1 - u) * (1 - u) * 74;
    }
    // Poprsje: (24, 284) → (120, 204), kontrolne tačke (24, 228) i (62, 204)
    let lo = 0;
    let hi = 1;
    const at = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
    for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        if (at(mid, 284, 228, 204, 204) > y) lo = mid;
        else hi = mid;
    }
    return at((lo + hi) / 2, 24, 24, 62, 120);
}

/** Donja ivica trupa (dokle crtež odeće sme da ide) */
export const torsoBottom = (variant: WearVariant | undefined) => (variant === "full" ? 322 : 284);

const EDGES = new Map<string, number[]>();

/** Leva ivica trupa iz tablice (celi pikseli), za šare koje se ponavljaju */
function edgeAt(variant: WearVariant | undefined, y: number): number {
    const key = variant === "full" ? "full" : "bust";
    let table = EDGES.get(key);
    if (!table) {
        table = Array.from({ length: 140 }, (_, i) => torsoEdge(key, 200 + i));
        EDGES.set(key, table);
    }
    const i = Math.round(y) - 200;
    return i < 0 ? 120 : (table[Math.min(i, table.length - 1)] ?? 120);
}

/** Šara (tufne, zvezdice, srca) raspoređena po trupu, sa razmakom od ivica */
export function scatter(variant: WearVariant | undefined, step: number, margin: number, draw: (x: number, y: number, i: number) => ReactNode, from = 226): ReactNode[] {
    const out: ReactNode[] = [];
    let i = 0;
    for (let y = from, row = 0; y + margin <= torsoBottom(variant); y += step, row++) {
        const offset = row % 2 ? step / 2 : 0;
        for (let x = 120 - Math.floor(110 / step) * step + offset; x <= 232; x += step) {
            const edge = Math.max(edgeAt(variant, y - margin), edgeAt(variant, y + margin));
            if (x - margin < edge || x + margin > 240 - edge) continue;
            out.push(<g key={i}>{draw(r1(x), y, i)}</g>);
            i++;
        }
    }
    return out;
}

/** Dva bočna dela (prsluk, jakna, panel na odelu): od ivice trupa do x = `inner` i u ogledalu */
export function sidePanels(variant: WearVariant | undefined, inner: number, from: number, color: string): ReactNode {
    const bottom = torsoBottom(variant);
    const edge: string[] = [];
    for (let y = bottom; y >= from; y -= 6) edge.push(`${r1(torsoEdge(variant, y) + 0.4)} ${y}`);
    edge.push(`${r1(torsoEdge(variant, from) + 0.4)} ${from}`);
    const left = `M${inner} ${from}L${inner} ${bottom}L${edge.join("L")}Z`;
    return <path d={`${left}${mirror(left)}`} fill={color} />;
}

/** Uspravne pruge (karo, trenerka): od ramena do poruba, simetrično oko sredine */
export function columns(variant: WearVariant | undefined, offsets: number[], width: number, color: string, opacity = 1): ReactNode[] {
    const out: ReactNode[] = [];
    for (const dx of offsets) {
        for (const x of dx === 0 ? [120] : [120 - dx, 120 + dx]) {
            const inner = x < 120 ? x - width / 2 : 240 - x - width / 2;
            let top = -1;
            let bottom = -1;
            for (let y = 204; y <= torsoBottom(variant); y++) {
                if (edgeAt(variant, y) + 1 <= inner) {
                    if (top < 0) top = y;
                    bottom = y;
                }
            }
            if (top >= 0) out.push(<rect key={`${x}`} x={r1(x - width / 2)} y={top} width={width} height={bottom - top} fill={color} opacity={opacity} />);
        }
    }
    return out;
}

/** Vodoravne pruge preko trupa, tačno do njegovih ivica */
export function bands(variant: WearVariant | undefined, from: number, step: number, height: number, color: string): ReactNode {
    const out: ReactNode[] = [];
    for (let y = from; y + height <= torsoBottom(variant); y += step) {
        const x = r1(Math.max(torsoEdge(variant, y), torsoEdge(variant, y + height)) + 0.6);
        out.push(<rect key={y} x={x} y={y} width={r1(240 - 2 * x)} height={height} fill={color} />);
    }
    return out;
}

export type LowerKind = "pants" | "shorts" | "skirt" | "gown";

const LOWER: Record<LowerKind, string> = {
    pants: "M66 306H174L160 394H124L120 342L116 394H80Z",
    shorts: "M66 306H174L170 352H124L120 334L116 352H70Z",
    skirt: "M64 298H176L196 362Q120 376 44 362Z",
    gown: "M68 290H172L212 396Q120 412 28 396Z",
};

/** Donji deo odeće celog lika (crta se pre trupa, pa ga porub majice prekriva) */
export function lowerPart(kind: LowerKind, color: string, shade: string): ReactNode {
    switch (kind) {
        case "pants":
            return (
                <>
                    <path d={LOWER.pants} fill={color} />
                    <path d="M80 386H116V394H80ZM124 386H160V394H124Z" fill={shade} />
                    <path d="M98 330V380M142 330V380" stroke={shade} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                    {gloss("M84 336L88 376", 4, 0.16)}
                </>
            );
        case "shorts":
            return (
                <>
                    <path d={LOWER.shorts} fill={color} />
                    <path d="M70 346H116V352H70ZM124 346H170V352H124Z" fill={shade} />
                </>
            );
        case "skirt":
            return (
                <>
                    <path d={LOWER.skirt} fill={color} />
                    <path d="M46 358Q120 372 194 358" stroke={shade} strokeWidth="5" strokeLinecap="round" fill="none" />
                    <path d="M96 322L88 364M144 322L152 364M120 324V368" stroke={shade} strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
                </>
            );
        case "gown":
            return (
                <>
                    <path d={LOWER.gown} fill={color} />
                    <path d="M30 392Q120 408 210 392" stroke={shade} strokeWidth="6" strokeLinecap="round" fill="none" />
                    <path d="M92 318L72 396M148 318L168 396M120 320V402" stroke={shade} strokeWidth="3" strokeLinecap="round" opacity="0.45" />
                    {gloss("M74 320L52 380", 6, 0.2)}
                </>
            );
    }
}

/** Predmet u katalogu: mesto je zadato jednom za ceo niz */
export function itemsFor(slot: WearSlot) {
    return (id: string, label: string, price: number, render: WearItem["render"], extra: Partial<Omit<WearItem, "id" | "slot" | "label" | "price" | "render">> = {}): WearItem => ({
        id,
        slot,
        label,
        price,
        render,
        ...extra,
    });
}
