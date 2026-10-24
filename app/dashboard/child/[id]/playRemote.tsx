// app/dashboard/child/[id]/playRemote.tsx
"use client";

// „Igraj sa drugom na drugom uređaju”. Domaćin napravi poziv i pokaže drugu kod od četiri
// sličice; drug na SVOM uređaju, u SVOM profilu, izabere iste sličice („Uđi kod druga”).
// Zatim oboje igraju istu igru i isti nivo u isto vreme, svako na svom uređaju — rezultati
// idu svakom u njegov profil. Iznad igre je traka sa drugom: njegov drugar, ime, zadatak i
// zvezdice; kad drug tačno odgovori, njegov drugar kratko zatapše. Sve je zajedničko
// („Zajedno: 7 ⭐”, „Bravo, Lejla i Amar!”) — nikad poređenje ko je bolji.
//
// Mirno i predvidljivo: koraci su slike, vreme koda se detetu ne prikazuje (posle roka samo
// „Kod više ne važi, napravi novi”), „Manje animacija” gasi pokrete, a kad drug ode piše
// samo „Drug je otišao” i igra ide dalje.
//
// Igre se ne menjaju: stanje se čita iz poruka koje igra ionako šalje (GameEventTapProvider).
// Server (app/api/children/[id]/invite) daje kanal i ime i drugara druga; preko kanala
// (lib/inviteChannel.ts) idu samo brojevi.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Check, KeyRound, Play, RotateCcw, Smartphone, X } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import VisualPinPad from "@/app/components/VisualPinPad";
import { Button, Spinner } from "@/app/components/ui/Button";
import { CoinIcon } from "@/app/components/ui/CoinIcon";
import { COINS_PER_STAR } from "@/lib/companion";
import { cn } from "@/lib/cn";
import { MAX_LEVEL, getGame, type GameDefinition, type GameId } from "@/lib/games";
import {
    FRIEND_TIMEOUT_MS,
    HEARTBEAT_MS,
    isRemoteGame,
    liveStars,
    nextTogetherLevel,
    parseRemoteState,
    type RemotePhase,
    type RemoteState,
} from "@/lib/invite";
import { useInviteChannel, type InviteRole } from "@/lib/inviteChannel";
import { starsPhrase, togetherPraise, type TogetherPlayer } from "@/lib/playTogether";
import { GameEventTapProvider, useTogetherAnnounce } from "@/lib/realtime";
import type { GameUpdate } from "@/lib/types";
import { PIN_LENGTH, VISUAL_PIN_CATEGORIES } from "@/lib/visualPinData";
import { chosenSkin, useCompanion } from "./companionState";
import { LOOKS, PlayerPicture } from "./playTogether";

// ── Stanje ────────────────────────────────────────────────────────────────────

interface RemoteSession {
    role: InviteRole;
    channel: string;
    game: GameId;
    /** Nivo koji se sledeći igra zajedno */
    level: number;
    /** Drug (od servera); null dok domaćin čeka */
    friend: TogetherPlayer | null;
    /** Domaćin čeka: kod od sličica */
    code: string[] | null;
    /** Domaćin: kod je istekao pre nego što je drug ušao */
    expired: boolean;
}

interface ServerFriend {
    firstName: string;
    companion: { kind: string; skin: string | null; wear: Record<string, string> };
}

interface Progress {
    phase: RemotePhase;
    round: number;
    total: number;
    correct: number;
    stars: number;
}

const LOBBY: Progress = { phase: "lobby", round: 0, total: 0, correct: 0, stars: 0 };

interface RemoteValue {
    preview: boolean;
    session: RemoteSession | null;
    /** Gost: domaćin je završio igru sa drugom (ime domaćina) */
    endedBy: string | null;
    me: TogetherPlayer;
    friendState: RemoteState | null;
    /** Drug je povezan i javlja se */
    friendHere: boolean;
    /** Drug je bio tu, pa je otišao */
    friendGone: boolean;
    /** Kad je drug poslednji put tačno odgovorio (navijanje) */
    cheerAt: number;
    now: number;
    myState: RemoteState;
    /** „Zajedno: N ⭐” — zbir oba igrača */
    togetherStars: number;
    busy: boolean;
    create: (game: GameId, level: number) => Promise<string | null>;
    join: (code: string[]) => Promise<{ error: string | null; status: number }>;
    end: () => void;
    dismissEnded: () => void;
    report: (update: GameUpdate, game: GameId) => void;
    left: () => void;
    finish: (key: string, stars: number, advance: boolean) => void;
    finishedKey: (key: string) => boolean;
    setLevel: (level: number) => void;
    refresh: () => void;
}

const RemoteContext = createContext<RemoteValue | null>(null);

export function useRemote(): RemoteValue | null {
    return useContext(RemoteContext);
}

/** Da li je igra sa drugom na drugom uređaju u toku (ili domaćin čeka druga) */
export function useRemoteActive(): boolean {
    return Boolean(useRemote()?.session);
}

function toPlayer(friend: ServerFriend): TogetherPlayer {
    return { name: friend.firstName, kind: friend.companion.kind, skin: friend.companion.skin ?? undefined, wear: friend.companion.wear };
}

