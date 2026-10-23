"use client";

// Drugar koji govori sa detetom: učiteljica, učitelj ili životinja, sa predmetima iz prodavnice.

import type { VoiceEmotion } from "@/lib/emotion";
import AnimalAvatar from "./AnimalAvatar";
import { isCompanionKind, type CompanionKind } from "./companions";
import type { CompanionAction } from "./motion";
import TeacherAvatar from "./TeacherAvatar";
import type { Wear } from "./wearables";

export { COMPANIONS, isCompanionKind, type CompanionKind } from "./companions";
export { COMPANION_ACTIONS, type CompanionAction } from "./motion";

/**
 * 2D crtež postoji za učiteljicu, učitelja i četiri životinje. Ostali drugari (3D) se u 2D
 * (kad WebGL ne radi) crtaju kao najsličniji: devojčica → učiteljica, dečak → učitelj…
 */
const FALLBACK_2D: Record<string, CompanionKind> = { girl: "woman", boy: "man", fox: "cat", lion: "bear", penguin: "bear", unicorn: "bunny" };

export function companion2DKind(kind: string): CompanionKind {
    return FALLBACK_2D[kind] ?? (isCompanionKind(kind) ? kind : "woman");
}

/** 3D izgled čoveka `koža.oči.kosa.frizura.hidžab` → 2D `koža.kosa.frizura` (nepoznat deo → dosadašnji crtež) */
function skin2D(skin: string | undefined): string | undefined {
    const parts = skin?.split(".");
    return parts && parts.length === 5 ? `${parts[0]}.${parts[2]}.${parts[3]}` : skin;
}

interface CompanionProps {
    /** Bilo koji drugar (i 3D vrste koje nemaju 2D crtež — crtaju se kao najsličniji) */
    kind: string;
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
    /**
     * Jednokratni pokret celog lika (ceo lik i portret): `hop` mali skok (proba predmeta),
     * `joy` radost posle kupovine, `cheer` skok i aplauz na kraju nivoa, `appear` pojava novog
     * drugara ili izgleda. Igra se kad se lik pojavi i svaki put kad se promeni `actionKey`
     * (npr. brojač). Uz „Manje animacija” ili sistemsko „smanji pokrete” lik miruje.
     */
    action?: CompanionAction;
    actionKey?: number | string;
    /** Bez ikakvih pokreta: sličice (kompleti u prodavnici), da se mreža sličica ne mrda */
    still?: boolean;
    className?: string;
}

/**
 * Ceo lik i portret se i sami mirno kreću (disanje, rep, uši, kosa, plašt, balon, ljubimac,
 * pozadina), a dok govore mahnu, poskoče ili klimnu; nov predmet kratko iskoči (motion.ts).
 */
export default function Companion({ kind: anyKind, variant = "bust", emotion, wear, skin: anySkin, action, actionKey, still, className }: CompanionProps) {
    const motion = { action, actionKey, still };
    const kind = companion2DKind(anyKind);
    // Izgled druge vrste (npr. lisice) ne važi za 2D zamenu (mačku) — tada dosadašnji crtež
    const skin = kind === anyKind ? skin2D(anySkin) : undefined;
    if (kind === "woman" || kind === "man") {
        return <TeacherAvatar gender={kind === "woman" ? "female" : "male"} variant={variant} emotion={emotion} wear={wear} skin={skin} {...motion} className={className} />;
    }
    return <AnimalAvatar kind={kind} variant={variant} emotion={emotion} wear={wear} skin={skin} {...motion} className={className} />;
}
