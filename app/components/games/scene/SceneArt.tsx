// Crtež jedne situacije iz opisa (SceneSpec). Slika je ukras uz tekst i glas, pa je skrivena
// od čitača ekrana (aria-hidden): sve što slika kaže piše i u zadatku.

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Background, BackgroundOverlay } from "./backgrounds";
import { cameraFor, cameraTransform } from "./camera";
import { eyesPoint, Figure, gazeToward, heldPoint, isAdult, type GazeDir } from "./figures";
import { Prop } from "./props";
import { isBubble, isFigure, isInset, VIEW_H, VIEW_W, type BubbleItem, type FigureItem, type HeroLook, type PropItem, type SceneItem, type SceneSpec } from "./types";

/** Podrazumevano mesto stopala: malo iznad donje ivice, da se vidi pod */
const GROUND_Y = 148;

function PropNode({ item }: { item: PropItem }) {
    const transforms = [`translate(${item.x} ${item.y})`];
    if (item.rot) transforms.push(`rotate(${item.rot})`);
    if (item.s && item.s !== 1) transforms.push(`scale(${item.s})`);
    if (item.flip) transforms.push("scale(-1 1)");
    return (
        <g transform={transforms.join(" ")}>
            <Prop id={item.prop} tone={item.tone} />
        </g>
    );
}

/** Ko je stvarno nacrtan na mestu lika (glavni lik dobija izgled od igre) */
function figureId(item: FigureItem, hero?: HeroLook) {
    return item.fig === "hero" ? (hero?.look ?? "meGirl") : item.fig;
}

/** Pogled lika u njegovim koordinatama: tačka sa slike se prenosi u razmeru i smer lika */
function figureGaze(item: FigureItem, hero?: HeroLook): GazeDir | undefined {
    if (!item.gaze) return undefined;
    const s = item.s ?? 1;
    const tx = ((item.gaze.x - item.x) / s) * (item.flip ? -1 : 1);
    const ty = (item.gaze.y - (item.y ?? GROUND_Y)) / s;
    return gazeToward(figureId(item, hero), item.pose ?? "stand", tx, ty, item.gaze.head ?? 1);
}

function FigureNode({ item, hero }: { item: FigureItem; hero?: HeroLook }) {
    const isHero = item.fig === "hero";
    const id = figureId(item, hero);
    const face = (isHero ? hero?.face : undefined) ?? item.face ?? "calm";
    const back = (isHero ? hero?.back : undefined) ?? item.back ?? false;
    const pose = item.pose ?? "stand";
    const adult = isAdult(id);
    let held: ReactNode = null;
    if (item.hold) {
        const [hx, hy] = heldPoint(adult, pose, item.hold.hand ?? (pose === "hold" || pose === "sitHold" ? "both" : "r"));
        // Predmet „visi” iz šake: sredina donje ivice predmeta je malo ispod šake
        const parts = [`translate(${hx} ${hy + 5 + (item.hold.dy ?? 0)})`];
        if (item.hold.rot) parts.push(`rotate(${item.hold.rot})`);
        parts.push(`scale(${item.hold.s ?? 0.8})`);
        held = (
            <g transform={parts.join(" ")}>
                <Prop id={item.hold.prop} tone={item.hold.tone} />
            </g>
        );
    }
    const transforms = [`translate(${item.x} ${item.y ?? GROUND_Y})`];
    if (item.rot) transforms.push(`rotate(${item.rot})`);
    if (item.s && item.s !== 1) transforms.push(`scale(${item.s})`);
    if (item.flip) transforms.push("scale(-1 1)");
    return (
        <g transform={transforms.join(" ")}>
            <ellipse cx={0} cy={0} rx={adult ? 15 : 12} ry={2.6} fill="#000" opacity={pose === "swim" || pose === "lie" ? 0 : 0.08} />
            <Figure id={id} pose={pose} face={face} back={back} wear={item.wear} held={held} gaze={figureGaze(item, hero)} />
        </g>
    );
}

/** Razmak između tačkica pogleda i koliko prazno ostaje kod očiju */
const GAZE_DOT_STEP = 8;
const GAZE_GAP = 9;

/**
 * Pomoć „prati pogled”: tačkice od očiju lika do mesta u koje gleda i blag krug oko tog mesta.
 * Crta se preko cele slike, da je ništa ne zakloni.
 */
function GazeLine({ item, hero }: { item: FigureItem; hero?: HeroLook }) {
    const gaze = item.gaze;
    const dir = figureGaze(item, hero);
    if (!gaze || !dir || (item.back ?? false) || (item.fig === "hero" && hero?.back)) return null;
    const s = item.s ?? 1;
    const [ex, ey] = eyesPoint(figureId(item, hero), item.pose ?? "stand", dir);
    const x0 = item.x + ex * s * (item.flip ? -1 : 1);
    const y0 = (item.y ?? GROUND_Y) + ey * s;
    const length = Math.hypot(gaze.x - x0, gaze.y - y0);
    const ring = gaze.ring ?? 0;
    const end = length - Math.max(ring, 4);
    const dots: [number, number][] = [];
    for (let d = GAZE_GAP; d <= end; d += GAZE_DOT_STEP) dots.push([x0 + ((gaze.x - x0) * d) / length, y0 + ((gaze.y - y0) * d) / length]);
    return (
        <g>
            {ring > 0 && <circle cx={gaze.x} cy={gaze.y} r={ring} fill="#fff3b0" fillOpacity={0.16} stroke="#e8930c" strokeWidth={2.4} strokeDasharray="6 4" />}
            <g fill="#f5a524" stroke="#9a5a06" strokeWidth={0.9}>
                {dots.map(([x, y], i) => (
                    <circle key={i} cx={x} cy={y} r={2.7} />
                ))}
            </g>
        </g>
    );
}

