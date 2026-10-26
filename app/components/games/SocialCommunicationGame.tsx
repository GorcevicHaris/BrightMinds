"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import {
    ChoiceCard,
    DemoHand,
    demoRounds,
    ExplainPanel,
    Feedback,
    GameHud,
    GamePrompt,
    GameStage,
    genderText,
    hintDue,
    offeredOptions,
    OptionSpeaker,
    playSfx,
    shuffle,
    toCount,
    toIndexList,
    TriedNote,
    useGameSync,
    useInputGuard,
    useListenGate,
    useSayAll,
    type BaseView,
    type ChoiceState,
    type FeedbackKind,
    type GameProps,
    useWaitHint,
    usePraise,
    useGameRandom,
} from "@/app/components/games/kit";
import {
    getSituation,
    getSituationsForLevel,
    type SituationKind,
    type SocialOption,
    type SocialSituation,
} from "./data/socialSituations";
import { socialScene } from "./data/socialScenes";
import { OPTION_GRID, OptionPicture, OptionThumb } from "./OptionPicture";
import { SceneArt } from "./scene/SceneArt";

// ── Stanje ────────────────────────────────────────────────────────────────────
// Sve što utiče na prikaz je u jednom JSON objektu koji se šalje live monitoru.
//
// Igra vežba korisne rečenice, a ne „tačno i pogrešno”: situacija obično ima više
// izbora koji pomažu. `correctCount` broji situacije u kojima je PRVI izbor bio
// jedan od njih (iz toga se računaju zvezdice), `promptedCount` one rešene tek
// pošto je kartica zasvetlela, a `incorrectCount` sve izbore koji manje pomažu.

export interface SocialView extends BaseView {
    /** Situacija koja je na tabli */
    situationId: number;
    /** Indeksi ponuđenih izbora, u redosledu prikaza */
    order: number[];
    /** Primer (model) je pročitan i izbori su na ekranu */
    optionsShown: boolean;
    /** Izbori koji manje pomažu, redom kojim su probani u ovoj situaciji */
    tried: number[];
    /** Izabran izbor koji pomaže; čeka se „Dalje” */
    picked: number | null;
    /** Jedna kartica koja pomaže blago svetli */
    hint: boolean;
    /** Situacije rešene tek uz pomoć */
    promptedCount: number;
    /** Nivo je završen (kratka pauza pre zvezdica) */
    finished: boolean;
}

interface Round {
    situationId: number;
    order: number[];
}

const ACCENT = getGame("social").accent;
const MODEL_LABEL = "Primer";
const LISTENING_TEXT = "Slušamo…";
const HELPS_TEXT = "To pomaže.";
const RETRY_TEXT = "Probaj nešto drugo.";
const HINT_TEXT = "Probaj još jednom, polako.";
const KIND_LABEL: Record<SituationKind, string> = { polite: "učtivost", advocacy: "zastupanje sebe" };
const CELEBRATE_MS = 1000;
/** Poeni prema broju izbora koji manje pomažu pre onog koji pomaže */
const POINTS = [100, 60, 30];

/** Situacije nivoa kao zadaci. `randomize` meša redosled ponuđenih izbora. */
function buildRounds(level: number, choiceLimit: number, maxRounds: number, random: (() => number) | null): Round[] {
    // Zastupanje sebe je drugo u nizu, pa ostaje u nivou i kad je on skraćen; tek onda se
    // redosled meša, da isti nivo ne počinje uvek istom situacijom
    const picked = getSituationsForLevel(level).slice(0, Math.max(maxRounds, 1));
    return (random ? shuffle(picked, random) : picked)
        .map((situation) => {
            const offered = offeredOptions(situation, choiceLimit);
            return { situationId: situation.id, order: random ? shuffle(offered, random) : offered };
        });
}

function initialView(rounds: Round[]): SocialView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: rounds.length,
        situationId: rounds[0].situationId,
        order: rounds[0].order,
        optionsShown: false,
        tried: [],
        picked: null,
        hint: false,
        promptedCount: 0,
        finished: false,
    };
}

