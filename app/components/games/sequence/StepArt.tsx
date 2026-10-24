// Crtež jednog koraka igre „Šta je prvo?” iz opisa (sequence/art.ts). Pozadine, likovi i
// predmeti su iz zajedničkog kompleta (scene/), samo se ovde slažu u krupan kadar radnje.
// Slika je ukras uz tekst i glas, pa je skrivena od čitača ekrana.

import type { ReactNode } from "react";
import { Background, BackgroundOverlay } from "@/app/components/games/scene/backgrounds";
import { Figure, gazeToward, heldPoint, isAdult } from "@/app/components/games/scene/figures";
import { Prop } from "@/app/components/games/scene/props";
import { VIEW_H, VIEW_W, type AdultId, type LookId } from "@/app/components/games/scene/types";
import { cn } from "@/lib/cn";
import { isArtFigure, type ArtFigure, type ArtHeld, type ArtThing, type StepArtSpec } from "./art";
import { Drawing } from "./drawings";

function Thing({ item }: { item: ArtThing }) {
    const parts = [`translate(${item.x} ${item.y})`];
    if (item.rot) parts.push(`rotate(${item.rot})`);
    if (item.s && item.s !== 1) parts.push(`scale(${item.s})`);
    if (item.flip) parts.push("scale(-1 1)");
    return <g transform={parts.join(" ")}>{item.p ? <Prop id={item.p} tone={item.tone} /> : item.d ? <Drawing id={item.d} tone={item.tone} /> : null}</g>;
}

function heldNode(look: LookId | AdultId, pose: ArtFigure["pose"], held: ArtHeld): ReactNode {
    const hand = held.hand ?? (pose === "hold" || pose === "sitHold" ? "both" : "r");
    const [hx, hy] = heldPoint(isAdult(look), pose ?? "stand", hand);
    const parts = [`translate(${hx + (held.dx ?? 0)} ${hy + 5 + (held.dy ?? 0)})`];
    if (held.rot) parts.push(`rotate(${held.rot})`);
    parts.push(`scale(${held.s ?? 0.8})`);
    return <g transform={parts.join(" ")}>{held.p ? <Prop id={held.p} tone={held.tone} /> : held.d ? <Drawing id={held.d} tone={held.tone} /> : null}</g>;
}

function Person({ item, me }: { item: ArtFigure; me: LookId }) {
    const look = item.f === "me" ? me : item.f;
    const s = item.s ?? 1;
    const pose = item.pose ?? "stand";
    const gaze = item.at ? gazeToward(look, pose, ((item.at[0] - item.x) / s) * (item.flip ? -1 : 1), (item.at[1] - item.y) / s, 1) : undefined;
    const parts = [`translate(${item.x} ${item.y})`];
    if (s !== 1) parts.push(`scale(${s})`);
    if (item.flip) parts.push("scale(-1 1)");
    return (
        <g transform={parts.join(" ")}>
            <Figure id={look} pose={pose} face={item.face ?? "calm"} back={item.back} wear={item.wear} held={item.hold ? heldNode(look, pose, item.hold) : null} gaze={gaze} />
        </g>
    );
}

interface StepArtProps {
    spec: StepArtSpec;
    /** Dete koje igra: devojčica ili dečak (koraci su u prvom licu) */
    female: boolean;
    className?: string;
}

export function StepArt({ spec, female, className }: StepArtProps) {
    const me: LookId = female ? "meGirl" : "meBoy";
    return (
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={cn("block", className)} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
            <Background id={spec.bg} view={spec.view} />
            <BackgroundOverlay id={spec.bg} view={spec.view} />
            {spec.items.map((item, i) => (isArtFigure(item) ? <Person key={i} item={item} me={me} /> : <Thing key={i} item={item} />))}
        </svg>
    );
}
