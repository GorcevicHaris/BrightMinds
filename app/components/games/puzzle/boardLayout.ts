// Raspored table i korpe za „Složi sliku” (bez Reacta, da ga testovi proveravaju za svaki ekran).
//
// Iz veličine slobodnog prostora računa se: da li korpa stoji ispod table (telefon uspravno)
// ili pored nje (položen telefon, tablet, računar), koliko je tabla velika i koliko delova
// korpa prikazuje odjednom. Svaki deo u korpi je cilj za dodir od najmanje TOUCH_MIN piksela;
// kad svi delovi ne mogu da stanu toliko veliki (16 delova na uskom telefonu), korpa prikazuje
// manje delova, a sledeći deo dolazi na mesto stavljenog — tabla ostaje velika, a ekran miran.

import { PUZZLE_H, PUZZLE_W } from "@/app/components/games/data/puzzleLevels";

/** Najmanja strana dela u korpi (px) — veliki cilj za dodir i za mali prst */
export const TOUCH_MIN = 64;
/** Razmak između table i korpe i između delova u korpi (px) */
export const GAP = 10;
/** Unutrašnji razmak korpe (px): delovi ne dodiruju njenu ivicu */
export const TRAY_PAD = 8;

export interface PuzzleLayout {
    /** Korpa je desno od table (inače ispod) */
    side: boolean;
    /** Tabla (px), u gornjem levom uglu prostora; ostatak je korpa */
    board: { x: number; y: number; w: number; h: number };
    /** Piksela po jedinici slike na tabli */
    scale: number;
    tray: { x: number; y: number; w: number; h: number; cols: number; rows: number; item: { w: number; h: number }; capacity: number };
}

interface Input {
    width: number;
    height: number;
    cols: number;
    rows: number;
    /** Margina oko polja za ušice (jedinice slike) */
    margin: number;
    /** Koliko delova ima u korpi */
    pieces: number;
}

interface Candidate extends PuzzleLayout {
    /** Kraća strana dela u korpi (px) */
    touch: number;
    /** Veličina dela u korpi u odnosu na tablu (1 = ista) */
    shrink: number;
}

function pack(count: number, w: number, h: number, itemW: number, itemH: number) {
    let best = { cols: 1, rows: count, s: 0 };
    for (let cols = 1; cols <= count; cols += 1) {
        const rows = Math.ceil(count / cols);
        const s = Math.min((w - (cols - 1) * GAP) / (cols * itemW), (h - (rows - 1) * GAP) / (rows * itemH), 1);
        if (s > best.s) best = { cols, rows, s };
    }
    return best;
}

function candidates(input: Input, capacity: number): Candidate[] {
    const { width, height, cols, rows, margin } = input;
    const itemW = PUZZLE_W / cols + 2 * margin;
    const itemH = PUZZLE_H / rows + 2 * margin;
    const out: Candidate[] = [];
    for (const side of [false, true]) {
        for (let f = 0.3; f <= 0.81; f += 0.02) {
            const boardW = side ? Math.min(width * f, height * (PUZZLE_W / PUZZLE_H)) : Math.min(width, height * f * (PUZZLE_W / PUZZLE_H));
            const boardH = boardW * (PUZZLE_H / PUZZLE_W);
            const scale = boardW / PUZZLE_W;
            const trayW = side ? width - boardW - GAP : width;
            const trayH = side ? height : height - boardH - GAP;
            if (trayW <= 0 || trayH <= 0) continue;
            const fit = pack(capacity, trayW - 2 * TRAY_PAD, trayH - 2 * TRAY_PAD, itemW * scale, itemH * scale);
            const item = { w: itemW * scale * fit.s, h: itemH * scale * fit.s };
            out.push({
                side,
                board: side ? { x: 0, y: Math.max(0, (height - boardH) / 2), w: boardW, h: boardH } : { x: (width - boardW) / 2, y: 0, w: boardW, h: boardH },
                scale,
                tray: { x: side ? boardW + GAP : 0, y: side ? 0 : boardH + GAP, w: trayW, h: trayH, cols: fit.cols, rows: fit.rows, item, capacity },
                touch: Math.min(item.w, item.h),
                shrink: fit.s,
            });
        }
    }
    return out;
}

