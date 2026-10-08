"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import { isMuted } from "@/lib/sound";
import { ChoiceCard, Feedback, GameHud, GameStage, SpeakButton, playSfx, shuffle, useGameSync } from "@/app/components/games/kit";
import type { BaseView, ChoiceState, FeedbackKind, GameProps } from "@/app/components/games/kit";

// ── Zvukovi ───────────────────────────────────────────────────────────────────
// Redosled je od najpoznatijih ka težim: viši nivoi dodaju zvukove s kraja liste.
// Svaki unos ima i zvuk u /public/sounds i sliku u /public/soundImage.

type Category = "animal" | "nature" | "thing";

interface SoundItem {
    id: string;
    label: string;
    image: string;
    sound: string;
    category: Category;
}

const ITEMS: SoundItem[] = [
    { id: "dog", label: "Pas", image: "/soundImage/dog.webp", sound: "/sounds/pas.mp3", category: "animal" },
    { id: "cat", label: "Mačka", image: "/soundImage/cat.webp", sound: "/sounds/macka.mp3", category: "animal" },
    { id: "cow", label: "Krava", image: "/soundImage/cow.webp", sound: "/sounds/krava.wav", category: "animal" },
    { id: "rooster", label: "Petao", image: "/soundImage/cock.webp", sound: "/sounds/petao.wav", category: "animal" },
    { id: "pig", label: "Svinja", image: "/soundImage/pigg.webp", sound: "/sounds/svinja.mp3", category: "animal" },
    { id: "horse", label: "Konj", image: "/soundImage/horsee.webp", sound: "/sounds/konj.mp3", category: "animal" },
    { id: "bird", label: "Ptica", image: "/soundImage/bird.webp", sound: "/sounds/ptica.mp3", category: "animal" },
    { id: "car", label: "Auto", image: "/soundImage/car.webp", sound: "/sounds/sirenaAuta.mp3", category: "thing" },
    { id: "bell", label: "Zvono", image: "/soundImage/bell.webp", sound: "/sounds/zvonoKucno.mp3", category: "thing" },
    { id: "bear", label: "Medved", image: "/soundImage/bear.webp", sound: "/sounds/medved.mp3", category: "animal" },
    { id: "monkey", label: "Majmun", image: "/soundImage/monkey.webp", sound: "/sounds/majmun.mp3", category: "animal" },
    { id: "rain", label: "Kiša", image: "/soundImage/rain.webp", sound: "/sounds/kisa.mp3", category: "nature" },
    { id: "police", label: "Policija", image: "/soundImage/policeCar.webp", sound: "/sounds/policija.mp3", category: "thing" },
    { id: "thunder", label: "Grmljavina", image: "/soundImage/thunder.webp", sound: "/sounds/grmljavina.mp3", category: "nature" },
];

const ITEM_BY_ID: Record<string, SoundItem | undefined> = Object.fromEntries(ITEMS.map((item) => [item.id, item]));

/** Kiša, grmljavina i sirena traju dugo — zvuk se sam utiša posle ovoliko. */
const MAX_PLAY_MS = 6000;

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelConfig {
    rounds: number;
    /** Broj ponuđenih slika: lako 2–3, srednje 4, teško 6 */
    options: number;
    /** Koliko prvih zvukova sa liste učestvuje */
    pool: number;
    /** Pogrešne slike se biraju iz iste grupe kao tačna (životinje sa životinjama…) */
    similar?: boolean;
}

const LEVELS: LevelConfig[] = [
    { rounds: 5, options: 2, pool: 5 },
    { rounds: 5, options: 2, pool: 6 },
    { rounds: 5, options: 3, pool: 7 },
    { rounds: 5, options: 3, pool: 8 },
    { rounds: 6, options: 3, pool: 9 },
    { rounds: 5, options: 4, pool: 10 },
    { rounds: 5, options: 4, pool: 11 },
    { rounds: 6, options: 4, pool: 12 },
    { rounds: 6, options: 4, pool: 13 },
    { rounds: 6, options: 4, pool: 14 },
    { rounds: 5, options: 6, pool: 14 },
    { rounds: 6, options: 6, pool: 14 },
    { rounds: 6, options: 6, pool: 14, similar: true },
    { rounds: 6, options: 6, pool: 14, similar: true },
    { rounds: 6, options: 6, pool: 14, similar: true },
];

