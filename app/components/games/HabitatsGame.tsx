"use client";

// Igra „Ko gde živi?”: krava na farmi, kit u moru, pingvin na ledu, majmun u džungli… Dete
// smešta životinje u njihova staništa i domove (gnezdo, košnica), traži ko ne živi na nekom
// mestu i pogađa zagonetke („Imam crno-belo perje. Ne letim, ali plivam.”). Nema žurbe ni
// tajmera. Nivoi: data/habitatsLevels.ts, crteži: habitats/, tok igre: world/.

import { useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useGameRandom, type GameProps } from "@/app/components/games/kit";
import { buildHabitatsLevel, habitatsLevel } from "@/app/components/games/data/habitatsLevels";
import { HabitatPic } from "@/app/components/games/habitats/HabitatsArt";
import WorldGame, { type WorldArt } from "@/app/components/games/world/WorldGame";
import { worldResult, type WorldRound, type WorldView } from "@/app/components/games/world/worldPlay";

const ART: WorldArt = { pic: (pic, className) => <HabitatPic pic={pic} className={className} /> };

export default function HabitatsGame(props: GameProps<WorldView>) {
    const { level, isMonitor, onComplete } = props;
    const settings = useChildSettings();
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<WorldRound[]>(() => (isMonitor ? [] : buildHabitatsLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    return (
        <WorldGame
            {...props}
            gameId="habitats"
            plan={plan}
            art={ART}
            earlyHint={habitatsLevel(level).earlyHint}
            onFinish={(final, modeled, seconds) => onComplete(worldResult(final, modeled, seconds))}
        />
    );
}
