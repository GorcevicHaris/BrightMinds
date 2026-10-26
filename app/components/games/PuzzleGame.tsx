"use client";

// Igra „Složi sliku”: slika je isečena na delove, a dete prevlači delove na tablu (ili dodirne
// deo, pa mesto) i tako ponovo sastavlja sliku. Deo „sedne” samo na svoje mesto; deo koji nije
// na svom mestu se mirno vrati u korpu, bez zvuka greške. Prvi deo prvog nivoa pokazuje ruka.
// Na lakim nivoima ispod table je bleda cela slika, a pomoć (tačno mesto zasvetli) stiže već
// posle prve greške; kasnije se podrška povlači (videti data/puzzleLevels.ts).

import { useCallback, useEffect, useRef, useState } from "react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
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
    type GameProps,
    type TimerId,
    useGameRandom,
} from "@/app/components/games/kit";
import {
    buildPuzzleLevel,
    emptyPuzzleView,
    getPuzzlePicture,
    pictureInline,
    isDecoy,
    mergePuzzleMonitor,
    nextPictureView,
    pictureFirstTry,
    pieceId,
    placePiece,
    puzzleLevel,
    puzzleResult,
    roundIntro,
    TEXT_DECOY,
    TEXT_DEMO,
    TEXT_RETRY,
    TEXT_RETRY_SLOW,
    TEXT_WRONG_PLACE,
    type PuzzleRound,
    type PuzzleView,
} from "@/app/components/games/data/puzzleLevels";
import { traySlots } from "@/app/components/games/puzzle/boardLayout";
import { DEMO_MOVE_MS, PuzzleBoard } from "@/app/components/games/puzzle/PuzzleBoard";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("puzzle");
/** Poruka posle greške stoji ovoliko, pa se tabla smiri */
const WRONG_FEEDBACK_MS = 1600;
/** Složena slika ostaje na ekranu bar ovoliko pre sledeće (dete stigne da je pogleda) */
const SOLVED_MIN_MS = 2600;