function isServerFriend(value: unknown): value is ServerFriend {
    if (!value || typeof value !== "object") return false;
    const friend = value as Record<string, unknown>;
    const companion = friend.companion as Record<string, unknown> | undefined;
    return typeof friend.firstName === "string" && Boolean(companion) && typeof companion?.kind === "string";
}

function guestKey(childId: number) {
    return `bm-remote-guest:${childId}`;
}

/** Gost posle osvežavanja stranice nastavlja istu igru sa drugom (samo u ovoj kartici). */
function readGuest(childId: number): RemoteSession | null {
    try {
        const raw = JSON.parse(window.sessionStorage.getItem(guestKey(childId)) ?? "null") as Record<string, unknown> | null;
        if (!raw || typeof raw.channel !== "string" || !/^bm-inv-[0-9a-f]{40}$/.test(raw.channel) || !isRemoteGame(raw.game)) return null;
        if (!isServerFriend(raw.friend) || typeof raw.level !== "number") return null;
        const level = Math.min(Math.max(Math.round(raw.level), 1), MAX_LEVEL);
        return { role: "guest", channel: raw.channel, game: raw.game, level, friend: toPlayer(raw.friend), code: null, expired: false };
    } catch {
        return null;
    }
}

function writeGuest(childId: number, session: RemoteSession | null) {
    try {
        if (!session || session.role !== "guest" || !session.friend) {
            window.sessionStorage.removeItem(guestKey(childId));
            return;
        }
        const friend: ServerFriend = { firstName: session.friend.name, companion: { kind: session.friend.kind, skin: session.friend.skin ?? null, wear: session.friend.wear ?? {} } };
        window.sessionStorage.setItem(guestKey(childId), JSON.stringify({ channel: session.channel, game: session.game, level: session.level, friend }));
    } catch {
        /* skladište nije dostupno: posle osvežavanja dete igra samo */
    }
}

/** Odgovor servera domaćinu → sesija (ili null kad poziva nema) */
function hostSession(invite: unknown, previous: RemoteSession | null): RemoteSession | null {
    if (!invite || typeof invite !== "object") return null;
    const data = invite as Record<string, unknown>;
    if (typeof data.channel !== "string" || !isRemoteGame(data.game) || typeof data.level !== "number") return null;
    const friend = isServerFriend(data.friend) ? toPlayer(data.friend) : null;
    const code = Array.isArray(data.code) && data.code.length === PIN_LENGTH ? (data.code as string[]) : null;
    const sameChannel = previous?.channel === data.channel;
    return {
        role: "host",
        channel: data.channel,
        game: data.game,
        // Domaćin koji je sa drugom već prešao na sledeći nivo ostaje na njemu
        level: sameChannel && previous ? previous.level : data.level,
        friend,
        code: friend ? null : code,
        expired: false,
    };
}

interface ProviderProps {
    childId: number;
    childName: string;
    gender?: string;
    preview?: boolean;
    children: ReactNode;
}

