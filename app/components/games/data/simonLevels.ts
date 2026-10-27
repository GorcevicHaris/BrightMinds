// Sadržaj igre „Zapamti niz”: polja sa životinjama svetle jedno za drugim (svako sa svojim mekim
// tonom), a dete ponovi isti niz. Niz raste iz nivoa u nivo; na kraju se ponavlja unazad.
//
// Zašto ovako (istraživanje):
//  • Radna memorija (vizuelno-prostorni „Corsi” raspon i igra Simon): oko 2–3 stavke sa 4 godine,
//    4 sa 6–7 i oko 5 sa 9–10 godina. Nivoi počinju ISPOD raspona (jedno, pa dva polja), da dete
//    od prvog zadatka uspeva (učenje bez grešaka), pa se raspon polako povećava.
//  • Mlađa deca sporije obrađuju: niz se na lakim nivoima prikazuje sporije (oko jedne sekunde po
//    polju), a dete nikad nema vremensko ograničenje dok ponavlja.
//  • Dva kanala zajedno (boja + mesto + životinja + ton) lakše se pamte nego jedan, a svaki ton
//    uvek ima i svoje svetlo — igra radi i bez zvuka (deca oštećenog sluha, preosetljiva na zvuk,
//    isključen zvuk na uređaju).
//  • Unazad (nivoi 14 i 15) je „rad sa sadržajem” radne memorije (kao „ponavljanje cifara unazad”):
//    uvodi se sa kraćim nizom nego unapred, jer je teže za oko jednu stavku.
//  • Greška nije kazna: niz se mirno pokaže još jednom, a zatim sledeće pravo polje blago zasvetli.
//
// Nivoi (polja · dužina niza · zadataka · tempo):
//   Lako     1: 2 · 1 · 3 · 1100 ms   2: 2 · 2 · 3 · 1100   3: 3 · 2 · 4 · 1000   4: 3 · 3 · 4 · 1000   5: 3 · 3 · 4 · 950
//   Srednje  6: 4 · 3 · 4 · 900      7: 4 · 3 · 4 · 850    8: 4 · 4 · 4 · 850    9: 4 · 4 · 5 · 800   10: 4 · 4 · 5 · 750
//   Teško   11: 5 · 4 · 4 · 800     12: 5 · 5 · 4 · 750   13: 6 · 5 · 4 · 750
//           14: 6 · 3 · 4 · 850 unazad   15: 6 · 4 · 4 · 800 unazad

import type { BaseView } from "@/app/components/games/kit/types";
import type { FeedbackKind } from "@/app/components/games/kit/ui";
import { toCount } from "@/app/components/games/kit/utils";
import type { PictureId } from "@/app/components/games/pictures";

export type SimonPadId = "frog" | "duck" | "cat" | "fish" | "rabbit" | "bird";

export interface SimonPad {
    id: SimonPadId;
    /** Naziv životinje (natpis za čitač ekrana i za odrasle) */
    name: string;
    /** Crtež iz zajedničkog kompleta slika */
    pic: PictureId;
    /** Ton (indeks u PAD_NOTES, kit/tones.ts) */
    note: number;
    /** Boja polja, svetla boja kad polje svetli, tamna ivica */
    color: string;
    light: string;
    edge: string;
}

export const SIMON_PADS: readonly SimonPad[] = [
    { id: "frog", name: "Žaba", pic: "frog", note: 0, color: "#7BC67E", light: "#C9F5BF", edge: "#4E9A55" },
    { id: "duck", name: "Patka", pic: "duck", note: 1, color: "#F2BE3A", light: "#FFEC9E", edge: "#C4901A" },
    { id: "cat", name: "Mačka", pic: "cat", note: 2, color: "#F39A5A", light: "#FFD9B5", edge: "#C46A2E" },
    { id: "fish", name: "Riba", pic: "fish", note: 3, color: "#5FA8E4", light: "#C4E3FF", edge: "#3477B5" },
    { id: "rabbit", name: "Zeka", pic: "rabbit", note: 4, color: "#B28CE4", light: "#E6D6FF", edge: "#7E5CB8" },
    { id: "bird", name: "Ptica", pic: "bird", note: 5, color: "#EF7C90", light: "#FFCCD5", edge: "#BC4E63" },
];

export function getSimonPad(id: unknown): SimonPad | undefined {
    return SIMON_PADS.find((pad) => pad.id === id);
}

export interface SimonLevelRule {
    pads: number;
    length: number;
    rounds: number;
    /** Koliko traje jedno polje dok se niz pokazuje (svetlo + kratka pauza), ms */
    tempo: number;
    /** Ponavlja se unazad: od poslednjeg do prvog */
    backwards: boolean;
}

const RULES: readonly SimonLevelRule[] = [
    { pads: 2, length: 1, rounds: 3, tempo: 1100, backwards: false },
    { pads: 2, length: 2, rounds: 3, tempo: 1100, backwards: false },
    { pads: 3, length: 2, rounds: 4, tempo: 1000, backwards: false },
    { pads: 3, length: 3, rounds: 4, tempo: 1000, backwards: false },
    { pads: 3, length: 3, rounds: 4, tempo: 950, backwards: false },
    { pads: 4, length: 3, rounds: 4, tempo: 900, backwards: false },
    { pads: 4, length: 3, rounds: 4, tempo: 850, backwards: false },
    { pads: 4, length: 4, rounds: 4, tempo: 850, backwards: false },
    { pads: 4, length: 4, rounds: 5, tempo: 800, backwards: false },
    { pads: 4, length: 4, rounds: 5, tempo: 750, backwards: false },
    { pads: 5, length: 4, rounds: 4, tempo: 800, backwards: false },
    { pads: 5, length: 5, rounds: 4, tempo: 750, backwards: false },
    { pads: 6, length: 5, rounds: 4, tempo: 750, backwards: false },
    { pads: 6, length: 3, rounds: 4, tempo: 850, backwards: true },
    { pads: 6, length: 4, rounds: 4, tempo: 800, backwards: true },
];

