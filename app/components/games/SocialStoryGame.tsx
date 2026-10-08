"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
    ChoiceCard,
    Feedback,
    GameHud,
    GamePrompt,
    GameStage,
    genderText,
    isFemale,
    playSfx,
    shuffle,
    useGameSync,
    type BaseView,
    type ChoiceState,
    type FeedbackKind,
    type GameProps,
} from "@/app/components/games/kit";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import { decisionCount, optionsOf, storyForLevel, type SceneTone, type Story } from "./data/socialStories";

// ── Stanje igre ───────────────────────────────────────────────────────────────
// Sve što utiče na prikaz je u jednom JSON objektu koji se šalje live monitoru.
// Sadržaj priče se ne šalje: monitor ga nalazi lokalno po nivou, a view nosi samo indekse.
//
// Ocena nivoa: total = broj koraka sa odlukom, correct = odluke pogođene iz PRVOG pokušaja.
// Pripovedni koraci (bez izbora) se ne računaju. Zvezdice iz toga računa kontejner.

type StoryPhase = "cover" | "story" | "done";

export interface StoryView extends BaseView {
    // score: 100 poena za odluku iz prvog pokušaja, 50 ako je bio potreban još neki pokušaj
    // correctCount: odluke pogođene iz prvog pokušaja; incorrectCount: ukupno slabijih izbora
    // round / totalRounds: trenutni korak priče (od 1) i broj koraka
    phase: StoryPhase;
    /** Indeks koraka priče, od 0 */
    stepIndex: number;
    /** Redosled prikaza izbora na trenutnom koraku (indeksi iz `optionsOf`, 0 = najbolji izbor) */
    order: number[];
    /** Slabiji izbori koje je dete već probalo na ovom koraku, redom kojim ih je biralo */
    tried: number[];
    /** Najbolji izbor je pronađen — sledi „Dalje” */
    answered: boolean;
}

const ACCENT = getGame("social-story").accent;
const SPEAK_DELAY_MS = 400;
const CELEBRATION_MS = 1100;
const POINTS_FIRST_TRY = 100;
const POINTS_LATER_TRY = 50;

function identityOrder(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
}

function shuffledOrder(count: number): number[] {
    return shuffle(identityOrder(count));
}

function optionCount(story: Story, stepIndex: number): number {
    const decision = story.steps[stepIndex]?.decision;
    return decision ? optionsOf(decision).length : 0;
}

function createView(story: Story, order: number[]): StoryView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: story.steps.length,
        phase: "cover",
        stepIndex: 0,
        order,
        tried: [],
        answered: false,
    };
}

