"use client";

// Drugar koji govori sa detetom: učiteljica, učitelj ili životinja, sa predmetima iz prodavnice.

import type { VoiceEmotion } from "@/lib/emotion";
import AnimalAvatar from "./AnimalAvatar";
import { isCompanionKind, type CompanionKind } from "./companions";
import type { CompanionAction } from "./motion";
import TeacherAvatar from "./TeacherAvatar";
import { HIJAB_COLORS, SKIN_TONES, hijabParts, humanLook as humanLook3D, partHex } from "@/app/components/avatar3d/looks";
import { isHumanKind as isHumanKind3D } from "@/app/components/avatar3d/data";
import type { Wear } from "./wearables";

export { COMPANIONS, isCompanionKind, type CompanionKind } from "./companions";
export { COMPANION_ACTIONS, type CompanionAction } from "./motion";

/**
 * 2D crtež postoji za učiteljicu, učitelja i četiri životinje. Ostali drugari (3D) se u 2D
 * (kad WebGL ne radi) crtaju kao najsličniji: devojčica → učiteljica, dečak → učitelj…
 */
const FALLBACK_2D: Record<string, CompanionKind> = { girl: "woman", boy: "man", fox: "cat", lion: "bear", penguin: "bear", unicorn: "bunny" };
/** Porodica (tinejdžeri, nana, dedo) i likovi sa hidžabom u 2D: učiteljica ili učitelj */
const FAMILY_FALLBACK_2D: Record<string, CompanionKind> = {
    teengirl: "woman", teenboy: "man", grandma: "woman", grandpa: "man",
    hijabgirl: "woman", hijabteen: "woman", hijabwoman: "woman",
};

export function companion2DKind(kind: string): CompanionKind {
    return FALLBACK_2D[kind] ?? FAMILY_FALLBACK_2D[kind] ?? (isCompanionKind(kind) ? kind : "woman");
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
        // Hidžab iz 3D izgleda (lik sa hidžabom ili ženski lik koji ga nosi) crta se i u 2D,
        // sa bojom kože iz 3D izgleda
        const look3D = isHumanKind3D(anyKind) ? humanLook3D(anyKind, anySkin) : null;
        const parts = look3D ? hijabParts(look3D.hijab) : null;
        const hijab = parts ? { color: partHex(HIJAB_COLORS, parts.color), sport: parts.style === "sportski" } : undefined;
        const toneHex = hijab && look3D ? partHex(SKIN_TONES, look3D.tone) : undefined;
        return <TeacherAvatar gender={kind === "woman" ? "female" : "male"} variant={variant} emotion={emotion} wear={wear} skin={skin} hijab={hijab} toneHex={toneHex} {...motion} className={className} />;
    }
    return <AnimalAvatar kind={kind} variant={variant} emotion={emotion} wear={wear} skin={skin} {...motion} className={className} />;
}
