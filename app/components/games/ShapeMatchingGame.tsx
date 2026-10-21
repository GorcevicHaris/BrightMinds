"use client";

// Pogodi oblik — dete vidi uzorak i dodiruje isti oblik među ponuđenima.
// Nema vremena ni neuspeha: posle greške se pokušava ponovo, a posle onoliko grešaka koliko je
// zadato u podešavanjima deteta tačan oblik blago svetli. Broj ponuđenih oblika i zadataka
// takođe prati podešavanja (uzrast i izbor roditelja).

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    DemoHand,
    demoRounds,
    Feedback,
    finiteOr,
    GameHud,
    GamePrompt,
    GameStage,
    hintDue,
    PlayArea,
    playSfx,
    shuffle,
    PULSE_ONCE,
    useDemo,
    useGameSync,
    useInputGuard,
    useSayThen,
    useTimers,
    useWaitHint,
    type BaseView,
    type ChoiceState,
    type FeedbackKind,
    type GameProps,
    type TimerId,
    usePraise,
} from "@/app/components/games/kit";
import type { ResolvedSettings } from "@/lib/childSettings";
import { cn } from "@/lib/cn";
import { getGame, LEVELS_PER_TIER } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

// ── Boje ──────────────────────────────────────────────────────────────────────

type ColorId = "red" | "orange" | "yellow" | "green" | "teal" | "blue" | "purple" | "pink" | "gray";

/** Ispuna i tamnija ivica iste nijanse (ivica drži kontrast i na beloj kartici). */
const PALETTE: Record<ColorId, { fill: string; edge: string }> = {
    red: { fill: "#EF4444", edge: "#B91C1C" },
    orange: { fill: "#FB923C", edge: "#C2410C" },
    yellow: { fill: "#FBBF24", edge: "#B45309" },
    green: { fill: "#22C55E", edge: "#15803D" },
    teal: { fill: "#14B8A6", edge: "#0F766E" },
    blue: { fill: "#3B82F6", edge: "#1D4ED8" },
    purple: { fill: "#A855F7", edge: "#7E22CE" },
    pink: { fill: "#F472B6", edge: "#BE185D" },
    gray: { fill: "#94A3B8", edge: "#475569" },
};

const COLOR_IDS = Object.keys(PALETTE) as ColorId[];

// ── Oblici ────────────────────────────────────────────────────────────────────
// Svaki oblik ima `body` (silueta: nasleđuje ispunu i ivicu od roditeljskog <g>)
// i `details` (ukrasi koji se crtaju samo u punoj boji). Crtež je u okviru 100×100.

type ShapeId =
    | "heart"
    | "star"
    | "sun"
    | "house"
    | "flower"
    | "apple"
    | "car"
    | "tree"
    | "fish"
    | "balloon"
    | "moon"
    | "cloud"
    | "butterfly"
    | "diamond"
    | "lightning";

interface ShapeDefinition {
    name: string;
    /** Akuzativ za rečenice "Pronađi …" i "Tražimo …" (zadat za svaki oblik posebno, ne izvodi se iz imena) */
    acc: string;
    color: ColorId;
    /** Oblici slične siluete — koriste se kao teži ometači */
    similar: ShapeId[];
    body: ReactNode;
    details?: ReactNode;
}

const DARK = "#1F2937";
const EIGHT_TURNS = [0, 45, 90, 135, 180, 225, 270, 315];
const TWELVE_TURNS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

const STAR_POINTS = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 === 0 ? 44 : 19;
    const angle = ((i * 36 - 90) * Math.PI) / 180;
    return `${(50 + radius * Math.cos(angle)).toFixed(1)},${(52 + radius * Math.sin(angle)).toFixed(1)}`;
}).join(" ");

const APPLE_STEM = <rect x="48" y="12" width="5" height="22" rx="2.5" transform="rotate(8 50 23)" />;
const APPLE_LEAF = <path d="M54,22 C58,10 72,8 80,12 C76,24 62,28 54,22 Z" />;

