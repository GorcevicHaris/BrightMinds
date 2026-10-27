"use client";

// Crtež deteta za igru „Moje telo”: Amar ili Lejla spreda, krupno lice (oči, nos, usta, uši,
// kosa, obrve, obrazi) ili celo telo raširenih ruku (glava, vrat, ramena, ruke, laktovi, šake,
// stomak, noge, kolena, stopala). Svaki deo ima svoje polje za dodir koje je veće od samog
// crteža (lako se pogodi malim prstom); polje zasvetli kao pomoć, pozeleni kad je tačno, a
// blago požuti kad je izabran drugi deo. Delovi koji nisu u zadatku su samo crtež.

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { DemoHand } from "@/app/components/games/kit";
import { cn } from "@/lib/cn";
import { INK, line } from "@/app/components/games/pictures/kit";
import { basePic } from "@/app/components/games/world/basePics";
import type { PointFigureProps } from "@/app/components/games/world/WorldGame";
import { PARTS, type PartId } from "@/app/components/games/data/bodyLevels";

// ── Izgled ────────────────────────────────────────────────────────────────────

const LOOK = {
    amar: { skin: "#f3cfb0", edge: "#d39a72", hair: "#4a2f1e", shirt: "#f59a3a", shirtEdge: "#c8701a", shorts: "#2fa39a", shortsEdge: "#1f7a72" },
    lejla: { skin: "#f6d6bb", edge: "#d6a07a", hair: "#3b241a", shirt: "#ec7aa8", shirtEdge: "#c04f80", shorts: "#8a6ad8", shortsEdge: "#5f44b0" },
} as const;

type Look = (typeof LOOK)[keyof typeof LOOK];

// ── Polja za dodir ────────────────────────────────────────────────────────────

