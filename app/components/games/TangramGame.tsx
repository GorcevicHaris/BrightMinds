"use client";

// Igra „Tangram”: pored senke oblika (kućica, riba, raketa, mačka, zeka…) stoje geometrijski
// delovi. Dete prevlači deo na njegovo mesto u obliku (ili ga dodirne, pa dodirne mesto); deo
// pušten blizu mesta u koje ulazi sam legne. Na srednjim i težim nivoima neki delovi stižu
// okrenuti: dugme „Okreni” okreće izabrani deo za 45°. Deo istog oblika, a okrenut drugačije,
// zaljulja se i vrati („Skoro! Okreni ga.”). Kad je oblik složen, oživi (riba zapliva, raketa
// poleti, mačka trepne). Nema žurbe ni tajmera. Nivoi i geometrija: data/tangramLevels.ts,
// crteži: tangram/.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { RotateCw } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    DemoHand,
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
    boxOf,
    buildTangramLevel,
    doneSentence,
    emptyTangramView,
    figureIntro,
    figureTitle,
    fittingTargets,
    getFigure,
    hintFor,
    isPieceId,
    mergeTangramMonitor,
    OTHER_SHAPE,
    OTHER_WAY,
    partSentence,
    PIECE_LABEL,
    solveTangramView,
    tangramResult,
    tangramRoundView,
    tryPlace,
    TURN_IT,
    type Figure,
    type MistakeReason,
    type PieceId,
    type TangramPlan,
    type TangramView,
} from "@/app/components/games/data/tangramLevels";
import { FigureArt, pieceBox, PieceSvg } from "@/app/components/games/tangram/TangramArt";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("tangram");
const WRONG_FEEDBACK_MS = 1600;
const RETRY = "Probaj ponovo.";
const RETRY_SLOW = "Probaj još jednom, polako.";
/** Koliko traje „oživljavanje” složenog oblika (pre sledećeg oblika) */
const ALIVE_MS = 2700;
const WIGGLE_MS = 520;
/** Pomoć posle promašaja ne zavisi od broja ponuđenih mesta (promašaja može biti koliko god) */
const ANY_MISSES = Number.MAX_SAFE_INTEGER;
/** Nizak ekran: poruka lebdi preko donje ivice polja za igru umesto da zauzima svoj red */
const FEEDBACK_CLASS =
    "-mt-1 min-h-11 sm:mt-0 [@media(max-height:37.5rem)]:absolute [@media(max-height:37.5rem)]:inset-x-0 [@media(max-height:37.5rem)]:bottom-1 [@media(max-height:37.5rem)]:z-30 [@media(max-height:37.5rem)]:mt-0";

function initialView(plan: TangramPlan | null): TangramView {
    if (!plan || plan.rounds.length === 0) return emptyTangramView(1);
    return { ...emptyTangramView(plan.rounds.length), ...tangramRoundView(plan.rounds[0]) };
}

function mistakeText(reason: MistakeReason | undefined): string {
    if (reason === "turn") return TURN_IT;
    if (reason === "way") return OTHER_WAY;
    return OTHER_SHAPE;
}

/** Sredina mesta i njegova veća stranica na ekranu (px), iz okvira crteža table */
function targetOnScreen(board: DOMRect, figure: Figure, index: number) {
    const target = figure.targets[index];
    const k = board.width / figure.view.w;
    const box = boxOf(target.pts);
    return { x: board.left + (target.cx - figure.view.x) * k, y: board.top + (target.cy - figure.view.y) * k, span: Math.max(box.w, box.h) * k };
}

