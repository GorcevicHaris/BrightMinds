// Crteži igre „Mešaj boje”: tegla sa bojom, činija za mešanje, mrlja boje i predmeti koji se
// boje. Ravan, mek crtež kao u ostalim igrama (debele zaobljene linije, bez emodžija).
// Neobojen predmet je bela slika sa isprekidanom ivicom (kao u bojanci), obojen dobija boju.

import { useId, type JSX } from "react";
import { getPaint, type PaintId, type ThingId } from "@/app/components/games/data/mixColorsLevels";

const INK = "#4A4560";

function paintOf(id: string | null | undefined) {
    return id ? getPaint(id) : undefined;
}

/** Tegla sa bojom (viewBox 0 0 60 72) */
export function PaintPot({ color, className, empty = false }: { color: PaintId | string; className?: string; empty?: boolean }) {
    const paint = paintOf(color);
    const fill = paint?.hex ?? "#EEE";
    const edge = paint?.edge ?? "#BBB";
    return (
        <svg viewBox="0 0 60 72" className={className} aria-hidden="true" focusable="false">
            <ellipse cx="30" cy="68" rx="22" ry="3.5" fill="#000" opacity="0.08" />
            {/* Staklo */}
            <path d="M12 18 Q10 20 10 26 V58 Q10 66 18 66 H42 Q50 66 50 58 V26 Q50 20 48 18 Z" fill="#F5F7FB" stroke="#C9CEDB" strokeWidth="2.5" strokeLinejoin="round" />
            {/* Boja u tegli */}
            {!empty && <path d="M12.5 34 Q30 30 47.5 34 V58 Q47.5 63.5 42 63.5 H18 Q12.5 63.5 12.5 58 Z" fill={fill} stroke={edge} strokeWidth="1.5" />}
            {!empty && <path d="M12.5 34 Q30 30 47.5 34 Q30 38 12.5 34 Z" fill={edge} opacity="0.35" />}
            {/* Odsjaj */}
            <path d="M16 26 V52" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
            {/* Vrat tegle */}
            <rect x="9" y="11" width="42" height="9" rx="4" fill="#E3E7F0" stroke="#C9CEDB" strokeWidth="2.5" />
            {/* Kap boje preko ivice */}
            {!empty && <path d="M40 12 Q41 4 44 6 Q47 8 44 14 Z" fill={fill} stroke={edge} strokeWidth="1.2" />}
        </svg>
    );
}

/** Mrlja boje (ponuđeni odgovor u „Šta će nastati?”), viewBox 0 0 80 64 */
export function PaintBlob({ color, className }: { color: PaintId | string; className?: string }) {
    const paint = paintOf(color);
    return (
        <svg viewBox="0 0 80 64" className={className} aria-hidden="true" focusable="false">
            <path
                d="M14 30 Q10 12 28 10 Q38 2 50 9 Q68 8 68 26 Q76 38 64 48 Q58 60 42 56 Q28 62 20 52 Q6 46 14 30 Z"
                fill={paint?.hex ?? "#EEE"}
                stroke={paint?.edge ?? "#BBB"}
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
            <ellipse cx="30" cy="22" rx="8" ry="4" fill="#FFFFFF" opacity="0.45" />
            <circle cx="72" cy="12" r="3.5" fill={paint?.hex ?? "#EEE"} stroke={paint?.edge ?? "#BBB"} strokeWidth="1.5" />
        </svg>
    );
}

/**
 * Činija za mešanje (viewBox 0 0 120 84). `colors` su boje sipane u činiju (0–2), `mixed` je
 * boja posle mešanja. Dok se meša, dve boje se polako vrte (uz smanjene pokrete stoje).
 */
