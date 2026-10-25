"use client";

// Igra „Prve reči”: rano čitanje. Slika i napisana reč, prvo slovo reči, slaganje reči od
// slogova i od slova, pa kratka rečenica i slika. Reč uz sliku se čuje samo na dugme „Ponovi”
// (glas ne čita ponuđene reči umesto deteta). Složen slog ili slovo doleti na svoje mesto;
// posle greške glas mirno kaže šta je izabrano, a pomoć (sledeći tačan izbor zasvetli) se na
// težim nivoima povlači.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from "react";
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
    hintDue,
    PlayArea,
    playSfx,
    SpeakButton,
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
    answerSentence,
    buildWordsLevel,
    emptyWordsView,
    firstLetter,
    getSentence,
    getWord,
    isBuild,
    lettersOf,
    mergeWordsMonitor,
    nextTile,
    roundView,
    shownLetter,
    shownText,
    solveWordsView,
    spokenItem,
    spokenQuestion,
    titleFor,
    wordPieces,
    wordsResult,
    wordsRule,
    wrongSentence,
    type TextStyle,
    type WordsRound,
    type WordsView,
} from "@/app/components/games/data/wordsItems";
import { SentencePicture, WordPicture } from "@/app/components/games/words/WordPictures";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("words");
const WRONG_FEEDBACK_MS = 1400;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
/** Nizak ekran (položen telefon, nizak laptop): poruka stoji preko donjeg dela polja, da igra dobije visinu */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

function choiceState(view: WordsView, id: string): ChoiceState {
    if (view.feedback === "correct") return id === view.answer ? "correct" : "dimmed";
    if (view.feedback === "wrong" && view.picked === id) return "wrong";
    if (view.wrong.includes(id)) return "dimmed";
    if (view.hint && id === view.answer) return "hint";
    return "idle";
}

/** Poruka ispod igre (na ekranu: reč onako kako je dete vidi) */
function feedbackText(view: WordsView, style: TextStyle): string {
    const word = getWord(view.item);
    const show = (text: string) => shownText(text, style);
    if (view.feedback === "correct") {
        switch (view.kind) {
            case "match":
                return word ? `To je ${show(word.word)}.` : "";
            case "first":
                return word ? `${show(capitalize(word.word))} počinje slovom ${shownLetter(firstLetter(word), style)}.` : "";
            case "syllables":
                return word ? `${wordPieces(view).map(show).join(" - ")}: ${show(word.word)}` : "";
            case "letters":
                return word ? show(word.word) : "";
            case "sentence":
                return show(getSentence(view.item)?.text ?? "");
        }
    }
    if (view.feedback === "wrong" && view.picked !== null) {
        const retry = view.hint ? RETRY_SLOW : RETRY;
        if (view.kind === "match") return `Ovde piše ${show(view.picked)}. ${retry}`;
        if (view.kind === "first") return `To je slovo ${shownLetter(view.picked, style)}. ${retry}`;
        return `${wrongSentence(view, view.picked)} ${retry}`;
    }
    return "";
}

const NARROW = "(max-width: 639px)";

