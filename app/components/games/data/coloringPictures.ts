// Bojanka — boje i slike (bez Reacta, da ih testovi i igra dele).
//
// Svaka slika je crtež od delova (`zones`) koji se boje dodirom. Svaki deo ima svoju boju „sa
// primera” (`c`): na lakšim nivoima dete boji sliku tako da liči na obojen primer, a na težim
// po izgovorenom uputstvu („Oboji krov crvenom bojom”). Redosled `order` je redosled kojim se
// delovi predlažu i zadaju (prvo veliki i važni delovi); kad je zadataka manje od delova
// (mlađa deca), poslednji delovi iz `order` su unapred obojeni.

// ── Boje ──────────────────────────────────────────────────────────────────────
// Bele nema namerno: na belom papiru se ne vidi, pa dete ne bi dobilo potvrdu.

export type ColorId = "red" | "orange" | "yellow" | "green" | "lime" | "blue" | "sky" | "purple" | "pink" | "brown" | "gray" | "black";

/** Rod i broj imenice (deo slike), od kojih zavisi oblik prideva: "krov je crven", "trava je zelena", "uši su roze" */
export type Gram = "m" | "f" | "n" | "mpl" | "fpl" | "npl";

export const VERB: Record<Gram, string> = { m: "je", f: "je", n: "je", mpl: "su", fpl: "su", npl: "su" };

export interface PaintColor {
    id: ColorId;
    hex: string;
    /** "crvena" (boja) */
    nom: string;
    /** "Izaberi crvenu boju" */
    acc: string;
    /** "Oboji krov crvenom bojom" */
    inst: string;
    /** "Krov je crven" — oblik za svaki rod i broj je zadat posebno, ne izvodi se iz imena boje */
    adj: Record<Gram, string>;
    /** Svetla boja — kvačica izabrane boje je tamna */
    light?: boolean;
}

/** Prvih osam su osnovne boje; svetle nijanse, siva i crna dolaze tek na težim nivoima. */
export const COLORS: PaintColor[] = [
    {
        id: "red",
        hex: "#EF4444",
        nom: "crvena",
        acc: "crvenu",
        inst: "crvenom",
        adj: { m: "crven", f: "crvena", n: "crveno", mpl: "crveni", fpl: "crvene", npl: "crvena" },
    },
    {
        id: "orange",
        hex: "#F97316",
        nom: "narandžasta",
        acc: "narandžastu",
        inst: "narandžastom",
        adj: { m: "narandžast", f: "narandžasta", n: "narandžasto", mpl: "narandžasti", fpl: "narandžaste", npl: "narandžasta" },
    },
    {
        id: "yellow",
        hex: "#FACC15",
        nom: "žuta",
        acc: "žutu",
        inst: "žutom",
        adj: { m: "žut", f: "žuta", n: "žuto", mpl: "žuti", fpl: "žute", npl: "žuta" },
        light: true,
    },
    {
        id: "green",
        hex: "#16A34A",
        nom: "zelena",
        acc: "zelenu",
        inst: "zelenom",
        adj: { m: "zelen", f: "zelena", n: "zeleno", mpl: "zeleni", fpl: "zelene", npl: "zelena" },
    },
    {
        id: "blue",
        hex: "#2563EB",
        nom: "plava",
        acc: "plavu",
        inst: "plavom",
        adj: { m: "plav", f: "plava", n: "plavo", mpl: "plavi", fpl: "plave", npl: "plava" },
    },
    {
        id: "purple",
        hex: "#9333EA",
        nom: "ljubičasta",
        acc: "ljubičastu",
        inst: "ljubičastom",
        adj: { m: "ljubičast", f: "ljubičasta", n: "ljubičasto", mpl: "ljubičasti", fpl: "ljubičaste", npl: "ljubičasta" },
    },
    {
        id: "pink",
        hex: "#F472B6",
        nom: "roze",
        acc: "roze",
        inst: "roze",
        adj: { m: "roze", f: "roze", n: "roze", mpl: "roze", fpl: "roze", npl: "roze" },
    },
    {
        id: "brown",
        hex: "#92400E",
        nom: "braon",
        acc: "braon",
        inst: "braon",
        adj: { m: "braon", f: "braon", n: "braon", mpl: "braon", fpl: "braon", npl: "braon" },
    },
    {
        id: "lime",
        hex: "#86EFAC",
        nom: "svetlozelena",
        acc: "svetlozelenu",
        inst: "svetlozelenom",
        adj: { m: "svetlozelen", f: "svetlozelena", n: "svetlozeleno", mpl: "svetlozeleni", fpl: "svetlozelene", npl: "svetlozelena" },
        light: true,
    },
    {
        id: "sky",
        hex: "#7DD3FC",
        nom: "svetloplava",
        acc: "svetloplavu",
        inst: "svetloplavom",
        adj: { m: "svetloplav", f: "svetloplava", n: "svetloplavo", mpl: "svetloplavi", fpl: "svetloplave", npl: "svetloplava" },
        light: true,
    },
    {
        id: "gray",
        hex: "#9CA3AF",
        nom: "siva",
        acc: "sivu",
        inst: "sivom",
        adj: { m: "siv", f: "siva", n: "sivo", mpl: "sivi", fpl: "sive", npl: "siva" },
    },
    {
        id: "black",
        hex: "#1F2937",
        nom: "crna",
        acc: "crnu",
        inst: "crnom",
        adj: { m: "crn", f: "crna", n: "crno", mpl: "crni", fpl: "crne", npl: "crna" },
    },
];

export const COLOR_BY_ID: Record<string, PaintColor | undefined> = Object.fromEntries(COLORS.map((c) => [c.id, c]));

/** Osnovne boje: prvih osam iz COLORS */
export const BASIC_COLORS = 8;

export const PAPER = "#FFFFFF";
export const INK = "#1F2937";

// ── Slike ─────────────────────────────────────────────────────────────────────

export interface Zone {
    id: string;
    /** "krov" */
    name: string;
    /** "Oboji krov" */
    acc: string;
    /** Rod i broj imena, za rečenicu "Krov je crven." */
    g: Gram;
    d: string;
    /** Boja ovog dela na primeru */
    c: ColorId;
    /** Širina nevidljive ivice koja malom delu daje veću površinu za dodir */
    hit?: number;
}

export interface Detail {
    d: string;
    fill: string;
}

export interface Picture {
    id: string;
    name: string;
    /** "Oboji kućicu" */
    acc: string;
    emoji: string;
    viewBox: string;
    /** Delovi za bojenje, redom kojim se crtaju (kasniji su iznad ranijih) */
    zones: Zone[];
    /** Unapred obojeni ukrasi (oči, kvaka…) — ne mogu se bojiti */
    details?: Detail[];
    /** Ukrasne linije (brkovi, osmeh…) */
    lines?: string;
    /** Redosled zadataka i predloga (id-jevi delova); bez njega važi redosled crtanja */
    order?: string[];
    /**
     * Simetrična slika („oboji drugu polovinu”): `axis` je x linije ogledala, a `pairs` vodi od
     * dela na desnoj polovini do njegovog odraza na levoj (levi je obojen od početka).
     */
    mirror?: { axis: number; pairs: Record<string, string> };
}

function ellipse(cx: number, cy: number, rx: number, ry: number, rotation = 0): string {
    const rad = (rotation * Math.PI) / 180;
    const dx = Math.round(rx * Math.cos(rad) * 10) / 10;
    const dy = Math.round(rx * Math.sin(rad) * 10) / 10;
    return `M${cx - dx},${cy - dy} a${rx},${ry} ${rotation} 1,0 ${2 * dx},${2 * dy} a${rx},${ry} ${rotation} 1,0 ${-2 * dx},${-2 * dy} Z`;
}

function circle(cx: number, cy: number, r: number): string {
    return ellipse(cx, cy, r, r);
}

function rect(x: number, y: number, w: number, h: number): string {
    return `M${x},${y} h${w} v${h} h${-w} Z`;
}

/** Pravougaonik zaobljenih uglova */
function rrect(x: number, y: number, w: number, h: number, r: number): string {
    return `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0,1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0,1 ${-r},${r} h${-(w - 2 * r)} a${r},${r} 0 0,1 ${-r},${-r} v${-(h - 2 * r)} a${r},${r} 0 0,1 ${r},${-r} Z`;
}

/** Luk duge između poluprečnika `outer` i `inner`, iznad tačke (cx, cy) */
function band(cx: number, cy: number, outer: number, inner: number): string {
    return `M${cx - outer},${cy} A${outer},${outer} 0 0,1 ${cx + outer},${cy} L${cx + inner},${cy} A${inner},${inner} 0 0,0 ${cx - inner},${cy} Z`;
}

