// Zajednički ugovor za sve igre.

/** Rezultat jednog nivoa. Zvezdice se računaju iz correct/total. */
export interface GameResult {
    score: number;
    durationSec: number;
    /** Zadaci rešeni samostalno, iz prvog pokušaja */
    correct: number;
    total: number;
    /** Zadaci rešeni tek pošto je tačan odgovor istaknut (uz pomoć) */
    prompted?: number;
}

/**
 * Polja koja svaka igra drži u svom "view" stanju. View mora biti običan JSON:
 * šalje se live monitoru, koji istu komponentu iscrtava sa `isMonitor` + `monitorState`.
 */
export interface BaseView {
    score: number;
    correctCount: number;
    incorrectCount: number;
    /** Trenutni zadatak, od 1 */
    round: number;
    totalRounds: number;
}

export interface GameProps<V extends BaseView = BaseView> {
    childId: number;
    /** 1–15 (1–5 lako, 6–10 srednje, 11–15 teško) */
    level: number;
    gender?: string;
    onComplete: (result: GameResult) => void;
    /** Samo prikaz za roditelja: bez zvuka, bez unosa, stanje dolazi iz `monitorState` */
    isMonitor?: boolean;
    monitorState?: Partial<V> | null;
}
