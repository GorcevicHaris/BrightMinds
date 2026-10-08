"use client";

import { useState } from "react";
import { ChildSettingsProvider } from "@/app/components/ChildSettingsProvider";
import CustomStoriesManager from "@/app/components/stories/CustomStoriesManager";
import CustomStoryShelf from "@/app/components/stories/CustomStoryShelf";
import { Button } from "@/app/components/ui/Button";
import type { ResolvedSettings } from "@/lib/childSettings";
import { STORY_TEMPLATES, type CustomStory } from "@/lib/customStories";

// Izmišljene priče: gotovi primeri kao da ih je odrasli već sačuvao
const SAMPLE_STORIES: CustomStory[] = STORY_TEMPLATES.map((template, index) => ({
    id: index + 1,
    ...template,
    updatedAt: null,
}));

interface Props {
    settings: ResolvedSettings;
    gender: string;
    /** Dete bez priča: polica ne prikazuje ništa */
    empty: boolean;
    managerOpen: boolean;
}

export default function DevStories({ settings, gender, empty, managerOpen }: Props) {
    const [showManager, setShowManager] = useState(managerOpen);
    const stories = empty ? [] : SAMPLE_STORIES;

    return (
        <div className="min-h-dvh bg-canvas">
            {/* Deo za odrasle (van dečjih podešavanja pisma i velikih slova) */}
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 pt-5 sm:px-6 lg:px-8">
                <p className="mr-auto text-sm font-semibold text-ink-soft">
                    Probni prikaz: podaci su u memoriji, ništa se ne čuva.
                    {empty && " Polica je prazna, pa se detetu ne prikazuje ništa."}
                </p>
                <Button variant="secondary" onClick={() => setShowManager(true)}>
                    Priče (prozor za odrasle)
                </Button>
            </div>

            <ChildSettingsProvider settings={settings}>
                <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
                    <CustomStoryShelf childId={0} gender={gender} initialStories={stories} offline />
                </main>
            </ChildSettingsProvider>

            {showManager && (
                <CustomStoriesManager childId={0} childName="Mila" onClose={() => setShowManager(false)} initialStories={stories} offline />
            )}
        </div>
    );
}
