// Pregled četiri sveta „Mape” (samo u razvoju): /dev/worlds
// Parametri: ?view=maps|gates &world=meadow|desert|volcano|ice &width=360|768|1200 &state=locked|key|open &count=5 &calm=1
// Mape: svaki svet na tri širine (360 zaključano, 768 ključ spreman, 1200 otvoreno), sa putem,
// mostom i krugovima umesto stanica. Kapije: sva tri stanja izbliza, dvorac poslednjeg sveta i značke.
import { notFound } from "next/navigation";
import { curvesPath, mapLayout } from "@/app/dashboard/child/[id]/gameMapLayout";
import { WORLDS, WorldBadge, WorldBridge, WorldGate, WorldScenery, WorldStart, worldRoad, type GateState, type WorldId } from "@/app/dashboard/child/[id]/mapWorlds";

type Params = Partial<Record<"view" | "world" | "width" | "state" | "count" | "calm", string>>;

const WIDTHS = [360, 768, 1200];
const STATES: GateState[] = ["locked", "key", "open"];
const STATE_LABEL: Record<GateState, string> = { locked: "Zaključano", key: "Ključ spreman", open: "Otvoreno" };

export default async function DevWorldsPage({ searchParams }: { searchParams: Promise<Params> }) {
    if (process.env.NODE_ENV === "production") notFound();
    const p = await searchParams;
    const worlds = WORLDS.filter((w) => !p.world || w.id === p.world);
    const widths = p.width ? [Number(p.width)] : WIDTHS;
    const count = Math.min(Math.max(Number(p.count) || 5, 1), 16);
    const calm = p.calm === "1";
    const forced = STATES.find((s) => s === p.state);

    return (
        <main className="min-h-dvh bg-canvas px-4 py-5 sm:px-6">
            <h1 className="font-display text-2xl font-extrabold text-ink">Svetovi mape</h1>
            {p.view === "gates" ? (
                <GateSheet calm={calm} worlds={worlds.map((w) => w.id)} />
            ) : (
                worlds.map((w) => (
                    <section key={w.id} className="mt-6" data-world={w.id}>
                        <h2 className="font-display text-xl font-extrabold" style={{ color: w.colors.text }}>
                            {w.name} <span className="text-sm font-bold text-ink-soft">({w.where})</span>
                        </h2>
                        <div className="mt-3 flex flex-wrap items-start gap-4">
                            {widths.map((width, i) => (
                                <MapPreview key={width} world={w.id} width={width} count={count} state={forced ?? STATES[i % 3]} calm={calm} />
                            ))}
                        </div>
                    </section>
                ))
            )}
        </main>
    );
}

function MapPreview({ world, width, count, state, calm }: { world: WorldId; width: number; count: number; state: GateState; calm: boolean }) {
    const layout = mapLayout(count, width);
    const road = worldRoad(world);
    const d = curvesPath(layout.curves);
    const reached = layout.nodeCurve[Math.min(1, count - 1)] ?? 0;
    const done = curvesPath(layout.curves, 0, reached);
    const r = layout.nodeSize / 2;
    return (
        <figure className="w-full overflow-hidden rounded-card border border-line shadow-soft" style={{ maxWidth: width, background: WORLDS.find((w) => w.id === world)?.colors.ground }}>
            <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="block h-auto w-full" data-width={width}>
                <WorldScenery world={world} layout={layout} calm={calm} />
                <path d={d} fill="none" stroke={road.edge} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
                <path d={d} fill="none" stroke={road.fill} strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
                {done && <path d={done} fill="none" stroke={road.done} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />}
                <path d={d} fill="none" stroke={road.dash} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 16" opacity="0.9" />
                {layout.river && <WorldBridge world={world} x={layout.river.cross.x} y={layout.river.cross.y} angle={layout.river.angle} />}
                <WorldStart world={world} x={layout.start.x} y={layout.start.y} />
                <WorldGate world={world} x={layout.end.x} y={layout.end.y} state={state} final={world === "ice"} calm={calm} />
                {/* Stanice: beli krugovi sa brojem (kao na pravoj mapi) */}
                {layout.nodes.map((n, i) => (
                    <g key={i}>
                        <circle cx={n.x} cy={n.y + 3} r={r} fill="#000" opacity="0.08" />
                        <circle cx={n.x} cy={n.y} r={r} fill="#FFFFFF" />
                        <circle cx={n.x} cy={n.y} r={r - 7} fill="#EEEAF9" />
                        <text x={n.x} y={n.y + 9} textAnchor="middle" fontSize="26" fontWeight="800" fill="#2B2A4C">
                            {i + 1}
                        </text>
                        <rect x={n.x - 64} y={n.y + r + 8} width="128" height="40" rx="14" fill="#FFFFFF" opacity="0.92" />
                    </g>
                ))}
            </svg>
            <figcaption className="px-3 py-2 text-xs font-bold text-ink-soft">
                {width}px · {STATE_LABEL[state]}
            </figcaption>
        </figure>
    );
}

function GateSheet({ calm, worlds }: { calm: boolean; worlds: WorldId[] }) {
    return (
        <div className="mt-4 space-y-6">
            <div className="flex flex-wrap gap-3" data-badges>
                {WORLDS.map((w) => (
                    <div key={w.id} className="flex flex-col items-center gap-1">
                        <div className="flex gap-2">
                            <WorldBadge world={w.id} locked={false} className="h-16 w-16" />
                            <WorldBadge world={w.id} locked className="h-16 w-16" />
                        </div>
                        <span className="text-xs font-bold text-ink-soft">{w.name}</span>
                    </div>
                ))}
            </div>
            {worlds.map((id) => {
                const w = WORLDS.find((x) => x.id === id)!;
                return (
                    <section key={id}>
                        <h2 className="font-display text-lg font-extrabold" style={{ color: w.colors.text }}>
                            {w.name}
                        </h2>
                        <div className="mt-2 grid grid-cols-3 gap-2 sm:max-w-3xl">
                            {STATES.map((state) => (
                                <figure key={state} className="overflow-hidden rounded-2xl border border-line" style={{ background: w.colors.ground }}>
                                    <svg viewBox="-95 -125 190 215" className="block h-auto w-full">
                                        <WorldGate world={id} x={0} y={0} state={state} final={id === "ice"} calm={calm} />
                                    </svg>
                                    <figcaption className="px-2 pb-1 text-center text-[0.7rem] font-bold text-ink-soft">{STATE_LABEL[state]}</figcaption>
                                </figure>
                            ))}
                        </div>
                        {id === "ice" && (
                            <div className="mt-2 grid grid-cols-3 gap-2 sm:max-w-3xl">
                                {STATES.map((state) => (
                                    <figure key={state} className="overflow-hidden rounded-2xl border border-line" style={{ background: w.colors.ground }}>
                                        <svg viewBox="-95 -125 190 215" className="block h-auto w-full">
                                            <WorldGate world={id} x={0} y={0} state={state} calm={calm} />
                                        </svg>
                                        <figcaption className="px-2 pb-1 text-center text-[0.7rem] font-bold text-ink-soft">Kapija · {STATE_LABEL[state]}</figcaption>
                                    </figure>
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