/** Balon sa čvorićem ispod */
function balloon(cx: number, cy: number, rx: number, ry: number): string {
    const bottom = cy + ry;
    return `${ellipse(cx, cy, rx, ry)} M${cx - 9},${bottom + 12} L${cx},${bottom - 3} L${cx + 9},${bottom + 12} Z`;
}

/** Oblak sa donjom ivicom na `y`, širine `w`, počinje na `x` */
function cloud(x: number, y: number, w: number): string {
    const s = w / 100;
    const p = (dx: number, dy: number) => `${Math.round((x + dx * s) * 10) / 10},${Math.round((y + dy * s) * 10) / 10}`;
    return `M${p(12, 0)} C${p(-4, 0)} ${p(-4, -26)} ${p(14, -28)} C${p(14, -50)} ${p(46, -56)} ${p(56, -38)} C${p(70, -50)} ${p(98, -42)} ${p(94, -22)} C${p(108, -20)} ${p(106, 0)} ${p(90, 0)} Z`;
}

const z = (id: string, name: string, acc: string, g: Gram, c: ColorId, d: string, hit?: number): Zone => (hit ? { id, name, acc, g, c, d, hit } : { id, name, acc, g, c, d });


// ── Ogledalo ──────────────────────────────────────────────────────────────────

/** Koliko brojeva uzima svaka SVG naredba putanje */
const PATH_ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };
/** Koji brojevi naredbe su x (preslikavaju se preko ose) */
const X_ARGS: Record<string, number[]> = { m: [0], l: [0], h: [0], v: [], c: [0, 2, 4], s: [0, 2], q: [0, 2], t: [0], a: [5], z: [] };

const fmt = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Odraz putanje u ogledalu (vertikalna osa `axis`): x → 2·axis − x za apsolutne naredbe,
 * x → −x za relativne; luk menja smer (sweep) i ugao. Tako se desna polovina simetrične
 * slike dobija iz leve, tačno kao u ogledalu.
 */
export function mirrorPath(d: string, axis: number): string {
    const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
    const out: string[] = [];
    let i = 0;
    while (i < tokens.length) {
        const command = tokens[i];
        i += 1;
        const lower = command.toLowerCase();
        const count = PATH_ARGS[lower];
        if (count === undefined) continue;
        const absolute = command !== lower;
        if (count === 0) {
            out.push(command);
            continue;
        }
        const groups: string[] = [];
        do {
            const args = tokens.slice(i, i + count).map(Number);
            i += count;
            for (const index of X_ARGS[lower]) args[index] = absolute ? 2 * axis - args[index] : -args[index];
            if (lower === "a") {
                args[2] = -args[2];
                args[4] = args[4] ? 0 : 1;
            }
            const pairs = Array.from({ length: Math.ceil(args.length / 2) }, (_, k) => args.slice(2 * k, 2 * k + 2).map(fmt).join(","));
            groups.push(lower === "a" ? `${fmt(args[0])},${fmt(args[1])} ${fmt(args[2])} ${args[3]},${args[4]} ${fmt(args[5])},${fmt(args[6])}` : pairs.join(" "));
        } while (i < tokens.length && !/[A-Za-z]/.test(tokens[i]));
        out.push(`${command}${groups.join(" ")}`);
    }
    return out.join(" ");
}

interface Half {
    id: string;
    name: string;
    acc: string;
    g: Gram;
    c: ColorId;
    /** Deo na levoj polovini; desni se dobija ogledalom */
    d: string;
    hit?: number;
}

/**
 * Simetrična slika: svaki deo postoji na levoj (`-l`) i desnoj (`-d`) polovini, iste boje i istog
 * imena. Leva polovina je obojena od početka; dete boji desne delove redom kojim su navedeni.
 */
function symmetric(base: Omit<Picture, "zones" | "order" | "mirror">, axis: number, halves: Half[]): Picture {
    const zones: Zone[] = halves.flatMap((half) => [
        z(`${half.id}-l`, half.name, half.acc, half.g, half.c, half.d, half.hit),
        z(`${half.id}-d`, half.name, half.acc, half.g, half.c, mirrorPath(half.d, axis), half.hit),
    ]);
    return {
        ...base,
        zones,
        order: halves.map((half) => `${half.id}-d`),
        mirror: { axis, pairs: Object.fromEntries(halves.map((half) => [`${half.id}-d`, `${half.id}-l`])) },
    };
}

