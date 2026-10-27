// Crteži igre „Posadi cvet”: saksija sa biljkom u sedam faza rasta, znaci potrebe (suva
// ispucala zemlja, oblak, korov, mokra zemlja, koren iz saksije), baštovanka Emina i stvari
// za negu. Ravan, mek crtež kao u ostalim igrama; pokret je tih i staje uz smanjene pokrete.

import type { JSX } from "react";
import type { Cond, PlantKind, ToolId } from "@/app/components/games/data/plantLevels";

const INK = "#4A4560";
const STEM = "#5DA35F";
const LEAF = "#7CC07A";
const LEAF_DARK = "#4E9A52";

// ── Scena ─────────────────────────────────────────────────────────────────────

interface SceneProps {
    plant: PlantKind;
    stage: number;
    cond: Cond;
    petal: string;
    /** Potreba u oblačiću (lako); null — bez oblačića */
    bubble: ToolId | null;
    /** Upravo urađen korak (voda kaplje, sunce sija) */
    just: ToolId | null;
    calm: boolean;
    className?: string;
}

/** Saksija u bašti (viewBox 0 0 240 200): nebo, sunce ili oblak, saksija, biljka i Emina */
export function PlantScene({ plant, stage, cond, petal, bubble, just, calm, className }: SceneProps): JSX.Element {
    const cloudy = cond === "cloud" || cond === "moist-cloud" || cond === "wet";
    const big = cond === "cramped";
    return (
        <svg viewBox="0 0 240 200" className={className} aria-hidden="true" focusable="false">
            <style>{STYLE}</style>
            {/* Nebo i trava */}
            <rect width="240" height="200" rx="18" fill={cloudy ? "#E3E9F2" : "#EAF6FD"} />
            <path d="M0 150 Q60 140 120 148 T240 146 V182 Q240 200 222 200 H18 Q0 200 0 182 Z" fill="#CFE8C2" />
            {/* Sunce ili oblak */}
            {cloudy ? (
                <g>
                    <g opacity="0.45">
                        <circle cx="42" cy="34" r="16" fill="#FFD66B" />
                    </g>
                    <Cloud x={70} y={34} />
                </g>
            ) : (
                <g transform="translate(40 36)">
                    <g className={calm ? undefined : "pa-spin"}>
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                            <rect key={a} x="-2.5" y="-27" width="5" height="9" rx="2.5" fill="#FFC94D" transform={`rotate(${a})`} />
                        ))}
                    </g>
                    <circle r="15" fill="#FFD66B" stroke="#F5B83D" strokeWidth="2" />
                    <path d="M-6 2 q6 5 12 0" fill="none" stroke="#C98510" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="-5" cy="-3" r="1.6" fill="#C98510" />
                    <circle cx="5" cy="-3" r="1.6" fill="#C98510" />
                </g>
            )}
            {just === "sun" && !cloudy && !calm && (
                <g className="pa-fade">
                    <path d="M58 52 L88 92" stroke="#FFE08A" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
                    <path d="M66 44 L100 76" stroke="#FFE08A" strokeWidth="5" strokeLinecap="round" opacity="0.6" />
                </g>
            )}

            {/* Saksija (biljka raste iz nje) */}
            <g transform="translate(100 0)">
                <Plant plant={plant} stage={stage} cond={cond} petal={petal} big={big} calm={calm} />
                <Pot cond={cond} stage={stage} small={big} />
                {cond === "weeds" && <Weeds />}
                {just === "water" && <Drops calm={calm} />}
            </g>

            <Emina />
            {bubble && <NeedBubble tool={bubble} calm={calm} />}
        </svg>
    );
}