function BubbleNode({ item }: { item: BubbleItem }) {
    const loud = item.bubble === "loud";
    return (
        <g transform={`translate(${item.x} ${item.y})${item.flip ? " scale(-1 1)" : ""}`}>
            {loud ? (
                <path
                    d="M-22 -12 L-16 -20 L-8 -16 L0 -24 L8 -16 L16 -20 L20 -12 L26 -6 L20 0 L22 8 L12 6 L4 12 L-2 6 L-12 14 L-12 4 L-24 4 L-18 -4Z"
                    fill="#fff4f2"
                    stroke="#e8605a"
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                />
            ) : (
                <>
                    <path d="M-10 8 L-16 18 L-2 9" fill="#ffffff" stroke="#8a82f7" strokeWidth={1.8} strokeLinejoin="round" />
                    <rect x={-22} y={-12} width={44} height={22} rx={11} fill="#ffffff" stroke="#8a82f7" strokeWidth={1.8} />
                    <path d="M-10 9.2 L-3 9.2" stroke="#ffffff" strokeWidth={2.4} />
                </>
            )}
            <g fill={loud ? "#e8605a" : "#6c61f0"}>
                <circle cx={-9} cy={-1} r={2.6} />
                <circle cx={0} cy={-1} r={2.6} />
                <circle cx={9} cy={-1} r={2.6} />
            </g>
        </g>
    );
}

function Items({ items, hero, idPrefix }: { items: readonly SceneItem[]; hero?: HeroLook; idPrefix: string }) {
    return (
        <>
            {items.map((item, i) => {
                const key = `${idPrefix}-${i}`;
                if (isFigure(item)) return <FigureNode key={key} item={item} hero={hero} />;
                if (isBubble(item)) return <BubbleNode key={key} item={item} />;
                if (isInset(item)) {
                    const clip = `${idPrefix}-clip-${i}`;
                    const k = (item.r * 2) / VIEW_H;
                    return (
                        <g key={key}>
                            {item.from && (
                                <g fill="#ffffff" stroke="#aca7fd" strokeWidth={1.2}>
                                    <circle cx={item.from[0]} cy={item.from[1]} r={2.2} />
                                    <circle cx={(item.from[0] * 2 + item.x) / 3} cy={(item.from[1] * 2 + item.y) / 3 + 3} r={3.2} />
                                </g>
                            )}
                            <clipPath id={clip}>
                                <circle cx={item.x} cy={item.y} r={item.r} />
                            </clipPath>
                            <circle cx={item.x} cy={item.y} r={item.r + 2.5} fill="#ffffff" stroke="#aca7fd" strokeWidth={2} />
                            <g clipPath={`url(#${clip})`}>
                                <g transform={`translate(${item.x - (VIEW_W / 2) * k} ${item.y - item.r}) scale(${k})`}>
                                    <Background id={item.inset.bg} view={item.inset.view} />
                                    <BackgroundOverlay id={item.inset.bg} view={item.inset.view} />
                                    <Items items={item.inset.items} hero={hero} idPrefix={`${key}-in`} />
                                </g>
                            </g>
                        </g>
                    );
                }
                return <PropNode key={key} item={item} />;
            })}
        </>
    );
}

interface SceneArtProps {
    spec: SceneSpec;
    /** Glavni lik zadatka (izgled, izraz lica, leđima) */
    hero?: HeroLook;
    className?: string;
}

export function SceneArt({ spec, hero, className }: SceneArtProps) {
    const uid = useId().replace(/:/g, "");
    return (
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={cn("block", className)} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
            <clipPath id={`${uid}-frame`}>
                <rect width={VIEW_W} height={VIEW_H} rx={10} />
            </clipPath>
            <g clipPath={`url(#${uid}-frame)`}>
                {/* Kamera se približava delu slike u kome se nešto dešava, da lica budu krupna */}
                <g transform={cameraTransform(cameraFor(spec))}>
                    <Background id={spec.bg} view={spec.view} />
                    {/* Mrak pada na sobu, a likovi ostaju svetli: lice mora da se vidi */}
                    <BackgroundOverlay id={spec.bg} view={spec.view} />
                    <Items items={spec.items} hero={hero} idPrefix={uid} />
                    {spec.items.map((item, i) => (isFigure(item) && item.gaze?.line ? <GazeLine key={`${uid}-gaze-${i}`} item={item} hero={hero} /> : null))}
                </g>
            </g>
        </svg>
    );
}