export const PICTURES: Picture[] = [
    // ── Tri velika dela ──────────────────────────────────────────────────────
    {
        id: "baloni",
        name: "Baloni",
        acc: "balone",
        emoji: "🎈",
        viewBox: "60 30 280 350",
        zones: [
            z("levi", "levi balon", "levi balon", "m", "red", balloon(130, 160, 56, 68)),
            z("desni", "desni balon", "desni balon", "m", "blue", balloon(270, 160, 56, 68)),
            z("srednji", "srednji balon", "srednji balon", "m", "yellow", balloon(200, 112, 58, 70)),
        ],
        lines: "M130,240 Q150,305 200,372 M270,240 Q250,305 200,372 M200,194 Q188,285 200,372",
        order: ["srednji", "levi", "desni"],
    },
    {
        id: "jabuka",
        name: "Jabuka",
        acc: "jabuku",
        emoji: "🍎",
        viewBox: "80 40 240 315",
        zones: [
            z(
                "jabuka",
                "jabuka",
                "jabuku",
                "f",
                "red",
                "M200,125 C170,100 95,105 95,190 C95,270 150,340 185,340 C193,340 196,334 200,334 C204,334 207,340 215,340 C250,340 305,270 305,190 C305,105 230,100 200,125 Z"
            ),
            z("peteljka", "peteljka", "peteljku", "f", "brown", "M190,66 Q198,95 194,122 L208,122 Q212,95 204,62 Z", 14),
            z("list", "list", "list", "m", "green", "M206,98 Q236,48 296,64 Q268,116 206,104 Z", 8),
        ],
        lines: "M134,182 Q136,156 156,142",
        order: ["jabuka", "list", "peteljka"],
    },
    {
        id: "pecurka",
        name: "Pečurka",
        acc: "pečurku",
        emoji: "🍄",
        viewBox: "45 70 310 300",
        zones: [
            z("trava", "trava", "travu", "f", "green", "M55,330 Q200,302 345,330 L345,364 L55,364 Z"),
            z("stabljika", "stabljika", "stabljiku", "f", "yellow", "M162,212 Q158,290 148,338 L252,338 Q242,290 238,212 Z"),
            z("sesir", "šešir", "šešir", "m", "red", "M68,226 Q66,88 200,82 Q334,88 332,226 Q200,252 68,226 Z"),
        ],
        details: [{ d: `${circle(132, 168, 17)} ${circle(212, 126, 15)} ${circle(272, 182, 16)} ${circle(186, 198, 11)}`, fill: PAPER }],
        order: ["sesir", "stabljika", "trava"],
    },
    {
        id: "lubenica",
        name: "Lubenica",
        acc: "lubenicu",
        emoji: "🍉",
        viewBox: "15 130 370 220",
        zones: [
            z("tanjir", "tanjir", "tanjir", "m", "blue", ellipse(200, 300, 180, 40)),
            z("kora", "kora", "koru", "f", "green", "M48,150 A152,152 0 0,0 352,150 Z"),
            z("sredina", "sredina", "sredinu", "f", "red", "M80,150 A120,120 0 0,0 320,150 Z"),
        ],
        details: [
            {
                d: `${ellipse(150, 186, 5, 9)} ${ellipse(200, 214, 5, 9)} ${ellipse(250, 186, 5, 9)} ${ellipse(176, 246, 5, 9)} ${ellipse(226, 246, 5, 9)}`,
                fill: INK,
            },
        ],
        order: ["sredina", "kora", "tanjir"],
    },
    {
        id: "bubamara",
        name: "Bubamara",
        acc: "bubamaru",
        emoji: "🐞",
        viewBox: "40 35 325 330",
        zones: [
            z("list", "list", "list", "m", "green", "M55,300 Q70,115 250,88 Q368,76 345,150 Q320,300 140,344 Q80,352 55,300 Z"),
            z("glava", "glava", "glavu", "f", "black", circle(205, 120, 42)),
            z("krila", "krila", "krila", "npl", "red", "M205,128 A92,102 0 0,0 205,332 Z M205,128 A92,102 0 0,1 205,332 Z"),
        ],
        details: [
            { d: `${circle(168, 190, 17)} ${circle(162, 272, 15)} ${circle(242, 190, 17)} ${circle(248, 272, 15)}`, fill: INK },
            { d: `${circle(190, 104, 7)} ${circle(220, 104, 7)}`, fill: PAPER },
        ],
        lines: "M190,82 Q178,56 160,50 M220,82 Q232,56 250,50",
        order: ["krila", "list", "glava"],
    },

    // ── Četiri dela ──────────────────────────────────────────────────────────
    {
        id: "sladoled",
        name: "Sladoled",
        acc: "sladoled",
        emoji: "🍦",
        viewBox: "108 52 184 382",
        zones: [
            z("gornja", "gornja kugla", "gornju kuglu", "f", "pink", circle(200, 180, 62)),
            z("donja", "donja kugla", "donju kuglu", "f", "brown", "M122,270 A78,78 0 0,1 278,270 Z"),
            z("kornet", "kornet", "kornet", "m", "orange", "M130,270 L270,270 L200,425 Z"),
            z("tresnja", "trešnja", "trešnju", "f", "red", circle(200, 108, 20), 14),
        ],
        lines: "M200,90 Q212,66 228,64 M165,270 L217.5,386 M200,270 L235,347.5 M235,270 L252.5,309 M235,270 L182.5,386 M200,270 L165,347.5 M165,270 L147.5,309",
        order: ["kornet", "donja", "gornja", "tresnja"],
    },
    {
        id: "puz",
        name: "Puž",
        acc: "puža",
        emoji: "🐌",
        viewBox: "40 120 330 235",
        zones: [
            z("trava", "trava", "travu", "f", "green", "M45,318 Q200,294 360,318 L360,350 L45,350 Z"),
            z("list", "list", "list", "m", "lime", "M292,306 Q318,214 364,232 Q368,300 292,306 Z", 8),
            z("telo", "telo", "telo", "n", "yellow", "M58,318 Q46,252 78,214 Q112,200 120,244 L132,286 L300,290 Q344,294 344,318 Z"),
            z("kucica", "kućica", "kućicu", "f", "orange", circle(218, 214, 78)),
        ],
        details: [
            { d: circle(96, 240, 6), fill: INK },
            { d: `${circle(70, 176, 6)} ${circle(108, 172, 6)}`, fill: INK },
        ],
        lines: "M84,216 L70,180 M100,212 L106,176 M218,214 m-12,0 a12,12 0 1,1 24,0 a28,28 0 1,1 -50,4 a46,46 0 1,1 88,-8",
        order: ["kucica", "telo", "trava", "list"],
    },

    // ── Pet delova ───────────────────────────────────────────────────────────
    {
        id: "pile",
        name: "Pile",
        acc: "pile",
        emoji: "🐥",
        viewBox: "80 45 240 325",
        zones: [
            z("telo", "telo", "telo", "n", "yellow", circle(200, 240, 86)),
            z("krilo", "krilo", "krilo", "n", "orange", ellipse(252, 236, 30, 46, -20)),
            z("glava", "glava", "glavu", "f", "yellow", circle(200, 128, 56)),
            z("kljun", "kljun", "kljun", "m", "orange", "M186,136 L214,136 L200,162 Z", 14),
            z(
                "ljuska",
                "ljuska",
                "ljusku",
                "f",
                "sky",
                "M106,268 L134,242 L160,270 L186,242 L212,270 L238,242 L264,270 L294,246 Q304,360 200,362 Q96,360 106,268 Z"
            ),
        ],
        details: [{ d: `${circle(180, 116, 7)} ${circle(220, 116, 7)}`, fill: INK }],
        lines: "M195,74 Q188,54 200,50 M205,74 Q214,56 224,60",
        order: ["telo", "glava", "ljuska", "krilo", "kljun"],
    },
    {
        id: "kornjaca",
        name: "Kornjača",
        acc: "kornjaču",
        emoji: "🐢",
        viewBox: "30 110 345 245",
        zones: [
            z("trava", "trava", "travu", "f", "green", "M35,312 Q200,292 370,312 L370,348 L35,348 Z"),
            z("noge", "noge", "noge", "fpl", "lime", `${rrect(102, 250, 44, 62, 12)} ${rrect(248, 250, 44, 62, 12)}`),
            z("glava", "glava", "glavu", "f", "lime", "M284,252 Q298,212 330,204 Q366,204 366,240 Q362,270 330,270 L288,270 Z"),
            z("oklop", "oklop", "oklop", "m", "brown", "M80,268 Q84,138 200,132 Q316,138 320,268 Z"),
            z("ivica", "ivica oklopa", "ivicu oklopa", "f", "orange", rrect(66, 258, 268, 26, 13), 6),
        ],
        details: [{ d: circle(340, 230, 6), fill: INK }],
        lines: "M160,172 L240,172 L264,214 L240,252 L160,252 L136,214 Z M160,172 L140,146 M240,172 L260,146 M136,214 L96,214 M264,214 L304,214",
        order: ["oklop", "glava", "noge", "ivica", "trava"],
    },
    {
        id: "kruna",
        name: "Kruna",
        acc: "krunu",
        emoji: "👑",
        viewBox: "55 85 290 280",
        zones: [
            z("kruna", "kruna", "krunu", "f", "yellow", "M120,300 L80,150 L160,250 L200,120 L240,250 L320,150 L280,300 Z"),
            z("traka", "traka", "traku", "f", "orange", "M112,298 L288,298 L296,356 L104,356 Z"),
            z("kuglice", "kuglice", "kuglice", "fpl", "red", `${circle(200, 110, 18)} ${circle(80, 140, 15)} ${circle(320, 140, 15)}`, 16),
            z("dragulj", "veliki kamen", "veliki kamen", "m", "blue", circle(200, 327, 18), 10),
            z("dragulji", "mali kamenčići", "male kamenčiće", "mpl", "green", `${circle(148, 327, 12)} ${circle(252, 327, 12)}`, 18),
        ],
        order: ["kruna", "traka", "kuglice", "dragulj", "dragulji"],
    },
    {
        id: "sunce",
        name: "Sunce",
        acc: "sunce",
        emoji: "☀️",
        viewBox: "50 20 300 382",
        zones: [
            z("livada", "trava", "travu", "f", "green", "M52,345 Q200,300 348,345 L348,396 L52,396 Z"),
            z(
                "duge",
                "veliki zraci",
                "velike zrake",
                "mpl",
                "orange",
                "M220,96 L200,30 L180,96 Z M274,190 L340,170 L274,150 Z M180,244 L200,310 L220,244 Z M126,150 L60,170 L126,190 Z",
                10
            ),
            z(
                "kratke",
                "mali zraci",
                "male zrake",
                "mpl",
                "red",
                "M265.1,130.4 L283.4,86.6 L239.6,104.9 Z M239.6,235.1 L283.4,253.4 L265.1,209.6 Z M134.9,209.6 L116.6,253.4 L160.4,235.1 Z M160.4,104.9 L116.6,86.6 L134.9,130.4 Z",
                12
            ),
            z("sunce", "sunce", "sunce", "n", "yellow", circle(200, 170, 66)),
            z("oblak", "oblak", "oblak", "m", "blue", "M262,292 C240,292 232,268 250,258 C250,236 282,230 292,248 C306,236 334,244 330,264 C348,268 346,292 326,292 Z"),
        ],
        details: [
            { d: circle(178, 160, 5), fill: INK },
            { d: circle(222, 160, 5), fill: INK },
        ],
        lines: "M176,186 Q200,208 224,186",
        order: ["sunce", "duge", "kratke", "oblak", "livada"],
    },

    // ── Šest delova ──────────────────────────────────────────────────────────
    {
        id: "torta",
        name: "Torta",
        acc: "tortu",
        emoji: "🎂",
        viewBox: "40 20 320 350",
        zones: [
            z("tanjir", "tanjir", "tanjir", "m", "sky", ellipse(200, 330, 152, 28)),
            z("donji", "donji sprat", "donji sprat", "m", "pink", rrect(80, 236, 240, 92, 10)),
            z("gornji", "gornji sprat", "gornji sprat", "m", "purple", rrect(114, 156, 172, 84, 10)),
            z(
                "krem",
                "šlag",
                "šlag",
                "m",
                "yellow",
                "M108,150 L292,150 Q300,152 296,170 Q284,190 270,172 Q256,192 242,174 Q228,192 214,174 Q200,192 186,174 Q172,192 158,174 Q144,192 130,172 Q116,190 104,170 Q100,152 108,150 Z"
            ),
            z("svecica", "svećica", "svećicu", "f", "blue", rect(189, 84, 22, 68), 12),
            z("plamen", "plamen", "plamen", "m", "orange", "M200,28 Q224,56 213,74 Q200,90 187,74 Q176,56 200,28 Z", 12),
        ],
        details: [{ d: `${circle(120, 280, 7)} ${circle(170, 300, 7)} ${circle(230, 270, 7)} ${circle(280, 296, 7)} ${circle(200, 264, 6)}`, fill: PAPER }],
        lines: "M189,104 L211,96 M189,124 L211,116 M189,144 L211,136",
        order: ["donji", "gornji", "tanjir", "krem", "svecica", "plamen"],
    },
    {
        id: "zeka",
        name: "Zeka",
        acc: "zeku",
        emoji: "🐰",
        viewBox: "70 15 290 365",
        zones: [
            z("telo", "telo", "telo", "n", "gray", ellipse(200, 300, 80, 74)),
            z("usi", "uši", "uši", "fpl", "gray", `${ellipse(165, 88, 25, 66, -10)} ${ellipse(235, 88, 25, 66, 10)}`),
            z("unutra", "unutrašnjost ušiju", "unutrašnjost ušiju", "f", "pink", `${ellipse(166, 94, 11, 46, -10)} ${ellipse(234, 94, 11, 46, 10)}`, 6),
            z("glava", "glava", "glavu", "f", "gray", circle(200, 192, 64)),
            z("sargarepa", "šargarepa", "šargarepu", "f", "orange", "M252,268 L330,214 L276,292 Z", 10),
            z("lisce", "lišće", "lišće", "n", "green", "M326,218 Q332,186 352,192 Q346,210 334,222 Z M330,216 Q350,204 356,222 Q342,226 334,222 Z", 12),
        ],
        details: [
            { d: `${circle(178, 182, 7)} ${circle(222, 182, 7)}`, fill: INK },
            { d: "M192,206 L208,206 L200,216 Z", fill: "#F472B6" },
        ],
        lines: "M200,216 L200,226 M188,232 Q200,240 212,232 M176,212 L142,204 M176,220 L142,226 M224,212 L258,204 M224,220 L258,226",
        order: ["glava", "telo", "usi", "sargarepa", "unutra", "lisce"],
    },
    {
        id: "drvo",
        name: "Drvo",
        acc: "drvo",
        emoji: "🌳",
        viewBox: "80 95 240 340",
        zones: [
            z("trava", "trava", "travu", "f", "green", "M88,402 Q200,380 312,402 L312,428 L88,428 Z"),
            z("stablo", "stablo", "stablo", "n", "brown", "M176,412 L224,412 L214,285 L186,285 Z", 14),
            z(
                "krosnja",
                "lišće",
                "lišće",
                "n",
                "green",
                "M200,300 C150,305 118,270 135,232 C105,205 122,150 165,150 C172,110 228,110 235,150 C278,150 295,205 265,232 C282,270 250,305 200,300 Z"
            ),
            z("j1", "leva jabuka", "levu jabuku", "f", "red", circle(162, 232, 16), 14),
            z("j2", "desna jabuka", "desnu jabuku", "f", "red", circle(238, 232, 16), 14),
            z("j3", "gornja jabuka", "gornju jabuku", "f", "red", circle(200, 172, 16), 14),
        ],
        order: ["krosnja", "stablo", "trava", "j3", "j1", "j2"],
    },
    {
        id: "brod",
        name: "Brod",
        acc: "brod",
        emoji: "⛵",
        viewBox: "30 55 345 365",
        zones: [
            z("sunce", "sunce", "sunce", "n", "yellow", circle(322, 112, 34)),
            z("jedro1", "levo jedro", "levo jedro", "n", "red", "M192,100 L100,262 L192,262 Z"),
            z("jedro2", "desno jedro", "desno jedro", "n", "orange", "M208,125 L280,262 L208,262 Z"),
            z("zastava", "zastava", "zastavu", "f", "green", "M205,62 L265,84 L205,106 Z", 12),
            z("trup", "brod", "brod", "m", "brown", "M92,280 L308,280 L275,352 L125,352 Z"),
            z("more", "more", "more", "n", "blue", "M36,345 Q82,322 128,345 T220,345 T312,345 T368,340 L368,412 L36,412 Z"),
        ],
        details: [{ d: "M195,62 L205,62 L205,280 L195,280 Z", fill: "#7C4A21" }],
        order: ["trup", "more", "jedro1", "jedro2", "sunce", "zastava"],
    },
    {
        id: "avion",
        name: "Avion",
        acc: "avion",
        emoji: "✈️",
        viewBox: "20 55 370 290",
        zones: [
            z("oblak", "oblak", "oblak", "m", "sky", cloud(40, 335, 140)),
            z("sunce", "sunce", "sunce", "n", "yellow", circle(340, 100, 32)),
            z("rep", "rep", "rep", "m", "blue", "M74,178 L62,108 L98,108 L130,172 Z"),
            z("trup", "avion", "avion", "m", "red", "M60,200 Q60,170 100,168 L300,165 Q350,170 368,196 Q350,222 300,226 L100,226 Q60,226 60,200 Z"),
            z("krilo", "krilo", "krilo", "n", "blue", "M168,204 L244,204 L206,296 L160,296 Z"),
            z(
                "prozori",
                "prozori",
                "prozore",
                "mpl",
                "yellow",
                `${circle(140, 190, 11)} ${circle(178, 189, 11)} ${circle(216, 188, 11)} ${circle(254, 187, 11)} M312,176 Q336,179 348,194 L312,194 Z`,
                10
            ),
        ],
        order: ["trup", "krilo", "rep", "prozori", "oblak", "sunce"],
    },
    {
        id: "duga",
        name: "Duga",
        acc: "dugu",
        emoji: "🌈",
        viewBox: "0 108 400 234",
        zones: [
            z("p1", "prva pruga", "prvu prugu", "f", "red", band(200, 300, 175, 147)),
            z("p2", "druga pruga", "drugu prugu", "f", "orange", band(200, 300, 147, 119)),
            z("p3", "treća pruga", "treću prugu", "f", "yellow", band(200, 300, 119, 91)),
            z("p4", "četvrta pruga", "četvrtu prugu", "f", "green", band(200, 300, 91, 63)),
            z("p5", "peta pruga", "petu prugu", "f", "blue", band(200, 300, 63, 35)),
            z("oblaci", "oblaci", "oblake", "mpl", "sky", `${cloud(10, 330, 100)} ${cloud(290, 330, 100)}`),
        ],
        order: ["p1", "p2", "p3", "p4", "p5", "oblaci"],
    },
    {
        id: "cvet",
        name: "Cvet",
        acc: "cvet",
        emoji: "🌸",
        viewBox: "70 25 320 405",
        zones: [
            z("oblak", "oblak", "oblak", "m", "blue", "M300,92 C280,92 272,70 288,60 C288,40 318,34 328,50 C342,40 366,48 362,66 C380,70 378,92 358,92 Z"),
            z("stabljika", "stabljika", "stabljiku", "f", "green", "M180,250 L200,250 L200,345 L180,345 Z", 16),
            z("listovi", "listovi", "listove", "mpl", "green", "M182,315 Q140,285 112,312 Q146,340 182,326 Z M198,315 Q240,285 268,312 Q234,340 198,326 Z", 8),
            z("saksija", "saksija", "saksiju", "f", "orange", "M128,340 L252,340 L252,362 L240,362 L228,424 L152,424 L140,362 L128,362 Z"),
            z(
                "latice",
                "latice",
                "latice",
                "fpl",
                "pink",
                "M190,144 A48,30 -90 1,0 190,48 A48,30 -90 1,0 190,144 Z M203.9,152 A48,30 -30 1,0 287,104 A48,30 -30 1,0 203.9,152 Z M203.9,168 A48,30 30 1,0 287,216 A48,30 30 1,0 203.9,168 Z M190,176 A48,30 90 1,0 190,272 A48,30 90 1,0 190,176 Z M176.1,168 A48,30 150 1,0 93,216 A48,30 150 1,0 176.1,168 Z M176.1,152 A48,30 210 1,0 93,104 A48,30 210 1,0 176.1,152 Z"
            ),
            z("sredina", "sredina cveta", "sredinu cveta", "f", "yellow", circle(190, 160, 34)),
        ],
        order: ["latice", "sredina", "stabljika", "listovi", "saksija", "oblak"],
    },
    {
        id: "kucica",
        name: "Kućica",
        acc: "kućicu",
        emoji: "🏠",
        viewBox: "40 15 320 372",
        zones: [
            z("dimnjak", "dimnjak", "dimnjak", "m", "orange", "M245,85 L285,85 L285,180 L245,180 Z", 10),
            z("zid", "zid", "zid", "m", "yellow", "M75,224 L75,362 L325,362 L325,224 Z"),
            z("krov", "krov", "krov", "m", "red", "M50,235 L200,95 L350,235 Z"),
            z("vrata", "vrata", "vrata", "npl", "brown", "M168,284 L168,362 L232,362 L232,284 Q200,265 168,284 Z"),
            z("prozori", "prozori", "prozore", "mpl", "blue", "M95,242 L155,242 L155,306 L95,306 Z M245,242 L305,242 L305,306 L245,306 Z"),
            z("trava", "trava", "travu", "f", "green", "M45,352 Q130,338 200,352 Q270,338 355,352 L355,380 L45,380 Z"),
        ],
        details: [
            { d: `${ellipse(262, 60, 14, 18)} ${ellipse(282, 36, 11, 14)}`, fill: "#E5E7EB" },
            {
                d: "M95,271 L155,271 L155,277 L95,277 Z M122,242 L128,242 L128,306 L122,306 Z M245,271 L305,271 L305,277 L245,277 Z M272,242 L278,242 L278,306 L272,306 Z",
                fill: PAPER,
            },
            { d: circle(220, 325, 5), fill: "#FACC15" },
        ],
        order: ["krov", "zid", "vrata", "prozori", "dimnjak", "trava"],
    },
    {
        id: "leptir",
        name: "Leptir",
        acc: "leptira",
        emoji: "🦋",
        viewBox: "45 105 310 340",
        zones: [
            z(
                "donja",
                "donja krila",
                "donja krila",
                "npl",
                "pink",
                "M195,290 C140,300 90,350 120,410 C150,470 195,410 195,380 Z M205,290 C260,300 310,350 280,410 C250,470 205,410 205,380 Z"
            ),
            z(
                "gornja",
                "gornja krila",
                "gornja krila",
                "npl",
                "purple",
                "M195,210 C140,130 40,150 70,250 C100,350 190,290 195,280 Z M205,210 C260,130 360,150 330,250 C300,350 210,290 205,280 Z"
            ),
            z("velike", "velike tačke", "velike tačke", "fpl", "yellow", `${circle(118, 238, 22)} ${circle(282, 238, 22)}`, 10),
            z("male", "male tačke", "male tačke", "fpl", "blue", `${circle(150, 372, 15)} ${circle(250, 372, 15)}`, 14),
            z("telo", "telo", "telo", "n", "brown", "M200,182 Q174,282 200,388 Q226,282 200,182 Z", 12),
            z("glava", "glava", "glavu", "f", "orange", circle(200, 166, 22), 10),
        ],
        lines: "M190,148 Q168,118 152,124 M210,148 Q232,118 248,124",
        order: ["gornja", "donja", "velike", "male", "telo", "glava"],
    },

    // ── Sedam i osam delova ──────────────────────────────────────────────────
    {
        id: "lopta",
        name: "Lopta",
        acc: "loptu",
        emoji: "⚽",
        viewBox: "42 67 316 316",
        zones: [
            z("p1", "prvo polje", "prvo polje", "n", "red", "M200,225 L200,75 A150,150 0 0,1 329.9,150 Z"),
            z("p2", "drugo polje", "drugo polje", "n", "yellow", "M200,225 L329.9,150 A150,150 0 0,1 329.9,300 Z"),
            z("p3", "treće polje", "treće polje", "n", "blue", "M200,225 L329.9,300 A150,150 0 0,1 200,375 Z"),
            z("p4", "četvrto polje", "četvrto polje", "n", "red", "M200,225 L200,375 A150,150 0 0,1 70.1,300 Z"),
            z("p5", "peto polje", "peto polje", "n", "yellow", "M200,225 L70.1,300 A150,150 0 0,1 70.1,150 Z"),
            z("p6", "šesto polje", "šesto polje", "n", "blue", "M200,225 L70.1,150 A150,150 0 0,1 200,75 Z"),
            z("sredina", "sredina lopte", "sredinu lopte", "f", "yellow", circle(200, 225, 38)),
        ],
    },
    {
        id: "raketa",
        name: "Raketa",
        acc: "raketu",
        emoji: "🚀",
        viewBox: "80 40 240 362",
        zones: [
            z("plamen", "vatra", "vatru", "f", "orange", "M178,283 L222,283 Q226,335 200,392 Q174,335 178,283 Z"),
            z("krilo1", "levo krilo", "levo krilo", "n", "red", "M152,195 L92,305 L152,255 Z"),
            z("krilo2", "desno krilo", "desno krilo", "n", "red", "M248,195 L308,305 L248,255 Z"),
            z("motor", "motor", "motor", "m", "gray", "M168,250 L232,250 L218,286 L182,286 Z"),
            z("telo", "raketa", "raketu", "f", "sky", "M200,50 Q250,150 250,250 L150,250 Q150,150 200,50 Z"),
            z("vrh", "vrh rakete", "vrh rakete", "m", "red", "M200,50 Q217.5,85 228.9,120 L171.1,120 Q182.5,85 200,50 Z"),
            z("prozor", "prozor", "prozor", "m", "yellow", circle(200, 180, 26)),
        ],
        order: ["telo", "vrh", "krilo1", "krilo2", "prozor", "motor", "plamen"],
    },
    {
        id: "autobus",
        name: "Autobus",
        acc: "autobus",
        emoji: "🚌",
        viewBox: "15 115 375 240",
        zones: [
            z("put", "put", "put", "m", "gray", rect(20, 312, 365, 36)),
            z("autobus", "autobus", "autobus", "m", "yellow", rrect(34, 128, 338, 176, 22)),
            z("pruga", "pruga", "prugu", "f", "blue", rect(36, 224, 238, 20), 6),
            z("prozori", "prozori", "prozore", "mpl", "sky", `${rrect(56, 148, 58, 56, 8)} ${rrect(132, 148, 58, 56, 8)} ${rrect(208, 148, 58, 56, 8)}`),
            z("vrata", "vrata", "vrata", "npl", "orange", rrect(290, 148, 56, 142, 8)),
            z("svetla", "svetla", "svetla", "npl", "red", `${rrect(352, 252, 16, 24, 4)} ${rrect(38, 252, 16, 24, 4)}`, 10),
            z("tockovi", "točkovi", "točkove", "mpl", "black", `${circle(104, 304, 32)} ${circle(250, 304, 32)}`),
        ],
        lines: "M318,152 L318,286",
        order: ["autobus", "prozori", "tockovi", "vrata", "pruga", "svetla", "put"],
    },
    {
        id: "dino",
        name: "Dinosaurus",
        acc: "dinosaurusa",
        emoji: "🦕",
        viewBox: "20 30 376 330",
        zones: [
            z("trava", "trava", "travu", "f", "green", "M25,318 Q200,294 385,318 L385,352 L25,352 Z"),
            z("sunce", "sunce", "sunce", "n", "yellow", circle(70, 82, 32)),
            z("vulkan", "vulkan", "vulkan", "m", "brown", "M252,306 L306,150 L346,150 L392,306 Z"),
            z("lava", "lava", "lavu", "f", "red", "M306,150 Q300,118 316,98 Q324,124 330,92 Q344,120 346,150 Z", 10),
            z(
                "bodlje",
                "bodlje",
                "bodlje",
                "fpl",
                "orange",
                "M155,96 L132,106 L152,124 Z M152,138 L128,148 L151,166 Z M148,180 L120,188 L142,208 Z M136,222 L104,228 L124,250 Z",
                10
            ),
            z(
                "telo",
                "telo",
                "telo",
                "n",
                "purple",
                "M40,288 Q110,276 132,232 Q152,190 150,140 Q148,104 160,84 Q174,58 204,60 Q236,64 238,92 Q238,112 214,116 Q194,120 190,150 Q192,180 214,206 Q248,240 248,300 L222,300 L218,272 L176,272 L172,300 L146,300 L142,272 Q96,292 40,288 Z"
            ),
            z("stomak", "stomak", "stomak", "m", "yellow", "M192,168 Q224,198 240,246 Q240,268 222,270 Q194,232 186,180 Z"),
        ],
        details: [{ d: circle(210, 82, 6), fill: INK }],
        lines: "M222,102 Q214,108 206,106",
        order: ["telo", "stomak", "bodlje", "vulkan", "trava", "sunce", "lava"],
    },
    {
        id: "voz",
        name: "Voz",
        acc: "voz",
        emoji: "🚂",
        viewBox: "10 50 385 295",
        zones: [
            z("sine", "šine", "šine", "fpl", "brown", rect(14, 316, 376, 18)),
            z("dim", "dim", "dim", "m", "gray", `${circle(96, 94, 20)} ${circle(124, 74, 16)} ${circle(152, 62, 12)}`, 10),
            z("dimnjak", "dimnjak", "dimnjak", "m", "black", "M80,118 L112,118 L106,176 L86,176 Z", 10),
            z("lokomotiva", "lokomotiva", "lokomotivu", "f", "red", rrect(48, 174, 146, 112, 10)),
            z("kabina", "kabina", "kabinu", "f", "blue", rrect(192, 116, 72, 170, 8)),
            z("vagon", "vagon", "vagon", "m", "yellow", rrect(282, 166, 106, 120, 8)),
            z("prozori", "prozori", "prozore", "mpl", "sky", `${rect(206, 136, 44, 42)} ${rect(296, 184, 34, 34)} ${rect(342, 184, 34, 34)}`),
            z("tockovi", "točkovi", "točkove", "mpl", "black", `${circle(86, 294, 24)} ${circle(154, 294, 24)} ${circle(228, 294, 24)} ${circle(310, 294, 22)} ${circle(362, 294, 22)}`),
        ],
        lines: "M264,250 L282,250",
        order: ["lokomotiva", "kabina", "vagon", "tockovi", "prozori", "dimnjak", "dim", "sine"],
    },

    // ── Osam i više delova ───────────────────────────────────────────────────
    {
        id: "meda",
        name: "Meda",
        acc: "medu",
        emoji: "🧸",
        viewBox: "82 78 236 390",
        zones: [
            z(
                "sape",
                "šape",
                "šape",
                "fpl",
                "orange",
                `${ellipse(122, 305, 25, 40, -20)} ${ellipse(278, 305, 25, 40, 20)} ${ellipse(148, 418, 30, 36, -10)} ${ellipse(252, 418, 30, 36, 10)}`
            ),
            z("telo", "telo", "telo", "n", "brown", ellipse(200, 345, 72, 88)),
            z("stomak", "stomak", "stomak", "m", "yellow", ellipse(200, 362, 42, 54)),
            z("usi", "uši", "uši", "fpl", "orange", `${circle(148, 122, 34)} ${circle(252, 122, 34)}`),
            z("glava", "glava", "glavu", "f", "brown", circle(200, 200, 80)),
            z("njuska", "usta", "usta", "npl", "yellow", ellipse(200, 234, 42, 32)),
            z("nos", "nos", "nos", "m", "black", ellipse(200, 218, 16, 11), 18),
            z("masna", "mašna", "mašnu", "f", "red", `M200,280 L166,258 L166,302 Z M200,280 L234,258 L234,302 Z ${circle(200, 280, 10)}`, 10),
        ],
        details: [
            { d: `${circle(148, 122, 12)} ${circle(252, 122, 12)}`, fill: "#FBCFE8" },
            { d: `${circle(170, 174, 7)} ${circle(230, 174, 7)}`, fill: INK },
        ],
        lines: "M200,229 L200,242 M186,246 Q200,256 214,246",
        order: ["glava", "usi", "njuska", "nos", "telo", "stomak", "sape", "masna"],
    },
    {
        id: "auto",
        name: "Auto",
        acc: "auto",
        emoji: "🚗",
        viewBox: "12 150 376 248",
        zones: [
            z("trava", "trava", "travu", "f", "lime", "M20,340 L380,340 L380,388 L20,388 Z"),
            z("branici", "krajevi auta", "krajeve auta", "mpl", "gray", "M26,284 L62,284 L62,314 L26,314 Z M338,284 L374,284 L374,314 L338,314 Z", 14),
            z(
                "karoserija",
                "auto",
                "auto",
                "m",
                "blue",
                "M50,250 Q50,235 65,235 L110,235 L135,170 L265,170 L290,235 L335,235 Q350,235 350,250 L350,312 L50,312 Z"
            ),
            z("prozori", "prozori", "prozore", "mpl", "sky", "M124,232 L143,180 L195,180 L195,232 Z M205,232 L205,180 L257,180 L276,232 Z"),
            z("far", "prednje svetlo", "prednje svetlo", "n", "yellow", "M50,246 L82,246 L82,276 L50,276 Z", 14),
            z("svetlo", "zadnje svetlo", "zadnje svetlo", "n", "red", "M318,246 L350,246 L350,276 L318,276 Z", 14),
            z("gume", "točkovi", "točkove", "mpl", "black", `${circle(115, 312, 38)} ${circle(285, 312, 38)}`),
            z("felne", "sredine točkova", "sredine točkova", "fpl", "gray", `${circle(115, 312, 21)} ${circle(285, 312, 21)}`, 6),
        ],
        details: [{ d: "M160,256 L182,256 L182,264 L160,264 Z M222,256 L244,256 L244,264 L222,264 Z", fill: "#D1D5DB" }],
        lines: "M200,235 L200,300",
        order: ["karoserija", "prozori", "gume", "felne", "far", "svetlo", "branici", "trava"],
    },
    {
        id: "riba",
        name: "Riba",
        acc: "ribu",
        emoji: "🐟",
        viewBox: "15 70 380 300",
        zones: [
            z(
                "alge",
                "morska trava",
                "morsku travu",
                "f",
                "green",
                "M58,335 Q40,295 58,262 Q72,232 56,200 Q90,230 82,266 Q72,298 86,335 Z M350,335 Q338,305 352,282 Q360,268 350,252 Q378,270 372,292 Q366,310 376,335 Z",
                12
            ),
            z("pesak", "pesak", "pesak", "m", "brown", "M20,326 Q200,306 380,326 L380,364 L20,364 Z"),
            z("kamen", "kamen", "kamen", "m", "gray", "M258,330 Q262,290 296,288 Q332,290 338,330 Z"),
            z("rep", "rep", "rep", "m", "red", "M300,190 L372,142 L388,203 L372,262 L300,222 Z"),
            z("peraja", "peraja", "peraja", "npl", "purple", "M170,142 Q185,95 220,88 Q255,95 272,140 Q240,126 200,127 Z M188,262 Q205,300 250,304 Q240,280 228,260 Z", 8),
            z("telo", "telo ribe", "telo ribe", "n", "orange", "M95,210 Q110,155 185,140 Q260,128 305,185 Q330,205 305,225 Q260,272 185,270 Q110,258 95,210 Z"),
            z("pruge", "pruge", "pruge", "fpl", "yellow", "M212,143 Q226,205 212,263 L240,261 Q254,205 240,141 Z M266,156 Q276,205 266,247 L288,236 Q296,205 288,172 Z", 8),
            z("mehurici", "mehurići", "mehuriće", "mpl", "sky", `${circle(70, 150, 14)} ${circle(50, 112, 11)} ${circle(82, 92, 9)}`, 16),
        ],
        details: [
            { d: circle(148, 180, 18), fill: PAPER },
            { d: circle(151, 180, 9), fill: INK },
        ],
        lines: "M99,214 Q112,226 124,216 M178,152 Q170,190 178,232",
        order: ["telo", "pruge", "rep", "peraja", "mehurici", "alge", "pesak", "kamen"],
    },
    {
        id: "sova",
        name: "Sova",
        acc: "sovu",
        emoji: "🦉",
        viewBox: "35 20 330 360",
        zones: [
            z("mesec", "mesec", "mesec", "m", "yellow", "M104,36 A48,48 0 1,0 150,118 A38,38 0 1,1 104,36 Z"),
            z("grana", "grana", "granu", "f", "brown", "M40,326 L362,312 L364,338 L40,352 Z"),
            z("lisce", "lišće", "lišće", "n", "green", `${ellipse(84, 318, 32, 14, -20)} ${ellipse(322, 302, 32, 14, 20)}`, 8),
            z("telo", "telo", "telo", "n", "brown", "M122,332 Q98,222 140,152 L128,94 L172,126 Q200,116 228,126 L272,94 L260,152 Q302,222 278,332 Z"),
            z("stomak", "stomak", "stomak", "m", "yellow", ellipse(200, 266, 54, 60)),
            z("krila", "krila", "krila", "npl", "orange", "M128,206 Q92,260 122,322 Q144,280 142,212 Z M272,206 Q308,260 278,322 Q256,280 258,212 Z", 8),
            z("oci", "oči", "oči", "fpl", "sky", `${circle(172, 170, 28)} ${circle(228, 170, 28)}`),
            z("kljun", "kljun", "kljun", "m", "orange", "M188,196 L212,196 L200,222 Z", 14),
        ],
        details: [{ d: `${circle(172, 170, 10)} ${circle(228, 170, 10)}`, fill: INK }],
        lines: "M176,262 Q186,270 196,262 M204,262 Q214,270 224,262 M188,288 Q198,296 208,288",
        order: ["telo", "stomak", "krila", "oci", "kljun", "grana", "lisce", "mesec"],
    },
    {
        id: "slon",
        name: "Slon",
        acc: "slona",
        emoji: "🐘",
        viewBox: "15 20 385 420",
        zones: [
            z("trava", "trava", "travu", "f", "lime", "M20,402 Q200,386 395,402 L395,434 L20,434 Z"),
            z("sunce", "sunce", "sunce", "n", "orange", circle(62, 64, 30)),
            z(
                "usi",
                "uši",
                "uši",
                "fpl",
                "pink",
                "M115,160 Q60,110 45,190 Q35,260 110,250 Q115,230 115,200 Z M285,160 Q340,110 355,190 Q365,260 290,250 Q285,230 285,200 Z"
            ),
            z(
                "telo",
                "telo",
                "telo",
                "n",
                "gray",
                "M110,240 Q92,330 104,418 L168,418 L168,392 L232,392 L232,418 L296,418 Q308,330 290,240 Q250,215 200,215 Q150,215 110,240 Z"
            ),
            z("glava", "glava", "glavu", "f", "gray", "M115,190 Q110,120 200,110 Q290,120 285,190 Q285,260 200,265 Q115,260 115,190 Z"),
            z(
                "kljove",
                "zubi",
                "zube",
                "mpl",
                "yellow",
                "M165,245 Q145,255 135,275 Q145,285 160,275 Q170,260 175,245 Z M235,245 Q255,255 265,275 Q255,285 240,275 Q230,260 225,245 Z",
                12
            ),
            z("surla", "surla", "surlu", "f", "gray", "M178,215 C176,270 168,315 172,345 Q178,372 200,372 Q222,372 228,345 C232,315 224,270 222,215 Q200,205 178,215 Z"),
            z("sesir", "šešir", "šešir", "m", "red", "M164,120 L200,44 L236,120 Q200,106 164,120 Z"),
            z("lopta", "lopta", "loptu", "f", "blue", circle(346, 388, 28)),
        ],
        details: [
            { d: `${circle(155, 178, 9)} ${circle(245, 178, 9)}`, fill: INK },
            { d: `${ellipse(138, 218, 12, 7)} ${ellipse(262, 218, 12, 7)}`, fill: "#FDA4AF" },
            { d: circle(200, 42, 9), fill: PAPER },
        ],
        lines: "M180,290 Q200,284 220,290 M177,322 Q200,316 223,322 M322,378 Q346,392 370,376",
        order: ["glava", "usi", "surla", "kljove", "telo", "sesir", "lopta", "trava", "sunce"],
    },
    {
        id: "macka",
        name: "Mačka",
        acc: "mačku",
        emoji: "🐱",
        viewBox: "25 105 350 332",
        zones: [
            z("tepih", "tepih", "tepih", "m", "purple", ellipse(200, 410, 165, 22)),
            z(
                "rep",
                "rep",
                "rep",
                "m",
                "brown",
                "M262,338 Q325,330 342,298 Q354,268 334,254 Q316,250 314,268 Q326,282 318,300 Q306,322 258,362 Z",
                12
            ),
            z(
                "telo",
                "telo",
                "telo",
                "n",
                "orange",
                "M128,244 Q118,314 133,374 L134,408 L172,408 L172,378 L228,378 L228,408 L266,408 L267,374 Q282,314 272,244 Q200,224 128,244 Z"
            ),
            z("usi", "uši", "uši", "fpl", "brown", "M113,188 L98,120 L155,162 Z M287,188 L302,120 L245,162 Z"),
            z("glava", "glava", "glavu", "f", "orange", "M108,178 Q103,234 138,252 Q200,270 262,252 Q297,234 292,178 Q252,132 200,130 Q148,132 108,178 Z"),
            z("ogrlica", "ogrlica", "ogrlicu", "f", "red", "M140,250 Q200,272 260,250 L263,266 Q200,292 137,266 Z", 12),
            z("oci", "oči", "oči", "fpl", "green", `${ellipse(163, 190, 17, 15)} ${ellipse(237, 190, 17, 15)}`, 10),
            z("nos", "nos", "nos", "m", "pink", "M200,230 L184,212 L216,212 Z", 16),
            z("klupko", "vuna", "vunu", "f", "blue", circle(72, 388, 30)),
        ],
        details: [
            { d: "M109,160 L104,133 L129,150 Z M291,160 L296,133 L271,150 Z", fill: "#FBCFE8" },
            { d: `${ellipse(163, 190, 5, 11)} ${ellipse(237, 190, 5, 11)}`, fill: INK },
            { d: circle(200, 288, 9), fill: "#FACC15" },
        ],
        lines: "M200,230 Q186,244 174,238 M200,230 Q214,244 226,238 M178,222 L126,212 M178,230 L126,236 M222,222 L274,212 M222,230 L274,236 M50,378 Q72,366 96,380 M48,394 Q72,404 96,392",
        order: ["glava", "usi", "telo", "rep", "oci", "nos", "ogrlica", "klupko", "tepih"],
    },
    {
        id: "zamak",
        name: "Zamak",
        acc: "zamak",
        emoji: "🏰",
        viewBox: "15 10 375 380",
        zones: [
            z("trava", "trava", "travu", "f", "green", rect(20, 346, 366, 40)),
            z("oblak", "oblak", "oblak", "m", "sky", cloud(150, 86, 90)),
            z("sunce", "sunce", "sunce", "n", "yellow", circle(205, 46, 26)),
            z("kule", "kule", "kule", "fpl", "gray", `${rect(44, 150, 82, 200)} ${rect(280, 150, 82, 200)}`),
            z(
                "zid",
                "zid",
                "zid",
                "m",
                "pink",
                "M126,350 L126,192 L146,192 L146,208 L170,208 L170,192 L192,192 L192,208 L214,208 L214,192 L236,192 L236,208 L258,208 L258,192 L280,192 L280,350 Z"
            ),
            z("krovovi", "krovovi", "krovove", "mpl", "blue", "M34,156 L85,66 L136,156 Z M270,156 L321,66 L372,156 Z"),
            z("zastava", "zastava", "zastavu", "f", "red", "M323,24 L358,36 L323,48 Z", 12),
            z("vrata", "vrata", "vrata", "npl", "brown", "M172,350 L172,282 Q203,248 234,282 L234,350 Z"),
            z("prozori", "prozori", "prozore", "mpl", "yellow", `${rrect(68, 196, 34, 44, 12)} ${rrect(304, 196, 34, 44, 12)} ${rrect(68, 270, 34, 44, 12)} ${rrect(304, 270, 34, 44, 12)}`),
        ],
        lines: "M321,66 L321,24",
        order: ["zid", "kule", "krovovi", "vrata", "prozori", "zastava", "trava", "oblak", "sunce"],
    },
    {
        id: "robot",
        name: "Robot",
        acc: "robota",
        emoji: "🤖",
        viewBox: "40 10 320 385",
        zones: [
            z("noge", "noge", "noge", "fpl", "gray", `${rrect(134, 306, 46, 72, 8)} ${rrect(220, 306, 46, 72, 8)}`),
            z("ruke", "ruke", "ruke", "fpl", "gray", `${rrect(66, 180, 38, 112, 16)} ${rrect(296, 180, 38, 112, 16)}`),
            z("telo", "telo", "telo", "n", "blue", rrect(108, 170, 184, 142, 16)),
            z("ekran", "ekran", "ekran", "m", "lime", rrect(150, 192, 100, 58, 8)),
            z("dugmad", "dugmad", "dugmad", "npl", "red", `${circle(168, 278, 12)} ${circle(200, 278, 12)} ${circle(232, 278, 12)}`, 8),
            z("usi", "uši", "uši", "fpl", "orange", `${rrect(110, 92, 22, 40, 6)} ${rrect(268, 92, 22, 40, 6)}`, 10),
            z("glava", "glava", "glavu", "f", "gray", rrect(128, 58, 144, 106, 18)),
            z("oci", "oči", "oči", "fpl", "sky", `${circle(170, 102, 17)} ${circle(230, 102, 17)}`, 6),
            z("usta", "usta", "usta", "npl", "yellow", rrect(164, 134, 72, 16, 6), 8),
            z("lampica", "lampica", "lampicu", "f", "red", circle(200, 30, 14), 12),
        ],
        details: [{ d: `${circle(170, 102, 6)} ${circle(230, 102, 6)}`, fill: INK }],
        lines: "M200,44 L200,58",
        order: ["telo", "glava", "ruke", "noge", "ekran", "oci", "dugmad", "usta", "usi", "lampica"],
    },
    // ── Simetrične slike: leva polovina je obojena, dete boji drugu ─────────────
    symmetric({ id: "pola-srce", name: "Srce", acc: "srce", emoji: "❤️", viewBox: "50 50 300 300" }, 200, [
        { id: "srce", name: "srce", acc: "srce", g: "n", c: "red", d: "M200,118 C178,78 92,70 82,148 C74,212 150,262 200,322 Z" },
        { id: "malo", name: "malo srce", acc: "malo srce", g: "n", c: "pink", d: "M200,178 C190,156 146,152 142,192 C140,226 174,250 200,274 Z" },
        { id: "tacka", name: "tačka", acc: "tačku", g: "f", c: "yellow", d: circle(98, 84, 18), hit: 10 },
    ]),
    {
        ...symmetric({ id: "pola-bubamara", name: "Bubamara", acc: "bubamaru", emoji: "🐞", viewBox: "40 20 320 360" }, 200, [
            { id: "list", name: "list", acc: "list", g: "m", c: "green", d: "M200,30 C120,40 50,120 56,220 C62,310 130,360 200,372 Z" },
            { id: "noge", name: "noge", acc: "noge", g: "fpl", c: "brown", d: `${ellipse(112, 198, 16, 6, -20)} ${ellipse(106, 250, 16, 6, 0)} ${ellipse(118, 300, 16, 6, 25)}`, hit: 8 },
            { id: "krilo", name: "krilo", acc: "krilo", g: "n", c: "red", d: "M200,128 C140,126 106,186 110,240 C114,300 160,330 200,330 Z" },
            { id: "tacke", name: "tačke", acc: "tačke", g: "fpl", c: "black", d: `${circle(160, 196, 15)} ${circle(150, 270, 13)}`, hit: 8 },
        ]),
        details: [
            { d: circle(200, 118, 34), fill: INK },
            { d: `${circle(186, 106, 7)} ${circle(214, 106, 7)}`, fill: PAPER },
        ],
        lines: "M200,152 L200,330 M186,88 Q176,60 158,54 M214,88 Q224,60 242,54",
    },
    {
        ...symmetric({ id: "pola-cvet", name: "Cvet", acc: "cvet", emoji: "🌷", viewBox: "60 20 280 360" }, 200, [
            { id: "list", name: "list", acc: "list", g: "m", c: "green", d: "M196,292 C166,296 120,282 104,246 C142,238 182,258 196,282 Z" },
            { id: "saksija", name: "saksija", acc: "saksiju", g: "f", c: "orange", d: "M200,312 L128,312 L144,374 L200,374 Z" },
            { id: "gornja", name: "gornja latica", acc: "gornju laticu", g: "f", c: "pink", d: ellipse(150, 108, 40, 26, -25) },
            { id: "donja", name: "donja latica", acc: "donju laticu", g: "f", c: "purple", d: ellipse(156, 160, 38, 24, 30) },
        ]),
        details: [
            { d: "M194,150 L206,150 L206,312 L194,312 Z", fill: "#16A34A" },
            { d: ellipse(200, 72, 26, 38), fill: "#F472B6" },
            { d: circle(200, 132, 28), fill: "#FACC15" },
        ],
    },
    {
        ...symmetric({ id: "pola-leptir", name: "Leptir", acc: "leptira", emoji: "🦋", viewBox: "40 40 320 330" }, 200, [
            { id: "gornje", name: "gornje krilo", acc: "gornje krilo", g: "n", c: "purple", d: "M196,150 C150,70 60,70 62,140 C64,200 140,214 196,190 Z" },
            { id: "donje", name: "donje krilo", acc: "donje krilo", g: "n", c: "pink", d: "M196,196 C140,200 92,250 112,300 C130,340 186,300 196,250 Z" },
            { id: "velika", name: "velika tačka", acc: "veliku tačku", g: "f", c: "yellow", d: circle(118, 140, 20), hit: 8 },
            { id: "mala", name: "mala tačka", acc: "malu tačku", g: "f", c: "blue", d: circle(148, 262, 14), hit: 10 },
        ]),
        details: [
            { d: ellipse(200, 210, 11, 64), fill: "#92400E" },
            { d: circle(200, 132, 17), fill: "#92400E" },
        ],
        lines: "M192,118 Q176,84 158,78 M208,118 Q224,84 242,78",
    },
    {
        ...symmetric({ id: "pola-kuca", name: "Kuća", acc: "kuću", emoji: "🏠", viewBox: "40 50 320 320" }, 200, [
            { id: "zid", name: "zid", acc: "zid", g: "m", c: "yellow", d: "M200,180 L92,180 L92,340 L200,340 Z" },
            { id: "krov", name: "krov", acc: "krov", g: "m", c: "red", d: "M200,66 L58,192 L200,192 Z" },
            { id: "prozor", name: "prozor", acc: "prozor", g: "m", c: "blue", d: rect(108, 214, 52, 46) },
            { id: "zbun", name: "žbun", acc: "žbun", g: "m", c: "green", d: "M56,354 C44,326 66,302 90,310 C104,292 134,298 136,320 C152,326 150,356 134,358 Z" },
        ]),
        details: [
            { d: "M174,340 L174,272 Q200,252 226,272 L226,340 Z", fill: "#92400E" },
            { d: circle(200, 142, 18), fill: "#7DD3FC" },
            { d: "M108,235 L160,235 L160,240 L108,240 Z M131,214 L137,214 L137,260 L131,260 Z M240,235 L292,235 L292,240 L240,240 Z M263,214 L269,214 L269,260 L263,260 Z", fill: PAPER },
            { d: circle(216, 308, 5), fill: "#FACC15" },
        ],
    },
    {
        ...symmetric({ id: "pola-robot", name: "Robot", acc: "robota", emoji: "🤖", viewBox: "40 10 320 300" }, 200, [
            { id: "glava", name: "glava", acc: "glavu", g: "f", c: "gray", d: "M200,80 L104,80 Q84,80 84,100 L84,240 Q84,260 104,260 L200,260 Z" },
            { id: "uvo", name: "uvo", acc: "uvo", g: "n", c: "orange", d: "M84,130 L62,130 Q54,130 54,138 L54,190 Q54,198 62,198 L84,198 Z", hit: 8 },
            { id: "oko", name: "oko", acc: "oko", g: "n", c: "sky", d: circle(150, 150, 26) },
            { id: "obraz", name: "obraz", acc: "obraz", g: "m", c: "pink", d: ellipse(120, 212, 18, 11), hit: 8 },
        ]),
        details: [
            { d: `${circle(150, 150, 9)} ${circle(250, 150, 9)}`, fill: INK },
            { d: rrect(166, 206, 68, 20, 8), fill: "#FACC15" },
            { d: circle(200, 42, 13), fill: "#EF4444" },
        ],
        lines: "M200,55 L200,80",
    },
    {
        ...symmetric({ id: "pola-raketa", name: "Raketa", acc: "raketu", emoji: "🚀", viewBox: "60 20 280 370" }, 200, [
            { id: "telo", name: "telo", acc: "telo", g: "n", c: "blue", d: "M200,40 C160,80 146,150 150,300 L200,300 Z" },
            { id: "vrh", name: "vrh", acc: "vrh", g: "m", c: "red", d: "M200,40 C184,54 172,72 164,96 L200,96 Z" },
            { id: "krilo", name: "krilo", acc: "krilo", g: "n", c: "orange", d: "M152,220 L102,290 L102,326 L152,300 Z" },
            { id: "plamen", name: "plamen", acc: "plamen", g: "m", c: "yellow", d: "M200,300 L168,300 C164,330 180,362 200,384 Z" },
        ]),
        details: [{ d: circle(200, 170, 28), fill: "#7DD3FC" }],
    },
];

export const PICTURE_BY_ID: Record<string, Picture | undefined> = Object.fromEntries(PICTURES.map((p) => [p.id, p]));

/** Redosled delova za predloge i zadatke */
export function zoneOrder(picture: Picture): Zone[] {
    const byId = new Map(picture.zones.map((zone) => [zone.id, zone]));
    const listed = (picture.order ?? []).flatMap((id) => byId.get(id) ?? []);
    const rest = picture.zones.filter((zone) => !listed.includes(zone));
    return [...listed, ...rest];
}

/** Boje sa primera (bez ponavljanja), redom kojim se prvi put javljaju u redosledu delova */
export function modelColors(zones: readonly Zone[]): ColorId[] {
    return Array.from(new Set(zones.map((zone) => zone.c)));
}

/** "Krov je crven." — imenuje šta je obojeno i kojom bojom */
export function colorSentence(zone: Zone, color: PaintColor): string {
    return `${zone.name.charAt(0).toUpperCase()}${zone.name.slice(1)} ${VERB[zone.g]} ${color.adj[zone.g]}.`;
}
