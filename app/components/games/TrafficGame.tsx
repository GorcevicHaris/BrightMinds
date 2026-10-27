"use client";

// Igra „Saobraćaj”: crveno — stojimo, zeleno — idemo. Dete čeka zeleno svetlo (ili prazan
// put) pa kreće, bira bezbedno (kaciga, pojas, pešački prelaz, ruka odraslog, svetao prsluk),
// slaže korake prelaska ulice i upoznaje znakove. Nema žurbe: zeleno uvek ponovo dođe.
// Nivoi: data/trafficLevels.ts, crteži i ulica: traffic/, tok igre: world/.

import { useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useGameRandom, type GameProps } from "@/app/components/games/kit";
import { buildTrafficLevel, trafficLevel } from "@/app/components/games/data/trafficLevels";
import { Crossing, TrafficPic } from "@/app/components/games/traffic/TrafficArt";
import WorldGame, { type WorldArt } from "@/app/components/games/world/WorldGame";
import { worldResult, type WorldRound, type WorldView } from "@/app/components/games/world/worldPlay";

const ART: WorldArt = { pic: (pic, className) => <TrafficPic pic={pic} className={className} />, Crossing };

export default function TrafficGame(props: GameProps<WorldView>) {
    const { level, isMonitor, onComplete } = props;
    const settings = useChildSettings();
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<WorldRound[]>(() => (isMonitor ? [] : buildTrafficLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    return (
        <WorldGame
            {...props}
            gameId="traffic"
            plan={plan}
            art={ART}
            earlyHint={trafficLevel(level).earlyHint}
            onFinish={(final, modeled, seconds) => onComplete(worldResult(final, modeled, seconds))}
        />
    );
}
