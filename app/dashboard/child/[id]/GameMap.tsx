// app/dashboard/child/[id]/GameMap.tsx
"use client";

// „Mapa” igara: vijugav put kroz mirni nacrtani svet (brda, reka sa mostom, drveće, selo na
// početku i zamak na kraju). Svaka stanica je jedna igra, redom kojim se preporučuje; drugar
// stoji na stanici na kojoj je dete sada. Dodir na stanicu otvara uvod igre (isto kao kartica).
// Uz mapu je i prekidač „Mapa / Kartice” (pamti se na ovom uređaju).

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { Check, LayoutGrid, Lock, Map as MapIcon } from "lucide-react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useCalmMotion } from "@/app/components/avatar/motion";
import CompanionPicture from "@/app/components/avatar3d/CompanionPicture";
import { cn } from "@/lib/cn";
import { MAX_LEVEL, type GameDefinition, type GameId } from "@/lib/games";
import { chosenSkin, useCompanion } from "./companionState";
import {
    PICKER_VIEW_KEY,
    currentStop,
    curvesPath,
    defaultPickerView,
    mapLayout,
    parsePickerView,
    stopStars,
    type MapLayout,
    type PickerView,
} from "./gameMapLayout";
import { TogetherGamePicker, TogetherStartButton, useTogether } from "./playTogether";

type PlanStatus = "done" | "now" | "later";

export interface GameMapProps {
    /** Igre redom kojim se preporučuju */
    games: GameDefinition[];
    /** Sledeći otključani nivo igre (1–16) */
    unlockedFor: (id: GameId) => number;
    /** Mesto igre u dnevnom planu; bez plana undefined */
    statusFor?: (id: GameId) => PlanStatus | undefined;
    /** Napredak se još učitava: stanice izgledaju uobičajeno, samo se još ne otvaraju */
    pending?: boolean;
    /** Napredak nije učitan: igre se ne otvaraju dok se ne pokuša ponovo */
    unavailable?: boolean;
    onOpen: (id: GameId) => void;
}

// ── Izbor prikaza (ovaj uređaj) ────────────────────────────────────────────────

const viewListeners = new Set<() => void>();

function readStoredView(): PickerView | null {
    try {
        return parsePickerView(window.localStorage.getItem(PICKER_VIEW_KEY));
    } catch {
        return null;
    }
}

function storeView(view: PickerView) {
    try {
        window.localStorage.setItem(PICKER_VIEW_KEY, view);
    } catch {
        /* privatni prozor ili blokirano skladište: izbor važi do zatvaranja stranice */
    }
    memoryView = view;
    viewListeners.forEach((fn) => fn());
}

/** Kad skladište ne radi, izbor se pamti bar dok je stranica otvorena */
let memoryView: PickerView | null = null;

function subscribeView(fn: () => void) {
    viewListeners.add(fn);
    window.addEventListener("storage", fn);
    return () => {
        viewListeners.delete(fn);
        window.removeEventListener("storage", fn);
    };
}

/** Mapa ili kartice: izbor sa ovog uređaja, inače prema uzrastu (do 7 godina mapa) */
export function usePickerView(ageYears: number | null | undefined): [PickerView, (view: PickerView) => void] {
    const stored = useSyncExternalStore(subscribeView, () => readStoredView() ?? memoryView, () => null);
    return [stored ?? defaultPickerView(ageYears), storeView];
}

// ── Izbor igre: prekidač + mapa ili kartice ──────────────────────────────────────

interface GamePickerProps extends GameMapProps {
    ageYears?: number | null;
    /** Dosadašnja mreža kartica */
    grid: ReactNode;
    /** Dnevni plan traje: igra sa drugom se ne nudi (plan ima svoj red) */
    planActive?: boolean;
}

export function GamePicker({ ageYears, grid, planActive = false, ...map }: GamePickerProps) {
    const [view, setView] = usePickerView(ageYears);
    const together = useTogether();
    const togetherOn = Boolean(together?.friend);

    return (
        <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {!togetherOn && <ViewToggle view={view} onChange={setView} />}
                {!planActive && <TogetherStartButton />}
            </div>
            {togetherOn ? (
                <TogetherGamePicker games={map.games} unlockedFor={map.unlockedFor} pending={map.pending} unavailable={map.unavailable} onOpen={map.onOpen} />
            ) : view === "map" ? (
                <GameMap {...map} />
            ) : (
                grid
            )}
        </div>
    );
}

