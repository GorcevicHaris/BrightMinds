"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { getGame } from "@/lib/games";
import { useSpeech } from "@/lib/speech";
import { animalImage } from "@/lib/pictures";
import { gameSoundsEnabled, playWithFade, useMuted } from "@/lib/sound";
import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import {
    ChoiceCard,
    DemoHand,
    demoRounds,
    Feedback,
    finiteOr,
    GameHud,
    GameStage,
    useBubbleTail,
    hintDue,
    playSfx,
    shuffle,
    useGameSync,
    useInputGuard,
    useTimers,
    WaitingNote,
} from "@/app/components/games/kit";
import type { BaseView, ChoiceState, FeedbackKind, GameProps, TimerId } from "@/app/components/games/kit";
import { OwlPicture, WindPicture, type SoundPicture } from "./SoundPictures";

// ── Zvukovi ───────────────────────────────────────────────────────────────────
// Svaki unos ima zvuk u /public/sounds i sliku: fotografiju iz /public/soundImage (`image`)
// ili, kad fotografije nema, crtež iz SoundPictures.tsx (`Art`).
//
// Redosled je od tihih i poznatih ka naglim: viši nivoi dodaju zvukove s kraja liste,
// a prva četiri su tiha, pa svaki nivo ima šta da pusti i kad su glasni zvuci isključeni.
// Tihih zvukova je sedam (mačka, krava, svinja, ptica, kiša, sova, vetar); svi su na listi
// do nivoa 4, pa dete kome su glasni zvuci isključeni ne sluša stalno istih pet.
//
// `loud` označava nagle ili oštre zvuke (lavež, sirena, grmljavina, zvono…). Oni se puštaju
// samo ako je roditelj to dozvolio; njihove slike i dalje mogu biti ponuđene kao odgovor.
// `level` ujednačava jačinu snimaka (izmereno na fajlovima: najglasnija sekunda svakog
// snimka svedena je na oko −20 dBFS), da nijedan zvuk ne bude mnogo glasniji od ostalih.

type Category = "animals" | "vehicles" | "weather" | "home";

interface SoundItemBase {
    id: string;
    label: string;
    sound: string;
    category: Category;
    loud: boolean;
    /** Udeo izabrane jačine kojim se pušta ovaj snimak (0–1) */
    level: number;
}

/** Slika zvuka: putanja do fotografije ili crtež (SVG komponenta) — tačno jedno od ta dva. */
type SoundItem = SoundItemBase & ({ image: string; Art?: undefined } | { Art: SoundPicture; image?: undefined });

const ITEMS: SoundItem[] = [
    { id: "cat", label: "Mačka", image: animalImage("cat"), sound: "/sounds/macka.mp3", category: "animals", loud: false, level: 0.3 },
    { id: "cow", label: "Krava", image: animalImage("cow"), sound: "/sounds/krava.wav", category: "animals", loud: false, level: 0.4 },
    { id: "pig", label: "Svinja", image: animalImage("pig"), sound: "/sounds/svinja.mp3", category: "animals", loud: false, level: 1 },
    { id: "bird", label: "Ptica", image: animalImage("bird"), sound: "/sounds/ptica.mp3", category: "animals", loud: false, level: 1 },
    { id: "dog", label: "Pas", image: animalImage("dog"), sound: "/sounds/pas.mp3", category: "animals", loud: true, level: 0.65 },
    { id: "rain", label: "Kiša", image: "/soundImage/rain.webp", sound: "/sounds/kisa.mp3", category: "weather", loud: false, level: 1 },
    // Sova i vetar: NIKO IH JOŠ NIJE PRESLUŠAO. Jačina je namerno oprezna i određena samo merenjem fajla
    // (isti postupak kao za ostale: najglasnija sekunda na oko −20 dBFS; vetar se meri u prvih 6 s, koliko se
    // i pušta). Pre objave ih treba preslušati na uređaju i proveriti da nijedan ne počinje naglo.
    { id: "owl", label: "Sova", Art: OwlPicture, sound: "/sounds/sova.mp3", category: "animals", loud: false, level: 0.45 },
    { id: "horse", label: "Konj", image: animalImage("horse"), sound: "/sounds/konj.mp3", category: "animals", loud: true, level: 0.5 },
    { id: "wind", label: "Vetar", Art: WindPicture, sound: "/sounds/vetar.mp3", category: "weather", loud: false, level: 0.35 },
    { id: "rooster", label: "Petao", image: animalImage("rooster"), sound: "/sounds/petao.wav", category: "animals", loud: true, level: 0.7 },
    { id: "car", label: "Auto", image: "/soundImage/car.webp", sound: "/sounds/sirenaAuta.mp3", category: "vehicles", loud: true, level: 0.55 },
    { id: "bell", label: "Zvono", image: "/soundImage/bell.webp", sound: "/sounds/zvonoKucno.mp3", category: "home", loud: true, level: 0.85 },
    { id: "bear", label: "Medved", image: animalImage("bear"), sound: "/sounds/medved.mp3", category: "animals", loud: true, level: 1 },
    { id: "monkey", label: "Majmun", image: animalImage("monkey"), sound: "/sounds/majmun.mp3", category: "animals", loud: true, level: 1 },
    { id: "police", label: "Policija", image: "/soundImage/policeCar.webp", sound: "/sounds/policija.mp3", category: "vehicles", loud: true, level: 1 },
    { id: "thunder", label: "Grmljavina", image: "/soundImage/thunder.webp", sound: "/sounds/grmljavina.mp3", category: "weather", loud: true, level: 0.7 },
];

