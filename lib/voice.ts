// lib/voice.ts
// Jedno mesto koje pušta glas učitelja i zna šta se upravo dešava:
//  • da li učitelj govori i kojom emocijom (po tome se menja izraz lica)
//  • koliko je glas trenutno jak (po tome se pomeraju usta)
// Lica učitelja na ekranu samo čitaju ovo stanje — može ih biti više odjednom.
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { VoiceEmotion } from "./emotion";
import { masterVolume } from "./sound";

export interface VoiceState {
    speaking: boolean;
    emotion: VoiceEmotion;
}

/** Izraz lica ostaje još trenutak posle poslednje reči, pa se vraća u miran */
const LINGER_MS = 1600;
/** Ako pregledač nikad ne javi kraj zvuka, igra ne sme da ostane da čeka */
const WATCHDOG_EXTRA_MS = 2000;

const IDLE: VoiceState = { speaking: false, emotion: "neutral" };

let state: VoiceState = IDLE;
const listeners = new Set<() => void>();

let level = 0;
let token = 0;
let ctx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
let element: HTMLAudioElement | null = null;
let raf: number | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let linger: ReturnType<typeof setTimeout> | null = null;
let unlockBound = false;

function setState(next: VoiceState) {
    if (next.speaking === state.speaking && next.emotion === state.emotion) return;
    state = next;
    listeners.forEach((listener) => listener());
}

export function getVoiceState(): VoiceState {
    return state;
}

export function subscribeVoice(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Trenutna jačina glasa 0–1; čita se u svakom frejmu, bez React renderovanja */
export function mouthLevel(): number {
    return level;
}

export function useVoiceState(): VoiceState {
    return useSyncExternalStore(subscribeVoice, getVoiceState, () => IDLE);
}

// ── Web Audio ─────────────────────────────────────────────────────────────────

type AudioContextCtor = typeof AudioContext;

async function getContext(): Promise<AudioContext | null> {
    if (!ctx || ctx.state === "closed") {
        const Ctor: AudioContextCtor | undefined =
            window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
        ctx = Ctor ? new Ctor() : null;
    }
    if (ctx && ctx.state === "suspended") {
        // Pre prvog dodira `resume()` ume da čeka beskonačno — ne čekamo ga duže od trenutka
        await Promise.race([ctx.resume().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 300))]);
    }
    return ctx && ctx.state === "running" ? ctx : null;
}

/** Pregledači dozvoljavaju zvuk tek posle prvog dodira — tada „budimo” kontekst */
function bindUnlock() {
    if (unlockBound || typeof window === "undefined") return;
    unlockBound = true;
    window.addEventListener("pointerdown", () => void getContext(), { once: true });
}

function clearTimers() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    if (watchdog) clearTimeout(watchdog);
    watchdog = null;
    if (linger) clearTimeout(linger);
    linger = null;
}

function silence() {
    clearTimers();
    if (source) {
        source.onended = null;
        try {
            source.stop();
        } catch {
            /* već zaustavljen */
        }
        source = null;
    }
    if (element) {
        element.onended = null;
        element.onerror = null;
        element.pause();
        element = null;
    }
    level = 0;
}

/** Prekida govor odmah. Izraz lica se vraća u miran. */
export function stopVoice() {
    token += 1;
    silence();
    setState(IDLE);
}

/** Govor je završio sam: lice još trenutak zadrži izraz */
function settle(emotion: VoiceEmotion) {
    silence();
    setState({ speaking: false, emotion });
    if (emotion === "neutral") return;
    const mine = token;
    linger = setTimeout(() => {
        linger = null;
        if (mine === token) setState(IDLE);
    }, LINGER_MS);
}

function simulateMouth(mine: number) {
    const startedAt = performance.now();
    const step = () => {
        if (mine !== token) return;
        const t = (performance.now() - startedAt) / 1000;
        // Dva talasa različite brzine: usta se ne otvaraju mehanički ravnomerno
        level = Math.max(0, 0.34 + Math.sin(t * 11) * 0.22 + Math.sin(t * 6.3) * 0.16);
        raf = requestAnimationFrame(step);
    };
    step();
}

