// Bojanka — nivoi. Podrška se postepeno povlači (od najviše ka najmanje pomoći):
//
//   1–3   Oboji kao na primeru: primer u boji stoji pored slike, predloženi deo je označen,
//         a njegova boja istaknuta u paleti (učenje bez grešaka). Mali broj velikih delova.
//   4     Primer + označen deo; boju dete samo nalazi na primeru.
//   5     Primer bez ikakvih oznaka; dete bira deo i boju samo.
//   6     Primer se vidi samo na zahtev (dugme „Pogledaj primer”) — dete pamti šta je videlo.
//   7–9   Boje po brojevima: u svakom delu piše broj, a uz svaku boju u paleti njen broj
//         (1 = …, 2 = …). Prvo dve-tri boje, veliki brojevi, istaknuta boja u paleti i označeni
//         svi delovi sa brojem izabrane boje; zatim bez oznaka; na kraju više boja i manji brojevi.
//   10–11 Bojenje po izgovorenom uputstvu („Oboji krov crvenom bojom”); uz uputstvo stoji krug u
//         traženoj boji, a na 10. nivou je i traženi deo označen.
//   12–14 Samo uputstvo: bez kruga u boji, pa iz svih 12 boja (i svetlih nijansi), na kraju bez
//         kratkog pokazivanja dela.
//   15    Slobodno bojenje najveće slike, svim bojama, bez primera i bez pogrešnog ishoda.
//
// Kako nivoi rastu, raste i broj delova (a delovi su sve manji) i broj ponuđenih boja.

import { BASIC_COLORS, COLORS, PICTURE_BY_ID, zoneOrder, modelColors, type ColorId, type Picture, type Zone } from "./coloringPictures";

/** copy: po primeru · number: po brojevima · verbal: po uputstvu · free: slobodno */
export type ColoringMode = "copy" | "number" | "verbal" | "free";
/** Primer u boji: stalno na ekranu, samo na zahtev ili ga nema */
export type ModelView = "shown" | "request" | "none";

export interface ColoringLevel {
    mode: ColoringMode;
    model: ModelView;
    /** Bojenje po primeru: predloženi deo je označen. Po uputstvu: traženi deo je stalno označen. */
    showZone: boolean;
    /** Po primeru i po brojevima: boja predloženog dela je istaknuta u paleti */
    showColor: boolean;
    /** Po brojevima: kad je boja izabrana, označeni su svi delovi sa njenim brojem */
    showMatches: boolean;
    /** Po brojevima: veličina broja u odnosu na širinu slike */
    numberSize: number;
    /** Po uputstvu: uz uputstvo stoji krug u traženoj boji */
    showSwatch: boolean;
    /** Po uputstvu: traženi deo kratko zasvetli dok se uputstvo izgovara */
    pulseZone: boolean;
    /** Isticanje stiže već posle prve greške (rani nivoi), bez obzira na podešavanje „posle dve” */
    earlyHint: boolean;
    /** Slike nivoa (id-jevi); bira se jedna nasumično */
    pictures: string[];
    /** Po primeru: koliko boja se nudi preko onih sa primera. Po uputstvu: koliko boja se nudi. Po brojevima: samo boje sa brojem. */
    colors: number;
    /** Boje se biraju iz svih 12 (uz svetle nijanse, sivu i crnu), inače iz osnovnih 8 */
    full: boolean;
}

const copy = (pictures: string[], colors: number, support: Partial<ColoringLevel> = {}): ColoringLevel => ({
    mode: "copy",
    model: "shown",
    showZone: false,
    showColor: false,
    showMatches: false,
    numberSize: 0,
    showSwatch: false,
    pulseZone: false,
    earlyHint: false,
    pictures,
    colors,
    full: false,
    ...support,
});

const numbers = (pictures: string[], numberSize: number, support: Partial<ColoringLevel> = {}): ColoringLevel => ({
    mode: "number",
    model: "none",
    showZone: false,
    showColor: false,
    showMatches: false,
    numberSize,
    showSwatch: false,
    pulseZone: false,
    earlyHint: false,
    pictures,
    colors: 0,
    full: true,
    ...support,
});

const verbal = (pictures: string[], colors: number, support: Partial<ColoringLevel> = {}): ColoringLevel => ({
    mode: "verbal",
    model: "none",
    showZone: false,
    showColor: false,
    showMatches: false,
    numberSize: 0,
    showSwatch: false,
    pulseZone: true,
    earlyHint: false,
    pictures,
    colors,
    full: false,
    ...support,
});

