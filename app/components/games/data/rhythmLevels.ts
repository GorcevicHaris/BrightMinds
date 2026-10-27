// Sadržaj igre „Ponovi ritam”: bubanj odsvira kratak ritam (svaki udarac ima i svoju tačku u
// zapisu ritma, koja zasvetli), a dete ga ponovi na istim instrumentima.
//
// Zašto ovako (istraživanje):
//  • Ponavljanje ritma i usklađivanje sa taktom kod dece od 3 do 9 godina povezano je sa
//    fonološkom svesnošću (slogovi, rime), pažnjom i samoregulacijom (čekanje, pa red); ritam je
//    i omiljena muzička igra male dece.
//  • Bez merenja vremena: dete se ne ocenjuje po tome KADA udari, nego šta i koliko puta. Merenje
//    tačnog trenutka je za mlađu decu i decu sa autizmom ili teškoćama motorike nepouzdano i
//    stvara pritisak; ovde svako ima svoje vreme.
//  • Ritam je i zapisan: velika tačka je veliki bubanj, mala tačka mali bubanj, zvonce je zvonce.
//    Zapis pomaže deci sa autizmom (vizuelna podrška) i deci koja slabije čuju; svaki udarac ima
//    i svetlo, pa igra radi i bez zvuka.
//  • Učenje bez grešaka: na lakim nivoima je samo jedan bubanj i dete ponavlja BROJ udaraca (svaki
//    udarac popuni sledeću tačku, višak se ne računa) — ne može da pogreši. Zatim dva bubnja (dva
//    izbora), pa tri instrumenta i duži ritmovi. Na poslednjim nivoima zapis se ne vidi dok se
//    ritam svira (dete pamti po sluhu i po bubnjevima koji svetle); posle greške zapis se pokaže.
//
// Nivoi (instrumenti · udaraca · zadataka · takt · zapis):
//   Lako     1: veliki · 2 · 3 · 850 ms   2: veliki · 2–3 · 3   3: veliki · 3 · 4   4: veliki · 3–4 · 4   5: veliki · 4–5 · 4
//   Srednje  6: veliki, mali · 3 · 4 · 850   7: · 3 · 4 · 800   8: · 4 · 4 · 800   9: · 4 · 5 · 750   10: · 4 · 5 · 700
//   Teško   11: veliki, mali, zvonce · 4 · 4 · 800   12: · 5 · 4 · 750   13: · 5–6 · 4 · 700
//           14: · 4 · 4 · 800, zapis skriven   15: · 5 · 4 · 750, zapis skriven

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";

export type Instrument = "big" | "small" | "bell";

export const INSTRUMENTS: readonly Instrument[] = ["big", "small", "bell"];

/** Naziv instrumenta (natpis, čitač ekrana) */
export const INSTRUMENT_NAMES: Record<Instrument, string> = { big: "Veliki bubanj", small: "Mali bubanj", bell: "Zvonce" };

export function isInstrument(value: unknown): value is Instrument {
    return typeof value === "string" && (INSTRUMENTS as readonly string[]).includes(value);
}

export interface RhythmLevelRule {
    instruments: Instrument[];
    /** Najmanje i najviše udaraca u ritmu */
    beats: [number, number];
    rounds: number;
    /** Razmak između udaraca dok se ritam svira, ms */
    tempo: number;
    /** Zapis se ne vidi dok se ritam svira */
    hidden: boolean;
}

const ONE: Instrument[] = ["big"];
const TWO: Instrument[] = ["big", "small"];
const THREE: Instrument[] = ["big", "small", "bell"];

const RULES: readonly RhythmLevelRule[] = [
    { instruments: ONE, beats: [2, 2], rounds: 3, tempo: 850, hidden: false },
    { instruments: ONE, beats: [2, 3], rounds: 3, tempo: 850, hidden: false },
    { instruments: ONE, beats: [3, 3], rounds: 4, tempo: 800, hidden: false },
    { instruments: ONE, beats: [3, 4], rounds: 4, tempo: 800, hidden: false },
    { instruments: ONE, beats: [4, 5], rounds: 4, tempo: 750, hidden: false },
    { instruments: TWO, beats: [3, 3], rounds: 4, tempo: 850, hidden: false },
    { instruments: TWO, beats: [3, 3], rounds: 4, tempo: 800, hidden: false },
    { instruments: TWO, beats: [4, 4], rounds: 4, tempo: 800, hidden: false },
    { instruments: TWO, beats: [4, 4], rounds: 5, tempo: 750, hidden: false },
    { instruments: TWO, beats: [4, 4], rounds: 5, tempo: 700, hidden: false },
    { instruments: THREE, beats: [4, 4], rounds: 4, tempo: 800, hidden: false },
    { instruments: THREE, beats: [5, 5], rounds: 4, tempo: 750, hidden: false },
    { instruments: THREE, beats: [5, 6], rounds: 4, tempo: 700, hidden: false },
    { instruments: THREE, beats: [4, 4], rounds: 4, tempo: 800, hidden: true },
    { instruments: THREE, beats: [5, 5], rounds: 4, tempo: 750, hidden: true },
];

