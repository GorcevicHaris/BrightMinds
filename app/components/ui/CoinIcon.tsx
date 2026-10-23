import { cn } from "@/lib/cn";

/**
 * Zlatni novčić sa zvezdicom (svaka zvezdica iz igre donosi dva novčića). Crtež umesto
 * emotikona 🪙, koji na svakom uređaju izgleda drugačije, a negde i sivo.
 */
export function CoinIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={cn("inline-block h-[1.1em] w-[1.1em] shrink-0", className)} aria-hidden="true">
            <circle cx="12" cy="12" r="11" fill="#e8a317" />
            <circle cx="12" cy="12" r="8.6" fill="#fcc934" stroke="#f7e08a" strokeWidth="1" />
            <path d="M12 6.6l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#e8a317" />
        </svg>
    );
}