const SHAPES: Record<ShapeId, ShapeDefinition> = {
    heart: {
        name: "Srce",
        acc: "srce",
        color: "red",
        similar: ["apple", "balloon", "diamond"],
        body: (
            <path d="M50,88 C50,88 10,61 10,36 C10,22 21,13 33,16 C40,18 46,23 50,29 C54,23 60,18 67,16 C79,13 90,22 90,36 C90,61 50,88 50,88 Z" />
        ),
        details: <ellipse cx="32" cy="34" rx="9" ry="5.5" fill="#fff" opacity="0.35" transform="rotate(-30 32 34)" />,
    },
    star: {
        name: "Zvezda",
        acc: "zvezdu",
        color: "purple",
        similar: ["sun", "flower", "diamond", "lightning"],
        body: <polygon points={STAR_POINTS} />,
        details: <ellipse cx="41" cy="40" rx="8" ry="4.5" fill="#fff" opacity="0.35" transform="rotate(-25 41 40)" />,
    },
    sun: {
        name: "Sunce",
        acc: "sunce",
        color: "yellow",
        similar: ["flower", "star", "apple"],
        body: (
            <>
                <circle cx="50" cy="50" r="25" />
                {TWELVE_TURNS.map((turn) => (
                    <rect key={turn} x="46.5" y="5" width="7" height="15" rx="3.5" transform={`rotate(${turn} 50 50)`} />
                ))}
            </>
        ),
        details: (
            <g opacity="0.75">
                <circle cx="42" cy="46" r="3" fill={DARK} />
                <circle cx="58" cy="46" r="3" fill={DARK} />
                <path d="M40,56 Q50,65 60,56" fill="none" stroke={DARK} strokeWidth="3" strokeLinecap="round" />
            </g>
        ),
    },
    house: {
        name: "Kućica",
        acc: "kućicu",
        color: "orange",
        similar: ["tree", "car", "diamond"],
        body: (
            <>
                <polygon points="50,8 92,44 8,44" />
                <rect x="18" y="40" width="64" height="52" rx="4" />
                <rect x="66" y="12" width="11" height="22" rx="2" />
            </>
        ),
        details: (
            <g fill="#fff" opacity="0.85">
                <rect x="43" y="64" width="14" height="28" rx="3" />
                <rect x="25" y="52" width="13" height="13" rx="2.5" />
                <rect x="62" y="52" width="13" height="13" rx="2.5" />
            </g>
        ),
    },
    flower: {
        name: "Cvet",
        acc: "cvet",
        color: "pink",
        similar: ["sun", "star", "butterfly"],
        body: (
            <>
                {EIGHT_TURNS.map((turn) => (
                    <ellipse key={turn} cx="76" cy="50" rx="15" ry="10" transform={`rotate(${turn} 50 50)`} />
                ))}
                <circle cx="50" cy="50" r="16" />
            </>
        ),
        details: (
            <>
                <circle cx="50" cy="50" r="14" fill="#FEF3C7" />
                <circle cx="50" cy="50" r="7" fill="#F59E0B" />
            </>
        ),
    },
    apple: {
        name: "Jabuka",
        acc: "jabuku",
        color: "red",
        similar: ["heart", "balloon", "sun"],
        body: (
            <>
                <path d="M50,32 C42,22 14,24 14,52 C14,74 30,94 42,94 C46,94 48,92 50,92 C52,92 54,94 58,94 C70,94 86,74 86,52 C86,24 58,22 50,32 Z" />
                {APPLE_STEM}
                {APPLE_LEAF}
            </>
        ),
        details: (
            <>
                <g fill="#92400E">{APPLE_STEM}</g>
                <g fill="#16A34A">{APPLE_LEAF}</g>
                <ellipse cx="31" cy="50" rx="5.5" ry="10" fill="#fff" opacity="0.3" transform="rotate(18 31 50)" />
            </>
        ),
    },
    car: {
        name: "Auto",
        acc: "auto",
        color: "blue",
        similar: ["house", "fish", "cloud"],
        body: (
            <>
                <rect x="6" y="46" width="88" height="26" rx="9" />
                <path d="M24,50 L35,29 Q37,25 42,25 L63,25 Q68,25 70,29 L81,50 Z" />
                <circle cx="28" cy="72" r="12" />
                <circle cx="72" cy="72" r="12" />
            </>
        ),
        details: (
            <>
                <g fill="#fff" opacity="0.85">
                    <path d="M33,46 L40,32 Q41,30 44,30 L50,30 L50,46 Z" />
                    <path d="M54,30 L61,30 Q64,30 65,32 L72,46 L54,46 Z" />
                </g>
                <rect x="86" y="52" width="5" height="7" rx="2" fill="#FEF3C7" />
                <circle cx="28" cy="72" r="10.5" fill={DARK} />
                <circle cx="72" cy="72" r="10.5" fill={DARK} />
                <circle cx="28" cy="72" r="4" fill="#CBD5E1" />
                <circle cx="72" cy="72" r="4" fill="#CBD5E1" />
            </>
        ),
    },
    tree: {
        name: "Drvo",
        acc: "drvo",
        color: "green",
        similar: ["house", "lightning", "diamond"],
        body: (
            <>
                <polygon points="50,4 27,36 73,36" />
                <polygon points="50,20 19,58 81,58" />
                <polygon points="50,38 11,80 89,80" />
                <rect x="43" y="76" width="14" height="20" rx="2" />
            </>
        ),
        details: <rect x="43.5" y="81" width="13" height="14.5" rx="2" fill="#92400E" />,
    },
    fish: {
        name: "Riba",
        acc: "ribu",
        color: "teal",
        similar: ["car", "cloud", "butterfly"],
        body: (
            <>
                <ellipse cx="42" cy="50" rx="34" ry="22" />
                <polygon points="68,50 94,28 94,72" />
                <polygon points="34,30 54,14 58,32" />
            </>
        ),
        details: (
            <>
                <circle cx="24" cy="44" r="5.5" fill="#fff" />
                <circle cx="23" cy="44" r="2.6" fill={DARK} />
                <path d="M38,38 Q44,50 38,62" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            </>
        ),
    },
    balloon: {
        name: "Balon",
        acc: "balon",
        color: "pink",
        similar: ["apple", "heart", "moon"],
        body: (
            <>
                <ellipse cx="50" cy="42" rx="31" ry="36" />
                <polygon points="50,76 43,87 57,87" />
            </>
        ),
        details: (
            <>
                <ellipse cx="38" cy="28" rx="6" ry="10" fill="#fff" opacity="0.4" transform="rotate(-25 38 28)" />
                <path d="M50,88 Q45,93 50,97 T50,104" fill="none" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round" />
            </>
        ),
    },
    moon: {
        name: "Mesec",
        acc: "mesec",
        color: "yellow",
        similar: ["balloon", "sun", "apple"],
        body: <path d="M82,12 A42,42 0 1,0 82,88 A46,46 0 0,1 82,12 Z" />,
        details: (
            <g fill="#fff" opacity="0.35">
                <circle cx="38" cy="40" r="5" />
                <circle cx="46" cy="64" r="3.5" />
            </g>
        ),
    },
    cloud: {
        name: "Oblak",
        acc: "oblak",
        color: "gray",
        similar: ["car", "fish", "flower"],
        body: (
            <>
                <circle cx="30" cy="60" r="17" />
                <circle cx="50" cy="44" r="23" />
                <circle cx="72" cy="58" r="19" />
                <rect x="30" y="55" width="42" height="22" rx="6" />
            </>
        ),
        details: <ellipse cx="44" cy="36" rx="9" ry="4.5" fill="#fff" opacity="0.45" transform="rotate(-20 44 36)" />,
    },
    butterfly: {
        name: "Leptir",
        acc: "leptira",
        color: "purple",
        similar: ["flower", "fish", "heart"],
        body: (
            <>
                <path d="M48,50 C42,22 14,12 10,32 C7,50 28,58 48,54 Z" />
                <path d="M52,50 C58,22 86,12 90,32 C93,50 72,58 52,54 Z" />
                <path d="M48,54 C28,54 14,66 20,82 C26,94 44,84 48,60 Z" />
                <path d="M52,54 C72,54 86,66 80,82 C74,94 56,84 52,60 Z" />
                <rect x="46" y="28" width="8" height="52" rx="4" />
            </>
        ),
        details: (
            <>
                <g fill="#fff" opacity="0.55">
                    <circle cx="28" cy="34" r="5" />
                    <circle cx="72" cy="34" r="5" />
                    <circle cx="31" cy="74" r="4" />
                    <circle cx="69" cy="74" r="4" />
                </g>
                <rect x="46.5" y="29" width="7" height="50" rx="3.5" fill={DARK} />
                <path d="M48,30 Q44,18 36,16 M52,30 Q56,18 64,16" fill="none" stroke={DARK} strokeWidth="2" strokeLinecap="round" />
            </>
        ),
    },
    diamond: {
        name: "Dijamant",
        acc: "dijamant",
        color: "teal",
        similar: ["star", "lightning", "heart"],
        body: <polygon points="50,6 92,40 50,96 8,40" />,
        details: (
            <>
                <polygon points="50,6 92,40 8,40" fill="#fff" opacity="0.22" />
                <polyline points="30,40 50,6 70,40 50,96 30,40" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" opacity="0.55" />
            </>
        ),
    },
    lightning: {
        name: "Munja",
        acc: "munju",
        color: "orange",
        similar: ["diamond", "star", "tree"],
        body: <polygon points="44,4 72,4 56,40 80,40 36,96 46,56 24,56" />,
    },
};

