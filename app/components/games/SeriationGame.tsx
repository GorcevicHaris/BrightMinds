"use client";

// Igra „Poređaj po veličini”: predmeti leže izmešani u korpi, a iznad njih je red mesta (more,
// nebo, trava, polica). Dete prevlači predmet koji je sledeći na redu (ili ga dodirne — ode na
// sledeće mesto). Predmet koji nije na redu se zaljulja i mirno vrati, a glas kaže zašto („Ova
// riba je veća. Prvo ide najmanja.”). Kad je red pun, predmeti urade nešto veselo. Na nivou
// umetanja red je već poređan, a jedan predmet traži svoj razmak (dodir predmeta, pa razmaka).
// Nema žurbe ni tajmera. Nivoi: data/seriationLevels.ts, crteži: seriation/.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { DragDemo } from "@/app/components/games/kit/DragDemo";
import { useDragSnap, type DragSnap } from "@/app/components/games/kit/useDragSnap";
import {
    buildSeriationLevel,
    correctGap,
    doneSentence,
    emptySeriationView,
    gapId,
    getTheme,
    mergeSeriationMonitor,
    missesOffered,
    mistakeSentence,
    nextPiece,
    pieceLabel,
    rowOrder,
    seriationCaption,
    seriationLevel,
    seriationQuestion,
    seriationResult,
    seriationRoundView,
    slotId,
    solveSeriationView,
    stepSentence,
    trayLeft,
    tryPlace,
    type SeriationPiece,
    type SeriationRound,
    type SeriationView,
    type Stage,
    type ThemeId,
} from "@/app/components/games/data/seriationLevels";
import { DirectionWedge, LANE_RATIO, LengthArt, PieceArt, SeriationStyles } from "@/app/components/games/seriation/SeriationArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("seriation");
const WRONG_FEEDBACK_MS = 1600;
/** Koliko traje veselo slavlje punog reda (pre sledećeg zadatka) */
const CHEER_MS = 2600;
/** Nizak ekran: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";
/**
 * Razmak (umetanje) se vidi kao uska traka (deo širine mesta), a dodir prima i preko pola
 * susednih predmeta (oni se tada ne mogu dodirnuti), pa je meta široka bar jedno mesto.
 */
const GAP_SHARE = 0.4;

