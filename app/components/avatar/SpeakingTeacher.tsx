"use client";

import { cn } from "@/lib/cn";
import { useVoiceState } from "@/lib/voice";
import { useChildSettings } from "../ChildSettingsProvider";
import CompanionPicture from "../avatar3d/CompanionPicture";
import { isCompanionKindId } from "@/lib/companion";
import TeacherAvatar from "./TeacherAvatar";
import type { Wear } from "./wearables";

interface SpeakingTeacherProps {
    /** Pol deteta (isti izbor kao za glas) */
    gender?: string;
    /** Pratilac koga je dete izabralo (bez njega: učitelj prema polu deteta) */
    kind?: string;
    wear?: Wear;
    /** Izgled izabranog drugara (skins.ts) */
    skin?: string;
    className?: string;
}

/**
 * Portret učitelja koji čita: izraz prati ton rečenice, a dok govori oko portreta svetli
 * prsten — jasno je ko se obraća detetu. Ne crta se kada je učitelj
 * isključen u podešavanjima deteta.
 */
export default function SpeakingTeacher({ gender, kind, wear, skin, className }: SpeakingTeacherProps) {
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
            {isCompanionKindId(kind) ? (
                // 3D slika drugara (izraz prati glas; slike su keširane, pa se lice menja odmah)
                <CompanionPicture kind={kind} wear={wear} skin={skin} variant="portrait" background emotion={emotion} className="h-full w-full" eager />
            ) : (
                <TeacherAvatar gender={gender} variant="face" className="h-full w-full" />
            )}
        </span>
    );
}
