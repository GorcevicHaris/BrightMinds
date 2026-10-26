// app/dashboard/child/[id]/playTogether.tsx
"use client";

// „Igraj sa drugom” (isti uređaj, na smenu). Dete bira druga — dete sa istog roditeljskog
// naloga ili drug čije ime upiše odrasli — i oboje igraju isti nivo: jedan zadatak jedno,
// sledeći drugo. Svako ima svoju boju i svog drugara; iznad igre (na tabletu, računaru i
// telefonu na boku u stubu pored nje) uvek piše čiji je red („Sada igra Amar”), a ko čeka
// vidi karticu „Sačekaj svoj red”. Na kraju pohvala oboma,
// bez poređenja: „Zajedno ste skupili 12 zvezdica!”. Novčiće i nivoe dobija samo prijavljeno
// dete; drug dobija pohvalu. Ime druga upisanog na uređaju ostaje samo na ovom uređaju.
//
// Igre se ne menjaju: red se čita iz stanja koje igra ionako šalje posle svakog poteza
// (GameEventTapProvider u lib/realtime.ts → turnIndexFor u lib/playTogether.ts).
//
// „Takmičenje” (izbor pre igre; „Zajedno” je podrazumevano — playVersus.tsx, lib/versus.ts):
// smena je ista (jedan zadatak jedno, sledeći drugo, „Na redu je: Lejla”), ali svako skuplja
// svoje zvezdice — tačan odgovor u svom redu je jedna zvezdica. Kako se dvoboj igra bira igra
// (lib/versusFormat.ts) i to piše na kartici igre i ekranu „VS”: „ko je brži” — zadatak po
// zadatak iz istog nivoa (isti zadatak redom za oba bi dao prednost detetu koje je gledalo
// odgovor), a isti broj tačnih razrešava vreme koje je svako proveo u svom redu; „jedan po
// jedan” — potez po potez na istoj tabli. Pre igre kratak ekran „VS”, a na kraju oba drugara,
// ime pobednika i pohvala za trud. Kad je drug brat ili sestra sa istog roditeljskog naloga,
// poražen daje pobedniku mali ulog (lib/duelStakes.ts; sesiju odobrava nalog roditelja,
// app/api/children/[id]/duel); sa drugom bez naloga nema uloga — samo ime pobednika.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, Check, Hand, RotateCcw, UserPlus, Users, X } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import CompanionPicture from "@/app/components/avatar3d/CompanionPicture";
import type { Wear } from "@/app/components/avatar3d/data";
import { Button } from "@/app/components/ui/Button";
import { CoinIcon } from "@/app/components/ui/CoinIcon";
import { Modal } from "@/app/components/ui/Modal";
import { COINS_PER_STAR } from "@/lib/companion";
import { cn } from "@/lib/cn";
import { LEVELS_PER_TIER, MAX_LEVEL, getGame, type GameDefinition, type GameId } from "@/lib/games";
import {
    FRIEND_KINDS,
    cleanFriendName,
    isTogetherGame,
    parseSavedFriends,
    rememberFriend,
    togetherPraise,
    turnIndexFor,
    type TogetherPlayer,
} from "@/lib/playTogether";
import { GameEventTapProvider } from "@/lib/realtime";
import type { GameUpdate } from "@/lib/types";
import { genderOf, type Gender, type PlayMode } from "@/lib/versus";
import { versusFormat, type VersusFormat } from "@/lib/versusFormat";
import { chosenSkin, useCompanion } from "./companionState";
// Takmičenje (playVersus.tsx): izbor načina igre, ekran „VS”, zvezdice i kraj sa pobednikom
import { FormatChip, ModeChoice, ScorePill, StakeChip, VersusEnd, VsIntro, type DuelCoins } from "./playVersus";
// Drug na drugom uređaju (playRemote.tsx): pozivanje i ulazak kod druga kreću iz istog prozora
import { RemoteChoices, RemoteGuestEntry, RemoteHostPicker, useRemoteActive } from "./playRemote";

// ── Boje igrača ───────────────────────────────────────────────────────────────

/** Svaki igrač ima svoju boju (i oblik znaka), da se red vidi i bez čitanja */
export const LOOKS = [
    { solid: "bg-brand-600", soft: "bg-brand-50", ring: "ring-brand-400", text: "text-brand-700", border: "border-brand-500", mark: "★" },
    { solid: "bg-orange-500", soft: "bg-orange-50", ring: "ring-orange-400", text: "text-orange-700", border: "border-orange-400", mark: "●" },
] as const;

// ── Stanje zajedničke igre ──────────────────────────────────────────────────────

interface TogetherValue {
    childId: number;
    preview: boolean;
    host: TogetherPlayer;
    friend: TogetherPlayer | null;
    choose: (friend: TogetherPlayer) => void;
    stop: () => void;
    /** Zbir zvezdica svih zajedno odigranih nivoa */
    totalStars: number;
    /** Broj zajedno odigranih nivoa (red na sledećem nivou počinje onaj ko je čekao) */
    levels: number;
    /** Zvezdice po partiji (ključ: igra–nivo–pokušaj) */
    scores: Record<string, number>;
    /** Beleži zvezdice nivoa (jednom po partiji) */
    addLevel: (key: string, stars: number) => void;
    /** Pol prijavljenog deteta (samo za gramatiku pohvale) */
    gender: Gender;
    /** „Zajedno” (podrazumevano) ili „Takmičenje” */
    mode: PlayMode;
    setMode: (mode: PlayMode) => void;
    /** Takmičenje u partiji koja traje: zvezdice svakog igrača i čiji je red */
    versus: VersusTally;
    versusReset: (turn: number) => void;
    versusPoint: (player: number, points: number) => void;
    versusTurn: (player: number) => void;
    /** Vreme u redu (ms) igraču koji je upravo završio svoj red (razrešava isti rezultat u trci) */
    versusTime: (player: number, ms: number) => void;
    /** Dvoboj sa bratom ili sestrom: sesija sa servera (ulog); null = drug bez naloga ili još nema */
    duel: LocalDuelSession | null;
    /** Redni broj partije dvoboja u sesiji (po ključu partije; isti pri ponovnom crtanju) */
    duelRound: (key: string) => number;
}

