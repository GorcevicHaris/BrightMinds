// Sadržaj igre „Umetaljka”: drvena tabla sa rupama (krug, zvezda, srce, pa jabuka, šolja,
// ključ…), a pored nje komadi. Dete proba svaki komad i spušta ga u rupu istog oblika; komad
// koji ne ulazi mirno se vrati. Bez Reacta, da bi se nivoi proveravali u testovima; obrisi su
// u kit/shapePaths.ts (isti obris crta rupu i komad), crteži table u games/inset/.
//
// Zašto ovim redom (uzrast 3–10, i deca sa autizmom):
//  • Umetaljka je jedna od prvih igračaka za uparivanje oblika: rešenje proverava sama
//    tabla (komad ili uđe ili ne uđe), pa je povratna informacija jasna i bez reči, a
//    raspored je uvek isti (vizuelna struktura kakvu koristi TEACCH).
//  • Učenje bez greške (errorless learning): prvo samo dve rupe (krug i kvadrat), prvi komad
//    prevuče ruka (pokazni zadatak se ne ocenjuje), rupa je obojena bojom svog komada, a pomoć
//    (komad i rupa zasvetle) na lakim nivoima stiže već posle prve greške i posle čekanja.
//  • Podrška se povlači postepeno (stimulus fading): boja rupe nestaje, oblika ima više, pa
//    dolaze slični oblici jedan pored drugog (kvadrat – pravougaonik, krug – oval, petougao –
//    šestougao), pa predmeti kao siluete, pa okrenuti komadi (dete ih okreće dugmetom ili
//    dodirom), i na kraju samo siluete: svi komadi iste drvene boje, više rupa.
//  • Prvo osnovni, međusobno najrazličitiji oblici (krug, kvadrat, trougao), jer se deca
//    najpre oslanjaju na grub obris; slični oblici traže pažnju na ugao i stranice.
//  • Pogrešna rupa nije kazna: komad se zaljulja i vrati, glas mirno kaže „Ne uklapa se.”
//    Glas nikad ne kaže gde treba dodirnuti — samo o čemu je zadatak.

import type { BaseView, GameResult } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { demoRounds, toCount } from "@/app/components/games/kit/utils";
import { isShapeKey, type PieceColor, type ShapeKey } from "@/app/components/games/kit/shapePaths";

// ── Oblici ────────────────────────────────────────────────────────────────────

export type InsetKind = "basic" | "shape" | "object";

export interface InsetShape {
    id: ShapeKey;
    /** Naziv velikim početnim slovom („Krug”) — glas ga kaže kad komad legne */
    name: string;
    color: PieceColor;
    kind: InsetKind;
    /**
     * Koliko od četiri položaja (okret po 90°) ulazi u rupu: krug i kvadrat 4,
     * pravougaonik i oval 2 (uspravno ili naopako), a zvezda, srce i predmeti samo 1.
     */
    turns: 1 | 2 | 4;
}

const s = (id: ShapeKey, name: string, color: PieceColor, kind: InsetKind, turns: InsetShape["turns"]): InsetShape => ({ id, name, color, kind, turns });

