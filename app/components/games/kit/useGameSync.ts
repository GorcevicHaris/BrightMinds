"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { getGame, type GameId } from "@/lib/games";
import { useGameBroadcast } from "@/lib/realtime";
import type { GameUpdate } from "@/lib/types";
import { useGamePaused } from "./pause";
import type { BaseView } from "./types";

interface Options {
    childId: number;
    gameId: GameId;
    level: number;
    isMonitor?: boolean;
}

/**
 * Šalje stanje igre live monitoru i meri trajanje nivoa.
 * U monitor režimu sve funkcije su prazne.
 *
 *   const sync = useGameSync({ childId, gameId: "memory", level, isMonitor });
 *   sync.start(view);                      // na početku nivoa
 *   sync.update(view, "Pronađen par 🐶");  // posle svakog poteza (log vidi roditelj)
 *   sync.complete(view);                   // na kraju nivoa
 */
export function useGameSync<V extends BaseView>({ childId, gameId, level, isMonitor = false }: Options) {
    const publish = useGameBroadcast(childId, !isMonitor);
    const startedAt = useRef<number | null>(null);
    // Vreme na pauzi se ne računa u trajanje igre (statistika „vreme igre”)
    const paused = useGamePaused();
    const pausedSince = useRef<number | null>(null);
    const pausedTotal = useRef(0);
    useEffect(() => {
        if (paused) {
            pausedSince.current = Date.now();
        } else if (pausedSince.current !== null) {
            pausedTotal.current += Date.now() - pausedSince.current;
            pausedSince.current = null;
        }
    }, [paused]);

    const emit = useCallback(
        (event: GameUpdate["event"], view: V, log?: string) => {
            if (isMonitor) return;
            const game = getGame(gameId);
            publish({
                childId,
                activityId: game.activityId,
                gameType: game.gameType,
                event,
                data: { ...view, level, ...(log ? { log } : {}) },
                timestamp: new Date().toISOString(),
            });
        },
        [childId, gameId, level, isMonitor, publish]
    );

    return useMemo(
        () => ({
            start: (view: V) => {
                // Jednom po nivou: React u razvoju pokreće efekte dvaput, pa bi roditelj video dva početka
                if (startedAt.current !== null) return;
                startedAt.current = Date.now();
                emit("started", view);
            },
            update: (view: V, log?: string) => emit("progress", view, log),
            complete: (view: V) => emit("completed", { ...view, finalScore: view.score }),
            /** Sekunde od `start()` (najmanje 1) */
            elapsedSec: () => {
                if (startedAt.current === null) return 1;
                const pausedMs = pausedTotal.current + (pausedSince.current === null ? 0 : Date.now() - pausedSince.current);
                return Math.max(1, Math.round((Date.now() - startedAt.current - pausedMs) / 1000));
            },
        }),
        [emit]
    );
}