function ViewToggle({ view, onChange }: { view: PickerView; onChange: (view: PickerView) => void }) {
    const options: { id: PickerView; label: string; Icon: typeof MapIcon }[] = [
        { id: "map", label: "Mapa", Icon: MapIcon },
        { id: "grid", label: "Kartice", Icon: LayoutGrid },
    ];
    return (
        <div className="inline-flex rounded-2xl border border-line bg-surface p-1 shadow-soft" role="group" aria-label="Prikaz igara">
            {options.map(({ id, label, Icon }) => (
                <button
                    key={id}
                    type="button"
                    aria-pressed={view === id}
                    onClick={() => onChange(id)}
                    className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-base font-extrabold transition-colors",
                        view === id ? "bg-brand-600 text-white shadow-soft" : "text-ink-soft hover:bg-brand-50 hover:text-ink"
                    )}
                >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {label}
                </button>
            ))}
        </div>
    );
}

// ── Mapa ──────────────────────────────────────────────────────────────────────

/** Širina okvira (px); 0 dok se ne izmeri */
function useWidth(ref: React.RefObject<HTMLElement | null>): number {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setWidth(Math.round(el.getBoundingClientRect().width));
        if (typeof ResizeObserver === "undefined") {
            queueMicrotask(measure);
            return;
        }
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return width;
}