interface VersusTally {
    /** [prijavljeno dete, drug] */
    scores: [number, number];
    /** Ko je sada na redu (0 = prijavljeno dete) */
    turn: number;
    /** Vreme koje je svako proveo u svom redu (ms) */
    ms: [number, number];
}

/** Sesija dvoboja na istom uređaju (app/api/children/[id]/duel) */
interface LocalDuelSession {
    session: string;
    stake: number;
}

const EMPTY_TALLY: VersusTally = { scores: [0, 0], turn: 0, ms: [0, 0] };

const TogetherContext = createContext<TogetherValue | null>(null);

/** Stanje igre sa drugom; van provajdera null (igra radi kao i do sada) */
export function useTogether(): TogetherValue | null {
    return useContext(TogetherContext);
}

interface ProviderProps {
    childId: number;
    childName: string;
    gender?: string;
    preview?: boolean;
    children: ReactNode;
}

export function TogetherProvider({ childId, childName, gender, preview = false, children }: ProviderProps) {
    const companion = useCompanion();
    const [friend, setFriend] = useState<TogetherPlayer | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [mode, setMode] = useState<PlayMode>("together");
    const [versus, setVersus] = useState<VersusTally>(EMPTY_TALLY);

    const host = useMemo<TogetherPlayer>(
        () => ({
            name: childName,
            kind: companion?.kind ?? (gender?.toLowerCase() === "female" ? "girl" : "boy"),
            skin: chosenSkin(companion),
            wear: companion?.wear as Record<string, string> | undefined,
            childId,
        }),
        [childName, companion, gender, childId]
    );

    const [duel, setDuel] = useState<LocalDuelSession | null>(null);
    const duelRounds = useRef(new Map<string, number>());
    const choose = useCallback((next: TogetherPlayer) => {
        setFriend(next);
        setScores({});
        setDuel(null);
        duelRounds.current = new Map();
        // Svaka nova igra sa drugom počinje zajedno; takmičenje se bira posebno
        setMode("together");
    }, []);
    const stop = useCallback(() => {
        setFriend(null);
        setScores({});
        setDuel(null);
        duelRounds.current = new Map();
        setMode("together");
    }, []);

    // Takmičenje sa bratom ili sestrom (dete sa istog naloga): server otvara sesiju dvoboja i
    // kaže ulog. Sa drugom upisanim na uređaju nema sesije — dvoboj je samo za ime pobednika.
    const siblingId = friend?.childId !== undefined && friend.childId > 0 ? friend.childId : null;
    useEffect(() => {
        if (preview || mode !== "versus" || siblingId === null) return;
        const controller = new AbortController();
        fetch(`/api/children/${childId}/duel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ friend: siblingId }),
            signal: controller.signal,
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data && typeof data.session === "string") {
                    setDuel({ session: data.session, stake: typeof data.stake === "number" ? Math.max(0, Math.round(data.stake)) : 0 });
                }
            })
            .catch(() => {
                /* mreža: dvoboj bez uloga */
            });
        return () => controller.abort();
    }, [preview, mode, siblingId, childId]);
    const duelRound = useCallback((key: string) => {
        const known = duelRounds.current.get(key);
        if (known !== undefined) return known;
        const next = duelRounds.current.size;
        duelRounds.current.set(key, next);
        return next;
    }, []);
    const addLevel = useCallback((key: string, stars: number) => {
        setScores((prev) => (key in prev ? prev : { ...prev, [key]: stars }));
    }, []);
    const versusReset = useCallback((turn: number) => setVersus({ scores: [0, 0], turn, ms: [0, 0] }), []);
    const versusTime = useCallback((player: number, ms: number) => {
        if (ms <= 0 || (player !== 0 && player !== 1)) return;
        setVersus((prev) => {
            const next: [number, number] = [...prev.ms];
            next[player] += ms;
            return { ...prev, ms: next };
        });
    }, []);
    const versusPoint = useCallback((player: number, points: number) => {
        if (points <= 0 || (player !== 0 && player !== 1)) return;
        setVersus((prev) => {
            const next: [number, number] = [...prev.scores];
            next[player] += points;
            return { ...prev, scores: next };
        });
    }, []);
    const versusTurn = useCallback((player: number) => setVersus((prev) => (prev.turn === player ? prev : { ...prev, turn: player })), []);
    const childGender = genderOf(gender);

    const value = useMemo<TogetherValue>(() => {
        const list = Object.values(scores);
        return {
            childId,
            preview,
            host,
            friend,
            choose,
            stop,
            totalStars: list.reduce((a, b) => a + b, 0),
            levels: list.length,
            scores,
            addLevel,
            gender: childGender,
            mode,
            setMode,
            versus,
            versusReset,
            versusPoint,
            versusTurn,
            versusTime,
            duel: mode === "versus" ? duel : null,
            duelRound,
        };
    }, [childId, preview, host, friend, choose, stop, scores, addLevel, childGender, mode, versus, versusReset, versusPoint, versusTurn, versusTime, duel, duelRound]);

    return <TogetherContext value={value}>{children}</TogetherContext>;
}

// ── Portret igrača ────────────────────────────────────────────────────────────

interface PlayerPictureProps {
    player: TogetherPlayer;
    look: (typeof LOOKS)[number];
    className?: string;
    dim?: boolean;
    onReady?: () => void;
    /** Ovde sleću zvezdice za tačan odgovor (igrač koji je na redu) */
    hype?: boolean;
}

export function PlayerPicture({ player, look, className, dim = false, onReady, hype = false }: PlayerPictureProps) {
    return (
        <span data-hype-target={hype ? "" : undefined} className={cn("relative block shrink-0 overflow-hidden rounded-2xl ring-4", look.soft, look.ring, dim && "opacity-60 grayscale", className)}>
            <CompanionPicture kind={player.kind} skin={player.skin} wear={player.wear as Wear | undefined} variant="bust" eager onReady={onReady} className="h-full w-full" />
        </span>
    );
}

// ── Početak: „Igraj sa drugom” ─────────────────────────────────────────────────

interface StartProps {
    /** Igre koje dete vidi i dokle je stiglo — za izbor igre kad poziva druga sa drugog uređaja */
    games?: GameDefinition[];
    unlockedFor?: (id: GameId) => number;
}

export function TogetherStartButton({ games = [], unlockedFor = () => 1 }: StartProps) {
    const together = useTogether();
    const remoteActive = useRemoteActive();
    const [open, setOpen] = useState(false);
    if (!together || together.friend || remoteActive) return null;
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex min-h-13 items-center gap-2 rounded-2xl border-2 border-b-[5px] border-orange-600 bg-orange-500 px-5 text-base font-extrabold text-white shadow-soft transition-[transform,border-width] hover:bg-orange-600 active:translate-y-[3px] active:border-b-2"
            >
                <Users className="h-6 w-6" aria-hidden="true" />
                Igraj sa drugom
            </button>
            <FriendPicker open={open} onClose={() => setOpen(false)} games={games} unlockedFor={unlockedFor} />
        </>
    );
}

interface ServerFriend {
    id: number;
    firstName: string;
    companion: { kind: string; skin: string | null; wear: Record<string, string> };
}

function savedKey(childId: number) {
    return `bm-together-friends:${childId}`;
}

function readSaved(childId: number): TogetherPlayer[] {
    try {
        return parseSavedFriends(window.localStorage.getItem(savedKey(childId)));
    } catch {
        return [];
    }
}

function writeSaved(childId: number, list: TogetherPlayer[]) {
    try {
        window.localStorage.setItem(savedKey(childId), JSON.stringify(list));
    } catch {
        /* skladište nije dostupno: drug važi samo za ovu igru */
    }
}

type PickerMode = "list" | "adding" | "remote-host" | "remote-guest" | "remote-card";

const PICKER_TITLES: Record<PickerMode, string> = {
    list: "Ko igra sa tobom?",
    adding: "Ko igra sa tobom?",
    "remote-host": "Pozovi druga",
    "remote-guest": "Uđi kod druga",
    "remote-card": "Poziv za igru",
};

function FriendPicker({ open, onClose, games, unlockedFor }: { open: boolean; onClose: () => void; games: GameDefinition[]; unlockedFor: (id: GameId) => number }) {
    const together = useTogether();
    const childId = together?.childId ?? 0;
    const preview = together?.preview ?? false;
    const [siblings, setSiblings] = useState<TogetherPlayer[] | null>(null);
    const [saved, setSaved] = useState<TogetherPlayer[]>([]);
    const [mode, setMode] = useState<PickerMode>("list");
    const adding = mode === "adding";
    const setAdding = (value: boolean) => setMode(value ? "adding" : "list");
    const [name, setName] = useState("");
    const [kind, setKind] = useState<string>(FRIEND_KINDS[0]);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        queueMicrotask(() => {
            if (controller.signal.aborted) return;
            setSaved(readSaved(childId));
            setMode("list");
            setName("");
        });
        if (preview) {
            // Probni prikaz: izmišljen brat ili sestra sa istog naloga
            queueMicrotask(() => !controller.signal.aborted && setSiblings([{ name: "Amar", kind: "dog", childId: -1 }]));
            return () => controller.abort();
        }
        fetch(`/api/children/${childId}/friends`, { cache: "no-store", signal: controller.signal })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                const list = Array.isArray(data?.friends) ? (data.friends as ServerFriend[]) : [];
                setSiblings(list.map((f) => ({ name: f.firstName, kind: f.companion.kind, skin: f.companion.skin ?? undefined, wear: f.companion.wear, childId: f.id })));
            })
            .catch(() => {
                if (!controller.signal.aborted) setSiblings([]);
            });
        return () => controller.abort();
    }, [open, childId, preview]);

    if (!together) return null;
    const cleaned = cleanFriendName(name);

    const pick = (friend: TogetherPlayer) => {
        if (friend.childId === undefined) {
            const next = rememberFriend(saved, friend);
            writeSaved(childId, next);
        }
        together.choose(friend);
        onClose();
    };

    const people = [...(siblings ?? []), ...saved];

    return (
        <Modal open={open} onClose={onClose} title={PICKER_TITLES[mode]} size="md">
            {mode === "remote-host" ? (
                <RemoteHostPicker games={games} unlockedFor={unlockedFor} onDone={onClose} onBack={() => setMode("list")} />
            ) : mode === "remote-guest" || mode === "remote-card" ? (
                <RemoteGuestEntry onDone={onClose} onBack={() => setMode("list")} onCard={() => setMode("remote-card")} />
            ) : !adding ? (
                <div className="space-y-5">
                    <RemoteChoices onHost={() => setMode("remote-host")} onGuest={() => setMode("remote-guest")} />
                    {!preview && (
                        // Jasno odvojeno od poziva na drugi uređaj: drug sa ovog spiska igra OVDE, na smenu
                        <p className="flex items-center gap-1.5 border-t border-line pt-4 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
                            <Users className="h-4 w-4" aria-hidden="true" />
                            Na ovom uređaju, na smenu
                        </p>
                    )}
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {people.map((friend) => (
                            <li key={`${friend.childId ?? "d"}-${friend.name}`}>
                                <button
                                    type="button"
                                    onClick={() => pick(friend)}
                                    className="flex w-full flex-col items-center gap-2 rounded-tile border-2 border-b-[5px] border-orange-200 bg-orange-50 p-3 text-center transition-[transform,border-width] hover:border-orange-300 active:translate-y-[3px] active:border-b-2"
                                >
                                    <PlayerPicture player={friend} look={LOOKS[1]} className="h-24 w-24" />
                                    <span className="w-full truncate font-display text-lg font-extrabold text-ink">{friend.name}</span>
                                </button>
                            </li>
                        ))}
                        <li>
                            <button
                                type="button"
                                onClick={() => setAdding(true)}
                                className="flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-tile border-2 border-dashed border-line bg-surface p-3 text-center text-ink-soft transition-colors hover:border-brand-300 hover:text-ink"
                            >
                                <UserPlus className="h-10 w-10" aria-hidden="true" />
                                <span className="font-display text-lg font-extrabold">Novi drug</span>
                            </button>
                        </li>
                    </ul>
                    {siblings === null && <p className="text-sm font-bold text-ink-faint" role="status">Tražim drugove…</p>}
                    <p className="rounded-xl bg-canvas px-4 py-3 text-sm font-semibold normal-case text-ink-soft">
                        <span className="font-extrabold text-ink">Za odrasle:</span> igrate na smenu na ovom uređaju — jedan zadatak {together.host.name}, jedan drug.
                        Novčiće i nivoe dobija {together.host.name}, a drug pohvalu.
                    </p>
                </div>
            ) : (
                <form
                    className="space-y-5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (cleaned) pick({ name: cleaned, kind });
                    }}
                >
                    <label className="block">
                        <span className="block text-base font-extrabold text-ink">Ime druga</span>
                        <span className="block text-sm font-semibold normal-case text-ink-soft">Upisuje odrasli. Samo ime; ostaje samo na ovom uređaju.</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={16}
                            autoComplete="off"
                            autoFocus
                            className="mt-2 block min-h-13 w-full rounded-xl border-2 border-line bg-surface px-4 text-lg font-bold text-ink outline-none focus:border-brand-400"
                            placeholder="npr. Amar"
                        />
                    </label>
                    <fieldset>
                        <legend className="text-base font-extrabold text-ink">Drugar za druga</legend>
                        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {FRIEND_KINDS.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    aria-pressed={kind === option}
                                    aria-label={KIND_NAMES[option] ?? option}
                                    onClick={() => setKind(option)}
                                    className={cn(
                                        "rounded-2xl border-2 p-1 transition-colors",
                                        kind === option ? "border-orange-500 bg-orange-50" : "border-line bg-surface hover:border-orange-200"
                                    )}
                                >
                                    <CompanionPicture kind={option} variant="face" eager className="aspect-square w-full" />
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    <div className="flex flex-col gap-3 sm:flex-row-reverse">
                        <Button type="submit" chunky size="lg" variant="success" disabled={!cleaned} className="sm:flex-1">
                            Igrajmo zajedno
                            <ArrowRight className="h-5 w-5" aria-hidden="true" />
                        </Button>
                        <Button type="button" size="lg" variant="secondary" onClick={() => setAdding(false)}>
                            Nazad
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}

const KIND_NAMES: Record<string, string> = { dog: "Kuca", cat: "Maca", bunny: "Zeka", bear: "Meda", fox: "Lisica", panda: "Panda" };

// ── Izbor igre za dvoje ────────────────────────────────────────────────────────

interface TogetherGamePickerProps {
    games: GameDefinition[];
    unlockedFor: (id: GameId) => number;
    pending?: boolean;
    unavailable?: boolean;
    onOpen: (id: GameId) => void;
}

export function TogetherGamePicker({ games, unlockedFor, pending = false, unavailable = false, onOpen }: TogetherGamePickerProps) {
    const together = useTogether();
    if (!together?.friend) return null;
    const { host, friend } = together;
    const versus = together.mode === "versus";
    // Samo igre u kojima smena ima smisla (i koje su inače ponuđene), istim redom kao na
    // početnom ekranu deteta — poznat raspored, bez traženja
    const shown = games.filter((game) => isTogetherGame(game.id));

    return (
        <section aria-label="Igra sa drugom" className="space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-card border-2 border-orange-200 bg-orange-50 p-3 sm:gap-4 sm:p-4">
                <div className="flex shrink-0 -space-x-3">
                    <PlayerPicture player={host} look={LOOKS[0]} className="h-16 w-16 sm:h-20 sm:w-20" />
                    <PlayerPicture player={friend} look={LOOKS[1]} className="h-16 w-16 sm:h-20 sm:w-20" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-extrabold leading-tight text-ink sm:text-2xl">
                        {host.name} {versus ? "VS" : "i"} {friend.name}
                    </p>
                    <p className="text-base font-semibold text-ink-soft">{versus ? "Igrate na smenu. Svako skuplja svoje zvezdice." : "Igrate na smenu. Izaberite igru."}</p>
                    {versus && together.duel && <StakeChip stake={together.duel.stake} className="mt-1" />}
                </div>
                <Button variant="secondary" onClick={together.stop}>
                    <X className="h-5 w-5" aria-hidden="true" />
                    Kraj igre sa drugom
                </Button>
            </div>

            {/* Zajedno ili takmičenje: bira dete ili odrasli, „Zajedno” je podrazumevano */}
            <ModeChoice mode={together.mode} onChange={together.setMode} />

            {/* Kartica „Sačekaj svoj red”: deca je upoznaju pre igre, pa je u igri prepoznaju */}
            <WaitCard />

            <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
                {shown.map((game) => {
                    const done = Math.min(Math.max(unlockedFor(game.id) - 1, 0), MAX_LEVEL);
                    return (
                        <li key={game.id}>
                            <button
                                type="button"
                                onClick={() => onOpen(game.id)}
                                disabled={pending || unavailable}
                                className="group flex w-full flex-col overflow-hidden rounded-card border-2 border-b-[6px] border-line bg-surface text-left shadow-soft transition-[transform,border-color] hover:border-orange-300 active:translate-y-[3px] active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="relative block aspect-[16/9] w-full overflow-hidden bg-brand-50">
                                    <Image src={game.image} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                                    {/* Dvoboj: igra bira kako se igra („ko je brži” / „jedan po jedan”) */}
                                    {versus && <FormatChip format={versusFormat(game.id)} className="absolute bottom-2 left-2 text-sm" />}
                                </span>
                                <span className="flex items-center gap-3 p-3 sm:p-4">
                                    <span className={cn("hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-2xl sm:grid", game.accent.gradient)} aria-hidden="true">
                                        {game.icon}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-display text-base font-extrabold leading-tight text-ink sm:truncate sm:text-lg">{game.title}</span>
                                        <span className="block truncate text-sm font-semibold text-ink-soft">
                                            {done} / {MAX_LEVEL} nivoa
                                        </span>
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

/** Slikovna kartica „Sačekaj svoj red”: ruka na kolenu, peščani sat — mirno čekanje */
function WaitCard({ compact = false, className }: { compact?: boolean; className?: string }) {
    return (
        <div className={cn("flex items-center gap-3 rounded-2xl border-2 border-sky-200 bg-sky-50", compact ? "px-2.5 py-1.5" : "p-3 sm:p-4", className)}>
            <span className={cn("grid shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-soft", compact ? "h-9 w-9" : "h-14 w-14")} aria-hidden="true">
                <Hand className={compact ? "h-5 w-5" : "h-8 w-8"} />
            </span>
            <span className="min-w-0">
                <span className={cn("block font-display font-extrabold leading-tight text-sky-800", compact ? "text-sm sm:text-base" : "text-lg sm:text-xl")}>Sačekaj svoj red</span>
                {!compact && <span className="block text-sm font-semibold text-sky-700 sm:text-base">Ruke mirno. Gledaj kako drug igra. Odmah si ti na redu.</span>}
            </span>
        </div>
    );
}

// ── U igri: čiji je red ────────────────────────────────────────────────────────

/** Posle promene reda dodiri se kratko ne primaju: prethodni igrač ne „uskoči” u tuđi potez */
const HANDOFF_GUARD_MS = 700;

interface TurnLayerProps {
    gameId: GameId;
    children: ReactNode;
}

/**
 * Omotač igre u zajedničkoj igri: traka „Sada igra …” iznad igre i kratka zaštita pri smeni.
 * Van zajedničke igre (ili u igri bez smene) samo prikazuje igru. Ključ omotača je partija
 * (igra–nivo–pokušaj), kao i same igre.
 *
 * U takmičenju: pre igre kratak ekran „VS”, traka kaže „Na redu je: Lejla” i pokazuje zvezdice
 * oba igrača, a tačan odgovor se upisuje onome ko je bio na redu.
 */
export function TurnTakingLayer({ gameId, children }: TurnLayerProps) {
    const together = useTogether();
    const active = Boolean(together?.friend) && isTogetherGame(gameId);
    const versus = active && together?.mode === "versus";
    const [turn, setTurn] = useState(0);
    const [guard, setGuard] = useState(0);
    const turnRef = useRef(0);
    // Na svakom sledećem nivou prvi igra onaj ko je na prethodnom počinjao drugi (omotač se
    // pravi iznova za svaku partiju, pa se broj nivoa čita jednom, na početku)
    const [offset] = useState(() => (together?.levels ?? 0) % 2);
    // Ekran „VS” samo na početku partije u takmičenju
    const [intro, setIntro] = useState(versus);
    const correctRef = useRef(0);
    const versusRef = useRef(versus);
    useEffect(() => {
        versusRef.current = versus;
    }, [versus]);

    const versusReset = together?.versusReset;
    const versusPoint = together?.versusPoint;
    const versusTurn = together?.versusTurn;
    const versusTime = together?.versusTime;
    useEffect(() => {
        if (versus) versusReset?.(offset);
    }, [versus, versusReset, offset]);
    // Vreme u redu: meri se od trenutka kad je igra na ekranu (posle ekrana „VS”) do smene
    const turnStarted = useRef<number | null>(null);
    useEffect(() => {
        if (versus && !intro) turnStarted.current = Date.now();
    }, [versus, intro]);
    const closeTurn = useCallback(
        (player: number) => {
            const now = Date.now();
            if (versusRef.current && turnStarted.current !== null) versusTime?.(player, now - turnStarted.current);
            turnStarted.current = now;
        },
        [versusTime]
    );

    const onUpdate = useCallback(
        (update: GameUpdate) => {
            // Kraj nivoa: poslednji red se završava ovde
            if (update.event === "completed") {
                closeTurn((turnRef.current + offset) % 2);
                return;
            }
            // Takmičenje: novi tačni odgovori pripadaju onome ko je bio na redu pre ovog poteza
            const correct = update.data?.correctCount;
            if (versusRef.current && typeof correct === "number" && Number.isFinite(correct) && correct > correctRef.current) {
                versusPoint?.((turnRef.current + offset) % 2, Math.round(correct - correctRef.current));
                correctRef.current = correct;
            }
            const index = turnIndexFor(gameId, update.data);
            if (index === null || index === turnRef.current) return;
            closeTurn((turnRef.current + offset) % 2);
            turnRef.current = index;
            setTurn(index);
            setGuard(Date.now());
            if (versusRef.current) versusTurn?.((index + offset) % 2);
        },
        [gameId, offset, versusPoint, versusTurn, closeTurn]
    );

    useEffect(() => {
        if (!guard) return;
        const timer = setTimeout(() => setGuard(0), HANDOFF_GUARD_MS);
        return () => clearTimeout(timer);
    }, [guard]);

    if (!active || !together?.friend) return <>{children}</>;
    const players = [together.host, together.friend];
    const now = (turn + offset) % 2;
    const waiting = 1 - now;

    if (versus && intro) {
        return (
            <div className="relative flex flex-1 flex-col">
                <VsIntro
                    players={[together.host, together.friend]}
                    gameTitle={getGame(gameId).title}
                    format={versusFormat(gameId)}
                    stake={together.duel?.stake ?? 0}
                    onDone={() => setIntro(false)}
                />
            </div>
        );
    }

    return (
        <GameEventTapProvider value={onUpdate}>
            {/* Tablet, računar i telefon na boku: ko je na redu stoji u stubu pored igre, pa igra
                ima celu visinu kao i kad dete igra samo (traka iznad igre samo na uspravnom telefonu) */}
            <div className="relative flex flex-1 flex-col gap-1.5 sm:gap-3 md:flex-row landscape:flex-row">
                <TurnStrip
                    key={now}
                    player={players[now]}
                    look={LOOKS[now]}
                    other={players[waiting]}
                    otherLook={LOOKS[waiting]}
                    scores={versus ? [together.versus.scores[now], together.versus.scores[waiting]] : null}
                />
                <div
                    className={cn(
                        "relative flex min-w-0 flex-1 flex-col rounded-[1.75rem] border-4 border-dashed p-0.5 transition-colors sm:p-1 md:rounded-none md:border-0 md:border-l-4 md:p-0 md:pl-2 landscape:rounded-none landscape:border-0 landscape:border-l-4 landscape:p-0 landscape:pl-2",
                        LOOKS[now].border
                    )}
                >
                    {children}
                    {guard > 0 && <div className="absolute inset-0 z-30" aria-hidden="true" />}
                </div>
            </div>
        </GameEventTapProvider>
    );
}

interface TurnStripProps {
    player: TogetherPlayer;
    look: (typeof LOOKS)[number];
    other: TogetherPlayer;
    otherLook: (typeof LOOKS)[number];
    /** Takmičenje: zvezdice [ko je na redu, ko čeka]; null = zajednička igra */
    scores?: [number, number] | null;
}

/** Uspravan telefon: traka iznad igre; tablet, računar i telefon na boku: stub pored igre (TurnRail) */
function TurnStrip(props: TurnStripProps) {
    return (
        <>
            <TurnBar {...props} />
            <TurnRail {...props} />
        </>
    );
}

function TurnBar({ player, look, other, otherLook, scores = null }: TurnStripProps) {
    const calm = useCalmMotion();
    const versus = scores !== null;
    return (
        <div className="flex items-stretch gap-2 sm:gap-3 md:hidden landscape:hidden" role="status" aria-live="polite">
            {/* Uzak telefon (do 400 px): manji drugar i tanja traka, da igri ostane cela visina kao kad dete igra samo */}
            <div className={cn("flex min-w-0 flex-1 items-center rounded-2xl px-2.5 py-2 text-white shadow-soft max-[400px]:py-1.5 sm:gap-3 sm:px-4", versus ? "gap-2" : "gap-3", look.solid, !calm && "animate-pop")}>
                <PlayerPicture player={player} look={look} hype className="h-12 w-12 bg-white max-[400px]:h-10 max-[400px]:w-10 sm:h-16 sm:w-16" />
                <span className="min-w-0 flex-1">
                    <span className={cn("block text-xs font-extrabold uppercase text-white/85 sm:text-sm", versus ? "truncate max-[400px]:text-[0.7rem] max-[400px]:tracking-tight" : "tracking-wide")}>
                        <span className={cn(versus && "max-[400px]:hidden")} aria-hidden="true">
                            {look.mark}{" "}
                        </span>
                        {versus ? "Na redu je:" : "Tvoj red"}
                    </span>
                    <span className="block truncate font-display text-lg font-extrabold leading-tight sm:text-2xl">{versus ? player.name : `Sada igra ${player.name}`}</span>
                </span>
                {versus && <ScorePill name={player.name} stars={scores[0]} className="bg-white px-2 text-base max-[400px]:px-1.5 sm:px-2.5 sm:text-lg" />}
            </div>
            <div className={cn("flex shrink-0 items-center gap-2 rounded-2xl border-2 border-line bg-surface px-2 py-1.5 max-[400px]:py-1 sm:px-3", versus && "max-[400px]:gap-1.5 max-[400px]:px-1.5")}>
                <span className="relative shrink-0">
                    <PlayerPicture player={other} look={otherLook} dim className="h-10 w-10 max-[400px]:h-9 max-[400px]:w-9 sm:h-12 sm:w-12" />
                    {/* Kartica „Sačekaj svoj red” u malom: ruka, i kad za tekst nema mesta */}
                    <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-sky-600 text-white shadow-soft ring-2 ring-white" aria-hidden="true">
                        <Hand className="h-3.5 w-3.5" />
                    </span>
                </span>
                <span className={cn("hidden min-w-0", versus ? "sm:block" : "min-[480px]:block")}>
                    <span className="block max-w-28 truncate text-sm font-extrabold text-ink sm:max-w-36">{other.name}</span>
                    <span className="flex items-center gap-1 text-xs font-extrabold text-sky-700 sm:text-sm">
                        <Hand className="h-4 w-4" aria-hidden="true" />
                        Sačekaj svoj red
                    </span>
                </span>
                <span className={cn("sr-only", versus ? "sm:hidden" : "min-[480px]:hidden")}>{other.name}: sačekaj svoj red</span>
                {versus && <ScorePill name={other.name} stars={scores[1]} className="px-2 text-base max-[400px]:px-1.5 sm:px-2.5 sm:text-lg" />}
            </div>
        </div>
    );
}

/**
 * Stub pored igre (tablet, računar, telefon na boku): gore ko je na redu (u svojoj boji,
 * krupno), ispod ko čeka sa kartom „Sačekaj svoj red”. Isti podaci kao traka, ali igri ne
 * uzima visinu — igra staje na ekran isto kao kad dete igra samo.
 */
function TurnRail({ player, look, other, otherLook, scores = null }: TurnStripProps) {
    const calm = useCalmMotion();
    const versus = scores !== null;
    return (
        <div className="hidden w-28 shrink-0 flex-col gap-2 md:flex landscape:flex lg:w-32" role="status" aria-live="polite">
            {/* Nizak položen ekran (telefon na boku): manji drugari, ruka bez natpisa */}
            <div className={cn("flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-center text-white shadow-soft [@media(max-height:30rem)]:gap-0.5 [@media(max-height:30rem)]:py-1.5", look.solid, !calm && "animate-pop")}>
                <PlayerPicture player={player} look={look} hype className="h-14 w-14 bg-white lg:h-16 lg:w-16 [@media(max-height:30rem)]:h-11 [@media(max-height:30rem)]:w-11" />
                <span className="text-xs font-extrabold uppercase tracking-wide text-white/85">
                    <span aria-hidden="true">{look.mark} </span>
                    {versus ? "Na redu je" : "Tvoj red"}
                </span>
                <span className="block w-full truncate font-display text-lg font-extrabold leading-tight">{player.name}</span>
                {versus && <ScorePill name={player.name} stars={scores[0]} className="bg-white px-2 text-base" />}
            </div>
            <div className="flex flex-col items-center gap-1 rounded-2xl border-2 border-line bg-surface px-2 py-2 text-center [@media(max-height:30rem)]:gap-0.5 [@media(max-height:30rem)]:py-1.5">
                <span className="relative">
                    <PlayerPicture player={other} look={otherLook} dim className="h-11 w-11 [@media(max-height:30rem)]:h-9 [@media(max-height:30rem)]:w-9" />
                    <span className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-sky-600 text-white shadow-soft ring-2 ring-white" aria-hidden="true">
                        <Hand className="h-3.5 w-3.5" />
                    </span>
                </span>
                <span className="block w-full truncate text-sm font-extrabold text-ink">{other.name}</span>
                <span className="text-xs font-extrabold leading-tight text-sky-700 [@media(max-height:30rem)]:sr-only">Sačekaj svoj red</span>
                {versus && <ScorePill name={other.name} stars={scores[1]} className="px-2 text-base" />}
            </div>
        </div>
    );
}

// ── Kraj nivoa: zajednička pohvala ───────────────────────────────────────────────

interface TogetherEndProps {
    gameId: GameId;
    /** Ključ partije (igra–nivo–pokušaj): zvezdice se broje jednom */
    playKey: string;
    stars: number;
    /** Tačni odgovori u nivou (takmičenje: ono što traka nije stigla da upiše ide onome ko je na redu) */
    correct?: number;
    /** Broj ocenjenih zadataka u nivou (izveštaj o dvoboju) */
    total?: number;
    level: number;
    advance: boolean;
    limitReached: boolean;
    saved: "saving" | "ok" | "failed";
    onNext: () => void;
    onRetry: () => void;
    onLeave: () => void;
}

/**
 * Ulog posle partije na istom uređaju: kad je drug brat ili sestra (sesija sa servera), rezultat
 * ide serveru jednom po partiji; server prenese ulog od poraženog pobedniku (lib/duelStakes.ts),
 * pa se novčići deteta osveže. Bez sesije (drug bez naloga) — bez uloga.
 */
function useLocalSettlement(input: { key: string; level: number; format: VersusFormat; scores: [number, number]; secs: [number, number]; total: number } | null): DuelCoins | undefined {
    const together = useTogether();
    const refreshCoins = useCompanion()?.refresh;
    const duel = together?.duel ?? null;
    const childId = together?.childId ?? 0;
    const duelRound = together?.duelRound;
    const [result, setResult] = useState<{ key: string; coins: DuelCoins } | null>(null);
    const inputRef = useRef(input);
    useEffect(() => {
        inputRef.current = input;
    });
    const key = input?.key ?? null;
    const session = duel?.session ?? null;
    const stake = duel?.stake ?? 0;
    useEffect(() => {
        const current = inputRef.current;
        if (!key || !session || !current || !duelRound || stake <= 0) return;
        let alive = true;
        const { level, format, scores, secs, total } = current;
        const tasks = Math.max(total, scores[0] + scores[1]);
        fetch(`/api/children/${childId}/duel/result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session,
                level,
                round: duelRound(key),
                format,
                mine: { correct: scores[0], total: tasks, secs: secs[0] },
                theirs: { correct: scores[1], total: tasks, secs: secs[1] },
            }),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!alive) return;
                const amount = typeof data?.amount === "number" ? Math.max(0, Math.round(data.amount)) : 0;
                setResult({ key, coins: data?.status === "settled" ? { state: "settled", amount } : { state: "failed", amount: 0 } });
                if (data?.status === "settled" && amount > 0) refreshCoins?.();
            })
            .catch(() => {
                if (alive) setResult({ key, coins: { state: "failed", amount: 0 } });
            });
        return () => {
            alive = false;
        };
    }, [key, session, stake, childId, duelRound, refreshCoins]);
    if (!input) return undefined;
    if (!duel) return { state: "off", amount: 0 };
    if (stake <= 0) return { state: "off", amount: 0 };
    return result?.key === input.key ? result.coins : { state: "pending", amount: 0 };
}

