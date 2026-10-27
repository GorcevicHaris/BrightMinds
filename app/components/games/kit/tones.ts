"use client";

// Tihi tonovi koji su DEO ZADATKA („Zapamti niz”, „Ponovi ritam”): sintetisani u pregledaču
// (WebAudio), bez zvučnih fajlova.
//
// Zašto ovako (deca od 3 do 10 godina, deca sa autizmom i preosetljivim sluhom):
//  • Samo meki talasi (sinus, malo trougla), blag početak (bez „klika”), kratko trajanje,
//    filter koji seče visoke tonove i niska jačina — nikad oštar, glasan ili nagao zvuk.
//  • Tonovi su iz pentatonske lestvice (do, re, mi, sol, la): bilo koja dva zajedno zvuče
//    lepo, pa ni pogrešan dodir ne „para uši”.
//  • Bubanj je sinus koji klizi naniže (kao mek udarac u jastuk), bez šuma.
//  • Poštuje dugme za zvuk na uređaju i podešavanje roditelja „Zvuci u igri” i jačinu
//    (`gameSoundsEnabled`, `masterVolume`). Kad je zvuk isključen, igre rade samo vizuelno
//    (svetla i tačke ritma), pa zvuk nikad nije uslov za igru.

import { useChildSettings } from "@/app/components/ChildSettingsProvider";
import { gameSoundsEnabled, masterVolume, useMuted } from "@/lib/sound";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
    if (typeof window === "undefined" || !gameSoundsEnabled()) return null;
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

/** Najveća jačina tona (pre jačine koju bira roditelj): tiho, ispod glasa koji čita uputstva */
const PEAK = 0.09;

/** Jedan meki ton: sinus + malo trougla, kroz filter, sa blagim početkom i krajem */
function softTone(a: AudioContext, freq: number, start: number, duration: number, peak: number, glideTo?: number) {
    const out = a.createGain();
    const filter = a.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1600, start);
    filter.Q.setValueAtTime(0.4, start);
    out.connect(filter).connect(a.destination);

    const level = Math.max(0.0002, peak * masterVolume());
    out.gain.setValueAtTime(0.0001, start);
    out.gain.exponentialRampToValueAtTime(level, start + 0.03);
    out.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    const voices: [OscillatorType, number][] = [
        ["sine", 1],
        ["triangle", 0.25],
    ];
    for (const [type, mix] of voices) {
        const osc = a.createOscillator();
        const gain = a.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + duration * 0.8);
        gain.gain.setValueAtTime(mix, start);
        osc.connect(gain).connect(out);
        osc.start(start);
        osc.stop(start + duration + 0.05);
    }
}

/** Pentatonska lestvica (do, re, mi, sol, la, do): tonovi polja u igri „Zapamti niz” */
export const PAD_NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25] as const;

/** Ton polja `index` (0–5). Bez zvuka (isključeno) ne radi ništa. */
export function playPad(index: number, duration = 0.42) {
    const a = audio();
    if (!a) return;
    const freq = PAD_NOTES[((index % PAD_NOTES.length) + PAD_NOTES.length) % PAD_NOTES.length];
    softTone(a, freq, a.currentTime + 0.01, duration, PEAK);
}

export type DrumKind = "big" | "small" | "bell";

/**
 * Udarac bubnja: veliki (dubok, mek), mali (viši, kraći) i zvonce (blag visok ton).
 * Bez šuma i bez oštrog napada — kao udarac dlanom u jastuk.
 */
export function playDrum(kind: DrumKind) {
    const a = audio();
    if (!a) return;
    const at = a.currentTime + 0.01;
    if (kind === "big") softTone(a, 150, at, 0.34, PEAK * 1.3, 70);
    else if (kind === "small") softTone(a, 330, at, 0.2, PEAK, 220);
    else softTone(a, 784, at, 0.5, PEAK * 0.55);
}

/** Da li se tonovi zadatka sada čuju (dugme za zvuk + „Zvuci u igri”); menja se odmah. */
export function useTaskSound(): boolean {
    const [muted] = useMuted();
    const settings = useChildSettings();
    return !muted && settings.gameSounds;
}
