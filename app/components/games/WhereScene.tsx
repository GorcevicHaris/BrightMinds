// Slika za igru „Gde je?”: predmet (kutija, korpa, sto, stolica) i igračka na nekom položaju.
// Crta se u SVG-u, bez slika sa mreže; igračka je emodži (Unicode ≤ 11, radi i na starijim tabletima).
// Ono što je „iza” ili „u” crta se pre prednje strane predmeta, pa je delom sakriveno — kao na
// karticama za predloge koje koriste logopedi.

import type { ReactNode } from "react";
import type { FigureId, ObjectId, Relation } from "@/app/components/games/data/whereScenes";
import { getFigure } from "@/app/components/games/data/whereScenes";

const GROUND = 148;
const SIZE = 40;
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

interface Drawn {
    /** Deo koji je iza igračke (unutrašnjost kutije, drška korpe) */
    back?: ReactNode;
    front: ReactNode;
}

function shadow(cx: number, rx: number) {
    return <ellipse cx={cx} cy={GROUND + 1} rx={rx} ry={4} fill="#000" opacity={0.08} />;
}

function box(cx: number, open: boolean): Drawn {
    const front = (
        <g>
            {shadow(cx, 46)}
            <rect x={cx - 42} y={open ? 96 : 92} width={84} height={open ? 52 : 56} rx={4} fill="#e7b276" stroke="#b07a3f" strokeWidth={2} />
            {!open && <rect x={cx - 46} y={86} width={92} height={12} rx={3} fill="#d49a58" stroke="#b07a3f" strokeWidth={2} />}
            <rect x={cx - 6} y={open ? 96 : 86} width={12} height={open ? 20 : 26} fill="#f3d19c" opacity={0.9} />
        </g>
    );
    if (!open) return { front };
    return {
        back: (
            <g>
                <path d={`M${cx - 42} 96 L${cx - 58} 80 L${cx - 30} 80 L${cx - 20} 96 Z`} fill="#d49a58" stroke="#b07a3f" strokeWidth={2} strokeLinejoin="round" />
                <path d={`M${cx + 42} 96 L${cx + 58} 80 L${cx + 30} 80 L${cx + 20} 96 Z`} fill="#d49a58" stroke="#b07a3f" strokeWidth={2} strokeLinejoin="round" />
                <rect x={cx - 40} y={88} width={80} height={12} rx={3} fill="#8a5a2b" />
            </g>
        ),
        front,
    };
}

function basket(cx: number): Drawn {
    return {
        back: (
            <g>
                <path d={`M${cx - 36} 102 Q ${cx} 50 ${cx + 36} 102`} fill="none" stroke="#a8682c" strokeWidth={6} strokeLinecap="round" />
                <ellipse cx={cx} cy={102} rx={46} ry={8} fill="#7a4a1e" />
            </g>
        ),
        front: (
            <g>
                {shadow(cx, 40)}
                <path d={`M${cx - 46} 102 H${cx + 46} L${cx + 36} ${GROUND} H${cx - 36} Z`} fill="#d39a55" stroke="#a8682c" strokeWidth={2} strokeLinejoin="round" />
                <path d={`M${cx - 43} 116 H${cx + 43} M${cx - 40} 130 H${cx + 40}`} stroke="#a8682c" strokeWidth={3} opacity={0.6} />
                <rect x={cx - 48} y={98} width={96} height={8} rx={4} fill="#b97a3a" />
            </g>
        ),
    };
}

function table(cx: number): Drawn {
    return {
        front: (
            <g>
                {shadow(cx, 62)}
                <rect x={cx - 52} y={96} width={8} height={GROUND - 96} rx={2} fill="#8f5d34" />
                <rect x={cx + 44} y={96} width={8} height={GROUND - 96} rx={2} fill="#8f5d34" />
                <rect x={cx - 62} y={86} width={124} height={12} rx={4} fill="#b07a4a" stroke="#8f5d34" strokeWidth={2} />
            </g>
        ),
    };
}

