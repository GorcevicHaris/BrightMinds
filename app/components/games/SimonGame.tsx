"use client";

// Igra „Zapamti niz”: polja sa životinjama svetle jedno za drugim (svako sa svojim mekim tonom),
// a dete ponovi isti niz. Niz raste iz nivoa u nivo, a na kraju se ponavlja unazad.
// Nivoi 1–5: dva i tri polja, kratki nizovi; 6–10: četiri polja; 11–15: pet i šest polja i
// niz unazad. Sadržaj i istraživanje su u data/simonLevels.ts.
//
// Zvuk je deo zadatka, ali nikad uslov: svaki ton ima svoje svetlo, a kad je zvuk isključen,
// igra kaže da se gledaju svetla (kit/tones.ts). Monitor i drugo dete na zajedničkoj tabli
// vide isto svetlo (polje koje svetli je u stanju igre), bez zvuka.

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
import { playPad, useTaskSound } from "@/app/components/games/kit/tones";
import { answerOrder, buildSimonLevel, emptySimonView, getSimonPad, mergeSimonMonitor, type SimonPadId, type SimonPlan, type SimonView } from "@/app/components/games/data/simonLevels";
import { BackwardsIcon, SequenceDots, SimonPadFace, TurnIcon, WatchIcon } from "@/app/components/games/simon/SimonArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("simon");
/** Pauza pre nego što niz krene (dete prvo vidi polja) */
const LEAD_MS = 500;
/** Koliki deo takta polje svetli (ostatak je pauza, da se i dva ista polja zaredom razlikuju) */
const LIT_SHARE = 0.62;
const PRESS_MS = 260;
const WRONG_MS = 1500;

function instruction(backwards: boolean): string {
    return backwards ? "Gledaj i slušaj. Zatim ponovi niz unazad, od poslednjeg do prvog." : "Gledaj i slušaj, pa ponovi isti niz.";
}

function names(sequence: readonly SimonPadId[]): string {
    return sequence.map((id) => getSimonPad(id)?.name.toLowerCase() ?? id).join(", ");
}

/** Redovi polja: do tri u redu, četiri kao 2 + 2 */
function rowsOf(pads: readonly SimonPadId[]): SimonPadId[][] {
    if (pads.length <= 3) return [pads.slice()];
    if (pads.length === 4) return [pads.slice(0, 2), pads.slice(2)];
    return [pads.slice(0, 3), pads.slice(3)];
}

/** Veličina polja po broju polja: što više polja, to manja (i uvek bar 4,5 rem — veliko za prst) */
function padSize(count: number): string {
    if (count <= 2) return "w-[clamp(6rem,min(38vw,27dvh),12rem)] flat:w-[clamp(5rem,30dvh,9rem)]";
    if (count === 3) return "w-[clamp(5.25rem,min(28vw,24dvh),11rem)] flat:w-[clamp(4.75rem,28dvh,8.5rem)]";
    if (count === 4) return "w-[clamp(5rem,min(36vw,19dvh),10rem)] flat:w-[clamp(4.5rem,23dvh,7.5rem)]";
    return "w-[clamp(4.5rem,min(26vw,17dvh),9rem)] flat:w-[clamp(4.25rem,22dvh,7rem)]";
}

