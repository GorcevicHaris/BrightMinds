// Sadržaj igre „Balon disanja”: vođeno mirno disanje. Jedan zadatak = jedan udah i izdah.
//
// Zašto ovako (istraživanje):
//  • Sporo disanje stomakom (dijafragmom) smiruje telo: srce se uspori, a dete lakše
//    prepozna i smanji napetost. Pomaže samo ako se vežba dok je dete mirno — zato je ovo
//    igra, a isti balon je i na ekranu „Pauza”, pa dete u teškom trenutku prepozna ono što zna.
//  • Vidljiv ritam (balon raste dok udišemo, smanjuje se dok izdišemo, tačkice broje sekunde)
//    deca prate lakše od reči; glas kaže samo kratko „Udahni…”, „Izdahni…”, bez brojanja naglas.
//  • Mala deca (3–5 god.) imaju kraći dah: udah 3 s, izdah 3–4 s. Starija deca uče sporije
//    disanje (udah 4 s, izdah 4–5 s, oko 5–6 udaha u minuti). Izdah je bar koliko udah ili duži,
//    jer dug izdah najviše smiruje.
//  • Slike koje deca vole i razumeju: balon, „pomiriši cvet — ugasi svećicu”, vetrenjača,
//    mehur od sapunice (izdah je pokret koji se vidi). Za stariju decu „disanje u kvadratu”
//    (4-4-4-4, tačka putuje po stranicama kvadrata) i „pet prstiju” (prst gore — udah, dole — izdah).
//  • Nema greške, nema žurbe, nema vremena za odgovor: svaki udah počinje kad dete hoće (kad
//    krene), a svaki dovršen udah je uspeh. Pokret je spor i blag; uz „Manje animacija” balon
//    ne raste, nego se polako puni bojom, korak po korak.
//
// Nivoi (udah / zadrži / izdah / zadrži, u sekundama):
//   Lako     1–5   balon                                 3/0/3 (1–2), 3/0/4 (3–5)     3 udaha
//   Srednje  6     cvet i svećica                        4/0/4                        4 udaha
//            7     vetrenjača                            4/0/4                        4 udaha
//            8     mehur od sapunice                     4/0/5                        4 udaha
//            9–10  izmešano (balon, cvet, vetrenjača, mehur)  4/0/5                  4 udaha
//   Teško    11    balon sa zadržavanjem                 4/2/4                        5 udaha
//            12    kvadrat                               4/4/4/4                      5 udaha
//            13    pet prstiju (jedan prst — jedan udah) 4/0/4                        5 udaha
//            14    kvadrat                               4/4/4/4                      5 udaha
//            15    izmešano (balon sa zadržavanjem, kvadrat, prsti)                  5 udaha
// Prvi udah prvog nivoa pokazuje ruka (ne računa se). Broj udaha je najviše koliko roditelj
// dozvoli zadataka (`maxRounds`), a bar dva.

import type { BaseView } from "@/app/components/games/kit/types";
import { toCount } from "@/app/components/games/kit/utils";

export const BREATHING_MAX_LEVEL = 15;

/** Slika koja vodi disanje */
export type BreathPicture = "balloon" | "flower" | "pinwheel" | "bubble" | "box" | "fingers";
export const BREATH_PICTURES: readonly BreathPicture[] = ["balloon", "flower", "pinwheel", "bubble", "box", "fingers"];

/** Deo jednog udaha */
export type BreathPhase = "ready" | "in" | "hold" | "out" | "rest";
const PHASES: readonly BreathPhase[] = ["ready", "in", "hold", "out", "rest"];

/** Trajanje delova udaha u sekundama; `rest` = zadrži posle izdaha (kvadrat) */
export interface BreathPattern {
    inhale: number;
    hold: number;
    exhale: number;
    rest: number;
}

export interface BreathRound {
    picture: BreathPicture;
    pattern: BreathPattern;
    /** Boja balona, cveta ili mehura (iz `BREATH_COLORS`) */
    color: string;
    /** Pet prstiju: koji prst je na redu (0–4) */
    finger: number;
}

/** Meke boje (bez jarko crvene) */
export const BREATH_COLORS = ["#7cc7e8", "#f4a6c0", "#9fd8a8", "#c3a6f0", "#ffc978", "#8fd0c8"] as const;

interface LevelRule {
    pictures: readonly BreathPicture[];
    /** true = slike se smenjuju izmešano (redosled iz semena) */
    mixed: boolean;
    pattern: BreathPattern;
    breaths: number;
}

const p = (inhale: number, hold: number, exhale: number, rest = 0): BreathPattern => ({ inhale, hold, exhale, rest });

