"use client";

// Igra „Šta fali?”: vizuelno pamćenje i vizuelno dopunjavanje.
//  • Dopunjavanje: predmetu fali deo (biciklu točak, kući vrata). Dete bira deo, a pravi deo
//    doleti iz kartice na svoje mesto na slici.
//  • Pamćenje (Kimova igra): dete gleda policu koliko želi i samo kaže kad je zapamtilo; zavesa
//    se navuče („Zatvori oči…”), a kad se razgrne, nečega nema (ili su dve stvari zamenile mesta).
// Nema žurbe ni tajmera; posle greške glas mirno kaže činjenicu („Lopta je i dalje na polici.”),
// a pomoć (tačan izbor zasvetli) se na težim nivoima povlači.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    boxOf,
    ChoiceCard,
    DemoHand,
    demoRounds,
    Feedback,
    FLY_IN_MS,
    flyIn,
    GameHud,
    GamePrompt,
    GameStage,
    genderText,
    hintDue,
    isFemale,
    PlayArea,
    playSfx,
    useGameSync,
    useInputGuard,
    useLandscape,
    usePraise,
    useShortScreen,
    useSayThen,
    useTimers,
    useWaitHint,
    type Box,
    type ChoiceState,
    type GameProps,
    type TimerId,
} from "@/app/components/games/kit";
import {
    buildMissingLevel,
    closureWrong,
    CURTAIN_TEXT,
    emptyMissingView,
    getClosure,
    getPart,
    getShelfItem,
    getThing,
    inPlaceSentence,
    LOOK_TAIL,
    mergeMissingMonitor,
    missingQuestion,
    missingResult,
    missingRule,
    missingSentence,
    missingSubtitle,
    namesSentence,
    roundView,
    solveMissingView,
    stillThereSentence,
    swappedSentence,
    type MissingRound,
    type MissingView,
    type PartId,
    type ThingId,
} from "@/app/components/games/data/missingItems";
import { FoodPicture } from "@/app/components/games/food/foods";
import { PART_ART, PartPicture, ThingLayers, ThingPicture } from "@/app/components/games/missing/things";
import type { FoodId } from "@/app/components/games/data/foodItems";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("missing");
const WRONG_FEEDBACK_MS = 1400;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
const CLOSURE_INTRO = "Pogledaj sliku.";
/** Koliko zavesa ostaje navučena (dete „zatvori oči”), pre nego što se razgrne */
const CURTAIN_HOLD_MS = 2200;
/** Koliko se zavesa navlači ili razgrće */
const CURTAIN_MOVE_MS = 650;
/** Nizak ekran (položen telefon, nizak laptop): poruka stoji preko donjeg dela polja, da igra dobije visinu */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

// ── Pomoćne ───────────────────────────────────────────────────────────────────

function choiceState(view: MissingView, id: string): ChoiceState {
    if (view.found.includes(id)) return "correct";
    if (view.feedback === "correct") return "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === nextAnswer(view)) return "hint";
    return "idle";
}

/** Tačan odgovor koji još nije nađen (on svetli kao pomoć) */
function nextAnswer(view: MissingView): string | undefined {
    return view.answers.find((id) => !view.found.includes(id));
}

/** Šta stoji na kom mestu police u ovom trenutku */
function arrangement(view: MissingView): string[] {
    if (view.phase !== "ask") return view.shelf;
    if (view.kind === "swap") return view.feedback === "correct" ? view.shelf : view.after;
    return view.shelf.map((id, i) => view.after[i] || (view.found.includes(id) ? id : ""));
}

