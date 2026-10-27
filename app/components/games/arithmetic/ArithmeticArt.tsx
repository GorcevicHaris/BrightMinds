// Crteži igre „Računanje”: male scene (grana, jezero, list, garaža, korpa, planeta, gnezdo
// dinosaurusa, sto, park), okviri sa deset mesta (kutija za jaja, gajbica, parking) i predmeti
// koji mirno dolaze i odlaze. Predmeti su iz zajedničkih slika (pictures/), a jaje dinosaurusa
// i beba dinosaurusa su nacrtani ovde, u istom stilu (tanka tamnija ivica, odsjaj, oči sa
// sjajem i rumeni obrazi). Pokret ide CSS prelazom; uz „manje pokreta” predmeti samo izblede.

import type { CSSProperties, ReactNode } from "react";
import { Picture, type PictureId } from "@/app/components/games/pictures";
import { Cheek, Eye, INK, line, Shine, Smile } from "@/app/components/games/pictures/kit";
import { Figure } from "@/app/components/games/scene/figures";
import {
    ITEMS,
    NAMES,
    THEMES,
    tokensFor,
    twoFrames,
    type ArithmeticTask,
    type ItemId,
    type StepId,
    type ThemeId,
    type Token,
} from "@/app/components/games/data/arithmeticLevels";

// ── Predmeti ──────────────────────────────────────────────────────────────────

const ITEM_PICTURE: Partial<Record<ItemId, PictureId>> = {
    bird: "bird",
    fish: "fish",
    ladybug: "ladybug",
    car: "car",
    toyCar: "car",
    apple: "apple",
    strawberry: "strawberry",
    rocket: "rocket",
    egg: "egg",
    balloon: "balloon",
    cupcake: "cupcake",
};

/** Jaje dinosaurusa (100 × 100): zelenkasto, sa tačkicama */
function DinoEgg() {
    return (
        <g>
            <ellipse cx={50} cy={94} rx={24} ry={3.2} fill="#000000" opacity={0.08} />
            <path d="M50 10 C72 10 82 44 82 62 C82 82 68 93 50 93 C32 93 18 82 18 62 C18 44 28 10 50 10Z" fill="#cfeec0" {...line("#6f9f62", 2)} />
            <circle cx={38} cy={40} r={5} fill="#8fc97f" />
            <circle cx={60} cy={32} r={3.6} fill="#8fc97f" />
            <circle cx={64} cy={60} r={6} fill="#8fc97f" />
            <circle cx={40} cy={72} r={4} fill="#8fc97f" />
            <circle cx={55} cy={82} r={3} fill="#8fc97f" />
            <Shine x={36} y={28} rx={4} ry={8} rotate={18} />
        </g>
    );
}

/** Beba dinosaurusa viri iz razbijene ljuske (100 × 100) */
function HatchedDino() {
    return (
        <g>
            <ellipse cx={50} cy={94} rx={26} ry={3.2} fill="#000000" opacity={0.08} />
            {/* Glava i vrat */}
            <path d="M40 66 C38 48 40 30 52 24 C66 18 80 26 80 38 C80 48 72 52 62 52 C58 56 58 62 58 66Z" fill="#8fd38f" {...line("#4f9a55", 2)} />
            <path d="M54 22 L57 14 L61 21 M64 21 L68 14 L70 23" fill="#f6c46a" {...line("#c99436", 1.6)} />
            <Eye x={66} y={34} r={3.6} />
            <Cheek x={72} y={43} r={3.4} />
            <Smile x={73} y={45} w={4} />
            <circle cx={78} cy={36} r={1.2} fill={INK} />
            {/* Donja ljuska sa cik-cak ivicom */}
            <path d="M20 66 L28 58 L35 66 L43 57 L50 66 L58 57 L65 66 L72 58 L80 66 C82 84 68 93 50 93 C32 93 18 84 20 66Z" fill="#cfeec0" {...line("#6f9f62", 2)} />
            <circle cx={36} cy={80} r={4} fill="#8fc97f" />
            <circle cx={62} cy={78} r={5} fill="#8fc97f" />
            {/* Gornja ljuska kao kapica */}
            <path d="M38 22 C40 10 58 6 64 14 L58 18 L52 13 L46 19 Z" fill="#cfeec0" {...line("#6f9f62", 1.6)} transform="rotate(-14 50 16)" />
        </g>
    );
}

/** Predmet u kvadratu `size`, sa središtem u (x, y) */
export function ItemArt({ item, x, y, size, hatched = false }: { item: ItemId; x: number; y: number; size: number; hatched?: boolean }) {
    if (item === "dinoEgg") {
        return (
            <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 100 100" overflow="visible" aria-hidden="true">
                {hatched ? <HatchedDino /> : <DinoEgg />}
            </svg>
        );
    }
    const id = ITEM_PICTURE[item] ?? "star";
    return <Picture id={id} x={x - size / 2} y={y - size / 2} width={size} height={size} />;
}

/** Samostalna slika predmeta (npr. na kartici priče) */
export function ItemPicture({ item, className }: { item: ItemId; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            <ItemArt item={item} x={50} y={50} size={100} />
        </svg>
    );
}

