"use client";

// Igra „Brojimo”: glas pita („Koliko ima jabuka?”, „Gde su tri jabuke?”, „Gde ima više lopti?”),
// a dete bira karticu sa brojem ili grupu predmeta. Predmeti su krupni, u urednom rasporedu.
// Nivoi 1–5: do 3, pa do 5 (u redu i kao na kockici), kartice sa brojem i tačkicama;
// 6–10: do 10 (pet + još, okvir od deset), broj ↔ količina, više i manje;
// 11–15: do 20 u dva okvira, jedan više / jedan manje, sabiranje sa predmetima, pa sve izmešano.
// Na nivoima 1–4 učitelj pre odgovora broji zajedno sa detetom (model koji se povlači, vidi
// data/countingItems.ts). Pomoć je isti model: predmeti zasvetle jedan po jedan dok glas broji, pa
// tačna kartica blago svetli.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    DemoHand,
    demoRounds,
    Feedback,
    GameHud,
    GamePrompt,
    GameStage,
    hintDue,
    PlayArea,
    playSfx,
    useBubbleTail,
    useGameSync,
    useInputGuard,
    usePraise,
    useSayThen,
    useTimers,
    useWaitHint,
    type ChoiceState,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import {
    answerFor,
    buildCountingLevel,
    choiceLabel,
    choosesGroup,
    countingResult,
    emptyCountingView,
    getCountNoun,
    groupKey,
    hintSteps,
    mergeCountingMonitor,
    modelFor,
    modelSteps,
    pickedSentence,
    questionFor,
    solveView,
    type CountRound,
    type CountingView,
} from "@/app/components/games/data/countingItems";
import { CountingBoard, GroupPicture, NumeralFace } from "@/app/components/games/CountingObjects";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("counting");
const WRONG_FEEDBACK_MS = 1400;
const INSTRUCTION = "Slušaj pitanje i izaberi pravi odgovor.";
const COUNT_ALONG = "Brojimo zajedno.";
/** Model pre odgovora: uz glas („Brojimo zajedno.”) ili bez njega („Broji u sebi.”) */
const MODEL_LEAD = { voice: COUNT_ALONG, lights: "Broji u sebi." } as const;
/** Korak modela bez reči (poslednji predmet ili brojanje u sebi) */
const MODEL_SILENT_MS = 900;
/** Jedan korak brojanja uz pomoć: najmanje ovoliko (i kad je glas isključen), najviše dok glas ne završi */
const COUNT_STEP_MIN_MS = 700;
const COUNT_STEP_MAX_MS = 2200;

function wrongText(task: CountRound, picked: number, hint: boolean): string {
    return `Netačno. ${pickedSentence(task, picked)} ${hint ? COUNT_ALONG : "Probaj ponovo."}`;
}

function choiceState(view: CountingView, value: number): ChoiceState {
    const answer = view.task?.answer;
    if (view.feedback === "correct") return value === answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === value) return "wrong";
    if (view.wrong.includes(value)) return "dimmed";
    if (view.hint && value === answer) return "hint";
    return "idle";
}

/** Kartica sa pitanjem i tablom predmeta (oblačić učitelja, kao GamePrompt sa slikom) */
function BoardPrompt({ children, title, className }: { children: ReactNode; title: string; className?: string }) {
    const tail = useBubbleTail();
    return (
        <div className={cn("relative flex flex-col items-stretch gap-2.5 rounded-card border border-line bg-surface p-2.5 shadow-soft sm:gap-4 sm:p-5 short:sm:gap-2.5 short:sm:p-3", tail, className)}>
            <div className="flex justify-center rounded-2xl bg-blue-50 px-2 py-3 ring-1 ring-blue-100 sm:py-4 short:sm:py-2.5">{children}</div>
            <p className="px-1 text-center font-display text-xl font-extrabold leading-snug text-ink sm:text-3xl short:sm:text-2xl">{title}</p>
        </div>
    );
}