export function RemoteProvider({ childId, childName, gender, preview = false, children }: ProviderProps) {
    const companion = useCompanion();
    const me = useMemo<TogetherPlayer>(
        () => ({
            name: childName,
            kind: companion?.kind ?? (gender?.toLowerCase() === "female" ? "girl" : "boy"),
            skin: chosenSkin(companion),
            wear: companion?.wear as Record<string, string> | undefined,
            childId,
        }),
        [childName, companion, gender, childId]
    );
    const [session, setSession] = useState<RemoteSession | null>(null);
    const [endedBy, setEndedBy] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [friendState, setFriendState] = useState<RemoteState | null>(null);
    const [seenAt, setSeenAt] = useState(0);
    const [friendLeft, setFriendLeft] = useState(false);
    const [cheerAt, setCheerAt] = useState(0);
    const [now, setNow] = useState(0);

    // Moj napredak: tekući nivo + završeni zajednički nivoi
    const [progress, setProgress] = useState<Progress>(LOBBY);
    const [done, setDone] = useState(0);
    const [bank, setBank] = useState(0);
    const [lastAdvance, setLastAdvance] = useState(false);
    const finished = useRef(new Set<string>());

    const sessionRef = useRef(session);
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    const resetPlay = useCallback(() => {
        setProgress(LOBBY);
        setDone(0);
        setBank(0);
        setLastAdvance(false);
        finished.current = new Set();
        setFriendState(null);
        setSeenAt(0);
        setFriendLeft(false);
        setCheerAt(0);
    }, []);

    // ── Server ─────────────────────────────────────────────────────────────────

    const refresh = useCallback(() => {
        if (preview) return;
        const current = sessionRef.current;
        if (current && current.role !== "host") return;
        fetch(`/api/children/${childId}/invite`, { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!data) return;
                setSession((prev) => {
                    if (prev && prev.role !== "host") return prev;
                    const next = hostSession(data.invite, prev);
                    if (next) return next;
                    // Kod je istekao dok se čekalo: „Kod više ne važi, napravi novi”
                    if (prev && !prev.friend && data.expired) return { ...prev, code: null, expired: true };
                    if (prev?.expired) return prev;
                    return null;
                });
            })
            .catch(() => {
                /* mreža: pokušava se ponovo sledeći put */
            });
    }, [childId, preview]);

    // Na početku: domaćin nastavlja svoj poziv (sa servera), gost svoju igru (iz ove kartice)
    useEffect(() => {
        if (preview) return;
        const guest = readGuest(childId);
        if (guest) {
            queueMicrotask(() => setSession(guest));
            return;
        }
        refresh();
    }, [childId, preview, refresh]);

    useEffect(() => {
        writeGuest(childId, session);
    }, [childId, session]);

    const create = useCallback(
        async (game: GameId, level: number): Promise<string | null> => {
            setBusy(true);
            try {
                const res = await fetch(`/api/children/${childId}/invite`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ game, level }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) return typeof data?.error === "string" ? data.error : "Nešto nije u redu. Probaj ponovo.";
                const next = hostSession(data?.invite, null);
                if (!next) return "Nešto nije u redu. Probaj ponovo.";
                resetPlay();
                setEndedBy(null);
                setSession(next);
                return null;
            } catch {
                return "Nema interneta. Probaj ponovo.";
            } finally {
                setBusy(false);
            }
        },
        [childId, resetPlay]
    );

    const join = useCallback(
        async (code: string[]) => {
            setBusy(true);
            try {
                const res = await fetch(`/api/children/${childId}/invite/join`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) return { error: typeof data?.error === "string" ? data.error : "Nešto nije u redu. Probaj ponovo.", status: res.status };
                if (!data || typeof data.channel !== "string" || !isRemoteGame(data.game) || !isServerFriend(data.friend) || typeof data.level !== "number") {
                    return { error: "Nešto nije u redu. Probaj ponovo.", status: 500 };
                }
                resetPlay();
                setEndedBy(null);
                setSession({ role: "guest", channel: data.channel, game: data.game, level: data.level, friend: toPlayer(data.friend), code: null, expired: false });
                return { error: null, status: 200 };
            } catch {
                return { error: "Nema interneta. Probaj ponovo.", status: 0 };
            } finally {
                setBusy(false);
            }
        },
        [childId, resetPlay]
    );

    // ── Kanal ──────────────────────────────────────────────────────────────────

    const handlers = useMemo(
        () => ({
            onState: (payload: unknown) => {
                const state = parseRemoteState(payload);
                if (!state) return;
                const at = Date.now();
                setFriendState((prev) => {
                    // Drug je tačno odgovorio u nivou koji traje: njegov drugar kratko zatapše
                    if (prev && state.phase === "playing" && prev.phase === "playing" && state.correct > prev.correct) setCheerAt(at);
                    return state;
                });
                setSeenAt(at);
                setFriendLeft(false);
            },
            onEnd: () => {
                const current = sessionRef.current;
                if (!current) return;
                if (current.role === "guest") {
                    // Domaćin je završio: gost mirno nastavlja sam
                    setEndedBy(current.friend?.name ?? "Drug");
                    setSession(null);
                    resetPlay();
                } else {
                    setFriendLeft(true);
                }
            },
        }),
        [resetPlay]
    );
    const channel = useInviteChannel(preview ? null : (session?.channel ?? null), session?.role ?? "host", handlers);

    // Domaćin koji čeka: proverava na serveru da li je drug ušao (i odmah kad se drug javi na kanalu)
    const waiting = session?.role === "host" && !session.friend && !session.expired;
    useEffect(() => {
        if (!waiting) return;
        const timer = setInterval(refresh, 4000);
        return () => clearInterval(timer);
    }, [waiting, refresh]);
    useEffect(() => {
        if (waiting && (channel.present || seenAt > 0)) refresh();
    }, [waiting, channel.present, seenAt, refresh]);

    // Sat za „drug je otišao” i za navijanje (jednom u sekundi, samo dok traje igra sa drugom)
    const hasFriend = Boolean(session?.friend);
    useEffect(() => {
        if (!hasFriend) return;
        const tick = () => setNow(Date.now());
        const timer = setInterval(tick, 1000);
        queueMicrotask(tick);
        return () => clearInterval(timer);
    }, [hasFriend]);

    const myState = useMemo<RemoteState>(
        () => ({
            phase: progress.phase,
            done,
            round: progress.round,
            total: progress.total,
            stars: progress.stars,
            sessionStars: bank + (progress.phase === "playing" ? progress.stars : 0),
            correct: progress.correct,
            advance: lastAdvance,
        }),
        [progress, done, bank, lastAdvance]
    );

    // Svoje stanje drug dobija na svaku promenu i na svakih nekoliko sekundi („otkucaj srca”)
    const { sendState, sendEnd, ready } = channel;
    const myStateRef = useRef(myState);
    useEffect(() => {
        myStateRef.current = myState;
        if (session) sendState(myState);
    }, [myState, session, sendState, ready]);
    useEffect(() => {
        if (!session) return;
        const timer = setInterval(() => sendState(myStateRef.current), HEARTBEAT_MS);
        return () => clearInterval(timer);
    }, [session, sendState]);

    const recentlySeen = seenAt > 0 && now - seenAt < FRIEND_TIMEOUT_MS;
    const presenceSaysGone = channel.present === false && seenAt > 0;
    const friendHere = hasFriend && recentlySeen && !presenceSaysGone && !friendLeft;
    const friendGone = hasFriend && seenAt > 0 && !friendHere;

    // Roditelj koji prati uživo vidi „Igra sa drugom: Amar”
    useTogetherAnnounce(session?.friend?.name ?? null, !preview);

    const end = useCallback(() => {
        const current = sessionRef.current;
        if (!current) return;
        sendEnd();
        if (current.role === "host") {
            void fetch(`/api/children/${childId}/invite`, { method: "DELETE" }).catch(() => {});
        }
        setSession(null);
        resetPlay();
    }, [childId, sendEnd, resetPlay]);

    const report = useCallback((update: GameUpdate, gameId: GameId) => {
        if (update.event === "completed") return;
        const data = update.data ?? {};
        const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0);
        const total = num(data.totalRounds);
        const round = Math.min(num(data.round), total || num(data.round));
        const correct = num(data.correctCount);
        const stars = liveStars(getGame(gameId).graded, correct, round, total);
        setProgress((prev) => (prev.phase === "playing" && prev.round === round && prev.total === total && prev.correct === correct ? prev : { phase: "playing", round, total, correct, stars }));
    }, []);

    const left = useCallback(() => {
        setProgress((prev) => (prev.phase === "playing" ? LOBBY : prev));
    }, []);

    const finish = useCallback((key: string, stars: number, advance: boolean) => {
        if (finished.current.has(key)) return;
        finished.current.add(key);
        setDone((n) => n + 1);
        setBank((n) => n + stars);
        setLastAdvance(advance);
        setProgress((prev) => ({ ...prev, phase: "done", stars }));
    }, []);

    const finishedKey = useCallback((key: string) => finished.current.has(key), []);

    const setLevel = useCallback((level: number) => {
        setSession((prev) => (prev ? { ...prev, level } : prev));
    }, []);

    const value = useMemo<RemoteValue>(
        () => ({
            preview,
            session,
            endedBy,
            me,
            friendState,
            friendHere,
            friendGone,
            cheerAt,
            now,
            myState,
            togetherStars: myState.sessionStars + (friendState?.sessionStars ?? 0),
            busy,
            create,
            join,
            end,
            dismissEnded: () => setEndedBy(null),
            report,
            left,
            finish,
            finishedKey,
            setLevel,
            refresh,
        }),
        [preview, session, endedBy, me, friendState, friendHere, friendGone, cheerAt, now, myState, busy, create, join, end, report, left, finish, finishedKey, setLevel, refresh]
    );

    return <RemoteContext value={value}>{children}</RemoteContext>;
}