export function breathingRule(level: number): LevelRule {
    const lv = Math.min(Math.max(Math.round(level), 1), BREATHING_MAX_LEVEL);
    if (lv <= 2) return { pictures: ["balloon"], mixed: false, pattern: p(3, 0, 3), breaths: 3 };
    if (lv <= 5) return { pictures: ["balloon"], mixed: false, pattern: p(3, 0, 4), breaths: 3 };
    if (lv === 6) return { pictures: ["flower"], mixed: false, pattern: p(4, 0, 4), breaths: 4 };
    if (lv === 7) return { pictures: ["pinwheel"], mixed: false, pattern: p(4, 0, 4), breaths: 4 };
    if (lv === 8) return { pictures: ["bubble"], mixed: false, pattern: p(4, 0, 5), breaths: 4 };
    if (lv <= 10) return { pictures: ["balloon", "flower", "pinwheel", "bubble"], mixed: true, pattern: p(4, 0, 5), breaths: 4 };
    if (lv === 11) return { pictures: ["balloon"], mixed: false, pattern: p(4, 2, 4), breaths: 5 };
    if (lv === 12 || lv === 14) return { pictures: ["box"], mixed: false, pattern: p(4, 4, 4, 4), breaths: 5 };
    if (lv === 13) return { pictures: ["fingers"], mixed: false, pattern: p(4, 0, 4), breaths: 5 };
    return { pictures: ["balloon", "box", "fingers"], mixed: true, pattern: p(4, 2, 4), breaths: 5 };
}

/** Obrazac za sliku: kvadrat uvek 4-4-4-4, prsti bez zadržavanja */
function patternFor(picture: BreathPicture, base: BreathPattern): BreathPattern {
    if (picture === "box") return p(4, 4, 4, 4);
    if (picture === "fingers") return p(base.inhale, 0, base.exhale);
    return { ...base, rest: 0 };
}

export function buildBreathingLevel(level: number, { maxRounds, random = Math.random }: { maxRounds: number; random?: () => number }): BreathRound[] {
    const rule = breathingRule(level);
    const count = Math.max(2, Math.min(rule.breaths, Math.max(maxRounds, 2)));
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length) % list.length];
    // Boje: svaki udah druga boja (bez iste dve zaredom), redom iz semena
    const colors: string[] = [];
    for (let i = 0; i < count; i += 1) {
        const options = BREATH_COLORS.filter((c) => c !== colors[i - 1]);
        colors.push(pick(options));
    }
    // Izmešane slike: svaka se javi pre nego što se ponovi, bez iste dve zaredom
    const pictures: BreathPicture[] = [];
    if (rule.mixed) {
        let bag: BreathPicture[] = [];
        while (pictures.length < count) {
            if (bag.length === 0) bag = [...rule.pictures];
            const options = bag.filter((pic) => pic !== pictures[pictures.length - 1]);
            const next = pick(options.length > 0 ? options : bag);
            bag.splice(bag.indexOf(next), 1);
            pictures.push(next);
        }
    } else {
        for (let i = 0; i < count; i += 1) pictures.push(rule.pictures[0]);
    }
    let finger = 0;
    return pictures.map((picture, i) => {
        const round: BreathRound = { picture, pattern: patternFor(picture, rule.pattern), color: colors[i], finger: picture === "fingers" ? finger % 5 : 0 };
        if (picture === "fingers") finger += 1;
        return round;
    });
}

// ── Reči ──────────────────────────────────────────────────────────────────────

/** Kratak znak za svaki deo udaha (velikim slovima na ekranu, tiho glasom) */
export function phaseCue(phase: BreathPhase, picture: BreathPicture): string {
    if (phase === "in") return picture === "flower" ? "Pomiriši cvet…" : "Udahni…";
    if (phase === "hold" || phase === "rest") return "Zadrži…";
    if (phase === "out") {
        if (picture === "flower") return "Ugasi svećicu…";
        if (picture === "pinwheel") return "Duvaj u vetrenjaču…";
        if (picture === "bubble") return "Duvaj mehur…";
        return "Izdahni…";
    }
    return "";
}

/** Glas za svaki deo (jednom po delu, tiho) */
export function phaseVoice(phase: BreathPhase, picture: BreathPicture): string {
    if (phase === "in") return picture === "flower" ? "Polako pomiriši cvet." : "Polako udahni kroz nos.";
    if (phase === "hold" || phase === "rest") return "Zadrži.";
    if (phase === "out") {
        if (picture === "flower") return "Polako duvaj u svećicu.";
        if (picture === "pinwheel") return "Polako duvaj u vetrenjaču.";
        if (picture === "bubble") return "Polako duvaj mehur.";
        return "Polako izdahni kroz usta.";
    }
    return "";
}

