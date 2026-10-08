"use client";

import { useState } from "react";
import GameContainer from "@/app/dashboard/child/[id]/GameContainer";
import { SoundToggle } from "@/app/components/ui/SoundToggle";

export default function DevGames() {
    const [gender, setGender] = useState<"male" | "female">("male");
    return (
        <main className="mx-auto min-h-dvh max-w-6xl bg-canvas px-4 py-6 sm:px-6">
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-800">
                <span>Probni režim: bez čuvanja, svi nivoi otključani.</span>
                <label className="ml-auto flex items-center gap-2">
                    Obraćanje:
                    <select value={gender} onChange={(e) => setGender(e.target.value as "male" | "female")} className="rounded-lg border border-brand-200 bg-white px-2 py-1">
                        <option value="male">dečak</option>
                        <option value="female">devojčica</option>
                    </select>
                </label>
                <SoundToggle />
            </div>
            <GameContainer childId={0} childName="Test" gender={gender} preview />
        </main>
    );
}
