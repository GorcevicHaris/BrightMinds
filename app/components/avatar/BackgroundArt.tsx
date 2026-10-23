"use client";

// Kupljena pozadina drugara preko celog banera ili panela (početna, prodavnica, kraj nivoa).
// Crtež pozadine je uspravan (okvir celog lika), a mesta su često široka: oštar crtež stoji
// iza drugara, a ostatak popunjava isti crtež razvučen i zamućen — iste boje neba i tla,
// pa se drugar uklapa u scenu umesto da stoji u kvadratu.

import { cn } from "@/lib/cn";
import { FULL_BOX } from "./geometry";
import { liveClass, useCalmMotion } from "./motion";
import { getWearItem, renderWorn } from "./wearables";

const VIEW = `${FULL_BOX.x} ${FULL_BOX.y} ${FULL_BOX.w} ${FULL_BOX.h}`;

/** Gde stoji oštar crtež (iza drugara) i kako se gubi u zamućenim bojama */
export const SHARP = {
    right: "inset-y-0 right-0 w-[85%] sm:w-[60%] lg:w-[45%] [mask-image:linear-gradient(to_right,transparent,black_35%)]",
    left: "inset-y-0 left-0 w-[60%] [mask-image:linear-gradient(to_left,transparent,black_35%)]",
    center: "inset-y-0 left-1/2 w-full max-w-sm -translate-x-1/2 [mask-image:linear-gradient(to_right,transparent,black_25%,black_75%,transparent)]",
} as const;

export default function BackgroundArt({ id, sharp = SHARP.right, className }: { id: string; sharp?: string; className?: string }) {
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
            <svg viewBox={VIEW} preserveAspectRatio="xMidYMax slice" className={cn("absolute h-full", sharp, liveClass(true, calm))}>
                {art}
            </svg>
        </div>
    );
}