// ── Pokret ────────────────────────────────────────────────────────────────────

type Vec = readonly [number, number];
const STILL: Vec = [0, 0];

/** Odakle predmeti dolaze i kuda odlaze (u jedinicama scene) */
const ENTER: Partial<Record<ThemeId, Vec>> = {
    branch: [380, -320],
    pond: [520, 0],
    leaf: [220, -340],
    garage: [-640, 0],
    basket: [0, -380],
    space: [0, -440],
    carton: [0, -300],
    parking: [-620, 0],
    crate: [0, -300],
};
const EXIT: Partial<Record<ThemeId, Vec>> = {
    branch: [-380, -320],
    pond: [-520, 0],
    leaf: [-220, -340],
    garage: [640, 0],
    basket: [0, -380],
    space: [0, -440],
    carton: [0, -300],
    parking: [620, 0],
    crate: [0, -300],
};
const STORY_MOVE: Readonly<Record<StepId, Vec>> = {
    give: [560, 0],
    gift: [0, -360],
    pick: [0, -360],
    flyAway: [0, -460],
    eat: STILL,
    giveAway: [560, 0],
};

function moveFor(task: ArithmeticTask, token: Token, leaving: boolean): Vec {
    if (task.kind === "story") return STORY_MOVE[task.steps[token.step - 1] ?? "give"] ?? STILL;
    return (leaving ? EXIT : ENTER)[task.theme] ?? STILL;
}

/**
 * Stanje predmeta za dati korak scene: tu je, još nije stigao (`before`) ili je otišao (`after`).
 * Na nivoima bez pokreta (samo rečenica) sve je već završeno.
 */
function placeState(token: Token, step: number): "here" | "before" | "after" {
    if (token.kind === "arrive") return step >= token.step ? "here" : "before";
    if (token.kind === "leave") return step >= token.step ? "after" : "here";
    return "here";
}

const BADGE = "#e8641c";

/** Redni broj na predmetu (pomoć: brojimo zajedno) */
function Badge({ x, y, n, r = 15 }: { x: number; y: number; n: number; r?: number }) {
    return (
        <g aria-hidden="true">
            <circle cx={x} cy={y} r={r} fill={BADGE} stroke="#ffffff" strokeWidth={3} />
            <text x={x} y={y + r * 0.38} textAnchor="middle" fontSize={r * 1.15} fontWeight={900} fill="#ffffff" fontFamily="inherit">
                {n}
            </text>
        </g>
    );
}

interface Place {
    x: number;
    y: number;
    size: number;
}

/** Jedan predmet koji (možda) dolazi ili odlazi, sa bledim tragom kad ode */
function MovingToken({ task, token, place, step, calm, number }: { task: ArithmeticTask; token: Token; place: Place; step: number; calm: boolean; number: number | null }) {
    const state = placeState(token, step);
    const hatch = task.theme === "nest" && token.kind === "leave" && task.kind !== "story";
    const [dx, dy] = state === "here" || calm || hatch ? STILL : moveFor(task, token, state === "after");
    const still = dx === 0 && dy === 0;
    const away = state !== "here";
    const style: CSSProperties = {
        transform: `translate(${dx}px, ${dy}px) scale(${away && still && !hatch && !calm ? 0.6 : 1})`,
        transformBox: "fill-box",
        transformOrigin: "center",
        opacity: away ? 0 : 1,
        transition: calm ? "opacity 600ms ease" : "transform 1150ms cubic-bezier(0.3, 0.7, 0.3, 1), opacity 900ms ease",
    };
    const gone = token.kind === "leave" && state === "after";
    return (
        <g>
            {token.kind === "leave" &&
                (hatch ? (
                    <g style={{ opacity: gone ? 1 : 0, transition: "opacity 700ms ease" }}>
                        <ItemArt item={task.item} x={place.x} y={place.y} size={place.size} hatched />
                    </g>
                ) : (
                    <Ghost task={task} place={place} shown={gone} />
                ))}
            <g style={style}>
                <ItemArt item={task.item} x={place.x} y={place.y} size={place.size} />
            </g>
            {number !== null && <Badge x={place.x + place.size * 0.38} y={place.y - place.size * 0.38} n={number} r={Math.max(12, place.size * 0.17)} />}
        </g>
    );
}

/** Bled trag predmeta koji je otišao (ili predmeta koji se tek traži) */
function Ghost({ task, place, shown, strong = false }: { task: ArithmeticTask; place: Place; shown: boolean; strong?: boolean }) {
    return (
        <g style={{ opacity: shown ? 1 : 0, transition: "opacity 700ms ease" }}>
            <circle cx={place.x} cy={place.y} r={place.size * 0.46} fill="#ffffff" fillOpacity={0.35} stroke="#9a8f86" strokeWidth={2.5} strokeDasharray="7 6" />
            <g opacity={strong ? 0.5 : 0.22}>
                <ItemArt item={task.item} x={place.x} y={place.y} size={place.size * 0.86} />
            </g>
        </g>
    );
}