/** Redosled uvođenja: prvo najpoznatiji i međusobno najrazličitiji oblici. */
const POOL = Object.keys(SHAPES) as ShapeId[];

type Look = "color" | "shadow" | "outline";

interface ShapeArtProps {
    shape: ShapeId;
    color: ColorId;
    look?: Look;
    /** Ugao u stepenima (teži nivoi) */
    rot?: number;
    /** Veličina u odnosu na okvir (1 = ceo okvir) */
    scale?: number;
    /** Kada je zadat, crtež se čita kao slika; inače je ukras unutar dugmeta */
    label?: string;
    className?: string;
}

function ShapeArt({ shape, color, look = "color", rot = 0, scale = 1, label, className }: ShapeArtProps) {
    const def = SHAPES[shape];
    const paint = PALETTE[color];
    // Dva sloja istog tela: širi daje ivicu oko celog oblika, uži ispunu — bez linija na spojevima delova.
    const outer = look === "color" ? paint.edge : "currentColor";
    const inner = look === "color" ? paint.fill : look === "outline" ? "#fff" : "currentColor";
    return (
        <svg
            viewBox="-6 -6 112 112"
            className={cn("text-ink", className)}
            style={rot || scale !== 1 ? { transform: `rotate(${rot}deg) scale(${scale})` } : undefined}
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
        >
            <g fill={outer} stroke={outer} strokeWidth={look === "outline" ? 8 : 6} strokeLinejoin="round">
                {def.body}
            </g>
            <g fill={inner} stroke={inner} strokeWidth={1} strokeLinejoin="round">
                {def.body}
            </g>
            {look === "color" && def.details}
        </svg>
    );
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

/** natural: svaki oblik u svojoj boji · uniform: svi u istoj boji · mixed: tačan oblik je u drugoj boji od uzorka */
type Coloring = "natural" | "uniform" | "mixed";

interface LevelConfig {
    rounds: number;
    options: 2 | 3 | 4 | 6;
    /** Koliko oblika iz POOL-a učestvuje */
    pool: number;
    look: Look;
    coloring: Coloring;
    /** Koliko ometača se bira među sličnim oblicima */
    similar: number;
    rotate: boolean;
}

const LEVELS: LevelConfig[] = [
    // Lako: uzorak i ponuđeni oblici izgledaju isto, raste broj ponuđenih
    { rounds: 5, options: 2, pool: 6, look: "color", coloring: "natural", similar: 0, rotate: false },
    { rounds: 5, options: 3, pool: 8, look: "color", coloring: "natural", similar: 0, rotate: false },
    { rounds: 6, options: 3, pool: 10, look: "color", coloring: "natural", similar: 1, rotate: false },
    { rounds: 6, options: 4, pool: 12, look: "color", coloring: "natural", similar: 1, rotate: false },
    { rounds: 6, options: 4, pool: 15, look: "color", coloring: "uniform", similar: 1, rotate: false },
    // Srednje: senke i obrisi, boja više ne pomaže, sličniji ometači
    { rounds: 6, options: 4, pool: 15, look: "shadow", coloring: "natural", similar: 1, rotate: false },
    { rounds: 7, options: 4, pool: 15, look: "shadow", coloring: "uniform", similar: 2, rotate: false },
    { rounds: 7, options: 6, pool: 15, look: "shadow", coloring: "natural", similar: 2, rotate: false },
    { rounds: 7, options: 6, pool: 15, look: "shadow", coloring: "uniform", similar: 3, rotate: false },
    { rounds: 7, options: 6, pool: 15, look: "outline", coloring: "uniform", similar: 3, rotate: false },
    // Teško: isti oblik u drugoj boji (uz mamac u boji uzorka) i okrenuti oblici.
    // Svaki nivo menja nešto što se vidi i kad je broj ponuđenih oblika ograničen podešavanjima.
    { rounds: 7, options: 4, pool: 15, look: "color", coloring: "mixed", similar: 2, rotate: false },
    { rounds: 8, options: 6, pool: 15, look: "color", coloring: "mixed", similar: 3, rotate: true },
    { rounds: 8, options: 6, pool: 15, look: "shadow", coloring: "uniform", similar: 3, rotate: true },
    { rounds: 8, options: 6, pool: 15, look: "outline", coloring: "uniform", similar: 3, rotate: true },
    { rounds: 8, options: 6, pool: 15, look: "outline", coloring: "mixed", similar: 4, rotate: true },
];

const TURNS = [-135, -90, -45, 45, 90, 135, 180];
/** Veličine primerka u pločici: isti oblik nije uvek iste veličine, pa se traži oblik, a ne istovetna sličica */
const SIZES = [1, 0.86, 0.72];
/** Mlađa deca svaki laki nivo počinju zadatkom sa samo dva ponuđena oblika */
const WARM_UP_OPTIONS = 2;

function levelIndex(level: number): number {
    return Math.min(Math.max(Math.round(level) || 1, 1), LEVELS.length) - 1;
}

/** Granice nivoa posle primene podešavanja deteta (uzrast i izbor roditelja). */
interface PlanLimits {
    rounds: number;
    options: number;
    /** Prvi zadatak nudi samo dva oblika */
    warmUp: boolean;
}

function limitsFor(level: number, settings: ResolvedSettings): PlanLimits {
    const index = levelIndex(level);
    return {
        rounds: Math.min(LEVELS[index].rounds, settings.preset.maxRounds),
        options: Math.min(LEVELS[index].options, settings.choiceLimit),
        warmUp: settings.activeBand === "young" && index < LEVELS_PER_TIER,
    };
}

// ── View ──────────────────────────────────────────────────────────────────────

interface ShapeOption {
    shape: ShapeId;
    color: ColorId;
    rot: number;
    /** Veličina primerka u pločici (1 = cela pločica) */
    scale: number;
}

/**
 * `correctCount` = zadaci rešeni samostalno iz prvog pokušaja, `incorrectCount` = pogrešni dodiri
 * (svaka pogrešna opcija se broji jednom, jer posle greške ostaje isključena).
 */
export interface ShapesView extends BaseView {
    /** Traženi oblik i način na koji je uzorak nacrtan */
    target: ShapeId;
    targetColor: ColorId;
    look: Look;
    options: ShapeOption[];
    /** Indeksi pogrešno izabranih opcija u ovom zadatku (ostaju zatamnjene) */
    wrong: number[];
    /** Poslednja dodirnuta opcija dok traje povratna poruka */
    picked: number | null;
    feedback: FeedbackKind;
    /** Tačan oblik je blago istaknut (posle onoliko grešaka koliko je zadato u podešavanjima deteta) */
    hint: boolean;
    /** Zadaci rešeni tek pošto je tačan oblik istaknut */
    promptedCount: number;
}

type RoundPlan = Pick<ShapesView, "target" | "targetColor" | "options">;

function pickOne<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

/** Svi zadaci nivoa unapred. Traženi oblici su različiti, pa se isti nikad ne ponavlja dva puta zaredom. */
function buildPlan(cfg: LevelConfig, limits: PlanLimits): RoundPlan[] {
    const pool = POOL.slice(0, cfg.pool);
    return shuffle(pool)
        .slice(0, limits.rounds)
        .map((target, round) => {
            const count = limits.warmUp && round === 0 ? Math.min(limits.options, WARM_UP_OPTIONS) : limits.options;
            const lookAlikes = SHAPES[target].similar.filter((shape) => pool.includes(shape));
            const similar = shuffle(lookAlikes).slice(0, cfg.similar);
            let others = shuffle(pool.filter((shape) => shape !== target && !similar.includes(shape)));
            // Dok se slični oblici još ne traže, ometači se jasno razlikuju: ni sličan oblik ni ista boja
            if (cfg.similar === 0 && cfg.coloring === "natural") {
                const distinct = others.filter((shape) => !lookAlikes.includes(shape) && SHAPES[shape].color !== SHAPES[target].color);
                if (distinct.length >= count - 1) others = distinct;
            }
            const distractors = [...similar, ...others].slice(0, count - 1);

            const shared = pickOne(COLOR_IDS);
            const targetColor = cfg.coloring === "uniform" ? shared : SHAPES[target].color;
            const spare = shuffle(COLOR_IDS.filter((color) => color !== targetColor));
            const sizes = shuffle(SIZES);

            const options = [target, ...distractors].map((shape, i): ShapeOption => {
                let color = SHAPES[shape].color;
                if (cfg.coloring === "uniform") color = shared;
                // Tačan oblik (i = 0) dobija drugu boju, a prvi ometač (i = 1) je mamac u boji uzorka
                if (cfg.coloring === "mixed") color = i === 1 ? targetColor : spare[i % spare.length];
                return { shape, color, rot: cfg.rotate ? pickOne(TURNS) : 0, scale: sizes[i % sizes.length] };
            });

            return { target, targetColor, options: shuffle(options) };
        });
}

function emptyView(cfg: LevelConfig, rounds: number): ShapesView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: rounds,
        target: POOL[0],
        targetColor: SHAPES[POOL[0]].color,
        look: cfg.look,
        options: [],
        wrong: [],
        picked: null,
        feedback: null,
        hint: false,
        promptedCount: 0,
    };
}