// ── Poziv: izbor igre (domaćin) i unos koda (gost) ──────────────────────────────

/** Dva dugmeta na vrhu prozora „Ko igra sa tobom?” */
export function RemoteChoices({ onHost, onGuest }: { onHost: () => void; onGuest: () => void }) {
    const remote = useRemote();
    if (!remote || remote.preview) return null;
    return (
        <section aria-label="Drug na drugom uređaju" className="space-y-2">
            <p className="text-sm font-extrabold uppercase tracking-wide text-ink-soft">Drug ima svoj uređaj</p>
            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={onHost}
                    className="flex min-h-20 items-center gap-3 rounded-tile border-2 border-b-[5px] border-brand-200 bg-brand-50 p-3 text-left transition-[transform,border-width] hover:border-brand-300 active:translate-y-[3px] active:border-b-2"
                >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white" aria-hidden="true">
                        <Smartphone className="h-7 w-7" />
                    </span>
                    <span className="font-display text-lg font-extrabold leading-tight text-ink">Pozovi druga sa drugog uređaja</span>
                </button>
                <button
                    type="button"
                    onClick={onGuest}
                    className="flex min-h-20 items-center gap-3 rounded-tile border-2 border-b-[5px] border-emerald-200 bg-emerald-50 p-3 text-left transition-[transform,border-width] hover:border-emerald-300 active:translate-y-[3px] active:border-b-2"
                >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white" aria-hidden="true">
                        <KeyRound className="h-7 w-7" />
                    </span>
                    <span className="font-display text-lg font-extrabold leading-tight text-ink">Uđi kod druga</span>
                </button>
            </div>
        </section>
    );
}

