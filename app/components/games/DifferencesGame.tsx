"use client";

// Igra „Pronađi razlike”: dve slike (jedna ispod druge na telefonu, jedna pored druge na širokom
// ekranu) iste su osim nekoliko razlika. Dete dodiruje razliku na bilo kojoj slici, a na obe se
// pojavi blag zeleni krug. Dodir na mestu gde su slike iste ostavlja mirnu sivu senku i glas
// kaže da su tu iste — bez zvuka greške. Dugme „Pomoć” blago istakne jednu razliku. Nema žurbe
// ni tajmera. Slike i nivoi: data/differencesLevels.ts.

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Lightbulb } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    demoRounds,
    DemoHand,
    Feedback,
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
    ALL_FOUND,
    buildDiffLevel,
    diffIntro,
    diffPictures,
    diffPictureView,
    diffResult,
    diffRoundsTotal,
    emptyDiffView,
    findTitle,
    getDifference,
    getDiffScene,
    HINT_TEXT,
    hitDifference,
    hitFound,
    MIN_HIT_PX,
    mergeDiffMonitor,
    SAME_HERE,
    SAME_HERE_SLOW,
    solveDiffView,
    type DiffPlan,
    type DiffScene,
    type DiffView,
} from "@/app/components/games/data/differencesLevels";
import { SceneArt } from "@/app/components/games/scene/SceneArt";
import { VIEW_H, VIEW_W, type SceneSpec } from "@/app/components/games/scene/types";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";

const GAME = getGame("differences");
/** Poruka „Tu su slike iste.” stoji ovoliko */
const WRONG_FEEDBACK_MS = 1400;
/** Glas posle pogrešnog dodira ne ponavlja se češće od ovoga (dete koje dodiruje redom) */
const WRONG_VOICE_MS = 2600;
/** Razmak između dve slike (px) */
const GAP_PX = 10;

function initialView(plan: DiffPlan | null): DiffView {
    if (!plan || plan.rounds.length === 0) return emptyDiffView(1);
    return { ...emptyDiffView(diffRoundsTotal(plan)), ...diffPictureView(plan.rounds[0], 0) };
}