export default function MissingGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<MissingView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const landscape = useLandscape();
    const short = useShortScreen();
    const female = isFemale(gender);
    const sync = useGameSync<MissingView>({
        childId,
        gameId: "missing",
        level,
        isMonitor,
    });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Podrška se povlači: na lakim nivoima tačan izbor zasvetli već posle prve greške i posle
    // čekanja (osim kad je roditelj isključio pomoć); kasnije važi ono što je podešeno.
    const rule = missingRule(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se zadaci biraju samo jednom, ovde
    const [plan] = useState<MissingRound[]>(() =>
        isMonitor
            ? []
            : buildMissingLevel(level, {
                  maxChoices: settings.choiceLimit,
                  maxRounds: settings.preset.maxRounds,
              })
    );
    const [view, setView] = useState<MissingView>(() => ({
        ...emptyMissingView(plan.length),
        ...(plan[0] ? roundView(plan[0]) : {}),
    }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    /** Let posle tačnog izbora: šta leti i odakle (meri se pre crtanja, leti posle) */
    const pendingFly = useRef<{
        key: string;
        from: Box | null;
        target?: () => Box | null;
    } | null>(null);
    const boardRef = useRef<HTMLDivElement | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: MissingView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    // Let počinje kad je nova slika već nacrtana
    useLayoutEffect(() => {
        const pending = pendingFly.current;
        if (!pending) return;
        pendingFly.current = null;
        if (calm) return;
        const element = boardRef.current?.querySelector(`[data-fly="${pending.key}"]`);
        flyIn(element, pending.from, pending.target?.() ?? null);
    }, [view, calm]);

    /** Ono što glas kaže na početku zadatka */
    const opening = useCallback(
        (current: MissingView, first: boolean): string => {
            if (current.kind === "closure") return `${first ? `${CLOSURE_INTRO} ` : ""}${missingQuestion(current)}`;
            const names = rule.names && current.kind !== "swap" ? ` ${namesSentence(current.shelf)}` : "";
            return `${missingQuestion(current)}${names} ${LOOK_TAIL}`;
        },
        [rule.names]
    );

    // Početak nivoa: prvo pitanje (ili „Pogledaj šta je na polici.”)
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        say(opening(viewRef.current, true));
    }, [isMonitor, sync, guard, say, opening]);

    const modeledRound = (current: MissingView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(missingResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: MissingView = {
            ...viewRef.current,
            ...roundView(round),
            round: index + 1,
            found: [],
            wrong: [],
            picked: null,
            feedback: null,
            hint: false,
        };
        commit(next, `Zadatak ${index + 1}: ${missingQuestion(next)}`);
        say(opening(next, false));
    };

    /** Zadatak je rešen: poeni, pohvala sa doslovnom rečenicom, pa sledeći zadatak */
    const solve = (current: MissingView, solved: Partial<MissingView>, sentence: string, log: string) => {
        const { next, firstTry, modeled } = solveMissingView(current, level, solved);
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Tačno ${how}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(sentence, firstTry), isLast ? finish : () => startRound(current.round), { min: calm ? undefined : FLY_IN_MS + 900, emotion: "happy" });
    };

    /** Posle greške: kratka poruka, pa se izbori smiruju (nekoliko brzih dodira nije nekoliko grešaka) */
    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    const miss = (current: MissingView, id: string, fact: string, offered: number, log: string) => {
        const wrong = [...current.wrong, id];
        const hint = current.hint || hintDue(hintAfter, wrong.length, offered);
        commit(
            {
                ...current,
                picked: id,
                feedback: "wrong",
                wrong,
                hint,
                incorrectCount: current.incorrectCount + 1,
            },
            `Netačno: ${log}`
        );
        playSfx("wrong");
        say(`${fact} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong();
    };

    // ── Gledanje i zavesa ─────────────────────────────────────────────────────

    const remembered = () => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.phase !== "look") return;
        guard.hold();
        playSfx("tap");
        commit({ ...current, phase: "curtain" }, "Zapamtio/la: zavesa");
        const round = current.round;
        // Dete „zatvori oči”; zavesa se razgrne tek kad glas završi i prođe kratko vreme
        sayThen(
            CURTAIN_TEXT.replace("…", "."),
            () => {
                const now = viewRef.current;
                if (finishedRef.current || now.round !== round || now.phase !== "curtain") return;
                guard.hold();
                const next: MissingView = { ...now, phase: "ask" };
                commit(next, missingQuestion(next));
                say(`${missingQuestion(next)} ${missingSubtitle(next)}`.trim());
            },
            {
                min: CURTAIN_HOLD_MS + CURTAIN_MOVE_MS,
                max: CURTAIN_HOLD_MS + CURTAIN_MOVE_MS + 2500,
            }
        );
    };

    // ── Izbor (dopunjavanje i „šta fali”) ─────────────────────────────────────

    const handlePick = (id: string, event?: MouseEvent<HTMLElement>) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.phase !== "ask" || current.kind === "swap" || current.feedback === "correct" || current.wrong.includes(id) || current.found.includes(id) || !current.choices.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const from = boxOf(event?.currentTarget.querySelector("[data-pic]"));

        if (current.kind === "closure") {
            const closure = getClosure(current.part);
            if (!closure) return;
            if (id === closure.part) {
                pendingFly.current = {
                    key: "part",
                    from,
                    target: () => partTarget(closure.part),
                };
                solve(current, { found: [id], picked: null }, closure.answer, `${missingQuestion(current)} → ${getPart(id)?.name ?? ""}`);
                return;
            }
            miss(current, id, closureWrong(closure, id as PartId), current.choices.length - 1, `${missingQuestion(current)} → ${getPart(id)?.name ?? ""}`);
            return;
        }

        const item = getShelfItem(id);
        if (!item) return;
        if (current.answers.includes(id)) {
            const found = [...current.found, id];
            pendingFly.current = { key: id, from };
            const sentence = missingSentence(item, current.found.length > 0);
            if (found.length >= current.answers.length) {
                solve(current, { found, picked: null }, sentence, `${missingQuestion(current)} → ${found.map((f) => getShelfItem(f)?.name).join(", ")}`);
                return;
            }
            // Prvi od dva predmeta: vrati se na mesto, a zadatak traje dalje
            commit({ ...current, found, picked: null, feedback: null, hint: false }, `Nađeno: ${item.name}`);
            playSfx("correct");
            say(`${sentence} ${missingQuestion(current)}`, undefined, "happy");
            return;
        }
        miss(current, id, stillThereSentence(item), current.choices.length - current.answers.length, `${missingQuestion(current)} → ${item.name}`);
    };

    /** Pravougaonik dela na velikoj slici (tu deo sleće) */
    const partTarget = (part: PartId): Box | null => {
        const picture = boxOf(boardRef.current?.querySelector("[data-fly='part']"));
        if (!picture) return null;
        const [x, y, s] = PART_ART[part].box;
        const k = picture.width / 100;
        return {
            left: picture.left + (x - 2) * k,
            top: picture.top + (y - 2) * k,
            width: (s + 4) * k,
            height: (s + 4) * k,
        };
    };

    // ── Zamena mesta (bira se na polici) ──────────────────────────────────────

    const handleShelf = (id: string) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (current.phase !== "ask" || current.kind !== "swap" || current.feedback === "correct" || current.found.includes(id) || current.wrong.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const item = getShelfItem(id);
        if (!item) return;
        if (current.answers.includes(id)) {
            const found = [...current.found, id];
            if (found.length >= current.answers.length) {
                const [a, b] = current.answers.map((answer) => getShelfItem(answer)!);
                // Obe stvari se mirno vrate na svoja mesta (let od mesta gde su bile)
                const other = current.answers.find((answer) => answer !== id) ?? "";
                const fromA = boxOf(boardRef.current?.querySelector(`[data-fly="${id}"]`));
                const fromB = boxOf(boardRef.current?.querySelector(`[data-fly="${other}"]`));
                pendingFly.current = { key: id, from: fromA };
                swapBack.current = { key: other, from: fromB };
                solve(current, { found, picked: null }, swappedSentence(a, b), `zamena: ${a.name} i ${b.name}`);
                return;
            }
            commit({ ...current, found, picked: null, feedback: null, hint: false }, `Nađeno: ${item.name}`);
            playSfx("tap");
            say(`${item.name}. ${missingSubtitle(current)}`, undefined, "happy");
            return;
        }
        miss(current, id, inPlaceSentence(item), current.shelf.length - current.answers.length, `zamena → ${item.name}`);
    };

    // Druga zamenjena stvar leti zajedno sa prvom
    const swapBack = useRef<{ key: string; from: Box | null } | null>(null);
    useLayoutEffect(() => {
        const pending = swapBack.current;
        if (!pending) return;
        swapBack.current = null;
        if (calm) return;
        flyIn(boardRef.current?.querySelector(`[data-fly="${pending.key}"]`), pending.from);
    }, [view, calm]);

    // Pomoć posle čekanja: tačan izbor blago zasvetli (pre greške, ne posle nje)
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.phase}:${view.found.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.phase !== "ask" || current.hint || current.feedback) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        // Odgovor je već dat (ili je zavesa navučena): ništa se ne ponavlja
        if (current.feedback === "correct" || current.phase === "curtain") return;
        if (current.phase === "look") say(opening(current, false));
        else say(`${missingQuestion(current)} ${missingSubtitle(current)}`.trim());
    };

    const shown = isMonitor ? mergeMissingMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const question = missingQuestion(shown);
    const hud = (
        <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
    );
    const ready = shown.kind === "closure" ? shown.choices.length > 0 && Boolean(question) : shown.shelf.length > 0;

    if (!ready) {
        return (
            <GameStage>
                {hud}
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = feedbackMessage(shown);
    const showHand = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved && shown.phase === "ask";
    // Prvo gledanje police na lakim nivoima: ruka pokazuje dugme kojim dete javlja da je zapamtilo
    // Položen telefon: uz izbore pitanje stoji iznad njih (desno od slike), inače levo od polja
    const inShort = short && landscape;
    const withChoices = shown.phase === "ask" && shown.kind !== "swap";
    const titleLeft = inShort && !withChoices;
    const titleAbove = inShort && withChoices;
    const inlineTitle = (
        <>
            {question}
            {missingSubtitle(shown) && <span className="mt-1 block text-sm font-bold text-ink-soft">{missingSubtitle(shown)}</span>}
        </>
    );
    const lookHand = !isMonitor && level <= 5 && shown.phase === "look" && plan.findIndex((round) => round.kind !== "closure") === shown.round - 1;

    return (
        <GameStage>
            {hud}
            <GamePrompt
                key={`prompt-${shown.round}-${shown.phase}`}
                className="animate-fade-up [@media(max-height:30rem)]:hidden"
                compact
                title={question}
                subtitle={missingSubtitle(shown) || undefined}
            />

            <PlayArea accent={GAME.accent} className="p-2 sm:p-4">
                <div
                    ref={boardRef}
                    className={cn("relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 sm:gap-4 landscape:flex-row", isMonitor && "pointer-events-none")}
                    style={{ containerType: "size", ["--title" as string]: titleLeft ? "9.5rem" : "0rem" }}
                >
                    {/* Položen telefon: pitanje stoji u polju (kartica sa uputstvom bi uzela previše visine) — levo, ili iznad izbora */}
                    {titleLeft && <p className="w-36 shrink-0 text-center font-display text-lg font-extrabold leading-snug text-ink">{inlineTitle}</p>}
                    {shown.kind === "closure" ? (
                        <ClosureBoard
                            view={shown}
                            landscape={landscape}
                            columnTitle={titleAbove ? inlineTitle : null}
                            calm={calm}
                            early={rule.earlyHint}
                            showHand={showHand}
                            disabled={isMonitor || solved}
                            onPick={handlePick}
                        />
                    ) : (
                        <ShelfBoard
                            view={shown}
                            landscape={landscape}
                            short={short}
                            columnTitle={titleAbove ? inlineTitle : null}
                            calm={calm}
                            female={female}
                            showHand={showHand}
                            lookHand={lookHand}
                            disabled={isMonitor || solved}
                            monitor={isMonitor}
                            onRemembered={remembered}
                            onPick={handlePick}
                            onShelf={handleShelf}
                        />
                    )}
                </div>
            </PlayArea>

            <Feedback kind={message ? shown.feedback : null} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

/** Poruka ispod igre: rečenica posle tačnog odgovora ili činjenica posle greške */
function feedbackMessage(view: MissingView): string {
    if (view.feedback === "correct") {
        if (view.kind === "closure") return getClosure(view.part)?.answer ?? "";
        if (view.kind === "swap") {
            const [a, b] = view.answers.map((id) => getShelfItem(id));
            return a && b ? swappedSentence(a, b) : "";
        }
        const last = getShelfItem(view.found[view.found.length - 1]);
        return last ? missingSentence(last, view.found.length > 1) : "";
    }
    if (view.feedback === "wrong" && view.picked) {
        const retry = view.hint ? RETRY_SLOW : RETRY;
        if (view.kind === "closure") {
            const closure = getClosure(view.part);
            return closure ? `${closureWrong(closure, view.picked as PartId)} ${retry}` : "";
        }
        const item = getShelfItem(view.picked);
        if (!item) return "";
        return `${view.kind === "swap" ? inPlaceSentence(item) : stillThereSentence(item)} ${retry}`;
    }
    return "";
}

// ── Slike predmeta na polici ──────────────────────────────────────────────────

function ShelfPicture({ id, className }: { id: string; className?: string }) {
    const item = getShelfItem(id);
    if (!item) return null;
    return item.art === "food" ? <FoodPicture id={id as FoodId} className={className} /> : <ThingPicture id={id as ThingId} className={className} />;
}

// ── Dopunjavanje ──────────────────────────────────────────────────────────────

interface ClosureProps {
    view: MissingView;
    landscape: boolean;
    /** Pitanje iznad izbora (položen telefon) */
    columnTitle: ReactNode;
    calm: boolean;
    /** Laki nivoi: rupa blago svetli */
    early: boolean;
    showHand: boolean;
    disabled: boolean;
    onPick: (id: string, event?: MouseEvent<HTMLElement>) => void;
}

const HOLE_STYLE = `
@keyframes miss-hole { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
.miss-hole { animation: miss-hole 1.8s ease-in-out infinite; }
`;

function ClosureBoard({ view, landscape, columnTitle, calm, early, showHand, disabled, onPick }: ClosureProps) {
    const thing = getThing(view.thing);
    const part = view.part as PartId;
    const placed = view.found.includes(part);
    // Deo leti iz kartice: dok leti, na slici ga još nema (ni rupe), pa sleti na svoje mesto
    const flight = `${view.round}:${part}`;
    const [landedOn, setLandedOn] = useState<string | null>(null);
    useEffect(() => {
        if (!placed || calm) return;
        const timer = window.setTimeout(() => setLandedOn(flight), FLY_IN_MS);
        return () => window.clearTimeout(timer);
    }, [placed, calm, flight]);
    const landed = placed && (calm || landedOn === flight);
    if (!thing) return null;
    const count = view.choices.length;
    // Velika slika je kvadrat: na uspravnom ekranu ispod nje stoje izbori, na položenom pored nje
    const pictureSize = landscape ? `min(100cqh, calc(100cqw - ${count * 8.5 + 2}rem))` : "min(calc(100cqw - 0.5rem), calc(100cqh - 12.5rem))";
    const cardPicture = landscape ? "min(6.5rem, 34cqh)" : "min(7.5rem, 17cqh)";

    return (
        <>
            <div className="relative shrink-0 rounded-card bg-surface shadow-soft ring-1 ring-black/5" style={{ width: pictureSize, height: pictureSize }}>
                {!calm && early && <style>{HOLE_STYLE}</style>}
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" role="img" aria-label={`${thing.name}${placed ? "" : " bez jednog dela"}`}>
                    <ThingLayers id={thing.id} missing={part} placed={placed && landed} hole={!placed} holeClassName={!calm && early ? "miss-hole" : undefined} />
                </svg>
                {placed && !landed && (
                    <svg data-fly="part" viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                        {PART_ART[part].draw()}
                    </svg>
                )}
            </div>

            <div className={cn("flex shrink-0 flex-col items-center gap-2", !landscape && "w-full max-w-xl")}>
                {columnTitle && <p className="text-center font-display text-lg font-extrabold leading-snug text-ink">{columnTitle}</p>}
                <div role="group" aria-label="Delovi" className={cn("grid shrink-0 gap-2.5 sm:gap-4", count === 2 ? "grid-cols-2" : "grid-cols-3", landscape ? "w-auto" : "w-full")}>
                    {view.choices.map((id) => {
                        const choice = getPart(id);
                        if (!choice) return null;
                        const state = choiceState(view, id);
                        return (
                            <ChoiceCard
                                key={`${view.round}-${id}`}
                                state={state}
                                disabled={disabled || (state !== "idle" && state !== "hint")}
                                onClick={(event) => onPick(id, event)}
                                aria-label={`${choice.name}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                className="animate-pop min-h-0 flex-col gap-1 px-1.5 py-2 sm:gap-1.5 sm:py-3"
                            >
                                <span data-pic="" className="block aspect-square" style={{ width: cardPicture }}>
                                    <PartPicture part={choice.id} className={cn("h-full w-full transition-opacity", state === "correct" && "opacity-0")} />
                                </span>
                                <span className="text-base leading-tight sm:text-xl">{choice.name}</span>
                                {showHand && id === view.part && <DemoHand />}
                            </ChoiceCard>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// ── Polica (pamćenje) ─────────────────────────────────────────────────────────

interface ShelfProps {
    view: MissingView;
    landscape: boolean;
    /** Vrlo nizak ekran (položen telefon) */
    short: boolean;
    /** Pitanje iznad izbora (položen telefon) */
    columnTitle: ReactNode;
    calm: boolean;
    female: boolean;
    showHand: boolean;
    lookHand: boolean;
    disabled: boolean;
    monitor: boolean;
    onRemembered: () => void;
    onPick: (id: string, event?: MouseEvent<HTMLElement>) => void;
    onShelf: (id: string) => void;
}

/**
 * Redovi police: uspravno najviše tri stvari u redu, položeno sve u jednom redu. Kad su na
 * položenom ekranu pored police i izbori, pet ili šest stvari stoje u dva reda (u jednom bi bile sitne).
 */
function shelfRows(count: number, landscape: boolean, tight = false): number[][] {
    const indices = Array.from({ length: count }, (_, i) => i);
    if ((landscape && !(tight && count >= 5)) || count <= 3) return [indices];
    const perRow = count === 4 ? 2 : 3;
    const rows: number[][] = [];
    for (let i = 0; i < count; i += perRow) rows.push(indices.slice(i, i + perRow));
    return rows;
}

function ShelfBoard({ view, landscape, short, columnTitle, calm, female, showHand, lookHand, disabled, monitor, onRemembered, onPick, onShelf }: ShelfProps) {
    const placedNow = arrangement(view);
    const rows = shelfRows(view.shelf.length, landscape, view.phase === "ask" && view.kind !== "swap");
    const cols = Math.max(...rows.map((row) => row.length));
    const look = view.phase === "look";
    const curtain = view.phase === "curtain";
    const swap = view.kind === "swap";
    const choices = !look && !swap;
    const count = view.choices.length;
    // Mesto za izbore (ili dugme) ispod police (uspravno) ili desno od nje (položeno)
    // Četiri izbora: položeno i na uskom telefonu dva reda po dva (inače bi kartice bile sitne)
    const four = count >= 4;
    const side = look ? "0rem" : choices ? `${(four ? 2 : count) * 8 + 1}rem` : "0rem";
    const below = look ? "5.5rem" : choices ? (four ? "calc(18cqh + 8rem)" : "calc(15cqh + 5rem)") : "0rem";
    const cell = landscape
        ? `max(3rem, min(10rem, calc((100cqh - ${look ? "5.5rem" : "0rem"}) / ${rows.length} - 2.6rem), calc((100cqw - ${side} - var(--title)) / ${cols} - 1rem)))`
        : `max(3rem, min(10rem, calc((100cqh - ${below}) / ${rows.length} - 2rem), calc((100cqw - 1.5rem) / ${cols} - 1rem)))`;
    const cardPicture = landscape ? (four ? "min(4.5rem, 13cqh)" : "min(5.5rem, 26cqh)") : four ? "min(5rem, 10cqh)" : "min(7rem, 15cqh)";
    const hinted = view.hint ? view.answers.find((id) => !view.found.includes(id)) : undefined;

    return (
        <>
            {/* Polica i (dok dete gleda) dugme ispod nje */}
            <div className="flex shrink-0 flex-col items-center gap-3 sm:gap-4">
                {/* Polica: drveni okvir, svaki red ima svoju dasku; zavesa se navlači preko cele police */}
                <div
                    role="group"
                    aria-label="Polica"
                    className="relative shrink-0 overflow-hidden rounded-2xl border-4 border-amber-800 bg-amber-50 p-1.5 shadow-soft sm:p-2.5"
                    style={{ "--cell": cell } as CSSProperties}
                >
                    {rows.map((row, r) => (
                        <div key={r} className="flex justify-center gap-1.5 border-b-8 border-amber-700 px-1 pt-1.5 sm:gap-3 sm:px-2 sm:pt-2.5">
                            {row.map((slot) => {
                                const id = placedNow[slot];
                                const item = getShelfItem(id);
                                const found = view.found.includes(id);
                                const asking = swap && view.phase === "ask" && !disabled;
                                const wrongNow = swap && view.feedback === "wrong" && view.picked === id;
                                const hint = swap && hinted === id;
                                const content = item ? (
                                    <span data-fly={id} className="block h-full w-full">
                                        <ShelfPicture id={id} className="h-full w-full" />
                                    </span>
                                ) : (
                                    // Prazno mesto: tu je nešto stajalo
                                    <span aria-hidden="true" className="block h-full w-full rounded-xl border-2 border-dashed border-amber-300 bg-white/40" />
                                );
                                const box = "relative mb-1 grid aspect-square w-[var(--cell)] shrink-0 place-items-center rounded-xl p-1";
                                if (!swap || !item || view.phase !== "ask") {
                                    return (
                                        <span key={slot} className={box} aria-label={item ? item.name : "Prazno mesto"} role="img">
                                            {content}
                                            {found && !swap && <FoundBadge />}
                                        </span>
                                    );
                                }
                                const done = found || (view.feedback === "correct" && view.answers.includes(id));
                                return (
                                    <button
                                        key={slot}
                                        type="button"
                                        disabled={!asking || done || view.wrong.includes(id)}
                                        onClick={() => onShelf(id)}
                                        aria-label={`${item.name}${done ? ", promenilo mesto" : ""}`}
                                        className={cn(
                                            box,
                                            "border-2 border-transparent transition-[background-color,border-color,opacity] disabled:cursor-default",
                                            asking && !done && "bg-white/60 enabled:hover:border-brand-300 enabled:active:scale-95",
                                            done && "border-emerald-500 bg-emerald-50",
                                            wrongNow && "border-rose-300 bg-rose-50",
                                            view.wrong.includes(id) && !wrongNow && "opacity-60",
                                            hint && "animate-soft-pulse border-brand-400 bg-brand-50"
                                        )}
                                    >
                                        {content}
                                        {done && <FoundBadge />}
                                        {showHand && id === view.answers[0] && !found && <DemoHand />}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                    <Curtain closed={curtain} calm={calm} />
                </div>

                {look && !monitor && (
                    <button
                        type="button"
                        onClick={onRemembered}
                        disabled={disabled}
                        className={cn(
                            "relative inline-flex min-h-16 shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] px-7 font-display text-xl font-extrabold text-white transition-[transform,border-width] active:translate-y-[3px] active:border-b-2 sm:text-2xl [@media(max-height:30rem)]:min-h-14 [@media(max-height:30rem)]:px-4 [@media(max-height:30rem)]:text-lg",
                            GAME.accent.solid,
                            GAME.accent.edge
                        )}
                    >
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M5 12.5 10 17.5 19 7" />
                        </svg>
                        {genderText("Zapamti{o|la} sam", female)}
                        {lookHand && <DemoHand />}
                    </button>
                )}
            </div>

            {choices && view.phase === "ask" && (
                <div className={cn("flex shrink-0 flex-col items-center gap-2", !landscape && "w-full max-w-2xl")}>
                    {columnTitle && <p className="text-center font-display text-lg font-extrabold leading-snug text-ink">{columnTitle}</p>}
                    <div
                        role="group"
                        aria-label="Stvari"
                        className={cn(
                            "grid shrink-0 gap-2 sm:gap-3",
                            count === 2 ? "grid-cols-2" : count === 3 ? "grid-cols-3" : landscape ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4",
                            landscape ? "w-auto" : "w-full"
                        )}
                    >
                        {view.choices.map((id) => {
                            const item = getShelfItem(id);
                            if (!item) return null;
                            const state = choiceState(view, id);
                            return (
                                <ChoiceCard
                                    key={`${view.round}-${id}`}
                                    state={state}
                                    disabled={disabled || (state !== "idle" && state !== "hint")}
                                    onClick={(event) => onPick(id, event)}
                                    aria-label={`${item.name}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                                    className={cn("animate-pop min-h-0 flex-col gap-1 px-1", short ? "py-1" : "py-2 sm:gap-1.5 sm:py-3")}
                                >
                                    <span data-pic="" className="block aspect-square" style={{ width: cardPicture }}>
                                        <ShelfPicture id={id} className={cn("h-full w-full transition-opacity", state === "correct" && "opacity-25")} />
                                    </span>
                                    <span className={cn("leading-tight", landscape ? "text-sm sm:text-base" : "text-base sm:text-lg")}>{item.name}</span>
                                    {showHand && id === view.answers[0] && <DemoHand />}
                                </ChoiceCard>
                            );
                        })}
                    </div>
                </div>
            )}
        </>
    );
}

function FoundBadge() {
    return (
        <span aria-hidden="true" className="absolute -right-1 -top-1 grid h-6 w-6 animate-pop place-items-center rounded-full bg-emerald-600 text-sm font-black text-white ring-2 ring-white">
            ✓
        </span>
    );
}

// ── Zavesa ────────────────────────────────────────────────────────────────────

/** Somot sa naborima: svetle i tamne pruge */
const VELVET = `repeating-linear-gradient(90deg, #8f2f5c 0px, #b24a78 14px, #c95d8c 22px, #a2416c 32px, #8f2f5c 40px)`;

function Curtain({ closed, calm }: { closed: boolean; calm: boolean }) {
    const move = calm ? `opacity ${CURTAIN_MOVE_MS / 2}ms ease` : `transform ${CURTAIN_MOVE_MS}ms cubic-bezier(0.5, 0, 0.3, 1)`;
    const half = (side: "left" | "right"): CSSProperties => ({
        background: VELVET,
        transition: move,
        transform: calm ? undefined : closed ? "translateX(0)" : `translateX(${side === "left" ? "-102%" : "102%"})`,
        opacity: calm ? (closed ? 1 : 0) : 1,
        boxShadow: side === "left" ? "inset -10px 0 14px rgb(0 0 0 / 0.18)" : "inset 10px 0 14px rgb(0 0 0 / 0.18)",
    });
    return (
        <div aria-hidden={!closed} className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute inset-y-0 left-0 w-1/2" style={half("left")} />
            <div className="absolute inset-y-0 right-0 w-1/2" style={half("right")} />
            {/* Zavesa je uvek „okačena”: gornja traka sa resama */}
            <div className="absolute inset-x-0 top-0 h-3 bg-[#7a2650] sm:h-4" style={{ boxShadow: "0 2px 4px rgb(0 0 0 / 0.2)" }} />
            <div
                className={cn("absolute inset-0 grid place-items-center transition-opacity", closed ? "opacity-100 delay-300" : "opacity-0")}
                style={{ transitionDuration: `${CURTAIN_MOVE_MS / 2}ms` }}
            >
                <span className="flex flex-col items-center gap-1 rounded-2xl bg-white/90 px-4 py-2 shadow-soft sm:gap-2 sm:px-6 sm:py-3">
                    <ClosedEyes />
                    <span className="font-display text-lg font-extrabold text-[#7a2650] sm:text-2xl">{CURTAIN_TEXT}</span>
                </span>
            </div>
        </div>
    );
}

/** Lice zatvorenih očiju (dete „ne gleda” dok se iza zavese nešto menja) */
function ClosedEyes() {
    return (
        <svg viewBox="0 0 48 48" className="h-10 w-10 sm:h-14 sm:w-14" aria-hidden="true">
            <circle cx={24} cy={24} r={20} fill="#f9d64a" stroke="#d9a01e" strokeWidth={1.6} />
            <path d="M13 22 Q17 26 21 22 M27 22 Q31 26 35 22" fill="none" stroke="#4a3a32" strokeWidth={2} strokeLinecap="round" />
            <path d="M18 32 Q24 35 30 32" fill="none" stroke="#4a3a32" strokeWidth={1.8} strokeLinecap="round" />
            <circle cx={13} cy={29} r={2.6} fill="#f59a9a" opacity={0.5} />
            <circle cx={35} cy={29} r={2.6} fill="#f59a9a" opacity={0.5} />
        </svg>
    );
}
