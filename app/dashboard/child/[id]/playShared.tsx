// app/dashboard/child/[id]/playShared.tsx
"use client";

// Zajednička tabla: igra sa drugom na dva uređaja kao JEDNA igra, na smenu („jednom stiska jedan,
// jednom drugi”). Pravila, poruke i smena su u lib/sharedPlay.ts (zašto ključevi radnji i domaćin
// koji jedini igra pravu igru — piše u zaglavlju tog fajla). Ovde je deo sa ekranom:
//  • SharedHostLayer — domaćin: prava igra, smena, snimci table drugu, primena dodira gosta i
//    zabrana dodira kad nije na redu (vidljivo: okvir u boji druga i kratko „Sada igra Amar”);
//  • SharedGuestBoard — gost: ista igra u režimu monitora (`isMonitor` + `monitorState`), dodiri
//    postaju ključevi radnji, a kraj nivoa i rezultat stižu od domaćina;
//  • SharedStrip — oba deteta, „Na redu je: Lejla” sa drugarom tog deteta (i rezultat u dvoboju);
//  • GhostTap — mekan „prst” tamo gde je drugo dete upravo dodirnulo, da svako VIDI šta drugi radi.
//
// Mirno i predvidljivo (deca od 3 do 10 godina, deca sa autizmom): red se vidi uvek na istom
// mestu, uz lik deteta koje igra; dodir van reda se ne gubi bez traga nego kaže čiji je red; nema
// sata ni žurbe; „Manje animacija” gasi pokrete (prst se samo pojavi i nestane). Glas nikad ne
// kaže gde da se dodirne; gost čuje isto uputstvo kao domaćin (rečenice bez imena).

import { cloneElement, useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement, type RefObject, type SyntheticEvent } from "react";
import { Hand } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { GAME_COMPONENTS } from "@/app/components/LiveMonitor";
import { SharedMirrorContext } from "@/app/components/games/kit/ui";
import type { GameProps, GameResult } from "@/app/components/games/kit/types";
import { Button, Spinner } from "@/app/components/ui/Button";
import { cn } from "@/lib/cn";
import { getGame, type GameId } from "@/lib/games";
import type { TogetherPlayer } from "@/lib/playTogether";
import { GameEventTapProvider, useGameBroadcast } from "@/lib/realtime";
import {
    actionKeyOf,
    finishTurns,
    initialTurnState,
    isNewer,
    judgeAction,
    mayTouch,
    parseAction,
    parsePointKey,
    pickHit,
    playerResult,
    pointKey,
    publishSharedTurns,
    resetSharedTurns,
    selectorFor,
    sharedScores,
    stepTurn,
    takeTurn,
    type HitCandidate,
    type MirrorMessage,
    type SharedRole,
    type SharedSay,
    type SharedTap,
    type SharedTurnState,
    type Stamp,
} from "@/lib/sharedPlay";
import { onSpoken, speak } from "@/lib/speech";
import type { GameUpdate } from "@/lib/types";
import { VOICE_EMOTIONS } from "@/lib/emotion";
import { useSpeakingLock } from "@/lib/voice";
import { LOOKS, PlayerPicture } from "./playTogether";
import { useRemote } from "./playRemote";
import { ScorePill } from "./playVersus";

// ── Mere i vremena ─────────────────────────────────────────────────────────────

/** Najkraći razmak između dva snimka (snimci se spajaju: ide uvek najnoviji) */
const MIRROR_GAP_MS = 90;
/** Snimak se ponavlja i kad se ništa ne menja (gost koji je propustio poruku sustiže tablu) */
const MIRROR_REPEAT_MS = 2500;
/** Gost traži snimak dok ga ne dobije (kanal se tek povezuje) */
const HELLO_REPEAT_MS = 1500;
/** Igra posle novog zadatka ili greške kratko ne prima dodir (useInputGuard): toliko se čeka pa ponavlja */
const GUARD_RETRY_MS = 480;
/** Dodir gosta čeka da učitelj kod domaćina završi rečenicu najviše ovoliko */
const LISTEN_WAIT_MS = 8000;
/** Drug je u predvorju (izašao iz igre) ovoliko dugo: domaćin igra sam */
const AWAY_MS = 6000;
/** Pomeraj prsta (px) posle kog je dodir prevlačenje */
const DRAG_PX = 10;
const NOTE_MS = 1600;

const ACTION_SELECTOR = "[data-action], [data-piece], [data-slot], [data-drop], [data-action-point]";

// ── Ključevi radnji u DOM-u ─────────────────────────────────────────────────────