function hasKey<T extends object>(record: T, key: unknown): key is keyof T {
    return typeof key === "string" && Object.prototype.hasOwnProperty.call(record, key);
}

function toOption(value: unknown): ShapeOption | null {
    if (typeof value !== "object" || value === null) return null;
    const { shape, color, rot, scale } = value as Partial<ShapeOption>;
    if (!hasKey(SHAPES, shape) || !hasKey(PALETTE, color)) return null;
    return { shape, color, rot: finiteOr(rot, 0), scale: finiteOr(scale, 1) };
}

/** Stanje za monitor: podrazumevane vrednosti + ono što je stiglo, uz proveru polja od kojih zavisi crtanje. */
function toShown(fallback: ShapesView, state: Partial<ShapesView> | null | undefined): ShapesView {
    const merged = { ...fallback, ...state };
    const options: unknown[] = Array.isArray(merged.options) ? merged.options : [];
    return {
        ...merged,
        target: hasKey(SHAPES, merged.target) ? merged.target : fallback.target,
        targetColor: hasKey(PALETTE, merged.targetColor) ? merged.targetColor : fallback.targetColor,
        look: merged.look === "shadow" || merged.look === "outline" ? merged.look : "color",
        options: options.map(toOption).filter((option): option is ShapeOption => option !== null),
        wrong: Array.isArray(merged.wrong) ? merged.wrong : [],
    };
}