function toCount(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function isPermutation(value: unknown, count: number): value is number[] {
    return Array.isArray(value) && value.length === count && identityOrder(count).every((i) => value.includes(i));
}

/** Monitor dobija delimično ili zastarelo stanje, pa svaku vrednost svodimo na ono što priča zaista ima. */
function resolveView(raw: Partial<StoryView>, story: Story): StoryView {
    const stepIndex = Math.min(toCount(raw.stepIndex), story.steps.length - 1);
    const count = optionCount(story, stepIndex);
    const tried = Array.isArray(raw.tried)
        ? raw.tried.filter((value, i, all) => Number.isInteger(value) && value > 0 && value < count && all.indexOf(value) === i)
        : [];
    return {
        score: toCount(raw.score),
        correctCount: toCount(raw.correctCount),
        incorrectCount: toCount(raw.incorrectCount),
        round: stepIndex + 1,
        totalRounds: story.steps.length,
        phase: raw.phase === "story" || raw.phase === "done" ? raw.phase : "cover",
        stepIndex,
        order: isPermutation(raw.order, count) ? raw.order : identityOrder(count),
        tried,
        answered: count > 0 && raw.answered === true,
    };
}

/** Naziv izbora za dnevnik roditelja — bez navodnika iz samog teksta izbora. */
function quoted(label: string): string {
    return `„${label.replace(/[„”]/g, "")}”`;
}

function scrollIntoViewGently(element: HTMLElement | null) {
    if (!element) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
}

// ── Igra ──────────────────────────────────────────────────────────────────────

export default function SocialStoryGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<StoryView>) {
    const story = storyForLevel(level);
    const female = isFemale(gender);
    const t = (text: string) => genderText(text, female);

    const [view, setView] = useState<StoryView>(() => createView(story, shuffledOrder(optionCount(story, 0))));
    const sync = useGameSync<StoryView>({ childId, gameId: "social-story", level, isMonitor });
    const { say, stop } = useSpeech(gender);

    const initialView = useRef(view);
    const started = useRef(false);
    const finished = useRef(false);
    const finishTimer = useRef<number | null>(null);
    const topRef = useRef<HTMLSpanElement>(null);
    const feedbackRef = useRef<HTMLDivElement>(null);

    const shown = isMonitor ? resolveView({ ...createView(story, []), ...monitorState }, story) : view;
    const step = story.steps[shown.stepIndex];
    const decision = step.decision;
    const options = decision ? optionsOf(decision) : [];
    const isLastStep = shown.stepIndex === story.steps.length - 1;
    const stepLabel = `Korak ${shown.round}/${shown.totalRounds}`;

    // Izbor čije se objašnjenje vidi: najbolji kad je pronađen, inače poslednji probani
    const lastTried = shown.tried.length > 0 ? shown.tried[shown.tried.length - 1] : null;
    const explainedIndex = decision ? (shown.answered ? 0 : lastTried) : null;
    const feedbackKind: FeedbackKind = shown.answered ? "correct" : lastTried !== null ? "wrong" : null;
    // Posle dva slabija izbora (ili kad ostane samo jedan izbor) najbolji izbor blago pulsira
    const hintBest = !shown.answered && shown.tried.length >= Math.min(2, Math.max(options.length - 1, 1));

    const explanationSpeech = (optionIndex: number) =>
        optionIndex === 0 ? `Tako je! ${t(options[0].why)}` : `${t(options[optionIndex].why)} Probaj drugi izbor.`;

    const pageSpeech =
        shown.phase === "cover"
            ? `Priča: ${story.title}. ${t(story.intro)}`
            : shown.phase === "story"
              ? [t(step.text), decision ? t(decision.question) : ""].filter(Boolean).join(" ")
              : "";

    useEffect(() => {
        if (isMonitor || started.current) return;
        started.current = true;
        sync.start(initialView.current);
    }, [isMonitor, sync]);

    // Svaka nova stranica se pročita naglas
    useEffect(() => {
        if (isMonitor || !pageSpeech) return;
        const timer = window.setTimeout(() => void say(pageSpeech), SPEAK_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [isMonitor, pageSpeech, say]);

    // Na telefonu: nova stranica se čita od vrha, a objašnjenje i „Dalje” ne ostaju ispod ivice ekrana
    useEffect(() => {
        if (!isMonitor) scrollIntoViewGently(topRef.current);
    }, [isMonitor, view.phase, view.stepIndex]);

    useEffect(() => {
        if (!isMonitor && (view.answered || view.tried.length > 0)) scrollIntoViewGently(feedbackRef.current);
    }, [isMonitor, view.answered, view.tried.length]);

    useEffect(
        () => () => {
            if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
        },
        []
    );

    const begin = () => {
        if (isMonitor || view.phase !== "cover") return;
        const next: StoryView = { ...view, phase: "story" };
        playSfx("tap");
        setView(next);
        sync.update(next, `Priča „${story.title}” je počela`);
    };

    const choose = (optionIndex: number) => {
        if (isMonitor || view.phase !== "story" || !decision || view.answered || view.tried.includes(optionIndex)) return;
        const label = quoted(t(options[optionIndex].label));
        void say(explanationSpeech(optionIndex));

        if (optionIndex !== 0) {
            const next: StoryView = { ...view, tried: [...view.tried, optionIndex], incorrectCount: view.incorrectCount + 1 };
            playSfx("wrong");
            setView(next);
            sync.update(next, `${stepLabel}: izbor ${label} nije najbolji, bira ponovo`);
            return;
        }

        const attempt = view.tried.length + 1;
        const firstTry = attempt === 1;
        const next: StoryView = {
            ...view,
            answered: true,
            score: view.score + (firstTry ? POINTS_FIRST_TRY : POINTS_LATER_TRY),
            correctCount: view.correctCount + (firstTry ? 1 : 0),
        };
        playSfx("correct");
        setView(next);
        sync.update(next, `${stepLabel}: tačan izbor ${label} iz ${firstTry ? "prvog" : `${attempt}.`} pokušaja`);
    };

    const finish = () => {
        if (finished.current) return;
        finished.current = true;
        const total = decisionCount(story);
        const next: StoryView = { ...view, phase: "done" };
        playSfx("win");
        setView(next);
        sync.update(next, `Priča „${story.title}” je pročitana: ${next.correctCount}/${total} odluka iz prvog pokušaja`);
        finishTimer.current = window.setTimeout(() => {
            sync.complete(next);
            onComplete({ score: next.score, durationSec: sync.elapsedSec(), correct: next.correctCount, total });
        }, CELEBRATION_MS);
    };

    const advance = () => {
        if (isMonitor || view.phase !== "story" || (decision && !view.answered)) return;
        stop();
        if (isLastStep) {
            finish();
            return;
        }
        const stepIndex = view.stepIndex + 1;
        const next: StoryView = {
            ...view,
            stepIndex,
            round: stepIndex + 1,
            order: shuffledOrder(optionCount(story, stepIndex)),
            tried: [],
            answered: false,
        };
        playSfx("tap");
        setView(next);
        sync.update(next, `Korak ${next.round}/${next.totalRounds}: nova stranica priče`);
    };

    const nextButton = (
        <PrimaryButton onClick={isMonitor ? undefined : advance} disabled={isMonitor}>
            {isLastStep ? "Završi priču" : "Dalje"}
        </PrimaryButton>
    );

    return (
        <GameStage>
            <span ref={topRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px scroll-mt-4" />

            <GameHud
                unit="Korak"
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={shown.score}
                onSpeak={
                    isMonitor || !pageSpeech
                        ? undefined
                        : () => void say(explainedIndex !== null ? explanationSpeech(explainedIndex) : pageSpeech)
                }
            />

            {shown.phase === "cover" && (
                <section
                    aria-label={`Priča: ${story.title}`}
                    className="mx-auto w-full max-w-2xl animate-pop overflow-hidden rounded-card border border-line bg-surface shadow-lift"
                >
                    <div aria-hidden="true" className={cn("h-2 bg-linear-to-r", ACCENT.gradient)} />
                    <Scene emojis={story.cover} tone={story.tone} size="cover" />
                    <div className="flex flex-col items-center gap-3 px-4 py-5 text-center sm:gap-4 sm:px-8 sm:py-8">
                        <p className={cn("rounded-full border px-3 py-1 text-sm font-extrabold", ACCENT.soft, ACCENT.text, ACCENT.border)}>
                            Priča u {story.steps.length} koraka
                        </p>
                        <h2 className="text-3xl font-extrabold leading-tight text-ink sm:text-5xl">{story.title}</h2>
                        <p className="max-w-md text-lg font-bold leading-snug text-ink-soft sm:text-xl">{t(story.intro)}</p>
                        <PrimaryButton onClick={isMonitor ? undefined : begin} disabled={isMonitor} className="mt-2">
                            Počni priču
                        </PrimaryButton>
                    </div>
                </section>
            )}

            {shown.phase === "story" && (
                <div
                    key={`${level}-${shown.stepIndex}`}
                    className={cn("grid animate-fade-up gap-4 sm:gap-5", decision ? "lg:grid-cols-2 lg:items-start" : "mx-auto w-full max-w-2xl")}
                >
                    <article className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
                        <Scene emojis={step.scene} tone={story.tone} label={`${story.icon} ${story.title}`} />
                        <p className="px-4 py-4 text-xl font-bold leading-snug text-ink sm:px-6 sm:py-5 sm:text-2xl sm:leading-relaxed">
                            {t(step.text)}
                        </p>
                        {!decision && <div className="flex justify-center px-4 pb-5 sm:px-6 sm:pb-6">{nextButton}</div>}
                    </article>

                    {decision && (
                        <section aria-label="Pitanje i izbori" className="flex min-w-0 flex-col gap-3">
                            <GamePrompt title={t(decision.question)} />

                            <ul className="grid gap-3">
                                {shown.order.map((optionIndex) => {
                                    const option = options[optionIndex];
                                    const label = t(option.label);
                                    const isBest = optionIndex === 0;
                                    const wasTried = shown.tried.includes(optionIndex);
                                    const state: ChoiceState = shown.answered ? (isBest ? "correct" : "dimmed") : wasTried ? "dimmed" : "idle";
                                    const locked = isMonitor || shown.answered || wasTried;
                                    const status = state === "correct" ? ", najbolji izbor" : wasTried ? ", već probano" : "";
                                    return (
                                        <li key={optionIndex}>
                                            <ChoiceCard
                                                state={state}
                                                disabled={locked}
                                                onClick={locked ? undefined : () => choose(optionIndex)}
                                                aria-label={`${label}${status}`}
                                                className={cn(
                                                    !shown.answered && optionIndex === lastTried && "animate-shake",
                                                    hintBest && isBest && "animate-soft-pulse outline-2 outline-offset-2 outline-brand-300"
                                                )}
                                            >
                                                <span className="flex w-full items-center gap-3 text-left sm:gap-4">
                                                    <span
                                                        aria-hidden="true"
                                                        className="grid h-12 min-w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 px-1.5 text-3xl leading-none sm:h-14 sm:min-w-14 sm:text-4xl"
                                                    >
                                                        {option.emoji}
                                                    </span>
                                                    <span className="min-w-0 flex-1 text-base leading-snug sm:text-lg">{label}</span>
                                                </span>
                                            </ChoiceCard>
                                        </li>
                                    );
                                })}
                            </ul>

                            <div ref={feedbackRef} className="flex scroll-mb-4 flex-col gap-2">
                                <Feedback kind={feedbackKind} correctText="Tako je!" wrongText="Probajmo drugačije" />
                                <div aria-live="polite">
                                    {explainedIndex !== null && (
                                        <div
                                            key={explainedIndex}
                                            className={cn(
                                                "animate-fade-up rounded-card border-2 p-4 sm:p-5",
                                                shown.answered ? "border-emerald-200 bg-emerald-50" : "border-sun-200 bg-sun-50"
                                            )}
                                        >
                                            {!shown.answered && (
                                                <p className="mb-1 text-sm font-extrabold text-ink-soft sm:text-base">
                                                    <span aria-hidden="true">{options[explainedIndex].emoji} </span>
                                                    {t(options[explainedIndex].label)}
                                                </p>
                                            )}
                                            <p className="text-lg font-bold leading-snug text-ink sm:text-xl">{t(options[explainedIndex].why)}</p>
                                            {shown.answered && <div className="mt-4 flex justify-end">{nextButton}</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            )}

            {shown.phase === "done" && (
                <div className="grid flex-1 place-items-center">
                    <div role="status" className="w-full max-w-md animate-pop rounded-card border border-line bg-surface px-6 py-8 text-center shadow-lift">
                        <p aria-hidden="true" className="text-7xl leading-none">
                            🎉
                        </p>
                        <p className="mt-4 font-display text-3xl font-extrabold text-ink sm:text-4xl">Kraj priče!</p>
                        <p className="mt-2 text-lg font-bold text-ink-soft sm:text-xl">{t("Bravo! {Pročitao|Pročitala} si celu priču.")}</p>
                    </div>
                </div>
            )}
        </GameStage>
    );
}

// ── Lokalni delovi (nema ih u kitu) ───────────────────────────────────────────

const SCENE_TONES: Record<SceneTone, { sky: string; ground: string }> = {
    sun: { sky: "from-sun-50 to-sun-100", ground: "bg-sun-200" },
    lilac: { sky: "from-brand-50 to-brand-100", ground: "bg-brand-200" },
    aqua: { sky: "from-cyan-50 to-teal-100", ground: "bg-teal-200" },
    leaf: { sky: "from-sky-50 to-emerald-100", ground: "bg-emerald-200" },
    rose: { sky: "from-rose-50 to-orange-100", ground: "bg-rose-200" },
    sky: { sky: "from-sky-50 to-sky-100", ground: "bg-sky-200" },
    snow: { sky: "from-sky-100 to-slate-50", ground: "bg-white" },
};

const SCENE_SIZES = {
    page: { box: "h-32 sm:h-44 lg:h-56", main: "text-7xl sm:text-8xl", side: "text-5xl sm:text-6xl" },
    cover: { box: "h-40 sm:h-56", main: "text-7xl sm:text-8xl", side: "text-5xl sm:text-6xl" },
};

interface SceneProps {
    /** Prvi emodži je glavni; uz dva sporedna glavni stoji u sredini */
    emojis: readonly string[];
    tone: SceneTone;
    size?: keyof typeof SCENE_SIZES;
    /** Naziv priče u uglu slike */
    label?: string;
}

/** Slika jedne stranice: nebo, tlo i nekoliko velikih emodžija, kao ilustracija u slikovnici. */
function Scene({ emojis, tone, size = "page", label }: SceneProps) {
    const [main, ...sides] = emojis;
    const figures = sides.length >= 2 ? [sides[0], main, sides[1]] : [main, ...sides];
    const mainAt = sides.length >= 2 ? 1 : 0;
    const colors = SCENE_TONES[tone];
    const sizes = SCENE_SIZES[size];

    return (
        <div className={cn("relative flex items-end justify-center gap-4 overflow-hidden bg-linear-to-b px-4 pb-6 sm:gap-6 sm:pb-8", sizes.box, colors.sky)}>
            <span aria-hidden="true" className={cn("absolute -inset-x-10 bottom-0 h-10 rounded-t-[100%] sm:h-14", colors.ground)} />
            {figures.map((emoji, i) => (
                <span key={i} aria-hidden="true" className={cn("relative select-none leading-none drop-shadow-sm", i === mainAt ? sizes.main : sizes.side)}>
                    {emoji}
                </span>
            ))}
            {label && (
                <p className={cn("absolute left-3 top-3 rounded-full border bg-surface px-3 py-1 text-xs font-extrabold sm:text-sm", ACCENT.text, ACCENT.border)}>
                    {label}
                </p>
            )}
        </div>
    );
}

interface PrimaryButtonProps {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}

/** Veliko dugme za sledeći korak („Počni priču”, „Dalje”). */
function PrimaryButton({ children, onClick, disabled, className }: PrimaryButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "inline-flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl border-2 border-b-[5px] border-brand-700 bg-brand-500 px-8 font-display text-xl font-extrabold text-white shadow-soft transition-[transform,background-color,border-width] enabled:hover:bg-brand-600 enabled:active:translate-y-[3px] enabled:active:border-b-2 disabled:cursor-default sm:w-auto sm:min-w-56 sm:text-2xl",
                className
            )}
        >
            {children}
            <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </button>
    );
}