export default function SimonGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<SimonView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const taskSound = useTaskSound();
    const sync = useGameSync<SimonView>({ childId, gameId: "simon", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();
    const female = isFemale(gender);

    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<SimonPlan>(() => (isMonitor ? { pads: [], backwards: false, tempo: 1000, rounds: [] } : buildSimonLevel(level, { maxRounds: settings.preset.maxRounds, random })));
    const [view, setView] = useState<SimonView>(() => ({
        ...emptySimonView(plan.rounds.length),
        pads: plan.pads,
        backwards: plan.backwards,
        sequence: plan.rounds[0]?.sequence ?? [],
    }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const showTimers = useRef<TimerId[]>([]);
    const pressTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: SimonView, log?: string) => {
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

    /** Pokazuje niz: polje po polje svetli (i čuje se njegov ton), pa je dete na redu */
    const show = () => {
        stopShow();
        const sequence = viewRef.current.sequence;
        commit({ ...viewRef.current, phase: "show", lit: null, playing: null, pressed: null, entered: 0, feedback: null });
        const tempo = plan.tempo;
        sequence.forEach((id, k) => {
            showTimers.current.push(
                after(LEAD_MS + k * tempo, () => {
                    const pad = getSimonPad(id);
                    if (pad) playPad(pad.note);
                    commit({ ...viewRef.current, lit: id, playing: k });
                })
            );
            showTimers.current.push(after(LEAD_MS + k * tempo + tempo * LIT_SHARE, () => commit({ ...viewRef.current, lit: null, playing: null })));
        });
        showTimers.current.push(
            after(LEAD_MS + sequence.length * tempo, () => {
                showTimers.current = [];
                guard.hold();
                commit({ ...viewRef.current, phase: "input", lit: null, playing: null }, "Dete ponavlja niz");
                say(plan.backwards ? "Sada ti, unazad." : "Sada ti.");
            })
        );
    };

    // Početak nivoa: uputstvo, pa prvi niz (`show` uvek kreće ispočetka, pa dvostruki početak u razvoju ne smeta)
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        sayThen(instruction(plan.backwards), show, { min: 900, max: 5000 });
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
        const round = plan.rounds[index];
        if (!round) return;
        guard.hold();
        commit(
            { ...viewRef.current, round: index + 1, sequence: round.sequence, phase: "intro", lit: null, playing: null, pressed: null, entered: 0, feedback: null, hint: false, missed: false },
            `Niz ${index + 1}: ${names(round.sequence)}`
        );
        showTimers.current.push(after(700, show));
    };

    const modeledRound = (current: SimonView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const handlePad = (id: SimonPadId) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.phase !== "input" || current.feedback === "wrong") return;
        const pad = getSimonPad(id);
        if (!pad) return;
        playPad(pad.note, 0.32);
        cancel(pressTimer.current);
        pressTimer.current = after(PRESS_MS, () => {
            pressTimer.current = null;
            if (viewRef.current.pressed === id) commit({ ...viewRef.current, pressed: null });
        });

        const expected = answerOrder(current.sequence, current.backwards);
        if (expected[current.entered] === id) {
            const entered = current.entered + 1;
            if (entered < expected.length) {
                commit({ ...current, pressed: id, entered }, `Tačno polje ${entered} od ${expected.length}: ${pad.name.toLowerCase()}`);
                return;
            }
            // Ceo niz je ponovljen. Prvi niz prvog nivoa pokazuje ruka: pokazivanje, ne zadatak — ne ocenjuje se
            const modeled = modeledRound(current);
            const firstTry = !current.missed && !current.hint && !modeled;
            const solved: SimonView = {
                ...current,
                pressed: id,
                entered,
                phase: "solved",
                feedback: "correct",
                hint: false,
                score: current.score + (firstTry ? 10 : 5),
                correctCount: current.correctCount + (firstTry ? 1 : 0),
                promptedCount: current.promptedCount + (current.hint && !modeled ? 1 : 0),
            };
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle ponovnog gledanja";
            commit(solved, `Ceo niz ponovljen ${how}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            const text = genderText(current.backwards ? "Ponovi{o|la} si niz unazad." : "Zapamti{o|la} si ceo niz.", female);
            sayThen(praise(text, firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy" });
            return;
        }

        // Pogrešno polje: mirno, niz se pokaže još jednom, a zatim (ako je pomoć uključena) sledeće pravo polje svetli
        const hint = current.hint || hintDue(settings.hintAfter, 1, 1);
        commit({ ...current, pressed: id, feedback: "wrong", missed: true, hint, incorrectCount: current.incorrectCount + 1 }, `Pogrešno polje: ${pad.name.toLowerCase()} (niz: ${names(current.sequence)})`);
        playSfx("wrong");
        guard.hold();
        say("Pogledajmo još jednom.", undefined, "gentle");
        showTimers.current.push(
            after(WRONG_MS, () => {
                commit({ ...viewRef.current, feedback: null, pressed: null, entered: 0 });
                show();
            })
        );
    };

    // Pomoć posle čekanja: sledeće pravo polje blago zasvetli (ne u pokaznom nizu — tu pokazuje ruka)
    useWaitHint(!isMonitor && settings.waitHint && view.phase === "input" && !view.hint, `${view.round}:${view.entered}:${view.phase}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.phase !== "input" || modeledRound(current)) return;
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    // „Ponovi”: uputstvo i još jednom isti niz (gledanje nije greška); dete kreće ispočetka
    const repeatInstruction = () => {
        const current = viewRef.current;
        if (finishedRef.current || current.phase !== "input" || current.feedback) return;
        say(current.backwards ? "Gledaj još jednom, pa ponovi unazad." : "Gledaj još jednom.");
        show();
    };

    const shown = isMonitor ? mergeSimonMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const pads = shown.pads.map((id) => getSimonPad(id)).filter((p) => p !== undefined);

    if (pads.length === 0 || shown.sequence.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Niz" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi niz" />
            </GameStage>
        );
    }

    const input = shown.phase === "input";
    const solved = shown.phase === "solved";
    const expected = answerOrder(shown.sequence, shown.backwards);
    const next = input && !shown.feedback ? expected[shown.entered] : undefined;
    const showHand = !isMonitor && input && modeledRound(shown) && !shown.missed;
    const playing = shown.phase === "show" ? shown.playing : null;
    // Monitor (roditelj, drugo dete na zajedničkoj tabli) ne čuje „ti”: ko je na redu piše na traci
    const title = input || solved ? (isMonitor ? (shown.backwards ? "Ponovi niz unazad." : "Ponovi isti niz.") : shown.backwards ? "Sada ti — unazad!" : "Sada ti!") : "Gledaj i slušaj.";
    const subtitle = shown.backwards ? "Od poslednjeg do prvog." : input || solved ? "Istim redom." : "Polja svetle jedno za drugim.";
    const message = solved ? genderText(shown.backwards ? "Ponovi{o|la} si niz unazad." : "Zapamti{o|la} si ceo niz.", female) : "Pogledajmo još jednom.";

    return (
        <GameStage split>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Niz" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            <GamePrompt
                key={`prompt-${shown.round}-${input}`}
                className="animate-fade-up"
                compact
                visual={<span className="h-[80%] w-[80%]">{input || solved ? shown.backwards ? <BackwardsIcon /> : <TurnIcon /> : <WatchIcon listen={taskSound} />}</span>}
                title={title}
                subtitle={subtitle}
            />

            <PlayArea accent={GAME.accent} className="relative gap-3 sm:gap-5 flat:gap-2">
                {!taskSound && !isMonitor && (
                    <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-ink-soft ring-1 ring-iris-200 sm:text-base flat:absolute flat:right-2 flat:top-2 flat:text-xs">
                        <SoundOffIcon />
                        Zvuk je isključen: gledaj svetla.
                    </p>
                )}
                <SequenceDots
                    colors={shown.sequence.map((id) => getSimonPad(id)?.color ?? "#CCCCCC")}
                    entered={input || solved ? shown.entered : 0}
                    playing={playing}
                    backwards={shown.backwards}
                />
                <div role="group" aria-label="Polja sa životinjama" className={cn("flex flex-col items-center gap-3 sm:gap-5 flat:gap-2", isMonitor && "pointer-events-none")}>
                    {rowsOf(shown.pads).map((row, r) => (
                        <div key={r} className="flex items-center justify-center gap-3 sm:gap-5 flat:gap-3">
                            {row.map((id) => {
                                const pad = getSimonPad(id);
                                if (!pad) return null;
                                const lit = shown.lit === id || shown.pressed === id;
                                const hinted = shown.hint && next === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        // Ključ poteza za zajedničku tablu: životinja na polju
                                        data-action={`pad:${id}`}
                                        disabled={isMonitor || !input || Boolean(shown.feedback)}
                                        onClick={() => handlePad(id)}
                                        aria-label={pad.name}
                                        className={cn(
                                            "relative aspect-square shrink-0 rounded-full outline-offset-4 disabled:cursor-default",
                                            padSize(shown.pads.length),
                                            hinted && "animate-soft-pulse rounded-full outline-4 outline-sun-400"
                                        )}
                                    >
                                        <SimonPadFace pad={pad} lit={lit} calm={calm} />
                                        {showHand && next === id && <DemoHand />}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}

function SoundOffIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-iris-600" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" focusable="false">
            <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
            <path d="M16 9l5 6M21 9l-5 6" strokeLinecap="round" />
        </svg>
    );
}