function visible(el: Element): boolean {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

/**
 * Ključ pod tačkom (x, y), po geometriji: u monitoru su dugmad isključena i bez dodira, pa
 * `elementFromPoint` ne pomaže. SVG oblici (polja bojanke) se proveravaju po popunjenom delu.
 */
export function actionAt(root: HTMLElement | null, x: number, y: number, preferPlaces = false): string | null {
    if (!root) return null;
    const candidates: HitCandidate[] = [];
    root.querySelectorAll<Element>(ACTION_SELECTOR).forEach((el, order) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
        const pointName = el.getAttribute("data-action-point");
        if (pointName) {
            candidates.push({ key: pointKey(pointName, (x - rect.left) / rect.width, (y - rect.top) / rect.height), area: rect.width * rect.height, order, point: true });
            return;
        }
        const key = actionKeyOf(el);
        if (!key) return;
        let exact = false;
        if (typeof SVGGeometryElement !== "undefined" && el instanceof SVGGeometryElement) {
            const matrix = el.getScreenCTM()?.inverse();
            if (!matrix) return;
            const local = new DOMPoint(x, y).matrixTransform(matrix);
            if (!el.isPointInFill(local) && !el.isPointInStroke(local)) return;
            exact = true;
        }
        candidates.push({ key, area: rect.width * rect.height, order, exact });
    });
    return pickHit(candidates, preferPlaces);
}

/** Vidljiv element sa ključem (isti ključ može imati i skriven duplikat za drugi raspored) */
function findAction(root: HTMLElement | null, key: string): Element | null {
    const selector = selectorFor(key);
    if (!root || !selector) return null;
    const all = Array.from(root.querySelectorAll(selector));
    return all.find(visible) ?? all[0] ?? null;
}

/** Tačka ključa u koordinatama ekrana (sredina elementa ili tačka u njemu) */
function spotOf(root: HTMLElement | null, key: string): { x: number; y: number; size: number } | null {
    const el = findAction(root, key);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const point = parsePointKey(key);
    if (point) return { x: rect.left + point.fx * rect.width, y: rect.top + point.fy * rect.height, size: 64 };
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, size: Math.min(Math.max(rect.width, rect.height), 132) };
}

/** Domaćin izvodi radnju na svojoj tabli istim putem kao pravi dodir. Vraća false kad elementa nema. */
function performAction(root: HTMLElement | null, key: string): boolean {
    const el = findAction(root, key);
    if (!el) return false;
    const point = parsePointKey(key);
    if (point) {
        // Mesto dodira je sam zadatak (razlike, lavirint): dodir na istom delu slike
        const rect = el.getBoundingClientRect();
        const init: PointerEventInit = {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + point.fx * rect.width,
            clientY: rect.top + point.fy * rect.height,
            pointerId: 91,
            pointerType: "touch",
            isPrimary: true,
            button: 0,
        };
        el.dispatchEvent(new PointerEvent("pointerdown", init));
        el.dispatchEvent(new PointerEvent("pointerup", init));
        return true;
    }
    if (el instanceof HTMLElement) el.click();
    else el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
}

