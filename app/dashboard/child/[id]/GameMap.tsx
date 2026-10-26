// app/dashboard/child/[id]/GameMap.tsx
"use client";

// „Mape” igara: igre su raspoređene u do četiri nacrtane mape po težini (lib/gameWorlds.ts) —
// Zelena livada, Peščana pustinja, Vatreni vulkan i Ledeni vrhovi. Iznad mape su jezičci mapa
// (sa zvezdicama), a na mapi vijugav put sa stanicama: svaka stanica je jedna igra, redom kojim
// se preporučuje; drugar stoji na stanici na kojoj je dete sada. Na kraju puta je kapija: kad
// su zvezdice skupljene, ključ otvara kapiju i sledeću mapu. Crteži su u mapWorlds.tsx.
// Dok traje dnevni plan roditelja, umesto mapa je jedan put sa igrama iz plana, redom.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Image from "next/image";
import { Check, KeyRound, Lock, Star } from "lucide-react";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { useCalmMotion } from "@/app/components/avatar/motion";
import CompanionPicture from "@/app/components/avatar3d/CompanionPicture";
import { CelebrationLayer, celebrateBigWhenSettled, isFemale, playSfx } from "@/app/components/games/kit";
import { cn } from "@/lib/cn";
import { MAX_LEVEL, type GameDefinition, type GameId } from "@/lib/games";
import type { GameAccess, GameProgress } from "@/lib/gameAccess";
import {
    WORLD_WORDS,
    buildWorlds,
    byDifficulty,
    chooseWorld,
    gateOpenedPraise,
    gateState,
    levelsDone,
    lockedByWorld,
    lockedWorldMessage,
    parseOpened,
    starsPhrase,
    worldOpenedKey,
    worldViewKey,
    type GateState,
    type WorldId,
    type WorldState,
} from "@/lib/gameWorlds";
import type { RemoteStart } from "@/lib/invite";
import { useSpeech } from "@/lib/speech";
import { chosenSkin, useCompanion } from "./companionState";
import { currentStop, curvesPath, mapLayout, stopStars, type MapLayout } from "./gameMapLayout";
import { WorldBadge, WorldBridge, WorldGate, WorldScenery, WorldStart, worldRoad, worldTheme } from "./mapWorlds";
import { TogetherGamePicker, TogetherStartButton, useTogether } from "./playTogether";
import { RemoteEndedNotice, RemoteLobby, useRemoteActive } from "./playRemote";

type PlanStatus = "done" | "now" | "later";

// ── Pamćenje na ovom uređaju (samo pogodnost) ─────────────────────────────────

/** Skladište ne radi (privatni prozor, blokirani podaci) */
const NO_STORAGE = "\u0000";
const storeListeners = new Set<() => void>();
/** Kad skladište ne radi, vrednosti se pamte bar dok je stranica otvorena */
const memory = new Map<string, string>();

function readStore(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return NO_STORAGE;
    }
}

function writeStore(key: string, value: string) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        /* skladište ne radi: važi do zatvaranja stranice */
    }
    memory.set(key, value);
    storeListeners.forEach((fn) => fn());
}

function subscribeStore(fn: () => void) {
    storeListeners.add(fn);
    window.addEventListener("storage", fn);
    return () => {
        storeListeners.delete(fn);
        window.removeEventListener("storage", fn);
    };
}

/** Vrednost iz localStorage; `NO_STORAGE` kad skladište ne radi; null na serveru i kad je nema */
function useStored(key: string): string | null {
    return useSyncExternalStore(subscribeStore, () => readStore(key), () => null);
}

// ── Izbor igre: mape ili igra sa drugom ──────────────────────────────────────────