const ITEM_BY_ID: Record<string, SoundItem | undefined> = Object.fromEntries(ITEMS.map((item) => [item.id, item]));

/** Kiša, grmljavina i sirena traju dugo — zvuk se sam utiša posle ovoliko. */
const MAX_PLAY_MS = 6000;
/** Posle tačnog odgovora: najkraća pauza i najduže čekanje da glas završi rečenicu */
const MIN_FEEDBACK_MS = 1300;
const MAX_FEEDBACK_MS = 4000;
const SPEAK_DELAY_MS = 450;
/** Na uskim telefonima staju najviše četiri dovoljno velike slike */
const NARROW_SCREEN = "(max-width: 639px)";
const NARROW_MAX_OPTIONS = 4;

function isNarrowScreen(): boolean {
    return typeof window !== "undefined" && window.matchMedia(NARROW_SCREEN).matches;
}

// ── Tekstovi ──────────────────────────────────────────────────────────────────
// Jedno uputstvo u jednom trenutku, kratko i doslovno.

const SAY_LISTEN = "Dodirni dugme i poslušaj zvuk.";
/** Od drugog zvuka dete već zna šta se radi — dovoljna je jedna reč */
const SAY_LISTEN_SHORT = "Poslušaj zvuk.";
const SAY_CHOOSE = "Šta čuješ? Dodirni sliku.";
const SAY_LISTEN_FIRST = "Prvo pusti zvuk.";
const WRONG_TEXT = "Nije to. Poslušaj još jednom.";
const WRONG_HINT_TEXT = "Nije to. Pogledaj sliku koja svetli.";
const SOUND_OFF_TEXT = "Zvuk je isključen. Za ovu igru treba zvuk.";
const SOUND_OFF_ADULT_TEXT = "Odrasli: uključite zvuk dugmetom sa zvučnikom gore desno ili u podešavanjima deteta.";

function correctText(item: SoundItem): string {
    return `To je ${item.label.toLowerCase()}.`;
}

// ── Nivoi ─────────────────────────────────────────────────────────────────────

interface LevelConfig {
    rounds: number;
    /** Broj ponuđenih slika: lako 2–3, srednje 4, teško 6 (pre ograničenja iz podešavanja) */
    options: number;
    /** Koliko prvih zvukova sa liste učestvuje */
    pool: number;
    /** Pogrešne slike se biraju iz iste grupe kao tačna (životinje sa životinjama…) */
    similar?: boolean;
    /** Ispod slika nema reči: prepoznaje se samo po slici */
    noLabels?: boolean;
}

// Svaki nivo ima iste zvukove kao pre dodavanja sove i vetra, plus njih dva čim dođu na red
// (sova od nivoa 3, vetar od nivoa 4).
const LEVELS: LevelConfig[] = [
    { rounds: 5, options: 2, pool: 5 },
    { rounds: 5, options: 2, pool: 6 },
    { rounds: 5, options: 3, pool: 8 },
    { rounds: 5, options: 3, pool: 10 },
    { rounds: 6, options: 3, pool: 11 },
    { rounds: 5, options: 4, pool: 12 },
    { rounds: 5, options: 4, pool: 13 },
    { rounds: 6, options: 4, pool: 14 },
    { rounds: 6, options: 4, pool: 15 },
    { rounds: 6, options: 4, pool: 16 },
    // Teško: svi zvuci su poznati, pa svaki nivo menja način biranja — više slika, slične slike,
    // pa slike bez reči ispod (snimaka nema više, zato se ne dodaju novi zvuci)
    { rounds: 5, options: 6, pool: 16 },
    { rounds: 6, options: 6, pool: 16 },
    { rounds: 6, options: 6, pool: 16, similar: true },
    { rounds: 6, options: 6, pool: 16, similar: true, noLabels: true },
    { rounds: 7, options: 6, pool: 16, similar: true, noLabels: true },
];