export default function DifferencesGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<DiffView>) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const sync = useGameSync<DiffView>({ childId, gameId: "differences", level, isMonitor });
    const { say } = useSpeech(gender);
    const { after, cancel } = useTimers();
    const sayThen = useSayThen(say, after);
    const praise = usePraise();
    const guard = useInputGuard();

    // Komponenta se za svaki nivo pravi iznova, pa se slike biraju samo jednom, ovde
    // Zadaci iz semena dvoboja (isti za oba deteta) ili nasumični, kao i uvek (kit/random.ts)
    const random = useGameRandom();
    const [plan] = useState<DiffPlan | null>(() => (isMonitor ? null : buildDiffLevel(level, { maxRounds: settings.preset.maxRounds, random })));
    // Na lakim nivoima pomoć stiže već posle prvog promašaja i posle čekanja (osim kad je isključena)
    const early = (plan?.earlyHint ?? false) && settings.hintAfter > 0;
    const hintAfter = early ? 1 : settings.hintAfter;

    const [view, setView] = useState<DiffView>(() => initialView(plan));
    const viewRef = useRef(view);
    const finishedRef = useRef(false);
    const feedbackTimer = useRef<TimerId | null>(null);
    const lastWrongVoice = useRef(0);
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const commit = useCallback(
        (next: DiffView, log?: string) => {
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
        const current = viewRef.current;
        if (current.diffs.length > 0) say(diffIntro(current.diffs.length));
    }, [isMonitor, sync, guard, say]);

    const modeledRound = (current: DiffView) => demoRounds(level, current.totalRounds) > 0 && current.round === 1;

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const final = viewRef.current;
        sync.complete(final);
        onCompleteRef.current(diffResult(final, level, sync.elapsedSec()));
    };

    const startPicture = (index: number) => {
        const round = plan?.rounds[index];
        if (!round) return finish();
        guard.hold();
        const current = viewRef.current;
        commit({ ...current, ...diffPictureView(round, index), round: Math.min(current.round + 1, current.totalRounds) }, `Slika ${index + 1}: ${getDiffScene(round.scene)?.name ?? ""}`);
        say(diffIntro(round.diffs.length));
    };

    const found = (id: string) => {
        const current = viewRef.current;
        const scene = getDiffScene(current.scene);
        const diff = getDifference(scene, id);
        if (!diff) return;
        cancel(feedbackTimer.current);
        feedbackTimer.current = null;
        const done = current.found.length + 1 >= current.diffs.length;
        const { next, firstTry, modeled } = solveDiffView(current, level, id, {
            feedback: done ? "correct" : null,
            round: done ? current.round : Math.min(current.round + 1, current.totalRounds),
        });
        const how = modeled ? "(pokazna)" : firstTry ? "iz prvog pokušaja" : current.hint === id || current.hinted.includes(id) ? "uz pomoć" : "posle promašaja";
        commit(next, `Razlika ${how}: ${diff.text}`);
        playSfx("correct");
        guard.hold();
        if (!done) {
            say(praise(diff.text, firstTry), undefined, "happy");
            return;
        }
        const last = current.picture >= (plan?.rounds.length ?? 1) - 1;
        sayThen(praise(`${diff.text} ${ALL_FOUND}`, firstTry), last ? finish : () => startPicture(current.picture + 1), { min: 2200, emotion: "happy" });
    };

    /** Dodir slike: (x, y) u jedinicama slike, `unitPx` = koliko piksela je jedinica na ekranu */
    const tap = (x: number, y: number, unitPx: number) => {
        if (isMonitor || finishedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const scene = getDiffScene(current.scene);
        if (!scene || current.feedback === "correct") return;
        const ids = current.diffs.map((d) => d.id);
        const hit = hitDifference(scene, ids, current.found, x, y, unitPx);
        if (hit) {
            found(hit);
            return;
        }
        if (hitFound(scene, current.found, x, y, unitPx)) return;
        // Tu su slike iste: mirna senka na obe slike, bez zvuka greške
        const misses = current.misses + 1;
        const open = ids.filter((id) => !current.found.includes(id));
        const hint = current.hint ?? (!modeledRound(current) && hintDue(hintAfter, misses, 3) ? open[0] ?? null : null);
        commit(
            {
                ...current,
                misses,
                incorrectCount: current.incorrectCount + 1,
                miss: { x, y, n: (current.miss?.n ?? 0) + 1 },
                feedback: "wrong",
                hint,
                hinted: hint && !current.hinted.includes(hint) ? [...current.hinted, hint] : current.hinted,
            },
            hint && !current.hint ? "Promašaj — pomoć: razlika zasvetli" : "Promašaj: tu su slike iste"
        );
        playSfx("wrong");
        const now = Date.now();
        if (now - lastWrongVoice.current > WRONG_VOICE_MS) {
            lastWrongVoice.current = now;
            say(hint && !current.hint ? SAME_HERE_SLOW : SAME_HERE, undefined, "gentle");
        }
        cancel(feedbackTimer.current);
        feedbackTimer.current = after(WRONG_FEEDBACK_MS, () => {
            feedbackTimer.current = null;
            const latest = viewRef.current;
            if (latest.feedback === "wrong") commit({ ...latest, feedback: null });
        });
    };

    /** Pomoć: jedna preostala razlika blago pulsira na obe slike */
    const giveHint = (reason: string, voice: boolean) => {
        const current = viewRef.current;
        if (finishedRef.current || current.feedback === "correct" || current.hint) return;
        const open = current.diffs.map((d) => d.id).filter((id) => !current.found.includes(id));
        const pick = open[0];
        if (!pick) return;
        commit({ ...current, hint: pick, hinted: current.hinted.includes(pick) ? current.hinted : [...current.hinted, pick] }, reason);
        playSfx("tap");
        if (voice) say(HINT_TEXT, undefined, "gentle");
    };

    useWaitHint(!isMonitor && (settings.waitHint || early), `${view.picture}:${view.found.length}`, () => {
        const current = viewRef.current;
        if (modeledRound(current) && current.misses === 0) return; // tu pokazuje ruka
        giveHint("Pomoć posle čekanja", false);
    });

    const repeatInstruction = () => {
        const current = viewRef.current;
        if (current.feedback === "correct" || current.diffs.length === 0) return;
        const left = current.diffs.length - current.found.length;
        say(current.found.length === 0 ? diffIntro(current.diffs.length) : findTitle(left).replace("Pronađi", "Pronađi još"));
    };

    const shown = isMonitor ? mergeDiffMonitor(monitorState) : view;
    const score = isMonitor || settings.preset.showPoints ? shown.score : undefined;
    const scene = getDiffScene(shown.scene);

    if (!scene || shown.diffs.length === 0) {
        return (
            <GameStage>
                <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Razlika" score={score} />
                <GamePrompt title="Igra uskoro počinje" subtitle="Čekamo prve slike" />
            </GameStage>
        );
    }

    const solved = shown.feedback === "correct";
    const demo = !isMonitor && modeledRound(shown) && shown.found.length === 0 && shown.misses === 0 && !solved;
    const hintButton = isMonitor ? undefined : (
        <button
            type="button"
            onClick={() => giveHint("Dugme „Pomoć”", true)}
            disabled={solved || shown.hint !== null}
            aria-label="Pomoć"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-b-[5px] border-sun-600 bg-sun-400 font-extrabold text-ink transition-[transform,border-width,opacity] active:translate-y-[3px] active:border-b-2 disabled:opacity-45 sm:w-auto sm:px-4"
        >
            <Lightbulb className="h-5 w-5" aria-hidden="true" strokeWidth={2.6} />
            <span className="hidden text-sm sm:inline">Pomoć</span>
        </button>
    );

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} unit="Razlika" score={score} extra={hintButton} onSpeak={isMonitor ? undefined : repeatInstruction} className="[@media(max-height:30rem)]:py-1.5" />
            {/* Nizak ekran: uputstvo samo glasom (dugme „Ponovi”), da slike budu krupne */}
            <GamePrompt key={`prompt-${shown.picture}`} className="animate-fade-up [@media(max-height:46rem)]:hidden" compact title={findTitle(shown.diffs.length)} />
            <PlayArea accent={GAME.accent} className="relative p-1.5 sm:p-3">
                <DiffPair key={`pair-${shown.picture}`} view={shown} scene={scene} calm={calm} demo={demo} disabled={isMonitor || solved} onTap={tap} />
            </PlayArea>
            <Feedback
                kind={shown.feedback}
                correctText={ALL_FOUND}
                wrongText={SAME_HERE}
                className="-mt-1 min-h-11 sm:mt-0 [@media(max-height:46rem)]:absolute [@media(max-height:46rem)]:inset-x-0 [@media(max-height:46rem)]:bottom-1 [@media(max-height:46rem)]:z-30 [@media(max-height:46rem)]:mt-0"
            />
        </GameStage>
    );
}

