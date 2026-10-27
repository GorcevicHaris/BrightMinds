"use client";

// Crteži igre „Vaga”: drvena vaga sa mesinganim tasovima na stolu, kocke sa tačkicama, tegovi sa
// brojevima i nekoliko novih predmeta (kamen, pero, list, paket). Greda se naginje glatko, a
// tasovi uvek vise uspravno (pomeraju se, ne okreću). Kad je vaga ravna, kazaljka stoji na
// sredini i na stubu zasvetli znak „=”. Isti stil kao zajednički komplet slika (pictures/):
// obli oblici, mirne boje, tanka tamnija ivica.

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Picture, isPictureId } from "@/app/components/games/pictures";
import { INK, line, Shadow, Shine } from "@/app/components/games/pictures/kit";
import { getScaleItem, isWeight, MAX_TILT, MYSTERY, weightValue } from "@/app/components/games/data/scaleLevels";
import { cn } from "@/lib/cn";

// ── Mere vage (jedinice viewBox-a) ───────────────────────────────────────────

const PIVOT = { x: 210, y: 66 };

/**
 * Dva oblika iste vage: široka (položen ekran, male vage) i visoka (uspravan telefon: kraća greda,
 * duži lanci, a predmeti i tegovi na tasu krupniji). Bira se onaj u kome je vaga na ekranu veća.
 */
interface Geometry {
    /** Leva ivica i veličina viewBox-a */
    x0: number;
    w: number;
    h: number;
    arm: number;
    /** Od kuke na kraju grede do ivice tasa */
    rope: number;
    dish: number;
    table: number;
    /** Koliko su predmeti i tegovi na tasu uvećani */
    k: number;
}

const WIDE: Geometry = { x0: 0, w: 420, h: 262, arm: 145, rope: 116, dish: 60, table: 238, k: 1 };
const TALL: Geometry = { x0: 16, w: 388, h: 350, arm: 124, rope: 162, dish: 62, table: 326, k: 1.25 };
/** Kazaljka se okreće više od grede, da se podeoci vide */
const NEEDLE_GAIN = 3;

const WOOD = "#cf9152";
const WOOD_DARK = "#8f5a2c";
const WOOD_LIGHT = "#e8b882";
const BRASS = "#e9bb4f";
const BRASS_DARK = "#a77c1c";
const BRASS_LIGHT = "#f8e19a";
const GREEN = "#2fa36b";

function hookAt(sideSign: -1 | 1, angle: number, g: Geometry) {
    const rad = (angle * Math.PI) / 180;
    return { x: PIVOT.x + sideSign * g.arm * Math.cos(rad), y: PIVOT.y + sideSign * g.arm * Math.sin(rad) };
}

// ── Tegovi ────────────────────────────────────────────────────────────────────

const NUMERAL_W: Readonly<Record<number, number>> = { 1: 24, 2: 26, 3: 28, 4: 29, 5: 31, 6: 32, 7: 33, 8: 34, 9: 35, 10: 38 };
const NUMERAL_FILL: Readonly<Record<number, [string, string]>> = {
    1: ["#ffd866", "#c99a1a"],
    2: ["#8fd0f5", "#3d8cc0"],
    3: ["#c9b5f7", "#7c62c4"],
    4: ["#f7aacb", "#c4588a"],
    5: ["#9be0a8", "#3f9a55"],
    10: ["#f7a08f", "#c4573f"],
};
const NUMERAL_OTHER: [string, string] = ["#ffc58f", "#c9772a"];

/** Širina i visina tega ili kocke (jedinice vage) */
export function pieceSize(token: string): { w: number; h: number } {
    if (token === "d1") return { w: 22, h: 22 };
    if (token === "d2") return { w: 44, h: 22 };
    if (token === MYSTERY) return { w: 30, h: 30 };
    const w = NUMERAL_W[weightValue(token)] ?? 30;
    return { w, h: Math.round(w * 1.12) };
}

function Dot({ x, y }: { x: number; y: number }) {
    return <circle cx={x} cy={y} r={3.1} fill={INK} />;
}