export default function PuzzleGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<PuzzleView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<PuzzleView>({ childId, gameId: "puzzle", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Podrška se povlači: na lakim nivoima mesto zasvetli već posle prve greške i posle čekanja
    // (osim kad je roditelj isključio pomoć); kasnije važi ono što je podešeno.
    const rule = puzzleLevel(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se slike biraju samo jednom, ovde
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<PuzzleRound[]>(() => (isMonitor ? [] : buildPuzzleLevel(level, { maxRounds: settings.preset.maxRounds, random })));
    const [view, setView] = useState<PuzzleView>(() => emptyPuzzleView(plan));
    const [demo, setDemo] = useState<string | null>(null);
    const viewRef = useRef(view);
    const demoRef = useRef<string | null>(null);
    const demoStarted = useRef(false);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: PuzzleView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    const pictureName = (round: PuzzleRound | null) => pictureInline(getPuzzlePicture(round?.picture));
    const hasDemo = demoRounds(level, view.totalRounds) > 0;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(puzzleResult(final, level, sync.elapsedSec()));
    };

    const nextPicture = () => {
        if (finishedRef.current) return;
        const next = nextPictureView(viewRef.current, plan);
        if (!next.current) return finish();
        guard.hold();
        commit(next, `Slika ${next.picture}: ${pictureName(next.current)}`);
        say(roundIntro(next.current));
    };

    /** Deo je na svom mestu; posle poslednjeg dela slika je složena (pohvala, pa sledeća slika) */
    const place = (id: string, modeled: boolean) => {
        const current = viewRef.current;
        const { next, firstTry, done } = placePiece(current, plan, id, level, modeled);
        const how = modeled ? "pokazni deo" : firstTry ? "iz prvog pokušaja" : current.hinted.includes(id) || current.hint === id ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Deo na mestu (${how})${done ? ` — složena slika: ${pictureName(current.current)}` : ""}`);
        if (!done) {
            playSfx("flip");
            guard.hold();
            return;
        }
        playSfx("correct");
        guard.hold();
        const about = getPuzzlePicture(current.current?.picture)?.about ?? "Slika je cela.";
        const independent = pictureFirstTry(next) && !(hasDemo && current.picture === 1);
        const isLast = current.picture >= current.pictures;
        sayThen(praise(about, independent), isLast ? finish : nextPicture, { min: calm ? FEEDBACK_MIN_MS : SOLVED_MIN_MS, emotion: "happy" });
    };

    /** Pokazni deo (prvi deo prvog nivoa): ruka ga nosi na mesto, dete gleda */
    const startDemo = () => {
        if (demoStarted.current || finishedRef.current) return;
        const current = viewRef.current;
        const round = current.current;
        if (!round) return;
        const first = traySlots(
            round.tray.map((piece) => piece.id),
            current.placed,
            round.tray.length
        ).find((id): id is string => id !== null && !isDecoy(round, round.tray.find((piece) => piece.id === id)!));
        if (!first) return;
        demoStarted.current = true;
        demoRef.current = first;
        setDemo(first);
        say(TEXT_DEMO);
        // Ako se kraj leta ne javi (tab u pozadini), deo se ipak stavi na mesto
        after(DEMO_MOVE_MS * 3, finishDemo);
    };

    const finishDemo = () => {
        const id = demoRef.current;
        if (!id) return;
        demoRef.current = null;
        setDemo(null);
        place(id, true);
    };

    // Početak nivoa: uputstvo, a na prvom nivou zatim ruka pokaže prvi deo
    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const round = viewRef.current.current;
        if (!round) return;
        const intro = roundIntro(round);
        if (demoRounds(level, viewRef.current.totalRounds) > 0) sayThen(intro, startDemo, { min: 1500, max: 6000 });
        else say(intro);
        // Samo jednom na početku nivoa (startDemo se čuva od drugog poziva)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMonitor, sync, guard, say, level]);

    const select = (id: string) => {
        if (isMonitor || finishedRef.current || demoRef.current) return;
        const current = viewRef.current;
        if (current.solved || current.placed.includes(id) || current.rejected.includes(id)) return;
        playSfx("tap");
        commit({ ...current, selected: current.selected === id ? null : id });
    };

    const drop = (id: string, cell: number | null) => {
        if (isMonitor || finishedRef.current || demoRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const round = current.current;
        if (!round || current.solved || current.placed.includes(id) || current.rejected.includes(id)) return;
        const piece = round.tray.find((candidate) => candidate.id === id);
        if (!piece) return;
        const filled = new Set([...round.given, ...current.placed.flatMap((placed) => round.tray.find((p) => p.id === placed)?.cell ?? [])]);
        // Van table ili na mesto koje je već puno: deo se samo vrati u korpu (to nije greška)
        if (cell === null || filled.has(cell)) {
            if (current.selected) commit({ ...current, selected: null });
            return;
        }
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;

        const decoy = isDecoy(round, piece);
        if (!decoy && piece.cell === cell) {
            place(id, false);
            return;
        }

        // Uljez spušten na prazno mesto: to mesto (njegov pravi deo) više nije „iz prvog pokušaja"
        const target = decoy ? pieceId(cell) : id;
        const misses = { ...current.misses, [target]: (current.misses[target] ?? 0) + 1 };
        const tried = current.tried.includes(target) ? current.tried : [...current.tried, target];
        const open = round.tray.filter((p) => !isDecoy(round, p) && !current.placed.includes(p.id)).length;
        const showHint = !decoy && (current.hint === target || hintDue(hintAfter, misses[target], Math.max(1, open - 1)));
        const hint = showHint ? target : current.hint;
        const hinted = showHint && !current.hinted.includes(target) ? [...current.hinted, target] : current.hinted;
        const next: PuzzleView = {
            ...current,
            misses,
            tried,
            hint,
            hinted,
            rejected: decoy ? [...current.rejected, id] : current.rejected,
            selected: null,
            feedback: "wrong",
            lastDecoy: decoy,
            incorrectCount: current.incorrectCount + 1,
        };
        commit(next, decoy ? "Deo sa druge slike — ostaje sa strane" : `Deo nije na svom mestu${showHint && current.hint !== target ? " (prikazana pomoć)" : ""}`);
        playSfx("wrong");
        say(`${decoy ? TEXT_DECOY : TEXT_WRONG_PLACE} ${showHint ? TEXT_RETRY_SLOW : TEXT_RETRY}`, undefined, "gentle");
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            if (viewRef.current.feedback === "wrong") commit({ ...viewRef.current, feedback: null });
        });
    };

    // Pomoć posle čekanja: mesto sledećeg dela blago zasvetli (izabranog, ili prvog u korpi)
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.picture}:${view.placed.length}`, () => {
        const current = viewRef.current;
        const round = current.current;
        if (!round || finishedRef.current || demoRef.current || current.hint || current.solved || current.feedback) return;
        if (hasDemo && current.picture === 1 && !current.modeled) return; // ruka tek treba da pokaže
        const waiting = round.tray.filter((p) => !isDecoy(round, p) && !current.placed.includes(p.id));
        const target = waiting.find((p) => p.id === current.selected) ?? waiting[0];
        if (!target) return;
        commit({ ...current, hint: target.id, hinted: current.hinted.includes(target.id) ? current.hinted : [...current.hinted, target.id] }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const round = viewRef.current.current;
        if (!round || viewRef.current.solved) return;
        say(roundIntro(round));
    };

    const shown = isMonitor ? mergePuzzleMonitor(monitorState) : view;
    const round = shown.current;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const hud = <GameHud round={shown.picture} totalRounds={shown.pictures} unit="Slika" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} />;

    if (!round) {
        return (
            <GameStage>
                {hud}
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvu sliku" />
            </GameStage>
        );
    }

    const picture = getPuzzlePicture(round.picture);
    const half = round.given.length > 0;
    const decoys = round.tray.some((piece) => isDecoy(round, piece));
    const name = pictureInline(picture);
    const title = shown.solved ? (picture?.name ?? "Slika je cela") : half ? "Nađi drugu polovinu" : `Složi sliku: ${name}`;
    const subtitle = shown.solved ? undefined : decoys && !half ? "Jedan deo nije sa ove slike." : undefined;
    const message = shown.feedback === "correct" ? (picture?.about ?? "Slika je cela.") : shown.lastDecoy ? TEXT_DECOY : TEXT_WRONG_PLACE;

    return (
        <GameStage width="wide">
            {hud}
            <GamePrompt key={`prompt-${shown.picture}`} compact title={title} subtitle={subtitle} className="py-2 sm:py-3 short:sm:py-2 [@media(max-height:40rem)]:hidden" />
            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-3">
                <PuzzleBoard key={shown.picture} round={round} view={shown} calm={calm} disabled={isMonitor || shown.solved} demo={demo} onSelect={select} onDrop={drop} onDemoDone={finishDemo} />
                <Feedback kind={shown.feedback} correctText={message} wrongText={message} className="pointer-events-none absolute inset-x-2 top-2 z-30" />
            </PlayArea>
        </GameStage>
    );
}
