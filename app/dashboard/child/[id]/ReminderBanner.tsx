"use client";

// Blag dnevni podsetnik na početnom ekranu deteta (lib/reminder.ts): posle vremena koje je
// roditelj izabrao, ako dete danas još nije igralo — „Vreme je za igru sa drugarom!”, uz
// lice drugara. Bez zvuka, bez treptanja i bez odbrojavanja; nestaje čim dete otvori igru
// ili dodirne „Hajde!”. Prvi prikaz računa server (isto vreme kao na serveru, bez skoka),
// a zatim se proverava jednom u minuti, da se pojavi i kad je ekran otvoren od ranije.
import { useEffect, useState } from "react";
import CompanionPicture from "@/app/components/avatar3d/CompanionPicture";
import { Button } from "@/app/components/ui/Button";
import type { ReminderSettings } from "@/lib/childSettings";
import { reminderDue } from "@/lib/reminder";
import { chosenSkin, useCompanion } from "./companionState";

interface Props {
    reminder: ReminderSettings;
    playedToday: boolean;
    /** Da li je podsetnik bio na redu kad je server pravio stranicu */
    initialDue: boolean;
    /** Igra je otvorena — dete je poslušalo podsetnik */
    gameOpen: boolean;
    showCompanion: boolean;
}

export default function ReminderBanner({ reminder, playedToday, initialDue, gameOpen, showCompanion }: Props) {
    const companion = useCompanion();
    const [due, setDue] = useState(initialDue);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!reminder.enabled || playedToday) return;
        const timer = setInterval(() => setDue(reminderDue(reminder, playedToday, new Date())), 60_000);
        return () => clearInterval(timer);
    }, [reminder, playedToday]);

    // Kad dete otvori igru, podsetnik je ispunio svrhu i ne vraća se do sledećeg dana
    const [seenGame, setSeenGame] = useState(false);
    if (gameOpen && !seenGame) setSeenGame(true);

    if (!due || dismissed || seenGame || playedToday) return null;

    return (
        <section role="status" aria-label="Podsetnik" className="flex items-center gap-4 rounded-card border-2 border-brand-200 bg-brand-50 p-4 shadow-soft sm:p-5">
            {showCompanion && companion ? (
                <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#EEF0F3] sm:h-24 sm:w-24">
                    <CompanionPicture kind={companion.kind} skin={chosenSkin(companion)} wear={companion.wear} variant="face" emotion="happy" className="h-full w-full" alt="" />
                </span>
            ) : (
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-surface text-4xl" aria-hidden="true">
                    🧸
                </span>
            )}
            <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-extrabold leading-tight text-ink sm:text-2xl">Vreme je za igru sa drugarom!</p>
                <p className="mt-0.5 text-base font-semibold text-ink-soft">Izaberi igru ispod.</p>
            </div>
            <Button chunky size="lg" onClick={() => setDismissed(true)} className="shrink-0">
                Hajde!
            </Button>
        </section>
    );
}
