// Porodica ljudi za igru „Mama i beba”: dedo, nana, tata, mama i beba. Isti likovi kao na slikama
// situacija (scene/figures.tsx), u istom stilu kao ostali ljudi u aplikaciji; nana nosi maramu
// (hidžab), mama pušta kosu — tako se na slici vidi da je i jedno i drugo uobičajeno.

import { useId } from "react";
import type { PersonId } from "@/app/components/games/data/familyLevels";
import { Figure } from "@/app/components/games/scene/figures";
import type { AdultId, LookId } from "@/app/components/games/scene/types";

const FIGURE: Record<PersonId, AdultId | LookId> = { dedo: "deka", nana: "baka", tata: "tata", mama: "mama", beba: "baby" };

/** Glava odraslog: središte (0, −104), poluprečnik 17 × 0,95 */
function Hijab() {
    return (
        <g transform="translate(0 -104) scale(0.95)">
            <path
                fillRule="evenodd"
                d="M-21 6 C-25 -40 25 -40 21 6 C22 20 20 28 0 31 C-20 28 -22 20 -21 6Z M0 -11.5 C-9 -11.5 -13.5 -5 -13.5 3 C-13.5 11 -8 17 0 17 C8 17 13.5 11 13.5 3 C13.5 -5 9 -11.5 0 -11.5Z"
                fill="#5f9e86"
                stroke="#467a66"
                strokeWidth={1.3}
            />
            <path d="M-12 -8 Q0 -14 12 -8" fill="none" stroke="#7fbaa2" strokeWidth={1.4} strokeLinecap="round" />
        </g>
    );
}

function Person({ id }: { id: PersonId }) {
    return (
        <g>
            <Figure id={FIGURE[id]} face="happy" />
            {id === "nana" && <Hijab />}
        </g>
    );
}

/** Okvir lika: odrasli su visoki ~135, beba ~52 (stopala u 0, 0) */
const TIGHT: Record<PersonId, string> = {
    dedo: "-36 -136 72 140",
    nana: "-36 -136 72 140",
    tata: "-36 -136 72 140",
    mama: "-36 -136 72 140",
    beba: "-24 -54 48 58",
};

/** Zajednički okvir: svi su u istoj razmeri (beba je mala pored odraslih) */
const SHARED = "-36 -136 72 140";

interface PersonPictureProps {
    id: PersonId;
    /** `shared`: ista razmera za sve (slika porodice); inače lik popunjava okvir */
    scale?: "tight" | "shared";
    /** Bleda silueta (prazno mesto na slici porodice) */
    silhouette?: boolean;
    className?: string;
}

export function PersonPicture({ id, scale = "tight", silhouette = false, className }: PersonPictureProps) {
    const filterId = useId().replace(/:/g, "");
    return (
        <svg viewBox={scale === "shared" ? SHARED : TIGHT[id]} className={className} aria-hidden="true" focusable="false">
            {silhouette && (
                <defs>
                    <filter id={filterId}>
                        <feFlood floodColor="#cfc9ea" />
                        <feComposite in2="SourceAlpha" operator="in" />
                    </filter>
                </defs>
            )}
            <g filter={silhouette ? `url(#${filterId})` : undefined}>
                <Person id={id} />
            </g>
        </svg>
    );
}
