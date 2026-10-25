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

import { useEffect, useRef, type ReactNode } from "react";
import { Check, Handshake, RotateCcw, Trophy } from "lucide-react";
import { useCalmMotion } from "@/app/components/avatar/motion";
import { Button } from "@/app/components/ui/Button";
import { cn } from "@/lib/cn";
import { starsPhrase, type TogetherPlayer } from "@/lib/playTogether";
import { VS_INTRO_MS, versusTexts, type Gender, type PlayMode } from "@/lib/versus";
import { LOOKS, PlayerPicture } from "./playTogether";

// ── Izbor: „Zajedno” ili „Takmičenje” ─────────────────────────────────────────

const MODE_OPTIONS: { mode: PlayMode; title: string; text: string }[] = [
    { mode: "together", title: "Zajedno", text: "Skupljamo zvezdice zajedno" },
    { mode: "versus", title: "Takmičenje", text: "Ko skupi više zvezdica?" },
];

/** Dva velika dugmeta; „Zajedno” je podrazumevano. */
export function ModeChoice({ mode, onChange, className }: { mode: PlayMode; onChange: (mode: PlayMode) => void; className?: string }) {
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
                            <span className="block text-xs font-bold leading-tight text-ink-soft sm:text-sm">{option.text}</span>
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

/** Zvezdice jednog igrača u takmičenju: „⭐ 3” */
export function ScorePill({ name, stars, className }: { name: string; stars: number; className?: string }) {
    return (
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full bg-sun-100 px-2.5 py-1 font-extrabold tabular-nums text-sun-700 ring-1 ring-sun-300", className)} aria-label={`${name} ima ${starsPhrase(stars)}`}>
            <span aria-hidden="true">⭐</span>
            {stars}
        </span>
    );
}

// ── Ekran „VS” pre igre ────────────────────────────────────────────────────────

interface IntroProps {
    /** Levo: dete na ovom uređaju (ili prijavljeno dete), desno: drug */
    players: readonly [TogetherPlayer, TogetherPlayer];
    gameTitle: string;
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
export function VsIntro({ players, gameTitle, onDone }: IntroProps) {
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
            aria-label={`Takmičenje: ${players[0].name} i ${players[1].name}. ${gameTitle}.`}
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
            <span className={cn("inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-base font-extrabold text-sun-700 ring-1 ring-sun-200 sm:text-lg", !calm && "animate-fade-up [animation-delay:0.5s]")}>
                <Trophy className="h-5 w-5" aria-hidden="true" />
                Takmičenje
            </span>
        </button>
    );
}

// ── Kraj takmičenja ─────────────────────────────────────────────────────────────

export interface VersusSeat {
    player: TogetherPlayer;
    gender?: Gender;
    /** Zvezdice u takmičenju; null dok drug još igra */
    score: number | null;
    /** Ispod imena: novčići (svoje dete) ili pohvala (drug) */
    badge?: ReactNode;
    dim?: boolean;
}

interface VersusEndProps {
    seats: readonly [VersusSeat, VersusSeat];
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

/**
 * Kraj takmičenja: oba drugara sa svojim zvezdicama, pa nežno ime pobednika („Lejla je
 * pobedila! ⭐ 4 : 3”) i topla pohvala drugom detetu. Nerešeno: „Nerešeno — oboje ste super!”.
 * Bez tužnog lica i zvuka; „Revanš” i „Gotovo”.
 */
export function VersusEnd({ seats, waitingLine = null, limitReached, saved, onRematch, rematchLabel = "Revanš", onLeave, adultNote }: VersusEndProps) {
    const calm = useCalmMotion();
    const panelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        panelRef.current?.focus();
    }, []);

    const ready = waitingLine === null && seats[0].score !== null && seats[1].score !== null;
    const scores: [number, number] = [seats[0].score ?? 0, seats[1].score ?? 0];
    const texts = versusTexts(
        [
            { name: seats[0].player.name, gender: seats[0].gender ?? null },
            { name: seats[1].player.name, gender: seats[1].gender ?? null },
        ],
        scores
    );
    const winner = ready ? texts.winner : null;

    return (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-ink/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="alertdialog" aria-modal="true" aria-label={ready ? texts.title : "Nivo je gotov"}>
            <div
                ref={panelRef}
                tabIndex={-1}
                className="max-h-full w-full max-w-lg animate-fade-up overflow-y-auto rounded-t-[2rem] bg-surface px-5 pb-5 pt-6 text-center shadow-pop outline-none sm:rounded-[2rem] sm:p-8 [@media(max-height:36rem)]:max-w-2xl [@media(max-height:36rem)]:px-4 [@media(max-height:36rem)]:pb-3 [@media(max-height:36rem)]:pt-3"
            >
                <div className="flex items-start justify-center gap-2 sm:gap-6">
                    {seats.map((seat, index) => {
                        const won = winner === index;
                        return (
                            <div key={index} className={cn("flex min-w-0 flex-1 flex-col items-center gap-1.5", index === 1 && "order-3")}>
                                <span className="relative">
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
                                </span>
                                <span className={cn("block max-w-full truncate font-display text-lg font-extrabold", LOOKS[index].text)}>{seat.player.name}</span>
                                <span className="flex flex-col items-center gap-1.5 [@media(max-height:36rem)]:flex-row">
                                    {seat.score !== null ? (
                                        <ScorePill name={seat.player.name} stars={seat.score} className={cn("text-xl sm:text-2xl", won && "bg-sun-200 ring-2 ring-sun-400")} />
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
                </div>

                {ready ? (
                    <div className="mt-4 [@media(max-height:36rem)]:mt-2">
                        <h2 className="text-2xl font-extrabold text-ink sm:text-3xl [@media(max-height:36rem)]:text-xl">
                            {texts.title} <span className="whitespace-nowrap text-sun-700">{texts.score}</span>
                        </h2>
                        <p className="mt-1 text-lg font-extrabold text-orange-700 sm:text-xl [@media(max-height:36rem)]:text-base">{texts.praise}</p>
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

                <div className="mt-5 flex flex-col gap-3 [@media(max-height:36rem)]:mt-3 [@media(max-height:36rem)]:flex-row">
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
                <p className="mt-4 border-t border-line pt-3 text-sm font-semibold normal-case text-ink-faint [@media(max-height:36rem)]:mt-2 [@media(max-height:36rem)]:pt-2 [@media(max-height:36rem)]:text-xs">
                    <span className="font-extrabold text-ink-soft">Za odrasle:</span> {adultNote}
                </p>
                <p className="mt-1 min-h-5 text-xs font-bold normal-case text-ink-faint" aria-live="polite">
                    {saved === "failed" && "Nema interneta. Rezultat nije sačuvan."}
                </p>
            </div>
        </div>
    );
}