/** Da li se kraj nivoa u ovoj igri prikazuje kao zajednička pohvala */
export function useTogetherEnd(gameId: GameId | null | undefined): boolean {
    const together = useTogether();
    return Boolean(together?.friend) && isTogetherGame(gameId);
}

export function TogetherEnd({ gameId, playKey, stars, correct = 0, total = 0, level, advance, limitReached, saved, onNext, onRetry, onLeave }: TogetherEndProps) {
    const together = useTogether();
    const addLevel = together?.addLevel;
    useEffect(() => {
        addLevel?.(playKey, stars);
    }, [addLevel, playKey, stars]);
    // Takmičenje: zvezdice svakog igrača (ono što traka nije stigla da upiše ide onome ko je na redu)
    const versusScores: [number, number] = together ? [...together.versus.scores] : [0, 0];
    if (together) versusScores[together.versus.turn === 1 ? 1 : 0] += Math.max(0, correct - versusScores[0] - versusScores[1]);
    const format = versusFormat(gameId);
    const secs: [number, number] = together ? [Math.round(together.versus.ms[0] / 1000), Math.round(together.versus.ms[1] / 1000)] : [0, 0];
    const coins = useLocalSettlement(
        together?.mode === "versus" && together.friend ? { key: playKey, level, format, scores: versusScores, secs, total } : null
    );

    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        panelRef.current?.focus();
    }, []);

    if (!together?.friend) return null;
    const { host, friend } = together;

    // Takmičenje: oba drugara sa svojim zvezdicama, pobednik, ulog i pohvala za trud (playVersus.tsx)
    if (together.mode === "versus") {
        const stake = together.duel?.stake ?? 0;
        return (
            <VersusEnd
                seats={[
                    { player: host, gender: together.gender, score: versusScores[0], secs: format === "race" ? secs[0] : 0, badge: <CoinsBadge coins={stars * COINS_PER_STAR} /> },
                    { player: friend, score: versusScores[1], secs: format === "race" ? secs[1] : 0, badge: <PraiseBadge /> },
                ]}
                format={format}
                coins={coins}
                limitReached={limitReached}
                saved={saved}
                onRematch={onRetry}
                onLeave={onLeave}
                adultNote={
                    together.duel ? (
                        <>
                            novčići i nivo za igru idu detetu koje je prijavljeno ({host.name}).
                            {stake > 0 ? ` Poraženi daje do ${stake} novčića, nikad više nego što ima (ulog: podešavanja deteta).` : " Ulog je 0: samo ime pobednika."}
                        </>
                    ) : (
                        <>takmičenje je samo za zabavu. Novčići i nivo idu detetu koje je prijavljeno ({host.name}); drug dobija pohvalu.</>
                    )
                }
            />
        );
    }

    // Zbir svih zajedničkih nivoa; ovaj nivo se ubraja i pre nego što se upiše (prvo crtanje)
    const sum = together.totalStars + (playKey in together.scores ? 0 : stars);
    const praise = togetherPraise([host.name, friend.name], sum);
    const lastInTier = level % LEVELS_PER_TIER === 0;
    const canNext = advance && !lastInTier && level < MAX_LEVEL;

    return (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="alertdialog" aria-modal="true" aria-label={praise.title}>
            <div ref={panelRef} tabIndex={-1} className="max-h-full w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-[2rem] bg-surface p-6 text-center shadow-pop outline-none sm:rounded-[2rem] sm:p-9">
                <div className="flex items-end justify-center gap-4 sm:gap-8">
                    {[host, friend].map((player, index) => (
                        <div key={index} className="flex min-w-0 flex-col items-center gap-2">
                            <PlayerPicture player={player} look={LOOKS[index]} className="h-28 w-28 sm:h-32 sm:w-32" />
                            <span className={cn("max-w-32 truncate font-display text-lg font-extrabold", LOOKS[index].text)}>{player.name}</span>
                            {index === 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sun-100 px-3 py-1 text-base font-extrabold text-sun-700 ring-1 ring-sun-300">
                                    + {stars * COINS_PER_STAR} <CoinIcon className="h-5 w-5" />
                                    <span className="sr-only">novčića</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-base font-extrabold text-orange-700 ring-1 ring-orange-300">
                                    <span aria-hidden="true">👏</span> Bravo!
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
                <h2 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">{praise.title}</h2>
                <p className="mt-1 text-lg font-extrabold text-sun-700 sm:text-xl">{praise.text}</p>
                <p className="mt-2 text-base font-semibold text-ink-soft">Odlično se smenjujete.</p>
                {limitReached && <p className="mt-2 text-base font-semibold text-ink-soft">Za danas smo završili. Vidimo se sledeći put.</p>}

                <div className="mt-6 flex flex-col gap-3">
                    {!limitReached && canNext && (
                        // Na uskom telefonu manje unutrašnje margine, da natpis stane u jedan red
                        <Button chunky size="xl" variant="success" block onClick={onNext} className="max-sm:px-4">
                            Još jedan nivo zajedno
                            <ArrowRight className="h-6 w-6" aria-hidden="true" />
                        </Button>
                    )}
                    {!limitReached && !canNext && (
                        <Button chunky size="xl" variant="sun" block onClick={onRetry}>
                            <RotateCcw className="h-6 w-6" aria-hidden="true" />
                            Igrajte još jednom
                        </Button>
                    )}
                    <Button chunky size="xl" variant="secondary" block onClick={onLeave}>
                        <Check className="h-6 w-6" aria-hidden="true" />
                        {limitReached ? "Gotovo za danas" : "Gotovo"}
                    </Button>
                </div>
                <p className="mt-4 border-t border-line pt-3 text-sm font-semibold normal-case text-ink-faint">
                    <span className="font-extrabold text-ink-soft">Za odrasle:</span> novčići i nivo idu detetu koje je prijavljeno ({host.name}); drug dobija pohvalu.
                </p>
                <p className="mt-1 min-h-5 text-xs font-bold normal-case text-ink-faint" aria-live="polite">
                    {saved === "failed" && "Nema interneta. Rezultat nije sačuvan."}
                </p>
            </div>
        </div>
    );
}

/** Novčići za ovaj nivo (ispod drugara deteta) */
export function CoinsBadge({ coins }: { coins: number }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sun-100 px-3 py-1 text-base font-extrabold text-sun-700 ring-1 ring-sun-300">
            + {coins} <CoinIcon className="h-5 w-5" />
            <span className="sr-only">novčića</span>
        </span>
    );
}

/** „Bravo!” za druga */
export function PraiseBadge() {
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-base font-extrabold text-orange-700 ring-1 ring-orange-300">
            <span aria-hidden="true">👏</span> Bravo!
        </span>
    );
}