export const SIMON_MAX_LEVEL = RULES.length;

export function simonRule(level: number): SimonLevelRule {
    return RULES[Math.min(Math.max(Math.round(level), 1), RULES.length) - 1];
}

export interface SimonRound {
    /** Niz koji se pokazuje, redom */
    sequence: SimonPadId[];
}

export interface SimonPlan {
    pads: SimonPadId[];
    backwards: boolean;
    tempo: number;
    rounds: SimonRound[];
}

/**
 * Zadaci nivoa. `random` je izvor brojeva (seme dvoboja ili Math.random). Polja su uvek ista
 * za nivo (predvidljiv raspored: žaba je uvek gore levo); nasumičan je samo niz. Na lakim
 * nivoima (do tri polja) isto polje ne svetli dvaput zaredom, a nijedno polje ni na težim
 * nivoima ne svetli triput zaredom. Dva zadatka zaredom nisu ista.
 */
export function buildSimonLevel(level: number, { maxRounds, random = Math.random }: { maxRounds: number; random?: () => number }): SimonPlan {
    const rule = simonRule(level);
    const pads = SIMON_PADS.slice(0, rule.pads).map((pad) => pad.id);
    const count = Math.max(2, Math.min(rule.rounds, Math.max(1, Math.floor(maxRounds))));
    const pick = () => pads[Math.floor(random() * pads.length)];
    const rounds: SimonRound[] = [];
    for (let r = 0; r < count; r += 1) {
        let sequence: SimonPadId[] = [];
        for (let attempt = 0; attempt < 20; attempt += 1) {
            sequence = [];
            while (sequence.length < rule.length) {
                const next = pick();
                const n = sequence.length;
                if (rule.pads <= 3 && n > 0 && sequence[n - 1] === next) continue;
                if (n > 1 && sequence[n - 1] === next && sequence[n - 2] === next) continue;
                sequence.push(next);
            }
            const previous = rounds[rounds.length - 1]?.sequence;
            if (!previous || previous.join() !== sequence.join()) break;
        }
        rounds.push({ sequence });
    }
    return { pads, backwards: rule.backwards, tempo: rule.tempo, rounds };
}

/** Kojim redom dete ponavlja niz (unazad: od poslednjeg) */
export function answerOrder(sequence: readonly SimonPadId[], backwards: boolean): SimonPadId[] {
    return backwards ? [...sequence].reverse() : [...sequence];
}

// ── Stanje igre (šalje se i roditeljskom prikazu uživo i drugom detetu na zajedničkoj tabli) ──

export type SimonPhase = "intro" | "show" | "input" | "solved";

export interface SimonView extends BaseView {
    pads: SimonPadId[];
    backwards: boolean;
    sequence: SimonPadId[];
    phase: SimonPhase;
    /** Polje koje upravo svetli dok se niz pokazuje */
    lit: SimonPadId | null;
    /** Koje mesto niza se upravo pokazuje (od 0); null kad se niz ne pokazuje */
    playing: number | null;
    /** Polje koje je dete upravo dodirnulo (kratak bljesak) */
    pressed: SimonPadId | null;
    /** Koliko polja niza je dete već tačno ponovilo */
    entered: number;
    feedback: FeedbackKind;
    /** Sledeće pravo polje blago svetli (pomoć) */
    hint: boolean;
    /** U ovom zadatku je već bilo greške */
    missed: boolean;
    promptedCount: number;
}

export function emptySimonView(totalRounds: number): SimonView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        promptedCount: 0,
        round: 1,
        totalRounds: Math.max(totalRounds, 1),
        pads: [],
        backwards: false,
        sequence: [],
        phase: "intro",
        lit: null,
        playing: null,
        pressed: null,
        entered: 0,
        feedback: null,
        hint: false,
        missed: false,
    };
}

const PHASES: readonly SimonPhase[] = ["intro", "show", "input", "solved"];

/** Stanje sa monitora može biti nepotpuno ili iz druge verzije — sve nepoznato se odbacuje. */
export function mergeSimonMonitor(state: Partial<SimonView> | null | undefined): SimonView {
    const base = emptySimonView(1);
    if (!state) return base;
    const pads = Array.isArray(state.pads) ? Array.from(new Set(state.pads.filter((id): id is SimonPadId => getSimonPad(id) !== undefined))) : [];
    const sequence = Array.isArray(state.sequence) ? state.sequence.filter((id): id is SimonPadId => pads.includes(id as SimonPadId)).slice(0, 12) : [];
    const totalRounds = Math.max(toCount(state.totalRounds, 1), 1);
    const onBoard = (id: unknown): SimonPadId | null => (pads.includes(id as SimonPadId) ? (id as SimonPadId) : null);
    return {
        ...base,
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        promptedCount: toCount(state.promptedCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        pads,
        backwards: state.backwards === true,
        sequence,
        phase: PHASES.includes(state.phase as SimonPhase) ? (state.phase as SimonPhase) : "intro",
        lit: onBoard(state.lit),
        playing: typeof state.playing === "number" && Number.isInteger(state.playing) && state.playing >= 0 && state.playing < sequence.length ? state.playing : null,
        pressed: onBoard(state.pressed),
        entered: Math.min(toCount(state.entered, 0), sequence.length),
        feedback: state.feedback === "correct" || state.feedback === "wrong" ? state.feedback : null,
        hint: state.hint === true,
        missed: state.missed === true,
    };
}