export const INSET_SHAPES: readonly InsetShape[] = [
    s("circle", "Krug", "blue", "basic", 4),
    s("square", "Kvadrat", "red", "basic", 4),
    s("triangle", "Trougao", "yellow", "basic", 1),
    s("star", "Zvezda", "purple", "shape", 1),
    s("heart", "Srce", "pink", "shape", 1),
    s("halfCircle", "Polukrug", "green", "shape", 1),
    s("rectangle", "Pravougaonik", "orange", "shape", 2),
    s("oval", "Oval", "teal", "shape", 2),
    s("pentagon", "Petougao", "sky", "shape", 1),
    s("hexagon", "Šestougao", "yellow", "shape", 2),
    s("diamond", "Romb", "teal", "shape", 2),
    s("trapezoid", "Trapez", "blue", "shape", 1),
    s("crescent", "Polumesec", "yellow", "shape", 1),
    s("octagon", "Osmougao", "red", "shape", 4),
    s("apple", "Jabuka", "red", "object", 1),
    s("car", "Auto", "blue", "object", 1),
    s("house", "Kuća", "orange", "object", 1),
    s("fish", "Riba", "teal", "object", 1),
    s("key", "Ključ", "yellow", "object", 1),
    s("cup", "Šolja", "sky", "object", 1),
    s("tree", "Drvo", "green", "object", 1),
    s("mushroom", "Pečurka", "red", "object", 1),
    s("umbrella", "Kišobran", "purple", "object", 1),
    s("cloud", "Oblak", "sky", "object", 1),
    s("boat", "Brod", "orange", "object", 1),
    s("icecream", "Sladoled", "pink", "object", 1),
];

export function getInsetShape(id: unknown): InsetShape | undefined {
    return isShapeKey(id) ? INSET_SHAPES.find((shape) => shape.id === id) : undefined;
}

/** Parovi koji liče (na težim nivoima stoje na istoj tabli) */
export const SIMILAR_PAIRS: readonly (readonly [ShapeKey, ShapeKey])[] = [
    ["square", "rectangle"],
    ["circle", "oval"],
    ["pentagon", "hexagon"],
    ["triangle", "trapezoid"],
    ["halfCircle", "crescent"],
    ["square", "diamond"],
    ["circle", "octagon"],
    ["heart", "apple"],
    ["car", "boat"],
    ["mushroom", "umbrella"],
    ["tree", "icecream"],
    ["cup", "house"],
    ["key", "fish"],
];

