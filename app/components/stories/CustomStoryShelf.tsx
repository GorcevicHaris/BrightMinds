// app/components/stories/CustomStoryShelf.tsx
// Dečja strana „Mojih priča”: polica sa pričama koje je napisao odrasli i čitač
// preko celog ekrana. Priča se čita korak po korak, bez pitanja, bodova i tajmera —
// dete samo ide „Dalje” kada je spremno. Ovde nema teksta za odrasle.
"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { SpeakButton, playSfx, useInputGuard } from "@/app/components/games/kit";
import SpeakingTeacher from "@/app/components/avatar/SpeakingTeacher";
import { chosenSkin, useCompanion } from "@/app/dashboard/child/[id]/companionState";
import { SoundToggle } from "@/app/components/ui/SoundToggle";
import { cn } from "@/lib/cn";
import {
    STORY_FALLBACK_EMOJI,
    parseStoryList,
    stepCountLabel,
    type CustomStory,
    type CustomStoryStep,
} from "@/lib/customStories";
import { useSpeech } from "@/lib/speech";

const FINISHED_TEXT = "Priča je pročitana.";

interface ShelfProps {
    childId: number;
    gender?: string;
    initialStories?: CustomStory[];
    /** Bez mreže: prikazuje samo `initialStories` (probni prikaz) */
    offline?: boolean;
}

/**
 * Odeljak „Moje priče” na dečjoj stranici. Ne prikazuje ništa dok se priče
 * učitavaju, ako učitavanje ne uspe ili ako dete nema nijednu priču.
 */