// ── Dve slike ─────────────────────────────────────────────────────────────────

interface PairProps {
    view: DiffView;
    scene: DiffScene;
    calm: boolean;
    demo: boolean;
    disabled: boolean;
    onTap: (x: number, y: number, unitPx: number) => void;
}

/** Raspored: jedna ispod druge ili jedna pored druge — kako je slika veća */
function layoutFor(w: number, h: number): { row: boolean; width: number } {
    const ratio = VIEW_W / VIEW_H;
    const stacked = Math.min(w, ((h - GAP_PX) / 2) * ratio);
    const side = Math.min((w - GAP_PX) / 2, h * ratio);
    return side > stacked ? { row: true, width: Math.max(0, side) } : { row: false, width: Math.max(0, stacked) };
}

function DiffPair({ view, scene, calm, demo, disabled, onTap }: PairProps) {
    const [root, setRoot] = useState<HTMLDivElement | null>(null);
    const [box, setBox] = useState({ w: 0, h: 0 });
    // Slike se crtaju iznova samo kad se promene razlike (monitor dobija novo stanje posle svakog dodira)
    const diffKey = view.diffs.map((d) => `${d.id}:${d.side}`).join(",");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const pictures = useMemo(() => diffPictures(scene, view.diffs), [scene, diffKey]);

    useEffect(() => {
        if (!root || typeof ResizeObserver === "undefined") return;
        const measure = () => {
            const rect = root.getBoundingClientRect();
            setBox((previous) => (Math.abs(previous.w - rect.width) < 1 && Math.abs(previous.h - rect.height) < 1 ? previous : { w: rect.width, h: rect.height }));
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(root);
        return () => observer.disconnect();
    }, [root]);

    const { row, width } = layoutFor(box.w, box.h);
    const unitPx = width / VIEW_W;
    const first = view.diffs.find((d) => !view.found.includes(d.id));

    return (
        // Slike stoje preko polja (apsolutno): veličinu polja određuje raspored, a ne slike
        <div ref={setRoot} className="relative min-h-0 w-full flex-1 self-stretch">
            {width > 0 && (
                <div className={cn("absolute inset-0 flex items-center justify-center", row ? "flex-row" : "flex-col")} style={{ gap: GAP_PX }}>
                    {(["a", "b"] as const).map((side) => (
                        <DiffPicture
                            key={side}
                            label={side === "a" ? (row ? "Leva slika" : "Gornja slika") : row ? "Desna slika" : "Donja slika"}
                            spec={pictures[side]}
                            view={view}
                            scene={scene}
                            width={width}
                            unitPx={unitPx}
                            calm={calm}
                            disabled={disabled}
                            demoAt={demo && side === "a" && first ? getDifference(scene, first.id)?.at ?? null : null}
                            glow={demo && first ? first.id : null}
                            onTap={onTap}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface PictureProps {
    label: string;
    spec: SceneSpec;
    view: DiffView;
    scene: DiffScene;
    width: number;
    unitPx: number;
    calm: boolean;
    disabled: boolean;
    /** Pokazni zadatak: ruka dodiruje ovu razliku */
    demoAt: readonly [number, number, number] | null;
    /** Razlika koja svetli kao pomoć ili uz ruku */
    glow: string | null;
    onTap: (x: number, y: number, unitPx: number) => void;
}

const STYLE = `
.diff-ring { animation: diff-ring 420ms cubic-bezier(0.2, 0.9, 0.3, 1.2) both; transform-box: fill-box; transform-origin: center; }
@keyframes diff-ring { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.diff-hint { animation: diff-hint 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes diff-hint { 0%, 100% { transform: scale(0.9); opacity: 0.55; } 50% { transform: scale(1.08); opacity: 1; } }
.diff-miss { animation: diff-miss 900ms ease-out both; transform-box: fill-box; transform-origin: center; }
@keyframes diff-miss { 0% { opacity: 0; transform: scale(0.6); } 20% { opacity: 1; } 100% { opacity: 0; transform: scale(1.15); } }
@media (prefers-reduced-motion: reduce) { .diff-ring, .diff-hint, .diff-miss { animation: none; } }
`;

function DiffPicture({ label, spec, view, scene, width, unitPx, calm, disabled, demoAt, glow, onTap }: PictureProps) {
    const height = (width * VIEW_H) / VIEW_W;
    // Krug je bar onoliki koliko i mesto za dodir (48 px), da se vidi šta je pronađeno
    const ringR = (r: number) => Math.max(r, (MIN_HIT_PX - 2) / Math.max(unitPx, 0.01)) + 1;
    const stroke = 3 / Math.max(unitPx, 0.01);
    const hinted = view.hint ?? glow;

    const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (rect.width === 0) return;
        const x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
        const y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
        onTap(x, y, rect.width / VIEW_W);
    };

    return (
        <div
            role="img"
            aria-label={`${label}: ${scene.name.toLowerCase()}`}
            onPointerUp={onPointerUp}
            className={cn("relative shrink-0 touch-manipulation select-none overflow-hidden rounded-2xl bg-surface shadow-soft ring-4 ring-white", !disabled && "cursor-pointer")}
            style={{ width, height }}
        >
            <SceneArt spec={spec} className="pointer-events-none h-full w-full" />
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                <style>{STYLE}</style>
                {view.found.map((id) => {
                    const diff = getDifference(scene, id);
                    if (!diff) return null;
                    return (
                        <g key={id} className={calm ? undefined : "diff-ring"}>
                            <circle cx={diff.at[0]} cy={diff.at[1]} r={ringR(diff.at[2])} fill="#10b981" fillOpacity={0.08} stroke="#ffffff" strokeWidth={stroke * 2.2} />
                            <circle cx={diff.at[0]} cy={diff.at[1]} r={ringR(diff.at[2])} fill="none" stroke="#059669" strokeWidth={stroke} />
                        </g>
                    );
                })}
                {hinted &&
                    !view.found.includes(hinted) &&
                    (() => {
                        const diff = getDifference(scene, hinted);
                        if (!diff) return null;
                        return (
                            <g className={calm ? undefined : "diff-hint"}>
                                <circle cx={diff.at[0]} cy={diff.at[1]} r={ringR(diff.at[2]) + 2} fill="#ffd36b" fillOpacity={0.3} stroke="#ffffff" strokeWidth={stroke * 2.4} strokeOpacity={0.9} />
                                <circle cx={diff.at[0]} cy={diff.at[1]} r={ringR(diff.at[2]) + 2} fill="none" stroke="#f59e0b" strokeWidth={stroke * 1.3} strokeDasharray={`${stroke * 2.5} ${stroke * 1.6}`} />
                            </g>
                        );
                    })()}
                {view.miss && (
                    <circle key={view.miss.n} className={calm ? undefined : "diff-miss"} cx={view.miss.x} cy={view.miss.y} r={(MIN_HIT_PX - 6) / Math.max(unitPx, 0.01)} fill="#57537a" fillOpacity={0.12} stroke="#8f8ba8" strokeWidth={stroke * 0.8} opacity={calm ? 0.6 : undefined} />
                )}
            </svg>
            {demoAt && (
                // Vrh prsta ruke je na sredini razlike (ruka stoji u donjem desnom uglu ovog okvira)
                <span className="pointer-events-none absolute h-[62px] w-14" style={{ left: demoAt[0] * unitPx - 10, top: demoAt[1] * unitPx - 4 }}>
                    <DemoHand />
                </span>
            )}
        </div>
    );
}