// ── Tekstovi ──────────────────────────────────────────────────────────────────
// Kratko, doslovno i mirno: jedna rečenica po poruci, bez pohvala ličnosti i bez roda.

function promptFor(view: ShapesView): { title: string; subtitle: string } {
    const correct = view.options.find((option) => option.shape === view.target);
    const recolored = view.look === "color" && correct !== undefined && correct.color !== view.targetColor;
    const rotated = view.options.some((option) => option.rot);

    let title = `Pronađi ${SHAPES[view.target].acc}`;
    const steps = ["Nađi isti oblik."];
    if (view.look === "shadow") {
        title = "Čija je ovo senka?";
        steps[0] = "Nađi oblik sa ovom senkom.";
    } else if (view.look === "outline") {
        title = "Koji je ovo oblik?";
    }
    if (recolored) steps.push("Boja može biti drugačija.");
    if (rotated) steps.push("Oblik može biti okrenut.");
    return { title, subtitle: steps.join(" ") };
}

/** Na početku nivoa i na dugme "Ponovi" izgovara se celo uputstvo, u narednim zadacima samo pitanje. */
function speechFor(view: ShapesView, full: boolean): string {
    const { title, subtitle } = promptFor(view);
    const question = title.endsWith("?") ? title : `${title}.`;
    return full ? `${question} ${subtitle}` : question;
}