function isDisabled(el: Element | null): boolean {
    return el instanceof HTMLButtonElement && el.disabled;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Prvi ključ od mesta dodira naviše (domaćin beleži svoj dodir za „prst” kod druga) */
function keyFromTarget(target: EventTarget | null, root: HTMLElement | null): string | null {
    let el = target instanceof Element ? target : null;
    while (el && el !== root) {
        const key = actionKeyOf(el);
        if (key) return key;
        el = el.parentElement;
    }
    return null;
}

// ── Domaćin ────────────────────────────────────────────────────────────────────

interface HostProps {
    gameId: GameId;
    /** Partija (igra, nivo, pokušaj) */
    sessionId: string;
    /** GameSlot sa pravom igrom */
    children: ReactElement<GameProps>;
}

export function SharedHostLayer({ gameId, sessionId, children }: HostProps) {
    const remote = useRemote();
    const session = remote?.session;
    const friend = session?.friend ?? null;
    const duel = session?.mode === "versus";
    const channel = remote?.sharedChannel;
    const report = remote?.report;
    const listening = useSpeakingLock();
    const rootRef = useRef<HTMLDivElement>(null);
    const [epoch] = useState(() => Date.now());
    const seq = useRef(0);

    const [turns, setTurns] = useState<SharedTurnState | null>(null);
    const turnsRef = useRef<SharedTurnState | null>(null);
    const viewRef = useRef<Record<string, unknown> | null>(null);
    const [tap, setTap] = useState<SharedTap | null>(null);
    const tapRef = useRef<SharedTap | null>(null);
    const ackRef = useRef<Stamp | null>(null);
    const lastAction = useRef<Stamp | null>(null);
    const finalRef = useRef<{ host: GameResult; guest: GameResult } | null>(null);
    const sayRef = useRef<SharedSay | null>(null);
    const updates = useRef(0);
    const [note, setNote] = useState(0);

    // Drug nije tu (otišao, ili je dugo u predvorju): domaćin igra sam, red se ne predaje
    const away = remote?.friendState?.phase === "lobby";
    const [awaySince, setAwaySince] = useState(0);
    useEffect(() => {
        const timer = setTimeout(() => setAwaySince(away ? Date.now() : 0), 0);
        return () => clearTimeout(timer);
    }, [away]);
    const now = remote?.now ?? 0;
    const solo = Boolean(remote?.friendGone) || (away && awaySince > 0 && now - awaySince > AWAY_MS);
    const soloRef = useRef(solo);
    const listeningRef = useRef(listening);

    const setTurnState = useCallback((next: SharedTurnState) => {
        turnsRef.current = next;
        setTurns(next);
        publishSharedTurns(next.results);
    }, []);

    // ── Snimci ──
    const lastSent = useRef(0);
    const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const flush = useCallback(() => {
        if (pendingTimer.current) clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
        const view = viewRef.current;
        const state = turnsRef.current;
        if (!channel || !view || !state) return;
        seq.current += 1;
        lastSent.current = Date.now();
        const message: MirrorMessage = {
            epoch,
            seq: seq.current,
            session: sessionId,
            game: gameId,
            level: typeof view.level === "number" ? view.level : 1,
            view,
            turn: state.turn,
            turnNo: state.turnNo,
            solo: soloRef.current,
            listening: listeningRef.current,
            tap: tapRef.current,
            ack: ackRef.current,
            results: state.results,
            final: finalRef.current,
            say: sayRef.current,
        };
        channel.send("mirror", message);
    }, [channel, epoch, gameId, sessionId]);
    const schedule = useCallback(() => {
        if (pendingTimer.current) return;
        const waitMs = Math.max(0, MIRROR_GAP_MS - (Date.now() - lastSent.current));
        pendingTimer.current = setTimeout(flush, waitMs);
    }, [flush]);
    useEffect(() => {
        const timer = setInterval(flush, MIRROR_REPEAT_MS);
        return () => {
            clearInterval(timer);
            if (pendingTimer.current) clearTimeout(pendingTimer.current);
        };
    }, [flush]);

    useEffect(() => {
        resetSharedTurns();
    }, []);

    useEffect(() => {
        soloRef.current = solo;
        const state = turnsRef.current;
        // Drug je otišao baš kad je bio na redu: red se vraća domaćinu
        if (solo && state && state.turn === "guest" && !state.finished) setTurnState(takeTurn(state, "host"));
        schedule();
    }, [solo, schedule, setTurnState]);

    // ── Stanje igre → smena ──
    const onUpdate = useCallback(
        (update: GameUpdate) => {
            report?.(update, gameId);
            const view: Record<string, unknown> = { ...(update.data ?? {}) };
            delete view.log;
            viewRef.current = view;
            updates.current += 1;
            if (update.event === "completed") return;
            const previous = turnsRef.current;
            setTurnState(previous ? stepTurn(gameId, previous, view, soloRef.current) : initialTurnState(gameId, view));
            schedule();
        },
        [report, gameId, schedule, setTurnState]
    );

    // Gost čuje isto uputstvo i pohvalu (rečenice bez imena; posle kraja nivoa svako čuje svoj kraj)
    useEffect(
        () =>
            onSpoken((text, emotion) => {
                if (finalRef.current) return;
                sayRef.current = { n: (sayRef.current?.n ?? 0) + 1, text, emotion };
                schedule();
            }),
        [schedule]
    );

    // ── Dodiri gosta ──
    const queue = useRef<{ keys: string[]; stamp: Stamp; turnNo: number; at: number } | null>(null);
    const running = useRef(false);

    const run = useCallback(async () => {
        const job = queue.current;
        if (!job || running.current) return;
        if (listeningRef.current && Date.now() - job.at < LISTEN_WAIT_MS) return;
        queue.current = null;
        running.current = true;
        try {
            const root = rootRef.current;
            const [first, second] = job.keys;
            const before = updates.current;
            if (!performAction(root, first)) return;
            if (second) {
                // Prevlačenje kod gosta = komad, pa mesto. Ako je prvi dodir upravo poništio izbor
                // (komad je već bio izabran), mesto ostaje zatvoreno: komad se bira još jednom.
                await nextFrame();
                await wait(60);
                if (isDisabled(findAction(root, second))) {
                    performAction(root, first);
                    await nextFrame();
                    await wait(60);
                }
                performAction(root, second);
            } else if (!parsePointKey(first)) {
                // Igra je dodir odbila jer je upravo krenuo zadatak (kratka zaštita od slučajnog dodira):
                // posle zaštite dodir se ponavlja jednom — samo ako se igra uopšte nije pomerila
                await wait(GUARD_RETRY_MS);
                const state = turnsRef.current;
                if (updates.current === before && state && state.turn === "guest" && state.turnNo === job.turnNo) performAction(root, first);
            }
            ackRef.current = job.stamp;
            tapRef.current = { by: "guest", key: second ?? first, n: (tapRef.current?.n ?? 0) + 1 };
            setTap(tapRef.current);
            schedule();
        } finally {
            running.current = false;
        }
    }, [schedule]);

    useEffect(() => {
        listeningRef.current = listening;
        schedule();
        if (!listening) void run();
    }, [listening, run, schedule]);

    useEffect(() => {
        if (!channel) return;
        return channel.listen((kind, payload) => {
            if (kind === "hello") {
                flush();
                return;
            }
            if (kind !== "action") return;
            const action = parseAction(payload);
            const state = turnsRef.current;
            if (!action || !state) return;
            const verdict = judgeAction(
                { session: sessionId, turn: state.turn, turnNo: state.turnNo, solo: soloRef.current, finished: Boolean(finalRef.current), last: lastAction.current },
                action
            );
            if (verdict === "duplicate" || verdict === "other-session") return;
            // Svaka radnja se razmatra samo jednom, i kad je odbijena (zakasnela, tuđ red)
            lastAction.current = { epoch: action.epoch, seq: action.seq };
            if (verdict !== "apply") {
                flush();
                return;
            }
            queue.current = { keys: action.keys, stamp: lastAction.current, turnNo: action.turnNo, at: Date.now() };
            void run();
            // Učitelj govori: dodir čeka kraj rečenice (ili najduže LISTEN_WAIT_MS)
            if (listeningRef.current) setTimeout(() => void run(), LISTEN_WAIT_MS + 50);
        });
    }, [channel, flush, run, sessionId]);

    // ── Dodiri domaćina ──
    const allowed = !turns || turns.finished || mayTouch("host", turns.turn, solo);
    const allowedRef = useRef(allowed);
    useEffect(() => {
        allowedRef.current = allowed;
    }, [allowed]);
    const down = useRef<{ x: number; y: number; key: string | null } | null>(null);
    const block = (event: SyntheticEvent) => {
        if (!event.nativeEvent.isTrusted || allowedRef.current) return false;
        event.preventDefault();
        event.stopPropagation();
        return true;
    };
    const recordTap = (key: string | null) => {
        if (!key) return;
        tapRef.current = { by: "host", key, n: (tapRef.current?.n ?? 0) + 1 };
        setTap(tapRef.current);
        schedule();
    };
    const onPointerDownCapture = (event: ReactPointerEvent) => {
        if (block(event)) {
            setNote(Date.now());
            return;
        }
        if (event.nativeEvent.isTrusted) down.current = { x: event.clientX, y: event.clientY, key: keyFromTarget(event.target, rootRef.current) };
    };
    const onPointerUpCapture = (event: ReactPointerEvent) => {
        if (block(event)) return;
        const start = down.current;
        down.current = null;
        if (!start || !event.nativeEvent.isTrusted) return;
        // Prevlačenje: „prst” kod druga pokazuje mesto gde je komad pušten
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) >= DRAG_PX) recordTap(actionAt(rootRef.current, event.clientX, event.clientY, true));
        else if (!start.key) {
            const key = actionAt(rootRef.current, event.clientX, event.clientY);
            if (key && parsePointKey(key)) recordTap(key);
        }
    };
    const onClickCapture = (event: SyntheticEvent) => {
        if (block(event)) return;
        if (event.nativeEvent.isTrusted) recordTap(keyFromTarget(event.target, rootRef.current));
    };

    // Kraj nivoa: rezultat za oba deteta, pa sopstveni kraj nivoa kao i inače
    const original = children.props.onComplete;
    const complete = useCallback(
        (result: GameResult) => {
            const view = viewRef.current ?? {};
            const state = finishTurns(gameId, turnsRef.current ?? initialTurnState(gameId, view), view);
            setTurnState(state);
            const mode = duel ? "duel" : "together";
            const final = { host: playerResult(result, state, "host", mode), guest: playerResult(result, state, "guest", mode) };
            finalRef.current = final;
            flush();
            original(final.host);
        },
        [original, gameId, duel, flush, setTurnState]
    );
    const slot = <WithComplete element={children} onComplete={complete} />;

    if (!remote || !session || !friend) return children;
    const waiting = Boolean(turns && !turns.finished && !allowed);
    const scores = sharedScores(turns?.results ?? []);
    const players: Record<SharedRole, TogetherPlayer> = { host: remote.me, guest: friend };
    const onTurn = turns ? players[solo ? "host" : turns.turn] : remote.me;

    return (
        <GameEventTapProvider value={onUpdate}>
            <div className="relative flex flex-1 flex-col gap-2 sm:gap-3 md:flex-row landscape:flex-row">
                <SharedStrip me={remote.me} friend={friend} myTurn={!waiting} onTurn={onTurn} solo={solo} duel={duel} myScore={scores.host} friendScore={scores.guest} stars={remote.myState.stars} />
                <div
                    ref={rootRef}
                    className={cn("relative flex min-w-0 flex-1 flex-col rounded-[1.75rem] outline outline-4 -outline-offset-2 transition-[outline-color] duration-300", waiting ? "outline-orange-300/80" : "outline-transparent")}
                    aria-disabled={waiting || undefined}
                    onPointerDownCapture={onPointerDownCapture}
                    onPointerUpCapture={onPointerUpCapture}
                    onClickCapture={onClickCapture}
                    onKeyDownCapture={(event) => void block(event)}
                >
                    {slot}
                    <GhostTap rootRef={rootRef} tap={tap?.by === "guest" ? tap : null} look={LOOKS[1]} />
                    <TurnNote at={note} name={friend.name} />
                </div>
            </div>
        </GameEventTapProvider>
    );
}