/** Domaćin bira igru; nivo je onaj do kog je domaćin stigao. */
export function RemoteHostPicker({ games, unlockedFor, onDone, onBack }: { games: GameDefinition[]; unlockedFor: (id: GameId) => number; onDone: () => void; onBack: () => void }) {
    const remote = useRemote();
    const [error, setError] = useState<string | null>(null);
    const [picked, setPicked] = useState<GameId | null>(null);
    if (!remote) return null;
    const shown = games.filter((g) => isRemoteGame(g.id));

    const pick = async (id: GameId) => {
        setPicked(id);
        setError(null);
        const level = Math.min(Math.max(unlockedFor(id), 1), MAX_LEVEL);
        const problem = await remote.create(id, level);
        setPicked(null);
        if (problem) setError(problem);
        else onDone();
    };

    return (
        <div className="space-y-4">
            <p className="text-base font-semibold text-ink-soft">Izaberi igru. Drug igra istu igru na svom uređaju.</p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {shown.map((game) => (
                    <li key={game.id}>
                        <button
                            type="button"
                            disabled={remote.busy}
                            onClick={() => void pick(game.id)}
                            className="flex w-full flex-col overflow-hidden rounded-tile border-2 border-b-[5px] border-line bg-surface text-left transition-[transform,border-width] hover:border-brand-300 active:translate-y-[3px] active:border-b-2 disabled:opacity-60"
                        >
                            <span className="relative block aspect-[16/10] w-full bg-brand-50">
                                <Image src={game.image} alt="" fill sizes="200px" className="object-cover" />
                                {picked === game.id && (
                                    <span className="absolute inset-0 grid place-items-center bg-white/60">
                                        <Spinner className="h-6 w-6" />
                                    </span>
                                )}
                            </span>
                            <span className="block p-2 font-display text-sm font-extrabold leading-tight text-ink sm:text-base">{game.title}</span>
                        </button>
                    </li>
                ))}
            </ul>
            {error && (
                <p className="rounded-xl bg-sun-50 px-4 py-3 text-base font-extrabold text-sun-700" role="alert">
                    {error}
                </p>
            )}
            <Button size="lg" variant="secondary" onClick={onBack}>
                Nazad
            </Button>
        </div>
    );
}

/** Gost unosi kod sa ekrana druga: četiri sličice, kao tajni kod za prijavu. */
export function RemoteGuestEntry({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
    const remote = useRemote();
    const [value, setValue] = useState<string[]>([]);
    const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");
    const [message, setMessage] = useState<string | null>(null);
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (resetTimer.current) clearTimeout(resetTimer.current);
    }, []);
    if (!remote) return null;

    const change = async (next: string[]) => {
        if (status === "checking") return;
        setMessage(null);
        setStatus("idle");
        setValue(next);
        if (next.length < PIN_LENGTH) return;
        setStatus("checking");
        const result = await remote.join(next);
        if (!result.error) {
            onDone();
            return;
        }
        setStatus("error");
        setMessage(result.status === 404 ? "Ovaj kod ne važi. Pogledaj ekran druga i probaj ponovo." : result.error);
        // Posle kratke pauze polja se prazne, da dete mirno krene iz početka
        resetTimer.current = setTimeout(() => {
            setValue([]);
            setStatus("idle");
        }, 1400);
    };

    return (
        <div className="space-y-4">
            <p className="text-base font-semibold text-ink-soft">Drug ti pokaže četiri sličice. Izaberi iste, redom.</p>
            <VisualPinPad value={value} onChange={(next) => void change(next)} status={status} label="Kod druga" />
            <p className="min-h-6 text-center text-base font-extrabold text-sun-700" role="status" aria-live="polite">
                {status === "checking" ? "Proveravam…" : message}
            </p>
            <Button size="lg" variant="secondary" onClick={onBack}>
                Nazad
            </Button>
        </div>
    );
}

// ── Predvorje: kod, čekanje, „Krenimo!” ───────────────────────────────────────────

function CodePictures({ code }: { code: string[] }) {
    return (
        <ol className="flex flex-wrap justify-center gap-2 sm:gap-4" aria-label="Kod za druga">
            {code.map((id, index) => {
                const item = VISUAL_PIN_CATEGORIES[index]?.items.find((i) => i.id === id);
                return (
                    <li key={index} className="flex flex-col items-center gap-1">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-base font-extrabold text-white" aria-hidden="true">
                            {index + 1}
                        </span>
                        <span className="relative block h-16 w-16 overflow-hidden rounded-2xl border-4 border-brand-500 bg-white shadow-soft min-[400px]:h-20 min-[400px]:w-20 sm:h-32 sm:w-32">
                            {item ? <Image src={item.image} alt={item.name} fill sizes="128px" className="object-cover" /> : null}
                        </span>
                        <span className="max-w-24 truncate text-sm font-extrabold text-ink sm:max-w-32 sm:text-base">{item?.name}</span>
                    </li>
                );
            })}
        </ol>
    );
}

function GameBadge({ game, level }: { game: GameDefinition; level: number }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface p-2 pr-4">
            <span className="relative block h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-50">
                <Image src={game.image} alt="" fill sizes="80px" className="object-cover" />
            </span>
            <span className="min-w-0">
                <span className="block truncate font-display text-lg font-extrabold leading-tight text-ink">{game.title}</span>
                <span className="block text-sm font-bold text-ink-soft">Nivo {level}</span>
            </span>
        </div>
    );
}

/** Mirne tačkice „čekamo” (bez pokreta uz „Manje animacija”) */
function WaitingDots() {
    const calm = useCalmMotion();
    return (
        <span className="inline-flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
                <span key={i} className={cn("h-2.5 w-2.5 rounded-full bg-brand-400", !calm && "animate-soft-pulse")} style={calm ? undefined : { animationDelay: `${i * 0.3}s` }} />
            ))}
        </span>
    );
}

