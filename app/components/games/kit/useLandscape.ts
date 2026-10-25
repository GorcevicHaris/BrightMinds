"use client";

import { useSyncExternalStore } from "react";

// Položen ekran (telefon ili tablet): igre tada stavljaju izbore pored slike, a ne ispod nje.

const LANDSCAPE = "(orientation: landscape)";

function subscribe(listener: () => void): () => void {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
    const query = window.matchMedia(LANDSCAPE);
    query.addEventListener?.("change", listener);
    return () => query.removeEventListener?.("change", listener);
}

function landscapeNow(): boolean {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(LANDSCAPE).matches;
}

/** True kad je ekran položen (na serveru: ne) */
export function useLandscape(): boolean {
    return useSyncExternalStore(subscribe, landscapeNow, () => false);
}

const SHORT = "(max-height: 30rem)";

function subscribeShort(listener: () => void): () => void {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
    const query = window.matchMedia(SHORT);
    query.addEventListener?.("change", listener);
    return () => query.removeEventListener?.("change", listener);
}

/** True na vrlo niskom ekranu (položen telefon): kartica sa uputstvom se skriva, uputstvo ide u polje igre */
export function useShortScreen(): boolean {
    return useSyncExternalStore(
        subscribeShort,
        () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(SHORT).matches,
        () => false
    );
}