/**
 * Lice „govori” dok traje govor koji pušta neko drugi (glas iz pregledača).
 * Vraća funkciju koju treba pozvati kada taj govor završi.
 */
export function mimeVoice(emotion: VoiceEmotion): () => void {
    token += 1;
    const mine = token;
    silence();
    setState({ speaking: true, emotion });
    simulateMouth(mine);
    return () => {
        if (mine === token) settle(emotion);
    };
}

/**
 * Pušta snimak govora. `onEnd` se zove tačno jednom kada zvuk završi (ili ne može da se pusti);
 * ne zove se ako je govor u međuvremenu prekinut ili zamenjen.
 */
export async function playVoice(url: string, emotion: VoiceEmotion, onEnd?: () => void): Promise<void> {
    bindUnlock();
    token += 1;
    const mine = token;
    silence();
    setState({ speaking: true, emotion });

    const finish = () => {
        if (mine !== token) return;
        settle(emotion);
        onEnd?.();
    };

    try {
        const audioCtx = await getContext();
        if (!audioCtx) throw new Error("no_audio_context");
        const response = await fetch(url);
        if (!response.ok) throw new Error(`audio_${response.status}`);
        const decoded = await audioCtx.decodeAudioData(await response.arrayBuffer());
        if (mine !== token) return;

        const node = audioCtx.createBufferSource();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.55;
        node.buffer = decoded;
        const gain = audioCtx.createGain();
        gain.gain.value = masterVolume();
        node.connect(analyser);
        analyser.connect(gain);
        gain.connect(audioCtx.destination);
        source = node;

        const bins = new Uint8Array(analyser.frequencyBinCount);
        const analyse = () => {
            if (mine !== token) return;
            analyser.getByteFrequencyData(bins);
            // Opseg u kome je ljudski glas
            let sum = 0;
            for (let i = 2; i < 50; i++) sum += bins[i];
            level = Math.min(1, sum / 48 / 65);
            raf = requestAnimationFrame(analyse);
        };

        node.onended = finish;
        node.start(0);
        watchdog = setTimeout(finish, decoded.duration * 1000 + WATCHDOG_EXTRA_MS);
        analyse();
    } catch {
        if (mine !== token) return;
        // Web Audio nije uspeo (stariji tablet, zaključan kontekst): običan zvučni
        // element pušta isti snimak, a usta se pomeraju približno.
        try {
            const audio = new Audio(url);
            audio.volume = masterVolume();
            audio.onended = finish;
            audio.onerror = finish;
            element = audio;
            await audio.play();
            if (mine !== token) return;
            simulateMouth(mine);
        } catch {
            finish();
        }
    }
}

/** Kratko pokaže izraz lica bez govora (npr. kada je glas isključen, a dete je tačno odgovorilo). */
export function showEmotion(emotion: VoiceEmotion) {
    if (state.speaking) return;
    token += 1;
    settle(emotion);
}

/** Najduže zaključavanje dodira dok učitelj govori (ako se kraj govora nikad ne javi) */
const SPEAKING_LOCK_MAX_MS = 10_000;

/**
 * True dok učitelj govori — igra tada ne prima dodire, pa se rečenica ne prekida.
 * Ako se kraj govora ne javi, zaključavanje se samo skida posle 10 s.
 */
export function useSpeakingLock(): boolean {
    const { speaking } = useVoiceState();
    const [expired, setExpired] = useState(false);
    useEffect(() => {
        if (!speaking) return;
        const timer = setTimeout(() => setExpired(true), SPEAKING_LOCK_MAX_MS);
        return () => {
            clearTimeout(timer);
            setExpired(false);
        };
    }, [speaking]);
    return speaking && !expired;
}