const WRONG_FIRST = "Nije to. Probaj opet.";

/** Tačno: imenuje se pronađeni oblik. Prva greška: poziv na novi pokušaj. Svaka sledeća: ponavlja se šta tražimo. */
function feedbackText(view: ShapesView): string {
    const target = SHAPES[view.target];
    if (view.feedback === "correct") return `To je ${target.name.toLowerCase()}.`;
    return view.wrong.length >= 2 ? `Tražimo ${target.acc}.` : WRONG_FIRST;
}

const TARGET_LABEL: Record<Look, (name: string) => string> = {
    color: (name) => name,
    shadow: () => "Senka oblika",
    outline: () => "Obris oblika",
};

function choiceState(view: ShapesView, index: number): ChoiceState {
    if (view.feedback === "correct") return index === view.picked ? "correct" : "dimmed";
    if (view.feedback === "wrong" && index === view.picked) return "wrong";
    if (view.wrong.includes(index)) return "dimmed";
    if (view.hint && view.options[index]?.shape === view.target) return "hint";
    return "idle";
}

// ── Raspored ──────────────────────────────────────────────────────────────────
// Broj kolona prati broj opcija i položaj ekrana; pločica se smanjuje da tabla stane u visinu ekrana,
// ali nikad ispod 5rem (80 px), sa razmakom od najmanje 12 px.

const DEFAULT_LAYOUT = "[--cols:3] [--rows:2]";
const LAYOUT: Record<number, string> = {
    2: "[--cols:2] [--rows:1]",
    3: "[--cols:3] [--rows:1]",
    4: "[--cols:2] [--rows:2] landscape:[--cols:4] landscape:[--rows:1]",
    6: "[--cols:3] [--rows:2] landscape:[--cols:6] landscape:[--rows:1]",
};

