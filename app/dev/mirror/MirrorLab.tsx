"use client";

// Dete igra levo; svaka poruka igre (ista kao ona koja ide roditelju preko Realtime-a) odmah se
// crta desno u istom okviru kao na stranici „Uživo” (GameMirror iz LiveMonitor-a).
import { useCallback, useState, useSyncExternalStore } from "react";
import { GAME_COMPONENTS, GameMirror, type ActiveGame } from "@/app/components/LiveMonitor";
import { getGame, type GameId } from "@/lib/games";
import { GameEventTapProvider } from "@/lib/realtime";
import type { GameUpdate } from "@/lib/types";

export default function MirrorLab({ gameId, level }: { gameId: GameId; level: number }) {
    const game = getGame(gameId);
    const [active, setActive] = useState<ActiveGame | null>(null);
    // Samo u pregledaču (igre se ionako učitavaju bez serverskog crtanja)
    const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);

    const onUpdate = useCallback(
        (update: GameUpdate) => {
            const view = (update.data ?? {}) as ActiveGame["view"];
            setActive((prev) => ({
                game,
                view,
                session: prev ? prev.session : 1,
                phase: update.event === "completed" ? "finished" : "playing",
                updatedAt: update.timestamp,
            }));
        },
        [game]
    );

    if (!mounted) return null;
    const Game = GAME_COMPONENTS[game.gameType];
    return (
        <main className="grid min-h-dvh gap-4 bg-canvas p-4 lg:grid-cols-2">
            <section aria-label="Dete" className="flex h-[min(46rem,92dvh)] flex-col rounded-card border-2 border-line bg-surface p-3">
                <GameEventTapProvider value={onUpdate}>
                    <Game childId={0} level={level} onComplete={() => {}} />
                </GameEventTapProvider>
            </section>
            <section aria-label="Roditelj">{active ? <GameMirror active={active} childId={0} /> : <p className="p-6 text-ink-soft">Čekamo prvi potez…</p>}</section>
        </main>
    );
}

const subscribeNothing = () => () => {};