/** Gost: domaćin je završio igru sa drugom (posle toga dete mirno igra samo). */
export function RemoteEndedNotice() {
    const remote = useRemote();
    if (!remote?.endedBy) return null;
    return (
        <div className="flex flex-wrap items-center gap-3 rounded-card border-2 border-sky-200 bg-sky-50 p-4" role="status">
            <p className="min-w-0 flex-1 text-lg font-extrabold text-sky-800">Igra sa drugom je gotova. {remote.endedBy} ti maše! Sada igraš dalje.</p>
            <Button variant="secondary" onClick={remote.dismissEnded}>
                <Check className="h-5 w-5" aria-hidden="true" />
                U redu
            </Button>
        </div>
    );
}

interface LobbyProps {
    pending?: boolean;
    unavailable?: boolean;
    onOpenLevel?: (id: GameId, level: number) => void;
}

export function RemoteLobby({ pending = false, unavailable = false, onOpenLevel }: LobbyProps) {
    const remote = useRemote();
    const [error, setError] = useState<string | null>(null);
    if (!remote?.session) return null;
    const { session, me } = remote;
    const game = getGame(session.game);

    // Domaćin: kod je istekao — mirno, bez vremena: „Kod više ne važi, napravi novi”
    if (session.role === "host" && session.expired) {
        return (
            <section aria-label="Igra sa drugom" className="space-y-4 rounded-card border-2 border-sun-200 bg-sun-50 p-5 text-center sm:p-8">
                <PlayerPicture player={me} look={LOOKS[0]} className="mx-auto h-24 w-24" />
                <p className="font-display text-2xl font-extrabold text-ink">Kod više ne važi. Napravi novi.</p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                    <Button
                        chunky
                        size="xl"
                        variant="success"
                        disabled={remote.busy}
                        onClick={async () => {
                            const problem = await remote.create(session.game, session.level);
                            setError(problem);
                        }}
                    >
                        <RotateCcw className="h-6 w-6" aria-hidden="true" />
                        Novi kod
                    </Button>
                    <Button size="xl" variant="secondary" onClick={remote.end}>
                        <X className="h-6 w-6" aria-hidden="true" />
                        Odustani
                    </Button>
                </div>
                {error && <p className="text-base font-extrabold text-sun-700">{error}</p>}
            </section>
        );
    }

    // Domaćin čeka: veliki kod i „Čekamo druga…” uz drugara
    if (session.role === "host" && !session.friend) {
        return (
            <section aria-label="Igra sa drugom" className="space-y-5 rounded-card border-2 border-brand-200 bg-brand-50/60 p-4 text-center sm:p-8">
                <h2 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">Pokaži drugu ove sličice</h2>
                {session.code && <CodePictures code={session.code} />}
                <div className="flex flex-col items-center gap-2">
                    <PlayerPicture player={me} look={LOOKS[0]} className="h-24 w-24 sm:h-28 sm:w-28" />
                    <p className="flex items-center gap-3 font-display text-xl font-extrabold text-brand-700" role="status">
                        Čekamo druga… <WaitingDots />
                    </p>
                    <p className="text-base font-semibold text-ink-soft">Drug na svom uređaju dodirne „Uđi kod druga”.</p>
                </div>
                <div className="flex justify-center">
                    <GameBadge game={game} level={session.level} />
                </div>
                <Button variant="secondary" size="lg" onClick={remote.end}>
                    <X className="h-5 w-5" aria-hidden="true" />
                    Odustani
                </Button>
            </section>
        );
    }

    const friend = session.friend!;
    const state = remote.friendState;
    const friendLine = remote.friendGone
        ? "Drug je otišao. Možeš da igraš dalje."
        : !remote.friendHere
          ? `Čekamo da se ${friend.name} poveže…`
          : state?.phase === "playing"
            ? `${friend.name} igra. Zadatak ${Math.max(1, state.round)} od ${state.total}.`
            : `${friend.name} je tu!`;

    return (
        <section aria-label="Igra sa drugom" className="space-y-4 rounded-card border-2 border-orange-200 bg-orange-50 p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex shrink-0 -space-x-3">
                    <PlayerPicture player={me} look={LOOKS[0]} className="h-20 w-20 sm:h-24 sm:w-24" />
                    <PlayerPicture player={friend} look={LOOKS[1]} dim={remote.friendGone} className="h-20 w-20 sm:h-24 sm:w-24" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
                        {session.role === "host" ? `${me.name} i ${friend.name}` : `${friend.name} i ${me.name}`}
                    </p>
                    <p className="text-base font-bold text-ink-soft" role="status" aria-live="polite">
                        {friendLine}
                    </p>
                </div>
                {remote.togetherStars > 0 && <TogetherPill stars={remote.togetherStars} />}
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <GameBadge game={game} level={session.level} />
                <p className="text-base font-semibold text-ink-soft">Svako igra na svom uređaju, u isto vreme.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
                <Button chunky size="xl" variant="success" className="sm:flex-1" disabled={pending || unavailable || !onOpenLevel} onClick={() => onOpenLevel?.(session.game, session.level)}>
                    <Play className="h-6 w-6" fill="currentColor" aria-hidden="true" />
                    Krenimo!
                </Button>
                <Button size="xl" variant="secondary" onClick={remote.end}>
                    <X className="h-6 w-6" aria-hidden="true" />
                    Završi igru sa drugom
                </Button>
            </div>
            <p className="rounded-xl bg-white/70 px-4 py-3 text-sm font-semibold normal-case text-ink-soft">
                <span className="font-extrabold text-ink">Za odrasle:</span> svako dete igra na svom uređaju i rezultati idu u njegov profil. Deca vide samo ime i
                drugara jedno drugog. Igra sa drugom traje dok je neko ne završi.
            </p>
        </section>
    );
}