function levelIndex(level: number): number {
    return Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1 : 0;
}

interface Round {
    targetId: string;
    optionIds: string[];
}

/**
 * Sve runde nivoa unapred. Svaki zvuk se traži najviše jednom po nivou (pa se nikad
 * ne ponavlja u uzastopnim rundama), a zvukovi koji su novi na ovom nivou sigurno dolaze na red.
 */
function buildRounds(level: number): Round[] {
    const index = levelIndex(level);
    const config = LEVELS[index];
    const previousPool = index > 0 ? LEVELS[index - 1].pool : 0;
    const pool = ITEMS.slice(0, config.pool);
    const fresh = pool.slice(previousPool);
    const known = pool.slice(0, previousPool);
    const targets = shuffle([...shuffle(fresh), ...shuffle(known)].slice(0, config.rounds));

    return targets.map((target) => {
        let others = shuffle(pool.filter((item) => item.id !== target.id));
        if (config.similar) {
            others = [...others.filter((item) => item.category === target.category), ...others.filter((item) => item.category !== target.category)];
        }
        const options = shuffle([target, ...others.slice(0, config.options - 1)]);
        return { targetId: target.id, optionIds: options.map((item) => item.id) };
    });
}

// ── Stanje ────────────────────────────────────────────────────────────────────

export interface SoundToImageView extends BaseView {
    /** Zvuk koji se traži u ovoj rundi */
    targetId: string;
    optionIds: string[];
    /** Pogrešno izabrane slike u ovoj rundi (posle 2 stiže pomoć) */
    wrongIds: string[];
    pickedId: string | null;
    feedback: FeedbackKind;
    done: boolean;
}

function emptyView(level: number): SoundToImageView {
    return {
        score: 0,
        correctCount: 0,
        incorrectCount: 0,
        round: 1,
        totalRounds: LEVELS[levelIndex(level)].rounds,
        targetId: "",
        optionIds: [],
        wrongIds: [],
        pickedId: null,
        feedback: null,
        done: false,
    };
}

function num(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function knownIds(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && ITEM_BY_ID[id] !== undefined) : [];
}

/** Monitor dobija delimično (ili prazno) stanje — sve što fali ili je pogrešnog tipa menja podrazumevana vrednost. */
function mergeMonitor(base: SoundToImageView, incoming: Partial<SoundToImageView> | null | undefined): SoundToImageView {
    if (!incoming) return base;
    return {
        score: num(incoming.score, base.score),
        correctCount: num(incoming.correctCount, base.correctCount),
        incorrectCount: num(incoming.incorrectCount, base.incorrectCount),
        round: num(incoming.round, base.round),
        totalRounds: num(incoming.totalRounds, base.totalRounds),
        targetId: typeof incoming.targetId === "string" ? incoming.targetId : base.targetId,
        optionIds: knownIds(incoming.optionIds),
        wrongIds: knownIds(incoming.wrongIds),
        pickedId: typeof incoming.pickedId === "string" ? incoming.pickedId : null,
        feedback: incoming.feedback === "correct" || incoming.feedback === "wrong" ? incoming.feedback : null,
        done: incoming.done === true,
    };
}

// Raspored i veličine slika po broju ponuđenih odgovora (potpune klase, bez sklapanja).
const GRID: Record<number, string> = {
    2: "mx-auto max-w-xl grid-cols-2",
    3: "mx-auto max-w-2xl grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
    6: "mx-auto max-w-3xl grid-cols-2 sm:grid-cols-3 lg:max-w-none lg:grid-cols-6",
};

const IMAGE_SIZES: Record<number, string> = {
    2: "(min-width: 640px) 260px, 45vw",
    3: "(min-width: 640px) 200px, 30vw",
    4: "(min-width: 768px) 200px, 45vw",
    6: "(min-width: 1024px) 130px, (min-width: 640px) 230px, 45vw",
};

type Timer = ReturnType<typeof setTimeout>;

// ── Igra ──────────────────────────────────────────────────────────────────────

