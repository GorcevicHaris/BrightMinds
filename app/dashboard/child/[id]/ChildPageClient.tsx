// app/dashboard/child/[id]/ChildPageClient.tsx
"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gamepad2, LogOut, Play, Shirt, Trophy } from "lucide-react";
import GameContainer, { WatchedBadge } from "./GameContainer";
import { ChildSettingsProvider } from "@/app/components/ChildSettingsProvider";
import ProgressDashboard from "@/app/components/ProgressDashboard";
import CustomStoryShelf from "@/app/components/stories/CustomStoryShelf";
import { Button, buttonClasses } from "@/app/components/ui/Button";
import { Modal } from "@/app/components/ui/Modal";
import { SoundToggle } from "@/app/components/ui/SoundToggle";
import type { ResolvedSettings } from "@/lib/childSettings";
import { cn } from "@/lib/cn";
import { RealtimeTopicProvider, useWatcherPresence } from "@/lib/realtime";
import { speak, stopSpeaking } from "@/lib/speech";
import CompanionStage from "@/app/components/avatar3d/CompanionStage";
import CompanionRoom from "./CompanionRoom";
import { chosenSkin, CompanionProvider, useCompanion } from "./companionState";
import { GoalChip } from "./companionUi";
import LockedGameHint from "./LockedGameHint";
import ReminderBanner from "./ReminderBanner";
import type { ChildProfile } from "./page";

type View = "games" | "companion" | "progress";

interface Props {
    child: ChildProfile;
    /** Ko gleda stranicu: dete prijavljeno kodom ili roditelj iz svog panela */
    viewer: "child" | "parent";
    settings: ResolvedSettings;
    /** Tajna tema kanala za praćenje uživo (pravi je server); bez nje nema praćenja */
    realtimeTopic?: string | null;
    /** Probni režim (razvoj): bez mreže */
    preview?: boolean;
    previewUnlocked?: number;
    /** Dnevni podsetnik (samo kad ga je roditelj uključio): da li je dete danas igralo i da li je sada vreme */
    reminder?: { playedToday: boolean; initialDue: boolean };
}

const TABS: { id: View; label: string; Icon: typeof Gamepad2 }[] = [
    { id: "games", label: "Igre", Icon: Gamepad2 },
    { id: "companion", label: "Moj drugar", Icon: Shirt },
    { id: "progress", label: "Napredak", Icon: Trophy },
];

export default function ChildPageClient({ realtimeTopic = null, ...props }: Props) {
    return (
        <RealtimeTopicProvider value={realtimeTopic}>
            <CompanionProvider
                childId={props.child.id}
                gender={props.child.gender ?? undefined}
                preview={props.preview}
                previewPoints={props.child.experience_points ?? 0}
            >
                <ChildPage {...props} />
            </CompanionProvider>
        </RealtimeTopicProvider>
    );
}

/** Tekst pozdrava (na svetloj kartici preko 3D sveta, da se uvek čita) */
function BannerGreeting({ firstName, onGoal }: { firstName: string; onGoal: () => void }) {
    return (
        <>
            <h1 className="text-2xl font-extrabold leading-tight sm:text-4xl">Zdravo, {firstName}!</h1>
            <p className="mt-1 text-base font-semibold text-ink-soft sm:text-lg">Izaberi igru.</p>
            {/* Cilj deteta („Radim za”) — samo kad je izabran */}
            <GoalChip onClick={onGoal} className="mt-3" />
        </>
    );
}

/**
 * Pozdrav na vrhu početne strane: 3D drugar u svom svetu preko celog banera (kupljena
 * pozadina ili mirni svetlosivi svet), široko kadriran — drugar desno, pozdrav levo.
 * Dodir na drugara otvara „Moj drugar”.
 */
function GreetingBanner({ showAvatar, children, onCompanion }: { showAvatar: boolean; children: ReactNode; onCompanion: () => void }) {
    const companion = useCompanion();
    if (!showAvatar || !companion) {
        return (
            <section className="relative overflow-hidden rounded-card bg-brand-600 text-white shadow-soft">
                <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-500" aria-hidden="true" />
                <div className="relative p-5 sm:p-8 [&_p]:text-brand-100">{children}</div>
            </section>
        );
    }
    return (
        <section className="relative min-h-52 overflow-hidden rounded-card bg-[#E4E6EB] text-ink shadow-soft sm:min-h-64">
            <CompanionStage kind={companion.kind} skin={chosenSkin(companion)} wear={companion.wear} framing="wide" align={0.42} background className="absolute inset-0" />
            <div className="relative flex min-h-52 items-center sm:min-h-64">
                <div className="w-[62%] p-4 sm:w-1/2 sm:p-8">
                    <div className="inline-block max-w-full rounded-2xl bg-white/88 px-4 py-3 shadow-soft backdrop-blur-sm sm:px-5 sm:py-4">{children}</div>
                </div>
                <button type="button" onClick={onCompanion} aria-label="Moj drugar" className="absolute inset-y-0 right-0 w-[38%] rounded-r-card sm:w-1/2" />
            </div>
        </section>
    );
}

