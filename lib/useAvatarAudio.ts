// lib/useAvatarAudio.ts
// Pušta zvuk govora kroz Web Audio i meri jačinu glasa da bi avatar pomerao usta.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { masterVolume } from "./sound";

type AudioContextCtor = typeof AudioContext;

function createContext(): AudioContext | null {
    const Ctor: AudioContextCtor | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
}

export function useAvatarAudio() {
    const [isPlaying, setIsPlaying] = useState(false);
    /** 0–1, menja se u svakom frejmu; čita se iz useFrame bez React renderovanja */
    const mouthRef = useRef(0);

    const ctxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    /** Rezervni način puštanja kada Web Audio ne uspe (običan zvučni element) */
    const elementRef = useRef<HTMLAudioElement | null>(null);
    /** Ako pregledač nikad ne javi kraj zvuka, igra ne sme da ostane da čeka */
    const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef = useRef<number | null>(null);
    const playingRef = useRef(false);
    /** Raste pri svakom play/stop — stari asinhroni pozivi se po tome prepoznaju i odbacuju */
    const tokenRef = useRef(0);

    const getContext = useCallback(async (): Promise<AudioContext | null> => {
        if (!ctxRef.current || ctxRef.current.state === "closed") ctxRef.current = createContext();
        const ctx = ctxRef.current;
        if (ctx && ctx.state === "suspended") await ctx.resume().catch(() => {});
        return ctx;
    }, []);

    // Pregledači dozvoljavaju zvuk tek posle prvog dodira — tada "budimo" kontekst
    useEffect(() => {
        const unlock = () => void getContext();
        window.addEventListener("pointerdown", unlock, { once: true });
        return () => {
            window.removeEventListener("pointerdown", unlock);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (watchdogRef.current) clearTimeout(watchdogRef.current);
            elementRef.current?.pause();
            try {
                sourceRef.current?.stop();
            } catch {
                /* već zaustavljen */
            }
            void ctxRef.current?.close().catch(() => {});
        };
    }, [getContext]);

    const stop = useCallback(() => {
        tokenRef.current += 1;
        playingRef.current = false;
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (watchdogRef.current) {
            clearTimeout(watchdogRef.current);
            watchdogRef.current = null;
        }
        const element = elementRef.current;
        elementRef.current = null;
        if (element) {
            element.onended = null;
            element.onerror = null;
            element.pause();
        }
        const source = sourceRef.current;
        sourceRef.current = null;
        if (source) {
            source.onended = null;
            try {
                source.stop();
            } catch {
                /* već zaustavljen */
            }
        }
        mouthRef.current = 0;
        setIsPlaying(false);
    }, []);

    const playSound = useCallback(
        async (url: string | null, onEnded?: () => void) => {
            stop();
            const token = tokenRef.current;
            playingRef.current = true;
            setIsPlaying(true);

            const startedAt = performance.now();
            const simulate = () => {
                if (!playingRef.current || tokenRef.current !== token) return;
                mouthRef.current = 0.3 + Math.sin((performance.now() - startedAt) * 0.012) * 0.3;
                rafRef.current = requestAnimationFrame(simulate);
            };
            const finish = () => {
                if (tokenRef.current !== token) return;
                stop();
                onEnded?.();
            };

            // Bez zvučnog fajla (govor iz pregledača): samo simuliramo pokret usta do `stop()`
            if (!url) {
                simulate();
                return;
            }

            try {
                const ctx = await getContext();
                if (!ctx) throw new Error("no_audio_context");
                const response = await fetch(url);
                if (!response.ok) throw new Error(`audio_${response.status}`);
                const decoded = await ctx.decodeAudioData(await response.arrayBuffer());
                if (tokenRef.current !== token) return; // u međuvremenu zaustavljeno ili zamenjeno

                const source = ctx.createBufferSource();
                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.6;
                source.buffer = decoded;
                const gain = ctx.createGain();
                gain.gain.value = masterVolume();
                source.connect(analyser);
                analyser.connect(gain);
                gain.connect(ctx.destination);
                sourceRef.current = source;
                analyserRef.current = analyser;

                const bins = new Uint8Array(analyser.frequencyBinCount);
                const analyse = () => {
                    if (!playingRef.current || tokenRef.current !== token) return;
                    analyser.getByteFrequencyData(bins);
                    // Opseg u kome je ljudski glas
                    let sum = 0;
                    for (let i = 2; i < 50; i++) sum += bins[i];
                    mouthRef.current = Math.min(1, sum / 48 / 65);
                    rafRef.current = requestAnimationFrame(analyse);
                };

                source.onended = finish;
                source.start(0);
                watchdogRef.current = setTimeout(finish, decoded.duration * 1000 + 2000);
                analyse();
            } catch {
                if (tokenRef.current !== token) return;
                // Web Audio nije uspeo (stariji tablet, zaključan kontekst): običan zvučni
                // element pušta isti snimak, a usta se pomeraju približno.
                try {
                    const element = new Audio(url);
                    element.volume = masterVolume();
                    element.onended = finish;
                    element.onerror = finish;
                    elementRef.current = element;
                    await element.play();
                    if (tokenRef.current !== token) return;
                    simulate();
                } catch {
                    finish();
                }
            }
        },
        [getContext, stop]
    );

    return { mouthRef, isPlaying, playSound, stop };
}
