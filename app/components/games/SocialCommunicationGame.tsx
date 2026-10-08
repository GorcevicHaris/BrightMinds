"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    playSfx,
    shuffle,
    useGameSync,
    type BaseView,
    type ChoiceState,
    type FeedbackKind,
    type GameProps,
} from "@/app/components/games/kit";
import { getSituation, getSituationsForLevel, type SocialSituation } from "./data/socialSituations";

// ── Stanje ────────────────────────────────────────────────────────────────────
// Sve što utiče na prikaz je u jednom JSON objektu koji se šalje live monitoru.
// `correctCount` broji situacije rešene iz PRVOG pokušaja (iz toga se računaju
// zvezdice), a `incorrectCount` sve pogrešne pokušaje.

export interface SocialView extends BaseView {
    /** Situacija koja je na tabli */
    situationId: number;
    /** Indeksi odgovora u redosledu prikaza */
    order: number[];
    /** Indeksi pogrešnih pokušaja u ovoj situaciji */
    tried: number[];
    /** Poslednji pogrešan izbor dok traje blaga animacija */
    lastWrong: number | null;
    /** Tačan odgovor je pronađen; čeka se "Dalje" */
    answered: boolean;
    /** Nivo je završen (kratka proslava pre zvezdica) */
    finished: boolean;
}

interface Round {
    situationId: number;
    order: number[];
}

const ACCENT = getGame("social").accent;
const INSTRUCTION = "Izaberi lepe reči.";
const RETRY_SPEECH = "Probaj još jednom.";
const HINT_SPEECH = "Pogledaj karticu koja svetli.";
const SPEAK_DELAY_MS = 400;
const WRONG_MS = 1100;
const CELEBRATE_MS = 1000;
/** Poeni prema broju pogrešnih pokušaja pre tačnog odgovora */
const POINTS = [100, 60, 30];

