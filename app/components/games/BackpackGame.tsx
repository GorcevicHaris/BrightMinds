"use client";

// Igra „Spakuj ranac”: sa strane je slikovna lista (kasnije raspored časova), u sredini otvoren
// ranac, a na stolu školske stvari i igračke. Dete prevlači (ili dodirne stvar, pa ranac) ono što
// treba; spakovano se na listi štiklira, a ono što ne treba ranac mirno vrati („To ne treba za
// školu danas.”). Kasnije se lista vidi samo na početku (dugme „Lista” je vraća), pa se proverava
// „Šta fali u rancu?”, a na kraju se iz rasporeda zaključuje koja knjiga treba za koji čas.

import { useCallback, useEffect, useRef, useState } from "react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    demoRounds,
    Feedback,
    FEEDBACK_MIN_MS,
    GameHud,
    GamePrompt,
    GameStage,
    hintDue,
    PlayArea,
    playSfx,
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
import { DragDemo, DragGhost, useDragDrop } from "@/app/components/games/kit/useDragDrop";
import {
    backpackResult,
    backpackRule,
    buildBackpackLevel,
    DAILY_ITEMS,
    DAYS,
    doneSentence,
    emptyBackpackView,
    getItem,
    getSubject,
    isDay,
    itemForSubject,
    mergeBackpackMonitor,
    nextNeeded,
    packSentence,
    refuseSentence,
    roundQuestion,
    roundTitle,
    roundView,
    solveBackpackView,
    type BackpackRound,
    type BackpackView,
    type ItemId,
    type SubjectId,
} from "@/app/components/games/data/backpackLevels";
import { BackpackBack, BackpackFront, ItemPicture, SubjectBadge } from "@/app/components/games/backpack/items";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("backpack");
const WRONG_FEEDBACK_MS = 1400;
/** Koliko dugo ostaje otvorena lista koju je dete ponovo otvorilo */
const REOPEN_MS = 5000;
const BAG = "bag";
// Položen ekran niži od ~820 px (telefon i tablet položeno, laptop): manji razmaci i poruka preko table
const LOW_STAGE = "short:landscape:gap-2";
const LOW_HUD = "short:landscape:py-1.5!";
const LOW_PROMPT =
    "short:landscape:py-1.5! short:landscape:[&>div:first-child:not(:last-child)]:hidden [@media(max-height:30rem)]:[&_p]:text-lg! [@media(max-height:30rem)]:[&_p]:leading-tight!";
const LOW_FEEDBACK = "short:landscape:absolute short:landscape:inset-x-0 short:landscape:bottom-1 short:landscape:z-30 short:landscape:min-h-0";

