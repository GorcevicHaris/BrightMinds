// app/dashboard/child/[id]/playVersus.tsx
"use client";

// „Takmičenje” (VS) u igri sa drugom — delovi ekrana zajednički za oba načina igre sa drugom:
// isti uređaj (playTogether.tsx, na smenu) i dva uređaja (playRemote.tsx). Igre se ne menjaju:
// ekran „VS” i rezultat žive u omotaču igre, pa rade u svakoj igri.
//
// Zašto ovako (istraživanja o igri dece od 3 do 10 godina i dece sa autizmom; reči i pravila
// su u lib/versus.ts): takmičenje deci ume da podigne napetost, pa se bira samo, a „Zajedno”
// je podrazumevano; ekran „VS” traje oko dve sekunde i dodir ga preskače; nema sata ni žurbe;
// trud se slavi kod oba deteta, pobednik se imenuje nežno, a nerešeno je „oboje ste super”.
// Ko nije pobedio nikad ne vidi tužno lice niti čuje tužan zvuk. „Manje animacija” gasi pokrete.
// Glas i tekst nikad ne kažu gde da se dodirne.
//
// Način dvoboja bira igra (lib/versusFormat.ts): „Dvoboj: ko je brži” ili „Dvoboj: jedan po
// jedan” piše na kartici poziva, na izboru igre i na ekranu „VS”. Na kraju poražen daje
// pobedniku mali ulog (lib/duelStakes.ts): tri novčića prelete od drugara poraženog do drugara
// pobednika, uz „Lejla dobija 3 novčića” i nežno „Amar daje 3 novčića — sledeći put možda ti!
// Bravo za trud.” Nerešeno: „Nerešeno — niko ne gubi novčiće.”

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowLeftRight, Check, Handshake, RotateCcw, Trophy, Zap } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { Button } from "@/app/components/ui/Button";
import { CoinIcon } from "@/app/components/ui/CoinIcon";
import { cn } from "@/lib/cn";
import { coinsPhrase, duelWinner, stakeLines, TIE_COINS_LINE } from "@/lib/duelStakes";
import { starsPhrase, type TogetherPlayer } from "@/lib/playTogether";
import { VS_INTRO_MS, versusTexts, type Gender, type PlayMode } from "@/lib/versus";
import { FORMAT_NAMES, duelLabel, type VersusFormat } from "@/lib/versusFormat";
import { LOOKS, PlayerPicture } from "./playTogether";

// ── Izbor: „Zajedno” ili „Takmičenje” ─────────────────────────────────────────

const MODE_OPTIONS: { mode: PlayMode; title: string; text: string }[] = [
    { mode: "together", title: "Zajedno", text: "Skupljamo zvezdice zajedno" },
    { mode: "versus", title: "Takmičenje", text: "Ko skupi više zvezdica?" },
];

/**
 * Dva velika dugmeta; „Zajedno” je podrazumevano. Kad je igra već poznata (`format`), ispod
 * „Takmičenje” piše kako se igra dvoboj („Dvoboj: ko je brži”) — bira ga igra, ne dete.
 */