/** Situacije nivoa kao zadaci. `randomize` meša redosled ponuđenih odgovora. */
function buildRounds(level: number, randomize: boolean): Round[] {
    return getSituationsForLevel(level).map((situation) => {
        const indices = situation.answers.map((_, i) => i);
        return { situationId: situation.id, order: randomize ? shuffle(indices) : indices };
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
        tried: [],
        lastWrong: null,
        answered: false,
        finished: false,
    };
}

function toCount(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

function toIndexList(value: unknown, size: number): number[] {
    if (!Array.isArray(value)) return [];
    const valid = value.filter((v): v is number => Number.isInteger(v) && v >= 0 && v < size);
    return Array.from(new Set(valid));
}

/** Stanje sa monitora može biti prazno ili nepotpuno — sve što fali ili nema smisla menja se podrazumevanim. */
function mergeMonitorView(fallback: SocialView, state: Partial<SocialView> | null | undefined): SocialView {
    if (!state) return fallback;
    const situation = typeof state.situationId === "number" ? getSituation(state.situationId) : undefined;
    const order = situation ? toIndexList(state.order, situation.answers.length) : [];
    const board = situation && order.includes(situation.correct) ? situation : undefined;
    const totalRounds = Math.max(toCount(state.totalRounds, fallback.totalRounds), 1);
    return {
        score: toCount(state.score, 0),
        correctCount: toCount(state.correctCount, 0),
        incorrectCount: toCount(state.incorrectCount, 0),
        round: Math.min(Math.max(toCount(state.round, 1), 1), totalRounds),
        totalRounds,
        situationId: board ? board.id : fallback.situationId,
        order: board ? order : fallback.order,
        tried: board ? toIndexList(state.tried, board.answers.length) : [],
        lastWrong: board && typeof state.lastWrong === "number" && order.includes(state.lastWrong) ? state.lastWrong : null,
        answered: Boolean(board) && state.answered === true,
        finished: state.finished === true,
    };
}

/** Posle dva pogrešna pokušaja (ili jednog, kad su ponuđena samo dva odgovora) tačna kartica blago zasvetli. */
function hintReady(wrongAttempts: number, optionCount: number): boolean {
    return wrongAttempts >= Math.min(2, optionCount - 1);
}

function choiceState(index: number, view: SocialView, correct: number, hint: boolean): ChoiceState {
    if (view.answered) return index === correct ? "correct" : "dimmed";
    if (index === view.lastWrong) return "wrong";
    if (view.tried.includes(index)) return "dimmed";
    return hint && index === correct ? "hint" : "idle";
}

/** Tekst za čitanje: pitanje, pa ponuđeni odgovori redom kojim su prikazani (za decu koja još ne čitaju). */
function speechParts(situation: SocialSituation, order: number[], female: boolean): string[] {
    return [genderText(situation.text, female), ...order.map((i) => situation.answers[i])];
}

// ── Igra ──────────────────────────────────────────────────────────────────────

export default function SocialCommunicationGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<SocialView>) {
    // Namerno bez `isFemale` iz kita: `female` je zavisnost `speakPrompt`, a React Compiler lint
    // (preserve-manual-memoization) samo za poređenje napisano ovde zna da je vrednost primitivna.
    const female = gender?.toLowerCase() === "female";
    const sync = useGameSync<SocialView>({ childId, gameId: "social", level, isMonitor });
    const { say, stop } = useSpeech(gender);

    // Komponenta se za svaki nivo pravi iznova, pa se odgovori mešaju samo jednom, ovde.
    const [rounds] = useState(() => buildRounds(level, !isMonitor));
    const [view, setView] = useState(() => initialView(rounds));
    const viewRef = useRef(view);
    const wrongTimer = useRef<number | null>(null);
    const finishTimer = useRef<number | null>(null);
    const speechRun = useRef(0);
    const startedRef = useRef(false);
    const completedRef = useRef(false);
    const nextButtonRef = useRef<HTMLButtonElement>(null);

    // Monitor se ne pravi iznova kad se nivo promeni, pa podrazumevano stanje prati `level`.
    const fallbackView = useMemo(() => initialView(buildRounds(level, false)), [level]);
    const shown = isMonitor ? mergeMonitorView(fallbackView, monitorState) : view;
    const situation = getSituation(shown.situationId) ?? getSituationsForLevel(level)[0];
    const promptText = genderText(situation.text, female);
    const hint = !shown.answered && hintReady(shown.tried.length, shown.order.length);
    const feedback: FeedbackKind = shown.answered ? "correct" : shown.lastWrong !== null || hint ? "wrong" : null;

    const commit = useCallback(
        (next: SocialView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    /** Izgovara delove jedan za drugim; svaki novi govor ili prekid poništava započeti niz. */
    const sayAll = useCallback(
        (parts: string[]) => {
            speechRun.current += 1;
            const run = speechRun.current;
            const step = (i: number) => {
                if (i >= parts.length || run !== speechRun.current) return;
                void say(parts[i], () => step(i + 1));
            };
            step(0);
        },
        [say]
    );

    const speakPrompt = useCallback(() => {
        const current = viewRef.current;
        const target = getSituation(current.situationId);
        if (target) sayAll(speechParts(target, current.order, female));
    }, [sayAll, female]);

    useEffect(() => {
        if (isMonitor || startedRef.current) return;
        startedRef.current = true;
        sync.start(viewRef.current);
    }, [isMonitor, sync]);

    useEffect(
        () => () => {
            speechRun.current += 1;
            if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
            if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
        },
        []
    );

    // Pitanje i ponuđeni odgovori se čitaju naglas na početku svake situacije
    useEffect(() => {
        if (isMonitor) return;
        const timer = window.setTimeout(speakPrompt, SPEAK_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [isMonitor, speakPrompt, view.round]);

    // Posle tačnog odgovora fokus ide na "Dalje" (tastatura, čitači ekrana, mali ekrani)
    useEffect(() => {
        if (!isMonitor && view.answered && !view.finished) nextButtonRef.current?.focus();
    }, [isMonitor, view.answered, view.finished]);

    const handlePick = (index: number) => {
        const current = viewRef.current;
        if (isMonitor || current.answered || current.finished || current.tried.includes(index)) return;
        const target = getSituation(current.situationId);
        if (!target) return;
        const answer = target.answers[index];
        if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
        wrongTimer.current = null;

        if (index === target.correct) {
            const attempt = current.tried.length + 1;
            const next: SocialView = {
                ...current,
                answered: true,
                lastWrong: null,
                score: current.score + POINTS[Math.min(current.tried.length, POINTS.length - 1)],
                correctCount: current.correctCount + (attempt === 1 ? 1 : 0),
            };
            commit(next, attempt === 1 ? `Tačan odgovor: „${answer}”` : `Tačan odgovor iz ${attempt}. pokušaja: „${answer}”`);
            playSfx("correct");
            sayAll([`Bravo! ${genderText(target.why, female)}`]);
            return;
        }

        const tried = [...current.tried, index];
        const showsHint = hintReady(tried.length, current.order.length);
        const next: SocialView = { ...current, tried, lastWrong: index, incorrectCount: current.incorrectCount + 1 };
        commit(next, `Pogrešan pokušaj: „${answer}”${showsHint ? " (prikazana pomoć)" : ""}`);
        playSfx("wrong");
        sayAll([showsHint ? HINT_SPEECH : RETRY_SPEECH]);
        // Pogrešna kartica se kratko zatrese, pa ostaje zatamnjena
        wrongTimer.current = window.setTimeout(() => {
            wrongTimer.current = null;
            const latest = viewRef.current;
            if (latest.lastWrong === index && !latest.answered) commit({ ...latest, lastWrong: null });
        }, WRONG_MS);
    };

    const handleNext = () => {
        const current = viewRef.current;
        if (isMonitor || !current.answered || current.finished || completedRef.current) return;
        speechRun.current += 1;
        stop();

        if (current.round >= rounds.length) {
            // Kraj nivoa: kratka proslava, pa rezultat ide roditeljskom okviru tačno jednom.
            // Zvezdice: total = broj situacija, correct = situacije rešene iz prvog pokušaja.
            completedRef.current = true;
            const done: SocialView = { ...current, finished: true };
            commit(done, `Nivo završen: ${done.correctCount} od ${done.totalRounds} iz prvog pokušaja`);
            playSfx("win");
            finishTimer.current = window.setTimeout(() => {
                finishTimer.current = null;
                sync.complete(done);
                onComplete({ score: done.score, durationSec: sync.elapsedSec(), correct: done.correctCount, total: done.totalRounds });
            }, CELEBRATE_MS);
            return;
        }

        const upcoming = rounds[current.round];
        const next: SocialView = {
            ...current,
            round: current.round + 1,
            situationId: upcoming.situationId,
            order: upcoming.order,
            tried: [],
            lastWrong: null,
            answered: false,
        };
        commit(next, `Situacija ${next.round} od ${next.totalRounds}`);
        playSfx("tap");
    };

    return (
        <GameStage width="narrow">
            <GameHud
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={shown.score}
                unit="Situacija"
                onSpeak={isMonitor ? undefined : speakPrompt}
            />

            <GamePrompt
                key={situation.id}
                className="animate-fade-up"
                visual={<span aria-hidden="true">{situation.scene}</span>}
                title={promptText}
                subtitle={INSTRUCTION}
            />

            <div
                key={shown.round}
                role="group"
                aria-label="Ponuđeni odgovori"
                className={cn(
                    "grid animate-fade grid-cols-1 gap-3",
                    shown.order.length !== 3 && "sm:grid-cols-2",
                    isMonitor && "pointer-events-none"
                )}
            >
                {shown.order.map((index) => {
                    const answer = situation.answers[index];
                    const state = choiceState(index, shown, situation.correct, hint);
                    const inactive = shown.answered || shown.finished || shown.tried.includes(index);
                    return (
                        <ChoiceCard
                            key={index}
                            state={state}
                            disabled={isMonitor}
                            aria-disabled={inactive || undefined}
                            aria-label={state === "correct" ? `${answer} Tačan odgovor.` : answer}
                            onClick={() => handlePick(index)}
                            className={cn(
                                "px-4 text-lg leading-snug sm:text-xl",
                                inactive && "cursor-default"
                            )}
                        >
                            {answer}
                        </ChoiceCard>
                    );
                })}
            </div>

            <Feedback kind={feedback} wrongText={hint ? "Pogledaj karticu koja svetli" : "Probaj još jednom"} />

            {shown.answered && (
                <ExplainPanel
                    accent={ACCENT}
                    icon="💬"
                    text={genderText(situation.why, female)}
                    done={shown.finished}
                    onNext={isMonitor ? undefined : handleNext}
                    nextRef={nextButtonRef}
                />
            )}
        </GameStage>
    );
}
