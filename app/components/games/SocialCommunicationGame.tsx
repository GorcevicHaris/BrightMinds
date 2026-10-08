"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import {
    ChoiceCard,
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
} from "@/app/components/games/kit";
import {
    getSituation,
    getSituationsForLevel,
    type SituationKind,
    type SocialOption,
    type SocialSituation,
} from "./data/socialSituations";

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
const RETRY_TEXT = "Probajmo drugi način.";
const HINT_TEXT = "Pogledaj karticu koja svetli.";
const KIND_LABEL: Record<SituationKind, string> = { polite: "učtivost", advocacy: "zastupanje sebe" };
const CELEBRATE_MS = 1000;
/** Poeni prema broju izbora koji manje pomažu pre onog koji pomaže */
const POINTS = [100, 60, 30];

/** Situacije nivoa kao zadaci. `randomize` meša redosled ponuđenih izbora. */
function buildRounds(level: number, choiceLimit: number, maxRounds: number, randomize: boolean): Round[] {
    return getSituationsForLevel(level)
        .slice(0, Math.max(maxRounds, 1))
        .map((situation) => {
            const offered = offeredOptions(situation, choiceLimit);
            return { situationId: situation.id, order: randomize ? shuffle(offered) : offered };
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
    const [rounds] = useState(() => buildRounds(level, settings.choiceLimit, settings.preset.maxRounds, !isMonitor));
    const [view, setView] = useState(() => initialView(rounds));
    const viewRef = useRef(view);
    const finishTimer = useRef<number | null>(null);
    const startedRef = useRef(false);
    const completedRef = useRef(false);
    const nextButtonRef = useRef<HTMLButtonElement>(null);

    // Monitor se ne pravi iznova kad se nivo promeni, pa podrazumevano stanje prati `level`.
    // Dok stanje ne stigne, monitor vidi celu prvu situaciju (primer, pitanje i izbore).
    const fallbackView = useMemo(() => ({ ...initialView(buildRounds(level, Infinity, Infinity, false)), optionsShown: true }), [level]);
    const shown = isMonitor ? mergeMonitorView(fallbackView, monitorState) : view;
    const situation = getSituation(shown.situationId) ?? getSituationsForLevel(level)[0];
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
            const next: SocialView = {
                ...current,
                picked: index,
                score: current.score + POINTS[Math.min(current.tried.length, POINTS.length - 1)],
                correctCount: current.correctCount + (attempt === 1 ? 1 : 0),
                promptedCount: current.promptedCount + (attempt > 1 && current.hint ? 1 : 0),
            };
            const how = attempt === 1 ? "" : ` iz ${attempt}. pokušaja${current.hint ? ", uz pomoć" : ""}`;
            commit(next, `Izbor koji pomaže${how}: ${label}`);
            playSfx("correct");
            sayAll([explanationSpeech(target, index, current.order, female)]);
            return;
        }

        const tried = [...current.tried, index];
        const lessHelpfulOffered = current.order.filter((i) => !target.acceptable.includes(i)).length;
        const hint = current.hint || hintDue(hintAfter, tried.length, lessHelpfulOffered);
        const next: SocialView = { ...current, tried, hint, incorrectCount: current.incorrectCount + 1 };
        commit(next, `Izbor koji manje pomaže: ${label}${hint && !current.hint ? " (prikazana pomoć)" : ""}`);
        playSfx("tap");
        sayAll([`${genderText(option.note, female)} ${hint ? HINT_TEXT : RETRY_TEXT}`]);
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
            playSfx("win");
            finishTimer.current = window.setTimeout(() => {
                finishTimer.current = null;
                sync.complete(done);
                onComplete({
                    score: done.score,
                    durationSec: sync.elapsedSec(),
                    correct: done.correctCount,
                    total: done.totalRounds,
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

    return (
        <GameStage width="narrow">
            <GameHud
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={isMonitor || settings.preset.showPoints ? shown.score : undefined}
                unit="Situacija"
                onSpeak={isMonitor ? undefined : handleRepeat}
            />

            <section
                key={situation.id}
                aria-label={MODEL_LABEL}
                className={cn("flex animate-fade-up items-center gap-3 rounded-card border-2 p-4 shadow-soft sm:gap-4 sm:p-5", ACCENT.soft, ACCENT.border)}
            >
                <span aria-hidden="true" className="text-4xl leading-none sm:text-5xl">
                    💬
                </span>
                <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-extrabold sm:text-base", ACCENT.text)}>{MODEL_LABEL}</p>
                    <p className="text-lg font-bold leading-snug text-ink sm:text-xl">{genderText(situation.model, female)}</p>
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
                        className="animate-fade"
                        visual={<span aria-hidden="true">{situation.scene}</span>}
                        title={genderText(situation.text, female)}
                        subtitle={situation.ask}
                    />

                    <ul key={`options-${shown.round}`} aria-label="Ponuđeni izbori" className="grid animate-fade gap-3">
                        {shown.order.map((index) => {
                            const option = situation.options[index];
                            const label = optionLabel(option, female);
                            const state = choiceState(index, shown, situation);
                            const inactive = shown.picked !== null || shown.finished || shown.tried.includes(index);
                            const status = state === "correct" ? " To pomaže." : shown.tried.includes(index) ? " Već probano." : "";
                            return (
                                <li key={index} className="flex items-stretch gap-2">
                                    <ChoiceCard
                                        state={state}
                                        disabled={isMonitor}
                                        aria-disabled={inactive || undefined}
                                        aria-label={`${label}${status}`}
                                        onClick={() => handlePick(index)}
                                        className={cn("min-w-0 flex-1", inactive && "cursor-default")}
                                    >
                                        <span className="flex w-full items-center gap-3 text-left sm:gap-4">
                                            <span
                                                aria-hidden="true"
                                                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-3xl leading-none sm:h-14 sm:w-14 sm:text-4xl"
                                            >
                                                {option.emoji}
                                            </span>
                                            <span className="min-w-0 flex-1 text-lg leading-snug sm:text-xl">{label}</span>
                                        </span>
                                    </ChoiceCard>
                                    {!isMonitor && <OptionSpeaker label={`Pročitaj: ${label}`} onClick={() => handleSpeakOption(index)} />}
                                </li>
                            );
                        })}
                    </ul>

                    <Feedback kind={feedback} correctText={HELPS_TEXT} wrongText={shown.hint ? HINT_TEXT : RETRY_TEXT} />

                    <div aria-live="polite">
                        {triedOption && (
                            <TriedNote
                                key={lastTried}
                                emoji={triedOption.emoji}
                                label={optionLabel(triedOption, female)}
                                note={genderText(triedOption.note, female)}
                            />
                        )}
                    </div>

                    {shown.picked !== null && (
                        <ExplainPanel
                            accent={ACCENT}
                            icon={situation.options[shown.picked].emoji}
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
                </>
            )}
        </GameStage>
    );
}
