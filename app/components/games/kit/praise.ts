"use client";

import { useCallback, useRef } from "react";

// Kratke pohvale koje učitelj dodaje uz potvrdu tačnog odgovora („Bravo! To je zvezda.”).
// Kratke i konkretne, bez preterivanja; menjaju se da ne zvuče kao snimak, a posle niza
// tačnih odgovora dolazi ohrabrenje da nastavi. Sve su bez roda (ne zavise od pola deteta).
const PRAISE = ["Bravo!", "Odlično!", "Super!", "Tako je!", "Svaka čast!", "Sjajno!", "Lepo!"];
const STREAK = ["Samo tako nastavi!", "Ide ti odlično!", "Sjajno ti ide!", "Bravo, samo napred!"];

function pickOther(list: readonly string[], last: string | null): string {
    const options = list.filter((item) => item !== last);
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * `praise(tekst, samostalno)` vraća tekst sa pohvalom ispred. Posle svakog trećeg samostalnog
 * tačnog odgovora zaredom ide ohrabrenje; inače pohvala dolazi otprilike dva puta od tri,
 * da ne bi postala šum. Odgovor uz pomoć uvek dobija jednostavno „Bravo!”.
 */
export function usePraise() {
    const streak = useRef(0);
    const last = useRef<string | null>(null);

    return useCallback((text: string, independent: boolean): string => {
        if (!independent) {
            streak.current = 0;
            return `Bravo! ${text}`;
        }
        streak.current += 1;
        let lead: string | null = null;
        if (streak.current % 3 === 0) lead = pickOther(STREAK, last.current);
        else if (Math.random() < 0.67) lead = pickOther(PRAISE, last.current);
        if (!lead) return text;
        last.current = lead;
        return `${lead} ${text}`;
    }, []);
}
