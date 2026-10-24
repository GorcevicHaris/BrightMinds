// Izbor kao slika: crtež iz kompleta slika (dete radi ili kaže baš to) i kratak natpis ispod.
// Koriste ga „Šta reći?” i „Socijalne priče”; dete koje ne čita bira po slici.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { optionPicture } from "./data/optionPictures";
import { storyHero } from "./scene/heroes";
import { SceneArt } from "./scene/SceneArt";

/** Kolone mreže izbora: dva ili tri izbora uvek u jednom redu */
export const OPTION_GRID: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
};

interface OptionPictureProps {
    /** Tekst izbora onako kako piše u sadržaju (po njemu se traži slika) */
    text: string;
    /** Natpis ispod slike (već prilagođen polu deteta) */
    label: string;
    /** Rezervni emodži ako slike nema */
    emoji: string;
    female: boolean;
    /** Ruka za pokazni zadatak i slično */
    children?: ReactNode;
}

/** Sadržaj kartice izbora: slika preko cele širine i natpis ispod */
export function OptionPicture({ text, label, emoji, female, children }: OptionPictureProps) {
    const picture = optionPicture(text);
    return (
        <span className="flex h-full w-full flex-col items-stretch gap-1.5">
            {picture ? (
                // Kvadratna sličica: lik je krupniji nego u okviru 3 : 2 (višak pozadine sa strane se odseca)
                <span aria-hidden="true" className="mx-auto block aspect-square w-full max-w-[min(100%,18dvh)] overflow-hidden rounded-xl bg-surface ring-1 ring-black/5">
                    <SceneArt spec={picture} hero={storyHero(female)} fill className="h-full w-full" />
                </span>
            ) : (
                <span aria-hidden="true" className="mx-auto grid aspect-square w-full max-w-[min(100%,18dvh)] place-items-center rounded-xl bg-brand-50 text-4xl leading-none">
                    {emoji}
                </span>
            )}
            <span className={cn("flex flex-1 items-center justify-center px-0.5 text-center text-sm leading-tight sm:text-base")}>{label}</span>
            {children}
        </span>
    );
}
