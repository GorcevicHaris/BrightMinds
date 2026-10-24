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
import type { CompanionPayload } from "@/lib/companionPayload";
import { cn } from "@/lib/cn";
import { RealtimeTopicProvider, useWatcherPresence } from "@/lib/realtime";
import { speak, stopSpeaking } from "@/lib/speech";
import CompanionStage from "@/app/components/avatar3d/CompanionStage";
import CompanionRoom from "./CompanionRoom";
import CompanionWorld from "./CompanionWorld";
import { chosenSkin, CompanionProvider, useCompanion } from "./companionState";
import { GoalChip } from "./companionUi";
import LockedGameHint from "./LockedGameHint";
import { TogetherProvider } from "./playTogether";
import { RemoteProvider } from "./playRemote";
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
    /** Drugar i novčići sa servera, poslati uz stranicu (bez treptaja podrazumevanog drugara) */
    companion?: CompanionPayload;
}

const TABS: { id: View; label: string; Icon: typeof Gamepad2 }[] = [
    { id: "games", label: "Igre", Icon: Gamepad2 },
    { id: "companion", label: "Moj drugar", Icon: Shirt },
    { id: "progress", label: "Napredak", Icon: Trophy },
];

export default function ChildPageClient({ realtimeTopic = null, companion, ...props }: Props) {
    return (
        <RealtimeTopicProvider value={realtimeTopic}>
            <CompanionProvider
                childId={props.child.id}
                gender={props.child.gender ?? undefined}
                preview={props.preview}
                previewPoints={props.child.experience_points ?? 0}
                initial={companion}
            >
                {/* Drug na drugom uređaju (playRemote.tsx): traje i dok dete gleda „Moj drugar” ili „Napredak” */}
                <RemoteProvider childId={props.child.id} childName={props.child.first_name || "Druže"} gender={props.child.gender ?? undefined} preview={props.preview}>
                    <ChildPage {...props} />
                </RemoteProvider>
            </CompanionProvider>
        </RealtimeTopicProvider>
    );
}

/** Tekst pozdrava (na svetloj kartici preko 3D sveta, da se uvek čita) */
function BannerGreeting({ firstName, onGoal }: { firstName: string; onGoal: () => void }) {
    return (
        <>
            {/* Na telefonu sitnije, da kartica ne zaklanja drugara */}
            <h1 className="text-lg font-extrabold leading-tight min-[400px]:text-xl sm:text-4xl">Zdravo, {firstName}!</h1>
            <p className="mt-0.5 text-sm font-semibold text-ink-soft sm:mt-1 sm:text-lg">Izaberi igru.</p>
            {/* Cilj deteta („Radim za”) — samo kad je izabran */}
            <GoalChip onClick={onGoal} className="mt-2 sm:mt-3" />
        </>
    );
}

/**
 * Pozdrav na vrhu početne strane: samo 3D drugar (bez sveta, koji bi se u širokom baneru
 * razvukao), široko kadriran — drugar desno, pozdrav levo. Kupljena pozadina je iza cele
 * strane (CompanionWorld), a baner je tada providan.
 * Dodir na drugara otvara „Moj drugar”.
 */
function GreetingBanner({ showAvatar, children, onCompanion, sectionRef }: { showAvatar: boolean; children: ReactNode; onCompanion: () => void; sectionRef?: (el: HTMLElement | null) => void }) {
    const companion = useCompanion();
    const pressAt = useRef<{ x: number; y: number } | null>(null);
    if (!showAvatar || !companion) {
        return (
            <section className="relative overflow-hidden rounded-card bg-brand-600 text-white shadow-soft">
                <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-brand-500" aria-hidden="true" />
                <div className="relative p-5 sm:p-8 [&_p]:text-brand-100">{children}</div>
            </section>
        );
    }
    return (
        <section
            ref={sectionRef}
            className={cn(
                "relative min-h-52 overflow-hidden rounded-card text-ink shadow-soft sm:min-h-64",
                // Sa kupljenom pozadinom baner je providan (svet je iza cele strane), inače mek svetao
                companion.wear.background ? "bg-white/25 ring-1 ring-white/60" : "bg-gradient-to-br from-brand-50 via-white to-sky-50"
            )}
            onPointerDown={(e) => {
                pressAt.current = { x: e.clientX, y: e.clientY };
            }}
            onClick={(e) => {
                // Kratak dodir na drugara otvara „Moj drugar”; prevlačenje ga samo okreće
                const start = pressAt.current;
                pressAt.current = null;
                if (!(e.target instanceof HTMLCanvasElement) || !start) return;
                if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) return;
                const box = e.currentTarget.getBoundingClientRect();
                if (e.clientX - box.left > box.width * 0.38) onCompanion();
            }}
        >
            <CompanionStage kind={companion.kind} skin={chosenSkin(companion)} wear={companion.wear} framing="wide" align={0.4} background={false} interactive className="absolute inset-0" />
            {/* Sloj sa pozdravom propušta dodire do drugara (platno ispod); hvata ih samo kartica pozdrava */}
            <div className="pointer-events-none relative flex min-h-52 items-center sm:min-h-64">
                <div className="w-[54%] p-3 sm:w-1/2 sm:p-8">
                    <div className="pointer-events-auto inline-block max-w-full rounded-2xl bg-white/88 px-3 py-2 shadow-soft backdrop-blur-sm sm:px-5 sm:py-4">{children}</div>
                </div>
                {/* Za tastaturu i čitač ekrana; prstom se drugar prevlači, a dodirom otvara (vidi onClick iznad) */}
                <button type="button" onClick={onCompanion} aria-label="Moj drugar" className="pointer-events-none absolute inset-y-0 right-0 w-[38%] rounded-r-card focus-visible:ring-4 focus-visible:ring-brand-400 sm:w-1/2" />
            </div>
        </section>
    );
}

