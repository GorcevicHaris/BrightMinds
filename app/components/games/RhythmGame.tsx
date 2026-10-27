"use client";

// Igra „Ponovi ritam”: bubanj odsvira kratak ritam (svaki udarac ima i svoju tačku u zapisu, koja
// zasvetli), a dete ga ponovi. Nivoi 1–5: jedan bubanj — dete ponavlja broj udaraca; 6–10: veliki
// i mali bubanj; 11–15: i zvonce, duži ritmovi, a na kraju se zapis ne vidi dok se svira.
// Vreme udarca se ne meri (videti data/rhythmLevels.ts): važi šta i koliko puta, ne kada.
//
// Zvuk je deo zadatka, ali nikad uslov: svaki udarac ima svoje svetlo i tačku u zapisu, a kad je
// zvuk isključen, igra kaže da se gledaju bubnjevi (kit/tones.ts). Monitor i drugo dete na
// zajedničkoj tabli vide isto (udarac i tačka koja svira su u stanju igre), bez zvuka.

import { useCallback, useEffect, useRef, useState } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useCalmMotion } from "@/app/components/avatar/motion";
import {
    DemoHand,
    demoRounds,
    Feedback,
    GameHud,
    GamePrompt,
    GameStage,
    genderText,
    hintDue,
    isFemale,
    PlayArea,
    playSfx,
    useGameRandom,
    useGameSync,
    useInputGuard,
    usePraise,
    useSayThen,
    useTimers,
    useWaitHint,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import { playDrum, useTaskSound } from "@/app/components/games/kit/tones";
import { beatsPhrase, buildRhythmLevel, emptyRhythmView, INSTRUMENT_NAMES, mergeRhythmMonitor, type Instrument, type RhythmPlan, type RhythmView } from "@/app/components/games/data/rhythmLevels";
import { BeatMark, InstrumentArt, type MarkState } from "@/app/components/games/rhythm/RhythmArt";
import { TurnIcon } from "@/app/components/games/simon/SimonArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("rhythm");
const LEAD_MS = 500;
/** Koliki deo takta instrument svetli */
const HIT_SHARE = 0.55;
const TAP_MS = 220;
const WRONG_MS = 1500;

function instruction(plan: Pick<RhythmPlan, "instruments" | "hidden">): string {
    if (plan.instruments.length === 1) return "Slušaj bubanj i broji udarce, pa odsviraj isto toliko.";
    if (plan.hidden) return "Slušaj i gledaj koji instrument svira, pa odsviraj isti ritam.";
    if (plan.instruments.length === 2) return "Slušaj veliki i mali bubanj, pa odsviraj isti ritam.";
    return "Slušaj bubnjeve i zvonce, pa odsviraj isti ritam.";
}

function solvedText(view: Pick<RhythmView, "instruments" | "pattern">, female: boolean): string {
    const done = genderText("Odsvira{o|la} si isti ritam.", female);
    if (view.instruments.length > 1) return done;
    const count = beatsPhrase(view.pattern.length);
    return `${count[0].toUpperCase()}${count.slice(1)}! ${done}`;
}

function describe(pattern: readonly Instrument[]): string {
    return pattern.map((kind) => INSTRUMENT_NAMES[kind].toLowerCase()).join(", ");
}

/** Veličina dugmeta po broju instrumenata (uvek veliko za prst) */
function buttonSize(count: number): string {
    if (count === 1) return "w-[clamp(8.5rem,min(58vw,34dvh),15rem)] flat:w-[clamp(5.5rem,34dvh,10rem)]";
    if (count === 2) return "w-[clamp(7rem,min(40vw,29dvh),13rem)] flat:w-[clamp(5rem,30dvh,9rem)]";
    return "w-[clamp(5.75rem,min(29vw,25dvh),11rem)] flat:w-[clamp(4.75rem,28dvh,8.5rem)]";
}

export default function RhythmGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<RhythmView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const taskSound = useTaskSound();
    const sync = useGameSync<RhythmView>({ childId, gameId: "rhythm", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard(350);
    const female = isFemale(gender);

    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<RhythmPlan>(() => (isMonitor ? { instruments: [], tempo: 800, hidden: false, rounds: [] } : buildRhythmLevel(level, { maxRounds: settings.preset.maxRounds, random })));
    const [view, setView] = useState<RhythmView>(() => ({
        ...emptyRhythmView(plan.rounds.length),
        instruments: plan.instruments,
        hidden: plan.hidden,
        pattern: plan.rounds[0] ?? [],
    }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const showTimers = useRef<TimerId[]>([]);
    const tapTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: RhythmView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    const stopShow = () => {
        showTimers.current.forEach((id) => cancel(id));
        showTimers.current = [];
    };

    /** Svira ritam: udarac po udarac (instrument zasvetli, tačka u zapisu zasvetli), pa je dete na redu */
    const show = () => {
        stopShow();
        const pattern = viewRef.current.pattern;
        commit({ ...viewRef.current, phase: "show", playing: null, hit: null, entered: 0, feedback: null });
        const tempo = plan.tempo;
        pattern.forEach((kind, k) => {
            showTimers.current.push(
                after(LEAD_MS + k * tempo, () => {
                    playDrum(kind);
                    commit({ ...viewRef.current, playing: k, hit: kind });
                })
            );
            showTimers.current.push(after(LEAD_MS + k * tempo + tempo * HIT_SHARE, () => commit({ ...viewRef.current, hit: null })));
        });
        showTimers.current.push(
            after(LEAD_MS + pattern.length * tempo, () => {
                showTimers.current = [];
                guard.hold();
                commit({ ...viewRef.current, phase: "input", playing: null, hit: null }, "Dete ponavlja ritam");
                say("Sada ti.");
            })
        );
    };

    // Početak nivoa: uputstvo, pa prvi ritam (`show` uvek kreće ispočetka, pa dvostruki početak u razvoju ne smeta)
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        sayThen(instruction(plan), show, { min: 900, max: 5000 });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- jednom na početku nivoa
    }, [isMonitor]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        // total = zadaci bez pokaznog (prvi u prvom nivou); correct = iz prvog pokušaja; prompted = uz pomoć
        onCompleteRef.current({
            score: final.score,
            durationSec: sync.elapsedSec(),
            correct: final.correctCount,
            total: Math.max(final.totalRounds - demoRounds(level, final.totalRounds), 1),
            prompted: final.promptedCount,
        });
    };

    const startRound = (index: number) => {
        const pattern = plan.rounds[index];
        if (!pattern) return;
        guard.hold();
        commit(
            { ...viewRef.current, round: index + 1, pattern, phase: "intro", playing: null, hit: null, entered: 0, feedback: null, hint: false, missed: false, revealed: false },
            `Ritam ${index + 1}: ${describe(pattern)}`
        );
        showTimers.current.push(after(700, show));
    };

    const modeledRound = (current: RhythmView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const handleHit = (kind: Instrument) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.phase !== "input" || current.feedback === "wrong") return;
        // Brzi uzastopni udarci su ritam, a ne slučajni dodiri: kratka zaštita samo na početku reda
        if (current.entered === 0 && guard.blocked()) return;
        playDrum(kind);
        cancel(tapTimer.current);
        tapTimer.current = after(TAP_MS, () => {
            tapTimer.current = null;
            if (viewRef.current.hit === kind && viewRef.current.phase !== "show") commit({ ...viewRef.current, hit: null });
        });

        if (current.pattern[current.entered] === kind) {
            const entered = current.entered + 1;
            if (entered < current.pattern.length) {
                commit({ ...current, hit: kind, entered }, `Tačan udarac ${entered} od ${current.pattern.length}: ${INSTRUMENT_NAMES[kind].toLowerCase()}`);
                return;
            }
            const modeled = modeledRound(current);
            const firstTry = !current.missed && !current.hint && !modeled;
            const solved: RhythmView = {
                ...current,
                hit: kind,
                entered,
                phase: "solved",
                feedback: "correct",
                hint: false,
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
            };
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle ponovnog slušanja";
            commit(solved, `Ritam ponovljen ${how}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            sayThen(praise(solvedText(current, female), firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy" });
            return;
        }

        // Pogrešan instrument (samo kad ih ima više): mirno, ritam se odsvira još jednom, zapis se pokaže
        const hint = current.hint || hintDue(settings.hintAfter, 1, 1);
        commit(
            { ...current, hit: kind, feedback: "wrong", missed: true, hint, revealed: true, incorrectCount: current.incorrectCount + 1 },
            `Pogrešan instrument: ${INSTRUMENT_NAMES[kind].toLowerCase()} (ritam: ${describe(current.pattern)})`
        );
        playSfx("wrong");
        say("Poslušajmo još jednom.", undefined, "gentle");
        showTimers.current.push(
            after(WRONG_MS, () => {
                commit({ ...viewRef.current, feedback: null, hit: null, entered: 0 });
                show();
            })
        );
    };

    // Pomoć posle čekanja: sledeći pravi instrument blago zasvetli (ne u pokaznom ritmu — tu pokazuje ruka)
    useWaitHint(!isMonitor && settings.waitHint && view.phase === "input" && !view.hint, `${view.round}:${view.entered}:${view.phase}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.phase !== "input" || modeledRound(current)) return;
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    // „Ponovi”: ritam još jednom (slušanje nije greška); dete kreće ispočetka
    const repeatInstruction = () => {
        const current = viewRef.current;
        if (finishedRef.current || current.phase !== "input" || current.feedback) return;
        say("Poslušaj još jednom.");
        show();
    };

    const shown = isMonitor ? mergeRhythmMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (shown.instruments.length === 0 || shown.pattern.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Ritam" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi ritam" />
            </GameStage>
        );
    }

    const input = shown.phase === "input";
    const solved = shown.phase === "solved";
    const single = shown.instruments.length === 1;
    const next = input && !shown.feedback ? shown.pattern[shown.entered] : undefined;
    const showHand = !isMonitor && input && modeledRound(shown) && !shown.missed;
    const concealed = shown.hidden && !shown.revealed;
    // Monitor (roditelj, drugo dete na zajedničkoj tabli) ne čuje „ti”: ko je na redu piše na traci
    const title = input || solved ? (isMonitor ? "Ponovi ritam." : "Sada ti!") : "Slušaj i gledaj.";
    const subtitle = single ? (input || solved ? "Isto toliko udaraca." : "Broji udarce.") : concealed ? "Zapamti koji instrument svira." : input || solved ? "Isti ritam, istim redom." : "Tačke pokazuju ritam.";
    const message = solved ? solvedText(shown, female) : "Poslušajmo još jednom.";

    const markState = (i: number): MarkState => {
        if (shown.phase === "show" || shown.phase === "intro") {
            if (concealed) return "hidden";
            return shown.playing === i ? "playing" : "todo";
        }
        if (i < shown.entered) return "done";
        if (concealed) return "hidden";
        return shown.hint && i === shown.entered && input ? "next" : "todo";
    };

    return (
        <GameStage split>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Ritam" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt
                key={`prompt-${shown.round}-${input}`}
                className="animate-fade-up"
                compact
                visual={<span className="h-[82%] w-[82%]">{input || solved ? <TurnIcon /> : <InstrumentArt kind="big" hit={shown.hit !== null} />}</span>}
                title={title}
                subtitle={subtitle}
            />

            <PlayArea accent={GAME.accent} className="relative gap-3 sm:gap-6 flat:gap-2">
                {!taskSound && !isMonitor && (
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-ink-soft ring-1 ring-marigold-200 sm:text-base flat:absolute flat:right-2 flat:top-2 flat:text-xs">
                        <SoundOffIcon />
                        Zvuk je isključen: gledaj bubnjeve.
                    </p>
                )}
                {/* Zapis ritma: tačka po udarcu */}
                <div className="flex min-h-12 flex-wrap items-center justify-center gap-1.5 rounded-full bg-white/85 px-4 py-1.5 ring-1 ring-marigold-100 sm:min-h-14 sm:gap-2.5 sm:px-5 flat:min-h-0 flat:py-0.5 flat:sm:min-h-0" aria-label={concealed ? `Ritam od ${beatsPhrase(shown.pattern.length)}` : `Ritam: ${describe(shown.pattern)}`} role="img">
                    {shown.pattern.map((kind, i) => (
                        <BeatMark key={`${shown.round}-${i}`} kind={kind} state={markState(i)} />
                    ))}
                </div>

                <div role="group" aria-label="Instrumenti" className={cn("flex items-end justify-center gap-3 sm:gap-6", isMonitor && "pointer-events-none")}>
                    {shown.instruments.map((kind) => {
                        const struck = shown.hit === kind;
                        const hinted = shown.hint && next === kind;
                        return (
                            <button
                                key={kind}
                                type="button"
                                // Ključ poteza za zajedničku tablu: instrument
                                data-action={`drum:${kind}`}
                                disabled={isMonitor || !input || Boolean(shown.feedback)}
                                onClick={() => handleHit(kind)}
                                aria-label={INSTRUMENT_NAMES[kind]}
                                className={cn(
                                    "relative flex shrink-0 flex-col items-center gap-1 rounded-tile border-2 border-b-[5px] border-marigold-200 bg-white px-2 pb-2 pt-3 shadow-soft flat:gap-0 flat:pb-1 flat:pt-1.5 transition-[transform,border-color,background-color] duration-150 disabled:cursor-default enabled:active:translate-y-[3px] enabled:active:border-b-2",
                                    buttonSize(shown.instruments.length),
                                    struck && "border-marigold-400 bg-marigold-50",
                                    hinted && "animate-soft-pulse outline-4 outline-offset-2 outline-sun-400"
                                )}
                            >
                                <span className={cn("block aspect-square w-full transition-transform duration-150", struck && !calm && "translate-y-1 scale-95")}>
                                    <InstrumentArt kind={kind} hit={struck} />
                                </span>
                                <span className="text-sm font-extrabold leading-tight text-ink sm:text-base flat:text-xs flat:sm:text-sm">{INSTRUMENT_NAMES[kind]}</span>
                                {showHand && next === kind && <DemoHand />}
                            </button>
                        );
                    })}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}

function SoundOffIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-marigold-600" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" focusable="false">
            <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
            <path d="M16 9l5 6M21 9l-5 6" strokeLinecap="round" />
        </svg>
    );
}