interface GamePickerProps {
    childId: number;
    gender?: string;
    /** Sve igre koje roditelj nije isključio, poređane za dete, sa stanjem (lib/gameAccess.ts) */
    access: GameAccess[];
    /** Igre koje dete sme da igra (za igru sa drugom; mape je ne zaključavaju) */
    playable: GameDefinition[];
    /** Napredak po igri (prvi nepoložen nivo) */
    progress: GameProgress;
    /** Sledeći otključani nivo igre (1–16) */
    unlockedFor: (id: GameId) => number;
    /** Sve mape otvorene: izbor roditelja ili probni prikaz sa svim nivoima */
    openAll: boolean;
    /** Dnevni plan traje: igre iz plana redom (bez mapa) i mesto svake u planu */
    plan: { games: GameDefinition[]; statusFor: (id: GameId) => PlanStatus } | null;
    /** Igre iz plana roditelja: uvek dostupne */
    planIds: readonly GameId[];
    /** Napredak se još učitava: stanice izgledaju uobičajeno, samo se još ne otvaraju */
    pending?: boolean;
    /** Napredak nije učitan: igre se ne otvaraju dok se ne pokuša ponovo */
    unavailable?: boolean;
    onOpen: (id: GameId) => void;
    /** Igra sa drugom na drugom uređaju: otvara igru baš na zajedničkom nivou */
    onOpenLevel: (id: GameId, level: number) => void;
    /** Da li „Krenimo!” sada otvara igru (isto pravilo kao `onOpenLevel`, lib/invite.ts) */
    remoteStart: RemoteStart;
    /** Napredak nije učitan: ponovo ga učitava („Probaj ponovo”) */
    onRetry: () => void;
}

export function GamePicker({ childId, gender, access, playable, progress, unlockedFor, openAll, plan, planIds, pending = false, unavailable = false, onOpen, onOpenLevel, remoteStart, onRetry }: GamePickerProps) {
    const together = useTogether();
    const remoteOn = useRemoteActive();
    const togetherOn = Boolean(together?.friend) || remoteOn;

    return (
        <div className="space-y-4 sm:space-y-5">
            {!plan && <TogetherStartButton games={playable} unlockedFor={unlockedFor} />}
            <RemoteEndedNotice />
            {remoteOn ? (
                <RemoteLobby start={remoteStart} onOpenLevel={onOpenLevel} onRetry={onRetry} games={playable} unlockedFor={unlockedFor} />
            ) : togetherOn ? (
                <TogetherGamePicker games={playable} unlockedFor={unlockedFor} pending={pending} unavailable={unavailable} onOpen={onOpen} />
            ) : plan ? (
                <PlanMap games={plan.games} statusFor={plan.statusFor} unlockedFor={unlockedFor} pending={pending} unavailable={unavailable} onOpen={onOpen} />
            ) : (
                <WorldMaps
                    childId={childId}
                    gender={gender}
                    access={access}
                    progress={progress}
                    openAll={openAll}
                    planIds={planIds}
                    pending={pending}
                    unavailable={unavailable}
                    onOpen={onOpen}
                />
            )}
        </div>
    );
}

// ── Dnevni plan: jedan put, igre iz plana redom ───────────────────────────────────

/**
 * Plan ima svoj put, bez mapa i ključeva: roditelj je već odredio šta je danas na redu, pa bi
 * mape samo dodale drugi raspored. Livada, a na kraju otvorena kapija (kraj plana).
 */
function PlanMap({ games, statusFor, unlockedFor, pending, unavailable, onOpen }: { games: GameDefinition[]; statusFor: (id: GameId) => PlanStatus; unlockedFor: (id: GameId) => number; pending: boolean; unavailable: boolean; onOpen: (id: GameId) => void }) {
    const stops = useMemo(
        () =>
            games.map((game) => {
                const status = statusFor(game.id);
                return { game, status, done: doneOf(unlockedFor(game.id)), locked: status === "later" || unavailable };
            }),
        [games, statusFor, unlockedFor, unavailable]
    );
    const now = stops.findIndex((s) => s.status === "now");
    return <GameMap world="meadow" label="Plan za danas" stops={stops} current={pending ? -1 : now >= 0 ? now : currentStop(stops)} gate={{ state: "open", final: true }} pending={pending} onOpen={onOpen} />;
}

function doneOf(unlocked: number): number {
    return Math.min(Math.max(unlocked - 1, 0), MAX_LEVEL);
}

// ── Mape ───────────────────────────────────────────────────────────────────────

/** Koliko traje let ključa do brave (ms) */
const KEY_FLY_MS = 950;
/** Posle otvaranja kapije: koliko se gleda otvorena kapija pre prelaska na sledeću mapu (ms) */
const GATE_OPEN_MS = 2600;

interface WorldMapsProps {
    childId: number;
    gender?: string;
    access: GameAccess[];
    progress: GameProgress;
    openAll: boolean;
    planIds: readonly GameId[];
    pending: boolean;
    unavailable: boolean;
    onOpen: (id: GameId) => void;
}

