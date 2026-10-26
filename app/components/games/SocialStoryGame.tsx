"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    DemoHand,
    GameHud,
    GamePrompt,
    GameStage,
    genderText,
    hintDue,
    offeredOptions,
    OptionSpeaker,
    playSfx,
    shuffle,
    toIndexList,
    TriedNote,
    useGameSync,
    useInputGuard,
    listenLimitFor,
    useListenGate,
    useSayAll,
    useTimers,
    type BaseView,
    type ChoiceState,
    type GameProps,
    useWaitHint,
    usePraise,
    useGameRandom,
} from "@/app/components/games/kit";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import { decisionCount, storyForLevel, type SceneTone, type Story, type StoryDecision, type StoryStep } from "./data/socialStories";
import { storyScene } from "./data/storyScenes";
import { storyHero } from "./scene/heroes";
import { SceneArt } from "./scene/SceneArt";
import { OPTION_GRID, OptionPicture, OptionThumb } from "./OptionPicture";
import type { SceneSpec } from "./scene/types";

// ── Stanje igre ───────────────────────────────────────────────────────────────
// Sve što utiče na prikaz je u jednom JSON objektu koji se šalje live monitoru.
// Sadržaj priče se ne šalje: monitor ga nalazi lokalno po nivou, a view nosi samo indekse.
//
// Priča se može samo čitati („Čitaj priču”) ili čitati uz izbore („Čitaj i biraj”).
// Izbori nisu „tačno i pogrešno”: korak obično ima više izbora koji pomažu.
//
// Ocena nivoa:
//  • „Čitaj i biraj”: total = broj koraka sa izborom, correct = koraci u kojima je PRVI izbor
//    bio jedan od onih koji pomažu, prompted = koraci rešeni tek pošto je kartica zasvetlela.
//  • „Čitaj priču”: pročitana priča je uspeh — correct = total = broj koraka, bez poena.

type StoryPhase = "cover" | "story" | "done";
export type StoryMode = "read" | "choose";

/** Šta je dete izabralo na jednom koraku. „Nazad” i „Dalje” ovo ne menjaju. */
export interface StepRecord {
    /** Ponuđeni izbori u redosledu prikaza (indeksi iz `decision.options`); prazno za korak bez izbora */
    order: number[];
    /** Izbori koji manje pomažu, redom kojim su probani */
    tried: number[];
    /** Izabran izbor koji pomaže */
    picked: number | null;
    /** Jedna kartica koja pomaže blago svetli */
    hint: boolean;
}

export interface StoryView extends BaseView {
    // score: 100 poena kad prvi izbor pomaže, 50 ako je bio potreban još neki izbor
    // correctCount: koraci u kojima je prvi izbor pomogao; incorrectCount: ukupno izbora koji manje pomažu
    // round / totalRounds: trenutni korak priče (od 1) i broj koraka
    phase: StoryPhase;
    mode: StoryMode;
    /** Indeks koraka priče, od 0 */
    stepIndex: number;
    /** Zabeleženi izbori, po jedan zapis za svaki korak */
    records: StepRecord[];
    /** Korak se još čita naglas: izbori su zaključani */
    listening: boolean;
    /** Koraci rešeni tek uz pomoć */
    promptedCount: number;
}

const ACCENT = getGame("social-story").accent;
const MODES: readonly { id: StoryMode; icon: string; label: string }[] = [
    { id: "read", icon: "📖", label: "Čitaj priču" },
    { id: "choose", icon: "👆", label: "Čitaj i biraj" },
];
const IDEAS_HEADING = "Ovo može da pomogne:";
const ALSO_HEADING = "I ovo može da pomogne:";
const AFFIRM_LABEL = "To već znam";
const LISTENING_TEXT = "Slušamo…";
const HELPS_TEXT = "To pomaže.";
const RETRY_TEXT = "Probaj nešto drugo.";
const HINT_TEXT = "Probaj još jednom, polako.";
const SCROLL_DELAY_MS = 60;
const CELEBRATION_MS = 1100;
const POINTS_FIRST_PICK = 100;
const POINTS_LATER_PICK = 50;

/** Zapisi za sve korake. `random` (seme dvoboja ili nasumično, kit/random.ts) meša redosled ponuđenih izbora; null = bez mešanja. */
function createRecords(story: Story, choiceLimit: number, random: (() => number) | null): StepRecord[] {
    return story.steps.map((step) => {
        const offered = step.decision ? offeredOptions(step.decision, choiceLimit) : [];
        return { order: random ? shuffle(offered, random) : offered, tried: [], picked: null, hint: false };
    });
}

function createView(story: Story, records: StepRecord[]): StoryView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: story.steps.length,
        phase: "cover",
        mode: "choose",
        stepIndex: 0,
        records,
        listening: false,
        promptedCount: 0,
    };
}

