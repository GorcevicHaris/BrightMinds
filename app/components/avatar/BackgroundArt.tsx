"use client";

// Kupljena pozadina drugara preko celog banera (početna strana). Crtež pozadine je uspravan
// (okvir celog lika), a baner je širok: oštar crtež stoji desno, iza drugara, a ostatak banera
// popunjava isti crtež razvučen i zamućen — iste boje neba i tla, pa se sve uklapa.

import { cn } from "@/lib/cn";
import { FULL_BOX } from "./geometry";
import { liveClass, useCalmMotion } from "./motion";
import { getWearItem, renderWorn } from "./wearables";

const VIEW = `${FULL_BOX.x} ${FULL_BOX.y} ${FULL_BOX.w} ${FULL_BOX.h}`;

export default function BackgroundArt({ id, className }: { id: string; className?: string }) {
    const calm = useCalmMotion();
    const item = getWearItem(id);
    if (!item || item.slot !== "background") return null;
    const art = renderWorn({ background: id }, "background", { variant: "full" });
    return (
        <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
            {/* Boje cele pozadine, bez oblika */}
            <svg viewBox={VIEW} preserveAspectRatio="none" className="absolute inset-0 h-full w-full scale-110 blur-2xl">
                {art}
            </svg>
            {/* Oštar crtež desno; ka tekstu se postepeno gubi u zamućenim bojama */}
            <svg
                viewBox={VIEW}
                preserveAspectRatio="xMidYMax slice"
                className={cn("absolute inset-y-0 right-0 h-full w-[85%] sm:w-[60%] lg:w-[45%]", liveClass(true, calm))}
                style={{ maskImage: "linear-gradient(to right, transparent, black 35%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 35%)" }}
            >
                {art}
            </svg>
        </div>
    );
}
