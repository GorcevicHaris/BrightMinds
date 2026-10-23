"use client";

// Mirni pokreti celog drugara (variant „full” i „portrait”). Deca sa autizmom umeju da budu
// osetljiva na pokret, pa je sve sporo, glatko i malo: disanje 2–3 px, petlje od 3 do 9 s,
// bez treperenja i bez stalne žurbe. Sami pokreti su CSS (globals.css, odeljak „Drugar”) na
// SVG grupama sa klasama `cm-*` — pregledač ih crta sam, bez JavaScript petlje po frejmu.
//
//  • stalni (mirovanje): rade samo ispod klase `cm-live` na <svg>; bez nje lik miruje
//  • uz govor: atribut `data-say` na <svg> (mahanje, poskok, aplauz, klimanje), jednom po rečenici
//  • jednokratni: atribut `data-act` na <svg> (skok, radost, aplauz, pojava), postavlja ga
//    useCompanionMotion kada se promeni `action` / `actionKey`
//  • nov predmet: grupa `data-pop` tog mesta kratko „iskoči” (`data-popping`)
// „Manje animacija” u podešavanjima deteta ili sistemsko „smanji pokrete” → nijedno od ovoga.

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import type { VoiceEmotion } from "@/lib/emotion";
import { useChildSettings } from "../ChildSettingsProvider";
import { WEAR_SLOTS, type Wear } from "./wearables";

/** Jednokratni pokreti: skok (proba predmeta), radost (kupovina), aplauz (kraj nivoa), pojava (nov drugar ili izgled) */
export const COMPANION_ACTIONS = ["hop", "joy", "cheer", "appear"] as const;
export type CompanionAction = (typeof COMPANION_ACTIONS)[number];

/** Koliko traje svaki pokret (ms, sa početnim čekanjem) — isto kao u globals.css */
export const ACTION_MS: Record<CompanionAction, number> = { hop: 600, joy: 1000, cheer: 1750, appear: 500 };
/** Koliko traje „iskakanje” novog predmeta (ms) */
export const POP_MS = 450;

/** Pokret celog lika dok govori: jednom na početku rečenice, pa miruje (usta i dalje govore) */
export type SayMove = "wave" | "bounce" | "cheer" | "nod";

const SAY_MOVES: Partial<Record<VoiceEmotion, SayMove>> = {
    hello: "wave",
    happy: "bounce",
    proud: "cheer",
    gentle: "nod",
};

export function sayMove(emotion: VoiceEmotion): SayMove | undefined {
    return SAY_MOVES[emotion];
}

// ── Smanjeno kretanje ─────────────────────────────────────────────────────────

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function mediaQuery(): MediaQueryList | null {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_QUERY) : null;
}

function subscribeReduced(listener: () => void): () => void {
    const query = mediaQuery();
    query?.addEventListener?.("change", listener);
    return () => query?.removeEventListener?.("change", listener);
}

/** Sistemsko podešavanje „smanji pokrete” (na serveru: ne) */
export function useSystemReducedMotion(): boolean {
    return useSyncExternalStore(subscribeReduced, () => mediaQuery()?.matches ?? false, () => false);
}

/** True kad drugar treba da miruje: „Manje animacija” kod deteta ili sistemsko „smanji pokrete” */
export function useCalmMotion(): boolean {
    const { reduceMotion } = useChildSettings();
    const system = useSystemReducedMotion();
    return reduceMotion || system;
}

/** Klasa koja pali stalne pokrete: samo ceo lik (i portret), i samo kad kretanje nije smanjeno */
export function liveClass(full: boolean, calm: boolean): string | undefined {
    return full && !calm ? "cm-live" : undefined;
}

// ── Jednokratni pokreti ───────────────────────────────────────────────────────

/** Ponovo pokreće CSS animaciju istog imena: atribut se skine, pregledač preračuna izgled, pa se vrati */
function restart(element: Element, name: string, value: string) {
    element.removeAttribute(name);
    void element.getBoundingClientRect();
    element.setAttribute(name, value);
}

interface MotionOptions {
    /** Jednokratni pokret; igra se kad se lik pojavi i svaki put kad se promeni `actionKey` */
    action?: CompanionAction;
    actionKey?: number | string;
    /** Predmeti na liku: nov predmet na nekom mestu kratko iskoči */
    wear?: Wear;
    /** Ceo lik ili portret (poprsje i lice nemaju ove pokrete) */
    full: boolean;
    calm: boolean;
}

/**
 * Jednokratni pokreti celog lika: `action` (skok, radost, aplauz, pojava) i „iskakanje” novog
 * predmeta. Atribute postavlja direktno na <svg> (React ih ne crta), pa se isti pokret može
 * ponoviti i odmah jedan za drugim.
 */
export function useCompanionMotion(svgRef: RefObject<SVGSVGElement | null>, { action, actionKey, wear, full, calm }: MotionOptions) {
    useEffect(() => {
        const svg = svgRef.current;
        if (!svg || !action || !full || calm) return;
        restart(svg, "data-act", action);
        const timer = setTimeout(() => svg.removeAttribute("data-act"), ACTION_MS[action]);
        return () => {
            clearTimeout(timer);
            svg.removeAttribute("data-act");
        };
    }, [svgRef, action, actionKey, full, calm]);

    // Predmet koji se upravo pojavio (proba, kupovina, oblačenje iz ormara) kratko iskoči
    const lastWear = useRef(wear);
    useEffect(() => {
        const before = lastWear.current;
        lastWear.current = wear;
        const svg = svgRef.current;
        if (!svg || !full || calm || before === wear) return;
        const fresh = WEAR_SLOTS.filter((slot) => wear?.[slot] && wear[slot] !== before?.[slot])
            .map((slot) => svg.querySelector(`[data-pop="${slot}"]`))
            .filter((node): node is Element => node !== null);
        if (fresh.length === 0) return;
        fresh.forEach((node) => restart(node, "data-popping", ""));
        const timer = setTimeout(() => fresh.forEach((node) => node.removeAttribute("data-popping")), POP_MS);
        return () => {
            clearTimeout(timer);
            fresh.forEach((node) => node.removeAttribute("data-popping"));
        };
    }, [svgRef, wear, full, calm]);
}
