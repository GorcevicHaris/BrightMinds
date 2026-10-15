// Kratki, tihi zvučni efekti sintetisani u pregledaču — bez fajlova i bez naglih zvukova.

import { effectsEnabled, masterVolume } from "@/lib/sound";
import { celebrate } from "./Celebration";

export type Sfx = "tap" | "flip" | "correct" | "wrong" | "win";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
        if (!ctx || ctx.state === "closed") {
            const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return null;
            ctx = new Ctor();
        }
        if (ctx.state === "suspended") void ctx.resume();
        return ctx;
    } catch {
        return null;
    }
}

function tone(audio: AudioContext, freq: number, offset: number, duration: number, volume = 0.07, type: OscillatorType = "sine") {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + offset;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * masterVolume()), start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
}

export function playSfx(name: Sfx) {
    // Tačan odgovor uvek dobija i zvezdice (i kad su zvučni efekti isključeni)
    if (name === "correct") celebrate();
    if (!effectsEnabled()) return;
    const audio = getContext();
    if (!audio) return;
    switch (name) {
        case "tap":
            tone(audio, 520, 0, 0.07, 0.04);
            break;
        case "flip":
            tone(audio, 660, 0, 0.08, 0.04, "triangle");
            break;
        case "correct":
            tone(audio, 523.25, 0, 0.16);
            tone(audio, 783.99, 0.11, 0.24);
            break;
        case "wrong":
            // Namerno bez zvuka: greška nije kazna (pogrešan odgovor se samo utiša na ekranu)
            break;
        case "win":
            [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(audio, f, i * 0.11, 0.28));
            break;
    }
}