export function areSimilar(a: ShapeKey, b: ShapeKey): boolean {
    return SIMILAR_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

/** Ulazi li komad (oblik i okret) u rupu (oblik, uspravna) */
export function fitsHole(piece: ShapeKey, rot: number, hole: ShapeKey): boolean {
    if (piece !== hole) return false;
    const info = getInsetShape(piece);
    if (!info) return false;
    const step = 360 / info.turns;
    return (((rot % 360) + 360) % 360) % step === 0;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

const ids = (kind: InsetKind | InsetKind[]) => INSET_SHAPES.filter((shape) => (Array.isArray(kind) ? kind.includes(shape.kind) : shape.kind === kind)).map((shape) => shape.id);

const BASIC = ids("basic");
const EASY: ShapeKey[] = [...BASIC, "star", "heart"];
const MORE: ShapeKey[] = [...EASY, "halfCircle"];
const SHAPES = ids(["basic", "shape"]);
const OBJECTS = ids("object");
const FIRST_OBJECTS: ShapeKey[] = ["apple", "car", "house", "fish", "tree", "cup"];
/** Oblici koji izgledaju drugačije kad se okrenu (za nivoe sa okretanjem) */
const TURNABLE: ShapeKey[] = ["triangle", "heart", "halfCircle", "star", "trapezoid", "house", "tree", "cup", "mushroom", "icecream", "apple", "boat"];

export interface InsetLevel {
    /** Table jedna za drugom */
    boards: number;
    /** Rupa na jednoj tabli */
    holes: number;
    /** Iz kojih oblika se bira */
    pool: readonly ShapeKey[];
    /** together: slični oblici na istoj tabli · apart: nikad dva slična zajedno */
    similar: "together" | "apart" | "any";
    /** Rupa obojena svetlom bojom svog komada */
    tint: boolean;
    /** Koliko komada na tabli je okrenuto (dete ih okreće) */
    rotated: number;
    /** Svi komadi iste drvene boje — ostaje samo oblik (silueta) */
    plain: boolean;
    earlyHint: boolean;
    /** Prve table prvog nivoa su zadate (krug i kvadrat, krug i trougao, kvadrat i trougao) */
    fixed?: ShapeKey[][];
}

const lv = (boards: number, holes: number, pool: readonly ShapeKey[], extra: Partial<InsetLevel> = {}): InsetLevel => ({
    boards,
    holes,
    pool,
    similar: "any",
    tint: false,
    rotated: 0,
    plain: false,
    earlyHint: false,
    ...extra,
});

export const INSET_LEVELS: readonly InsetLevel[] = [
    // Lako: krug, kvadrat, trougao — dve pa tri rupe, rupa u boji komada; pa zvezda, srce, polukrug
    lv(3, 2, BASIC, { tint: true, earlyHint: true, fixed: [["circle", "square"], ["circle", "triangle"], ["square", "triangle"]] }),
    lv(2, 3, BASIC, { tint: true, earlyHint: true }),
    lv(2, 3, BASIC, { earlyHint: true }),
    lv(2, 3, EASY, { earlyHint: true }),
    lv(2, 4, MORE, { similar: "apart", earlyHint: true }),
    // Srednje: više oblika, pa slični zajedno, pa predmeti kao siluete
    lv(2, 4, SHAPES, { similar: "apart" }),
    lv(2, 4, SHAPES, { similar: "together" }),
    lv(2, 3, FIRST_OBJECTS, { tint: true, similar: "apart" }),
    lv(2, 4, OBJECTS, { similar: "apart" }),
    lv(2, 4, [...SHAPES, ...OBJECTS], { similar: "together" }),
    // Teško: okrenuti komadi, pa samo siluete (svi komadi iste boje) i više rupa
    lv(2, 3, TURNABLE, { rotated: 3, similar: "apart" }),
    lv(2, 4, TURNABLE, { rotated: 2, similar: "any" }),
    lv(1, 6, [...SHAPES, ...OBJECTS], { plain: true, similar: "apart" }),
    lv(1, 6, [...SHAPES, ...OBJECTS], { plain: true, similar: "together", rotated: 2 }),
    lv(1, 8, [...SHAPES, ...OBJECTS], { plain: true, similar: "together", rotated: 3 }),
];

export const INSET_MAX_LEVEL = INSET_LEVELS.length;

export function insetLevel(level: number): InsetLevel {
    const safe = Math.min(Math.max(Math.round(Number.isFinite(level) ? level : 1), 1), INSET_MAX_LEVEL);
    return INSET_LEVELS[safe - 1];
}

// ── Plan nivoa ────────────────────────────────────────────────────────────────

export interface InsetBoard {
    /** Rupe redom na tabli */
    holes: ShapeKey[];
    /** Komadi redom u korpi */
    tray: ShapeKey[];
    /** Okret komada na početku (stepeni, samo okrenuti komadi) */
    rot: Partial<Record<ShapeKey, number>>;
    tint: boolean;
    plain: boolean;
    /** Na tabli ima okrenutih komada: vidi se dugme „Okreni” */
    rotate: boolean;
}

export interface InsetPlan {
    boards: InsetBoard[];
    earlyHint: boolean;
}

interface BuildOptions {
    maxRounds: number;
    random?: () => number;
}

export function insetRounds(plan: InsetPlan): number {
    return plan.boards.reduce((sum, board) => sum + board.tray.length, 0);
}

/**
 * Plan nivoa. Table se ne seku; druga tabla se dodaje samo kad stane u broj zadataka za
 * uzrast (najmanje 6). Ista tabla se ne ponavlja zaredom; okrenuti komadi su samo oni koji
 * okrenuti zaista ne ulaze. `random` daje broj u [0, 1).
 */
export function buildInsetLevel(level: number, { maxRounds, random = Math.random }: BuildOptions): InsetPlan {
    const rule = insetLevel(level);
    const shuffle = <T,>(list: readonly T[]) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };
    const cap = Math.max(6, Number.isFinite(maxRounds) ? maxRounds : 6);

    const pickSet = (previous: ShapeKey[] | null): ShapeKey[] => {
        for (let attempt = 0; attempt < 40; attempt += 1) {
            const chosen: ShapeKey[] = [];
            if (rule.similar === "together") {
                for (const [a, b] of shuffle(SIMILAR_PAIRS)) {
                    if (chosen.length + 2 > rule.holes) break;
                    if (rule.pool.includes(a) && rule.pool.includes(b) && !chosen.includes(a) && !chosen.includes(b)) chosen.push(a, b);
                }
            }
            for (const id of shuffle(rule.pool)) {
                if (chosen.length >= rule.holes) break;
                if (chosen.includes(id)) continue;
                if (rule.similar === "apart" && chosen.some((other) => areSimilar(other, id))) continue;
                chosen.push(id);
            }
            if (chosen.length < rule.holes) continue;
            const same = previous && previous.length === chosen.length && chosen.every((id) => previous.includes(id));
            if (!same) return chosen;
        }
        return shuffle(rule.pool).slice(0, rule.holes);
    };

    const boards: InsetBoard[] = [];
    let used = 0;
    let previous: ShapeKey[] | null = null;
    const fixed = rule.fixed ? [rule.fixed[0], ...shuffle(rule.fixed.slice(1))] : null;
    for (let index = 0; index < rule.boards; index += 1) {
        if (boards.length > 0 && used + rule.holes > cap) break;
        const set: ShapeKey[] = fixed?.[index] ? [...fixed[index]] : pickSet(previous);
        previous = set;
        used += set.length;
        const holes = shuffle(set);
        // Na prvoj tabli prvog nivoa prvi komad u korpi je onaj koji pokazuje ruka (krug)
        const tray = level === 1 && index === 0 ? [set[0], ...shuffle(set.slice(1))] : shuffle(set);
        const rot: Partial<Record<ShapeKey, number>> = {};
        const turnable = shuffle(set.filter((id) => (getInsetShape(id)?.turns ?? 4) < 4));
        for (const id of turnable.slice(0, rule.rotated)) {
            const turns = getInsetShape(id)!.turns;
            const options = turns === 2 ? [90, 270] : [90, 180, 270];
            rot[id] = options[Math.floor(random() * options.length)];
        }
        boards.push({ holes, tray, rot, tint: rule.tint, plain: rule.plain, rotate: Object.keys(rot).length > 0 });
    }
    return { boards, earlyHint: rule.earlyHint };
}

// ── Rečenice ──────────────────────────────────────────────────────────────────

export const INSET_TITLE = "Složi oblike.";
export const INSET_DONE = "Sve je na svom mestu.";
export const MISFIT = "Ne uklapa se.";
export const TURN_IT = "Pravo mesto. Okreni oblik, pa probaj.";

/** Uputstvo na početku table (o čemu je zadatak, nikad gde dodirnuti) */
export function insetIntro(board: { holes: readonly string[]; rotate: boolean }): string {
    const objects = board.holes.every((id) => getInsetShape(id)?.kind === "object");
    const lead = objects ? "Složi slike. Svaka ima svoju rupu." : `${INSET_TITLE} Svaki oblik ima svoju rupu.`;
    return board.rotate ? `${lead} Neke oblike treba okrenuti.` : lead;
}

export function insetTitle(board: { holes: readonly string[] }): string {
    return board.holes.every((id) => getInsetShape(id)?.kind === "object") ? "Složi slike." : INSET_TITLE;
}

/** Šta glas kaže kad komad legne („Krug.”) */
export function placedSentence(id: ShapeKey): string {
    const shape = getInsetShape(id);
    return shape ? `${shape.name}.` : "";
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface InsetView extends BaseView {
    board: number;
    holes: string[];
    tray: string[];
    filled: string[];
    /** Okret svakog komada u korpi (stepeni) */
    rot: Record<string, number>;
    tint: boolean;
    plain: boolean;
    rotate: boolean;
    selected: string | null;
    hintPiece: string | null;
    last: string | null;
    /** Poslednji pokušaj je bio prava rupa, ali komad nije bio okrenut kako treba */
    turnNote: boolean;
    wrong: string[];
    picked: string | null;
    feedback: FeedbackKind;
    promptedCount: number;
}

export function emptyInsetView(totalRounds: number): InsetView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        board: 0,
        holes: [],
        tray: [],
        filled: [],
        rot: {},
        tint: false,
        plain: false,
        rotate: false,
        selected: null,
        hintPiece: null,
        last: null,
        turnNote: false,
        wrong: [],
        picked: null,
        feedback: null,
    };
}