/** Stanje sa monitora može biti prazno ili nepotpuno — sve što fali ili nema smisla menja se podrazumevanim. */
function mergeMonitorView(fallback: SocialView, state: Partial<SocialView> | null | undefined): SocialView {
    if (!state) return fallback;
    const situation = typeof state.situationId === "number" ? getSituation(state.situationId) : undefined;
    const order = situation ? toIndexList(state.order, situation.options.length) : [];
    const board = situation && order.some((i) => situation.acceptable.includes(i)) ? situation : undefined;
    const totalRounds = Math.max(toCount(state.totalRounds, fallback.totalRounds), 1);
    const picked = board && typeof state.picked === "number" && order.includes(state.picked) && board.acceptable.includes(state.picked) ? state.picked : null;
    return {
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        situationId: board ? board.id : fallback.situationId,
        order: board ? order : fallback.order,
        optionsShown: Boolean(board) && state.optionsShown === true,
        tried: board ? toIndexList(state.tried, board.options.length).filter((i) => order.includes(i) && !board.acceptable.includes(i)) : [],
        picked,
        hint: Boolean(board) && state.hint === true,
        promptedCount: toCount(state.promptedCount, 0),
        finished: state.finished === true,
    };
}

/** Svetli samo jedna kartica: prvi prikazani izbor koji pomaže. */
function hintTarget(view: SocialView, situation: SocialSituation): number | null {
    if (!view.hint || view.picked !== null) return null;
    return view.order.find((i) => situation.acceptable.includes(i)) ?? null;
}

/** Nijedna kartica se ne boji kao „pogrešna”: probani izbori se samo utišaju. */
function choiceState(index: number, view: SocialView, situation: SocialSituation): ChoiceState {
    if (view.picked !== null) {
        if (index === view.picked) return "correct";
        return situation.acceptable.includes(index) ? "idle" : "dimmed";
    }
    if (view.tried.includes(index)) return "dimmed";
    return index === hintTarget(view, situation) ? "hint" : "idle";
}

/** Tekst izbora za prikaz i dnevnik: rečenice stoje pod navodnicima. */
function optionLabel(option: SocialOption, female: boolean): string {
    const text = genderText(option.text, female);
    return option.type === "say" ? `„${text}”` : text;
}

/** Rečenica za ponavljanje: ona koju je dete izabralo ili, uz radnju, rečenica iz primera. */
function echoLine(situation: SocialSituation, picked: number, female: boolean): string {
    const option = situation.options[picked];
    if (option.type === "say") return `Možeš da kažeš: ${optionLabel(option, female)}`;
    return `Možeš i da kažeš: „${genderText(situation.script, female)}”`;
}

/** Uz izabranu rečenicu: drugi ponuđeni izbor koji isto pomaže. */
function alsoLine(situation: SocialSituation, picked: number, order: number[], female: boolean): string | null {
    if (situation.options[picked].type !== "say") return null;
    const others = order.filter((i) => i !== picked && situation.acceptable.includes(i));
    if (others.length === 0) return null;
    return `I ovo pomaže: ${others.map((i) => optionLabel(situation.options[i], female)).join(" ")}`;
}

function explanationSpeech(situation: SocialSituation, picked: number, order: number[], female: boolean): string {
    const parts = [genderText(situation.options[picked].note, female), echoLine(situation, picked, female), alsoLine(situation, picked, order, female)];
    return parts.filter(Boolean).join(" ");
}

// ── Igra ──────────────────────────────────────────────────────────────────────