export function MixBowl({ colors, mixed, mixing, calm, question = false, className }: { colors: readonly string[]; mixed: string | null; mixing: boolean; calm: boolean; question?: boolean; className?: string }): JSX.Element {
    const uid = "mb" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
    const a = paintOf(colors[0]);
    const b = paintOf(colors[1]);
    const m = paintOf(mixed);
    return (
        <svg viewBox="0 0 120 84" className={className} aria-hidden="true" focusable="false">
            <defs>
                <clipPath id={`${uid}-in`}>
                    <ellipse cx="60" cy="30" rx="47" ry="13" />
                </clipPath>
                <style>{`@keyframes ${uid}-spin{to{transform:rotate(360deg)}}.${uid}-spin{animation:${uid}-spin 2.4s linear infinite;transform-origin:60px 30px}@media (prefers-reduced-motion:reduce){.${uid}-spin{animation:none}}`}</style>
            </defs>
            <ellipse cx="60" cy="80" rx="40" ry="4" fill="#000" opacity="0.08" />
            {/* Spoljna strana činije */}
            <path d="M8 30 Q12 74 60 76 Q108 74 112 30 Z" fill="#FFFFFF" stroke="#C9CEDB" strokeWidth="3" strokeLinejoin="round" />
            <path d="M20 46 Q60 58 100 46" fill="none" stroke="#9CCBF3" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
            <path d="M26 54 Q60 64 94 54" fill="none" stroke="#F4A0B8" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            {/* Unutrašnjost */}
            <ellipse cx="60" cy="30" rx="50" ry="15" fill="#EEF1F7" stroke="#C9CEDB" strokeWidth="3" />
            <g clipPath={`url(#${uid}-in)`}>
                {m ? (
                    <>
                        <rect x="0" y="0" width="120" height="60" fill={m.hex} />
                        <ellipse cx="44" cy="25" rx="14" ry="3.5" fill="#FFFFFF" opacity="0.45" />
                    </>
                ) : a && b ? (
                    <g className={mixing && !calm ? `${uid}-spin` : undefined}>
                        <rect x="0" y="0" width="120" height="60" fill={a.hex} />
                        <path d="M60 30 m-50 0 a25 25 0 0 1 50 0 a25 25 0 0 0 50 0 V70 H0 Z" fill={b.hex} />
                        <circle cx="35" cy="30" r="5" fill={b.hex} />
                        <circle cx="85" cy="30" r="5" fill={a.hex} />
                    </g>
                ) : a ? (
                    <ellipse cx="60" cy="31" rx="34" ry="10" fill={a.hex} stroke={a.edge} strokeWidth="1.5" />
                ) : null}
            </g>
            {question && !a && !m && (
                <text x="60" y="38" textAnchor="middle" fontSize="22" fontWeight="800" fill="#A3A8B8" fontFamily="inherit">
                    ?
                </text>
            )}
            {/* Kašika za mešanje */}
            {(a || m) && <path d="M92 6 L72 30" stroke="#C49A6C" strokeWidth="5" strokeLinecap="round" />}
        </svg>
    );
}

// ── Predmeti ──────────────────────────────────────────────────────────────────

/** Predmet koji se boji (viewBox 0 0 100 100); bez boje — bela slika sa isprekidanom ivicom */
export function ThingArt({ id, color, className }: { id: ThingId; color: string | null; className?: string }) {
    const paint = paintOf(color);
    const f = paint?.hex ?? "#FFFFFF";
    const line = paint ? paint.edge : "#B8BCCB";
    const dash = paint ? undefined : "5 4";
    const s = { fill: f, stroke: line, strokeWidth: 3, strokeDasharray: dash, strokeLinejoin: "round" as const };
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            <ellipse cx="50" cy="94" rx="30" ry="4" fill="#000" opacity="0.07" />
            {THING_ART[id](s, Boolean(paint))}
        </svg>
    );
}

type Fill = { fill: string; stroke: string; strokeWidth: number; strokeDasharray?: string; strokeLinejoin: "round" };

const eyes = (x1: number, x2: number, y: number, r = 3.2) => (
    <g fill={INK}>
        <circle cx={x1} cy={y} r={r} />
        <circle cx={x2} cy={y} r={r} />
        <circle cx={x1 + 1} cy={y - 1} r={r * 0.35} fill="#FFFFFF" />
        <circle cx={x2 + 1} cy={y - 1} r={r * 0.35} fill="#FFFFFF" />
    </g>
);
const smile = (x: number, y: number, w = 10) => <path d={`M${x - w / 2} ${y} q${w / 2} ${w * 0.55} ${w} 0`} fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />;
const leaf = (d: string) => <path d={d} fill="#7CC07A" stroke="#4E9A52" strokeWidth="2" strokeLinejoin="round" />;