function WorldMaps({ childId, gender, access, progress, openAll, planIds, pending, unavailable, onOpen }: WorldMapsProps) {
    const settings = useChildSettings();
    const calm = useCalmMotion();
    const { say } = useSpeech(gender);
    const tabsRef = useRef<HTMLDivElement>(null);

    // Dok se napredak učitava, sve mape izgledaju kao pre učitavanja (bez zvezdica): ne otvaraju se
    const worlds = useMemo(() => buildWorlds(byDifficulty(access.map((a) => a.game)), pending ? {} : progress, { openAll }), [access, progress, pending, openAll]);
    const orderLocked = useMemo(() => new Set(access.filter((a) => a.state === "locked").map((a) => a.game.id)), [access]);

    const viewKey = worldViewKey(childId);
    const openedKey = worldOpenedKey(childId);
    const storedView = useStored(viewKey);
    const storedOpened = useStored(openedKey);
    const remembered = storedView === NO_STORAGE ? (memory.get(viewKey) ?? null) : storedView;
    /** Kapije koje je dete otvorilo; null = skladište ne radi (kapija se otvara sama) */
    const opened = storedOpened === NO_STORAGE ? null : parseOpened(storedOpened);

    // Mapa koju je dete izabralo u ovoj poseti (i zaključanu, za pogled); inače zapamćena ili podrazumevana
    const [picked, setPicked] = useState<WorldId | null>(null);
    // Ključ koji čeka na kapiji ima prednost: dete prvo vidi kapiju koju može da otvori
    const waiting = worlds.find((w) => gateState(w, opened, { openAll }) === "key")?.id ?? null;
    const selectedId = (picked && worlds.some((w) => w.id === picked) ? picked : null) ?? (pending ? null : chooseWorld(worlds, remembered, waiting)) ?? worlds[0]?.id ?? "meadow";
    const selected = worlds.find((w) => w.id === selectedId) ?? worlds[0];

    const choose = (id: WorldId) => {
        setPicked(id);
        // Pamti se samo otvorena mapa: posle povratka dete ne dočeka zaključana
        if (worlds.some((w) => w.id === id && w.open)) writeStore(viewKey, id);
    };

    const [ceremony, setCeremony] = useState<{ world: WorldId; phase: "fly" | "open" } | null>(null);
    useEffect(() => {
        if (!ceremony) return;
        const index = worlds.findIndex((w) => w.id === ceremony.world);
        const world = worlds[index];
        const next = worlds[index + 1] ?? null;
        if (ceremony.phase === "fly") {
            const timer = setTimeout(() => {
                // Otvaranje se pamti na uređaju; zvezdice su ionako tu (otključavanje ne zavisi od ovoga)
                writeStore(openedKey, JSON.stringify([...(opened ?? []), ceremony.world]));
                setCeremony({ world: ceremony.world, phase: "open" });
                playSfx("win");
                celebrateBigWhenSettled();
                if (world) void say(gateOpenedPraise(world, next?.id ?? null, isFemale(gender)), undefined, "proud");
            }, calm ? 0 : KEY_FLY_MS);
            return () => clearTimeout(timer);
        }
        const timer = setTimeout(() => {
            setCeremony(null);
            if (next) {
                choose(next.id);
                tabsRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
            }
        }, GATE_OPEN_MS);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- jedan korak slavlja po promeni faze
    }, [ceremony]);

    const onSelect = (id: WorldId) => {
        if (ceremony) return;
        if (id === selectedId) return;
        choose(id);
        const world = worlds.find((w) => w.id === id);
        // Zaključana mapa se može pogledati; glas mirno kaže šta treba (bez „dodirni”)
        if (world && !world.open) void say(lockedWorldMessage(worlds, id), undefined, "gentle");
    };

    if (!selected) return null;
    const index = worlds.indexOf(selected);
    const next = worlds[index + 1] ?? null;
    const gate = ceremony?.world === selected.id && ceremony.phase === "fly" ? "key" : gateState(selected, opened, { openAll });

    const onGate = () => {
        if (ceremony || pending) return;
        if (gate === "key") {
            playSfx("tap");
            // Mapa ostaje ista dok traje slavlje (posle otvaranja bi se izbor sam pomerio dalje)
            setPicked(selected.id);
            setCeremony({ world: selected.id, phase: "fly" });
        } else if (gate === "locked") {
            void say(`Za ključ treba još ${starsPhrase(Math.max(selected.need - selected.stars, 1))}.`, undefined, "gentle");
        } else if (next) {
            onSelect(next.id);
            tabsRef.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
        }
    };

    const stops = selected.games.map((game) => ({
        game,
        done: levelsDone(progress, game.id),
        locked: unavailable || orderLocked.has(game.id) || lockedByWorld(selected, game.id, planIds),
    }));
    const current = pending || !selected.open ? -1 : currentStop(stops);

    return (
        <div className="space-y-3 sm:space-y-4">
            <CelebrationLayer disabled={settings.reduceMotion} />
            <div ref={tabsRef} className="scroll-mt-24">
                {worlds.length > 1 && <WorldTabs worlds={worlds} selected={selected.id} openAll={openAll} onSelect={onSelect} />}
            </div>
            <div role={worlds.length > 1 ? "tabpanel" : undefined} id={`bm-world-panel-${selected.id}`} aria-labelledby={worlds.length > 1 ? `bm-world-tab-${selected.id}` : undefined}>
                <GameMap
                    world={selected.id}
                    label={`Mapa: ${WORLD_WORDS[selected.id].name}`}
                    stops={stops}
                    current={current}
                    locked={selected.open ? null : lockedWorldMessage(worlds, selected.id)}
                    gate={{
                        state: gate,
                        final: selected.final,
                        stars: selected.stars,
                        need: selected.need,
                        chip: !openAll,
                        flying: ceremony?.world === selected.id && ceremony.phase === "fly",
                        next: next ? WORLD_WORDS[next.id].nameAcc : null,
                        onPress: onGate,
                    }}
                    pending={pending}
                    onOpen={onOpen}
                />
            </div>
        </div>
    );
}