const STYLE =
    "@keyframes pa-spin{to{transform:rotate(360deg)}}@keyframes pa-fade{0%{opacity:0}30%{opacity:1}100%{opacity:0}}@keyframes pa-drop{0%{transform:translateY(-10px);opacity:0}30%{opacity:1}100%{transform:translateY(14px);opacity:0}}@keyframes pa-grow{0%{transform:scale(.6);opacity:.4}100%{transform:scale(1);opacity:1}}@keyframes pa-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}" +
    ".pa-spin{animation:pa-spin 24s linear infinite}.pa-fade{animation:pa-fade 1.6s ease-out both}.pa-drop{animation:pa-drop 1.1s ease-in infinite}.pa-grow{animation:pa-grow .7s ease-out both;transform-box:fill-box;transform-origin:50% 100%}.pa-bob{animation:pa-bob 3s ease-in-out infinite}" +
    "@media (prefers-reduced-motion:reduce){.pa-spin,.pa-fade,.pa-drop,.pa-grow,.pa-bob{animation:none}}";

function Cloud({ x, y }: { x: number; y: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="8" rx="38" ry="14" fill="#B8C3D4" />
            <circle cx="-16" cy="0" r="15" fill="#C5CFDE" />
            <circle cx="6" cy="-8" r="19" fill="#C5CFDE" />
            <circle cx="24" cy="2" r="13" fill="#C5CFDE" />
            <path d="M-26 10 H30" stroke="#AEB9CB" strokeWidth="3" strokeLinecap="round" />
        </g>
    );
}

/** Saksija; tlo pokazuje potrebu (suvo i ispucalo, mokro sa barom, korov) */
function Pot({ cond, stage, small }: { cond: Cond; stage: number; small: boolean }) {
    const w = small ? 30 : 40;
    const soil = cond === "dry" ? "#C9A27A" : cond === "wet" || cond === "moist-cloud" ? "#6E4A30" : "#8C6243";
    return (
        <g>
            <ellipse cx="0" cy="186" rx={w + 6} ry="5" fill="#000" opacity="0.08" />
            <path d={`M${-w} 138 L${-w + 8} 184 H${w - 8} L${w} 138 Z`} fill="#D9875C" stroke="#B86541" strokeWidth="2.5" strokeLinejoin="round" />
            <rect x={-w - 5} y="130" width={(w + 5) * 2} height="12" rx="4" fill="#E39B6B" stroke="#B86541" strokeWidth="2.5" />
            {/* Zemlja */}
            <ellipse cx="0" cy="131" rx={w + 1} ry="5" fill={soil} />
            {cond === "dry" && (
                // Suva, ispucala zemlja
                <g fill="none" stroke="#7A5236" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={`M${-w + 6} 131 l6 -2 l4 2.5 l5 -1.5`} />
                    <path d="M6 130.5 l5 2 l5 -2 l4 1.5" />
                    <path d="M-6 132.5 l3 -1.5 l3 1.5" />
                </g>
            )}
            {(cond === "wet" || cond === "moist-cloud") && <ellipse cx="-12" cy="131.5" rx="10" ry="2.2" fill="#8FC9E8" />}
            {cond === "wet" && (
                <g>
                    <ellipse cx={w + 14} cy="186" rx="14" ry="3.5" fill="#8FC9E8" opacity="0.8" />
                    <path d={`M${w - 6} 170 q2 6 0 10`} stroke="#8FC9E8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </g>
            )}
            {stage === 1 && <ellipse cx="0" cy="131" rx="9" ry="3" fill="#4F3422" />}
            {stage === 2 && (
                <g>
                    <ellipse cx="0" cy="129" rx="11" ry="4" fill="#7A5236" />
                    <ellipse cx="0" cy="127.5" rx="3.5" ry="2.2" fill="#E3C79E" stroke="#B08560" strokeWidth="1" />
                </g>
            )}
            {small && (
                // Koren izlazi kroz dno: saksija je postala mala
                <g stroke="#C9A27A" strokeWidth="2.2" strokeLinecap="round" fill="none">
                    <path d="M-6 184 q-4 6 -10 7" />
                    <path d="M4 184 q2 7 8 8" />
                    <path d="M-1 184 v8" />
                </g>
            )}
        </g>
    );
}

