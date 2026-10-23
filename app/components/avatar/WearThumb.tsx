// Sličica predmeta za prodavnicu: sam predmet, centriran u svom okviru (bez lika).
// Okvir je izmeren na samom crtežu (wear/thumbBoxes.ts), pa je svaki predmet jednako
// krupan i u sredini; za nov predmet bez mere koristi se okvir njegovog mesta.
// Čista komponenta bez stanja: radi i na serveru.

import { cn } from "@/lib/cn";
import { ARM_L, ARM_R } from "./geometry";
import { THUMB_BOXES } from "./wear/thumbBoxes";
import type { WearItem, WearSlot } from "./wearables";

/** Okvir po mestu, kad predmet nema svoju meru */
const SLOT_BOX: Record<WearSlot, string> = {
    hat: "36 -26 168 116",
    glasses: "44 76 152 76",
    neck: "76 180 88 92",
    outfit: "16 196 208 216",
    feet: "62 340 116 86",
    hand: "-40 -120 140 140",
    back: "-50 140 340 270",
    pet: "-50 -90 100 96",
    background: "-60 -24 360 450",
};

/** Okvir (viewBox) sličice za predmet */
export function wearThumbBox(item: WearItem): string {
    return item.thumb ?? THUMB_BOXES[item.id] ?? SLOT_BOX[item.slot];
}

interface WearThumbProps {
    item: WearItem;
    className?: string;
}

export function WearThumb({ item, className }: WearThumbProps) {
    const box = wearThumbBox(item);
    return (
        <svg viewBox={box} className={cn("block", className)} aria-hidden="true" focusable="false" data-thumb={item.id}>
            {/* Odeća: rukavi u boji odeće, da se vidi oblik majice */}
            {item.slot === "outfit" &&
                [ARM_L, ARM_R].map((arm) => (
                    <line
                        key={arm.x1}
                        x1={arm.x1}
                        y1={arm.y1}
                        x2={arm.x1 + (arm.x2 - arm.x1) * 0.72}
                        y2={arm.y1 + (arm.y2 - arm.y1) * 0.72}
                        stroke={item.sleeve ?? "#C7D0DD"}
                        strokeWidth="26"
                        strokeLinecap="round"
                    />
                ))}
            <g data-thumb-art="">
                {item.render("full")}
                {item.front?.("full")}
            </g>
        </svg>
    );
}

export default WearThumb;