/** Kocka (jedna ili dve slepljene) sa tačkicama; (x, y) je gornji levi ugao */
function DotCube({ token, x, y, numeral }: { token: string; x: number; y: number; numeral?: boolean }) {
    const two = token === "d2";
    const w = two ? 44 : 22;
    const [fill, edge] = two ? NUMERAL_FILL[2] : NUMERAL_FILL[1];
    return (
        <g transform={`translate(${x} ${y})`}>
            <rect x={0.8} y={0.8} width={w - 1.6} height={20.4} rx={4.5} fill={fill} {...line(edge, 1.6)} />
            <rect x={3} y={3} width={w - 6} height={5} rx={2.5} fill="#ffffff" opacity={0.45} />
            {two && <path d="M22 2 V20" {...line(edge, 1.3)} />}
            {numeral ? (
                <text x={w / 2} y={16} textAnchor="middle" fontSize={13} fontWeight={900} fill={INK}>
                    {two ? 2 : 1}
                </text>
            ) : two ? (
                <>
                    <Dot x={11} y={12} />
                    <Dot x={33} y={12} />
                </>
            ) : (
                <Dot x={11} y={12} />
            )}
        </g>
    );
}

/** Teg sa brojem (kao girja): ručka gore, broj na telu; (x, y) je gornji levi ugao */
function Kettlebell({ value, x, y }: { value: number; x: number; y: number }) {
    const w = NUMERAL_W[value] ?? 30;
    const h = Math.round(w * 1.12);
    const [fill, edge] = NUMERAL_FILL[value] ?? NUMERAL_OTHER;
    const body = `M${w * 0.14} ${h * 0.42} Q${w * 0.14} ${h * 0.3} ${w * 0.3} ${h * 0.3} H${w * 0.7} Q${w * 0.86} ${h * 0.3} ${w * 0.86} ${h * 0.42} L${w * 0.98} ${h * 0.84} Q${w} ${h * 0.98} ${w * 0.86} ${h * 0.98} H${w * 0.14} Q0 ${h * 0.98} ${w * 0.02} ${h * 0.84}Z`;
    return (
        <g transform={`translate(${x} ${y})`}>
            <path d={`M${w * 0.32} ${h * 0.34} V${h * 0.17} Q${w * 0.32} ${h * 0.04} ${w * 0.5} ${h * 0.04} Q${w * 0.68} ${h * 0.04} ${w * 0.68} ${h * 0.17} V${h * 0.34}`} fill="none" {...line(edge, 3.2)} />
            <path d={body} fill={fill} {...line(edge, 1.6)} />
            <path d={`M${w * 0.2} ${h * 0.44} Q${w * 0.24} ${h * 0.36} ${w * 0.36} ${h * 0.36}`} fill="none" {...line("#ffffff", 2.2)} opacity={0.6} />
            <text x={w / 2} y={h * 0.83} textAnchor="middle" fontSize={value >= 10 ? h * 0.4 : h * 0.46} fontWeight={900} fill={INK}>
                {value}
            </text>
        </g>
    );
}

/** Prazno mesto: teg ili grupa koja se traži */
function Mystery({ x, y }: { x: number; y: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <rect x={1} y={1} width={28} height={28} rx={7} fill="#ffffff" fillOpacity={0.75} stroke="#94643f" strokeWidth={1.8} strokeDasharray="4 3" />
            <text x={15} y={21.5} textAnchor="middle" fontSize={18} fontWeight={900} fill="#94643f">
                ?
            </text>
        </g>
    );
}

function Piece({ token, x, y, numeral }: { token: string; x: number; y: number; numeral?: boolean }) {
    if (token === "d1" || token === "d2") return <DotCube token={token} x={x} y={y} numeral={numeral} />;
    if (token === MYSTERY) return <Mystery x={x} y={y} />;
    return <Kettlebell value={weightValue(token)} x={x} y={y} />;
}

