"use client";

// Igra „Godišnja doba”: isto drvo u proleće, leto, jesen i zimu; šta tada radimo i nosimo
// (sneško, šlauf, kestenje), redosled kroz godinu, delovi dana (jutro, podne, veče, noć) i
// meseci. Nema žurbe ni tajmera. Nivoi: data/seasonsLevels.ts, crteži: seasons/, tok igre: world/.

import { useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useGameRandom, type GameProps } from "@/app/components/games/kit";
import { buildSeasonsLevel, seasonsLevel } from "@/app/components/games/data/seasonsLevels";
import { SeasonPic } from "@/app/components/games/seasons/SeasonsArt";
import WorldGame, { type WorldArt } from "@/app/components/games/world/WorldGame";
import { worldResult, type WorldRound, type WorldView } from "@/app/components/games/world/worldPlay";

const ART: WorldArt = { pic: (pic, className) => <SeasonPic pic={pic} className={className} /> };

export default function SeasonsGame(props: GameProps<WorldView>) {
    const { level, isMonitor, onComplete } = props;
    const settings = useChildSettings();
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<WorldRound[]>(() => (isMonitor ? [] : buildSeasonsLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    return (
        <WorldGame
            {...props}
            gameId="seasons"
            plan={plan}
            art={ART}
            earlyHint={seasonsLevel(level).earlyHint}
            onFinish={(final, modeled, seconds) => onComplete(worldResult(final, modeled, seconds))}
        />
    );
}
