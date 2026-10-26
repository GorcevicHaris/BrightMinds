"use client";

// Domaćin i gost u istoj kartici (SharedBoardLab, playRemote.tsx), svako u svom okviru veličine
// telefona ili tableta, da se zajednička tabla proveri u svakoj igri bez dva naloga.
import { useSyncExternalStore } from "react";
import { GAME_COMPONENTS } from "@/app/components/LiveMonitor";
import { SharedBoardLab } from "@/app/dashboard/child/[id]/playRemote";
import { SharedGuestBoard, SharedHostLayer } from "@/app/dashboard/child/[id]/playShared";
import { getGame, type GameId } from "@/lib/games";
import type { PlayMode } from "@/lib/versus";

export default function SharedLab({ gameId, level, mode, lag }: { gameId: GameId; level: number; mode: PlayMode; lag: number }) {
    const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
    if (!mounted) return null;
    const Game = GAME_COMPONENTS[getGame(gameId).gameType];
    return (
        <main className="grid h-dvh grid-cols-2 gap-3 bg-canvas p-3">
            <SharedBoardLab
                gameId={gameId}
                level={level}
                mode={mode}
                lag={lag}
                renderHost={({ sessionId, onComplete }) => (
                    <SharedHostLayer key={sessionId} gameId={gameId} sessionId={sessionId}>
                        <Game childId={0} level={level} gender="female" childName="Lejla" onComplete={onComplete} />
                    </SharedHostLayer>
                )}
                renderGuest={({ onComplete, onFollowLevel }) => <SharedGuestBoard gameId={gameId} level={level} gender="male" onComplete={onComplete} onCompleteSaved={onComplete} onFollowLevel={onFollowLevel} />}
            />
        </main>
    );
}

const subscribeNothing = () => () => {};