export default function CountingGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<CountingView>) {
    const settings = useChildSettings();
    const sync = useGameSync<CountingView>({ childId, gameId: "counting", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju samo jednom, ovde
    const [plan] = useState<CountRound[]>(() => (isMonitor ? [] : buildCountingLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds })));
    const [view, setView] = useState<CountingView>(() => ({ ...emptyCountingView(plan.length), task: plan[0] ?? null }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    /** Svako novo brojanje (ili prekid) uvećava broj, pa stari koraci sami odustanu */
    const countRun = useRef(0);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: CountingView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    const stopCounting = () => {
        countRun.current += 1;
    };

    /** Model brojanja: predmeti zasvetle jedan po jedan, glas broji; `lead` se kaže pre toga */
    const countAlong = (lead?: string) => {
        const task = viewRef.current.task;
        if (!task) return;
        countRun.current += 1;
        const mine = countRun.current;
        const steps = hintSteps(task);
        commit({ ...viewRef.current, lit: {} });
        const step = (i: number) => {
            if (mine !== countRun.current || finishedRef.current || i >= steps.length) return;
            const { key, lit, word } = steps[i];
            commit({ ...viewRef.current, lit: { ...viewRef.current.lit, [key]: lit } });
            sayThen(word, () => step(i + 1), { min: COUNT_STEP_MIN_MS, max: COUNT_STEP_MAX_MS });
        };
        if (lead) sayThen(lead, () => step(0), { emotion: "gentle" });
        else step(0);
    };
    /**
     * Model „brojimo zajedno” pre odgovora: predmeti zasvetle jedan po jedan; uz glas se broji
     * naglas osim poslednjeg (dete kaže koliko), bez glasa dete broji u sebi. Na kraju pitanje.
     * Kartice su sve vreme slobodne: dete koje već zna sme odmah da odgovori.
     */
    const modelCount = (intro?: string) => {
        const task = viewRef.current.task;
        if (!task) return;
        const mode = modelFor(level, task);
        const question = questionFor(task);
        if (mode === "none") {
            say(intro ? `${intro} ${question}` : question);
            return;
        }
        countRun.current += 1;
        const mine = countRun.current;
        const steps = modelSteps(task, mode);
        commit({ ...viewRef.current, lit: {} });
        const step = (i: number) => {
            if (mine !== countRun.current || finishedRef.current || viewRef.current.feedback === "correct") return;
            if (i >= steps.length) {
                say(question);
                return;
            }
            const { key, lit, word } = steps[i];
            commit({ ...viewRef.current, lit: { ...viewRef.current.lit, [key]: lit } });
            if (word) sayThen(word, () => step(i + 1), { min: COUNT_STEP_MIN_MS, max: COUNT_STEP_MAX_MS });
            else after(MODEL_SILENT_MS, () => step(i + 1));
        };
        const lead = MODEL_LEAD[mode];
        sayThen(intro ? `${intro} ${lead}` : lead, () => step(0), { emotion: "gentle" });
    };
    // Za početni efekat (pokazni zadatak, model): uvek najnovija verzija
    const countAlongRef = useRef(countAlong);
    const modelCountRef = useRef(modelCount);
    useEffect(() => {
        countAlongRef.current = countAlong;
        modelCountRef.current = modelCount;
    });

    // Početak nivoa: uputstvo jednom, pa prvo pitanje. U pokaznom zadatku učitelj i izbroji.
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const task = viewRef.current.task;
        if (!task) return;
        const text = `${INSTRUCTION} ${questionFor(task)}`;
        if (demoRounds(level, viewRef.current.totalRounds) === 0) {
            modelCountRef.current(INSTRUCTION);
            return;
        }
        countRun.current += 1;
        const intro = countRun.current;
        sayThen(text, () => {
            // Dete je u međuvremenu već izabralo (ili je efekat pokrenut ponovo): bez brojanja
            if (intro === countRun.current && !viewRef.current.feedback && viewRef.current.round === 1) countAlongRef.current();
        });
    }, [isMonitor, sync, guard, say, sayThen, level]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(countingResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        stopCounting();
        guard.hold();
        const question = questionFor(round);
        commit({ ...viewRef.current, task: round, round: index + 1, wrong: [], picked: null, feedback: null, hint: false, lit: {} }, `Zadatak ${index + 1}: ${question}`);
        modelCount();
    };

    const handlePick = (value: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const task = current.task;
        if (!task || current.feedback === "correct" || current.wrong.includes(value) || !task.choices.includes(value)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        stopCounting();
        const question = questionFor(task);

        if (value === task.answer) {
            // Prvi zadatak prvog nivoa pokazuje ruka: pokazivanje, a ne zadatak — ne ocenjuje se
            const { next, firstTry, modeled } = solveView(current, level);
            const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
            commit(next, `Tačno ${how}: ${question} → ${choiceLabel(task, value)}`);
            playSfx("correct");
            const isLast = current.round >= current.totalRounds;
            sayThen(praise(answerFor(task), firstTry), isLast ? finish : () => startRound(current.round), { emotion: "happy" });
            return;
        }

        const wrong = [...current.wrong, value];
        const hint = current.hint || hintDue(settings.hintAfter, wrong.length, task.choices.length - 1);
        commit({ ...current, picked: value, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${question} → ${choiceLabel(task, value)}`);
        playSfx("wrong");
        // Šta je na izabranoj kartici, pa ponovo pitanje — ili, uz pomoć, brojanje zajedno
        if (hint) countAlong(wrongText(task, value, true));
        else say(`${wrongText(task, value, false)} ${question}`, undefined, "gentle");
        // Kratka pauza: nekoliko brzih dodira zaredom ne postaje nekoliko grešaka
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    // Pomoć posle čekanja: brojanje zajedno i tačna kartica blago zasvetli (pre greške, ne posle nje)
    useWaitHint(!isMonitor && settings.waitHint, view.round, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (demoRounds(level, current.totalRounds) > 0 && current.round === 1 && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
        countAlong(COUNT_ALONG);
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        // Odgovor je već dat: ništa se ne ponavlja (i ne prekida se pohvala)
        if (!current.task || current.feedback === "correct") return;
        stopCounting();
        commit({ ...current, lit: {} });
        say(questionFor(current.task));
    };

    const shown = isMonitor ? mergeCountingMonitor(monitorState) : view;
    const task = shown.task;
    const noun = task ? getCountNoun(task.noun) : undefined;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;

    if (!task || !noun) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const showHand = !isMonitor && demoRounds(level, shown.totalRounds) > 0 && shown.round === 1 && shown.wrong.length === 0 && !solved;
    const message = solved ? answerFor(task) : shown.feedback === "wrong" && shown.picked !== null ? wrongText(task, shown.picked, shown.hint) : "";
    const question = questionFor(task);
    const groups = choosesGroup(task.kind);
    const count = task.choices.length;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />

            {groups ? (
                <GamePrompt
                    key={`prompt-${shown.round}`}
                    className="animate-fade-up"
                    compact
                    // „Gde su tri jabuke?”: veliki broj uz pitanje (broj → količina)
                    visual={task.kind === "match" ? <span className="font-display font-black leading-none text-blue-700">{task.answer}</span> : undefined}
                    title={question}
                />
            ) : (
                <BoardPrompt key={`prompt-${shown.round}`} className="animate-fade-up" title={question}>
                    <CountingBoard round={task} noun={noun} lit={shown.lit.board ?? 0} />
                </BoardPrompt>
            )}

            <PlayArea accent={GAME.accent}>
                <div
                    role="group"
                    aria-label={groups ? "Grupe" : "Brojevi"}
                    className={cn(
                        "grid w-full gap-3 sm:gap-4",
                        groups
                            ? cn("max-w-5xl grid-cols-1", count === 2 ? "sm:max-w-3xl sm:grid-cols-2" : "sm:grid-cols-3")
                            : count === 2
                              ? "max-w-md grid-cols-2"
                              : count === 3
                                ? "max-w-xl grid-cols-3"
                                : "max-w-3xl grid-cols-4",
                        isMonitor && "pointer-events-none"
                    )}
                >
                    {task.choices.map((value) => {
                        const state = choiceState(shown, value);
                        return (
                            <ChoiceCard
                                key={`${shown.round}-${value}`}
                                state={state}
                                disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(value)}
                                aria-label={`${choiceLabel(task, value)}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className={cn("animate-pop", groups ? "min-h-0 px-2 py-2.5 sm:min-h-36 sm:py-4 short:sm:min-h-0 short:sm:py-3" : "min-h-28 px-1 sm:min-h-40 short:sm:min-h-28")}
                            >
                                {groups ? <GroupPicture noun={noun} count={value} lit={shown.lit[groupKey(value)] ?? 0} /> : <NumeralFace value={value} dots={task.dots} />}
                                {showHand && value === task.answer && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>

            <Feedback kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}
