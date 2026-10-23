// Kartice za pregled slika (/dev/scenes): po jedna kartica za svaki zadatak, i deo „kit” sa
// svim pozadinama, likovima i predmetima.
import type { ReactNode } from "react";
import { allScenarios, EMOTIONS } from "@/app/components/games/data/emotionScenarios";
import { emotionScene } from "@/app/components/games/data/emotionScenes";
import { emotionHero } from "@/app/components/games/scene/heroes";
import { SceneArt } from "@/app/components/games/scene/SceneArt";
import {
    ADULT_IDS,
    BACKGROUND_IDS,
    LOOK_IDS,
    POSE_IDS,
    PROP_IDS,
    VIEW_IDS,
    hero,
    scene,
    thing,
    who,
    type Face,
} from "@/app/components/games/scene/types";

export const GALLERY_PARTS = [
    { id: "emotions", label: "Emocije" },
    { id: "social", label: "Šta reći?" },
    { id: "stories", label: "Socijalne priče" },
    { id: "uses", label: "Čemu služi?" },
    { id: "kit", label: "Delovi" },
] as const;
export type GalleryPartId = (typeof GALLERY_PARTS)[number]["id"];

interface Card {
    key: string;
    label: string;
    text: string;
    sub?: string;
    picture: ReactNode;
    /** Druga slika uz prvu (npr. otkriveno lice) */
    extra?: ReactNode;
}

interface Part {
    title: string;
    note?: string;
    cards: Card[];
}

const FACES: Face[] = ["calm", "talk", "sleep", "happy", "sad", "angry", "scared", "surprised", "proud"];

function kitPart(): Part {
    const cards: Card[] = [];
    for (const bg of BACKGROUND_IDS) {
        cards.push({ key: `bg-${bg}`, label: "Pozadina", text: bg, picture: <SceneArt spec={scene(bg, [])} /> });
    }
    for (const view of VIEW_IDS) {
        cards.push({ key: `view-${view}`, label: "Pogled", text: view, picture: <SceneArt spec={scene("room", [], view)} />, extra: <SceneArt spec={scene("park", [], view)} /> });
    }
    for (const look of LOOK_IDS) {
        cards.push({
            key: `look-${look}`,
            label: "Dete",
            text: look,
            picture: <SceneArt spec={scene("plain", [who(look, 40, { face: "happy" }), who(look, 100, { pose: "wave", face: "talk" }), who(look, 160, { back: true }), who(look, 210, { pose: "sit", face: "sad" })])} />,
        });
    }
    for (const adult of ADULT_IDS) {
        cards.push({
            key: `adult-${adult}`,
            label: "Odrasli",
            text: adult,
            picture: <SceneArt spec={scene("plain", [who(adult, 60, { face: "calm" }), who(adult, 130, { pose: "wave", face: "talk" }), who(adult, 195, { back: true })])} />,
        });
    }
    cards.push({
        key: "faces",
        label: "Lica",
        text: FACES.join(", "),
        picture: <SceneArt spec={scene("plain", FACES.map((face, i) => who("lejla", 16 + i * 26, { face, s: 0.8 })))} />,
    });
    for (let i = 0; i < POSE_IDS.length; i += 5) {
        const poses = POSE_IDS.slice(i, i + 5);
        cards.push({
            key: `poses-${i}`,
            label: "Položaji",
            text: poses.join(", "),
            picture: <SceneArt spec={scene("plain", poses.map((pose, j) => hero(26 + j * 46, { pose, face: "happy", y: pose === "lie" || pose === "swim" ? 120 : 148 })))} />,
        });
    }
    for (let i = 0; i < PROP_IDS.length; i += 6) {
        const props = PROP_IDS.slice(i, i + 6);
        cards.push({
            key: `props-${i}`,
            label: "Predmeti",
            text: props.join(", "),
            picture: <SceneArt spec={scene("plain", props.map((prop, j) => thing(prop, 22 + (j % 3) * 98, j < 3 ? 70 : 145, { s: 0.9 })))} />,
        });
    }
    return { title: "Delovi slika", note: "Sve pozadine, likovi, izrazi, položaji i predmeti iz kompleta.", cards };
}

function Missing({ text }: { text: string }) {
    return <div className="grid aspect-[3/2] place-items-center rounded-xl bg-rose-50 text-4xl">{text}</div>;
}

function emotionsPart(): Part {
    const cards = allScenarios().map((scenario): Card => {
        const spec = emotionScene(scenario.id);
        const hidden = emotionHero(scenario, false);
        return {
            key: `emotion-${scenario.id}`,
            label: `${scenario.id} · nivo ${scenario.tier === 1 ? "1–5" : scenario.tier === 2 ? "6–10" : "11–15"} · ${scenario.common.map((e) => EMOTIONS[e].label).join(", ")}`,
            text: scenario.text,
            sub: hidden.back ? "Levo: kako dete vidi sliku. Desno: lice uz pomoć ili posle tačnog odgovora." : "Lice pokazuje tačno osećanje.",
            picture: spec ? <SceneArt spec={spec} hero={hidden} /> : <Missing text={scenario.scene} />,
            extra: spec && hidden.back ? <SceneArt spec={spec} hero={emotionHero(scenario, true)} /> : undefined,
        };
    });
    return { title: "Emocije", note: "Na lakim nivoima lik pokazuje tačno osećanje; na srednjim i teškim je okrenut leđima dok dete ne dobije pomoć.", cards };
}

export function galleryPart(id: GalleryPartId): Part {
    switch (id) {
        case "emotions":
            return emotionsPart();
        default:
            return kitPart();
    }
}
