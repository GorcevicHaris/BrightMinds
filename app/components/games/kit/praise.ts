"use client";

import { useCallback, useRef } from "react";
import { announcePraise } from "./hype";

// Kratke pohvale koje drugar izgovara uz potvrdu tačnog odgovora („Bravo! To je zvezda.”).
// Kratke i konkretne, bez preterivanja; menjaju se da ne zvuče kao snimak, a posle niza
// tačnih odgovora dolazi ohrabrenje da nastavi. Sve su bez roda (ne zavise od pola deteta).
const PRAISE = ["Bravo!", "Odlično!", "Super!", "Tako je!", "Svaka čast!", "Sjajno!", "Ti si zvezda!"];
const STREAK = ["Samo tako nastavi!", "Ide ti odlično!", "Sjajno ti ide!", "Bravo, samo napred!"];

/** Posle ovoliko samostalnih tačnih odgovora zaredom dolazi veće slavlje */
export const STREAK_EVERY = 3;

function pickOther(list: readonly string[], last: string | null): string {
    const options = list.filter((item) => item !== last);
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * `praise(tekst, samostalno)` vraća tekst sa pohvalom ispred. Posle svakog trećeg samostalnog
 * tačnog odgovora zaredom ide ohrabrenje (i drugar veće navija); inače kratka pohvala.
 * Odgovor uz pomoć uvek dobija jednostavno „Bravo!”. Ista reč se javlja i drugaru na ekranu
 * (oblačić iznad njega), pa glas ostaje jedan — drugar „govori” ono što dete čuje.
 */
export function usePraise() {
    const streak = useRef(0);
    const last = useRef<string | null>(null);

    return useCallback((text: string, independent: boolean): string => {
        if (!independent) {
            streak.current = 0;
            announcePraise("Bravo!", false);
            return `Bravo! ${text}`;
        }
        streak.current += 1;
        const big = streak.current % STREAK_EVERY === 0;
        const lead = pickOther(big ? STREAK : PRAISE, last.current);
        last.current = lead;
        announcePraise(lead, big);
        return `${lead} ${text}`;
    }, []);
}
