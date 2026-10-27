// Raspored igre „Poređaj po veličini” (mesta u redu i korpa) po stvarnoj veličini polja za igru.
// Predmeti treba da budu što krupniji: na uskom uspravnom telefonu dug red ide na dve police
// (prva polica pa druga, sleva nadesno, klin smera se nastavlja), a na niskom položenom ekranu
// korpa stoji desno od reda. Kad se poredi veličina ili visina, mesta i predmeti u korpi su iste
// veličine; inače korpa sme da ima krupnije kartice. Bez Reacta, da bi se proveravalo u testovima.

export interface BoardBox {
    w: number;
    h: number;
    /** Nizak ekran: kratak natpis o smeru stoji u uglu reda */
    short: boolean;
}

export interface CellLayout {
    /** Mesto u redu (širina, px) i predmet u korpi */
    cell: number;
    tray: number;
    /** Razmak između mesta (px) */
    gap: number;
    /** Koliko mesta ide na svaku policu (jedna ili dve police) */
    shelves: number[];
    trayCols: number;
    /** Korpa desno od reda (umesto ispod) */
    side: boolean;
}

interface CellInput {
    count: number;
    /** Umetanje: koliko predmeta već stoji u redu (red ima i razmake) */
    insert: boolean;
    given: number;
    /** Visina mesta u širinama mesta */
    aspect: number;
    /** Mesta i predmeti u korpi moraju biti iste veličine (poredi se veličina ili visina) */
    same: boolean;
    /** Udeo razmaka (umetanje) u širini mesta */
    gapShare: number;
}

/** Najveće mesto (11rem) i najveća kartica u korpi kad nije ista kao mesto (7rem) */
const MAX_CELL = 176;
const MAX_TRAY = 112;
/** Okvir reda: px-1.5 sa strane; na polici pt-2, pod (do 12 px) i traka sa klinom (20 px) */
const ROW_PAD_X = 12;
const SHELF_CHROME = 8 + 12 + 20;
/** Natpis u uglu reda na niskom ekranu */
const CAPTION = 24;
/** Korpa: ivica i p-1.5 sa svake strane */
const TRAY_PAD = 16;
/** Razmak između reda i korpe (gap-2) */
const PART_GAP = 8;

/** Razmak između mesta: što više predmeta, to tešnje */
export function cellGap(count: number): number {
    return count >= 6 ? 4 : count >= 5 ? 6 : 8;
}

/** Najveći x (0…max) za koji `fits(x)` još važi (monotono) */
function largest(fits: (x: number) => boolean, max: number): number {
    let lo = 0;
    let hi = max;
    for (let i = 0; i < 24; i += 1) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
    }
    return lo;
}

/** Podela reda na police: jedna, ili dve (prva duža ili jednaka) */
function shelvesOf(count: number, lines: 1 | 2): number[] {
    return lines === 1 ? [count] : [Math.ceil(count / 2), Math.floor(count / 2)];
}

export function layoutCells(box: BoardBox, { count, insert, given, aspect, same, gapShare }: CellInput): CellLayout {
    // Kod umetanja razmaci već razdvajaju predmete, pa je razmak najmanji
    const gap = insert ? 4 : cellGap(count);
    const trayCount = insert ? Math.max(count - given, 1) : count;
    // Red: obična mesta, ili kod umetanja predmeti i razmaci između njih (u širinama mesta)
    const rowUnits = (perShelf: number) => (insert ? given + gapShare * (given + 1) : perShelf);
    const rowGaps = (perShelf: number) => (insert ? given * 2 : perShelf - 1);
    const caption = box.short ? CAPTION : 0;
    const colsOptions = insert ? [1] : Array.from(new Set([count, Math.ceil(count / 2), Math.ceil(count / 3)]));

    let best: { layout: CellLayout; value: number } | null = null;
    const consider = (layout: CellLayout, penalty: number) => {
        // Najviše vredi manji od dva (mesto ili kartica u korpi), pa malo i kartica u korpi
        const value = Math.min(layout.cell, layout.tray) * (1 - penalty) + 0.05 * layout.tray;
        if (!best || value > best.value + 0.01) best = { value, layout };
    };

    for (const side of [false, true]) {
        for (const lines of insert || count < 5 || side ? ([1] as const) : ([1, 2] as const)) {
            const shelves = shelvesOf(count, lines);
            const widest = Math.max(...shelves);
            const rowW = (cell: number) => rowUnits(widest) * cell + rowGaps(widest) * gap + ROW_PAD_X;
            const rowH = (cell: number) => lines * (cell * aspect + SHELF_CHROME) + caption;
            for (const cols of colsOptions) {
                const rows = Math.ceil(trayCount / cols);
                const trayW = (tray: number) => cols * tray + (cols - 1) * gap + TRAY_PAD;
                const trayH = (tray: number) => rows * tray * aspect + (rows - 1) * gap + TRAY_PAD;
                const fits = (cell: number, tray: number) =>
                    side
                        ? rowW(cell) + PART_GAP + trayW(tray) <= box.w && rowH(cell) <= box.h && trayH(tray) <= box.h
                        : rowW(cell) <= box.w && trayW(tray) <= box.w && rowH(cell) + PART_GAP + trayH(tray) <= box.h;
                // Prvo najveće mesto uz korpu iste veličine, pa (ako sme) korpa raste u ostatku prostora
                const cell = largest((c) => fits(c, c), MAX_CELL);
                const tray = same ? cell : Math.max(cell, largest((t) => fits(cell, t), Math.max(MAX_TRAY, cell)));
                // Prednost: red na jednoj polici, korpa ispod reda
                consider({ cell, tray, gap, shelves, trayCols: cols, side }, (lines === 2 ? 0.15 : 0) + (side ? 0.03 : 0));
            }
        }
    }
    return (best as { layout: CellLayout } | null)!.layout;
}