/** Mesto za traženi oblik: veliko, ali tako da ponuđeni oblici i dalje staju na ekran */
const TARGET_STYLE: CSSProperties = { width: "clamp(5rem, 16dvh, 11rem)", height: "clamp(5rem, 16dvh, 11rem)" };

const BOARD_STYLE = {
    // ≈23rem zauzimaju zaglavlje, traka napretka, uputstvo i poruka, a još do 12rem mesto za oblik
    "--tile": "clamp(4.5rem, calc((100dvh - 23rem - min(16dvh, 11rem) - 1.5rem) / var(--rows) - var(--gap)), 14rem)",
    gap: "var(--gap)",
    gridTemplateColumns: "repeat(var(--cols), minmax(0, 1fr))",
    maxWidth: "calc(var(--cols) * var(--tile) + (var(--cols) - 1) * var(--gap))",
} as CSSProperties;

// ── Igra ──────────────────────────────────────────────────────────────────────

const GAME = getGame("shapes");
const WRONG_FEEDBACK_MS = 1400;

export default function ShapeMatchingGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<ShapesView>) {
    const cfg = LEVELS[levelIndex(level)];
    const settings = useChildSettings();

    const sync = useGameSync<ShapesView>({ childId, gameId: "shapes", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    // Sledeći zadatak čeka da glas izgovori „To je …” — ni kraće ni duže nego što treba
    const sayThen = useSayThen(say, after);
    // Pohvala uz potvrdu tačnog odgovora (menja se, a posle niza tačnih ohrabruje)
    const praise = usePraise();
    const guard = useInputGuard();
    const demo = useDemo(!isMonitor);

    // Monitor nema podešavanja deteta: sve što crta stiže u `monitorState`
    const [plan] = useState<RoundPlan[]>(() => (isMonitor ? [] : buildPlan(cfg, limitsFor(level, settings))));
    const [view, setView] = useState<ShapesView>(() => ({ ...emptyView(cfg, plan.length || cfg.rounds), ...plan[0] }));

    // Poslednje stanje za rukovaoce i tajmere (dva brza dodira ne vide zastarelo stanje)
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);

    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: ShapesView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
    }, [isMonitor, sync, guard]);

    useEffect(() => {
        if (!isMonitor) say(speechFor(viewRef.current, true));
    }, [isMonitor, say]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        // total    = broj zadataka
        // correct  = zadaci rešeni samostalno iz prvog pokušaja (osnova za zvezdice)
        // prompted = zadaci rešeni tek pošto je tačan oblik istaknut
        // Ostatak (total − correct − prompted) su zadaci rešeni posle više pokušaja, ali bez pomoći.
        onCompleteRef.current({
            score: final.score,
            durationSec: sync.elapsedSec(),
            correct: final.correctCount,
            total: Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1),
            prompted: final.promptedCount,
        });
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        const next: ShapesView = {
            ...viewRef.current,
            ...round,
            round: index + 1,
            wrong: [],
            picked: null,
            feedback: null,
            hint: false,
        };
        // Dodir koji je ostao od prethodnog zadatka ne sme da odgovori na novi
        guard.hold();
        commit(next, `Zadatak ${index + 1}: traži se ${SHAPES[round.target].name.toLowerCase()}`);
        demo.show();
        say(speechFor(next, false));
    };

    const handlePick = (index: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const option = current.options[index];
        // Već rešen zadatak ili opcija koja je već bila pogrešna: ponovljeni dodir se ne broji
        if (!option || current.feedback === "correct" || current.wrong.includes(index)) return;

        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const targetName = SHAPES[current.target].name.toLowerCase();

        if (option.shape === current.target) {
            // Zadatak koji je pokazala ruka (prvi u prvom nivou) je pokazivanje, a ne zadatak:
            // ne broji se ni kao samostalan ni kao uz pomoć, a nivo se ocenjuje bez njega (DEMO_ROUNDS)
            // Ceo prvi zadatak prvog nivoa je van ocene (i kad dete prvo pogreši): inače bi „uz pomoć”
            // premašilo broj ocenjenih zadataka, pa bi server odbio rezultat.
            const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
            const firstTry = current.wrong.length === 0 && !modeled && !current.hint;
            const prompted = current.hint && !modeled;
            const isLast = current.round >= current.totalRounds;
            const solved: ShapesView = {
                ...current,
                picked: index,
                feedback: "correct",
                hint: false,
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (prompted ? 1 : 0),
            };
            const how = firstTry ? "iz prvog pokušaja" : prompted ? "uz pomoć" : `iz ${current.wrong.length + 1}. pokušaja`;
            commit(solved, `Tačno ${how}: ${targetName}`);
            // Zvuk kraja nivoa pušta strana koja prikazuje rezultat — ovde samo potvrda tačnog odgovora
            playSfx("correct");
            sayThen(praise(feedbackText(solved), firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy" });
            return;
        }

        const wrong = [...current.wrong, index];
        // Pomoć stiže posle zadatog broja grešaka, a najkasnije kad ostane samo tačan oblik
        const hint = hintDue(settings.hintAfter, wrong.length, current.options.length - 1);
        const missed: ShapesView = { ...current, picked: index, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 };
        commit(
            missed,
            `Greška: izabrano ${SHAPES[option.shape].name.toLowerCase()}, traži se ${targetName}${hint && !current.hint ? " (prikazana pomoć)" : ""}`
        );
        playSfx("wrong");
        say(feedbackText(missed), undefined, "gentle");
        // Kratka pauza: nekoliko brzih dodira zaredom ne postaje nekoliko grešaka
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    // Pomoć posle čekanja: dete koje dugo ne zna kako dalje dobija blago istaknut tačan oblik
    // (pre greške, ne posle nje). Zadatak tada važi kao rešen uz pomoć.
    useWaitHint(!isMonitor && settings.waitHint, view.round, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback || current.options.length === 0) return;
        if (level === 1 && current.round === 1 && current.wrong.length === 0) return; // taj zadatak pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        demo.show();
        say(speechFor(viewRef.current, true));
    };

    const shown = isMonitor ? toShown(emptyView(cfg, cfg.rounds), monitorState) : view;
    // Poeni su broj: mlađoj deci se ne prikazuju (roditelj ih na monitoru vidi)
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (shown.options.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    // Prvi zadatak prvog nivoa se pokazuje rukom; čim dete dodirne bilo šta, ruke više nema
    const showHand = !isMonitor && level === 1 && shown.round === 1 && shown.wrong.length === 0 && shown.feedback === null;
    const prompt = promptFor(shown);
    const message = feedbackText(shown);
    const solved = shown.feedback === "correct";

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up" title={prompt.title} subtitle={prompt.subtitle} />

            <PlayArea accent={GAME.accent}>
                {/* Mesto za oblik: traženi oblik je veliki, u sredini polja, iznad ponuđenih. Kad dete
                    pogodi, senka ili obris se „popune” bojom — oblik je stao na svoje mesto. */}
                <div
                    key={`target-${shown.round}-${demo.run}`}
                    className={cn(
                        "mb-3 grid shrink-0 animate-fade-up place-items-center rounded-3xl border-4 border-dashed bg-white/80 transition-colors sm:mb-6",
                        solved ? "border-emerald-300" : "border-brand-200",
                        demo.on && "animate-soft-pulse ring-4 ring-brand-300"
                    )}
                    style={{ ...TARGET_STYLE, ...(demo.on ? PULSE_ONCE : undefined) }}
                >
                    <ShapeArt
                        key={solved ? "filled" : "empty"}
                        shape={shown.target}
                        color={shown.targetColor}
                        look={solved ? "color" : shown.look}
                        label={TARGET_LABEL[shown.look](SHAPES[shown.target].name)}
                        className={cn("h-[72%] w-[72%]", solved && "animate-pop")}
                    />
                </div>
                <div
                    key={`options-${shown.round}`}
                    role="group"
                    aria-label="Ponuđeni oblici"
                    className={cn(
                        "mx-auto grid w-full animate-fade-up [--gap:0.75rem] sm:[--gap:0.875rem]",
                        LAYOUT[shown.options.length] ?? DEFAULT_LAYOUT,
                        isMonitor && "pointer-events-none"
                    )}
                    style={BOARD_STYLE}
                >
                    {shown.options.map((option, index) => {
                        const state = choiceState(shown, index);
                        return (
                            <ChoiceCard
                                key={index}
                                state={state}
                                disabled={isMonitor || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(index)}
                                aria-label={SHAPES[option.shape].name}
                                className="aspect-square"
                            >
                                <span className={cn("absolute grid place-items-center", option.rot ? "inset-[17%]" : "inset-[11%]")}>
                                    <ShapeArt shape={option.shape} color={option.color} rot={option.rot} scale={option.scale} className="h-full w-full" />
                                </span>
                                {showHand && option.shape === shown.target && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}