function toCount(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function resolveRecord(raw: unknown, decision: StoryDecision | undefined, fallback: StepRecord): StepRecord {
    if (!decision || typeof raw !== "object" || raw === null) return fallback;
    const source = raw as Partial<Record<keyof StepRecord, unknown>>;
    const order = toIndexList(source.order, decision.options.length);
    if (!order.some((i) => decision.acceptable.includes(i))) return fallback;
    const picked = typeof source.picked === "number" && order.includes(source.picked) && decision.acceptable.includes(source.picked) ? source.picked : null;
    return {
        order,
        tried: toIndexList(source.tried, decision.options.length).filter((i) => order.includes(i) && !decision.acceptable.includes(i)),
        picked,
        hint: source.hint === true,
    };
}

/** Monitor dobija delimično ili zastarelo stanje, pa svaku vrednost svodimo na ono što priča zaista ima. */
function resolveView(raw: Partial<StoryView> | null | undefined, story: Story, fallback: StoryView): StoryView {
    if (!raw) return fallback;
    const stepIndex = Math.min(toCount(raw.stepIndex), story.steps.length - 1);
    const rawRecords: unknown[] = Array.isArray(raw.records) ? raw.records : [];
    return {
        score: toCount(raw.score),
        correctCount: toCount(raw.correctCount),
        incorrectCount: toCount(raw.incorrectCount),
        round: stepIndex + 1,
        totalRounds: story.steps.length,
        phase: raw.phase === "story" || raw.phase === "done" ? raw.phase : "cover",
        mode: raw.mode === "read" ? "read" : "choose",
        stepIndex,
        records: story.steps.map((step, i) => resolveRecord(rawRecords[i], step.decision, fallback.records[i])),
        listening: raw.listening === true,
        promptedCount: toCount(raw.promptedCount),
    };
}

/** Izbori su zaključani dok se korak čita — samo ako na njemu još treba birati. */
function awaitsChoice(story: Story, mode: StoryMode, stepIndex: number, records: StepRecord[]): boolean {
    return mode === "choose" && story.steps[stepIndex].decision !== undefined && records[stepIndex].picked === null;
}

/** Nijedna kartica se ne boji kao „pogrešna”: probani izbori se samo utišaju. */
function optionState(index: number, record: StepRecord, decision: StoryDecision, listening: boolean): ChoiceState {
    if (record.picked !== null) {
        if (index === record.picked) return "correct";
        return decision.acceptable.includes(index) ? "idle" : "dimmed";
    }
    if (listening || record.tried.includes(index)) return "dimmed";
    // Svetli samo jedna kartica: prvi prikazani izbor koji pomaže
    return record.hint && index === record.order.find((i) => decision.acceptable.includes(i)) ? "hint" : "idle";
}

/** Tekst koji se čita na koraku: priča, pa pitanje ili (u režimu čitanja) ideje koje pomažu. */
function narrationOf(step: StoryStep, mode: StoryMode, female: boolean): string {
    const text = genderText(step.text, female);
    const decision = step.decision;
    if (!decision) return text;
    if (mode === "choose") return `${text} ${genderText(decision.question, female)}`;
    const ideas = decision.acceptable.map((i) => genderText(decision.options[i].label, female));
    return `${text} ${IDEAS_HEADING} ${ideas.join(". ")}.`;
}

/** Drugi ponuđeni izbori koji isto pomažu. */
function otherHelpful(decision: StoryDecision, record: StepRecord): number[] {
    return record.order.filter((i) => i !== record.picked && decision.acceptable.includes(i));
}

function explanationSpeech(decision: StoryDecision, record: StepRecord, picked: number, female: boolean): string {
    const why = genderText(decision.options[picked].why, female);
    const others = otherHelpful(decision, record).map((i) => genderText(decision.options[i].label, female));
    return others.length > 0 ? `${why} ${ALSO_HEADING} ${others.join(". ")}.` : why;
}

/** Naziv izbora za dnevnik roditelja — bez navodnika iz samog teksta izbora. */
function quoted(label: string): string {
    return `„${label.replace(/[„”]/g, "")}”`;
}

function scrollIntoViewGently(element: HTMLElement | null) {
    if (!element) return;
    // I sistemsko podešavanje i roditeljevo „Manje animacija” (data-motion na stranici) gase glatko pomeranje
    const reduceMotion =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector('[data-motion="reduced"]') !== null;
    element.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
}

// ── Igra ──────────────────────────────────────────────────────────────────────

export default function SocialStoryGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<StoryView>) {
    // Namerno bez `isFemale` iz kita: `female` je zavisnost `useCallback` funkcija, a React Compiler lint
    // (preserve-manual-memoization) samo za poređenje napisano ovde zna da je vrednost primitivna.
    const female = gender?.toLowerCase() === "female";
    const t = (text: string) => genderText(text, female);
    const story = storyForLevel(level);
    const settings = useChildSettings();
    const hintAfter = settings.hintAfter;
    // Najmlađima se izbori pročitaju sami, jednom; ostali ih čuju na dodir zvučnika
    const readOptionsAloud = settings.activeBand === "young";
    const guard = useInputGuard();
    const { after } = useTimers();
    const sync = useGameSync<StoryView>({ childId, gameId: "social-story", level, isMonitor });
    const { say, stop } = useSpeech(gender);
    const { sayAll, cancel: cancelSpeechQueue } = useSayAll(say);

    // Komponenta se za svaki nivo pravi iznova, pa se izbori biraju i mešaju samo jednom, ovde.
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [view, setView] = useState<StoryView>(() => createView(story, createRecords(story, settings.choiceLimit, isMonitor ? null : random)));
    const viewRef = useRef(view);
    const praise = usePraise();
    const started = useRef(false);
    const finished = useRef(false);
    // Prvi izbor u prvoj priči (režim „Čitaj i biraj”) pokazuje ruka: to je pokazivanje, ne zadatak
    const firstDecision = story.steps.findIndex((item) => item.decision !== undefined);
    const isDemoStep = (stepIndex: number, mode: StoryMode) => level === 1 && mode === "choose" && stepIndex === firstDecision;
    const topRef = useRef<HTMLSpanElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Monitor se ne pravi iznova kad se nivo promeni, pa podrazumevano stanje prati priču.
    const fallbackView = useMemo(() => createView(story, createRecords(story, Infinity, null)), [story]);
    const shown = isMonitor ? resolveView(monitorState, story, fallbackView) : view;
    const step = story.steps[shown.stepIndex];
    const decision = step.decision;
    const record = shown.records[shown.stepIndex];
    const choosing = shown.mode === "choose" && decision !== undefined;
    const isLastStep = shown.stepIndex === story.steps.length - 1;
    const canAdvance = !choosing || record.picked !== null;
    const lastTried = record.tried.length > 0 ? record.tried[record.tried.length - 1] : null;
    const alsoHelpful = decision && record.picked !== null ? otherHelpful(decision, record) : [];

    const commit = useCallback(
        (next: StoryView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    const unlock = useCallback(() => {
        const current = viewRef.current;
        if (!current.listening) return;
        guard.hold();
        commit({ ...current, listening: false });
    }, [commit, guard]);

    /** Čita trenutnu stranicu. Kad se korak sa izborom pročita, izbori se otključaju. */
    const narrate = useCallback(() => {
        const current = viewRef.current;
        // Priča se čita mirnim glasom: stranica često pominje osećanje („strah”, „plače”) koje
        // ne sme da oboji ceo tekst. Pitanje posle nje se pita radoznalo.
        if (current.phase === "cover") {
            // Na kraju naslovne strane glas kaže i šta je sledeće (dete koje ne čita ne zna šta piše na dugmetu)
            sayAll([`Priča: ${story.title}. ${genderText(story.intro, female)}`], undefined, "neutral");
            return;
        }
        if (current.phase !== "story") return;
        const currentStep = story.steps[current.stepIndex];
        const currentDecision = currentStep.decision;
        const afterNarration = () => {
            unlock();
            const latest = viewRef.current;
            if (!readOptionsAloud || !currentDecision || latest.stepIndex !== current.stepIndex) return;
            if (!awaitsChoice(story, latest.mode, latest.stepIndex, latest.records)) return;
            sayAll(latest.records[latest.stepIndex].order.map((i) => genderText(currentDecision.options[i].label, female)));
        };
        if (currentDecision && current.mode === "choose") {
            sayAll(
                [genderText(currentStep.text, female)],
                () => sayAll([genderText(currentDecision.question, female)], afterNarration, "curious"),
                "neutral"
            );
            return;
        }
        sayAll([narrationOf(currentStep, current.mode, female)], afterNarration, "neutral");
    }, [sayAll, unlock, story, female, readOptionsAloud]);

    useEffect(() => {
        if (isMonitor || started.current) return;
        started.current = true;
        sync.start(viewRef.current);
    }, [isMonitor, sync]);

    // Svaka nova stranica se pročita naglas; izbori čekaju kraj čitanja, ali ne duže od LISTEN_MAX_MS
    // (duža stranica dobija duže čekanje, da se izbori ne otključaju pre nego što se pitanje čuje)
    const pageText = view.phase === "story" ? narrationOf(story.steps[view.stepIndex], view.mode, female) : "";
    useListenGate(!isMonitor && view.phase !== "done", `${view.phase}:${view.stepIndex}`, narrate, unlock, listenLimitFor(pageText));

    // Na telefonu: nova stranica se čita od vrha
    useEffect(() => {
        if (!isMonitor) scrollIntoViewGently(topRef.current);
    }, [isMonitor, view.phase, view.stepIndex]);

    // Pomoć posle čekanja: na koraku sa izborom, kad je čitanje gotovo, a dete dugo ništa ne dodirne,
    // jedan izbor koji pomaže blago zasvetli
    useWaitHint(!isMonitor && settings.waitHint && view.phase === "story" && !view.listening, `${view.stepIndex}:${view.listening}`, () => {
        const current = viewRef.current;
        const record = current.records[current.stepIndex];
        if (current.phase !== "story" || current.listening || !record || record.hint || record.picked !== null) return;
        if (!story.steps[current.stepIndex]?.decision || current.mode !== "choose") return;
        if (isDemoStep(current.stepIndex, current.mode) && record.tried.length === 0) return; // tu pokazuje ruka
        const records = current.records.map((item, i) => (i === current.stepIndex ? { ...item, hint: true } : item));
        commit({ ...current, records }, `Korak ${current.stepIndex + 1}: pomoć posle čekanja`);
    });

    const silence = () => {
        cancelSpeechQueue();
        stop();
    };

    const selectMode = (mode: StoryMode) => {
        const current = viewRef.current;
        if (isMonitor || current.phase !== "cover") return;
        const label = MODES.find((item) => item.id === mode)?.label ?? "";
        playSfx("tap");
        sayAll([label]);
        if (current.mode !== mode) commit({ ...current, mode }, `Izabran način: ${label}`);
    };

    const begin = () => {
        if (isMonitor || guard.blocked()) return;
        const current = viewRef.current;
        if (current.phase !== "cover") return;
        const label = MODES.find((item) => item.id === current.mode)?.label ?? "";
        silence();
        guard.hold();
        playSfx("tap");
        commit(
            { ...current, phase: "story", listening: awaitsChoice(story, current.mode, 0, current.records) },
            `Priča „${story.title}” je počela (${label})`
        );
    };

    const choose = (optionIndex: number) => {
        if (isMonitor || guard.blocked()) return;
        const current = viewRef.current;
        if (current.phase !== "story" || current.mode !== "choose" || current.listening) return;
        const currentDecision = story.steps[current.stepIndex].decision;
        const currentRecord = current.records[current.stepIndex];
        if (!currentDecision || currentRecord.picked !== null) return;
        if (!currentRecord.order.includes(optionIndex) || currentRecord.tried.includes(optionIndex)) return;
        const option = currentDecision.options[optionIndex];
        const label = quoted(t(option.label));
        const place = `Korak ${current.round}/${current.totalRounds}`;
        const withRecord = (next: StepRecord) => current.records.map((item, i) => (i === current.stepIndex ? next : item));

        if (currentDecision.acceptable.includes(optionIndex)) {
            const attempt = currentRecord.tried.length + 1;
            const modeled = isDemoStep(current.stepIndex, current.mode);
            const picked: StepRecord = { ...currentRecord, picked: optionIndex };
            const next: StoryView = {
                ...current,
                records: withRecord(picked),
                score: current.score + (attempt === 1 ? POINTS_FIRST_PICK : POINTS_LATER_PICK),
                correctCount: current.correctCount + (attempt === 1 && !currentRecord.hint && !modeled ? 1 : 0),
                promptedCount: current.promptedCount + (currentRecord.hint && !modeled ? 1 : 0),
            };
            const how = attempt === 1 ? (currentRecord.hint ? " uz pomoć" : "") : ` iz ${attempt}. pokušaja${currentRecord.hint ? ", uz pomoć" : ""}`;
            playSfx("correct");
            commit(next, `${place}: izbor koji pomaže${how}: ${label}`);
            // Ekran se pomera ka objašnjenju: drugi dodir dvostrukog dodira ne sme da pritisne „Dalje”
            guard.hold();
            sayAll([praise(explanationSpeech(currentDecision, picked, optionIndex, female), attempt === 1 && !currentRecord.hint && !modeled)], undefined, "happy");
        } else {
            const tried = [...currentRecord.tried, optionIndex];
            const lessHelpfulOffered = currentRecord.order.filter((i) => !currentDecision.acceptable.includes(i)).length;
            const hint = currentRecord.hint || hintDue(hintAfter, tried.length, lessHelpfulOffered);
            const next: StoryView = {
                ...current,
                records: withRecord({ ...currentRecord, tried, hint }),
                incorrectCount: current.incorrectCount + 1,
            };
            playSfx("tap");
            commit(next, `${place}: izbor koji manje pomaže: ${label}${hint && !currentRecord.hint ? " (prikazana pomoć)" : ""}`);
            sayAll([`${t(option.why)} ${hint ? HINT_TEXT : RETRY_TEXT}`], undefined, "gentle");
        }
        // Na telefonu: objašnjenje i dugmad ne ostaju ispod ivice ekrana
        after(SCROLL_DELAY_MS, () => scrollIntoViewGently(bottomRef.current));
    };

    const speakOption = (optionIndex: number) => {
        if (viewRef.current.listening || !decision) return;
        sayAll([t(decision.options[optionIndex].label)]);
    };

    const repeat = () => {
        const current = viewRef.current;
        const currentDecision = story.steps[current.stepIndex].decision;
        const currentRecord = current.records[current.stepIndex];
        const picked = current.phase === "story" && current.mode === "choose" ? currentRecord.picked : null;
        if (currentDecision && picked !== null) sayAll([explanationSpeech(currentDecision, currentRecord, picked, female)]);
        else narrate();
    };

    /** Prelazak na drugi korak. Zabeleženi izbori ostaju kakvi jesu. */
    const goTo = (stepIndex: number, log: string) => {
        const current = viewRef.current;
        silence();
        guard.hold();
        playSfx("tap");
        commit(
            { ...current, stepIndex, round: stepIndex + 1, listening: awaitsChoice(story, current.mode, stepIndex, current.records) },
            `Korak ${stepIndex + 1}/${current.totalRounds}: ${log}`
        );
    };

    const finish = () => {
        if (finished.current) return;
        finished.current = true;
        const current = viewRef.current;
        const reading = current.mode === "read";
        // Samo čitanje nije ocenjivan učinak: bez zadataka, da ne ulepšava statistiku tačnosti
        // Pokazni izbor (prva priča) se ne ocenjuje; svaka priča ima bar dva izbora (test)
        const total = reading ? 0 : decisionCount(story) - (level === 1 ? 1 : 0);
        const correct = reading ? 0 : current.correctCount;
        const done: StoryView = { ...current, phase: "done", listening: false };
        silence();
        // Zvuk kraja nivoa (i zvezdice) pušta strana koja prikazuje rezultat — ovde ništa, da se ne čuje dvaput
        commit(
            done,
            reading
                ? `Priča „${story.title}” je pročitana (samo čitanje)`
                : `Priča „${story.title}” je pročitana: ${correct}/${total} iz prvog izbora, ${done.promptedCount} uz pomoć`
        );
        // Kratka pauza, pa rezultat ide roditeljskom okviru tačno jednom
        after(CELEBRATION_MS, () => {
            sync.complete(done);
            onComplete({
                score: reading ? 0 : done.score,
                durationSec: sync.elapsedSec(),
                correct,
                total,
                prompted: reading ? 0 : done.promptedCount,
            });
        });
    };

    const advance = () => {
        if (isMonitor || guard.blocked()) return;
        const current = viewRef.current;
        if (current.phase !== "story" || awaitsChoice(story, current.mode, current.stepIndex, current.records)) return;
        if (current.stepIndex >= story.steps.length - 1) finish();
        else goTo(current.stepIndex + 1, "sledeća stranica");
    };

    const back = () => {
        if (isMonitor || guard.blocked()) return;
        const current = viewRef.current;
        if (current.phase !== "story" || current.stepIndex === 0) return;
        goTo(current.stepIndex - 1, "nazad na prethodnu stranicu");
    };

    const modeLabel = MODES.find((item) => item.id === shown.mode)?.label;
    const showScore = shown.mode === "choose" && (isMonitor || settings.preset.showPoints);

    return (
        <GameStage>
            <span ref={topRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-px w-px scroll-mt-4" />

            <GameHud
                unit="Korak"
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={showScore ? shown.score : undefined}
                onSpeak={isMonitor || shown.phase === "done" ? undefined : repeat}
                extra={
                    isMonitor && shown.phase !== "cover" ? (
                        <span className={cn("shrink-0 rounded-xl border px-3 py-2 text-xs font-extrabold sm:text-sm", ACCENT.soft, ACCENT.text, ACCENT.border)}>
                            {modeLabel}
                        </span>
                    ) : undefined
                }
            />

            {shown.phase === "cover" && (
                <section
                    aria-label={`Priča: ${story.title}`}
                    // Položen telefon: slika levo, naslov i izbor načina čitanja desno
                    className="mx-auto w-full max-w-2xl animate-pop overflow-hidden rounded-card border border-line bg-surface shadow-lift flat:grid flat:max-w-4xl flat:grid-cols-2 flat:items-center"
                >
                    <div aria-hidden="true" className={cn("h-2 bg-linear-to-r flat:col-span-2 flat:self-start", ACCENT.gradient)} />
                    <Scene emojis={story.cover} tone={story.tone} size="cover" picture={storyScene(level, "cover")} female={female} />
                    <div className="flex flex-col items-center gap-3 px-4 py-5 text-center sm:gap-4 sm:px-8 sm:py-8 short:sm:gap-3 short:sm:py-5 flat:gap-2 flat:sm:gap-2 flat:sm:px-4 flat:sm:py-2">
                        <p className={cn("rounded-full border px-3 py-1 text-sm font-extrabold flat:hidden", ACCENT.soft, ACCENT.text, ACCENT.border)}>
                            Priča u {story.steps.length} koraka
                        </p>
                        <h2 className="text-3xl font-extrabold leading-tight text-ink sm:text-5xl short:sm:text-3xl flat:text-2xl flat:sm:text-2xl">{story.title}</h2>
                        <p className="max-w-md text-lg font-bold leading-snug text-ink-soft sm:text-xl short:sm:text-lg flat:text-base flat:sm:text-base [@media(max-height:30rem)]:text-[0.9rem]! [@media(max-height:30rem)]:leading-tight!">{t(story.intro)}</p>

                        <div role="radiogroup" aria-label="Način čitanja" className="mt-1 grid w-full max-w-md grid-cols-2 gap-3">
                            {MODES.map((item) => {
                                const selected = shown.mode === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        disabled={isMonitor}
                                        onClick={() => selectMode(item.id)}
                                        className={cn(
                                            "flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-base font-extrabold leading-tight transition-colors disabled:cursor-default sm:text-lg short:sm:min-h-16 flat:min-h-12 flat:flex-row flat:gap-2 flat:py-1 flat:sm:min-h-12 flat:sm:text-base",
                                            selected ? "border-brand-500 bg-brand-50 text-brand-800" : "border-line bg-surface text-ink-soft"
                                        )}
                                    >
                                        <span aria-hidden="true" className="text-3xl leading-none flat:text-2xl">
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>

                        <PrimaryButton onClick={begin} disabled={isMonitor} className="mt-2 w-full sm:w-auto sm:min-w-56 short:sm:mt-0 flat:mt-0 flat:sm:min-h-12 flat:sm:text-xl">
                            Počni priču
                        </PrimaryButton>
                    </div>
                </section>
            )}

            {shown.phase === "story" && (
                <>
                    <div
                        key={`${level}-${shown.stepIndex}`}
                        className={cn(
                            "grid animate-fade-up sm:gap-5 flat:sm:gap-3",
                            choosing ? "gap-3" : "gap-4",
                            // Položen telefon: korak sa izborom u dve kolone (priča levo, pitanje i izbori desno)
                            choosing ? "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start flat:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] flat:items-start" : "mx-auto w-full max-w-2xl flat:max-w-4xl"
                        )}
                    >
                        {/* Položen telefon: stranica priče je slika levo i tekst desno */}
                        <article className={cn("overflow-hidden rounded-card border border-line bg-surface shadow-soft", !choosing && "flat:grid flat:grid-cols-2 flat:items-center")}>
                            {/* Korak sa izborom na telefonu: slika je sličica pored teksta, da izbori stanu na ekran */}
                            <div className={cn(choosing && "hidden lg:block")}>
                                <Scene
                                    emojis={step.scene}
                                    tone={story.tone}
                                    size={choosing ? "choice" : "page"}
                                    label={`${story.icon} ${story.title}`}
                                    picture={storyScene(level, shown.stepIndex)}
                                    female={female}
                                />
                            </div>
                            <div className={cn("flex gap-3 px-4 sm:px-6 sm:py-5 short:sm:py-4 flat:gap-2 flat:sm:px-3 flat:sm:py-3", choosing ? "flex-row items-start py-3 lg:flex-col flat:flex-col" : "flex-col py-4")}>
                                {choosing && (
                                    <div className="w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5 sm:w-32 lg:hidden flat:mx-auto flat:sm:w-[min(100%,24dvh)] [@media(max-height:30rem)]:hidden">
                                        <Scene emojis={step.scene} tone={story.tone} size="thumb" picture={storyScene(level, shown.stepIndex)} female={female} />
                                    </div>
                                )}
                                <div className="flex min-w-0 flex-1 flex-col gap-3">
                                {step.affirm && (
                                    <p className={cn("self-start rounded-full border px-3 py-1 text-sm font-extrabold", ACCENT.soft, ACCENT.text, ACCENT.border)}>
                                        <span aria-hidden="true">⭐ </span>
                                        {AFFIRM_LABEL}
                                    </p>
                                )}
                                {/* Nizak ekran (manji tablet): zbijeniji red i nešto manja slova (i dalje bar 18 px), da stranica stane bez pomeranja */}
                                <p
                                    className={cn(
                                        "font-bold leading-snug text-ink",
                                        choosing ? "text-lg sm:text-xl short:sm:text-lg flat:sm:text-base" : "text-xl sm:text-2xl sm:leading-relaxed short:sm:text-xl short:sm:leading-snug flat:sm:text-lg"
                                    )}
                                >
                                    {t(step.text)}
                                </p>
                                {decision && shown.mode === "read" && (
                                    <div className={cn("rounded-2xl border p-4 short:sm:px-4 short:sm:py-3", ACCENT.soft, ACCENT.border)}>
                                        <p className={cn("text-base font-extrabold sm:text-lg", ACCENT.text)}>{IDEAS_HEADING}</p>
                                        <ul className="mt-2 grid gap-2 short:sm:mt-1.5 short:sm:gap-1.5">
                                            {decision.acceptable.map((optionIndex) => (
                                                <li key={optionIndex} className="flex items-center gap-3 text-lg font-bold leading-snug text-ink sm:text-xl short:sm:text-lg">
                                                    <OptionThumb text={decision.options[optionIndex].label} female={female} className="h-11 w-11 short:sm:h-9 short:sm:w-9" />
                                                    {t(decision.options[optionIndex].label)}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                </div>
                            </div>
                        </article>

                        {choosing && decision && (
                            <section aria-label="Pitanje i izbori" className="flex min-w-0 flex-col gap-3 flat:gap-2">
                                {/* Odgovor stoji na mestu pitanja (ne ispod izbora): stranica tako staje na ekran bez pomeranja */}
                                <div aria-live="polite" className="min-w-0">
                                    {record.picked !== null ? (
                                        <div className="animate-fade-up rounded-card border-2 border-emerald-200 bg-emerald-50 px-4 py-3 sm:px-5 sm:py-4 short:sm:py-3">
                                            {/* Kvačica umesto posebnog reda „To pomaže.” (čitač ekrana ga i dalje čuje) */}
                                            <p className="flex items-start gap-2.5 text-lg font-bold leading-snug text-ink sm:text-xl short:sm:text-lg">
                                                <span aria-hidden="true" className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-black text-white">
                                                    ✓
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="sr-only">{HELPS_TEXT} </span>
                                                    {t(decision.options[record.picked].why)}
                                                </span>
                                            </p>
                                            {alsoHelpful.length > 0 && (
                                                <p className="mt-1.5 text-base font-bold leading-snug text-ink-soft sm:text-lg short:sm:text-base">
                                                    {ALSO_HEADING}{" "}
                                                    {alsoHelpful.map((optionIndex) => (
                                                        <span key={optionIndex} className="mr-2 inline-block">
                                                            <OptionThumb text={decision.options[optionIndex].label} female={female} className="mr-1 inline-block h-7 w-7 rounded-md align-middle" />
                                                            {t(decision.options[optionIndex].label)}
                                                        </span>
                                                    ))}
                                                </p>
                                            )}
                                        </div>
                                    ) : lastTried !== null ? (
                                        <TriedNote
                                            key={lastTried}
                                            icon={<OptionThumb text={decision.options[lastTried].label} female={female} className="h-9 w-9 rounded-lg" />}
                                            label={t(decision.options[lastTried].label)}
                                            note={
                                                <>
                                                    {t(decision.options[lastTried].why)}{" "}
                                                    <span className="text-sun-700">{record.hint ? HINT_TEXT : RETRY_TEXT}</span>
                                                </>
                                            }
                                        />
                                    ) : (
                                        <GamePrompt title={t(decision.question)} />
                                    )}
                                </div>

                                <div className="relative">
                                    {/* Dok se korak čita, oznaka stoji preko utišanih izbora: ne zauzima svoj red, pa se ništa ne pomera */}
                                    <p
                                        role="status"
                                        className={cn(
                                            "pointer-events-none absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-surface px-5 py-2.5 text-lg font-extrabold text-ink-soft shadow-soft ring-1 ring-line",
                                            !shown.listening && "invisible"
                                        )}
                                    >
                                        {shown.listening && (
                                            <>
                                                <span aria-hidden="true">👂</span>
                                                {LISTENING_TEXT}
                                            </>
                                        )}
                                    </p>
                                    <ul className={cn("grid gap-2 sm:gap-3", OPTION_GRID[record.order.length] ?? OPTION_GRID[3])}>
                                        {record.order.map((optionIndex) => {
                                            const option = decision.options[optionIndex];
                                            const label = t(option.label);
                                            const state = optionState(optionIndex, record, decision, shown.listening);
                                            const wasTried = record.tried.includes(optionIndex);
                                            const locked = isMonitor || shown.listening || record.picked !== null || wasTried;
                                            const status = state === "correct" ? ", to pomaže" : wasTried ? ", već probano" : "";
                                            const showHand =
                                                !isMonitor &&
                                                !shown.listening &&
                                                isDemoStep(shown.stepIndex, shown.mode) &&
                                                record.picked === null &&
                                                record.tried.length === 0 &&
                                                optionIndex === record.order.find((i) => decision.acceptable.includes(i));
                                            return (
                                                <li key={optionIndex} className="relative flex min-w-0 flex-col items-center gap-1.5">
                                                    <ChoiceCard
                                                        state={state}
                                                        disabled={locked}
                                                        onClick={() => choose(optionIndex)}
                                                        aria-label={`${label}${status}`}
                                                        className="h-full w-full min-w-0 flex-1 p-1.5! sm:p-2.5! flat:sm:p-1.5!"
                                                    >
                                                        {/* Izbor je slika: dete radi baš to; natpis je ispod */}
                                                        <OptionPicture text={option.label} label={label} emoji={option.emoji} female={female}>
                                                            {showHand && <DemoHand />}
                                                        </OptionPicture>
                                                    </ChoiceCard>
                                                    {!isMonitor && (
                                                        // Zvučnik je mali da ne pokrije sliku, a nevidljiv okvir oko njega daje dodiru bar 48 px
                                                        <span className="absolute right-1 top-1 z-10 sm:right-2 sm:top-2 [&>button]:relative [&>button]:min-h-9 [&>button]:w-9 [&>button]:rounded-xl [&>button]:after:absolute [&>button]:after:-inset-1.5 [&>button]:after:content-[''] sm:[&>button]:min-h-10 sm:[&>button]:w-10 sm:[&>button]:after:-inset-1">
                                                            <OptionSpeaker label={`Pročitaj: ${label}`} disabled={shown.listening} onClick={() => speakOption(optionIndex)} />
                                                        </span>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Položen telefon, korak sa izborom: dugmad stoje ispod priče u levoj koloni (desno su izbori) */}
                    <div
                        ref={bottomRef}
                        className={cn("flex scroll-mb-4 items-stretch gap-3", !choosing && "mx-auto w-full max-w-2xl flat:max-w-4xl", choosing && "flat:absolute flat:bottom-0 flat:left-0 flat:w-[calc(41.667%-0.5rem)]")}
                    >
                        {shown.stepIndex > 0 && <BackButton onClick={back} disabled={isMonitor} />}
                        {canAdvance && (
                            <PrimaryButton onClick={advance} disabled={isMonitor} className="ml-auto min-w-0 flex-1 sm:min-w-56 sm:flex-none">
                                {isLastStep ? "Završi priču" : "Dalje"}
                            </PrimaryButton>
                        )}
                    </div>
                </>
            )}

            {shown.phase === "done" && (
                <div className="grid flex-1 place-items-center">
                    <div role="status" className="w-full max-w-md animate-pop rounded-card border border-line bg-surface px-6 py-8 text-center shadow-lift">
                        <p aria-hidden="true" className="text-7xl leading-none">
                            {story.icon}
                        </p>
                        <p className="mt-4 font-display text-3xl font-extrabold text-ink sm:text-4xl">Kraj priče</p>
                        <p className="mt-2 text-lg font-bold text-ink-soft sm:text-xl">{t("{Pročitao|Pročitala} si celu priču.")}</p>
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
    // Korak sa izborom (tablet): manja slika, da pitanje, izbori i objašnjenje stanu pored nje
    choice: { box: "h-32 sm:h-40", main: "text-7xl", side: "text-5xl" },
    thumb: { box: "h-20 sm:h-24", main: "text-4xl", side: "text-3xl" },
};

interface SceneProps {
    /** Prvi emodži je glavni; uz dva sporedna glavni stoji u sredini (rezerva kad nema crteža) */
    emojis: readonly string[];
    tone: SceneTone;
    size?: keyof typeof SCENE_SIZES;
    /** Naziv priče u uglu slike */
    label?: string;
    /** Crtež stranice (data/storyScenes.ts) */
    picture?: SceneSpec;
    /** Pol deteta: priča je u prvom licu, pa je glavni lik na crtežu dete koje igra */
    female: boolean;
}

/** Najveća širina crteža: tolika da mu visina (2/3 širine) ne pređe zadati deo ekrana */
const PICTURE_WIDTH = {
    page: "max-w-[min(100%,30dvh)] lg:max-w-[min(100%,32dvh)] short:max-w-[min(100%,20dvh)] flat:max-w-[min(100%,52dvh)]",
    cover: "max-w-[min(100%,42dvh)] short:max-w-[min(100%,20dvh)] flat:max-w-[min(100%,52dvh)]",
    choice: "max-w-[min(100%,26dvh)] short:max-w-[min(100%,22dvh)]",
    thumb: "",
};

/** Slika jedne stranice: crtež situacije (ili nebo, tlo i nekoliko velikih emodžija), kao ilustracija u slikovnici. */
function Scene({ emojis, tone, size = "page", label, picture, female }: SceneProps) {
    const [main, ...sides] = emojis;
    const figures = sides.length >= 2 ? [sides[0], main, sides[1]] : [main, ...sides];
    const mainAt = sides.length >= 2 ? 1 : 0;
    const colors = SCENE_TONES[tone];
    const sizes = SCENE_SIZES[size];

    if (picture && size === "thumb") {
        return <SceneArt spec={picture} hero={storyHero(female)} className="block h-auto w-full" />;
    }

    if (picture) {
        return (
            <div className={cn("relative bg-linear-to-b p-3 sm:px-5 sm:pb-4 short:sm:py-2", colors.sky)}>
                <div className={cn("relative mx-auto w-full overflow-hidden rounded-2xl bg-surface shadow-soft ring-1 ring-black/5", PICTURE_WIDTH[size])}>
                    <SceneArt spec={picture} hero={storyHero(female)} className="h-auto w-full" />
                </div>
                {label && (
                    <p className={cn("absolute left-2 top-2 rounded-full border bg-surface px-2.5 py-0.5 text-xs font-extrabold sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-sm", ACCENT.text, ACCENT.border)}>
                        {label}
                    </p>
                )}
            </div>
        );
    }

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

interface NavButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

interface PrimaryButtonProps extends NavButtonProps {
    children: ReactNode;
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
                "inline-flex min-h-14 sm:min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-b-[5px] border-brand-700 bg-brand-500 px-8 font-display text-xl font-extrabold text-white shadow-soft transition-[transform,background-color,border-width] enabled:hover:bg-brand-600 enabled:active:translate-y-[3px] enabled:active:border-b-2 disabled:cursor-default sm:text-2xl",
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

/** Povratak na prethodnu stranicu priče. */
function BackButton({ onClick, disabled }: NavButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="inline-flex min-h-14 sm:min-h-16 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] border-line bg-surface px-5 font-display text-lg font-extrabold text-ink-soft shadow-soft transition-[transform,background-color,border-width] enabled:hover:bg-brand-50 enabled:active:translate-y-[3px] enabled:active:border-b-2 disabled:cursor-default sm:px-6 sm:text-xl"
        >
            <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                <path d="M19 12H5M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Nazad
        </button>
    );
}