export default function BackpackGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<BackpackView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<BackpackView>({ childId, gameId: "backpack", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Podrška se povlači: na lakim nivoima sledeća stvar zasvetli već posle prve greške i posle
    // čekanja (osim kad je roditelj isključio pomoć); kasnije važi ono što je podešeno.
    const rule = backpackRule(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    const [plan] = useState<BackpackRound[]>(() => (isMonitor ? [] : buildBackpackLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds })));
    const [view, setView] = useState<BackpackView>(() => ({ ...emptyBackpackView(plan.length), ...(plan[0] ? roundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const listTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: BackpackView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    /** Lista koja se pamti („peek”) se zatvara kad glas završi čitanje (ali ne pre 4 s) */
    const closeList = useCallback(
        (round: number) => {
            const current = viewRef.current;
            if (current.round !== round || current.kind !== "peek" || !current.listOpen || current.feedback === "correct") return;
            commit({ ...current, listOpen: false }, "Lista je sklonjena");
        },
        [commit]
    );

    const announce = useCallback(
        (current: BackpackView) => {
            const question = roundQuestion(current);
            if (current.kind === "peek") sayThen(question, () => closeList(current.round), { min: 4000, max: 10000 });
            else say(question);
        },
        [say, sayThen, closeList]
    );

    // Početak nivoa: lista (ili raspored) naglas
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        announce(viewRef.current);
    }, [isMonitor, sync, guard, announce]);

    const modeledRound = (current: BackpackView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(backpackResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        cancel(listTimer.current);
        listTimer.current = null;
        const next: BackpackView = { ...viewRef.current, ...roundView(round), round: index + 1, selected: null, wrong: [], picked: null, feedback: null, hint: false, listHelp: false };
        commit(next, `Zadatak ${index + 1}: ${roundQuestion(next)}`);
        announce(next);
    };

    const solve = (current: BackpackView, solved: Partial<BackpackView>, sentence: string) => {
        const { next, firstTry, modeled } = solveBackpackView(current, level, solved);
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint || current.listHelp ? "uz pomoć" : "posle više pokušaja";
        commit({ ...next, listOpen: true }, `Ranac spakovan ${how}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(sentence, firstTry), isLast ? finish : () => startRound(current.round), { min: calm ? FEEDBACK_MIN_MS : FEEDBACK_MIN_MS + 600, emotion: "happy" });
    };

    const select = (item: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.feedback === "correct" || current.packed.includes(item) || !current.desk.includes(item)) return;
        playSfx("tap");
        commit({ ...current, selected: current.selected === item ? null : item });
    };

    const pack = (item: string, target: string) => {
        if (isMonitor || finishedRef.current || guard.blocked() || target !== BAG) return;
        const current = viewRef.current;
        if (current.feedback === "correct" || current.packed.includes(item) || !current.desk.includes(item)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const name = getItem(item)?.name ?? item;

        if (current.needed.includes(item)) {
            const packed = [...current.packed, item];
            const sentence = packSentence(item);
            if (current.needed.every((id) => packed.includes(id))) {
                solve(current, { packed, selected: null, picked: null }, `${sentence} ${doneSentence(current.kind)}`);
                return;
            }
            commit({ ...current, packed, selected: null, picked: null, feedback: null }, `U rancu: ${name}`);
            playSfx("correct");
            say(sentence, undefined, "happy");
            return;
        }

        // Ne treba: ranac je mirno vraća na sto
        const wrong = current.wrong.includes(item) ? current.wrong : [...current.wrong, item];
        const misses = current.desk.filter((id) => !current.needed.includes(id)).length;
        const hint = current.hint || hintDue(hintAfter, wrong.length, misses);
        commit({ ...current, wrong, hint, selected: null, picked: item, feedback: "wrong", incorrectCount: current.incorrectCount + 1 }, `Ne treba: ${name}`);
        playSfx("wrong");
        say(refuseSentence(item), undefined, "gentle");
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    /** „Lista”: ponovo otvorena lista je pomoć (beleži se kao „uz pomoć”) i posle par sekundi se skloni */
    const reopenList = () => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.kind !== "peek" || current.listOpen || current.feedback === "correct") return;
        playSfx("tap");
        const modeled = modeledRound(current);
        commit({ ...current, listOpen: true, listHelp: current.listHelp || !modeled }, "Lista ponovo otvorena (pomoć)");
        say(roundQuestion(current));
        cancel(listTimer.current);
        const round = current.round;
        listTimer.current = after(REOPEN_MS, () => {
            listTimer.current = null;
            closeList(round);
        });
    };

    // Pomoć posle čekanja: sledeća stvar sa liste blago zasvetli
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.packed.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        // U „peek” glas ne ponavlja listu (to bi bila pomoć bez beleženja); za to je „Lista”
        say(current.kind === "peek" && !current.listOpen ? roundTitle(current, false) : roundQuestion(current));
    };

    const shown = isMonitor ? mergeBackpackMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const dnd = useDragDrop({ disabled: isMonitor || shown.feedback === "correct", onDrop: pack, onTap: select });

    if (shown.desk.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const disabled = isMonitor || solved;
    const demo = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved && shown.packed.length === 0;
    const hinted = shown.hint || demo ? nextNeeded(shown) : null;
    const message = solved ? doneSentence(shown.kind) : shown.feedback === "wrong" && shown.picked ? refuseSentence(shown.picked) : "";
    const bagState: ChoiceState = shown.feedback === "wrong" ? "wrong" : solved ? "correct" : dnd.over === BAG || shown.selected ? "selected" : hinted ? "hint" : "idle";
    const deskCount = shown.desk.length;
    const labels = deskCount <= 8;
    // Malo stvari na stolu: veće slike (sto ima mesta)
    const deskPicture = deskCount <= 4 ? "h-[clamp(2.75rem,10dvh,6.5rem)]" : deskCount <= 6 ? "h-[clamp(2.5rem,8dvh,5.5rem)]" : "h-[clamp(2.2rem,6dvh,4.5rem)]";
    // Sto: što više stvari, to više kolona (pun sto u dva reda na telefonu, u tri kad je položen)
    const deskCols =
        deskCount <= 4
            ? "grid-cols-4 landscape:grid-cols-2"
            : deskCount <= 6
              ? "grid-cols-3 landscape:grid-cols-3"
              : deskCount <= 8
                ? "grid-cols-4 landscape:grid-cols-4"
                : "grid-cols-5 landscape:grid-cols-4";

    return (
        <GameStage className={LOW_STAGE}>
            <GameHud className={LOW_HUD} round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />
            <GamePrompt key={`prompt-${shown.round}`} className={cn("animate-fade-up", LOW_PROMPT)} compact title={roundTitle(shown, shown.listOpen)} />

            <PlayArea accent={GAME.accent} className="p-2! sm:p-4! short:landscape:p-2!">
                <div className={cn("flex h-full w-full max-w-5xl flex-col gap-2 sm:gap-4 landscape:flex-row landscape:items-stretch", disabled && "pointer-events-none")}>
                    <div className="flex min-h-0 gap-2 sm:gap-4 landscape:contents">
                        <ListPanel view={shown} onReopen={reopenList} />
                        {/* Ranac: mesto za spuštanje (i dugme posle dodira na stvar) */}
                        <button
                            type="button"
                            data-drop={BAG}
                            data-state={bagState}
                            disabled={disabled}
                            onClick={() => shown.selected && pack(shown.selected, BAG)}
                            aria-label={`Ranac${shown.packed.length ? `: ${shown.packed.map((id) => getItem(id)?.name ?? "").join(", ")}` : ", prazan"}`}
                            className={cn(
                                "relative flex shrink-0 basis-[42%] items-center justify-center rounded-card border-2 border-b-[5px] bg-surface/80 p-1 transition-[background-color,border-color] duration-150 landscape:basis-[18%] short:landscape:basis-[15%] sm:portrait:basis-[36%]",
                                bagState === "hint" && "animate-soft-pulse border-brand-400 bg-brand-50",
                                bagState === "selected" && "border-brand-500 bg-brand-50",
                                bagState === "correct" && "border-emerald-500 bg-emerald-50",
                                bagState === "wrong" && "border-rose-300 bg-rose-50",
                                bagState === "idle" && "border-line"
                            )}
                        >
                            <Bag view={shown} calm={calm} />
                        </button>
                    </div>

                    {/* Sto sa stvarima */}
                    <div
                        role="group"
                        aria-label="Sto"
                        className={cn("grid min-h-0 flex-1 content-center gap-1.5 rounded-card border-2 border-amber-200 bg-amber-50/80 p-1.5 sm:gap-3 sm:p-3", deskCols)}
                    >
                        {shown.desk.map((id) => {
                            const item = getItem(id);
                            if (!item) return null;
                            // Spakovano: prazno mesto na stolu, ostale stvari ostaju gde su bile
                            if (shown.packed.includes(id)) return <span key={id} aria-hidden="true" className="min-h-14 rounded-tile border-2 border-dashed border-amber-200" />;
                            const state: ChoiceState = shown.picked === id && shown.feedback === "wrong" ? "wrong" : shown.selected === id ? "selected" : hinted === id ? "hint" : "idle";
                            return (
                                <ChoiceCard
                                    key={`${shown.round}-${id}`}
                                    data-piece={id}
                                    state={state}
                                    disabled={disabled}
                                    aria-pressed={shown.selected === id}
                                    aria-label={item.name}
                                    {...dnd.bind(id)}
                                    className={cn("animate-pop touch-none min-h-14! min-w-0 flex-col gap-0 p-1! sm:gap-0.5 sm:p-1.5! [@media(max-height:30rem)]:min-h-0! [@media(max-height:30rem)]:p-0.5!", dnd.dragging === id && "opacity-40")}
                                >
                                    <ItemPicture id={item.id} className={cn("pointer-events-none aspect-square w-auto landscape:h-[clamp(1.9rem,8dvh,4.5rem)]", deskPicture)} />
                                    {/* Natpis samo kad ima mesta (do osam stvari); inače ga čuje čitač ekrana (aria-label) */}
                                    {labels && <span className="pointer-events-none max-w-full truncate text-[0.65rem] leading-tight sm:text-sm [@media(max-height:30rem)]:hidden">{item.name}</span>}
                                </ChoiceCard>
                            );
                        })}
                    </div>
                </div>
                {dnd.dragging && (
                    <DragGhost ghostRef={dnd.ghostRef}>
                        <ItemPicture id={dnd.dragging as ItemId} className="h-[clamp(4rem,11dvh,7rem)] w-[clamp(4rem,11dvh,7rem)]" />
                    </DragGhost>
                )}
            </PlayArea>

            <Feedback className={LOW_FEEDBACK} kind={shown.feedback} correctText={message} wrongText={message} />
            {demo && hinted && <DragDemo piece={hinted} target={BAG} calm={calm} />}
        </GameStage>
    );
}

// ── Ranac sa stvarima koje vire iz njega ──────────────────────────────────────

function Bag({ view, calm }: { view: BackpackView; calm: boolean }) {
    const count = view.packed.length;
    return (
        <span className="pointer-events-none relative block aspect-[100/110] h-[clamp(6rem,19dvh,13rem)] max-w-full landscape:h-[clamp(5rem,32dvh,15rem)]">
            <BackpackBack className="absolute inset-0 h-full w-full" />
            {/* Stvari u rancu: vire iz otvora (prednji deo ranca ih delimično pokriva) */}
            <span className="absolute inset-x-[12%] top-[2%] flex h-[40%] items-end justify-center">
                {view.packed.map((id, index) => (
                    <span key={id} className={cn("relative block h-full shrink-0", count > 4 ? "-mx-[5%] w-[30%]" : count > 2 ? "-mx-[3%] w-[34%]" : "w-[40%]", !calm && "animate-pop")} style={{ zIndex: index }}>
                        <ItemPicture id={id as ItemId} className="h-full w-full" />
                    </span>
                ))}
            </span>
            <BackpackFront name={view.owner.name} className="absolute inset-0 h-full w-full" />
        </span>
    );
}

// ── Lista / raspored ──────────────────────────────────────────────────────────

function Tick({ on }: { on: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-sm font-black sm:h-7 sm:w-7 sm:text-base [@media(max-height:30rem)]:h-5 [@media(max-height:30rem)]:w-5",
                on ? "animate-pop border-emerald-600 bg-emerald-600 text-white" : "border-line bg-surface text-transparent"
            )}
        >
            ✓
        </span>
    );
}

function ListPanel({ view, onReopen }: { view: BackpackView; onReopen: () => void }) {
    const base =
        "flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1 rounded-card border-2 border-line bg-surface p-1.5 shadow-soft sm:gap-1.5 sm:p-3 landscape:basis-[32%] landscape:flex-none short:landscape:gap-0.5 short:landscape:p-1.5! [@media(max-height:30rem)]:p-1!";

    if (view.kind === "peek" && !view.listOpen) {
        return (
            <div className={cn(base, "items-center justify-center gap-2")}>
                <ListIcon className="h-12 w-12 text-ink-faint sm:h-16 sm:w-16" />
                <button
                    type="button"
                    onClick={onReopen}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] border-brand-700 bg-brand-500 px-5 font-display text-lg font-extrabold text-white transition-[transform,border-width] active:translate-y-[3px] active:border-b-2 sm:text-xl"
                >
                    Lista
                </button>
            </div>
        );
    }

    if (view.kind === "week") return <WeekTable view={view} className={base} />;

    if (view.kind === "timetable" && isDay(view.day)) {
        return (
            <div className={base} role="list" aria-label={`Raspored: ${DAYS[view.day].name}`}>
                <p className="text-center font-display text-base font-extrabold text-ink sm:text-xl short:landscape:text-sm! [@media(max-height:30rem)]:hidden">{DAYS[view.day].name}</p>
                {view.subjects.map((id) => {
                    const subject = getSubject(id);
                    if (!subject) return null;
                    const on = view.packed.includes(itemForSubject(id as SubjectId));
                    return (
                        <div key={id} role="listitem" className="flex min-w-0 items-center gap-1.5 rounded-xl px-1 py-0.5 sm:gap-2" style={{ backgroundColor: `${subject.color}1f` }}>
                            <SubjectBadge id={subject.id} className="h-6 w-6 shrink-0 sm:h-8 sm:w-8 short:landscape:h-6! short:landscape:w-6!" />
                            <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-ink sm:text-base short:landscape:text-xs!">{subject.name}</span>
                            <Tick on={on} />
                        </div>
                    );
                })}
                <DailyRow view={view} />
            </div>
        );
    }

    return (
        <div className={base} role="list" aria-label="Lista">
            <p className="text-center font-display text-base font-extrabold text-ink sm:text-xl short:landscape:text-sm! [@media(max-height:30rem)]:hidden">Lista</p>
            {view.needed.map((id) => {
                const item = getItem(id);
                if (!item) return null;
                // „Šta fali?”: lista se proverava sama (bez kvačica dok ranac nije kompletan)
                const on = view.kind === "missing" ? view.feedback === "correct" : view.packed.includes(id);
                return (
                    <div key={id} role="listitem" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                        <ItemPicture id={item.id} className="h-7 w-7 shrink-0 sm:h-10 sm:w-10 short:landscape:h-7! short:landscape:w-7! [@media(max-height:30rem)]:h-6! [@media(max-height:30rem)]:w-6!" />
                        <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-ink sm:text-base">{item.name}</span>
                        <Tick on={on} />
                    </div>
                );
            })}
        </div>
    );
}

/** Svakog dana: pernica, flašica i užina (slike na lakšim nivoima rasporeda, kasnije samo reči) */
function DailyRow({ view }: { view: BackpackView }) {
    return (
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1 border-t border-line pt-1 sm:gap-1.5 sm:pt-1.5 short:landscape:gap-0.5 short:landscape:pt-0.5!">
            <span className="w-full text-[0.7rem] font-extrabold text-ink-soft sm:text-sm short:landscape:hidden">Svaki dan:</span>
            {DAILY_ITEMS.map((id) => {
                const item = getItem(id);
                if (!item) return null;
                const on = view.packed.includes(id);
                return view.dailyPictures ? (
                    <span key={id} className={cn("relative grid place-items-center rounded-lg", on && "bg-emerald-50")} aria-label={`${item.name}${on ? ", spakovano" : ""}`}>
                        <ItemPicture id={id} className={cn("h-7 w-7 sm:h-9 sm:w-9 short:landscape:h-6! short:landscape:w-6! [@media(max-height:30rem)]:h-5! [@media(max-height:30rem)]:w-5!", on && "opacity-60")} />
                        {on && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-[0.6rem] font-black text-white">✓</span>}
                    </span>
                ) : (
                    <span key={id} className={cn("rounded-md px-1 text-xs font-extrabold sm:text-sm short:landscape:text-[0.65rem]!", on ? "bg-emerald-600 text-white" : "bg-canvas text-ink")}>
                        {item.name.toLocaleLowerCase("sr")}
                    </span>
                );
            })}
        </div>
    );
}

/** Raspored za celu nedelju: dete samo nalazi dan za koji se pakuje */
function WeekTable({ view, className }: { view: BackpackView; className: string }) {
    return (
        <div className={className} role="table" aria-label="Raspored časova">
            <p className="text-center font-display text-sm font-extrabold text-ink sm:text-lg short:landscape:text-xs! [@media(max-height:30rem)]:hidden">Raspored</p>
            {view.week.map((row) => (
                <div key={row.day} role="row" className="flex min-w-0 items-center gap-1 sm:portrait:gap-1.5">
                    <span role="rowheader" className="w-8 shrink-0 text-xs font-extrabold text-ink-soft sm:w-10 sm:text-sm lg:w-24">
                        <span className="lg:hidden">{DAYS[row.day].short}</span>
                        <span className="hidden lg:inline">{DAYS[row.day].name}</span>
                    </span>
                    {row.subjects.map((id) => {
                        const subject = getSubject(id);
                        const on = row.day === view.day && view.packed.includes(itemForSubject(id));
                        return (
                            <span key={id} role="cell" className="relative" aria-label={`${subject?.name ?? ""}${on ? ", spakovano" : ""}`}>
                                <SubjectBadge id={id} className="h-6 w-6 sm:portrait:h-7 sm:portrait:w-7 [@media(max-height:30rem)]:h-5 [@media(max-height:30rem)]:w-5" />
                                {on && <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-[0.6rem] font-black text-white">✓</span>}
                            </span>
                        );
                    })}
                </div>
            ))}
            <DailyRow view={view} />
        </div>
    );
}

function ListIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
    );
}
