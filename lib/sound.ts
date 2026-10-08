// lib/sound.ts
// Zvuk ima dva nivoa:
//  • prekidač na uređaju (dugme sa zvučnikom) — gasi sve, pamti se u pregledaču
//  • podešavanja deteta (glas / efekti / zvuci u igri / jačina) — bira roditelj
"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getChildSettings } from "./settingsStore";

const STORAGE_KEY = "bm:muted";
const CHANGE_EVENT = "bm:mute-change";

export function isMuted(): boolean {
    if (typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
        return false;
    }
}

export function setMuted(muted: boolean): void {
    try {
        if (muted) window.localStorage.setItem(STORAGE_KEY, "1");
        else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* privatni režim: prekidač važi samo dok je stranica otvorena */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}

/** `[muted, toggle]` — menja se u svim komponentama odjednom. */
export function useMuted(): [boolean, () => void] {
    const muted = useSyncExternalStore(subscribe, isMuted, () => false);
    const toggle = useCallback(() => setMuted(!isMuted()), []);
    return [muted, toggle];
}

// ── Kanali ────────────────────────────────────────────────────────────────────

/** Glas koji čita uputstva */
export function voiceEnabled(): boolean {
    return !isMuted() && getChildSettings().voice;
}

/** Kratki efekti (dodir, tačno, kraj nivoa) */
export function effectsEnabled(): boolean {
    return !isMuted() && getChildSettings().effects;
}

/** Zvuci koji su deo zadatka (igra „Slušaj i spoji”) */
export function gameSoundsEnabled(): boolean {
    return !isMuted() && getChildSettings().gameSounds;
}

/** Jačina 0–1 koju je izabrao roditelj */
export function masterVolume(): number {
    return getChildSettings().volume;
}

const FADE_MS = 250;

/**
 * Pušta zvučni element bez naglog početka: kreće tiho i za četvrt sekunde
 * dostiže izabranu jačinu. Vraća isto što i `audio.play()`.
 */
export function playWithFade(audio: HTMLAudioElement, level = 1): Promise<void> {
    const target = Math.min(1, Math.max(0, masterVolume() * level));
    audio.volume = 0;
    const startedAt = performance.now();
    const step = () => {
        if (audio.paused) return;
        const progress = Math.min(1, (performance.now() - startedAt) / FADE_MS);
        audio.volume = target * progress;
        if (progress < 1) requestAnimationFrame(step);
    };
    const playing = audio.play();
    requestAnimationFrame(step);
    return playing;
}