function levelIndex(level: number): number {
    return Number.isFinite(level) ? Math.min(Math.max(Math.round(level), 1), LEVELS.length) - 1 : 0;
}

interface Round {
    targetId: string;
    optionIds: string[];
}

interface RoundLimits {
    /** Roditelj je dozvolio nagle i glasne zvuke */
    loudSounds: boolean;
    maxRounds: number;
    /** Najviše ponuđenih slika (podešavanja deteta i širina ekrana) */
    maxOptions: number;
}

/**
 * Sve runde nivoa unapred. Traže se samo zvuci koji smeju da se puste. Zvuci koji su novi
 * na ovom nivou sigurno dolaze na red. Kad dozvoljenih zvukova ima manje nego rundi,
 * zvuci se ponavljaju, ali nikad dva puta zaredom.
 */
function buildRounds(level: number, { loudSounds, maxRounds, maxOptions }: RoundLimits): Round[] {
    const index = levelIndex(level);
    const config = LEVELS[index];
    const previousPool = index > 0 ? LEVELS[index - 1].pool : 0;
    const pool = ITEMS.slice(0, config.pool);
    const playable = (item: SoundItem) => loudSounds || !item.loud;

    // Ako bi nivo ostao sa manje od dva zvuka, uzimaju se dozvoljeni zvuci sa cele liste
    const inPool = pool.filter(playable);
    const candidates = inPool.length >= 2 ? inPool : ITEMS.filter(playable);
    const roundCount = candidates.length >= 2 ? Math.max(1, Math.min(config.rounds, maxRounds)) : candidates.length;

    const fresh = candidates.filter((item) => ITEMS.indexOf(item) >= previousPool);
    const known = candidates.filter((item) => ITEMS.indexOf(item) < previousPool);
    const targets = shuffle([...shuffle(fresh), ...shuffle(known)].slice(0, roundCount));
    while (targets.length < roundCount) {
        const again = shuffle(candidates);
        const next = again[0] === targets[targets.length - 1] ? [...again.slice(1), again[0]] : again;
        targets.push(...next.slice(0, roundCount - targets.length));
    }

    const optionCount = Math.min(config.options, maxOptions, pool.length);
    return targets.map((target) => {
        let others = shuffle(pool.filter((item) => item.id !== target.id));
        if (config.similar) {
            others = [...others.filter((item) => item.category === target.category), ...others.filter((item) => item.category !== target.category)];
        }
        const options = shuffle([target, ...others.slice(0, optionCount - 1)]);
        return { targetId: target.id, optionIds: options.map((item) => item.id) };
    });
}

// ── Stanje ────────────────────────────────────────────────────────────────────

export interface SoundToImageView extends BaseView {
    /** Zvuk koji se traži u ovoj rundi */
    targetId: string;
    optionIds: string[];
    /** Pogrešno izabrane slike u ovoj rundi */
    wrongIds: string[];
    pickedId: string | null;
    feedback: FeedbackKind;
    /** Dete je u ovoj rundi bar jednom pustilo zvuk */
    heard: boolean;
    /** Tačna slika je istaknuta (pomoć posle grešaka) */
    hint: boolean;
    /** Runde rešene tek pošto je tačna slika istaknuta */
    promptedCount: number;
    /** Zvuk je isključen: umesto runde stoji obaveštenje i ništa se ne broji */
    soundOff: boolean;
    done: boolean;
}

const EMPTY_VIEW: SoundToImageView = {
    score: 0,
    correctCount: 0,
    incorrectCount: 0,
    round: 1,
    totalRounds: 1,
    targetId: "",
    optionIds: [],
    wrongIds: [],
    pickedId: null,
    feedback: null,
    heard: false,
    hint: false,
    promptedCount: 0,
    soundOff: false,
    done: false,
};

function knownIds(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && ITEM_BY_ID[id] !== undefined) : [];
}