const THING_ART: Record<ThingId, (s: Fill, painted: boolean) => JSX.Element> = {
    orange: (s) => (
        <g>
            <circle cx="50" cy="56" r="32" {...s} />
            <g fill="#FFFFFF" opacity="0.35">
                <circle cx="38" cy="44" r="6" />
            </g>
            <path d="M50 24 V16" stroke="#8C6A4F" strokeWidth="3" strokeLinecap="round" />
            {leaf("M51 18 Q64 8 74 14 Q64 24 51 18 Z")}
        </g>
    ),
    frog: (s) => (
        <g>
            <ellipse cx="50" cy="62" rx="36" ry="26" {...s} />
            <circle cx="32" cy="34" r="12" {...s} />
            <circle cx="68" cy="34" r="12" {...s} />
            <circle cx="32" cy="34" r="6" fill="#FFFFFF" />
            <circle cx="68" cy="34" r="6" fill="#FFFFFF" />
            <circle cx="33" cy="35" r="3.2" fill={INK} />
            <circle cx="69" cy="35" r="3.2" fill={INK} />
            <path d="M34 62 Q50 74 66 62" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
            <ellipse cx="28" cy="66" rx="5" ry="3" fill="#F4A0B8" opacity="0.6" />
            <ellipse cx="72" cy="66" rx="5" ry="3" fill="#F4A0B8" opacity="0.6" />
        </g>
    ),
    grapes: (s) => (
        <g>
            <path d="M50 22 V12" stroke="#8C6A4F" strokeWidth="3" strokeLinecap="round" />
            {leaf("M52 16 Q66 6 76 14 Q64 24 52 16 Z")}
            {[
                [38, 32],
                [50, 30],
                [62, 32],
                [32, 46],
                [44, 46],
                [56, 46],
                [68, 46],
                [38, 60],
                [50, 60],
                [62, 60],
                [44, 74],
                [56, 74],
                [50, 86],
            ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="8" {...s} />
            ))}
        </g>
    ),
    pig: (s) => (
        <g>
            <path d="M24 30 L20 12 L38 22 Z" {...s} />
            <path d="M76 30 L80 12 L62 22 Z" {...s} />
            <circle cx="50" cy="54" r="34" {...s} />
            {eyes(38, 62, 44)}
            <ellipse cx="50" cy="62" rx="13" ry="9" {...s} />
            <ellipse cx="45.5" cy="62" rx="2.4" ry="3.4" fill={INK} />
            <ellipse cx="54.5" cy="62" rx="2.4" ry="3.4" fill={INK} />
            {smile(50, 76, 12)}
        </g>
    ),
    balloon: (s) => (
        <g>
            <path d="M50 74 Q46 84 52 92" fill="none" stroke="#8C8FA0" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="50" cy="40" rx="27" ry="32" {...s} />
            <path d="M46 72 L54 72 L50 77 Z" {...s} />
            <ellipse cx="40" cy="28" rx="6" ry="9" fill="#FFFFFF" opacity="0.45" />
        </g>
    ),
    chick: (s) => (
        <g>
            <ellipse cx="50" cy="64" rx="30" ry="24" {...s} />
            <circle cx="50" cy="36" r="20" {...s} />
            <path d="M48 18 Q50 10 54 14" fill="none" stroke={s.stroke} strokeWidth="3" strokeLinecap="round" />
            {eyes(43, 57, 34, 2.8)}
            <path d="M45 42 L55 42 L50 50 Z" fill="#F59A34" stroke="#C87517" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M24 62 Q14 56 18 70 Z" {...s} />
            <path d="M42 88 V94 M58 88 V94" stroke="#F59A34" strokeWidth="3" strokeLinecap="round" />
        </g>
    ),
    caterpillar: (s) => (
        <g>
            {[18, 34, 50, 66].map((x, i) => (
                <circle key={x} cx={x} cy={i % 2 ? 62 : 66} r="11" {...s} />
            ))}
            <circle cx="80" cy="52" r="14" {...s} />
            <path d="M76 38 L72 28 M84 38 L88 28" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="72" cy="27" r="2.6" fill={INK} />
            <circle cx="88" cy="27" r="2.6" fill={INK} />
            {eyes(75, 85, 50, 2.4)}
            {smile(80, 57, 8)}
        </g>
    ),
    lilac: (s) => (
        <g>
            <path d="M50 92 V54" stroke="#4E9A52" strokeWidth="3.5" strokeLinecap="round" />
            {leaf("M50 74 Q30 70 26 80 Q40 86 50 74 Z")}
            {leaf("M50 68 Q70 62 76 72 Q60 80 50 68 Z")}
            {[
                [50, 16],
                [42, 26],
                [58, 26],
                [36, 38],
                [50, 36],
                [64, 38],
                [42, 50],
                [58, 50],
            ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="8.5" {...s} />
            ))}
        </g>
    ),
    peach: (s) => (
        <g>
            <path d="M50 26 C26 20 14 44 22 66 C30 86 50 88 50 88 C50 88 70 86 78 66 C86 44 74 20 50 26 Z" {...s} />
            <path d="M50 28 Q44 56 50 86" fill="none" stroke={s.stroke} strokeWidth="2" opacity="0.6" />
            <path d="M50 26 V16" stroke="#8C6A4F" strokeWidth="3" strokeLinecap="round" />
            {leaf("M51 18 Q64 8 74 14 Q64 24 51 18 Z")}
        </g>
    ),
    elephant: (s) => (
        <g>
            <ellipse cx="22" cy="46" rx="16" ry="22" {...s} />
            <ellipse cx="78" cy="46" rx="16" ry="22" {...s} />
            <circle cx="50" cy="44" r="27" {...s} />
            <path d="M42 58 Q40 82 50 88 Q58 90 58 82 Q52 80 56 58 Z" {...s} />
            {eyes(40, 60, 40)}
        </g>
    ),
    night: (s, painted) => (
        <g>
            <rect x="12" y="14" width="76" height="76" rx="12" {...s} />
            <path d="M58 32 A15 15 0 1 0 70 56 A12 12 0 1 1 58 32 Z" fill="#FCEBA0" stroke="#E2C766" strokeWidth="2" />
            {[
                [28, 30],
                [36, 66],
                [74, 74],
                [24, 50],
            ].map(([x, y]) => (
                <path key={`${x}-${y}`} d={`M${x} ${y - 5} L${x + 1.6} ${y - 1.6} L${x + 5} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 5} L${x - 1.6} ${y + 1.6} L${x - 5} ${y} L${x - 1.6} ${y - 1.6} Z`} fill={painted ? "#FFFFFF" : "#D9DCE6"} />
            ))}
        </g>
    ),
    cherry: (s) => (
        <g>
            <path d="M36 62 Q42 30 58 16 M66 60 Q62 34 58 16" fill="none" stroke="#6E8F3E" strokeWidth="3" strokeLinecap="round" />
            {leaf("M58 16 Q72 8 80 16 Q70 24 58 16 Z")}
            <circle cx="34" cy="68" r="17" {...s} />
            <circle cx="68" cy="66" r="17" {...s} />
            <ellipse cx="28" cy="62" rx="4" ry="5" fill="#FFFFFF" opacity="0.45" />
            <ellipse cx="62" cy="60" rx="4" ry="5" fill="#FFFFFF" opacity="0.45" />
        </g>
    ),
    olive: (s) => (
        <g>
            <path d="M18 30 Q50 22 84 32" fill="none" stroke="#8C6A4F" strokeWidth="3" strokeLinecap="round" />
            {leaf("M30 28 Q24 14 36 10 Q40 22 30 28 Z")}
            {leaf("M68 30 Q78 18 86 24 Q80 34 68 30 Z")}
            <ellipse cx="34" cy="56" rx="13" ry="18" {...s} transform="rotate(-12 34 56)" />
            <ellipse cx="64" cy="60" rx="13" ry="18" {...s} transform="rotate(10 64 60)" />
            <path d="M34 28 V40 M64 30 V42" stroke="#8C6A4F" strokeWidth="2.5" strokeLinecap="round" />
        </g>
    ),
    bear: (s) => (
        <g>
            <circle cx="26" cy="28" r="12" {...s} />
            <circle cx="74" cy="28" r="12" {...s} />
            <circle cx="50" cy="54" r="34" {...s} />
            <ellipse cx="50" cy="66" rx="15" ry="11" fill="#FFF4E4" stroke={s.stroke} strokeWidth="2" />
            {eyes(38, 62, 48)}
            <ellipse cx="50" cy="61" rx="5" ry="3.5" fill={INK} />
            {smile(50, 68, 10)}
        </g>
    ),
    pine: (s) => (
        <g>
            <rect x="44" y="76" width="12" height="14" rx="3" fill="#B08968" />
            <path d="M50 10 L28 40 H38 L20 62 H34 L16 80 H84 L66 62 H80 L62 40 H72 Z" {...s} />
            <path d="M50 4 L52.5 9 L58 9.5 L54 13 L55 18.5 L50 16 L45 18.5 L46 13 L42 9.5 L47.5 9 Z" fill="#F9D23C" stroke="#D3A912" strokeWidth="1.5" strokeLinejoin="round" />
        </g>
    ),
    eggplant: (s) => (
        <g>
            <path d="M64 24 C84 40 82 78 58 88 C34 96 18 78 26 62 C32 50 44 52 50 38 C54 28 56 20 64 24 Z" {...s} />
            <path d="M58 22 Q66 10 74 12 Q72 22 66 26 Q74 30 70 34 Q62 30 58 22 Z" fill="#7CC07A" stroke="#4E9A52" strokeWidth="2" strokeLinejoin="round" />
            <ellipse cx="40" cy="70" rx="5" ry="9" fill="#FFFFFF" opacity="0.3" transform="rotate(30 40 70)" />
        </g>
    ),
};
