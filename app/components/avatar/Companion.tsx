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
    /** `bust` = glava i ramena (može da maše); `face` = samo lice, za mala mesta;
     *  `full` = ceo lik od glave do stopala, sa svim predmetima (prodavnica);
     *  `portrait` = gornji deo celog lika sa pozadinom i krilima (mali portret u igri) */
    variant?: "bust" | "face" | "full" | "portrait";
    /** Stalna emocija, umesto one iz govora (pregled i primeri) */
    emotion?: VoiceEmotion;
    /** Predmeti iz prodavnice; poprsje i lice crtaju samo kapu, naočare, vrat i odeću */
    wear?: Wear;
    /** Izgled iz skins.ts (krzno, ili koža, kosa i frizura); bez njega dosadašnji crtež */
    skin?: string;
    className?: string;
}

export default function Companion({ kind, variant = "bust", emotion, wear, skin, className }: CompanionProps) {
    if (kind === "woman" || kind === "man") {
        return <TeacherAvatar gender={kind === "woman" ? "female" : "male"} variant={variant} emotion={emotion} wear={wear} skin={skin} className={className} />;
    }
    return <AnimalAvatar kind={kind} variant={variant} emotion={emotion} wear={wear} skin={skin} className={className} />;
}