/** Teg ili kocka kao samostalna slika (korpa, kartice, prst koji vuče) */
export function WeightIcon({ token, className }: { token: string; className?: string }) {
    const { w, h } = pieceSize(token);
    const pad = 2;
    return (
        <svg viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`} className={className} aria-hidden="true" focusable="false">
            <Piece token={token} x={0} y={0} />
        </svg>
    );
}

/** Grupa kocaka (kartice izbora „koja grupa pravi ravnotežu”): u redovima, kao na tasu */
export function GroupIcon({ tokens, className }: { tokens: readonly string[]; className?: string }) {
    const laid = layoutLoad(tokens, false, 0, 94, 72);
    const minX = Math.min(...laid.map((piece) => piece.x));
    const maxX = Math.max(...laid.map((piece) => piece.x + piece.w));
    const minY = Math.min(...laid.map((piece) => piece.y));
    const maxY = Math.max(...laid.map((piece) => piece.y + piece.h));
    return (
        <svg viewBox={`${minX - 2} ${minY - 2} ${maxX - minX + 4} ${maxY - minY + 4}`} className={className} aria-hidden="true" focusable="false">
            {laid.map((piece, i) => (
                <Piece key={i} token={piece.token} x={piece.x} y={piece.y} />
            ))}
        </svg>
    );
}

// ── Novi predmeti (okvir 100 × 100) ──────────────────────────────────────────

const OWN_ART: Readonly<Record<string, (tag?: string) => ReactNode>> = {
    stone: () => (
        <g>
            <Shadow cx={52} cy={88} rx={34} />
            <path d="M16 72 Q12 50 30 40 Q46 30 66 36 Q86 42 88 62 Q90 84 66 87 L34 87 Q18 85 16 72Z" fill="#a8aeb9" {...line("#6c7380", 1.8)} />
            <path d="M28 52 Q38 42 54 43" fill="none" {...line("#ffffff", 3)} opacity={0.5} />
            <g fill="#7d8491" opacity={0.55}>
                <circle cx={62} cy={58} r={2.6} />
                <circle cx={44} cy={70} r={2} />
                <circle cx={72} cy={74} r={1.8} />
                <circle cx={34} cy={62} r={1.5} />
            </g>
        </g>
    ),
    feather: () => (
        <g>
            <path d="M22 88 Q18 60 40 38 Q60 18 86 10 Q84 34 68 54 Q48 78 22 88Z" fill="#a8d2f7" {...line("#5a92cc", 1.8)} />
            <path d="M18 94 Q40 56 84 12" fill="none" {...line("#4f7fb3", 2.2)} />
            <g opacity={0.75}>
                <path d="M40 66 L30 56 M50 54 L40 42 M60 44 L52 30 M48 70 L60 72 M58 58 L70 60 M66 46 L78 46" fill="none" {...line("#ffffff", 1.8)} />
            </g>
        </g>
    ),
    leaf: () => (
        <g>
            <path d="M50 94 Q49 84 50 74" fill="none" {...line("#9a5a1c", 2.6)} />
            <path d="M50 76 Q20 72 14 46 Q22 48 26 44 Q16 30 22 20 Q32 26 38 22 Q40 10 50 4 Q60 10 62 22 Q68 26 78 20 Q84 30 74 44 Q78 48 86 46 Q80 72 50 76Z" fill="#f4a13f" {...line("#c46f1a", 1.8)} />
            <path d="M50 74 V14 M50 56 L30 40 M50 56 L70 40 M50 38 L38 28 M50 38 L62 28" fill="none" {...line("#c46f1a", 1.4)} />
            <Shine x={36} y={52} rx={3} ry={6} rotate={-30} opacity={0.35} />
        </g>
    ),
    parcel: (tag) => (
        <g>
            <Shadow cx={54} cy={92} rx={38} />
            <path d="M14 34 L28 20 H94 L80 34Z" fill="#ecc28e" {...line("#9c6a32", 1.6)} />
            <path d="M80 34 L94 20 V76 L80 90Z" fill="#c38c52" {...line("#9c6a32", 1.6)} />
            <rect x={14} y={34} width={66} height={56} rx={3} fill="#dcaa70" {...line("#9c6a32", 1.6)} />
            <path d="M47 34 V90 M54 20 L40 34" fill="none" {...line("#f6e7c8", 4)} />
            <path d="M47 34 V90" fill="none" {...line("#b98a4e", 1)} />
            {tag !== undefined && (
                <g>
                    <rect x={20} y={46} width={54} height={34} rx={8} fill="#ffffff" {...line("#9c6a32", 1.6)} />
                    <text x={47} y={73} textAnchor="middle" fontSize={26} fontWeight={900} fill={INK}>
                        {tag}
                    </text>
                </g>
            )}
        </g>
    ),
};

/** Predmet sa vage kao slika u kvadratu 100 × 100 (kartice izbora, natpisi) */
export function ItemIcon({ id, className, tag }: { id: string; className?: string; tag?: string }) {
    const own = OWN_ART[id];
    if (own) {
        return (
            <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
                {own(tag)}
            </svg>
        );
    }
    return isPictureId(id) ? <Picture id={id} className={className} /> : null;
}

/** Predmet na tasu: (x, y) gornji levi ugao, `s` stranica kvadrata */
function ItemOnPan({ id, x, y, s, tag }: { id: string; x: number; y: number; s: number; tag?: string }) {
    const own = OWN_ART[id];
    if (own) {
        return (
            <svg x={x} y={y} width={s} height={s} viewBox="0 0 100 100" overflow="visible">
                {own(tag)}
            </svg>
        );
    }
    return isPictureId(id) ? <Picture id={id} x={x} y={y} width={s} height={s} /> : null;
}

// ── Raspored na tasu ──────────────────────────────────────────────────────────

interface Laid {
    token: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Najšira gomila na tasu */
const ROW_MAX = 112;

/**
 * Gde stoji svaka stvar na tasu (koordinate tasa: kuka je (0, 0), dno gomile na ivici tasa).
 * Jedan predmet je krupan (koliko je velik u stvarnosti), više istih predmeta su gomila, a tegovi
 * se slažu u redove odozdo.
 */
export function layoutLoad(tokens: readonly string[], uniform = false, rope = WIDE.rope, singleMax = 94, rowMax = ROW_MAX, minSize = 0): Laid[] {
    if (tokens.length === 0) return [];
    const items = tokens.filter((token) => !isWeight(token) && token !== MYSTERY);
    const single = items.length === 1;
    const pile = items.length;
    const itemSide = (token: string) => {
        if (uniform) return 80;
        if (single) return Math.round(singleMax * Math.max(minSize, getScaleItem(token)?.size ?? 0.6));
        return pile <= 2 ? 52 : pile <= 4 ? 40 : pile <= 6 ? 34 : pile <= 9 ? 30 : 26;
    };
    const sized = tokens.map((token) => {
        if (isWeight(token) || token === MYSTERY) return { token, ...pieceSize(token), gap: 2 };
        const s = itemSide(token);
        return { token, w: s, h: s, gap: single ? 0 : -s * 0.12 };
    });
    // Redovi odozdo, s leva na desno
    const rows: (typeof sized)[] = [];
    let row: typeof sized = [];
    let width = 0;
    for (const piece of sized) {
        const add = row.length === 0 ? piece.w : piece.w + piece.gap;
        if (row.length > 0 && width + add > rowMax) {
            rows.push(row);
            row = [];
            width = 0;
        }
        row.push(piece);
        width += row.length === 1 ? piece.w : piece.w + piece.gap;
    }
    if (row.length) rows.push(row);
    const out: Laid[] = [];
    let bottom = rope + 3;
    for (const r of rows) {
        const total = r.reduce((sum, piece, i) => sum + piece.w + (i > 0 ? piece.gap : 0), 0);
        let x = -total / 2;
        const tall = Math.max(...r.map((piece) => piece.h));
        r.forEach((piece, i) => {
            if (i > 0) x += piece.gap;
            out.push({ token: piece.token, x, y: bottom - piece.h, w: piece.w, h: piece.h });
            x += piece.w;
        });
        // Predmeti u gomili malo ulegnu jedan u drugi
        bottom -= r.some((piece) => !isWeight(piece.token) && piece.token !== MYSTERY) ? tall * 0.82 : tall + 1;
    }
    return out;
}

// ── Tas ───────────────────────────────────────────────────────────────────────

interface PanProps {
    g: Geometry;
    /** Najmanja veličina jednog predmeta (ravnoteža: predmet se dobro vidi bez obzira na stvarnu veličinu) */
    minSize?: number;
    load: readonly string[];
    numeral?: boolean;
    uniform?: boolean;
    /** Natpis na predmetu (broj na paketu, ili koliko kocaka posle ravnoteže) */
    tag?: string;
}

function PanArt({ g, load, numeral, uniform, tag, minSize = 0 }: PanProps) {
    const ROPE = g.rope;
    const DISH_HALF = g.dish;
    // Jedan predmet na visokoj vagi sme da bude malo širi od tasa (kao slon na tanjiru)
    const laid = layoutLoad(load, uniform, ROPE, g.k > 1 ? 104 : 94, ROW_MAX, minSize);
    const tagged = tag !== undefined ? laid.find((piece) => !isWeight(piece.token) && piece.token !== MYSTERY) : undefined;
    return (
        <g>
            {/* Lanci i kuka */}
            <path d={`M0 0 L${-DISH_HALF + 6} ${ROPE} M0 0 L${DISH_HALF - 6} ${ROPE}`} fill="none" {...line(BRASS_DARK, 1.4)} />
            <path d={`M0 0 L0 ${ROPE - 4}`} fill="none" {...line(BRASS_DARK, 1)} opacity={0.5} />
            <circle cx={0} cy={0} r={4.2} fill={BRASS_LIGHT} {...line(BRASS_DARK, 1.6)} />
            {/* Zadnja ivica tasa */}
            <ellipse cx={0} cy={ROPE} rx={DISH_HALF} ry={6} fill="#c99a33" {...line(BRASS_DARK, 1.4)} />
            <g transform={`translate(0 ${ROPE}) scale(${g.k}) translate(0 ${-ROPE})`}>
            {laid.map((piece, i) =>
                isWeight(piece.token) || piece.token === MYSTERY ? (
                    <Piece key={i} token={piece.token} x={piece.x} y={piece.y} numeral={numeral && piece.token.startsWith("d")} />
                ) : (
                    <ItemOnPan key={i} id={piece.token} x={piece.x} y={piece.y} s={piece.w} tag={piece.token === "parcel" ? tag : undefined} />
                )
            )}
            </g>
            {/* Prednji deo tasa (zdela) */}
            <path d={`M${-DISH_HALF} ${ROPE} Q${-DISH_HALF + 6} ${ROPE + 17} 0 ${ROPE + 17} Q${DISH_HALF - 6} ${ROPE + 17} ${DISH_HALF} ${ROPE}Q0 ${ROPE + 7} ${-DISH_HALF} ${ROPE}Z`} fill={BRASS} {...line(BRASS_DARK, 1.6)} />
            <path d={`M${-DISH_HALF + 12} ${ROPE + 6} Q${-20} ${ROPE + 12} ${-4} ${ROPE + 12}`} fill="none" {...line(BRASS_LIGHT, 2.4)} opacity={0.9} />
            {/* Broj kocaka na predmetu posle ravnoteže */}
            {tagged && tagged.token !== "parcel" && (
                <g transform={`translate(${(tagged.x + tagged.w * 0.86) * g.k} ${ROPE - (ROPE - tagged.y - 6) * g.k})`}>
                    <circle r={12} fill="#ffffff" {...line("#94643f", 1.8)} />
                    <text y={5} textAnchor="middle" fontSize={14} fontWeight={900} fill={INK}>
                        {tag}
                    </text>
                </g>
            )}
        </g>
    );
}

// ── Vaga ─────────────────────────────────────────────────────────────────────

export type PanSide = "left" | "right";

interface ScaleProps {
    left: readonly string[];
    right: readonly string[];
    /** Nagib grede u stepenima (pozitivan = desna strana dole) */
    angle: number;
    /** Vaga stoji na kockicama */
    peg?: boolean;
    /** Ravnoteža postignuta: znak „=” zasvetli */
    balanced?: boolean;
    calm: boolean;
    /** Mala vaga (zaključivanje): bez kazaljke i znaka */
    compact?: boolean;
    /** Tegovi sa brojevima: i kocke nose broj umesto tačkica */
    numeral?: boolean;
    /** Svi predmeti iste veličine (zaključivanje: veličina ne pomaže) */
    uniform?: boolean;
    /** Najmanja veličina jednog predmeta na tasu (deo najveće) */
    minSize?: number;
    tags?: Partial<Record<PanSide, string>>;
    /** Imena ispod tasova (na prednjoj ivici stola) */
    labels?: Partial<Record<PanSide, string>>;
    /** HTML iznad tasa (dugme izbora, mesto za teg) — prati tas dok se vaga naginje */
    overlay?: (side: PanSide, style: CSSProperties) => ReactNode;
    className?: string;
    label?: string;
}

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

/** Poslednji izbor oblika vage (visoka / široka) — nova vaga ga nasleđuje */
let lastTall = false;

export function BalanceScale({ left, right, angle, peg = false, balanced = false, calm, compact = false, numeral = false, uniform = false, minSize = 0, tags, labels, overlay, className, label }: ScaleProps) {
    // Visoka vaga kad je u njoj sve krupnije (uspravan telefon); male vage su uvek široke.
    // Nova vaga (novi zadatak) kreće od poslednjeg izbora, da se tasovi ne pomere pri pojavi.
    const boxRef = useRef<HTMLDivElement | null>(null);
    const [tall, setTall] = useState(() => lastTall);
    useLayoutEffect(() => {
        const parent = boxRef.current?.parentElement;
        if (compact || !parent || typeof ResizeObserver === "undefined") return;
        const measure = () => {
            const { width, height } = parent.getBoundingClientRect();
            if (width === 0 || height === 0) return;
            const wide = Math.min(width / WIDE.w, height / WIDE.h);
            const high = Math.min(width / TALL.w, height / TALL.h) * TALL.k;
            lastTall = high > wide * 1.08;
            setTall(lastTall);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(parent);
        return () => observer.disconnect();
    }, [compact]);
    // Prvi prikaz bez klizanja (vaga se pojavi već nagnuta), posle toga greda i tasovi klize
    const [settled, setSettled] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setSettled(true));
        return () => cancelAnimationFrame(frame);
    }, []);
    const g = tall && !compact ? TALL : WIDE;
    const SCALE_W = g.w;
    const SCALE_H = g.h;
    const ARM = g.arm;
    const ROPE = g.rope;
    const DISH_HALF = g.dish;
    const TABLE_Y = g.table;
    const X0 = g.x0;

    const shown = peg ? 0 : Math.max(-MAX_TILT, Math.min(MAX_TILT, angle));
    // Kad se kockice izmaknu, greda kreće malo kasnije (prvo kockice, pa vaga)
    const [pegBefore, setPegBefore] = useState(peg);
    const [released, setReleased] = useState(false);
    if (pegBefore !== peg) {
        setPegBefore(peg);
        setReleased(pegBefore && !peg);
    }
    const delay = released && !calm ? 380 : 0;

    const ease = calm ? "ease-out" : "cubic-bezier(0.3, 1.32, 0.5, 1)";
    const ms = calm ? 300 : 950;
    const move = (props: string) =>
        !settled
            ? "none"
            : props
            .split(",")
            .map((prop) => `${prop.trim()} ${ms}ms ${ease} ${delay}ms`)
            .join(", ");
    const hookL = hookAt(-1, shown, g);
    const hookR = hookAt(1, shown, g);
    const restL = hookAt(-1, 0, g);
    const restR = hookAt(1, 0, g);

    const panStyle = (hook: { x: number; y: number }): CSSProperties => ({ transform: `translate(${hook.x}px, ${hook.y}px)`, transition: move("transform") });
    const boxStyle = (hook: { x: number; y: number }): CSSProperties => ({
        position: "absolute",
        left: pct(hook.x - X0 - DISH_HALF - 4, SCALE_W),
        top: pct(hook.y + 6, SCALE_H),
        width: pct(2 * DISH_HALF + 8, SCALE_W),
        height: pct(ROPE + 14, SCALE_H),
        transition: move("left, top"),
    });
    const pegStyle = (sign: -1 | 1): CSSProperties => ({
        transform: peg ? "translate(0px, 0px)" : `translate(${sign * 34}px, 0px)`,
        opacity: peg ? 1 : 0,
        transition: calm ? "opacity 200ms ease-out" : "transform 420ms ease-in, opacity 420ms ease-in",
    });
    const shadow = (hook: { x: number; y: number }, rest: { x: number; y: number }): CSSProperties => ({
        transform: `translate(${hook.x}px, 0px)`,
        opacity: 0.1 + Math.max(0, (hook.y - rest.y) / 30) * 0.08,
        transition: move("transform, opacity"),
    });

    return (
        <div ref={boxRef} className={cn("relative", className)} style={{ aspectRatio: `${SCALE_W} / ${SCALE_H}`, width: `min(100cqw, calc(100cqh * ${(SCALE_W / SCALE_H).toFixed(4)}))` }}>
            <svg viewBox={`${X0} 0 ${SCALE_W} ${SCALE_H}`} className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={label}>
                {/* Sto */}
                <rect x={X0 - 6} y={TABLE_Y} width={SCALE_W + 12} height={SCALE_H - TABLE_Y + 6} rx={6} fill="#e3b07a" />
                <rect x={X0 - 6} y={TABLE_Y} width={SCALE_W + 12} height={6} rx={3} fill="#f0c995" />
                <path d={`M${X0 - 6} ${TABLE_Y + 6} H${X0 + SCALE_W + 6}`} {...line("#b9814b", 1.4)} />
                {/* Senke tasova na stolu */}
                <ellipse cx={0} cy={TABLE_Y + 3} rx={46} ry={4} fill="#5a3a1a" style={shadow(hookL, restL)} />
                <ellipse cx={0} cy={TABLE_Y + 3} rx={46} ry={4} fill="#5a3a1a" style={shadow(hookR, restR)} />

                {/* Stub i postolje */}
                <ellipse cx={PIVOT.x} cy={TABLE_Y + 2} rx={52} ry={6} fill="#5a3a1a" opacity={0.12} />
                <path d={`M${PIVOT.x - 46} ${TABLE_Y} Q${PIVOT.x - 44} ${TABLE_Y - 16} ${PIVOT.x - 20} ${TABLE_Y - 18} H${PIVOT.x + 20} Q${PIVOT.x + 44} ${TABLE_Y - 16} ${PIVOT.x + 46} ${TABLE_Y}Z`} fill={WOOD} {...line(WOOD_DARK, 1.8)} />
                <path d={`M${PIVOT.x - 30} ${TABLE_Y - 9} H${PIVOT.x + 30}`} {...line(WOOD_LIGHT, 2.4)} opacity={0.8} />
                <path d={`M${PIVOT.x - 7} ${PIVOT.y + 6} L${PIVOT.x - 10} ${TABLE_Y - 18} H${PIVOT.x + 10} L${PIVOT.x + 7} ${PIVOT.y + 6}Z`} fill={WOOD} {...line(WOOD_DARK, 1.8)} />
                <path d={`M${PIVOT.x - 3} ${PIVOT.y + 14} L${PIVOT.x - 4.5} ${TABLE_Y - 24}`} {...line(WOOD_LIGHT, 2.2)} opacity={0.8} />

                {/* Znak „=”: sivo dok vaga nije ravna, zeleno kad jeste */}
                {!compact && (
                    <g>
                        <circle cx={PIVOT.x} cy={PIVOT.y + 88} r={17} fill={balanced ? GREEN : "#fff8ee"} {...line(balanced ? "#1f7a4d" : WOOD_DARK, 1.8)} style={{ transition: "fill 300ms ease-out" }} />
                        {balanced && !calm && <circle cx={PIVOT.x} cy={PIVOT.y + 88} r={17} fill="none" stroke={GREEN} strokeWidth={3} className="scale-ring" />}
                        <path d={`M${PIVOT.x - 7} ${PIVOT.y + 84.5} H${PIVOT.x + 7} M${PIVOT.x - 7} ${PIVOT.y + 91.5} H${PIVOT.x + 7}`} {...line(balanced ? "#ffffff" : "#c9a284", 3.4)} />
                    </g>
                )}

                {/* Kazaljka sa podeocima: svaki podeok je jedna kocka razlike */}
                {!compact && (
                    <g>
                        <path d={`M${PIVOT.x - 40} ${PIVOT.y - 8} A42 42 0 0 1 ${PIVOT.x + 40} ${PIVOT.y - 8}`} fill="#fff8ee" {...line(WOOD_DARK, 1.6)} />
                        {[-3, -2, -1, 0, 1, 2, 3].map((step) => {
                            const rad = ((step * 4 * NEEDLE_GAIN - 90) * Math.PI) / 180;
                            const r1 = step === 0 ? 27 : 32;
                            return (
                                <path
                                    key={step}
                                    d={`M${PIVOT.x + Math.cos(rad) * r1} ${PIVOT.y + Math.sin(rad) * r1} L${PIVOT.x + Math.cos(rad) * 39} ${PIVOT.y + Math.sin(rad) * 39}`}
                                    {...line(step === 0 ? (balanced ? GREEN : "#94643f") : "#c9a284", step === 0 ? 3 : 1.8)}
                                />
                            );
                        })}
                        <g style={{ transform: `rotate(${shown * NEEDLE_GAIN}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`, transformBox: "view-box", transition: move("transform") }}>
                            <path d={`M${PIVOT.x} ${PIVOT.y} L${PIVOT.x} ${PIVOT.y - 34}`} {...line(balanced ? GREEN : "#b5452f", 2.6)} />
                            <circle cx={PIVOT.x} cy={PIVOT.y - 35} r={3} fill={balanced ? GREEN : "#b5452f"} />
                        </g>
                    </g>
                )}

                {/* Kockice ispod tasova (vaga ne može da se nagne dok ih ima) */}
                {[-1, 1].map((sign) => {
                    const x = PIVOT.x + sign * ARM;
                    const top = PIVOT.y + ROPE + 15;
                    const height = TABLE_Y - top;
                    return (
                        <g key={sign} style={pegStyle(sign as -1 | 1)} aria-hidden="true">
                            <rect x={x - 17} y={top + height / 2} width={34} height={height / 2} rx={3} fill="#f28b6e" {...line("#c0583e", 1.5)} />
                            <rect x={x - 14} y={top} width={28} height={height / 2} rx={3} fill="#f4c94a" {...line("#c99a1a", 1.5)} />
                            <circle cx={x} cy={top + height / 4} r={4} fill="#ffffff" opacity={0.75} />
                            <circle cx={x} cy={top + (height * 3) / 4} r={4.5} fill="#ffffff" opacity={0.6} />
                        </g>
                    );
                })}

                {/* Tasovi (vise uspravno) */}
                <g style={panStyle(hookL)}>
                    <PanArt g={g} minSize={minSize} load={left} numeral={numeral} uniform={uniform} tag={tags?.left} />
                </g>
                <g style={panStyle(hookR)}>
                    <PanArt g={g} minSize={minSize} load={right} numeral={numeral} uniform={uniform} tag={tags?.right} />
                </g>

                {/* Greda */}
                <g style={{ transform: `rotate(${shown}deg)`, transformOrigin: `${PIVOT.x}px ${PIVOT.y}px`, transformBox: "view-box", transition: move("transform") }}>
                    <rect x={PIVOT.x - ARM - 9} y={PIVOT.y - 7} width={2 * ARM + 18} height={14} rx={7} fill={WOOD} {...line(WOOD_DARK, 1.8)} />
                    <path d={`M${PIVOT.x - ARM} ${PIVOT.y - 3} H${PIVOT.x + ARM}`} {...line(WOOD_LIGHT, 2.4)} opacity={0.8} />
                    <circle cx={PIVOT.x - ARM} cy={PIVOT.y} r={6} fill={BRASS} {...line(BRASS_DARK, 1.5)} />
                    <circle cx={PIVOT.x + ARM} cy={PIVOT.y} r={6} fill={BRASS} {...line(BRASS_DARK, 1.5)} />
                </g>
                <circle cx={PIVOT.x} cy={PIVOT.y} r={11} fill={BRASS} {...line(BRASS_DARK, 1.8)} />
                <circle cx={PIVOT.x} cy={PIVOT.y} r={4} fill={BRASS_DARK} />
                <circle cx={PIVOT.x - 3.5} cy={PIVOT.y - 4} r={2.4} fill="#ffffff" opacity={0.6} />
            </svg>
            {overlay?.("left", boxStyle(hookL))}
            {overlay?.("right", boxStyle(hookR))}
            {labels &&
                (["left", "right"] as const).map((sideName) =>
                    labels[sideName] ? (
                        <span
                            key={sideName}
                            className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-full bg-surface/95 px-2.5 py-0.5 text-[clamp(0.7rem,3.6cqw,1.15rem)] font-extrabold leading-tight text-ink shadow-soft ring-1 ring-cocoa-200"
                            style={{ left: pct((sideName === "left" ? restL : restR).x - X0, SCALE_W), bottom: "0.2%" }}
                        >
                            {labels[sideName]}
                        </span>
                    ) : null
                )}
        </div>
    );
}

/** Kratka animacija prstena oko znaka „=” (jednom, kad vaga postane ravna) */
export function ScaleStyles() {
    return (
        <style>{`
@keyframes scale-ring { 0% { opacity: 0.8; transform: scale(1); } 100% { opacity: 0; transform: scale(1.9); } }
.scale-ring { transform-box: fill-box; transform-origin: center; animation: scale-ring 1.2s ease-out 0.5s 2 both; }
@media (prefers-reduced-motion: reduce) { .scale-ring { animation: none; opacity: 0; } }
`}</style>
    );
}