function TogetherPill({ stars, className }: { stars: number; className?: string }) {
    return (
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-sun-100 px-3 py-1.5 text-base font-extrabold text-sun-700 ring-1 ring-sun-300", className)} aria-label={`Zajedno ${starsPhrase(stars)}`}>
            Zajedno: {stars} <span aria-hidden="true">⭐</span>
        </span>
    );
}

// ── U igri: traka sa drugom ─────────────────────────────────────────────────────

interface LayerProps {
    gameId: GameId;
    children: ReactNode;
}

/**
 * Omotač igre u igri sa drugom na drugom uređaju: traka sa drugom iznad igre, a stanje igre
 * (zadatak, tačni odgovori) ide drugu. Van takve igre samo prikazuje igru.
 */
export function RemoteFriendLayer({ gameId, children }: LayerProps) {
    const remote = useRemote();
    const active = Boolean(remote?.session?.friend) && remote?.session?.game === gameId;
    const report = remote?.report;
    const left = remote?.left;
    const onUpdate = useCallback((update: GameUpdate) => report?.(update, gameId), [report, gameId]);

    // Izlazak iz nivoa pre kraja: drug vidi da se dete vratilo u predvorje
    useEffect(() => {
        if (!active) return;
        return () => left?.();
    }, [active, left]);

    if (!active || !remote?.session?.friend) return <>{children}</>;
    return (
        <GameEventTapProvider value={onUpdate}>
            <div className="relative flex flex-1 flex-col gap-2 sm:gap-3">
                <FriendStrip />
                <div className="relative flex flex-1 flex-col">{children}</div>
            </div>
        </GameEventTapProvider>
    );
}

function StarRow({ stars, className }: { stars: number; className?: string }) {
    return (
        <span className={cn("inline-flex gap-0.5", className)} aria-label={`${stars} od 3 zvezdice`}>
            {[1, 2, 3].map((s) => (
                <span key={s} className={cn(s <= stars ? "" : "opacity-25 grayscale")} aria-hidden="true">
                    ⭐
                </span>
            ))}
        </span>
    );
}