/** Krug i elipsa polja; na malom crtežu polje raste do najmanjeg poluprečnika `min` (prst ga lako pogodi) */
const circle = (cx: number, cy: number, r: number, min = 0) => ellipse(cx, cy, r, r, min);
function ellipse(cx: number, cy: number, rx0: number, ry0: number, min = 0): string {
    const rx = Math.round(Math.max(rx0, min) * 10) / 10;
    const ry = Math.round(Math.max(ry0, min) * 10) / 10;
    return `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
}

interface Zone {
    /** Oblik polja za dati najmanji poluprečnik */
    d: (min: number) => string;
    /** Gde ruka pokazuje (sredina jednog od delova) */
    at: [number, number];
}

/** Lice: okvir 200 × 200 */
const FACE_ZONES: Partial<Record<PartId, Zone>> = {
    hair: { d: () => "M30 84 Q22 18 100 16 Q178 18 170 84 Q150 58 100 54 Q50 58 30 84Z", at: [100, 34] },
    brows: { d: (m) => ellipse(70, 74, 20, 9, m) + ellipse(130, 74, 20, 9, m), at: [130, 74] },
    eyes: { d: (m) => ellipse(70, 98, 21, 15, m) + ellipse(130, 98, 21, 15, m), at: [130, 98] },
    ears: { d: (m) => ellipse(25, 114, 16, 22, m) + ellipse(175, 114, 16, 22, m), at: [175, 114] },
    nose: { d: (m) => ellipse(100, 126, 17, 16, m), at: [100, 126] },
    cheeks: { d: (m) => circle(50, 142, 16, m) + circle(150, 142, 16, m), at: [150, 142] },
    mouth: { d: (m) => ellipse(100, 160, 30, 15, m), at: [100, 160] },
};

/** Telo: okvir 200 × 300 */
const BODY_ZONES: Partial<Record<PartId, Zone>> = {
    head: { d: (m) => circle(100, 58, 42, m), at: [100, 52] },
    neck: { d: (m) => ellipse(100, 110, 22, 11, m), at: [100, 110] },
    shoulders: { d: (m) => circle(63, 124, 17, m) + circle(137, 124, 17, m), at: [137, 124] },
    arms: { d: () => "M56 110 L80 132 L56 178 L48 230 L14 228 L24 172Z M144 110 L120 132 L144 178 L152 230 L186 228 L176 172Z", at: [154, 172] },
    elbows: { d: (m) => circle(47, 170, 16, m) + circle(153, 170, 16, m), at: [153, 170] },
    hands: { d: (m) => circle(31, 216, 19, m) + circle(169, 216, 19, m), at: [169, 216] },
    belly: { d: (m) => ellipse(100, 166, 30, 26, m), at: [100, 166] },
    legs: { d: () => "M66 204 L134 204 L138 298 L62 298Z", at: [116, 250] },
    knees: { d: (m) => circle(87, 250, 16, m) + circle(113, 250, 16, m), at: [113, 250] },
    feet: { d: (m) => ellipse(83, 286, 21, 13, m) + ellipse(117, 286, 21, 13, m), at: [117, 286] },
};

/** Da li deo ima polje za dodir na datom crtežu (test proverava svaki deo iz nivoa) */
export function hasZone(figure: "face" | "body", part: string): boolean {
    return Boolean((figure === "face" ? FACE_ZONES : BODY_ZONES)[part as PartId]);
}

// ── Crtež lica ───────────────────────────────────────────────────────────────

function FaceArt({ hero }: { hero: "amar" | "lejla" }) {
    const look: Look = LOOK[hero];
    const girl = hero === "lejla";
    return (
        <g>
            {/* Vrat i ramena */}
            <path d="M84 168 L116 168 L118 196 L82 196Z" fill={look.skin} />
            <path d="M30 200 Q36 178 74 176 L126 176 Q164 178 170 200Z" fill={look.shirt} {...line(look.shirtEdge, 2)} />
            {girl && <path d="M38 64 Q20 120 30 172 Q42 186 58 176 Q48 130 52 80Z M162 64 Q180 120 170 172 Q158 186 142 176 Q152 130 148 80Z" fill={look.hair} />}
            {/* Uši */}
            <ellipse cx={30} cy={114} rx={12} ry={17} fill={look.skin} {...line(look.edge, 2)} />
            <ellipse cx={170} cy={114} rx={12} ry={17} fill={look.skin} {...line(look.edge, 2)} />
            <path d="M33 106 Q26 114 33 122 M167 106 Q174 114 167 122" fill="none" {...line(look.edge, 2)} />
            {/* Glava */}
            <ellipse cx={100} cy={110} rx={70} ry={72} fill={look.skin} {...line(look.edge, 2.2)} />
            {/* Kosa */}
            {girl ? (
                <path d="M30 98 Q26 28 100 26 Q174 28 170 98 Q160 64 130 56 Q118 70 96 66 Q76 62 70 54 Q40 66 30 98Z" fill={look.hair} />
            ) : (
                <g fill={look.hair}>
                    {[
                        [42, 70, 15],
                        [56, 50, 17],
                        [78, 38, 18],
                        [102, 34, 18],
                        [126, 38, 18],
                        [146, 50, 17],
                        [160, 70, 15],
                        [66, 60, 14],
                        [90, 52, 14],
                        [114, 52, 14],
                        [136, 60, 14],
                    ].map(([x, y, r], i) => (
                        <circle key={i} cx={x} cy={y} r={r} />
                    ))}
                </g>
            )}
            {/* Obrve, oči, obrazi, nos, usta */}
            <path d="M54 76 Q70 66 86 75 M114 75 Q130 66 146 76" fill="none" {...line(look.hair, 4.4)} />
            {[70, 130].map((x) => (
                <g key={x}>
                    <ellipse cx={x} cy={98} rx={13} ry={12} fill="#ffffff" {...line(look.edge, 1.6)} />
                    <circle cx={x} cy={99} r={7.5} fill="#5a3a26" />
                    <circle cx={x} cy={99} r={4} fill={INK} />
                    <circle cx={x - 2.6} cy={95.6} r={2.4} fill="#ffffff" />
                </g>
            ))}
            <circle cx={50} cy={142} r={11} fill="#f59a9a" opacity={0.45} />
            <circle cx={150} cy={142} r={11} fill="#f59a9a" opacity={0.45} />
            <path d="M100 112 Q92 130 98 134 Q104 136 108 132" fill="none" {...line(look.edge, 3)} />
            <path d="M76 152 Q100 176 124 152 Q100 160 76 152Z" fill="#b8434f" {...line("#8f2f3a", 2)} />
            <path d="M82 154 Q100 159 118 154 L117 158 Q100 162 83 158Z" fill="#ffffff" />
            <path d="M90 164 Q100 170 110 164 Q100 162 90 164Z" fill="#f08a96" />
        </g>
    );
}

// ── Crtež tela ───────────────────────────────────────────────────────────────

function BodyArt({ hero }: { hero: "amar" | "lejla" }) {
    const look: Look = LOOK[hero];
    const girl = hero === "lejla";
    const arm = (flip: boolean) => {
        const s = flip ? -1 : 1;
        const x = (v: number) => 100 + s * (v - 100);
        return (
            <g>
                <path d={`M${x(70)} 124 L${x(48)} 170 L${x(34)} 208`} fill="none" {...line(look.edge, 17)} />
                <path d={`M${x(70)} 124 L${x(48)} 170 L${x(34)} 208`} fill="none" {...line(look.skin, 13)} />
                <circle cx={x(31)} cy={216} r={12} fill={look.skin} {...line(look.edge, 1.8)} />
                <path d={`M${x(38)} 212 Q${x(44)} 206 ${x(42)} 200`} fill="none" {...line(look.skin, 6)} />
                <path d={`M${x(26)} 222 L${x(22)} 230 M${x(31)} 226 L${x(29)} 234 M${x(36)} 225 L${x(37)} 233`} fill="none" {...line(look.edge, 3)} />
                {/* Rukav */}
                <path d={`M${x(68)} 112 L${x(80)} 118 L${x(64)} 148 L${x(50)} 140Z`} fill={look.shirt} {...line(look.shirtEdge, 1.8)} />
            </g>
        );
    };
    const leg = (flip: boolean) => {
        const s = flip ? -1 : 1;
        const x = (v: number) => 100 + s * (v - 100);
        return (
            <g>
                <path d={`M${x(88)} 214 L${x(87)} 278`} fill="none" {...line(look.edge, 19)} />
                <path d={`M${x(88)} 214 L${x(87)} 278`} fill="none" {...line(look.skin, 15)} />
                <path d={`M${x(81)} 250 Q${x(87)} 254 ${x(93)} 250`} fill="none" {...line(look.edge, 1.8)} />
                <path d={`M${x(94)} 278 Q${x(96)} 294 ${x(84)} 294 L${x(70)} 294 Q${x(64)} 292 ${x(70)} 284 Q${x(76)} 278 ${x(80)} 276Z`} fill={look.skin} {...line(look.edge, 1.8)} />
                {[70, 75, 80, 85].map((v, i) => (
                    <circle key={i} cx={x(v)} cy={292} r={2} fill={look.skin} {...line(look.edge, 1)} />
                ))}
            </g>
        );
    };
    return (
        <g>
            <ellipse cx={100} cy={296} rx={44} ry={4} fill="#1f1b3a" opacity={0.08} />
            {girl && <path d="M62 50 Q50 100 60 132 Q72 138 80 128 Q72 96 76 60Z M138 50 Q150 100 140 132 Q128 138 120 128 Q128 96 124 60Z" fill={look.hair} />}
            {leg(false)}
            {leg(true)}
            {arm(false)}
            {arm(true)}
            {/* Vrat i majica */}
            <rect x={92} y={92} width={16} height={22} fill={look.skin} {...line(look.edge, 1.6)} />
            <path d="M68 114 Q70 106 90 106 L110 106 Q130 106 132 114 L134 200 L66 200Z" fill={look.shirt} {...line(look.shirtEdge, 2)} />
            <path d="M90 106 Q100 118 110 106" fill={look.skin} {...line(look.shirtEdge, 1.6)} />
            <path d="M100 150 l4 8 l9 1 l-7 6 l2 9 l-8 -5 l-8 5 l2 -9 l-7 -6 l9 -1z" fill="#ffffff" opacity={0.85} />
            {/* Šorc */}
            <path d="M66 196 L134 196 L136 230 L104 230 L100 214 L96 230 L64 230Z" fill={look.shorts} {...line(look.shortsEdge, 2)} />
            {/* Glava */}
            <ellipse cx={64} cy={58} rx={6} ry={9} fill={look.skin} {...line(look.edge, 1.6)} />
            <ellipse cx={136} cy={58} rx={6} ry={9} fill={look.skin} {...line(look.edge, 1.6)} />
            <circle cx={100} cy={56} r={36} fill={look.skin} {...line(look.edge, 2)} />
            {girl ? (
                <path d="M64 56 Q62 18 100 18 Q138 18 136 56 Q130 38 114 34 Q108 42 96 40 Q84 38 82 32 Q68 40 64 56Z" fill={look.hair} />
            ) : (
                <g fill={look.hair}>
                    {[
                        [70, 40, 9],
                        [80, 28, 10],
                        [94, 22, 10],
                        [108, 22, 10],
                        [122, 28, 10],
                        [131, 40, 9],
                        [86, 34, 8],
                        [114, 34, 8],
                    ].map(([x, y, r], i) => (
                        <circle key={i} cx={x} cy={y} r={r} />
                    ))}
                </g>
            )}
            <path d="M80 48 Q88 43 95 47 M105 47 Q112 43 120 48" fill="none" {...line(look.hair, 2.6)} />
            <circle cx={88} cy={57} r={4} fill={INK} />
            <circle cx={112} cy={57} r={4} fill={INK} />
            <circle cx={86.6} cy={55.4} r={1.4} fill="#ffffff" />
            <circle cx={110.6} cy={55.4} r={1.4} fill="#ffffff" />
            <circle cx={78} cy={68} r={5} fill="#f59a9a" opacity={0.45} />
            <circle cx={122} cy={68} r={5} fill="#f59a9a" opacity={0.45} />
            <path d="M100 60 Q97 68 101 70" fill="none" {...line(look.edge, 2)} />
            <path d="M90 74 Q100 82 110 74" fill="none" {...line(INK, 2.2)} />
        </g>
    );
}

// ── Crtež sa poljima ──────────────────────────────────────────────────────────

const HIGHLIGHT = {
    glow: { fill: "rgb(108 97 240 / 0.22)", stroke: "#6c61f0" },
    correct: { fill: "rgb(16 185 129 / 0.28)", stroke: "#059669" },
    wrong: { fill: "rgb(255 205 77 / 0.35)", stroke: "#d97f06" },
} as const;

/** Krupni delovi se crtaju prvi: gde se polja preklapaju, dodir pripada sitnijem delu (šaka, a ne ruka) */
const BIG_FIRST: readonly string[] = ["hair", "head", "arms", "legs", "belly"];
/** Najmanji poluprečnik polja na ekranu (px): prst deteta ga lako pogodi */
const MIN_TOUCH_PX = 24;

/** Visina crteža na ekranu (px), da polja na malom crtežu porastu */
function useRenderedHeight() {
    const ref = useRef<HTMLDivElement | null>(null);
    const [height, setHeight] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(() => setHeight(el.getBoundingClientRect().height));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return [ref, height] as const;
}

export function BodyFigure({ view, glow, demo, calm, disabled, onPart }: PointFigureProps) {
    const [boxRef, rendered] = useRenderedHeight();
    const face = view.figure === "face";
    const zones = face ? FACE_ZONES : BODY_ZONES;
    const solved = view.feedback === "correct";
    const wrongPart = view.feedback === "wrong" ? view.selected : null;
    const [w, h] = face ? [200, 200] : [200, 300];
    const demoZone = demo ? zones[demo as PartId] : undefined;
    // Poluprečnik polja u jedinicama crteža koji na ekranu daje bar MIN_TOUCH_PX (najviše 34 jedinice)
    const minRadius = rendered > 0 ? Math.min(34, (MIN_TOUCH_PX * h) / rendered) : 0;
    const parts = [...view.parts].sort((x, y) => Number(BIG_FIRST.includes(y)) - Number(BIG_FIRST.includes(x)));

    const stateOf = (id: string): keyof typeof HIGHLIGHT | null => {
        if (solved && id === view.answer) return "correct";
        if (wrongPart === id) return "wrong";
        if (glow === id) return "glow";
        return null;
    };

    const onKey = (event: KeyboardEvent, id: string) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPart(id);
        }
    };

    return (
        <div ref={boxRef} className="relative" style={{ width: face ? "min(100cqw, 100cqh)" : "min(100cqw, calc(100cqh * 2 / 3))", aspectRatio: `${w} / ${h}` }}>
            <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" role="group" aria-label={face ? "Lice" : "Telo"}>
                {face ? <FaceArt hero={view.hero} /> : <BodyArt hero={view.hero} />}
                {parts.map((id) => {
                    const zone = zones[id as PartId];
                    if (!zone) return null;
                    const state = stateOf(id);
                    const style = state ? HIGHLIGHT[state] : null;
                    const name = PARTS[id as PartId]?.name ?? id;
                    return (
                        <path
                            key={id}
                            d={zone.d(minRadius)}
                            data-action={`part:${id}`}
                            role="button"
                            tabIndex={disabled ? -1 : 0}
                            aria-label={name}
                            onClick={disabled ? undefined : () => onPart(id)}
                            onKeyDown={disabled ? undefined : (event) => onKey(event, id)}
                            fill={style ? style.fill : "transparent"}
                            stroke={style ? style.stroke : "transparent"}
                            strokeWidth={3}
                            strokeDasharray={state === "glow" ? "8 6" : undefined}
                            className={cn("outline-none focus-visible:stroke-brand-500", disabled ? "pointer-events-none" : "cursor-pointer", state === "glow" && !calm && "animate-pulse")}
                        />
                    );
                })}
            </svg>
            {demoZone && (
                // Vrh kažiprsta ruke je u sredini dela (ruka stoji u donjem desnom uglu okvira 64 × 64)
                <span className="pointer-events-none absolute h-16 w-16" style={{ left: `${(demoZone.at[0] / w) * 100}%`, top: `${(demoZone.at[1] / h) * 100}%`, transform: "translate(-28px, -30px)" }}>
                    <DemoHand />
                </span>
            )}
        </div>
    );
}

// ── Sitne slike (štitnici) ────────────────────────────────────────────────────

const ITEMS: Record<string, () => ReactNode> = {
    earmuffs: () => (
        <g>
            <path d="M24 60 Q22 14 50 14 Q78 14 76 60" fill="none" {...line("#5a6378", 6)} />
            <circle cx={24} cy={64} r={16} fill="#e86a8a" {...line("#b94868", 2)} />
            <circle cx={76} cy={64} r={16} fill="#e86a8a" {...line("#b94868", 2)} />
            <circle cx={24} cy={64} r={8} fill="#f7b6cf" />
            <circle cx={76} cy={64} r={8} fill="#f7b6cf" />
        </g>
    ),
    kneePads: () => (
        <g>
            <ellipse cx={50} cy={92} rx={30} ry={4} fill="#1f1b3a" opacity={0.08} />
            <path d="M24 20 Q50 8 76 20 L72 80 Q50 90 28 80Z" fill="#3a7be8" {...line("#1f4fa8", 2)} />
            <path d="M32 34 Q50 26 68 34 Q72 56 50 64 Q28 56 32 34Z" fill="#2d3a5c" />
            <path d="M24 44 L76 44 M26 66 L74 66" {...line("#1f4fa8", 3)} />
        </g>
    ),
};

export function bodyDrawing(pic: string): ReactNode {
    if (pic.startsWith("p:") || pic.startsWith("a:")) return basePic(pic, 4, 4, 92);
    return ITEMS[pic]?.() ?? null;
}

export function BodyPic({ pic, className }: { pic: string; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {bodyDrawing(pic)}
        </svg>
    );
}
