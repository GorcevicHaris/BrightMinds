// Raspored igre „Šta dolazi sledeće?” po stvarnoj veličini polja za igru (izmerenoj).
// Niz i izbori dele visinu tako da i stvari u nizu i slike na karticama budu krupne: dug niz na
// uskom telefonu ide u dve trake (voz nastavlja na drugom koloseku, sleva nadesno), izbori mogu u
// dva reda, a na niskom položenom ekranu natpis stoji pored slike. Kod prenošenja pravila uzor
// može levo, a nizovi za izbor desno. Bez Reacta, da bi se proveravalo u testovima.

import type { CarrierId } from "@/app/components/games/data/patternLevels";
import { CARRIER_ENDS, itemBox, SLOT_HEIGHT } from "@/app/components/games/pattern/PatternArt";

/** Ciljevi (px): stvar u nizu i slika na kartici — tim odnosom se deli prostor */
const ITEM_GOAL = 48;
const PIC_GOAL = 56;
/** Najveće mesto u nizu i najveća slika na kartici (da ni na velikom ekranu ne budu preterane) */
const MAX_U = 128;
const MAX_PIC = 120;
const MAX_TILE = 88;
/** Bočni razmak okvira niza (px-1.5 sa obe strane) */
const ROW_PAD = 12;
/** Razmak između kartica izbora */
const CARD_GAP = 12;
/** Okvir kartice: unutrašnji razmak (p-1.5) i ivice (2 px, dole 5 px) */
const CARD_PAD_X = 16;
const CARD_PAD_Y = 19;
/** Kartica sa nizom (prenošenje pravila): p-1 i ivice */
const TILE_PAD_X = 12;
const TILE_PAD_Y = 15;
const TILE_GAP = 8;
/** Visina natpisa u traci sa porukom na niskom ekranu (min-h-7), i kad je poruka levo pored nizova */
const BANNER = 28;
const BANNER_SIDE = 72;
/** Druga traka niza počinje kratkom strelicom „nastavlja se” (u širinama mesta) */
export const CONTINUE_W = 0.55;
/** Lukovi ispod jedinica i razmak između dve trake (u širinama mesta) */
export const ARC_H = 0.22;
export const LINE_GAP = 0.16;

/** Tlo ispod trake (šine, trava), u širinama mesta */
export const GROUND_H: Readonly<Record<CarrierId, number>> = { train: 0.1, caterpillar: 0.08, beads: 0, balloons: 0.08, line: 0.08 };

export function padTop(carrier: CarrierId): number {
    return carrier === "caterpillar" ? 0.32 : 0.14;
}
const PAD_BOTTOM = 0.08;

export interface BoardBox {
    w: number;
    h: number;
    /** Nizak ekran: pitanje (i poruka) stoje u polju za igru, iznad niza */
    short: boolean;
}

/** Trake niza: [početak, kraj) svake trake */
export type RowLines = [number, number][];

export interface RowFit {
    lines: RowLines;
    /** Širina trake u širinama mesta (najšira traka) */
    units: number;
}

/** Podela niza na jednu ili dve trake (dve: što ujednačenije, jer najšira određuje veličinu) */
export function splitRow(n: number, carrier: CarrierId, count: 1 | 2): RowFit {
    const ends = CARRIER_ENDS[carrier];
    if (count === 1 || n < 4) return { lines: [[0, n]], units: n + ends.left + ends.right };
    let best: RowFit | null = null;
    for (let k = 2; k <= n - 2; k += 1) {
        const units = Math.max(ends.left + k, CONTINUE_W + (n - k) + ends.right);
        // Pri istoj širini prednost ima duža prva traka (čita se prva)
        if (!best || units < best.units - 1e-6) best = { lines: [[0, k], [k, n]], units };
    }
    return best!;
}

/** Visina niza (okvir, trake, tlo, lukovi) u širinama mesta */
export function rowHeightUnits(carrier: CarrierId, lineCount: number, arcs: boolean): number {
    const line = SLOT_HEIGHT[carrier] / 100 + GROUND_H[carrier] + (arcs ? ARC_H : 0);
    return padTop(carrier) + lineCount * line + (lineCount - 1) * LINE_GAP + PAD_BOTTOM;
}

/** Deo mesta koji zauzima sama stvar (slika u vagonu, perla, kartica) */
export function itemShare(carrier: CarrierId): number {
    return itemBox(carrier).s / 100;
}