/*
 * Zvezdice (correct / total): total = broj rundi (zvukova) na nivou, correct = runde u kojima
 * je dete izabralo pravu sliku iz prvog pokušaja. Pogrešan izbor ne prekida rundu — dete
 * pokušava ponovo (uz pomoć posle 2 greške), ali ta runda se tada ne broji kao samostalno tačna.
 * Jedna pogođena runda od pet već donosi 1★.
 */
export default function SoundToImageGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<SoundToImageView>) {
    const accent = getGame("sound-to-image").accent;
    const { say, stop: stopSpeech } = useSpeech(gender);
    const sync = useGameSync<SoundToImageView>({ childId, gameId: "sound-to-image", level, isMonitor });

    const [rounds] = useState<Round[]>(() => buildRounds(level));
    const [view, setView] = useState<SoundToImageView>(() => ({ ...emptyView(level), ...rounds[0] }));
    const [playing, setPlaying] = useState(false);
    /** Pregledač je odbio automatsko puštanje — dugme tada blago pulsira dok ga dete ne dodirne */
    const [needsTap, setNeedsTap] = useState(false);

    const viewRef = useRef(view);
    const startedRef = useRef(false);
    const finishedRef = useRef(false);
    const lockedRef = useRef(false);
    /** Runda u kojoj je zvuk već pušten (da ga automatika ne pusti dvaput) */
    const playedRoundRef = useRef(0);
    const timersRef = useRef<Set<Timer>>(new Set());
    const retryTimerRef = useRef<Timer | null>(null);
    const cutTimerRef = useRef<Timer | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    /** Raste pri svakom puštanju/gašenju, da zakasneli događaji starog puštanja ne diraju novo */
    const playIdRef = useRef(0);
    const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    const shown = isMonitor ? mergeMonitor(emptyView(level), monitorState) : view;
    const target = ITEM_BY_ID[shown.targetId];
    const options = shown.optionIds.flatMap((id) => ITEM_BY_ID[id] ?? []);
    const solved = shown.feedback === "correct";
    const hinting = !solved && shown.wrongIds.length >= 2;
    const interactive = !isMonitor && !shown.done;

    // ── Zvuk ──────────────────────────────────────────────────────────────────

    const haltSound = useCallback(() => {
        playIdRef.current += 1;
        if (cutTimerRef.current) {
            clearTimeout(cutTimerRef.current);
            cutTimerRef.current = null;
        }
        const audio = audioRef.current;
        if (audio) {
            audio.onended = null;
            audio.onerror = null;
            audio.pause();
            audioRef.current = null;
        }
        setPlaying(false);
    }, []);

    const playSound = useCallback(
        (id: string) => {
            const item = ITEM_BY_ID[id];
            if (!item) return;
            stopSpeech();
            haltSound();

            let audio = cacheRef.current.get(id);
            if (!audio) {
                audio = new Audio(item.sound);
                cacheRef.current.set(id, audio);
            }
            const current = audio;
            const playId = playIdRef.current;
            /** Gasi ovo puštanje — osim ako ga je u međuvremenu zamenilo novije (ili je već ugašeno) */
            const release = () => {
                if (playIdRef.current !== playId) return false;
                haltSound();
                return true;
            };

            audioRef.current = current;
            current.muted = isMuted();
            current.currentTime = 0;
            current.onended = release;
            // Fajl ne može da se učita: umesto zvuka dete čuje reč, pa i dalje može da nađe sliku
            current.onerror = () => {
                if (release()) say(item.label);
            };
            cutTimerRef.current = setTimeout(release, MAX_PLAY_MS);
            setPlaying(true);
            setNeedsTap(false);

            current.play().catch((error: unknown) => {
                if (!release()) return;
                // Automatsko puštanje bez dodira nije dozvoljeno — čekamo da dete pritisne dugme
                if (error instanceof DOMException && error.name === "NotAllowedError") setNeedsTap(true);
            });
        },
        [haltSound, say, stopSpeech]
    );

    // Učitavanje zvukova nivoa unapred + gašenje svega kad igra nestane
    useEffect(() => {
        if (isMonitor) return;
        const cache = cacheRef.current;
        const timers = timersRef.current;
        for (const round of rounds) {
            const item = ITEM_BY_ID[round.targetId];
            if (!item || cache.has(item.id)) continue;
            const audio = new Audio();
            audio.preload = "auto";
            audio.src = item.sound;
            cache.set(item.id, audio);
        }
        return () => {
            timers.forEach(clearTimeout);
            timers.clear();
            if (cutTimerRef.current) clearTimeout(cutTimerRef.current);
            cutTimerRef.current = null;
            audioRef.current = null;
            cache.forEach((audio) => {
                audio.onended = null;
                audio.onerror = null;
                audio.pause();
                audio.removeAttribute("src");
                audio.load();
            });
            cache.clear();
        };
    }, [isMonitor, rounds]);

    useEffect(() => {
        if (isMonitor || startedRef.current) return;
        startedRef.current = true;
        sync.start(viewRef.current);
    }, [isMonitor, sync]);

    // Svaka runda sama pusti zvuk posle kratke pauze; pre prve se izgovori uputstvo.
    const round = view.round;
    const roundTargetId = view.targetId;
    const roundOver = view.done || view.feedback === "correct";
    useEffect(() => {
        if (isMonitor || roundOver) return;
        const pending: Timer[] = [];
        let cancelled = false;
        const autoPlay = () => {
            if (cancelled || playedRoundRef.current === round) return;
            playedRoundRef.current = round;
            playSound(roundTargetId);
        };
        if (round === 1) {
            const afterSpeech = () => {
                if (!cancelled) pending.push(setTimeout(autoPlay, 300));
            };
            pending.push(setTimeout(() => say("Poslušaj zvuk i dodirni pravu sliku.", afterSpeech), 500));
            // Ako kraj govora iz bilo kog razloga ne stigne, zvuk ipak krene
            pending.push(setTimeout(autoPlay, 5500));
        } else {
            pending.push(setTimeout(autoPlay, 700));
        }
        return () => {
            cancelled = true;
            pending.forEach(clearTimeout);
        };
    }, [isMonitor, round, roundTargetId, roundOver, playSound, say]);

    // ── Potezi ────────────────────────────────────────────────────────────────

    const later = (fn: () => void, ms: number): Timer => {
        const id = setTimeout(() => {
            timersRef.current.delete(id);
            fn();
        }, ms);
        timersRef.current.add(id);
        return id;
    };

    const commit = (next: SoundToImageView, log?: string) => {
        viewRef.current = next;
        setView(next);
        sync.update(next, log);
    };

    const cancelRetry = () => {
        if (!retryTimerRef.current) return;
        clearTimeout(retryTimerRef.current);
        timersRef.current.delete(retryTimerRef.current);
        retryTimerRef.current = null;
    };

    const replay = () => {
        if (!interactive || lockedRef.current) return;
        const current = viewRef.current;
        playedRoundRef.current = current.round;
        playSfx("tap");
        playSound(current.targetId);
        sync.update(current, "Ponovo pušta zvuk");
    };

    const pick = (id: string) => {
        if (!interactive || lockedRef.current) return;
        const current = viewRef.current;
        const picked = ITEM_BY_ID[id];
        const wanted = ITEM_BY_ID[current.targetId];
        if (!picked || !wanted || current.wrongIds.includes(id)) return;

        cancelRetry();
        haltSound();
        stopSpeech();
        playedRoundRef.current = current.round;

        if (id !== current.targetId) {
            const next: SoundToImageView = {
                ...current,
                pickedId: id,
                feedback: "wrong",
                wrongIds: [...current.wrongIds, id],
                incorrectCount: current.incorrectCount + 1,
            };
            playSfx("wrong");
            commit(next, `Pogrešno: ${picked.label.toLowerCase()} (traži se ${wanted.label.toLowerCase()})`);
            // Poruka se skloni, a zvuk se sam ponovi da dete može da pokuša opet
            retryTimerRef.current = later(() => {
                retryTimerRef.current = null;
                const latest = viewRef.current;
                if (latest.done || latest.feedback !== "wrong") return;
                commit({ ...latest, pickedId: null, feedback: null });
                playSound(latest.targetId);
            }, 1200);
            return;
        }

        lockedRef.current = true;
        const firstTry = current.wrongIds.length === 0;
        const answered: SoundToImageView = {
            ...current,
            pickedId: id,
            feedback: "correct",
            correctCount: current.correctCount + (firstTry ? 1 : 0),
            score: current.score + (firstTry ? 10 : 5),
        };
        const log = `Tačno: ${wanted.label.toLowerCase()}${firstTry ? " iz prve" : ` (pogrešnih pokušaja: ${current.wrongIds.length})`}`;

        if (current.round >= rounds.length) {
            if (finishedRef.current) return;
            finishedRef.current = true;
            const final: SoundToImageView = { ...answered, done: true };
            commit(final, `${log} — nivo je završen 🎉`);
            playSfx("win");
            later(() => {
                sync.complete(final);
                onComplete({ score: final.score, durationSec: sync.elapsedSec(), correct: final.correctCount, total: rounds.length });
            }, 1100);
            return;
        }

        playSfx("correct");
        commit(answered, log);
        later(() => {
            const upcoming = rounds[current.round];
            commit({ ...viewRef.current, ...upcoming, round: current.round + 1, wrongIds: [], pickedId: null, feedback: null });
            lockedRef.current = false;
        }, 1300);
    };

    // ── Prikaz ────────────────────────────────────────────────────────────────

    const stateOf = (id: string): ChoiceState => {
        if (solved) return id === shown.targetId ? "correct" : "dimmed";
        if (shown.feedback === "wrong" && id === shown.pickedId) return "wrong";
        if (shown.wrongIds.includes(id)) return "dimmed";
        return "idle";
    };

    const columns = options.length <= 2 ? 2 : options.length === 3 ? 3 : options.length === 4 ? 4 : 6;

    return (
        <GameStage>
            <GameHud round={shown.round} totalRounds={shown.totalRounds} score={shown.score} unit="Zvuk" />

            <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-card border-2 bg-surface p-3 shadow-soft sm:gap-6 sm:p-6", accent.border)}>
                <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-extrabold leading-snug text-ink sm:text-3xl">Šta čuješ?</p>
                    <p className="mt-1 hidden text-base font-bold text-ink-soft min-[420px]:block sm:text-lg">Poslušaj zvuk i dodirni pravu sliku</p>
                </div>
                {isMonitor ? (
                    <p className={cn("rounded-2xl px-4 py-3 text-base font-extrabold", accent.soft, accent.text)}>
                        <span aria-hidden="true">🔊 </span>
                        Traženi zvuk: {target ? target.label.toLowerCase() : "…"}
                    </p>
                ) : (
                    <SpeakButton
                        large
                        onClick={replay}
                        label={playing ? "Slušaj…" : "Pusti zvuk"}
                        className={cn("min-w-44", needsTap && !playing && interactive && "animate-soft-pulse")}
                    />
                )}
            </div>

            {options.length === 0 ? (
                <p className="rounded-card border border-dashed border-line bg-surface p-8 text-center text-base font-bold text-ink-soft">Čekamo sledeći zvuk…</p>
            ) : (
                <div className={cn("grid w-full gap-2 sm:gap-4", GRID[columns])}>
                    {options.map((item) => {
                        const state = stateOf(item.id);
                        const hinted = hinting && item.id === shown.targetId;
                        return (
                            <ChoiceCard
                                key={item.id}
                                state={state}
                                disabled={!interactive || solved || state === "dimmed"}
                                onClick={() => pick(item.id)}
                                className={cn("flex-col gap-2", hinted && "animate-soft-pulse ring-4 ring-brand-300")}
                            >
                                <span className="relative block aspect-[5/4] w-full overflow-hidden rounded-xl bg-brand-50 sm:aspect-square">
                                    <Image src={item.image} alt="" fill sizes={IMAGE_SIZES[columns]} className="object-cover" draggable={false} />
                                </span>
                                <span className="text-base leading-tight sm:text-lg">{item.label}</span>
                            </ChoiceCard>
                        );
                    })}
                </div>
            )}

            <Feedback
                kind={shown.feedback}
                correctText={target ? `Tačno! To je ${target.label.toLowerCase()}.` : undefined}
                wrongText={hinting ? "Pogledaj sliku koja svetli" : "Poslušaj još jednom"}
            />
        </GameStage>
    );
}