/** Biljka iz saksije; dno stabljike je na y = 131 */
function Plant({ plant, stage, cond, petal, big, calm }: { plant: PlantKind; stage: number; cond: Cond; petal: string; big: boolean; calm: boolean }) {
    if (stage < 3) return null;
    const droop = cond === "dry";
    const grow = calm ? undefined : "pa-grow";
    if (plant === "cactus") {
        const h = stage >= 5 ? 56 : stage === 4 ? 40 : 22;
        return (
            <g key={stage} className={grow}>
                <rect x="-11" y={131 - h} width="22" height={h + 2} rx="11" fill={droop ? "#9DBF76" : "#6DB27A"} stroke="#4E9A52" strokeWidth="2" />
                {stage >= 4 && <path d={`M-11 ${131 - h * 0.45} H-20 V${131 - h * 0.75}`} fill="none" stroke={droop ? "#9DBF76" : "#6DB27A"} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />}
                {stage >= 5 && <path d={`M11 ${131 - h * 0.6} H19 V${131 - h * 0.85}`} fill="none" stroke={droop ? "#9DBF76" : "#6DB27A"} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />}
                <path d={`M0 ${131 - h + 6} V129`} stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
                {stage >= 6 && (
                    <g transform={`translate(0 ${131 - h - 2})`}>
                        {[0, 60, 120, 180, 240, 300].map((a) => (
                            <ellipse key={a} cx="0" cy="-5" rx="3.2" ry="5.5" fill={petal} transform={`rotate(${a})`} />
                        ))}
                        <circle r="3" fill="#FFE08A" />
                    </g>
                )}
            </g>
        );
    }
    // Visina stabljike po fazi; velika biljka (paradajz u maloj saksiji) je viša
    const h = (stage === 3 ? 16 : stage === 4 ? 46 : 64) * (big ? 1.15 : 1);
    const top = 131 - h;
    const bend = droop ? 14 : 0;
    const stem = `M0 131 Q${bend * 0.2} ${131 - h * 0.5} ${bend} ${top}`;
    const leafAt = (y: number, dir: 1 | -1, size: number) => {
        const angle = droop ? dir * 55 : dir * -25;
        return (
            <ellipse
                key={`${y}-${dir}`}
                cx={dir * size * 0.9}
                cy="0"
                rx={size}
                ry={size * 0.42}
                fill={droop ? "#A8C67E" : LEAF}
                stroke={LEAF_DARK}
                strokeWidth="1.5"
                transform={`translate(${(bend * (131 - y)) / h} ${y}) rotate(${angle})`}
            />
        );
    };
    return (
        <g key={stage} className={grow}>
            <path d={stem} fill="none" stroke={STEM} strokeWidth={plant === "sunflower" ? 5 : 4} strokeLinecap="round" />
            {stage === 3 ? (
                <>
                    {leafAt(top + 2, -1, 7)}
                    {leafAt(top + 2, 1, 7)}
                </>
            ) : (
                <>
                    {leafAt(131 - h * 0.3, -1, 13)}
                    {leafAt(131 - h * 0.45, 1, 13)}
                    {leafAt(131 - h * 0.68, -1, 10)}
                    {plant === "tomato" && leafAt(131 - h * 0.8, 1, 10)}
                </>
            )}
            {stage === 5 && plant !== "tomato" && (
                <g transform={`translate(${bend} ${top})`}>
                    <ellipse cx="0" cy="-5" rx="6" ry="9" fill={petal} stroke={INK} strokeOpacity="0.15" />
                    <path d="M-6 0 Q0 6 6 0 L4 -4 Q0 -1 -4 -4 Z" fill={LEAF} />
                </g>
            )}
            {stage >= 6 && <Bloom plant={plant} petal={petal} x={bend} y={top} calm={calm} />}
            {plant === "tomato" && stage >= 5 && (
                <g>
                    {stage >= 6 && <path d={`M-14 ${131 - h * 0.62} V129 M14 ${131 - h * 0.5} V129`} stroke="#C49A6C" strokeWidth="3" strokeLinecap="round" opacity="0.8" />}
                    {[
                        [-12, 0.42],
                        [12, 0.55],
                        [-7, 0.72],
                    ].map(([dx, f]) => (
                        <circle key={f} cx={dx} cy={131 - h * f} r={stage >= 6 ? 6.5 : 4} fill={stage >= 6 ? "#E9504F" : "#9CCB7A"} stroke={stage >= 6 ? "#B93A3A" : LEAF_DARK} strokeWidth="1.5" />
                    ))}
                </g>
            )}
        </g>
    );
}