function chair(cx: number): Drawn {
    return {
        front: (
            <g>
                {shadow(cx, 36)}
                <rect x={cx - 30} y={40} width={9} height={64} rx={3} fill="#4a7fc0" />
                <rect x={cx - 30} y={44} width={9} height={30} rx={3} fill="#6aa6e8" />
                <rect x={cx - 28} y={104} width={7} height={GROUND - 104} rx={2} fill="#4a7fc0" />
                <rect x={cx + 21} y={104} width={7} height={GROUND - 104} rx={2} fill="#4a7fc0" />
                <rect x={cx - 32} y={96} width={64} height={10} rx={3} fill="#6aa6e8" stroke="#4a7fc0" strokeWidth={2} />
            </g>
        ),
    };
}

function drawObject(object: ObjectId, cx: number, open = false): Drawn {
    if (object === "box") return box(cx, open);
    if (object === "basket") return basket(cx);
    if (object === "table") return table(cx);
    return chair(cx);
}

/** Gornja površina predmeta (na kojoj igračka stoji ili iznad koje lebdi) */
const TOP: Record<ObjectId, number> = { box: 86, basket: 98, table: 86, chair: 96 };

function figureAt(emoji: string, x: number, y: number, size = SIZE) {
    return (
        <text x={x} y={y} fontSize={size} textAnchor="middle" dominantBaseline="central" fontFamily={EMOJI_FONT}>
            {emoji}
        </text>
    );
}

interface Placement {
    objects: { cx: number; scale?: number; open?: boolean }[];
    figure: { x: number; y: number; size?: number };
    /** Igračka je delom zaklonjena predmetom (u, iza) */
    hidden: boolean;
}

function placementFor(relation: Relation, object: ObjectId): Placement {
    const top = TOP[object];
    switch (relation) {
        case "in":
            return { objects: [{ cx: 100, open: true }], figure: { x: 100, y: object === "basket" ? 86 : 84 }, hidden: true };
        case "on":
            return { objects: [{ cx: 100 }], figure: object === "chair" ? { x: 104, y: top - 19 } : { x: 100, y: top - 19 }, hidden: false };
        case "under":
            return { objects: [{ cx: 100 }], figure: { x: 101, y: GROUND - 17, size: object === "chair" ? 30 : 34 }, hidden: false };
        case "next":
            return { objects: [{ cx: object === "table" ? 74 : 80 }], figure: { x: 166, y: GROUND - 19 }, hidden: false };
        case "behind":
            // Viri iza zatvorene kutije: vidi se samo gornji deo glave, ostalo zaklanja predmet
            return { objects: [{ cx: 100 }], figure: { x: 112, y: top - 4, size: 44 }, hidden: true };
        case "front":
            return { objects: [{ cx: 100 }], figure: { x: 100, y: GROUND - 12, size: 46 }, hidden: false };
        case "above":
            return { objects: [{ cx: 100 }], figure: { x: 100, y: object === "basket" ? 24 : 30 }, hidden: false };
        case "between":
            return { objects: [{ cx: 40, scale: 0.72 }, { cx: 160, scale: 0.72 }], figure: { x: 100, y: GROUND - 19 }, hidden: false };
    }
}

/** Predmet u razmeri oko svog dna (za „između” su dva manja predmeta) */
function scaled(cx: number, scale: number | undefined, node: ReactNode) {
    if (!scale || scale === 1) return node;
    return <g transform={`translate(${cx} ${GROUND}) scale(${scale}) translate(${-cx} ${-GROUND})`}>{node}</g>;
}

interface WhereSceneProps {
    figure: FigureId;
    object: ObjectId;
    relation: Relation;
    className?: string;
}

export function WhereScene({ figure, object, relation, className }: WhereSceneProps) {
    const toy = getFigure(figure);
    const placement = placementFor(relation, object);
    const drawn = placement.objects.map((spot) => ({ spot, parts: drawObject(object, spot.cx, spot.open) }));
    const toyNode = toy ? figureAt(toy.emoji, placement.figure.x, placement.figure.y, placement.figure.size) : null;
    return (
        <svg viewBox="0 0 200 160" className={className} aria-hidden="true">
            <rect x={0} y={GROUND} width={200} height={160 - GROUND} fill="#efe6da" />
            {drawn.map(({ spot, parts }, i) => (
                <g key={`back-${i}`}>{parts.back ? scaled(spot.cx, spot.scale, parts.back) : null}</g>
            ))}
            {placement.hidden && toyNode}
            {drawn.map(({ spot, parts }, i) => (
                <g key={`front-${i}`}>{scaled(spot.cx, spot.scale, parts.front)}</g>
            ))}
            {!placement.hidden && toyNode}
        </svg>
    );
}
