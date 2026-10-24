// lib/gameAccess.ts
// Koje igre dete vidi i koje su mu otvorene. Čist modul: isto pravilo koriste dečji ekran,
// mapa igara, roditeljska podešavanja i server (activities/complete odbija zaključanu igru).
//
//  • Roditelj može da isključi pojedine igre (`disabledGames`) — dete ih ne vidi.
//  • Sa „Otključavanjem redom” (`unlockInOrder`) igre se otvaraju jedna za drugom, redom
//    učenja za uzrast deteta (`sortGamesForChild`): prva je uvek otvorena, a svaka sledeća
//    kad dete završi `UNLOCK_AFTER_LEVEL`. nivo prethodne.
//  • Ono što je dete već otvorilo ostaje otvoreno: igra u kojoj ima položen nivo, i igra iz
//    dnevnog plana koji je roditelj sam sastavio.
import { GAMES, sortGamesForChild, type GameDefinition, type GameId } from "./games";

/** Posle kog POLOŽENOG nivoa prethodne igre se otvara sledeća */
export const UNLOCK_AFTER_LEVEL = 3;

/**
 * Napredak po igri u obliku koji vraća /api/children/[id]/unlocked-levels: prvi još
 * nepoložen nivo (1 = ništa položeno, 4 = položena prva tri). Igra koje nema = 1.
 */
export type GameProgress = Partial<Record<GameId, number>>;

/** Deo podešavanja deteta koji odlučuje o igrama (ResolvedSettings ga ima ceo). */
export interface GameAccessSettings {
    disabledGames: readonly GameId[];
    unlockInOrder: boolean;
    plan: readonly GameId[];
    /** Uzrast za redosled igara (`ResolvedSettings.playAge`); bez njega samo redosled učenja */
    playAge?: number | null;
}

export type GameAccess<G extends GameDefinition = GameDefinition> =
    | { game: G; state: "open" }
    /** Zaključana: otvara se kad dete završi `UNLOCK_AFTER_LEVEL`. nivo igre `after` */
    | { game: G; state: "locked"; after: G };

function passedThrough(progress: GameProgress, id: GameId, level: number): boolean {
    const unlocked = progress[id];
    return typeof unlocked === "number" && unlocked > level;
}

/**
 * Sve igre koje roditelj nije isključio, poređane za dete, sa stanjem: otvorena ili
 * zaključana (i posle koje igre se otvara). Isključene igre se ne vraćaju.
 */
export function gameAccess<G extends GameDefinition>(settings: GameAccessSettings, progress: GameProgress, games: readonly G[]): GameAccess<G>[] {
    const disabled = new Set<GameId>(settings.disabledGames);
    let shown = games.filter((game) => !disabled.has(game.id));
    // Osigurač: ako bi bile isključene sve igre, dete ipak vidi sve
    if (shown.length === 0) shown = [...games];
    const sorted = sortGamesForChild(shown, settings.playAge ?? null);

    return sorted.map((game, index): GameAccess<G> => {
        const previous = index > 0 ? sorted[index - 1] : null;
        const open =
            !settings.unlockInOrder ||
            previous === null ||
            settings.plan.includes(game.id) ||
            passedThrough(progress, game.id, 1) ||
            passedThrough(progress, previous.id, UNLOCK_AFTER_LEVEL);
        return open || previous === null ? { game, state: "open" } : { game, state: "locked", after: previous };
    });
}

/** Igre koje dete sme da igra, redom kojim se prikazuju (za mapu igara i izbor igre). */
export function availableGames<G extends GameDefinition>(settings: GameAccessSettings, progress: GameProgress, games: readonly G[]): G[] {
    return gameAccess(settings, progress, games)
        .filter((entry) => entry.state === "open")
        .map((entry) => entry.game);
}

/** Da li je ova igra detetu otvorena (server pre čuvanja rezultata). */
export function isGameAvailable(settings: GameAccessSettings, progress: GameProgress, gameId: GameId, games: readonly GameDefinition[] = GAMES): boolean {
    return availableGames(settings, progress, games).some((game) => game.id === gameId);
}

/**
 * Prva zaključana igra — ona koja se sledeća otvara. Detetu se prikazuje samo ona (uz katanac
 * i ikonicu igre koju treba završiti), a ne ceo spisak zaključanih: manje je obeshrabrujuće.
 */
export function nextLockedGame<G extends GameDefinition>(settings: GameAccessSettings, progress: GameProgress, games: readonly G[]): Extract<GameAccess<G>, { state: "locked" }> | null {
    for (const entry of gameAccess(settings, progress, games)) {
        if (entry.state === "locked") return entry;
    }
    return null;
}

/** Igre za izbor na dečjem ekranu: dostupne, poređane po uzrastu i težini. */
export function pickerGames(settings: GameAccessSettings, progress: GameProgress): GameDefinition[] {
    return availableGames(settings, progress, GAMES);
}