function Bloom({ plant, petal, x, y, calm }: { plant: PlantKind; petal: string; x: number; y: number; calm: boolean }) {
    if (plant === "tomato") return null;
    if (plant === "sunflower") {
        return (
            <g transform={`translate(${x} ${y - 6})`}>
                <g className={calm ? undefined : "pa-bob"}>
                    {Array.from({ length: 14 }, (_, i) => (
                        <ellipse key={i} cx="0" cy="-15" rx="4.5" ry="9" fill="#FFC93C" stroke="#E5A01E" strokeWidth="1" transform={`rotate(${(i * 360) / 14})`} />
                    ))}
                    <circle r="11" fill="#8C5A35" />
                    <circle r="11" fill="none" stroke="#6E4428" strokeWidth="1.5" strokeDasharray="2 3" />
                    <path d="M-4 1 q4 4 8 0" fill="none" stroke="#FFE08A" strokeWidth="1.8" strokeLinecap="round" />
                </g>
            </g>
        );
    }
    if (plant === "tulip") {
        return (
            <g transform={`translate(${x} ${y})`}>
                <path d="M-11 -18 Q-12 2 0 4 Q12 2 11 -18 L6 -10 L0 -20 L-6 -10 Z" fill={petal} stroke={INK} strokeOpacity="0.2" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M-4 -6 Q-2 0 0 1" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
            </g>
        );
    }
    return (
        <g transform={`translate(${x} ${y - 4})`}>
            <g className={calm ? undefined : "pa-bob"}>
                {[0, 72, 144, 216, 288].map((a) => (
                    <ellipse key={a} cx="0" cy="-9" rx="7" ry="9.5" fill={petal} stroke={INK} strokeOpacity="0.15" strokeWidth="1.2" transform={`rotate(${a})`} />
                ))}
                <circle r="6" fill="#FFE08A" stroke="#F5B83D" strokeWidth="1.5" />
            </g>
        </g>
    );
}

function Weeds() {
    const weed = (x: number, flip: number) => (
        <g key={x} transform={`translate(${x} 131) scale(${flip} 1)`} fill="#8FB45A" stroke="#6E8F3E" strokeWidth="1.2" strokeLinejoin="round">
            <path d="M0 0 L-3 -12 L0 -6 L2 -16 L4 -5 L8 -11 L6 0 Z" />
        </g>
    );
    return <g>{[weed(-30, 1), weed(-20, -1), weed(22, 1), weed(31, -1)]}</g>;
}

function Drops({ calm }: { calm: boolean }) {
    return (
        <g>
            {[-14, 0, 14].map((x, i) => (
                <path key={x} d={`M${x} 104 q-3 5 0 7 q3 -2 0 -7 Z`} fill="#6FB7E3" className={calm ? undefined : "pa-drop"} style={calm ? undefined : { animationDelay: `${i * 0.25}s` }} />
            ))}
        </g>
    );
}