/** Uzan ekran (telefon uspravno) */
function useNarrow(): boolean {
    return useSyncExternalStore(
        (listener) => {
            if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
            const query = window.matchMedia(NARROW);
            query.addEventListener?.("change", listener);
            return () => query.removeEventListener?.("change", listener);
        },
        () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(NARROW).matches,
        () => false
    );
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase("sr") + text.slice(1);

export default function WordsGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<WordsView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const landscape = useLandscape();
    const short = useShortScreen();
    const narrow = useNarrow();
    const sync = useGameSync<WordsView>({
        childId,
        gameId: "words",
        level,
        isMonitor,
    });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();
    const style: TextStyle = {
        upper: settings.uppercase,
        script: settings.script,
    };

    // Podrška se povlači: na lakim nivoima tačan izbor zasvetli već posle prve greške
    const rule = wordsRule(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    const [plan] = useState<WordsRound[]>(() =>
        isMonitor
            ? []
            : buildWordsLevel(level, {
                  maxChoices: settings.choiceLimit,
                  maxRounds: settings.preset.maxRounds,
              })
    );
    const [view, setView] = useState<WordsView>(() => ({
        ...emptyWordsView(plan.length),
        ...(plan[0] ? roundView(plan[0]) : {}),
    }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const pendingFly = useRef<{ key: string; from: Box | null } | null>(null);
    const boardRef = useRef<HTMLDivElement | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: WordsView, log?: string) => {
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
        flyIn(boardRef.current?.querySelector(`[data-fly="${pending.key}"]`), pending.from);
    }, [view, calm]);

    // Početak nivoa: prvo pitanje
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        say(spokenQuestion(viewRef.current));
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: WordsView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(wordsResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: WordsView = {
            ...viewRef.current,
            ...roundView(round),
            round: index + 1,
            placed: [],
            wrong: [],
            picked: null,
            feedback: null,
            hint: false,
        };
        commit(next, `Zadatak ${index + 1}: ${spokenQuestion(next)} (${next.item})`);
        say(spokenQuestion(next));
    };

    const solve = (current: WordsView, solved: Partial<WordsView>, log: string) => {
        const { next, firstTry, modeled } = solveWordsView(current, level, solved);
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Tačno ${how}: ${log}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(answerSentence(current), firstTry), isLast ? finish : () => startRound(current.round), { min: calm ? undefined : FLY_IN_MS + 900, emotion: "happy" });
    };

    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, picked: null, feedback: null });
        });
    };

    const miss = (current: WordsView, id: string, offered: number, log: string) => {
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
        say(`${wrongSentence(current, id)} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong();
    };

    /** Izbor reči, slova ili slike */
    const handlePick = (id: string, event?: MouseEvent<HTMLElement>) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (isBuild(current.kind) || current.feedback === "correct" || current.wrong.includes(id) || !current.choices.includes(id)) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        if (id === current.answer) {
            if (current.kind === "first")
                pendingFly.current = {
                    key: "first",
                    from: boxOf(event?.currentTarget.querySelector("[data-pic]")),
                };
            solve(current, { picked: null }, `${current.item} → ${id}`);
            return;
        }
        miss(current, id, current.choices.length - 1, `${current.item} → ${id}`);
    };

    /** Pločica (slog ili slovo) za slaganje */
    const handleTile = (index: number, event?: MouseEvent<HTMLElement>) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        if (!isBuild(current.kind) || current.feedback === "correct" || current.placed.includes(index) || index < 0 || index >= current.choices.length) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const pieces = wordPieces(current);
        const need = pieces[current.placed.length];
        if (current.choices[index] === need) {
            const placed = [...current.placed, index];
            pendingFly.current = {
                key: `slot-${current.placed.length}`,
                from: boxOf(event?.currentTarget),
            };
            if (placed.length >= pieces.length) {
                solve(current, { placed, picked: null }, `${current.item} (${pieces.join("-")})`);
                return;
            }
            commit({ ...current, placed, picked: null, feedback: null, hint: false }, `Složeno: ${need}`);
            playSfx("tap");
            return;
        }
        miss(current, String(index), Math.max(1, pieces.length - current.placed.length - 1), `${current.item}: ${current.choices[index]} umesto ${need}`);
    };

    // Pomoć posle čekanja: sledeći tačan izbor blago zasvetli
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.placed.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.hint || current.feedback) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        say(spokenQuestion(current));
    };

    /** „Ponovi” uz sliku ili rečenicu: samo reč (ili rečenica) */
    const sayItem = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        say(spokenItem(current));
    };

    const shown = isMonitor ? mergeWordsMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const hud = (
        <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
    );
    const word = getWord(shown.item);
    const sentence = getSentence(shown.item);
    const ready = shown.choices.length > 0 && (shown.kind === "sentence" ? Boolean(sentence) : Boolean(word));

    if (!ready) {
        return (
            <GameStage>
                {hud}
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = feedbackText(shown, style);
    const showHand = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved;
    const speaker = isMonitor ? undefined : sayItem;
    const inShort = short && landscape;
    const titleLeft = inShort && (shown.kind === "match" || shown.kind === "first");
    const titleAbove = inShort && isBuild(shown.kind);

    return (
        <GameStage>
            {hud}
            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up [@media(max-height:30rem)]:hidden" compact title={titleFor(shown, style)} />

            <PlayArea accent={GAME.accent} className="p-2 sm:p-4">
                <div
                    ref={boardRef}
                    className={cn(
                        "relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 sm:gap-4",
                        shown.kind !== "sentence" && "landscape:flex-row",
                        isMonitor && "pointer-events-none"
                    )}
                    style={{ containerType: "size", ["--title" as string]: titleLeft ? "9.5rem" : "0rem" }}
                >
                    {/* Položen telefon: uputstvo stoji u polju (kartica sa uputstvom bi uzela previše visine) — levo, ili iznad pločica */}
                    {titleLeft && <p className="w-36 shrink-0 text-center font-display text-lg font-extrabold leading-snug text-ink">{titleFor(shown, style)}</p>}
                    {shown.kind === "sentence" ? (
                        <SentenceBoard
                            view={shown}
                            style={style}
                            landscape={landscape}
                            narrow={narrow}
                            showHand={showHand}
                            disabled={isMonitor || solved}
                            onSpeak={shown.speaker ? speaker : undefined}
                            onPick={handlePick}
                        />
                    ) : isBuild(shown.kind) ? (
                        <BuildBoard
                            view={shown}
                            style={style}
                            calm={calm}
                            landscape={landscape}
                            columnTitle={titleAbove ? titleFor(shown, style) : null}
                            showHand={showHand}
                            disabled={isMonitor || solved}
                            onSpeak={speaker}
                            onTile={handleTile}
                        />
                    ) : (
                        <ChoiceBoard view={shown} style={style} calm={calm} landscape={landscape} showHand={showHand} disabled={isMonitor || solved} onSpeak={speaker} onPick={handlePick} />
                    )}
                </div>
            </PlayArea>

            <Feedback kind={message ? shown.feedback : null} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Slika reči sa dugmetom „Ponovi” ───────────────────────────────────────────

function Picture({ view, size, onSpeak, children }: { view: WordsView; size: string; onSpeak?: () => void; children?: ReactNode }) {
    const word = getWord(view.item);
    if (!word) return null;
    return (
        <div className="relative flex shrink-0 flex-col items-center gap-1.5 sm:gap-2">
            <div className="relative overflow-hidden rounded-card bg-surface shadow-soft ring-1 ring-black/5" style={{ width: size, height: size }}>
                <WordPicture pic={word.pic} className="absolute inset-0 h-full w-full" />
                {onSpeak && <WordSpeaker onClick={onSpeak} />}
            </div>
            {children}
        </div>
    );
}

/** Malo dugme „Ponovi” u uglu slike: glas kaže samo reč */
function WordSpeaker({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label="Ponovi reč"
            className="absolute bottom-1.5 right-1.5 inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border-2 border-b-[3px] border-brand-700 bg-brand-500 px-2 text-sm font-extrabold text-white shadow-soft transition-[transform,border-width] hover:bg-brand-600 active:translate-y-[2px] active:border-b-2"
        >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
            </svg>
            <span className="hidden md:inline [@media(max-height:37.5rem)]:hidden">Ponovi</span>
        </button>
    );
}

// ── Slika i reč, prvo slovo ───────────────────────────────────────────────────

interface ChoiceBoardProps {
    view: WordsView;
    style: TextStyle;
    calm: boolean;
    landscape: boolean;
    showHand: boolean;
    disabled: boolean;
    onSpeak?: () => void;
    onPick: (id: string, event?: MouseEvent<HTMLElement>) => void;
}

function ChoiceBoard({ view, style, calm, landscape, showHand, disabled, onSpeak, onPick }: ChoiceBoardProps) {
    const word = getWord(view.item);
    if (!word) return null;
    const first = view.kind === "first";
    const count = view.choices.length;
    const solved = view.feedback === "correct";
    const letters = lettersOf(word);
    // Reč bez prvog slova (prvo slovo dete bira); posle tačnog izbora slovo doleti na mesto
    const rest = shownText(letters.slice(1).join(""), style);
    const longest = Math.max(...view.choices.map((id) => (first ? shownLetter(id, style) : shownText(id, style)).length));
    const portraitPicture = first ? "min(calc(100cqh - 11rem), calc(100cqw - 2rem), 20rem)" : "min(calc(100cqh - 7.5rem), calc(100cqw - 2rem), 22rem)";
    const landscapePicture = first ? "min(calc(100cqh - 4.5rem), 22rem, 34cqw)" : "min(calc(100cqh - 0.5rem), 22rem, 34cqw)";
    // Položeno: izbori dobijaju ostatak širine (pored uputstva i slike)
    const row = landscape ? `min(26rem, calc(100cqw - var(--title) - ${landscapePicture} - 2.5rem))` : "min(42rem, 100cqw)";
    const choiceFont = first ? `min(3rem, ${landscape ? 18 : 9}cqh)` : `min(2.25rem, calc((${row} / ${count} - 2rem) / ${(longest * 0.7).toFixed(2)}), ${landscape ? 14 : 8}cqh)`;

    return (
        <>
            <Picture view={view} size={landscape ? landscapePicture : portraitPicture} onSpeak={onSpeak}>
                {first && <FirstLetterWord letter={solved ? shownLetter(view.answer, style) : null} rest={rest} />}
            </Picture>

            <div
                role="group"
                aria-label={first ? "Slova" : "Reči"}
                className={cn("grid w-full max-w-2xl shrink-0 gap-2.5 sm:gap-4", count === 2 ? "grid-cols-2" : "grid-cols-3")}
                style={landscape ? { width: row } : undefined}
            >
                {view.choices.map((id) => {
                    const state = choiceState(view, id);
                    const text = first ? shownLetter(id, style) : shownText(id, style);
                    return (
                        <ChoiceCard
                            key={`${view.round}-${id}`}
                            state={state}
                            disabled={disabled || (state !== "idle" && state !== "hint")}
                            onClick={(event) => onPick(id, event)}
                            aria-label={`${text}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                            className="animate-pop min-h-[clamp(3.5rem,14cqh,6.5rem)] px-1.5 py-2"
                        >
                            {/* Reči i slova su bez prevođenja u velika slova preko CSS-a: oblik prati podešavanje */}
                            <span
                                data-pic=""
                                className={cn("normal-case font-display font-extrabold leading-none tracking-wide text-ink", first && solved && state === "correct" && !calm && "opacity-0")}
                                style={{ fontSize: choiceFont }}
                            >
                                {text}
                            </span>
                            {showHand && id === view.answer && <DemoHand />}
                        </ChoiceCard>
                    );
                })}
            </div>
        </>
    );
}