/** Monitor dobija delimično (ili prazno) stanje — sve što fali ili je pogrešnog tipa menja podrazumevana vrednost. */
function mergeMonitor(incoming: Partial<SoundToImageView> | null | undefined): SoundToImageView {
    if (!incoming) return EMPTY_VIEW;
    return {
        score: finiteOr(incoming.score, 0),
        correctCount: finiteOr(incoming.correctCount, 0),
        incorrectCount: finiteOr(incoming.incorrectCount, 0),
        round: finiteOr(incoming.round, 1),
        totalRounds: finiteOr(incoming.totalRounds, 1),
        targetId: typeof incoming.targetId === "string" ? incoming.targetId : "",
        optionIds: knownIds(incoming.optionIds),
        wrongIds: knownIds(incoming.wrongIds),
        pickedId: typeof incoming.pickedId === "string" ? incoming.pickedId : null,
        feedback: incoming.feedback === "correct" || incoming.feedback === "wrong" ? incoming.feedback : null,
        heard: incoming.heard === true,
        hint: incoming.hint === true,
        promptedCount: finiteOr(incoming.promptedCount, 0),
        soundOff: incoming.soundOff === true,
        done: incoming.done === true,
    };
}

// Raspored i veličine slika po broju ponuđenih odgovora (potpune klase, bez sklapanja).
const GRID: Record<number, string> = {
    2: "mx-auto max-w-xl grid-cols-2 xl:max-w-2xl",
    3: "mx-auto max-w-2xl grid-cols-3 xl:max-w-4xl",
    4: "grid-cols-2 md:grid-cols-4",
    6: "mx-auto max-w-3xl grid-cols-2 sm:grid-cols-3 lg:max-w-none lg:grid-cols-6",
};

const IMAGE_SIZES: Record<number, string> = {
    2: "(min-width: 1280px) 320px, (min-width: 640px) 260px, 45vw",
    3: "(min-width: 1280px) 280px, (min-width: 640px) 200px, 30vw",
    4: "(min-width: 768px) 200px, 45vw",
    6: "(min-width: 1024px) 130px, (min-width: 640px) 230px, 45vw",
};

// ── Dugme „Pusti zvuk” ────────────────────────────────────────────────────────

interface PlayButtonProps {
    playing: boolean;
    /** Kratko (tri mirna talasa) skreće pažnju na dugme: na početku runde i posle pogrešnog izbora */
    cue: boolean;
    /** Ruka pokazuje dugme (prvi zvuk prvog nivoa) */
    demo?: boolean;
    onClick: () => void;
}

const BAR_DELAYS = ["[animation-delay:0ms]", "[animation-delay:300ms]", "[animation-delay:600ms]", "[animation-delay:900ms]"];
const BAR_HEIGHTS = ["h-3", "h-6", "h-4", "h-7"];

/** Jedino mesto odakle kreće zvuk. Dok zvuk traje, umesto trougla stoje stubići koji mirno trepere. */
function PlayButton({ playing, cue, demo = false, onClick }: PlayButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative inline-flex min-h-20 w-full min-w-48 shrink-0 items-center justify-center gap-3 rounded-2xl border-2 border-b-[5px] px-7 font-display text-xl font-extrabold text-white transition-[transform,background-color,border-width] active:translate-y-[3px] active:border-b-2 sm:w-auto sm:text-2xl",
                playing ? "border-emerald-800 bg-emerald-600" : "border-brand-700 bg-brand-500 hover:bg-brand-600",
                cue && !playing && "animate-[soft-pulse_1.8s_ease-in-out_3]"
            )}
        >
            {playing ? (
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center gap-1">
                    {BAR_DELAYS.map((delay, i) => (
                        <span key={delay} className={cn("w-1.5 animate-pulse rounded-full bg-white", BAR_HEIGHTS[i], delay)} />
                    ))}
                </span>
            ) : (
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" />
                </svg>
            )}
            {playing ? "Zvuk se čuje" : "Pusti zvuk"}
            {demo && <DemoHand />}
        </button>
    );
}

// ── Igra ──────────────────────────────────────────────────────────────────────

/*
 * Rezultat: total = broj rundi (zvukova) na nivou, correct = runde u kojima je dete izabralo
 * pravu sliku iz prvog pokušaja, prompted = runde rešene tek pošto je prava slika istaknuta.
 * Pogrešan izbor ne prekida rundu — dete pokušava ponovo.
 *
 * Zvuk nikad ne kreće sam: pušta ga samo dete dugmetom „Pusti zvuk”, uvek uz postepeno
 * pojačavanje i jačinu iz podešavanja. Dok zvuk nije pušten, slike se ne broje kao odgovor.
 */