export function insetBoardView(board: InsetBoard, index: number): Partial<InsetView> {
    const rot: Record<string, number> = {};
    for (const id of board.tray) rot[id] = board.rot[id] ?? 0;
    return {
        board: index,
        holes: [...board.holes],
        tray: [...board.tray],
        filled: [],
        rot,
        tint: board.tint,
        plain: board.plain,
        rotate: board.rotate,
        selected: null,
        hintPiece: null,
        last: null,
        turnNote: false,
        wrong: [],
        picked: null,
        feedback: null,
    };
}

// ── Bodovanje (isto kao u ostalim igrama) ────────────────────────────────────

/**
 * Komad je legao. Prvi komad prvog nivoa pokazuje ruka (pokazni, ne ocenjuje se);
 * „correct” = od prethodnog komada nijedan nije pao na pogrešno mesto i nije bilo pomoći;
 * „prompted” = uz pomoć (osim pokaznog).
 */
export function solveInsetView(current: InsetView, level: number, solved: Partial<InsetView> = {}): { next: InsetView; firstTry: boolean; modeled: boolean } {
    const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
    const helped = current.hintPiece !== null;
    const firstTry = current.wrong.length === 0 && !helped && !modeled;
    const next: InsetView = {
        ...current,
        ...solved,
        score: current.score + (firstTry ? 10 : 5),
        correctCount: current.correctCount + (firstTry ? 1 : 0),
        promptedCount: current.promptedCount + (helped && !modeled ? 1 : 0),
    };
    return { next, firstTry, modeled };
}