/** Redni brojevi za predmete koji se broje (redom po mestima) */
function numbering(tokens: Token[], shown: boolean): Map<Token, number> {
    const map = new Map<Token, number>();
    if (!shown) return map;
    let n = 0;
    for (const t of tokens) {
        if (!t.counted) continue;
        n += 1;
        map.set(t, n);
    }
    return map;
}

// ── Scena ─────────────────────────────────────────────────────────────────────

export const SCENE_W = 600;
export const SCENE_H = 360;

/** Visina redova predmeta po sceni: jedan red (do pet) ili dva reda */
const ROWS: Readonly<Record<ThemeId, { one: number; two: [number, number] }>> = {
    branch: { one: 200, two: [118, 262] },
    pond: { one: 185, two: [120, 245] },
    leaf: { one: 185, two: [130, 240] },
    garage: { one: 255, two: [150, 288] },
    basket: { one: 205, two: [150, 252] },
    space: { one: 238, two: [150, 278] },
    nest: { one: 222, two: [170, 262] },
    table: { one: 195, two: [148, 252] },
    park: { one: 150, two: [105, 215] },
    carton: { one: 185, two: [130, 240] },
    parking: { one: 185, two: [130, 240] },
    crate: { one: 185, two: [130, 240] },
};

interface SceneLayout {
    place: (token: Token) => Place;
    rows: 1 | 2;
}

function sceneLayout(task: ArithmeticTask, tokens: Token[]): SceneLayout {
    const slots = tokens.filter((t) => !t.inBox).reduce((most, t) => Math.max(most, t.slot + 1), 0);
    const rows: 1 | 2 = slots > 5 ? 2 : 1;
    const ys = ROWS[task.theme];
    const rowY = (row: number) => (rows === 1 ? ys.one : ys.two[row]);
    if (task.kind === "box") {
        // Predmeti levo, kutija desno
        return {
            rows,
            place: (t) => {
                if (t.inBox) return { x: 422 + (t.slot % 3) * 62, y: 178 + Math.floor(t.slot / 3) * 66, size: 62 };
                // Do devet predmeta, po tri u redu, uspravno u sredini
                const lines = Math.ceil(slots / 3);
                return { x: 78 + (t.slot % 3) * 108, y: 180 + (Math.floor(t.slot / 3) - (lines - 1) / 2) * 98, size: 100 };
            },
        };
    }
    if (task.kind === "story") {
        // Lik levo, predmeti desno
        return { rows, place: (t) => ({ x: 236 + (t.slot % 5) * 80, y: rowY(Math.floor(t.slot / 5)), size: 82 }) };
    }
    // Jedan red (do pet predmeta): krupniji predmeti
    const size = rows === 1 ? 112 : 102;
    return { rows, place: (t) => ({ x: 92 + (t.slot % 5) * 104, y: rowY(Math.floor(t.slot / 5)), size }) };
}

/** Scena sa predmetima: pokreti, tragovi i (uz pomoć) redni brojevi */
export function SceneBoard({ task, step, numbered, calm, boxOpen, className }: { task: ArithmeticTask; step: number; numbered: boolean; calm: boolean; boxOpen: boolean; className?: string }) {
    const tokens = tokensFor(task);
    const layout = sceneLayout(task, tokens);
    const numbers = numbering(tokens, numbered);
    const animated = task.kind === "change" || task.kind === "story";
    const effective = animated ? step : 99;
    const hero = task.kind === "story" ? task.names[0] : null;
    const label = `${THEMES[task.theme].place}: ${ITEMS[task.item].many}`;
    return (
        // Pozadina se širi preko okvira 600 × 360, pa slika popuni celo polje, a predmeti ostaju u sredini
        <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} className={className} role="img" aria-label={label}>
            <g>
                <Extension theme={task.theme} />
                <Backdrop theme={task.theme} rows={layout.rows} story={task.kind === "story"} />
                {hero && (
                    <g transform="translate(92 346) scale(2.6)">
                        <Figure id={hero} pose={task.item === "balloon" ? "up" : "stand"} face="happy" />
                    </g>
                )}
                {task.item === "balloon" && <BalloonStrings task={task} tokens={tokens} layout={layout} step={effective} />}
                {tokens.map((t, i) => {
                    if (t.inBox) return null;
                    const place = layout.place(t);
                    if (t.kind === "hidden") {
                        return (
                            <g key={i}>
                                <Ghost task={task} place={place} shown strong />
                                {numbers.has(t) && <Badge x={place.x + place.size * 0.38} y={place.y - place.size * 0.38} n={numbers.get(t)!} r={Math.max(12, place.size * 0.17)} />}
                            </g>
                        );
                    }
                    return <MovingToken key={i} task={task} token={t} place={place} step={effective} calm={calm} number={numbers.get(t) ?? null} />;
                })}
                <BackdropFront theme={task.theme} rows={layout.rows} />
                {task.kind === "box" && (
                    <MysteryBox open={boxOpen}>
                        {tokens
                            .filter((t) => t.inBox)
                            .map((t, i) => {
                                const place = layout.place(t);
                                return (
                                    <g key={i}>
                                        <ItemArt item={task.item} x={place.x} y={place.y} size={place.size} />
                                        {numbers.has(t) && <Badge x={place.x + 22} y={place.y - 22} n={numbers.get(t)!} r={12} />}
                                    </g>
                                );
                            })}
                    </MysteryBox>
                )}
            </g>
        </svg>
    );
}