export default function CustomStoryShelf({ childId, gender, initialStories, offline = false }: ShelfProps) {
    const [stories, setStories] = useState<CustomStory[]>(() => initialStories ?? []);
    const [openId, setOpenId] = useState<number | null>(null);
    const { say, stop } = useSpeech(gender);
    const headingId = useId();

    useEffect(() => {
        if (offline) return;
        const controller = new AbortController();
        fetch(`/api/children/${childId}/stories`, { cache: "no-store", signal: controller.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((data: unknown) => {
                if (data !== null && !controller.signal.aborted) setStories(parseStoryList(data));
            })
            .catch(() => {});
        return () => controller.abort();
    }, [childId, offline]);

    // Priča bez koraka nema šta da prikaže
    const readable = stories.filter((story) => story.steps.length > 0);
    if (readable.length === 0) return null;

    const openStory = readable.find((story) => story.id === openId) ?? null;

    const openReader = (story: CustomStory) => {
        playSfx("tap");
        setOpenId(story.id);
        void say(story.steps[0].text);
    };

    const closeReader = () => {
        stop();
        setOpenId(null);
    };

    return (
        <>
            <section aria-labelledby={headingId}>
                <h2 id={headingId} className="mb-4 text-xl font-extrabold text-ink sm:mb-5 sm:text-2xl">
                    Moje priče
                </h2>
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                    {readable.map((story) => (
                        <li key={story.id}>
                            <button
                                type="button"
                                onClick={() => openReader(story)}
                                className="flex min-h-24 w-full items-center gap-4 rounded-card border-2 border-b-[6px] border-line bg-surface p-4 text-left shadow-soft transition-[transform,border-color,box-shadow] hover:border-brand-300 hover:shadow-lift active:translate-y-[3px] active:border-b-2"
                            >
                                <span
                                    aria-hidden="true"
                                    className="grid h-16 min-w-16 shrink-0 place-items-center whitespace-nowrap rounded-tile bg-sun-50 px-2 text-4xl leading-none ring-1 ring-sun-200"
                                >
                                    {story.emoji ?? STORY_FALLBACK_EMOJI}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block break-words font-display text-lg font-extrabold leading-snug text-ink sm:text-xl">
                                        {story.title}
                                    </span>
                                    <span className="mt-0.5 block text-sm font-semibold text-ink-soft">{stepCountLabel(story.steps.length)}</span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Čitač je van odeljka (i van svega što se animira), da `fixed` uvek pokrije ceo ekran */}
            {openStory && <StoryReader key={openStory.id} story={openStory} gender={gender} onSpeak={(text) => void say(text)} onClose={closeReader} />}
        </>
    );
}

// ── Jedan korak priče ─────────────────────────────────────────────────────────
// Isti prikaz koriste čitač i pregled u prozoru za odrasle.

export function StoryStepView({ step, className }: { step: CustomStoryStep; className?: string }) {
    return (
        <article className={cn("animate-fade-up overflow-hidden rounded-card border border-line bg-surface shadow-soft", className)}>
            <div aria-hidden="true" className="grid min-h-40 place-items-center border-b border-brand-100 bg-brand-50 px-4 py-6 sm:min-h-60">
                <span className="break-all text-center text-6xl leading-tight sm:text-8xl">{step.emoji ?? STORY_FALLBACK_EMOJI}</span>
            </div>
            <div className="flex min-h-28 items-center px-4 py-5 sm:min-h-36 sm:px-8 sm:py-6">
                <p className="w-full break-words text-2xl font-bold leading-snug text-ink sm:text-3xl sm:leading-snug">{step.text}</p>
            </div>
        </article>
    );
}

/** „Korak 2 od 5” i tačkice ispod; trenutni korak je i širi, ne samo druge boje. */
export function StoryStepIndicator({ current, total, className }: { current: number; total: number; className?: string }) {
    return (
        <div className={className}>
            <p className="text-sm font-extrabold text-ink-soft sm:text-base">
                Korak {current} od {total}
            </p>
            <div aria-hidden="true" className="mt-1.5 flex items-center gap-1.5">
                {Array.from({ length: total }, (_, i) => (
                    <span
                        key={i}
                        className={cn(
                            "h-2.5 rounded-full",
                            i === current - 1 ? "w-7 bg-brand-600" : "w-2.5",
                            i < current - 1 && "bg-brand-300",
                            i > current - 1 && "bg-brand-100 ring-1 ring-brand-200"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

// ── Čitač ─────────────────────────────────────────────────────────────────────

const BIG_BUTTON =
    "inline-flex min-h-19 w-full select-none items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] px-3 font-display text-xl font-extrabold transition-[transform,background-color,border-width] active:translate-y-[3px] active:border-b-2 sm:text-2xl";
const BIG_PRIMARY = "border-brand-700 bg-brand-500 text-white hover:bg-brand-600";
const BIG_SECONDARY = "border-line bg-surface text-ink hover:bg-brand-50";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ReaderProps {
    story: CustomStory;
    /** Pol deteta: određuje ko čita (učitelj ili učiteljica) */
    gender?: string;
    onSpeak: (text: string) => void;
    onClose: () => void;
}

function StoryReader({ story, gender, onSpeak, onClose }: ReaderProps) {
    const companion = useCompanion();
    const [index, setIndex] = useState(0);
    const [finished, setFinished] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const nextRef = useRef<HTMLButtonElement>(null);
    const finishedRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    // Dok je čitač otvoren: stranica ispod se ne skroluje, Esc zatvara, Tab ostaje
    // u čitaču, a posle zatvaranja fokus se vraća na karticu priče
    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            const root = rootRef.current;
            if (e.key !== "Tab" || !root) return;
            const focusable = root.querySelectorAll<HTMLElement>(FOCUSABLE);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            const outside = !root.contains(active);
            if (e.shiftKey && (outside || active === first || active === root)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && (outside || active === last)) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, []);

    // Fokus ulazi u čitač pri otvaranju i prati prelaz na završni ekran i nazad
    useEffect(() => {
        (finished ? finishedRef.current : rootRef.current)?.focus();
    }, [finished]);

    const total = story.steps.length;
    const step = story.steps[index];
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const emoji = story.emoji ?? STORY_FALLBACK_EMOJI;

    // Dugme ostaje na istom mestu na svakoj strani: drugi dodir dvostrukog dodira ne sme da preskoči stranu
    const guard = useInputGuard(500);

    const show = (next: number) => {
        guard.hold();
        setFinished(false);
        setIndex(next);
        onSpeak(story.steps[next].text);
    };

    const goNext = () => {
        if (guard.blocked()) return;
        if (!isLast) {
            show(index + 1);
            return;
        }
        guard.hold();
        setFinished(true);
        onSpeak(FINISHED_TEXT);
    };

    const goBack = () => {
        if (isFirst || guard.blocked()) return;
        // Na prvom koraku nema dugmeta „Nazad”, pa fokus prelazi na „Dalje”
        if (index === 1) nextRef.current?.focus();
        show(index - 1);
    };

    return (
        <div
            ref={rootRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed inset-0 z-[6000] flex flex-col bg-canvas"
        >
            {/* Zaglavlje — ista mesta dugmadi kao u igrama */}
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:h-18 sm:gap-3 sm:px-5">
                <span className="w-1 shrink-0 sm:w-2" />
                <span
                    aria-hidden="true"
                    className="grid h-11 min-w-11 shrink-0 place-items-center whitespace-nowrap rounded-xl bg-sun-50 px-1.5 text-2xl leading-none ring-1 ring-sun-200"
                >
                    {emoji}
                </span>
                <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-extrabold leading-tight text-ink sm:text-lg">
                    {story.title}
                </h2>
                <SoundToggle />
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border-2 border-line bg-surface px-3 text-sm font-extrabold text-ink-soft transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 sm:px-4"
                >
                    <X className="h-5 w-5" aria-hidden="true" />
                    <span className="hidden sm:inline">Zatvori</span>
                    <span className="sr-only sm:hidden">Zatvori</span>
                </button>
            </header>

            <div className="scroll-soft relative flex flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
                {finished ? (
                    <div className="grid flex-1 place-items-center">
                        <div
                            ref={finishedRef}
                            tabIndex={-1}
                            className="w-full max-w-md animate-fade-up rounded-card border border-line bg-surface px-5 py-8 text-center shadow-soft sm:px-8"
                        >
                            <p aria-hidden="true" className="break-all text-7xl leading-tight">
                                {emoji}
                            </p>
                            <p role="status" className="mt-4 font-display text-2xl font-extrabold text-ink sm:text-3xl">
                                {FINISHED_TEXT}
                            </p>
                            {/* Oba izbora su jednako velika i jednako istaknuta */}
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                <button type="button" onClick={() => show(0)} className={cn(BIG_BUTTON, BIG_SECONDARY)}>
                                    <RotateCcw className="h-6 w-6 shrink-0" aria-hidden="true" />
                                    Čitaj ponovo
                                </button>
                                <button type="button" onClick={onClose} className={cn(BIG_BUTTON, BIG_SECONDARY)}>
                                    <Check className="h-6 w-6 shrink-0" aria-hidden="true" />
                                    Gotovo
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div aria-live="polite" className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
                        <StoryStepView key={index} step={step} />
                    </div>
                )}
            </div>

            {/* Dugmad su uvek na istom mestu, pri dnu ekrana */}
            {!finished && (
                <footer className="shrink-0 border-t border-line bg-surface px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:px-6">
                    <div className="mx-auto w-full max-w-2xl">
                        <div className="flex items-center gap-3">
                            <SpeakingTeacher gender={gender} kind={companion?.kind} wear={companion?.wear} skin={chosenSkin(companion)} className="h-12 w-12 sm:h-14 sm:w-14" />
                            <StoryStepIndicator current={index + 1} total={total} className="min-w-0 flex-1" />
                            <SpeakButton onClick={() => onSpeak(step.text)} label="Pročitaj ponovo" />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            {isFirst ? (
                                <span />
                            ) : (
                                <button type="button" onClick={goBack} className={cn(BIG_BUTTON, BIG_SECONDARY)}>
                                    <ArrowLeft className="h-6 w-6 shrink-0" aria-hidden="true" />
                                    Nazad
                                </button>
                            )}
                            <button ref={nextRef} type="button" onClick={goNext} className={cn(BIG_BUTTON, BIG_PRIMARY)}>
                                {isLast ? "Kraj" : "Dalje"}
                                {isLast ? (
                                    <Check className="h-6 w-6 shrink-0" aria-hidden="true" />
                                ) : (
                                    <ArrowRight className="h-6 w-6 shrink-0" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </footer>
            )}
        </div>
    );
}