export const COLORING_LEVELS: ColoringLevel[] = [
    // Lako: primer u boji pored slike
    copy(["baloni", "jabuka", "pecurka"], 0, { showZone: true, showColor: true, earlyHint: true }),
    copy(["lubenica", "bubamara"], 1, { showZone: true, showColor: true, earlyHint: true }),
    copy(["sladoled", "puz"], 2, { showZone: true, showColor: true, earlyHint: true }),
    copy(["pile", "kruna"], 2, { showZone: true, earlyHint: true }),
    copy(["kornjaca", "sunce", "brod", "torta"], 3, { earlyHint: true }),
    // Srednje: primer na zahtev, pa boje po brojevima
    copy(["avion", "duga", "zeka", "dino"], 3, { model: "request" }),
    numbers(["drvo", "lopta"], 0.13, { showColor: true, showMatches: true, earlyHint: true }),
    numbers(["cvet", "raketa", "kruna"], 0.11),
    numbers(["leptir", "autobus", "voz"], 0.085),
    verbal(["kucica", "meda", "voz"], 4, { showZone: true, showSwatch: true }),
    // Teško: samo izgovoreno uputstvo
    verbal(["riba", "auto", "sova"], 6, { showSwatch: true }),
    verbal(["sova", "meda", "auto"], 6),
    verbal(["slon", "macka", "riba"], 6, { full: true }),
    verbal(["robot", "zamak", "slon", "macka"], 6, { full: true, pulseZone: false }),
    {
        mode: "free",
        model: "none",
        showZone: false,
        showColor: false,
        showMatches: false,
        numberSize: 0,
        showSwatch: false,
        pulseZone: false,
        earlyHint: false,
        pictures: ["zamak", "robot", "slon", "macka", "dino", "voz"],
        colors: COLORS.length,
        full: true,
    },
];

export function coloringLevel(level: number): ColoringLevel {
    const safe = Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), COLORING_LEVELS.length) : 1;
    return COLORING_LEVELS[safe - 1];
}

/** Jedan zadatak bojenja po uputstvu: deo, boja i boje koje se nude. */
export interface ColoringTask {
    zone: string;
    color: ColorId;
    /** Ponuđene boje, redom palete */
    options: ColorId[];
}

export interface ColoringPlan {
    level: ColoringLevel;
    picture: Picture;
    /** Delovi koje dete boji, redom predloga (po primeru) ili zadataka (po uputstvu) */
    zones: Zone[];
    /** Delovi obojeni od početka (kad dete ima manje zadataka nego što slika ima delova) */
    prefilled: Record<string, ColorId>;
    /** Paleta za bojenje po primeru, po brojevima (redom brojeva) i slobodno bojenje (redom palete) */
    palette: ColorId[];
    /** Zadaci za bojenje po uputstvu */
    tasks: ColoringTask[];
}

/** Granice iz podešavanja deteta (uzrast i izbor roditelja). */
export interface ColoringLimits {
    rounds: number;
    choices: number;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

const ALL_IDS = COLORS.map((color) => color.id);

/** Boje redom palete (kao u COLORS) */
function inPaletteOrder(ids: Iterable<ColorId>): ColorId[] {
    const set = new Set(ids);
    return ALL_IDS.filter((id) => set.has(id));
}

/**
 * Plan nivoa. `pictureId` bira sliku (monitor je dobija od igre); bez njega se slika bira nasumično
 * među slikama nivoa. `limits` su podešavanja deteta; monitor (null) dobija sve delove bez ograničenja.
 */
export function buildColoringPlan(levelNumber: number, limits: ColoringLimits | null, pictureId?: string, random: () => number = Math.random): ColoringPlan {
    const level = coloringLevel(levelNumber);
    const chosen = pictureId && level.pictures.includes(pictureId) ? pictureId : level.pictures[Math.floor(random() * level.pictures.length)];
    const picture = PICTURE_BY_ID[chosen] ?? PICTURE_BY_ID[level.pictures[0]]!;
    const ordered = zoneOrder(picture);

    // Mlađa deca imaju manje zadataka: poslednji delovi iz redosleda su obojeni od početka
    const count = level.mode === "free" || !limits ? ordered.length : Math.max(1, Math.min(ordered.length, limits.rounds));
    const zones = ordered.slice(0, count);
    const prefilled: Record<string, ColorId> = Object.fromEntries(ordered.slice(count).map((zone) => [zone.id, zone.c]));

    const source = level.full ? ALL_IDS : ALL_IDS.slice(0, BASIC_COLORS);
    let palette: ColorId[] = [];
    let tasks: ColoringTask[] = [];

    if (level.mode === "free") {
        palette = [...ALL_IDS];
    } else if (level.mode === "number") {
        // Svaka boja sa slike dobija broj: 1 je boja prvog dela u redosledu, 2 sledeće nove boje…
        palette = modelColors(zones);
    } else if (level.mode === "copy") {
        // Sve boje sa primera, plus nekoliko drugih (koliko dozvoljavaju podešavanja deteta)
        const needed = modelColors(zones);
        const room = limits ? Math.max(0, limits.choices - needed.length) : level.colors;
        const extraCount = Math.min(level.colors, room);
        const spare = shuffled(source.filter((id) => !needed.includes(id)), random).slice(0, extraCount);
        palette = inPaletteOrder([...needed, ...spare]);
    } else {
        const offered = Math.max(2, Math.min(level.colors, limits ? limits.choices : level.colors));
        tasks = zones.map((zone) => {
            const others = shuffled(source.filter((id) => id !== zone.c), random).slice(0, offered - 1);
            return { zone: zone.id, color: zone.c, options: inPaletteOrder([zone.c, ...others]) };
        });
    }

    return { level, picture, zones, prefilled, palette, tasks };
}

/** Broj boje na nivoima „po brojevima” (1, 2, 3…); 0 kad boja nema broj */
export function colorNumber(plan: Pick<ColoringPlan, "palette">, color: ColorId | string | undefined): number {
    return color ? plan.palette.indexOf(color as ColorId) + 1 : 0;
}
