import React from "react";
import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    padded?: boolean;
}

export function Card({ children, className, padded = true, ...props }: CardProps) {
    return (
        <div
            className={cn("rounded-card border border-line bg-surface shadow-soft", padded && "p-5 sm:p-6", className)}
            {...props}
        >
            {children}
        </div>
    );
}

interface AlertProps {
    tone?: "error" | "info" | "success";
    children: React.ReactNode;
    className?: string;
}

const ALERT_TONES = {
    error: "border-rose-200 bg-rose-50 text-rose-700",
    info: "border-brand-200 bg-brand-50 text-brand-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function Alert({ tone = "error", children, className }: AlertProps) {
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={cn("rounded-xl border px-4 py-3 text-sm font-bold", ALERT_TONES[tone], className)}
        >
            {children}
        </div>
    );
}
