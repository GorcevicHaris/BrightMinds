"use client";

import { useCallback, useEffect, useRef } from "react";
import type { VoiceEmotion } from "@/lib/emotion";

// Čitanje naglas u igrama gde se prvo sluša, pa bira (situacije, priče).

/** Kratka pauza pre čitanja nove stranice, da se prikaz prvo smiri */
export const NARRATION_DELAY_MS = 400;
/** Ako se kraj čitanja ne javi, izbori se ipak otključaju posle ovoliko vremena */
export const LISTEN_MAX_MS = 6000;

type Say = (text: string, onEnd?: () => void, emotion?: VoiceEmotion) => unknown;

/**
 * Izgovara delove jedan za drugim. Svaki novi `sayAll` ili `cancel` poništava započeti niz
 * (sam govor prekida `stop` iz `useSpeech`); niz se poništava i kad komponenta nestane.
 *
 *   const { sayAll, cancel } = useSayAll(say);
 *   sayAll([pitanje, ...izbori], () => otključaj());
 *
 * `emotion` važi za ceo niz (npr. "happy" za pohvalu); bez nje se ton prepoznaje iz svake rečenice.
 */
export function useSayAll(say: Say) {
    const run = useRef(0);

    const cancel = useCallback(() => {
        run.current += 1;
    }, []);

    const sayAll = useCallback(
        (parts: string[], onDone?: () => void, emotion?: VoiceEmotion) => {
            run.current += 1;
            const mine = run.current;
            const step = (i: number) => {
                if (mine !== run.current) return;
                if (i >= parts.length) {
                    onDone?.();
                    return;
                }
                void say(parts[i], () => step(i + 1), emotion);
            };
            step(0);
        },
        [say]
    );

    useEffect(() => cancel, [cancel]);

    return { sayAll, cancel };
}

/**
 * Zaključavanje dok se sluša: kad se promeni `resetKey` (nova situacija ili stranica), posle kratke
 * pauze kreće `narrate`, a `unlock` se zove najkasnije posle LISTEN_MAX_MS — i kad se kraj govora
 * ne javi. Samo stanje „sluša se” ostaje u view-u igre (vidi ga i monitor); `narrate` obično sam
 * zove `unlock` čim čitanje završi, pa `unlock` mora da podnese i drugi poziv.
 */
export function useListenGate(enabled: boolean, resetKey: unknown, narrate: () => void, unlock: () => void) {
    useEffect(() => {
        if (!enabled) return;
        const speakTimer = window.setTimeout(narrate, NARRATION_DELAY_MS);
        const unlockTimer = window.setTimeout(unlock, LISTEN_MAX_MS);
        return () => {
            window.clearTimeout(speakTimer);
            window.clearTimeout(unlockTimer);
        };
    }, [enabled, resetKey, narrate, unlock]);
}
