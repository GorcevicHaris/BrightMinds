"use client";

import { cn } from "@/lib/cn";
import { useVoiceState } from "@/lib/voice";
import { useChildSettings } from "../ChildSettingsProvider";
import CompanionPicture from "../avatar3d/CompanionPicture";
import CompanionStage from "../avatar3d/CompanionStage";
import { isCompanionKindId } from "@/lib/companion";
import TeacherAvatar from "./TeacherAvatar";
import type { CompanionAction } from "./motion";
import type { Wear } from "./wearables";

interface SpeakingTeacherProps {
    /** Pol deteta (isti izbor kao za glas) */
    gender?: string;
    /** Pratilac koga je dete izabralo (bez njega: učitelj prema polu deteta) */
    kind?: string;
    wear?: Wear;
    /** Izgled izabranog drugara (skins.ts) */
    skin?: string;
    /**
     * Živ 3D drugar umesto slike (portret u traci igre): diše, govori ustima i skače na tačan
     * odgovor. Na stranici je samo jedno živo platno, pa se uključuje samo tamo gde je drugar glavni.
     */
    live?: boolean;
    /** Kadar živog drugara: `portrait` do pojasa (mali portret), `full` ceo lik */
    framing?: "full" | "portrait";
    /** Jednokratni pokret živog drugara (skok, radost, aplauz) */
    action?: CompanionAction;
    actionKey?: number | string;
    className?: string;
}

/**
 * Portret učitelja koji čita: izraz prati ton rečenice, a dok govori oko portreta svetli
 * prsten — jasno je ko se obraća detetu. Ne crta se kada je učitelj
 * isključen u podešavanjima deteta.
 */
export default function SpeakingTeacher({ gender, kind, wear, skin, live = false, framing = "portrait", action, actionKey, className }: SpeakingTeacherProps) {
    const settings = useChildSettings();
    const { speaking, emotion } = useVoiceState();
    if (!settings.avatar) return null;
    return (
        <span
            className={cn(
                "grid shrink-0 place-items-end overflow-hidden rounded-2xl bg-gradient-to-b from-brand-100 to-brand-50 ring-2 transition-shadow duration-200",
                speaking ? "ring-brand-400 shadow-[0_0_0_4px_var(--color-brand-100)]" : "ring-brand-100",
                className
            )}
        >
            {isCompanionKindId(kind) && live ? (
                // Živ drugar u svom svetu: lice i usta prate glas, skok dolazi spolja (`action`)
                <CompanionStage kind={kind} wear={wear} skin={skin} framing={framing} background action={action} actionKey={actionKey} className="h-full w-full" />
            ) : isCompanionKindId(kind) ? (
                // 3D slika celog drugara sa ljubimcem i pozadinom (izraz prati glas; slike su keširane, pa se lice menja odmah)
                <CompanionPicture kind={kind} wear={wear} skin={skin} variant="full" background emotion={emotion} className="h-full w-full" eager />
            ) : (
                <TeacherAvatar gender={gender} variant="face" className="h-full w-full" />
            )}
        </span>
    );
}
