"use client";

import type { ReactNode } from "react";
import { oppositePics } from "@/app/components/games/data/oppositesLevels";
import { SYLLABLE_WORDS } from "@/app/components/games/data/syllablesLevels";
import { jobPics } from "@/app/components/games/data/jobsLevels";
import { habitatPics } from "@/app/components/games/data/habitatsLevels";
import { HabitatPic } from "@/app/components/games/habitats/HabitatsArt";
import { seasonPics } from "@/app/components/games/data/seasonsLevels";
import { SeasonPic } from "@/app/components/games/seasons/SeasonsArt";
import { bodyPics } from "@/app/components/games/data/bodyLevels";
import { BodyPic } from "@/app/components/games/body/BodyArt";
import { trafficPics } from "@/app/components/games/data/trafficLevels";
import { TrafficPic } from "@/app/components/games/traffic/TrafficArt";
import { OppositePic } from "@/app/components/games/opposites/OppositesArt";
import { JobPic } from "@/app/components/games/jobs/JobsArt";
import { BasePic } from "@/app/components/games/world/basePics";

const GAMES: Record<string, { pics: () => string[]; draw: (pic: string, className: string) => ReactNode }> = {
    opposites: { pics: oppositePics, draw: (pic, className) => <OppositePic pic={pic} className={className} /> },
    syllables: { pics: () => SYLLABLE_WORDS.map((w) => w.pic), draw: (pic, className) => <BasePic pic={pic} className={className} /> },
    jobs: { pics: jobPics, draw: (pic, className) => <JobPic pic={pic} className={className} /> },
    habitats: { pics: habitatPics, draw: (pic, className) => <HabitatPic pic={pic} className={className} /> },
    seasons: { pics: seasonPics, draw: (pic, className) => <SeasonPic pic={pic} className={className} /> },
    body: { pics: bodyPics, draw: (pic, className) => <BodyPic pic={pic} className={className} /> },
    traffic: { pics: trafficPics, draw: (pic, className) => <TrafficPic pic={pic} className={className} /> },
};

export default function SvetGallery({ game }: { game: string }) {
    const entry = GAMES[game] ?? GAMES.opposites;
    const pics = entry.pics();
    return (
        <main className="min-h-dvh bg-canvas p-2">
            <h1 className="font-display text-xl font-extrabold text-ink">
                {game} ({pics.length})
            </h1>
            <ul className="mt-2 grid grid-cols-8 gap-1.5">
                {pics.map((pic) => (
                    <li key={pic} className="flex flex-col items-center rounded-lg bg-white p-1 ring-1 ring-line">
                        <div className="flex items-end gap-1">
                            {entry.draw(pic, "h-28 w-28")}
                            {entry.draw(pic, "h-8 w-8")}
                        </div>
                        <span className="text-[11px] font-bold">{pic}</span>
                    </li>
                ))}
            </ul>
        </main>
    );
}
