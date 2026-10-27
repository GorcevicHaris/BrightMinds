"use client";

// Igra „Moje telo”: na velikom crtežu Amara ili Lejle dete pokazuje delove lica i tela („Gde
// su uši?”), čula („Čime mirišemo cveće?”) i gde se šta nosi („Gde nosimo rukavice?”), pa
// razvrstava stvari po čulima i broji (dve ruke, pet prstiju). Nema žurbe ni tajmera.
// Nivoi: data/bodyLevels.ts, crtež deteta: body/, tok igre: world/.

import { useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useGameRandom, type GameProps } from "@/app/components/games/kit";
import { BodyFigure, BodyPic } from "@/app/components/games/body/BodyArt";
import { bodyLevel, buildBodyLevel } from "@/app/components/games/data/bodyLevels";
import WorldGame, { type WorldArt } from "@/app/components/games/world/WorldGame";
import { worldResult, type WorldRound, type WorldView } from "@/app/components/games/world/worldPlay";

const ART: WorldArt = { pic: (pic, className) => <BodyPic pic={pic} className={className} />, Figure: BodyFigure };

export default function BodyGame(props: GameProps<WorldView>) {
    const { level, isMonitor, onComplete } = props;
    const settings = useChildSettings();
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<WorldRound[]>(() => (isMonitor ? [] : buildBodyLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })));
    return (
        <WorldGame
            {...props}
            gameId="body"
            plan={plan}
            art={ART}
            earlyHint={bodyLevel(level).earlyHint}
            onFinish={(final, modeled, seconds) => onComplete(worldResult(final, modeled, seconds))}
        />
    );
}
