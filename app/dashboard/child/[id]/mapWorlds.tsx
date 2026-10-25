// app/dashboard/child/[id]/mapWorlds.tsx
// PRIVREMENO (grana mape-logika): zamena za crteže mapa dok PR „mape-izgled” ne stigne na main.
// Isti izvozi kao pravi fajl; sve mape koriste dosadašnju livadu, samo u drugim bojama.
import type { MapLayout } from "./gameMapLayout";

export type WorldId = "meadow" | "desert" | "volcano" | "ice";

export interface WorldTheme {
    id: WorldId;
    name: string;
    where: string;
    colors: { ground: string; groundDeep: string; frame: string; accent: string; text: string };
}

export const WORLDS: readonly WorldTheme[] = [
    { id: "meadow", name: "Zelena livada", where: "na livadi", colors: { ground: "#E9F5E1", groundDeep: "#BFE3AE", frame: "#7DBE7E", accent: "#22A06B", text: "#1E5631" } },
    { id: "desert", name: "Peščana pustinja", where: "u pustinji", colors: { ground: "#FBF0D9", groundDeep: "#F1D9A8", frame: "#D9A85B", accent: "#D97F16", text: "#6B4310" } },
    { id: "volcano", name: "Vatreni vulkan", where: "na vulkanu", colors: { ground: "#FCE8DA", groundDeep: "#F3C6A8", frame: "#C9774E", accent: "#EE7A2A", text: "#6E2E12" } },
    { id: "ice", name: "Ledeni vrhovi", where: "na ledenim vrhovima", colors: { ground: "#EAF6FD", groundDeep: "#C4E6F7", frame: "#6FB7E3", accent: "#2F8FD6", text: "#14476E" } },
];

export function worldTheme(id: WorldId): WorldTheme {
    return WORLDS.find((w) => w.id === id) ?? WORLDS[0];
}

const HILLS: Record<WorldId, string[]> = {
    meadow: ["#BFE3AE", "#CDEABD", "#B3DCA0"],
    desert: ["#F1D9A4", "#EBCB8B", "#F5E1B5"],
    volcano: ["#E9B49E", "#E2A48C", "#EFC3B1"],
    ice: ["#CFE4F3", "#DCEBF7", "#C3DCEF"],
};
const TREES: Record<WorldId, string[]> = {
    meadow: ["#7DBE7E", "#8FCB86", "#6DB27A"],
    desert: ["#9CBF6E", "#B3C97A", "#8DB466"],
    volcano: ["#A67B6A", "#B98C78", "#946A5B"],
    ice: ["#7FA9C9", "#93B9D6", "#6E9DC0"],
};

export function WorldScenery({ world, layout }: { world: WorldId; layout: MapLayout; calm?: boolean }) {
    const { width, height, river, trees, hills } = layout;
    const theme = worldTheme(world);
    return (
        <g>
            <defs>
                <linearGradient id={`bm-ground-${world}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={theme.colors.ground} />
                    <stop offset="1" stopColor={theme.colors.ground} />
                </linearGradient>
            </defs>
            <rect width={width} height={height} fill={`url(#bm-ground-${world})`} />
            {hills.map((h, i) => (
                <ellipse key={`h${i}`} cx={h.x} cy={h.y} rx={h.rx} ry={h.ry} fill={HILLS[world][h.tone]} opacity="0.8" />
            ))}
            {river && <path d={`M-20 ${river.y} H${width + 20}`} stroke={world === "volcano" ? "#F2A271" : "#A9D8F0"} strokeWidth="40" />}
            {trees.map((t, i) => (
                <g key={`t${i}`} transform={`translate(${t.x} ${t.y})`}>
                    <rect x="-3" y={t.r * 0.4} width="6" height={t.r * 0.8} rx="2" fill="#B08968" />
                    <circle r={t.r} fill={TREES[world][t.tone]} />
                </g>
            ))}
        </g>
    );
}

export function worldRoad(id: WorldId): { edge: string; fill: string; dash: string; done: string } {
    void id;
    return { edge: "#D9C49A", fill: "#F4E6C6", dash: "#FFFFFF", done: "#FFD66B" };
}

export function WorldBridge({ x, y, angle }: { world: WorldId; x: number; y: number; angle: number }) {
    return (
        <g transform={`translate(${x} ${y}) rotate(${angle})`}>
            <rect x="-40" y="-20" width="80" height="40" rx="8" fill="#C99A6B" />
        </g>
    );
}

export function WorldStart({ x, y }: { world: WorldId; x: number; y: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <rect x="-22" y="-6" width="44" height="28" rx="3" fill="#FFF4E0" stroke="#EAD7B7" strokeWidth="1.5" />
            <path d="M-28 -4 L0 -28 L28 -4 Z" fill="#E98B6D" />
        </g>
    );
}

export function WorldGate({ world, x, y, state, final = false }: { world: WorldId; x: number; y: number; state: "locked" | "key" | "open"; final?: boolean; calm?: boolean }) {
    const theme = worldTheme(world);
    return (
        <g transform={`translate(${x} ${y - 20})`}>
            <rect x="-58" y="0" width="116" height="62" rx="4" fill="#EDE9FA" stroke="#D7D0F2" strokeWidth="2" />
            <path d="M-19 0 L0 -40 L19 0 Z" fill={final ? "#FFB920" : theme.colors.accent} />
            <path d="M-14 62 L-14 36 Q0 20 14 36 L14 62 Z" fill={state === "open" ? "#FFE9A8" : "#B08968"} />
            {state !== "open" && <circle cx="0" cy="46" r="6" fill={state === "key" ? "#FFB920" : "#6B5B4B"} />}
        </g>
    );
}

export function WorldBadge({ world, locked = false, className }: { world: WorldId; locked?: boolean; className?: string }) {
    const theme = worldTheme(world);
    return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill={theme.colors.ground} stroke={theme.colors.accent} strokeWidth="3" />
            <path d="M8 34 Q24 14 40 34 Z" fill={theme.colors.accent} opacity={locked ? 0.4 : 1} />
        </svg>
    );
}