export default function SeriationGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<SeriationView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<SeriationView>({ childId, gameId: "seriation", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Na lakim nivoima pomoć stiže već posle prve greške i posle čekanja (osim kad je isključena)
    const rule = seriationLevel(level);
    const early = rule.earlyHint && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde.
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<SeriationRound[]>(() =>
        isMonitor ? [] : buildSeriationLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })
    );
    const [view, setView] = useState<SeriationView>(() => ({ ...emptySeriationView(plan.length), ...(plan[0] ? seriationRoundView(plan[0]) : {}) }));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    // Predmet koji je dodirom poslat na pogrešno mesto: kratko se zaljulja u korpi
    const [wiggle, setWiggle] = useState<string | null>(null);

    const commit = useCallback(
        (next: SeriationView, log?: string) => {
            viewRef.current = next;
            setView(next);
            sync.update(next, log);
        },
        [sync]
    );

    useEffect(() => {
        if (isMonitor) return;
        guard.hold();
        sync.start(viewRef.current);
        const question = seriationQuestion(viewRef.current);
        if (question) say(question);
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: SeriationView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(seriationResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan[index];
        if (!round) return;
        guard.hold();
        const next: SeriationView = { ...viewRef.current, ...seriationRoundView(round), round: index + 1 };
        const question = seriationQuestion(next);
        commit(next, `Zadatak ${index + 1}: ${question}`);
        say(question);
    };

    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, feedback: null });
        });
    };

    /** Predmet je spušten na mesto (ili dodirnut). Vraća true kad je prihvaćen (inače se vraća u korpu). */
    const place = (id: string, slot: string | null): boolean => {
        if (isMonitor || finishedRef.current || guard.blocked()) return false;
        const current = viewRef.current;
        if (current.feedback === "correct") return false;
        const attempt = tryPlace(current, id, slot);
        if (attempt.result === "invalid") return false;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const label = pieceLabel(current.theme as ThemeId, current.pieces.find((piece) => piece.id === id) ?? { id, value: 0 }, current.pieces);

        if (attempt.result === "ok") {
            const placed = [...current.placed, id];
            const step = { placed, last: id, selected: null, mistake: null, hint: false, stepWrong: 0 };
            if (placed.length + current.given.length >= current.pieces.length) {
                const { next, firstTry, modeled } = solveSeriationView(current, level, { ...step, feedback: "correct" });
                const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.helped || current.hint ? "uz pomoć" : "posle više pokušaja";
                commit(next, `Red je pun ${how}: ${rowOrder(current).join(", ")}`);
                playSfx("correct");
                const isLast = current.round >= current.totalRounds;
                sayThen(praise(doneSentence(current), firstTry), isLast ? finish : () => startRound(current.round), {
                    min: calm ? FEEDBACK_MIN_MS + 600 : CHEER_MS,
                    max: calm ? undefined : CHEER_MS + 1800,
                    emotion: "happy",
                });
                return true;
            }
            commit({ ...current, ...step, feedback: null }, `Postavljeno: ${label}`);
            playSfx("correct");
            say(stepSentence(current, id));
            return true;
        }

        const stepWrong = current.stepWrong + 1;
        const hint = current.hint || hintDue(hintAfter, stepWrong, missesOffered(current));
        const next: SeriationView = {
            ...current,
            wrong: [...current.wrong, attempt.gap !== undefined ? `${id}>${attempt.gap}` : id],
            stepWrong,
            hint,
            helped: current.helped || hint,
            selected: null,
            mistake: { piece: id, expected: attempt.expected, gap: attempt.gap },
            feedback: "wrong",
            incorrectCount: current.incorrectCount + 1,
        };
        const text = mistakeSentence(next);
        commit(next, `Nije na redu: ${label} — ${text}`);
        playSfx("wrong");
        say(text, undefined, "gentle");
        settleAfterWrong();
        return false;
    };

    const shake = (id: string) => {
        if (calm) return;
        setWiggle(id);
        after(520, () => setWiggle(null));
    };

    /** Dodir predmeta: obično ide na sledeće mesto; kod umetanja se bira (pa se dodirne razmak) */
    const tapPiece = (id: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.feedback === "correct" || !trayLeft(current).includes(id)) return;
        if (current.insert) {
            playSfx("tap");
            commit({ ...current, selected: current.selected === id ? null : id });
            return;
        }
        if (!place(id, null)) shake(id);
    };

    const tapSlot = (slot: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        const left = trayLeft(current);
        const piece = current.selected ?? (current.insert && left.length === 1 ? left[0] : null);
        if (!piece) return;
        if (!place(piece, slot)) shake(piece);
    };

    // Pomoć posle čekanja: sledeći pravi predmet (i njegovo mesto) blago zasvetli
    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.placed.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hint) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true, helped: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        const question = seriationQuestion(current);
        if (question) say(question);
    };

    // Predmet koji prati prst je iste veličine kao kartica iz koje je uzet (veličina je važna)
    const [ghost, setGhost] = useState({ w: 80, h: 80 });
    // Posle puštenog predmeta pregledač ponekad pošalje i „klik” (a ponekad ne, kad je predmet već
    // nestao iz korpe): klik odmah posle spuštanja se ne računa kao dodir, a sledeći pravi dodir važi
    const dropAt = useRef(0);
    const clickPiece = (id: string) => {
        if (Date.now() - dropAt.current < 450) return;
        tapPiece(id);
    };
    const drag = useDragSnap({
        enabled: !isMonitor && view.feedback !== "correct",
        calm,
        onDrop: (piece, slot) => {
            dropAt.current = Date.now();
            return slot === null ? false : place(piece, slot);
        },
        onTap: tapPiece,
        onGrab: (piece) => {
            const card = document.querySelector<HTMLElement>(`[data-piece="${piece}"]`);
            if (card) {
                const rect = card.getBoundingClientRect();
                setGhost({ w: rect.width, h: rect.height });
            }
            const current = viewRef.current;
            if (current.insert && current.selected !== piece) commit({ ...current, selected: piece });
        },
    });

    const shown = isMonitor ? mergeSeriationMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const question = seriationQuestion(shown);

    if (!question) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi zadatak" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = solved ? doneSentence(shown) : shown.feedback === "wrong" ? mistakeSentence(shown) : "";
    const demo = !isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Zadatak" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: pitanje samo glasom (i kratak natpis u redu), da predmeti budu krupni */}
            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up [@media(max-height:37.5rem)]:hidden" compact title={question} />
            <PlayArea accent={GAME.accent} className="relative p-1.5 sm:p-3">
                <Board key={`board-${shown.round}`} view={shown} drag={drag} ghost={ghost} calm={calm} wiggle={wiggle} demo={demo} disabled={isMonitor || solved} onSlot={tapSlot} onPiece={clickPiece} />
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Tabla ─────────────────────────────────────────────────────────────────────

