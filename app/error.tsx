"use client";

import { useEffect } from "react";
import { Button } from "./components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="grid min-h-dvh place-items-center bg-canvas p-4">
            <div className="w-full max-w-md rounded-card border border-line bg-surface p-8 text-center shadow-soft">
                <p className="text-6xl" aria-hidden="true">🛠️</p>
                <h1 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">Nešto je pošlo naopako</h1>
                <p className="mt-2 text-base font-semibold text-ink-soft">Ništa strašno — probajmo još jednom.</p>
                <Button size="lg" className="mt-6" onClick={reset}>
                    Pokušaj ponovo
                </Button>
            </div>
        </main>
    );
}
