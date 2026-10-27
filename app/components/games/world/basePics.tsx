// Zajedničke slike za igre o svetu oko nas: postojeći crteži iz drugih igara, po ključu
// „p:<slika>” (pictures/, npr. „p:ball”) i „a:<životinja>” (životinje iz igre „Šta jede?”,
// npr. „a:penguin”). Dete prepoznaje iste stvari i iste životinje u svim igrama.

import type { ReactNode } from "react";
import { ANIMAL_ART } from "@/app/components/games/food/animals";
import { PICTURES, isPictureId } from "@/app/components/games/pictures";
import { ANIMAL_IDS, type AnimalId } from "@/app/components/games/data/foodItems";

function isAnimal(id: string): id is AnimalId {
    return (ANIMAL_IDS as readonly string[]).includes(id);
}

/** Da li ključ pokazuje na postojeću sliku */
export function hasBasePic(pic: string): boolean {
    if (pic.startsWith("p:")) return isPictureId(pic.slice(2));
    if (pic.startsWith("a:")) return isAnimal(pic.slice(2));
    return false;
}

/** Postojeća slika u kvadratu x, y, size (u koordinatama 100 × 100), ili null */
export function basePic(pic: string, x = 0, y = 0, size = 100): ReactNode {
    if (pic.startsWith("p:")) {
        const id = pic.slice(2);
        if (!isPictureId(id)) return null;
        const art = PICTURES[id];
        return (
            <svg x={x} y={y} width={size} height={size} viewBox={art.view}>
                {art.draw()}
            </svg>
        );
    }
    if (pic.startsWith("a:")) {
        const id = pic.slice(2);
        if (!isAnimal(id)) return null;
        return (
            <svg x={x} y={y} width={size} height={size} viewBox="0 0 100 100">
                {ANIMAL_ART[id].draw(false)}
            </svg>
        );
    }
    return null;
}

/** Slika kao samostalan SVG (kartica) */
export function BasePic({ pic, className }: { pic: string; className?: string }) {
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            {basePic(pic, 4, 4, 92)}
        </svg>
    );
}
