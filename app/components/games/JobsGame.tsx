"use client";

// Igra „Ko šta radi?”: Semir je vatrogasac, Emina je doktorka, Adnan je pekar… Dete spaja
// radnike sa alatima, mestima gde rade i nevoljama u kojima pomažu („Gori kuća!”), a na kraju
// pogađa zagonetke („Nosim beli mantil. Slušam srce. Ko sam ja?”). Nema žurbe ni tajmera.
// Nivoi: data/jobsLevels.ts, crteži: jobs/, tok igre: world/.

import { useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useGameRandom, type GameProps } from "@/app/components/games/kit";
import { buildJobsLevel, jobsLevel } from "@/app/components/games/data/jobsLevels";
import { JobPic } from "@/app/components/games/jobs/JobsArt";
import WorldGame, { type WorldArt } from "@/app/components/games/world/WorldGame";
import { worldResult, type WorldRound, type WorldView } from "@/app/components/games/world/worldPlay";

const ART: WorldArt = { pic: (pic, className) => <JobPic pic={pic} className={className} /> };

export default function JobsGame(props: GameProps<WorldView>) {
    const { level, isMonitor, onComplete } = props;
    const settings = useChildSettings();
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<WorldRound[]>(() => (isMonitor ? [] : buildJobsLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    return (
        <WorldGame
            {...props}
            gameId="jobs"
            plan={plan}
            art={ART}
            earlyHint={jobsLevel(level).earlyHint}
            onFinish={(final, modeled, seconds) => onComplete(worldResult(final, modeled, seconds))}
        />
    );
}
