// Slike za igru „Prve reči”: svaka reč ima sliku iz kompleta koji već postoji (predmeti iz igre
// „Šta fali?”, hrana i životinje iz igre „Šta jede?”, likovi iz slika situacija), a rečenice su
// male slike situacija (dete iz igre drži, radi ili nosi baš ono što piše u rečenici).

import { optionScene } from "@/app/components/games/data/optionPictures";
import type { AnimalId, FoodId } from "@/app/components/games/data/foodItems";
import type { ThingId } from "@/app/components/games/data/missingItems";
import { getSentence, type Sentence, type WordPic } from "@/app/components/games/data/wordsItems";
import { AnimalPicture, ANIMAL_ART } from "@/app/components/games/food/animals";
import { FoodPicture, FOOD_ART } from "@/app/components/games/food/foods";
import { THING_ART, ThingPicture } from "@/app/components/games/missing/things";
import { Figure, headCenter } from "@/app/components/games/scene/figures";
import { SceneArt } from "@/app/components/games/scene/SceneArt";
import { ADULT_IDS, LOOK_IDS, type AdultId, type LookId, type SceneSpec } from "@/app/components/games/scene/types";

function split(pic: WordPic): [string, string] {
    const at = pic.indexOf(":");
    return [pic.slice(0, at), pic.slice(at + 1)];
}

const isPerson = (id: string): id is AdultId | LookId => (ADULT_IDS as readonly string[]).includes(id) || (LOOK_IDS as readonly string[]).includes(id);

/** Portret člana porodice: glava i ramena, na mekoj okrugloj podlozi (kao slike predmeta) */
export function PersonPicture({ id, className }: { id: AdultId | LookId; className?: string }) {
    const [, y] = headCenter(id);
    // Glava je u gornjoj trećini kadra; beba je manja, pa je i kadar manji
    const size = id === "baby" ? 46 : 82;
    const top = y - size * 0.42;
    return (
        <svg viewBox={`${-size / 2} ${top} ${size} ${size}`} className={className} aria-hidden="true" focusable="false">
            <circle cx={0} cy={top + size * 0.5} r={size * 0.47} fill="#f4f1ff" />
            <Figure id={id} face="happy" />
        </svg>
    );
}

/** Da li slika reči postoji (test i provera stanja) */
export function hasWordPicture(pic: WordPic): boolean {
    const [kind, id] = split(pic);
    if (kind === "thing") return Object.hasOwn(THING_ART, id);
    if (kind === "food") return Object.hasOwn(FOOD_ART, id);
    if (kind === "animal") return Object.hasOwn(ANIMAL_ART, id);
    if (kind === "person") return isPerson(id);
    return false;
}

/** Slika reči u kvadratu */
export function WordPicture({ pic, className }: { pic: WordPic; className?: string }) {
    const [kind, id] = split(pic);
    if (kind === "thing" && Object.hasOwn(THING_ART, id)) return <ThingPicture id={id as ThingId} className={className} />;
    if (kind === "food" && Object.hasOwn(FOOD_ART, id)) return <FoodPicture id={id as FoodId} className={className} />;
    if (kind === "animal" && Object.hasOwn(ANIMAL_ART, id)) return <AnimalPicture id={id as AnimalId} className={className} />;
    if (kind === "person" && isPerson(id)) return <PersonPicture id={id} className={className} />;
    return null;
}

/** Slika rečenice (opis iz wordsItems.ts → slika situacije) */
export function sentenceScene(sentence: Sentence): SceneSpec {
    const { pic } = sentence;
    if (pic.none) return optionScene({ none: true, bg: "park", v: pic.v, props: pic.sun ? ["sun"] : [] });
    return optionScene({
        p: pic.p,
        h: pic.h,
        hs: pic.h === "apple" ? 0.7 : pic.h === "glass" ? 0.95 : pic.h === "balloon" ? 0.62 : 0.9,
        w: pic.w,
        f: "happy",
        bg: "park",
        props: pic.bench ? ["bench"] : undefined,
    });
}

export function SentencePicture({ id, className }: { id: string; className?: string }) {
    const sentence = getSentence(id);
    if (!sentence) return null;
    return <SceneArt spec={sentenceScene(sentence)} hero={{ look: sentence.pic.who ?? "amar" }} fill className={className} />;
}