/** Baštovanka Emina (desno), maše detetu */
function Emina() {
    return (
        <g transform="translate(196 116)">
            <ellipse cx="0" cy="70" rx="22" ry="4.5" fill="#000" opacity="0.08" />
            {/* Noge i kecelja */}
            <rect x="-9" y="44" width="7" height="24" rx="3" fill="#6B7A99" />
            <rect x="2" y="44" width="7" height="24" rx="3" fill="#6B7A99" />
            <path d="M-17 52 L-13 14 H13 L17 52 Z" fill="#7CC07A" />
            <path d="M-9 26 H9 V48 H-9 Z" fill="#F4E3C5" />
            <rect x="-5" y="34" width="10" height="7" rx="2" fill="#E9D3AE" />
            {/* Ruka koja maše */}
            <path d="M13 18 Q24 8 26 -4" fill="none" stroke="#7CC07A" strokeWidth="7" strokeLinecap="round" />
            <circle cx="26" cy="-6" r="5" fill="#F2C29B" />
            <path d="M-13 18 Q-20 30 -18 40" fill="none" stroke="#7CC07A" strokeWidth="7" strokeLinecap="round" />
            <circle cx="-18" cy="41" r="4.5" fill="#F2C29B" />
            {/* Glava sa maramom */}
            <path d="M-17 2 Q-18 -24 0 -26 Q18 -24 17 2 Q12 14 0 14 Q-12 14 -17 2 Z" fill="#F59FB5" />
            <ellipse cx="0" cy="-4" rx="11.5" ry="13" fill="#F2C29B" />
            <path d="M-12 -10 Q0 -22 12 -10 Q12 -16 0 -19 Q-12 -16 -12 -10 Z" fill="#F59FB5" />
            <circle cx="-4.5" cy="-4" r="1.8" fill={INK} />
            <circle cx="4.5" cy="-4" r="1.8" fill={INK} />
            <path d="M-4 3 q4 4 8 0" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="-8" cy="1" rx="2.6" ry="1.6" fill="#F4A0B8" opacity="0.7" />
            <ellipse cx="8" cy="1" rx="2.6" ry="1.6" fill="#F4A0B8" opacity="0.7" />
        </g>
    );
}

/** Oblačić iznad biljke sa slikom onoga što joj treba (laki nivoi) */
function NeedBubble({ tool, calm }: { tool: ToolId; calm: boolean }) {
    return (
        <g transform="translate(128 34)">
            <g className={calm ? undefined : "pa-bob"}>
                <circle cx="-30" cy="58" r="3.5" fill="#FFFFFF" stroke="#C9CEDB" strokeWidth="1.5" />
                <circle cx="-22" cy="48" r="5" fill="#FFFFFF" stroke="#C9CEDB" strokeWidth="1.5" />
                <rect x="-14" y="0" width="44" height="40" rx="14" fill="#FFFFFF" stroke="#C9CEDB" strokeWidth="2" />
                <g transform="translate(-10 0) scale(0.6)">
                    <ToolArt id={tool} inline />
                </g>
            </g>
        </g>
    );
}

// ── Stvari za negu ────────────────────────────────────────────────────────────

/** Stvar za negu (viewBox 0 0 60 60); `inline` — bez sopstvenog <svg> (unutar scene) */
export function ToolArt({ id, className, inline = false }: { id: ToolId; className?: string; inline?: boolean }): JSX.Element {
    const art = TOOL_ART[id];
    if (inline) return <g>{art}</g>;
    return (
        <svg viewBox="0 0 60 60" className={className} aria-hidden="true" focusable="false">
            {art}
        </svg>
    );
}

