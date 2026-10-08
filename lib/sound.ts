// lib/sound.ts
// Globalni prekidač zvuka (efekti, govor i zvuci u igrama). Pamti se u pregledaču.
"use client";

import { useCallback, useSyncExternalStore } from "react";

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
