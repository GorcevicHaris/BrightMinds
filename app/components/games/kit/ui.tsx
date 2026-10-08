"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { IDLE_HINT_MS, useIdle } from "./useIdle";
import type { GameAccent } from "@/lib/games";

// ── GameStage ─────────────────────────────────────────────────────────────────
// Okvir igre: centrira sadržaj, drži istu širinu i razmake u svim igrama.

interface GameStageProps {
    children: React.ReactNode;
    /** Uži okvir za igre sa pitanjima, širi za table */
    width?: "narrow" | "normal" | "wide";
    className?: string;
}

const STAGE_WIDTH = { narrow: "max-w-2xl", normal: "max-w-4xl", wide: "max-w-6xl" };

export function GameStage({ children, width = "normal", className }: GameStageProps) {
    return (
        <div className={cn("relative mx-auto flex w-full flex-1 flex-col gap-4 sm:gap-5", STAGE_WIDTH[width], className)}>
            {children}
        </div>
    );
}

// ── GameHud ───────────────────────────────────────────────────────────────────
// Traka napretka: "Zadatak 2 od 5", poeni i (opciono) dugme za ponavljanje uputstva.

interface GameHudProps {
    round: number;
    totalRounds: number;
    score?: number;
    /** Naziv jedinice napretka, npr. "Zadatak", "Par", "Pitanje" */
    unit?: string;
    onSpeak?: () => void;
    /** Dodatni sadržaj desno (npr. brojač poteza) */
    extra?: React.ReactNode;
    className?: string;
}

export function GameHud({ round, totalRounds, score, unit = "Zadatak", onSpeak, extra, className }: GameHudProps) {
    const total = Math.max(totalRounds, 1);
    const current = Math.min(Math.max(round, 1), total);
    // Ako dete dugo ništa ne dodirne, dugme „Ponovi” blago zasvetli — bez glasa i bez požurivanja
    const idle = useIdle(IDLE_HINT_MS, round);
    return (
        <div className={cn("flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 shadow-soft sm:gap-4 sm:px-5 sm:py-3", className)}>
            <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-xs font-extrabold text-ink-soft sm:text-sm">
                    {unit} {current} od {total}
                </p>
                <div
                    className="flex gap-1.5"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={total}
                    aria-valuenow={current}
                    aria-label={`${unit} ${current} od ${total}`}
                >
                    {Array.from({ length: total }, (_, i) => (
                        <span
                            key={i}
                            className={cn(
                                "h-2.5 flex-1 rounded-full transition-colors duration-300",
                                i < current - 1 ? "bg-emerald-400" : i === current - 1 ? "bg-brand-500" : "bg-brand-100"
                            )}
                        />
                    ))}
                </div>
            </div>
            {extra}
            {score !== undefined && (
                <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-sun-50 px-3 py-2 text-sm font-extrabold text-sun-700 ring-1 ring-sun-200 sm:text-base">
                    <span aria-hidden="true">⭐</span>
                    <span aria-label={`${score} poena`}>{score}</span>
                </div>
            )}
            {onSpeak && <SpeakButton onClick={onSpeak} className={idle ? "animate-soft-pulse" : undefined} />}
        </div>
    );
}

// ── SpeakButton ───────────────────────────────────────────────────────────────

interface SpeakButtonProps {
    onClick: () => void;
    label?: string;
    /** Veliko dugme sa tekstom (za glavni poziv "Pusti zvuk") */
    large?: boolean;
    className?: string;
}

export function SpeakButton({ onClick, label = "Ponovi", large = false, className }: SpeakButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={large ? undefined : label}
            className={cn(
                "inline-flex shrink-0 items-center justify-center gap-2 border-2 border-b-[5px] border-brand-700 bg-brand-500 font-extrabold text-white transition-[transform,background-color,border-width] hover:bg-brand-600 active:translate-y-[3px] active:border-b-2",
                large ? "min-h-16 rounded-2xl px-7 text-lg sm:text-xl" : "h-12 w-12 rounded-xl sm:w-auto sm:px-4",
                className
            )}
        >
            <svg className={large ? "h-7 w-7" : "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
            </svg>
            <span className={large ? undefined : "hidden text-sm sm:inline"}>{label}</span>
        </button>
    );
}

// ── GamePrompt ────────────────────────────────────────────────────────────────
// Kartica sa uputstvom/pitanjem na vrhu igre.

interface GamePromptProps {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    /** Emodži ili slika levo od teksta */
    visual?: React.ReactNode;
    className?: string;
}