/** Veličina slova natpisa na kartici (kao ranije: najduža reč staje u jedan red) */
export function labelFont(cardWidth: number, label: string): number {
    const longest = Math.max(6, ...label.split(" ").map((word) => word.length));
    return Math.max(8, Math.min(cardWidth * 0.105, (cardWidth * 0.8) / (longest * 0.74), 16.8));
}

/** Približna širina natpisa (podebljana slova, moguće i velika) */
const textWidth = (text: string, font: number) => text.length * 0.72 * font;

export interface ChoiceFit {
    cols: number;
    rows: number;
    /** Kartica (px) */
    cardW: number;
    cardH: number;
    /** Slika na kartici (px) */
    pic: number;
    /** Natpis pored slike (umesto ispod) */
    side: boolean;
    font: number;
}

export interface ItemLayout {
    kind: "items";
    u: number;
    row: RowFit;
    choices: ChoiceFit;
    gap: number;
}

export interface TransferLayout {
    kind: "transfer";
    u: number;
    row: RowFit;
    /** Uzor levo, nizovi desno */
    side: boolean;
    /** Širina leve kolone (px) kad je uzor levo */
    leftW: number;
    tile: number;
    gap: number;
}

/** Razmak između delova polja (kao ranije: 4 % visine, između 6 i 36 px) */
export function boardGap(h: number): number {
    return Math.min(Math.max(h * 0.04, 6), 36);
}

/** Najveći korak s (0…s) za koji `fits(s)` još važi (monotono) */
function largest(fits: (s: number) => boolean, max = 4): number {
    let lo = 0;
    let hi = max;
    for (let i = 0; i < 24; i += 1) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
    }
    return lo;
}

/**
 * Ocena rasporeda: najviše vredi da ni niz ni izbori ne budu sitni, pa malo i ukupna veličina.
 * Kad su oba dovoljno krupna (20 % preko cilja), prednost ima jednostavniji raspored (jedna traka).
 */
function worth(item: number, pic: number): number {
    const a = item / ITEM_GOAL;
    const b = pic / PIC_GOAL;
    return 2 * Math.min(a, b, 1.2) + 0.25 * Math.min(a + b, 3);
}

interface ItemInput {
    n: number;
    carrier: CarrierId;
    arcs: boolean;
    labels: string[];
}

/** Obični zadaci: niz (jedna ili dve trake) iznad, izbori ispod */
export function layoutItems(box: BoardBox, { n, carrier, arcs, labels }: ItemInput): ItemLayout {
    const gap = boardGap(box.h);
    const height = box.h - (box.short ? BANNER + gap : 0) - gap;
    const share = itemShare(carrier);
    const count = Math.max(labels.length, 1);
    const labelled = labels.some(Boolean);
    let best: { layout: ItemLayout; value: number } | null = null;

    for (const lineCount of n >= 5 ? ([1, 2] as const) : ([1] as const)) {
        const row = splitRow(n, carrier, lineCount);
        const uMax = Math.min((box.w - ROW_PAD) / row.units, MAX_U);
        const rowH = rowHeightUnits(carrier, row.lines.length, arcs);
        for (const rows of count >= 3 ? [1, 2] : [1]) {
            const cols = Math.ceil(count / rows);
            const cellW = (box.w - (cols - 1) * CARD_GAP) / cols;
            for (const side of labelled ? [false, true] : [false]) {
                const card = (pic: number): ChoiceFit => {
                    if (!labelled) return { cols, rows, cardW: pic + CARD_PAD_X, cardH: pic + CARD_PAD_Y, pic, side: false, font: 0 };
                    if (side) {
                        // Natpis desno od slike, najviše dva reda
                        const font = Math.min(Math.max(pic * 0.2, 11), 15);
                        const widths = labels.map((label) => textWidth(label, font));
                        const words = labels.flatMap((label) => label.split(" ")).map((word) => textWidth(word, font));
                        const full = Math.max(...widths);
                        const labelW = Math.min(full, Math.max(...words, full * 0.55)) + 4;
                        const lines = full > labelW ? 2 : 1;
                        return { cols, rows, cardW: pic + CARD_PAD_X + 6 + labelW, cardH: Math.max(pic, lines * 1.22 * font) + CARD_PAD_Y, pic, side: true, font };
                    }
                    const cardW = Math.min(cellW, pic + CARD_PAD_X + 16);
                    const font = Math.max(...labels.map((label) => labelFont(cardW, label)));
                    const lines = labels.some((label) => textWidth(label, font) > cardW - CARD_PAD_X) ? 2 : 1;
                    return { cols, rows, cardW, cardH: pic + CARD_PAD_Y + 2 + lines * 1.22 * font, pic, side: false, font };
                };
                const sizes = (s: number) => {
                    const u = Math.min((s * ITEM_GOAL) / share, uMax);
                    return { u, choice: card(Math.min(s * PIC_GOAL, MAX_PIC)) };
                };
                const fits = (s: number) => {
                    const { u, choice } = sizes(s);
                    return choice.cardW <= cellW && choice.pic + CARD_PAD_X <= cellW && u * rowH + gap + rows * choice.cardH + (rows - 1) * CARD_GAP <= height;
                };
                const { u, choice } = sizes(largest(fits));
                const value =
                    worth(u * share, choice.pic) -
                    // Prednost: niz u jednoj traci, izbori u jednom redu, natpis ispod slike
                    (lineCount === 2 ? 0.2 : 0) -
                    (rows === 2 ? 0.04 : 0) -
                    (side ? 0.06 : 0);
                if (!best || value > best.value) best = { value, layout: { kind: "items", u, row, choices: choice, gap } };
            }
        }
    }
    return best!.layout;
}

