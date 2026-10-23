// Drugari koje dete može da izabere. Namerno bez React-a i bez "use client":
// uvozi ga i serverski kod (provera sačuvanog izbora).

export type CompanionKind = "woman" | "man" | "cat" | "dog" | "bunny" | "bear";

export const COMPANIONS: readonly { kind: CompanionKind; label: string }[] = [
    { kind: "woman", label: "Učiteljica" },
    { kind: "man", label: "Učitelj" },
    { kind: "cat", label: "Mačka" },
    { kind: "dog", label: "Pas" },
    { kind: "bunny", label: "Zeka" },
    { kind: "bear", label: "Meda" },
];

const KINDS = new Set<string>(COMPANIONS.map((companion) => companion.kind));

export function isCompanionKind(v: unknown): v is CompanionKind {
    return typeof v === "string" && KINDS.has(v);
}
