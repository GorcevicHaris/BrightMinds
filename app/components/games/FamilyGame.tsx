"use client";

// Igra „Mama i beba”: bebe životinja se prevlače (ili dodirnu, pa dodirne mama) do svojih mama.
// Kasnije „Čija je ovo beba?” (velika slika bebe, tri mame), „Gde je jagnje?” (beba po imenu),
// porodice (tata i beba dolaze kod mame u njihovu kućicu) i porodica ljudi na slici. Prvi zadatak
// prvog nivoa pokazuje ruka; posle greške glas mirno kaže tačnu činjenicu („Mačka ima mače.”), a
// pomoć (tačno mesto zasvetli) se na težim nivoima povlači. Nema žurbe ni tajmera.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
    useGameRandom,
} from "@/app/components/games/kit";
import { DragDemo, DragGhost, useDragDrop } from "@/app/components/games/kit/useDragDrop";
import {
    answerSentence,
    belongs,
    boardDone,
    boardHint,
    buildFamilyLevel,
    emptyFamilyView,
    familyResult,
    familyRule,
    getSpecies,
    isBoard,
    isPerson,
    mergeFamilyMonitor,
    misplacedSentence,
    pieceMember,
    pieceName,
    pieceSpecies,
    placedSentence,
    PERSON_NAMES,
    roundQuestion,
    roundTitle,
    roundView,
    solveFamilyView,
    wrongSentence,
    type FamilyKind,
    type FamilyRound,
    type FamilyView,
    type PersonId,
    type SpeciesId,
} from "@/app/components/games/data/familyLevels";
import { FamilyAnimal, babyArt } from "@/app/components/games/families/animals";
import { PersonPicture } from "@/app/components/games/families/people";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("families");
const WRONG_FEEDBACK_MS = 1400;
// Položen ekran niži od ~820 px (telefon i tablet položeno, laptop): manji razmaci, poruka preko
// table umesto ispod nje, a mesta i komadi jedno pored drugog — da sve stane bez pomeranja.
const LOW_STAGE = "short:landscape:gap-2";
const LOW_HUD = "short:landscape:py-1.5!";
const LOW_PROMPT =
    "short:landscape:py-1.5! short:landscape:[&>div:first-child:not(:last-child)]:hidden [@media(max-height:30rem)]:[&_p]:text-lg! [@media(max-height:30rem)]:[&_p]:leading-tight!";
const LOW_FEEDBACK = "short:landscape:absolute short:landscape:inset-x-0 short:landscape:bottom-1 short:landscape:z-30 short:landscape:min-h-0";
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";

function choiceState(view: FamilyView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.answer) return "hint";
    return "idle";
}

/** Natpis izbora: mama („Krava”), beba ili osoba */
function choiceName(kind: FamilyKind, id: string): string {
    if (kind === "person") return isPerson(id) ? PERSON_NAMES[id] : "";
    const species = getSpecies(id);
    if (!species) return "";
    return kind === "whose" ? species.mother : species.baby;
}

/** Poruka uz poslednju grešku na tabli („Mačka ima mače.”); greška je zapisana „komad>mesto” */
function lastMisplaced(view: FamilyView): string {
    const [, target] = (view.wrong[view.wrong.length - 1] ?? "").split(">");
    return target ? misplacedSentence(view.kind, target) : "";
}