function FriendStrip() {
    const remote = useRemote();
    const calm = useCalmMotion();
    if (!remote?.session?.friend) return null;
    const friend = remote.session.friend;
    const state = remote.friendState;
    const cheering = remote.cheerAt > 0 && remote.friendHere && (calm ? remote.now - remote.cheerAt < 3000 : true);

    let line: ReactNode;
    if (remote.friendGone) line = "Drug je otišao";
    else if (!remote.friendHere || !state) line = "Čekamo druga…";
    else if (state.phase === "playing") {
        line = (
            <>
                Zadatak {Math.max(1, state.round)} od {state.total}
                <StarRow stars={state.stars} className="ml-2 text-sm sm:text-base" />
            </>
        );
    } else if (state.phase === "done") line = "Nivo je gotov ✓";
    else line = "Sprema se…";

    return (
        <div className={cn("flex items-center gap-2 rounded-2xl border-2 px-2 py-1.5 sm:gap-3 sm:px-3", remote.friendGone ? "border-line bg-surface" : "border-orange-200 bg-orange-50")} role="status" aria-live="polite">
            <span className="relative shrink-0">
                <PlayerPicture player={friend} look={LOOKS[1]} dim={remote.friendGone} className="h-12 w-12 sm:h-14 sm:w-14" />
                {cheering && (
                    <span
                        key={remote.cheerAt}
                        className={cn("absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-white text-lg shadow-soft ring-2 ring-orange-300", !calm && "animate-cheer")}
                        aria-hidden="true"
                    >
                        👏
                    </span>
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base font-extrabold leading-tight text-ink sm:text-lg">{friend.name}</span>
                <span className={cn("flex items-center text-sm font-bold sm:text-base", remote.friendGone ? "text-ink-soft" : "text-orange-700")}>{line}</span>
            </span>
            <TogetherPill stars={remote.togetherStars} className="text-sm sm:text-base" />
        </div>
    );
}

// ── Kraj nivoa: zajednička pohvala ───────────────────────────────────────────────

/** Da li se kraj nivoa prikazuje kao kraj igre sa drugom na drugom uređaju */
export function useRemoteEnd(gameId: GameId | null | undefined): boolean {
    const remote = useRemote();
    return Boolean(remote?.session?.friend) && remote?.session?.game === gameId;
}

interface EndProps {
    playKey: string;
    stars: number;
    level: number;
    advance: boolean;
    limitReached: boolean;
    saved: "saving" | "ok" | "failed";
    onPlay: (level: number) => void;
    onLeave: () => void;
}

export function RemoteTogetherEnd({ playKey, stars, level, advance, limitReached, saved, onPlay, onLeave }: EndProps) {
    const remote = useRemote();
    const finish = remote?.finish;
    useEffect(() => {
        finish?.(playKey, stars, advance);
    }, [finish, playKey, stars, advance]);

    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        panelRef.current?.focus();
    }, []);

    if (!remote?.session?.friend) return null;
    const { session, me } = remote;
    const friend = session.friend!;
    const counted = remote.finishedKey(playKey);
    const myDone = remote.myState.done + (counted ? 0 : 1);
    const mySession = remote.myState.sessionStars + (counted ? 0 : stars);
    const state = remote.friendState;
    const friendDone = Boolean(state && state.done >= myDone);
    const bothDone = friendDone && !remote.friendGone;
    const waiting = remote.friendHere && !friendDone && state?.phase === "playing";
    const total = mySession + (state?.sessionStars ?? 0);
    const names: [string, string] = session.role === "host" ? [me.name, friend.name] : [friend.name, me.name];
    const praise = togetherPraise(names, total);
    const nextLevel = nextTogetherLevel(level, advance, bothDone ? (state?.advance ?? false) : null);
    const play = () => {
        remote.setLevel(nextLevel);
        onPlay(nextLevel);
    };
    const players = [me, friend];

    return (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="alertdialog" aria-modal="true" aria-label={bothDone ? praise.title : "Nivo je gotov"}>
            <div ref={panelRef} tabIndex={-1} className="max-h-full w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-[2rem] bg-surface p-6 text-center shadow-pop outline-none sm:rounded-[2rem] sm:p-9">
                <div className="flex items-end justify-center gap-4 sm:gap-8">
                    {players.map((player, index) => (
                        <div key={index} className="flex min-w-0 flex-col items-center gap-2">
                            <PlayerPicture player={player} look={LOOKS[index]} dim={index === 1 && remote.friendGone} className="h-24 w-24 sm:h-32 sm:w-32" />
                            <span className={cn("max-w-32 truncate font-display text-lg font-extrabold", LOOKS[index].text)}>{player.name}</span>
                            {index === 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sun-100 px-3 py-1 text-base font-extrabold text-sun-700 ring-1 ring-sun-300">
                                    + {stars * COINS_PER_STAR} <CoinIcon className="h-5 w-5" />
                                    <span className="sr-only">novčića</span>
                                </span>
                            ) : bothDone ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-base font-extrabold text-orange-700 ring-1 ring-orange-300">
                                    <span aria-hidden="true">👏</span> Bravo!
                                </span>
                            ) : (
                                <span className="inline-flex min-h-8 items-center rounded-full bg-canvas px-3 py-1 text-sm font-extrabold text-ink-soft">
                                    {remote.friendGone ? "Nije tu" : waiting ? `Zadatak ${Math.max(1, state?.round ?? 1)} od ${state?.total ?? 0}` : "…"}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex justify-center gap-2" aria-label={`${stars} od 3 zvezdice`}>
                    {[1, 2, 3].map((s) => (
                        <span key={s} className={cn("text-5xl", s <= stars ? "animate-pop" : "opacity-20 grayscale")} aria-hidden="true">
                            ⭐
                        </span>
                    ))}
                </div>

                {bothDone ? (
                    <>
                        <h2 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{praise.title}</h2>
                        <p className="mt-1 text-lg font-extrabold text-sun-700 sm:text-xl">{praise.text}</p>
                    </>
                ) : (
                    <>
                        <h2 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">Nivo je gotov!</h2>
                        <p className="mt-1 text-lg font-bold text-ink-soft" role="status" aria-live="polite">
                            {remote.friendGone ? "Drug je otišao. Možeš da igraš dalje." : `Čekamo da ${friend.name} završi…`}
                        </p>
                        {!remote.friendGone && (
                            <p className="mt-2 flex justify-center">
                                <TogetherPill stars={total} />
                            </p>
                        )}
                    </>
                )}
                {limitReached && <p className="mt-2 text-base font-semibold text-ink-soft">Za danas smo završili. Vidimo se sledeći put.</p>}

                <div className="mt-6 flex flex-col gap-3">
                    {!limitReached && !waiting && (
                        <Button chunky size="xl" variant={nextLevel > level ? "success" : "sun"} block onClick={play}>
                            {nextLevel > level ? (
                                <>
                                    Još jedan nivo zajedno
                                    <ArrowRight className="h-6 w-6" aria-hidden="true" />
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="h-6 w-6" aria-hidden="true" />
                                    {remote.friendGone ? "Igraj još jednom" : "Igrajte još jednom"}
                                </>
                            )}
                        </Button>
                    )}
                    <Button chunky size="xl" variant="secondary" block onClick={onLeave}>
                        <Check className="h-6 w-6" aria-hidden="true" />
                        {limitReached ? "Gotovo za danas" : "Gotovo"}
                    </Button>
                </div>
                <p className="mt-4 border-t border-line pt-3 text-sm font-semibold normal-case text-ink-faint">
                    <span className="font-extrabold text-ink-soft">Za odrasle:</span> svako dete dobija novčiće i nivo u svom profilu.
                </p>
                <p className="mt-1 min-h-5 text-xs font-bold normal-case text-ink-faint" aria-live="polite">
                    {saved === "failed" && "Nema interneta. Rezultat nije sačuvan."}
                </p>
            </div>
        </div>
    );
}