export default function SoundToImageGame({ childId, level, gender, onComplete, isMonitor = false, monitorState }: GameProps<SoundToImageView>) {
    const accent = getGame("sound-to-image").accent;
    const settings = useChildSettings();
    const { say, stop: stopSpeech } = useSpeech(gender);
    const sync = useGameSync<SoundToImageView>({ childId, gameId: "sound-to-image", level, isMonitor });
    const guard = useInputGuard();
    const { after, cancel } = useTimers();

    // Monitor ne poznaje podešavanja deteta: crta isključivo ono što stigne u `monitorState`.
    const [rounds] = useState<Round[]>(() =>
        isMonitor
            ? []
            : buildRounds(level, {
                  loudSounds: settings.loudSounds,
                  maxRounds: settings.preset.maxRounds,
                  maxOptions: isNarrowScreen() ? Math.min(settings.choiceLimit, NARROW_MAX_OPTIONS) : settings.choiceLimit,
              })
    );
    const [view, setView] = useState<SoundToImageView>(() => ({
        ...EMPTY_VIEW,
        ...rounds[0],
        totalRounds: Math.max(rounds.length, 1),
        soundOff: !isMonitor && !gameSoundsEnabled(),
    }));
    const [playing, setPlaying] = useState(false);
    /** Raste svaki put kad dete proveri zvuk, a on je i dalje isključen — obaveštenje tada kratko „odgovori” */
    const [soundChecks, setSoundChecks] = useState(0);

    const viewRef = useRef(view);
    const aliveRef = useRef(true);
    const startedRef = useRef(false);
    const finishedRef = useRef(false);
    const lockedRef = useRef(false);
    /** Posle prvog odslušanog zvuka glas jednom kaže šta je sledeći korak */
    const chooseSaidRef = useRef(false);
    const cutTimerRef = useRef<TimerId | null>(null);
    const introTimer = useRef<TimerId | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    /** Raste pri svakom puštanju/gašenju, da zakasneli događaji starog puštanja ne diraju novo */
    const playIdRef = useRef(0);
    const cacheRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    const shown = isMonitor ? mergeMonitor(monitorState) : view;
    const target = ITEM_BY_ID[shown.targetId];
    const options = shown.optionIds.flatMap((id) => ITEM_BY_ID[id] ?? []);
    const tail = useBubbleTail();
    const solved = shown.feedback === "correct";
    const showLabels = !LEVELS[levelIndex(level)].noLabels;
    // Prvi zvuk prvog nivoa se pokazuje rukom: prvo dugme za zvuk, pa tačna slika
    const firstDemo = !isMonitor && level === 1 && shown.round === 1 && !shown.feedback && !shown.soundOff;
    // Slike sledećeg zvuka se učitavaju dok dete rešava tekući, da nova runda ne „iskače” deo po deo
    const upcomingImages = isMonitor ? [] : (rounds[shown.round]?.optionIds ?? []).flatMap((id) => ITEM_BY_ID[id]?.image ?? []);
    const interactive = !isMonitor && !shown.done;

    // ── Zvuk ──────────────────────────────────────────────────────────────────

    const haltSound = useCallback(() => {
        playIdRef.current += 1;
        cancel(cutTimerRef.current);
        cutTimerRef.current = null;
        const audio = audioRef.current;
        if (audio) {
            audio.onended = null;
            audio.onerror = null;
            audio.pause();
            audioRef.current = null;
        }
        setPlaying(false);
    }, [cancel]);

    const playSound = useCallback(
        (item: SoundItem) => {
            stopSpeech();
            haltSound();

            let audio = cacheRef.current.get(item.id);
            if (!audio) {
                audio = new Audio(item.sound);
                cacheRef.current.set(item.id, audio);
            }
            const current = audio;
            const playId = playIdRef.current;
            /** Gasi ovo puštanje — osim ako ga je u međuvremenu zamenilo novije (ili je već ugašeno) */
            const release = () => {
                if (playIdRef.current !== playId) return false;
                haltSound();
                return true;
            };
            /** Zvuk je odslušan do kraja: prvi put glas kaže sledeći korak */
            const finish = () => {
                if (!release() || chooseSaidRef.current) return;
                chooseSaidRef.current = true;
                void say(SAY_CHOOSE);
            };

            audioRef.current = current;
            current.currentTime = 0;
            current.onended = finish;
            // Fajl ne može da se učita: umesto zvuka dete čuje reč, pa i dalje može da nađe sliku
            current.onerror = () => {
                if (release()) void say(item.label);
            };
            cutTimerRef.current = after(MAX_PLAY_MS, finish);
            setPlaying(true);

            // Bez naglog početka: zvuk kreće tiho i pojačava se do jačine koju je izabrao roditelj
            // Ni tada dete ne ostaje bez traga: umesto zvuka čuje reč
            playWithFade(current, item.level).catch(() => {
                if (release()) void say(item.label);
            });
        },
        [after, haltSound, say, stopSpeech]
    );

    // Učitavanje zvukova nivoa unapred + gašenje svega kad igra nestane
    useEffect(() => {
        if (isMonitor) return;
        const cache = cacheRef.current;
        for (const round of rounds) {
            const item = ITEM_BY_ID[round.targetId];
            if (!item || cache.has(item.id)) continue;
            const audio = new Audio();
            audio.preload = "auto";
            audio.src = item.sound;
            cache.set(item.id, audio);
        }
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
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
        guard.hold();
        sync.start(viewRef.current);
    }, [isMonitor, guard, sync]);

    // Runda počinje izgovorenim uputstvom; zvuk čeka da ga dete samo pusti.
    const round = view.round;
    const soundOff = view.soundOff;
    const levelDone = view.done;
    useEffect(() => {
        if (isMonitor || levelDone) return;
        const id = after(SPEAK_DELAY_MS, () => {
            introTimer.current = null;
            void say(soundOff ? SOUND_OFF_TEXT : round > 1 ? SAY_LISTEN_SHORT : SAY_LISTEN);
        });
        introTimer.current = id;
        return () => cancel(id);
    }, [isMonitor, round, soundOff, levelDone, after, cancel, say]);

    // ── Potezi ────────────────────────────────────────────────────────────────

    const commit = (next: SoundToImageView, log?: string) => {
        viewRef.current = next;
        setView(next);
        sync.update(next, log);
    };

    // Dugme sa zvučnikom gasi i zvuk zadatka koji upravo svira — odmah, ne tek pri sledećem dodiru
    const [muted] = useMuted();
    const muteRef = useRef({ haltSound, commit });
    useEffect(() => {
        muteRef.current = { haltSound, commit };
    });
    useEffect(() => {
        if (isMonitor || !muted) return;
        const current = viewRef.current;
        muteRef.current.haltSound();
        if (current.done || current.soundOff || current.feedback === "correct") return;
        muteRef.current.commit({ ...current, soundOff: true, pickedId: null, feedback: null }, "Zvuk je isključen — igra čeka");
    }, [isMonitor, muted]);

    /** Nastavlja kad prođe najkraća pauza i kad glas završi rečenicu (ili posle najdužeg čekanja). */
    const sayThen = (text: string, proceed: () => void) => {
        let waiting = 2;
        let finished = false;
        const finish = () => {
            if (finished || !aliveRef.current) return;
            finished = true;
            proceed();
        };
        const step = () => {
            waiting -= 1;
            if (waiting === 0) finish();
        };
        after(MIN_FEEDBACK_MS, step);
        after(MAX_FEEDBACK_MS, finish);
        void say(text, step, "happy");
    };

    const play = () => {
        // Uzastopni dodiri ne pokreću zvuk više puta
        if (!interactive || lockedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const item = ITEM_BY_ID[current.targetId];
        if (!item || current.soundOff) return;

        if (!gameSoundsEnabled()) {
            haltSound();
            commit({ ...current, soundOff: true, pickedId: null, feedback: null }, "Zvuk je isključen — igra čeka");
            return;
        }
        // Kratka pauza unosa: slučajan drugi dodir ne sme da izabere sliku pre nego što se zvuk čuje
        guard.hold();
        // Uputstvo koje tek treba da krene ne sme da se izgovori preko zvuka
        cancel(introTimer.current);
        introTimer.current = null;
        playSound(item);
        commit({ ...current, heard: true, pickedId: null, feedback: null }, current.heard ? "Ponovo pušta zvuk" : "Pušta zvuk");
    };

    const retrySound = () => {
        const current = viewRef.current;
        if (!interactive || !current.soundOff) return;
        if (!gameSoundsEnabled()) {
            setSoundChecks((count) => count + 1);
            return;
        }
        guard.hold();
        commit({ ...current, soundOff: false }, "Zvuk je uključen — igra se nastavlja");
    };

    const pick = (id: string) => {
        if (!interactive || lockedRef.current || guard.blocked()) return;
        const current = viewRef.current;
        const picked = ITEM_BY_ID[id];
        const wanted = ITEM_BY_ID[current.targetId];
        if (!picked || !wanted || current.soundOff || current.wrongIds.includes(id)) return;

        // Slika dodirnuta pre zvuka nije odgovor: ništa se ne broji, glas samo podseti na prvi korak
        if (!current.heard) {
            guard.hold();
            void say(SAY_LISTEN_FIRST);
            return;
        }

        haltSound();
        stopSpeech();

        if (id !== current.targetId) {
            const wrongIds = [...current.wrongIds, id];
            // Tačna slika se ističe posle `hintAfter` grešaka (0 = nikad), a najkasnije kad ostane samo ona
            const hint = hintDue(settings.hintAfter, wrongIds.length, current.optionIds.length - 1);
            // Uzastopni brzi dodiri posle greške ne broje se kao nove greške
            guard.hold();
            playSfx("wrong");
            commit(
                { ...current, pickedId: id, feedback: "wrong", wrongIds, hint, incorrectCount: current.incorrectCount + 1 },
                `Pogrešno: ${picked.label.toLowerCase()} (traži se ${wanted.label.toLowerCase()})${hint && !current.hint ? " — prikazana pomoć" : ""}`
            );
            // Zvuk se ne ponavlja sam: dugme „Pusti zvuk” kratko zasvetli, a dete odlučuje
            void say(hint ? WRONG_HINT_TEXT : WRONG_TEXT);
            return;
        }

        lockedRef.current = true;
        // Zvuk koji je pokazala ruka (prvi u prvom nivou) je pokazivanje, a ne zadatak: ne boduje se
        const modeled = level === 1 && current.round === 1 && current.wrongIds.length === 0;
        const firstTry = current.wrongIds.length === 0 && !modeled;
        const answered: SoundToImageView = {
            ...current,
            pickedId: id,
            feedback: "correct",
            correctCount: current.correctCount + (firstTry ? 1 : 0),
            promptedCount: current.promptedCount + (current.hint ? 1 : 0),
            score: current.score + (firstTry ? 10 : 5),
        };
        const how = firstTry ? " iz prve" : current.hint || modeled ? " uz pomoć" : ` (pogrešnih pokušaja: ${current.wrongIds.length})`;
        const log = `Tačno: ${wanted.label.toLowerCase()}${how}`;
        playSfx("correct");

        if (current.round >= rounds.length) {
            if (finishedRef.current) return;
            finishedRef.current = true;
            const final: SoundToImageView = { ...answered, done: true };
            commit(final, `${log} — nivo je završen`);
            sayThen(correctText(wanted), () => {
                sync.complete(final);
                onComplete({
                    score: final.score,
                    durationSec: sync.elapsedSec(),
                    correct: final.correctCount,
                    total: Math.max(rounds.length - demoRounds(level, rounds.length), 1),
                    prompted: final.promptedCount,
                });
            });
            return;
        }

        commit(answered, log);
        sayThen(correctText(wanted), () => {
            const upcoming = rounds[current.round];
            guard.hold();
            commit({ ...viewRef.current, ...upcoming, round: current.round + 1, wrongIds: [], pickedId: null, feedback: null, heard: false, hint: false });
            lockedRef.current = false;
        });
    };

    // ── Prikaz ────────────────────────────────────────────────────────────────

    const stateOf = (id: string): ChoiceState => {
        if (solved) return id === shown.targetId ? "correct" : "dimmed";
        if (shown.feedback === "wrong" && id === shown.pickedId) return "wrong";
        if (shown.wrongIds.includes(id)) return "dimmed";
        return shown.hint && id === shown.targetId ? "hint" : "idle";
    };

    const columns = options.length <= 2 ? 2 : options.length === 3 ? 3 : options.length === 4 ? 4 : 6;
    const instruction = shown.heard ? SAY_CHOOSE : SAY_LISTEN;
    // Dugme zasvetli na početku runde i posle pogrešnog izbora; kad svetli tačna slika, dugme miruje
    const cue = interactive && !solved && !shown.hint && (!shown.heard || shown.feedback === "wrong");

    return (
        <GameStage>
            <GameHud
                round={shown.round}
                totalRounds={shown.totalRounds}
                score={isMonitor || settings.preset.showPoints ? shown.score : undefined}
                unit="Zvuk"
                onSpeak={isMonitor || shown.soundOff ? undefined : () => void say(instruction)}
            />

            {shown.soundOff ? (
                <section
                    key={soundChecks}
                    aria-live="polite"
                    className={cn("flex animate-pop flex-col items-center gap-4 rounded-card border-2 bg-surface p-6 text-center shadow-soft sm:p-8", accent.border)}
                >
                    <svg className={cn("h-16 w-16", accent.text)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
                        <path d="m16 9.5 5 5M21 9.5l-5 5" strokeLinecap="round" />
                    </svg>
                    <p className="font-display text-xl font-extrabold leading-snug text-ink sm:text-3xl">{SOUND_OFF_TEXT}</p>
                    {/* Red za odrasle: ostaje u običnom pisanju i kad su detetu uključena velika slova */}
                    <p className="max-w-md text-base font-bold normal-case text-ink-soft">{SOUND_OFF_ADULT_TEXT}</p>
                    {!isMonitor && (
                        <button
                            type="button"
                            onClick={retrySound}
                            className="inline-flex min-h-20 items-center justify-center rounded-2xl border-2 border-b-[5px] border-brand-700 bg-brand-500 px-8 font-display text-xl font-extrabold text-white transition-[transform,background-color,border-width] hover:bg-brand-600 active:translate-y-[3px] active:border-b-2 sm:text-2xl"
                        >
                            Probaj ponovo
                        </button>
                    )}
                </section>
            ) : (
                <>
                    <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-card border-2 bg-surface p-3 shadow-soft sm:gap-6 sm:p-6 short:sm:p-4", accent.border, tail)}>
                        <p className="min-w-0 flex-1 basis-40 font-display text-xl font-extrabold leading-snug text-ink sm:text-3xl">{instruction}</p>
                        {isMonitor ? (
                            <p className={cn("rounded-2xl px-4 py-3 text-base font-extrabold", accent.soft, accent.text)}>
                                Traženi zvuk: {target ? target.label.toLowerCase() : "…"}
                            </p>
                        ) : (
                            <PlayButton key={`${shown.round}-${shown.wrongIds.length}`} playing={playing} cue={cue} demo={firstDemo && !shown.heard} onClick={play} />
                        )}
                    </div>

                    {options.length === 0 ? (
                        <WaitingNote>Čekamo sledeći zvuk…</WaitingNote>
                    ) : (
                        <div className={cn("grid w-full gap-2 sm:gap-4", GRID[columns])}>
                            {options.map((item) => {
                                const state = stateOf(item.id);
                                return (
                                    <ChoiceCard
                                        key={item.id}
                                        state={state}
                                        disabled={!interactive || solved || state === "dimmed" || state === "wrong"}
                                        onClick={() => pick(item.id)}
                                        aria-label={item.label}
                                        className="flex-col gap-2"
                                    >
                                        <span className="relative block aspect-[5/4] w-full overflow-hidden rounded-xl bg-brand-50 sm:aspect-square">
                                            {item.Art ? (
                                                <item.Art className="absolute inset-0 h-full w-full" />
                                            ) : (
                                                <Image src={item.image} alt="" fill sizes={IMAGE_SIZES[columns]} className="object-cover" draggable={false} />
                                            )}
                                        </span>
                                        {showLabels && <span className="text-base leading-tight sm:text-lg">{item.label}</span>}
                                        {firstDemo && shown.heard && !playing && shown.wrongIds.length === 0 && item.id === shown.targetId && <DemoHand />}
                                    </ChoiceCard>
                                );
                            })}
                        </div>
                    )}

                    <Feedback
                        kind={shown.feedback}
                        correctText={target ? correctText(target) : undefined}
                        wrongText={shown.hint ? WRONG_HINT_TEXT : WRONG_TEXT}
                    />

                    {upcomingImages.length > 0 && (
                        <div aria-hidden="true" className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
                            <div className={cn("grid w-screen max-w-4xl gap-2 sm:gap-4", GRID[columns])}>
                                {upcomingImages.map((src) => (
                                    <span key={src} className="relative block aspect-square w-full">
                                        <Image src={src} alt="" fill sizes={IMAGE_SIZES[columns]} loading="eager" />
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </GameStage>
    );
}
