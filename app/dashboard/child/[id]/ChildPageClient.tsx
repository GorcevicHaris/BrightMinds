// app/dashboard/child/[id]/ChildPageClient.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gamepad2, LogOut, Trophy } from "lucide-react";
import GameContainer from "./GameContainer";
import ProgressDashboard from "@/app/components/ProgressDashboard";
import { Button, buttonClasses } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { SoundToggle } from "@/app/components/ui/SoundToggle";
import { cn } from "@/lib/cn";
import { speak, stopSpeaking } from "@/lib/speech";
import type { ChildProfile } from "./page";

// Three.js radi samo u pregledaču
const Professor3D = dynamic(() => import("@/app/components/Professor3D"), { ssr: false });

type View = "games" | "progress";

interface Props {
    child: ChildProfile;
    /** Ko gleda stranicu: dete prijavljeno kodom ili roditelj iz svog panela */
    viewer: "child" | "parent";
}

const TABS: { id: View; label: string; Icon: typeof Gamepad2 }[] = [
    { id: "games", label: "Igre", Icon: Gamepad2 },
    { id: "progress", label: "Napredak", Icon: Trophy },
];

export default function ChildPageClient({ child, viewer }: Props) {
    const router = useRouter();
    const [view, setView] = useState<View>("games");
    const [points, setPoints] = useState(child.experience_points ?? 0);
    const [confirmExit, setConfirmExit] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const firstName = child.first_name || "Druže";
    const gender = child.gender ?? undefined;
    const isFemale = gender?.toLowerCase() === "female";
    const streak = child.streak ?? 0;
    const initials = `${child.first_name?.charAt(0) ?? ""}${child.last_name?.charAt(0) ?? ""}`.toUpperCase();

    // Pozdrav pri ulasku
    useEffect(() => {
        const timer = setTimeout(() => {
            void speak(`Zdravo ${firstName}! ${isFemale ? "Dobro došla" : "Dobro došao"} nazad!`, { gender });
        }, 1200);
        return () => {
            clearTimeout(timer);
            stopSpeaking();
        };
    }, [firstName, gender, isFemale]);

    useEffect(() => () => {
        if (leaveTimer.current) clearTimeout(leaveTimer.current);
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            router.replace("/login");
        }
    }, [router]);

    const handleConfirmExit = () => {
        setConfirmExit(false);
        setIsLeaving(true);
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            void logout();
        };
        // Ako govor potraje ili ne uspe, odjava se svakako dešava
        leaveTimer.current = setTimeout(finish, 4000);
        void speak(`Vidimo se uskoro! ${isFemale ? "Bila si odlična" : "Bio si odličan"} danas!`, { gender, onEnd: finish });
    };

    const exitControl =
        viewer === "parent" ? (
            <Link href="/dashboard" className={buttonClasses({ variant: "secondary", size: "md" })}>
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">Roditeljski panel</span>
                <span className="sm:hidden">Nazad</span>
            </Link>
        ) : (
            <Button variant="secondary" onClick={() => setConfirmExit(true)} disabled={isLeaving}>
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">{isLeaving ? "Odjavljujem…" : "Izađi"}</span>
                <span className="sr-only sm:hidden">Izađi</span>
            </Button>
        );

    return (
        <div className="min-h-dvh bg-canvas pb-24 md:pb-10">
            <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:h-18 sm:px-6 lg:px-8">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-base font-extrabold text-white" aria-hidden="true">
                        {initials || "🙂"}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg font-extrabold leading-tight text-ink sm:text-xl">{firstName}</p>
                        <p className="flex items-center gap-3 text-xs font-extrabold sm:text-sm">
                            <span className="text-sun-700" aria-label={`${points} poena`}>⭐ {points}</span>
                            {streak > 0 && (
                                <span className="text-orange-600" aria-label={`${streak} dana zaredom`}>🔥 {streak}</span>
                            )}
                        </p>
                    </div>

                    {/* Navigacija — tablet i desktop */}
                    <nav className="hidden items-center gap-1 rounded-2xl bg-canvas p-1 md:flex" aria-label="Glavna navigacija">
                        {TABS.map(({ id, label, Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setView(id)}
                                aria-current={view === id ? "page" : undefined}
                                className={cn(
                                    "inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-extrabold transition-colors",
                                    view === id ? "bg-surface text-brand-700 shadow-soft" : "text-ink-soft hover:text-ink"
                                )}
                            >
                                <Icon className="h-5 w-5" aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </nav>

                    <SoundToggle />
                    {exitControl}
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
                {view === "games" ? (
                    <div className="space-y-6 sm:space-y-8">
                        {/* Pozdrav + učitelj */}
                        <section className="relative overflow-hidden rounded-card bg-brand-600 text-white shadow-soft">
                            <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-500" aria-hidden="true" />
                            <div className="absolute -bottom-20 right-24 h-48 w-48 rounded-full bg-brand-700" aria-hidden="true" />
                            <div className="relative flex min-h-36 items-center sm:min-h-44">
                                <div className="flex-1 p-5 pr-2 sm:p-8">
                                    <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">Zdravo, {firstName}!</h1>
                                    <p className="mt-1 text-base font-semibold text-brand-100 sm:text-lg">Šta ćemo danas da igramo?</p>
                                    {streak > 1 && (
                                        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-extrabold">
                                            🔥 {streak} dana zaredom
                                        </p>
                                    )}
                                </div>
                                <Professor3D gender={gender} className="h-36 w-32 shrink-0 self-end sm:h-44 sm:w-48" />
                            </div>
                        </section>

                        <GameContainer childId={child.id} childName={firstName} gender={gender} onExperienceChange={setPoints} />
                    </div>
                ) : (
                    <div className="space-y-5 sm:space-y-6">
                        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Tvoj napredak</h1>
                        <ProgressDashboard childId={child.id} childName={firstName} audience={viewer} />
                    </div>
                )}
            </main>

            {/* Donja navigacija — telefon */}
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Glavna navigacija">
                <div className="mx-auto grid max-w-md grid-cols-2">
                    {TABS.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setView(id)}
                            aria-current={view === id ? "page" : undefined}
                            className={cn(
                                "relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-extrabold transition-colors",
                                view === id ? "text-brand-700" : "text-ink-faint"
                            )}
                        >
                            {view === id && <span className="absolute inset-x-8 top-0 h-1 rounded-b-full bg-brand-600" aria-hidden="true" />}
                            <Icon className="h-6 w-6" aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>
            </nav>

            <Modal open={confirmExit} onClose={() => setConfirmExit(false)} size="sm" title="Završavaš za danas?">
                <p className="text-base font-semibold text-ink-soft">Možeš da nastaviš igru ili da izađeš.</p>
                <div className="mt-5 flex flex-col gap-3">
                    <Button chunky size="xl" variant="success" block onClick={() => setConfirmExit(false)}>
                        Nastavi igru
                    </Button>
                    <Button size="lg" variant="secondary" block onClick={handleConfirmExit}>
                        Da, izlazim
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
