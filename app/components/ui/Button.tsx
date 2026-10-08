import React from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "sun";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonStyleOptions {
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** "3D" dugme sa debljom donjom ivicom — za dečji deo aplikacije */
    chunky?: boolean;
    block?: boolean;
    className?: string;
}

const VARIANTS: Record<ButtonVariant, { flat: string; chunky: string }> = {
    primary: {
        flat: "bg-brand-600 text-white hover:bg-brand-700 shadow-soft",
        chunky: "bg-brand-500 text-white border-brand-700 hover:bg-brand-600",
    },
    secondary: {
        flat: "bg-white text-ink border border-line hover:bg-brand-50 hover:border-brand-200",
        chunky: "bg-white text-ink border-line hover:bg-brand-50",
    },
    ghost: {
        flat: "bg-transparent text-ink-soft hover:bg-brand-50 hover:text-ink",
        chunky: "bg-transparent text-ink-soft border-transparent hover:bg-brand-50",
    },
    danger: {
        flat: "bg-rose-600 text-white hover:bg-rose-700 shadow-soft",
        chunky: "bg-rose-500 text-white border-rose-700 hover:bg-rose-600",
    },
    success: {
        flat: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft",
        chunky: "bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-600",
    },
    sun: {
        flat: "bg-sun-400 text-ink hover:bg-sun-300 shadow-soft",
        chunky: "bg-sun-400 text-ink border-sun-600 hover:bg-sun-300",
    },
};

const SIZES: Record<ButtonSize, string> = {
    sm: "min-h-9 px-3 text-sm gap-1.5 rounded-xl",
    md: "min-h-11 px-4 text-[0.95rem] gap-2 rounded-xl",
    lg: "min-h-13 px-6 text-base gap-2.5 rounded-2xl",
    xl: "min-h-16 px-8 text-xl gap-3 rounded-2xl",
};

/** Klase dugmeta — koristi se i za <Link> koji treba da izgleda kao dugme. */
export function buttonClasses({
    variant = "primary",
    size = "md",
    chunky = false,
    block = false,
    className,
}: ButtonStyleOptions = {}): string {
    return cn(
        "inline-flex items-center justify-center font-extrabold select-none transition-[background-color,border-color,transform,box-shadow] duration-150",
        "disabled:opacity-50 disabled:pointer-events-none",
        SIZES[size],
        chunky
            ? cn("border-2 border-b-[5px] active:translate-y-[3px] active:border-b-2", VARIANTS[variant].chunky)
            : cn("active:scale-[0.98]", VARIANTS[variant].flat),
        block && "w-full",
        className
    );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleOptions {
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, variant, size, chunky, block, isLoading = false, className, disabled, type = "button", ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            className={buttonClasses({ variant, size, chunky, block, className })}
            disabled={disabled || isLoading}
            aria-busy={isLoading || undefined}
            {...props}
        >
            {isLoading && <Spinner className="h-4 w-4" />}
            {children}
        </button>
    )
);
Button.displayName = "Button";

export function Spinner({ className }: { className?: string }) {
    return (
        <svg className={cn("animate-spin", className ?? "h-5 w-5")} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}
