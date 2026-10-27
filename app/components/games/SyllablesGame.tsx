"use client";

// Igra „Koliko slogova?”: dete tapše slogove reči u bubanj (MA-ČKA — dva udarca), prvo uz
// slogove koji se pale, pa samo, i kaže „Gotovo”. Kasnije broji, razvrstava slike po broju
// slogova, traži najdužu reč i reč koja počinje datim slogom. Nema žurbe ni tajmera.
// Nivoi i podela na slogove: data/syllablesLevels.ts, tok igre: world/.

import { useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useGameRandom, type GameProps } from "@/app/components/games/kit";
import { buildSyllablesLevel, syllablesLevel } from "@/app/components/games/data/syllablesLevels";
import { BeatDots } from "@/app/components/games/syllables/SyllablesArt";
import { BasePic } from "@/app/components/games/world/basePics";
import WorldGame, { type WorldArt } from "@/app/components/games/world/WorldGame";
import { worldResult, type WorldRound, type WorldView } from "@/app/components/games/world/worldPlay";

const ART: WorldArt = {
    pic: (pic, className) => (pic.startsWith("dots") ? <BeatDots count={Number(pic.slice(4))} className={className} /> : <BasePic pic={pic} className={className} />),
};

export default function SyllablesGame(props: GameProps<WorldView>) {
    const { level, isMonitor, onComplete } = props;
    const settings = useChildSettings();
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<WorldRound[]>(() => (isMonitor ? [] : buildSyllablesLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    return (
        <WorldGame
            {...props}
            gameId="syllables"
            unit="Reč"
            plan={plan}
            art={ART}
            earlyHint={syllablesLevel(level).earlyHint}
            onFinish={(final, modeled, seconds) => onComplete(worldResult(final, modeled, seconds))}
        />
    );
}
