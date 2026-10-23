"use client";

// Drugar koji govori sa detetom: učiteljica, učitelj ili životinja, sa predmetima iz prodavnice.

import type { VoiceEmotion } from "@/lib/emotion";
import AnimalAvatar from "./AnimalAvatar";
import type { CompanionKind } from "./companions";
import TeacherAvatar from "./TeacherAvatar";
import type { Wear } from "./wearables";

export { COMPANIONS, isCompanionKind, type CompanionKind } from "./companions";

interface CompanionProps {
    kind: CompanionKind;
    /** `bust` = glava i ramena (može da maše); `face` = samo lice, za mala mesta */
    variant?: "bust" | "face";
    /** Stalna emocija, umesto one iz govora (pregled i primeri) */
    emotion?: VoiceEmotion;
    /** Predmeti iz prodavnice (kapa, naočare, oko vrata, odeća) */
    wear?: Wear;
    className?: string;
}

export default function Companion({ kind, variant = "bust", emotion, wear, className }: CompanionProps) {
    if (kind === "woman" || kind === "man") {
        return <TeacherAvatar gender={kind === "woman" ? "female" : "male"} variant={variant} emotion={emotion} wear={wear} className={className} />;
    }
    return <AnimalAvatar kind={kind} variant={variant} emotion={emotion} wear={wear} className={className} />;
}