// ── Trake (dužina: zmije i olovke) ────────────────────────────────────────────

export interface LaneLayout {
    /** Visina trake (px) */
    lane: number;
    /** Najduži predmet je dug `ratio` visina trake */
    ratio: number;
    /** Korpa desno od reda (umesto ispod); tada je natpis o smeru iznad korpe */
    side: boolean;
    /** Predmeti u korpi po redovima (indeksi u redosledu korpe) */
    trayRows: number[][];
}

/** Najveća traka (4.5rem), najmanja dobra za prst, razmak između traka (0.375rem) */
const MAX_LANE = 72;
const GOOD_LANE = 48;
const LANE_GAP = 6;
/** Red sa trakama: levo klin smera i linija (40 px), gore i dole py-1 */
const LANE_ROW_X = 40;
const LANE_ROW_Y = 8;
/** Predmet u korpi: px-1 i ivice; korpa sa trakama: ivica i p-1; razmak reda i korpe (gap-1.5) */
const LANE_PIECE_PAD = 12;
const LANE_TRAY_PAD = 12;
const LANE_PART_GAP = 6;
/** Crtež je 86 % visine trake; mesto u redu je za pola visine duže od najdužeg crteža */
const ART_SHARE = 0.86;
const SLOT_EXTRA = 0.45;
/** Odnosi dužine i debljine najdužeg predmeta: obično 5, a ako traka ne bi bila dovoljno visoka, kraće */
const RATIOS = [5, 4.5, 4];

/**
 * Predmeti u korpi po redovima: svaki ide u prvi red u koji staje, redom kako su izmešani
 * (ne po dužini — korpa ne sme da otkrije redosled).
 */
export function packLanes(widths: number[], room: number): number[][] | null {
    const rows: { items: number[]; used: number }[] = [];
    for (const [i, width] of widths.entries()) {
        if (width > room) return null;
        const row = rows.find((r) => r.used + LANE_GAP + width <= room);
        if (row) {
            row.items.push(i);
            row.used += LANE_GAP + width;
        } else rows.push({ items: [i], used: width });
    }
    return rows.map((row) => row.items);
}

/** Deo trake koji zauzima predmet (kao `lengthShare` u crtežu: bar jedna visina trake) */
const shareOf = (fraction: number, ratio: number) => Math.max(fraction, 1 / ratio);

/** Širina predmeta u korpi: koliko je dug crtež (bar kvadrat, da se lako dohvati) */
export function lanePieceWidth(fraction: number, lane: number, ratio: number): number {
    return Math.max(shareOf(fraction, ratio) * ratio * ART_SHARE * lane + LANE_PIECE_PAD, lane);
}

/** Širina mesta u redu, u visinama trake */
export const laneSlotUnits = (ratio: number) => ratio * ART_SHARE + SLOT_EXTRA;

/**
 * Red od `count` traka (svaka puna dužina, da se vidi koliko je koji predmet dug) i korpa u kojoj
 * predmeti zauzimaju samo svoju dužinu, u jednom ili više redova — ispod reda ili desno od njega.
 * `fractions`: vrednost / najveća vrednost, redom kao u korpi.
 */
export function layoutLanes(box: BoardBox, fractions: number[]): LaneLayout {
    const count = fractions.length;
    const caption = box.short ? CAPTION : 0;
    let best: LaneLayout | null = null;

    for (const ratio of RATIOS) {
        const rowW = (lane: number) => laneSlotUnits(ratio) * lane + LANE_ROW_X;
        const rowH = (lane: number) => count * lane + (count - 1) * LANE_GAP + LANE_ROW_Y;
        const trayH = (lane: number, rows: number) => rows * lane + (rows - 1) * LANE_GAP + LANE_TRAY_PAD;
        let found: LaneLayout | null = null;
        for (const side of [false, true]) {
            const pack = (lane: number) => {
                const room = (side ? box.w - rowW(lane) - LANE_PART_GAP : box.w) - LANE_TRAY_PAD;
                return packLanes(fractions.map((fraction) => lanePieceWidth(fraction, lane, ratio)), room);
            };
            const fits = (lane: number) => {
                const rows = pack(lane);
                if (!rows || rowW(lane) > box.w) return false;
                // Natpis (nizak ekran) stoji iznad korpe kad je ona desno, inače u uglu reda
                return side
                    ? Math.max(rowH(lane), trayH(lane, rows.length) + caption) <= box.h
                    : rowH(lane) + caption + LANE_PART_GAP + trayH(lane, rows.length) <= box.h;
            };
            // Pakovanje nije sasvim monotono (red više ili manje), pa se traži od najveće trake naniže
            let lane = 0;
            for (let size = MAX_LANE; size >= 16; size -= 0.5) {
                if (fits(size)) {
                    lane = size;
                    break;
                }
            }
            if (!found || lane > found.lane + 0.01) found = { lane, ratio, side, trayRows: pack(lane) ?? [fractions.map((_, i) => i)] };
        }
        // Prednost ima uobičajen (duži) odnos, čim je traka dovoljno visoka
        if (!best || (best.lane < GOOD_LANE && found!.lane > best.lane + 0.01)) best = found;
        if (best!.lane >= GOOD_LANE) break;
    }
    return best!;
}