/** Kanapi balona idu do ruke lika (balon koji odleti nosi svoj kanap) */
function BalloonStrings({ task, tokens, layout, step }: { task: ArithmeticTask; tokens: Token[]; layout: SceneLayout; step: number }) {
    const hand: Vec = task.kind === "story" ? [150, 170] : [300, 340];
    return (
        <g fill="none" stroke="#8a7f78" strokeWidth={1.6} opacity={0.75}>
            {tokens.map((t, i) => {
                if (t.inBox || placeState(t, step) !== "here" || t.kind === "hidden") return null;
                const p = layout.place(t);
                return <path key={i} d={`M${p.x} ${p.y + p.size * 0.42} Q${(p.x + hand[0]) / 2} ${p.y + p.size * 0.9} ${hand[0]} ${hand[1]}`} />;
            })}
        </g>
    );
}

/** Kutija sa upitnikom; otvorena pokazuje šta je unutra */
function MysteryBox({ open, children }: { open: boolean; children: ReactNode }) {
    return (
        <g>
            <ellipse cx={482} cy={330} rx={104} ry={10} fill="#000000" opacity={0.1} />
            {/* Zadnja strana i dno */}
            <path d="M382 118 L582 118 L582 328 L382 328Z" fill="#c98f55" {...line("#9a6a3a", 2.5)} />
            {open ? (
                <>
                    <path d="M382 118 L356 82 L444 82 L470 118Z" fill="#e2b57d" {...line("#9a6a3a", 2.5)} />
                    <path d="M582 118 L596 82 L520 82 L494 118Z" fill="#e2b57d" {...line("#9a6a3a", 2.5)} />
                    <rect x={386} y={122} width={192} height={204} fill="#b47c45" opacity={0.6} />
                    {children}
                    <path d="M382 286 L582 286 L582 328 L382 328Z" fill="#d9a56b" {...line("#9a6a3a", 2.5)} />
                </>
            ) : (
                <>
                    <path d="M374 118 L590 118 L590 146 L374 146Z" fill="#e2b57d" {...line("#9a6a3a", 2.5)} />
                    <path d="M382 146 L582 146 L582 328 L382 328Z" fill="#d9a56b" {...line("#9a6a3a", 2.5)} />
                    <path d="M482 146 L482 328" stroke="#b9844d" strokeWidth={2} opacity={0.6} />
                    <circle cx={482} cy={236} r={46} fill="#fff7ea" {...line("#9a6a3a", 2.5)} />
                    <text x={482} y={259} textAnchor="middle" fontSize={66} fontWeight={900} fill={BADGE} fontFamily="inherit">
                        ?
                    </text>
                </>
            )}
        </g>
    );
}

// ── Pozadine scena ────────────────────────────────────────────────────────────

/** Boja iznad i ispod scene (nebo, zemlja), kad je polje više ili šire od 5 : 3 */
const EXTEND: Readonly<Record<ThemeId, { top: string; bottom: string }>> = {
    branch: { top: "#cfeaff", bottom: "#f2fbff" },
    pond: { top: "#a9def2", bottom: "#f2dca6" },
    leaf: { top: "#f3fbe6", bottom: "#e2f3cc" },
    garage: { top: "#d8efff", bottom: "#9aa1ab" },
    basket: { top: "#fff4dd", bottom: "#ffe9cc" },
    space: { top: "#26306b", bottom: "#8d7fd6" },
    nest: { top: "#ffeccc", bottom: "#fff8ea" },
    table: { top: "#fdf1e3", bottom: "#c98f55" },
    park: { top: "#cfeaff", bottom: "#76bf63" },
    carton: { top: "#fff7ee", bottom: "#fff7ee" },
    parking: { top: "#fff7ee", bottom: "#fff7ee" },
    crate: { top: "#fff7ee", bottom: "#fff7ee" },
};

function Extension({ theme }: { theme: ThemeId }) {
    const colors = EXTEND[theme];
    return (
        <g>
            <rect x={-2000} y={-2000} width={4600} height={2180} fill={colors.top} />
            <rect x={-2000} y={180} width={4600} height={2400} fill={colors.bottom} />
            {theme === "space" &&
                [[-120, -60], [-60, -180], [700, -90], [660, 40], [-90, 120], [740, 200], [300, -140], [120, -100], [480, -170]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3 : 2} fill="#fff6c8" />)}
        </g>
    );
}

function Sky({ from, to }: { from: string; to: string }) {
    const id = `ar-sky-${from.slice(1)}-${to.slice(1)}`;
    return (
        <>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={from} />
                    <stop offset="1" stopColor={to} />
                </linearGradient>
            </defs>
            <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill={`url(#${id})`} />
        </>
    );
}

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.9}>
            <path d="M0 18 C-2 6 12 -2 22 6 C28 -6 48 -4 50 10 C62 8 66 22 56 26 L4 26 C-4 26 -6 20 0 18Z" fill="#ffffff" />
        </g>
    );
}

