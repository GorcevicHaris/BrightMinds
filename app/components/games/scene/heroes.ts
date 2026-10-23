// Ko je glavni lik na slici i kakvo mu je lice, za svaku igru.

import type { EmotionScenario } from "@/app/components/games/data/emotionScenarios";
import type { HeroLook, LookId } from "./types";

/**
 * Glavni lik scenarija iz igre „Emocije”.
 * Laki nivoi (težina 1): lice pokazuje tačno osećanje — slika pomaže da dete prepozna lice.
 * Srednji i teški nivoi: lik je okrenut leđima, pa dete zaključuje iz situacije; lice sa
 * tačnim osećanjem se vidi tek uz pomoć (`revealed`) ili posle tačnog odgovora.
 */
export function emotionHero(scenario: EmotionScenario, revealed: boolean): HeroLook {
    const look: LookId = scenario.who;
    if (scenario.tier === 1 || revealed) return { look, face: scenario.common[0] };
    return { look, back: true };
}

/** Dete koje igra (priče su u prvom licu) */
export function storyHero(female: boolean, face: HeroLook["face"] = undefined): HeroLook {
    return { look: female ? "meGirl" : "meBoy", face };
}
