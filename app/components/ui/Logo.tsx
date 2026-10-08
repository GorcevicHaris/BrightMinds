import Image from "next/image";
import { cn } from "@/lib/cn";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    /** Prikaži slogan ispod naziva */
    tagline?: boolean;
    className?: string;
}

const MARK = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" };
const WORD = { sm: "text-lg", md: "text-xl", lg: "text-3xl" };

export function Logo({ size = "md", tagline = false, className }: LogoProps) {
    return (
        <div className={cn("flex items-center gap-3", className)}>
            <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-line", MARK[size])}>
                <Image src="/logo.png" alt="" width={56} height={56} className="h-[82%] w-[82%] object-contain" />
            </span>
            <span className="leading-none">
                <span className={cn("block font-display font-extrabold text-ink", WORD[size])}>
                    Bright <span className="text-brand-600">Minds</span>
                </span>
                {tagline && (
                    <span className="mt-1 block text-xs font-bold tracking-wide text-ink-faint">Učimo kroz igru</span>
                )}
            </span>
        </div>
    );
}