export function ModeChoice({ mode, onChange, format, className }: { mode: PlayMode; onChange: (mode: PlayMode) => void; format?: VersusFormat; className?: string }) {
    return (
        <div role="radiogroup" aria-label="Kako igrate?" className={cn("grid grid-cols-2 gap-2 sm:gap-3", className)}>
            {MODE_OPTIONS.map((option) => {
                const on = option.mode === mode;
                const versus = option.mode === "versus";
                return (
                    <button
                        key={option.mode}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(option.mode)}
                        className={cn(
                            "flex min-h-16 items-center gap-2 rounded-tile border-2 border-b-[5px] p-2 text-left transition-[transform,border-width,background-color] active:translate-y-[3px] active:border-b-2 sm:gap-3 sm:p-3",
                            on ? (versus ? "border-sun-500 bg-sun-100" : "border-emerald-500 bg-emerald-50") : "border-line bg-surface hover:border-brand-200"
                        )}
                    >
                        <span
                            className={cn(
                                "grid h-10 w-10 shrink-0 place-items-center rounded-xl sm:h-12 sm:w-12",
                                versus ? "bg-ink text-sun-300" : "bg-emerald-600 text-white",
                                !on && "opacity-70"
                            )}
                            aria-hidden="true"
                        >
                            {versus ? <span className="font-display text-base font-black sm:text-lg">VS</span> : <Handshake className="h-6 w-6 sm:h-7 sm:w-7" />}
                        </span>
                        <span className="min-w-0">
                            <span className="block font-display text-base font-extrabold leading-tight text-ink sm:text-lg">{option.title}</span>
                            <span className="block text-xs font-bold leading-tight text-ink-soft sm:text-sm">{versus && format ? duelLabel(format) : option.text}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/** Mala oznaka „VS” (predvorje, traka u igri) */
export function VsMark({ className }: { className?: string }) {
    return (
        <span className={cn("grid shrink-0 place-items-center rounded-full bg-ink font-display font-black leading-none text-sun-300 shadow-soft ring-2 ring-white", className)} aria-hidden="true">
            VS
        </span>
    );
}

/** Zvezdice jednog igrača u takmičenju: „⭐ 3” (uz `of` kad deca imaju različit broj zadataka: „⭐ 3/4”) */
export function ScorePill({ name, stars, of, className }: { name: string; stars: number; of?: number | null; className?: string }) {
    return (
        <span
            className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-sun-100 px-2.5 py-1 font-extrabold tabular-nums text-sun-700 ring-1 ring-sun-300", className)}
            aria-label={of ? `${name}: ${stars} od ${of}` : `${name} ima ${starsPhrase(stars)}`}
        >
            <span aria-hidden="true">⭐</span>
            {stars}
            {of ? <span className="text-[0.8em] font-bold opacity-70">/{of}</span> : null}
        </span>
    );
}

/**
 * Način dvoboja kao mala oznaka: munja „ko je brži” ili strelice „jedan po jedan”. `full` piše
 * i „Dvoboj:” (kartica poziva, ekran „VS”); bez njega samo način (kartice igara).
 */
export function FormatChip({ format, full = false, className }: { format: VersusFormat; full?: boolean; className?: string }) {
    const Icon = format === "race" ? Zap : ArrowLeftRight;
    return (
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-xs font-extrabold leading-tight text-sun-200", className)}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {full ? duelLabel(format) : FORMAT_NAMES[format]}
        </span>
    );
}

/** Ulog pre dvoboja: „Ulog: 3 novčića” (bez uloga — ništa) */
export function StakeChip({ stake, className }: { stake: number; className?: string }) {
    if (stake <= 0) return null;
    return (
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-white/85 px-3 py-1 text-sm font-extrabold text-sun-700 ring-1 ring-sun-200", className)}>
            <CoinIcon className="h-4 w-4" />
            Ulog: {coinsPhrase(stake)}
        </span>
    );
}

// ── Ekran „VS” pre igre ────────────────────────────────────────────────────────

interface IntroProps {
    /** Levo: dete na ovom uređaju (ili prijavljeno dete), desno: drug */
    players: readonly [TogetherPlayer, TogetherPlayer];
    gameTitle: string;
    /** Način dvoboja (igra ga bira); bez njega piše samo „Takmičenje” */
    format?: VersusFormat;
    /** Ulog u novčićima (0 = bez uloga) */
    stake?: number;
    onDone: () => void;
}

/** Najduže koliko ekran „VS” čeka da se oba drugara nacrtaju pre nego što počne da broji vreme */
const PICTURES_WAIT_MS = 3000;

/**
 * Kratak ekran pre takmičenja: dva velika drugara okrenuta jedno drugom, imena ispod, krupno
 * „VS” između i naziv igre. Sam prelazi u igru posle oko dve sekunde; dodir ga preskače.
 * Vreme kreće tek kad su oba drugara nacrtana (slike se prave redom, pa na sporijem uređaju
 * prvi drugar ume da stigne kasnije) — dete uvek vidi i sebe i druga.
 */
export function VsIntro({ players, gameTitle, format, stake = 0, onDone }: IntroProps) {
    const calm = useCalmMotion();
    const doneRef = useRef(onDone);
    const drawn = useRef(new Set<number>());
    useEffect(() => {
        doneRef.current = onDone;
    }, [onDone]);
    useEffect(() => {
        // Vreme se meri tek kad je ekran nacrtan, i to samo vreme dok uređaj stiže da crta: na
        // sporijem tabletu crtanje drugara ume da zauzme pregledač, pa bi ekran inače samo bljesnuo
        let timer: ReturnType<typeof setTimeout> | undefined;
        let shown = 0;
        let last = 0;
        const since = performance.now();
        const tick = () => {
            const now = performance.now();
            // Dok se drugari ne nacrtaju (najduže PICTURES_WAIT_MS), vreme stoji
            if (drawn.current.size >= 2 || now - since >= PICTURES_WAIT_MS) shown += Math.min(now - last, 250);
            last = now;
            if (shown >= VS_INTRO_MS) doneRef.current();
            else timer = setTimeout(tick, 100);
        };
        let frame = requestAnimationFrame(() => {
            frame = requestAnimationFrame(() => {
                last = performance.now();
                timer = setTimeout(tick, 100);
            });
        });
        return () => {
            cancelAnimationFrame(frame);
            if (timer) clearTimeout(timer);
        };
    }, []);

    return (
        <button
            type="button"
            onClick={onDone}
            aria-label={`${format ? duelLabel(format) : "Takmičenje"}: ${players[0].name} i ${players[1].name}. ${gameTitle}.`}
            className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-card border-2 border-sun-200 bg-gradient-to-b from-sun-50 via-surface to-orange-50 px-3 py-4 text-center outline-none focus-visible:ring-4 focus-visible:ring-brand-300 sm:gap-5 [@media(max-height:30rem)]:gap-1.5 [@media(max-height:30rem)]:py-2"
        >
            <span className={cn("block max-w-full truncate font-display text-xl font-extrabold text-ink sm:text-3xl [@media(max-height:30rem)]:text-lg", !calm && "animate-fade")}>{gameTitle}</span>
            <span className="flex w-full max-w-2xl items-center justify-center gap-2 min-[400px]:gap-4 sm:gap-10">
                {players.map((player, index) => (
                    <span key={index} className={cn("flex min-w-0 flex-1 flex-col items-center gap-2", index === 1 && "order-3", !calm && (index === 0 ? "animate-vs-left" : "animate-vs-right"))}>
                        <PlayerPicture
                            player={player}
                            look={LOOKS[index]}
                            onReady={() => drawn.current.add(index)}
                            // Drugari gledaju jedan u drugog: desni je u ogledalu
                            className={cn(
                                "aspect-square w-full max-w-36 min-[400px]:max-w-40 sm:max-w-56 [@media(max-height:30rem)]:max-w-28",
                                index === 1 && "-scale-x-100"
                            )}
                        />
                        <span className={cn("block max-w-full truncate font-display text-xl font-extrabold sm:text-3xl [@media(max-height:30rem)]:text-lg", LOOKS[index].text)}>{player.name}</span>
                    </span>
                ))}
                <span className="order-2 flex shrink-0 flex-col items-center">
                    <VsMark className={cn("h-16 w-16 text-2xl ring-4 sm:h-24 sm:w-24 sm:text-4xl [@media(max-height:30rem)]:h-14 [@media(max-height:30rem)]:w-14 [@media(max-height:30rem)]:text-xl", !calm && "animate-pop [animation-delay:0.35s]")} />
                </span>
            </span>
            <span className={cn("flex flex-wrap items-center justify-center gap-2", !calm && "animate-fade-up [animation-delay:0.5s]")}>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-base font-extrabold text-sun-700 ring-1 ring-sun-200 sm:text-lg [@media(max-height:30rem)]:py-1 [@media(max-height:30rem)]:text-base">
                    {format === "turns" ? <ArrowLeftRight className="h-5 w-5" aria-hidden="true" /> : format === "race" ? <Zap className="h-5 w-5" aria-hidden="true" /> : <Trophy className="h-5 w-5" aria-hidden="true" />}
                    {format ? duelLabel(format) : "Takmičenje"}
                </span>
                <StakeChip stake={stake} className="text-base sm:text-lg [@media(max-height:30rem)]:text-sm" />
            </span>
        </button>
    );
}

// ── Kraj takmičenja ─────────────────────────────────────────────────────────────

export interface VersusSeat {
    player: TogetherPlayer;
    gender?: Gender;
    /** Zvezdice u takmičenju (tačni iz prvog pokušaja); null dok drug još igra */
    score: number | null;
    /** Broj zadataka u nivou (kad ga deca imaju različit, poredi se udeo tačnih) */
    total?: number | null;
    /** Vreme nivoa u sekundama (trka: razrešava isti rezultat); 0 = ne zna se */
    secs?: number;
    /** Ispod imena: novčići (svoje dete) ili pohvala (drug) */
    badge?: ReactNode;
    dim?: boolean;
}

/**
 * Ulog na kraju dvoboja (lib/duelStakes.ts): "off" — bez uloga (drug bez naloga, ulog 0 ili
 * igra „zajedno”), "pending" — server još obračunava, "settled" — `amount` je preneto (0 kad
 * poražen nema novčića), "failed" — obračun nije uspeo (bez prenosa; samo ime pobednika).
 */
export interface DuelCoins {
    state: "off" | "pending" | "settled" | "failed";
    amount: number;
}

interface VersusEndProps {
    seats: readonly [VersusSeat, VersusSeat];
    /** Način dvoboja: u trci isti rezultat razrešava vreme */
    format?: VersusFormat;
    /** Ulog i prenos novčića; bez njega ekran ne govori o novčićima */
    coins?: DuelCoins;
    /** Kad drug još igra (ili je otišao): rečenica umesto rezultata */
    waitingLine?: string | null;
    limitReached: boolean;
    saved: "saving" | "ok" | "failed";
    /** „Revanš”; bez njega dugme se ne prikazuje (npr. dok drug još igra) */
    onRematch?: () => void;
    rematchLabel?: string;
    onLeave: () => void;
    adultNote: ReactNode;
}

/** Pobednik po rezultatima sedišta (udeo tačnih kad su brojevi zadataka različiti, vreme u trci) */
export function seatWinner(seats: readonly [VersusSeat, VersusSeat], format: VersusFormat = "race"): 0 | 1 | null {
    const score = (seat: VersusSeat) => ({ correct: seat.score ?? 0, total: seat.total ?? 0, secs: seat.secs ?? 0 });
    const a = score(seats[0]);
    const b = score(seats[1]);
    // Bez broja zadataka (stari pozivi): samo zvezdice
    if (!a.total || !b.total) return a.correct === b.correct ? null : a.correct > b.correct ? 0 : 1;
    return duelWinner(format, a, b);
}

/** Najviše novčića koji lete (ulog je 3 ili 5) */
const FLYING_COINS_MAX = 5;
const COIN_FLIGHT_MS = 950;
const COIN_GAP_MS = 220;

/**
 * Novčići lete od drugara poraženog do drugara pobednika (kratko, jednom, mekim lukom). Uz
 * „Manje animacija” ne lete: odmah se vidi „+3” kod pobednika. `onLanded` javlja kad su sleteli.
 */
function CoinFlight({ from, to, box, count, onLanded }: { from: RefObject<HTMLElement | null>; to: RefObject<HTMLElement | null>; box: RefObject<HTMLElement | null>; count: number; onLanded: () => void }) {
    const calm = useCalmMotion();
    const layer = useRef<HTMLSpanElement>(null);
    const landed = useRef(onLanded);
    useEffect(() => {
        landed.current = onLanded;
    }, [onLanded]);
    useEffect(() => {
        const start = from.current?.getBoundingClientRect();
        const end = to.current?.getBoundingClientRect();
        const frame = box.current?.getBoundingClientRect();
        const coins = Array.from(layer.current?.children ?? []) as HTMLElement[];
        if (calm || !start || !end || !frame || coins.length === 0 || typeof coins[0].animate !== "function") {
            landed.current();
            return;
        }
        const x0 = start.left + start.width / 2 - frame.left;
        const y0 = start.top + start.height / 2 - frame.top;
        const x1 = end.left + end.width / 2 - frame.left;
        const y1 = end.top + end.height / 2 - frame.top;
        const lift = Math.max(36, Math.min(90, Math.abs(x1 - x0) / 3));
        const animations = coins.map((coin, index) =>
            coin.animate(
                [
                    { transform: `translate(${x0}px, ${y0}px) scale(0.6)`, opacity: 0 },
                    { transform: `translate(${x0}px, ${y0 - 10}px) scale(1)`, opacity: 1, offset: 0.12 },
                    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - lift}px) scale(1.15)`, opacity: 1, offset: 0.55 },
                    { transform: `translate(${x1}px, ${y1}px) scale(0.8)`, opacity: 1, offset: 0.92 },
                    { transform: `translate(${x1}px, ${y1}px) scale(0.5)`, opacity: 0 },
                ],
                { duration: COIN_FLIGHT_MS, delay: 350 + index * COIN_GAP_MS, easing: "cubic-bezier(0.35, 0, 0.25, 1)", fill: "both" }
            )
        );
        let alive = true;
        const land = () => {
            if (!alive) return;
            alive = false;
            landed.current();
        };
        void Promise.all(animations.map((a) => a.finished.catch(() => undefined))).then(land);
        // Osigurač: „+3” se pojavi i kad pregledač uspori ili zaustavi animaciju (kartica u pozadini)
        const fallback = setTimeout(land, 350 + COIN_FLIGHT_MS + (coins.length - 1) * COIN_GAP_MS + 400);
        return () => {
            alive = false;
            clearTimeout(fallback);
            animations.forEach((a) => a.cancel());
        };
    }, [calm, from, to, box]);
    return (
        <span ref={layer} className="pointer-events-none absolute inset-0 z-20 overflow-visible" aria-hidden="true">
            {Array.from({ length: Math.min(count, FLYING_COINS_MAX) }, (_, i) => (
                <CoinIcon key={i} className="absolute left-0 top-0 -ml-6 -mt-6 h-12 w-12 opacity-0 drop-shadow-[0_3px_6px_rgba(232,163,23,0.55)] sm:-ml-7 sm:-mt-7 sm:h-14 sm:w-14" />
            ))}
        </span>
    );
}

/**
 * Kraj takmičenja: oba drugara sa svojim zvezdicama, pa nežno ime pobednika („Lejla je
 * pobedila! ⭐ 4 : 3”) i — kad ima uloga — novčići koji prelete od poraženog do pobednika, uz
 * „Lejla dobija 3 novčića” i „Amar daje 3 novčića — sledeći put možda ti! Bravo za trud.”.
 * Nerešeno: „Nerešeno — oboje ste super!” i „niko ne gubi novčiće”. Bez tužnog lica i zvuka;
 * „Revanš” i „Gotovo”.
 */
export function VersusEnd({ seats, format = "race", coins, waitingLine = null, limitReached, saved, onRematch, rematchLabel = "Revanš", onLeave, adultNote }: VersusEndProps) {
    const calm = useCalmMotion();
    const panelRef = useRef<HTMLDivElement>(null);
    const rowRef = useRef<HTMLDivElement>(null);
    const pictureRefs = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)] as const;
    const [landed, setLanded] = useState(false);
    useEffect(() => {
        panelRef.current?.focus();
    }, []);

    const ready = waitingLine === null && seats[0].score !== null && seats[1].score !== null;
    const scores: [number, number] = [seats[0].score ?? 0, seats[1].score ?? 0];
    const totals: [number, number] | null = seats[0].total && seats[1].total ? [seats[0].total, seats[1].total] : null;
    const players: [{ name: string; gender: Gender }, { name: string; gender: Gender }] = [
        { name: seats[0].player.name, gender: seats[0].gender ?? null },
        { name: seats[1].player.name, gender: seats[1].gender ?? null },
    ];
    const texts = versusTexts(players, scores, { winner: seatWinner(seats, format), totals });
    const winner = ready ? texts.winner : null;
    const loser = winner === null ? null : winner === 0 ? 1 : 0;
    const settled = ready && coins?.state === "settled";
    const moved = settled && winner !== null ? coins.amount : 0;
    const lines = stakeLines(players, winner, moved);
    // Novčići su sleteli (ili ne lete): „+3” kod pobednika
    const showPlus = moved > 0 && (landed || calm);

    return (
        <div
            className="absolute inset-0 z-10 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-6 [@media(max-height:36rem)]:p-2"
            role="alertdialog"
            aria-modal="true"
            aria-label={ready ? texts.title : "Nivo je gotov"}
        >
            <div
                ref={panelRef}
                tabIndex={-1}
                className="max-h-full w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-[2rem] bg-surface px-5 pb-5 pt-6 text-center shadow-pop outline-none sm:rounded-[2rem] sm:p-8 [@media(max-height:36rem)]:max-w-2xl [@media(max-height:36rem)]:px-4 [@media(max-height:36rem)]:pb-3 [@media(max-height:36rem)]:pt-3"
            >
                <div ref={rowRef} className="relative flex items-start justify-center gap-2 sm:gap-6">
                    {seats.map((seat, index) => {
                        const won = winner === index;
                        return (
                            <div key={index} className={cn("flex min-w-0 flex-1 flex-col items-center gap-1.5", index === 1 && "order-3")}>
                                <span ref={pictureRefs[index]} className="relative">
                                    <PlayerPicture
                                        player={seat.player}
                                        look={LOOKS[index]}
                                        dim={seat.dim}
                                        className={cn(
                                            "h-24 w-24 sm:h-32 sm:w-32 [@media(max-height:36rem)]:h-16 [@media(max-height:36rem)]:w-16",
                                            won && "ring-[6px] ring-sun-400",
                                            index === 1 && "-scale-x-100"
                                        )}
                                    />
                                    {won && (
                                        <span
                                            className={cn("absolute -right-2 -top-2 grid h-10 w-10 place-items-center rounded-full bg-sun-400 text-ink shadow-soft ring-4 ring-white", !calm && "animate-pop")}
                                            aria-hidden="true"
                                        >
                                            <Trophy className="h-5 w-5" />
                                        </span>
                                    )}
                                    {won && showPlus && (
                                        <span
                                            className={cn(
                                                "absolute -bottom-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-0.5 whitespace-nowrap rounded-full bg-sun-300 px-2 py-0.5 text-base font-black tabular-nums text-ink shadow-soft ring-2 ring-white",
                                                !calm && "animate-pop"
                                            )}
                                            aria-hidden="true"
                                        >
                                            +{moved} <CoinIcon className="h-4 w-4" />
                                        </span>
                                    )}
                                </span>
                                <span className={cn("block max-w-full truncate font-display text-lg font-extrabold", LOOKS[index].text)}>{seat.player.name}</span>
                                <span className="flex flex-col items-center gap-1.5 [@media(max-height:36rem)]:flex-row">
                                    {seat.score !== null ? (
                                        <ScorePill name={seat.player.name} stars={seat.score} of={totals && totals[0] !== totals[1] ? seat.total : null} className={cn("text-xl sm:text-2xl", won && "bg-sun-200 ring-2 ring-sun-400")} />
                                    ) : (
                                        <span className="inline-flex min-h-9 items-center rounded-full bg-canvas px-3 text-sm font-extrabold text-ink-soft">…</span>
                                    )}
                                    {seat.badge}
                                </span>
                            </div>
                        );
                    })}
                    <span className="order-2 flex shrink-0 self-center pt-2 sm:pt-0">
                        <VsMark className="h-11 w-11 text-base sm:h-14 sm:w-14 sm:text-xl" />
                    </span>
                    {moved > 0 && loser !== null && winner !== null && (
                        <CoinFlight from={pictureRefs[loser]} to={pictureRefs[winner]} box={rowRef} count={moved} onLanded={() => setLanded(true)} />
                    )}
                </div>

                {ready ? (
                    <div className="mt-4 [@media(max-height:36rem)]:mt-2">
                        <h2 className="text-2xl font-extrabold text-ink sm:text-3xl [@media(max-height:36rem)]:text-xl">
                            {texts.title} <span className="whitespace-nowrap text-sun-700">{texts.score}</span>
                        </h2>
                        {winner === null ? (
                            <>
                                <p className="mt-1 text-lg font-extrabold text-orange-700 sm:text-xl [@media(max-height:36rem)]:text-base">{texts.praise}</p>
                                {coins && coins.state !== "off" && <p className="mt-1 text-base font-bold text-ink-soft sm:text-lg [@media(max-height:36rem)]:text-sm">{TIE_COINS_LINE}</p>}
                            </>
                        ) : moved > 0 ? (
                            // Nizak ekran (telefon na boku): obe rečenice u jednom redu, da „Revanš” i „Gotovo” stanu bez pomeranja
                            <div className="mt-1 space-y-0.5 [@media(max-height:36rem)]:flex [@media(max-height:36rem)]:flex-wrap [@media(max-height:36rem)]:items-center [@media(max-height:36rem)]:justify-center [@media(max-height:36rem)]:gap-x-3 [@media(max-height:36rem)]:space-y-0" role="status">
                                <p className="inline-flex items-center gap-1.5 text-lg font-extrabold text-sun-700 sm:text-xl [@media(max-height:36rem)]:text-sm">
                                    <CoinIcon className="h-5 w-5 [@media(max-height:36rem)]:h-4 [@media(max-height:36rem)]:w-4" />
                                    {lines.winner}
                                </p>
                                <p className="text-base font-bold text-orange-700 sm:text-lg [@media(max-height:36rem)]:text-sm">{lines.loser}</p>
                            </div>
                        ) : (
                            <p className="mt-1 text-lg font-extrabold text-orange-700 sm:text-xl [@media(max-height:36rem)]:text-base">{texts.praise}</p>
                        )}
                        {/* Dok server obračunava ulog: mirna rečenica iste visine (ekran ne skače) */}
                        {winner !== null && coins?.state === "pending" && (
                            <p className="mt-1 text-sm font-bold text-ink-faint" role="status">
                                Brojimo novčiće…
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="mt-4 [@media(max-height:36rem)]:mt-2">
                        <h2 className="text-2xl font-extrabold text-ink sm:text-3xl [@media(max-height:36rem)]:text-xl">Nivo je gotov!</h2>
                        <p className="mt-1 text-lg font-bold text-ink-soft" role="status" aria-live="polite">
                            {waitingLine}
                        </p>
                    </div>
                )}
                {limitReached && <p className="mt-2 text-base font-semibold text-ink-soft">Za danas smo završili. Vidimo se sledeći put.</p>}

                {/* Tablet i računar (i telefon na boku): „Revanš” i „Gotovo” jedno pored drugog, da sve stane bez pomeranja */}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row [@media(max-height:36rem)]:mt-3 [@media(max-height:36rem)]:flex-row">
                    {!limitReached && onRematch && (
                        <Button chunky size="xl" variant="sun" block onClick={onRematch} className="max-sm:px-4 [@media(max-height:36rem)]:min-h-13 [@media(max-height:36rem)]:text-lg">
                            <RotateCcw className="h-6 w-6" aria-hidden="true" />
                            {rematchLabel}
                        </Button>
                    )}
                    <Button chunky size="xl" variant="secondary" block onClick={onLeave} className="[@media(max-height:36rem)]:min-h-13 [@media(max-height:36rem)]:text-lg">
                        <Check className="h-6 w-6" aria-hidden="true" />
                        {limitReached ? "Gotovo za danas" : "Gotovo"}
                    </Button>
                </div>
                <p className="mt-4 border-t border-line pt-3 text-sm font-semibold normal-case text-ink-faint [@media(max-height:36rem)]:mt-2 [@media(max-height:36rem)]:line-clamp-2 [@media(max-height:36rem)]:pt-2 [@media(max-height:36rem)]:text-xs">
                    <span className="font-extrabold text-ink-soft">Za odrasle:</span> {adultNote}
                </p>
                <p className="mt-1 min-h-5 text-xs font-bold normal-case text-ink-faint [@media(max-height:36rem)]:mt-0 [@media(max-height:36rem)]:min-h-0" aria-live="polite">
                    {saved === "failed" && "Nema interneta. Rezultat nije sačuvan."}
                </p>
            </div>
        </div>
    );
}

// ── Probni prikaz dvoboja (samo /dev/invite, u razvoju) ─────────────────────────

export type DuelScene = "vs-intro" | "vs-intro-turns" | "vs-win" | "vs-lose" | "vs-tie" | "vs-zero" | "vs-pending";

/**
 * Ekran „VS” i kraj dvoboja sa izmišljenom decom (Lejla i Amar), bez mreže: za pregled izgleda
 * na svim veličinama ekrana. Dugmad ne rade ništa.
 */
export function DuelScenePreview({ scene }: { scene: DuelScene }) {
    const lejla: TogetherPlayer = { name: "Lejla", kind: "girl" };
    const amar: TogetherPlayer = { name: "Amar", kind: "dog" };
    const idle = () => undefined;
    if (scene === "vs-intro" || scene === "vs-intro-turns") {
        return (
            <div className="fixed inset-0 flex flex-col p-2 sm:p-5">
                <VsIntro players={[lejla, amar]} gameTitle={scene === "vs-intro" ? "Pogodi oblik" : "Spoji parove"} format={scene === "vs-intro" ? "race" : "turns"} stake={scene === "vs-intro" ? 3 : 0} onDone={idle} />
            </div>
        );
    }
    const scores: Record<Exclude<DuelScene, "vs-intro" | "vs-intro-turns">, [number, number]> = { "vs-win": [5, 3], "vs-lose": [2, 4], "vs-tie": [4, 4], "vs-zero": [5, 3], "vs-pending": [5, 3] };
    const [mine, theirs] = scores[scene];
    const coins: DuelCoins = scene === "vs-pending" ? { state: "pending", amount: 0 } : scene === "vs-zero" ? { state: "settled", amount: 0 } : { state: "settled", amount: scene === "vs-tie" ? 0 : 3 };
    return (
        // Kao u igri: kraj pokriva ceo ekran igre
        <div className="fixed inset-0 overflow-hidden bg-sun-50">
            <VersusEnd
                seats={[
                    { player: lejla, gender: "female", score: mine, total: 6, secs: 40, badge: <span className="inline-flex items-center gap-1 rounded-full bg-sun-100 px-3 py-1 text-base font-extrabold text-sun-700 ring-1 ring-sun-300">+ 6 <CoinIcon className="h-5 w-5" /></span> },
                    { player: amar, score: theirs, total: 6, secs: 40 },
                ]}
                format="race"
                coins={coins}
                limitReached={false}
                saved="ok"
                onRematch={idle}
                onLeave={idle}
                adultNote="isti zadaci za oba deteta; više tačnih pobeđuje (kad je isto — kraće vreme). Poraženi daje do 3 novčića, nikad više nego što ima (ulog: podešavanja deteta)."
            />
        </div>
    );
}