/** Uputstvo na početku nivoa: šta slika pokazuje */
export function introText(picture: BreathPicture): string {
    switch (picture) {
        case "flower":
            return "Pomirišemo cvet dok udišemo, pa polako ugasimo svećicu dok izdišemo.";
        case "pinwheel":
            return "Udahnemo kroz nos, pa polako duvamo, da se vetrenjača okreće.";
        case "bubble":
            return "Udahnemo kroz nos, pa polako duvamo veliki mehur.";
        case "box":
            return "Dišemo u kvadratu: tačka ide gore dok udišemo, preko dok zadržimo, dole dok izdišemo.";
        case "fingers":
            return "Dišemo sa pet prstiju: prst gore — udah, prst dole — izdah.";
        default:
            return "Dišemo sa balonom. Kad balon raste, udahni kroz nos. Kad se smanjuje, izdahni kroz usta.";
    }
}

/** Mirna pohvala posle udaha ({m|ž} se razrešava po polu deteta) */
export const BREATH_PRAISE = ["Bravo, lepo si disa{o|la}.", "Polako i mirno. Bravo.", "Tako je, mirno dišemo.", "Lepo. Telo se smiruje."] as const;

export const READY_TEXT = "Kad budeš {spreman|spremna}, kreni.";

// ── Stanje igre (šalje se i roditeljskom prikazu uživo) ───────────────────────

export interface BreathingView extends BaseView {
    picture: BreathPicture;
    pattern: BreathPattern;
    color: string;
    finger: number;
    phase: BreathPhase;
    /** Trajanje tekućeg dela u ms (da i drugi ekran pomera balon istom brzinom) */
    phaseMs: number;
    /** Raste sa svakim delom udaha: drugi ekran po njemu zna da je počeo nov deo */
    phaseKey: number;
    /** Dovršeni udasi (za tačkice napretka u slici prstiju) */
    breaths: number;
}

export function emptyBreathingView(totalRounds: number, first?: BreathRound): BreathingView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        picture: first?.picture ?? "balloon",
        pattern: first?.pattern ?? p(3, 0, 3),
        color: first?.color ?? BREATH_COLORS[0],
        finger: first?.finger ?? 0,
        phase: "ready",
        phaseMs: 0,
        phaseKey: 0,
        breaths: 0,
    };
}

/** Delovi jednog udaha redom, sa trajanjem (bez delova od 0 s) */
export function breathSteps(pattern: BreathPattern): { phase: Exclude<BreathPhase, "ready">; ms: number }[] {
    const steps: { phase: Exclude<BreathPhase, "ready">; ms: number }[] = [
        { phase: "in", ms: pattern.inhale * 1000 },
        { phase: "hold", ms: pattern.hold * 1000 },
        { phase: "out", ms: pattern.exhale * 1000 },
        { phase: "rest", ms: pattern.rest * 1000 },
    ];
    return steps.filter((s) => s.ms > 0);
}

/** Sekunde u tekućem delu (za tačkice brojanja) */
export function phaseSeconds(view: Pick<BreathingView, "phase" | "pattern">): number {
    const { phase, pattern } = view;
    if (phase === "in") return pattern.inhale;
    if (phase === "hold") return pattern.hold;
    if (phase === "out") return pattern.exhale;
    if (phase === "rest") return pattern.rest;
    return 0;
}

/**
 * Rezultat nivoa: svaki dovršen udah je tačan (greške nema), osim pokaznog prvog udaha prvog
 * nivoa, koji se ne računa ni u ukupno.
 */
export function breathingResult(view: Pick<BreathingView, "score" | "correctCount" | "totalRounds">, demo: number, durationSec: number) {
    return {
        score: view.score,
        durationSec,
        correct: view.correctCount,
        total: Math.max(view.totalRounds - demo, 1),
        prompted: 0,
    };
}

const secs = (value: unknown, max: number) => Math.min(toCount(value, 0), max);

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeBreathingMonitor(state: Partial<BreathingView> | null | undefined): BreathingView {
    const base = emptyBreathingView(1);
    if (!state) return base;
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const picture = BREATH_PICTURES.includes(state.picture as BreathPicture) ? (state.picture as BreathPicture) : base.picture;
    const raw = (state.pattern ?? {}) as Partial<BreathPattern>;
    const pattern = p(Math.max(secs(raw.inhale, 8), 1), secs(raw.hold, 8), Math.max(secs(raw.exhale, 8), 1), secs(raw.rest, 8));
    const color = BREATH_COLORS.includes(state.color as (typeof BREATH_COLORS)[number]) ? (state.color as string) : base.color;
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: 0,
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        picture,
        pattern,
        color,
        finger: Math.min(toCount(state.finger, 0), 4),
        phase: PHASES.includes(state.phase as BreathPhase) ? (state.phase as BreathPhase) : "ready",
        phaseMs: Math.min(toCount(state.phaseMs, 0), 10_000),
        phaseKey: toCount(state.phaseKey, 0),
        breaths: Math.min(toCount(state.breaths, 0), totalRounds),
    };
}
