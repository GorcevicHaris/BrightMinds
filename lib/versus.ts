// lib/versus.ts
// „Takmičenje” (VS) u igri sa drugom — čist deo (radi na serveru, u pregledaču i u testovima).
//
// Zašto ovako (istraživanja o igri dece od 3 do 10 godina i dece sa autizmom): takmičenje
// mnogoj deci podiže napetost, a poraz ume da pokvari ceo dan. Zato:
//   • takmičenje se bira samo (uključuje ga dete ili odrasli); „Zajedno” je uvek podrazumevano;
//   • ekran „VS” je kratak (oko 2 s) i može da se preskoči dodirom;
//   • nema žurbe ni sata: svako igra svojim tempom, broje se samo tačni odgovori;
//   • trud se slavi kod oba deteta — ko nije pobedio dobija toplu pohvalu, bez tužnog zvuka i
//     lica, a novčiće i nivoe oba deteta dobijaju kao i inače;
//   • pobednik se imenuje nežno („Lejla je pobedila!”), a nerešeno je „oboje ste super”.
//
// Zvezdice u takmičenju su tačni odgovori iz prvog pokušaja u tom nivou (svaki tačan odgovor —
// jedna zvezdica), pa rezultat raste uživo i retko je nerešen. Pol se koristi samo za
// gramatiku; kad se ne zna (drug sa drugog uređaja ili drug upisan na uređaju), rečenica je
// napisana tako da važi za oboje.

import { starsPhrase } from "./playTogether";

export type PlayMode = "together" | "versus";

export const PLAY_MODES: readonly PlayMode[] = ["together", "versus"];

/** Podrazumevano se igra zajedno (i za stare pozive koji ne znaju za takmičenje). */
export const DEFAULT_PLAY_MODE: PlayMode = "together";

/**
 * Način igre iz zahteva: nedostaje (stari klijent) → "together"; poznata vrednost → ta
 * vrednost; bilo šta drugo → null (neispravan zahtev).
 */
export function parsePlayMode(raw: unknown): PlayMode | null {
    if (raw === undefined || raw === null) return DEFAULT_PLAY_MODE;
    return raw === "together" || raw === "versus" ? raw : null;
}

/** Sačuvan ili primljen način igre: sve nepoznato znači „zajedno”. */
export function playModeOr(raw: unknown): PlayMode {
    return parsePlayMode(raw) ?? DEFAULT_PLAY_MODE;
}

/** Koliko traje ekran „VS” pre igre (dodir ga preskače). */
export const VS_INTRO_MS = 2200;

// ── Rezultat ───────────────────────────────────────────────────────────────────

/** Zvezdice u takmičenju za završen nivo: tačni odgovori (igra bez ocenjivanja: svi zadaci). */
export function versusScore(graded: boolean, correct: number, total: number): number {
    const all = Math.max(0, Math.round(total));
    if (!graded) return all;
    return Math.min(Math.max(0, Math.round(correct)), all || Number.MAX_SAFE_INTEGER);
}

/** Zvezdice u takmičenju dok nivo traje, iz stanja koje igrač šalje (lib/invite.ts, RemoteState). */
export function versusLiveScore(graded: boolean, state: { phase: string; correct: number; round: number; total: number } | null | undefined): number {
    if (!state) return 0;
    if (state.phase === "done") return Math.max(0, state.correct);
    if (state.phase !== "playing") return 0;
    return graded ? Math.max(0, state.correct) : Math.max(0, state.round - 1);
}

/** Pobednik (indeks igrača) ili null kad je nerešeno. */
export function versusWinner(scores: readonly [number, number]): 0 | 1 | null {
    if (scores[0] === scores[1]) return null;
    return scores[0] > scores[1] ? 0 : 1;
}

// ── Reči ──────────────────────────────────────────────────────────────────────

export type Gender = "female" | "male" | null;

/** Pol iz profila („female”/„male”); sve ostalo → ne zna se. */
export function genderOf(raw: unknown): Gender {
    if (typeof raw !== "string") return null;
    const value = raw.trim().toLowerCase();
    return value === "female" ? "female" : value === "male" ? "male" : null;
}

export interface VersusPlayer {
    name: string;
    gender?: Gender;
}

export const TIE_TITLE = "Nerešeno — oboje ste super!";

/**
 * „Lejla je pobedila!” / „Amar je pobedio!”; bez pola: „Haris pobeđuje!” (glagol bez roda; ne
 * „ima više zvezdica”, jer isti broj zvezdica može razrešiti vreme ili udeo tačnih — lib/duelStakes.ts)
 */
export function winnerTitle(player: VersusPlayer): string {
    if (player.gender === "female") return `${player.name} je pobedila!`;
    if (player.gender === "male") return `${player.name} je pobedio!`;
    return `${player.name} pobeđuje!`;
}

/**
 * Rezultat sa zvezdicom, prvo pobednik (bez pobednika: prvo veći broj): „⭐ 4 : 3”. Kad deca
 * imaju različit broj zadataka, uz svaki broj ide i broj zadataka: „⭐ 3/4 : 4/6”.
 */
export function scoreLine(scores: readonly [number, number], winner?: 0 | 1 | null, totals?: readonly [number, number] | null): string {
    const first = winner === 0 || winner === 1 ? winner : scores[0] >= scores[1] ? 0 : 1;
    const second = first === 0 ? 1 : 0;
    const part = (i: 0 | 1) => (totals && totals[0] !== totals[1] ? `${scores[i]}/${totals[i]}` : `${scores[i]}`);
    return `⭐ ${part(first)} : ${part(second)}`;
}

/** Topla pohvala detetu koje ovaj put nije pobedilo: uvek trud, nikad „izgubio si”. */
export function effortPraise(player: VersusPlayer, score: number): string {
    const n = Math.max(0, Math.round(score));
    if (n === 0) {
        if (player.gender === "female") return `${player.name}, bravo za trud — lepo si igrala!`;
        if (player.gender === "male") return `${player.name}, bravo za trud — lepo si igrao!`;
        return `${player.name}, bravo za trud — super si!`;
    }
    if (player.gender === "female") return `${player.name}, bravo za trud — skupila si ${starsPhrase(n)}!`;
    if (player.gender === "male") return `${player.name}, bravo za trud — skupio si ${starsPhrase(n)}!`;
    return `${player.name}, bravo za trud — imaš ${starsPhrase(n)}!`;
}

export interface VersusTexts {
    /** Indeks pobednika ili null (nerešeno) */
    winner: 0 | 1 | null;
    title: string;
    score: string;
    /** Pohvala drugom detetu (ili oboma kad je nerešeno) */
    praise: string;
}

/**
 * Sve reči kraja takmičenja za dva igrača i njihove zvezdice. `winner` dolazi spolja kad
 * pobednika ne određuje samo broj zvezdica (udeo tačnih, vreme u trci — lib/duelStakes.ts).
 */
export function versusTexts(
    players: readonly [VersusPlayer, VersusPlayer],
    scores: readonly [number, number],
    options: { winner?: 0 | 1 | null; totals?: readonly [number, number] | null } = {}
): VersusTexts {
    const winner = options.winner !== undefined ? options.winner : versusWinner(scores);
    const score = scoreLine(scores, winner, options.totals);
    if (winner === null) {
        return { winner, title: TIE_TITLE, score, praise: `Bravo, ${players[0].name} i ${players[1].name}!` };
    }
    const other = winner === 0 ? 1 : 0;
    return { winner, title: winnerTitle(players[winner]), score, praise: effortPraise(players[other], scores[other]) };
}