export default function GameMap({ games, unlockedFor, statusFor, pending = false, unavailable = false, onOpen }: GameMapProps) {
    const boxRef = useRef<HTMLDivElement>(null);
    const width = useWidth(boxRef);
    const calm = useCalmMotion();
    const settings = useChildSettings();
    const companion = useCompanion();

    // posle spajanja: sortGamesForChild / availableGames — redosled i dostupnost stižu iz lib/games.ts;
    // do tada redosled je GAMES, a zaključana je samo igra koja u dnevnom planu još nije na redu
    const stops = useMemo(
        () =>
            games.map((game) => {
                const status = statusFor?.(game.id);
                const done = Math.min(Math.max(unlockedFor(game.id) - 1, 0), MAX_LEVEL);
                return { game, status, done, locked: status === "later" || unavailable };
            }),
        [games, statusFor, unlockedFor, unavailable]
    );
    const planNow = stops.findIndex((s) => s.status === "now");
    const current = pending ? -1 : planNow >= 0 ? planNow : currentStop(stops);
    const layout = useMemo(() => (width > 0 ? mapLayout(stops.length, width) : null), [stops.length, width]);

    return (
        <section aria-label="Mapa igara" className="overflow-hidden rounded-card border border-line bg-[#E9F5E1] shadow-soft">
            <div ref={boxRef} className="relative w-full" style={{ height: layout?.height ?? 900 }}>
                {layout && (
                    <>
                        <MapWorld layout={layout} current={current} calm={calm} />
                        <ol className="absolute inset-0">
                            {stops.map((stop, index) => (
                                <MapStop
                                    key={stop.game.id}
                                    index={index}
                                    layout={layout}
                                    game={stop.game}
                                    done={stop.done}
                                    status={stop.status}
                                    locked={stop.locked}
                                    current={index === current}
                                    disabled={stop.locked || pending}
                                    busy={pending}
                                    priority={index < 3}
                                    onOpen={() => onOpen(stop.game.id)}
                                />
                            ))}
                        </ol>
                        {/* Drugar stoji na stanici na kojoj je dete sada */}
                        {current >= 0 && settings.avatar && companion && (
                            <MapCompanion layout={layout} at={current} kind={companion.kind} skin={chosenSkin(companion)} wear={companion.wear} calm={calm} />
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

// ── Stanica ───────────────────────────────────────────────────────────────────

interface MapStopProps {
    index: number;
    layout: MapLayout;
    game: GameDefinition;
    done: number;
    status?: PlanStatus;
    locked: boolean;
    current: boolean;
    disabled: boolean;
    busy: boolean;
    priority: boolean;
    onOpen: () => void;
}

function MapStop({ index, layout, game, done, status, locked, current, disabled, busy, priority, onOpen }: MapStopProps) {
    const p = layout.nodes[index];
    const size = layout.nodeSize;
    const stars = stopStars(done);
    const ring = size / 2 - 3;
    const circumference = 2 * Math.PI * ring;
    const labelWidth = layout.lanes === 1 ? 150 : 168;
    const label = `${index + 1}. ${game.title}${locked ? ", zaključano" : ""}${current ? ", sada" : ""}. ${done} od ${MAX_LEVEL} nivoa.`;

    return (
        <li className="absolute" style={{ left: p.x - labelWidth / 2, top: p.y - size / 2, width: labelWidth }}>
            <button
                type="button"
                onClick={onOpen}
                disabled={disabled}
                aria-label={label}
                aria-current={current ? "step" : undefined}
                className={cn(
                    "group flex w-full flex-col items-center gap-1.5 rounded-3xl outline-offset-4",
                    locked ? "cursor-not-allowed" : busy ? "cursor-progress" : ""
                )}
            >
                <span
                    className={cn(
                        "relative block rounded-full bg-white p-1.5 shadow-lift transition-transform",
                        !disabled && "group-hover:-translate-y-0.5 group-active:translate-y-0.5",
                        current && "ring-4 ring-sun-300 ring-offset-2 ring-offset-[#E9F5E1]"
                    )}
                    style={{ width: size, height: size }}
                >
                    {/* Napredak kroz 15 nivoa: luk oko slike */}
                    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                        <circle cx={size / 2} cy={size / 2} r={ring} fill="none" stroke="#EEEAF9" strokeWidth="5" />
                        {done > 0 && (
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={ring}
                                fill="none"
                                stroke={done >= MAX_LEVEL ? "#F5B400" : "#22A06B"}
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeDasharray={`${(circumference * done) / MAX_LEVEL} ${circumference}`}
                            />
                        )}
                    </svg>
                    <span className={cn("relative block h-full w-full overflow-hidden rounded-full bg-brand-50", locked && "opacity-55 grayscale")}>
                        <Image src={game.image} alt="" fill priority={priority} sizes={`${size}px`} className="object-cover" />
                    </span>
                    {/* Redni broj stanice */}
                    <span className="absolute -left-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-extrabold text-ink shadow-soft ring-2 ring-[#E9F5E1]" aria-hidden="true">
                        {index + 1}
                    </span>
                    {locked && (
                        <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
                            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink/75 text-white shadow-soft">
                                <Lock className="h-6 w-6" />
                            </span>
                        </span>
                    )}
                    {status === "done" && (
                        <span className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-emerald-700 text-white shadow-soft" aria-hidden="true">
                            <Check className="h-5 w-5" />
                        </span>
                    )}
                </span>
                <span className="flex max-w-full flex-col items-center rounded-2xl bg-white/92 px-3 py-1.5 text-center shadow-soft">
                    <span className="line-clamp-2 font-display text-[0.95rem] font-extrabold leading-tight text-ink sm:text-base">{game.title}</span>
                    <span className="mt-0.5 flex gap-0.5 text-sm leading-none" aria-hidden="true">
                        {[1, 2, 3].map((s) => (
                            <span key={s} className={s <= stars ? "" : "opacity-25 grayscale"}>
                                ⭐
                            </span>
                        ))}
                    </span>
                </span>
            </button>
        </li>
    );
}

// ── Drugar na mapi ────────────────────────────────────────────────────────────

function MapCompanion({ layout, at, kind, skin, wear, calm }: { layout: MapLayout; at: number; kind: string; skin?: string; wear?: Record<string, string>; calm: boolean }) {
    const p = layout.nodes[at];
    if (!p) return null;
    const w = layout.lanes === 1 ? 78 : 104;
    const h = Math.round(w * 1.4);
    // Drugar stoji pored stanice, sa strane na kojoj ima više mesta
    const right = p.x < layout.width / 2;
    const gap = layout.nodeSize / 2 + (layout.lanes === 1 ? 36 : 44);
    const x = right ? p.x + gap : p.x - gap - w;
    const y = p.y + layout.nodeSize / 2 - h + 6;
    return (
        <div className="pointer-events-none absolute" style={{ left: Math.min(Math.max(x, 4), layout.width - w - 4), top: y, width: w, height: h }} aria-hidden="true">
            <span className="absolute inset-x-2 bottom-0 h-3 rounded-[50%] bg-ink/15 blur-[1px]" />
            <div className={cn("absolute inset-0", !calm && "animate-float")}>
                <CompanionPicture kind={kind} skin={skin} wear={wear} variant="full" eager className="h-full w-full" />
            </div>
        </div>
    );
}

// ── Nacrtani svet ─────────────────────────────────────────────────────────────

const GREENS = ["#BFE3AE", "#CDEABD", "#B3DCA0"];
const TREE_TONES = ["#7DBE7E", "#8FCB86", "#6DB27A"];
const TREE_LIGHT = ["#A3D6A0", "#B2DEA5", "#93CB98"];

function MapWorld({ layout, current, calm }: { layout: MapLayout; current: number; calm: boolean }) {
    const { width, height, curves, nodeCurve, river, trees, hills, start, end } = layout;
    const road = curvesPath(curves);
    // Pređeni deo puta (do stanice na kojoj je drugar) je zlatan; deo do nje blago „teče”
    const reached = current > 0 ? nodeCurve[current] : 0;
    const donePath = reached > 0 ? curvesPath(curves, 0, reached) : "";
    const lead = current >= 0 && current > 0 ? curvesPath(curves, nodeCurve[current - 1], nodeCurve[current]) : current === 0 ? curvesPath(curves, 0, nodeCurve[0]) : "";

    return (
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <linearGradient id="bm-map-ground" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#EEF8E8" />
                    <stop offset="1" stopColor="#E2F1D8" />
                </linearGradient>
                <style>{"@keyframes bm-map-dash{to{stroke-dashoffset:-36}}.bm-map-lead{animation:bm-map-dash 1.8s linear infinite}"}</style>
            </defs>
            <rect width={width} height={height} fill="url(#bm-map-ground)" />

            {/* Brda uz ivice */}
            {hills.map((h, i) => (
                <ellipse key={`h${i}`} cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} fill={GREENS[h.tone]} opacity="0.8" />
            ))}

            {/* Reka i most */}
            {river && <River width={width} y={river.y} />}

            {/* Drveće */}
            {trees.map((t, i) => (
                <g key={`t${i}`} transform={`translate(${t.x} ${t.y})`}>
                    <ellipse cx="0" cy={t.r + 6} rx={t.r * 0.8} ry="3.5" fill="#000" opacity="0.07" />
                    <rect x="-3" y={t.r * 0.4} width="6" height={t.r * 0.8} rx="2" fill="#B08968" />
                    <circle r={t.r} fill={TREE_TONES[t.tone]} />
                    <circle cx={-t.r * 0.3} cy={-t.r * 0.3} r={t.r * 0.45} fill={TREE_LIGHT[t.tone]} />
                </g>
            ))}

            {/* Put: ivica, staza, isprekidana sredina */}
            <path d={road} fill="none" stroke="#D9C49A" strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
            <path d={road} fill="none" stroke="#F4E6C6" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
            {donePath && <path d={donePath} fill="none" stroke="#FFD66B" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />}
            <path d={road} fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 16" opacity="0.9" />
            {/* Deo puta do stanice na kojoj je dete: tačkice polako teku (bez toga kad je „Manje animacija”) */}
            {lead && !calm && <path d={lead} className="bm-map-lead" fill="none" stroke="#F5A524" strokeWidth="5" strokeLinecap="round" strokeDasharray="0.5 17.5" />}

            {river && <Bridge x={river.cross.x} y={river.cross.y} angle={river.angle} />}

            <Village x={start.x} y={start.y} />
            <Castle x={end.x} y={end.y} />
        </svg>
    );
}

function River({ width, y }: { width: number; y: number }) {
    // Mirna talasasta reka preko cele širine
    const wave = (offset: number) => {
        let d = `M-20 ${y + offset}`;
        for (let x = -20; x < width + 40; x += 80) d += ` q20 -9 40 0 t40 0`;
        return d;
    };
    return (
        <g>
            <path d={wave(0)} fill="none" stroke="#A9D8F0" strokeWidth="44" strokeLinecap="round" />
            <path d={wave(0)} fill="none" stroke="#C4E6F7" strokeWidth="34" strokeLinecap="round" />
            <path d={wave(-6)} fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" strokeDasharray="18 46" />
            <path d={wave(7)} fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.45" strokeDasharray="12 58" strokeDashoffset="20" />
        </g>
    );
}

function Bridge({ x, y, angle }: { x: number; y: number; angle: number }) {
    // Most je položen duž puta (put ide preko reke)
    return (
        <g transform={`translate(${x} ${y}) rotate(${angle})`}>
            <rect x="-40" y="-20" width="80" height="40" rx="8" fill="#C99A6B" />
            {[-28, -16, -4, 8, 20].map((px) => (
                <rect key={px} x={px} y="-18" width="8" height="36" rx="2" fill="#DDB384" />
            ))}
            <rect x="-42" y="-24" width="84" height="6" rx="3" fill="#9C6B43" />
            <rect x="-42" y="18" width="84" height="6" rx="3" fill="#9C6B43" />
        </g>
    );
}

function House({ x, y, roof, scale = 1 }: { x: number; y: number; roof: string; scale?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${scale})`}>
            <ellipse cx="0" cy="22" rx="30" ry="5" fill="#000" opacity="0.07" />
            <rect x="-22" y="-6" width="44" height="28" rx="3" fill="#FFF4E0" stroke="#EAD7B7" strokeWidth="1.5" />
            <path d="M-28 -4 L0 -28 L28 -4 Z" fill={roof} />
            <rect x="-6" y="6" width="12" height="16" rx="2" fill="#B08968" />
            <rect x="-17" y="2" width="8" height="8" rx="1.5" fill="#BFE3F5" />
            <rect x="9" y="2" width="8" height="8" rx="1.5" fill="#BFE3F5" />
        </g>
    );
}

function Village({ x, y }: { x: number; y: number }) {
    return (
        <g>
            <House x={x - 64} y={y + 4} roof="#E98B6D" scale={0.9} />
            <House x={x + 2} y={y - 10} roof="#8FA7E6" />
            <House x={x + 66} y={y + 8} roof="#F2B45C" scale={0.85} />
            {/* Zastavica: početak puta */}
            <g transform={`translate(${x + 30} ${y + 34})`}>
                <rect x="-1.5" y="-26" width="3" height="30" rx="1.5" fill="#8C6A4F" />
                <path d="M1.5 -26 L22 -20 L1.5 -13 Z" fill="#22A06B" />
            </g>
        </g>
    );
}

function Castle({ x, y }: { x: number; y: number }) {
    return (
        <g transform={`translate(${x} ${y - 20})`}>
            <ellipse cx="0" cy="62" rx="86" ry="10" fill="#000" opacity="0.07" />
            {/* Zidine */}
            <rect x="-58" y="0" width="116" height="62" rx="4" fill="#EDE9FA" stroke="#D7D0F2" strokeWidth="2" />
            {[-52, -30, -8, 14, 36].map((cx) => (
                <rect key={cx} x={cx} y="-10" width="14" height="12" rx="2" fill="#EDE9FA" stroke="#D7D0F2" strokeWidth="2" />
            ))}
            {/* Kule */}
            {[-66, 46].map((tx) => (
                <g key={tx}>
                    <rect x={tx} y="-22" width="20" height="84" rx="3" fill="#E4DEF8" stroke="#D0C8F0" strokeWidth="2" />
                    <path d={`M${tx - 4} -22 L${tx + 10} -52 L${tx + 24} -22 Z`} fill="#8A82F7" />
                    <rect x={tx + 7} y="-6" width="6" height="10" rx="3" fill="#BFE3F5" />
                </g>
            ))}
            <rect x="-14" y="-40" width="28" height="44" rx="3" fill="#E4DEF8" stroke="#D0C8F0" strokeWidth="2" />
            <path d="M-19 -40 L0 -74 L19 -40 Z" fill="#6C61F0" />
            <rect x="-1.5" y="-96" width="3" height="24" fill="#8C6A4F" />
            <path d="M1.5 -96 L22 -90 L1.5 -83 Z" fill="#FFB920" />
            {/* Kapija */}
            <path d="M-14 62 L-14 36 Q0 20 14 36 L14 62 Z" fill="#B08968" />
            <rect x="-6" y="-26" width="12" height="12" rx="6" fill="#BFE3F5" />
        </g>
    );
}