function ChildPage({ child, viewer, settings, preview = false, previewUnlocked, reminder }: Omit<Props, "realtimeTopic">) {
    const router = useRouter();
    const [view, setView] = useState<View>("games");
    const [points, setPoints] = useState(child.experience_points ?? 0);
    const [confirmExit, setConfirmExit] = useState(false);
    // Dok je igra otvorena preko cele strane, zaglavlje i navigacija ispod nje nisu dostupni
    const [gameOpen, setGameOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const watched = useWatcherPresence(!preview);

    const firstName = child.first_name || "Druže";
    const gender = child.gender ?? undefined;
    const isFemale = gender?.toLowerCase() === "female";
    const initials = `${child.first_name?.charAt(0) ?? ""}${child.last_name?.charAt(0) ?? ""}`.toUpperCase();
    // Učitelj je crtež (SVG): bez animacija ostaje na ekranu, samo miruje
    const showAvatar = settings.avatar;

    // Pozdrav pri ulasku (jedna kratka rečenica)
    useEffect(() => {
        const timer = setTimeout(() => {
            // Pozdrav imenom (samo ime, bez prezimena); stranica o privatnosti kaže da ime ide servisu za govor
            const name = firstName && firstName !== "Druže" ? `, ${firstName}` : "";
            void speak(`Zdravo${name}! ${isFemale ? "Dobro došla" : "Dobro došao"}. Izaberi igru.`, { gender, emotion: "hello", personal: Boolean(name) });
        }, 1200);
        return () => {
            clearTimeout(timer);
            stopSpeaking();
        };
    }, [gender, isFemale, firstName]);

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
        void speak("Doviđenja. Vidimo se sledeći put.", { gender, onEnd: finish });
    };

    const exitControl =
        viewer === "parent" ? (
            <Link href="/dashboard" className={buttonClasses({ variant: "secondary", size: "md", className: "normal-case" })}>
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
        <ChildSettingsProvider settings={settings} className="min-h-dvh bg-canvas pb-24 md:pb-10">
            <header inert={gameOpen} className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
                <div className="flex h-16 w-full items-center gap-2 px-4 sm:h-18 sm:gap-3 sm:px-6 lg:px-10 2xl:px-16">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-base font-extrabold text-white" aria-hidden="true">
                        {initials || "🙂"}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-lg font-extrabold leading-tight text-ink sm:text-xl">{firstName}</p>
                        {/* Brojevi malom detetu ne znače mnogo — poene vide samo starija deca */}
                        {settings.preset.showPoints && (
                            <p className="text-xs font-extrabold text-sun-700 sm:text-sm" aria-label={`${points} poena`}>
                                ⭐ {points}
                            </p>
                        )}
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

                    {watched && <WatchedBadge />}
                    <SoundToggle />
                    {exitControl}
                </div>
            </header>

            <main className="w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-10 2xl:px-16">
                {view === "games" ? (
                    <div className="space-y-6 sm:space-y-8">
                        {/* Pozdrav + drugar */}
                        <GreetingBanner showAvatar={showAvatar} onCompanion={() => setView("companion")}>
                            <BannerGreeting firstName={firstName} onGoal={() => setView("companion")} />
                        </GreetingBanner>

                        {reminder && (
                            <ReminderBanner reminder={settings.reminder} playedToday={reminder.playedToday} initialDue={reminder.initialDue} gameOpen={gameOpen} showCompanion={showAvatar} />
                        )}

                        <GameContainer
                            childId={child.id}
                            childName={firstName}
                            gender={gender}
                            watched={watched}
                            onExperienceChange={setPoints}
                            onOverlayChange={setGameOpen}
                            preview={preview}
                            previewUnlocked={previewUnlocked}
                        />

                        {/* „Otključavanje redom”: sledeća zaključana igra i šta treba završiti da se otvori */}
                        <LockedGameHint childId={child.id} settings={settings} gameOpen={gameOpen} preview={preview} previewUnlocked={previewUnlocked} />

                        {/* Priče koje je odrasli napisao baš za ovo dete (ne prikazuje se ako ih nema) */}
                        <CustomStoryShelf childId={child.id} gender={gender} offline={preview} />
                    </div>
                ) : view === "companion" ? (
                    <div className="space-y-5 sm:space-y-6">
                        {/* Na telefonu naslov samo za čitač ekrana: ekran pripada drugaru i predmetima */}
                        <h1 className="text-2xl font-extrabold text-ink max-sm:sr-only sm:text-3xl">Moj drugar</h1>
                        <CompanionRoom gender={gender} />
                    </div>
                ) : (
                    <div className="space-y-5 sm:space-y-6">
                        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{viewer === "parent" ? `Napredak: ${firstName}` : "Tvoj napredak"}</h1>
                        <ProgressDashboard childId={child.id} childName={firstName} audience={viewer} />
                    </div>
                )}
            </main>

            {/* Donja navigacija — telefon. Dugmad su iznad same ivice ekrana, gde deca često naslanjaju dlan. */}
            <nav inert={gameOpen} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur md:hidden" aria-label="Glavna navigacija">
                <div className="mx-auto grid max-w-md grid-cols-3">
                    {TABS.map(({ id, label, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setView(id)}
                            aria-current={view === id ? "page" : undefined}
                            className={cn(
                                "relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-extrabold transition-colors",
                                view === id ? "text-brand-700" : "text-ink-soft"
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
                <div className="flex flex-col gap-3">
                    <Button chunky size="xl" variant="success" block onClick={() => setConfirmExit(false)}>
                        <Play className="h-6 w-6" fill="currentColor" aria-hidden="true" />
                        Nastavi igru
                    </Button>
                    <Button chunky size="xl" variant="secondary" block onClick={handleConfirmExit}>
                        <LogOut className="h-6 w-6" aria-hidden="true" />
                        Izađi
                    </Button>
                </div>
            </Modal>
        </ChildSettingsProvider>
    );
}