const TOOL_ART: Record<ToolId, JSX.Element> = {
    shovel: (
        <g>
            <rect x="27" y="6" width="6" height="28" rx="3" fill="#C49A6C" stroke="#9C6B43" strokeWidth="1.5" />
            <rect x="22" y="4" width="16" height="7" rx="3.5" fill="#F28B7E" stroke="#C9655A" strokeWidth="1.5" />
            <path d="M18 32 H42 V40 Q42 54 30 56 Q18 54 18 40 Z" fill="#B8C3D4" stroke="#7E8BA0" strokeWidth="2" strokeLinejoin="round" />
            <path d="M23 36 V44" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </g>
    ),
    seed: (
        <g>
            <path d="M14 14 H46 L44 52 H16 Z" fill="#F7E3B5" stroke="#C9A06A" strokeWidth="2" strokeLinejoin="round" />
            <path d="M14 14 L18 8 H42 L46 14" fill="#EED39C" stroke="#C9A06A" strokeWidth="2" strokeLinejoin="round" />
            <g transform="translate(30 30)">
                {[0, 72, 144, 216, 288].map((a) => (
                    <ellipse key={a} cx="0" cy="-6" rx="3.6" ry="5" fill="#F59FB5" transform={`rotate(${a})`} />
                ))}
                <circle r="3" fill="#FFD66B" />
            </g>
            <ellipse cx="22" cy="45" rx="3" ry="2" fill="#9C6B43" />
            <ellipse cx="30" cy="46" rx="3" ry="2" fill="#9C6B43" />
            <ellipse cx="38" cy="45" rx="3" ry="2" fill="#9C6B43" />
        </g>
    ),
    water: (
        <g>
            <path d="M14 26 H40 V48 Q40 54 34 54 H20 Q14 54 14 48 Z" fill="#6FB7E3" stroke="#3F8FC2" strokeWidth="2" strokeLinejoin="round" />
            <path d="M40 32 L54 20" stroke="#3F8FC2" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="54" cy="19" rx="4" ry="2.5" fill="#3F8FC2" transform="rotate(-40 54 19)" />
            <path d="M16 26 Q27 10 38 26" fill="none" stroke="#3F8FC2" strokeWidth="4" strokeLinecap="round" />
            <path d="M19 32 V46" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
            <path d="M56 28 q-2 4 0 6 q2 -2 0 -6 Z" fill="#6FB7E3" />
        </g>
    ),
    sun: (
        <g transform="translate(30 30)">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <rect key={a} x="-3" y="-27" width="6" height="10" rx="3" fill="#FFC94D" transform={`rotate(${a})`} />
            ))}
            <circle r="15" fill="#FFD66B" stroke="#F5B83D" strokeWidth="2" />
            <path d="M-6 3 q6 5 12 0" fill="none" stroke="#C98510" strokeWidth="2" strokeLinecap="round" />
            <circle cx="-5" cy="-3" r="1.8" fill="#C98510" />
            <circle cx="5" cy="-3" r="1.8" fill="#C98510" />
        </g>
    ),
    pot: (
        <g>
            <path d="M12 22 L18 54 H42 L48 22 Z" fill="#D9875C" stroke="#B86541" strokeWidth="2" strokeLinejoin="round" />
            <rect x="8" y="14" width="44" height="10" rx="4" fill="#E39B6B" stroke="#B86541" strokeWidth="2" />
            <path d="M20 30 L23 48" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        </g>
    ),
    gloves: (
        <g>
            <path
                d="M12 52 V30 Q12 22 18 22 V12 Q18 8 21 8 Q24 8 24 12 V20 V8 Q24 4 27 4 Q30 4 30 8 V20 V10 Q30 6 33 6 Q36 6 36 10 V24 Q40 22 42 26 L36 38 V52 Z"
                fill="#F6A85F"
                stroke="#C87517"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <rect x="11" y="44" width="26" height="9" rx="3" fill="#7CC07A" stroke="#4E9A52" strokeWidth="2" />
        </g>
    ),
};

/** Mala biljka u bašti (gornji red, završene biljke): isečak scene oko saksije */
export function GardenSprout({ plant, petal }: { plant: PlantKind; petal: string }) {
    return (
        <svg viewBox="52 34 96 160" className="h-full w-auto" aria-hidden="true" focusable="false">
            <g transform="translate(100 0)">
                <Plant plant={plant} stage={6} cond="none" petal={petal} big={false} calm />
                <Pot cond="none" stage={6} small={false} />
            </g>
        </svg>
    );
}