/** Igra sa zamenjenim krajem nivoa (rezultat za oba deteta ide pre kraja nivoa domaćina) */
function WithComplete({ element, onComplete }: { element: ReactElement<GameProps>; onComplete: (result: GameResult) => void }) {
    return cloneElement(element, { onComplete });
}

// ── Gost ───────────────────────────────────────────────────────────────────────

interface GuestProps {
    gameId: GameId;
    /** Nivo koji je ovaj uređaj otvorio (prati domaćina) */
    level: number;
    gender?: string;
    onComplete: (result: GameResult) => void;
    onFollowLevel: (level: number) => void;
}

const noop = () => {};

export function SharedGuestBoard({ gameId, level, gender, onComplete, onFollowLevel }: GuestProps) {
    const remote = useRemote();
    const channel = remote?.sharedChannel;
    const session = remote?.session ?? null;
    const duel = session?.mode === "versus";
    // Ime i drugar domaćina ostaju i kad se igra sa drugom završi (mirna poruka na istoj tabli)
    const [host] = useState<TogetherPlayer | null>(() => session?.friend ?? null);
    const boardRef = useRef<HTMLDivElement>(null);
    const [epoch] = useState(() => Date.now());
    const seq = useRef(0);
    const [mirror, setMirror] = useState<MirrorMessage | null>(() => {
        const last = channel?.lastMirror() ?? null;
        return last && last.game === gameId && last.level === level && !channel?.finished(last.epoch) ? last : null;
    });
    const mirrorRef = useRef(mirror);
    const followed = useRef(0);
    const completed = useRef(false);
    const saidN = useRef<number | null>(null);
    const [localTap, setLocalTap] = useState<SharedTap | null>(null);
    const [note, setNote] = useState<{ at: number; kind: "wait" | "listen" } | null>(null);
    const report = remote?.report;
    // Roditelj gosta koji prati uživo vidi istu zajedničku tablu (kao da dete igra samo)
    const publish = useGameBroadcast(remote?.me.childId ?? 0, Boolean(remote && !remote.preview));
    const published = useRef<string | null>(null);

    const follow = useCallback(
        (next: MirrorMessage) => {
            if (followed.current === next.epoch) return;
            followed.current = next.epoch;
            onFollowLevel(next.level);
        },
        [onFollowLevel]
    );

    useEffect(() => {
        resetSharedTurns();
    }, []);

    // Snimci od domaćina
    useEffect(() => {
        if (!channel) return;
        return channel.listen((kind, payload) => {
            if (kind !== "mirror") return;
            const next = payload as MirrorMessage;
            if (next.game !== gameId) return;
            const current = mirrorRef.current;
            if (current && !isNewer(next, current)) return;
            // Završen nivo: njegovi ponovljeni snimci ne menjaju ništa
            if (channel.finished(next.epoch) && completed.current) return;
            // Domaćin je pokrenuo novi nivo (ili isti još jednom): gost ga prati
            if ((current && next.epoch !== current.epoch && current.final) || next.level !== level) {
                follow(next);
                return;
            }
            if (channel.finished(next.epoch) && !current) return;
            mirrorRef.current = next;
            setMirror(next);
        });
    }, [channel, gameId, level, follow]);

    // Dok nema snimka: „pošalji mi tablu” (posle ulaska ili osvežavanja stranice)
    const hasMirror = mirror !== null;
    useEffect(() => {
        if (!channel || hasMirror) return;
        const hello = () => channel.send("hello", {});
        hello();
        const timer = setInterval(hello, HELLO_REPEAT_MS);
        return () => clearInterval(timer);
    }, [channel, hasMirror]);

    // Snimak → napredak (drug vidi zadatak), rezultati poteza, glas i kraj nivoa
    useEffect(() => {
        if (!mirror || !channel) return;
        publishSharedTurns(mirror.results);
        const mine = sharedScores(mirror.results).guest;
        const game = getGame(gameId);
        const update: GameUpdate = {
            childId: remote?.me.childId ?? 0,
            activityId: game.activityId,
            gameType: game.gameType,
            event: "progress",
            data: { ...mirror.view, correctCount: duel ? mine : mirror.view.correctCount },
            timestamp: new Date().toISOString(),
        };
        report?.(update, gameId);
        // Snimak se ponavlja i kad se ništa ne menja: roditelju ide samo promena
        const shown = JSON.stringify(mirror.view) + (mirror.final ? ":kraj" : "");
        if (published.current !== shown) {
            const first = published.current === null;
            published.current = shown;
            if (mirror.final) publish({ ...update, event: "completed", data: { ...mirror.view, finalScore: mirror.final.guest.score } });
            else publish({ ...update, event: first ? "started" : "progress" });
        }
        if (saidN.current === null) saidN.current = mirror.say?.n ?? 0;
        else if (mirror.say && mirror.say.n > saidN.current && !mirror.final) {
            saidN.current = mirror.say.n;
            const emotion = VOICE_EMOTIONS.find((e) => e === mirror.say?.emotion);
            void speak(mirror.say.text, { gender, emotion, relayed: true });
        }
        if (mirror.final && !completed.current) {
            completed.current = true;
            channel.markFinished(mirror.epoch);
            onComplete(mirror.final.guest);
        }
    }, [mirror, channel, report, publish, gameId, duel, gender, onComplete, remote?.me.childId]);

    // ── Dodiri ──
    const down = useRef<{ x: number; y: number; key: string | null } | null>(null);
    const stop = (event: SyntheticEvent) => {
        event.preventDefault();
        event.stopPropagation();
    };
    const onPointerDownCapture = (event: ReactPointerEvent) => {
        stop(event);
        down.current = { x: event.clientX, y: event.clientY, key: actionAt(boardRef.current, event.clientX, event.clientY) };
    };
    const onPointerUpCapture = (event: ReactPointerEvent) => {
        stop(event);
        const start = down.current;
        down.current = null;
        const current = mirrorRef.current;
        if (!start || !current || current.final || !session || !channel) return;
        if (!mayTouch("guest", current.turn, current.solo)) {
            setNote({ at: Date.now(), kind: "wait" });
            return;
        }
        if (current.listening) {
            setNote({ at: Date.now(), kind: "listen" });
            return;
        }
        const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y) >= DRAG_PX;
        const end = moved ? actionAt(boardRef.current, event.clientX, event.clientY, true) : start.key;
        const keys = moved && start.key && end && start.key !== end ? [start.key, end] : [end ?? start.key].filter((k): k is string => Boolean(k));
        if (keys.length === 0) return;
        seq.current += 1;
        channel.send("action", { epoch, seq: seq.current, session: current.session, turnNo: current.turnNo, keys });
        setLocalTap((prev) => ({ by: "guest", key: keys[keys.length - 1], n: (prev?.n ?? 0) + 1 }));
    };

    const Game = GAME_COMPONENTS[getGame(gameId).gameType];
    const friendName = host?.name ?? "Drug";
    const ended = !session;
    const scores = sharedScores(mirror?.results ?? []);
    const myTurn = Boolean(mirror && !mirror.final && mayTouch("guest", mirror.turn, mirror.solo));
    const onTurn = mirror && host && remote ? (mirror.solo || mirror.turn === "host" ? host : remote.me) : null;
    const hostTap = mirror?.tap?.by === "host" ? mirror.tap : null;

    return (
        <div className="relative flex flex-1 flex-col gap-2 sm:gap-3 md:flex-row landscape:flex-row">
            {remote && host && (
                <SharedStrip
                    me={remote.me}
                    friend={host}
                    myTurn={myTurn}
                    onTurn={onTurn}
                    solo={false}
                    friendAway={Boolean(mirror?.solo) || remote.friendGone}
                    duel={duel}
                    myScore={scores.guest}
                    friendScore={scores.host}
                    stars={remote.myState.stars}
                />
            )}
            <div
                ref={boardRef}
                className={cn(
                    "relative flex min-w-0 flex-1 select-none flex-col rounded-[1.75rem] outline outline-4 -outline-offset-2 transition-[outline-color] duration-300",
                    // Na redu: prevlačenje prstom ne pomera stranicu (komad se nosi); inače stranica sme da se pomeri
                    myTurn ? "touch-none" : "touch-manipulation",
                    mirror && !myTurn && !mirror.final ? "outline-orange-300/80" : "outline-transparent"
                )}
                aria-disabled={!myTurn || undefined}
                onPointerDownCapture={onPointerDownCapture}
                onPointerUpCapture={onPointerUpCapture}
                onClickCapture={stop}
                onKeyDownCapture={stop}
            >
                {mirror ? (
                    <SharedMirrorContext value>
                        <Game key={mirror.epoch} childId={remote?.me.childId ?? 0} level={mirror.level} gender={gender} onComplete={noop} isMonitor monitorState={mirror.view} />
                    </SharedMirrorContext>
                ) : (
                    !ended && (
                        <div className="flex flex-1 items-center justify-center gap-3 p-6 text-center font-display text-xl font-extrabold text-ink-soft" role="status">
                            <Spinner className="h-6 w-6" />
                            Čekamo da {friendName} krene…
                        </div>
                    )
                )}
                <GhostTap rootRef={boardRef} tap={hostTap} look={LOOKS[1]} />
                <GhostTap rootRef={boardRef} tap={localTap} look={LOOKS[0]} quick />
                {note && <TurnNote at={note.at} name={friendName} listen={note.kind === "listen"} />}
            </div>
            {ended && !mirror?.final && <HostLeft onAlone={() => onFollowLevel(level)} />}
        </div>
    );
}

