"use client";

import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import { useMuted } from "@/lib/sound";
import { stopSpeaking } from "@/lib/speech";

/** Dugme za uključivanje/isključivanje svih zvukova u aplikaciji. */
export function SoundToggle({ className }: { className?: string }) {
    const [muted, toggle] = useMuted();
    return (
        <button
            type="button"
            onClick={() => {
                if (!muted) stopSpeaking();
                toggle();
            }}
            aria-pressed={muted}
            aria-label={muted ? "Uključi zvuk" : "Isključi zvuk"}
            title={muted ? "Uključi zvuk" : "Isključi zvuk"}
            className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 transition-colors",
                muted ? "border-sun-300 bg-sun-50 text-sun-700" : "border-line bg-surface text-ink-soft hover:bg-brand-50 hover:text-ink",
                className
            )}
        >
            {muted ? <VolumeX className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
        </button>
    );
}