interface BoardProps {
    view: SeriationView;
    drag: DragSnap;
    ghost: { w: number; h: number };
    calm: boolean;
    wiggle: string | null;
    demo: boolean;
    disabled: boolean;
    onSlot: (slot: string) => void;
    onPiece: (piece: string) => void;
}

/** Šta svetli kao pomoć: sledeći predmet i njegovo mesto */
function hintTarget(view: SeriationView): { piece: string | null; slot: string | null } {
    if (!view.hint || view.feedback === "correct") return { piece: null, slot: null };
    const piece = view.insert ? (view.selected ?? nextPiece(view)) : nextPiece(view);
    if (!piece) return { piece: null, slot: null };
    return { piece, slot: view.insert ? gapId(correctGap(view, piece)) : slotId(view.placed.length) };
}

function Board({ view, drag, ghost, calm, wiggle, demo, disabled, onSlot, onPiece }: BoardProps) {
    const { rootRef, ghostRef, active, wobble } = drag;
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const theme = getTheme(view.theme);
    if (!theme) return null;
    const lanes = theme.measure === "length";
    const max = Math.max(...view.pieces.map((piece) => piece.value), 1);
    const hinted = hintTarget(view);
    const demoPiece = demo ? nextPiece(view) : null;

    const setRootRef = (el: HTMLDivElement | null) => {
        rootRef(el);
        setRoot((previous) => (previous === el ? previous : el));
    };

    const activePiece = active ? view.pieces.find((piece) => piece.id === active) : undefined;
    const art = (piece: SeriationPiece, extra: { cheer?: boolean; index?: number; silhouette?: boolean; className?: string } = {}) =>
        lanes ? (
            <LengthArt theme={theme.id} value={piece.value} max={max} tone={view.tone} {...extra} />
        ) : (
            <PieceArt theme={theme.id} id={piece.id} value={piece.value} max={max} tone={view.tone} {...extra} />
        );

    return (
        <div ref={setRootRef} className={cn("relative flex min-h-0 w-full flex-1 self-stretch", disabled && "pointer-events-none")} style={{ containerType: "size" }}>
            <SeriationStyles />
            {lanes ? (
                <LaneBoard view={view} drag={drag} calm={calm} wiggle={wiggle} hinted={hinted} disabled={disabled} art={art} onSlot={onSlot} onPiece={onPiece} />
            ) : (
                <CellBoard view={view} drag={drag} calm={calm} wiggle={wiggle} hinted={hinted} disabled={disabled} art={art} onSlot={onSlot} onPiece={onPiece} />
            )}

            {demoPiece && <DragDemo root={root} from={`[data-piece="${demoPiece}"]`} to={`[data-slot="${slotId(view.placed.length)}"]`} calm={calm} />}

            {/* Predmet koji prati prst: iznad celog ekrana igre (z 6000), da ga ništa ne pokrije */}
            {activePiece &&
                typeof document !== "undefined" &&
                createPortal(
                    <div ref={ghostRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[6500] drop-shadow-xl" style={{ width: ghost.w, height: ghost.h }}>
                        <div className={cn("flex h-full w-full items-end", lanes ? "justify-start px-1.5" : "justify-center", wobble && "animate-wiggle")}>
                            {art(activePiece, { className: lanes ? "h-[86%] w-auto max-w-full" : "h-full w-full" })}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

type ArtFn = (piece: SeriationPiece, extra?: { cheer?: boolean; index?: number; silhouette?: boolean; className?: string }) => ReactNode;

interface PartProps {
    view: SeriationView;
    drag: DragSnap;
    calm: boolean;
    wiggle: string | null;
    hinted: { piece: string | null; slot: string | null };
    disabled: boolean;
    art: ArtFn;
    onSlot: (slot: string) => void;
    onPiece: (piece: string) => void;
}

/** Pozadina reda: more sa peskom, nebo sa travom, trava, polica ili sto */
const STAGE_BG: Record<Stage, { back: string; floor: string; ground: string }> = {
    water: { back: "bg-gradient-to-b from-sky-100 via-sky-100 to-cyan-100", floor: "h-2.5 w-full bg-[#f1dfae] border-t-2 border-[#e2c98a]", ground: "bg-[#f1dfae]" },
    sky: { back: "bg-gradient-to-b from-sky-50 to-sky-100", floor: "h-2.5 w-full bg-[#9fd67f] border-t-2 border-[#7cbf5c]", ground: "bg-[#9fd67f]" },
    grass: { back: "bg-gradient-to-b from-lime-50 to-emerald-50", floor: "h-2.5 w-full bg-[#9fd67f] border-t-2 border-[#7cbf5c]", ground: "bg-[#9fd67f]" },
    shelf: { back: "bg-gradient-to-b from-amber-50 to-orange-50", floor: "mx-auto h-3 w-[calc(100%-0.75rem)] rounded-md bg-[#d29a5a] border-b-4 border-[#a8723a]", ground: "" },
    desk: { back: "bg-gradient-to-b from-amber-50 to-orange-50", floor: "mx-auto h-3 w-[calc(100%-0.75rem)] rounded-md bg-[#d29a5a] border-b-4 border-[#a8723a]", ground: "" },
};

/** Ukras pozadine: oblaci, mehurići, sunce — miran, ne mrda */
function StageDecor({ stage }: { stage: Stage }) {
    if (stage === "water")
        return (
            <svg viewBox="0 0 200 60" preserveAspectRatio="xMidYMin slice" className="pointer-events-none absolute inset-x-0 top-0 h-[40%] w-full opacity-70" aria-hidden="true">
                <path d="M0 8 Q12 3 25 8 T50 8 T75 8 T100 8 T125 8 T150 8 T175 8 T200 8" fill="none" stroke="#ffffff" strokeWidth={2.2} opacity={0.8} />
                <circle cx={22} cy={34} r={2.5} fill="#ffffff" opacity={0.7} />
                <circle cx={28} cy={26} r={1.6} fill="#ffffff" opacity={0.7} />
                <circle cx={172} cy={30} r={2.2} fill="#ffffff" opacity={0.7} />
                <path d="M188 60 Q184 44 190 34 Q186 46 194 60Z M10 60 Q6 48 12 40 Q10 50 16 60Z" fill="#6fc28a" opacity={0.6} />
            </svg>
        );
    if (stage === "sky")
        return (
            <svg viewBox="0 0 200 60" preserveAspectRatio="xMidYMin slice" className="pointer-events-none absolute inset-x-0 top-0 h-[45%] w-full opacity-90" aria-hidden="true">
                <g fill="#ffffff">
                    <ellipse cx={30} cy={16} rx={14} ry={6} />
                    <ellipse cx={40} cy={12} rx={9} ry={6} />
                    <ellipse cx={164} cy={22} rx={13} ry={5} />
                    <ellipse cx={172} cy={18} rx={8} ry={5} />
                </g>
            </svg>
        );
    return null;
}

/** Kratak natpis o smeru (na niskom ekranu pitanje se samo čuje) */
function Caption({ view }: { view: SeriationView }) {
    return (
        <p className="pointer-events-none absolute left-2 top-1.5 z-10 hidden rounded-full bg-surface/90 px-2.5 py-0.5 text-xs font-extrabold text-ink shadow-soft ring-1 ring-line [@media(max-height:37.5rem)]:block">
            {seriationCaption(view)}
        </p>
    );
}

// ── Mesta u redu (veličina, visina, količina, brojevi) ────────────────────────

/**
 * Veličina mesta. Mesta u redu i predmeti u korpi su iste veličine (veličina je ono što se
 * poredi). Samo kad se ne poredi veličina (količina, životinje, brojevi), korpa na uspravnom
 * ekranu ide u dva reda sa krupnijim karticama — da se tačkice i brojevi lako vide.
 */
function cellVars(view: SeriationView, aspect: number, measure: string): CSSProperties {
    const count = view.pieces.length;
    const gap = count >= 6 ? 0.25 : count >= 5 ? 0.375 : 0.5;
    // Širina reda: obična mesta, ili kod umetanja predmeti i razmaci između njih
    const units = view.insert ? view.given.length + GAP_SHARE * (view.given.length + 1) : count;
    const gaps = view.insert ? view.given.length * 2 : count - 1;
    const width = `calc((100cqw - ${(gaps * gap + 1).toFixed(3)}rem) / ${units.toFixed(3)})`;
    const height = `calc((100cqh - 5.5rem) / ${(2 * aspect).toFixed(3)})`;
    const big = !view.insert && count >= 5 && measure !== "size" && measure !== "height";
    const cols = big ? Math.ceil(count / 2) : view.insert ? 1 : count;
    const tall = big
        ? `min(calc((100cqw - ${((cols - 1) * gap + 1).toFixed(3)}rem) / ${cols}), calc((100cqh - var(--cell-h) - 6.25rem) / ${(2 * aspect).toFixed(3)}), 7rem)`
        : "var(--cell)";
    return {
        ["--cell" as string]: `min(${width}, ${height}, 11rem)`,
        ["--cell-h" as string]: `calc(var(--cell) * ${aspect})`,
        ["--gap" as string]: `${gap}rem`,
        ["--tcell-p" as string]: tall,
        ["--tcols-p" as string]: cols,
        ["--tcols-l" as string]: view.insert ? 1 : count,
        ["--aspect" as string]: aspect,
    } as CSSProperties;
}

/** Korpa: uspravno možda u dva reda (vidi `cellVars`), položeno uvek u jednom */
const TRAY_SIZE = "[--tcell:var(--cell)] [--tcols:var(--tcols-l)] portrait:[--tcell:var(--tcell-p)] portrait:[--tcols:var(--tcols-p)]";

function CellBoard({ view, drag, calm, wiggle, hinted, disabled, art, onSlot, onPiece }: PartProps) {
    const theme = getTheme(view.theme)!;
    const bg = STAGE_BG[theme.stage];
    const order = rowOrder(view);
    const solved = view.feedback === "correct";
    const cheer = solved && !calm;
    const busy = drag.active !== null || view.selected !== null;

    // Red: obično mesta redom; kod umetanja predmeti iz reda i razmaci između njih
    const row: ReactNode[] = [];
    if (view.insert && !solved) {
        const inRow = order.filter((id) => view.given.includes(id) || view.placed.includes(id));
        inRow.forEach((id, i) => {
            row.push(<GapSlot key={`g${i}`} index={i} view={view} drag={drag} hinted={hinted} busy={busy} disabled={disabled} onSlot={onSlot} />);
            const piece = view.pieces.find((p) => p.id === id)!;
            row.push(
                <div key={id} className="flex shrink-0 items-end justify-center" style={{ width: "var(--cell)", height: "var(--cell-h)" }}>
                    {art(piece, { className: "h-full w-full" })}
                </div>
            );
        });
        row.push(<GapSlot key={`g${inRow.length}`} index={inRow.length} view={view} drag={drag} hinted={hinted} busy={busy} disabled={disabled} onSlot={onSlot} />);
    } else {
        order.forEach((id, i) => {
            const piece = view.pieces.find((p) => p.id === id)!;
            const filled = view.insert ? true : i < view.placed.length;
            const open = !view.insert && i === view.placed.length && !solved;
            const slot = slotId(i);
            const glow = open && (drag.over === slot || hinted.slot === slot);
            const guide = !filled && (view.guide === "all" || (view.guide === "first" && i === 0));
            const fresh = view.last === id && !calm;
            row.push(
                <button
                    key={slot}
                    type="button"
                    data-slot={view.insert ? undefined : slot}
                    data-open={open ? "" : undefined}
                    disabled={disabled || !open}
                    onClick={() => onSlot(slot)}
                    aria-label={filled ? `Mesto ${i + 1}: ${pieceLabel(theme.id, piece, view.pieces)}, tačno` : `Mesto ${i + 1}, prazno`}
                    className={cn(
                        "relative flex shrink-0 items-end justify-center rounded-xl outline-none transition-[background-color,box-shadow,border-color] duration-200 focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default",
                        filled ? "border-2 border-transparent" : open ? "border-2 border-dashed border-sprout-500 bg-white/55" : "border-2 border-dashed border-sprout-300/70 bg-white/25",
                        glow && "border-solid bg-sprout-50 ring-4 ring-sprout-300",
                        open && hinted.slot === slot && !calm && "animate-soft-pulse"
                    )}
                    style={{ width: "var(--cell)", height: "var(--cell-h)" }}
                >
                    {filled ? (
                        <span className={cn("pointer-events-none flex h-full w-full items-end", fresh && "sr-pop")}>{art(piece, { cheer, index: i, className: "h-full w-full" })}</span>
                    ) : guide ? (
                        art(piece, { silhouette: true, className: "pointer-events-none h-full w-full" })
                    ) : null}
                </button>
            );
        });
    }

    return (
        <div className={cn("flex h-full w-full flex-col items-center justify-center gap-2", TRAY_SIZE)} style={cellVars(view, theme.aspect, theme.measure)}>
            <div className={cn("relative flex min-h-0 w-full flex-1 flex-col justify-end overflow-hidden rounded-2xl ring-1 ring-black/5", bg.back)} style={{ maxHeight: "calc(var(--cell-h) * 2.1 + 4rem)" }}>
                <StageDecor stage={theme.stage} />
                <Caption view={view} />
                <div role="group" aria-label="Red" className="relative z-[1] flex items-end justify-center px-1.5 pt-2" style={{ gap: "var(--gap)" }}>
                    {row}
                </div>
                <div className={cn("relative shrink-0", bg.floor)} />
                <div className={cn("flex w-full shrink-0 justify-center px-3 py-1", bg.ground)}>
                    <DirectionWedge dir={view.dir} light={theme.stage === "sky" || theme.stage === "grass"} className="h-3 w-[min(70%,22rem)]" />
                </div>
            </div>
            <CellTray view={view} drag={drag} calm={calm} wiggle={wiggle} hinted={hinted} disabled={disabled} art={art} onSlot={onSlot} onPiece={onPiece} />
        </div>
    );
}

function GapSlot({ index, view, drag, hinted, busy, disabled, onSlot }: { index: number; view: SeriationView; drag: DragSnap; hinted: { slot: string | null }; busy: boolean; disabled: boolean; onSlot: (slot: string) => void }) {
    const slot = gapId(index);
    const glow = drag.over === slot || hinted.slot === slot;
    return (
        // Dugme je široko kao mesto i po pola susednih predmeta (veća meta, i za gosta na drugom
        // uređaju koji pogađa po pravougaoniku), a vidi se samo uska traka u sredini
        <button
            type="button"
            data-slot={slot}
            data-open=""
            disabled={disabled}
            onClick={() => onSlot(slot)}
            aria-label={`Razmak ${index + 1}${view.selected ? ", za izabrani predmet" : ""}`}
            className="group relative z-10 flex shrink-0 items-stretch justify-center rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
            style={{ width: `calc(var(--cell) * ${GAP_SHARE + 1})`, height: "var(--cell-h)", marginInline: "calc(var(--cell) * -0.5)" }}
        >
            <span
                aria-hidden="true"
                className={cn(
                    "flex items-center justify-center rounded-xl border-2 border-dashed transition-[background-color,box-shadow,border-color] duration-200",
                    glow ? "border-solid border-sprout-500 bg-sprout-50 ring-4 ring-sprout-300" : busy ? "border-sprout-500 bg-white/70" : "border-sprout-300 bg-white/35",
                    hinted.slot === slot && "animate-soft-pulse"
                )}
                style={{ width: `calc(var(--cell) * ${GAP_SHARE})` }}
            >
                <span className={cn("h-[46%] w-1.5 rounded-full", glow || busy ? "bg-sprout-500" : "bg-sprout-300")} />
            </span>
        </button>
    );
}

function pieceState(view: SeriationView, id: string): string {
    if (view.feedback === "wrong" && view.mistake?.piece === id) return ", netačno";
    if (view.selected === id) return ", izabrano";
    return "";
}

const TRAY_CELL: CSSProperties = { width: "var(--tcell)", height: "calc(var(--tcell) * var(--aspect))" };

function CellTray({ view, drag, calm, wiggle, hinted, disabled, art, onPiece }: PartProps) {
    const { active, pieceProps } = drag;
    const theme = getTheme(view.theme)!;
    const tray = view.pieces.filter((piece) => !view.given.includes(piece.id));
    return (
        <div
            role="group"
            aria-label="Korpa"
            className="box-content flex shrink-0 flex-wrap items-end justify-center rounded-2xl border-2 border-dashed border-line bg-surface/70 p-1.5"
            style={{ gap: "var(--gap)", width: "calc(var(--tcols) * var(--tcell) + (var(--tcols) - 1) * var(--gap))" }}
        >
            {tray.map((piece) => {
                if (view.placed.includes(piece.id)) return <span key={piece.id} aria-hidden="true" className="shrink-0 rounded-xl border-2 border-dashed border-line/60" style={TRAY_CELL} />;
                const selected = view.selected === piece.id;
                const glow = hinted.piece === piece.id;
                return (
                    <button
                        key={piece.id}
                        type="button"
                        data-piece={piece.id}
                        disabled={disabled}
                        aria-pressed={view.insert ? selected : undefined}
                        aria-label={`${pieceLabel(theme.id, piece, view.pieces)}${pieceState(view, piece.id)}`}
                        {...pieceProps(piece.id)}
                        onClick={() => onPiece(piece.id)}
                        className={cn(
                            "relative flex shrink-0 touch-none select-none items-end justify-center rounded-xl border-2 bg-surface transition-[transform,border-color,opacity,background-color] duration-150 disabled:cursor-default",
                            selected ? "-translate-y-1 border-sprout-500 bg-sprout-50" : glow ? "border-sprout-400 bg-sprout-50" : "border-transparent hover:border-sprout-300",
                            glow && !calm && "animate-soft-pulse",
                            active === piece.id && "opacity-30",
                            wiggle === piece.id && "animate-wiggle"
                        )}
                        style={TRAY_CELL}
                    >
                        {art(piece, { className: "pointer-events-none h-full w-full" })}
                    </button>
                );
            })}
        </div>
    );
}

// ── Trake (dužina: zmije i olovke) ────────────────────────────────────────────

function laneVars(count: number): CSSProperties {
    // Uspravno: red gore, korpa dole (2 × count traka); položeno: red levo, korpa desno
    const tall = `min(calc((100cqh - ${(2 * count) * 0.375 + 3.5}rem) / ${2 * count}), calc((100cqw - 3rem) / ${LANE_RATIO * 0.86 + 0.6}), 4.5rem)`;
    const wide = `min(calc((100cqh - ${count * 0.375 + 2.5}rem) / ${count}), calc((50cqw - 3rem) / ${LANE_RATIO * 0.86 + 0.6}), 4.5rem)`;
    return { ["--lane-p" as string]: tall, ["--lane-l" as string]: wide } as CSSProperties;
}

const LANE_SIZE = "[--lane:var(--lane-p)] landscape:[--lane:var(--lane-l)]";

function LaneBoard({ view, drag, calm, wiggle, hinted, disabled, art, onSlot, onPiece }: PartProps) {
    const theme = getTheme(view.theme)!;
    const bg = STAGE_BG[theme.stage];
    const order = rowOrder(view);
    const solved = view.feedback === "correct";
    const cheer = solved && !calm;
    const { active, pieceProps } = drag;

    return (
        <div className={cn("flex h-full w-full flex-col items-stretch gap-2 landscape:flex-row", LANE_SIZE)} style={laneVars(view.pieces.length)}>
            <div className={cn("relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-black/5", bg.back)}>
                <Caption view={view} />
                <div className="flex items-stretch gap-2 py-2 pl-1 pr-2">
                    <DirectionWedge dir={view.dir} vertical className="w-3 shrink-0" />
                    {/* Sve trake počinju od iste linije (kao kad se meri) */}
                    <div role="group" aria-label="Red" className="flex flex-col border-l-4 border-sprout-500/70 pl-1" style={{ gap: "0.375rem" }}>
                        {order.map((id, i) => {
                            const piece = view.pieces.find((p) => p.id === id)!;
                            const filled = i < view.placed.length;
                            const open = i === view.placed.length && !solved;
                            const slot = slotId(i);
                            const glow = open && (drag.over === slot || hinted.slot === slot);
                            const guide = !filled && (view.guide === "all" || (view.guide === "first" && i === 0));
                            return (
                                <button
                                    key={slot}
                                    type="button"
                                    data-slot={slot}
                                    data-open={open ? "" : undefined}
                                    disabled={disabled || !open}
                                    onClick={() => onSlot(slot)}
                                    aria-label={filled ? `Mesto ${i + 1}: ${pieceLabel(theme.id, piece, view.pieces)}, tačno` : `Mesto ${i + 1}, prazno`}
                                    className={cn(
                                        "relative flex items-center justify-start rounded-xl px-1 outline-none transition-[background-color,box-shadow,border-color] duration-200 focus-visible:ring-4 focus-visible:ring-brand-400 disabled:cursor-default",
                                        filled ? "border-2 border-transparent" : open ? "border-2 border-dashed border-sprout-500 bg-white/60" : "border-2 border-dashed border-sprout-300/70 bg-white/25",
                                        glow && "border-solid bg-sprout-50 ring-4 ring-sprout-300",
                                        open && hinted.slot === slot && !calm && "animate-soft-pulse"
                                    )}
                                    style={{ height: "var(--lane)", width: `calc(var(--lane) * ${LANE_RATIO * 0.86 + 0.45})` }}
                                >
                                    {filled ? (
                                        <span className={cn("pointer-events-none flex h-full items-center", view.last === id && !calm && "sr-pop")}>{art(piece, { cheer, index: i, className: "h-[86%] w-auto" })}</span>
                                    ) : guide ? (
                                        art(piece, { silhouette: true, className: "pointer-events-none h-[86%] w-auto" })
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div role="group" aria-label="Korpa" className="flex shrink-0 flex-col items-center justify-center self-center rounded-2xl border-2 border-dashed border-line bg-surface/70 p-1.5" style={{ gap: "0.375rem" }}>
                {view.pieces.map((piece) => {
                    const size = { height: "var(--lane)", width: `calc(var(--lane) * ${LANE_RATIO * 0.86 + 0.45})` };
                    if (view.placed.includes(piece.id)) return <span key={piece.id} aria-hidden="true" className="rounded-xl border-2 border-dashed border-line/60" style={size} />;
                    const glow = hinted.piece === piece.id;
                    return (
                        <button
                            key={piece.id}
                            type="button"
                            data-piece={piece.id}
                            disabled={disabled}
                            aria-label={`${pieceLabel(theme.id, piece, view.pieces)}${pieceState(view, piece.id)}`}
                            {...pieceProps(piece.id)}
                        onClick={() => onPiece(piece.id)}
                            className={cn(
                                "relative flex touch-none select-none items-center justify-start rounded-xl border-2 bg-surface px-1 transition-[transform,border-color,opacity,background-color] duration-150 disabled:cursor-default",
                                glow ? "border-sprout-400 bg-sprout-50" : "border-transparent hover:border-sprout-300",
                                glow && !calm && "animate-soft-pulse",
                                active === piece.id && "opacity-30",
                                wiggle === piece.id && "animate-wiggle"
                            )}
                            style={size}
                        >
                            {art(piece, { className: "pointer-events-none h-[86%] w-auto" })}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
