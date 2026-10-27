"use client";

// Igra „Suprotnosti”: veliko i malo, puno i prazno, dan i noć… Prvo ista stvar na dve slike
// („Koja lopta je velika?”), pa traženje suprotnosti, razvrstavanje na dve strane, parovi i na
// kraju samo reči. Svaki odgovor ima mirno objašnjenje; nema žurbe ni tajmera.
// Nivoi: data/oppositesLevels.ts, crteži: opposites/, tok igre: world/.

import { useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useGameRandom, type GameProps } from "@/app/components/games/kit";
import { buildOppositesLevel, oppositesLevel } from "@/app/components/games/data/oppositesLevels";
import { OppositePic } from "@/app/components/games/opposites/OppositesArt";
import WorldGame, { type WorldArt } from "@/app/components/games/world/WorldGame";
import { worldResult, type WorldRound, type WorldView } from "@/app/components/games/world/worldPlay";

const ART: WorldArt = { pic: (pic, className) => <OppositePic pic={pic} className={className} /> };

export default function OppositesGame(props: GameProps<WorldView>) {
    const { level, isMonitor, onComplete } = props;
    const settings = useChildSettings();
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<WorldRound[]>(() => (isMonitor ? [] : buildOppositesLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    return (
        <WorldGame
            {...props}
            gameId="opposites"
            plan={plan}
            art={ART}
            earlyHint={oppositesLevel(level).earlyHint}
            onFinish={(final, modeled, seconds) => onComplete(worldResult(final, modeled, seconds))}
        />
    );
}