export default function TangramGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<TangramView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<TangramView>({ childId, gameId: "tangram", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se plan pravi samo jednom, ovde
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<TangramPlan | null>(() =>
        isMonitor ? null : buildTangramLevel(level, { maxRounds: settings.preset.maxRounds, maxChoices: settings.choiceLimit, random })
    );
    // Na lakim nivoima pomoć stiže već posle prve greške i posle čekanja (osim kad je isključena)
    const early = (plan?.earlyHint ?? false) && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    const [view, setView] = useState<TangramView>(() => initialView(plan));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);
    // Deo koji je dodirom spušten na mesto u koje ne ulazi kratko se zaljulja u korpi
    const [wiggle, setWiggle] = useState<string | null>(null);
    // Tabla (SVG) i deo koji prati prst: iz njih se računa mesto u koje bi deo legao
    const boardRef = useRef<SVGSVGElement | null>(null);
    const ghostEl = useRef<HTMLElement | null>(null);
    const [over, setOver] = useState<number | null>(null);

    const commit = useCallback(
        (next: TangramView, log?: string) => {
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
        const intro = figureIntro(viewRef.current);
        if (intro) say(intro);
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: TangramView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(tangramResult(final, level, sync.elapsedSec()));
    };

    const startRound = (index: number) => {
        const round = plan?.rounds[index];
        if (!round) return;
        guard.hold();
        setOver(null);
        const next: TangramView = { ...viewRef.current, ...tangramRoundView(round), round: index + 1 };
        const intro = figureIntro(next);
        commit(next, `Oblik ${index + 1}: ${getFigure(round.figure)?.name ?? round.figure}`);
        say(intro);
    };

    const settleAfterWrong = () => {
        guard.hold();
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            commit({ ...viewRef.current, feedback: null, mistake: null });
        });
    };

    /** Deo legne na mesto `index` (već je provereno da ulazi) */
    const place = (piece: string, index: number) => {
        const current = viewRef.current;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const placed = [...current.placed, piece];
        const at = { ...current.at, [piece]: index };
        const label = PIECE_LABEL[piece as PieceId].toLowerCase();
        if (placed.length < current.tray.length) {
            commit(
                { ...current, placed, at, last: piece, selected: null, hint: false, introPiece: current.introPiece === piece ? null : current.introPiece, mistake: null, feedback: null },
                `Postavljen: ${label}`
            );
            playSfx("flip");
            const part = current.parts ? partSentence(current.figure, index) : "";
            if (part) say(part, undefined, "happy");
            return;
        }
        // Poslednji deo: oblik je složen i oživi
        const { next, firstTry, modeled } = solveTangramView(current, level, { placed, at, last: piece, selected: null, introPiece: null, mistake: null, feedback: "correct" });
        const how = modeled ? "(pokazni zadatak)" : firstTry ? "iz prvog pokušaja" : current.helped || current.hint ? "uz pomoć" : "posle više pokušaja";
        commit(next, `Složeno ${how}: ${getFigure(current.figure)?.name ?? current.figure}`);
        playSfx("correct");
        const isLast = current.round >= current.totalRounds;
        sayThen(praise(doneSentence(current.figure), firstTry), isLast ? finish : () => startRound(current.round), {
            min: calm ? FEEDBACK_MIN_MS + 600 : ALIVE_MS,
            max: calm ? undefined : ALIVE_MS + 1500,
            emotion: "happy",
        });
    };

    /** Deo je spušten na mesto. Vraća true kad je legao (inače se vraća u korpu). */
    const attempt = (piece: string, index: number): boolean => {
        if (isMonitor || finishedRef.current || guard.blocked()) return false;
        const current = viewRef.current;
        if (current.feedback === "correct" || !current.tray.includes(piece) || current.placed.includes(piece)) return false;
        const result = tryPlace(current, piece, index);
        if (result === "taken") return false;
        if (result === "ok") {
            place(piece, index);
            return true;
        }
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        // Isti oblik, a okrenut drugačije: „Okreni ga.” (deo ostaje izabran, da dugme odmah deluje)
        const reason: MistakeReason = result === "turn" ? (current.rotate ? "turn" : "way") : "shape";
        const wrong = [...current.wrong, `${piece}>${index}`];
        const hint = current.hint || hintDue(hintAfter, wrong.length, ANY_MISSES);
        commit(
            {
                ...current,
                wrong,
                hint,
                helped: current.helped || hint,
                selected: reason === "shape" ? current.selected : piece,
                mistake: { piece, reason },
                feedback: "wrong",
                incorrectCount: current.incorrectCount + 1,
            },
            reason === "turn" ? `Pravo mesto, deo nije okrenut: ${PIECE_LABEL[piece as PieceId].toLowerCase()}` : `Ne uklapa se: ${PIECE_LABEL[piece as PieceId].toLowerCase()}`
        );
        playSfx("wrong");
        say(reason === "turn" ? TURN_IT : `${mistakeText(reason)} ${hint ? RETRY_SLOW : RETRY}`, undefined, "gentle");
        settleAfterWrong();
        return false;
    };

    const rotateSelected = () => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        const id = current.selected;
        if (!id || !current.rotate || current.feedback === "correct" || current.placed.includes(id)) return;
        playSfx("tap");
        commit({ ...current, rot: { ...current.rot, [id]: ((current.rot[id] ?? 0) + 1) % 8 } }, `Okrenut deo: ${PIECE_LABEL[id as PieceId].toLowerCase()}`);
    };

    /** Dodir dela: izbor (dugme „Okreni” deluje na izabrani deo) */
    const tapPiece = (id: string) => {
        if (isMonitor || finishedRef.current) return;
        const current = viewRef.current;
        if (current.feedback === "correct" || current.placed.includes(id) || current.selected === id) return;
        playSfx("tap");
        commit({ ...current, selected: id });
    };

    const tapTarget = (index: number) => {
        const selected = viewRef.current.selected;
        if (selected === null) return;
        const result = tryPlace(viewRef.current, selected, index);
        if (!attempt(selected, index) && result !== "taken" && !calm) {
            setWiggle(selected);
            after(WIGGLE_MS, () => setWiggle(null));
        }
    };

    /** Otvoreno mesto u koje deo ulazi, u dometu dela koji prati prst (najbliže), ili null */
    const nearestFit = (piece: string): number | null => {
        const board = boardRef.current?.getBoundingClientRect();
        const ghost = ghostEl.current?.getBoundingClientRect();
        const figure = getFigure(viewRef.current.figure);
        if (!board || !ghost || !figure || board.width === 0) return null;
        const gx = ghost.left + ghost.width / 2;
        const gy = ghost.top + ghost.height / 2;
        let best: { index: number; dist: number } | null = null;
        for (const target of fittingTargets(viewRef.current, piece)) {
            const spot = targetOnScreen(board, figure, target.index);
            const dist = Math.hypot(gx - spot.x, gy - spot.y);
            // Velikodušan domet: deo pušten otprilike iznad svog mesta legne
            if (dist <= Math.max(spot.span * 0.8, 44) && (!best || dist < best.dist)) best = { index: target.index, dist };
        }
        return best?.index ?? null;
    };

    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.round}:${view.placed.length}`, () => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback || current.hint) return;
        if (modeledRound(current) && current.wrong.length === 0) return; // tu pokazuje ruka
        commit({ ...current, hint: true, helped: true }, "Pomoć posle čekanja");
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct") return;
        const intro = figureIntro(current);
        if (intro) say(intro);
    };

    const drag = useDragSnap({
        enabled: !isMonitor && view.feedback !== "correct",
        calm,
        onDrop: (piece, slot) => {
            const fit = nearestFit(piece);
            if (fit !== null) return attempt(piece, fit);
            if (slot === null) return false;
            const index = Number(slot.slice(1));
            return Number.isInteger(index) ? attempt(piece, index) : false;
        },
        onTap: tapPiece,
        // Uhvaćen deo postaje izabran: dugme „Okreni” deluje na njega
        onGrab: (piece) => {
            const current = viewRef.current;
            if (current.selected !== piece) commit({ ...current, selected: piece });
        },
    });

    // Dok se deo prevlači: mesto u koje bi legao blago zasvetli
    const dragging = drag.dragging;
    const active = drag.active;
    useEffect(() => {
        if (!dragging || active === null) return;
        const onMove = () => setOver(nearestFit(active));
        window.addEventListener("pointermove", onMove);
        return () => {
            window.removeEventListener("pointermove", onMove);
            setOver(null);
        };
        // nearestFit čita samo ref-ove i trenutno stanje
    }, [dragging, active]);

    const shown = isMonitor ? mergeTangramMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const figure = getFigure(shown.figure);

    if (!figure) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Oblik" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prvi oblik" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const message = solved ? doneSentence(shown.figure) : mistakeText(shown.mistake?.reason);

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Oblik" score={score} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: uputstvo samo glasom (dugme „Ponovi”), da oblik i delovi budu krupni */}
            <GamePrompt key={`prompt-${shown.round}`} className="animate-fade-up [@media(max-height:37.5rem)]:hidden" compact title={figureTitle(shown.figure)} />
            <PlayArea accent={GAME.accent} className="relative p-2 sm:p-3">
                <TangramPlay
                    view={shown}
                    figure={figure}
                    drag={drag}
                    over={over}
                    calm={calm}
                    wiggle={wiggle}
                    disabled={isMonitor || solved}
                    demo={!isMonitor && modeledRound(shown) && shown.wrong.length === 0 && !solved}
                    boardRef={boardRef}
                    ghostElRef={ghostEl}
                    onTarget={tapTarget}
                    onRotate={rotateSelected}
                />
            </PlayArea>
            <Feedback kind={shown.feedback} correctText={message} wrongText={message} className={FEEDBACK_CLASS} />
        </GameStage>
    );
}

// ── Raspored: oblik i korpa ───────────────────────────────────────────────────

/** Mesto za dugme „Okreni” (px) */
const BUTTON_SIDE_H = 56;
const BUTTON_STACK_W = 84;
/** Deo u korpi je bar ovoliki deo dela na tabli (dete ih prepoznaje kao iste), a tabla je što veća */
const TRAY_RATIO = 0.45;
/** Najmanja dugmad delova (px), da ih mali prst lako pogodi */
const MIN_PIECE_PX = 46;

interface Spot {
    x: number;
    y: number;
    size: number;
}

interface Layout {
    side: boolean;
    /** px po jedinici na tabli i u korpi */
    s: number;
    t: number;
    board: { x: number; y: number; w: number; h: number };
    tray: { x: number; y: number; w: number; h: number };
    spots: Spot[];
    button: { x: number; y: number; w: number; h: number } | null;
}

/** Delovi u redovima (redom iz korpe); vraća mesta ili null kad ne staju */
function packTray(spans: readonly number[], t: number, width: number, height: number, gap: number): Spot[] | null {
    const rows: { items: number[]; w: number; h: number }[] = [];
    let row = { items: [] as number[], w: 0, h: 0 };
    spans.forEach((span, index) => {
        const size = Math.max(span * t, MIN_PIECE_PX);
        if (size > width) return;
        if (row.items.length > 0 && row.w + gap + size > width) {
            rows.push(row);
            row = { items: [], w: 0, h: 0 };
        }
        row.w += (row.items.length > 0 ? gap : 0) + size;
        row.h = Math.max(row.h, size);
        row.items.push(index);
    });
    if (row.items.length > 0) rows.push(row);
    const placedCount = rows.reduce((sum, r) => sum + r.items.length, 0);
    const total = rows.reduce((sum, r) => sum + r.h, 0) + gap * Math.max(0, rows.length - 1);
    if (placedCount !== spans.length || total > height) return null;
    const spots: Spot[] = [];
    let y = (height - total) / 2;
    for (const r of rows) {
        let x = (width - r.w) / 2;
        for (const index of r.items) {
            const size = Math.max(spans[index] * t, MIN_PIECE_PX);
            spots[index] = { x, y: y + (r.h - size) / 2, size };
            x += size + gap;
        }
        y += r.h + gap;
    }
    return spots;
}

/** Najveća razmera korpe (px po jedinici) pri kojoj svi delovi staju */
function trayScale(spans: readonly number[], width: number, height: number, gap: number): number {
    if (width <= 0 || height <= 0) return 0;
    let lo = 1;
    let hi = 400;
    if (!packTray(spans, lo, width, height, gap)) return 0;
    for (let i = 0; i < 22; i += 1) {
        const mid = (lo + hi) / 2;
        if (packTray(spans, mid, width, height, gap)) lo = mid;
        else hi = mid;
    }
    return lo;
}

/**
 * Raspored za dati prostor: oblik levo i korpa desno (položen ekran) ili oblik gore i korpa
 * dole. Deo oblika i korpe se bira tako da oblik bude što veći, a delovi u korpi ne sitniji od
 * oko polovine dela na tabli (`TRAY_RATIO`); deo koji se uzme naraste do veličine na tabli.
 */
function layoutFor(width: number, height: number, figure: Figure, spans: readonly number[], rotate: boolean): Layout | null {
    if (width < 40 || height < 40) return null;
    const side = width > height * 1.12;
    const gap = width < 500 ? 8 : 12;
    let best: (Layout & { score: number }) | null = null;
    for (let f = 0.34; f <= 0.8; f += 0.02) {
        let board: Layout["board"];
        let tray: Layout["tray"];
        let button: Layout["button"] = null;
        if (side) {
            const bw = (width - gap) * f;
            board = { x: 0, y: 0, w: bw, h: height };
            const tx = bw + gap;
            const tw = width - tx;
            const bh = rotate ? BUTTON_SIDE_H : 0;
            tray = { x: tx, y: 0, w: tw, h: height - (rotate ? bh + gap : 0) };
            if (rotate) button = { x: tx, y: height - bh, w: tw, h: bh };
        } else {
            const bh = (height - gap) * f;
            board = { x: 0, y: 0, w: width, h: bh };
            const ty = bh + gap;
            const tw = width - (rotate ? BUTTON_STACK_W + gap : 0);
            tray = { x: 0, y: ty, w: tw, h: height - ty };
            if (rotate) button = { x: width - BUTTON_STACK_W, y: ty, w: BUTTON_STACK_W, h: height - ty };
        }
        const s = Math.min(board.w / figure.view.w, board.h / figure.view.h);
        const t = trayScale(spans, tray.w, tray.h, gap);
        const score = Math.min(s, t / TRAY_RATIO);
        if (!best || score > best.score) best = { side, s, t, board, tray, button, spots: [], score };
    }
    if (!best) return null;
    const t = Math.min(best.t, best.s);
    const spots = packTray(spans, t, best.tray.w, best.tray.h, gap) ?? [];
    return { ...best, t, spots };
}

function useSize(el: HTMLElement | null): { w: number; h: number } {
    const [size, setSize] = useState({ w: 0, h: 0 });
    useEffect(() => {
        if (!el) return;
        const measure = () => {
            const rect = el.getBoundingClientRect();
            setSize((prev) => (Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5 ? prev : { w: rect.width, h: rect.height }));
        };
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [el]);
    return size;
}

// ── Tabla i korpa ─────────────────────────────────────────────────────────────

interface PlayProps {
    view: TangramView;
    figure: Figure;
    drag: DragSnap;
    over: number | null;
    calm: boolean;
    wiggle: string | null;
    disabled: boolean;
    demo: boolean;
    boardRef: RefObject<SVGSVGElement | null>;
    ghostElRef: RefObject<HTMLElement | null>;
    onTarget: (index: number) => void;
    onRotate: () => void;
}

function TangramPlay({ view, figure, drag, over, calm, wiggle, disabled, demo, boardRef, ghostElRef, onTarget, onRotate }: PlayProps) {
    // Odvojene vrednosti: samo `ghostRef` i `rootRef` su ref-ovi, ostalo je obično stanje prevlačenja
    const { rootRef, ghostRef, active, wobble, pieceProps } = drag;
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const size = useSize(root);
    const tray = view.tray.filter(isPieceId);
    const spans = tray.map(pieceBox);
    const layout = layoutFor(size.w, size.h, figure, spans, view.rotate);
    const solved = view.feedback === "correct";

    const setRootRef = (el: HTMLDivElement | null) => {
        rootRef(el);
        setRoot((previous) => (previous === el ? previous : el));
    };
    const setGhost = (el: HTMLElement | null) => {
        ghostRef(el);
        ghostElRef.current = el;
    };

    // Pomoć: mesto (i deo) svetli; kad deo treba okrenuti, svetli i dugme „Okreni”
    const hint = view.hint && !solved ? hintFor(view) : null;
    // Pokazni oblik: ruka prevlači sledeći deo, a njegovo mesto svetli
    const demoPiece = demo ? (tray.find((id) => !view.placed.includes(id)) ?? null) : null;
    const demoTarget = demoPiece ? (fittingTargets(view, demoPiece)[0]?.index ?? null) : null;
    // Uvod u okretanje: dok deo ne stoji kako treba, ruka pokazuje dugme; posle svetli njegovo mesto
    const introPiece = !disabled && view.introPiece && view.tray.includes(view.introPiece) && !view.placed.includes(view.introPiece) ? view.introPiece : null;
    const introFit = introPiece ? (fittingTargets(view, introPiece)[0]?.index ?? null) : null;
    const introTurn = introPiece !== null && introFit === null && view.selected === introPiece;
    const glow = hint?.target ?? demoTarget ?? introFit;
    const rotateGlow = Boolean(hint?.turn) || introTurn;
    const glowPiece = hint && hint.piece !== view.selected ? hint.piece : null;
    const open = new Set(figure.targets.map((target) => target.index).filter((index) => !Object.values(view.at).includes(index)));
    const k = layout ? layout.s : 0;

    return (
        <div ref={setRootRef} className={cn("relative min-h-0 w-full flex-1 self-stretch", disabled && "pointer-events-none")}>
            {layout && (
                <>
                    {/* Oblik: senka sa mestima za delove */}
                    <div
                        className="absolute grid place-items-center"
                        style={{ left: layout.board.x, top: layout.board.y, width: layout.board.w, height: layout.board.h }}
                    >
                        <div className="rounded-card bg-surface/85 shadow-soft ring-1 ring-line" style={{ width: figure.view.w * k, height: figure.view.h * k }}>
                            <svg ref={boardRef} viewBox={`${figure.view.x} ${figure.view.y} ${figure.view.w} ${figure.view.h}`} className="block h-full w-full overflow-visible" role="group" aria-label={`Oblik: ${figure.name}`}>
                                <FigureArt figure={figure} support={view.support} at={view.at} last={view.last} glow={glow} over={over} done={solved} calm={calm}>
                                    {figure.targets.map((target) =>
                                        open.has(target.index) ? (
                                            <polygon
                                                key={target.index}
                                                data-slot={`t${target.index}`}
                                                data-open=""
                                                points={target.pts.map(([x, y]) => `${x},${y}`).join(" ")}
                                                fill="transparent"
                                                role="button"
                                                tabIndex={disabled ? -1 : 0}
                                                aria-label={`Mesto za deo: ${target.kind === "sq" ? "kvadrat" : target.kind === "pa" ? "paralelogram" : "trougao"}`}
                                                aria-disabled={disabled || view.selected === null}
                                                className="cursor-pointer outline-none focus-visible:stroke-brand-500"
                                                strokeWidth={3}
                                                vectorEffect="non-scaling-stroke"
                                                onClick={disabled ? undefined : () => onTarget(target.index)}
                                                onKeyDown={(event) => {
                                                    if (disabled || (event.key !== "Enter" && event.key !== " ")) return;
                                                    event.preventDefault();
                                                    onTarget(target.index);
                                                }}
                                            />
                                        ) : null
                                    )}
                                </FigureArt>
                            </svg>
                        </div>
                    </div>

                    {/* Korpa sa delovima */}
                    <div
                        role="group"
                        aria-label="Delovi"
                        className="absolute rounded-card border-2 border-dashed border-line bg-surface/60"
                        style={{ left: layout.tray.x, top: layout.tray.y, width: layout.tray.w, height: layout.tray.h }}
                    >
                        {tray.map((id, index) => {
                            const spot = layout.spots[index];
                            if (!spot || view.placed.includes(id)) return null;
                            const selected = view.selected === id;
                            const glowing = glowPiece === id || (demoPiece === id && !calm);
                            const turned = view.rotate && fittingTargets(view, id).length === 0;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    data-piece={id}
                                    disabled={disabled}
                                    aria-pressed={selected}
                                    aria-label={`${PIECE_LABEL[id]}${turned ? ", okrenut drugačije" : ""}`}
                                    {...pieceProps(id)}
                                    className={cn(
                                        "absolute grid touch-none select-none place-items-center rounded-2xl transition-[transform,background-color,box-shadow,opacity] duration-150",
                                        selected ? "-translate-y-1 bg-brand-50 shadow-soft ring-4 ring-brand-400" : glowing ? "bg-brand-50 ring-4 ring-brand-300" : "hover:bg-surface",
                                        glowing && !calm && "animate-soft-pulse",
                                        active === id && "opacity-30",
                                        wiggle === id && "animate-wiggle"
                                    )}
                                    style={{ left: spot.x, top: spot.y, width: spot.size, height: spot.size }}
                                >
                                    <span className={cn("pointer-events-none block", !calm && "transition-transform duration-200")} style={{ width: pieceBox(id) * layout.t, height: pieceBox(id) * layout.t }}>
                                        <PieceSvg piece={id} rot={view.rot[id] ?? 0} className="h-full w-full" />
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Okreni izabrani deo */}
                    {layout.button && (
                        <button
                            type="button"
                            data-action="rotate"
                            onClick={onRotate}
                            disabled={disabled || view.selected === null}
                            aria-label="Okreni izabrani deo"
                            className={cn(
                                "absolute inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] border-lagoon-700 bg-lagoon-500 font-display text-lg font-extrabold text-white transition-[transform,border-width,opacity,box-shadow] active:translate-y-[3px] active:border-b-2 disabled:opacity-40",
                                layout.side ? "flex-row" : "flex-col gap-0.5 text-base",
                                rotateGlow && "ring-4 ring-brand-300",
                                rotateGlow && !calm && "animate-soft-pulse"
                            )}
                            style={{ left: layout.button.x, top: layout.button.y, width: layout.button.w, height: Math.min(layout.button.h, layout.side ? BUTTON_SIDE_H : 112) }}
                        >
                            <RotateCw className="h-7 w-7 shrink-0" aria-hidden="true" strokeWidth={3} />
                            <span>Okreni</span>
                            {introTurn && <DemoHand />}
                        </button>
                    )}
                </>
            )}

            {demoPiece && demoTarget !== null && <DragDemo root={root} from={`[data-piece="${demoPiece}"]`} to={`[data-slot="t${demoTarget}"]`} calm={calm} />}

            {/* Deo koji prati prst: veličine kao na tabli, iznad celog ekrana igre (z 6000) */}
            {active !== null &&
                isPieceId(active) &&
                layout &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        ref={setGhost}
                        aria-hidden="true"
                        className="pointer-events-none fixed left-0 top-0 z-[6500] drop-shadow-xl"
                        style={{ width: pieceBox(active) * layout.s, height: pieceBox(active) * layout.s }}
                    >
                        <div className={cn("h-full w-full", wobble && "animate-wiggle")}>
                            <PieceSvg piece={active} rot={view.rot[active] ?? 0} className="h-full w-full" />
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}
