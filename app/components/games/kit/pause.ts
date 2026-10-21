"use client";

import { createContext, useContext } from "react";

/**
 * True dok dete odmara (ekran „Pauza”). Igra ostaje na ekranu ispod, ali stoji: tajmeri iz
 * `useTimers` čekaju, pomoć posle čekanja ne kreće i nijedan tajmer igre ne pokreće govor.
 */
export const GamePauseContext = createContext(false);

export function useGamePaused(): boolean {
    return useContext(GamePauseContext);
}
