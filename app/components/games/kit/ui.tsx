"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { IDLE_HINT_MS, useIdle } from "./useIdle";
import type { GameAccent } from "@/lib/games";
import SpeakingTeacher from "../../avatar/SpeakingTeacher";
import { useCalmMotion } from "../../avatar/motion";
import { useChildSettings } from "../../ChildSettingsProvider";
import { HypeBubble, HypePlus, useCompanionHype } from "./CompanionCheer";

/**
 * Ko čita zadatke detetu. Postavlja ga strana na kojoj dete igra; bez njega
 * (npr. roditeljski prikaz uživo, gde niko ne govori) lice učitelja se ne crta.
 */
/** Ko govori u igri: pol deteta (glas) i pratilac koga je dete izabralo, sa odećom i izgledom (boja, frizura) */
export const GameTeacherContext = React.createContext<{ gender?: string; kind?: string; wear?: Partial<Record<string, string>>; skin?: string } | null>(null);

/**
 * True kad drugar stoji u velikom panelu pored igre (položen tablet, računar). Tada ga traka
 * napretka ne crta (jedan drugar na ekranu, jedno živo platno), a uputstvo nema repić oblačića.
 */
export const CompanionPanelContext = React.createContext(false);

/**
 * Igra se crta kao zajednička tabla kod drugog deteta (app/dashboard/child/[id]/playShared.tsx):
 * monitor koji ipak prikazuje dugmad koja inače vidi samo dete koje igra („Dalje”, „Zapamtio sam”),
 * jer ih drugo dete pritiska kad je na redu (dodir ide domaćinu preko ključa `data-action`).
 */
export const SharedMirrorContext = React.createContext(false);

/**
 * Zajednička tabla: ekrani OBA uređaja (bez trake „Na redu je”). Igra koja veličinu table bira po
 * ekranu („Spoji parove”) bira je tako da stane na oba — telefon druga ne dobija tablu za tablet.
 * null = samo ovaj ekran.
 */
export const SharedScreensContext = React.createContext<readonly { w: number; h: number }[] | null>(null);

// ── GameStage ─────────────────────────────────────────────────────────────────
// Okvir igre: centrira sadržaj, drži istu širinu i razmake u svim igrama.

interface GameStageProps {
    children: React.ReactNode;
    /** Uži okvir za igre sa pitanjima, širi za table */
    width?: "narrow" | "normal" | "wide";
    /**
     * Položen telefon / nizak laptop (`flat`): dve kolone. Prvo dete (traka napretka) ide preko
     * cele širine, drugo (uputstvo) levo, a sve ostalo (izbori, poruka, objašnjenje) desno.
     */
    split?: boolean;
    className?: string;
}

// Na velikim ekranima igra zauzima skoro celu širinu (ostaje samo vazduh sa strane);
// gornja granica postoji samo da tekst ne bude predugačak za čitanje.
const STAGE_WIDTH = {
    narrow: "max-w-2xl xl:max-w-4xl 2xl:max-w-5xl",
    normal: "max-w-4xl xl:max-w-6xl 2xl:max-w-7xl",
    wide: "max-w-6xl xl:max-w-none",
};

/** Dve kolone na položenom ekranu (vidi `split`) */
const SPLIT =
    "flat:grid flat:max-w-none flat:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] flat:grid-rows-[auto_minmax(0,1fr)_auto] flat:gap-x-3 flat:gap-y-0 flat:*:first:col-span-2 flat:*:first:mb-2 flat:*:nth-2:row-span-2 flat:*:nth-[n+3]:col-start-2 flat:*:nth-[n+3]:min-w-0 flat:*:nth-[n+4]:mt-2";