/** Grana sa listićima, od stabla zdesna */
function Branch({ y }: { y: number }) {
    return (
        <g>
            <path d={`M600 ${y - 10} C520 ${y - 4} 300 ${y + 6} 22 ${y - 2}`} fill="none" stroke="#9a6a44" strokeWidth={16} strokeLinecap="round" />
            <path d={`M600 ${y - 14} C520 ${y - 8} 300 ${y + 1} 26 ${y - 6}`} fill="none" stroke="#b9845a" strokeWidth={4} strokeLinecap="round" opacity={0.7} />
            {[70, 190, 330, 470].map((x, i) => (
                <g key={x} transform={`translate(${x} ${y + 4}) rotate(${i % 2 ? 24 : -18})`}>
                    <path d="M0 0 C6 10 20 14 30 10 C24 0 10 -4 0 0Z" fill="#7cc46a" {...line("#4f9a45", 1.5)} />
                </g>
            ))}
            <g transform={`translate(16 ${y - 6})`}>
                <path d="M0 0 C-8 -14 -2 -26 10 -24 C12 -12 8 -4 0 0Z" fill="#8fd17c" {...line("#4f9a45", 1.5)} />
            </g>
        </g>
    );
}

function Backdrop({ theme, rows, story }: { theme: ThemeId; rows: 1 | 2; story: boolean }) {
    const ys = ROWS[theme];
    switch (theme) {
        case "branch":
            return (
                <g>
                    <Sky from="#cfeaff" to="#f2fbff" />
                    <circle cx={70} cy={60} r={34} fill="#ffe08a" opacity={0.8} />
                    <Cloud x={200} y={36} s={1.1} />
                    <Cloud x={420} y={70} s={0.8} />
                    {/* Stablo zdesna, preko cele visine polja */}
                    <rect x={566} y={-2000} width={60} height={4400} fill="#9a6a44" />
                    <rect x={574} y={-2000} width={5} height={4400} fill="#b9845a" opacity={0.6} />
                    {(rows === 1 ? [ys.one] : ys.two).map((y) => (
                        <Branch key={y} y={y + 44} />
                    ))}
                </g>
            );
        case "pond":
            return (
                <g>
                    <Sky from="#a9def2" to="#5fb3d6" />
                    {[[80, 70, 8], [140, 120, 5], [520, 90, 7], [470, 40, 4], [300, 30, 5]].map(([x, y, r]) => (
                        <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="none" stroke="#ffffff" strokeWidth={2} opacity={0.7} />
                    ))}
                    <path d="M0 330 C120 312 220 338 320 326 C420 314 520 334 600 322 L600 360 L0 360Z" fill="#f2dca6" />
                    {[30, 560, 250].map((x, i) => (
                        <path key={x} d={`M${x} 350 C${x - 14} 310 ${x + 14} 290 ${x} ${250 - i * 10} C${x + 18} 290 ${x + 4} 320 ${x + 10} 350Z`} fill="#5fb36a" {...line("#3f8a4c", 1.5)} />
                    ))}
                    <ellipse cx={420} cy={344} rx={22} ry={10} fill="#c9b48a" />
                    <ellipse cx={150} cy={348} rx={16} ry={8} fill="#b7a27a" />
                </g>
            );
        case "leaf":
            return (
                <g>
                    <Sky from="#f3fbe6" to="#e2f3cc" />
                    <path d="M18 186 C70 40 460 10 586 176 C470 340 90 344 18 186Z" fill="#8ccf72" {...line("#4f9a45", 3)} />
                    <path d="M18 186 C200 180 400 176 586 176" fill="none" stroke="#5aa64f" strokeWidth={4} />
                    {[120, 230, 340, 450].map((x) => (
                        <g key={x} fill="none" stroke="#5aa64f" strokeWidth={2.5} opacity={0.8}>
                            <path d={`M${x} 182 C${x + 30} 140 ${x + 60} 100 ${x + 70} 70`} />
                            <path d={`M${x} 182 C${x + 30} 226 ${x + 60} 262 ${x + 70} 292`} />
                        </g>
                    ))}
                    <path d="M586 176 C596 174 600 172 604 170" stroke="#4f9a45" strokeWidth={6} strokeLinecap="round" />
                </g>
            );
        case "garage": {
            const floors = rows === 1 ? [ys.one] : ys.two;
            const top = floors[0] - 78;
            return (
                <g>
                    <Sky from="#d8efff" to="#f7fbff" />
                    <rect x={0} y={330} width={SCENE_W} height={30} fill="#9aa1ab" />
                    <path d={`M20 ${top} L300 ${top - 46} L580 ${top} Z`} fill="#e8641c" {...line("#a03f12", 3)} />
                    <rect x={36} y={top} width={528} height={334 - top} fill="#f4c99a" {...line("#a8743f", 3)} />
                    {floors.map((y) => (
                        <g key={y}>
                            <rect x={50} y={y - 64} width={500} height={100} rx={8} fill="#e9e4dc" />
                            <rect x={50} y={y + 36} width={500} height={10} fill="#9a8f86" />
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <rect key={i} x={40 + i * 104} y={y + 30} width={4} height={8} fill="#ffffff" />
                            ))}
                        </g>
                    ))}
                </g>
            );
        }
        case "basket": {
            const left = story ? 176 : 30;
            const right = 586;
            const mid = (left + right) / 2;
            return (
                <g>
                    <Sky from="#fff4dd" to="#ffe9cc" />
                    {/* Ručka korpe iza jabuka */}
                    <path d={`M${left + 40} 110 C${left + 60} -10 ${right - 60} -10 ${right - 40} 110`} fill="none" stroke="#b9843f" strokeWidth={16} strokeLinecap="round" />
                    <path d={`M${left + 40} 110 C${left + 60} -10 ${right - 60} -10 ${right - 40} 110`} fill="none" stroke="#e0b06a" strokeWidth={5} strokeLinecap="round" strokeDasharray="10 12" />
                    <path d={`M${left} 98 L${right} 98 L${right - 26} 318 C${mid + 120} 338 ${mid - 120} 338 ${left + 26} 318Z`} fill="#d9a35b" {...line("#9a6a3a", 3)} />
                    {[136, 178, 220, 262].map((y, i) => (
                        <path key={y} d={`M${left + 6 + i * 6} ${y} C${mid - 100} ${y + 8} ${mid + 100} ${y + 8} ${right - 6 - i * 6} ${y}`} fill="none" stroke="#b9843f" strokeWidth={3} opacity={0.55} />
                    ))}
                    <path d={`M${left - 6} 92 L${right + 6} 92 L${right + 2} 112 L${left - 2} 112Z`} fill="#c88a3f" {...line("#9a6a3a", 2.5)} />
                </g>
            );
        }
        case "space":
            return (
                <g>
                    <Sky from="#26306b" to="#4b4ca0" />
                    {[[40, 40], [120, 90], [210, 30], [330, 70], [450, 40], [560, 110], [80, 160], [520, 30], [280, 120]].map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 3 : 2} fill="#fff6c8" />
                    ))}
                    <g transform="translate(520 70)">
                        <circle r={26} fill="#f6b26b" {...line("#c9853f", 2)} />
                        <ellipse rx={44} ry={10} fill="none" stroke="#ffe0a8" strokeWidth={4} transform="rotate(-16)" />
                    </g>
                    {rows === 2 && <path d={`M0 ${ys.two[0] + 36} C150 ${ys.two[0] + 20} 450 ${ys.two[0] + 20} 600 ${ys.two[0] + 36} L600 360 L0 360Z`} fill="#a99be6" {...line("#7a6bc4", 2)} />}
                    <path d={`M0 ${(rows === 1 ? ys.one : ys.two[1]) + 40} C150 ${(rows === 1 ? ys.one : ys.two[1]) + 26} 450 ${(rows === 1 ? ys.one : ys.two[1]) + 26} 600 ${(rows === 1 ? ys.one : ys.two[1]) + 40} L600 360 L0 360Z`} fill="#8d7fd6" {...line("#6a5cb8", 2)} />
                    <ellipse cx={120} cy={345} rx={30} ry={7} fill="#7a6bc4" />
                    <ellipse cx={460} cy={350} rx={22} ry={5} fill="#7a6bc4" />
                </g>
            );
        case "nest":
            return (
                <g>
                    <Sky from="#ffeccc" to="#fff8ea" />
                    <path d="M330 120 L390 40 L410 40 L470 120Z" fill="#b48a74" {...line("#8a6655", 2)} />
                    <path d="M390 40 C392 30 408 30 410 40 Z" fill="#f08a4b" />
                    <circle cx={404} cy={22} r={9} fill="#ffffff" opacity={0.75} />
                    <circle cx={418} cy={10} r={6} fill="#ffffff" opacity={0.6} />
                    {[0, 600].map((x) => (
                        <g key={x} transform={`translate(${x} 340) scale(${x ? -1 : 1} 1)`}>
                            {[-60, -30, 0].map((r) => (
                                <path key={r} transform={`rotate(${r})`} d="M0 0 C30 -40 70 -80 110 -90 C90 -60 50 -20 0 0Z" fill="#6fbf6a" {...line("#3f8a4c", 1.5)} />
                            ))}
                        </g>
                    ))}
                    <ellipse cx={300} cy={(rows === 1 ? ys.one : ys.two[1]) + 40} rx={270} ry={48} fill="#a77a4f" />
                    {rows === 2 && <ellipse cx={300} cy={ys.two[0] + 30} rx={250} ry={40} fill="#b98b5c" />}
                </g>
            );
        case "table":
            return (
                <g>
                    <Sky from="#fdf1e3" to="#fbe8d4" />
                    {[60, 180, 300, 420, 540].map((x) => (
                        <circle key={x} cx={x} cy={44} r={5} fill="#f2cfa8" />
                    ))}
                    <path d={`M${story ? 160 : 0} 92 L600 92 L600 340 L${story ? 160 : 0} 340Z`} fill="#e3b07a" {...line("#a8743f", 3)} />
                    <path d={`M${story ? 160 : 0} 340 L600 340 L600 360 L${story ? 160 : 0} 360Z`} fill="#c98f55" />
                    {[150, 210, 270].map((y) => (
                        <path key={y} d={`M${story ? 170 : 10} ${y} C300 ${y + 6} 450 ${y - 6} 590 ${y}`} fill="none" stroke="#c98f55" strokeWidth={2} opacity={0.5} />
                    ))}
                </g>
            );
        case "park":
            return (
                <g>
                    <Sky from="#cfeaff" to="#f2fbff" />
                    <Cloud x={260} y={24} s={0.9} />
                    <Cloud x={470} y={40} s={0.7} />
                    <path d="M0 300 C140 270 320 296 600 276 L600 360 L0 360Z" fill="#8fd17c" />
                    <path d="M0 326 C200 310 400 330 600 316 L600 360 L0 360Z" fill="#76bf63" />
                    {[30, 90, 520, 570].map((x) => (
                        <circle key={x} cx={x} cy={330} r={5} fill={x % 20 ? "#ffd166" : "#ffffff"} />
                    ))}
                </g>
            );
        default:
            return <rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="#fff7ee" />;
    }
}