/** Domaćin je završio igru sa drugom usred nivoa: mirno, bez tuge, sa sledećim korakom (bez roda: pol druga se ne zna). */
function HostLeft({ onAlone }: { onAlone: () => void }) {
    return (
        <div className="absolute inset-0 z-30 grid place-items-center rounded-[1.75rem] bg-canvas/80 p-4 backdrop-blur-sm" role="status">
            <div className="w-full max-w-sm animate-fade-up rounded-[1.75rem] bg-surface p-6 text-center shadow-pop">
                <p className="font-display text-2xl font-extrabold text-ink">Igra sa drugom je gotova</p>
                <p className="mt-1 text-lg font-bold text-ink-soft">Bravo za igru zajedno! Možeš da nastaviš ovaj nivo.</p>
                <Button chunky size="xl" variant="success" block className="mt-5" onClick={onAlone}>
                    Igraj dalje
                </Button>
            </div>
        </div>
    );
}

// ── Traka: čiji je red ─────────────────────────────────────────────────────────

interface StripProps {
    me: TogetherPlayer;
    friend: TogetherPlayer;
    /** Ovo dete je na redu (ili igra samo) */
    myTurn: boolean;
    /** Dete koje je na redu (null dok tabla ne stigne) */
    onTurn: TogetherPlayer | null;
    /** Domaćin: drug nije tu, igraš sam */
    solo: boolean;
    /** Gost: domaćin trenutno igra sam (ne vidi gosta) */
    friendAway?: boolean;
    duel: boolean;
    myScore: number;
    friendScore: number;
    /** „Zajedno”: zvezdice table do sada */
    stars: number;
}