export function GameStage({ children, width = "normal", split = false, className }: GameStageProps) {
    return (
        // Na telefonu nešto manji razmaci: na niskom ekranu (360 × 740) zadatak i izbori staju bez skrolovanja;
        // na položenom telefonu još manji, da polje za igru bude što veće
        <div className={cn("relative mx-auto flex w-full flex-1 flex-col gap-3 sm:gap-5 [@media(max-height:30rem)]:gap-2", STAGE_WIDTH[width], split && SPLIT, className)}>
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

/** Do ovoliko zadataka svaki ima svoj segment; preko toga bi segmenti na uskom telefonu bili sitni, pa je traka neprekidna. */
const MAX_SEGMENTS = 8;

export function GameHud({ round, totalRounds, score, unit = "Zadatak", onSpeak, extra, className }: GameHudProps) {
    const total = Math.max(totalRounds, 1);
    const current = Math.min(Math.max(round, 1), total);
    const segmented = total <= MAX_SEGMENTS;
    // Ako dete dugo ništa ne dodirne, dugme „Ponovi” blago zasvetli — bez glasa i bez požurivanja
    const idle = useIdle(IDLE_HINT_MS, round);
    return (
        <div className={cn("flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 shadow-soft sm:gap-4 sm:px-5 sm:py-3 flat:py-1.5 flat:sm:py-1.5", className)}>
            <HudTeacher />
            <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-xs font-extrabold text-ink-soft sm:text-sm">
                    {unit} {current} od {total}
                </p>
                <div
                    className={segmented ? "flex gap-1.5" : "flex h-2.5 overflow-hidden rounded-full bg-brand-100"}
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={total}
                    aria-valuenow={current}
                    aria-label={`${unit} ${current} od ${total}`}
                >
                    {segmented ? (
                        Array.from({ length: total }, (_, i) => (
                            <span
                                key={i}
                                className={cn(
                                    "h-2.5 flex-1 rounded-full transition-colors duration-300",
                                    i < current - 1 ? "bg-emerald-400" : i === current - 1 ? "bg-brand-500" : "bg-brand-100"
                                )}
                            />
                        ))
                    ) : (
                        // Iste boje kao segmenti: zeleno = završeno, ljubičasto = tekući zadatak, svetlo = ostalo
                        <>
                            <span className="bg-emerald-400 transition-[width] duration-300" style={{ width: `${((current - 1) / total) * 100}%` }} />
                            <span className="rounded-r-full bg-brand-500 transition-[width] duration-300" style={{ width: `${100 / total}%` }} />
                        </>
                    )}
                </div>
            </div>
            {extra}
            {score !== undefined && (
                <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-sun-50 px-3 py-2 text-sm font-extrabold text-sun-700 ring-1 ring-sun-200 sm:text-base">
                    {/* Nacrtana zvezdica (emodži je na svakom uređaju drugačiji) */}
                    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="h-4 w-4 shrink-0 sm:h-5 sm:w-5">
                        <path d="M50 8 L62 36 L92 38 L69 58 L77 88 L50 72 L23 88 L31 58 L8 38 L38 36Z" fill="#f6c518" stroke="#c9971a" strokeWidth={6} strokeLinejoin="round" />
                    </svg>
                    <span aria-label={`${score} poena`}>{score}</span>
                </div>
            )}
            {onSpeak && <SpeakButton onClick={onSpeak} className={idle ? "animate-soft-pulse" : undefined} />}
        </div>
    );
}

/**
 * Drugar koji čita zadatke, na početku trake (telefon, uspravan tablet): živ portret do pojasa,
 * u svom svetu; izraz i usta prate glas, a dok govori oko njega svetli prsten. Na tačan odgovor
 * zvezdice doleću do njega, on skoči, kratko poraste, pokaže „+1” i u oblačiću kaže pohvalu.
 * Portret viri iz trake (veći je od nje), pa traka nije viša nego ranije i igri ne uzima mesto.
 */
function HudTeacher() {
    const teacher = React.useContext(GameTeacherContext);
    const panel = React.useContext(CompanionPanelContext);
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const hype = useCompanionHype(calm);
    if (!teacher || panel || !settings.avatar) return null;
    return (
        <span
            data-hype-target=""
            className={cn(
                "relative z-30 -my-6 h-24 w-20 shrink-0 origin-top-left sm:-my-8 sm:h-32 sm:w-[6.5rem] short:-my-3 short:h-20 short:w-16 short:sm:-my-3 short:sm:h-20 short:sm:w-16",
                !calm && "transition-transform duration-300 ease-out",
                hype.excited && "scale-[1.35]"
            )}
        >
            <SpeakingTeacher
                gender={teacher.gender}
                kind={teacher.kind}
                wear={teacher.wear}
                skin={teacher.skin}
                live
                action={hype.action}
                actionKey={hype.actionKey}
                className="h-full w-full shadow-soft"
            />
            <HypePlus hype={hype} calm={calm} className="absolute -right-4 -top-3 px-2 py-0.5 text-base" />
            <HypeBubble hype={hype} calm={calm} tail="left" className="absolute left-full top-1 ml-3 px-3 py-1.5 text-base sm:text-lg" />
        </span>
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
            <SpeakerIcon className={large ? "h-7 w-7" : "h-5 w-5"} />
            <span className={large ? undefined : "hidden text-sm sm:inline"}>{label}</span>
        </button>
    );
}

function SpeakerIcon({ className }: { className: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
        </svg>
    );
}

// ── OptionSpeaker ─────────────────────────────────────────────────────────────
// Mali zvučnik uz izbor: čita taj izbor naglas, bez biranja.

interface OptionSpeakerProps {
    /** Naziv za čitače ekrana, npr. "Pročitaj: …" */
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

export function OptionSpeaker({ label, onClick, disabled }: OptionSpeakerProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className="grid min-h-14 w-14 shrink-0 place-items-center rounded-tile border-2 border-line bg-surface text-brand-600 shadow-soft transition-colors enabled:hover:border-brand-300 enabled:hover:bg-brand-50 disabled:cursor-default disabled:opacity-45"
        >
            <SpeakerIcon className="h-6 w-6" />
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
    /**
     * Velika slika situacije (scene/SceneArt, odnos 3 : 2) iznad teksta. Visina je ograničena delom
     * visine ekrana, pa zadatak i izbori i dalje staju bez skrolovanja.
     */
    illustration?: React.ReactNode;
    /** Na telefonu manji okvir i slika — kad ispod ima mnogo izbora koji treba da stanu na ekran */
    compact?: boolean;
    className?: string;
}

/** Najveća širina slike situacije: tolika da joj visina (2/3 širine) ne pređe zadati deo ekrana */
const ILLUSTRATION_WIDTH = {
    normal: "max-w-[min(100%,39dvh)] short:max-w-[min(100%,33dvh)] flat:max-w-[min(100%,34dvh)]",
    compact: "max-w-[min(100%,27dvh)] short:max-w-[min(100%,24dvh)] flat:max-w-[min(100%,26dvh)]",
};

/**
 * Repić „oblačića”: kartica sa uputstvom pokazuje na učitelja u traci iznad sebe.
 * Dodaje se kartici koja stoji odmah ispod `GameHud` (boja ivice repića prati `border-color` kartice).
 */
const BUBBLE_TAIL =
    "relative before:absolute before:-top-[9px] before:left-10 before:h-4 before:w-4 before:rotate-45 before:rounded-tl-[4px] before:border-l before:border-t before:border-inherit before:bg-surface sm:before:left-[3.85rem] short:before:left-8 short:sm:before:left-8";

/** Klase za repić oblačića — prazno kad učitelj nije na ekranu (npr. roditeljski prikaz). */
export function useBubbleTail(): string {
    const settings = useChildSettings();
    const teacher = React.useContext(GameTeacherContext);
    const panel = React.useContext(CompanionPanelContext);
    return teacher !== null && settings.avatar && !panel ? BUBBLE_TAIL : "";
}

export function GamePrompt({ title, subtitle, visual, illustration, compact = false, className }: GamePromptProps) {
    // Uputstvo je „oblačić” onoga ko govori
    const tail = useBubbleTail();
    if (illustration) {
        return (
            <div
                className={cn(
                    "relative flex flex-col items-stretch gap-2.5 rounded-card border border-line bg-surface shadow-soft sm:gap-4 sm:p-5 short:sm:p-3 flat:justify-center flat:gap-2 flat:sm:p-2.5",
                    compact ? "p-2.5" : "p-3",
                    tail,
                    className
                )}
            >
                <div className={cn("mx-auto w-full overflow-hidden rounded-2xl ring-1 ring-brand-100", ILLUSTRATION_WIDTH[compact ? "compact" : "normal"])}>
                    {illustration}
                </div>
                <div className="min-w-0 px-1 text-center">
                    <p className="font-display text-xl font-extrabold leading-snug text-ink sm:text-3xl flat:text-lg flat:sm:text-lg">{title}</p>
                    {subtitle && <p className="mt-1 text-base font-bold text-ink-soft sm:text-lg flat:sm:text-base">{subtitle}</p>}
                </div>
            </div>
        );
    }
    return (
        <div
            className={cn(
                "relative flex items-center gap-4 rounded-card border border-line bg-surface shadow-soft sm:gap-6 sm:p-6 short:sm:p-4 flat:flex-col flat:justify-center flat:gap-3 flat:text-center flat:sm:gap-3 flat:sm:p-3",
                compact ? "p-3" : "p-4",
                tail,
                className
            )}
        >
            {visual && (
                <div
                    className={cn(
                        "grid shrink-0 place-items-center rounded-2xl bg-brand-50 ring-1 ring-brand-100 sm:h-28 sm:w-28 sm:text-6xl short:sm:h-20 short:sm:w-20 short:sm:text-5xl",
                        compact ? "h-14 w-14 text-4xl" : "h-20 w-20 text-5xl"
                    )}
                >
                    {visual}
                </div>
            )}
            <div className="min-w-0 flex-1 flat:flex-none">
                <p className="font-display text-xl font-extrabold leading-snug text-ink sm:text-3xl flat:sm:text-xl">{title}</p>
                {subtitle && <p className="mt-1 text-base font-bold text-ink-soft sm:text-lg flat:sm:text-base">{subtitle}</p>}
            </div>
        </div>
    );
}

// ── PlayArea ──────────────────────────────────────────────────────────────────
// Polje za igru u boji igre: zauzima sav preostali prostor i drži zadatak u sredini,
// pa na velikom ekranu nema praznine ispod, a kartice mogu da budu velike.

interface PlayAreaProps {
    accent: GameAccent;
    children: React.ReactNode;
    className?: string;
}

export function PlayArea({ accent, children, className }: PlayAreaProps) {
    return (
        <div className={cn("flex min-h-0 flex-1 flex-col items-center justify-center rounded-card border p-3 sm:p-5 flat:p-2 flat:sm:p-3", accent.border, accent.soft, className)}>
            {children}
        </div>
    );
}

// ── ChoiceCard ────────────────────────────────────────────────────────────────
// Veliko dugme-odgovor sa jasnim stanjima. Nikad ne kažnjava: pogrešno je blago, tačno je mirno potvrđeno.

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
    /** Upravo izabran netačan odgovor: jasno označen (blago crvenkast okvir i ✗), ali bez tresenja i bljeskanja */
    wrong: "border-rose-300 bg-rose-50",
    dimmed: "border-line bg-surface opacity-45",
};

/**
 * `cn` ne spaja klase: uz `min-h-0` iz igre ostalo bi i `min-h-20` iz kartice, a pobedi ono koje je
 * kasnije u CSS-u (veće), pa bi igra tiho dobila višu karticu. Zato se podrazumevana visina i
 * unutrašnji razmak dodaju samo kad ih igra ne zada sama.
 */
const SETS_MIN_HEIGHT = /(^|\s)min-h-/;
const SETS_PADDING = /(^|\s)(sm:)?p-[\d.]/;

export function ChoiceCard({ state = "idle", children, className, disabled, ...props }: ChoiceCardProps) {
    const own = className ?? "";
    return (
        <button
            type="button"
            disabled={disabled}
            data-state={state}
            className={cn(
                "relative flex w-full select-none items-center justify-center rounded-tile border-2 border-b-[5px] text-center font-extrabold text-ink shadow-soft transition-[transform,background-color,border-color,opacity] duration-150 disabled:cursor-default",
                !SETS_MIN_HEIGHT.test(own) && "min-h-20",
                !SETS_PADDING.test(own) && "p-3 sm:p-4",
                CHOICE_STATES[state],
                className
            )}
            {...props}
        >
            {children}
            {state === "correct" && <ChoiceBadge className="bg-emerald-600">✓</ChoiceBadge>}
            {state === "wrong" && <ChoiceBadge className="bg-rose-500">✗</ChoiceBadge>}
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
        // Položen telefon: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red
        <div aria-live="polite" className={cn("pointer-events-none flex min-h-12 items-center justify-center flat:absolute flat:inset-x-0 flat:bottom-1 flat:z-30 flat:min-h-0", className)}>
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
// Objašnjenje posle tačnog odgovora, sa dugmetom "Dalje" (ili kratkom porukom na kraju nivoa).

interface ExplainPanelProps {
    /** Zašto je odgovor tačan */
    text: React.ReactNode;
    /** Slika levo od teksta */
    icon?: React.ReactNode;
    /** Boje igre (`getGame(id).accent`) */
    accent: GameAccent;
    /** Bez `onNext` dugme se ne prikazuje (npr. na monitoru) */
    onNext?: () => void;
    nextLabel?: string;
    /** Za fokus na dugme posle tačnog odgovora */
    nextRef?: React.Ref<HTMLButtonElement>;
    /** Nivo je završen: umesto dugmeta stoji kratka poruka */
    done?: boolean;
    doneText?: string;
    className?: string;
}

export function ExplainPanel({ text, icon, accent, onNext, nextLabel = "Dalje", nextRef, done = false, doneText = "Nivo je završen.", className }: ExplainPanelProps) {
    const textId = React.useId();
    const mirror = React.useContext(SharedMirrorContext);
    return (
        <section
            aria-label="Objašnjenje"
            className={cn(
                "flex animate-fade-up flex-col gap-4 rounded-card border-2 p-4 shadow-soft sm:flex-row sm:items-center sm:gap-5 sm:p-5 flat:gap-2 flat:sm:gap-3 flat:sm:p-3",
                // Položen telefon: objašnjenje je traka preko donjeg dela igre (izbori su tada već odigrani)
                "flat:absolute flat:inset-x-0 flat:bottom-0 flat:z-30 flat:shadow-pop flat:[grid-column:1/-1]!",
                accent.soft,
                accent.border,
                className
            )}
        >
            <p id={textId} className="flex flex-1 items-center gap-3 text-lg font-bold leading-snug text-ink sm:text-xl flat:sm:text-base">
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
                (onNext || mirror) && (
                    <button
                        ref={nextRef}
                        type="button"
                        onClick={onNext}
                        // Zajednička tabla: isto dugme i kod drugog deteta (lib/sharedPlay.ts)
                        data-action="next"
                        aria-describedby={textId}
                        className={cn(
                            "inline-flex min-h-16 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] px-8 font-display text-xl font-extrabold text-white transition-[transform,border-width] active:translate-y-[3px] active:border-b-2 sm:text-2xl flat:min-h-12 flat:px-5 flat:sm:text-xl",
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

// ── TriedNote ─────────────────────────────────────────────────────────────────
// Posle izbora koji manje pomaže: šta je izabrano i šta bi se verovatno desilo — mirno, bez osude.
// Roditelj daje `key` (probani izbor) da se kartica pri svakom novom pokušaju ponovo pojavi.

interface TriedNoteProps {
    /** Mala slika probanog izbora */
    icon?: React.ReactNode;
    /** Tekst probanog izbora */
    label: React.ReactNode;
    /** Šta bi se verovatno desilo */
    note: React.ReactNode;
}

export function TriedNote({ icon, label, note }: TriedNoteProps) {
    return (
        <div className="animate-fade-up rounded-card border-2 border-sun-200 bg-sun-50 p-4 sm:p-5 flat:p-2.5 flat:sm:p-2.5">
            <p className="mb-1 flex items-center gap-2 text-sm font-extrabold text-ink-soft sm:text-base">
                {icon}
                {label}
            </p>
            <p className="text-lg font-bold leading-snug text-ink sm:text-xl flat:text-base flat:sm:text-base">{note}</p>
        </div>
    );
}

// ── WaitingNote ───────────────────────────────────────────────────────────────
// Prazna tabla na monitoru dok ne stigne stanje igre („Čekamo sledeći zadatak…”).

export function WaitingNote({ children }: { children: React.ReactNode }) {
    return <p className="rounded-card border border-dashed border-line bg-surface p-8 text-center text-base font-bold text-ink-soft">{children}</p>;
}

// ── DemoHand ──────────────────────────────────────────────────────────────────
// Ruka koja pokazuje šta treba dodirnuti. Deca od 4–6 godina najbolje prate uputstvo koje
// im se POKAŽE pokretom; zato je prvi zadatak prvog nivoa „pokazan”, a posle toga ruke više nema.
// Stavlja se u element koji ima `relative` (kartica, dugme); sama se ne može dodirnuti.

export function DemoHand({ className }: { className?: string }) {
    return (
        <span aria-hidden="true" className={cn("pointer-events-none absolute bottom-1 right-1 z-20 animate-demo-tap drop-shadow-lg sm:bottom-2 sm:right-2", className)}>
            <svg viewBox="0 0 24 24" className="h-12 w-12 sm:h-14 sm:w-14" fill="#ffffff" stroke="#1f1b3a" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 14a8 8 0 0 1-8 8" />
                <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
                <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
                <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
        </span>
    );
}