export function GamePrompt({ title, subtitle, visual, className }: GamePromptProps) {
    return (
        <div className={cn("flex items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-soft sm:gap-6 sm:p-6", className)}>
            {visual && (
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand-50 text-5xl ring-1 ring-brand-100 sm:h-28 sm:w-28 sm:text-6xl">
                    {visual}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-extrabold leading-snug text-ink sm:text-3xl">{title}</p>
                {subtitle && <p className="mt-1 text-base font-bold text-ink-soft sm:text-lg">{subtitle}</p>}
            </div>
        </div>
    );
}

// ── ChoiceCard ────────────────────────────────────────────────────────────────
// Veliko dugme-odgovor sa jasnim stanjima. Nikad ne kažnjava: pogrešno je blago, tačno je veselo.

export type ChoiceState = "idle" | "correct" | "wrong" | "dimmed" | "selected" | "hint";

interface ChoiceCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    state?: ChoiceState;
    children: React.ReactNode;
}

const CHOICE_STATES: Record<ChoiceState, string> = {
    idle: "border-line bg-surface hover:border-brand-300 hover:bg-brand-50 active:translate-y-[3px] active:border-b-2",
    selected: "border-brand-500 bg-brand-50",
    /** Pomoć: tačan odgovor blago pulsira posle više pogrešnih pokušaja */
    hint: "animate-soft-pulse border-brand-400 bg-brand-50",
    correct: "border-emerald-500 bg-emerald-50",
    wrong: "animate-shake border-rose-300 bg-rose-50",
    dimmed: "border-line bg-surface opacity-45",
};

export function ChoiceCard({ state = "idle", children, className, disabled, ...props }: ChoiceCardProps) {
    return (
        <button
            type="button"
            disabled={disabled}
            data-state={state}
            className={cn(
                "relative flex min-h-20 w-full select-none items-center justify-center rounded-tile border-2 border-b-[5px] p-3 text-center font-extrabold text-ink shadow-soft transition-[transform,background-color,border-color,opacity] duration-150 disabled:cursor-default sm:p-4",
                CHOICE_STATES[state],
                className
            )}
            {...props}
        >
            {children}
            {state === "correct" && <ChoiceBadge className="bg-emerald-600">✓</ChoiceBadge>}
            {state === "wrong" && <ChoiceBadge className="bg-rose-500">↺</ChoiceBadge>}
        </button>
    );
}

function ChoiceBadge({ children, className }: { children: React.ReactNode; className: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn("absolute -right-2 -top-2 grid h-8 w-8 animate-pop place-items-center rounded-full text-base font-black text-white shadow-soft ring-2 ring-white", className)}
        >
            {children}
        </span>
    );
}

// ── Feedback ──────────────────────────────────────────────────────────────────
// Kratka poruka posle odgovora. Čitači ekrana je izgovaraju (aria-live).

export type FeedbackKind = "correct" | "wrong" | null;

interface FeedbackProps {
    kind: FeedbackKind;
    correctText?: string;
    wrongText?: string;
    className?: string;
}

export function Feedback({ kind, correctText = "Tačno.", wrongText = "Probaj opet.", className }: FeedbackProps) {
    return (
        <div aria-live="polite" className={cn("pointer-events-none flex min-h-12 items-center justify-center", className)}>
            {kind && (
                <div
                    key={kind}
                    className={cn(
                        "inline-flex animate-pop items-center gap-2 rounded-full px-5 py-2.5 text-base font-extrabold shadow-soft sm:text-lg",
                        kind === "correct" ? "bg-emerald-700 text-white" : "bg-sun-100 text-sun-700 ring-1 ring-sun-300"
                    )}
                >
                    {kind === "correct" && <span aria-hidden="true">✓</span>}
                    {kind === "correct" ? correctText : wrongText}
                </div>
            )}
        </div>
    );
}

// ── ExplainPanel ──────────────────────────────────────────────────────────────
// Objašnjenje posle tačnog odgovora, sa dugmetom "Dalje" (ili kratkom proslavom na kraju nivoa).

interface ExplainPanelProps {
    /** Zašto je odgovor tačan */
    text: React.ReactNode;
    /** Emodži levo od teksta */
    icon?: React.ReactNode;
    /** Boje igre (`getGame(id).accent`) */
    accent: GameAccent;
    /** Bez `onNext` dugme se ne prikazuje (npr. na monitoru) */
    onNext?: () => void;
    nextLabel?: string;
    /** Za fokus na dugme posle tačnog odgovora */
    nextRef?: React.Ref<HTMLButtonElement>;
    /** Nivo je završen: umesto dugmeta stoji pohvala */
    done?: boolean;
    doneText?: string;
    className?: string;
}

export function ExplainPanel({ text, icon, accent, onNext, nextLabel = "Dalje", nextRef, done = false, doneText = "Bravo!", className }: ExplainPanelProps) {
    const textId = React.useId();
    return (
        <section
            aria-label="Objašnjenje"
            className={cn(
                "flex animate-fade-up flex-col gap-4 rounded-card border-2 p-4 shadow-soft sm:flex-row sm:items-center sm:gap-5 sm:p-5",
                accent.soft,
                accent.border,
                className
            )}
        >
            <p id={textId} className="flex flex-1 items-center gap-3 text-lg font-bold leading-snug text-ink sm:text-xl">
                {icon !== undefined && (
                    <span aria-hidden="true" className="text-4xl">
                        {icon}
                    </span>
                )}
                {text}
            </p>
            {done ? (
                <p role="status" className={cn("animate-pop text-center font-display text-2xl font-extrabold sm:shrink-0", accent.text)}>
                    <span aria-hidden="true">🎉 </span>
                    {doneText}
                </p>
            ) : (
                onNext && (
                    <button
                        ref={nextRef}
                        type="button"
                        onClick={onNext}
                        aria-describedby={textId}
                        className={cn(
                            "inline-flex min-h-16 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] px-8 font-display text-xl font-extrabold text-white transition-[transform,border-width] active:translate-y-[3px] active:border-b-2 sm:text-2xl",
                            accent.solid,
                            accent.edge
                        )}
                    >
                        {nextLabel}
                        <span aria-hidden="true">→</span>
                    </button>
                )
            )}
        </section>
    );
}