export function SharedStrip({ me, friend, myTurn, onTurn, solo, friendAway = false, duel, myScore, friendScore, stars }: StripProps) {
    const calm = useCalmMotion();
    // Ko je na redu: veliki lik tog deteta i njegovo ime; drugo dete je malo i čeka
    const active = solo ? me : onTurn;
    const activeLook = active === friend ? LOOKS[1] : LOOKS[0];
    const waiting = active === friend ? me : friend;
    const waitingLook = active === friend ? LOOKS[0] : LOOKS[1];
    const status = solo ? `${friend.name} nije tu. Igraš dalje.` : friendAway ? `Čekamo da se ${friend.name} vrati…` : null;
    const headline = active ? (
        <span className="min-w-0 leading-tight">
            <span className="block text-sm font-bold text-ink-soft">Na redu je:</span>
            <span className={cn("block truncate font-display text-xl font-extrabold sm:text-2xl", activeLook.text)}>{active.name}</span>
        </span>
    ) : (
        <span className="text-sm font-bold text-ink-soft">Sprema se…</span>
    );
    const big = (className: string) =>
        active ? (
            <span key={active.name} className={cn("relative shrink-0 rounded-2xl", !calm && "animate-pop")}>
                <PlayerPicture player={active} look={activeLook} className={cn(className, active === friend && "-scale-x-100")} />
            </span>
        ) : (
            <span className={cn("shrink-0 rounded-2xl bg-white/60", className)} />
        );
    // Dvoboj: rezultat oba deteta, uvek istim redom (ja, pa drug); „Zajedno”: zvezdice table
    const score = duel ? (
        <span className="flex shrink-0 items-center gap-1.5">
            <ScoreSeat player={me} look={LOOKS[0]} score={myScore} />
            <ScoreSeat player={friend} look={LOOKS[1]} score={friendScore} flip dim={solo || friendAway} />
        </span>
    ) : (
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-sun-100 px-2.5 py-1 text-sm font-extrabold text-sun-700 ring-1 ring-sun-300" aria-label={`Zajedno ${stars} od 3 zvezdice`}>
            Zajedno: {stars} <span aria-hidden="true">⭐</span>
        </span>
    );
    const later = !duel && (
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-ink-soft">
            <PlayerPicture player={waiting} look={waitingLook} dim={solo || friendAway} className={cn("h-8 w-8 rounded-xl ring-2", waiting === friend && "-scale-x-100")} />
            <span className="max-w-16 truncate">{waiting.name}</span>
        </span>
    );
    const tone = solo || myTurn ? "border-brand-200 bg-brand-50" : "border-orange-200 bg-orange-50";

    return (
        <>
            {/* Tablet, računar, položen telefon: stub pored igre (isto mesto kao traka sa drugom) */}
            <div className={cn("hidden w-32 shrink-0 flex-col items-center gap-2 self-start rounded-2xl border-2 px-2 py-3 text-center md:flex landscape:flex lg:w-36 [@media(max-height:30rem)]:gap-1 [@media(max-height:30rem)]:py-1.5", tone)} role="status" aria-live="polite">
                {big("h-20 w-20 lg:h-24 lg:w-24 [@media(max-height:30rem)]:h-12 [@media(max-height:30rem)]:w-12")}
                {status ? <span className="text-sm font-bold leading-tight text-ink-soft">{status}</span> : headline}
                <span className="h-px w-full bg-line" aria-hidden="true" />
                {duel ? (
                    <span className="flex flex-col items-center gap-1.5">
                        <ScoreSeat player={me} look={LOOKS[0]} score={myScore} />
                        <ScoreSeat player={friend} look={LOOKS[1]} score={friendScore} flip dim={solo || friendAway} />
                    </span>
                ) : (
                    <>
                        {later}
                        {score}
                    </>
                )}
            </div>
            {/* Uspravan telefon: traka iznad igre */}
            <div className={cn("flex items-center gap-2 rounded-2xl border-2 px-2 py-1.5 sm:gap-3 sm:px-3 md:hidden landscape:hidden", tone)} role="status" aria-live="polite">
                {big("h-12 w-12 sm:h-14 sm:w-14")}
                <span className="min-w-0 flex-1">{status ? <span className="text-sm font-bold leading-tight text-ink-soft">{status}</span> : headline}</span>
                {duel ? score : <span className="flex shrink-0 flex-col items-end gap-1">{score}{later}</span>}
            </div>
        </>
    );
}