/**
 * Najveća tabla uz koju korpa i dalje prikazuje delove od bar TOUCH_MIN px. Prvo se probaju svi
 * delovi odjednom; ako tada tabla ispadne mala (ispod 60 % najveće moguće), korpa prikazuje manje delova.
 */
export function puzzleLayout(input: Input): PuzzleLayout {
    const width = Math.max(input.width, 1);
    const height = Math.max(input.height, 1);
    const safe = { ...input, width, height };
    const largest = Math.min(width, height * (PUZZLE_W / PUZZLE_H));
    const total = Math.max(input.pieces, 1);
    const least = Math.min(total, 3);
    let fallback: Candidate | null = null;
    for (let capacity = total; capacity >= least; capacity -= 1) {
        const all = candidates(safe, capacity);
        const fitting = all.filter((c) => c.touch >= TOUCH_MIN && c.board.w >= largest * 0.6);
        // Delovi u korpi ne smeju biti mnogo sitniji od svog mesta na tabli (inače ih dete ne prepoznaje):
        // uz veću tablu prednost ima raspored u kom je deo u korpi bar 60 % svoje veličine na tabli
        const value = (c: Candidate) => c.board.w * Math.min(1, c.shrink / 0.6);
        if (fitting.length > 0) return strip(fitting.reduce((a, b) => (value(b) > value(a) ? b : a)));
        const touchy = all.reduce<Candidate | null>((a, b) => (!a || b.touch * Math.sqrt(b.board.w) > a.touch * Math.sqrt(a.board.w) ? b : a), null);
        if (touchy && (!fallback || touchy.touch > fallback.touch)) fallback = touchy;
    }
    if (fallback) return strip(fallback);
    // Prostor još nije izmeren (ili je premali): tabla preko celog prostora, bez korpe
    const boardW = Math.min(width, height * (PUZZLE_W / PUZZLE_H));
    return {
        side: false,
        board: { x: 0, y: 0, w: boardW, h: boardW * (PUZZLE_H / PUZZLE_W) },
        scale: boardW / PUZZLE_W,
        tray: { x: 0, y: 0, w: 0, h: 0, cols: 1, rows: 1, item: { w: 0, h: 0 }, capacity: least },
    };
}

function strip({ side, board, scale, tray }: Candidate): PuzzleLayout {
    return { side, board, scale, tray };
}

/**
 * Koji deo stoji na kom mestu u korpi. Na početku su prvi delovi redom korpe; kad se deo stavi
 * na tablu, na njegovo mesto dolazi sledeći deo iz reda — ostali delovi se ne pomeraju.
 */
export function traySlots(order: readonly string[], placed: readonly string[], capacity: number): (string | null)[] {
    const queue = [...order];
    const slots: (string | null)[] = Array.from({ length: Math.max(capacity, 0) }, () => queue.shift() ?? null);
    for (const id of placed) {
        const index = slots.indexOf(id);
        if (index >= 0) slots[index] = queue.shift() ?? null;
        else if (queue.includes(id)) queue.splice(queue.indexOf(id), 1);
    }
    return slots;
}

/**
 * Na koje polje je deo spušten: (x, y) je središte polja dela u jedinicama slike. Deo koji je
 * spušten bar približno na svoje polje (`own`, polje uvećano za četvrtinu) uvek „sedne” — i kad
 * je malo bliži susedu (mali prsti nisu precizni). Inače važi najbliže polje; daleko od table → null.
 */
export function dropCell(cols: number, rows: number, x: number, y: number, own: number | null): number | null {
    const cw = PUZZLE_W / cols;
    const ch = PUZZLE_H / rows;
    if (x < -cw / 2 || x > PUZZLE_W + cw / 2 || y < -ch / 2 || y > PUZZLE_H + ch / 2) return null;
    if (own !== null) {
        const ox = (own % cols) * cw;
        const oy = Math.floor(own / cols) * ch;
        if (x >= ox - cw * 0.25 && x <= ox + cw * 1.25 && y >= oy - ch * 0.25 && y <= oy + ch * 1.25) return own;
    }
    const col = Math.min(cols - 1, Math.max(0, Math.floor(x / cw)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(y / ch)));
    return row * cols + col;
}
