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
export function useListenGate(enabled: boolean, resetKey: unknown, narrate: () => void, unlock: () => void, maxMs = LISTEN_MAX_MS) {
    useEffect(() => {
        if (!enabled) return;
        const speakTimer = window.setTimeout(narrate, NARRATION_DELAY_MS);
        const unlockTimer = window.setTimeout(unlock, maxMs);
        return () => {
            window.clearTimeout(speakTimer);
            window.clearTimeout(unlockTimer);
        };
    }, [enabled, resetKey, narrate, unlock, maxMs]);
}

/**
 * Koliko najduže vredi čekati da se tekst pročita: oko pola sekunde po reči, u granicama 6–16 s.
 * Za duže stranice (priče) — da se izbori ne otključaju usred rečenice, pre samog pitanja.
 */
export function listenLimitFor(text: string): number {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.min(16000, Math.max(LISTEN_MAX_MS, words * 500 + 2000));
}

/** Najkraće trajanje povratne poruke: i kad je glas isključen, dete stigne da vidi šta se desilo */
export const FEEDBACK_MIN_MS = 1200;
/** Najduže čekanje na kraj rečenice (glas iz mreže ume da zakasni ili da se ne javi) */
export const FEEDBACK_MAX_MS = 4500;

interface SayThenOptions {
    min?: number;
    max?: number;
    emotion?: VoiceEmotion;
}

/**
 * Izgovori pa nastavi: `proceed` se zove kad glas završi rečenicu, ali ne pre `min` i ne posle `max`.
 * Tako se „To je zvezda.” nikad ne preseče sledećim pitanjem, a igra ne čeka duže nego što treba.
 * `after` je iz `useTimers` (tajmeri se sami čiste kad igra nestane).
 *
 *   const sayThen = useSayThen(say, after);
 *   sayThen("To je zvezda.", () => startRound(next), { emotion: "happy" });
 */
export function useSayThen(say: Say, after: (ms: number, fn: () => void) => unknown) {
    return useCallback(
        (text: string, proceed: () => void, { min = FEEDBACK_MIN_MS, max = FEEDBACK_MAX_MS, emotion }: SayThenOptions = {}) => {
            let waiting = 2;
            let finished = false;
            const finish = () => {
                if (finished) return;
                finished = true;
                proceed();
            };
            const step = () => {
                waiting -= 1;
                if (waiting === 0) finish();
            };
            after(min, step);
            after(max, finish);
            void say(text, step, emotion);
        },
        [say, after]
    );
}