export function insetResult(final: InsetView, level: number, durationSec: number): GameResult {
    const total = Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1);
    const correct = Math.min(final.correctCount, total);
    return { score: final.score, durationSec, correct, total, prompted: Math.min(final.promptedCount, total - correct) };
}

// ── Monitor ───────────────────────────────────────────────────────────────────

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeInsetMonitor(state: Partial<InsetView> | null | undefined): InsetView {
    const base = emptyInsetView(1);
    if (!state) return base;
    const list = (value: unknown, allowed?: string[]) =>
        Array.isArray(value) ? Array.from(new Set(value.filter((id): id is string => getInsetShape(id) !== undefined && (!allowed || allowed.includes(id))))) : [];
    const holes = list(state.holes);
    const tray = list(state.tray, holes);
    const filled = list(state.filled, holes);
    const rot: Record<string, number> = {};
    if (state.rot && typeof state.rot === "object") {
        for (const id of tray) {
            const value = (state.rot as Record<string, unknown>)[id];
            rot[id] = typeof value === "number" && [0, 90, 180, 270].includes(value) ? value : 0;
        }
    }
    const piece = (value: unknown) => (typeof value === "string" && tray.includes(value) ? value : null);
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        board: toCount(state.board, 0),
        holes,
        tray,
        filled,
        rot,
        tint: state.tint === true,
        plain: state.plain === true,
        rotate: state.rotate === true,
        selected: piece(state.selected),
        hintPiece: piece(state.hintPiece),
        last: piece(state.last),
        turnNote: state.turnNote === true,
        wrong: Array.isArray(state.wrong) ? state.wrong.filter((item): item is string => typeof item === "string" && item.length <= 40).slice(0, 24) : [],
        picked: piece(state.picked),
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
    };
}