/** Dvoboj: malo lice deteta i njegove zvezdice */
function ScoreSeat({ player, look, score, flip = false, dim = false }: { player: TogetherPlayer; look: (typeof LOOKS)[number]; score: number; flip?: boolean; dim?: boolean }) {
    return (
        <span className="flex items-center gap-1">
            <PlayerPicture player={player} look={look} dim={dim} className={cn("h-8 w-8 rounded-xl ring-2", flip && "-scale-x-100")} />
            <ScorePill name={player.name} stars={score} className="px-2 py-0.5 text-sm" />
        </span>
    );
}

/** Kratka poruka kad dete dodirne tablu van svog reda (ili dok učitelj govori) */
function TurnNote({ at, name, listen = false }: { at: number; name: string; listen?: boolean }) {
    const [shownAt, setShownAt] = useState(0);
    useEffect(() => {
        if (!at) return;
        const show = setTimeout(() => setShownAt(at), 0);
        const hide = setTimeout(() => setShownAt(0), NOTE_MS);
        return () => {
            clearTimeout(show);
            clearTimeout(hide);
        };
    }, [at]);
    if (!shownAt) return null;
    return (
        <p key={shownAt} role="status" className="pointer-events-none absolute inset-x-0 top-2 z-30 mx-auto flex w-fit animate-fade-up items-center gap-2 rounded-full bg-ink/85 px-4 py-2 text-base font-extrabold text-white shadow-pop">
            <Hand className="h-5 w-5" aria-hidden="true" />
            {listen ? "Slušaj do kraja" : `Sada igra ${name}`}
        </p>
    );
}

