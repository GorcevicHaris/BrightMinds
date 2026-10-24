"use client";

// Drugar navija dok dete igra. Igre ne moraju ništa posebno da rade: tačan odgovor već zove
// `playSfx("correct")` (→ `celebrate()`), a pohvala ide kroz `usePraise()`. Ovde su samo
// događaji koje drugar na ekranu sluša: pohvala koju glas upravo izgovara (drugar je
// „kaže” u oblačiću, bez drugog glasa) i let novčića na kraju nivoa.
// Sve je mirno i kratko (do 1 s); uz „Manje animacija” nema leta ni skokova.

import { useSyncExternalStore } from "react";

export const PRAISE_EVENT = "bm:praise";
export const FLY_EVENT = "bm:fly";

/** Koliko zvezdice lete od odgovora do drugara (ms) — drugar skoči kad stignu */
export const FLY_MS = 700;

export interface PraiseDetail {
    /** Kratka pohvala („Bravo!”) — ista reč koju glas izgovara */
    text: string;
    /** Niz tačnih odgovora: veće slavlje (aplauz i roj zvezdica oko drugara) */
    big: boolean;
}

export interface FlyDetail {
    from: { x: number; y: number };
    to: { x: number; y: number };
    count: number;
    /** Šta leti */
    item: "star" | "coin";
}

/** Javlja drugaru pohvalu koju glas upravo kaže */
export function announcePraise(text: string, big: boolean) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<PraiseDetail>(PRAISE_EVENT, { detail: { text, big } }));
}

/** Središte elementa na ekranu */
export function centerOf(element: Element): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/** Novčići (ili zvezdice) lete od jednog elementa do drugog; crta ih `CelebrationLayer` */
export function flyItems(from: Element, to: Element, count: number, item: FlyDetail["item"] = "coin") {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent<FlyDetail>(FLY_EVENT, { detail: { from: centerOf(from), to: centerOf(to), count, item } }));
}

/**
 * Mesto gde zvezdice sleću: vidljiv drugar označen sa `data-hype-target` (bočni panel,
 * portret u traci, drugar na kraju nivoa). Bez njega zvezdice se rasprše oko dodira.
 */
export function hypeTarget(): Element | null {
    if (typeof document === "undefined") return null;
    const all = document.querySelectorAll("[data-hype-target]");
    for (let i = all.length - 1; i >= 0; i--) {
        const rect = all[i].getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return all[i];
    }
    return null;
}

// ── Sistemsko „smanji pokrete” ──────────────────────────────────────────────

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(listener: () => void): () => void {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
    const query = window.matchMedia(REDUCED_QUERY);
    query.addEventListener?.("change", listener);
    return () => query.removeEventListener?.("change", listener);
}

function reducedNow(): boolean {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(REDUCED_QUERY).matches;
}

export function useSystemReduced(): boolean {
    return useSyncExternalStore(subscribeReduced, reducedNow, () => false);
}

// ── Širok ekran: drugar u bočnom panelu ─────────────────────────────────────

/** Položen tablet i računar: drugar stoji u panelu pored igre, a ne u traci napretka */
export const WIDE_QUERY = "(min-width: 800px) and (orientation: landscape)";

function subscribeWide(listener: () => void): () => void {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
    const query = window.matchMedia(WIDE_QUERY);
    query.addEventListener?.("change", listener);
    return () => query.removeEventListener?.("change", listener);
}

function wideNow(): boolean {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(WIDE_QUERY).matches;
}

/** True na položenom tabletu i računaru (na serveru: ne) */
export function useWideScreen(): boolean {
    return useSyncExternalStore(subscribeWide, wideNow, () => false);
}