interface TransferInput {
    n: number;
    carrier: CarrierId;
    /** Broj nizova za izbor i dužina najdužeg */
    count: number;
    length: number;
}

/** Prenošenje pravila: uzor i nizovi za izbor (jedno ispod drugog ili uzor levo, nizovi desno) */
export function layoutTransfer(box: BoardBox, { n, carrier, count, length }: TransferInput): TransferLayout {
    const gap = boardGap(box.h);
    const share = itemShare(carrier);
    const choicesH = (tile: number) => count * (tile + TILE_PAD_Y) + (count - 1) * TILE_GAP;
    const tileByW = (w: number) => Math.min((w - TILE_PAD_X) / length, MAX_TILE);
    let best: { layout: TransferLayout; value: number } | null = null;
    const consider = (layout: TransferLayout, penalty: number) => {
        const value = worth(layout.u * share, layout.tile) - penalty;
        if (!best || value > best.value) best = { value, layout };
    };

    // Jedno ispod drugog: uzor (jedna ili dve trake), pa nizovi
    for (const lineCount of [1, 2] as const) {
        const row = splitRow(n, carrier, lineCount);
        const uMax = Math.min((box.w - ROW_PAD) / row.units, MAX_U);
        const rowH = rowHeightUnits(carrier, row.lines.length, false);
        const height = box.h - (box.short ? BANNER + gap : 0) - gap;
        const sizes = (s: number) => ({ u: Math.min((s * ITEM_GOAL) / share, uMax), tile: Math.min(s * PIC_GOAL, tileByW(box.w)) });
        const { u, tile } = sizes(largest((s) => {
            const { u, tile } = sizes(s);
            return u * rowH + choicesH(tile) <= height;
        }));
        consider({ kind: "transfer", u, row, side: false, leftW: box.w, tile, gap }, lineCount === 2 ? 0.2 : 0);
    }

    // Uzor levo (sa porukom iznad njega), nizovi desno preko cele visine
    const row = splitRow(n, carrier, 1);
    const rowH = rowHeightUnits(carrier, 1, false);
    const inner = box.w - gap;
    for (let part = 0.3; part <= 0.66; part += 0.02) {
        const leftW = inner * part;
        const uMax = Math.min((leftW - ROW_PAD) / row.units, MAX_U, (box.h - (box.short ? BANNER_SIDE + gap : 0)) / rowH);
        const tileMax = Math.min(tileByW(inner - leftW), MAX_TILE);
        const sizes = (s: number) => ({ u: Math.min((s * ITEM_GOAL) / share, uMax), tile: Math.min(s * PIC_GOAL, tileMax) });
        const { u, tile } = sizes(largest((s) => choicesH(sizes(s).tile) <= box.h));
        consider({ kind: "transfer", u, row, side: true, leftW, tile, gap }, 0.05);
    }
    return (best as { layout: TransferLayout } | null)!.layout;
}
