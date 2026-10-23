"use client";

// „Garderoba” 3D drugara (prototip): veliki 3D prikaz gore, kartice po mestima ispod,
// sličice predmeta (prave 3D sličice, crtaju se van ekrana) i boje izabranog predmeta.
// Dodir na sličicu oblači predmet; dugačko (haljina, abaja) skida gornji i donji deo.
// Bez zvuka. Na širokom ekranu (tablet položeno) prikaz je levo, garderoba desno.

import { Backpack, Cat, Crown, Footprints, Glasses, RotateCcw, Scissors, Shirt, Sparkles, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
    DEFAULT_LOOK,
    EYE_COLORS,
    FIGURES,
    HAIR_COLORS_3D,
    HAIR_STYLES_3D,
    ITEMS_3D,
    PRESETS_3D,
    SKIN_TONES_3D,
    applyPreset,
    getItem3D,
    takeOff,
    wearItem,
    type AvatarLook,
    type FigureKind,
    type Slot3D,
    type Swatch,
} from "./catalog";
import Avatar3DView from "./Avatar3DView";
import type { Stage } from "./engine/stage";
import { ThumbnailRenderer, thumbKey, type ThumbRequest } from "./engine/thumbnails";

declare global {
    interface Window {
        __avatar3d?: { stage: Stage | null; setLook: (look: AvatarLook) => void; look: AvatarLook; setTab: (tab: Tab) => void; thumbs: number };
    }
}

type Tab = "body" | "hair" | Slot3D | "sets";

/** Pantalone i haljina (lucide ih nema) */
function PantsIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden>
            <path d="M7 3h10l1.5 18h-4L12 10l-2.5 11h-4z" />
            <path d="M7 6.5h10" />
        </svg>
    );
}

function DressIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden>
            <path d="M9 3l-1 4 2 3-5 11h14l-5-11 2-3-1-4" />
            <path d="M9 3c1 1.2 5 1.2 6 0" />
        </svg>
    );
}

const icon = (node: ReactNode) => node;
const TABS: { tab: Tab; label: string; icon: ReactNode }[] = [
    { tab: "sets", label: "Kompleti", icon: icon(<Sparkles className="h-7 w-7" aria-hidden />) },
    { tab: "body", label: "Lik", icon: icon(<User className="h-7 w-7" aria-hidden />) },
    { tab: "hair", label: "Kosa", icon: icon(<Scissors className="h-7 w-7" aria-hidden />) },
    { tab: "top", label: "Gornji deo", icon: icon(<Shirt className="h-7 w-7" aria-hidden />) },
    { tab: "bottom", label: "Donji deo", icon: icon(<PantsIcon />) },
    { tab: "long", label: "Haljine i kaputi", icon: icon(<DressIcon />) },
    { tab: "shoes", label: "Obuća", icon: icon(<Footprints className="h-7 w-7" aria-hidden />) },
    { tab: "head", label: "Na glavi", icon: icon(<Crown className="h-7 w-7" aria-hidden />) },
    { tab: "glasses", label: "Naočare", icon: icon(<Glasses className="h-7 w-7" aria-hidden />) },
    { tab: "bag", label: "Ranac", icon: icon(<Backpack className="h-7 w-7" aria-hidden />) },
];

/** Odeća u kojoj se lik prikazuje na kartici „Lik” */
const FIGURE_PREVIEW: AvatarLook["wear"] = { top: { id: "majica", color: 1 }, bottom: { id: "farmerke", color: 0 }, shoes: { id: "patike", color: 0 } };

function useThumbs() {
    const rendererRef = useRef<ThumbnailRenderer | null>(null);
    const [thumbs, setThumbs] = useState<Record<string, string>>({});
    useEffect(() => {
        try {
            rendererRef.current = new ThumbnailRenderer();
        } catch {
            rendererRef.current = null;
        }
        return () => {
            rendererRef.current?.dispose();
            rendererRef.current = null;
        };
    }, []);
    const request = useCallback((reqs: ThumbRequest[]) => {
        const renderer = rendererRef.current;
        if (!renderer) return;
        renderer.clearQueue();
        for (const req of reqs) {
            const key = thumbKey(req);
            renderer.request(req, (url) => setThumbs((prev) => (prev[key] ? prev : { ...prev, [key]: url })));
        }
    }, []);
    return { thumbs, request };
}