// ── „Prst” drugog deteta ───────────────────────────────────────────────────────

interface GhostProps {
    rootRef: RefObject<HTMLElement | null>;
    tap: SharedTap | null;
    look: (typeof LOOKS)[number];
    /** Sopstveni dodir gosta: kraći i manji znak da je dodir poslat */
    quick?: boolean;
}

interface Spot {
    n: number;
    x: number;
    y: number;
    size: number;
}

function GhostTap({ rootRef, tap, look, quick = false }: GhostProps) {
    const calm = useCalmMotion();
    const [spot, setSpot] = useState<Spot | null>(null);
    const n = tap?.n ?? 0;
    const key = tap?.key ?? null;
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root || !key || !n) return;
        // Posle crtanja nove table (komad je možda prešao u mesto) traži se element sa ključem
        const frame = requestAnimationFrame(() => {
            const at = spotOf(root, key);
            if (!at) return;
            const box = root.getBoundingClientRect();
            setSpot({ n, x: at.x - box.left, y: at.y - box.top, size: quick ? Math.min(at.size, 72) : Math.max(at.size, 64) });
        });
        return () => cancelAnimationFrame(frame);
    }, [rootRef, key, n, quick]);
    if (!spot) return null;
    const ring = look === LOOKS[0] ? "border-brand-400 bg-brand-400/15" : "border-orange-400 bg-orange-400/20";
    return (
        <span
            key={spot.n}
            aria-hidden="true"
            className={cn("pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2", calm ? "animate-ghost-fade" : "animate-ghost-tap")}
            style={{ left: spot.x, top: spot.y, width: spot.size, height: spot.size, animationDuration: quick ? "0.9s" : undefined }}
        >
            <span className={cn("absolute inset-0 rounded-[30%] border-4", ring)} />
            {!quick && (
                <svg viewBox="0 0 24 24" className="absolute -bottom-3 -right-3 h-11 w-11 drop-shadow-md" fill="#ffffff" stroke={look === LOOKS[0] ? "#4f46e5" : "#ea580c"} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 14a8 8 0 0 1-8 8" />
                    <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                    <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
                    <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
                    <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                </svg>
            )}
        </span>
    );
}