export const RHYTHM_MAX_LEVEL = RULES.length;

export function rhythmRule(level: number): RhythmLevelRule {
    return RULES[Math.min(Math.max(Math.round(level), 1), RULES.length) - 1];
}

export interface RhythmPlan {
    instruments: Instrument[];
    tempo: number;
    hidden: boolean;
    /** Ritam svakog zadatka */
    rounds: Instrument[][];
}

/**
 * Zadaci nivoa (`random`: seme dvoboja ili Math.random). Ritam sa više instrumenata uvek koristi
 * sve instrumente nivoa (inače bi „ritam” sa dva bubnja bio samo brojanje), nijedan instrument
 * (kad ih ima više) ne svira više od tri puta zaredom, a dva zadatka zaredom nisu ista.
 */
export function buildRhythmLevel(level: number, { maxRounds, random = Math.random }: { maxRounds: number; random?: () => number }): RhythmPlan {
    const rule = rhythmRule(level);
    const count = Math.max(2, Math.min(rule.rounds, Math.max(1, Math.floor(maxRounds))));
    const rounds: Instrument[][] = [];
    const [min, max] = rule.beats;
    for (let r = 0; r < count; r += 1) {
        let pattern: Instrument[] = [];
        for (let attempt = 0; attempt < 40; attempt += 1) {
            const beats = min + Math.floor(random() * (max - min + 1));
            pattern = [];
            while (pattern.length < beats) {
                const next = rule.instruments[Math.floor(random() * rule.instruments.length)];
                const n = pattern.length;
                if (rule.instruments.length > 1 && n >= 3 && pattern[n - 1] === next && pattern[n - 2] === next && pattern[n - 3] === next) continue;
                pattern.push(next);
            }
            const usesAll = rule.instruments.every((kind) => pattern.includes(kind));
            const previous = rounds[rounds.length - 1];
            const repeats = previous !== undefined && previous.join() === pattern.join();
            // Isti ritam zaredom samo kad drugačiji ne postoji (jedan bubanj sa jednim brojem udaraca)
            if (usesAll && (!repeats || (rule.instruments.length === 1 && min === max))) break;
        }
        rounds.push(pattern);
    }
    return { instruments: [...rule.instruments], tempo: rule.tempo, hidden: rule.hidden, rounds };
}

const COUNT_WORDS = ["", "jedan udarac", "dva udarca", "tri udarca", "četiri udarca", "pet udaraca", "šest udaraca"];

/** „tri udarca” (padež po broju) */
export function beatsPhrase(n: number): string {
    return COUNT_WORDS[n] ?? `${n} udaraca`;
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo i drugom detetu na zajedničkoj tabli) ──

export type RhythmPhase = "intro" | "show" | "input" | "solved";

export interface RhythmView extends BaseView {
    instruments: Instrument[];
    pattern: Instrument[];
    /** Zapis se ne vidi dok se ritam svira (nivoi 14–15) */
    hidden: boolean;
    /** Zapis je ipak prikazan (posle greške) */
    revealed: boolean;
    phase: RhythmPhase;
    /** Koji udarac ritma upravo svira (od 0) */
    playing: number | null;
    /** Instrument koji je upravo udaren (sviranje ili dete) */
    hit: Instrument | null;
    /** Koliko udaraca je dete već tačno ponovilo */
    entered: number;
    feedback: FeedbackKind;
    hint: boolean;
    missed: boolean;
    promptedCount: number;
}

export function emptyRhythmView(totalRounds: number): RhythmView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        instruments: [],
        pattern: [],
        hidden: false,
        revealed: false,
        phase: "intro",
        playing: null,
        hit: null,
        entered: 0,
        feedback: null,
        hint: false,
        missed: false,
    };
}

const PHASES: readonly RhythmPhase[] = ["intro", "show", "input", "solved"];

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeRhythmMonitor(state: Partial<RhythmView> | null | undefined): RhythmView {
    const base = emptyRhythmView(1);
    if (!state) return base;
    const instruments = Array.isArray(state.instruments) ? INSTRUMENTS.filter((kind) => state.instruments!.includes(kind)) : [];
    const pattern = Array.isArray(state.pattern) ? state.pattern.filter((kind): kind is Instrument => instruments.includes(kind as Instrument)).slice(0, 8) : [];
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        instruments,
        pattern,
        hidden: state.hidden === true,
        revealed: state.revealed === true,
        phase: PHASES.includes(state.phase as RhythmPhase) ? (state.phase as RhythmPhase) : "intro",
        playing: typeof state.playing === "number" && Number.isInteger(state.playing) && state.playing >= 0 && state.playing < pattern.length ? state.playing : null,
        hit: isInstrument(state.hit) && instruments.includes(state.hit) ? state.hit : null,
        entered: Math.min(toCount(state.entered, 0), pattern.length),
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
        missed: state.missed === true,
    };
}