function Tile({ selected, label, onPress, image, children, wide }: { selected: boolean; label: string; onPress: () => void; image?: string; children?: ReactNode; wide?: boolean }) {
    return (
        <button
            type="button"
            onClick={onPress}
            aria-pressed={selected}
            className={cn(
                "group flex flex-col items-center gap-1 rounded-tile border-2 bg-white p-1.5 text-center transition active:scale-95",
                selected ? "border-brand-500 bg-brand-50 shadow-soft" : "border-line hover:border-brand-200",
                wide && "col-span-2",
            )}
        >
            <span className={cn("relative flex w-full items-center justify-center overflow-hidden rounded-[0.9rem] bg-[radial-gradient(circle_at_50%_40%,#FFFFFF,#ECEDF1)]", wide ? "aspect-[2/1]" : "aspect-square")}>
                {image ? (
                    // Sličica je data-URL iz 3D crtanja (nema šta da optimizuje next/image)
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-full w-full object-contain" draggable={false} />
                ) : (
                    children ?? <span className="h-1/2 w-1/2 animate-pulse rounded-full bg-slate-200/70" />
                )}
            </span>
            <span className="line-clamp-2 min-h-[2.4em] text-[0.8rem] font-bold leading-tight text-ink">{label}</span>
        </button>
    );
}

function Swatches({ list, value, onPick, label }: { list: readonly Swatch[]; value: string; onPick: (id: string) => void; label: string }) {
    return (
        <div>
            <h3 className="mb-2 text-sm font-bold text-ink-soft">{label}</h3>
            <div className="flex flex-wrap gap-3">
                {list.map((sw) => (
                    <button
                        key={sw.id}
                        type="button"
                        onClick={() => onPick(sw.id)}
                        aria-pressed={value === sw.id}
                        aria-label={sw.label}
                        title={sw.label}
                        className={cn("h-12 w-12 rounded-full border-4 shadow-soft transition active:scale-90", value === sw.id ? "border-brand-500 ring-2 ring-brand-200" : "border-white")}
                        style={{ background: sw.accent ? `linear-gradient(135deg, ${sw.hex} 55%, ${sw.accent} 55%)` : sw.hex }}
                    />
                ))}
            </div>
        </div>
    );
}