// ── Jezičci mapa ───────────────────────────────────────────────────────────────

function WorldTabs({ worlds, selected, openAll, onSelect }: { worlds: WorldState<GameDefinition>[]; selected: WorldId; openAll: boolean; onSelect: (id: WorldId) => void }) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const last = worlds.length - 1;
        const to =
            event.key === "ArrowRight" || event.key === "ArrowDown" ? (index === last ? 0 : index + 1)
            : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index === 0 ? last : index - 1)
            : event.key === "Home" ? 0
            : event.key === "End" ? last
            : null;
        if (to === null) return;
        event.preventDefault();
        refs.current[to]?.focus();
        onSelect(worlds[to].id);
    };

    return (
        <div role="tablist" aria-label="Mape" className="grid gap-1.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${worlds.length}, minmax(0, 1fr))` }}>
            {worlds.map((world, index) => {
                const theme = worldTheme(world.id);
                const words = WORLD_WORDS[world.id];
                const active = world.id === selected;
                const earned = world.earned && !openAll;
                const label = `${words.name}. ${world.stars} od ${openAll ? world.maxStars : world.need} zvezdica${world.open ? "" : ", zaključano"}.`;
                return (
                    <button
                        key={world.id}
                        ref={(el) => {
                            refs.current[index] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`bm-world-tab-${world.id}`}
                        aria-selected={active}
                        aria-controls={`bm-world-panel-${world.id}`}
                        aria-label={label}
                        tabIndex={active ? 0 : -1}
                        onClick={() => onSelect(world.id)}
                        onKeyDown={(e) => onKeyDown(e, index)}
                        className={cn(
                            "relative flex min-h-[5.5rem] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 text-center transition-[transform,background-color,border-color] sm:min-h-18 sm:flex-row sm:justify-start sm:gap-3 sm:px-3 sm:text-left",
                            active ? "shadow-lift" : "border-transparent bg-surface/80 shadow-soft hover:-translate-y-0.5"
                        )}
                        style={active ? { borderColor: theme.colors.frame, backgroundColor: theme.colors.ground } : undefined}
                    >
                        <span className="relative shrink-0">
                            {/* Zaključana mapa: značka je bleđa i sa katancem (crta je mapWorlds.tsx) */}
                            <WorldBadge world={world.id} locked={!world.open} className="h-11 w-11 sm:h-12 sm:w-12" />
                        </span>
                        <span className="flex min-w-0 flex-col items-center sm:items-start">
                            <span className="max-w-full truncate font-display text-[0.8rem] font-extrabold leading-tight sm:text-base" style={{ color: active ? theme.colors.text : undefined }}>
                                <span className="lg:hidden">{words.short}</span>
                                <span className="hidden lg:inline">{words.name}</span>
                            </span>
                            <span className="mt-0.5 inline-flex items-center gap-0.5 whitespace-nowrap text-[0.72rem] font-extrabold text-ink-soft sm:text-sm" aria-hidden="true">
                                <Star className="h-3.5 w-3.5 fill-sun-400 text-sun-500 sm:h-4 sm:w-4" />
                                {earned ? world.stars : `${world.stars} / ${openAll ? world.maxStars : world.need}`}
                                {earned && <Check className="h-3.5 w-3.5 text-emerald-700 sm:h-4 sm:w-4" />}
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Mapa ──────────────────────────────────────────────────────────────────────

/** Širina okvira (px); 0 dok se ne izmeri */
function useWidth(ref: React.RefObject<HTMLElement | null>): number {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setWidth(Math.round(el.getBoundingClientRect().width));
        if (typeof ResizeObserver === "undefined") {
            queueMicrotask(measure);
            return;
        }
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);
    return width;
}

interface MapStopData {
    game: GameDefinition;
    done: number;
    status?: PlanStatus;
    locked: boolean;
}

interface GateProps {
    state: GateState;
    final: boolean;
    stars?: number;
    need?: number;
    /** Oznaka „⭐ 5 / 7” sa ključem kod kapije */
    chip?: boolean;
    /** Ključ upravo leti do brave */
    flying?: boolean;
    /** Sledeća mapa (akuzativ), za čitač ekrana */
    next?: string | null;
    onPress?: () => void;
}

interface GameMapProps {
    world: WorldId;
    label: string;
    stops: MapStopData[];
    /** Stanica na kojoj stoji drugar; −1 = nigde */
    current: number;
    /** Zaključana mapa: poruka šta treba da se otvori */
    locked?: string | null;
    gate: GateProps;
    pending: boolean;
    onOpen: (id: GameId) => void;
}

export default function GameMap({ world, label, stops, current, locked = null, gate, pending, onOpen }: GameMapProps) {
    const boxRef = useRef<HTMLDivElement>(null);
    const width = useWidth(boxRef);
    const calm = useCalmMotion();
    const settings = useChildSettings();
    const companion = useCompanion();
    const theme = worldTheme(world);
    const layout = useMemo(() => (width > 0 ? mapLayout(stops.length, width) : null), [stops.length, width]);

    return (
        <section aria-label={label} className="relative overflow-hidden rounded-card border-2 shadow-soft" style={{ backgroundColor: theme.colors.ground, borderColor: theme.colors.frame }}>
            <div ref={boxRef} className="relative w-full" style={{ height: layout?.height ?? 900 }}>
                {layout && (
                    <>
                        <MapWorld world={world} layout={layout} current={current} gate={gate} calm={calm} />
                        <ol className="absolute inset-0">
                            {stops.map((stop, index) => (
                                <MapStop
                                    key={stop.game.id}
                                    index={index}
                                    layout={layout}
                                    game={stop.game}
                                    done={stop.done}
                                    status={stop.status}
                                    locked={stop.locked}
                                    current={index === current}
                                    disabled={stop.locked || pending}
                                    busy={pending}
                                    priority={index < 3}
                                    ground={theme.colors.ground}
                                    onOpen={() => onOpen(stop.game.id)}
                                />
                            ))}
                        </ol>
                        {/* Drugar stoji na stanici na kojoj je dete sada */}
                        {current >= 0 && settings.avatar && companion && (
                            <MapCompanion layout={layout} at={current} kind={companion.kind} skin={chosenSkin(companion)} wear={companion.wear} calm={calm} />
                        )}
                        <GateControl layout={layout} gate={gate} calm={calm} />
                    </>
                )}
                {/* Zaključana mapa: mirna poruka na vrhu (mapa se vidi, igre se još ne otvaraju) */}
                {locked && (
                    <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-center sm:top-5" role="status">
                        <p className="flex max-w-md items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-base font-extrabold leading-snug text-ink shadow-lift sm:text-lg">
                            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ backgroundColor: theme.colors.accent }} aria-hidden="true">
                                <Lock className="h-5.5 w-5.5" />
                            </span>
                            {locked}
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

// ── Kapija na kraju puta ─────────────────────────────────────────────────────────

/**
 * Mesta na crtežu kapije (mapWorlds.tsx), u odnosu na `layout.end`: kapija je oko 140 × 140 px,
 * a poslednja mapa ima viši dvorac i kovčeg blaga ispod njega (katanac je na kovčegu).
 */
function gateSpots(final: boolean) {
    return final
        ? { box: { x: -90, y: -118, w: 180, h: 200 }, key: { x: 37, y: 28 }, lock: { x: 0, y: 58 }, chip: 90 }
        : { box: { x: -74, y: -94, w: 148, h: 146 }, key: { x: 34, y: -28 }, lock: { x: 0, y: 6 }, chip: 60 };
}

function GateControl({ layout, gate, calm }: { layout: MapLayout; gate: GateProps; calm: boolean }) {
    const { end } = layout;
    const spots = gateSpots(gate.final);
    const ready = gate.state === "key";
    const missing = Math.max((gate.need ?? 0) - (gate.stars ?? 0), 0);
    const label =
        gate.state === "key" ? (gate.final ? "Kovčeg: ključ je spreman, otvori kovčeg" : "Kapija: ključ je spreman, otvori kapiju")
        : gate.state === "locked" ? `${gate.final ? "Kovčeg" : "Kapija"} je zaključan${gate.final ? "" : "a"}: treba još ${starsPhrase(missing)}`
        : gate.next ? `Kapija je otvorena: dalje na ${gate.next}`
        : gate.final ? "Kovčeg je otvoren" : "Kapija je otvorena";

    return (
        <>
            {gate.onPress && (
                <button
                    type="button"
                    onClick={gate.onPress}
                    aria-label={label}
                    className="absolute rounded-[2rem] outline-offset-4"
                    style={{ left: end.x + spots.box.x, top: end.y + spots.box.y, width: spots.box.w, height: spots.box.h }}
                />
            )}
            {gate.chip && (
                <span
                    className={cn(
                        "pointer-events-none absolute flex h-9 -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-extrabold shadow-soft",
                        ready ? "bg-sun-300 text-ink" : "bg-white/95 text-ink"
                    )}
                    style={{ left: end.x, top: end.y + spots.chip }}
                    aria-hidden="true"
                >
                    <Star className="h-4 w-4 fill-sun-400 text-sun-500" />
                    {gate.state === "open" ? gate.stars : `${Math.min(gate.stars ?? 0, gate.need ?? 0)} / ${gate.need}`}
                    {gate.state === "open" ? (
                        <Check className="h-4 w-4 text-emerald-700" />
                    ) : (
                        <KeyRound className="h-4.5 w-4.5" style={{ color: ready ? "#9A5B00" : "#9AA0B4" }} />
                    )}
                </span>
            )}
            {gate.flying && !calm && <FlyingKey from={{ x: end.x + spots.key.x, y: end.y + spots.key.y }} to={{ x: end.x + spots.lock.x, y: end.y + spots.lock.y }} />}
        </>
    );
}

/** Ključ koji je lebdeo pored katanca uleti u bravu (blag luk, bez treperenja) */
function FlyingKey({ from, to }: { from: { x: number; y: number }; to: { x: number; y: number } }) {
    const w = 46;
    return (
        <span
            className="pointer-events-none absolute z-20"
            style={
                {
                    left: to.x - w / 2,
                    top: to.y - w / 2,
                    width: w,
                    height: w,
                    "--dx": `${from.x - to.x}px`,
                    "--dy": `${from.y - to.y}px`,
                    animation: `bm-key-fly ${KEY_FLY_MS}ms cubic-bezier(0.3, 0.7, 0.3, 1) both`,
                } as React.CSSProperties
            }
            aria-hidden="true"
        >
            <style>{"@keyframes bm-key-fly{0%{transform:translate(var(--dx),var(--dy)) scale(1) rotate(0)}55%{transform:translate(calc(var(--dx)*0.35),calc(var(--dy)*0.35 - 40px)) scale(1.25) rotate(-20deg)}100%{transform:translate(0,0) scale(0.8) rotate(90deg)}}"}</style>
            <svg viewBox="0 0 48 48" className="h-full w-full drop-shadow-md">
                <circle cx="15" cy="24" r="10" fill="#FFC83D" stroke="#C98A00" strokeWidth="3" />
                <circle cx="15" cy="24" r="3.5" fill="#FFF4CC" />
                <rect x="24" y="21" width="20" height="6" rx="3" fill="#FFC83D" stroke="#C98A00" strokeWidth="2" />
                <rect x="34" y="26" width="4" height="7" rx="1.5" fill="#C98A00" />
                <rect x="40" y="26" width="4" height="9" rx="1.5" fill="#C98A00" />
            </svg>
        </span>
    );
}

// ── Stanica ───────────────────────────────────────────────────────────────────

interface MapStopProps {
    index: number;
    layout: MapLayout;
    game: GameDefinition;
    done: number;
    status?: PlanStatus;
    locked: boolean;
    current: boolean;
    disabled: boolean;
    busy: boolean;
    priority: boolean;
    /** Boja tla mape (razmak oko prstena trenutne stanice i broja) */
    ground: string;
    onOpen: () => void;
}

function MapStop({ index, layout, game, done, status, locked, current, disabled, busy, priority, ground, onOpen }: MapStopProps) {
    const p = layout.nodes[index];
    const size = layout.nodeSize;
    const stars = stopStars(done);
    const ring = size / 2 - 3;
    const circumference = 2 * Math.PI * ring;
    const labelWidth = layout.lanes === 1 ? 150 : 168;
    const label = `${index + 1}. ${game.title}${locked ? ", zaključano" : ""}${current ? ", sada" : ""}. ${done} od ${MAX_LEVEL} nivoa.`;

    return (
        <li className="absolute" style={{ left: p.x - labelWidth / 2, top: p.y - size / 2, width: labelWidth }}>
            <button
                type="button"
                onClick={onOpen}
                disabled={disabled}
                aria-label={label}
                aria-current={current ? "step" : undefined}
                className={cn(
                    "group flex w-full flex-col items-center gap-1.5 rounded-3xl outline-offset-4",
                    locked ? "cursor-not-allowed" : busy ? "cursor-progress" : ""
                )}
            >
                <span
                    className={cn(
                        "relative block rounded-full bg-white p-1.5 shadow-lift transition-transform",
                        !disabled && "group-hover:-translate-y-0.5 group-active:translate-y-0.5",
                        current && "ring-4 ring-sun-300 ring-offset-2"
                    )}
                    style={{ width: size, height: size, ["--tw-ring-offset-color" as string]: ground }}
                >
                    {/* Napredak kroz 15 nivoa: luk oko slike */}
                    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                        <circle cx={size / 2} cy={size / 2} r={ring} fill="none" stroke="#EEEAF9" strokeWidth="5" />
                        {done > 0 && (
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={ring}
                                fill="none"
                                stroke={done >= MAX_LEVEL ? "#F5B400" : "#22A06B"}
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeDasharray={`${(circumference * done) / MAX_LEVEL} ${circumference}`}
                            />
                        )}
                    </svg>
                    <span className={cn("relative block h-full w-full overflow-hidden rounded-full bg-brand-50", locked && "opacity-55 grayscale")}>
                        <Image src={game.image} alt="" fill priority={priority} sizes={`${size}px`} className="object-cover" />
                    </span>
                    {/* Redni broj stanice */}
                    <span className="absolute -left-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-extrabold text-ink shadow-soft ring-2" style={{ ["--tw-ring-color" as string]: ground }} aria-hidden="true">
                        {index + 1}
                    </span>
                    {locked && (
                        <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
                            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink/75 text-white shadow-soft">
                                <Lock className="h-6 w-6" />
                            </span>
                        </span>
                    )}
                    {status === "done" && (
                        <span className="absolute -right-1 -top-1 grid h-8 w-8 place-items-center rounded-full bg-emerald-700 text-white shadow-soft" aria-hidden="true">
                            <Check className="h-5 w-5" />
                        </span>
                    )}
                </span>
                <span className="flex max-w-full flex-col items-center rounded-2xl bg-white/92 px-3 py-1.5 text-center shadow-soft">
                    <span className="line-clamp-2 font-display text-[0.95rem] font-extrabold leading-tight text-ink sm:text-base">{game.title}</span>
                    <span className="mt-0.5 flex gap-0.5 leading-none" aria-hidden="true">
                        {[1, 2, 3].map((s) => (
                            <Star key={s} className={cn("h-3.5 w-3.5", s <= stars ? "fill-sun-400 text-sun-500" : "fill-line text-line")} />
                        ))}
                    </span>
                </span>
            </button>
        </li>
    );
}

// ── Drugar na mapi ────────────────────────────────────────────────────────────

function MapCompanion({ layout, at, kind, skin, wear, calm }: { layout: MapLayout; at: number; kind: string; skin?: string; wear?: Record<string, string>; calm: boolean }) {
    const p = layout.nodes[at];
    if (!p) return null;
    const w = layout.lanes === 1 ? 78 : 104;
    const h = Math.round(w * 1.4);
    // Drugar stoji pored stanice, sa strane na kojoj ima više mesta
    const right = p.x < layout.width / 2;
    const gap = layout.nodeSize / 2 + (layout.lanes === 1 ? 36 : 44);
    const x = right ? p.x + gap : p.x - gap - w;
    const y = p.y + layout.nodeSize / 2 - h + 6;
    return (
        <div className="pointer-events-none absolute" style={{ left: Math.min(Math.max(x, 4), layout.width - w - 4), top: y, width: w, height: h }} aria-hidden="true">
            <span className="absolute inset-x-2 bottom-0 h-3 rounded-[50%] bg-ink/15 blur-[1px]" />
            <div className={cn("absolute inset-0", !calm && "animate-float")}>
                <CompanionPicture kind={kind} skin={skin} wear={wear} variant="full" eager className="h-full w-full" />
            </div>
        </div>
    );
}

// ── Nacrtani svet ─────────────────────────────────────────────────────────────

function MapWorld({ world, layout, current, gate, calm }: { world: WorldId; layout: MapLayout; current: number; gate: GateProps; calm: boolean }) {
    const { width, height, curves, nodeCurve, river, start, end } = layout;
    const road = curvesPath(curves);
    const colors = worldRoad(world);
    // Pređeni deo puta (do stanice na kojoj je drugar) je zlatan; deo do nje blago „teče”
    const reached = current > 0 ? nodeCurve[current] : 0;
    const donePath = reached > 0 ? curvesPath(curves, 0, reached) : "";
    const lead = current > 0 ? curvesPath(curves, nodeCurve[current - 1], nodeCurve[current]) : current === 0 ? curvesPath(curves, 0, nodeCurve[0]) : "";

    return (
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
                <style>{"@keyframes bm-map-dash{to{stroke-dashoffset:-36}}.bm-map-lead{animation:bm-map-dash 1.8s linear infinite}"}</style>
            </defs>
            {/* Tlo, brda, ukrasi i reka (ili lava, pesak, led) — svaka mapa svoje */}
            <WorldScenery world={world} layout={layout} calm={calm} />

            {/* Put: ivica, staza, isprekidana sredina */}
            <path d={road} fill="none" stroke={colors.edge} strokeWidth="32" strokeLinecap="round" strokeLinejoin="round" />
            <path d={road} fill="none" stroke={colors.fill} strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
            {donePath && <path d={donePath} fill="none" stroke={colors.done} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />}
            <path d={road} fill="none" stroke={colors.dash} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 16" opacity="0.9" />
            {/* Deo puta do stanice na kojoj je dete: tačkice polako teku (bez toga kad je „Manje animacija”) */}
            {lead && !calm && <path d={lead} className="bm-map-lead" fill="none" stroke="#F5A524" strokeWidth="5" strokeLinecap="round" strokeDasharray="0.5 17.5" />}

            {river && <WorldBridge world={world} x={river.cross.x} y={river.cross.y} angle={river.angle} />}

            <WorldStart world={world} x={start.x} y={start.y} />
            {/* Dok ključ leti, crtež ne crta svoj ključ pored katanca (to je baš ovaj što leti) */}
            <WorldGate world={world} x={end.x} y={end.y} state={gate.flying ? "locked" : gate.state} final={gate.final} calm={calm} />
        </svg>
    );
}