/** Delovi scene ispred predmeta (prednja ivica gnezda, korpe) */
function BackdropFront({ theme, rows }: { theme: ThemeId; rows: 1 | 2 }) {
    const ys = ROWS[theme];
    if (theme === "nest") {
        const y = (rows === 1 ? ys.one : ys.two[1]) + 46;
        return (
            <g>
                <path d={`M40 ${y} C120 ${y + 34} 480 ${y + 34} 560 ${y} C540 ${y + 60} 60 ${y + 60} 40 ${y}Z`} fill="#8a6142" {...line("#6b4a30", 2)} />
                {[90, 160, 230, 300, 370, 440, 510].map((x) => (
                    <path key={x} d={`M${x - 30} ${y + 14} C${x} ${y + 26} ${x + 20} ${y + 22} ${x + 40} ${y + 10}`} fill="none" stroke="#b98b5c" strokeWidth={3} strokeLinecap="round" />
                ))}
            </g>
        );
    }
    return null;
}

// ── Okviri sa deset mesta ─────────────────────────────────────────────────────

export const FRAME_W = 540;
export const FRAME_H = 236;
const CELL = 100;
const FRAME_X = 20;
const FRAME_Y = 18;

type FrameStyle = "carton" | "crate" | "parking" | "board";

function frameStyle(theme: ThemeId): FrameStyle {
    if (theme === "carton" || theme === "crate" || theme === "parking") return theme;
    return "board";
}

