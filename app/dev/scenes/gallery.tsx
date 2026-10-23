// Kartice za pregled slika (/dev/scenes): po jedna kartica za svaki zadatak, i deo „kit” sa
// svim pozadinama, likovima i predmetima.
import type { ReactNode } from "react";
import { allScenarios, EMOTIONS } from "@/app/components/games/data/emotionScenarios";
import { emotionScene } from "@/app/components/games/data/emotionScenes";
import { socialScene } from "@/app/components/games/data/socialScenes";
import { storyForLevel } from "@/app/components/games/data/socialStories";
import { storyScene } from "@/app/components/games/data/storyScenes";
import { buildGazeLevel, gazeAnswer, gazeQuestion } from "@/app/components/games/data/gazeRounds";
import { gazeScene } from "@/app/components/games/data/gazeScenes";
import { USE_ITEMS } from "@/app/components/games/data/usesItems";
import { usesScene } from "@/app/components/games/data/usesScenes";
import { FIGURES, PLACE_OBJECTS, placeSentence } from "@/app/components/games/data/whereScenes";
import { WhereScene } from "@/app/components/games/WhereScene";
import { getSituationsForLevel, type SocialSituation } from "@/app/components/games/data/socialSituations";
import { emotionHero, storyHero } from "@/app/components/games/scene/heroes";
import { genderText } from "@/app/components/games/kit/utils";
import { SceneArt } from "@/app/components/games/scene/SceneArt";
import {
    ACTION_FACES,
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
    { id: "gaze", label: "Šta gleda?" },
    { id: "where", label: "Gde je?" },
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
const MORE_FACES: Face[] = ["neutral", "worried", "firm", "tired", ...ACTION_FACES];

/** Radnje iz tekstova: položaj, predmet u ruci i izraz zajedno, kako ih slike koriste */
const ACTIONS: { text: string; spec: ReturnType<typeof scene> }[] = [
    {
        text: "liže sladoled, jede kolač, pije vodu, pere zube",
        spec: scene("plain", [
            hero(30, { pose: "eat", face: "lick", hold: { prop: "iceCream", s: 0.7 } }),
            hero(90, { pose: "eat", face: "chew", hold: { prop: "cookie", s: 0.6 } }),
            hero(150, { pose: "drink", hold: { prop: "glass", s: 0.6, rot: -30 } }),
            hero(210, { pose: "brush", hold: { prop: "toothbrush", s: 0.6, rot: -60 } }),
        ]),
    },
    {
        text: "pao je i drži koleno, sedi na podu, vezuje pertle, plače",
        spec: scene("plain", [
            hero(30, { pose: "knee", face: "pain", wear: ["plaster"] }),
            hero(100, { pose: "floor", face: "calm" }),
            hero(160, { pose: "sitTie", face: "calm" }),
            hero(215, { face: "cry" }),
        ]),
    },
    {
        text: "trči, šutira loptu, baca grudvu, pere ruke",
        spec: scene("plain", [
            hero(30, { pose: "run", face: "happy" }),
            hero(90, { pose: "kick", face: "happy" }),
            thing("ball", 116, 128),
            hero(160, { pose: "throw", face: "happy", hold: { prop: "snowball", s: 0.8 } }),
            hero(215, { pose: "wash", face: "calm" }),
        ]),
    },
    {
        text: "grli, drži se za ruke, mazi macu, daje i prima",
        spec: scene("plain", [
            who("mama", 24, { pose: "embrace", face: "happy" }),
            who("amina", 50, { flip: true, pose: "embrace", face: "happy" }),
            who("haris", 96, { pose: "holdHand", face: "happy" }),
            who("lejla", 124, { pose: "holdHand", face: "happy", flip: true }),
            who("tarik", 170, { pose: "pet", face: "happy" }),
            thing("cat", 198, 148, { flip: true }),
        ]),
    },
    {
        text: "crta za stolom, jede za stolom, crta stojeći, uzima",
        spec: scene("plain", [
            hero(40, { pose: "sitDraw", y: 140, hold: { prop: "pencil", s: 0.7, rot: 150 } }),
            thing("table", 62, 150, { s: 0.6 }),
            hero(120, { pose: "sitEat", y: 140, face: "chew", hold: { prop: "sandwich", s: 0.6 } }),
            hero(200, { pose: "take", hold: { prop: "gift", hand: "both", s: 0.7 } }),
        ]),
    },
    {
        text: "spušta se niz tobogan, ljulja se, zaliva cveće, duva",
        spec: scene("plain", [
            thing("slide", 50, 148),
            hero(56, { pose: "sitHold", y: 120, rot: 38, s: 0.8 }),
            thing("swing", 130, 148),
            hero(130, { pose: "sitHold", y: 128, s: 0.8 }),
            hero(190, { pose: "give", hold: { prop: "wateringCan", s: 0.8 } }),
            hero(228, { face: "blow", s: 0.8 }),
        ]),
    },
];

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
    // Pogled: pravo (podrazumevano), glava i oči, samo oči, i tačkice pomoći
    cards.push({
        key: "gaze",
        label: "Pogled",
        text: "pravo, glava i oči levo-gore, samo oči desno-dole, tačkice",
        picture: (
            <SceneArt
                spec={scene("plain", [
                    who("amina", 40, { face: "calm" }),
                    who("haris", 100, { gaze: { x: 60, y: 40 } }),
                    who("selma", 160, { gaze: { x: 230, y: 150, head: 0 } }),
                    who("emir", 215, { gaze: { x: 180, y: 20, line: true, ring: 10 } }),
                ])}
            />
        ),
    });
    cards.push({
        key: "faces",
        label: "Lica",
        text: FACES.join(", "),
        picture: <SceneArt spec={scene("plain", FACES.map((face, i) => who("lejla", 16 + i * 26, { face, s: 0.8 })))} />,
    });
    cards.push({
        key: "faces-more",
        label: "Lica uz situaciju i radnju",
        text: MORE_FACES.join(", "),
        picture: <SceneArt spec={{ ...scene("plain", MORE_FACES.map((face, i) => who("haris", 12 + i * 18.5, { face, s: 0.6 }))), camera: "fixed" }} />,
    });
    ACTIONS.forEach((action, i) => cards.push({ key: `actions-${i}`, label: "Radnje", text: action.text, picture: <SceneArt spec={action.spec} /> }));
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

/** Situacije svih nivoa, bez ponavljanja (situacije 1–15 se ponavljaju na tri težine) */
function uniqueSituations(): SocialSituation[] {
    const seen = new Map<number, SocialSituation>();
    for (let level = 1; level <= 15; level += 1) for (const situation of getSituationsForLevel(level)) seen.set(situation.id, situation);
    return [...seen.values()].sort((a, b) => a.id - b.id);
}

function socialPart(): Part {
    const cards = uniqueSituations()
        .filter((situation) => situation.id <= 15 || situation.id > 45)
        .map((situation): Card => {
            const picture = socialScene(situation.id);
            return {
                key: `social-${situation.id}`,
                label: `${situation.id}${situation.id <= 15 ? ` (i ${situation.id + 15}, ${situation.id + 30})` : ""} · ${situation.kind === "polite" ? "učtivost" : "zastupanje sebe"}`,
                text: genderText(situation.model, false),
                sub: genderText(situation.text, false),
                picture: picture ? <SceneArt spec={picture.scene} hero={{ look: picture.hero }} /> : <Missing text={situation.scene} />,
            };
        });
    return { title: "Šta reći?", note: "Slika prikazuje primer: dete iz primera u toj situaciji (oblačić kad govori). Situacije 1–15 imaju istu sliku na sve tri težine.", cards };
}

function storiesPart(): Part {
    const cards: Card[] = [];
    for (let level = 1; level <= 15; level += 1) {
        const story = storyForLevel(level);
        // Priče su u prvom licu: glavni lik je dete koje igra (ovde naizmenično dečak i devojčica)
        const female = level % 2 === 0;
        const pages: { key: string; label: string; text: string; spec: ReturnType<typeof storyScene>; emoji: string }[] = [
            { key: "cover", label: "naslovna", text: story.intro, spec: storyScene(level, "cover"), emoji: story.cover.join("") },
            ...story.steps.map((step, i) => ({ key: String(i), label: `korak ${i + 1}`, text: step.text, spec: storyScene(level, i), emoji: step.scene.join("") })),
        ];
        for (const page of pages) {
            cards.push({
                key: `story-${level}-${page.key}`,
                label: `Nivo ${level} · ${story.title} · ${page.label}`,
                text: genderText(page.text, female),
                sub: story.steps[Number(page.key)]?.decision ? genderText(story.steps[Number(page.key)].decision!.question, female) : undefined,
                picture: page.spec ? <SceneArt spec={page.spec} hero={storyHero(female)} /> : <Missing text={page.emoji} />,
            });
        }
    }
    return { title: "Socijalne priče", note: "Naslovna slika i po jedna slika za svaku stranicu. Slika ne pokazuje odgovor na pitanje sa stranice.", cards };
}

const GROUP_LABEL = { home: "kuća", body: "telo", things: "stvari", animals: "životinje", world: "priroda i prevoz" } as const;

function usesPart(): Part {
    const cards = USE_ITEMS.map((item): Card => {
        const spec = usesScene(item.id);
        return {
            key: `uses-${item.id}`,
            label: `${item.id} · ${GROUP_LABEL[item.group]}`,
            text: item.question,
            sub: `Odgovor (nije na slici): ${item.name}`,
            picture: spec ? <SceneArt spec={spec} hero={storyHero(true)} /> : <Missing text="?" />,
        };
    });
    return { title: "Čemu služi?", note: "Slika pokazuje situaciju iz pitanja, ne odgovor; nema ni drugih predmeta iz iste grupe.", cards };
}

/** Stalan niz „slučajnih” brojeva, da galerija uvek pokazuje iste zadatke */
function seeded(seed: number) {
    let x = seed;
    return () => {
        x = (x * 1103515245 + 12345) % 2 ** 31;
        return x / 2 ** 31;
    };
}

function gazePart(): Part {
    const cards: Card[] = [];
    for (let level = 1; level <= 15; level += 1) {
        const rounds = buildGazeLevel(level, { maxChoices: 4, maxRounds: 8, random: seeded(level * 7) }).slice(0, level === 15 ? 3 : 1);
        rounds.forEach((round, i) => {
            const spec = gazeScene(round, false);
            const hinted = gazeScene(round, true);
            cards.push({
                key: `gaze-${level}-${i}`,
                label: `Nivo ${level} · ${round.kind} · ${round.cue} · ${round.objects.length} predm.`,
                text: gazeQuestion(round),
                sub: `Odgovor: ${gazeAnswer(round)} Desno: pomoć (tačkice).`,
                picture: spec ? <SceneArt spec={spec} /> : <Missing text="?" />,
                extra: hinted ? <SceneArt spec={hinted} /> : undefined,
            });
        });
    }
    return { title: "Šta gleda?", note: "Po jedan zadatak sa svakog nivoa (sa 15. po jedan od svake vrste). Levo kako ga dete vidi, desno sa pomoći.", cards };
}

function wherePart(): Part {
    const cards: Card[] = [];
    PLACE_OBJECTS.forEach((object, i) => {
        for (const relation of object.relations) {
            const figure = FIGURES[(i + cards.length) % FIGURES.length];
            cards.push({
                key: `where-${object.id}-${relation}`,
                label: `${object.name} · ${relation}`,
                text: placeSentence(figure, relation, object),
                picture: <WhereScene figure={figure.id} object={object.id} relation={relation} className="block h-auto w-full rounded-xl bg-white" />,
            });
        }
    });
    return { title: "Gde je?", note: "Svaki predmet u svakom položaju koji ume da prikaže.", cards };
}

export function galleryPart(id: GalleryPartId): Part {
    switch (id) {
        case "where":
            return wherePart();
        case "gaze":
            return gazePart();
        case "uses":
            return usesPart();
        case "stories":
            return storiesPart();
        case "social":
            return socialPart();
        case "emotions":
            return emotionsPart();
        default:
            return kitPart();
    }
}