/** „_OPTA”: prvo mesto je prazno dok dete ne izabere slovo */
function FirstLetterWord({ letter, rest }: { letter: string | null; rest: string }) {
    return (
        <p
            className="normal-case flex items-end font-display font-extrabold leading-none tracking-wide text-ink"
            style={{ fontSize: "min(3.25rem, 11cqh, 11cqw)" }}
            aria-label={letter ? `${letter}${rest}` : `prazno mesto, pa ${rest}`}
        >
            <span
                data-fly="first"
                className={cn(
                    "mr-1 inline-grid min-w-[1.1em] place-items-center rounded-lg px-1 py-0.5",
                    letter ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400" : "border-2 border-dashed border-[#a8b452] bg-white text-transparent"
                )}
            >
                {letter ?? "A"}
            </span>
            <span>{rest}</span>
        </p>
    );
}

// ── Slaganje od slogova i slova ───────────────────────────────────────────────

interface BuildProps {
    view: WordsView;
    style: TextStyle;
    /** Uputstvo iznad pločica (položen telefon) */
    columnTitle: string | null;
    calm: boolean;
    landscape: boolean;
    showHand: boolean;
    disabled: boolean;
    onSpeak?: () => void;
    onTile: (index: number, event?: MouseEvent<HTMLElement>) => void;
}

function BuildBoard({ view, style, columnTitle, calm, landscape, showHand, disabled, onSpeak, onTile }: BuildProps) {
    const pieces = wordPieces(view);
    const solved = view.feedback === "correct";
    const next = nextTile(view);
    const count = pieces.length;
    const syllables = view.kind === "syllables";
    // Pločica: veličina zavisi od broja delova (sve staje u jedan red i na uskom telefonu)
    const longest = Math.max(...pieces.map((piece) => shownText(piece, style).length));
    // Položeno: pored slike (kvadrat visine polja) i uputstva
    const picture = landscape ? "min(calc(100cqh - 0.5rem), 15rem, 30cqw)" : "min(calc(100cqh - 11.5rem), calc(100cqw - 2rem), 18rem)";
    const avail = landscape ? "(100cqw - min(calc(100cqh - 0.5rem), 15rem, 30cqw) - var(--title) - 3rem)" : "(100cqw - 1rem)";
    const tileW = syllables ? `min(${(2.2 + longest * 1.25).toFixed(2)}rem, calc(${avail} / ${count} - 0.6rem))` : `min(4.5rem, calc(${avail} / ${count} - 0.5rem))`;
    const tileH = landscape ? "min(4.75rem, 23cqh)" : "min(4.75rem, 12cqh)";
    const font = syllables ? `min(2.25rem, ${landscape ? 13 : 7.5}cqh, calc(${tileW} / ${(longest * 0.72 + 0.4).toFixed(2)}))` : `min(2.5rem, ${landscape ? 14 : 8}cqh)`;
    const wiggle = view.feedback === "wrong" && view.picked !== null ? Number(view.picked) : -1;
    const box: CSSProperties = { width: tileW, height: tileH, fontSize: font };

    return (
        <>
            <Picture view={view} size={picture} onSpeak={onSpeak} />

            <div className="flex min-w-0 shrink-0 flex-col items-center gap-3 sm:gap-5">
                {columnTitle && <p className="text-center font-display text-lg font-extrabold leading-snug text-ink">{columnTitle}</p>}
                {/* Mesta za delove reči, redom */}
                <div role="group" aria-label="Reč" className="flex items-center justify-center gap-1.5 sm:gap-2.5">
                    {pieces.map((piece, i) => {
                        const filled = i < view.placed.length;
                        return (
                            <span
                                key={i}
                                data-fly={`slot-${i}`}
                                aria-label={filled ? shownText(piece, style) : "prazno mesto"}
                                className={cn(
                                    "normal-case grid shrink-0 place-items-center rounded-2xl font-display font-extrabold leading-none",
                                    filled
                                        ? solved
                                            ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-400"
                                            : "bg-surface text-ink shadow-soft ring-2 ring-[#a8b452]"
                                        : "border-2 border-dashed border-[#a8b452] bg-white/70",
                                    filled && solved && !calm && "animate-pop"
                                )}
                                style={box}
                            >
                                {filled ? shownText(piece, style) : ""}
                            </span>
                        );
                    })}
                </div>

                {/* Pločice pomešanim redom; složena pločica ostavlja prazno mesto */}
                <div
                    role="group"
                    aria-label={syllables ? "Slogovi" : "Slova"}
                    className="flex items-center justify-center gap-1.5 rounded-card border-2 border-dashed border-line bg-surface/70 p-1.5 sm:gap-2.5 sm:p-2.5"
                >
                    {view.choices.map((piece, i) => {
                        if (view.placed.includes(i)) return <span key={i} aria-hidden="true" className="shrink-0 rounded-2xl border-2 border-dashed border-line/70" style={box} />;
                        const hinted = view.hint && i === next;
                        const wrong = wiggle === i;
                        return (
                            <button
                                key={`${view.round}-${i}`}
                                type="button"
                                disabled={disabled}
                                onClick={(event) => onTile(i, event)}
                                aria-label={shownText(piece, style)}
                                className={cn(
                                    "normal-case relative grid shrink-0 select-none place-items-center rounded-2xl border-2 border-b-[5px] bg-surface font-display font-extrabold leading-none text-ink shadow-soft transition-[transform,border-color,background-color] active:translate-y-[3px] active:border-b-2 disabled:cursor-default",
                                    hinted ? "animate-soft-pulse border-brand-400 bg-brand-50" : wrong ? "border-rose-300 bg-rose-50" : "border-line hover:border-brand-300",
                                    wrong && !calm && "animate-wiggle"
                                )}
                                style={box}
                            >
                                {shownText(piece, style)}
                                {showHand && i === next && <DemoHand />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// ── Rečenica i slike ──────────────────────────────────────────────────────────

interface SentenceProps {
    view: WordsView;
    style: TextStyle;
    landscape: boolean;
    /** Uzan ekran (telefon) */
    narrow: boolean;
    showHand: boolean;
    disabled: boolean;
    onSpeak?: () => void;
    onPick: (id: string, event?: MouseEvent<HTMLElement>) => void;
}

function SentenceBoard({ view, style, landscape, narrow, showHand, disabled, onSpeak, onPick }: SentenceProps) {
    const sentence = getSentence(view.item);
    if (!sentence) return null;
    const count = view.choices.length;
    const twoRows = !landscape && count === 3 && narrow;
    return (
        <>
            <div className="flex shrink-0 items-center gap-3 rounded-card bg-surface px-4 py-2.5 shadow-soft ring-1 ring-black/5 sm:px-6 sm:py-4">
                <p className="normal-case font-display text-[clamp(1.6rem,8cqw,3rem)] font-extrabold leading-tight tracking-wide text-ink short:text-[clamp(1.4rem,7cqh,2.5rem)]">
                    {shownText(sentence.text, style)}
                </p>
                {onSpeak && <SpeakButton onClick={onSpeak} />}
            </div>
            {/* Uspravan telefon: tri slike u dva reda (dve, pa jedna u sredini), da budu dovoljno krupne */}
            <div role="group" aria-label="Slike" className={cn("flex w-full shrink-0 flex-wrap justify-center gap-2.5 sm:gap-4", count === 2 ? "max-w-xl" : "max-w-3xl")}>
                {view.choices.map((id) => {
                    const state = choiceState(view, id);
                    return (
                        <ChoiceCard
                            key={`${view.round}-${id}`}
                            state={state}
                            disabled={disabled || (state !== "idle" && state !== "hint")}
                            onClick={(event) => onPick(id, event)}
                            aria-label={`Slika ${view.choices.indexOf(id) + 1}${state === "correct" ? ", tačno" : state === "wrong" ? ", netačno" : ""}`}
                            className="animate-pop min-h-0 p-1.5 sm:p-2.5"
                            style={{ width: twoRows ? "calc(50% - 0.32rem)" : count === 2 ? "calc(50% - 0.5rem)" : "calc(33.333% - 0.7rem)" }}
                        >
                            <span
                                className="block aspect-square overflow-hidden rounded-xl"
                                style={{
                                    width: `min(100%, ${twoRows ? "calc((100cqh - 6.5rem) / 2 - 1.2rem)" : `calc(100cqh - ${landscape ? 6 : 7}rem)`}, 16rem)`,
                                }}
                            >
                                <SentencePicture id={id} className="h-full w-full" />
                            </span>
                            {showHand && id === view.answer && <DemoHand />}
                        </ChoiceCard>
                    );
                })}
            </div>
        </>
    );
}
