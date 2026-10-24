"use client";

// Sledeća zaključana igra uz „Otključavanje redom” (lib/gameAccess.ts). Detetu se pokazuje
// samo JEDNA — ona koja se sledeća otvara — sa katancem i ikonicom igre koju treba završiti:
// „Završi 🔷 Pogodi oblik da otključaš”. Tri tačkice pokazuju koliko je od tri nivoa
// već urađeno, da i dete koje ne čita vidi koliko je ostalo. Ništa ne treperi i ne pišti.
import { useEffect, useState } from "react";
import Image from "next/image";
import { Lock } from "lucide-react";
import { GAMES, MAX_LEVEL, sortGamesForChild } from "@/lib/games";
import { nextLockedGame, UNLOCK_AFTER_LEVEL, type GameProgress } from "@/lib/gameAccess";
import type { ResolvedSettings } from "@/lib/childSettings";
import { cn } from "@/lib/cn";

interface Props {
    childId: number;
    settings: ResolvedSettings;
    /** Igra je otvorena preko cele strane — po zatvaranju se napredak čita ponovo */
    gameOpen: boolean;
    preview?: boolean;
    previewUnlocked?: number;
}

function useProgress(childId: number, settings: ResolvedSettings, enabled: boolean, gameOpen: boolean, preview: boolean, previewUnlocked: number | undefined): GameProgress | null {
    const [progress, setProgress] = useState<GameProgress | null>(null);
    useEffect(() => {
        if (!enabled || preview || gameOpen) return;
        const controller = new AbortController();
        fetch(`/api/children/${childId}/unlocked-levels`, { cache: "no-store", signal: controller.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.unlockedLevels) setProgress(data.unlockedLevels as GameProgress);
            })
            .catch(() => undefined);
        return () => controller.abort();
    }, [childId, enabled, preview, gameOpen]);

    if (preview) {
        const level = Math.min(Math.max(previewUnlocked ?? 1, 1), MAX_LEVEL + 1);
        // Probni prikaz: prva igra po redu za dete je stigla do `unlocked`, ostale nisu ni počete
        const first = sortGamesForChild(GAMES, settings.playAge)[0];
        return Object.fromEntries(GAMES.map((game) => [game.id, game.id === first.id ? level : 1]));
    }
    return progress;
}

export default function LockedGameHint({ childId, settings, gameOpen, preview = false, previewUnlocked }: Props) {
    // Sa planom „prvo–zatim” dete igra ono što je roditelj izabrao; ovde se ne nudi ništa drugo
    const enabled = settings.unlockInOrder && settings.plan.length === 0;
    const progress = useProgress(childId, settings, enabled, gameOpen, preview, previewUnlocked);
    if (!enabled || !progress) return null;

    const next = nextLockedGame(settings, progress, GAMES);
    if (!next) return null;
    const { game, after } = next;
    const done = Math.min(Math.max((progress[after.id] ?? 1) - 1, 0), UNLOCK_AFTER_LEVEL);

    return (
        <section aria-labelledby="locked-game-heading" className="space-y-3">
            <h2 id="locked-game-heading" className="text-lg font-extrabold text-ink-soft sm:text-xl">
                Sledeća igra
            </h2>
            <div className="flex max-w-xl items-center gap-4 rounded-card border-2 border-dashed border-line bg-surface p-4 shadow-soft">
                <span className="relative block aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-2xl bg-brand-50 sm:w-36">
                    <Image src={game.image} alt="" fill sizes="144px" className="object-cover opacity-50 grayscale" />
                    <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-soft">
                            <Lock className="h-5 w-5" />
                        </span>
                    </span>
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-extrabold text-ink sm:text-xl">
                        <span className="sr-only">Zaključano: </span>
                        {game.title}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-base font-bold text-ink-soft">
                        <span>Završi</span>
                        <span className={cn("inline-grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-lg", after.accent.gradient)} aria-hidden="true">
                            {after.icon}
                        </span>
                        <span className="font-extrabold text-ink">{after.title}</span>
                        <span>da otključaš.</span>
                    </p>
                    <p className="mt-2 flex items-center gap-1.5" aria-label={`Urađeno ${done} od ${UNLOCK_AFTER_LEVEL} nivoa`}>
                        {Array.from({ length: UNLOCK_AFTER_LEVEL }, (_, index) => (
                            <span
                                key={index}
                                className={cn("h-3 w-3 rounded-full", index < done ? after.accent.solid : "bg-brand-100")}
                                aria-hidden="true"
                            />
                        ))}
                    </p>
                </div>
            </div>
        </section>
    );
}
