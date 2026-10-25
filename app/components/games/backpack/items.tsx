// Stvari za igru „Spakuj ranac”: školske stvari, knjige za predmete, igračke i sam ranac.
// Isti stil kao ostale slike u igrama: krupni obli oblici, mirne boje, tanka tamnija ivica,
// okvir 100 × 100. Knjige za predmete su namerno slične (ista korica), a razlikuju se bojom i
// znakom predmeta — isti znak i ista boja stoje i na rasporedu časova.

import type { ReactNode } from "react";
import { SUBJECTS, type ItemId, type SubjectId } from "@/app/components/games/data/backpackLevels";

const INK = "#3f3a4a";
const line = (color: string, width = 1.6) => ({ stroke: color, strokeWidth: width, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

/** Tamnija nijansa boje (za ivice) */
function shade(hex: string, amount = 0.75): string {
    const n = Number.parseInt(hex.slice(1), 16);
    const c = (shift: number) => Math.round(((n >> shift) & 255) * amount);
    return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, "0")}`;
}

function Shadow({ rx = 30 }: { rx?: number }) {
    return <ellipse cx={50} cy={92} rx={rx} ry={3.5} fill="#000000" opacity={0.09} />;
}

// ── Znak predmeta (na rasporedu i na korici) ──────────────────────────────────
// Crta se oko (0, 0), u krugu poluprečnika ~10.

function SubjectMark({ id, color = "#ffffff" }: { id: SubjectId; color?: string }) {
    switch (id) {
        case "srpski":
            return <path d="M-7 8 L0 -9 L7 8 M-4 2 H4" fill="none" {...line(color, 3)} />;
        case "matematika":
            return (
                <g fill="none" {...line(color, 2.8)}>
                    <path d="M-9 0 H-1 M-5 -4 V4" />
                    <path d="M3 -2.6 H9 M3 2.6 H9" />
                </g>
            );
        case "svet":
            return (
                <g>
                    <circle cx={0} cy={-2} r={7} fill="none" {...line(color, 2.4)} />
                    <path d="M0 -2 Q-6 -8 -4 2 M0 -2 Q6 -8 4 2 M0 5 V9" fill="none" {...line(color, 2)} />
                </g>
            );
        case "engleski":
            return (
                <g>
                    <path d="M-9 -7 H9 V5 H-1 L-6 9 V5 H-9Z" fill="none" {...line(color, 2.2)} />
                    <path d="M-4 -3 V2 M-4 -0.5 H-1 M-1 -3 V2 M3 -3 V2" fill="none" {...line(color, 1.8)} />
                </g>
            );
        case "muzicko":
            return (
                <g>
                    <path d="M-1 6 V-8 L8 -10 V3" fill="none" {...line(color, 2.4)} />
                    <ellipse cx={-4} cy={6} rx={3.6} ry={2.8} fill={color} />
                    <ellipse cx={5} cy={3} rx={3.6} ry={2.8} fill={color} />
                </g>
            );
        case "likovno":
            return (
                <g>
                    <path d="M0 -9 C9 -9 11 -2 8 2 C6 5 2 3 2 6 C2 9 -1 10 -3 9 C-9 7 -10 -9 0 -9Z" fill="none" {...line(color, 2.2)} />
                    <circle cx={-3} cy={-4} r={1.6} fill={color} />
                    <circle cx={3} cy={-5} r={1.6} fill={color} />
                    <circle cx={-5} cy={2} r={1.6} fill={color} />
                </g>
            );
        case "fizicko":
            return (
                <g>
                    <circle cx={0} cy={0} r={8} fill="none" {...line(color, 2.4)} />
                    <path d="M-8 0 H8 M0 -8 Q-5 0 0 8 M0 -8 Q5 0 0 8" fill="none" {...line(color, 1.6)} />
                </g>
            );
        case "digitalni":
            return (
                <g>
                    <rect x={-9} y={-8} width={18} height={12} rx={2} fill="none" {...line(color, 2.2)} />
                    <path d="M-4 8 H4 M0 4 V8" fill="none" {...line(color, 2.2)} />
                </g>
            );
    }
}

const subjectColor = (id: SubjectId) => SUBJECTS.find((s) => s.id === id)?.color ?? "#6c61f0";

/** Znak predmeta u obojenom krugu (raspored časova) */
export function SubjectBadge({ id, className }: { id: SubjectId; className?: string }) {
    const color = subjectColor(id);
    return (
        <svg viewBox="-12 -12 24 24" className={className} aria-hidden="true" focusable="false">
            <circle r={11.5} fill={color} stroke={shade(color)} strokeWidth={1} />
            <g transform="scale(0.8)">
                <SubjectMark id={id} />
            </g>
        </svg>
    );
}

// ── Knjige i sveske ───────────────────────────────────────────────────────────

/** Udžbenik: korica u boji predmeta, beli natpis-pravougaonik i znak predmeta */
function Textbook({ color, mark }: { color: string; mark?: SubjectId }) {
    const edge = shade(color);
    return (
        <g>
            <Shadow rx={28} />
            <path d="M26 16 H74 Q78 16 78 20 V86 Q78 90 74 90 H26Z" fill="#fbf8f0" {...line("#cfc8b8", 1.4)} />
            <path d="M74 20 V86" {...line("#e3dccb", 1)} />
            <rect x={22} y={12} width={50} height={76} rx={5} fill={color} {...line(edge)} />
            <rect x={22} y={12} width={8} height={76} rx={3} fill={edge} opacity={0.45} />
            <rect x={36} y={22} width={28} height={9} rx={3} fill="#ffffff" opacity={0.85} />
            {mark ? (
                <g transform="translate(50 56) scale(1.25)">
                    <circle r={12} fill="#ffffff" opacity={0.22} />
                    <SubjectMark id={mark} />
                </g>
            ) : (
                <g fill="#ffffff" opacity={0.85}>
                    <circle cx={50} cy={56} r={10} />
                    <path d="M44 74 H56" {...line("#ffffff", 3)} />
                </g>
            )}
        </g>
    );
}

function Notebook() {
    return (
        <g>
            <Shadow rx={28} />
            <rect x={24} y={12} width={54} height={76} rx={5} fill="#4d9be8" {...line("#3a78b8")} />
            {[20, 30, 40, 50, 60, 70, 80].map((y) => (
                <path key={y} d={`M20 ${y} q6 -4 8 0`} fill="none" {...line("#8a8a9a", 2)} />
            ))}
            <rect x={38} y={24} width={32} height={18} rx={3} fill="#ffffff" {...line("#3a78b8", 1)} />
            <path d="M42 30 H66 M42 36 H60" {...line("#a8c8ea", 1.6)} />
        </g>
    );
}

function Sketchbook() {
    const color = subjectColor("likovno");
    return (
        <g>
            <Shadow rx={34} />
            <rect x={12} y={22} width={76} height={60} rx={4} fill={color} {...line(shade(color))} />
            {[22, 32, 42, 52, 62, 72, 82].map((x) => (
                <circle key={x} cx={x - 2} cy={22} r={2.6} fill="none" {...line("#8a8a9a", 1.6)} />
            ))}
            <rect x={20} y={30} width={60} height={44} rx={3} fill="#fffaf0" />
            <g transform="translate(50 52) scale(1.4)">
                <SubjectMark id="likovno" color={color} />
            </g>
        </g>
    );
}

function PencilCase() {
    return (
        <g>
            <Shadow rx={34} />
            <path d="M30 34 L36 20 L40 34Z" fill="#f6c83a" {...line("#c99a1e", 1.2)} />
            <path d="M44 34 L50 16 L56 34Z" fill="#e0574f" {...line("#a83a34", 1.2)} />
            <path d="M60 34 L65 22 L69 34Z" fill="#3fa45a" {...line("#2f7a44", 1.2)} />
            <rect x={14} y={32} width={72} height={44} rx={16} fill="#8a6ee8" {...line("#6650c0")} />
            <path d="M20 46 H80" {...line("#6650c0", 2)} />
            <path d="M20 46 H80" strokeDasharray="3 3" {...line("#d8ccff", 1.4)} />
            <circle cx={78} cy={46} r={3.6} fill="#f6c83a" {...line("#c99a1e", 1.1)} />
        </g>
    );
}

function Bottle() {
    return (
        <g>
            <Shadow rx={18} />
            <rect x={40} y={8} width={20} height={10} rx={3} fill="#3fa45a" {...line("#2f7a44", 1.3)} />
            <path d="M42 18 H58 V24 Q68 28 68 38 V84 Q68 90 62 90 H38 Q32 90 32 84 V38 Q32 28 42 24Z" fill="#bfe4fb" {...line("#6aa8d8")} />
            <path d="M33 50 H67 V84 Q67 89 62 89 H38 Q33 89 33 84Z" fill="#7cc4f0" opacity={0.75} />
            <path d="M38 36 V80" {...line("#ffffff", 3)} opacity={0.7} />
        </g>
    );
}

function Lunch() {
    return (
        <g>
            <Shadow rx={34} />
            <rect x={14} y={30} width={72} height={52} rx={10} fill="#f6a23e" {...line("#c9741e")} />
            <rect x={14} y={30} width={72} height={18} rx={9} fill="#ffc46a" {...line("#c9741e")} />
            <path d="M40 30 Q40 18 50 18 Q60 18 60 30" fill="none" {...line("#c9741e", 3)} />
            <circle cx={36} cy={64} r={8} fill="#e0574f" {...line("#a83a34", 1.2)} />
            <path d="M36 56 q2 -4 5 -4" fill="none" {...line("#3f7a3a", 1.6)} />
            <rect x={52} y={58} width={22} height={14} rx={4} fill="#fbe3b0" {...line("#c9a46a", 1.2)} />
        </g>
    );
}

function Crayons() {
    const colors = ["#e0574f", "#f6c83a", "#3fa45a", "#3f7fd8", "#8a6ee8"];
    return (
        <g>
            <Shadow rx={30} />
            {colors.map((c, i) => (
                <g key={c}>
                    <path d={`M${24 + i * 11} 34 L${29 + i * 11} 18 L${34 + i * 11} 34Z`} fill={c} {...line(shade(c), 1.1)} />
                </g>
            ))}
            <rect x={20} y={32} width={60} height={54} rx={5} fill="#f6c83a" {...line("#c99a1e")} />
            <rect x={26} y={46} width={48} height={22} rx={4} fill="#ffffff" />
            {colors.map((c, i) => (
                <circle key={`d${c}`} cx={32 + i * 9} cy={57} r={3} fill={c} />
            ))}
        </g>
    );
}

function Ruler() {
    return (
        <g transform="rotate(-30 50 50)">
            <rect x={10} y={40} width={80} height={20} rx={3} fill="#ffe08a" {...line("#c9a43a")} />
            {Array.from({ length: 15 }, (_, i) => (
                <path key={i} d={`M${15 + i * 5} 40 V${i % 2 ? 46 : 50}`} {...line("#8a743a", 1.2)} />
            ))}
        </g>
    );
}

function Sneakers() {
    const color = subjectColor("fizicko");
    return (
        <g>
            <Shadow rx={38} />
            {[0, 1].map((i) => (
                <g key={i} transform={`translate(${i ? 30 : -8} ${i ? 6 : 0})`}>
                    <path d="M18 70 Q18 50 30 48 L40 48 Q44 58 56 60 Q68 62 70 70 Q70 78 62 78 H24 Q18 78 18 70Z" fill="#ffffff" {...line("#a8a0b8")} />
                    <path d="M18 72 H70" {...line(color, 4)} />
                    <path d="M32 52 L38 58 M36 50 L42 56" {...line(color, 2)} />
                </g>
            ))}
        </g>
    );
}

// ── Ono što ne treba za školu ─────────────────────────────────────────────────

function Car() {
    return (
        <g>
            <Shadow rx={34} />
            <path d="M16 64 Q16 52 26 50 L34 36 Q36 32 42 32 H62 Q68 32 70 38 L76 50 Q86 52 86 62 V68 Q86 72 82 72 H20 Q16 72 16 68Z" fill="#e0574f" {...line("#a83a34")} />
            <path d="M38 38 H50 V50 H32Z M54 38 H64 L70 50 H54Z" fill="#bfe4fb" {...line("#a83a34", 1.2)} />
            <circle cx={32} cy={72} r={9} fill="#3f3a4a" />
            <circle cx={70} cy={72} r={9} fill="#3f3a4a" />
            <circle cx={32} cy={72} r={3.5} fill="#cfcbd8" />
            <circle cx={70} cy={72} r={3.5} fill="#cfcbd8" />
        </g>
    );
}

function Ball() {
    return (
        <g>
            <Shadow rx={26} />
            <circle cx={50} cy={52} r={34} fill="#ffffff" {...line("#a8a0b8")} />
            <path d="M50 18 A34 34 0 0 1 84 52 L50 52Z" fill="#3f7fd8" />
            <path d="M50 86 A34 34 0 0 1 16 52 L50 52Z" fill="#e0574f" />
            <circle cx={50} cy={52} r={34} fill="none" {...line("#a8a0b8")} />
            <circle cx={50} cy={52} r={7} fill="#f6c83a" {...line("#c99a1e", 1.2)} />
        </g>
    );
}

function Phone() {
    return (
        <g>
            <Shadow rx={22} />
            <rect x={30} y={10} width={40} height={80} rx={8} fill="#3f3a4a" {...line("#25212e")} />
            <rect x={34} y={18} width={32} height={60} rx={3} fill="#7cc4f0" />
            <circle cx={42} cy={30} r={3} fill="#ffffff" opacity={0.85} />
            <rect x={48} y={27} width={14} height={6} rx={2} fill="#ffffff" opacity={0.85} />
            <rect x={38} y={42} width={10} height={10} rx={2} fill="#f6c83a" />
            <rect x={52} y={42} width={10} height={10} rx={2} fill="#e0609e" />
            <rect x={38} y={58} width={10} height={10} rx={2} fill="#3fa45a" />
            <rect x={52} y={58} width={10} height={10} rx={2} fill="#8a6ee8" />
            <rect x={44} y={82} width={12} height={3} rx={1.5} fill="#8a8a9a" />
        </g>
    );
}

function IceCream() {
    return (
        <g>
            <path d="M34 46 L50 92 L66 46Z" fill="#f2c37a" {...line("#c9934e")} />
            <path d="M38 54 L60 70 M44 50 L64 60 M36 62 L54 80 M62 52 L42 72" {...line("#c9934e", 1.2)} />
            <circle cx={40} cy={40} r={13} fill="#f7bccb" {...line("#d98a9c")} />
            <circle cx={60} cy={40} r={13} fill="#c8e8a8" {...line("#8cc46a")} />
            <circle cx={50} cy={26} r={13} fill="#fbe3c4" {...line("#d9b48a")} />
            <circle cx={50} cy={11} r={4.5} fill="#e0574f" />
        </g>
    );
}

function Teddy() {
    return (
        <g>
            <Shadow rx={26} />
            <circle cx={30} cy={24} r={8} fill="#c98a55" {...line("#9a643a")} />
            <circle cx={70} cy={24} r={8} fill="#c98a55" {...line("#9a643a")} />
            <ellipse cx={50} cy={72} rx={22} ry={19} fill="#c98a55" {...line("#9a643a")} />
            <ellipse cx={50} cy={75} rx={12} ry={11} fill="#ecc89e" />
            <circle cx={50} cy={40} r={20} fill="#c98a55" {...line("#9a643a")} />
            <ellipse cx={50} cy={47} rx={9} ry={7} fill="#ecc89e" />
            <circle cx={42} cy={37} r={2.8} fill={INK} />
            <circle cx={58} cy={37} r={2.8} fill={INK} />
            <ellipse cx={50} cy={45} rx={3} ry={2.2} fill={INK} />
            <path d="M46 50 Q50 53 54 50" fill="none" {...line(INK, 1.4)} />
            <path d="M40 60 L50 64 L60 60 L50 68Z" fill="#e0574f" />
        </g>
    );
}

function Blocks() {
    const block = (x: number, y: number, color: string, mark: ReactNode) => (
        <g transform={`translate(${x} ${y})`}>
            <rect width={28} height={28} rx={4} fill={color} {...line(shade(color))} />
            {mark}
        </g>
    );
    return (
        <g>
            <Shadow rx={34} />
            {block(20, 58, "#3f7fd8", <path d="M8 20 L14 8 L20 20 M10 16 H18" fill="none" {...line("#ffffff", 2.4)} />)}
            {block(52, 58, "#3fa45a", <circle cx={14} cy={14} r={6} fill="none" {...line("#ffffff", 2.4)} />)}
            {block(36, 28, "#f6c83a", <path d="M8 8 L20 20 M20 8 L8 20" fill="none" {...line("#ffffff", 2.4)} />)}
        </g>
    );
}

export const ITEM_ART: Record<ItemId, () => ReactNode> = {
    pencilcase: () => <PencilCase />,
    bottle: () => <Bottle />,
    lunch: () => <Lunch />,
    notebook: () => <Notebook />,
    book: () => <Textbook color="#f2786a" />,
    crayons: () => <Crayons />,
    ruler: () => <Ruler />,
    "book-srpski": () => <Textbook color={subjectColor("srpski")} mark="srpski" />,
    "book-matematika": () => <Textbook color={subjectColor("matematika")} mark="matematika" />,
    "book-svet": () => <Textbook color={subjectColor("svet")} mark="svet" />,
    "book-engleski": () => <Textbook color={subjectColor("engleski")} mark="engleski" />,
    "book-muzicko": () => <Textbook color={subjectColor("muzicko")} mark="muzicko" />,
    "book-digitalni": () => <Textbook color={subjectColor("digitalni")} mark="digitalni" />,
    sketchbook: () => <Sketchbook />,
    sneakers: () => <Sneakers />,
    car: () => <Car />,
    ball: () => <Ball />,
    phone: () => <Phone />,
    icecream: () => <IceCream />,
    teddy: () => <Teddy />,
    blocks: () => <Blocks />,
};

export function ItemPicture({ id, className }: { id: ItemId; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {ITEM_ART[id]()}
        </svg>
    );
}

// ── Ranac ─────────────────────────────────────────────────────────────────────
// Dva sloja (zadnji i prednji), da stvari koje su unutra vire iz otvora: igra ih crta između.
// Okvir 100 × 110.

export function BackpackBack({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 110" className={className} aria-hidden="true" focusable="false">
            <ellipse cx={50} cy={106} rx={38} ry={3.5} fill="#000000" opacity={0.1} />
            <path d="M30 22 Q30 6 50 6 Q70 6 70 22" fill="none" {...line("#2f6f8f", 5)} />
            <path d="M14 34 Q14 22 26 22 H74 Q86 22 86 34 V40 H14Z" fill="#2f8fb8" {...line("#246f8f")} />
            <path d="M18 30 H82 V44 H18Z" fill="#1f5f7a" />
        </svg>
    );
}

export function BackpackFront({ name, className }: { name?: string; className?: string }) {
    return (
        <svg viewBox="0 0 100 110" className={className} aria-hidden="true" focusable="false">
            <path d="M10 44 Q10 38 16 38 H84 Q90 38 90 44 V96 Q90 104 82 104 H18 Q10 104 10 96Z" fill="#3fa6d0" {...line("#246f8f")} />
            <path d="M10 44 Q50 52 90 44" fill="none" {...line("#246f8f", 1.6)} />
            <rect x={22} y={60} width={56} height={36} rx={10} fill="#2f8fb8" {...line("#246f8f", 1.4)} />
            <path d="M28 70 H72" strokeDasharray="3 3" {...line("#9fd6ea", 1.4)} />
            <circle cx={70} cy={70} r={2.6} fill="#f6c83a" />
            <rect x={30} y={78} width={40} height={12} rx={4} fill="#ffffff" opacity={0.95} />
            {name && (
                <text x={50} y={87.5} textAnchor="middle" fontSize={9} fontWeight={800} fill="#246f8f" fontFamily="Nunito, Arial Rounded MT Bold, Arial, sans-serif">
                    {name}
                </text>
            )}
        </svg>
    );
}