export default function SocialCommunicationGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<SocialView>) {
    // Namerno bez `isFemale` iz kita: `female` je zavisnost više `useCallback` funkcija, a React Compiler lint
    // (preserve-manual-memoization) samo za poređenje napisano ovde zna da je vrednost primitivna.
    const female = gender?.toLowerCase() === "female";
    const settings = useChildSettings();
    const hintAfter = settings.hintAfter;
    // Najmlađima se izbori pročitaju sami, jednom; ostali ih čuju na dodir zvučnika
    const readOptionsAloud = settings.activeBand === "young";
    const guard = useInputGuard();
    const sync = useGameSync<SocialView>({ childId, gameId: "social", level, isMonitor });
    const { say, stop } = useSpeech(gender);
    const { sayAll, cancel: cancelSpeechQueue } = useSayAll(say);

    // Komponenta se za svaki nivo pravi iznova, pa se izbori biraju i mešaju samo jednom, ovde.
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [rounds] = useState(() => buildRounds(level, settings.choiceLimit, settings.preset.maxRounds, isMonitor ? null : random));
    const [view, setView] = useState(() => initialView(rounds));
    const viewRef = useRef(view);
    const praise = usePraise();
    const finishTimer = useRef<number | null>(null);
    const startedRef = useRef(false);
    const completedRef = useRef(false);
    const nextButtonRef = useRef<HTMLButtonElement>(null);
    const optionsEndRef = useRef<HTMLSpanElement>(null);

    // Na niskom ekranu izbori bi ostali ispod ivice: kad se pojave, ekran se pomeri tačno toliko da
    // i poslednji izbor bude vidljiv (primer je već pročitan i ide iznad); kad sve staje, ništa se ne pomera.
    useEffect(() => {
        if (isMonitor || !view.optionsShown) return;
        const target = optionsEndRef.current;
        if (!target) return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector('[data-motion="reduced"]') !== null;
        const timer = window.setTimeout(() => target.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }), 150);
        return () => window.clearTimeout(timer);
    }, [isMonitor, view.optionsShown, view.round]);

    // Monitor se ne pravi iznova kad se nivo promeni, pa podrazumevano stanje prati `level`.
    // Dok stanje ne stigne, monitor vidi celu prvu situaciju (primer, pitanje i izbore).
    const fallbackView = useMemo(() => ({ ...initialView(buildRounds(level, Infinity, Infinity, null)), optionsShown: true }), [level]);
    const shown = isMonitor ? mergeMonitorView(fallbackView, monitorState) : view;
    const situation = getSituation(shown.situationId) ?? getSituationsForLevel(level)[0];
    // Slika primera: dete iz primera u toj situaciji (emodži ostaje samo kao rezerva)
    const picture = socialScene(situation.id);
    const lastTried = shown.tried.length > 0 ? shown.tried[shown.tried.length - 1] : null;
    const feedback: FeedbackKind = shown.picked !== null ? "correct" : lastTried !== null ? "wrong" : null;

    const commit = useCallback(
        (next: SocialView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    const revealOptions = useCallback(() => {
        const current = viewRef.current;
        if (current.optionsShown || current.finished) return;
        guard.hold();
        commit({ ...current, optionsShown: true });
    }, [commit, guard]);

    const speakQuestion = useCallback(() => {
        const current = viewRef.current;
        const target = getSituation(current.situationId);
        if (!target) return;
        const question = `${genderText(target.text, female)} ${target.ask}`;
        const options = readOptionsAloud ? current.order.map((i) => genderText(target.options[i].text, female)) : [];
        sayAll([question, ...options]);
    }, [sayAll, female, readOptionsAloud]);

    /** Primer se čita prvi; tek kad se završi, pojavljuju se pitanje i izbori. */
    const present = useCallback(() => {
        const target = getSituation(viewRef.current.situationId);
        if (!target) return;
        sayAll([genderText(target.model, female)], () => {
            revealOptions();
            speakQuestion();
        });
    }, [sayAll, revealOptions, speakQuestion, female]);

    useEffect(() => {
        if (isMonitor || startedRef.current) return;
        startedRef.current = true;
        sync.start(viewRef.current);
    }, [isMonitor, sync]);

    useEffect(
        () => () => {
            if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
        },
        []
    );

    // Svaka nova situacija: primer se pročita naglas, pa se pojave izbori (najkasnije posle LISTEN_MAX_MS)
    useListenGate(!isMonitor, view.round, present, revealOptions);

    // Posle izbora koji pomaže fokus ide na „Dalje” (tastatura, čitači ekrana, mali ekrani)
    useEffect(() => {
        if (!isMonitor && view.picked !== null && !view.finished) nextButtonRef.current?.focus();
    }, [isMonitor, view.picked, view.finished]);

    // Pomoć posle čekanja: izbor koji pomaže blago zasvetli kad dete dugo ništa ne dodirne
    useWaitHint(!isMonitor && settings.waitHint && view.optionsShown, `${view.round}:${view.optionsShown}`, () => {
        const current = viewRef.current;
        if (current.hint || current.picked !== null || current.finished || !current.optionsShown) return;
        if (level === 1 && current.round === 1 && current.tried.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const handleRepeat = () => {
        const current = viewRef.current;
        const target = getSituation(current.situationId);
        if (!target || current.finished) return;
        if (current.picked !== null) sayAll([explanationSpeech(target, current.picked, current.order, female)]);
        else present();
    };

    const handleSpeakOption = (index: number) => {
        const target = getSituation(viewRef.current.situationId);
        if (target) sayAll([genderText(target.options[index].text, female)]);
    };

    const handlePick = (index: number) => {
        if (isMonitor || guard.blocked()) return;
        const current = viewRef.current;
        if (!current.optionsShown || current.picked !== null || current.finished || current.tried.includes(index)) return;
        const target = getSituation(current.situationId);
        if (!target) return;
        const option = target.options[index];
        const label = optionLabel(option, female);

        if (target.acceptable.includes(index)) {
            const attempt = current.tried.length + 1;
            // Situacija koju je pokazala ruka (prva u prvom nivou) je pokazivanje, a ne zadatak: ne boduje se
            // Ceo prvi zadatak prvog nivoa je van ocene (i posle pogrešnog izbora), da „uz pomoć” ne premaši ocenjene zadatke
            const modeled = demoRounds(level, current.totalRounds) > 0 && current.round === 1;
            const next: SocialView = {
                ...current,
                picked: index,
                score: current.score + POINTS[Math.min(current.tried.length, POINTS.length - 1)],
                correctCount: current.correctCount + (attempt === 1 && !modeled && !current.hint ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
            };
            const how = attempt === 1 ? (current.hint ? " uz pomoć" : "") : ` iz ${attempt}. pokušaja${current.hint ? ", uz pomoć" : ""}`;
            commit(next, `Izbor koji pomaže${how}: ${label}`);
            playSfx("correct");
            // Drugi dodir dvostrukog dodira ne sme da pritisne „Dalje” i preskoči objašnjenje
            guard.hold();
            sayAll([praise(explanationSpeech(target, index, current.order, female), attempt === 1 && !current.hint && !modeled)], undefined, "happy");
            return;
        }

        const tried = [...current.tried, index];
        const lessHelpfulOffered = current.order.filter((i) => !target.acceptable.includes(i)).length;
        const hint = current.hint || hintDue(hintAfter, tried.length, lessHelpfulOffered);
        const next: SocialView = { ...current, tried, hint, incorrectCount: current.incorrectCount + 1 };
        commit(next, `Izbor koji manje pomaže: ${label}${hint && !current.hint ? " (prikazana pomoć)" : ""}`);
        playSfx("tap");
        sayAll([`${genderText(option.note, female)} ${hint ? HINT_TEXT : RETRY_TEXT}`], undefined, "gentle");
    };

    const handleNext = () => {
        if (isMonitor || guard.blocked()) return;
        const current = viewRef.current;
        if (current.picked === null || current.finished || completedRef.current) return;
        cancelSpeechQueue();
        stop();

        if (current.round >= rounds.length) {
            // Kraj nivoa: kratka pauza, pa rezultat ide roditeljskom okviru tačno jednom.
            // Zvezdice: total = broj situacija, correct = situacije u kojima je prvi izbor pomogao.
            completedRef.current = true;
            const done: SocialView = { ...current, finished: true };
            commit(done, `Nivo završen: ${done.correctCount} od ${done.totalRounds} iz prvog izbora, ${done.promptedCount} uz pomoć`);
            finishTimer.current = window.setTimeout(() => {
                finishTimer.current = null;
                sync.complete(done);
                onComplete({
                    score: done.score,
                    durationSec: sync.elapsedSec(),
                    correct: done.correctCount,
                    total: Math.max(done.totalRounds - demoRounds(level, done.totalRounds), 1),
                    prompted: done.promptedCount,
                });
            }, CELEBRATE_MS);
            return;
        }

        const upcoming = rounds[current.round];
        const kind = getSituation(upcoming.situationId)?.kind;
        const next: SocialView = {
            ...current,
            round: current.round + 1,
            situationId: upcoming.situationId,
            order: upcoming.order,
            optionsShown: false,
            tried: [],
            picked: null,
            hint: false,
        };
        commit(next, `Situacija ${next.round} od ${next.totalRounds}${kind ? ` (${KIND_LABEL[kind]})` : ""}`);
        playSfx("tap");
    };

    const triedOption = shown.picked === null && lastTried !== null ? situation.options[lastTried] : null;
    const also = shown.picked !== null ? alsoLine(situation, shown.picked, shown.order, female) : null;
    // Posle izbora koji pomaže objašnjenje stoji na mestu primera i pitanja (iznad izbora), pa
    // zadatak sa objašnjenjem i dugmetom „Dalje” staje na ekran bez pomeranja
    const answered = shown.picked !== null;

    return (
        // Položen telefon: primer i pitanje levo, izbori (i beleške posle izbora) desno
        <GameStage width="narrow" className="flat:grid flat:max-w-none flat:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] flat:content-start flat:gap-x-3 flat:gap-y-2 flat:*:col-start-2 flat:*:first:col-span-2 flat:*:first:col-start-1">
            <GameHud
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={isMonitor || settings.preset.showPoints ? shown.score : undefined}
                unit="Zadatak"
                onSpeak={isMonitor ? undefined : handleRepeat}
            />

            <section
                key={situation.id}
                aria-label={MODEL_LABEL}
                // Kad se pojave izbori, primer je već pročitan: na telefonu se sabije, da svi izbori stanu na ekran.
                // Dok se primer čita, slika je velika, iznad teksta; posle ostaje mala, levo od teksta.
                className={cn(
                    "flex animate-fade-up rounded-card border-2 shadow-soft sm:gap-4",
                    answered && "hidden flat:flex",
                    shown.optionsShown ? "items-center gap-3 p-2.5 sm:p-3" : picture ? "flex-col items-stretch gap-3 p-3 sm:p-5" : "items-center gap-3 p-4 sm:p-5",
                    "flat:col-start-1! flat:row-span-6 flat:row-start-2 flat:flex-col flat:items-stretch flat:justify-center flat:gap-2 flat:self-stretch flat:p-2.5 flat:sm:gap-2 flat:sm:p-2.5",
                    ACCENT.soft,
                    ACCENT.border
                )}
            >
                {picture ? (
                    <div
                        className={cn(
                            "shrink-0 overflow-hidden rounded-2xl bg-surface ring-1 ring-brand-100",
                            shown.optionsShown ? "w-28 sm:w-36" : "mx-auto w-full max-w-[min(100%,48dvh)] short:max-w-[min(100%,40dvh)]",
                            // Položen telefon: slika je bila velika dok se primer čitao; uz izbore ostaje samo tekst
                            shown.optionsShown ? "flat:hidden" : "flat:mx-auto flat:w-full flat:max-w-[min(100%,40dvh)] flat:sm:w-full"
                        )}
                    >
                        <SceneArt spec={picture.scene} hero={{ look: picture.hero }} className="h-auto w-full" />
                    </div>
                ) : (
                    <span aria-hidden="true" className={cn("leading-none sm:text-5xl", shown.optionsShown ? "text-2xl" : "text-4xl")}>
                        💬
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-extrabold sm:text-base [@media(max-height:30rem)]:sr-only", ACCENT.text)}>{MODEL_LABEL}</p>
                    <p className={cn("font-bold leading-snug text-ink sm:text-xl flat:text-[0.95rem] flat:sm:text-[0.95rem]", shown.optionsShown ? "text-base" : "text-lg")}>
                        {genderText(situation.model, female)}
                    </p>
                    {/* Na tabletu je pitanje u istoj kartici kao primer, da slike izbora stanu na ekran bez pomeranja */}
                    {shown.optionsShown && (
                        <div aria-hidden="true" className="mt-2 hidden border-t border-brand-200 pt-2 sm:block flat:mt-1.5 flat:pt-1.5">
                            <p className="font-display text-2xl font-extrabold leading-tight text-ink flat:text-lg">{genderText(situation.text, female)}</p>
                            <p className="text-lg font-bold text-ink-soft flat:text-base">{situation.ask}</p>
                        </div>
                    )}
                </div>
            </section>

            {!shown.optionsShown && (
                <p role="status" className="flex min-h-12 items-center justify-center gap-2 text-lg font-extrabold text-ink-soft">
                    <span aria-hidden="true">👂</span>
                    {LISTENING_TEXT}
                </p>
            )}

            {shown.optionsShown && (
                <>
                    <GamePrompt
                        key={`prompt-${situation.id}`}
                        // Na tabletu je pitanje u kartici sa primerom (iznad); za čitače ekrana ostaje ovde
                        className={cn("animate-fade sm:sr-only", answered && "hidden")}
                        compact
                        // Slika je već u primeru iznad; emodži samo kad slike nema
                        visual={picture ? undefined : <span aria-hidden="true">{situation.scene}</span>}
                        title={genderText(situation.text, female)}
                        subtitle={situation.ask}
                    />

                    {shown.picked !== null && (
                        <ExplainPanel
                            accent={ACCENT}
                            icon={<OptionThumb text={situation.options[shown.picked].text} female={female} className="h-16 w-16 sm:h-20 sm:w-20 flat:h-12 flat:w-12" />}
                            text={
                                <span className="flex flex-col gap-1.5">
                                    <span>{genderText(situation.options[shown.picked].note, female)}</span>
                                    <span className={ACCENT.text}>{echoLine(situation, shown.picked, female)}</span>
                                    {also && <span className="text-base text-ink-soft sm:text-lg">{also}</span>}
                                </span>
                            }
                            done={shown.finished}
                            doneText="Gotovo!"
                            onNext={isMonitor ? undefined : handleNext}
                            nextRef={nextButtonRef}
                        />
                    )}

                    <ul key={`options-${shown.round}`} aria-label="Ponuđeni izbori" className={cn("grid animate-fade gap-2 sm:gap-3", OPTION_GRID[shown.order.length] ?? OPTION_GRID[3])}>
                        {shown.order.map((index) => {
                            const firstHelpful = shown.order.find((i) => situation.acceptable.includes(i));
                            const showHand = !isMonitor && level === 1 && shown.round === 1 && shown.optionsShown && shown.picked === null && shown.tried.length === 0;
                            const option = situation.options[index];
                            const label = optionLabel(option, female);
                            const state = choiceState(index, shown, situation);
                            const inactive = shown.picked !== null || shown.finished || shown.tried.includes(index);
                            const status = state === "correct" ? " To pomaže." : shown.tried.includes(index) ? " Već probano." : "";
                            return (
                                <li key={index} className="relative flex min-w-0 flex-col items-center gap-1.5">
                                    <ChoiceCard
                                        state={state}
                                        disabled={isMonitor}
                                        aria-disabled={inactive || undefined}
                                        aria-label={`${label}${status}`}
                                        // Ključ za zajedničku tablu: indeks izbora u situaciji, isti na oba uređaja
                                        data-action={`choice:${index}`}
                                        onClick={() => handlePick(index)}
                                        className={cn("h-full w-full min-w-0 flex-1 p-1.5! sm:p-2.5!", inactive && "cursor-default")}
                                    >
                                        {/* Izbor je slika: dete radi ili kaže baš to; natpis je ispod */}
                                        <OptionPicture text={option.text} label={label} emoji={option.emoji} female={female}>
                                            {showHand && index === firstHelpful && <DemoHand />}
                                        </OptionPicture>
                                    </ChoiceCard>
                                    {!isMonitor && (
                                        // Zvučnik je mali da ne pokrije sliku, a nevidljiv okvir oko njega daje dodiru bar 48 px
                                        <span className="absolute right-1 top-1 z-10 sm:right-2 sm:top-2 [&>button]:relative [&>button]:min-h-10 [&>button]:w-10 [&>button]:rounded-xl [&>button]:after:absolute [&>button]:after:-inset-1 [&>button]:after:content-[''] sm:[&>button]:min-h-11 sm:[&>button]:w-11">
                                            <OptionSpeaker label={`Pročitaj: ${label}`} onClick={() => handleSpeakOption(index)} />
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <span ref={optionsEndRef} aria-hidden="true" className="-mt-3 block h-0 scroll-mb-4" />

                    {/* Posle izbora koji pomaže poruku čuje samo čitač ekrana: na ekranu je kvačica i objašnjenje */}
                    <Feedback kind={feedback} correctText={HELPS_TEXT} wrongText={shown.hint ? HINT_TEXT : RETRY_TEXT} className={answered ? "sr-only" : undefined} />

                    {/* Prazan red ne sme da doda razmak između delova */}
                    <div aria-live="polite" className="empty:-mt-4 sm:empty:-mt-5">
                        {triedOption && (
                            <TriedNote
                                key={lastTried}
                                icon={<OptionThumb text={triedOption.text} female={female} className="h-9 w-9 rounded-lg" />}
                                label={optionLabel(triedOption, female)}
                                note={genderText(triedOption.note, female)}
                            />
                        )}
                    </div>

                </>
            )}
        </GameStage>
    );
}
