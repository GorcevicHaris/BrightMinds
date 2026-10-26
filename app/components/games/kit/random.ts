"use client";

import { createContext, useContext, useState } from "react";
import { seededRandom } from "@/lib/seededRandom";

/**
 * Seme zadataka za igru koja je partija dvoboja „ko je brži” (lib/versusFormat.ts): oba
 * deteta dobijaju iste zadatke istim redom. Van dvoboja nema semena (null) i igra je nasumična
 * kao i uvek. Postavlja ga omotač igre (playRemote.tsx), igre ga ne znaju.
 */
export const GameRandomContext = createContext<string | null>(null);

/**
 * Izvor slučajnih brojeva za ZADATKE igre (izbor i redosled zadataka, mešanje ponuđenih
 * odgovora): generator iz semena dvoboja ili Math.random. Isti za celu partiju (jedna partija =
 * jedno montiranje igre), pa se brojevi troše istim redom kao kod druga. Ukrasi (konfete,
 * pohvale, pokreti drugara) koriste Math.random — ne utiču na zadatke.
 */
export function useGameRandom(): () => number {
    const seed = useContext(GameRandomContext);
    const [random] = useState<() => number>(() => (seed ? seededRandom(seed) : Math.random));
    return random;
}