export default function FamilyGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<FamilyView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<FamilyView>({ childId, gameId: "families", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Podrška se povlači: na lakim nivoima tačno mesto zasvetli već posle prve greške i posle
    // čekanja (osim kad je roditelj isključio pomoć); kasnije važi ono što je podešeno.
    const rule = familyRule(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju samo jednom, ovde
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<FamilyRound[]>(() => (isMonitor ? [] : buildFamilyLevel(level, { maxChoices: settings.choiceLimit, maxRounds: settings.preset.maxRounds, random })));
    const [view, setView] = useState<FamilyView>(() => ({ ...emptyFamilyView(plan.length), ...(plan[0] ? roundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: FamilyView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    // Početak nivoa: prvo pitanje
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const question = roundQuestion(viewRef.current);
        if (question) say(question);
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: FamilyView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(familyResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: FamilyView = { ...viewRef.current, ...roundView(round), round: index + 1, placed: [], selected: null, wrong: [], picked: null, feedback: null, hint: false };
        const question = roundQuestion(next);
        commit(next, `Zadatak ${index + 1}: ${question}`);
        say(question);
    };

    /** Zadatak je rešen: poeni, pohvala sa rečenicom, pa sledeći zadatak */
    const solve = (current: FamilyView, solved: Partial<FamilyView>, sentence: string, log: string) => {
        const { next, firstTry, modeled } = solveFamilyView(current, level, solved);
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Tačno ${how}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(sentence, firstTry), isLast ? finish : () => startRound(current.round), { min: calm ? FEEDBACK_MIN_MS : FEEDBACK_MIN_MS + 600, emotion: "happy" });
    };

    /** Posle greške: kratka poruka, pa se izbori smiruju (nekoliko brzih dodira nije nekoliko grešaka) */
    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    const handlePick = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (isBoard(current.kind) || current.feedback === "correct" || current.wrong.includes(id) || !current.choices.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const question = roundQuestion(current);

        if (id === current.answer) {
            solve(current, { picked: id, hint: false }, answerSentence(current), `${question} → ${choiceName(current.kind, id)}`);
            return;
        }

        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(hintAfter, wrong.length, current.choices.length - 1);
        commit({ ...current, picked: id, feedback: "wrong", wrong, hint, incorrectCount: current.incorrectCount + 1 }, `Netačno: ${question} → ${choiceName(current.kind, id)}`);
        playSfx("wrong");
        say(`${wrongSentence(current, id)} ${hint ? RETRY_SLOW : RETRY} ${question}`, undefined, "gentle");
        settleAfterWrong();
    };

    // ── Table ─────────────────────────────────────────────────────────────────

    const selectPiece = (piece: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (!isBoard(current.kind) || current.feedback === "correct" || current.placed.includes(piece)) return;
        playSfx("tap");
        commit({ ...current, selected: current.selected === piece ? null : piece });
    };

    const placePiece = (piece: string, target: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (!isBoard(current.kind) || current.feedback === "correct" || current.placed.includes(piece) || !current.pieces.includes(piece) || !current.targets.includes(target)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const name = pieceName(current.kind, piece);

        if (belongs(current.kind, piece, target)) {
            const placed = [...current.placed, piece];
            const sentence = placedSentence(current.kind, piece);
            if (placed.length >= current.pieces.length) {
                const last = current.kind === "match" ? `${sentence} ${boardDone(current.kind)}` : boardDone(current.kind);
                solve(current, { placed, selected: null, picked: null }, last, `${roundTitle(current)} (${current.targets.join(", ")})`);
                return;
            }
            commit({ ...current, placed, selected: null, picked: null, feedback: null }, `Na mestu: ${name}`);
            playSfx("correct");
            say(sentence, undefined, "happy");
            return;
        }

        const wrong = [...current.wrong, `${piece}>${target}`];
        const hint = current.hint || hintDue(hintAfter, wrong.length, current.targets.length - 1);
        commit({ ...current, wrong, hint, selected: null, picked: target, feedback: "wrong", incorrectCount: current.incorrectCount + 1 }, `Netačno: ${name} → ${target}`);
        playSfx("wrong");
        say(`${misplacedSentence(current.kind, target)} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong();
    };

    // Pomoć posle čekanja: tačna slika ili mesto blago zasvetli (pre greške, ne posle nje)
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.placed.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        const question = roundQuestion(current);
        if (question) say(question);
    };

    const shown = isMonitor ? mergeFamilyMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const board = isBoard(shown.kind);
    const title = roundTitle(shown);

    if ((board ? shown.pieces.length : shown.choices.length) === 0 || !title) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const hud = <GameHud className={LOW_HUD} round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />;

    if (board) {
        const message = solved ? boardDone(shown.kind) : shown.feedback === "wrong" ? `${lastMisplaced(shown)} ${shown.hint ? RETRY_SLOW : RETRY}`.trim() : "";
        // Pokazni zadatak: ruka nosi prvi komad do njegovog mesta, oba blago svetle
        const demo = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && shown.placed.length === 0 && !solved;
        const hinted = shown.hint || demo ? boardHint(shown) : null;
        return (
            <GameStage className={LOW_STAGE}>
                {hud}
                <GamePrompt key={`prompt-${shown.round}`} className={cn("animate-fade-up", LOW_PROMPT)} compact visual={<PromptIcon kind={shown.kind} />} title={title} />
                <PlayArea accent={GAME.accent} className="p-2! sm:p-4! short:landscape:p-2!">
                    <Board key={shown.round} view={shown} hinted={hinted} disabled={isMonitor || solved} onSelect={selectPiece} onPlace={placePiece} />
                </PlayArea>
                <Feedback className={LOW_FEEDBACK} kind={shown.feedback} correctText={message} wrongText={message} />
                {demo && hinted && <DragDemo piece={hinted.piece} target={hinted.target} calm={calm} />}
            </GameStage>
        );
    }

    const message = solved ? answerSentence(shown) : shown.feedback === "wrong" ? `${wrongSentence(shown, shown.picked ?? "")} ${shown.hint ? RETRY_SLOW : RETRY}`.trim() : "";
    const count = shown.choices.length;
    // Natpis odaje odgovor u „Gde je…?”, pa ga tu nema (čitač ekrana ga i dalje čuje)
    const labels = shown.kind === "whose";

    return (
        <GameStage className={LOW_STAGE}>
            {hud}
            <GamePrompt
                key={`prompt-${shown.round}`}
                className={cn("animate-fade-up", LOW_PROMPT)}
                compact={count > 3}
                illustration={shown.kind === "whose" ? <BabyScene species={shown.answer as SpeciesId} /> : undefined}
                visual={shown.kind === "whose" ? undefined : <PromptIcon kind={shown.kind} />}
                title={title}
            />
            <PlayArea accent={GAME.accent} className="short:landscape:p-2!">
                <div
                    role="group"
                    aria-label={shown.kind === "whose" ? "Mame" : shown.kind === "person" ? "Porodica" : "Bebe"}
                    className={cn("grid w-full max-w-3xl gap-3 sm:gap-4", count === 2 ? "grid-cols-2" : count === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4", isMonitor && "pointer-events-none")}
                >
                    {shown.choices.map((id) => {
                        const name = choiceName(shown.kind, id);
                        if (!name) return null;
                        const state = choiceState(shown, id);
                        const size = count <= 3 ? "h-[clamp(4.5rem,15dvh,9.5rem)]" : "h-[clamp(3.5rem,11.5dvh,8rem)]";
                        return (
                            <ChoiceCard
                                key={`${shown.round}-${id}`}
                                data-action={`choice:${id}`}
                                state={state}
                                disabled={isMonitor || solved || (state !== "idle" && state !== "hint")}
                                onClick={() => handlePick(id)}
                                aria-label={`${name}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className={cn("animate-pop flex-col gap-1 px-1.5 sm:gap-2", count <= 3 ? "min-h-32 sm:min-h-52" : "min-h-28 sm:min-h-48", "short:landscape:min-h-0! short:landscape:py-1.5")}
                            >
                                {shown.kind === "person" ? (
                                    <PersonPicture id={id as PersonId} className={cn("aspect-[3/4] w-auto", size)} />
                                ) : (
                                    <FamilyAnimal species={id as SpeciesId} role={shown.kind === "whose" ? "mother" : "baby"} className={cn("aspect-square w-auto", size)} />
                                )}
                                {labels && <span className="text-base leading-tight sm:text-xl">{name}</span>}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </PlayArea>
            <Feedback className={LOW_FEEDBACK} kind={shown.feedback} correctText={message} wrongText={message} />
        </GameStage>
    );
}

// ── Slike uz zadatak ──────────────────────────────────────────────────────────

/** Mala slika uz uputstvo: mama i beba, kućica ili porodica */
function PromptIcon({ kind }: { kind: FamilyKind }) {
    if (kind === "people" || kind === "person") {
        return (
            <span className="flex h-full w-full items-end justify-center p-1">
                <PersonPicture id="mama" scale="shared" className="h-[85%] w-auto" />
                <PersonPicture id="beba" scale="shared" className="-ml-2 h-[85%] w-auto" />
            </span>
        );
    }
    return (
        <span className="flex h-full w-full items-end justify-center p-1">
            <FamilyAnimal species="sheep" role="mother" className="h-[80%] w-auto" />
            <FamilyAnimal species="sheep" role="baby" className="-ml-3 h-[55%] w-auto" />
        </span>
    );
}

/** Velika slika bebe za „Čija je ovo beba?” (odnos 3 : 2) */
function BabyScene({ species }: { species: SpeciesId }) {
    const water = species === "frog";
    return (
        <svg viewBox="0 0 150 100" className="block h-auto w-full" aria-hidden="true" focusable="false">
            <rect width={150} height={100} fill="#eaf6ff" />
            <circle cx={128} cy={18} r={9} fill="#ffe28a" />
            <path d="M0 70 Q40 60 75 66 Q110 72 150 62 V100 H0Z" fill={water ? "#9fd3ef" : "#c8e8a8"} />
            {!water && <path d="M10 80 q3 -6 6 0 M120 84 q3 -6 6 0 M30 92 q3 -6 6 0" fill="none" stroke="#8cc46a" strokeWidth={1.6} strokeLinecap="round" />}
            <g transform="translate(29 -2) scale(0.92)">{babyArt(species)}</g>
        </svg>
    );
}

// ── Tabla: mesta i komadi ─────────────────────────────────────────────────────

interface BoardProps {
    view: FamilyView;
    hinted: { piece: string; target: string } | null;
    disabled: boolean;
    onSelect: (piece: string) => void;
    onPlace: (piece: string, target: string) => void;
}

/**
 * Mesta gore (mame, kućice porodica ili mesta na slici), komadi dole u korpi. Komad se prevlači
 * prstom do mesta; može i dodir na komad, pa dodir na mesto (i tastaturom).
 */
function Board({ view, hinted, disabled, onSelect, onPlace }: BoardProps) {
    const dnd = useDragDrop({ disabled, onDrop: onPlace, onTap: onSelect });
    const tapTarget = (target: string) => {
        if (!disabled && view.selected) onPlace(view.selected, target);
    };
    const targetState = (target: string, done: boolean): ChoiceState => {
        if (view.feedback === "wrong" && view.picked === target) return "wrong";
        if (done) return "correct";
        if (dnd.over === target) return "selected";
        if (hinted?.target === target) return "hint";
        return "idle";
    };
    const placedIn = (target: string) => view.placed.filter((piece) => belongs(view.kind, piece, target));

    let places: ReactNode;
    if (view.kind === "family") {
        places = (
            <div role="group" aria-label="Porodice" className={cn("grid w-full gap-2 sm:gap-3", view.targets.length === 3 ? "grid-cols-3" : "mx-auto max-w-2xl grid-cols-2")}>
                {view.targets.map((target) => {
                    const species = getSpecies(target);
                    if (!species) return null;
                    const inside = placedIn(target);
                    const done = inside.length === 2;
                    return (
                        <ChoiceCard
                            key={target}
                            data-drop={target}
                            state={targetState(target, done)}
                            disabled={disabled || done}
                            onClick={() => tapTarget(target)}
                            aria-label={`Porodica: ${species.mother}${inside.length ? `, ${inside.map((piece) => pieceName("family", piece)).join(", ")}` : ""}`}
                            className="animate-pop min-h-0! px-1! py-1.5! sm:p-2!"
                        >
                            {/* Kućica: tata i mama jedno pored drugog, beba ispred njih */}
                            <span className="pointer-events-none relative flex w-full flex-col items-center">
                                <span className="flex items-end justify-center">
                                    <MemberSlot species={target as SpeciesId} role="father" filled={inside.some((piece) => pieceMember(piece) === "dad")} outline={view.outline} />
                                    <FamilyAnimal species={target as SpeciesId} role="mother" className={cn("aspect-square w-auto shrink-0", HOUSE_ADULT)} />
                                </span>
                                <span className="-mt-[6%] flex justify-center">
                                    <MemberSlot species={target as SpeciesId} role="baby" filled={inside.some((piece) => pieceMember(piece) === "baby")} outline={view.outline} />
                                </span>
                            </span>
                        </ChoiceCard>
                    );
                })}
            </div>
        );
    } else if (view.kind === "people") {
        places = (
            <div role="group" aria-label="Slika porodice" className="w-full max-w-2xl rounded-card border-4 border-amber-200 bg-amber-50 p-1.5 shadow-soft sm:p-3 short:landscape:p-1.5">
                <div className="grid grid-cols-5 items-end gap-1 sm:gap-2">
                    {view.targets.map((target) => {
                        if (!isPerson(target)) return null;
                        const done = view.placed.includes(target);
                        return (
                            <ChoiceCard
                                key={target}
                                data-drop={target}
                                state={targetState(target, done)}
                                disabled={disabled || done}
                                onClick={() => tapTarget(target)}
                                aria-label={`Mesto: ${PERSON_NAMES[target]}${done ? ", na slici" : ""}`}
                                className="min-h-0! flex-col justify-end gap-0.5 border-dashed px-0.5! pb-1! pt-1.5! sm:px-1!"
                            >
                                <PersonPicture id={target} scale="shared" silhouette={!done} className="pointer-events-none h-[clamp(4.25rem,14dvh,10rem)] w-full" />
                                <span className="pointer-events-none text-xs leading-tight text-ink-soft sm:text-base">{PERSON_NAMES[target]}</span>
                            </ChoiceCard>
                        );
                    })}
                </div>
            </div>
        );
    } else {
        const count = view.targets.length;
        places = (
            <div role="group" aria-label="Mame" className={cn("grid w-full gap-2 sm:gap-4", count === 2 ? "grid-cols-2" : count === 3 ? "grid-cols-3" : "mx-auto max-w-md grid-cols-2 sm:max-w-none sm:grid-cols-4")}>
                {view.targets.map((target) => {
                    const species = getSpecies(target);
                    if (!species) return null;
                    const done = view.placed.includes(target);
                    return (
                        <ChoiceCard
                            key={target}
                            data-drop={target}
                            state={targetState(target, done)}
                            disabled={disabled || done}
                            onClick={() => tapTarget(target)}
                            aria-label={`${species.mother}${done ? `, ${species.pairLine.toLocaleLowerCase("sr")}` : ""}`}
                            className="animate-pop min-h-0! flex-col gap-0.5 px-1! py-1.5! sm:gap-1 sm:p-2!"
                        >
                            <span className="pointer-events-none relative flex items-end justify-center">
                                <FamilyAnimal species={target as SpeciesId} role="mother" className={cn("aspect-square w-auto", count <= 2 ? "h-[clamp(4.5rem,19dvh,11rem)]" : count === 3 ? "h-[clamp(4rem,15dvh,9rem)]" : "h-[clamp(3.25rem,10.5dvh,7.5rem)]")} />
                                {done && <FamilyAnimal species={target as SpeciesId} role="baby" className={cn("animate-pop -ml-[18%] aspect-square w-auto", count <= 2 ? "h-[clamp(3rem,10dvh,6rem)]" : "h-[clamp(2.5rem,8dvh,5rem)]")} />}
                            </span>
                            <span className="pointer-events-none text-sm leading-tight sm:text-lg">{species.mother}</span>
                        </ChoiceCard>
                    );
                })}
            </div>
        );
    }

    const pieces = view.pieces.length;
    const trayCols = view.kind === "people" ? "grid-cols-5" : pieces <= 2 ? "grid-cols-2" : pieces === 3 ? "grid-cols-3" : pieces === 4 ? "grid-cols-4" : "grid-cols-3 sm:grid-cols-6";
    const pieceSize = view.kind === "people" ? "h-[clamp(3rem,10dvh,6rem)]" : pieces <= 3 ? "h-[clamp(3rem,12dvh,6.5rem)]" : pieces === 4 ? "h-[clamp(2.75rem,9.5dvh,5.5rem)]" : "h-[clamp(2.5rem,8dvh,5rem)]";
    // Položen ekran: korpa stoji desno od mesta, u dva ili tri reda
    const lowCols = pieces <= 4 ? "landscape:grid-cols-2" : "landscape:grid-cols-3";
    const trayWidth = view.kind === "people" ? "max-w-2xl" : pieces <= 2 ? "max-w-xs sm:max-w-sm" : pieces === 3 ? "max-w-sm sm:max-w-md" : "max-w-xl sm:max-w-2xl";

    return (
        <div className={cn("flex w-full max-w-4xl flex-col items-center gap-3 sm:gap-5 short:gap-2 landscape:flex-row landscape:items-center", disabled && "pointer-events-none")}>
            {places}
            <div role="group" aria-label={view.kind === "people" ? "Porodica" : view.kind === "family" ? "Tate i bebe" : "Bebe"} className={cn("grid w-full gap-2 rounded-card border-2 border-dashed border-line bg-surface/70 p-1.5 sm:gap-3 sm:p-2.5 landscape:w-[38%] landscape:max-w-none landscape:shrink-0", trayCols, trayWidth, lowCols)}>
                {view.pieces.map((piece) => {
                    const name = pieceName(view.kind, piece);
                    if (!name) return null;
                    // Prazno mesto u korpi: ostali komadi ostaju gde su bili
                    if (view.placed.includes(piece)) return <span key={piece} aria-hidden="true" className="min-h-16 rounded-tile border-2 border-dashed border-line/70 [@media(max-height:30rem)]:min-h-12" />;
                    const selected = view.selected === piece;
                    const state: ChoiceState = selected ? "selected" : hinted?.piece === piece ? "hint" : "idle";
                    return (
                        <ChoiceCard
                            key={piece}
                            data-piece={piece}
                            state={state}
                            disabled={disabled}
                            aria-pressed={selected}
                            aria-label={name}
                            {...dnd.bind(piece)}
                            className={cn("touch-none min-h-16! flex-col gap-0.5 p-1! sm:p-2! [@media(max-height:30rem)]:min-h-0! [@media(max-height:30rem)]:p-1!", dnd.dragging === piece && "opacity-40")}
                        >
                            <PiecePicture kind={view.kind} piece={piece} className={cn("pointer-events-none w-auto", pieceSize)} />
                            {/* Na niskom položenom ekranu natpis ostaje samo za čitač ekrana (aria-label) */}
                            <span className="pointer-events-none text-xs leading-tight sm:text-base [@media(max-height:30rem)]:hidden">{name}</span>
                        </ChoiceCard>
                    );
                })}
            </div>
            {dnd.dragging && (
                <DragGhost ghostRef={dnd.ghostRef}>
                    <PiecePicture kind={view.kind} piece={dnd.dragging} className="h-[clamp(4rem,11dvh,7rem)] w-auto" />
                </DragGhost>
            )}
        </div>
    );
}

function PiecePicture({ kind, piece, className }: { kind: FamilyKind; piece: string; className?: string }) {
    if (kind === "people") return isPerson(piece) ? <PersonPicture id={piece} className={cn("aspect-[3/4]", className)} /> : null;
    const species = pieceSpecies(piece);
    if (!species) return null;
    const role = kind === "family" && pieceMember(piece) === "dad" ? "father" : "baby";
    return <FamilyAnimal species={species} role={role} className={cn("aspect-square", className)} />;
}

/** Veličina odraslih i bebe u kućici porodice */
const HOUSE_ADULT = "h-[clamp(2.6rem,8.5dvh,5.75rem)]";
const HOUSE_BABY = "h-[clamp(2rem,6dvh,4rem)]";

/** Mesto za tatu ili bebu u kućici porodice: prazno (ili bleda silueta kao pomoć), pa popunjeno */
function MemberSlot({ species, role, filled, outline }: { species: SpeciesId; role: "father" | "baby"; filled: boolean; outline: boolean }) {
    const size = role === "father" ? HOUSE_ADULT : HOUSE_BABY;
    if (filled) return <FamilyAnimal species={species} role={role} className={cn("animate-pop aspect-square w-auto shrink-0", size)} />;
    return (
        <span className={cn("grid aspect-square shrink-0 place-items-center rounded-2xl border-2 border-dashed border-line/90", size)}>
            {outline && <FamilyAnimal species={species} role={role} className="h-full w-full opacity-25 grayscale" />}
        </span>
    );
}