/**
 * Drugar u uglu dok je pozdravni baner van ekrana (dete skroluje mapu igara), da je uvek uz dete.
 * Živi prikaz se pravi tek tada, pa preuzima zajedničko 3D platno; kad se baner vrati, ovaj
 * prikaz nestaje i platno se vraća baneru. Dodir otvara „Moj drugar”.
 */
function FloatingCompanion({ onOpen }: { onOpen: () => void }) {
    const companion = useCompanion();
    if (!companion) return null;
    return (
        <button
            type="button"
            onClick={onOpen}
            aria-label="Moj drugar"
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-30 h-28 w-24 animate-pop overflow-hidden rounded-3xl border-2 border-white bg-gradient-to-b from-brand-50 to-sky-50 shadow-lift focus-visible:ring-4 focus-visible:ring-brand-400 md:bottom-6 md:right-6 md:h-36 md:w-28"
        >
            <CompanionStage kind={companion.kind} skin={chosenSkin(companion)} wear={companion.wear} framing="portrait" background={false} className="pointer-events-none absolute inset-0" />
        </button>
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
    // Pozdravni baner van ekrana → drugar prelazi u ugao (FloatingCompanion)
    const [banner, setBanner] = useState<HTMLElement | null>(null);
    const [bannerAway, setBannerAway] = useState(false);
    useEffect(() => {
        if (!banner) return;
        // Gornjih 64 px pokriva zaglavlje; baner je „otišao” kad se vidi manje od četvrtine
        const observer = new IntersectionObserver(([entry]) => setBannerAway(entry.intersectionRatio < 0.25), { rootMargin: "-64px 0px 0px 0px", threshold: [0, 0.25, 0.5] });
        observer.observe(banner);
        return () => {
            observer.disconnect();
            setBannerAway(false);
        };
    }, [banner]);

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
        <ChildSettingsProvider settings={settings} className="relative isolate min-h-dvh bg-canvas pb-24 md:pb-10">
            {/* Kupljena pozadina drugara iza cele strane (ispod svega, ništa ne hvata dodir) */}
            {showAvatar && <CompanionWorld />}
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
                        <GreetingBanner showAvatar={showAvatar} onCompanion={() => setView("companion")} sectionRef={setBanner}>
                            <BannerGreeting firstName={firstName} onGoal={() => setView("companion")} />
                        </GreetingBanner>

                        {reminder && (
                            <ReminderBanner reminder={settings.reminder} playedToday={reminder.playedToday} initialDue={reminder.initialDue} gameOpen={gameOpen} showCompanion={showAvatar} />
                        )}

                        {/* „Igraj sa drugom” (playTogether.tsx): stanje traje dok je dete na ovoj strani */}
                        <TogetherProvider childId={child.id} childName={firstName} gender={gender} preview={preview}>
                            <GameContainer
                                childId={child.id}
                                childName={firstName}
                                gender={gender}
                                watched={watched}
                                onExperienceChange={setPoints}
                                onOverlayChange={setGameOpen}
                                preview={preview}
                                previewUnlocked={previewUnlocked}
                                ageYears={child.age_years ?? null}
                            />
                        </TogetherProvider>

                        {/* „Otključavanje redom”: sledeća zaključana igra i šta treba završiti da se otvori */}
                        <LockedGameHint childId={child.id} settings={settings} gameOpen={gameOpen} preview={preview} previewUnlocked={previewUnlocked} />

                        {/* Priče koje je odrasli napisao baš za ovo dete (ne prikazuje se ako ih nema) */}
                        <CustomStoryShelf childId={child.id} gender={gender} offline={preview} />
                    </div>
                ) : view === "companion" ? (
                    <div className="space-y-5 sm:space-y-6">
                        {/* Naslov samo za čitač ekrana: ceo ekran pripada drugaru i predmetima */}
                        <h1 className="sr-only">Moj drugar</h1>
                        <CompanionRoom gender={gender} />
                    </div>
                ) : (
                    <div className="space-y-5 sm:space-y-6">
                        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{viewer === "parent" ? `Napredak: ${firstName}` : "Tvoj napredak"}</h1>
                        <ProgressDashboard childId={child.id} childName={firstName} audience={viewer} />
                    </div>
                )}
            </main>

            {view === "games" && showAvatar && bannerAway && !gameOpen && (
                <FloatingCompanion
                    onOpen={() => {
                        setView("companion");
                        window.scrollTo({ top: 0 });
                    }}
                />
            )}

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