const CELL_TINT = { fill: "#ffc9a3", second: "#b9defa" };

function FrameBack({ style, tints }: { style: FrameStyle; tints: (string | null)[] }) {
    const cells = Array.from({ length: 10 }, (_, i) => ({ x: FRAME_X + (i % 5) * CELL, y: FRAME_Y + Math.floor(i / 5) * CELL, i }));
    if (style === "carton") {
        return (
            <g>
                <rect x={6} y={6} width={FRAME_W - 12} height={FRAME_H - 12} rx={28} fill="#e8cfa2" {...line("#b08a55", 3)} />
                {cells.map((c) => (
                    <g key={c.i}>
                        <circle cx={c.x + 50} cy={c.y + 50} r={42} fill={tints[c.i] ?? "#d9bb87"} {...line("#b08a55", 2)} />
                        <circle cx={c.x + 50} cy={c.y + 54} r={34} fill="#000000" opacity={0.06} />
                    </g>
                ))}
            </g>
        );
    }
    if (style === "crate") {
        return (
            <g>
                <rect x={6} y={6} width={FRAME_W - 12} height={FRAME_H - 12} rx={14} fill="#d6a067" {...line("#9a6a3a", 3)} />
                {cells.map((c) => (
                    <rect key={c.i} x={c.x + 4} y={c.y + 4} width={CELL - 8} height={CELL - 8} rx={10} fill={tints[c.i] ?? "#f0d2a8"} {...line("#b9843f", 2)} />
                ))}
            </g>
        );
    }
    if (style === "parking") {
        return (
            <g>
                <rect x={6} y={6} width={FRAME_W - 12} height={FRAME_H - 12} rx={18} fill="#7d8491" {...line("#5b616c", 3)} />
                {cells.map((c) => (
                    <rect key={c.i} x={c.x + 4} y={c.y + 4} width={CELL - 8} height={CELL - 8} rx={6} fill={tints[c.i] ?? "#8a919e"} />
                ))}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <g key={i}>
                        <rect x={FRAME_X + i * CELL - 2} y={FRAME_Y + 2} width={4} height={CELL - 6} fill="#ffffff" />
                        <rect x={FRAME_X + i * CELL - 2} y={FRAME_Y + CELL + 4} width={4} height={CELL - 6} fill="#ffffff" />
                    </g>
                ))}
                <rect x={FRAME_X} y={FRAME_Y + CELL - 2} width={CELL * 5} height={4} fill="#ffd166" opacity={0.9} />
            </g>
        );
    }
    return (
        <g>
            <rect x={6} y={6} width={FRAME_W - 12} height={FRAME_H - 12} rx={22} fill="#fffaf0" {...line("#d8c8b0", 3)} />
            {cells.map((c) => (
                <rect key={c.i} x={c.x + 6} y={c.y + 6} width={CELL - 12} height={CELL - 12} rx={16} fill={tints[c.i] ?? "#ffffff"} stroke="#d8c8b0" strokeWidth={2.5} strokeDasharray="8 6" />
            ))}
        </g>
    );
}