export default function Avatar3DEditor() {
    const [look, setLook] = useState<AvatarLook>(DEFAULT_LOOK);
    const [tab, setTab] = useState<Tab>("sets");
    const [stage, setStage] = useState<Stage | null>(null);
    const [turned, setTurned] = useState(false);
    const { thumbs, request } = useThumbs();
    const isCat = look.figure === "cat";
    const human = isCat ? { ...look, figure: "girl" as const } : look;

    useEffect(() => {
        if (process.env.NODE_ENV !== "production") window.__avatar3d = { stage, setLook, look, setTab, thumbs: Object.keys(thumbs).length };
    }, [stage, look, thumbs]);

    // Sličice za karticu koja je otvorena
    const requests = useMemo((): ThumbRequest[] => {
        if (tab === "sets") return PRESETS_3D.map((preset) => ({ kind: "look", look: { ...applyPreset(human, preset), expression: "happy" } }));
        if (tab === "body") return FIGURES.filter((f) => f.kind !== "cat").map((f) => ({ kind: "look", look: { ...human, figure: f.kind, hair: f.kind === "boy" || f.kind === "man" ? "short" : human.hair, wear: FIGURE_PREVIEW } }));
        if (tab === "hair") return HAIR_STYLES_3D.map((h) => ({ kind: "hair", hair: h.id, look: human }));
        return ITEMS_3D.filter((item) => item.slot === tab).map((item) => ({ kind: "item", slot: item.slot, id: item.id, color: look.wear[item.slot]?.id === item.id ? (look.wear[item.slot]?.color ?? 0) : 0, look: human }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, human.figure, human.hair, human.hairColor, human.skin, look.wear]);
    useEffect(() => {
        if (!isCat) request(requests);
    }, [requests, request, isCat]);

    const turn = () => {
        const next = !turned;
        setTurned(next);
        stage?.setYaw(next ? Math.PI : 0);
    };

    const current = tab !== "body" && tab !== "hair" && tab !== "sets" ? look.wear[tab] : undefined;
    const currentItem = current ? getItem3D(current.id) : undefined;
    const hijab = look.wear.head?.id === "hidzab";

    const setFigure = (figure: FigureKind) => {
        setLook((prev) => ({ ...prev, figure, hair: (figure === "boy" || figure === "man") && ["long", "braids", "ponytail", "bun"].includes(prev.hair) ? "short" : (figure === "girl" || figure === "woman") && prev.hair === "buzz" ? "long" : prev.hair }));
    };

    let content: ReactNode;
    if (isCat && tab !== "body") {
        content = <p className="rounded-card bg-sun-50 p-4 text-base font-semibold text-ink-soft">Mačka za sada nosi samo crvenu ogrlicu. Izaberi lik na kartici „Lik” da biraš odeću.</p>;
    } else if (tab === "sets") {
        content = (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {PRESETS_3D.map((preset) => {
                    const req: ThumbRequest = { kind: "look", look: { ...applyPreset(human, preset), expression: "happy" } };
                    return <Tile key={preset.id} selected={false} label={preset.label} image={thumbs[thumbKey(req)]} onPress={() => setLook((prev) => applyPreset(prev, preset))} />;
                })}
            </div>
        );
    } else if (tab === "body") {
        content = (
            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-5 gap-2">
                    {FIGURES.map((f) => {
                        const req: ThumbRequest | null = f.kind === "cat" ? null : { kind: "look", look: { ...human, figure: f.kind, hair: f.kind === "boy" || f.kind === "man" ? "short" : human.hair, wear: FIGURE_PREVIEW } };
                        return (
                            <Tile key={f.kind} selected={look.figure === f.kind} label={f.label} image={req ? thumbs[thumbKey(req)] : undefined} onPress={() => setFigure(f.kind)}>
                                {f.kind === "cat" ? <Cat className="h-10 w-10 text-sun-600" aria-hidden /> : undefined}
                            </Tile>
                        );
                    })}
                </div>
                {!isCat && <Swatches label="Boja kože" list={SKIN_TONES_3D} value={look.skin} onPick={(skin) => setLook((prev) => ({ ...prev, skin }))} />}
                <Swatches label="Boja očiju" list={EYE_COLORS} value={look.eyes} onPick={(eyes) => setLook((prev) => ({ ...prev, eyes }))} />
                {!isCat && (
                    <div>
                        <h3 className="mb-2 text-sm font-bold text-ink-soft">Izraz lica</h3>
                        <div className="flex gap-3">
                            {(["happy", "neutral"] as const).map((expression) => (
                                <button key={expression} type="button" aria-pressed={look.expression === expression} onClick={() => setLook((prev) => ({ ...prev, expression }))} className={cn("min-h-12 rounded-full border-2 px-5 text-base font-bold", look.expression === expression ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-white text-ink")}>
                                    {expression === "happy" ? "Veseo osmeh" : "Blag osmeh"}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    } else if (tab === "hair") {
        content = (
            <div className="flex flex-col gap-5">
                {hijab && <p className="rounded-card bg-brand-50 p-3 text-sm font-semibold text-brand-800">Kosa je ispod hidžaba. Frizuru vidiš kad skineš hidžab (kartica „Na glavi”).</p>}
                <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7">
                    {HAIR_STYLES_3D.map((h) => {
                        const req: ThumbRequest = { kind: "hair", hair: h.id, look: human };
                        return <Tile key={h.id} selected={look.hair === h.id} label={h.label} image={thumbs[thumbKey(req)]} onPress={() => setLook((prev) => ({ ...prev, hair: h.id }))} />;
                    })}
                </div>
                <Swatches label="Boja kose" list={HAIR_COLORS_3D} value={look.hairColor} onPick={(hairColor) => setLook((prev) => ({ ...prev, hairColor }))} />
            </div>
        );
    } else {
        const slot = tab;
        const items = ITEMS_3D.filter((item) => item.slot === slot);
        content = (
            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
                    {slot !== "top" && slot !== "bottom" && (
                        <Tile selected={!look.wear[slot]} label="Bez" onPress={() => setLook((prev) => takeOff(prev, slot))}>
                            <span className="text-3xl text-ink-faint" aria-hidden>—</span>
                        </Tile>
                    )}
                    {items.map((item) => {
                        const worn = look.wear[slot]?.id === item.id;
                        const req: ThumbRequest = { kind: "item", slot, id: item.id, color: worn ? (look.wear[slot]?.color ?? 0) : 0, look: human };
                        return <Tile key={item.id} selected={worn} label={item.label} image={thumbs[thumbKey(req)]} onPress={() => setLook((prev) => (worn ? prev : wearItem(prev, item.id, 0)))} />;
                    })}
                </div>
                {currentItem && current && currentItem.colors.length > 1 && (
                    <Swatches label={`Boja: ${currentItem.label}`} list={currentItem.colors} value={currentItem.colors[current.color]?.id ?? ""} onPick={(id) => setLook((prev) => wearItem(prev, currentItem.id, Math.max(0, currentItem.colors.findIndex((c) => c.id === id))))} />
                )}
                {slot === "long" && <p className="text-sm font-semibold text-ink-faint">Haljina i abaja zamenjuju gornji i donji deo; dugi kaput se nosi preko pantalona.</p>}
            </div>
        );
    }

    return (
        <div className="flex min-h-dvh flex-col bg-[#ECEDF0] landscape:min-[900px]:h-dvh landscape:min-[900px]:flex-row">
            <section className="relative h-[54dvh] shrink-0 landscape:min-[900px]:h-full landscape:min-[900px]:w-[52%]" aria-label="3D drugar">
                <Avatar3DView look={look} onStage={setStage} className="h-full w-full bg-[radial-gradient(ellipse_at_50%_38%,#FFFFFF_0%,#F0F1F4_45%,#D9DBE1_100%)]" />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
                    <h1 className="font-display text-2xl font-bold text-ink/80">Moj drugar</h1>
                    <button type="button" onClick={turn} className="pointer-events-auto flex min-h-12 items-center gap-2 rounded-full bg-white/90 px-4 text-base font-bold text-ink shadow-soft active:scale-95">
                        <RotateCcw className="h-5 w-5" aria-hidden />
                        {turned ? "Napred" : "Okreni"}
                    </button>
                </div>
                <p className="pointer-events-none absolute inset-x-0 bottom-8 text-center landscape:min-[900px]:bottom-4 text-sm font-semibold text-ink-faint">Prevuci prstom levo-desno da okreneš drugara</p>
            </section>
            <section className="relative z-10 -mt-5 flex min-h-0 flex-1 flex-col rounded-t-[1.75rem] bg-canvas shadow-[0_-8px_30px_-12px_rgb(31_27_58/0.25)] landscape:min-[900px]:mt-0 landscape:min-[900px]:rounded-none landscape:min-[900px]:rounded-l-[1.75rem]">
                <nav className="flex gap-1.5 overflow-x-auto px-3 pb-2 pt-3" aria-label="Garderoba">
                    {TABS.map((t) => (
                        <button
                            key={t.tab}
                            type="button"
                            onClick={() => setTab(t.tab)}
                            aria-pressed={tab === t.tab}
                            className={cn("flex min-h-[4.25rem] min-w-[4.6rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-tile px-2 text-[0.72rem] font-bold leading-tight transition", tab === t.tab ? "bg-brand-500 text-white shadow-soft" : "bg-white text-ink-soft")}
                        >
                            {t.icon}
                            <span className="text-center">{t.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-8 pt-2">{content}</div>
            </section>
        </div>
    );
}