/** Jedan okvir (mesta `first` … `first + 9`) */
function OneFrame({ task, tokens, first, step, numbers, calm, className }: { task: ArithmeticTask; tokens: Token[]; first: number; step: number; numbers: Map<Token, number>; calm: boolean; className?: string }) {
    const style = frameStyle(task.theme);
    const mine = tokens.filter((t) => t.slot >= first && t.slot < first + 10);
    // Prelaz preko desetice: oni koji dopunjuju prvi okvir i oni koji idu u drugi u svojoj boji
    const tints: (string | null)[] = Array.from({ length: 10 }, () => null);
    if (task.split) {
        for (const t of mine) if (t.kind === "arrive") tints[t.slot - first] = first === 0 ? CELL_TINT.fill : CELL_TINT.second;
    }
    const place = (t: Token): Place => ({ x: FRAME_X + ((t.slot - first) % 5) * CELL + 50, y: FRAME_Y + Math.floor((t.slot - first) / 5) * CELL + 50, size: style === "carton" ? 74 : 80 });
    return (
        <svg viewBox={`0 0 ${FRAME_W} ${FRAME_H}`} className={className} role="img" aria-label={`Okvir sa deset mesta: ${mine.filter((t) => t.kind !== "empty" && t.kind !== "hidden" && placeState(t, step) === "here").length}`}>
            <FrameBack style={style} tints={tints} />
            {mine.map((t, i) => {
                const p = place(t);
                if (t.kind === "empty") return numbers.has(t) ? <Badge key={i} x={p.x} y={p.y} n={numbers.get(t)!} r={18} /> : null;
                if (t.kind === "hidden") {
                    return (
                        <g key={i}>
                            <Ghost task={task} place={p} shown strong />
                            {numbers.has(t) && <Badge x={p.x + 30} y={p.y - 30} n={numbers.get(t)!} r={14} />}
                        </g>
                    );
                }
                return <MovingToken key={i} task={task} token={t} place={p} step={step} calm={calm} number={numbers.get(t) ?? null} />;
            })}
        </svg>
    );
}

/** Jedan ili dva okvira sa deset mesta (dva: jedan pored drugog na širokom, jedan ispod drugog na uskom polju) */
export function FrameBoards({ task, step, numbered, calm }: { task: ArithmeticTask; step: number; numbered: boolean; calm: boolean }) {
    const tokens = tokensFor(task);
    const numbers = numbering(tokens, numbered);
    const animated = task.kind === "change" || task.kind === "story";
    const effective = animated ? step : 99;
    const two = twoFrames(task);
    return (
        <div className="ar-frames flex h-full w-full items-center justify-center gap-[2cqmin]">
            <OneFrame task={task} tokens={tokens} first={0} step={effective} numbers={numbers} calm={calm} className="ar-frame" />
            {two && <OneFrame task={task} tokens={tokens} first={10} step={effective} numbers={numbers} calm={calm} className="ar-frame" />}
        </div>
    );
}

// ── Kartica priče (kad se predmeti još ne vide) ───────────────────────────────

export function StoryCard({ task, className }: { task: ArithmeticTask; className?: string }) {
    const hero = task.kind === "story" ? task.names[0] : null;
    const theme = THEMES[task.theme];
    return (
        <svg viewBox="0 0 360 240" className={className} role="img" aria-label={hero ? NAMES[hero].name : theme.place}>
            <rect x={2} y={2} width={356} height={236} rx={26} fill="#fff7ee" stroke="#000000" strokeOpacity={0.08} strokeWidth={3} />
            <ellipse cx={180} cy={214} rx={150} ry={12} fill="#000000" opacity={0.06} />
            {hero ? (
                <>
                    <g transform="translate(108 220) scale(1.65)">
                        <Figure id={hero} pose="wave" face="happy" />
                    </g>
                    <ItemArt item={task.item} x={262} y={150} size={120} />
                </>
            ) : (
                <ItemArt item={task.item} x={180} y={130} size={170} />
            )}
            <g transform={hero ? "translate(300 52)" : "translate(290 50)"}>
                <circle r={30} fill="#ffffff" stroke={BADGE} strokeWidth={4} />
                <text y={15} textAnchor="middle" fontSize={42} fontWeight={900} fill={BADGE} fontFamily="inherit">
                    ?
                </text>
            </g>
        </svg>
    );
}
